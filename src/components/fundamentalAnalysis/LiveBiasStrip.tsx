import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, LineChart, RefreshCw } from 'lucide-react';
import { fetchJsonSafe, fmtScore } from './ui';

export interface RankedPair { symbol: string; display: string; assetClass: string; shortTerm: number | null; longTerm: number | null; confidence: number; basis?: string[] }
export interface Rankings { longTerm: { bullish: RankedPair[]; bearish: RankedPair[] }; shortTerm: { bullish: RankedPair[]; bearish: RankedPair[] }; method: string; generatedAt: string }

/** Engine pair symbol → chart symbol used by the TradingView workspace. */
export function chartSymbolFor(engineSymbol: string): string {
  const m: Record<string, string> = { BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', XRPUSD: 'XRPUSDT', SOLUSD: 'SOLUSDT' };
  return m[engineSymbol] || engineSymbol;
}

/** Ask the app to open a symbol in Premium TradingView (works from any section). */
export function openChart(engineSymbol: string) {
  const sym = chartSymbolFor(engineSymbol);
  try { sessionStorage.setItem('ppfx_pending_chart', sym); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent('ppfx:open-chart', { detail: { symbol: sym } }));
}

let cache: { at: number; data: Rankings } | null = null;
export function useRankings(pollMs = 60_000) {
  const [data, setData] = useState<Rankings | null>(cache?.data || null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const j = await fetchJsonSafe<{ ok: boolean; data: Rankings }>('/api/macro/rankings');
        cache = { at: Date.now(), data: j.data };
        if (live) { setData(j.data); setError(null); }
      } catch (e: any) { if (live) setError(e?.message || 'Rankings unavailable'); }
    };
    if (!cache || Date.now() - cache.at > pollMs) load();
    const id = setInterval(load, pollMs);
    return () => { live = false; clearInterval(id); };
  }, [pollMs]);
  return { data, error };
}

const Chip: React.FC<{ p: RankedPair; horizon: 'shortTerm' | 'longTerm'; onSelect: (s: string) => void; active?: boolean }> = ({ p, horizon, onSelect, active }) => {
  const v = p[horizon];
  const up = (v ?? 0) > 0;
  return (
    <button type="button" onClick={() => onSelect(p.symbol)} title={`${p.display} · short-term ${fmtScore(p.shortTerm)} · long-term ${fmtScore(p.longTerm)} · confidence ${p.confidence}% — click to open the chart`}
      className={`shrink-0 inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg border text-[11.5px] font-semibold cursor-pointer transition-all hover:-translate-y-px ${active ? 'ring-1 ring-cyan-400/60' : ''} ${up ? 'border-emerald-500/30 bg-emerald-500/[0.07] text-emerald-100 hover:border-emerald-400/60' : 'border-rose-500/30 bg-rose-500/[0.07] text-rose-100 hover:border-rose-400/60'}`}>
      {up ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />}
      {p.display}
      <span className={`font-mono-code text-[10.5px] ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{fmtScore(v)}</span>
    </button>
  );
};

/** Live fundamental bias: strongest bullish and bearish pairs; click → chart. */
export const LiveBiasStrip: React.FC<{ onSelect: (engineSymbol: string) => void; activeSymbol?: string; compact?: boolean }> = ({ onSelect, activeSymbol, compact }) => {
  const { data, error } = useRankings();
  const [horizon, setHorizon] = useState<'shortTerm' | 'longTerm'>('shortTerm');
  const set = data?.[horizon];
  const active = (activeSymbol || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-[#0b1424] to-slate-950 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <LineChart className="w-4 h-4 text-cyan-400" />
        <span className="text-[11px] font-mono-code uppercase tracking-[0.16em] text-cyan-300">Live fundamental bias</span>
        <span className="text-[10.5px] text-slate-500">click a pair to open its chart</span>
        <div className="ml-auto flex rounded-lg border border-slate-800 overflow-hidden text-[10.5px] font-mono-code">
          {(['shortTerm', 'longTerm'] as const).map((h) => (
            <button key={h} type="button" onClick={() => setHorizon(h)} className={`px-2.5 py-1 cursor-pointer ${horizon === h ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}>{h === 'shortTerm' ? 'Current' : 'Long-term'}</button>
          ))}
        </div>
      </div>
      {!data && !error && <div className="flex items-center gap-2 text-[11px] text-slate-500"><RefreshCw className="w-3 h-3 animate-spin" /> Loading live scores…</div>}
      {error && !data && <div className="text-[11px] text-amber-300">{error} — retrying automatically.</div>}
      {set && (
        <div className={`grid gap-1.5 ${compact ? '' : 'md:grid-cols-2'}`}>
          {([['Bullish', set.bullish], ['Bearish', set.bearish]] as const).map(([label, list]) => (
            <div key={label} className="flex items-center gap-1.5 min-w-0">
              <span className={`shrink-0 w-14 text-[10px] font-mono-code uppercase ${label === 'Bullish' ? 'text-emerald-400' : 'text-rose-400'}`}>{label}</span>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                {list.length ? list.map((p) => <Chip key={p.symbol} p={p} horizon={horizon} onSelect={onSelect} active={chartSymbolFor(p.symbol) === active || p.symbol === active} />)
                  : <span className="text-[11px] text-slate-500">No strong {label.toLowerCase()} pairs right now.</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
