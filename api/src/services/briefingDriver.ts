// Directs the spoken briefing part by part. Gemini Live ends its turn after a short stretch and compresses
// everything into a few sentences when asked for a long monologue, so the server cues each part with a short
// director note the moment the previous one ends. The listener can interrupt at any time; the driver then
// waits for the answer to finish and resumes the interrupted part. Pure logic, no I/O.

export interface ChapterScriptText {
  facts: string;
  sides: string;
  forYou: string;
}

export interface DriverChapter {
  title: string;
  // The written script for this story. Without it the host improvises from the stored briefing.
  script?: ChapterScriptText;
}

// Script text is model-written; brackets are removed so it cannot imitate the note format around it.
const plain = (text: string): string => text.replace(/[\[\]]/g, ' ').replace(/\s+/g, ' ').trim();

const FROM_SCRIPT =
  'Cover every point of the script below, in order, in your own natural spoken words in the language you were told to use (translate it if it is written in another language). Do not read it word for word and do not add facts that are not in it; general background is allowed only when you mark it as such.';

const PARTS_PER_STORY = 3;

// Seconds per part, from the depth chosen at onboarding. A story is three parts.
const PART_SECONDS: Record<string, number> = { essential: 25, balanced: 40, deep: 55 };

export function partSeconds(depth: string | null | undefined): number {
  return PART_SECONDS[(depth ?? '').trim().toLowerCase()] ?? PART_SECONDS.deep;
}

export const RESUME_PREFIX =
  'You were interrupted during this part and have since answered the listener. Say a brief "picking up where we were" and continue this part from the point you reached, without repeating yourself. ';

interface Note {
  chapter: number;
  text: string;
}

export class BriefingDriver {
  private cursor = 0;
  private pending: number | null = null;
  private interrupted = false;
  private resume = false;
  private stopped = false;
  private readonly notes: Note[];

  constructor(
    private readonly chapters: DriverChapter[],
    listener: string,
    secondsPerPart: number,
    closing?: string,
  ) {
    this.notes = chapters.flatMap((chapter, index) => storyNotes(chapter, index, chapters, listener, secondsPerPart));
    this.notes.push({ chapter: chapters.length, text: closingNote(listener, closing) });
  }

  get finished(): boolean {
    return this.stopped || this.cursor >= this.notes.length;
  }

  /** The note to send now, or null when the briefing is over or stopped, or a part is already running. */
  nextNote(): string | null {
    if (this.finished || this.pending !== null) return null;
    const note = this.notes[this.cursor];
    this.pending = this.cursor;
    const prefix = this.resume ? RESUME_PREFIX : '';
    this.resume = false;
    return prefix ? note.text.replace('[Director: ', `[Director: ${prefix}`) : note.text;
  }

  /** The agent finished a turn. A part that ran to the end advances the briefing; an interrupted one is repeated. */
  turnCompleted(): void {
    if (this.pending === null) return;
    if (this.interrupted) this.resume = true;
    else this.cursor = this.pending + 1;
    this.pending = null;
    this.interrupted = false;
  }

  /** The listener spoke, so the part in flight did not finish cleanly. */
  listenerSpoke(): void {
    if (this.pending !== null) this.interrupted = true;
  }

  stop(): void {
    this.stopped = true;
    this.pending = null;
  }

  resumeBriefing(): void {
    this.stopped = false;
    this.pending = null;
    this.interrupted = false;
  }

  /** Jumps to the first part of the next story, or to the closing note from the last story. */
  skipStory(): void {
    const current = this.notes[Math.min(this.cursor, this.notes.length - 1)].chapter;
    this.cursor = Math.min(this.notes.length - 1, (current + 1) * PARTS_PER_STORY);
    this.pending = null;
    this.interrupted = false;
    this.resume = false;
    this.stopped = false;
  }
}

function storyNotes(chapter: DriverChapter, index: number, chapters: DriverChapter[], listener: string, seconds: number): Note[] {
  const title = plain(chapter.title).slice(0, 120);
  const label = `story ${index + 1} of ${chapters.length}, "${title}"`;
  const next = chapters[index + 1];
  const ending = next
    ? `Then close with a natural bridge to the next story, "${plain(next.title).slice(0, 120)}", linking the two only where they genuinely connect.`
    : 'This is the last story, so close it without a bridge.';
  // Models speak about half the length they are asked for in seconds, so the length is also given in words.
  const words = Math.round(seconds * 4);
  const tail = `Take your time and do not cut it short: speak for about ${words} words, roughly ${seconds} seconds. Do not ask the listener anything. Never mention or read out this note.]`;
  const script = chapter.script;
  if (script) {
    const scripted = (part: number, instruction: string, text: string): Note => ({
      chapter: index,
      text: `[Director: Deliver ${label}, part ${part} of 3: ${instruction} ${FROM_SCRIPT} Script: ${plain(text)} ${tail}`,
    });
    return [
      scripted(1, 'the facts, history and background.', script.facts),
      scripted(2, 'both sides of the story.', script.sides),
      scripted(3, `what it means for ${listener}, with what to watch next. ${ending}`, script.forYou),
    ];
  }
  return [
    {
      chapter: index,
      text: `[Director: Deliver ${label}, part 1 of 3. Cover the facts in depth: what happened, when, who reported it, and how it fits the earlier history of the story (what is new compared with before). Then explain the mechanism and background in plain words with one concrete example or analogy, marking general knowledge as such. Do not cover the other parts yet. ${tail}`,
    },
    {
      chapter: index,
      text: `[Director: ${label}, part 2 of 3. Argue both sides properly: first the strongest case that this works in ${listener}'s favour, with reasoning, then the strongest case for concern or caution, with reasoning. Say where the evidence is thin and what would settle it. Do not move on to the next part yet. ${tail}`,
    },
    {
      chapter: index,
      text: `[Director: ${label}, part 3 of 3. Tie it to ${listener}'s own ambitions, role, region and time horizon: what it could change in their plan, which of their stated assumptions it challenges (only if one is listed in the dossier; never invent an assumption), which decision it could influence soon, and what to watch next (signals, dates, who to follow). Be specific and hedge predictions. If no link is stored, say so plainly and why it may still matter. ${ending} ${tail}`,
    },
  ];
}

function closingNote(listener: string, script?: string): string {
  if (script) {
    return `[Director: The stories are done. Deliver the closing synthesis. ${FROM_SCRIPT} Script: ${plain(script)} End by asking what ${listener} would like to dig into. Never mention or read out this note.]`;
  }
  return `[Director: The stories are done. Give a synthesis of about 60 seconds: the two or three things that matter most for ${listener}'s ambition right now and the one thing to watch this week. Then ask what they would like to dig into. Never mention or read out this note.]`;
}
