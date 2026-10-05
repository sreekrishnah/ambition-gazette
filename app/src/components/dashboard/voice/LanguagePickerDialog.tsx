"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Mic, X } from "lucide-react";
import api from "@/lib/api";
import type { VoiceUsage } from "@/types/api";
import { DEFAULT_VOICE_LANGUAGE, VOICE_LANGUAGES, isVoiceLanguage } from "@/lib/languages";

interface LanguagePickerDialogProps {
  onSelect: (language: string) => void;
  onCancel: () => void;
}

export function LanguagePickerDialog({ onSelect, onCancel }: LanguagePickerDialogProps) {
  const [selected, setSelected] = useState<string>(DEFAULT_VOICE_LANGUAGE);
  const [touched, setTouched] = useState(false);
  const [usage, setUsage] = useState<VoiceUsage | null>(null);
  const touchedRef = useRef(false);
  const startRef = useRef<HTMLButtonElement>(null);

  // The preselected language is the one chosen at onboarding (or last used on a call).
  useEffect(() => {
    let active = true;
    api
      .getAmbitions()
      .then((res) => {
        const saved = res.profile?.bidiLanguage;
        if (active && !touchedRef.current && isVoiceLanguage(saved)) setSelected(saved);
      })
      .catch(() => undefined); // The picker still works with English preselected if the profile cannot be read.
    return () => {
      active = false;
    };
  }, []);

  // How many of today's voice sessions are left, shown before a session is counted.
  useEffect(() => {
    let active = true;
    api
      .getVoiceUsage()
      .then((res) => {
        if (active) setUsage(res.usage);
      })
      .catch(() => undefined); // The server still enforces the limit if this cannot be read.
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    startRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const choose = (language: string) => {
    touchedRef.current = true;
    setTouched(true);
    setSelected(language);
  };

  const sessionsLeft = usage ? Math.max(0, usage.sessionsLimit - usage.sessionsUsed) : null;
  const outOfSessions = sessionsLeft === 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#1A1918]/55 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-language-title"
        className="w-full max-w-[420px] bg-white rounded-2xl border border-[#ECE7DF] shadow-xl p-5 sm:p-6 font-dm-sans"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="voice-language-title" className="font-serif text-[20px] sm:text-[22px] text-[#1A1918] leading-tight">
              Choose your language
            </h2>
            <p className="mt-1 text-[12.5px] text-[#68645E] leading-relaxed">
              The agent will listen and speak in this language. It is saved as your default.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="p-1 -mr-1 rounded text-[#7A746C] hover:text-[#1A1918] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div role="radiogroup" aria-label="Voice language" className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {VOICE_LANGUAGES.map((language) => {
            const active = selected === language;
            return (
              <button
                key={language}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(language)}
                className={`flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border text-[12.5px] cursor-pointer transition-colors ${
                  active
                    ? "border-[#701A23] bg-[#FCF4F3] text-[#701A23] font-semibold"
                    : "border-[#ECE7DF] bg-white text-[#2C2926] hover:border-[#D9C9C6]"
                }`}
              >
                <span>{language}</span>
                {active && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[11px] text-[#948E85] min-h-[1.2em]">
          {touched ? "Your choice becomes the default for next time." : "Preselected from your onboarding choice."}
        </p>
        {sessionsLeft !== null && (
          <p role="status" className={`mt-1 text-[11px] ${outOfSessions ? "text-[#B42318]" : "text-[#68645E]"}`}>
            {outOfSessions
              ? "You have used all of today's voice sessions. They reset at midnight IST."
              : `${sessionsLeft} of ${usage?.sessionsLimit} voice sessions left today.`}
          </p>
        )}

        <button
          ref={startRef}
          type="button"
          onClick={() => onSelect(selected)}
          disabled={outOfSessions}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-[#701A23] hover:bg-[#58141B] text-white text-[13px] font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mic className="w-4 h-4" />
          Start talking in {selected}
        </button>
      </div>
    </div>
  );
}
