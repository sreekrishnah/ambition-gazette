import React from "react";
import Image from "next/image";

interface AIAgentCardProps {
  onOpenAgentModal: () => void;
}

export function AIAgentCard({ onOpenAgentModal }: AIAgentCardProps) {
  return (
    <section className="bg-white border border-[#ECE7DF] rounded-2xl p-4.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] relative overflow-hidden">
      {/* Header: Title + Online Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Glowing warm sun icon */}
          <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <svg
              className="w-3.5 h-3.5 fill-amber-500 text-amber-500"
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
          <h4 className="font-ubuntu font-bold text-[15px] text-[#1A1918]">
            Gazzy
          </h4>
        </div>
      </div>

      {/* Body Content & Harmonic Orb Visual */}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <div className="flex-1 min-w-0 pr-1 sm:pr-2">
          <p className="text-[11px] sm:text-[11.5px] text-[#68645E] leading-relaxed max-w-[240px] font-ubuntu">
            Ask about your plan, out loud.
          </p>
          <button
            onClick={onOpenAgentModal}
            className="mt-2.5 sm:mt-3.5 bg-[#701A23] hover:bg-[#58141B] text-white text-[10.5px] sm:text-[11px] font-medium px-3 sm:px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 sm:gap-2 shadow-xs transition cursor-pointer active:scale-95 font-dm-sans"
          >
            {/* Audio Waveform icon */}
            <span className="flex items-center gap-0.5 h-2.5">
              <span className="w-[1.5px] h-2 bg-white rounded-full"></span>
              <span className="w-[1.5px] h-3 bg-white rounded-full"></span>
              <span className="w-[1.5px] h-2 bg-white rounded-full"></span>
            </span>
            <span>Call</span>
            <span className="text-xs">→</span>
          </button>
        </div>

        {/* Luminous Brown AI Agent Orb with Flowing Silk Waves (Transparent PNG) */}
        <div className="w-[100px] min-[400px]:w-[125px] sm:w-[160px] md:w-[180px] h-[75px] sm:h-[90px] relative shrink-0 -mr-1 -my-1 flex items-center justify-end pointer-events-none select-none">
          <Image
            src="/images/dashboard/ai-agent-orb.png"
            alt="AI Agent Intelligence Orb"
            fill
            sizes="(max-width: 480px) 110px, (max-width: 768px) 160px, 200px"
            className="object-contain object-right drop-shadow-[0_4px_20px_rgba(112,26,35,0.06)]"
            priority
            unoptimized
          />
        </div>
      </div>
    </section>
  );
}
