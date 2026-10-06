import { io, Socket } from "socket.io-client";

export type VoiceState =
  | "idle"
  | "connecting"
  | "listening"
  | "processing"
  | "speaking"
  | "stopped"
  | "error";

export type TranscriptRole = "user" | "agent";

export interface LiveHandlers {
  onState: (state: VoiceState) => void;
  onTranscript: (role: TranscriptRole, turn: number, text: string) => void;
  onLevel: (level: number) => void;
  onError: (message: string) => void;
}

export interface LiveSession {
  setMuted: (muted: boolean) => void;
  setHeld: (held: boolean) => void;
  end: () => void;
}

const INPUT_RATE = 16000;
const OUTPUT_RATE = 24000;
// 100 ms frames matched 20 ms ones in quality on Gemini Live while sending a fifth of the messages.
const FRAME_MS = 100;
const START_TIMEOUT_MS = 15000;
const END_TIMEOUT_MS = 5000;
const LEVEL_INTERVAL_MS = 50;
const PLAYBACK_LEAD_SEC = 0.05;
const START_ERROR = "Voice session could not be started";
// Longest a finished call keeps its audio open so the last words are heard in full.
const MAX_DRAIN_MS = 8000;

const SERVER_STATES: Record<string, VoiceState> = {
  connecting: "connecting",
  listening: "listening",
  user_speaking: "listening",
  processing: "processing",
  agent_speaking: "speaking",
  held: "idle",
  ended: "stopped",
  error: "error",
};

interface StartAck {
  ok: boolean;
  message?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toPcmBuffer(data: unknown): ArrayBuffer | null {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  }
  return null;
}

function rmsLevel(analyser: AnalyserNode, scratch: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(scratch);
  let sum = 0;
  for (const v of scratch) {
    const centered = (v - 128) / 128;
    sum += centered * centered;
  }
  return Math.min(1, Math.sqrt(sum / scratch.length) * 4);
}

/**
 * Opens one Gemini Live session over the /live socket. Creation is synchronous; microphone
 * and audio graph setup continue asynchronously and abort cleanly if end() was already called.
 */
export function createLiveSession(token: string, language: string, handlers: LiveHandlers): LiveSession {
  const origin = process.env.NEXT_PUBLIC_API_URL;

  let closed = false;
  let started = false;
  let muted = false;
  let held = false;
  let minTurn = 0;

  let stream: MediaStream | null = null;
  let inputCtx: AudioContext | null = null;
  let outputCtx: AudioContext | null = null;
  let captureNode: AudioWorkletNode | null = null;
  let inputSource: MediaStreamAudioSourceNode | null = null;
  let inputAnalyser: AnalyserNode | null = null;
  let outputAnalyser: AnalyserNode | null = null;
  let nextPlayTime = 0;
  let currentState: VoiceState = "connecting";
  let frameId = 0;
  let lastLevelAt = 0;
  const playing = new Set<AudioBufferSourceNode>();

  const noop: LiveSession = { setMuted: () => undefined, setHeld: () => undefined, end: () => undefined };
  if (!origin) {
    handlers.onError("Voice service is not configured.");
    handlers.onState("error");
    return noop;
  }

  const socket: Socket = io(`${origin}/live`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: false,
  });

  // Set once the server has ended the call; the microphone stops and only the queued farewell keeps playing.
  let ending = false;
  const isSending = () => !muted && !held && !ending;

  // Which microphone was opened and which processing the browser really applied, for diagnosing bad audio.
  const reportMicrophone = (media: MediaStream, contextRate: number) => {
    const track = media.getAudioTracks()[0];
    if (!track || !socket.connected) return;
    const settings = track.getSettings();
    socket.emit("live:mic", {
      label: track.label,
      echoCancellation: settings.echoCancellation,
      noiseSuppression: settings.noiseSuppression,
      autoGainControl: settings.autoGainControl,
      channelCount: settings.channelCount,
      deviceSampleRate: settings.sampleRate,
      contextSampleRate: contextRate,
    });
  };

  const syncMicEnabled = () => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = isSending();
    });
  };

  const stopPlayback = () => {
    playing.forEach((source) => {
      source.onended = null;
      try {
        source.stop();
      } catch (err: unknown) {
        // stop() throws if the source never started; nothing is left to silence.
        console.error("Failed to stop audio source:", err);
      }
      source.disconnect();
    });
    playing.clear();
    nextPlayTime = 0;
  };

  const closeContext = (ctx: AudioContext | null) => {
    if (ctx && ctx.state !== "closed") {
      ctx.close().catch((err: unknown) => console.error("Failed to close audio context:", err));
    }
  };

  const releaseMedia = () => {
    cancelAnimationFrame(frameId);
    if (captureNode) captureNode.port.onmessage = null;
    captureNode?.disconnect();
    inputSource?.disconnect();
    stream?.getTracks().forEach((track) => track.stop());
    stopPlayback();
    closeContext(inputCtx);
    closeContext(outputCtx);
    captureNode = null;
    inputSource = null;
    inputAnalyser = null;
    outputAnalyser = null;
    stream = null;
    inputCtx = null;
    outputCtx = null;
  };

  const shutdown = (notifyServer: boolean) => {
    if (closed) return;
    closed = true;
    releaseMedia();
    socket.off();
    if (notifyServer && started && socket.connected) {
      // Give the server time to store the call summary before dropping the connection.
      socket.timeout(END_TIMEOUT_MS).emit("live:end", () => socket.disconnect());
    } else {
      socket.disconnect();
    }
  };

  const fail = (message: string) => {
    if (closed) return;
    handlers.onError(message);
    handlers.onState("error");
    shutdown(true);
  };

  const setState = (next: VoiceState) => {
    currentState = next;
    handlers.onState(next);
  };

  // The call is over for the user at once, but the audio already received is played to the end before it is released.
  const finishAfterPlayback = () => {
    if (ending || closed) return;
    ending = true;
    setState("stopped");
    const queuedMs = outputCtx ? Math.max(0, (nextPlayTime - outputCtx.currentTime) * 1000) : 0;
    setTimeout(() => shutdown(false), Math.min(queuedMs + 300, MAX_DRAIN_MS));
  };

  const startLevelLoop = () => {
    const inBuf = new Uint8Array(inputAnalyser?.fftSize ?? 512);
    const outBuf = new Uint8Array(outputAnalyser?.fftSize ?? 512);
    const tick = (now: number) => {
      if (closed) return;
      if (now - lastLevelAt >= LEVEL_INTERVAL_MS) {
        lastLevelAt = now;
        let level = 0;
        if (currentState === "speaking" && outputAnalyser) level = rmsLevel(outputAnalyser, outBuf);
        else if (isSending() && inputAnalyser) level = rmsLevel(inputAnalyser, inBuf);
        handlers.onLevel(level);
      }
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
  };

  const startOutput = () => {
    outputCtx = new AudioContext({ sampleRate: OUTPUT_RATE });
    outputAnalyser = outputCtx.createAnalyser();
    outputAnalyser.fftSize = 512;
    outputAnalyser.connect(outputCtx.destination);
    const ctx = outputCtx;
    const op = held ? ctx.suspend() : ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    op.catch((err: unknown) => console.error("Failed to set playback state:", err));
  };

  const startMicrophone = async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      if (closed) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = media;

      // A 16 kHz context lets the browser resample with a proper filter. Some browsers refuse a context
      // whose rate differs from the microphone; those fall back to the default rate and the worklet resamples.
      let ctx: AudioContext;
      let preferred: AudioContext | null = null;
      try {
        preferred = new AudioContext({ sampleRate: INPUT_RATE });
        inputSource = preferred.createMediaStreamSource(media);
        ctx = preferred;
      } catch (err: unknown) {
        console.warn("16 kHz capture is unavailable, resampling in the worklet:", err);
        closeContext(preferred);
        ctx = new AudioContext();
        inputSource = ctx.createMediaStreamSource(media);
      }
      inputCtx = ctx;
      if (ctx.state === "suspended") await ctx.resume();
      await ctx.audioWorklet.addModule("/worklets/pcm-capture.js");
      if (closed) return;

      inputAnalyser = ctx.createAnalyser();
      inputAnalyser.fftSize = 512;
      captureNode = new AudioWorkletNode(ctx, "pcm-capture", {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { targetRate: INPUT_RATE, frameMs: FRAME_MS },
      });
      captureNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        if (isSending() && socket.connected) socket.emit("live:audio", event.data);
      };
      inputSource.connect(inputAnalyser);
      inputSource.connect(captureNode);
      // The node writes silence; connecting it keeps the audio graph pulling input on all browsers.
      captureNode.connect(ctx.destination);
      syncMicEnabled();
      reportMicrophone(media, ctx.sampleRate);
      startLevelLoop();
    } catch (err: unknown) {
      if (closed) return;
      console.error("Microphone setup failed:", err);
      fail("Microphone access was denied or is unavailable.");
    }
  };

  const playChunk = (turn: number, data: unknown) => {
    const pcm = toPcmBuffer(data);
    if (!pcm || !outputCtx || !outputAnalyser || turn < minTurn) return;
    const samples = new Int16Array(pcm, 0, Math.floor(pcm.byteLength / 2));
    if (samples.length === 0) return;

    const buffer = outputCtx.createBuffer(1, samples.length, OUTPUT_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 0x8000;

    const source = outputCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(outputAnalyser);
    const startAt = Math.max(outputCtx.currentTime + PLAYBACK_LEAD_SEC, nextPlayTime);
    nextPlayTime = startAt + buffer.duration;
    source.onended = () => {
      playing.delete(source);
      source.disconnect();
    };
    playing.add(source);
    source.start(startAt);
  };

  socket.on("connect_error", () => fail(START_ERROR));
  socket.on("disconnect", () => {
    // The server closes the connection after it ends a call; that is not a lost connection.
    if (!ending) fail("Voice connection was lost. Close and reopen to start again.");
  });

  socket.on("live:state", (payload: unknown) => {
    if (!isRecord(payload) || typeof payload.state !== "string") return;
    const mapped = SERVER_STATES[payload.state];
    if (!mapped) return;
    if (mapped === "error") {
      fail("Voice session ended with an error.");
    } else if (mapped === "stopped") {
      finishAfterPlayback();
    } else {
      setState(mapped);
    }
  });

  socket.on("live:audio", (payload: unknown) => {
    if (closed || !isRecord(payload) || typeof payload.turn !== "number") return;
    playChunk(payload.turn, payload.data);
  });

  socket.on("live:interrupted", (payload: unknown) => {
    if (isRecord(payload) && typeof payload.turn === "number") minTurn = Math.max(minTurn, payload.turn);
    stopPlayback();
  });

  socket.on("live:transcript", (payload: unknown) => {
    if (!isRecord(payload)) return;
    const { role, text, turn } = payload;
    if ((role === "user" || role === "agent") && typeof text === "string") {
      handlers.onTranscript(role, typeof turn === "number" ? turn : 0, text);
    }
  });

  socket.on("live:error", (payload: unknown) => {
    const message = isRecord(payload) && typeof payload.message === "string" ? payload.message : START_ERROR;
    fail(message);
  });

  socket.on("live:ended", finishAfterPlayback);

  socket.timeout(START_TIMEOUT_MS).emit("live:start", { language }, (err: Error | null, ack: unknown) => {
    if (closed) return;
    const result: StartAck | null = isRecord(ack) && typeof ack.ok === "boolean" ? { ok: ack.ok, message: typeof ack.message === "string" ? ack.message : undefined } : null;
    if (err || !result || !result.ok) {
      fail(result?.message ?? START_ERROR);
      return;
    }
    started = true;
    startOutput();
    if (muted) socket.emit("live:mute", { muted: true });
    if (held) socket.emit("live:hold", { held: true });
    void startMicrophone();
  });

  return {
    setMuted: (next) => {
      if (closed) return;
      muted = next;
      syncMicEnabled();
      if (started) socket.emit("live:mute", { muted: next });
    },
    setHeld: (next) => {
      if (closed) return;
      held = next;
      syncMicEnabled();
      if (started) socket.emit("live:hold", { held: next });
      const ctx = outputCtx;
      if (ctx) {
        const op = next ? ctx.suspend() : ctx.resume();
        op.catch((err: unknown) => console.error("Failed to change playback state:", err));
      }
    },
    end: () => shutdown(true),
  };
}
