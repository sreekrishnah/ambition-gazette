import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import registerLiveSocket from './bidi-socket';
import { env } from './config/env';
import { errorHandler, notFound } from './http/middleware';
import { endAllSessions } from './services/bidiAgent';
import { checkConfiguredModels } from './lib/gemini';
import { createLogger } from './lib/logger';
import apiRouter from './routes';
import { runDailyBatch } from './services/batch';
import { isCatchUpWindow, isScheduledMinute } from './services/schedule';
import { failOrphanedJobs } from './services/pipeline';

const log = createLogger('server');

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [env.FRONTEND_URL, ...(env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000'])];

app.disable('x-powered-by');
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
  // One audio frame is a few KB; this caps abusive payloads.
  maxHttpBufferSize: 256 * 1024,
});
registerLiveSocket(io);

// Daily batch at 06:00 India time. The batch_runs unique slot makes duplicate triggers harmless, so the check
// runs several times a minute and cannot miss the minute.
const batchTimer = setInterval(() => {
  if (isScheduledMinute()) {
    log.info('starting scheduled batch');
    void runDailyBatch();
  }
}, 20 * 1000);

httpServer.listen(env.PORT, () => {
  log.info('api listening', { port: env.PORT, frontend: env.FRONTEND_URL, liveModel: env.GEMINI_LIVE_MODEL });
  failOrphanedJobs().catch((err) => log.error('orphan cleanup failed', { err }));
  // A server that was down at 06:00 still runs the day's batch once it is back, if the slot is not already taken.
  if (isCatchUpWindow()) void runDailyBatch();
  void checkConfiguredModels();
});

async function shutdown(signal: string): Promise<void> {
  log.info('shutting down', { signal });
  clearInterval(batchTimer);
  await endAllSessions('server_shutdown');
  io.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export default app;
