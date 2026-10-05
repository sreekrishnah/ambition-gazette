import { ChapterScriptParts, ScriptListener, writeChapterScript, writeClosingScript } from '../ai/tasks';
import { cleanModelText } from '../ai/guard';
import { createLogger } from '../lib/logger';
import { supabase, unwrap, unwrapMaybe, unwrapVoid } from '../lib/supabase';
import { getProfile, listAmbitions } from './ambitions';
import { getBriefingItems } from './briefing';
import { DOSSIER_ITEMS, loadStoryHistory } from './dossier';
import { partSeconds } from './briefingDriver';

const log = createLogger('script');

const WORDS_PER_SECOND = 3;
const MAX_PART_CHARS = 1800;

export interface ChapterScript {
  developmentId: string;
  storyId: string;
  title: string;
  kind: 'ambition' | 'world';
  attention: string;
  facts: string;
  sides: string;
  forYou: string;
}

export interface BriefingScript {
  version: 1;
  language: string;
  generatedAt: string;
  chapters: ChapterScript[];
  closing: string;
}

export interface StoredScript {
  reportId: string;
  script: BriefingScript;
}

async function loadListener(userId: string): Promise<{ listener: ScriptListener; language: string; depth: string | null }> {
  const [userRow, profile, ambitions] = await Promise.all([
    supabase.from('users').select('full_name').eq('id', userId).maybeSingle<{ full_name: string | null }>(),
    getProfile(userId),
    listAmbitions(userId),
  ]);
  const name = unwrapMaybe('script.user', userRow)?.full_name?.trim().split(/\s+/)[0] ?? 'there';
  return {
    listener: {
      name,
      role: profile?.role ?? null,
      activity: profile?.activity ?? null,
      geography: profile?.geography_focus ?? null,
      ambitions: ambitions
        .filter((a) => a.status === 'active')
        .slice(0, 3)
        .map((a) => ({ title: a.title, description: a.description, horizon: a.horizon, geography: a.geography })),
    },
    language: profile?.prefered_language ?? 'English',
    depth: profile?.depth ?? null,
  };
}

/**
 * Writes the full spoken script for the user's current briefing: for every story its facts and background,
 * both sides, and what it means for them, plus a closing synthesis. Stories whose script fails to generate are
 * left out and the voice agent improvises those from the stored briefing instead.
 */
export async function generateBriefingScript(userId: string): Promise<BriefingScript | null> {
  const { report, items } = await getBriefingItems(userId, DOSSIER_ITEMS);
  if (!report || items.length === 0) return null;

  const [{ listener, language, depth }, history] = await Promise.all([loadListener(userId), loadStoryHistory(items)]);
  const wordsPerPart = Math.round(partSeconds(depth) * WORDS_PER_SECOND);

  const chapters: ChapterScript[] = [];
  for (const [index, item] of items.entries()) {
    try {
      const parts: ChapterScriptParts = await writeChapterScript({
        listener,
        language,
        wordsPerPart,
        kind: item.relevanceBasis === 'general' ? 'world' : 'ambition',
        headline: item.headline,
        summary: item.summary,
        whatChanged: item.whatChanged,
        continuity: item.continuity,
        date: item.occurredAt.slice(0, 10),
        outlets: [...new Set(item.sources.map((s) => s.name).filter(Boolean))].slice(0, 5),
        history: (history[item.storyId] ?? []).map((h) => ({ date: h.occurredAt.slice(0, 10), headline: h.headline, whatChanged: h.whatChanged })),
        why: item.whyItMatters,
        couldChange: item.couldChange,
        assumption: item.assumption ? { statement: item.assumption.statement, note: item.assumption.note } : null,
        nextTitle: items[index + 1]?.storyTitle ?? null,
      });
      const facts = cleanModelText(parts.facts, MAX_PART_CHARS);
      const sides = cleanModelText(parts.sides, MAX_PART_CHARS);
      const forYou = cleanModelText(parts.for_you, MAX_PART_CHARS);
      // A part that was blanked by the output filter makes the whole story unsafe to perform from a script.
      if (!facts || !sides || !forYou) throw new Error('script part rejected by the output filter');
      chapters.push({
        developmentId: item.developmentId,
        storyId: item.storyId,
        title: item.storyTitle,
        kind: item.relevanceBasis === 'general' ? 'world' : 'ambition',
        attention: item.attention,
        facts,
        sides,
        forYou,
      });
    } catch (err) {
      log.warn('story script skipped', { userId, developmentId: item.developmentId, err });
    }
  }
  if (chapters.length === 0) return null;

  let closing = '';
  try {
    closing = cleanModelText(
      await writeClosingScript({ listener, language, stories: chapters.map((c) => ({ title: c.title, why: items.find((i) => i.developmentId === c.developmentId)?.whyItMatters ?? null })) }),
      MAX_PART_CHARS,
    );
  } catch (err) {
    log.warn('closing script skipped', { userId, err });
  }

  const script: BriefingScript = { version: 1, language, generatedAt: new Date().toISOString(), chapters, closing };
  unwrapVoid(
    'script.store',
    await supabase.from('briefing_scripts').upsert({ user_id: userId, report_id: report.id, script, generated_at: script.generatedAt }, { onConflict: 'report_id' }),
  );
  log.info('briefing script generated', { userId, reportId: report.id, chapters: chapters.length });
  return script;
}

/** The script written for one day's briefing, or null when that day has none. */
export async function getScriptForReport(userId: string, reportId: string): Promise<BriefingScript | null> {
  const row = unwrapMaybe(
    'script.byReport',
    await supabase
      .from('briefing_scripts')
      .select('script')
      .eq('user_id', userId)
      .eq('report_id', reportId)
      .maybeSingle<{ script: BriefingScript }>(),
  );
  return row?.script?.version === 1 ? row.script : null;
}

/** The script for the user's most recent briefing, or null when none has been generated. */
export async function getLatestScript(userId: string): Promise<StoredScript | null> {
  const rows = unwrap(
    'script.latest',
    await supabase
      .from('briefing_scripts')
      .select('report_id, script, generated_at')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .returns<Array<{ report_id: string; script: BriefingScript }>>(),
  );
  const row = rows[0];
  return row && row.script?.version === 1 ? { reportId: row.report_id, script: row.script } : null;
}
