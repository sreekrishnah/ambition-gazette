import { env } from '../config/env';
import { errors } from './errors';
import { createLogger } from './logger';
import type { NewsArticle } from './news';

const log = createLogger('gnews');

// GNews answers 429 when requests arrive in a burst, so every request waits for its turn.
const MIN_INTERVAL_MS = 1200;
const RETRY_AFTER_429_MS = 2500;
let nextSlotAt = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForTurn(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextSlotAt - now);
  nextSlotAt = Math.max(now, nextSlotAt) + MIN_INTERVAL_MS;
  if (wait > 0) await sleep(wait);
}

interface GNewsRawArticle {
  title?: unknown;
  description?: unknown;
  url?: unknown;
  image?: unknown;
  publishedAt?: unknown;
  source?: { name?: unknown; url?: unknown };
}

const asString = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

function publisherOf(raw: GNewsRawArticle): string | null {
  const sourceUrl = asString(raw.source?.url);
  if (sourceUrl) {
    try {
      return new URL(sourceUrl).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      // fall through to the source name
    }
  }
  return asString(raw.source?.name)?.toLowerCase() ?? null;
}

function normalize(raw: GNewsRawArticle, query: string): NewsArticle | null {
  const url = asString(raw.url);
  const title = asString(raw.title);
  const published = asString(raw.publishedAt);
  const publisher = publisherOf(raw);
  if (!url || !title || !published || !publisher) return null;
  const publishedAt = new Date(published);
  if (Number.isNaN(publishedAt.getTime())) return null;
  return {
    url,
    title,
    snippet: asString(raw.description),
    publisher,
    publishedAt,
    language: 'en',
    country: null,
    imageUrl: asString(raw.image),
    query,
  };
}

export function gnewsConfigured(): boolean {
  return Boolean(env.GNEWS_API_KEY);
}

/** Searches GNews for English articles from the last `days` days, newest first. */
export async function searchGNews(query: string, days: number, max = 10): Promise<NewsArticle[]> {
  if (!env.GNEWS_API_KEY) throw errors.source('GNEWS_API_KEY is not configured');
  const url = new URL('https://gnews.io/api/v4/search');
  url.searchParams.set('q', query);
  url.searchParams.set('lang', 'en');
  url.searchParams.set('max', String(max));
  url.searchParams.set('sortby', 'publishedAt');
  url.searchParams.set('from', new Date(Date.now() - days * 86_400_000).toISOString().replace(/\.\d{3}Z$/, 'Z'));
  url.searchParams.set('apikey', env.GNEWS_API_KEY);

  let response: Response;
  try {
    await waitForTurn();
    response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (response.status === 429) {
      await sleep(RETRY_AFTER_429_MS);
      await waitForTurn();
      response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    }
  } catch (err) {
    log.error('gnews request failed', { query, err });
    throw errors.source(`gnews request failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!response.ok) {
    // The body of an error response can echo request details, so only the status is kept.
    log.error('gnews returned an error status', { query, status: response.status });
    throw errors.source(`gnews returned HTTP ${response.status}`);
  }
  const body = (await response.json()) as { articles?: GNewsRawArticle[] };
  const articles = (body.articles ?? []).map((a) => normalize(a, query)).filter((a): a is NewsArticle => a !== null);
  log.info('gnews search', { query, days, returned: articles.length });
  return articles;
}
