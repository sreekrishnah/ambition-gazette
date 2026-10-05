import { Attention, RelevanceBasis } from './types';

// Pure grouping of the per-user evaluation ledger into the "lens": what the world is talking about
// versus what matters to this user, and what was set aside and why. No I/O.

export const LENS_THRESHOLDS = {
  bigInWorld: 0.6,
  weakPersonal: 0.5,
  quietWorld: 0.4,
  strongPersonal: 0.6,
  maxPerList: 3,
  maxHidden: 5,
} as const;

// Bases that come from something the user said or did, as opposed to an ambition match or world importance.
const MEMORY_BASES: readonly RelevanceBasis[] = ['temporary_interest', 'preference', 'interest', 'recent_interest'];

export interface CoverageEntry {
  developmentId: string;
  storyId: string;
  storyTitle: string;
  headline: string;
  occurredAt: string;
  worldSignificance: number | null;
  personalRelevance: number;
  shown: boolean;
  suppressed: boolean;
  suppressedReason: string | null;
  suppressedMemoryId: string | null;
  basis: RelevanceBasis | null;
  attention: Attention | null;
}

export interface FeedbackEntry {
  id: string;
  createdAt: string;
  feedbackType: string;
  storyTitle: string | null;
  reason: string | null;
}

export interface LensItem {
  developmentId: string;
  storyId: string;
  headline: string;
  storyTitle: string;
  worldSignificance: number | null;
  personalRelevance: number;
}

export interface HiddenItem {
  developmentId: string;
  storyId: string;
  headline: string;
  storyTitle: string;
  reason: string;
  // Null for rows evaluated before the memory id was stored; those cannot be reversed from the dashboard.
  memoryId: string | null;
}

export interface LearningEvent {
  id: string;
  createdAt: string;
  storyTitle: string | null;
  effect: string;
  reason: string | null;
}

export interface MovedUpItem {
  developmentId: string;
  headline: string;
  basis: RelevanceBasis;
}

// Each stage is a count of developments, so the user can see how much was filtered before the briefing.
export interface Funnel {
  checked: number;
  shown: number;
  important: number;
  needsAttention: number;
}

export interface Lens {
  checked: number;
  setAside: number;
  funnel: Funnel;
  bigInWorld: LensItem[];
  quietButYours: LensItem[];
  hidden: HiddenItem[];
  learning: { events: LearningEvent[]; movedUp: MovedUpItem[] };
}

// Wording mirrors what applyFeedback actually stores, so the strip never claims an effect that did not happen.
const FEEDBACK_EFFECTS: Record<string, string> = {
  not_relevant: 'Story hidden',
  already_know: 'This update hidden',
  too_much: 'Story paused for 7 days',
  not_interested_temporarily: 'Story paused',
  less_like_this: 'Similar stories reduced for 30 days',
  more_like_this: 'Interest added, similar stories rank higher',
  relevant: 'Interest added, similar stories rank higher',
  source_not_trusted: 'Source hidden',
  track: 'Story tracked',
  untrack: 'Story untracked',
};

export function feedbackEffect(feedbackType: string): string | null {
  return FEEDBACK_EFFECTS[feedbackType] ?? null;
}

// One entry per story: the most recent development, so a story with many updates appears once.
function latestPerStory(entries: CoverageEntry[]): CoverageEntry[] {
  const latest = new Map<string, CoverageEntry>();
  for (const entry of entries) {
    const current = latest.get(entry.storyId);
    if (!current || new Date(entry.occurredAt).getTime() > new Date(current.occurredAt).getTime()) {
      latest.set(entry.storyId, entry);
    }
  }
  return [...latest.values()];
}

function toLensItem(e: CoverageEntry): LensItem {
  return {
    developmentId: e.developmentId,
    storyId: e.storyId,
    headline: e.headline,
    storyTitle: e.storyTitle,
    worldSignificance: e.worldSignificance,
    personalRelevance: e.personalRelevance,
  };
}

export function buildLens(coverage: CoverageEntry[], feedback: FeedbackEntry[]): Lens {
  const visible = coverage.filter((c) => !c.suppressed);

  const bigInWorld = latestPerStory(
    visible.filter(
      (c) =>
        (c.worldSignificance ?? 0) >= LENS_THRESHOLDS.bigInWorld && c.personalRelevance < LENS_THRESHOLDS.weakPersonal,
    ),
  )
    .sort((a, b) => (b.worldSignificance ?? 0) - (a.worldSignificance ?? 0))
    .slice(0, LENS_THRESHOLDS.maxPerList)
    .map(toLensItem);

  const quietButYours = latestPerStory(
    visible.filter(
      (c) =>
        c.shown &&
        c.worldSignificance !== null &&
        c.worldSignificance < LENS_THRESHOLDS.quietWorld &&
        c.personalRelevance >= LENS_THRESHOLDS.strongPersonal,
    ),
  )
    .sort((a, b) => b.personalRelevance - a.personalRelevance)
    .slice(0, LENS_THRESHOLDS.maxPerList)
    .map(toLensItem);

  const hidden = latestPerStory(coverage.filter((c) => c.suppressed && c.suppressedReason))
    .slice(0, LENS_THRESHOLDS.maxHidden)
    .map((c) => ({
      developmentId: c.developmentId,
      storyId: c.storyId,
      headline: c.headline,
      storyTitle: c.storyTitle,
      reason: c.suppressedReason ?? '',
      memoryId: c.suppressedMemoryId,
    }));

  // Repeating the same feedback on a story adds nothing new to show; keep the most recent one.
  const seenEvents = new Set<string>();
  const events = feedback.flatMap((f): LearningEvent[] => {
    const effect = feedbackEffect(f.feedbackType);
    const key = `${f.storyTitle ?? ''}|${effect ?? ''}`;
    if (!effect || seenEvents.has(key)) return [];
    seenEvents.add(key);
    return [{ id: f.id, createdAt: f.createdAt, storyTitle: f.storyTitle, effect, reason: f.reason }];
  });

  const movedUp = latestPerStory(coverage.filter((c) => c.shown && c.basis !== null && MEMORY_BASES.includes(c.basis)))
    .slice(0, LENS_THRESHOLDS.maxPerList)
    .flatMap((c): MovedUpItem[] => (c.basis ? [{ developmentId: c.developmentId, headline: c.headline, basis: c.basis }] : []));

  const shownEntries = coverage.filter((c) => c.shown);
  return {
    checked: coverage.length,
    setAside: coverage.filter((c) => !c.shown).length,
    funnel: {
      checked: coverage.length,
      shown: shownEntries.length,
      important: shownEntries.filter((c) => c.attention === 'act' || c.attention === 'know').length,
      needsAttention: shownEntries.filter((c) => c.attention === 'act').length,
    },
    bigInWorld,
    quietButYours,
    hidden,
    learning: { events: events.slice(0, 5), movedUp },
  };
}
