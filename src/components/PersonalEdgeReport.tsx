import React, { useMemo, useState } from 'react';
import { Target, TrendingUp, AlertTriangle, ChevronDown } from 'lucide-react';
import type { Trade } from '../types';
import { buildEdgeReport, MIN_N, type Group } from '../utils/edgeReport';

/** Personal Edge Report — built only from the trader's own closed trades. */
export const PersonalEdgeReport: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  const rep = useMemo(() => buildEdgeReport(trades), [trades]);
  const [open, setOpen] = useState<string | null>(null);
  if (rep.closed === 0) return null;
  return (
    <div className="bg-slate-900/80 border border-cyan-500/30 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm uppercase tracking-wide"><Target className="w-4 h-4" /> Personal Edge Report</div>
        <div className="text-[11px] font-mono-code text-slate-400">{rep.closed} closed trades · {rep.winRate}% wins · avg {rep.avgR >= 0 ? '+' : ''}{rep.avgR}R · PF {rep.profitFactor ?? '—'}</div>
      </div>
      {!rep.enough && <div className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">Only {rep.closed} closed trades so far. Patterns below are only called out once a group has {MIN_N}+ trades — 20+ total gives a trustworthy picture.</div>}
      {rep.findings.length === 0 ? (
        <div className="text-xs text-slate-400">No clear edge or leak yet — nothing in your journal separates strongly from the rest. Keep logging mood, strategy and rule-breaks on every trade.</div>
      ) : (
        <div className="space-y-2">
          {rep.findings.map((f, i) => (
            <div key={i} className={`flex gap-2 items-start text-xs rounded-lg p-2.5 border ${f.kind === 'edge' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-100' : f.kind === 'leak' ? 'bg-rose-500/10 border-rose-500/25 text-rose-100' : 'bg-slate-800 border-slate-700 text-slate-200'}`}>
              {f.kind === 'edge' ? <TrendingUp className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />}
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1">
        {(Object.entries(rep.dimensions) as [string, Group[]][]).filter(([, g]) => g.length > 0).map(([dim, groups]) => (
          <div key={dim} className="border border-slate-800 rounded-lg overflow-hidden">
            <button onClick={() => setOpen(open === dim ? null : dim)} className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/60">
              <span>{dim}</span><ChevronDown className={`w-3.5 h-3.5 transition-transform ${open === dim ? 'rotate-180' : ''}`} />
            </button>
            {open === dim && (
              <div className="overflow-x-auto"><table className="w-full text-[11px] font-mono-code">
                <thead><tr className="text-slate-500"><th className="text-left px-3 py-1">Group</th><th>Trades</th><th>Win %</th><th>Avg R</th><th>Total P/L</th></tr></thead>
                <tbody>{groups.map((g) => (
                  <tr key={g.key} className={`border-t border-slate-800 text-center ${g.n < MIN_N ? 'opacity-50' : ''}`}>
                    <td className="text-left px-3 py-1 text-slate-200">{g.key}</td><td>{g.n}</td><td>{g.winRate}%</td>
                    <td className={g.avgR >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{g.avgR >= 0 ? '+' : ''}{g.avgR}</td>
                    <td className={g.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{g.pnl >= 0 ? '+' : ''}{g.pnl}</td>
                  </tr>))}</tbody>
              </table><div className="px-3 py-1 text-[10px] text-slate-500">Faded rows have under {MIN_N} trades — too few to trust.</div></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
