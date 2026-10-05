import { z } from 'zod';
import { AmbitionProfile, extractAmbitionProfile } from '../ai/tasks';
import { AmbitionRow } from '../domain/types';
import { errors } from '../lib/errors';
import { embedText, embedTexts } from '../lib/gemini';
import { createLogger } from '../lib/logger';
import { supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';
import { listAssumptions } from './assumptions';
import { remember } from './memory';

const log = createLogger('ambitions');

export const OnboardingSchema = z.object({
  role: z.string().trim().min(2).max(120),
  activity: z.string().trim().min(2).max(300),
  ambition: z.string().trim().min(5).max(500),
  direction: z.string().trim().max(500).default(''),
  timeline: z.string().trim().min(1).max(100),
  categories: z.array(z.string().trim().min(2).max(80)).min(1).max(12),
  geography: z.string().trim().max(120).default(''),
  depth: z.string().trim().max(50).default(''),
  bidiLang: z.string().trim().max(50).default('English'),
  reportLang: z.string().trim().max(50).default('English'),
});
export type Onboarding = z.infer<typeof OnboardingSchema>;

export const AmbitionPatchSchema = z
  .object({
    title: z.string().trim().min(5).max(500),
    description: z.string().trim().max(1500),
    horizon: z.string().trim().max(100),
    geography: z.string().trim().max(120),
    priority: z.number().int().min(1).max(3),
    status: z.enum(['active', 'paused', 'achieved', 'archived']),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });
export type AmbitionPatch = z.infer<typeof AmbitionPatchSchema>;

const AMBITION_COLUMNS = 'id, user_id, title, description, horizon, geography, status, priority, expires_at, created_at';

export interface ProfileRow {
  role: string | null;
  activity: string | null;
  depth: string | null;
  geography_focus: string | null;
  categories: string[] | null;
  prefered_language: string | null;
  report_language: string | null;
}

function embeddingText(parts: { title: string; direction?: string; role?: string; activity?: string; geography?: string | null }): string {
  return [
    parts.title,
    parts.direction,
    parts.role ? `Role: ${parts.role}.` : '',
    parts.activity ? `Current activity: ${parts.activity}.` : '',
    parts.geography ? `Location: ${parts.geography}.` : '',
  ]
    .filter(Boolean)
    .join(' ');
}

// ambition_context has no unique key on ambition_id, so update-or-insert is done explicitly.
async function saveAmbitionContext(ambitionId: string, profile: AmbitionProfile): Promise<void> {
  const fields = {
    sector: profile.sector,
    geography: profile.geography,
    target_market: profile.target_market,
    time_horizon: profile.time_horizon,
    goals_json: profile.goals,
    search_concepts: profile.search_concepts,
    updated_at: new Date().toISOString(),
  };
  const existing = unwrapMaybe(
    'ambition_context.find',
    await supabase.from('ambition_context').select('id').eq('ambition_id', ambitionId).limit(1).maybeSingle<{ id: string }>(),
  );
  if (existing) {
    unwrapVoid('ambition_context.update', await supabase.from('ambition_context').update(fields).eq('id', existing.id));
  } else {
    unwrapVoid('ambition_context.insert', await supabase.from('ambition_context').insert({ ambition_id: ambitionId, ...fields }));
  }
}

export async function listAmbitions(userId: string): Promise<AmbitionRow[]> {
  return unwrap(
    'ambitions.list',
    await supabase
      .from('ambitions')
      .select(AMBITION_COLUMNS)
      .eq('user_id', userId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .returns<AmbitionRow[]>(),
  );
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  return unwrapMaybe(
    'profile.get',
    await supabase
      .from('user_intelligence_profiles')
      .select('role, activity, depth, geography_focus, categories, prefered_language, report_language')
      .eq('user_id', userId)
      .maybeSingle<ProfileRow>(),
  );
}

/**
 * Creates an ambition from the onboarding answers. Embedding and profile extraction must both succeed
 * before anything is stored; a failure later in the sequence removes the ambition again.
 */
export async function createAmbition(userId: string, input: Onboarding): Promise<AmbitionRow> {
  const description = `As ${input.role}, currently ${input.activity}. Ambition: ${input.ambition}.${input.direction ? ` Direction: ${input.direction}.` : ''}`;

  const [vectors, profile] = await Promise.all([
    embedTexts(
      [embeddingText({ title: input.ambition, direction: input.direction, role: input.role, activity: input.activity, geography: input.geography }), ...input.categories],
      'query',
    ),
    extractAmbitionProfile({ ambition: input.ambition, role: input.role, activity: input.activity, geography: input.geography }),
  ]);
  const [ambitionVector, ...categoryVectors] = vectors;

  const ambition = unwrap(
    'ambitions.insert',
    await supabase
      .from('ambitions')
      .insert({
        user_id: userId,
        title: input.ambition,
        description,
        horizon: input.timeline,
        geography: input.geography || null,
        status: 'active',
        priority: 2,
        embedding: ambitionVector,
      })
      .select(AMBITION_COLUMNS)
      .single<AmbitionRow>(),
  );

  try {
    await saveAmbitionContext(ambition.id, profile);
    unwrapVoid(
      'profile.upsert',
      await supabase.from('user_intelligence_profiles').upsert(
        {
          user_id: userId,
          role: input.role,
          activity: input.activity,
          ambition: input.ambition,
          direction: input.direction || null,
          timeline: input.timeline,
          categories: input.categories,
          geography_focus: input.geography || null,
          depth: input.depth || null,
          prefered_language: input.bidiLang,
          report_language: input.reportLang,
          embedding: ambitionVector,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      ),
    );

    const identity: Array<[string, string | null]> = [
      ['role', input.role],
      ['profession', input.activity],
      ['industry', profile.sector],
      ['location', input.geography],
      ['language', input.bidiLang],
    ];
    for (const [topic, value] of identity) {
      if (value) await remember({ userId, type: 'identity', topic, content: value, source: 'explicit', confidence: 1 });
    }
    for (let i = 0; i < input.categories.length; i += 1) {
      await remember({
        userId,
        type: 'interest',
        topic: input.categories[i],
        strength: 0.6,
        confidence: 1,
        source: 'onboarding',
        embedding: categoryVectors[i],
      });
    }
  } catch (err) {
    await supabase.from('ambitions').delete().eq('id', ambition.id);
    throw err;
  }

  log.info('ambition created', { userId, ambitionId: ambition.id, concepts: profile.search_concepts.length });
  return ambition;
}

export async function updateAmbition(userId: string, id: string, patch: AmbitionPatch): Promise<AmbitionRow> {
  const current = unwrapMaybe(
    'ambitions.get',
    await supabase.from('ambitions').select(AMBITION_COLUMNS).eq('id', id).eq('user_id', userId).maybeSingle<AmbitionRow>(),
  );
  if (!current) throw errors.notFound('Ambition');

  const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
  const textChanged = patch.title !== undefined || patch.description !== undefined || patch.geography !== undefined;
  if (textChanged) {
    const title = patch.title ?? current.title;
    const geography = patch.geography ?? current.geography;
    const profile = await getProfile(userId);
    update.embedding = await embedText(
      embeddingText({ title, direction: patch.description ?? current.description ?? '', role: profile?.role ?? undefined, activity: profile?.activity ?? undefined, geography }),
      'query',
    );
    const refreshed = await extractAmbitionProfile({
      ambition: title,
      role: profile?.role ?? '',
      activity: profile?.activity ?? '',
      geography: geography ?? '',
      assumptions: (await listAssumptions(userId, id)).map((a) => a.statement),
    });
    await saveAmbitionContext(id, refreshed);
  }

  return unwrap(
    'ambitions.update',
    await supabase.from('ambitions').update(update).eq('id', id).eq('user_id', userId).select(AMBITION_COLUMNS).single<AmbitionRow>(),
  );
}

/** Regenerates the embedding and search concepts for an existing ambition (model or schema change). */
export async function refreshAmbitionIndex(ambition: AmbitionRow): Promise<void> {
  const profile = await getProfile(ambition.user_id);
  const vector = await embedText(
    embeddingText({ title: ambition.title, direction: ambition.description ?? '', role: profile?.role ?? undefined, activity: profile?.activity ?? undefined, geography: ambition.geography }),
    'query',
  );
  const extracted = await extractAmbitionProfile({
    ambition: ambition.title,
    role: profile?.role ?? '',
    activity: profile?.activity ?? '',
    geography: ambition.geography ?? '',
    assumptions: (await listAssumptions(ambition.user_id, ambition.id)).map((a) => a.statement),
  });
  unwrapVoid('ambitions.reindex', await supabase.from('ambitions').update({ embedding: vector, updated_at: new Date().toISOString() }).eq('id', ambition.id));
  await saveAmbitionContext(ambition.id, extracted);
  if (profile) {
    unwrapVoid('profile.reindex', await supabase.from('user_intelligence_profiles').update({ embedding: vector }).eq('user_id', ambition.user_id));
  }
}

/**
 * Re-derives the monitoring queries after the user's assumptions change. A failure keeps the previous
 * queries and is logged, so editing an assumption never blocks on the model.
 */
export async function refreshSearchConcepts(userId: string, ambitionId: string): Promise<void> {
  try {
    const ambition = unwrapMaybe(
      'ambitions.concepts',
      await supabase.from('ambitions').select(AMBITION_COLUMNS).eq('id', ambitionId).eq('user_id', userId).maybeSingle<AmbitionRow>(),
    );
    if (!ambition) return;
    const profile = await getProfile(userId);
    const extracted = await extractAmbitionProfile({
      ambition: ambition.title,
      role: profile?.role ?? '',
      activity: profile?.activity ?? '',
      geography: ambition.geography ?? '',
      assumptions: (await listAssumptions(userId, ambitionId)).map((a) => a.statement),
    });
    await saveAmbitionContext(ambitionId, extracted);
  } catch (err) {
    log.error('search concept refresh failed', { userId, ambitionId, err });
  }
}
