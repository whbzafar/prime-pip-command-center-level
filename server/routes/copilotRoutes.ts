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
import { scanSymbol, H1 } from '../sbt/sbtScanner.js';

export const copilotRouter = Router();
export { feedFor };

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

export async function dailyCandles(sym: string, count = 80): Promise<{ candles: Candle[]; source: string }> {
  const f = feedFor(sym);
  if (!f) throw new Error('This instrument is not covered by the copilot yet.');
  if (f.duka) {
    try { const r = await dukaBefore(f.duka, 'd1', Date.now() + 86_400_000, count, 8_000); if (r.candles.length >= 30) return { candles: r.candles, source: 'Dukascopy (daily)' }; } catch { /* fall back */ }
  }
  const r = await yahooAny(f.yahoo, 'd1', Date.now() + 86_400_000, count);
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
    // Never trade against confident fundamentals on a weak technical/crowd edge.
    const fAgainst = fScore !== null && fConf >= 50 && Math.abs(fScore) >= 10 && Math.sign(fScore) !== Math.sign(combined);
    if (action !== 'WAIT' && fAgainst && Math.abs(combined) < 35) {
      action = 'WAIT';
      reasons.push(`Price action and the crowd lean ${combined > 0 ? 'bullish' : 'bearish'}, but the fundamentals point the other way (${fScore! > 0 ? '+' : ''}${Math.round(fScore!)}). Wait for them to line up.`);
    }
    if (action === 'WAIT' && !reasons.length) reasons.push(Math.abs(combined) < 20 ? 'The inputs are mixed — no clear edge right now.' : 'Only one input supports the direction; the others disagree or are flat.');
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

/**
 * The owner's Prime Pip SBT strategy (H1) decides whether there is a trade: a VALID setup exists only
 * when the strategy's own entry fired on the H1 candle that has just closed (Level 1 or Level 2) AND
 * the fundamentals do not point the other way. Everything else in the copilot is context.
 */
export function applySbt(body: any, scan: any, now = Date.now()): any {
  const out = { ...body };
  const f = body?.inputs?.fundamentals?.score as number | undefined;
  const fmt = (x: number) => (Number.isFinite(x) ? Number(x.toFixed(body.digits ?? 5)) : null);
  if (!scan || !scan.ok) {
    out.sbt = { status: scan?.code === 'not_configured' ? 'NOT_LOADED' : 'UNAVAILABLE', note: scan?.error || 'The SBT scan is not available right now.' };
    out.action = 'WAIT'; out.plan = null;
    out.reasons = [scan?.code === 'not_configured' ? 'The Prime Pip SBT strategy is not loaded on the server, so no H1 Level 1 / Level 2 setup can be confirmed.' : 'The H1 SBT scan could not run right now — no setup is confirmed.', ...(body.reasons || [])];
    return out;
  }
  if (scan.stale) {
    out.sbt = { status: 'STALE', note: 'The newest H1 candle is late — not acting on old data.' };
    out.action = 'WAIT'; out.plan = null; out.reasons = ['H1 data is delayed — wait for fresh candles before trusting any level.', ...(body.reasons || [])];
    return out;
  }
  const hit = (scan.signals || []).find((x: any) => x.time === scan.lastCandle) || null;
  const recent = [...(scan.signals || [])].reverse().find((x: any) => now - (x.time + H1) < 24 * H1 && x !== hit) || null;
  const zone = (z: any) => (z ? { top: fmt(z.top), bottom: fmt(z.bottom), modelReady: Boolean(z.modelReady) } : null);
  out.sbt = {
    status: hit ? 'AT_LEVEL' : scan.armed ? 'WATCHING' : 'NO_STRUCTURE',
    dir: scan.dir, trend: scan.trend, level1: zone(scan.level1), level2: zone(scan.level2), level1Done: scan.level1Done, inTrade: scan.inTrade,
    lastCandle: scan.lastCandle, hit: hit ? { ...hit, price: fmt(hit.price), stop: fmt(hit.stop), target: fmt(hit.target), zoneTop: fmt(hit.zoneTop), zoneBottom: fmt(hit.zoneBottom) } : null,
    recent: recent ? { time: recent.time, dir: recent.dir, level: recent.level, price: fmt(recent.price) } : null,
  };
  const side = (d: number) => (d > 0 ? 'buy' : 'sell');
  if (hit) {
    const against = typeof f === 'number' && Math.abs(f) >= 10 && Math.sign(f) !== hit.dir;
    if (against) {
      out.action = 'WAIT'; out.plan = null; out.conviction = 0;
      out.reasons = [`SBT ${side(hit.dir)} Level ${hit.level} was reached on the H1 candle that just closed, but the fundamentals point the other way (${f > 0 ? '+' : ''}${Math.round(f)}). Not a valid setup for this terminal.`];
      out.sbt.valid = false;
    } else {
      const risk = Math.abs(hit.price - hit.stop);
      out.action = hit.dir > 0 ? 'BUY' : 'SELL'; out.sbt.valid = true;
      out.plan = {
        direction: out.action, source: 'SBT', level: hit.level, models: hit.models,
        entryZone: [fmt(Math.min(hit.zoneTop, hit.zoneBottom)), fmt(Math.max(hit.zoneTop, hit.zoneBottom))], entry: fmt(hit.price),
        stop: fmt(hit.stop), targets: [fmt(hit.price + hit.dir * risk), fmt(hit.target)], swingTarget: null, riskPerUnit: risk, rr: [1, 2],
        invalidation: `Entry at the next H1 open (around ${fmt(hit.price)}). A close beyond the Level ${hit.level} zone, or the stop at ${fmt(hit.stop)}, ends the trade (strategy rules).`,
      };
      out.reasons = [`VALID SETUP: SBT ${side(hit.dir)} Level ${hit.level}${hit.models?.length ? ` (${hit.models.join(' + ')})` : ''} on the H1 candle that just closed${typeof f === 'number' ? `, fundamentals ${f > 0 ? 'bullish' : f < 0 ? 'bearish' : 'neutral'} (${f > 0 ? '+' : ''}${Math.round(f)})` : ''}.`, ...(body.reasons || []).filter((r: string) => /release|news/i.test(r))];
    }
    return out;
  }
  out.action = 'WAIT'; out.plan = null;
  const zl = (z: any, n: number) => (z ? `Level ${n} ${fmt(z.bottom)}–${fmt(z.top)}${z.modelReady ? ' (model ready)' : ''}` : null);
  const where = [zl(scan.level1, 1), zl(scan.level2, 2)].filter(Boolean).join(' · ');
  out.reasons = [scan.armed ? `No valid setup on H1 right now. The strategy is watching ${side(scan.dir)} levels: ${where || 'zones not formed yet'}.` : 'No valid setup on H1 right now — the strategy has no active structure on this pair.',
    ...(scan.armed && typeof f === 'number' && Math.abs(f) >= 10 && Math.sign(f) !== scan.dir ? [`Note: these ${side(scan.dir)} levels are against the fundamentals (${f > 0 ? '+' : ''}${Math.round(f)}).`] : []),
    ...(body.reasons || []).filter((r: string) => /release|news/i.test(r))];
  return out;
}

const cache = new Map<string, { at: number; body: any }>();

copilotRouter.get('/:symbol', async (req: Request, res: Response) => {
  const sym = String(req.params.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/USDT$/, 'USD');
  const hit = cache.get(sym);
  if (hit && Date.now() - hit.at < 60_000) { res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300'); return res.json(hit.body); }
  try {
    const chartSym = ({ BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT' } as Record<string, string>)[sym] || sym;
    const [{ candles, source }, snap, sent, scan] = await Promise.all([
      dailyCandles(sym),
      getSnapshot().catch(() => null),
      getSentiment(120_000).catch(() => null),
      Promise.race([scanSymbol(chartSym), new Promise((r) => setTimeout(() => r({ ok: false, code: 'timeout', error: 'The H1 SBT scan is taking longer than usual.' }), 45_000))]).catch((e) => ({ ok: false, error: String(e?.message || e) })),
    ]);
    const base = buildCopilot(sym, candles, source, snap, sent);
    if (!base) return res.status(503).json({ ok: false, error: 'Not enough price history right now — try again in a minute.' });
    const body = applySbt(base, scan);
    cache.set(sym, { at: Date.now(), body });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.json(body);
  } catch (e: any) {
    return res.status(503).json({ ok: false, error: String(e?.message || 'Copilot data is unavailable right now.') });
  }
});
