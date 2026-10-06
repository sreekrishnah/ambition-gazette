"use client";

import React from "react";

export interface SectionLink {
  id: string;
  label: string;
  // Shown as a small count next to the label, for example how many items need attention.
  badge?: number;
}

interface SectionNavProps {
  sections: SectionLink[];
  active: string;
  onChange: (id: string) => void;
}

/** Tab bar for the dashboard: exactly one section is shown at a time, so each part stays separate and easy to reach. */
export function SectionNav({ sections, active, onChange }: SectionNavProps) {
  const move = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    event.preventDefault();
    const next = sections[(index + step + sections.length) % sections.length];
    onChange(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <div role="tablist" aria-label="Dashboard sections" className="flex gap-2 overflow-x-auto no-scrollbar border-b border-[#ECE7DF] pb-2">
      {sections.map((s, index) => {
        const selected = active === s.id;
        return (
          <button
            key={s.id}
            id={`tab-${s.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`panel-${s.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(s.id)}
            onKeyDown={(e) => move(e, index)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-medium font-dm-sans cursor-pointer transition-colors ${
              selected ? "border-[#701A23] bg-[#701A23] text-white" : "border-[#ECE7DF] bg-white text-[#524E48] hover:bg-[#FCF4F3]"
            }`}
          >
            {s.label}
            {s.badge !== undefined && s.badge > 0 && (
              <span className={`rounded-full px-1.5 text-[10px] font-semibold ${selected ? "bg-white/25 text-white" : "bg-[#701A23] text-white"}`}>{s.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
