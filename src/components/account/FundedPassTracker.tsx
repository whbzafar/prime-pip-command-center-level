import React, { useMemo } from 'react';
import {
  Shield,
  Target,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Compass,
  ArrowRight,
  Calendar,
  Layers,
  HelpCircle,
  ExternalLink,
  Info,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Activity,
  Sliders,
  Check,
  Lock,
} from 'lucide-react';
import {
  AccountSettings,
  Trade,
  PassTrackerStatus,
  FundedPhase,
} from '../../types';
import {
  evaluateFundedAccountRisk,
  getEffectiveFundedConfig,
  isFundedAccount,
  getPhaseLabel,
  getDrawdownTypeLabel,
  calculatePhaseProgress,
  calculateDailyDrawdown,
  calculateOverallDrawdown,
  calculateTrailingDrawdown,
} from '../../utils/fundedRiskEngine';
import { formatCurrency, safeNumber } from '../../utils/currencyFormatter';

interface FundedPassTrackerProps {
  account: AccountSettings;
  trades: Trade[];
  onOpenJournal?: () => void;
  onOpenNewTrade?: () => void;
  onUpdateAccount?: (account: AccountSettings) => void;
}

export const FundedPassTracker: React.FC<FundedPassTrackerProps> = ({
  account,
  trades,
  onOpenJournal,
  onOpenNewTrade,
  onUpdateAccount,
}) => {
  const currency = account.currency || 'USD';
  const config = useMemo(() => getEffectiveFundedConfig(account), [account]);
  const evaluation = useMemo(() => evaluateFundedAccountRisk(account, trades), [account, trades]);

  // Closed trades
  const closedTrades = useMemo(
    () => trades.filter((t) => t.status !== 'OPEN'),
    [trades]
  );

  // Distinct qualifying trading days
  const distinctTradingDays = useMemo(() => {
    const days = new Set(
      closedTrades.map((t) => t.date || (t as any).timestamp?.slice(0, 10)).filter(Boolean)
    );
    return days.size;
  }, [closedTrades]);

  const requiredDays = config.minimumTradingDays || (account.rulesConfig?.minimumTradingDays) || 0;
  const areTradingDaysMet = requiredDays <= 0 || distinctTradingDays >= requiredDays;
  const remainingDays = Math.max(0, requiredDays - distinctTradingDays);

  // Phase Progress
  const phaseProgress = useMemo(
    () => calculatePhaseProgress(account, trades, config),
    [account, trades, config]
  );

  // Daily and Overall Drawdown calculations
  const dailyDrawdown = useMemo(
    () => calculateDailyDrawdown(account, trades, config),
    [account, trades, config]
  );

  const trailing = useMemo(
    () => calculateTrailingDrawdown(account, trades, config),
    [account, trades, config]
  );

  const overallDrawdown = useMemo(
    () => calculateOverallDrawdown(account, trades, config, trailing.activeLiquidationThreshold),
    [account, trades, config, trailing]
  );

  // Determine Pass Tracker Status
  const passStatus = useMemo<PassTrackerStatus>(() => {
    // 1. Breached status
    if (dailyDrawdown.isDailyDrawdownBreached || overallDrawdown.isOverallDrawdownBreached) {
      return 'BREACHED';
    }

    // 2. Unverified rules status
    if (config.ruleVerificationStatus === 'UNVERIFIED' || account.ruleVerificationStatus === 'UNVERIFIED') {
      return 'NEEDS_VERIFICATION';
    }

    // 3. Attention required (approaching limit)
    if (dailyDrawdown.dailyDrawdownUsedPercent >= 75 || overallDrawdown.overallDrawdownUsedPercent >= 75) {
      return 'ATTENTION_REQUIRED';
    }

    // 4. Completed or Awaiting confirmation
    if (phaseProgress.isTargetPassed) {
      if (config.phase === 'FUNDED_LIVE') {
        return 'COMPLETED';
      }
      if (areTradingDaysMet) {
        return 'REQUIREMENTS_APPARENTLY_MET';
      }
      return 'IN_PROGRESS'; // Target reached but days still needed
    }

    // 5. On Track vs In Progress
    // "On track" means net profit is positive, drawdowns healthy, and trading is moving toward target
    if (phaseProgress.currentNetProfit > 0 && dailyDrawdown.dailyDrawdownUsedPercent < 50 && overallDrawdown.overallDrawdownUsedPercent < 50) {
      return 'ON_TRACK';
    }

    return 'IN_PROGRESS';
  }, [dailyDrawdown, overallDrawdown, config, account, phaseProgress, areTradingDaysMet]);

  const statusBadge = useMemo(() => {
    switch (passStatus) {
      case 'BREACHED':
        return {
          label: 'Breached',
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
          desc: 'One or more configured prop limits have been exceeded.',
          icon: AlertOctagon,
        };
      case 'ATTENTION_REQUIRED':
        return {
          label: 'Attention Required',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
          desc: 'Account is approaching a configured loss limit (>75% buffer consumed).',
          icon: AlertTriangle,
        };
      case 'REQUIREMENTS_APPARENTLY_MET':
        return {
          label: 'Requirements Apparently Met',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          desc: 'Target achieved and minimum trading days satisfied. Awaiting provider confirmation.',
          icon: CheckCircle2,
        };
      case 'AWAITING_PROVIDER_CONFIRMATION':
        return {
          label: 'Awaiting Provider Confirmation',
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
          desc: 'Official confirmation pending with funding provider.',
          icon: Clock,
        };
      case 'COMPLETED':
        return {
          label: 'Completed / Funded',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          desc: 'Live funded account active. Preserve capital and trade for payouts.',
          icon: CheckCircle2,
        };
      case 'NEEDS_VERIFICATION':
        return {
          label: 'Needs Verification',
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
          desc: 'Rules contain unverified or custom settings. Verify against prop firm contract.',
          icon: HelpCircle,
        };
      case 'ON_TRACK':
        return {
          label: 'On Track',
          bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
          desc: 'Healthy drawdown cushion with positive progression toward target.',
          icon: TrendingUp,
        };
      case 'IN_PROGRESS':
      default:
        return {
          label: 'In Progress',
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          desc: 'Evaluation actively in progress.',
          icon: Clock,
        };
    }
  }, [passStatus]);

  // Outstanding Requirements
  const outstandingRequirements = useMemo(() => {
    const list: Array<{ title: string; satisfied: boolean; detail: string }> = [];

    // Profit Target
    list.push({
      title: `Profit Target: ${formatCurrency(phaseProgress.targetProfitDollars, currency)}`,
      satisfied: phaseProgress.isTargetPassed,
      detail: phaseProgress.isTargetPassed
        ? `Target reached! (+${formatCurrency(phaseProgress.currentNetProfit, currency)})`
        : `${formatCurrency(phaseProgress.remainingProfitTarget, currency)} remaining (${phaseProgress.profitProgressPercent}% achieved)`,
    });

    // Minimum Trading Days
    if (requiredDays > 0) {
      list.push({
        title: `Minimum Qualifying Days: ${requiredDays} Days`,
        satisfied: areTradingDaysMet,
        detail: areTradingDaysMet
          ? `${distinctTradingDays} qualifying days completed`
          : `${distinctTradingDays} completed (${remainingDays} days remaining)`,
      });
    }

    // Daily Loss Limit
    list.push({
      title: `Daily Loss Buffer (${config.dailyDrawdownPercent}% / ${formatCurrency(config.dailyDrawdownDollars, currency)})`,
      satisfied: !dailyDrawdown.isDailyDrawdownBreached,
      detail: dailyDrawdown.isDailyDrawdownBreached
        ? 'Breached today!'
        : `${formatCurrency(dailyDrawdown.remainingDailyDrawdown, currency)} headroom remaining today`,
    });

    // Overall Drawdown
    list.push({
      title: `Overall Drawdown Buffer (${config.overallDrawdownPercent}% / ${formatCurrency(config.overallDrawdownDollars, currency)})`,
      satisfied: !overallDrawdown.isOverallDrawdownBreached,
      detail: overallDrawdown.isOverallDrawdownBreached
        ? 'Maximum drawdown breached!'
        : `${formatCurrency(overallDrawdown.remainingOverallDrawdown, currency)} room above liquidation floor`,
    });

    // Restrictions
    if (config.newsRestriction) {
      list.push({
        title: 'News Trading Restriction',
        satisfied: true,
        detail: 'Do not hold open trades ±5m around red-folder news',
      });
    }
    if (config.weekendHoldingRestriction) {
      list.push({
        title: 'Weekend Holding Restriction',
        satisfied: true,
        detail: 'All positions must be closed before Friday market close',
      });
    }

    return list;
  }, [phaseProgress, currency, requiredDays, areTradingDaysMet, distinctTradingDays, remainingDays, config, dailyDrawdown, overallDrawdown]);

  // Next Action Recommendation
  const recommendedNextAction = useMemo(() => {
    if (dailyDrawdown.isDailyDrawdownBreached || overallDrawdown.isOverallDrawdownBreached) {
      return {
        action: 'Cease Trading Immediately',
        rationale: 'A hard drawdown threshold has been breached. Stop trading to avoid compounding losses and review official provider dashboard.',
        type: 'DANGER',
      };
    }
    if (passStatus === 'ATTENTION_REQUIRED') {
      return {
        action: 'Reduce Risk to 0.25% or Stand Aside Today',
        rationale: `Drawdown capacity is ${Math.max(dailyDrawdown.dailyDrawdownUsedPercent, overallDrawdown.overallDrawdownUsedPercent)}% utilized. Protecting remaining buffer takes precedence over new trades.`,
        type: 'WARNING',
      };
    }
    if (phaseProgress.isTargetPassed && areTradingDaysMet) {
      return {
        action: 'Stop Trading & Request Phase Verification',
        rationale: 'Target and days are satisfied. Do NOT risk accumulated gains. Preserve the account while waiting for firm confirmation.',
        type: 'SUCCESS',
      };
    }
    if (phaseProgress.isTargetPassed && !areTradingDaysMet) {
      return {
        action: 'Protect Gains: Fulfill Days with Micro-Lots',
        rationale: `Target is achieved, but ${remainingDays} qualifying days remain. Open 0.01 lot micro-positions on valid setups to register days without risking drawdown.`,
        type: 'INFO',
      };
    }
    return {
      action: 'Execute Disciplined Setups (Max 0.5% - 1.0% Risk)',
      rationale: `Account has ${formatCurrency(dailyDrawdown.remainingDailyDrawdown, currency)} daily room and ${formatCurrency(overallDrawdown.remainingOverallDrawdown, currency)} overall room. Maintain calibrated risk sizing.`,
      type: 'NORMAL',
    };
  }, [dailyDrawdown, overallDrawdown, passStatus, phaseProgress, areTradingDaysMet, remainingDays, currency]);

  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Current Evaluation Phase Status */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                  Pass Tracker &amp; Evaluation Monitor
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {config.firmName} ({getPhaseLabel(config.phase)})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic prop-firm rule audit • Phase requirements tracking • Early breach detection
              </p>
            </div>
          </div>

          {/* Current Evaluation Status Badge */}
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold text-xs uppercase tracking-wider ${statusBadge.bg}`}>
            <StatusIcon className="w-4 h-4 shrink-0" />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* Status Explanation */}
        <div className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-200">Current Phase Evaluation Status: </span>
            <span>{statusBadge.desc}</span>
          </div>
        </div>
      </div>

      {/* 2. Key Phase Metrics (Target, Progress, Daily Loss, Overall Drawdown, Days) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Profit Target */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <span>Profit Target</span>
            </span>
            <span className="text-[10px] font-mono text-purple-300 font-bold">
              {phaseProgress.profitProgressPercent}%
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-white">
            {formatCurrency(phaseProgress.currentNetProfit, currency)}
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {formatCurrency(phaseProgress.targetProfitDollars, currency)}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                phaseProgress.isTargetPassed ? 'bg-emerald-400' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, phaseProgress.profitProgressPercent))}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            {phaseProgress.isTargetPassed
              ? '✓ Target Passed'
              : `${formatCurrency(phaseProgress.remainingProfitTarget, currency)} left to target`}
          </span>
        </div>

        {/* Metric 2: Daily Drawdown Headroom */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Daily Loss Buffer</span>
            </span>
            <span className="text-[10px] font-mono text-rose-300">
              {dailyDrawdown.dailyDrawdownUsedPercent}% used
            </span>
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono ${
            dailyDrawdown.isDailyDrawdownBreached
              ? 'text-rose-400'
              : dailyDrawdown.dailyDrawdownUsedPercent >= 75
              ? 'text-amber-400'
              : 'text-emerald-400'
          }`}>
            {formatCurrency(dailyDrawdown.remainingDailyDrawdown, currency)}
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                dailyDrawdown.isDailyDrawdownBreached
                  ? 'bg-rose-500'
                  : dailyDrawdown.dailyDrawdownUsedPercent >= 75
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, dailyDrawdown.dailyDrawdownUsedPercent)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            Reset: {config.dailyResetTime || '00:00'} ({config.dailyResetTimezone || 'UTC'})
          </span>
        </div>

        {/* Metric 3: Overall Drawdown Headroom */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Max Drawdown</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-300">
              {getDrawdownTypeLabel(config.drawdownType)}
            </span>
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono ${
            overallDrawdown.isOverallDrawdownBreached ? 'text-rose-400' : 'text-slate-100'
          }`}>
            {formatCurrency(overallDrawdown.remainingOverallDrawdown, currency)}
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                overallDrawdown.isOverallDrawdownBreached ? 'bg-rose-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, overallDrawdown.overallDrawdownUsedPercent)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            Floor: {formatCurrency(overallDrawdown.liquidationFloorPrice, currency)}
          </span>
        </div>

        {/* Metric 4: Qualifying Trading Days */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="uppercase font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Trading Days</span>
            </span>
            <span className="text-[10px] font-mono text-blue-300">
              {requiredDays > 0 ? `${distinctTradingDays}/${requiredDays}` : 'No Min'}
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-white">
            {distinctTradingDays}
            <span className="text-xs font-normal text-slate-400 ml-1">
              / {requiredDays > 0 ? `${requiredDays} required` : 'None required'}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                areTradingDaysMet ? 'bg-emerald-400' : 'bg-blue-500'
              }`}
              style={{
                width: requiredDays > 0 ? `${Math.min(100, (distinctTradingDays / requiredDays) * 100)}%` : '100%',
              }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            {areTradingDaysMet ? '✓ Minimum Days Met' : `${remainingDays} more trading days required`}
          </span>
        </div>
      </div>

      {/* 3. Recommended Next Action Banner */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        recommendedNextAction.type === 'DANGER'
          ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          : recommendedNextAction.type === 'WARNING'
          ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
          : recommendedNextAction.type === 'SUCCESS'
          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
          : 'bg-slate-950 border-slate-800 text-slate-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-black/40 border border-white/10 shrink-0 mt-0.5">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                Recommended Next Action:
              </span>
              <strong className="text-xs font-bold text-white">{recommendedNextAction.action}</strong>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {recommendedNextAction.rationale}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenNewTrade && (
            <button
              type="button"
              onClick={onOpenNewTrade}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center gap-1 shadow-md cursor-pointer"
            >
              <span>Pre-Trade Check</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Outstanding Requirements Checklist */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>Evaluation Requirements Audit Checklist</span>
        </h4>

        <div className="divide-y divide-slate-800/80">
          {outstandingRequirements.map((req, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                  req.satisfied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
                }`}>
                  {req.satisfied ? '✓' : '•'}
                </span>
                <span className="font-medium text-slate-200">{req.title}</span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{req.detail}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  req.satisfied ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
                }`}>
                  {req.satisfied ? 'Satisfied' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
