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

/** TEMP: reachability probe for sentiment sources. */
historyRouter.get('/_sprobe', async (req: Request, res: Response) => {
  const u = String(req.query.u || '');
  if (u) {
    if (!/^https:\/\/(c\.fxssi\.com|www\.ig\.com|fxssi\.com)\//.test(u)) return res.status(400).end();
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', Referer: 'https://fxssi.com/tools/current-ratio' } });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(`STATUS ${r.status}\n` + (await r.text()).slice(0, 4000));
  }
  const urls = ["https://www.myfxbook.com/community/outlook", "https://www.myfxbook.com/community/outlook/EURUSD", "https://www.a1trading.com/retail-sentiment/", "https://fxssi.com/tools/current-ratio", "https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio-contract?instId=BTC-USDT-SWAP&period=5m&limit=1", "https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=5m", "https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1", "https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=5min&limit=1", "https://api.gateio.ws/api/v4/futures/usdt/contract_stats?contract=BTC_USDT&limit=1", "https://api.bitget.com/api/v2/mix/market/account-long-short?symbol=BTCUSDT&period=5m", "https://api.mexc.com/api/v3/ping", "https://contract.mexc.com/api/v1/contract/ticker?symbol=BTC_USDT", "https://www.dailyfx.com/sentiment", "https://www.ig.com/en/ig-client-sentiment", "https://freeserv.dukascopy.com/2.0/?path=api/sentimentIndex"];
  const out = await Promise.all(urls.map(async (url: string) => {
    const t = Date.now();
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', Accept: 'text/html,application/json' }, signal: AbortSignal.timeout(12_000) });
      const txt = await r.text();
      return { url, status: r.status, bytes: txt.length, head: txt.replace(/\s+/g, ' ').slice(0, 160), ms: Date.now() - t };
    } catch (e: any) { return { url, error: e?.message || String(e), ms: Date.now() - t }; }
  }));
  res.setHeader('Cache-Control', 'no-store');
  res.json({ region: process.env.VERCEL_REGION || null, out });
});
