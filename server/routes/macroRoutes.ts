import { Router, type Request, type Response } from 'express';
import { getSnapshot, refreshAndCompute, unmatchedCalendarTitles } from '../macro/macroService.js';
import type { AssetResult, MacroSnapshot } from '../macro/types.js';

export const macroRouter = Router();

function lite(a: AssetResult) {
  return {
    symbol: a.symbol, name: a.name, assetClass: a.assetClass, score: a.score, bullishPct: a.bullishPct, bearishPct: a.bearishPct,
    bias: a.bias, confidence: a.confidence, summary: a.summary, updatedAt: a.updatedAt, meta: a.meta,
    topDrivers: a.topDrivers.slice(0, 3),
    pillars: a.pillars.map((p) => ({ id: p.id, name: p.name, weight: p.weight, score: p.score, bullishPct: p.bullishPct, coverage: p.coverage })),
  };
}

function overview(s: MacroSnapshot) {
  return { ...s, assets: s.assets.map(lite) };
}

/** GET /api/macro/overview — all assets (pillar level), pairs, correlations, releases, sources. */
macroRouter.get('/overview', async (_req: Request, res: Response) => {
  try {
    const s = await getSnapshot();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, data: overview(s) });
  } catch (err: any) {
    res.status(503).json({ ok: false, error: err?.message || 'Fundamental engine unavailable' });
  }
});

/** GET /api/macro/asset/:symbol — full drill-down (pillars → indicators → components). */
macroRouter.get('/asset/:symbol', async (req: Request, res: Response) => {
  const s = await getSnapshot();
  const sym = String(req.params.symbol).toUpperCase();
  const a = s.assets.find((x) => x.symbol === sym);
  if (!a) return res.status(404).json({ ok: false, error: `Unknown asset ${sym}` });
  const mirrors: Record<string, AssetResult> = {};
  for (const p of a.pillars) {
    if (p.id === 'usd') { const u = s.assets.find((x) => x.symbol === 'USD'); if (u) mirrors.USD = u; }
    if (p.id === 'yen') { const j = s.assets.find((x) => x.symbol === 'JPY'); if (j) mirrors.JPY = j; }
    if (p.id === 'macro') { const m = s.assets.find((x) => x.symbol === 'US500'); if (m) mirrors.US500 = m; }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, data: a, mirrors, generatedAt: s.generatedAt });
});

/** GET /api/macro/pair/:symbol — pair + both legs in full. */
macroRouter.get('/pair/:symbol', async (req: Request, res: Response) => {
  const s = await getSnapshot();
  const sym = String(req.params.symbol).toUpperCase().replace('/', '');
  const p = s.pairs.find((x) => x.symbol === sym);
  if (!p) return res.status(404).json({ ok: false, error: `Unknown pair ${sym}` });
  const base = s.assets.find((x) => x.symbol === p.base) || null;
  const quote = s.assets.find((x) => x.symbol === p.quote) || null;
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, data: p, base, quote, generatedAt: s.generatedAt });
});

let lastForce = 0;
/** POST /api/macro/refresh — force a full re-pull of every source (max once / 60s). */
macroRouter.post('/refresh', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (now - lastForce < 60_000) {
    const s = await getSnapshot();
    return res.json({ ok: true, throttled: true, data: overview(s) });
  }
  lastForce = now;
  const s = await refreshAndCompute(true);
  res.json({ ok: true, data: overview(s) });
});

/** GET /api/macro/diagnostics — source health + calendar titles not mapped to any indicator. */
macroRouter.get('/diagnostics', async (_req: Request, res: Response) => {
  const s = await getSnapshot();
  res.json({ ok: true, sources: s.sources, unmatchedCalendarTitles: unmatchedCalendarTitles(), generatedAt: s.generatedAt });
});
