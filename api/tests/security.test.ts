import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/password';
import { signToken, verifyToken } from '../src/lib/tokens';

const SECRET = 'a-test-secret-that-is-at-least-32-chars';
const NOW = Date.UTC(2026, 9, 3);

describe('session tokens', () => {
  it('accepts a valid token of the right kind', () => {
    const token = signToken('user-1', 'session', 60, SECRET, NOW);
    expect(verifyToken(token, 'session', SECRET, NOW)?.sub).toBe('user-1');
  });

  it('rejects a token of the wrong kind, so a socket token cannot act as a session', () => {
    const token = signToken('user-1', 'ws', 60, SECRET, NOW);
    expect(verifyToken(token, 'session', SECRET, NOW)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signToken('user-1', 'session', 60, SECRET, NOW);
    expect(verifyToken(token, 'session', SECRET, NOW + 61_000)).toBeNull();
  });

  it('rejects a tampered payload and a wrong secret', () => {
    const token = signToken('user-1', 'session', 60, SECRET, NOW);
    const [head, , sig] = token.split('.');
    const forgedBody = Buffer.from(JSON.stringify({ sub: 'user-2', kind: 'session', iat: 0, exp: 9_999_999_999 })).toString('base64url');
    expect(verifyToken(`${head}.${forgedBody}.${sig}`, 'session', SECRET, NOW)).toBeNull();
    expect(verifyToken(token, 'session', 'another-secret-that-is-also-32-chars', NOW)).toBeNull();
  });

  it('rejects malformed input without throwing', () => {
    expect(verifyToken('not-a-token', 'session', SECRET, NOW)).toBeNull();
    expect(verifyToken('a.b.c', 'session', SECRET, NOW)).toBeNull();
  });
});

describe('passwords', () => {
  it('verifies the right password and rejects a wrong or missing one', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
    expect(await verifyPassword('wrong password', stored)).toBe(false);
    expect(await verifyPassword('anything', null)).toBe(false);
  });
});
