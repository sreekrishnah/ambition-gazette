"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import type { AssumptionDecision, PlanStatus } from "@/types/api";

/** The state of every assumption behind the person's plans, with a way to answer the evidence. */
export function usePlanStatus() {
  const [plan, setPlan] = useState<PlanStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    try {
      const res = await api.getPlanStatus();
      if (!mounted.current) return;
      setPlan(res.plan);
      setError(null);
    } catch (err: unknown) {
      // The plan view is supplementary: the briefing keeps working if it cannot load.
      if (mounted.current) setError(err instanceof Error ? err.message : "Unable to load your plan status.");
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // reload() only sets state after its awaited request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    return () => {
      mounted.current = false;
    };
  }, [reload]);

  const decide = useCallback(
    async (ambitionId: string, assumptionId: string, decision: AssumptionDecision) => {
      setDeciding(assumptionId);
      try {
        await api.decideAssumption(ambitionId, assumptionId, decision);
        await reload();
      } catch (err: unknown) {
        if (mounted.current) setError(err instanceof Error ? err.message : "Could not save your decision.");
      } finally {
        if (mounted.current) setDeciding(null);
      }
    },
    [reload],
  );

  return { plan, error, deciding, reload, decide };
}
