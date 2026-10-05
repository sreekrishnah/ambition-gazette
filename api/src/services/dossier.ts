import { supabase, unwrap } from '../lib/supabase';
import { BriefingItem } from './briefing';

// The voice briefing and its written script are both built from the same stories and their recent history.
export const DOSSIER_ITEMS = 8;
const HISTORY_PER_STORY = 3;

export interface HistoryEntry {
  occurredAt: string;
  headline: string;
  whatChanged: string;
  continuity: string | null;
}

interface HistoryRow {
  id: string;
  story_id: string;
  headline: string;
  what_changed: string;
  continuity: string | null;
  occurred_at: string;
}

// Earlier developments of each story, newest first, so the story can be told as it evolved.
export async function loadStoryHistory(items: BriefingItem[]): Promise<Record<string, HistoryEntry[]>> {
  const storyIds = [...new Set(items.map((i) => i.storyId))];
  if (storyIds.length === 0) return {};
  const rows = unwrap(
    'developments.history',
    await supabase
      .from('developments')
      .select('id, story_id, headline, what_changed, continuity, occurred_at')
      .in('story_id', storyIds)
      .order('occurred_at', { ascending: false })
      .limit(storyIds.length * (HISTORY_PER_STORY + 3))
      .returns<HistoryRow[]>(),
  );
  // The development a chapter is about is the chapter itself, not its history.
  const chapterDevelopmentIds = new Set(items.map((i) => i.developmentId));
  const history: Record<string, HistoryEntry[]> = {};
  for (const row of rows) {
    if (chapterDevelopmentIds.has(row.id)) continue;
    const list = (history[row.story_id] ??= []);
    if (list.length >= HISTORY_PER_STORY) continue;
    list.push({ occurredAt: row.occurred_at, headline: row.headline, whatChanged: row.what_changed, continuity: row.continuity });
  }
  return history;
}
