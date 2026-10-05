"use client";

import React, { useState } from "react";
import { Bookmark, ChevronDown, ExternalLink, Newspaper, Phone, Target, Zap } from "lucide-react";
import { Collapse } from "@/components/common/Collapse";
import { PriorityBadge } from "@/components/common/PriorityBadge";
import { Thumbnail } from "@/components/common/Thumbnail";
import { useSingleOpen } from "@/hooks/useSingleOpen";
import { ATTENTION_LABELS } from "@/lib/labels";
import { longCalendarDate } from "@/lib/format";
import type { AgentDay, AgentSession, BriefingItem } from "@/types/api";

interface DayDetailCardProps {
  day: AgentDay;
}

const SHOWN_CALLS = 3;
const SHOWN_UPDATES = 5;
const ROW = "rounded-xl border transition-colors duration-300";
const ROW_OPEN = "border-[#E8D5D2] bg-[#FFFDFC] shadow-sm";
const ROW_CLOSED = "border-[#F1ECE4] hover:bg-[#FAF8F5]";
const CHIP_LINK =
  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#ECE7DF] bg-[#FAF8F5] text-[11px] text-[#2C2926] font-dm-sans hover:bg-[#F3EFE9] max-w-full";

function callTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#ECE7DF] text-[11px] text-[#524E48] font-dm-sans">
      <span className="text-[#701A23]">{icon}</span>
      {children}
    </span>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-1.5 font-ubuntu font-bold text-[13.5px] text-[#1A1918] mb-2">
      <span className="text-[#701A23]">{icon}</span>
      {children}
    </h4>
  );
}

function UpdateRow({ item, open, onToggle }: { item: BriefingItem; open: boolean; onToggle: () => void }) {
  const outlets = [...new Set(item.sources.map((s) => s.name))].slice(0, 2).join(", ");
  return (
    <li className={`${ROW} ${open ? ROW_OPEN : ROW_CLOSED}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 p-2.5 text-left cursor-pointer">
        <Thumbnail src={item.imageUrl} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block font-ubuntu font-semibold text-[12.5px] sm:text-[13px] text-[#1A1918] leading-snug line-clamp-2-safe">{item.headline}</span>
          <span className="block mt-0.5 text-[11px] text-[#7A756D] font-dm-sans truncate">
            {[ATTENTION_LABELS[item.attention], outlets].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ChevronDown className="chevron-turn w-4 h-4 shrink-0 text-[#948E85]" aria-hidden="true" />
      </button>
      <Collapse open={open}>
        <div className="px-3 pb-3.5 font-ubuntu">
          {item.summary && <p className="text-[12px] text-[#4A4742] leading-relaxed">{item.whatChanged ?? item.summary}</p>}
          {item.whyItMatters && (
            <p className="mt-2 text-[12px] text-[#2C2926] leading-relaxed bg-[#FCF4F3] border border-[#F0D5D3] rounded-lg px-3 py-2">
              <span className="font-semibold text-[#701A23]">Why it matters:</span> {item.whyItMatters}
            </p>
          )}
          {item.sources.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.sources.slice(0, 4).map((s, i) => (
                <a key={`${s.url}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer" className={CHIP_LINK}>
                  <span className="truncate">{s.name}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 text-[#7A756D]" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      </Collapse>
    </li>
  );
}

function CallRow({ session, open, onToggle }: { session: AgentSession; open: boolean; onToggle: () => void }) {
  return (
    <li className={`${ROW} ${open ? ROW_OPEN : ROW_CLOSED}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 p-2.5 text-left cursor-pointer">
        <span className="w-9 h-9 shrink-0 rounded-lg bg-[#FCF4F3] border border-[#F0D5D3] flex items-center justify-center text-[#701A23]">
          <Phone className="w-4 h-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-[#7A756D] font-dm-sans">{callTime(session.endedAt)}</span>
          <span className="block font-ubuntu text-[12.5px] text-[#1A1918] leading-snug line-clamp-2-safe">{firstSentence(session.summary)}</span>
        </span>
        <ChevronDown className="chevron-turn w-4 h-4 shrink-0 text-[#948E85]" aria-hidden="true" />
      </button>
      <Collapse open={open}>
        <div className="px-3 pb-3.5 font-ubuntu flex flex-col gap-3">
          <p className="text-[12px] text-[#4A4742] leading-relaxed">{session.summary}</p>
          {session.keyPoints.length > 0 && (
            <ul className="space-y-1.5 text-[12px] text-[#4A4742] leading-relaxed">
              {session.keyPoints.map((point, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#701A23] font-bold shrink-0">&bull;</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
          {session.nextSteps.length > 0 && (
            <ul className="space-y-2">
              {session.nextSteps.map((step) => (
                <li key={step.id} className="rounded-lg border border-[#ECE7DF] bg-white px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[#1A1918]">{step.title}</span>
                    <PriorityBadge priority={step.priority} />
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-[#68645E] leading-snug font-dm-sans">{step.description}</p>
                </li>
              ))}
            </ul>
          )}
          {session.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {session.sources.map((s, i) => (
                <a key={`${s.url}-${i}`} href={s.url} target="_blank" rel="noopener noreferrer" className={CHIP_LINK}>
                  <span className="truncate">{s.title ?? s.name}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 text-[#7A756D]" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      </Collapse>
    </li>
  );
}

/** One day on a single card: what was delivered, what was tracked, and the calls held, each opening one at a time. */
export function DayDetailCard({ day }: DayDetailCardProps) {
  const updates = useSingleOpen();
  const calls = useSingleOpen();
  const [allCalls, setAllCalls] = useState(false);
  const [allUpdates, setAllUpdates] = useState(false);
  const [fullClosing, setFullClosing] = useState(false);

  const tracked = day.items.filter((i) => i.tracked);
  const needAttention = day.items.filter((i) => i.attention === "act").length;
  const shownCalls = allCalls ? day.sessions : day.sessions.slice(0, SHOWN_CALLS);
  const hiddenCalls = day.sessions.length - shownCalls.length;
  const shownUpdates = allUpdates ? day.items : day.items.slice(0, SHOWN_UPDATES);
  const hiddenUpdates = day.items.length - shownUpdates.length;

  return (
    <div className="bg-white border border-[#ECE7DF] rounded-2xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-[#701A23] stroke-[2]" aria-hidden="true" />
          <h3 className="font-ubuntu font-bold text-[15.5px] sm:text-[16.5px] text-[#1A1918]">Daily Summary</h3>
        </div>
        <span className="font-dm-sans text-[11.5px] sm:text-xs text-[#524E48]">{longCalendarDate(day.date)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Stat icon={<Newspaper className="w-3.5 h-3.5" aria-hidden="true" />}>
          {day.items.length} {day.items.length === 1 ? "update" : "updates"}
        </Stat>
        {needAttention > 0 && (
          <Stat icon={<Zap className="w-3.5 h-3.5" aria-hidden="true" />}>{needAttention} need attention</Stat>
        )}
        {tracked.length > 0 && <Stat icon={<Bookmark className="w-3.5 h-3.5" aria-hidden="true" />}>{tracked.length} tracked</Stat>}
        {day.sessions.length > 0 && (
          <Stat icon={<Phone className="w-3.5 h-3.5" aria-hidden="true" />}>
            {day.sessions.length} {day.sessions.length === 1 ? "call" : "calls"}
          </Stat>
        )}
      </div>

      {day.closing && (
        <div>
          <p className={`font-ubuntu text-[12.5px] sm:text-[13px] text-[#4A4742] leading-relaxed ${fullClosing ? "" : "line-clamp-3"}`}>{day.closing}</p>
          <button type="button" onClick={() => setFullClosing((v) => !v)} className="mt-1 text-[11.5px] font-semibold text-[#701A23] cursor-pointer hover:underline">
            {fullClosing ? "Show less" : "Read more"}
          </button>
        </div>
      )}

      {day.items.length === 0 ? (
        <p className="font-ubuntu text-[12.5px] text-[#68645E]">No briefing was saved for this day.</p>
      ) : (
        <section aria-label="Updates">
          <SectionTitle icon={<Newspaper className="w-4 h-4" aria-hidden="true" />}>Updates</SectionTitle>
          <ul className="flex flex-col gap-2">
            {shownUpdates.map((item) => (
              <UpdateRow key={item.id} item={item} open={updates.openId === item.id} onToggle={() => updates.toggle(item.id)} />
            ))}
          </ul>
          {day.items.length > SHOWN_UPDATES && (
            <button type="button" onClick={() => setAllUpdates((v) => !v)} className="mt-2 text-[11.5px] font-semibold text-[#701A23] cursor-pointer hover:underline">
              {allUpdates ? "Show fewer updates" : `Show ${hiddenUpdates} more ${hiddenUpdates === 1 ? "update" : "updates"}`}
            </button>
          )}
        </section>
      )}

      {tracked.length > 0 && (
        <section aria-label="Tracked events">
          <SectionTitle icon={<Target className="w-4 h-4" aria-hidden="true" />}>Tracked events</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {tracked.map((item) => (
              <li key={item.id} className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-full border border-[#F0D5D3] bg-[#FCF4F3] text-[11.5px] text-[#701A23] font-dm-sans">
                <Bookmark className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.storyTitle || item.headline}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {day.sessions.length > 0 && (
        <section aria-label="Calls">
          <SectionTitle icon={<Phone className="w-4 h-4" aria-hidden="true" />}>Calls with Gazzy</SectionTitle>
          <ul className="flex flex-col gap-2">
            {shownCalls.map((session) => (
              <CallRow key={session.id} session={session} open={calls.openId === session.id} onToggle={() => calls.toggle(session.id)} />
            ))}
          </ul>
          {day.sessions.length > SHOWN_CALLS && (
            <button type="button" onClick={() => setAllCalls((v) => !v)} className="mt-2 text-[11.5px] font-semibold text-[#701A23] cursor-pointer hover:underline">
              {allCalls ? "Show fewer calls" : `Show ${hiddenCalls} more ${hiddenCalls === 1 ? "call" : "calls"}`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
