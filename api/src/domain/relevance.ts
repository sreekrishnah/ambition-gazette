import { AssumptionImpact, decideAttention, effectiveImpact } from './attention';
import { Attention, MemoryRow, RelevanceBasis } from './types';

// Pure relevance rules. No I/O: callers supply retrieved memory, similarities and the (optional)
// model assessment, which keeps the priority ladder deterministic and unit-testable.
//
// An item is shown only on grounds that can be explained to the user:
//  - the model found a specific link to an active ambition (rule 3), or
//  - the user tracks the story (rule 4).
// What the user said they follow (rules 1 and 2) makes an item eligible for that assessment and ranks it a little
// higher, but is never a reason to show an item by itself. Inferred interests are ignored here, and general world
// importance is handled by the separate must-know pass, which also has to explain itself.
// An explicit rejection at rule 1 or 2 always overrides any boost at an equal or lower rank.

export const THRESHOLDS = {
  // Query-vs-document cosine on this embedding model: related >= 0.62, unrelated <= 0.51. A stated interest is a
  // short phrase, so it must clear a higher bar than that to count as a match.
  memoryMatch: 0.68,
  ambitionCandidate: 0.55,
  ambitionConfidenceMin: 0.5,
  // A development at or above this world significance is considered by the must-know pass.
  generalSignificance: 0.75,
  minSubstringLength: 4,
} as const;

export interface DevelopmentFacts {
  developmentId: string;
  storyId: string;
  storyTitle: string;
  geography: string | null;
  entities: string[];
  text: string;
  worldSignificance: number;
  occurredAt: string;
  publishers: string[];
}

export interface AmbitionCandidate {
  id: string;
  title: string;
  priority: number;
  similarity: number;
}

export interface AmbitionAssessment {
  relation: 'direct' | 'indirect' | 'none';
  confidence: number;
  whyItMatters: string;
  couldChange: string;
  assumptionImpact?: AssumptionImpact | null;
}

export interface RelevanceInput {
  development: DevelopmentFacts;
  memory: MemoryRow[];
  memorySimilarity: Map<string, number>;
  trackedStory: boolean;
  ambition: AmbitionCandidate | null;
  assessment: AmbitionAssessment | null;
  identity: Record<string, string>;
  now: Date;
}

export interface Factor {
  rule: number;
  basis: RelevanceBasis;
  effect: 'boost' | 'suppress';
  detail: string;
}

export interface RelevanceDecision {
  show: boolean;
  suppressed: boolean;
  suppressedReason: string | null;
  // The memory row that caused the suppression, so the user can reverse it.
  suppressedMemoryId: string | null;
  basis: RelevanceBasis | null;
  personalRelevance: number;
  factors: Factor[];
  ambitionId: string | null;
  whyItMatters: string | null;
  // Hedged consequence for the linked ambition; null unless an ambition link was established.
  couldChange: string | null;
  attention: Attention | null;
  // Set only when the development bears on one of the user's stated assumptions for the linked ambition.
  assumption: AssumptionImpact | null;
  // True when rule 3 could decide the outcome but no model assessment was supplied yet.
  needsAmbitionAssessment: boolean;
}

const BASIS_BY_RULE: Record<number, RelevanceBasis> = {
  1: 'temporary_interest',
  2: 'preference',
  3: 'ambition',
  4: 'tracked',
  5: 'interest',
  6: 'recent_interest',
  7: 'general',
};

function includesTopic(haystack: string, topic: string): boolean {
  return topic.length >= THRESHOLDS.minSubstringLength && haystack.includes(topic);
}

function memoryMatches(row: MemoryRow, dev: DevelopmentFacts, similarity: Map<string, number>): boolean {
  const topic = row.topic ?? '';
  if (topic.startsWith('story:')) return topic === `story:${dev.storyId}`;
  if (topic.startsWith('development:')) return topic === `development:${dev.developmentId}`;
  if (topic.startsWith('source:')) {
    const domain = topic.slice('source:'.length);
    return dev.publishers.length > 0 && dev.publishers.every((p) => p.toLowerCase() === domain);
  }
  const haystack = `${dev.storyTitle} ${dev.text} ${dev.entities.join(' ')}`.toLowerCase();
  if (includesTopic(haystack, topic)) return true;
  return (similarity.get(row.id) ?? 0) >= THRESHOLDS.memoryMatch;
}

function ruleFor(row: MemoryRow): { rule: number; effect: 'boost' | 'suppress' } | null {
  switch (row.memory_type) {
    case 'temporary_suppression':
      return { rule: 1, effect: 'suppress' };
    case 'temporary_interest':
      return { rule: 1, effect: 'boost' };
    case 'suppression':
      return { rule: 2, effect: 'suppress' };
    case 'interest':
      // A guess made from a question the user once asked is not something they asked to follow.
      if (row.source === 'inferred') return null;
      return { rule: 2, effect: 'boost' };
    case 'tracked_entity':
      return { rule: 4, effect: 'boost' };
    default:
      return null;
  }
}

function recencyFactor(occurredAt: string, now: Date): number {
  const ageDays = (now.getTime() - new Date(occurredAt).getTime()) / 86_400_000;
  if (ageDays < 2) return 1;
  if (ageDays < 7) return 0.92;
  if (ageDays < 30) return 0.8;
  return 0.65;
}

function priorityWeight(priority: number): number {
  return priority === 1 ? 1 : priority === 2 ? 0.92 : 0.84;
}

function describe(row: MemoryRow): string {
  const topic = row.topic ?? row.content;
  if (topic.startsWith('story:') || topic.startsWith('development:')) return 'a story or update you marked';
  if (topic.startsWith('source:')) return `the source ${topic.slice(7)}`;
  return `"${topic}"`;
}

function location(identity: Record<string, string>, dev: DevelopmentFacts): boolean {
  const place = identity.location?.toLowerCase();
  const geo = dev.geography?.toLowerCase();
  if (!place || !geo) return false;
  return place.includes(geo) || geo.includes(place);
}

export function decideRelevance(input: RelevanceInput): RelevanceDecision {
  const { development: dev, memory, memorySimilarity, trackedStory, ambition, assessment, identity, now } = input;

  const factors: Factor[] = [];
  let suppressRule: number | null = null;
  let suppressedReason: string | null = null;
  let suppressedMemoryId: string | null = null;
  // The strongest thing the user explicitly said they follow that matches this development.
  let followed: { rule: number; detail: string } | null = null;

  for (const row of memory) {
    const mapped = ruleFor(row);
    if (!mapped || !memoryMatches(row, dev, memorySimilarity)) continue;
    const basis = BASIS_BY_RULE[mapped.rule];
    const detail =
      mapped.effect === 'suppress' ? `You asked to stop seeing ${describe(row)}` : `You asked to follow ${describe(row)}`;
    factors.push({ rule: mapped.rule, basis, effect: mapped.effect, detail });

    if (mapped.effect === 'suppress') {
      if (suppressRule === null || mapped.rule < suppressRule) {
        suppressRule = mapped.rule;
        suppressedReason = detail;
        suppressedMemoryId = row.id;
      }
      continue;
    }
    if (mapped.rule === 4) continue; // a tracked entity is handled with tracked stories below
    if (followed === null || mapped.rule < followed.rule) followed = { rule: mapped.rule, detail };
  }

  // An explicit rejection beats an explicit follow of equal or lower rank (ties go to the rejection).
  if (suppressRule !== null && (followed === null || suppressRule <= followed.rule)) {
    return {
      show: false,
      suppressed: true,
      suppressedReason,
      suppressedMemoryId,
      basis: null,
      personalRelevance: 0,
      factors,
      ambitionId: null,
      whyItMatters: null,
      couldChange: null,
      attention: null,
      assumption: null,
      needsAmbitionAssessment: false,
    };
  }

  if (trackedStory) factors.push({ rule: 4, basis: 'tracked', effect: 'boost', detail: 'You are tracking this story' });

  // The model is asked once whenever something could justify showing the item: a plausible ambition match, an
  // interest the user stated, or a tracked story.
  const ambitionPlausible = ambition !== null && ambition.similarity >= THRESHOLDS.ambitionCandidate;
  const eligible = ambitionPlausible || followed !== null || trackedStory;
  let needsAmbitionAssessment = false;
  let ambitionId: string | null = null;
  let ambitionWhy: string | null = null;
  let couldChange: string | null = null;
  let assumption: AssumptionImpact | null = null;
  let linkScore: number | null = null;

  if (eligible && ambition) {
    if (!assessment) {
      needsAmbitionAssessment = true;
    } else if (
      assessment.relation !== 'none' &&
      assessment.confidence >= THRESHOLDS.ambitionConfidenceMin &&
      assessment.whyItMatters.trim().length > 0
    ) {
      linkScore = 0.5 + 0.4 * assessment.confidence * priorityWeight(ambition.priority) + (followed ? 0.05 : 0);
      factors.push({
        rule: 3,
        basis: 'ambition',
        effect: 'boost',
        detail: `Linked to your ambition "${ambition.title}" (${assessment.relation})`,
      });
      ambitionId = ambition.id;
      ambitionWhy = assessment.whyItMatters.trim();
      couldChange = assessment.couldChange.trim() || null;
      assumption = effectiveImpact(assessment.assumptionImpact, assessment.relation, assessment.confidence);
    }
  }

  const grounds: Array<{ rule: number; score: number; why: string }> = [];
  if (linkScore !== null && ambitionWhy) grounds.push({ rule: followed ? followed.rule : 3, score: linkScore, why: ambitionWhy });
  if (trackedStory) grounds.push({ rule: 4, score: 0.8, why: ambitionWhy ?? 'You are tracking this story, and this is its latest development.' });

  if (grounds.length === 0) {
    return {
      show: false,
      suppressed: false,
      suppressedReason: null,
      suppressedMemoryId: null,
      basis: null,
      personalRelevance: 0,
      factors,
      ambitionId: null,
      whyItMatters: null,
      couldChange: null,
      attention: null,
      assumption: null,
      needsAmbitionAssessment,
    };
  }

  const top = grounds.reduce((a, b) => (b.rule < a.rule || (b.rule === a.rule && b.score > a.score) ? b : a));
  let score = Math.max(...grounds.map((g) => g.score));
  if (location(identity, dev)) {
    factors.push({ rule: 0, basis: 'general', effect: 'boost', detail: 'Matches your location' });
    score += 0.04;
  }
  score = Math.min(1, score * recencyFactor(dev.occurredAt, now));
  const basis = BASIS_BY_RULE[top.rule];

  return {
    show: true,
    suppressed: false,
    suppressedReason: null,
    suppressedMemoryId: null,
    basis,
    personalRelevance: Number(score.toFixed(3)),
    factors,
    ambitionId,
    // Always the model's reasoning about this user's goals; the only fallback is the plain fact that a story is tracked.
    whyItMatters: top.why,
    couldChange,
    attention: decideAttention({ basis, score, impact: assumption }),
    assumption,
    needsAmbitionAssessment,
  };
}
