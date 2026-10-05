// Rebuilds embeddings and search concepts for existing ambitions with the current embedding model.
// Needed once because earlier vectors came from a failed model call and cannot be trusted.
import '../src/config/env';
import { AmbitionRow } from '../src/domain/types';
import { supabase, unwrap } from '../src/lib/supabase';
import { refreshAmbitionIndex } from '../src/services/ambitions';

async function main(): Promise<void> {
  const ambitions = unwrap(
    'ambitions.all',
    await supabase
      .from('ambitions')
      .select('id, user_id, title, description, horizon, geography, status, priority, expires_at, created_at')
      .neq('status', 'archived')
      .returns<AmbitionRow[]>(),
  );
  let failed = 0;
  for (const ambition of ambitions) {
    try {
      await refreshAmbitionIndex(ambition);
      console.log(`reindexed ${ambition.id} "${ambition.title}"`);
    } catch (err) {
      failed += 1;
      console.error(`failed ${ambition.id}:`, err instanceof Error ? err.message : err);
    }
  }
  console.log(`done: ${ambitions.length - failed}/${ambitions.length} reindexed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
