"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ThumbsUp, ThumbsDown, Check, Sparkles } from "lucide-react";

export default function HowItWorksSection() {
  const [feedback, setFeedback] = useState<"relevant" | "not_relevant">("relevant");
  const [selectedTag, setSelectedTag] = useState<string>("AI");

  return (
    <section id="how-it-works" className="relative w-full bg-[#FAF8F5] pt-10 sm:pt-16 lg:pt-20 pb-14 sm:pb-20 lg:pb-28 overflow-hidden">

      {/* Top Header & Mountain Ribbon HERO Section */}
      <div className="relative w-full min-h-[340px] sm:min-h-[400px] lg:min-h-[500px]">
        {/* Full-width background landscape spanning the right 60% fading into left */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[75%] pointer-events-none select-none z-0 overflow-hidden">
          <Image
            src="/images/home_visuals.png"
            alt="Mountain Landscape with Newspaper Ribbon"
            fill
            className="object-cover object-left opacity-90 mix-blend-multiply"
            sizes="(max-width: 1024px) 100vw, 75vw"
          />
          {/* Gradient to blend with the left text area */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F5] via-[#FAF8F5]/85 to-transparent w-full sm:w-[60%] lg:w-[45%]" />
        </div>

        <div className="relative z-10 max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Header text */}
            <div className="lg:col-span-5 space-y-2 max-w-xl">
              <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase block mb-2 sm:mb-3">
                How It Works
              </span>

              <h2 className="font-serif text-[26px] min-[380px]:text-[32px] sm:text-[40px] lg:text-[48px] font-normal leading-[1.1] tracking-tight text-[#1A1918]">
                From a changing world <br />
                <span className="text-[#701A23]">to a clearer you.</span>
              </h2>

              <p className="text-[13.5px] sm:text-[15px] lg:text-[17px] text-[#4A4641] leading-relaxed font-normal max-w-[420px] pt-2 sm:pt-4">
                Ambition Gazette tracks real-world events, remembers what you&apos;re trying to accomplish, and shows you when something changes your situation — with clear, relevant explanations.
              </p>
            </div>

            {/* Right Side: Milestones floating on the mountain */}
            <div className="hidden lg:block lg:col-span-7 relative h-[400px]">

              {/* Milestone Day 1 */}
              <div className="absolute top-[5%] left-[5%] z-20 w-[150px] bg-transparent">
                <div className="space-y-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#701A23] shrink-0" />
                    <span className="text-[12px] font-bold text-[#1A1918]">Day 1</span>
                  </div>
                  <h4 className="text-[13px] font-medium text-[#1A1918] leading-tight">
                    New AI model<br />announced
                  </h4>
                </div>
                <div
                  className="relative w-[130px] h-[100px] rounded-xl overflow-hidden shadow-2xl bg-[#1A1918] transition-transform duration-300 hover:scale-105"
                  style={{ transform: "perspective(900px) rotateX(15deg) rotateY(-10deg)", transformOrigin: "bottom center" }}
                >
                  <Image
                    src="/images/news/ai-conference.jpg"
                    alt="AI Conference"
                    fill
                    className="object-cover opacity-85"
                    sizes="130px"
                  />
                </div>
              </div>

              {/* Milestone Day 18 */}
              <div className="absolute top-[25%] left-[45%] z-20 w-[150px] bg-transparent">
                <div className="space-y-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#701A23] shrink-0" />
                    <span className="text-[12px] font-bold text-[#1A1918]">Day 18</span>
                  </div>
                  <h4 className="text-[13px] font-medium text-[#1A1918] leading-tight">
                    API pricing<br />updated
                  </h4>
                </div>
                <div
                  className="relative w-[130px] h-[100px] rounded-xl overflow-hidden shadow-2xl bg-[#2A2928] transition-transform duration-300 hover:scale-105"
                  style={{ transform: "perspective(900px) rotateX(15deg) rotateY(-10deg)", transformOrigin: "bottom center" }}
                >
                  <Image
                    src="/images/news/building-modern.jpg"
                    alt="Building Modern"
                    fill
                    className="object-cover opacity-90"
                    sizes="130px"
                  />
                </div>
              </div>

              {/* Milestone Day 47 */}
              <div className="absolute top-[10%] right-[0%] z-20 w-[150px] bg-transparent">
                <div className="space-y-1 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#701A23] shrink-0" />
                    <span className="text-[12px] font-bold text-[#1A1918]">Day 47</span>
                  </div>
                  <h4 className="text-[13px] font-medium text-[#1A1918] leading-tight">
                    Enterprise<br />pricing released
                  </h4>
                </div>
                <div
                  className="relative w-[130px] h-[100px] rounded-xl overflow-hidden shadow-2xl bg-[#1A1918] transition-transform duration-300 hover:scale-105"
                  style={{ transform: "perspective(900px) rotateX(15deg) rotateY(-10deg)", transformOrigin: "bottom center" }}
                >
                  <Image
                    src="/images/news/skyscraper-tower.png"
                    alt="Skyscraper Tower"
                    fill
                    className="object-cover grayscale contrast-125 opacity-90"
                    sizes="130px"
                  />
                </div>
              </div>

              {/* Red Connecting Path across mountains */}
              <svg className="absolute top-[40%] left-0 w-full h-[200px] pointer-events-none z-10" viewBox="0 0 800 200" fill="none">
                <path d="M 0 100 C 150 120, 250 -30, 400 20 S 600 180, 800 100" stroke="#701A23" strokeWidth="1.5" className="opacity-60" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* The 5 flowing open steps (No boring boxes) */}
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 pt-12 sm:pt-16 lg:pt-20 relative">

        {/* Background faint divider lines mimicking newspaper columns */}
        <div className="absolute inset-0 flex justify-evenly pointer-events-none opacity-5">
          <div className="w-px h-full bg-[#1A1918]"></div>
          <div className="w-px h-full bg-[#1A1918]"></div>
          <div className="w-px h-full bg-[#1A1918]"></div>
          <div className="w-px h-full bg-[#1A1918]"></div>
        </div>

        {/* Global flow line running vertically through the middle on large screens */}
        <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 w-px bg-transparent z-0 overflow-visible">
          <svg className="absolute top-0 bottom-0 -left-[100px] w-[200px] h-[100%] stroke-[#701A23] opacity-30" viewBox="0 0 200 1600" fill="none" preserveAspectRatio="none">
            <path d="M 100 0 C 180 300, 20 600, 100 800 C 180 1000, 20 1300, 100 1600" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="space-y-16 sm:space-y-24 lg:space-y-36 relative z-10">

          {/* STEP 01 */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 lg:gap-24">
            <div className="flex-1 flex gap-4 sm:gap-6 lg:gap-8 max-w-xl">
              <span className="font-serif text-[44px] sm:text-[64px] lg:text-[80px] text-[#D4CABB] leading-none select-none shrink-0 -mt-1 sm:-mt-2">
                01
              </span>
              <div className="space-y-2 sm:space-y-3">
                <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase block">
                  Define Your Ambition
                </span>
                <h3 className="font-serif text-[22px] min-[380px]:text-[26px] sm:text-[34px] lg:text-[44px] text-[#1A1918] font-normal leading-[1.15] tracking-tight">
                  Tell us what you&apos;re <br className="hidden sm:block" /> trying to accomplish.
                </h3>
                <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal pt-1 sm:pt-2">
                  Share your goals, interests, and background — from a career move to a product you&apos;re building. Ambition Gazette uses this to understand what matters to you.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-[480px] shrink-0">
              <div className="bg-white rounded-2xl sm:rounded-[24px] p-4.5 sm:p-6 lg:p-8 border border-[#E4D9CC] shadow-sm transform transition-transform hover:-translate-y-0.5 duration-300">
                <span className="text-[11px] font-bold tracking-[0.16em] text-[#1A1918] block mb-3 sm:mb-4">
                  What are you trying to accomplish?
                </span>
                <div className="p-3.5 sm:p-4 lg:p-5 rounded-xl bg-[#FAF8F5] border border-[#E8E2D8] text-[13.5px] sm:text-[15px] text-[#1A1918] leading-[1.6]">
                  Build an AI SaaS for Indian developers in the next 6 months, focusing on cost-effective API usage and go-to-market strategy.
                </div>
                <div className="flex items-center justify-between pt-4 sm:pt-6">
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {["AI", "Startups", "India market", "API pricing"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setSelectedTag(tag)}
                        className={`text-[11px] sm:text-[12px] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full border transition-colors ${selectedTag === tag
                          ? "bg-[#701A23] text-white border-[#701A23]"
                          : "bg-white text-[#615C55] border-[#E4D9CC] hover:border-[#701A23]"
                          }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#701A23] text-white flex items-center justify-center shrink-0 shadow-sm cursor-pointer hover:bg-[#58141B] transition-colors ml-2">
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 02 */}
          <div className="flex flex-col lg:flex-row-reverse items-center justify-between gap-8 sm:gap-12 lg:gap-24">
            <div className="flex-1 flex gap-4 sm:gap-6 lg:gap-8 max-w-xl">
              <span className="font-serif text-[44px] sm:text-[64px] lg:text-[80px] text-[#D4CABB] leading-none select-none shrink-0 -mt-1 sm:-mt-2">
                02
              </span>
              <div className="space-y-2 sm:space-y-3">
                <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase block">
                  Find Relevant Events
                </span>
                <h3 className="font-serif text-[22px] min-[380px]:text-[26px] sm:text-[34px] lg:text-[44px] text-[#1A1918] font-normal leading-[1.15] tracking-tight">
                  We find real-world <br className="hidden sm:block" /> events that matter.
                </h3>
                <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal pt-1 sm:pt-2">
                  Using semantic search, topic matching, and your stated ambitions, we surface developments that are relevant to your goals — not just what&apos;s trending.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-[440px] shrink-0 relative flex flex-col items-center">
              {/* Stacked floating news cards */}

              {/* Card 1 */}
              <div className="w-full sm:w-[380px] bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-sm border border-[#E8E2D8] relative z-30 transform hover:-translate-y-1 transition-transform duration-300">
                <div className="flex-1 pr-3 sm:pr-4">
                  <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                    <span className="w-4 h-4 rounded bg-[#00A562] flex items-center justify-center text-[9px] font-bold text-white tracking-tighter">TC</span>
                    <span className="text-[11.5px] sm:text-[12px] font-bold text-[#1A1918]">TechCrunch</span>
                  </div>
                  <h4 className="text-[13px] sm:text-[14px] font-bold text-[#1A1918] leading-snug mb-1">OpenAI announces new API pricing for GPT-5</h4>
                  <span className="text-[10.5px] sm:text-[11px] text-[#8A847C]">Sep 1, 2026</span>
                </div>
                <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-lg sm:rounded-xl overflow-hidden shrink-0 relative shadow-xs bg-[#1A1918]/10">
                  <Image src="/images/news/ai-conference.jpg" alt="News" fill className="object-cover" sizes="72px" />
                </div>
              </div>

              {/* Card 2 */}
              <div className="w-full sm:w-[380px] bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs border border-[#E8E2D8] relative z-20 -mt-2.5 sm:-mt-3 transform scale-[0.98] sm:scale-[0.96] opacity-95">
                <div className="flex-1 pr-3 sm:pr-4">
                  <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                    <span className="w-4 h-4 rounded bg-[#FF8000] flex items-center justify-center text-[9px] font-bold text-white tracking-tighter">R</span>
                    <span className="text-[11.5px] sm:text-[12px] font-bold text-[#1A1918]">Reuters</span>
                  </div>
                  <h4 className="text-[13px] sm:text-[14px] font-bold text-[#1A1918] leading-snug mb-1">Anthropic updates rate limits for Claude</h4>
                  <span className="text-[10.5px] sm:text-[11px] text-[#8A847C]">Sep 2, 2026</span>
                </div>
                <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-lg sm:rounded-xl overflow-hidden shrink-0 relative shadow-xs bg-[#1A1918]/10">
                  <Image src="/images/news/office-towers.jpg" alt="News" fill className="object-cover" sizes="72px" />
                </div>
              </div>

              {/* Card 3 */}
              <div className="w-full sm:w-[380px] bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 flex items-center justify-between shadow-xs border border-[#E8E2D8] relative z-10 -mt-2.5 sm:-mt-3 transform scale-[0.96] sm:scale-[0.92] opacity-85">
                <div className="flex-1 pr-3 sm:pr-4">
                  <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
                    <span className="w-4 h-4 rounded bg-[#9333EA] flex items-center justify-center text-[9px] font-bold text-white tracking-tighter">V</span>
                    <span className="text-[11.5px] sm:text-[12px] font-bold text-[#1A1918]">The Verge</span>
                  </div>
                  <h4 className="text-[13px] sm:text-[14px] font-bold text-[#1A1918] leading-snug mb-1">Google announces Gemini 1.5 Flash for developers</h4>
                  <span className="text-[10.5px] sm:text-[11px] text-[#8A847C]">Sep 3, 2026</span>
                </div>
                <div className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-lg sm:rounded-xl overflow-hidden shrink-0 relative shadow-xs bg-[#1A1918]/10">
                  <Image src="/images/news/skyscraper-tower.png" alt="News" fill className="object-cover" sizes="72px" />
                </div>
              </div>
            </div>
          </div>

          {/* STEP 03 */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 lg:gap-24">
            <div className="flex-1 flex gap-4 sm:gap-6 lg:gap-8 max-w-xl">
              <span className="font-serif text-[44px] sm:text-[64px] lg:text-[80px] text-[#D4CABB] leading-none select-none shrink-0 -mt-1 sm:-mt-2">
                03
              </span>
              <div className="space-y-2 sm:space-y-3">
                <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase block">
                  Track The Story
                </span>
                <h3 className="font-serif text-[22px] min-[380px]:text-[26px] sm:text-[34px] lg:text-[44px] text-[#1A1918] font-normal leading-[1.15] tracking-tight">
                  Follow the bigger picture, <br className="hidden sm:block" /> not just articles.
                </h3>
                <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal pt-1 sm:pt-2">
                  You track a story, not a single article. Ambition Gazette groups related developments so you can see the full timeline as it evolves.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-[500px] shrink-0">
              <div className="bg-[#FAF8F5] rounded-2xl sm:rounded-[24px] p-4.5 sm:p-6 lg:p-7 border border-[#E4D9CC] shadow-sm transform transition-transform hover:-translate-y-0.5 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-3.5 mb-4 sm:mb-5">
                  <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#948E85] mb-2">Illustrative example</p>

                  <div className="flex items-center gap-2.5 sm:gap-3.5">
                    <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-lg overflow-hidden shrink-0 shadow-xs">
                      <Image src="/images/news/ai-conference.jpg" alt="Story" fill className="object-cover" sizes="44px" />
                    </div>
                    <div>
                      <h4 className="text-[13px] sm:text-[14px] font-bold text-[#1A1918] leading-tight">AI Provider API Pricing Strategy</h4>
                      <p className="text-[10.5px] sm:text-[11px] text-[#8A847C] mt-0.5">Track how major AI providers are pricing APIs.</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-semibold text-[#701A23] bg-white border border-[#F0EBE1] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-2xs">
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                    <span>Tracking</span>
                  </span>
                </div>

                {/* Timeline Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {/* Event 1 */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#701A23]" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#701A23]">Sep 1</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-medium text-[#1A1918] leading-tight h-7 sm:h-8">Initial announcement</p>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xs bg-[#1A1918]/10">
                      <Image src="/images/news/ai-conference.jpg" alt="Sep 1" fill className="object-cover" sizes="33vw" />
                    </div>
                  </div>
                  {/* Event 2 */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#701A23]" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#701A23]">Sep 18</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-medium text-[#1A1918] leading-tight h-7 sm:h-8">Pricing structure</p>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xs bg-[#1A1918]/10">
                      <Image src="/images/news/building-modern.jpg" alt="Sep 18" fill className="object-cover" sizes="33vw" />
                    </div>
                  </div>
                  {/* Event 3 */}
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#701A23]" />
                      <span className="text-[10px] sm:text-[11px] font-bold text-[#701A23]">Oct 18</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] font-medium text-[#1A1918] leading-tight h-7 sm:h-8">Pricing takes effect</p>
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-2xs bg-[#1A1918]/10 grayscale contrast-125">
                      <Image src="/images/news/skyscraper-tower.png" alt="Oct 18" fill className="object-cover" sizes="33vw" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 04 */}
          <div className="flex flex-col lg:flex-row-reverse items-center justify-between gap-8 sm:gap-12 lg:gap-24">
            <div className="flex-1 flex gap-4 sm:gap-6 lg:gap-8 max-w-xl">
              <span className="font-serif text-[44px] sm:text-[64px] lg:text-[80px] text-[#D4CABB] leading-none select-none shrink-0 -mt-1 sm:-mt-2">
                04
              </span>
              <div className="space-y-2 sm:space-y-3">
                <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase block">
                  Get Impact Explanations
                </span>
                <h3 className="font-serif text-[22px] min-[380px]:text-[26px] sm:text-[34px] lg:text-[44px] text-[#1A1918] font-normal leading-[1.15] tracking-tight">
                  Understand what changed <br className="hidden sm:block" /> and why it matters to you.
                </h3>
                <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal pt-1 sm:pt-2">
                  When there&apos;s a new development, Ambition Gazette compares it with the story so far and explains the implications in relation to your goals.
                </p>
              </div>
            </div>

            <div className="w-full lg:w-[440px] shrink-0">
              <div className="bg-white rounded-2xl sm:rounded-[24px] p-4.5 sm:p-6 lg:p-8 border border-[#E4D9CC] shadow-sm transform transition-transform hover:scale-[1.01] duration-300">
                <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3.5 mb-4 sm:mb-5">
                  <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase">
                    Why It Matters To You
                  </span>
                  <Sparkles className="w-4 h-4 text-[#701A23]" />
                </div>

                <div className="space-y-4 sm:space-y-5">
                  <div className="space-y-1 sm:space-y-1.5">
                    <h5 className="text-[13px] sm:text-[14px] font-bold text-[#1A1918]">What changed?</h5>
                    <p className="text-[13px] sm:text-[14px] text-[#615C55] leading-relaxed">
                      OpenAI&apos;s enterprise pricing introduces volume discounts and higher rate limits.
                    </p>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <h5 className="text-[13px] sm:text-[14px] font-bold text-[#1A1918]">Why it matters to you</h5>
                    <p className="text-[13px] sm:text-[14px] text-[#615C55] leading-relaxed">
                      This could reduce your infrastructure costs and make your go-to-market strategy more viable.
                    </p>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <h5 className="text-[13px] sm:text-[14px] font-bold text-[#1A1918]">Potential implication</h5>
                    <p className="text-[13px] sm:text-[14px] text-[#615C55] leading-relaxed">
                      You may be able to offer more competitive pricing for your product.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 05 and THE RESULT */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 sm:gap-12 lg:gap-16 pb-6 sm:pb-10">
            {/* Step 05 */}
            <div className="flex-1 flex gap-4 sm:gap-6 lg:gap-8 max-w-xl">
              <span className="font-serif text-[44px] sm:text-[64px] lg:text-[80px] text-[#D4CABB] leading-none select-none shrink-0 -mt-1 sm:-mt-2">
                05
              </span>
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase block">
                    Give Feedback
                  </span>
                  <h3 className="font-serif text-[22px] min-[380px]:text-[26px] sm:text-[34px] lg:text-[44px] text-[#1A1918] font-normal leading-[1.15] tracking-tight">
                    Help it get smarter.
                  </h3>
                  <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal pt-1 sm:pt-2">
                    Mark developments as relevant or not. Your feedback refines your profile, so future recommendations become even more personalized.
                  </p>
                </div>

                {/* Feedback Widget inside the flow */}
                <div className="bg-[#FAF8F5] rounded-xl p-4 sm:p-5 border border-[#E8E2D8] w-full sm:w-fit shadow-2xs">
                  <span className="text-[12.5px] sm:text-[13px] font-bold text-[#1A1918] block mb-2.5 sm:mb-3">
                    Was this relevant to you?
                  </span>
                  <div className="flex items-center gap-2.5 sm:gap-3 mb-2">
                    <button
                      type="button"
                      onClick={() => setFeedback("relevant")}
                      className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[13px] sm:text-sm font-semibold border transition-colors ${feedback === "relevant"
                        ? "bg-white text-[#701A23] border-[#701A23] shadow-xs"
                        : "bg-white text-[#615C55] border-[#E8E2D8] hover:border-[#701A23]"
                        }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                      <span>Relevant</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedback("not_relevant")}
                      className={`inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg text-[13px] sm:text-sm font-semibold border transition-colors ${feedback === "not_relevant"
                        ? "bg-white text-[#701A23] border-[#701A23] shadow-xs"
                        : "bg-white text-[#615C55] border-[#E8E2D8] hover:border-[#701A23]"
                        }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                      <span>Not relevant</span>
                    </button>
                  </div>
                  <p className="text-[10.5px] sm:text-[11px] text-[#8A847C]">
                    This helps improve your future recommendations.
                  </p>
                </div>
              </div>
            </div>

            {/* THE RESULT area */}
            <div className="flex-1 w-full relative">
              <div className="relative pl-0 lg:pl-12 py-6 sm:py-10 lg:py-16">
                <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase block mb-3 sm:mb-6">
                  The Result
                </span>
                <h3 className="font-serif text-[26px] min-[380px]:text-[32px] sm:text-[40px] lg:text-[48px] leading-[1.1] tracking-tight font-normal text-[#1A1918] mb-4 sm:mb-6">
                  A clearer view of the world. <br />
                  <span className="text-[#701A23]">A more informed you.</span>
                </h3>
                <p className="text-[13.5px] sm:text-[15px] lg:text-[17px] text-[#4A4641] leading-relaxed font-normal mb-6 sm:mb-10">
                  Start with what you&apos;re trying to accomplish.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2.5 bg-[#701A23] hover:bg-[#58141B] text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-medium text-sm transition-all duration-200 shadow-sm hover:shadow"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
