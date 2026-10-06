"use client";

import React, { useMemo, useState } from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PlanStatusHero } from "@/components/dashboard/PlanStatusHero";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { SectionNav } from "@/components/dashboard/SectionNav";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { TodaysSummaryCard } from "@/components/dashboard/TodaysSummaryCard";
import { AgentWidget } from "@/components/dashboard/AgentWidget";
import { TrackedStoriesWidget } from "@/components/dashboard/TrackedStoriesWidget";
import { RelevantItemsWidget } from "@/components/dashboard/RelevantItemsWidget";
import { LensPanel } from "@/components/dashboard/LensPanel";
import { LearningStrip } from "@/components/dashboard/LearningStrip";
import { PersonalizeModal } from "@/components/dashboard/PersonalizeModal";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";

const SECTION_IDS = ["plan-status", "briefing", "stories", "lens"] as const;

export default function DashboardView() {
  useAuthGuard();

  const {
    searchQuery,
    setSearchQuery,
    isPersonalizeOpen,
    setIsPersonalizeOpen,
    state,
    pipelineRunning,
    fullName,
    trackedStories,
    summaryData,
    lens,
    pendingIds,
    actionError,
    isLoading,
    error,
    retry,
    refresh,
    toggleItemTrack,
    untrackStory,
    sendItemFeedback,
    relevantIds,
    restoreHidden,
  } = useDashboard();
  const { plan, deciding, reload: reloadPlan, decide } = usePlanStatus();
  // A stable assumption has been answered or was never in doubt, so its old evidence no longer needs attention.
  const answeredAssumptionIds = useMemo(
    () => new Set((plan?.ambitions ?? []).flatMap((a) => a.assumptions).filter((a) => a.state === "stable").map((a) => a.id)),
    [plan],
  );
  const needAttention = summaryData.filter((i) => i.attention === "act" && !(i.assumption && answeredAssumptionIds.has(i.assumption.id))).length;
  const sections = [
    { id: "plan-status", label: "Plan status", badge: needAttention },
    { id: "briefing", label: "Today's briefing" },
    { id: "stories", label: "Your stories" },
    { id: "lens", label: "Your Lens" },
  ];
  const [activeSection, setActiveSection] = useState<string>(SECTION_IDS[0]);
  const refreshAll = () => {
    refresh();
    void reloadPlan();
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1918] flex flex-col md:flex-row antialiased selection:bg-[#701A23]/15 selection:text-[#701A23] font-ubuntu">
      {/* 1. Left Sidebar Navigation */}
      <DashboardSidebar />

      {/* 2. Main Content Area */}
      <main className="flex-1 min-w-0 px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 pb-24 md:pb-8 flex flex-col gap-4 sm:gap-6 max-w-[1400px]">
        {/* Top Header: Search & User Controls */}
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            if (q.trim()) setActiveSection("briefing");
          }}
          onPipelineComplete={refreshAll}
          pipelineRunning={pipelineRunning}
        />

        {/* Hero Section Banner */}
        <HeroBanner fullName={fullName} />

        <SectionNav sections={sections} active={activeSection} onChange={setActiveSection} />

        {activeSection === "plan-status" && (
          <DashboardSection id="plan-status" title="Plan status">
            <PlanStatusHero plan={plan} deciding={deciding} onDecide={decide} />
          </DashboardSection>
        )}

        {activeSection !== "plan-status" && isLoading && <DashboardSkeleton />}
        {activeSection !== "plan-status" && !isLoading && error && <DashboardErrorState message={error} onRetry={retry} />}

        {!isLoading && !error && activeSection === "briefing" && (
          <DashboardSection id="briefing" title="Today's briefing">
            <TodaysSummaryCard
              setAsideCount={lens?.setAside ?? 0}
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery("")}
              items={summaryData}
              dashboardState={state}
              pendingIds={pendingIds}
              actionError={actionError}
              onToggleTrack={toggleItemTrack}
              relevantIds={relevantIds}
              onFeedback={sendItemFeedback}
              answeredAssumptionIds={answeredAssumptionIds}
            />
          </DashboardSection>
        )}

        {!isLoading && !error && activeSection === "stories" && (
          <DashboardSection id="stories" title="Your stories">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <TrackedStoriesWidget stories={trackedStories} pendingIds={pendingIds} onUntrack={untrackStory} />
              <RelevantItemsWidget items={summaryData} />
            </div>
          </DashboardSection>
        )}

        {!isLoading && !error && activeSection === "lens" && (
          <DashboardSection id="lens" title="Your Lens">
            <LearningStrip lens={lens} />
            <LensPanel lens={lens} pendingIds={pendingIds} onRestore={restoreHidden} />
          </DashboardSection>
        )}
      </main>

      <AgentWidget />

      <PersonalizeModal
        isOpen={isPersonalizeOpen}
        onClose={() => setIsPersonalizeOpen(false)}
      />
    </div>
  );
}
