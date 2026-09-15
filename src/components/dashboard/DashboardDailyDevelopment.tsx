import React from 'react';
import {
  Sparkles,
  Award,
  ListTodo,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Trade } from '../../types';

interface DashboardDailyDevelopmentProps {
  trades: Trade[];
  onNavigateToTab: (tab: string) => void;
}

export const DashboardDailyDevelopment: React.FC<DashboardDailyDevelopmentProps> = ({
  trades,
  onNavigateToTab,
}) => {
  // 10-Trade Foundation Challenge progress
  const sampleTradesCount = trades.length;
  const challengeProgress = Math.min(100, Math.round((sampleTradesCount / 10) * 100));

  return (
    <div className="rounded-2xl bg-[#090D16] border border-slate-800/80 p-5 shadow-xl flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
              DAILY DEVELOPMENT & HABITS
            </h3>
          </div>
          <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
            CHALLENGE
          </span>
        </div>

        <div className="mt-3.5 space-y-3 font-mono-code text-xs">
          {/* 10-Trade Foundation Challenge Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-300 font-bold text-[11px] flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                10-TRADE FOUNDATION CHALLENGE
              </span>
              <span className="text-amber-400 font-bold text-[11px]">
                {Math.min(10, sampleTradesCount)} / 10 EXECUTED
              </span>
            </div>

            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${challengeProgress}%` }}
              />
            </div>

            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {sampleTradesCount >= 10
                ? 'Foundation completed! Review your 10 trades without judgment to identify your top edge.'
                : `Execute ${10 - sampleTradesCount} more trades adhering strictly to 1% risk to establish your baseline statistical curve.`}
            </p>
          </div>

          {/* Daily Routine Items Checklist Preview */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-bold">CORE ROUTINE HABITS</div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Check HTF Structure & Direction</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Calculate 1% Lot Size Before Entry</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Complete Post-Trade Self-Audit</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={() => onNavigateToTab('DAILY_DEV')}
          className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 text-emerald-300 text-xs font-military font-bold tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <ListTodo className="w-4 h-4" />
          <span>OPEN DEVELOPMENT PLAN</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
