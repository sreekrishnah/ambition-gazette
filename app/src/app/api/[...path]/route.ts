import { NextRequest, NextResponse } from "next/server";
import { API_ORIGIN } from "@/lib/server-api";
import { clearSessionCookies, SESSION_COOKIE } from "@/lib/session";

// Browser-callable routes are an allowlist by exclusion: credentials and cron entry points stay server-side.
const BLOCKED_PATHS = new Set(["auth/login", "auth/register", "pipeline/batch"]);
const MAX_BODY_BYTES = 1024 * 1024;

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

async function forward(req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const { path } = await ctx.params;
  if (BLOCKED_PATHS.has(path.join("/"))) {
    return errorResponse(404, "NOT_FOUND", "Not found.");
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return errorResponse(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  const body = req.method === "GET" ? undefined : await req.text();
  if (body !== undefined && Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return errorResponse(413, "VALIDATION_ERROR", "Request is too large.");
  }

  const target = `${API_ORIGIN}/api/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (body) headers["Content-Type"] = "application/json";

  let upstream: Response;
  try {
    upstream = await fetch(target, { method: req.method, headers, body: body || undefined, cache: "no-store" });
  } catch {
    return errorResponse(502, "SOURCE_UNAVAILABLE", "The service is unreachable. Please try again shortly.");
  }

  const res = new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
  });
  if (upstream.status === 401) clearSessionCookies(res.cookies);
  return res;
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
