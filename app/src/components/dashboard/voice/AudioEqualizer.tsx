"use client";

import React, { useMemo } from "react";
import { VoiceState } from "./useVoiceSession";

interface AudioEqualizerProps {
  state: VoiceState;
  audioLevel: number;
}

export function AudioEqualizer({ state, audioLevel }: AudioEqualizerProps) {
  // 5 vertical bars with reduced compact heights
  const barHeights = useMemo(() => {
    if (state === "stopped" || state === "idle" || state === "error") {
      return [3, 5, 7, 5, 3];
    }

    if (state === "processing" || state === "connecting") {
      return [4, 9, 13, 9, 4];
    }

    const base = [0.42, 0.78, 1.0, 0.72, 0.45];
    return base.map((factor) => {
      const minH = 3;
      const maxH = 14;
      const calcH = minH + (maxH - minH) * Math.min(1, Math.max(0.1, audioLevel * 1.5 * factor));
      return Math.round(calcH);
    });
  }, [state, audioLevel]);

  const stateText = useMemo(() => {
    switch (state) {
      case "listening":
        return "Listening...";
      case "connecting":
        return "Connecting...";
      case "processing":
        return "Thinking...";
      case "speaking":
        return "Gazzy is speaking...";
      case "idle":
        return "On hold";
      case "stopped":
        return "Call ended";
      case "error":
        return "Unavailable";
    }
  }, [state]);

  return (
    <div className="flex items-center justify-center gap-1.5 select-none">
      {/* 5-Bar Amber Audio Equalizer */}
      <div className="flex items-center gap-[2px] h-4 justify-center">
        {barHeights.map((h, i) => (
          <span
            key={i}
            className={`w-[2px] rounded-full transition-all duration-75 ${
              state === "stopped" || state === "idle" || state === "error"
                ? "bg-[#D97706]/45"
                : state === "processing" || state === "connecting"
                ? "bg-gradient-to-t from-[#D97706] to-[#F59E0B] animate-pulse"
                : "bg-gradient-to-t from-[#D97706] to-[#FBBF24] shadow-[0_0_5px_rgba(245,158,11,0.55)]"
            }`}
            style={{
              height: `${h}px`,
              transition: "height 75ms ease-out",
            }}
          />
        ))}
      </div>

      {/* State Text */}
      <span className="text-[12.5px] font-dm-sans font-normal text-[#D2CBC2] tracking-wide">
        {stateText}
      </span>
    </div>
  );
}
