import { createHash } from 'crypto';
import { assessMustKnowEvents } from '../ai/tasks';
import { cleanModelText } from '../ai/guard';
import { THRESHOLDS } from '../domain/relevance';
import { createLogger } from '../lib/logger';
import { supabase, unwrap, unwrapVoid } from '../lib/supabase';
import { DevelopmentRecord, EvaluatedDevelopment, UserRelevanceContext } from './relevance';

const log = createLogger('world-events');

// After the personal pass, a few developments may still be unavoidable for any informed person in the user's
// position. They are shown only with a concrete stated effect on this user, never on importance alone.
const MAX_CANDIDATES = 8;
const MAX_PICKS = 3;
const WORLD_EVENT_SCORE = 0.6;

interface StoredWorldEvent {
  key: string;
  mustKnow: boolean;
  why: string;
  couldChange: string;
}

interface CoverageRow {
  development_id: string;
  relevance_reasons: Record<string, unknown> | null;
}

// The judgement depends on who the user is, so it is reused only while the profile is unchanged.
function profileKey(ctx: UserRelevanceContext): string {
  const parts = [
    ctx.reportLanguage,
    JSON.stringify(ctx.identity),
    ...[...ctx.ambitions.values()].map((a) => `${a.id}:${a.updated_at}`).sort(),
  ];
  return createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);
}

function stored(row: CoverageRow | undefined, key: string): StoredWorldEvent | null {
  const value = row?.relevance_reasons?.worldEvent as StoredWorldEvent | undefined;
  return value && value.key === key ? value : null;
}

export async function pickMustKnowEvents(
  ctx: UserRelevanceContext,
  devs: DevelopmentRecord[],
  evaluated: EvaluatedDevelopment[],
): Promise<EvaluatedDevelopment[]> {
  const handled = new Set(evaluated.filter((e) => e.decision.show || e.decision.suppressed).map((e) => e.developmentId));
  const candidates = devs
    .filter((d) => (d.world_significance ?? 0) >= THRESHOLDS.generalSignificance && !handled.has(d.id))
    .sort((a, b) => (b.world_significance ?? 0) - (a.world_significance ?? 0))
    .slice(0, MAX_CANDIDATES);
  if (candidates.length === 0 || ctx.ambitions.size === 0) return [];

  const key = profileKey(ctx);
  const rows = unwrap(
    'world.coverage',
    await supabase
      .from('world_coverage')
      .select('development_id, relevance_reasons')
      .eq('user_id', ctx.userId)
      .in('development_id', candidates.map((c) => c.id))
      .returns<CoverageRow[]>(),
  );
  const rowById = new Map(rows.map((r) => [r.development_id, r]));
  const results = new Map<string, StoredWorldEvent>();
  const toAsk: DevelopmentRecord[] = [];
  for (const dev of candidates) {
    const cached = stored(rowById.get(dev.id), key);
    if (cached) results.set(dev.id, cached);
    else toAsk.push(dev);
  }

  if (toAsk.length > 0) {
    const verdicts = await assessMustKnowEvents({
      ambitions: [...ctx.ambitions.values()].map((a) => ({ title: a.title, description: a.description, horizon: a.horizon, geography: a.geography })),
      identity: ctx.identity,
      events: toAsk.map((d) => ({ headline: d.headline, whatChanged: d.what_changed, why: d.significance_reason })),
      language: ctx.reportLanguage,
    });
    for (const verdict of verdicts) {
      const dev = toAsk[verdict.index - 1];
      if (!dev) continue;
      const why = cleanModelText(verdict.why_it_matters, 700);
      // A verdict without a concrete explanation is treated as "not must-know".
      results.set(dev.id, { key, mustKnow: verdict.must_know && why.length > 0, why, couldChange: cleanModelText(verdict.could_change, 300) });
    }
    for (const dev of toAsk) if (!results.has(dev.id)) results.set(dev.id, { key, mustKnow: false, why: '', couldChange: '' });
  }

  const picks = candidates
    .filter((d) => results.get(d.id)?.mustKnow)
    .slice(0, MAX_PICKS);
  const pickedIds = new Set(picks.map((d) => d.id));

  // Remember every verdict so the next run does not ask again, and mark the picked ones as shown.
  for (const dev of candidates) {
    const result = results.get(dev.id) as StoredWorldEvent;
    const picked = pickedIds.has(dev.id);
    const previous = rowById.get(dev.id)?.relevance_reasons ?? {};
    unwrapVoid(
      'world.store',
      await supabase
        .from('world_coverage')
        .update({
          relevance_reasons: { ...previous, worldEvent: result },
          shown_to_user: picked,
          relevance_basis: picked ? 'general' : null,
          attention: picked ? 'know' : null,
          personal_relevance: picked ? WORLD_EVENT_SCORE : 0,
          override_triggered: picked,
          override_type: picked ? 'must_know_world_event' : null,
        })
        .eq('user_id', ctx.userId)
        .eq('development_id', dev.id),
    );
  }

  log.info('must-know world events', { userId: ctx.userId, candidates: candidates.length, picked: picks.length });
  return picks.map((dev) => {
    const result = results.get(dev.id) as StoredWorldEvent;
    return {
      developmentId: dev.id,
      storyId: dev.story_id,
      ambitionTitle: null,
      decision: {
        show: true,
        suppressed: false,
        suppressedReason: null,
        suppressedMemoryId: null,
        basis: 'general',
        personalRelevance: WORLD_EVENT_SCORE,
        factors: [{ rule: 7, basis: 'general', effect: 'boost', detail: 'An unavoidable world event with a stated effect on you' }],
        ambitionId: null,
        whyItMatters: result.why,
        couldChange: result.couldChange || null,
        attention: 'know',
        assumption: null,
        needsAmbitionAssessment: false,
      },
    };
  });
}
