/**
 * Key-level alerts: the private H1 level scanner, applied to the strongest long-term fundamental
 * pairs. Only the RESULT is ever sent to the browser (pair, side, level, price) — never the strategy.
 *
 * A setup is shown only when the level's side agrees with the fundamentals:
 *   long-term bullish pair → buy level reached,  long-term bearish pair → sell level reached.
 *
 * One shared store for the whole app: it follows the live rankings, asks the server once per pair
 * per closed H1 candle (the answer is cached for everyone), and notifies once per new setup.
 */
import { useEffect, useState } from 'react';
import { playSound, speak, spokenPair, unlockAudio, type SoundId } from '../utils/alertSounds';

const H1 = 3_600_000;
export const TOP_N = 6;
/** Always scanned, whatever the rankings say. */
export const ALWAYS = ['XAUUSD'];
const FX8 = ['EUR', 'GBP', 'USD', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
export const scannable = (s: string) => s === 'XAUUSD' || s === 'XAGUSD' || (/^[A-Z]{6}$/.test(s) && FX8.includes(s.slice(0, 3)) && FX8.includes(s.slice(3)));
const FRESH_MS = 24 * H1;        // how long an earlier touch stays listed (as "earlier", with where price is now)
const NOTIFY_MS = 75 * 60_000; // only the candle that has just closed rings (no old alerts after re-opening the app)
const K_SEEN = 'ppfx_level_alerts_seen_v1';
const K_LOG = 'ppfx_level_alerts_log_v1';
const K_LEVEL_SETTINGS = 'ppfx_level_alert_settings_v1';

/** Sound settings for key-level setups (separate from the news alerts, so muting news never silences a setup). */
/** confirmedOnly: an alert rings only when the wick went clearly into the zone (not a hair-line touch that another broker's feed may not show). */
export interface LevelAlertSettings { sound: boolean; voice: boolean; soundId: SoundId; confirmedOnly: boolean }
export const getLevelSettings = (): LevelAlertSettings => ({ sound: true, voice: true, soundId: 'alarm', confirmedOnly: true, ...read<Partial<LevelAlertSettings>>(K_LEVEL_SETTINGS, {}) });
export function setLevelSettings(p: Partial<LevelAlertSettings>) { write(K_LEVEL_SETTINGS, { ...getLevelSettings(), ...p }); subs.forEach((f) => f()); }

/** Sound + female voice for one or more setups: "G B P C A D. This pair has arrived — Level 1, buy." */
export function announceSetups(list: Array<{ display: string; side: 1 | -1; level: 1 | 2 } & Partial<LevelAlert>>) {
  const cfg = getLevelSettings();
  if (cfg.sound) { playSound(cfg.soundId); setTimeout(() => playSound(cfg.soundId), 900); }
  if (cfg.voice && list.length) {
    const text = list.slice(0, 4).map((a) => {
      const anyA = a as Partial<LevelAlert> & { display: string; side: 1 | -1; level: 1 | 2 };
      const tech = `${spokenPair(a.display)} has reached the Level ${a.level} ${a.side > 0 ? 'buy' : 'sell'} zone on the one-hour chart.`;
      const mdl = anyA.models?.length ? ` Model ${anyA.models.join(' and ')} complete.` : '';
      const fund = typeof anyA.score === 'number' ? ` Fundamentals are ${a.side > 0 ? 'bullish' : 'bearish'}, score ${anyA.score > 0 ? 'plus' : 'minus'} ${Math.abs(Math.round(anyA.score))}.` : '';
      const lv = Number.isFinite(anyA.stop) && Number.isFinite(anyA.target) ? ` Stop ${fmtPrice(anyA.stop as number)}, target ${fmtPrice(anyA.target as number)}.` : '';
      const news = anyA.news ? ` Caution: ${anyA.news}` : '';
      return tech + mdl + fund + lv + news;
    }).join(' ');
    setTimeout(() => speak(text), cfg.sound ? 1800 : 0);
  }
}

/** Ask for notifications (must run inside a tap) and unlock sound; returns the notification state. */
export async function enableLevelAlerts(): Promise<NotificationPermission | 'unsupported'> {
  unlockAudio();
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'default') { try { return await Notification.requestPermission(); } catch { return Notification.permission; } }
  return Notification.permission;
}

export function testLevelAlert() {
  unlockAudio();
  announceSetups([{ display: 'GBP/CAD', side: 1, level: 1 }]);
  void notify('TEST · BUY GBP/CAD — Level 1 reached (H1)', 'This is how a fundamental setup alert looks and sounds.');
}

export interface LevelSignal { time: number; dir: 1 | -1; level: 1 | 2; price: number; stop: number; target: number; zoneTop: number; zoneBottom: number; models: string[]; candleHigh?: number; candleLow?: number; depthPips?: number }
/** A wick that entered the zone by less than this many pips may not have touched on another broker's prices. */
export const EDGE_PIPS = 1.5;
export interface LevelZone { top: number; bottom: number; modelReady: boolean }
export interface PairScan {
  symbol: string; display: string; side: 1 | -1; score: number;
  state: 'loading' | 'ok' | 'unavailable';
  lastCandle?: number; dir?: -1 | 0 | 1; level1?: LevelZone | null; level2?: LevelZone | null;
  /** Level reached on the H1 candle that has JUST closed, on the fundamental side. */
  hit?: LevelSignal | null;
  /** The latest earlier touch on the fundamental side (last 24 h), with where price is now. */
  recent?: LevelSignal | null;
  lastClose?: number; pip?: number;
  /** Price now relative to the zone of `recent`: 0 = inside it, otherwise pips away. */
  awayPips?: number | null;
  /** The strategy is currently tracking levels on the fundamental side. */
  watching?: boolean;
  /** The strategy is in a trade on this pair right now. */
  inTrade?: boolean;
}
export interface LevelAlert { id: string; symbol: string; display: string; side: 1 | -1; level: 1 | 2; price: number; zoneTop: number; zoneBottom: number; models: string[]; time: number; score: number; depthPips?: number; stop?: number; target?: number; crowd?: string; news?: string; checked?: string[] }
export interface LevelState { status: 'idle' | 'loading' | 'ready' | 'not_configured'; pairs: PairScan[]; alerts: LevelAlert[]; updatedAt: number; unseen: number }

const read = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const chartSym = (s: string) => ({ BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', XRPUSD: 'XRPUSDT', SOLUSD: 'SOLUSDT' } as Record<string, string>)[s] || s;

let state: LevelState = { status: 'idle', pairs: [], alerts: read<LevelAlert[]>(K_LOG, []).filter((a) => Date.now() - a.time < 3 * 24 * H1), updatedAt: 0, unseen: 0 };
const subs = new Set<() => void>();
const set = (p: Partial<LevelState>) => { state = { ...state, ...p }; subs.forEach((f) => f()); };
const scans = new Map<string, any>(); // `${symbol}|${bar}` → server answer
let started = false; let busy = false; let timer: ReturnType<typeof setTimeout> | null = null;

export const fmtPrice = (v: number) => (!Number.isFinite(v) ? '—' : v >= 1000 ? v.toFixed(2) : v >= 20 ? v.toFixed(3) : v.toFixed(5));
export const levelTime = (t: number) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(t));

async function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) { await reg.showNotification(title, { body, icon: '/favicon.ico', tag: `ppfx-level-${title}`, requireInteraction: true, renotify: true } as any); return; }
  } catch { /* fall back */ }
  try { new Notification(title, { body, icon: '/favicon.ico' }); } catch { /* not allowed */ }
}

/** Plain-language summary covering the technical and the fundamental side (used for the notification). */
export function alertSummary(a: LevelAlert): string {
  const parts = [
    `Technical: H1 candle closed at ${fmtPrice(a.price)} in the Level ${a.level} ${a.side > 0 ? 'buy' : 'sell'} zone ${fmtPrice(a.zoneBottom)} – ${fmtPrice(a.zoneTop)}${a.models.length ? ` (${a.models.join(' + ')} complete)` : ''}.`,
    Number.isFinite(a.stop) && Number.isFinite(a.target) ? `Entry next H1 open · stop ${fmtPrice(a.stop as number)} · take profit 1:2 ${fmtPrice(a.target as number)}.` : '',
    `Fundamental: long-term ${a.side > 0 ? 'bullish' : 'bearish'} (score ${a.score > 0 ? '+' : ''}${a.score.toFixed(0)}).`,
    a.crowd || '', a.news ? `⚠ ${a.news}` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

/**
 * Verification before an alert is announced: the signal must be on the candle that has just closed, the
 * fundamentals must still point the same way right now, and the crowd / news context is attached.
 * Returns null when the alert does not hold up (it is then not announced).
 */
async function verifyAlert(a: LevelAlert, sig: LevelSignal | null): Promise<LevelAlert | null> {
  const checked: string[] = [];
  const out: LevelAlert = { ...a, stop: sig?.stop, target: sig?.target };
  try {
    const sym = a.symbol.replace(/USDT$/, 'USD');
    const j = await fetch(`/api/copilot/${encodeURIComponent(sym)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (j?.ok) {
      const f = j.inputs?.fundamentals?.score;
      if (typeof f === 'number') {
        if (Math.abs(f) >= 10 && Math.sign(f) !== a.side) return null; // fundamentals have flipped since the ranking — not announced
        checked.push('fundamentals re-checked');
      }
      const c = j.inputs?.crowd;
      if (c && typeof c.longPct === 'number') {
        const agrees = a.side > 0 ? c.longPct < 45 : c.longPct > 55;
        out.crowd = `Retail crowd ${Math.round(c.longPct)}% long — ${agrees ? `supports the ${a.side > 0 ? 'buy' : 'sell'} (contrarian)` : c.longPct >= 45 && c.longPct <= 55 ? 'balanced' : `leans the same way as this ${a.side > 0 ? 'buy' : 'sell'} (contrarian caution)`}.`;
        checked.push('crowd');
      }
      const ev = (j.events || []).find((e: any) => e.inHours <= 2);
      if (ev) out.news = `High-impact ${ev.currency} "${ev.title}" ${ev.inHours < 0 ? 'is out now' : ev.inHours < 1 ? 'in under an hour' : `in ${Math.round(ev.inHours)}h`}.`;
      checked.push('news');
      if (j.sbt && j.sbt.status === 'STALE') return null;
    }
  } catch { /* context is optional; the level itself was already confirmed by the scan */ }
  out.checked = checked;
  return out;
}

async function fetchRankings(): Promise<{ symbol: string; display: string; side: 1 | -1; score: number }[]> {
  const r = await fetch('/api/macro/rankings');
  const j = await r.json();
  const lt = j?.data?.longTerm;
  if (!lt) throw new Error('rankings unavailable');
  // Only markets the H1 level scanner can read (the 28 forex pairs, gold, silver); crypto / platinum are skipped,
  // so a top list full of crypto never leaves the bearish side empty.
  const all: any[] = (j?.data?.all?.length ? j.data.all : [...(lt.bullish || []), ...(lt.bearish || [])]).filter((p: any) => scannable(String(p.symbol)) && Number.isFinite(Number(p.longTerm)));
  const row = (p: any, side: 1 | -1) => ({ symbol: String(p.symbol), display: String(p.display || p.symbol), side, score: Number(p.longTerm) });
  const bulls = all.filter((p) => Number(p.longTerm) >= 10).sort((a, b) => b.longTerm - a.longTerm).slice(0, TOP_N).map((p) => row(p, 1));
  const bears = all.filter((p) => Number(p.longTerm) <= -10).sort((a, b) => a.longTerm - b.longTerm).slice(0, TOP_N).map((p) => row(p, -1));
  const list = [...bulls, ...bears];
  // Gold is always watched (the owner's main market), on the side its own long-term fundamentals point to.
  for (const sym of ALWAYS) {
    if (list.some((p) => p.symbol === sym)) continue;
    const row = [...(j?.data?.all || []), ...(lt.bullish || []), ...(lt.bearish || [])].find((p: any) => p.symbol === sym);
    const sc = Number(row?.longTerm ?? NaN);
    if (Number.isFinite(sc) && Math.abs(sc) >= 5) list.push({ symbol: sym, display: String(row.display || 'XAU/USD'), side: sc > 0 ? 1 : -1, score: sc });
  }
  return list;
}

async function scanOne(symbol: string, bar: number): Promise<any> {
  const key = `${symbol}|${bar}`;
  if (scans.has(key)) return scans.get(key);
  const r = await fetch(`/api/sbt/scan?symbol=${encodeURIComponent(chartSym(symbol))}&bar=${bar}`);
  const j = await r.json().catch(() => ({ ok: false, code: 'run_failed' }));
  if ((j?.ok && !j.stale) || j?.code === 'unknown_symbol' || j?.code === 'not_configured') { scans.set(key, j); while (scans.size > 80) scans.delete(scans.keys().next().value as string); }
  return j;
}

function toPair(p: { symbol: string; display: string; side: 1 | -1; score: number }, j: any): PairScan {
  if (!j) return { ...p, state: 'loading' };
  if (!j.ok || j.stale) return { ...p, state: 'unavailable' };
  const now = Date.now();
  const sigs: LevelSignal[] = (j.signals || []).filter((s: LevelSignal) => s.dir === p.side);
  // "At the level" = the strategy's test candle is the candle that has just closed (nothing older).
  const hit = sigs.find((s) => s.time === j.lastCandle) || null;
  const recent = hit ? null : [...sigs].reverse().find((s) => now - (s.time + H1) < FRESH_MS) || null;
  let awayPips: number | null = null;
  if (recent && Number.isFinite(j.lastClose) && j.pip) {
    const c = j.lastClose as number;
    awayPips = c >= recent.zoneBottom && c <= recent.zoneTop ? 0 : Math.round((Math.min(Math.abs(c - recent.zoneTop), Math.abs(c - recent.zoneBottom)) / j.pip) * 10) / 10;
  }
  return { ...p, state: 'ok', lastCandle: j.lastCandle, dir: j.dir, level1: j.level1, level2: j.level2, hit, recent, awayPips, lastClose: j.lastClose, pip: j.pip, watching: j.dir === p.side && Boolean(j.level1 || j.level2), inTrade: Boolean(j.inTrade) };
}

async function cycle() {
  if (busy) return;
  busy = true;
  try {
    if (state.status === 'idle') set({ status: 'loading' });
    const top = await fetchRankings();
    const bar = Math.floor(Date.now() / H1) * H1;
    const answers = new Map<string, any>();
    set({ pairs: top.map((p) => toPair(p, scans.get(`${p.symbol}|${bar}`))) });
    let notConfigured = false;
    const queue = top.filter((p) => !scans.has(`${p.symbol}|${bar}`));
    const worker = async () => {
      for (;;) {
        const p = queue.shift();
        if (!p || notConfigured) return;
        try {
          const j = await scanOne(p.symbol, bar);
          if (j?.code === 'not_configured') { notConfigured = true; return; }
          answers.set(p.symbol, j);
          set({ pairs: top.map((x) => toPair(x, scans.get(`${x.symbol}|${bar}`) || answers.get(x.symbol))) });
        } catch { answers.set(p.symbol, { ok: false }); }
      }
    };
    await Promise.all([worker(), worker()]);
    if (notConfigured) { set({ status: 'not_configured', pairs: [], updatedAt: Date.now() }); return; }
    const pairs = top.map((x) => toPair(x, scans.get(`${x.symbol}|${bar}`) || answers.get(x.symbol) || { ok: false }));

    // New aligned level touches → one alert each, ever.
    const seen = new Set(read<string[]>(K_SEEN, []));
    const fresh: LevelAlert[] = [];
    for (const p of pairs) {
      const h = p.hit; if (!h) continue;
      const id = `${p.symbol}|${h.time}|${h.dir}|${h.level}`;
      if (seen.has(id)) continue;
      seen.add(id);
      if (Date.now() - (h.time + H1) > NOTIFY_MS) continue;
      // A hair-line touch can differ from one broker's feed to the next: list it, but do not ring for it.
      if (getLevelSettings().confirmedOnly && typeof h.depthPips === 'number' && h.depthPips < EDGE_PIPS) continue;
      fresh.push({ id, symbol: p.symbol, display: p.display, side: p.side, level: h.level, price: h.price, zoneTop: h.zoneTop, zoneBottom: h.zoneBottom, models: h.models, time: h.time + H1, score: p.score, depthPips: h.depthPips });
    }
    write(K_SEEN, [...seen].slice(-400));
    // Double-check every alert before it is announced (fundamentals live now, crowd, news) — never announce on stale or contradicting data.
    const verified: LevelAlert[] = [];
    for (const a of fresh) { const v = await verifyAlert(a, pairs.find((p) => p.symbol === a.symbol)?.hit || null); if (v) verified.push(v); }
    fresh.length = 0; fresh.push(...verified);
    let alerts = state.alerts;
    if (fresh.length) {
      alerts = [...fresh, ...alerts].slice(0, 40);
      write(K_LOG, alerts);
      announceSetups(fresh);
      for (const a of fresh) notify(`${a.side > 0 ? 'BUY' : 'SELL'} ${a.display} — Level ${a.level} reached (H1)`, alertSummary(a));
      try { window.dispatchEvent(new CustomEvent('ppfx:level-alert', { detail: fresh })); } catch { /* ignore */ }
    }
    set({ status: 'ready', pairs, alerts, updatedAt: Date.now(), unseen: state.unseen + fresh.length });
  } catch { /* offline or rankings unavailable: keep what we have and retry */ }
  finally { busy = false; }
}

function schedule() {
  if (timer) clearTimeout(timer);
  // Next run: shortly after the next H1 candle closes (spread out so everyone does not ask at once),
  // with a mid-hour refresh so a changed ranking is picked up.
  const now = Date.now();
  const nextBar = (Math.floor(now / H1) + 1) * H1 + 20_000 + Math.random() * 25_000;
  const wait = Math.min(nextBar - now, state.status === 'ready' ? 15 * 60_000 : 90_000);
  timer = setTimeout(async () => { if (typeof document === 'undefined' || document.visibilityState !== 'hidden' || Date.now() >= nextBar - 60_000) await cycle(); schedule(); }, Math.max(5_000, wait));
}

export function startLevelAlerts() {
  if (started || typeof window === 'undefined') return;
  started = true;
  setTimeout(() => { cycle().then(schedule); }, 2500);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - state.updatedAt > 5 * 60_000) cycle(); });
}

export const markLevelAlertsSeen = () => { if (state.unseen) set({ unseen: 0 }); };
export const clearLevelAlerts = () => { write(K_LOG, []); set({ alerts: [], unseen: 0 }); };
export const refreshLevelAlerts = () => cycle();

export function useLevelAlerts(): LevelState {
  const [, tick] = useState(0);
  useEffect(() => {
    startLevelAlerts();
    const f = () => tick((n) => n + 1);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);
  return state;
}

/** Scan result for one pair (engine or chart symbol), if it is one of the tracked pairs. */
export function pairLevel(st: LevelState, symbol: string): PairScan | undefined {
  const s = symbol.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return st.pairs.find((p) => p.symbol === s || chartSym(p.symbol) === s);
}

/** ADMIN: load the SBT strategy file into the server (private store). The source never reaches students. */
export async function uploadSbtStrategy(source: string, token: string | null): Promise<{ ok: boolean; error?: string; version?: string; test?: any }> {
  const r = await fetch('/api/sbt/strategy', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ source }) });
  const j = await r.json().catch(() => ({ ok: false, error: `HTTP ${r.status}` }));
  if (j.ok) { scans.clear(); set({ status: 'loading' }); void cycle(); }
  return j;
}
