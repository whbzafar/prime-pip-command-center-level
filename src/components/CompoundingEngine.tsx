import React, { useState, useMemo, useEffect } from 'react';
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
  calculateCompoundingProjection,
} from '../utils/compoundingEngine';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyFormatter';
import { DedicatedCompoundingCalculator } from './compounding/DedicatedCompoundingCalculator';

interface CompoundingEngineProps {
  account: AccountSettings;
  trades: Trade[];
}

export const CompoundingEngine: React.FC<CompoundingEngineProps> = ({
  account,
  trades,
}) => {
  const [engineTab, setEngineTab] = useState<'COMPOUNDING' | 'REAL_VS_PROJECTED'>('COMPOUNDING');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Currency Selection (Requirement 2)
  const [currency, setCurrency] = useState<string>(account.currency || 'USD');

  // Compounding Inputs State
  const activeBalance = account.currentBalance > 0 ? account.currentBalance : account.initialBalance;
  const [balanceMode, setBalanceMode] = useState<'ACTIVE' | 'CUSTOM'>('ACTIVE');
  const [customStartBalance, setCustomStartBalance] = useState<number>(activeBalance);

  useEffect(() => {
    const isCent = account.isCentAccount || account.accountType === 'CENT_ACCOUNT' || account.currency === 'Cent' || account.currency === 'USC' || account.currency === 'CENT';
    setCurrency(isCent ? (account.currency || 'USC') : (account.currency || 'USD'));
    const currentActBal = account.currentBalance > 0 ? account.currentBalance : account.initialBalance;
    setCustomStartBalance(currentActBal);
  }, [account.id, account.currency, account.isCentAccount, account.accountType, account.currentBalance, account.initialBalance]);

  const [compoundingMode, setCompoundingMode] = useState<CompoundingMode>('PERCENTAGE_COMPOUNDING');
  const [riskPercent, setRiskPercent] = useState<number>(account.maxRiskPerTradePercent || 1.0);
  const [fixedRiskAmount, setFixedRiskAmount] = useState<number>(Math.round(activeBalance * 0.01));
  const [expectedWinRate, setExpectedWinRate] = useState<number>(55);
  const [riskRewardRatio, setRiskRewardRatio] = useState<number>(2.0);
  const [tradesPerDay, setTradesPerDay] = useState<number>(1);
  const [tradingDaysPerMonth, setTradingDaysPerMonth] = useState<number>(21); // 21 trading days/month (5 days/week)
  const [selectedPeriodMonths, setSelectedPeriodMonths] = useState<number>(1); // Default to 1 Month (21 trading days)
  const [customDays, setCustomDays] = useState<number>(21);
  const [scheduleViewMode, setScheduleViewMode] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [tablePage, setTablePage] = useState<number>(1);
  const rowsPerPage = 10;

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


  // Real Trading Performance Metrics for Real vs Projection comparison
  const closedTrades = useMemo(() => trades.filter((t) => t.status !== 'OPEN'), [trades]);
  const realWins = closedTrades.filter((t) => t.profitLoss > 0).length;
  const realWinRate = closedTrades.length > 0 ? (realWins / closedTrades.length) * 100 : 0;
  const realTotalPnl = closedTrades.reduce((acc, t) => acc + (t.profitLoss || 0), 0);
  const realReturnPct = account.initialBalance > 0 ? (realTotalPnl / account.initialBalance) * 100 : 0;
  // Real edge from the journal: average win and loss in R (1R = average loss), trades per day.
  const realEdge = useMemo(() => {
    const wins = closedTrades.filter((t) => (t.profitLoss || 0) > 0);
    const losses = closedTrades.filter((t) => (t.profitLoss || 0) < 0);
    const avgWin = wins.length ? wins.reduce((a, t) => a + t.profitLoss, 0) / wins.length : 0;
    const avgLoss = losses.length ? Math.abs(losses.reduce((a, t) => a + t.profitLoss, 0) / losses.length) : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;
    const days = new Set(closedTrades.map((t) => t.date)).size;
    const perDay = days ? closedTrades.length / days : 0;
    const bal = account.initialBalance > 0 ? account.initialBalance : activeBalance;
    const riskPct = bal > 0 && avgLoss > 0 ? (avgLoss / bal) * 100 : 0;
    const expectancyR = (realWinRate / 100) * rr - (1 - realWinRate / 100);
    return { avgWin, avgLoss, rr, perDay, riskPct, expectancyR, days, enough: closedTrades.length >= 20 };
  }, [closedTrades, realWinRate, account.initialBalance, activeBalance]);


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
              CAPITAL COMPOUNDING ENGINE
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
                {['USD', 'Cent', 'USC', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'PKR'].map((cur) => (
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
                    {cur === 'Cent' ? 'Cent (¢)' : cur === 'USC' ? 'USC (¢)' : `${cur} (${getCurrencySymbol(cur).trim()})`}
                  </button>
                ))}
              </div>

              {(currency === 'Cent' || currency === 'USC') && (
                <div className="mt-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[10px] font-mono-code text-cyan-300">
                  <strong className="text-cyan-400 uppercase">CENT ACCOUNT FORMULA:</strong> $1.00 USD = 100 Cents (¢). If you deposit $100.00, your balance is 10,000 cents. All compounding projections, lot sizes, and risk amounts operate in exact cent units (1¢ precision).
                </div>
              )}
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
            {/* KEY RESULTS — only what a professional checks */}
            {(() => {
              const end = projection.finalProjectedBalance;
              const ret = effectiveStartBalance > 0 ? ((end - effectiveStartBalance) / effectiveStartBalance) * 100 : 0;
              const mc = projection.monteCarlo;
              const expectancyR = (expectedWinRate / 100) * riskRewardRatio - (1 - expectedWinRate / 100);
              const tone = (v: number) => (v >= 0 ? 'text-emerald-300' : 'text-rose-300');
              return (
                <div className="rounded-2xl p-[1px] bg-gradient-to-br from-cyan-500/40 via-violet-500/25 to-emerald-500/30">
                  <div className="rounded-[15px] bg-[#070b14] p-4">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Expected result · {projection.totalSimulatedTrades} trades ({projection.totalWins} wins / {projection.totalSimulatedTrades - projection.totalWins} losses)</div>
                        <div className="mt-1 flex items-baseline gap-3 flex-wrap">
                          <span className="text-[13px] text-slate-400 font-mono-code">{formatCurrency(effectiveStartBalance, currency)} →</span>
                          <span className="text-[28px] font-extrabold font-mono-code text-slate-50">{formatCurrency(end, currency)}</span>
                          <span className={`text-[16px] font-bold font-mono-code ${tone(ret)}`}>{ret >= 0 ? '+' : ''}{ret.toFixed(2)}%</span>
                        </div>
                      </div>
                      <div className={`text-right text-[11px] font-mono-code ${expectancyR > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                        Edge: {expectancyR >= 0 ? '+' : ''}{expectancyR.toFixed(2)}R per trade
                        <div className="text-[10px] text-slate-500">{expectancyR > 0 ? 'positive expectancy' : 'no edge — this setup loses over time'}</div>
                      </div>
                    </div>
                    {/* GAIN BREAKDOWN — what the % means per trade, per day, per week and in total */}
                    {(() => {
                      const days = Math.max(1, projection.totalTradingDays || Math.round(projection.totalSimulatedTrades / Math.max(1, tradesPerDay)));
                      const growth = effectiveStartBalance > 0 ? end / effectiveStartBalance : 1;
                      const perDayPct = (Math.pow(Math.max(growth, 1e-9), 1 / days) - 1) * 100;
                      const perWeekPct = (Math.pow(Math.max(growth, 1e-9), Math.min(5, days) / days) - 1) * 100;
                      const winPct = riskPercent * riskRewardRatio;
                      const sign = (v: number) => (v >= 0 ? '+' : '');
                      const cells: [string, string, string, string][] = [
                        ['Each winning trade', `+${winPct.toFixed(2)}%`, 'text-emerald-300', `risk ${riskPercent}% × ${riskRewardRatio}R reward`],
                        ['Each losing trade', `−${Number(riskPercent).toFixed(2)}%`, 'text-rose-300', 'the risk you set'],
                        ['Average per day', `${sign(perDayPct)}${perDayPct.toFixed(2)}%`, tone(perDayPct), `${formatCurrency((end - effectiveStartBalance) / days, currency)} a day on average`],
                        ['Average per week', `${sign(perWeekPct)}${perWeekPct.toFixed(2)}%`, tone(perWeekPct), '5 trading days, compounded'],
                        [`Total over ${days} trading day${days > 1 ? 's' : ''}`, `${sign(ret)}${ret.toFixed(2)}%`, tone(ret), `${sign(end - effectiveStartBalance)}${formatCurrency(end - effectiveStartBalance, currency)}`],
                      ];
                      return (
                        <div className="mt-3">
                          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-1.5">How the gain builds up</div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {cells.map(([k, v, c, sub]) => (
                              <div key={k} className={`rounded-xl border px-3 py-2 ${k.startsWith('Total') ? 'border-cyan-500/40 bg-cyan-500/[0.06] col-span-2 md:col-span-1' : 'border-slate-800 bg-slate-950/70'}`}>
                                <div className="text-[9.5px] uppercase tracking-wider text-slate-500">{k}</div>
                                <div className={`text-[15px] font-bold font-mono-code ${c}`}>{v}</div>
                                <div className="text-[10px] text-slate-500 leading-snug">{sub}</div>
                              </div>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[10.5px] text-slate-500 leading-relaxed">
                            Your plan: {projection.totalSimulatedTrades} trades ({tradesPerDay} a day), {projection.totalWins} wins and {projection.totalSimulatedTrades - projection.totalWins} losses at a {expectedWinRate}% win rate. Because risk is recalculated from the new balance before every trade, the daily % compounds: {sign(perDayPct)}{perDayPct.toFixed(2)}% a day for {days} days = {sign(ret)}{ret.toFixed(2)}% in total.
                          </p>
                        </div>
                      );
                    })()}

                    <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-1.5">What can really happen (luck of the order)</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        ['Likely range (8 in 10)', `${formatCurrency(mc.p10, currency)} – ${formatCurrency(mc.p90, currency)}`, 'text-slate-100', `${((mc.p10 / Math.max(1e-9, effectiveStartBalance) - 1) * 100).toFixed(1)}% to ${((mc.p90 / Math.max(1e-9, effectiveStartBalance) - 1) * 100) >= 0 ? '+' : ''}${((mc.p90 / Math.max(1e-9, effectiveStartBalance) - 1) * 100).toFixed(1)}%`],
                        ['Chance of a loss', `${mc.probBelowStart}%`, mc.probBelowStart > 25 ? 'text-rose-300' : mc.probBelowStart > 10 ? 'text-amber-300' : 'text-emerald-300', 'ending below the start'],
                        ['Expected drawdown', `${mc.medianMaxDrawdownPct}%`, 'text-amber-300', `bad case ${mc.p90MaxDrawdownPct}%`],
                        ['Losing streak to expect', `${mc.medianLongestLosingStreak} in a row`, 'text-slate-100', `at ${riskPercent}% risk = −${(mc.medianLongestLosingStreak * riskPercent).toFixed(1)}%`],
                      ].map(([k, v, c, sub]) => (
                        <div key={k} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                          <div className="text-[9.5px] uppercase tracking-wider text-slate-500">{k}</div>
                          <div className={`text-[14px] font-bold font-mono-code ${c}`}>{v}</div>
                          <div className="text-[10px] text-slate-500">{sub}</div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2.5 text-[10.5px] text-slate-500 leading-relaxed">
                      <span className="text-slate-300 font-semibold">How the likely range is worked out:</span> win rate and reward are real averages, but the order of wins and losses is luck. We replay your same {projection.totalSimulatedTrades} trades in 2,000 random orders (and let the number of wins vary as it would in real trading). The worst 10% and best 10% of results are cut off — the remaining 8 in 10 finish between {formatCurrency(mc.p10, currency)} and {formatCurrency(mc.p90, currency)}. Plan for the low end, not the headline number, and compare the drawdown with your firm's daily and max loss limits before choosing the risk %.
                    </p>
                  </div>
                </div>
              );
            })()}

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
                  {/* Win/Loss simulation summary indicator */}
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    <strong className="text-emerald-400">{projection.totalWins} TP Hits</strong>
                    {' • '}
                    <strong className="text-rose-400">{projection.totalLosses} SL Hits</strong>
                    {' • '}
                    <span className="text-cyan-400 font-bold">{projection.simulatedWinRatePercent}% Win Rate</span>
                  </span>
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
                        <th className="py-2 px-2">OUTCOME</th>
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
                          <td className="py-1.5 px-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-military font-bold uppercase tracking-wider ${
                                row.outcome === 'TP_HIT'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : row.outcome === 'SL_HIT'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-blue-500/20 text-cyan-400 border border-blue-500/30'
                              }`}
                            >
                              {row.outcome === 'TP_HIT'
                                ? 'TP HIT'
                                : row.outcome === 'SL_HIT'
                                ? 'SL HIT'
                                : row.outcome === 'BREAK_EVEN'
                                ? 'BREAK-EVEN'
                                : `${row.winCount}W / ${row.lossCount}L`}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-slate-300">{formatCurrency(row.startBalance, currency)}</td>
                          <td className={`py-1.5 px-2 font-bold ${
                            row.pnl > 0 ? 'text-emerald-400' : row.pnl < 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}>
                            {row.pnl > 0 ? `+${formatCurrency(row.pnl, currency)}` : row.pnl < 0 ? `-${formatCurrency(Math.abs(row.pnl), currency)}` : formatCurrency(0, currency)}
                          </td>
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

      {engineTab === 'REAL_VS_PROJECTED' && (() => {
        const periodDays = projection.totalTradingDays || Math.max(1, Math.round(projection.totalSimulatedTrades / Math.max(1, tradesPerDay)));
        const real = realEdge.rr > 0 && closedTrades.length > 0 ? calculateCompoundingProjection({
          startingBalance: effectiveStartBalance, compoundingMode: 'PERCENTAGE_COMPOUNDING',
          riskPercent: Math.max(0.05, realEdge.riskPct || riskPercent), fixedRiskAmount: 0,
          expectedWinRate: realWinRate, riskRewardRatio: Math.max(0.1, realEdge.rr),
          tradesPerDay: Math.max(1, Math.round(realEdge.perDay) || 1), tradingDaysPerMonth: 21, calculationMonths: 0, customDays: periodDays,
        }) : null;
        const planR = (expectedWinRate / 100) * riskRewardRatio - (1 - expectedWinRate / 100);
        const rows: [string, string, string, boolean | null][] = [
          ['Win rate', `${expectedWinRate.toFixed(0)}%`, closedTrades.length ? `${realWinRate.toFixed(1)}%` : '—', closedTrades.length ? realWinRate >= expectedWinRate : null],
          ['Reward : risk (avg win ÷ avg loss)', `1:${riskRewardRatio.toFixed(2)}`, realEdge.rr ? `1:${realEdge.rr.toFixed(2)}` : '—', realEdge.rr ? realEdge.rr >= riskRewardRatio : null],
          ['Edge per trade', `${planR >= 0 ? '+' : ''}${planR.toFixed(2)}R`, realEdge.rr ? `${realEdge.expectancyR >= 0 ? '+' : ''}${realEdge.expectancyR.toFixed(2)}R` : '—', realEdge.rr ? realEdge.expectancyR >= planR : null],
          ['Risk per trade (avg loss)', `${riskPercent}%`, realEdge.riskPct ? `${realEdge.riskPct.toFixed(2)}%` : '—', realEdge.riskPct ? realEdge.riskPct <= riskPercent * 1.15 : null],
          ['Trades per day', `${tradesPerDay}`, realEdge.perDay ? realEdge.perDay.toFixed(1) : '—', null],
          [`Result after ${periodDays} trading days`, formatCurrency(projection.finalProjectedBalance, currency), real ? formatCurrency(real.finalProjectedBalance, currency) : '—', real ? real.finalProjectedBalance >= projection.finalProjectedBalance : null],
        ];
        const fixes: string[] = [];
        if (closedTrades.length && realWinRate < expectedWinRate - 3) fixes.push(`Win rate is ${(expectedWinRate - realWinRate).toFixed(1)} points below plan — be stricter with entries (A+ setups only, confirm on the higher timeframe).`);
        if (realEdge.rr && realEdge.rr < riskRewardRatio * 0.85) fixes.push(`Winners average 1:${realEdge.rr.toFixed(2)} instead of 1:${riskRewardRatio} — let trades reach the target; avoid closing early.`);
        if (realEdge.riskPct && realEdge.riskPct > riskPercent * 1.15) fixes.push(`Average loss is ${realEdge.riskPct.toFixed(2)}% vs the planned ${riskPercent}% — size every trade with the Lot Size Calculator and never move the stop.`);
        if (realEdge.rr && realEdge.expectancyR <= 0) fixes.push('Your real edge is negative — pause compounding, trade minimum size and review the journal until the edge is positive over 20+ trades.');
        if (!fixes.length && closedTrades.length) fixes.push('You are trading at or above the plan — keep the same risk and process.');
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-300">Plan vs your real trading</div>
              <p className="text-[11.5px] text-slate-400 mt-1">The plan uses the inputs from the Simulator tab. "Your trading" uses the closed trades in this account's journal, then projects them over the same period — so you see where you will really end up if nothing changes.</p>
              {!closedTrades.length && <div className="mt-3 text-[12px] text-amber-200">No closed trades yet — log trades in the journal to compare.</div>}
              {closedTrades.length > 0 && !realEdge.enough && <div className="mt-2 text-[11px] text-amber-200">Only {closedTrades.length} closed trades — the comparison becomes reliable after 20+.</div>}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[12px] font-mono-code">
                  <thead><tr className="text-[10px] uppercase tracking-wider text-slate-500"><th className="text-left py-1.5">Metric</th><th className="text-right py-1.5">Plan</th><th className="text-right py-1.5">Your trading</th><th className="text-right py-1.5 w-8"></th></tr></thead>
                  <tbody>
                    {rows.map(([k, plan, mine, ok]) => (
                      <tr key={k} className="border-t border-slate-800/70"><td className="py-2 text-slate-300 font-sans">{k}</td><td className="py-2 text-right text-cyan-200">{plan}</td><td className={`py-2 text-right ${ok === null ? 'text-slate-200' : ok ? 'text-emerald-300' : 'text-rose-300'}`}>{mine}</td><td className="py-2 text-right">{ok === null ? '' : ok ? '✓' : '✗'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.05] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-violet-300">What to fix first</div>
              <ul className="mt-2 space-y-1.5">{fixes.map((f) => <li key={f} className="text-[12.5px] text-slate-200 flex gap-2"><span className="text-violet-400">→</span><span>{f}</span></li>)}</ul>
              <div className="mt-2 text-[10.5px] text-slate-500">Net realised P&L so far: <span className={realTotalPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatCurrency(realTotalPnl, currency)} ({realReturnPct.toFixed(2)}%)</span> over {closedTrades.length} trades.</div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
