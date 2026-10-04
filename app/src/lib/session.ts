// Shared cookie names/options. `ag_session` is a presence flag only; the token stays in the httpOnly cookie.
export const SESSION_COOKIE = "session";
export const SESSION_FLAG_COOKIE = "ag_session";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

interface CookieJar {
  set(name: string, value: string, options: Record<string, unknown>): unknown;
  delete(name: string): unknown;
}

export function setSessionCookies(jar: CookieJar, token: string): void {
  const base = {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SEC,
  };
  jar.set(SESSION_COOKIE, token, { ...base, httpOnly: true });
  jar.set(SESSION_FLAG_COOKIE, "1", { ...base, httpOnly: false });
}

export function clearSessionCookies(jar: CookieJar): void {
  jar.delete(SESSION_COOKIE);
  jar.delete(SESSION_FLAG_COOKIE);
}
