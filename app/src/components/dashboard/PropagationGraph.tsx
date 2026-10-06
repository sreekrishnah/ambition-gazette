"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import type { TimelineDevelopment } from "@/types/api";
import type { AISummaryItem } from "@/types/dashboard";
import { CONTINUITY_LABELS } from "@/lib/labels";
import { dayOfMonth, monthShort } from "@/lib/format";

interface PropagationGraphProps {
  item: AISummaryItem;
}

/** Renders only links the backend stored: sources, the development, and the ambition it was matched to. */
export function canShowPropagation(item: AISummaryItem): boolean {
  return Boolean(item.whyItMatters && item.ambitionTitle && item.sources.length > 0);
}

function Node({ label, tone, children }: { label: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`w-full min-w-0 rounded-xl border px-3.5 py-3 ${tone}`}>
      <p className="text-[9.5px] font-semibold uppercase tracking-wide opacity-70 font-dm-sans">{label}</p>
      {children}
    </div>
  );
}

function Edge({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-0.5 text-[#948E85]" aria-hidden="true">
      <span className="h-4 w-px bg-[#D9D2C6]" />
      <span className="text-[9.5px] leading-tight font-dm-sans">{label}</span>
      <span className="h-4 w-px bg-[#D9D2C6]" />
    </div>
  );
}

// Earlier developments of the same story, read from the stored timeline. Hidden when the story has only one.
function StoryTimeline({ storyId, currentId }: { storyId: string; currentId?: string }) {
  const [developments, setDevelopments] = useState<TimelineDevelopment[]>([]);

  useEffect(() => {
    let active = true;
    api
      .getStoryTimeline(storyId)
      .then((res) => active && setDevelopments(res.developments))
      .catch(() => active && setDevelopments([]));
    return () => {
      active = false;
    };
  }, [storyId]);

  if (developments.length < 2) return null;

  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#948E85] font-dm-sans">
        Story so far: {developments.length} developments
      </p>
      <ol className="mt-1.5 space-y-1.5 border-l border-[#D9D2C6] pl-3">
        {developments.map((d) => {
          const day = dayOfMonth(d.occurredAt);
          const month = monthShort(d.occurredAt);
          return (
            <li
              key={d.id}
              className={`text-[11px] leading-snug font-dm-sans ${d.id === currentId ? "font-semibold text-[#701A23]" : "text-[#4A4742]"}`}
            >
              <span className="text-[#948E85]">{day && month ? `${day} ${month}` : ""}</span>{" "}
              {d.continuity ? `${CONTINUITY_LABELS[d.continuity]}: ` : ""}
              {d.headline}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function PropagationGraph({ item }: PropagationGraphProps) {
  const day = dayOfMonth(item.occurredAt);
  const month = monthShort(item.occurredAt);
  const shortDate = day && month ? `${day} ${month}` : null;

  return (
    <div className="mt-2.5 w-full">
    <div
      className="flex flex-col w-full"
      role="group"
      aria-label="How this development reaches your ambition"
    >
      <Node label="News sources" tone="border-[#DDE3EA] bg-[#F4F6F9] text-[#2E3A4A]">
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
          {item.sources.slice(0, 3).map((source) => (
            <li key={source.id} className="text-[11px] font-medium font-dm-sans break-words">
              {source.name}
            </li>
          ))}
        </ul>
      </Node>

      <Edge label="report" />

      <Node label="What happened" tone="border-[#CFDDF3] bg-[#F1F6FD] text-[#1E3A66]">
        <p className="text-[11.5px] font-semibold leading-snug mt-1 font-ubuntu">{item.title}</p>
        <p className="text-[10px] mt-1 opacity-80 font-dm-sans">
          {item.continuity ? CONTINUITY_LABELS[item.continuity] : "Development"}
          {shortDate ? ` | ${shortDate}` : ""}
        </p>
      </Node>

      {item.assumption && (
        <>
          <Edge label="affects" />
          <Node label="What you assumed" tone="border-[#F0D5D3] bg-[#FFF8F7] text-[#701A23]">
            <p className="text-[11.5px] font-semibold leading-snug mt-1 font-ubuntu">&ldquo;{item.assumption.statement}&rdquo;</p>
            <p className="text-[10.5px] mt-1 leading-snug text-[#4A4742] font-dm-sans">
              <span className="font-semibold">Why this could be wrong (AI&apos;s view):</span> {item.assumption.note}
            </p>
          </Node>
        </>
      )}

      <Edge label={item.assumption ? "which supports" : "affects"} />

      <Node label="Your goal" tone="border-[#F0D5D3] bg-[#FCF4F3] text-[#701A23]">
        <p className="text-[11.5px] font-semibold leading-snug mt-1 font-ubuntu">{item.ambitionTitle}</p>
        <p className="text-[10.5px] mt-1 leading-snug text-[#4A4742] font-dm-sans">{item.whyItMatters}</p>
        {item.couldChange && (
          <p className="text-[10.5px] mt-1.5 leading-snug text-[#701A23] font-dm-sans">
            <span className="font-semibold">What this could change:</span> {item.couldChange}
          </p>
        )}
        {item.assumption?.reconsider && (
          <p className="text-[10.5px] mt-1.5 leading-snug text-[#701A23] font-dm-sans">
            <span className="font-semibold">Think about this:</span> {item.assumption.reconsider}
          </p>
        )}
      </Node>
    </div>
    {item.storyId && <StoryTimeline storyId={item.storyId} currentId={item.developmentId} />}
    </div>
  );
}
