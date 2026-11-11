import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Crosshair, RefreshCw } from 'lucide-react';
import { EDGE_PIPS, enableLevelAlerts, fmtPrice, getLevelSettings, levelTime, pairLevel, setLevelSettings, testLevelAlert, useLevelAlerts, type LevelAlert, type LevelState, type PairScan } from '../../services/sbtSetups';
import { BellRing, Mic, MicOff, Volume2, VolumeX, X as XIcon } from 'lucide-react';
import { SOUNDS } from '../../utils/alertSounds';

const ago = (t: number) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`; };

/** Small "level reached" tag for a pair row; renders nothing when there is no aligned level touch. */
export const LevelBadge: React.FC<{ symbol: string; state?: LevelState; compact?: boolean }> = ({ symbol, state, compact }) => {
  const own = useLevelAlerts();
  const p = pairLevel(state || own, symbol);
  if (!p?.hit) return null;
  const up = p.side > 0;
  return (
    <span title={`${up ? 'Buy' : 'Sell'} Level ${p.hit.level} reached on H1 · close ${fmtPrice(p.hit.price)} · ${levelTime(p.hit.time + 3_600_000)} PKT`}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wide border animate-pulse ${up ? 'bg-emerald-400/20 border-emerald-300/70 text-emerald-100' : 'bg-rose-400/20 border-rose-300/70 text-rose-100'}`}>
      {up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}{up ? 'BUY' : 'SELL'} L{p.hit.level}{compact ? '' : ' reached'}
    </span>
  );
};

const HitRow: React.FC<{ p: PairScan; onOpen: (s: string) => void }> = ({ p, onOpen }) => {
  const h = p.hit!; const up = p.side > 0;
  const side = up ? 'BUY' : 'SELL';
  return (
    <button type="button" onClick={() => onOpen(p.symbol)} data-testid="level-hit" aria-label={`${side} ${p.display}: ${up ? 'buy' : 'sell'} level ${h.level} reached on the 1-hour chart. Open chart.`}
      className={`w-full text-left rounded-xl border-l-4 border p-3 cursor-pointer transition hover:-translate-y-px ${up ? 'border-emerald-400/50 border-l-emerald-400 bg-gradient-to-r from-emerald-500/[0.14] to-transparent hover:border-emerald-300' : 'border-rose-400/50 border-l-rose-400 bg-gradient-to-r from-rose-500/[0.14] to-transparent hover:border-rose-300'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-black tracking-wide ${up ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950'}`}>
          {up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}{side}
        </span>
        <span className="text-[15px] font-extrabold text-white tracking-wide">{p.display}</span>
        <span className="text-[11px] font-bold text-amber-200">Level {h.level} reached · H1 candle just closed</span>
        <span className="ml-auto text-[10px] text-slate-400">{ago(h.time + 3_600_000)}</span>
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[10.5px]">
        <div className="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1"><div className="text-slate-500 uppercase tracking-wider text-[9px]">H1 close</div><div className="font-mono-code font-bold text-slate-50">{fmtPrice(h.price)}</div></div>
        <div className="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1"><div className="text-slate-500 uppercase tracking-wider text-[9px]">{side.toLowerCase()} zone</div><div className="font-mono-code text-slate-200">{fmtPrice(h.zoneBottom)} – {fmtPrice(h.zoneTop)}</div></div>
        <div className="rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1"><div className="text-slate-500 uppercase tracking-wider text-[9px]">Model</div><div className="font-semibold text-cyan-200 truncate">{h.models.length ? h.models.join(' + ') : `Level ${h.level}`}</div></div>
      </div>
      {typeof h.depthPips === 'number' && (
        <div className={`mt-1.5 text-[11px] font-semibold ${h.depthPips < EDGE_PIPS ? 'text-amber-200' : 'text-slate-300'}`}>
          {h.depthPips < EDGE_PIPS
            ? `⚠ Edge touch: the wick entered the zone by only ${h.depthPips} pip${h.depthPips === 1 ? '' : 's'} — on your broker's chart it may not have touched.`
            : `Wick reached ${h.depthPips} pips into the ${up ? 'buy' : 'sell'} zone.`}
          {Number.isFinite(p.lastClose) ? <span className="text-slate-400 font-normal"> · price now {fmtPrice(p.lastClose as number)}</span> : null}
        </div>
      )}
      <div className="mt-1.5 text-[11px] leading-snug text-slate-300">
        <b className="text-slate-100">Why:</b> {p.display} is a top long-term <b className={up ? 'text-emerald-300' : 'text-rose-300'}>{up ? 'bullish' : 'bearish'}</b> pair (fundamental score {p.score > 0 ? '+' : ''}{p.score.toFixed(0)}), and on the 1-hour chart price has come back to its {up ? 'buy' : 'sell'} Level {h.level} with the model complete. The candle closed {levelTime(h.time + 3_600_000)} PKT.
      </div>
      <div className="mt-1 text-[10px] text-cyan-300 font-semibold">Tap to open the {p.display} chart →</div>
    </button>
  );
};

/** Sound / voice / phone-notification switches for setup alerts. */
const AlertControls: React.FC = () => {
  const cfg = getLevelSettings();
  const [perm, setPerm] = useState<string>(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone);
  const btn = 'inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-bold cursor-pointer transition';
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-testid="level-alert-controls">
      <button type="button" onClick={() => setLevelSettings({ sound: !cfg.sound })} className={`${btn} ${cfg.sound ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/50 bg-rose-500/10 text-rose-200'}`} title="Alarm sound when a setup reaches its level">
        {cfg.sound ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}Sound {cfg.sound ? 'on' : 'off'}
      </button>
      <button type="button" onClick={() => setLevelSettings({ voice: !cfg.voice })} className={`${btn} ${cfg.voice ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-600 bg-slate-900 text-slate-300'}`} title="Read the pair aloud: Buy, G B P, C A D. Level 1 reached.">
        {cfg.voice ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}Voice {cfg.voice ? 'on' : 'off'}
      </button>
      <select value={cfg.soundId} onChange={(e) => setLevelSettings({ soundId: e.target.value as any })} aria-label="Alert sound" className="px-1.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-[10.5px] text-slate-200 cursor-pointer outline-none">
        {SOUNDS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
      <button type="button" data-testid="level-confirmed-only" onClick={() => setLevelSettings({ confirmedOnly: !cfg.confirmedOnly })} className={`${btn} ${cfg.confirmedOnly ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-600 bg-slate-900 text-slate-300'}`}
        title={`On: ring only when the candle's wick went at least ${EDGE_PIPS} pips into the zone. Off: ring for every touch, even a hair-line one.`}>
        {cfg.confirmedOnly ? 'Confirmed touches only' : 'Every touch (incl. edge)'}
      </button>
      {perm !== 'granted' && perm !== 'unsupported' && (
        <button type="button" data-testid="level-enable-notifications" onClick={async () => setPerm(await enableLevelAlerts())} className={`${btn} border-amber-400/60 bg-amber-500/15 text-amber-100 animate-pulse`}>
          <BellRing className="w-3 h-3" />{perm === 'denied' ? 'Notifications blocked — allow in browser settings' : 'Turn on phone / PC notifications'}
        </button>
      )}
      {perm === 'granted' && <span className={`${btn} border-emerald-500/40 text-emerald-200 cursor-default`}><BellRing className="w-3 h-3" />Notifications on</span>}
      <button type="button" data-testid="level-test-alert" onClick={() => { void enableLevelAlerts().then(setPerm); testLevelAlert(); }} className={`${btn} border-cyan-500/50 bg-cyan-500/10 text-cyan-100`}>Test alert</button>
      {ios && !standalone && <span className="text-[10px] text-slate-400 w-full">iPhone: notifications need the app on your Home Screen (Share → Add to Home Screen), then open it from there and tap “Turn on notifications”.</span>}
      {(perm === 'unsupported' || ios) && standalone === false && null}
    </div>
  );
};

/**
 * One clear invitation, on every screen size, to switch on setup notifications — shown until the visitor
 * answers it (allow, or "not now"). The same switches stay available in the Level Alerts panel.
 */
export const LevelAlertEnablePrompt: React.FC = () => {
  const K = 'ppfx_level_alert_prompt_v1';
  const [perm, setPerm] = useState<string>(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const [hidden, setHidden] = useState<boolean>(() => { try { return localStorage.getItem(K) === 'later' && Date.now() - Number(localStorage.getItem(K + '_at') || 0) < 3 * 86_400_000; } catch { return false; } });
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 9000); return () => clearTimeout(t); }, []);
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone);
  const needsInstall = ios && !standalone;
  if (!show || hidden || perm === 'granted' || (perm === 'unsupported' && !needsInstall)) return null;
  const later = () => { try { localStorage.setItem(K, 'later'); localStorage.setItem(K + '_at', String(Date.now())); } catch { /* storage blocked */ } setHidden(true); };
  return (
    <div data-testid="level-enable-prompt" role="dialog" aria-label="Turn on setup alerts"
      className="fixed z-[90] left-3 right-3 sm:left-auto sm:right-4 sm:w-[380px] bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] sm:bottom-6 rounded-2xl border border-amber-400/50 bg-[#0b1020]/97 backdrop-blur-xl shadow-2xl p-4 space-y-2.5 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-orange-500 flex items-center justify-center text-slate-950 shrink-0"><BellRing className="w-5 h-5" /></span>
        <div className="min-w-0">
          <div className="font-black text-white text-[14px]">Get Level 1 / Level 2 alerts</div>
          <div className="text-[12px] text-slate-300 leading-relaxed">A sound, a spoken pair name and a notification the moment a top pair’s H1 candle reaches its buy or sell level.</div>
        </div>
      </div>
      {needsInstall ? (
        <div className="text-[12px] text-amber-100 rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5 leading-relaxed">On iPhone, first add the app to your Home Screen: tap <b>Share</b> → <b>Add to Home Screen</b>, open it from there, then turn alerts on.</div>
      ) : perm === 'denied' ? (
        <div className="text-[12px] text-amber-100 rounded-xl border border-amber-400/30 bg-amber-500/10 p-2.5 leading-relaxed">Notifications are blocked for this site. Open your browser’s site settings (the lock icon next to the address) and set Notifications to <b>Allow</b>.</div>
      ) : null}
      <div className="flex gap-2">
        {!needsInstall && perm !== 'denied' && (
          <button type="button" data-testid="level-prompt-enable" onClick={async () => { const p = await enableLevelAlerts(); setPerm(p); if (p === 'granted') testLevelAlert(); }}
            className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 text-[13px] font-black cursor-pointer">Turn on alerts</button>
        )}
        <button type="button" onClick={later} className="px-3 py-2 rounded-xl border border-slate-700 text-slate-300 text-[12.5px] font-semibold cursor-pointer">Not now</button>
      </div>
      <div className="text-[10.5px] text-slate-500">Alerts arrive while the app is open (a background tab or the installed app is fine).</div>
    </div>
  );
};

/** Big banner shown anywhere in the app the moment a setup reaches its level (stays until closed). */
export const LevelAlertBanner: React.FC<{ onOpen: (engineSymbol: string) => void }> = ({ onOpen }) => {
  const [items, setItems] = useState<LevelAlert[]>([]);
  useEffect(() => {
    const on = (e: Event) => setItems((cur) => [...((e as CustomEvent).detail as LevelAlert[]), ...cur].slice(0, 4));
    window.addEventListener('ppfx:level-alert', on);
    return () => window.removeEventListener('ppfx:level-alert', on);
  }, []);
  if (!items.length) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-[calc(env(safe-area-inset-top,0px)+4rem)] z-[2147482000] w-[min(520px,calc(100vw-1rem))] space-y-2" data-testid="level-alert-banner" role="alert" aria-live="assertive">
      {items.map((a) => {
        const up = a.side > 0;
        return (
          <div key={a.id} className={`relative rounded-2xl border-2 shadow-2xl backdrop-blur-xl p-3 pr-9 ${up ? 'border-emerald-400 bg-emerald-950/90 shadow-emerald-500/30' : 'border-rose-400 bg-rose-950/90 shadow-rose-500/30'}`}>
            <button type="button" onClick={() => setItems((c) => c.filter((x) => x.id !== a.id))} aria-label="Dismiss" className="absolute top-2 right-2 p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"><XIcon className="w-4 h-4" /></button>
            <button type="button" onClick={() => { onOpen(a.symbol); setItems((c) => c.filter((x) => x.id !== a.id)); }} className="w-full text-left cursor-pointer">
              <div className="text-[10px] font-mono-code uppercase tracking-[0.18em] text-amber-200 font-bold">Fundamental setup · key level reached · H1</div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-lg text-[15px] font-black ${up ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-400 text-rose-950'}`}>{up ? 'BUY' : 'SELL'}</span>
                <span className="text-[22px] font-black text-white tracking-wide">{a.display}</span>
                <span className="text-[12px] font-bold text-amber-100">Level {a.level}</span>
              </div>
              <div className="mt-1 text-[11.5px] text-slate-200">H1 close {fmtPrice(a.price)} · zone {fmtPrice(a.zoneBottom)} – {fmtPrice(a.zoneTop)}{a.models.length ? ` · ${a.models.join(' + ')}` : ''}</div>
              {typeof a.depthPips === 'number' && <div className={`text-[11px] font-semibold ${a.depthPips < EDGE_PIPS ? 'text-amber-200' : 'text-slate-300'}`}>{a.depthPips < EDGE_PIPS ? `⚠ Edge touch (${a.depthPips} pips) — check it on your broker's chart` : `Wick ${a.depthPips} pips into the zone`}</div>}
              <div className="text-[11px] text-slate-300">Long-term {up ? 'bullish' : 'bearish'} pair (score {a.score > 0 ? '+' : ''}{a.score.toFixed(0)}) · tap to open the chart</div>
            </button>
          </div>
        );
      })}
    </div>
  );
};

/** "Market at key levels" — which top fundamental pairs have reached their buy / sell level. */
export const LevelAlertsPanel: React.FC<{ onOpen: (engineSymbol: string) => void; dense?: boolean }> = ({ onOpen, dense }) => {
  const st = useLevelAlerts();
  if (st.status === 'not_configured') return null;
  const hits = st.pairs.filter((p) => p.hit).sort((a, b) => (b.hit!.time - a.hit!.time));
  const watching = st.pairs.filter((p) => !p.hit && p.state === 'ok' && p.watching);
  const loading = st.status !== 'ready';
  const pending = st.pairs.filter((p) => p.state === 'loading').length;
  return (
    <div data-testid="level-alerts" className={`rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/[0.07] via-slate-950 to-slate-950 ${dense ? 'p-2.5' : 'p-4'} space-y-2`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Crosshair className="w-4 h-4 text-amber-300" />
        <span className="text-[11px] font-mono-code uppercase tracking-[0.16em] text-amber-200 font-bold">Fundamental setups at key levels</span>
        {hits.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold">{hits.filter((p) => p.side > 0).length} buy · {hits.filter((p) => p.side < 0).length} sell</span>}
        <span className="ml-auto text-[10px] text-slate-500 inline-flex items-center gap-1">{(loading || pending > 0) && <RefreshCw className="w-3 h-3 animate-spin" />}{loading ? 'checking the top pairs…' : pending ? `checking ${pending} more…` : `H1 · checked ${levelTime(st.updatedAt)} PKT`}</span>
      </div>
      <AlertControls />
      {!dense && <div className="text-[11px] text-slate-400">The top long-term bullish pairs are checked for their <b className="text-emerald-300">buy</b> levels and the top bearish pairs for their <b className="text-rose-300">sell</b> levels on the 1-hour chart. A pair is shown as “at the level” only on the H1 candle that has just closed with its wick or body inside the Level 1 / Level 2 zone and the model complete — exactly the strategy’s entry rule.</div>}
      {hits.map((p) => <HitRow key={p.symbol} p={p} onOpen={onOpen} />)}
      {!hits.length && !loading && <div className="text-[11.5px] text-slate-400 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5">No top pair is at its level right now. You will be notified the moment one gets there.</div>}
      {(() => {
        const earlier = st.pairs.filter((p) => p.recent).sort((x, y) => y.recent!.time - x.recent!.time);
        return earlier.length > 0 && (
          <div className="space-y-1" data-testid="level-history">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Earlier touches (last 24 h) — not at the level now unless marked</div>
            {earlier.map((p) => {
              const r = p.recent!; const up = p.side > 0;
              return (
                <button key={p.symbol} type="button" onClick={() => onOpen(p.symbol)} className="w-full flex flex-wrap items-center gap-x-2 gap-y-0.5 px-2 py-1 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-600 text-[11px] cursor-pointer text-left">
                  <span className={`px-1.5 rounded font-black text-[10px] ${up ? 'bg-emerald-400/90 text-emerald-950' : 'bg-rose-400/90 text-rose-950'}`}>{up ? 'BUY' : 'SELL'}</span>
                  <span className="font-bold text-slate-100">{p.display}</span>
                  <span className="text-slate-400">L{r.level} touched {levelTime(r.time + 3_600_000)} PKT{typeof r.depthPips === 'number' ? ` · ${r.depthPips} pips deep` : ''}</span>
                  <span className={`ml-auto text-[10px] font-semibold ${p.awayPips === 0 ? 'text-amber-200' : 'text-slate-500'}`}>{p.awayPips === 0 ? 'price still inside the zone' : typeof p.awayPips === 'number' ? `price now ${p.awayPips} pips away` : ''}</span>
                </button>
              );
            })}
          </div>
        );
      })()}
      {watching.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Waiting for price at</span>
          {watching.map((p) => {
            const z = p.level1 || p.level2;
            return (
              <button key={p.symbol} type="button" onClick={() => onOpen(p.symbol)} title={z ? `${p.side > 0 ? 'Buy' : 'Sell'} level ${fmtPrice(z.bottom)} – ${fmtPrice(z.top)}` : ''}
                className={`px-2 py-0.5 rounded-lg border text-[10.5px] font-semibold cursor-pointer ${p.side > 0 ? 'border-emerald-500/30 text-emerald-200 hover:border-emerald-400/70' : 'border-rose-500/30 text-rose-200 hover:border-rose-400/70'}`}>
                {p.side > 0 ? 'Buy' : 'Sell'} {p.display}{z ? <span className="ml-1 font-mono-code text-[9.5px] text-slate-400">@ {fmtPrice(p.side > 0 ? z.top : z.bottom)}</span> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
