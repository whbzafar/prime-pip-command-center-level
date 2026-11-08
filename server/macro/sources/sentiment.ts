/**
 * LIVE TRADER SENTIMENT (free, no keys) — positioning of real accounts, per instrument.
 *
 *  Forex · metals · oil · indices · BTC/ETH CFDs
 *    FXSSI current-ratios (c.fxssi.com/api/current-ratios): % of open positions that are LONG at up
 *    to 9 retail brokers/aggregators — MyFxBook, OANDA, Dukascopy, IG, FXBlue, XM, InstaForex,
 *    FiboGroup, AMarkets — plus FXSSI's volume-weighted average. Refreshed by FXSSI every few minutes.
 *  Crypto USDT perpetuals
 *    OKX, Gate.io and Bitget long/short ACCOUNT ratios (5-minute data) per coin; averaged.
 *    (Binance & Bybit refuse requests from US data centres, where Vercel runs.)
 *
 *  Forex crosses that no source publishes directly are DERIVED, and labelled as such: every
 *  measured pair is decomposed into currency-level positioning (long EURUSD = long EUR + short USD,
 *  weighted by how many positions each pair carries), then cross = (base − quote) / 2.
 *
 *  Reading: retail sentiment is a CONTRARIAN signal — a crowd ≥ 60 % long tends to precede weakness.
 */
import { fetchJson, mapLimit, registerSource, markSuccess, markFailure } from './http.js';

export type SentAsset = 'FOREX' | 'COMMODITIES' | 'INDICES' | 'CRYPTO';
export interface SentSource { name: string; longPct: number }
export interface SentimentRow {
  symbol: string;            // app ticker, e.g. EURUSD, XAUUSD, US500, BTCUSDT
  display: string;           // EUR/USD
  asset: SentAsset;
  longPct: number;           // 0–100, % of accounts/positions long
  shortPct: number;
  method: 'measured' | 'derived';
  sources: SentSource[];     // per-broker / per-exchange readings
  weight?: number;           // relative number of positions (FXSSI) — confidence
  crowd: 'LONG' | 'SHORT' | 'BALANCED';
  contrarian: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  strength: number;          // 0–100 — how one-sided the crowd is
  updatedAt: string;
}
export interface CurrencySentiment { currency: string; net: number; longPct: number; pairs: number }
export interface SentimentSnapshot {
  updatedAt: string;
  rows: SentimentRow[];
  currencies: CurrencySentiment[];
  sources: Array<{ id: string; name: string; ok: boolean; count: number; error?: string; at: string }>;
}

registerSource('fxssi', 'FXSSI current ratios (9 retail brokers)', 'https://fxssi.com/tools/current-ratio');
registerSource('okx-lsr', 'OKX long/short account ratio', 'https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio-contract');
registerSource('gate-lsr', 'Gate.io contract stats (account L/S)', 'https://api.gateio.ws/api/v4/futures/usdt/contract_stats');
registerSource('bitget-lsr', 'Bitget account long/short', 'https://api.bitget.com/api/v2/mix/market/account-long-short');

const FXSSI_MAP: Record<string, { symbol: string; asset: SentAsset; display: string }> = {
  XAUUSD: { symbol: 'XAUUSD', asset: 'COMMODITIES', display: 'XAU/USD' },
  XAGUSD: { symbol: 'XAGUSD', asset: 'COMMODITIES', display: 'XAG/USD' },
  XTIUSD: { symbol: 'USOIL', asset: 'COMMODITIES', display: 'WTI Crude / USD' },
  XBRUSD: { symbol: 'UKOIL', asset: 'COMMODITIES', display: 'Brent Crude / USD' },
  SP500: { symbol: 'US500', asset: 'INDICES', display: 'S&P 500' },
  NAS100: { symbol: 'US100', asset: 'INDICES', display: 'Nasdaq 100' },
  US30: { symbol: 'US30', asset: 'INDICES', display: 'Dow Jones 30' },
  GER40: { symbol: 'GER40', asset: 'INDICES', display: 'DAX 40' },
  USDX: { symbol: 'DXY', asset: 'INDICES', display: 'US Dollar Index' },
  BTCUSD: { symbol: 'BTCUSD', asset: 'CRYPTO', display: 'BTC/USD (CFD brokers)' },
  ETHUSD: { symbol: 'ETHUSD', asset: 'CRYPTO', display: 'ETH/USD (CFD brokers)' },
};
const BROKER_NAMES: Record<string, string> = {
  myfxbook: 'MyFxBook', ftroanda: 'OANDA', dukscopy: 'Dukascopy', fxcm: 'IG', fxblue: 'FXBlue', xm: 'XM',
  instfor: 'InstaForex', fiboforx: 'FiboGroup', amarkets: 'AMarkets', fxssi: 'FXSSI',
};
const G8 = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD'];
const ORDER = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY']; // market convention for base currency
export const CRYPTO_COINS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'DOGE', 'ADA', 'AVAX', 'LINK', 'LTC', 'DOT', 'TRX', 'TON', 'SUI', 'BCH', 'NEAR', 'APT', 'ARB', 'OP', 'PEPE'];

const r1 = (x: number) => Math.round(x * 10) / 10;
function finish(row: Omit<SentimentRow, 'shortPct' | 'crowd' | 'contrarian' | 'strength'>): SentimentRow {
  const L = Math.min(100, Math.max(0, row.longPct));
  const strength = Math.round(Math.abs(L - 50) * 2);
  return {
    ...row, longPct: r1(L), shortPct: r1(100 - L),
    crowd: L >= 55 ? 'LONG' : L <= 45 ? 'SHORT' : 'BALANCED',
    contrarian: L >= 60 ? 'BEARISH' : L <= 40 ? 'BULLISH' : 'NEUTRAL',
    strength,
  };
}

async function loadFxssi(now: string) {
  const j: any = await fetchJson(`https://c.fxssi.com/api/current-ratios?filter=EURUSD&user_id=0&rand=${Math.random()}`, {
    timeoutMs: 9000, retries: 1, headers: { Referer: 'https://fxssi.com/tools/current-ratio', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' },
  });
  const pairs: Record<string, Record<string, string>> = j?.pairs || {};
  const weights: Record<string, number> = j?.pair_weights || {};
  const at = j?.formed ? new Date(j.formed * 1000).toISOString() : now;
  const rows: SentimentRow[] = [];
  for (const [sym, vals] of Object.entries(pairs)) {
    const avg = Number(vals.average);
    if (!Number.isFinite(avg)) continue;
    const sources = Object.entries(vals).filter(([k]) => k !== 'average' && BROKER_NAMES[k]).map(([k, v]) => ({ name: BROKER_NAMES[k] || k, longPct: r1(Number(v)) })).filter((s) => Number.isFinite(s.longPct));
    const m = FXSSI_MAP[sym];
    const isFx = !m && /^[A-Z]{6}$/.test(sym) && G8.includes(sym.slice(0, 3)) && G8.includes(sym.slice(3));
    if (!m && !isFx) continue;
    rows.push(finish({
      symbol: m?.symbol || sym, display: m?.display || `${sym.slice(0, 3)}/${sym.slice(3)}`, asset: m?.asset || 'FOREX',
      longPct: avg, method: 'measured', sources, weight: weights[sym], updatedAt: at,
    }));
  }
  return rows;
}

async function okx(coin: string): Promise<number | null> {
  const j: any = await fetchJson(`https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio-contract?instId=${coin}-USDT-SWAP&period=5m&limit=1`, { timeoutMs: 7000, retries: 0 });
  const ratio = Number(j?.data?.[0]?.[1]);
  return Number.isFinite(ratio) && ratio > 0 ? (ratio / (1 + ratio)) * 100 : null;
}
async function gate(coin: string): Promise<number | null> {
  const j: any = await fetchJson(`https://api.gateio.ws/api/v4/futures/usdt/contract_stats?contract=${coin}_USDT&limit=1`, { timeoutMs: 7000, retries: 0 });
  const ratio = Number(j?.[j.length - 1]?.lsr_account);
  return Number.isFinite(ratio) && ratio > 0 ? (ratio / (1 + ratio)) * 100 : null;
}
async function bitget(coin: string): Promise<number | null> {
  const j: any = await fetchJson(`https://api.bitget.com/api/v2/mix/market/account-long-short?symbol=${coin}USDT&period=5m`, { timeoutMs: 7000, retries: 0 });
  const rows: any[] = j?.data || [];
  const last = rows.reduce((a, b) => (Number(b.ts) > Number(a?.ts || 0) ? b : a), null as any);
  const v = Number(last?.longAccountRatio);
  return Number.isFinite(v) && v > 0 && v < 1 ? v * 100 : null;
}

async function loadCrypto(now: string) {
  const stats = { okx: 0, gate: 0, bitget: 0, errors: [] as string[] };
  const rows = await mapLimit(CRYPTO_COINS, 6, async (coin) => {
    const got = await Promise.allSettled([okx(coin), gate(coin), bitget(coin)]);
    const sources: SentSource[] = [];
    (['OKX', 'Gate.io', 'Bitget'] as const).forEach((name, i) => {
      const g = got[i];
      if (g.status === 'fulfilled' && g.value !== null) { sources.push({ name, longPct: r1(g.value) }); (stats as any)[name === 'Gate.io' ? 'gate' : name.toLowerCase()]++; }
      else if (g.status === 'rejected') stats.errors.push(`${name} ${coin}: ${(g.reason as Error)?.message || g.reason}`);
    });
    if (!sources.length) return null;
    const avg = sources.reduce((s, x) => s + x.longPct, 0) / sources.length;
    return finish({ symbol: `${coin}USDT`, display: `${coin}/USDT`, asset: 'CRYPTO', longPct: avg, method: 'measured', sources, updatedAt: now });
  });
  return { rows: rows.filter((r): r is SentimentRow => !!r), stats };
}

/** Currency-level positioning from every measured G8 pair, then every missing G8 cross derived from it. */
function deriveCurrencies(fx: SentimentRow[]) {
  const acc: Record<string, { sum: number; w: number; n: number }> = {};
  for (const r of fx) {
    const b = r.symbol.slice(0, 3), q = r.symbol.slice(3);
    const net = (r.longPct - 50) / 50;
    const w = Math.sqrt(Math.max(1, r.weight || 1));
    for (const [c, sgn] of [[b, 1], [q, -1]] as const) {
      acc[c] ||= { sum: 0, w: 0, n: 0 };
      acc[c].sum += sgn * net * w; acc[c].w += w; acc[c].n++;
    }
  }
  const currencies: CurrencySentiment[] = G8.filter((c) => acc[c]).map((c) => {
    const net = acc[c].sum / acc[c].w;
    return { currency: c, net: Math.round(net * 1000) / 1000, longPct: r1(50 + 50 * net), pairs: acc[c].n };
  });
  return currencies;
}

function derivedCrosses(measured: Set<string>, currencies: CurrencySentiment[], now: string): SentimentRow[] {
  const net = Object.fromEntries(currencies.map((c) => [c.currency, c.net]));
  const out: SentimentRow[] = [];
  for (let i = 0; i < ORDER.length; i++) for (let k = i + 1; k < ORDER.length; k++) {
    const b = ORDER[i], q = ORDER[k], sym = b + q;
    if (measured.has(sym) || net[b] === undefined || net[q] === undefined) continue;
    const d = (net[b] - net[q]) / 2;
    out.push(finish({ symbol: sym, display: `${b}/${q}`, asset: 'FOREX', longPct: 50 + 50 * d, method: 'derived',
      sources: [{ name: `${b} crowd`, longPct: r1(50 + 50 * net[b]) }, { name: `${q} crowd`, longPct: r1(50 + 50 * net[q]) }], updatedAt: now }));
  }
  return out;
}

let cache: { at: number; data: SentimentSnapshot } | null = null;
let inflight: Promise<SentimentSnapshot> | null = null;

export async function getSentiment(maxAgeMs = 60_000): Promise<SentimentSnapshot> {
  if (cache && Date.now() - cache.at < maxAgeMs) return cache.data;
  if (inflight) return inflight;
  inflight = (async () => {
    const now = new Date().toISOString();
    const sources: SentimentSnapshot['sources'] = [];
    let fxssiRows: SentimentRow[] = [];
    try { fxssiRows = await loadFxssi(now); markSuccess('fxssi', fxssiRows.length); sources.push({ id: 'fxssi', name: 'FXSSI · 9 retail brokers', ok: fxssiRows.length > 0, count: fxssiRows.length, at: now }); }
    catch (e: any) { markFailure('fxssi', e); sources.push({ id: 'fxssi', name: 'FXSSI · 9 retail brokers', ok: false, count: 0, error: e?.message, at: now }); }
    let cryptoRows: SentimentRow[] = [];
    try {
      const c = await loadCrypto(now);
      cryptoRows = c.rows;
      for (const [id, name, n] of [['okx-lsr', 'OKX', c.stats.okx], ['gate-lsr', 'Gate.io', c.stats.gate], ['bitget-lsr', 'Bitget', c.stats.bitget]] as const) {
        if (n > 0) markSuccess(id, n); else markFailure(id, c.stats.errors.find((x) => x.startsWith(name)) || 'no data');
        sources.push({ id, name, ok: n > 0, count: n, error: n ? undefined : c.stats.errors.find((x) => x.startsWith(name)), at: now });
      }
    } catch (e: any) { sources.push({ id: 'crypto', name: 'Crypto exchanges', ok: false, count: 0, error: e?.message, at: now }); }

    const fx = fxssiRows.filter((r) => r.asset === 'FOREX');
    const currencies = deriveCurrencies(fx);
    const rows = [...fxssiRows, ...derivedCrosses(new Set(fx.map((r) => r.symbol)), currencies, now), ...cryptoRows];
    if (!rows.length && cache) return cache.data; // keep the last good snapshot through a blip
    const data: SentimentSnapshot = { updatedAt: now, rows, currencies, sources };
    if (rows.length) cache = { at: Date.now(), data };
    return data;
  })().finally(() => { inflight = null; });
  return inflight;
}

/** Sentiment for one app ticker (pair or asset), or null. */
export function sentimentFor(snapshot: SentimentSnapshot, ticker: string): SentimentRow | null {
  const t = ticker.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const alias: Record<string, string> = { BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', SPX500: 'US500', NAS100: 'US100', WTI: 'USOIL', BRENT: 'UKOIL', DXY: 'DXY', USDX: 'DXY' };
  return snapshot.rows.find((r) => r.symbol === t) || snapshot.rows.find((r) => r.symbol === alias[t]) || null;
}
