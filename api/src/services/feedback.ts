import { z } from 'zod';
import { errors } from '../lib/errors';
import { createLogger } from '../lib/logger';
import { supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';
import { refreshBriefing } from './briefing';
import { daysFromNow, remember } from './memory';
import { getStory, trackStory, untrackStory } from './stories';

const log = createLogger('feedback');

export const FEEDBACK_TYPES = [
  'relevant',
  'not_relevant',
  'already_know',
  'too_much',
  'more_like_this',
  'less_like_this',
  'track',
  'untrack',
  'source_not_trusted',
  'not_interested_temporarily',
] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FeedbackSchema = z
  .object({
    storyId: z.string().uuid().optional(),
    developmentId: z.string().uuid().optional(),
    reportItemId: z.string().uuid().optional(),
    feedbackType: z.enum(FEEDBACK_TYPES),
    reason: z.string().trim().max(500).optional(),
    days: z.number().int().min(1).max(365).optional(),
  })
  .refine((v) => v.storyId || v.developmentId || v.reportItemId, { message: 'storyId, developmentId or reportItemId is required' })
  .refine((v) => v.feedbackType !== 'not_interested_temporarily' || v.days !== undefined, { message: 'days is required for temporary feedback' });
export type FeedbackInput = z.infer<typeof FeedbackSchema>;

interface Target {
  storyId: string;
  developmentId: string | null;
  reportItemId: string | null;
}

async function resolveTarget(userId: string, input: FeedbackInput): Promise<Target> {
  let storyId = input.storyId ?? null;
  let developmentId = input.developmentId ?? null;
  const reportItemId = input.reportItemId ?? null;

  if (reportItemId) {
    // Ownership is enforced through the report that holds the item.
    const item = unwrapMaybe(
      'report_items.target',
      await supabase
        .from('report_items')
        .select('story_id, development_id, daily_reports!inner(user_id)')
        .eq('id', reportItemId)
        .eq('daily_reports.user_id', userId)
        .maybeSingle<{ story_id: string | null; development_id: string | null }>(),
    );
    if (!item) throw errors.notFound('Briefing item');
    storyId = storyId ?? item.story_id;
    developmentId = developmentId ?? item.development_id;
  }
  if (!storyId && developmentId) {
    const dev = unwrapMaybe(
      'developments.target',
      await supabase.from('developments').select('story_id').eq('id', developmentId).maybeSingle<{ story_id: string }>(),
    );
    if (!dev) throw errors.notFound('Development');
    storyId = dev.story_id;
  }
  if (!storyId) throw errors.validation('Could not determine which story the feedback refers to.');
  return { storyId, developmentId, reportItemId };
}

async function publishersOf(storyId: string, developmentId: string | null): Promise<string[]> {
  let query = supabase.from('story_sources').select('publisher').eq('story_id', storyId);
  if (developmentId) query = query.eq('development_id', developmentId);
  const rows = unwrap('story_sources.publishers', await query.returns<Array<{ publisher: string | null }>>());
  return [...new Set(rows.map((r) => r.publisher?.toLowerCase() ?? '').filter(Boolean))];
}

/**
 * Stores the feedback and applies its effect to memory. The briefing is refreshed before returning, so the
 * next dashboard load reflects it, unless background is set (voice replies must not wait on it).
 */
export async function applyFeedback(userId: string, input: FeedbackInput, background = false): Promise<{ effect: string }> {
  const target = await resolveTarget(userId, input);
  const story = await getStory(target.storyId);
  const type = input.feedbackType;
  const expiresAt = type === 'not_interested_temporarily' && input.days ? daysFromNow(input.days) : null;

  unwrapVoid(
    'feedback.insert',
    await supabase.from('feedback').insert({
      user_id: userId,
      story_id: target.storyId,
      development_id: target.developmentId,
      report_item_id: target.reportItemId,
      feedback_type: type,
      reason: input.reason ?? null,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    }),
  );

  const note = input.reason ? `${type}: ${input.reason}` : type;
  let effect: string;
  switch (type) {
    case 'not_relevant':
      await remember({ userId, type: 'suppression', topic: `story:${story.id}`, content: `Not interested in "${story.title}"`, source: 'explicit', confidence: 1, structured: { storyId: story.id, note } });
      effect = 'story_hidden';
      break;
    case 'already_know':
      if (!target.developmentId) throw errors.validation('developmentId or reportItemId is required for already_know.');
      await remember({ userId, type: 'suppression', topic: `development:${target.developmentId}`, content: `Already knows an update on "${story.title}"`, source: 'explicit', confidence: 1, structured: { storyId: story.id, developmentId: target.developmentId } });
      effect = 'update_hidden';
      break;
    case 'too_much':
      await remember({ userId, type: 'temporary_suppression', topic: `story:${story.id}`, content: `Too much coverage of "${story.title}"`, source: 'explicit', confidence: 1, validUntil: daysFromNow(7), structured: { storyId: story.id } });
      effect = 'story_paused_7_days';
      break;
    case 'not_interested_temporarily':
      await remember({ userId, type: 'temporary_suppression', topic: `story:${story.id}`, content: `Paused "${story.title}"`, source: 'explicit', confidence: 1, validUntil: expiresAt, structured: { storyId: story.id, days: input.days } });
      effect = `story_paused_${input.days}_days`;
      break;
    case 'less_like_this':
      await remember({ userId, type: 'temporary_suppression', topic: story.title, content: `Less like "${story.title}"`, source: 'explicit', confidence: 0.8, validUntil: daysFromNow(30), structured: { storyId: story.id } });
      effect = 'similar_stories_reduced_30_days';
      break;
    case 'more_like_this':
      await remember({ userId, type: 'interest', topic: story.title, content: `More like "${story.title}"`, source: 'explicit', strength: 0.85, confidence: 0.9, structured: { storyId: story.id } });
      effect = 'interest_added';
      break;
    case 'relevant':
      await remember({ userId, type: 'interest', topic: story.title, content: `Found "${story.title}" relevant`, source: 'explicit', strength: 0.65, confidence: 0.8, structured: { storyId: story.id } });
      effect = 'interest_added';
      break;
    case 'source_not_trusted': {
      const publishers = await publishersOf(story.id, target.developmentId);
      if (publishers.length === 0) throw errors.validation('No source is recorded for this item.');
      for (const publisher of publishers) {
        await remember({ userId, type: 'suppression', topic: `source:${publisher}`, content: `Does not trust ${publisher}`, source: 'explicit', confidence: 1 });
      }
      effect = 'source_hidden';
      break;
    }
    case 'track':
      await trackStory(userId, story.id, background);
      return { effect: 'story_tracked' };
    case 'untrack':
      await untrackStory(userId, story.id, background);
      return { effect: 'story_untracked' };
  }

  await refreshBriefing(userId, { storyId: story.id, background });
  log.info('feedback applied', { userId, storyId: story.id, type, effect });
  return { effect };
}
