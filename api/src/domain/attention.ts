import { Attention, RelevanceBasis } from './types';

// Pure attention rules. No I/O.

export const ATTENTION_THRESHOLDS = {
  challengeConfidence: 0.6,
  knowScore: 0.7,
} as const;

export type AssumptionEffect = 'challenges' | 'supports' | 'none';

export interface AssumptionImpact {
  assumptionId: string;
  effect: AssumptionEffect;
  reason: string;
}

export const ATTENTION_RANK: Record<Attention, number> = { act: 0, know: 1, fyi: 2 };

const KNOW_BASES: readonly RelevanceBasis[] = ['temporary_interest', 'preference', 'tracked'];

/**
 * A challenge counts only when the development is directly linked to the ambition and the model was
 * confident; a weaker challenge would turn every adjacent headline into an alarm.
 */
export function effectiveImpact(
  impact: AssumptionImpact | null | undefined,
  relation: 'direct' | 'indirect' | 'none',
  confidence: number,
): AssumptionImpact | null {
  if (!impact || impact.effect === 'none') return null;
  if (impact.effect === 'challenges' && !(relation === 'direct' && confidence >= ATTENTION_THRESHOLDS.challengeConfidence)) return null;
  return impact;
}

export function decideAttention(input: { basis: RelevanceBasis | null; score: number; impact: AssumptionImpact | null }): Attention {
  if (input.impact?.effect === 'challenges') return 'act';
  if (input.basis && KNOW_BASES.includes(input.basis)) return 'know';
  if (input.basis === 'ambition' && input.score >= ATTENTION_THRESHOLDS.knowScore) return 'know';
  return 'fyi';
}
