import React, { useState, useMemo } from 'react';
import {
  Target,
  Trophy,
  Calendar,
  AlertTriangle,
  Compass,
  CheckCircle2,
  TrendingUp,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  Info,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { AccountSettings, Trade } from '../../types';
import { calculateGoalScenarios } from '../../utils/fundedRiskEngine';
import { formatCurrency, safeNumber } from '../../utils/currencyFormatter';

interface GoalSettingPlannerProps {
  account: AccountSettings;
  trades: Trade[];
  onUpdateAccount?: (account: AccountSettings) => void;
}

export const GoalSettingPlanner: React.FC<GoalSettingPlannerProps> = ({
  account,
  trades,
  onUpdateAccount,
}) => {
  const currency = account.currency || 'USD';
  const startBal = Math.max(1, safeNumber(account.initialBalance, 5000));
  const defaultTarget = account.fundedConfig?.profitTargets?.phase1TargetDollars || Math.round(startBal * 0.1);

  const [targetDollars, setTargetDollars] = useState<number>(defaultTarget);
  const [targetDaysDeadline, setTargetDaysDeadline] = useState<number>(30);
  const [monthlyTargetPct, setMonthlyTargetPct] = useState<number>(6);
  const [weeklyProcessGoal, setWeeklyProcessGoal] = useState<string>(
    'Maintain maximum 2 trades per session and 1:2 R:R minimum target on all setups.'
  );
  const [dailyDisciplineGoal, setDailyDisciplineGoal] = useState<string>(
    'Strict 0.5% max risk per execution; zero trade entry after any stop-out without a 30-minute cooldown.'
  );

  const scenarios = useMemo(
    () => calculateGoalScenarios(account, trades, targetDollars, targetDaysDeadline),
    [account, trades, targetDollars, targetDaysDeadline]
  );

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-purple-400">Deterministic Engine</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">Account Preservation Over Speed</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight mt-0.5">
                Target Planning & Execution Scenarios
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-right">
              <span className="text-slate-500 block text-[10px] uppercase font-sans">Target Remaining</span>
              <span className="font-bold text-purple-300 text-sm">
                {formatCurrency(scenarios.remainingTargetDollars, currency)} ({scenarios.progressPercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conflict Warning If Deadline Forces Unsafe Risk */}
      {scenarios.hasConflict && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-200 block text-sm">
                Risk Engine Conflict Detected
              </span>
              <p className="mt-0.5 leading-relaxed text-rose-300/90">
                {scenarios.conflictExplanation}
              </p>
            </div>
          </div>

          {scenarios.suggestedAlternatives && scenarios.suggestedAlternatives.length > 0 && (
            <div className="mt-2 pt-2 border-t border-rose-900/50 pl-6 space-y-1">
              <span className="font-semibold text-rose-200 block">Recommended Alternatives:</span>
              <ul className="list-disc space-y-0.5 text-rose-300/80">
                {scenarios.suggestedAlternatives.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Target Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-500 block">Starting Balance</span>
          <span className="text-base font-bold text-slate-100 font-mono mt-0.5 block">
            {formatCurrency(scenarios.startingBalance, currency)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-500 block">Current Balance</span>
          <span className="text-base font-bold text-slate-100 font-mono mt-0.5 block">
            {formatCurrency(scenarios.currentBalance, currency)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-500 block">Profit Target</span>
          <span className="text-base font-bold text-purple-400 font-mono mt-0.5 block">
            {formatCurrency(scenarios.profitTargetDollars, currency)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <span className="text-slate-500 block">Remaining Drawdown Buffer</span>
          <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
            {formatCurrency(scenarios.drawdownCapacityRemaining, currency)}
          </span>
        </div>
      </div>

      {/* Three Deterministic Projection Scenarios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100">
            Statistical Execution Scenarios
          </h3>
          <span className="text-xs text-slate-500">
            Projections are mathematical estimates based on stated assumptions, not financial guarantees.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Scenario 1: Conservative */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Conservative
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {scenarios.conservative.winRate}% WR · 1:{scenarios.conservative.riskReward} RR
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-slate-100">
                  {scenarios.conservative.daysRequired} Days
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Est. Completion: {scenarios.conservative.targetDate}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                {scenarios.conservative.assumptions}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500 flex justify-between">
              <span>Expected Trades:</span>
              <span className="font-mono text-slate-300 font-semibold">{scenarios.conservative.expectedTradesCount}</span>
            </div>
          </div>

          {/* Scenario 2: Baseline */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/40 shadow-lg shadow-purple-500/5 flex flex-col justify-between space-y-3 relative">
            <div className="absolute -top-2.5 right-3 text-[10px] font-bold uppercase px-2 py-0.2 rounded bg-purple-500 text-slate-950">
              Baseline Target
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Baseline Edge
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {scenarios.baseline.winRate}% WR · 1:{scenarios.baseline.riskReward} RR
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-slate-100">
                  {scenarios.baseline.daysRequired} Days
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Est. Completion: {scenarios.baseline.targetDate}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                {scenarios.baseline.assumptions}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500 flex justify-between">
              <span>Expected Trades:</span>
              <span className="font-mono text-slate-300 font-semibold">{scenarios.baseline.expectedTradesCount}</span>
            </div>
          </div>

          {/* Scenario 3: Optimistic */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Optimistic Streak
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {scenarios.optimistic.winRate}% WR · 1:{scenarios.optimistic.riskReward} RR
                </span>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold font-mono text-slate-100">
                  {scenarios.optimistic.daysRequired} Days
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Est. Completion: {scenarios.optimistic.targetDate}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                {scenarios.optimistic.assumptions}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-500 flex justify-between">
              <span>Expected Trades:</span>
              <span className="font-mono text-slate-300 font-semibold">{scenarios.optimistic.expectedTradesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Process & Discipline Goals Configuration */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
        <h3 className="font-bold text-slate-200">Process & Discipline Commitments</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Weekly Process Standard
            </label>
            <textarea
              rows={2}
              value={weeklyProcessGoal}
              onChange={(e) => setWeeklyProcessGoal(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-sans text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Daily Discipline Standard
            </label>
            <textarea
              rows={2}
              value={dailyDisciplineGoal}
              onChange={(e) => setDailyDisciplineGoal(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-sans text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
      {/* Educational & Risk Warning Callout */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>CAPITAL PRESERVATION DIRECTIVE — NO MARTINGALE / NO OVERLEVERAGING</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          Prime Pip FX strictly prohibits and flags revenge sizing. Never increase risk parameters simply because an account is trailing its profit target or has endured consecutive losses. Streak variance is an unavoidable mathematical reality of trading; increasing risk under drawdown is the primary cause of evaluation breach.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-900 text-[11px]">
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="font-bold text-cyan-300 block mb-1">Fixed-Fractional Sizing (Evaluation Standard)</span>
            <span className="text-slate-400 leading-relaxed">
              Calculates lot size strictly as a fixed risk budget ($/%) of starting or current balance. This prevents geometric drawdown acceleration during adverse market regimes and ensures you survive losing streaks.
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
            <span className="font-bold text-purple-300 block mb-1">Dynamic Compounding Sizing</span>
            <span className="text-slate-400 leading-relaxed">
              Reinvests profits by scaling lot sizes with growing equity. Highly effective during confirmed expansion phases, but must be capped with strict safety buffers on prop evaluation challenges.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
