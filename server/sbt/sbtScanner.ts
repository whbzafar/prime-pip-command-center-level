/**
 * SBT LEVEL SCANNER — runs the owner's private "Prime Pip SBT" strategy on the server, on closed
 * H1 candles, and reports when price has reached Level 1 / Level 2 with a completed model
 * (the exact moment the strategy itself places its order). Only the result leaves the server:
 * the script source is never sent to a browser.
 *
 * The strategy code is NOT re-implemented here. The real script runs unchanged; three small
 * read-only taps are added at run time so its own decisions can be read back:
 *   1. every model the script counts (its f_cnt call) is noted with the candle time,
 *   2. at the line where the script places its entry order, the signal is noted,
 *   3. on the last candle the notes and the current Level 1 / Level 2 zones are printed in one label.
 *
 * Source of the script: the administrator's saved library script whose name contains "SBT"
 * (newest first), otherwise the encrypted copy bundled with the app (data/sbt_strategy.enc,
 * AES-256-GCM, key in the PPFX_STRATEGY_KEY environment variable).
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { CATALOG, type CatalogEntry } from '../../src/components/chartAnalysis/fullHistoryDatafeed';
import { archiveBefore } from '../history/archive.js';
import { dukaBefore, yahooAny, yahooBefore, type Candle, type Tf } from '../history/historyService.js';
import { readScripts } from '../pine/pineStore.js';
import { runScript, seriesKey } from '../pine/pineRunner.js';
import { guardLoops } from '../../src/utils/pineCompat';

export const H1 = 3_600_000;
const H1_BARS = Number(process.env.PPFX_SBT_BARS || 2500);
export const MODEL_NAMES = ['SBT 1', 'SBT 2', 'SBT 3', 'SBT 4', 'SBT 5', 'SBT 6', 'SBT 7A', 'SBT 7B', 'SBT 8A', 'SBT 8B', 'SBT 9A', 'SBT 9B', 'SBT 10A', 'SBT 10B'];
const ZONE_SLOTS: Record<number, number[]> = { 1: [1, 2, 4], 2: [0, 3] };
const LIQ_SLOTS: Record<number, number[]> = { 1: [8, 9, 10, 11], 2: [6, 7, 12, 13] };

export interface SbtSignal { time: number; dir: 1 | -1; level: 1 | 2; price: number; stop: number; target: number; zoneTop: number; zoneBottom: number; bosTime: number; models: string[] }
export interface SbtZone { top: number; bottom: number; modelReady: boolean }
export interface SbtScan {
  ok: true; symbol: string; bar: number; lastCandle: number; bars: number; trend: -1 | 0 | 1;
  armed: boolean; dir: -1 | 0 | 1; level1: SbtZone | null; level2: SbtZone | null; level1Done: boolean; htfWait: boolean; inTrade: boolean;
  signals: SbtSignal[]; ms: number; source: 'library' | 'bundled'; guarded: boolean;
  /** The newest closed candle is older than it should be while the market is open: do not act on this answer. */
  stale: boolean;
}
export interface SbtFail { ok: false; symbol: string; error: string; code: 'not_configured' | 'no_data' | 'run_failed' | 'unknown_symbol' }

// ───────────────────────────── the private script
function bundled(): string | null {
  const key = process.env.PPFX_STRATEGY_KEY || '';
  if (!key) return null;
  try {
    const raw = Buffer.from(fs.readFileSync(path.join(process.cwd(), 'data', 'sbt_strategy.enc'), 'utf8').trim(), 'base64');
    const d = crypto.createDecipheriv('aes-256-gcm', crypto.createHash('sha256').update(key).digest(), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return zlib.gunzipSync(Buffer.concat([d.update(raw.subarray(28)), d.final()])).toString('utf8');
  } catch { return null; }
}

/** Adds the three read-only taps. Returns null when the script is not the SBT strategy (no hook points). */
export function instrument(src: string): string | null {
  const out: string[] = [];
  let cnt = false, sig = false;
  for (const line of src.split(/\r?\n/)) {
    if (!cnt && /^f_cnt\s*\(\s*int\s+slot\s*,\s*int\s+dir\s*,\s*int\s+d\s*\)\s*=>\s*$/.test(line)) {
      cnt = true;
      out.push('var array<string> ppfxEv = array.new<string>()', 'var array<string> ppfxSig = array.new<string>()', line,
        '    if d > 0',
        '        array.push(ppfxEv, str.tostring(slot) + "," + str.tostring(dir) + "," + str.tostring(time))',
        '        if array.size(ppfxEv) > 16',
        '            array.shift(ppfxEv)');
      continue;
    }
    const m = !sig && cnt ? line.match(/^(\s+)strategy\.entry\(\s*idS\s*,/) : null;
    if (m) {
      sig = true;
      const p = m[1];
      out.push(
        `${p}array.push(ppfxSig, str.tostring(array.get(T, i)) + "|" + str.tostring(t.dir) + "|" + str.tostring(t.sigLvl) + "|" + str.tostring(t.dir * c) + "|" + str.tostring(t.dir * slS) + "|" + str.tostring(t.dir * t.sigTp) + "|" + str.tostring(array.get(T, t.bos)) + "|" + (t.pd1 ? "1" : "0") + (t.pd2 ? "1" : "0") + (t.m1 ? "1" : "0") + (t.m2 ? "1" : "0") + "|" + str.tostring(t.dir * (t.sigLvl == 1 ? t.z1Top : t.z2Top)) + "|" + str.tostring(t.dir * (t.sigLvl == 1 ? t.z1Bot : t.z2Bot)) + "|" + array.join(ppfxEv, ";"))`,
        `${p}if array.size(ppfxSig) > 6`,
        `${p}    array.shift(ppfxSig)`,
      );
    }
    out.push(line);
  }
  if (!cnt || !sig) return null;
  out.push(
    '',
    'if barstate.islast or barstate.islastconfirmedhistory',
    '    label.new(bar_index, high, "PPFXOUT#" + str.tostring(time) + "#" + str.tostring(trend) + "#" + (trd.arm ? "1" : "0") + "," + str.tostring(trd.dir) + "," + (trd.z1 ? str.tostring(trd.dir * trd.z1Top) + "," + str.tostring(trd.dir * trd.z1Bot) : ",") + "," + (trd.z2 ? str.tostring(trd.dir * trd.z2Top) + "," + str.tostring(trd.dir * trd.z2Bot) : ",") + "," + (trd.pd1 ? "1" : "0") + (trd.pd2 ? "1" : "0") + (trd.m1 ? "1" : "0") + (trd.m2 ? "1" : "0") + (trd.l1Dead ? "1" : "0") + (trd.dead ? "1" : "0") + (trd.hb ? "1" : "0") + (trd.live ? "1" : "0") + "#" + array.join(ppfxSig, "#"))',
    '',
  );
  return out.join('\n');
}

type Loaded = { src: string; guarded: string | null; source: 'library' | 'bundled' };
let scriptCache: { at: number; v: Loaded | null } | null = null;
async function loadScript() {
  if (scriptCache && Date.now() - scriptCache.at < 60_000) return scriptCache.v;
  let v: Loaded | null = null;
  const make = (raw: string, source: 'library' | 'bundled'): Loaded | null => {
    const i = instrument(raw.replace(/\r\n/g, '\n'));
    if (!i) return null;
    const g = guardLoops(i);
    return { src: i, guarded: g, source };
  };
  try {
    const lib = (await readScripts()).filter((s) => /sbt/i.test(s.name)).sort((a, b) => b.updatedAt - a.updatedAt);
    for (const s of lib) { v = make(s.source, 'library'); if (v) break; }
  } catch { /* library unavailable */ }
  if (!v) { const b = bundled(); if (b) v = make(b, 'bundled'); }
  scriptCache = { at: Date.now(), v };
  return v;
}
export const sbtConfigured = async () => Boolean(await loadScript());

// ───────────────────────────── market data (closed candles only)
const BINANCE_TF: Partial<Record<Tf, string>> = { h1: '1h', h4: '4h', d1: '1d', w1: '1w', mn1: '1M' };
type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };
const toBars = (c: Candle[]): Bar[] => c.map((x) => ({ time: x.timestamp, open: x.open, high: x.high, low: x.low, close: x.close, volume: x.volume }));

async function binanceBars(sym: string, tf: Tf, before: number, count: number): Promise<Bar[]> {
  let end = before - 1; let acc: Bar[] = [];
  for (let i = 0; i < 8 && acc.length < count; i++) {
    const r = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${sym}&interval=${BINANCE_TF[tf]}&limit=1000&endTime=${end}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`Binance HTTP ${r.status}`);
    const rows: any[] = await r.json();
    if (!rows.length) break;
    acc = rows.map((k) => ({ time: +k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] })).concat(acc);
    end = rows[0][0] - 1;
    if (rows.length < 1000) break;
  }
  return acc.filter((b) => b.time < before).slice(-count);
}

export async function loadBars(e: CatalogEntry, tf: Tf, before: number, count: number): Promise<Bar[]> {
  if (e.binance) return binanceBars(e.binance, tf, before, count);
  const intraday = tf === 'h1' || tf === 'h4';
  if (!intraday && e.yahoo) { try { const y = await yahooBefore(e.yahoo, tf, before, count); if (y.candles.length) return toBars(y.candles); } catch { /* fall through */ } }
  if (e.duka) {
    try {
      // Right edge (the hours after the archive's last full day): the SAME feed as the archive first.
      // A spot-FX quote from Yahoo is an acceptable stand-in; a futures contract (gold, oil, indices) is
      // not — its price differs from spot, so a level could look "reached" when it was not.
      const a = await archiveBefore(e.ticker, tf, before, count, async (native, after, until) => {
        const n = Math.min(5000, Math.ceil((until - after) / ({ m1: 60_000, h1: 3_600_000, d1: 86_400_000 } as const)[native]) + 5);
        try { const d = await dukaBefore(e.duka as string, native, until, n, 12_000); if (d.candles.length && d.candles[d.candles.length - 1].timestamp > after) return d.candles; } catch { /* try the stand-in */ }
        if (e.alt && /=X$/.test(e.alt)) return (await yahooAny(e.alt, native, until, n)).candles;
        return [];
      }, 12_000);
      if (a && a.candles.length) return toBars(a.candles.filter((c) => c.timestamp < before));
    } catch { /* no archive: live source below */ }
    try { const d = await dukaBefore(e.duka, tf, before, count, 14_000); if (d.candles.length) return toBars(d.candles); } catch { /* fall through */ }
  }
  if (e.alt && /=X$/.test(e.alt)) { const y = await yahooAny(e.alt, tf, before, count); return toBars(y.candles); }
  return [];
}

const PINE_TF: Record<string, Tf> = { W: 'w1', '1W': 'w1', D: 'd1', '1D': 'd1', M: 'mn1', '1M': 'mn1', '240': 'h4', '60': 'h1' };
function aggregateH4(h1: Bar[]): Bar[] {
  const out: Bar[] = [];
  for (const b of h1) {
    const k = Math.floor(b.time / (4 * H1)) * 4 * H1;
    const last = out[out.length - 1];
    if (last && last.time === k) { last.high = Math.max(last.high, b.high); last.low = Math.min(last.low, b.low); last.close = b.close; last.volume += b.volume; }
    else out.push({ ...b, time: k });
  }
  return out;
}

// ───────────────────────────── reading the script's own notes
const num = (s: string) => { const v = Number(s); return Number.isFinite(v) ? v : NaN; };
export function parseOut(text: string, symbol: string) {
  const parts = text.split('#');
  const lastCandle = num(parts[1]);
  const trend = (Math.sign(num(parts[2])) || 0) as -1 | 0 | 1;
  const st = (parts[3] || '').split(',');
  const flags = st[6] || '';
  const dir = (Math.sign(num(st[1])) || 0) as -1 | 0 | 1;
  const zone = (a: string, b: string, ready: boolean): SbtZone | null => {
    const x = num(a), y = num(b);
    return Number.isFinite(x) && Number.isFinite(y) ? { top: Math.max(x, y), bottom: Math.min(x, y), modelReady: ready } : null;
  };
  const armed = st[0] === '1';
  const signals: SbtSignal[] = [];
  for (const raw of parts.slice(4)) {
    const f = raw.split('|');
    if (f.length < 10) continue;
    const time = num(f[0]); const d = num(f[1]) >= 0 ? 1 : -1; const level = num(f[2]) === 2 ? 2 : 1; const bosTime = num(f[6]);
    const fl = f[7] || '';
    const zoneOk = level === 1 ? fl[0] === '1' : fl[1] === '1';
    const liqOk = level === 1 ? fl[2] === '1' : fl[3] === '1';
    const ev = (f[10] || '').split(';').map((x) => x.split(',').map(Number)).filter((x) => x.length === 3 && x[1] === d && x[2] <= time);
    const models: string[] = [];
    if (zoneOk) { const z = ev.filter((x) => ZONE_SLOTS[level].includes(x[0])).pop(); if (z) models.push(MODEL_NAMES[z[0]]); }
    if (liqOk) for (const x of ev) if (LIQ_SLOTS[level].includes(x[0]) && x[2] >= bosTime && !models.includes(MODEL_NAMES[x[0]])) models.push(MODEL_NAMES[x[0]]);
    const zt = num(f[8]), zb = num(f[9]);
    signals.push({ time, dir: d as 1 | -1, level: level as 1 | 2, price: num(f[3]), stop: num(f[4]), target: num(f[5]), zoneTop: Math.max(zt, zb), zoneBottom: Math.min(zt, zb), bosTime, models });
  }
  return {
    symbol, lastCandle, trend, armed, dir: armed ? dir : 0 as -1 | 0 | 1,
    level1: armed ? zone(st[2], st[3], flags[0] === '1' || flags[2] === '1') : null,
    level2: armed ? zone(st[4], st[5], flags[1] === '1' || flags[3] === '1') : null,
    level1Done: flags[4] === '1', htfWait: flags[6] === '1', inTrade: flags[7] === '1', signals,
  };
}

// ───────────────────────────── scan
const results = new Map<string, SbtScan>();
const running = new Map<string, Promise<SbtScan | SbtFail>>();
export const currentBar = (now = Date.now()) => Math.floor(now / H1) * H1;

export function scanSymbol(symbolIn: string, barIn?: number): Promise<SbtScan | SbtFail> {
  const symbol = String(symbolIn || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const now = currentBar();
  const bar = barIn === now - H1 ? now - H1 : now; // only the current or the previous hour is ever scanned
  const key = `${symbol}|${bar}`;
  const hit = results.get(key);
  if (hit) return Promise.resolve(hit);
  const job = running.get(key);
  if (job) return job;
  const p = doScan(symbol, bar).then((r) => {
    if (r.ok && !r.stale) { results.set(key, r); while (results.size > 120) results.delete(results.keys().next().value as string); }
    return r;
  }).finally(() => running.delete(key));
  running.set(key, p);
  return p;
}

async function doScan(symbol: string, bar: number): Promise<SbtScan | SbtFail> {
  const t0 = Date.now();
  const e = CATALOG.find((c) => c.ticker === symbol);
  if (!e) return { ok: false, symbol, error: 'This pair is not available on the chart feed.', code: 'unknown_symbol' };
  const script = await loadScript();
  if (!script) return { ok: false, symbol, error: 'The strategy is not loaded on the server yet.', code: 'not_configured' };
  let h1: Bar[] = [], d1: Bar[] = [], w1: Bar[] = [], mn: Bar[] = [];
  try {
    [h1, d1, w1, mn] = await Promise.all([
      loadBars(e, 'h1', bar, H1_BARS),
      loadBars(e, 'd1', bar, 600).catch(() => [] as Bar[]),
      loadBars(e, 'w1', bar, 300).catch(() => [] as Bar[]),
      loadBars(e, 'mn1', bar, 120).catch(() => [] as Bar[]),
    ]);
  } catch (err: any) { return { ok: false, symbol, error: `No price data: ${err?.message || err}`, code: 'no_data' }; }
  h1 = h1.filter((b) => b.time + H1 <= bar);
  // The newest closed candle must be recent (markets closed over the weekend are fine: up to 4 days).
  if (h1.length < 300 || bar - h1[h1.length - 1].time > 4 * 24 * H1) return { ok: false, symbol, error: 'Not enough recent H1 candles for this pair.', code: 'no_data' };
  const digits = e.pricePrecision ?? 5;
  const market = { symbol, timeframe: '60', symbolInfo: { ticker: symbol, description: e.name || symbol, type: e.market || 'forex', currency: e.market === 'crypto' ? 'USDT' : 'USD', mintick: Number((10 ** -digits).toFixed(digits)), pricescale: 10 ** digits, minmov: 1 } };
  const byTf: Record<Tf, Bar[]> = { h1, h4: aggregateH4(h1), d1, w1, mn1: mn } as any;
  const series: Record<string, Bar[]> = {};
  for (const [ptf, tf] of Object.entries(PINE_TF)) if (byTf[tf]?.length) series[seriesKey(symbol, ptf)] = byTf[tf];
  const run = async (source: string) => {
    let o = await runScript({ source, market, bars: h1, series });
    if (o.ok && o.need?.length) {
      for (const n of o.need) {
        const tf = PINE_TF[String(n.timeframe).toUpperCase()];
        const sameSymbol = String(n.symbol).toUpperCase().replace(/^[A-Z_]+:/, '') === symbol;
        series[seriesKey(n.symbol, n.timeframe)] = sameSymbol && tf ? byTf[tf] || [] : [];
      }
      o = await runScript({ source, market, bars: h1, series });
    }
    return o;
  };
  let out = await run(script.src);
  let guarded = false;
  if (!out.ok && /out of bounds/i.test(out.error || '') && script.guarded) { out = await run(script.guarded); guarded = out.ok; }
  if (!out.ok || !out.model) return { ok: false, symbol, error: out.error || 'The strategy did not finish on this pair.', code: 'run_failed' };
  const label = [...(out.model.labels || [])].reverse().find((l: any) => typeof l?.text === 'string' && l.text.startsWith('PPFXOUT#'));
  if (!label) return { ok: false, symbol, error: 'The strategy produced no result on this pair.', code: 'run_failed' };
  const parsed = parseOut(label.text, symbol);
  // Forex / metals / indices pause from Friday 21:00 to Sunday 23:00 UTC (and for a daily break); crypto never does.
  const gap = bar - H1 - parsed.lastCandle;
  const dt = new Date(bar); const dow = dt.getUTCDay(); const hr = dt.getUTCHours();
  const weekend = e.market !== 'crypto' && (dow === 6 || (dow === 5 && hr >= 21) || (dow === 0) || (dow === 1 && hr < 2));
  const stale = !weekend && gap > 3 * H1;
  return { ok: true, ...parsed, bar, bars: h1.length, ms: Date.now() - t0, source: script.source, guarded, stale };
}
