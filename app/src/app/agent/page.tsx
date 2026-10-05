import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AgentView from "@/components/AgentView";
import { SESSION_COOKIE } from "@/lib/session";

export const metadata: Metadata = {
  title: "AI Agent | Ambition Gazette",
  description: "Your daily briefing aligned to your ambitions.",
};

export default async function Page() {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)?.value) {
    redirect("/login");
  }

  return <AgentView />;
}
