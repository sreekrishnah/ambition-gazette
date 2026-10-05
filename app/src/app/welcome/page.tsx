import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api-error";
import { serverRequest } from "@/lib/server-api";
import { SESSION_COOKIE } from "@/lib/session";

interface MeResponse {
  hasAmbition: boolean;
}

export default async function WelcomePage() {
  const cookieStore = await cookies();
  if (!cookieStore.get(SESSION_COOKIE)?.value) {
    redirect("/login");
  }

  // Users who already finished onboarding skip straight to the briefing.
  let hasAmbition = false;
  try {
    hasAmbition = (await serverRequest<MeResponse>("GET", "/auth/me")).hasAmbition;
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 401) redirect("/login");
    console.error("Welcome page could not check ambition status:", err);
  }
  if (hasAmbition) redirect("/today");

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Image with 85% Opacity */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/welcome-page-visual.png"
          alt="Welcome Background"
          fill
          priority
          className="object-cover object-center opacity-[0.65]"
        />
        {/* Subtle gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center p-3.5 sm:p-8">
        <div className="max-w-3xl w-full flex flex-col items-center text-center text-white">
          <div className="backdrop-blur-sm bg-black/20 p-5 sm:p-10 md:p-14 rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl">
            <p className="text-[10px] font-bold tracking-widest text-gazette-burgundy uppercase mb-3 sm:mb-4 drop-shadow-md underline underline-offset-4 decoration-gazette-burgundy/30">
              Welcome to Ambition Gazette
            </p>
            <h1 className="text-xl min-[380px]:text-2xl md:text-3xl font-serif leading-tight mb-4 sm:mb-6 text-white drop-shadow-lg">
              We don&apos;t lack information.<br />
              <span className="text-gazette-burgundy">We lack perspective.</span>
            </h1>
            
            <div className="text-sm text-white/90 max-w-xl mx-auto space-y-2 sm:space-y-3 mb-6 sm:mb-10 drop-shadow">
              <p className="text-sm sm:text-base">
                Most news tells you what happened.
              </p>
              <p className="text-sm sm:text-base font-medium text-white">
                Ambition Gazette tells you when it changed your situation.
              </p>
              <p className="pt-2 sm:pt-3 text-[10px] font-light text-white/70 uppercase tracking-wide">
                Before we can show you what matters, we need to know what you&apos;re paying attention to.
              </p>
            </div>
            
            <Link 
              href="/ambition" 
              className="inline-block bg-gazette-burgundy text-white px-6 sm:px-10 py-3 sm:py-4 rounded-full font-medium text-sm sm:text-base hover:bg-gazette-burgundy/90 transition-all shadow-xl hover:shadow-gazette-burgundy/20 hover:-translate-y-0.5"
            >
              Set Your Ambition &rarr;
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
