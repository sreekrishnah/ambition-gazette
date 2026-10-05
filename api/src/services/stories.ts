import { Continuity, isContinuity } from '../domain/types';
import { errors } from '../lib/errors';
import { createLogger } from '../lib/logger';
import { rpcRows, supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';
import { refreshBriefing } from './briefing';

const log = createLogger('stories');

// Below this query-vs-document similarity a story is not linked to any ambition on tracking.
const AMBITION_LINK_MIN = 0.55;

export interface TimelineDevelopment {
  id: string;
  dayNumber: number;
  headline: string;
  summary: string | null;
  whatChanged: string;
  previousState: string;
  newState: string;
  continuity: Continuity | null;
  occurredAt: string;
  worldSignificance: number | null;
  evidenceStrength: string | null;
  sources: Array<{ name: string; url: string; title: string | null }>;
}

interface StoryRow {
  id: string;
  title: string;
  summary: string | null;
  category: string | null;
  geography: string | null;
  status: string;
  embedding: string | null;
}

interface DevelopmentRow {
  id: string;
  headline: string;
  summary: string | null;
  what_changed: string;
  previous_state: string;
  new_state: string;
  continuity: string | null;
  occurred_at: string;
  world_significance: number | null;
  evidence_strength: string | null;
}

interface SourceRow {
  development_id: string | null;
  url: string;
  title: string | null;
  publisher: string | null;
}

export async function getStory(storyId: string): Promise<StoryRow> {
  const story = unwrapMaybe(
    'stories.get',
    await supabase.from('stories').select('id, title, summary, category, geography, status, embedding').eq('id', storyId).maybeSingle<StoryRow>(),
  );
  if (!story) throw errors.notFound('Story');
  return story;
}

async function trackedRow(userId: string, storyId: string) {
  return unwrapMaybe(
    'tracked.get',
    await supabase
      .from('tracked_stories')
      .select('id, tracked_at, last_seen_development_id')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .maybeSingle<{ id: string; tracked_at: string; last_seen_development_id: string | null }>(),
  );
}

export async function getTimeline(userId: string, storyId: string) {
  const story = await getStory(storyId);
  const rows = unwrap(
    'developments.timeline',
    await supabase
      .from('developments')
      .select('id, headline, summary, what_changed, previous_state, new_state, continuity, occurred_at, world_significance, evidence_strength')
      .eq('story_id', storyId)
      .order('occurred_at', { ascending: true })
      .returns<DevelopmentRow[]>(),
  );
  const sources = unwrap(
    'story_sources.timeline',
    await supabase
      .from('story_sources')
      .select('development_id, url, title, publisher')
      .eq('story_id', storyId)
      .returns<SourceRow[]>(),
  );

  const developments: TimelineDevelopment[] = rows.map((d, index) => ({
    id: d.id,
    dayNumber: index + 1,
    headline: d.headline,
    summary: d.summary,
    whatChanged: d.what_changed,
    previousState: d.previous_state,
    newState: d.new_state,
    continuity: isContinuity(d.continuity) ? d.continuity : null,
    occurredAt: d.occurred_at,
    worldSignificance: d.world_significance,
    evidenceStrength: d.evidence_strength,
    sources: sources
      .filter((s) => s.development_id === d.id)
      .map((s) => ({ name: s.publisher ?? 'Source', url: s.url, title: s.title })),
  }));

  const tracked = await trackedRow(userId, storyId);
  let changeSinceLastSeen: { since: string | null; developments: TimelineDevelopment[] } | null = null;
  if (tracked) {
    const lastSeen = rows.find((d) => d.id === tracked.last_seen_development_id);
    const sinceTime = lastSeen ? new Date(lastSeen.occurred_at).getTime() : new Date(tracked.tracked_at).getTime();
    changeSinceLastSeen = {
      since: lastSeen ? lastSeen.occurred_at : tracked.tracked_at,
      developments: developments.filter((d) => new Date(d.occurredAt).getTime() > sinceTime),
    };
  }

  return {
    story: { id: story.id, title: story.title, summary: story.summary, category: story.category, geography: story.geography },
    developments,
    tracked: tracked !== null,
    changeSinceLastSeen,
  };
}

// Records that the user has seen everything up to the latest development.
export async function markSeen(userId: string, storyId: string): Promise<void> {
  const latest = unwrapMaybe(
    'developments.latest',
    await supabase
      .from('developments')
      .select('id')
      .eq('story_id', storyId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>(),
  );
  if (!latest) return;
  unwrapVoid(
    'tracked.markSeen',
    await supabase
      .from('tracked_stories')
      .update({ last_seen_development_id: latest.id, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('story_id', storyId),
  );
}

export async function trackStory(userId: string, storyId: string, background = false): Promise<void> {
  const story = await getStory(storyId);

  let ambitionId: string | null = null;
  if (story.embedding) {
    const [best] = await rpcRows<{ id: string; similarity: number }>('match_ambitions', {
      p_user_id: userId,
      p_embedding: story.embedding,
      p_limit: 1,
    });
    if (best && best.similarity >= AMBITION_LINK_MIN) ambitionId = best.id;
  }

  const latest = unwrapMaybe(
    'developments.latest',
    await supabase
      .from('developments')
      .select('id')
      .eq('story_id', storyId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>(),
  );
  unwrapVoid(
    'tracked.upsert',
    await supabase.from('tracked_stories').upsert(
      {
        user_id: userId,
        story_id: storyId,
        ambition_id: ambitionId,
        last_seen_development_id: latest?.id ?? null,
        tracked_at: new Date().toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,story_id' },
    ),
  );
  log.info('story tracked', { userId, storyId, ambitionId });
  await refreshBriefing(userId, { storyId, background });
}

export async function untrackStory(userId: string, storyId: string, background = false): Promise<void> {
  await getStory(storyId);
  unwrapVoid('tracked.delete', await supabase.from('tracked_stories').delete().eq('user_id', userId).eq('story_id', storyId));
  log.info('story untracked', { userId, storyId });
  await refreshBriefing(userId, { storyId, background });
}

export interface TrackedStorySummary {
  id: string;
  storyId: string;
  title: string;
  summary: string | null;
  category: string | null;
  trackedAt: string;
  latestHeadline: string | null;
  latestAt: string | null;
  hasUpdates: boolean;
}

export async function listTrackedStories(userId: string): Promise<TrackedStorySummary[]> {
  const rows = unwrap(
    'tracked.list',
    await supabase
      .from('tracked_stories')
      .select('id, story_id, tracked_at, last_seen_development_id, stories(title, summary, category)')
      .eq('user_id', userId)
      .order('tracked_at', { ascending: false })
      .returns<
        Array<{
          id: string;
          story_id: string;
          tracked_at: string;
          last_seen_development_id: string | null;
          stories: { title: string; summary: string | null; category: string | null } | null;
        }>
      >(),
  );
  const result: TrackedStorySummary[] = [];
  for (const row of rows) {
    const latest = unwrapMaybe(
      'developments.latest',
      await supabase
        .from('developments')
        .select('id, headline, occurred_at')
        .eq('story_id', row.story_id)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; headline: string; occurred_at: string }>(),
    );
    result.push({
      id: row.id,
      storyId: row.story_id,
      title: row.stories?.title ?? '',
      summary: row.stories?.summary ?? null,
      category: row.stories?.category ?? null,
      trackedAt: row.tracked_at,
      latestHeadline: latest?.headline ?? null,
      latestAt: latest?.occurred_at ?? null,
      hasUpdates: latest !== null && latest.id !== row.last_seen_development_id,
    });
  }
  return result;
}
