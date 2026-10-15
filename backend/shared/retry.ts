import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
}

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly bodyText?: string;

  constructor(status: number, statusText: string, message?: string, bodyText?: string) {
    super(message || `HTTP ${status}: ${statusText}`);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = statusText;
    this.bodyText = bodyText;
  }
}

/**
 * Determines whether an error is eligible for retry.
 * STRICT RULE: Retry ONLY on HTTP 429 (Too Many Requests) and 5xx (Server Errors).
 * NEVER retry on client errors (400, 401, 403, 404, 422, etc.).
 */
export function isRetryableError(err: unknown): boolean {
  if (!err) return false;

  // HttpError instance
  if (err instanceof HttpError) {
    if (err.status === 429) return true;
    if (err.status >= 500 && err.status < 600) return true;
    return false; // Any other 4xx is NOT retryable
  }

  // Generic object with status property
  if (typeof err === 'object' && 'status' in err && typeof (err as any).status === 'number') {
    const s = (err as any).status;
    if (s === 429) return true;
    if (s >= 500 && s < 600) return true;
    if (s >= 400 && s < 500) return false;
  }

  // Network / timeout errors (Fetch AbortError, ECONNRESET, ETIMEDOUT)
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('timed out') ||
    msg.includes('AbortError') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('fetch failed')
  ) {
    return true;
  }

  // If status is mentioned in error message (e.g. "HTTP 404")
  const match = msg.match(/HTTP\s+(\d{3})/i);
  if (match) {
    const code = parseInt(match[1], 10);
    if (code === 429 || (code >= 500 && code < 600)) return true;
    if (code >= 400 && code < 500) return false;
  }

  return false;
}

/**
 * Executes an async operation with exponential backoff and jitter.
 * Retries ONLY on 429 and 5xx. Never retries on 4xx.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  contextName = 'operation',
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    maxDelayMs = 8000,
    factor = 2,
    jitter = true,
  } = options;

  let attempt = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      attempt++;
      return await operation();
    } catch (err: unknown) {
      const retryable = isRetryableError(err);
      const errMsg = err instanceof Error ? err.message : String(err);

      if (!retryable) {
        logger.warn(`[Retry] ${contextName} non-retryable error encountered: ${errMsg}. Failing fast.`);
        throw err;
      }

      if (attempt > maxRetries) {
        logger.error(`[Retry] ${contextName} failed after ${maxRetries} retries: ${errMsg}`);
        throw err;
      }

      const randomJitter = jitter ? Math.random() * 200 : 0;
      const sleepDuration = Math.min(delay + randomJitter, maxDelayMs);

      logger.warn(
        `[Retry] ${contextName} attempt ${attempt} failed (retryable): ${errMsg}. Retrying in ${Math.round(sleepDuration)}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, sleepDuration));
      delay *= factor;
    }
  }
}
