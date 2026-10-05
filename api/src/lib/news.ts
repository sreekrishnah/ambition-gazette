import { AppError, errors } from './errors';
import { searchGDelt } from './gdelt';
import { gnewsConfigured, searchGNews } from './gnews';
import { createLogger } from './logger';

const log = createLogger('news');

export interface NewsArticle {
  url: string;
  title: string;
  // Short description from the provider. GDELT has none, so it is null there.
  snippet: string | null;
  publisher: string;
  publishedAt: Date;
  language: string | null;
  country: string | null;
  imageUrl: string | null;
  query: string;
}

// Fewer articles than this for one query is treated as "the query was too narrow", not as "there is no news".
const MIN_ARTICLES = 5;
// The briefing looks back this far, so older articles would never be shown.
const WIDE_DAYS = 14;

/**
 * News search treats every word as required, so "software engineer salaries" matched 2 articles while
 * "software engineer" matched 15. A query of three or more words is shortened to its first two.
 */
export function broaden(query: string): string | null {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.length >= 3 ? words.slice(0, 2).join(' ') : null;
}

/**
 * GNews is the primary source (it returns descriptions). When it returns too little, the query is
 * broadened, the window is widened to what the briefing uses, and GDELT adds its own results. Results are
 * merged by URL. An error is raised only when every source failed and nothing was found.
 */
export async function searchNews(query: string, days: number): Promise<NewsArticle[]> {
  const found = new Map<string, NewsArticle>();
  const failures: unknown[] = [];

  const collect = async (source: string, fetchArticles: () => Promise<NewsArticle[]>): Promise<void> => {
    try {
      for (const article of await fetchArticles()) if (!found.has(article.url)) found.set(article.url, article);
    } catch (err) {
      failures.push(err);
      log.warn('news source failed', { source, query, err });
    }
  };
  const sparse = () => found.size < MIN_ARTICLES;

  if (gnewsConfigured()) {
    await collect('gnews', () => searchGNews(query, days));
    const broader = broaden(query);
    if (sparse() && broader) await collect('gnews broader', () => searchGNews(broader, days));
    if (sparse() && days < WIDE_DAYS) await collect('gnews wider', () => searchGNews(broader ?? query, WIDE_DAYS));
  }
  if (sparse()) await collect('gdelt', () => searchGDelt(query, Math.max(days, WIDE_DAYS)));

  if (found.size === 0 && failures.length > 0) {
    const first = failures[0];
    if (first instanceof AppError) throw first;
    throw errors.source(first instanceof Error ? first.message : String(first));
  }
  log.info('news search merged', { query, found: found.size });
  return [...found.values()];
}
