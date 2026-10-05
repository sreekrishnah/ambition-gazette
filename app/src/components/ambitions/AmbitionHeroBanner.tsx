"use client";

import React, { useState } from "react";
import Image from "next/image";
import { MoreHorizontal, Pencil, Clock, MapPin, Briefcase } from "lucide-react";
import { AmbitionData } from "@/types/ambitions";

interface AmbitionHeroBannerProps {
  data: AmbitionData;
  onEdit: () => void;
}

export function AmbitionHeroBanner({
  data,
  onEdit,
}: AmbitionHeroBannerProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <section className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden min-h-[175px] sm:min-h-[195px] md:min-h-[215px] border border-[#ECE7DF] shadow-xs group">
      {/* Background Photography Image */}
      <Image
        src="/images/dashboard/ambition-mountain-banner.jpg"
        alt="Mountain sunrise"
        fill
        sizes="(max-width: 1024px) 100vw, 1200px"
        priority
        className="object-cover object-right select-none"
      />

      {/* Editorial Warm Peach/Cream Gradient Overlay on Left */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F5]/95 via-[#FAF8F5]/80 sm:via-[#FAF8F5]/65 to-transparent z-10 pointer-events-none" />

      {/* Banner Inner Content */}
      <div className="relative z-20 h-full p-4.5 sm:p-6 md:p-8 flex flex-col justify-between">
        {/* Top Row: Three-dots action menu on right */}
        <div className="flex justify-end relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white border border-[#ECE7DF]/80 shadow-xs flex items-center justify-center text-[#524E48] transition cursor-pointer active:scale-95"
            aria-label="Ambition options"
          >
            <MoreHorizontal className="w-4 h-4 text-[#524E48]" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-10 w-44 bg-white border border-[#ECE7DF] rounded-xl shadow-lg py-1.5 z-30 font-dm-sans text-xs text-[#1A1918]">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onEdit();
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-[#FAF8F5] flex items-center gap-2 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#524E48]" />
                <span>Edit Ambition</span>
              </button>
            </div>
          )}
        </div>

        {/* Headline, Subtitle, and Metadata */}
        <div>
          <h2 className="font-ubuntu font-bold text-[20px] min-[400px]:text-[24px] sm:text-[30px] md:text-[36px] text-[#1A1918] tracking-tight leading-[1.18]">
            {data.title}
          </h2>

          {/* Metadata tags */}
          <div className="mt-3 sm:mt-4 flex flex-wrap items-center gap-3 sm:gap-6 text-[#1A1918] text-[11.5px] sm:text-[12.5px] font-medium font-dm-sans">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#524E48] shrink-0" />
              <span>{data.timeHorizon}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#524E48] shrink-0" />
              <span>{data.location}</span>
            </div>

            {data.role && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#524E48] shrink-0" />
                <span>{data.role}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
