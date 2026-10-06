"use client";

import React, { useEffect, useCallback, useState } from "react";
import { X } from "lucide-react";
import { GazyOrbCanvas } from "./GazyOrbCanvas";
import { AudioEqualizer } from "./AudioEqualizer";
import { TranscriptPill } from "./TranscriptPill";
import { VoiceCallClose, VoiceCallControls } from "./VoiceCallControls";
import { useVoiceSession } from "./useVoiceSession";

interface GazyVoiceOverlayProps {
  language: string;
  isOpen: boolean;
  onClose: () => void;
}

// mm:ss, or h:mm:ss for a call longer than an hour.
function formatDuration(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function GazyVoiceOverlay({ isOpen, language, onClose }: GazyVoiceOverlayProps) {
  const {
    state,
    audioLevel,
    userText,
    agentText,
    isMuted,
    toggleMute,
    isHeld,
    toggleHold,
    stopSession,
    elapsedSec,
    error,
  } = useVoiceSession(isOpen, language);

  // Once the call is over there is nothing to hang up, so every way out simply closes the screen.
  const callEnded = state === "stopped";

  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const requestEndCall = useCallback(() => {
    if (callEnded) onClose();
    else setShowEndConfirm(true);
  }, [callEnded, onClose]);

  const confirmEndCall = useCallback(() => {
    setShowEndConfirm(false);
    stopSession();
    onClose();
  }, [stopSession, onClose]);

  const cancelEndCall = useCallback(() => {
    setShowEndConfirm(false);
  }, []);

  // Close on Escape key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showEndConfirm) {
          cancelEndCall();
        } else {
          requestEndCall();
        }
      }
    },
    [requestEndCall, cancelEndCall, showEndConfirm]
  );

  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between select-none animate-in fade-in duration-300">
      {/* 1. Backdrop: Dark Translucent Overlay with Heavy Blur & Radial Vignette */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-300 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 32%, rgba(0, 0, 0, 0.45) 0%, rgba(0, 0, 0, 0.72) 75%, rgba(0, 0, 0, 0.88) 100%)",
        }}
      />

      {/* 2. Top Navigation Bar: Minimal subtle Close button */}
      <header className="relative z-10 w-full max-w-[1400px] px-6 sm:px-8 pt-4 pb-0 grid grid-cols-3 items-center">
        <div />
        <div role="timer" aria-label="Call duration" className="justify-self-center flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-[14px] sm:text-[15px] font-dm-sans tabular-nums text-white/85">
          {callEnded && <span className="text-white/55">Call ended</span>}
          <span>{formatDuration(elapsedSec)}</span>
        </div>
        <button
          onClick={requestEndCall}
          type="button"
          aria-label="Exit voice session"
          className="justify-self-end text-white/40 hover:text-white/90 p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* 3. Main Center Voice Interface */}
      <main className="relative z-10 flex-1 w-full max-w-[1200px] flex flex-col items-center justify-center -mt-3 sm:-mt-5">
        {/* Animated AI Agent Orb */}
        <div className="relative flex items-center justify-center">
          <GazyOrbCanvas state={state} audioLevel={audioLevel} />
        </div>

        {/* Title: Gazzy */}
        <h1 className="font-serif text-[21px] sm:text-[24px] font-normal text-white tracking-normal text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] -mt-5 sm:-mt-7">
          Gazzy
        </h1>

        {/* Audio Indicator & Current Voice State */}
        <div className="mt-1.5">
          <AudioEqualizer state={state} audioLevel={audioLevel} />
        </div>

        {error && (
          <p role="alert" className="mt-2 max-w-[340px] text-center text-[13px] font-dm-sans text-[#F2A7A0]">
            {error}
          </p>
        )}

        {/* Reduced Horizontal Transcript Pill */}
        <div className="mt-3 sm:mt-4 w-full flex justify-center">
          <TranscriptPill userText={userText} agentText={agentText} listening={state === "listening"} />
        </div>
      </main>

      {/* 4. Bottom area: Mute, Hold and End during the call; a single Close button once it has ended */}
      <footer className="relative z-10 w-full shrink-0 pt-5 sm:pt-6 pb-6 sm:pb-8 flex flex-col items-center justify-center">
        {callEnded ? (
          <VoiceCallClose onClose={onClose} />
        ) : (
          <VoiceCallControls
            isMuted={isMuted}
            onToggleMute={toggleMute}
            isHeld={isHeld}
            onToggleHold={toggleHold}
            onEnd={requestEndCall}
          />
        )}
      </footer>

      {/* 5. End Call Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A1918] border border-[#3E3832] rounded-2xl p-6 sm:p-8 max-w-sm w-[90%] shadow-2xl flex flex-col items-center text-center">
            <h3 className="text-xl font-serif text-[#F3EFEA] mb-2">End Conversation?</h3>
            <p className="text-[#A49B8E] text-sm mb-6 leading-relaxed">
              Are you sure you want to hang up? Your conversation summary and next steps will be generated automatically.
            </p>
            <div className="flex w-full gap-3">
              <button
                onClick={cancelEndCall}
                className="flex-1 py-2.5 rounded-lg border border-[#3E3832] text-[#E0DCD6] hover:bg-[#2A2928] font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndCall}
                className="flex-1 py-2.5 rounded-lg bg-[#E5484D] hover:bg-[#C93B40] text-white font-medium transition"
              >
                End Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
