/**
 * Simple Token Bucket / Minimum Interval Rate Limiter
 * Ensures requests stay within API constraints (e.g., FRED 120 req/min -> throttled to ~1 req/sec).
 */
export class RateLimiter {
  private minIntervalMs: number;
  private lastRequestTime = 0;

  constructor(requestsPerSecond = 1) {
    this.minIntervalMs = Math.ceil(1000 / requestsPerSecond);
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

export const fredRateLimiter = new RateLimiter(1); // 1 request per second (60 req/min, well under 120 limit)
export const cftcRateLimiter = new RateLimiter(2); // 2 requests per second
