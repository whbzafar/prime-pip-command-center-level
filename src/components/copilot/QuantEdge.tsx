import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cpu, X, RefreshCw, FlaskConical, ShieldCheck, Ban, TrendingUp, TrendingDown, PauseCircle, BellRing, ChevronDown, ChevronUp } from 'lucide-react';

/** PRIME PIP QUANT EDGE — the research-selected buy/sell setup, live, with its full walk-forward record. */
interface St { n: number; win: number; expR: number; pf: number; dd: number; totR: number }
interface Row {
  symbol: string; label: string; error?: string; engine: 'TREND' | 'PULLBACK'; tf: string; longOnly: boolean; lastBar: number; price: number; status: string; watch: string;
  open: null | { dir: number; entryTime: number; entry: number; stop: number; initialStop: number; unrealisedR: number };
  stats: { all: St; inSample: St; outOfSample: St; longs: St; shorts: St; perYear: number; years: Record<string, number>; from: number };
  curve: Array<[number, number]>; recent: Array<{ dir: number; entryTime: number; entry: number; exitTime: number; exit: number; r: number; reason: string }>;
}
interface Data { ok: boolean; error?: string; generatedAt: string; rows: Row[]; noEdge: string[]; research: { period: string; split: string; tested: string[]; instruments: number; timeframes: string[]; costs: string; finding: string }; disclaimer: string }

const STATUS: Record<string, { label: string; cls: string; Icon: any }> = {
  LONG: { label: 'IN A BUY', cls: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50', Icon: TrendingUp },
  SHORT: { label: 'IN A SELL', cls: 'bg-rose-500/20 text-rose-200 border-rose-400/50', Icon: TrendingDown },
  BUY_NEXT_OPEN: { label: 'BUY SIGNAL', cls: 'bg-emerald-500/30 text-white border-emerald-300 animate-pulse', Icon: BellRing },
  SELL_NEXT_OPEN: { label: 'SELL SIGNAL', cls: 'bg-rose-500/30 text-white border-rose-300 animate-pulse', Icon: BellRing },
  FLAT: { label: 'WAITING', cls: 'bg-slate-700/40 text-slate-300 border-slate-600', Icon: PauseCircle },
};
const SEEN = 'ppfx_quantedge_seen_v1';

const Curve: React.FC<{ pts: Array<[number, number]> }> = ({ pts }) => {
  if (pts.length < 2) return null;
  const ys = pts.map((p) => p[1]); const mn = Math.min(0, ...ys), mx = Math.max(...ys, 1);
  const W = 300, H = 70; const x = (i: number) => (i / (pts.length - 1)) * W; const y = (v: number) => H - ((v - mn) / (mx - mn)) * H;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" preserveAspectRatio="none" aria-label="Equity curve in R">
      <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="#334155" strokeDasharray="3 3" />
      <path d={`${d} L${W},${y(mn)} L0,${y(mn)} Z`} fill="rgba(34,211,238,0.12)" />
      <path d={d} fill="none" stroke="#22d3ee" strokeWidth="1.6" />
    </svg>
  );
};

const StatCell: React.FC<{ s: St; label: string; hl?: boolean }> = ({ s, label, hl }) => (
  <tr className={hl ? 'bg-cyan-500/5' : ''}>
    <td className="py-1 pr-2 text-slate-400 whitespace-nowrap">{label}</td>
    <td className="pr-2 text-right font-mono text-slate-200">{s.n}</td>
    <td className="pr-2 text-right font-mono text-slate-200">{s.win}%</td>
    <td className={`pr-2 text-right font-mono font-bold ${s.expR >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{s.n ? `${s.expR > 0 ? '+' : ''}${s.expR.toFixed(2)}R` : '—'}</td>
    <td className="pr-2 text-right font-mono text-slate-200">{s.n ? (s.pf >= 99 ? '∞' : s.pf.toFixed(2)) : '—'}</td>
    <td className="text-right font-mono text-slate-400">{s.n ? `${s.dd}R` : '—'}</td>
  </tr>
);

export const QuantEdge: React.FC<{ open: boolean; onClose: () => void; onOpenSymbol: (s: string) => void }> = ({ open, onClose, onOpenSymbol }) => {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [expanded, setExpanded] = useState<string | null>('XAUUSD');
  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const j = await fetch('/api/quant-edge').then((r) => r.json()).catch(() => null);
    if (!j?.ok) setErr(j?.error || 'The price history could not be reached. Try again in a minute.'); else setData(j);
    setLoading(false);
  }, []);
  useEffect(() => { if (open) void load(); }, [open, load]);
  useEffect(() => { if (!open) return; const t = window.setInterval(() => void load(), 10 * 60_000); return () => window.clearInterval(t); }, [open, load]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  // Remember the statuses the user has seen so new signals stand out.
  useEffect(() => { if (data) try { localStorage.setItem(SEEN, JSON.stringify(Object.fromEntries(data.rows.map((r) => [r.symbol, r.status])))); } catch { /* ignore */ } }, [data]);

  if (!open) return null;
  const fmtT = (t: number) => new Date(t).toLocaleString([], { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return createPortal(
    <div className="fixed inset-0 z-[2147483100] flex items-center justify-center p-2 sm:p-4 bg-black/75" onClick={onClose} data-testid="quant-edge">
      <div className="w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-2xl border border-cyan-400/40 shadow-2xl shadow-cyan-500/10" style={{ backgroundColor: '#020617' }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800" style={{ backgroundColor: '#020617' }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0"><Cpu className="w-5 h-5 text-white" /></div>
            <div className="min-w-0"><div className="text-sm font-black text-white tracking-wide">PRIME PIP QUANT EDGE</div><div className="text-[10.5px] text-slate-500 truncate">The buy/sell setup that survived a 10-year walk-forward test — live signals, real track record</div></div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => void load()} disabled={loading} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Close Quant Edge"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {loading && !data && <div className="py-14 text-center text-slate-400 text-sm"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />Replaying 10 years of real prices and checking today's candles…</div>}
          {err && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div>}

          {data && (<>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3">
              <button type="button" onClick={() => setShowResearch((v) => !v)} className="w-full flex items-center justify-between gap-2 text-left cursor-pointer">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-violet-200"><FlaskConical className="w-4 h-4" />How this setup was chosen</span>
                {showResearch ? <ChevronUp className="w-4 h-4 text-violet-300" /> : <ChevronDown className="w-4 h-4 text-violet-300" />}
              </button>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{data.research.finding}</p>
              {showResearch && (
                <div className="mt-2 grid sm:grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div><b className="text-slate-200">Tested:</b> {data.research.tested.join(' · ')} — on {data.research.instruments} markets × {data.research.timeframes.join('/')}.</div>
                  <div><b className="text-slate-200">Data:</b> {data.research.period}. {data.research.split}</div>
                  <div><b className="text-slate-200">Costs:</b> {data.research.costs}</div>
                  <div><b className="text-slate-200">Rules:</b> <span className="text-cyan-200">Trend</span> — buy a close above the prior 55-candle high while above the 200 EMA (sell = mirror), stop 2×ATR, then a 3×ATR trailing stop. <span className="text-cyan-200">Pullback</span> — in an uptrend (close above 200-day EMA) buy when RSI(2) closes under 10; exit on a close above the 5-day average, after 10 days, or at a 2.5×ATR stop.</div>
                </div>
              )}
            </div>

            {data.rows.map((r) => {
              if (r.error) return <div key={r.symbol} className="rounded-xl border border-slate-800 p-3 text-xs text-slate-400">{r.label}: data temporarily unavailable.</div>;
              const S = STATUS[r.status] || STATUS.FLAT; const ex = expanded === r.symbol;
              const oos = r.stats.outOfSample;
              return (
                <div key={r.symbol} className="rounded-2xl border border-slate-800 bg-slate-900/40" data-testid="edge-row">
                  <div className="p-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-[8.5rem]">
                      <button type="button" onClick={() => { onOpenSymbol(r.symbol); onClose(); }} className="font-black font-mono text-white hover:text-cyan-300 cursor-pointer">{r.symbol}</button>
                      <div className="text-[10.5px] text-slate-500">{r.label} · {r.tf} · {r.engine === 'TREND' ? 'Trend breakout' : 'Pullback (long only)'}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-black ${S.cls}`}><S.Icon className="w-3.5 h-3.5" />{S.label}</span>
                    <div className="flex-1 min-w-[14rem] text-xs text-slate-300">{r.watch}</div>
                    <div className="text-right">
                      <div className={`text-sm font-black font-mono ${oos.expR >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{oos.expR > 0 ? '+' : ''}{oos.expR.toFixed(2)}R</div>
                      <div className="text-[9.5px] text-slate-500 uppercase">per trade since 2023</div>
                    </div>
                    <button type="button" onClick={() => setExpanded(ex ? null : r.symbol)} className="p-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white cursor-pointer" aria-label="Details">{ex ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                  </div>
                  {r.open && (
                    <div className="mx-3 mb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                      <div className="rounded-lg bg-slate-950 border border-slate-800 p-1.5"><div className="text-slate-500">Entry</div><div className="font-mono text-white">{r.open.entry}</div></div>
                      <div className="rounded-lg bg-slate-950 border border-rose-500/30 p-1.5"><div className="text-slate-500">Stop now</div><div className="font-mono text-rose-300">{r.open.stop}</div></div>
                      <div className="rounded-lg bg-slate-950 border border-slate-800 p-1.5"><div className="text-slate-500">Opened</div><div className="font-mono text-white">{fmtT(r.open.entryTime)}</div></div>
                      <div className="rounded-lg bg-slate-950 border border-slate-800 p-1.5"><div className="text-slate-500">Open result</div><div className={`font-mono font-bold ${r.open.unrealisedR >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{r.open.unrealisedR > 0 ? '+' : ''}{r.open.unrealisedR}R</div></div>
                    </div>
                  )}
                  {ex && (
                    <div className="px-3 pb-3 grid lg:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <table className="w-full text-[11px]">
                          <thead><tr className="text-slate-500 text-left"><th className="py-1">Since {new Date(r.stats.from).getFullYear()}</th><th className="text-right pr-2">Trades</th><th className="text-right pr-2">Wins</th><th className="text-right pr-2">Avg</th><th className="text-right pr-2">PF</th><th className="text-right">Max DD</th></tr></thead>
                          <tbody>
                            <StatCell s={r.stats.all} label="All trades" />
                            <StatCell s={r.stats.inSample} label="2016–2022 (tuning)" />
                            <StatCell s={r.stats.outOfSample} label="2023 → now (blind test)" hl />
                            <StatCell s={r.stats.longs} label="Buys only" />
                            {!r.longOnly && <StatCell s={r.stats.shorts} label="Sells only" />}
                          </tbody>
                        </table>
                        <div className="text-[10.5px] text-slate-500">≈ {r.stats.perYear} trades a year. R = result in units of the stop distance (risk 1% → +0.30R ≈ +0.3% per trade on average).{!r.longOnly && r.stats.shorts.n > 0 && r.stats.shorts.expR < r.stats.longs.expR / 3 ? ' Sell signals have been close to break-even — buys carry the edge.' : ''}</div>
                        <div className="flex flex-wrap gap-1">{(Object.entries(r.stats.years) as Array<[string, number]>).map(([y, v]) => <span key={y} className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${v >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{y}: {v > 0 ? '+' : ''}{v}R</span>)}</div>
                      </div>
                      <div className="space-y-2">
                        <div className="rounded-lg bg-slate-950 border border-slate-800 p-2"><div className="text-[10px] text-slate-500 mb-1">Equity curve (cumulative R, after costs)</div><Curve pts={r.curve} /></div>
                        <div className="max-h-40 overflow-y-auto">
                          <table className="w-full text-[10.5px]"><tbody>
                            {r.recent.map((t, i) => <tr key={i} className="border-t border-slate-800/70"><td className={`py-0.5 font-bold ${t.dir === 1 ? 'text-emerald-300' : 'text-rose-300'}`}>{t.dir === 1 ? 'BUY' : 'SELL'}</td><td className="text-slate-400">{fmtT(t.entryTime)}</td><td className="font-mono text-slate-300">{t.entry} → {t.exit}</td><td className="text-slate-500">{t.reason}</td><td className={`text-right font-mono font-bold ${t.r >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{t.r > 0 ? '+' : ''}{t.r}R</td></tr>)}
                          </tbody></table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 flex gap-2 text-xs text-slate-400"><Ban className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" /><div><b className="text-slate-200">Stand aside:</b> {data.noEdge.join(', ')} — none of the 7 tested strategies kept an edge on these after costs in the blind test, so this setup does not trade them.</div></div>
            <div className="flex gap-2 text-[10.5px] text-slate-600"><ShieldCheck className="w-3.5 h-3.5 shrink-0" />Signals use closed candles only (no repainting). Updated {new Date(data.generatedAt).toLocaleTimeString()}. {data.disclaimer}</div>
          </>)}
        </div>
      </div>
    </div>,
    document.body,
  );
};
