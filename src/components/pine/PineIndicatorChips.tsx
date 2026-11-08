/**
 * One-click indicator chips for every user: click applies the indicator on the main chart,
 * click again hides it. Shows the published indicators (the admin also sees private ones).
 */
import React, { useEffect, useState } from 'react';
import { Activity, Check, Loader2 } from 'lucide-react';
import { hideIndicator, indicatorStatus, loadLibrary, pineLib, showIndicator } from './pineLibrary';

export const PineIndicatorChips: React.FC = () => {
  const [s, setS] = useState(() => ({ ...pineLib.get() }));
  useEffect(() => { const off = pineLib.subscribe(() => setS({ ...pineLib.get() })); loadLibrary(); return off; }, []);
  const list = s.scripts;
  if (!s.loaded) return null;
  if (!list.length) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1"><Activity className="w-3 h-3 text-violet-300" />Indicators</span>
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
    </div>
  );
};

export default PineIndicatorChips;
