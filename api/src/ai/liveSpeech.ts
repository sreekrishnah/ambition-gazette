// Hints for Gemini Live's speech recognition. Without them it auto-detects the language and short or
// accented phrases were transcribed as Portuguese or Spanish ("peguei esse", "¿Qué?").

// The languages a user can pick for the voice agent, with the speech recognition code for each.
const LANGUAGES = [
  ['English', 'en-IN'],
  ['Hindi', 'hi-IN'],
  ['Tamil', 'ta-IN'],
  ['Telugu', 'te-IN'],
  ['Malayalam', 'ml-IN'],
  ['Kannada', 'kn-IN'],
  ['Marathi', 'mr-IN'],
  ['Bengali', 'bn-IN'],
  ['Gujarati', 'gu-IN'],
  ['Spanish', 'es-ES'],
  ['French', 'fr-FR'],
  ['German', 'de-DE'],
  ['Mandarin', 'zh-CN'],
] as const;

export const VOICE_LANGUAGES = LANGUAGES.map(([name]) => name) as unknown as readonly [string, ...string[]];

const LANGUAGE_CODES: Record<string, string> = Object.fromEntries(LANGUAGES.map(([name, code]) => [name.toLowerCase(), code]));

const MAX_VOCABULARY = 20;
const MAX_PHRASE_LENGTH = 60;

export interface TranscriptionHints {
  languageCodes: string[];
  customVocabulary: string[];
}

interface HintSource {
  language: string;
  name: string | null;
  ambitions: Array<{ title: string }>;
  interests: Array<{ topic: string | null }>;
}

export function transcriptionHints(source: HintSource): TranscriptionHints {
  const code = LANGUAGE_CODES[source.language.trim().toLowerCase()];
  // People mix English into other languages, so English stays in the hint list.
  const languageCodes = code && code !== 'en-IN' ? [code, 'en-IN'] : ['en-IN'];

  const firstName = source.name?.trim().split(/\s+/)[0];
  const phrases = [
    'Ambition Gazette',
    'Gazzy',
    ...(firstName ? [firstName] : []),
    ...source.ambitions.map((a) => a.title),
    ...source.interests.map((i) => i.topic ?? ''),
  ];
  const customVocabulary = [...new Set(phrases.map((p) => p.trim()).filter((p) => p.length > 1 && p.length <= MAX_PHRASE_LENGTH))].slice(0, MAX_VOCABULARY);

  return { languageCodes, customVocabulary };
}
