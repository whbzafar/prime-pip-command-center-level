import React from 'react';
import { Sparkles, ShieldAlert, Compass, Coffee, ArrowRight } from 'lucide-react';
import { Trade } from '../../types';
import { CalmingSuiteTab } from './types';

interface SmartCalmRecommendationsProps {
  trades?: Trade[];
  onSelectTab: (tab: CalmingSuiteTab) => void;
}

export const SmartCalmRecommendations: React.FC<SmartCalmRecommendationsProps> = ({
  trades = [],
  onSelectTab,
}) => {
  // Inspect recent trade outcomes
  const recentClosedTrades = trades.filter((t) => t.status === 'CLOSED');
  const lastTrade = recentClosedTrades[0];
  const isLastTradeLoss = lastTrade && (lastTrade.pnl ?? 0) < 0;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/60 border border-teal-500/30 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0">
          <Sparkles className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
              {isLastTradeLoss ? 'RECOMMENDED: POST-LOSS RESET' : 'INTELLIGENT CALM ANCHOR'}
            </span>
            <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20">
              SMART
            </span>
          </div>
          <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
            {isLastTradeLoss
              ? 'A recent trade resulted in a loss. Take a 3-minute neutral cooldown before another execution.'
              : 'Keep your nervous system steady. 4 minutes of Box Breathing will sharpen your chart focus.'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSelectTab(isLastTradeLoss ? 'POST_LOSS_RESET' : 'BREATHING')}
        className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-military font-bold tracking-wider uppercase hover:bg-teal-400 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
      >
        <span>{isLastTradeLoss ? 'START POST-LOSS RESET' : 'START 4-MIN BREATHING'}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
