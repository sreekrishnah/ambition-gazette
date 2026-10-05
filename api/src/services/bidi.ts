import { z } from 'zod';
import { heardRequest, isChangingTool } from '../ai/toolGuard';
import { env } from '../config/env';
import { errors } from '../lib/errors';
import { embedText } from '../lib/gemini';
import { createLogger } from '../lib/logger';
import { rpcRows, supabase, unwrap, unwrapMaybe } from '../lib/supabase';
import { listAmbitions } from './ambitions';
import { BriefingItem, getBriefingItems, refreshBriefing } from './briefing';
import { DOSSIER_ITEMS, loadStoryHistory } from './dossier';
import { FEEDBACK_TYPES, applyFeedback } from './feedback';
import { daysFromNow, getActiveMemory, getIdentity, remember } from './memory';
import { evaluateDevelopment, loadDevelopments, loadUserContext } from './relevance';
import { getTimeline, listTrackedStories, markSeen, trackStory, untrackStory } from './stories';

const log = createLogger('live-tools');

// Voice-facing story references. The model speaks about numbered stories and never handles raw ids.
export interface StoryRef {
  storyId: string;
  developmentId: string | null;
  title: string;
}

export class SessionRefs {
  private readonly byRef = new Map<number, StoryRef>();
  private readonly byStory = new Map<string, number>();
  private next = 1;
  focusStoryId: string | null = null;
  readonly discussedStoryIds = new Set<string>();
  // Set by the live session so a tool call can steer the spoken briefing.
  briefing: { stop(): void; skipStory(): void; resume(): void } | null = null;
  // What the user was heard saying recently, so a tool that changes their data can be checked against it.
  heard: (() => string) | null = null;
  toolCalls = 0;

  register(ref: StoryRef): number {
    const existing = this.byStory.get(ref.storyId);
    if (existing) {
      this.byRef.set(existing, ref);
      return existing;
    }
    const number = this.next++;
    this.byRef.set(number, ref);
    this.byStory.set(ref.storyId, number);
    return number;
  }

  resolve(refNumber: number | undefined): StoryRef {
    if (refNumber !== undefined) {
      const found = this.byRef.get(refNumber);
      if (!found) throw errors.validation(`Unknown story reference ${refNumber}.`);
      this.focusStoryId = found.storyId;
      this.discussedStoryIds.add(found.storyId);
      return found;
    }
    const focus = this.focusStoryId ? [...this.byRef.values()].find((r) => r.storyId === this.focusStoryId) : undefined;
    if (!focus) throw errors.validation('No story is in focus. Ask the user which story they mean.');
    this.discussedStoryIds.add(focus.storyId);
    return focus;
  }
}

// ---------------------------------------------------------------
// Tool definitions: zod schemas validate model-supplied arguments and are the source of the JSON schemas.
// ---------------------------------------------------------------
// Native-audio models sometimes send the reference as text such as "story [1]", so both forms are accepted.
const storyRef = z.union([z.number().int().positive(), z.string().max(40)]).optional().describe('Number of the story being discussed, as listed in your briefing or a previous tool result. Omit only if the user means the story currently in focus.');

// Tools that change the user's data must carry the words the user said to ask for it; the server checks them.
const userSaid = z.string().trim().min(3).max(300).describe('The exact words the user just said that asked for this. If they did not ask for it, do not call this tool.');

const TOOL_SCHEMAS = {
  get_user_context: z.object({}),
  get_latest_developments: z.object({ limit: z.number().int().min(1).max(8).optional() }),
  search_relevant_events: z.object({
    query: z.string().trim().min(2).max(200).describe('What the user asked about, in a few words.'),
    limit: z.number().int().min(1).max(5).optional(),
  }),
  get_event_timeline: z.object({
    story_ref: storyRef,
    since_last_seen: z.boolean().optional().describe('Only developments since the user last saw this tracked story.'),
  }),
  explain_relevance: z.object({ story_ref: storyRef }),
  control_briefing: z.object({ user_said: userSaid, action: z.enum(['stop', 'skip_story', 'resume']).describe('stop ends the spoken briefing so the user can just talk; skip_story moves to the next story; resume carries on with the briefing.') }),
  track_event: z.object({ story_ref: storyRef, user_said: userSaid }),
  untrack_event: z.object({ story_ref: storyRef, user_said: userSaid }),
  update_preference: z.object({
    user_said: userSaid,
    topic: z.string().trim().min(2).max(120).describe('The topic in a few words, for example "crypto" or "AI regulation".'),
    action: z.enum(['follow', 'stop_following']),
    duration: z.enum(['permanent', 'temporary']),
    days: z.number().int().min(1).max(365).optional().describe('Required when duration is temporary.'),
  }),
  submit_feedback: z.object({
    user_said: userSaid,
    story_ref: storyRef,
    feedback_type: z.enum(FEEDBACK_TYPES.filter((t) => t !== 'track' && t !== 'untrack') as [string, ...string[]]),
    reason: z.string().trim().max(300).optional(),
    days: z.number().int().min(1).max(365).optional().describe('Required for not_interested_temporarily.'),
  }),
} as const;

type ToolName = keyof typeof TOOL_SCHEMAS;

const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  get_user_context: "Returns the user's stored ambitions, profile facts, interests, things they asked to stop seeing and tracked stories.",
  get_latest_developments: "Returns the user's current briefing items with what changed and why each matters to them, if a link is established.",
  search_relevant_events: 'Searches stored stories by meaning. Use when the user asks about a topic or event.',
  get_event_timeline: 'Returns how a story developed over time, or only what changed since the user last saw it.',
  control_briefing: 'Controls the spoken briefing: stop it, skip the current story, or resume it. Call when the user asks for it.',
  explain_relevance: 'Explains why a story matters to this user, based on stored ambitions and preferences. Says so when no link is supported.',
  track_event: 'Starts tracking a story for the user. Call when the user asks to track or follow a story.',
  untrack_event: 'Stops tracking a story.',
  update_preference: 'Stores a topic the user wants to follow or stop seeing, permanently or for a number of days.',
  submit_feedback: 'Records explicit feedback about a story: not_relevant, already_know, too_much, more_like_this, less_like_this, relevant, source_not_trusted or not_interested_temporarily.',
};

export const FUNCTION_DECLARATIONS = (Object.keys(TOOL_SCHEMAS) as ToolName[]).map((name) => {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(TOOL_SCHEMAS[name]) as Record<string, unknown>;
  return { name, description: TOOL_DESCRIPTIONS[name], parametersJsonSchema: schema };
});

export function isToolName(name: string): name is ToolName {
  return name in TOOL_SCHEMAS;
}

function parseRef(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value).match(/\d+/)?.[0]);
  if (!Number.isInteger(parsed) || parsed < 1) throw errors.validation('story_ref must be the number of a listed story.');
  return parsed;
}

// ---------------------------------------------------------------
// Tool implementations. userId always comes from the authenticated socket, never from the model.
// ---------------------------------------------------------------
type ToolResult = Record<string, unknown>;

const trim = (text: string | null | undefined, max = 280): string | null => {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

function briefingForModel(refs: SessionRefs, item: BriefingItem) {
  const ref = refs.register({ storyId: item.storyId, developmentId: item.developmentId, title: item.storyTitle });
  return {
    ref,
    story: item.storyTitle,
    headline: item.headline,
    whatChanged: trim(item.whatChanged),
    continuity: item.continuity,
    occurredAt: item.occurredAt.slice(0, 10),
    whyItMatters: item.whyItMatters,
    couldChange: item.couldChange,
    tracked: item.tracked,
    sourceCount: item.sources.length,
  };
}

async function storedFactors(userId: string, developmentId: string): Promise<string[]> {
  const row = unwrapMaybe(
    'coverage.factors',
    await supabase
      .from('world_coverage')
      .select('relevance_reasons')
      .eq('user_id', userId)
      .eq('development_id', developmentId)
      .maybeSingle<{ relevance_reasons: { factors?: Array<{ detail?: string }> } | null }>(),
  );
  return (row?.relevance_reasons?.factors ?? []).flatMap((f) => (typeof f.detail === 'string' ? [f.detail] : []));
}

async function latestDevelopmentId(storyId: string): Promise<string | null> {
  const row = unwrapMaybe(
    'developments.latest',
    await supabase
      .from('developments')
      .select('id')
      .eq('story_id', storyId)
      .order('occurred_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>(),
  );
  return row?.id ?? null;
}

export async function loadSessionContext(userId: string) {
  const [userRow, profileRow, identity, ambitions, memory, tracked, briefing] = await Promise.all([
    supabase.from('users').select('full_name').eq('id', userId).maybeSingle<{ full_name: string | null }>(),
    supabase
      .from('user_intelligence_profiles')
      .select('prefered_language, role, activity, depth, geography_focus, categories')
      .eq('user_id', userId)
      .maybeSingle<{ prefered_language: string | null; role: string | null; activity: string | null; depth: string | null; geography_focus: string | null; categories: string[] | null }>(),
    getIdentity(userId),
    listAmbitions(userId),
    getActiveMemory(userId),
    listTrackedStories(userId),
    getBriefingItems(userId, DOSSIER_ITEMS),
  ]);
  const profile = unwrapMaybe('profile.language', profileRow);
  const history = await loadStoryHistory(briefing.items);
  return {
    name: unwrapMaybe('users.name', userRow)?.full_name ?? null,
    language: profile?.prefered_language ?? 'English',
    profile: {
      role: profile?.role ?? null,
      activity: profile?.activity ?? null,
      depth: profile?.depth ?? null,
      geographyFocus: profile?.geography_focus ?? null,
      categories: profile?.categories ?? [],
    },
    history,
    identity,
    ambitions: ambitions.filter((a) => a.status === 'active').slice(0, 3),
    interests: memory.filter((m) => (m.memory_type === 'interest' || m.memory_type === 'temporary_interest') && m.source !== 'inferred').slice(0, 8),
    suppressions: memory.filter((m) => m.memory_type === 'suppression' || m.memory_type === 'temporary_suppression').filter((m) => !/^(story|development|source):/.test(m.topic ?? '')).slice(0, 6),
    tracked: tracked.slice(0, 5),
    briefing: briefing.items,
  };
}

export type SessionContext = Awaited<ReturnType<typeof loadSessionContext>>;

export async function executeTool(userId: string, refs: SessionRefs, name: string, rawArgs: unknown): Promise<ToolResult> {
  if (!isToolName(name)) throw errors.validation(`Unknown tool ${name}.`);
  const parsed = TOOL_SCHEMAS[name].safeParse(rawArgs ?? {});
  if (!parsed.success) throw errors.validation(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  const args = parsed.data as Record<string, unknown>;
  log.info('tool call', { userId, name });

  refs.toolCalls += 1;
  if (refs.toolCalls > env.VOICE_MAX_TOOL_CALLS) throw errors.validation('This voice session has used all of its tool calls.');
  if (isChangingTool(name) && !heardRequest(refs.heard?.() ?? '', args.user_said as string | undefined)) {
    log.warn('tool refused: the user did not ask for it', { userId, name });
    return { ok: false, note: 'The user did not ask for that in their recent words, so nothing was changed. Do not say it was done.' };
  }

  switch (name) {
    case 'get_user_context': {
      const ctx = await loadSessionContext(userId);
      return {
        name: ctx.name,
        profile: ctx.identity,
        ambitions: ctx.ambitions.map((a) => ({ title: a.title, horizon: a.horizon, geography: a.geography, priority: a.priority })),
        followedTopics: ctx.interests.map((i) => i.topic),
        hiddenTopics: ctx.suppressions.map((s) => s.topic),
        trackedStories: ctx.tracked.map((t) => ({ ref: refs.register({ storyId: t.storyId, developmentId: null, title: t.title }), title: t.title, hasUpdates: t.hasUpdates })),
      };
    }
    case 'get_latest_developments': {
      const { items } = await getBriefingItems(userId, (args.limit as number | undefined) ?? 5);
      if (items.length === 0) return { developments: [], note: 'There are no developments in the briefing yet.' };
      return { developments: items.map((i) => briefingForModel(refs, i)) };
    }
    case 'search_relevant_events': {
      const query = args.query as string;
      const vector = await embedText(query, 'query');
      const matches = await rpcRows<{ id: string; title: string; similarity: number }>('match_stories', {
        p_embedding: vector,
        p_limit: (args.limit as number | undefined) ?? 3,
        p_since: null,
      });
      const close = matches.filter((m) => m.similarity >= 0.55);
      if (close.length === 0) return { results: [], note: 'No stored story matches that.' };

      // The spoken answer waits on this call, so independent reads run together.
      const [{ items }, latestPerStory] = await Promise.all([
        getBriefingItems(userId, 50),
        Promise.all(close.map(async (story) => (await loadDevelopments({ storyId: story.id, limit: 1 }))[0])),
      ]);
      const results = close.map((story, index) => {
        const latest = latestPerStory[index];
        const inBriefing = items.find((i) => i.storyId === story.id);
        const ref = refs.register({ storyId: story.id, developmentId: latest?.id ?? null, title: story.title });
        return {
          ref,
          story: story.title,
          headline: latest?.headline ?? null,
          whatChanged: trim(latest?.what_changed),
          occurredAt: latest?.occurred_at.slice(0, 10) ?? null,
          whyItMatters: inBriefing?.whyItMatters ?? null,
          couldChange: inBriefing?.couldChange ?? null,
        };
      });
      refs.focusStoryId = close[0].id;
      return { results };
    }
    case 'get_event_timeline': {
      const target = refs.resolve(parseRef(args.story_ref));
      const timeline = await getTimeline(userId, target.storyId);
      const sinceLast = Boolean(args.since_last_seen) && timeline.changeSinceLastSeen !== null;
      const list = sinceLast ? (timeline.changeSinceLastSeen?.developments ?? []) : timeline.developments;
      if (sinceLast && timeline.tracked) await markSeen(userId, target.storyId);
      return {
        story: timeline.story.title,
        tracked: timeline.tracked,
        scope: sinceLast ? `since you last saw this (${timeline.changeSinceLastSeen?.since?.slice(0, 10)})` : 'full history',
        developments: list.slice(-6).map((d) => ({
          date: d.occurredAt.slice(0, 10),
          headline: d.headline,
          whatChanged: trim(d.whatChanged),
          continuity: d.continuity,
          sources: d.sources.length,
        })),
        note: list.length === 0 ? 'Nothing new since the user last saw this story.' : undefined,
      };
    }
    case 'explain_relevance': {
      const target = refs.resolve(parseRef(args.story_ref));
      const devId = target.developmentId ?? (await latestDevelopmentId(target.storyId));
      if (!devId) throw errors.notFound('Development');

      // The briefing already stored this evaluation; answering from it avoids a model call mid-conversation.
      const { items } = await getBriefingItems(userId, 50);
      const stored = items.find((i) => i.developmentId === devId);
      if (stored) {
        return {
          story: target.title,
          linkEstablished: stored.relevanceBasis !== null && stored.relevanceBasis !== 'general',
          basis: stored.relevanceBasis,
          ambition: stored.ambitionTitle,
          whyItMatters: stored.whyItMatters,
          couldChange: stored.couldChange,
          factors: await storedFactors(userId, devId),
          note: stored.whyItMatters ? undefined : 'No link to the ambitions or preferences on record could be established.',
        };
      }

      const [dev] = await loadDevelopments({ ids: [devId], limit: 1 });
      const ctx = await loadUserContext(userId);
      const evaluated = await evaluateDevelopment(ctx, dev);
      const d = evaluated.decision;
      if (d.suppressed) return { story: target.title, hidden: true, reason: d.suppressedReason };
      return {
        story: target.title,
        linkEstablished: d.basis !== null && d.basis !== 'general',
        basis: d.basis,
        ambition: evaluated.ambitionTitle,
        whyItMatters: d.whyItMatters,
        couldChange: d.couldChange,
        factors: d.factors.map((f) => f.detail),
        note: d.whyItMatters ? undefined : 'No link to the ambitions or preferences on record could be established.',
      };
    }
    case 'control_briefing': {
      const action = args.action as 'stop' | 'skip_story' | 'resume';
      if (!refs.briefing) return { ok: false, note: 'There is no spoken briefing running.' };
      if (action === 'stop') refs.briefing.stop();
      else if (action === 'skip_story') refs.briefing.skipStory();
      else refs.briefing.resume();
      return { ok: true, action };
    }
    case 'track_event': {
      const target = refs.resolve(parseRef(args.story_ref));
      await trackStory(userId, target.storyId, true);
      return { ok: true, tracking: target.title };
    }
    case 'untrack_event': {
      const target = refs.resolve(parseRef(args.story_ref));
      await untrackStory(userId, target.storyId, true);
      return { ok: true, untracked: target.title };
    }
    case 'update_preference': {
      const topic = args.topic as string;
      const action = args.action as 'follow' | 'stop_following';
      const temporary = args.duration === 'temporary';
      const days = args.days as number | undefined;
      if (temporary && !days) throw errors.validation('days is required for a temporary preference.');
      const type = action === 'follow' ? (temporary ? 'temporary_interest' : 'interest') : temporary ? 'temporary_suppression' : 'suppression';
      await remember({
        userId,
        type,
        topic,
        strength: 0.9,
        confidence: 1,
        source: 'explicit',
        validUntil: temporary && days ? daysFromNow(days) : null,
      });
      await refreshBriefing(userId, { background: true });
      return { ok: true, saved: `${action === 'follow' ? 'Following' : 'Hiding'} "${topic}"${temporary ? ` for ${days} days` : ' permanently'}` };
    }
    case 'submit_feedback': {
      const target = refs.resolve(parseRef(args.story_ref));
      const type = args.feedback_type as (typeof FEEDBACK_TYPES)[number];
      const developmentId = type === 'already_know' ? (target.developmentId ?? (await latestDevelopmentId(target.storyId))) : null;
      const result = await applyFeedback(
        userId,
        {
          storyId: target.storyId,
          developmentId: developmentId ?? undefined,
          feedbackType: type,
          reason: args.reason as string | undefined,
          days: args.days as number | undefined,
        },
        true,
      );
      return { ok: true, story: target.title, effect: result.effect };
    }
  }
}
