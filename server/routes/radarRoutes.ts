/**
 * MARKET REGIME RADAR — every tradable pair, ranked live:
 *   regime   : TRENDING (efficiency ratio high), RANGING (low), or COILING (Bollinger width in the
 *              bottom 20% of the last ~100 days → a breakout is building), BREAKOUT (close beyond the
 *              prior 20-day range)
 *   direction: EMA 20/50 + price vs EMA 20
 *   fundamentals: live macro engine score/confidence
 *   news risk: high-impact releases for the pair's currencies within 24h
 * Opportunity score rewards trend/breakout aligned with fundamentals and penalises imminent news.
 * Only daily candles and the live engine are used — no invented values.
 */
import { Router, type Request, type Response } from 'express';
import { getSnapshot } from '../macro/macroService.js';
import { dailyCandles } from './copilotRoutes.js';
import type { Candle } from '../history/historyService.js';

export const radarRouter = Router();

const FX = ['EUR', 'GBP', 'USD', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
const MAJORS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD', 'EURGBP', 'EURJPY', 'EURCHF', 'EURCAD', 'EURAUD', 'EURNZD', 'GBPJPY', 'GBPCHF', 'GBPCAD', 'GBPAUD', 'GBPNZD', 'AUDJPY', 'AUDCAD', 'AUDCHF', 'AUDNZD', 'NZDJPY', 'NZDCAD', 'NZDCHF', 'CADJPY', 'CADCHF', 'CHFJPY'];
export const RADAR_UNIVERSE = [...MAJORS, 'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'US30', 'US100', 'US500', 'GER40', 'UK100', 'JP225', 'BTCUSD', 'ETHUSD'];

const ema = (v: number[], n: number) => { const k = 2 / (n + 1); let e = v[0]; for (let i = 1; i < v.length; i++) e = v[i] * k + e * (1 - k); return e; };
const sd = (v: number[]) => { const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); };
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export type Regime = 'TRENDING' | 'RANGING' | 'COILING' | 'BREAKOUT';
export function analyseRegime(raw: Candle[]) {
  const c = raw.filter((x) => x.high > 0 && x.low > 0 && x.close > 0).sort((a, b) => a.timestamp - b.timestamp);
  if (c.length < 60) return null;
  const cl = c.map((x) => x.close);
  const n = cl.length, price = cl[n - 1];
  // Efficiency ratio over 20 bars: net move / total path (0 = chop, 1 = straight line).
  const net = Math.abs(cl[n - 1] - cl[n - 21]);
  let path = 0; for (let i = n - 20; i < n; i++) path += Math.abs(cl[i] - cl[i - 1]);
  const er = path > 0 ? net / path : 0;
  // Bollinger width (20,2) relative to price, and where today's width ranks over the available history.
  const widths: number[] = [];
  for (let i = 19; i < n; i++) { const w = cl.slice(i - 19, i + 1); const m = w.reduce((a, b) => a + b, 0) / 20; widths.push((4 * sd(w)) / m); }
  const wNow = widths[widths.length - 1];
  const lookback = widths.slice(-100);
  const widthPct = Math.round((lookback.filter((w) => w < wNow).length / lookback.length) * 100);
  const medW = [...lookback].sort((a, b) => a - b)[Math.floor(lookback.length / 2)];
  const squeezed = widthPct <= 20 && wNow < 0.75 * medW; // genuinely tighter than usual, not just a flat series
  const prior = c.slice(-21, -1);
  const hi20 = Math.max(...prior.map((x) => x.high)), lo20 = Math.min(...prior.map((x) => x.low));
  const e20 = ema(cl.slice(-60), 20), e50 = ema(cl, 50);
  let tr = 0; for (let i = n - 14; i < n; i++) tr += Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close));
  const atr = tr / 14;
  const dir = clamp((e20 > e50 ? 50 : -50) + clamp(((price - e20) / atr) * 25, -50, 50), -100, 100);
  const broke = price > hi20 ? 1 : price < lo20 ? -1 : 0;
  const regime: Regime = broke !== 0 ? 'BREAKOUT' : squeezed ? 'COILING' : er >= 0.35 ? 'TRENDING' : 'RANGING';
  const change5 = ((price - cl[n - 6]) / cl[n - 6]) * 100;
  return { price, er: Number(er.toFixed(2)), widthPct, hi20, lo20, atr, atrPct: (atr / price) * 100, direction: Math.round(dir), broke, regime, change5: Number(change5.toFixed(2)) };
}

function ccysOf(sym: string) {
  if (/^[A-Z]{6}$/.test(sym) && FX.includes(sym.slice(0, 3)) && FX.includes(sym.slice(3))) return [sym.slice(0, 3), sym.slice(3)];
  return ({ GER40: ['EUR'], UK100: ['GBP'], JP225: ['JPY'] } as Record<string, string[]>)[sym] || ['USD'];
}

let cache: { at: number; body: any } | null = null;
let building: Promise<any> | null = null;

async function build() {
  const snap: any = await getSnapshot().catch(() => null);
  const now = Date.now();
  const out: any[] = [];
  const failed: string[] = [];
  const queue = [...RADAR_UNIVERSE];
  const work = async () => {
    for (let sym = queue.shift(); sym; sym = queue.shift()) {
      try {
        const { candles } = await dailyCandles(sym, 140);
        const r = analyseRegime(candles);
        if (!r) { failed.push(sym); continue; }
        const pair = snap?.pairs?.find((p: any) => p.symbol === sym);
        const asset = !pair ? snap?.assets?.find((a: any) => a.symbol === sym.replace(/USD$/, '')) : null;
        const f = pair?.score ?? asset?.score ?? null;
        const fConf = pair?.confidence ?? asset?.confidence ?? 0;
        const ccys = ccysOf(sym);
        const ev = (snap?.upcoming || [])
          .filter((u: any) => ccys.includes(String(u.asset).toUpperCase()) && String(u.importance).toLowerCase() === 'high')
          .map((u: any) => ({ currency: u.asset, title: u.title, inHours: Number(((Date.parse(u.scheduledAt) - now) / 3_600_000).toFixed(1)) }))
          .filter((u: any) => u.inHours > -1 && u.inHours <= 24)
          .sort((a: any, b: any) => a.inHours - b.inHours);
        // Opportunity: direction strength × regime quality, boosted when fundamentals agree, cut when they disagree.
        const regimeQ = { TRENDING: 1, BREAKOUT: 1.1, COILING: 0.6, RANGING: 0.35 }[r.regime];
        const techDir = r.regime === 'BREAKOUT' ? r.broke * 100 : r.direction;
        const fAlign = f === null ? 0 : Math.sign(f) === Math.sign(techDir) ? Math.min(1, Math.abs(f) / 50) * (fConf / 100) : -Math.min(1, Math.abs(f) / 50) * (fConf / 100);
        let score = Math.abs(techDir) * regimeQ * (1 + 0.6 * fAlign);
        if (ev.some((e: any) => e.inHours <= 6)) score *= 0.6;
        score = Math.round(clamp(score, 0, 100));
        const side = Math.abs(techDir) < 25 ? 'NEUTRAL' : techDir > 0 ? 'LONG' : 'SHORT';
        const setup = r.regime === 'COILING'
          ? `Volatility squeeze (width in the lowest ${Math.max(1, r.widthPct)}% of recent history) — watch for a break of ${r.lo20.toPrecision(6)}–${r.hi20.toPrecision(6)}${f !== null && Math.abs(f) >= 15 ? `; fundamentals favour the ${f > 0 ? 'upside' : 'downside'}` : ''}.`
          : r.regime === 'BREAKOUT' ? `Closed ${r.broke > 0 ? 'above the 20-day high' : 'below the 20-day low'}${fAlign > 0 ? ' with fundamentals behind it' : fAlign < 0 ? ' against the fundamentals — be careful of a false break' : ''}.`
          : r.regime === 'TRENDING' ? `Clean ${techDir > 0 ? 'up' : 'down'}trend (efficiency ${r.er})${fAlign > 0 ? ', fundamentals agree' : fAlign < 0 ? ', fundamentals disagree' : ''} — trade pullbacks in the trend direction.`
          : `Choppy range (efficiency ${r.er}) — trend trades tend to fail; fade the edges or stand aside.`;
        out.push({ symbol: sym, ...r, fundamentals: f === null ? null : Math.round(f), fConfidence: Math.round(fConf), side, score, events: ev, setup, alignment: fAlign > 0.05 ? 'aligned' : fAlign < -0.05 ? 'conflict' : 'neutral' });
      } catch { failed.push(sym); }
    }
  };
  await Promise.all(Array.from({ length: 8 }, work));
  out.sort((a, b) => b.score - a.score);
  return {
    ok: true, generatedAt: new Date().toISOString(), count: out.length, failed,
    summary: { trending: out.filter((x) => x.regime === 'TRENDING').length, ranging: out.filter((x) => x.regime === 'RANGING').length, coiling: out.filter((x) => x.regime === 'COILING').length, breakout: out.filter((x) => x.regime === 'BREAKOUT').length },
    rows: out,
    method: 'Daily candles (Dukascopy, Yahoo fallback). Regime: BREAKOUT = close beyond the prior 20-day high/low; COILING = Bollinger(20,2) width in the lowest 20% of ~100 days; TRENDING = 20-day efficiency ratio ≥ 0.35; else RANGING. Opportunity = technical direction × regime quality, ±60% for fundamental agreement (scaled by confidence), −40% if high-impact news is within 6h.',
    disclaimer: 'Educational analysis from live data. Not financial advice.',
  };
}

radarRouter.get('/', async (_req: Request, res: Response) => {
  try {
    if (!cache || Date.now() - cache.at > 10 * 60_000) {
      building = building || build().finally(() => { building = null; });
      const body = await building;
      if (body.count > 0) cache = { at: Date.now(), body };
      else if (!cache) return res.status(503).json({ ok: false, error: 'Market data is not reachable right now — try again in a minute.' });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    res.json(cache!.body);
  } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || 'Radar unavailable') }); }
});
