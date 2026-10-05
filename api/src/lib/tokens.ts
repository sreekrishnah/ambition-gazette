import crypto from 'crypto';

export type TokenKind = 'session' | 'ws';

export interface TokenPayload {
  sub: string;
  kind: TokenKind;
  iat: number;
  exp: number;
}

const b64 = (input: Buffer | string): string => Buffer.from(input).toString('base64url');

function sign(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

export function signToken(userId: string, kind: TokenKind, ttlSeconds: number, secret: string, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const payload: TokenPayload = { sub: userId, kind, iat, exp: iat + ttlSeconds };
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify(payload));
  return `${head}.${body}.${sign(`${head}.${body}`, secret)}`;
}

function isPayload(value: unknown): value is TokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.sub === 'string' &&
    (v.kind === 'session' || v.kind === 'ws') &&
    typeof v.iat === 'number' &&
    typeof v.exp === 'number'
  );
}

// Returns null for any malformed, tampered, expired or wrong-kind token.
export function verifyToken(token: string, kind: TokenKind, secret: string, now = Date.now()): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, body, sig] = parts;
  const expected = Buffer.from(sign(`${head}.${body}`, secret));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!isPayload(payload) || payload.kind !== kind) return null;
    if (payload.exp * 1000 <= now) return null;
    return payload;
  } catch {
    return null;
  }
}
