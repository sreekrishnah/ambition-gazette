import { Server, Socket } from 'socket.io';
import { env } from './config/env';
import { AppError } from './lib/errors';
import { createLogger } from './lib/logger';
import { z } from 'zod';
import { VOICE_LANGUAGES } from './ai/liveSpeech';
import { verifyToken } from './lib/tokens';
import { INPUT_SAMPLE_RATE, LiveEmitter, LiveSession, OUTPUT_SAMPLE_RATE } from './services/bidiAgent';
import { consumeVoiceSession, limitMessage, refundVoiceSession } from './services/voiceUsage';

const log = createLogger('live-socket');

interface SocketData {
  userId: string;
  session: LiveSession | null;
  starting: boolean;
}

type StartAck = (reply: { ok: boolean; sessionId?: string; inputSampleRate?: number; outputSampleRate?: number; code?: string; message?: string }) => void;
type EndAck = (reply: { ok: boolean }) => void;

const MicInfoSchema = z.object({
  label: z.string().max(200).optional(),
  echoCancellation: z.boolean().optional(),
  noiseSuppression: z.boolean().optional(),
  autoGainControl: z.boolean().optional(),
  channelCount: z.number().optional(),
  deviceSampleRate: z.number().optional(),
  contextSampleRate: z.number().optional(),
});

const StartPayloadSchema = z.object({ language: z.enum(VOICE_LANGUAGES).optional() });

function emitterFor(socket: Socket): LiveEmitter {
  return {
    state: (state) => socket.emit('live:state', { state }),
    audio: (turn, data) => socket.emit('live:audio', { turn, data }),
    interrupted: (turn) => socket.emit('live:interrupted', { turn }),
    transcript: (role, text, turn, final) => socket.emit('live:transcript', { role, text, turn, final }),
    tool: (name, status) => socket.emit('live:tool', { name, status }),
    error: (code, message) => socket.emit('live:error', { code, message }),
    ended: (reason) => socket.emit('live:ended', { reason }),
  };
}

export default function registerLiveSocket(io: Server): void {
  const live = io.of('/live');

  // The handshake token is a short-lived 'ws' token issued to an authenticated session.
  live.use((socket, next) => {
    const token = typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : null;
    const payload = token ? verifyToken(token, 'ws', env.AUTH_SECRET) : null;
    if (!payload) {
      log.warn('socket rejected', { socketId: socket.id });
      next(new Error('UNAUTHENTICATED'));
      return;
    }
    (socket.data as SocketData).userId = payload.sub;
    (socket.data as SocketData).session = null;
    (socket.data as SocketData).starting = false;
    next();
  });

  live.on('connection', (socket) => {
    const data = socket.data as SocketData;
    log.info('socket connected', { socketId: socket.id, userId: data.userId });

    // Older clients send only the ack callback; newer ones send { language } first.
    socket.on('live:start', async (first?: unknown, second?: StartAck) => {
      const ack = typeof first === 'function' ? (first as StartAck) : second;
      const reply: StartAck = typeof ack === 'function' ? ack : () => undefined;
      const payload = StartPayloadSchema.safeParse(typeof first === 'function' ? {} : (first ?? {}));
      if (!payload.success) {
        reply({ ok: false, code: 'VALIDATION_ERROR', message: 'That language is not supported.' });
        return;
      }
      if (data.session || data.starting) {
        reply({ ok: false, code: 'ALREADY_STARTED', message: 'A voice session is already active.' });
        return;
      }
      data.starting = true;
      let counted = false;
      try {
        // The daily limit is a hard gate: it is checked, and the session counted, before anything is opened.
        const gate = await consumeVoiceSession(data.userId);
        if (gate !== 'ok') {
          log.info('voice session refused by daily limit', { userId: data.userId, gate });
          reply({ ok: false, code: 'DAILY_LIMIT', message: limitMessage(gate) });
          return;
        }
        counted = true;
        const session = new LiveSession(data.userId, emitterFor(socket));
        const sessionId = await session.start(payload.data.language);
        data.session = session;
        reply({ ok: true, sessionId, inputSampleRate: INPUT_SAMPLE_RATE, outputSampleRate: OUTPUT_SAMPLE_RATE });
      } catch (err) {
        // A session that never started does not use up one of the day's sessions.
        if (counted) await refundVoiceSession(data.userId).catch((refundErr) => log.warn('voice session refund failed', { refundErr }));
        const code = err instanceof AppError ? err.code : 'INTERNAL';
        reply({ ok: false, code, message: 'Voice session could not be started.' });
      } finally {
        data.starting = false;
      }
    });

    socket.on('live:audio', (frame: unknown) => {
      if (!data.session) return;
      if (frame instanceof ArrayBuffer) data.session.sendAudio(Buffer.from(frame));
      else if (Buffer.isBuffer(frame)) data.session.sendAudio(frame);
    });

    // Which microphone the browser opened and the processing it applied; only logged, to diagnose audio quality.
    socket.on('live:mic', (info: unknown) => {
      const parsed = MicInfoSchema.safeParse(info);
      if (parsed.success) log.info('mic device', { socketId: socket.id, userId: data.userId, ...parsed.data });
    });

    socket.on('live:mute', (payload: { muted?: unknown }) => {
      if (data.session && typeof payload?.muted === 'boolean') data.session.setMuted(payload.muted);
    });

    socket.on('live:hold', (payload: { held?: unknown }) => {
      if (data.session && typeof payload?.held === 'boolean') data.session.setHeld(payload.held);
    });

    socket.on('live:end', async (ack?: EndAck) => {
      await data.session?.end('user_ended');
      data.session = null;
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('disconnect', (reason) => {
      log.info('socket disconnected', { socketId: socket.id, userId: data.userId, reason, hadSession: Boolean(data.session) });
      // A dropped browser must not leave a billable Gemini session open.
      void data.session?.end('client_disconnected');
      data.session = null;
    });
  });
}
