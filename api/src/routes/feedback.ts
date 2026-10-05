import { Router } from 'express';
import { FeedbackSchema, applyFeedback } from '../services/feedback';
import { parseBody, requireAuth, route, userIdOf } from '../http/middleware';

const router = Router();
router.use(requireAuth);

router.post(
  '/',
  route(async (req, res) => {
    const result = await applyFeedback(userIdOf(req), parseBody(FeedbackSchema, req.body));
    res.json({ success: true, ...result });
  }),
);

export default router;
