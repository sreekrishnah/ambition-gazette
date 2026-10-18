"use client";

import React from "react";
import { useAgentCall } from "./AgentProvider";

/** Always-available voice assistant: a small pill at the bottom that opens the language picker, then the call. */
export function AgentWidget() {
  const { openCall } = useAgentCall();

  return (
    <div className="fixed z-40 right-3.5 sm:right-6 bottom-20 md:bottom-6 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={openCall}
        className="inline-flex items-center gap-2 rounded-full bg-[#701A23] hover:bg-[#58141B] text-white pl-3.5 pr-4 py-2.5 text-[12px] font-medium font-dm-sans shadow-[0_6px_24px_rgba(112,26,35,0.35)] cursor-pointer active:scale-95 transition"
      >
        <span className="flex items-center gap-0.5 h-3" aria-hidden="true">
          <span className="w-[2px] h-2 bg-white rounded-full" />
          <span className="w-[2px] h-3 bg-white rounded-full" />
          <span className="w-[2px] h-2 bg-white rounded-full" />
        </span>
        Talk to Gazzy
      </button>
    </div>
  );
}
