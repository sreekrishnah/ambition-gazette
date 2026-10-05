"use client";

import React, { useState } from "react";
import { Search, Bell, Calendar } from "lucide-react";
import { usePipelineRun } from "@/hooks/usePipelineRun";
import { useClientValue } from "@/hooks/useClientValue";

interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  leftContent?: React.ReactNode;
  onPipelineComplete?: () => void;
  // True when a refresh is already running (started by the schedule or before this page loaded).
  pipelineRunning?: boolean;
}


export function DashboardHeader({
  searchQuery,
  onSearchChange,
  placeholder = "Search developments, topics, sources...",
  leftContent,
  onPipelineComplete,
  pipelineRunning = false,
}: DashboardHeaderProps) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  // Client-only so server and client markup match.
  const weekday = useClientValue(() => new Date().toLocaleDateString("en-GB", { weekday: "long" }));
  const dateLabel = useClientValue(() => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
  const pipeline = usePipelineRun(onPipelineComplete, pipelineRunning);
  const isRunning = pipeline.phase === "running";

  return (
    <div>
    <header className="flex items-center justify-between gap-2.5 sm:gap-4 font-dm-sans">
      {leftContent ? (
        <div className="shrink-0">{leftContent}</div>
      ) : null}

      {/* Centered Search Bar */}
      <div className="flex-1 flex justify-center min-w-0">
        <div className="w-full max-w-[460px] relative">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8C867E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="dashboard-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-[#FAF8F5] border border-[#E5E0D8] rounded-xl pl-8 sm:pl-9.5 pr-3 sm:pr-12 py-1.5 sm:py-2 text-[12px] sm:text-[13px] text-[#1A1918] placeholder-[#8C867E] focus:outline-none focus:border-[#701A23] focus:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition font-dm-sans truncate"
          />
          <span className="hidden sm:inline-flex absolute right-2.5 top-1/2 -translate-y-1/2 text-[10.5px] sm:text-[11px] font-medium text-[#7A746C] bg-[#F2EDE5] border border-[#E0DAD0] px-1.5 py-0.5 rounded shadow-2xs select-none font-dm-sans">
            ⌘ K
          </span>
        </div>
      </div>

      {/* Right Header Controls: Date & Bell */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative">
        {/* Date Display (Hidden on very small screens, compact on tablet, full on desktop) */}
        <div className="hidden min-[480px]:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/80 border border-[#E5E0D8] text-[#524E48] shadow-2xs font-dm-sans">
          <Calendar className="w-3.5 h-3.5 text-[#701A23] stroke-[2] shrink-0" />
          <span className="text-[11px] sm:text-[12px] font-medium text-[#1A1918] whitespace-nowrap">
            {dateLabel && (
              <>
                <span className="hidden lg:inline">{weekday}, </span>
                {dateLabel}
              </>
            )}
          </span>
        </div>

        {/* Pipeline refresh */}
        {pipeline.message && (
          <span
            role="status"
            className={`hidden sm:inline max-w-[340px] truncate text-[11px] ${
              pipeline.phase === "error" ? "text-[#B42318]" : "text-[#68645E]"
            }`}
            title={pipeline.message}
          >
            {pipeline.message}
          </span>
        )}
        <button
          onClick={pipeline.run}
          disabled={isRunning}
          className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-lg bg-[#FAF8F5] border border-[#E5E0D8] text-[#524E48] hover:bg-[#F2EDE5] transition text-[11px] font-medium disabled:opacity-60"
          aria-label="Refresh developments"
        >
          <svg className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.67-1.35"/>
          </svg>
          <span className="hidden sm:inline">{isRunning ? "Refreshing..." : "Refresh"}</span>
        </button>

        {/* Bell Icon with Red Badge & Popover Menu */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-1.5 sm:p-2 text-[#3D3A36] hover:text-[#1A1918] hover:bg-[#F2EDE5]/70 rounded-full transition cursor-pointer"
            aria-label="Notifications"
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] max-w-[340px] sm:w-88 bg-white border border-[#E8E2D8] rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F0EBE3] px-1">
                <span className="text-xs font-bold text-[#1A1918] uppercase tracking-wider font-dm-sans">
                  Notifications
                </span>
              </div>

              <p className="px-1 py-3 text-xs text-[#68645E] font-dm-sans text-left">No notifications</p>
            </div>
          )}
        </div>
      </div>
    </header>
    {pipeline.message && (
      <p role="status" className={`sm:hidden mt-2 text-[11px] leading-snug ${pipeline.phase === "error" ? "text-[#B42318]" : "text-[#68645E]"}`}>
        {pipeline.message}
      </p>
    )}
    </div>
  );
}

