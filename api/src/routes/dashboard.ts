import { Router } from 'express';
import { supabase, unwrapMaybe } from '../lib/supabase';
import { listAmbitions } from '../services/ambitions';
import { getBriefingItems } from '../services/briefing';
import { getLens } from '../services/lens';
import { getLatestJob } from '../services/pipeline';
import { listTrackedStories } from '../services/stories';
import { requireAuth, route, userIdOf } from '../http/middleware';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const [user, ambitions, briefing, trackedStories, job] = await Promise.all([
      supabase.from('users').select('full_name').eq('id', userId).maybeSingle<{ full_name: string | null }>(),
      listAmbitions(userId),
      getBriefingItems(userId),
      listTrackedStories(userId),
      getLatestJob(userId),
    ]);
    const hasActiveAmbition = ambitions.some((a) => a.status === 'active');
    const state = !hasActiveAmbition ? 'no_ambition' : briefing.items.length === 0 ? 'no_developments' : 'ready';

    res.json({
      success: true,
      state,
      user: { fullName: unwrapMaybe('users.name', user)?.full_name ?? null },
      ambitions: ambitions.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        horizon: a.horizon,
        geography: a.geography,
        priority: a.priority,
        status: a.status,
        expiresAt: a.expires_at,
        createdAt: a.created_at,
      })),
      briefing: {
        reportId: briefing.report?.id ?? null,
        date: briefing.report?.reportDate ?? null,
        generatedAt: briefing.report?.generatedAt ?? null,
      },
      items: briefing.items,
      trackedStories,
      pipeline: {
        status: job?.status ?? 'IDLE',
        lastRunAt: job?.completedAt ?? null,
        error: job?.error ?? null,
        progress: job?.status === 'PROCESSING' ? (job.progress ?? null) : null,
      },
    });
  }),
);

router.get(
  '/lens',
  route(async (req, res) => {
    res.json({ success: true, lens: await getLens(userIdOf(req)) });
  }),
);

export default router;
