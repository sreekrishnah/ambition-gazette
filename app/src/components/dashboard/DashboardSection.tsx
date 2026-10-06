import React from "react";

interface DashboardSectionProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

/** The content of one selected tab: a title and the section itself. */
export function DashboardSection({ id, title, children }: DashboardSectionProps) {
  return (
    <section id={`panel-${id}`} role="tabpanel" aria-labelledby={`tab-${id}`} className="flex flex-col gap-3">
      <h2 className="font-ubuntu text-[15px] sm:text-[17px] font-bold text-[#1A1918] leading-tight">{title}</h2>
      {children}
    </section>
  );
}
