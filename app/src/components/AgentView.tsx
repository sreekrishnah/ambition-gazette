"use client";

import React, { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { AgentWidget } from "@/components/dashboard/AgentWidget";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AgentHero } from "@/components/agent/AgentHero";
import { DailyUpdatesCard } from "@/components/agent/DailyUpdatesCard";
import { DayDetailCard } from "@/components/agent/DayDetailCard";
import api from "@/lib/api";
import { istToday } from "@/lib/format";
import type { AgentDay, AgentDaySummary } from "@/types/api";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useAuthGuard } from "@/hooks/useAuthGuard";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[20px] p-6 text-center text-[#8A847C] font-dm-sans border border-[#E5DFD7] space-y-3">
      {children}
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Panel>
      <AlertCircle className="w-8 h-8 text-[#701A23] mx-auto" />
      <p className="text-xs text-[#2C2926] font-medium">{message}</p>
      <button
        onClick={onRetry}
        type="button"
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#701A23] text-white text-xs font-medium hover:bg-[#58141B] transition cursor-pointer"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Retry</span>
      </button>
    </Panel>
  );
}

function LoadingPanel() {
  return (
    <div className="bg-white rounded-[20px] p-6 border border-[#E5DFD7] animate-pulse space-y-3" aria-busy="true">
      <div className="h-4 w-40 bg-[#F5ECE3] rounded" />
      <div className="h-3 w-full bg-[#F5ECE3] rounded" />
      <div className="h-3 w-5/6 bg-[#F5ECE3] rounded" />
    </div>
  );
}

export default function AgentView() {
  useAuthGuard();

  const [searchQuery, setSearchQuery] = useState("");
  const [days, setDays] = useState<AgentDaySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [daysLoading, setDaysLoading] = useState(true);
  const [daysError, setDaysError] = useState<string | null>(null);
  const [daysReload, setDaysReload] = useState(0);
  const [day, setDay] = useState<AgentDay | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);
  const [dayReload, setDayReload] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .getAgentDays()
      .then((res) => {
        if (!active) return;
        setDays(res.days);
        setDaysError(null);
        // Keep the day being read if the list reloads; otherwise open the most recent one.
        setSelectedDate((current) => (res.days.some((d) => d.date === current) ? current : (res.days[0]?.date ?? "")));
      })
      .catch((err: unknown) => active && setDaysError(errorMessage(err, "Unable to load your days.")))
      .finally(() => active && setDaysLoading(false));
    return () => {
      active = false;
    };
  }, [daysReload]);

  useEffect(() => {
    if (!selectedDate) return;
    let active = true;
    // The request below sets state only after it resolves; the loading flag is part of starting it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDayLoading(true);
    setDayError(null);
    api
      .getAgentDay(selectedDate)
      .then((res) => active && setDay(res.day))
      .catch((err: unknown) => active && setDayError(errorMessage(err, "Unable to load this day.")))
      .finally(() => active && setDayLoading(false));
    return () => {
      active = false;
    };
  }, [selectedDate, dayReload]);

  const showingSelected = day !== null && day.date === selectedDate;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1918] flex flex-col md:flex-row antialiased selection:bg-[#701A23]/15 selection:text-[#701A23] font-ubuntu">
      <DashboardSidebar activeNav="agent" />

      <main className="flex-1 min-w-0 px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 pb-24 md:pb-8 flex flex-col gap-4 sm:gap-5 max-w-[1400px]">
        <DashboardHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <AgentHero />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: the days that have a saved briefing, newest first */}
          <div className="lg:col-span-4 min-w-0">
            {daysLoading ? (
              <LoadingPanel />
            ) : daysError ? (
              <ErrorPanel
                message={daysError}
                onRetry={() => {
                  setDaysLoading(true);
                  setDaysReload((k) => k + 1);
                }}
              />
            ) : days.length > 0 ? (
              <DailyUpdatesCard days={days} selectedDate={selectedDate} todayDate={istToday()} onSelect={setSelectedDate} />
            ) : (
              <Panel>No days yet. Refresh developments on the dashboard to build your first briefing.</Panel>
            )}
          </div>

          {/* Right: everything for the selected day */}
          <div className="lg:col-span-8 min-w-0 flex flex-col gap-4">
            {days.length === 0 ? null : dayError ? (
              <ErrorPanel message={dayError} onRetry={() => setDayReload((k) => k + 1)} />
            ) : dayLoading || !showingSelected ? (
              <LoadingPanel />
            ) : (
              <div key={day.date} className="animate-fade-up">
                <DayDetailCard day={day} />
              </div>
            )}
          </div>
        </div>
      </main>
      <AgentWidget />
    </div>
  );
}
