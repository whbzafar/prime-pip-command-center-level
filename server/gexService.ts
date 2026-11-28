import type { Express } from "express";
import { computeGex, readout, RATE, type Contract } from "./gexEngine.js";

/* Live GEX data. Source: the public Nasdaq.com option chain (all US option exchanges combined, about 15 minutes delayed, free, no key).
   Nothing is simulated: if the source cannot be reached the API says so instead of showing numbers. */

export interface SymbolDef { sym: string; name: string; cls: "etf" | "stocks"; tracks?: string; indexSym?: string; ref?: string; note: string }
export const SYMBOLS: SymbolDef[] = [
  { sym: "SPY", name: "S&P 500 (SPY)", cls: "etf", tracks: "SPX", indexSym: "SPX", note: "Deepest options market in the world. Levels convert to S&P 500 index points." },
  { sym: "QQQ", name: "NASDAQ-100 (QQQ)", cls: "etf", tracks: "NDX", indexSym: "NDX", note: "Levels convert to NASDAQ-100 index points; most CFD brokers quote NAS100/US100 near these." },
  { sym: "GLD", name: "Gold (GLD)", cls: "etf", tracks: "XAUUSD", ref: "XAUUSD", note: "Gold ETF options. Levels convert to XAUUSD using the live gold price; COMEX gold options are not free." },
  { sym: "SLV", name: "Silver (SLV)", cls: "etf", tracks: "XAGUSD", ref: "XAGUSD", note: "Silver ETF options, converted to XAGUSD with the live silver price." },
  { sym: "IWM", name: "Russell 2000 (IWM)", cls: "etf", tracks: "RUT", note: "Small caps." },
  { sym: "DIA", name: "Dow Jones (DIA)", cls: "etf", tracks: "DJI", note: "Dow 30." },
  { sym: "TLT", name: "20Y Treasuries (TLT)", cls: "etf", note: "Rates / bond-market positioning." },
  { sym: "UUP", name: "US Dollar (UUP)", cls: "etf", tracks: "DXY", note: "Dollar-index ETF; thin options, treat with care." },
  { sym: "USO", name: "Crude Oil (USO)", cls: "etf", tracks: "WTI", note: "Oil ETF options." },
  { sym: "NVDA", name: "NVIDIA", cls: "stocks", note: "Largest single-stock options market." },
  { sym: "TSLA", name: "Tesla", cls: "stocks", note: "Retail-heavy options flow." },
  { sym: "AAPL", name: "Apple", cls: "stocks", note: "Mega-cap." },
];
const ETF_SET = new Set(SYMBOLS.filter((s) => s.cls === "etf").map((s) => s.sym));
const HEAD = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", Accept: "application/json, text/plain, */*", Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" };
const MONTHS: Record<string, number> = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };

const num = (v: unknown): number | undefined => { if (v === null || v === undefined) return undefined; const s = String(v).replace(/[$,\s]/g, ""); if (!s || s === "--" || s === "N/A") return undefined; const n = Number(s); return Number.isFinite(n) ? n : undefined; };

/** 16:00 New York time on a calendar date, as a UTC timestamp (handles daylight saving). */
export function closeOf(y: number, m: number, d: number): number {
  const guess = Date.UTC(y, m, d, 21, 0, 0);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false, timeZoneName: "short" }).formatToParts(new Date(guess));
  const tz = parts.find((p) => p.type === "timeZoneName")?.value || "EST";
  return tz === "EDT" ? Date.UTC(y, m, d, 20, 0, 0) : guess;
}

/** Turns Nasdaq's grouped table (a header row per expiry, then one row per strike with call and put columns) into contracts. */
export function parseChain(rows: any[]): Contract[] {
  const out: Contract[] = []; let exp = 0;
  for (const r of rows || []) {
    const g = typeof r?.expirygroup === "string" ? r.expirygroup.trim() : "";
    if (g) { const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(g); if (m && MONTHS[m[1].toLowerCase()] !== undefined) exp = closeOf(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2])); continue; }
    const strike = num(r?.strike); if (!exp || !strike) continue;
    const co = num(r.c_Openinterest), po = num(r.p_Openinterest);
    if (co) out.push({ exp, strike, type: "C", oi: co, bid: num(r.c_Bid), ask: num(r.c_Ask), last: num(r.c_Last), volume: num(r.c_Volume) });
    if (po) out.push({ exp, strike, type: "P", oi: po, bid: num(r.p_Bid), ask: num(r.p_Ask), last: num(r.p_Last), volume: num(r.p_Volume) });
  }
  return out;
}

async function getJson(url: string): Promise<any> {
  const r = await fetch(url, { headers: HEAD, signal: AbortSignal.timeout(25_000) });
  if (!r.ok) throw new Error(`Nasdaq answered ${r.status}`);
  return r.json();
}
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function quote(sym: string, cls: string): Promise<{ price: number; at: string; open: boolean } | null> {
  try {
    const j = await getJson(`https://api.nasdaq.com/api/quote/${sym}/info?assetclass=${cls}`); const p = j?.data?.primaryData; const price = num(p?.lastSalePrice);
    if (!price) return null; return { price, at: String(p?.lastTradeTimestamp || ""), open: /open/i.test(String(j?.data?.marketStatus || "")) && !/closed/i.test(String(j?.data?.marketStatus || "")) };
  } catch { return null; }
}

export interface GexPayload { ok: true; symbol: string; name: string; note: string; spot: number; spotAt: string; marketOpen: boolean; source: string; model: string; fetchedAt: number; stale?: boolean; convert: { to: string; factor: number | null; price: number | null; via: string } | null; result: ReturnType<typeof computeGex>; read: ReturnType<typeof readout> }

async function build(def: SymbolDef): Promise<GexPayload> {
  const now = Date.now();
  const q = await quote(def.sym, def.cls); if (!q) throw new Error("Could not read the latest price from the options source");
  const from = isoDay(now - 86400_000), to = isoDay(now + 45 * 86400_000); const rows: any[] = [];
  for (let off = 0; off < 6000; off += 1500) {
    const j = await getJson(`https://api.nasdaq.com/api/quote/${def.sym}/option-chain?assetclass=${def.cls}&limit=1500&offset=${off}&fromdate=${from}&todate=${to}&callput=callput&money=all&type=all`);
    const page = j?.data?.table?.rows; if (!Array.isArray(page) || !page.length) break; rows.push(...page);
    const total = Number(j?.data?.totalRecord) || 0; if (off + 1500 >= total) break;
  }
  const contracts = parseChain(rows); if (contracts.length < 20) throw new Error("The options source returned too few contracts");
  const result = computeGex(contracts, q.price, now);
  if (result.used < 10) throw new Error("Not enough priced contracts to compute gamma");
  let convert: GexPayload["convert"] = null;
  if (def.indexSym) { const iq = await quote(def.indexSym, "index"); if (iq) convert = { to: def.indexSym, factor: iq.price / q.price, price: iq.price, via: `${def.indexSym} index level from Nasdaq` }; }
  else if (def.ref) convert = { to: def.ref, factor: null, price: null, via: "live price from the app feed" };
  return { ok: true, symbol: def.sym, name: def.name, note: def.note, spot: q.price, spotAt: q.at, marketOpen: q.open, source: "Nasdaq.com option chain (all US option exchanges, ~15 min delayed)", model: `Black-Scholes gamma, volatility solved from quoted prices, r=${(RATE * 100).toFixed(1)}%, no dividends, next 45 days, strikes within ±18%`, fetchedAt: now, convert, result, read: readout(result) };
}

const cache = new Map<string, { at: number; data: GexPayload }>(); const inflight = new Map<string, Promise<GexPayload>>();
const FRESH_MS = 4 * 60_000; const STALE_OK_MS = 6 * 3600_000;
export async function gexFor(symRaw: string, force = false): Promise<GexPayload> {
  const sym = symRaw.toUpperCase(); if (!/^[A-Z]{1,5}$/.test(sym)) throw new Error("Unknown symbol");
  const def = SYMBOLS.find((s) => s.sym === sym) || { sym, name: sym, cls: (ETF_SET.has(sym) ? "etf" : "stocks") as "etf" | "stocks", note: "Options chain for this US-listed symbol." };
  const hit = cache.get(sym); if (hit && !force && Date.now() - hit.at < FRESH_MS) return hit.data;
  let p = inflight.get(sym);
  if (!p) { p = build(def).then((d) => { cache.set(sym, { at: Date.now(), data: d }); if (cache.size > 40) cache.delete(cache.keys().next().value as string); return d; }).finally(() => inflight.delete(sym)); inflight.set(sym, p); }
  try { return await p; } catch (e) { if (hit && Date.now() - hit.at < STALE_OK_MS) return { ...hit.data, stale: true }; throw e; }
}

export function registerGexRoutes(app: Express): void {
  app.get("/api/gex/symbols", (_req, res) => { res.set("Cache-Control", "public, max-age=3600"); res.json({ ok: true, symbols: SYMBOLS.map(({ sym, name, tracks, ref, note }) => ({ sym, name, tracks, ref, note })) }); });
  app.get("/api/gex/:symbol", async (req, res) => {
    try { const d = await gexFor(String(req.params.symbol), req.query.fresh === "1"); res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=240"); res.json(d); }
    catch (e: any) { res.set("Cache-Control", "no-store"); res.status(502).json({ ok: false, error: String(e?.message || e).slice(0, 200), hint: "The free options source did not answer. Nothing is shown rather than made-up numbers; try again in a minute." }); }
  });
}
