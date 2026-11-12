import { Router, type Request, type Response } from 'express';
import { SERVERLESS, ensureStockLoaded, getSnapshot, refreshAndCompute, unmatchedCalendarTitles } from '../macro/macroService.js';
import type { AssetResult, MacroSnapshot } from '../macro/types.js';
import { COT_CODES, getInstitutional } from '../macro/sources/cot.js';
import { getSentiment, sentimentFor } from '../macro/sources/sentiment.js';
import { STOCKS } from '../macro/sources/edgar.js';
import { snapshotMeta } from '../macro/sources/snapshot.js';
import { UNIVERSE } from '../macro/universe.js';

export const macroRouter = Router();

function lite(a: AssetResult) {
  return {
    symbol: a.symbol, name: a.name, assetClass: a.assetClass, score: a.score, bullishPct: a.bullishPct, bearishPct: a.bearishPct,
    bias: a.bias, confidence: a.confidence, summary: a.summary, updatedAt: a.updatedAt, meta: a.meta,
    topDrivers: a.topDrivers.slice(0, 3),
    institutional: instSummary(a.symbol),
    pillars: a.pillars.map((p) => ({ id: p.id, name: p.name, weight: p.weight, score: p.score, bullishPct: p.bullishPct, coverage: p.coverage })),
  };
}

/** CFTC asset key for an engine symbol (currencies, metals, energy, indices, crypto). */
function cotKey(symbol: string): string | null {
  return COT_CODES[symbol] ? symbol : null;
}

/** Full institutional positioning, or an explicit explanation when no CFTC market exists. */
function institutionalFor(symbol: string) {
  const key = cotKey(symbol);
  if (!key) return { available: false, reason: `There is no CFTC-regulated futures market for ${symbol}, so official institutional positioning is not published for it.` };
  const pos = getInstitutional(key);
  if (!pos) return { available: false, reason: 'CFTC data is loading or temporarily unavailable — it fills in automatically.' };
  return { available: true, ...pos };
}

function instSummary(symbol: string) {
  const key = cotKey(symbol);
  const pos = key ? getInstitutional(key) : null;
  if (!pos) return null;
  return { specNet: pos.speculators.net, specNetChange: pos.speculators.netChange, cotIndex52w: pos.speculators.cotIndex52w, longPct: pos.speculators.longPct, reportDate: pos.reportDate };
}

/** True while the core calendar feed has not loaded yet (first seconds after a cold start). */
function warming(s: MacroSnapshot): boolean {
  return !s.sources.some((x) => x.id === 'tradingview_calendar' && x.lastSuccess);
}

function overview(s: MacroSnapshot) {
  return { ...s, assets: s.assets.map(lite), warming: warming(s) };
}

/**
 * Serverless: let Vercel's edge serve the same answer to everyone for 20s and refresh it in the
 * background, so visitors almost never wait for a cold function. Long-running servers: no cache.
 */
function cacheHeaders(res: Response, s?: MacroSnapshot) {
  if (SERVERLESS && s && !warming(s)) res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=120');
  else res.setHeader('Cache-Control', 'no-store');
}

function fail(res: Response, err: any) {
  console.warn('[Fundamentals] route error:', err?.message || err);
  if (!res.headersSent) res.status(503).json({ ok: false, error: 'The fundamentals engine is temporarily unavailable. Retrying automatically.' });
}

/** GET /api/macro/overview — all assets (pillar level), pairs, correlations, releases, sources. */
macroRouter.get('/overview', async (_req: Request, res: Response) => {
  try {
    const s = await getSnapshot();
    cacheHeaders(res, s);
    res.json({ ok: true, data: overview(s) });
  } catch (err) { fail(res, err); }
});

/** GET /api/macro/asset/:symbol — full drill-down (pillars → indicators → components). */
macroRouter.get('/asset/:symbol', async (req: Request, res: Response) => {
  try {
    const sym = String(req.params.symbol).toUpperCase();
    let s = await getSnapshot();
    let a = s.assets.find((x) => x.symbol === sym);
    if (a && a.assetClass === 'STOCKS' && STOCKS.some((t) => t.ticker === sym) && a.pillars.some((p) => p.id !== 'macro' && p.score === null)) {
      s = await ensureStockLoaded(sym);
      a = s.assets.find((x) => x.symbol === sym) || a;
    }
    if (!a) return res.status(404).json({ ok: false, error: `Unknown asset ${sym}` });
    const mirrors: Record<string, AssetResult> = {};
    for (const p of a.pillars) {
      const ref = p.id === 'usd' ? 'USD' : p.id === 'yen' ? 'JPY' : p.id === 'macro' ? String(a.meta?.macroAsset || 'US500') : null;
      const m = ref ? s.assets.find((x) => x.symbol === ref) : null;
      if (ref && m) mirrors[ref] = m;
    }
    cacheHeaders(res, s);
    res.json({ ok: true, data: a, mirrors, institutional: institutionalFor(sym), generatedAt: s.generatedAt });
  } catch (err) { fail(res, err); }
});

/** A compact row for the picks lists. */
function pickRow(a: AssetResult) {
  const m = (a.meta || {}) as Record<string, string | number | null>;
  return {
    symbol: a.symbol, name: a.name, assetClass: a.assetClass, region: m.region ?? null, sector: m.sector ?? null, kind: m.kind ?? null,
    score: a.score, bullishPct: a.bullishPct, bearishPct: a.bearishPct, confidence: a.confidence, bias: a.bias,
    price: m.price ?? null, currency: m.currency ?? null, change1y: m.change1y ?? null, pe: m.pe ?? null, divYield: m.divYield ?? null, members: m.members ?? null, covered: m.covered ?? null,
    pillars: a.pillars.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    drivers: a.topDrivers.slice(0, 3).map((d) => ({ name: d.name, impact: d.impact })),
  };
}

/** Quality gate for a long-term "VIP" pick: strong score, solid data, no weak pillar, strong growth AND profitability. */
export function isVip(a: AssetResult): boolean {
  if (a.assetClass !== 'STOCKS' || a.score === null || a.score < 55 || a.confidence < 70) return false;
  const scored = a.pillars.filter((p) => p.score !== null && p.id !== 'macro');
  if (scored.some((p) => (p.score as number) <= -15)) return false;
  const g = a.pillars.find((p) => p.id === 'growth')?.score ?? null;
  const q = a.pillars.find((p) => p.id === 'profitability')?.score ?? null;
  return g !== null && q !== null && g >= 20 && q >= 20;
}

/** GET /api/macro/picks — long-term bullish / bearish stocks, indices, commodities and currencies (all from the live scores). */
macroRouter.get('/picks', async (_req: Request, res: Response) => {
  try {
    const s = await getSnapshot();
    const scored = s.assets.filter((a) => a.score !== null);
    const stocks = scored.filter((a) => a.assetClass === 'STOCKS');
    const byScore = (x: AssetResult, y: AssetResult) => (y.score as number) - (x.score as number);
    const regions = ['PK', 'ASIA', 'US', 'EU', 'GLOBAL'];
    const perRegion: Record<string, { bullish: ReturnType<typeof pickRow>[]; bearish: ReturnType<typeof pickRow>[] }> = {};
    for (const r of regions) {
      const list = stocks.filter((a) => a.meta?.region === r && a.confidence >= 40).sort(byScore);
      perRegion[r] = { bullish: list.filter((a) => (a.score as number) >= 10).slice(0, 12).map(pickRow), bearish: list.filter((a) => (a.score as number) <= -10).reverse().slice(0, 12).map(pickRow) };
    }
    const solid = stocks.filter((a) => a.confidence >= 50).sort(byScore);
    const idx = scored.filter((a) => a.assetClass === 'INDICES').sort(byScore);
    const com = scored.filter((a) => a.assetClass === 'COMMODITIES').sort(byScore);
    const fx = scored.filter((a) => a.assetClass === 'FOREX').sort(byScore);
    const cry = scored.filter((a) => a.assetClass === 'CRYPTO').sort(byScore);
    const meta = snapshotMeta();
    const have = new Set(s.assets.filter((a) => a.score !== null).map((a) => a.symbol));
    cacheHeaders(res, s);
    res.json({ ok: true, data: {
      generatedAt: s.generatedAt, dataAsOf: meta?.generatedAt ?? null, tracked: UNIVERSE.length + STOCKS.length, scoredStocks: stocks.length,
      criteria: {
        vip: 'Stocks only: score ≥ +55, confidence ≥ 70%, Growth and Profitability pillars both ≥ +20, and no scored pillar at or below −15.',
        strong: 'Score ≥ +60 (Strong Bullish) or ≤ −60 (Strong Bearish) with confidence ≥ 50%.',
      },
      vip: solid.filter(isVip).slice(0, 15).map(pickRow),
      strongBullish: solid.filter((a) => (a.score as number) >= 60).slice(0, 25).map(pickRow),
      strongBearish: [...solid].reverse().filter((a) => (a.score as number) <= -60).slice(0, 25).map(pickRow),
      regions: perRegion,
      indices: { bullish: idx.filter((a) => (a.score as number) >= 10).slice(0, 10).map(pickRow), bearish: [...idx].reverse().filter((a) => (a.score as number) <= -10).slice(0, 10).map(pickRow) },
      commodities: { bullish: com.filter((a) => (a.score as number) >= 10).map(pickRow), bearish: [...com].reverse().filter((a) => (a.score as number) <= -10).map(pickRow), all: com.map(pickRow) },
      forex: { all: fx.map(pickRow) },
      crypto: { all: cry.map(pickRow) },
      noFreeData: UNIVERSE.filter((u) => !have.has(u.s)).map((u) => ({ symbol: u.s, name: u.name, region: u.region, url: u.region === 'PK' ? `https://dps.psx.com.pk/company/${u.s}` : `https://finance.yahoo.com/quote/${encodeURIComponent(u.y)}` })),
    } });
  } catch (err) { fail(res, err); }
});

/** GET /api/macro/pair/:symbol — pair + both legs in full. */
macroRouter.get('/pair/:symbol', async (req: Request, res: Response) => {
  try {
    const s = await getSnapshot();
    const sym = String(req.params.symbol).toUpperCase().replace('/', '');
    const p = s.pairs.find((x) => x.symbol === sym);
    if (!p) return res.status(404).json({ ok: false, error: `Unknown pair ${sym}` });
    const base = s.assets.find((x) => x.symbol === p.base) || null;
    const quote = s.assets.find((x) => x.symbol === p.quote) || null;
    cacheHeaders(res, s);
    const sent = await Promise.race([getSentiment().catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 6000))]);
    const sentiment = sent ? { pair: sentimentFor(sent, p.symbol), base: sent.currencies.find((c) => c.currency === p.base) || null, quote: sent.currencies.find((c) => c.currency === p.quote) || null, updatedAt: sent.updatedAt } : null;
    res.json({ ok: true, data: p, base, quote, institutional: { base: institutionalFor(p.base), quote: institutionalFor(p.quote) }, sentiment, generatedAt: s.generatedAt });
  } catch (err) { fail(res, err); }
});

/** GET /api/macro/sentiment — live trader positioning for FX, commodities, indices and crypto USDT pairs. */
macroRouter.get('/sentiment', async (_req: Request, res: Response) => {
  try {
    const data = await getSentiment();
    res.setHeader('Cache-Control', SERVERLESS ? 'public, s-maxage=30, stale-while-revalidate=90' : 'no-store');
    res.json({ ok: true, data });
  } catch (err) { fail(res, err); }
});

/** Pillars that describe the slow-moving fundamental trend (risk mood, crowd and derivatives positioning excluded). */
const SHORT_TERM_PILLARS = new Set(['risk', 'sentiment', 'derivatives', 'external']);
function longTermScore(a: AssetResult | undefined): { score: number | null; pillars: string[] } {
  if (!a) return { score: null, pillars: [] };
  const ps = a.pillars.filter((p) => !SHORT_TERM_PILLARS.has(p.id) && p.score !== null && p.weight > 0);
  const w = ps.reduce((s, p) => s + p.weight, 0);
  return w ? { score: Math.round((ps.reduce((s, p) => s + (p.score as number) * p.weight, 0) / w) * 10) / 10, pillars: ps.map((p) => p.name) } : { score: null, pillars: [] };
}

/** GET /api/macro/rankings — strongest long-term and short-term bullish / bearish pairs. */
macroRouter.get('/rankings', async (_req: Request, res: Response) => {
  try {
    const s = await getSnapshot();
    const bySym = new Map(s.assets.map((a) => [a.symbol, a]));
    const rows = s.pairs.map((p) => {
      let lt: number | null; let basis: string[];
      if (p.assetClass === 'FOREX') {
        const b = longTermScore(bySym.get(p.base)), q = longTermScore(bySym.get(p.quote));
        lt = b.score !== null && q.score !== null ? Math.round(((b.score - q.score) / 2) * 10) / 10 : null;
        basis = Array.from(new Set([...b.pillars, ...q.pillars]));
      } else {
        const a = longTermScore(bySym.get(p.base)); lt = a.score; basis = a.pillars;
      }
      return { symbol: p.symbol, display: p.display, assetClass: p.assetClass, base: p.base, quote: p.quote, shortTerm: p.score, longTerm: lt, confidence: p.confidence, basis };
    });
    const ok = (k: 'longTerm' | 'shortTerm') => rows.filter((r) => r[k] !== null && r.confidence >= 25);
    const top = (k: 'longTerm' | 'shortTerm', dir: 1 | -1) => ok(k).filter((r) => (r[k] as number) * dir > 0).sort((a, b) => ((b[k] as number) - (a[k] as number)) * dir).slice(0, 12);
    cacheHeaders(res, s);
    res.json({ ok: true, data: {
      longTerm: { bullish: top('longTerm', 1), bearish: top('longTerm', -1) },
      shortTerm: { bullish: top('shortTerm', 1), bearish: top('shortTerm', -1) },
      method: 'Long-term = weighted structural pillars only (monetary policy, inflation, labour, growth, real rates, supply/demand, institutional COT positioning); risk mood, crowd sentiment and derivatives excluded. Pair = (base − quote) / 2. Short-term = full live score.',
      generatedAt: s.generatedAt,
    } });
  } catch (err) { fail(res, err); }
});

let lastForce = 0;
/** POST /api/macro/refresh — force a full re-pull of every source (max once / 60s). */
macroRouter.post('/refresh', async (_req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const now = Date.now();
    if (now - lastForce < 60_000) {
      const s = await getSnapshot();
      return res.json({ ok: true, throttled: true, data: overview(s) });
    }
    lastForce = now;
    const run = refreshAndCompute(true);
    run.catch(() => undefined);
    // Bounded wait so serverless never hits its time limit; whatever is not done lands on the next poll.
    const s = await Promise.race([run, new Promise<MacroSnapshot>((r) => setTimeout(() => getSnapshot(Infinity).then(r), SERVERLESS ? 8_000 : 30_000))]);
    res.json({ ok: true, data: overview(s) });
  } catch (err) { fail(res, err); }
});

/** GET /api/macro/diagnostics — source health + calendar titles not mapped to any indicator. */
macroRouter.get('/diagnostics', async (_req: Request, res: Response) => {
  try {
    const s = await getSnapshot();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, serverless: SERVERLESS, warming: warming(s), sources: s.sources, unmatchedCalendarTitles: unmatchedCalendarTitles(), generatedAt: s.generatedAt });
  } catch (err) { fail(res, err); }
});
