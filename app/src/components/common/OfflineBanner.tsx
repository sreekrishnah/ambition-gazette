"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { WifiOff, Wifi, RefreshCw, X } from "lucide-react";

const PROBE_TIMEOUT_MS = 4000;
const RETRY_INTERVAL_MS = 10000;

/**
 * navigator.onLine is only a hint (it is often wrong behind VPNs and virtual adapters), so the banner
 * is shown only when a real request to this app's own server fails. Any HTTP response, even a 401,
 * proves the server is reachable.
 */
async function isReachable(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch("/api/health", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const wasOffline = useRef(false);
  const restoredTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const check = useCallback(async () => {
    const reachable = await isReachable();
    if (reachable) {
      setIsOffline(false);
      if (wasOffline.current) {
        wasOffline.current = false;
        setShowRestored(true);
        clearTimeout(restoredTimer.current);
        restoredTimer.current = setTimeout(() => setShowRestored(false), 4000);
      }
    } else {
      if (!wasOffline.current) setIsDismissed(false);
      wasOffline.current = true;
      setIsOffline(true);
      setShowRestored(false);
    }
  }, []);

  useEffect(() => {
    // Only a browser that claims to be offline triggers a first probe; an online one is trusted until a request fails.
    // check() sets state only after its awaited request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.onLine) void check();

    const onOffline = () => void check();
    const onOnline = () => void check();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    const retry = setInterval(() => {
      if (wasOffline.current) void check();
    }, RETRY_INTERVAL_MS);

    return () => {
      clearInterval(retry);
      clearTimeout(restoredTimer.current);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [check]);

  const handleCheck = async () => {
    setIsChecking(true);
    await check();
    setIsChecking(false);
  };

  if (isOffline && !isDismissed) {
    return (
      <aside
        aria-live="assertive"
        className="w-full bg-[#1A1918] text-[#F3EFE9] px-3 sm:px-4 py-1.5 sm:py-2 text-[11.5px] sm:text-xs font-dm-sans flex items-center justify-between gap-2 border-b border-[#3D3A36] sticky top-0 z-50 shadow-md animate-in slide-in-from-top duration-300"
      >
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 flex-1 min-w-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <WifiOff className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="font-medium text-[#FAF8F5] leading-snug">
            Cannot reach Ambition Gazette. Updates are paused until the connection returns.
          </span>
          <button
            type="button"
            onClick={handleCheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1 text-[11px] underline text-amber-200 hover:text-white cursor-pointer shrink-0 disabled:opacity-60"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
            {isChecking ? "Checking" : "Check connection"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="text-[#9E988F] hover:text-white p-1 rounded transition shrink-0 cursor-pointer"
          aria-label="Dismiss offline alert"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  if (showRestored) {
    return (
      <div
        aria-live="polite"
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-[#15803D] text-white px-4 py-2 rounded-full text-xs font-dm-sans flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-bottom duration-300"
      >
        <Wifi className="w-3.5 h-3.5" />
        <span>Connection restored.</span>
      </div>
    );
  }

  return null;
}
