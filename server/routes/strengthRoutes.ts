/**
 * CURRENCY STRENGTH & CORRELATION — measured from daily closes (Dukascopy, Yahoo fallback):
 *   strength: for each of the 8 majors, the average % move against the other 7 over 1, 5 and 20 days
 *   correlation: Pearson correlation of daily % returns over the last 60 days between key markets
 * Used by the Exposure Guard to show what the user's open trades really bet on.
 */
import { Router, type Request, type Response } from 'express';
import { dailyCandles } from './copilotRoutes.js';
import type { Candle } from '../history/historyService.js';

export const strengthRouter = Router();

const CCY = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
const PAIRS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'EURGBP', 'EURJPY', 'EURCHF', 'EURCAD', 'EURAUD', 'EURNZD', 'GBPJPY', 'GBPCHF', 'GBPCAD', 'GBPAUD', 'GBPNZD', 'AUDJPY', 'AUDCAD', 'AUDCHF', 'AUDNZD', 'NZDJPY', 'NZDCAD', 'NZDCHF', 'CADJPY', 'CADCHF', 'CHFJPY'];
export const CORR_SET = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'GBPJPY', 'EURJPY', 'US30', 'US100', 'US500', 'USOIL', 'BTCUSD'];

const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
const pct = (c: Candle[], n: number) => { const a = c[c.length - 1 - n]?.close, b = c[c.length - 1]?.close; return a && b ? ((b - a) / a) * 100 : null; };

export function strengthFrom(series: Record<string, Candle[]>) {
  const out: Record<string, { d1: number | null; d5: number | null; d20: number | null; pairs: number }> = {};
  for (const ccy of CCY) {
    const acc: Record<'d1' | 'd5' | 'd20', number[]> = { d1: [], d5: [], d20: [] };
    for (const p of PAIRS) {
      const c = series[p]; if (!c || c.length < 22) continue;
      const sign = p.startsWith(ccy) ? 1 : p.endsWith(ccy) ? -1 : 0; if (!sign) continue;
      for (const [k, n] of [['d1', 1], ['d5', 5], ['d20', 20]] as const) { const v = pct(c, n); if (v !== null) acc[k].push(sign * v); }
    }
    const avg = (v: number[]) => (v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(3)) : null);
    out[ccy] = { d1: avg(acc.d1), d5: avg(acc.d5), d20: avg(acc.d20), pairs: acc.d20.length };
  }
  return out;
}

export function correlationFrom(series: Record<string, Candle[]>, days = 60) {
  const ret: Record<string, Map<string, number>> = {};
  for (const [s, c] of Object.entries(series)) {
    const m = new Map<string, number>();
    const cs = c.slice(-(days + 1));
    for (let i = 1; i < cs.length; i++) if (cs[i - 1].close > 0) m.set(dayKey(cs[i].timestamp), (cs[i].close - cs[i - 1].close) / cs[i - 1].close);
    ret[s] = m;
  }
  const syms = Object.keys(ret);
  const matrix: Record<string, Record<string, number | null>> = {};
  for (const a of syms) {
    matrix[a] = {};
    for (const b of syms) {
      if (a === b) { matrix[a][b] = 1; continue; }
      const xs: number[] = [], ys: number[] = [];
      for (const [k, v] of ret[a]) { const w = ret[b].get(k); if (w !== undefined) { xs.push(v); ys.push(w); } }
      if (xs.length < 20) { matrix[a][b] = null; continue; }
      const mx = xs.reduce((s, x) => s + x, 0) / xs.length, my = ys.reduce((s, y) => s + y, 0) / ys.length;
      let sxy = 0, sxx = 0, syy = 0;
      for (let i = 0; i < xs.length; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
      matrix[a][b] = sxx > 0 && syy > 0 ? Number((sxy / Math.sqrt(sxx * syy)).toFixed(2)) : null;
    }
  }
  return matrix;
}

let cache: { at: number; body: any } | null = null;
let building: Promise<any> | null = null;
async function build() {
  const syms = Array.from(new Set([...PAIRS, ...CORR_SET]));
  const series: Record<string, Candle[]> = {};
  const failed: string[] = [];
  const q = [...syms];
  await Promise.all(Array.from({ length: 8 }, async () => {
    for (let s = q.shift(); s; s = q.shift()) {
      try { const { candles } = await dailyCandles(s, 90); const c = candles.filter((x) => x.close > 0).sort((a, b) => a.timestamp - b.timestamp); if (c.length >= 22) series[s] = c; else failed.push(s); } catch { failed.push(s); }
    }
  }));
  const corrSeries = Object.fromEntries(CORR_SET.filter((s) => series[s]).map((s) => [s, series[s]]));
  return { ok: true, generatedAt: new Date().toISOString(), strength: strengthFrom(series), correlation: correlationFrom(corrSeries), symbols: Object.keys(corrSeries), failed,
    method: 'Strength = average % change of each currency against the other seven over 1, 5 and 20 trading days (28 pairs). Correlation = Pearson correlation of daily % returns over the last 60 trading days.',
    sources: ['Dukascopy daily prices (Yahoo Finance fallback)'] };
}

strengthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    if (!cache || Date.now() - cache.at > 10 * 60_000) {
      building = building || build().finally(() => { building = null; });
      const body = await building;
      if (body.symbols.length) cache = { at: Date.now(), body };
      else if (!cache) return res.status(503).json({ ok: false, error: 'Market data is not reachable right now — try again in a minute.' });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    res.json(cache!.body);
  } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || 'Unavailable') }); }
});
