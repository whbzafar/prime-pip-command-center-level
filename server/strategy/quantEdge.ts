/**
 * PRIME PIP QUANT EDGE — the buy/sell setup chosen by a walk-forward study on real Dukascopy data
 * (2016 → today, H1/H4/D1, 16 instruments, 7 well-known strategy families, spreads + slippage charged).
 * Parameters were chosen on 2016–2022 only and confirmed on 2023 → today (never used for selection).
 *
 * Only the two engines that stayed profitable out-of-sample on every instrument of their class are used:
 *   TREND  (gold, silver; H4): close beyond the prior 55-bar high/low, in the direction of the 200 EMA.
 *          Initial stop 2×ATR(14); exit by a 3×ATR chandelier trailing stop.
 *   PULLBACK (US30, US100, US500, GER40; D1, long only): close above the 200 EMA and RSI(2) < 10.
 *          Exit when the close is back above the 5-day SMA, after 10 bars, or at a 2.5×ATR stop.
 * Everything else (FX majors, oil …) showed no edge after costs → the setup says "stand aside".
 * This file is an exact port of the research engine (same indicator maths, next-bar-open fills,
 * stop-first when a bar touches both stop and target). Educational — not financial advice.
 */
export interface Bar { timestamp: number; open: number; high: number; low: number; close: number }
export type Engine = 'TREND' | 'PULLBACK';
export interface EdgeConfig { symbol: string; engine: Engine; tf: 'H4' | 'D1'; spread: number; longOnly: boolean; label: string }

export const EDGE_UNIVERSE: EdgeConfig[] = [
  { symbol: 'XAUUSD', engine: 'TREND', tf: 'H4', spread: 0.30, longOnly: false, label: 'Gold' },
  { symbol: 'XAGUSD', engine: 'TREND', tf: 'H4', spread: 0.03, longOnly: false, label: 'Silver' },
  { symbol: 'US500', engine: 'PULLBACK', tf: 'D1', spread: 0.6, longOnly: true, label: 'S&P 500' },
  { symbol: 'US100', engine: 'PULLBACK', tf: 'D1', spread: 1.5, longOnly: true, label: 'Nasdaq 100' },
  { symbol: 'US30', engine: 'PULLBACK', tf: 'D1', spread: 3.0, longOnly: true, label: 'Dow Jones 30' },
  { symbol: 'GER40', engine: 'PULLBACK', tf: 'D1', spread: 1.5, longOnly: true, label: 'DAX 40' },
];
export const NO_EDGE = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'GBPJPY', 'EURJPY', 'USOIL'];

// ───────────── indicators (identical to pandas ewm(adjust=False) / rolling)
export const ema = (x: number[], n: number) => { const k = 2 / (n + 1); const o = new Array(x.length); o[0] = x[0]; for (let i = 1; i < x.length; i++) o[i] = x[i] * k + o[i - 1] * (1 - k); return o as number[]; };
const wilder = (x: number[], n: number) => { const a = 1 / n; const o = new Array(x.length); o[0] = x[0]; for (let i = 1; i < x.length; i++) o[i] = a * x[i] + (1 - a) * o[i - 1]; return o as number[]; };
export const atr = (h: number[], l: number[], c: number[], n = 14) => wilder(c.map((_, i) => { const pc = i ? c[i - 1] : c[0]; return Math.max(h[i] - l[i], Math.abs(h[i] - pc), Math.abs(l[i] - pc)); }), n);
export const rsi = (c: number[], n: number) => {
  const up = c.map((v, i) => (i ? Math.max(0, v - c[i - 1]) : 0)), dn = c.map((v, i) => (i ? Math.max(0, c[i - 1] - v) : 0));
  const au = wilder(up, n), ad = wilder(dn, n);
  return au.map((u, i) => 100 - 100 / (1 + u / (ad[i] === 0 ? 1e-12 : ad[i])));
};
const priorMax = (x: number[], n: number) => x.map((_, i) => { if (i < n) return NaN; let m = -Infinity; for (let j = i - n; j < i; j++) m = Math.max(m, x[j]); return m; });
const priorMin = (x: number[], n: number) => x.map((_, i) => { if (i < n) return NaN; let m = Infinity; for (let j = i - n; j < i; j++) m = Math.min(m, x[j]); return m; });
const sma = (x: number[], n: number) => x.map((_, i) => { if (i < n - 1) return NaN; let s = 0; for (let j = i - n + 1; j <= i; j++) s += x[j]; return s / n; });

/** H1 → H4 / D1 buckets aligned to UTC (same as pandas resample('4h'/'1D', label=left, closed=left)). */
export function aggregate(h1: Bar[], tf: 'H4' | 'D1'): Bar[] {
  const ms = tf === 'H4' ? 4 * 3_600_000 : 86_400_000;
  const out: Bar[] = [];
  for (const b of h1) {
    const t = b.timestamp - (b.timestamp % ms);
    const last = out[out.length - 1];
    if (last && last.timestamp === t) { last.high = Math.max(last.high, b.high); last.low = Math.min(last.low, b.low); last.close = b.close; }
    else out.push({ timestamp: t, open: b.open, high: b.high, low: b.low, close: b.close });
  }
  return out;
}

export interface Trade { dir: 1 | -1; entryTime: number; entry: number; stop0: number; exitTime: number | null; exit: number | null; r: number | null; reason: string }
export interface Signals { sig: number[]; stopd: number[]; trail: number; exitL: boolean[]; exitS: boolean[]; maxBars: number; a: number[]; levels: { up?: number; dn?: number; ema200: number; rsi2?: number; sma5?: number } }

export function signals(b: Bar[], cfg: EdgeConfig): Signals {
  const h = b.map((x) => x.high), l = b.map((x) => x.low), c = b.map((x) => x.close);
  const a = atr(h, l, c, 14), e200 = ema(c, 200);
  const n = b.length, z = new Array(n).fill(false);
  if (cfg.engine === 'TREND') {
    const up = priorMax(h, 55), dn = priorMin(l, 55);
    const sig = c.map((v, i) => (v > up[i] && v > e200[i] ? 1 : v < dn[i] && v < e200[i] && !cfg.longOnly ? -1 : 0));
    // Levels for the NEXT bar: the 55-bar channel including the latest closed bar.
    const lastUp = Math.max(...h.slice(-55)), lastDn = Math.min(...l.slice(-55));
    return { sig, stopd: a.map((x) => 2 * x), trail: 3, exitL: z, exitS: z, maxBars: 0, a, levels: { up: lastUp, dn: lastDn, ema200: e200[n - 1] } };
  }
  const r2 = rsi(c, 2), s5 = sma(c, 5);
  const sig = c.map((v, i) => (v > e200[i] && r2[i] < 10 ? 1 : 0));
  return { sig, stopd: a.map((x) => 2.5 * x), trail: 0, exitL: c.map((v, i) => v > s5[i]), exitS: z, maxBars: 10, a, levels: { ema200: e200[n - 1], rsi2: r2[n - 1], sma5: s5[n - 1] } };
}

/** Exact port of the research simulator. Returns closed trades and the open position (if any). */
export function simulate(b: Bar[], cfg: EdgeConfig, s: Signals): { trades: Trade[]; open: (Trade & { stop: number }) | null } {
  const sp = cfg.spread, n = b.length, trades: Trade[] = [];
  let pos = 0, entry = 0, stop = 0, risk = 0, bars = 0, cur: Trade | null = null;
  for (let i = 1; i < n; i++) {
    const { open: o, high: h, low: l, close: c } = b[i];
    if (pos !== 0 && cur) {
      bars++;
      let px = -1, reason = '';
      if (pos === 1) { if (l <= stop) { px = Math.min(o, stop) - sp * 0.1; reason = 'stop'; } }
      else if (h + sp >= stop) { px = Math.max(o + sp, stop) + sp * 0.1; reason = 'stop'; }
      if (px < 0) {
        const ex = (pos === 1 && s.exitL[i]) || (pos === -1 && s.exitS[i]);
        const tm = s.maxBars > 0 && bars >= s.maxBars;
        const rev = s.sig[i] === -pos;
        if (ex || tm || rev) { px = pos === 1 ? c : c + sp; reason = ex ? 'exit rule' : tm ? 'time stop' : 'reverse signal'; }
      }
      if (px >= 0) {
        cur.exitTime = b[i].timestamp; cur.exit = px; cur.reason = reason;
        cur.r = pos === 1 ? (px - entry) / risk : (entry - px) / risk;
        trades.push(cur); pos = 0; cur = null;
      } else if (s.trail > 0) {
        stop = pos === 1 ? Math.max(stop, h - s.trail * s.a[i]) : Math.min(stop, l + sp + s.trail * s.a[i]);
      }
    }
    if (pos === 0 && s.sig[i] !== 0 && i + 1 < n && s.stopd[i] > 0) {
      const d = s.sig[i] as 1 | -1;
      entry = b[i + 1].open + (d === 1 ? sp : 0); risk = s.stopd[i];
      stop = d === 1 ? entry - risk : entry + risk; pos = d; bars = 0;
      cur = { dir: d, entryTime: b[i + 1].timestamp, entry, stop0: stop, exitTime: null, exit: null, r: null, reason: '' };
    }
  }
  return { trades, open: cur ? { ...cur, stop } : null };
}

export function statsOf(rs: number[]) {
  if (!rs.length) return { n: 0, win: 0, expR: 0, pf: 0, dd: 0, totR: 0 };
  let eq = 0, peak = 0, dd = 0, g = 0, ls = 0;
  for (const r of rs) { eq += r; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq); if (r > 0) g += r; else ls -= r; }
  const f = (x: number, d = 2) => Number(x.toFixed(d));
  return { n: rs.length, win: f((100 * rs.filter((r) => r > 0).length) / rs.length, 1), expR: f(eq / rs.length, 3), pf: ls > 0 ? f(g / ls) : 99, dd: f(dd, 1), totR: f(eq, 1) };
}
