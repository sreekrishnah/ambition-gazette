import React from "react";
import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1918] flex flex-col items-center justify-center p-6 selection:bg-[#701A23]/15 selection:text-[#701A23] font-ubuntu">
      <div className="flex flex-col items-center max-w-[360px] text-center">
        {/* Animated Brand Emblem */}
        <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-[#701A23]/20 animate-ping opacity-30" />
          <div className="relative w-16 h-16 flex items-center justify-center rounded-2xl bg-white border border-[#E8E2D8] shadow-sm">
            <Image
              src="/images/logo.png"
              alt="Ambition Gazette Loading"
              width={48}
              height={48}
              className="object-contain mix-blend-multiply"
              priority
            />
          </div>
        </div>

        {/* Loading Indicator Dots */}
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#701A23] animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#701A23] animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#701A23] animate-bounce" />
        </div>

        {/* Title */}
        <h2 className="font-serif text-[19px] sm:text-[21px] text-[#1A1918] font-normal tracking-tight mb-1.5">
          Assembling Intelligence
        </h2>

        {/* Subtext */}
        <p className="text-[12px] sm:text-[12.5px] text-[#68645E] leading-relaxed font-dm-sans">
          Tracing world developments and synchronizing signals with your tracked ambitions.
        </p>
      </div>
    </div>
  );
}
