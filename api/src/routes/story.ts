import { Router } from 'express';
import { z } from 'zod';
import { errors } from '../lib/errors';
import { getTimeline, markSeen, trackStory, untrackStory } from '../services/stories';
import { parseBody, requireAuth, route, userIdOf, uuidSchema } from '../http/middleware';

const router = Router();
router.use(requireAuth);

const StoryRefSchema = z.object({ storyId: z.string().uuid() });

router.get(
  '/:id/timeline',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const id = uuidSchema.safeParse(req.params.id);
    if (!id.success) throw errors.validation('Invalid story id.');
    const timeline = await getTimeline(userId, id.data);
    // The change summary is computed first, then the story is marked as seen. peek=1 reads without marking.
    if (timeline.tracked && req.query.peek !== '1') await markSeen(userId, id.data);
    res.json({ success: true, ...timeline });
  }),
);

router.post(
  '/track',
  route(async (req, res) => {
    await trackStory(userIdOf(req), parseBody(StoryRefSchema, req.body).storyId);
    res.json({ success: true });
  }),
);

router.delete(
  '/track',
  route(async (req, res) => {
    await untrackStory(userIdOf(req), parseBody(StoryRefSchema, req.body).storyId);
    res.json({ success: true });
  }),
);

export default router;
