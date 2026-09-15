import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Award,
  AlertTriangle,
  Zap,
  Crosshair,
  Sparkles,
  Flame,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  DollarSign,
  ChevronRight,
  Info,
  Brain,
  User,
} from 'lucide-react';
import {
  DashboardMetrics,
  calculateStrategyMetrics,
  calculateSessionMetrics,
  calculatePairMetrics,
} from '../utils/tradeAnalytics';
import { Trade, AccountSettings, UserAccount } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { getKarachiEpoch } from '../utils/time';
import { calculateNextTradeReadiness } from '../utils/readinessEngine';
import { EvolutionStatusBadge } from './evolution/EvolutionStatusBadge';
import { DashboardMarketIntelligence } from './dashboard/DashboardMarketIntelligence';
import { DashboardRiskDefense } from './dashboard/DashboardRiskDefense';
import { DashboardPsychology } from './dashboard/DashboardPsychology';
import { DashboardPerformance } from './dashboard/DashboardPerformance';
import { DashboardAiCoach } from './dashboard/DashboardAiCoach';
import { DashboardDailyDevelopment } from './dashboard/DashboardDailyDevelopment';
import { DashboardSignals } from './dashboard/DashboardSignals';
import { DashboardQuickActions } from './dashboard/DashboardQuickActions';

interface MainDashboardProps {
  metrics: DashboardMetrics;
  account: AccountSettings;
  trades: Trade[];
  currentUser?: UserAccount | null;
  onOpenNewTrade: () => void;
  onNavigateToTab: (tab: any) => void;
  onOpenAccountModal?: () => void;
  onOpenHelpImprove?: () => void;
  onOpenTraderProfile?: () => void;
  onOpenEvolution?: () => void;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  metrics,
  account,
  trades,
  currentUser,
  onOpenNewTrade,
  onNavigateToTab,
  onOpenAccountModal,
  onOpenHelpImprove,
  onOpenTraderProfile,
  onOpenEvolution,
}) => {
  const scores = metrics.performanceScores;
  const isProfitable = metrics.totalProfitLoss >= 0;

  // Radar/bars for performance scores
  const scoreCategories = [
    { label: 'Risk Management', score: scores.riskManagement, weight: '25%' },
    { label: 'Psychology', score: scores.psychology, weight: '15%' },
    { label: 'Strategy Execution', score: scores.strategyExecution, weight: '20%' },
    { label: 'Discipline', score: scores.discipline, weight: '25%' },
    { label: 'Consistency', score: scores.consistency, weight: '15%' },
  ];

  const recentTrades = [...trades]
    .sort(
      (a, b) => getKarachiEpoch(b.date, b.time) - getKarachiEpoch(a.date, a.time)
    )
    .slice(0, 5);

  const stratMetrics = calculateStrategyMetrics(trades);
  const sessMetrics = calculateSessionMetrics(trades);
  const pMetrics = calculatePairMetrics(trades);

  const topStrategy = stratMetrics[0];
  const topSession = sessMetrics[0];
  const topPair = pMetrics[0];

  const readiness = calculateNextTradeReadiness(trades, account);
  const isLimitReached = metrics.tradesToday >= account.maxDailyTrades;

  // Master 1% Risk Calculations (Strictly 1% per trade and 2% daily limit standard)
  const standardRiskPercent = 1.0;
  const master1PercentRiskDollars = (metrics.accountBalance * 1.0) / 100;
  const dailyRiskLimitPercent = 2.0;
  const dailyRiskLimitDollars = (metrics.accountBalance * 2.0) / 100;
  const dailyRiskUsed = readiness.dailyRiskUsed || 0;
  const remainingDailyRisk = Math.max(0, dailyRiskLimitDollars - dailyRiskUsed);
  const recommendedMaxRisk = (readiness.status === 'RED' || remainingDailyRisk <= 0)
    ? 0
    : Math.min(master1PercentRiskDollars, remainingDailyRisk);

  // Streak & Last trade detection
  const closedChronological = [...trades]
    .filter((t) => t.status === 'CLOSED' || typeof t.netProfitLoss === 'number')
    .sort((a, b) => getKarachiEpoch(a.date, a.time) - getKarachiEpoch(b.date, b.time));

  const lastClosedTrade = closedChronological[closedChronological.length - 1];

  let streakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
  let streakCount = 0;
  if (closedChronological.length > 0) {
    const rev = [...closedChronological].reverse();
    const firstIsWin = (rev[0].netProfitLoss ?? rev[0].profitLoss ?? 0) > 0;
    streakType = firstIsWin ? 'WIN' : 'LOSS';
    for (const t of rev) {
      const isWin = (t.netProfitLoss ?? t.profitLoss ?? 0) > 0;
      if (isWin === firstIsWin) streakCount++;
      else break;
    }
  }

  // Dynamic Suggestion based on trade history
  let dynamicRiskSuggestion = '';
  if (streakType === 'LOSS' && streakCount >= 2) {
    dynamicRiskSuggestion = `You have recorded ${streakCount} consecutive losses. Do not increase risk to recover. Review your recent setups and psychology before the next decision. Next standard risk is ${formatCurrency(master1PercentRiskDollars, account.currency)} (1%).`;
  } else if (streakType === 'WIN' && streakCount >= 3) {
    dynamicRiskSuggestion = `You are on a winning streak (${streakCount} wins). Avoid increasing risk because of recent profits. Continue following your 1% plan (${formatCurrency(master1PercentRiskDollars, account.currency)}).`;
  } else if (lastClosedTrade) {
    const lastPnl = lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0;
    if (lastPnl < 0) {
      dynamicRiskSuggestion = `Your next standard risk based on the current balance is ${formatCurrency(master1PercentRiskDollars, account.currency)} at 1%. Review whether the setup followed your strategy, whether the stop loss was respected, and whether the loss stayed within your risk plan. Do not increase risk to recover the loss.`;
    } else if (lastPnl > 0) {
      dynamicRiskSuggestion = `Your execution produced a winning result. Keep the same 1% risk discipline (${formatCurrency(master1PercentRiskDollars, account.currency)}) and review what made the setup valid. Do not increase risk simply because the previous trade won.`;
    } else {
      dynamicRiskSuggestion = `Trade closed at break-even. Capital preserved. Maintain 1% disciplined risk (${formatCurrency(master1PercentRiskDollars, account.currency)}) on valid setups.`;
    }
  } else {
    dynamicRiskSuggestion = `Account balance is ${formatCurrency(metrics.accountBalance, account.currency)}. Planned maximum risk on your next trade setup is 1% (${formatCurrency(master1PercentRiskDollars, account.currency)}). Standard daily risk limit is 2% (${formatCurrency(dailyRiskLimitDollars, account.currency)}).`;
  }

  const isLossToReview = lastClosedTrade && (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0;
  const isDailyRiskHit = readiness.riskStatus === 'LIMIT REACHED' || metrics.tradesToday >= account.maxDailyTrades;
  const riskStatusLabel = isDailyRiskHit
    ? 'DAILY LIMIT REACHED'
    : isLossToReview
    ? 'REVIEW BEFORE NEXT TRADE'
    : 'WITHIN PLAN';

  return (
    <div className="space-y-6">
      {/* Top Header Row: Profile / Account & Psychological Center */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#0B0F19]/90 border border-slate-800/80 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Profile / Account button */}
          <button
            id="dash-profile-account-btn"
            onClick={onOpenAccountModal || (() => {})}
            className="prime-btn-secondary text-xs py-1.5 px-3"
            title="User Profile & Account"
          >
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentUser?.username ? `@${currentUser.username.toUpperCase()}` : 'PROFILE / ACCOUNT'}</span>
            <span className="text-[10px] font-mono-code text-amber-400 px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
              {currentUser?.subscriptionTier || 'TRADER'}
            </span>
          </button>

          {/* Dedicated Psychological Center button directly beside Profile/Account */}
          <button
            id="dash-top-psych-center-btn"
            onClick={() => onNavigateToTab('PSYCHOLOGY')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-amber-500/15 hover:from-amber-500/25 hover:to-indigo-500/25 border border-amber-500/40 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-xs font-military font-bold tracking-wider transition-all duration-180 cursor-pointer shadow-md shadow-amber-500/10 active:scale-95 group"
            title="Open Psychological Command Center (One-Click)"
          >
            <Brain className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform animate-pulse" />
            <span>PSYCHOLOGICAL CENTER</span>
          </button>

          {/* Trader Experience Profile trigger */}
          {onOpenTraderProfile && (
            <button
              id="dash-trader-profile-btn"
              onClick={onOpenTraderProfile}
              className="prime-btn-secondary text-xs py-1.5 px-2.5 hidden sm:inline-flex"
              title="View Adaptive Trader Experience Profile & Preferences"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>EXPERIENCE PROFILE</span>
            </button>
          )}

          {/* User Feedback / Help Improve Modal */}
          {onOpenHelpImprove && (
            <button
              id="dash-help-improve-btn"
              onClick={onOpenHelpImprove}
              className="prime-btn-secondary text-xs py-1.5 px-2.5 hidden md:inline-flex"
              title="Help PRIMEPIPFX Improve (Suggest Features or Report Friction)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>HELP IMPROVE</span>
            </button>
          )}

          {/* Evolution Engine Developer Trigger */}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' || currentUser?.isDeveloper) && onOpenEvolution && (
            <button
              id="dash-evolution-engine-btn"
              onClick={onOpenEvolution}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-300 text-xs font-military font-bold tracking-wider transition-all duration-180 active:scale-95 cursor-pointer shadow-sm shadow-emerald-500/10"
              title="Access PRIMEPIPFX Evolution Engine Console"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>EVOLUTION ENGINE</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <EvolutionStatusBadge variant="dashboard" onOpenEvolution={onOpenEvolution} />
          <div className="flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="hidden sm:inline">CENTRAL TRADING PROTOCOL ACTIVE</span>
          </div>
        </div>
      </div>


      {/* Tactical Status Banner */}
      <div className={`border rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl transition ${
        readiness.status === 'RED'
          ? 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-[#0F172A] border-rose-500/40'
          : readiness.status === 'YELLOW'
          ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-[#0F172A] border-amber-500/40'
          : 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0F172A] border-slate-800'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-lg ${
            readiness.status === 'RED'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : readiness.status === 'YELLOW'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-mono-code uppercase px-2 py-0.5 rounded font-bold border ${
                readiness.status === 'RED'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : readiness.status === 'YELLOW'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {readiness.status === 'RED'
                  ? 'DEFCON 5: LOCKOUT'
                  : readiness.status === 'YELLOW'
                  ? 'DEFCON 3: ELEVATED VIGILANCE'
                  : 'DEFCON 1: GREEN'}
              </span>
              <span className="text-xs font-mono-code text-slate-400">
                DAILY LIMIT: {metrics.tradesToday} / {account.maxDailyTrades} TRADES
              </span>
            </div>
            <h2 className="text-lg font-military font-bold text-slate-100 tracking-wide mt-1">
              COMMAND READINESS: {readiness.status === 'RED' ? 'TRADING HALTED' : scores.overallTradingScore >= 80 ? 'OPTIMAL' : 'ELEVATED VIGILANCE'}
            </h2>
            <p className="text-xs text-slate-400">
              {readiness.reasons[0] || 'System ready for trade logging.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            id="dash-psych-center-btn"
            onClick={() => onNavigateToTab('PSYCHOLOGY')}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/50 text-xs font-military font-bold tracking-wider transition cursor-pointer shadow-sm group"
            title="Psychological Command Center"
          >
            <Brain className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">PSYCHOLOGICAL CENTER</span>
            <span className="sm:hidden">PSYCHOLOGY</span>
          </button>
          <button
            id="dash-consult-ai-btn"
            onClick={() => onNavigateToTab('AI_COACH')}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-military font-bold tracking-wider transition"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AI TACTICAL BRIEFING</span>
          </button>
          <button
            id="dash-quick-log-btn"
            onClick={onOpenNewTrade}
            disabled={isLimitReached}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-military font-bold tracking-wider shadow-lg transition ${
              isLimitReached
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{isLimitReached ? 'LIMIT LOCKED' : 'RECORD EXECUTION'}</span>
          </button>
        </div>
      </div>

      {/* Next Trade Readiness Check & Risk Guidance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Trade Readiness Check (7 cols) */}
        <div className={`lg:col-span-7 rounded-xl p-5 border shadow-xl flex flex-col justify-between ${
          readiness.status === 'RED'
            ? 'bg-rose-950/20 border-rose-500/40'
            : readiness.status === 'YELLOW'
            ? 'bg-amber-950/15 border-amber-500/40'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${
                  readiness.status === 'RED'
                    ? 'text-rose-400'
                    : readiness.status === 'YELLOW'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`} />
                <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
                  NEXT TRADE READINESS CHECK
                </h3>
              </div>
              <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                readiness.status === 'RED'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : readiness.status === 'YELLOW'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {readiness.status === 'RED'
                  ? 'RED: TRADE NOT RECOMMENDED'
                  : readiness.status === 'YELLOW'
                  ? 'YELLOW: CAUTION REQUIRED'
                  : 'GREEN: TRADE ALLOWED'}
              </span>
            </div>

            <div className="space-y-3 font-mono-code text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">CURRENT STATUS</span>
                <p className={`font-bold mt-0.5 text-sm ${
                  readiness.status === 'RED'
                    ? 'text-rose-400'
                    : readiness.status === 'YELLOW'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}>
                  {readiness.headline}
                </p>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase block">ANALYSIS & REASON</span>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {readiness.reasons.join(' ')}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] leading-relaxed">
                <span className="text-amber-400 font-bold block mb-0.5 uppercase">
                  RULE-BASED RECOMMENDATION:
                </span>
                <span className="text-slate-300">
                  {readiness.recommendation}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-code text-slate-400">
            <span>DISCIPLINE PROTOCOL: ACTIVE</span>
            <span className={metrics.tradesToday >= account.maxDailyTrades ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
              {metrics.tradesToday} / {account.maxDailyTrades} TRADES TODAY
            </span>
          </div>
        </div>

        {/* Next Trade Risk Guidance (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
                  NEXT TRADE RISK GUIDANCE
                </h3>
              </div>
              <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded border ${
                riskStatusLabel === 'DAILY LIMIT REACHED'
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : riskStatusLabel === 'REVIEW BEFORE NEXT TRADE'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {riskStatusLabel}
              </span>
            </div>

            <div className="space-y-2.5 font-mono-code text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">ACCOUNT BALANCE:</span>
                <span className="font-bold text-slate-100">
                  {formatCurrency(metrics.accountBalance, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">MAX RISK PER TRADE:</span>
                <span className="font-bold text-amber-400">
                  1% ({formatCurrency(master1PercentRiskDollars, account.currency)})
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">DAILY RISK LIMIT:</span>
                <span className="font-bold text-slate-200">
                  2% ({formatCurrency(dailyRiskLimitDollars, account.currency)})
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">DAILY RISK USED:</span>
                <span className={`font-bold ${dailyRiskUsed > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {formatCurrency(dailyRiskUsed, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">REMAINING DAILY RISK:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(remainingDailyRisk, account.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 uppercase">RECOMMENDED MAX RISK:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(recommendedMaxRisk, account.currency)}
                </span>
              </div>
            </div>

            {/* Dynamic Contextual Suggestion Callout */}
            <div className={`mt-3.5 p-3 rounded-lg border text-xs font-mono-code leading-relaxed ${
              streakType === 'LOSS'
                ? 'bg-rose-950/25 border-rose-500/30 text-rose-300'
                : streakType === 'WIN'
                ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div className="text-[10px] uppercase font-bold tracking-wider mb-1 text-amber-400 font-military flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                TACTICAL GUIDANCE DIRECTIVE:
              </div>
              {dynamicRiskSuggestion}
            </div>
          </div>

          <div className="mt-3 text-[10px] font-mono-code text-slate-500 leading-tight">
            *Recommended risk is calculated dynamically from your Master Account Balance ({formatCurrency(metrics.accountBalance, account.currency)}) at 1% standard per trade.
          </div>
        </div>
      </div>

      {/* Trade Result Evaluation & Development Suggestions (Section 9) */}
      {lastClosedTrade && (
        <div className={`border rounded-xl p-5 shadow-xl transition ${
          (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0
            ? 'bg-rose-950/20 border-rose-500/30'
            : (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) > 0
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
                TRADE RESULT EVALUATION & DEVELOPMENT SUGGESTIONS
              </h3>
            </div>
            <span className={`text-[10px] font-mono-code font-bold uppercase px-3 py-1 rounded border ${
              (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) > 0
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
              {(lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0
                ? 'TRADE RESULT: LOSS'
                : (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) > 0
                ? 'TRADE RESULT: WIN'
                : 'TRADE RESULT: BREAK-EVEN'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono-code text-xs mb-4">
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">
                {(lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0 ? 'Loss Amount' : 'Profit / PnL'}
              </span>
              <span className={`font-bold text-sm ${
                (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {formatCurrency(lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0, account.currency)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">New Account Balance</span>
              <span className="font-bold text-sm text-slate-100">
                {formatCurrency(metrics.accountBalance, account.currency)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">Next 1% Risk Amount</span>
              <span className="font-bold text-sm text-amber-400">
                {formatCurrency(master1PercentRiskDollars, account.currency)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">Daily Risk Used</span>
              <span className="font-bold text-sm text-slate-300">
                {formatCurrency(dailyRiskUsed, account.currency)}
              </span>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block uppercase mb-1">Remaining Daily Risk</span>
              <span className="font-bold text-sm text-emerald-400">
                {formatCurrency(remainingDailyRisk, account.currency)}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono-code leading-relaxed text-slate-300">
            <span className="text-amber-400 font-bold block mb-1.5 text-[10px] uppercase font-military tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              PROFESSIONAL DEVELOPMENT SUGGESTION:
            </span>
            {(lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) < 0 ? (
              <span>
                Your next standard risk based on the current balance is <strong className="text-amber-400">{formatCurrency(master1PercentRiskDollars, account.currency)}</strong> at 1%.
                Review whether the setup followed your strategy, whether the stop loss was respected, and whether the loss stayed within your risk plan.
                Do not increase risk to recover the loss.
              </span>
            ) : (lastClosedTrade.netProfitLoss ?? lastClosedTrade.profitLoss ?? 0) > 0 ? (
              <span>
                Your execution produced a winning result. Keep the same 1% risk discipline (<strong className="text-emerald-400">{formatCurrency(master1PercentRiskDollars, account.currency)}</strong>) and review what made the setup valid.
                Do not increase risk simply because the previous trade won.
              </span>
            ) : (
              <span>
                Trade closed at break-even. Capital preserved. Maintain 1% disciplined risk (<strong className="text-slate-200">{formatCurrency(master1PercentRiskDollars, account.currency)}</strong>) on valid setups with clean confluence.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Row 1: The Core Account & Performance Score Spotlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Capital Hud - Signature Animated Gradient Border */}
        <div className="prime-gradient-box p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
              <span className="font-bold tracking-wider uppercase text-slate-300">ACTIVE ACCOUNT</span>
              <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold uppercase">
                {account.accountType.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="mt-2 text-xs font-military font-bold text-slate-100 flex items-center gap-1.5">
              <span className="text-slate-400 font-mono-code text-[11px] uppercase">Account:</span>
              <span className="text-amber-300 text-sm">{account.accountName}</span>
            </div>

            {/* Starting Balance & Current Balance Spotlight */}
            <div className="mt-3 p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider font-semibold">
                  STARTING BALANCE
                </div>
                <div className="text-base font-mono-code font-bold text-slate-200 mt-0.5">
                  {formatCurrency(account.initialBalance, account.currency)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider font-semibold">
                  CURRENT BALANCE
                </div>
                <div className="text-lg font-mono-code font-bold text-amber-400 mt-0.5">
                  {formatCurrency(metrics.accountBalance, account.currency)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 pt-2">
              <div>
                <span className="text-[10px] font-mono-code text-slate-400 block uppercase">
                  CURRENT EQUITY
                </span>
                <span className="text-sm font-mono-code font-semibold text-slate-200">
                  {formatCurrency(metrics.currentEquity, account.currency)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono-code text-slate-400 block uppercase">
                  NET P&L ($ / %)
                </span>
                <span
                  className={`text-sm font-mono-code font-bold flex items-center gap-1 ${
                    isProfitable ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isProfitable ? (
                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                  {formatCurrency(metrics.totalProfitLoss, account.currency, { showSign: true })}
                  <span className="text-[11px] font-normal">
                    ({metrics.returnPercent >= 0 ? '+' : ''}
                    {metrics.returnPercent.toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono-code truncate max-w-[150px]">Broker: {account.broker || 'Direct'}</span>
            <span className="font-mono-code text-amber-400/80 font-bold">Currency: {account.currency}</span>
          </div>
        </div>

        {/* TRADER PERFORMANCE SCORE Spotlight */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-[#121927] border border-amber-500/30 rounded-xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-military font-bold tracking-wider text-slate-200">
                TRADER PERFORMANCE SCORE (0–100)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono-code text-slate-400">
                WEIGHTED INSTITUTIONAL METRIC
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4 items-center">
            {/* Big Score Gauge */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <div className="relative flex items-center justify-center">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    className="stroke-slate-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    className={`${
                      scores.overallTradingScore >= 80
                        ? 'stroke-emerald-400'
                        : scores.overallTradingScore >= 60
                        ? 'stroke-amber-400'
                        : 'stroke-rose-400'
                    } transition-all duration-1000 ease-out`}
                    strokeWidth="8"
                    strokeDasharray={289}
                    strokeDashoffset={289 - (289 * scores.overallTradingScore) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-3xl font-military font-bold text-slate-100">
                    {scores.overallTradingScore}
                  </span>
                  <span className="text-xs text-slate-400 block font-mono-code">/ 100</span>
                </div>
              </div>
              <span className="mt-2 text-xs font-military font-bold tracking-wider text-amber-400">
                {scores.overallTradingScore >= 85
                  ? 'ELITE OPERATOR'
                  : scores.overallTradingScore >= 70
                  ? 'PROFESSIONAL'
                  : 'DISCIPLINE REQUIRED'}
              </span>
            </div>

            {/* Sub-scores breakdown */}
            <div className="sm:col-span-2 space-y-2.5">
              {scoreCategories.map((cat) => {
                const isHigh = cat.score >= 80;
                const isMed = cat.score >= 60 && cat.score < 80;
                return (
                  <div key={cat.label} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-300 font-medium">{cat.label}</span>
                      <span className="font-mono-code font-bold text-slate-200">
                        <span
                          className={
                            isHigh
                              ? 'text-emerald-400'
                              : isMed
                              ? 'text-amber-400'
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
                            ? 'bg-amber-400'
                            : 'bg-rose-400'
                        }`}
                        style={{ width: `${cat.score}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TIER 1 BENTO GRID: MARKET / RISK / PERFORMANCE / PSYCHOLOGY        */}
      {/* ================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm"></span>
            <h3 className="text-xs font-military tracking-wider font-bold text-slate-300 uppercase">
              STRATEGIC PILLARS: MARKET • RISK • PERFORMANCE • PSYCHOLOGY
            </h3>
          </div>
          <span className="text-[10px] font-mono-code text-slate-500 uppercase">TIER 1 BENTO</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <DashboardMarketIntelligence
            onNavigateToTab={onNavigateToTab}
            onOpenTimeModal={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('primepipfx_open_time_modal'));
              }
            }}
          />

          <DashboardRiskDefense
            account={account}
            metrics={metrics}
            trades={trades || []}
            onNavigateToTab={onNavigateToTab}
          />

          <DashboardPerformance
            metrics={metrics}
            account={account}
            scores={scores}
            trades={trades || []}
            onNavigateToTab={onNavigateToTab}
          />

          <DashboardPsychology
            trades={trades || []}
            onNavigateToTab={onNavigateToTab}
          />
        </div>
      </div>

      {/* ================================================================= */}
      {/* TIER 2 BENTO GRID: AI COACH • DAILY DEVELOPMENT • SIGNALS         */}
      {/* ================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-sky-500 rounded-sm"></span>
            <h3 className="text-xs font-military tracking-wider font-bold text-slate-300 uppercase">
              OPERATIONAL INTELLIGENCE: AI COACH • DEVELOPMENT • SIGNALS
            </h3>
          </div>
          <span className="text-[10px] font-mono-code text-slate-500 uppercase">TIER 2 BENTO</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DashboardAiCoach
            trades={trades || []}
            account={account}
            onNavigateToTab={onNavigateToTab}
          />

          <DashboardDailyDevelopment
            trades={trades || []}
            onNavigateToTab={onNavigateToTab}
          />

          <DashboardSignals
            onNavigateToTab={onNavigateToTab}
          />
        </div>
      </div>

      {/* ================================================================= */}
      {/* TIER 3: HIGH-SPEED OPERATIONAL TRIGGERS (QUICK ACTIONS)           */}
      {/* ================================================================= */}
      <DashboardQuickActions
        onOpenNewTrade={onOpenNewTrade}
        onNavigateToTab={onNavigateToTab}
      />

      {/* Row 2: Comprehensive Key Performance Metrics Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-military tracking-wider font-bold text-slate-400 uppercase">
            PRIMARY COMBAT STATISTICS
          </h3>
          <span className="text-xs font-mono-code text-slate-400">
            TOTAL DATA SAMPLES: {metrics.totalTrades} EXECUTIONS
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Win Rate */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Win Rate
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1 flex items-center gap-1.5">
              <span>{metrics.winRate.toFixed(1)}%</span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              {trades.filter((t) => t.profitLoss > 0).length}W -{' '}
              {trades.filter((t) => t.profitLoss < 0).length}L
            </div>
          </div>

          {/* Risk to Reward */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Risk-to-Reward
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1">
              1 : {metrics.riskRewardRatio.toFixed(2)}
            </div>
            <div className="mt-1 text-[10px] text-emerald-400 font-mono-code">
              Avg Win: {metrics.avgWinR.toFixed(1)}R
            </div>
          </div>

          {/* Profit Factor */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Profit Factor
            </span>
            <div
              className={`text-xl font-mono-code font-bold mt-1 ${
                metrics.profitFactor >= 2.0
                  ? 'text-emerald-400'
                  : metrics.profitFactor >= 1.2
                  ? 'text-slate-100'
                  : 'text-rose-400'
              }`}
            >
              {metrics.profitFactor.toFixed(2)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              {metrics.profitFactor > 2 ? 'Super-Institutional' : 'Target > 1.8'}
            </div>
          </div>

          {/* Average Win Trade */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Avg Win Trade
            </span>
            <div className="text-xl font-mono-code font-bold text-emerald-400 mt-1">
              +{formatCurrency(metrics.avgWinTrade, account.currency)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              +{metrics.avgWinR.toFixed(1)}R mean gain
            </div>
          </div>

          {/* Average Loss Trade */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Avg Loss Trade
            </span>
            <div className="text-xl font-mono-code font-bold text-rose-400 mt-1">
              -{formatCurrency(metrics.avgLossTrade, account.currency)}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              -{metrics.avgLossR.toFixed(1)}R controlled risk
            </div>
          </div>

          {/* Maximum Drawdown */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Max Drawdown
            </span>
            <div
              className={`text-xl font-mono-code font-bold mt-1 ${
                metrics.maxDrawdownPercent <= 3.0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {metrics.maxDrawdownPercent.toFixed(2)}%
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">
              -{formatCurrency(metrics.maxDrawdownAmount, account.currency)} peak-to-trough
            </div>
          </div>

          {/* Current Win Streak */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Win Streak (Curr/Max)
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>
                {metrics.currentWinStreak} / {metrics.maxWinStreak}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Consecutive wins</div>
          </div>

          {/* Current Loss Streak */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Loss Streak (Curr/Max)
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1 flex items-center gap-1.5">
              <span
                className={metrics.currentLossStreak > 1 ? 'text-rose-400' : 'text-slate-100'}
              >
                {metrics.currentLossStreak} / {metrics.maxLossStreak}
              </span>
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Consecutive losses</div>
          </div>

          {/* Total Trades */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Total Trades
            </span>
            <div className="text-xl font-mono-code font-bold text-slate-100 mt-1">
              {metrics.totalTrades}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Executed ops</div>
          </div>

          {/* Trades Today */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Trades Today
            </span>
            <div className="text-xl font-mono-code font-bold text-amber-400 mt-1">
              {metrics.tradesToday} / {account.maxDailyTrades}
            </div>
            <div className="mt-1 text-[10px] text-emerald-400 font-mono-code">
              {account.maxDailyTrades - metrics.tradesToday} slots remaining
            </div>
          </div>

          {/* Weekly Performance */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Weekly P&L
            </span>
            <div
              className={`text-xl font-mono-code font-bold mt-1 ${
                metrics.weeklyProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(metrics.weeklyProfitLoss, account.currency, { showSign: true })}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Last 7 calendar days</div>
          </div>

          {/* Monthly Performance */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-[11px] font-mono-code text-slate-400 block uppercase">
              Monthly P&L
            </span>
            <div
              className={`text-xl font-mono-code font-bold mt-1 ${
                metrics.monthlyProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatCurrency(metrics.monthlyProfitLoss, account.currency, { showSign: true })}
            </div>
            <div className="mt-1 text-[10px] text-slate-400 font-mono-code">Rolling 30 days</div>
          </div>
        </div>
      </div>

      {/* Row 3: Live Quick Recon & Recent Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tactical Edge Insights */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-4 h-4" />
                <h4 className="text-xs font-military font-bold tracking-wider text-slate-200">
                  SYSTEM INTELLIGENCE
                </h4>
              </div>
              <span className="text-[10px] font-mono-code text-slate-400">AUTOMATED AUDIT</span>
            </div>

            {trades.length === 0 ? (
              <div className="mt-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-center font-mono-code space-y-1.5">
                <div className="text-amber-400 font-bold text-xs">NO TRADING DATA AVAILABLE</div>
                <p className="text-[11px] text-slate-400">
                  CREATE YOUR FIRST JOURNAL AND ADD TRADES TO GENERATE PERFORMANCE ANALYTICS.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3 text-xs">
                {topStrategy && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    <div className="font-bold flex items-center gap-1.5 mb-1 font-mono-code">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      PRIME SETUP IDENTIFIED
                    </div>
                    Your <strong className="text-white">{topStrategy.strategy}</strong> setups boast a{' '}
                    <strong className="text-white">{topStrategy.winRate}% win rate</strong> with an average return of{' '}
                    <strong className="text-white">+{topStrategy.avgR}R</strong> across {topStrategy.trades} trades.
                  </div>
                )}

                {topSession && (
                  <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300">
                    <div className="font-bold flex items-center gap-1.5 mb-1 font-mono-code">
                      <Crosshair className="w-3.5 h-3.5" />
                      OPTIMAL TRADING ENVIRONMENT
                    </div>
                    <strong className="text-white">{topSession.name}</strong> is your top producing session yielding{' '}
                    <strong className="text-white">{formatCurrency(topSession.totalProfitLoss, account.currency, { showSign: true })}</strong>.
                  </div>
                )}

                {topPair && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300">
                    <div className="font-bold flex items-center gap-1.5 mb-1 font-mono-code">
                      <Sparkles className="w-3.5 h-3.5" />
                      TOP PAIR PERFORMANCE
                    </div>
                    Active volume is led by <strong className="text-white">{topPair.instrument}</strong> with{' '}
                    <strong className="text-white">{topPair.winRate}% accuracy</strong> and {topPair.trades} executions.
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            id="dash-explore-analytics-btn"
            onClick={() => onNavigateToTab('PERFORMANCE')}
            className="mt-4 w-full py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-military font-bold tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <span>OPEN SETUP PERFORMANCE LABORATORY</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Executions Log */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-slate-200">
                <Activity className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-military font-bold tracking-wider">
                  RECENT COMBAT EXECUTIONS
                </h4>
              </div>
              <button
                id="dash-view-all-journal-btn"
                onClick={() => onNavigateToTab('JOURNAL')}
                className="text-xs font-mono-code text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
              >
                <span>FULL JOURNAL ({trades.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-code">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/80">
                    <th className="pb-2 font-medium">TRADE ID</th>
                    <th className="pb-2 font-medium">PAIR</th>
                    <th className="pb-2 font-medium">DIR</th>
                    <th className="pb-2 font-medium">STRATEGY</th>
                    <th className="pb-2 font-medium">GRADE</th>
                    <th className="pb-2 font-medium">QUALITY</th>
                    <th className="pb-2 font-medium text-right">R-MULT</th>
                    <th className="pb-2 font-medium text-right">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {recentTrades.map((t) => {
                    const isWin = t.profitLoss > 0;
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 font-bold text-slate-200">{t.id}</td>
                        <td className="py-2.5 font-bold text-amber-400">{t.instrument}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.direction === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-300">{t.strategy}</td>
                        <td className="py-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.grade === 'A+' || t.grade === 'A'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : t.grade === 'B'
                                ? 'bg-sky-500/20 text-sky-400'
                                : t.grade === 'C'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {t.grade}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400">
                          {t.alignmentScore?.totalQuality || 85}/100
                        </td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            isWin ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isWin ? '+' : ''}
                          {t.rMultiple?.toFixed(1) || '0.0'}R
                        </td>
                        <td
                          className={`py-2.5 text-right font-bold ${
                            isWin ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {formatCurrency(t.profitLoss, account.currency, { showSign: true })}
                        </td>
                      </tr>
                    );
                  })}
                  {recentTrades.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-mono-code">
                        NO TRADES RECORDED FOR THIS ACCOUNT YET
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono-code">
            <span>SHOWING LAST 5 TRADES</span>
            <span className="text-emerald-400">
              DISCIPLINE PROTOCOL: 0 UNLOGGED POSITIONS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
