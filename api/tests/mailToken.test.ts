import { beforeAll, describe, expect, it } from 'vitest';

let mail: typeof import('../src/services/emailAlerts');

beforeAll(async () => {
  Object.assign(process.env, {
    GEMINI_API_KEY: 'x',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'x',
    AUTH_SECRET: 'a-test-secret-that-is-at-least-32-chars',
  });
  mail = await import('../src/services/emailAlerts');
}, 60_000); // importing the whole service graph is slow when every test file starts at once

describe('email links', () => {
  it('round-trips a tap', () => {
    const link = mail.readMailToken(mail.makeMailToken('user-1', 'plan', 'item-1'));
    expect(link).toMatchObject({ u: 'user-1', a: 'plan', i: 'item-1' });
  });

  it('rejects a tampered link, so nobody can act as another user', () => {
    const [body, sig] = mail.makeMailToken('user-1', 'ok', 'item-1').split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'user-2', a: 'ok', i: 'item-1', e: Date.now() + 1e6 })).toString('base64url');
    expect(mail.readMailToken(`${forged}.${sig}`)).toBeNull();
    expect(mail.readMailToken(`${body}.bad`)).toBeNull();
  });
});
