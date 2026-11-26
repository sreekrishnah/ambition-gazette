export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'DAILY_LIMIT'
  | 'ALREADY_RUNNING'
  | 'RATE_LIMITED'
  | 'EMBEDDING_UNAVAILABLE'
  | 'MODEL_UNAVAILABLE'
  | 'SOURCE_UNAVAILABLE'
  | 'DATABASE_ERROR'
  | 'FORBIDDEN'
  | 'INTERNAL';

// Safe message goes to the client. Diagnostic stays in server logs only.
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    public readonly safeMessage: string,
    public readonly diagnostic?: string,
  ) {
    super(diagnostic ?? safeMessage);
    this.name = 'AppError';
  }
}

export const errors = {
  unauthenticated: () => new AppError('UNAUTHENTICATED', 401, 'Authentication required.'),
  validation: (message: string) => new AppError('VALIDATION_ERROR', 400, message),
  notFound: (what: string) => new AppError('NOT_FOUND', 404, `${what} was not found.`),
  database: (operation: string, diagnostic: string) =>
    new AppError('DATABASE_ERROR', 500, 'A database error occurred.', `${operation}: ${diagnostic}`),
  embedding: (diagnostic: string) =>
    new AppError('EMBEDDING_UNAVAILABLE', 502, 'Memory retrieval is unavailable right now.', diagnostic),
  model: (diagnostic: string) =>
    new AppError('MODEL_UNAVAILABLE', 502, 'The language model is unavailable right now.', diagnostic),
  source: (diagnostic: string) =>
    new AppError('SOURCE_UNAVAILABLE', 502, 'The news source is temporarily unavailable.', diagnostic),
};
