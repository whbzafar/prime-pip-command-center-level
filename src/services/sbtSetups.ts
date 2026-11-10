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
const FRESH_MS = 24 * H1;        // how long a reached level stays listed
const NOTIFY_MS = 2 * H1 + 5 * 60_000; // only candles that closed recently ring (no old alerts after re-opening the app)
const K_SEEN = 'ppfx_level_alerts_seen_v1';
const K_LOG = 'ppfx_level_alerts_log_v1';
const K_LEVEL_SETTINGS = 'ppfx_level_alert_settings_v1';

/** Sound settings for key-level setups (separate from the news alerts, so muting news never silences a setup). */
export interface LevelAlertSettings { sound: boolean; voice: boolean; soundId: SoundId }
export const getLevelSettings = (): LevelAlertSettings => ({ sound: true, voice: true, soundId: 'alarm', ...read<Partial<LevelAlertSettings>>(K_LEVEL_SETTINGS, {}) });
export function setLevelSettings(p: Partial<LevelAlertSettings>) { write(K_LEVEL_SETTINGS, { ...getLevelSettings(), ...p }); subs.forEach((f) => f()); }

/** Sound + spoken pair for one or more setups: "Buy, G B P, C A D. Level 1 reached." */
export function announceSetups(list: { display: string; side: 1 | -1; level: 1 | 2 }[]) {
  const cfg = getLevelSettings();
  if (cfg.sound) { playSound(cfg.soundId); setTimeout(() => playSound(cfg.soundId), 900); }
  if (cfg.voice && list.length) {
    const text = list.slice(0, 4).map((a) => `${a.side > 0 ? 'Buy' : 'Sell'}, ${spokenPair(a.display)}. Level ${a.level} reached.`).join(' ');
    setTimeout(() => speak(`Fundamental setup. ${text}`), cfg.sound ? 1800 : 0);
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

export interface LevelSignal { time: number; dir: 1 | -1; level: 1 | 2; price: number; stop: number; target: number; zoneTop: number; zoneBottom: number; models: string[] }
export interface LevelZone { top: number; bottom: number; modelReady: boolean }
export interface PairScan {
  symbol: string; display: string; side: 1 | -1; score: number;
  state: 'loading' | 'ok' | 'unavailable';
  lastCandle?: number; dir?: -1 | 0 | 1; level1?: LevelZone | null; level2?: LevelZone | null;
  /** Newest level touch that agrees with the fundamentals (within the last 24 hours). */
  hit?: LevelSignal | null;
  /** The strategy is currently tracking levels on the fundamental side. */
  watching?: boolean;
}
export interface LevelAlert { id: string; symbol: string; display: string; side: 1 | -1; level: 1 | 2; price: number; zoneTop: number; zoneBottom: number; models: string[]; time: number; score: number }
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

async function fetchRankings(): Promise<{ symbol: string; display: string; side: 1 | -1; score: number }[]> {
  const r = await fetch('/api/macro/rankings');
  const j = await r.json();
  const lt = j?.data?.longTerm;
  if (!lt) throw new Error('rankings unavailable');
  const pick = (l: any[], side: 1 | -1) => (l || []).slice(0, TOP_N).map((p) => ({ symbol: String(p.symbol), display: String(p.display || p.symbol), side, score: Number(p.longTerm ?? 0) }));
  return [...pick(lt.bullish, 1), ...pick(lt.bearish, -1)];
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
  const hit = [...(j.signals || [])].reverse().find((s: LevelSignal) => s.dir === p.side && now - (s.time + H1) < FRESH_MS) || null;
  return { ...p, state: 'ok', lastCandle: j.lastCandle, dir: j.dir, level1: j.level1, level2: j.level2, hit, watching: j.dir === p.side && Boolean(j.level1 || j.level2) };
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
      fresh.push({ id, symbol: p.symbol, display: p.display, side: p.side, level: h.level, price: h.price, zoneTop: h.zoneTop, zoneBottom: h.zoneBottom, models: h.models, time: h.time + H1, score: p.score });
    }
    write(K_SEEN, [...seen].slice(-400));
    let alerts = state.alerts;
    if (fresh.length) {
      alerts = [...fresh, ...alerts].slice(0, 40);
      write(K_LOG, alerts);
      announceSetups(fresh);
      for (const a of fresh) notify(`${a.side > 0 ? 'BUY' : 'SELL'} ${a.display} — Level ${a.level} reached (H1)`, `Why: long-term ${a.side > 0 ? 'bullish' : 'bearish'} pair (score ${a.score > 0 ? '+' : ''}${a.score.toFixed(0)}) and price is at its ${a.side > 0 ? 'buy' : 'sell'} level${a.models.length ? ` with ${a.models.join(' + ')} complete` : ''}. H1 close ${fmtPrice(a.price)} · zone ${fmtPrice(a.zoneBottom)} – ${fmtPrice(a.zoneTop)}.`);
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
