/**
 * /api/sbt — results of the private SBT level scanner (never the strategy itself).
 *
 *   GET /api/sbt/scan?symbol=EURUSD&bar=<ms>   one pair, closed H1 candles up to `bar`
 *
 * A result only changes when an H1 candle closes, so each (symbol, bar) answer is cached at the
 * edge for everyone: the strategy runs once per pair per hour, however many people are online.
 */
import { Router, type Request, type Response } from 'express';
import { H1, currentBar, scanSymbol, type SbtFail } from '../sbt/sbtScanner.js';

export const sbtRouter = Router();

sbtRouter.get('/scan', async (req: Request, res: Response) => {
  const symbol = String(req.query.symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const now = currentBar();
  const asked = Number(req.query.bar);
  const bar = asked === now - H1 ? asked : now;
  if (!symbol) return res.status(400).json({ ok: false, error: 'symbol is required' });
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
