import { Router, type Request, type Response } from 'express';
import { SERVERLESS, ensureStockLoaded, getSnapshot, refreshAndCompute, unmatchedCalendarTitles } from '../macro/macroService.js';
import type { AssetResult, MacroSnapshot } from '../macro/types.js';
import { COT_CODES, getInstitutional } from '../macro/sources/cot.js';

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
    if (a && a.assetClass === 'STOCKS' && a.pillars.some((p) => p.id !== 'macro' && p.score === null)) {
      s = await ensureStockLoaded(sym);
      a = s.assets.find((x) => x.symbol === sym) || a;
    }
    if (!a) return res.status(404).json({ ok: false, error: `Unknown asset ${sym}` });
    const mirrors: Record<string, AssetResult> = {};
    for (const p of a.pillars) {
      const ref = p.id === 'usd' ? 'USD' : p.id === 'yen' ? 'JPY' : p.id === 'macro' ? 'US500' : null;
      const m = ref ? s.assets.find((x) => x.symbol === ref) : null;
      if (ref && m) mirrors[ref] = m;
    }
    cacheHeaders(res, s);
    res.json({ ok: true, data: a, mirrors, institutional: institutionalFor(sym), generatedAt: s.generatedAt });
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
    res.json({ ok: true, data: p, base, quote, institutional: { base: institutionalFor(p.base), quote: institutionalFor(p.quote) }, generatedAt: s.generatedAt });
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
