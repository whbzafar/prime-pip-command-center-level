/**
 * Federal Reserve Bank of St. Louis — FRED.
 * Works with NO key via the public fredgraph.csv download. If FRED_API_KEY is set
 * (free at fredaccount.stlouisfed.org) the official JSON API is used instead.
 */
import { fetchJson, fetchText, mapLimit, markFailure, markSuccess, registerSource, toNum } from './http.js';

export const FRED_SOURCE_ID = 'fred';
registerSource(FRED_SOURCE_ID, 'FRED — Federal Reserve Bank of St. Louis', 'https://fred.stlouisfed.org/',
  'US yields, real yields, breakevens, credit spreads, Fed balance sheet, financial conditions, daily FX & index closes.');

export interface SeriesPoint { date: string; value: number }

/** Series used by the engine. Every id is an official FRED identifier. */
export const FRED_SERIES = {
  DGS2: '2-Year Treasury Constant Maturity (%)',
  DGS10: '10-Year Treasury Constant Maturity (%)',
  T10Y2Y: '10Y minus 2Y Treasury spread (pp)',
  DFII10: '10-Year TIPS real yield (%)',
  T10YIE: '10-Year breakeven inflation (%)',
  T5YIFR: '5Y5Y forward inflation expectation (%)',
  VIXCLS: 'CBOE VIX close',
  BAMLH0A0HYM2: 'ICE BofA US High Yield OAS (pp)',
  DTWEXBGS: 'Nominal Broad US Dollar Index',
  WALCL: 'Fed total assets (USD mn, weekly)',
  NFCI: 'Chicago Fed National Financial Conditions Index',
  DCOILWTICO: 'WTI crude spot (USD/bbl)',
  DHHNGSP: 'Henry Hub natural gas spot (USD/MMBtu)',
  SP500: 'S&P 500 close',
  NASDAQ100: 'Nasdaq-100 close',
  DJIA: 'Dow Jones Industrial Average close',
  DEXUSEU: 'USD per EUR (daily noon NY)',
  DEXUSUK: 'USD per GBP',
  DEXJPUS: 'JPY per USD',
  DEXCAUS: 'CAD per USD',
  DEXSZUS: 'CHF per USD',
  DEXUSAL: 'USD per AUD',
  DEXUSNZ: 'USD per NZD',
  CBBTCUSD: 'Coinbase Bitcoin (USD)',
  CBETHUSD: 'Coinbase Ether (USD)',
} as const;

export type FredId = keyof typeof FRED_SERIES;

const cache = new Map<string, { at: number; points: SeriesPoint[] }>();
const TTL = 2 * 60 * 60 * 1000;

export function parseFredCsv(csv: string): SeriesPoint[] {
  const lines = csv.trim().split(/\r?\n/);
  const out: SeriesPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [d, v] = lines[i].split(',');
    const value = toNum(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d || '') && value !== null) out.push({ date: d, value });
  }
  return out;
}

async function fetchSeries(id: string, startIso: string): Promise<SeriesPoint[]> {
  const key = process.env.FRED_API_KEY;
  if (key) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&observation_start=${startIso}`;
    const json = await fetchJson<any>(url, { timeoutMs: 12_000, retries: 1 });
    return (json?.observations || [])
      .map((o: any) => ({ date: String(o.date), value: toNum(o.value) }))
      .filter((p: any): p is SeriesPoint => p.value !== null);
  }
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${startIso}`;
  return parseFredCsv(await fetchText(url, { timeoutMs: 12_000, retries: 1 }));
}

export async function getFredSeries(id: FredId, years = 1.6): Promise<SeriesPoint[]> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.points;
  const start = new Date(Date.now() - years * 365.25 * 86_400_000).toISOString().slice(0, 10);
  const points = await fetchSeries(id, start);
  cache.set(id, { at: Date.now(), points });
  return points;
}

/** Refresh every engine series; failures are isolated per series. */
export async function refreshFred(force = false): Promise<Record<string, SeriesPoint[]>> {
  if (force) cache.clear();
  const ids = Object.keys(FRED_SERIES) as FredId[];
  const out: Record<string, SeriesPoint[]> = {};
  let ok = 0;
  let lastErr: unknown = null;
  await mapLimit(ids, 6, async (id) => {
    try {
      out[id] = await getFredSeries(id);
      if (out[id].length) ok++;
    } catch (err) {
      lastErr = err;
      out[id] = cache.get(id)?.points || [];
    }
  });
  if (ok > 0) markSuccess(FRED_SOURCE_ID, ok);
  else markFailure(FRED_SOURCE_ID, lastErr || new Error('No FRED series loaded'));
  return out;
}

export function getCachedFred(id: FredId): SeriesPoint[] {
  return cache.get(id)?.points || [];
}

export function __setFredForTest(id: FredId, points: SeriesPoint[]): void {
  cache.set(id, { at: Date.now(), points });
}

/** Helpers for scoring market series. */
export function latest(points: SeriesPoint[]): SeriesPoint | null {
  return points.length ? points[points.length - 1] : null;
}

/** Value approximately `days` calendar days before the latest observation. */
export function valueDaysAgo(points: SeriesPoint[], days: number): SeriesPoint | null {
  const last = latest(points);
  if (!last) return null;
  const target = new Date(last.date).getTime() - days * 86_400_000;
  for (let i = points.length - 1; i >= 0; i--) {
    if (new Date(points[i].date).getTime() <= target) return points[i];
  }
  return null;
}

/** z-score of the latest value vs the trailing window (in observations). */
export function zScore(points: SeriesPoint[], window = 252): number | null {
  if (points.length < 30) return null;
  const slice = points.slice(-window);
  const vals = slice.map((p) => p.value);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  if (!sd) return null;
  return (vals[vals.length - 1] - mean) / sd;
}
