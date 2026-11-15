/**
 * TRADE COPILOT — one live, rule-based trade plan per instrument, built only from real data:
 *   • price structure: Dukascopy daily candles (same feed as the Pro chart) → trend (EMA 20/50),
 *     volatility (ATR 14), 20-day swing high/low
 *   • fundamentals: the live macro engine's pair score, confidence and explanation
 *   • crowd positioning: live retail long/short (contrarian)
 *   • event risk: scheduled high-impact releases for either currency in the next 48 hours
 * Every number shown is computed from those inputs; nothing is invented. When the inputs disagree or
 * are missing, the copilot says "wait" instead of forcing a trade. Educational — not financial advice.
 */
import { Router, type Request, type Response } from 'express';
import { getSnapshot } from '../macro/macroService.js';
import { getSentiment } from '../macro/sources/sentiment.js';
import { dukaBefore, yahooAny, type Candle } from '../history/historyService.js';

export const copilotRouter = Router();

// Dukascopy instrument id + Yahoo fallback per tradable ticker (the Pro chart's own feed).
const FEED: Record<string, { duka?: string; yahoo: string }> = {
  XAUUSD: { duka: 'xauusd', yahoo: 'GC=F' }, XAGUSD: { duka: 'xagusd', yahoo: 'SI=F' },
  USOIL: { duka: 'lightcmdusd', yahoo: 'CL=F' }, UKOIL: { duka: 'brentcmdusd', yahoo: 'BZ=F' },
  US30: { duka: 'usa30idxusd', yahoo: '^DJI' }, US100: { duka: 'usatechidxusd', yahoo: '^NDX' }, US500: { duka: 'usa500idxusd', yahoo: '^GSPC' },
  GER40: { duka: 'deuidxeur', yahoo: '^GDAXI' }, UK100: { duka: 'gbridxgbp', yahoo: '^FTSE' }, JP225: { duka: 'jpnidxjpy', yahoo: '^N225' },
  BTCUSD: { yahoo: 'BTC-USD' }, ETHUSD: { yahoo: 'ETH-USD' },
};
const FX = ['EUR', 'GBP', 'USD', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
function feedFor(sym: string) {
  if (FEED[sym]) return FEED[sym];
  if (/^[A-Z]{6}$/.test(sym) && FX.includes(sym.slice(0, 3)) && FX.includes(sym.slice(3))) {
    const y = sym.startsWith('USD') ? `${sym.slice(3)}=X` : `${sym}=X`;
    return { duka: sym.toLowerCase(), yahoo: y };
  }
  return null;
}

const ema = (v: number[], n: number) => { const k = 2 / (n + 1); let e = v[0]; for (let i = 1; i < v.length; i++) e = v[i] * k + e * (1 - k); return e; };
function atr(c: Candle[], n = 14) {
  const tr: number[] = [];
  for (let i = 1; i < c.length; i++) tr.push(Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close)));
  const last = tr.slice(-n);
  return last.reduce((a, b) => a + b, 0) / Math.max(1, last.length);
}
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

async function dailyCandles(sym: string): Promise<{ candles: Candle[]; source: string }> {
  const f = feedFor(sym);
  if (!f) throw new Error('This instrument is not covered by the copilot yet.');
  if (f.duka) {
    try { const r = await dukaBefore(f.duka, 'd1', Date.now() + 86_400_000, 80, 8_000); if (r.candles.length >= 30) return { candles: r.candles, source: 'Dukascopy (daily)' }; } catch { /* fall back */ }
  }
  const r = await yahooAny(f.yahoo, 'd1', Date.now() + 86_400_000, 80);
  return { candles: r.candles, source: `Yahoo Finance ${f.yahoo} (daily)` };
}

/** Pure: build the copilot answer from candles + macro snapshot + sentiment (unit-tested). */
export function buildCopilot(sym: string, candles: Candle[], source: string, snap: any, sent: any, now = Date.now()): any {
    const c = candles.filter((x) => x.high > 0 && x.low > 0).sort((a, b) => a.timestamp - b.timestamp);
    if (c.length < 30) return null;
    const closes = c.map((x) => x.close);
    const price = closes[closes.length - 1];
    const a14 = atr(c, 14);
    const e20 = ema(closes.slice(-60), 20), e50 = ema(closes.slice(-80), 50);
    const recent = c.slice(-20);
    const swingHigh = Math.max(...recent.map((x) => x.high)), swingLow = Math.min(...recent.map((x) => x.low));
    // Trend score −100..+100: EMA alignment + price vs EMA20 in ATR units.
    const trend = clamp((e20 > e50 ? 50 : -50) + clamp(((price - e20) / a14) * 25, -50, 50), -100, 100);

    // Fundamentals (live engine)
    const pair = snap?.pairs?.find((p: any) => p.symbol === sym) || null;
    const asset = !pair ? snap?.assets?.find((a: any) => a.symbol === sym.replace(/USD$/, '')) : null;
    const fScore: number | null = pair?.score ?? asset?.score ?? null;
    const fConf: number = pair?.confidence ?? asset?.confidence ?? 0;

    // Retail crowd (contrarian): crowd long → bearish tilt.
    const sSyms = [sym, `${sym}T`];
    const row = sent?.rows?.find((r: any) => sSyms.includes(r.symbol) && r.method === 'measured') || sent?.rows?.find((r: any) => sSyms.includes(r.symbol));
    const crowd = row ? clamp((50 - row.longPct) * 2, -100, 100) : null;

    // Event risk: high-impact releases for this instrument's currencies in the next 48h.
    const ccys = /^[A-Z]{6}$/.test(sym) ? [sym.slice(0, 3), sym.slice(3)] : sym.startsWith('XA') ? ['USD'] : sym.startsWith('US') ? ['USD'] : sym === 'GER40' ? ['EUR'] : sym === 'UK100' ? ['GBP'] : sym === 'JP225' ? ['JPY'] : ['USD'];
    const events = (snap?.upcoming || [])
      .filter((u: any) => ccys.includes(String(u.asset).toUpperCase()) && String(u.importance).toLowerCase() === 'high')
      .map((u: any) => ({ ...u, inH: (Date.parse(u.scheduledAt) - now) / 3_600_000 }))
      .filter((u: any) => u.inH > -1 && u.inH <= 48)
      .sort((x: any, y: any) => x.inH - y.inH)
      .slice(0, 5);

    // Combine: fundamentals 45% (scaled by confidence), trend 35%, crowd 20%. Missing inputs drop out and
    // the rest are re-weighted, so the score never pretends to know more than it does.
    const parts: Array<{ k: string; v: number; w: number }> = [];
    if (fScore !== null) parts.push({ k: 'Fundamentals', v: fScore, w: 0.45 * clamp(fConf / 100, 0.3, 1) });
    parts.push({ k: 'Trend', v: trend, w: 0.35 });
    if (crowd !== null) parts.push({ k: 'Crowd (contrarian)', v: crowd, w: 0.2 });
    const wsum = parts.reduce((s, p) => s + p.w, 0);
    const combined = parts.reduce((s, p) => s + p.v * p.w, 0) / wsum;
    const agree = parts.filter((p) => Math.sign(p.v) === Math.sign(combined) && Math.abs(p.v) >= 10).length;
    const eventSoon = events.find((e: any) => e.inH <= 6);

    let action: 'BUY' | 'SELL' | 'WAIT' = Math.abs(combined) >= 20 && agree >= 2 ? (combined > 0 ? 'BUY' : 'SELL') : 'WAIT';
    const reasons: string[] = [];
    if (action === 'WAIT') reasons.push(Math.abs(combined) < 20 ? 'The inputs are mixed — no clear edge right now.' : 'Only one input supports the direction; the others disagree or are flat.');
    if (eventSoon) reasons.push(`High-impact ${eventSoon.asset} release "${eventSoon.title}" in ${eventSoon.inH < 1 ? 'under 1 hour' : `${Math.round(eventSoon.inH)}h`} — expect a volatility spike.`);

    const dp = price >= 1000 ? 2 : price >= 20 ? 3 : 5;
    const r = (x: number) => Number(x.toFixed(dp));
    let plan: any = null;
    if (action !== 'WAIT') {
      const dir = action === 'BUY' ? 1 : -1;
      // Entry on a pullback of up to ½ ATR; stop 1.5 ATR beyond the entry (or beyond the swing, if nearer).
      const entryNear = price, entryFar = price - dir * 0.5 * a14;
      const entryMid = (entryNear + entryFar) / 2;
      const atrStop = entryMid - dir * 1.5 * a14;
      const swingStop = dir > 0 ? swingLow - 0.1 * a14 : swingHigh + 0.1 * a14;
      const stop = dir > 0 ? Math.max(atrStop, Math.min(swingStop, entryMid - 0.8 * a14)) : Math.min(atrStop, Math.max(swingStop, entryMid + 0.8 * a14));
      const risk = Math.abs(entryMid - stop);
      const t1 = entryMid + dir * risk, t2 = entryMid + dir * 2 * risk;
      const swingTarget = dir > 0 ? swingHigh : swingLow;
      plan = {
        direction: action, entryZone: [r(Math.min(entryNear, entryFar)), r(Math.max(entryNear, entryFar))], entry: r(entryMid),
        stop: r(stop), targets: [r(t1), r(t2)], swingTarget: (swingTarget - entryMid) * dir > risk * 0.5 ? r(swingTarget) : null,
        riskPerUnit: risk, rr: [1, 2],
        invalidation: dir > 0
          ? `A daily close below ${r(stop)}, or the fundamentals turning bearish, cancels this idea.`
          : `A daily close above ${r(stop)}, or the fundamentals turning bullish, cancels this idea.`,
      };
      if (eventSoon) plan.note = 'Consider waiting until after the release, or trading smaller.';
    }

    const body = {
      ok: true, symbol: sym, generatedAt: new Date().toISOString(), price: r(price), digits: dp,
      action, conviction: Math.round(Math.abs(combined)), combined: Math.round(combined),
      inputs: {
        fundamentals: fScore === null ? null : { score: Math.round(fScore), bullishPct: pair?.bullishPct ?? asset?.bullishPct ?? null, confidence: Math.round(fConf), explanation: pair?.explanation || null },
        trend: { score: Math.round(trend), ema20: r(e20), ema50: r(e50), atr14: r(a14), swingHigh: r(swingHigh), swingLow: r(swingLow) },
        crowd: row ? { longPct: row.longPct, shortPct: row.shortPct, contrarian: crowd !== null ? Math.round(crowd) : null, sources: (row.sources || []).map((s: any) => s.name) } : null,
      },
      weights: parts.map((p) => ({ input: p.k, score: Math.round(p.v), weight: Number((p.w / wsum).toFixed(2)) })),
      events: events.map((e: any) => ({ currency: e.asset, title: e.title, at: e.scheduledAt, inHours: Number(e.inH.toFixed(1)), forecast: e.forecast, previous: e.previous })),
      plan, reasons,
      sources: [source, fScore !== null ? 'PrimePipFX live fundamentals engine' : null, row ? `Retail positioning: ${(row.sources || []).map((s: any) => s.name).join(', ')}` : null, events.length ? 'Economic calendar (TradingView)' : null].filter(Boolean),
      disclaimer: 'Educational analysis generated from live data. Not financial advice — always use your own judgement and risk management.',
    };
    return body;
}

const cache = new Map<string, { at: number; body: any }>();

copilotRouter.get('/:symbol', async (req: Request, res: Response) => {
  const sym = String(req.params.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/USDT$/, 'USD');
  const hit = cache.get(sym);
  if (hit && Date.now() - hit.at < 60_000) { res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300'); return res.json(hit.body); }
  try {
    const [{ candles, source }, snap, sent] = await Promise.all([
      dailyCandles(sym),
      getSnapshot().catch(() => null),
      getSentiment(120_000).catch(() => null),
    ]);
    const body = buildCopilot(sym, candles, source, snap, sent);
    if (!body) return res.status(503).json({ ok: false, error: 'Not enough price history right now — try again in a minute.' });
    cache.set(sym, { at: Date.now(), body });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.json(body);
  } catch (e: any) {
    return res.status(503).json({ ok: false, error: String(e?.message || 'Copilot data is unavailable right now.') });
  }
});
