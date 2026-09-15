import React from 'react';
import {
  Radio,
  AlertTriangle,
  ChevronRight,
  Shield,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface DashboardSignalsProps {
  onNavigateToTab: (tab: string) => void;
}

export const DashboardSignals: React.FC<DashboardSignalsProps> = ({
  onNavigateToTab,
}) => {
  return (
    <div className="rounded-2xl bg-[#090D16] border border-slate-800/80 p-5 shadow-xl flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
              PREMIUM SIGNALS HUB
            </h3>
          </div>
          <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase">
            LIVE DESK
          </span>
        </div>

        {/* Prominent Educational & Risk Disclaimer */}
        <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono-code flex items-start gap-2.5 leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <div className="font-bold text-[10px] uppercase tracking-wider text-amber-300">
              REGULATORY RISK WARNING
            </div>
            <p className="text-[10px] text-amber-200/90 mt-0.5">
              Educational & informational setups only. Trading carries substantial risk of loss. Recommended maximum risk is 1.0% per setup. You are solely responsible for all trade executions.
            </p>
          </div>
        </div>

        {/* Signals Desk Status */}
        <div className="mt-3.5 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 font-mono-code text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-[10px] text-slate-400 uppercase font-bold">DESK TRANSMISSION STATUS</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              BROADCAST READY
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Institutional ICT / Smart Money setups are filtered through strict multi-timeframe validation before release.
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={() => onNavigateToTab('SIGNALS')}
          className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-500/40 text-rose-300 text-xs font-military font-bold tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Radio className="w-4 h-4" />
          <span>ACCESS SIGNALS HUB</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
