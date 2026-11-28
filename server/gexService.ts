import type { Express } from "express";
import { computeGex, mergeGex, readout, RATE, type Contract, type GexResult } from "./gexEngine.js";

/* Live GEX data, all free and keyless:
   - Nasdaq.com option chain: US ETFs and stocks, every US option exchange combined, about 15 minutes delayed.
   - Yahoo Finance option chain: the real index options (SPX, NDX, RUT) that professionals watch, also delayed.
   Nothing is simulated. When a source cannot be reached the API says so (or shows the last real reading marked stale). */

type Provider = "nasdaq" | "yahoo";
export interface SymbolDef {
  sym: string; name: string; group: "Indices" | "ETFs" | "Gold & Silver" | "Stocks"; note: string;
  /** primary source and the symbol to ask it for */ src: Provider; q: string; cls?: "etf" | "stocks";
  /** same market through another chain, used when the primary source is unreachable */ fallback?: string;
  /** live price symbol in the app feed that the levels convert to (ETF -> index / spot metal); absent when levels are already in market units */ feed?: string;
  /** several chains merged into one picture (base is the first) */ parts?: string[];
  /** true when the chain is in the same units as the feed (real index options) */ native?: boolean;
}
export const SYMBOLS: SymbolDef[] = [
  { sym: "SPX", name: "S&P 500 index", group: "Indices", src: "yahoo", q: "^SPX", fallback: "SPY", feed: "SPX", native: true, note: "The real SPX index options, the benchmark market. Levels are in index points." },
  { sym: "NDX", name: "NASDAQ-100 index", group: "Indices", src: "yahoo", q: "^NDX", fallback: "QQQ", feed: "NDX", native: true, note: "The real NDX index options. Levels are in index points (NAS100 / US100 on most brokers)." },
  { sym: "RUT", name: "Russell 2000 index", group: "Indices", src: "yahoo", q: "^RUT", fallback: "IWM", feed: "RUT", native: true, note: "Small caps, real index options." },
  { sym: "GOLD", name: "Gold (all gold ETFs)", group: "Gold & Silver", src: "nasdaq", q: "GLD", cls: "etf", parts: ["GLD", "IAU"], feed: "XAUUSD", note: "GLD and IAU options combined, converted to XAUUSD with the live gold price. The broadest free view of gold options positioning." },
  { sym: "GLD", name: "Gold · GLD", group: "Gold & Silver", src: "nasdaq", q: "GLD", cls: "etf", feed: "XAUUSD", note: "The largest gold ETF options market, converted to XAUUSD." },
  { sym: "IAU", name: "Gold · IAU", group: "Gold & Silver", src: "nasdaq", q: "IAU", cls: "etf", feed: "XAUUSD", note: "Second gold ETF, converted to XAUUSD." },
  { sym: "SLV", name: "Silver · SLV", group: "Gold & Silver", src: "nasdaq", q: "SLV", cls: "etf", feed: "XAGUSD", note: "Silver ETF options, converted to XAGUSD." },
  { sym: "SPY", name: "S&P 500 · SPY", group: "ETFs", src: "nasdaq", q: "SPY", cls: "etf", feed: "SPX", note: "Most liquid ETF options; converted to S&P 500 index points." },
  { sym: "QQQ", name: "NASDAQ-100 · QQQ", group: "ETFs", src: "nasdaq", q: "QQQ", cls: "etf", feed: "NDX", note: "Converted to NASDAQ-100 index points." },
  { sym: "IWM", name: "Russell 2000 · IWM", group: "ETFs", src: "nasdaq", q: "IWM", cls: "etf", note: "Small caps." },
  { sym: "DIA", name: "Dow 30 · DIA", group: "ETFs", src: "nasdaq", q: "DIA", cls: "etf", note: "Dow Jones." },
  { sym: "TLT", name: "20Y Treasuries · TLT", group: "ETFs", src: "nasdaq", q: "TLT", cls: "etf", note: "Rates / bond-market positioning." },
  { sym: "UUP", name: "US Dollar · UUP", group: "ETFs", src: "nasdaq", q: "UUP", cls: "etf", note: "Dollar-index ETF; thin options, treat with care." },
  { sym: "USO", name: "Crude oil · USO", group: "ETFs", src: "nasdaq", q: "USO", cls: "etf", note: "Oil ETF options." },
  { sym: "NVDA", name: "NVIDIA", group: "Stocks", src: "nasdaq", q: "NVDA", cls: "stocks", note: "Largest single-stock options market." },
  { sym: "TSLA", name: "Tesla", group: "Stocks", src: "nasdaq", q: "TSLA", cls: "stocks", note: "Retail-heavy options flow." },
  { sym: "AAPL", name: "Apple", group: "Stocks", src: "nasdaq", q: "AAPL", cls: "stocks", note: "Mega-cap." },
];
const ETF_SET = new Set(["SPY", "QQQ", "IWM", "DIA", "TLT", "UUP", "USO", "GLD", "IAU", "SLV", "GDX", "XLF", "XLE", "XLK", "SMH", "TQQQ", "SQQQ"]);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const NASDAQ_HEAD = { "User-Agent": UA, Accept: "application/json, text/plain, */*", Origin: "https://www.nasdaq.com", Referer: "https://www.nasdaq.com/" };
const MONTHS: Record<string, number> = { january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
const DAY = 86400_000; const WINDOW_DAYS = 45;

const num = (v: unknown): number | undefined => { if (v === null || v === undefined) return undefined; const s = String(v).replace(/[$,\s]/g, ""); if (!s || s === "--" || s === "N/A") return undefined; const n = Number(s); return Number.isFinite(n) ? n : undefined; };

/** 16:00 New York time on a calendar date, as a UTC timestamp (handles daylight saving). */
export function closeOf(y: number, m: number, d: number): number {
  const guess = Date.UTC(y, m, d, 21, 0, 0);
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false, timeZoneName: "short" }).formatToParts(new Date(guess)).find((p) => p.type === "timeZoneName")?.value || "EST";
  return tz === "EDT" ? Date.UTC(y, m, d, 20, 0, 0) : guess;
}

/** US cash session: weekdays 09:30-16:00 New York. Used to choose how often to refresh. */
export function usMarketOpen(now = Date.now()): boolean {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date(now));
  const g = (t: string) => p.find((x) => x.type === t)?.value || ""; const wd = g("weekday"); const mins = (Number(g("hour")) % 24) * 60 + Number(g("minute"));
  return !["Sat", "Sun"].includes(wd) && mins >= 9 * 60 + 30 && mins < 16 * 60;
}

/** Nasdaq's grouped table (a header row per expiry, then one row per strike with call and put columns) into contracts. */
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
/** Yahoo's option list (one object per contract) into contracts; expiry is the listed date at 16:00 New York. */
export function parseYahoo(list: any[], type: "C" | "P"): Contract[] {
  const out: Contract[] = [];
  for (const o of list || []) {
    const strike = num(o?.strike), oi = num(o?.openInterest), e = num(o?.expiration); if (!strike || !oi || !e) continue;
    const d = new Date(e * 1000); out.push({ exp: closeOf(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), strike, type, oi, bid: num(o.bid), ask: num(o.ask), last: num(o.lastPrice), volume: num(o.volume) });
  }
  return out;
}

async function getJson(url: string, headers: Record<string, string>, ms = 25_000): Promise<any> {
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`${new URL(url).hostname} answered ${r.status}`);
  return r.json();
}
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/* ---------- Nasdaq ---------- */
async function nasdaqQuote(sym: string, cls: string): Promise<{ price: number; at: string; open: boolean } | null> {
  try {
    const j = await getJson(`https://api.nasdaq.com/api/quote/${sym}/info?assetclass=${cls}`, NASDAQ_HEAD, 15_000); const p = j?.data?.primaryData; const price = num(p?.lastSalePrice);
    if (!price) return null; const st = String(j?.data?.marketStatus || ""); return { price, at: String(p?.lastTradeTimestamp || ""), open: /open/i.test(st) && !/closed/i.test(st) };
  } catch { return null; }
}
async function nasdaqChain(sym: string, cls: "etf" | "stocks", now: number): Promise<{ spot: number; at: string; open: boolean; contracts: Contract[] }> {
  const q = await nasdaqQuote(sym, cls); if (!q) throw new Error("Could not read the latest price from the options source");
  const from = isoDay(now - DAY), to = isoDay(now + WINDOW_DAYS * DAY); const rows: any[] = [];
  for (let off = 0; off < 6000; off += 1500) {
    const j = await getJson(`https://api.nasdaq.com/api/quote/${sym}/option-chain?assetclass=${cls}&limit=1500&offset=${off}&fromdate=${from}&todate=${to}&callput=callput&money=all&type=all`, NASDAQ_HEAD);
    const page = j?.data?.table?.rows; if (!Array.isArray(page) || !page.length) break; rows.push(...page);
    if (off + 1500 >= (Number(j?.data?.totalRecord) || 0)) break;
  }
  return { spot: q.price, at: q.at, open: q.open, contracts: parseChain(rows) };
}

/* ---------- Yahoo (cookie + crumb, reused until it expires) ---------- */
let yahoo: { cookie: string; crumb: string; at: number } | null = null;
async function yahooAuth(force = false): Promise<{ cookie: string; crumb: string }> {
  if (yahoo && !force && Date.now() - yahoo.at < 25 * 60_000) return yahoo;
  const r = await fetch("https://fc.yahoo.com", { headers: { "User-Agent": UA }, redirect: "manual", signal: AbortSignal.timeout(12_000) });
  const raw = (r.headers as any).getSetCookie?.() as string[] | undefined; const cookie = (raw && raw.length ? raw : [r.headers.get("set-cookie") || ""]).map((c) => c.split(";")[0]).filter(Boolean).join("; ");
  if (!cookie) throw new Error("Yahoo did not hand out a session");
  const c = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", { headers: { "User-Agent": UA, Cookie: cookie }, signal: AbortSignal.timeout(12_000) });
  const crumb = (await c.text()).trim(); if (!c.ok || !crumb || crumb.length > 40 || /</.test(crumb)) throw new Error(`Yahoo crumb refused (${c.status})`);
  yahoo = { cookie, crumb, at: Date.now() }; return yahoo;
}
async function yahooJson(sym: string, date?: number, retry = true): Promise<any> {
  const a = await yahooAuth();
  const r = await fetch(`https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(sym)}?crumb=${encodeURIComponent(a.crumb)}${date ? `&date=${date}` : ""}`, { headers: { "User-Agent": UA, Accept: "application/json", Cookie: a.cookie }, signal: AbortSignal.timeout(20_000) });
  if ((r.status === 401 || r.status === 403 || r.status === 429) && retry) { await yahooAuth(true); return yahooJson(sym, date, false); }
  if (!r.ok) throw new Error(`Yahoo answered ${r.status}`);
  const res = (await r.json())?.optionChain?.result?.[0]; if (!res) throw new Error("Yahoo returned no chain");
  return res;
}
async function yahooChain(sym: string, now: number): Promise<{ spot: number; at: string; open: boolean; contracts: Contract[] }> {
  const first = await yahooJson(sym); const spot = num(first?.quote?.regularMarketPrice); if (!spot) throw new Error("Yahoo has no price for this symbol");
  const stamps: number[] = (first.expirationDates || []).filter((e: number) => e * 1000 >= now - DAY && e * 1000 <= now + WINDOW_DAYS * DAY).slice(0, 22);
  const contracts: Contract[] = []; const take = (res: any) => { const o = res?.options?.[0]; if (o) contracts.push(...parseYahoo(o.calls, "C"), ...parseYahoo(o.puts, "P")); };
  take(first); const firstStamp = first.options?.[0]?.expirationDate;
  const todo = stamps.filter((s) => s !== firstStamp); let i = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (i < todo.length) { const s = todo[i++]; try { take(await yahooJson(sym, s)); } catch { /* one missing expiry must not lose the rest */ } } }));
  const t = num(first?.quote?.regularMarketTime); const state = String(first?.quote?.marketState || "");
  return { spot, at: t ? new Date(t * 1000).toISOString() : "", open: state === "REGULAR", contracts };
}

export interface GexPayload {
  ok: true; symbol: string; name: string; note: string; group: string; spot: number; spotAt: string; marketOpen: boolean; source: string; model: string; fetchedAt: number; stale?: boolean; usedFallback?: string;
  /** feed symbol the levels convert to (null when the chain is already in market units) */ convert: { to: string } | null; parts?: { sym: string; spot: number }[]; result: GexResult; read: ReturnType<typeof readout>;
}

async function chainFor(src: Provider, q: string, cls: "etf" | "stocks", now: number) { return src === "yahoo" ? yahooChain(q, now) : nasdaqChain(q, cls, now); }
const clsOf = (s: string): "etf" | "stocks" => (ETF_SET.has(s) ? "etf" : "stocks");

async function one(src: Provider, q: string, cls: "etf" | "stocks", now: number): Promise<{ res: GexResult; spot: number; at: string; open: boolean }> {
  const c = await chainFor(src, q, cls, now); if (c.contracts.length < 20) throw new Error("The options source returned too few contracts");
  const res = computeGex(c.contracts, c.spot, now); if (res.used < 10) throw new Error("Not enough priced contracts to compute gamma");
  return { res, spot: c.spot, at: c.at, open: c.open };
}

async function build(def: SymbolDef): Promise<GexPayload> {
  const now = Date.now(); let usedFallback: string | undefined;
  const label = (s: Provider) => (s === "yahoo" ? "Yahoo Finance option chain" : "Nasdaq.com option chain (all US option exchanges)");
  const model = `Black-Scholes gamma, volatility solved from quoted prices, r=${(RATE * 100).toFixed(1)}%, no dividends, next ${WINDOW_DAYS} days, strikes within ±18%`;
  if (def.parts) {
    const got = await Promise.allSettled(def.parts.map((p) => one("nasdaq", p, "etf", now)));
    const ok = got.map((g, i) => (g.status === "fulfilled" ? { sym: def.parts![i], ...g.value } : null)).filter(Boolean) as { sym: string; res: GexResult; spot: number; at: string; open: boolean }[];
    if (!ok.length) throw new Error((got[0] as PromiseRejectedResult).reason?.message || "Options source unavailable");
    const base = ok[0]; const merged = ok.length > 1 ? mergeGex(ok.map((o) => o.res), base.spot) : base.res;
    return { ok: true, symbol: def.sym, name: def.name, note: def.note, group: def.group, spot: base.spot, spotAt: base.at, marketOpen: base.open, source: `${label("nasdaq")}: ${ok.map((o) => o.sym).join(" + ")}`, model, fetchedAt: now, convert: def.feed ? { to: def.feed } : null, parts: ok.map((o) => ({ sym: o.sym, spot: o.spot })), result: merged, read: readout(merged) };
  }
  let r; try { r = await one(def.src, def.q, def.cls || clsOf(def.q), now); }
  catch (e) { if (!def.fallback || def.fallback === def.q) throw e; r = await one("nasdaq", def.fallback, clsOf(def.fallback), now); usedFallback = def.fallback; }
  const src: Provider = usedFallback ? "nasdaq" : def.src;
  const native = !!def.native && !usedFallback;
  return { ok: true, symbol: def.sym, name: usedFallback ? `${def.name} (via ${usedFallback})` : def.name, note: usedFallback ? `${def.note} The index options source did not answer, so this uses ${usedFallback}, which tracks it.` : def.note, group: def.group, spot: r.spot, spotAt: r.at, marketOpen: r.open, source: label(src), model, fetchedAt: now, usedFallback, convert: def.feed && !native ? { to: def.feed } : null, result: r.res, read: readout(r.res) };
}

/** Fresh for 2 minutes while the US market trades, 20 minutes otherwise (the numbers cannot change when it is closed). */
const freshMs = () => (usMarketOpen() ? 2 * 60_000 : 20 * 60_000); const STALE_OK_MS = 12 * 3600_000;
const cache = new Map<string, { at: number; data: GexPayload }>(); const inflight = new Map<string, Promise<GexPayload>>();
const defOf = (sym: string): SymbolDef => SYMBOLS.find((s) => s.sym === sym) || { sym, name: sym, group: "Stocks", src: "nasdaq", q: sym, cls: clsOf(sym), note: "Options chain for this US-listed symbol." };
export async function gexFor(symRaw: string, force = false): Promise<GexPayload> {
  const sym = symRaw.toUpperCase(); if (!/^[A-Z]{1,5}$/.test(sym)) throw new Error("Unknown symbol");
  const hit = cache.get(sym); if (hit && !force && Date.now() - hit.at < freshMs()) return hit.data;
  if (hit && force && Date.now() - hit.at < 30_000) return hit.data; // a refresh button cannot hammer the source
  let p = inflight.get(sym);
  if (!p) { p = build(defOf(sym)).then((d) => { cache.set(sym, { at: Date.now(), data: d }); if (cache.size > 40) cache.delete(cache.keys().next().value as string); return d; }).finally(() => inflight.delete(sym)); inflight.set(sym, p); }
  try { return await p; } catch (e) { if (hit && Date.now() - hit.at < STALE_OK_MS) return { ...hit.data, stale: true }; throw e; }
}

/** Keeps the busiest markets warm so a visitor gets an instant answer, and the numbers stay current while the US market trades. */
const WARM = ["SPX", "NDX", "GOLD", "SPY", "QQQ", "GLD"]; let warming = false;
async function warm(all: boolean) {
  if (warming) return; warming = true;
  try { for (const s of WARM) { const hit = cache.get(s); if (!all && hit && Date.now() - hit.at < freshMs() * 0.9) continue; try { await gexFor(s, true); } catch { /* next */ } await new Promise((r) => setTimeout(r, 1500)); } } finally { warming = false; }
}
export function startGexWarmer(): void {
  setTimeout(() => void warm(true), 40_000);
  setInterval(() => { if (usMarketOpen()) void warm(false); }, 90_000);
}

export function registerGexRoutes(app: Express): void {
  app.get("/api/gex/symbols", (_req, res) => { res.set("Cache-Control", "public, max-age=3600"); res.json({ ok: true, symbols: SYMBOLS.map(({ sym, name, group, feed, native, note }) => ({ sym, name, group, feed, native, note })) }); });
  app.get("/api/gex/:symbol", async (req, res) => {
    try { const d = await gexFor(String(req.params.symbol), req.query.fresh === "1"); res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=90"); res.json(d); }
    catch (e: any) { res.set("Cache-Control", "no-store"); res.status(502).json({ ok: false, error: String(e?.message || e).slice(0, 200), hint: "The free options source did not answer. Nothing is shown rather than made-up numbers; try again in a minute." }); }
  });
  startGexWarmer();
}
