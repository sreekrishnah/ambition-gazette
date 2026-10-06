"use client";

import Image from "next/image";
import { Check, ArrowRight, Target, Layers, FileText, Sliders, Sparkles } from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      num: "01",
      icon: Target,
      title: "Your plan, as testable assumptions",
      desc: "State what must stay true for your ambition to work. Ambition Gazette keeps each assumption as a belief it can confirm or challenge, and suggests candidates you can accept or edit.",
    },
    {
      num: "02",
      icon: Layers,
      title: "Evidence, tracked over time",
      desc: "Real-world developments are stored as evidence for or against an assumption. One report puts it on watch; corroboration asks you to reconsider; later evidence builds on the earlier.",
    },
    {
      num: "03",
      icon: FileText,
      title: "Proof, not a hunch",
      desc: "Every flag shows the sources, the development, the assumption and the ambition it touches, and separates what was reported from our own assessment.",
    },
    {
      num: "04",
      icon: Sliders,
      title: "Your decision stays yours",
      desc: "Keep the assumption, modify it, change the plan or dismiss the evidence. Each answer is recorded, and only newer developments can raise it again.",
    },
  ];

  return (
    <section id="features" className="relative w-full bg-[#FAF8F5] pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 lg:pb-28 border-t border-[#EAE3D8] overflow-hidden">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">

          {/* Left Column: Visual Showcase with Arched Window & Interactive Timeline Card */}
          <div className="lg:col-span-6 relative min-h-[480px] min-[420px]:min-h-[540px] sm:min-h-[640px] lg:min-h-[700px] flex items-center justify-center">

            {/* Arched window background image */}
            <div className="relative w-full h-[480px] min-[420px]:h-[540px] sm:h-[640px] lg:h-[700px] select-none pointer-events-none rounded-[100px_100px_20px_20px] sm:rounded-[160px_160px_20px_20px] overflow-hidden shadow-xl border border-[#E8E2D8]">
              <Image
                src="/images/howItWorks_visuals.png"
                alt="Arched window overlooking European architecture"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5]/85 via-transparent to-transparent opacity-90" />
            </div>

            {/* Folded newspaper card teaser on the left - hidden on smallest screens to prevent clipping */}
            <div className="hidden sm:block absolute top-[35%] left-[2%] z-20 w-[170px] sm:w-[180px] bg-[#FAF8F5] p-3.5 sm:p-4 rounded-sm shadow-xl border border-[#E4D9CC] transform rotate-[-6deg] transition-transform hover:rotate-[-2deg] duration-300">
              <h4 className="font-serif text-[17px] sm:text-[20px] font-bold text-[#1A1918] leading-[1.1] mb-2 opacity-80 mix-blend-multiply">
                OpenAI<br />cuts API<br />pricing for<br />GPT-5
              </h4>
              <p className="text-[9px] sm:text-[10px] text-[#4A443D] leading-snug font-serif italic mix-blend-multiply opacity-70 border-t border-[#E8E2D8] pt-2">
                OpenAI announced a new pricing structure for GPT-5, with lower input costs and higher rate limits for developers.
              </p>
            </div>

            {/* Central White Story Timeline Card */}
            <div className="absolute top-[18%] sm:top-[25%] right-2 sm:right-[5%] z-30 w-[calc(100%-20px)] max-w-[340px] sm:max-w-[380px] bg-[#FAF8F5] rounded-xl p-3.5 sm:p-5 shadow-lg border border-[#E8E2D8] transform rotate-0 sm:rotate-[2deg] transition-transform hover:rotate-0 duration-300">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-2.5 sm:pb-3 mb-3 sm:mb-4">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#948E85] mb-2">Illustrative example</p>

                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-md overflow-hidden bg-[#ECE6DC] shrink-0">
                    <Image
                      src="/images/news/ai-conference.jpg"
                      alt="Thumbnail"
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  </div>
                  <div>
                    <h4 className="text-[13px] sm:text-[14px] font-bold text-[#1A1918] leading-tight">
                      AI Provider API Pricing Strategy
                    </h4>
                    <p className="text-[9.5px] sm:text-[10px] text-[#8A847C] mt-0.5">
                      3 developments • Tracked
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 sm:gap-1.5 text-[9.5px] sm:text-[10px] font-medium text-[#701A23] bg-white px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full shadow-2xs border border-[#F0EBE1]">
                  <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                  <span>Tracking</span>
                </span>
              </div>

              {/* Timeline List */}
              <div className="relative pl-4 sm:pl-5 space-y-3.5 sm:space-y-5 before:absolute before:left-[6px] sm:before:left-[7px] before:top-2 before:bottom-3 before:w-[1.5px] before:bg-[#E8E2D8]">

                {/* Event 1 */}
                <div className="relative space-y-1 sm:space-y-1.5">
                  <span className="absolute -left-[16px] sm:-left-[19px] top-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#701A23] ring-3 sm:ring-4 ring-[#FAF8F5]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#701A23]">Sep 1, 2026</span>
                    <span className="text-[9.5px] sm:text-[10px] text-[#8A847C]">Initial announcement</span>
                  </div>
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="flex-1">
                      <h5 className="text-[12px] sm:text-[13px] font-bold text-[#1A1918] leading-tight mb-0.5">
                        OpenAI announces new API pricing
                      </h5>
                      <p className="text-[10.5px] sm:text-[11px] text-[#615C55] leading-snug">
                        OpenAI introduces new pricing for GPT-5 with lower input costs.
                      </p>
                    </div>
                    <div className="relative w-11 h-9 sm:w-12 sm:h-10 rounded overflow-hidden shrink-0 bg-[#ECE6DC]">
                      <Image src="/images/news/ai-conference.jpg" alt="Event 1" fill className="object-cover" sizes="48px" />
                    </div>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="relative space-y-1 sm:space-y-1.5">
                  <span className="absolute -left-[16px] sm:-left-[19px] top-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#701A23] ring-3 sm:ring-4 ring-[#FAF8F5]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#701A23]">Sep 18, 2026</span>
                    <span className="text-[9.5px] sm:text-[10px] text-[#8A847C]">Pricing update</span>
                  </div>
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="flex-1">
                      <h5 className="text-[12px] sm:text-[13px] font-bold text-[#1A1918] leading-tight mb-0.5">
                        Detailed pricing structure released
                      </h5>
                      <p className="text-[10.5px] sm:text-[11px] text-[#615C55] leading-snug">
                        OpenAI releases full pricing tiers and rate limits for different use cases.
                      </p>
                    </div>
                    <div className="relative w-11 h-9 sm:w-12 sm:h-10 rounded overflow-hidden shrink-0 bg-[#ECE6DC]">
                      <Image src="/images/news/building-modern.jpg" alt="Event 2" fill className="object-cover" sizes="48px" />
                    </div>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="relative space-y-1 sm:space-y-1.5">
                  <span className="absolute -left-[16px] sm:-left-[19px] top-1 w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#701A23] ring-3 sm:ring-4 ring-[#FAF8F5]" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] sm:text-[11px] font-bold text-[#701A23]">Oct 18, 2026</span>
                    <span className="text-[9.5px] sm:text-[10px] text-[#8A847C]">Enterprise release</span>
                  </div>
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="flex-1">
                      <h5 className="text-[12px] sm:text-[13px] font-bold text-[#1A1918] leading-tight mb-0.5">
                        New enterprise pricing takes effect
                      </h5>
                      <p className="text-[10.5px] sm:text-[11px] text-[#615C55] leading-snug">
                        Enterprise pricing now live with volume discounts and higher rate limits.
                      </p>
                    </div>
                    <div className="relative w-11 h-9 sm:w-12 sm:h-10 rounded overflow-hidden shrink-0 bg-[#ECE6DC] grayscale contrast-110">
                      <Image src="/images/news/skyscraper-tower.png" alt="Event 3" fill className="object-cover" sizes="48px" />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Floating "Why It Matters" Mini Card on Bottom Left */}
            <div className="absolute bottom-[4%] sm:bottom-[16%] left-2 sm:left-[0%] z-40 w-[calc(100%-24px)] max-w-[250px] sm:max-w-[260px] bg-white rounded-xl p-3.5 sm:p-5 shadow-lg border border-[#E4D9CC] space-y-2 sm:space-y-3 transform rotate-0 sm:rotate-[-4deg] transition-transform hover:rotate-0 duration-300">
              <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-1.5 sm:pb-2">
                <span className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.16em] text-[#8A847C] uppercase">
                  Why It Matters To You
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#701A23]" />
              </div>
              <p className="text-[12px] sm:text-[13px] font-medium text-[#1A1918] leading-snug sm:leading-relaxed">
                Lower API costs could reduce your infrastructure costs and make your go-to-market strategy more viable.
              </p>
              <div className="flex justify-end pt-0.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border border-[#E4D9CC] flex items-center justify-center text-[#701A23] shadow-xs">
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              </div>
            </div>

            {/* Handwritten script note (desktop only) */}
            <div className="hidden sm:flex absolute bottom-[2%] left-[15%] z-30 pointer-events-none flex-col items-center">
              <span className="font-handwriting text-[22px] sm:text-[28px] text-[#701A23] select-none -rotate-6 leading-tight">
                Same story. <br />A clearer you.
              </span>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-[#701A23] -mt-2 -rotate-12" aria-hidden>
                <path d="M4 18 C 10 12, 14 8, 20 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14 4 L 20 4 L 20 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

          </div>

          {/* Right Column: Features Content & 4 Rows */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8 max-w-xl pl-0 lg:pl-10">
            {/* Header */}
            <div className="space-y-1.5 sm:space-y-2">
              <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase block mb-1.5 sm:mb-3">
                Features
              </span>

              <h2 className="font-serif text-[26px] min-[380px]:text-[30px] sm:text-[40px] lg:text-[48px] font-normal leading-[1.1] tracking-tight text-[#1A1918]">
                More than news. <br />
                A clearer <span className="text-[#701A23]">perspective.</span>
              </h2>

              <p className="text-[13.5px] sm:text-[15px] lg:text-[17px] text-[#4A4641] leading-relaxed font-normal max-w-[420px] pt-1.5 sm:pt-4">
                Ambition Gazette combines real-world events with your ambitions to show you what changes, why it matters, and what it could change for you.
              </p>
            </div>

            {/* 4 Feature Rows */}
            <div className="space-y-6 sm:space-y-8 pt-3 sm:pt-6">
              {features.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.num}
                    className="flex items-start gap-4 sm:gap-6 border-t border-[#E8E2D8] pt-5 sm:pt-8 first:pt-0 first:border-0 group"
                  >
                    {/* Circle icon badge */}
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#FAF8F5] border border-[#E8E2D8] flex items-center justify-center text-[#701A23] shrink-0 group-hover:scale-105 group-hover:bg-white group-hover:shadow-xs transition-all duration-300">
                      <span className="font-serif text-[15px] sm:text-[18px] opacity-70 group-hover:hidden transition-all">{item.num}</span>
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5] hidden group-hover:block transition-all" />
                    </div>

                    {/* Content */}
                    <div className="space-y-1 flex-1 pt-0.5">
                      <h3 className="font-serif text-[18px] sm:text-[22px] lg:text-[24px] font-normal tracking-tight text-[#1A1918] group-hover:text-[#701A23] transition-colors leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal pt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
