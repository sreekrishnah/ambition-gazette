import React from "react";
import { Target } from "lucide-react";
import { AISummaryItem } from "@/types/dashboard";

interface RelevantItemsWidgetProps {
  items: AISummaryItem[];
}

const MAX_ROWS = 4;

export function RelevantItemsWidget({ items }: RelevantItemsWidgetProps) {
  const linked = items.filter((i) => i.whyItMatters && i.ambitionTitle).slice(0, MAX_ROWS);

  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 font-dm-sans">
        <h4 className="flex items-center gap-1.5 text-[13.5px] font-bold text-[#1A1918]">
          <Target className="w-4 h-4 text-[#701A23] " aria-hidden="true" />
          Relevant To Your Ambitions
        </h4>
      </div>

      {/* Item Rows */}
      <div className="space-y-3 mt-3">
        {linked.length === 0 ? (
          <div className="py-6 text-center text-[#7A746C] text-xs font-dm-sans bg-[#FAF8F5] rounded-xl border border-[#F0EBE3]">
            Nothing is linked to your ambitions yet.
          </div>
        ) : (
          linked.map((item) => (
            <div key={item.id} className="min-w-0 p-1.5 -mx-1.5">
              <h6 className="text-[12.5px] font-semibold text-[#1A1918] leading-tight truncate font-ubuntu">
                {item.title}
              </h6>
              <p className="text-[11px] text-[#68645E] leading-tight truncate mt-0.5 font-dm-sans">
                {item.ambitionTitle}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
