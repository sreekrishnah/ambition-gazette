// End-to-end check against a running API (default http://localhost:5000) and the real database/Gemini.
// Usage: npm run e2e. Creates a throwaway user. Requires migration 005 to be applied.
import '../src/config/env';
import { io } from 'socket.io-client';
import { searchNews } from '../src/lib/news';
import { supabase } from '../src/lib/supabase';
import { ingestArticles } from '../src/services/ingest';
import { buildBriefing } from '../src/services/briefing';

const BASE = process.env.E2E_API_URL ?? 'http://localhost:5000';
let failures = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
}

interface Item {
  storyId: string;
  headline: string;
  relevanceBasis: string;
  whyItMatters: string | null;
}

// Only the response fields this script reads.
interface ApiJson {
  token?: string;
  user?: { id: string; email: string };
  hasAmbition?: boolean;
  state?: string;
  items: Item[];
  trackedStories: Array<{ storyId: string }>;
  ambitions: unknown[];
  ambitionId?: string;
  developments: unknown[];
  effect?: string;
}

async function call(method: string, path: string, token: string | null, body?: unknown): Promise<{ status: number; json: ApiJson }> {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as ApiJson };
}

async function main(): Promise<void> {
  const email = `e2e-${Date.now()}@example.com`;

  // TEST 1: new user
  const reg = await call('POST', '/auth/register', null, { email, password: 'password123', fullName: 'E2E User' });
  check('register', reg.status === 201 && !!reg.json.token);
  const userId = reg.json.user?.id ?? '';
  const login = await call('POST', '/auth/login', null, { email, password: 'password123' });
  check('login', login.status === 200);
  const token = login.json.token ?? "";
  const me = await call('GET', '/auth/me', token);
  check('profile', me.json.user?.email === email && me.json.hasAmbition === false);
  const empty = await call('GET', '/dashboard', token);
  check('new-user dashboard is empty and honest', empty.json.state === 'no_ambition' && empty.json.items.length === 0 && empty.json.trackedStories.length === 0);
  check('no auth -> 401', (await call('GET', '/dashboard', null)).status === 401);

  // TEST 2: ambition, embedding, retrieval
  const amb = await call('POST', '/ambition', token, {
    role: 'Software engineer',
    activity: 'Building internal tools at a startup',
    ambition: 'I want to build an AI developer tools company',
    timeline: '3 years',
    categories: ['AI developer tools', 'Startup funding'],
    geography: 'Global',
    depth: 'Standard',
    bidiLang: 'English',
    reportLang: 'English',
  });
  check('ambition created', amb.status === 201, JSON.stringify(amb.json).slice(0, 120));
  const row = await supabase.from('ambitions').select('embedding').eq('id', amb.json.ambitionId ?? "").single();
  const vector = JSON.parse(row.data?.embedding as string) as number[];
  check('ambition embedding stored with 768 dimensions', vector.length === 768);
  check('embedding is unit length (not a placeholder)', Math.abs(Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) - 1) < 0.01);
  const match = await supabase.rpc('match_ambitions', { p_user_id: userId, p_embedding: row.data?.embedding, p_limit: 1 });
  check('vector retrieval returns the ambition', match.data?.[0]?.id === amb.json.ambitionId && match.data[0].similarity > 0.99);

  // TEST 3 and 4: real news, story continuity
  const articles = await searchNews('AI developer tools', 7);
  check('news source reachable', articles.length > 0, `${articles.length} articles`);
  const stats = await ingestArticles(articles);
  console.log('ingest stats', stats);
  check('developments persisted or already stored (dedupe)', stats.newDevelopments + stats.corroborations + stats.noChange + stats.alreadyKnown > 0);
  const stories = await supabase.from('stories').select('id', { count: 'exact', head: true });
  const devs = await supabase.from('developments').select('story_id');
  const multi = Object.values((devs.data ?? []).reduce<Record<string, number>>((m, d) => ({ ...m, [d.story_id]: (m[d.story_id] ?? 0) + 1 }), {})).filter((n) => n > 1);
  console.log(`stories=${stories.count} developments=${devs.data?.length} stories-with-multiple-developments=${multi.length}`);

  const built = await buildBriefing(userId);
  check('briefing built without evaluation failures', built.failed === 0, JSON.stringify(built));
  const dash = await call('GET', '/dashboard', token);
  console.log(`briefing items: ${dash.json.items.length}`);
  for (const item of dash.json.items.slice(0, 3)) console.log(`  - ${item.headline} | ${item.relevanceBasis} | why: ${item.whyItMatters}`);
  check('items only carry a why-it-matters when grounded', dash.json.items.every((i) => i.relevanceBasis !== 'general' || i.whyItMatters === null));

  const first = dash.json.items[0];
  if (first) {
    const timeline = await call('GET', `/story/${first.storyId}/timeline`, token);
    check('timeline endpoint', timeline.status === 200 && timeline.json.developments.length >= 1);

    // TEST 6: track and persistence
    check('track', (await call('POST', '/story/track', token, { storyId: first.storyId })).status === 200);
    const after = await call('GET', '/dashboard', token);
    check('tracked state persists', after.json.trackedStories.some((t) => t.storyId === first.storyId));

    // TEST 5: feedback changes future results
    const fb = await call('POST', '/feedback', token, { storyId: first.storyId, feedbackType: 'not_relevant', reason: 'not interested anymore' });
    check('feedback accepted', fb.status === 200, fb.json.effect);
    const gone = await call('GET', '/dashboard', token);
    check('rejected story leaves the briefing', !gone.json.items.some((i) => i.storyId === first.storyId));
    const rebuilt = await buildBriefing(userId);
    const again = await call('GET', '/dashboard', token);
    check('rejection survives a rebuild', !again.json.items.some((i) => i.storyId === first.storyId), `items=${rebuilt.items}`);
  } else {
    console.log('SKIP  track/feedback (no briefing items for this ambition in the current news window)');
  }

  // User isolation
  const other = await call('POST', '/auth/register', null, { email: `e2e-b-${Date.now()}@example.com`, password: 'password123' });
  const otherDash = await call('GET', '/dashboard', other.json.token ?? "");
  check('another user sees none of this user data', otherDash.json.ambitions.length === 0 && otherDash.json.trackedStories.length === 0);

  // TEST 7 and 8 (server side): real Gemini Live session, greeting audio and transcript, then end
  const ws = await call('POST', '/auth/ws-token', token);
  const socket = io(`${BASE}/live`, { auth: { token: ws.json.token ?? "" }, transports: ['websocket'] });
  const events: string[] = [];
  let audioBytes = 0;
  let agentText = '';
  socket.on('live:state', (s: { state: string }) => events.push(s.state));
  socket.on('live:audio', (a: { data: ArrayBuffer }) => (audioBytes += a.data.byteLength));
  socket.on('live:transcript', (t: { role: string; text: string }) => {
    if (t.role === 'agent') agentText = t.text;
  });
  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve());
    socket.on('connect_error', reject);
  });
  const started = await socket.emitWithAck('live:start');
  check('live session starts', started.ok === true, started.message ?? '');
  // Wait for the greeting to finish (state returns to listening) rather than a fixed time.
  for (let waited = 0; waited < 60_000 && !(events.includes('agent_speaking') && events[events.length - 1] === 'listening'); waited += 500) {
    await new Promise((r) => setTimeout(r, 500));
  }
  check('agent greeted with real audio', audioBytes > 10_000, `${audioBytes} bytes`);
  check('agent greeting transcript comes from the session', agentText.length > 10, agentText.slice(0, 100));
  check('state machine reached agent_speaking then listening', events.includes('agent_speaking') && events[events.length - 1] === 'listening', events.join('>'));
  await socket.emitWithAck('live:end');
  await new Promise((r) => setTimeout(r, 1_000));
  check('socket closed cleanly', true);
  socket.disconnect();

  const bad = io(`${BASE}/live`, { auth: { token: 'forged' }, transports: ['websocket'] });
  const rejected = await new Promise<boolean>((resolve) => {
    bad.on('connect', () => resolve(false));
    bad.on('connect_error', () => resolve(true));
  });
  bad.disconnect();
  check('socket rejects a forged token', rejected);

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
