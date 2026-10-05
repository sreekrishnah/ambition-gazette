"use client";

import React, { useState } from "react";
import { GazyVoiceOverlay } from "./voice/GazyVoiceOverlay";
import { LanguagePickerDialog } from "./voice/LanguagePickerDialog";

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Opening the agent first asks for a language; the call starts only after one is chosen.
export function AgentModal({ isOpen, onClose }: AgentModalProps) {
  const [language, setLanguage] = useState<string | null>(null);

  const handleClose = () => {
    setLanguage(null);
    onClose();
  };

  return (
    <>
      {isOpen && language === null && <LanguagePickerDialog onSelect={setLanguage} onCancel={handleClose} />}
      <GazyVoiceOverlay isOpen={isOpen && language !== null} language={language ?? ""} onClose={handleClose} />
    </>
  );
}
