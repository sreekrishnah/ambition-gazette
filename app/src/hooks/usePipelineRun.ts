"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api, { ApiError } from "@/lib/api";

export type PipelinePhase = "idle" | "running" | "done" | "error";

export interface PipelineRunState {
  phase: PipelinePhase;
  message: string | null;
}

const POLL_INTERVAL_MS = 4000;
// A refresh can take many minutes (the server waits out model rate limits), so there is no overall deadline. Only a
// run that cannot be reached for this many polls in a row is given up on.
const MAX_CONSECUTIVE_POLL_FAILURES = 15;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Starts a pipeline run and follows it until the server reports it finished or failed, showing what it is doing.
 * If a run is already in progress when the page loads, it is followed too.
 */
export function usePipelineRun(onCompleted?: () => void, alreadyRunning = false) {
  const [state, setState] = useState<PipelineRunState>({ phase: "idle", message: null });
  const mounted = useRef(true);
  const busy = useRef(false);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const update = useCallback((next: PipelineRunState) => {
    if (mounted.current) setState(next);
  }, []);

  const follow = useCallback(async () => {
    let failures = 0;
    while (mounted.current) {
      await sleep(POLL_INTERVAL_MS);
      if (!mounted.current) return;
      try {
        const status = await api.getPipelineStatus();
        failures = 0;
        if (status.status === "COMPLETED") {
          update({ phase: "done", message: null });
          onCompletedRef.current?.();
          return;
        }
        if (status.status === "FAILED") {
          update({ phase: "error", message: status.error ?? "The update failed. Please try again." });
          return;
        }
        update({ phase: "running", message: status.progress ?? "Working on it" });
      } catch (err: unknown) {
        failures += 1;
        if (failures >= MAX_CONSECUTIVE_POLL_FAILURES) {
          update({ phase: "error", message: err instanceof Error ? err.message : "Lost contact with the server." });
          return;
        }
      }
    }
  }, [update]);

  const run = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    update({ phase: "running", message: "Starting" });

    try {
      try {
        await api.runPipeline();
      } catch (err: unknown) {
        // A run already in progress is still a run we can wait for.
        if (!(err instanceof ApiError && err.code === "ALREADY_RUNNING")) throw err;
      }
      await follow();
    } catch (err: unknown) {
      update({ phase: "error", message: err instanceof Error ? err.message : "The update could not be started." });
    } finally {
      busy.current = false;
    }
  }, [update, follow]);

  // Picks up a run that was started earlier, for example by the 6 am schedule or before the page was reloaded.
  useEffect(() => {
    if (!alreadyRunning || busy.current) return;
    busy.current = true;
    // follow() sets state only after its first awaited poll.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void follow().finally(() => {
      busy.current = false;
    });
  }, [alreadyRunning, follow]);

  return { ...state, run };
}
