"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AgentModal } from "./AgentModal";

interface AgentCallContextValue {
  openCall: () => void;
}

const AgentCallContext = createContext<AgentCallContextValue | null>(null);

/** Owns the single voice-call dialog, so any page or widget can start a call without its own copy. */
export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openCall = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ openCall }), [openCall]);

  return (
    <AgentCallContext.Provider value={value}>
      {children}
      <AgentModal isOpen={open} onClose={() => setOpen(false)} />
    </AgentCallContext.Provider>
  );
}

export function useAgentCall(): AgentCallContextValue {
  const ctx = useContext(AgentCallContext);
  if (!ctx) throw new Error("useAgentCall must be used inside AgentProvider.");
  return ctx;
}
