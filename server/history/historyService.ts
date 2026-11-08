/**
 * FULL-HISTORY CANDLE SERVICE (free sources, verified live)
 *
 *  - Dukascopy Bank SA datafeed (via dukascopy-node): 1,499 instruments — forex, metals, energy,
 *    index & stock CFDs, crypto. Minute candles since 2003 for majors; daily since 1973 (EUR/USD).
 *  - Yahoo Finance chart API: daily/weekly/monthly history of indices & stocks back to the first
 *    recorded trade (e.g. S&P 500 since 1927).
 *  (Crypto is served from Binance's public market-data mirror directly in the browser.)
 *
 * "before" mode walks backwards in chunks — skipping weekends, holidays and data gaps — until it
 * has `count` bars or reaches the instrument's first available data. Nothing is interpolated.
 */
import { getHistoricalRates, instrumentMetaData } from 'dukascopy-node';

export type Tf = 'm1' | 'm5' | 'm15' | 'm30' | 'h1' | 'h4' | 'd1' | 'w1' | 'mn1';
export interface Candle { timestamp: number; open: number; high: number; low: number; close: number; volume: number }

const DAY = 86_400_000;
const TF_MS: Record<Tf, number> = { m1: 60_000, m5: 300_000, m15: 900_000, m30: 1_800_000, h1: 3_600_000, h4: 14_400_000, d1: DAY, w1: 7 * DAY, mn1: 30 * DAY };

/** Chunk size per Dukascopy request (keeps each call to a few datafeed files). */
const DUKA_CHUNK: Record<Tf, number> = { m1: 1 * DAY, m5: 4 * DAY, m15: 10 * DAY, m30: 20 * DAY, h1: 30 * DAY, h4: 120 * DAY, d1: 730 * DAY, w1: 3650 * DAY, mn1: 3650 * DAY };

const meta = instrumentMetaData as unknown as Record<string, { name: string; description: string; startDayForMinuteCandles: string; startMonthForHourlyCandles: string; startYearForDailyCandles: string }>;

export function dukaInstrumentExists(id: string): boolean {
  return !!meta[id];
}

/** Earliest timestamp Dukascopy documents for this instrument + timeframe family. */
export function dukaInception(id: string, tf: Tf): number {
  const m = meta[id];
  if (!m) return Date.now();
  const iso = tf === 'm1' || tf === 'm5' || tf === 'm15' || tf === 'm30' ? m.startDayForMinuteCandles
    : tf === 'h1' || tf === 'h4' ? m.startMonthForHourlyCandles : m.startYearForDailyCandles;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

export function listDukaInstruments() {
  return Object.entries(meta).map(([id, m]) => ({
    id, name: m.name, description: m.description,
    minuteFrom: m.startDayForMinuteCandles?.slice(0, 10), dailyFrom: m.startYearForDailyCandles?.slice(0, 10),
  }));
}

// ───────────────────────────────────────── small LRU cache

const cache = new Map<string, { at: number; data: Candle[] }>();
function cacheGet(k: string, ttl: number): Candle[] | null {
  const v = cache.get(k);
  if (!v || Date.now() - v.at > ttl) return null;
  cache.delete(k); cache.set(k, v);
  return v.data;
}
function cacheSet(k: string, data: Candle[]) {
  cache.set(k, { at: Date.now(), data });
  while (cache.size > 300) cache.delete(cache.keys().next().value as string);
}

function clean(rows: any[]): Candle[] {
  const out: Candle[] = [];
  for (const r of rows || []) {
    const c = { timestamp: Number(r.timestamp), open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: Number(r.volume ?? 0) };
    if (![c.timestamp, c.open, c.high, c.low, c.close].every(Number.isFinite)) continue;
    if (c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0 || c.high < c.low) continue;
    out.push(c);
  }
  out.sort((a, b) => a.timestamp - b.timestamp);
  // de-duplicate timestamps
  return out.filter((c, i) => i === 0 || c.timestamp !== out[i - 1].timestamp);
}

/** UTC calendar bucket start for weekly (Monday) / monthly aggregation. */
function bucketStart(ts: number, tf: 'w1' | 'mn1'): number {
  const d = new Date(ts);
  if (tf === 'mn1') return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

export function aggregate(daily: Candle[], tf: 'w1' | 'mn1'): Candle[] {
  const out: Candle[] = [];
  for (const c of daily) {
    const b = bucketStart(c.timestamp, tf);
    const last = out[out.length - 1];
    if (last && last.timestamp === b) {
      last.high = Math.max(last.high, c.high); last.low = Math.min(last.low, c.low); last.close = c.close; last.volume += c.volume;
    } else out.push({ timestamp: b, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
  }
  return out;
}

// ───────────────────────────────────────── Dukascopy

async function dukaRange(id: string, tf: Tf, from: number, to: number): Promise<Candle[]> {
  const native: Tf = tf === 'w1' || tf === 'mn1' ? 'd1' : tf;
  const historic = to < Date.now() - 2 * DAY;
  const key = `duka|${id}|${native}|${from}|${to}`;
  const hit = cacheGet(key, historic ? 24 * 3600_000 : 20_000);
  if (hit) return hit;
  const rows = await getHistoricalRates({
    instrument: id as any,
    dates: { from: new Date(from), to: new Date(to) },
    timeframe: native as any,
    format: 'json',
    priceType: 'bid',
    volumes: true,
    ignoreFlats: true,
    batchSize: 12,
    pauseBetweenBatchesMs: 20,
    retryCount: 2,
    useCache: false,
    // Serverless-safe: never launch a headless browser for WAF recovery and never write a token
    // cache to disk (Vercel's filesystem is read-only). If Dukascopy challenges the server's IP,
    // the request fails fast and the Yahoo fallback answers instead.
    wafMode: 'off',
    wafTokenCache: false,
  } as any);
  const data = clean(rows as any[]);
  cacheSet(key, data);
  return data;
}

/** Up to `count` bars strictly before `before`, walking back over gaps until inception. */
export async function dukaBefore(id: string, tf: Tf, before: number, count: number, budgetMs = 7_000): Promise<{ candles: Candle[]; reachedStart: boolean }> {
  if (!meta[id]) throw new Error(`Unknown Dukascopy instrument ${id}`);
  const native: Tf = tf === 'w1' || tf === 'mn1' ? 'd1' : tf;
  const inception = dukaInception(id, native);
  const chunk = DUKA_CHUNK[tf];
  const started = Date.now();
  let to = Math.min(before - 1, Date.now());
  let acc: Candle[] = [];
  let reachedStart = false;
  let emptyStreak = 0;
  for (let i = 0; i < 40; i++) {
    const from = Math.max(inception, to - chunk);
    if (from >= to) { reachedStart = true; break; }
    const part = await dukaRange(id, native, from, to);
    acc = part.concat(acc);
    const have = tf === 'w1' || tf === 'mn1' ? aggregate(acc, tf).length : acc.length;
    if (have >= count) break;
    if (from <= inception) { reachedStart = true; break; }
    emptyStreak = part.length ? 0 : emptyStreak + 1;
    // Long empty stretch (e.g. an index whose documented daily start predates real data): stop.
    if (emptyStreak >= (native === 'd1' ? 4 : 12)) { reachedStart = true; break; }
    if (Date.now() - started > budgetMs) break;
    to = from - 1;
  }
  let candles = clean(acc).filter((c) => c.timestamp < before);
  if (tf === 'w1' || tf === 'mn1') candles = aggregate(candles, tf);
  return { candles: candles.slice(-count), reachedStart };
}

// ───────────────────────────────────────── Yahoo (daily / weekly / monthly)

const YAHOO_INTERVAL: Partial<Record<Tf, string>> = { d1: '1d', w1: '1wk', mn1: '1mo' };
const YAHOO_SPAN: Partial<Record<Tf, number>> = { d1: 12 * 365 * DAY, w1: 60 * 365 * DAY, mn1: 150 * 365 * DAY };

export async function yahooBefore(symbol: string, tf: Tf, before: number, count: number): Promise<{ candles: Candle[]; reachedStart: boolean; firstTrade: number | null }> {
  const interval = YAHOO_INTERVAL[tf];
  if (!interval) throw new Error('Yahoo history is used for daily, weekly and monthly bars only');
  const to = Math.min(before, Date.now() + DAY);
  // Yahoo rejects very old period1 values (verified: monthly ^GSPC truncated to 1985 when asked
  // for 1876); its earliest records begin in the late 1920s, so clamp to 1920-01-01.
  const from = Math.max(to - (YAHOO_SPAN[tf] as number), Date.UTC(1920, 0, 1));
  const historic = to < Date.now() - 2 * DAY;
  const key = `yahoo|${symbol}|${tf}|${Math.floor(from / DAY)}|${Math.floor(to / DAY)}`;
  let data = cacheGet(key, historic ? 24 * 3600_000 : 60_000);
  let firstTrade: number | null = null;
  if (!data) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Math.floor(from / 1000)}&period2=${Math.floor(to / 1000)}&interval=${interval}&includeAdjustedClose=false&events=`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const j: any = await res.json();
    const r = j?.chart?.result?.[0];
    if (!r) throw new Error(j?.chart?.error?.description || 'No data');
    firstTrade = Number.isFinite(r?.meta?.firstTradeDate) ? r.meta.firstTradeDate * 1000 : null;
    const ts: number[] = r.timestamp || [];
    const q = r.indicators?.quote?.[0] || {};
    data = clean(ts.map((t, i) => ({ timestamp: t * 1000, open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i] ?? 0 })));
    cacheSet(key, data);
  }
  const candles = data.filter((c) => c.timestamp < before);
  const reachedStart = candles.length === 0 || (firstTrade !== null && candles[0].timestamp <= firstTrade + 7 * DAY) || candles.length < 3;
  return { candles: candles.slice(-Math.max(count, 1)), reachedStart, firstTrade };
}

export const TF_LIST = Object.keys(TF_MS) as Tf[];

// ───────────────────────────────────────── Yahoo intraday (fallback when Dukascopy is unavailable)

/** Yahoo's free intraday limits: 1m ≈ last 30 days (≤ 8-day requests), 5–30m ≈ 60 days, 60m ≈ 730 days. */
const YAHOO_INTRADAY: Partial<Record<Tf, { interval: string; lookback: number; window: number }>> = {
  m1: { interval: '1m', lookback: 29 * DAY, window: 7 * DAY },
  m5: { interval: '5m', lookback: 59 * DAY, window: 59 * DAY },
  m15: { interval: '15m', lookback: 59 * DAY, window: 59 * DAY },
  m30: { interval: '30m', lookback: 59 * DAY, window: 59 * DAY },
  h1: { interval: '60m', lookback: 729 * DAY, window: 729 * DAY },
  h4: { interval: '60m', lookback: 729 * DAY, window: 729 * DAY },
};

export async function yahooAny(symbol: string, tf: Tf, before: number, count: number): Promise<{ candles: Candle[]; reachedStart: boolean }> {
  if (YAHOO_INTERVAL[tf]) return yahooBefore(symbol, tf, before, count);
  const spec = YAHOO_INTRADAY[tf];
  if (!spec) return { candles: [], reachedStart: true };
  const earliest = Date.now() - spec.lookback;
  const to = Math.min(before, Date.now() + 60_000);
  const from = Math.max(earliest, to - spec.window);
  if (from >= to) return { candles: [], reachedStart: true };
  const key = `yahooi|${symbol}|${tf}|${Math.floor(from / 60_000)}|${Math.floor(to / 60_000)}`;
  let data = cacheGet(key, 30_000);
  if (!data) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Math.floor(from / 1000)}&period2=${Math.floor(to / 1000)}&interval=${spec.interval}&includePrePost=false&events=`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const j: any = await res.json();
    const r = j?.chart?.result?.[0];
    if (!r) throw new Error(j?.chart?.error?.description || 'No data');
    const ts: number[] = r.timestamp || [];
    const q = r.indicators?.quote?.[0] || {};
    data = clean(ts.map((t, i) => ({ timestamp: t * 1000, open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i] ?? 0 })));
    if (tf === 'h4') {
      const out: Candle[] = [];
      for (const c of data) {
        const b = Math.floor(c.timestamp / (4 * 3600_000)) * 4 * 3600_000;
        const last = out[out.length - 1];
        if (last && last.timestamp === b) { last.high = Math.max(last.high, c.high); last.low = Math.min(last.low, c.low); last.close = c.close; last.volume += c.volume; }
        else out.push({ ...c, timestamp: b });
      }
      data = out;
    }
    cacheSet(key, data);
  }
  const candles = data.filter((c) => c.timestamp < before).slice(-count);
  return { candles, reachedStart: from <= earliest };
}
