import React from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Target } from "lucide-react";

interface DashboardErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function DashboardErrorState({
  message = "We could not synchronize with the real-world events stream at this moment.",
  onRetry,
}: DashboardErrorStateProps) {
  return (
    <section
      role="alert"
      className="bg-white border border-[#E8E2D8] rounded-2xl p-5 sm:p-8 md:p-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)] text-center max-w-[680px] mx-auto my-4 sm:my-8 font-ubuntu"
    >
      {/* Icon Badge */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FCF4F3] border border-[#F0D5D3] text-[#701A23] flex items-center justify-center mx-auto mb-4 shadow-xs">
        <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[1.8]" />
      </div>

      <p className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.18em] text-[#701A23] uppercase mb-1.5 font-dm-sans">
        Intelligence Feed Interrupted
      </p>

      <h3 className="font-serif text-[19px] min-[400px]:text-[21px] sm:text-[24px] text-[#1A1918] font-normal leading-snug tracking-tight mb-2.5">
        Unable to Retrieve Morning Briefing
      </h3>

      <p className="text-[12px] sm:text-[13px] text-[#68645E] leading-relaxed max-w-[460px] mx-auto mb-6 font-dm-sans">
        {message} Your tracked goals remain safe and will reconnect once the feed stream responds.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-dm-sans">
        <button
          type="button"
          onClick={onRetry}
          className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#701A23] hover:bg-[#58141B] text-white text-[13px] font-medium transition shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Synchronization</span>
        </button>

        <Link
          href="/ambitions"
          className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-[#FAF8F5] border border-[#D5CFC6] text-[#2C2926] text-[13px] font-medium transition flex items-center justify-center gap-2"
        >
          <Target className="w-3.5 h-3.5 text-[#7A746C]" />
          <span>Review Ambition Parameters</span>
        </Link>
      </div>
    </section>
  );
}
