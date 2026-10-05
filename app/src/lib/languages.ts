// Languages offered for the voice agent. Keep in step with VOICE_LANGUAGES in api/src/ai/liveSpeech.ts,
// which rejects any value not listed there.
export const VOICE_LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Kannada",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Spanish",
  "French",
  "German",
  "Mandarin",
] as const;

export const DEFAULT_VOICE_LANGUAGE = "English";

export function isVoiceLanguage(value: string | null | undefined): value is (typeof VOICE_LANGUAGES)[number] {
  return typeof value === "string" && (VOICE_LANGUAGES as readonly string[]).includes(value);
}
