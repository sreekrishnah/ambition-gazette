// Response shapes of docs/API.md. Only fields the UI reads are typed.

export type Continuity =
  | "new"
  | "updated"
  | "confirmed"
  | "contradicted"
  | "escalated"
  | "resolved"
  | "consequence";

export type RelevanceBasis =
  | "temporary_interest"
  | "preference"
  | "ambition"
  | "tracked"
  | "interest"
  | "recent_interest"
  | "general";

export type Attention = "act" | "know" | "fyi";

export type EvidenceStrength = "single_source" | "corroborated" | "widely_reported";

export type PipelineStatus = "IDLE" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface Ambition {
  id: string;
  title: string;
  description: string | null;
  horizon: string | null;
  geography: string | null;
  priority: 1 | 2 | 3;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface BriefingSource {
  name: string;
  url: string;
  title: string | null;
  publishedAt: string | null;
}

export interface BriefingItem {
  id: string;
  developmentId: string;
  storyId: string;
  storyTitle: string;
  headline: string;
  summary: string;
  whatChanged: string | null;
  continuity: Continuity;
  whyItMatters: string | null;
  couldChange: string | null;
  relevanceBasis: RelevanceBasis;
  relevanceScore: number;
  attention: Attention;
  assumption: { id: string; statement: string; note: string; reconsider: string | null; effect: AssumptionEffect } | null;
  evidenceStrength: EvidenceStrength | null;
  worldSignificance: number | null;
  ambitionId: string | null;
  ambitionTitle: string | null;
  occurredAt: string;
  category: string | null;
  geography: string | null;
  sources: BriefingSource[];
  imageUrl: string | null;
  tracked: boolean;
}

export interface TrackedStory {
  id: string;
  storyId: string;
  title: string;
  summary: string | null;
  category: string | null;
  trackedAt: string;
  latestHeadline: string | null;
  latestAt: string | null;
  hasUpdates: boolean;
}

export interface DashboardResponse {
  success: true;
  state: "no_ambition" | "no_developments" | "ready";
  user: { fullName: string | null };
  ambitions: Ambition[];
  briefing: { reportId: string | null; date: string | null; generatedAt: string | null };
  items: BriefingItem[];
  trackedStories: TrackedStory[];
  pipeline: { status: PipelineStatus; lastRunAt: string | null; error: string | null; progress: string | null };
}

export interface AmbitionProfile {
  role: string | null;
  activity: string | null;
  depth: string | null;
  geographyFocus: string | null;
  topics: string[];
  bidiLanguage: string | null;
  reportLanguage: string | null;
}

export interface AmbitionsResponse {
  success: true;
  ambitions: Ambition[];
  profile: AmbitionProfile | null;
}

export interface MemoryItem {
  id: string;
  kind: string;
  topic: string;
  strength: number | null;
  source: "explicit" | "inferred" | "onboarding";
  temporary: boolean;
  expiresAt: string | null;
  status: "active" | "archived";
}

export interface MemoryResponse {
  success: true;
  identity: MemoryItem[];
  interests: MemoryItem[];
  suppressions: MemoryItem[];
  tracked: MemoryItem[];
}

export interface PipelineRunResponse {
  success: true;
  jobId: string;
}

export interface PipelineStatusResponse {
  success: true;
  status: PipelineStatus;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  progress: string | null;
}

export interface VoiceUsage {
  sessionsUsed: number;
  sessionsLimit: number;
  tokensUsed: number;
  tokensLimit: number;
}

export interface VoiceUsageResponse {
  success: true;
  usage: VoiceUsage;
}

export type NextStepPriority = "High Priority" | "Medium Priority" | "Next Step";

export interface AgentSession {
  id: string;
  endedAt: string;
  summary: string;
  keyPoints: string[];
  sources: { name: string; url: string; title: string | null }[];
  nextSteps: { id: string; title: string; description: string; priority: NextStepPriority }[];
}

export interface AgentDaySummary {
  date: string;
  items: number;
}

export interface AgentDaysResponse {
  success: true;
  days: AgentDaySummary[];
}

export interface AgentDay {
  date: string;
  generatedAt: string | null;
  items: BriefingItem[];
  closing: string | null;
  sessions: AgentSession[];
}

export interface AgentDayResponse {
  success: true;
  day: AgentDay;
}

export interface WsTokenResponse {
  success: true;
  token: string;
  expiresInSec: number;
}

export type ItemFeedbackType = "relevant" | "already_know" | "not_relevant";

export interface FeedbackPayload {
  storyId?: string;
  developmentId?: string;
  reportItemId?: string;
  feedbackType: ItemFeedbackType;
}

export interface LensItem {
  developmentId: string;
  storyId: string;
  headline: string;
  storyTitle: string;
  worldSignificance: number | null;
  personalRelevance: number;
}

export interface HiddenItem {
  developmentId: string;
  storyId: string;
  headline: string;
  storyTitle: string;
  reason: string;
  memoryId: string | null;
}

export interface LearningEvent {
  id: string;
  createdAt: string;
  storyTitle: string | null;
  effect: string;
  reason: string | null;
}

export interface MovedUpItem {
  developmentId: string;
  headline: string;
  basis: RelevanceBasis;
}

export interface Funnel {
  checked: number;
  shown: number;
  important: number;
  needsAttention: number;
}

export interface Lens {
  checked: number;
  setAside: number;
  funnel: Funnel;
  bigInWorld: LensItem[];
  quietButYours: LensItem[];
  hidden: HiddenItem[];
  learning: { events: LearningEvent[]; movedUp: MovedUpItem[] };
}

export interface LensResponse {
  success: true;
  lens: Lens;
}

export interface TimelineDevelopment {
  id: string;
  dayNumber: number;
  headline: string;
  whatChanged: string;
  continuity: Continuity | null;
  occurredAt: string;
  sources: { name: string; url: string; title: string | null }[];
}

export interface StoryTimelineResponse {
  success: true;
  story: { id: string; title: string };
  developments: TimelineDevelopment[];
}

export type AssumptionState = "stable" | "watch" | "reconsider";
export type AssumptionEffect = "challenges" | "supports" | "opportunity";
export type AssumptionDecision = "keep" | "dismiss" | "change_plan";

export interface Assumption {
  id: string;
  statement: string;
  status: "holding" | "watch" | "challenged";
  state: AssumptionState;
  decidedAt: string | null;
  challengedAt: string | null;
  challengeReason: string | null;
  createdAt: string;
}

export interface EvolutionEntry {
  developmentId: string;
  storyId: string;
  storyTitle: string;
  headline: string;
  continuity: Continuity | null;
  occurredAt: string;
  fetchedOn: string;
  whyItMatters: string | null;
  attention: Attention | null;
}

export interface Evolution {
  ambitionId: string;
  quiet: {
    lastCheckedAt: string | null;
    observedDays: number;
    windowDays: number;
    linkedInWindow: number;
    lastLinkedAt: string | null;
  };
  changedUnderstanding: {
    assumptionId: string;
    statement: string;
    challengedAt: string | null;
    reason: string | null;
    headline: string | null;
  }[];
  periods: EvolutionPeriod[];
}

export type EvolutionPeriodKind = "day" | "week" | "month" | "year";

export interface EvolutionPeriod {
  period: EvolutionPeriodKind;
  start: string;
  summary: string | null;
  developments: EvolutionEntry[];
}

export interface PlanEvidence {
  developmentId: string;
  effect: AssumptionEffect;
  reason: string;
  reconsider: string | null;
  headline: string;
  occurredAt: string;
  publisherCount: number;
  counts: boolean;
  sources: Array<{ name: string; url: string }>;
}

export interface PlanTimelineEntry {
  at: string;
  kind: "recorded" | "evidence" | "decision";
  effect?: AssumptionEffect;
  decision?: AssumptionDecision;
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
  evidence: PlanEvidence[];
  timeline: PlanTimelineEntry[];
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
  checked: number;
  setAside: number;
}

export interface AssumptionSuggestion {
  area: string;
  statement: string;
}
