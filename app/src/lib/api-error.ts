export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

interface ErrorBody {
  success?: boolean;
  error?: { code?: unknown; message?: unknown };
}

function isErrorBody(value: unknown): value is ErrorBody {
  return typeof value === "object" && value !== null;
}

/** Parses an API response; throws ApiError built from the structured error shape. */
export async function parseApiResponse<T>(res: Response): Promise<T> {
  const raw: unknown = await res.json().catch(() => null);
  const failed = !res.ok || (isErrorBody(raw) && raw.success === false);

  if (failed) {
    const err = isErrorBody(raw) ? raw.error : undefined;
    const message = typeof err?.message === "string" ? err.message : "Request failed. Please try again.";
    const code = typeof err?.code === "string" ? err.code : "INTERNAL";
    throw new ApiError(message, code, res.status);
  }
  return raw as T;
}
