"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, Target, RefreshCw, AlertCircle } from "lucide-react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { AgentWidget } from "@/components/dashboard/AgentWidget";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { AmbitionHeroBanner } from "@/components/ambitions/AmbitionHeroBanner";
import { AmbitionDetailsCard } from "@/components/ambitions/AmbitionDetailsCard";
import { AssumptionsCard } from "@/components/ambitions/AssumptionsCard";
import { GoalEvolutionCard } from "@/components/ambitions/GoalEvolutionCard";
import { AmbitionProgressCard } from "@/components/ambitions/AmbitionProgressCard";
import { EditAmbitionModal } from "@/components/ambitions/EditAmbitionModal";
import { AmbitionActivity, AmbitionData, AmbitionEdit } from "@/types/ambitions";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import api from "@/lib/api";

export default function AmbitionsView() {
  useAuthGuard();

  const [searchQuery, setSearchQuery] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [ambitionData, setAmbitionData] = useState<AmbitionData | null>(null);
  const [activity, setActivity] = useState<AmbitionActivity>({ trackedStories: 0, linkedItems: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [evolutionKey, setEvolutionKey] = useState(0);

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      setFetchError(null);
      try {
        const [ambitions, dashboard] = await Promise.all([api.getAmbitions(), api.getDashboard()]);
        const active = ambitions.ambitions.find((a) => a.status.toLowerCase() === "active");

        if (active) {
          const profile = ambitions.profile;
          setAmbitionData({
            id: active.id,
            title: active.title,
            description: active.description ?? "",
            timeHorizon: active.horizon ?? "",
            location: active.geography ?? "",
            createdAt: active.createdAt,
            role: profile?.role ?? "",
            activity: profile?.activity ?? "",
            topics: profile?.topics ?? [],
          });
          setActivity({
            trackedStories: dashboard.trackedStories.length,
            linkedItems: dashboard.items.filter((i) => i.ambitionId === active.id).length,
          });
        } else {
          setAmbitionData(null);
        }
      } catch (err: unknown) {
        setFetchError(err instanceof Error ? err.message : "Unable to load your ambition.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [reloadCount]);

  const handleSaveEdit = async (edit: AmbitionEdit) => {
    if (!ambitionData) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await api.updateAmbition(ambitionData.id, {
        title: edit.title,
        description: edit.description,
        horizon: edit.timeHorizon,
        geography: edit.location,
      });
      setAmbitionData({ ...ambitionData, ...edit });
      setIsEditModalOpen(false);
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 3000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Could not save your changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = () => {
    setSaveError(null);
    setIsEditModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1918] flex flex-col md:flex-row antialiased selection:bg-[#701A23]/15 selection:text-[#701A23] font-ubuntu">
      {/* 1. Left Sidebar Navigation */}
      <DashboardSidebar activeNav="ambitions" />

      {/* 2. Main Content Area */}
      <main className="flex-1 min-w-0 px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-5 pb-24 md:pb-8 flex flex-col gap-4 sm:gap-6 max-w-[1400px]">
        {/* Top Header: Search Bar & User Controls */}
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="w-full h-[240px] bg-[#E5DFD7] rounded-3xl" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 h-[360px] bg-white rounded-3xl border border-[#E5DFD7]" />
              <div className="lg:col-span-5 h-[360px] bg-white rounded-3xl border border-[#E5DFD7]" />
            </div>
          </div>
        ) : fetchError ? (
          /* Error State */
          <div className="bg-white border border-[#E8E2D8] rounded-3xl p-8 sm:p-10 text-center max-w-[600px] mx-auto my-8 font-ubuntu">
            <div className="w-12 h-12 rounded-2xl bg-[#FCF4F3] border border-[#F0D5D3] text-[#701A23] flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="font-serif text-[20px] text-[#1A1918] mb-2">
              Failed to Load Ambition Profile
            </h3>
            <p className="text-xs text-[#68645E] mb-5 font-dm-sans">
              {fetchError}
            </p>
            <button
              onClick={() => setReloadCount((c) => c + 1)}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#701A23] text-white text-xs font-medium hover:bg-[#58141B] transition cursor-pointer font-dm-sans"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : ambitionData ? (
          /* Populated Ambition View */
          <>
            {/* Hero Banner */}
            <AmbitionHeroBanner
              data={ambitionData}
              onEdit={() => openEditModal()}
            />

            {/* Middle Section: Details & Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-7 flex flex-col">
                <AmbitionDetailsCard
                  data={ambitionData}
                  onEdit={() => openEditModal()}
                />
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <AmbitionProgressCard createdAt={ambitionData.createdAt} activity={activity} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 flex flex-col">
                <AssumptionsCard ambitionId={ambitionData.id} onChanged={() => setEvolutionKey((k) => k + 1)} />
              </div>
              <div className="lg:col-span-6 flex flex-col">
                <GoalEvolutionCard ambitionId={ambitionData.id} reloadKey={evolutionKey + reloadCount} />
              </div>
            </div>
          </>
        ) : (
          /* Empty / Unconfigured Ambition State */
          <div className="bg-white border border-[#E8E2D8] rounded-3xl p-8 sm:p-12 text-center max-w-[640px] mx-auto my-8 shadow-xs font-ubuntu">
            <div className="w-14 h-14 rounded-2xl bg-[#FCF4F3] border border-[#F0D5D3] text-[#701A23] flex items-center justify-center mx-auto mb-4">
              <Target className="w-7 h-7 stroke-[1.8]" />
            </div>
            <p className="text-[11px] font-bold tracking-[0.18em] text-[#701A23] uppercase mb-1.5 font-dm-sans">
              No Active Ambition Profile
            </p>
            <h2 className="font-serif text-[22px] sm:text-[25px] text-[#1A1918] font-normal leading-snug tracking-tight mb-2.5">
              Define What You Are Striving To Accomplish
            </h2>
            <p className="text-[13px] text-[#68645E] leading-relaxed max-w-[440px] mx-auto mb-6 font-dm-sans">
              Ambition Gazette matches world developments to your specific aspirations. Specify your current role, primary ambition, and geographic lens to unlock custom daily intelligence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-dm-sans">
              <Link
                href="/ambition"
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#701A23] hover:bg-[#58141B] text-white text-[13px] font-medium transition shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                <span>Complete Ambition Onboarding</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Edit Ambition Details Modal */}
      {ambitionData && (
        <EditAmbitionModal
          key={isEditModalOpen ? "open" : "closed"}
          isOpen={isEditModalOpen}
          initialData={ambitionData}
          isSaving={isSaving}
          error={saveError}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEdit}
        />
      )}

      <AgentWidget />

      {/* Saved Toast Notification */}
      {isSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1918] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom duration-200 font-dm-sans">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Ambition details updated successfully</span>
        </div>
      )}
    </div>
  );
}
