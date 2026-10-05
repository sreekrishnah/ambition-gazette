import React from "react";
import Image from "next/image";

export function AgentHero() {
  return (
    <section className="relative w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1 pb-1 overflow-hidden">
      {/* Left: Greeting & Headline */}
      <div className="z-10 max-w-xl">
        {/* Top Badge: Your AI Agent + Online */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-amber-100/90 flex items-center justify-center text-amber-600">
              <svg
                className="w-3 h-3 fill-amber-500 text-amber-500"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-ubuntu font-bold text-[13.5px] text-[#1A1918]">
              Your AI Agent
            </span>
          </div>

        </div>

        {/* Main Headline */}
        <h2 className="font-ubuntu font-bold text-[22px] min-[400px]:text-[26px] sm:text-[32px] md:text-[40px] text-[#1A1918] tracking-tight leading-[1.15] mt-2.5 sm:mt-3">
          Your daily intelligence,
          <br />
          aligned to your <span className="text-[#701A23]">ambitions.</span>
        </h2>

        {/* Subtitle */}
        <p className="font-ubuntu text-[12px] sm:text-[13px] md:text-[14px] text-[#68645E] mt-2 sm:mt-2.5 leading-relaxed">
          I track what matters, analyse it, and help you take the next steps.
        </p>
      </div>

      {/* Right: Flowing Luminous Brown Orb Visual */}
      <div className="w-full max-w-[240px] min-[400px]:max-w-[280px] sm:max-w-[340px] md:w-[460px] lg:w-[500px] h-[110px] sm:h-[150px] md:h-[200px] relative shrink-0 mx-auto md:mx-0 md:-mr-2 pointer-events-none select-none flex items-center justify-center md:justify-end">
        <Image
          src="/images/dashboard/ai-agent-orb.png"
          alt="AI Agent Intelligence Orb"
          fill
          sizes="(max-width: 480px) 240px, (max-width: 1024px) 340px, 500px"
          className="object-contain object-center md:object-right"
          priority
          unoptimized
        />
      </div>
    </section>
  );
}
