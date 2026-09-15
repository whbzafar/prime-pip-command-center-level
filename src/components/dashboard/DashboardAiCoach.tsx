import React from 'react';
import {
  Sparkles,
  Bot,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Trade, AccountSettings } from '../../types';
import { formatCurrency } from '../../utils/currencyFormatter';

interface DashboardAiCoachProps {
  trades: Trade[];
  account: AccountSettings;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardAiCoach: React.FC<DashboardAiCoachProps> = ({
  trades,
  account,
  onNavigateToTab,
}) => {
  const closedTrades = trades.filter((t) => t.result && t.result !== 'RUNNING');

  // Find top strategy
  const stratMap: Record<string, { wins: number; total: number; pnl: number }> = {};
  closedTrades.forEach((t) => {
    const s = t.strategy || 'Unclassified';
    if (!stratMap[s]) stratMap[s] = { wins: 0, total: 0, pnl: 0 };
    stratMap[s].total += 1;
    if ((t.profitLoss || 0) > 0) stratMap[s].wins += 1;
    stratMap[s].pnl += t.profitLoss || 0;
  });

  const bestStrat = Object.entries(stratMap)
    .filter(([_, d]) => d.total >= 2)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];

  // Find top mistake leakage
  const mistakeCounts: Record<string, number> = {};
  closedTrades.forEach((t) => {
    if (t.mistakeReason && t.mistakeReason !== 'None (Flawless)') {
      mistakeCounts[t.mistakeReason] = (mistakeCounts[t.mistakeReason] || 0) + 1;
    }
  });

  const topMistake = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="rounded-2xl bg-[#090D16] border border-slate-800/80 p-5 shadow-xl flex flex-col justify-between space-y-4">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
              AI TACTICAL COACH
            </h3>
          </div>
          <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
            ACTIVE AUDIT
          </span>
        </div>

        {closedTrades.length < 3 ? (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center font-mono-code space-y-2">
            <Bot className="w-8 h-8 text-amber-400/80 mx-auto" />
            <div className="text-amber-400 font-bold text-xs">NOT ENOUGH DATA YET</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Record at least 3 completed trades in your Trade Journal to activate automated AI tactical diagnostics and edge analysis.
            </p>
          </div>
        ) : (
          <div className="mt-3.5 space-y-2.5 font-mono-code text-xs">
            {bestStrat && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  TOP PROVEN EDGE
                </div>
                <p className="text-[11px] text-slate-300">
                  <strong className="text-white">{bestStrat[0]}</strong> holds your highest win rate at{' '}
                  <strong className="text-emerald-400">
                    {Math.round((bestStrat[1].wins / bestStrat[1].total) * 100)}%
                  </strong>{' '}
                  over {bestStrat[1].total} executions ({formatCurrency(bestStrat[1].pnl, account.currency, { showSign: true })}).
                </p>
              </div>
            )}

            {topMistake ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  CRITICAL LEAKAGE DETECTED
                </div>
                <p className="text-[11px] text-slate-300">
                  <strong className="text-rose-400">{topMistake[0]}</strong> accounted for {topMistake[1]} friction events. Eliminating this single mistake will protect your equity curve.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-300">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-400 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CLEAN EXECUTION PROFILE
                </div>
                <p className="text-[11px] text-slate-400">
                  Zero major systemic leakages flagged in current sample. Continue executing according to strict pre-trade rules.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={() => onNavigateToTab('AI_COACH')}
          className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-xs font-military font-bold tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <Bot className="w-4 h-4" />
          <span>CONSULT AI COACH</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
