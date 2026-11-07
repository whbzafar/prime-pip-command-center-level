/**
 * FUNDAMENTAL ANALYSIS SERVICE
 *
 * Long-running server (npm start / Render / Railway / VPS): a 20-second scheduler keeps
 * every source fresh and polls the calendar every ~60s whenever a release is within ±12
 * minutes, so NFP/CPI/rate decisions are scored within about a minute of publication.
 *
 * Serverless (Netlify / Vercel): no timers survive, so each request refreshes whatever
 * is stale before answering (same freshness rules, bounded by a time budget).
 */
import { safeReadJsonFile, safeWriteJsonFile } from '../dataPath.js';
import { CURRENCY_SPECS, COMMODITY_SPECS, CRYPTO_SPECS, INDEX_SPECS, STOCK_SPECS, buildPolicyMap } from './assets.js';
import { CONCEPTS, CURRENCY_COUNTRY } from './concepts.js';
import { buildCorrelation, buildPairs } from './pairs.js';
import { METHODOLOGY_VERSION, patternsFor, scoreAsset, type EngineContext } from './scoring.js';
import { refreshCalendar, getAllEvents, isHotWindow, calendarLoaded } from './sources/tvCalendar.js';
import { refreshFred } from './sources/fred.js';
import { refreshPrices } from './sources/prices.js';
import { refreshCot } from './sources/cot.js';
import { refreshCrypto } from './sources/crypto.js';
import { refreshEdgar, loadEdgarTicker, missingTickers } from './sources/edgar.js';
import { getSourceHealth } from './sources/http.js';
import type { AssetResult, MacroSnapshot, ReleaseEvent } from './types.js';

const STORE_FILE = 'macro_fundamentals_store.json';

export const SERVERLESS = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

// A failed background fetch must never take the whole function down (serverless runtimes
// terminate the process on an unhandled rejection, which surfaces as "A server error has occurred").
const GUARD = Symbol.for('ppfx.macro.rejectionGuard');
if (!(globalThis as any)[GUARD]) {
  (globalThis as any)[GUARD] = true;
  process.on('unhandledRejection', (reason: any) => {
    console.warn('[Fundamentals] Unhandled rejection contained:', reason?.message || reason);
  });
}

interface Store {
  lastSeen: Record<string, string>; // asset|indicator → releasedAt|actual
  releases: ReleaseEvent[];
  lastScores: Record<string, number | null>;
}

const store: Store = safeReadJsonFile<Store>(STORE_FILE, { lastSeen: {}, releases: [], lastScores: {} });
if (!store.lastSeen) store.lastSeen = {};
if (!Array.isArray(store.releases)) store.releases = [];
if (!store.lastScores) store.lastScores = {};

let snapshot: MacroSnapshot | null = null;
let computing: Promise<MacroSnapshot> | null = null;
let timer: NodeJS.Timeout | null = null;

const last = { fred: 0, prices: 0, cot: 0, crypto: 0, edgar: 0 };
const EVERY = { fred: 2 * 3600_000, prices: 30 * 60_000, cot: 3 * 3600_000, crypto: 5 * 60_000, edgar: 12 * 3600_000 };

/** CFTC publishes Friday 15:30 ET; poll COT every 10 min from 15:30 to 18:00 ET on Fridays. */
function cotReleaseWindow(now = new Date()): boolean {
  const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const mins = ny.getHours() * 60 + ny.getMinutes();
  return ny.getDay() === 5 && mins >= 15 * 60 + 30 && mins <= 18 * 60;
}

async function refreshSources(force: boolean): Promise<void> {
  const now = Date.now();
  const jobs: Array<Promise<unknown>> = [];
  const hot = isHotWindow(12);
  jobs.push(refreshCalendar({ force, minLiveIntervalMs: hot ? 45_000 : 4 * 60_000 }).catch(() => undefined));
  if (force || now - last.fred > EVERY.fred) { last.fred = now; jobs.push(refreshFred(force)); }
  if (force || now - last.prices > EVERY.prices) { last.prices = now; jobs.push(refreshPrices(force)); }
  if (force || now - last.cot > (cotReleaseWindow() ? 10 * 60_000 : EVERY.cot)) { last.cot = now; jobs.push(refreshCot(true)); }
  if (force || now - last.crypto > EVERY.crypto) { last.crypto = now; jobs.push(refreshCrypto(true)); }
  if (SERVERLESS) {
    // Company filings are large; on serverless load two companies per refresh in the background.
    for (const t of missingTickers(2)) loadEdgarTicker(t).catch(() => undefined);
  } else if (force || now - last.edgar > EVERY.edgar) { last.edgar = now; jobs.push(refreshEdgar(force)); }
  await Promise.allSettled(jobs);
}

export function computeSnapshot(now = Date.now()): MacroSnapshot {
  const events = getAllEvents();
  const results = new Map<string, AssetResult>();
  const ctx: EngineContext = { now, events, results, policy: new Map() };
  ctx.policy = buildPolicyMap(ctx);

  // Order matters: currencies first (USD is mirrored by USD-priced assets, JPY by Nikkei),
  // then indices (US500 is mirrored by stocks), then the rest.
  for (const s of CURRENCY_SPECS) results.set(s.symbol, scoreAsset(s, ctx));
  for (const s of INDEX_SPECS) results.set(s.symbol, scoreAsset(s, ctx));
  for (const s of [...COMMODITY_SPECS, ...CRYPTO_SPECS, ...STOCK_SPECS]) results.set(s.symbol, scoreAsset(s, ctx));

  const w30 = buildCorrelation(30);
  const w90 = buildCorrelation(90);
  const assets = Array.from(results.values());
  const releases = detectReleases(assets, now);

  // Upcoming tracked releases (next 7 days)
  const tracked: Array<{ asset: string; title: string; scheduledAt: string; forecast: number | null; previous: number | null; importance: string }> = [];
  const countryToCcy: Record<string, string> = Object.fromEntries(Object.entries(CURRENCY_COUNTRY).map(([k, v]) => [v, k]));
  countryToCcy.DE = 'EUR'; countryToCcy.CN = 'CNY';
  const allPatterns = Object.keys(CONCEPTS);
  for (const e of events) {
    if (e.actual !== null || e.timestamp < now - 5 * 60_000 || e.timestamp > now + 7 * 86_400_000) continue;
    const matched = allPatterns.some((c) => patternsFor(c, e.country).some((p) => p.re.test(e.key)) && !(CONCEPTS[c].exclude?.test(e.key)));
    if (!matched) continue;
    tracked.push({ asset: countryToCcy[e.country] || e.country, title: e.title, scheduledAt: e.iso, forecast: e.forecast, previous: e.previous,
      importance: e.importance >= 1 ? 'HIGH' : e.importance === 0 ? 'MEDIUM' : 'LOW' });
  }
  tracked.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  for (const a of assets) store.lastScores[a.symbol] = a.score;
  persist();

  return {
    generatedAt: new Date(now).toISOString(),
    assets,
    pairs: buildPairs(results, w90),
    correlations: { w30, w90 },
    releases,
    upcoming: tracked.slice(0, 60),
    sources: getSourceHealth(),
    methodologyVersion: METHODOLOGY_VERSION,
  };
}

function detectReleases(assets: AssetResult[], now: number): ReleaseEvent[] {
  const firstRun = Object.keys(store.lastSeen).length === 0;
  const grouped = new Map<string, ReleaseEvent>();
  const order: Record<string, number> = { FOREX: 0, INDICES: 1, COMMODITIES: 2, CRYPTO: 3, STOCKS: 4 };
  const sorted = [...assets].sort((a, b) => order[a.assetClass] - order[b.assetClass]);
  for (const a of sorted) {
    if (a.assetClass === 'STOCKS') continue;
    for (const p of a.pillars) {
      for (const ind of p.indicators) {
        const o = ind.observation;
        if (!o || !o.sourceTitle || !o.sourceName.includes('TradingView')) continue;
        const key = `${a.symbol}|${ind.id}`;
        const sig = `${o.releasedAt}|${o.actual}`;
        const prev = store.lastSeen[key];
        store.lastSeen[key] = sig;
        const age = now - new Date(o.releasedAt).getTime();
        const isNew = firstRun ? age < 36 * 3600_000 : prev !== sig && age < 3 * 86_400_000;
        if (!isNew) continue;
        const impact = {
          asset: a.symbol,
          indicatorScore: ind.score,
          assetScoreBefore: firstRun ? null : store.lastScores[a.symbol] ?? null,
          assetScoreAfter: a.score,
        };
        const gid = `${o.sourceTitle}|${o.releasedAt}|${o.actual}`;
        const existing = grouped.get(gid);
        if (existing) {
          if (!existing.impacts.some((x) => x.asset === a.symbol)) existing.impacts.push(impact);
          continue;
        }
        const surprise = o.forecast !== null ? o.actual - o.forecast : null;
        const dir = ind.score === null ? null : ind.score > 15 ? `Bullish ${a.symbol}` : ind.score < -15 ? `Bearish ${a.symbol}` : `Neutral for ${a.symbol}`;
        grouped.set(gid, {
          id: gid,
          asset: a.symbol,
          indicatorId: ind.id,
          indicatorName: ind.name,
          sourceTitle: o.sourceTitle,
          actual: o.actual,
          forecast: o.forecast,
          previous: o.previous,
          unit: o.unit,
          releasedAt: o.releasedAt,
          detectedAt: new Date(now).toISOString(),
          indicatorScore: ind.score,
          assetScoreBefore: impact.assetScoreBefore,
          assetScoreAfter: impact.assetScoreAfter,
          verdict: dir === null ? 'Recorded'
            : `${surprise === null ? '' : surprise > 0 ? 'Above forecast → ' : surprise < 0 ? 'Below forecast → ' : 'As forecast → '}${dir} (${ind.score! > 0 ? '+' : ''}${ind.score})`,
          impacts: [impact],
        });
      }
    }
  }
  if (grouped.size) {
    const byId = new Map(store.releases.map((r) => [r.id, r]));
    for (const r of grouped.values()) if (!byId.has(r.id)) store.releases.unshift(r);
    store.releases.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
    store.releases = store.releases.slice(0, 150);
  }
  return store.releases.slice(0, 80).map((r) => ({ ...r, impacts: r.impacts || [] }));
}

let persistTimer: NodeJS.Timeout | null = null;
function persist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try { safeWriteJsonFile(STORE_FILE, store); } catch { /* read-only FS on serverless: in-memory only */ }
  }, 500);
}

export async function refreshAndCompute(force = false): Promise<MacroSnapshot> {
  if (computing) return computing;
  computing = (async () => {
    try {
      await refreshSources(force);
      snapshot = computeSnapshot();
      return snapshot;
    } finally {
      computing = null;
    }
  })();
  return computing;
}

/** Returns a snapshot no older than `maxAgeMs`, refreshing within the time budget if needed. */
export async function getSnapshot(maxAgeMs = 60_000, budgetMs = SERVERLESS ? 8_000 : 25_000): Promise<MacroSnapshot> {
  const age = snapshot ? Date.now() - new Date(snapshot.generatedAt).getTime() : Infinity;
  if (snapshot && age < maxAgeMs) return snapshot;
  const run = refreshAndCompute(false);
  run.catch(() => undefined); // never leave a rejection unhandled
  const fallback = new Promise<MacroSnapshot>((resolve) =>
    setTimeout(() => {
      try { if (!snapshot) snapshot = computeSnapshot(); resolve(snapshot); } catch { resolve(emptySnapshot()); }
    }, snapshot ? Math.min(budgetMs, 4_000) : budgetMs)
  );
  try {
    return await Promise.race([run, fallback]);
  } catch {
    return snapshot ?? emptySnapshot();
  }
}

/** Make sure one stock's filings are loaded (on-demand on serverless), then return a fresh snapshot. */
export async function ensureStockLoaded(ticker: string, budgetMs = 5_000): Promise<MacroSnapshot> {
  const p = loadEdgarTicker(ticker).catch(() => undefined);
  await Promise.race([p, new Promise((r) => setTimeout(r, budgetMs))]);
  try { snapshot = computeSnapshot(); } catch { /* keep previous */ }
  return snapshot ?? emptySnapshot();
}

function emptySnapshot(): MacroSnapshot {
  return {
    generatedAt: new Date().toISOString(), assets: [], pairs: [], correlations: { w30: null, w90: null },
    releases: [], upcoming: [], sources: getSourceHealth(), methodologyVersion: METHODOLOGY_VERSION,
  };
}

export function startMacroScheduler(): void {
  if (timer) return;
  refreshAndCompute(true).catch((e) => console.warn('[Fundamentals] initial refresh failed:', e?.message || e));
  timer = setInterval(() => {
    refreshAndCompute(false).catch((e) => console.warn('[Fundamentals] refresh failed:', e?.message || e));
  }, 20_000);
  console.log('[Fundamentals] Scheduler started (20s tick; calendar every ~45s around releases).');
}

export function stopMacroScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

/** Calendar titles with a released value that no concept matched — for coverage audits. */
export function unmatchedCalendarTitles(): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  if (!calendarLoaded()) return {};
  const concepts = Object.keys(CONCEPTS);
  for (const e of getAllEvents()) {
    if (e.actual === null) continue;
    const hit = concepts.some((c) => patternsFor(c, e.country).some((p) => p.re.test(e.key)) && !(CONCEPTS[c].exclude?.test(e.key)));
    if (!hit) (out[e.country] ||= new Set()).add(e.indicator);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Array.from(v).sort()]));
}

export function __resetForTest(): void {
  store.lastSeen = {}; store.releases = []; store.lastScores = {}; snapshot = null;
}
