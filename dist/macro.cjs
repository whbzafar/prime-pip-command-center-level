var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/history/historyService.ts
var historyService_exports = {};
__export(historyService_exports, {
  TF_LIST: () => TF_LIST,
  aggregate: () => aggregate2,
  clearHistoryCache: () => clearHistoryCache,
  dukaBefore: () => dukaBefore,
  dukaInception: () => dukaInception,
  dukaInstrumentExists: () => dukaInstrumentExists,
  dukaRange: () => dukaRange,
  listDukaInstruments: () => listDukaInstruments,
  yahooAny: () => yahooAny,
  yahooBefore: () => yahooBefore
});
function dukaInstrumentExists(id) {
  return !!meta[id];
}
function dukaInception(id, tf) {
  const m = meta[id];
  if (!m) return Date.now();
  const iso = tf === "m1" || tf === "m5" || tf === "m15" || tf === "m30" ? m.startDayForMinuteCandles : tf === "h1" || tf === "h4" ? m.startMonthForHourlyCandles : m.startYearForDailyCandles;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : Date.now();
}
function listDukaInstruments() {
  return Object.entries(meta).map(([id, m]) => ({
    id,
    name: m.name,
    description: m.description,
    minuteFrom: m.startDayForMinuteCandles?.slice(0, 10),
    dailyFrom: m.startYearForDailyCandles?.slice(0, 10)
  }));
}
function cacheGet(k, ttl) {
  const v = cache4.get(k);
  if (!v || Date.now() - v.at > ttl) return null;
  cache4.delete(k);
  cache4.set(k, v);
  return v.data;
}
function cacheSet(k, data2) {
  cache4.set(k, { at: Date.now(), data: data2 });
  while (cache4.size > 120) cache4.delete(cache4.keys().next().value);
}
function clean(rows) {
  const out = [];
  for (const r of rows || []) {
    const c = { timestamp: Number(r.timestamp), open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: Number(r.volume ?? 0) };
    if (![c.timestamp, c.open, c.high, c.low, c.close].every(Number.isFinite)) continue;
    if (c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0 || c.high < c.low) continue;
    out.push(c);
  }
  out.sort((a, b) => a.timestamp - b.timestamp);
  return out.filter((c, i) => i === 0 || c.timestamp !== out[i - 1].timestamp);
}
function bucketStart(ts, tf) {
  const d = new Date(ts);
  if (tf === "mn1") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const day = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}
function aggregate2(daily, tf) {
  const out = [];
  for (const c of daily) {
    const b = bucketStart(c.timestamp, tf);
    const last2 = out[out.length - 1];
    if (last2 && last2.timestamp === b) {
      last2.high = Math.max(last2.high, c.high);
      last2.low = Math.min(last2.low, c.low);
      last2.close = c.close;
      last2.volume += c.volume;
    } else out.push({ timestamp: b, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
  }
  return out;
}
async function dukaRange(id, tf, from, to) {
  const native = tf === "w1" || tf === "mn1" ? "d1" : tf;
  const historic = to < Date.now() - 2 * DAY3;
  const key = `duka|${id}|${native}|${from}|${to}`;
  const hit = cacheGet(key, historic ? 24 * 36e5 : 2e4);
  if (hit) return hit;
  const rows = await (0, import_dukascopy_node.getHistoricalRates)({
    instrument: id,
    dates: { from: new Date(from), to: new Date(to) },
    timeframe: native,
    format: "json",
    priceType: "bid",
    volumes: true,
    ignoreFlats: true,
    batchSize: 12,
    pauseBetweenBatchesMs: 20,
    retryCount: 2,
    useCache: false,
    // Serverless-safe: never launch a headless browser for WAF recovery and never write a token
    // cache to disk (Vercel's filesystem is read-only). If Dukascopy challenges the server's IP,
    // the request fails fast and the Yahoo fallback answers instead.
    wafMode: "off",
    wafTokenCache: false
  });
  const data2 = clean(rows);
  cacheSet(key, data2);
  return data2;
}
async function dukaBefore(id, tf, before, count, budgetMs = 7e3) {
  if (!meta[id]) throw new Error(`Unknown Dukascopy instrument ${id}`);
  const native = tf === "w1" || tf === "mn1" ? "d1" : tf;
  const inception = dukaInception(id, native);
  const chunk = DUKA_CHUNK[tf];
  const started = Date.now();
  let to = Math.min(before - 1, Date.now());
  let acc = [];
  let reachedStart = false;
  let emptyStreak = 0;
  for (let i = 0; i < 40; i++) {
    const from = Math.max(inception, to - chunk);
    if (from >= to) {
      reachedStart = true;
      break;
    }
    const part = await dukaRange(id, native, from, to);
    acc = part.concat(acc);
    const have = tf === "w1" || tf === "mn1" ? aggregate2(acc, tf).length : acc.length;
    if (have >= count) break;
    if (from <= inception) {
      reachedStart = true;
      break;
    }
    emptyStreak = part.length ? 0 : emptyStreak + 1;
    if (emptyStreak >= (native === "d1" ? 4 : 12)) {
      reachedStart = true;
      break;
    }
    if (Date.now() - started > budgetMs) break;
    to = from - 1;
  }
  let candles = clean(acc).filter((c) => c.timestamp < before);
  if (tf === "w1" || tf === "mn1") candles = aggregate2(candles, tf);
  return { candles: candles.slice(-count), reachedStart };
}
async function yahooBefore(symbol, tf, before, count) {
  const interval = YAHOO_INTERVAL[tf];
  if (!interval) throw new Error("Yahoo history is used for daily, weekly and monthly bars only");
  const to = Math.min(before, Date.now() + DAY3);
  const from = Math.max(to - YAHOO_SPAN[tf], Date.UTC(1920, 0, 1));
  const historic = to < Date.now() - 2 * DAY3;
  const key = `yahoo|${symbol}|${tf}|${Math.floor(from / DAY3)}|${Math.floor(to / DAY3)}`;
  let data2 = cacheGet(key, historic ? 24 * 36e5 : 6e4);
  let firstTrade = null;
  if (!data2) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Math.floor(from / 1e3)}&period2=${Math.floor(to / 1e3)}&interval=${interval}&includeAdjustedClose=false&events=`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(12e3) });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const j = await res.json();
    const r = j?.chart?.result?.[0];
    if (!r) throw new Error(j?.chart?.error?.description || "No data");
    firstTrade = Number.isFinite(r?.meta?.firstTradeDate) ? r.meta.firstTradeDate * 1e3 : null;
    const ts = r.timestamp || [];
    const q = r.indicators?.quote?.[0] || {};
    data2 = clean(ts.map((t, i) => ({ timestamp: t * 1e3, open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i] ?? 0 })));
    cacheSet(key, data2);
  }
  const candles = data2.filter((c) => c.timestamp < before);
  const reachedStart = candles.length === 0 || firstTrade !== null && candles[0].timestamp <= firstTrade + 7 * DAY3 || candles.length < 3;
  return { candles: candles.slice(-Math.max(count, 1)), reachedStart, firstTrade };
}
async function yahooAny(symbol, tf, before, count) {
  if (YAHOO_INTERVAL[tf]) return yahooBefore(symbol, tf, before, count);
  const spec = YAHOO_INTRADAY[tf];
  if (!spec) return { candles: [], reachedStart: true };
  const earliest = Date.now() - spec.lookback;
  const to = Math.min(before, Date.now() + 6e4);
  const from = Math.max(earliest, to - spec.window);
  if (from >= to) return { candles: [], reachedStart: true };
  const key = `yahooi|${symbol}|${tf}|${Math.floor(from / 6e4)}|${Math.floor(to / 6e4)}`;
  let data2 = cacheGet(key, 3e4);
  if (!data2) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Math.floor(from / 1e3)}&period2=${Math.floor(to / 1e3)}&interval=${spec.interval}&includePrePost=false&events=`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(12e3) });
    if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
    const j = await res.json();
    const r = j?.chart?.result?.[0];
    if (!r) throw new Error(j?.chart?.error?.description || "No data");
    const ts = r.timestamp || [];
    const q = r.indicators?.quote?.[0] || {};
    data2 = clean(ts.map((t, i) => ({ timestamp: t * 1e3, open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i] ?? 0 })));
    if (tf === "h4") {
      const out = [];
      for (const c of data2) {
        const b = Math.floor(c.timestamp / (4 * 36e5)) * 4 * 36e5;
        const last2 = out[out.length - 1];
        if (last2 && last2.timestamp === b) {
          last2.high = Math.max(last2.high, c.high);
          last2.low = Math.min(last2.low, c.low);
          last2.close = c.close;
          last2.volume += c.volume;
        } else out.push({ ...c, timestamp: b });
      }
      data2 = out;
    }
    cacheSet(key, data2);
  }
  const candles = data2.filter((c) => c.timestamp < before).slice(-count);
  return { candles, reachedStart: from <= earliest };
}
var import_dukascopy_node, DAY3, TF_MS, DUKA_CHUNK, meta, cache4, clearHistoryCache, YAHOO_INTERVAL, YAHOO_SPAN, TF_LIST, YAHOO_INTRADAY;
var init_historyService = __esm({
  "server/history/historyService.ts"() {
    import_dukascopy_node = require("dukascopy-node");
    DAY3 = 864e5;
    TF_MS = { m1: 6e4, m5: 3e5, m15: 9e5, m30: 18e5, h1: 36e5, h4: 144e5, d1: DAY3, w1: 7 * DAY3, mn1: 30 * DAY3 };
    DUKA_CHUNK = { m1: 1 * DAY3, m5: 4 * DAY3, m15: 10 * DAY3, m30: 20 * DAY3, h1: 30 * DAY3, h4: 120 * DAY3, d1: 730 * DAY3, w1: 3650 * DAY3, mn1: 3650 * DAY3 };
    meta = import_dukascopy_node.instrumentMetaData;
    cache4 = /* @__PURE__ */ new Map();
    clearHistoryCache = () => cache4.clear();
    YAHOO_INTERVAL = { d1: "1d", w1: "1wk", mn1: "1mo" };
    YAHOO_SPAN = { d1: 12 * 365 * DAY3, w1: 60 * 365 * DAY3, mn1: 150 * 365 * DAY3 };
    TF_LIST = Object.keys(TF_MS);
    YAHOO_INTRADAY = {
      m1: { interval: "1m", lookback: 29 * DAY3, window: 7 * DAY3 },
      m5: { interval: "5m", lookback: 59 * DAY3, window: 59 * DAY3 },
      m15: { interval: "15m", lookback: 59 * DAY3, window: 59 * DAY3 },
      m30: { interval: "30m", lookback: 59 * DAY3, window: 59 * DAY3 },
      h1: { interval: "60m", lookback: 729 * DAY3, window: 729 * DAY3 },
      h4: { interval: "60m", lookback: 729 * DAY3, window: 729 * DAY3 }
    };
  }
});

// server/macro/standalone.ts
var standalone_exports = {};
__export(standalone_exports, {
  historyRouter: () => historyRouter,
  macroApp: () => macroApp,
  macroRouter: () => macroRouter
});
module.exports = __toCommonJS(standalone_exports);
var import_express3 = __toESM(require("express"), 1);

// server/macro/brief.ts
var BIAS_EN = { STRONG_BULLISH: "Strongly Bullish", BULLISH: "Bullish", MILD_BULLISH: "Slightly Bullish", NEUTRAL: "Neutral", MILD_BEARISH: "Slightly Bearish", BEARISH: "Bearish", STRONG_BEARISH: "Strongly Bearish" };
var BIAS_UR = { STRONG_BULLISH: "\u0645\u0636\u0628\u0648\u0637 \u062A\u06CC\u0632\u06CC", BULLISH: "\u062A\u06CC\u0632\u06CC", MILD_BULLISH: "\u06C1\u0644\u06A9\u06CC \u062A\u06CC\u0632\u06CC", NEUTRAL: "\u063A\u06CC\u0631 \u062C\u0627\u0646\u0628\u062F\u0627\u0631", MILD_BEARISH: "\u06C1\u0644\u06A9\u06CC \u0645\u0646\u062F\u06CC", BEARISH: "\u0645\u0646\u062F\u06CC", STRONG_BEARISH: "\u0645\u0636\u0628\u0648\u0637 \u0645\u0646\u062F\u06CC" };
var MEAN_EN = { STRONG_BULLISH: "the data points firmly up", BULLISH: "buyers have the edge", MILD_BULLISH: "a small lean up", NEUTRAL: "no clear direction", MILD_BEARISH: "a small lean down", BEARISH: "sellers have the edge", STRONG_BEARISH: "the data points firmly down" };
var MEAN_UR = { STRONG_BULLISH: "\u0688\u06CC\u0679\u0627 \u0648\u0627\u0636\u062D \u0637\u0648\u0631 \u067E\u0631 \u0627\u0648\u067E\u0631 \u06A9\u06CC \u0637\u0631\u0641 \u06C1\u06D2", BULLISH: "\u062E\u0631\u06CC\u062F\u0627\u0631\u0648\u06BA \u06A9\u0627 \u067E\u0644\u0691\u0627 \u0628\u06BE\u0627\u0631\u06CC \u06C1\u06D2", MILD_BULLISH: "\u0645\u0639\u0645\u0648\u0644\u06CC \u062C\u06BE\u06A9\u0627\u0624 \u0627\u0648\u067E\u0631 \u06A9\u06CC \u0637\u0631\u0641", NEUTRAL: "\u06A9\u0648\u0626\u06CC \u0648\u0627\u0636\u062D \u0633\u0645\u062A \u0646\u06C1\u06CC\u06BA", MILD_BEARISH: "\u0645\u0639\u0645\u0648\u0644\u06CC \u062C\u06BE\u06A9\u0627\u0624 \u0646\u06CC\u0686\u06D2 \u06A9\u06CC \u0637\u0631\u0641", BEARISH: "\u0641\u0631\u0648\u062E\u062A \u06A9\u0646\u0646\u062F\u06AF\u0627\u0646 \u06A9\u0627 \u067E\u0644\u0691\u0627 \u0628\u06BE\u0627\u0631\u06CC \u06C1\u06D2", STRONG_BEARISH: "\u0688\u06CC\u0679\u0627 \u0648\u0627\u0636\u062D \u0637\u0648\u0631 \u067E\u0631 \u0646\u06CC\u0686\u06D2 \u06A9\u06CC \u0637\u0631\u0641 \u06C1\u06D2" };
var biasLabelL = (b) => ({ en: BIAS_EN[b], ur: BIAS_UR[b] });
var sideOfBias = (b) => b.endsWith("BULLISH") ? "bull" : b.endsWith("BEARISH") ? "bear" : "neutral";
var sgn = (n) => n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`;
var num = (v) => Math.abs(v) >= 100 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 100) / 100);
var withUnit = (v, unit) => {
  const u = (unit || "").trim();
  return /^[%]|^(K|M|B|T)$/i.test(u) ? `${num(v)}${u}` : u ? `${num(v)} ${u}` : num(v);
};
var stripStage = (s) => s.toLowerCase().replace(/\s*\((prel|final|flash|adv|advance|revised)[^)]*\)\s*$/i, "").replace(/\s+/g, " ").trim();
var GLOSS = [
  [/non.?farm|nfp/i, { en: "US jobs report", ur: "\u0627\u0645\u0631\u06CC\u06A9\u06CC \u0631\u0648\u0632\u06AF\u0627\u0631 \u0631\u067E\u0648\u0631\u0679" }],
  [/core.*(cpi|inflation)|core pce/i, { en: "inflation without food & fuel", ur: "\u062E\u0648\u0631\u0627\u06A9 \u0627\u0648\u0631 \u0627\u06CC\u0646\u062F\u06BE\u0646 \u06A9\u06D2 \u0628\u063A\u06CC\u0631 \u0645\u06C1\u0646\u06AF\u0627\u0626\u06CC" }],
  [/\bcpi\b|inflation rate|consumer price/i, { en: "inflation", ur: "\u0645\u06C1\u0646\u06AF\u0627\u0626\u06CC" }],
  [/\bppi\b|producer price/i, { en: "wholesale prices", ur: "\u062A\u06BE\u0648\u06A9 \u0642\u06CC\u0645\u062A\u06CC\u06BA" }],
  [/retail sales/i, { en: "shopping spending", ur: "\u062E\u0631\u06CC\u062F\u0627\u0631\u06CC \u06A9\u0627 \u062E\u0631\u0686" }],
  [/pmi/i, { en: "business activity survey", ur: "\u06A9\u0627\u0631\u0648\u0628\u0627\u0631\u06CC \u0633\u0631\u06AF\u0631\u0645\u06CC \u06A9\u0627 \u0633\u0631\u0648\u06D2" }],
  [/\bgdp\b/i, { en: "economic growth", ur: "\u0645\u0639\u0627\u0634\u06CC \u0646\u0645\u0648" }],
  [/unemployment rate/i, { en: "share of people without jobs", ur: "\u0628\u06D2 \u0631\u0648\u0632\u06AF\u0627\u0631\u06CC \u06A9\u06CC \u0634\u0631\u062D" }],
  [/employment change|jobs change/i, { en: "job growth", ur: "\u0631\u0648\u0632\u06AF\u0627\u0631 \u0645\u06CC\u06BA \u0627\u0636\u0627\u0641\u06C1" }],
  [/interest rate|policy rate|rate decision/i, { en: "central bank interest rate", ur: "\u0645\u0631\u06A9\u0632\u06CC \u0628\u06CC\u0646\u06A9 \u06A9\u06CC \u0634\u0631\u062D\u0650 \u0633\u0648\u062F" }],
  [/real yield|tips/i, { en: "bond return after inflation", ur: "\u0645\u06C1\u0646\u06AF\u0627\u0626\u06CC \u06A9\u06D2 \u0628\u0639\u062F \u0628\u0627\u0646\u0688 \u06A9\u0627 \u0645\u0646\u0627\u0641\u0639" }],
  [/consumer (confidence|sentiment)/i, { en: "how upbeat shoppers feel", ur: "\u062E\u0631\u06CC\u062F\u0627\u0631\u0648\u06BA \u06A9\u0627 \u0627\u0639\u062A\u0645\u0627\u062F" }],
  [/trade balance/i, { en: "exports minus imports", ur: "\u0628\u0631\u0622\u0645\u062F\u0627\u062A \u0645\u0646\u0641\u06CC \u062F\u0631\u0622\u0645\u062F\u0627\u062A" }],
  [/industrial production/i, { en: "factory output", ur: "\u0641\u06CC\u06A9\u0679\u0631\u06CC \u06A9\u06CC \u067E\u06CC\u062F\u0627\u0648\u0627\u0631" }],
  [/dollar index/i, { en: "strength of the US dollar", ur: "\u0627\u0645\u0631\u06CC\u06A9\u06CC \u0688\u0627\u0644\u0631 \u06A9\u06CC \u0645\u0636\u0628\u0648\u0637\u06CC" }]
];
var glossOf = (name) => {
  for (const [re, g] of GLOSS) if (re.test(name)) return g;
  return null;
};
var nameL = (name, period) => {
  const g = glossOf(name);
  const per = period ? ` [${period}]` : "";
  return g ? { en: `${name}${per} (${g.en})`, ur: `${name}${per} (${g.ur})` } : { en: `${name}${per}`, ur: `${name}${per}` };
};
var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var pkt = (at) => {
  const d = new Date(at + 5 * 36e5);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};
var inL = (at, now) => {
  const m = Math.max(1, Math.round((at - now) / 6e4));
  if (m < 60) return { en: `in ${m} min`, ur: `${m} \u0645\u0646\u0679 \u0645\u06CC\u06BA` };
  if (m < 48 * 60) {
    const h = Math.round(m / 60);
    return { en: `in ${h} hour${h === 1 ? "" : "s"}`, ur: `${h} \u06AF\u06BE\u0646\u0679\u06D2 \u0645\u06CC\u06BA` };
  }
  const d = Math.round(m / 1440);
  return { en: `in ${d} days`, ur: `${d} \u062F\u0646 \u0645\u06CC\u06BA` };
};
var THRESHOLDS = [60, 30, 10, -10, -30, -60];
var nameAt = (t) => t >= 60 ? "STRONG_BULLISH" : t >= 30 ? "BULLISH" : t >= 10 ? "MILD_BULLISH" : t > -10 ? "NEUTRAL" : t > -30 ? "MILD_BEARISH" : t > -60 ? "BEARISH" : "STRONG_BEARISH";
function distance(score, label) {
  const up = THRESHOLDS.filter((t) => t > score).pop();
  const down = THRESHOLDS.filter((t) => t <= score).shift();
  const parts = [];
  const head = { en: `Score now: ${sgn(score)} (scale: -100 very bearish \u2026 +100 very bullish).`, ur: `\u0627\u0633 \u0648\u0642\u062A \u0627\u0633\u06A9\u0648\u0631: ${sgn(score)} (\u067E\u06CC\u0645\u0627\u0646\u06C1: -100 \u0628\u06C1\u062A \u0645\u0646\u062F\u06CC \u2026 +100 \u0628\u06C1\u062A \u062A\u06CC\u0632\u06CC)\u06D4` };
  if (up !== void 0) {
    const to = nameAt(up + 0.01), n = Math.round(up - score);
    parts.push({ en: `About ${n} points higher (${sgn(up)}) it becomes ${BIAS_EN[to]}.`, ur: `\u062A\u0642\u0631\u06CC\u0628\u0627\u064B ${n} \u067E\u0648\u0627\u0626\u0646\u0679 \u0628\u0691\u06BE\u0646\u06D2 \u067E\u0631 (${sgn(up)}) \u06CC\u06C1 "${BIAS_UR[to]}" \u0628\u0646 \u062C\u0627\u0626\u06D2 \u06AF\u0627\u06D4` });
  }
  if (down !== void 0) {
    const to = nameAt(down - 0.1), n = Math.round(score - down);
    parts.push({ en: `About ${n} points lower (below ${sgn(down)}) it becomes ${BIAS_EN[to]}.`, ur: `\u062A\u0642\u0631\u06CC\u0628\u0627\u064B ${n} \u067E\u0648\u0627\u0626\u0646\u0679 \u06AF\u0631\u0646\u06D2 \u067E\u0631 (${sgn(down)} \u0633\u06D2 \u0646\u06CC\u0686\u06D2) \u06CC\u06C1 "${BIAS_UR[to]}" \u0628\u0646 \u062C\u0627\u0626\u06D2 \u06AF\u0627\u06D4` });
  }
  return [{ tone: "info", en: `${label}: ${head.en} ${parts.map((p) => p.en).join(" ")}`, ur: `${label}: ${head.ur} ${parts.map((p) => p.ur).join(" ")}` }];
}
var allInds = (a) => a.pillars.flatMap((p) => p.indicators.map((i) => ({ ...i, pillar: p.name })));
var polarityOf = (i) => {
  const m = i?.polarityNote?.match(/higher\s*=\s*(bullish|bearish)/i);
  return m ? m[1].toLowerCase() === "bullish" ? 1 : -1 : 0;
};
function cmpL(actual, ref) {
  const diff = actual - ref;
  const rel = Math.abs(diff) / Math.max(Math.abs(ref), Math.abs(actual), 1e-9);
  if (Math.abs(diff) < 1e-9) return { en: "exactly as expected", ur: "\u062A\u0648\u0642\u0639 \u06A9\u06D2 \u0639\u06CC\u0646 \u0645\u0637\u0627\u0628\u0642" };
  const big = rel >= 0.5;
  return diff > 0 ? { en: big ? "well above" : "above", ur: big ? "\u062A\u0648\u0642\u0639 \u0633\u06D2 \u06A9\u0627\u0641\u06CC \u0632\u06CC\u0627\u062F\u06C1" : "\u062A\u0648\u0642\u0639 \u0633\u06D2 \u0632\u06CC\u0627\u062F\u06C1" } : { en: big ? "well below" : "below", ur: big ? "\u062A\u0648\u0642\u0639 \u0633\u06D2 \u06A9\u0627\u0641\u06CC \u06A9\u0645" : "\u062A\u0648\u0642\u0639 \u0633\u06D2 \u06A9\u0645" };
}
var moveL = (up, c) => c.pair ? { en: `pushes ${c.pair} ${up ? "up" : "down"}`, ur: `${c.pair} \u06A9\u0648 ${up ? "\u0627\u0648\u067E\u0631" : "\u0646\u06CC\u0686\u06D2"} \u062F\u06BE\u06A9\u06CC\u0644\u062A\u0627 \u06C1\u06D2` } : c.fxAsset ? { en: `makes ${c.label} ${up ? "stronger" : "weaker"}`, ur: `${c.label} ${up ? "\u0645\u0636\u0628\u0648\u0637" : "\u06A9\u0645\u0632\u0648\u0631"} \u06C1\u0648\u062A\u0627 \u06C1\u06D2` } : { en: `pushes ${c.label} ${up ? "higher" : "lower"}`, ur: `${c.label} \u06A9\u0648 ${up ? "\u0627\u0648\u067E\u0631" : "\u0646\u06CC\u0686\u06D2"} \u062F\u06BE\u06A9\u06CC\u0644\u062A\u0627 \u06C1\u06D2` };
function driverLine(i, c, sign = 1) {
  const o = i.observation;
  if (!o || i.score === null) return null;
  const nm = nameL(i.name, o.period);
  const act = withUnit(o.actual, o.unit);
  let en, ur;
  if (o.forecast !== null) {
    const cm = cmpL(o.actual, o.forecast);
    const f = withUnit(o.forecast, o.unit);
    en = `${nm.en}: came in at ${act}, ${cm.en}${/exactly/.test(cm.en) ? "" : ` the ${f} expected`}.`;
    ur = `${nm.ur}: ${act} \u0631\u06C1\u06CC \u062C\u0628\u06A9\u06C1 \u062A\u0648\u0642\u0639 ${f} \u06A9\u06CC \u062A\u06BE\u06CC (${cm.ur})\u06D4`;
  } else if (o.previous !== null) {
    const p = withUnit(o.previous, o.unit);
    const upv = o.actual > o.previous;
    en = o.actual === o.previous ? `${nm.en}: ${act}, unchanged from the previous reading.` : `${nm.en}: ${act}, ${upv ? "up" : "down"} from ${p} last time.`;
    ur = o.actual === o.previous ? `${nm.ur}: ${act}\u060C \u067E\u0686\u06BE\u0644\u06CC \u0631\u06CC\u0688\u0646\u06AF \u062C\u062A\u0646\u06CC \u06C1\u06CC\u06D4` : `${nm.ur}: ${act}\u060C \u067E\u0686\u06BE\u0644\u06CC \u0628\u0627\u0631 ${p} \u062A\u06BE\u06CC (${upv ? "\u0628\u0691\u06BE\u06CC" : "\u06A9\u0645 \u06C1\u0648\u0626\u06CC"})\u06D4`;
  } else {
    en = `${nm.en}: ${act}.`;
    ur = `${nm.ur}: ${act}\u06D4`;
  }
  const good = i.score > 0;
  const up = sign * i.score > 0;
  const mv = moveL(up, c);
  const mag = Math.abs(i.score);
  const size = mag >= 70 ? { en: "big", ur: "\u0628\u0691\u0627" } : mag >= 40 ? { en: "clear", ur: "\u0648\u0627\u0636\u062D" } : { en: "small", ur: "\u0645\u0639\u0645\u0648\u0644\u06CC" };
  const old = i.status === "stale";
  en += ` That is ${good ? "good" : "bad"} for ${c.label}, so it ${mv.en} (${size.en} impact)${old ? " \u2014 an older reading" : ""}.`;
  ur += ` \u06CC\u06C1 ${c.label} \u06A9\u06D2 \u0644\u06CC\u06D2 ${good ? "\u0627\u0686\u06BE\u0627" : "\u0628\u0631\u0627"} \u06C1\u06D2\u060C \u0627\u0633 \u0644\u06CC\u06D2 ${mv.ur} (\u0627\u062B\u0631: ${size.ur})${old ? " \u2014 \u067E\u0631\u0627\u0646\u06CC \u0631\u06CC\u0688\u0646\u06AF" : ""}\u06D4`;
  return { tone: up ? "bull" : "bear", en, ur };
}
function topDrivers(a, n) {
  return allInds(a).filter((i) => i.score !== null && i.status !== "missing" && i.observation).sort((x, y) => Math.abs(y.score * y.effectiveWeight) - Math.abs(x.score * x.effectiveWeight)).slice(0, n);
}
function tally(a) {
  const s = allInds(a).filter((i) => i.score !== null && i.status !== "missing" && i.score !== 0);
  return { up: s.filter((i) => i.score > 0).length, down: s.filter((i) => i.score < 0).length };
}
function counterLines(a, label) {
  if (a.score === null || Math.abs(a.score) < 10) return [];
  const bull = a.score > 0;
  const against = a.pillars.filter((p) => p.score !== null && p.coverage >= 0.3 && Math.sign(p.score) === -Math.sign(a.score) && Math.abs(p.score) >= 8).sort((x, y) => Math.abs(y.score) - Math.abs(x.score)).slice(0, 2);
  return against.map((p) => ({
    tone: "neutral",
    en: `Not everything agrees: the "${p.name}" group leans ${bull ? "down" : "up"} for ${label} (${sgn(p.score)}). If it strengthens, the ${bull ? "bullish" : "bearish"} view weakens.`,
    ur: `\u06C1\u0631 \u0686\u06CC\u0632 \u0627\u06CC\u06A9 \u0633\u0645\u062A \u0645\u06CC\u06BA \u0646\u06C1\u06CC\u06BA: "${p.name}" \u06A9\u0627 \u06AF\u0631\u0648\u067E ${label} \u06A9\u06D2 \u0644\u06CC\u06D2 ${bull ? "\u0646\u06CC\u0686\u06D2" : "\u0627\u0648\u067E\u0631"} \u06A9\u06CC \u0637\u0631\u0641 \u06C1\u06D2 (${sgn(p.score)})\u06D4 \u0627\u06AF\u0631 \u06CC\u06C1 \u0645\u0636\u0628\u0648\u0637 \u06C1\u0648\u0627 \u062A\u0648 ${bull ? "\u062A\u06CC\u0632\u06CC" : "\u0645\u0646\u062F\u06CC"} \u06A9\u0627 \u0631\u062C\u062D\u0627\u0646 \u06A9\u0645\u0632\u0648\u0631 \u067E\u0691\u06D2 \u06AF\u0627\u06D4`
  }));
}
function eventLine(u, a, pairSign, now, target) {
  const at = Date.parse(u.scheduledAt);
  const when = inL(at, now);
  const ind2 = a ? allInds(a).find((i) => i.observation?.sourceTitle && stripStage(i.observation.sourceTitle) === stripStage(u.title)) : void 0;
  const pol = polarityOf(ind2) * pairSign;
  const unit = ind2?.observation?.unit;
  const nm = nameL(u.title);
  const exp = u.forecast !== null ? { en: `Expected: ${withUnit(u.forecast, unit)}${u.previous !== null ? ` (last time ${withUnit(u.previous, unit)})` : ""}.`, ur: `\u0645\u062A\u0648\u0642\u0639: ${withUnit(u.forecast, unit)}${u.previous !== null ? ` (\u067E\u0686\u06BE\u0644\u06CC \u0628\u0627\u0631 ${withUnit(u.previous, unit)})` : ""}\u06D4` } : u.previous !== null ? { en: `Last time: ${withUnit(u.previous, unit)}.`, ur: `\u067E\u0686\u06BE\u0644\u06CC \u0628\u0627\u0631: ${withUnit(u.previous, unit)}\u06D4` } : { en: "", ur: "" };
  const dir = pol !== 0 ? { en: `If the result is higher than expected, ${target} usually ${pol > 0 ? "rises" : "falls"}; if it is lower, it usually ${pol > 0 ? "falls" : "rises"}.`, ur: `\u0627\u06AF\u0631 \u0646\u062A\u06CC\u062C\u06C1 \u062A\u0648\u0642\u0639 \u0633\u06D2 \u0632\u06CC\u0627\u062F\u06C1 \u0622\u06CC\u0627 \u062A\u0648 ${target} \u0639\u0645\u0648\u0645\u0627\u064B ${pol > 0 ? "\u0627\u0648\u067E\u0631" : "\u0646\u06CC\u0686\u06D2"} \u062C\u0627\u062A\u0627 \u06C1\u06D2\u061B \u0627\u06AF\u0631 \u06A9\u0645 \u0622\u06CC\u0627 \u062A\u0648 \u0639\u0645\u0648\u0645\u0627\u064B ${pol > 0 ? "\u0646\u06CC\u0686\u06D2" : "\u0627\u0648\u067E\u0631"}\u06D4` } : { en: "A result far from the forecast can move it either way.", ur: "\u062A\u0648\u0642\u0639 \u0633\u06D2 \u0628\u06C1\u062A \u0645\u062E\u062A\u0644\u0641 \u0646\u062A\u06CC\u062C\u06C1 \u06A9\u0633\u06CC \u0628\u06BE\u06CC \u0633\u0645\u062A \u0645\u06CC\u06BA \u062D\u0631\u06A9\u062A \u062F\u06D2 \u0633\u06A9\u062A\u0627 \u06C1\u06D2\u06D4" };
  return {
    tone: "info",
    at,
    en: `${u.asset} \xB7 ${nm.en} \u2014 ${pkt(at)} Pakistan time (${when.en}). ${exp.en} ${dir.en}`.replace(/\s+/g, " ").trim(),
    ur: `${u.asset} \xB7 ${nm.ur} \u2014 ${pkt(at)} \u067E\u0627\u06A9\u0633\u062A\u0627\u0646\u06CC \u0648\u0642\u062A (${when.ur})\u06D4 ${exp.ur} ${dir.ur}`.replace(/\s+/g, " ").trim()
  };
}
var DISCLAIMER = {
  en: "Made automatically from live economic data and scheduled releases. It explains the fundamental lean \u2014 it is not a price target or a trade signal.",
  ur: "\u06CC\u06C1 \u062E\u0644\u0627\u0635\u06C1 \u0628\u0631\u0627\u06C1\u0650 \u0631\u0627\u0633\u062A \u0645\u0639\u0627\u0634\u06CC \u0688\u06CC\u0679\u0627 \u0627\u0648\u0631 \u0637\u06D2 \u0634\u062F\u06C1 \u0631\u06CC\u0644\u06CC\u0632\u0632 \u0633\u06D2 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0637\u0648\u0631 \u067E\u0631 \u0628\u0646\u062A\u0627 \u06C1\u06D2\u06D4 \u06CC\u06C1 \u0628\u0646\u06CC\u0627\u062F\u06CC \u0631\u062C\u062D\u0627\u0646 \u0633\u0645\u062C\u06BE\u0627\u062A\u0627 \u06C1\u06D2 \u2014 \u0642\u06CC\u0645\u062A \u06A9\u0627 \u06C1\u062F\u0641 \u06CC\u0627 \u0679\u0631\u06CC\u0688 \u0633\u06AF\u0646\u0644 \u0646\u06C1\u06CC\u06BA\u06D4"
};
function trustL(conf) {
  return conf >= 80 ? { en: `High data confidence (${Math.round(conf)}%) \u2014 most inputs are live and recent.`, ur: `\u0688\u06CC\u0679\u0627 \u067E\u0631 \u0627\u0639\u062A\u0645\u0627\u062F \u0632\u06CC\u0627\u062F\u06C1 (${Math.round(conf)}%) \u2014 \u0632\u06CC\u0627\u062F\u06C1 \u062A\u0631 \u0627\u0646 \u067E\u0679\u0633 \u0644\u0627\u0626\u06CC\u0648 \u0627\u0648\u0631 \u062A\u0627\u0632\u06C1 \u06C1\u06CC\u06BA\u06D4` } : conf >= 60 ? { en: `Medium data confidence (${Math.round(conf)}%) \u2014 some inputs are missing or older.`, ur: `\u0688\u06CC\u0679\u0627 \u067E\u0631 \u0627\u0639\u062A\u0645\u0627\u062F \u062F\u0631\u0645\u06CC\u0627\u0646\u06C1 (${Math.round(conf)}%) \u2014 \u06A9\u0686\u06BE \u0627\u0646 \u067E\u0679\u0633 \u063A\u0627\u0626\u0628 \u06CC\u0627 \u067E\u0631\u0627\u0646\u06D2 \u06C1\u06CC\u06BA\u06D4` } : { en: `Low data confidence (${Math.round(conf)}%) \u2014 treat this view with care until more data arrives.`, ur: `\u0688\u06CC\u0679\u0627 \u067E\u0631 \u0627\u0639\u062A\u0645\u0627\u062F \u06A9\u0645 (${Math.round(conf)}%) \u2014 \u0645\u0632\u06CC\u062F \u0688\u06CC\u0679\u0627 \u0622\u0646\u06D2 \u062A\u06A9 \u0627\u0633 \u0631\u062C\u062D\u0627\u0646 \u067E\u0631 \u0627\u062D\u062A\u06CC\u0627\u0637 \u06A9\u0631\u06CC\u06BA\u06D4` };
}
var headlineOf = (display, b) => ({ en: `${display} is ${BIAS_EN[b]} \u2014 ${MEAN_EN[b]}.`, ur: `${display} ${BIAS_UR[b]} \u0645\u06CC\u06BA \u06C1\u06D2 \u2014 ${MEAN_UR[b]}\u06D4` });
var NO_DATA = (d) => ({ head: { en: `${d}: not enough data to call a direction yet.`, ur: `${d}: \u0633\u0645\u062A \u0637\u06D2 \u06A9\u0631\u0646\u06D2 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0627\u0628\u06BE\u06CC \u06A9\u0627\u0641\u06CC \u0688\u06CC\u0679\u0627 \u0646\u06C1\u06CC\u06BA\u06D4` }, sum: { en: "We never guess \u2014 the view appears as soon as enough live data arrives.", ur: "\u06C1\u0645 \u0627\u0646\u062F\u0627\u0632\u06C1 \u0646\u06C1\u06CC\u06BA \u0644\u06AF\u0627\u062A\u06D2 \u2014 \u06A9\u0627\u0641\u06CC \u0644\u0627\u0626\u06CC\u0648 \u0688\u06CC\u0679\u0627 \u0622\u062A\u06D2 \u06C1\u06CC \u0631\u062C\u062D\u0627\u0646 \u0638\u0627\u06C1\u0631 \u06C1\u0648 \u062C\u0627\u0626\u06D2 \u06AF\u0627\u06D4" } });
function assetBrief(a, s, now = Date.now()) {
  const label = a.symbol;
  const sc = a.score;
  const c = { label, fxAsset: a.assetClass === "FOREX" };
  const why = [];
  if (sc !== null) for (const d of topDrivers(a, 4)) {
    const l = driverLine(d, c);
    if (l) why.push(l);
  }
  const watch = [];
  const ups = s.upcoming.filter((u) => u.asset === a.symbol && Date.parse(u.scheduledAt) > now).sort((x, y) => Date.parse(x.scheduledAt) - Date.parse(y.scheduledAt));
  const hi = ups.filter((u) => /high|3/i.test(u.importance));
  const pick = (hi.length ? hi : ups).slice(0, 3);
  for (const u of pick) watch.push(eventLine(u, a, 1, now, label));
  if (!pick.length) watch.push({ tone: "info", en: `No release for ${label} is scheduled in the data window. It will mostly move with new readings and market-based inputs.`, ur: `${label} \u06A9\u06CC \u06A9\u0648\u0626\u06CC \u0631\u06CC\u0644\u06CC\u0632 \u0688\u06CC\u0679\u0627 \u06A9\u06CC \u0645\u062F\u062A \u0645\u06CC\u06BA \u0637\u06D2 \u0646\u06C1\u06CC\u06BA\u06D4 \u06CC\u06C1 \u0632\u06CC\u0627\u062F\u06C1 \u062A\u0631 \u0646\u0626\u06CC \u0631\u06CC\u0688\u0646\u06AF\u0632 \u0627\u0648\u0631 \u0645\u0627\u0631\u06A9\u06CC\u0679 \u067E\u0631 \u0645\u0628\u0646\u06CC \u0627\u0646 \u067E\u0679\u0633 \u06A9\u06D2 \u0633\u0627\u062A\u06BE \u0628\u062F\u0644\u06D2 \u06AF\u0627\u06D4` });
  const heading = [];
  if (sc !== null) {
    const bull = sc >= 10, bear = sc <= -10;
    heading.push({
      tone: bull ? "bull" : bear ? "bear" : "neutral",
      en: bull ? `If the next releases keep beating expectations for ${label}, the bullish view can grow stronger. Weak surprises would pull it back toward neutral.` : bear ? `If the next readings keep disappointing for ${label}, the bearish view can grow stronger. Good surprises would pull it back toward neutral.` : `${label} has no clear lean now. The next strong or weak readings will decide which way it tilts.`,
      ur: bull ? `\u0627\u06AF\u0631 \u0622\u0646\u06D2 \u0648\u0627\u0644\u06CC \u0631\u06CC\u0644\u06CC\u0632\u0632 ${label} \u06A9\u06D2 \u0644\u06CC\u06D2 \u062A\u0648\u0642\u0639 \u0633\u06D2 \u0628\u06C1\u062A\u0631 \u0631\u06C1\u06CC\u06BA \u062A\u0648 \u062A\u06CC\u0632\u06CC \u06A9\u0627 \u0631\u062C\u062D\u0627\u0646 \u0645\u0632\u06CC\u062F \u0645\u0636\u0628\u0648\u0637 \u06C1\u0648 \u0633\u06A9\u062A\u0627 \u06C1\u06D2\u06D4 \u06A9\u0645\u0632\u0648\u0631 \u0646\u062A\u0627\u0626\u062C \u0627\u0633\u06D2 \u063A\u06CC\u0631 \u062C\u0627\u0646\u0628\u062F\u0627\u0631 \u06A9\u06CC \u0637\u0631\u0641 \u0648\u0627\u067E\u0633 \u0644\u0627\u0626\u06CC\u06BA \u06AF\u06D2\u06D4` : bear ? `\u0627\u06AF\u0631 \u0622\u0646\u06D2 \u0648\u0627\u0644\u06CC \u0631\u06CC\u0688\u0646\u06AF\u0632 ${label} \u06A9\u06D2 \u0644\u06CC\u06D2 \u0645\u0627\u06CC\u0648\u0633 \u06A9\u0646 \u0631\u06C1\u06CC\u06BA \u062A\u0648 \u0645\u0646\u062F\u06CC \u06A9\u0627 \u0631\u062C\u062D\u0627\u0646 \u0645\u0632\u06CC\u062F \u0645\u0636\u0628\u0648\u0637 \u06C1\u0648 \u0633\u06A9\u062A\u0627 \u06C1\u06D2\u06D4 \u0627\u0686\u06BE\u06D2 \u0646\u062A\u0627\u0626\u062C \u0627\u0633\u06D2 \u063A\u06CC\u0631 \u062C\u0627\u0646\u0628\u062F\u0627\u0631 \u06A9\u06CC \u0637\u0631\u0641 \u0648\u0627\u067E\u0633 \u0644\u0627\u0626\u06CC\u06BA \u06AF\u06D2\u06D4` : `${label} \u06A9\u0627 \u0627\u0628\u06BE\u06CC \u06A9\u0648\u0626\u06CC \u0648\u0627\u0636\u062D \u062C\u06BE\u06A9\u0627\u0624 \u0646\u06C1\u06CC\u06BA\u06D4 \u0622\u0646\u06D2 \u0648\u0627\u0644\u06CC \u0645\u0636\u0628\u0648\u0637 \u06CC\u0627 \u06A9\u0645\u0632\u0648\u0631 \u0631\u06CC\u0688\u0646\u06AF\u0632 \u0637\u06D2 \u06A9\u0631\u06CC\u06BA \u06AF\u06CC \u06A9\u06C1 \u06CC\u06C1 \u06A9\u0633 \u0637\u0631\u0641 \u062C\u06BE\u06A9\u062A\u0627 \u06C1\u06D2\u06D4`
    });
    heading.push(...distance(sc, label));
  }
  const t = sc === null ? null : tally(a);
  const summary = sc === null ? NO_DATA(label).sum : t && t.up + t.down > 0 ? { en: `Of the ${t.up + t.down} readings we track for ${label}, ${t.up} push it up and ${t.down} push it down.`, ur: `${label} \u06A9\u06D2 \u0644\u06CC\u06D2 \u06C1\u0645 \u062C\u0646 ${t.up + t.down} \u0631\u06CC\u0688\u0646\u06AF\u0632 \u06A9\u0648 \u062F\u06CC\u06A9\u06BE\u062A\u06D2 \u06C1\u06CC\u06BA \u0627\u0646 \u0645\u06CC\u06BA \u0633\u06D2 ${t.up} \u0627\u0633\u06D2 \u0627\u0648\u067E\u0631 \u0627\u0648\u0631 ${t.down} \u0646\u06CC\u0686\u06D2 \u062F\u06BE\u06A9\u06CC\u0644 \u0631\u06C1\u06CC \u06C1\u06CC\u06BA\u06D4` } : { en: `${label} is scored from its live readings.`, ur: `${label} \u06A9\u0627 \u0627\u0633\u06A9\u0648\u0631 \u0627\u0633 \u06A9\u06CC \u0644\u0627\u0626\u06CC\u0648 \u0631\u06CC\u0688\u0646\u06AF\u0632 \u0633\u06D2 \u0628\u0646\u062A\u0627 \u06C1\u06D2\u06D4` };
  const head = sc === null ? NO_DATA(`${label} (${a.name})`).head : headlineOf(`${label} (${a.name})`, a.bias);
  return {
    symbol: a.symbol,
    display: a.symbol,
    kind: "asset",
    assetClass: a.assetClass,
    bias: a.bias,
    biasLabel: biasLabelL(a.bias),
    side: sideOfBias(a.bias),
    score: sc,
    bullishPct: a.bullishPct,
    bearishPct: a.bearishPct,
    confidence: a.confidence,
    updatedAt: a.updatedAt,
    asOf: s.generatedAt,
    headline: head,
    summary,
    trust: trustL(a.confidence),
    why,
    watch,
    heading,
    counter: sc === null ? [] : counterLines(a, label),
    disclaimer: DISCLAIMER
  };
}
function pairBrief(p, base, quote, s, now = Date.now()) {
  const sc = p.score;
  const why = [];
  let summary = NO_DATA(p.display).sum;
  if (sc !== null && p.baseScore !== null && p.quoteScore !== null) {
    const baseStrong = p.baseScore >= p.quoteScore;
    const strong = baseStrong ? p.base : p.quote, weak = baseStrong ? p.quote : p.base;
    const lean = sc >= 10 ? { en: "up", ur: "\u0627\u0648\u067E\u0631" } : sc <= -10 ? { en: "down", ur: "\u0646\u06CC\u0686\u06D2" } : null;
    summary = lean ? { en: `${strong} looks stronger than ${weak}, so ${p.display} leans ${lean.en}.`, ur: `${strong} ${weak} \u06A9\u06D2 \u0645\u0642\u0627\u0628\u0644\u06D2 \u0645\u06CC\u06BA \u0645\u0636\u0628\u0648\u0637 \u0646\u0638\u0631 \u0622\u062A\u0627 \u06C1\u06D2\u060C \u0627\u0633 \u0644\u06CC\u06D2 ${p.display} ${lean.ur} \u06A9\u06CC \u0637\u0631\u0641 \u062C\u06BE\u06A9\u0627 \u06C1\u0648\u0627 \u06C1\u06D2\u06D4` } : { en: `${p.base} and ${p.quote} look about equally strong, so ${p.display} has no clear direction.`, ur: `${p.base} \u0627\u0648\u0631 ${p.quote} \u062A\u0642\u0631\u06CC\u0628\u0627\u064B \u0628\u0631\u0627\u0628\u0631 \u0645\u0636\u0628\u0648\u0637 \u06C1\u06CC\u06BA\u060C \u0627\u0633 \u0644\u06CC\u06D2 ${p.display} \u06A9\u06CC \u06A9\u0648\u0626\u06CC \u0648\u0627\u0636\u062D \u0633\u0645\u062A \u0646\u06C1\u06CC\u06BA\u06D4` };
    why.push({ tone: sc >= 0 ? "bull" : "bear", en: `Strength scores: ${p.base} ${sgn(p.baseScore)} vs ${p.quote} ${sgn(p.quoteScore)}. A pair rises when its first currency is stronger than its second, and falls when it is weaker.`, ur: `\u0637\u0627\u0642\u062A \u06A9\u06D2 \u0627\u0633\u06A9\u0648\u0631: ${p.base} ${sgn(p.baseScore)} \u0628\u0645\u0642\u0627\u0628\u0644\u06C1 ${p.quote} ${sgn(p.quoteScore)}\u06D4 \u062C\u0648\u0691\u06CC \u062A\u0628 \u0627\u0648\u067E\u0631 \u062C\u0627\u062A\u06CC \u06C1\u06D2 \u062C\u0628 \u067E\u06C1\u0644\u06CC \u06A9\u0631\u0646\u0633\u06CC \u062F\u0648\u0633\u0631\u06CC \u0633\u06D2 \u0645\u0636\u0628\u0648\u0637 \u06C1\u0648\u060C \u0627\u0648\u0631 \u062A\u0628 \u0646\u06CC\u0686\u06D2 \u062C\u0628 \u06A9\u0645\u0632\u0648\u0631 \u06C1\u0648\u06D4` });
  }
  const ctx = (lab) => ({ label: lab, pair: p.display, fxAsset: false });
  const side2 = (a, sign, lab, n) => a ? topDrivers(a, n).map((d) => driverLine(d, ctx(lab), sign)).filter(Boolean) : [];
  why.push(...side2(base, 1, p.base, 2), ...side2(quote, -1, p.quote, 2));
  if (p.retailSentiment && p.retailSentiment.contrarianScore !== 0) {
    const r = p.retailSentiment;
    const crowd = r.longPct >= 50 ? "buying" : "selling";
    const up = r.contrarianScore > 0;
    why.push({
      tone: "info",
      en: `Crowd check: ${Math.round(r.longPct)}% of retail traders are long and ${Math.round(r.shortPct)}% short (${r.source}). Most are ${crowd}, and crowds are often wrong at extremes \u2014 a small push ${up ? "up" : "down"} for ${p.display}.`,
      ur: `\u0628\u06BE\u06CC\u0691 \u06A9\u0627 \u062C\u0627\u0626\u0632\u06C1: ${Math.round(r.longPct)}% \u0631\u06CC\u0679\u06CC\u0644 \u0679\u0631\u06CC\u0688\u0631\u0632 \u0644\u0627\u0646\u06AF \u0627\u0648\u0631 ${Math.round(r.shortPct)}% \u0634\u0627\u0631\u0679 \u06C1\u06CC\u06BA (${r.source})\u06D4 \u0632\u06CC\u0627\u062F\u06C1 \u062A\u0631 ${crowd === "buying" ? "\u062E\u0631\u06CC\u062F" : "\u0641\u0631\u0648\u062E\u062A"} \u06A9\u0631 \u0631\u06C1\u06D2 \u06C1\u06CC\u06BA\u060C \u0627\u0648\u0631 \u0628\u06BE\u06CC\u0691 \u0627\u06A9\u062B\u0631 \u0627\u0646\u062A\u06C1\u0627 \u067E\u0631 \u063A\u0644\u0637 \u06C1\u0648\u062A\u06CC \u06C1\u06D2 \u2014 ${p.display} \u06A9\u06D2 \u0644\u06CC\u06D2 ${up ? "\u0627\u0648\u067E\u0631" : "\u0646\u06CC\u0686\u06D2"} \u06A9\u06CC \u06C1\u0644\u06A9\u06CC \u0633\u06CC \u062D\u0645\u0627\u06CC\u062A\u06D4`
    });
  }
  const mk = (asset, sym, sign) => s.upcoming.filter((u) => u.asset === sym && Date.parse(u.scheduledAt) > now).map((u) => eventLine(u, asset, sign, now, p.display));
  const watch = [...mk(base, p.base, 1), ...mk(quote, p.quote, -1)].sort((x, y) => x.at - y.at).slice(0, 4);
  if (!watch.length) watch.push({ tone: "info", en: `No release for ${p.base} or ${p.quote} is scheduled in the data window.`, ur: `${p.base} \u06CC\u0627 ${p.quote} \u06A9\u06CC \u06A9\u0648\u0626\u06CC \u0631\u06CC\u0644\u06CC\u0632 \u0688\u06CC\u0679\u0627 \u06A9\u06CC \u0645\u062F\u062A \u0645\u06CC\u06BA \u0637\u06D2 \u0646\u06C1\u06CC\u06BA\u06D4` });
  const heading = [];
  const counter = [];
  if (sc !== null) {
    const bull = sc >= 10, bear = sc <= -10;
    heading.push({
      tone: bull ? "bull" : bear ? "bear" : "neutral",
      en: bull ? `If ${p.base} data keeps beating expectations or ${p.quote} data disappoints, ${p.display} can climb further. The reverse would pull it back toward neutral.` : bear ? `If ${p.quote} data keeps beating expectations or ${p.base} data disappoints, ${p.display} can fall further. The reverse would pull it back toward neutral.` : `${p.display} has no clear lean now. Whichever currency delivers the stronger data next will tilt it that way.`,
      ur: bull ? `\u0627\u06AF\u0631 ${p.base} \u06A9\u0627 \u0688\u06CC\u0679\u0627 \u062A\u0648\u0642\u0639 \u0633\u06D2 \u0628\u06C1\u062A\u0631 \u0622\u062A\u0627 \u0631\u06C1\u0627 \u06CC\u0627 ${p.quote} \u06A9\u0627 \u0688\u06CC\u0679\u0627 \u0645\u0627\u06CC\u0648\u0633 \u06A9\u0646 \u0631\u06C1\u0627 \u062A\u0648 ${p.display} \u0645\u0632\u06CC\u062F \u0627\u0648\u067E\u0631 \u062C\u0627 \u0633\u06A9\u062A\u0627 \u06C1\u06D2\u06D4 \u0627\u0633 \u06A9\u06D2 \u0628\u0631\u0639\u06A9\u0633 \u06C1\u0648\u0627 \u062A\u0648 \u06CC\u06C1 \u063A\u06CC\u0631 \u062C\u0627\u0646\u0628\u062F\u0627\u0631 \u06A9\u06CC \u0637\u0631\u0641 \u0644\u0648\u0679\u06D2 \u06AF\u0627\u06D4` : bear ? `\u0627\u06AF\u0631 ${p.quote} \u06A9\u0627 \u0688\u06CC\u0679\u0627 \u062A\u0648\u0642\u0639 \u0633\u06D2 \u0628\u06C1\u062A\u0631 \u0622\u062A\u0627 \u0631\u06C1\u0627 \u06CC\u0627 ${p.base} \u06A9\u0627 \u0688\u06CC\u0679\u0627 \u0645\u0627\u06CC\u0648\u0633 \u06A9\u0646 \u0631\u06C1\u0627 \u062A\u0648 ${p.display} \u0645\u0632\u06CC\u062F \u0646\u06CC\u0686\u06D2 \u062C\u0627 \u0633\u06A9\u062A\u0627 \u06C1\u06D2\u06D4 \u0627\u0633 \u06A9\u06D2 \u0628\u0631\u0639\u06A9\u0633 \u06C1\u0648\u0627 \u062A\u0648 \u06CC\u06C1 \u063A\u06CC\u0631 \u062C\u0627\u0646\u0628\u062F\u0627\u0631 \u06A9\u06CC \u0637\u0631\u0641 \u0644\u0648\u0679\u06D2 \u06AF\u0627\u06D4` : `${p.display} \u06A9\u0627 \u0627\u0628\u06BE\u06CC \u06A9\u0648\u0626\u06CC \u0648\u0627\u0636\u062D \u062C\u06BE\u06A9\u0627\u0624 \u0646\u06C1\u06CC\u06BA\u06D4 \u062C\u0633 \u06A9\u0631\u0646\u0633\u06CC \u06A9\u0627 \u0688\u06CC\u0679\u0627 \u0622\u06AF\u06D2 \u0632\u06CC\u0627\u062F\u06C1 \u0645\u0636\u0628\u0648\u0637 \u0622\u0626\u06D2 \u06AF\u0627\u060C \u062C\u0648\u0691\u06CC \u0627\u0633\u06CC \u0637\u0631\u0641 \u062C\u06BE\u06A9\u06D2 \u06AF\u06CC\u06D4`
    });
    heading.push(...distance(sc, p.display));
    if (bull || bear) counter.push({
      tone: "neutral",
      en: `This view changes if ${bull ? p.quote : p.base} gets stronger or ${bull ? p.base : p.quote} gets weaker. Watch the releases listed above for both currencies.`,
      ur: `\u0627\u06AF\u0631 ${bull ? p.quote : p.base} \u0645\u0636\u0628\u0648\u0637 \u06C1\u0648 \u06CC\u0627 ${bull ? p.base : p.quote} \u06A9\u0645\u0632\u0648\u0631 \u067E\u0691\u06D2 \u062A\u0648 \u06CC\u06C1 \u0631\u062C\u062D\u0627\u0646 \u0628\u062F\u0644 \u0633\u06A9\u062A\u0627 \u06C1\u06D2\u06D4 \u0627\u0648\u067E\u0631 \u062F\u06CC \u06AF\u0626\u06CC \u062F\u0648\u0646\u0648\u06BA \u06A9\u0631\u0646\u0633\u06CC\u0648\u06BA \u06A9\u06CC \u0631\u06CC\u0644\u06CC\u0632\u0632 \u067E\u0631 \u0646\u0638\u0631 \u0631\u06A9\u06BE\u06CC\u06BA\u06D4`
    });
  }
  const head = sc === null ? NO_DATA(p.display).head : headlineOf(p.display, p.bias);
  return {
    symbol: p.symbol,
    display: p.display,
    kind: "pair",
    assetClass: p.assetClass,
    bias: p.bias,
    biasLabel: biasLabelL(p.bias),
    side: sideOfBias(p.bias),
    score: sc,
    bullishPct: p.bullishPct,
    bearishPct: p.bullishPct === null ? null : Math.round((100 - p.bullishPct) * 10) / 10,
    confidence: p.confidence,
    updatedAt: s.generatedAt,
    asOf: s.generatedAt,
    headline: head,
    summary,
    trust: trustL(p.confidence),
    why,
    watch,
    heading,
    counter,
    disclaimer: DISCLAIMER
  };
}

// server/routes/macroRoutes.ts
var import_express = require("express");

// server/dataPath.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_os = __toESM(require("os"), 1);
var resolvedDataDir = null;
function getDataDir() {
  if (resolvedDataDir) return resolvedDataDir;
  const cwdData = import_path.default.join(process.cwd(), "data");
  let isCwdWritable = false;
  try {
    if (!import_fs.default.existsSync(cwdData)) {
      import_fs.default.mkdirSync(cwdData, { recursive: true });
    }
    const testFile = import_path.default.join(cwdData, `.test_write_${Date.now()}`);
    import_fs.default.writeFileSync(testFile, "1");
    import_fs.default.unlinkSync(testFile);
    isCwdWritable = true;
  } catch {
    isCwdWritable = false;
  }
  if (isCwdWritable && !process.env.VERCEL) {
    resolvedDataDir = cwdData;
    return resolvedDataDir;
  }
  const tmpData = import_path.default.join(import_os.default.tmpdir(), "primepipfx_data");
  try {
    if (!import_fs.default.existsSync(tmpData)) {
      import_fs.default.mkdirSync(tmpData, { recursive: true });
    }
  } catch (e) {
    console.warn("[DATA] Error creating tmpData dir:", e);
  }
  try {
    if (import_fs.default.existsSync(cwdData)) {
      const files = import_fs.default.readdirSync(cwdData);
      for (const file of files) {
        const src = import_path.default.join(cwdData, file);
        const dest = import_path.default.join(tmpData, file);
        if (!import_fs.default.existsSync(dest)) {
          try {
            const stat = import_fs.default.statSync(src);
            if (stat.isFile()) {
              import_fs.default.copyFileSync(src, dest);
            }
          } catch {
          }
        }
      }
    }
  } catch (e) {
    console.warn("[DATA] Error copying seed data to tmp directory:", e);
  }
  resolvedDataDir = tmpData;
  return resolvedDataDir;
}
function ensureDataDir() {
  const dir = getDataDir();
  try {
    if (!import_fs.default.existsSync(dir)) {
      import_fs.default.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn("[DATA] ensureDataDir warning:", err);
  }
  return dir;
}
function getDataFilePath(filename) {
  return import_path.default.join(getDataDir(), filename);
}
var memoryFileCache = /* @__PURE__ */ new Map();
function safeReadJsonFile(filename, fallback) {
  const filePath = getDataFilePath(filename);
  try {
    if (import_fs.default.existsSync(filePath)) {
      const raw = import_fs.default.readFileSync(filePath, "utf8");
      memoryFileCache.set(filename, raw);
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[DATA] Error reading ${filename} from disk:`, err);
  }
  if (memoryFileCache.has(filename)) {
    try {
      return JSON.parse(memoryFileCache.get(filename));
    } catch {
    }
  }
  try {
    const seedPath = import_path.default.join(process.cwd(), "data", filename);
    if (import_fs.default.existsSync(seedPath)) {
      const raw = import_fs.default.readFileSync(seedPath, "utf8");
      memoryFileCache.set(filename, raw);
      return JSON.parse(raw);
    }
  } catch {
  }
  return fallback;
}
function safeWriteJsonFile(filename, data2) {
  const raw = JSON.stringify(data2, null, 2);
  memoryFileCache.set(filename, raw);
  try {
    ensureDataDir();
    const filePath = getDataFilePath(filename);
    import_fs.default.writeFileSync(filePath, raw, "utf8");
  } catch (err) {
    console.warn(`[DATA] Failed writing ${filename} to disk (kept in memory cache):`, err);
  }
}

// server/macro/concepts.ts
var RATE_EXCLUDE = /speech|minutes|statement|press|projection|vote|report|summary|testimony|hearing|accounts|outlook|meeting|lending|swap|reserve/i;
var PMI_EXCLUDE = /composite|services|prices|employment|new orders|output|input|non-manufacturing|chicago|richmond|kansas|dallas|philadelphia|empire|ny |ivey/i;
var SVC_EXCLUDE = /composite|manufacturing|prices|employment|new orders|business activity|input/i;
var CONCEPTS = {
  // ─────────────────────────── MONETARY POLICY
  policy_rate: {
    name: "Policy Rate Decision",
    desc: "The central bank\u2019s benchmark rate. A hike (or a more hawkish decision than expected) raises the currency\u2019s yield appeal.",
    freq: "Per meeting",
    patterns: [{ re: /^(fed|ecb|boe|boj|boc|rba|rbnz|snb|pboc)? ?interest rate decision$/ }, { re: /^interest rate$/ }, { re: /^deposit facility rate$/ }, { re: /^official cash rate$/ }, { re: /^cash rate$/ }, { re: /^bank rate$/ }],
    exclude: RATE_EXCLUDE,
    scale: 0.25,
    mode: "rate",
    range: [-2, 40]
  },
  // ─────────────────────────── INFLATION
  cpi_yoy: {
    name: "Headline CPI (YoY)",
    desc: "Consumer prices vs. one year ago \u2014 the central bank\u2019s primary target variable.",
    freq: "Monthly",
    patterns: [{ re: /^inflation rate yoy$/ }, { re: /^cpi yoy$/ }, { re: /^monthly cpi indicator$/ }, { re: /^consumer price index yoy$/ }],
    exclude: /core|trimmed|weighted|median|services|goods|tokyo|harmonised|harmonized|hicp|food|energy/i,
    scale: 0.15,
    range: [-15, 60]
  },
  core_cpi_yoy: {
    name: "Core CPI (YoY)",
    desc: "Inflation excluding volatile food & energy \u2014 the best gauge of underlying price pressure that drives policy.",
    freq: "Monthly",
    patterns: [{ re: /^core inflation rate yoy$/ }, { re: /^core cpi yoy$/ }, { re: /^rba trimmed mean cpi yoy$/ }, { re: /^quarterly rba trimmed mean cpi yoy$/ }, { re: /^cpi trimmed[- ]mean yoy$/ }, { re: /^trimmed mean cpi yoy$/ }, { re: /^rba trimmed mean cpi yoy$/ }, { re: /^inflation rate ex all food and energy yoy$/ }, { re: /^inflation rate ex-food and energy yoy$/ }],
    exclude: /tokyo|boc|median|common|weighted/i,
    scale: 0.15,
    range: [-15, 60]
  },
  cpi_mom: {
    name: "Headline CPI (MoM)",
    desc: "Month-on-month price change \u2014 the freshest read on inflation momentum.",
    freq: "Monthly",
    patterns: [{ re: /^inflation rate mom$/ }, { re: /^cpi mom$/ }, { re: /^inflation rate qoq$/, scale: 0.25 }, { re: /^quarterly inflation rate qoq$/, scale: 0.25 }],
    exclude: /core|tokyo|harmonised|hicp/i,
    scale: 0.1,
    range: [-5, 15]
  },
  core_cpi_mom: {
    name: "Core CPI (MoM)",
    desc: "Monthly core inflation momentum. Central banks watch 3- and 6-month annualized trends of this print.",
    freq: "Monthly",
    patterns: [{ re: /^core inflation rate mom$/ }, { re: /^core cpi mom$/ }, { re: /^inflation rate ex all food and energy mom$/ }, { re: /^rba trimmed mean cpi mom$/ }],
    exclude: /tokyo/i,
    scale: 0.1,
    range: [-5, 15]
  },
  ppi: {
    name: "Producer Prices",
    desc: "Pipeline inflation at the factory gate \u2014 leads consumer inflation by 1\u20133 months.",
    freq: "Monthly",
    patterns: [{ re: /^ppi mom$/, scale: 0.2 }, { re: /^ppi yoy$/, scale: 0.4 }, { re: /^ppi output yoy$/, scale: 0.4 }, { re: /^producer prices yoy$/, scale: 0.4 }, { re: /^producer & import prices yoy$/, scale: 0.4 }, { re: /^ppi qoq$/, scale: 0.4 }, { re: /^ppi output qoq$/, scale: 0.4 }],
    exclude: /core|input|ex /i,
    scale: 0.3,
    range: [-40, 80]
  },
  pce_core_yoy: {
    name: "Core PCE Price Index (YoY)",
    desc: "The Federal Reserve\u2019s preferred inflation measure (target 2%).",
    freq: "Monthly",
    patterns: [{ re: /^core pce price index yoy$/ }],
    scale: 0.1,
    range: [-5, 20]
  },
  pce_core_mom: {
    name: "Core PCE Price Index (MoM)",
    desc: "Monthly momentum of the Fed\u2019s preferred inflation gauge.",
    freq: "Monthly",
    patterns: [{ re: /^core pce price index mom$/ }],
    scale: 0.1,
    range: [-3, 5]
  },
  wages: {
    name: "Wage Growth",
    desc: "Pay growth feeds services inflation; hot wages keep central banks hawkish.",
    freq: "Monthly",
    patterns: [
      { re: /^average hourly earnings mom$/, scale: 0.1 },
      { re: /^average earnings incl\.? bonus.*$/, scale: 0.3 },
      { re: /^average hourly wages yoy$/, scale: 0.4 },
      { re: /^average cash earnings yoy$/, scale: 0.5 },
      { re: /^wage price index qoq$/, scale: 0.1 },
      { re: /^wage price index yoy$/, scale: 0.2 },
      { re: /^labour costs? index qoq$/, scale: 0.1 },
      { re: /^labour costs? index yoy$/, scale: 0.3 },
      { re: /^average hourly earnings yoy$/, scale: 0.2 },
      { re: /^wage growth yoy$/, scale: 0.3 }
    ],
    exclude: /real|excl/i,
    scale: 0.2,
    range: [-10, 30]
  },
  // ─────────────────────────── LABOUR
  unemployment: {
    name: "Unemployment Rate",
    desc: "Share of the labour force without work. Rising unemployment pushes central banks toward cuts.",
    freq: "Monthly",
    patterns: [{ re: /^unemployment rate$/ }],
    exclude: /harmonised|youth|claimant|u-?6/i,
    scale: 0.1,
    range: [0, 40]
  },
  nfp: {
    name: "Non-Farm Payrolls",
    desc: "Monthly change in US jobs outside agriculture \u2014 the most market-moving release in the world.",
    freq: "Monthly",
    patterns: [{ re: /^non farm payrolls$/ }, { re: /^nonfarm payrolls$/ }],
    exclude: /private|manufacturing|government|adp/i,
    scale: 60,
    scaleMode: "auto_k",
    range: [-25e3, 25e3]
  },
  adp: {
    name: "ADP Employment Change",
    desc: "Private payroll estimate from ADP \u2014 an early read ahead of NFP.",
    freq: "Monthly",
    patterns: [{ re: /^adp employment change$/ }],
    exclude: /weekly/i,
    scale: 40,
    scaleMode: "auto_k",
    range: [-25e3, 25e3]
  },
  claims: {
    name: "Initial Jobless Claims",
    desc: "Weekly new unemployment filings \u2014 the highest-frequency labour market signal.",
    freq: "Weekly",
    patterns: [{ re: /^initial jobless claims$/ }],
    exclude: /4-week|average/i,
    scale: 15,
    scaleMode: "auto_k",
    range: [50, 7e6]
  },
  jolts: {
    name: "JOLTS Job Openings",
    desc: "Unfilled job vacancies \u2014 labour demand and wage-pressure indicator.",
    freq: "Monthly",
    patterns: [{ re: /^jolts job openings$/ }],
    scale: 0.04,
    scaleMode: "relative"
  },
  employment_change: {
    name: "Employment Change",
    desc: "Net change in the number of employed people.",
    freq: "Monthly",
    patterns: [{ re: /^employment change$/ }, { re: /^employment change qoq$/, scale: 0.3 }],
    exclude: /adp|claimant/i,
    scale: 20,
    scaleMode: "auto_k"
  },
  claimant_count: {
    name: "Claimant Count Change",
    desc: "Monthly change in people claiming unemployment benefits (UK).",
    freq: "Monthly",
    patterns: [{ re: /^claimant count change$/ }],
    scale: 15,
    scaleMode: "auto_k"
  },
  // ─────────────────────────── GROWTH
  gdp: {
    name: "GDP Growth (QoQ)",
    desc: "Quarterly change in total economic output \u2014 the broadest measure of growth.",
    freq: "Quarterly",
    patterns: [{ re: /^gdp growth rate qoq$/ }, { re: /^gdp growth annualized$/ }],
    exclude: /price|deflator|index|capital|private|consumption|yoy/i,
    scale: 0.2,
    range: [-40, 40]
  },
  gdp_mom: {
    name: "Monthly GDP (MoM)",
    desc: "Monthly output estimate \u2014 a timelier growth signal between quarterly releases.",
    freq: "Monthly",
    patterns: [{ re: /^gdp mom$/ }, { re: /^monthly gdp mom$/ }, { re: /^gdp growth rate mom$/ }],
    scale: 0.2,
    range: [-20, 20]
  },
  mfg_pmi: {
    name: "Manufacturing PMI",
    desc: "Survey of purchasing managers; above 50 = expansion. Leads industrial output by months.",
    freq: "Monthly",
    patterns: [{ re: /manufacturing pmi$/ }, { re: /^business nz pmi$/ }, { re: /^ai group manufacturing index$/ }],
    exclude: PMI_EXCLUDE,
    scale: 1,
    level: { neutral: 50, scale: 4, label: "50 = expansion/contraction line" },
    range: [10, 90]
  },
  services_pmi: {
    name: "Services PMI",
    desc: "Services-sector activity survey \u2014 services are 70\u201380% of developed economies.",
    freq: "Monthly",
    patterns: [{ re: /^ism services pmi$/ }, { re: /^ism non-manufacturing pmi$/ }, { re: /services pmi$/ }, { re: /^business nz services index$/ }, { re: /^performance of services index$/ }, { re: /^services nz psi$/ }],
    exclude: SVC_EXCLUDE,
    scale: 1,
    level: { neutral: 50, scale: 4, label: "50 = expansion/contraction line" },
    range: [10, 90]
  },
  retail_sales: {
    name: "Retail Sales",
    desc: "Consumer spending at retailers \u2014 the engine of household demand.",
    freq: "Monthly",
    patterns: [{ re: /^retail sales mom$/, scale: 0.5 }, { re: /^retail sales qoq$/, scale: 0.6 }, { re: /^retail sales yoy$/, scale: 1.2 }, { re: /^household spending mom$/, scale: 0.6 }],
    exclude: /ex |excl|control|core|autos|fuel|volume|bbc|brc|redbook|value/i,
    scale: 0.5,
    range: [-40, 60]
  },
  industrial_production: {
    name: "Industrial Production",
    desc: "Output of factories, mines and utilities.",
    freq: "Monthly",
    patterns: [{ re: /^industrial production mom$/, scale: 0.6 }, { re: /^industrial production yoy$/, scale: 1.2 }],
    exclude: /capacity|^manufacturing (production|output)/i,
    scale: 0.6,
    range: [-50, 80]
  },
  housing: {
    name: "Housing Activity",
    desc: "Building permits / housing starts \u2014 the most rate-sensitive part of the economy.",
    freq: "Monthly",
    patterns: [{ re: /^building permits$/ }, { re: /^housing starts$/ }],
    exclude: /mom|yoy/i,
    scale: 0.04,
    scaleMode: "relative"
  },
  // ─────────────────────────── CONFIDENCE & EXTERNAL
  consumer_conf: {
    name: "Consumer Confidence",
    desc: "Household sentiment \u2014 leads spending decisions.",
    freq: "Monthly",
    patterns: [
      { re: /^michigan consumer sentiment$/ },
      { re: /^cb consumer confidence$/ },
      { re: /^gfk consumer confidence$/ },
      { re: /^westpac consumer confidence index$/ },
      { re: /^anz.?roy morgan consumer confidence$/ },
      { re: /^westpac consumer confidence$/, scale: 3 },
      { re: /^consumer confidence$/ },
      { re: /^consumer confidence index$/ },
      { re: /^consumer confidence mom$/, scale: 3 }
    ],
    exclude: /expectations|current conditions|inflation|lseg|ipsos/i,
    scale: 2
  },
  business_conf: {
    name: "Business Confidence",
    desc: "Corporate sentiment surveys (Ifo, ZEW, Tankan, NAB, NFIB\u2026) \u2014 signal hiring and investment intentions.",
    freq: "Monthly",
    patterns: [
      { re: /^ifo business climate$/ },
      { re: /^zew economic sentiment index$/, scale: 6 },
      { re: /^tankan large manufacturers index$/, scale: 3 },
      { re: /^nab business confidence$/, scale: 3 },
      { re: /^anz business confidence$/, scale: 5 },
      { re: /^nfib business optimism index$/ },
      { re: /^kof leading indicators$/ },
      { re: /^ivey pmi( s\.?a)?$/, scale: 3 },
      { re: /^cbi industrial trends orders$/, scale: 6 },
      { re: /^economic sentiment$/ },
      { re: /^business confidence$/ }
    ],
    exclude: /expectations|current assessment|outlook/i,
    scale: 1.5
  },
  trade_balance: {
    name: "Trade Balance",
    desc: "Exports minus imports. Improving balances add structural demand for the currency.",
    freq: "Monthly",
    patterns: [{ re: /^balance of trade$/ }],
    scale: 0.15,
    scaleMode: "relative"
  },
  tokyo_cpi: {
    name: "Tokyo CPI (leading)",
    desc: "Consumer prices in Tokyo, published about three weeks before the national figure \u2014 the BoJ\u2019s earliest inflation read.",
    freq: "Monthly",
    patterns: [{ re: /^tokyo core cpi yoy$/ }, { re: /^tokyo cpi ex fresh food yoy$/ }, { re: /^tokyo cpi yoy$/ }],
    exclude: /energy/i,
    scale: 0.2,
    range: [-5, 15]
  },
  dairy_auction: {
    name: "Global Dairy Trade Price Index",
    desc: "Fortnightly auction result for whole-milk powder and other dairy \u2014 New Zealand\u2019s biggest export earner.",
    freq: "Weekly",
    patterns: [{ re: /^global dairy trade price index$/ }, { re: /^gdt price index$/ }, { re: /global dairy trade/ }],
    scale: 2,
    range: [-25, 25]
  },
  activity_survey: {
    name: "Business Activity Survey",
    desc: "Domestic business-condition surveys (ESI, Tankan, NAB, CBI, KOF\u2026) \u2014 the free, always-published read on activity that stands in for the licensed S&P Global / HCOB PMIs.",
    freq: "Monthly",
    patterns: [],
    scale: 1.5,
    range: [-200, 400]
  },
  job_ratio: {
    name: "Jobs-to-Applicants Ratio",
    desc: "Job openings per applicant (Japan) \u2014 labour-market tightness that feeds wage growth and BoJ policy.",
    freq: "Monthly",
    patterns: [{ re: /^jobs\/applications ratio$/ }],
    scale: 0.03,
    level: { neutral: 1.2, scale: 0.15, label: "1.2 openings per applicant \u2248 balanced" },
    range: [0, 3]
  },
  infl_expect: {
    name: "Consumer Inflation Expectations",
    desc: "University of Michigan 5-year consumer inflation expectations \u2014 the Fed watches this for de-anchoring.",
    freq: "Monthly",
    patterns: [{ re: /^michigan 5 year inflation expectations$/ }],
    scale: 0.1,
    level: { neutral: 2.5, scale: 0.8, label: "~2.5% = anchored" },
    range: [0, 15]
  },
  durable_goods: {
    name: "Durable Goods Orders",
    desc: "New orders for long-lasting manufactured goods ex-transport \u2014 a capex and demand lead.",
    freq: "Monthly",
    patterns: [{ re: /^durable goods orders ex transp mom$/ }, { re: /^durable goods orders mom$/ }],
    scale: 0.6,
    range: [-30, 30]
  },
  regional_mfg: {
    name: "Regional Fed Manufacturing (Empire / Philly)",
    desc: "NY Empire State and Philadelphia Fed manufacturing surveys \u2014 the earliest read on the ISM each month.",
    freq: "Monthly",
    patterns: [{ re: /^philadelphia fed manufacturing index$/, scale: 8 }, { re: /^ny empire state manufacturing index$/, scale: 8 }],
    scale: 8,
    range: [-100, 100]
  },
  // ─────────────────────────── COMMODITY-SPECIFIC (US EIA / Baker Hughes)
  eia_crude: {
    name: "EIA Crude Oil Inventories",
    desc: "Weekly change in US commercial crude stocks. A draw (negative) signals tight supply.",
    freq: "Weekly",
    patterns: [{ re: /^eia crude oil stocks change$/ }, { re: /^crude oil inventories$/ }],
    exclude: /cushing|imports|refinery|distillate|gasoline|heating/i,
    scale: 2.5,
    scaleMode: "auto_k"
  },
  api_crude: {
    name: "API Crude Oil Stocks",
    desc: "American Petroleum Institute\u2019s weekly inventory estimate (released the evening before EIA).",
    freq: "Weekly",
    patterns: [{ re: /^api crude oil stock change$/ }],
    scale: 3,
    scaleMode: "auto_k"
  },
  eia_gasoline: {
    name: "EIA Gasoline Inventories",
    desc: "Weekly change in US gasoline stocks \u2014 demand proxy for refined products.",
    freq: "Weekly",
    patterns: [{ re: /^eia gasoline stocks change$/ }],
    scale: 2,
    scaleMode: "auto_k"
  },
  rig_count: {
    name: "Baker Hughes Oil Rig Count",
    desc: "Active US oil rigs \u2014 a rising count means more future supply.",
    freq: "Weekly",
    patterns: [{ re: /^baker hughes oil rig count$/ }],
    scale: 0.02,
    scaleMode: "relative"
  },
  eia_natgas: {
    name: "EIA Natural Gas Storage",
    desc: "Weekly change in US working gas in storage (Bcf). Smaller injections / bigger draws are bullish.",
    freq: "Weekly",
    patterns: [{ re: /^eia natural gas stocks change$/ }, { re: /^natural gas storage$/ }],
    scale: 12
  },
  // ─────────────────────────── ADDED FROM THE LIVE FEED (titles verified in the calendar; each has a published actual)
  cpi_median: {
    name: "Median / Weighted-Median CPI (YoY)",
    desc: 'A central-bank "underlying inflation" gauge that strips out outliers (Bank of Canada CPI-median, RBA weighted median) \u2014 what policymakers actually react to.',
    freq: "Monthly",
    patterns: [],
    scale: 0.15,
    range: [-15, 60]
  },
  cpi_common: {
    name: "Common CPI (YoY)",
    desc: "Bank of Canada\u2019s CPI-common: the component of price changes shared across the whole basket \u2014 the cleanest read on broad inflation pressure.",
    freq: "Monthly",
    patterns: [],
    scale: 0.15,
    range: [-15, 60]
  },
  services_infl: {
    name: "Services Inflation (YoY)",
    desc: "Services prices are wage-driven and sticky; the Bank of England has named this as a key gauge of persistent inflation.",
    freq: "Monthly",
    patterns: [],
    scale: 0.2,
    range: [-5, 30]
  },
  infl_expect_ctry: {
    name: "Inflation Expectations",
    desc: "Surveyed inflation expectations \u2014 central banks fear de-anchoring, so rising expectations keep policy hawkish.",
    freq: "Quarterly",
    patterns: [],
    scale: 0.15,
    range: [-5, 40]
  },
  productivity: {
    name: "Labour Productivity",
    desc: "Output per worker: weak productivity raises unit labour costs and inflation pressure; strong productivity supports growth without inflation.",
    freq: "Quarterly",
    patterns: [],
    scale: 0.5,
    range: [-20, 20]
  },
  capacity_util: {
    name: "Capacity Utilization",
    desc: "Share of industrial capacity in use \u2014 high utilization signals tight supply and inflation pressure, low signals slack.",
    freq: "Monthly",
    patterns: [],
    scale: 0.5,
    range: [30, 100]
  },
  house_prices: {
    name: "House Prices (MoM)",
    desc: "Housing is the most rate-sensitive asset and drives household wealth and spending.",
    freq: "Monthly",
    patterns: [],
    scale: 0.3,
    range: [-10, 10]
  },
  permits_chg: {
    name: "Building Permits / Approvals (change)",
    desc: "Approvals lead construction by 6\u201312 months and respond fast to interest rates.",
    freq: "Monthly",
    patterns: [],
    scale: 4,
    range: [-60, 100]
  },
  credit_growth: {
    name: "Private Sector Credit (YoY)",
    desc: "Credit growth fuels spending and asset prices; central banks watch it for overheating.",
    freq: "Monthly",
    patterns: [],
    scale: 0.3,
    range: [-15, 40]
  },
  current_account: {
    name: "Current Account",
    desc: "The broadest measure of a country\u2019s external balance; surpluses create structural demand for the currency, deficits must be financed by inflows.",
    freq: "Quarterly",
    patterns: [{ re: /^current account$/ }, { re: /^current account s\.?a$/ }],
    exclude: /annual|goods|to gdp|ytd/i,
    scale: 0.25,
    scaleMode: "relative"
  },
  investor_conf: {
    name: "Investor Confidence (Sentix)",
    desc: "Monthly survey of euro-area investors \u2014 an early, market-based read on growth expectations.",
    freq: "Monthly",
    patterns: [],
    scale: 4,
    range: [-100, 100]
  },
  ec_industry: {
    name: "Industry Sentiment (EC survey)",
    desc: "European Commission survey of manufacturers \u2014 the free official counterpart to the licensed manufacturing PMI.",
    freq: "Monthly",
    patterns: [],
    scale: 1.5,
    range: [-100, 100]
  },
  ec_services: {
    name: "Services Sentiment (EC survey)",
    desc: "European Commission survey of service firms \u2014 the free official counterpart to the licensed services PMI.",
    freq: "Monthly",
    patterns: [],
    scale: 1.5,
    range: [-100, 100]
  }
};
var COUNTRY_PATTERNS = {
  US: {
    mfg_pmi: [{ re: /^ism manufacturing pmi$/ }, { re: /^s&p global manufacturing pmi$/ }],
    services_pmi: [{ re: /^ism services pmi$/ }, { re: /^ism non-manufacturing pmi$/ }, { re: /^s&p global services pmi$/ }],
    policy_rate: [{ re: /^interest rate$/ }, { re: /^fed interest rate decision$/ }, { re: /^interest rate decision$/ }],
    consumer_conf: [{ re: /^michigan consumer sentiment$/ }, { re: /^cb consumer confidence$/ }],
    business_conf: [{ re: /^nfib business optimism index$/ }],
    productivity: [{ re: /^nonfarm productivity qoq$/ }],
    capacity_util: [{ re: /^capacity utilization$/ }],
    house_prices: [{ re: /^house price index mom$/ }]
  },
  EU: {
    investor_conf: [{ re: /^sentix investor confidence$/ }],
    ec_industry: [{ re: /^industrial sentiment$/ }],
    ec_services: [{ re: /^services sentiment$/ }],
    infl_expect_ctry: [{ re: /^consumer inflation expectations$/, scale: 1.5 }],
    activity_survey: [{ re: /^economic sentiment$/, scale: 1.2 }],
    policy_rate: [{ re: /^deposit facility rate$/ }, { re: /^ecb interest rate decision$/ }, { re: /^interest rate decision$/ }],
    mfg_pmi: [{ re: /^hcob manufacturing pmi$/ }, { re: /manufacturing pmi$/ }],
    services_pmi: [{ re: /^hcob services pmi$/ }, { re: /services pmi$/ }]
  },
  DE: {
    business_conf: [{ re: /^ifo business climate$/ }, { re: /^zew economic sentiment index$/, scale: 6 }]
  },
  GB: {
    services_infl: [{ re: /^services inflation yoy$/ }],
    productivity: [{ re: /^labour productivity qoq$/ }],
    house_prices: [{ re: /^nationwide housing prices mom$/ }],
    activity_survey: [{ re: /^cbi distributive trades$/, scale: 8 }, { re: /^cbi business optimism index$/, scale: 6 }],
    mfg_pmi: [{ re: /^s&p global manufacturing pmi$/ }, { re: /manufacturing pmi$/ }],
    services_pmi: [{ re: /^s&p global services pmi$/ }, { re: /services pmi$/ }],
    consumer_conf: [{ re: /^consumer confidence index$/ }, { re: /^gfk consumer confidence$/ }],
    business_conf: [{ re: /^cbi industrial trends orders$/, scale: 6 }],
    employment_change: [{ re: /^employment change$/, scale: 60 }]
  },
  AU: {
    cpi_median: [{ re: /^rba weighted median cpi yoy$/ }],
    credit_growth: [{ re: /^private sector credit yoy$/ }],
    permits_chg: [{ re: /^building approvals yoy$/, scale: 6 }],
    activity_survey: [{ re: /^nab business conditions$/, scale: 3 }],
    consumer_conf: [{ re: /^consumer confidence mom$/, scale: 3 }, { re: /^westpac consumer confidence index$/, scale: 3 }]
  },
  CA: {
    cpi_median: [{ re: /^cpi median yoy$/ }],
    cpi_common: [{ re: /^cpi common yoy$/ }],
    productivity: [{ re: /^labou?r productivity qoq$/ }],
    capacity_util: [{ re: /^capacity utilization$/ }],
    house_prices: [{ re: /^new housing price index mom$/ }],
    permits_chg: [{ re: /^building permits mom$/ }],
    consumer_conf: [{ re: /^consumer confidence index$/, scale: 1.5 }],
    industrial_production: [{ re: /^manufacturing sales mom$/, scale: 0.8 }],
    business_conf: [{ re: /^ivey pmi( s\.?a)?$/, scale: 3 }]
  },
  JP: {
    activity_survey: [{ re: /^tankan large non-manufacturing index$/, scale: 3 }, { re: /^reuters tankan index$/, scale: 4 }],
    business_conf: [{ re: /^tankan large manufacturers index$/, scale: 3 }]
  },
  NZ: {
    infl_expect_ctry: [{ re: /^rbnz inflation expectations 1 year$/ }],
    permits_chg: [{ re: /^building permits mom$/, scale: 6 }],
    activity_survey: [{ re: /^nzier business confidence$/, scale: 10 }],
    mfg_pmi: [{ re: /^business nz pmi$/ }, { re: /manufacturing pmi$/ }],
    services_pmi: [{ re: /^services nz psi$/ }, { re: /^business nz services index$/ }, { re: /^performance of services index$/ }, { re: /services pmi$/ }],
    retail_sales: [{ re: /^electronic retail card spending mom$/, scale: 0.7 }, { re: /^retail sales qoq$/, scale: 0.6 }],
    industrial_production: [{ re: /^manufacturing sales qoq$/, scale: 1.2 }]
  },
  CH: {
    activity_survey: [{ re: /^economic sentiment index$/, scale: 8 }]
  },
  CN: {
    mfg_pmi: [{ re: /^nbs manufacturing pmi$/ }, { re: /manufacturing pmi$/ }]
  }
};
var INFLATION_TARGET = {
  US: 2,
  EU: 2,
  GB: 2,
  JP: 2,
  CA: 2,
  AU: 2.5,
  NZ: 2,
  CH: 1,
  CN: 2,
  DE: 2
};
var GDP_ANCHOR = {
  US: { neutral: 2, scale: 1.5, surprise: 0.5 },
  JP: { neutral: 0.1, scale: 0.4, surprise: 0.3 },
  EU: { neutral: 0.3, scale: 0.3, surprise: 0.15 },
  GB: { neutral: 0.3, scale: 0.3, surprise: 0.15 },
  CA: { neutral: 0.4, scale: 0.4, surprise: 0.2 },
  AU: { neutral: 0.5, scale: 0.4, surprise: 0.2 },
  NZ: { neutral: 0.5, scale: 0.5, surprise: 0.25 },
  CH: { neutral: 0.3, scale: 0.4, surprise: 0.2 },
  CN: { neutral: 1.2, scale: 0.4, surprise: 0.2 }
};
var EMPLOYMENT_SCALE = { CA: 20, AU: 20, GB: 60, NZ: 0.3, EU: 0.15 };
var CENTRAL_BANK = {
  USD: "Federal Reserve",
  EUR: "ECB",
  GBP: "Bank of England",
  JPY: "Bank of Japan",
  CHF: "Swiss National Bank",
  CAD: "Bank of Canada",
  AUD: "Reserve Bank of Australia",
  NZD: "Reserve Bank of New Zealand"
};
var CURRENCY_COUNTRY = {
  USD: "US",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  CHF: "CH",
  CAD: "CA",
  AUD: "AU",
  NZD: "NZ"
};
var FREQ_DAYS = { Weekly: 7, Monthly: 31, Quarterly: 92, "Per meeting": 60 };

// server/macro/scoring.ts
var METHODOLOGY_VERSION = "PPFA-1.0";
var squash = (z) => Math.tanh(0.8 * z);
var clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
var round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
function biasFromScore(score) {
  if (score === null) return "NEUTRAL";
  if (score >= 60) return "STRONG_BULLISH";
  if (score >= 30) return "BULLISH";
  if (score >= 10) return "MILD_BULLISH";
  if (score > -10) return "NEUTRAL";
  if (score > -30) return "MILD_BEARISH";
  if (score > -60) return "BEARISH";
  return "STRONG_BEARISH";
}
function biasLabel(b) {
  return b.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
function freshnessFactor(ageDays, intervalDays) {
  const full = 1.5 * intervalDays;
  if (ageDays <= full) return 1;
  const end = 4.5 * intervalDays;
  if (ageDays >= end) return 0.25;
  return 1 - 0.75 * ((ageDays - full) / (end - full));
}
function fmt(v, unit = "") {
  if (v === null || v === void 0 || !Number.isFinite(v)) return "\u2014";
  const abs = Math.abs(v);
  const s = abs >= 1e3 ? v.toLocaleString("en-US", { maximumFractionDigits: 1 }) : String(round(v, abs < 1 ? 3 : 2));
  return unit === "%" ? `${s}%` : unit ? `${s}${unit.length <= 2 ? unit : " " + unit}` : s;
}
function patternsFor(concept, country) {
  return COUNTRY_PATTERNS[country]?.[concept] || CONCEPTS[concept]?.patterns || [];
}
function eventMatches(e, pattern, def) {
  const ok = (k) => !!k && pattern.re.test(k) && !(def.exclude && def.exclude.test(k));
  return ok(e.key) || ok(e.indicatorKey || "");
}
function findLatest(events, concept, country, now) {
  const def = CONCEPTS[concept];
  if (!def) return null;
  for (const pattern of patternsFor(concept, country)) {
    let best = null;
    for (const e of events) {
      if (e.country !== country || e.actual === null || e.timestamp > now + 6e4) continue;
      if (!eventMatches(e, pattern, def)) continue;
      if (!best || e.timestamp > best.timestamp) best = e;
    }
    if (best) return { event: best, pattern };
  }
  return null;
}
function effectiveScale(def, spec, m) {
  let s = spec.scale ?? m.pattern.scale ?? def.scale;
  const e = m.event;
  if (def.scaleMode === "relative") {
    const ref = Math.abs(e.previous ?? e.actual ?? 0);
    return Math.max(ref * s, 1e-6);
  }
  if (def.scaleMode === "auto_k") {
    const mags = [e.actual, e.forecast, e.previous].filter((v) => v !== null).map(Math.abs).sort((a, b) => a - b);
    const med = mags.length ? mags[Math.floor(mags.length / 2)] : 0;
    if (med > 5e3 && s < 1e3) s *= 1e3;
    if (med > 5e6 && s < 1e6) s *= 1e3;
  }
  return s;
}
function scoreCalendar(spec, ctx) {
  const def = CONCEPTS[spec.concept];
  const name = spec.name || def.name;
  const desc = spec.desc || def.desc;
  const base = {
    id: spec.id,
    name,
    description: desc,
    frequency: def.freq,
    weight: spec.weight,
    effectiveWeight: 0,
    score: null,
    status: "missing",
    observation: null,
    components: [],
    reasoning: `No released ${name} print found for ${spec.country} in the last 400 days of the TradingView calendar. Excluded from the score.`,
    polarityNote: spec.polarityNote
  };
  const m = findLatest(ctx.events, spec.concept, spec.country, ctx.now);
  if (!m) return base;
  const e = m.event;
  const A = e.actual;
  const rangeFactor = def.scaleMode === "auto_k" && effectiveScale(def, spec, m) >= 1e3 * (spec.scale ?? m.pattern.scale ?? def.scale) ? 1e3 : 1;
  if (def.range && (A / rangeFactor < def.range[0] || A / rangeFactor > def.range[1])) {
    return { ...base, reasoning: `Rejected implausible print ${A} for ${name} (outside ${def.range.join("\u2026")}). Excluded until a valid value arrives.` };
  }
  const scale = effectiveScale(def, spec, m);
  const comps = [];
  const use = spec.use || ["surprise", "momentum", "level"];
  const isRate = def.mode === "rate";
  if (use.includes("surprise") && e.forecast !== null) {
    const z = (A - e.forecast) / (isRate ? 0.1 : scale);
    comps.push({
      key: "surprise",
      label: "Surprise vs forecast",
      value: squash(z),
      weight: isRate ? 0.35 : 0.45,
      detail: `${fmt(A, e.unit)} vs forecast ${fmt(e.forecast, e.unit)} (${A - e.forecast >= 0 ? "+" : ""}${fmt(A - e.forecast)})`
    });
  }
  if (use.includes("momentum") && e.previous !== null) {
    const z = (A - e.previous) / (isRate ? 0.25 : scale);
    comps.push({
      key: "momentum",
      label: isRate ? "Rate change" : "Change vs previous",
      value: squash(z),
      weight: isRate ? 0.65 : 0.3,
      detail: `${fmt(A, e.unit)} vs previous ${fmt(e.previous, e.unit)} (${A - e.previous >= 0 ? "+" : ""}${fmt(A - e.previous)})`
    });
  }
  const level = spec.level === null ? void 0 : spec.level || def.level;
  if (use.includes("level") && level && !isRate) {
    const z = (A - level.neutral) / level.scale;
    comps.push({
      key: "level",
      label: "Level vs anchor",
      value: squash(z),
      weight: 0.25,
      detail: `${fmt(A, e.unit)} vs ${fmt(level.neutral, e.unit)} (${level.label})`
    });
  }
  if (!comps.length) {
    return { ...base, observation: obsFromEvent(e), reasoning: `${name} released (${fmt(A, e.unit)}) but no forecast/previous was published to compare against.` };
  }
  const wsum = comps.reduce((s, c) => s + c.weight, 0);
  const raw = comps.reduce((s, c) => s + c.value * c.weight, 0) / wsum;
  const score = round(clamp(raw * spec.polarity) * 100, 1);
  const quarterly = /^Q[1-4]\b/i.test(e.period || "");
  const interval = quarterly ? 92 : FREQ_DAYS[def.freq] ?? 31;
  const ageDays = (ctx.now - e.timestamp) / 864e5;
  const fresh = isRate ? freshnessFactor(ageDays, 75) : freshnessFactor(ageDays, interval);
  const status = ageDays <= (isRate ? 150 : interval * 2.2) ? "live" : "stale";
  return {
    ...base,
    effectiveWeight: spec.weight * fresh,
    score,
    status,
    observation: obsFromEvent(e),
    components: comps,
    reasoning: explainCalendar(name, spec, comps, score, e, ageDays, fresh)
  };
}
function obsFromEvent(e) {
  return {
    actual: e.actual,
    forecast: e.forecast,
    previous: e.previous,
    releasedAt: e.iso,
    period: e.period || void 0,
    unit: [e.scale, e.unit].filter(Boolean).join(""),
    sourceTitle: e.title,
    sourceName: e.source && e.source !== "TradingView" ? `${e.source} via TradingView` : "TradingView Economic Calendar",
    sourceUrl: e.sourceUrl
  };
}
function explainCalendar(name, spec, comps, score, e, ageDays, fresh) {
  const parts = [];
  const s = comps.find((c) => c.key === "surprise");
  const m = comps.find((c) => c.key === "momentum");
  const l = comps.find((c) => c.key === "level");
  parts.push(`${e.title}${e.period ? ` (${e.period})` : ""} printed ${fmt(e.actual, e.unit)}.`);
  if (s) parts.push(`${e.actual > e.forecast ? "Above" : e.actual < e.forecast ? "Below" : "In line with"} forecast ${fmt(e.forecast, e.unit)}.`);
  if (m) parts.push(`${e.actual > e.previous ? "Up" : e.actual < e.previous ? "Down" : "Unchanged"} from ${fmt(e.previous, e.unit)}.`);
  if (l) parts.push(`Level check: ${l.detail}.`);
  parts.push(`${spec.polarityNote} \u2192 sub-score ${score > 0 ? "+" : ""}${score}.`);
  if (fresh < 1) parts.push(`Released ${Math.round(ageDays)} days ago, so its weight is reduced to ${Math.round(fresh * 100)}%.`);
  return parts.join(" ");
}
function scoreCustom(spec, ctx) {
  const base = {
    id: spec.id,
    name: spec.name,
    description: spec.desc,
    frequency: spec.freq,
    weight: spec.weight,
    effectiveWeight: 0,
    score: null,
    status: "missing",
    observation: null,
    components: [],
    reasoning: `${spec.name}: source data not available right now. Excluded from the score.`,
    polarityNote: spec.polarityNote
  };
  let out = null;
  try {
    out = spec.compute(ctx);
  } catch {
    out = null;
  }
  if (!out || !out.components.length) return base;
  const wsum = out.components.reduce((s, c) => s + c.weight, 0);
  const raw = out.components.reduce((s, c) => s + clamp(c.value) * c.weight, 0) / wsum;
  const score = round(clamp(raw * spec.polarity) * 100, 1);
  const fresh = freshnessFactor(out.ageDays, out.intervalDays);
  return {
    ...base,
    effectiveWeight: spec.weight * fresh,
    score,
    status: out.ageDays <= out.intervalDays * 2.2 ? "live" : "stale",
    observation: out.observation,
    components: out.components,
    reasoning: `${out.reasoning} ${spec.polarityNote} \u2192 sub-score ${score > 0 ? "+" : ""}${score}.`
  };
}
function aggregatePillar(spec, ctx) {
  if (spec.mirror) {
    const ref = ctx.results.get(spec.mirror.asset);
    const score2 = ref?.score ?? null;
    const signed = score2 === null ? null : round(score2 * spec.mirror.sign, 1);
    return {
      id: spec.id,
      name: spec.name,
      description: spec.desc,
      weight: spec.weight,
      score: signed,
      bullishPct: signed === null ? null : round((signed + 100) / 2, 1),
      coverage: ref ? ref.confidence / 100 : 0,
      indicators: [],
      reasoning: ref ? `${ref.name} fundamental score is ${ref.score > 0 ? "+" : ""}${ref.score} (${biasLabel(ref.bias)}). ${spec.mirror.sign < 0 ? "A stronger dollar is a headwind for this USD-priced asset, so the sign is inverted" : "Applied as-is"} \u2192 ${signed > 0 ? "+" : ""}${signed}.` : `${spec.mirror.asset} score unavailable.`
    };
  }
  const indicators = spec.indicators.map((i) => i.kind === "cal" ? scoreCalendar(i, ctx) : scoreCustom(i, ctx));
  const totalW = indicators.reduce((s, i) => s + i.weight, 0) || 1;
  const live = indicators.filter((i) => i.score !== null && i.effectiveWeight > 0);
  const effW = live.reduce((s, i) => s + i.effectiveWeight, 0);
  const score = effW > 0 ? round(live.reduce((s, i) => s + i.score * i.effectiveWeight, 0) / effW, 1) : null;
  const coverage = round(effW / totalW, 3);
  const sorted2 = [...live].sort((a, b) => Math.abs(b.score * b.effectiveWeight) - Math.abs(a.score * a.effectiveWeight));
  const lead = sorted2.slice(0, 2).map((i) => `${i.name} (${i.score > 0 ? "+" : ""}${i.score})`).join(" and ");
  const reasoning = score === null ? `No live data for this pillar yet.` : `${spec.name} scores ${score > 0 ? "+" : ""}${score} from ${live.length}/${indicators.length} indicators with data${lead ? `, led by ${lead}` : ""}.`;
  return {
    id: spec.id,
    name: spec.name,
    description: spec.desc,
    weight: spec.weight,
    score,
    bullishPct: score === null ? null : round((score + 100) / 2, 1),
    coverage,
    indicators,
    reasoning
  };
}
function scoreAsset(spec, ctx) {
  const pillars = spec.pillars.map((p) => aggregatePillar(p, ctx));
  const scored = pillars.filter((p) => p.score !== null && p.coverage > 0);
  const effW = (p) => p.weight * (0.5 + 0.5 * Math.min(1, p.coverage));
  const W = scored.reduce((s, p) => s + effW(p), 0);
  const totalPW = pillars.reduce((s, p) => s + p.weight, 0) || 1;
  const confidence = Math.round(pillars.reduce((s, p) => s + p.weight * Math.min(1, p.coverage), 0) / totalPW * 100);
  const MIN_CONFIDENCE = 25;
  const score = W > 0 && confidence >= MIN_CONFIDENCE ? round(scored.reduce((s, p) => s + p.score * effW(p), 0) / W, 1) : null;
  const drivers = [];
  for (const p of pillars) {
    if (p.indicators.length === 0 && p.score !== null) {
      drivers.push({ name: p.name, pillar: p.name, impact: round(p.score * effW(p) / (W || 1), 1) });
    }
    const pw = p.indicators.reduce((s, i) => s + i.effectiveWeight, 0) || 1;
    for (const i of p.indicators) {
      if (i.score === null) continue;
      const pillarShare = p.score !== null && W ? effW(p) / W : 0;
      drivers.push({ name: i.name, pillar: p.name, impact: round(i.score * (i.effectiveWeight / pw) * pillarShare, 1) });
    }
  }
  drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const bias = biasFromScore(score);
  const top = drivers.slice(0, 3);
  const pos = top.filter((d) => d.impact > 0).map((d) => d.name);
  const neg = top.filter((d) => d.impact < 0).map((d) => d.name);
  const summary = score === null ? `Not enough live data to score ${spec.name} yet${spec.assetClass === "STOCKS" ? " \u2014 waiting for the latest company filings (SEC EDGAR)" : ""}.` : `${spec.name} is ${biasLabel(bias)} at ${score > 0 ? "+" : ""}${score} (${round((score + 100) / 2, 0)}% bullish / ${100 - round((score + 100) / 2, 0)}% bearish), confidence ${confidence}%.` + (pos.length ? ` Supported by ${pos.join(", ")}.` : "") + (neg.length ? ` Weighed down by ${neg.join(", ")}.` : "");
  return {
    symbol: spec.symbol,
    name: spec.name,
    assetClass: spec.assetClass,
    score,
    bullishPct: score === null ? null : round((score + 100) / 2, 1),
    bearishPct: score === null ? null : round(100 - round((score + 100) / 2, 1), 1),
    bias,
    confidence,
    pillars,
    summary,
    topDrivers: drivers.slice(0, 8),
    updatedAt: new Date(ctx.now).toISOString(),
    meta: spec.meta
  };
}

// server/macro/sources/http.ts
var health = /* @__PURE__ */ new Map();
function registerSource(id, name, url, note) {
  if (!health.has(id)) {
    health.set(id, {
      id,
      name,
      url,
      status: "degraded",
      lastSuccess: null,
      lastAttempt: null,
      lastError: null,
      itemCount: 0,
      note
    });
  }
}
function setSourceNote(id, note) {
  const h = health.get(id);
  if (h) h.note = note;
}
function markSuccess(id, itemCount) {
  const h = health.get(id);
  if (!h) return;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  h.status = itemCount > 0 ? "ok" : "degraded";
  h.lastSuccess = now;
  h.lastAttempt = now;
  h.lastError = itemCount > 0 ? null : "Source responded but returned no usable rows";
  h.itemCount = itemCount;
}
function markFailure(id, error) {
  const h = health.get(id);
  if (!h) return;
  h.lastAttempt = (/* @__PURE__ */ new Date()).toISOString();
  h.lastError = error instanceof Error ? error.message : String(error);
  h.status = h.lastSuccess ? "degraded" : "down";
}
function markNotConfigured(id, note) {
  const h = health.get(id);
  if (!h) return;
  h.status = "not_configured";
  h.note = note;
}
function getSourceHealth() {
  return Array.from(health.values()).map((h) => ({ ...h }));
}
var DEFAULT_UA = "Mozilla/5.0";
async function fetchWithRetry(url, opts = {}) {
  const { timeoutMs = 12e3, retries = 2, headers = {} } = opts;
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": DEFAULT_UA, Accept: "*/*", ...headers },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.ok) return res;
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
      } else {
        throw Object.assign(new Error(`HTTP ${res.status} from ${new URL(url).host}`), { noRetry: true });
      }
    } catch (err) {
      if (err?.noRetry) throw err;
      lastErr = err;
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 600 * 2 ** attempt));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
async function fetchJson(url, opts = {}) {
  const res = await fetchWithRetry(url, { ...opts, headers: { Accept: "application/json", ...opts.headers || {} } });
  return await res.json();
}
async function fetchText(url, opts = {}) {
  const res = await fetchWithRetry(url, opts);
  return await res.text();
}
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}
function toNum(v) {
  if (v === null || v === void 0 || v === "" || v === ".") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// server/macro/sources/fred.ts
var FRED_SOURCE_ID = "fred";
registerSource(
  FRED_SOURCE_ID,
  "FRED \u2014 Federal Reserve Bank of St. Louis",
  "https://fred.stlouisfed.org/",
  "US yields, real yields, breakevens, credit spreads, Fed balance sheet, financial conditions, daily FX & index closes."
);
var FRED_SERIES = {
  DGS2: "2-Year Treasury Constant Maturity (%)",
  DGS10: "10-Year Treasury Constant Maturity (%)",
  T10Y2Y: "10Y minus 2Y Treasury spread (pp)",
  DFII10: "10-Year TIPS real yield (%)",
  T10YIE: "10-Year breakeven inflation (%)",
  T5YIFR: "5Y5Y forward inflation expectation (%)",
  VIXCLS: "CBOE VIX close",
  BAMLH0A0HYM2: "ICE BofA US High Yield OAS (pp)",
  DTWEXBGS: "Nominal Broad US Dollar Index",
  GVZCLS: "CBOE Gold ETF Volatility Index (GVZ)",
  WALCL: "Fed total assets (USD mn, weekly)",
  NFCI: "Chicago Fed National Financial Conditions Index",
  DCOILWTICO: "WTI crude spot (USD/bbl)",
  DHHNGSP: "Henry Hub natural gas spot (USD/MMBtu)",
  SP500: "S&P 500 close",
  NASDAQ100: "Nasdaq-100 close",
  DJIA: "Dow Jones Industrial Average close",
  DEXUSEU: "USD per EUR (daily noon NY)",
  DEXUSUK: "USD per GBP",
  DEXJPUS: "JPY per USD",
  DEXCAUS: "CAD per USD",
  DEXSZUS: "CHF per USD",
  DEXUSAL: "USD per AUD",
  DEXUSNZ: "USD per NZD",
  CBBTCUSD: "Coinbase Bitcoin (USD)",
  CBETHUSD: "Coinbase Ether (USD)"
};
var cache = /* @__PURE__ */ new Map();
var TTL = 2 * 60 * 60 * 1e3;
function parseFredCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const [d, v] = lines[i].split(",");
    const value = toNum(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d || "") && value !== null) out.push({ date: d, value });
  }
  return out;
}
async function fetchSeries(id, startIso) {
  const key = process.env.FRED_API_KEY;
  if (key) {
    const url2 = `https://api.stlouisfed.org/fred/series/observations?series_id=${id}&api_key=${key}&file_type=json&observation_start=${startIso}`;
    const json = await fetchJson(url2, { timeoutMs: 12e3, retries: 1 });
    return (json?.observations || []).map((o) => ({ date: String(o.date), value: toNum(o.value) })).filter((p) => p.value !== null);
  }
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}&cosd=${startIso}`;
  return parseFredCsv(await fetchText(url, { timeoutMs: 12e3, retries: 1 }));
}
var YAHOO_TWIN = {
  DGS10: { sym: "^TNX" },
  DGS2: { sym: "2YY=F" },
  VIXCLS: { sym: "^VIX" },
  GVZCLS: { sym: "^GVZ" },
  DCOILWTICO: { sym: "CL=F" },
  DHHNGSP: { sym: "NG=F" },
  SP500: { sym: "^GSPC" },
  NASDAQ100: { sym: "^NDX" },
  DJIA: { sym: "^DJI" },
  DEXUSEU: { sym: "EURUSD=X" },
  DEXUSUK: { sym: "GBPUSD=X" },
  DEXJPUS: { sym: "JPY=X" },
  DEXCAUS: { sym: "CAD=X" },
  DEXSZUS: { sym: "CHF=X" },
  DEXUSAL: { sym: "AUDUSD=X" },
  DEXUSNZ: { sym: "NZDUSD=X" },
  CBBTCUSD: { sym: "BTC-USD" },
  CBETHUSD: { sym: "ETH-USD" }
};
var fredFallbackUsed = /* @__PURE__ */ new Set();
function fredSourceOf(id) {
  if (!fredFallbackUsed.has(id)) return { title: `FRED ${id}`, name: "FRED \u2014 Federal Reserve Bank of St. Louis", url: `https://fred.stlouisfed.org/series/${id}` };
  if (id === "DFII10" || id === "T10YIE" || id === "T5YIFR") return { title: id === "DFII10" ? "US Treasury 10Y real (TIPS) par yield" : id === "T10YIE" ? "US Treasury 10Y nominal \u2212 10Y real yield" : "US Treasury 5Y5Y forward breakeven (from 5Y/10Y nominal & real par yields)", name: "U.S. Department of the Treasury", url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates" };
  if (id === "NFCI") return { title: "Chicago Fed NFCI", name: "Federal Reserve Bank of Chicago", url: "https://www.chicagofed.org/research/data/nfci/current-data" };
  if (id === "T10Y2Y") return { title: "10Y \u2212 2Y Treasury yield (market)", name: "Yahoo Finance (^TNX, 2YY=F)", url: "https://finance.yahoo.com/quote/%5ETNX/" };
  const sym = YAHOO_TWIN[id]?.sym || "";
  return { title: `${sym} daily close`, name: "Yahoo Finance", url: `https://finance.yahoo.com/quote/${encodeURIComponent(sym)}/` };
}
var curveCache = /* @__PURE__ */ new Map();
function parseTreasuryCsv(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const head = lines[0].split(",").map((h) => h.replace(/"/g, "").trim().toUpperCase());
  const out = /* @__PURE__ */ new Map();
  for (const line of lines.slice(1)) {
    const cells2 = line.split(",").map((c) => c.replace(/"/g, "").trim());
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(cells2[0] || "");
    if (!m) continue;
    const row = {};
    head.forEach((h, i) => {
      const v = toNum(cells2[i]);
      if (i && v !== null) row[h.replace(/\s+/g, "")] = v;
    });
    out.set(`${m[3]}-${m[1]}-${m[2]}`, row);
  }
  return out;
}
async function treasuryCurve(kind) {
  const hit = curveCache.get(kind);
  if (hit && Date.now() - hit.at < TTL) return hit.c;
  const y = (/* @__PURE__ */ new Date()).getUTCFullYear();
  const merged = /* @__PURE__ */ new Map();
  for (const year of [y - 1, y]) {
    const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${year}/all?type=${kind}&field_tdr_date_value=${year}&page&_format=csv`;
    try {
      for (const [d, r] of parseTreasuryCsv(await fetchText(url, { timeoutMs: 12e3, retries: 1 }))) merged.set(d, r);
    } catch {
    }
  }
  if (merged.size) curveCache.set(kind, { at: Date.now(), c: merged });
  return merged;
}
var sortPts = (m) => [...m].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
async function treasuryFallback(id) {
  if (!["DFII10", "T10YIE", "T5YIFR"].includes(id)) return [];
  const [nom, real] = await Promise.all([treasuryCurve("daily_treasury_yield_curve"), treasuryCurve("daily_treasury_real_yield_curve")]);
  const out = /* @__PURE__ */ new Map();
  for (const [d, r] of real) {
    const n = nom.get(d);
    const r10 = r["10YR"], r5 = r["5YR"];
    if (id === "DFII10" && r10 !== void 0) out.set(d, r10);
    if (!n) continue;
    const n10 = n["10YR"], n5 = n["5YR"];
    if (id === "T10YIE" && n10 !== void 0 && r10 !== void 0) out.set(d, +(n10 - r10).toFixed(2));
    if (id === "T5YIFR" && [n10, n5, r10, r5].every((v) => v !== void 0)) {
      const be10 = (n10 - r10) / 100, be5 = (n5 - r5) / 100;
      out.set(d, +((Math.pow(Math.pow(1 + be10, 10) / Math.pow(1 + be5, 5), 1 / 5) - 1) * 100).toFixed(2));
    }
  }
  return sortPts(out);
}
async function nfciFallback() {
  const csv = await fetchText("https://www.chicagofed.org/-/media/publications/nfci/nfci-data-series-csv.csv", { timeoutMs: 12e3, retries: 1 });
  const lines = csv.trim().split(/\r?\n/);
  const head = lines[0].split(",").map((h) => h.trim().toUpperCase());
  const iN = head.indexOf("NFCI");
  const out = /* @__PURE__ */ new Map();
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    const v = toNum(c[iN]);
    const raw = (c[0] || "").trim();
    let d = "";
    const us2 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
    if (us2) d = `${us2[3]}-${us2[1].padStart(2, "0")}-${us2[2].padStart(2, "0")}`;
    else if (/^\d{4}-\d{2}-\d{2}/.test(raw)) d = raw.slice(0, 10);
    if (d && v !== null) out.set(d, v);
  }
  const cutoff = new Date(Date.now() - 2 * 365 * 864e5).toISOString().slice(0, 10);
  return sortPts(out).filter((p) => p.date >= cutoff);
}
async function fetchYahooDaily(sym, years) {
  const range = years > 1.2 ? "2y" : "1y";
  const json = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=1d`, { timeoutMs: 12e3, retries: 1 });
  const r = json?.chart?.result?.[0];
  const ts = r?.timestamp || [];
  const closes = r?.indicators?.quote?.[0]?.close || [];
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    const v = closes[i];
    if (typeof v === "number" && Number.isFinite(v)) out.push({ date: new Date(ts[i] * 1e3).toISOString().slice(0, 10), value: v });
  }
  return out;
}
async function getFredSeries(id, years = 1.6) {
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL) return hit.points;
  const start = new Date(Date.now() - years * 365.25 * 864e5).toISOString().slice(0, 10);
  let points = [];
  let err = null;
  try {
    points = await fetchSeries(id, start);
  } catch (e) {
    err = e;
  }
  if (!points.length && id === "T10Y2Y") {
    const [a, b] = await Promise.all([getFredSeries("DGS10", years), getFredSeries("DGS2", years)]);
    const two = new Map(b.map((p) => [p.date, p.value]));
    points = a.filter((p) => two.has(p.date)).map((p) => ({ date: p.date, value: +(p.value - two.get(p.date)).toFixed(3) }));
    if (points.length) fredFallbackUsed.add(id);
  }
  if (!points.length && (id === "DFII10" || id === "T10YIE" || id === "T5YIFR")) {
    try {
      points = await treasuryFallback(id);
      if (points.length) fredFallbackUsed.add(id);
    } catch {
    }
  }
  if (!points.length && id === "NFCI") {
    try {
      points = await nfciFallback();
      if (points.length) fredFallbackUsed.add(id);
    } catch {
    }
  }
  const twin = YAHOO_TWIN[id];
  if (!points.length && twin) {
    points = await fetchYahooDaily(twin.sym, years);
    if (points.length) fredFallbackUsed.add(id);
  }
  if (!points.length && err) throw err;
  cache.set(id, { at: Date.now(), points });
  return points;
}
async function refreshFred(force = false) {
  if (force) cache.clear();
  const ids = Object.keys(FRED_SERIES);
  const out = {};
  let ok = 0;
  let lastErr = null;
  await mapLimit(ids, 6, async (id) => {
    try {
      out[id] = await getFredSeries(id);
      if (out[id].length) ok++;
    } catch (err) {
      lastErr = err;
      out[id] = cache.get(id)?.points || [];
    }
  });
  if (ok > 0) {
    markSuccess(FRED_SOURCE_ID, ok);
    const missing = ids.filter((id) => !(out[id] || []).length);
    const fb = [...fredFallbackUsed];
    if (fb.length || missing.length) setSourceNote(
      FRED_SOURCE_ID,
      `US yields, VIX, oil, indices & FX closes.${fb.length ? ` FRED download blocked from this server: ${fb.length} series served from the original publisher or the same instrument (US Treasury yield curves, Chicago Fed NFCI, Yahoo ^TNX/^VIX).` : ""}${missing.length ? ` Unavailable without a free FRED_API_KEY: ${missing.join(", ")}.` : ""}`
    );
  } else markFailure(FRED_SOURCE_ID, lastErr || new Error("No FRED series loaded"));
  return out;
}
function getCachedFred(id) {
  return cache.get(id)?.points || [];
}
function latest(points) {
  return points.length ? points[points.length - 1] : null;
}
function valueDaysAgo(points, days) {
  const last2 = latest(points);
  if (!last2) return null;
  const target = new Date(last2.date).getTime() - days * 864e5;
  for (let i = points.length - 1; i >= 0; i--) {
    if (new Date(points[i].date).getTime() <= target) return points[i];
  }
  return null;
}
function zScore(points, window = 252) {
  if (points.length < 30) return null;
  const slice = points.slice(-window);
  const vals = slice.map((p) => p.value);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
  if (!sd) return null;
  return (vals[vals.length - 1] - mean) / sd;
}

// server/macro/sources/prices.ts
var PRICE_SOURCE_ID = "prices";
registerSource(
  PRICE_SOURCE_ID,
  "Daily closes (Yahoo Finance \u2192 FRED fallback)",
  "https://finance.yahoo.com/",
  "Used only for correlation matrices, never for fundamental scores."
);
var PRICE_UNIVERSE = [
  { symbol: "DXY", label: "US Dollar Index", yahoo: "DX-Y.NYB", fred: void 0 },
  { symbol: "EURUSD", label: "EUR/USD", yahoo: "EURUSD=X", fred: "DEXUSEU" },
  { symbol: "GBPUSD", label: "GBP/USD", yahoo: "GBPUSD=X", fred: "DEXUSUK" },
  { symbol: "USDJPY", label: "USD/JPY", yahoo: "JPY=X", fred: "DEXJPUS" },
  { symbol: "USDCHF", label: "USD/CHF", yahoo: "CHF=X", fred: "DEXSZUS" },
  { symbol: "USDCAD", label: "USD/CAD", yahoo: "CAD=X", fred: "DEXCAUS" },
  { symbol: "AUDUSD", label: "AUD/USD", yahoo: "AUDUSD=X", fred: "DEXUSAL" },
  { symbol: "NZDUSD", label: "NZD/USD", yahoo: "NZDUSD=X", fred: "DEXUSNZ" },
  { symbol: "XAUUSD", label: "Gold", yahoo: "GC=F" },
  { symbol: "XAGUSD", label: "Silver", yahoo: "SI=F" },
  { symbol: "XPTUSD", label: "Platinum", yahoo: "PL=F" },
  { symbol: "XCUUSD", label: "Copper", yahoo: "HG=F" },
  { symbol: "IRONORE", label: "Iron Ore", yahoo: "TIO=F" },
  { symbol: "USOIL", label: "WTI Crude", yahoo: "CL=F", fred: "DCOILWTICO" },
  { symbol: "NATGAS", label: "Natural Gas", yahoo: "NG=F", fred: "DHHNGSP" },
  { symbol: "US500", label: "S&P 500", yahoo: "^GSPC", fred: "SP500" },
  { symbol: "US100", label: "Nasdaq 100", yahoo: "^NDX", fred: "NASDAQ100" },
  { symbol: "US30", label: "Dow Jones", yahoo: "^DJI", fred: "DJIA" },
  { symbol: "GER40", label: "DAX 40", yahoo: "^GDAXI" },
  { symbol: "UK100", label: "FTSE 100", yahoo: "^FTSE" },
  { symbol: "JP225", label: "Nikkei 225", yahoo: "^N225" },
  { symbol: "AUS200", label: "ASX 200", yahoo: "^AXJO" },
  { symbol: "BTCUSD", label: "Bitcoin", yahoo: "BTC-USD", fred: "CBBTCUSD" },
  { symbol: "ETHUSD", label: "Ether", yahoo: "ETH-USD", fred: "CBETHUSD" },
  { symbol: "XRPUSD", label: "XRP", yahoo: "XRP-USD" },
  { symbol: "SOLUSD", label: "Solana", yahoo: "SOL-USD" }
];
var cache2 = /* @__PURE__ */ new Map();
var TTL2 = 30 * 60 * 1e3;
function parseYahooChart(json) {
  const r = json?.chart?.result?.[0];
  const ts = r?.timestamp || [];
  const closes = r?.indicators?.adjclose?.[0]?.adjclose || r?.indicators?.quote?.[0]?.close || [];
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (typeof c !== "number" || !Number.isFinite(c) || c <= 0) continue;
    const date = new Date(ts[i] * 1e3).toISOString().slice(0, 10);
    if (seen.has(date)) {
      out[out.length - 1] = { date, value: c };
      continue;
    }
    seen.add(date);
    out.push({ date, value: c });
  }
  return out;
}
async function loadOne(spec) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(spec.yahoo)}?range=1y&interval=1d`;
    const points = parseYahooChart(await fetchJson(url, { timeoutMs: 12e3, retries: 1 }));
    if (points.length > 60) return { points, via: "Yahoo Finance" };
  } catch {
  }
  if (spec.fred) {
    const points = (await getFredSeries(spec.fred, 1.2)).filter((p) => p.value > 0);
    if (points.length > 60) return { points, via: "FRED" };
  }
  return { points: [], via: "unavailable" };
}
async function refreshPrices(force = false) {
  let ok = 0;
  await mapLimit(PRICE_UNIVERSE, 4, async (spec) => {
    const hit = cache2.get(spec.symbol);
    if (!force && hit && Date.now() - hit.at < TTL2) {
      if (hit.points.length) ok++;
      return;
    }
    try {
      const r = await loadOne(spec);
      if (r.points.length) {
        cache2.set(spec.symbol, { at: Date.now(), ...r });
        ok++;
      }
    } catch {
    }
  });
  if (ok > 0) markSuccess(PRICE_SOURCE_ID, ok);
  else markFailure(PRICE_SOURCE_ID, new Error("No price series could be loaded"));
}
function getPrices(symbol) {
  return cache2.get(symbol)?.points || [];
}
function getPriceVia(symbol) {
  return cache2.get(symbol)?.via || "unavailable";
}

// server/macro/sources/yields.ts
var YIELDS_SOURCE_ID = "gov_yields";
registerSource(
  YIELDS_SOURCE_ID,
  "Government bond yields (central banks / treasuries)",
  "https://www.bankofcanada.ca/valet/",
  "Official daily 2Y / 10Y yields: Bank of Canada, ECB, Japan MoF, RBA, SNB, Bank of England."
);
var jpyInfo = "";
var store = /* @__PURE__ */ new Map();
var origin = /* @__PURE__ */ new Map();
var lastRun = 0;
var TTL3 = 3 * 60 * 60 * 1e3;
var DAYS2 = 200;
var yieldSourceOf = (ccy) => origin.get(ccy) || "";
function getYield(ccy, tenor) {
  return store.get(`${ccy}_${tenor}`) || [];
}
var MONTHS2 = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
var sinceIso = () => new Date(Date.now() - DAYS2 * 864e5).toISOString().slice(0, 10);
var plausible = (v) => v !== null && v > -2 && v < 30;
var sorted = (m) => [...m].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
function put(ccy, tenor, m, from) {
  const pts = sorted(m);
  if (pts.length >= 10) {
    store.set(`${ccy}_${tenor}`, pts);
    origin.set(ccy, from);
  }
}
function cells(line, sep = ",") {
  const out = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}
function parseBoc(json) {
  const two = /* @__PURE__ */ new Map();
  const ten = /* @__PURE__ */ new Map();
  for (const o of json?.observations || []) {
    const d = String(o.d || "");
    const a = toNum(o["BD.CDN.2YR.DQ.YLD"]?.v);
    const b = toNum(o["BD.CDN.10YR.DQ.YLD"]?.v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      if (plausible(a)) two.set(d, a);
      if (plausible(b)) ten.set(d, b);
    }
  }
  return { two, ten };
}
async function loadCad() {
  const j = await fetchJson(`https://www.bankofcanada.ca/valet/observations/BD.CDN.2YR.DQ.YLD,BD.CDN.10YR.DQ.YLD/json?start_date=${sinceIso()}`, { timeoutMs: 15e3, retries: 1 });
  const { two, ten } = parseBoc(j);
  put("CAD", "2Y", two, "Bank of Canada Valet API");
  put("CAD", "10Y", ten, "Bank of Canada Valet API");
}
function parseEcb(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const head = cells(lines[0]);
  const iD = head.indexOf("TIME_PERIOD");
  const iV = head.indexOf("OBS_VALUE");
  const out = /* @__PURE__ */ new Map();
  if (iD < 0 || iV < 0) return out;
  for (const l of lines.slice(1)) {
    const c = cells(l);
    const v = toNum(c[iV]);
    if (/^\d{4}-\d{2}-\d{2}$/.test(c[iD] || "") && plausible(v)) out.set(c[iD], v);
  }
  return out;
}
async function loadEur() {
  for (const t of ["2Y", "10Y"]) {
    const csv = await fetchText(`https://data-api.ecb.europa.eu/service/data/YC/B.U2.EUR.4F.G_N_A.SV_C_YM.SR_${t}?startPeriod=${sinceIso()}&format=csvdata`, { timeoutMs: 15e3, retries: 1 });
    put("EUR", t, parseEcb(csv), "ECB euro-area AAA government yield curve");
  }
}
function parseMof(csv) {
  const lines = csv.split(/\r?\n/);
  const hi = lines.findIndex((l) => /^"?(date|基準日)"?\s*,/i.test(l.trim()));
  const two = /* @__PURE__ */ new Map();
  const ten = /* @__PURE__ */ new Map();
  if (hi < 0) return { two, ten };
  const head = cells(lines[hi]).map((h) => h.toUpperCase().replace("\u5E74", "Y"));
  const i2 = head.indexOf("2Y");
  const i10 = head.indexOf("10Y");
  for (const l of lines.slice(hi + 1)) {
    const c = cells(l);
    let d = "";
    const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(c[0] || "");
    const r = /^R(\d{1,2})\.(\d{1,2})\.(\d{1,2})$/i.exec(c[0] || "");
    if (m) d = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    else if (r) d = `${2018 + Number(r[1])}-${r[2].padStart(2, "0")}-${r[3].padStart(2, "0")}`;
    if (!d) continue;
    const a = toNum(c[i2]);
    const b = toNum(c[i10]);
    if (i2 >= 0 && plausible(a)) two.set(d, a);
    if (i10 >= 0 && plausible(b)) ten.set(d, b);
  }
  return { two, ten };
}
async function bytesText(url, headers) {
  const res = await fetchWithRetry(url, { timeoutMs: 25e3, retries: 1, headers });
  const buf = await res.arrayBuffer();
  try {
    return new TextDecoder("shift_jis").decode(buf);
  } catch {
    return new TextDecoder().decode(buf);
  }
}
var BROWSER_HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", Accept: "text/csv,text/plain,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" };
async function loadJpy() {
  const urls = [
    "https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/historical/jgbcm_all.csv",
    "https://www.mof.go.jp/jgbs/reference/interest_rate/historical/jgbcm_all.csv",
    "https://www.mof.go.jp/english/jgbs/reference/interest_rate/historical/jgbcm_all.csv",
    "https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcm.csv",
    "https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm.csv",
    "https://www.mof.go.jp/english/jgbs/reference/interest_rate/jgbcm.csv"
  ];
  const two = /* @__PURE__ */ new Map();
  const ten = /* @__PURE__ */ new Map();
  const errs = [];
  let got = 0;
  for (const page of ["https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/index.htm", "https://www.mof.go.jp/english/jgbs/reference/interest_rate/index.htm"]) {
    try {
      const html = await bytesText(page, BROWSER_HEADERS);
      const found = [...html.matchAll(/href="([^"]*jgbcm[^"]*\.csv)"/gi)].map((m) => new URL(m[1], page).toString());
      for (const f of found) if (!urls.includes(f)) urls.unshift(f);
      if (found.length) break;
    } catch (e) {
      errs.push(`page: ${String(e?.message || e).slice(0, 30)}`);
    }
  }
  for (const u of urls) {
    try {
      const r = parseMof(await bytesText(u, BROWSER_HEADERS));
      if (r.two.size || r.ten.size) {
        got++;
        r.two.forEach((v, k) => two.set(k, v));
        r.ten.forEach((v, k) => ten.set(k, v));
      } else errs.push(`${u.slice(-34)}: 0 rows`);
    } catch (e) {
      errs.push(`${u.slice(-28)}: ${String(e?.message || e).slice(0, 30)}`);
    }
  }
  const cut = sinceIso();
  const trim = (m) => new Map([...m].filter(([d]) => d >= cut));
  jpyInfo = `JPY: ${got} files, ${ten.size} daily rows, ${errs.length} issues (${errs.join("; ").slice(0, 160)})`;
  put("JPY", "2Y", trim(two), "Japan Ministry of Finance JGB curve");
  put("JPY", "10Y", trim(ten), "Japan Ministry of Finance JGB curve");
  if (!store.has("JPY_10Y") && !store.has("JPY_2Y")) throw new Error(`MoF: ${got} files parsed, ${two.size}/${ten.size} rows; ${errs.join("; ")}`);
}
function parseRba(csv) {
  const lines = csv.split(/\r?\n/);
  const two = /* @__PURE__ */ new Map();
  const ten = /* @__PURE__ */ new Map();
  const titleRow = lines.map((l) => cells(l)).find((c) => /^title$/i.test(c[0] || "")) || [];
  const idRow = lines.map((l) => cells(l)).find((c) => /^series id$/i.test(c[0] || "")) || [];
  const find = (re, id) => {
    for (let i = 1; i < Math.max(titleRow.length, idRow.length); i++) if (re.test(titleRow[i] || "") || id.test(idRow[i] || "")) return i;
    return -1;
  };
  const i2 = find(/\b2[- ]year\b.*government|government.*\b2[- ]year\b/i, /FCMYGBAG2(?!\d)/i);
  const i10 = find(/\b10[- ]year\b.*government|government.*\b10[- ]year\b/i, /FCMYGBAG10(?!\d)/i);
  for (const l of lines) {
    const c = cells(l);
    let d = "";
    const a = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(c[0] || "");
    const b = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(c[0] || "");
    if (a) d = `${a[3]}-${MONTHS2[a[2].toLowerCase()]}-${a[1].padStart(2, "0")}`;
    else if (b) d = `${b[3]}-${b[2].padStart(2, "0")}-${b[1].padStart(2, "0")}`;
    if (!d) continue;
    const v2 = i2 > 0 ? toNum(c[i2]) : null;
    const v10 = i10 > 0 ? toNum(c[i10]) : null;
    if (plausible(v2)) two.set(d, v2);
    if (plausible(v10)) ten.set(d, v10);
  }
  return { two, ten };
}
async function loadAud() {
  const csv = await fetchText("https://www.rba.gov.au/statistics/tables/csv/f2-data.csv", { timeoutMs: 2e4, retries: 1, headers: BROWSER_HEADERS });
  const { two, ten } = parseRba(csv);
  const cut = sinceIso();
  const trim = (m) => new Map([...m].filter(([d]) => d >= cut));
  if (!two.size && !ten.size) throw new Error(`RBA CSV parsed 0 rows (len ${csv.length}, head: ${JSON.stringify(csv.slice(0, 80))})`);
  put("AUD", "2Y", trim(two), "Reserve Bank of Australia table F2");
  put("AUD", "10Y", trim(ten), "Reserve Bank of Australia table F2");
}
function parseSnb(csv) {
  const two = /* @__PURE__ */ new Map();
  const ten = /* @__PURE__ */ new Map();
  for (const l of csv.split(/\r?\n/)) {
    const c = cells(l, ";");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c[0] || "")) continue;
    const v = toNum(c[c.length - 1]);
    if (!plausible(v)) continue;
    const k = (c[1] || "").toUpperCase();
    if (k === "2J" || k === "2Y") two.set(c[0], v);
    if (k === "10J" || k === "10Y") ten.set(c[0], v);
  }
  return { two, ten };
}
async function loadChf() {
  const csv = await fetchText(`https://data.snb.ch/api/cube/rendoblid/data/csv/en?fromDate=${sinceIso().slice(0, 7)}`, { timeoutMs: 2e4, retries: 1 });
  const { two, ten } = parseSnb(csv);
  if (!two.size && !ten.size) throw new Error(`SNB CSV parsed 0 rows (len ${csv.length}, head: ${JSON.stringify(csv.slice(0, 120))})`);
  put("CHF", "2Y", two, "Swiss National Bank data portal");
  put("CHF", "10Y", ten, "Swiss National Bank data portal");
  if (!store.has("CHF_10Y") && !store.has("CHF_2Y")) throw new Error(`SNB returned too few daily points (2Y ${two.size}, 10Y ${ten.size}; sample ${JSON.stringify(csv.split(/\r?\n/).filter((l) => /^"?\d{4}-/.test(l)).slice(0, 2))})`);
}
function parseBoe(csv) {
  const out = /* @__PURE__ */ new Map();
  for (const l of csv.split(/\r?\n/)) {
    const c = cells(l);
    const m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(c[0] || "");
    if (!m) continue;
    const v = toNum(c[1]);
    if (plausible(v)) out.set(`${m[3]}-${MONTHS2[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`, v);
  }
  return out;
}
async function loadGbp() {
  const from = new Date(Date.now() - DAYS2 * 864e5);
  const f = `${String(from.getUTCDate()).padStart(2, "0")}/${Object.keys(MONTHS2)[from.getUTCMonth()].replace(/^./, (x) => x.toUpperCase())}/${from.getUTCFullYear()}`;
  const csv = await fetchText(`https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp?csv.x=yes&Datefrom=${f}&Dateto=now&SeriesCodes=IUDMNPY&CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N`, { timeoutMs: 2e4, retries: 1 });
  put("GBP", "10Y", parseBoe(csv), "Bank of England nominal par yield (10Y)");
}
function parseStooq(csv) {
  const out = /* @__PURE__ */ new Map();
  for (const l of csv.split(/\r?\n/)) {
    const c = l.split(",");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c[0] || "")) continue;
    const v = toNum(c[4]);
    if (plausible(v) && c[0] >= sinceIso()) out.set(c[0], v);
  }
  return out;
}
async function stooqSeries(codes) {
  for (const code of codes) {
    try {
      const csv = await fetchText(`https://stooq.com/q/d/l/?s=${code}&i=d`, { timeoutMs: 15e3, retries: 1, headers: BROWSER_HEADERS });
      const m = parseStooq(csv);
      if (m.size >= 10) return m;
    } catch {
    }
  }
  return /* @__PURE__ */ new Map();
}
var STOOQ = {
  AUD: { two: ["2yaud.b", "2yauy.b"], ten: ["10yaud.b", "10yauy.b"] },
  CHF: { two: ["2ychf.b", "2ychy.b"], ten: ["10ychf.b", "10ychy.b"] },
  NZD: { two: ["2ynzd.b", "2ynzy.b"], ten: ["10ynzd.b", "10ynzy.b"] }
};
function stooqLoader(ccy, official) {
  return async () => {
    if (official) {
      try {
        await official();
        if (store.has(`${ccy}_10Y`) || store.has(`${ccy}_2Y`)) return;
      } catch {
      }
    }
    const [two, ten] = await Promise.all([stooqSeries(STOOQ[ccy].two), stooqSeries(STOOQ[ccy].ten)]);
    if (!two.size && !ten.size) throw new Error("no Stooq series reachable");
    put(ccy, "2Y", two, `Stooq daily ${ccy} 2Y government bond close`);
    put(ccy, "10Y", ten, `Stooq daily ${ccy} 10Y government bond close`);
  };
}
var LOADERS = [["CAD", loadCad], ["EUR", loadEur], ["JPY", loadJpy], ["GBP", loadGbp]];
var OPTIONAL_LOADERS = { AUD: stooqLoader("AUD", loadAud), CHF: stooqLoader("CHF", loadChf), NZD: stooqLoader("NZD") };
async function refreshYields(force = false) {
  if (!force && Date.now() - lastRun < TTL3 && store.size) return;
  lastRun = Date.now();
  const failed = [];
  await Promise.all(LOADERS.map(async ([ccy, fn]) => {
    try {
      await fn();
    } catch (e) {
      failed.push(`${ccy}: ${e?.message || e}`);
    }
  }));
  const have = new Set([...store.keys()].map((k) => k.split("_")[0]));
  const missing = LOADERS.map(([c]) => c).filter((c) => !have.has(c));
  setSourceNote(YIELDS_SOURCE_ID, `Live for ${[...have].sort().join(", ") || "none"}${missing.length ? `; unavailable right now: ${missing.join(", ")}` : ""}${failed.length ? ` [${failed.map((f) => f.slice(0, 90)).join(" | ")}]` : ""}. AUD/CHF/NZD: RBA, SNB and Stooq are not reachable from the host, so these yields are left unscored rather than estimated. ${jpyInfo}`);
  if (have.size) markSuccess(YIELDS_SOURCE_ID, store.size);
  else markFailure(YIELDS_SOURCE_ID, failed.join(" | ") || "no data");
}

// src/config/cotConfig.ts
var CFTC_API_CONFIG = {
  baseUrl: "https://publicreporting.cftc.gov/resource",
  datasetId: "6dca-aqww",
  // Socrata app token can be passed via environment variable (optional, increases rate limit)
  appToken: typeof process !== "undefined" && (process.env?.CFTC_APP_TOKEN || process.env?.SOCRATA_APP_TOKEN) || "",
  timeoutMs: 1e4,
  pageSize: 5e3
};
var COT_COLUMN_MAPPINGS = {
  marketAndExchangeNames: "market_and_exchange_names",
  contractMarketCode: "cftc_contract_market_code",
  contractMarketName: "contract_market_name",
  commodityName: "commodity_name",
  reportDate: "report_date_as_yyyy_mm_dd",
  openInterest: "open_interest_all",
  nonCommLong: "noncomm_positions_long_all",
  nonCommShort: "noncomm_positions_short_all",
  nonCommSpread: "noncomm_postions_spread_all",
  commLong: "comm_positions_long_all",
  commShort: "comm_positions_short_all",
  changeNonCommLong: "change_in_noncomm_long_all",
  changeNonCommShort: "change_in_noncomm_short_all",
  changeCommLong: "change_in_comm_long_all",
  changeCommShort: "change_in_comm_short_all",
  changeOpenInterest: "change_in_open_interest_all"
};

// src/utils/cotCalculations.ts
function parseIntegerSafe(val) {
  if (val === null || val === void 0) return null;
  if (typeof val === "number") {
    return Number.isFinite(val) ? Math.round(val) : null;
  }
  const str = String(val).trim();
  if (str === "" || str === "\u2014" || str === "-") return null;
  const cleaned = str.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const num2 = parseInt(cleaned, 10);
  return Number.isFinite(num2) ? num2 : null;
}
function extractDateString(dateVal) {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}
function parseAndValidateCotRow(row) {
  const code = String(row[COT_COLUMN_MAPPINGS.contractMarketCode] || row.cftc_contract_market_code || "").trim();
  const rawDate = row[COT_COLUMN_MAPPINGS.reportDate] || row.report_date_as_yyyy_mm_dd;
  const reportDate = extractDateString(rawDate);
  if (!code || !reportDate) {
    return { record: null, warning: "Missing market code or report date" };
  }
  const ncLong = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.nonCommLong] ?? row.noncomm_positions_long_all);
  const ncShort = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.nonCommShort] ?? row.noncomm_positions_short_all);
  const cLong = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.commLong] ?? row.comm_positions_long_all);
  const cShort = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.commShort] ?? row.comm_positions_short_all);
  const oi = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.openInterest] ?? row.open_interest_all) ?? 0;
  if (ncLong === null || ncShort === null) {
    return { record: null, warning: `Null/invalid non-commercial positions for market ${code} on ${reportDate}` };
  }
  const warnings = [];
  if (ncLong < 0) warnings.push("Non-commercial long < 0");
  if (ncShort < 0) warnings.push("Non-commercial short < 0");
  if (cLong !== null && cLong < 0) warnings.push("Commercial long < 0");
  if (cShort !== null && cShort < 0) warnings.push("Commercial short < 0");
  if (oi > 0 && (ncLong > oi || ncShort > oi)) {
    warnings.push("Position exceeds total open interest");
  }
  const marketName = String(
    row[COT_COLUMN_MAPPINGS.marketAndExchangeNames] || row.market_and_exchange_names || row[COT_COLUMN_MAPPINGS.contractMarketName] || code
  ).trim();
  const timestamp = (/* @__PURE__ */ new Date(reportDate + "T12:00:00Z")).getTime();
  return {
    record: {
      marketCode: code,
      marketName,
      reportDate,
      timestamp,
      openInterest: oi,
      nonCommLong: Math.max(0, ncLong),
      nonCommShort: Math.max(0, ncShort),
      nonCommNet: ncLong - ncShort,
      commLong: Math.max(0, cLong ?? 0),
      commShort: Math.max(0, cShort ?? 0),
      commNet: (cLong ?? 0) - (cShort ?? 0),
      dataWarning: warnings.length > 0 ? warnings.join("; ") : void 0
    },
    warning: warnings.length > 0 ? warnings.join("; ") : void 0
  };
}
function processCotHistory(rawRows) {
  const seenDates = /* @__PURE__ */ new Set();
  const parsedRows = [];
  for (const raw of rawRows) {
    const { record, warning } = parseAndValidateCotRow(raw);
    if (!record) continue;
    if (seenDates.has(record.reportDate)) {
      continue;
    }
    seenDates.add(record.reportDate);
    parsedRows.push({ ...record, rawRow: raw });
  }
  parsedRows.sort((a, b) => a.timestamp - b.timestamp);
  const results = [];
  for (let i = 0; i < parsedRows.length; i++) {
    const curr = parsedRows[i];
    const prev = i > 0 ? parsedRows[i - 1] : null;
    let hasGap = false;
    if (prev) {
      const daysDiff = (curr.timestamp - prev.timestamp) / (1e3 * 60 * 60 * 24);
      if (daysDiff > 10) {
        hasGap = true;
      }
    }
    const computedChangeNcLong = prev ? curr.nonCommLong - prev.nonCommLong : 0;
    const computedChangeNcShort = prev ? curr.nonCommShort - prev.nonCommShort : 0;
    const computedChangeNcNet = prev ? curr.nonCommNet - prev.nonCommNet : 0;
    const computedChangeCommLong = prev ? curr.commLong - prev.commLong : 0;
    const computedChangeCommShort = prev ? curr.commShort - prev.commShort : 0;
    const computedChangeCommNet = prev ? curr.commNet - prev.commNet : 0;
    const computedChangeOi = prev ? curr.openInterest - prev.openInterest : 0;
    const reportedChangeNcLong = parseIntegerSafe(curr.rawRow[COT_COLUMN_MAPPINGS.changeNonCommLong]);
    const reportedChangeNcShort = parseIntegerSafe(curr.rawRow[COT_COLUMN_MAPPINGS.changeNonCommShort]);
    let hasDiscrepancy = false;
    let discrepancyDetails;
    if (prev && reportedChangeNcLong !== null && reportedChangeNcLong !== computedChangeNcLong) {
      hasDiscrepancy = true;
      discrepancyDetails = `CFTC reported \u0394Long ${reportedChangeNcLong} vs computed ${computedChangeNcLong}. Using verified consecutive computed value.`;
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[COT Discrepancy] ${curr.marketCode} on ${curr.reportDate}: ${discrepancyDetails}`);
      }
    }
    results.push({
      marketCode: curr.marketCode,
      marketName: curr.marketName,
      reportDate: curr.reportDate,
      timestamp: curr.timestamp,
      openInterest: curr.openInterest,
      nonCommLong: curr.nonCommLong,
      nonCommShort: curr.nonCommShort,
      nonCommNet: curr.nonCommNet,
      commLong: curr.commLong,
      commShort: curr.commShort,
      commNet: curr.commNet,
      changeNonCommLong: computedChangeNcLong,
      changeNonCommShort: computedChangeNcShort,
      changeNonCommNet: computedChangeNcNet,
      changeCommLong: computedChangeCommLong,
      changeCommShort: computedChangeCommShort,
      changeCommNet: computedChangeCommNet,
      changeOpenInterest: computedChangeOi,
      hasDiscrepancy,
      discrepancyDetails,
      hasGap,
      dataWarning: curr.dataWarning
    });
  }
  return results;
}

// server/macro/sources/cot.ts
var COT_SOURCE_ID = "cftc_cot";
registerSource(
  COT_SOURCE_ID,
  "CFTC Commitments of Traders",
  "https://publicreporting.cftc.gov/",
  "Institutional positioning (speculators, hedgers, small traders). As of Tuesday, released Friday 15:30 ET."
);
var COT_CODES = {
  EUR: { code: "099741", name: "Euro FX (CME)" },
  GBP: { code: "096742", name: "British Pound (CME)" },
  JPY: { code: "097741", name: "Japanese Yen (CME)" },
  CHF: { code: "092741", name: "Swiss Franc (CME)" },
  CAD: { code: "090741", name: "Canadian Dollar (CME)" },
  AUD: { code: "232741", name: "Australian Dollar (CME)" },
  NZD: { code: "112741", name: "New Zealand Dollar (CME)" },
  USD: { code: "098662", name: "U.S. Dollar Index (ICE)" },
  XAU: { code: "088691", name: "Gold (COMEX)" },
  XAG: { code: "084691", name: "Silver (COMEX)" },
  XCU: { code: "085692", name: "Copper (COMEX)" },
  XPT: { code: "076651", name: "Platinum (NYMEX)" },
  XPD: { code: "075651", name: "Palladium (NYMEX)" },
  WTI: { code: "067651", name: "Crude Oil WTI (NYMEX)" },
  NATGAS: { code: "023651", name: "Natural Gas (NYMEX)" },
  US500: { code: "13874A", name: "E-mini S&P 500 (CME)" },
  US100: { code: "209742", name: "Nasdaq-100 Mini (CME)" },
  US30: { code: "124603", name: "Dow Jones $5 Mini (CBOT)" },
  JP225: { code: "240743", name: "Nikkei Stock Average Yen (CME)" },
  BTC: { code: "133741", name: "Bitcoin (CME)" },
  ETH: { code: "146021", name: "Ether Cash Settled (CME)" },
  XRP: { code: "176740", name: "XRP (CME)" }
};
var signals = /* @__PURE__ */ new Map();
var positions = /* @__PURE__ */ new Map();
var lastLoad = 0;
var TTL4 = 3 * 60 * 60 * 1e3;
var round2 = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
function cotIndex(values, window) {
  const w = values.slice(-window);
  if (w.length < Math.min(window, 8)) return null;
  const min = Math.min(...w), max = Math.max(...w);
  return max > min ? round2((w[w.length - 1] - min) / (max - min) * 100) : null;
}
function zScore2(values, window) {
  const w = values.slice(-window);
  if (w.length < 12) return null;
  const mean = w.reduce((a, b) => a + b, 0) / w.length;
  const sd = Math.sqrt(w.reduce((a, b) => a + (b - mean) ** 2, 0) / w.length);
  return sd ? round2((w[w.length - 1] - mean) / sd, 2) : null;
}
function group(records, key) {
  const latest2 = records[records.length - 1];
  const long = key === "nonComm" ? latest2.nonCommLong : latest2.commLong;
  const short = key === "nonComm" ? latest2.nonCommShort : latest2.commShort;
  const nets = records.map((r) => key === "nonComm" ? r.nonCommNet : r.commNet);
  const net = nets[nets.length - 1];
  const fourAgo = nets.length > 4 ? nets[nets.length - 5] : null;
  return {
    long,
    short,
    net,
    netChange: key === "nonComm" ? latest2.changeNonCommNet : latest2.changeCommNet,
    longChange: key === "nonComm" ? latest2.changeNonCommLong : latest2.changeCommLong,
    shortChange: key === "nonComm" ? latest2.changeNonCommShort : latest2.changeCommShort,
    longPct: long + short > 0 ? round2(long / (long + short) * 100) : 0,
    netPctOi: latest2.openInterest ? round2(net / latest2.openInterest * 100) : 0,
    cotIndex26w: cotIndex(nets, 26),
    cotIndex52w: cotIndex(nets, 52),
    cotIndex3y: cotIndex(nets, 156),
    netChange4w: fourAgo === null ? null : net - fourAgo,
    zScore52w: zScore2(nets, 52)
  };
}
function releaseAfter(reportDate) {
  const d = /* @__PURE__ */ new Date(reportDate + "T00:00:00Z");
  const fri = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7 || 7)));
  const y = fri.getUTCFullYear();
  const dstStart = Date.UTC(y, 2, 8 + (7 - new Date(Date.UTC(y, 2, 8)).getUTCDay()) % 7, 7);
  const dstEnd = Date.UTC(y, 10, 1 + (7 - new Date(Date.UTC(y, 10, 1)).getUTCDay()) % 7, 6);
  const edt = fri.getTime() >= dstStart && fri.getTime() < dstEnd;
  return new Date(fri.getTime() + (edt ? 19.5 : 20.5) * 36e5);
}
function computeCotSignal(asset, market, records) {
  if (records.length < 2) return null;
  const latest2 = records[records.length - 1];
  const idx = cotIndex(records.map((r) => r.nonCommNet), 52);
  const oi = latest2.openInterest || 1;
  const chgPctOi = latest2.changeNonCommNet / oi;
  const idxPart = idx === null ? 0 : (idx - 50) / 50;
  const value = Math.max(-1, Math.min(1, 0.6 * idxPart + 0.4 * Math.tanh(chgPctOi / 0.02)));
  return {
    asset,
    market,
    reportDate: latest2.reportDate,
    net: latest2.nonCommNet,
    netChange: latest2.changeNonCommNet,
    openInterest: latest2.openInterest,
    cotIndex52w: idx,
    value,
    history: records.length
  };
}
function computeInstitutional(asset, def, records, raw) {
  if (records.length < 2) return null;
  const latest2 = records[records.length - 1];
  const spec = group(records, "nonComm");
  const comm = group(records, "comm");
  const latestRaw = raw.find((r) => String(r.report_date_as_yyyy_mm_dd || "").slice(0, 10) === latest2.reportDate) || null;
  const sl = Number(latestRaw?.nonrept_positions_long_all), ss = Number(latestRaw?.nonrept_positions_short_all);
  const smallTraders = Number.isFinite(sl) && Number.isFinite(ss) ? { long: sl, short: ss, net: sl - ss, longPct: sl + ss > 0 ? round2(sl / (sl + ss) * 100) : 0 } : null;
  const released = releaseAfter(latest2.reportDate);
  let next = releaseAfter(new Date((/* @__PURE__ */ new Date(latest2.reportDate + "T00:00:00Z")).getTime() + 7 * 864e5).toISOString().slice(0, 10));
  if (next.getTime() < Date.now()) next = releaseAfter(new Date(Date.now()).toISOString().slice(0, 10));
  const extremes = [];
  if (spec.cotIndex52w !== null && spec.cotIndex52w >= 90) extremes.push("Speculators near a 52-week net-long extreme (crowded long)");
  if (spec.cotIndex52w !== null && spec.cotIndex52w <= 10) extremes.push("Speculators near a 52-week net-short extreme (crowded short)");
  if (comm.cotIndex52w !== null && comm.cotIndex52w >= 90) extremes.push("Commercial hedgers at a 52-week net-long extreme (historically supportive)");
  if (comm.cotIndex52w !== null && comm.cotIndex52w <= 10) extremes.push("Commercial hedgers at a 52-week net-short extreme");
  if (spec.zScore52w !== null && Math.abs(spec.zScore52w) >= 2) extremes.push(`Speculative net position ${spec.zScore52w > 0 ? "+" : ""}${spec.zScore52w}\u03C3 from its 1-year mean`);
  const dir = spec.net >= 0 ? "net long" : "net short";
  const flow = spec.netChange > 0 ? "added to longs / cut shorts" : spec.netChange < 0 ? "cut longs / added shorts" : "were unchanged";
  const oiChange = latest2.changeOpenInterest;
  const oiPrev = latest2.openInterest - oiChange;
  const interpretation = `Large speculators are ${dir} ${Math.abs(spec.net).toLocaleString()} contracts (${spec.longPct}% of their positions long, ${spec.netPctOi}% of open interest) and ${flow} by ${Math.abs(spec.netChange).toLocaleString()} this week. COT Index ${spec.cotIndex52w ?? "\u2014"}/100 over 52 weeks${spec.cotIndex3y !== null ? `, ${spec.cotIndex3y}/100 over 3 years` : ""}. Commercial hedgers are ${comm.net >= 0 ? "net long" : "net short"} ${Math.abs(comm.net).toLocaleString()} \u2014 they usually take the other side of speculators. Open interest ${oiChange >= 0 ? "rose" : "fell"} ${Math.abs(oiChange).toLocaleString()} (${oiPrev ? round2(oiChange / oiPrev * 100) : 0}%)` + (oiChange > 0 && spec.netChange > 0 ? ": new money is entering on the long side." : oiChange > 0 && spec.netChange < 0 ? ": new money is entering on the short side." : oiChange < 0 ? ": positions are being closed (trend may be losing participation)." : ".");
  return {
    asset,
    market: def.name,
    code: def.code,
    reportDate: latest2.reportDate,
    releasedAt: released.toISOString(),
    nextReleaseAt: next.toISOString(),
    openInterest: latest2.openInterest,
    openInterestChange: oiChange,
    openInterestChangePct: oiPrev ? round2(oiChange / oiPrev * 100, 2) : 0,
    speculators: spec,
    commercials: comm,
    smallTraders,
    extremes,
    interpretation,
    history: records.slice(-52).map((r) => ({ date: r.reportDate, specNet: r.nonCommNet, commNet: r.commNet, oi: r.openInterest })),
    weeks: records.length,
    sourceUrl: `https://publicreporting.cftc.gov/resource/${CFTC_API_CONFIG.datasetId}.json?cftc_contract_market_code=${def.code}`
  };
}
var SELECT = [.../* @__PURE__ */ new Set([...Object.values(COT_COLUMN_MAPPINGS), "nonrept_positions_long_all", "nonrept_positions_short_all"])].join(",");
async function refreshCot(force = false) {
  if (!force && signals.size && Date.now() - lastLoad < TTL4) return;
  try {
    const since = new Date(Date.now() - 3.3 * 365 * 864e5).toISOString().slice(0, 10);
    const token = process.env.CFTC_APP_TOKEN || process.env.SOCRATA_APP_TOKEN;
    const all = [...new Set(Object.values(COT_CODES).map((c) => c.code))];
    const groups = [];
    for (let i = 0; i < all.length; i += 4) groups.push(all.slice(i, i + 4));
    const parts = await Promise.allSettled(groups.map((g) => {
      const where = `${COT_COLUMN_MAPPINGS.contractMarketCode} in (${g.map((c) => `'${c}'`).join(",")}) AND ${COT_COLUMN_MAPPINGS.reportDate} >= '${since}'`;
      const url = `${CFTC_API_CONFIG.baseUrl}/${CFTC_API_CONFIG.datasetId}.json?$select=${encodeURIComponent(SELECT)}&$where=${encodeURIComponent(where)}&$order=${COT_COLUMN_MAPPINGS.reportDate}%20DESC&$limit=2000`;
      return fetchJson(url, { timeoutMs: 15e3, retries: 1, headers: token ? { "X-App-Token": token } : {} });
    }));
    const rows = parts.flatMap((p) => p.status === "fulfilled" && Array.isArray(p.value) ? p.value : []);
    if (!rows.length) throw parts.find((p) => p.status === "rejected")?.reason || new Error("CFTC returned no rows");
    const byCode = /* @__PURE__ */ new Map();
    for (const r of rows) {
      const c = String(r.cftc_contract_market_code || "").trim();
      if (!byCode.has(c)) byCode.set(c, []);
      byCode.get(c).push(r);
    }
    const nextSig = /* @__PURE__ */ new Map();
    const nextPos = /* @__PURE__ */ new Map();
    for (const [asset, def] of Object.entries(COT_CODES)) {
      const raw = byCode.get(def.code) || [];
      const recs = processCotHistory(raw);
      const sig = computeCotSignal(asset, def.name, recs);
      if (sig) nextSig.set(asset, sig);
      const pos = computeInstitutional(asset, def, recs, raw);
      if (pos) nextPos.set(asset, pos);
    }
    if (nextSig.size) {
      signals = nextSig;
      positions = nextPos;
      lastLoad = Date.now();
    }
    markSuccess(COT_SOURCE_ID, nextSig.size);
  } catch (err) {
    markFailure(COT_SOURCE_ID, err);
  }
}
function getCotSignal(asset) {
  return signals.get(asset) || null;
}
function getInstitutional(asset) {
  return positions.get(asset) || null;
}

// server/macro/sources/crypto.ts
var CRYPTO_DERIV_ID = "crypto_derivatives";
var FNG_ID = "crypto_fng";
var STABLE_ID = "stablecoins";
var HASH_ID = "btc_hashrate";
registerSource(CRYPTO_DERIV_ID, "Perp funding & open interest (Binance \u2192 Bybit \u2192 Hyperliquid)", "https://www.binance.com/en/futures/funding-history");
registerSource(FNG_ID, "Crypto Fear & Greed Index (alternative.me)", "https://alternative.me/crypto/fear-and-greed-index/");
registerSource(STABLE_ID, "Total stablecoin supply (DefiLlama)", "https://defillama.com/stablecoins");
registerSource(HASH_ID, "Bitcoin hash rate (blockchain.com)", "https://www.blockchain.com/explorer/charts/hash-rate");
var CRYPTO_ASSETS = ["BTC", "ETH", "XRP", "SOL", "BNB", "DOGE", "ADA", "LINK"];
var deriv = /* @__PURE__ */ new Map();
var fng = [];
var stables = [];
var hashrate = [];
var lastLoad2 = 0;
var TTL5 = 5 * 60 * 1e3;
async function binanceDeriv(sym) {
  const prem = await fetchJson(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${sym}`, { retries: 0, timeoutMs: 8e3 });
  const hist = await fetchJson(`https://fapi.binance.com/futures/data/openInterestHist?symbol=${sym}&period=1d&limit=31`, { retries: 0, timeoutMs: 8e3 });
  const vals = (hist || []).map((h) => toNum(h.sumOpenInterestValue)).filter((v) => v !== null);
  return {
    fundingRate: toNum(prem?.lastFundingRate),
    oiNow: vals.length ? vals[vals.length - 1] : null,
    oi7dAgo: vals.length > 7 ? vals[vals.length - 8] : null,
    oi30dAgo: vals.length > 30 ? vals[0] : null,
    via: "Binance Futures"
  };
}
async function bybitDeriv(sym) {
  const t = await fetchJson(`https://api.bybit.com/v5/market/tickers?category=linear&symbol=${sym}`, { retries: 0, timeoutMs: 8e3 });
  const oi = await fetchJson(`https://api.bybit.com/v5/market/open-interest?category=linear&symbol=${sym}&intervalTime=1d&limit=31`, { retries: 0, timeoutMs: 8e3 });
  const list = oi?.result?.list || [];
  const vals = list.map((r) => toNum(r.openInterest)).filter((v) => v !== null);
  return {
    fundingRate: toNum(t?.result?.list?.[0]?.fundingRate),
    oiNow: vals[0] ?? null,
    oi7dAgo: vals[7] ?? null,
    oi30dAgo: vals[30] ?? null,
    via: "Bybit"
  };
}
var hlCache = null;
async function hyperliquidAll() {
  if (hlCache && Date.now() - hlCache.at < 6e4) return hlCache.map;
  const res = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    signal: AbortSignal.timeout(8e3)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from api.hyperliquid.xyz`);
  const [meta2, ctxs] = await res.json();
  const map = /* @__PURE__ */ new Map();
  (meta2?.universe || []).forEach((u, i) => {
    const c = ctxs?.[i];
    const f = toNum(c?.funding);
    map.set(String(u?.name), { funding: f === null ? null : f * 8, oi: toNum(c?.openInterest) });
  });
  hlCache = { at: Date.now(), map };
  return map;
}
async function hyperliquidDeriv(sym) {
  const m = await hyperliquidAll();
  const x = m.get(sym.replace(/USDT$/, ""));
  if (!x) throw new Error(`${sym} not listed on Hyperliquid`);
  return { fundingRate: x.funding, oiNow: x.oi, oi7dAgo: null, oi30dAgo: null, via: "Hyperliquid" };
}
async function refreshCrypto(force = false) {
  if (!force && Date.now() - lastLoad2 < TTL5) return;
  lastLoad2 = Date.now();
  let derivOk = 0;
  let derivErr = null;
  await mapLimit([...CRYPTO_ASSETS], 3, async (asset) => {
    const sym = `${asset}USDT`;
    for (const fn of [binanceDeriv, bybitDeriv, hyperliquidDeriv]) {
      try {
        const r = await fn(sym);
        if (r.fundingRate !== null || r.oiNow !== null) {
          deriv.set(asset, { asset, ...r, at: (/* @__PURE__ */ new Date()).toISOString() });
          derivOk++;
          return;
        }
      } catch (err) {
        derivErr = err;
      }
    }
  });
  derivOk ? markSuccess(CRYPTO_DERIV_ID, derivOk) : markFailure(CRYPTO_DERIV_ID, derivErr || new Error("No derivatives data"));
  try {
    const j = await fetchJson("https://api.alternative.me/fng/?limit=60");
    const rows = j?.data || [];
    fng = rows.map((r) => ({ date: new Date(Number(r.timestamp) * 1e3).toISOString().slice(0, 10), value: toNum(r.value) })).filter((r) => r.value !== null).reverse();
    markSuccess(FNG_ID, fng.length);
  } catch (err) {
    markFailure(FNG_ID, err);
  }
  try {
    const j = await fetchJson("https://stablecoins.llama.fi/stablecoincharts/all", { timeoutMs: 2e4 });
    stables = (j || []).slice(-120).map((r) => ({ date: new Date(Number(r.date) * 1e3).toISOString().slice(0, 10), value: toNum(r?.totalCirculatingUSD?.peggedUSD) })).filter((r) => r.value !== null);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (stables.length && stables[stables.length - 1].date >= today) stables.pop();
    markSuccess(STABLE_ID, stables.length);
  } catch (err) {
    markFailure(STABLE_ID, err);
  }
  try {
    const j = await fetchJson("https://api.blockchain.info/charts/hash-rate?timespan=120days&format=json&cors=true");
    hashrate = (j?.values || []).map((v) => ({ date: new Date(Number(v.x) * 1e3).toISOString().slice(0, 10), value: toNum(v.y) })).filter((r) => r.value !== null);
    markSuccess(HASH_ID, hashrate.length);
  } catch (err) {
    markFailure(HASH_ID, err);
  }
}
var getDeriv = (asset) => deriv.get(asset) || null;
var getFng = () => fng;
var getStables = () => stables;
var getHashrate = () => hashrate;

// server/macro/sources/sentiment.ts
registerSource("fxssi", "FXSSI current ratios (9 retail brokers)", "https://fxssi.com/tools/current-ratio");
registerSource("okx-lsr", "OKX long/short account ratio", "https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio-contract");
registerSource("gate-lsr", "Gate.io contract stats (account L/S)", "https://api.gateio.ws/api/v4/futures/usdt/contract_stats");
registerSource("bitget-lsr", "Bitget account long/short", "https://api.bitget.com/api/v2/mix/market/account-long-short");
var FXSSI_MAP = {
  XAUUSD: { symbol: "XAUUSD", asset: "COMMODITIES", display: "XAU/USD" },
  XAGUSD: { symbol: "XAGUSD", asset: "COMMODITIES", display: "XAG/USD" },
  XTIUSD: { symbol: "USOIL", asset: "COMMODITIES", display: "WTI Crude / USD" },
  XBRUSD: { symbol: "UKOIL", asset: "COMMODITIES", display: "Brent Crude / USD" },
  SP500: { symbol: "US500", asset: "INDICES", display: "S&P 500" },
  NAS100: { symbol: "US100", asset: "INDICES", display: "Nasdaq 100" },
  US30: { symbol: "US30", asset: "INDICES", display: "Dow Jones 30" },
  GER40: { symbol: "GER40", asset: "INDICES", display: "DAX 40" },
  USDX: { symbol: "DXY", asset: "INDICES", display: "US Dollar Index" },
  BTCUSD: { symbol: "BTCUSD", asset: "CRYPTO", display: "BTC/USD (CFD brokers)" },
  ETHUSD: { symbol: "ETHUSD", asset: "CRYPTO", display: "ETH/USD (CFD brokers)" }
};
var BROKER_NAMES = {
  myfxbook: "MyFxBook",
  ftroanda: "OANDA",
  dukscopy: "Dukascopy",
  fxcm: "IG",
  fxblue: "FXBlue",
  xm: "XM",
  instfor: "InstaForex",
  fiboforx: "FiboGroup",
  amarkets: "AMarkets",
  fxssi: "FXSSI"
};
var G8 = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD"];
var ORDER = ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"];
var CRYPTO_COINS = ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE", "ADA", "AVAX", "LINK", "LTC", "DOT", "TRX", "TON", "SUI", "BCH", "NEAR", "APT", "ARB", "OP", "PEPE"];
var r1 = (x) => Math.round(x * 10) / 10;
function finish(row) {
  const L = Math.min(100, Math.max(0, row.longPct));
  const strength = Math.round(Math.abs(L - 50) * 2);
  return {
    ...row,
    longPct: r1(L),
    shortPct: r1(100 - L),
    crowd: L >= 55 ? "LONG" : L <= 45 ? "SHORT" : "BALANCED",
    contrarian: L >= 60 ? "BEARISH" : L <= 40 ? "BULLISH" : "NEUTRAL",
    strength
  };
}
async function loadFxssi(now) {
  const j = await fetchJson(`https://c.fxssi.com/api/current-ratios?filter=EURUSD&user_id=0&rand=${Math.random()}`, {
    timeoutMs: 9e3,
    retries: 1,
    headers: { Referer: "https://fxssi.com/tools/current-ratio", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" }
  });
  const pairs = j?.pairs || {};
  const weights = j?.pair_weights || {};
  const at = j?.formed ? new Date(j.formed * 1e3).toISOString() : now;
  const rows = [];
  for (const [sym, vals] of Object.entries(pairs)) {
    const avg = Number(vals.average);
    if (!Number.isFinite(avg)) continue;
    const sources = Object.entries(vals).filter(([k]) => k !== "average" && BROKER_NAMES[k]).map(([k, v]) => ({ name: BROKER_NAMES[k] || k, longPct: r1(Number(v)) })).filter((s) => Number.isFinite(s.longPct));
    const m = FXSSI_MAP[sym];
    const isFx = !m && /^[A-Z]{6}$/.test(sym) && G8.includes(sym.slice(0, 3)) && G8.includes(sym.slice(3));
    if (!m && !isFx) continue;
    rows.push(finish({
      symbol: m?.symbol || sym,
      display: m?.display || `${sym.slice(0, 3)}/${sym.slice(3)}`,
      asset: m?.asset || "FOREX",
      longPct: avg,
      method: "measured",
      sources,
      weight: weights[sym],
      updatedAt: at
    }));
  }
  return rows;
}
async function okx(coin) {
  const j = await fetchJson(`https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio-contract?instId=${coin}-USDT-SWAP&period=5m&limit=1`, { timeoutMs: 7e3, retries: 0 });
  const ratio = Number(j?.data?.[0]?.[1]);
  return Number.isFinite(ratio) && ratio > 0 ? ratio / (1 + ratio) * 100 : null;
}
async function gate(coin) {
  const j = await fetchJson(`https://api.gateio.ws/api/v4/futures/usdt/contract_stats?contract=${coin}_USDT&limit=1`, { timeoutMs: 7e3, retries: 0 });
  const ratio = Number(j?.[j.length - 1]?.lsr_account);
  return Number.isFinite(ratio) && ratio > 0 ? ratio / (1 + ratio) * 100 : null;
}
async function bitget(coin) {
  const j = await fetchJson(`https://api.bitget.com/api/v2/mix/market/account-long-short?symbol=${coin}USDT&period=5m`, { timeoutMs: 7e3, retries: 0 });
  const rows = j?.data || [];
  const last2 = rows.reduce((a, b) => Number(b.ts) > Number(a?.ts || 0) ? b : a, null);
  const v = Number(last2?.longAccountRatio);
  return Number.isFinite(v) && v > 0 && v < 1 ? v * 100 : null;
}
async function loadCrypto(now) {
  const stats = { okx: 0, gate: 0, bitget: 0, errors: [] };
  const rows = await mapLimit(CRYPTO_COINS, 6, async (coin) => {
    const got = await Promise.allSettled([okx(coin), gate(coin), bitget(coin)]);
    const sources = [];
    ["OKX", "Gate.io", "Bitget"].forEach((name, i) => {
      const g = got[i];
      if (g.status === "fulfilled" && g.value !== null) {
        sources.push({ name, longPct: r1(g.value) });
        stats[name === "Gate.io" ? "gate" : name.toLowerCase()]++;
      } else if (g.status === "rejected") stats.errors.push(`${name} ${coin}: ${g.reason?.message || g.reason}`);
    });
    if (!sources.length) return null;
    const avg = sources.reduce((s, x) => s + x.longPct, 0) / sources.length;
    return finish({ symbol: `${coin}USDT`, display: `${coin}/USDT`, asset: "CRYPTO", longPct: avg, method: "measured", sources, updatedAt: now });
  });
  return { rows: rows.filter((r) => !!r), stats };
}
function deriveCurrencies(fx) {
  const acc = {};
  for (const r of fx) {
    const b = r.symbol.slice(0, 3), q = r.symbol.slice(3);
    const net = (r.longPct - 50) / 50;
    const w = Math.sqrt(Math.max(1, r.weight || 1));
    for (const [c, sgn2] of [[b, 1], [q, -1]]) {
      acc[c] ||= { sum: 0, w: 0, n: 0 };
      acc[c].sum += sgn2 * net * w;
      acc[c].w += w;
      acc[c].n++;
    }
  }
  const currencies = G8.filter((c) => acc[c]).map((c) => {
    const net = acc[c].sum / acc[c].w;
    return { currency: c, net: Math.round(net * 1e3) / 1e3, longPct: r1(50 + 50 * net), pairs: acc[c].n };
  });
  return currencies;
}
function derivedCrosses(measured, currencies, now) {
  const net = Object.fromEntries(currencies.map((c) => [c.currency, c.net]));
  const out = [];
  for (let i = 0; i < ORDER.length; i++) for (let k = i + 1; k < ORDER.length; k++) {
    const b = ORDER[i], q = ORDER[k], sym = b + q;
    if (measured.has(sym) || net[b] === void 0 || net[q] === void 0) continue;
    const d = (net[b] - net[q]) / 2;
    out.push(finish({
      symbol: sym,
      display: `${b}/${q}`,
      asset: "FOREX",
      longPct: 50 + 50 * d,
      method: "derived",
      sources: [{ name: `${b} crowd`, longPct: r1(50 + 50 * net[b]) }, { name: `${q} crowd`, longPct: r1(50 + 50 * net[q]) }],
      updatedAt: now
    }));
  }
  return out;
}
var cache3 = null;
var getCachedSentiment = () => cache3?.data ?? null;
var inflight = null;
async function getSentiment(maxAgeMs = 6e4) {
  if (cache3 && Date.now() - cache3.at < maxAgeMs) return cache3.data;
  if (inflight) return inflight;
  inflight = (async () => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const sources = [];
    let fxssiRows = [];
    try {
      fxssiRows = await loadFxssi(now);
      markSuccess("fxssi", fxssiRows.length);
      sources.push({ id: "fxssi", name: "FXSSI \xB7 9 retail brokers", ok: fxssiRows.length > 0, count: fxssiRows.length, at: now });
    } catch (e) {
      markFailure("fxssi", e);
      sources.push({ id: "fxssi", name: "FXSSI \xB7 9 retail brokers", ok: false, count: 0, error: e?.message, at: now });
    }
    let cryptoRows = [];
    try {
      const c = await loadCrypto(now);
      cryptoRows = c.rows;
      for (const [id, name, n] of [["okx-lsr", "OKX", c.stats.okx], ["gate-lsr", "Gate.io", c.stats.gate], ["bitget-lsr", "Bitget", c.stats.bitget]]) {
        if (n > 0) markSuccess(id, n);
        else markFailure(id, c.stats.errors.find((x) => x.startsWith(name)) || "no data");
        sources.push({ id, name, ok: n > 0, count: n, error: n ? void 0 : c.stats.errors.find((x) => x.startsWith(name)), at: now });
      }
    } catch (e) {
      sources.push({ id: "crypto", name: "Crypto exchanges", ok: false, count: 0, error: e?.message, at: now });
    }
    const fx = fxssiRows.filter((r) => r.asset === "FOREX");
    const currencies = deriveCurrencies(fx);
    const rows = [...fxssiRows, ...derivedCrosses(new Set(fx.map((r) => r.symbol)), currencies, now), ...cryptoRows];
    if (!rows.length && cache3) return cache3.data;
    const data2 = { updatedAt: now, rows, currencies, sources };
    if (rows.length) cache3 = { at: Date.now(), data: data2 };
    return data2;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}
function sentimentFor(snapshot2, ticker) {
  const t = ticker.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const alias = { BTCUSD: "BTCUSDT", ETHUSD: "ETHUSDT", SPX500: "US500", NAS100: "US100", WTI: "USOIL", BRENT: "UKOIL", DXY: "DXY", USDX: "DXY" };
  return snapshot2.rows.find((r) => r.symbol === t) || snapshot2.rows.find((r) => r.symbol === alias[t]) || null;
}

// server/macro/sources/snapshot.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var SNAPSHOT_ID = "fund_snapshot";
var DEFAULT_URL = "https://raw.githubusercontent.com/whbzafar/prime-pip-command-center-level/fundamentals-data/fundamentals.json";
registerSource(
  SNAPSHOT_ID,
  "Company fundamentals (Yahoo Finance statements + SEC EDGAR, refreshed every 6h)",
  "https://finance.yahoo.com/",
  "Reported revenue, earnings, margins, cash flow, debt and analyst outlook for Pakistani, Asian and global companies."
);
var snap = null;
var loadedAt = 0;
var inflight2 = null;
var TTL6 = 30 * 6e4;
function valid(j) {
  return j && typeof j === "object" && j.stocks && typeof j.stocks === "object" && Object.keys(j.stocks).length >= 10;
}
function loadSeed() {
  if (snap) return;
  for (const p of [import_path2.default.join(process.cwd(), "data", "fundamentals_seed.json"), import_path2.default.join(process.cwd(), "dist", "fundamentals_seed.json")]) {
    try {
      if (!import_fs2.default.existsSync(p)) continue;
      const j = JSON.parse(import_fs2.default.readFileSync(p, "utf8"));
      if (valid(j)) {
        snap = j;
        return;
      }
    } catch {
    }
  }
}
function refreshSnapshot(force = false) {
  loadSeed();
  if (!force && snap && Date.now() - loadedAt < TTL6) return Promise.resolve();
  if (inflight2) return inflight2;
  const url = process.env.PPFX_FUND_SNAPSHOT_URL || DEFAULT_URL;
  inflight2 = (async () => {
    try {
      const j = await fetchJson(url, { timeoutMs: 15e3, retries: 1, headers: { Accept: "application/json" } });
      if (!valid(j)) throw new Error("Snapshot file malformed");
      snap = j;
      loadedAt = Date.now();
      markSuccess(SNAPSHOT_ID, Object.keys(j.stocks).length);
    } catch (err) {
      loadedAt = Date.now() - TTL6 + 6e4;
      if (snap) {
        markFailure(SNAPSHOT_ID, err);
      } else markFailure(SNAPSHOT_ID, err);
    } finally {
      inflight2 = null;
    }
  })();
  return inflight2;
}
var getYahoo = (symbol) => snap?.stocks[symbol] || null;
var getSnapshotEdgar = (ticker) => snap?.edgar?.[ticker] || null;
var snapshotMeta = () => snap ? { generatedAt: snap.generatedAt, count: snap.count, unavailable: snap.unavailable || [] } : null;

// server/macro/sources/edgar.ts
var EDGAR_ID = "sec_edgar";
registerSource(
  EDGAR_ID,
  "SEC EDGAR company filings (XBRL)",
  "https://www.sec.gov/edgar/search/",
  "Quarterly revenue, EPS, margins, cash flow and leverage from official 10-Q/10-K filings."
);
var STOCKS = [
  { ticker: "AAPL", name: "Apple", cik: 320193, sector: "Technology" },
  { ticker: "MSFT", name: "Microsoft", cik: 789019, sector: "Technology" },
  { ticker: "NVDA", name: "NVIDIA", cik: 1045810, sector: "Semiconductors" },
  { ticker: "AMZN", name: "Amazon", cik: 1018724, sector: "Consumer / Cloud" },
  { ticker: "GOOGL", name: "Alphabet", cik: 1652044, sector: "Communication" },
  { ticker: "META", name: "Meta Platforms", cik: 1326801, sector: "Communication" },
  { ticker: "TSLA", name: "Tesla", cik: 1318605, sector: "Autos / Energy" },
  { ticker: "AMD", name: "Advanced Micro Devices", cik: 2488, sector: "Semiconductors" },
  { ticker: "NFLX", name: "Netflix", cik: 1065280, sector: "Communication" },
  { ticker: "JPM", name: "JPMorgan Chase", cik: 19617, sector: "Financials" },
  { ticker: "V", name: "Visa", cik: 1403161, sector: "Financials" },
  { ticker: "XOM", name: "Exxon Mobil", cik: 34088, sector: "Energy" },
  { ticker: "WMT", name: "Walmart", cik: 104169, sector: "Consumer Staples" },
  { ticker: "LLY", name: "Eli Lilly", cik: 59478, sector: "Healthcare" }
];
var data = /* @__PURE__ */ new Map();
var lastLoad3 = 0;
var TTL7 = 12 * 60 * 60 * 1e3;
var REVENUE_CONCEPTS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
  "SalesRevenueNet",
  "RevenuesNetOfInterestExpense"
];
function units(facts, concept, unit = "USD") {
  return facts?.facts?.["us-gaap"]?.[concept]?.units?.[unit] || [];
}
var QFRAME = /^CY(\d{4})Q([1-4])$/;
var AFRAME = /^CY(\d{4})$/;
var IFRAME = /^CY(\d{4})Q([1-4])I$/;
function toPoint(u) {
  return { frame: u.frame, end: u.end, val: Number(u.val), filed: u.filed, form: u.form };
}
function quarterPair(rows) {
  const q = rows.filter((u) => QFRAME.test(u.frame || "") && Number.isFinite(Number(u.val)));
  if (!q.length) return null;
  q.sort((a, b) => String(a.frame).localeCompare(String(b.frame)));
  const latest2 = q[q.length - 1];
  const [, y, n] = String(latest2.frame).match(QFRAME);
  const prevFrame = `CY${Number(y) - 1}Q${n}`;
  const yearAgo = q.find((u) => u.frame === prevFrame) || null;
  return { latest: toPoint(latest2), yearAgo: yearAgo ? toPoint(yearAgo) : null };
}
function latestFrame(rows, re) {
  const f = rows.filter((u) => re.test(u.frame || "") && Number.isFinite(Number(u.val)));
  if (!f.length) return null;
  f.sort((a, b) => String(a.frame).localeCompare(String(b.frame)));
  return toPoint(f[f.length - 1]);
}
function extractFundamentals(ticker, facts) {
  let revenue = null;
  for (const c of REVENUE_CONCEPTS) {
    const p = quarterPair(units(facts, c));
    if (p && (!revenue || p.latest.frame > revenue.latest.frame)) revenue = { concept: c, ...p };
  }
  const epsRows = units(facts, "EarningsPerShareDiluted", "USD/shares");
  let revenueAnnual = null;
  if (revenue) revenueAnnual = latestFrame(units(facts, revenue.concept), AFRAME);
  return {
    ticker,
    revenue,
    eps: quarterPair(epsRows),
    opIncome: quarterPair(units(facts, "OperatingIncomeLoss")),
    netIncome: quarterPair(units(facts, "NetIncomeLoss")),
    ocfAnnual: latestFrame(units(facts, "NetCashProvidedByUsedInOperatingActivities"), AFRAME),
    capexAnnual: latestFrame(units(facts, "PaymentsToAcquirePropertyPlantAndEquipment"), AFRAME),
    revenueAnnual,
    longTermDebt: latestFrame(units(facts, "LongTermDebtNoncurrent"), IFRAME) || latestFrame(units(facts, "LongTermDebt"), IFRAME),
    equity: latestFrame(units(facts, "StockholdersEquity"), IFRAME),
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function refreshEdgar(force = false) {
  if (!force && data.size && Date.now() - lastLoad3 < TTL7) return;
  const ua = process.env.SEC_USER_AGENT;
  if (!ua) markNotConfigured(EDGAR_ID, 'Optional: set SEC_USER_AGENT="AppName contact@email" (SEC fair-access policy). Using a generic agent until then.');
  const headers = { "User-Agent": ua || "PrimePipFX-CommandCenter/1.0 fundamentals-module", Accept: "application/json" };
  let ok = 0;
  let lastErr = null;
  await mapLimit(STOCKS, 2, async (s) => {
    try {
      const cik = String(s.cik).padStart(10, "0");
      const facts = await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers, timeoutMs: 25e3 });
      data.set(s.ticker, extractFundamentals(s.ticker, facts));
      ok++;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 150));
  });
  if (ok) {
    lastLoad3 = Date.now();
    markSuccess(EDGAR_ID, ok);
  } else markFailure(EDGAR_ID, lastErr || new Error("No filings loaded"));
}
var inflight3 = /* @__PURE__ */ new Map();
var perTickerAt = /* @__PURE__ */ new Map();
function loadEdgarTicker(ticker) {
  const s = STOCKS.find((x) => x.ticker === ticker);
  if (!s) return Promise.resolve();
  if (data.has(ticker) && Date.now() - (perTickerAt.get(ticker) || 0) < TTL7) return Promise.resolve();
  if (inflight3.has(ticker)) return inflight3.get(ticker);
  const ua = process.env.SEC_USER_AGENT;
  if (!ua && data.size === 0) markNotConfigured(EDGAR_ID, 'Optional: set SEC_USER_AGENT="AppName contact@email" (SEC fair-access policy). Using a generic agent until then.');
  const headers = { "User-Agent": ua || "PrimePipFX-CommandCenter/1.0 fundamentals-module", Accept: "application/json" };
  const p = (async () => {
    try {
      const cik = String(s.cik).padStart(10, "0");
      const facts = await fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers, timeoutMs: 15e3, retries: 1 });
      data.set(ticker, extractFundamentals(ticker, facts));
      perTickerAt.set(ticker, Date.now());
      markSuccess(EDGAR_ID, data.size);
    } catch (err) {
      markFailure(EDGAR_ID, err);
    } finally {
      inflight3.delete(ticker);
    }
  })();
  inflight3.set(ticker, p);
  return p;
}
function missingTickers(n) {
  return STOCKS.filter((s) => !data.has(s.ticker) && !inflight3.has(s.ticker)).slice(0, n).map((s) => s.ticker);
}
var getStockFundamentals = (ticker) => data.get(ticker) || getSnapshotEdgar(ticker) || null;

// server/macro/universe.ts
var pk = (s, name, sector) => ({ s, y: `${s}.KA`, name, region: "PK", c: "PK", sector });
var as = (y, name, c, sector) => ({ s: y, y, name, region: "ASIA", c, sector });
var us = (y, name, sector) => ({ s: y, y, name, region: "US", c: "US", sector });
var eu = (y, name, c, sector) => ({ s: y, y, name, region: "EU", c, sector });
var gl = (y, name, c, sector) => ({ s: y, y, name, region: "GLOBAL", c, sector });
var UNIVERSE = [
  // ── Pakistan (PSX) ─────────────────────────────────────────────
  pk("OGDC", "Oil & Gas Development Co", "Oil & Gas E&P"),
  pk("PPL", "Pakistan Petroleum", "Oil & Gas E&P"),
  pk("MARI", "Mari Energies", "Oil & Gas E&P"),
  pk("POL", "Pakistan Oilfields", "Oil & Gas E&P"),
  pk("PSO", "Pakistan State Oil", "Oil Marketing"),
  pk("APL", "Attock Petroleum", "Oil Marketing"),
  pk("SNGP", "Sui Northern Gas Pipelines", "Gas Utilities"),
  pk("SSGC", "Sui Southern Gas", "Gas Utilities"),
  pk("ATRL", "Attock Refinery", "Refinery"),
  pk("NRL", "National Refinery", "Refinery"),
  pk("PRL", "Pakistan Refinery", "Refinery"),
  pk("HBL", "Habib Bank", "Banks"),
  pk("UBL", "United Bank", "Banks"),
  pk("MCB", "MCB Bank", "Banks"),
  pk("MEBL", "Meezan Bank", "Banks"),
  pk("BAFL", "Bank Alfalah", "Banks"),
  pk("BAHL", "Bank AL Habib", "Banks"),
  pk("ABL", "Allied Bank", "Banks"),
  pk("NBP", "National Bank of Pakistan", "Banks"),
  pk("FABL", "Faysal Bank", "Banks"),
  pk("AKBL", "Askari Bank", "Banks"),
  pk("ENGROH", "Engro Holdings", "Conglomerate / Fertilizer"),
  pk("EFERT", "Engro Fertilizers", "Fertilizer"),
  pk("FFC", "Fauji Fertilizer", "Fertilizer"),
  pk("FATIMA", "Fatima Fertilizer", "Fertilizer"),
  pk("LUCK", "Lucky Cement", "Cement"),
  pk("DGKC", "D.G. Khan Cement", "Cement"),
  pk("MLCF", "Maple Leaf Cement", "Cement"),
  pk("FCCL", "Fauji Cement", "Cement"),
  pk("CHCC", "Cherat Cement", "Cement"),
  pk("KOHC", "Kohat Cement", "Cement"),
  pk("PIOC", "Pioneer Cement", "Cement"),
  pk("HUBC", "Hub Power", "Power"),
  pk("KAPCO", "Kot Addu Power", "Power"),
  pk("NCPL", "Nishat Chunian Power", "Power"),
  pk("KEL", "K-Electric", "Power"),
  pk("SYS", "Systems Limited", "Technology"),
  pk("TRG", "TRG Pakistan", "Technology"),
  pk("AVN", "Avanceon", "Technology"),
  pk("NESTLE", "Nestle Pakistan", "Consumer"),
  pk("UNITY", "Unity Foods", "Consumer"),
  pk("COLG", "Colgate-Palmolive Pakistan", "Consumer"),
  pk("MTL", "Millat Tractors", "Autos"),
  pk("INDU", "Indus Motor", "Autos"),
  pk("HCAR", "Honda Atlas Cars", "Autos"),
  pk("PSMC", "Pak Suzuki Motor", "Autos"),
  pk("EPCL", "Engro Polymer & Chemicals", "Chemicals"),
  pk("LOTCHEM", "Lotte Chemical Pakistan", "Chemicals"),
  pk("ICI", "ICI Pakistan", "Chemicals"),
  pk("ISL", "International Steels", "Steel"),
  pk("ASTL", "Amreli Steels", "Steel"),
  pk("NML", "Nishat Mills", "Textile"),
  pk("ILP", "Interloop", "Textile"),
  pk("GATM", "Gul Ahmed Textile", "Textile"),
  pk("SEARL", "The Searle Company", "Pharma"),
  pk("GLAXO", "GlaxoSmithKline Pakistan", "Pharma"),
  pk("ABOT", "Abbott Laboratories Pakistan", "Pharma"),
  pk("PAEL", "Pak Elektron", "Industrial"),
  pk("PTC", "Pakistan Telecommunication Co", "Telecom"),
  // ── Asia-Pacific & Middle East ─────────────────────────────────
  as("7203.T", "Toyota Motor", "JP", "Autos"),
  as("6758.T", "Sony Group", "JP", "Technology"),
  as("9984.T", "SoftBank Group", "JP", "Investment / Tech"),
  as("8306.T", "Mitsubishi UFJ Financial", "JP", "Banks"),
  as("6861.T", "Keyence", "JP", "Industrial Tech"),
  as("9432.T", "NTT", "JP", "Telecom"),
  as("7974.T", "Nintendo", "JP", "Gaming"),
  as("8035.T", "Tokyo Electron", "JP", "Semiconductors"),
  as("9983.T", "Fast Retailing", "JP", "Retail"),
  as("0700.HK", "Tencent", "HK", "Internet"),
  as("9988.HK", "Alibaba", "HK", "E-commerce"),
  as("0005.HK", "HSBC Holdings", "HK", "Banks"),
  as("1299.HK", "AIA Group", "HK", "Insurance"),
  as("3690.HK", "Meituan", "HK", "Internet"),
  as("0939.HK", "China Construction Bank", "HK", "Banks"),
  as("1810.HK", "Xiaomi", "HK", "Technology"),
  as("1398.HK", "ICBC", "HK", "Banks"),
  as("2318.HK", "Ping An Insurance", "HK", "Insurance"),
  as("0941.HK", "China Mobile", "HK", "Telecom"),
  as("RELIANCE.NS", "Reliance Industries", "IN", "Conglomerate"),
  as("TCS.NS", "Tata Consultancy Services", "IN", "IT Services"),
  as("HDFCBANK.NS", "HDFC Bank", "IN", "Banks"),
  as("INFY.NS", "Infosys", "IN", "IT Services"),
  as("ICICIBANK.NS", "ICICI Bank", "IN", "Banks"),
  as("BHARTIARTL.NS", "Bharti Airtel", "IN", "Telecom"),
  as("SBIN.NS", "State Bank of India", "IN", "Banks"),
  as("ITC.NS", "ITC", "IN", "Consumer"),
  as("LT.NS", "Larsen & Toubro", "IN", "Industrial"),
  as("HINDUNILVR.NS", "Hindustan Unilever", "IN", "Consumer"),
  as("005930.KS", "Samsung Electronics", "KR", "Semiconductors"),
  as("000660.KS", "SK Hynix", "KR", "Semiconductors"),
  as("373220.KS", "LG Energy Solution", "KR", "Batteries"),
  as("005380.KS", "Hyundai Motor", "KR", "Autos"),
  as("2330.TW", "TSMC", "TW", "Semiconductors"),
  as("2317.TW", "Hon Hai (Foxconn)", "TW", "Electronics"),
  as("2454.TW", "MediaTek", "TW", "Semiconductors"),
  as("PDD", "PDD Holdings", "CN", "E-commerce"),
  as("BIDU", "Baidu", "CN", "Internet"),
  as("D05.SI", "DBS Group", "SG", "Banks"),
  as("1155.KL", "Maybank", "MY", "Banks"),
  as("BBCA.JK", "Bank Central Asia", "ID", "Banks"),
  as("CBA.AX", "Commonwealth Bank", "AU", "Banks"),
  as("BHP.AX", "BHP Group", "AU", "Mining"),
  as("CSL.AX", "CSL", "AU", "Healthcare"),
  as("2222.SR", "Saudi Aramco", "SA", "Oil & Gas"),
  as("1120.SR", "Al Rajhi Bank", "SA", "Banks"),
  // ── United States (beyond the 14 SEC-filing names) ─────────────
  us("BRK-B", "Berkshire Hathaway", "Financials"),
  us("AVGO", "Broadcom", "Semiconductors"),
  us("ORCL", "Oracle", "Software"),
  us("CRM", "Salesforce", "Software"),
  us("ADBE", "Adobe", "Software"),
  us("COST", "Costco", "Consumer Staples"),
  us("PG", "Procter & Gamble", "Consumer Staples"),
  us("JNJ", "Johnson & Johnson", "Healthcare"),
  us("UNH", "UnitedHealth", "Healthcare"),
  us("HD", "Home Depot", "Retail"),
  us("BAC", "Bank of America", "Financials"),
  us("MA", "Mastercard", "Financials"),
  us("KO", "Coca-Cola", "Consumer Staples"),
  us("PEP", "PepsiCo", "Consumer Staples"),
  us("MRK", "Merck", "Healthcare"),
  us("ABBV", "AbbVie", "Healthcare"),
  us("CVX", "Chevron", "Energy"),
  us("DIS", "Walt Disney", "Communication"),
  us("INTC", "Intel", "Semiconductors"),
  us("QCOM", "Qualcomm", "Semiconductors"),
  us("PLTR", "Palantir", "Software"),
  us("UBER", "Uber", "Technology"),
  us("NKE", "Nike", "Consumer"),
  us("MCD", "McDonald's", "Consumer"),
  us("WFC", "Wells Fargo", "Financials"),
  us("GS", "Goldman Sachs", "Financials"),
  us("CAT", "Caterpillar", "Industrials"),
  us("BA", "Boeing", "Industrials"),
  us("PFE", "Pfizer", "Healthcare"),
  us("CSCO", "Cisco", "Technology"),
  us("IBM", "IBM", "Technology"),
  us("NOW", "ServiceNow", "Software"),
  us("COIN", "Coinbase", "Financials"),
  // ── Europe ─────────────────────────────────────────────────────
  eu("ASML", "ASML", "NL", "Semiconductor equipment"),
  eu("SAP", "SAP", "DE", "Software"),
  eu("NVO", "Novo Nordisk", "DK", "Healthcare"),
  eu("SHEL", "Shell", "GB", "Energy"),
  eu("AZN", "AstraZeneca", "GB", "Healthcare"),
  eu("TTE", "TotalEnergies", "FR", "Energy"),
  eu("SNY", "Sanofi", "FR", "Healthcare"),
  eu("MC.PA", "LVMH", "FR", "Luxury"),
  eu("SIE.DE", "Siemens", "DE", "Industrials"),
  eu("NESN.SW", "Nestle", "CH", "Consumer Staples"),
  eu("ROG.SW", "Roche", "CH", "Healthcare"),
  eu("OR.PA", "L'Oreal", "FR", "Consumer"),
  eu("AIR.PA", "Airbus", "FR", "Aerospace"),
  // ── Other global ───────────────────────────────────────────────
  gl("SHOP", "Shopify", "CA", "Software"),
  gl("RY", "Royal Bank of Canada", "CA", "Banks"),
  gl("ENB", "Enbridge", "CA", "Energy"),
  gl("MELI", "MercadoLibre", "AR", "E-commerce")
];
var COUNTRY_MACRO = {
  US: { asset: "US500", label: "US Macro Backdrop (S&P 500 fundamentals)" },
  JP: { asset: "JP225", label: "Japan Macro Backdrop (Nikkei fundamentals)" },
  GB: { asset: "UK100", label: "UK Macro Backdrop (FTSE fundamentals)" },
  DE: { asset: "GER40", label: "Germany/Euro Macro Backdrop (DAX fundamentals)" },
  AU: { asset: "AUS200", label: "Australia Macro Backdrop (ASX fundamentals)" }
};
var pkSector = (re) => (s) => s.region === "PK" && re.test(s.sector);
var BASKETS = [
  { symbol: "KSE100", name: "KSE-100 \xB7 Pakistan blue-chip basket", region: "PK", desc: "Average fundamental score of every tracked PSX blue chip that has live data (the heavyweights that drive the KSE-100). Not the official index weights.", pick: (s) => s.region === "PK" },
  { symbol: "PK-BANKS", name: "PSX Banks", region: "PK", desc: "Pakistani listed banks.", pick: pkSector(/^Banks$/) },
  { symbol: "PK-ENERGY", name: "PSX Oil, Gas & Refining", region: "PK", desc: "E&P, OMCs, gas utilities and refineries.", pick: pkSector(/Oil|Gas|Refinery/) },
  { symbol: "PK-FERT", name: "PSX Fertilizer", region: "PK", desc: "Fertilizer producers.", pick: pkSector(/Fertilizer/) },
  { symbol: "PK-CEMENT", name: "PSX Cement", region: "PK", desc: "Cement producers.", pick: pkSector(/^Cement$/) },
  { symbol: "PK-POWER", name: "PSX Power", region: "PK", desc: "Independent power producers and utilities.", pick: pkSector(/^Power$/) },
  { symbol: "PK-TECH", name: "PSX Technology", region: "PK", desc: "Software and technology exporters.", pick: pkSector(/^Technology$/) },
  { symbol: "PK-AUTO", name: "PSX Autos", region: "PK", desc: "Car and tractor makers.", pick: pkSector(/^Autos$/) },
  { symbol: "HK-TOP", name: "Hong Kong / China leaders", region: "ASIA", desc: "Largest Hong Kong-listed names (Hang Seng heavyweights).", pick: (s) => s.c === "HK" || s.c === "CN" },
  { symbol: "IN-TOP", name: "India leaders (Nifty heavyweights)", region: "ASIA", desc: "Largest Indian companies.", pick: (s) => s.c === "IN" },
  { symbol: "JP-TOP", name: "Japan leaders", region: "ASIA", desc: "Largest Japanese companies.", pick: (s) => s.c === "JP" },
  { symbol: "ASIA-TOP", name: "Asia-Pacific leaders", region: "ASIA", desc: "All tracked Asia-Pacific and Middle-East blue chips.", pick: (s) => s.region === "ASIA" },
  { symbol: "EU-TOP", name: "Europe leaders", region: "EU", desc: "Largest European companies.", pick: (s) => s.region === "EU" },
  { symbol: "US-MEGA", name: "US mega-cap basket", region: "US", desc: "Largest US companies tracked (SEC filings + Yahoo).", pick: (s) => s.region === "US", withSecUs: true },
  { symbol: "WORLD-TOP", name: "World leaders (all tracked)", region: "WORLD", desc: "Every tracked non-Pakistani company.", pick: (s) => s.region !== "PK", withSecUs: true }
];

// server/macro/globalStocks.ts
var DAY = 864e5;
var r2 = (v) => Math.round(v * 100) / 100;
var T = (d) => (/* @__PURE__ */ new Date(`${d}T00:00:00Z`)).getTime();
var ageOf = (d, now) => Math.max(0, (now - T(d)) / DAY);
var NO_BALANCE_SECTOR = /bank|insurance|financial/i;
function pct(a, b) {
  return b !== 0 ? (a - b) / Math.abs(b) * 100 : null;
}
function yoy(q, a) {
  for (const [ser, kind] of [[q, "quarter"], [a, "year"]]) {
    if (!ser || ser.length < 2) continue;
    const [ld, lv] = ser[ser.length - 1];
    for (let i = ser.length - 2; i >= 0; i--) {
      const diff = (T(ld) - T(ser[i][0])) / DAY;
      if (diff >= 345 && diff <= 385) return { latest: lv, prior: ser[i][1], latestDate: ld, priorDate: ser[i][0], kind };
      if (diff > 385) break;
    }
  }
  return null;
}
var last = (s) => s && s.length ? s[s.length - 1] : null;
var sameDate = (a, d) => a?.find((p) => p[0] === d)?.[1] ?? null;
function ind(sym, rec, id, name, desc, weight, note, fn) {
  return {
    kind: "custom",
    id: `${sym}_${id}`,
    name,
    desc,
    freq: "Quarterly",
    polarity: 1,
    weight,
    polarityNote: note,
    compute: (ctx) => {
      const r = rec();
      if (!r) return null;
      const snapDate = snapshotMeta()?.generatedAt || new Date(ctx.now).toISOString();
      const o = fn(r, snapDate);
      if (!o) return null;
      if (ageOf(o.asOf.slice(0, 10), ctx.now) > 548) return null;
      return {
        observation: {
          actual: o.actual,
          forecast: null,
          previous: o.previous,
          releasedAt: new Date(o.asOf).toISOString(),
          unit: o.unit,
          sourceTitle: `${sym} ${name}`,
          sourceName: "Yahoo Finance (reported company statements)",
          sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(r.y)}/financials/`
        },
        components: [{ key: "trend", label: name, value: o.value, weight: 1, detail: o.detail }],
        reasoning: o.reasoning,
        ageDays: ageOf(o.asOf.slice(0, 10), ctx.now),
        intervalDays: o.interval ?? 110
      };
    }
  };
}
var money = (v, cur) => {
  const a = Math.abs(v);
  const s = a >= 1e12 ? `${(v / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : String(r2(v));
  return `${cur || ""} ${s}`.trim();
};
function growthInd(sym, rec, o) {
  return ind(sym, rec, o.id, o.name, o.desc, o.weight, "Faster growth = bullish", (r, snap2) => {
    const p = yoy(r.ts[o.q], r.ts[o.a]);
    if (p) {
      const g = pct(p.latest, p.prior);
      if (g === null) return null;
      const cap = Math.max(-150, Math.min(150, g));
      return {
        value: squash((cap - o.centre) / o.scale),
        detail: `${g >= 0 ? "+" : ""}${r2(g)}% YoY (${p.latestDate})`,
        reasoning: `${o.name}: ${o.money ? money(p.latest, r.currency) : r2(p.latest)} (${p.latestDate}) vs ${o.money ? money(p.prior, r.currency) : r2(p.prior)} (${p.priorDate}) \u2192 ${g >= 0 ? "+" : ""}${r2(g)}% ${p.kind === "year" ? "annual" : "quarterly"} YoY.`,
        actual: p.latest,
        previous: p.prior,
        unit: o.money ? r.currency || "" : "",
        asOf: p.latestDate,
        interval: p.kind === "year" ? 380 : 110
      };
    }
    const fdv = o.fdKey ? r.fd[o.fdKey] : null;
    if (fdv !== null && fdv !== void 0) {
      const g = fdv * 100;
      return {
        value: squash((Math.max(-150, Math.min(150, g)) - o.centre) / o.scale),
        detail: `${g >= 0 ? "+" : ""}${r2(g)}% YoY (latest quarter)`,
        reasoning: `${o.name}: ${g >= 0 ? "+" : ""}${r2(g)}% year-over-year in the latest reported quarter.`,
        actual: r2(g),
        previous: null,
        unit: "%",
        asOf: snap2,
        interval: 110
      };
    }
    return null;
  });
}
function buildPillars(sym, sector, rec) {
  const growth = { id: "growth", name: "Revenue & Earnings Growth", desc: "Year-over-year growth in the latest reported period.", weight: 35, indicators: [
    growthInd(sym, rec, { id: "rev", name: "Revenue Growth (YoY)", desc: "Latest revenue vs the same period a year earlier.", weight: 3, q: "quarterlyTotalRevenue", a: "annualTotalRevenue", fdKey: "revenueGrowth", centre: 6, scale: 10, money: true }),
    growthInd(sym, rec, { id: "ni", name: "Net Income Growth (YoY)", desc: "Profit after tax vs the same period a year earlier.", weight: 3, q: "quarterlyNetIncome", a: "annualNetIncome", fdKey: "earningsGrowth", centre: 8, scale: 18, money: true }),
    growthInd(sym, rec, { id: "op", name: "Operating Income Growth (YoY)", desc: "Core profit before interest and tax.", weight: 1.5, q: "quarterlyOperatingIncome", a: "annualOperatingIncome", centre: 8, scale: 18, money: true })
  ] };
  const profitability = { id: "profitability", name: "Profitability & Returns", desc: "Margins, their direction and return on shareholders\u2019 capital.", weight: 25, indicators: [
    ind(sym, rec, "nm", "Net Margin", "Net income as a share of revenue (trailing twelve months where reported).", 2, "Higher margin = higher quality = bullish", (r, snap2) => {
      const tr = last(r.ts.trailingTotalRevenue), tn = last(r.ts.trailingNetIncome);
      let m = null, asOf = snap2, label = "trailing 12 months";
      if (tr && tn && tr[0] === tn[0] && tr[1] > 0) {
        m = tn[1] / tr[1] * 100;
        asOf = tr[0];
      } else {
        const ar = last(r.ts.annualTotalRevenue), an = last(r.ts.annualNetIncome);
        if (ar && an && ar[0] === an[0] && ar[1] > 0) {
          m = an[1] / ar[1] * 100;
          asOf = ar[0];
          label = "latest fiscal year";
        } else if (r.fd.profitMargins !== null && r.fd.profitMargins !== void 0) {
          m = r.fd.profitMargins * 100;
          label = "trailing";
        }
      }
      if (m === null) return null;
      return { value: squash((m - 8) / 10), detail: `${r2(m)}%`, reasoning: `Net margin ${r2(m)}% (${label}).`, actual: r2(m), previous: null, unit: "%", asOf, interval: 200 };
    }),
    ind(sym, rec, "om", "Operating Margin Trend", "Change in operating margin vs a year ago (percentage points).", 2, "Expanding margins = bullish", (r) => {
      const o = yoy(r.ts.quarterlyOperatingIncome, r.ts.annualOperatingIncome);
      if (!o) return null;
      const rv = o.kind === "quarter" ? yoy(r.ts.quarterlyTotalRevenue, void 0) : yoy(void 0, r.ts.annualTotalRevenue);
      if (!rv || rv.latestDate !== o.latestDate || rv.priorDate !== o.priorDate || rv.latest <= 0 || rv.prior <= 0) return null;
      const now = o.latest / rv.latest * 100, then = o.prior / rv.prior * 100;
      return {
        value: squash((now - then) / 3),
        detail: `${r2(then)}% \u2192 ${r2(now)}%`,
        reasoning: `Operating margin ${r2(then)}% \u2192 ${r2(now)}% (${now - then >= 0 ? "+" : ""}${r2(now - then)}pp).`,
        actual: r2(now),
        previous: r2(then),
        unit: "%",
        asOf: o.latestDate,
        interval: o.kind === "year" ? 380 : 110
      };
    }),
    ind(sym, rec, "roe", "Return on Equity", "Profit earned per unit of shareholders\u2019 equity.", 2, "Higher ROE = bullish", (r, snap2) => {
      let roe = null, asOf = snap2, basis = "trailing";
      if (r.fd.returnOnEquity !== null && r.fd.returnOnEquity !== void 0) roe = r.fd.returnOnEquity * 100;
      else {
        const an = last(r.ts.annualNetIncome), eq = last(r.ts.annualStockholdersEquity);
        if (an && eq && an[0] === eq[0] && eq[1] > 0) {
          roe = an[1] / eq[1] * 100;
          asOf = an[0];
          basis = "latest fiscal year";
        }
      }
      if (roe === null) return null;
      return { value: squash((roe - 12) / 10), detail: `${r2(roe)}%`, reasoning: `Return on equity ${r2(roe)}% (${basis}).`, actual: r2(roe), previous: null, unit: "%", asOf, interval: 200 };
    })
  ] };
  const noBal = NO_BALANCE_SECTOR.test(sector);
  const balance = { id: "balance", name: "Cash Flow & Balance Sheet", desc: "Free cash flow and leverage (not applicable to banks and insurers).", weight: 20, indicators: [
    ind(sym, rec, "fcf", "Free Cash Flow Margin", "Operating cash flow minus capex as % of revenue (latest fiscal year).", 2, "Higher FCF margin = bullish", (r, snap2) => {
      const ocf = last(r.ts.annualOperatingCashFlow), rev = last(r.ts.annualTotalRevenue);
      if (ocf && rev && ocf[0] === rev[0] && rev[1] > 0) {
        const cx = sameDate(r.ts.annualCapitalExpenditure, ocf[0]);
        const m = (ocf[1] - (cx === null ? 0 : Math.abs(cx))) / rev[1] * 100;
        return { value: squash((m - 8) / 10), detail: `${r2(m)}% (${ocf[0]})`, reasoning: `Free cash flow margin ${r2(m)}% in fiscal year ending ${ocf[0]}.`, actual: r2(m), previous: null, unit: "%", asOf: ocf[0], interval: 380 };
      }
      if (r.fd.freeCashflow !== null && r.fd.freeCashflow !== void 0 && r.fd.totalRevenue) {
        const m = r.fd.freeCashflow / r.fd.totalRevenue * 100;
        return { value: squash((m - 8) / 10), detail: `${r2(m)}% (trailing)`, reasoning: `Free cash flow margin ${r2(m)}% (trailing twelve months).`, actual: r2(m), previous: null, unit: "%", asOf: snap2, interval: 200 };
      }
      return null;
    }),
    ind(sym, rec, "de", "Debt to Equity", "Total debt divided by shareholders\u2019 equity.", 1.5, "Lower leverage = bullish", (r, snap2) => {
      let de = null, asOf = snap2;
      const d = last(r.ts.annualTotalDebt), e = last(r.ts.annualStockholdersEquity);
      if (d && e && e[1] > 0) {
        de = d[1] / e[1];
        asOf = e[0];
      } else if (r.fd.debtToEquity !== null && r.fd.debtToEquity !== void 0) de = r.fd.debtToEquity / 100;
      if (de === null) return null;
      return { value: -squash((de - 0.8) / 0.8), detail: `${r2(de)}\xD7`, reasoning: `Debt / equity = ${r2(de)}\xD7.`, actual: r2(de), previous: null, unit: "\xD7", asOf, interval: 380 };
    })
  ] };
  const valuation = { id: "valuation", name: "Valuation & Analyst Outlook", desc: "What the market and analysts expect from here (where published).", weight: 20, indicators: [
    ind(sym, rec, "rec", "Analyst Consensus", "Mean analyst rating (1 = strong buy \u2026 5 = sell).", 2, "Stronger buy consensus = bullish", (r, snap2) => {
      const m = r.fd.recommendationMean, n = r.fd.analysts ?? 0;
      if (m === null || m === void 0 || n < 3) return null;
      return { value: Math.max(-1, Math.min(1, (3 - m) / 1.5)), detail: `${r2(m)} / 5 (${n} analysts)`, reasoning: `Analyst consensus ${r2(m)} on a 1 (strong buy)\u20135 (sell) scale from ${n} analysts.`, actual: r2(m), previous: null, unit: "/5", asOf: snap2, interval: 40 };
    }),
    ind(sym, rec, "tgt", "Upside to Analyst Target", "Mean analyst price target vs the current price.", 2, "More upside = bullish", (r, snap2) => {
      const t = r.fd.targetMeanPrice, p = r.fd.currentPrice ?? r.price, n = r.fd.analysts ?? 0;
      if (!t || !p || n < 3) return null;
      const up = (t / p - 1) * 100;
      return { value: squash((up - 8) / 15), detail: `${up >= 0 ? "+" : ""}${r2(up)}%`, reasoning: `Mean analyst target ${r2(t)} vs price ${r2(p)} \u2192 ${up >= 0 ? "+" : ""}${r2(up)}% implied.`, actual: r2(up), previous: null, unit: "%", asOf: snap2, interval: 40 };
    }),
    ind(sym, rec, "fwd", "Earnings Outlook (forward vs trailing P/E)", "Implied next-year EPS growth from forward vs trailing P/E.", 1.5, "Higher expected earnings growth = bullish", (r, snap2) => {
      const tp = r.sd.trailingPE, fp = r.sd.forwardPE;
      if (!tp || !fp || tp <= 0 || fp <= 0) return null;
      const g = (tp / fp - 1) * 100;
      return { value: squash((Math.max(-80, Math.min(80, g)) - 8) / 15), detail: `P/E ${r2(tp)} \u2192 ${r2(fp)}`, reasoning: `Trailing P/E ${r2(tp)} vs forward ${r2(fp)} \u2192 analysts expect ${g >= 0 ? "+" : ""}${r2(g)}% EPS growth.`, actual: r2(fp), previous: r2(tp), unit: "\xD7 P/E", asOf: snap2, interval: 40 };
    }),
    ind(sym, rec, "peg", "Growth-Adjusted Valuation (PEG)", "P/E relative to expected earnings growth; ~1 is fair, higher is expensive.", 1, "Lower PEG = cheaper for its growth = bullish", (r, snap2) => {
      const p = r.ks.pegRatio;
      if (!p || p <= 0 || p > 20) return null;
      return { value: -squash((p - 1.5) / 1), detail: `PEG ${r2(p)}`, reasoning: `PEG ratio ${r2(p)} (\u22481 fair; above 2 expensive for its growth).`, actual: r2(p), previous: null, unit: "\xD7", asOf: snap2, interval: 40 };
    })
  ] };
  return noBal ? [growth, profitability, valuation] : [growth, profitability, balance, valuation];
}
function metaFor(u, rec) {
  return {
    get region() {
      return u.region;
    },
    get country() {
      return u.c;
    },
    get sector() {
      return u.sector;
    },
    get macroAsset() {
      return COUNTRY_MACRO[u.c]?.asset ?? null;
    },
    get price() {
      return rec()?.price ?? null;
    },
    get currency() {
      return rec()?.currency ?? null;
    },
    get change1y() {
      return rec()?.change1y ?? null;
    },
    get pe() {
      const v = rec()?.sd.trailingPE;
      return v ? r2(v) : null;
    },
    get fwdPe() {
      const v = rec()?.sd.forwardPE;
      return v ? r2(v) : null;
    },
    get divYield() {
      const v = rec()?.sd.dividendYield;
      return v ? r2(v * 100) : null;
    },
    get yahoo() {
      return rec()?.y ?? u.y ?? null;
    }
  };
}
function globalSpec(u) {
  const rec = () => getYahoo(u.s);
  const pillars = buildPillars(u.s, u.sector, rec);
  const macro = COUNTRY_MACRO[u.c];
  if (macro) pillars.push({ id: "macro", name: macro.label.split(" (")[0], desc: `The ${macro.asset} fundamental score (growth, policy, inflation, risk).`, weight: 15, indicators: [], mirror: { asset: macro.asset, sign: 1 } });
  return { symbol: u.s, name: u.name, assetClass: "STOCKS", pillars, meta: metaFor(u, rec) };
}
var GLOBAL_STOCK_SPECS = UNIVERSE.map(globalSpec);
function valuationPillarFor(ticker, sector) {
  const v = buildPillars(ticker, sector, () => getYahoo(ticker)).find((p) => p.id === "valuation");
  return { ...v, weight: 15 };
}
var coreStockMeta = (t) => metaFor({ s: t.ticker, name: t.name, region: "US", c: "US", sector: t.sector }, () => getYahoo(t.ticker));
function members(b) {
  const list = UNIVERSE.filter(b.pick).map((s) => s.s);
  if (b.withSecUs) list.push(...STOCKS.map((s) => s.ticker));
  return list;
}
function basketSpec(b) {
  const mem = members(b);
  const scored = (ctx) => mem.map((s) => ({ s, r: ctx.results.get(s) })).filter((x) => x.r && x.r.score !== null && x.r.confidence >= 40);
  const need = Math.max(2, Math.ceil(mem.length * 0.4));
  const mk = (id, name, desc, weight, note, fn) => ({
    kind: "custom",
    id: `${b.symbol}_${id}`,
    name,
    desc,
    freq: "Quarterly",
    polarity: 1,
    weight,
    polarityNote: note,
    compute: (ctx) => {
      const rows = scored(ctx);
      if (rows.length < need) return null;
      const o = fn(rows, ctx);
      if (!o) return null;
      const asOf = snapshotMeta()?.generatedAt || new Date(ctx.now).toISOString();
      return {
        observation: { actual: o.actual, forecast: null, previous: null, releasedAt: asOf, unit: "", sourceTitle: `${b.symbol} ${name}`, sourceName: "Constituent fundamentals (Yahoo Finance statements + SEC EDGAR)", sourceUrl: "https://finance.yahoo.com/" },
        components: [{ key: "trend", label: name, value: o.value, weight: 1, detail: o.detail }],
        reasoning: o.reasoning,
        ageDays: 0,
        intervalDays: 30
      };
    }
  });
  const spec = { id: "constituents", name: "Constituent Fundamentals", desc: "Aggregated from the fundamental scores of the companies inside the basket.", weight: 100, indicators: [
    mk("avg", "Average constituent score", "Equal-weighted average fundamental score of constituents with enough data.", 3, "Healthier constituents = bullish", (rows) => {
      const avg = rows.reduce((a, x) => a + x.r.score, 0) / rows.length;
      const top = [...rows].sort((a, b2) => b2.r.score - a.r.score);
      return {
        value: avg / 100,
        detail: `${avg >= 0 ? "+" : ""}${r2(avg)} avg of ${rows.length}/${mem.length}`,
        actual: r2(avg),
        reasoning: `Equal-weighted average of ${rows.length} of ${mem.length} constituents is ${avg >= 0 ? "+" : ""}${r2(avg)}. Strongest: ${top.slice(0, 3).map((x) => x.s).join(", ")}; weakest: ${top.slice(-3).reverse().map((x) => x.s).join(", ")}.`
      };
    }),
    mk("breadth", "Breadth (bullish minus bearish share)", "Share of constituents with a bullish score minus the share with a bearish score.", 2, "More bullish companies than bearish = bullish", (rows) => {
      const bull = rows.filter((x) => x.r.score >= 10).length, bear = rows.filter((x) => x.r.score <= -10).length;
      const net = (bull - bear) / rows.length * 100;
      return {
        value: net / 100,
        detail: `${bull} bullish \xB7 ${bear} bearish \xB7 ${rows.length - bull - bear} neutral`,
        actual: r2(net),
        reasoning: `${bull} of ${rows.length} constituents are bullish and ${bear} bearish \u2192 net breadth ${net >= 0 ? "+" : ""}${r2(net)}%.`
      };
    })
  ] };
  return { symbol: b.symbol, name: b.name, assetClass: "INDICES", pillars: [spec], meta: { region: b.region, kind: "basket", desc: b.desc, members: mem.length, sector: "Basket index" } };
}
var BASKET_SPECS = BASKETS.map(basketSpec);
function applyBasketConfidence(results) {
  for (const b of BASKETS) {
    const r = results.get(b.symbol);
    if (!r) continue;
    const mem = members(b);
    const rows = mem.map((m) => results.get(m)).filter((x) => x && x.score !== null && x.confidence >= 40);
    const cov = mem.length ? rows.length / mem.length : 0;
    const avg = rows.length ? rows.reduce((a, x) => a + x.confidence, 0) / rows.length : 0;
    r.confidence = Math.round(cov * avg);
    if (r.meta) r.meta.covered = rows.length;
  }
}

// server/sentiment/storage.ts
var STORAGE_FILE = "retail_sentiment_store.json";
var THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1e3;
var ONE_HOUR_MS = 60 * 60 * 1e3;
var SNAPSHOT_MIN_INTERVAL_MS = 5 * 60 * 1e3;
var DEFAULT_STORE = {
  cache: {},
  snapshots: [],
  lastUpdated: 0
};
var SentimentStorage = class {
  constructor() {
    this.data = safeReadJsonFile(STORAGE_FILE, DEFAULT_STORE);
    if (!this.data.cache) this.data.cache = {};
    if (!Array.isArray(this.data.snapshots)) this.data.snapshots = [];
    this.purgeBinanceCommodities();
  }
  /**
   * Remove ALL Binance/Bybit gold, silver, and natural gas rows from storage
   * Commodities must come EXCLUSIVELY from Myfxbook API
   */
  purgeBinanceCommodities() {
    const purgeSymbols = /* @__PURE__ */ new Set(["XAUUSD", "XAGUSD", "NATGAS", "XAUUSDT", "XAGUSDT", "NATGASUSDT"]);
    let modified = false;
    for (const sym of Object.keys(this.data.cache)) {
      const item = this.data.cache[sym];
      const isBinanceCommodity = purgeSymbols.has(sym) && (item?.source?.includes("Binance") || item?.source?.includes("Bybit"));
      const isUnverifiedAggregate = item?.source === "Myfxbook Community Outlook & Broker Aggregate" || item?.source === "Broker Aggregate & Community Outlook";
      if (isBinanceCommodity || isUnverifiedAggregate) {
        delete this.data.cache[sym];
        modified = true;
      }
    }
    const prevSnapCount = this.data.snapshots.length;
    this.data.snapshots = this.data.snapshots.filter((s) => {
      const isBinanceCommodity = purgeSymbols.has(s.symbol) && (s.source?.includes("Binance") || s.source?.includes("Bybit"));
      const isUnverified = s.source === "Myfxbook Community Outlook & Broker Aggregate" || s.source === "Broker Aggregate & Community Outlook";
      return !isBinanceCommodity && !isUnverified;
    });
    if (this.data.snapshots.length !== prevSnapCount) {
      modified = true;
    }
    if (modified) {
      this.save();
      console.log("[SentimentStorage] Cleaned storage: removed Binance/Bybit commodities and unverified items.");
    }
  }
  /**
   * Persist in-memory store to disk safely
   */
  save() {
    safeWriteJsonFile(STORAGE_FILE, this.data);
  }
  /**
   * Merge newly fetched valid items into cache and append snapshots
   * Rejects invalid/empty data and never replaces good data with bad data
   */
  saveBatch(items) {
    if (!items || items.length === 0) return;
    const now = Date.now();
    this.data.lastUpdated = now;
    const cutoff = now - THIRTY_DAYS_MS;
    this.data.snapshots = this.data.snapshots.filter((s) => s.timestamp >= cutoff);
    for (const item of items) {
      if (!item || !item.symbol || Number.isNaN(item.longPct) || Number.isNaN(item.shortPct)) {
        continue;
      }
      const sum = item.longPct + item.shortPct;
      if (sum < 99 || sum > 101) {
        continue;
      }
      this.data.cache[item.symbol] = {
        ...item,
        fetchedAt: item.fetchedAt || now
      };
      const lastSnap = [...this.data.snapshots].reverse().find((s) => s.symbol === item.symbol);
      if (!lastSnap || now - lastSnap.timestamp >= SNAPSHOT_MIN_INTERVAL_MS) {
        this.data.snapshots.push({
          symbol: item.symbol,
          assetClass: item.assetClass,
          longPct: item.longPct,
          shortPct: item.shortPct,
          source: item.source,
          traderGroup: item.traderGroup,
          timestamp: item.timestamp || now
        });
      }
    }
    this.save();
  }
  /**
   * Compute difference in long percentage versus about 1 hour ago (40 - 90 min window)
   */
  get1HourChange(symbol, currentLongPct) {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1e3;
    const symbolSnaps = this.data.snapshots.filter(
      (s) => s.symbol === symbol && s.timestamp <= now - 20 * 60 * 1e3
    );
    if (symbolSnaps.length === 0) return void 0;
    let closest = symbolSnaps[0];
    let minDiff = Math.abs(closest.timestamp - oneHourAgo);
    for (let i = 1; i < symbolSnaps.length; i++) {
      const diff = Math.abs(symbolSnaps[i].timestamp - oneHourAgo);
      if (diff < minDiff) {
        minDiff = diff;
        closest = symbolSnaps[i];
      }
    }
    if (minDiff > 60 * 60 * 1e3) return void 0;
    const delta = Number((currentLongPct - closest.longPct).toFixed(1));
    return delta;
  }
  /**
   * Get all items currently in cache enriched with 1h delta and staleness
   * If data is older than 1 hour, sets isUnavailable = true
   */
  getAllItems() {
    const now = Date.now();
    const list = Object.values(this.data.cache).map((raw) => {
      const item = { ...raw };
      item.change1hPct = this.get1HourChange(item.symbol, item.longPct);
      const refreshThreshold = item.assetClass === "CRYPTO" ? 2 * 60 * 1e3 : 2 * 20 * 60 * 1e3;
      const age = now - (item.fetchedAt || item.timestamp || 0);
      item.isStale = age > refreshThreshold;
      item.isUnavailable = age > ONE_HOUR_MS;
      return item;
    });
    return {
      items: list,
      lastUpdated: this.data.lastUpdated
    };
  }
  /**
   * Retrieve snapshot history for a symbol
   */
  getSymbolHistory(symbol, timeframe = "24h") {
    const norm = symbol.trim().toUpperCase();
    const current = this.data.cache[norm] || null;
    const now = Date.now();
    let windowMs = 24 * 60 * 60 * 1e3;
    if (timeframe === "7d") windowMs = 7 * 24 * 60 * 60 * 1e3;
    if (timeframe === "30d") windowMs = 30 * 24 * 60 * 60 * 1e3;
    const history = this.data.snapshots.filter((s) => s.symbol === norm && s.timestamp >= now - windowMs).sort((a, b) => a.timestamp - b.timestamp);
    return {
      symbol: norm,
      current,
      history
    };
  }
};
var sentimentStorage = new SentimentStorage();

// server/macro/assets.ts
var DAY2 = 864e5;
var r22 = (v) => Math.round(v * 100) / 100;
var seq = 0;
function cal(concept, country, polarity, weight, polarityNote, extra = {}) {
  return { kind: "cal", id: `${country}_${concept}_${++seq}`, concept, country, polarity, weight, polarityNote, ...extra };
}
function ageOf2(dateIso, now) {
  return Math.max(0, (now - new Date(dateIso).getTime()) / DAY2);
}
function fredInd(o) {
  return {
    kind: "custom",
    id: o.id,
    name: o.name,
    desc: o.desc,
    freq: o.interval && o.interval >= 7 ? "Weekly" : "Daily",
    polarity: o.polarity,
    weight: o.weight,
    polarityNote: o.polarityNote,
    compute: (ctx) => {
      const pts = getCachedFred(o.series);
      const last2 = latest(pts);
      const prev = valueDaysAgo(pts, o.days);
      if (!last2 || !prev) return null;
      const chg = o.pct ? (last2.value - prev.value) / prev.value * 100 : last2.value - prev.value;
      const comps = [{
        key: "trend",
        label: `${o.days}-day change`,
        value: squash(chg / o.changeScale),
        weight: 1,
        detail: `${r22(prev.value)} \u2192 ${r22(last2.value)} (${chg >= 0 ? "+" : ""}${r22(chg)}${o.pct ? "%" : o.unit === "%" ? "pp" : ""})`
      }];
      const z = o.zWeight ? zScore(pts) : null;
      if (o.zWeight && z !== null) comps.push({ key: "level", label: "1-year z-score", value: squash(z / 1.2), weight: o.zWeight, detail: `z = ${r22(z)} vs trailing year` });
      return {
        observation: {
          actual: last2.value,
          forecast: null,
          previous: prev.value,
          releasedAt: new Date(last2.date).toISOString(),
          period: last2.date,
          unit: o.unit,
          sourceTitle: fredSourceOf(o.series).title,
          sourceName: fredSourceOf(o.series).name,
          sourceUrl: fredSourceOf(o.series).url,
          extra: { change: r22(chg), zScore: z === null ? null : r22(z) }
        },
        components: comps,
        reasoning: `${o.name} moved from ${r22(prev.value)} to ${r22(last2.value)} over ~${o.days} days (${chg >= 0 ? "+" : ""}${r22(chg)}${o.pct ? "%" : ""})${z !== null && o.zWeight ? `; 1-year z-score ${r22(z)}` : ""}.`,
        ageDays: ageOf2(last2.date, ctx.now) - 1,
        intervalDays: o.interval ?? 4
      };
    }
  };
}
function priceInd(o) {
  return {
    kind: "custom",
    id: o.id,
    name: o.name,
    desc: o.desc,
    freq: "Daily",
    polarity: o.polarity,
    weight: o.weight,
    polarityNote: o.polarityNote,
    compute: (ctx) => {
      const pts = getPrices(o.symbol);
      const last2 = latest(pts);
      const prev = valueDaysAgo(pts, o.days);
      if (!last2 || !prev || !prev.value) return null;
      const chg = (last2.value - prev.value) / prev.value * 100;
      return {
        observation: {
          actual: last2.value,
          forecast: null,
          previous: prev.value,
          releasedAt: new Date(last2.date).toISOString(),
          period: last2.date,
          sourceTitle: o.name,
          sourceName: `Daily closes (${getPriceVia(o.symbol) || "Yahoo Finance"})`,
          sourceUrl: "https://finance.yahoo.com/",
          extra: { changePct: r22(chg) }
        },
        components: [{ key: "trend", label: `${o.days}-day change`, value: squash(chg / o.changeScale), weight: 1, detail: `${r22(prev.value)} \u2192 ${r22(last2.value)} (${chg >= 0 ? "+" : ""}${r22(chg)}%)` }],
        reasoning: `${o.name} moved ${chg >= 0 ? "+" : ""}${r22(chg)}% over ~${o.days} days (${r22(prev.value)} \u2192 ${r22(last2.value)}).`,
        ageDays: ageOf2(last2.date, ctx.now) - 1,
        intervalDays: 4
      };
    }
  };
}
var us10y = (pol, w, note, id) => fredInd({
  id,
  name: "US 10-Year Treasury Yield",
  desc: "The world\u2019s benchmark long-term interest rate.",
  series: "DGS10",
  days: 21,
  changeScale: 0.2,
  polarity: pol,
  weight: w,
  unit: "%",
  polarityNote: note
});
var copperPx = (w, note, id) => priceInd({ id, name: "Copper Price Trend", desc: "COMEX copper \u2014 the bellwether of global industrial demand.", symbol: "XCUUSD", days: 21, changeScale: 6, polarity: 1, weight: w, polarityNote: note });
var ironOrePx = (w, note, id) => priceInd({ id, name: "Iron Ore Price Trend", desc: "SGX 62% Fe iron ore futures \u2014 Australia\u2019s largest export.", symbol: "IRONORE", days: 21, changeScale: 7, polarity: 1, weight: w, polarityNote: note });
function cotInd(asset, weight, label) {
  return {
    kind: "custom",
    id: `cot_${asset}`,
    name: `CFTC COT \u2014 ${label}`,
    freq: "Weekly",
    weight,
    polarity: 1,
    desc: "Large speculators\u2019 (non-commercial) net futures position: where it sits in its 52-week range (COT Index) and this week\u2019s change as % of open interest.",
    polarityNote: "Speculators adding longs / near top of range = bullish (trend-following read; \u226590 or \u226410 flags crowding risk)",
    compute: (ctx) => {
      const s = getCotSignal(asset);
      if (!s) return null;
      const idxPart = s.cotIndex52w === null ? 0 : (s.cotIndex52w - 50) / 50;
      const chgPart = Math.tanh(s.netChange / (s.openInterest || 1) / 0.02);
      const crowd = s.cotIndex52w !== null && (s.cotIndex52w >= 90 || s.cotIndex52w <= 10);
      return {
        observation: {
          actual: s.net,
          forecast: null,
          previous: s.net - s.netChange,
          releasedAt: (/* @__PURE__ */ new Date(s.reportDate + "T00:00:00Z")).toISOString(),
          period: `Week of ${s.reportDate}`,
          unit: "contracts",
          sourceTitle: s.market,
          sourceName: "CFTC Commitments of Traders (Legacy)",
          sourceUrl: "https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm",
          extra: { cotIndex52w: s.cotIndex52w, netChange: s.netChange, openInterest: s.openInterest }
        },
        components: [
          { key: "positioning", label: "COT Index (52w)", value: idxPart, weight: 0.6, detail: `COT Index ${s.cotIndex52w ?? "\u2014"} / 100` },
          { key: "momentum", label: "Weekly net change", value: chgPart, weight: 0.4, detail: `${s.netChange >= 0 ? "+" : ""}${s.netChange.toLocaleString()} contracts (${r22(s.netChange / (s.openInterest || 1) * 100)}% of OI)` }
        ],
        reasoning: `Net speculative position ${s.net.toLocaleString()} contracts (${s.netChange >= 0 ? "+" : ""}${s.netChange.toLocaleString()} w/w), COT Index ${s.cotIndex52w ?? "\u2014"}.${crowd ? " Positioning is at a 52-week extreme \u2014 crowded trades are prone to sharp reversals." : ""}`,
        ageDays: ageOf2(s.reportDate, ctx.now) - 3,
        intervalDays: 7
      };
    }
  };
}
function vixInd(polarity, weight, note, id = "vix") {
  return fredInd({
    id: `${id}_${polarity}_${++seq}`,
    name: "Risk Sentiment (VIX)",
    desc: "CBOE Volatility Index \u2014 the market\u2019s fear gauge. Spikes drive safe-haven flows.",
    series: "VIXCLS",
    days: 21,
    changeScale: 4,
    zWeight: 1,
    polarity,
    weight,
    polarityNote: note
  });
}
function policyDiffInd(country, ccy, real) {
  return {
    kind: "custom",
    id: `${real ? "real" : "nominal"}_diff_${country}`,
    freq: "Per meeting",
    polarity: 1,
    weight: real ? 2.5 : 3,
    name: real ? "Real Rate Differential" : "Rate Differential vs G8",
    desc: real ? "Policy rate minus headline CPI, compared with the G8 average. Capital flows to the highest real yield." : "This central bank\u2019s policy rate minus the average of the other G8 central banks \u2014 the carry a currency offers.",
    polarityNote: "Higher (real) rate than peers = bullish carry",
    compute: (ctx) => {
      const me = ctx.policy.get(country);
      if (!me || me.rate === null || real && me.cpi === null) return null;
      const peers = Array.from(ctx.policy.entries()).filter(([c, v]) => c !== country && v.rate !== null && (!real || v.cpi !== null));
      if (peers.length < 4) return null;
      const val = (v) => real ? v.rate - v.cpi : v.rate;
      const mine = val(me);
      const avg = peers.reduce((s, [, v]) => s + val(v), 0) / peers.length;
      const diff = mine - avg;
      const when = (real ? [me.rateEvent, me.cpiEvent] : [me.rateEvent]).filter(Boolean).map((e) => e.timestamp);
      return {
        observation: {
          actual: r22(mine),
          forecast: null,
          previous: null,
          releasedAt: new Date(Math.max(...when)).toISOString(),
          unit: "%",
          sourceTitle: real ? `${ccy} policy rate \u2212 CPI YoY` : `${ccy} policy rate`,
          sourceName: "Derived from TradingView calendar prints",
          sourceUrl: "https://www.tradingview.com/economic-calendar/",
          extra: { peerAverage: r22(avg), differential: r22(diff), peers: peers.length }
        },
        components: [{
          key: "differential",
          label: "Spread vs peers",
          value: squash(diff / 1.5),
          weight: 1,
          detail: `${r22(mine)}% vs G8 avg ${r22(avg)}% (${diff >= 0 ? "+" : ""}${r22(diff)}pp)`
        }],
        reasoning: real ? `${ccy} real policy rate is ${r22(mine)}% (rate ${me.rate}% \u2212 CPI ${me.cpi}%) vs a peer average of ${r22(avg)}% \u2192 ${diff >= 0 ? "+" : ""}${r22(diff)}pp.` : `${CENTRAL_BANK[ccy]} rate ${me.rate}% vs peer average ${r22(avg)}% \u2192 ${diff >= 0 ? "+" : ""}${r22(diff)}pp carry.`,
        ageDays: 0,
        intervalDays: 60
      };
    }
  };
}
function yieldSpreadInd(ccy, tenor, weight) {
  const usId = tenor === "2Y" ? "DGS2" : "DGS10";
  return {
    kind: "custom",
    id: `${ccy.toLowerCase()}_spread_${tenor.toLowerCase()}`,
    name: `${tenor} Yield Spread vs US`,
    freq: "Daily",
    weight,
    polarity: 1,
    desc: `${ccy} ${tenor} government bond yield minus the US Treasury ${tenor} yield. A widening spread in ${ccy}'s favour pulls in carry and capital flows.`,
    polarityNote: `Spread moving in ${ccy}'s favour (local yield rising vs US) = bullish ${ccy}`,
    compute: (ctx) => {
      const local = getYield(ccy, tenor);
      const us2 = getCachedFred(usId);
      if (local.length < 10 || us2.length < 10) return null;
      const usAt = (d) => {
        for (let i = us2.length - 1; i >= 0; i--) if (us2[i].date <= d) return us2[i].value;
        return null;
      };
      const spreads = local.map((p) => {
        const u = usAt(p.date);
        return u === null ? null : { date: p.date, local: p.value, us: u, v: p.value - u };
      }).filter((x) => x !== null);
      if (spreads.length < 10) return null;
      const last2 = spreads[spreads.length - 1];
      const target = new Date(last2.date).getTime() - 21 * DAY2;
      const prev = [...spreads].reverse().find((x) => new Date(x.date).getTime() <= target);
      if (!prev) return null;
      const recent = spreads.slice(-125);
      const avg = recent.reduce((a, x) => a + x.v, 0) / recent.length;
      const chg = last2.v - prev.v;
      const lvl = last2.v - avg;
      return {
        observation: {
          actual: r22(last2.v),
          forecast: null,
          previous: r22(prev.v),
          releasedAt: new Date(last2.date).toISOString(),
          period: last2.date,
          unit: "pp",
          sourceTitle: `${ccy} ${tenor} ${r22(last2.local)}% \u2212 US ${tenor} ${r22(last2.us)}%`,
          sourceName: yieldSourceOf(ccy) || "Official government bond yields",
          sourceUrl: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates",
          extra: { change21d: r22(chg), vs6mAverage: r22(lvl), local: r22(last2.local), us: r22(last2.us) }
        },
        components: [
          { key: "trend", label: "21-day change in spread", value: squash(chg / 0.25), weight: 1, detail: `${r22(prev.v)} \u2192 ${r22(last2.v)}pp (${chg >= 0 ? "+" : ""}${r22(chg)}pp)` },
          { key: "level", label: "Spread vs 6-month average", value: squash(lvl / 0.35), weight: 0.5, detail: `${r22(last2.v)}pp vs ${r22(avg)}pp average` }
        ],
        reasoning: `${ccy} ${tenor} yield ${r22(last2.local)}% vs US ${r22(last2.us)}% \u2192 spread ${r22(last2.v)}pp, ${chg >= 0 ? "widening" : "narrowing"} ${r22(Math.abs(chg))}pp over ~21 days.`,
        ageDays: ageOf2(last2.date, ctx.now) - 1,
        intervalDays: 4
      };
    }
  };
}
var HAWK = (ccy) => `Higher reading pushes the ${CENTRAL_BANK[ccy]} hawkish = bullish ${ccy}`;
var GROW = (ccy) => `Stronger growth supports higher rates = bullish ${ccy}`;
var JOBS_INV = (ccy) => `Higher reading = weaker labour market = bearish ${ccy}`;
function currencySpec(ccy) {
  const c = CURRENCY_COUNTRY[ccy];
  const tgt = INFLATION_TARGET[c];
  const gdp = GDP_ANCHOR[c];
  const inflLevel = { neutral: tgt, scale: 1.2, label: `${tgt}% ${CENTRAL_BANK[ccy]} target` };
  const monetary = [
    cal("policy_rate", c, 1, 3, `A hike / hawkish surprise by the ${CENTRAL_BANK[ccy]} = bullish ${ccy}`, { name: `${CENTRAL_BANK[ccy]} Rate Decision` }),
    policyDiffInd(c, ccy, false),
    policyDiffInd(c, ccy, true)
  ];
  {
    if (["EUR", "CAD", "JPY"].includes(ccy)) monetary.push(yieldSpreadInd(ccy, "2Y", 2.5));
    if (["EUR", "CAD", "JPY", "GBP"].includes(ccy)) monetary.push(yieldSpreadInd(ccy, "10Y", ccy === "JPY" ? 1 : 1.5));
  }
  if (ccy === "USD") {
    monetary.push(fredInd({
      id: "us2y",
      name: "2-Year Treasury Yield",
      desc: "The market\u2019s pricing of the Fed path over the next two years.",
      series: "DGS2",
      days: 21,
      changeScale: 0.2,
      polarity: 1,
      weight: 2.5,
      unit: "%",
      polarityNote: "Rising 2Y yield (fewer cuts priced) = bullish USD"
    }));
    monetary.push(us10y(1, 1.5, "Rising US long-term yields attract foreign capital = bullish USD", "usd_us10y"));
  }
  if (ccy === "JPY") monetary.push(us10y(-1, 2.5, "Rising US yields widen the gap with Japan = bearish JPY; falling US yields = bullish JPY", "jpy_us10y"));
  if (ccy === "CHF") monetary.push(us10y(-1, 1, "Rising US yields pull capital out of the low-yielding franc = bearish CHF", "chf_us10y"));
  const inflation = [
    cal("cpi_yoy", c, 1, 3, HAWK(ccy), { level: inflLevel }),
    cal("core_cpi_yoy", c, 1, 3, HAWK(ccy), { level: inflLevel }),
    cal("cpi_mom", c, 1, 1.5, HAWK(ccy)),
    cal("core_cpi_mom", c, 1, 1.5, HAWK(ccy)),
    cal("ppi", c, 1, 1, HAWK(ccy)),
    cal("wages", c, 1, 2, HAWK(ccy))
  ];
  if (ccy === "JPY") inflation.push(cal("tokyo_cpi", c, 1, 2, "Tokyo CPI leads the national figure by three weeks \u2014 a hotter print pushes the BoJ toward hikes = bullish JPY", { level: inflLevel }));
  if (ccy === "USD") {
    inflation.push(cal("pce_core_yoy", c, 1, 2.5, HAWK(ccy), { level: { neutral: 2, scale: 1, label: "2% Fed target" } }));
    inflation.push(cal("pce_core_mom", c, 1, 1.5, HAWK(ccy)));
    inflation.push(cal("infl_expect", c, 1, 1.5, "Rising consumer inflation expectations keep the Fed hawkish = bullish USD"));
  }
  const labour = [cal("unemployment", c, -1, 3, JOBS_INV(ccy))];
  if (ccy === "JPY") labour.push(cal("job_ratio", c, 1, 2, "More openings per applicant = tighter labour market = BoJ hikes = bullish JPY"));
  if (ccy === "USD") {
    labour.push(cal("nfp", c, 1, 3, "More jobs than expected = bullish USD"));
    labour.push(cal("claims", c, -1, 1.5, JOBS_INV(ccy)));
    labour.push(cal("jolts", c, 1, 1, "More openings = tighter labour market = bullish USD"));
    labour.push(cal("adp", c, 1, 0.75, "Stronger private hiring = bullish USD"));
  } else if (ccy === "GBP") {
    labour.push(cal("claimant_count", c, -1, 2, JOBS_INV(ccy)));
    labour.push(cal("employment_change", c, 1, 2, `More jobs = bullish ${ccy}`, { scale: EMPLOYMENT_SCALE.GB }));
  } else if (["CAD", "AUD", "NZD", "EUR"].includes(ccy)) {
    labour.push(cal("employment_change", c, 1, 3, `More jobs = bullish ${ccy}`, EMPLOYMENT_SCALE[c] ? { scale: EMPLOYMENT_SCALE[c] } : {}));
  }
  const growth = [
    cal("gdp", c, 1, 3, GROW(ccy), { scale: gdp.surprise, level: { neutral: gdp.neutral, scale: gdp.scale, label: `trend growth \u2248 ${gdp.neutral}%${c === "US" ? " annualized" : " q/q"}` } }),
    cal("mfg_pmi", c, 1, 2, GROW(ccy)),
    // No free source publishes a Swiss services PMI, and Australia's statistics office publishes no monthly industrial production —
    // those two are left out rather than shown as permanently empty (the business-survey indicator covers activity for both).
    ...ccy === "CHF" ? [] : [cal("services_pmi", c, 1, 2.5, GROW(ccy))],
    cal("retail_sales", c, 1, 2, GROW(ccy)),
    ...ccy === "AUD" ? [] : [cal("industrial_production", c, 1, 1, GROW(ccy))]
  ];
  if (ccy === "GBP" || ccy === "CAD") growth.push(cal("gdp_mom", c, 1, 1.5, GROW(ccy)));
  if (["EUR", "GBP", "JPY", "AUD", "NZD", "CHF"].includes(ccy)) growth.push(cal("activity_survey", c, 1, 2, `Stronger business conditions = stronger growth = bullish ${ccy}`));
  if (ccy === "USD") {
    growth.push(cal("regional_mfg", c, 1, 1.5, "Strong Empire/Philly manufacturing surveys point to a firm ISM = bullish USD"));
    growth.push(cal("durable_goods", c, 1, 1, "Rising durable-goods orders = capex and demand strength = bullish USD"));
  }
  if (ccy === "USD") growth.push(cal("housing", c, 1, 0.5, GROW(ccy)));
  const external = [
    cal("consumer_conf", c, 1, 2, `Confident households spend more = bullish ${ccy}`),
    cal("business_conf", ccy === "EUR" ? "DE" : c, 1, 2, `Stronger business sentiment = bullish ${ccy}`),
    cal("trade_balance", c, 1, 1, `Improving trade balance = structural demand for ${ccy}`)
  ];
  if (ccy === "CAD") {
    inflation.push(cal("cpi_median", c, 1, 2, "Bank of Canada CPI-median: hotter underlying inflation keeps the BoC hawkish = bullish CAD", { level: inflLevel }));
    inflation.push(cal("cpi_common", c, 1, 2, "Bank of Canada CPI-common: hotter broad price pressure = bullish CAD", { level: inflLevel }));
  }
  if (ccy === "AUD") inflation.push(cal("cpi_median", c, 1, 2, "RBA weighted-median CPI: hotter underlying inflation keeps the RBA hawkish = bullish AUD", { level: inflLevel }));
  if (ccy === "GBP") inflation.push(cal("services_infl", c, 1, 2.5, "Sticky services inflation keeps the BoE hawkish = bullish GBP", { level: { neutral: 3, scale: 1.5, label: "services inflation consistent with the 2% target \u2248 3%" } }));
  if (ccy === "NZD") inflation.push(cal("infl_expect_ctry", c, 1, 2, "Higher RBNZ survey inflation expectations keep the RBNZ hawkish = bullish NZD", { level: inflLevel }));
  if (ccy === "EUR") inflation.push(cal("infl_expect_ctry", c, 1, 1.5, "Rising euro-area consumer inflation expectations keep the ECB hawkish = bullish EUR", { use: ["surprise", "momentum"] }));
  if (["USD", "GBP", "CAD"].includes(ccy)) labour.push(cal("productivity", c, 1, 1, `Stronger productivity lifts growth without raising unit labour costs = bullish ${ccy}`, { use: ["surprise", "momentum"] }));
  if (["USD", "CAD"].includes(ccy)) growth.push(cal("capacity_util", c, 1, 1, `Higher capacity utilization = tighter supply and firmer growth = bullish ${ccy}`, { use: ["surprise", "momentum"] }));
  if (["USD", "GBP", "CAD"].includes(ccy)) growth.push(cal("house_prices", c, 1, 1, `Rising house prices lift household wealth and spending = bullish ${ccy}`));
  if (["CAD", "NZD", "AUD"].includes(ccy)) growth.push(cal("permits_chg", c, 1, 0.75, `More building approvals = stronger construction demand = bullish ${ccy}`));
  if (ccy === "AUD") growth.push(cal("credit_growth", c, 1, 1, "Faster private-sector credit growth = stronger spending = bullish AUD"));
  if (ccy === "EUR") {
    growth.push(cal("ec_industry", c, 1, 1.5, "Stronger European Commission industry sentiment (free counterpart of the manufacturing PMI) = bullish EUR", { use: ["surprise", "momentum"] }));
    growth.push(cal("ec_services", c, 1, 1.5, "Stronger European Commission services sentiment (free counterpart of the services PMI) = bullish EUR", { use: ["surprise", "momentum"] }));
    external.push(cal("investor_conf", c, 1, 1.25, "Higher Sentix investor confidence = firmer euro-area growth expectations = bullish EUR", { use: ["surprise", "momentum"] }));
  }
  if (ccy !== "CHF") external.push(cal("current_account", c, 1, 1, `A stronger current-account position means structural demand for ${ccy}`));
  if (["USD", "JPY", "CHF"].includes(ccy)) external.push(vixInd(1, ccy === "USD" ? 1 : 2.5, `Rising fear drives safe-haven demand = bullish ${ccy}`));
  if (["AUD", "NZD", "CAD"].includes(ccy)) external.push(vixInd(-1, 2, `Rising fear hurts risk-sensitive ${ccy}`));
  if (ccy === "AUD" || ccy === "NZD") external.push(cal("mfg_pmi", "CN", 1, 2.5, `China is the largest export market \u2014 stronger Chinese factories = bullish ${ccy}`, { name: "China Manufacturing PMI (terms of trade)" }));
  if (ccy === "AUD") {
    external.push(ironOrePx(2.5, "Iron ore is Australia\u2019s largest export \u2014 rising prices = bullish AUD", "aud_iron"));
    external.push(copperPx(1.5, "Rising industrial-metal prices improve Australia\u2019s terms of trade = bullish AUD", "aud_copper"));
    external.push(cal("retail_sales", "CN", 1, 1, "Stronger Chinese demand = bullish AUD", { name: "China Retail Sales" }));
  }
  if (ccy === "NZD") external.push(cal("dairy_auction", "NZ", 1, 2.5, "Dairy is New Zealand\u2019s largest export \u2014 rising auction prices = bullish NZD"));
  if (ccy === "JPY") external.push(fredInd({
    id: "jpy_wti",
    name: "Crude Oil (import bill)",
    desc: "Japan imports almost all of its energy; dearer oil worsens its trade balance.",
    series: "DCOILWTICO",
    days: 21,
    changeScale: 6,
    pct: true,
    polarity: -1,
    weight: 1.5,
    polarityNote: "Rising oil = larger import bill = bearish JPY"
  }));
  if (ccy === "EUR") {
    external.push(cal("industrial_production", "DE", 1, 1, "Germany is the euro area\u2019s largest economy \u2014 stronger output = bullish EUR", { name: "German Industrial Production" }));
    external.push(priceInd({ id: "eur_gas", name: "Natural Gas Price (energy import bill)", desc: "Europe is a large net energy importer; gas-price spikes hit its trade balance and growth.", symbol: "NATGAS", days: 21, changeScale: 12, polarity: -1, weight: 0.75, polarityNote: "Rising gas prices = bearish EUR" }));
  }
  if (ccy === "CAD") external.push(cal("mfg_pmi", "US", 1, 1.5, "About three-quarters of Canada\u2019s exports go to the US \u2014 stronger US industry = bullish CAD", { name: "US ISM Manufacturing PMI (main export market)" }));
  if (ccy === "CAD") external.push(fredInd({
    id: "cad_wti",
    name: "Crude Oil (terms of trade)",
    desc: "Oil is Canada\u2019s largest export; WTI strength improves Canada\u2019s terms of trade.",
    series: "DCOILWTICO",
    days: 21,
    changeScale: 6,
    pct: true,
    polarity: 1,
    weight: 2.5,
    polarityNote: "Rising oil = bullish CAD"
  }));
  return {
    symbol: ccy,
    name: { USD: "US Dollar", EUR: "Euro", GBP: "British Pound", JPY: "Japanese Yen", CHF: "Swiss Franc", CAD: "Canadian Dollar", AUD: "Australian Dollar", NZD: "New Zealand Dollar" }[ccy],
    assetClass: "FOREX",
    meta: { centralBank: CENTRAL_BANK[ccy], country: c, inflationTarget: tgt },
    pillars: [
      { id: "monetary", name: "Monetary Policy", desc: "Policy rate path, rate & real-rate differentials \u2014 the #1 driver of currency value.", weight: 30, indicators: monetary },
      { id: "inflation", name: "Inflation", desc: "Price pressure determines how hawkish the central bank must be.", weight: 20, indicators: inflation },
      { id: "labour", name: "Labour Market", desc: "Jobs and unemployment \u2014 the second half of most central-bank mandates.", weight: 18, indicators: labour },
      { id: "growth", name: "Economic Growth", desc: "Output, activity surveys and consumer spending.", weight: 17, indicators: growth },
      { id: "external", name: "Confidence, Trade & Risk", desc: "Sentiment surveys, trade flows, terms of trade and global risk appetite.", weight: 7, indicators: external },
      { id: "positioning", name: "Institutional Positioning", desc: "CFTC COT: how hedge funds and large speculators are positioned.", weight: 8, indicators: [cotInd(ccy, 1, ccy === "USD" ? "US Dollar Index" : `${ccy} futures`)] }
    ]
  };
}
var CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];
var realYield = (pol, w) => fredInd({
  id: `ry_${pol}_${++seq}`,
  name: "US 10Y Real Yield (TIPS)",
  desc: "Inflation-adjusted Treasury yield \u2014 the opportunity cost of holding non-yielding assets.",
  series: "DFII10",
  days: 21,
  changeScale: 0.15,
  zWeight: 0.6,
  polarity: pol,
  weight: w,
  unit: "%",
  polarityNote: pol < 0 ? "Falling real yields = bullish" : "Rising real yields = bullish"
});
var fedPath = (pol, w) => fredInd({
  id: `fp_${pol}_${++seq}`,
  name: "Fed Path (2Y Treasury)",
  desc: "2-year yield change \u2014 market pricing of Fed hikes/cuts.",
  series: "DGS2",
  days: 21,
  changeScale: 0.2,
  polarity: pol,
  weight: w,
  unit: "%",
  polarityNote: pol < 0 ? "Falling 2Y (more cuts priced) = bullish" : "Rising 2Y = bullish"
});
var breakevens = (w) => fredInd({
  id: `be_${++seq}`,
  name: "10Y Breakeven Inflation",
  desc: "Market-implied inflation expectations.",
  series: "T10YIE",
  days: 21,
  changeScale: 0.1,
  polarity: 1,
  weight: w,
  unit: "%",
  polarityNote: "Rising inflation expectations = bullish for hard assets"
});
var hyOas = (pol, w) => fredInd({
  id: `hy_${pol}_${++seq}`,
  name: "High-Yield Credit Spread",
  desc: "Extra yield on junk bonds over Treasuries \u2014 widens in stress.",
  series: "BAMLH0A0HYM2",
  days: 21,
  changeScale: 0.3,
  zWeight: 0.5,
  polarity: pol,
  weight: w,
  unit: "%",
  polarityNote: pol > 0 ? "Widening spreads (stress) = bullish safe haven" : "Widening spreads (stress) = bearish"
});
var nfci = (pol, w) => fredInd({
  id: `nf_${pol}_${++seq}`,
  name: "Financial Conditions (NFCI)",
  desc: "Chicago Fed index \u2014 positive = tighter-than-average conditions.",
  series: "NFCI",
  days: 28,
  changeScale: 0.1,
  polarity: pol,
  weight: w,
  interval: 7,
  polarityNote: pol > 0 ? "Tightening conditions = bullish safe haven" : "Tightening conditions = bearish"
});
var fedBs = (w) => fredInd({
  id: `bs_${++seq}`,
  name: "Fed Balance Sheet (Liquidity)",
  desc: "Total Fed assets \u2014 expansion adds liquidity to markets.",
  series: "WALCL",
  days: 28,
  changeScale: 0.8,
  pct: true,
  polarity: 1,
  weight: w,
  interval: 7,
  polarityNote: "Expanding balance sheet = more liquidity = bullish"
});
var usdInverse = (weight) => ({
  id: "usd",
  name: "US Dollar Fundamentals (inverse)",
  desc: "Priced in dollars: a fundamentally stronger USD is a headwind, a weaker USD a tailwind.",
  weight,
  indicators: [],
  mirror: { asset: "USD", sign: -1 }
});
function commodity(symbol, name, own) {
  const ownW = own.reduce((s, p) => s + p.weight, 0);
  return { symbol, name, assetClass: "COMMODITIES", pillars: [...own, usdInverse(ownW)], meta: { quote: "USD" } };
}
var chinaPmi = (w) => cal("mfg_pmi", "CN", 1, w, "Stronger Chinese manufacturing = more metal demand = bullish", { name: "China Manufacturing PMI" });
var usIsm = (w) => cal("mfg_pmi", "US", 1, w, "Stronger US industry = more demand = bullish", { name: "US ISM Manufacturing PMI" });
var euPmi = (w) => cal("mfg_pmi", "EU", 1, w, "Stronger European industry = more demand = bullish", { name: "Euro Area Manufacturing PMI" });
var COMMODITY_SPECS = [
  commodity("XAU", "Gold", [
    {
      id: "rates",
      name: "Real Rates & Fed Path",
      desc: "Gold pays no yield; falling real rates cut the cost of holding it. (Breakevens sit in the inflation pillar so inflation expectations are not counted twice.)",
      weight: 30,
      indicators: [realYield(-1, 4), fedPath(-1, 2)]
    },
    {
      id: "dollar",
      name: "Dollar Momentum",
      desc: "Market-based trend of the broad trade-weighted dollar (FRED, daily) \u2014 gold is priced in dollars, so a falling dollar lifts it independent of the fundamental USD score.",
      weight: 12,
      indicators: [fredInd({
        id: "gold_broad_usd",
        name: "Broad Dollar Index Trend",
        desc: "Nominal Broad US Dollar Index (Fed, trade-weighted), 21-day change.",
        series: "DTWEXBGS",
        days: 21,
        changeScale: 1.2,
        pct: true,
        zWeight: 0.5,
        polarity: -1,
        weight: 3,
        polarityNote: "Falling dollar = bullish gold; rising dollar = bearish gold"
      })]
    },
    {
      id: "risk",
      name: "Safe-Haven Demand",
      desc: "Stress in equity, credit and gold-volatility markets drives haven buying.",
      weight: 16,
      indicators: [
        vixInd(1, 2, "Rising fear = safe-haven demand = bullish gold"),
        hyOas(1, 2),
        nfci(1, 1),
        fredInd({
          id: "gold_gvz",
          name: "Gold Volatility (GVZ)",
          desc: "CBOE Gold ETF Volatility Index \u2014 the market\u2019s measure of uncertainty specifically in gold.",
          series: "GVZCLS",
          days: 21,
          changeScale: 3,
          zWeight: 0.8,
          polarity: 1,
          weight: 1,
          polarityNote: "Rising gold volatility = rising uncertainty and haven demand = mildly bullish gold"
        })
      ]
    },
    {
      id: "inflation",
      name: "Inflation Hedge",
      desc: "Sticky inflation and rising inflation expectations increase demand for real assets.",
      weight: 12,
      indicators: [
        cal("core_cpi_yoy", "US", 1, 2, "Hotter US core inflation = inflation-hedge demand = bullish gold", { level: { neutral: 2, scale: 1, label: "2% target" } }),
        breakevens(1.5),
        fredInd({ id: "gold_5y5y", name: "5Y5Y Forward Inflation", desc: "Long-run inflation expectations.", series: "T5YIFR", days: 21, changeScale: 0.1, polarity: 1, weight: 0.75, unit: "%", polarityNote: "Rising long-run expectations = bullish gold" }),
        cal("infl_expect", "US", 1, 1, "Rising consumer inflation expectations = bullish gold")
      ]
    },
    { id: "positioning", name: "Institutional Positioning", desc: "Managed-money positioning in COMEX gold futures.", weight: 20, indicators: [cotInd("XAU", 1, "Gold")] }
  ]),
  commodity("XAG", "Silver", [
    { id: "rates", name: "Real Rates & Fed Path", desc: "Monetary-metal component.", weight: 25, indicators: [realYield(-1, 3), fedPath(-1, 2)] },
    { id: "industrial", name: "Industrial Demand", desc: "~55% of silver demand is industrial (solar, electronics).", weight: 25, indicators: [usIsm(2), chinaPmi(2.5), euPmi(1.5)] },
    { id: "risk", name: "Safe-Haven Demand", desc: "Haven flows (weaker than gold).", weight: 10, indicators: [vixInd(1, 1, "Rising fear = mild haven demand")] },
    { id: "positioning", name: "Institutional Positioning", desc: "COMEX silver speculators.", weight: 20, indicators: [cotInd("XAG", 1, "Silver")] }
  ]),
  commodity("XPT", "Platinum", [
    { id: "industrial", name: "Industrial & Auto Demand", desc: "Autocatalysts and industry dominate platinum demand.", weight: 40, indicators: [chinaPmi(2.5), euPmi(2), usIsm(1.5)] },
    { id: "rates", name: "Real Rates", desc: "Precious-metal component.", weight: 15, indicators: [realYield(-1, 1)] },
    { id: "positioning", name: "Institutional Positioning", desc: "NYMEX platinum speculators.", weight: 25, indicators: [cotInd("XPT", 1, "Platinum")] }
  ]),
  commodity("XCU", "Copper", [
    {
      id: "china",
      name: "China Demand",
      desc: "China consumes over half the world\u2019s copper.",
      weight: 35,
      indicators: [
        chinaPmi(3),
        cal("industrial_production", "CN", 1, 2, "Stronger Chinese output = bullish copper", { name: "China Industrial Production" }),
        cal("retail_sales", "CN", 1, 1, "Stronger Chinese consumption = bullish copper", { name: "China Retail Sales" })
      ]
    },
    { id: "global", name: "Global Manufacturing", desc: "Copper is the bellwether of global industry.", weight: 20, indicators: [usIsm(2), euPmi(2)] },
    { id: "risk", name: "Risk Appetite", desc: "Cyclical asset \u2014 suffers when stress rises.", weight: 15, indicators: [vixInd(-1, 1, "Rising fear = bearish cyclical metals"), hyOas(-1, 1)] },
    { id: "positioning", name: "Institutional Positioning", desc: "COMEX copper speculators.", weight: 20, indicators: [cotInd("XCU", 1, "Copper")] }
  ]),
  commodity("WTI", "WTI Crude Oil", [
    {
      id: "supply",
      name: "Supply & Inventories",
      desc: "Weekly US inventory and drilling data from EIA, API and Baker Hughes.",
      weight: 35,
      indicators: [
        cal("eia_crude", "US", -1, 3, "Inventory build (more supply) = bearish oil; a draw = bullish"),
        cal("api_crude", "US", -1, 1.5, "Inventory build = bearish oil"),
        cal("eia_gasoline", "US", -1, 1.5, "Gasoline build = weaker demand = bearish oil"),
        cal("rig_count", "US", -1, 1, "More rigs = more future supply = bearish oil", { use: ["momentum"] })
      ]
    },
    { id: "demand", name: "Global Demand", desc: "Industrial activity in the three largest economies.", weight: 25, indicators: [usIsm(2), chinaPmi(2.5), euPmi(1.5)] },
    { id: "risk", name: "Risk Appetite", desc: "Oil trades as a growth asset.", weight: 10, indicators: [hyOas(-1, 1), vixInd(-1, 1, "Rising fear = bearish oil")] },
    { id: "positioning", name: "Institutional Positioning", desc: "NYMEX crude speculators.", weight: 20, indicators: [cotInd("WTI", 1, "Crude Oil")] }
  ]),
  commodity("NATGAS", "Natural Gas", [
    {
      id: "storage",
      name: "Storage",
      desc: "EIA weekly storage vs. expectations is the key fundamental driver.",
      weight: 60,
      indicators: [cal("eia_natgas", "US", -1, 1, "Larger injection / smaller draw than expected = bearish gas")]
    },
    { id: "positioning", name: "Institutional Positioning", desc: "NYMEX natural gas speculators.", weight: 40, indicators: [cotInd("NATGAS", 1, "Natural Gas")] }
  ])
];
var EQ_GROW = "Stronger activity = higher earnings = bullish equities";
var EQ_HAWK = "Higher inflation / rates = tighter policy = bearish equities";
function usIndex(symbol, name, cotKey2, rateSensitivity) {
  return {
    symbol,
    name,
    assetClass: "INDICES",
    meta: { region: "United States" },
    pillars: [
      { id: "growth", name: "Growth & Earnings Backdrop", desc: "US activity data that drives corporate revenue.", weight: 25, indicators: [
        cal("mfg_pmi", "US", 1, 2, EQ_GROW, { name: "ISM Manufacturing PMI" }),
        cal("services_pmi", "US", 1, 2.5, EQ_GROW, { name: "ISM Services PMI" }),
        cal("retail_sales", "US", 1, 2, EQ_GROW),
        cal("nfp", "US", 1, 1.5, "Solid job growth supports spending = bullish"),
        cal("gdp", "US", 1, 1.5, EQ_GROW, { scale: 0.5, level: { neutral: 2, scale: 1.5, label: "trend \u2248 2% annualized" } }),
        cal("claims", "US", -1, 1, "Rising layoffs = bearish equities")
      ] },
      { id: "policy", name: "Rates & Fed Policy", desc: "Discount rates and the Fed path drive valuations.", weight: 20 * rateSensitivity, indicators: [
        cal("policy_rate", "US", -1, 2, "A Fed hike = bearish equities; a cut = bullish"),
        fedPath(-1, 2),
        realYield(-1, 2.5)
      ] },
      { id: "inflation", name: "Inflation", desc: "Inflation surprises move rate expectations.", weight: 10, indicators: [
        cal("core_cpi_yoy", "US", -1, 2, EQ_HAWK, { use: ["surprise", "momentum"] }),
        cal("pce_core_mom", "US", -1, 1, EQ_HAWK, { use: ["surprise", "momentum"] })
      ] },
      { id: "risk", name: "Risk & Credit", desc: "Volatility and credit spreads lead equity drawdowns.", weight: 20, indicators: [
        vixInd(-1, 2, "Rising volatility = bearish equities"),
        hyOas(-1, 2),
        nfci(-1, 1)
      ] },
      { id: "consumer", name: "Consumer", desc: "Household spending is about two-thirds of the US economy.", weight: 7, indicators: [
        cal("consumer_conf", "US", 1, 1, "Confident consumers spend more = bullish equities")
      ] },
      { id: "liquidity", name: "Liquidity", desc: "Central-bank balance-sheet liquidity.", weight: 8, indicators: [fedBs(1)] },
      { id: "positioning", name: "Institutional Positioning", desc: "CFTC COT in index futures.", weight: 10, indicators: [cotInd(cotKey2, 1, name)] }
    ]
  };
}
function intlIndex(symbol, name, country, region, extra = [], bizCountry = country) {
  return {
    symbol,
    name,
    assetClass: "INDICES",
    meta: { region },
    pillars: [
      { id: "growth", name: "Domestic Growth", desc: `${region} activity data.`, weight: 28, indicators: [
        cal("mfg_pmi", country, 1, 2, EQ_GROW),
        cal("services_pmi", country, 1, 2, EQ_GROW),
        cal("gdp", country, 1, 1.5, EQ_GROW, { level: null }),
        cal("retail_sales", country, 1, 1, EQ_GROW),
        cal("business_conf", bizCountry, 1, 2, "Stronger business sentiment = bullish equities"),
        cal("unemployment", country, -1, 1, "Rising unemployment = bearish equities")
      ] },
      { id: "policy", name: "Central Bank Policy", desc: "Domestic policy rate path.", weight: 18, indicators: [
        cal("policy_rate", country, -1, 2, "A hike = bearish equities; a cut = bullish"),
        cal("core_cpi_yoy", country, -1, 1.5, EQ_HAWK, { use: ["surprise", "momentum"] })
      ] },
      { id: "global", name: "Global Demand & Risk", desc: "US cycle and global risk appetite.", weight: 22, indicators: [
        cal("mfg_pmi", "US", 1, 1.5, "Stronger US industry = stronger export demand", { name: "US ISM Manufacturing PMI" }),
        vixInd(-1, 2, "Rising volatility = bearish equities"),
        hyOas(-1, 1)
      ] },
      ...extra
    ]
  };
}
var INDEX_SPECS = [
  usIndex("US500", "S&P 500", "US500", 1),
  usIndex("US100", "Nasdaq 100", "US100", 1.4),
  usIndex("US30", "Dow Jones 30", "US30", 0.8),
  intlIndex("GER40", "DAX 40", "EU", "Germany / Euro Area", [
    { id: "china", name: "China Exposure", desc: "German exporters are highly exposed to Chinese demand.", weight: 8, indicators: [chinaPmi(1)] },
    { id: "euro", name: "Euro (inverse)", desc: "DAX companies earn most of their revenue outside Germany; a weaker euro lifts those earnings.", weight: 6, indicators: [], mirror: { asset: "EUR", sign: -1 } }
  ], "DE"),
  intlIndex("UK100", "FTSE 100", "GB", "United Kingdom", [
    { id: "commodities", name: "Commodity Earnings", desc: "Energy and mining are a large share of FTSE earnings.", weight: 10, indicators: [
      fredInd({ id: "ftse_wti", name: "Crude Oil Trend", desc: "Oil majors\u2019 earnings track crude.", series: "DCOILWTICO", days: 21, changeScale: 6, pct: true, polarity: 1, weight: 1, polarityNote: "Rising oil = higher energy earnings = bullish FTSE" }),
      chinaPmi(1),
      copperPx(1, "Rising metal prices = higher mining earnings = bullish FTSE", "ftse_copper")
    ] },
    { id: "pound", name: "Pound (inverse)", desc: "About three-quarters of FTSE 100 revenue is earned abroad; a weaker pound inflates it in sterling terms.", weight: 10, indicators: [], mirror: { asset: "GBP", sign: -1 } }
  ]),
  intlIndex("JP225", "Nikkei 225", "JP", "Japan", [
    { id: "yen", name: "Yen (inverse)", desc: "A weaker yen boosts Japanese exporters\u2019 earnings.", weight: 12, indicators: [], mirror: { asset: "JPY", sign: -1 } },
    { id: "positioning", name: "Institutional Positioning", desc: "CFTC COT in CME Nikkei 225 (yen) futures.", weight: 10, indicators: [cotInd("JP225", 1, "Nikkei 225")] }
  ]),
  intlIndex("AUS200", "ASX 200", "AU", "Australia", [
    { id: "china", name: "China & Resources", desc: "Miners dominate the ASX; China is the key customer.", weight: 14, indicators: [
      chinaPmi(1.5),
      ironOrePx(2, "Rising iron ore = higher miner earnings (BHP, Rio, Fortescue) = bullish ASX", "asx_iron"),
      copperPx(1, "Rising copper = higher miner earnings = bullish ASX", "asx_copper")
    ] }
  ])
];
function retailContrarian(symbol, weight) {
  return {
    kind: "custom",
    id: `retail_${symbol}`,
    name: "Retail Long/Short Ratio",
    freq: "Live",
    polarity: 1,
    weight,
    desc: "Share of retail futures accounts long vs short. Crowds are usually wrong at extremes, so this is read contrarian.",
    polarityNote: "Crowd heavily long = bearish (contrarian); crowd short = bullish",
    compute: (ctx) => {
      const live = getCachedSentiment()?.rows.find((r) => r.symbol === symbol && r.method === "measured");
      const item = live ? {
        longPct: live.longPct,
        shortPct: live.shortPct,
        timestamp: Date.parse(live.updatedAt) || ctx.now,
        traderGroup: "futures accounts",
        source: (live.sources || []).map((x) => x.name).join(" / ") || "Exchanges",
        sourceUrl: "https://www.okx.com/trade-market/data"
      } : sentimentStorage.getAllItems().items.find((i) => i.symbol === symbol && !i.isUnavailable);
      if (!item) return null;
      const v = (item.shortPct - item.longPct) / 100;
      return {
        observation: {
          actual: item.longPct,
          forecast: null,
          previous: null,
          releasedAt: new Date(item.timestamp).toISOString(),
          unit: "% long",
          sourceTitle: item.traderGroup,
          sourceName: item.source,
          sourceUrl: item.sourceUrl,
          extra: { shortPct: item.shortPct }
        },
        components: [{ key: "positioning", label: "Contrarian crowd read", value: clamp(v * 1.6), weight: 1, detail: `${item.longPct}% long / ${item.shortPct}% short` }],
        reasoning: `${item.longPct}% of ${item.traderGroup} are long, ${item.shortPct}% short.`,
        ageDays: (ctx.now - item.timestamp) / DAY2,
        intervalDays: 0.1
      };
    }
  };
}
function cryptoSpec(asset, name) {
  const own = [
    { id: "liquidity", name: "Macro Liquidity", desc: "Crypto is the most liquidity-sensitive asset class.", weight: 30, indicators: [
      realYield(-1, 2),
      fedBs(1.5),
      nfci(-1, 1),
      {
        kind: "custom",
        id: `stables_${asset}`,
        name: "Stablecoin Supply (30d)",
        freq: "Daily",
        polarity: 1,
        weight: 2,
        desc: "Total USD stablecoins in circulation \u2014 the \u201Cdry powder\u201D on crypto exchanges.",
        polarityNote: "Growing stablecoin supply = new capital = bullish",
        compute: (ctx) => {
          const s = getStables();
          if (s.length < 31) return null;
          const last2 = s[s.length - 1];
          const prev = s[s.length - 31];
          const pct2 = (last2.value - prev.value) / prev.value * 100;
          return {
            observation: {
              actual: last2.value,
              forecast: null,
              previous: prev.value,
              releasedAt: new Date(last2.date).toISOString(),
              unit: "USD",
              sourceTitle: "Total stablecoins circulating",
              sourceName: "DefiLlama",
              sourceUrl: "https://defillama.com/stablecoins",
              extra: { change30dPct: r22(pct2) }
            },
            components: [{ key: "trend", label: "30-day change", value: squash(pct2 / 3), weight: 1, detail: `${pct2 >= 0 ? "+" : ""}${r22(pct2)}% in 30 days` }],
            reasoning: `Stablecoin supply $${(last2.value / 1e9).toFixed(1)}B, ${pct2 >= 0 ? "+" : ""}${r22(pct2)}% over 30 days.`,
            ageDays: ageOf2(last2.date, ctx.now),
            intervalDays: 2
          };
        }
      }
    ] },
    { id: "derivatives", name: "Derivatives & Positioning", desc: "Perpetual-swap funding and institutional (CME) positioning.", weight: 25, indicators: [
      {
        kind: "custom",
        id: `funding_${asset}`,
        name: "Perpetual Funding Rate",
        freq: "Live",
        polarity: 1,
        weight: 2,
        desc: "What longs pay shorts every 8h. Neutral \u2248 0.01%. Very high funding = over-leveraged longs (squeeze risk down); negative = crowded shorts.",
        polarityNote: "Funding far above neutral = bearish (contrarian); negative funding = bullish",
        compute: (ctx) => {
          const d = getDeriv(asset);
          if (!d || d.fundingRate === null) return null;
          const f = d.fundingRate;
          const oiChg = d.oiNow && d.oi7dAgo ? (d.oiNow - d.oi7dAgo) / d.oi7dAgo * 100 : null;
          return {
            observation: {
              actual: r22(f * 100 * 1e3) / 1e3,
              forecast: null,
              previous: null,
              releasedAt: d.at,
              unit: "% / 8h",
              sourceTitle: `${asset}USDT perpetual`,
              sourceName: d.via,
              sourceUrl: d.via === "Bybit" ? "https://www.bybit.com/en/announcement-info/fund-rate/" : d.via === "Hyperliquid" ? "https://app.hyperliquid.xyz/fundingComparison" : "https://www.binance.com/en/futures/funding-history",
              extra: { openInterest7dChangePct: oiChg === null ? null : r22(oiChg) }
            },
            components: [{ key: "positioning", label: "Funding vs neutral", value: -squash((f - 1e-4) / 25e-5), weight: 1, detail: `${(f * 100).toFixed(4)}% per 8h (neutral 0.0100%)` }],
            reasoning: `Funding ${(f * 100).toFixed(4)}%/8h on ${d.via}${oiChg !== null ? `; open interest ${oiChg >= 0 ? "+" : ""}${r22(oiChg)}% in 7 days` : ""}.`,
            ageDays: (ctx.now - new Date(d.at).getTime()) / DAY2,
            intervalDays: 0.1
          };
        }
      },
      ...asset === "BTC" || asset === "ETH" || asset === "XRP" ? [cotInd(asset, 1.5, `${name} (CME)`)] : []
    ] },
    { id: "sentiment", name: "Crowd Sentiment", desc: "Contrarian sentiment gauges.", weight: 20, indicators: [
      {
        kind: "custom",
        id: `fng_${asset}`,
        name: "Crypto Fear & Greed Index",
        freq: "Daily",
        polarity: 1,
        weight: 2,
        desc: "0 = extreme fear, 100 = extreme greed. Read contrarian: \u201Cbe greedy when others are fearful\u201D.",
        polarityNote: "Extreme fear = bullish (contrarian); extreme greed = bearish",
        compute: (ctx) => {
          const f = getFng();
          if (!f.length) return null;
          const last2 = f[f.length - 1];
          const wk = f.length > 7 ? f[f.length - 8] : null;
          return {
            observation: {
              actual: last2.value,
              forecast: null,
              previous: wk?.value ?? null,
              releasedAt: new Date(last2.date).toISOString(),
              unit: "/100",
              sourceTitle: "Fear & Greed Index",
              sourceName: "alternative.me",
              sourceUrl: "https://alternative.me/crypto/fear-and-greed-index/"
            },
            components: [{ key: "level", label: "Contrarian level", value: squash((50 - last2.value) / 25), weight: 1, detail: `${last2.value}/100 (${last2.value <= 25 ? "extreme fear" : last2.value < 45 ? "fear" : last2.value <= 55 ? "neutral" : last2.value < 75 ? "greed" : "extreme greed"})` }],
            reasoning: `Fear & Greed at ${last2.value}/100${wk ? ` (week ago ${wk.value})` : ""}.`,
            ageDays: ageOf2(last2.date, ctx.now),
            intervalDays: 1.5
          };
        }
      },
      retailContrarian(`${asset}USDT`, 1.5)
    ] },
    { id: "risk", name: "Risk Appetite", desc: "Crypto trades with high-beta risk assets.", weight: 10, indicators: [vixInd(-1, 1, "Rising fear = bearish crypto"), hyOas(-1, 1)] }
  ];
  if (asset === "BTC") {
    own.push({ id: "network", name: "Network Fundamentals", desc: "Miner investment and network security.", weight: 15, indicators: [{
      kind: "custom",
      id: "btc_hash",
      name: "Hash Rate (30d)",
      freq: "Daily",
      polarity: 1,
      weight: 1,
      desc: "Total mining power securing Bitcoin \u2014 rising hash rate reflects miner conviction and investment.",
      polarityNote: "Rising hash rate = bullish network health",
      compute: (ctx) => {
        const h = getHashrate();
        if (h.length < 35) return null;
        const avg = (a) => a.reduce((s, p) => s + p.value, 0) / a.length;
        const now7 = avg(h.slice(-7));
        const then7 = avg(h.slice(-37, -30));
        const pct2 = (now7 - then7) / then7 * 100;
        const last2 = h[h.length - 1];
        return {
          observation: {
            actual: Math.round(now7),
            forecast: null,
            previous: Math.round(then7),
            releasedAt: new Date(last2.date).toISOString(),
            unit: "TH/s (7d avg)",
            sourceTitle: "Hash rate",
            sourceName: "blockchain.com",
            sourceUrl: "https://www.blockchain.com/explorer/charts/hash-rate"
          },
          components: [{ key: "trend", label: "30-day change (7d avg)", value: squash(pct2 / 5), weight: 1, detail: `${pct2 >= 0 ? "+" : ""}${r22(pct2)}%` }],
          reasoning: `7-day average hash rate ${pct2 >= 0 ? "up" : "down"} ${Math.abs(r22(pct2))}% vs a month ago.`,
          ageDays: ageOf2(last2.date, ctx.now),
          intervalDays: 2
        };
      }
    }] });
  }
  const ownW = own.reduce((s, p) => s + p.weight, 0);
  return { symbol: asset, name, assetClass: "CRYPTO", pillars: [...own, usdInverse(ownW * 0.5)], meta: { quote: "USD" } };
}
var CRYPTO_SPECS = [
  cryptoSpec("BTC", "Bitcoin"),
  cryptoSpec("ETH", "Ethereum"),
  cryptoSpec("XRP", "XRP"),
  cryptoSpec("SOL", "Solana"),
  cryptoSpec("BNB", "BNB"),
  cryptoSpec("DOGE", "Dogecoin"),
  cryptoSpec("ADA", "Cardano"),
  cryptoSpec("LINK", "Chainlink")
];
function pctChange(a, b) {
  return b !== 0 ? (a - b) / Math.abs(b) * 100 : null;
}
function filingInd(ticker, id, name, desc, weight, note, fn) {
  return {
    kind: "custom",
    id: `${ticker}_${id}`,
    name,
    desc,
    freq: "Quarterly",
    polarity: 1,
    weight,
    polarityNote: note,
    compute: (ctx) => {
      const f = getStockFundamentals(ticker);
      if (!f) return null;
      const r = fn(f);
      if (!r) return null;
      return {
        observation: {
          actual: r.actual,
          forecast: null,
          previous: r.previous,
          releasedAt: new Date(r.asOf).toISOString(),
          unit: r.unit,
          sourceTitle: `${ticker} ${r.form}`,
          sourceName: "SEC EDGAR (XBRL company facts)",
          sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=10-Q`
        },
        components: [{ key: "trend", label: name, value: r.value, weight: 1, detail: r.detail }],
        reasoning: r.reasoning,
        ageDays: ageOf2(r.asOf, ctx.now),
        intervalDays: 100
      };
    }
  };
}
function stockSpec(s) {
  const t = s.ticker;
  return {
    symbol: t,
    name: s.name,
    assetClass: "STOCKS",
    meta: coreStockMeta(s),
    pillars: [
      { id: "growth", name: "Revenue & Earnings Growth", desc: "Year-over-year growth in the latest reported quarter.", weight: 35, indicators: [
        filingInd(t, "rev", "Revenue Growth (YoY)", "Latest quarter revenue vs the same quarter a year earlier.", 3, "Faster growth = bullish", (f) => {
          if (!f.revenue?.yearAgo) return null;
          const g = pctChange(f.revenue.latest.val, f.revenue.yearAgo.val);
          if (g === null) return null;
          return {
            value: squash((g - 5) / 10),
            detail: `${r22(g)}% YoY (${f.revenue.latest.frame})`,
            reasoning: `Revenue $${(f.revenue.latest.val / 1e9).toFixed(2)}B in ${f.revenue.latest.frame}, ${g >= 0 ? "+" : ""}${r22(g)}% YoY.`,
            actual: f.revenue.latest.val,
            previous: f.revenue.yearAgo.val,
            unit: "USD",
            asOf: f.revenue.latest.filed,
            form: f.revenue.latest.form
          };
        }),
        filingInd(t, "eps", "Diluted EPS Growth (YoY)", "Earnings per share vs the same quarter last year.", 3, "Faster EPS growth = bullish", (f) => {
          if (!f.eps?.yearAgo) return null;
          const g = pctChange(f.eps.latest.val, f.eps.yearAgo.val);
          if (g === null) return null;
          return {
            value: squash((g - 8) / 15),
            detail: `$${f.eps.latest.val} vs $${f.eps.yearAgo.val}`,
            reasoning: `Diluted EPS $${f.eps.latest.val} vs $${f.eps.yearAgo.val} a year ago (${g >= 0 ? "+" : ""}${r22(g)}%).`,
            actual: f.eps.latest.val,
            previous: f.eps.yearAgo.val,
            unit: "USD/share",
            asOf: f.eps.latest.filed,
            form: f.eps.latest.form
          };
        }),
        filingInd(t, "op", "Operating Income Growth (YoY)", "Core profit growth before interest and taxes.", 2, "Faster operating growth = bullish", (f) => {
          if (!f.opIncome?.yearAgo) return null;
          const g = pctChange(f.opIncome.latest.val, f.opIncome.yearAgo.val);
          if (g === null) return null;
          return {
            value: squash((g - 8) / 15),
            detail: `${r22(g)}% YoY`,
            reasoning: `Operating income ${g >= 0 ? "+" : ""}${r22(g)}% YoY in ${f.opIncome.latest.frame}.`,
            actual: f.opIncome.latest.val,
            previous: f.opIncome.yearAgo.val,
            unit: "USD",
            asOf: f.opIncome.latest.filed,
            form: f.opIncome.latest.form
          };
        })
      ] },
      { id: "profitability", name: "Profitability", desc: "Margins and their direction.", weight: 25, indicators: [
        filingInd(t, "nm", "Net Margin", "Net income as a share of revenue (latest quarter).", 2, "Higher margin = higher quality = bullish", (f) => {
          if (!f.revenue || !f.netIncome || f.netIncome.latest.frame !== f.revenue.latest.frame) return null;
          const m = f.netIncome.latest.val / f.revenue.latest.val * 100;
          return {
            value: squash((m - 10) / 10),
            detail: `${r22(m)}%`,
            reasoning: `Net margin ${r22(m)}% in ${f.revenue.latest.frame}.`,
            actual: r22(m),
            previous: null,
            unit: "%",
            asOf: f.netIncome.latest.filed,
            form: f.netIncome.latest.form
          };
        }),
        filingInd(t, "om", "Operating Margin Trend", "Change in operating margin vs a year ago (pp).", 2, "Expanding margins = bullish", (f) => {
          if (!f.revenue?.yearAgo || !f.opIncome?.yearAgo || f.opIncome.latest.frame !== f.revenue.latest.frame) return null;
          const now = f.opIncome.latest.val / f.revenue.latest.val * 100;
          const then = f.opIncome.yearAgo.val / f.revenue.yearAgo.val * 100;
          return {
            value: squash((now - then) / 3),
            detail: `${r22(then)}% \u2192 ${r22(now)}%`,
            reasoning: `Operating margin ${r22(then)}% \u2192 ${r22(now)}% (${now - then >= 0 ? "+" : ""}${r22(now - then)}pp).`,
            actual: r22(now),
            previous: r22(then),
            unit: "%",
            asOf: f.opIncome.latest.filed,
            form: f.opIncome.latest.form
          };
        })
      ] },
      { id: "balance", name: "Cash Flow & Balance Sheet", desc: "Free cash flow and leverage from the latest annual/quarterly filings.", weight: 20, indicators: [
        filingInd(t, "fcf", "Free Cash Flow Margin", "Operating cash flow minus capex, as % of revenue (latest fiscal year).", 2, "Higher FCF margin = bullish", (f) => {
          if (!f.ocfAnnual || !f.revenueAnnual || f.ocfAnnual.frame !== f.revenueAnnual.frame) return null;
          const capex = f.capexAnnual && f.capexAnnual.frame === f.ocfAnnual.frame ? f.capexAnnual.val : 0;
          const m = (f.ocfAnnual.val - capex) / f.revenueAnnual.val * 100;
          return {
            value: squash((m - 8) / 10),
            detail: `${r22(m)}% (${f.ocfAnnual.frame})`,
            reasoning: `FCF margin ${r22(m)}% in ${f.ocfAnnual.frame}.`,
            actual: r22(m),
            previous: null,
            unit: "%",
            asOf: f.ocfAnnual.filed,
            form: f.ocfAnnual.form
          };
        }),
        filingInd(t, "de", "Debt to Equity", "Long-term debt divided by shareholders\u2019 equity.", 1.5, "Lower leverage = bullish", (f) => {
          if (!f.longTermDebt || !f.equity || f.equity.val <= 0) return null;
          const de = f.longTermDebt.val / f.equity.val;
          return {
            value: -squash((de - 0.8) / 0.8),
            detail: `${r22(de)}\xD7`,
            reasoning: `Long-term debt / equity = ${r22(de)}\xD7.`,
            actual: r22(de),
            previous: null,
            unit: "\xD7",
            asOf: f.equity.filed,
            form: f.equity.form
          };
        })
      ] },
      valuationPillarFor(t, s.sector),
      { id: "macro", name: "US Macro Backdrop", desc: "The S&P 500 fundamental score (growth, Fed, credit, liquidity).", weight: 15, indicators: [], mirror: { asset: "US500", sign: 1 } }
    ]
  };
}
var STOCK_SPECS = STOCKS.map(stockSpec);
var CURRENCY_SPECS = CURRENCIES.map(currencySpec);
function buildPolicyMap(ctx) {
  const m = /* @__PURE__ */ new Map();
  for (const ccy of CURRENCIES) {
    const c = CURRENCY_COUNTRY[ccy];
    const rate = findLatest(ctx.events, "policy_rate", c, ctx.now);
    const cpi = findLatest(ctx.events, "cpi_yoy", c, ctx.now);
    m.set(c, { rate: rate?.event.actual ?? null, cpi: cpi?.event.actual ?? null, rateEvent: rate?.event ?? null, cpiEvent: cpi?.event ?? null });
  }
  return m;
}

// server/macro/pairs.ts
var round3 = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
var PRIORITY = ["EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"];
function fxPairs() {
  const out = [];
  for (let i = 0; i < PRIORITY.length; i++) for (let j = i + 1; j < PRIORITY.length; j++) out.push([PRIORITY[i], PRIORITY[j]]);
  return out.filter(([a, b]) => CURRENCIES.includes(a) && CURRENCIES.includes(b));
}
function retailFor(symbol) {
  const items = sentimentStorage.getAllItems().items;
  const it = items.find((i) => i.symbol === symbol && !i.isUnavailable && !i.notProvided);
  if (!it) return null;
  return { longPct: it.longPct, shortPct: it.shortPct, source: it.source, contrarianScore: round3(it.shortPct - it.longPct, 1) };
}
function buildPairs(results, corr90) {
  const out = [];
  const corrToDxy = (sym) => {
    if (!corr90) return null;
    const i = corr90.symbols.indexOf(sym);
    const j = corr90.symbols.indexOf("DXY");
    return i >= 0 && j >= 0 ? corr90.matrix[i][j] : null;
  };
  for (const [b, q] of fxPairs()) {
    const B = results.get(b);
    const Q = results.get(q);
    const macro = B?.score != null && Q?.score != null ? round3((B.score - Q.score) / 2) : null;
    const symbol = `${b}${q}`;
    const retail = retailFor(symbol);
    const score = macro === null ? null : retail ? round3(0.85 * macro + 0.15 * retail.contrarianScore) : macro;
    const confidence = B && Q ? Math.round(Math.min(B.confidence, Q.confidence)) : 0;
    out.push({
      symbol,
      display: `${b}/${q}`,
      base: b,
      quote: q,
      assetClass: "FOREX",
      score,
      bullishPct: score === null ? null : round3((score + 100) / 2),
      bias: biasFromScore(score),
      confidence,
      baseScore: B?.score ?? null,
      quoteScore: Q?.score ?? null,
      retailSentiment: retail,
      correlationToUsd: corrToDxy(symbol),
      explanation: macro === null ? `Waiting for live data on ${b} or ${q}.` : `${b} scores ${fmtS(B.score)} and ${q} scores ${fmtS(Q.score)} \u2192 macro differential ${fmtS(macro)}.` + (retail ? ` Retail traders are ${retail.longPct}% long ${b}/${q} (contrarian ${fmtS(retail.contrarianScore)}, 15% weight).` : "") + ` Net: ${fmtS(score)} = ${biasLabel(biasFromScore(score))} ${b}/${q}.`
    });
  }
  const usdPriced = [
    ["XAU", "XAUUSD", "COMMODITIES"],
    ["XAG", "XAGUSD", "COMMODITIES"],
    ["XPT", "XPTUSD", "COMMODITIES"],
    ["XCU", "XCUUSD", "COMMODITIES"],
    ["WTI", "USOIL", "COMMODITIES"],
    ["NATGAS", "NATGAS", "COMMODITIES"],
    ["BTC", "BTCUSD", "CRYPTO"],
    ["ETH", "ETHUSD", "CRYPTO"],
    ["XRP", "XRPUSD", "CRYPTO"],
    ["SOL", "SOLUSD", "CRYPTO"]
  ];
  const usd = results.get("USD");
  for (const [asset, sym, cls] of usdPriced) {
    const A = results.get(asset);
    if (!A) continue;
    const retail = retailFor(cls === "CRYPTO" ? `${asset}USDT` : `${asset}USD`);
    const own = A.pillars.filter((p) => p.id !== "usd" && p.score !== null);
    const ownW = own.reduce((s, p) => s + p.weight, 0);
    const ownScore = ownW ? round3(own.reduce((s, p) => s + p.score * p.weight, 0) / ownW) : null;
    out.push({
      symbol: sym,
      display: `${asset}/USD`,
      base: asset,
      quote: "USD",
      assetClass: cls,
      score: A.score,
      bullishPct: A.bullishPct,
      bias: A.bias,
      confidence: Math.min(A.confidence, usd?.confidence ?? 0),
      baseScore: ownScore,
      quoteScore: usd?.score ?? null,
      retailSentiment: retail,
      correlationToUsd: corrToDxy(sym),
      explanation: A.score === null ? `Waiting for live data on ${asset}.` : `${A.name}'s own drivers score ${fmtS(ownScore)}; the US Dollar scores ${fmtS(usd?.score ?? null)} and enters inverted. Combined: ${fmtS(A.score)} = ${biasLabel(A.bias)} ${asset}/USD.` + (retail ? ` Retail is ${retail.longPct}% long (shown for context, contrarian ${fmtS(retail.contrarianScore)}).` : "")
    });
  }
  return out.sort((a, b) => Math.abs(b.score ?? 0) - Math.abs(a.score ?? 0));
}
function fmtS(v) {
  return v === null ? "\u2014" : `${v > 0 ? "+" : ""}${v}`;
}
function logReturns(points) {
  const m = /* @__PURE__ */ new Map();
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].value > 0 && points[i].value > 0) m.set(points[i].date, Math.log(points[i].value / points[i - 1].value));
  }
  return m;
}
function pearson(a, b) {
  const n = a.length;
  if (n < 15) return null;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num2 = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma, y = b[i] - mb;
    num2 += x * y;
    da += x * x;
    db += y * y;
  }
  if (!da || !db) return null;
  return num2 / Math.sqrt(da * db);
}
function buildCorrelation(window) {
  const series = PRICE_UNIVERSE.map((s) => ({ spec: s, rets: logReturns(getPrices(s.symbol)) })).filter((s) => s.rets.size > window / 2);
  if (series.length < 3) return null;
  const allDates = /* @__PURE__ */ new Set();
  series.forEach((s) => s.rets.forEach((_, d) => allDates.add(d)));
  const dates = Array.from(allDates).sort();
  const matrix = series.map(() => series.map(() => null));
  for (let i = 0; i < series.length; i++) {
    for (let j = i; j < series.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        continue;
      }
      const common = dates.filter((d) => series[i].rets.has(d) && series[j].rets.has(d)).slice(-window);
      const r = pearson(common.map((d) => series[i].rets.get(d)), common.map((d) => series[j].rets.get(d)));
      const v = r === null ? null : Math.round(r * 100) / 100;
      matrix[i][j] = v;
      matrix[j][i] = v;
    }
  }
  return {
    window,
    symbols: series.map((s) => s.spec.symbol),
    labels: series.map((s) => s.spec.label),
    matrix,
    asOf: dates[dates.length - 1] || null,
    source: "Daily closes \u2014 Yahoo Finance, FRED fallback"
  };
}

// server/macro/sources/tvCalendar.ts
var TV_SOURCE_ID = "tradingview_calendar";
registerSource(
  TV_SOURCE_ID,
  "TradingView Economic Calendar",
  "https://www.tradingview.com/economic-calendar/",
  "Actual / forecast / previous for every scheduled release. Refreshed every 60s around releases."
);
var TV_COUNTRY_CODES = ["US", "EU", "DE", "GB", "JP", "CA", "AU", "NZ", "CH", "CN"];
var STAGE_SUFFIX = /\s+(prel(im(inary)?)?|flash|final|adv(ance)?|2nd est(imate)?|3rd est(imate)?|second estimate|third estimate|rev(ised)?|s\.a\.?|n\.s\.a\.?)$/i;
function normalizeKey(s) {
  let k = String(s || "").replace(/\*/g, "").trim().replace(/\s+/g, " ");
  for (let i = 0; i < 3; i++) k = k.replace(STAGE_SUFFIX, "");
  return k.toLowerCase();
}
function inferUnit(title) {
  const t = title.toLowerCase();
  if (/\b(index|pmi|confidence|sentiment|climate|count|stocks|change|payrolls|claims|openings|balance|starts|permits|sales|reserves)\b/.test(t) && !/\b(yoy|mom|qoq)\b/.test(t)) return "";
  if (/\b(yoy|mom|qoq|rate|inflation|growth|earnings|wages|annualized)\b/.test(t)) return "%";
  return "";
}
function parseTvEvent(raw) {
  const ts = raw?.date ? new Date(raw.date).getTime() : NaN;
  if (!Number.isFinite(ts)) return null;
  const title = String(raw?.title ?? "").trim();
  if (!title) return null;
  const indicator = String(raw?.indicator ?? title).trim();
  const country = String(raw?.country ?? "").toUpperCase().trim();
  return {
    id: String(raw?.id ?? `${country}-${title}-${ts}`),
    title,
    indicator,
    key: normalizeKey(title),
    indicatorKey: normalizeKey(indicator),
    country,
    currency: String(raw?.currency ?? "").toUpperCase().trim(),
    timestamp: ts,
    iso: new Date(ts).toISOString(),
    period: raw?.period ? String(raw.period) : null,
    actual: toNum(raw?.actual),
    forecast: toNum(raw?.forecast ?? raw?.estimate),
    previous: toNum(raw?.previous),
    unit: raw?.unit ? String(raw.unit).trim() : inferUnit(title),
    scale: raw?.scale ? String(raw.scale).trim() : "",
    importance: Number.isFinite(Number(raw?.importance)) ? Number(raw.importance) : 0,
    source: raw?.source ? String(raw.source) : "TradingView",
    sourceUrl: raw?.source_url ? String(raw.source_url) : "https://www.tradingview.com/economic-calendar/",
    ticker: raw?.ticker ? String(raw.ticker) : null
  };
}
async function fetchRangeOnce(from, to) {
  const url = `https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&countries=${TV_COUNTRY_CODES.join(",")}`;
  const payload = await fetchJson(url, {
    timeoutMs: 15e3,
    headers: { Origin: "https://www.tradingview.com", Referer: "https://www.tradingview.com/" }
  });
  const rows = Array.isArray(payload?.result) ? payload.result : Array.isArray(payload) ? payload : [];
  return rows.map(parseTvEvent).filter((e) => e !== null);
}
var ROW_CAP = 1800;
async function fetchRange(from, to, depth = 0) {
  const rows = await fetchRangeOnce(from, to);
  const span = to.getTime() - from.getTime();
  if (rows.length < ROW_CAP || depth >= 5 || span < 2 * 864e5) return rows;
  const mid = new Date(from.getTime() + span / 2);
  const [a, b] = await Promise.all([fetchRange(from, mid, depth + 1), fetchRange(new Date(mid.getTime() - 1), to, depth + 1)]);
  return [...a, ...b];
}
var store2 = /* @__PURE__ */ new Map();
var lastHistoryLoad = 0;
var lastLiveLoad = 0;
var SERVERLESS = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
var HISTORY_DAYS = SERVERLESS ? 240 : 400;
var HISTORY_TTL = 6 * 60 * 60 * 1e3;
function merge(events) {
  for (const e of events) store2.set(e.id, e);
}
function withDeadline(p, ms, what) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out after ${Math.round(ms / 1e3)}s`)), ms))]);
}
var CAL_SNAPSHOT_URL = process.env.PPFX_CAL_SNAPSHOT_URL || "https://raw.githubusercontent.com/whbzafar/prime-pip-command-center-level/calendar-data/calendar.json";
var lastSnapshotLoad = 0;
async function loadCalendarSnapshot() {
  const j = await fetchJson(CAL_SNAPSHOT_URL, { timeoutMs: 4e4, retries: 1 });
  const rows = Array.isArray(j?.events) ? j.events : [];
  const evs = rows.filter((e) => e && typeof e.id === "string" && Number.isFinite(e.timestamp) && typeof e.key === "string");
  if (evs.length < 500) throw new Error("Calendar snapshot is empty or malformed");
  merge(evs);
  lastSnapshotLoad = Date.now();
  return evs.length;
}
async function refreshCalendar(opts = {}) {
  const now = Date.now();
  const tasks = [];
  if (opts.force || now - lastHistoryLoad > HISTORY_TTL || store2.size === 0) {
    tasks.push(
      (async () => {
        if (store2.size === 0 || now - lastSnapshotLoad > 60 * 6e4) {
          try {
            await loadCalendarSnapshot();
            lastHistoryLoad = Date.now();
            if (store2.size > 0 && !opts.force) return;
          } catch (e) {
            console.warn("[Calendar] snapshot unavailable:", e?.message || e);
          }
        }
        if (store2.size > 0 && !opts.force && now - lastHistoryLoad <= HISTORY_TTL) return;
        const chunkDays = 24;
        const ranges = [];
        for (let back = HISTORY_DAYS; back > 0; back -= chunkDays) {
          ranges.push([new Date(now - back * 864e5), new Date(Math.min(now - (back - chunkDays) * 864e5, now))]);
        }
        const results = await Promise.allSettled(ranges.map(([f, t]) => withDeadline(fetchRange(f, t), 6e4, "calendar window")));
        let okChunks = 0;
        for (const r of results) if (r.status === "fulfilled") {
          merge(r.value);
          okChunks++;
        }
        if (okChunks === 0) throw results[0].reason;
        lastHistoryLoad = Date.now();
      })()
    );
  }
  const minLive = opts.minLiveIntervalMs ?? 55e3;
  if (opts.force || now - lastLiveLoad > minLive) {
    tasks.push(
      (async () => {
        merge(await withDeadline(fetchRange(new Date(now - 3 * 864e5), new Date(now + 10 * 864e5)), 6e4, "live calendar"));
        lastLiveLoad = Date.now();
      })()
    );
  }
  if (tasks.length === 0) return;
  const settled = await Promise.allSettled(tasks);
  const failed = settled.find((r) => r.status === "rejected");
  if (failed) markFailure(TV_SOURCE_ID, failed.reason);
  if (store2.size > 0) markSuccess(TV_SOURCE_ID, store2.size);
  else if (failed) throw failed.reason;
}
var supplemental = () => [];
function setSupplementalProvider(fn) {
  supplemental = fn;
}
function getAllEvents() {
  const base = Array.from(store2.values());
  const have = new Set(base.filter((e) => /^core inflation rate yoy$|^core cpi yoy$/.test(e.key) && e.actual != null).map((e) => e.country));
  const extra = supplemental().filter((e) => !have.has(e.country));
  return base.concat(extra).sort((a, b) => a.timestamp - b.timestamp);
}
function calendarLoaded() {
  return store2.size > 0;
}
function isHotWindow(windowMin = 12) {
  const now = Date.now();
  const w = windowMin * 6e4;
  for (const e of store2.values()) {
    if (e.importance >= 0 && Math.abs(e.timestamp - now) <= w) return true;
  }
  return false;
}

// server/macro/sources/supplemental.ts
var SUPP_SOURCE_ID = "oecd_supplemental";
registerSource(
  SUPP_SOURCE_ID,
  "OECD supplemental inflation (via FRED)",
  "https://fred.stlouisfed.org/",
  "OECD core inflation (CPI ex food & energy, YoY) for Switzerland and New Zealand, fills the gap the calendar leaves."
);
var SPECS = [
  { id: "CPGRLE01CHM659N", country: "CH", currency: "CHF", title: "Core Inflation Rate YoY", lagDays: 12, period: "M" },
  { id: "CPGRLE01NZQ659N", country: "NZ", currency: "NZD", title: "Core Inflation Rate YoY", lagDays: 20, period: "Q" }
];
var store3 = /* @__PURE__ */ new Map();
var getSupplementalEvents = () => [...store3.values()];
function parseCsv(csv) {
  const out = [];
  for (const l of csv.split(/\r?\n/)) {
    const [d, v] = l.split(",");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d || "")) continue;
    const n = Number(v);
    if (v && Number.isFinite(n) && Math.abs(n) < 60) out.push({ date: d, value: n });
  }
  return out;
}
async function refreshSupplemental() {
  const since = new Date(Date.now() - 900 * 864e5).toISOString().slice(0, 10);
  const notes = [];
  let ok = 0;
  await Promise.all(SPECS.map(async (s) => {
    try {
      const pts = parseCsv(await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.id}&cosd=${since}`, { timeoutMs: 15e3, retries: 1 }));
      if (pts.length < 3) throw new Error(`only ${pts.length} points`);
      const ageDays = (Date.now() - Date.parse(pts[pts.length - 1].date)) / 864e5;
      if (ageDays > 200) throw new Error(`OECD series stale (last ${pts[pts.length - 1].date}); not used`);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const span = s.period === "Q" ? 92 : 31;
        const ts = Math.min(Date.parse(p.date) + (span + s.lagDays) * 864e5, Date.now());
        const prev = i > 0 ? pts[i - 1].value : null;
        const id = `supp:${s.country}:core:${p.date}`;
        store3.set(id, {
          id,
          title: s.title,
          indicator: "CORE CPI YY",
          key: s.title.toLowerCase(),
          indicatorKey: "core cpi yy",
          country: s.country,
          currency: s.currency,
          timestamp: ts,
          iso: new Date(ts).toISOString(),
          period: p.date.slice(0, 7),
          actual: p.value,
          forecast: null,
          previous: prev,
          unit: "%",
          scale: "",
          importance: 1,
          source: "OECD MEI via FRED",
          sourceUrl: `https://fred.stlouisfed.org/series/${s.id}`,
          ticker: s.id
        });
      }
      ok++;
      notes.push(`${s.currency} latest ${pts[pts.length - 1].date} = ${pts[pts.length - 1].value}%`);
    } catch (e) {
      notes.push(`${s.currency} failed: ${String(e?.message || e).slice(0, 80)}`);
    }
  }));
  setSourceNote(SUPP_SOURCE_ID, notes.join(" | "));
  if (ok) markSuccess(SUPP_SOURCE_ID, store3.size);
  else markFailure(SUPP_SOURCE_ID, notes.join(" | "));
}

// server/macro/macroService.ts
setSupplementalProvider(getSupplementalEvents);
var STORE_FILE = "macro_fundamentals_store.json";
var SERVERLESS2 = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
var GUARD = Symbol.for("ppfx.macro.rejectionGuard");
if (!globalThis[GUARD]) {
  globalThis[GUARD] = true;
  process.on("unhandledRejection", (reason) => {
    console.warn("[Fundamentals] Unhandled rejection contained:", reason?.message || reason);
  });
}
var store4 = safeReadJsonFile(STORE_FILE, { lastSeen: {}, releases: [], lastScores: {} });
if (!store4.lastSeen) store4.lastSeen = {};
if (!Array.isArray(store4.releases)) store4.releases = [];
if (!store4.lastScores) store4.lastScores = {};
var snapshot = null;
var EVERY = { fred: 2 * 36e5, prices: 30 * 6e4, cot: 3 * 36e5, crypto: 5 * 6e4, edgar: 12 * 36e5 };
function cotReleaseWindow(now = /* @__PURE__ */ new Date()) {
  const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const mins = ny.getHours() * 60 + ny.getMinutes();
  return ny.getDay() === 5 && mins >= 15 * 60 + 30 && mins <= 18 * 60;
}
var inflight4 = {};
var due = {};
var lastCompute = 0;
var rcTimer = null;
var rcDirty = false;
function computeNow() {
  try {
    snapshot = computeSnapshot();
    lastCompute = Date.now();
  } catch (e) {
    console.warn("[Fundamentals] compute failed:", e?.message || e);
  }
}
function recompute() {
  if (SERVERLESS2 || !snapshot) {
    computeNow();
    return;
  }
  rcDirty = true;
  if (rcTimer) return;
  const wait = Math.max(1500, 12e3 - (Date.now() - lastCompute));
  rcTimer = setTimeout(() => {
    rcTimer = null;
    if (rcDirty) {
      rcDirty = false;
      computeNow();
    }
  }, wait);
}
function sourceSucceededSince(sourceId, since) {
  const h = getSourceHealth().find((x) => x.id === sourceId);
  return !!h?.lastSuccess && Date.parse(h.lastSuccess) >= since - 1e3;
}
function runJob(name, fn, sourceId, everyMs) {
  const existing = inflight4[name];
  if (existing) return existing;
  const started = Date.now();
  const p = (async () => {
    try {
      await fn();
    } catch {
    } finally {
      inflight4[name] = void 0;
      if (sourceId && everyMs) due[name] = Date.now() + (sourceSucceededSince(sourceId, started) ? everyMs : 6e4);
      recompute();
    }
  })();
  inflight4[name] = p;
  return p;
}
var isDue = (name, force) => force || Date.now() >= (due[name] ?? 0);
function refreshSources(force) {
  const jobs = [];
  const hot = isHotWindow(12);
  const calendar = runJob("calendar", () => refreshCalendar({ force, minLiveIntervalMs: hot ? 45e3 : 4 * 6e4 }));
  jobs.push(calendar);
  if (isDue("fred", force)) {
    due.fred = Date.now() + 12e4;
    jobs.push(runJob("fred", () => refreshFred(force), "fred", EVERY.fred));
  }
  if (isDue("prices", force)) {
    due.prices = Date.now() + 12e4;
    jobs.push(runJob("prices", () => refreshPrices(force), "prices", EVERY.prices));
  }
  const cotEvery = cotReleaseWindow() ? 10 * 6e4 : EVERY.cot;
  if (isDue("cot", force)) {
    due.cot = Date.now() + 12e4;
    jobs.push(runJob("cot", () => refreshCot(true), "cftc_cot", cotEvery));
  }
  if (isDue("yields", force)) {
    due.yields = Date.now() + 12e4;
    jobs.push(runJob("yields", () => refreshYields(force), "gov_yields", 3 * 36e5));
  }
  if (isDue("supp", force)) {
    due.supp = Date.now() + 12e4;
    jobs.push(runJob("supp", () => refreshSupplemental(), SUPP_SOURCE_ID, 6 * 36e5));
  }
  if (isDue("fundsnap", force)) {
    due.fundsnap = Date.now() + 12e4;
    jobs.push(runJob("fundsnap", () => refreshSnapshot(force), "fund_snapshot", 30 * 6e4));
  }
  if (isDue("crypto", force)) {
    due.crypto = Date.now() + 12e4;
    jobs.push(runJob("crypto", () => refreshCrypto(true), "crypto_fng", EVERY.crypto));
  }
  if (isDue("sentiment", force)) {
    due.sentiment = Date.now() + 5 * 6e4;
    jobs.push(runJob("sentiment", () => getSentiment(force ? 0 : 6e4).then(() => void 0)));
  }
  if (SERVERLESS2) {
    for (const t of missingTickers(4)) jobs.push(runJob(`edgar_${t}`, () => loadEdgarTicker(t)));
  } else if (isDue("edgar", force)) {
    due.edgar = Date.now() + 12e4;
    jobs.push(runJob("edgar", () => refreshEdgar(force), "sec_edgar", EVERY.edgar));
  }
  return { calendar, all: Promise.all(jobs).then(() => void 0) };
}
function computeSnapshot(now = Date.now()) {
  const events = getAllEvents();
  const results = /* @__PURE__ */ new Map();
  const ctx = { now, events, results, policy: /* @__PURE__ */ new Map() };
  ctx.policy = buildPolicyMap(ctx);
  for (const s of CURRENCY_SPECS) results.set(s.symbol, scoreAsset(s, ctx));
  for (const s of INDEX_SPECS) results.set(s.symbol, scoreAsset(s, ctx));
  for (const s of [...COMMODITY_SPECS, ...CRYPTO_SPECS, ...STOCK_SPECS, ...GLOBAL_STOCK_SPECS]) results.set(s.symbol, scoreAsset(s, ctx));
  for (const s of BASKET_SPECS) results.set(s.symbol, scoreAsset(s, ctx));
  applyBasketConfidence(results);
  const w30 = buildCorrelation(30);
  const w90 = buildCorrelation(90);
  const assets = Array.from(results.values());
  const releases = detectReleases(assets, now);
  const tracked = [];
  const countryToCcy = Object.fromEntries(Object.entries(CURRENCY_COUNTRY).map(([k, v]) => [v, k]));
  countryToCcy.DE = "EUR";
  countryToCcy.CN = "CNY";
  const allPatterns = Object.keys(CONCEPTS);
  for (const e of events) {
    if (e.actual !== null || e.timestamp < now - 5 * 6e4 || e.timestamp > now + 7 * 864e5) continue;
    const matched = allPatterns.some((c) => patternsFor(c, e.country).some((p) => eventMatches(e, p, CONCEPTS[c])));
    if (!matched) continue;
    tracked.push({
      asset: countryToCcy[e.country] || e.country,
      title: e.title,
      scheduledAt: e.iso,
      forecast: e.forecast,
      previous: e.previous,
      importance: e.importance >= 1 ? "HIGH" : e.importance === 0 ? "MEDIUM" : "LOW"
    });
  }
  tracked.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  for (const a of assets) store4.lastScores[a.symbol] = a.score;
  persist();
  return {
    generatedAt: new Date(now).toISOString(),
    assets,
    pairs: buildPairs(results, w90),
    correlations: { w30, w90 },
    releases,
    upcoming: tracked.slice(0, 60),
    sources: getSourceHealth(),
    methodologyVersion: METHODOLOGY_VERSION
  };
}
function detectReleases(assets, now) {
  const firstRun = Object.keys(store4.lastSeen).length === 0;
  const grouped = /* @__PURE__ */ new Map();
  const order = { FOREX: 0, INDICES: 1, COMMODITIES: 2, CRYPTO: 3, STOCKS: 4 };
  const sorted2 = [...assets].sort((a, b) => order[a.assetClass] - order[b.assetClass]);
  for (const a of sorted2) {
    if (a.assetClass === "STOCKS") continue;
    for (const p of a.pillars) {
      for (const ind2 of p.indicators) {
        const o = ind2.observation;
        if (!o || !o.sourceTitle || !o.sourceName.includes("TradingView")) continue;
        const key = `${a.symbol}|${ind2.id}`;
        const sig = `${o.releasedAt}|${o.actual}`;
        const prev = store4.lastSeen[key];
        store4.lastSeen[key] = sig;
        const age = now - new Date(o.releasedAt).getTime();
        const isNew = firstRun ? age < 36 * 36e5 : prev !== sig && age < 3 * 864e5;
        if (!isNew) continue;
        const impact = {
          asset: a.symbol,
          indicatorScore: ind2.score,
          assetScoreBefore: firstRun ? null : store4.lastScores[a.symbol] ?? null,
          assetScoreAfter: a.score
        };
        const gid = `${o.sourceTitle}|${o.releasedAt}|${o.actual}`;
        const existing = grouped.get(gid);
        if (existing) {
          if (!existing.impacts.some((x) => x.asset === a.symbol)) existing.impacts.push(impact);
          continue;
        }
        const surprise = o.forecast !== null ? o.actual - o.forecast : null;
        const dir = ind2.score === null ? null : ind2.score > 15 ? `Bullish ${a.symbol}` : ind2.score < -15 ? `Bearish ${a.symbol}` : `Neutral for ${a.symbol}`;
        grouped.set(gid, {
          id: gid,
          asset: a.symbol,
          indicatorId: ind2.id,
          indicatorName: ind2.name,
          sourceTitle: o.sourceTitle,
          actual: o.actual,
          forecast: o.forecast,
          previous: o.previous,
          unit: o.unit,
          releasedAt: o.releasedAt,
          detectedAt: new Date(now).toISOString(),
          indicatorScore: ind2.score,
          assetScoreBefore: impact.assetScoreBefore,
          assetScoreAfter: impact.assetScoreAfter,
          verdict: dir === null ? "Recorded" : `${surprise === null ? "" : surprise > 0 ? "Above forecast \u2192 " : surprise < 0 ? "Below forecast \u2192 " : "As forecast \u2192 "}${dir} (${ind2.score > 0 ? "+" : ""}${ind2.score})`,
          impacts: [impact]
        });
      }
    }
  }
  if (grouped.size) {
    const byId = new Map(store4.releases.map((r) => [r.id, r]));
    for (const r of grouped.values()) if (!byId.has(r.id)) store4.releases.unshift(r);
    store4.releases.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
    store4.releases = store4.releases.slice(0, 150);
  }
  return store4.releases.slice(0, 80).map((r) => ({ ...r, impacts: r.impacts || [] }));
}
var persistTimer = null;
function persist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      safeWriteJsonFile(STORE_FILE, store4);
    } catch {
    }
  }, 500);
}
async function refreshAndCompute(force = false) {
  await refreshSources(force).all;
  if (force) computeNow();
  else recompute();
  return snapshot ?? emptySnapshot();
}
var bgRefresh = null;
async function getSnapshot(maxAgeMs = SERVERLESS2 ? 5 * 6e4 : 6e4, budgetMs = SERVERLESS2 ? 6e3 : 25e3) {
  const age = snapshot ? Date.now() - new Date(snapshot.generatedAt).getTime() : Infinity;
  if (snapshot && age < maxAgeMs) {
    const { all: all2 } = refreshSources(false);
    if (SERVERLESS2) await Promise.race([all2, new Promise((r) => setTimeout(r, budgetMs))]);
    return snapshot;
  }
  if (!SERVERLESS2 && snapshot) {
    if (!bgRefresh) {
      bgRefresh = (async () => {
        try {
          const r = refreshSources(false);
          await Promise.race([r.calendar, new Promise((x) => setTimeout(x, 3e3))]);
          recompute();
        } catch {
        }
      })().finally(() => {
        bgRefresh = null;
      });
    }
    return snapshot;
  }
  const { calendar, all } = refreshSources(false);
  const waitFor = SERVERLESS2 ? all : calendar;
  const wait = SERVERLESS2 ? budgetMs : snapshot ? Math.min(budgetMs, 3e3) : budgetMs;
  await Promise.race([waitFor, new Promise((r) => setTimeout(r, wait))]);
  recompute();
  return snapshot ?? emptySnapshot();
}
async function ensureStockLoaded(ticker, budgetMs = 5e3) {
  const p = loadEdgarTicker(ticker).catch(() => void 0);
  await Promise.race([p, new Promise((r) => setTimeout(r, budgetMs))]);
  try {
    snapshot = computeSnapshot();
  } catch {
  }
  return snapshot ?? emptySnapshot();
}
function emptySnapshot() {
  return {
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    assets: [],
    pairs: [],
    correlations: { w30: null, w90: null },
    releases: [],
    upcoming: [],
    sources: getSourceHealth(),
    methodologyVersion: METHODOLOGY_VERSION
  };
}
function unmatchedCalendarTitles() {
  const out = {};
  if (!calendarLoaded()) return {};
  const concepts = Object.keys(CONCEPTS);
  for (const e of getAllEvents()) {
    if (e.actual === null) continue;
    const hit = concepts.some((c) => patternsFor(c, e.country).some((p) => eventMatches(e, p, CONCEPTS[c])));
    if (!hit) (out[e.country] ||= /* @__PURE__ */ new Set()).add(e.title);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.from(v).sort()]));
}

// server/macro/universeMap.ts
var sideOf = (score) => score >= 10 ? "bull" : score <= -10 ? "bear" : "neutral";
var r12 = (n) => Math.round(n * 10) / 10;
function buildUniverseMap(s) {
  const assets = [];
  for (const a of s.assets) {
    if (a.score === null || a.bullishPct === null) continue;
    assets.push({
      kind: "asset",
      symbol: a.symbol,
      label: a.symbol,
      name: a.name,
      assetClass: a.assetClass,
      score: r12(a.score),
      bullishPct: r12(a.bullishPct),
      bearishPct: r12(100 - a.bullishPct),
      side: sideOf(a.score),
      confidence: Math.round(a.confidence)
    });
  }
  const pairs = [];
  for (const p of s.pairs) {
    if (p.score === null || p.bullishPct === null) continue;
    pairs.push({
      kind: "pair",
      symbol: p.symbol,
      label: p.display,
      name: p.display,
      assetClass: p.assetClass,
      score: r12(p.score),
      bullishPct: r12(p.bullishPct),
      bearishPct: r12(100 - p.bullishPct),
      side: sideOf(p.score),
      confidence: Math.round(p.confidence)
    });
  }
  return { generatedAt: s.generatedAt, assets, pairs };
}

// server/macro/scenario.ts
var PRESETS = [
  { id: "fed-dovish", title: "Fed turns dovish (rate cuts)", plain: "The US central bank cuts rates faster than expected.", shocks: [{ asset: "USD", pillar: "monetary", delta: -40 }] },
  { id: "fed-hawkish", title: "Fed turns hawkish (rates stay high / hike)", plain: "The US central bank signals higher-for-longer.", shocks: [{ asset: "USD", pillar: "monetary", delta: 40 }] },
  { id: "us-inflation-hot", title: "US inflation comes in hot", plain: "US prices rise faster than forecast, so rate cuts get pushed back.", shocks: [{ asset: "USD", pillar: "inflation", delta: 35 }, { asset: "USD", pillar: "monetary", delta: 15 }] },
  { id: "ecb-hawkish", title: "ECB turns hawkish", plain: "The European central bank signals higher rates.", shocks: [{ asset: "EUR", pillar: "monetary", delta: 40 }] },
  { id: "boj-hike", title: "Bank of Japan hikes", plain: "Japan raises interest rates, ending the ultra-low-rate era.", shocks: [{ asset: "JPY", pillar: "monetary", delta: 45 }] },
  { id: "boe-dovish", title: "Bank of England cuts", plain: "The UK central bank cuts rates.", shocks: [{ asset: "GBP", pillar: "monetary", delta: -40 }] },
  { id: "us-jobs-weak", title: "US jobs collapse", plain: "US jobs data comes in far weaker than expected.", shocks: [{ asset: "USD", pillar: "labour", delta: -40 }, { asset: "US500", pillar: "growth", delta: -25 }] },
  { id: "risk-off", title: "Global risk-off shock", plain: "Fear spikes: stocks fall, safe havens (USD, JPY, CHF) gain, risk currencies (AUD, NZD, CAD) fall.", shocks: [
    { asset: "US500", pillar: "risk", delta: -40 },
    { asset: "US100", pillar: "risk", delta: -40 },
    { asset: "US30", pillar: "risk", delta: -40 },
    { asset: "GER40", pillar: "risk", delta: -40 },
    { asset: "JPY", pillar: "external", delta: 30 },
    { asset: "CHF", pillar: "external", delta: 30 },
    { asset: "USD", pillar: "external", delta: 15 },
    { asset: "AUD", pillar: "external", delta: -30 },
    { asset: "NZD", pillar: "external", delta: -30 },
    { asset: "CAD", pillar: "external", delta: -20 }
  ] },
  { id: "china-slowdown", title: "China slowdown", plain: "Chinese factories and demand weaken sharply.", shocks: [{ asset: "AUD", pillar: "external", delta: -35 }, { asset: "NZD", pillar: "external", delta: -30 }, { asset: "XCU", pillar: "china", delta: -40 }] }
];
var r13 = (v) => Math.round(v * 10) / 10;
var clamp2 = (v) => Math.max(-100, Math.min(100, v));
function mirrorOf(a, p) {
  if (p.indicators.length) return null;
  if (p.id === "usd") return { ref: "USD", sign: -1 };
  if (p.id === "euro") return { ref: "EUR", sign: -1 };
  if (p.id === "pound") return { ref: "GBP", sign: -1 };
  if (p.id === "yen") return { ref: "JPY", sign: -1 };
  if (p.id === "macro") return { ref: String(a.meta?.macroAsset || "US500"), sign: 1 };
  return null;
}
function aggregate(pillars) {
  const scored = pillars.filter((p) => p.score !== null && p.coverage > 0);
  const eff = (p) => p.weight * (0.5 + 0.5 * Math.min(1, p.coverage));
  const W = scored.reduce((s, p) => s + eff(p), 0);
  return W > 0 ? r13(scored.reduce((s, p) => s + p.score * eff(p), 0) / W) : null;
}
var side = (b) => b.includes("BULL") ? "bullish" : b.includes("BEAR") ? "bearish" : "neutral";
function runScenario(snap2, shocks) {
  const base = new Map(snap2.assets.map((a) => [a.symbol, a]));
  const work = new Map(snap2.assets.map((a) => [a.symbol, { ...a, pillars: a.pillars.map((p) => ({ ...p })) }]));
  const applied = [];
  const skipped = [];
  const direct = /* @__PURE__ */ new Map();
  for (const s of shocks) {
    const a = work.get(s.asset);
    const p = a?.pillars.find((x) => x.id === s.pillar);
    if (!a || !p) {
      skipped.push({ ...s, reason: !a ? `${s.asset} is not scored` : `${s.asset} has no \u201C${s.pillar}\u201D pillar` });
      continue;
    }
    if (p.score === null) {
      skipped.push({ ...s, reason: `${a.name} \xB7 ${p.name} has no live data` });
      continue;
    }
    if (!Number.isFinite(s.delta)) {
      skipped.push({ ...s, reason: "shock size is not a number" });
      continue;
    }
    const before = p.score;
    p.score = r13(clamp2(before + s.delta));
    p.bullishPct = r13((p.score + 100) / 2);
    applied.push({ ...s, assetName: a.name, pillarName: p.name, before, after: p.score });
    direct.set(a.symbol, [...direct.get(a.symbol) || [], `${p.name} ${s.delta > 0 ? "+" : ""}${s.delta}`]);
  }
  const rescore = (a) => {
    if (a.score !== null) {
      const v = aggregate(a.pillars);
      if (v !== null) {
        a.score = v;
        a.bullishPct = r13((v + 100) / 2);
        a.bearishPct = r13(100 - a.bullishPct);
        a.bias = biasFromScore(v);
      }
    }
  };
  const via = /* @__PURE__ */ new Map();
  for (let pass = 0; pass < 4; pass++) {
    for (const a of work.values()) {
      let touched = false;
      for (const p of a.pillars) {
        const m = mirrorOf(a, p);
        const ref = m && work.get(m.ref);
        if (!m || !ref || ref.score === null) continue;
        const next = r13(clamp2(ref.score * m.sign));
        if (p.score !== next) {
          p.score = next;
          p.bullishPct = r13((next + 100) / 2);
          touched = true;
          if (Math.abs(next - (base.get(a.symbol)?.pillars.find((x) => x.id === p.id)?.score ?? next)) >= 0.5) via.set(a.symbol, [`${ref.name} ${m.sign < 0 ? "(inverse)" : ""}`.trim()]);
        }
      }
      if (touched || direct.has(a.symbol)) rescore(a);
    }
  }
  const assets = [];
  for (const a of work.values()) {
    const b = base.get(a.symbol);
    if (b.score === null || a.score === null) continue;
    const delta = r13(a.score - b.score);
    if (Math.abs(delta) < 0.1) continue;
    const bits = [...(direct.get(a.symbol) || []).map((d) => `shock: ${d}`), ...(via.get(a.symbol) || []).map((v) => `follows ${v}`)];
    assets.push({ symbol: a.symbol, name: a.name, assetClass: a.assetClass, before: b.score, after: a.score, delta, biasBefore: b.bias, biasAfter: a.bias, flipped: side(b.bias) !== side(a.bias), why: bits.join(" \xB7 ") || "knock-on effect" });
  }
  assets.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  const was = new Map(buildPairs(base, null).map((p) => [p.symbol, p]));
  const pairs = [];
  for (const p of buildPairs(work, null)) {
    const b = was.get(p.symbol);
    if (!b || b.score === null || p.score === null) continue;
    const delta = r13(p.score - b.score);
    if (Math.abs(delta) < 0.1) continue;
    const ba = base.get(p.base)?.score, aa = work.get(p.base)?.score, bq = base.get(p.quote)?.score, aq = work.get(p.quote)?.score;
    const moved = (n, x, y) => x != null && y != null && Math.abs(y - x) >= 0.1 ? `${n} ${x > 0 ? "+" : ""}${x} \u2192 ${y > 0 ? "+" : ""}${y}` : "";
    pairs.push({ symbol: p.symbol, display: p.display, assetClass: p.assetClass, before: b.score, after: p.score, delta, biasBefore: b.bias, biasAfter: p.bias, flipped: side(b.bias) !== side(p.bias), sideBefore: side(b.bias), sideAfter: side(p.bias), why: [moved(p.base, ba, aa), moved(p.quote, bq, aq)].filter(Boolean).join(" \xB7 ") || "knock-on effect" });
  }
  pairs.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return {
    applied,
    skipped,
    assets,
    pairs,
    flips: { toBullish: pairs.filter((p) => p.flipped && p.sideAfter === "bullish"), toBearish: pairs.filter((p) => p.flipped && p.sideAfter === "bearish") },
    method: "Today\u2019s real readings + your shock, re-scored with the live engine\u2019s own pillar weights. Not a forecast: the shock size is your assumption."
  };
}

// server/routes/macroRoutes.ts
var macroRouter = (0, import_express.Router)();
function lite(a) {
  return {
    symbol: a.symbol,
    name: a.name,
    assetClass: a.assetClass,
    score: a.score,
    bullishPct: a.bullishPct,
    bearishPct: a.bearishPct,
    bias: a.bias,
    confidence: a.confidence,
    summary: a.summary,
    updatedAt: a.updatedAt,
    meta: a.meta,
    topDrivers: a.topDrivers.slice(0, 3),
    institutional: instSummary(a.symbol),
    pillars: a.pillars.map((p) => ({ id: p.id, name: p.name, weight: p.weight, score: p.score, bullishPct: p.bullishPct, coverage: p.coverage }))
  };
}
function cotKey(symbol) {
  return COT_CODES[symbol] ? symbol : null;
}
function institutionalFor(symbol) {
  const key = cotKey(symbol);
  if (!key) return { available: false, reason: `There is no CFTC-regulated futures market for ${symbol}, so official institutional positioning is not published for it.` };
  const pos = getInstitutional(key);
  if (!pos) return { available: false, reason: "CFTC data is loading or temporarily unavailable \u2014 it fills in automatically." };
  return { available: true, ...pos };
}
function instSummary(symbol) {
  const key = cotKey(symbol);
  const pos = key ? getInstitutional(key) : null;
  if (!pos) return null;
  return { specNet: pos.speculators.net, specNetChange: pos.speculators.netChange, cotIndex52w: pos.speculators.cotIndex52w, longPct: pos.speculators.longPct, reportDate: pos.reportDate };
}
function warming(s) {
  return !s.sources.some((x) => x.id === "tradingview_calendar" && x.lastSuccess);
}
function overview(s) {
  return { ...s, assets: s.assets.map(lite), warming: warming(s) };
}
function cacheHeaders(res, s) {
  if (SERVERLESS2 && s && !warming(s)) res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=1800");
  else res.setHeader("Cache-Control", "no-store");
}
function fail(res, err) {
  console.warn("[Fundamentals] route error:", err?.message || err);
  if (!res.headersSent) res.status(503).json({ ok: false, error: "The fundamentals engine is temporarily unavailable. Retrying automatically." });
}
macroRouter.get("/overview", async (_req, res) => {
  try {
    const sentimentReady = Promise.race([getSentiment().catch(() => null), new Promise((r) => setTimeout(() => r(null), 4e3))]);
    const [s] = await Promise.all([getSnapshot(), sentimentReady]);
    cacheHeaders(res, s);
    res.json({ ok: true, data: overview(s) });
  } catch (err) {
    fail(res, err);
  }
});
macroRouter.get("/universe", async (_req, res) => {
  try {
    const s = await getSnapshot();
    cacheHeaders(res, s);
    res.json({ ok: true, data: buildUniverseMap(s) });
  } catch (err) {
    fail(res, err);
  }
});
macroRouter.get("/scenario/presets", async (_req, res) => {
  try {
    const s = await getSnapshot();
    cacheHeaders(res, s);
    const targets = s.assets.filter((a) => a.assetClass !== "STOCKS" && a.score !== null).map((a) => ({
      symbol: a.symbol,
      name: a.name,
      assetClass: a.assetClass,
      score: a.score,
      pillars: a.pillars.filter((p) => p.indicators.length && p.score !== null).map((p) => ({ id: p.id, name: p.name, score: p.score }))
    })).filter((a) => a.pillars.length);
    res.json({ ok: true, data: { presets: PRESETS, targets, generatedAt: s.generatedAt } });
  } catch (err) {
    fail(res, err);
  }
});
macroRouter.post("/scenario/run", async (req, res) => {
  try {
    const body = req.body || {};
    let shocks = [];
    let title = "Custom scenario";
    if (body.presetId) {
      const pr = PRESETS.find((p) => p.id === body.presetId);
      if (!pr) return res.status(400).json({ ok: false, error: "Unknown scenario" });
      shocks = pr.shocks;
      title = pr.title;
    } else if (Array.isArray(body.shocks)) {
      shocks = body.shocks.slice(0, 20).map((x) => ({ asset: String(x?.asset || "").toUpperCase().slice(0, 12), pillar: String(x?.pillar || "").slice(0, 24), delta: Math.max(-100, Math.min(100, Number(x?.delta))) }));
    }
    if (!shocks.length) return res.status(400).json({ ok: false, error: "Choose a scenario or add at least one shock" });
    const s = await getSnapshot();
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, data: { title, generatedAt: s.generatedAt, ...runScenario(s, shocks) } });
  } catch (err) {
    fail(res, err);
  }
});
macroRouter.get("/asset/:symbol", async (req, res) => {
  try {
    const sym = String(req.params.symbol).toUpperCase();
    let s = await getSnapshot();
    let a = s.assets.find((x) => x.symbol === sym);
    if (a && a.assetClass === "STOCKS" && STOCKS.some((t) => t.ticker === sym) && a.pillars.some((p) => p.id !== "macro" && p.score === null)) {
      s = await ensureStockLoaded(sym);
      a = s.assets.find((x) => x.symbol === sym) || a;
    }
    if (!a) return res.status(404).json({ ok: false, error: `Unknown asset ${sym}` });
    const mirrors = {};
    for (const p of a.pillars) {
      const ref = p.id === "usd" ? "USD" : p.id === "yen" ? "JPY" : p.id === "macro" ? String(a.meta?.macroAsset || "US500") : null;
      const m = ref ? s.assets.find((x) => x.symbol === ref) : null;
      if (ref && m) mirrors[ref] = m;
    }
    cacheHeaders(res, s);
    res.json({ ok: true, data: a, mirrors, institutional: institutionalFor(sym), generatedAt: s.generatedAt });
  } catch (err) {
    fail(res, err);
  }
});
function pickRow(a) {
  const m = a.meta || {};
  return {
    symbol: a.symbol,
    name: a.name,
    assetClass: a.assetClass,
    region: m.region ?? null,
    sector: m.sector ?? null,
    kind: m.kind ?? null,
    score: a.score,
    bullishPct: a.bullishPct,
    bearishPct: a.bearishPct,
    confidence: a.confidence,
    bias: a.bias,
    price: m.price ?? null,
    currency: m.currency ?? null,
    change1y: m.change1y ?? null,
    pe: m.pe ?? null,
    divYield: m.divYield ?? null,
    members: m.members ?? null,
    covered: m.covered ?? null,
    pillars: a.pillars.map((p) => ({ id: p.id, name: p.name, score: p.score })),
    drivers: a.topDrivers.slice(0, 3).map((d) => ({ name: d.name, impact: d.impact }))
  };
}
function isVip(a) {
  if (a.assetClass !== "STOCKS" || a.score === null || a.score < 55 || a.confidence < 70) return false;
  const scored = a.pillars.filter((p) => p.score !== null && p.id !== "macro");
  if (scored.some((p) => p.score <= -15)) return false;
  const g = a.pillars.find((p) => p.id === "growth")?.score ?? null;
  const q = a.pillars.find((p) => p.id === "profitability")?.score ?? null;
  return g !== null && q !== null && g >= 20 && q >= 20;
}
macroRouter.get("/picks", async (_req, res) => {
  try {
    const s = await getSnapshot();
    const scored = s.assets.filter((a) => a.score !== null);
    const stocks = scored.filter((a) => a.assetClass === "STOCKS");
    const byScore = (x, y) => y.score - x.score;
    const regions = ["PK", "ASIA", "US", "EU", "GLOBAL"];
    const perRegion = {};
    for (const r of regions) {
      const list = stocks.filter((a) => a.meta?.region === r && a.confidence >= 40).sort(byScore);
      perRegion[r] = { bullish: list.filter((a) => a.score >= 10).slice(0, 12).map(pickRow), bearish: list.filter((a) => a.score <= -10).reverse().slice(0, 12).map(pickRow) };
    }
    const solid = stocks.filter((a) => a.confidence >= 50).sort(byScore);
    const idx = scored.filter((a) => a.assetClass === "INDICES").sort(byScore);
    const com = scored.filter((a) => a.assetClass === "COMMODITIES").sort(byScore);
    const fx = scored.filter((a) => a.assetClass === "FOREX").sort(byScore);
    const cry = scored.filter((a) => a.assetClass === "CRYPTO").sort(byScore);
    const meta2 = snapshotMeta();
    const have = new Set(s.assets.filter((a) => a.score !== null).map((a) => a.symbol));
    cacheHeaders(res, s);
    res.json({ ok: true, data: {
      generatedAt: s.generatedAt,
      dataAsOf: meta2?.generatedAt ?? null,
      tracked: UNIVERSE.length + STOCKS.length,
      scoredStocks: stocks.length,
      criteria: {
        vip: "Stocks only: score \u2265 +55, confidence \u2265 70%, Growth and Profitability pillars both \u2265 +20, and no scored pillar at or below \u221215.",
        strong: "Score \u2265 +60 (Strong Bullish) or \u2264 \u221260 (Strong Bearish) with confidence \u2265 50%."
      },
      vip: solid.filter(isVip).slice(0, 15).map(pickRow),
      strongBullish: solid.filter((a) => a.score >= 60).slice(0, 25).map(pickRow),
      strongBearish: [...solid].reverse().filter((a) => a.score <= -60).slice(0, 25).map(pickRow),
      regions: perRegion,
      indices: { bullish: idx.filter((a) => a.score >= 10).slice(0, 10).map(pickRow), bearish: [...idx].reverse().filter((a) => a.score <= -10).slice(0, 10).map(pickRow) },
      commodities: { bullish: com.filter((a) => a.score >= 10).map(pickRow), bearish: [...com].reverse().filter((a) => a.score <= -10).map(pickRow), all: com.map(pickRow) },
      forex: { all: fx.map(pickRow) },
      crypto: { all: cry.map(pickRow) },
      noFreeData: UNIVERSE.filter((u) => !have.has(u.s)).map((u) => ({ symbol: u.s, name: u.name, region: u.region, url: u.region === "PK" ? `https://dps.psx.com.pk/company/${u.s}` : `https://finance.yahoo.com/quote/${encodeURIComponent(u.y)}` }))
    } });
  } catch (err) {
    fail(res, err);
  }
});
macroRouter.get("/pair/:symbol", async (req, res) => {
  try {
    const s = await getSnapshot();
    const sym = String(req.params.symbol).toUpperCase().replace("/", "");
    const p = s.pairs.find((x) => x.symbol === sym);
    if (!p) return res.status(404).json({ ok: false, error: `Unknown pair ${sym}` });
    const base = s.assets.find((x) => x.symbol === p.base) || null;
    const quote = s.assets.find((x) => x.symbol === p.quote) || null;
    cacheHeaders(res, s);
    const sent = await Promise.race([getSentiment().catch(() => null), new Promise((r) => setTimeout(() => r(null), 6e3))]);
    const sentiment = sent ? { pair: sentimentFor(sent, p.symbol), base: sent.currencies.find((c) => c.currency === p.base) || null, quote: sent.currencies.find((c) => c.currency === p.quote) || null, updatedAt: sent.updatedAt } : null;
    res.json({ ok: true, data: p, base, quote, institutional: { base: institutionalFor(p.base), quote: institutionalFor(p.quote) }, sentiment, generatedAt: s.generatedAt });
  } catch (err) {
    fail(res, err);
  }
});
macroRouter.get("/brief/:symbol", async (req, res) => {
  try {
    const sym = String(req.params.symbol).toUpperCase().replace("/", "");
    let s = await getSnapshot();
    const pair = s.pairs.find((x) => x.symbol === sym);
    if (pair) {
      cacheHeaders(res, s);
      return res.json({ ok: true, data: pairBrief(pair, s.assets.find((x) => x.symbol === pair.base), s.assets.find((x) => x.symbol === pair.quote), s) });
    }
    let a = s.assets.find((x) => x.symbol === sym);
    if (a && a.assetClass === "STOCKS" && STOCKS.some((t) => t.ticker === sym) && a.pillars.some((p) => p.id !== "macro" && p.score === null)) {
      s = await ensureStockLoaded(sym);
      a = s.assets.find((x) => x.symbol === sym) || a;
    }
    if (!a) return res.status(404).json({ ok: false, error: `Unknown symbol ${sym}` });
    cacheHeaders(res, s);
    res.json({ ok: true, data: assetBrief(a, s) });
  } catch (err) {
    fail(res, err);
  }
});
macroRouter.get("/sentiment", async (_req, res) => {
  try {
    const data2 = await getSentiment();
    res.setHeader("Cache-Control", SERVERLESS2 ? "public, s-maxage=60, stale-while-revalidate=1800" : "no-store");
    res.json({ ok: true, data: data2 });
  } catch (err) {
    fail(res, err);
  }
});
var SHORT_TERM_PILLARS = /* @__PURE__ */ new Set(["risk", "sentiment", "derivatives", "external"]);
function longTermScore(a) {
  if (!a) return { score: null, pillars: [] };
  const ps = a.pillars.filter((p) => !SHORT_TERM_PILLARS.has(p.id) && p.score !== null && p.weight > 0);
  const w = ps.reduce((s, p) => s + p.weight, 0);
  return w ? { score: Math.round(ps.reduce((s, p) => s + p.score * p.weight, 0) / w * 10) / 10, pillars: ps.map((p) => p.name) } : { score: null, pillars: [] };
}
macroRouter.get("/rankings", async (_req, res) => {
  try {
    const s = await getSnapshot();
    const bySym = new Map(s.assets.map((a) => [a.symbol, a]));
    const rows = s.pairs.map((p) => {
      let lt;
      let basis;
      if (p.assetClass === "FOREX") {
        const b = longTermScore(bySym.get(p.base)), q = longTermScore(bySym.get(p.quote));
        lt = b.score !== null && q.score !== null ? Math.round((b.score - q.score) / 2 * 10) / 10 : null;
        basis = Array.from(/* @__PURE__ */ new Set([...b.pillars, ...q.pillars]));
      } else {
        const a = longTermScore(bySym.get(p.base));
        lt = a.score;
        basis = a.pillars;
      }
      return { symbol: p.symbol, display: p.display, assetClass: p.assetClass, base: p.base, quote: p.quote, shortTerm: p.score, longTerm: lt, confidence: p.confidence, basis };
    });
    const ok = (k) => rows.filter((r) => r[k] !== null && r.confidence >= 25);
    const top = (k, dir) => ok(k).filter((r) => r[k] * dir > 0).sort((a, b) => (b[k] - a[k]) * dir).slice(0, 12);
    cacheHeaders(res, s);
    res.json({ ok: true, data: {
      longTerm: { bullish: top("longTerm", 1), bearish: top("longTerm", -1) },
      shortTerm: { bullish: top("shortTerm", 1), bearish: top("shortTerm", -1) },
      // Every scored pair (for watchlists: any pair the user adds shows its fundamentals).
      all: rows.filter((r) => r.longTerm !== null || r.shortTerm !== null).map((r) => ({ symbol: r.symbol, display: r.display, longTerm: r.longTerm, shortTerm: r.shortTerm, confidence: r.confidence })),
      method: "Long-term = weighted structural pillars only (monetary policy, inflation, labour, growth, real rates, supply/demand, institutional COT positioning); risk mood, crowd sentiment and derivatives excluded. Pair = (base \u2212 quote) / 2. Short-term = full live score.",
      generatedAt: s.generatedAt
    } });
  } catch (err) {
    fail(res, err);
  }
});
var lastForce = 0;
macroRouter.post("/refresh", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const now = Date.now();
    if (now - lastForce < 6e4) {
      const s2 = await getSnapshot();
      return res.json({ ok: true, throttled: true, data: overview(s2) });
    }
    lastForce = now;
    const run = refreshAndCompute(true);
    run.catch(() => void 0);
    const s = await Promise.race([run, new Promise((r) => setTimeout(() => getSnapshot(Infinity).then(r), SERVERLESS2 ? 8e3 : 3e4))]);
    res.json({ ok: true, data: overview(s) });
  } catch (err) {
    fail(res, err);
  }
});
macroRouter.get("/audit", async (_req, res) => {
  try {
    const s = await getSnapshot();
    res.setHeader("Cache-Control", "no-store");
    const rows = s.assets.filter((a) => ["FOREX", "COMMODITIES", "INDICES", "CRYPTO"].includes(a.assetClass)).map((a) => {
      const inds = a.pillars.flatMap((p) => (p.indicators || []).map((i) => ({ pillar: p.id, ...i })));
      const count = (st) => inds.filter((i) => i.status === st).length;
      return {
        symbol: a.symbol,
        name: a.name,
        assetClass: a.assetClass,
        score: a.score,
        bias: a.bias,
        confidence: a.confidence,
        indicators: inds.length,
        live: count("live"),
        stale: count("stale"),
        missing: count("missing"),
        gaps: inds.filter((i) => i.status !== "live").map((i) => ({ pillar: i.pillar, name: i.name, status: i.status })),
        pillars: a.pillars.map((p) => ({ id: p.id, name: p.name, weight: p.weight, coverage: p.coverage, score: p.score }))
      };
    });
    const ccys = rows.filter((r) => r.assetClass === "FOREX");
    const names = Array.from(new Set(s.assets.filter((a) => a.assetClass === "FOREX").flatMap((a) => a.pillars.flatMap((p) => (p.indicators || []).map((i) => i.name)))));
    const parity = names.map((n) => ({
      indicator: n,
      byCurrency: Object.fromEntries(s.assets.filter((a) => a.assetClass === "FOREX").map((a) => {
        const hit = a.pillars.flatMap((p) => p.indicators || []).find((i) => i.name === n);
        return [a.symbol, hit ? hit.status : "n/a"];
      }))
    }));
    res.json({ ok: true, generatedAt: s.generatedAt, assets: rows, currencyParity: parity, currencyCount: ccys.length });
  } catch (err) {
    fail(res, err);
  }
});
macroRouter.get("/diagnostics", async (_req, res) => {
  try {
    const s = await getSnapshot();
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, serverless: SERVERLESS2, warming: warming(s), sources: s.sources, unmatchedCalendarTitles: unmatchedCalendarTitles(), generatedAt: s.generatedAt });
  } catch (err) {
    fail(res, err);
  }
});

// server/routes/historyRoutes.ts
var import_express2 = require("express");

// server/history/archive.ts
var import_node_zlib = require("node:zlib");
init_historyService();
var REPO = process.env.HISTORY_ARCHIVE_REPO || "whbzafar/prime-pip-command-center-level";
var MIN = 6e4;
var TF_MS2 = { m1: MIN, m5: 5 * MIN, m15: 15 * MIN, m30: 30 * MIN, h1: 60 * MIN, h4: 240 * MIN, d1: 1440 * MIN, w1: 7 * 1440 * MIN, mn1: 30 * 1440 * MIN };
var fileCache = /* @__PURE__ */ new Map();
function cget(k) {
  const v = fileCache.get(k);
  if (!v || Date.now() - v.at > v.ttl) return void 0;
  fileCache.delete(k);
  fileCache.set(k, v);
  return v.data;
}
var sizeOf = (d) => Array.isArray(d) ? d.length : 1;
function cset(k, data2, ttl) {
  fileCache.set(k, { at: Date.now(), ttl, data: data2 });
  let total = 0;
  for (const v of fileCache.values()) total += sizeOf(v.data);
  while (fileCache.size > 60 || total > 6e5 && fileCache.size > 1) {
    const oldest = fileCache.keys().next().value;
    total -= sizeOf(fileCache.get(oldest)?.data);
    fileCache.delete(oldest);
  }
}
async function fetchAsset(ticker, name) {
  const url = `https://github.com/${REPO}/releases/download/hist-${encodeURIComponent(ticker)}/${name}`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow", signal: AbortSignal.timeout(12e3) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`archive ${name}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
async function getManifest(ticker) {
  const k = `man|${ticker}`;
  const hit = cget(k);
  if (hit !== void 0) return hit;
  let m = null;
  for (let attempt = 0; attempt < 2 && !m; attempt++) {
    try {
      const buf = await fetchAsset(ticker, "manifest.json");
      m = buf ? JSON.parse(buf.toString("utf8")) : null;
      if (!buf) break;
    } catch {
      m = null;
    }
  }
  if (m) {
    try {
      const hist = await fetchAsset(ticker, "hist_m1.json");
      const hj = hist ? JSON.parse(hist.toString("utf8")) : null;
      const hm = hj?.months || [];
      if (hm.length) m.m1Months = Array.from(/* @__PURE__ */ new Set([...m.m1Months || [], ...hm])).sort();
      m.m1YearOf = {};
      for (const [y, ms] of Object.entries(hj?.years || {})) for (const mm of ms) m.m1YearOf[mm] = y;
    } catch {
    }
  }
  cset(k, m, m ? 10 * MIN : 2e4);
  return m;
}
function parseCsv2(buf) {
  const text = (0, import_node_zlib.gunzipSync)(buf).toString("utf8");
  const out = [];
  let i = 0;
  while (i < text.length) {
    let j = text.indexOf("\n", i);
    if (j < 0) j = text.length;
    const p = text.slice(i, j).split(",");
    i = j + 1;
    if (p.length < 5) continue;
    const c = { timestamp: Number(p[0]) * 1e3, open: +p[1], high: +p[2], low: +p[3], close: +p[4], volume: Number(p[5] || 0) };
    if (!(c.open > 0 && c.high >= c.low && Number.isFinite(c.timestamp))) continue;
    if (c.volume === 0 && c.open === c.high && c.high === c.low && c.low === c.close) continue;
    out.push(c);
  }
  return out;
}
async function loadFile(ticker, name, recent) {
  const k = `f|${ticker}|${name}`;
  const hit = cget(k);
  if (hit !== void 0) return hit;
  const buf = await fetchAsset(ticker, name);
  const rows = buf ? parseCsv2(buf) : [];
  cset(k, rows, recent ? 10 * MIN : 24 * 60 * MIN);
  return rows;
}
function bucket(rows, ms) {
  const out = [];
  for (const c of rows) {
    const b = c.timestamp - c.timestamp % ms;
    const last2 = out[out.length - 1];
    if (last2 && last2.timestamp === b) {
      last2.high = Math.max(last2.high, c.high);
      last2.low = Math.min(last2.low, c.low);
      last2.close = c.close;
      last2.volume += c.volume;
    } else out.push({ ...c, timestamp: b });
  }
  return out;
}
function shape(rows, tf) {
  if (tf === "w1" || tf === "mn1") return aggregate2(rows, tf);
  if (tf === "m1" || tf === "h1" || tf === "d1") return rows;
  return bucket(rows, TF_MS2[tf]);
}
var ym = (ts) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
async function archiveBefore(ticker, tf, before, count, fillRecent, budgetMs = 8e3) {
  const man = await getManifest(ticker);
  if (!man) return null;
  const started = Date.now();
  const family = tf === "m1" || tf === "m5" || tf === "m15" || tf === "m30" ? "m1" : tf === "h1" || tf === "h4" ? "h1" : "d1";
  let acc = [];
  let reachedStart = false;
  if (family === "d1") {
    if (man.d1Years?.length) {
      const years = man.d1Years.filter((y) => y <= new Date(before - 1).getUTCFullYear()).sort((a, b) => a - b);
      const parts = await Promise.all(years.map((y) => loadFile(ticker, `d1_${y}.csv.gz`, true)));
      acc = parts.flat().filter((c) => c.timestamp < before);
    } else {
      acc = (await loadFile(ticker, "d1.csv.gz", true)).filter((c) => c.timestamp < before);
    }
    reachedStart = true;
  } else {
    const keys = family === "m1" ? [...man.m1Months].sort().reverse().filter((k) => k <= ym(before - 1)) : [...man.h1Years].sort((a, b) => b - a).filter((y) => y <= new Date(before - 1).getUTCFullYear()).map(String);
    let i = 0;
    for (; i < keys.length; i++) {
      const yearFile = family === "m1" ? man.m1YearOf?.[keys[i]] : void 0;
      let rows;
      if (yearFile) {
        const all = await loadFile(ticker, `m1y_${yearFile}.csv.gz`, false);
        rows = all.filter((c) => ym(c.timestamp) === keys[i]);
        if (!rows.length) rows = await loadFile(ticker, `m1_${keys[i]}.csv.gz`, true);
      } else rows = await loadFile(ticker, `${family}_${keys[i]}.csv.gz`, true);
      acc = rows.filter((c) => c.timestamp < before).concat(acc);
      if (shape(acc, tf).length >= count) break;
      if (Date.now() - started > budgetMs) break;
    }
    reachedStart = i >= keys.length && (family === "h1" || man.m1Complete);
  }
  let live = 0;
  const lastArchived = acc.length ? acc[acc.length - 1].timestamp : 0;
  const now = Date.now();
  if (fillRecent && lastArchived && before > now - 5 * 864e5) {
    try {
      const nativeMs = TF_MS2[family];
      const fresh = (await fillRecent(family, lastArchived, Math.min(before, now + MIN))).map((c) => ({ ...c, timestamp: family === "d1" ? Math.floor((c.timestamp + 6 * 36e5) / 864e5) * 864e5 : c.timestamp - c.timestamp % nativeMs })).filter((c) => c.timestamp > lastArchived && c.timestamp < before);
      const merged = bucket(fresh, nativeMs);
      live = merged.length;
      acc = acc.concat(merged);
    } catch {
    }
  }
  const candles = shape(acc, tf);
  return { candles: candles.slice(-count), reachedStart: reachedStart && candles.length <= count, live };
}

// server/history/forexcom.ts
var API = () => (process.env.FOREXCOM_API || "https://ciapi.cityindex.com/TradingAPI").replace(/\/$/, "");
var forexcomConfigured = () => Boolean(process.env.FOREXCOM_USERNAME && process.env.FOREXCOM_PASSWORD && process.env.FOREXCOM_APPKEY);
var session = null;
var lastError = null;
var lastOkAt = 0;
var marketIds = /* @__PURE__ */ new Map();
async function login() {
  if (session && Date.now() - session.at < 50 * 6e4) return session.id;
  const r = await fetch(`${API()}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ UserName: process.env.FOREXCOM_USERNAME, Password: process.env.FOREXCOM_PASSWORD, AppKey: process.env.FOREXCOM_APPKEY, AppVersion: "1", AppComments: "PrimePipFX" }),
    signal: AbortSignal.timeout(8e3)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.Session) throw new Error(`login failed (${j.ErrorMessage || j.Message || `HTTP ${r.status}`})`);
  session = { id: j.Session, at: Date.now() };
  return j.Session;
}
async function api(path3) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const s = await login();
    const r = await fetch(`${API()}${path3}`, { headers: { Session: s, UserName: String(process.env.FOREXCOM_USERNAME) }, signal: AbortSignal.timeout(9e3) });
    if (r.status === 401 && attempt === 0) {
      session = null;
      continue;
    }
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.ErrorMessage || `HTTP ${r.status}`);
    return j;
  }
}
var COMMODITY = {
  xauusd: ["Spot Gold", "Gold"],
  xagusd: ["Spot Silver", "Silver"],
  lightcmdusd: ["US Crude Oil", "US Crude", "WTI"],
  brentcmdusd: ["UK Crude Oil", "UK Crude", "Brent"],
  gascmdusd: ["Natural Gas"],
  coppercmdusd: ["Copper"],
  xptusd: ["Spot Platinum", "Platinum"],
  xpdusd: ["Spot Palladium", "Palladium"]
};
function forexcomQueries(dukaId) {
  const id = dukaId.toLowerCase();
  if (COMMODITY[id]) return COMMODITY[id];
  if (/^[a-z]{6}$/.test(id)) return [`${id.slice(0, 3).toUpperCase()}/${id.slice(3).toUpperCase()}`];
  return null;
}
async function marketId(dukaId) {
  if (marketIds.has(dukaId)) return marketIds.get(dukaId);
  const qs = forexcomQueries(dukaId) || [];
  for (const q of qs) {
    const j = await api(`/market/fullsearchwithtags?query=${encodeURIComponent(q)}&maxResults=20`);
    const list = j?.MarketInformation || j?.Markets || [];
    const norm = (s) => String(s || "").toUpperCase();
    const pick = list.find((m) => norm(m.Name) === norm(q)) || list.find((m) => norm(m.Name).startsWith(norm(q)) && !/FUTURE|\d{2}\b/i.test(m.Name)) || list.find((m) => norm(m.Name).includes(norm(q)));
    if (pick?.MarketId) {
      marketIds.set(dukaId, Number(pick.MarketId));
      return Number(pick.MarketId);
    }
  }
  marketIds.set(dukaId, null);
  return null;
}
var TF_MAP = {
  m1: { interval: "MINUTE", span: 1 },
  m5: { interval: "MINUTE", span: 5 },
  m15: { interval: "MINUTE", span: 15 },
  m30: { interval: "MINUTE", span: 30 },
  h1: { interval: "HOUR", span: 1 },
  h4: { interval: "HOUR", span: 4 },
  d1: { interval: "DAY", span: 1 },
  w1: { interval: "WEEK", span: 1 },
  mn1: { interval: "DAY", span: 1, agg: "mn1" }
};
var parseCiDate = (v) => {
  const m = /Date\((-?\d+)/.exec(String(v));
  return m ? Number(m[1]) : Date.parse(String(v));
};
async function forexcomBefore(dukaId, tf, before, count) {
  if (!forexcomConfigured() || !forexcomQueries(dukaId)) return null;
  try {
    const id = await marketId(dukaId);
    if (!id) return null;
    const t = TF_MAP[tf];
    const n = Math.min(4e3, t.agg ? count * 23 : count);
    const j = await api(`/market/${id}/barhistorybefore?interval=${t.interval}&span=${t.span}&maxResults=${n}&toTimestampUTC=${Math.floor(before / 1e3)}&priceType=MID`);
    let candles = (j?.PriceBars || []).map((b) => ({ timestamp: parseCiDate(b.BarDate), open: +b.Open, high: +b.High, low: +b.Low, close: +b.Close, volume: 0 })).filter((c) => Number.isFinite(c.timestamp) && c.timestamp < before && Number.isFinite(c.close)).sort((a, b) => a.timestamp - b.timestamp);
    if (before >= Date.now() - 6e4 && j?.PartialPriceBar) {
      const b = j.PartialPriceBar;
      const ts = parseCiDate(b.BarDate);
      if (Number.isFinite(ts) && (!candles.length || ts > candles[candles.length - 1].timestamp)) candles.push({ timestamp: ts, open: +b.Open, high: +b.High, low: +b.Low, close: +b.Close, volume: 0 });
    }
    if (t.agg) {
      const { aggregate: aggregate3 } = await Promise.resolve().then(() => (init_historyService(), historyService_exports));
      candles = aggregate3(candles, t.agg);
    }
    if (!candles.length) return null;
    lastOkAt = Date.now();
    lastError = null;
    return { candles: candles.slice(-count), reachedStart: candles.length < Math.min(count, n) * 0.5 };
  } catch (err) {
    lastError = String(err?.message || err);
    return null;
  }
}
var forexcomStatus = () => ({ configured: forexcomConfigured(), lastOkAt: lastOkAt || null, lastError, markets: Object.fromEntries(marketIds) });

// server/history/oanda.ts
var oandaConfigured = () => Boolean(process.env.OANDA_TOKEN);
var HOST = () => process.env.OANDA_ENV === "live" ? "https://api-fxtrade.oanda.com" : "https://api-fxpractice.oanda.com";
var lastError2 = null;
var lastOkAt2 = 0;
var COMMODITY2 = {
  xauusd: "XAU_USD",
  xagusd: "XAG_USD",
  xptusd: "XPT_USD",
  xpdusd: "XPD_USD",
  lightcmdusd: "WTICO_USD",
  brentcmdusd: "BCO_USD",
  gascmdusd: "NATGAS_USD",
  coppercmdusd: "XCU_USD"
};
function oandaInstrument(dukaId) {
  const id = dukaId.toLowerCase();
  if (COMMODITY2[id]) return COMMODITY2[id];
  if (/^[a-z]{6}$/.test(id)) return `${id.slice(0, 3).toUpperCase()}_${id.slice(3).toUpperCase()}`;
  return null;
}
var GRAN = { m1: "M1", m5: "M5", m15: "M15", m30: "M30", h1: "H1", h4: "H4", d1: "D", w1: "W", mn1: "M" };
async function oandaBefore(dukaId, tf, before, count) {
  const inst = oandaInstrument(dukaId);
  if (!oandaConfigured() || !inst) return null;
  try {
    const live = before >= Date.now() - 6e4;
    const n = Math.min(5e3, Math.max(1, count));
    const q = `granularity=${GRAN[tf]}&count=${n}&price=M&alignmentTimezone=UTC&dailyAlignment=0&weeklyAlignment=Monday${live ? "" : `&to=${encodeURIComponent(new Date(before).toISOString())}`}`;
    const r = await fetch(`${HOST()}/v3/instruments/${inst}/candles?${q}`, { headers: { Authorization: `Bearer ${process.env.OANDA_TOKEN}`, "Accept-Datetime-Format": "UNIX" }, signal: AbortSignal.timeout(9e3) });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.errorMessage || `HTTP ${r.status}`);
    const candles = (j?.candles || []).map((c) => ({ timestamp: Math.round(Number(c.time) * 1e3), open: +c.mid.o, high: +c.mid.h, low: +c.mid.l, close: +c.mid.c, volume: Number(c.volume) || 0 })).filter((c) => Number.isFinite(c.timestamp) && c.timestamp < before + (live ? 864e5 : 0) && Number.isFinite(c.close));
    if (!candles.length) return null;
    lastOkAt2 = Date.now();
    lastError2 = null;
    return { candles, reachedStart: candles.length < n * 0.5 };
  } catch (err) {
    lastError2 = String(err?.message || err);
    return null;
  }
}
var oandaStatus = () => ({ configured: oandaConfigured(), env: process.env.OANDA_ENV === "live" ? "live" : "practice", lastOkAt: lastOkAt2 || null, lastError: lastError2 });

// server/routes/historyRoutes.ts
init_historyService();
var historyRouter = (0, import_express2.Router)();
historyRouter.get("/candles", async (req, res) => {
  const src = String(req.query.src || "");
  const id = String(req.query.id || "").trim();
  const tf = String(req.query.tf || "");
  const before = Number(req.query.before) || Date.now();
  const count = Math.min(5e3, Math.max(1, Number(req.query.count) || 500));
  if (!id || !TF_LIST.includes(tf) || src !== "duka" && src !== "yahoo") {
    return res.status(400).json({ ok: false, error: "Required: src=duka|yahoo, id, tf (m1,m5,m15,m30,h1,h4,d1,w1,mn1)" });
  }
  const alt = String(req.query.alt || "").trim();
  const arch = String(req.query.arch || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  try {
    let r = { candles: [], reachedStart: false };
    let used = src;
    let primaryError = null;
    if (src === "duka" && req.query.feed !== "duka") {
      let fxSrc = "forexcom";
      let fx = await forexcomBefore(id, tf, before, count);
      if (!fx?.candles.length) {
        fx = await oandaBefore(id, tf, before, count);
        fxSrc = "oanda";
      }
      if (fx && fx.candles.length) {
        res.setHeader("Cache-Control", before < Date.now() - 3 * 864e5 ? "public, max-age=3600, s-maxage=86400" : "public, max-age=5, s-maxage=10, stale-while-revalidate=30");
        return res.json({ ok: true, src: fxSrc, id, tf, candles: fx.candles, reachedStart: fx.reachedStart, fallback: false });
      }
    }
    if (src === "duka" && arch) {
      try {
        const a = await archiveBefore(arch, tf, before, count, async (native, after, until) => {
          const n = Math.min(5e3, Math.ceil((until - after) / { m1: 6e4, h1: 36e5, d1: 864e5 }[native]) + 5);
          const [d, y] = await Promise.all([
            dukaBefore(id.toLowerCase(), native, until, n, 6e3).then((r3) => r3.candles).catch(() => []),
            alt ? yahooAny(alt, native, until, n).then((r3) => r3.candles).catch(() => []) : Promise.resolve([])
          ]);
          if (!d.length) return y;
          const last2 = d[d.length - 1];
          const tailY = y.filter((c) => c.timestamp > last2.timestamp);
          const ref = y.filter((c) => c.timestamp <= last2.timestamp).pop();
          const same = ref && Math.abs(ref.close - last2.close) / last2.close < 15e-4;
          return same ? d.concat(tailY) : d;
        });
        if (a && a.candles.length) {
          const historicA = before < Date.now() - 3 * 864e5;
          res.setHeader("Cache-Control", historicA ? "public, max-age=86400, s-maxage=604800" : "public, max-age=5, s-maxage=10, stale-while-revalidate=30");
          return res.json({ ok: true, src: "archive", id, tf, candles: a.candles, reachedStart: a.reachedStart, live: a.live, fallback: false });
        }
      } catch (err) {
        primaryError = `Archive: ${err?.message || err}`;
      }
    }
    try {
      r = src === "duka" ? await dukaBefore(id.toLowerCase(), tf, before, count) : await yahooBefore(id, tf, before, count);
    } catch (err) {
      primaryError = `${src === "duka" ? "Dukascopy" : "Yahoo"}: ${err?.message || err}`;
      r = { candles: [], reachedStart: false };
    }
    if ((primaryError || !r.candles.length && !r.reachedStart) && alt && src === "duka") {
      try {
        r = await yahooAny(alt, tf, before, count);
        used = "yahoo";
      } catch (err) {
        if (primaryError) throw new Error(`${primaryError} \xB7 Yahoo: ${err?.message || err}`);
      }
    } else if (primaryError) throw new Error(primaryError);
    const historic = before < Date.now() - 3 * 864e5;
    res.setHeader("Cache-Control", !r.candles.length ? "no-store" : !historic ? "public, max-age=5, s-maxage=10, stale-while-revalidate=30" : used === src ? "public, max-age=86400, s-maxage=2592000, immutable" : "public, max-age=0, s-maxage=60");
    res.json({ ok: true, src: used, id, tf, candles: r.candles, reachedStart: r.reachedStart, fallback: used !== src, archiveNote: primaryError || void 0 });
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ ok: false, error: err?.message || "History source unavailable" });
  }
});
historyRouter.get("/forexcom", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, forexcom: forexcomStatus(), oanda: oandaStatus() });
});
historyRouter.get("/feeds", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, forexcom: forexcomStatus(), oanda: oandaStatus() });
});
historyRouter.get("/archive", async (req, res) => {
  const t = String(req.query.ticker || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = t ? await getManifest(t) : null;
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
  if (!m) return res.json({ ok: false, error: `No archive yet for ${t || "?"}` });
  res.json({
    ok: true,
    ticker: t,
    minuteFrom: m.m1Months[0] || null,
    minuteMonths: m.m1Months.length,
    minuteComplete: m.m1Complete,
    minutePending: m.m1Pending ?? null,
    hourlyYears: m.h1Years,
    dailyYears: m.d1Years ?? null,
    lastCandle: new Date(m.lastCandle * 1e3).toISOString(),
    builtAt: new Date(m.builtAt * 1e3).toISOString(),
    source: m.source
  });
});
historyRouter.get("/instruments", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
  res.json({ ok: true, instruments: listDukaInstruments() });
});

// server/macro/standalone.ts
var macroApp = (0, import_express3.default)();
macroApp.use("/api/macro", macroRouter);
macroApp.use("/api/history", historyRouter);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  historyRouter,
  macroApp,
  macroRouter
});
