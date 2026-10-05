import { z } from 'zod';
import { UNTRUSTED_NOTICE, sanitizeUntrusted, untrusted } from './guard';
import { generateStructured } from '../lib/gemini';
import { CONTINUITY } from '../domain/types';

// All model prompts live here, away from business logic. Every task returns schema-validated data.

const GROUNDING =
  'Rules: use only the facts given below. Never invent facts, dates, sources, numbers, names or relationships. If the input does not support a statement, leave it out.';

// ---------------------------------------------------------------
// Ambition profile
// ---------------------------------------------------------------
const AmbitionProfileSchema = z.object({
  sector: z.string(),
  geography: z.array(z.string()),
  target_market: z.string(),
  time_horizon: z.string(),
  goals: z.array(z.string()).max(6),
  search_concepts: z.array(z.string().min(3)).min(2).max(5),
});
export type AmbitionProfile = z.infer<typeof AmbitionProfileSchema>;

export function extractAmbitionProfile(input: {
  ambition: string;
  role: string;
  activity: string;
  geography: string;
  assumptions?: string[];
}): Promise<AmbitionProfile> {
  return generateStructured(
    'extractAmbitionProfile',
    `You prepare a news-monitoring profile for one person's ambition.
${GROUNDING}
Return search_concepts: 3 to 5 short news search queries that would surface real-world developments affecting this ambition. News search requires every word to appear, so keep each query to 1 or 2 plain words (a third only for a proper name or place) and use the words headlines actually use: "tech layoffs" and "AI jobs" find many articles, "software engineer salary trends" finds almost none. Cover the person's own field and the forces around it (market, policy, technology, funding). No operators or quotes.
When assumptions are listed, at least one query must cover what one of them depends on, so a development that could break it can be found.

Role: ${input.role}
Current activity: ${input.activity}
Ambition: ${input.ambition}
Geography: ${input.geography || 'not specified'}
Assumptions the plan depends on: ${input.assumptions && input.assumptions.length > 0 ? JSON.stringify(input.assumptions) : 'none stated'}`,
    AmbitionProfileSchema,
  );
}

// ---------------------------------------------------------------
// Story resolution: does a new article belong to an existing story?
// ---------------------------------------------------------------
export const STORY_CATEGORIES = [
  'technology',
  'business',
  'economy',
  'policy',
  'geopolitics',
  'science',
  'career',
  'markets',
  'other',
] as const;

const StoryResolutionSchema = z.object({
  relationship: z.enum(['same_story', 'new_story']),
  story_id: z.string().nullable(),
  title: z.string().min(3),
  summary: z.string().min(3),
  category: z.enum(STORY_CATEGORIES),
  geography: z.string(),
  entities: z.array(z.string()).max(8),
});
export type StoryResolution = z.infer<typeof StoryResolutionSchema>;

export interface StoryCandidate {
  id: string;
  title: string;
  summary: string | null;
  latestState: string | null;
}

export function resolveStory(
  article: { title: string; snippet: string | null; publisher: string },
  candidates: StoryCandidate[],
): Promise<StoryResolution> {
  return generateStructured(
    'resolveStory',
    `You decide whether a news article continues an existing real-world story or starts a new one.
${GROUNDING}
Choose same_story only when the article is about the same specific event or storyline as a candidate (same actors and subject), not merely the same broad topic. When same_story, set story_id to the candidate's id and repeat its title. When new_story, set story_id to null and write a neutral title and a one-sentence summary that restate only what the headline and description say.
geography is a country or region name, or "Global".
${UNTRUSTED_NOTICE}

${untrusted('article', sanitizeUntrusted(JSON.stringify({ headline: article.title, description: article.snippet ?? 'none provided', publisher: article.publisher }), 1200))}

Candidate stories (news content): ${untrusted('candidates', sanitizeUntrusted(JSON.stringify(candidates), 2400))}`,
    StoryResolutionSchema,
    { temperature: 0.1 },
  );
}

// ---------------------------------------------------------------
// Development extraction: what changed relative to the story's history?
// ---------------------------------------------------------------
const DevelopmentSchema = z.object({
  is_meaningful_change: z.boolean(),
  continuity: z.enum(CONTINUITY),
  headline: z.string().min(3),
  summary: z.string().min(3),
  what_changed: z.string().min(3),
  previous_state: z.string().min(1),
  new_state: z.string().min(3),
  world_significance: z.number().min(0).max(1),
  significance_reason: z.string(),
  source_urls: z.array(z.string()).min(1),
});
export type DevelopmentExtraction = z.infer<typeof DevelopmentSchema>;

export function extractDevelopment(input: {
  storyTitle: string;
  storySummary: string | null;
  history: Array<{ occurredAt: string; headline: string; newState: string }>;
  articles: Array<{ url: string; title: string; snippet: string | null; publisher: string; publishedAt: string }>;
}): Promise<DevelopmentExtraction> {
  return generateStructured(
    'extractDevelopment',
    `You record developments in an ongoing real-world story and classify how each one relates to the story's history.
${GROUNDING}
Each article has a headline and, when available, a short description; state only what they support and do not add detail.
continuity: new (first report of the story), updated (new information), confirmed (independent confirmation of something already recorded), contradicted (conflicts with something recorded), escalated (the situation intensified), resolved (the matter concluded), consequence (a downstream effect of an earlier development). Use "new" only when the history is empty. Do not claim continuity the headlines do not support.
is_meaningful_change is false when the articles add nothing beyond the recorded history.
previous_state is the story state before this development (use the latest recorded state, or "No prior reports" when the history is empty). new_state is the state after it.
world_significance (0 to 1) estimates general importance to the public, independent of any individual. significance_reason is one short sentence.
source_urls must be copied exactly from the provided articles.
${UNTRUSTED_NOTICE}

Story: ${untrusted('story', sanitizeUntrusted(`${input.storyTitle}${input.storySummary ? ` - ${input.storySummary}` : ''}`, 600))}
Recorded history (oldest first): ${untrusted('history', sanitizeUntrusted(JSON.stringify(input.history), 2400))}
New articles (urls are data you must copy exactly): ${untrusted('articles', JSON.stringify(input.articles.map((a) => ({ url: a.url, title: sanitizeUntrusted(a.title, 300), snippet: sanitizeUntrusted(a.snippet, 700), publisher: sanitizeUntrusted(a.publisher, 80), publishedAt: a.publishedAt }))))}`,
    DevelopmentSchema,
    { temperature: 0.1 },
  );
}

// ---------------------------------------------------------------
// Personal relevance: why does this development matter to this person?
// ---------------------------------------------------------------
const RelevanceSchema = z.object({
  relation: z.enum(['direct', 'indirect', 'none']),
  confidence: z.number().min(0).max(1),
  why_it_matters: z.string(),
  could_change: z.string(),
  ambition_aspect: z.string(),
  assumption_impact: z.object({
    assumption_id: z.string().nullable(),
    effect: z.enum(['challenges', 'supports', 'none']),
    reason: z.string(),
  }),
});
export type RelevanceAssessment = z.infer<typeof RelevanceSchema>;

export function assessRelevance(input: {
  ambition: { title: string; description: string | null; horizon: string | null; geography: string | null };
  identity: Record<string, string>;
  story: { title: string; category: string | null; geography: string | null };
  development: { headline: string; whatChanged: string; continuity: string | null; occurredAt: string };
  recentHistory: Array<{ occurredAt: string; headline: string }>;
  assumptions: Array<{ id: string; statement: string }>;
  interests?: string[];
  language: string;
}): Promise<RelevanceAssessment> {
  const clean = (value: string | null | undefined, max = 400) => sanitizeUntrusted(value, max);
  const ambition = {
    title: clean(input.ambition.title, 200),
    description: clean(input.ambition.description, 500),
    horizon: clean(input.ambition.horizon, 80),
    geography: clean(input.ambition.geography, 120),
  };
  return generateStructured(
    'assessRelevance',
    `You decide whether a real-world development genuinely matters to one person, using only the facts below.
${GROUNDING}
${UNTRUSTED_NOTICE}
relation: direct (it plausibly changes conditions the ambition depends on: market, rules, costs, demand, competition, funding, skills, supply or timing), indirect (a clear second-order effect that you can state in one concrete sentence), none (everything else). Topical overlap is not a link: the same industry, the same buzzwords or the same company names do not make a development matter. An article about an investment forum in another country does not matter to a software engineer's pay. Prefer "none" over a stretched connection.
When relation is not "none", why_it_matters is 2 or 3 plain sentences addressed to the person ("you"). The first states the specific fact in the development that matters. The next connect it to a specific part of their ambition, time horizon or situation and say what it could change and why. Never say that they asked to follow something, never offer their stated topics as the reason, and never write a generic line such as "this may affect your plans". If you cannot write it concretely from the facts given, relation is "none". It must not state outcomes as certain; say "could" or "may" for effects. When relation is "none", why_it_matters is an empty string.
could_change is one short sentence that opens with the equivalent of "This could" or "This may" in the output language that states the most plausible concrete consequence for the ambition, using only the facts given. It must not contain numbers, prices or dates that are not in the input, and must not recommend an action. When relation is "none", could_change is an empty string.
Write why_it_matters and could_change in ${input.language}. Every other rule still applies in that language.
ambition_aspect is the short phrase from the ambition that the development touches, or an empty string.
assumption_impact checks the development against the person's stated assumptions (listed below with ids). Use effect "challenges" only when the development gives a specific, supportable reason to doubt one assumption, "supports" only when it gives a specific reason to keep it, and "none" otherwise; when effect is not "none", set assumption_id to the id of that one assumption (copied exactly) and write reason as one plain sentence in ${input.language} naming what changed. When there are no assumptions, relation is "none", or the link is only topical, use effect "none", assumption_id null and an empty reason.

Ambition: ${JSON.stringify(ambition)}
Known facts about the person: ${JSON.stringify(input.identity)}
Topics the person said they follow (context only; matching a topic is not enough): ${JSON.stringify((input.interests ?? []).map((i) => clean(i, 80)))}
Story and development (news content): ${untrusted('story', clean(JSON.stringify(input.story), 600))}
${untrusted('development', clean(JSON.stringify(input.development), 1600))}
Earlier developments in this story: ${untrusted('history', clean(JSON.stringify(input.recentHistory), 900))}
Person's stated assumptions (JSON): ${JSON.stringify(input.assumptions.map((a) => ({ id: a.id, statement: clean(a.statement, 240) })))}`,
    RelevanceSchema,
    { temperature: 0.1 },
  );
}

// ---------------------------------------------------------------
// Unavoidable world events: important to everyone, but only shown with a concrete effect on this person
// ---------------------------------------------------------------
const MustKnowSchema = z.object({
  events: z.array(
    z.object({
      index: z.number().int().min(1),
      must_know: z.boolean(),
      why_it_matters: z.string(),
      could_change: z.string(),
    }),
  ),
});
export type MustKnowVerdict = z.infer<typeof MustKnowSchema>['events'][number];

export async function assessMustKnowEvents(input: {
  ambitions: Array<{ title: string; description: string | null; horizon: string | null; geography: string | null }>;
  identity: Record<string, string>;
  events: Array<{ headline: string; whatChanged: string; why: string | null }>;
  language: string;
}): Promise<MustKnowVerdict[]> {
  const clean = (value: string | null | undefined, max: number) => sanitizeUntrusted(value, max);
  const ambitions = input.ambitions.map((a) => ({ title: clean(a.title, 200), description: clean(a.description, 400), horizon: clean(a.horizon, 80), geography: clean(a.geography, 120) }));
  const events = input.events.map((e, i) => untrusted(`event ${i + 1}`, clean(JSON.stringify({ headline: e.headline, what_changed: e.whatChanged, why_significant: e.why }), 900)));
  const result = await generateStructured(
    'assessMustKnowEvents',
    `You decide which world events are unavoidable for one specific person: events that an informed person in their position cannot responsibly ignore because they change the economy, jobs and pay, safety, law, the technology everyone depends on, or the markets their plan operates in.
${GROUNDING}
${UNTRUSTED_NOTICE}
For each numbered event, must_know is true only when you can state a concrete, specific effect on THIS person's situation (their role, region or ambition) in two or three sentences. World importance alone is not enough; "this is big news" is not a reason. At most three events may be true. For events that are false, why_it_matters and could_change are empty strings.
why_it_matters for a true event is 2 or 3 plain sentences addressed to the person ("you"): the specific fact first, then the specific effect on their situation. Never say they asked to follow anything and never write a generic line.
could_change is one short hedged sentence ("This could..." or "This may...", in the output language) with no numbers that are not in the input.
Write both in ${input.language}.

Person's ambitions: ${JSON.stringify(ambitions)}
Known facts about the person: ${JSON.stringify(input.identity)}
Events:
${events.join('\n')}`,
    MustKnowSchema,
    { temperature: 0.1 },
  );
  return result.events;
}

// ---------------------------------------------------------------
// Spoken briefing script: what the voice agent says, written once per refresh
// ---------------------------------------------------------------
const ChapterScriptSchema = z.object({
  facts: z.string().min(1),
  sides: z.string().min(1),
  for_you: z.string().min(1),
});
export type ChapterScriptParts = z.infer<typeof ChapterScriptSchema>;

export interface ScriptListener {
  name: string;
  role: string | null;
  activity: string | null;
  geography: string | null;
  ambitions: Array<{ title: string; description: string | null; horizon: string | null; geography: string | null }>;
}

export function writeChapterScript(input: {
  listener: ScriptListener;
  language: string;
  wordsPerPart: number;
  kind: 'ambition' | 'world';
  headline: string;
  summary: string | null;
  whatChanged: string | null;
  continuity: string | null;
  date: string;
  outlets: string[];
  history: Array<{ date: string; headline: string; whatChanged: string }>;
  why: string | null;
  couldChange: string | null;
  assumption: { statement: string; note: string } | null;
  nextTitle: string | null;
}): Promise<ChapterScriptParts> {
  const clean = (value: string | null | undefined, max: number) => sanitizeUntrusted(value, max);
  const listener = {
    name: clean(input.listener.name, 60),
    role: clean(input.listener.role, 100),
    activity: clean(input.listener.activity, 200),
    geography: clean(input.listener.geography, 100),
    ambitions: input.listener.ambitions.map((a) => ({ title: clean(a.title, 200), description: clean(a.description, 400), horizon: clean(a.horizon, 80), geography: clean(a.geography, 100) })),
  };
  const story = {
    kind: input.kind === 'world' ? 'an unavoidable world event, not about their field' : "a development linked to the person's ambition",
    headline: clean(input.headline, 240),
    reported_summary: clean(input.summary, 700),
    what_changed: clean(input.whatChanged, 700),
    development_type: input.continuity,
    date: input.date,
    reported_by: input.outlets.map((o) => clean(o, 60)),
    earlier_history: input.history.map((h) => ({ date: h.date, headline: clean(h.headline, 160), what_changed: clean(h.whatChanged, 300) })),
    stored_assessment_of_why_it_matters: clean(input.why, 600),
    stored_possible_effect: clean(input.couldChange, 400),
    stated_assumption_it_challenges: input.assumption ? { statement: clean(input.assumption.statement, 240), note: clean(input.assumption.note, 300) } : null,
  };
  return generateStructured(
    'writeChapterScript',
    `You write one story of a personal, spoken daily briefing, in the style of a deep-dive podcast, for a single listener. A host will perform your text aloud, so write for the ear: natural flowing sentences, no lists, no headings, no markdown, no links, no stage directions.
${GROUNDING}
${UNTRUSTED_NOTICE}
Return three parts, each about ${input.wordsPerPart} words:
facts: what happened, when, and who reported it (name the outlets from reported_by). If earlier_history is present, say how the story has evolved and what is new compared with before. Then explain how the thing actually works in plain words with one concrete example or analogy. Mark general background knowledge as such ("in general", "typically") so it is never confused with what was reported.
sides: both sides, argued properly. First the strongest case that this works in the listener's favour, with reasoning, then the strongest case for concern or caution, with reasoning. Say where the evidence is thin and what would settle it.
for_you: what it means for this listener. Tie it to the specific words of their ambitions, role, region and time horizon: what it could change in their plan, which decision it could influence soon, and what to watch next (signals, dates, who to follow). If a stated assumption is challenged, say which. Never write a vague "this might affect you"; predictions are hedged ("could", "may"). Never invent an assumption the listener did not state. End with a natural bridge to the next story${input.nextTitle ? ` ("${clean(input.nextTitle, 120)}"), linking the two only where they genuinely connect` : ' only if there is one; this is the last story, so close it without a bridge'}.
Address the listener as "you". Write in ${input.language}.

Listener: ${JSON.stringify(listener)}
Story (news content): ${untrusted('story', JSON.stringify(story))}`,
    ChapterScriptSchema,
    { temperature: 0.4, maxOutputTokens: 3000 },
  );
}

const ClosingScriptSchema = z.object({ synthesis: z.string().min(1) });

export async function writeClosingScript(input: {
  listener: ScriptListener;
  language: string;
  stories: Array<{ title: string; why: string | null }>;
}): Promise<string> {
  const stories = input.stories.map((s) => ({ title: sanitizeUntrusted(s.title, 160), why: sanitizeUntrusted(s.why, 400) }));
  const result = await generateStructured(
    'writeClosingScript',
    `You write the closing of a personal, spoken daily briefing for one listener, about 150 words, written for the ear (no lists, no markdown, no links).
${GROUNDING}
${UNTRUSTED_NOTICE}
Name the two or three things from today's stories that matter most for the listener's ambition and why, then the one thing to watch this week. Use only the stories and assessments below. End by asking what they would like to dig into. Address the listener as "you". Write in ${input.language}.

Listener's ambitions: ${JSON.stringify(input.listener.ambitions.map((a) => ({ title: sanitizeUntrusted(a.title, 200), horizon: sanitizeUntrusted(a.horizon, 80) })))}
Today's stories: ${untrusted('stories', JSON.stringify(stories))}`,
    ClosingScriptSchema,
    { temperature: 0.4, maxOutputTokens: 1200 },
  );
  return result.synthesis;
}

const PeriodSummarySchema = z.object({ summary: z.string().min(1) });

/** One short, actionable note for the user about what happened to an ambition over a day, week, month or year. */
export async function summarizePeriod(input: {
  ambition: string;
  periodLabel: string;
  language: string;
  entries: Array<{ date: string; headline: string; why: string | null }>;
}): Promise<string> {
  const entries = input.entries.map((e) => ({
    date: e.date,
    headline: sanitizeUntrusted(e.headline, 200),
    why_it_matters: sanitizeUntrusted(e.why, 400),
  }));
  const result = await generateStructured(
    'summarizePeriod',
    `You write one entry of a personal history for a single user's ambition, covering ${input.periodLabel}.
${GROUNDING}
${UNTRUSTED_NOTICE}
All the developments below were delivered to the user in that period. Write one combined note of at most 3 short sentences that covers the whole set: what changed overall for this ambition, then the one thing the user should do or watch next. Do not list the developments one by one. Use only the developments below; if they do not support a concrete action, say what to keep watching instead. No lists, no markdown, no links. Address the user as "you". Write in ${input.language}.

Ambition: ${sanitizeUntrusted(input.ambition, 200)}
Developments (news content): ${untrusted('developments', JSON.stringify(entries))}`,
    PeriodSummarySchema,
    { temperature: 0.2, maxOutputTokens: 600 },
  );
  return result.summary;
}

// ---------------------------------------------------------------
// Voice session summary
// ---------------------------------------------------------------
const SessionSummarySchema = z.object({
  summary: z.string(),
  key_points: z.array(z.string()).max(6),
  next_steps: z
    .array(z.object({ title: z.string(), description: z.string(), priority: z.enum(['high', 'medium', 'next']) }))
    .max(5),
});
export type SessionSummary = z.infer<typeof SessionSummarySchema>;

export function summarizeSession(transcript: Array<{ role: 'user' | 'agent'; text: string }>): Promise<SessionSummary> {
  const lines = transcript.map((t) => `${t.role === 'user' ? 'User' : 'Agent'}: ${t.text}`).join('\n');
  return generateStructured(
    'summarizeSession',
    `Summarize this voice conversation between a user and the Ambition Gazette briefing agent.
${GROUNDING}
Only include key points and next steps that were actually discussed or explicitly agreed in the conversation. If nothing actionable was discussed, return an empty next_steps array. summary is 2 to 3 sentences.

Conversation:
${lines}`,
    SessionSummarySchema,
    { temperature: 0.1 },
  );
}
