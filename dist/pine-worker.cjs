var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// server/pine/pineWorker.ts
var import_worker_threads = require("worker_threads");

// server/pine/pineRunner.ts
var import_path = __toESM(require("path"), 1);
var import_crypto = require("crypto");
var import_url = require("url");

// src/utils/pineCompat.ts
var isId = (c) => /[A-Za-z0-9_.]/.test(c);
var KEYWORDS = /* @__PURE__ */ new Set(["if", "while", "for", "switch", "and", "or", "not", "else", "in", "to", "by", "return"]);
function skipLiteral(s, i) {
  const c = s[i];
  if (c === '"' || c === "'") {
    let j = i + 1;
    while (j < s.length && s[j] !== c) {
      if (s[j] === "\\") j++;
      j++;
    }
    return Math.min(s.length, j + 1);
  }
  if (c === "/" && s[i + 1] === "/") {
    const n = s.indexOf("\n", i);
    return n < 0 ? s.length : n;
  }
  return i;
}
function matchClose(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    const j = skipLiteral(s, i);
    if (j !== i) {
      i = j - 1;
      continue;
    }
    const c = s[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function splitArgs(s) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const j = skipLiteral(s, i);
    if (j !== i) {
      i = j - 1;
      continue;
    }
    const c = s[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (c === "," && depth === 0) {
      out.push(s.slice(start, i));
      start = i + 1;
    }
  }
  out.push(s.slice(start));
  return out;
}
function isLogical(expr) {
  let depth = 0;
  let logical = false;
  for (let i = 0; i < expr.length; i++) {
    const j = skipLiteral(expr, i);
    if (j !== i) {
      if (expr[i] === "/") return false;
      i = j - 1;
      continue;
    }
    const c = expr[i];
    if (c === "(" || c === "[") depth++;
    else if (c === ")" || c === "]") depth--;
    else if (depth === 0) {
      if (c === "?") return false;
      if ((c === "a" || c === "o") && (i === 0 || !isId(expr[i - 1]))) {
        const w = expr.startsWith("and", i) ? 3 : expr.startsWith("or", i) ? 2 : 0;
        if (w && !isId(expr[i + w] || " ")) logical = true;
      }
    }
  }
  return logical;
}
function fixArg(arg) {
  const named = arg.match(/^(\s*[A-Za-z_]\w*\s*=(?!=))([\s\S]*)$/);
  const head = named ? named[1] : "";
  const body = fix(named ? named[2] : arg);
  if (!isLogical(body)) return head + body;
  const lead = body.match(/^\s*/)[0];
  const trail = body.match(/\s*$/)[0];
  return `${head}${lead}((${body.trim()}) ? true : false)${trail}`;
}
function fix(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const j = skipLiteral(s, i);
    if (j !== i) {
      out += s.slice(i, j);
      i = j - 1;
      continue;
    }
    if (s[i] !== "(") {
      out += s[i];
      continue;
    }
    const close = matchClose(s, i);
    if (close < 0) {
      out += s.slice(i);
      break;
    }
    const inner = s.slice(i + 1, close);
    let k = i - 1;
    while (k >= 0 && isId(s[k])) k--;
    const name = s.slice(k + 1, i);
    const isCall = name !== "" && !/^[0-9.]/.test(name) && !KEYWORDS.has(name);
    const isDefinition = /^[ \t]*=>/.test(s.slice(close + 1, close + 12));
    if (isDefinition) out += `(${inner})`;
    else if (isCall) out += `(${splitArgs(inner).map(fixArg).join(",")})`;
    else out += `(${fix(inner)})`;
    i = close;
  }
  return out;
}
function pineCompat(source) {
  try {
    const f = fix(String(source || "").replace(/\r\n/g, "\n"));
    return guardLoops(f) ?? f;
  } catch {
    return source;
  }
}
function guardLoops(src) {
  const lines = src.split("\n");
  const at = lines.findIndex((l) => /^\s+for k = \(s\.tst \? s\.next : math\.max\(s\.next, sI\)\) to i\b/.test(l));
  if (at < 0) return null;
  const indent = lines[at].match(/^\s+/)[0];
  let end = at + 1;
  while (end < lines.length && (lines[end].trim() === "" || lines[end].match(/^\s*/)[0].length > indent.length)) end++;
  while (end > at + 1 && lines[end - 1].trim() === "") end--;
  const block = lines.slice(at, end).map((l) => l.trim() ? `    ${l}` : l);
  return [...lines.slice(0, at), `${indent}if (s.tst ? s.next : math.max(s.next, sI)) <= i`, ...block, ...lines.slice(end)].join("\n");
}

// server/pine/pineRunner.ts
var esmImport = new Function("s", "return import(s)");
var enginePromise = null;
var bundled = () => esmImport((0, import_url.pathToFileURL)(import_path.default.join(process.cwd(), "dist", "pine-engine.mjs")).href);
var loadEngine = () => enginePromise ??= bundled().catch(() => esmImport("@luxalgo/vela-pinets")).catch(() => import("@luxalgo/vela-pinets")).then((m) => m.PineEngine || m.default?.PineEngine);
var sharedEngine = null;
var newEngine = async () => sharedEngine ??= loadEngine().then((PineEngine) => new PineEngine()).catch((e) => {
  sharedEngine = null;
  throw e;
});
var preparedCache = /* @__PURE__ */ new Map();
var sourceKey = (src) => `${src.length}:${(0, import_crypto.createHash)("sha1").update(src).digest("hex")}`;
async function prepareCached(engine, source) {
  const k = sourceKey(source);
  const hit = preparedCache.get(k);
  if (hit) return hit;
  const prepared = await engine.prepare(pineCompat(source), "srv");
  preparedCache.set(k, prepared);
  if (preparedCache.size > 8) preparedCache.delete(preparedCache.keys().next().value);
  return prepared;
}
var STATS = /WIN RATE|Total R\b|Avg R\b|\bSkipped\b|Zone R\b|TP\/Hurdle|\bTrades\b|\bBull\b[\s\S]*\bBear\b/i;
var HEAVY = /SBT ?6\b|\bRR ?1:\d|\blot\b|\bTP\b|\bSL\b|\bTP ?\d|Target|\bExit\b|\bBE\b|\b(BUY|SELL) L\d/i;
var leanArr = (arr) => Array.isArray(arr) ? arr.filter((x) => {
  const t = x?.text ?? x?.title ?? "";
  return !(t && HEAVY.test(String(t)));
}) : arr;
function stripStatsTables(model) {
  if (!model) return model;
  model = { ...model };
  for (const k of ["labels", "boxes", "lines"]) if (Array.isArray(model[k])) model[k] = leanArr(model[k]);
  if ("trades" in model) model.trades = [];
  if (!Array.isArray(model.tables)) return model;
  const keep = model.tables.filter((t) => {
    try {
      return !STATS.test((t?.cells || []).flat().map((c) => String(c?.text ?? "")).join(" | "));
    } catch {
      return true;
    }
  });
  return { ...model, tables: keep };
}
var resultCache = /* @__PURE__ */ new Map();
var RESULT_TTL = 45e3;
var runKey = (input, bars) => {
  const h = (0, import_crypto.createHash)("sha1");
  h.update(sourceKey(input.source));
  h.update(JSON.stringify([input.market, input.inputs || null, input.props || null]));
  h.update(JSON.stringify(bars));
  const sup = input.series || {};
  for (const k of Object.keys(sup).sort()) {
    h.update(k);
    h.update(String(sup[k]?.length || 0));
    const last = sup[k]?.[sup[k].length - 1];
    h.update(JSON.stringify(last ?? null));
  }
  return h.digest("hex");
};
var MAX_BARS = 5e3;
var RUN_TIMEOUT_MS = 4e4;
var seriesKey = (symbol, timeframe) => `${String(symbol).toUpperCase()}|${timeframe}`;
var cleanBars = (bars) => (Array.isArray(bars) ? bars : []).map((b) => Array.isArray(b) ? { time: Number(b[0]), open: Number(b[1]), high: Number(b[2]), low: Number(b[3]), close: Number(b[4]), volume: Number(b[5] ?? 0) } : { time: Number(b.time), open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close), volume: Number(b.volume ?? 0) }).filter((b) => Number.isFinite(b.time) && Number.isFinite(b.close)).slice(-MAX_BARS);
function errorLine(err) {
  const msg = String(err?.message || err || "");
  const line = Number(err?.line ?? err?.loc?.line ?? msg.match(/line\s+(\d+)/i)?.[1] ?? NaN);
  return Number.isFinite(line) ? line : null;
}
async function runScriptInProcess(input) {
  const t0 = Date.now();
  let engine;
  try {
    engine = await newEngine();
  } catch (err) {
    return { ok: false, error: `Pine engine unavailable: ${err?.message || err}`, ms: Date.now() - t0 };
  }
  const supplied = input.series || {};
  const need = /* @__PURE__ */ new Map();
  const warnings = [];
  const alerts = [];
  let prepared;
  try {
    prepared = await prepareCached(engine, input.source);
  } catch (err) {
    return { ok: false, error: String(err?.message || err), line: errorLine(err), ms: Date.now() - t0 };
  }
  const bars = cleanBars(input.bars);
  if (!bars.length) return { ok: false, error: "No bars to run on.", ms: Date.now() - t0 };
  const cacheKey = runKey(input, bars);
  const cached = resultCache.get(cacheKey);
  if (cached && Date.now() - cached.at < RESULT_TTL) return { ...cached.out, ms: Date.now() - t0 };
  const fetchSeries = async (symbol, timeframe, range) => {
    const key = seriesKey(symbol, timeframe);
    const rows = supplied[key];
    if (!rows) {
      need.set(key, { symbol, timeframe, range: { from: range?.from, to: range?.to, limit: range?.limit } });
      return [];
    }
    return cleanBars(rows).filter((b) => (range?.from === void 0 || b.time >= range.from) && (range?.to === void 0 || b.time <= range.to));
  };
  return await new Promise((resolve) => {
    let model = null;
    let settled = false;
    const finish = (out) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        session?.stop();
      } catch {
      }
      const full = { ...out, ms: Date.now() - t0 };
      if (full.ok && !full.need) {
        resultCache.set(cacheKey, { at: Date.now(), out: full });
        if (resultCache.size > 10) resultCache.delete(resultCache.keys().next().value);
      }
      resolve(full);
    };
    const timer = setTimeout(() => finish({ ok: false, error: "The script took too long to run on this many bars." }), RUN_TIMEOUT_MS);
    let session;
    try {
      session = engine.execute(
        {
          prepared,
          market: { symbol: input.market.symbol, timeframe: input.market.timeframe, symbolInfo: input.market.symbolInfo },
          bars,
          getBars: () => bars,
          fetchSeries,
          inputs: input.inputs,
          props: input.props,
          mode: "static",
          historyState: "complete"
        },
        {
          onModel: (m) => {
            model = m;
          },
          onWarning: (w) => {
            warnings.push(String(w?.message || w));
          },
          onAlert: (a) => {
            alerts.push(a);
          },
          onError: (err) => {
            if (process.env.PPFX_PINE_DEBUG) console.error("PINE-ERR", err?.stack || err, JSON.stringify(err)?.slice(0, 500));
            finish({ ok: false, error: String(err?.message || err), line: errorLine(err) });
          },
          onDone: () => {
            if (need.size) finish({ ok: true, need: [...need.values()] });
            else finish({ ok: true, model: stripStatsTables(model), warnings, alerts: alerts.slice(-50) });
          }
        }
      );
    } catch (err) {
      finish({ ok: false, error: String(err?.message || err), line: errorLine(err) });
    }
  });
}

// server/pine/pineWorker.ts
import_worker_threads.parentPort?.on("message", async (msg) => {
  let out;
  try {
    out = await runScriptInProcess(msg.input);
  } catch (err) {
    out = { ok: false, error: String(err?.message || err), ms: 0 };
  }
  import_worker_threads.parentPort.postMessage({ id: msg.id, out });
});
