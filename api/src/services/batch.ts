import { createLogger } from '../lib/logger';
import { supabase, unwrap, unwrapVoid } from '../lib/supabase';
import { runPipeline } from './pipeline';
import { batchSlot } from './schedule';

const log = createLogger('batch');

/**
 * Scheduled run for every user with an active ambition. News is fetched once for all of them.
 * The unique scheduled_for slot prevents two instances from running the same day twice.
 */
export async function runDailyBatch(): Promise<void> {
  // One slot per India day, at 06:00 IST.
  const slot = batchSlot();

  const claim = await supabase
    .from('batch_runs')
    .insert({ scheduled_for: slot.toISOString(), status: 'STARTED', started_at: new Date().toISOString() })
    .select('id')
    .single<{ id: string }>();
  if (claim.error || !claim.data) {
    log.info('batch slot already claimed or unavailable', { slot: slot.toISOString(), err: claim.error ?? undefined });
    return;
  }

  try {
    const users = unwrap(
      'batch.users',
      await supabase.from('ambitions').select('user_id').eq('status', 'active').returns<Array<{ user_id: string }>>(),
    );
    const everyone = [...new Set(users.map((u) => u.user_id))];
    // The scheduled run counts as one of each user's two refreshes for the day; a user who has used both is skipped.
    const userIds: string[] = [];
    for (const userId of everyone) {
      const allowed = await supabase.rpc('consume_daily_run', { p_user_id: userId });
      if (allowed.data === true) userIds.push(userId);
      else log.info('scheduled run skipped, the daily refreshes are used', { userId });
    }
    if (userIds.length > 0) await runPipeline(userIds);
    unwrapVoid(
      'batch.complete',
      await supabase
        .from('batch_runs')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString(), users_processed: userIds.length, users_total: userIds.length })
        .eq('id', claim.data.id),
    );
    log.info('batch completed', { users: userIds.length });
  } catch (err) {
    log.error('batch failed', { err });
    await supabase.from('batch_runs').update({ status: 'FAILED', completed_at: new Date().toISOString() }).eq('id', claim.data.id);
  }
}
