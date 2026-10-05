import crypto from 'crypto';
import { z } from 'zod';
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
  status: 'holding' | 'challenged';
  challenged_by_development_id: string | null;
  challenged_at: string | null;
  challenge_reason: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = 'id, ambition_id, statement, status, challenged_by_development_id, challenged_at, challenge_reason, created_at, updated_at';

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

// Editing the statement or restoring "holding" resets the challenge; only later developments can challenge it again.
export async function updateAssumption(userId: string, ambitionId: string, id: string, patch: z.infer<typeof AssumptionPatchSchema>): Promise<AssumptionRow> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString(), status: 'holding', challenged_by_development_id: null, challenged_at: null, challenge_reason: null };
  if (patch.statement !== undefined) update.statement = patch.statement;
  const row = unwrapMaybe(
    'assumptions.update',
    await supabase.from('ambition_assumptions').update(update).eq('id', id).eq('ambition_id', ambitionId).eq('user_id', userId).select(COLUMNS).maybeSingle<AssumptionRow>(),
  );
  if (!row) throw errors.notFound('Assumption');
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

export async function markChallenged(assumptionId: string, developmentId: string, reason: string): Promise<void> {
  unwrapVoid(
    'assumptions.challenge',
    await supabase
      .from('ambition_assumptions')
      .update({ status: 'challenged', challenged_by_development_id: developmentId, challenged_at: new Date().toISOString(), challenge_reason: reason })
      .eq('id', assumptionId)
      .eq('status', 'holding'),
  );
}
