/**
 * Pine Editor workspace for categories other than Premium TradingView (Backtesting, Unlimited
 * Chart Analysis): the Pro chart plus the Pine Editor / Indicators panel, folded away until opened.
 * The same private library is used everywhere, so a script published once is available here too.
 */
import React, { useState } from 'react';
import { ChevronDown, Code2 } from 'lucide-react';
import { PineIndicatorChips } from './PineIndicatorChips';

const PinePanelLazy = React.lazy(() => import('./PinePanel'));
const PineMainChartLazy = React.lazy(() => import('./PineMainChart'));

const isAdmin = (): boolean => {
  try { const u = JSON.parse(localStorage.getItem('primepipfx_user_profile') || 'null'); return Boolean(u && (u.isDeveloper || u.role === 'ADMIN' || u.role === 'DEVELOPER')); } catch { return false; }
};

export const PineWorkspace: React.FC<{ storageKey: string; defaultSymbol?: string; note?: string }> = ({ storageKey, defaultSymbol = 'EURUSD', note }) => {
  const k = `ppfx_pinews_${storageKey}`;
  const [open, setOpen] = useState<boolean>(() => { try { return localStorage.getItem(k) === '1'; } catch { return false; } });
  const [symbol, setSymbol] = useState<string>(() => { try { return localStorage.getItem(`${k}_sym`) || defaultSymbol; } catch { return defaultSymbol; } });
  const [interval, setIntervalTf] = useState<string>(() => { try { return localStorage.getItem(`${k}_tf`) || '60'; } catch { return '60'; } });
  const [panel, setPanel] = useState(true);
  const admin = isAdmin();
  const toggle = () => { const n = !open; setOpen(n); try { localStorage.setItem(k, n ? '1' : '0'); } catch { /* storage blocked */ } };
  const save = (key: string, v: string) => { try { localStorage.setItem(`${k}_${key}`, v); } catch { /* storage blocked */ } };
  return (
    <div data-testid={`pine-workspace-${storageKey}`} className="rounded-2xl border border-violet-500/30 bg-gradient-to-r from-[#0d0f1c] via-[#0b1120] to-[#0d0f1c] overflow-hidden">
      <button type="button" onClick={toggle} className="w-full flex items-center gap-2 px-3 sm:px-4 py-2.5 text-left cursor-pointer">
        <span className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-400/40 flex items-center justify-center"><Code2 className="w-4 h-4 text-violet-300" /></span>
        <span className="text-[13px] font-bold text-slate-50">{admin ? 'Indicator Editor' : 'Indicators'}</span>
        <span className="text-[11px] text-slate-400 hidden sm:inline truncate">{note || (admin ? 'write, load and apply scripts on the chart below' : 'show or hide the Prime Pip indicators on the chart below')}</span>
        <span className="ml-auto text-[11px] font-semibold text-violet-200">{open ? 'Hide' : 'Open'}</span>
        <ChevronDown className={`w-4 h-4 text-violet-300 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-2 sm:px-3 pb-3 space-y-2">
          <PineIndicatorChips />
          <div className="relative h-[62vh] min-h-[380px] max-h-[760px] rounded-xl overflow-hidden border border-slate-800 bg-[#131722]">
            <React.Suspense fallback={<div className="p-4 text-[12px] text-slate-400">Loading chart…</div>}>
              <PineMainChartLazy symbol={symbol} interval={interval}
                onSymbolChange={(s) => { setSymbol(s); save('sym', s); }}
                onIntervalChange={(iv) => { setIntervalTf(iv); save('tf', iv); }} />
            </React.Suspense>
          </div>
          {panel ? (
            <React.Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-[#0b0f17] p-4 text-[12px] text-slate-400">Loading…</div>}>
              <PinePanelLazy isAdminHint={admin} symbol={symbol} interval={interval} onClose={() => setPanel(false)} />
            </React.Suspense>
          ) : (
            <button type="button" onClick={() => setPanel(true)} className="px-3 py-1.5 rounded-lg border border-violet-400/50 bg-violet-500/10 text-[12px] font-semibold text-violet-100 hover:bg-violet-500/20 cursor-pointer">{admin ? 'Open the Indicator Editor' : 'Open the indicator list'}</button>
          )}
        </div>
      )}
    </div>
  );
};

export default PineWorkspace;
