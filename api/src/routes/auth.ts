import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError, errors } from '../lib/errors';
import { createLogger } from '../lib/logger';
import { hashPassword, verifyPassword } from '../lib/password';
import { supabase, unwrap, unwrapMaybe } from '../lib/supabase';
import { signToken } from '../lib/tokens';
import { parseBody, rateLimit, requireAuth, route, userIdOf } from '../http/middleware';

const log = createLogger('auth');
const router = Router();

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const WS_TTL_SECONDS = 5 * 60;

const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(120).optional(),
});
const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  password_hash: string | null;
}

const publicUser = (u: UserRow) => ({ id: u.id, email: u.email, fullName: u.full_name });
const sessionFor = (userId: string) => signToken(userId, 'session', SESSION_TTL_SECONDS, env.AUTH_SECRET);

// Verified against when the email is unknown so response time does not reveal which emails exist.
const DECOY_HASH = `${'aa'.repeat(16)}:${'bb'.repeat(64)}`;

const authLimiter = rateLimit(30, 15 * 60 * 1000);

router.post(
  '/register',
  authLimiter,
  route(async (req, res) => {
    const body = parseBody(RegisterSchema, req.body);
    const existing = unwrapMaybe('users.find', await supabase.from('users').select('id').eq('email', body.email).maybeSingle<{ id: string }>());
    if (existing) throw new AppError('EMAIL_TAKEN', 409, 'An account with this email already exists.');

    const inserted = await supabase
      .from('users')
      .insert({ email: body.email, full_name: body.fullName ?? null, password_hash: await hashPassword(body.password) })
      .select('id, email, full_name, password_hash')
      .single<UserRow>();
    if (inserted.error?.code === '23505') throw new AppError('EMAIL_TAKEN', 409, 'An account with this email already exists.');
    const user = unwrap('users.insert', inserted);

    log.info('user registered', { userId: user.id });
    res.status(201).json({ success: true, token: sessionFor(user.id), user: publicUser(user) });
  }),
);

router.post(
  '/login',
  authLimiter,
  route(async (req, res) => {
    const body = parseBody(LoginSchema, req.body);
    const user = unwrapMaybe(
      'users.login',
      await supabase.from('users').select('id, email, full_name, password_hash').eq('email', body.email).maybeSingle<UserRow>(),
    );
    const valid = await verifyPassword(body.password, user?.password_hash ?? DECOY_HASH);
    if (!user || !valid) {
      log.warn('login failed', { emailKnown: Boolean(user) });
      throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password.');
    }
    res.json({ success: true, token: sessionFor(user.id), user: publicUser(user) });
  }),
);

router.get(
  '/me',
  requireAuth,
  route(async (req, res) => {
    const userId = userIdOf(req);
    const user = unwrapMaybe(
      'users.me',
      await supabase.from('users').select('id, email, full_name, password_hash').eq('id', userId).maybeSingle<UserRow>(),
    );
    if (!user) throw errors.unauthenticated();
    const ambition = unwrapMaybe(
      'ambitions.any',
      await supabase.from('ambitions').select('id').eq('user_id', userId).eq('status', 'active').limit(1).maybeSingle<{ id: string }>(),
    );
    res.json({ success: true, user: publicUser(user), hasAmbition: ambition !== null });
  }),
);

router.post(
  '/ws-token',
  requireAuth,
  route(async (req, res) => {
    const userId = userIdOf(req);
    res.json({ success: true, token: signToken(userId, 'ws', WS_TTL_SECONDS, env.AUTH_SECRET), expiresInSec: WS_TTL_SECONDS });
  }),
);

export default router;
