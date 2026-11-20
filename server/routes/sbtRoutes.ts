/**
 * /api/sbt — results of the private SBT level scanner (never the strategy itself).
 *
 *   GET /api/sbt/scan?symbol=EURUSD&bar=<ms>   one pair, closed H1 candles up to `bar`
 *
 * A result only changes when an H1 candle closes, so each (symbol, bar) answer is cached at the
 * edge for everyone: the strategy runs once per pair per hour, however many people are online.
 */
import { Router, type Request, type Response } from 'express';
import { H1, currentBar, instrument, resetSbtCache, sbtStatus, scanSymbol, type SbtFail } from '../sbt/sbtScanner.js';
import { upsertScript } from '../pine/pineStore.js';

export const sbtRouter = Router();

sbtRouter.get('/scan', async (req: Request, res: Response) => {
  const symbol = String(req.query.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const now = currentBar();
  const asked = Number(req.query.bar);
  const bar = asked === now - H1 ? asked : now;
  if (!symbol) return res.status(400).json({ ok: false, error: 'symbol is required' });
  // On Render's free CPU one strategy scan takes ~2 minutes and blocks the whole server, so live
  // scanning is switched off there (set PPFX_SBT_LIVE_SCAN=1 on a bigger instance to turn it on).
  if (process.env.RENDER && process.env.PPFX_SBT_LIVE_SCAN !== '1') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ ok: false, symbol, error: 'Level scanning is not running on this host yet.', code: 'not_configured' });
  }
  try {
    const r = await scanSymbol(symbol, bar);
    if (r.ok) {
      const left = Math.max(30, Math.floor((bar + H1 - Date.now()) / 1000) + 60);
      res.setHeader('Cache-Control', r.stale ? 'public, max-age=30, s-maxage=60' : asked === bar ? `public, max-age=60, s-maxage=${left}` : 'public, max-age=20, s-maxage=30');
      return res.json(r);
    }
    const fail = r as SbtFail;
    res.setHeader('Cache-Control', fail.code === 'unknown_symbol' ? 'public, max-age=300, s-maxage=3600' : 'public, max-age=20, s-maxage=45');
    return res.status(fail.code === 'not_configured' ? 503 : fail.code === 'unknown_symbol' ? 404 : 502).json(fail);
  } catch (err: any) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(500).json({ ok: false, symbol, error: err?.message || 'Scan failed', code: 'run_failed' });
  }
});

/** GET /api/sbt/status — is the level scanner running, and which strategy version (name only). */
sbtRouter.get('/status', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json({ ok: true, ...(await sbtStatus()) }); } catch (e: any) { res.json({ ok: false, configured: false, error: String(e?.message || e) }); }
});

/**
 * POST /api/sbt/strategy — ADMIN ONLY (mounted behind requireDeveloper). Saves the private SBT strategy
 * into the private script store (never published, never sent to a browser) and test-runs it once.
 */
export async function uploadStrategy(req: Request, res: Response) {
  const source = String(req.body?.source || '').replace(/\r\n/g, '\n');
  if (!/strategy\s*\(/.test(source) || !/sbt/i.test(source)) return res.status(400).json({ ok: false, error: 'This is not the Prime Pip SBT strategy file.' });
  if (!instrument(source)) return res.status(400).json({ ok: false, error: 'This version does not contain the hook points the level scanner reads (f_cnt and the strategy entry). Nothing was changed.' });
  try {
    const name = (source.match(/strategy\s*\(\s*"([^"]+)"/)?.[1] || 'Prime Pip SBT').slice(0, 70);
    const by = (req as any).currentUser?.username || 'admin';
    await upsertScript({ id: 'ppfx_sbt_levels', source, name: /sbt/i.test(name) ? name : `${name} (SBT)`, published: false }, by);
    resetSbtCache();
    const probe = String(req.body?.probe || 'EURUSD').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const r = await scanSymbol(probe);
    return res.json({ ok: true, version: name, test: r.ok ? { symbol: probe, ok: true, armed: r.armed, dir: r.dir, level1: r.level1, level2: r.level2, signals: r.signals.length, ms: r.ms } : { symbol: probe, ok: false, error: (r as SbtFail).error } });
  } catch (e: any) { return res.status(500).json({ ok: false, error: String(e?.message || e) }); }
}
