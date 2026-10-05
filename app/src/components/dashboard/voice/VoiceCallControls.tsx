"use client";

import React from "react";
import { MicOff, Mic, Play } from "lucide-react";

interface VoiceCallControlsProps {
  isMuted: boolean;
  onToggleMute: () => void;
  isHeld: boolean;
  onToggleHold: () => void;
  onEnd: () => void;
}

export function VoiceCallControls({
  isMuted,
  onToggleMute,
  isHeld,
  onToggleHold,
  onEnd,
}: VoiceCallControlsProps) {
  return (
    <div className="flex items-center justify-center gap-6 sm:gap-8 select-none">
      {/* 1. Mute Control Button */}
      <div className="flex flex-col items-center justify-center">
        <button
          onClick={onToggleMute}
          type="button"
          aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 border ${
            isMuted
              ? "bg-[#3D1E22] border-[#DE6A52]/50 text-white"
              : "bg-[#282422]/90 hover:bg-[#342F2C] border-white/12 text-white/90"
          }`}
        >
          {isMuted ? <Mic className="w-4 h-4 text-amber-400" /> : <MicOff className="w-4 h-4 text-white" />}
        </button>
        <span className="text-[11px] font-dm-sans text-white/60 tracking-wider mt-1.5">
          {isMuted ? "Unmute" : "Mute"}
        </span>
      </div>

      {/* 2. Hold Control Button (Dominant Center Burgundy Button with Glowing Ring) */}
      <div className="flex flex-col items-center justify-center">
        <button
          onClick={onToggleHold}
          type="button"
          aria-label={isHeld ? "Resume call" : "Hold call"}
          className="relative group p-0.5 rounded-full transition-all duration-300 cursor-pointer active:scale-95 focus:outline-none border border-[#DE6A52]/35 shadow-[0_0_16px_rgba(112,26,35,0.45)]"
        >
          {/* Inner Circular Button */}
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full flex items-center justify-center bg-gradient-to-b from-[#6A1A23] to-[#450D14] hover:from-[#7E202B] hover:to-[#55121B] transition-all">
            {isHeld ? (
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            ) : (
              /* Two crisp vertical pause bars */
              <div className="flex items-center gap-1">
                <span className="w-1 h-3.5 bg-white rounded-[1.5px]" />
                <span className="w-1 h-3.5 bg-white rounded-[1.5px]" />
              </div>
            )}
          </div>
        </button>
        <span className="text-[11px] font-dm-sans text-white/60 tracking-wider mt-1.5">
          {isHeld ? "Resume" : "Hold"}
        </span>
      </div>

      {/* 3. End Call Button (Rich Crimson Red with Call End Icon) */}
      <div className="flex flex-col items-center justify-center">
        <button
          onClick={onEnd}
          type="button"
          aria-label="End voice call"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-[#A11E28] hover:bg-[#B5242E] transition-all duration-200 cursor-pointer active:scale-95 shadow-md"
        >
          {/* Standard Call End Handset Facing Downward */}
          <svg className="w-4 h-4 fill-white text-white" viewBox="0 0 24 24">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.97.49-1.84 1.13-2.6 1.9-.22.22-.52.34-.84.34s-.62-.12-.85-.35L.35 13.41c-.22-.23-.35-.53-.35-.85s.13-.62.35-.85C3.3 8.76 7.42 7 12 7s8.7 1.76 11.65 4.71c.22.23.35.53.35.85s-.13.62-.35.85l-2.2 2.2c-.23.23-.53.35-.85.35s-.62-.12-.84-.34c-.76-.77-1.63-1.41-2.6-1.9-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
        <span className="text-[11px] font-dm-sans text-white/60 tracking-wider mt-1.5">
          End
        </span>
      </div>
    </div>
  );
}
