import { Router } from 'express';
import agentRouter from './agent';
import ambitionRouter from './ambition';
import authRouter from './auth';
import dashboardRouter from './dashboard';
import feedbackRouter from './feedback';
import memoryRouter from './memory';
import pipelineRouter from './pipeline';
import planRouter from './plan';
import storyRouter from './story';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'ambition-gazette-api' });
});

router.use('/auth', authRouter);
router.use('/dashboard', dashboardRouter);
router.use('/ambition', ambitionRouter);
router.use('/memory', memoryRouter);
router.use('/story', storyRouter);
router.use('/feedback', feedbackRouter);
router.use('/pipeline', pipelineRouter);
router.use('/plan', planRouter);
router.use('/agent', agentRouter);

export default router;
