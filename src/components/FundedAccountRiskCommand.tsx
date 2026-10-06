import React, { useState, useMemo } from 'react';
import {
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Sliders,
  Building2,
  Calculator,
  Lock,
  Activity,
  ChevronDown,
  ChevronUp,
  Zap,
  Crosshair,
  RefreshCw,
} from 'lucide-react';
import {
  AccountSettings,
  FundedAccountConfig,
  FundedPhase,
  FundedRiskMode,
  Trade,
} from '../types';
import {
  evaluateFundedAccountRisk,
  getEffectiveFundedConfig,
  isFundedAccount,
  getPhaseLabel,
} from '../utils/fundedRiskEngine';
import { formatCurrency } from '../utils/currencyFormatter';
import { FundedAccountConfigPanel } from './FundedAccountConfigPanel';

interface FundedAccountRiskCommandProps {
  account: AccountSettings;
  trades: Trade[];
  onUpdateAccount: (updated: AccountSettings) => void;
  onNavigateToTab?: (tab: any) => void;
}

const QUICK_PAIR_PIP_VALUES: Record<string, { pipVal: number; label: string }> = {
  XAUUSD: { pipVal: 10, label: 'XAUUSD ($10/pip per 1.00 lot)' },
  EURUSD: { pipVal: 10, label: 'EURUSD ($10/pip per 1.00 lot)' },
  GBPUSD: { pipVal: 10, label: 'GBPUSD ($10/pip per 1.00 lot)' },
  USDJPY: { pipVal: 6.8, label: 'USDJPY (~$6.80/pip per 1.00 lot)' },
  GBPJPY: { pipVal: 6.8, label: 'GBPJPY (~$6.80/pip per 1.00 lot)' },
  US30: { pipVal: 1, label: 'US30 ($1/point per 1.00 lot)' },
  NAS100: { pipVal: 1, label: 'NAS100 ($1/point per 1.00 lot)' },
  BTCUSD: { pipVal: 1, label: 'BTCUSD ($1/point per 1.00 lot)' },
};

export const FundedAccountRiskCommand: React.FC<FundedAccountRiskCommandProps> = ({
  account,
  trades,
  onUpdateAccount,
  onNavigateToTab,
}) => {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [quickInstrument, setQuickInstrument] = useState<string>('XAUUSD');
  const [quickStopLossPips, setQuickStopLossPips] = useState<number>(30);

  const fundedActive = isFundedAccount(account);
  const effectiveConfig = useMemo(() => getEffectiveFundedConfig(account), [account]);
  const evaluation = useMemo(
    () => evaluateFundedAccountRisk(account, trades),
    [account, trades]
  );

  const currency = account.currency || 'USD';

  const handleSaveFundedConfig = (nextConfig: FundedAccountConfig) => {
    const updated: AccountSettings = {
      ...account,
      accountCategory: nextConfig.enabled ? 'FUNDED' : 'PERSONAL',
      accountType: nextConfig.enabled
        ? nextConfig.phase === 'FUNDED_LIVE' || nextConfig.phase === 'INSTANT_FUNDED'
          ? 'PROP_FIRM_FUNDED'
          : 'PROP_FIRM_EVALUATION'
        : 'PERSONAL_LIVE',
      initialBalance: nextConfig.startingBalance || account.initialBalance,
      broker: nextConfig.firmName || account.broker,
      maxDailyLossPercent: nextConfig.dailyDrawdownPercent || account.maxDailyLossPercent,
      maxDrawdownPercent: nextConfig.overallDrawdownPercent || account.maxDrawdownPercent,
      targetRiskPerTradePercent: nextConfig.preferredRiskPercent,
      maxRiskPerTradePercent: nextConfig.maxRiskPerTradePercent,
      fundedConfig: nextConfig,
      updatedAt: new Date().toISOString(),
    };
    onUpdateAccount(updated);
  };

  const handleToggleAccountCategory = (category: 'PERSONAL' | 'FUNDED') => {
    if (category === 'FUNDED') {
      handleSaveFundedConfig({
        ...effectiveConfig,
        enabled: true,
      });
    } else {
      onUpdateAccount({
        ...account,
        accountCategory: 'PERSONAL',
        accountType: 'PERSONAL_LIVE',
        fundedConfig: {
          ...effectiveConfig,
          enabled: false,
        },
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleChangeRiskMode = (mode: FundedRiskMode) => {
    handleSaveFundedConfig({
      ...effectiveConfig,
      enabled: true,
      riskMode: mode,
    });
  };

  const handleChangePhase = (phase: FundedPhase) => {
    handleSaveFundedConfig({
      ...effectiveConfig,
      enabled: true,
      phase,
    });
  };

  const handleFloatingPnLChange = (floatingVal: number) => {
    handleSaveFundedConfig({
      ...effectiveConfig,
      openFloatingPnL: floatingVal,
    });
  };

  // Quick lot calculation from Funded Next-Trade Safe Risk
  const pairInfo = QUICK_PAIR_PIP_VALUES[quickInstrument] || QUICK_PAIR_PIP_VALUES.XAUUSD;
  const safeSlPips = Math.max(1, quickStopLossPips || 1);
  const rawSafeLot =
    evaluation.recommendedRiskDollars > 0
      ? evaluation.recommendedRiskDollars / (safeSlPips * pairInfo.pipVal)
      : 0;
  const recommendedSafeLot =
    rawSafeLot >= 0.01 ? Math.floor(rawSafeLot * 100) / 100 : 0;

  return (
    <div className="space-y-5">
      {/* Top Bar: Account Type Mode & Prop Rule Configurator */}
      <div className="rounded-2xl bg-slate-950/95 border border-cyan-500/35 p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                  FUNDED ACCOUNT RISK ENGINE
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase border ${
                    fundedActive
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                      : 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                  }`}
                >
                  {fundedActive ? `${evaluation.firmName} • ${evaluation.phaseLabel}` : 'PERSONAL ACCOUNT MODE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Real-Time Prop Firm Rule Enforcement • Dynamic Trailing & Daily Drawdown Protection • Next-Trade Sizing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Personal vs Funded Switcher */}
            <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
              <button
                type="button"
                onClick={() => handleToggleAccountCategory('PERSONAL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-military font-bold tracking-wider transition cursor-pointer ${
                  !fundedActive
                    ? 'bg-blue-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PERSONAL ACCOUNT
              </button>
              <button
                type="button"
                onClick={() => handleToggleAccountCategory('FUNDED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-military font-bold tracking-wider transition cursor-pointer ${
                  fundedActive
                    ? 'bg-cyan-400 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                FUNDED ACCOUNT
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-mono-code font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isConfigOpen ? 'HIDE FUNDED RULES' : 'CONFIGURE FUNDED RULES'}</span>
              {isConfigOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Funded Account Configuration Panel */}
        {isConfigOpen && (
          <div className="pt-2 border-t border-slate-800">
            <FundedAccountConfigPanel
              config={effectiveConfig}
              currency={currency}
              onChange={handleSaveFundedConfig}
            />
          </div>
        )}

        {/* Quick Summary Strip of Funded Account Basic Information */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-800/80 font-mono-code text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Firm / Account</span>
            <span className="font-bold text-slate-100 truncate block mt-0.5">
              {evaluation.firmName}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Starting Size</span>
            <span className="font-bold text-slate-100 block mt-0.5">
              {formatCurrency(evaluation.startingBalance, currency)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Current Balance</span>
            <span className="font-bold text-cyan-300 block mt-0.5">
              {formatCurrency(evaluation.currentBalance, currency)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Current Equity</span>
            <span className="font-bold text-emerald-300 block mt-0.5">
              {formatCurrency(evaluation.currentEquity, currency)}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Drawdown Rule</span>
            <span className="font-bold text-amber-300 truncate block mt-0.5">
              {evaluation.drawdownTypeLabel}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Active Phase</span>
            <select
              value={evaluation.phase}
              onChange={(e) => handleChangePhase(e.target.value as FundedPhase)}
              className="mt-0.5 w-full bg-transparent text-cyan-400 font-bold text-xs outline-none cursor-pointer"
            >
              <option value="PHASE_1" className="bg-slate-950">Phase 1</option>
              <option value="PHASE_2" className="bg-slate-950">Phase 2</option>
              <option value="PHASE_3" className="bg-slate-950">Phase 3</option>
              <option value="FUNDED_LIVE" className="bg-slate-950">Funded Live</option>
              <option value="INSTANT_FUNDED" className="bg-slate-950">Instant Funded</option>
            </select>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 10 & 11: NEXT TRADE RISK ENGINE & DECISION COMMAND            */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Safe Risk for NEXT Trade + Risk Mode Selector */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-950/95 border border-slate-800 p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                  NEXT TRADE RISK ENGINE — SAFE ALLOCATION
                </span>
              </div>

              {/* Risk Mode Pills: Conservative / Balanced / Aggressive */}
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {(['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'] as FundedRiskMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleChangeRiskMode(m)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono-code font-bold transition cursor-pointer ${
                      evaluation.riskMode === m
                        ? m === 'CONSERVATIVE'
                          ? 'bg-emerald-500 text-slate-950'
                          : m === 'BALANCED'
                          ? 'bg-cyan-400 text-slate-950'
                          : 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-mono-code text-slate-400 uppercase">
                  "Given my current account state and the funded firm's rules, how much can I safely risk on my NEXT trade?"
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-military font-black text-cyan-300">
                    {formatCurrency(evaluation.recommendedRiskDollars, currency)}
                  </span>
                  <span className="text-sm font-mono-code font-bold text-emerald-400">
                    ({evaluation.recommendedRiskPercent}% of Balance)
                  </span>
                </div>
                <div className="text-[11px] font-mono-code text-slate-400 mt-1">
                  Controlling Constraint: <strong className="text-amber-300">{evaluation.limitingFactor}</strong>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 font-mono-code text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  Preferred Risk: <strong className="text-white">{evaluation.preferredRiskPercent}% ({formatCurrency(evaluation.preferredRiskDollars, currency)})</strong>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  Hard Rule Ceiling: <strong className="text-rose-300">{formatCurrency(evaluation.hardCeilingRiskDollars, currency)}</strong>
                </div>
              </div>
            </div>

            <p className="text-xs font-mono-code text-slate-200 leading-relaxed bg-slate-900/50 border border-slate-800/80 rounded-xl p-3">
              {evaluation.nextTradeRiskQuestionAnswer}
            </p>
          </div>

          {/* Survival & Breach Buffer Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono-code text-xs pt-2 border-t border-slate-800">
            <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Losses to Daily Breach</span>
              <span className="text-sm font-bold text-cyan-300 mt-0.5 block">
                {evaluation.tradesToDailyBreachAtRecommended > 0
                  ? `${evaluation.tradesToDailyBreachAtRecommended} Trades`
                  : '0 (Locked)'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Losses to Max Breach</span>
              <span className="text-sm font-bold text-amber-300 mt-0.5 block">
                {evaluation.tradesToOverallBreachAtRecommended > 0
                  ? `${evaluation.tradesToOverallBreachAtRecommended} Trades`
                  : '0 (Locked)'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">2R Wins to Pass Phase</span>
              <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                {evaluation.isTargetPassed
                  ? 'PASSED ✓'
                  : evaluation.tradesToPassAt2R > 0
                  ? `${evaluation.tradesToPassAt2R} Wins (@1:2)`
                  : '—'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Streak / Today</span>
              <span className="text-sm font-bold text-slate-200 mt-0.5 block">
                {evaluation.consecutiveLosses > 0
                  ? `${evaluation.consecutiveLosses}L Streak`
                  : evaluation.consecutiveWins > 0
                  ? `${evaluation.consecutiveWins}W Streak`
                  : '0 Streak'}{' '}
                • {evaluation.tradesToday}/{evaluation.maxDailyTrades} Today
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Decision Verdict ("Should I take this trade, reduce the risk, or stop trading?") */}
        <div
          className={`lg:col-span-5 rounded-2xl border p-5 shadow-xl flex flex-col justify-between space-y-4 ${
            evaluation.verdictColor === 'EMERALD'
              ? 'bg-emerald-950/20 border-emerald-500/40'
              : evaluation.verdictColor === 'AMBER'
              ? 'bg-amber-950/20 border-amber-500/40'
              : evaluation.verdictColor === 'CYAN'
              ? 'bg-cyan-950/20 border-cyan-500/40'
              : 'bg-rose-950/25 border-rose-500/50'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                EXECUTION DECISION VERDICT
              </span>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono-code font-bold uppercase border ${
                  evaluation.verdictColor === 'EMERALD'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : evaluation.verdictColor === 'AMBER'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : evaluation.verdictColor === 'CYAN'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {evaluation.verdict.replace('_', ' ')}
              </span>
            </div>

            <div className="text-[11px] font-mono-code text-slate-400">
              "Should I take this trade, reduce the risk, or stop trading?"
            </div>

            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                evaluation.verdictColor === 'EMERALD'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                  : evaluation.verdictColor === 'AMBER'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                  : evaluation.verdictColor === 'CYAN'
                  ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
              }`}
            >
              {evaluation.verdict === 'TAKE_TRADE' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : evaluation.verdict === 'REDUCE_RISK' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-military font-bold tracking-wider uppercase">
                  {evaluation.verdictBadge}
                </div>
                <p className="text-xs font-mono-code mt-1 leading-relaxed">
                  {evaluation.shouldTakeTradeQuestionAnswer}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono-code uppercase text-slate-400 font-bold block">
                Engine Diagnostic Factors:
              </span>
              {evaluation.reasons.map((r, idx) => (
                <div
                  key={idx}
                  className="text-xs font-mono-code text-slate-300 flex items-start gap-2 bg-slate-950/70 border border-slate-800/80 rounded-lg p-2"
                >
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Instant Next-Trade Position Sizer */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono-code text-cyan-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                <span>INSTANT SAFE LOT SIZER (FOR NEXT TRADE)</span>
              </span>
              {onNavigateToTab && (
                <button
                  type="button"
                  onClick={() => onNavigateToTab('LOT_SIZE')}
                  className="text-[10px] underline hover:text-white cursor-pointer"
                >
                  Open Full Calculator →
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono-code text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block">Instrument</label>
                <select
                  value={quickInstrument}
                  onChange={(e) => setQuickInstrument(e.target.value)}
                  className="mt-0.5 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-xs"
                >
                  {Object.keys(QUICK_PAIR_PIP_VALUES).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block">Stop Loss (Pips/Pts)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quickStopLossPips}
                  onChange={(e) => setQuickStopLossPips(Math.max(1, parseFloat(e.target.value) || 10))}
                  className="mt-0.5 w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 text-xs font-bold"
                />
              </div>
              <div className="p-1.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-center flex flex-col justify-center">
                <span className="text-[9px] text-cyan-300 uppercase">Safe Lot Size</span>
                <span className="text-sm font-black text-white">
                  {recommendedSafeLot.toFixed(2)} Lots
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 5, 8, 9: PROFIT TARGET, DAILY DD & OVERALL/TRAILING DD CARDS  */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Section 5 — Profit Target Configuration & Visual Progress */}
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                  PROFIT TARGET PROGRESS ({evaluation.phaseLabel})
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono-code font-bold">
                {evaluation.profitProgressPercent}% COMPLETE
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-slate-400">Progress to Pass:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(evaluation.currentProfitLoss, currency)} /{' '}
                  {formatCurrency(evaluation.activeProfitTargetDollars, currency)} (
                  {evaluation.profitProgressPercent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, evaluation.profitProgressPercent))}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 font-mono-code text-xs pt-1">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Starting Balance:</span>
                <span className="font-bold text-slate-200">
                  {formatCurrency(evaluation.startingBalance, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Current Balance:</span>
                <span className="font-bold text-cyan-300">
                  {formatCurrency(evaluation.currentBalance, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Phase Target ({evaluation.activeProfitTargetPercent}%):</span>
                <span className="font-bold text-emerald-400">
                  +{formatCurrency(evaluation.activeProfitTargetDollars, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Current Profit / Loss:</span>
                <span
                  className={`font-bold ${
                    evaluation.currentProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {evaluation.currentProfitLoss >= 0 ? '+' : ''}
                  {formatCurrency(evaluation.currentProfitLoss, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Remaining Profit Target:</span>
                <span className="font-bold text-amber-300">
                  {formatCurrency(evaluation.remainingProfitTarget, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Amount Required to Pass:</span>
                <span className="font-bold text-white">
                  {formatCurrency(evaluation.amountRequiredToPass, currency)} (Target Bal:{' '}
                  {formatCurrency(evaluation.passingBalanceTarget, currency)})
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
            <span>Phase 1 Target: {formatCurrency(effectiveConfig.profitTargets.phase1TargetDollars, currency)}</span>
            <span>•</span>
            <span>Phase 2 Target: {formatCurrency(effectiveConfig.profitTargets.phase2TargetDollars, currency)}</span>
          </div>
        </div>

        {/* Card 2: Section 8 — Daily Drawdown Tracker */}
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                  DAILY DRAWDOWN GUARD
                </h4>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono-code font-black uppercase border ${
                  evaluation.remainingDailyDrawdown <= evaluation.dailyDrawdownLimitDollars * 0.25
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                }`}
              >
                DAILY DD REMAINING: {formatCurrency(evaluation.remainingDailyDrawdown, currency)}
              </span>
            </div>

            {/* Daily Drawdown Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-slate-400">Daily Limit Consumed:</span>
                <span className="font-bold text-rose-400">
                  {formatCurrency(evaluation.currentDailyDrawdown, currency)} /{' '}
                  {formatCurrency(evaluation.dailyDrawdownLimitDollars, currency)} (
                  {evaluation.dailyDrawdownUsedPercent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    evaluation.dailyDrawdownUsedPercent >= 75
                      ? 'bg-rose-500'
                      : evaluation.dailyDrawdownUsedPercent >= 45
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, evaluation.dailyDrawdownUsedPercent))}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 font-mono-code text-xs pt-1">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Today's Starting Balance:</span>
                <span className="font-bold text-slate-200">
                  {formatCurrency(evaluation.todayStartingBalance, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Today's Starting Equity:</span>
                <span className="font-bold text-slate-200">
                  {formatCurrency(evaluation.todayStartingEquity, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Today's Realized P&L:</span>
                <span
                  className={`font-bold ${
                    evaluation.todayRealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {evaluation.todayRealizedPnL >= 0 ? '+' : ''}
                  {formatCurrency(evaluation.todayRealizedPnL, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Today's Unrealized (Floating) P&L:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    value={effectiveConfig.openFloatingPnL ?? 0}
                    onChange={(e) => handleFloatingPnLChange(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-right text-xs font-bold text-amber-300"
                    title="Simulate or enter live open floating P&L"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Current Daily Drawdown:</span>
                <span className="font-bold text-rose-400">
                  {formatCurrency(evaluation.currentDailyDrawdown, currency)} (
                  {evaluation.dailyDrawdownAccountPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Today's Liquidation Floor:</span>
                <span className="font-bold text-rose-300">
                  {formatCurrency(evaluation.dailyBreachFloor, currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono-code text-cyan-300 font-bold text-center">
            DAILY DD REMAINING: {formatCurrency(evaluation.remainingDailyDrawdown, currency)}
          </div>
        </div>

        {/* Card 3: Section 7 & 9 — Overall & Trailing Drawdown Tracker */}
        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                  OVERALL & TRAILING DRAWDOWN
                </h4>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-mono-code font-black uppercase border ${
                  evaluation.remainingOverallDrawdown <= evaluation.overallDrawdownLimitDollars * 0.25
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                OVERALL DD REMAINING: {formatCurrency(evaluation.remainingOverallDrawdown, currency)}
              </span>
            </div>

            {/* Overall Drawdown Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono-code">
                <span className="text-slate-400">Overall Limit Consumed:</span>
                <span className="font-bold text-amber-300">
                  {formatCurrency(evaluation.currentOverallDrawdown, currency)} /{' '}
                  {formatCurrency(evaluation.overallDrawdownLimitDollars, currency)} (
                  {evaluation.overallDrawdownUsedPercent}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    evaluation.overallDrawdownUsedPercent >= 75
                      ? 'bg-rose-500'
                      : evaluation.overallDrawdownUsedPercent >= 45
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, evaluation.overallDrawdownUsedPercent))}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2 font-mono-code text-xs pt-1">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Starting Account Balance:</span>
                <span className="font-bold text-slate-200">
                  {formatCurrency(evaluation.startingBalance, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Max Allowed Loss ({evaluation.overallDrawdownLimitPercent}%):</span>
                <span className="font-bold text-rose-400">
                  {formatCurrency(evaluation.overallDrawdownLimitDollars, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Initial Drawdown Threshold:</span>
                <span className="font-bold text-slate-300">
                  {formatCurrency(evaluation.initialLiquidationThreshold, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">High-Water Mark ({evaluation.isTrailing ? 'Trailing' : 'Peak'}):</span>
                <span className="font-bold text-cyan-300">
                  {formatCurrency(evaluation.highWaterMark, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Active Liquidation Threshold:</span>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  {evaluation.isTrailingLocked && <Lock className="w-3 h-3 text-emerald-400" />}
                  {formatCurrency(evaluation.activeLiquidationThreshold, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Current Overall Drawdown:</span>
                <span className="font-bold text-rose-400">
                  {formatCurrency(evaluation.currentOverallDrawdown, currency)} (
                  {evaluation.overallDrawdownAccountPercent}%)
                </span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono-code text-amber-300 font-bold text-center">
            OVERALL DD REMAINING: {formatCurrency(evaluation.remainingOverallDrawdown, currency)}
          </div>
        </div>
      </div>
    </div>
  );
};
