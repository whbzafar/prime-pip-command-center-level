/**
 * TradingView public economic-calendar JSON (no key, no login).
 * This is the live engine for every currency's macro data: each release
 * (NFP, CPI, PMI, rate decisions...) arrives with actual / forecast / previous
 * as soon as TradingView publishes it.
 */
import { fetchJson, markFailure, markSuccess, registerSource, toNum } from './http.js';

export const TV_SOURCE_ID = 'tradingview_calendar';
registerSource(
  TV_SOURCE_ID,
  'TradingView Economic Calendar',
  'https://www.tradingview.com/economic-calendar/',
  'Actual / forecast / previous for every scheduled release. Refreshed every 60s around releases.'
);

/** Countries pulled from the calendar. DE adds Ifo/ZEW for EUR; CN drives metals/AUD/NZD. */
export const TV_COUNTRY_CODES = ['US', 'EU', 'DE', 'GB', 'JP', 'CA', 'AU', 'NZ', 'CH', 'CN'];

export interface TvEvent {
  id: string;
  title: string;
  indicator: string;
  /** Normalized TITLE key used for matching (lowercase, release-stage suffixes removed). TradingView
   *  titles follow Trading Economics naming ("Non Farm Payrolls", "Inflation Rate YoY"). */
  key: string;
  /** Normalized `indicator` field (Reuters-style codes such as "CPI YY, NSA") — secondary match key. */
  indicatorKey: string;
  country: string;
  currency: string;
  timestamp: number;
  iso: string;
  period: string | null;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  unit: string;
  scale: string;
  importance: number;
  source: string;
  sourceUrl: string;
  ticker: string | null;
}

const STAGE_SUFFIX =
  /\s+(prel(im(inary)?)?|flash|final|adv(ance)?|2nd est(imate)?|3rd est(imate)?|second estimate|third estimate|rev(ised)?|s\.a\.?|n\.s\.a\.?)$/i;

export function normalizeKey(s: string): string {
  let k = String(s || '').replace(/\*/g, '').trim().replace(/\s+/g, ' ');
  // strip release stage suffixes repeatedly ("GDP Growth Rate QoQ 2nd Est" -> "GDP Growth Rate QoQ")
  for (let i = 0; i < 3; i++) k = k.replace(STAGE_SUFFIX, '');
  return k.toLowerCase();
}

/** The public feed carries no unit field; percentages are recognisable from the title. */
export function inferUnit(title: string): string {
  const t = title.toLowerCase();
  if (/\b(index|pmi|confidence|sentiment|climate|count|stocks|change|payrolls|claims|openings|balance|starts|permits|sales|reserves)\b/.test(t) && !/\b(yoy|mom|qoq)\b/.test(t)) return '';
  if (/\b(yoy|mom|qoq|rate|inflation|growth|earnings|wages|annualized)\b/.test(t)) return '%';
  return '';
}

export function parseTvEvent(raw: any): TvEvent | null {
  const ts = raw?.date ? new Date(raw.date).getTime() : NaN;
  if (!Number.isFinite(ts)) return null;
  const title = String(raw?.title ?? '').trim();
  if (!title) return null;
  const indicator = String(raw?.indicator ?? title).trim();
  const country = String(raw?.country ?? '').toUpperCase().trim();
  return {
    id: String(raw?.id ?? `${country}-${title}-${ts}`),
    title,
    indicator,
    key: normalizeKey(title),
    indicatorKey: normalizeKey(indicator),
    country,
    currency: String(raw?.currency ?? '').toUpperCase().trim(),
    timestamp: ts,
    iso: new Date(ts).toISOString(),
    period: raw?.period ? String(raw.period) : null,
    actual: toNum(raw?.actual),
    forecast: toNum(raw?.forecast ?? raw?.estimate),
    previous: toNum(raw?.previous),
    unit: raw?.unit ? String(raw.unit).trim() : inferUnit(title),
    scale: raw?.scale ? String(raw.scale).trim() : '',
    importance: Number.isFinite(Number(raw?.importance)) ? Number(raw.importance) : 0,
    source: raw?.source ? String(raw.source) : 'TradingView',
    sourceUrl: raw?.source_url ? String(raw.source_url) : 'https://www.tradingview.com/economic-calendar/',
    ticker: raw?.ticker ? String(raw.ticker) : null,
  };
}

async function fetchRange(from: Date, to: Date): Promise<TvEvent[]> {
  const url =
    `https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(from.toISOString())}` +
    `&to=${encodeURIComponent(to.toISOString())}&countries=${TV_COUNTRY_CODES.join(',')}`;
  const payload = await fetchJson<any>(url, {
    timeoutMs: 15_000,
    headers: { Origin: 'https://www.tradingview.com', Referer: 'https://www.tradingview.com/' },
  });
  const rows: any[] = Array.isArray(payload?.result) ? payload.result : Array.isArray(payload) ? payload : [];
  return rows.map(parseTvEvent).filter((e): e is TvEvent => e !== null);
}

/** In-memory event store keyed by id: history window + live updates merge into it. */
const store = new Map<string, TvEvent>();
let lastHistoryLoad = 0;
let lastLiveLoad = 0;

const SERVERLESS = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
// Long-running servers keep >1 year; serverless keeps ~8 months (still ≥2 prints of every quarterly
// release and every central-bank meeting) so a cold start finishes within the request budget.
const HISTORY_DAYS = SERVERLESS ? 240 : 400;
const HISTORY_TTL = 6 * 60 * 60 * 1000;

function merge(events: TvEvent[]): void {
  for (const e of events) store.set(e.id, e);
}

/**
 * Load / refresh calendar data.
 * - full history (400 days, chunked) every 6 hours
 * - "live" window (−3d … +10d) on every call that is allowed by `minLiveIntervalMs`
 */
export async function refreshCalendar(opts: { force?: boolean; minLiveIntervalMs?: number } = {}): Promise<void> {
  const now = Date.now();
  const tasks: Promise<void>[] = [];

  if (opts.force || now - lastHistoryLoad > HISTORY_TTL || store.size === 0) {
    tasks.push(
      (async () => {
        const chunkDays = SERVERLESS ? 80 : 100;
        const ranges: Array<[Date, Date]> = [];
        for (let back = HISTORY_DAYS; back > 0; back -= chunkDays) {
          ranges.push([new Date(now - back * 86_400_000), new Date(Math.min(now - (back - chunkDays) * 86_400_000, now))]);
        }
        // Parallel chunks; a failed chunk does not discard the others.
        const results = await Promise.allSettled(ranges.map(([f, t]) => fetchRange(f, t)));
        let okChunks = 0;
        for (const r of results) if (r.status === 'fulfilled') { merge(r.value); okChunks++; }
        if (okChunks === 0) throw (results[0] as PromiseRejectedResult).reason;
        lastHistoryLoad = Date.now();
      })()
    );
  }

  const minLive = opts.minLiveIntervalMs ?? 55_000;
  if (opts.force || now - lastLiveLoad > minLive) {
    tasks.push(
      (async () => {
        merge(await fetchRange(new Date(now - 3 * 86_400_000), new Date(now + 10 * 86_400_000)));
        lastLiveLoad = Date.now();
      })()
    );
  }

  if (tasks.length === 0) return;
  try {
    await Promise.all(tasks);
    markSuccess(TV_SOURCE_ID, store.size);
  } catch (err) {
    markFailure(TV_SOURCE_ID, err);
    if (store.size === 0) throw err;
  }
}

export function getAllEvents(): TvEvent[] {
  return Array.from(store.values()).sort((a, b) => a.timestamp - b.timestamp);
}

export function calendarLoaded(): boolean {
  return store.size > 0;
}

/** Is a tracked release scheduled within ±windowMin minutes? Used to tighten polling. */
export function isHotWindow(windowMin = 12): boolean {
  const now = Date.now();
  const w = windowMin * 60_000;
  for (const e of store.values()) {
    if (e.importance >= 0 && Math.abs(e.timestamp - now) <= w) return true;
  }
  return false;
}

/** Test hook. */
export function __setEventsForTest(events: TvEvent[]): void {
  store.clear();
  merge(events);
}
