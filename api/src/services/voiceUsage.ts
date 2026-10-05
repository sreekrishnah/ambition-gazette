import { env } from '../config/env';
import { errors } from '../lib/errors';
import { supabase, unwrapMaybe } from '../lib/supabase';
import { istDate } from './briefing';

export type VoiceGate = 'ok' | 'sessions' | 'tokens';

export interface VoiceUsage {
  sessionsUsed: number;
  sessionsLimit: number;
  tokensUsed: number;
  tokensLimit: number;
}

/**
 * Counts a voice session against the user's day, atomically in the database so two simultaneous starts
 * cannot both pass. Returns which limit was reached when the session is not allowed.
 */
export async function consumeVoiceSession(userId: string): Promise<VoiceGate> {
  const { data, error } = await supabase.rpc('consume_voice_session', {
    p_user_id: userId,
    p_session_limit: env.VOICE_SESSIONS_PER_DAY,
    p_token_limit: env.VOICE_TOKENS_PER_DAY,
  });
  if (error) throw errors.database('consume_voice_session', error.message);
  return data === 'sessions' || data === 'tokens' ? data : 'ok';
}

/** A session that failed to start does not use up one of the day's sessions. */
export async function refundVoiceSession(userId: string): Promise<void> {
  const { error } = await supabase.rpc('refund_voice_session', { p_user_id: userId });
  if (error) throw errors.database('refund_voice_session', error.message);
}

export async function addVoiceTokens(userId: string, tokens: number): Promise<void> {
  if (tokens <= 0) return;
  const { error } = await supabase.rpc('add_voice_tokens', { p_user_id: userId, p_tokens: Math.round(tokens) });
  if (error) throw errors.database('add_voice_tokens', error.message);
}

export async function getVoiceUsage(userId: string): Promise<VoiceUsage> {
  const row = unwrapMaybe(
    'voice.usage',
    await supabase
      .from('daily_voice_usage')
      .select('sessions, tokens')
      .eq('user_id', userId)
      .eq('usage_date', istDate())
      .maybeSingle<{ sessions: number; tokens: number }>(),
  );
  return {
    sessionsUsed: row?.sessions ?? 0,
    sessionsLimit: env.VOICE_SESSIONS_PER_DAY,
    tokensUsed: Number(row?.tokens ?? 0),
    tokensLimit: env.VOICE_TOKENS_PER_DAY,
  };
}

export function limitMessage(gate: Exclude<VoiceGate, 'ok'>): string {
  return gate === 'sessions'
    ? `You have used your ${env.VOICE_SESSIONS_PER_DAY} voice sessions for today. They reset at midnight IST.`
    : 'You have reached today\'s voice usage limit. It resets at midnight IST.';
}
