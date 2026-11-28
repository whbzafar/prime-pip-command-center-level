import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Copy, Check, Info, ShieldAlert, TrendingUp, TrendingDown, Target, Magnet, Waves } from 'lucide-react';

interface Row { strike: number; call: number; put: number; net: number; abs: number; callOi: number; putOi: number }
interface Res {
  spot: number; contracts: number; used: number; expiries: { exp: number; dte: number; net: number; abs: number; oi: number }[]; totalNet: number; totalAbs: number; callGex: number; putGex: number;
  rows: Row[]; profile: { spot: number; net: number }[]; callWall: number | null; putWall: number | null; flip: number | null; magnet: number | null; maxPain: number | null;
  pcrOi: number; callOi: number; putOi: number; expectedMove: { pct: number; abs: number; dte: number } | null; nearTermShare: number; regime: 'positive' | 'negative' | 'neutral'; ivAtm: number | null;
}
interface Payload { ok: true; symbol: string; name: string; note: string; spot: number; spotAt: string; marketOpen: boolean; source: string; model: string; fetchedAt: number; stale?: boolean; convert: { to: string; factor: number | null; price: number | null; via: string } | null; result: Res; read: { headline: string; bias: string; lines: string[] } }
interface SymInfo { sym: string; name: string; tracks?: string; ref?: string; note: string }

const FALLBACK: SymInfo[] = [{ sym: 'SPY', name: 'S&P 500 (SPY)', tracks: 'SPX', note: '' }, { sym: 'QQQ', name: 'NASDAQ-100 (QQQ)', tracks: 'NDX', note: '' }, { sym: 'GLD', name: 'Gold (GLD)', tracks: 'XAUUSD', ref: 'XAUUSD', note: '' }];
const money = (n: number) => { const a = Math.abs(n); const s = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(0)}K` : a.toFixed(0); return `${n < 0 ? '-' : ''}$${s}`; };
const px = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n >= 1000 ? n.toLocaleString(undefined, { maximumFractionDigits: 0 }) : n.toFixed(2));

const GexRadar: React.FC = () => {
  const [syms, setSyms] = useState<SymInfo[]>(FALLBACK);
  const [sym, setSym] = useState<string>(() => { try { return localStorage.getItem('ppfx_gex_sym') || 'SPY'; } catch { return 'SPY'; } });
  const [data, setData] = useState<Payload | null>(null);
  const [err, setErr] = useState<string>('');
  const [busy, setBusy] = useState(true);
  const [ref, setRef] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showEdu, setShowEdu] = useState(false);

  useEffect(() => { fetch('/api/gex/symbols').then((r) => r.json()).then((j) => { if (j?.ok && Array.isArray(j.symbols)) setSyms(j.symbols); }).catch(() => {}); }, []);
  const load = useCallback(async (fresh = false) => {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/gex/${sym}${fresh ? '?fresh=1' : ''}`); const j = await r.json();
      if (!j?.ok) { setErr(j?.error || 'The options source did not answer.'); setData(null); } else setData(j as Payload);
    } catch { setErr('Network problem. Check your connection and try again.'); setData(null); }
    setBusy(false);
  }, [sym]);
  useEffect(() => { load(); try { localStorage.setItem('ppfx_gex_sym', sym); } catch { /* ignore */ } }, [load, sym]);
  useEffect(() => { const t = window.setInterval(() => { if (!document.hidden) load(); }, 5 * 60_000); return () => window.clearInterval(t); }, [load]);
  // gold / silver ETFs are converted with the app's own live spot price
  useEffect(() => {
    setRef(null); const to = data?.convert?.to; if (!data?.convert || data.convert.factor !== null || !to) return;
    let off = false; fetch(`/api/charts/price?symbol=${to}`).then((r) => r.json()).then((j) => { if (!off && j?.ok && Number(j.price) > 0) setRef(Number(j.price)); }).catch(() => {}); return () => { off = true; };
  }, [data?.convert?.to, data?.fetchedAt]);

  const factor = useMemo(() => { const c = data?.convert; if (!c) return null; if (c.factor) return c.factor; return ref && data ? ref / data.spot : null; }, [data, ref]);
  const toIdx = (v: number | null) => (v === null || !factor ? null : v * factor);
  const g = data?.result;

  const levels = useMemo(() => {
    if (!g || !data) return [];
    const L: { key: string; label: string; v: number | null; tone: string; icon: React.ReactNode; tip: string }[] = [
      { key: 'cw', label: 'Call Wall', v: g.callWall, tone: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10', icon: <TrendingUp className="w-4 h-4" />, tip: 'Most call gamma. Price often slows here.' },
      { key: 'fl', label: 'Gamma Flip', v: g.flip, tone: 'text-amber-300 border-amber-500/40 bg-amber-500/10', icon: <Waves className="w-4 h-4" />, tip: 'Where dealer gamma turns from positive to negative.' },
      { key: 'mg', label: 'Gamma Magnet', v: g.magnet, tone: 'text-sky-300 border-sky-500/40 bg-sky-500/10', icon: <Magnet className="w-4 h-4" />, tip: 'Largest total gamma strike; price gravitates to it.' },
      { key: 'pw', label: 'Put Wall', v: g.putWall, tone: 'text-rose-300 border-rose-500/40 bg-rose-500/10', icon: <TrendingDown className="w-4 h-4" />, tip: 'Most put gamma. Watch for bounce or breakdown.' },
      { key: 'mp', label: 'Max Pain', v: g.maxPain, tone: 'text-violet-300 border-violet-500/40 bg-violet-500/10', icon: <Target className="w-4 h-4" />, tip: 'Strike where option holders lose most at expiry.' },
    ];
    return L;
  }, [g, data]);

  const copyLevels = () => {
    if (!g || !data) return; const t = data.convert?.to; const lines = [`GEX ${data.symbol} — ${new Date(data.fetchedAt).toLocaleString()} (delayed ~15 min)`, `Regime: ${g.regime} gamma`];
    for (const l of levels) { if (l.v === null) continue; const c = toIdx(l.v); lines.push(`${l.label}: ${px(l.v)}${t && c ? `  ≈ ${t} ${px(c)}` : ''}`); }
    navigator.clipboard?.writeText(lines.join('\n')).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1800); }).catch(() => {});
  };

  const regimeStyle = g?.regime === 'positive' ? { c: 'text-emerald-300', b: 'border-emerald-500/50 from-emerald-500/15', t: 'POSITIVE GAMMA' } : g?.regime === 'negative' ? { c: 'text-rose-300', b: 'border-rose-500/50 from-rose-500/15', t: 'NEGATIVE GAMMA' } : { c: 'text-amber-300', b: 'border-amber-500/50 from-amber-500/15', t: 'NEUTRAL GAMMA' };

  return (
    <div className="space-y-5" data-testid="gex-radar">
      <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-military font-bold text-lg text-white tracking-wide">GEX RADAR <span className="text-slate-500 font-normal text-sm">· dealer gamma exposure</span></h2>
            <p className="text-xs text-slate-400 mt-0.5">Built from the real options chain, not a feed of someone else's levels. Free, about 15 minutes delayed.</p>
          </div>
          <div className="flex items-center gap-2">
            {data && <span className={`text-[10px] font-mono-code px-2 py-1 rounded border ${data.marketOpen ? 'text-emerald-300 border-emerald-500/40' : 'text-slate-400 border-slate-700'}`}>{data.marketOpen ? 'US MARKET OPEN' : 'US MARKET CLOSED · last session'}</span>}
            <button type="button" onClick={copyLevels} disabled={!g} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:border-cyan-500/60 disabled:opacity-40">{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied' : 'Copy levels'}</button>
            <button type="button" onClick={() => load(true)} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 hover:border-cyan-500/60"><RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />Refresh</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="GEX markets">
          {syms.map((s) => (
            <button key={s.sym} type="button" role="tab" aria-selected={sym === s.sym} onClick={() => setSym(s.sym)} title={s.note}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${sym === s.sym ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:border-slate-500'}`}>{s.name}</button>
          ))}
        </div>
      </div>

      {err && <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200 flex gap-3"><ShieldAlert className="w-5 h-5 shrink-0" /><div><b>No data shown.</b> {err}<div className="text-xs text-amber-300/80 mt-1">Nothing is estimated or filled in when the live source is unavailable.</div></div></div>}
      {busy && !data && !err && <div className="h-64 rounded-3xl border border-slate-800 bg-slate-900/40 animate-pulse" />}

      {data && g && (
        <>
          <div className={`rounded-3xl border bg-gradient-to-br to-transparent p-5 ${regimeStyle.b}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className={`text-[11px] font-mono-code font-bold tracking-widest ${regimeStyle.c}`}>{regimeStyle.t} · {data.read.bias.toUpperCase()}</div>
                <p className="text-white text-base sm:text-lg font-semibold mt-1 max-w-3xl">{data.read.headline}</p>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400">{data.symbol} price</div>
                <div className="text-2xl font-bold text-white font-mono-code">{px(data.spot)}</div>
                {data.convert && factor && <div className="text-xs text-cyan-300 font-mono-code">≈ {data.convert.to} {px(data.spot * factor)}</div>}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="Net gamma (per 1% move)" value={money(g.totalNet)} tone={g.totalNet >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
              <Stat label="Put / Call open interest" value={g.pcrOi.toFixed(2)} />
              <Stat label={g.expectedMove ? `Implied move · ${g.expectedMove.dte}d` : 'Implied move'} value={g.expectedMove ? `±${(g.expectedMove.pct * 100).toFixed(2)}%` : '—'} />
              <Stat label="Gamma expiring ≤ 2 days" value={`${Math.round(g.nearTermShare * 100)}%`} />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {levels.map((l) => { const c = toIdx(l.v); return (
              <div key={l.key} title={l.tip} className={`rounded-2xl border p-3.5 ${l.tone}`}>
                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase">{l.icon}{l.label}</div>
                <div className="mt-1.5 text-xl font-bold font-mono-code text-white">{px(l.v)}</div>
                {data.convert && <div className="text-[11px] font-mono-code opacity-80">{c ? `≈ ${data.convert.to} ${px(c)}` : data.convert.factor === null ? 'waiting for live price…' : ''}</div>}
                <div className="text-[10px] mt-1 opacity-70 leading-snug">{l.v !== null ? `${((l.v / data.spot - 1) * 100 >= 0 ? '+' : '')}${((l.v / data.spot - 1) * 100).toFixed(2)}% from price` : 'not defined'}</div>
              </div>); })}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Panel title="Gamma profile" sub="Net dealer gamma if price moved to each level. Above zero: moves are dampened. Below zero: moves are amplified."><ProfileChart g={g} /></Panel>
            <Panel title="Gamma by strike" sub="Green: call gamma (right). Red: put gamma (left). Tall bars are the walls."><StrikeChart g={g} /></Panel>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Panel title="How to read it now" className="lg:col-span-2">
              <ul className="space-y-2 text-sm text-slate-200">{data.read.lines.map((l, i) => <li key={i} className="flex gap-2"><span className="text-cyan-400">▸</span><span>{l}</span></li>)}</ul>
              <div className="mt-4 grid sm:grid-cols-3 gap-2 text-xs">
                <Scn t="Price runs into the Call Wall" b={`Watch for a stall or rejection near ${px(g.callWall)}. Only a close through it with momentum suggests acceleration.`} />
                <Scn t="Price falls below the Gamma Flip" b={`Below ${px(g.flip)} hedging can add to selling. Expect larger candles and faster moves.`} />
                <Scn t="Price reaches the Put Wall" b={`Near ${px(g.putWall)} look for buyers stepping in, or a clean break that can run.`} />
              </div>
            </Panel>
            <Panel title="Gamma by expiry" sub="Where the exposure expires">
              <div className="space-y-1.5">{g.expiries.slice(0, 9).map((e) => { const m = Math.max(...g.expiries.map((x) => x.abs)) || 1; return (
                <div key={e.exp} className="text-[11px]"><div className="flex justify-between text-slate-300"><span>{new Date(e.exp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {e.dte}d</span><span className={e.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{money(e.net)}</span></div>
                  <div className="h-1.5 rounded bg-slate-800 overflow-hidden"><div className={`h-full ${e.net >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.max(3, (e.abs / m) * 100)}%` }} /></div></div>); })}</div>
            </Panel>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-200 font-bold"><Info className="w-4 h-4 text-cyan-400" />Read this before trading it</div>
            <p>Data: {data.source}. Computed {new Date(data.fetchedAt).toLocaleTimeString()}{data.stale ? ' — source is not answering, showing the last good reading' : ''}. {g.used.toLocaleString()} priced contracts used.</p>
            <p>Model: {data.model}. Open interest does not say who holds which side, so call/put gamma signs follow the standard dealer assumption (dealers long calls, short puts). These are estimates of hedging pressure, not dealer inventory.</p>
            <p>Forex: spot FX has no single options book, so GEX on EURUSD or GBPUSD does not exist. For gold the ETF (GLD) is a proxy, converted to XAUUSD with the live price; the basis can differ from your broker by a few dollars. Use SPY/QQQ levels on NAS100 and US500 only after checking your broker's price against the converted level.</p>
            <button type="button" onClick={() => setShowEdu((v) => !v)} className="text-cyan-300 hover:underline pt-1">{showEdu ? 'Hide' : 'Show'} the 60-second GEX guide</button>
            {showEdu && <Guide />}
          </div>
        </>
      )}
    </div>
  );
};

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

function ProfileChart({ g }: { g: Res }) {
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
      {[0, 0.25, 0.5, 0.75, 1].map((f) => { const v = x0 + (x1 - x0) * f; return <text key={f} x={X(v)} y={H - 8} textAnchor="middle" fontSize="9" fill="#64748b">{px(v)}</text>; })}
      <line x1={X(g.spot)} x2={X(g.spot)} y1={P.t} y2={H - P.b} stroke="#fff" strokeWidth="1.2" /><text x={X(g.spot)} y={P.t + 8} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">PRICE</text>
      {g.flip !== null && g.flip > x0 && g.flip < x1 && <><line x1={X(g.flip)} x2={X(g.flip)} y1={P.t} y2={H - P.b} stroke="#fbbf24" strokeDasharray="4 3" /><text x={X(g.flip)} y={H - P.b - 4} textAnchor="middle" fontSize="9" fill="#fbbf24" fontWeight="700">FLIP</text></>}
    </svg>
  );
}

function StrikeChart({ g }: { g: Res }) {
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
          <div className={`w-14 shrink-0 text-center text-[9px] font-mono-code ${b === nearest ? 'text-white font-bold' : mark(b.s) ? 'text-amber-300' : 'text-slate-500'}`}>{px(b.s)}</div>
          <div className="w-1/2"><div className="h-2.5 rounded-r bg-emerald-500/80" style={{ width: `${(b.call / m) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export default GexRadar;
