"use client";

import React from "react";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { HeroBanner } from "@/components/dashboard/HeroBanner";
import { TodaysSummaryCard } from "@/components/dashboard/TodaysSummaryCard";
import { AIAgentCard } from "@/components/dashboard/AIAgentCard";
import { TrackedStoriesWidget } from "@/components/dashboard/TrackedStoriesWidget";
import { RelevantItemsWidget } from "@/components/dashboard/RelevantItemsWidget";
import { LensPanel } from "@/components/dashboard/LensPanel";
import { LearningStrip } from "@/components/dashboard/LearningStrip";
import { AgentModal } from "@/components/dashboard/AgentModal";
import { PersonalizeModal } from "@/components/dashboard/PersonalizeModal";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { DashboardErrorState } from "@/components/dashboard/DashboardErrorState";

export default function DashboardView() {
  useAuthGuard();

  const {
    searchQuery,
    setSearchQuery,
    isAgentModalOpen,
    setIsAgentModalOpen,
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

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1918] flex flex-col md:flex-row antialiased selection:bg-[#701A23]/15 selection:text-[#701A23] font-ubuntu">
      {/* 1. Left Sidebar Navigation */}
      <DashboardSidebar
        onOpenAgentModal={() => setIsAgentModalOpen(true)}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 min-w-0 px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 pb-24 md:pb-8 flex flex-col gap-4 sm:gap-6 max-w-[1400px]">
        {/* Top Header: Search & User Controls */}
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onPipelineComplete={refresh}
          pipelineRunning={pipelineRunning}
        />

        {/* Hero Section Banner */}
        <HeroBanner
          fullName={fullName}
          onOpenAgentModal={() => setIsAgentModalOpen(true)}
        />

        {/* Two-Column Section: Skeletons, Error Recovery, or Populated Grid */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <DashboardErrorState message={error} onRetry={retry} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start">
            {/* Left Column: Today's Summary (AI Summarization with Sources) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <LearningStrip lens={lens} />
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
              />
            </div>

            {/* Right Column: AI Agent Card, Tracked Stories & Ambition Links */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              <AIAgentCard
                onOpenAgentModal={() => setIsAgentModalOpen(true)}
              />

              <TrackedStoriesWidget
                stories={trackedStories}
                pendingIds={pendingIds}
                onUntrack={untrackStory}
              />

              <RelevantItemsWidget items={summaryData} />

              <LensPanel lens={lens} pendingIds={pendingIds} onRestore={restoreHidden} />
            </div>
          </div>
        )}
      </main>

      {/* 3. Interactive Modals */}
      <AgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
      />

      <PersonalizeModal
        isOpen={isPersonalizeOpen}
        onClose={() => setIsPersonalizeOpen(false)}
      />
    </div>
  );
}
