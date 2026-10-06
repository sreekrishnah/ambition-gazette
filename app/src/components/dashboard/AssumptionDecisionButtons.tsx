"use client";

import React from "react";
import Link from "next/link";
import type { AssumptionDecision } from "@/types/api";

interface AssumptionDecisionButtonsProps {
  ambitionId: string;
  assumptionId: string;
  busy: boolean;
  onDecide: (ambitionId: string, assumptionId: string, decision: AssumptionDecision) => void;
}

const BASE = "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

/** The person's answer to evidence against an assumption. Each choice is recorded and resets what counts as new. */
export function AssumptionDecisionButtons({ ambitionId, assumptionId, busy, onDecide }: AssumptionDecisionButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 font-dm-sans" role="group" aria-label="Your decision">
      <button type="button" disabled={busy} onClick={() => onDecide(ambitionId, assumptionId, "keep")} className={`${BASE} border-[#701A23] bg-[#701A23] text-white hover:bg-[#58141B]`}>
        Still true
      </button>
      <Link href="/ambitions" className={`${BASE} border-[#701A23] text-[#701A23] hover:bg-[#FCF4F3]`}>
        Edit
      </Link>
      <button type="button" disabled={busy} onClick={() => onDecide(ambitionId, assumptionId, "change_plan")} className={`${BASE} border-[#701A23] text-[#701A23] hover:bg-[#FCF4F3]`}>
        Change my plan
      </button>
      <button type="button" disabled={busy} onClick={() => onDecide(ambitionId, assumptionId, "dismiss")} className={`${BASE} border-[#ECE7DF] bg-white text-[#524E48] hover:bg-[#FAF8F5]`}>
        Ignore
      </button>
    </div>
  );
}
