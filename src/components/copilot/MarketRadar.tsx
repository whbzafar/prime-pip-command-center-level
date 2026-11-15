import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Radar, X, RefreshCw, TrendingUp, TrendingDown, Minus, Zap, Waves, Activity, AlertTriangle, Sparkles } from 'lucide-react';
import { chartSymbolFor } from '../fundamentalAnalysis/LiveBiasStrip';

/** MARKET REGIME RADAR — every pair ranked live by regime + direction + fundamentals + news risk. */
type Regime = 'TRENDING' | 'RANGING' | 'COILING' | 'BREAKOUT';
interface Row {
  symbol: string; price: number; er: number; widthPct: number; atrPct: number; direction: number; regime: Regime; change5: number;
  fundamentals: number | null; fConfidence: number; side: 'LONG' | 'SHORT' | 'NEUTRAL'; score: number; alignment: 'aligned' | 'conflict' | 'neutral';
  events: Array<{ currency: string; title: string; inHours: number }>; setup: string;
}
interface RadarData { ok: boolean; error?: string; generatedAt: string; rows: Row[]; summary: Record<string, number>; failed: string[]; method: string; disclaimer: string }

const REG: Record<Regime, { label: string; cls: string; Icon: any }> = {
  BREAKOUT: { label: 'Breakout', cls: 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/40', Icon: Zap },
  TRENDING: { label: 'Trending', cls: 'bg-cyan-500/15 text-cyan-200 border-cyan-500/40', Icon: Activity },
  COILING: { label: 'Coiling', cls: 'bg-amber-500/15 text-amber-200 border-amber-500/40', Icon: Waves },
  RANGING: { label: 'Ranging', cls: 'bg-slate-700/40 text-slate-300 border-slate-600', Icon: Minus },
};
const FILTERS = ['ALL', 'BREAKOUT', 'TRENDING', 'COILING', 'RANGING'] as const;
const GROUPS = { ALL: () => true, FX: (s: string) => /^[A-Z]{6}$/.test(s) && !/^X(AU|AG)/.test(s), METALS: (s: string) => /^X(AU|AG)|OIL/.test(s), INDICES: (s: string) => /^(US|GER|UK|JP)\d/.test(s), CRYPTO: (s: string) => /^(BTC|ETH)/.test(s) } as const;

export const MarketRadar: React.FC<{ open: boolean; onClose: () => void; onOpenSymbol: (chartSymbol: string) => void; onCopilot: (chartSymbol: string) => void }> = ({ open, onClose, onOpenSymbol, onCopilot }) => {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [group, setGroup] = useState<keyof typeof GROUPS>('ALL');

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const j = await fetch('/api/radar').then((r) => r.json()).catch(() => null);
      if (!j?.ok) setErr(j?.error || 'The radar could not reach live market data. Please try again in a minute.');
      else setData(j);
    } catch { setErr('No connection — please check your internet.'); }
    setLoading(false);
  }, []);
  useEffect(() => { if (open && !data) void load(); }, [open, data, load]);
  useEffect(() => { if (!open) return; const t = window.setInterval(() => void load(), 5 * 60_000); return () => window.clearInterval(t); }, [open, load]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);

  const rows = useMemo(() => (data?.rows || []).filter((r) => (filter === 'ALL' || r.regime === filter) && GROUPS[group](r.symbol)), [data, filter, group]);
  if (!open) return null;
  const dp = (p: number) => (p >= 1000 ? p.toFixed(2) : p >= 20 ? p.toFixed(3) : p.toFixed(5));

  return createPortal(
    <div className="fixed inset-0 z-[2147483100] flex items-center justify-center p-2 sm:p-4 bg-black/70" onClick={onClose} data-testid="market-radar">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl border border-fuchsia-500/30 bg-slate-950 shadow-2xl" onClick={(e) => e.stopPropagation()}  style={{ backgroundColor: "#020617" }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shrink-0"><Radar className="w-4 h-4 text-white" /></div>
            <div className="min-w-0">
              <div className="text-sm font-black text-white tracking-wide">MARKET REGIME RADAR</div>
              <div className="text-[10.5px] text-slate-500 truncate">Every pair: trending, ranging, coiling or breaking out — ranked with fundamentals and news risk</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => void load()} disabled={loading} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Close radar"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-slate-800 flex flex-wrap gap-1.5 items-center">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${filter === f ? 'bg-fuchsia-500/20 border-fuchsia-400/60 text-white' : 'border-slate-800 text-slate-400 hover:text-white'}`}>
              {f === 'ALL' ? 'All' : REG[f].label}{data && f !== 'ALL' ? ` ${data.summary[f.toLowerCase()] ?? 0}` : ''}
            </button>
          ))}
          <span className="w-px h-5 bg-slate-800 mx-1" />
          {(Object.keys(GROUPS) as Array<keyof typeof GROUPS>).map((g) => (
            <button key={g} type="button" onClick={() => setGroup(g)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${group === g ? 'bg-cyan-500/20 border-cyan-400/60 text-white' : 'border-slate-800 text-slate-400 hover:text-white'}`}>{({ ALL: 'Every market', FX: 'Forex', METALS: 'Metals & oil', INDICES: 'Indices', CRYPTO: 'Crypto' } as const)[g]}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && !data && <div className="py-16 text-center text-slate-400 text-sm"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-fuchsia-400" />Scanning 40 markets on live daily data…</div>}
          {err && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div>}
          {data && rows.length === 0 && <div className="py-10 text-center text-slate-500 text-sm">No markets match this filter right now.</div>}
          {rows.map((r, i) => {
            const R = REG[r.regime]; const cs = chartSymbolFor(r.symbol);
            const SideIcon = r.side === 'LONG' ? TrendingUp : r.side === 'SHORT' ? TrendingDown : Minus;
            return (
              <div key={r.symbol} data-testid="radar-row" className="rounded-xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 p-3 grid grid-cols-[auto_1fr] sm:grid-cols-[2.5rem_8rem_7rem_1fr_auto] gap-x-3 gap-y-1.5 items-center">
                <div className="text-xs font-mono text-slate-500 row-span-2 sm:row-span-1">#{i + 1}</div>
                <div className="min-w-0">
                  <button type="button" onClick={() => { onOpenSymbol(cs); onClose(); }} className="font-black font-mono text-white hover:text-cyan-300 cursor-pointer">{r.symbol}</button>
                  <div className="text-[10.5px] text-slate-500 font-mono">{dp(r.price)} · <span className={r.change5 >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{r.change5 >= 0 ? '+' : ''}{r.change5}% 5d</span></div>
                </div>
                <div className="flex items-center gap-1.5 col-start-2 sm:col-start-auto flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10.5px] font-bold ${R.cls}`}><R.Icon className="w-3 h-3" />{R.label}</span>
                  <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-bold ${r.side === 'LONG' ? 'text-emerald-300' : r.side === 'SHORT' ? 'text-rose-300' : 'text-slate-400'}`}><SideIcon className="w-3 h-3" />{r.side === 'NEUTRAL' ? 'No bias' : r.side}</span>
                </div>
                <div className="col-start-2 sm:col-start-auto text-[11px] text-slate-400 leading-snug">
                  {r.setup}
                  <div className="flex flex-wrap gap-x-3 mt-0.5 text-[10.5px] text-slate-500">
                    <span>Fundamentals {r.fundamentals === null ? '—' : <b className={r.fundamentals >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{r.fundamentals > 0 ? '+' : ''}{r.fundamentals}</b>}{r.alignment === 'aligned' ? ' ✓ agree' : r.alignment === 'conflict' ? ' ✗ disagree' : ''}</span>
                    <span>Daily range {r.atrPct.toFixed(2)}%</span>
                    {r.events.map((e, k) => <span key={k} className={e.inHours <= 6 ? 'text-amber-300' : ''}><AlertTriangle className="w-3 h-3 inline -mt-0.5" /> {e.currency} {e.title} {e.inHours < 1 ? '<1h' : `${Math.round(e.inHours)}h`}</span>)}
                  </div>
                </div>
                <div className="col-start-2 sm:col-start-auto flex items-center gap-2 justify-start sm:justify-end">
                  <div className="text-right"><div className="text-lg font-black text-white leading-none">{r.score}</div><div className="text-[9.5px] text-slate-500 uppercase">score</div></div>
                  <button type="button" onClick={() => onCopilot(cs)} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 text-[11px] font-bold hover:bg-cyan-500/20 cursor-pointer" title="Open the Trade Copilot plan for this pair"><Sparkles className="w-3 h-3" />Plan</button>
                </div>
              </div>
            );
          })}
        </div>
        {data && <div className="px-4 py-2 border-t border-slate-800 text-[10px] text-slate-600 leading-relaxed">Updated {new Date(data.generatedAt).toLocaleTimeString()} · {data.method}{data.failed.length ? ` Not available right now: ${data.failed.join(', ')}.` : ''} {data.disclaimer}</div>}
      </div>
    </div>,
    document.body,
  );
};
