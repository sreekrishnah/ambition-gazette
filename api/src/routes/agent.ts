import { Router } from 'express';
import { errors } from '../lib/errors';
import { supabase, unwrap, unwrapMaybe } from '../lib/supabase';
import { rateLimit, requireAuth, route, userIdOf } from '../http/middleware';
import { getReportForDate, getReportItems, listReportDays } from '../services/briefing';
import { getLatestScript, getScriptForReport } from '../services/script';
import { getVoiceUsage } from '../services/voiceUsage';

const router = Router();
router.use(requireAuth);
router.use(rateLimit(60, 60_000));

interface StoredSummary {
  summary: string;
  keyPoints: string[];
  nextSteps: Array<{ title: string; description: string; priority: 'high' | 'medium' | 'next' }>;
  sources: Array<{ name: string; url: string; title: string | null }>;
}

const PRIORITY_LABEL = { high: 'High Priority', medium: 'Medium Priority', next: 'Next Step' } as const;

function toSession(row: { id: string; ended_at: string | null; summary: StoredSummary }) {
  return {
    id: row.id,
    endedAt: row.ended_at,
    summary: row.summary.summary,
    keyPoints: row.summary.keyPoints,
    sources: row.summary.sources,
    nextSteps: row.summary.nextSteps.map((s, i) => ({ id: `${row.id}-${i}`, title: s.title, description: s.description, priority: PRIORITY_LABEL[s.priority] })),
  };
}

router.get(
  '/summary',
  route(async (req, res) => {
    const row = unwrapMaybe(
      'bidi_sessions.latest',
      await supabase
        .from('bidi_sessions')
        .select('id, ended_at, summary')
        .eq('user_id', userIdOf(req))
        .eq('status', 'ended')
        .not('summary', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; ended_at: string | null; summary: StoredSummary }>(),
    );
    if (!row) {
      res.json({ success: true, session: null });
      return;
    }
    res.json({ success: true, session: toSession(row) });
  }),
);

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

// Days that have a saved briefing, so the agent page can show what happened on each.
router.get(
  '/days',
  route(async (req, res) => {
    res.json({ success: true, days: await listReportDays(userIdOf(req)) });
  }),
);

// Everything for one IST day: that day's briefing, its script, and the calls held that day.
router.get(
  '/days/:date',
  route(async (req, res) => {
    const userId = userIdOf(req);
    const date = String(req.params.date);
    const dayStart = DATE_PARAM.test(date) ? new Date(`${date}T00:00:00+05:30`) : null;
    if (!dayStart || Number.isNaN(dayStart.getTime())) {
      throw errors.validation('Choose a valid date.');
    }
    const report = await getReportForDate(userId, date);
    const [items, script, calls] = await Promise.all([
      report ? getReportItems(userId, report, 50) : Promise.resolve([]),
      report ? getScriptForReport(userId, report.id) : Promise.resolve(null),
      supabase
        .from('bidi_sessions')
        .select('id, ended_at, summary')
        .eq('user_id', userId)
        .eq('status', 'ended')
        .not('summary', 'is', null)
        .gte('ended_at', dayStart.toISOString())
        .lt('ended_at', new Date(dayStart.getTime() + DAY_MS).toISOString())
        .order('ended_at', { ascending: true })
        .returns<Array<{ id: string; ended_at: string | null; summary: StoredSummary }>>(),
    ]);
    const sessions = unwrap('bidi_sessions.day', calls).map((row) => toSession(row));
    res.json({
      success: true,
      day: {
        date,
        generatedAt: report?.generatedAt ?? null,
        items,
        closing: script?.closing || null,
        sessions,
      },
    });
  }),
);

// How many of today's voice sessions and tokens are left, so the UI can say so before a call is started.
router.get(
  '/usage',
  route(async (req, res) => {
    res.json({ success: true, usage: await getVoiceUsage(userIdOf(req)) });
  }),
);

// The written script the voice agent performs for the latest briefing, for the user to read or check.
router.get(
  '/script',
  route(async (req, res) => {
    const stored = await getLatestScript(userIdOf(req));
    res.json({ success: true, script: stored?.script ?? null });
  }),
);

export default router;
