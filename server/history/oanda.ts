/**
 * OANDA v20 price history for forex + commodities. Configure on the server (Render → Environment):
 *   OANDA_TOKEN  — personal access token (OANDA account → Manage API Access; free on a practice/demo account)
 *   OANDA_ENV    — 'practice' (default) or 'live'
 * Any failure returns null so the caller falls back to the next source.
 */
import type { Candle, Tf } from './historyService.js';

export const oandaConfigured = () => Boolean(process.env.OANDA_TOKEN);
const HOST = () => (process.env.OANDA_ENV === 'live' ? 'https://api-fxtrade.oanda.com' : 'https://api-fxpractice.oanda.com');
let lastError: string | null = null; let lastOkAt = 0;

const COMMODITY: Record<string, string> = {
  xauusd: 'XAU_USD', xagusd: 'XAG_USD', xptusd: 'XPT_USD', xpdusd: 'XPD_USD', lightcmdusd: 'WTICO_USD', brentcmdusd: 'BCO_USD', gascmdusd: 'NATGAS_USD', coppercmdusd: 'XCU_USD',
};
export function oandaInstrument(dukaId: string): string | null {
  const id = dukaId.toLowerCase();
  if (COMMODITY[id]) return COMMODITY[id];
  if (/^[a-z]{6}$/.test(id)) return `${id.slice(0, 3).toUpperCase()}_${id.slice(3).toUpperCase()}`;
  return null;
}
const GRAN: Record<Tf, string> = { m1: 'M1', m5: 'M5', m15: 'M15', m30: 'M30', h1: 'H1', h4: 'H4', d1: 'D', w1: 'W', mn1: 'M' };

export async function oandaBefore(dukaId: string, tf: Tf, before: number, count: number): Promise<{ candles: Candle[]; reachedStart: boolean } | null> {
  const inst = oandaInstrument(dukaId);
  if (!oandaConfigured() || !inst) return null;
  try {
    const live = before >= Date.now() - 60_000;
    const n = Math.min(5000, Math.max(1, count));
    const q = `granularity=${GRAN[tf]}&count=${n}&price=M&alignmentTimezone=UTC&dailyAlignment=0&weeklyAlignment=Monday${live ? '' : `&to=${encodeURIComponent(new Date(before).toISOString())}`}`;
    const r = await fetch(`${HOST()}/v3/instruments/${inst}/candles?${q}`, { headers: { Authorization: `Bearer ${process.env.OANDA_TOKEN}`, 'Accept-Datetime-Format': 'UNIX' }, signal: AbortSignal.timeout(9000) });
    const j: any = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.errorMessage || `HTTP ${r.status}`);
    const candles: Candle[] = (j?.candles || []).map((c: any) => ({ timestamp: Math.round(Number(c.time) * 1000), open: +c.mid.o, high: +c.mid.h, low: +c.mid.l, close: +c.mid.c, volume: Number(c.volume) || 0 }))
      .filter((c: Candle) => Number.isFinite(c.timestamp) && c.timestamp < before + (live ? 86_400_000 : 0) && Number.isFinite(c.close));
    if (!candles.length) return null;
    lastOkAt = Date.now(); lastError = null;
    return { candles, reachedStart: candles.length < n * 0.5 };
  } catch (err: any) { lastError = String(err?.message || err); return null; }
}
export const oandaStatus = () => ({ configured: oandaConfigured(), env: process.env.OANDA_ENV === 'live' ? 'live' : 'practice', lastOkAt: lastOkAt || null, lastError });
