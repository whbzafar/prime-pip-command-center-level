/**
 * Federal Reserve Bank of St. Louis — FRED.
 * Works with NO key via the public fredgraph.csv download. If FRED_API_KEY is set
 * (free at fredaccount.stlouisfed.org) the official JSON API is used instead.
 */
import { fetchJson, fetchText, mapLimit, markFailure, markSuccess, registerSource, setSourceNote, toNum } from './http.js';

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
  GVZCLS: 'CBOE Gold ETF Volatility Index (GVZ)',
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

/**
 * Same-instrument market fallback (Yahoo Finance daily closes) for the series that have an exact
 * market equivalent. FRED's keyless CSV download refuses some cloud servers (Vercel/AWS), so without a
 * FRED_API_KEY these keep yields, VIX, oil, indices and FX live. Values are the same instrument
 * (e.g. ^TNX = CBOE 10Y Treasury yield, ^VIX = CBOE VIX), never an estimate. Series with no exact
 * market twin (TIPS, breakevens, HY OAS, Fed balance sheet, NFCI) are NOT substituted.
 */
const YAHOO_TWIN: Partial<Record<FredId, { sym: string; scale?: number }>> = {
  DGS10: { sym: '^TNX' }, DGS2: { sym: '2YY=F' }, VIXCLS: { sym: '^VIX' }, GVZCLS: { sym: '^GVZ' },
  DCOILWTICO: { sym: 'CL=F' }, DHHNGSP: { sym: 'NG=F' }, SP500: { sym: '^GSPC' }, NASDAQ100: { sym: '^NDX' }, DJIA: { sym: '^DJI' },
  DEXUSEU: { sym: 'EURUSD=X' }, DEXUSUK: { sym: 'GBPUSD=X' }, DEXJPUS: { sym: 'JPY=X' }, DEXCAUS: { sym: 'CAD=X' },
  DEXSZUS: { sym: 'CHF=X' }, DEXUSAL: { sym: 'AUDUSD=X' }, DEXUSNZ: { sym: 'NZDUSD=X' }, CBBTCUSD: { sym: 'BTC-USD' }, CBETHUSD: { sym: 'ETH-USD' },
};
export const fredFallbackUsed = new Set<string>();

/** Where the cached points for a series actually came from (shown on every indicator). */
export function fredSourceOf(id: FredId): { title: string; name: string; url: string } {
  if (!fredFallbackUsed.has(id)) return { title: `FRED ${id}`, name: 'FRED — Federal Reserve Bank of St. Louis', url: `https://fred.stlouisfed.org/series/${id}` };
  if (id === 'DFII10' || id === 'T10YIE' || id === 'T5YIFR') return { title: id === 'DFII10' ? 'US Treasury 10Y real (TIPS) par yield' : id === 'T10YIE' ? 'US Treasury 10Y nominal − 10Y real yield' : 'US Treasury 5Y5Y forward breakeven (from 5Y/10Y nominal & real par yields)', name: 'U.S. Department of the Treasury', url: 'https://home.treasury.gov/resource-center/data-chart-center/interest-rates' };
  if (id === 'NFCI') return { title: 'Chicago Fed NFCI', name: 'Federal Reserve Bank of Chicago', url: 'https://www.chicagofed.org/research/data/nfci/current-data' };
  if (id === 'T10Y2Y') return { title: '10Y − 2Y Treasury yield (market)', name: 'Yahoo Finance (^TNX, 2YY=F)', url: 'https://finance.yahoo.com/quote/%5ETNX/' };
  const sym = YAHOO_TWIN[id]?.sym || '';
  return { title: `${sym} daily close`, name: 'Yahoo Finance', url: `https://finance.yahoo.com/quote/${encodeURIComponent(sym)}/` };
}

// ── Official-publisher fallbacks (same numbers FRED republishes) ─────────────────────────────────
// US Treasury daily par yield curves: FRED's DFII10 is the Treasury 10Y real (TIPS) CMT, and FRED
// defines T10YIE = DGS10 − DFII10 and T5YIFR from the 5Y and 10Y nominal/real CMT rates.
type Curve = Map<string, Record<string, number>>;
const curveCache = new Map<string, { at: number; c: Curve }>();
function parseTreasuryCsv(csv: string): Curve {
  const lines = csv.trim().split(/\r?\n/);
  const head = lines[0].split(',').map((h) => h.replace(/"/g, '').trim().toUpperCase());
  const out: Curve = new Map();
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map((c) => c.replace(/"/g, '').trim());
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(cells[0] || '');
    if (!m) continue;
    const row: Record<string, number> = {};
    head.forEach((h, i) => { const v = toNum(cells[i]); if (i && v !== null) row[h.replace(/\s+/g, '')] = v; });
    out.set(`${m[3]}-${m[1]}-${m[2]}`, row);
  }
  return out;
}
async function treasuryCurve(kind: 'daily_treasury_yield_curve' | 'daily_treasury_real_yield_curve'): Promise<Curve> {
  const hit = curveCache.get(kind);
  if (hit && Date.now() - hit.at < TTL) return hit.c;
  const y = new Date().getUTCFullYear();
  const merged: Curve = new Map();
  for (const year of [y - 1, y]) {
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all?type=${kind}&field_tdr_date_value=${year}&page&_format=csv`;
    try { for (const [d, r] of parseTreasuryCsv(await fetchText(url, { timeoutMs: 12_000, retries: 1 }))) merged.set(d, r); } catch { /* keep what loaded */ }
  }
  if (merged.size) curveCache.set(kind, { at: Date.now(), c: merged });
  return merged;
}
const sortPts = (m: Map<string, number>): SeriesPoint[] => [...m].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
async function treasuryFallback(id: FredId): Promise<SeriesPoint[]> {
  if (!['DFII10', 'T10YIE', 'T5YIFR'].includes(id)) return [];
  const [nom, real] = await Promise.all([treasuryCurve('daily_treasury_yield_curve'), treasuryCurve('daily_treasury_real_yield_curve')]);
  const out = new Map<string, number>();
  for (const [d, r] of real) {
    const n = nom.get(d);
    const r10 = r['10YR'], r5 = r['5YR'];
    if (id === 'DFII10' && r10 !== undefined) out.set(d, r10);
    if (!n) continue;
    const n10 = n['10YR'], n5 = n['5YR'];
    if (id === 'T10YIE' && n10 !== undefined && r10 !== undefined) out.set(d, +(n10 - r10).toFixed(2));
    if (id === 'T5YIFR' && [n10, n5, r10, r5].every((v) => v !== undefined)) {
      // 5-year, 5-year forward breakeven: the inflation compensation for years 6–10.
      const be10 = (n10 - r10) / 100, be5 = (n5 - r5) / 100;
      out.set(d, +((Math.pow(Math.pow(1 + be10, 10) / Math.pow(1 + be5, 5), 1 / 5) - 1) * 100).toFixed(2));
    }
  }
  return sortPts(out);
}
// Chicago Fed publishes NFCI itself (weekly CSV); FRED's NFCI is a copy of it.
async function nfciFallback(): Promise<SeriesPoint[]> {
  const csv = await fetchText('https://www.chicagofed.org/-/media/publications/nfci/nfci-data-series-csv.csv', { timeoutMs: 12_000, retries: 1 });
  const lines = csv.trim().split(/\r?\n/);
  const head = lines[0].split(',').map((h) => h.trim().toUpperCase());
  const iN = head.indexOf('NFCI');
  const out = new Map<string, number>();
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const v = toNum(c[iN]);
    const raw = (c[0] || '').trim();
    let d = '';
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    if (us) d = `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
    else if (/^\d{4}-\d{2}-\d{2}/.test(raw)) d = raw.slice(0, 10);
    if (d && v !== null) out.set(d, v);
  }
  const cutoff = new Date(Date.now() - 2 * 365 * 86_400_000).toISOString().slice(0, 10);
  return sortPts(out).filter((p) => p.date >= cutoff);
}

async function fetchYahooDaily(sym: string, years: number): Promise<SeriesPoint[]> {
  const range = years > 1.2 ? '2y' : '1y';
  const json = await fetchJson<any>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d`, { timeoutMs: 12_000, retries: 1 });
  const r = json?.chart?.result?.[0];
  const ts: number[] = r?.timestamp || [];
  const closes: Array<number | null> = r?.indicators?.quote?.[0]?.close || [];
  const out: SeriesPoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const v = closes[i];
    if (typeof v === 'number' && Number.isFinite(v)) out.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), value: v });
  }
  return out;
}

export async function getFredSeries(id: FredId, years = 1.6): Promise<SeriesPoint[]> {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.points;
  const start = new Date(Date.now() - years * 365.25 * 86_400_000).toISOString().slice(0, 10);
  let points: SeriesPoint[] = [];
  let err: unknown = null;
  try { points = await fetchSeries(id, start); } catch (e) { err = e; }
  if (!points.length && id === 'T10Y2Y') {
    // 10Y-2Y spread from the two market yields when FRED is unreachable.
    const [a, b] = await Promise.all([getFredSeries('DGS10', years), getFredSeries('DGS2', years)]);
    const two = new Map(b.map((p) => [p.date, p.value]));
    points = a.filter((p) => two.has(p.date)).map((p) => ({ date: p.date, value: +(p.value - (two.get(p.date) as number)).toFixed(3) }));
    if (points.length) fredFallbackUsed.add(id);
  }
  if (!points.length && (id === 'DFII10' || id === 'T10YIE' || id === 'T5YIFR')) {
    try { points = await treasuryFallback(id); if (points.length) fredFallbackUsed.add(id); } catch { /* next fallback */ }
  }
  if (!points.length && id === 'NFCI') {
    try { points = await nfciFallback(); if (points.length) fredFallbackUsed.add(id); } catch { /* unavailable */ }
  }
  const twin = YAHOO_TWIN[id];
  if (!points.length && twin) {
    points = await fetchYahooDaily(twin.sym, years);
    if (points.length) fredFallbackUsed.add(id);
  }
  if (!points.length && err) throw err;
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
  if (ok > 0) {
    markSuccess(FRED_SOURCE_ID, ok);
    // Be explicit in the Data Audit when some series came from the same-instrument market fallback.
    const missing = ids.filter((id) => !(out[id] || []).length);
    const fb = [...fredFallbackUsed];
    if (fb.length || missing.length) setSourceNote(FRED_SOURCE_ID,
      `US yields, VIX, oil, indices & FX closes.${fb.length ? ` FRED download blocked from this server: ${fb.length} series served from the original publisher or the same instrument (US Treasury yield curves, Chicago Fed NFCI, Yahoo ^TNX/^VIX).` : ''}${missing.length ? ` Unavailable without a free FRED_API_KEY: ${missing.join(', ')}.` : ''}`);
  }
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
