/**
 * Daily closes for correlation analysis.
 * Primary: Yahoo Finance public chart endpoint (no key).
 * Fallback: FRED daily series (official, 1-day lag) for FX, US indices, WTI, BTC/ETH.
 */
import { fetchJson, mapLimit, markFailure, markSuccess, registerSource } from './http.js';
import { getFredSeries, type FredId, type SeriesPoint } from './fred.js';

export const PRICE_SOURCE_ID = 'prices';
registerSource(PRICE_SOURCE_ID, 'Daily closes (Yahoo Finance → FRED fallback)', 'https://finance.yahoo.com/',
  'Used only for correlation matrices, never for fundamental scores.');

export interface PriceSpec {
  symbol: string;
  label: string;
  yahoo: string;
  fred?: FredId;
}

export const PRICE_UNIVERSE: PriceSpec[] = [
  { symbol: 'DXY', label: 'US Dollar Index', yahoo: 'DX-Y.NYB', fred: undefined },
  { symbol: 'EURUSD', label: 'EUR/USD', yahoo: 'EURUSD=X', fred: 'DEXUSEU' },
  { symbol: 'GBPUSD', label: 'GBP/USD', yahoo: 'GBPUSD=X', fred: 'DEXUSUK' },
  { symbol: 'USDJPY', label: 'USD/JPY', yahoo: 'JPY=X', fred: 'DEXJPUS' },
  { symbol: 'USDCHF', label: 'USD/CHF', yahoo: 'CHF=X', fred: 'DEXSZUS' },
  { symbol: 'USDCAD', label: 'USD/CAD', yahoo: 'CAD=X', fred: 'DEXCAUS' },
  { symbol: 'AUDUSD', label: 'AUD/USD', yahoo: 'AUDUSD=X', fred: 'DEXUSAL' },
  { symbol: 'NZDUSD', label: 'NZD/USD', yahoo: 'NZDUSD=X', fred: 'DEXUSNZ' },
  { symbol: 'XAUUSD', label: 'Gold', yahoo: 'GC=F' },
  { symbol: 'XAGUSD', label: 'Silver', yahoo: 'SI=F' },
  { symbol: 'XPTUSD', label: 'Platinum', yahoo: 'PL=F' },
  { symbol: 'XCUUSD', label: 'Copper', yahoo: 'HG=F' },
  { symbol: 'IRONORE', label: 'Iron Ore', yahoo: 'TIO=F' },
  { symbol: 'USOIL', label: 'WTI Crude', yahoo: 'CL=F', fred: 'DCOILWTICO' },
  { symbol: 'NATGAS', label: 'Natural Gas', yahoo: 'NG=F', fred: 'DHHNGSP' },
  { symbol: 'US500', label: 'S&P 500', yahoo: '^GSPC', fred: 'SP500' },
  { symbol: 'US100', label: 'Nasdaq 100', yahoo: '^NDX', fred: 'NASDAQ100' },
  { symbol: 'US30', label: 'Dow Jones', yahoo: '^DJI', fred: 'DJIA' },
  { symbol: 'GER40', label: 'DAX 40', yahoo: '^GDAXI' },
  { symbol: 'UK100', label: 'FTSE 100', yahoo: '^FTSE' },
  { symbol: 'JP225', label: 'Nikkei 225', yahoo: '^N225' },
  { symbol: 'AUS200', label: 'ASX 200', yahoo: '^AXJO' },
  { symbol: 'BTCUSD', label: 'Bitcoin', yahoo: 'BTC-USD', fred: 'CBBTCUSD' },
  { symbol: 'ETHUSD', label: 'Ether', yahoo: 'ETH-USD', fred: 'CBETHUSD' },
  { symbol: 'XRPUSD', label: 'XRP', yahoo: 'XRP-USD' },
  { symbol: 'SOLUSD', label: 'Solana', yahoo: 'SOL-USD' },
];

const cache = new Map<string, { at: number; points: SeriesPoint[]; via: string }>();
const TTL = 30 * 60 * 1000;

export function parseYahooChart(json: any): SeriesPoint[] {
  const r = json?.chart?.result?.[0];
  const ts: number[] = r?.timestamp || [];
  const closes: Array<number | null> = r?.indicators?.adjclose?.[0]?.adjclose || r?.indicators?.quote?.[0]?.close || [];
  const out: SeriesPoint[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (typeof c !== 'number' || !Number.isFinite(c) || c <= 0) continue;
    const date = new Date(ts[i] * 1000).toISOString().slice(0, 10);
    if (seen.has(date)) { out[out.length - 1] = { date, value: c }; continue; }
    seen.add(date);
    out.push({ date, value: c });
  }
  return out;
}

async function loadOne(spec: PriceSpec): Promise<{ points: SeriesPoint[]; via: string }> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(spec.yahoo)}?range=1y&interval=1d`;
    const points = parseYahooChart(await fetchJson(url, { timeoutMs: 12_000, retries: 1 }));
    if (points.length > 60) return { points, via: 'Yahoo Finance' };
  } catch { /* fall through */ }
  if (spec.fred) {
    const points = (await getFredSeries(spec.fred, 1.2)).filter((p) => p.value > 0);
    if (points.length > 60) return { points, via: 'FRED' };
  }
  return { points: [], via: 'unavailable' };
}

export async function refreshPrices(force = false): Promise<void> {
  let ok = 0;
  await mapLimit(PRICE_UNIVERSE, 4, async (spec) => {
    const hit = cache.get(spec.symbol);
    if (!force && hit && Date.now() - hit.at < TTL) { if (hit.points.length) ok++; return; }
    try {
      const r = await loadOne(spec);
      if (r.points.length) { cache.set(spec.symbol, { at: Date.now(), ...r }); ok++; }
    } catch { /* keep previous cache */ }
  });
  if (ok > 0) markSuccess(PRICE_SOURCE_ID, ok);
  else markFailure(PRICE_SOURCE_ID, new Error('No price series could be loaded'));
}

export function getPrices(symbol: string): SeriesPoint[] {
  return cache.get(symbol)?.points || [];
}

export function getPriceVia(symbol: string): string {
  return cache.get(symbol)?.via || 'unavailable';
}

export function __setPricesForTest(symbol: string, points: SeriesPoint[]): void {
  cache.set(symbol, { at: Date.now(), points, via: 'test' });
}
