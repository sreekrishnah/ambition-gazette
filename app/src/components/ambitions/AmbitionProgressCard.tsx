import React from "react";
import { Activity } from "lucide-react";
import { longDate } from "@/lib/format";
import { AmbitionActivity } from "@/types/ambitions";

interface AmbitionProgressCardProps {
  createdAt: string;
  activity: AmbitionActivity;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysSince(iso: string): number | null {
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? null : Math.max(0, Math.floor((Date.now() - time) / MS_PER_DAY));
}

export function AmbitionProgressCard({ createdAt, activity }: AmbitionProgressCardProps) {
  const days = daysSince(createdAt);
  const stats: { label: string; value: string }[] = [
    { label: "Active since", value: longDate(createdAt) ?? "Unknown" },
    { label: "Days active", value: days === null ? "Unknown" : String(days) },
    { label: "Briefing items linked", value: String(activity.linkedItems) },
    { label: "Stories tracked", value: String(activity.trackedStories) },
  ];

  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col">
      <h3 className="flex items-center gap-2 font-ubuntu font-bold text-[17px] sm:text-[19px] text-[#1A1918] pb-2">
        <Activity className="w-4 h-4 text-[#701A23] sm:w-5 sm:h-5" aria-hidden="true" />
        Ambition Activity
      </h3>
      <div className="divide-y divide-[#F2EDE5] font-dm-sans">
        {stats.map((stat) => (
          <div key={stat.label} className="py-2.5 sm:py-3 flex items-center justify-between gap-4">
            <span className="text-[11.5px] sm:text-[12.5px] text-[#7A746C]">{stat.label}</span>
            <span className="text-[12px] sm:text-[12.5px] text-[#1A1918] font-medium text-right">{stat.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
