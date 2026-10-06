"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AIAgentCard } from "./AIAgentCard";
import { useAgentCall } from "./AgentProvider";

/** Always-available voice assistant: a small pill at the bottom that opens the Gazzy card with its call button. */
export function AgentWidget() {
  const { openCall } = useAgentCall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const call = () => {
    setOpen(false);
    openCall();
  };

  return (
    <div className="fixed z-40 right-3.5 sm:right-6 bottom-20 md:bottom-6 flex flex-col items-end gap-2">
      {open && (
        <div id="agent-widget-card" role="dialog" aria-label="Talk to Gazzy" className="relative w-[min(92vw,380px)] shadow-[0_10px_40px_rgba(26,25,24,0.18)] rounded-2xl">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-2.5 top-2.5 z-10 rounded-full p-1 text-[#7A756D] hover:bg-[#F3EFE9] cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
          <AIAgentCard onOpenAgentModal={call} />
        </div>
      )}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-controls="agent-widget-card"
          className="inline-flex items-center gap-2 rounded-full bg-[#701A23] hover:bg-[#58141B] text-white pl-3.5 pr-4 py-2.5 text-[12px] font-medium font-dm-sans shadow-[0_6px_24px_rgba(112,26,35,0.35)] cursor-pointer active:scale-95 transition"
        >
          <span className="flex items-center gap-0.5 h-3" aria-hidden="true">
            <span className="w-[2px] h-2 bg-white rounded-full" />
            <span className="w-[2px] h-3 bg-white rounded-full" />
            <span className="w-[2px] h-2 bg-white rounded-full" />
          </span>
          Talk to Gazzy
        </button>
      )}
    </div>
  );
}
