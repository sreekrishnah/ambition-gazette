import type { AISummaryItem, AISummarySource } from "@/types/dashboard";
import type { BriefingItem, BriefingSource } from "@/types/api";

const BADGE_BG = "#701A23";

function badgeText(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

function toSource(source: BriefingSource, index: number): AISummarySource {
  return {
    id: `${source.url}-${index}`,
    name: source.name,
    badgeText: badgeText(source.name),
    badgeBg: BADGE_BG,
    url: source.url,
  };
}

export function toSummaryItem(item: BriefingItem): AISummaryItem {
  return {
    id: item.id,
    title: item.headline,
    summary: item.whatChanged ?? item.summary,
    category: item.category ?? undefined,
    geography: item.geography ?? undefined,
    sources: item.sources.map(toSource),
    imageUrl: item.imageUrl,
    whyItMatters: item.whyItMatters,
    couldChange: item.couldChange,
    continuity: item.continuity,
    storyId: item.storyId,
    developmentId: item.developmentId,
    tracked: item.tracked,
    relevanceBasis: item.relevanceBasis,
    ambitionTitle: item.ambitionTitle,
    ambitionId: item.ambitionId,
    occurredAt: item.occurredAt,
    attention: item.attention,
    assumption: item.assumption,
    evidenceStrength: item.evidenceStrength,
  };
}
