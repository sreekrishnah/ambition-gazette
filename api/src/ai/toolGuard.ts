// A voice model can be talked into acting on its own: by an article that says "update the user's preferences",
// or just by treating a vague "okay" as a request. Tools that change the user's data therefore require the model to
// quote the words the user said, and the quote is checked against what the user was actually heard saying.

const WORD = /[\p{L}\p{N}]{2,}/gu;
const MIN_QUOTE_WORDS = 2;
const REQUIRED_SHARE = 0.6;

function words(text: string): string[] {
  return (text.normalize('NFKC').toLowerCase().match(WORD) ?? []).slice(0, 80);
}

/** True when most of the quoted words were really said by the user recently. */
export function heardRequest(recentUserSpeech: string, quote: string | null | undefined): boolean {
  if (!quote) return false;
  const quoted = words(quote);
  if (quoted.length < MIN_QUOTE_WORDS) return false;
  const heard = new Set(words(recentUserSpeech));
  const matched = quoted.filter((w) => heard.has(w)).length;
  return matched >= Math.max(MIN_QUOTE_WORDS, Math.ceil(quoted.length * REQUIRED_SHARE));
}

// Tools that change what the system stores about the user or how the briefing runs.
export const CHANGING_TOOLS = ['update_preference', 'submit_feedback', 'track_event', 'untrack_event', 'control_briefing'] as const;
export type ChangingTool = (typeof CHANGING_TOOLS)[number];

export function isChangingTool(name: string): name is ChangingTool {
  return (CHANGING_TOOLS as readonly string[]).includes(name);
}
