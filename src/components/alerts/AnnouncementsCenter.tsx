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
import { ArrowDownRight, ArrowUpRight, BellRing, BellOff, ExternalLink, FileDown, Flame, Megaphone, RefreshCw, Trash2, Volume2, X } from 'lucide-react';
import { SOUNDS, playSound, type SoundId } from '../../utils/alertSounds';
import { useRankings, openChart, type RankedPair } from '../fundamentalAnalysis/LiveBiasStrip';
import { LevelAlertsPanel, LevelBadge } from '../sbt/LevelAlerts';
import { markLevelAlertsSeen, useLevelAlerts } from '../../services/sbtSetups';
import { fetchAnnouncementsServer, type InAppAnnouncement } from '../../services/signalsService';
import { usePicks, REGION_LABEL, type PickRow } from '../fundamentalAnalysis/PicksView';

interface LtAlert { id: string; at: number; bullish: { symbol: string; display: string; score: number }[]; bearish: { symbol: string; display: string; score: number }[] }

const K_ALERTS = 'ppfx_lt_alerts_v1';
const K_SETTINGS = 'ppfx_lt_alert_settings_v1';
const K_SEEN = 'ppfx_announcements_seen_at_v1';
const INTERVALS: [number, string][] = [[15, '15 min'], [30, '30 min'], [60, '1 hour'], [120, '2 hours'], [180, '3 hours'], [240, '4 hours'], [360, '6 hours'], [720, '12 hours'], [1440, '24 hours']];

/** Plays the user's chosen alert sound. */
function playChime(id?: SoundId) {
  const sid = id || read<{ soundId?: SoundId }>(K_SETTINGS, {}).soundId || 'chime';
  playSound(sid);
}

interface NewsItem { id: string; title: string; summary: string; link: string; source: string; publishedAt: number; impact: 'HIGH' | 'MEDIUM' | 'LOW'; category: string }
const K_DISMISSED = 'ppfx_ann_dismissed_v1';
const ago = (t: number) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; };

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
  const [tab, setTab] = useState<'FUNDAMENTALS' | 'PICKS' | 'ANNOUNCEMENTS' | 'ALERTS'>('FUNDAMENTALS');
  const { data: rankings } = useRankings(5 * 60_000);
  const levels = useLevelAlerts();
  const levelHits = levels.pairs.filter((p) => p.hit).length;
  const [anns, setAnns] = useState<InAppAnnouncement[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => read(K_DISMISSED, []));
  const known = useRef<Set<string> | null>(null);
  const [alerts, setAlerts] = useState<LtAlert[]>(() => read(K_ALERTS, []));
  const [settings, setSettings] = useState<{ enabled: boolean; muted: boolean; lastAt: number; everyMin?: number; sound?: boolean; soundId?: SoundId; storiesSound?: boolean }>(() => ({ everyMin: 180, sound: true, ...read(K_SETTINGS, { enabled: true, muted: false, lastAt: 0 }) }));
  const [seenAt, setSeenAt] = useState<number>(() => read(K_SEEN, 0));
  const [perm, setPerm] = useState<string>(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const rankRef = useRef(rankings);
  rankRef.current = rankings;

  const saveSettings = (s: typeof settings) => { setSettings(s); write(K_SETTINGS, s); };

  useEffect(() => {
    let live = true;
    const arrived = (ids: string[], title: string, body: string) => {
      if (!known.current) { known.current = new Set(ids); return; }
      const fresh = ids.filter((id) => !known.current!.has(id));
      fresh.forEach((id) => known.current!.add(id));
      if (!fresh.length) return;
      const st = read<typeof settings>(K_SETTINGS, { enabled: true, muted: false, lastAt: 0 });
      if (st.muted) return;
      const onlyStories = fresh.every((id) => id.startsWith('n:'));
      if (onlyStories && st.storiesSound === false) return; // Important → hottest stories muted
      if (st.sound !== false) playChime(st.soundId);
      notify(title, body);
    };
    const load = async () => {
      const [a, n] = await Promise.all([
        fetchAnnouncementsServer().catch(() => [] as InAppAnnouncement[]),
        fetch('/api/news/breaking', { cache: 'no-store' }).then((r) => r.json()).then((j) => (Array.isArray(j?.items) ? (j.items as NewsItem[]) : [])).catch(() => null),
      ]);
      if (!live) return;
      const al = Array.isArray(a) ? a.filter(Boolean) : [];
      setAnns(al);
      if (n) setNews(n);
      const hot = (n || []).filter((x) => x.impact === 'HIGH');
      const latest = hot[0];
      arrived([...al.map((x) => `a:${x.id}`), ...hot.map((x) => `n:${x.id}`)], latest ? `Market news · ${latest.source}` : 'PrimePipFX announcement', latest ? latest.title : String(al[0]?.title || ''));
    };
    load();
    const t = window.setInterval(load, 120_000);
    return () => { live = false; window.clearInterval(t); };
  }, []);

  const dismissedSet = useMemo(() => new Set(dismissed), [dismissed]);
  const highlights = useMemo(() => {
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    return news
      .filter((x) => x.impact !== 'LOW' && !dismissedSet.has(`n:${x.id}`) && Date.now() - x.publishedAt < 36 * 3600_000)
      .sort((x, y) => rank[x.impact] - rank[y.impact] || y.publishedAt - x.publishedAt)
      .slice(0, 12);
  }, [news, dismissedSet]);
  const visibleAnns = useMemo(() => anns.filter((a) => !dismissedSet.has(`a:${a.id}`)), [anns, dismissedSet]);
  const dismiss = (keys: string[]) => { const next = [...new Set([...keys, ...dismissed])].slice(0, 600); setDismissed(next); write(K_DISMISSED, next); };

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
    const annNew = visibleAnns.filter((a) => (Date.parse(String(a?.timestamp || '')) || 0) > seenAt).length;
    const alertNew = alerts.filter((a) => a.at > seenAt).length;
    const newsNew = highlights.filter((x) => x.impact === 'HIGH' && x.publishedAt > seenAt).length;
    return annNew + alertNew + newsNew;
  }, [visibleAnns, alerts, highlights, seenAt]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) { markLevelAlertsSeen(); if (levels.unseen) setTab('FUNDAMENTALS'); const now = Date.now(); write(K_SEEN, now); window.setTimeout(() => setSeenAt(now), 1500); }
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
        <Megaphone className={`w-4 h-4 ${unread + levels.unseen ? 'text-amber-300' : 'text-violet-300'}`} />
        {unread + levels.unseen > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">{unread + levels.unseen > 99 ? '99+' : unread + levels.unseen}</span>}
        {unread + levels.unseen === 0 && levelHits > 0 && <span title={`${levelHits} fundamental setup${levelHits > 1 ? "s" : ""} at key level — open to see which pair and Buy / Sell`} className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-950" />}
      </button>

      {open && (
        <div className="fixed top-[calc(env(safe-area-inset-top,0px)+3.5rem)] right-3 z-[85] w-[min(420px,calc(100vw-1.5rem))] max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-9rem),680px)] flex flex-col rounded-2xl border border-violet-500/30 bg-[#080c16]/98 backdrop-blur-xl shadow-[0_25px_80px_-20px_rgba(139,92,246,0.45)]">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-800">
            <Megaphone className="w-4 h-4 text-violet-300" />
            <span className="text-[13px] font-bold text-slate-50">Announcements</span>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-1 px-3 pt-2">
            {([['FUNDAMENTALS', `Long-term${levelHits ? ` · ${levelHits} setup${levelHits > 1 ? 's' : ''}` : ''}`], ['PICKS', 'Stocks & indices'], ['ANNOUNCEMENTS', `Important${visibleAnns.length + highlights.length ? ` (${visibleAnns.length + highlights.length})` : ''}`], ['ALERTS', `Alerts${alerts.length ? ` (${alerts.length})` : ''}`]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${tab === k ? 'bg-violet-500/20 border border-violet-400/50 text-violet-100' : 'text-slate-400 hover:text-white border border-transparent'}`}>{l}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {(tab === 'FUNDAMENTALS' || levelHits > 0) && <LevelAlertsPanel dense onOpen={(sym) => { openChart(sym); setOpen(false); }} />}
            {tab === 'FUNDAMENTALS' && (
              <>
                <button type="button" disabled={!rankings} onClick={() => rankings && import('../../utils/macroPdf').then((m) => m.exportRankingsPdf(rankings as any, 'longTerm'))} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-400/50 bg-emerald-500/10 text-[11.5px] font-semibold text-emerald-100 hover:bg-emerald-500/20 cursor-pointer disabled:opacity-40"><FileDown className="w-3.5 h-3.5" />Export top long-term picks (PDF)</button>
                <div className="text-[10.5px] text-slate-500">Live long-term fundamental ranking · {rankings?.generatedAt ? `updated ${when(Date.parse(rankings.generatedAt))} PKT` : 'loading…'} · tap a pair to open its chart</div>
                {[['Long-term bullish', bull, true], ['Long-term bearish', bear, false]].map(([title, list, up]) => (
                  <div key={title as string} className={`rounded-xl border p-2.5 ${up ? 'border-emerald-500/25 bg-emerald-500/[0.04]' : 'border-rose-500/25 bg-rose-500/[0.04]'}`}>
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{title as string}</div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      {(list as RankedPair[]).map((p) => (
                        <button key={p.symbol} type="button" onClick={() => { openChart(p.symbol); setOpen(false); }} className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-600 text-[11.5px] cursor-pointer">
                          <span className="flex items-center gap-1 text-slate-100 font-semibold">{up ? <ArrowUpRight className="w-3 h-3 text-emerald-400" /> : <ArrowDownRight className="w-3 h-3 text-rose-400" />}{p.display}</span>
                          <span className="flex items-center gap-1"><LevelBadge symbol={p.symbol} state={levels} compact /><span className={`font-mono-code text-[10.5px] ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{fmt(p.longTerm)}</span></span>
                        </button>
                      ))}
                      {!(list as RankedPair[]).length && <span className="text-[11px] text-slate-500">Loading…</span>}
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === 'PICKS' && <StockPicksPanel onOpen={() => setOpen(false)} />}

            {tab === 'ANNOUNCEMENTS' && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px] text-slate-500">Owner announcements and the market's hottest stories</span>
                  {(visibleAnns.length > 0 || highlights.length > 0) && (
                    <button type="button" onClick={() => dismiss([...visibleAnns.map((a) => `a:${a.id}`), ...highlights.map((x) => `n:${x.id}`)])} className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-700 text-[10.5px] text-slate-300 hover:text-white hover:border-rose-400/60 cursor-pointer"><Trash2 className="w-3 h-3" />Clear all</button>
                  )}
                </div>

                {visibleAnns.map((a, i) => {
                  const ts = Date.parse(String(a?.timestamp || '')) || 0;
                  return (
                    <div key={String(a?.id ?? i)} className={`group relative rounded-xl border p-3 pr-8 ${ts > seenAt ? 'border-amber-400/50 bg-amber-500/[0.06]' : 'border-slate-800 bg-slate-950/60'}`}>
                      <button type="button" onClick={() => dismiss([`a:${a.id}`])} title="Clear" aria-label="Clear announcement" className="absolute top-2 right-2 p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                      <div className="flex items-center gap-2 text-[10.5px]"><span className="font-bold text-amber-300 uppercase">{String(a?.category || 'Announcement').replace(/_/g, ' ')}</span><span className="text-slate-500 ml-auto">{ts ? when(ts) : ''}</span></div>
                      <div className="mt-1 text-[13px] font-bold text-slate-100">{String(a?.title ?? '')}</div>
                      <div className="mt-0.5 text-[12px] text-slate-300 whitespace-pre-wrap break-words">{typeof a?.message === 'string' ? a.message : JSON.stringify(a?.message ?? '')}</div>
                      {a?.sender && <div className="mt-1 text-[10px] text-slate-500">— {String(a.sender)}</div>}
                    </div>
                  );
                })}

                <div className="flex items-center gap-1.5 pt-1 text-[10px] uppercase tracking-[0.16em] font-bold text-orange-300"><Flame className="w-3.5 h-3.5" />Hottest stories
                  <button type="button" data-testid="stories-sound-toggle" onClick={() => saveSettings({ ...settings, storiesSound: settings.storiesSound === false })}
                    title={settings.storiesSound === false ? 'Sound is off for new hottest stories — tap to turn it on' : 'A sound plays when a new hottest story arrives — tap to mute'}
                    className={`ml-auto normal-case tracking-normal inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10.5px] font-semibold cursor-pointer ${settings.storiesSound === false ? 'border-rose-500/50 text-rose-200 bg-rose-500/10' : 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10'}`}>
                    {settings.storiesSound === false ? <><BellOff className="w-3 h-3" />Sound muted</> : <><BellRing className="w-3 h-3" />Sound on</>}
                  </button>
                </div>
                {!highlights.length && <div className="text-[12px] text-slate-500 py-3 text-center">{news.length ? 'All caught up — no new market-moving stories.' : 'Loading the latest market news…'}</div>}
                {highlights.map((x) => (
                  <div key={x.id} className={`relative rounded-xl border pl-3 pr-8 py-2.5 ${x.impact === 'HIGH' ? 'border-rose-500/30 bg-gradient-to-r from-rose-500/[0.08] to-transparent' : 'border-slate-800 bg-slate-950/60'}`}>
                    <button type="button" onClick={() => dismiss([`n:${x.id}`])} title="Clear" aria-label="Clear story" className="absolute top-2 right-2 p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className={`px-1.5 py-[1px] rounded font-bold ${x.impact === 'HIGH' ? 'bg-rose-500/20 text-rose-200' : 'bg-amber-500/15 text-amber-200'}`}>{x.impact === 'HIGH' ? 'HIGH IMPACT' : 'MARKET MOVER'}</span>
                      <span className="text-slate-400">{x.category}</span>
                      <span className="text-slate-500 ml-auto">{ago(x.publishedAt)}</span>
                    </div>
                    <a href={x.link} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[12.5px] font-semibold text-slate-100 hover:text-cyan-200 leading-snug">{x.title} <ExternalLink className="inline w-3 h-3 opacity-60" /></a>
                    {(() => { const sm = String(x.summary || '').replace(/<[^>]*>?/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim(); return sm && !sm.startsWith(x.title.slice(0, 30)) ? <div className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">{sm}</div> : null; })()}
                    <div className="mt-0.5 text-[10px] text-slate-500">{x.source}</div>
                  </div>
                ))}
                {dismissed.length > 0 && (
                  <button type="button" onClick={() => { setDismissed([]); write(K_DISMISSED, []); }} className="w-full text-center text-[10.5px] text-slate-500 hover:text-slate-300 cursor-pointer py-1">Show cleared items again</button>
                )}
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
                    <label className="inline-flex items-center gap-1 ml-auto cursor-pointer"><input type="checkbox" checked={settings.sound !== false} onChange={(e) => { saveSettings({ ...settings, sound: e.target.checked }); if (e.target.checked) playChime(settings.soundId); }} className="accent-violet-400" />Sound</label>
                  </div>
                  <div className="pt-1">
                    <div className="text-[11px] font-semibold text-slate-200 mb-1 flex items-center gap-1"><Volume2 className="w-3.5 h-3.5 text-violet-300" />Alert sound <span className="text-slate-500 font-normal">· used for announcements, hot stories and alerts</span></div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {SOUNDS.map((x) => {
                        const on = (settings.soundId || 'chime') === x.id;
                        return (
                          <button key={x.id} type="button" onClick={() => { saveSettings({ ...settings, soundId: x.id, sound: true }); playSound(x.id); }} className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition ${on ? 'border-violet-400/70 bg-violet-500/20 text-violet-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500'}`}>{on ? '● ' : ''}{x.label}</button>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Tap a sound to hear it and select it.</div>
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


/** Fundamental stock / index / commodity picks for the announcements panel. */
const StockPicksPanel: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { data, error } = usePicks(5 * 60_000);
  if (!data) return <div className="text-[12px] text-slate-500 py-6 text-center">{error || 'Ranking stocks, indices and commodities…'}</div>;
  const row = (r: PickRow, up: boolean) => (
    <div key={r.symbol} className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-[11.5px]">
      <span className="min-w-0 truncate"><span className="font-semibold text-slate-100">{r.symbol}</span> <span className="text-slate-500">{r.name}</span></span>
      <span className={`shrink-0 font-mono-code text-[10.5px] ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{fmt(r.score)} · {Math.round(r.bullishPct ?? 50)}% bull / {100 - Math.round(r.bullishPct ?? 50)}% bear</span>
    </div>
  );
  const box = (title: string, rows: PickRow[], up: boolean, tone: string) => (
    <div className={`rounded-xl border p-2.5 ${tone}`}>
      <div className={`text-[10px] uppercase tracking-widest font-bold ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{title}</div>
      <div className="mt-1.5 space-y-1">{rows.length ? rows.map((r) => row(r, up)) : <span className="text-[11px] text-slate-500">None right now.</span>}</div>
    </div>
  );
  const pkBull = data.regions.PK?.bullish.slice(0, 5) || [];
  const pkBear = data.regions.PK?.bearish.slice(0, 5) || [];
  return (
    <>
      <div className="text-[10.5px] text-slate-500">Live fundamental picks across stocks, indices and commodities · updated {when(Date.parse(data.generatedAt))} PKT · {data.scoredStocks} stocks scored. Full lists: Fundamentals → Top Picks.</div>
      {box('VIP long-term picks', data.vip.slice(0, 6), true, 'border-amber-400/30 bg-amber-500/[0.05]')}
      {box('Strong bullish', data.strongBullish.slice(0, 6), true, 'border-emerald-500/25 bg-emerald-500/[0.04]')}
      {box('Strong bearish', data.strongBearish.slice(0, 5), false, 'border-rose-500/25 bg-rose-500/[0.04]')}
      {box(`${REGION_LABEL.PK} · most bullish`, pkBull, true, 'border-emerald-500/25 bg-emerald-500/[0.04]')}
      {box(`${REGION_LABEL.PK} · most bearish`, pkBear, false, 'border-rose-500/25 bg-rose-500/[0.04]')}
      {box('Indices · most bullish', data.indices.bullish.slice(0, 5), true, 'border-emerald-500/25 bg-emerald-500/[0.04]')}
      {box('Indices · most bearish', data.indices.bearish.slice(0, 5), false, 'border-rose-500/25 bg-rose-500/[0.04]')}
      {box('Commodities · bullish', data.commodities.bullish.slice(0, 5), true, 'border-emerald-500/25 bg-emerald-500/[0.04]')}
      {box('Commodities · bearish', data.commodities.bearish.slice(0, 5), false, 'border-rose-500/25 bg-rose-500/[0.04]')}
      <div className="text-[10px] text-slate-500">Not financial advice. Scores come from reported company figures and live macro data; unscored names are never guessed.</div>
    </>
  );
};
