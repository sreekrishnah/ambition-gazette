import crypto from 'crypto';
import { injectionSignals, logBlocked, sanitizeUntrusted } from '../ai/guard';
import { StoryCandidate, extractDevelopment, resolveStory } from '../ai/tasks';
import { AppError } from '../lib/errors';
import { embedText, embedTexts } from '../lib/gemini';
import { NewsArticle } from '../lib/news';
import { createLogger } from '../lib/logger';
import { rpcRows, supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';

const log = createLogger('ingest');

// Long enough that a follow-up weeks later still joins its original story instead of starting a new one.
const STORY_LOOKBACK_DAYS = 180;
const STORY_CANDIDATES = 5;
// A development this similar (document vs document) to one already recorded is the same event, reported again.
const SAME_EVENT_SIMILARITY = 0.9;
const MIN_TITLE_LENGTH = 15;
const MAX_CONSECUTIVE_PROVIDER_FAILURES = 3;

export interface IngestStats {
  received: number;
  alreadyKnown: number;
  rejected: number;
  newStories: number;
  newDevelopments: number;
  corroborations: number;
  noChange: number;
  failed: number;
}

export const emptyStats = (): IngestStats => ({
  received: 0,
  alreadyKnown: 0,
  rejected: 0,
  newStories: 0,
  newDevelopments: 0,
  corroborations: 0,
  noChange: 0,
  failed: 0,
});

interface StoryRow {
  id: string;
  title: string;
  summary: string | null;
  canonical_key: string;
}

interface DevelopmentRow {
  id: string;
  headline: string;
  new_state: string;
  occurred_at: string;
}

const slug = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

const shortHash = (text: string): string => crypto.createHash('sha1').update(text).digest('hex').slice(0, 10);

function evidenceStrength(publishers: number): string {
  return publishers >= 3 ? 'widely_reported' : publishers === 2 ? 'corroborated' : 'single_source';
}

function acceptable(article: NewsArticle): boolean {
  return article.title.length >= MIN_TITLE_LENGTH && article.publishedAt.getTime() <= Date.now() + 60 * 60 * 1000;
}

// Articles are written by strangers and later become part of model prompts. One that tries to give the model
// orders is dropped, and the rest are stored in a cleaned form so nothing downstream handles raw text.
function screened(article: NewsArticle): NewsArticle | null {
  const signals = injectionSignals(`${article.title} ${article.snippet ?? ''}`);
  if (signals.length > 0) {
    logBlocked('article', signals);
    return null;
  }
  return {
    ...article,
    title: sanitizeUntrusted(article.title, 300),
    snippet: article.snippet ? sanitizeUntrusted(article.snippet, 700) : null,
    publisher: sanitizeUntrusted(article.publisher, 80),
  };
}

async function insertArticle(article: NewsArticle): Promise<string> {
  const row = unwrap(
    'articles.insert',
    await supabase
      .from('articles')
      .insert({
        external_url: article.url,
        title: article.title,
        snippet: article.snippet,
        publisher: article.publisher,
        published_at: article.publishedAt.toISOString(),
        language: article.language,
        source_country: article.country,
        image_url: article.imageUrl,
        gdelt_query: article.query,
      })
      .select('id')
      .single<{ id: string }>(),
  );
  return row.id;
}

async function findCandidates(vector: number[]): Promise<StoryCandidate[]> {
  const since = new Date(Date.now() - STORY_LOOKBACK_DAYS * 86_400_000).toISOString();
  const stories = await rpcRows<{ id: string; title: string; summary: string | null }>('match_stories', {
    p_embedding: vector,
    p_limit: STORY_CANDIDATES,
    p_since: since,
  });
  const candidates: StoryCandidate[] = [];
  for (const story of stories) {
    const latest = unwrapMaybe(
      'developments.latest',
      await supabase
        .from('developments')
        .select('new_state')
        .eq('story_id', story.id)
        .order('occurred_at', { ascending: false })
        .limit(1)
        .maybeSingle<{ new_state: string }>(),
    );
    candidates.push({ id: story.id, title: story.title, summary: story.summary, latestState: latest?.new_state ?? null });
  }
  return candidates;
}

async function createStory(
  article: NewsArticle,
  resolved: { title: string; summary: string; category: string; geography: string; entities: string[] },
): Promise<StoryRow> {
  const embedding = await embedText(`${resolved.title}. ${resolved.summary}`, 'document');
  const row = unwrap(
    'stories.insert',
    await supabase
      .from('stories')
      .insert({
        canonical_key: `${slug(resolved.title)}-${shortHash(resolved.title + article.url)}`,
        title: resolved.title,
        summary: resolved.summary,
        category: resolved.category,
        geography: resolved.geography,
        entities_json: resolved.entities,
        first_seen_at: article.publishedAt.toISOString(),
        last_updated_at: article.publishedAt.toISOString(),
        status: 'active',
        embedding,
      })
      .select('id, title, summary, canonical_key')
      .single<StoryRow>(),
  );
  return row;
}

// The original development is always kept so a long story never loses how it started.
async function loadHistory(storyId: string): Promise<DevelopmentRow[]> {
  const select = 'id, headline, new_state, occurred_at';
  const [recent, first] = await Promise.all([
    supabase.from('developments').select(select).eq('story_id', storyId).order('occurred_at', { ascending: false }).limit(4).returns<DevelopmentRow[]>(),
    supabase.from('developments').select(select).eq('story_id', storyId).order('occurred_at', { ascending: true }).limit(1).returns<DevelopmentRow[]>(),
  ]);
  const rows = unwrap('developments.history', recent).reverse();
  const origin = unwrap('developments.origin', first)[0];
  return origin && !rows.some((r) => r.id === origin.id) ? [origin, ...rows] : rows;
}

async function attachSource(storyId: string, developmentId: string | null, articleId: string, article: NewsArticle): Promise<void> {
  unwrapVoid(
    'story_sources.insert',
    await supabase.from('story_sources').insert({
      story_id: storyId,
      development_id: developmentId,
      article_id: articleId,
      url: article.url,
      title: article.title,
      publisher: article.publisher,
      published_at: article.publishedAt.toISOString(),
    }),
  );
}

async function corroborate(developmentId: string, storyId: string, articleId: string, article: NewsArticle): Promise<void> {
  await attachSource(storyId, developmentId, articleId, article);
  const sources = unwrap(
    'story_sources.count',
    await supabase.from('story_sources').select('publisher').eq('development_id', developmentId).returns<Array<{ publisher: string | null }>>(),
  );
  const publishers = new Set(sources.map((s) => s.publisher ?? '').filter(Boolean)).size;
  unwrapVoid(
    'developments.corroborate',
    await supabase
      .from('developments')
      .update({ source_count: sources.length, independent_source_count: publishers, evidence_strength: evidenceStrength(publishers) })
      .eq('id', developmentId),
  );
}

type Outcome = 'story' | 'development' | 'corroboration' | 'no_change';

async function processArticle(article: NewsArticle, vector: number[], articleId: string, stats: IngestStats): Promise<Outcome> {
  const candidates = await findCandidates(vector);
  const resolved = await resolveStory({ title: article.title, snippet: article.snippet, publisher: article.publisher }, candidates);

  // The model may only pick a story it was shown; anything else is treated as a new story.
  const matched = resolved.relationship === 'same_story' ? candidates.find((c) => c.id === resolved.story_id) : undefined;
  let storyId: string;
  let storyTitle: string;
  let storySummary: string | null;
  let isNewStory = false;
  if (matched) {
    storyId = matched.id;
    storyTitle = matched.title;
    storySummary = matched.summary;
  } else {
    const story = await createStory(article, resolved);
    storyId = story.id;
    storyTitle = story.title;
    storySummary = story.summary;
    isNewStory = true;
    stats.newStories += 1;
  }

  const history = isNewStory ? [] : await loadHistory(storyId);
  const extraction = await extractDevelopment({
    storyTitle,
    storySummary,
    history: history.map((h) => ({ occurredAt: h.occurred_at, headline: h.headline, newState: h.new_state })),
    articles: [
      {
        url: article.url,
        title: article.title,
        snippet: article.snippet,
        publisher: article.publisher,
        publishedAt: article.publishedAt.toISOString(),
      },
    ],
  });

  if (!extraction.is_meaningful_change && !isNewStory) {
    await attachSource(storyId, null, articleId, article);
    return 'no_change';
  }

  const developmentText = `${extraction.headline}. ${extraction.what_changed}`;
  const developmentVector = await embedText(developmentText, 'document');

  if (!isNewStory) {
    const similar = await rpcRows<{ id: string; similarity: number }>('match_developments', {
      p_embedding: developmentVector,
      p_story_id: storyId,
      p_limit: 1,
      p_since: null,
    });
    if (similar[0] && similar[0].similarity >= SAME_EVENT_SIMILARITY) {
      await corroborate(similar[0].id, storyId, articleId, article);
      return 'corroboration';
    }
  }

  const continuity = isNewStory ? 'new' : extraction.continuity === 'new' ? 'updated' : extraction.continuity;
  const development = unwrap(
    'developments.insert',
    await supabase
      .from('developments')
      .insert({
        story_id: storyId,
        canonical_event_key: `${slug(storyTitle)}-${shortHash(extraction.headline + article.url)}`,
        headline: extraction.headline,
        summary: extraction.summary,
        development_type: continuity.toUpperCase(),
        continuity,
        occurred_at: article.publishedAt.toISOString(),
        first_reported_at: new Date().toISOString(),
        source_count: 1,
        independent_source_count: 1,
        evidence_strength: evidenceStrength(1),
        world_significance: extraction.world_significance,
        significance_reason: extraction.significance_reason,
        what_changed: extraction.what_changed,
        previous_state: extraction.previous_state,
        new_state: extraction.new_state,
        evidence_json: { articleUrls: [article.url] },
        embedding: developmentVector,
      })
      .select('id')
      .single<{ id: string }>(),
  );
  await attachSource(storyId, development.id, articleId, article);

  // The story now describes its latest state, so later articles are matched against what is current.
  const storyVector = await embedText(`${storyTitle}. ${extraction.new_state}`, 'document');
  unwrapVoid(
    'stories.touch',
    await supabase
      .from('stories')
      .update({
        summary: extraction.new_state,
        last_updated_at: article.publishedAt.toISOString(),
        updated_at: new Date().toISOString(),
        embedding: storyVector,
      })
      .eq('id', storyId),
  );
  return isNewStory ? 'story' : 'development';
}

// One .in() filter with hundreds of URLs exceeds the request URL limit, so the lookup runs in small batches.
const KNOWN_URL_BATCH = 40;

async function findKnownUrls(urls: string[]): Promise<Set<string>> {
  const known = new Set<string>();
  for (let i = 0; i < urls.length; i += KNOWN_URL_BATCH) {
    const rows = unwrap(
      'articles.known',
      await supabase.from('articles').select('external_url').in('external_url', urls.slice(i, i + KNOWN_URL_BATCH)).returns<Array<{ external_url: string }>>(),
    );
    for (const row of rows) known.add(row.external_url);
  }
  return known;
}

/**
 * Normalises articles, drops ones already stored, and turns the rest into stories and developments.
 * Articles are processed oldest first so each one sees the history the earlier ones created.
 * Aborts only when the AI provider keeps failing, so a broken dependency never looks like "no news".
 */
export async function ingestArticles(raw: NewsArticle[], onProgress?: (done: number, total: number) => void): Promise<IngestStats> {
  const stats = emptyStats();
  stats.received = raw.length;

  const unique = new Map<string, NewsArticle>();
  for (const candidate of raw) {
    const article = acceptable(candidate) ? screened(candidate) : null;
    if (!article) stats.rejected += 1;
    else if (!unique.has(article.url)) unique.set(article.url, article);
  }
  if (unique.size === 0) return stats;

  const knownUrls = await findKnownUrls([...unique.keys()]);
  stats.alreadyKnown = knownUrls.size;
  const fresh = [...unique.values()]
    .filter((a) => !knownUrls.has(a.url))
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  if (fresh.length === 0) return stats;

  const vectors = await embedTexts(fresh.map((a) => a.title), 'query');
  let consecutiveProviderFailures = 0;

  for (let i = 0; i < fresh.length; i += 1) {
    const article = fresh[i];
    onProgress?.(i, fresh.length);
    let articleId: string | null = null;
    try {
      articleId = await insertArticle(article);
      const outcome = await processArticle(article, vectors[i], articleId, stats);
      consecutiveProviderFailures = 0;
      if (outcome === 'story' || outcome === 'development') stats.newDevelopments += 1;
      else if (outcome === 'corroboration') stats.corroborations += 1;
      else stats.noChange += 1;
    } catch (err) {
      stats.failed += 1;
      log.error('article ingestion failed', { url: article.url, err });
      // Without its development the article would be skipped forever as "known"; remove it so it is retried.
      if (articleId) await supabase.from('articles').delete().eq('id', articleId);
      const providerDown = err instanceof AppError && (err.code === 'MODEL_UNAVAILABLE' || err.code === 'EMBEDDING_UNAVAILABLE');
      consecutiveProviderFailures = providerDown ? consecutiveProviderFailures + 1 : 0;
      if (consecutiveProviderFailures >= MAX_CONSECUTIVE_PROVIDER_FAILURES) throw err;
    }
  }
  log.info('ingest complete', { ...stats });
  return stats;
}
