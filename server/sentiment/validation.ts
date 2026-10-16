import { NormalizedSentimentItem } from './types.js';

export interface ValidationResult {
  isValid: boolean;
  sanitized?: NormalizedSentimentItem;
  error?: string;
}

/**
 * Validates a sentiment item against strict financial rules:
 * - Symbol must be non-empty string
 * - longPct and shortPct must be valid finite numbers
 * - Both must be >= 0 and <= 100
 * - longPct + shortPct must equal ~100% within a 1.0% tolerance (99.0% - 101.0%)
 */
export function validateSentimentItem(item: Partial<NormalizedSentimentItem>): ValidationResult {
  if (!item) {
    return { isValid: false, error: 'Item is null or undefined' };
  }

  if (!item.symbol || typeof item.symbol !== 'string' || item.symbol.trim().length === 0) {
    return { isValid: false, error: 'Missing or invalid symbol' };
  }

  const longPct = Number(item.longPct);
  const shortPct = Number(item.shortPct);

  if (Number.isNaN(longPct) || Number.isNaN(shortPct) || !Number.isFinite(longPct) || !Number.isFinite(shortPct)) {
    return { isValid: false, error: `Invalid numeric percentages: long=${item.longPct}, short=${item.shortPct}` };
  }

  if (longPct < 0 || longPct > 100 || shortPct < 0 || shortPct > 100) {
    return { isValid: false, error: `Out of bounds percentages: long=${longPct}, short=${shortPct}` };
  }

  const sum = longPct + shortPct;
  if (sum < 99.0 || sum > 101.0) {
    return { isValid: false, error: `Percentages do not sum to 100% (tolerance 1%): sum=${sum.toFixed(2)}%` };
  }

  // Normalize exact percentages so longPct + shortPct === 100
  const normalizedLong = Number(((longPct / sum) * 100).toFixed(1));
  const normalizedShort = Number((100 - normalizedLong).toFixed(1));

  return {
    isValid: true,
    sanitized: {
      symbol: item.symbol.trim().toUpperCase(),
      assetClass: item.assetClass || 'FOREX',
      longPct: normalizedLong,
      shortPct: normalizedShort,
      source: item.source || 'Unknown',
      traderGroup: item.traderGroup || 'Retail traders',
      disclaimer: item.disclaimer,
      sourceUrl: item.sourceUrl || '',
      fetchedAt: item.fetchedAt || Date.now(),
      rawPayload: item.rawPayload,
      timestamp: item.timestamp && item.timestamp > 0 ? item.timestamp : Date.now(),
      notProvided: item.notProvided,
    },
  };
}

/**
 * Validates an entire batch of items. Discards invalid ones, returns valid items.
 */
export function validateSentimentBatch(items: Partial<NormalizedSentimentItem>[]): NormalizedSentimentItem[] {
  if (!Array.isArray(items)) return [];
  const valid: NormalizedSentimentItem[] = [];

  for (const raw of items) {
    const res = validateSentimentItem(raw);
    if (res.isValid && res.sanitized) {
      valid.push(res.sanitized);
    } else if (res.error) {
      console.warn(`[SentimentValidation] Skipped invalid item: ${raw.symbol || 'unknown'} - ${res.error}`);
    }
  }

  return valid;
}

/**
 * Circuit Breaker pattern implementation
 */
export class CircuitBreaker {
  private failureThreshold: number;
  private cooldownMs: number;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(failureThreshold = 5, cooldownMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
  }

  public canExecute(): boolean {
    if (this.state === 'CLOSED') return true;
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.cooldownMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    // HALF_OPEN allows single test execution
    return true;
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  public getConsecutiveFailures(): number {
    return this.failureCount;
  }
}

/**
 * Retry helper with exponential backoff and timeout
 */
export async function fetchWithRetry<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  maxRetries = 3,
  timeoutMs = 8000,
  baseBackoffMs = 500
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fetchFn(controller.signal);
      clearTimeout(timeoutHandle);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseBackoffMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`Fetch failed after ${maxRetries} attempts`);
}
