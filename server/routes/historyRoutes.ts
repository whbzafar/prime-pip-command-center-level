import { Router, type Request, type Response } from 'express';
import { archiveBefore, getManifest } from '../history/archive.js';
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
  const arch = String(req.query.arch || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); // archive ticker
  try {
    let r: { candles: any[]; reachedStart: boolean } = { candles: [], reachedStart: false };
    let used = src;
    let primaryError: string | null = null;
    // 1) Deep-history archive (Dukascopy datafeed mirrored by GitHub Actions) — full depth on Vercel.
    if (src === 'duka' && arch) {
      try {
        const a = await archiveBefore(arch, tf, before, count, alt
          ? async (native, after, until) => (await yahooAny(alt, native, until, Math.min(5000, Math.ceil((until - after) / ({ m1: 60_000, h1: 3_600_000, d1: 86_400_000 } as const)[native]) + 5))).candles
          : undefined);
        if (a && a.candles.length) {
          const historicA = before < Date.now() - 3 * 86_400_000;
          res.setHeader('Cache-Control', historicA ? 'public, max-age=86400, s-maxage=604800' : 'public, max-age=5, s-maxage=10, stale-while-revalidate=30');
          return res.json({ ok: true, src: 'archive', id, tf, candles: a.candles, reachedStart: a.reachedStart, live: a.live, fallback: false });
        }
      } catch (err: any) { primaryError = `Archive: ${err?.message || err}`; }
    }
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
    // Completed past ranges never change: cache them at the edge. Backup-source answers are cached
    // briefly only, so deeper archive history replaces them as soon as it is available.
    res.setHeader('Cache-Control', !historic ? 'public, max-age=5, s-maxage=10, stale-while-revalidate=30'
      : used === src ? 'public, max-age=86400, s-maxage=2592000, immutable' : 'public, max-age=300, s-maxage=900');
    res.json({ ok: true, src: used, id, tf, candles: r.candles, reachedStart: r.reachedStart, fallback: used !== src });
  } catch (err: any) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ ok: false, error: err?.message || 'History source unavailable' });
  }
});

/** GET /api/history/archive?ticker=EURUSD — what the deep-history archive holds for an instrument. */
historyRouter.get('/archive', async (req: Request, res: Response) => {
  const t = String(req.query.ticker || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = t ? await getManifest(t) : null;
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  if (!m) return res.status(404).json({ ok: false, error: `No archive yet for ${t || '?'}` });
  res.json({ ok: true, ticker: t, minuteFrom: m.m1Months[0] || null, minuteMonths: m.m1Months.length, minuteComplete: m.m1Complete,
    minutePending: m.m1Pending ?? null, hourlyYears: m.h1Years, dailyYears: m.d1Years ?? null,
    lastCandle: new Date(m.lastCandle * 1000).toISOString(), builtAt: new Date(m.builtAt * 1000).toISOString(), source: m.source });
});

/** GET /api/history/instruments — every Dukascopy instrument with its first available dates. */
historyRouter.get('/instruments', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800');
  res.json({ ok: true, instruments: listDukaInstruments() });
});
