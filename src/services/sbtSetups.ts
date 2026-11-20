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
  let perm = Notification.permission;
  if (perm === 'default') { try { perm = await Notification.requestPermission(); } catch { perm = Notification.permission; } }
  if (perm === 'granted') void subscribePush();
  return perm;
}

const b64ToU8 = (b: string) => { const p = '='.repeat((4 - (b.length % 4)) % 4); const r = atob((b + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
/** Register this phone / PC for background notifications (works with the app closed). */
export async function subscribePush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    const k = await fetch('/api/push/key').then((r) => r.json());
    if (!k?.ok) return false;
    const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(k.key) }));
    const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
    return r.ok;
  } catch { return false; }
}
// A push that arrives while the app is open is spoken (the notification itself is shown by the service worker).
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (m: MessageEvent) => {
    if (m.data?.type !== 'ppfx-level-push' || !m.data.speech) return;
    const cfg = getLevelSettings();
    if (cfg.sound) playSound(cfg.soundId);
    if (cfg.voice) setTimeout(() => speak(String(m.data.speech)), cfg.sound ? 1500 : 0);
  });
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
export interface LevelState { status: 'idle' | 'loading' | 'ready' | 'not_configured' | 'waiting'; pairs: PairScan[]; alerts: LevelAlert[]; events: LevelEvent[]; marketOpen: boolean; updatedAt: number; unseen: number }

const read = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const chartSym = (s: string) => ({ BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', XRPUSD: 'XRPUSDT', SOLUSD: 'SOLUSDT' } as Record<string, string>)[s] || s;

let state: LevelState = { status: 'idle', pairs: [], alerts: [], events: [], marketOpen: true, updatedAt: 0, unseen: 0 };
const subs = new Set<() => void>();
const set = (p: Partial<LevelState>) => { state = { ...state, ...p }; subs.forEach((f) => f()); };
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

/** One event from the hourly engine (see server/sbt/levelEvents.ts). */
export interface LevelEvent { id: string; kind: 'ACTIVATED' | 'READY' | 'DEACTIVATED' | 'TRADE_CLOSED' | 'MARKET_OPEN' | 'MARKET_CLOSED'; symbol: string; display: string; side: 1 | -1 | 0; level?: 1 | 2; time: number; title: string; text: string; speech: string }

/** Map one hourly-engine pair into the shape the screens use. Only what is active NOW is shown as active. */
function toPairFromHourly(h: any): PairScan {
  const base = { symbol: String(h.symbol), display: String(h.display || h.symbol), side: h.side as 1 | -1, score: Number(h.score) };
  if (!h.ok || h.stale) return { ...base, state: 'unavailable' };
  const hit: LevelSignal | null = h.hit || null;
  const sameSide = h.dir === h.side;
  return {
    ...base, state: 'ok', lastCandle: h.lastCandle, dir: h.dir, level1: h.level1 || null, level2: h.level2 || null,
    hit, recent: h.inTrade ? (h.tradeFrom || null) : null, awayPips: null, lastClose: h.lastClose, pip: h.pip,
    watching: sameSide && Boolean(h.level1 || h.level2), inTrade: Boolean(h.inTrade),
  };
}

const K_EVSEEN = 'ppfx_level_events_seen_v2';
const EVENT_RING_MS = 90 * 60_000; // only an event that has just happened is spoken; re-opening the app never replays old ones

function speakEvents(list: LevelEvent[]) {
  const cfg = getLevelSettings();
  if (cfg.sound) { playSound(cfg.soundId); setTimeout(() => playSound(cfg.soundId), 900); }
  if (cfg.voice && list.length) setTimeout(() => speak(list.slice(0, 4).map((e) => e.speech).join(' ')), cfg.sound ? 1800 : 0);
}

async function cycle() {
  if (busy) return;
  busy = true;
  try {
    if (state.status === 'idle') set({ status: 'loading' });
    const r = await fetch('/api/sbt/levels', { cache: 'no-store' });
    const j = await r.json().catch(() => null);
    if (!j?.ok) { set({ status: 'waiting', pairs: [], updatedAt: Date.now() }); return; }
    const pairs: PairScan[] = (j.pairs || []).map(toPairFromHourly);
    const events: LevelEvent[] = Array.isArray(j.events) ? j.events : [];
    const seenRaw = localStorage.getItem(K_EVSEEN);
    const seen = new Set(read<string[]>(K_EVSEEN, []));
    const first = seenRaw === null;
    const fresh = events.filter((e) => !seen.has(e.id) && !first && Date.now() - e.time < EVENT_RING_MS);
    for (const e of events) seen.add(e.id);
    write(K_EVSEEN, [...seen].slice(-600));
    // The alert list shows setups that are active now (activation events), never an old log.
    const alerts: LevelAlert[] = events.filter((e) => e.kind === 'ACTIVATED' && Date.now() - e.time < 3 * H1).map((e: any) => ({
      id: e.id, symbol: e.symbol, display: e.display, side: e.side, level: e.level, price: e.price, zoneTop: e.zoneTop, zoneBottom: e.zoneBottom,
      models: e.models || [], time: e.time, score: e.score ?? 0, stop: e.stop, target: e.target,
    }));
    if (fresh.length) {
      speakEvents(fresh);
      for (const e of fresh) notify(e.title, e.text);
      try { window.dispatchEvent(new CustomEvent('ppfx:level-alert', { detail: fresh })); } catch { /* ignore */ }
    }
    set({ status: 'ready', pairs, alerts, events, marketOpen: j.marketOpen !== false, updatedAt: Date.now(), unseen: state.unseen + fresh.filter((e) => e.kind === 'ACTIVATED').length });
  } catch { /* offline: keep what we have and retry */ }
  finally { busy = false; }
}

function schedule() {
  if (timer) clearTimeout(timer);
  // The hourly engine publishes shortly after each H1 close; looking once a minute while the app is open
  // costs nothing (the answer is a small cached file) and speaks the new events within about a minute.
  timer = setTimeout(async () => { if (typeof document === 'undefined' || document.visibilityState !== 'hidden') await cycle(); schedule(); }, 60_000);
}

export function startLevelAlerts() {
  if (started || typeof window === 'undefined') return;
  started = true;
  try { localStorage.removeItem(K_LOG); localStorage.removeItem(K_SEEN); } catch { /* storage blocked */ }
  setTimeout(() => { cycle().then(schedule); }, 1500);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - state.updatedAt > 90_000) cycle(); });
}

export const markLevelAlertsSeen = () => { if (state.unseen) set({ unseen: 0 }); };
export const clearLevelAlerts = () => { set({ alerts: [], unseen: 0 }); };
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
  if (j.ok) { set({ status: 'loading' }); void cycle(); }
  return j;
}
