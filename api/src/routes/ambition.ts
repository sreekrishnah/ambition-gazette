import { Router } from 'express';
import { stateOf } from '../domain/beliefs';
import { AmbitionRow } from '../domain/types';
import { errors } from '../lib/errors';
import { AmbitionPatchSchema, OnboardingSchema, createAmbition, getProfile, listAmbitions, updateAmbition } from '../services/ambitions';
import { refreshSearchConcepts } from '../services/ambitions';
import { suggestAssumptions } from '../ai/tasks';
import { AssumptionCreateSchema, AssumptionPatchSchema, AssumptionRow, DecisionSchema, createAssumption, decideAssumption, deleteAssumption, listAssumptions, updateAssumption } from '../services/assumptions';
import { buildBriefing, refreshBriefing } from '../services/briefing';
import { getEvolution } from '../services/evolution';
import { parseBody, rateLimit, requireAuth, route, userIdOf, uuidSchema } from '../http/middleware';

const router = Router();
router.use(requireAuth);

const toAmbition = (a: AmbitionRow) => ({
  id: a.id,
  title: a.title,
  description: a.description,
  horizon: a.horizon,
  geography: a.geography,
  priority: a.priority,
  status: a.status,
  expiresAt: a.expires_at,
  createdAt: a.created_at,
});

router.get(
  '/',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const [ambitions, profile] = await Promise.all([listAmbitions(userId), getProfile(userId)]);
    const primary = ambitions.find((a) => a.status === 'active');
    res.json({
      success: true,
      ambitions: ambitions.map(toAmbition),
      profile: profile
        ? {
            role: profile.role,
            activity: profile.activity,
            depth: profile.depth,
            geographyFocus: profile.geography_focus,
            topics: profile.categories ?? [],
            bidiLanguage: profile.prefered_language,
            reportLanguage: profile.report_language,
          }
        : null,
      ...(primary
        ? { ambitionId: primary.id, title: primary.title, description: primary.description, horizon: primary.horizon, geography: primary.geography }
        : {}),
    });
  }),
);

router.post(
  '/',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const ambition = await createAmbition(userId, parseBody(OnboardingSchema, req.body));
    res.status(201).json({ success: true, ambitionId: ambition.id, ...toAmbition(ambition) });
  }),
);

router.patch(
  '/:id',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const id = uuidSchema.safeParse(req.params.id);
    if (!id.success) throw errors.validation('Invalid ambition id.');
    const ambition = await updateAmbition(userId, id.data, parseBody(AmbitionPatchSchema, req.body));
    // Priority or status changes alter which developments matter, so the briefing is rebuilt.
    await buildBriefing(userId);
    res.json({ success: true, ambition: toAmbition(ambition) });
  }),
);

const toAssumption = (a: AssumptionRow) => ({
  id: a.id,
  statement: a.statement,
  status: a.status,
  state: stateOf(a.status),
  decidedAt: a.decided_at,
  challengedAt: a.challenged_at,
  challengeReason: a.challenge_reason,
  createdAt: a.created_at,
});

function idParam(value: unknown, what: string): string {
  const id = uuidSchema.safeParse(value);
  if (!id.success) throw errors.validation(`Invalid ${what} id.`);
  return id.data;
}

router.get(
  '/:id/assumptions',
  route(async (req, res) => {
    const assumptions = await listAssumptions(userIdOf(req), idParam(req.params.id, 'ambition'));
    res.json({ success: true, assumptions: assumptions.map(toAssumption) });
  }),
);

// Assumptions change how developments are judged, so the briefing is re-evaluated in the background.
router.post(
  '/:id/assumptions',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const ambitionId = idParam(req.params.id, 'ambition');
    const created = await createAssumption(userId, ambitionId, parseBody(AssumptionCreateSchema, req.body).statement);
    await refreshSearchConcepts(userId, ambitionId);
    await refreshBriefing(userId, { background: true });
    res.status(201).json({ success: true, assumption: toAssumption(created) });
  }),
);

// Candidates only: nothing is stored until the person adds one through the normal create route.
router.post(
  '/:id/assumptions/suggest',
  rateLimit(10, 60_000),
  route(async (req, res) => {
    const userId = userIdOf(req);
    const ambitionId = idParam(req.params.id, 'ambition');
    const ambition = (await listAmbitions(userId)).find((a) => a.id === ambitionId);
    if (!ambition) throw errors.notFound('Ambition');
    const [existing, profile] = await Promise.all([listAssumptions(userId, ambitionId), getProfile(userId)]);
    const suggestions = await suggestAssumptions({
      ambition: { title: ambition.title, description: ambition.description, horizon: ambition.horizon, geography: ambition.geography },
      existing: existing.map((a) => a.statement),
      language: profile?.report_language?.trim() || 'English',
    });
    const known = new Set(existing.map((a) => a.statement.trim().toLowerCase()));
    res.json({ success: true, suggestions: suggestions.filter((s) => !known.has(s.statement.trim().toLowerCase())) });
  }),
);

router.post(
  '/:id/assumptions/:assumptionId/decision',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const updated = await decideAssumption(userId, idParam(req.params.id, 'ambition'), idParam(req.params.assumptionId, 'assumption'), parseBody(DecisionSchema, req.body).decision);
    res.json({ success: true, assumption: toAssumption(updated) });
  }),
);

router.patch(
  '/:id/assumptions/:assumptionId',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const ambitionId = idParam(req.params.id, 'ambition');
    const updated = await updateAssumption(userId, ambitionId, idParam(req.params.assumptionId, 'assumption'), parseBody(AssumptionPatchSchema, req.body));
    if (req.body?.statement !== undefined) await refreshSearchConcepts(userId, ambitionId);
    await refreshBriefing(userId, { background: true });
    res.json({ success: true, assumption: toAssumption(updated) });
  }),
);

router.delete(
  '/:id/assumptions/:assumptionId',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const ambitionId = idParam(req.params.id, 'ambition');
    await deleteAssumption(userId, ambitionId, idParam(req.params.assumptionId, 'assumption'));
    await refreshSearchConcepts(userId, ambitionId);
    await refreshBriefing(userId, { background: true });
    res.json({ success: true });
  }),
);

router.get(
  '/:id/evolution',
  route(async (req, res) => {
    res.json({ success: true, evolution: await getEvolution(userIdOf(req), idParam(req.params.id, 'ambition')) });
  }),
);

export default router;
