import React from "react";

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading intelligence briefing"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-7 items-start animate-pulse"
    >
      {/* Left Column: Today's Summary Skeleton */}
      <div className="lg:col-span-7 flex flex-col">
        <section className="bg-white border border-[#ECE7DF] rounded-2xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col space-y-4">
          {/* Header Banner Skeleton */}
          <div className="bg-[#FAF8F5] border border-[#F3ECE5] rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#E5DFD7] rounded-full" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-[#E5DFD7] rounded-md" />
                <div className="h-3 w-56 bg-[#EFEAE2] rounded-md" />
              </div>
            </div>
            <div className="h-6 w-28 bg-[#F0EBE3] rounded-lg" />
          </div>

          {/* 3 Summary Item Skeletons */}
          <div className="divide-y divide-[#F2ECE4]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="py-4 flex flex-col md:flex-row md:items-start justify-between gap-3 md:gap-6"
              >
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#E5DFD7] rounded-md w-3/4" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-[#EFEAE2] rounded-md w-full" />
                    <div className="h-3 bg-[#EFEAE2] rounded-md w-5/6" />
                  </div>
                </div>
                <div className="space-y-2 shrink-0">
                  <div className="h-2.5 w-16 bg-[#EFEAE2] rounded-md" />
                  <div className="h-6 w-24 bg-[#F2EDE5] rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Column: AI Agent, Tracked Stories & Ambition Link Skeletons */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        {/* AI Agent Card Skeleton */}
        <div className="bg-white border border-[#ECE7DF] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E5DFD7]" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-32 bg-[#E5DFD7] rounded-md" />
              <div className="h-2.5 w-44 bg-[#EFEAE2] rounded-md" />
            </div>
          </div>
          <div className="h-8 bg-[#F2EDE5] rounded-xl w-full" />
        </div>

        {/* Tracked Stories Skeleton */}
        <div className="bg-white border border-[#ECE7DF] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="h-3.5 w-28 bg-[#E5DFD7] rounded-md" />
            <div className="h-3 w-16 bg-[#EFEAE2] rounded-md" />
          </div>
          <div className="space-y-3 pt-1">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-11 rounded-xl bg-[#F0EBE3] shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-[#E5DFD7] rounded-md w-3/4" />
                    <div className="h-2.5 bg-[#EFEAE2] rounded-md w-1/2" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-[#EFEAE2] rounded-full shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Ambition Links Skeleton */}
        <div className="bg-white border border-[#ECE7DF] rounded-2xl p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-3">
          <div className="flex items-center justify-between pb-1">
            <div className="h-3.5 w-36 bg-[#E5DFD7] rounded-md" />
            <div className="h-3 w-16 bg-[#EFEAE2] rounded-md" />
          </div>
          <div className="space-y-3 pt-1">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#F0EBE3] shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-[#E5DFD7] rounded-md w-2/3" />
                  <div className="h-2.5 bg-[#EFEAE2] rounded-md w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
