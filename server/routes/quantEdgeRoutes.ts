/** GET /api/quant-edge — live signals + full walk-forward statistics of the Prime Pip Quant Edge setup. */
import { Router, type Request, type Response } from 'express';
import { archiveBefore } from '../history/archive.js';
import { dukaRange } from '../history/historyService.js';
import { redisCmd } from '../durableStore.js';
import { EDGE_UNIVERSE, NO_EDGE, aggregate, signals, simulate, statsOf, type Bar, type EdgeConfig } from '../strategy/quantEdge.js';

export const quantEdgeRouter = Router();
const SPLIT = Date.UTC(2023, 0, 1);
const START = Date.UTC(2016, 0, 1);
const DUKA: Record<string, string> = { XAUUSD: 'xauusd', XAGUSD: 'xagusd', US500: 'usa500idxusd', US100: 'usatechidxusd', US30: 'usa30idxusd', GER40: 'deuidxeur' };

async function h1History(sym: string): Promise<{ bars: Bar[]; live: number }> {
  const r = await archiveBefore(sym, 'h1', Date.now() + 3_600_000, 130_000,
    async (_native, after, until) => (await dukaRange(DUKA[sym], 'h1', after, until)) as any, 30_000);
  if (!r || !r.candles.length) throw new Error(`No history for ${sym}`);
  return { bars: r.candles.filter((c: any) => c.timestamp >= START && c.high >= c.low && c.close > 0).map((c: any) => ({ timestamp: c.timestamp, open: c.open, high: c.high, low: c.low, close: c.close })), live: r.live };
}

async function analyse(cfg: EdgeConfig) {
  const { bars: h1, live } = await h1History(cfg.symbol);
  let bars = aggregate(h1, cfg.tf);
  const ms = cfg.tf === 'H4' ? 4 * 3_600_000 : 86_400_000;
  if (bars.length && bars[bars.length - 1].timestamp + ms > Date.now()) bars = bars.slice(0, -1); // only closed bars
  const s = signals(bars, cfg);
  const { trades, open } = simulate(bars, cfg, s);
  const rs = trades.map((t) => t.r as number);
  const yrs: Record<string, number> = {};
  for (const t of trades) { const y = new Date(t.entryTime).getUTCFullYear(); yrs[y] = Number(((yrs[y] || 0) + (t.r as number)).toFixed(1)); }
  let eq = 0; const curve = trades.map((t) => { eq += t.r as number; return [t.exitTime, Number(eq.toFixed(2))]; });
  const step = Math.max(1, Math.floor(curve.length / 150));
  const last = bars[bars.length - 1];
  const lastSig = s.sig[s.sig.length - 1];
  const dp = last.close >= 1000 ? 2 : last.close >= 20 ? 3 : 5;
  const fx = (x: number | undefined) => (x === undefined || !Number.isFinite(x) ? null : Number(x.toFixed(dp)));
  // What would trigger next, in plain terms.
  let watch: string;
  if (open) watch = `In a ${open.dir === 1 ? 'BUY' : 'SELL'} since ${new Date(open.entryTime).toISOString().slice(0, 16).replace('T', ' ')} UTC at ${fx(open.entry)}. ${cfg.engine === 'TREND' ? `Trailing stop now ${fx(open.stop)} (moves with price, never back).` : `Stop ${fx(open.stop)}; exits when a daily close is above the 5-day average (${fx(s.levels.sma5)}) or after 10 days.`}`;
  else if (cfg.engine === 'TREND') {
    const above = last.close > s.levels.ema200;
    watch = above
      ? `Uptrend (above 200 EMA ${fx(s.levels.ema200)}). BUY if a ${cfg.tf} candle closes above ${fx(s.levels.up)}.`
      : `Downtrend (below 200 EMA ${fx(s.levels.ema200)}). ${cfg.longOnly ? 'No longs until price is back above it.' : `SELL if a ${cfg.tf} candle closes below ${fx(s.levels.dn)}.`}`;
  } else {
    watch = last.close > s.levels.ema200
      ? `Uptrend (above 200-day EMA ${fx(s.levels.ema200)}). BUY at the next open after a daily close with RSI(2) under 10 (now ${s.levels.rsi2?.toFixed(1)}).`
      : `Below the 200-day EMA (${fx(s.levels.ema200)}) — the setup stays flat until the uptrend returns.`;
  }
  const status = open ? (open.dir === 1 ? 'LONG' : 'SHORT') : lastSig === 1 ? 'BUY_NEXT_OPEN' : lastSig === -1 ? 'SELL_NEXT_OPEN' : 'FLAT';
  return {
    symbol: cfg.symbol, label: cfg.label, engine: cfg.engine, tf: cfg.tf, longOnly: cfg.longOnly,
    lastBar: last.timestamp, price: fx(last.close), status, watch, liveBars: live,
    open: open ? { dir: open.dir, entryTime: open.entryTime, entry: fx(open.entry), stop: fx(open.stop), initialStop: fx(open.stop0), unrealisedR: Number((((last.close - open.entry) * open.dir) / Math.abs(open.entry - open.stop0)).toFixed(2)) } : null,
    stats: { all: statsOf(rs), inSample: statsOf(trades.filter((t) => t.entryTime < SPLIT).map((t) => t.r as number)), outOfSample: statsOf(trades.filter((t) => t.entryTime >= SPLIT).map((t) => t.r as number)),
      longs: statsOf(trades.filter((t) => t.dir === 1).map((t) => t.r as number)), shorts: statsOf(trades.filter((t) => t.dir === -1).map((t) => t.r as number)),
      perYear: Number((trades.length / ((last.timestamp - bars[0].timestamp) / (365.25 * 86_400_000))).toFixed(1)), years: yrs, from: bars[0].timestamp },
    curve: curve.filter((_, i) => i % step === 0 || i === curve.length - 1),
    recent: trades.slice(-12).reverse().map((t) => ({ dir: t.dir, entryTime: t.entryTime, entry: fx(t.entry), exitTime: t.exitTime, exit: fx(t.exit ?? undefined), r: Number((t.r as number).toFixed(2)), reason: t.reason })),
  };
}

let mem: { at: number; body: any } | null = null;
let building: Promise<any> | null = null;
async function build() {
  const settled = await Promise.allSettled(EDGE_UNIVERSE.map(analyse));
  const rows = settled.map((r, i) => (r.status === 'fulfilled' ? r.value : { symbol: EDGE_UNIVERSE[i].symbol, label: EDGE_UNIVERSE[i].label, error: String((r as any).reason?.message || r.reason) }));
  return {
    ok: true, generatedAt: new Date().toISOString(), rows, noEdge: NO_EDGE,
    research: {
      period: '2016 → today (H1 Dukascopy data aggregated to H4 / D1)', split: 'Parameters chosen on 2016–2022; 2023 → today is the untouched out-of-sample test.',
      tested: ['Donchian breakout + 200 EMA', 'Trend pullback (EMA 50/200 + RSI)', 'RSI(2) mean reversion', 'Bollinger squeeze breakout', 'Supertrend + ADX', 'MACD trend cross', 'Asian-range (London) breakout'],
      instruments: 16, timeframes: ['H1', 'H4', 'D1'],
      costs: 'Every trade pays a realistic spread (e.g. gold 0.30, EURUSD 1.0 pip, US500 0.6) plus slippage on stops; fills at the next bar open.',
      finding: 'After costs, intraday (H1) versions of every strategy lost money, and no strategy kept an edge on the FX majors or oil out-of-sample. Two engines stayed profitable both in- and out-of-sample on every instrument of their class: 55-bar trend breakouts on gold & silver (H4), and RSI(2) pullbacks in an uptrend on stock indices (D1).',
    },
    disclaimer: 'Backtested results are not a promise of future returns. Live trading has extra costs (swaps, commissions, slippage). Educational — not financial advice.',
  };
}

quantEdgeRouter.get('/', async (_req: Request, res: Response) => {
  try {
    if (!mem || Date.now() - mem.at > 15 * 60_000) {
      const cached = await redisCmd(['GET', 'ppfx:quantedge:v1']).catch(() => null);
      const parsed = cached ? JSON.parse(cached) : null;
      if (parsed && Date.now() - Date.parse(parsed.generatedAt) < 15 * 60_000) mem = { at: Date.parse(parsed.generatedAt), body: parsed };
      else {
        building = building || build().finally(() => { building = null; });
        const body = await building;
        if (body.rows.some((r: any) => !r.error)) { mem = { at: Date.now(), body }; await redisCmd(['SET', 'ppfx:quantedge:v1', JSON.stringify(body), 'EX', 3600]).catch(() => null); }
        else if (!mem) return res.status(503).json({ ok: false, error: 'Price history is not reachable right now — try again in a minute.' });
      }
    }
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    res.json(mem!.body);
  } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || 'Unavailable') }); }
});
