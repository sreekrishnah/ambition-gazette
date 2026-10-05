// Prepares three demo accounts (student, career switcher, founder) from real news so every screen has data.
// Personas, ambitions and assumptions are fictional; every article, source and date comes from the news providers.
// Usage: start the API (npm run dev), then npm run seed:demo [-- mery|joe|ananya] [--build-only] [--refetch]. Safe to run again.
// Fetched news is saved to scripts/.seed-cache first and ingested from there, so a re-run never spends news quota again.
// --refetch downloads fresh news; --build-only skips fetching and ingesting and only rebuilds the briefings.
import '../src/config/env';
import fs from 'fs';
import path from 'path';
import { runPatiently } from '../src/lib/gemini';
import { NewsArticle } from '../src/lib/news';
import { supabase } from '../src/lib/supabase';
import { ingestArticles } from '../src/services/ingest';
import { buildBriefing } from '../src/services/briefing';
import { refreshHistory } from '../src/services/evolution';
import { collectNews, searchConcepts } from '../src/services/pipeline';
import { generateBriefingScript } from '../src/services/script';

const BASE = process.env.E2E_API_URL ?? 'http://localhost:5000';
const DEMO_PASSWORD = 'Gazette-Demo-2026';
const CACHE_FILE = path.join(__dirname, '.seed-cache', 'news.json');

interface Persona {
  key: string;
  email: string;
  fullName: string;
  onboarding: {
    role: string;
    activity: string;
    ambition: string;
    direction: string;
    timeline: string;
    categories: string[];
    geography: string;
    depth: string;
    bidiLang: string;
    reportLang: string;
  };
  secondAmbition: { ambition: string; direction: string; timeline: string; categories: string[] };
  assumptions: string[];
  // Extra searches for personas whose ambition topics are thin in the general news; fetched once and cached per persona.
  extraQueries?: string[];
}

const PERSONAS: Persona[] = [
  {
    key: 'ananya',
    email: 'ananya.krishnan@ambitiongazette.demo',
    fullName: 'Ananya Krishnan',
    onboarding: {
      role: 'Student',
      activity: 'Final-year B.Tech Electronics student at Anna University, Chennai, working on an embedded vision project',
      ambition: 'Get into a fully funded MS in Robotics and AI at a top US or European university for Fall 2027',
      direction: 'Apply to eight programmes in the US, Germany and the Netherlands, with funding as the deciding factor',
      timeline: '12 months',
      categories: ['Higher education', 'Student visas', 'Research funding', 'Robotics'],
      geography: 'India, United States, Europe',
      depth: 'Concise',
      bidiLang: 'English',
      reportLang: 'English',
    },
    secondAmbition: {
      ambition: 'Publish a research paper on embedded vision for drones before applications open',
      direction: 'Target a workshop paper with my faculty guide',
      timeline: '6 months',
      categories: ['Computer vision', 'Drones', 'Research'],
    },
    assumptions: [
      'US F-1 visa appointments in India stay available in time for the fall intake',
      'GRE stays optional at the universities I am targeting',
      'Funded MS slots in robotics do not shrink next admission cycle',
    ],
    extraQueries: [
      'US student visa appointments India',
      'F-1 visa international students policy',
      'GRE test optional universities',
      'Indian students masters USA funding',
      'DAAD scholarship Indian students',
      'Germany masters robotics Indian students',
      'Netherlands scholarship masters Indian students',
      'robotics masters scholarship',
      'graduate research funding cuts international students',
    ],
  },
  {
    key: 'joe',
    email: 'joe.bradski@ambitiongazette.demo',
    fullName: 'Joe Bradski',
    onboarding: {
      role: 'Banking operations manager',
      activity: 'Nine years in retail banking operations in Mumbai, completing a machine learning certification in the evenings',
      ambition: 'Land a product manager role at an AI company within nine months',
      direction: 'Move from banking operations into AI product management, using fintech as the bridge',
      timeline: '9 months',
      categories: ['AI hiring', 'Product management', 'Fintech', 'Tech layoffs'],
      geography: 'India',
      depth: 'Detailed',
      bidiLang: 'English',
      reportLang: 'English',
    },
    secondAmbition: {
      ambition: 'Complete an AI and machine learning certification while working full time',
      direction: 'Finish a recognised programme and a shipped capstone project',
      timeline: '6 months',
      categories: ['AI education', 'Certifications'],
    },
    assumptions: [
      'Hiring for AI product roles in India keeps growing',
      'Employers accept non-engineers who can show a shipped project',
      'Banking and fintech remain a bridge sector into AI product work, not a dead end',
    ],
  },
  {
    key: 'mery',
    email: 'mery.george@ambitiongazette.demo',
    fullName: 'Mery George',
    onboarding: {
      role: 'Founder',
      activity: 'Founder of SunRoof Labs in Bengaluru, a former energy consultant planning a rooftop solar installation company',
      ambition: 'Launch a rooftop solar installation business for small commercial buildings in India',
      direction: 'Win the first twenty commercial rooftops in Karnataka and Tamil Nadu, then expand',
      timeline: '2 years',
      categories: ['Solar energy', 'Energy policy', 'Startup funding'],
      geography: 'India',
      depth: 'Detailed',
      bidiLang: 'English',
      reportLang: 'English',
    },
    secondAmbition: {
      ambition: 'Raise a seed round of INR 5 crore for SunRoof Labs',
      direction: 'Close the round with climate-focused investors in India',
      timeline: '12 months',
      categories: ['Startup funding', 'Climate investing'],
    },
    assumptions: [
      'PM Surya Ghar subsidies continue through 2027',
      'Import duty on solar modules does not rise sharply',
      'Net metering rules stay favourable for commercial buildings',
    ],
  },
];

interface Item {
  id: string;
  storyId: string;
  developmentId: string;
  headline: string;
  attention: string;
  tracked: boolean;
}

interface ApiJson {
  token?: string;
  user?: { id: string };
  hasAmbition?: boolean;
  ambitions?: { id: string; title: string; priority: number }[];
  ambitionId?: string;
  items?: Item[];
  error?: { code: string; message: string };
}

async function call(method: string, path: string, token: string | null, body?: unknown): Promise<{ status: number; json: ApiJson }> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as ApiJson };
}

function mustOk(label: string, res: { status: number; json: ApiJson }): void {
  if (res.status >= 400) throw new Error(`${label} failed: ${res.json.error?.message ?? res.status}`);
}

async function signIn(p: Persona): Promise<{ token: string; userId: string }> {
  const reg = await call('POST', '/auth/register', null, { email: p.email, password: DEMO_PASSWORD, fullName: p.fullName });
  const session = reg.status === 201 ? reg : await call('POST', '/auth/login', null, { email: p.email, password: DEMO_PASSWORD });
  if (!session.json.token || !session.json.user) throw new Error(`Could not sign in ${p.email} (status ${session.status}).`);
  return { token: session.json.token, userId: session.json.user.id };
}

// Model calls behind onboarding hit the free-tier rate limit; wait and retry instead of failing the seed.
async function callPatiently(method: string, path: string, token: string, body: unknown): Promise<{ status: number; json: ApiJson }> {
  let res = await call(method, path, token, body);
  for (let attempt = 1; attempt <= 6 && res.status >= 500; attempt += 1) {
    console.log(`  model busy, retrying in ${attempt * 20}s`);
    await new Promise((r) => setTimeout(r, attempt * 20_000));
    res = await call(method, path, token, body);
  }
  return res;
}

// Creates the two ambitions and the stated assumptions; a repeat run only adds what is missing.
async function setUpProfile(p: Persona, token: string): Promise<void> {
  const existing = (await call("GET", "/ambition", token)).json.ambitions ?? [];
  const ensure = async (title: string, body: unknown): Promise<string> => {
    const found = existing.find((a) => a.title === title);
    if (found) return found.id;
    const created = await callPatiently("POST", "/ambition", token, body);
    mustOk(`ambition "${title}"`, created);
    if (!created.json.ambitionId) throw new Error("Ambition id missing.");
    return created.json.ambitionId;
  };
  const firstId = await ensure(p.onboarding.ambition, p.onboarding);
  // Patching bumps updated_at, which would discard every cached relevance judgement, so only change what differs.
  const current = (await call("GET", "/ambition", token)).json.ambitions?.find((a) => a.id === firstId);
  if (current?.priority !== 1) mustOk("primary priority", await call("PATCH", `/ambition/${firstId}`, token, { priority: 1 }));

  await ensure(p.secondAmbition.ambition, {
    ...p.onboarding,
    ambition: p.secondAmbition.ambition,
    direction: p.secondAmbition.direction,
    timeline: p.secondAmbition.timeline,
    categories: p.secondAmbition.categories,
  });

  const have = (await call("GET", `/ambition/${firstId}/assumptions`, token)) as { status: number; json: { assumptions?: { statement: string }[] } };
  const known = new Set((have.json.assumptions ?? []).map((x) => x.statement));
  for (const statement of p.assumptions.filter((x) => !known.has(x))) {
    mustOk("assumption", await callPatiently("POST", `/ambition/${firstId}/assumptions`, token, { statement }));
  }
  console.log("  profile ready: 2 ambitions, " + p.assumptions.length + " assumptions");
}

// Dates are stored as ISO strings in the cache file and revived on load.
function readCache(file: string): NewsArticle[] | null {
  if (!fs.existsSync(file)) return null;
  const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<Omit<NewsArticle, 'publishedAt'> & { publishedAt: string }>;
  return rows.map((r) => ({ ...r, publishedAt: new Date(r.publishedAt) }));
}

function writeCache(file: string, articles: NewsArticle[]): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(articles));
  console.log(`  saved ${articles.length} articles to ${path.basename(file)}`);
}

// Fetch once, store, and reuse: a saved file is never downloaded again unless --refetch is passed.
async function fetchOnce(file: string, queries: string[], refetch: boolean): Promise<NewsArticle[]> {
  const cached = refetch ? null : readCache(file);
  if (cached) {
    console.log(`  using saved news ${path.basename(file)}: ${cached.length} articles (no news quota used)`);
    return cached;
  }
  const { articles, errors } = await collectNews(queries, (m) => console.log(`  ${m}`));
  if (errors.length > 0) console.warn(`  ${errors.length} searches failed`);
  if (articles.length === 0) throw new Error('No articles were returned by the news source. Try again later.');
  writeCache(file, articles);
  return articles;
}

async function loadNews(sessions: { persona: Persona; userId: string }[], refetch: boolean): Promise<NewsArticle[]> {
  const concepts = new Set<string>();
  for (const { userId } of sessions) for (const q of await searchConcepts(userId)) concepts.add(q);
  // The general file is only fetched when it does not exist yet; a persona-only run reuses it as is.
  const all = await fetchOnce(CACHE_FILE, [...concepts], refetch);
  for (const { persona } of sessions) {
    if (!persona.extraQueries) continue;
    all.push(...(await fetchOnce(path.join(path.dirname(CACHE_FILE), `news-${persona.key}.json`), persona.extraQueries, refetch)));
  }
  return all;
}

// Gives the learning strip, Lens and tracked stories real content from the user's own briefing.
async function applyFeedback(token: string): Promise<void> {
  const dash = await call('GET', '/dashboard', token);
  const items = dash.json.items ?? [];
  const seen = new Set<string>();
  // Items already tracked were handled by an earlier run, so feedback is not applied to them twice.
  const distinct = items.filter((i) => !i.tracked && (seen.has(i.storyId) ? false : (seen.add(i.storyId), true)));
  const plan: { type: string; track?: boolean }[] = [
    { type: 'relevant', track: true },
    { type: 'more_like_this', track: true },
    { type: 'already_know' },
    { type: 'relevant', track: true },
    { type: 'already_know' },
    { type: 'not_relevant' },
    { type: 'relevant', track: true },
  ];
  let applied = 0;
  for (const [index, item] of distinct.slice(0, plan.length).entries()) {
    const step = plan[index];
    const body = { storyId: item.storyId, developmentId: item.developmentId, reportItemId: item.id, feedbackType: step.type };
    mustOk(`feedback ${step.type}`, await call('POST', '/feedback', token, body));
    if (step.track) mustOk('track', await call('POST', '/story/track', token, { storyId: item.storyId }));
    applied += 1;
  }
  console.log(`  feedback applied to ${applied} items`);
}

async function reportDepth(): Promise<void> {
  const { data, error } = await supabase.from('developments').select('story_id');
  if (error) throw new Error(`Could not read developments: ${error.message}`);
  const perStory = new Map<string, number>();
  for (const row of data ?? []) perStory.set(row.story_id as string, (perStory.get(row.story_id as string) ?? 0) + 1);
  const depths = [...perStory.values()].sort((a, b) => b - a);
  console.log(`stories: ${depths.length}, with 2+ developments: ${depths.filter((d) => d > 1).length}, deepest: ${depths[0] ?? 0}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const buildOnly = args.includes('--build-only');
  const refetch = args.includes('--refetch');
  const only = args.find((a) => !a.startsWith('--'));
  const selected = only ? PERSONAS.filter((p) => p.key === only) : PERSONAS;
  if (selected.length === 0) throw new Error(`Unknown persona "${only}". Use ananya, joe or mery.`);

  const sessions: { persona: Persona; token: string; userId: string }[] = [];
  for (const persona of selected) {
    console.log(`${persona.fullName}`);
    const { token, userId } = await signIn(persona);
    await setUpProfile(persona, token);
    sessions.push({ persona, token, userId });
  }

  const userIds = sessions.map((s) => s.userId);
  // Patient mode waits out Gemini per-minute limits instead of failing on the first 429, as a pipeline run does.
  await runPatiently(async () => {
    if (!buildOnly) {
      // Ingesting is resumable: stories already stored are skipped, so a crash here loses nothing fetched.
      const articles = await loadNews(sessions, refetch);
      const stats = await ingestArticles(articles, (done, total) => {
        if (done % 10 === 0) console.log(`  Reading and sorting articles (${done} of ${total})`);
      });
      console.log(`ingested: ${JSON.stringify(stats)}`);
      await reportDepth();
    }
    for (const userId of userIds) {
      const built = await buildBriefing(userId, { onProgress: (m) => console.log(`  ${m}`) });
      console.log(`briefing built: ${built.items} items`);
      await generateBriefingScript(userId);
      await refreshHistory(userId);
    }
  });

  for (const { persona, token } of sessions) {
    console.log(`${persona.fullName}`);
    await applyFeedback(token);
  }
  console.log(`done. Sign in with any seeded email and the shared demo password.`);
}

main().catch((err: unknown) => {
  const code = (err as { code?: string } | null)?.code;
  if (code === 'EMBEDDING_UNAVAILABLE' || code === 'MODEL_UNAVAILABLE') {
    // Saved news, stored stories and cached judgements are kept, so the same command resumes from here.
    console.error('Stopped: a Gemini limit was reached. Nothing is lost; run npm run seed:demo again later to resume.');
  } else {
    console.error(err);
  }
  process.exit(1);
});
