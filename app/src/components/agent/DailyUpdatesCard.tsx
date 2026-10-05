"use client";

import React from "react";
import { CalendarDays } from "lucide-react";
import { dayParts } from "@/lib/format";
import type { AgentDaySummary } from "@/types/api";

interface DailyUpdatesCardProps {
  days: AgentDaySummary[];
  selectedDate: string;
  todayDate: string;
  onSelect: (date: string) => void;
}

/** The days that have a saved briefing: a swipeable strip on phones, a scrolling list beside the day on desktop. */
export function DailyUpdatesCard({ days, selectedDate, todayDate, onSelect }: DailyUpdatesCardProps) {
  return (
    <div className="bg-white border border-[#ECE7DF] rounded-2xl p-3 sm:p-4 lg:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2 px-1 pb-2.5 lg:pb-3.5">
        <CalendarDays className="w-4 h-4 text-[#701A23] stroke-[2]" aria-hidden="true" />
        <h3 className="font-ubuntu font-bold text-[15px] sm:text-[16px] text-[#1A1918]">Daily Tracking</h3>
      </div>

      <ul className="scroll-strip flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[360px] -mx-1 px-1 pb-1 snap-x" aria-label="Days">
        {days.map((entry) => {
          const selected = entry.date === selectedDate;
          const { day, month, weekday } = dayParts(entry.date);
          return (
            <li key={entry.date} className="shrink-0 lg:shrink snap-start">
              <button
                type="button"
                onClick={() => onSelect(entry.date)}
                aria-current={selected ? "date" : undefined}
                className={`w-[92px] lg:w-full flex flex-col lg:flex-row items-center gap-1 lg:gap-3 py-2.5 px-2 lg:px-3 rounded-xl text-center lg:text-left cursor-pointer border ${
                  selected ? "bg-[#FDF2F0] border-[#FCDAD5] shadow-sm" : "border-[#F1ECE4] lg:border-transparent hover:bg-[#FAF8F5]"
                }`}
              >
                <span className="lg:w-10 shrink-0 font-dm-sans">
                  <span className={`block text-[16px] font-bold leading-none ${selected ? "text-[#701A23]" : "text-[#1A1918]"}`}>{day}</span>
                  <span className="block text-[10.5px] text-[#68645E] leading-tight mt-1">{month}</span>
                </span>
                <span className="min-w-0 lg:flex-1">
                  <span className="block text-[12px] lg:text-[12.5px] font-semibold text-[#1A1918] leading-tight">{entry.date === todayDate ? "Today" : weekday}</span>
                  <span className="block text-[10.5px] lg:text-[11px] text-[#68645E] leading-tight mt-0.5 font-dm-sans">
                    {entry.items === 1 ? "1 update" : `${entry.items} updates`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
