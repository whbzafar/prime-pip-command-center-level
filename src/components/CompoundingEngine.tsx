import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Calculator,
  ShieldAlert,
  AlertTriangle,
  Info,
  Calendar,
  Percent,
  DollarSign,
  ArrowRight,
  Sparkles,
  BarChart2,
  RefreshCw,
  Layers,
  Award,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { AccountSettings, Trade } from '../types';
import {
  CompoundingMode,
  CompoundingInputs,
  DEFAULT_TRADING_DAYS_PER_MONTH,
  calculateCompoundingProjection,
  calculateLossRecoveryMetrics,
} from '../utils/compoundingEngine';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyFormatter';

interface CompoundingEngineProps {
  account: AccountSettings;
  trades: Trade[];
}

export const CompoundingEngine: React.FC<CompoundingEngineProps> = ({
  account,
  trades,
}) => {
  const [engineTab, setEngineTab] = useState<'COMPOUNDING' | 'RECOVERY_SIMULATOR' | 'REAL_VS_PROJECTED'>('COMPOUNDING');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Currency Selection (Requirement 2)
  const [currency, setCurrency] = useState<string>(account.currency || 'USD');

  // Compounding Inputs State
  const activeBalance = account.currentBalance > 0 ? account.currentBalance : account.initialBalance;
  const [balanceMode, setBalanceMode] = useState<'ACTIVE' | 'CUSTOM'>('ACTIVE');
  const [customStartBalance, setCustomStartBalance] = useState<number>(activeBalance);

  const [compoundingMode, setCompoundingMode] = useState<CompoundingMode>('PERCENTAGE_COMPOUNDING');
  const [riskPercent, setRiskPercent] = useState<number>(account.maxRiskPerTradePercent || 1.0);
  const [fixedRiskAmount, setFixedRiskAmount] = useState<number>(Math.round(activeBalance * 0.01));
  const [expectedWinRate, setExpectedWinRate] = useState<number>(55);
  const [riskRewardRatio, setRiskRewardRatio] = useState<number>(2.0);
  const [tradesPerDay, setTradesPerDay] = useState<number>(1);
  const [tradingDaysPerMonth, setTradingDaysPerMonth] = useState<number>(DEFAULT_TRADING_DAYS_PER_MONTH);
  const [selectedPeriodMonths, setSelectedPeriodMonths] = useState<number>(1); // Default to 1 Month (21 trading days)
  const [customDays, setCustomDays] = useState<number>(21);
  const [scheduleViewMode, setScheduleViewMode] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [tablePage, setTablePage] = useState<number>(1);
  const rowsPerPage = 10;

  // Loss Recovery Simulator State
  const [recoveryDrawdownPct, setRecoveryDrawdownPct] = useState<number>(10);
  const [recoveryRiskPct, setRecoveryRiskPct] = useState<number>(1.0);

  const effectiveStartBalance = balanceMode === 'ACTIVE' ? activeBalance : customStartBalance;

  // Calculate Compounding Projection
  const projection = useMemo(() => {
    let calcMonths = selectedPeriodMonths;
    let overrideDays = selectedPeriodMonths === 0 ? customDays : undefined;
    if (selectedPeriodMonths === -1) {
      // 1 Week = 5 trading days
      calcMonths = 0;
      overrideDays = 5;
    }
    const inputs: CompoundingInputs = {
      startingBalance: effectiveStartBalance,
      compoundingMode,
      riskPercent,
      fixedRiskAmount,
      expectedWinRate,
      riskRewardRatio,
      tradesPerDay,
      tradingDaysPerMonth: tradingDaysPerMonth || 21,
      calculationMonths: calcMonths,
      customDays: overrideDays,
    };
    return calculateCompoundingProjection(inputs);
  }, [
    effectiveStartBalance,
    compoundingMode,
    riskPercent,
    fixedRiskAmount,
    expectedWinRate,
    riskRewardRatio,
    tradesPerDay,
    tradingDaysPerMonth,
    selectedPeriodMonths,
    customDays,
  ]);

  // Calculate Loss Recovery Metrics
  const recoveryMetrics = useMemo(() => {
    return calculateLossRecoveryMetrics(
      effectiveStartBalance,
      recoveryDrawdownPct,
      recoveryRiskPct,
      expectedWinRate,
      riskRewardRatio
    );
  }, [effectiveStartBalance, recoveryDrawdownPct, recoveryRiskPct, expectedWinRate, riskRewardRatio]);

  // Real Trading Performance Metrics for Real vs Projection comparison
  const closedTrades = useMemo(() => trades.filter((t) => t.status !== 'OPEN'), [trades]);
  const realWins = closedTrades.filter((t) => t.profitLoss > 0).length;
  const realWinRate = closedTrades.length > 0 ? (realWins / closedTrades.length) * 100 : 0;
  const realTotalPnl = closedTrades.reduce((acc, t) => acc + (t.profitLoss || 0), 0);
  const realReturnPct = account.initialBalance > 0 ? (realTotalPnl / account.initialBalance) * 100 : 0;

  // Table Pagination supporting Daily, Weekly, and Monthly views
  const currentTableList = useMemo(() => {
    if (scheduleViewMode === 'WEEKLY') return projection.weeklyRows || [];
    if (scheduleViewMode === 'MONTHLY') return projection.monthlyRows || [];
    return projection.rows || [];
  }, [scheduleViewMode, projection]);

  const totalPages = Math.max(1, Math.ceil(currentTableList.length / rowsPerPage));
  const displayedDailyRows = (projection.rows || []).slice((tablePage - 1) * rowsPerPage, tablePage * rowsPerPage);
  const displayedWeeklyRows = (projection.weeklyRows || []).slice((tablePage - 1) * rowsPerPage, tablePage * rowsPerPage);
  const displayedMonthlyRows = (projection.monthlyRows || []).slice((tablePage - 1) * rowsPerPage, tablePage * rowsPerPage);

  // SVG Chart Calculation
  const chartPoints = useMemo(() => {
    if (projection.rows.length === 0) return { projectedPath: '', drawdownPath: '', minBal: 0, maxBal: 100 };
    const balances = projection.rows.map((r) => r.endBalance);
    const dips = projection.rows.map((r) => r.projectedDrawdownBalance);
    const minBal = Math.min(effectiveStartBalance * 0.9, ...dips);
    const maxBal = Math.max(effectiveStartBalance * 1.1, ...balances);
    const range = maxBal - minBal || 1;

    const width = 600;
    const height = 180;
    const padding = 20;

    const projPoints = projection.rows.map((r, i) => {
      const x = padding + (i / (projection.rows.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((r.endBalance - minBal) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const ddPoints = projection.rows.map((r, i) => {
      const x = padding + (i / (projection.rows.length - 1 || 1)) * (width - padding * 2);
      const y = height - padding - ((r.projectedDrawdownBalance - minBal) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return {
      projectedPath: `M ${projPoints.join(' L ')}`,
      drawdownPath: `M ${ddPoints.join(' L ')}`,
      minBal,
      maxBal,
    };
  }, [projection.rows, effectiveStartBalance]);

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 sm:p-6 overflow-y-auto space-y-6' : 'space-y-6'}>
      {/* Sub-Header / Navigation */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-cyan-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-military font-bold text-slate-100 tracking-wider">
              CAPITAL COMPOUNDING & RECOVERY ENGINE
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Mathematical modeling for account growth and capital defense. 100% offline & strictly segregated from real trading data.
            </p>
          </div>
        </div>

        {/* Tab Switcher & Fullscreen Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono-code">
            <button
              id="tab-compounding-sim"
              type="button"
              onClick={() => setEngineTab('COMPOUNDING')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${
                engineTab === 'COMPOUNDING'
                  ? 'bg-blue-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SIMULATOR ENGINE
            </button>
            <button
              id="tab-recovery-simulator"
              type="button"
              onClick={() => setEngineTab('RECOVERY_SIMULATOR')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${
                engineTab === 'RECOVERY_SIMULATOR'
                  ? 'bg-blue-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LOSS RECOVERY
            </button>
            <button
              id="tab-real-vs-projected"
              type="button"
              onClick={() => setEngineTab('REAL_VS_PROJECTED')}
              className={`px-3 py-1.5 rounded transition cursor-pointer ${
                engineTab === 'REAL_VS_PROJECTED'
                  ? 'bg-blue-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              REAL DATA COMPARISON
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 text-xs font-mono-code hover:bg-slate-800 transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen View'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">RESTORE</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">FULLSCREEN</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mandatory Projection Notice */}
      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono-code text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-cyan-400 font-bold">PROJECTION ONLY • NOT GUARANTEED</strong>: All models are theoretical mathematical simulations. Markets carry risk. Never risk capital you cannot afford to lose.
          </span>
        </div>
        <span className="text-[10px] text-slate-500 uppercase">OFFLINE MATHEMATICAL MODEL</span>
      </div>

      {/* VIEW 1: COMPOUNDING SIMULATOR ENGINE */}
      {engineTab === 'COMPOUNDING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-xs font-military font-bold text-slate-200 tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-cyan-400" />
                SIMULATION PARAMETERS
              </h4>
              <span className="text-[10px] font-mono-code text-slate-400">MATH ENGINE</span>
            </div>

            {/* 1. Balance Mode Selection (Item 1 & 5) */}
            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-mono-code block">Starting Capital</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono-code">
                <button
                  type="button"
                  onClick={() => setBalanceMode('ACTIVE')}
                  className={`px-2.5 py-2 rounded border text-left flex items-center gap-2 transition ${
                    balanceMode === 'ACTIVE'
                      ? 'bg-blue-500/15 border-blue-500 text-cyan-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full border ${balanceMode === 'ACTIVE' ? 'bg-cyan-400 border-amber-300' : 'border-slate-600'}`} />
                  <span className="truncate">ACTIVE ACCOUNT</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceMode('CUSTOM')}
                  className={`px-2.5 py-2 rounded border text-left flex items-center gap-2 transition ${
                    balanceMode === 'CUSTOM'
                      ? 'bg-blue-500/15 border-blue-500 text-cyan-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full border ${balanceMode === 'CUSTOM' ? 'bg-cyan-400 border-amber-300' : 'border-slate-600'}`} />
                  <span className="truncate">CUSTOM BALANCE</span>
                </button>
              </div>

              {balanceMode === 'CUSTOM' ? (
                <div className="mt-2">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono-code text-xs">
                      {getCurrencySymbol(currency).trim()}
                    </span>
                    <input
                      id="compounding-custom-balance-input"
                      type="number"
                      min="100"
                      step="500"
                      value={customStartBalance}
                      onChange={(e) => setCustomStartBalance(parseFloat(e.target.value) || 1000)}
                      className="w-full pl-8 pr-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-slate-100 font-mono-code text-xs outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-1 p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono-code text-slate-300 flex items-center justify-between">
                  <span>Active Balance:</span>
                  <strong className="text-cyan-400">{formatCurrency(activeBalance, currency)}</strong>
                </div>
              )}
            </div>

            {/* Currency Selector (Requirement 2) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 text-xs font-mono-code block">Currency Mode</label>
              <div className="flex flex-wrap gap-1 text-xs font-mono-code">
                {['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'PKR'].map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setCurrency(cur)}
                    className={`px-2 py-1 rounded border text-[11px] transition ${
                      currency === cur
                        ? 'bg-blue-500 text-slate-950 border-cyan-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {cur} ({getCurrencySymbol(cur).trim()})
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Compounding Mode Selection (Item 6) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <label className="text-slate-400 text-xs font-mono-code block">Compounding Mode</label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono-code">
                <button
                  type="button"
                  onClick={() => setCompoundingMode('PERCENTAGE_COMPOUNDING')}
                  className={`px-2.5 py-2 rounded border text-left flex items-center gap-2 transition ${
                    compoundingMode === 'PERCENTAGE_COMPOUNDING'
                      ? 'bg-blue-500/15 border-blue-500 text-cyan-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full border ${compoundingMode === 'PERCENTAGE_COMPOUNDING' ? 'bg-cyan-400 border-amber-300' : 'border-slate-600'}`} />
                  <span className="truncate">PERCENTAGE DYNAMIC</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompoundingMode('FIXED_RISK')}
                  className={`px-2.5 py-2 rounded border text-left flex items-center gap-2 transition ${
                    compoundingMode === 'FIXED_RISK'
                      ? 'bg-blue-500/15 border-blue-500 text-cyan-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full border ${compoundingMode === 'FIXED_RISK' ? 'bg-cyan-400 border-amber-300' : 'border-slate-600'}`} />
                  <span className="truncate">FIXED RISK / LOT</span>
                </button>
              </div>
            </div>

            {/* 3. Risk Inputs */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono-code">
              {compoundingMode === 'PERCENTAGE_COMPOUNDING' ? (
                <div>
                  <label className="text-slate-400 block mb-1">Risk Per Trade (%)</label>
                  <input
                    id="compounding-risk-percent-input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={riskPercent}
                    onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-400"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-slate-400 block mb-1">Fixed Risk Amount ($)</label>
                  <input
                    id="compounding-fixed-risk-input"
                    type="number"
                    step="10"
                    min="1"
                    value={fixedRiskAmount}
                    onChange={(e) => setFixedRiskAmount(parseFloat(e.target.value) || 50)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              <div>
                <label className="text-slate-400 block mb-1">Expected Win Rate (%)</label>
                <input
                  id="compounding-winrate-input"
                  type="number"
                  step="1"
                  min="20"
                  max="90"
                  value={expectedWinRate}
                  onChange={(e) => setExpectedWinRate(parseFloat(e.target.value) || 50)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* 4. Risk:Reward & Frequency */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono-code">
              <div>
                <label className="text-slate-400 block mb-1">Risk-to-Reward Ratio (R:R)</label>
                <input
                  id="compounding-rr-input"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10.0"
                  value={riskRewardRatio}
                  onChange={(e) => setRiskRewardRatio(parseFloat(e.target.value) || 1.5)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Trades Per Day</label>
                <input
                  id="compounding-trades-per-day-input"
                  type="number"
                  step="1"
                  min="1"
                  max="5"
                  value={tradesPerDay}
                  onChange={(e) => setTradesPerDay(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* 5. Period Selection (21 Trading Days / Month) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-slate-400 text-xs font-mono-code block">Calculation Period</label>
                <span className="text-[10px] font-mono-code text-cyan-400">1 Mo = 21 Trading Days</span>
              </div>
              <div className="grid grid-cols-6 gap-1 text-xs font-mono-code">
                {[
                  { label: '1W', months: -1, title: '1 Week (5 trading days)' },
                  { label: '1M', months: 1, title: '1 Month (21 trading days)' },
                  { label: '3M', months: 3, title: '3 Months (63 trading days)' },
                  { label: '6M', months: 6, title: '6 Months (126 trading days)' },
                  { label: '12M', months: 12, title: '12 Months (252 trading days)' },
                  { label: 'CUST', months: 0, title: 'Custom trading days' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSelectedPeriodMonths(item.months);
                      setTablePage(1);
                    }}
                    title={item.title}
                    className={`py-1.5 rounded border text-center transition ${
                      selectedPeriodMonths === item.months
                        ? 'bg-blue-500 text-slate-950 border-cyan-400 font-bold shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {selectedPeriodMonths === 0 ? (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 text-[10px] font-mono-code block">Custom Trading Days</label>
                    <span className="text-[10px] font-mono-code text-slate-500">5 sessions/week</span>
                  </div>
                  <input
                    id="compounding-custom-days-input"
                    type="number"
                    min="1"
                    max="500"
                    value={customDays}
                    onChange={(e) => setCustomDays(parseInt(e.target.value, 10) || 21)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 font-mono-code text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              ) : (
                <p className="text-[10px] font-mono-code text-slate-500 mt-1">
                  Excludes weekends. {selectedPeriodMonths === -1 ? '1 Week = 5 Trading Days' : `${selectedPeriodMonths} Month${selectedPeriodMonths > 1 ? 's' : ''} = ${selectedPeriodMonths * 21} Trading Days`}.
                </p>
              )}
            </div>
          </div>

          {/* Results & Chart Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Top Scorecards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono-code uppercase block">START CAPITAL</span>
                <span className="text-sm font-military font-bold text-slate-100 truncate block">
                  {formatCurrency(effectiveStartBalance, currency)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-blue-500/30">
                <span className="text-[10px] text-cyan-400 font-mono-code uppercase block">PROJECTED END</span>
                <span className="text-sm font-military font-bold text-cyan-400 truncate block">
                  {formatCurrency(projection.finalProjectedBalance, currency)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono-code uppercase block">TOTAL RETURN</span>
                <span className={`text-sm font-military font-bold truncate block ${projection.totalProjectedReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  +{projection.totalProjectedReturnPercent.toFixed(1)}%
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono-code uppercase block">AVG DAILY GAIN</span>
                <span className="text-sm font-military font-bold text-emerald-400 truncate block">
                  +{formatCurrency(projection.averageDailyGainDollars, currency)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono-code uppercase block">AVG WEEKLY GAIN</span>
                <span className="text-sm font-military font-bold text-emerald-400 truncate block">
                  +{formatCurrency(projection.averageWeeklyGainDollars, currency)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-mono-code uppercase block">AVG MONTHLY (21D)</span>
                <span className="text-sm font-military font-bold text-amber-300 truncate block">
                  +{formatCurrency(projection.averageMonthlyGainDollars, currency)}
                </span>
              </div>
            </div>

            {/* Compounding Visual Growth Chart (Item 8) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-mono-code">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Projected Trajectory
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2.5 h-0.5 bg-rose-500/80 inline-block" /> 3-Trade Drawdown Scenario
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px]">
                    Weekends Excluded
                  </span>
                  <span className="text-slate-400">{projection.totalDays} Trading Days ({projection.totalCalendarDaysSpan} Cal Days)</span>
                </div>
              </div>

              <div className="py-2">
                <svg viewBox="0 0 600 180" className="w-full h-44 overflow-visible">
                  {/* Grid Lines */}
                  <line x1="20" y1="20" x2="580" y2="20" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="20" y1="90" x2="580" y2="90" stroke="#1e293b" strokeDasharray="3 3" />
                  <line x1="20" y1="160" x2="580" y2="160" stroke="#1e293b" strokeDasharray="3 3" />

                  {/* Drawdown Area & Line */}
                  <path
                    d={chartPoints.drawdownPath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    opacity="0.6"
                  />

                  {/* Projected Growth Path */}
                  <path
                    d={chartPoints.projectedPath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500 pt-1 border-t border-slate-800/80">
                <span>Start: {formatCurrency(effectiveStartBalance, currency)}</span>
                <span>Peak Drawdown Dip: -{formatCurrency(projection.maxSimulatedDrawdownDollars, currency)}</span>
                <span>Final Projected: {formatCurrency(projection.finalProjectedBalance, currency)}</span>
              </div>
            </div>

            {/* Compounding Projection Table with Daily, Weekly, and Monthly Views */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="text-xs font-military font-bold text-slate-200 tracking-wider">
                    PROJECTION SCHEDULE ({currency})
                  </h4>
                  {/* Schedule View Mode Switcher */}
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px] font-mono-code">
                    <button
                      type="button"
                      onClick={() => { setScheduleViewMode('DAILY'); setTablePage(1); }}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        scheduleViewMode === 'DAILY'
                          ? 'bg-blue-500 text-slate-950 font-bold shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      DAILY ({projection.rows.length}D)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setScheduleViewMode('WEEKLY'); setTablePage(1); }}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        scheduleViewMode === 'WEEKLY'
                          ? 'bg-blue-500 text-slate-950 font-bold shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      WEEKLY ({projection.weeklyRows?.length || 0}W)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setScheduleViewMode('MONTHLY'); setTablePage(1); }}
                      className={`px-2 py-0.5 rounded transition cursor-pointer ${
                        scheduleViewMode === 'MONTHLY'
                          ? 'bg-blue-500 text-slate-950 font-bold shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      MONTHLY ({projection.monthlyRows?.length || 0}M)
                    </button>
                  </div>
                </div>
                <span className="text-[10px] font-mono-code text-cyan-400">
                  PAGE {tablePage} OF {totalPages || 1}
                </span>
              </div>

              <div className="overflow-x-auto">
                {scheduleViewMode === 'DAILY' && (
                  <table className="w-full text-left text-xs font-mono-code mt-2">
                    <thead>
                      <tr className="text-[10px] text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-2">TRADING DAY</th>
                        <th className="py-2 px-2">MARKET DATE (MON-FRI)</th>
                        <th className="py-2 px-2">START BALANCE</th>
                        <th className="py-2 px-2">PROFIT / LOSS</th>
                        <th className="py-2 px-2">END BALANCE</th>
                        <th className="py-2 px-2 text-right">NEXT RISK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {displayedDailyRows.map((row) => (
                        <tr key={row.day} className="hover:bg-slate-800/30">
                          <td className="py-1.5 px-2 text-slate-300 font-bold">
                            Day {row.day}
                          </td>
                          <td className="py-1.5 px-2 text-slate-400 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-400 font-bold">
                              {row.dayOfWeek}
                            </span>
                            <span>{row.dateStr}</span>
                          </td>
                          <td className="py-1.5 px-2 text-slate-300">{formatCurrency(row.startBalance, currency)}</td>
                          <td className="py-1.5 px-2 text-emerald-400 font-bold">+{formatCurrency(row.pnl, currency)}</td>
                          <td className="py-1.5 px-2 text-amber-300 font-bold">{formatCurrency(row.endBalance, currency)}</td>
                          <td className="py-1.5 px-2 text-right text-slate-400">{formatCurrency(row.nextRisk, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {scheduleViewMode === 'WEEKLY' && (
                  <table className="w-full text-left text-xs font-mono-code mt-2">
                    <thead>
                      <tr className="text-[10px] text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-2">WEEK</th>
                        <th className="py-2 px-2">MARKET SPAN (5 TRADING DAYS)</th>
                        <th className="py-2 px-2">START BALANCE</th>
                        <th className="py-2 px-2">WEEKLY P&L</th>
                        <th className="py-2 px-2">END BALANCE</th>
                        <th className="py-2 px-2 text-right">RETURN %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {displayedWeeklyRows.map((w) => (
                        <tr key={w.week} className="hover:bg-slate-800/30">
                          <td className="py-1.5 px-2 text-slate-200 font-bold">
                            Week {w.week}
                          </td>
                          <td className="py-1.5 px-2 text-slate-400">
                            {w.startDateStr} → {w.endDateStr} ({w.tradingDaysCount} sessions)
                          </td>
                          <td className="py-1.5 px-2 text-slate-300">{formatCurrency(w.startBalance, currency)}</td>
                          <td className="py-1.5 px-2 text-emerald-400 font-bold">+{formatCurrency(w.pnl, currency)}</td>
                          <td className="py-1.5 px-2 text-amber-300 font-bold">{formatCurrency(w.endBalance, currency)}</td>
                          <td className="py-1.5 px-2 text-right text-emerald-400 font-bold">+{w.growthPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {scheduleViewMode === 'MONTHLY' && (
                  <table className="w-full text-left text-xs font-mono-code mt-2">
                    <thead>
                      <tr className="text-[10px] text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-2">MONTH</th>
                        <th className="py-2 px-2">MARKET SPAN (21 TRADING DAYS)</th>
                        <th className="py-2 px-2">START BALANCE</th>
                        <th className="py-2 px-2">MONTHLY P&L</th>
                        <th className="py-2 px-2">END BALANCE</th>
                        <th className="py-2 px-2 text-right">RETURN %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {displayedMonthlyRows.map((m) => (
                        <tr key={m.month} className="hover:bg-slate-800/30">
                          <td className="py-1.5 px-2 text-slate-200 font-bold">
                            Month {m.month}
                          </td>
                          <td className="py-1.5 px-2 text-slate-400">
                            {m.startDateStr} → {m.endDateStr} ({m.tradingDaysCount} sessions)
                          </td>
                          <td className="py-1.5 px-2 text-slate-300">{formatCurrency(m.startBalance, currency)}</td>
                          <td className="py-1.5 px-2 text-emerald-400 font-bold">+{formatCurrency(m.pnl, currency)}</td>
                          <td className="py-1.5 px-2 text-amber-300 font-bold">{formatCurrency(m.endBalance, currency)}</td>
                          <td className="py-1.5 px-2 text-right text-emerald-400 font-bold">+{m.growthPercent}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Table Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-2 text-xs font-mono-code">
                  <button
                    type="button"
                    disabled={tablePage === 1}
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40"
                  >
                    PREVIOUS
                  </button>
                  <span className="text-[11px] text-slate-400">
                    Showing {(tablePage - 1) * rowsPerPage + 1} - {Math.min(currentTableList.length, tablePage * rowsPerPage)} of {currentTableList.length} items
                  </span>
                  <button
                    type="button"
                    disabled={tablePage === totalPages}
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-40"
                  >
                    NEXT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: LOSS RECOVERY SIMULATOR (Item 25) */}
      {engineTab === 'RECOVERY_SIMULATOR' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Simulator Inputs */}
            <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="pb-3 border-b border-slate-800">
                <h4 className="text-xs font-military font-bold text-slate-200 tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  DRAWDOWN ASYMMETRY CALCULATOR
                </h4>
                <span className="text-[10px] font-mono-code text-slate-500">
                  MATHEMATICAL INFORMATION ONLY
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono-code">
                <div>
                  <label className="text-slate-400 block mb-1">Current Account Balance ($)</label>
                  <input
                    id="recovery-current-balance-input"
                    type="number"
                    value={effectiveStartBalance}
                    disabled
                    className="w-full px-3 py-1.5 rounded bg-slate-950/80 border border-slate-800 text-slate-300 outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400">Current Drawdown (%)</label>
                    <span className="text-rose-400 font-bold">{recoveryDrawdownPct}%</span>
                  </div>
                  <input
                    id="recovery-drawdown-slider"
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={recoveryDrawdownPct}
                    onChange={(e) => setRecoveryDrawdownPct(parseFloat(e.target.value) || 10)}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Risk Per Trade (%)</label>
                    <input
                      id="recovery-risk-input"
                      type="number"
                      step="0.25"
                      min="0.25"
                      max="3.0"
                      value={recoveryRiskPct}
                      onChange={(e) => setRecoveryRiskPct(parseFloat(e.target.value) || 1.0)}
                      className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Target Win Rate (%)</label>
                    <input
                      id="recovery-wr-input"
                      type="number"
                      step="1"
                      min="30"
                      max="80"
                      value={expectedWinRate}
                      onChange={(e) => setExpectedWinRate(parseFloat(e.target.value) || 50)}
                      className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100 outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Recovery Outcome Badge */}
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-center space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-mono-code">Required Return to Recover</span>
                <div className="text-3xl font-military font-bold text-rose-400">
                  +{recoveryMetrics.requiredGainPercent}%
                </div>
                <p className="text-[11px] text-slate-300 font-mono-code">
                  An account suffering a <strong className="text-rose-400">{recoveryMetrics.drawdownPercent}%</strong> drawdown requires a <strong className="text-cyan-400">+{recoveryMetrics.requiredGainPercent}%</strong> gain to return to breakeven.
                </p>
                <div className="pt-2 text-[10px] text-slate-400 font-mono-code">
                  Estimated trades required at current setup specs: <strong className="text-slate-200">{recoveryMetrics.estimatedTradesToRecover} disciplined trades</strong>
                </div>
              </div>
            </div>

            {/* Asymmetry Reference Table */}
            <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-xs font-military font-bold text-slate-200 tracking-wider">
                  MATHEMATICAL DRAWDOWN ASYMMETRY TABLE
                </h4>
                <span className="text-[10px] font-mono-code text-cyan-400">CORE DEFENSE LAW</span>
              </div>

              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Notice how the required return increases non-linearly. A 10% loss requires an 11% gain, but a 50% loss requires a 100% gain. This mathematical reality proves why capital defense is paramount.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-code mt-1">
                  <thead>
                    <tr className="text-[10px] text-slate-400 border-b border-slate-800">
                      <th className="py-2 px-3">DRAWDOWN %</th>
                      <th className="py-2 px-3">REQUIRED GAIN TO BREAKEVEN</th>
                      <th className="py-2 px-3">SEVERITY</th>
                      <th className="py-2 px-3 text-right">TACTICAL ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {recoveryMetrics.asymmetryTable.map((row) => (
                      <tr
                        key={row.dd}
                        className={`hover:bg-slate-800/30 ${recoveryDrawdownPct === row.dd ? 'bg-blue-500/10' : ''}`}
                      >
                        <td className="py-2 px-3 font-bold text-slate-200">-{row.dd}%</td>
                        <td className="py-2 px-3 font-bold text-cyan-400">+{row.requiredGain}%</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.severity === 'LOW'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : row.severity === 'MEDIUM'
                                ? 'bg-blue-500/20 text-cyan-400'
                                : row.severity === 'HIGH'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {row.severity}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400 text-[11px]">
                          {row.dd <= 10
                            ? 'Standard risk defense'
                            : row.dd <= 20
                            ? 'Cut risk by 50%'
                            : row.dd <= 30
                            ? 'Mandatory pause & re-audit'
                            : 'Extreme capital jeopardy'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: REAL PERFORMANCE VS PROJECTION (Item 9) */}
      {engineTab === 'REAL_VS_PROJECTED' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* REAL DATA CARD */}
            <div className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-military font-bold text-slate-100 tracking-wider">
                    REAL TRADING PERFORMANCE
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono-code font-bold text-[10px] border border-emerald-500/30">
                  REAL DATA ONLY
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono-code">
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Total Recorded Trades:</span>
                  <strong className="text-slate-100">{closedTrades.length}</strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Actual Win Rate:</span>
                  <strong className={realWinRate >= 50 ? 'text-emerald-400' : 'text-slate-200'}>
                    {closedTrades.length > 0 ? `${realWinRate.toFixed(1)}%` : 'NO CLOSED TRADES'}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Net Realized P&L:</span>
                  <strong className={realTotalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {realTotalPnl >= 0 ? `+$${realTotalPnl.toLocaleString()}` : `-$${Math.abs(realTotalPnl).toLocaleString()}`}
                  </strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Actual Return on Initial:</span>
                  <strong className={realReturnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {realReturnPct.toFixed(2)}%
                  </strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-sans pt-2 border-t border-slate-800">
                Generated strictly from verified executed orders recorded in your database. Zero assumed inputs.
              </p>
            </div>

            {/* PROJECTED SCENARIO CARD */}
            <div className="bg-slate-950/90 border border-blue-500/40 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-military font-bold text-slate-100 tracking-wider">
                    THEORETICAL MODEL PROJECTION
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-cyan-400 font-mono-code font-bold text-[10px] border border-blue-500/30">
                  PROJECTED SCENARIO
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono-code">
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Simulation Period:</span>
                  <strong className="text-slate-100">{projection.totalDays} Days ({selectedPeriodMonths} Months)</strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Assumed Win Rate:</span>
                  <strong className="text-cyan-400">{expectedWinRate}%</strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Assumed R:R:</span>
                  <strong className="text-cyan-400">{riskRewardRatio}:1</strong>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Projected Ending Capital:</span>
                  <strong className="text-cyan-400">${Math.round(projection.finalProjectedBalance).toLocaleString()}</strong>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-sans pt-2 border-t border-slate-800">
                Based entirely on hypothetical mathematical inputs. Intended for probability awareness, never as a profit guarantee.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
