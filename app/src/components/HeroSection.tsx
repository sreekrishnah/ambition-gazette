"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Globe, User } from "lucide-react";

export default function HeroSection() {
  return (
    <section id="home" className="relative w-full bg-[#FAF8F5] pt-[64px] sm:pt-[76px] md:pt-[88px] overflow-hidden">

      {/* Upper Hero Section with FULL-BLEED background visual */}
      <div className="relative w-full min-h-0 sm:min-h-[680px] lg:min-h-[820px] overflow-hidden">

        {/* Full-bleed background visual image */}
        <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-0">
          <Image
            src="/images/home_visuals.png"
            alt="Real events. Clearer impact."
            fill
            priority
            className="object-cover object-top lg:object-right-top"
            sizes="100vw"
          />
        </div>

        {/* Foreground Content Container */}
        <div className="relative z-10 max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 h-full min-h-0 sm:min-h-[680px] lg:min-h-[820px] flex flex-col justify-between pt-6 sm:pt-8 lg:pt-14 pb-8 sm:pb-12">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

            {/* Left Column: Copy & Action */}
            <div className="lg:col-span-5 z-20 space-y-4 sm:space-y-6 lg:space-y-8 max-w-xl">
              {/* Eyebrow */}
              <div className="inline-block">
                <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.18em] text-[#8A847C] uppercase">
                  Real Events. Clearer Impact.
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-serif text-[30px] min-[380px]:text-[36px] sm:text-[48px] md:text-[56px] lg:text-[68px] font-normal leading-[1.08] tracking-[-0.02em] text-[#1A1918]">
                Trace events <br />
                across time. <br />
                <span className="text-[#701A23]">Connect them</span> <br />
                <span className="text-[#701A23]">to your ambitions.</span>
              </h1>

              {/* Body */}
              <p className="text-[14px] sm:text-[16px] text-[#615C55] leading-[1.6] max-w-lg font-sans">
                A briefing that remembers the stories you follow and tells you only when something changes your plan. On quiet days, it says so, and shows what it set aside and why.
              </p>

              {/* Action Button: Get Started only */}
              <div className="pt-1 sm:pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2.5 bg-[#701A23] hover:bg-[#58141B] text-white px-6 sm:px-7 py-3 sm:py-3.5 rounded-full font-medium text-sm transition-all duration-200 shadow-sm hover:shadow"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Desktop Area: 3 Timeline Milestone Cards tilted geometrically in X and Y axis without outer borders */}
            <div className="hidden lg:block lg:col-span-7 relative h-[680px] pointer-events-none">

              {/* Burgundy curved timeline path connecting across the 3 cards */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 840 680"
                preserveAspectRatio="none"
                fill="none"
              >
                <path
                  d="M 50 440 C 130 450, 240 370, 360 360 C 470 350, 580 340, 690 370 C 760 390, 780 470, 640 540"
                  stroke="#701A23"
                  strokeWidth="1.5"
                  className="opacity-75"
                />
              </svg>

              {/* Milestone 1: Sep 1, 2026 (Tilted on X and Y axis, no outer border) */}
              <div
                className="absolute top-[6%] left-[6%] z-20 w-[155px] pointer-events-auto group transition-transform duration-300 hover:scale-105"
                style={{
                  transform: "perspective(900px) rotateX(16deg) rotateY(-10deg)",
                  transformOrigin: "bottom center",
                }}
              >
                <div className="space-y-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#701A23] shrink-0" />
                    <span className="text-[11px] font-semibold text-[#1A1918]">Sep 1, 2026</span>
                  </div>
                  <h4 className="text-[13px] font-medium text-[#1A1918] leading-tight">
                    AI provider signals <br />
                    API pricing changes
                  </h4>
                </div>
                {/* Image card without outer border */}
                <div className="relative w-full h-[185px] rounded-2xl overflow-hidden shadow-2xl bg-[#1A1918]">
                  <Image
                    src="/images/news/ai-pricing.png"
                    alt="AI Pricing"
                    fill
                    className="object-cover grayscale contrast-110 opacity-85"
                    sizes="160px"
                  />
                </div>
              </div>

              {/* Milestone 2: Sep 18, 2026 (Tilted on X and Y axis, no outer border) */}
              <div
                className="absolute top-[18%] left-[36%] z-20 w-[160px] pointer-events-auto group transition-transform duration-300 hover:scale-105"
                style={{
                  transform: "perspective(900px) rotateX(16deg) rotateY(-10deg)",
                  transformOrigin: "bottom center",
                }}
              >
                <div className="space-y-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#701A23] shrink-0" />
                    <span className="text-[11px] font-semibold text-[#1A1918]">Sep 18, 2026</span>
                  </div>
                  <h4 className="text-[13px] font-medium text-[#1A1918] leading-tight">
                    Detailed pricing <br />
                    structure released
                  </h4>
                </div>
                {/* Image card without outer border */}
                <div className="relative w-full h-[185px] rounded-2xl overflow-hidden shadow-2xl bg-[#2A2928]">
                  <Image
                    src="/images/news/building-modern.jpg"
                    alt="Modern architecture"
                    fill
                    className="object-cover grayscale contrast-110 opacity-90"
                    sizes="165px"
                  />
                </div>
              </div>

              {/* Milestone 3: Oct 18, 2026 (Tilted on X and Y axis, no outer border) */}
              <div
                className="absolute top-[24%] left-[66%] z-20 w-[140px] pointer-events-auto group transition-transform duration-300 hover:scale-105"
                style={{
                  transform: "perspective(900px) rotateX(16deg) rotateY(-10deg)",
                  transformOrigin: "bottom center",
                }}
              >
                <div className="space-y-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#701A23] shrink-0" />
                    <span className="text-[11px] font-semibold text-[#1A1918]">Oct 18, 2026</span>
                  </div>
                  <h4 className="text-[13px] font-medium text-[#1A1918] leading-tight">
                    New pricing <br />
                    takes effect
                  </h4>
                </div>
                {/* Image card without outer border */}
                <div className="relative w-full h-[185px] rounded-2xl overflow-hidden shadow-2xl bg-[#1A1918]">
                  <Image
                    src="/images/news/ai-price-release.jpg"
                    alt="Skyscraper towers"
                    fill
                    className="object-cover grayscale contrast-110 opacity-90"
                    sizes="145px"
                  />
                </div>
              </div>

              {/* Floating "Why It Matters To You" Card (Tilted geometrically on X and Y axis, NO outer border) */}
              <div
                className="absolute bottom-[11%] left-[32%] z-30 w-[315px] bg-white/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl pointer-events-auto transition-transform hover:scale-[1.02] duration-200"
                style={{
                  transform: "perspective(950px) rotateX(16deg) rotateY(-8deg)",
                  transformOrigin: "bottom center",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold tracking-[0.16em] text-[#8A847C] uppercase">
                    Why It Matters To You
                  </span>
                  <span className="text-[#701A23] text-sm leading-none" aria-hidden>
                    &#10022;
                  </span>
                </div>
                <p className="text-[14px] font-normal text-[#1A1918] leading-relaxed">
                  Lower API costs could reduce your product&apos;s infrastructure costs and extend your runway.
                </p>
              </div>

              {/* Handwritten Caveat Note with curved pointer cleanly to the right of the card */}
              <div className="absolute bottom-[2%] right-[-1%] z-30 pointer-events-none flex flex-col items-center">
                <div className="font-handwriting text-[21px] text-[#701A23] leading-tight text-center transform -rotate-3 select-none">
                  Not just what happened. <br />
                  <span className="text-[20px]">But what it means for you.</span>
                </div>
                <svg
                  width="44"
                  height="36"
                  viewBox="0 0 44 36"
                  fill="none"
                  className="text-[#701A23] mt-1 -ml-12"
                  aria-hidden
                >
                  <path
                    d="M 36 28 C 26 18, 16 10, 6 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M 14 5 L 5 6 L 8 15"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

            </div>

          </div>

          {/* Mobile representation of timeline cards (for small screens) */}
          <div className="lg:hidden mt-6 sm:mt-8 space-y-3.5">
            <div className="flex sm:grid sm:grid-cols-3 gap-2.5 sm:gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none snap-x">
              <div className="w-[170px] shrink-0 sm:w-auto snap-start bg-white/95 rounded-xl p-3 shadow-md border border-[#E8E2D8]/60">
                <span className="text-[10px] font-bold text-[#701A23] block mb-1">• Sep 1, 2026</span>
                <p className="text-[11.5px] font-medium text-[#1A1918] mb-2 leading-tight">AI provider signals pricing changes</p>
                <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#1A1918]/10">
                  <Image src="/images/news/ai-conference.jpg" alt="AI Conference" fill className="object-cover" sizes="170px" />
                </div>
              </div>
              <div className="w-[170px] shrink-0 sm:w-auto snap-start bg-white/95 rounded-xl p-3 shadow-md border border-[#E8E2D8]/60">
                <span className="text-[10px] font-bold text-[#701A23] block mb-1">• Sep 18, 2026</span>
                <p className="text-[11.5px] font-medium text-[#1A1918] mb-2 leading-tight">Detailed pricing structure released</p>
                <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#1A1918]/10">
                  <Image src="/images/news/building-modern.jpg" alt="Pricing released" fill className="object-cover" sizes="170px" />
                </div>
              </div>
              <div className="w-[170px] shrink-0 sm:w-auto snap-start bg-white/95 rounded-xl p-3 shadow-md border border-[#E8E2D8]/60">
                <span className="text-[10px] font-bold text-[#701A23] block mb-1">• Oct 18, 2026</span>
                <p className="text-[11.5px] font-medium text-[#1A1918] mb-2 leading-tight">New pricing takes effect</p>
                <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#1A1918]/10">
                  <Image src="/images/news/skyscraper-tower.png" alt="Pricing effective" fill className="object-cover" sizes="170px" />
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl p-3.5 sm:p-4 shadow-md border border-[#E8E2D8]/70">
              <span className="text-[10px] font-bold tracking-[0.16em] text-[#8A847C] uppercase block mb-1">
                Why It Matters To You
              </span>
              <p className="text-[12.5px] sm:text-[13px] text-[#1A1918] leading-snug">
                Lower API costs could reduce your product&apos;s infrastructure costs and extend your runway.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* "THE PROBLEM" Section */}
      <div className="relative border-t border-[#E8E2D8] bg-[#FAF8F5]">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 py-8 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center">

            {/* Left: Problem Headline */}
            <div className="lg:col-span-5 space-y-1.5 sm:space-y-2">
              <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase block mb-1.5 sm:mb-3">
                The Problem
              </span>
              <h2 className="font-serif text-[26px] min-[380px]:text-[30px] sm:text-[38px] lg:text-[48px] font-normal leading-[1.1] tracking-tight text-[#1A1918]">
                News happens in fragments. <br />
                Your life doesn&apos;t.
              </h2>
            </div>

            {/* Right: 3 Columns with Hairline Dividers */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-0">

              {/* Item 1 */}
              <div className="sm:px-6 sm:border-l border-[#E4D9CC] flex flex-row sm:flex-col items-center sm:items-start text-left space-x-3.5 sm:space-x-0 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-[#E4D9CC] flex items-center justify-center text-[#701A23] shadow-2xs shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
                </div>
                <p className="text-[13px] sm:text-[15px] text-[#4A4641] leading-snug font-medium">
                  Same event, <br className="hidden sm:inline" />
                  repeated everywhere
                </p>
              </div>

              {/* Item 2 */}
              <div className="sm:px-6 sm:border-l border-[#E4D9CC] flex flex-row sm:flex-col items-center sm:items-start text-left space-x-3.5 sm:space-x-0 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-[#E4D9CC] flex items-center justify-center text-[#701A23] shadow-2xs shrink-0">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
                </div>
                <p className="text-[13px] sm:text-[15px] text-[#4A4641] leading-snug font-medium">
                  No connection <br className="hidden sm:inline" />
                  across time
                </p>
              </div>

              {/* Item 3 */}
              <div className="sm:px-6 sm:border-l border-[#E4D9CC] flex flex-row sm:flex-col items-center sm:items-start text-left space-x-3.5 sm:space-x-0 sm:space-y-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-[#E4D9CC] flex items-center justify-center text-[#701A23] shadow-2xs shrink-0">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.5]" />
                </div>
                <p className="text-[13px] sm:text-[15px] text-[#4A4641] leading-snug font-medium">
                  Doesn&apos;t understand <br className="hidden sm:inline" />
                  what you&apos;re trying to do
                </p>
              </div>

            </div>

          </div>
        </div>
      </div>

    </section>
  );
}
