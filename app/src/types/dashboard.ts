import type { AssumptionEffect, Attention, Continuity, EvidenceStrength, RelevanceBasis } from "@/types/api";

export interface AISummarySource {
  id: string;
  name: string;
  badgeText: string;
  badgeBg: string;
  badgeColor?: string;
  url: string;
}

export interface AISummaryItem {
  id: string;
  title: string;
  summary: string;
  category?: string;
  geography?: string;
  sources: AISummarySource[];
  imageUrl?: string | null;
  whyItMatters?: string | null;
  couldChange?: string | null;
  continuity?: Continuity;
  storyId?: string;
  developmentId?: string;
  tracked?: boolean;
  relevanceBasis?: RelevanceBasis;
  ambitionTitle?: string | null;
  occurredAt?: string;
  attention?: Attention;
  assumption?: { id: string; statement: string; note: string; reconsider: string | null; effect: AssumptionEffect } | null;
  ambitionId?: string | null;
  evidenceStrength?: EvidenceStrength | null;
}
