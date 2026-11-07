import type { SourceHealth } from '../types.js';

/** Registry of source health, surfaced in the UI so users can see exactly what is live. */
const health = new Map<string, SourceHealth>();

export function registerSource(id: string, name: string, url: string, note?: string): void {
  if (!health.has(id)) {
    health.set(id, {
      id,
      name,
      url,
      status: 'degraded',
      lastSuccess: null,
      lastAttempt: null,
      lastError: null,
      itemCount: 0,
      note,
    });
  }
}

export function markSuccess(id: string, itemCount: number): void {
  const h = health.get(id);
  if (!h) return;
  const now = new Date().toISOString();
  h.status = itemCount > 0 ? 'ok' : 'degraded';
  h.lastSuccess = now;
  h.lastAttempt = now;
  h.lastError = itemCount > 0 ? null : 'Source responded but returned no usable rows';
  h.itemCount = itemCount;
}

export function markFailure(id: string, error: unknown): void {
  const h = health.get(id);
  if (!h) return;
  h.lastAttempt = new Date().toISOString();
  h.lastError = error instanceof Error ? error.message : String(error);
  h.status = h.lastSuccess ? 'degraded' : 'down';
}

export function markNotConfigured(id: string, note: string): void {
  const h = health.get(id);
  if (!h) return;
  h.status = 'not_configured';
  h.note = note;
}

export function getSourceHealth(): SourceHealth[] {
  return Array.from(health.values()).map((h) => ({ ...h }));
}

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export interface FetchOpts {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

/**
 * fetch with timeout + bounded retry. Retries only on network errors, 429 and 5xx.
 * Never retries 4xx (those mean the request itself is wrong).
 */
export async function fetchWithRetry(url: string, opts: FetchOpts = {}): Promise<Response> {
  const { timeoutMs = 12_000, retries = 2, headers = {} } = opts;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': DEFAULT_UA, Accept: '*/*', ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
      } else {
        throw Object.assign(new Error(`HTTP ${res.status} from ${new URL(url).host}`), { noRetry: true });
      }
    } catch (err: any) {
      if (err?.noRetry) throw err;
      lastErr = err;
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export async function fetchJson<T = any>(url: string, opts: FetchOpts = {}): Promise<T> {
  const res = await fetchWithRetry(url, { ...opts, headers: { Accept: 'application/json', ...(opts.headers || {}) } });
  return (await res.json()) as T;
}

export async function fetchText(url: string, opts: FetchOpts = {}): Promise<string> {
  const res = await fetchWithRetry(url, opts);
  return await res.text();
}

/** Run async tasks with a concurrency cap (keeps us polite with free endpoints). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '' || v === '.') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
