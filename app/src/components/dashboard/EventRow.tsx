"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Check,
  ExternalLink,
  EyeOff,
  Globe2,
  Lightbulb,
  Route,
  ThumbsDown,
  Zap,
} from "lucide-react";
import type { AISummaryItem, AISummarySource } from "@/types/dashboard";
import type { ItemFeedbackType } from "@/types/api";
import { ATTENTION_LABELS, CONTINUITY_LABELS, EVIDENCE_LABELS } from "@/lib/labels";
import { dayOfMonth, monthShort } from "@/lib/format";
import { Collapse } from "@/components/common/Collapse";
import { Thumbnail } from "@/components/common/Thumbnail";
import { PropagationGraph, canShowPropagation } from "./PropagationGraph";

interface EventRowProps {
  item: AISummaryItem;
  open: boolean;
  onToggle: () => void;
  pending: boolean;
  markedRelevant: boolean;
  onToggleTrack: (item: AISummaryItem) => void;
  onFeedback: (item: AISummaryItem, feedbackType: ItemFeedbackType) => void;
}

function SourceBadge({ source }: { source: AISummarySource }) {
  return (
    <span
      className="w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 tracking-tight"
      style={{ backgroundColor: source.badgeBg, color: source.badgeColor || "#FFFFFF" }}
    >
      {source.badgeText}
    </span>
  );
}

const ACTION = "inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const ACTION_QUIET = `${ACTION} border-[#ECE7DF] bg-white text-[#524E48] hover:bg-[#FAF8F5] hover:text-[#1A1918]`;

/** One event as an accordion row: picture, headline and outlet when closed; the full explanation when open. */
export function EventRow({ item, open, onToggle, pending, markedRelevant, onToggleTrack, onFeedback }: EventRowProps) {
  const [graphOpen, setGraphOpen] = useState(false);
  // The impact path loads the story history, so it is mounted only once someone asks for it.
  const [graphMounted, setGraphMounted] = useState(false);
  const day = dayOfMonth(item.occurredAt);
  const month = monthShort(item.occurredAt);
  const outlets = [...new Set(item.sources.map((s) => s.name))].slice(0, 2).join(", ");
  const meta = [outlets, day && month ? `${day} ${month}` : null].filter(Boolean).join(" · ");

  return (
    <article className={`rounded-xl border transition-colors duration-300 ${open ? "border-[#E8D5D2] bg-[#FFFDFC] shadow-sm" : "border-transparent hover:bg-[#FAF8F5]"}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-2.5 sm:p-3 text-left cursor-pointer"
      >
        <Thumbnail src={item.imageUrl} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5 mb-1 font-dm-sans">
            {item.attention === "act" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#701A23] text-white">
                <Zap className="w-3 h-3" aria-hidden="true" />
                {ATTENTION_LABELS.act}
              </span>
            )}
            {item.attention === "know" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#F0D5D3] bg-[#FCF4F3] text-[#701A23]">
                {ATTENTION_LABELS.know}
              </span>
            )}
            {item.relevanceBasis === "general" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#CFDDF3] bg-[#F1F6FD] text-[#1E3A66]">
                <Globe2 className="w-3 h-3" aria-hidden="true" />
                World event
              </span>
            )}
            {item.tracked && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#ECE7DF] bg-[#FAF8F5] text-[#524E48]">
                <BookmarkCheck className="w-3 h-3" aria-hidden="true" />
                Tracking
              </span>
            )}
          </span>
          <span className="block font-ubuntu font-bold text-[13px] sm:text-[13.5px] text-[#1A1918] leading-snug line-clamp-2-safe">{item.title}</span>
          {meta && <span className="block mt-0.5 text-[11px] text-[#7A756D] font-dm-sans truncate">{meta}</span>}
        </span>
        <ChevronDown className="chevron-turn w-4 h-4 shrink-0 text-[#948E85]" aria-hidden="true" />
      </button>

      <Collapse open={open}>
        <div className="px-3 sm:px-4 pb-4 pt-1 font-ubuntu">
          <p className="text-[12px] sm:text-[12.5px] text-[#4A4742] leading-relaxed">{item.summary}</p>

          {item.whyItMatters && (
            <p className="mt-2.5 flex gap-2 text-[12px] sm:text-[12.5px] text-[#2C2926] leading-relaxed bg-[#FCF4F3] border border-[#F0D5D3] rounded-lg px-3 py-2">
              <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-[#701A23]" aria-hidden="true" />
              <span>
                <span className="font-semibold text-[#701A23]">Why this matters to you (our assessment):</span> {item.whyItMatters}
              </span>
            </p>
          )}

          {item.assumption && (
            <p className="mt-2 flex gap-2 text-[12px] text-[#701A23] leading-relaxed border border-[#F0D5D3] rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                <span className="font-semibold">May challenge your assumption:</span> &ldquo;{item.assumption.statement}&rdquo;. {item.assumption.note}
              </span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 font-dm-sans">
            {item.continuity && <span className="text-[10.5px] text-[#68645E]">{CONTINUITY_LABELS[item.continuity]}</span>}
            {canShowPropagation(item) && (
              <button type="button" onClick={() => {
                  setGraphMounted(true);
                  setGraphOpen((v) => !v);
                }} aria-expanded={graphOpen} className={`${ACTION} border-[#F0D5D3] bg-[#FCF4F3] text-[#701A23] hover:bg-[#F8E8E5]`}>
                <Route className="w-3.5 h-3.5" aria-hidden="true" />
                {graphOpen ? "Hide impact path" : "Show impact path"}
              </button>
            )}
            {item.storyId && (
              <>
                <button type="button" onClick={() => onToggleTrack(item)} disabled={pending} className={`${ACTION} border-[#701A23] text-[#701A23] hover:bg-[#FCF4F3]`}>
                  {item.tracked ? <BookmarkCheck className="w-3.5 h-3.5" aria-hidden="true" /> : <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />}
                  {item.tracked ? "Untrack" : "Track"}
                </button>
                <button type="button" onClick={() => onFeedback(item, "relevant")} disabled={pending || markedRelevant} className={ACTION_QUIET}>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  {markedRelevant ? "Marked relevant" : "Relevant"}
                </button>
                <button type="button" onClick={() => onFeedback(item, "already_know")} disabled={pending} className={ACTION_QUIET}>
                  <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />I already know this
                </button>
                <button type="button" onClick={() => onFeedback(item, "not_relevant")} disabled={pending} className={ACTION_QUIET}>
                  <ThumbsDown className="w-3.5 h-3.5" aria-hidden="true" />
                  Not relevant
                </button>
              </>
            )}
          </div>

          <Collapse open={graphOpen && canShowPropagation(item)}>
            {graphMounted && <PropagationGraph item={item} />}
          </Collapse>

          <div className="mt-3 flex flex-col items-start gap-1 w-full">
            <span className="text-[10px] font-medium text-[#7A756D] font-dm-sans">Sources ({item.sources.length})</span>
            {item.evidenceStrength && (
              <span className={`text-[10px] font-dm-sans ${item.evidenceStrength === "single_source" ? "text-[#701A23]" : "text-[#7A756D]"}`}>
                {EVIDENCE_LABELS[item.evidenceStrength]}
              </span>
            )}
            <div className="flex flex-row flex-wrap gap-1.5">
              {item.sources.map((source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 max-w-full cursor-pointer"
                  title={`Open ${source.name}`}
                >
                  <span className="inline-flex items-center gap-1.5 bg-[#FAF8F5] group-hover:bg-[#F3EFE9] border border-[#ECE7DF] rounded-full px-2 py-0.5 overflow-hidden max-w-full">
                    <SourceBadge source={source} />
                    <span className="text-[11px] font-medium text-[#2C2926] font-dm-sans truncate">{source.name}</span>
                  </span>
                  <ExternalLink className="w-3 h-3 text-[#7A756D] group-hover:text-[#1A1918] shrink-0" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </Collapse>
    </article>
  );
}
