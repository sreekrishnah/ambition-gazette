import { FunctionCall, LiveServerMessage, Modality, Session } from '@google/genai';
import { summarizeSession } from '../ai/tasks';
import { buildLiveInstruction } from '../ai/liveInstruction';
import { TranscriptionHints, transcriptionHints } from '../ai/liveSpeech';
import { AppError } from '../lib/errors';
import { MODELS, ai } from '../lib/gemini';
import { createLogger } from '../lib/logger';
import { supabase, unwrap, unwrapVoid } from '../lib/supabase';
import { FUNCTION_DECLARATIONS, SessionRefs, executeTool, loadSessionContext } from './bidi';
import { BriefingDriver, partSeconds } from './briefingDriver';
import { getLatestScript } from './script';
import { addVoiceTokens } from './voiceUsage';
import { env } from '../config/env';

const log = createLogger('live');

export const INPUT_SAMPLE_RATE = 16_000;
export const OUTPUT_SAMPLE_RATE = 24_000;

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_SESSION_MS = 40 * 60 * 1000;
const PROCESSING_DELAY_MS = 700;
const LEVEL_LOG_INTERVAL_MS = 5000;
// Pause after an agent turn before the next part is cued, long enough for the listener to start speaking.
const NEXT_PART_DELAY_MS = 900;

export type LiveState = 'connecting' | 'listening' | 'user_speaking' | 'processing' | 'agent_speaking' | 'held' | 'ended' | 'error';
export type Role = 'user' | 'agent';

export interface TranscriptEntry {
  role: Role;
  text: string;
}

// What the session reports to its transport (socket.io). Keeps this class free of transport types.
export interface LiveEmitter {
  state(state: LiveState): void;
  audio(turn: number, data: Buffer): void;
  interrupted(turn: number): void;
  transcript(role: Role, text: string, turn: number, final: boolean): void;
  tool(name: string, status: 'started' | 'done' | 'error'): void;
  error(code: string, message: string): void;
  ended(reason: string): void;
}

const active = new Map<string, LiveSession>();

export async function endSessionFor(userId: string, reason: string): Promise<void> {
  await active.get(userId)?.end(reason);
}

export async function endAllSessions(reason: string): Promise<void> {
  await Promise.all([...active.values()].map((s) => s.end(reason)));
}

export class LiveSession {
  private session: Session | null = null;
  private readonly refs = new SessionRefs();
  private state: LiveState = 'connecting';
  private turn = 1;
  private muted = false;
  private held = false;
  private closing = false;
  private dbSessionId: string | null = null;
  private instruction = '';
  private hints: TranscriptionHints = { languageCodes: ['en-IN'], customVocabulary: [] };
  private readonly transcript: TranscriptEntry[] = [];
  private openRole: Role | null = null;
  private lastActivity = Date.now();
  private readonly startedAt = Date.now();
  private processingTimer: NodeJS.Timeout | null = null;
  private watchdog: NodeJS.Timeout | null = null;
  private driver: BriefingDriver | null = null;
  private continueTimer: NodeJS.Timeout | null = null;
  private toolsInFlight = 0;
  private tokensUsed = 0;
  private inputFrames = 0;
  private inputSumSquares = 0;
  private inputPeak = 0;
  private lastLevelLog = Date.now();

  constructor(
    private readonly userId: string,
    private readonly out: LiveEmitter,
  ) {}

  get id(): string | null {
    return this.dbSessionId;
  }

  async start(language?: string): Promise<string> {
    // One live session per user: starting again replaces the old one instead of leaking it.
    await endSessionFor(this.userId, 'replaced');
    active.set(this.userId, this);
    this.setState('connecting');

    try {
      const ctx = await loadSessionContext(this.userId);
      // The language picked at call start wins for this call and becomes the saved default.
      if (language && language !== ctx.language) {
        ctx.language = language;
        await this.saveDefaultLanguage(language);
      }
      this.instruction = buildLiveInstruction(ctx, this.refs);
      this.hints = transcriptionHints(ctx);
      this.refs.heard = () => this.recentUserSpeech();
      await this.setUpDriver(ctx);
      // The session row and the Gemini connection do not depend on each other, so they open together.
      const [inserted] = await Promise.all([
        supabase.from('bidi_sessions').insert({ user_id: this.userId, language: ctx.language, status: 'active' }).select('id').single<{ id: string }>(),
        this.connect(),
      ]);
      const row = unwrap('bidi_sessions.insert', inserted);
      this.dbSessionId = row.id;
      this.watchdog = setInterval(() => this.checkLimits(), 15_000);
      log.info('session started', { userId: this.userId, sessionId: row.id, model: MODELS.live });
      return row.id;
    } catch (err) {
      active.delete(this.userId);
      await this.cleanup();
      log.error('session failed to start', { userId: this.userId, err });
      throw err instanceof AppError ? err : new AppError('MODEL_UNAVAILABLE', 502, 'Voice session could not be started.', String(err));
    }
  }

  private async saveDefaultLanguage(language: string): Promise<void> {
    try {
      unwrapVoid(
        'profile.language.update',
        await supabase.from('user_intelligence_profiles').update({ prefered_language: language }).eq('user_id', this.userId),
      );
    } catch (err) {
      // The call still proceeds in the chosen language; only the saved default is missed.
      log.warn('default language was not saved', { userId: this.userId, err });
    }
  }

  private async connect(): Promise<void> {
    // connect() resolves once the websocket is open and setup is complete, and rejects otherwise.
    this.session = await ai.live.connect({
      model: MODELS.live,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: { parts: [{ text: this.instruction }] },
        tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
        inputAudioTranscription: { languageCodes: this.hints.languageCodes, customVocabulary: this.hints.customVocabulary },
        outputAudioTranscription: {},
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } } },
        // Compression lets a long spoken briefing run past the default audio session limit of about 15 minutes.
        contextWindowCompression: { slidingWindow: {} },
        // Turn-taking and resumption are left at Gemini's defaults on purpose. Measured on
        // gemini-3.8-live: defaults answer in about 0.5 s and hear whole sentences, barge-in stops the agent
        // in about 0.4 s; custom sensitivities either cut the user off at a pause or added delay.
      },
      callbacks: {
        onmessage: (message) => {
          this.handleMessage(message).catch((err) => log.error('message handling failed', { sessionId: this.dbSessionId, err }));
        },
        onerror: (event) => {
          log.error('live socket error', { sessionId: this.dbSessionId, message: event.message });
        },
        onclose: (event) => this.handleClose(event.code, event.reason),
      },
    });
    // The model speaks first: a bracketed note is not user speech, so it is not transcribed or stored.
    const opening = this.driver
      ? '[The session has just opened. Greet the listener in one or two sentences, say what is coming, then stop and wait for the producer\'s note. Do not begin the first story yet.]'
      : '[The session has just opened. Greet the listener as instructed.]';
    this.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: opening }] }], turnComplete: true });
    this.setState('listening');
  }

  // -----------------------------------------------------------------
  // Inbound from the client
  // -----------------------------------------------------------------
  sendAudio(data: Buffer): void {
    if (this.closing || !this.session || this.muted || this.held) return;
    this.lastActivity = Date.now();
    this.trackInputLevel(data);
    this.session.sendRealtimeInput({ audio: { data: data.toString('base64'), mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` } });
  }

  // Evidence for "it does not hear me": a near-silent or clipping microphone shows up here.
  private trackInputLevel(data: Buffer): void {
    const samples = Math.floor(data.length / 2);
    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < samples; i += 4) {
      const value = data.readInt16LE(i * 2);
      sumSquares += value * value;
      peak = Math.max(peak, Math.abs(value));
    }
    this.inputFrames += 1;
    this.inputSumSquares += sumSquares / Math.max(1, Math.ceil(samples / 4));
    this.inputPeak = Math.max(this.inputPeak, peak);
    const now = Date.now();
    if (now - this.lastLevelLog >= LEVEL_LOG_INTERVAL_MS) {
      log.debug('mic input', {
        sessionId: this.dbSessionId,
        frames: this.inputFrames,
        rms: Math.round(Math.sqrt(this.inputSumSquares / Math.max(1, this.inputFrames))),
        peak: this.inputPeak,
      });
      this.lastLevelLog = now;
      this.inputFrames = 0;
      this.inputSumSquares = 0;
      this.inputPeak = 0;
    }
  }

  setMuted(muted: boolean): void {
    if (this.closing || this.muted === muted) return;
    this.muted = muted;
    // Telling Gemini the mic stream ended flushes any pending speech so it does not wait on silence.
    if (muted) this.session?.sendRealtimeInput({ audioStreamEnd: true });
    log.info('mute changed', { sessionId: this.dbSessionId, muted });
  }

  setHeld(held: boolean): void {
    if (this.closing || this.held === held) return;
    this.held = held;
    if (held) {
      this.session?.sendRealtimeInput({ audioStreamEnd: true });
      this.setState('held');
    } else {
      this.setState('listening');
    }
    log.info('hold changed', { sessionId: this.dbSessionId, held });
  }

  // -----------------------------------------------------------------
  // Inbound from Gemini
  // -----------------------------------------------------------------
  private async handleMessage(message: LiveServerMessage): Promise<void> {
    // Gemini reports usage once per turn: the whole context so far plus that turn's audio. The sum across turns is
    // what a session costs, and it is capped so a runaway conversation cannot spend without limit.
    if (message.usageMetadata?.totalTokenCount) this.addTokens(message.usageMetadata.totalTokenCount);
    if (message.goAway) log.warn('live goAway received', { sessionId: this.dbSessionId, timeLeft: message.goAway.timeLeft });

    if (message.toolCall?.functionCalls) await this.runTools(message.toolCall.functionCalls);

    const content = message.serverContent;
    if (!content) return;

    if (content.interrupted) {
      this.listenerSpoke();
      // The user started speaking over the agent: stop playback now and drop any audio still in flight.
      this.turn += 1;
      this.finalizeOpen();
      this.out.interrupted(this.turn);
      this.setState('user_speaking');
    }

    if (content.inputTranscription?.text) {
      this.lastActivity = Date.now();
      this.listenerSpoke();
      this.appendTranscript('user', content.inputTranscription.text);
      if (this.state === 'listening' || this.state === 'processing') this.setState('user_speaking');
      this.scheduleProcessing();
    }

    if (content.outputTranscription?.text) this.appendTranscript('agent', content.outputTranscription.text);

    for (const part of content.modelTurn?.parts ?? []) {
      const inline = part.inlineData;
      if (inline?.data && inline.mimeType?.startsWith('audio/')) {
        if (this.processingTimer) clearTimeout(this.processingTimer);
        if (this.state !== 'agent_speaking' && !this.held) this.setState('agent_speaking');
        this.out.audio(this.turn, Buffer.from(inline.data, 'base64'));
      }
    }

    if (content.turnComplete) {
      this.finalizeOpen();
      this.turn += 1;
      if (!this.held) this.setState('listening');
      this.driver?.turnCompleted();
      this.scheduleNextPart();
    }
  }

  private async runTools(calls: FunctionCall[]): Promise<void> {
    this.setState('processing');
    this.toolsInFlight += 1;
    const responses = [];
    for (const call of calls) {
      const name = call.name ?? 'unknown';
      this.out.tool(name, 'started');
      const startedAt = Date.now();
      try {
        const result = await executeTool(this.userId, this.refs, name, call.args);
        this.out.tool(name, 'done');
        log.info('tool done', { sessionId: this.dbSessionId, name, durationMs: Date.now() - startedAt });
        responses.push({ id: call.id, name, response: { output: result } });
      } catch (err) {
        const message = err instanceof AppError ? err.safeMessage : 'The action failed.';
        log.error('tool failed', { sessionId: this.dbSessionId, name, err });
        this.out.tool(name, 'error');
        responses.push({ id: call.id, name, response: { error: message } });
      }
    }
    this.session?.sendToolResponse({ functionResponses: responses });
    this.toolsInFlight -= 1;
  }

  private addTokens(count: number): void {
    this.tokensUsed += count;
    if (this.tokensUsed < env.VOICE_TOKENS_PER_SESSION || this.closing) return;
    log.warn('voice session reached its token limit', { sessionId: this.dbSessionId, tokens: this.tokensUsed });
    this.out.error('TOKEN_LIMIT', 'This voice session reached its length limit. You can start another one if you have sessions left today.');
    void this.end('token_limit');
  }

  // What the user was heard saying lately, used to check that a tool that changes their data was really requested.
  private recentUserSpeech(): string {
    return this.transcript
      .filter((entry) => entry.role === 'user')
      .slice(-3)
      .map((entry) => entry.text)
      .join(' ');
  }

  // -----------------------------------------------------------------
  // Spoken briefing: the next part is cued as soon as the previous one ends, unless the listener is speaking.
  // -----------------------------------------------------------------
  private async setUpDriver(ctx: Awaited<ReturnType<typeof loadSessionContext>>): Promise<void> {
    if (ctx.briefing.length === 0) return;
    const listener = ctx.name?.trim().split(/\s+/)[0] ?? 'the listener';
    // The written script generated after the last refresh is performed when it is there; a story without one is improvised.
    const stored = await getLatestScript(this.userId).catch((err) => {
      log.warn('briefing script could not be loaded', { userId: this.userId, err });
      return null;
    });
    const scripts = new Map((stored?.script.chapters ?? []).map((chapter) => [chapter.developmentId, chapter]));
    this.driver = new BriefingDriver(
      ctx.briefing.map((item) => {
        const written = scripts.get(item.developmentId);
        return { title: item.storyTitle, script: written ? { facts: written.facts, sides: written.sides, forYou: written.forYou } : undefined };
      }),
      listener,
      partSeconds(ctx.profile.depth),
      stored?.script.closing || undefined,
    );
    this.refs.briefing = {
      stop: () => this.driver?.stop(),
      skipStory: () => this.driver?.skipStory(),
      resume: () => {
        this.driver?.resumeBriefing();
        this.scheduleNextPart();
      },
    };
  }

  private listenerSpoke(): void {
    this.driver?.listenerSpoke();
    this.clearContinueTimer();
  }

  private clearContinueTimer(): void {
    if (this.continueTimer) clearTimeout(this.continueTimer);
    this.continueTimer = null;
  }

  private scheduleNextPart(): void {
    if (!this.driver || this.closing) return;
    this.clearContinueTimer();
    this.continueTimer = setTimeout(() => this.cueNextPart(), NEXT_PART_DELAY_MS);
  }

  private cueNextPart(): void {
    this.continueTimer = null;
    if (!this.driver || this.closing || this.held || !this.session) return;
    // Only cue while the room is quiet: not while the listener is talking, a tool is running or audio is playing.
    if (this.toolsInFlight > 0 || (this.state !== 'listening' && this.state !== 'processing')) return;
    const note = this.driver.nextNote();
    if (!note) return;
    log.info('briefing part cued', { sessionId: this.dbSessionId });
    this.session.sendRealtimeInput({ text: note });
  }

  // After the user stops talking there is a gap before audio arrives; that gap is "processing".
  private scheduleProcessing(): void {
    if (this.processingTimer) clearTimeout(this.processingTimer);
    this.processingTimer = setTimeout(() => {
      if (this.state === 'user_speaking') this.setState('processing');
    }, PROCESSING_DELAY_MS);
  }

  // -----------------------------------------------------------------
  // Transcript: one open utterance per role; the client replaces its text on every update.
  // -----------------------------------------------------------------
  private appendTranscript(role: Role, text: string): void {
    const last = this.transcript[this.transcript.length - 1];
    if (last && last.role === role && this.openRole === role) {
      last.text += text;
    } else {
      this.finalizeOpen();
      this.transcript.push({ role, text });
      this.openRole = role;
    }
    this.out.transcript(role, this.transcript[this.transcript.length - 1].text.trim(), this.turn, false);
  }

  private finalizeOpen(): void {
    if (this.openRole === null) return;
    const last = this.transcript[this.transcript.length - 1];
    if (last) this.out.transcript(last.role, last.text.trim(), this.turn, true);
    this.openRole = null;
  }

  // -----------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------
  private setState(state: LiveState): void {
    if (this.state === state) return;
    this.state = state;
    this.out.state(state);
  }

  private handleClose(code: number, reason: string): void {
    if (this.closing) return;
    log.warn('live connection closed', { sessionId: this.dbSessionId, code, reason });
    this.out.error('MODEL_UNAVAILABLE', 'Voice session was interrupted.');
    void this.end('connection_lost');
  }

  private checkLimits(): void {
    if (Date.now() - this.lastActivity > IDLE_TIMEOUT_MS) void this.end('idle_timeout');
    else if (Date.now() - this.startedAt > MAX_SESSION_MS) void this.end('max_duration');
  }

  private async cleanup(): Promise<void> {
    if (this.watchdog) clearInterval(this.watchdog);
    if (this.processingTimer) clearTimeout(this.processingTimer);
    this.watchdog = null;
    this.processingTimer = null;
    this.clearContinueTimer();
    try {
      this.session?.close();
    } catch (err) {
      log.warn('closing live session failed', { sessionId: this.dbSessionId, err });
    }
    this.session = null;
  }

  async end(reason: string): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    this.finalizeOpen();
    await this.cleanup();
    if (active.get(this.userId) === this) active.delete(this.userId);
    this.setState('ended');
    this.out.ended(reason);
    void addVoiceTokens(this.userId, this.tokensUsed).catch((err) => log.warn('voice tokens were not recorded', { sessionId: this.dbSessionId, err }));
    log.info('session ended', { userId: this.userId, sessionId: this.dbSessionId, reason, entries: this.transcript.length });
    void this.persist(reason);
  }

  // Summary generation runs after the call has ended so the user is never kept waiting on it.
  private async persist(reason: string): Promise<void> {
    if (!this.dbSessionId) return;
    const entries = this.transcript.filter((t) => t.text.trim().length > 0).map((t) => ({ role: t.role, text: t.text.trim() }));
    let summary: Record<string, unknown> | null = null;
    try {
      if (entries.some((e) => e.role === 'user')) {
        const result = await summarizeSession(entries);
        const stories = [...this.refs.discussedStoryIds];
        const sources = stories.length
          ? unwrap(
              'story_sources.session',
              await supabase
                .from('story_sources')
                .select('url, title, publisher')
                .in('story_id', stories)
                .order('published_at', { ascending: false })
                .limit(6)
                .returns<Array<{ url: string; title: string | null; publisher: string | null }>>(),
            )
          : [];
        summary = {
          summary: result.summary,
          keyPoints: result.key_points,
          nextSteps: result.next_steps,
          sources: sources.map((s) => ({ name: s.publisher ?? 'Source', url: s.url, title: s.title })),
        };
      }
    } catch (err) {
      log.error('session summary failed', { sessionId: this.dbSessionId, err });
    }
    try {
      unwrapVoid(
        'bidi_sessions.end',
        await supabase
          .from('bidi_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
            end_reason: reason,
            transcript: entries,
            summary,
            discussed_story_ids: [...this.refs.discussedStoryIds],
          })
          .eq('id', this.dbSessionId),
      );
    } catch (err) {
      log.error('persisting session failed', { sessionId: this.dbSessionId, err });
    }
  }
}
