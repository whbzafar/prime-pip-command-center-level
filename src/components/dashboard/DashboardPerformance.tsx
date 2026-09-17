import React from 'react';
import {
  Award,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Flame,
  Activity,
  BarChart2,
} from 'lucide-react';
import { AccountSettings, Trade } from '../../types';
import { DashboardMetrics } from '../../utils/tradeAnalytics';
import { formatCurrency } from '../../utils/currencyFormatter';

interface DashboardPerformanceProps {
  metrics: DashboardMetrics;
  account: AccountSettings;
  trades?: Trade[];
  scores?: {
    overallTradingScore?: number;
    riskManagement?: number;
    psychology?: number;
    strategyExecution?: number;
    discipline?: number;
    consistency?: number;
    riskScore?: number;
    psychologyScore?: number;
    strategyScore?: number;
    executionScore?: number;
    disciplineScore?: number;
    consistencyScore?: number;
  };
  onNavigateToTab: (tab: string) => void;
}

export const DashboardPerformance: React.FC<DashboardPerformanceProps> = ({
  metrics,
  account,
  trades = [],
  scores,
  onNavigateToTab,
}) => {
  const safeTrades = trades || [];
  const overallScore = scores?.overallTradingScore ?? 85;
  const scoreCategories = [
    { label: 'Risk Management', score: scores?.riskManagement ?? scores?.riskScore ?? 85, tab: 'RISK' },
    { label: 'Psychology & Discipline', score: scores?.psychology ?? scores?.psychologyScore ?? 80, tab: 'PSYCHOLOGY' },
    { label: 'Strategy Alignment', score: scores?.strategyExecution ?? scores?.strategyScore ?? 85, tab: 'PERFORMANCE' },
    { label: 'Execution Precision', score: scores?.strategyExecution ?? scores?.executionScore ?? 85, tab: 'JOURNAL' },
    { label: 'Rule Adherence', score: scores?.discipline ?? scores?.disciplineScore ?? 85, tab: 'RISK' },
    { label: 'Session Consistency', score: scores?.consistency ?? scores?.consistencyScore ?? 80, tab: 'PERFORMANCE' },
  ];

  return (
    <div className="rounded-2xl bg-[#090D16] border border-slate-800/80 p-5 shadow-xl flex flex-col justify-between space-y-4">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
              TRADER PERFORMANCE LAB
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('PERFORMANCE')}
            className="text-[10px] font-mono-code text-cyan-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <span>FULL AUDIT</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Score and breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3.5 items-center">
          {/* Circular Score Gauge */}
          <div className="flex flex-col items-center justify-center p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
            <div className="relative flex items-center justify-center">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className="stroke-slate-800"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  className={`${
                    scores.overallTradingScore >= 80
                      ? 'stroke-emerald-400'
                      : scores.overallTradingScore >= 60
                      ? 'stroke-cyan-400'
                      : 'stroke-rose-400'
                  } transition-all duration-1000 ease-out`}
                  strokeWidth="7"
                  strokeDasharray={239}
                  strokeDashoffset={239 - (239 * scores.overallTradingScore) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-2xl font-military font-bold text-slate-100">
                  {scores.overallTradingScore}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono-code">/ 100</span>
              </div>
            </div>
            <span className="mt-1.5 text-[10px] font-military font-bold tracking-wider text-cyan-400">
              {scores.overallTradingScore >= 85
                ? 'ELITE OPERATOR'
                : scores.overallTradingScore >= 70
                ? 'PROFESSIONAL'
                : 'DEVELOPING'}
            </span>
          </div>

          {/* Categories */}
          <div className="sm:col-span-2 space-y-2">
            {scoreCategories.map((cat) => {
              const isHigh = cat.score >= 80;
              const isMed = cat.score >= 60 && cat.score < 80;
              return (
                <div
                  key={cat.label}
                  onClick={() => onNavigateToTab(cat.tab)}
                  className="text-xs group cursor-pointer hover:bg-slate-800/30 p-1 rounded transition"
                  title={`Click to view ${cat.label} details`}
                >
                  <div className="flex items-center justify-between mb-0.5 text-[11px]">
                    <span className="text-slate-300 font-medium group-hover:text-cyan-400 transition-colors">
                      {cat.label}
                    </span>
                    <span className="font-mono-code font-bold text-slate-200">
                      <span
                        className={
                          isHigh
                            ? 'text-emerald-400'
                            : isMed
                            ? 'text-cyan-400'
                            : 'text-rose-400'
                        }
                      >
                        {cat.score}
                      </span>
                      <span className="text-slate-500 font-normal"> / 100</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isHigh
                          ? 'bg-emerald-400'
                          : isMed
                          ? 'bg-cyan-400'
                          : 'bg-rose-400'
                      }`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4 Key Vital Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 font-mono-code text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">WIN RATE</span>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              {metrics.winRate.toFixed(1)}%
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">
              {trades.filter((t) => (t.profitLoss || 0) > 0).length}W -{' '}
              {trades.filter((t) => (t.profitLoss || 0) < 0).length}L
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">RISK : REWARD</span>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              1 : {metrics.riskRewardRatio.toFixed(2)}
            </div>
            <div className="text-[9px] text-emerald-400 mt-0.5">
              +{metrics.avgWinR.toFixed(1)}R avg win
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">PROFIT FACTOR</span>
            <div
              className={`text-sm font-bold mt-0.5 ${
                metrics.profitFactor >= 2.0
                  ? 'text-emerald-400'
                  : metrics.profitFactor >= 1.2
                  ? 'text-slate-100'
                  : 'text-rose-400'
              }`}
            >
              {metrics.profitFactor.toFixed(2)}
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Institutional target &gt; 1.8</div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block uppercase">MAX DRAWDOWN</span>
            <div
              className={`text-sm font-bold mt-0.5 ${
                metrics.maxDrawdownPercent <= 3.0 ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {metrics.maxDrawdownPercent.toFixed(2)}%
            </div>
            <div className="text-[9px] text-slate-500 mt-0.5">Peak-to-trough</div>
          </div>
        </div>
      </div>

      {/* Action footer */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigateToTab('JOURNAL')}
          className="py-1.5 px-3 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-military font-bold tracking-wider flex items-center gap-1.5 transition cursor-pointer"
        >
          <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>VIEW JOURNAL ({trades.length})</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('PERFORMANCE')}
          className="py-1.5 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-amber-300 text-xs font-military font-bold tracking-wider flex items-center gap-1.5 transition cursor-pointer"
        >
          <span>ANALYZE SETUPS</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
