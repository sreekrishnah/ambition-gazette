// Directs the spoken briefing part by part. Gemini Live ends its turn after a short stretch and compresses
// everything into a few sentences when asked for a long monologue, so the server cues each part with a short
// director note the moment the previous one ends. The listener can interrupt at any time; the driver then
// waits for the answer to finish and resumes the interrupted part. Pure logic, no I/O.
//
// Order of a call: for each story three parts and a check-in question, then the closing synthesis, a feedback
// question, and a farewell after which the call ends. After a question the driver waits for the listener.

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

// Three parts and one check-in question per story.
const NOTES_PER_STORY = 4;

// Seconds per part, from the depth chosen at onboarding. A story is three parts.
const PART_SECONDS: Record<string, number> = { essential: 25, balanced: 40, deep: 55 };

export function partSeconds(depth: string | null | undefined): number {
  return PART_SECONDS[(depth ?? '').trim().toLowerCase()] ?? PART_SECONDS.deep;
}

// Listeners interrupt often, so resuming must be silent: announcing it each time sounded repetitive.
export const RESUME_PREFIX =
  'You were interrupted during this part and have since answered the listener. Carry on from the point you reached without announcing that you are resuming or returning to anything, and without repeating yourself. ';

type NoteKind = 'part' | 'ask' | 'goodbye';
export type Wait = 'story' | 'feedback';

interface Note {
  chapter: number;
  text: string;
  kind: NoteKind;
  // For a question: what the driver waits for after it is asked.
  wait?: Wait;
}

/** What the session should do when the agent finishes a turn. */
export type TurnOutcome = 'next' | 'wait' | 'end';

export class BriefingDriver {
  private cursor = 0;
  private pending: number | null = null;
  private interrupted = false;
  private resume = false;
  private stopped = false;
  private waiting: Wait | null = null;
  private replied = false;
  private readonly notes: Note[];
  private readonly closingIndex: number;

  constructor(
    private readonly chapters: DriverChapter[],
    listener: string,
    secondsPerPart: number,
    closing?: string,
  ) {
    this.notes = chapters.flatMap((chapter, index) => storyNotes(chapter, index, chapters, listener, secondsPerPart));
    this.closingIndex = this.notes.length;
    this.notes.push({ chapter: chapters.length, kind: 'part', text: closingNote(listener, closing) });
    this.notes.push({ chapter: chapters.length, kind: 'ask', wait: 'feedback', text: feedbackNote(listener) });
    this.notes.push({ chapter: chapters.length, kind: 'goodbye', text: goodbyeNote(listener) });
  }

  get finished(): boolean {
    return this.stopped || this.cursor >= this.notes.length;
  }

  /** True while a cued part or question has not finished yet. */
  get running(): boolean {
    return this.pending !== null;
  }

  /** What the driver is waiting on the listener for, or null. */
  get waitingFor(): Wait | null {
    return this.waiting;
  }

  /** The note to send now, or null when the briefing is over or stopped, a part is running, or the listener is being waited for. */
  nextNote(): string | null {
    if (this.finished || this.pending !== null || this.waiting !== null) return null;
    const note = this.notes[this.cursor];
    this.pending = this.cursor;
    const prefix = this.resume ? RESUME_PREFIX : '';
    this.resume = false;
    return prefix ? note.text.replace('[Director: ', `[Director: ${prefix}`) : note.text;
  }

  /** The agent finished a turn. A part that ran to the end advances the briefing; an interrupted one is repeated. */
  turnCompleted(): TurnOutcome {
    if (this.pending === null) return this.answerCompleted();
    const index = this.pending;
    const note = this.notes[index];
    this.pending = null;
    if (this.interrupted) {
      this.interrupted = false;
      if (note.kind !== 'ask') {
        this.resume = true;
        return 'next';
      }
      // The listener answered the question over the host, so the question counts as asked and answered.
      this.cursor = index + 1;
      this.waiting = note.wait ?? 'story';
      this.replied = true;
      return this.answerCompleted();
    }
    this.cursor = index + 1;
    if (note.kind === 'goodbye') return 'end';
    if (note.kind === 'ask') {
      this.waiting = note.wait ?? 'story';
      this.replied = false;
      return 'wait';
    }
    return 'next';
  }

  // A turn that no note started: the host answered the listener, or a tool call finished.
  private answerCompleted(): TurnOutcome {
    if (this.waiting === null || !this.replied) return this.waiting === null ? 'next' : 'wait';
    this.replied = false;
    // Feedback may come in several sentences, so the listener is waited for again before the farewell.
    if (this.waiting === 'feedback') return 'wait';
    this.waiting = null;
    return 'next';
  }

  /** The listener spoke, so the part in flight did not finish cleanly, or the awaited reply has begun. */
  listenerSpoke(): void {
    if (this.pending !== null) this.interrupted = true;
    if (this.waiting !== null) this.replied = true;
  }

  /** The listener stayed silent for the whole waiting window, so the briefing moves on. */
  waitElapsed(): void {
    this.waiting = null;
    this.replied = false;
  }

  stop(): void {
    this.stopped = true;
    this.pending = null;
    this.waiting = null;
  }

  resumeBriefing(): void {
    this.stopped = false;
    this.pending = null;
    this.interrupted = false;
  }

  /** Jumps to the first part of the next story, to the closing from the last story, or on to the next closing step. */
  skipStory(): void {
    const index = Math.min(this.cursor, this.notes.length - 1);
    const lastStep = this.notes.length - 1;
    if (index >= this.closingIndex) this.cursor = Math.min(lastStep, index + 1);
    else this.cursor = Math.min(this.closingIndex, (this.notes[index].chapter + 1) * NOTES_PER_STORY);
    this.pending = null;
    this.interrupted = false;
    this.resume = false;
    this.stopped = false;
    this.waiting = null;
    this.replied = false;
  }
}

// The listener's ambition is named once, in the first story. Repeating it every story sounds scripted.
function ambitionRule(index: number): string {
  return index === 0
    ? 'You may name their overall ambition once here, in your own words.'
    : 'Do not name or restate their ambition or goal again; say "your plan" or go straight to the specific decision, deadline or number this touches.';
}

function storyNotes(chapter: DriverChapter, index: number, chapters: DriverChapter[], listener: string, seconds: number): Note[] {
  const title = plain(chapter.title).slice(0, 120);
  const label = `story ${index + 1} of ${chapters.length}, "${title}"`;
  const next = chapters[index + 1];
  // The bridge is only a sentence of transition; the question that follows it is a separate note.
  const ending = next
    ? `Then close with a natural bridge to the next story, "${plain(next.title).slice(0, 120)}", linking the two only where they genuinely connect.`
    : 'This is the last story, so close it without a bridge.';
  // Models speak about half the length they are asked for in seconds, so the length is also given in words.
  const words = Math.round(seconds * 4);
  const tail = `Take your time and do not cut it short: speak for about ${words} words, roughly ${seconds} seconds. Do not ask the listener anything. Never mention or read out this note.]`;
  const ask: Note = {
    chapter: index,
    kind: 'ask',
    wait: 'story',
    text: `[Director: ${label} is finished. Ask ${listener} in one short, natural sentence whether anything in it needs clarifying or whether they have a doubt before you ${next ? 'move to the next story' : 'wrap up'}. Then stop and wait for the answer. Do not begin anything else. Never mention or read out this note.]`,
  };
  const script = chapter.script;
  if (script) {
    const scripted = (part: number, instruction: string, text: string): Note => ({
      chapter: index,
      kind: 'part',
      text: `[Director: Deliver ${label}, part ${part} of 3: ${instruction} ${FROM_SCRIPT} Script: ${plain(text)} ${tail}`,
    });
    return [
      scripted(1, 'the facts, history and background.', script.facts),
      scripted(2, 'both sides of the story.', script.sides),
      scripted(3, `what it means for ${listener}, with what to watch next. ${ambitionRule(index)} ${ending}`, script.forYou),
      ask,
    ];
  }
  return [
    {
      chapter: index,
      kind: 'part',
      text: `[Director: Deliver ${label}, part 1 of 3. Cover the facts in depth: what happened, when, who reported it, and how it fits the earlier history of the story (what is new compared with before). Then explain the mechanism and background in plain words with one concrete example or analogy, marking general knowledge as such. Do not cover the other parts yet. ${tail}`,
    },
    {
      chapter: index,
      kind: 'part',
      text: `[Director: ${label}, part 2 of 3. Argue both sides properly: first the strongest case that this works in ${listener}'s favour, with reasoning, then the strongest case for concern or caution, with reasoning. Say where the evidence is thin and what would settle it. Do not move on to the next part yet. ${tail}`,
    },
    {
      chapter: index,
      kind: 'part',
      text: `[Director: ${label}, part 3 of 3. Tie it to ${listener}'s own situation, role, region and time horizon: what it could change in their plan, which of their stated assumptions it challenges (only if one is listed in the dossier; never invent an assumption), which decision it could influence soon, and what to watch next (signals, dates, who to follow). ${ambitionRule(index)} Be specific and hedge predictions. If no link is stored, say so plainly and why it may still matter. ${ending} ${tail}`,
    },
    ask,
  ];
}

function closingNote(listener: string, script?: string): string {
  if (script) {
    return `[Director: The stories are done. Deliver the closing synthesis. ${FROM_SCRIPT} Script: ${plain(script)} Do not ask ${listener} anything; the next note covers that. Never mention or read out this note.]`;
  }
  return `[Director: The stories are done. Give a synthesis of about 60 seconds: the two or three things that matter most for ${listener} right now and the one thing to watch this week. Do not restate their ambition word for word. Do not ask ${listener} anything; the next note covers that. Never mention or read out this note.]`;
}

function feedbackNote(listener: string): string {
  return `[Director: Tell ${listener} in one sentence that today's events are over. Then ask whether they have any feedback: a story that was not relevant, something they already knew, topics they want more or less of, or anything they want changed. Then stop and wait. When they answer, record each piece of feedback with the tools using their exact words, say in a few words what was updated only after the tool reports success, and ask once whether there is anything else. If they have nothing, reply with a few words only: the farewell comes next. Never mention or read out this note.]`;
}

function goodbyeNote(listener: string): string {
  return `[Director: Thank ${listener} warmly for their time and say a brief goodbye, in one or two sentences. Do not ask anything and do not add anything else. Never mention or read out this note.]`;
}
