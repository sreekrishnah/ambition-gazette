import { assessRelevance } from '../ai/tasks';
import { AssumptionImpact } from '../domain/attention';
import { AmbitionAssessment, AmbitionCandidate, DevelopmentFacts, RelevanceDecision, decideRelevance } from '../domain/relevance';
import { MemoryRow } from '../domain/types';
import { createLogger } from '../lib/logger';
import { rpcRows, supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';
import { AssumptionRow, assumptionsKey, listAssumptions, markChallenged } from './assumptions';
import { getActiveMemory, getIdentity, retrieveSimilarMemory } from './memory';

const log = createLogger('relevance');

interface AmbitionRecord {
  id: string;
  title: string;
  description: string | null;
  horizon: string | null;
  geography: string | null;
  priority: number;
  updated_at: string;
}

interface DevelopmentRecord {
  id: string;
  story_id: string;
  headline: string;
  summary: string | null;
  what_changed: string;
  continuity: string | null;
  occurred_at: string;
  world_significance: number | null;
  significance_reason: string | null;
  embedding: string | null;
  stories: { id: string; title: string; category: string | null; geography: string | null; entities_json: unknown } | null;
  story_sources: Array<{ publisher: string | null }> | null;
}

interface CachedAssessment extends AmbitionAssessment {
  language?: string;
  ambitionId: string;
  ambitionUpdatedAt: string;
  assumptionsKey?: string;
  interestsKey?: string;
}

export interface UserRelevanceContext {
  userId: string;
  memory: MemoryRow[];
  identity: Record<string, string>;
  reportLanguage: string;
  ambitions: Map<string, AmbitionRecord>;
  trackedStoryIds: Set<string>;
  assumptions: Map<string, AssumptionRow[]>;
  // Topics the user explicitly said they follow. Interests inferred from questions are not included.
  interests: string[];
}

export interface EvaluatedDevelopment {
  developmentId: string;
  storyId: string;
  decision: RelevanceDecision;
  ambitionTitle: string | null;
}

const DEVELOPMENT_SELECT =
  'id, story_id, headline, summary, what_changed, continuity, occurred_at, world_significance, significance_reason, embedding, stories(id, title, category, geography, entities_json), story_sources(publisher)';

export function explicitInterests(memory: MemoryRow[]): string[] {
  return [
    ...new Set(
      memory
        .filter((m) => (m.memory_type === 'interest' || m.memory_type === 'temporary_interest') && m.source !== 'inferred')
        .map((m) => (m.topic ?? '').trim())
        .filter((topic) => topic.length > 1 && !/^(story|development|source):/.test(topic)),
    ),
  ].slice(0, 12);
}

export async function loadUserContext(userId: string): Promise<UserRelevanceContext> {
  const [memory, identity, profile, ambitionRows, tracked, assumptionRows] = await Promise.all([
    getActiveMemory(userId),
    getIdentity(userId),
    supabase.from('user_intelligence_profiles').select('report_language').eq('user_id', userId).maybeSingle<{ report_language: string | null }>(),
    supabase
      .from('ambitions')
      .select('id, title, description, horizon, geography, priority, updated_at')
      .eq('user_id', userId)
      .eq('status', 'active')
      .returns<AmbitionRecord[]>(),
    supabase.from('tracked_stories').select('story_id').eq('user_id', userId).returns<Array<{ story_id: string }>>(),
    listAssumptions(userId),
  ]);
  const assumptions = new Map<string, AssumptionRow[]>();
  for (const row of assumptionRows) assumptions.set(row.ambition_id, [...(assumptions.get(row.ambition_id) ?? []), row]);
  return {
    userId,
    memory,
    identity,
    reportLanguage: unwrapMaybe('profile.language', profile)?.report_language?.trim() || 'English',
    ambitions: new Map(unwrap('ambitions.load', ambitionRows).map((a) => [a.id, a])),
    trackedStoryIds: new Set(unwrap('tracked.load', tracked).map((t) => t.story_id)),
    assumptions,
    interests: explicitInterests(memory),
  };
}

function toFacts(dev: DevelopmentRecord): DevelopmentFacts {
  const story = dev.stories;
  const entities = Array.isArray(story?.entities_json) ? (story.entities_json as unknown[]).filter((e): e is string => typeof e === 'string') : [];
  return {
    developmentId: dev.id,
    storyId: dev.story_id,
    storyTitle: story?.title ?? '',
    geography: story?.geography ?? null,
    entities,
    text: `${dev.headline} ${dev.what_changed}`,
    worldSignificance: dev.world_significance ?? 0,
    occurredAt: dev.occurred_at,
    publishers: (dev.story_sources ?? []).map((s) => s.publisher ?? '').filter(Boolean),
  };
}

async function loadCachedAssessment(userId: string, developmentId: string): Promise<CachedAssessment | null> {
  const row = unwrapMaybe(
    'coverage.cache',
    await supabase
      .from('world_coverage')
      .select('relevance_reasons')
      .eq('user_id', userId)
      .eq('development_id', developmentId)
      .maybeSingle<{ relevance_reasons: { assessment?: CachedAssessment | null } | null }>(),
  );
  return row?.relevance_reasons?.assessment ?? null;
}

async function runAssessment(
  ctx: UserRelevanceContext,
  dev: DevelopmentRecord,
  ambition: AmbitionRecord,
  assumptions: AssumptionRow[],
): Promise<CachedAssessment> {
  const history = unwrap(
    'developments.history',
    await supabase
      .from('developments')
      .select('headline, occurred_at')
      .eq('story_id', dev.story_id)
      .neq('id', dev.id)
      .order('occurred_at', { ascending: false })
      .limit(3)
      .returns<Array<{ headline: string; occurred_at: string }>>(),
  );
  const result = await assessRelevance({
    ambition: {
      title: ambition.title,
      description: ambition.description,
      horizon: ambition.horizon,
      geography: ambition.geography,
    },
    identity: ctx.identity,
    story: { title: dev.stories?.title ?? '', category: dev.stories?.category ?? null, geography: dev.stories?.geography ?? null },
    development: { headline: dev.headline, whatChanged: dev.what_changed, continuity: dev.continuity, occurredAt: dev.occurred_at },
    recentHistory: history.map((h) => ({ occurredAt: h.occurred_at, headline: h.headline })),
    assumptions: assumptions.map((a) => ({ id: a.id, statement: a.statement })),
    interests: ctx.interests,
    language: ctx.reportLanguage,
  });
  const impact = result.assumption_impact;
  const known = assumptions.some((a) => a.id === impact.assumption_id);
  const assumptionImpact: AssumptionImpact | null =
    impact.effect !== 'none' && impact.assumption_id && known && impact.reason.trim()
      ? { assumptionId: impact.assumption_id, effect: impact.effect, reason: impact.reason.trim() }
      : null;
  return {
    ambitionId: ambition.id,
    ambitionUpdatedAt: ambition.updated_at,
    relation: result.relation,
    confidence: result.confidence,
    whyItMatters: result.why_it_matters.trim(),
    couldChange: result.could_change.trim(),
    assumptionImpact,
    assumptionsKey: assumptionsKey(assumptions),
    interestsKey: ctx.interests.join('|'),
    language: ctx.reportLanguage,
  };
}

export async function evaluateDevelopment(ctx: UserRelevanceContext, dev: DevelopmentRecord): Promise<EvaluatedDevelopment> {
  const facts = toFacts(dev);
  const hasSemanticMemory = ctx.memory.some((m) => m.topic && !/^(story|development|source):/.test(m.topic));

  const [similar, ambitionMatches] = await Promise.all([
    hasSemanticMemory && dev.embedding ? retrieveSimilarMemory(ctx.userId, JSON.parse(dev.embedding) as number[], 50) : Promise.resolve([]),
    dev.embedding && ctx.ambitions.size > 0
      ? rpcRows<{ id: string; title: string; priority: number; similarity: number }>('match_ambitions', {
          p_user_id: ctx.userId,
          p_embedding: dev.embedding,
          p_limit: 1,
        })
      : Promise.resolve([]),
  ]);
  const memorySimilarity = new Map(similar.map((m) => [m.id, m.similarity]));
  const matches = ambitionMatches;
  const candidate: AmbitionCandidate | null = matches[0]
    ? { id: matches[0].id, title: matches[0].title, priority: matches[0].priority, similarity: matches[0].similarity }
    : null;
  const ambition = candidate ? (ctx.ambitions.get(candidate.id) ?? null) : null;

  const base = {
    development: facts,
    memory: ctx.memory,
    memorySimilarity,
    trackedStory: ctx.trackedStoryIds.has(dev.story_id),
    ambition: candidate,
    identity: ctx.identity,
    now: new Date(),
  };

  const ambitionAssumptions = ambition ? (ctx.assumptions.get(ambition.id) ?? []) : [];
  let assessment: CachedAssessment | null = null;
  let decision = decideRelevance({ ...base, assessment: null });
  if (decision.needsAmbitionAssessment && ambition) {
    const cached = await loadCachedAssessment(ctx.userId, dev.id);
    // Assessments cached before could_change existed are re-run so the field is filled.
    const usable = cached && cached.ambitionId === ambition.id && cached.ambitionUpdatedAt === ambition.updated_at && typeof cached.couldChange === 'string' && cached.language === ctx.reportLanguage && cached.assumptionsKey === assumptionsKey(ambitionAssumptions) && cached.interestsKey === ctx.interests.join('|');
    assessment = usable ? cached : null;
    if (!assessment) assessment = await runAssessment(ctx, dev, ambition, ambitionAssumptions);
    // Only an assumption recorded before the development happened can be challenged by it.
    const recorded = ambitionAssumptions.find((a) => a.id === assessment?.assumptionImpact?.assumptionId);
    const dated = recorded && new Date(recorded.updated_at).getTime() < new Date(dev.occurred_at).getTime() ? assessment : { ...assessment, assumptionImpact: null };
    decision = decideRelevance({ ...base, assessment: dated });
    if (decision.assumption?.effect === 'challenges') await markChallenged(decision.assumption.assumptionId, dev.id, decision.assumption.reason);
  }

  unwrapVoid(
    'coverage.upsert',
    await supabase.from('world_coverage').upsert(
      {
        user_id: ctx.userId,
        development_id: dev.id,
        world_significance: dev.world_significance,
        significance_reason: dev.significance_reason,
        personal_relevance: decision.personalRelevance,
        relevance_reasons: { version: 1, factors: decision.factors, assessment, suppressedMemoryId: decision.suppressedMemoryId },
        relevance_basis: decision.basis,
        ambition_id: decision.ambitionId,
        suppressed: decision.suppressed,
        suppressed_reason: decision.suppressedReason,
        shown_to_user: decision.show,
        attention: decision.attention,
        must_know: false,
        suppression_allowed: true,
        evaluated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,development_id' },
    ),
  );

  log.debug('development evaluated', {
    userId: ctx.userId,
    developmentId: dev.id,
    show: decision.show,
    basis: decision.basis,
    score: decision.personalRelevance,
  });
  return {
    developmentId: dev.id,
    storyId: dev.story_id,
    decision,
    ambitionTitle: decision.ambitionId ? (ctx.ambitions.get(decision.ambitionId)?.title ?? null) : null,
  };
}

export async function loadDevelopments(filter: { since?: Date; ids?: string[]; storyId?: string; limit?: number }): Promise<DevelopmentRecord[]> {
  let query = supabase.from('developments').select(DEVELOPMENT_SELECT).order('occurred_at', { ascending: false }).limit(filter.limit ?? 100);
  if (filter.since) query = query.gte('occurred_at', filter.since.toISOString());
  if (filter.ids) query = query.in('id', filter.ids);
  if (filter.storyId) query = query.eq('story_id', filter.storyId);
  return unwrap('developments.load', await query.returns<DevelopmentRecord[]>());
}

// Concurrency is small on purpose: each evaluation may call the model and the embedding RPCs.
export async function evaluateMany(
  ctx: UserRelevanceContext,
  devs: DevelopmentRecord[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ evaluated: EvaluatedDevelopment[]; failed: number }> {
  const evaluated: EvaluatedDevelopment[] = [];
  let failed = 0;
  let done = 0;
  const queue = [...devs];
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    for (let dev = queue.shift(); dev; dev = queue.shift()) {
      try {
        evaluated.push(await evaluateDevelopment(ctx, dev));
      } catch (err) {
        failed += 1;
        log.error('development evaluation failed', { userId: ctx.userId, developmentId: dev.id, err });
      }
      done += 1;
      onProgress?.(done, devs.length);
    }
  });
  await Promise.all(workers);
  return { evaluated, failed };
}

export type { DevelopmentRecord };
