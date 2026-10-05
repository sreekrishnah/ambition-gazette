"use client";

import { useEffect } from "react";
import { hasClientSession } from "@/lib/auth";

/**
 * Hook to guard client components against unauthorized access,
 * browser bfcache (Back/Forward Cache) restores, and stale sessions.
 */
export function useAuthGuard() {
  useEffect(() => {
    const verifyAuth = () => {
      const hasSession = hasClientSession();
      if (!hasSession) {
        window.location.replace("/login");
      }
    };

    // 1. Verify immediately on mount
    verifyAuth();

    // 2. Intercept page restoration from browser history cache (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      const hasSession = hasClientSession();
      if (event.persisted || !hasSession) {
        // Page was loaded from memory/bfcache or cookie was deleted
        window.location.replace("/login");
      }
    };

    // 3. Re-verify when tab regains focus or visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifyAuth();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", verifyAuth);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", verifyAuth);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
}
