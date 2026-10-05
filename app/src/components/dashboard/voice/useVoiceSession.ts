"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";
import { createLiveSession, LiveSession, VoiceState } from "./liveSession";

export type { VoiceState } from "./liveSession";

interface UseVoiceSessionReturn {
  state: VoiceState;
  audioLevel: number;
  userText: string;
  agentText: string;
  error: string | null;
  stopSession: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  isHeld: boolean;
  toggleHold: () => void;
}

const MIN_LEVEL = 0.1;

export function useVoiceSession(isOpen: boolean, language: string): UseVoiceSessionReturn {
  // null until the session reports a state; the visible state is derived from isOpen meanwhile.
  const [liveState, setState] = useState<VoiceState | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(MIN_LEVEL);
  // Captions come from Gemini Live's own transcription of the audio, one line per speaker.
  const [userText, setUserText] = useState<string>("");
  const [agentText, setAgentText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isHeld, setIsHeld] = useState<boolean>(false);

  const sessionRef = useRef<LiveSession | null>(null);
  const mutedRef = useRef(false);
  const heldRef = useRef(false);
  // Full transcript is kept for the session only and is not rendered.
  const transcriptRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!isOpen) return;

    // Per-run flag: React StrictMode runs this effect twice in dev, and the first run
    // is cleaned up before its token request resolves, so it never opens a socket.
    let cancelled = false;

    api
      .getWsToken()
      .then(({ token }) => {
        if (cancelled) return;
        const session = createLiveSession(token, language, {
          onState: setState,
          onLevel: (level) => setAudioLevel(Math.max(MIN_LEVEL, level)),
          onTranscript: (role, turn, text) => {
            transcriptRef.current.set(`${role}-${turn}`, text);
            if (role === "user") {
              // A new user utterance starts a new exchange, so the previous reply is cleared.
              setUserText(text);
              setAgentText("");
            } else {
              setAgentText(text);
            }
          },
          onError: (message) => setError((prev) => prev ?? message),
        });
        sessionRef.current = session;
        if (mutedRef.current) session.setMuted(true);
        if (heldRef.current) session.setHeld(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Voice session could not be started");
        setState("error");
      });

    return () => {
      cancelled = true;
      sessionRef.current?.end();
      sessionRef.current = null;
      // Reset for the next call so a reopened overlay starts clean.
      mutedRef.current = false;
      heldRef.current = false;
      transcriptRef.current = new Map();
      setIsMuted(false);
      setIsHeld(false);
      setError(null);
      setUserText("");
      setAgentText("");
      setAudioLevel(MIN_LEVEL);
      setState(null);
    };
  }, [isOpen, language]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setIsMuted(next);
    sessionRef.current?.setMuted(next);
  }, []);

  const toggleHold = useCallback(() => {
    const next = !heldRef.current;
    heldRef.current = next;
    setIsHeld(next);
    sessionRef.current?.setHeld(next);
  }, []);

  const stopSession = useCallback(() => {
    sessionRef.current?.end();
    sessionRef.current = null;
    setState("stopped");
  }, []);

  const state: VoiceState = liveState ?? (isOpen ? "connecting" : "idle");

  return {
    state,
    audioLevel,
    userText,
    agentText,
    error,
    stopSession,
    isMuted,
    toggleMute,
    isHeld,
    toggleHold,
  };
}
