// Pure belief-state rules for one assumption. No I/O.

export type SignalEffect = 'challenges' | 'supports' | 'opportunity';

// The state shown to the person: stable (nothing against it), watch (one report against it), reconsider (several).
export type AssumptionState = 'stable' | 'watch' | 'reconsider';

export interface Signal {
  developmentId: string;
  effect: SignalEffect;
  // When the system recorded the signal; compared with the person's last decision, not with the news date.
  recordedAt: string;
  // Distinct publishers that reported the development; one publisher alone is treated as unconfirmed.
  publisherCount: number;
}

export interface BeliefSummary {
  state: AssumptionState;
  threats: number;
  confirmations: number;
  opportunities: number;
}

/** Statuses stored on the assumption row; kept for compatibility with earlier data. */
export type StoredStatus = 'holding' | 'watch' | 'challenged';

const STORED: Record<AssumptionState, StoredStatus> = { stable: 'holding', watch: 'watch', reconsider: 'challenged' };
const STATE_OF: Record<StoredStatus, AssumptionState> = { holding: 'stable', watch: 'watch', challenged: 'reconsider' };

export const storedStatus = (state: AssumptionState): StoredStatus => STORED[state];
export const stateOf = (status: StoredStatus): AssumptionState => STATE_OF[status];

/**
 * Evidence against an assumption only counts after the person last answered it: a decision resets the baseline,
 * so a kept assumption turns back to stable and only newer developments can move it again.
 * Reconsider needs corroboration (two threatening developments, or one reported by two or more publishers);
 * a single uncorroborated report only puts the assumption on watch.
 */
export function deriveBelief(signals: Signal[], decidedAt: string | null): BeliefSummary {
  const baseline = decidedAt ? new Date(decidedAt).getTime() : -Infinity;
  const live = signals.filter((s) => new Date(s.recordedAt).getTime() > baseline);
  const threats = live.filter((s) => s.effect === 'challenges');
  const corroborated = threats.length >= 2 || threats.some((s) => s.publisherCount >= 2);
  const state: AssumptionState = threats.length === 0 ? 'stable' : corroborated ? 'reconsider' : 'watch';
  return {
    state,
    threats: threats.length,
    confirmations: live.filter((s) => s.effect === 'supports').length,
    opportunities: live.filter((s) => s.effect === 'opportunity').length,
  };
}
