import { Router, type Request, type Response } from 'express';
import { TF_LIST, dukaBefore, listDukaInstruments, yahooAny, yahooBefore, type Tf } from '../history/historyService.js';

export const historyRouter = Router();

/**
 * GET /api/history/candles?src=duka|yahoo&id=<instrument|symbol>&tf=m1..mn1&before=<ms>&count=<n>
 * Returns up to `count` candles strictly before `before` (default: now).
 */
historyRouter.get('/candles', async (req: Request, res: Response) => {
  const src = String(req.query.src || '');
  const id = String(req.query.id || '').trim();
  const tf = String(req.query.tf || '') as Tf;
  const before = Number(req.query.before) || Date.now();
  const count = Math.min(5000, Math.max(1, Number(req.query.count) || 500));
  if (!id || !TF_LIST.includes(tf) || (src !== 'duka' && src !== 'yahoo')) {
    return res.status(400).json({ ok: false, error: 'Required: src=duka|yahoo, id, tf (m1,m5,m15,m30,h1,h4,d1,w1,mn1)' });
  }
  const alt = String(req.query.alt || '').trim(); // Yahoo symbol used if the primary source fails
  try {
    let r: { candles: any[]; reachedStart: boolean };
    let used = src;
    let primaryError: string | null = null;
    try {
      r = src === 'duka' ? await dukaBefore(id.toLowerCase(), tf, before, count) : await yahooBefore(id, tf, before, count);
    } catch (err: any) {
      primaryError = `${src === 'duka' ? 'Dukascopy' : 'Yahoo'}: ${err?.message || err}`;
      r = { candles: [], reachedStart: false };
    }
    // Primary failed, or returned nothing although history should exist → automatic fallback.
    if ((primaryError || (!r.candles.length && !r.reachedStart)) && alt && src === 'duka') {
      try { r = await yahooAny(alt, tf, before, count); used = 'yahoo'; }
      catch (err: any) { if (primaryError) throw new Error(`${primaryError} · Yahoo: ${err?.message || err}`); }
    } else if (primaryError) throw new Error(primaryError);
    const historic = before < Date.now() - 3 * 86_400_000;
    // Completed past ranges never change: cache them at the edge for a month.
    res.setHeader('Cache-Control', historic ? 'public, max-age=86400, s-maxage=2592000, immutable' : 'public, max-age=5, s-maxage=10, stale-while-revalidate=30');
    res.json({ ok: true, src: used, id, tf, candles: r.candles, reachedStart: r.reachedStart, fallback: used !== src });
  } catch (err: any) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ ok: false, error: err?.message || 'History source unavailable' });
  }
});

/** GET /api/history/instruments — every Dukascopy instrument with its first available dates. */
historyRouter.get('/instruments', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  res.json({ ok: true, instruments: listDukaInstruments() });
});
