import crypto from 'crypto';
import { Router } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { runDailyBatch } from '../services/batch';
import { getLatestJob, startUserRun } from '../services/pipeline';
import { rateLimit, requireAuth, route, userIdOf } from '../http/middleware';

const router = Router();

function cronSecretMatches(provided: string | undefined): boolean {
  if (!env.CRON_SECRET || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(env.CRON_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

router.post(
  '/run',
  requireAuth,
  rateLimit(10, 60_000),
  route(async (req, res) => {
    const jobId = await startUserRun(userIdOf(req));
    res.status(202).json({ success: true, jobId });
  }),
);

router.get(
  '/status',
  requireAuth,
  route(async (req, res) => {
    const job = await getLatestJob(userIdOf(req));
    res.json({
      success: true,
      status: job?.status ?? 'IDLE',
      startedAt: job?.startedAt ?? null,
      completedAt: job?.completedAt ?? null,
      error: job?.error ?? null,
      progress: job?.status === 'PROCESSING' ? (job.progress ?? null) : null,
    });
  }),
);

router.post(
  '/batch',
  route(async (req, res) => {
    if (!cronSecretMatches(req.header('x-cron-secret'))) throw new AppError('FORBIDDEN', 403, 'Forbidden.');
    void runDailyBatch();
    res.status(202).json({ success: true });
  }),
);

export default router;
