/**
 * Browser API client. Calls the same-origin /api proxy, which attaches the
 * httpOnly session token server-side.
 */

import { ApiError, parseApiResponse } from "@/lib/api-error";
import { clearClientSession } from "@/lib/auth";
import type {
  AgentDayResponse,
  AgentDaysResponse,
  Assumption,
  Evolution,
  AmbitionsResponse,
  DashboardResponse,
  LensResponse,
  StoryTimelineResponse,
  VoiceUsageResponse,
  FeedbackPayload,
  MemoryResponse,
  PipelineRunResponse,
  PipelineStatusResponse,
  WsTokenResponse,
} from "@/types/api";

export { ApiError };

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    credentials: "same-origin",
  });

  if (res.status === 401) {
    clearClientSession();
    window.location.replace("/login");
  }
  return parseApiResponse<T>(res);
}

export interface AmbitionUpdate {
  title: string;
  description: string;
  horizon: string;
  geography: string;
}

export const api = {
  getDashboard: () => request<DashboardResponse>("GET", "/dashboard"),
  getLens: () => request<LensResponse>("GET", "/dashboard/lens"),
  getStoryTimeline: (storyId: string) =>
    request<StoryTimelineResponse>("GET", `/story/${encodeURIComponent(storyId)}/timeline?peek=1`),
  getAmbitions: () => request<AmbitionsResponse>("GET", "/ambition"),
  updateAmbition: (id: string, update: AmbitionUpdate) =>
    request<{ success: true }>("PATCH", `/ambition/${encodeURIComponent(id)}`, update),

  getAssumptions: (ambitionId: string) =>
    request<{ success: true; assumptions: Assumption[] }>("GET", `/ambition/${encodeURIComponent(ambitionId)}/assumptions`),
  addAssumption: (ambitionId: string, statement: string) =>
    request<{ success: true; assumption: Assumption }>("POST", `/ambition/${encodeURIComponent(ambitionId)}/assumptions`, { statement }),
  restoreAssumption: (ambitionId: string, id: string) =>
    request<{ success: true; assumption: Assumption }>(
      "PATCH",
      `/ambition/${encodeURIComponent(ambitionId)}/assumptions/${encodeURIComponent(id)}`,
      { status: "holding" },
    ),
  deleteAssumption: (ambitionId: string, id: string) =>
    request<{ success: true }>("DELETE", `/ambition/${encodeURIComponent(ambitionId)}/assumptions/${encodeURIComponent(id)}`),
  getEvolution: (ambitionId: string) =>
    request<{ success: true; evolution: Evolution }>("GET", `/ambition/${encodeURIComponent(ambitionId)}/evolution`),

  getMemory: () => request<MemoryResponse>("GET", "/memory"),
  addInterest: (topic: string) => request<{ success: true }>("POST", "/memory/interests", { topic }),
  setMemoryStatus: (id: string, status: "active" | "archived") =>
    request<{ success: true }>("PATCH", `/memory/${encodeURIComponent(id)}`, { status }),

  trackStory: (storyId: string) => request<{ success: true }>("POST", "/story/track", { storyId }),
  untrackStory: (storyId: string) => request<{ success: true }>("DELETE", "/story/track", { storyId }),
  sendFeedback: (payload: FeedbackPayload) => request<{ success: true }>("POST", "/feedback", payload),

  runPipeline: () => request<PipelineRunResponse>("POST", "/pipeline/run"),
  getPipelineStatus: () => request<PipelineStatusResponse>("GET", "/pipeline/status"),

  getVoiceUsage: () => request<VoiceUsageResponse>("GET", "/agent/usage"),
  getAgentDays: () => request<AgentDaysResponse>("GET", "/agent/days"),
  getAgentDay: (date: string) => request<AgentDayResponse>("GET", `/agent/days/${encodeURIComponent(date)}`),
  getWsToken: () => request<WsTokenResponse>("POST", "/auth/ws-token"),
};

export default api;
