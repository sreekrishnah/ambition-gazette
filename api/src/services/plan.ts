import { AssumptionState, SignalEffect, deriveBelief } from '../domain/beliefs';
import { supabase, unwrap } from '../lib/supabase';
import { Decision, toSignal } from './assumptions';
import { loadSources } from './briefing';
import { getLens } from './lens';

const EVIDENCE_PER_ASSUMPTION = 5;
const TIMELINE_LIMIT = 12;

export interface EvidenceItem {
  developmentId: string;
  effect: SignalEffect;
  reason: string;
  reconsider: string | null;
  headline: string;
  occurredAt: string;
  publisherCount: number;
  // False once the person has answered the assumption after this evidence was recorded.
  counts: boolean;
  sources: Array<{ name: string; url: string }>;
}

export interface TimelineEntry {
  at: string;
  kind: 'recorded' | 'evidence' | 'decision';
  effect?: SignalEffect;
  decision?: Decision;
  text: string;
}

export interface PlanAssumption {
  id: string;
  statement: string;
  state: AssumptionState;
  threats: number;
  confirmations: number;
  opportunities: number;
  decidedAt: string | null;
  evidence: EvidenceItem[];
  timeline: TimelineEntry[];
}

export interface PlanAmbition {
  id: string;
  title: string;
  state: AssumptionState;
  assumptions: PlanAssumption[];
}

export interface PlanStatus {
  ambitions: PlanAmbition[];
  totals: { assumptions: number; stable: number; watch: number; reconsider: number; confirmations: number; opportunities: number };
  // How many developments were weighed against the person's plan, and how many of those were set aside.
  checked: number;
  setAside: number;
}

interface AmbitionRow {
  id: string;
  title: string;
}

interface AssumptionRecord {
  id: string;
  ambition_id: string;
  statement: string;
  decided_at: string | null;
  created_at: string;
}

interface SignalRecord {
  assumption_id: string;
  development_id: string;
  effect: SignalEffect;
  reason: string;
  reconsider: string | null;
  publisher_count: number;
  occurred_at: string;
  created_at: string;
  developments: { headline: string } | null;
}

interface DecisionRecord {
  assumption_id: string;
  decision: Decision;
  created_at: string;
}

const EFFECT_ORDER: Record<SignalEffect, number> = { challenges: 0, opportunity: 1, supports: 2 };

const RANK: Record<AssumptionState, number> = { stable: 0, watch: 1, reconsider: 2 };

const DECISION_TEXT: Record<Decision, string> = {
  keep: 'You said it is still true',
  dismiss: 'You ignored this news',
  change_plan: 'You decided to change your plan',
};

const EFFECT_TEXT: Record<SignalEffect, string> = {
  challenges: 'Bad news',
  supports: 'Good news',
  opportunity: 'New chance',
};

function worst(states: AssumptionState[]): AssumptionState {
  return states.reduce<AssumptionState>((a, b) => (RANK[b] > RANK[a] ? b : a), 'stable');
}

function buildAssumption(
  record: AssumptionRecord,
  signals: SignalRecord[],
  decisions: DecisionRecord[],
  sources: Map<string, Array<{ name: string; url: string }>>,
): PlanAssumption {
  const belief = deriveBelief(signals.map((s) => toSignal({ development_id: s.development_id, effect: s.effect, publisher_count: s.publisher_count, created_at: s.created_at })), record.decided_at);
  const baseline = record.decided_at ? new Date(record.decided_at).getTime() : -Infinity;
  // Evidence against the assumption comes first, then opportunities, then confirmations; newest first within each.
  const ordered = [...signals].sort((a, b) => EFFECT_ORDER[a.effect] - EFFECT_ORDER[b.effect] || new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
  const evidence = ordered.slice(0, EVIDENCE_PER_ASSUMPTION).map((s): EvidenceItem => ({
    developmentId: s.development_id,
    effect: s.effect,
    reason: s.reason,
    reconsider: s.reconsider,
    headline: s.developments?.headline ?? '',
    occurredAt: s.occurred_at,
    publisherCount: s.publisher_count,
    counts: new Date(s.created_at).getTime() > baseline,
    sources: sources.get(s.development_id) ?? [],
  }));
  const timeline: TimelineEntry[] = [
    { at: record.created_at, kind: 'recorded' as const, text: 'You added this' },
    ...signals.map((s): TimelineEntry => ({ at: s.occurred_at, kind: 'evidence', effect: s.effect, text: `${EFFECT_TEXT[s.effect]}: ${s.developments?.headline ?? ''}` })),
    ...decisions.map((d): TimelineEntry => ({ at: d.created_at, kind: 'decision', decision: d.decision, text: DECISION_TEXT[d.decision] })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, TIMELINE_LIMIT);
  return { id: record.id, statement: record.statement, ...belief, decidedAt: record.decided_at, evidence, timeline };
}

export async function getPlanStatus(userId: string): Promise<PlanStatus> {
  const [ambitions, assumptions, signals, decisions, lens] = await Promise.all([
    supabase.from('ambitions').select('id, title').eq('user_id', userId).eq('status', 'active').order('priority', { ascending: true }).returns<AmbitionRow[]>(),
    supabase.from('ambition_assumptions').select('id, ambition_id, statement, decided_at, created_at').eq('user_id', userId).order('created_at', { ascending: true }).returns<AssumptionRecord[]>(),
    supabase
      .from('assumption_signals')
      .select('assumption_id, development_id, effect, reason, reconsider, publisher_count, occurred_at, created_at, developments(headline)')
      .eq('user_id', userId)
      .order('occurred_at', { ascending: false })
      .returns<SignalRecord[]>(),
    supabase.from('assumption_decisions').select('assumption_id, decision, created_at').eq('user_id', userId).order('created_at', { ascending: false }).returns<DecisionRecord[]>(),
    getLens(userId),
  ]);
  const signalRows = unwrap('plan.signals', signals);
  const decisionRows = unwrap('plan.decisions', decisions);
  const sources = await loadSources([...new Set(signalRows.map((s) => s.development_id))]);
  const sourceList = new Map([...sources].map(([id, list]) => [id, list.map((s) => ({ name: s.name, url: s.url }))]));

  const byAssumption = <T extends { assumption_id: string }>(rows: T[], id: string) => rows.filter((r) => r.assumption_id === id);
  const planAssumptions = unwrap('plan.assumptions', assumptions).map((a) => ({
    ambitionId: a.ambition_id,
    assumption: buildAssumption(a, byAssumption(signalRows, a.id), byAssumption(decisionRows, a.id), sourceList),
  }));

  const planAmbitions = unwrap('plan.ambitions', ambitions).map((a): PlanAmbition => {
    const own = planAssumptions.filter((p) => p.ambitionId === a.id).map((p) => p.assumption);
    return { id: a.id, title: a.title, state: worst(own.map((o) => o.state)), assumptions: own };
  });
  const all = planAmbitions.flatMap((a) => a.assumptions);
  const count = (state: AssumptionState) => all.filter((a) => a.state === state).length;

  return {
    ambitions: planAmbitions,
    totals: {
      assumptions: all.length,
      stable: count('stable'),
      watch: count('watch'),
      reconsider: count('reconsider'),
      confirmations: all.reduce((n, a) => n + a.confirmations, 0),
      opportunities: all.reduce((n, a) => n + a.opportunities, 0),
    },
    checked: lens.funnel.checked,
    setAside: lens.funnel.checked - lens.funnel.shown,
  };
}

