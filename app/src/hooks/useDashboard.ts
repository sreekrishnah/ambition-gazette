"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import api from "@/lib/api";
import { toSummaryItem } from "@/lib/briefing";
import type { AISummaryItem } from "@/types/dashboard";
import type { DashboardResponse, ItemFeedbackType, Lens } from "@/types/api";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function useDashboard() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAgentModalOpen, setIsAgentModalOpen] = useState<boolean>(false);
  const [isPersonalizeOpen, setIsPersonalizeOpen] = useState<boolean>(false);

  const [data, setData] = useState<DashboardResponse | null>(null);
  const [relevantIds, setRelevantIds] = useState<Set<string>>(new Set());
  const [lens, setLens] = useState<Lens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const mounted = useRef(true);

  const load = useCallback(async (background: boolean) => {
    try {
      const res = await api.getDashboard();
      if (!mounted.current) return;
      setData(res);
      setError(null);
      // The lens is supplementary: if it fails the briefing still renders without it.
      api
        .getLens()
        .then((lensRes) => mounted.current && setLens(lensRes.lens))
        .catch(() => mounted.current && setLens(null));
    } catch (err: unknown) {
      if (!mounted.current) return;
      // A failed background refresh must not wipe data already on screen.
      if (background) setActionError(errorMessage(err, "Unable to refresh your briefing."));
      else setError(errorMessage(err, "Unable to load your briefing."));
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    // load() only sets state after its awaited request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(false);
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const retry = useCallback(() => {
    setIsLoading(true);
    setError(null);
    void load(false);
  }, [load]);
  const refresh = useCallback(() => void load(true), [load]);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("dashboard-search-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const setPending = (id: string, pending: boolean) =>
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });

  const setTracked = (storyId: string, tracked: boolean) =>
    setData((prev) =>
      prev
        ? { ...prev, items: prev.items.map((i) => (i.storyId === storyId ? { ...i, tracked } : i)) }
        : prev
    );

  const toggleTrack = async (storyId: string, currentlyTracked: boolean, pendingKey: string) => {
    setActionError(null);
    setPending(pendingKey, true);
    setTracked(storyId, !currentlyTracked);
    try {
      if (currentlyTracked) await api.untrackStory(storyId);
      else await api.trackStory(storyId);
      refresh();
    } catch (err: unknown) {
      setTracked(storyId, currentlyTracked);
      setActionError(errorMessage(err, "Could not update tracking."));
    } finally {
      setPending(pendingKey, false);
    }
  };

  const toggleItemTrack = (item: AISummaryItem) => {
    if (!item.storyId) return Promise.resolve();
    return toggleTrack(item.storyId, Boolean(item.tracked), item.id);
  };

  const untrackStory = (storyId: string) => toggleTrack(storyId, true, storyId);

  const sendItemFeedback = async (item: AISummaryItem, feedbackType: ItemFeedbackType) => {
    if (!item.storyId) return;
    setActionError(null);
    setPending(item.id, true);
    try {
      await api.sendFeedback({
        storyId: item.storyId,
        developmentId: item.developmentId,
        reportItemId: item.id,
        feedbackType,
      });
      if (feedbackType === "relevant") {
        setRelevantIds((prev) => new Set(prev).add(item.id));
      } else {
        setData((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) } : prev));
      }
      refresh();
    } catch (err: unknown) {
      setActionError(errorMessage(err, "Could not save your feedback."));
    } finally {
      setPending(item.id, false);
    }
  };

  const restoreHidden = async (memoryId: string) => {
    setActionError(null);
    setPending(memoryId, true);
    try {
      await api.setMemoryStatus(memoryId, "archived");
      refresh();
    } catch (err: unknown) {
      setActionError(errorMessage(err, "Could not show this again."));
    } finally {
      setPending(memoryId, false);
    }
  };

  const summaryData = useMemo(() => (data?.items ?? []).map(toSummaryItem), [data]);

  return {
    searchQuery,
    setSearchQuery,
    isAgentModalOpen,
    setIsAgentModalOpen,
    isPersonalizeOpen,
    setIsPersonalizeOpen,
    state: data?.state ?? null,
    pipelineRunning: data?.pipeline.status === "PROCESSING",
    fullName: data?.user.fullName ?? null,
    items: data?.items ?? [],
    trackedStories: data?.trackedStories ?? [],
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
  };
}
