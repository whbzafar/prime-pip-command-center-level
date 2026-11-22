/**
 * CORRELATION & EXPOSURE GUARD — how the markets really move together, and how much hidden risk a set of trades carries.
 *   GET  /api/correlation            correlation matrix (30- and 90-day) from real daily closes (Dukascopy, Yahoo fallback)
 *   POST /api/correlation/exposure   { positions:[{symbol, side:'LONG'|'SHORT', riskPct}] } → net currency exposure,
 *                                    correlation-adjusted risk and a plain-language list of doubled-up / hedged trades
 * Every figure is computed from measured daily returns; nothing is modelled or invented. Educational — not financial advice.
 */
import { Router, type Request, type Response } from 'express';
import { dailyCandles } from './copilotRoutes.js';
import type { Candle } from '../history/historyService.js';

export const correlationRouter = Router();

export const CORR_UNIVERSE = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'USOIL', 'US30', 'US100', 'US500', 'GER40', 'BTCUSD'];
const FX = ['EUR', 'GBP', 'USD', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Daily log returns keyed by UTC date. */
export function returnsByDay(candles: Candle[]): Map<string, number> {
  const c = candles.filter((x) => x.close > 0).sort((a, b) => a.timestamp - b.timestamp);
  const out = new Map<string, number>();
  for (let i = 1; i < c.length; i++) out.set(dayKey(c[i].timestamp), Math.log(c[i].close / c[i - 1].close));
  return out;
}

export function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 12) return null;
  let sa = 0, sb = 0; for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let cov = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { const x = a[i] - ma, y = b[i] - mb; cov += x * y; va += x * x; vb += y * y; }
  if (va <= 0 || vb <= 0) return null;
  return Math.max(-1, Math.min(1, cov / Math.sqrt(va * vb)));
}

/** Correlation of two return maps over their most recent `window` common days. */
export function corrOver(a: Map<string, number>, b: Map<string, number>, window: number): { r: number | null; n: number } {
  const days = [...a.keys()].filter((d) => b.has(d)).sort().slice(-window);
  const r = pearson(days.map((d) => a.get(d)!), days.map((d) => b.get(d)!));
  return { r: r === null ? null : Number(r.toFixed(3)), n: days.length };
}

export function buildMatrix(series: Record<string, Map<string, number>>, symbols: string[], window: number) {
  return symbols.map((x) => symbols.map((y) => (x === y ? 1 : corrOver(series[x], series[y], window).r)));
}

export interface Position { symbol: string; side: 'LONG' | 'SHORT'; riskPct: number }

/** Currency legs of a position: long EURUSD = +EUR −USD; long XAUUSD = +XAU −USD; indices/oil are a bet on that asset (USD-quoted). */
export function legsOf(sym: string, side: 'LONG' | 'SHORT'): Array<[string, number]> {
  const s = side === 'LONG' ? 1 : -1;
  if (/^[A-Z]{6}$/.test(sym) && FX.includes(sym.slice(0, 3)) && FX.includes(sym.slice(3))) return [[sym.slice(0, 3), s], [sym.slice(3), -s]];
  const base = ({ XAUUSD: 'XAU', XAGUSD: 'XAG', USOIL: 'OIL', UKOIL: 'OIL', BTCUSD: 'BTC', ETHUSD: 'ETH', US30: 'US equities', US100: 'US equities', US500: 'US equities', GER40: 'EUR equities', UK100: 'GBP equities', JP225: 'JPY equities' } as Record<string, string>)[sym] || sym;
  return [[base, s], ['USD', -s]];
}

export function analyseExposure(positions: Position[], corr: (a: string, b: string) => number | null) {
  const pos = positions.filter((p) => p && p.riskPct > 0 && p.symbol).map((p) => ({ ...p, riskPct: Math.min(100, Number(p.riskPct)) }));
  const signed = pos.map((p) => (p.side === 'LONG' ? 1 : -1) * p.riskPct);
  const naive = pos.reduce((a, p) => a + p.riskPct, 0);
  let variance = 0;
  const unknown: string[] = [];
  for (let i = 0; i < pos.length; i++) for (let j = 0; j < pos.length; j++) {
    const c = i === j ? 1 : corr(pos[i].symbol, pos[j].symbol);
    if (c === null && i < j) unknown.push(`${pos[i].symbol}/${pos[j].symbol}`);
    variance += signed[i] * signed[j] * (c ?? 0);
  }
  const adjusted = Math.sqrt(Math.max(0, variance));
  const ccy = new Map<string, number>();
  pos.forEach((p) => legsOf(p.symbol, p.side).forEach(([c, s]) => ccy.set(c, (ccy.get(c) || 0) + s * p.riskPct)));
  const findings: Array<{ kind: 'double' | 'hedge'; a: string; b: string; r: number; text: string }> = [];
  for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
    const c = corr(pos[i].symbol, pos[j].symbol);
    if (c === null || Math.abs(c) < 0.6) continue;
    const same = pos[i].side === pos[j].side;
    const label = (p: Position) => `${p.side === 'LONG' ? 'long' : 'short'} ${p.symbol}`;
    if ((same && c > 0) || (!same && c < 0)) findings.push({ kind: 'double', a: label(pos[i]), b: label(pos[j]), r: c, text: `${label(pos[i])} and ${label(pos[j])} are the same bet (correlation ${c.toFixed(2)}) — together they carry more risk than the two stop-losses suggest.` });
    else findings.push({ kind: 'hedge', a: label(pos[i]), b: label(pos[j]), r: c, text: `${label(pos[i])} and ${label(pos[j])} largely cancel each other (correlation ${c.toFixed(2)}) — you pay two spreads for little net exposure.` });
  }
  const eff = variance > 0 ? Number(((naive * naive) / variance).toFixed(2)) : pos.length ? 0 : 0;
  return {
    count: pos.length,
    naiveRiskPct: Number(naive.toFixed(2)),
    adjustedRiskPct: Number(adjusted.toFixed(2)),
    multiplier: naive > 0 ? Number((adjusted / naive).toFixed(2)) : 0,
    effectiveBets: eff,
    currencies: [...ccy.entries()].map(([c, v]) => ({ currency: c, netRiskPct: Number(v.toFixed(2)) })).sort((a, b) => Math.abs(b.netRiskPct) - Math.abs(a.netRiskPct)),
    findings,
    unknownPairs: [...new Set(unknown)],
  };
}

let cache: { at: number; series: Record<string, Map<string, number>>; symbols: string[]; failed: string[]; sources: Record<string, string> } | null = null;
let building: Promise<NonNullable<typeof cache>> | null = null;
const TTL = 30 * 60_000;

async function load() {
  if (cache && Date.now() - cache.at < TTL) return cache;
  if (building) return building;
  building = (async () => {
    const series: Record<string, Map<string, number>> = {}; const failed: string[] = []; const sources: Record<string, string> = {};
    const queue = [...CORR_UNIVERSE];
    const work = async () => { for (let s = queue.shift(); s; s = queue.shift()) { try { const { candles, source } = await dailyCandles(s, 130); const m = returnsByDay(candles); if (m.size >= 40) { series[s] = m; sources[s] = source; } else failed.push(s); } catch { failed.push(s); } } };
    await Promise.all(Array.from({ length: 6 }, work));
    const symbols = CORR_UNIVERSE.filter((s) => series[s]);
    if (symbols.length < 4) throw new Error('Not enough live daily data to compute correlations right now.');
    cache = { at: Date.now(), series, symbols, failed, sources };
    return cache;
  })().finally(() => { building = null; });
  return building;
}

correlationRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const c = await load();
    const pairs: Array<{ a: string; b: string; r30: number | null; r90: number | null }> = [];
    for (let i = 0; i < c.symbols.length; i++) for (let j = i + 1; j < c.symbols.length; j++) pairs.push({ a: c.symbols[i], b: c.symbols[j], r30: corrOver(c.series[c.symbols[i]], c.series[c.symbols[j]], 30).r, r90: corrOver(c.series[c.symbols[i]], c.series[c.symbols[j]], 90).r });
    const strong = pairs.filter((p) => p.r90 !== null && Math.abs(p.r90) >= 0.75).sort((x, y) => Math.abs(y.r90!) - Math.abs(x.r90!)).slice(0, 12);
    const shifting = pairs.filter((p) => p.r30 !== null && p.r90 !== null && Math.abs(p.r30 - p.r90) >= 0.4).sort((x, y) => Math.abs(y.r30! - y.r90!) - Math.abs(x.r30! - x.r90!)).slice(0, 8);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({ ok: true, generatedAt: new Date(c.at).toISOString(), symbols: c.symbols, failed: c.failed, matrix30: buildMatrix(c.series, c.symbols, 30), matrix90: buildMatrix(c.series, c.symbols, 90), strong, shifting,
      method: 'Pearson correlation of daily log returns (close to close) over the last 30 and 90 trading days, from the same live daily candles as the Pro chart.',
      disclaimer: 'Correlations change over time and describe the past; they are not a forecast. Educational — not financial advice.' });
  } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || 'Correlation data is temporarily unavailable.') }); }
});

correlationRouter.post('/exposure', async (req: Request, res: Response) => {
  try {
    const raw = Array.isArray(req.body?.positions) ? req.body.positions.slice(0, 20) : [];
    const positions: Position[] = raw.map((p: any) => ({ symbol: String(p?.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), side: p?.side === 'SHORT' ? 'SHORT' : 'LONG', riskPct: Number(p?.riskPct) })).filter((p: Position) => p.symbol && Number.isFinite(p.riskPct) && p.riskPct > 0);
    if (!positions.length) return res.status(400).json({ ok: false, error: 'Add at least one position with a risk %.' });
    const c = await load();
    const corr = (a: string, b: string) => (a === b ? 1 : c.series[a] && c.series[b] ? corrOver(c.series[a], c.series[b], 90).r : null);
    res.json({ ok: true, ...analyseExposure(positions, corr), covered: positions.filter((p) => c.series[p.symbol]).length === positions.length });
  } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || 'Exposure check unavailable.') }); }
});

/** Shared correlation lookup (90-day) for other engines, e.g. the pre-trade checklist. */
export async function getCorrFn(): Promise<(a: string, b: string) => number | null> {
  const c = await load();
  return (a, b) => (a === b ? 1 : c.series[a] && c.series[b] ? corrOver(c.series[a], c.series[b], 90).r : null);
}
