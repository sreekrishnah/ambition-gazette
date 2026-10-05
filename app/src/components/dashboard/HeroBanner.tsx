"use client";

import React from "react";
import Image from "next/image";
import { useClientValue } from "@/hooks/useClientValue";

interface HeroBannerProps {
  fullName: string | null;
  onOpenAgentModal: () => void;
}

function greetingFor(hour: number): string {
  if (hour < 12) return "GOOD MORNING";
  if (hour < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

export function HeroBanner({ fullName, onOpenAgentModal }: HeroBannerProps) {
  // Client-only so server and client markup match.
  const hour = useClientValue(() => new Date().getHours());
  const greeting = hour === null ? "WELCOME" : greetingFor(hour);
  const firstName = fullName?.trim().split(/\s+/)[0];

  return (
    <section className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden min-h-[190px] sm:min-h-[220px] md:min-h-[235px] border border-[#ECE7DF] shadow-xs group">
      {/* Background Photography Image */}
      <Image
        src="/images/dashboard/hero-traveler-sunset.jpg"
        alt="Traveler overlooking mountain sunrise"
        fill
        sizes="(max-width: 1024px) 100vw, 1200px)"
        priority
        className="object-cover object-center select-none"
      />

      {/* Deep Cinematic Gradient Overlay for crisp contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent z-10 pointer-events-none" />

      {/* Banner Inner Content */}
      <div className="relative z-20 h-full p-4.5 sm:p-6 md:p-8 flex flex-col justify-between">
        {/* Top Subtitle */}
        <div>
          <p className="text-[9.5px] sm:text-[10px] md:text-[11px] font-bold tracking-[0.2em] text-white/85 uppercase font-dm-sans">
            {firstName ? `${greeting}, ${firstName.toUpperCase()}` : greeting}
          </p>

          {/* Main Headline */}
          <h2 className="font-ubuntu font-bold text-[22px] min-[400px]:text-[26px] sm:text-[30px] md:text-[34px] text-white leading-[1.12] mt-1.5 tracking-tight">
            Today&apos;s world.
            <br />
            Your <span className="text-[#DE6A52]">next step.</span>
          </h2>

          {/* Supporting Statement */}
          <p className="text-white/80 text-[11.5px] sm:text-xs md:text-[13px] mt-1.5 sm:mt-2 max-w-sm font-normal">
            Real-world developments, connected to what you care about.
          </p>

          {/* Talk to AI Agent CTA Button */}
          <button
            onClick={onOpenAgentModal}
            className="mt-3.5 sm:mt-4.5 inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-4.5 py-1.5 sm:py-2 rounded-full bg-black/45 hover:bg-black/65 border border-white/25 backdrop-blur-md text-white text-[11px] sm:text-xs font-medium transition cursor-pointer shadow-sm active:scale-[0.98] font-dm-sans"
          >
            {/* Audio Waveform icon */}
            <span className="flex items-center gap-0.5 h-3">
              <span className="w-[2px] h-2 bg-white rounded-full"></span>
              <span className="w-[2px] h-3.5 bg-white rounded-full"></span>
              <span className="w-[2px] h-2.5 bg-white rounded-full"></span>
              <span className="w-[2px] h-1.5 bg-white rounded-full"></span>
            </span>
            <span>Talk to AI Agent</span>
            <span className="text-xs sm:text-sm font-light">→</span>
          </button>
        </div>

        {/* Editorial Quote (Desktop top-right) */}
        <div className="absolute top-6 right-8 max-w-[230px] text-left hidden lg:block select-none">
          <blockquote className="font-ubuntu text-white/90 text-[14px] leading-relaxed italic font-normal">
            &ldquo;The world moves.
            <br />
            Your ambitions do too.
            <br />
            Stay ahead.&rdquo;
          </blockquote>
          <div className="w-full h-[1px] bg-white/25 mt-3" />
        </div>
      </div>
    </section>
  );
}
