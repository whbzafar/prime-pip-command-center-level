/**
 * EVENT SHOCK SIMULATOR — before a scheduled release, show how markets really moved after the
 * same release in the past, split by surprise (actual vs forecast), and the resulting price range
 * for "above forecast" / "in line" / "below forecast".
 *   • Release history: TradingView economic calendar (actual, forecast), ~3 years for that country.
 *   • Reactions: Dukascopy 15-minute candles, reference = close of the bar before the release, moves
 *     at +15 min, +1 h, +4 h and +24 h.
 * Every number is measured; nothing is modelled or invented.
 */
import { Router, type Request, type Response } from 'express';
import { fetchJson } from '../macro/sources/http.js';
import { normalizeKey, parseTvEvent, type TvEvent } from '../macro/sources/tvCalendar.js';
import { dukaRange, type Candle } from '../history/historyService.js';
import { redisCmd } from '../durableStore.js';

export const shockRouter = Router();

const DAY = 86_400_000;
const COUNTRIES = ['US', 'EU', 'DE', 'GB', 'JP', 'CA', 'AU', 'NZ', 'CH', 'CN'];
/** Instruments measured for a release, by the releasing country. */
const INSTRUMENTS: Record<string, string[]> = {
  US: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'US100'],
  EU: ['EURUSD', 'EURJPY', 'EURGBP', 'XAUUSD', 'GER40'], DE: ['EURUSD', 'EURJPY', 'GER40', 'XAUUSD'],
  GB: ['GBPUSD', 'GBPJPY', 'EURGBP', 'UK100'], JP: ['USDJPY', 'EURJPY', 'GBPJPY', 'JP225'],
  CA: ['USDCAD', 'CADJPY', 'XAUUSD'], AU: ['AUDUSD', 'AUDJPY', 'AUDNZD'], NZ: ['NZDUSD', 'NZDJPY', 'AUDNZD'],
  CH: ['USDCHF', 'EURCHF', 'XAUUSD'], CN: ['AUDUSD', 'NZDUSD', 'XAUUSD'],
};
const DUKA: Record<string, string> = { XAUUSD: 'xauusd', US100: 'usatechidxusd', GER40: 'deuidxeur', UK100: 'gbridxgbp', JP225: 'jpnidxjpy' };
const dukaId = (s: string) => DUKA[s] || s.toLowerCase();
const HORIZONS: Array<{ k: string; ms: number }> = [{ k: '15m', ms: 15 * 60_000 }, { k: '1h', ms: 3_600_000 }, { k: '4h', ms: 4 * 3_600_000 }, { k: '24h', ms: DAY }];

async function fetchCountry(country: string, from: number, to: number): Promise<TvEvent[]> {
  const url = `https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(new Date(from).toISOString())}&to=${encodeURIComponent(new Date(to).toISOString())}&countries=${country}`;
  const p = await fetchJson<any>(url, { timeoutMs: 15_000, headers: { Origin: 'https://www.tradingview.com', Referer: 'https://www.tradingview.com/' } });
  const rows: any[] = Array.isArray(p?.result) ? p.result : Array.isArray(p) ? p : [];
  return rows.map(parseTvEvent).filter((e): e is TvEvent => e !== null);
}

const histCache = new Map<string, { at: number; ev: TvEvent[] }>();
async function countryHistory(country: string): Promise<TvEvent[]> {
  const hit = histCache.get(country);
  if (hit && Date.now() - hit.at < 12 * 3_600_000) return hit.ev;
  const now = Date.now();
  const ranges: Array<[number, number]> = [];
  for (let back = 3 * 365; back > 0; back -= 45) ranges.push([now - back * DAY, Math.min(now, now - (back - 45) * DAY)]);
  const res = await Promise.allSettled(ranges.map(([f, t]) => fetchCountry(country, f, t)));
  const byId = new Map<string, TvEvent>();
  for (const r of res) if (r.status === 'fulfilled') for (const e of r.value) byId.set(e.id, e);
  if (!byId.size) throw new Error('The economic calendar is not reachable right now.');
  const ev = [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
  histCache.set(country, { at: Date.now(), ev });
  return ev;
}

/** Percent moves at each horizon from the close of the 15-minute bar before the release. */
export function reactionFrom(candles: Candle[], ts: number) {
  const c = candles.filter((x) => x.close > 0).sort((a, b) => a.timestamp - b.timestamp);
  const pre = [...c].reverse().find((x) => x.timestamp + 15 * 60_000 <= ts);
  if (!pre) return null;
  const out: Record<string, number | null> = {};
  for (const h of HORIZONS) {
    const target = ts + h.ms;
    const bar = [...c].reverse().find((x) => x.timestamp + 15 * 60_000 <= target + 1);
    out[h.k] = bar && bar.timestamp >= ts ? Number((((bar.close - pre.close) / pre.close) * 100).toFixed(3)) : null;
  }
  // Largest excursion in the first hour (spike size), either side.
  const first = c.filter((x) => x.timestamp >= ts && x.timestamp < ts + 3_600_000);
  const up = first.length ? (Math.max(...first.map((x) => x.high)) - pre.close) / pre.close * 100 : null;
  const dn = first.length ? (Math.min(...first.map((x) => x.low)) - pre.close) / pre.close * 100 : null;
  return { ...out, spikeUp: up === null ? null : Number(up.toFixed(3)), spikeDown: dn === null ? null : Number(dn.toFixed(3)) };
}

const quant = (v: number[], q: number) => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); const i = (s.length - 1) * q; const lo = Math.floor(i), hi = Math.ceil(i); return Number((s[lo] + (s[hi] - s[lo]) * (i - lo)).toFixed(3)); };
const mean = (v: number[]) => (v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(3)) : null);

/** Classify each release by surprise size relative to the typical surprise for that indicator. */
export function classify(rows: Array<{ actual: number | null; forecast: number | null }>) {
  const s = rows.map((r) => (r.actual !== null && r.forecast !== null ? r.actual - r.forecast : null)).filter((x): x is number => x !== null);
  const mad = quant(s.map((x) => Math.abs(x)), 0.5) || 0;
  const band = mad * 0.5;
  return rows.map((r) => {
    if (r.actual === null || r.forecast === null) return 'unknown' as const;
    const d = r.actual - r.forecast;
    if (Math.abs(d) <= band || d === 0) return 'inline' as const;
    return d > 0 ? ('above' as const) : ('below' as const);
  });
}

/** GET /api/shock/upcoming — high-impact releases in the next 7 days. */
shockRouter.get('/upcoming', async (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    const all = (await Promise.all(COUNTRIES.map((c) => fetchCountry(c, now - 2 * 3_600_000, now + 7 * DAY).catch(() => [] as TvEvent[])))).flat();
    const rows = all.filter((e) => e.importance >= 1).sort((a, b) => a.timestamp - b.timestamp)
      .map((e) => ({ id: e.id, title: e.title, key: e.key, country: e.country, currency: e.currency, at: e.iso, forecast: e.forecast, previous: e.previous, actual: e.actual, unit: e.unit }));
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    res.json({ ok: true, rows });
  } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || 'Calendar unavailable') }); }
});

/** GET /api/shock/history?country=US&key=non farm payrolls */
shockRouter.get('/history', async (req: Request, res: Response) => {
  const country = String(req.query.country || '').toUpperCase();
  const key = normalizeKey(String(req.query.key || ''));
  if (!COUNTRIES.includes(country) || !key) return res.status(400).json({ ok: false, error: 'country and key are required' });
  const ck = `ppfx:shock:v1:${country}:${key}`;
  try {
    const cached = await redisCmd(['GET', ck]).catch(() => null);
    if (cached) { res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400'); return res.json(JSON.parse(cached)); }
    const hist = await countryHistory(country);
    const now = Date.now();
    const past = hist.filter((e) => e.key === key && e.timestamp < now - DAY && e.actual !== null).slice(-24);
    if (past.length < 3) return res.json({ ok: true, country, key, releases: [], instruments: [], note: 'Not enough past releases of this event with published results to measure.' });
    const cls = classify(past);
    const instruments = INSTRUMENTS[country] || ['XAUUSD'];
    // Measure every (release × instrument) with limited concurrency.
    const jobs: Array<{ i: number; sym: string }> = [];
    past.forEach((_, i) => instruments.forEach((sym) => jobs.push({ i, sym })));
    const react: Record<string, any[]> = Object.fromEntries(instruments.map((s) => [s, new Array(past.length).fill(null)]));
    const started = Date.now();
    const work = async () => {
      for (let j = jobs.shift(); j; j = jobs.shift()) {
        if (Date.now() - started > 40_000) return; // stay inside the request budget
        const ts = past[j.i].timestamp;
        try { react[j.sym][j.i] = reactionFrom(await dukaRange(dukaId(j.sym), 'm15', ts - 45 * 60_000, ts + DAY + 30 * 60_000), ts); } catch { /* leave null */ }
      }
    };
    await Promise.all(Array.from({ length: 10 }, work));
    const releases = past.map((e, i) => ({ at: e.iso, period: e.period, actual: e.actual, forecast: e.forecast, previous: e.previous, surprise: cls[i], moves: Object.fromEntries(instruments.map((s) => [s, react[s][i]])) })).reverse();
    const stats = instruments.map((sym) => {
      const by = (c: string) => past.map((_, i) => ({ c: cls[i], r: react[sym][i] })).filter((x) => x.c === c && x.r);
      const block = (c: string) => {
        const rows = by(c);
        const out: any = { n: rows.length };
        for (const h of HORIZONS) {
          const v = rows.map((x) => x.r[h.k]).filter((x: any) => typeof x === 'number') as number[];
          out[h.k] = { mean: mean(v), p25: quant(v, 0.25), p75: quant(v, 0.75), upShare: v.length ? Math.round((v.filter((x) => x > 0).length / v.length) * 100) : null };
        }
        const spikes = rows.map((x) => Math.max(Math.abs(x.r.spikeUp ?? 0), Math.abs(x.r.spikeDown ?? 0)));
        out.spikeMedian = quant(spikes, 0.5);
        return out;
      };
      const measured = react[sym].filter(Boolean).length;
      return { symbol: sym, measured, above: block('above'), inline: block('inline'), below: block('below') };
    });
    const body = {
      ok: true, country, key, title: past[past.length - 1].title, unit: past[past.length - 1].unit, count: past.length,
      surpriseBand: 'Above / below = actual differs from forecast by more than half the typical surprise for this release; otherwise in line.',
      releases, instruments: stats, generatedAt: new Date().toISOString(),
      sources: ['TradingView economic calendar (actual & forecast)', 'Dukascopy 15-minute prices'],
      disclaimer: 'Past reactions do not guarantee future moves. Educational — not financial advice.',
    };
    const complete = stats.every((s) => s.measured >= Math.min(past.length, 3));
    if (complete) await redisCmd(['SET', ck, JSON.stringify(body), 'EX', 12 * 3600]).catch(() => null);
    res.setHeader('Cache-Control', complete ? 'public, s-maxage=21600, stale-while-revalidate=86400' : 'no-store');
    res.json(body);
  } catch (e: any) { res.status(503).json({ ok: false, error: String(e?.message || 'Simulator unavailable') }); }
});
