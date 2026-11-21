import React, { useEffect, useState } from 'react';
import { Activity, Gauge, Orbit, ShieldAlert } from 'lucide-react';
import { fetchJsonSafe, peekJson } from './fundamentalAnalysis/ui';
const FI_TAB_KEY = 'ppfx:fi-tab';

/** Slim quick-launch row on the main dashboard: one tile per Fundamentals sub-category. */
export const FundamentalsLauncher: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const [c, setC] = useState<{ bull: number; bear: number; all: number } | null>(() => count(peekJson<any>('/api/macro/universe')?.data));
  useEffect(() => {
    let alive = true;
    fetchJsonSafe<any>('/api/macro/universe').then((r) => { if (alive) setC(count(r.data)); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  const go = (id: string) => { try { sessionStorage.setItem(FI_TAB_KEY, id); } catch { /* ignore */ } onNavigate('FUNDAMENTAL_INDICATORS'); };
  const tiles = [
    { id: 'ANALYSIS', title: 'Fundamentals', sub: 'Scores for every market', icon: Gauge, tint: 'text-emerald-300 border-emerald-400/30 hover:border-emerald-300/70' },
    { id: 'SEVERITY_REPORT', title: 'CFTC COT Report', sub: 'Institutional positioning', icon: ShieldAlert, tint: 'text-cyan-300 border-cyan-400/30 hover:border-cyan-300/70' },
    { id: 'SENTIMENT', title: 'Sentiment', sub: 'Retail crowd gauges', icon: Activity, tint: 'text-blue-300 border-blue-400/30 hover:border-blue-300/70' },
    { id: 'UNIVERSE', title: 'Financial Universe', sub: c ? `${c.bull} bullish · ${c.bear} bearish` : 'Live market map', icon: Orbit, tint: 'text-amber-200 border-amber-300/30 hover:border-amber-200/70' },
  ];
  return (
    <section data-testid="fundamentals-launcher" aria-label="Fundamentals" className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 sm:p-4">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Fundamentals</div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {tiles.map((t) => { const Icon = t.icon; return (
          <button key={t.id} type="button" onClick={() => go(t.id)} className={`flex items-center gap-3 rounded-xl border bg-slate-900/50 px-3 py-2.5 text-left transition-colors cursor-pointer ${t.tint}`}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-slate-100">{t.title}</span><span className="block truncate text-[11px] text-slate-400">{t.sub}</span></span>
          </button>
        ); })}
      </div>
    </section>
  );
};
const count = (d: any) => (d?.assets ? { all: d.assets.length, bull: d.assets.filter((i: any) => i.side === 'bull').length, bear: d.assets.filter((i: any) => i.side === 'bear').length } : null);
export default FundamentalsLauncher;
