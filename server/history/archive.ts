/**
 * DEEP-HISTORY ARCHIVE READER
 *
 * Dukascopy blocks Vercel's data-centre IPs, so the full history is mirrored by the
 * `history-archive` GitHub Actions workflow (scripts/history/build_archive.py) into release
 * assets of this public repo — tag `hist-<TICKER>`:
 *   m1_YYYY-MM.csv.gz  ·  h1_YYYY.csv.gz  ·  d1.csv.gz  ·  manifest.json
 * Rows are "t,o,h,l,c,v" with t = unix seconds (UTC). Higher timeframes are aggregated here from
 * real candles (m5/m15/m30 ← m1, h4 ← h1, w1/mn1 ← d1). Nothing is interpolated.
 *
 * The archive is refreshed every 3 hours and stops at the last closed UTC day; the bars after it
 * are filled from Yahoo's live intraday feed so the right edge of the chart is always current.
 */
import { gunzipSync } from 'node:zlib';
import { aggregate, type Candle, type Tf } from './historyService.js';

const REPO = process.env.HISTORY_ARCHIVE_REPO || 'whbzafar/prime-pip-command-center-level';
const MIN = 60_000;
const TF_MS: Record<Tf, number> = { m1: MIN, m5: 5 * MIN, m15: 15 * MIN, m30: 30 * MIN, h1: 60 * MIN, h4: 240 * MIN, d1: 1440 * MIN, w1: 7 * 1440 * MIN, mn1: 30 * 1440 * MIN };

export interface ArchiveManifest {
  ticker: string; scale: number; m1Months: string[]; m1Complete: boolean; m1Pending?: number; h1Years: number[]; d1Years?: number[];
  d1From: number | null; lastCandle: number; builtAt: number; source: string;
}

const fileCache = new Map<string, { at: number; ttl: number; data: any }>();
function cget(k: string) {
  const v = fileCache.get(k);
  if (!v || Date.now() - v.at > v.ttl) return undefined;
  fileCache.delete(k); fileCache.set(k, v);
  return v.data;
}
function cset(k: string, data: any, ttl: number) {
  fileCache.set(k, { at: Date.now(), ttl, data });
  while (fileCache.size > 160) fileCache.delete(fileCache.keys().next().value as string);
}

async function fetchAsset(ticker: string, name: string): Promise<Buffer | null> {
  const url = `https://github.com/${REPO}/releases/download/hist-${encodeURIComponent(ticker)}/${name}`;
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow', signal: AbortSignal.timeout(12_000) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`archive ${name}: HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export async function getManifest(ticker: string): Promise<ArchiveManifest | null> {
  const k = `man|${ticker}`;
  const hit = cget(k);
  if (hit !== undefined) return hit;
  let m: ArchiveManifest | null = null;
  for (let attempt = 0; attempt < 2 && !m; attempt++) {
    try {
      const buf = await fetchAsset(ticker, 'manifest.json');
      m = buf ? JSON.parse(buf.toString('utf8')) : null;
      if (!buf) break; // no archive for this instrument (404) — don't retry
    } catch { m = null; }
  }
  if (m) {
    // Older minute months backfilled from HistData.com (Dukascopy months take priority; never both).
    try {
      const hist = await fetchAsset(ticker, 'hist_m1.json');
      const hm: string[] = hist ? (JSON.parse(hist.toString('utf8')).months || []) : [];
      if (hm.length) m.m1Months = Array.from(new Set([...(m.m1Months || []), ...hm])).sort();
    } catch { /* minute backfill list unavailable — Dukascopy months still served */ }
  }
  cset(k, m, m ? 10 * MIN : 20_000);
  return m;
}

function parseCsv(buf: Buffer): Candle[] {
  const text = gunzipSync(buf).toString('utf8');
  const out: Candle[] = [];
  let i = 0;
  while (i < text.length) {
    let j = text.indexOf('\n', i);
    if (j < 0) j = text.length;
    const p = text.slice(i, j).split(',');
    i = j + 1;
    if (p.length < 5) continue;
    const c = { timestamp: Number(p[0]) * 1000, open: +p[1], high: +p[2], low: +p[3], close: +p[4], volume: Number(p[5] || 0) };
    if (!(c.open > 0 && c.high >= c.low && Number.isFinite(c.timestamp))) continue;
    if (c.volume === 0 && c.open === c.high && c.high === c.low && c.low === c.close) continue; // market-closed filler
    out.push(c);
  }
  return out;
}

async function loadFile(ticker: string, name: string, recent: boolean): Promise<Candle[]> {
  const k = `f|${ticker}|${name}`;
  const hit = cget(k);
  if (hit !== undefined) return hit;
  const buf = await fetchAsset(ticker, name);
  const rows = buf ? parseCsv(buf) : [];
  cset(k, rows, recent ? 10 * MIN : 24 * 60 * MIN);
  return rows;
}

/** Fixed-length UTC buckets (m5…m30, h4). */
function bucket(rows: Candle[], ms: number): Candle[] {
  const out: Candle[] = [];
  for (const c of rows) {
    const b = c.timestamp - (c.timestamp % ms);
    const last = out[out.length - 1];
    if (last && last.timestamp === b) {
      last.high = Math.max(last.high, c.high); last.low = Math.min(last.low, c.low); last.close = c.close; last.volume += c.volume;
    } else out.push({ ...c, timestamp: b });
  }
  return out;
}

function shape(rows: Candle[], tf: Tf): Candle[] {
  if (tf === 'w1' || tf === 'mn1') return aggregate(rows, tf);
  if (tf === 'm1' || tf === 'h1' || tf === 'd1') return rows;
  return bucket(rows, TF_MS[tf]);
}

const ym = (ts: number) => { const d = new Date(ts); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

export type RecentFill = (nativeTf: 'm1' | 'h1' | 'd1', after: number, before: number) => Promise<Candle[]>;

/**
 * Up to `count` archived bars strictly before `before`. Bars after the archive's last closed day
 * come from `fillRecent` (live source), aligned to the same UTC buckets.
 * Returns null when the instrument has no archive yet (caller falls back to other sources).
 */
export async function archiveBefore(ticker: string, tf: Tf, before: number, count: number, fillRecent?: RecentFill, budgetMs = 8_000):
  Promise<{ candles: Candle[]; reachedStart: boolean; live: number } | null> {
  const man = await getManifest(ticker);
  if (!man) return null;
  const started = Date.now();
  const family: 'm1' | 'h1' | 'd1' = tf === 'm1' || tf === 'm5' || tf === 'm15' || tf === 'm30' ? 'm1' : tf === 'h1' || tf === 'h4' ? 'h1' : 'd1';
  let acc: Candle[] = [];
  let reachedStart = false;

  if (family === 'd1') {
    if (man.d1Years?.length) {
      // One file per year; load all years up to `before` (small files, cached), oldest → newest.
      const years = man.d1Years.filter((y) => y <= new Date(before - 1).getUTCFullYear()).sort((a, b) => a - b);
      const parts = await Promise.all(years.map((y) => loadFile(ticker, `d1_${y}.csv.gz`, true)));
      acc = parts.flat().filter((c) => c.timestamp < before);
    } else {
      acc = (await loadFile(ticker, 'd1.csv.gz', true)).filter((c) => c.timestamp < before);
    }
    reachedStart = true; // the daily files hold the whole history
  } else {
    const keys = family === 'm1'
      ? [...man.m1Months].sort().reverse().filter((k) => k <= ym(before - 1))
      : [...man.h1Years].sort((a, b) => b - a).filter((y) => y <= new Date(before - 1).getUTCFullYear()).map(String);
    let i = 0;
    for (; i < keys.length; i++) {
      const rows = await loadFile(ticker, `${family}_${keys[i]}.csv.gz`, true);
      acc = rows.filter((c) => c.timestamp < before).concat(acc);
      if (shape(acc, tf).length >= count) break;
      if (Date.now() - started > budgetMs) break;
    }
    // Oldest file reached and nothing older is still being backfilled → true inception.
    reachedStart = i >= keys.length && (family === 'h1' || man.m1Complete);
  }

  // Right edge: archive ends at the last closed UTC day; append live bars after it.
  let live = 0;
  const lastArchived = acc.length ? acc[acc.length - 1].timestamp : 0;
  const now = Date.now();
  if (fillRecent && lastArchived && before > now - 5 * 86_400_000) {
    try {
      const nativeMs = TF_MS[family];
      const fresh = (await fillRecent(family, lastArchived, Math.min(before, now + MIN)))
        .map((c) => ({ ...c, timestamp: family === 'd1'
          ? Math.floor((c.timestamp + 6 * 3600_000) / 86_400_000) * 86_400_000 // Yahoo dates its daily bars at the local session open
          : c.timestamp - (c.timestamp % nativeMs) }))
        .filter((c) => c.timestamp > lastArchived && c.timestamp < before);
      const merged = bucket(fresh, nativeMs);
      live = merged.length;
      acc = acc.concat(merged);
    } catch { /* live edge unavailable — archived history still returned */ }
  }

  const candles = shape(acc, tf);
  return { candles: candles.slice(-count), reachedStart: reachedStart && candles.length <= count, live };
}
