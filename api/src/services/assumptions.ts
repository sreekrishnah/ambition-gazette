import crypto from 'crypto';
import { z } from 'zod';
import { Signal, SignalEffect, StoredStatus, deriveBelief, storedStatus } from '../domain/beliefs';
import { errors } from '../lib/errors';
import { supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';

export const MAX_ASSUMPTIONS_PER_AMBITION = 8;

export const AssumptionCreateSchema = z.object({ statement: z.string().trim().min(5).max(300) });
export const AssumptionPatchSchema = z
  .object({ statement: z.string().trim().min(5).max(300), status: z.literal('holding') })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export interface AssumptionRow {
  id: string;
  ambition_id: string;
  statement: string;
  status: StoredStatus;
  challenged_by_development_id: string | null;
  challenged_at: string | null;
  challenge_reason: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = 'id, ambition_id, statement, status, challenged_by_development_id, challenged_at, challenge_reason, decided_at, created_at, updated_at';

export async function listAssumptions(userId: string, ambitionId?: string): Promise<AssumptionRow[]> {
  let query = supabase.from('ambition_assumptions').select(COLUMNS).eq('user_id', userId).order('created_at', { ascending: true });
  if (ambitionId) query = query.eq('ambition_id', ambitionId);
  return unwrap('assumptions.list', await query.returns<AssumptionRow[]>());
}

async function assertOwnsAmbition(userId: string, ambitionId: string): Promise<void> {
  const row = unwrapMaybe(
    'assumptions.ambition',
    await supabase.from('ambitions').select('id').eq('id', ambitionId).eq('user_id', userId).maybeSingle<{ id: string }>(),
  );
  if (!row) throw errors.notFound('Ambition');
}

export async function createAssumption(userId: string, ambitionId: string, statement: string): Promise<AssumptionRow> {
  await assertOwnsAmbition(userId, ambitionId);
  const existing = await listAssumptions(userId, ambitionId);
  if (existing.length >= MAX_ASSUMPTIONS_PER_AMBITION) throw errors.validation(`At most ${MAX_ASSUMPTIONS_PER_AMBITION} assumptions per ambition.`);
  return unwrap(
    'assumptions.insert',
    await supabase.from('ambition_assumptions').insert({ ambition_id: ambitionId, user_id: userId, statement }).select(COLUMNS).single<AssumptionRow>(),
  );
}

// Editing the statement makes it a new belief: earlier evidence is dropped and only later developments can test it.
// Restoring "holding" is the same as keeping the assumption.
export async function updateAssumption(userId: string, ambitionId: string, id: string, patch: z.infer<typeof AssumptionPatchSchema>): Promise<AssumptionRow> {
  if (patch.statement === undefined) return decideAssumption(userId, ambitionId, id, 'keep');
  const update = { statement: patch.statement, updated_at: new Date().toISOString(), status: 'holding', challenged_by_development_id: null, challenged_at: null, challenge_reason: null, decided_at: null };
  const row = unwrapMaybe(
    'assumptions.update',
    await supabase.from('ambition_assumptions').update(update).eq('id', id).eq('ambition_id', ambitionId).eq('user_id', userId).select(COLUMNS).maybeSingle<AssumptionRow>(),
  );
  if (!row) throw errors.notFound('Assumption');
  unwrapVoid('assumptions.signals.clear', await supabase.from('assumption_signals').delete().eq('assumption_id', id));
  return row;
}

export async function deleteAssumption(userId: string, ambitionId: string, id: string): Promise<void> {
  unwrapVoid('assumptions.delete', await supabase.from('ambition_assumptions').delete().eq('id', id).eq('ambition_id', ambitionId).eq('user_id', userId));
}

/** Changes whenever the set or wording of assumptions changes, so cached assessments are redone. */
export function assumptionsKey(assumptions: Array<{ id: string; statement: string }>): string {
  const text = assumptions.map((a) => `${a.id}:${a.statement}`).sort().join('|');
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 12);
}

export type Decision = 'keep' | 'dismiss' | 'change_plan';
export const DecisionSchema = z.object({ decision: z.enum(['keep', 'dismiss', 'change_plan']) });

export interface SignalInput {
  developmentId: string;
  effect: SignalEffect;
  reason: string;
  reconsider: string | null;
  confidence: number;
  publisherCount: number;
  occurredAt: string;
}

interface SignalRow {
  development_id: string;
  effect: SignalEffect;
  reason: string;
  confidence: number;
  publisher_count: number;
  occurred_at: string;
  created_at: string;
}

export function toSignal(row: Pick<SignalRow, 'development_id' | 'effect' | 'publisher_count' | 'created_at'>): Signal {
  return { developmentId: row.development_id, effect: row.effect, recordedAt: row.created_at, publisherCount: row.publisher_count };
}

/** Re-derives the stored state from the evidence; the latest live threat is kept as the reason shown to the person. */
export async function recomputeAssumption(assumptionId: string): Promise<void> {
  const assumption = unwrapMaybe(
    'assumptions.recompute.load',
    await supabase.from('ambition_assumptions').select('decided_at').eq('id', assumptionId).maybeSingle<{ decided_at: string | null }>(),
  );
  if (!assumption) return;
  const rows = unwrap(
    'assumptions.recompute.signals',
    await supabase
      .from('assumption_signals')
      .select('development_id, effect, reason, confidence, publisher_count, occurred_at, created_at')
      .eq('assumption_id', assumptionId)
      .order('occurred_at', { ascending: false })
      .returns<SignalRow[]>(),
  );
  const belief = deriveBelief(rows.map(toSignal), assumption.decided_at);
  const baseline = assumption.decided_at ? new Date(assumption.decided_at).getTime() : -Infinity;
  const latestThreat = rows.find((r) => r.effect === 'challenges' && new Date(r.created_at).getTime() > baseline);
  unwrapVoid(
    'assumptions.recompute.update',
    await supabase
      .from('ambition_assumptions')
      .update(
        belief.state === 'stable' || !latestThreat
          ? { status: storedStatus(belief.state), challenged_by_development_id: null, challenged_at: null, challenge_reason: null }
          : { status: storedStatus(belief.state), challenged_by_development_id: latestThreat.development_id, challenged_at: latestThreat.created_at, challenge_reason: latestThreat.reason },
      )
      .eq('id', assumptionId),
  );
}

/** Stores one development's effect on one assumption. Re-evaluating the same development never adds a second row. */
export async function recordSignal(userId: string, assumptionId: string, input: SignalInput): Promise<void> {
  unwrapVoid(
    'assumptions.signal.upsert',
    await supabase.from('assumption_signals').upsert(
      {
        assumption_id: assumptionId,
        user_id: userId,
        development_id: input.developmentId,
        effect: input.effect,
        reason: input.reason,
        reconsider: input.reconsider,
        confidence: input.confidence,
        publisher_count: input.publisherCount,
        occurred_at: input.occurredAt,
      },
      { onConflict: 'assumption_id,development_id' },
    ),
  );
  await recomputeAssumption(assumptionId);
}

/** The person's answer to the evidence: it is kept as history and resets which evidence still counts. */
export async function decideAssumption(userId: string, ambitionId: string, id: string, decision: Decision): Promise<AssumptionRow> {
  const owned = unwrapMaybe(
    'assumptions.decide.owned',
    await supabase.from('ambition_assumptions').select('id').eq('id', id).eq('ambition_id', ambitionId).eq('user_id', userId).maybeSingle<{ id: string }>(),
  );
  if (!owned) throw errors.notFound('Assumption');
  unwrapVoid('assumptions.decision.insert', await supabase.from('assumption_decisions').insert({ assumption_id: id, user_id: userId, decision }));
  unwrapVoid('assumptions.decide.update', await supabase.from('ambition_assumptions').update({ decided_at: new Date().toISOString() }).eq('id', id));
  await recomputeAssumption(id);
  return unwrap('assumptions.decide.reload', await supabase.from('ambition_assumptions').select(COLUMNS).eq('id', id).single<AssumptionRow>());
}

/** A development that no longer tests any assumption (after a stricter or newer judgement) stops counting as evidence. */
export async function retractSignals(userId: string, developmentId: string): Promise<void> {
  const rows = unwrap(
    'assumptions.retract.find',
    await supabase.from('assumption_signals').select('assumption_id').eq('user_id', userId).eq('development_id', developmentId).returns<Array<{ assumption_id: string }>>(),
  );
  if (rows.length === 0) return;
  unwrapVoid('assumptions.retract.delete', await supabase.from('assumption_signals').delete().eq('user_id', userId).eq('development_id', developmentId));
  for (const row of rows) await recomputeAssumption(row.assumption_id);
}

/** Evaluations run in parallel, so the stored states are re-derived once more when a build finishes. */
export async function recomputeUserAssumptions(userId: string): Promise<void> {
  const rows = unwrap('assumptions.recompute.ids', await supabase.from('ambition_assumptions').select('id').eq('user_id', userId).returns<Array<{ id: string }>>());
  for (const row of rows) await recomputeAssumption(row.id);
}
