import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** Reads a client-only primitive (null during server render) without a mount effect. */
export function useClientValue<T extends string | number>(read: () => T): T | null {
  return useSyncExternalStore(subscribe, read, () => null);
}
