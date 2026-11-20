/**
 * H1 LEVEL EVENTS — turns two consecutive hourly scans of the owner's SBT strategy into plain events:
 *   ACTIVATED    the strategy's own Level 1 / Level 2 entry fired on the H1 candle that has just closed
 *                (on the fundamentals' side) → trade setup ready, execute at the next H1 open
 *   READY        a level's model (liquidity) has just completed → price only has to test it
 *   DEACTIVATED  a level that was waiting is gone (zone invalidated, structure flipped) without an entry
 *   TRADE_CLOSED the strategy's trade on this pair has ended (stop, target or exit rule)
 *   MARKET_OPEN / MARKET_CLOSED  forex / metals week open & close
 * Pure functions (unit-tested); used by the hourly job and by the server that sends phone/PC pushes.
 */
export interface Zone { top: number; bottom: number; modelReady: boolean }
export interface Sig { time: number; dir: 1 | -1; level: 1 | 2; price: number; stop: number; target: number; zoneTop: number; zoneBottom: number; models: string[] }
export interface PairState {
  symbol: string; display: string; market: string; side: 1 | -1; score: number;
  ok: boolean; error?: string; lastCandle?: number; lastClose?: number; pip?: number; stale?: boolean;
  dir?: -1 | 0 | 1; level1?: Zone | null; level2?: Zone | null; level1Done?: boolean; inTrade?: boolean;
  signals?: Sig[];
  /** Entry on the candle that has just closed, on the fundamentals' side. */
  hit?: Sig | null;
  /** The level the open trade came from (latest same-side signal) when the strategy is in a trade. */
  tradeFrom?: Sig | null;
}
export type EventKind = 'ACTIVATED' | 'READY' | 'DEACTIVATED' | 'TRADE_CLOSED' | 'MARKET_OPEN' | 'MARKET_CLOSED';
export interface LevelEvent { id: string; kind: EventKind; symbol: string; display: string; side: 1 | -1 | 0; level?: 1 | 2; time: number; title: string; text: string; speech: string; price?: number; stop?: number; target?: number; zoneTop?: number; zoneBottom?: number; models?: string[]; score?: number }

const H1 = 3_600_000;
const sideWord = (s: number) => (s > 0 ? 'buy' : 'sell');
export const spell = (d: string) => d.replace('/', '').replace(/USDT$/, 'USD').split('').join(' ');
const sameZone = (a?: Zone | null, b?: Zone | null) => !!a && !!b && Math.abs(a.top - b.top) <= Math.abs(a.top) * 1e-6 + 1e-9 && Math.abs(a.bottom - b.bottom) <= Math.abs(a.bottom) * 1e-6 + 1e-9;

export function fmtP(x: number | undefined, pip?: number) {
  if (x === undefined || !Number.isFinite(x)) return '';
  const d = pip ? Math.max(0, Math.round(-Math.log10(pip)) + 1) : x >= 1000 ? 2 : x >= 20 ? 3 : 5;
  return x.toFixed(Math.min(6, d));
}

/** Pair state from one scan result. */
export function toState(meta: { symbol: string; display: string; market: string; side: 1 | -1; score: number }, scan: any): PairState {
  if (!scan?.ok) return { ...meta, ok: false, error: scan?.error || 'scan failed' };
  const signals: Sig[] = (scan.signals || []).map((s: any) => ({ time: s.time, dir: s.dir, level: s.level, price: s.price, stop: s.stop, target: s.target, zoneTop: s.zoneTop, zoneBottom: s.zoneBottom, models: s.models || [] }));
  const hit = !scan.stale ? signals.find((s) => s.time === scan.lastCandle && s.dir === meta.side) || null : null;
  const tradeFrom = scan.inTrade ? [...signals].reverse().find((s) => s.dir === meta.side) || null : null;
  return { ...meta, ok: true, lastCandle: scan.lastCandle, lastClose: scan.lastClose, pip: scan.pip, stale: !!scan.stale, dir: scan.dir, level1: scan.level1, level2: scan.level2, level1Done: !!scan.level1Done, inTrade: !!scan.inTrade, signals: signals.slice(-6), hit, tradeFrom };
}

export function diffEvents(prev: Record<string, PairState>, cur: PairState[], now = Date.now()): LevelEvent[] {
  const ev: LevelEvent[] = [];
  for (const c of cur) {
    if (!c.ok || c.stale) continue;
    const p = prev[c.symbol];
    const sw = sideWord(c.side);
    const sp = spell(c.display);
    const tag = `${c.symbol}`;
    if (c.hit) {
      const h = c.hit;
      const m = h.models.length ? ` (${h.models.join(' + ')})` : '';
      ev.push({ id: `${tag}-ACT-${h.time}-${h.level}`, kind: 'ACTIVATED', symbol: c.symbol, display: c.display, side: c.side, level: h.level, time: h.time + H1,
        title: `${sw.toUpperCase()} ${c.display} — Level ${h.level} activated (H1)`,
        text: `Trade setup ready: the H1 candle closed at ${fmtP(h.price, c.pip)} in the Level ${h.level} ${sw} zone ${fmtP(h.zoneBottom, c.pip)} – ${fmtP(h.zoneTop, c.pip)}${m}. Execute at the next H1 open · stop ${fmtP(h.stop, c.pip)} · take profit 1:2 ${fmtP(h.target, c.pip)}. Fundamentals ${c.side > 0 ? 'bullish' : 'bearish'} (${c.score > 0 ? '+' : ''}${Math.round(c.score)}).`,
        speech: `${sp}. Level ${h.level} activated. ${sw} setup is ready on the one-hour chart.${h.models.length ? ` Model ${h.models.join(' and ')}.` : ''} Fundamentals ${c.side > 0 ? 'bullish' : 'bearish'}. Time to execute: stop ${fmtP(h.stop, c.pip)}, target ${fmtP(h.target, c.pip)}.`,
        price: h.price, stop: h.stop, target: h.target, zoneTop: h.zoneTop, zoneBottom: h.zoneBottom, models: h.models, score: c.score });
    }
    if (!p || !p.ok) continue;
    const pSame = p.dir === c.side, cSame = c.dir === c.side;
    for (const n of [1, 2] as const) {
      const pz = pSame ? (n === 1 ? p.level1 : p.level2) : null;
      const cz = cSame ? (n === 1 ? c.level1 : c.level2) : null;
      if (cz && pz && sameZone(pz, cz) && !pz.modelReady && cz.modelReady && !(c.hit && c.hit.level === n)) {
        ev.push({ id: `${tag}-RDY-${n}-${cz.top}-${cz.bottom}`, kind: 'READY', symbol: c.symbol, display: c.display, side: c.side, level: n, time: (c.lastCandle || now) + H1,
          title: `${c.display} — Level ${n} ready (${sw})`, text: `The model at Level ${n} (${fmtP(cz.bottom, c.pip)} – ${fmtP(cz.top, c.pip)}) is complete. The setup activates when an H1 candle tests the zone.`,
          speech: `${sp}. Level ${n} is ready. Model complete, waiting for price to test the ${sw} zone.`, zoneTop: cz.top, zoneBottom: cz.bottom, score: c.score });
      }
      const usedByEntry = (c.hit && c.hit.level === n) || (c.inTrade && !p.inTrade);
      if (pz && !usedByEntry && (!cz || !sameZone(pz, cz))) {
        ev.push({ id: `${tag}-DEA-${n}-${pz.top}-${pz.bottom}`, kind: 'DEACTIVATED', symbol: c.symbol, display: c.display, side: c.side, level: n, time: (c.lastCandle || now) + H1,
          title: `${c.display} — Level ${n} deactivated`, text: `The ${sw} Level ${n} zone ${fmtP(pz.bottom, c.pip)} – ${fmtP(pz.top, c.pip)} is no longer valid${cz ? ` — a new Level ${n} formed at ${fmtP(cz.bottom, c.pip)} – ${fmtP(cz.top, c.pip)}` : !cSame ? ' (the H1 structure turned against the fundamentals)' : ''}. No trade from the old zone.`,
          speech: `${sp}. Level ${n} deactivated. Do not trade the old ${sw} zone.`, zoneTop: pz.top, zoneBottom: pz.bottom, score: c.score });
      }
    }
    if (p.inTrade && !c.inTrade) {
      const from = p.tradeFrom;
      ev.push({ id: `${tag}-TCL-${from?.time || p.lastCandle}`, kind: 'TRADE_CLOSED', symbol: c.symbol, display: c.display, side: c.side, level: from?.level, time: (c.lastCandle || now) + H1,
        title: `${c.display} — strategy trade closed`, text: `The strategy's ${sw} trade${from ? ` from Level ${from.level} (entry ${fmtP(from.price, c.pip)})` : ''} has ended (stop, target or exit rule). Levels are being rebuilt.`,
        speech: `${sp}. The ${sw} trade has closed.`, score: c.score });
    }
  }
  return ev;
}

/** Forex / metals week: closed from Friday 21:00 UTC to Sunday 22:00 UTC (approximation of broker hours). */
export function fxOpen(t: number) {
  const d = new Date(t); const dow = d.getUTCDay(); const h = d.getUTCHours();
  return !(dow === 6 || (dow === 5 && h >= 21) || (dow === 0 && h < 22));
}
export function marketEvents(prevOpen: boolean | undefined, now = Date.now()): { open: boolean; events: LevelEvent[] } {
  const open = fxOpen(now);
  if (prevOpen === undefined || prevOpen === open) return { open, events: [] };
  const day = new Date(now).toISOString().slice(0, 10);
  return { open, events: [open
    ? { id: `MKT-OPEN-${day}`, kind: 'MARKET_OPEN', symbol: 'FX', display: 'Forex & metals', side: 0, time: now, title: 'Market open', text: 'Forex and metals markets are open for the new week. Hourly level tracking is running.', speech: 'The market is now open. Level tracking is running.' }
    : { id: `MKT-CLOSE-${day}`, kind: 'MARKET_CLOSED', symbol: 'FX', display: 'Forex & metals', side: 0, time: now, title: 'Market closed', text: 'Forex and metals markets have closed for the weekend. Crypto keeps trading; levels resume on Sunday night.', speech: 'The market is now closed for the weekend.' }] };
}
