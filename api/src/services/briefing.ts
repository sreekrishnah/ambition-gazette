import { SignalEffect } from '../domain/beliefs';
import { ATTENTION_RANK } from '../domain/attention';
import { Attention, Continuity, RelevanceBasis, isAttention, isContinuity } from '../domain/types';
import { createLogger } from '../lib/logger';
import { supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';
import { recomputeUserAssumptions } from './assumptions';
import { DevelopmentRecord, EvaluatedDevelopment, evaluateMany, loadDevelopments, loadUserContext } from './relevance';
import { pickMustKnowEvents } from './worldEvents';

const log = createLogger('briefing');

const WINDOW_DAYS = 14;
// Every development in the window is weighed against the plan; a lower cap silently dropped older ones that still mattered.
const WINDOW_MAX_DEVELOPMENTS = 500;

export interface BriefingSource {
  name: string;
  url: string;
  title: string | null;
  publishedAt: string | null;
}

export interface BriefingItem {
  id: string;
  developmentId: string;
  storyId: string;
  storyTitle: string;
  headline: string;
  summary: string | null;
  whatChanged: string | null;
  continuity: Continuity | null;
  whyItMatters: string | null;
  couldChange: string | null;
  relevanceBasis: RelevanceBasis | null;
  relevanceScore: number;
  attention: Attention;
  // Set only when the development bears on an assumption the user stated for the linked ambition.
  assumption: { id: string; statement: string; note: string; reconsider: string | null; effect: SignalEffect } | null;
  evidenceStrength: string | null;
  worldSignificance: number | null;
  ambitionId: string | null;
  ambitionTitle: string | null;
  occurredAt: string;
  category: string | null;
  geography: string | null;
  sources: BriefingSource[];
  // A real picture from one of the articles reporting it, when a publisher supplied one.
  imageUrl: string | null;
  tracked: boolean;
}

// A voice reply must not wait on re-evaluating the briefing, which can involve model calls.
// Background runs for the same user are chained so they never overlap.
const backgroundBuilds = new Map<string, Promise<unknown>>();

export interface RefreshOptions {
  storyId?: string;
  background?: boolean;
}

export async function refreshBriefing(userId: string, options: RefreshOptions = {}): Promise<void> {
  const { background, ...buildOptions } = options;
  if (!background) {
    await buildBriefing(userId, buildOptions);
    return;
  }
  const previous = backgroundBuilds.get(userId) ?? Promise.resolve();
  const next = previous
    .then(() => buildBriefing(userId, buildOptions))
    .catch((err) => log.error('background briefing build failed', { userId, err }))
    .finally(() => {
      if (backgroundBuilds.get(userId) === next) backgroundBuilds.delete(userId);
    });
  backgroundBuilds.set(userId, next);
}

interface SourceRow {
  development_id: string | null;
  url: string;
  title: string | null;
  publisher: string | null;
  published_at: string | null;
}

export function istDate(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** The first usable picture from the articles behind each development; only plain https links are passed on. */
async function loadImages(developmentIds: string[]): Promise<Map<string, string>> {
  const images = new Map<string, string>();
  if (developmentIds.length === 0) return images;
  const rows = unwrap(
    'sources.images',
    await supabase
      .from('story_sources')
      .select('development_id, articles(image_url)')
      .in('development_id', developmentIds)
      .returns<Array<{ development_id: string | null; articles: { image_url: string | null } | null }>>(),
  );
  for (const row of rows) {
    const url = row.articles?.image_url;
    if (row.development_id && url && url.length <= 600 && url.startsWith('https://') && !images.has(row.development_id)) images.set(row.development_id, url);
  }
  return images;
}

export async function loadSources(developmentIds: string[]): Promise<Map<string, BriefingSource[]>> {
  const bySource = new Map<string, BriefingSource[]>();
  if (developmentIds.length === 0) return bySource;
  const rows = unwrap(
    'sources.load',
    await supabase
      .from('story_sources')
      .select('development_id, url, title, publisher, published_at')
      .in('development_id', developmentIds)
      .returns<SourceRow[]>(),
  );
  for (const row of rows) {
    if (!row.development_id) continue;
    const list = bySource.get(row.development_id) ?? [];
    list.push({ name: row.publisher ?? 'Source', url: row.url, title: row.title, publishedAt: row.published_at });
    bySource.set(row.development_id, list);
  }
  return bySource;
}

// One briefing row per story: the latest shown development carries "what changed".
function latestPerStory(shown: EvaluatedDevelopment[], devs: Map<string, DevelopmentRecord>): EvaluatedDevelopment[] {
  const best = new Map<string, EvaluatedDevelopment>();
  for (const item of shown) {
    const current = best.get(item.storyId);
    const itemTime = new Date(devs.get(item.developmentId)?.occurred_at ?? 0).getTime();
    const currentTime = current ? new Date(devs.get(current.developmentId)?.occurred_at ?? 0).getTime() : -1;
    if (!current || itemTime > currentTime) best.set(item.storyId, item);
  }
  return [...best.values()].sort(
    (a, b) =>
      ATTENTION_RANK[a.decision.attention ?? 'fyi'] - ATTENTION_RANK[b.decision.attention ?? 'fyi'] ||
      // Unavoidable world events follow the items that are about the user's own goals.
      Number(a.decision.basis === 'general') - Number(b.decision.basis === 'general') ||
      b.decision.personalRelevance - a.decision.personalRelevance,
  );
}

export interface BriefingBuildResult {
  reportId: string;
  items: number;
  evaluated: number;
  failed: number;
}

/**
 * Re-evaluates recent developments for the user against their current memory and rewrites today's
 * briefing. Safe to call repeatedly: model assessments are cached per (user, development, ambition).
 */
export async function buildBriefing(
  userId: string,
  options: { storyId?: string; onProgress?: (message: string) => void } = {},
): Promise<BriefingBuildResult> {
  const ctx = await loadUserContext(userId);
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const devs = await loadDevelopments(options.storyId ? { storyId: options.storyId, limit: 50 } : { since, limit: WINDOW_MAX_DEVELOPMENTS });
  const devById = new Map(devs.map((d) => [d.id, d]));
  const { evaluated, failed } = await evaluateMany(ctx, devs, (done, total) =>
    options.onProgress?.(`Matching events to your ambitions (${done} of ${total})`),
  );
  await recomputeUserAssumptions(userId);
  options.onProgress?.('Checking for unavoidable world events');
  // A story-scoped rebuild (after feedback on one story) leaves the world-events judgement alone.
  const worldEvents = options.storyId ? [] : await pickMustKnowEvents(ctx, devs, evaluated);

  const shown = latestPerStory([...evaluated.filter((e) => e.decision.show), ...worldEvents], devById);
  const sources = await loadSources(shown.map((s) => s.developmentId));

  const report = unwrap(
    'report.upsert',
    await supabase
      .from('daily_reports')
      .upsert({ user_id: userId, report_date: istDate(), generated_at: new Date().toISOString() }, { onConflict: 'user_id,report_date' })
      .select('id')
      .single<{ id: string }>(),
  );

  const keepIds = shown.map((s) => s.developmentId);
  const existing = unwrap(
    'report_items.existing',
    await supabase.from('report_items').select('id, development_id').eq('report_id', report.id).returns<Array<{ id: string; development_id: string }>>(),
  );
  // A story-scoped refresh must not prune items that belong to other stories.
  const scope = new Set(devs.map((d) => d.id));
  const stale = existing.filter((r) => scope.has(r.development_id) && !keepIds.includes(r.development_id)).map((r) => r.id);
  if (stale.length > 0) unwrapVoid('report_items.prune', await supabase.from('report_items').delete().in('id', stale));

  if (shown.length > 0) {
    const rows = shown.map((item) => {
      const dev = devById.get(item.developmentId);
      if (!dev) throw new Error(`development ${item.developmentId} missing from window`);
      return {
        report_id: report.id,
        development_id: dev.id,
        story_id: dev.story_id,
        ambition_id: item.decision.ambitionId,
        headline: dev.headline,
        summary: dev.summary,
        what_changed: dev.what_changed,
        continuity: dev.continuity,
        why_it_matters: item.decision.whyItMatters,
        could_change: item.decision.couldChange,
        relevance_reason: item.decision.factors.map((f) => f.detail).join('; ') || null,
        relevance_basis: item.decision.basis,
        attention: item.decision.attention,
        assumption_id: item.decision.assumption?.assumptionId ?? null,
        assumption_note: item.decision.assumption?.reason ?? null,
        assumption_effect: item.decision.assumption?.effect === 'none' ? null : (item.decision.assumption?.effect ?? null),
        assumption_reconsider: item.decision.assumption?.effect === 'challenges' ? item.decision.assumption.reconsider?.trim() || null : null,
        personal_relevance: item.decision.personalRelevance,
        world_significance: dev.world_significance,
        confidence: item.decision.personalRelevance,
        sources: sources.get(dev.id) ?? [],
      };
    });
    unwrapVoid('report_items.upsert', await supabase.from('report_items').upsert(rows, { onConflict: 'report_id,development_id' }));
  }

  log.info('briefing built', { userId, reportId: report.id, items: shown.length, evaluated: evaluated.length, failed });
  return { reportId: report.id, items: shown.length, evaluated: evaluated.length, failed };
}

interface ReportItemRow {
  id: string;
  development_id: string;
  story_id: string;
  ambition_id: string | null;
  headline: string;
  summary: string | null;
  what_changed: string | null;
  continuity: string | null;
  why_it_matters: string | null;
  could_change: string | null;
  relevance_basis: RelevanceBasis | null;
  attention: string | null;
  assumption_id: string | null;
  assumption_note: string | null;
  assumption_reconsider: string | null;
  assumption_effect: SignalEffect | null;
  personal_relevance: number | null;
  world_significance: number | null;
  sources: BriefingSource[] | null;
  developments: { occurred_at: string; evidence_strength: string | null } | null;
  ambition_assumptions: { statement: string } | null;
  stories: { title: string; category: string | null; geography: string | null } | null;
  ambitions: { title: string } | null;
}

export async function getLatestReport(userId: string): Promise<{ id: string; reportDate: string; generatedAt: string | null } | null> {
  const row = unwrapMaybe(
    'report.latest',
    await supabase
      .from('daily_reports')
      .select('id, report_date, generated_at')
      .eq('user_id', userId)
      .order('report_date', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string; report_date: string; generated_at: string | null }>(),
  );
  return row ? { id: row.id, reportDate: row.report_date, generatedAt: row.generated_at } : null;
}

export async function getBriefingItems(userId: string, limit = 20): Promise<{ report: Awaited<ReturnType<typeof getLatestReport>>; items: BriefingItem[] }> {
  const report = await getLatestReport(userId);
  if (!report) return { report: null, items: [] };
  return { report, items: await getReportItems(userId, report, limit) };
}

/** The saved briefing for one day, so earlier days stay readable after a new one is built. */
export async function getReportForDate(userId: string, date: string): Promise<{ id: string; reportDate: string; generatedAt: string | null } | null> {
  const row = unwrapMaybe(
    'report.byDate',
    await supabase
      .from('daily_reports')
      .select('id, report_date, generated_at')
      .eq('user_id', userId)
      .eq('report_date', date)
      .maybeSingle<{ id: string; report_date: string; generated_at: string | null }>(),
  );
  return row ? { id: row.id, reportDate: row.report_date, generatedAt: row.generated_at } : null;
}

/** Days that have a saved briefing, newest first, with how many items each holds. */
export async function listReportDays(userId: string, limit = 30): Promise<Array<{ date: string; items: number }>> {
  const reports = unwrap(
    'report.days',
    await supabase
      .from('daily_reports')
      .select('id, report_date')
      .eq('user_id', userId)
      .order('report_date', { ascending: false })
      .limit(limit)
      .returns<Array<{ id: string; report_date: string }>>(),
  );
  if (reports.length === 0) return [];
  const rows = unwrap(
    'report_items.counts',
    await supabase.from('report_items').select('report_id').in('report_id', reports.map((r) => r.id)).returns<Array<{ report_id: string }>>(),
  );
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.report_id, (counts.get(row.report_id) ?? 0) + 1);
  return reports.map((r) => ({ date: r.report_date, items: counts.get(r.id) ?? 0 }));
}

export async function getReportItems(
  userId: string,
  report: { id: string; generatedAt: string | null },
  limit = 20,
): Promise<BriefingItem[]> {
  const rows = unwrap(
    'report_items.list',
    await supabase
      .from('report_items')
      .select(
        'id, development_id, story_id, ambition_id, headline, summary, what_changed, continuity, why_it_matters, could_change, relevance_basis, attention, assumption_id, assumption_note, assumption_reconsider, assumption_effect, personal_relevance, world_significance, sources, developments(occurred_at, evidence_strength), stories(title, category, geography), ambitions(title), ambition_assumptions(statement)',
      )
      .eq('report_id', report.id)
      .returns<ReportItemRow[]>(),
  );
  const tracked = unwrap(
    'tracked.ids',
    await supabase.from('tracked_stories').select('story_id').eq('user_id', userId).returns<Array<{ story_id: string }>>(),
  );
  const trackedIds = new Set(tracked.map((t) => t.story_id));
  const images = await loadImages(rows.map((r) => r.development_id));

  const items: BriefingItem[] = rows.map((r) => ({
    id: r.id,
    developmentId: r.development_id,
    storyId: r.story_id,
    storyTitle: r.stories?.title ?? '',
    headline: r.headline,
    summary: r.summary,
    whatChanged: r.what_changed,
    continuity: isContinuity(r.continuity) ? r.continuity : null,
    whyItMatters: r.why_it_matters,
    couldChange: r.could_change,
    relevanceBasis: r.relevance_basis,
    relevanceScore: r.personal_relevance ?? 0,
    attention: isAttention(r.attention) ? r.attention : 'fyi',
    assumption:
      r.assumption_id && r.ambition_assumptions && r.assumption_note && r.assumption_effect
        ? { id: r.assumption_id, statement: r.ambition_assumptions.statement, note: r.assumption_note, reconsider: r.assumption_reconsider, effect: r.assumption_effect }
        : null,
    evidenceStrength: r.developments?.evidence_strength ?? null,
    worldSignificance: r.world_significance,
    ambitionId: r.ambition_id,
    ambitionTitle: r.ambitions?.title ?? null,
    occurredAt: r.developments?.occurred_at ?? report.generatedAt ?? new Date().toISOString(),
    category: r.stories?.category ?? null,
    geography: r.stories?.geography ?? null,
    sources: r.sources ?? [],
    imageUrl: images.get(r.development_id) ?? null,
    tracked: trackedIds.has(r.story_id),
  }));
  items.sort((a, b) => ATTENTION_RANK[a.attention] - ATTENTION_RANK[b.attention] || b.relevanceScore - a.relevanceScore);
  return items.slice(0, limit);
}
