import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Copy, Check, Info, ShieldAlert, TrendingUp, TrendingDown, Target, Magnet, Waves, GraduationCap } from 'lucide-react';
import type { TourFacts } from './GexTour';

const GexTour = lazy(() => import('./GexTour'));

interface Row { strike: number; call: number; put: number; net: number; abs: number; callOi: number; putOi: number }
interface Res {
  spot: number; contracts: number; used: number; expiries: { exp: number; dte: number; net: number; abs: number; oi: number }[]; totalNet: number; totalAbs: number; callGex: number; putGex: number;
  rows: Row[]; profile: { spot: number; net: number }[]; callWall: number | null; putWall: number | null; flip: number | null; magnet: number | null; maxPain: number | null;
  pcrOi: number; callOi: number; putOi: number; expectedMove: { pct: number; abs: number; dte: number } | null; nearTermShare: number; regime: 'positive' | 'negative' | 'neutral'; ivAtm: number | null;
}
interface Payload { ok: true; symbol: string; name: string; note: string; group: string; spot: number; spotAt: string; marketOpen: boolean; source: string; model: string; fetchedAt: number; stale?: boolean; usedFallback?: string; sourceNote?: string; convert: { to: string } | null; parts?: { sym: string; spot: number }[]; result: Res; read: { headline: string; bias: string; lines: string[] } }
interface SymInfo { sym: string; name: string; group?: string; feed?: string; native?: boolean; note: string }

const FALLBACK: SymInfo[] = [{ sym: 'SPX', name: 'S&P 500 index', group: 'Indices', feed: 'SPX', native: true, note: '' }, { sym: 'NDX', name: 'NASDAQ-100 index', group: 'Indices', feed: 'NDX', native: true, note: '' }, { sym: 'GOLD', name: 'Gold (all gold ETFs)', group: 'Gold & Silver', feed: 'XAUUSD', note: '' }];
const GROUPS = ['Indices', 'Gold & Silver', 'ETFs', 'Stocks'];
const money = (n: number) => { const a = Math.abs(n); const s = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}K` : a.toFixed(0); return `${n < 0 ? '-' : ''}$${s}`; };
const px = (n: number | null | undefined) => (n === null || n === undefined ? '—' : Math.abs(n) >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toFixed(2));
const ago = (ms: number) => { const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); return s < 45 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`; };
const REFRESH_OPEN_MS = 2 * 60_000, REFRESH_CLOSED_MS = 15 * 60_000;

const GexRadar: React.FC = () => {
  const [syms, setSyms] = useState<SymInfo[]>(FALLBACK);
  const [sym, setSym] = useState<string>(() => { try { return localStorage.getItem('ppfx_gex_sym') || 'SPX'; } catch { return 'SPX'; } });
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);
  const [live, setLive] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showEdu, setShowEdu] = useState(false);
  const [tour, setTour] = useState(false);
  const [offerTour, setOfferTour] = useState(() => { try { return !localStorage.getItem('ppfx_gex_tour_seen'); } catch { return false; } });
  const [, tick] = useState(0);
  const req = useRef(0); const abort = useRef<AbortController | null>(null); const factorFor = useRef<{ at: number; f: number } | null>(null); const fails = useRef(0); const retry = useRef<number | undefined>(undefined);

  useEffect(() => { fetch('/api/gex/symbols', { cache: 'no-cache' }).then((r) => r.json()).then((j) => { if (j?.ok && Array.isArray(j.symbols)) setSyms(j.symbols); }).catch(() => {}); }, []);

  const load = useCallback(async (fresh = false) => {
    const id = ++req.current; abort.current?.abort(); const ac = new AbortController(); abort.current = ac; window.clearTimeout(retry.current);
    setBusy(true);
    try {
      const r = await fetch(`/api/gex/${sym}${fresh ? '?fresh=1' : ''}`, { signal: ac.signal }); const j = await r.json().catch(() => null);
      if (id !== req.current) return; // an older request must never overwrite a newer one
      if (!j?.ok) throw new Error(j?.error || 'The options source did not answer.');
      fails.current = 0; setErr(''); setData(j as Payload);
    } catch (e: any) {
      if (id !== req.current || e?.name === 'AbortError') return;
      fails.current++; setErr(String(e?.message || 'Network problem.').slice(0, 160));
      if (fails.current <= 4) retry.current = window.setTimeout(() => load(), Math.min(60_000, 8_000 * 2 ** (fails.current - 1))); // 8s, 16s, 32s, 60s
    } finally { if (id === req.current) setBusy(false); }
  }, [sym]);

  useEffect(() => { fails.current = 0; setData((d) => (d && d.symbol === sym ? d : null)); load(); try { localStorage.setItem('ppfx_gex_sym', sym); } catch { /* ignore */ } return () => { abort.current?.abort(); window.clearTimeout(retry.current); }; }, [load, sym]);

  // keep the numbers current: re-check every 30 s, reload when the reading is older than its allowed age, and as soon as the tab comes back
  useEffect(() => {
    const check = () => { if (document.hidden) return; tick((n) => n + 1); const d = dataRef.current; if (!d) return; const age = Date.now() - d.fetchedAt; if (age > (d.marketOpen ? REFRESH_OPEN_MS : REFRESH_CLOSED_MS) && !busyRef.current) load(); };
    const t = window.setInterval(check, 30_000); document.addEventListener('visibilitychange', check); window.addEventListener('online', check);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', check); window.removeEventListener('online', check); };
  }, [load]);
  const dataRef = useRef<Payload | null>(null); dataRef.current = data; const busyRef = useRef(false); busyRef.current = busy;

  // live price from the app's own feed (every 20 s); levels that need converting keep the factor measured when the reading arrived
  const info = syms.find((s) => s.sym === sym); const feed = data?.convert?.to || (info?.native ? info.feed : undefined);
  useEffect(() => {
    setLive(null); if (!feed) return; let off = false;
    const get = () => { if (document.hidden) return; fetch(`/api/charts/price?symbol=${feed}`).then((r) => r.json()).then((j) => { if (!off && j?.ok && Number(j.price) > 0) setLive(Number(j.price)); }).catch(() => {}); };
    get(); const t = window.setInterval(get, 20_000); return () => { off = true; window.clearInterval(t); };
  }, [feed]);
  const factor = useMemo(() => {
    if (!data) return null; if (!data.convert) return 1; if (!live) return factorFor.current && factorFor.current.at === data.fetchedAt ? factorFor.current.f : null;
    if (!factorFor.current || factorFor.current.at !== data.fetchedAt) factorFor.current = { at: data.fetchedAt, f: live / data.spot };
    return factorFor.current.f;
  }, [data, live]);
  const conv = (v: number | null) => (v === null || !factor ? null : v * factor);
  const unit = data?.convert?.to || (info?.native ? info.feed : '') || data?.symbol || '';
  const g = data && data.symbol === sym ? data.result : null; const d = g ? data : null;
  const age = d ? Date.now() - d.fetchedAt : 0; const stale = !!d && (d.stale || age > (d.marketOpen ? 6 : 40) * 60_000);
  const livePx = d ? (d.convert ? live : (live ?? d.spot)) : null;

  const levels = useMemo(() => {
    if (!g) return [];
    return [
      { key: 'cw', label: 'Call Wall', v: g.callWall, tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', icon: <TrendingUp className="w-4 h-4" />, tip: 'Most call gamma above price. Rallies often slow here.' },
      { key: 'fl', label: 'Gamma Flip', v: g.flip, tone: 'text-amber-300 border-amber-500/40 bg-amber-500/10', icon: <Waves className="w-4 h-4" />, tip: 'Line between calm (above) and wild (below) market.' },
      { key: 'mg', label: 'Gamma Magnet', v: g.magnet, tone: 'text-sky-300 border-sky-500/40 bg-sky-500/10', icon: <Magnet className="w-4 h-4" />, tip: 'Largest gamma strike; price gravitates to it.' },
      { key: 'pw', label: 'Put Wall', v: g.putWall, tone: 'text-rose-300 border-rose-500/40 bg-rose-500/10', icon: <TrendingDown className="w-4 h-4" />, tip: 'Most put gamma below price. Dips often find buyers here.' },
      { key: 'mp', label: 'Max Pain', v: g.maxPain, tone: 'text-violet-300 border-violet-500/40 bg-violet-500/10', icon: <Target className="w-4 h-4" />, tip: 'Strike where option holders lose most at expiry.' },
    ];
  }, [g]);

  // everything in market units (index points / XAUUSD) when a conversion exists
  const shown = (v: number | null) => (d?.convert ? conv(v) : v);
  const ladder = useMemo(() => {
    if (!g || !d) return [] as { label: string; v: number; kind: 'level' | 'price'; tone: string }[];
    const L = levels.filter((l) => l.v !== null && shown(l.v) !== null).map((l) => ({ label: l.label, v: shown(l.v) as number, kind: 'level' as const, tone: l.tone.split(' ')[0] }));
    const p = d.convert ? live : (live ?? d.spot); if (p) L.push({ label: 'LIVE PRICE', v: p, kind: 'price' as const, tone: 'text-white' });
    return L.sort((a, b) => b.v - a.v);
  }, [g, d, levels, live, factor]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyLevels = () => {
    if (!g || !d) return; const lines = [`GEX ${d.name} — ${new Date(d.fetchedAt).toLocaleString()} (delayed ~15 min)`, `Regime: ${g.regime} gamma`];
    for (const l of levels) { if (l.v === null) continue; const c = shown(l.v); lines.push(`${l.label}: ${px(c ?? l.v)}${d.convert && !c ? ` (${d.symbol} ${px(l.v)}, waiting for live price)` : ''}`); }
    navigator.clipboard?.writeText(lines.join('\n')).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };
  const openTour = () => { setTour(true); setOfferTour(false); try { localStorage.setItem('ppfx_gex_tour_seen', '1'); } catch { /* ignore */ } };

  const facts: TourFacts | null = g && d ? { symbol: d.symbol, unit, regime: g.regime, flip: px(shown(g.flip)), callWall: px(shown(g.callWall)), putWall: px(shown(g.putWall)), magnet: px(shown(g.magnet)), price: px(livePx ?? d.spot), priceVsFlip: g.flip === null || !livePx || !shown(g.flip) ? 'unknown' : livePx >= (shown(g.flip) as number) ? 'above' : 'below' } : null;
  const regimeStyle = g?.regime === 'positive' ? { c: 'text-emerald-300', b: 'border-emerald-500/50 from-emerald-500/15', t: 'POSITIVE GAMMA' } : g?.regime === 'negative' ? { c: 'text-rose-300', b: 'border-rose-500/50 from-rose-500/15', t: 'NEGATIVE GAMMA' } : { c: 'text-amber-300', b: 'border-amber-500/50 from-amber-500/15', t: 'NEUTRAL GAMMA' };
  const grouped = GROUPS.map((gr) => ({ gr, list: syms.filter((s) => (s.group || 'ETFs') === gr) })).filter((x) => x.list.length);

  return (
    <div className="space-y-5" data-testid="gex-radar">
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-military font-bold text-lg text-white tracking-wide">GEX RADAR <span className="text-slate-500 font-normal text-sm">· dealer gamma exposure</span></h2>
            <p className="text-xs text-slate-400 mt-0.5">Built from the real options chain. Free, about 15 minutes delayed, refreshed automatically.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {d && <span className={`text-[10px] font-mono-code px-2 py-1 rounded border ${stale ? 'text-amber-300 border-amber-500/40' : d.marketOpen ? 'text-emerald-300 border-emerald-500/40' : 'text-slate-400 border-slate-700'}`}>{stale ? 'STALE · ' : d.marketOpen ? '● LIVE · ' : 'MARKET CLOSED · last session · '}updated {ago(d.fetchedAt)}</span>}
            <button type="button" onClick={openTour} data-testid="gex-tour-btn" className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/30"><GraduationCap className="w-4 h-4" />Take the tour</button>
            <button type="button" onClick={copyLevels} disabled={!g} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:border-cyan-500/60 disabled:opacity-40">{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy levels'}</button>
            <button type="button" onClick={() => load(true)} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:border-cyan-500/60"><RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button>
          </div>
        </div>
        {offerTour && !tour && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3">
            <div className="text-sm text-cyan-100"><b>New here?</b> A 60-second tour (English or اردو) explains what GEX is and how to use it, using today's real numbers.</div>
            <div className="flex gap-2"><button type="button" onClick={openTour} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950">Start the tour</button><button type="button" onClick={() => { setOfferTour(false); try { localStorage.setItem('ppfx_gex_tour_seen', '1'); } catch { /* ignore */ } }} className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300">Not now</button></div>
          </div>
        )}
        <div className="mt-3 space-y-2" role="tablist" aria-label="GEX markets">
          {grouped.map(({ gr, list }) => (
            <div key={gr} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 w-24 shrink-0">{gr}</span>
              {list.map((s) => (
                <button key={s.sym} type="button" role="tab" aria-selected={sym === s.sym} onClick={() => setSym(s.sym)} title={s.note}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${sym === s.sym ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-slate-500'}`}>{s.name}</button>
              ))}
            </div>
          ))}
        </div>
        {info?.note && <p className="mt-2 text-[11px] text-slate-400">{d?.note || info.note}</p>}
      </div>

      {err && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 flex gap-3" role="status"><ShieldAlert className="w-5 h-5 shrink-0" />
          <div>{g ? <><b>Could not refresh.</b> Showing the last real reading from {ago(d!.fetchedAt)}. Retrying automatically.</> : <><b>No data shown.</b> {err} Retrying automatically.</>}
            <div className="text-xs text-amber-300/80 mt-1">Nothing is estimated or filled in when the live source is unavailable.</div></div></div>
      )}
      {!g && !err && <div className="h-64 rounded-3xl border border-slate-800 bg-slate-900/40 animate-pulse" aria-busy="true" />}

      {d && g && factors(d)}
      {d && g && (
        <>
          <div data-gex="regime" className={`rounded-3xl border bg-gradient-to-br to-transparent p-5 ${regimeStyle.b}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={`text-[11px] font-mono-code font-bold tracking-widest ${regimeStyle.c}`}>{regimeStyle.t} · {d.read.bias.toUpperCase()}</div>
                <p className="text-white text-base sm:text-lg font-semibold mt-1 max-w-3xl">{d.read.headline}</p>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400">{d.convert || info?.native ? `${unit} live` : `${d.symbol} price`}</div>
                <div className="text-2xl font-bold text-white font-mono-code">{px(livePx ?? d.spot)}</div>
                {d.convert && <div className="text-[11px] text-slate-400 font-mono-code">{d.symbol} {px(d.spot)} · delayed</div>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Net gamma (per 1% move)" value={money(g.totalNet)} tone={g.totalNet >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
              <Stat label="Put / Call open interest" value={g.pcrOi.toFixed(2)} />
              <Stat label={g.expectedMove ? `Implied move · ${g.expectedMove.dte}d` : 'Implied move'} value={g.expectedMove ? `±${(g.expectedMove.pct * 100).toFixed(2)}%` : '—'} />
              <Stat label="Gamma expiring ≤ 2 days" value={`${Math.round(g.nearTermShare * 100)}%`} />
            </div>
          </div>

          <div data-gex="levels" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {levels.map((l) => { const c = shown(l.v); const base = livePx ?? d.spot; return (
              <div key={l.key} title={l.tip} className={`rounded-2xl border p-3.5 ${l.tone}`}>
                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase">{l.icon}{l.label}</div>
                <div className="mt-1.5 text-xl font-bold font-mono-code text-white">{px(c ?? (d.convert ? null : l.v))}</div>
                {d.convert && <div className="text-[11px] font-mono-code opacity-80">{c ? unit : 'waiting for live price…'}{c && l.v !== null ? ` · ${d.symbol} ${px(l.v)}` : ''}</div>}
                <div className="text-[10px] mt-1 opacity-70 leading-snug">{c !== null && c !== undefined && base ? `${(c / base - 1) * 100 >= 0 ? '+' : ''}${((c / base - 1) * 100).toFixed(2)}% from live price` : l.v === null ? 'not defined' : ''}</div>
              </div>); })}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div data-gex="profile"><Panel title="Gamma profile" sub="Net dealer gamma if price moved to each level. Above zero: moves are dampened. Below zero: moves are amplified."><ProfileChart g={g} px2={(v) => px(shown(v))} /></Panel></div>
            <div data-gex="strikes"><Panel title="Gamma by strike" sub="Green: call gamma (right). Red: put gamma (left). Tall bars are the walls."><StrikeChart g={g} px2={(v) => px(shown(v))} /></Panel></div>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Panel title="How to read it now" className="lg:col-span-2">
              <ul className="space-y-2 text-sm text-slate-200">{d.read.lines.map((l, i) => <li key={i} className="flex gap-2"><span className="text-cyan-400">▸</span><span>{convertLine(l, d, shown)}</span></li>)}</ul>
              <div className="mt-4 grid sm:grid-cols-3 gap-2 text-xs">
                <Scn t="Price runs into the Call Wall" b={`Watch for a stall or rejection near ${px(shown(g.callWall))}. Only a close through it with momentum suggests acceleration.`} />
                <Scn t="Price falls below the Gamma Flip" b={`Below ${px(shown(g.flip))} hedging can add to selling. Expect larger candles and faster moves.`} />
                <Scn t="Price reaches the Put Wall" b={`Near ${px(shown(g.putWall))} look for buyers stepping in, or a clean break that can run.`} />
              </div>
            </Panel>
            <div data-gex="ladder">
              <Panel title="Live level ladder" sub={livePx ? `Live price in ${unit || 'market'} terms between your levels` : 'Waiting for the live price'}>
                <ol className="space-y-1">{ladder.map((x, i) => (
                  <li key={`${x.label}-${i}`} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-mono-code ${x.kind === 'price' ? 'bg-white/10 border border-white/40 text-white font-bold' : 'bg-slate-900/60 border border-slate-800'}`}>
                    <span className={x.kind === 'price' ? 'text-white' : x.tone}>{x.label}</span><span className="text-white">{px(x.v)}</span></li>))}</ol>
                <p className="text-[10px] text-slate-500 mt-2">Updates every 20 seconds from the app's live price while this page is open.</p>
              </Panel>
            </div>
          </div>

          <Panel title="Gamma by expiry" sub="Where the exposure expires">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">{g.expiries.slice(0, 12).map((e) => { const m = Math.max(...g.expiries.map((x) => x.abs)) || 1; return (
              <div key={e.exp} className="text-[11px]"><div className="flex justify-between text-slate-300"><span>{new Date(e.exp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {e.dte}d</span><span className={e.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{money(e.net)}</span></div>
                <div className="h-1.5 rounded bg-slate-800 overflow-hidden"><div className={`h-full ${e.net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.max(3, (e.abs / m) * 100)}%` }} /></div></div>); })}</div>
          </Panel>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-bold"><Info className="w-4 h-4 text-cyan-400" />Read this before trading it</div>
            <p>Data: {d.source}{d.parts ? ` (${d.parts.map((p) => `${p.sym} ${px(p.spot)}`).join(', ')})` : ''}. Computed {new Date(d.fetchedAt).toLocaleTimeString()}{d.stale ? ' — source is not answering, showing the last good reading' : ''}. {g.used.toLocaleString()} priced contracts used.</p>
            <p>Model: {d.model}. Open interest does not say who holds which side, so call/put gamma signs follow the standard dealer assumption (dealers long calls, short puts). These are estimates of hedging pressure, not dealer inventory.</p>
            <p>Forex: spot FX has no single options book, so GEX on EURUSD or GBPUSD does not exist. Gold uses the gold ETF options (GLD and IAU together in the Gold view), converted to XAUUSD with the live price; the conversion can differ from your broker by a few dollars. COMEX gold futures options are not published free anywhere, so ETF options are the best free view. Index views use the real SPX / NDX / RUT options.</p>
            <button type="button" onClick={() => setShowEdu((v) => !v)} className="text-cyan-300 hover:underline pt-1">{showEdu ? 'Hide' : 'Show'} the 60-second GEX guide</button>
            {showEdu && <Guide />}
          </div>
        </>
      )}
      {tour && facts && <Suspense fallback={null}><GexTour facts={facts} onClose={() => setTour(false)} /></Suspense>}
      {tour && !facts && <div className="fixed bottom-4 inset-x-4 mx-auto max-w-sm z-[90] rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-4 text-sm text-slate-200">Loading today's numbers for the tour… <button type="button" onClick={() => setTour(false)} className="ml-2 text-cyan-300 underline">close</button></div>}
    </div>
  );
};

/** Says nothing; exists so a fallback-sourced reading is announced right under the header. */
function factors(d: Payload) { return d.usedFallback ? <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-xs text-sky-200">The index options source did not answer just now, so this view uses {d.usedFallback}, which tracks the same market. It switches back automatically.{d.sourceNote ? <span className="block text-sky-300/60 mt-0.5">Why: {d.sourceNote}</span> : null}</div> : null; }

/** The server writes levels in the chain's own units; convert the numbers inside a sentence to market units when needed. */
function convertLine(line: string, d: Payload, shown: (v: number | null) => number | null): string {
  if (!d.convert) return line;
  const r = d.result; const map: [number | null, string][] = [[r.flip, 'Gamma flip'], [r.callWall, 'Call wall'], [r.putWall, 'Put wall'], [r.magnet, 'Biggest gamma strike']];
  for (const [v, label] of map) { if (v === null) continue; const c = shown(v); if (!c) continue; const old = v >= 1000 ? v.toFixed(0) : v.toFixed(2); line = line.replace(new RegExp(`^(${label}) ${old.replace('.', '\\.')}`), `$1 ${px(c)}`); }
  return line;
}

const Stat: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
  <div className="rounded-xl bg-slate-950/50 border border-slate-800 p-3"><div className="text-[10px] text-slate-400 leading-tight">{label}</div><div className={`text-lg font-bold font-mono-code ${tone || 'text-white'}`}>{value}</div></div>
);
const Panel: React.FC<{ title: string; sub?: string; className?: string; children: React.ReactNode }> = ({ title, sub, className = '', children }) => (
  <div className={`rounded-3xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 ${className}`}><div className="mb-3"><h3 className="font-military font-bold text-sm text-white tracking-wide">{title}</h3>{sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}</div>{children}</div>
);
const Scn: React.FC<{ t: string; b: string }> = ({ t, b }) => (<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"><div className="font-bold text-slate-100">{t}</div><div className="text-slate-400 mt-1 leading-snug">{b}</div></div>);

const Guide: React.FC = () => (
  <div className="pt-2 space-y-2 text-slate-300 leading-relaxed">
    <p><b className="text-white">Gamma</b> is how fast an option's delta changes as price moves. Dealers who sell options hedge by trading the underlying, and that hedging depends on gamma.</p>
    <p><b className="text-emerald-300">Positive gamma:</b> dealers sell rallies and buy dips, so volatility falls and price tends to stay in a range. <b className="text-rose-300">Negative gamma:</b> they sell falls and buy rises, so moves feed on themselves.</p>
    <p><b className="text-amber-300">Gamma flip</b> is the price where the total changes sign. <b className="text-white">Walls</b> are strikes with the most call or put gamma: places price may react, never guaranteed support or resistance.</p>
    <p>Best use: take the regime and levels as context, then wait for your own confirmation (liquidity sweep, market-structure shift, retest) before any entry, with a defined stop.</p>
  </div>
);

function ProfileChart({ g, px2 }: { g: Res; px2: (v: number | null) => string }) {
  const W = 560, H = 230, P = { l: 52, r: 12, t: 12, b: 26 };
  const xs = g.profile.map((p) => p.spot); const ys = g.profile.map((p) => p.net);
  const x0 = xs[0], x1 = xs[xs.length - 1]; const ym = Math.max(...ys.map(Math.abs)) || 1;
  const X = (v: number) => P.l + ((v - x0) / (x1 - x0)) * (W - P.l - P.r); const Y = (v: number) => P.t + (1 - (v / ym + 1) / 2) * (H - P.t - P.b);
  const path = g.profile.map((p, i) => `${i ? 'L' : 'M'}${X(p.spot).toFixed(1)},${Y(p.net).toFixed(1)}`).join('');
  const area = `${path}L${X(x1)},${Y(0)}L${X(x0)},${Y(0)}Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Net gamma by price">
      <defs><clipPath id="gx-up"><rect x="0" y="0" width={W} height={Y(0)} /></clipPath><clipPath id="gx-dn"><rect x="0" y={Y(0)} width={W} height={H} /></clipPath></defs>
      <path d={area} fill="rgba(16,185,129,.25)" clipPath="url(#gx-up)" /><path d={area} fill="rgba(244,63,94,.25)" clipPath="url(#gx-dn)" />
      <line x1={P.l} x2={W - P.r} y1={Y(0)} y2={Y(0)} stroke="#475569" strokeDasharray="3 3" />
      <path d={path} fill="none" stroke="#22d3ee" strokeWidth="2" />
      {[-1, -0.5, 0.5, 1].map((f) => <text key={f} x={P.l - 6} y={Y(f * ym) + 3} textAnchor="end" fontSize="9" fill="#64748b">{money(f * ym)}</text>)}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => { const v = x0 + (x1 - x0) * f; return <text key={f} x={X(v)} y={H - 8} textAnchor="middle" fontSize="9" fill="#64748b">{px2(v)}</text>; })}
      <line x1={X(g.spot)} x2={X(g.spot)} y1={P.t} y2={H - P.b} stroke="#fff" strokeWidth="1.2" /><text x={X(g.spot)} y={P.t + 8} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">PRICE</text>
      {g.flip !== null && g.flip > x0 && g.flip < x1 && <><line x1={X(g.flip)} x2={X(g.flip)} y1={P.t} y2={H - P.b} stroke="#fbbf24" strokeDasharray="4 3" /><text x={X(g.flip)} y={H - P.b - 4} textAnchor="middle" fontSize="9" fill="#fbbf24" fontWeight="700">FLIP</text></>}
    </svg>
  );
}

function StrikeChart({ g, px2 }: { g: Res; px2: (v: number | null) => string }) {
  const lo = g.spot * 0.93, hi = g.spot * 1.07; const rows = g.rows.filter((r) => r.strike >= lo && r.strike <= hi);
  if (!rows.length) return <div className="text-xs text-slate-500">No strikes in range.</div>;
  const steps = rows.slice(1).map((r, i) => r.strike - rows[i].strike).filter((d) => d > 0); const base = steps.length ? Math.min(...steps) : 1;
  const width = Math.max(base, Math.ceil((hi - lo) / 34 / base) * base); const bins = new Map<number, { s: number; call: number; put: number }>();
  for (const r of rows) { const k = Math.round(r.strike / width) * width; const b = bins.get(k) || { s: k, call: 0, put: 0 }; b.call += r.call; b.put += r.put; bins.set(k, b); }
  const list = [...bins.values()].sort((a, b) => b.s - a.s); const m = Math.max(...list.map((b) => Math.max(b.call, -b.put))) || 1;
  const nearest = list.reduce((a, b) => (Math.abs(b.s - g.spot) < Math.abs(a.s - g.spot) ? b : a));
  const mark = (s: number) => [g.callWall, g.putWall, g.flip].some((w) => w !== null && Math.abs(w - s) < width / 2 + 1e-9);
  return (
    <div className="max-h-[300px] overflow-y-auto pr-1" aria-label="Gamma by strike">
      {list.map((b) => (
        <div key={b.s} className={`flex items-center gap-1 h-[14px] ${b === nearest ? 'bg-white/10 rounded' : ''}`}>
          <div className="w-1/2 flex justify-end"><div className="h-2.5 rounded-l bg-rose-500/80" style={{ width: `${(-b.put / m) * 100}%` }} /></div>
          <div className={`w-14 shrink-0 text-center text-[9px] font-mono-code ${b === nearest ? 'text-white font-bold' : mark(b.s) ? 'text-amber-300' : 'text-slate-500'}`}>{px2(b.s)}</div>
          <div className="w-1/2"><div className="h-2.5 rounded-r bg-emerald-500/80" style={{ width: `${(b.call / m) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export default GexRadar;
