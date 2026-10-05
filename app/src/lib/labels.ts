import type { Attention, Continuity, EvidenceStrength, RelevanceBasis } from "@/types/api";

export const CONTINUITY_LABELS: Record<Continuity, string> = {
  new: "New",
  updated: "Updated",
  confirmed: "Confirmed",
  contradicted: "Contradicted",
  escalated: "Escalated",
  resolved: "Resolved",
  consequence: "Consequence",
};

export const BASIS_LABELS: Record<RelevanceBasis, string> = {
  temporary_interest: "Your temporary interest",
  preference: "Your preference",
  ambition: "Your ambition",
  tracked: "A story you track",
  interest: "Your interests",
  recent_interest: "Your recent interests",
  general: "General importance",
};

export const ATTENTION_LABELS: Record<Attention, string> = {
  act: "Needs your attention",
  know: "Worth knowing",
  fyi: "Background",
};

export const EVIDENCE_LABELS: Record<EvidenceStrength, string> = {
  single_source: "Single source. Check it before acting on it.",
  corroborated: "Reported by 2 publishers",
  widely_reported: "Reported by 3 or more publishers",
};
