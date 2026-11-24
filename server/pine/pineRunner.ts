import path from 'path';
import { createHash } from 'crypto';
import { pathToFileURL } from 'url';
import { pineCompat } from '../../src/utils/pineCompat';
/**
 * Runs a stored Pine Script on the server and returns only its drawn output (plots, labels,
 * boxes, tables, strategy fills…). The browser of a student never receives the source.
 *
 * `request.security` series are not fetched here: the first pass reports which
 * (symbol, timeframe, range) the script asked for, the browser loads them from the app's own
 * feed and posts them back, and the second pass completes the run.
 */
// Loaded lazily as an ES module: the package's CommonJS build pulls an ES-only dependency that
// Vercel's runtime refuses to require(), and a static import would stop the whole server from
// starting. `new Function` keeps esbuild from rewriting import() into require().
const esmImport = new Function('s', 'return import(s)') as (s: string) => Promise<any>;
let enginePromise: Promise<any> | null = null;
// Production: dist/pine-engine.mjs is a single self-contained ES module built with the server.
const bundled = () => esmImport(pathToFileURL(path.join(process.cwd(), 'dist', 'pine-engine.mjs')).href);
const loadEngine = () => (enginePromise ??= bundled()
  .catch(() => esmImport('@luxalgo/vela-pinets'))
  // Test runners (vm contexts) cannot use the Function-based import; use a regular one there.
  .catch(() => import('@luxalgo/vela-pinets'))
  .then((m: any) => m.PineEngine || m.default?.PineEngine));
// Speed: one engine for the whole process, and a parsed copy of each script (re-parsing on every run cost time).
let sharedEngine: Promise<any> | null = null;
const newEngine = async () => (sharedEngine ??= loadEngine().then((PineEngine: any) => new PineEngine()).catch((e: any) => { sharedEngine = null; throw e; }));
const preparedCache = new Map<string, any>();
const sourceKey = (src: string) => `${src.length}:${createHash('sha1').update(src).digest('hex')}`;
async function prepareCached(engine: any, source: string) {
  const k = sourceKey(source);
  const hit = preparedCache.get(k);
  if (hit) return hit;
  const prepared = await engine.prepare(pineCompat(source), 'srv');
  preparedCache.set(k, prepared);
  if (preparedCache.size > 8) preparedCache.delete(preparedCache.keys().next().value as string);
  return prepared;
}

// Speed: an identical request (same script, market, bars, inputs and supplied series) is answered from memory for 45 s —
// switching back to a pair/timeframe, or the browser's repeated runs on unchanged bars, then costs nothing.
/** Statistics panels (SBT model table, win-rate box) are never sent to the browser; the small status box is. */
const STATS = /WIN RATE|Total R\b|Avg R\b|\bSkipped\b|Zone R\b|TP\/Hurdle|\bTrades\b|\bBull\b[\s\S]*\bBear\b/i;
export function stripStatsTables(model: any) {
  if (!model || !Array.isArray(model.tables)) return model;
  const keep = model.tables.filter((t: any) => { try { return !STATS.test((t?.cells || []).flat().map((c: any) => String(c?.text ?? '')).join(' | ')); } catch { return true; } });
  return { ...model, tables: keep };
}
const resultCache = new Map<string, { at: number; out: RunOutput }>();
export const clearPineCaches = () => { resultCache.clear(); preparedCache.clear(); };
const RESULT_TTL = 45_000;
const runKey = (input: RunInput, bars: any[]) => {
  const h = createHash('sha1');
  h.update(sourceKey(input.source)); h.update(JSON.stringify([input.market, input.inputs || null, input.props || null]));
  h.update(JSON.stringify(bars));
  const sup = input.series || {};
  for (const k of Object.keys(sup).sort()) { h.update(k); h.update(String(sup[k]?.length || 0)); const last = sup[k]?.[sup[k].length - 1]; h.update(JSON.stringify(last ?? null)); }
  return h.digest('hex');
};

export interface SeriesNeed { symbol: string; timeframe: string; range: { from?: number; to?: number; limit?: number } }
export interface RunInput {
  source: string;
  market: { symbol: string; timeframe: string; symbolInfo?: any };
  bars: Array<{ time: number; open: number; high: number; low: number; close: number; volume?: number }>;
  inputs?: Record<string, any>;
  props?: Record<string, any>;
  series?: Record<string, any[]>;
}
export interface RunOutput {
  ok: boolean;
  model?: any;
  need?: SeriesNeed[];
  warnings?: string[];
  alerts?: any[];
  error?: string;
  line?: number | null;
  ms: number;
}

export const MAX_BARS = 5000;
const RUN_TIMEOUT_MS = 40_000;
export const seriesKey = (symbol: string, timeframe: string) => `${String(symbol).toUpperCase()}|${timeframe}`;

// Rows arrive either as objects or as compact arrays [time, open, high, low, close, volume] (half the upload).
const cleanBars = (bars: any[]) =>
  (Array.isArray(bars) ? bars : [])
    .map((b) => (Array.isArray(b)
      ? { time: Number(b[0]), open: Number(b[1]), high: Number(b[2]), low: Number(b[3]), close: Number(b[4]), volume: Number(b[5] ?? 0) }
      : { time: Number(b.time), open: Number(b.open), high: Number(b.high), low: Number(b.low), close: Number(b.close), volume: Number(b.volume ?? 0) }))
    .filter((b) => Number.isFinite(b.time) && Number.isFinite(b.close))
    .slice(-MAX_BARS);

/** Prepare (parse) a script and return its schema WITHOUT the source-bearing token. */
export async function prepareScript(source: string, instanceId: string) {
  const engine0 = await newEngine();
  const prepared: any = await engine0.prepare(pineCompat(source), instanceId);
  const { token: _token, ...safe } = prepared;
  return safe;
}

export function errorLine(err: any): number | null {
  const msg = String(err?.message || err || '');
  const line = Number(err?.line ?? err?.loc?.line ?? msg.match(/line\s+(\d+)/i)?.[1] ?? NaN);
  return Number.isFinite(line) ? line : null;
}

export async function runScript(input: RunInput): Promise<RunOutput> {
  const t0 = Date.now();
  let engine: any;
  try { engine = await newEngine(); } catch (err: any) { return { ok: false, error: `Pine engine unavailable: ${err?.message || err}`, ms: Date.now() - t0 }; }
  const supplied = input.series || {};
  const need = new Map<string, SeriesNeed>();
  const warnings: string[] = [];
  const alerts: any[] = [];
  let prepared: any;
  try {
    prepared = await prepareCached(engine, input.source);
  } catch (err: any) {
    return { ok: false, error: String(err?.message || err), line: errorLine(err), ms: Date.now() - t0 };
  }
  const bars = cleanBars(input.bars);
  if (!bars.length) return { ok: false, error: 'No bars to run on.', ms: Date.now() - t0 };
  const cacheKey = runKey(input, bars);
  const cached = resultCache.get(cacheKey);
  if (cached && Date.now() - cached.at < RESULT_TTL) return { ...cached.out, ms: Date.now() - t0 };

  const fetchSeries = async (symbol: string, timeframe: string, range: any) => {
    const key = seriesKey(symbol, timeframe);
    const rows = supplied[key];
    if (!rows) {
      need.set(key, { symbol, timeframe, range: { from: range?.from, to: range?.to, limit: range?.limit } });
      return [];
    }
    return cleanBars(rows).filter((b) => (range?.from === undefined || b.time >= range.from) && (range?.to === undefined || b.time <= range.to));
  };

  return await new Promise<RunOutput>((resolve) => {
    let model: any = null;
    let settled = false;
    const finish = (out: Omit<RunOutput, 'ms'>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { session?.stop(); } catch { /* ignore */ }
      const full = { ...out, ms: Date.now() - t0 };
      if (full.ok && !full.need) { resultCache.set(cacheKey, { at: Date.now(), out: full }); if (resultCache.size > 10) resultCache.delete(resultCache.keys().next().value as string); }
      resolve(full);
    };
    const timer = setTimeout(() => finish({ ok: false, error: 'The script took too long to run on this many bars.' }), RUN_TIMEOUT_MS);
    let session: any;
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
          mode: 'static',
          historyState: 'complete',
        } as any,
        {
          onModel: (m: any) => { model = m; },
          onWarning: (w: any) => { warnings.push(String(w?.message || w)); },
          onAlert: (a: any) => { alerts.push(a); },
          onError: (err: any) => { if (process.env.PPFX_PINE_DEBUG) console.error('PINE-ERR', err?.stack || err, JSON.stringify(err)?.slice(0, 500)); finish({ ok: false, error: String(err?.message || err), line: errorLine(err) }); },
          onDone: () => {
            if (need.size) finish({ ok: true, need: [...need.values()] });
            else finish({ ok: true, model: stripStatsTables(model), warnings, alerts: alerts.slice(-50) });
          },
        },
      );
    } catch (err: any) {
      finish({ ok: false, error: String(err?.message || err), line: errorLine(err) });
    }
  });
}
