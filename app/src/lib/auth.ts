import { SESSION_FLAG_COOKIE } from "@/lib/session";

/**
 * Client-side session presence helpers. The flag cookie carries no credentials;
 * the API verifies the real token on every request.
 */

export function hasClientSession(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((row) => row === `${SESSION_FLAG_COOKIE}=1`);
}

export function clearClientSession(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_FLAG_COOKIE}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;`;
}
