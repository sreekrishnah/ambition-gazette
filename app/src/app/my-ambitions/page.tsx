import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AmbitionsView from "@/components/AmbitionsView";
import { SESSION_COOKIE } from "@/lib/session";

export const metadata: Metadata = {
  title: "My Ambitions | Ambition Gazette",
  description: "Manage your active ambitions and their parameters.",
};

export default async function Page() {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)?.value) {
    redirect("/login");
  }

  return <AmbitionsView />;
}
