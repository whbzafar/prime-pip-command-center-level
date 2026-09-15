import React from 'react';
import {
  ShieldAlert,
  Crosshair,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Info,
  ChevronRight,
} from 'lucide-react';
import { AccountSettings, Trade } from '../../types';
import { DashboardMetrics } from '../../utils/tradeAnalytics';
import { formatCurrency } from '../../utils/currencyFormatter';

interface DashboardRiskDefenseProps {
  metrics: DashboardMetrics;
  account: AccountSettings;
  trades: Trade[];
  onNavigateToTab: (tab: string) => void;
}

export const DashboardRiskDefense: React.FC<DashboardRiskDefenseProps> = ({
  metrics,
  account,
  trades,
  onNavigateToTab,
}) => {
  const master1Percent = metrics.accountBalance * 0.01;
  const dailyLossLimit = metrics.accountBalance * ((account.maxDailyLossPercent || 2) / 100);

  // Calculate today's executed trades and losses
  const todayStartEpoch = new Date();
  todayStartEpoch.setHours(0, 0, 0, 0);

  const todayTrades = trades.filter((t) => {
    try {
      return new Date(t.date) >= todayStartEpoch;
    } catch {
      return false;
    }
  });

  const todayLosses = todayTrades
    .filter((t) => (t.profitLoss || 0) < 0)
    .reduce((acc, t) => acc + Math.abs(t.profitLoss || 0), 0);

  const remainingDailyRisk = Math.max(0, dailyLossLimit - todayLosses);
  const isDailyRiskHit = todayLosses >= dailyLossLimit;
  const isQuotaHit = metrics.tradesToday >= account.maxDailyTrades;

  // Defcon status
  const defconLevel = isDailyRiskHit || isQuotaHit ? 5 : metrics.tradesToday === 1 ? 3 : 1;

  // Streak & contextual tactical advice
  const lastClosedTrade = trades.find((t) => t.result && t.result !== 'RUNNING');
  const lastPnl = lastClosedTrade ? lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0 : 0;

  let tacticalAdvice = `Standard 1% risk allocation is ${formatCurrency(master1Percent, account.currency)}. Strictly limit trade frequency to a maximum of ${account.maxDailyTrades} high-probability setups per day.`;
  if (lastClosedTrade) {
    if (lastPnl < 0) {
      tacticalAdvice = `Previous trade resulted in a loss of ${formatCurrency(Math.abs(lastPnl), account.currency)}. Maintain strict 1% risk (${formatCurrency(master1Percent, account.currency)}). Never revenge trade or increase lot sizes to recover losses.`;
    } else if (lastPnl > 0) {
      tacticalAdvice = `Previous trade yielded +${formatCurrency(lastPnl, account.currency)}. Maintain the identical 1% risk discipline. Do not get overconfident or overtrade on house money.`;
    }
  }

  return (
    <div className="rounded-2xl bg-[#090D16] border border-slate-800/80 p-5 shadow-xl flex flex-col justify-between space-y-4">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
              RISK DEFENSE & ALLOCATION
            </h3>
          </div>
          <span
            className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded border uppercase ${
              defconLevel === 5
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                : defconLevel === 3
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
            }`}
          >
            DEFCON {defconLevel}: {defconLevel === 5 ? 'HALT' : defconLevel === 3 ? 'VIGILANCE' : 'OPTIMAL'}
          </span>
        </div>

        {/* Tactical Metrics 4-Box */}
        <div className="mt-3.5 grid grid-cols-2 gap-2.5 font-mono-code text-xs">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">1% BASELINE RISK</span>
            <div className="text-base font-bold text-amber-400 mt-1">
              {formatCurrency(master1Percent, account.currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Per-trade max exposure</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">DAILY LIMIT (2%)</span>
            <div className="text-base font-bold text-slate-100 mt-1">
              {formatCurrency(dailyLossLimit, account.currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Maximum capital loss/day</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">DAILY RISK REMAINING</span>
            <div
              className={`text-base font-bold mt-1 ${
                remainingDailyRisk <= 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {formatCurrency(remainingDailyRisk, account.currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Buffer before lockout</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">DAILY TRADE QUOTA</span>
            <div
              className={`text-base font-bold mt-1 ${
                isQuotaHit ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {metrics.tradesToday} / {account.maxDailyTrades}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {isQuotaHit ? 'Locked for today' : `${account.maxDailyTrades - metrics.tradesToday} slots available`}
            </div>
          </div>
        </div>

        {/* Tactical Guidance Callout */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs font-mono-code text-slate-300 leading-relaxed">
          <div className="flex items-center gap-1.5 text-[10px] font-military font-bold text-amber-400 uppercase tracking-wider mb-1">
            <Info className="w-3 h-3" />
            TACTICAL RISK DIRECTIVE
          </div>
          <p>{tacticalAdvice}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigateToTab('LOT_SIZE')}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/40 text-emerald-300 text-xs font-military font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>LOT CALCULATOR</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('RISK')}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-xs font-military font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>RISK RULES</span>
        </button>
      </div>
    </div>
  );
};
