import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Layers,
  Award,
  Sparkles,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PieChart,
  PlusCircle,
  ShieldCheck,
  Flame,
  AlertCircle,
} from 'lucide-react';
import { Trade, AccountSettings } from '../types';
import {
  calculateStrategyMetrics,
  calculateSessionMetrics,
  calculatePairMetrics,
  calculateTimeframeMetrics,
  calculateGradeMetrics,
} from '../utils/tradeAnalytics';
import { formatCurrency } from '../utils/currencyFormatter';
import { formatTradeDateTime, formatTo12Hour } from '../utils/time';
import { EvaluationEngine } from './EvaluationEngine';

interface PerformanceLabProps {
  trades: Trade[];
  account?: AccountSettings;
  onOpenNewTrade?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const PerformanceLab: React.FC<PerformanceLabProps> = ({
  trades,
  account,
  onOpenNewTrade,
  onNavigateToTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'OVERVIEW' | 'EVALUATION' | 'STRATEGY' | 'SESSIONS' | 'PAIRS' | 'TIMEFRAMES' | 'GRADES'>('OVERVIEW');
  const currency = account?.currency || 'USD';

  // Strict check: If user has not entered any trades, display the empty state with zero fake data.
  if (!trades || trades.length === 0) {
    return (
      <div className="space-y-6">
        {/* Empty State Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-500/10">
              <BarChart3 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono-code uppercase px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                AUDIT ENGINE READY
              </span>
              <h2 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wider">
                NO TRADING DATA AVAILABLE
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-mono-code leading-relaxed">
                CREATE YOUR FIRST JOURNAL AND ADD TRADES TO GENERATE PERFORMANCE ANALYTICS.
              </p>
            </div>

            <p className="text-xs text-slate-400 font-sans max-w-md mx-auto">
              Real-time analytics for pairs, timeframes, sessions, and SBT models will automatically populate strictly from your real recorded trade executions.
            </p>

            {onOpenNewTrade && (
              <div className="pt-3">
                <button
                  id="perf-empty-record-trade-btn"
                  onClick={onOpenNewTrade}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-military font-bold text-xs tracking-wider shadow-lg shadow-amber-500/20 transition transform active:scale-95"
                >
                  <PlusCircle className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                  <span>RECORD YOUR FIRST TRADE</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Real Analytical Metrics from user trades only ---
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.profitLoss > 0);
  const losingTrades = trades.filter((t) => t.profitLoss < 0);
  const breakevenTrades = trades.filter((t) => t.profitLoss === 0);

  const winRate = totalTrades > 0 ? Math.round((winningTrades.length / totalTrades) * 100) : 0;
  const lossRate = totalTrades > 0 ? Math.round((losingTrades.length / totalTrades) * 100) : 0;

  const grossProfit = winningTrades.reduce((acc, t) => acc + t.profitLoss, 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.profitLoss, 0));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;

  const avgWinTrade = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLossTrade = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

  const totalR = trades.reduce((acc, t) => acc + (t.rMultiple || 0), 0);
  const avgRMultiple = totalTrades > 0 ? Number((totalR / totalTrades).toFixed(2)) : 0;

  const totalNetProfitLoss = trades.reduce((acc, t) => acc + t.profitLoss, 0);

  // Best and worst trade calculations
  const closedTrades = trades.filter((t) => t.status !== 'OPEN');
  const sortedByPnl = [...closedTrades].sort((a, b) => b.profitLoss - a.profitLoss);
  const bestTrade = sortedByPnl.length > 0 ? sortedByPnl[0] : null;
  // If only 1 trade exists, worstTrade MUST be null (NO COMPARISON AVAILABLE)
  // Do NOT duplicate the best trade, and do NOT invent an imaginary loss
  const worstTrade = sortedByPnl.length >= 2 ? sortedByPnl[sortedByPnl.length - 1] : null;

  // Maximum drawdown calculation
  const startBal = account?.initialBalance || 100000;
  let peak = startBal;
  let running = startBal;
  let maxDrawdownDollars = 0;
  let maxDrawdownPct = 0;

  // Chronological order for drawdown
  const chronoTrades = [...trades].sort((a, b) => {
    return (a.date + a.time).localeCompare(b.date + b.time);
  });

  for (const t of chronoTrades) {
    running += t.profitLoss;
    if (running > peak) peak = running;
    const dd = peak - running;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    if (dd > maxDrawdownDollars) maxDrawdownDollars = dd;
    if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
  }

  // Instrument / Pair aggregation
  const pairMetrics = calculatePairMetrics(trades);
  const mostTradedPair = [...pairMetrics].sort((a, b) => b.trades - a.trades)[0] || null;
  const mostProfitablePair = [...pairMetrics].sort((a, b) => b.totalProfitLoss - a.totalProfitLoss)[0] || null;

  // Strategy / SBT Model aggregation
  const strategyMetrics = calculateStrategyMetrics(trades);
  const mostUsedSbtModel = [...strategyMetrics].sort((a, b) => b.trades - a.trades)[0] || null;
  const mostProfitableSbtModel = [...strategyMetrics].sort((a, b) => b.totalProfitLoss - a.totalProfitLoss)[0] || null;

  // Timeframe aggregation
  const timeframeMetrics = calculateTimeframeMetrics(trades);
  const mostUsedTimeframe = [...timeframeMetrics].sort((a, b) => b.trades - a.trades)[0] || null;
  const mostProfitableTimeframe = [...timeframeMetrics].sort((a, b) => b.totalProfitLoss - a.totalProfitLoss)[0] || null;

  // Session aggregation
  const sessionMetrics = calculateSessionMetrics(trades);
  const mostActiveSession = [...sessionMetrics].sort((a, b) => b.trades - a.trades)[0] || null;
  const mostProfitableSession = [...sessionMetrics].sort((a, b) => b.totalProfitLoss - a.totalProfitLoss)[0] || null;

  // Grade metrics
  const gradeMetrics = calculateGradeMetrics(trades);

  return (
    <div className="space-y-6">
      {/* Top Directive Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0F172A] border border-amber-500/30 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-amber-500/5 blur-3xl pointer-events-none"></div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                  PERFORMANCE LAB • LIVE AUDIT
                </span>
                <span className="text-[10px] font-mono-code text-slate-400">
                  {totalTrades} EXECUTIONS RECORDED
                </span>
              </div>
              <h2 className="text-lg font-military font-bold text-slate-100 tracking-wide mt-1">
                TACTICAL EXPECTANCY SYNTHESIS
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Real-time mathematical breakdown derived exclusively from your active account trade log.
              </p>
            </div>
          </div>

          {/* Quick Stat Pill */}
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-lg text-right font-mono-code">
              <span className="text-[10px] text-slate-400 block uppercase">NET RESULT</span>
              <span className={`text-base font-bold ${totalNetProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(totalNetProfitLoss, currency, { showSign: true })}
              </span>
            </div>
            {onOpenNewTrade && (
              <button
                id="perf-log-trade-btn"
                onClick={onOpenNewTrade}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-military font-bold tracking-wider shadow transition"
              >
                <PlusCircle className="w-4 h-4 text-slate-950" />
                <span>NEW TRADE</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 1: Core Performance Indicators Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[10px] font-mono-code text-slate-400 block uppercase">TOTAL TRADES</span>
          <span className="text-xl font-bold font-mono-code text-slate-100 mt-0.5 block">{totalTrades}</span>
          <span className="text-[10px] font-mono-code text-slate-500 mt-1 block">
            {winningTrades.length}W • {losingTrades.length}L {breakevenTrades.length > 0 ? `• ${breakevenTrades.length}BE` : ''}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[10px] font-mono-code text-slate-400 block uppercase">WIN RATE</span>
          <span className={`text-xl font-bold font-mono-code mt-0.5 block ${winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {winRate}%
          </span>
          <span className="text-[10px] font-mono-code text-slate-500 mt-1 block">
            LOSS RATE: {lossRate}%
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[10px] font-mono-code text-slate-400 block uppercase">PROFIT FACTOR</span>
          <span className={`text-xl font-bold font-mono-code mt-0.5 block ${profitFactor >= 1.5 ? 'text-emerald-400' : profitFactor >= 1.0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {profitFactor}
          </span>
          <span className="text-[10px] font-mono-code text-slate-500 mt-1 block">
            RATIO W/L PROFIT
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[10px] font-mono-code text-slate-400 block uppercase">AVG R-MULTIPLE</span>
          <span className={`text-xl font-bold font-mono-code mt-0.5 block ${avgRMultiple >= 1.0 ? 'text-amber-400' : 'text-slate-200'}`}>
            {avgRMultiple >= 0 ? '+' : ''}{avgRMultiple}R
          </span>
          <span className="text-[10px] font-mono-code text-slate-500 mt-1 block">PER EXECUTION</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[10px] font-mono-code text-slate-400 block uppercase">AVERAGE WIN</span>
          <span className="text-xl font-bold font-mono-code text-emerald-400 mt-0.5 block">
            {formatCurrency(avgWinTrade, currency)}
          </span>
          <span className="text-[10px] font-mono-code text-slate-500 mt-1 block">
            WINNING TRADES
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 shadow">
          <span className="text-[10px] font-mono-code text-slate-400 block uppercase">AVERAGE LOSS</span>
          <span className="text-xl font-bold font-mono-code text-rose-400 mt-0.5 block">
            {formatCurrency(avgLossTrade, currency)}
          </span>
          <span className="text-[10px] font-mono-code text-slate-500 mt-1 block">
            LOSING TRADES
          </span>
        </div>
      </div>

      {/* Section 2: Sweet Spot Recon (Pair, Model, Session, Timeframe) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Most Traded & Profitable Pair */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold">INSTRUMENTS</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 space-y-2 text-xs font-mono-code">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">
                {pairMetrics.length <= 1 ? 'LOGGED INSTRUMENT' : 'MOST TRADED PAIR'}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-bold text-amber-400 text-sm">{mostTradedPair?.instrument || 'N/A'}</span>
                <span className="text-slate-400 text-[11px]">{mostTradedPair?.trades || 0} trade{mostTradedPair?.trades === 1 ? '' : 's'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-slate-500 block text-[10px] uppercase">
                {pairMetrics.length <= 1 ? 'INSTRUMENT NET RESULT' : 'MOST PROFITABLE PAIR'}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-bold text-slate-300 text-sm">{mostProfitablePair?.instrument || 'N/A'}</span>
                <span className={`text-[11px] font-bold ${mostProfitablePair && mostProfitablePair.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {mostProfitablePair ? formatCurrency(mostProfitablePair.totalProfitLoss, currency, { showSign: true }) : '$0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Most Used & Profitable SBT Model */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold">SBT MODELS</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 space-y-2 text-xs font-mono-code">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">
                {strategyMetrics.length <= 1 ? 'LOGGED SBT MODEL' : 'MOST USED SBT MODEL'}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-bold text-amber-400 text-sm">{mostUsedSbtModel?.strategy || 'N/A'}</span>
                <span className="text-slate-400 text-[11px]">{mostUsedSbtModel?.trades || 0} trade{mostUsedSbtModel?.trades === 1 ? '' : 's'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-slate-500 block text-[10px] uppercase">
                {strategyMetrics.length <= 1 ? 'MODEL NET RESULT' : 'MOST PROFITABLE MODEL'}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-bold text-slate-300 text-sm">{mostProfitableSbtModel?.strategy || 'N/A'}</span>
                <span className={`text-[11px] font-bold ${mostProfitableSbtModel && mostProfitableSbtModel.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {mostProfitableSbtModel ? formatCurrency(mostProfitableSbtModel.totalProfitLoss, currency, { showSign: true }) : '$0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Most Used & Profitable Timeframe */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold">TIMEFRAMES</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 space-y-2 text-xs font-mono-code">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">
                {timeframeMetrics.length <= 1 ? 'LOGGED TIMEFRAME' : 'MOST USED TIMEFRAME'}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-bold text-amber-400 text-sm">{mostUsedTimeframe?.timeframe || 'N/A'}</span>
                <span className="text-slate-400 text-[11px]">{mostUsedTimeframe?.trades || 0} trade{mostUsedTimeframe?.trades === 1 ? '' : 's'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-slate-500 block text-[10px] uppercase">
                {timeframeMetrics.length <= 1 ? 'TIMEFRAME NET RESULT' : 'MOST PROFITABLE TIMEFRAME'}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-bold text-slate-300 text-sm">{mostProfitableTimeframe?.timeframe || 'N/A'}</span>
                <span className={`text-[11px] font-bold ${mostProfitableTimeframe && mostProfitableTimeframe.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {mostProfitableTimeframe ? formatCurrency(mostProfitableTimeframe.totalProfitLoss, currency, { showSign: true }) : '$0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Most Active & Profitable Session */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[10px] font-mono-code text-slate-400 uppercase font-bold">SESSIONS</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 space-y-2 text-xs font-mono-code">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">
                {sessionMetrics.length <= 1 ? 'LOGGED SESSION' : 'MOST ACTIVE SESSION'}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-bold text-sky-400 text-sm">{mostActiveSession?.session || 'N/A'}</span>
                <span className="text-slate-400 text-[11px]">{mostActiveSession?.trades || 0} trade{mostActiveSession?.trades === 1 ? '' : 's'}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/60">
              <span className="text-slate-500 block text-[10px] uppercase">
                {sessionMetrics.length <= 1 ? 'SESSION NET RESULT' : 'MOST PROFITABLE SESSION'}
              </span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-bold text-slate-300 text-sm">{mostProfitableSession?.session || 'N/A'}</span>
                <span className={`text-[11px] font-bold ${mostProfitableSession && mostProfitableSession.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {mostProfitableSession ? formatCurrency(mostProfitableSession.totalProfitLoss, currency, { showSign: true }) : '$0'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Best Trade, Worst Trade & Maximum Drawdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Best Trade Card */}
        <div className="bg-slate-900/70 border border-emerald-500/30 rounded-xl p-4 shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono-code mb-2">
              <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                <ArrowUpRight className="w-4 h-4" /> BEST TRADE
              </span>
              <span className="text-slate-400">{bestTrade?.id || '—'}</span>
            </div>
            {bestTrade ? (
              <div className="space-y-1.5 mt-2 text-xs font-mono-code">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pair & Direction:</span>
                  <span className="text-slate-200 font-bold">{bestTrade.instrument} ({bestTrade.direction})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time:</span>
                  <span className="text-slate-300">{bestTrade.date} • {formatTo12Hour(bestTrade.time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">R-Multiple:</span>
                  <span className="text-amber-400 font-bold">+{bestTrade.rMultiple || 0}R</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Net Profit:</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {formatCurrency(bestTrade.profitLoss, currency, { showSign: true })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono-code py-4 text-center">No trades logged</div>
            )}
          </div>
        </div>

        {/* Worst Trade Card */}
        <div className={`bg-slate-900/70 border ${worstTrade && worstTrade.profitLoss < 0 ? 'border-rose-500/30' : 'border-slate-800'} rounded-xl p-4 shadow flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between text-xs font-mono-code mb-2">
              <span className={`${worstTrade && worstTrade.profitLoss < 0 ? 'text-rose-400' : 'text-slate-400'} font-bold uppercase flex items-center gap-1`}>
                <ArrowDownRight className="w-4 h-4" /> WORST TRADE
              </span>
              <span className="text-slate-400">{worstTrade?.id || '—'}</span>
            </div>
            {worstTrade ? (
              <div className="space-y-1.5 mt-2 text-xs font-mono-code">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pair & Direction:</span>
                  <span className="text-slate-200 font-bold">{worstTrade.instrument} ({worstTrade.direction})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time:</span>
                  <span className="text-slate-300">{worstTrade.date} • {formatTo12Hour(worstTrade.time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">R-Multiple:</span>
                  <span className={`font-bold ${worstTrade.profitLoss < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {worstTrade.rMultiple ? (worstTrade.rMultiple > 0 ? `+${worstTrade.rMultiple}R` : `${worstTrade.rMultiple}R`) : '0R'}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">
                    {worstTrade.profitLoss < 0 ? 'Net Loss:' : 'Lowest Net Result:'}
                  </span>
                  <span className={`font-bold text-sm ${worstTrade.profitLoss < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(worstTrade.profitLoss, currency, { showSign: true })}
                  </span>
                </div>
              </div>
            ) : closedTrades.length === 1 ? (
              <div className="py-4 text-center font-mono-code space-y-1.5">
                <span className="text-amber-400 font-bold text-xs block">
                  NO COMPARISON AVAILABLE
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Only 1 real trade recorded. Minimum 2 closed trades are required to compare highest vs lowest performance without inventing imaginary data.
                </p>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-mono-code py-4 text-center">NO TRADE DATA</div>
            )}
          </div>
        </div>

        {/* Maximum Drawdown Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-mono-code mb-2">
              <span className="text-amber-400 font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> MAX DRAWDOWN
              </span>
              <span className="text-slate-400">REAL METRIC</span>
            </div>
            <div className="space-y-1.5 mt-2 text-xs font-mono-code">
              <div className="flex justify-between">
                <span className="text-slate-400">Max Dollar Drop:</span>
                <span className="text-rose-400 font-bold">
                  {formatCurrency(maxDrawdownDollars, currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Percent Drop:</span>
                <span className="text-amber-400 font-bold">{maxDrawdownPct.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Account Safety:</span>
                <span className={`font-bold ${maxDrawdownPct < 5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {maxDrawdownPct < 5 ? 'GUARDRAIL INTACT' : 'ELEVATED RISK'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-800">
                <span className="text-slate-400">Total Net P&L:</span>
                <span className={`font-bold text-sm ${totalNetProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(totalNetProfitLoss, currency, { showSign: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tab Matrix Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'ANALYTICS SUMMARY', icon: BarChart3 },
          { id: 'EVALUATION', label: 'EVALUATION ENGINE & BENCHMARK', icon: ShieldCheck },
          { id: 'STRATEGY', label: 'SBT STRATEGY MATRIX', icon: Zap },
          { id: 'SESSIONS', label: 'TRADING SESSIONS', icon: Clock },
          { id: 'PAIRS', label: 'INSTRUMENTS & PAIRS', icon: Target },
          { id: 'TIMEFRAMES', label: 'TIMEFRAMES', icon: Layers },
          { id: 'GRADES', label: 'EXECUTION GRADES', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-military font-bold tracking-wider transition ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* View: Evaluation Engine (Master Prompt Section 6 & 15) */}
      {activeSubTab === 'EVALUATION' && (
        <EvaluationEngine trades={trades} account={account} onNavigateToTab={onNavigateToTab} />
      )}

      {/* View 0: Analytics Summary Table */}
      {activeSubTab === 'OVERVIEW' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono-code text-slate-400">
            <span className="text-slate-100 font-bold font-military tracking-wider text-sm">
              REAL PERFORMANCE AUDIT LEDGER
            </span>
            <span>DATA FILTERED TO ACTIVE ACCOUNT ONLY</span>
          </div>
          <div className="p-4 space-y-4 text-xs font-mono-code">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">EXECUTION WIN %</span>
                <span className="text-emerald-400 font-bold text-base">{winRate}%</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">{winningTrades.length} Wins of {totalTrades}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">EXECUTION LOSS %</span>
                <span className="text-rose-400 font-bold text-base">{lossRate}%</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">{losingTrades.length} Losses of {totalTrades}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">EXPECTANCY (AVG R)</span>
                <span className="text-amber-400 font-bold text-base">+{avgRMultiple}R</span>
                <span className="text-slate-500 text-[10px] block mt-0.5">Total Return: +{totalR.toFixed(1)}R</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">NET REVENUE</span>
                <span className={`font-bold text-base ${totalNetProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(totalNetProfitLoss, currency, { showSign: true })}
                </span>
                <span className="text-slate-500 text-[10px] block mt-0.5">Across {totalTrades} executions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 1: Strategy / SBT Models Breakdown */}
      {activeSubTab === 'STRATEGY' && (
        <div className="space-y-4">
          {strategyMetrics.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono-code bg-slate-900/60 rounded-xl border border-slate-800">
              NO STRATEGY DATA LOGGED FOR THIS ACCOUNT
            </div>
          ) : (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono-code text-slate-400">
                <span className="text-slate-100 font-bold font-military tracking-wider text-sm">
                  RECORDED STRATEGY & SBT MODEL MATRIX
                </span>
                <span>SORTED BY PROFIT CONTRIBUTION</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-code">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-4">STRATEGY / SBT MODEL</th>
                      <th className="py-3 px-3 text-center">TRADES</th>
                      <th className="py-3 px-3 text-center">W / L</th>
                      <th className="py-3 px-3 text-center">WIN RATE</th>
                      <th className="py-3 px-3 text-center">AVG R</th>
                      <th className="py-3 px-3 text-center">PROFIT FACTOR</th>
                      <th className="py-3 px-4 text-right">TOTAL P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {strategyMetrics.map((row) => (
                      <tr key={row.strategy} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-slate-200">{row.strategy}</td>
                        <td className="py-3 px-3 text-center text-slate-300">{row.trades}</td>
                        <td className="py-3 px-3 text-center text-slate-400">
                          {row.wins}W - {row.losses}L
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold ${row.winRate >= 60 ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {row.winRate}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-amber-400">+{row.avgR}R</td>
                        <td className="py-3 px-3 text-center text-slate-300">{row.profitFactor}</td>
                        <td className={`py-3 px-4 text-right font-bold text-sm ${row.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(row.totalProfitLoss, currency, { showSign: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 2: Time & Sessions */}
      {activeSubTab === 'SESSIONS' && (
        <div className="space-y-4">
          {sessionMetrics.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono-code bg-slate-900/60 rounded-xl border border-slate-800">
              NO SESSION EXECUTIONS LOGGED FOR THIS ACCOUNT
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {sessionMetrics.map((sess) => (
                <div
                  key={sess.session}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 mb-2">
                      <span className="font-bold text-sky-400">{sess.session}</span>
                      <span className="font-bold text-slate-200">{sess.winRate}% WIN</span>
                    </div>
                    <h4 className="text-sm font-military font-bold text-slate-100">{sess.name}</h4>
                    <div className="mt-3 space-y-1 text-xs font-mono-code text-slate-400">
                      <div className="flex justify-between">
                        <span>Trades:</span>
                        <span className="text-slate-200 font-bold">{sess.trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Wins:</span>
                        <span className="text-emerald-400 font-bold">{sess.wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Return:</span>
                        <span className="text-amber-400 font-bold">+{sess.avgR}R</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono-code">
                    <span className="text-slate-400">Session P&L:</span>
                    <span className={`font-bold text-sm ${sess.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(sess.totalProfitLoss, currency, { showSign: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View 3: Currency Pairs */}
      {activeSubTab === 'PAIRS' && (
        <div className="space-y-4">
          {pairMetrics.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono-code bg-slate-900/60 rounded-xl border border-slate-800">
              NO INSTRUMENT EXECUTIONS LOGGED FOR THIS ACCOUNT
            </div>
          ) : (
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono-code text-slate-400">
                <span className="text-slate-100 font-bold font-military tracking-wider text-sm">
                  RECORDED INSTRUMENT MATRIX
                </span>
                <span>SORTED BY P&L</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-code">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-4">INSTRUMENT</th>
                      <th className="py-3 px-3 text-center">TRADES</th>
                      <th className="py-3 px-3 text-center">WINS</th>
                      <th className="py-3 px-3 text-center">WIN RATE</th>
                      <th className="py-3 px-3 text-center">AVG R</th>
                      <th className="py-3 px-4 text-right">NET PROFIT/LOSS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {pairMetrics.map((p) => (
                      <tr key={p.instrument} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-bold text-amber-400 text-sm">{p.instrument}</td>
                        <td className="py-3 px-3 text-center text-slate-300">{p.trades}</td>
                        <td className="py-3 px-3 text-center text-emerald-400 font-bold">{p.wins}</td>
                        <td className="py-3 px-3 text-center font-bold text-slate-100">{p.winRate}%</td>
                        <td className="py-3 px-3 text-center font-bold text-amber-400">+{p.avgR}R</td>
                        <td className={`py-3 px-4 text-right font-bold text-sm ${p.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatCurrency(p.totalProfitLoss, currency, { showSign: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* View 4: Timeframes */}
      {activeSubTab === 'TIMEFRAMES' && (
        <div className="space-y-4">
          {timeframeMetrics.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono-code bg-slate-900/60 rounded-xl border border-slate-800">
              NO TIMEFRAME EXECUTIONS LOGGED FOR THIS ACCOUNT
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {timeframeMetrics.map((tf) => (
                <div
                  key={tf.timeframe}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg text-center"
                >
                  <span className="text-2xl font-military font-bold text-amber-400 block mb-1">
                    {tf.timeframe}
                  </span>
                  <span className="text-xs font-mono-code text-slate-400 block">
                    {tf.trades} Trades ({tf.winRate}% Win)
                  </span>
                  <div className={`mt-3 text-sm font-mono-code font-bold ${tf.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(tf.totalProfitLoss, currency, { showSign: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View 5: Trade Grading System */}
      {activeSubTab === 'GRADES' && (
        <div className="space-y-5">
          {gradeMetrics.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono-code bg-slate-900/60 rounded-xl border border-slate-800">
              NO GRADED TRADES LOGGED FOR THIS ACCOUNT
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {gradeMetrics.map((gm) => (
                <div
                  key={gm.grade}
                  className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono-code mb-2">
                      <span
                        className={`text-xl font-military font-bold px-2 py-0.5 rounded ${
                          gm.grade === 'A+' || gm.grade === 'A'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : gm.grade === 'B'
                            ? 'bg-sky-500/20 text-sky-400'
                            : gm.grade === 'C'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {gm.grade}
                      </span>
                      <span className="text-slate-400">{gm.count} Trades</span>
                    </div>

                    <div className="space-y-1 mt-3 text-xs font-mono-code">
                      <div className="flex justify-between text-slate-400">
                        <span>Win Rate:</span>
                        <span className="text-slate-100 font-bold">{gm.winRate}%</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Profit Share:</span>
                        <span className="text-amber-400 font-bold">{gm.profitContributionPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono-code flex justify-between">
                    <span className="text-slate-400">P&L:</span>
                    <span className={`font-bold ${gm.totalProfitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(gm.totalProfitLoss, currency, { showSign: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
