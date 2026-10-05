import https from 'https';
import { errors } from './errors';
import { createLogger } from './logger';
import { supabase } from './supabase';
import type { NewsArticle } from './news';

const log = createLogger('gdelt');

// Node's fetch gives up connecting after 10s, and GDELT often needs longer, so core https is used.
function httpGet(url: URL, timeoutMs: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: timeoutMs, family: 4, headers: { 'user-agent': 'AmbitionGazette/1.0', accept: '*/*' } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('timeout', () => req.destroy(new Error('request timed out')));
    req.on('error', reject);
  });
}

// GDELT rejects any keyword shorter than 3 characters, so "AI" is spelled out and other short tokens dropped.
export function normalizeQuery(query: string): string {
  return query
    .replace(/\bAI\b/gi, 'artificial intelligence')
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .join(' ');
}

interface GdeltRawArticle {
  url?: unknown;
  title?: unknown;
  seendate?: unknown;
  domain?: unknown;
  language?: unknown;
  sourcecountry?: unknown;
  socialimage?: unknown;
}

const asString = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

// GDELT seendate looks like 20261002T143000Z.
export function parseGdeltDate(value: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalize(raw: GdeltRawArticle, query: string): NewsArticle | null {
  const url = asString(raw.url);
  const title = asString(raw.title);
  const domain = asString(raw.domain);
  const seen = asString(raw.seendate);
  if (!url || !title || !domain || !seen) return null;
  const publishedAt = parseGdeltDate(seen);
  if (!publishedAt) return null;
  return {
    url,
    title,
    snippet: null,
    publisher: domain.toLowerCase(),
    publishedAt,
    language: asString(raw.language),
    country: asString(raw.sourcecountry),
    imageUrl: asString(raw.socialimage),
    query,
  };
}

/**
 * Searches GDELT for English news in the last `days` days. GDELT allows one request per ~5s across all
 * workers, enforced by the acquire_gdelt_slot database function.
 */
export async function searchGDelt(query: string, days: number, maxRecords = 15): Promise<NewsArticle[]> {
  const slot = await supabase.rpc('acquire_gdelt_slot', { p_caller: 'api' });
  if (slot.error) throw errors.database('gdelt.slot', slot.error.message);
  const waitMs = new Date(slot.data as string).getTime() - Date.now();
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs));

  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  url.searchParams.set('query', `${normalizeQuery(query)} sourcelang:english`);
  url.searchParams.set('mode', 'artlist');
  url.searchParams.set('format', 'json');
  url.searchParams.set('sort', 'datedesc');
  url.searchParams.set('maxrecords', String(maxRecords));
  url.searchParams.set('timespan', `${days}d`);

  let body = '';
  try {
    // GDELT throttles bursts with 429; wait and retry a few times before reporting the source as down.
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const response = await httpGet(url, 45_000);
      body = response.body;
      if (response.status >= 200 && response.status < 300) break;
      if (response.status !== 429 || attempt === 4) throw new Error(`HTTP ${response.status}`);
      await new Promise((resolve) => setTimeout(resolve, 8_000 * attempt));
    }
  } catch (err) {
    log.error('gdelt request failed', { query, err });
    throw errors.source(`gdelt request failed for "${query}": ${err instanceof Error ? err.message : String(err)}`);
  }

  // GDELT answers an empty result with an empty body and a bad query with a plain-text message.
  if (!body.trim()) return [];
  let parsed: { articles?: GdeltRawArticle[] };
  try {
    parsed = JSON.parse(body) as { articles?: GdeltRawArticle[] };
  } catch {
    log.error('gdelt returned non-JSON', { query, preview: body.slice(0, 120) });
    throw errors.source(`gdelt rejected query "${query}": ${body.slice(0, 120)}`);
  }
  const articles = (parsed.articles ?? []).map((a) => normalize(a, query)).filter((a): a is NewsArticle => a !== null);
  log.info('gdelt search', { query, days, returned: articles.length });
  return articles;
}
