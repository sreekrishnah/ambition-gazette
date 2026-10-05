import { Router } from 'express';
import { z } from 'zod';
import { MemoryRow } from '../domain/types';
import { errors } from '../lib/errors';
import { buildBriefing } from '../services/briefing';
import { daysFromNow, deleteMemory, listMemory, remember, setMemoryStatus } from '../services/memory';
import { parseBody, requireAuth, route, userIdOf, uuidSchema } from '../http/middleware';

const router = Router();
router.use(requireAuth);

const toItem = (m: MemoryRow) => ({
  id: m.id,
  kind: m.memory_type,
  topic: m.topic,
  content: m.content,
  strength: m.strength,
  source: m.source,
  temporary: m.valid_until !== null,
  expiresAt: m.valid_until,
  status: m.status,
});

const InterestSchema = z.object({
  topic: z.string().trim().min(2).max(120),
  strength: z.number().min(0).max(1).optional(),
  days: z.number().int().min(1).max(365).optional(),
});
const StatusSchema = z.object({ status: z.enum(['active', 'archived']) });

router.get(
  '/',
  route(async (req, res) => {
    const rows = await listMemory(userIdOf(req));
    const now = new Date();
    const live = rows.filter((r) => !r.valid_until || new Date(r.valid_until) > now);
    const pick = (types: string[]) => live.filter((r) => types.includes(r.memory_type)).map(toItem);
    res.json({
      success: true,
      identity: pick(['identity']),
      interests: pick(['interest', 'temporary_interest']),
      suppressions: pick(['suppression', 'temporary_suppression']),
      tracked: pick(['tracked_entity']),
    });
  }),
);

router.post(
  '/interests',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const body = parseBody(InterestSchema, req.body);
    const item = await remember({
      userId,
      type: body.days ? 'temporary_interest' : 'interest',
      topic: body.topic,
      strength: body.strength ?? 0.8,
      confidence: 1,
      source: 'explicit',
      validUntil: body.days ? daysFromNow(body.days) : null,
    });
    await buildBriefing(userId);
    res.status(201).json({ success: true, item: toItem(item) });
  }),
);

router.patch(
  '/:id',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const id = uuidSchema.safeParse(req.params.id);
    if (!id.success) throw errors.validation('Invalid memory id.');
    const item = await setMemoryStatus(userId, id.data, parseBody(StatusSchema, req.body).status);
    await buildBriefing(userId);
    res.json({ success: true, item: toItem(item) });
  }),
);

router.delete(
  '/:id',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const id = uuidSchema.safeParse(req.params.id);
    if (!id.success) throw errors.validation('Invalid memory id.');
    await deleteMemory(userId, id.data);
    await buildBriefing(userId);
    res.json({ success: true });
  }),
);

export default router;
