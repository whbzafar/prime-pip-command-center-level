import React, { useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  Target,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Clock,
  Compass,
  TrendingUp,
  TrendingDown,
  Info,
  DollarSign,
  Zap,
  Crosshair,
  Calendar,
  Layers,
  Award,
  BookOpen,
} from 'lucide-react';
import { AccountSettings, Trade, FundedPhase } from '../../types';
import {
  evaluateFundedAccountRisk,
  getEffectiveFundedConfig,
  isFundedAccount,
  getPhaseLabel,
  getDrawdownTypeLabel,
} from '../../utils/fundedRiskEngine';
import { formatCurrency, safeNumber } from '../../utils/currencyFormatter';

interface EvaluationPassNavigatorProps {
  account: AccountSettings;
  trades: Trade[];
  onOpenJournal?: () => void;
  onOpenNewTrade?: (prefill?: Partial<Trade>) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const EvaluationPassNavigator: React.FC<EvaluationPassNavigatorProps> = ({
  account,
  trades,
  onOpenJournal,
  onOpenNewTrade,
  onNavigateToTab,
}) => {
  const currency = account.currency || 'USD';
  const isFunded = isFundedAccount(account);
  const isCent = account.isCentAccount || account.accountType === 'CENT_ACCOUNT' || currency === 'USC' || currency === 'Cent';
  const config = useMemo(() => getEffectiveFundedConfig(account), [account]);
  const evaluation = useMemo(() => evaluateFundedAccountRisk(account, trades), [account, trades]);

  // Sort trades by date & time descending to pinpoint the latest logged journal trade
  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.time || '00:00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.time || '00:00:00'}`).getTime();
      return (timeB || 0) - (timeA || 0);
    });
  }, [trades]);

  const latestTrade = sortedTrades.length > 0 ? sortedTrades[0] : null;
  const closedTrades = useMemo(() => sortedTrades.filter((t) => t.status !== 'OPEN'), [sortedTrades]);

  // Minimum trading days tracking
  const distinctDaysTraded = useMemo(() => {
    const days = new Set(closedTrades.map((t) => t.date).filter(Boolean));
    return days.size;
  }, [closedTrades]);

  const minTradingDaysRequired = config.minimumTradingDays || 4;
  const tradingDaysCompleted = distinctDaysTraded >= minTradingDaysRequired;
  const tradingDaysRemaining = Math.max(0, minTradingDaysRequired - distinctDaysTraded);

  // Latest trade analysis
  const latestTradeAnalysis = useMemo(() => {
    if (!latestTrade) return null;

    const pnl = safeNumber(latestTrade.profitLoss, 0);
    const isWin = pnl > 0;
    const isLoss = pnl < 0;
    const isBreakeven = pnl === 0;

    const startBal = Math.max(1, evaluation.startingBalance);
    const pnlPercent = (pnl / startBal) * 100;
    const targetDollars = evaluation.activeProfitTargetDollars;
    const targetProgressImpact = targetDollars > 0 ? (pnl / targetDollars) * 100 : 0;

    // Daily drawdown consumption of this trade
    const dailyLimit = evaluation.dailyDrawdownLimitDollars;
    const dailyLossConsumed = isLoss ? Math.min(100, (Math.abs(pnl) / Math.max(1, dailyLimit)) * 100) : 0;

    // R:R Multiple
    let realizedR = '—';
    if (typeof latestTrade.riskRewardRatio === 'number') {
      realizedR = `${latestTrade.riskRewardRatio > 0 ? '+' : ''}${latestTrade.riskRewardRatio.toFixed(2)}R`;
    } else if (latestTrade.pips && latestTrade.stopLoss && latestTrade.entryPrice) {
      const slDist = Math.abs(latestTrade.entryPrice - latestTrade.stopLoss);
      if (slDist > 0 && latestTrade.exitPrice) {
        const gainDist = (latestTrade.type === 'BUY' ? latestTrade.exitPrice - latestTrade.entryPrice : latestTrade.entryPrice - latestTrade.exitPrice);
        const rVal = gainDist / slDist;
        realizedR = `${rVal > 0 ? '+' : ''}${rVal.toFixed(2)}R`;
      }
    }

    return {
      trade: latestTrade,
      pnl,
      pnlPercent,
      isWin,
      isLoss,
      isBreakeven,
      targetProgressImpact,
      dailyLossConsumed,
      realizedR,
    };
  }, [latestTrade, evaluation]);

  // Prescribed Instrument Stop Loss (SL) & Position Sizing Matrix
  const recommendedRiskDollars = evaluation.recommendedRiskDollars;
  const sizingGuide = useMemo(() => {
    // Pip value per 1 standard lot (USD account baseline)
    // Gold: 1 lot = 100 oz -> 1 pip (0.10) = $10.00
    // EURUSD: 1 lot = 100k -> 1 pip (0.0001) = $10.00
    // US30: 1 lot = $1/point
    // If cent account, multiplier is 100
    const centMult = isCent ? 100 : 1;

    const goldSLPips = 30; // standard 30-pip gold SL
    const goldPipVal = 10 * centMult;
    const goldLots = Math.max(0.01, Number((recommendedRiskDollars / (goldSLPips * goldPipVal)).toFixed(2)));

    const fxSLPips = 20; // standard 20-pip FX SL
    const fxPipVal = 10 * centMult;
    const fxLots = Math.max(0.01, Number((recommendedRiskDollars / (fxSLPips * fxPipVal)).toFixed(2)));

    const us30SLPoints = 40; // standard 40-point index SL
    const us30PointVal = 1 * centMult;
    const us30Lots = Math.max(0.01, Number((recommendedRiskDollars / (us30SLPoints * us30PointVal)).toFixed(2)));

    return {
      gold: { slRange: '25 – 35 Pips (30p standard)', recommendedLots: goldLots },
      forex: { slRange: '15 – 22 Pips (20p standard)', recommendedLots: fxLots },
      indices: { slRange: '35 – 50 Points (40pt standard)', recommendedLots: us30Lots },
    };
  }, [recommendedRiskDollars, isCent]);

  // Projected wins needed to pass Phase 1 or Phase 2
  const targetDistanceRemaining = Math.max(0, evaluation.remainingProfitTarget);
  const targetPassed = evaluation.profitProgressPercent >= 100;
  const projectedWinsAt2R = useMemo(() => {
    const profitPerWin = recommendedRiskDollars * 2.0; // 1:2 R:R
    if (profitPerWin <= 0 || targetDistanceRemaining <= 0) return 0;
    return Math.ceil(targetDistanceRemaining / profitPerWin);
  }, [recommendedRiskDollars, targetDistanceRemaining]);

  const projectedWinsAt1_5R = useMemo(() => {
    const profitPerWin = recommendedRiskDollars * 1.5; // 1:1.5 R:R
    if (profitPerWin <= 0 || targetDistanceRemaining <= 0) return 0;
    return Math.ceil(targetDistanceRemaining / profitPerWin);
  }, [recommendedRiskDollars, targetDistanceRemaining]);

  // Dynamic Phase Name Display
  const phaseLabel = isFunded ? getPhaseLabel(config.phase) : (isCent ? '100-Cent Real Challenge' : 'Simulated Evaluation');
  const phaseTargetPct = config.phase === 'PHASE_2' ? config.profitTargets?.phase2TargetPercent || 5 : config.profitTargets?.phase1TargetPercent || 8;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0B0F19] via-[#0E1526] to-[#0A0D18] border border-cyan-500/40 p-5 sm:p-6 shadow-2xl space-y-6 text-slate-100 font-sans">
      {/* 1. HEADER: INTELLIGENT ACCOUNT & EVALUATION DETECTION */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-military font-bold text-white uppercase tracking-wider">
                EVALUATION PASS NAVIGATOR &amp; GUIDANCE
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono-code font-bold bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 uppercase">
                {config.firmName} • {phaseLabel}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono-code font-bold uppercase ${
                targetPassed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : evaluation.remainingDailyDrawdown <= 0 || evaluation.remainingOverallDrawdown <= 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-blue-500/20 text-cyan-200 border border-blue-500/40'
              }`}>
                {targetPassed ? '🏆 TARGET ACHIEVED' : evaluation.verdict === 'TAKE_TRADE' ? '🟢 ON TRACK TO PASS' : evaluation.verdict === 'REDUCE_RISK' ? '🟡 DEFENSIVE PROTOCOL' : '🔴 ACTION REQUIRED'}
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400 mt-1">
              Deterministic rule tracking, automated journal trade autopsy, and precision Stop-Loss flightpaths to pass your evaluation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap font-mono-code text-xs">
          {onOpenNewTrade && (
            <button
              type="button"
              onClick={() => onOpenNewTrade()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-military font-bold tracking-wider uppercase transition shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>LOG TRADE IN JOURNAL</span>
            </button>
          )}
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => onNavigateToTab('LOT_SIZE')}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 text-xs font-military font-bold tracking-wider uppercase transition cursor-pointer"
            >
              LOT CALCULATOR →
            </button>
          )}
        </div>
      </div>

      {/* 2. ESTABLISHED ACCOUNT PARAMETERS MATRIX (CLEARLY DISPLAYED AS REQUESTED) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-military font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>ESTABLISHED ACCOUNT RULES &amp; PARAMETERS</span>
          </span>
          <span className="text-[11px] font-mono-code text-slate-400">
            Profile: {config.firmName} ({account.accountType || 'Evaluation'})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono-code text-xs">
          {/* Param 1: Starting Capital */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-medium">Starting Capital</span>
            <span className="text-sm sm:text-base font-bold text-white mt-0.5 block truncate">
              {formatCurrency(evaluation.startingBalance, currency)}
            </span>
            <span className="text-[9px] text-slate-500 block truncate">
              {isCent ? '10,000 Cent Unit' : 'Baseline Reference'}
            </span>
          </div>

          {/* Param 2: Daily Drawdown Limit */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/30">
            <span className="text-[10px] text-cyan-300 uppercase block font-medium">Daily Drawdown</span>
            <span className="text-sm sm:text-base font-bold text-cyan-400 mt-0.5 block truncate">
              {config.dailyDrawdownPercent}% ({formatCurrency(evaluation.dailyDrawdownLimitDollars, currency)})
            </span>
            <span className="text-[9px] text-slate-400 block truncate">
              Resets 00:00 UTC / 05:00 PKT
            </span>
          </div>

          {/* Param 3: Overall Max Drawdown */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30">
            <span className="text-[10px] text-amber-300 uppercase block font-medium">Max Drawdown</span>
            <span className="text-sm sm:text-base font-bold text-amber-300 mt-0.5 block truncate">
              {config.overallDrawdownPercent}% ({formatCurrency(evaluation.overallDrawdownLimitDollars, currency)})
            </span>
            <span className="text-[9px] text-slate-400 block truncate">
              Floor: {formatCurrency(evaluation.activeLiquidationThreshold, currency)}
            </span>
          </div>

          {/* Param 4: Phase Profit Target */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30">
            <span className="text-[10px] text-emerald-300 uppercase block font-medium">Phase Target</span>
            <span className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5 block truncate">
              {phaseTargetPct}% ({formatCurrency(evaluation.activeProfitTargetDollars, currency)})
            </span>
            <span className="text-[9px] text-slate-400 block truncate">
              {evaluation.profitProgressPercent}% achieved
            </span>
          </div>

          {/* Param 5: Minimum Trading Days */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-medium">Min Trading Days</span>
            <span className="text-sm sm:text-base font-bold text-slate-200 mt-0.5 block truncate">
              {distinctDaysTraded} / {minTradingDaysRequired} Days
            </span>
            <span className={`text-[9px] block truncate font-bold ${tradingDaysCompleted ? 'text-emerald-400' : 'text-amber-400'}`}>
              {tradingDaysCompleted ? '✓ Requirement Met' : `${tradingDaysRemaining} more days needed`}
            </span>
          </div>

          {/* Param 6: Max Risk Allowed Per Trade */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block font-medium">Risk Limit / Trade</span>
            <span className="text-sm sm:text-base font-bold text-white mt-0.5 block truncate">
              {config.preferredRiskPercent}% – {config.maxRiskPerTradePercent}%
            </span>
            <span className="text-[9px] text-slate-400 block truncate">
              Max {account.maxDailyTrades || 2} trades / day
            </span>
          </div>
        </div>
      </div>

      {/* 3. LATEST TRADE JOURNAL ENTRY AUTOPSY (AUTOMATICALLY DETECTED AS REQUESTED) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#090D18] border border-slate-800 space-y-3 font-mono-code text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
              LATEST JOURNAL TRADE AUTOPSY &amp; IMPACT ANALYSIS
            </span>
          </div>
          {latestTrade && (
            <span className="text-[10px] text-slate-400">
              Logged: {latestTrade.date} {latestTrade.time || ''}
            </span>
          )}
        </div>

        {latestTradeAnalysis ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* Instrument & Direction */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Instrument / Direction</span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {latestTradeAnalysis.trade.pair || 'XAUUSD'}
                </span>
                <span className={`text-[10px] font-bold block ${latestTradeAnalysis.trade.type === 'BUY' ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {latestTradeAnalysis.trade.type} • {latestTradeAnalysis.trade.lotSize || 1.0} Lots
                </span>
              </div>

              {/* Outcome */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Trade Outcome</span>
                <span className={`text-sm font-bold mt-0.5 block ${
                  latestTradeAnalysis.isWin ? 'text-emerald-400' : latestTradeAnalysis.isLoss ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {latestTradeAnalysis.isWin ? '🏆 WINNING TRADE' : latestTradeAnalysis.isLoss ? '🔴 LOSS LOGGED' : '⚪ BREAKEVEN'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Model: {latestTradeAnalysis.trade.setupModel || 'SBT-01'}
                </span>
              </div>

              {/* PnL Amount */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Profit / Loss</span>
                <span className={`text-sm sm:text-base font-bold mt-0.5 block ${
                  latestTradeAnalysis.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {latestTradeAnalysis.pnl >= 0 ? '+' : ''}{formatCurrency(latestTradeAnalysis.pnl, currency)}
                </span>
                <span className={`text-[10px] font-bold block ${latestTradeAnalysis.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {latestTradeAnalysis.pnlPercent >= 0 ? '+' : ''}{latestTradeAnalysis.pnlPercent.toFixed(2)}% of Account
                </span>
              </div>

              {/* Realized R-Multiple */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Realized R:R</span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {latestTradeAnalysis.realizedR}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  SL: {latestTradeAnalysis.trade.stopLoss || 'Set'}
                </span>
              </div>

              {/* Evaluation Target Impact */}
              <div className="col-span-2 sm:col-span-4 lg:col-span-1 p-3 rounded-xl bg-slate-950 border border-cyan-500/30">
                <span className="text-[10px] text-cyan-300 uppercase block font-bold">Target Impact</span>
                <span className={`text-sm font-bold mt-0.5 block ${latestTradeAnalysis.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {latestTradeAnalysis.targetProgressImpact >= 0 ? '+' : ''}{latestTradeAnalysis.targetProgressImpact.toFixed(1)}% of Target
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {latestTradeAnalysis.isLoss ? `${latestTradeAnalysis.dailyLossConsumed.toFixed(1)}% Daily DD used` : 'Advances Phase Goal'}
                </span>
              </div>
            </div>

            {/* Contextual Narrative Guidance from the Trade Result */}
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              latestTradeAnalysis.isWin
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : latestTradeAnalysis.isLoss
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-start gap-2.5">
                {latestTradeAnalysis.isWin ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block font-bold">
                    {latestTradeAnalysis.isWin
                      ? `Target Progress Confirmed: You banked ${formatCurrency(latestTradeAnalysis.pnl, currency)} (+${latestTradeAnalysis.pnlPercent.toFixed(2)}%) towards your ${phaseLabel} milestone.`
                      : `Risk Containment Alert: Trade closed at -${formatCurrency(Math.abs(latestTradeAnalysis.pnl), currency)} (-${Math.abs(latestTradeAnalysis.pnlPercent).toFixed(2)}%). Your remaining daily buffer is ${formatCurrency(evaluation.remainingDailyDrawdown, currency)}.`}
                  </strong>
                  <span className="text-[11px] opacity-90 mt-0.5 block">
                    {latestTradeAnalysis.isWin
                      ? 'Actionable Rule: Do NOT increase lot sizes due to euphoria. Keep risk locked at your calibrated base risk (0.50% / ' + formatCurrency(recommendedRiskDollars, currency) + ') on the next trade to preserve this gain.'
                      : 'Actionable Rule: Avoid revenge trading! Your next trade risk is automatically scaled down to ' + evaluation.recommendedRiskPercent + '% (' + formatCurrency(recommendedRiskDollars, currency) + '). Wait for a clear A+ setup.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center space-y-2">
            <Info className="w-5 h-5 text-cyan-400 mx-auto" />
            <p className="text-slate-300">
              No journal entries recorded yet. Once you log a trade in your Trade Journal, this navigator will automatically track its P&amp;L impact and give step-by-step guidance to pass {phaseLabel}.
            </p>
            {onOpenNewTrade && (
              <button
                type="button"
                onClick={() => onOpenNewTrade()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold hover:bg-cyan-500/30 transition cursor-pointer"
              >
                + Record Your First Trade Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. ACTIONABLE ROADMAP & HOW TO PROCEED TO PASS PHASE 1 (OR PHASE 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Exact Flightpath & Prescribed Stop-Loss / Lot Sizes */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0A0E1A] border border-cyan-500/35 space-y-4 font-mono-code text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                HOW TO PROCEED: NEXT TRADE EXECUTION FLIGHTPATH
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold uppercase">
              RECOMMENDED RISK: {evaluation.recommendedRiskPercent}% ({formatCurrency(recommendedRiskDollars, currency)})
            </span>
          </div>

          {/* Actionable Stop-Loss & Lot Size Guidance for Common Instruments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-[11px] font-bold uppercase">
                Prescribed Stop-Loss (SL) &amp; Lot Limits for Next Trade:
              </span>
              <span className="text-[10px] text-slate-400">
                100% Calibrated to {formatCurrency(recommendedRiskDollars, currency)} Risk
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Gold (XAUUSD) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30">
                <span className="text-[10px] text-amber-300 font-bold block uppercase">XAUUSD (Gold)</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {sizingGuide.gold.recommendedLots} Lots
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  SL Range: {sizingGuide.gold.slRange}
                </span>
                <span className="text-[9px] text-amber-400/80 block mt-1">
                  Risk: {formatCurrency(recommendedRiskDollars, currency)}
                </span>
              </div>

              {/* Forex Majors (EURUSD / GBPUSD) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/30">
                <span className="text-[10px] text-cyan-300 font-bold block uppercase">EURUSD / GBPUSD</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {sizingGuide.forex.recommendedLots} Lots
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  SL Range: {sizingGuide.forex.slRange}
                </span>
                <span className="text-[9px] text-cyan-400/80 block mt-1">
                  Risk: {formatCurrency(recommendedRiskDollars, currency)}
                </span>
              </div>

              {/* Indices (US30 / NAS100) */}
              <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30">
                <span className="text-[10px] text-purple-300 font-bold block uppercase">US30 / NAS100</span>
                <span className="text-sm font-bold text-white mt-1 block">
                  {sizingGuide.indices.recommendedLots} Lots
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  SL Range: {sizingGuide.indices.slRange}
                </span>
                <span className="text-[9px] text-purple-400/80 block mt-1">
                  Risk: {formatCurrency(recommendedRiskDollars, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Actionable Passing Checklist */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-slate-200">
            <span className="font-bold text-cyan-300 uppercase text-[11px] block">
              Step-by-Step Instructions to Pass {phaseLabel}:
            </span>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">1.</span>
                <span>
                  <strong>Maintain calibrated risk:</strong> Risk exactly <strong>{formatCurrency(recommendedRiskDollars, currency)} ({evaluation.recommendedRiskPercent}%)</strong> on your next trade. Never oversize.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">2.</span>
                <span>
                  <strong>Aim for minimum 1:1.5R to 1:2R:</strong> At 1:2 R:R, you need only <strong>{projectedWinsAt2R} clean winning trades</strong> to complete your {formatCurrency(targetDistanceRemaining, currency)} target gap.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">3.</span>
                <span>
                  <strong>Observe daily loss headroom:</strong> You have <strong>{formatCurrency(evaluation.remainingDailyDrawdown, currency)}</strong> of daily room left. If a trade hits SL, cease trading or reduce risk by 50% for the next setup.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">4.</span>
                <span>
                  <strong>Trading days fulfillment:</strong> Complete {tradingDaysRemaining > 0 ? `${tradingDaysRemaining} more qualifying trading days` : 'all minimum trading days (fulfilled)'} before requesting certificate verification.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right 5 Cols: Target Progress & Remaining Flightpath */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0A0E1A] border border-slate-800 space-y-4 font-mono-code text-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
                  TARGET PROGRESSION
                </span>
              </div>
              <span className="font-bold text-emerald-400">{evaluation.profitProgressPercent}% Done</span>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-3 rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, evaluation.profitProgressPercent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Start: {formatCurrency(0, currency)}</span>
                <span>Target: +{formatCurrency(evaluation.activeProfitTargetDollars, currency)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Current Realized Profit:</span>
                <span className={`font-bold ${evaluation.currentProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {evaluation.currentProfitLoss >= 0 ? '+' : ''}{formatCurrency(evaluation.currentProfitLoss, currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Remaining to Pass {phaseLabel}:</span>
                <span className="font-bold text-amber-300">
                  {formatCurrency(targetDistanceRemaining, currency)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                <span>Trades to Pass at 1:2 R:R:</span>
                <span className="font-bold text-cyan-300">~{projectedWinsAt2R} Trades</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Trades to Pass at 1:1.5 R:R:</span>
                <span className="font-bold text-cyan-300">~{projectedWinsAt1_5R} Trades</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/40 via-slate-950 to-blue-950/30 border border-cyan-500/30 text-[11px] leading-relaxed">
            <span className="text-cyan-300 font-bold block uppercase mb-0.5">
              Evaluation Passing Verdict:
            </span>
            <p className="text-slate-300">
              {evaluation.nextTradeRiskQuestionAnswer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
