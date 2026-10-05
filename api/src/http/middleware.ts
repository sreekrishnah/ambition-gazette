import { NextFunction, Request, RequestHandler, Response } from 'express';
import { z, ZodType } from 'zod';
import { env } from '../config/env';
import { AppError, errors } from '../lib/errors';
import { createLogger } from '../lib/logger';
import { verifyToken } from '../lib/tokens';

const log = createLogger('http');

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

export function route(handler: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyToken(token, 'session', env.AUTH_SECRET) : null;
  if (!payload) {
    log.warn('authentication failed', { path: req.path, hasToken: Boolean(token) });
    next(errors.unauthenticated());
    return;
  }
  req.userId = payload.sub;
  next();
}

export function userIdOf(req: Request): string {
  if (!req.userId) throw errors.unauthenticated();
  return req.userId;
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ');
    throw errors.validation(detail);
  }
  return result.data;
}

export const uuidSchema = z.string().uuid();

// Fixed-window limiter keyed by IP. Enough to blunt credential stuffing on a single node.
export function rateLimit(max: number, windowMs: number): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req, _res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count += 1;
    if (entry.count > max) {
      next(new AppError('RATE_LIMITED', 429, 'Too many requests. Please slow down.'));
      return;
    }
    next();
  };
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Not found: ${req.method} ${req.path}` } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.status >= 500) log.error('request failed', { path: req.path, code: err.code, diagnostic: err.diagnostic });
    res.status(err.status).json({ success: false, error: { code: err.code, message: err.safeMessage } });
    return;
  }
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.too.large' || type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body.' } });
    return;
  }
  log.error('unhandled error', { path: req.path, err });
  res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'An unexpected error occurred.' } });
}
