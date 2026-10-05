import { createHash } from 'node:crypto';
import { cleanModelText } from '../ai/guard';
import { summarizePeriod } from '../ai/tasks';
import { ATTENTION_RANK } from '../domain/attention';
import { Bucket, Period, bucketFor, bucketKey, istDay } from '../domain/periods';
import { Attention, Continuity, isAttention, isContinuity } from '../domain/types';
import { errors } from '../lib/errors';
import { createLogger } from '../lib/logger';
import { supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';
import { getProfile, listAmbitions } from './ambitions';

const log = createLogger('evolution');

const QUIET_WINDOW_DAYS = 30;
const ITEMS_LIMIT = 2000;
const MAX_NEW_SUMMARIES = 12;
const MAX_ENTRIES_PER_SUMMARY = 12;
const MAX_SUMMARY_CHARS = 500;

export interface EvolutionEntry {
  developmentId: string;
  storyId: string;
  storyTitle: string;
  headline: string;
  continuity: Continuity | null;
  occurredAt: string;
  // The IST day this development first appeared in the user's briefing: the day it was fetched for them.
  fetchedOn: string;
  whyItMatters: string | null;
  attention: Attention | null;
}

export interface ChangedUnderstanding {
  assumptionId: string;
  statement: string;
  challengedAt: string | null;
  reason: string | null;
  headline: string | null;
}

export interface EvolutionPeriod {
  period: Period;
  start: string;
  // The stored one-note summary; until one is written the strongest development's own explanation stands in.
  summary: string | null;
  developments: EvolutionEntry[];
}

export interface Evolution {
  ambitionId: string;
  // Negative information: stated only from what was actually checked, never from a missing run.
  quiet: { lastCheckedAt: string | null; observedDays: number; windowDays: number; linkedInWindow: number; lastLinkedAt: string | null };
  changedUnderstanding: ChangedUnderstanding[];
  // Newest first: recent days one by one, then weeks, months and years.
  periods: EvolutionPeriod[];
}

interface ReportItemRow {
  development_id: string;
  headline: string;
  continuity: string | null;
  why_it_matters: string | null;
  attention: string | null;
  story_id: string;
  stories: { title: string } | null;
  developments: { occurred_at: string } | null;
  daily_reports: { report_date: string };
}

interface ChallengedRow {
  id: string;
  statement: string;
  challenged_at: string | null;
  challenge_reason: string | null;
  developments: { headline: string } | null;
}

async function lastCompletedRun(userId: string): Promise<string | null> {
  const [job, batch] = await Promise.all([
    supabase.from('fetch_jobs').select('completed_at').eq('user_id', userId).eq('status', 'COMPLETED').order('completed_at', { ascending: false }).limit(1).maybeSingle<{ completed_at: string | null }>(),
    supabase.from('batch_runs').select('completed_at').eq('status', 'COMPLETED').order('completed_at', { ascending: false }).limit(1).maybeSingle<{ completed_at: string | null }>(),
  ]);
  const times = [unwrapMaybe('jobs.last', job)?.completed_at, unwrapMaybe('batch.last', batch)?.completed_at].filter((t): t is string => Boolean(t));
  return times.sort().at(-1) ?? null;
}

interface PeriodRow {
  period: Period;
  period_start: string;
  summary: string;
  items_hash: string;
}

// A development stays in later briefings too, so it is filed under the first day it appeared.
async function loadEntries(userId: string, ambitionId: string): Promise<EvolutionEntry[]> {
  const rows = unwrap(
    'evolution.items',
    await supabase
      .from('report_items')
      .select('development_id, headline, continuity, why_it_matters, attention, story_id, stories(title), developments(occurred_at), daily_reports!inner(report_date, user_id)')
      .eq('ambition_id', ambitionId)
      .eq('daily_reports.user_id', userId)
      .limit(ITEMS_LIMIT)
      .returns<ReportItemRow[]>(),
  );
  const first = new Map<string, EvolutionEntry>();
  for (const r of rows) {
    const fetchedOn = r.daily_reports.report_date;
    const existing = first.get(r.development_id);
    if (existing && existing.fetchedOn <= fetchedOn) continue;
    first.set(r.development_id, {
      developmentId: r.development_id,
      storyId: r.story_id,
      storyTitle: r.stories?.title ?? '',
      headline: r.headline,
      continuity: isContinuity(r.continuity) ? r.continuity : null,
      occurredAt: r.developments?.occurred_at ?? `${fetchedOn}T00:00:00Z`,
      fetchedOn,
      whyItMatters: r.why_it_matters?.trim() || null,
      attention: isAttention(r.attention) ? r.attention : null,
    });
  }
  return [...first.values()].sort((x, y) => y.fetchedOn.localeCompare(x.fetchedOn) || ATTENTION_RANK[x.attention ?? 'fyi'] - ATTENTION_RANK[y.attention ?? 'fyi']);
}

interface Group {
  bucket: Bucket;
  entries: EvolutionEntry[];
}

function groupByBucket(entries: EvolutionEntry[], today: string): Group[] {
  const groups = new Map<string, Group>();
  for (const entry of entries) {
    const bucket = bucketFor(entry.fetchedOn, today);
    const key = bucketKey(bucket);
    const group = groups.get(key) ?? { bucket, entries: [] };
    group.entries.push(entry);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.bucket.start.localeCompare(a.bucket.start));
}

function hashOf(entries: EvolutionEntry[]): string {
  return createHash('sha1').update(entries.map((e) => e.developmentId).sort().join(',')).digest('hex');
}

// The strongest entries first, so a long period is summarised from what mattered most.
function strongest(entries: EvolutionEntry[]): EvolutionEntry[] {
  return [...entries].sort((a, b) => ATTENTION_RANK[a.attention ?? 'fyi'] - ATTENTION_RANK[b.attention ?? 'fyi']);
}

const PERIOD_LABEL: Record<Period, (start: string) => string> = {
  day: (start) => `the day ${start}`,
  week: (start) => `the week starting ${start}`,
  month: (start) => `the month ${start.slice(0, 7)}`,
  year: (start) => `the year ${start.slice(0, 4)}`,
};

async function loadPeriodRows(userId: string, ambitionId: string): Promise<PeriodRow[]> {
  return unwrap(
    'evolution.periods',
    await supabase
      .from('ambition_period_summaries')
      .select('period, period_start, summary, items_hash')
      .eq('user_id', userId)
      .eq('ambition_id', ambitionId)
      .returns<PeriodRow[]>(),
  );
}

/**
 * Writes the missing or outdated period summaries for one ambition and drops those that were rolled up into a
 * longer period. At most MAX_NEW_SUMMARIES are written per call so a first run over a long history stays bounded;
 * the rest follow on the next run. A failed summary is skipped and the stored explanation stands in for it.
 */
export async function refreshPeriodSummaries(userId: string, ambition: { id: string; title: string }, language: string): Promise<number> {
  const today = istDay(new Date());
  const groups = groupByBucket(await loadEntries(userId, ambition.id), today);
  const stored = new Map((await loadPeriodRows(userId, ambition.id)).map((r) => [`${r.period}:${r.period_start}`, r]));

  let written = 0;
  for (const group of groups) {
    if (written >= MAX_NEW_SUMMARIES) break;
    const hash = hashOf(group.entries);
    if (stored.get(bucketKey(group.bucket))?.items_hash === hash) continue;
    try {
      const summary = cleanModelText(
        await summarizePeriod({
          ambition: ambition.title,
          periodLabel: PERIOD_LABEL[group.bucket.period](group.bucket.start),
          language,
          entries: strongest(group.entries).slice(0, MAX_ENTRIES_PER_SUMMARY).map((e) => ({ date: e.fetchedOn, headline: e.headline, why: e.whyItMatters })),
        }),
        MAX_SUMMARY_CHARS,
      );
      if (!summary) continue;
      unwrapVoid(
        'evolution.summary.store',
        await supabase.from('ambition_period_summaries').upsert(
          { user_id: userId, ambition_id: ambition.id, period: group.bucket.period, period_start: group.bucket.start, summary, items_hash: hash, generated_at: new Date().toISOString() },
          { onConflict: 'user_id,ambition_id,period,period_start' },
        ),
      );
      written += 1;
    } catch (err) {
      log.warn('period summary skipped', { userId, ambitionId: ambition.id, bucket: bucketKey(group.bucket), err });
    }
  }

  const current = new Set(groups.map((g) => bucketKey(g.bucket)));
  for (const [key, row] of stored) {
    if (current.has(key)) continue;
    unwrapVoid(
      'evolution.summary.prune',
      await supabase.from('ambition_period_summaries').delete().eq('user_id', userId).eq('ambition_id', ambition.id).eq('period', row.period).eq('period_start', row.period_start),
    );
  }
  return written;
}

/** Brings the period summaries of every active ambition of the user up to date. */
export async function refreshHistory(userId: string): Promise<void> {
  const [ambitions, profile] = await Promise.all([listAmbitions(userId), getProfile(userId)]);
  const language = profile?.report_language ?? 'English';
  for (const ambition of ambitions.filter((a) => a.status === 'active')) {
    await refreshPeriodSummaries(userId, ambition, language);
  }
}

export async function getEvolution(userId: string, ambitionId: string): Promise<Evolution> {
  const owns = unwrapMaybe(
    'evolution.ambition',
    await supabase.from('ambitions').select('id').eq('id', ambitionId).eq('user_id', userId).maybeSingle<{ id: string }>(),
  );
  if (!owns) throw errors.notFound('Ambition');

  const [entries, storedPeriods, challenged, firstEvaluated, lastCheckedAt] = await Promise.all([
    loadEntries(userId, ambitionId),
    loadPeriodRows(userId, ambitionId),
    supabase
      .from('ambition_assumptions')
      .select('id, statement, challenged_at, challenge_reason, developments:challenged_by_development_id(headline)')
      .eq('user_id', userId)
      .eq('ambition_id', ambitionId)
      .eq('status', 'challenged')
      .order('challenged_at', { ascending: false })
      .returns<ChallengedRow[]>(),
    supabase.from('world_coverage').select('evaluated_at').eq('user_id', userId).order('evaluated_at', { ascending: true }).limit(1).maybeSingle<{ evaluated_at: string }>(),
    lastCompletedRun(userId),
  ]);

  const summaries = new Map(storedPeriods.map((r) => [`${r.period}:${r.period_start}`, r.summary]));
  const periods: EvolutionPeriod[] = groupByBucket(entries, istDay(new Date())).map((group) => ({
    period: group.bucket.period,
    start: group.bucket.start,
    summary: summaries.get(bucketKey(group.bucket)) ?? strongest(group.entries)[0]?.whyItMatters ?? null,
    developments: group.entries,
  }));

  const windowStart = istDay(new Date(Date.now() - QUIET_WINDOW_DAYS * 86_400_000));
  const inWindow = entries.filter((e) => e.fetchedOn >= windowStart);
  const latestDay = entries[0]?.fetchedOn;
  const firstAt = unwrapMaybe('evolution.first', firstEvaluated)?.evaluated_at;
  const observedDays = firstAt ? Math.min(QUIET_WINDOW_DAYS, Math.max(1, Math.ceil((Date.now() - new Date(firstAt).getTime()) / 86_400_000))) : 0;

  return {
    ambitionId,
    quiet: { lastCheckedAt, observedDays, windowDays: QUIET_WINDOW_DAYS, linkedInWindow: inWindow.length, lastLinkedAt: latestDay ? `${latestDay}T12:00:00Z` : null },
    changedUnderstanding: unwrap('evolution.challenged', challenged).map((c) => ({
      assumptionId: c.id,
      statement: c.statement,
      challengedAt: c.challenged_at,
      reason: c.challenge_reason,
      headline: c.developments?.headline ?? null,
    })),
    periods,
  };
}
