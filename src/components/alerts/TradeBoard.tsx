/**
 * TRADE (inside Announcements): every fundamental key-level setup in one place, in four logical views.
 *   Upcoming     — setups being tracked: price has not reached the zone yet (closest first)
 *   Ready        — price has reached the Level 1 / Level 2 zone (ready for execution) — newest first
 *   Deactivated  — setups that were cancelled / invalidated, and trades that closed
 *   Log          — everything, newest first
 * One switch mutes / unmutes every trade-setup sound, voice, notification and background push.
 */
import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BellOff, BellRing, Clock, Crosshair, XCircle } from 'lucide-react';
import { useLevelAlerts, getLevelSettings, setLevelSettings, fmtPrice, levelTime, type PairScan, type LevelEvent } from '../../services/sbtSetups';
import { LevelAlertsPanel } from '../sbt/LevelAlerts';

type Sub = 'UPCOMING' | 'READY' | 'DEACTIVATED' | 'LOG';
const ago = (t: number) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; };
const KIND: Record<string, { label: string; cls: string }> = {
  ACTIVATED: { label: 'REACHED', cls: 'bg-amber-400 text-amber-950' }, READY: { label: 'READY', cls: 'bg-cyan-400 text-cyan-950' },
  DEACTIVATED: { label: 'DEACTIVATED', cls: 'bg-slate-500 text-white' }, TRADE_CLOSED: { label: 'CLOSED', cls: 'bg-slate-600 text-slate-100' },
  MARKET_OPEN: { label: 'MARKET', cls: 'bg-emerald-500 text-emerald-950' }, MARKET_CLOSED: { label: 'MARKET', cls: 'bg-slate-700 text-slate-200' },
};

const EventRow: React.FC<{ e: LevelEvent; onOpen: (s: string) => void }> = ({ e, onOpen }) => {
  const k = KIND[e.kind] || { label: e.kind, cls: 'bg-slate-600 text-white' };
  const click = e.symbol && e.symbol !== 'FX';
  return (
    <button type="button" disabled={!click} onClick={() => click && onOpen(e.symbol)} className="w-full text-left rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 cursor-pointer disabled:cursor-default hover:border-slate-600">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${k.cls}`}>{k.label}</span>
        {e.side !== 0 && <span className={`text-[10.5px] font-black ${e.side > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{e.side > 0 ? 'BUY' : 'SELL'}{e.level ? ` · L${e.level}` : ''}</span>}
        <span className="text-[13px] font-extrabold text-white">{e.display}</span>
        <span className="ml-auto text-[10px] text-slate-500">{levelTime(e.time)} PKT · {ago(e.time)}</span>
      </div>
      <div className="mt-1 text-[11.5px] text-slate-300">{e.text}</div>
    </button>
  );
};

const UpcomingRow: React.FC<{ p: PairScan; onOpen: (s: string) => void }> = ({ p, onOpen }) => {
  const up = p.side > 0;
  const zones = ([[1, p.level1], [2, p.level2]] as const).filter(([, z]) => z) as Array<[1 | 2, NonNullable<PairScan['level1']>]>;
  const px = p.lastClose;
  const dist = (z: { top: number; bottom: number }) => (px == null ? null : px >= z.bottom && px <= z.top ? 0 : Math.min(Math.abs(px - z.top), Math.abs(px - z.bottom)));
  return (
    <button type="button" onClick={() => onOpen(p.symbol)} data-testid="trade-upcoming" className={`w-full text-left rounded-xl border-l-4 border p-2.5 cursor-pointer ${up ? 'border-emerald-500/30 border-l-emerald-400 bg-emerald-500/[0.05]' : 'border-rose-500/30 border-l-rose-400 bg-rose-500/[0.05]'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10.5px] font-black ${up ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950'}`}>{up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{up ? 'BUY' : 'SELL'}</span>
        <span className="text-[13.5px] font-extrabold text-white">{p.display}</span>
        <span className="text-[10.5px] text-slate-400">long-term {up ? 'bullish' : 'bearish'} · score {p.score > 0 ? '+' : ''}{Math.round(p.score)}</span>
        {px != null && <span className="ml-auto text-[10.5px] font-mono-code text-slate-300">now {fmtPrice(px)}</span>}
      </div>
      {zones.map(([n, z]) => {
        const d = dist(z); const pips = d != null && p.pip ? d / p.pip : null;
        return <div key={n} className="mt-1 text-[11px] text-slate-300"><b className="text-amber-200">Level {n}</b> zone {fmtPrice(z.bottom)} – {fmtPrice(z.top)}{pips != null ? <span className="text-slate-400"> · {pips < 0.05 ? 'price inside' : `${pips.toFixed(1)} pips away`}</span> : null}{z.modelReady ? <span className="text-cyan-300"> · models ready</span> : <span className="text-slate-500"> · models forming</span>}</div>;
      })}
    </button>
  );
};

export const TradeBoard: React.FC<{ onOpen: (s: string) => void }> = ({ onOpen }) => {
  const st = useLevelAlerts();
  const [sub, setSub] = useState<Sub>('UPCOMING');
  const muted = getLevelSettings().muted;
  const upcoming = useMemo(() => st.pairs.filter((p) => p.state === 'ok' && !p.hit && (p.level1 || p.level2) && !p.inTrade).sort((a, b) => {
    const d = (p: PairScan) => { const zs = [p.level1, p.level2].filter(Boolean) as Array<{ top: number; bottom: number }>; if (p.lastClose == null || !zs.length) return 1e9; return Math.min(...zs.map((z) => (p.lastClose! >= z.bottom && p.lastClose! <= z.top ? 0 : Math.min(Math.abs(p.lastClose! - z.top), Math.abs(p.lastClose! - z.bottom))))) / (p.pip || 1); };
    return d(a) - d(b);
  }), [st.pairs]);
  const ready = useMemo(() => st.pairs.filter((p) => p.hit).sort((a, b) => b.hit!.time - a.hit!.time), [st.pairs]);
  const events = useMemo(() => [...st.events].sort((a, b) => b.time - a.time), [st.events]);
  const deact = events.filter((e) => e.kind === 'DEACTIVATED' || e.kind === 'TRADE_CLOSED');
  const readyEv = events.filter((e) => e.kind === 'READY' || e.kind === 'ACTIVATED');
  if (st.status === 'not_configured') return <LevelAlertsPanel dense onOpen={onOpen} />;
  const SUBS: [Sub, string, number][] = [['UPCOMING', 'Upcoming', upcoming.length], ['READY', 'Ready', ready.length], ['DEACTIVATED', 'Deactivated', deact.length], ['LOG', 'Log', events.length]];
  return (
    <div className="space-y-2.5" data-testid="trade-board">
      <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 ${muted ? 'border-rose-500/40 bg-rose-500/[0.07]' : 'border-emerald-500/30 bg-emerald-500/[0.05]'}`}>
        <Crosshair className="w-4 h-4 text-amber-300 shrink-0" />
        <div className="min-w-0 text-[11px] text-slate-300"><b className="text-slate-100">Trade setups</b> · long-term bullish pairs at their buy level, bearish pairs at their sell level (H1){st.updatedAt ? ` · checked ${levelTime(st.updatedAt)} PKT` : ''}</div>
        <button type="button" data-testid="trade-mute" onClick={() => setLevelSettings({ muted: !muted })} title={muted ? 'Trade alerts are muted — tap to turn them on' : 'Tap to mute all trade-setup alerts'}
          className={`ml-auto shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[10.5px] font-bold cursor-pointer ${muted ? 'border-rose-400/60 text-rose-100 bg-rose-500/15' : 'border-emerald-400/50 text-emerald-100 bg-emerald-500/10'}`}>
          {muted ? <><BellOff className="w-3 h-3" />Muted</> : <><BellRing className="w-3 h-3" />Alerts on</>}
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto" role="tablist">
        {SUBS.map(([id, l, n]) => (
          <button key={id} type="button" role="tab" aria-selected={sub === id} data-testid={`trade-sub-${id}`} onClick={() => setSub(id)}
            className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer ${sub === id ? 'border-amber-400/60 bg-amber-500/20 text-amber-100' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{l}{n ? ` · ${n}` : ''}</button>
        ))}
      </div>
      {st.marketOpen === false && <div className="text-[11px] text-slate-300 rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-1.5">Forex and metals are closed for the weekend — levels resume when the market opens.</div>}
      {sub === 'UPCOMING' && (<>
        <div className="text-[10.5px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Being tracked now — price has not reached the zone yet. Closest first. You are alerted when price gets near and when it enters.</div>
        {upcoming.map((p) => <UpcomingRow key={p.symbol} p={p} onOpen={onOpen} />)}
        {!upcoming.length && <div className="text-[12px] text-slate-500 py-4 text-center">{st.status === 'ready' ? 'No upcoming setup right now.' : 'Checking the top pairs…'}</div>}
      </>)}
      {sub === 'READY' && (<>
        <div className="text-[10.5px] text-slate-500">Price has reached the Level 1 / Level 2 zone — ready for execution (entry on the next H1 open).</div>
        <LevelAlertsPanelHits onOpen={onOpen} ready={ready} />
        {readyEv.slice(0, 10).map((e) => <EventRow key={e.id} e={e} onOpen={onOpen} />)}
        {!ready.length && !readyEv.length && <div className="text-[12px] text-slate-500 py-4 text-center">No setup is at its level right now. You will be alerted the moment one gets there.</div>}
      </>)}
      {sub === 'DEACTIVATED' && (<>
        <div className="text-[10.5px] text-slate-500 flex items-center gap-1"><XCircle className="w-3 h-3" />Setups that were cancelled or invalidated, and trades that have closed.</div>
        {deact.slice(0, 30).map((e) => <EventRow key={e.id} e={e} onOpen={onOpen} />)}
        {!deact.length && <div className="text-[12px] text-slate-500 py-4 text-center">Nothing deactivated yet.</div>}
      </>)}
      {sub === 'LOG' && (<>
        {events.slice(0, 40).map((e) => <EventRow key={e.id} e={e} onOpen={onOpen} />)}
        {!events.length && <div className="text-[12px] text-slate-500 py-4 text-center">No events yet.</div>}
      </>)}
    </div>
  );
};

/** Compact cards for pairs whose level was reached on the last closed H1 candle. */
const LevelAlertsPanelHits: React.FC<{ ready: PairScan[]; onOpen: (s: string) => void }> = ({ ready, onOpen }) => (
  <>{ready.map((p) => {
    const h = p.hit!; const up = p.side > 0;
    return (
      <button key={p.symbol} type="button" data-testid="trade-ready" onClick={() => onOpen(p.symbol)} className={`w-full text-left rounded-xl border-2 p-2.5 cursor-pointer ${up ? 'border-emerald-400/60 bg-emerald-950/60' : 'border-rose-400/60 bg-rose-950/60'}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded-md text-[12px] font-black ${up ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950'}`}>{up ? 'BUY' : 'SELL'}</span>
          <span className="text-[15px] font-extrabold text-white">{p.display}</span>
          <span className="text-[11px] font-bold text-amber-200">Level {h.level} reached</span>
          <span className="ml-auto text-[10px] text-slate-400">{ago(h.time + 3_600_000)}</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-200">H1 close {fmtPrice(h.price)} · zone {fmtPrice(h.zoneBottom)} – {fmtPrice(h.zoneTop)}{h.models.length ? ` · ${h.models.join(' + ')}` : ''}</div>
        {Number.isFinite(h.stop) && Number.isFinite(h.target) && <div className="text-[11px] font-semibold text-white">Stop {fmtPrice(h.stop)} · take profit 1:2 {fmtPrice(h.target)}</div>}
      </button>
    );
  })}</>
);
