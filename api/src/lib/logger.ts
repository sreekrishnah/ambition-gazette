type Level = 'debug' | 'info' | 'warn' | 'error';
type Fields = Record<string, unknown>;

const REDACTED_KEYS = /token|password|secret|authorization|api[-_]?key|cookie/i;

function serializeError(err: unknown): Fields {
  if (err instanceof Error) {
    const withCode = err as Error & { code?: unknown; status?: unknown };
    return { name: err.name, message: err.message, code: withCode.code, status: withCode.status };
  }
  return { message: String(err) };
}

function sanitize(fields: Fields): Fields {
  const out: Fields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACTED_KEYS.test(key)) out[key] = '[redacted]';
    else if (key === 'err' || key === 'error') out[key] = serializeError(value);
    else out[key] = value;
  }
  return out;
}

function write(level: Level, scope: string, msg: string, fields: Fields = {}): void {
  if (level === 'debug' && process.env.LOG_LEVEL !== 'debug') return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, scope, msg, ...sanitize(fields) });
  (level === 'error' ? console.error : console.log)(line);
}

export interface Logger {
  debug(msg: string, fields?: Fields): void;
  info(msg: string, fields?: Fields): void;
  warn(msg: string, fields?: Fields): void;
  error(msg: string, fields?: Fields): void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (msg, fields) => write('debug', scope, msg, fields),
    info: (msg, fields) => write('info', scope, msg, fields),
    warn: (msg, fields) => write('warn', scope, msg, fields),
    error: (msg, fields) => write('error', scope, msg, fields),
  };
}
