import { describe, it, expect, vi } from 'vitest';
import { withRetry, HttpError, isRetryableError } from '../shared/retry.js';

describe('Retry & Backoff Policy Unit Tests', () => {
  describe('isRetryableError() filter', () => {
    it('identifies HTTP 429 as retryable (rate limited)', () => {
      expect(isRetryableError(new HttpError(429, 'Too Many Requests'))).toBe(true);
      expect(isRetryableError({ status: 429 })).toBe(true);
      expect(isRetryableError(new Error('FRED API error HTTP 429'))).toBe(true);
    });

    it('identifies HTTP 5xx errors as retryable (server errors)', () => {
      expect(isRetryableError(new HttpError(500, 'Internal Server Error'))).toBe(true);
      expect(isRetryableError(new HttpError(502, 'Bad Gateway'))).toBe(true);
      expect(isRetryableError(new HttpError(503, 'Service Unavailable'))).toBe(true);
      expect(isRetryableError(new HttpError(504, 'Gateway Timeout'))).toBe(true);
      expect(isRetryableError({ status: 503 })).toBe(true);
    });

    it('identifies network and timeout errors as retryable', () => {
      expect(isRetryableError(new Error('HTTP request timed out after 15000ms'))).toBe(true);
      expect(isRetryableError(new Error('fetch failed: ECONNRESET'))).toBe(true);
    });

    it('NEVER retries on HTTP 4xx client errors (400, 401, 403, 404, 422)', () => {
      expect(isRetryableError(new HttpError(400, 'Bad Request'))).toBe(false);
      expect(isRetryableError(new HttpError(401, 'Unauthorized'))).toBe(false);
      expect(isRetryableError(new HttpError(403, 'Forbidden'))).toBe(false);
      expect(isRetryableError(new HttpError(404, 'Not Found'))).toBe(false);
      expect(isRetryableError(new HttpError(422, 'Unprocessable Entity'))).toBe(false);
      expect(isRetryableError({ status: 404 })).toBe(false);
      expect(isRetryableError(new Error('FRED API client error HTTP 404'))).toBe(false);
    });
  });

  describe('withRetry() execution', () => {
    it('fails fast on 404 without retrying', async () => {
      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        throw new HttpError(404, 'Not Found');
      };

      await expect(
        withRetry(failingFn, 'test-404', { maxRetries: 3, initialDelayMs: 10 })
      ).rejects.toThrow('HTTP 404: Not Found');

      // Crucial: Must be called exactly ONCE, zero retries
      expect(callCount).toBe(1);
    });

    it('fails fast on 401 Unauthorized without retrying', async () => {
      let callCount = 0;
      const failingFn = async () => {
        callCount++;
        throw new HttpError(401, 'Unauthorized');
      };

      await expect(
        withRetry(failingFn, 'test-401', { maxRetries: 3, initialDelayMs: 10 })
      ).rejects.toThrow('HTTP 401: Unauthorized');

      expect(callCount).toBe(1);
    });

    it('retries on 429 and succeeds on subsequent attempt', async () => {
      let callCount = 0;
      const transientFn = async () => {
        callCount++;
        if (callCount < 3) {
          throw new HttpError(429, 'Too Many Requests');
        }
        return 'success-after-rate-limit';
      };

      const result = await withRetry(transientFn, 'test-429', {
        maxRetries: 3,
        initialDelayMs: 10,
        jitter: false,
      });

      expect(result).toBe('success-after-rate-limit');
      expect(callCount).toBe(3);
    });

    it('retries on 503 Service Unavailable and succeeds', async () => {
      let callCount = 0;
      const transientFn = async () => {
        callCount++;
        if (callCount === 1) {
          throw new HttpError(503, 'Service Unavailable');
        }
        return 'recovered-after-503';
      };

      const result = await withRetry(transientFn, 'test-503', {
        maxRetries: 2,
        initialDelayMs: 10,
        jitter: false,
      });

      expect(result).toBe('recovered-after-503');
      expect(callCount).toBe(2);
    });
  });
});
