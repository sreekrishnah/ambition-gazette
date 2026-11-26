import { beforeAll, describe, expect, it } from 'vitest';
import type { Request } from 'express';

let mw: typeof import('../src/http/middleware');
let signToken: typeof import('../src/lib/tokens').signToken;
const SECRET = 'a-test-secret-that-is-at-least-32-chars';
const UUID = '3f2b8c1e-4d5a-4e6f-9a7b-1c2d3e4f5a6b';

beforeAll(async () => {
  Object.assign(process.env, { GEMINI_API_KEY: 'x', SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'x', AUTH_SECRET: SECRET });
  mw = await import('../src/http/middleware');
  ({ signToken } = await import('../src/lib/tokens'));
}, 60_000);

const run = (handler: typeof mw.requireAuth, userId: string) => {
  const req = { headers: { authorization: `Bearer ${signToken(userId, 'session', 60, SECRET)}` }, path: '/x' } as unknown as Request;
  let error: unknown = null;
  handler(req, {} as never, (e?: unknown) => {
    error = e ?? null;
  });
  return { error, userId: req.userId };
};

describe('requireAuth', () => {
  it('accepts a real user id', () => {
    expect(run(mw.requireAuth, UUID)).toMatchObject({ error: null, userId: UUID });
  });

  it('rejects a signed token whose id is not a uuid, so stale demo sessions are signed out', () => {
    expect(run(mw.requireAuth, 'user_synth_saas_02').error).toMatchObject({ status: 401 });
  });

  it('lets the reality graph accept seeded non-uuid owners', () => {
    expect(run(mw.requireAuthAnyId, 'user_synth_saas_02')).toMatchObject({ error: null, userId: 'user_synth_saas_02' });
  });
});
