/**
 * FOREX.com (StoneX / City Index REST API) price history — used for forex pairs and commodities when the
 * owner has configured API access on the server:
 *   FOREXCOM_USERNAME, FOREXCOM_PASSWORD, FOREXCOM_APPKEY   (Render → Environment; never sent to the browser)
 *   FOREXCOM_API (optional, default https://ciapi.cityindex.com/TradingAPI)
 * Every failure returns null so the caller falls back to Dukascopy / Yahoo — the chart never breaks.
 */
import type { Candle, Tf } from './historyService.js';

const API = () => (process.env.FOREXCOM_API || 'https://ciapi.cityindex.com/TradingAPI').replace(/\/$/, '');
export const forexcomConfigured = () => Boolean(process.env.FOREXCOM_USERNAME && process.env.FOREXCOM_PASSWORD && process.env.FOREXCOM_APPKEY);

let session: { id: string; at: number } | null = null;
let lastError: string | null = null;
let lastOkAt = 0;
const marketIds = new Map<string, number | null>();

async function login(): Promise<string> {
  if (session && Date.now() - session.at < 50 * 60_000) return session.id;
  const r = await fetch(`${API()}/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ UserName: process.env.FOREXCOM_USERNAME, Password: process.env.FOREXCOM_PASSWORD, AppKey: process.env.FOREXCOM_APPKEY, AppVersion: '1', AppComments: 'PrimePipFX' }),
    signal: AbortSignal.timeout(8000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.Session) throw new Error(`login failed (${j.ErrorMessage || j.Message || `HTTP ${r.status}`})`);
  session = { id: j.Session, at: Date.now() };
  return j.Session;
}

async function api(path: string): Promise<any> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const s = await login();
    const r = await fetch(`${API()}${path}`, { headers: { Session: s, UserName: String(process.env.FOREXCOM_USERNAME) }, signal: AbortSignal.timeout(9000) });
    if (r.status === 401 && attempt === 0) { session = null; continue; }
    const j: any = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.ErrorMessage || `HTTP ${r.status}`);
    return j;
  }
}

/** Dukascopy id / ticker → FOREX.com search text. */
const COMMODITY: Record<string, string[]> = {
  xauusd: ['Spot Gold', 'Gold'], xagusd: ['Spot Silver', 'Silver'], lightcmdusd: ['US Crude Oil', 'US Crude', 'WTI'], brentcmdusd: ['UK Crude Oil', 'UK Crude', 'Brent'],
  gascmdusd: ['Natural Gas'], coppercmdusd: ['Copper'], xptusd: ['Spot Platinum', 'Platinum'], xpdusd: ['Spot Palladium', 'Palladium'],
};
export function forexcomQueries(dukaId: string): string[] | null {
  const id = dukaId.toLowerCase();
  if (COMMODITY[id]) return COMMODITY[id];
  if (/^[a-z]{6}$/.test(id)) return [`${id.slice(0, 3).toUpperCase()}/${id.slice(3).toUpperCase()}`];
  return null;
}

async function marketId(dukaId: string): Promise<number | null> {
  if (marketIds.has(dukaId)) return marketIds.get(dukaId)!;
  const qs = forexcomQueries(dukaId) || [];
  for (const q of qs) {
    const j = await api(`/market/fullsearchwithtags?query=${encodeURIComponent(q)}&maxResults=20`);
    const list: any[] = j?.MarketInformation || j?.Markets || [];
    const norm = (s: string) => String(s || '').toUpperCase();
    const pick = list.find((m) => norm(m.Name) === norm(q)) || list.find((m) => norm(m.Name).startsWith(norm(q)) && !/FUTURE|\d{2}\b/i.test(m.Name)) || list.find((m) => norm(m.Name).includes(norm(q)));
    if (pick?.MarketId) { marketIds.set(dukaId, Number(pick.MarketId)); return Number(pick.MarketId); }
  }
  marketIds.set(dukaId, null);
  return null;
}

const TF_MAP: Record<Tf, { interval: string; span: number; agg?: 'w1' | 'mn1' } > = {
  m1: { interval: 'MINUTE', span: 1 }, m5: { interval: 'MINUTE', span: 5 }, m15: { interval: 'MINUTE', span: 15 }, m30: { interval: 'MINUTE', span: 30 },
  h1: { interval: 'HOUR', span: 1 }, h4: { interval: 'HOUR', span: 4 }, d1: { interval: 'DAY', span: 1 }, w1: { interval: 'WEEK', span: 1 }, mn1: { interval: 'DAY', span: 1, agg: 'mn1' },
};
export const parseCiDate = (v: any): number => { const m = /Date\((-?\d+)/.exec(String(v)); return m ? Number(m[1]) : Date.parse(String(v)); };

export async function forexcomBefore(dukaId: string, tf: Tf, before: number, count: number): Promise<{ candles: Candle[]; reachedStart: boolean } | null> {
  if (!forexcomConfigured() || !forexcomQueries(dukaId)) return null;
  try {
    const id = await marketId(dukaId);
    if (!id) return null;
    const t = TF_MAP[tf];
    const n = Math.min(4000, t.agg ? count * 23 : count);
    const j = await api(`/market/${id}/barhistorybefore?interval=${t.interval}&span=${t.span}&maxResults=${n}&toTimestampUTC=${Math.floor(before / 1000)}&priceType=MID`);
    let candles: Candle[] = (j?.PriceBars || []).map((b: any) => ({ timestamp: parseCiDate(b.BarDate), open: +b.Open, high: +b.High, low: +b.Low, close: +b.Close, volume: 0 }))
      .filter((c: Candle) => Number.isFinite(c.timestamp) && c.timestamp < before && Number.isFinite(c.close)).sort((a: Candle, b: Candle) => a.timestamp - b.timestamp);
    // newest (still forming) bar
    if (before >= Date.now() - 60_000 && j?.PartialPriceBar) {
      const b = j.PartialPriceBar; const ts = parseCiDate(b.BarDate);
      if (Number.isFinite(ts) && (!candles.length || ts > candles[candles.length - 1].timestamp)) candles.push({ timestamp: ts, open: +b.Open, high: +b.High, low: +b.Low, close: +b.Close, volume: 0 });
    }
    if (t.agg) { const { aggregate } = await import('./historyService.js'); candles = aggregate(candles, t.agg); }
    if (!candles.length) return null;
    lastOkAt = Date.now(); lastError = null;
    return { candles: candles.slice(-count), reachedStart: candles.length < Math.min(count, n) * 0.5 };
  } catch (err: any) {
    lastError = String(err?.message || err);
    return null;
  }
}

export const forexcomStatus = () => ({ configured: forexcomConfigured(), lastOkAt: lastOkAt || null, lastError, markets: Object.fromEntries(marketIds) });
