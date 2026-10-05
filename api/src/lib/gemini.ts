import { AsyncLocalStorage } from 'async_hooks';
import { GoogleGenAI } from '@google/genai';
import { z, ZodType } from 'zod';
import { EMBEDDING_DIMENSIONS, env } from '../config/env';
import { errors } from './errors';
import { createLogger } from './logger';

const log = createLogger('gemini');

export const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export const MODELS = {
  text: env.GEMINI_TEXT_MODEL,
  live: env.GEMINI_LIVE_MODEL,
  embedding: env.GEMINI_EMBEDDING_MODEL,
} as const;

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 50;

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 429 || (typeof status === 'number' && status >= 500);
}

// Background work (the refresh pipeline) may wait out a rate limit for as long as it takes; a live voice reply may not.
const patience = new AsyncLocalStorage<boolean>();

/** Runs work whose model calls wait for rate limits to clear instead of giving up after a few seconds. */
export function runPatiently<T>(work: () => Promise<T>): Promise<T> {
  return patience.run(true, work);
}

const PATIENT_ATTEMPTS = 8;
const MAX_PATIENT_WAIT_MS = 120_000;

// Gemini states how long to wait ("Please retry in 54.8s" or retryDelay "54s").
function suggestedDelayMs(err: unknown): number | null {
  const text = err instanceof Error ? err.message : String(err);
  const match = text.match(/retry in ([\d.]+)s/i) ?? text.match(/"retryDelay":\s*"(\d+)s"/);
  return match ? Math.ceil(Number(match[1]) * 1000) + 500 : null;
}

async function withRetry<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const patient = patience.getStore() === true;
  const attempts = patient ? PATIENT_ATTEMPTS : MAX_ATTEMPTS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === attempts) break;
      const backoff = 500 * 2 ** (attempt - 1);
      const delayMs = patient ? Math.min(MAX_PATIENT_WAIT_MS, Math.max(backoff, suggestedDelayMs(err) ?? 0)) : backoff;
      log.warn('gemini call failed, retrying', { operation, attempt, delayMs });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

/**
 * A misspelled model name otherwise surfaces only when a call ends (summary) or a briefing is built.
 * This logs it at startup. It never blocks startup, since the key may be valid and the lookup flaky.
 */
export async function checkConfiguredModels(): Promise<void> {
  for (const [role, model] of Object.entries(MODELS)) {
    try {
      await ai.models.get({ model });
    } catch (err) {
      const status = (err as { status?: number } | null)?.status;
      if (status === 404) log.error('configured model does not exist', { role, model });
      else log.warn('could not verify configured model', { role, model, err });
    }
  }
}

// Truncated embeddings are not unit length, and cosine search expects normalised vectors.
function normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) throw new Error('embedding has zero norm');
  return values.map((v) => v / norm);
}

export type EmbeddingKind = 'query' | 'document';

// Measured on this model: query-vs-document separates related from unrelated text far better than
// symmetric similarity (related >= 0.62, unrelated <= 0.51). Stories and developments are documents;
// ambitions, memory topics and user searches are queries.
const TASK_TYPES: Record<EmbeddingKind, string> = {
  query: 'RETRIEVAL_QUERY',
  document: 'RETRIEVAL_DOCUMENT',
};

/**
 * Embeds texts with the configured Gemini embedding model at EMBEDDING_DIMENSIONS.
 * Throws EMBEDDING_UNAVAILABLE on any failure. Never returns a placeholder vector.
 */
export async function embedTexts(texts: string[], kind: EmbeddingKind): Promise<number[][]> {
  if (texts.length === 0) return [];
  const cleaned = texts.map((t) => t.trim());
  if (cleaned.some((t) => t.length === 0)) throw errors.embedding('cannot embed empty text');

  const vectors: number[][] = [];
  try {
    for (let i = 0; i < cleaned.length; i += BATCH_SIZE) {
      const batch = cleaned.slice(i, i + BATCH_SIZE);
      const response = await withRetry('embedContent', () =>
        ai.models.embedContent({
          model: MODELS.embedding,
          contents: batch,
          config: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: TASK_TYPES[kind] },
        }),
      );
      const embeddings = response.embeddings ?? [];
      if (embeddings.length !== batch.length) {
        throw new Error(`expected ${batch.length} embeddings, received ${embeddings.length}`);
      }
      for (const item of embeddings) {
        const values = item.values;
        if (!values || values.length !== EMBEDDING_DIMENSIONS) {
          throw new Error(`expected ${EMBEDDING_DIMENSIONS} dimensions, received ${values?.length ?? 0}`);
        }
        vectors.push(normalize(values));
      }
    }
  } catch (err) {
    log.error('embedding failed', { model: MODELS.embedding, count: cleaned.length, err });
    throw errors.embedding(err instanceof Error ? err.message : String(err));
  }
  return vectors;
}

export async function embedText(text: string, kind: EmbeddingKind): Promise<number[]> {
  const [vector] = await embedTexts([text], kind);
  return vector;
}

interface StructuredOptions {
  temperature?: number;
  // Hard cap on tokens generated by one call.
  maxOutputTokens?: number;
  model?: string;
}

/**
 * Generates JSON constrained by the zod schema and validates it. Raw model output is never trusted:
 * a response that fails validation is retried once, then surfaced as MODEL_UNAVAILABLE.
 */
export async function generateStructured<S extends ZodType>(
  task: string,
  prompt: string,
  schema: S,
  options: StructuredOptions = {},
): Promise<z.infer<S>> {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>;
  let lastProblem = '';
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await withRetry(task, () =>
        ai.models.generateContent({
          model: options.model ?? MODELS.text,
          contents: attempt === 1 ? prompt : `${prompt}\n\nYour previous answer was invalid (${lastProblem}). Return valid JSON only.`,
          config: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxOutputTokens ?? 4096,
            responseMimeType: 'application/json',
            responseJsonSchema: jsonSchema,
            httpOptions: { timeout: 60_000 },
          },
        }),
      );
      const text = response.text;
      if (!text) throw new Error('empty response');
      const parsed = schema.safeParse(JSON.parse(text));
      if (parsed.success) return parsed.data;
      lastProblem = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      log.warn('model output failed validation', { task, attempt, problem: lastProblem });
    } catch (err) {
      lastProblem = err instanceof Error ? err.message : String(err);
      log.warn('structured generation failed', { task, attempt, err });
      if (isRetryable(err) || attempt === 2) {
        if (attempt === 2 || !(err instanceof SyntaxError)) throw errors.model(`${task}: ${lastProblem}`);
      }
    }
  }
  throw errors.model(`${task}: ${lastProblem}`);
}
