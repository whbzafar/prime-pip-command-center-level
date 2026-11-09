/**
 * ANNOUNCEMENTS CENTER (megaphone beside the bell / sound buttons).
 *
 *  - Long-term fundamentals: the live top Long-Term Bullish / Bearish list from Fundamentals.
 *  - Important announcements from the owner (/api/announcements).
 *  - Long-term alerts: at a user-chosen interval (default 3 h) a summary of the strongest long-term bullish / bearish
 *    assets is posted here and, if enabled, shown as a system notification on PC or phone
 *    (works while the app is open in a tab or installed as an app). Mute / unmute any time.
 * A red badge shows how many new items arrived since the panel was last opened.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BellRing, BellOff, Megaphone, RefreshCw, X } from 'lucide-react';
import { useRankings, openChart, type RankedPair } from '../fundamentalAnalysis/LiveBiasStrip';
import { fetchAnnouncementsServer, type InAppAnnouncement } from '../../services/signalsService';

interface LtAlert { id: string; at: number; bullish: { symbol: string; display: string; score: number }[]; bearish: { symbol: string; display: string; score: number }[] }

const K_ALERTS = 'ppfx_lt_alerts_v1';
const K_SETTINGS = 'ppfx_lt_alert_settings_v1';
const K_SEEN = 'ppfx_announcements_seen_at_v1';
const INTERVALS: [number, string][] = [[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours'], [360, '6 hours'], [720, '12 hours'], [1440, '24 hours']];

/** A soft three-note chime (WebAudio, no file needed). */
function playChime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [659.25, 830.61, 987.77]; // E5, G#5, B5 — a bright major arpeggio
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.16;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.95);
    });
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, 1800);
  } catch { /* audio blocked */ }
}

const read = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const fmt = (v: number | null) => (v === null || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(0)}`);
const when = (t: number) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(t));

async function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) { await reg.showNotification(title, { body, icon: '/favicon.ico', tag: 'ppfx-longterm', renotify: true } as any); return; }
  } catch { /* fall back */ }
  try { new Notification(title, { body, icon: '/favicon.ico', tag: 'ppfx-longterm' }); } catch { /* not allowed */ }
}

export const AnnouncementsCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'FUNDAMENTALS' | 'ANNOUNCEMENTS' | 'ALERTS'>('FUNDAMENTALS');
  const { data: rankings } = useRankings(5 * 60_000);
  const [anns, setAnns] = useState<InAppAnnouncement[]>([]);
  const [alerts, setAlerts] = useState<LtAlert[]>(() => read(K_ALERTS, []));
  const [settings, setSettings] = useState<{ enabled: boolean; muted: boolean; lastAt: number; everyMin?: number; sound?: boolean }>(() => ({ everyMin: 180, sound: true, ...read(K_SETTINGS, { enabled: true, muted: false, lastAt: 0 }) }));
  const [seenAt, setSeenAt] = useState<number>(() => read(K_SEEN, 0));
  const [perm, setPerm] = useState<string>(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const rankRef = useRef(rankings);
  rankRef.current = rankings;

  const saveSettings = (s: typeof settings) => { setSettings(s); write(K_SETTINGS, s); };

  useEffect(() => {
    let live = true;
    const load = () => fetchAnnouncementsServer().then((a) => { if (live) setAnns(Array.isArray(a) ? a.filter(Boolean) : []); }).catch(() => {});
    load();
    const t = window.setInterval(load, 60_000);
    return () => { live = false; window.clearInterval(t); };
  }, []);

  // Every 3 hours: post the long-term summary (and a system notification unless muted).
  const runAlert = useCallback(async (force = false) => {
    const s = { everyMin: 180, sound: true, ...read<typeof settings>(K_SETTINGS, { enabled: true, muted: false, lastAt: 0 }) };
    if (!s.enabled && !force) return;
    if (!force && Date.now() - s.lastAt < (s.everyMin || 180) * 60_000) return;
    let r = rankRef.current;
    if (!r) { try { const j = await (await fetch('/api/macro/rankings', { cache: 'no-store' })).json(); r = j.data; } catch { return; } }
    if (!r) return;
    const pick = (l: RankedPair[]) => l.slice(0, 5).map((p) => ({ symbol: p.symbol, display: p.display, score: Number(p.longTerm ?? 0) }));
    const a: LtAlert = { id: `lt_${Date.now()}`, at: Date.now(), bullish: pick(r.longTerm.bullish), bearish: pick(r.longTerm.bearish) };
    const next = [a, ...read<LtAlert[]>(K_ALERTS, [])].slice(0, 40);
    write(K_ALERTS, next); setAlerts(next);
    const ns = { ...s, lastAt: a.at }; write(K_SETTINGS, ns); setSettings(ns);
    if (!s.muted) {
      if (s.sound !== false) playChime();
      await notify('PrimePipFX · Long-term fundamentals', `Bullish: ${a.bullish.slice(0, 3).map((x) => `${x.display} ${fmt(x.score)}`).join(', ')}\nBearish: ${a.bearish.slice(0, 3).map((x) => `${x.display} ${fmt(x.score)}`).join(', ')}`);
    }
  }, []);

  useEffect(() => {
    const t0 = window.setTimeout(() => runAlert(false), 8000);
    const t = window.setInterval(() => runAlert(false), 60_000);
    return () => { window.clearTimeout(t0); window.clearInterval(t); };
  }, [runAlert]);

  const unread = useMemo(() => {
    const annNew = anns.filter((a) => (Date.parse(String(a?.timestamp || '')) || 0) > seenAt).length;
    const alertNew = alerts.filter((a) => a.at > seenAt).length;
    return annNew + alertNew;
  }, [anns, alerts, seenAt]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) { const now = Date.now(); write(K_SEEN, now); window.setTimeout(() => setSeenAt(now), 1500); }
  };
  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return;
    const p = await Notification.requestPermission();
    setPerm(p);
    saveSettings({ ...settings, enabled: true, muted: false });
    if (p === 'granted') notify('PrimePipFX alerts enabled', 'You will get the long-term bullish / bearish summary every 3 hours.');
  };

  const bull = rankings?.longTerm.bullish.slice(0, 8) || [];
  const bear = rankings?.longTerm.bearish.slice(0, 8) || [];

  return (
    <>
      <button type="button" onClick={toggle} title="Announcements & long-term alerts" aria-label="Announcements" className="relative p-2 rounded-xl bg-slate-950/95 border border-slate-700 text-slate-300 shadow-xl cursor-pointer">
        <Megaphone className={`w-4 h-4 ${unread ? 'text-amber-300' : 'text-violet-300'}`} />
        {unread > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="fixed top-14 right-3 z-[85] w-[min(420px,calc(100vw-1.5rem))] max-h-[min(78vh,680px)] flex flex-col rounded-2xl border border-violet-500/30 bg-[#080c16]/98 backdrop-blur-xl shadow-[0_25px_80px_-20px_rgba(139,92,246,0.45)]">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-800">
            <Megaphone className="w-4 h-4 text-violet-300" />
            <span className="text-[13px] font-bold text-slate-50">Announcements</span>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-1 px-3 pt-2">
            {([['FUNDAMENTALS', 'Long-term'], ['ANNOUNCEMENTS', `Important${anns.length ? ` (${anns.length})` : ''}`], ['ALERTS', `Alerts${alerts.length ? ` (${alerts.length})` : ''}`]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${tab === k ? 'bg-violet-500/20 border border-violet-400/50 text-violet-100' : 'text-slate-400 hover:text-white border border-transparent'}`}>{l}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {tab === 'FUNDAMENTALS' && (
              <>
                <div className="text-[10.5px] text-slate-500">Live long-term fundamental ranking · {rankings?.generatedAt ? `updated ${when(Date.parse(rankings.generatedAt))} PKT` : 'loading…'} · tap a pair to open its chart</div>
                {[['Long-term bullish', bull, true], ['Long-term bearish', bear, false]].map(([title, list, up]) => (
                  <div key={title as string} className={`rounded-xl border p-2.5 ${up ? 'border-emerald-500/25 bg-emerald-500/[0.04]' : 'border-rose-500/25 bg-rose-500/[0.04]'}`}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{title as string}</div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {(list as RankedPair[]).map((p) => (
                        <button key={p.symbol} type="button" onClick={() => { openChart(p.symbol); setOpen(false); }} className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-600 text-[11.5px] cursor-pointer">
                          <span className="flex items-center gap-1 text-slate-100 font-semibold">{up ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}{p.display}</span>
                          <span className={`font-mono-code text-[10.5px] ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{fmt(p.longTerm)}</span>
                        </button>
                      ))}
                      {!(list as RankedPair[]).length && <span className="text-[11px] text-slate-500">Loading…</span>}
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === 'ANNOUNCEMENTS' && (
              <>
                {!anns.length && <div className="text-[12px] text-slate-500 py-4 text-center">No announcements yet.</div>}
                {anns.map((a, i) => {
                  const ts = Date.parse(String(a?.timestamp || '')) || 0;
                  return (
                    <div key={String(a?.id ?? i)} className={`rounded-xl border p-3 ${ts > seenAt ? 'border-amber-400/50 bg-amber-500/[0.06]' : 'border-slate-800 bg-slate-950/60'}`}>
                      <div className="flex items-center gap-2 text-[10.5px]"><span className="font-bold text-amber-300 uppercase">{String(a?.category || 'Announcement').replace(/_/g, ' ')}</span><span className="text-slate-500 ml-auto">{ts ? when(ts) : ''}</span></div>
                      <div className="mt-1 text-[13px] font-bold text-slate-100">{String(a?.title ?? '')}</div>
                      <div className="mt-0.5 text-[12px] text-slate-300 whitespace-pre-wrap break-words">{typeof a?.message === 'string' ? a.message : JSON.stringify(a?.message ?? '')}</div>
                      {a?.sender && <div className="mt-1 text-[10px] text-slate-500">— {String(a.sender)}</div>}
                    </div>
                  );
                })}
              </>
            )}

            {tab === 'ALERTS' && (
              <>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <div className="text-[12px] font-bold text-slate-100">Long-term alerts</div>
                  <div className="flex items-center gap-2 flex-wrap text-[11.5px] text-slate-300">
                    <span>Every</span>
                    <select value={settings.everyMin || 180} onChange={(e) => saveSettings({ ...settings, everyMin: Number(e.target.value) })} className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-slate-100 cursor-pointer">
                      {INTERVALS.map(([m, l]) => <option key={m} value={m}>{l}</option>)}
                    </select>
                    <span>or</span>
                    <input type="number" min={5} max={1440} value={settings.everyMin || 180} onChange={(e) => saveSettings({ ...settings, everyMin: Math.min(1440, Math.max(5, Number(e.target.value) || 5)) })} className="w-16 bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-slate-100" aria-label="Minutes" />
                    <span>minutes</span>
                    <label className="inline-flex items-center gap-1 ml-auto cursor-pointer"><input type="checkbox" checked={settings.sound !== false} onChange={(e) => { saveSettings({ ...settings, sound: e.target.checked }); if (e.target.checked) playChime(); }} className="accent-violet-400" />Sound</label>
                    <button type="button" onClick={playChime} className="text-[10.5px] px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-white cursor-pointer">Test sound</button>
                  </div>
                  <div className="text-[11px] text-slate-400">A summary of the strongest long-term bullish and bearish assets, at the interval you choose, with a soft chime. Allow notifications to get it on this PC or phone (keep the app open in a tab, or install it to your home screen).</div>
                  <div className="flex flex-wrap gap-2">
                    {perm !== 'granted' && perm !== 'unsupported' && <button type="button" onClick={enableNotifications} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[11.5px] font-bold cursor-pointer inline-flex items-center gap-1"><BellRing className="w-3.5 h-3.5" />Enable notifications</button>}
                    <button type="button" onClick={() => saveSettings({ ...settings, muted: !settings.muted })} className={`px-3 py-1.5 rounded-lg border text-[11.5px] font-semibold cursor-pointer inline-flex items-center gap-1 ${settings.muted ? 'border-rose-500/50 text-rose-200 bg-rose-500/10' : 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10'}`}>{settings.muted ? <><BellOff className="w-3.5 h-3.5" />Muted — tap to unmute</> : <><BellRing className="w-3.5 h-3.5" />On — tap to mute</>}</button>
                    <button type="button" onClick={() => runAlert(true)} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-[11.5px] cursor-pointer inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Send now</button>
                  </div>
                  <div className="text-[10px] text-slate-500">Notifications: {perm === 'granted' ? 'allowed' : perm === 'denied' ? 'blocked in browser settings' : perm === 'unsupported' ? 'not supported in this browser' : 'not enabled yet'} · next alert {settings.lastAt ? when(settings.lastAt + (settings.everyMin || 180) * 60_000) : 'soon'} PKT</div>
                </div>
                {alerts.map((a) => (
                  <div key={a.id} className={`rounded-xl border p-2.5 ${a.at > seenAt ? 'border-violet-400/50 bg-violet-500/[0.06]' : 'border-slate-800 bg-slate-950/60'}`}>
                    <div className="text-[10.5px] text-slate-500">{when(a.at)} PKT</div>
                    <div className="mt-1 text-[11.5px] text-emerald-200"><b>Bullish:</b> {a.bullish.map((x) => `${x.display} ${fmt(x.score)}`).join(' · ')}</div>
                    <div className="text-[11.5px] text-rose-200"><b>Bearish:</b> {a.bearish.map((x) => `${x.display} ${fmt(x.score)}`).join(' · ')}</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AnnouncementsCenter;
