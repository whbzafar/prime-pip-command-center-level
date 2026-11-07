/**
 * Crypto fundamentals from free public endpoints (no keys):
 *  - Perpetual funding rate & open interest: Binance USDⓈ-M futures → Bybit fallback (geo-blocks)
 *  - Crypto Fear & Greed Index: alternative.me
 *  - Total stablecoin supply (on-chain liquidity): DefiLlama
 *  - Bitcoin network hash rate (miner conviction / security): blockchain.com
 */
import { fetchJson, mapLimit, markFailure, markSuccess, registerSource, toNum } from './http.js';

export const CRYPTO_DERIV_ID = 'crypto_derivatives';
export const FNG_ID = 'crypto_fng';
export const STABLE_ID = 'stablecoins';
export const HASH_ID = 'btc_hashrate';
registerSource(CRYPTO_DERIV_ID, 'Perp funding & open interest (Binance → Bybit → Hyperliquid)', 'https://www.binance.com/en/futures/funding-history');
registerSource(FNG_ID, 'Crypto Fear & Greed Index (alternative.me)', 'https://alternative.me/crypto/fear-and-greed-index/');
registerSource(STABLE_ID, 'Total stablecoin supply (DefiLlama)', 'https://defillama.com/stablecoins');
registerSource(HASH_ID, 'Bitcoin hash rate (blockchain.com)', 'https://www.blockchain.com/explorer/charts/hash-rate');

export const CRYPTO_ASSETS = ['BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'DOGE', 'ADA', 'LINK'] as const;

export interface DerivSnapshot {
  asset: string;
  fundingRate: number | null; // per 8h, decimal (0.0001 = 0.01%)
  oiNow: number | null;
  oi7dAgo: number | null;
  oi30dAgo: number | null;
  via: string;
  at: string;
}

export interface SeriesValue { date: string; value: number }

const deriv = new Map<string, DerivSnapshot>();
let fng: SeriesValue[] = [];
let stables: SeriesValue[] = [];
let hashrate: SeriesValue[] = [];
let lastLoad = 0;
const TTL = 5 * 60 * 1000;

async function binanceDeriv(sym: string): Promise<Omit<DerivSnapshot, 'asset' | 'at'>> {
  const prem = await fetchJson<any>(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${sym}`, { retries: 0, timeoutMs: 8000 });
  const hist = await fetchJson<any[]>(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${sym}&period=1d&limit=31`, { retries: 0, timeoutMs: 8000 });
  const vals = (hist || []).map((h) => toNum(h.sumOpenInterestValue)).filter((v): v is number => v !== null);
  return {
    fundingRate: toNum(prem?.lastFundingRate),
    oiNow: vals.length ? vals[vals.length - 1] : null,
    oi7dAgo: vals.length > 7 ? vals[vals.length - 8] : null,
    oi30dAgo: vals.length > 30 ? vals[0] : null,
    via: 'Binance Futures',
  };
}

async function bybitDeriv(sym: string): Promise<Omit<DerivSnapshot, 'asset' | 'at'>> {
  const t = await fetchJson<any>(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${sym}`, { retries: 0, timeoutMs: 8000 });
  const oi = await fetchJson<any>(`https://api.bybit.com/v5/market/open-interest?category=linear&symbol=${sym}&intervalTime=1d&limit=31`, { retries: 0, timeoutMs: 8000 });
  const list: any[] = oi?.result?.list || []; // newest first
  const vals = list.map((r) => toNum(r.openInterest)).filter((v): v is number => v !== null);
  return {
    fundingRate: toNum(t?.result?.list?.[0]?.fundingRate),
    oiNow: vals[0] ?? null,
    oi7dAgo: vals[7] ?? null,
    oi30dAgo: vals[30] ?? null,
    via: 'Bybit',
  };
}

/**
 * Hyperliquid public API (no key, no geo-block) — one request returns every perp's funding and
 * open interest. Hyperliquid funding is paid HOURLY; ×8 converts it to the 8-hour convention.
 */
let hlCache: { at: number; map: Map<string, { funding: number | null; oi: number | null }> } | null = null;
async function hyperliquidAll(): Promise<Map<string, { funding: number | null; oi: number | null }>> {
  if (hlCache && Date.now() - hlCache.at < 60_000) return hlCache.map;
  const res = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from api.hyperliquid.xyz`);
  const [meta, ctxs] = (await res.json()) as [any, any[]];
  const map = new Map<string, { funding: number | null; oi: number | null }>();
  (meta?.universe || []).forEach((u: any, i: number) => {
    const c = ctxs?.[i];
    const f = toNum(c?.funding);
    map.set(String(u?.name), { funding: f === null ? null : f * 8, oi: toNum(c?.openInterest) });
  });
  hlCache = { at: Date.now(), map };
  return map;
}

async function hyperliquidDeriv(sym: string): Promise<Omit<DerivSnapshot, 'asset' | 'at'>> {
  const m = await hyperliquidAll();
  const x = m.get(sym.replace(/USDT$/, ''));
  if (!x) throw new Error(`${sym} not listed on Hyperliquid`);
  return { fundingRate: x.funding, oiNow: x.oi, oi7dAgo: null, oi30dAgo: null, via: 'Hyperliquid' };
}

export async function refreshCrypto(force = false): Promise<void> {
  if (!force && Date.now() - lastLoad < TTL) return;
  lastLoad = Date.now();

  // Derivatives
  let derivOk = 0;
  let derivErr: unknown = null;
  await mapLimit([...CRYPTO_ASSETS], 3, async (asset) => {
    const sym = `${asset}USDT`;
    for (const fn of [binanceDeriv, bybitDeriv, hyperliquidDeriv]) {
      try {
        const r = await fn(sym);
        if (r.fundingRate !== null || r.oiNow !== null) {
          deriv.set(asset, { asset, ...r, at: new Date().toISOString() });
          derivOk++;
          return;
        }
      } catch (err) { derivErr = err; }
    }
  });
  derivOk ? markSuccess(CRYPTO_DERIV_ID, derivOk) : markFailure(CRYPTO_DERIV_ID, derivErr || new Error('No derivatives data'));

  // Fear & Greed
  try {
    const j = await fetchJson<any>('https://api.alternative.me/fng/?limit=60');
    const rows: any[] = j?.data || [];
    fng = rows
      .map((r) => ({ date: new Date(Number(r.timestamp) * 1000).toISOString().slice(0, 10), value: toNum(r.value) }))
      .filter((r): r is SeriesValue => r.value !== null)
      .reverse();
    markSuccess(FNG_ID, fng.length);
  } catch (err) { markFailure(FNG_ID, err); }

  // Stablecoin supply
  try {
    const j = await fetchJson<any[]>('https://stablecoins.llama.fi/stablecoincharts/all', { timeoutMs: 20_000 });
    stables = (j || [])
      .slice(-120)
      .map((r) => ({ date: new Date(Number(r.date) * 1000).toISOString().slice(0, 10), value: toNum(r?.totalCirculatingUSD?.peggedUSD) }))
      .filter((r): r is SeriesValue => r.value !== null);
    // DefiLlama's newest point is the still-incomplete current day; never score a partial value.
    const today = new Date().toISOString().slice(0, 10);
    if (stables.length && stables[stables.length - 1].date >= today) stables.pop();
    markSuccess(STABLE_ID, stables.length);
  } catch (err) { markFailure(STABLE_ID, err); }

  // BTC hash rate
  try {
    const j = await fetchJson<any>('https://api.blockchain.info/charts/hash-rate?timespan=120days&format=json&cors=true');
    hashrate = (j?.values || [])
      .map((v: any) => ({ date: new Date(Number(v.x) * 1000).toISOString().slice(0, 10), value: toNum(v.y) }))
      .filter((r: any): r is SeriesValue => r.value !== null);
    markSuccess(HASH_ID, hashrate.length);
  } catch (err) { markFailure(HASH_ID, err); }
}

export const getDeriv = (asset: string) => deriv.get(asset) || null;
export const getFng = () => fng;
export const getStables = () => stables;
export const getHashrate = () => hashrate;

export function __setCryptoForTest(d: { deriv?: DerivSnapshot[]; fng?: SeriesValue[]; stables?: SeriesValue[]; hashrate?: SeriesValue[] }) {
  d.deriv?.forEach((x) => deriv.set(x.asset, x));
  if (d.fng) fng = d.fng;
  if (d.stables) stables = d.stables;
  if (d.hashrate) hashrate = d.hashrate;
}
