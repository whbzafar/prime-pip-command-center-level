import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckSquare,
  Square,
  AlertTriangle,
  Award,
  Zap,
  RotateCcw,
  Target,
  Sparkles,
} from 'lucide-react';
import { AccountSettings, UserAccount, Trade } from '../../types';

interface TradingDisciplineSectionProps {
  account?: AccountSettings;
  currentUser?: UserAccount | null;
  trades?: Trade[];
}

const PRE_FLIGHT_ITEMS = [
  { id: 'pf-1', text: 'Pre-Trade Plan Written: Explicit entry, stop loss, and take profit documented.' },
  { id: 'pf-2', text: 'Risk Ceiling Respected: Maximum 1.0% account capital risked on this execution.' },
  { id: 'pf-3', text: 'High-Impact News Cleared: No red-folder economic releases within 30 minutes.' },
  { id: 'pf-4', text: 'Higher Timeframe Alignment: 4H and Daily market structure favor direction.' },
  { id: 'pf-5', text: 'Clean Liquidity Sweep: Liquidity taken at key swing high/low prior to entry.' },
  { id: 'pf-6', text: 'Minimum 1:1.5 Risk-to-Reward: Favorable reward-to-risk ratio mathematically validated.' },
  { id: 'pf-7', text: 'Daily Trades Limit: Have not taken 2 trades already today.' },
  { id: 'pf-8', text: 'Emotional Neutrality: Mind is free of anger, revenge urge, or urgent need to win.' },
  { id: 'pf-9', text: 'Pre-Set Stop Loss: Stop loss is placed immediately on order entry, never manual.' },
  { id: 'pf-10', text: 'Total Outcome Acceptance: Accepted that the stop loss may hit and I am at peace with it.' },
];

export const TradingDisciplineSection: React.FC<TradingDisciplineSectionProps> = ({
  account,
  currentUser,
  trades = [],
}) => {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleResetChecklist = () => {
    setCheckedIds([]);
  };

  const handleCheckAll = () => {
    setCheckedIds(PRE_FLIGHT_ITEMS.map((i) => i.id));
  };

  const completedCount = checkedIds.length;
  const isAllPassed = completedCount === PRE_FLIGHT_ITEMS.length;

  // Calculate rule compliance from trades
  const closedTrades = trades.filter((t) => t.status !== 'OPEN');
  const planFollowedCount = closedTrades.filter((t) => t.postPsychology?.followedPlan ?? true).length;
  const adherenceRate = closedTrades.length > 0 ? Math.round((planFollowedCount / closedTrades.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-code uppercase">
            <span>Discipline Compliance Rate</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono-code font-bold text-emerald-400">
            {adherenceRate}%
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            {planFollowedCount} of {closedTrades.length} trades strictly executed per written plan.
          </p>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-code uppercase">
            <span>Daily Execution Limit</span>
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-mono-code font-bold text-slate-100">
            {account?.maxDailyTrades || 2} <span className="text-xs font-normal text-slate-400">Max / Day</span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            Hard stop after {account?.maxDailyTrades || 2} trades prevents fatigue overtrading.
          </p>
        </div>

        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-code uppercase">
            <span>Risk Ceiling</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-mono-code font-bold text-sky-400">
            {account?.maxRiskPerTradePercent || 1.0}% <span className="text-xs font-normal text-slate-400">Max / Trade</span>
          </div>
          <p className="text-[10px] text-slate-500 font-sans">
            Preserves 99% of capital through any adverse market variance.
          </p>
        </div>
      </div>

      {/* 10-Point Pre-Flight Execution Checklist */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-military font-bold text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                10-POINT PRE-FLIGHT DISCIPLINE PROTOCOL
              </span>
              <span className="text-[10px] font-mono-code text-slate-400">
                Score: {completedCount}/10
              </span>
            </div>
            <h3 className="text-base font-military font-bold text-slate-100 mt-1">
              Pre-Execution Discipline Checklist
            </h3>
            <p className="text-xs text-slate-400 font-sans mt-0.5">
              Run this 10-point checklist before every order to enforce mechanical trading consistency.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCheckAll}
              className="text-xs font-mono-code px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700 transition"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleResetChecklist}
              className="text-xs font-mono-code px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Checklist items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRE_FLIGHT_ITEMS.map((item, idx) => {
            const isChecked = checkedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleCheck(item.id)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-slate-200'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                {isChecked ? (
                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs font-mono-code leading-relaxed">
                  <span className={`font-bold mr-1 ${isChecked ? 'text-emerald-400' : 'text-slate-500'}`}>
                    #{idx + 1}.
                  </span>
                  <span>{item.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pre-Flight Status Result */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
            isAllPassed
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
              : 'bg-blue-500/10 border-blue-500/30 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {isAllPassed ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-cyan-400 shrink-0" />
            )}
            <div>
              <span className="text-xs font-military font-bold uppercase tracking-wider block">
                {isAllPassed ? 'PRE-FLIGHT CLEARED FOR EXECUTION' : 'EXECUTION HOLD — CHECKLIST INCOMPLETE'}
              </span>
              <p className="text-[11px] font-mono-code mt-0.5">
                {isAllPassed
                  ? 'All 10 discipline criteria met. You are mentally and technically prepared to execute.'
                  : `${10 - completedCount} criteria remaining. Do not click market execution until all conditions are verified.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
