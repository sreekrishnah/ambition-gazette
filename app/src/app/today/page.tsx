import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardView from "@/components/DashboardView";
import { SESSION_COOKIE } from "@/lib/session";

export const metadata: Metadata = {
  title: "Ambition Gazette | Today's Briefing",
  description: "Curated real-world developments connected to what you care about.",
};

export default async function Page() {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)?.value) {
    redirect("/login");
  }

  return <DashboardView />;
}
