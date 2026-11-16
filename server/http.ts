import type { ApiErrorCode } from '../app/src/domain/vehicle/types';

const STATUS: Record<ApiErrorCode, number> = {
  INVALID_REG: 400,
  BAD_REQUEST: 400,
  UNAUTHORISED: 401,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  NOT_CONFIGURED: 500,
  UNAVAILABLE: 503,
};

export const MESSAGES: Record<ApiErrorCode, string> = {
  INVALID_REG: "That doesn't look like a valid UK registration.",
  BAD_REQUEST: 'Something was wrong with the request.',
  UNAUTHORISED: 'Passcode needed.',
  NOT_FOUND: 'Registration not found.',
  RATE_LIMITED: 'Too many lookups — please wait a few minutes and try again.',
  NOT_CONFIGURED: 'The lookup service is not set up yet.',
  UNAVAILABLE: 'The service is unavailable right now — please try again shortly.',
};

/** An expected failure with a user-friendly message. */
export class ApiFailure extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string = MESSAGES[code],
    public retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...extra } });
}

export function errorResponse(failure: ApiFailure): Response {
  const extra: Record<string, string> = failure.retryAfterSeconds ? { 'retry-after': String(failure.retryAfterSeconds) } : {};
  return json({ error: { code: failure.code, message: failure.message } }, STATUS[failure.code], extra);
}

/** Reads a small JSON body; anything odd is a bad request. */
export async function readJsonBody(req: Request, maxBytes = 4_096): Promise<Record<string, unknown>> {
  if (req.method !== 'POST') throw new ApiFailure('BAD_REQUEST', 'Use POST.');
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiFailure('BAD_REQUEST', 'Request too large.');
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new ApiFailure('BAD_REQUEST', 'Request body must be JSON.');
}

/** Logs only a safe summary — never registrations, keys, tokens or bodies. */
export function logFailure(where: string, detail: string | number): void {
  console.error(`[${where}] ${detail}`);
}
