import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { errors } from './errors';

// Service role: authorization is enforced in the API layer, never trusted from the client.
export const supabase: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface DbResult<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export function unwrap<T>(operation: string, result: DbResult<T>): T {
  if (result.error) throw errors.database(operation, `${result.error.code ?? ''} ${result.error.message}`.trim());
  if (result.data === null) throw errors.database(operation, 'no data returned');
  return result.data;
}

export function unwrapMaybe<T>(operation: string, result: DbResult<T>): T | null {
  if (result.error) throw errors.database(operation, `${result.error.code ?? ''} ${result.error.message}`.trim());
  return result.data;
}

export function unwrapVoid(operation: string, result: { error: { message: string; code?: string } | null }): void {
  if (result.error) throw errors.database(operation, `${result.error.code ?? ''} ${result.error.message}`.trim());
}

// Calls a Postgres function that returns a set of rows. Row shape is asserted by the caller.
export async function rpcRows<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw errors.database(fn, `${error.code ?? ""} ${error.message}`.trim());
  return (data ?? []) as T[];
}
