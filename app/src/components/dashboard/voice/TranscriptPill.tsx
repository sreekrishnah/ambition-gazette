"use client";

import React, { useEffect, useRef } from "react";
import { Mic } from "lucide-react";

interface TranscriptPillProps {
  userText: string;
  agentText: string;
  listening: boolean;
}

// One line per speaker, both from Gemini Live's transcription, so what was heard is always visible.
export function TranscriptPill({ userText, agentText, listening }: TranscriptPillProps) {
  const hasText = userText.length > 0 || agentText.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [userText, agentText]);

  return (
    <div className="w-full max-w-[92vw] sm:max-w-[480px] px-2 sm:px-4 flex justify-center select-none">
      <div
        aria-live="polite"
        className="w-full flex items-start gap-2.5 sm:gap-3 px-4 py-2 sm:px-6 sm:py-3 rounded-3xl bg-[#161311]/75 border border-[#484037]/75 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all"
      >
        <div className="shrink-0 flex items-center justify-center mt-0.5">
          <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#E59838] drop-shadow-[0_0_6px_rgba(245,158,11,0.55)]" />
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 min-w-0 max-h-[5.8em] sm:max-h-[6.8em] overflow-y-auto space-y-1.5 font-dm-sans scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {userText && (
            <p className="text-[11.5px] sm:text-[12.5px] text-[#CFC8BE] leading-snug sm:leading-relaxed">
              <span className="text-[#E59838] font-medium">You: </span>
              {userText}
            </p>
          )}
          {agentText && (
            <p className="text-[11.5px] sm:text-[12.5px] text-[#F3EFEA] leading-snug sm:leading-relaxed">
              <span className="text-[#E59838] font-medium">Agent: </span>
              {agentText}
            </p>
          )}
          {!hasText && (
            <p className="text-[11.5px] sm:text-[12.5px] text-[#9E988F] leading-snug">
              {listening ? "Listening. Speak when you are ready." : "Connecting"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
