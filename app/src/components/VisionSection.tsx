"use client";

import Image from "next/image";
import { BrainCircuit, Radar, Network, Split } from "lucide-react";

export default function VisionSection() {
  return (
    <section id="vision" className="relative w-full bg-[#FAF8F5] pt-12 sm:pt-16 lg:pt-24 pb-16 sm:pb-24 lg:pb-32 overflow-hidden border-t border-[#EAE3D8]">

      {/* Background Image Setup */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* We place the image on the right/bottom half and use mask-image to fade it left and top */}
        <div
          className="absolute right-0 bottom-0 w-full lg:w-[85%] h-full opacity-60 mix-blend-multiply"
          style={{
            WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent 100%), linear-gradient(to top, black 30%, transparent 100%)',
            maskImage: 'linear-gradient(to left, black 40%, transparent 100%), linear-gradient(to top, black 30%, transparent 100%)',
            WebkitMaskComposite: 'source-in',
            maskComposite: 'intersect'
          }}
        >
          <Image
            src="/images/features_visuals.png"
            alt="Vision Desk"
            fill
            className="object-cover object-right-bottom"
            sizes="100vw"
          />
        </div>
      </div>

      <div className="relative z-10 max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12">

        {/* Top Header */}
        <div className="w-full mb-10 sm:mb-16 lg:mb-24">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-5">
            <span className="text-[10.5px] sm:text-[11px] font-bold tracking-[0.2em] text-[#8A847C] uppercase">
              Our Vision
            </span>
            <div className="h-[1px] w-12 sm:w-16 bg-[#D8CFBE]" />
          </div>

          <h2 className="font-serif text-[26px] min-[380px]:text-[30px] sm:text-[40px] lg:text-[48px] font-normal leading-[1.1] tracking-tight text-[#1A1918] mb-3 sm:mb-6">
            A clearer tomorrow
            <span className="text-[#701A23]"> for every ambition.</span>
          </h2>

          <p className="text-[13.5px] sm:text-[15px] lg:text-[17px] text-[#4A4641] leading-relaxed font-normal w-full max-w-4xl">
            We&apos;re building a more connected, coherent, and forward-looking world — where you don&apos;t just see what&apos;s happening, but what it means for your ambitions, <span className="text-[#701A23] font-medium">today and tomorrow.</span>
          </p>
        </div>

        {/* Timeline Path & Points */}
        <div className="relative mt-8 sm:mt-12 lg:mt-26">

          {/* Curving Thread SVG Background */}
          {/* Using precise Y coordinates for dots: 63, 93, 93, 123 */}
          <div className="absolute top-0 left-0 w-full h-[150px] pointer-events-none hidden lg:block">
            <svg viewBox="0 0 1000 150" className="w-full h-full" fill="none" preserveAspectRatio="none">
              <path
                d="M 0 55 C 80 55, 100 63, 125 63 C 250 63, 250 93, 375 93 C 500 93, 500 93, 625 93 C 750 93, 750 123, 875 123 C 950 123, 1000 123, 1000 123"
                stroke="#701A23"
                strokeWidth="1.5"
                className="opacity-40"
              />
            </svg>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-8 sm:gap-y-12 lg:gap-y-16">

            {/* Point 1 */}
            <div className="relative flex flex-col px-1 sm:px-4">
              {/* Desktop Node Connectors */}
              <div className="hidden lg:flex flex-col items-center absolute -top-[20px] left-1/2 -translate-x-1/2 z-10">
                <div className="w-14 h-14 rounded-full bg-[#F4EDE4] border border-[#E4D9CC] shadow-sm flex items-center justify-center text-[#701A23]">
                  <BrainCircuit className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div className="w-px h-[24px] bg-[#701A23] opacity-40" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#701A23]" />
              </div>

              {/* Mobile Icon */}
              <div className="lg:hidden w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#F4EDE4] border border-[#E4D9CC] shadow-xs flex items-center justify-center mb-3 sm:mb-6 text-[#701A23]">
                <BrainCircuit className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
              </div>

              <div className="lg:mt-[100px] border-l border-[#E8E2D8] lg:border-l-0 pl-4 sm:pl-6 lg:pl-0 relative z-20">
                <span className="text-[12px] sm:text-[13px] font-bold text-[#8A847C] mb-1.5 sm:mb-2 block">01</span>
                <h4 className="font-serif text-[19px] sm:text-[22px] lg:text-[24px] font-normal tracking-tight text-[#1A1918] leading-tight mb-2 sm:mb-3">
                  An amplified <br className="hidden lg:block" />
                  intelligence layer
                </h4>
                <div className="bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-xl border border-white/60 shadow-xs mt-2 sm:mt-3">
                  <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal">
                    Voice conversations and explanations in your language, with low-friction interaction, make the same underlying intelligence accessible to anyone — <span className="text-[#701A23] font-semibold">regardless of language, expertise, or how they consume information.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Point 2 */}
            <div className="relative flex flex-col px-1 sm:px-4">
              {/* Desktop Node Connectors */}
              <div className="hidden lg:flex flex-col items-center absolute top-[10px] left-1/2 -translate-x-1/2 z-10">
                <div className="w-14 h-14 rounded-full bg-[#F4EDE4] border border-[#E4D9CC] shadow-sm flex items-center justify-center text-[#701A23]">
                  <Radar className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div className="w-px h-[24px] bg-[#701A23] opacity-40" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#701A23]" />
              </div>

              {/* Mobile Icon */}
              <div className="lg:hidden w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#F4EDE4] border border-[#E4D9CC] shadow-xs flex items-center justify-center mb-3 sm:mb-6 text-[#701A23]">
                <Radar className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
              </div>

              <div className="lg:mt-[130px] border-l border-[#E8E2D8] lg:border-l-0 pl-4 sm:pl-6 lg:pl-0 relative z-20">
                <span className="text-[12px] sm:text-[13px] font-bold text-[#8A847C] mb-1.5 sm:mb-2 block">02</span>
                <h4 className="font-serif text-[19px] sm:text-[22px] lg:text-[24px] font-normal tracking-tight text-[#1A1918] leading-tight mb-2 sm:mb-3">
                  A Future <br className="hidden lg:block" />
                  Shock Detector
                </h4>
                <div className="bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-xl border border-white/60 shadow-xs mt-2 sm:mt-3">
                  <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal">
                    Move beyond reporting events to detecting when the conditions behind an ambition are beginning to shift, surfacing <span className="text-[#701A23] font-semibold">weak signals before they become obvious developments.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Point 3 */}
            <div className="relative flex flex-col px-1 sm:px-4">
              {/* Desktop Node Connectors (Icon below the dot) */}
              <div className="hidden lg:flex flex-col items-center absolute top-[90px] left-1/2 -translate-x-1/2 z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-[#701A23]" />
                <div className="w-px h-[24px] bg-[#701A23] opacity-40" />
                <div className="w-14 h-14 rounded-full bg-[#F4EDE4] border border-[#E4D9CC] shadow-sm flex items-center justify-center text-[#701A23]">
                  <Network className="w-6 h-6 stroke-[1.5]" />
                </div>
              </div>

              {/* Mobile Icon */}
              <div className="lg:hidden w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#F4EDE4] border border-[#E4D9CC] shadow-xs flex items-center justify-center mb-3 sm:mb-6 text-[#701A23]">
                <Network className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5]" />
              </div>

              <div className="lg:mt-[210px] border-l border-[#E8E2D8] lg:border-l-0 pl-4 sm:pl-6 lg:pl-0 relative z-20">
                <span className="text-[12px] sm:text-[13px] font-bold text-[#8A847C] mb-1.5 sm:mb-2 block">03</span>
                <h4 className="font-serif text-[19px] sm:text-[22px] lg:text-[24px] font-normal tracking-tight text-[#1A1918] leading-tight mb-2 sm:mb-3">
                  A Living <br className="hidden lg:block" />
                  Reality Graph
                </h4>
                <div className="bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-xl border border-white/60 shadow-xs mt-2 sm:mt-3">
                  <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal">
                    Build a persistent map connecting ambitions → assumptions → world events → consequences → decisions across months and years, allowing users to understand not just what happened, but <span className="text-[#701A23] font-semibold">how their reality evolved.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Point 4 */}
            <div className="relative flex flex-col px-1 sm:px-4">
              {/* Desktop Node Connectors (Icon below the dot) */}
              <div className="hidden lg:flex flex-col items-center absolute top-[120px] left-1/2 -translate-x-1/2 z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-[#701A23]" />
                <div className="w-px h-[24px] bg-[#701A23] opacity-40" />
                <div className="w-14 h-14 rounded-full bg-[#F4EDE4] border border-[#E4D9CC] shadow-sm flex items-center justify-center text-[#701A23]">
                  <Split className="w-6 h-6 stroke-[1.5] -rotate-90" />
                </div>
              </div>

              {/* Mobile Icon */}
              <div className="lg:hidden w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-[#F4EDE4] border border-[#E4D9CC] shadow-xs flex items-center justify-center mb-3 sm:mb-6 text-[#701A23]">
                <Split className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.5] -rotate-90" />
              </div>

              <div className="lg:mt-[240px] border-l border-[#E8E2D8] lg:border-l-0 pl-4 sm:pl-6 lg:pl-0 relative z-20">
                <span className="text-[12px] sm:text-[13px] font-bold text-[#8A847C] mb-1.5 sm:mb-2 block">04</span>
                <h4 className="font-serif text-[19px] sm:text-[22px] lg:text-[24px] font-normal tracking-tight text-[#1A1918] leading-tight mb-2 sm:mb-3">
                  Counterfactual <br className="hidden lg:block" />
                  Scenarios
                </h4>
                <div className="bg-white/70 backdrop-blur-md p-3.5 sm:p-4 rounded-xl border border-white/60 shadow-xs mt-2 sm:mt-3">
                  <p className="text-[13.5px] sm:text-[15px] text-[#4A4641] leading-relaxed font-normal">
                    Let users explore &quot;what if?&quot; branches of their timeline — showing how different world developments could <span className="text-[#701A23] font-semibold">have changed the assumptions, dependencies, and trajectory surrounding an ambition.</span>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
