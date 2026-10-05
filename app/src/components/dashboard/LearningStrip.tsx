import React from "react";
import { Sparkles } from "lucide-react";
import type { Lens } from "@/types/api";
import { BASIS_LABELS } from "@/lib/labels";
import { dayOfMonth, monthShort } from "@/lib/format";

interface LearningStripProps {
  lens: Lens | null;
}

export function LearningStrip({ lens }: LearningStripProps) {
  if (!lens) return null;
  const { events, movedUp } = lens.learning;
  if (events.length === 0 && movedUp.length === 0) return null;

  return (
    <section className="bg-[#FCF4F3] border border-[#F0D5D3] rounded-2xl p-4">
      <h4 className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#701A23] font-dm-sans">
        <Sparkles className="w-4 h-4 text-[#701A23] " aria-hidden="true" />
        What changed since you told us
      </h4>

      {events.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {events.map((event) => (
            <li key={event.id} className="text-[11.5px] text-[#2C2926] leading-snug font-dm-sans">
              <span className="text-[#948E85]">
                {dayOfMonth(event.createdAt)} {monthShort(event.createdAt)}
              </span>{" "}
              <span className="font-semibold">{event.effect}</span>
              {event.storyTitle ? `: ${event.storyTitle}` : ""}
              {event.reason ? ` (${event.reason})` : ""}
            </li>
          ))}
        </ul>
      )}

      {movedUp.length > 0 && (
        <div className="mt-3">
          <p className="text-[10.5px] font-semibold text-[#701A23] font-dm-sans">Ranked higher because of you</p>
          <ul className="mt-1 space-y-1">
            {movedUp.map((item) => (
              <li key={item.developmentId} className="text-[11.5px] text-[#2C2926] leading-snug font-dm-sans">
                {item.headline} <span className="text-[#948E85]">({BASIS_LABELS[item.basis]})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
