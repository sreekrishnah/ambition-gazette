"use client";

import Image from "next/image";
import { Globe, User, Compass, Check, Square, CheckSquare } from "lucide-react";

export default function AboutSection() {
  return (
    <section id="about" className="relative w-full bg-[#FAF8F5] pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 lg:pb-28 border-t border-[#EAE3D8] overflow-hidden">

      {/* Top Part: Narrative & Desk Scene with Journal */}
      <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12 mb-12 sm:mb-16 lg:mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-16 items-center">

          {/* Left Column: Narrative */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6 max-w-xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.2em] text-[#8A847C] uppercase">
                About Ambition Gazette
              </span>
              <div className="h-[1px] w-20 sm:w-28 bg-[#D8CFBE]" />
            </div>

            <h2 className="font-serif text-[26px] min-[380px]:text-[32px] sm:text-[44px] lg:text-[48px] font-normal leading-[1.1] text-[#1A1918]">
              A plan is only <br />
              as good as <br />
              <span className="text-[#701A23]">what it assumes.</span>
            </h2>

            <div className="space-y-3 sm:space-y-4 text-[14px] sm:text-[16px] text-[#615C55] leading-relaxed">
              <p>
                Ambition Gazette was born from a simple observation: we don&apos;t lack information —{" "}
                <span className="text-[#701A23] font-medium">we lack perspective.</span>
              </p>

              <p>
                The world moves fast. Headlines come and go. But the things that truly matter to you — your goals, your decisions, your future — are shaped by how events connect over time.
              </p>

              <p>
                Ambition Gazette exists to help you see that connection.
              </p>
            </div>

            {/* Handwritten script note with curved arrow pointing towards desk */}
            <div className="pt-4 sm:pt-10 pl-1 sm:pl-8 flex items-start gap-3 sm:gap-4 opacity-90 transform -rotate-2 sm:-rotate-3 transition-transform hover:-rotate-1 duration-300">
              <div className="font-handwriting text-[22px] sm:text-[30px] text-[#701A23] leading-tight select-none">
                Not just today&apos;s news. <br />
                The bigger picture.
              </div>
              <svg width="44" height="32" viewBox="0 0 48 32" fill="none" className="text-[#701A23] mt-4 sm:mt-6 shrink-0" aria-hidden>
                <path d="M 4 22 C 18 12, 32 8, 44 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M 36 6 L 44 14 L 38 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Right Column: Desk Visual Scene with Journal Notes */}
          <div className="lg:col-span-7 relative min-h-[400px] min-[420px]:min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] flex items-center justify-center">

            {/* Visual background image of Parisian desk & sunset window */}
            <div className="relative w-full h-[400px] min-[420px]:h-[460px] sm:h-[520px] lg:h-[560px] select-none pointer-events-none rounded-xl sm:rounded-2xl overflow-hidden shadow-lg border border-[#E8E2D8]">
              <Image
                src="/images/features_visuals.png"
                alt="Sunlit desk with journal overlooking the city"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            </div>

            {/* Journal overlay card representing the open notebook */}
            <div className="absolute bottom-[4%] sm:bottom-[6%] left-2 right-2 sm:left-[10%] sm:right-[14%] z-20 bg-[#FBF8F2]/95 backdrop-blur-xs rounded-xl p-3.5 sm:p-5 shadow-xl border border-[#D8CFBE]/80 transform rotate-0 sm:rotate-[1deg]">
              <div className="grid grid-cols-2 gap-3 sm:gap-6 divide-x divide-[#E5DEC3]">

                {/* Left Page: My Goals */}
                <div className="space-y-1.5 sm:space-y-2 pr-1.5 sm:pr-2">
                  <div className="border-b border-[#701A23]/30 pb-1">
                    <span className="font-handwriting text-[17px] sm:text-[22px] font-bold text-[#1A1918]">
                      My Goals
                    </span>
                  </div>
                  <ul className="space-y-1 sm:space-y-1.5 font-handwriting text-[13px] sm:text-[17px] text-[#4A443D] leading-tight sm:leading-snug">
                    <li className="flex items-center gap-1 sm:gap-1.5 text-[#701A23]">
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      <span className="text-[#1A1918]">Build AI product</span>
                    </li>
                    <li className="flex items-center gap-1 sm:gap-1.5">
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-[#8A847C] inline-block" />
                      <span>Enter Indian market</span>
                    </li>
                    <li className="flex items-center gap-1 sm:gap-1.5">
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-[#8A847C] inline-block" />
                      <span>Explore funding</span>
                    </li>
                    <li className="flex items-center gap-1 sm:gap-1.5">
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-[#8A847C] inline-block" />
                      <span>Launch in 6 months</span>
                    </li>
                  </ul>
                </div>

                {/* Right Page: What's Happening */}
                <div className="space-y-1.5 sm:space-y-2 pl-3 sm:pl-6">
                  <div className="border-b border-[#701A23]/30 pb-1">
                    <span className="font-handwriting text-[17px] sm:text-[22px] font-bold text-[#1A1918]">
                      What&apos;s happening?
                    </span>
                  </div>
                  <ul className="space-y-1 sm:space-y-1.5 font-handwriting text-[13px] sm:text-[17px] text-[#4A443D] leading-tight sm:leading-snug">
                    <li className="flex items-center gap-1 sm:gap-1.5 text-[#701A23]">
                      <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                      <span className="text-[#1A1918]">API pricing changes</span>
                    </li>
                    <li className="flex items-center gap-1 sm:gap-1.5">
                      <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8A847C] stroke-[1.8]" />
                      <span>New regulations</span>
                    </li>
                    <li className="flex items-center gap-1 sm:gap-1.5">
                      <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8A847C] stroke-[1.8]" />
                      <span>Competitor launches</span>
                    </li>
                    <li className="flex items-center gap-1 sm:gap-1.5">
                      <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8A847C] stroke-[1.8]" />
                      <span>Market opportunities</span>
                    </li>
                  </ul>
                </div>

              </div>
            </div>

            {/* Framed card note beside window */}
            <div className="absolute top-[8%] right-[4%] z-20 w-[130px] sm:w-[150px] bg-[#FAF8F5]/90 backdrop-blur-xs rounded-lg p-3 shadow-md border border-[#E8E2D8] text-center transform rotate-2 hidden sm:block">
              <p className="font-handwriting text-[17px] sm:text-[19px] text-[#701A23] leading-tight">
                Different pieces. <br />
                A connected story.
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* Bottom Part: "OUR BELIEF" */}
      <div className="relative border-t border-[#E8E2D8] bg-[#F7F4EE]/50 pt-10 sm:pt-16 pb-10 sm:pb-14">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">

            {/* Alpine Road Visual Thumbnail on Left */}
            <div className="lg:col-span-4 relative h-[200px] sm:h-[280px] rounded-xl sm:rounded-2xl overflow-hidden shadow-xs border border-[#E8E2D8]">
              <Image
                src="/images/snow_mountain_visuals.png"
                alt="Winding alpine mountain road"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#FAF8F5]/50 via-transparent to-transparent" />
            </div>

            {/* Belief Title & 3 Cards */}
            <div className="lg:col-span-8 space-y-6 sm:space-y-8">

              {/* Belief Header */}
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.2em] text-[#8A847C] uppercase">
                    Our Belief
                  </span>
                  <div className="h-[1px] w-16 sm:w-24 bg-[#D8CFBE]" />
                </div>
                <h3 className="font-serif text-[24px] min-[380px]:text-[28px] sm:text-[36px] font-normal leading-tight text-[#1A1918]">
                  Events shape lives <br />
                  when connected to <span className="text-[#701A23]">purpose.</span>
                </h3>
              </div>

              {/* 3 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 pt-1 sm:pt-2">

                {/* Column 1 */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-[#E4D9CC] flex items-center justify-center text-[#701A23] shadow-2xs">
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.6]" />
                  </div>
                  <h4 className="font-serif text-[17px] sm:text-[18px] font-normal text-[#1A1918]">
                    A connected world
                  </h4>
                  <p className="text-[13px] sm:text-[15px] text-[#615C55] leading-relaxed">
                    Real-world events are not isolated. They form ongoing stories with real consequences.
                  </p>
                </div>

                {/* Column 2 */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-[#E4D9CC] flex items-center justify-center text-[#701A23] shadow-2xs">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.6]" />
                  </div>
                  <h4 className="font-serif text-[17px] sm:text-[18px] font-normal text-[#1A1918]">
                    A personal lens
                  </h4>
                  <p className="text-[13px] sm:text-[15px] text-[#615C55] leading-relaxed">
                    The same event can mean different things for different people. Personal relevance turns information into clarity.
                  </p>
                </div>

                {/* Column 3 */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border border-[#E4D9CC] flex items-center justify-center text-[#701A23] shadow-2xs">
                    <Compass className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.6]" />
                  </div>
                  <h4 className="font-serif text-[17px] sm:text-[18px] font-normal text-[#1A1918]">
                    A more informed you
                  </h4>
                  <p className="text-[13px] sm:text-[15px] text-[#615C55] leading-relaxed">
                    When you can see what changed, why it matters, and what it could change for you, you make better decisions.
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
