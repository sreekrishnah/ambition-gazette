import { Router } from 'express';
import { getPlanStatus } from '../services/plan';
import { requireAuth, route, userIdOf } from '../http/middleware';

const router = Router();
router.use(requireAuth);

router.get(
  '/status',
  route(async (req, res) => {
    res.json({ success: true, plan: await getPlanStatus(userIdOf(req)) });
  }),
);

export default router;
