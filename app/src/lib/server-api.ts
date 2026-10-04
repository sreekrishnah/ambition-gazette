import { cookies } from "next/headers";
import { ApiError, parseApiResponse } from "@/lib/api-error";
import { SESSION_COOKIE } from "@/lib/session";

// Server-only: reads the httpOnly session cookie. Never import from client components.
export const API_ORIGIN =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ServerRequestOptions {
  authenticated?: boolean;
}

export async function serverRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  { authenticated = true }: ServerRequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (authenticated) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) throw new ApiError("Please sign in to continue.", "UNAUTHENTICATED", 401);
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_ORIGIN}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("The service is unreachable. Please try again shortly.", "SOURCE_UNAVAILABLE", 502);
  }
  return parseApiResponse<T>(res);
}
