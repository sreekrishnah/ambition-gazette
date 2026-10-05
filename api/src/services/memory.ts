import { MemoryRow, MemorySource, MemoryType } from '../domain/types';
import { embedText } from '../lib/gemini';
import { createLogger } from '../lib/logger';
import { rpcRows, supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';
import { errors } from '../lib/errors';

const log = createLogger('memory');

// Topics with these prefixes are matched by exact id/domain, so they carry no embedding.
const EXACT_PREFIXES = ['story:', 'development:', 'source:'] as const;

export function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isExactTopic(topic: string): boolean {
  return EXACT_PREFIXES.some((p) => topic.startsWith(p));
}

export interface RememberInput {
  userId: string;
  type: MemoryType;
  topic: string;
  content?: string;
  strength?: number;
  confidence?: number;
  source: MemorySource;
  validUntil?: Date | null;
  structured?: Record<string, unknown>;
  priority?: number;
  // Pass when the caller already embedded the topic (batch onboarding) to avoid extra calls.
  embedding?: number[];
}

function eventRow(userId: string, memoryId: string, eventType: string, oldValue: string | null, newValue: string | null, source: string) {
  return { user_id: userId, memory_id: memoryId, event_type: eventType, old_value: oldValue, new_value: newValue, source };
}

/**
 * Creates or updates the single active memory for (user, type, topic). Semantic topics are embedded;
 * if embedding fails nothing is written.
 */
export async function remember(input: RememberInput): Promise<MemoryRow> {
  const topic = input.type === 'identity' ? input.topic.trim().toLowerCase() : normalizeTopic(input.topic);
  const content = input.content?.trim() || topic;
  const existing = unwrapMaybe(
    'memory.find',
    await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', input.userId)
      .eq('memory_type', input.type)
      .eq('topic', topic)
      .eq('status', 'active')
      .maybeSingle<MemoryRow>(),
  );

  const needsEmbedding = !isExactTopic(topic) && input.type !== 'identity';
  const embedding = needsEmbedding ? (input.embedding ?? (await embedText(topic, 'query'))) : undefined;
  const fields = {
    content,
    strength: input.strength ?? null,
    confidence: input.confidence ?? null,
    source: input.source,
    valid_until: input.validUntil ? input.validUntil.toISOString() : null,
    structured_value: input.structured ?? null,
    priority: input.priority ?? null,
    updated_at: new Date().toISOString(),
    ...(embedding ? { embedding } : {}),
  };

  if (existing) {
    const row = unwrap(
      'memory.update',
      await supabase.from('user_memory').update(fields).eq('id', existing.id).eq('user_id', input.userId).select('*').single<MemoryRow>(),
    );
    unwrapVoid('memory.event', await supabase.from('memory_events').insert(eventRow(input.userId, row.id, 'UPDATE', existing.content, content, input.source)));
    log.info('memory updated', { userId: input.userId, type: input.type, topic });
    return row;
  }

  const row = unwrap(
    'memory.insert',
    await supabase
      .from('user_memory')
      .insert({ user_id: input.userId, memory_type: input.type, topic, status: 'active', ...fields })
      .select('*')
      .single<MemoryRow>(),
  );
  unwrapVoid('memory.event', await supabase.from('memory_events').insert(eventRow(input.userId, row.id, 'CREATE', null, content, input.source)));
  log.info('memory created', { userId: input.userId, type: input.type, topic });
  return row;
}

function isLive(row: MemoryRow, now = new Date()): boolean {
  return row.status === 'active' && (!row.valid_until || new Date(row.valid_until) > now);
}

export async function listMemory(userId: string, types?: MemoryType[]): Promise<MemoryRow[]> {
  let query = supabase.from('user_memory').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (types && types.length > 0) query = query.in('memory_type', types);
  const rows = unwrap('memory.list', await query.returns<MemoryRow[]>());
  return rows;
}

// Active, unexpired memory. A single user's memory is small, so it is loaded whole for rule evaluation.
export async function getActiveMemory(userId: string): Promise<MemoryRow[]> {
  const rows = await listMemory(userId);
  const now = new Date();
  return rows.filter((r) => isLive(r, now));
}

export interface MemoryMatch extends MemoryRow {
  similarity: number;
}

export async function retrieveSimilarMemory(userId: string, embedding: number[], limit = 10): Promise<MemoryMatch[]> {
  return rpcRows<MemoryMatch>('match_memory', { p_user_id: userId, p_embedding: embedding, p_limit: limit });
}

export async function getIdentity(userId: string): Promise<Record<string, string>> {
  const rows = (await getActiveMemory(userId)).filter((r) => r.memory_type === 'identity');
  const identity: Record<string, string> = {};
  for (const row of rows) if (row.topic) identity[row.topic] = row.content;
  return identity;
}

export async function setMemoryStatus(userId: string, id: string, status: 'active' | 'archived'): Promise<MemoryRow> {
  const row = unwrapMaybe(
    'memory.setStatus',
    await supabase
      .from('user_memory')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle<MemoryRow>(),
  );
  if (!row) throw errors.notFound('Memory item');
  unwrapVoid('memory.event', await supabase.from('memory_events').insert(eventRow(userId, row.id, status === 'active' ? 'RESTORE' : 'ARCHIVE', null, null, 'explicit')));
  return row;
}

export async function deleteMemory(userId: string, id: string): Promise<void> {
  const row = unwrapMaybe(
    'memory.delete',
    await supabase.from('user_memory').delete().eq('id', id).eq('user_id', userId).select('id').maybeSingle<{ id: string }>(),
  );
  if (!row) throw errors.notFound('Memory item');
}

// Marks expired temporary memory as archived so listings stay accurate.
export async function archiveExpiredMemory(): Promise<number> {
  const rows = unwrap(
    'memory.expire',
    await supabase
      .from('user_memory')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('status', 'active')
      .lt('valid_until', new Date().toISOString())
      .select('id')
      .returns<Array<{ id: string }>>(),
  );
  return rows.length;
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
