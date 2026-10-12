import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Building2,
  DollarSign,
  Calculator,
  RefreshCw,
  ExternalLink,
  Layers,
  Clock,
  Compass,
  ArrowRight,
  Info,
  Calendar,
  Check,
  RotateCcw,
} from 'lucide-react';
import { AccountSettings, Trade, RiskDecisionState } from '../../types';
import {
  evaluateFundedAccountRisk,
  getEffectiveFundedConfig,
  isFundedAccount,
  getPhaseLabel,
  getDrawdownTypeLabel,
  calculateDailyDrawdown,
  calculateOverallDrawdown,
  calculateTrailingDrawdown,
  calculatePhaseProgress,
  resetDemoAccountState,
} from '../../utils/fundedRiskEngine';
import { formatCurrency, safeNumber } from '../../utils/currencyFormatter';
import { PreTradePositionCalculator } from './PreTradePositionCalculator';

interface PersonalizedAccountDashboardProps {
  account: AccountSettings;
  trades: Trade[];
  onUpdateAccount: (account: AccountSettings) => void;
  onOpenNewTrade?: (prefill?: Partial<Trade>) => void;
  onOpenAccountSwitcher?: () => void;
}

export const PersonalizedAccountDashboard: React.FC<PersonalizedAccountDashboardProps> = ({
  account,
  trades,
  onUpdateAccount,
  onOpenNewTrade,
  onOpenAccountSwitcher,
}) => {
  const currency = account.currency || 'USD';
  const isFunded = isFundedAccount(account);
  const isDemo = account.isDemo || account.accountKind === 'DEMO' || account.accountType === 'DEMO';
  const config = useMemo(() => getEffectiveFundedConfig(account), [account]);
  const evaluation = useMemo(() => evaluateFundedAccountRisk(account, trades), [account, trades]);

  // Demo reset state
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const handleResetDemoAccount = () => {
    const reset = resetDemoAccountState(account);
    onUpdateAccount(reset);
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  const closedTrades = useMemo(
    () => trades.filter((t) => t.status !== 'OPEN'),
    [trades]
  );
  const openTradesCount = useMemo(
    () => trades.filter((t) => t.status === 'OPEN').length,
    [trades]
  );
  const latestLoggedTrade = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    return trades[0];
  }, [trades]);

  const winCount = closedTrades.filter((t) => safeNumber(t.profitLoss, 0) > 0).length;
  const lossCount = closedTrades.filter((t) => safeNumber(t.profitLoss, 0) < 0).length;
  const netPnL = closedTrades.reduce((acc, t) => acc + safeNumber(t.profitLoss, 0), 0);

  // Quick General Risk Settings updater so Next Trade Guidance reacts live to General Settings
  const handleQuickRiskSettingUpdate = (updates: {
    preferredRiskPercent?: number;
    maxRiskPerTradePercent?: number;
    riskMode?: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE';
    safetyBufferPercent?: number;
  }) => {
    const nextPreferred = updates.preferredRiskPercent ?? config.preferredRiskPercent ?? 0.5;
    const nextMax = Math.max(nextPreferred, updates.maxRiskPerTradePercent ?? config.maxRiskPerTradePercent ?? 1.0);
    const nextMode = updates.riskMode ?? config.riskMode ?? 'BALANCED';
    const nextBuffer = updates.safetyBufferPercent ?? config.safetyBufferPercent ?? 20;

    onUpdateAccount({
      ...account,
      maxRiskPerTradePercent: nextMax,
      fundedConfig: {
        ...config,
        preferredRiskPercent: nextPreferred,
        maxRiskPerTradePercent: nextMax,
        riskMode: nextMode,
        safetyBufferPercent: nextBuffer,
      },
      updatedAt: Date.now(),
    });
  };

  // Decision State Badge Helper
  const getDecisionBadge = () => {
    switch (evaluation.verdict) {
      case 'TAKE_TRADE':
        return {
          state: 'TAKE',
          badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          title: 'TAKE TRADE — FULLY COMPLIANT',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        };
      case 'REDUCE_RISK':
        return {
          state: 'REDUCE',
          badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          title: 'REDUCE RISK — DEFENSIVE POSITION SIZING',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        };
      case 'STOP_TRADING':
        return {
          state: 'STOP',
          badge: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          title: 'STOP TRADING — DRAWDOWN LIMIT BREACHED',
          icon: <AlertOctagon className="w-5 h-5 text-rose-400" />,
        };
      case 'TARGET_PASSED':
        return {
          state: 'STOP',
          badge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
          title: 'TARGET PASSED — CEASE TRADING & LOCK EVALUATION',
          icon: <CheckCircle2 className="w-5 h-5 text-cyan-400" />,
        };
      default:
        return {
          state: 'REVIEW',
          badge: 'bg-slate-800 border-slate-700 text-slate-300',
          title: 'REVIEW INPUTS',
          icon: <Info className="w-5 h-5 text-slate-400" />,
        };
    }
  };

  const decision = getDecisionBadge();

  return (
    <div className="space-y-6 text-slate-100">
      {/* SECTION A: ACCOUNT OVERVIEW */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                isFunded
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                  : isDemo
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {isFunded ? <Building2 className="w-6 h-6" /> : isDemo ? <Compass className="w-6 h-6" /> : <DollarSign className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-200">{account.accountName}</span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-400">{account.broker || 'Self-Directed'}</span>
                <span className="text-slate-600">·</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    isFunded
                      ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                      : isDemo
                      ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isFunded ? 'FUNDED TRADING' : isDemo ? 'SIMULATED DEMO' : 'PERSONAL CAPITAL'}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-100 tracking-tight mt-0.5">
                {isFunded ? `${config.firmName} — ${getPhaseLabel(config.phase)}` : account.accountName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isDemo && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="py-1.5 px-3 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition flex items-center gap-1.5"
                title="Reset demo account to initial starting balance"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Account</span>
              </button>
            )}

            {onOpenAccountSwitcher && (
              <button
                onClick={onOpenAccountSwitcher}
                className="py-1.5 px-3 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
              >
                Switch Account
              </button>
            )}
          </div>
        </div>

        {/* Demo Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-xs space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-sm">Reset Demo Account Confirmation</span>
                <p className="mt-0.5 text-cyan-200/90 leading-relaxed">
                  Resetting will restore your demo balance and equity back to the starting virtual capital of {formatCurrency(account.initialBalance, currency)}. This operation is explicit and cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 pl-6">
              <button
                onClick={handleResetDemoAccount}
                className="py-1.5 px-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition"
              >
                Confirm Reset to {formatCurrency(account.initialBalance, currency)}
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-1.5 px-3 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {resetSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Demo account balance successfully reset to {formatCurrency(account.initialBalance, currency)}.</span>
          </div>
        )}

        {/* Account Size & Current Equity Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-slate-500 block">Account Size</span>
            <span className="text-lg font-bold font-mono text-slate-100 mt-0.5 block">
              {formatCurrency(evaluation.accountSize, currency)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Starting capital baseline
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-slate-500 block">Current Balance</span>
            <span className="text-lg font-bold font-mono text-slate-100 mt-0.5 block">
              {formatCurrency(evaluation.currentBalance, currency)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Closed trade P&L
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-slate-500 block">Current Equity</span>
            <span className="text-lg font-bold font-mono text-slate-100 mt-0.5 block">
              {formatCurrency(evaluation.currentEquity, currency)}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Includes open floating P&L
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
            <span className="text-slate-500 block">Rule Profile Version</span>
            <span className="text-sm font-bold text-purple-300 mt-1 block truncate">
              {account.ruleProfileVersion || config.rulesProfileName || 'PPFX-STD-2026'}
            </span>
            <span className="text-[10px] text-emerald-400 mt-0.5 block">
              {account.ruleVerificationStatus || 'VERIFIED'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION B: RISK PROTECTION & DRAWDOWN BOUNDARIES */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">
              Risk Protection & Capital Boundaries
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {getDrawdownTypeLabel(evaluation.drawdownType)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          {/* Daily Drawdown Capacity */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-sans">
              <span className="text-slate-400">Daily Drawdown Boundary</span>
              <span className="text-slate-500 text-[11px]">Resets Daily</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-bold ${
                  evaluation.remainingDailyDrawdown <= 0
                    ? 'text-rose-400'
                    : evaluation.dailyDrawdownUsedPercent >= 75
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {formatCurrency(evaluation.remainingDailyDrawdown, currency)}
              </span>
              <span className="text-slate-400 text-xs">
                / {formatCurrency(evaluation.dailyDrawdownLimitDollars, currency)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden font-sans">
              <div
                className={`h-full transition-all ${
                  evaluation.dailyDrawdownUsedPercent >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, evaluation.dailyDrawdownUsedPercent))}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 font-sans block">
              Floor: {formatCurrency(evaluation.dailyBreachFloor, currency)} · Used: {evaluation.dailyDrawdownUsedPercent}%
            </span>
          </div>

          {/* Overall Loss Capacity */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-sans">
              <span className="text-slate-400">Maximum Overall Loss</span>
              <span className="text-slate-500 text-[11px]">Liquidation Floor</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-bold ${
                  evaluation.remainingOverallDrawdown <= 0 ? 'text-rose-400' : 'text-slate-100'
                }`}
              >
                {formatCurrency(evaluation.remainingOverallDrawdown, currency)}
              </span>
              <span className="text-slate-400 text-xs">
                / {formatCurrency(evaluation.overallDrawdownLimitDollars, currency)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden font-sans">
              <div
                className="h-full bg-cyan-500 transition-all"
                style={{ width: `${Math.min(100, Math.max(0, evaluation.overallDrawdownUsedPercent))}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 font-sans block">
              Active Floor: {formatCurrency(evaluation.overallBreachFloor, currency)} · Used: {evaluation.overallDrawdownUsedPercent}%
            </span>
          </div>

          {/* Personal Safety Buffer */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-sans">
            <span className="text-slate-400 block">Personal Safety Cushion</span>
            <div className="flex items-baseline justify-between font-mono">
              <span className="text-2xl font-bold text-cyan-400">
                {evaluation.safetyBufferPercent}% Buffer
              </span>
              <span className="text-slate-400 text-xs">
                {formatCurrency(evaluation.usableDailyDrawdown, currency)} Usable
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              Guards {evaluation.safetyBufferPercent}% of your daily drawdown capacity against market slippage and spread spikes.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION C: GOAL PROGRESS */}
      {isFunded && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-bold text-slate-100">
                Phase Profit-Target Progress
              </h2>
            </div>
            <span className="text-xs font-mono font-semibold text-purple-300">
              {evaluation.profitProgressPercent}% Completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block font-sans">Current Net Profit</span>
              <span
                className={`text-xl font-bold mt-0.5 block ${
                  evaluation.currentProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {evaluation.currentProfitLoss >= 0 ? '+' : ''}
                {formatCurrency(evaluation.currentProfitLoss, currency)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block font-sans">Active Target Dollars</span>
              <span className="text-xl font-bold text-purple-400 mt-0.5 block">
                {formatCurrency(evaluation.activeProfitTargetDollars, currency)} ({evaluation.activeProfitTargetPercent}%)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block font-sans">Amount Required to Pass</span>
              <span className="text-xl font-bold text-slate-200 mt-0.5 block">
                {formatCurrency(evaluation.amountRequiredToPass, currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SECTION D: NEXT-TRADE GUIDANCE (TAKE, REDUCE, STOP, REVIEW) + GENERAL SETTINGS */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/40 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Next Trade Guidance & General Risk Settings
              </h2>
              <p className="text-[11px] text-slate-400">
                Dynamically prescribes your next trade risk % based on your General Settings and last trade outcome (Win / Loss).
              </p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${decision.badge}`}>
            {decision.icon}
            <span>{decision.title}</span>
          </div>
        </div>

        {/* General Risk Settings Bar (Preferred Risk %, Max Risk %, Risk Mode) */}
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-cyan-400 uppercase text-[11px]">
              General Settings — Base Risk %:
            </span>
            {[0.25, 0.5, 0.75, 1.0].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickRiskSettingUpdate({ preferredRiskPercent: pct })}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[11px] border transition cursor-pointer ${
                  Math.abs(evaluation.preferredRiskPercent - pct) < 0.05
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-slate-400 uppercase text-[11px]">
              Progression Mode:
            </span>
            {(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleQuickRiskSettingUpdate({ riskMode: mode })}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold text-[10px] border transition cursor-pointer ${
                  evaluation.riskMode === mode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Next Trade Progression Prescription Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-950 to-slate-950 border border-cyan-500/40 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 block">
                PRESCRIBED NEXT TRADE RISK %
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold font-mono text-emerald-400">
                  {evaluation.recommendedRiskPercent}%
                </span>
                <span className="text-sm font-mono font-semibold text-cyan-300">
                  ({formatCurrency(evaluation.recommendedRiskDollars, currency)})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                Base Setting: {evaluation.preferredRiskPercent}% • Max Allowed: {evaluation.maxRiskPerTradePercent}%
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Loss Streak / Win Streak:</span>
              <span className="font-bold text-slate-200">
                {evaluation.consecutiveLosses > 0
                  ? `${evaluation.consecutiveLosses} Loss Streak (Reduced)`
                  : evaluation.consecutiveWins > 0
                  ? `${evaluation.consecutiveWins} Win Streak (Locked Cushion)`
                  : 'Neutral Streak'}
              </span>
            </div>
          </div>

          <div className="lg:col-span-8 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2.5 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-cyan-300 uppercase font-mono text-[11px]">
                HOW TO PROCEED ON YOUR NEXT TRADE:
              </span>
              <span className="text-[11px] font-mono text-amber-300">
                Controlling Rule: {evaluation.limitingFactor}
              </span>
            </div>
            <p className="text-slate-200 leading-relaxed font-medium">
              {evaluation.nextTradeRiskQuestionAnswer}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-900 pt-2">
              {evaluation.shouldTakeTradeQuestionAnswer}
            </p>
          </div>
        </div>

        {/* Embedded Pre-Trade Position Calculator */}
        <div className="pt-2">
          <PreTradePositionCalculator
            account={account}
            trades={trades}
            onApplyToJournal={onOpenNewTrade}
          />
        </div>
      </div>

      {/* SECTION E: LATEST LOGGED TRADE & ACCOUNT EXECUTION HISTORY */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">
              Logged Trades on Main Dashboard & Execution Details
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">
              {trades.length} Logged ({openTradesCount} Open · {winCount}W · {lossCount}L)
            </span>
            {onOpenNewTrade && (
              <button
                type="button"
                onClick={onOpenNewTrade}
                className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-mono font-bold text-xs cursor-pointer transition"
              >
                + Record Trade
              </button>
            )}
          </div>
        </div>

        {/* Latest Logged Trade Spotlight Banner */}
        {latestLoggedTrade && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900/90 to-cyan-950/20 border border-cyan-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  LATEST LOGGED TRADE: {latestLoggedTrade.id}
                </span>
                <span className="font-mono font-bold text-sm text-white">
                  {latestLoggedTrade.instrument}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    latestLoggedTrade.direction === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {latestLoggedTrade.direction === 'BUY' ? 'LONG / BUY' : 'SHORT / SELL'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-200">
                  TF: {latestLoggedTrade.timeframe}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-300">
                  {latestLoggedTrade.strategy}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {latestLoggedTrade.date} · {latestLoggedTrade.time}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">ENTRY / SL / TP</span>
                <span className="font-bold text-slate-100">
                  {latestLoggedTrade.entryPrice} / {latestLoggedTrade.stopLoss} /{' '}
                  {latestLoggedTrade.takeProfit || 'Open'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">LOT SIZE USED</span>
                <span className="font-bold text-cyan-300">{latestLoggedTrade.lotSize} Lots</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">RISK % USED</span>
                <span className="font-bold text-amber-300">{latestLoggedTrade.riskPercent || 1}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-950/25 border border-rose-500/30">
                <span className="text-[10px] text-rose-300 block">DOLLAR RISK (IF SL)</span>
                <span className="font-bold text-rose-400">
                  -{formatCurrency(latestLoggedTrade.riskAmount || 0, currency)}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-950/25 border border-emerald-500/30">
                <span className="text-[10px] text-emerald-300 block">TARGET / R:R</span>
                <span className="font-bold text-emerald-400">
                  {latestLoggedTrade.potentialProfitDollars
                    ? `+${formatCurrency(latestLoggedTrade.potentialProfitDollars, currency)}`
                    : `1:${latestLoggedTrade.rMultiple}R`}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">STATUS & OUTCOME</span>
                <span
                  className={`font-bold ${
                    latestLoggedTrade.status === 'OPEN'
                      ? 'text-cyan-400'
                      : safeNumber(latestLoggedTrade.profitLoss, 0) >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {latestLoggedTrade.status === 'OPEN'
                    ? 'OPEN POSITION'
                    : `${safeNumber(latestLoggedTrade.profitLoss, 0) >= 0 ? '+' : ''}${formatCurrency(
                        safeNumber(latestLoggedTrade.profitLoss, 0),
                        currency
                      )}`}
                </span>
              </div>
            </div>
          </div>
        )}

        {trades.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No trades logged yet for this account. Click "+ Record Trade" to upload a TradingView screenshot or log your first trade.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2.5 px-3">Trade ID & Date</th>
                  <th className="py-2.5 px-3">Pair & TF</th>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3">Entry / SL / TP</th>
                  <th className="py-2.5 px-3">Lot Size</th>
                  <th className="py-2.5 px-3">Risk % & ($)</th>
                  <th className="py-2.5 px-3 text-right">Status / Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {trades.slice(0, 8).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 text-slate-300 font-sans">
                      <span className="font-mono font-bold text-cyan-300 block">{t.id}</span>
                      <span className="text-[10px] text-slate-500">{t.date} {t.time}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-100">{t.instrument}</span>
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {t.timeframe}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          t.direction === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 text-[11px]">
                      {t.entryPrice} / <span className="text-rose-400">{t.stopLoss}</span> /{' '}
                      <span className="text-emerald-400">{t.takeProfit || 'Open'}</span>
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">{t.lotSize} Lots</td>
                    <td className="py-2.5 px-3 text-amber-400">
                      <span className="font-bold">{t.riskPercent || 1}%</span>{' '}
                      <span className="text-rose-400 text-[11px]">
                        (-{formatCurrency(t.riskAmount || 0, currency)})
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        t.status === 'OPEN'
                          ? 'text-cyan-400'
                          : safeNumber(t.profitLoss, 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {t.status === 'OPEN' ? (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px]">
                          OPEN (1:{t.rMultiple}R)
                        </span>
                      ) : (
                        <>
                          {safeNumber(t.profitLoss, 0) >= 0 ? '+' : ''}
                          {formatCurrency(safeNumber(t.profitLoss, 0), currency)}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION F: ACCOUNT DATA HEALTH & PROVENANCE */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-400">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-300">Data Health:</span>
          <span>Provenance: <strong className="text-slate-200">{account.isManual ? 'Manually Reported' : 'Synchronized'}</strong></span>
          <span>·</span>
          <span>Rule Verification: <strong className="text-emerald-400">{account.ruleVerificationStatus || 'VERIFIED'}</strong></span>
        </div>
        <div className="text-[11px] text-slate-500">
          Last Account State Update: {new Date(account.updatedAt || Date.now()).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
};
