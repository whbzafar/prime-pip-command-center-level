/**
 * One-click indicator chips for every user: click applies the indicator on the main chart,
 * click again hides it. Shows the published indicators (the admin also sees private ones).
 */
import React, { useEffect, useState } from 'react';
import { Activity, Check, Loader2, Search, X } from 'lucide-react';
import { hideIndicator, indicatorStatus, loadLibrary, pineLib, showIndicator } from './pineLibrary';

export const PineIndicatorChips: React.FC = () => {
  const [s, setS] = useState(() => ({ ...pineLib.get() }));
  useEffect(() => { const off = pineLib.subscribe(() => setS({ ...pineLib.get() })); loadLibrary(); return off; }, []);
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  // the ones on the chart first, then the rest; filtered by the search box
  const list = [...s.scripts].sort((a, b) => Number(s.shown.includes(b.id)) - Number(s.shown.includes(a.id))).filter((x) => !ql || x.name.toLowerCase().includes(ql) || s.shown.includes(x.id));
  if (!s.loaded) return null;
  if (!s.scripts.length) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1"><Activity className="w-3 h-3 text-violet-300" />Indicators</span>
      {s.scripts.length > 4 && (
        <label className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${s.scripts.length} indicators`} aria-label="Search indicators" data-testid="pine-indicator-search"
            className="w-44 pl-6 pr-6 py-1 rounded-lg bg-slate-950 border border-slate-700 focus:border-violet-400 outline-none text-[11px] text-slate-100 placeholder:text-slate-500" />
          {q && <button type="button" onClick={() => setQ('')} aria-label="Clear" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"><X className="w-3 h-3" /></button>}
        </label>
      )}
      {list.map((x) => {
        const on = s.shown.includes(x.id);
        const st = indicatorStatus(x.id);
        return (
          <button key={x.id} type="button" onClick={() => (on ? hideIndicator(x.id) : showIndicator(x.id))}
            title={on ? 'On the chart — click to hide' : 'Click to apply on the chart'}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition ${on ? 'bg-violet-500/25 border-violet-400/60 text-violet-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-violet-400/50'}`}>
            {on && st?.kind === 'busy' ? <Loader2 className="w-3 h-3 animate-spin" /> : on ? <Check className="w-3 h-3" /> : null}
            {x.name}{s.isAdmin && x.published === false ? ' (private)' : ''}
          </button>
        );
      })}
      {ql && !list.length && <span className="text-[11px] text-slate-500">No indicator matches “{q}”.</span>}
    </div>
  );
};

export default PineIndicatorChips;
