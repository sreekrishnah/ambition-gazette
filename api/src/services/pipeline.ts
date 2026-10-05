import { runPatiently } from '../lib/gemini';
import { AppError, errors } from '../lib/errors';
import { NewsArticle, searchNews } from '../lib/news';
import { createLogger } from '../lib/logger';
import { supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';
import { buildBriefing } from './briefing';
import { refreshHistory } from './evolution';
import { IngestStats, emptyStats, ingestArticles } from './ingest';
import { archiveExpiredMemory } from './memory';
import { generateBriefingScript } from './script';

const log = createLogger('pipeline');

const LOOKBACK_DAYS = 7;
// GNews rejects bursts, so searches are spaced out.
const SEARCH_SPACING_MS = 1500;
const QUERIES_PER_AMBITION = 5;
const MAX_QUERIES = 8;
// A run may take as long as it needs (model rate limits can add minutes). It is judged by whether it is still
// alive: it writes a heartbeat while working, and one that has gone quiet this long is treated as dead.
const STALE_HEARTBEAT_MS = 10 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30 * 1000;
const RUNS_PER_DAY = 2;

export type ProgressReporter = (message: string) => void;

export interface JobStatus {
  id: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  progress: string | null;
  stats: Record<string, unknown> | null;
}

interface JobRow {
  id: string;
  status: JobStatus['status'];
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  progress: string | null;
  heartbeat_at: string | null;
  stats: Record<string, unknown> | null;
}

// A run that stopped heartbeating (the server restarted mid-run, for instance) is reported as failed, so the UI never waits on it.
function effectiveStatus(row: JobRow): JobStatus['status'] {
  if (row.status !== 'PROCESSING') return row.status;
  const lastSeen = new Date(row.heartbeat_at ?? row.started_at ?? 0).getTime();
  return Date.now() - lastSeen > STALE_HEARTBEAT_MS ? 'FAILED' : 'PROCESSING';
}

const toStatus = (row: JobRow): JobStatus => ({
  id: row.id,
  status: effectiveStatus(row),
  startedAt: row.started_at,
  completedAt: row.completed_at,
  error: row.error ?? (effectiveStatus(row) === 'FAILED' && row.status === 'PROCESSING' ? 'The refresh stopped unexpectedly. Please try again.' : null),
  progress: row.progress,
  stats: row.stats,
});

export async function getLatestJob(userId: string): Promise<JobStatus | null> {
  const row = unwrapMaybe(
    'jobs.latest',
    await supabase
      .from('fetch_jobs')
      .select('id, status, started_at, completed_at, error, progress, heartbeat_at, stats')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<JobRow>(),
  );
  return row ? toStatus(row) : null;
}

export async function searchConcepts(userId: string): Promise<string[]> {
  const rows = unwrap(
    'ambition_context.load',
    await supabase
      .from('ambitions')
      .select('id, ambition_context(search_concepts)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .returns<Array<{ id: string; ambition_context: Array<{ search_concepts: string[] | null }> | null }>>(),
  );
  const queries: string[] = [];
  for (const ambition of rows) {
    const concepts = ambition.ambition_context?.[0]?.search_concepts ?? [];
    queries.push(...concepts.slice(0, QUERIES_PER_AMBITION));
  }
  return [...new Set(queries.map((q) => q.trim()).filter(Boolean))].slice(0, MAX_QUERIES);
}

export async function collectNews(queries: string[], report: ProgressReporter): Promise<{ articles: NewsArticle[]; errors: string[] }> {
  const articles: NewsArticle[] = [];
  const failures: string[] = [];
  for (const [index, query] of queries.entries()) {
    report(`Searching the events (${index + 1} of ${queries.length})`);
    if (articles.length > 0 || failures.length > 0) await new Promise((resolve) => setTimeout(resolve, SEARCH_SPACING_MS));
    try {
      articles.push(...(await searchNews(query, LOOKBACK_DAYS)));
    } catch (err) {
      failures.push(err instanceof AppError ? (err.diagnostic ?? err.safeMessage) : String(err));
    }
  }
  if (articles.length === 0 && failures.length === queries.length && queries.length > 0) {
    throw errors.source(failures.join(' | '));
  }
  return { articles, errors: failures };
}

export interface RunResult {
  stats: IngestStats;
  sourceErrors: string[];
  briefing: Awaited<ReturnType<typeof buildBriefing>> | null;
  scripts: number;
}

/**
 * Fetches news for the given users' ambitions, ingests it once for everyone, then for each user maps the events
 * to their ambitions, adds the unavoidable world events, and writes the spoken script. It waits out model rate
 * limits rather than giving up, so it can take several minutes. Ambitions without search concepts are skipped
 * rather than guessed at.
 */
export function runPipeline(userIds: string[], report: ProgressReporter = () => undefined): Promise<RunResult> {
  return runPatiently(async () => {
    const queries = new Set<string>();
    for (const userId of userIds) for (const q of await searchConcepts(userId)) queries.add(q);

    let stats = emptyStats();
    let sourceErrors: string[] = [];
    if (queries.size > 0) {
      const news = await collectNews([...queries], report);
      sourceErrors = news.errors;
      let lastReported = -1;
      stats = await ingestArticles(news.articles, (done, total) => {
        // Reported every few articles so the progress text changes without flooding the database.
        if (done - lastReported >= 3 || done === 0) {
          lastReported = done;
          report(`Reading and sorting articles (${done} of ${total})`);
        }
      });
    } else {
      log.warn('no search concepts for pipeline run', { users: userIds.length });
    }

    let briefing: RunResult['briefing'] = null;
    let scripts = 0;
    for (const userId of userIds) {
      briefing = await buildBriefing(userId, { onProgress: report });
      report('Writing your spoken briefing script');
      try {
        if (await generateBriefingScript(userId)) scripts += 1;
      } catch (err) {
        // The briefing itself is already saved; the voice agent falls back to the stored briefing without a script.
        log.error('script generation failed', { userId, err });
      }
    }
    for (const userId of userIds) {
      report('Updating how your ambitions have changed');
      try {
        await refreshHistory(userId);
      } catch (err) {
        // The history still shows each development; only its short summary is missing until the next run.
        log.error('ambition history refresh failed', { userId, err });
      }
    }
    await archiveExpiredMemory();
    return { stats, sourceErrors, briefing, scripts };
  });
}

/**
 * Starts a pipeline run for one user in the background and returns the job id. The daily limit is
 * consumed atomically in the database.
 */
export async function startUserRun(userId: string): Promise<string> {
  const aliveSince = new Date(Date.now() - STALE_HEARTBEAT_MS).toISOString();
  const recent = unwrapMaybe(
    'jobs.running',
    await supabase
      .from('fetch_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'PROCESSING')
      .or(`heartbeat_at.gte.${aliveSince},and(heartbeat_at.is.null,started_at.gte.${aliveSince})`)
      .limit(1)
      .maybeSingle<{ id: string }>(),
  );
  if (recent) throw new AppError('ALREADY_RUNNING', 409, 'A refresh is already in progress.');

  const allowed = await supabase.rpc('consume_daily_run', { p_user_id: userId });
  if (allowed.error) throw errors.database('consume_daily_run', allowed.error.message);
  if (!allowed.data) throw new AppError('DAILY_LIMIT', 429, `Daily refresh limit reached (${RUNS_PER_DAY} per day, including the scheduled 6 am run).`);

  const now = new Date().toISOString();
  const job = unwrap(
    'jobs.create',
    await supabase
      .from('fetch_jobs')
      .insert({ user_id: userId, trigger: 'MANUAL', status: 'PROCESSING', started_at: now, heartbeat_at: now, progress: 'Starting' })
      .select('id')
      .single<{ id: string }>(),
  );

  void (async () => {
    let latest = 'Starting';
    const beat = async () => {
      const { error } = await supabase.from('fetch_jobs').update({ heartbeat_at: new Date().toISOString(), progress: latest }).eq('id', job.id);
      if (error) log.warn('job heartbeat failed', { jobId: job.id, err: error });
    };
    // The heartbeat also ticks while a single step is waiting out a model rate limit.
    const timer = setInterval(() => void beat(), HEARTBEAT_INTERVAL_MS);
    try {
      const result = await runPipeline([userId], (message) => {
        latest = message;
      });
      unwrapVoid(
        'jobs.complete',
        await supabase
          .from('fetch_jobs')
          .update({ status: 'COMPLETED', completed_at: new Date().toISOString(), progress: 'Done', stats: { ...result.stats, sourceErrors: result.sourceErrors, briefing: result.briefing, scripts: result.scripts } })
          .eq('id', job.id),
      );
    } catch (err) {
      const message = err instanceof AppError ? err.safeMessage : 'Refresh failed.';
      log.error('pipeline run failed', { userId, jobId: job.id, err });
      await supabase
        .from('fetch_jobs')
        .update({ status: 'FAILED', completed_at: new Date().toISOString(), error: message })
        .eq('id', job.id);
    } finally {
      clearInterval(timer);
    }
  })();

  return job.id;
}

// Marks runs that stopped heartbeating (for example after a server restart) so the UI never waits on a run that no longer exists.
export async function failOrphanedJobs(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_HEARTBEAT_MS).toISOString();
  const { error } = await supabase
    .from('fetch_jobs')
    .update({ status: 'FAILED', completed_at: new Date().toISOString(), error: 'Interrupted by a server restart.' })
    .eq('status', 'PROCESSING')
    .or(`heartbeat_at.lt.${cutoff},and(heartbeat_at.is.null,started_at.lt.${cutoff})`);
  if (error) log.error('failed to clean orphaned jobs', { err: error });
}
