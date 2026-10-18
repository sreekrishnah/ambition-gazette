import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_TEXT_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
  // Measured: replies start in about 0.5 s on this model versus 4 to 5 s on the 2.5 native-audio preview.
  // gemini-3.1-flash-live-preview closes the session with error 1011 as soon as audio arrives with this app's tools.
  GEMINI_LIVE_MODEL: z.string().min(1).default('gemini-3.8-live'),
  GEMINI_EMBEDDING_MODEL: z.string().min(1).default('gemini-embedding-001'),
  // Primary news source. Without it the pipeline falls back to GDELT, which has no article descriptions.
  GNEWS_API_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(16).optional(),
  // Hard limits on the live voice agent, counted per user per IST day.
  VOICE_SESSIONS_PER_DAY: z.coerce.number().int().min(1).default(2),
  VOICE_TOKENS_PER_SESSION: z.coerce.number().int().min(10_000).default(2_000_000),
  VOICE_TOKENS_PER_DAY: z.coerce.number().int().min(10_000).default(4_000_000),
  // How far back the briefing and the Lens look for developments, and optionally the date the window ends at.
  // Both are changed only to replay the dated NVIDIA demo; normally the window is the last 14 days up to now.
  BRIEFING_WINDOW_DAYS: z.coerce.number().int().min(1).default(14),
  BRIEFING_WINDOW_END: z.string().datetime({ offset: true }).optional(),
  VOICE_MAX_TOOL_CALLS: z.coerce.number().int().min(1).default(60),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Names only: values may be secrets.
    const names = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid or missing environment variables: ${names}. See api/.env.example.`);
  }
  return parsed.data;
}

export const env: Env = loadEnv();

/** The span of developments the briefing and the Lens weigh; `until` is null for the live window that ends now. */
export function briefingWindow(): { since: Date; until: Date | null } {
  const until = env.BRIEFING_WINDOW_END ? new Date(env.BRIEFING_WINDOW_END) : null;
  return { since: new Date((until ?? new Date()).getTime() - env.BRIEFING_WINDOW_DAYS * 86_400_000), until };
}

// The vector columns are vector(768); the embedding model is asked for exactly this size.
export const EMBEDDING_DIMENSIONS = 768;
