"use client";

import { useCallback, useState } from "react";

/** Accordion state where opening one entry closes the one that was open. */
export function useSingleOpen() {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = useCallback((id: string) => setOpenId((current) => (current === id ? null : id)), []);
  return { openId, toggle };
}
