"use client";

import React, { useEffect, useCallback, useState } from "react";
import { X } from "lucide-react";
import { GazyOrbCanvas } from "./GazyOrbCanvas";
import { AudioEqualizer } from "./AudioEqualizer";
import { TranscriptPill } from "./TranscriptPill";
import { VoiceCallControls } from "./VoiceCallControls";
import { useVoiceSession } from "./useVoiceSession";

interface GazyVoiceOverlayProps {
  language: string;
  isOpen: boolean;
  onClose: () => void;
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
    error,
  } = useVoiceSession(isOpen, language);

  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const requestEndCall = useCallback(() => {
    setShowEndConfirm(true);
  }, []);

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
      <header className="relative z-10 w-full max-w-[1400px] px-6 sm:px-8 pt-4 pb-0 flex items-center justify-end">
        <button
          onClick={requestEndCall}
          type="button"
          aria-label="Exit voice session"
          className="text-white/40 hover:text-white/90 p-2 rounded-full hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* 3. Main Center Voice Interface */}
      <main className="relative z-10 flex-1 w-full max-w-[1200px] flex flex-col items-center justify-center -mt-3 sm:-mt-5">
        {/* Animated AI Agent Orb */}
        <div className="relative flex items-center justify-center">
          <GazyOrbCanvas state={state} audioLevel={audioLevel} />
        </div>

        {/* Title: Gazzy */}
        <h1 className="font-serif text-[24px] sm:text-[27px] font-normal text-white tracking-normal text-center drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] mt-0.5">
          Gazzy
        </h1>

        {/* Audio Indicator & Current Voice State */}
        <div className="mt-1.5">
          <AudioEqualizer state={state} audioLevel={audioLevel} />
        </div>

        {error && (
          <p role="alert" className="mt-2 max-w-[320px] text-center text-[12px] font-dm-sans text-[#F2A7A0]">
            {error}
          </p>
        )}

        {/* Reduced Horizontal Transcript Pill */}
        <div className="mt-4 sm:mt-5 w-full flex justify-center">
          <TranscriptPill userText={userText} agentText={agentText} listening={state === "listening"} />
        </div>
      </main>

      {/* 4. Bottom Control Area: Reduced 3 Call Buttons (Mute, Hold, End) */}
      <footer className="relative z-10 w-full pb-7 sm:pb-9 flex flex-col items-center justify-center">
        <VoiceCallControls
          isMuted={isMuted}
          onToggleMute={toggleMute}
          isHeld={isHeld}
          onToggleHold={toggleHold}
          onEnd={requestEndCall}
        />
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
