export const CONTINUITY = ['new', 'updated', 'confirmed', 'contradicted', 'escalated', 'resolved', 'consequence'] as const;
export type Continuity = (typeof CONTINUITY)[number];

// Mirrors the memory priority ladder: earlier is stronger. 'general' is world importance only.
export const RELEVANCE_BASES = [
  'temporary_interest',
  'preference',
  'ambition',
  'tracked',
  'interest',
  'recent_interest',
  'general',
] as const;
export type RelevanceBasis = (typeof RELEVANCE_BASES)[number];

// act: a stated assumption is challenged. know: explicit interest or a strong ambition link. fyi: everything else shown.
export const ATTENTION = ['act', 'know', 'fyi'] as const;
export type Attention = (typeof ATTENTION)[number];

export const MEMORY_TYPES = [
  'identity',
  'interest',
  'temporary_interest',
  'tracked_entity',
  'suppression',
  'temporary_suppression',
] as const;
export type MemoryType = (typeof MEMORY_TYPES)[number];

export type MemorySource = 'explicit' | 'inferred' | 'onboarding';

export interface MemoryRow {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  topic: string | null;
  content: string;
  strength: number | null;
  confidence: number | null;
  source: MemorySource | null;
  valid_until: string | null;
  status: 'active' | 'archived';
  structured_value: Record<string, unknown> | null;
  priority: number | null;
  created_at: string;
  updated_at: string;
}

export interface AmbitionRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  horizon: string | null;
  geography: string | null;
  status: string;
  priority: number;
  expires_at: string | null;
  created_at: string;
}

export function isContinuity(value: unknown): value is Continuity {
  return typeof value === 'string' && (CONTINUITY as readonly string[]).includes(value);
}

export function isAttention(value: unknown): value is Attention {
  return typeof value === 'string' && (ATTENTION as readonly string[]).includes(value);
}
