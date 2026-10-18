"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

interface TranscriptPillProps {
  userText: string;
  agentText: string;
  listening: boolean;
  held: boolean;
}

// The transcript arrives well ahead of the audio, so the agent's words are revealed at about speaking pace.
const CHARS_PER_TICK = 2.2;
const TICK_MS = 100;

// One line per speaker, both from Gemini Live's transcription, so what was heard is always visible.
export function TranscriptPill({ userText, agentText, listening, held }: TranscriptPillProps) {
  const hasText = userText.length > 0 || agentText.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const openingRef = useRef("");

  useEffect(() => {
    if (!agentText) {
      openingRef.current = "";
      setShown(0);
      return;
    }
    // A new passage starts from its first word instead of inheriting the previous passage's position.
    const opening = agentText.slice(0, 12);
    if (agentText.length >= 12 && opening !== openingRef.current) {
      openingRef.current = opening;
      setShown(0);
    }
    // While the call is on hold the reveal stands still, like the voice.
    if (held) return;
    const id = setInterval(() => {
      // A long backlog speeds the reveal up a little so the text never falls far behind the voice.
      setShown((n) => Math.min(agentText.length, n + CHARS_PER_TICK + Math.floor(Math.max(0, agentText.length - n - 300) / 40)));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [agentText, held]);

  const agentShown = agentText.slice(0, Math.floor(shown));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [userText, agentShown]);

  return (
    <div className="w-full max-w-[94vw] sm:max-w-[580px] px-2 sm:px-4 flex justify-center select-none">
      <div
        aria-live="polite"
        className="w-full flex items-start gap-2.5 sm:gap-3 px-4 py-2.5 sm:px-7 sm:py-3.5 rounded-3xl bg-[#161311]/75 border border-[#484037]/75 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all"
      >
        <div className="shrink-0 flex items-center justify-center mt-0.5">
          <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-[#E59838] drop-shadow-[0_0_6px_rgba(245,158,11,0.55)]" />
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-w-0 max-h-[5.6em] sm:max-h-[6.4em] overflow-y-auto space-y-1.5 font-dm-sans scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {userText && !agentShown && (
            <p className="text-[12.5px] sm:text-[13.5px] text-[#CFC8BE] leading-snug sm:leading-relaxed">
              <span className="text-[#E59838] font-medium">You: </span>
              {userText}
            </p>
          )}
          {agentShown && (
            <p className="text-[12.5px] sm:text-[13.5px] text-[#F3EFEA] leading-snug sm:leading-relaxed">
              <span className="text-[#E59838] font-medium">Agent: </span>
              {agentShown}
            </p>
          )}
          {!hasText && (
            <p className="text-[12.5px] sm:text-[13.5px] text-[#9E988F] leading-snug">
              {listening ? "Listening. Speak when you are ready." : "Connecting"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
