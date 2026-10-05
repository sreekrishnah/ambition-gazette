"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { AISummaryItem } from "@/types/dashboard";
import type { ItemFeedbackType } from "@/types/api";
import { useSingleOpen } from "@/hooks/useSingleOpen";
import { EventRow } from "./EventRow";

interface TodaysSummaryCardProps {
  searchQuery?: string;
  onClearSearch?: () => void;
  items: AISummaryItem[];
  dashboardState: "no_ambition" | "no_developments" | "ready" | null;
  setAsideCount?: number;
  pendingIds: Set<string>;
  actionError: string | null;
  onToggleTrack: (item: AISummaryItem) => void;
  relevantIds: Set<string>;
  onFeedback: (item: AISummaryItem, feedbackType: ItemFeedbackType) => void;
}

export function TodaysSummaryCard({
  searchQuery = "",
  onClearSearch,
  items,
  dashboardState,
  setAsideCount = 0,
  pendingIds,
  actionError,
  onToggleTrack,
  relevantIds,
  onFeedback,
}: TodaysSummaryCardProps) {
  const { openId, toggle } = useSingleOpen();

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item: AISummaryItem) => {
      const titleMatch = item.title.toLowerCase().includes(q);
      const summaryMatch = item.summary.toLowerCase().includes(q);
      const sourceMatch = item.sources?.some((s) => s.name.toLowerCase().includes(q)) ?? false;
      return titleMatch || summaryMatch || sourceMatch;
    });
  }, [searchQuery, items]);

  const needAttention = items.filter((i) => i.attention === "act").length;
  const worthKnowing = items.filter((i) => i.attention === "know").length;
  const attentionLine =
    items.length === 0
      ? "Key developments that matter to your ambitions, with sources and what they mean."
      : needAttention > 0
        ? `${needAttention} need${needAttention === 1 ? "s" : ""} your attention, ${worthKnowing} worth knowing.`
        : `Nothing requires your attention today. ${worthKnowing} worth knowing, ${items.length - worthKnowing} for background.`;

  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#FAF8F5] via-[#FCF4F1] to-[#FDEEEA] border border-[#F3ECE5] rounded-xl px-4 py-3 sm:px-4.5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          {/* Vertical burgundy indicator bar */}
          <div className="w-1 h-5 bg-[#701A23] rounded-full shrink-0 mt-0.5" />
          <div>
            <h2 className="font-ubuntu font-bold text-[14.5px] sm:text-[15.5px] text-[#1A1918] tracking-tight leading-tight">
              Today&apos;s Summary
            </h2>
            <p className="font-ubuntu text-[11px] sm:text-[11.5px] text-[#68645E] mt-0.5 leading-normal">
              {attentionLine}
            </p>
          </div>
        </div>

        {/* Developments Count Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#F0D5D3] bg-[#FCF4F3]/90 text-[#701A23] text-[11px] font-semibold font-dm-sans shrink-0 self-start sm:self-center shadow-xs">
          <FileText className="w-3 h-3 text-[#701A23] shrink-0" />
          <span>
            {filteredItems.length} key development{filteredItems.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mt-2 text-[11.5px] text-[#B42318] font-dm-sans">
          {actionError}
        </p>
      )}

      {/* 2. Summaries List */}
      <div className="flex flex-col gap-1 mt-2">
        {items.length === 0 ? (
          <div className="py-12 text-center text-[#68645E] px-4 font-dm-sans">
            <div className="w-10 h-10 rounded-full bg-[#FAF4ED] border border-[#ECDDC6] text-[#701A23] flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-[#701A23]" />
            </div>
            {dashboardState === "no_ambition" ? (
              <>
                <h4 className="text-[13.5px] font-semibold text-[#1A1918] mb-1 font-ubuntu">
                  Set Your First Ambition
                </h4>
                <p className="text-xs text-[#7A746C] max-w-[340px] mx-auto mb-4 leading-relaxed">
                  Tell us what you are working towards and we will connect real-world developments to it.
                </p>
                <Link
                  href="/ambition"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#701A23] text-white text-xs font-medium hover:bg-[#58141B] transition shadow-xs"
                >
                  <span>Set Your Ambition</span>
                  <span>&rarr;</span>
                </Link>
              </>
            ) : setAsideCount > 0 ? (
              <>
                <h4 className="text-[13.5px] font-semibold text-[#1A1918] mb-1 font-ubuntu">
                  Nothing today changed your plan
                </h4>
                <p className="text-xs text-[#7A746C] max-w-[340px] mx-auto leading-relaxed">
                  {setAsideCount} recent development{setAsideCount === 1 ? " was" : "s were"} checked and set aside
                  because none touch your goals. Your Lens shows what they were.
                </p>
              </>
            ) : (
              <>
                <h4 className="text-[13.5px] font-semibold text-[#1A1918] mb-1 font-ubuntu">
                  Nothing Relevant Found Yet
                </h4>
                <p className="text-xs text-[#7A746C] max-w-[340px] mx-auto mb-4 leading-relaxed">
                  No developments linked to your ambitions have been found yet. Use Refresh developments above to look again.
                </p>
                <Link
                  href="/ambitions"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#701A23] text-white text-xs font-medium hover:bg-[#58141B] transition shadow-xs"
                >
                  <span>Refine Ambition Scope</span>
                  <span>&rarr;</span>
                </Link>
              </>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-10 text-center text-[#68645E]">
            <p className="text-xs sm:text-[13px]">
              No developments match &ldquo;{searchQuery}&rdquo;.
            </p>
            {onClearSearch && (
              <button
                type="button"
                onClick={onClearSearch}
                className="mt-2.5 text-xs font-semibold text-[#701A23] hover:underline cursor-pointer font-dm-sans"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <EventRow
              key={item.id}
              item={item}
              open={openId === item.id}
              onToggle={() => toggle(item.id)}
              pending={pendingIds.has(item.id)}
              markedRelevant={relevantIds.has(item.id)}
              onToggleTrack={onToggleTrack}
              onFeedback={onFeedback}
            />
          ))
        )}
      </div>
    </section>
  );
}
