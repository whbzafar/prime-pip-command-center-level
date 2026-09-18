import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Percent,
  Calendar,
  Layers,
  Download,
  CheckCircle2,
  Table,
} from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../../utils/currencyFormatter';
import { DEFAULT_TRADING_DAYS_PER_MONTH } from '../../utils/compoundingEngine';

export type CompoundingFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface BreakdownRow {
  periodIndex: number;
  label: string;
  startBalance: number;
  gain: number;
  endBalance: number;
  cumulativeProfit: number;
  growthPercent: number;
}

interface DedicatedCompoundingCalculatorProps {
  initialCapital?: number;
  currency?: string;
}

export const DedicatedCompoundingCalculator: React.FC<DedicatedCompoundingCalculatorProps> = ({
  initialCapital = 10000,
  currency = 'USD',
}) => {
  // Inputs
  const [startingCapital, setStartingCapital] = useState<number>(initialCapital > 0 ? initialCapital : 10000);
  const [targetRatePercent, setTargetRatePercent] = useState<number>(2.0); // 2% per period
  const [frequency, setFrequency] = useState<CompoundingFrequency>('DAILY');
  const [selectedMonths, setSelectedMonths] = useState<number>(3); // 1, 3, 6, 12, or custom
  const [customMonths, setCustomMonths] = useState<number>(9);
  const [tradingDaysPerMonth, setTradingDaysPerMonth] = useState<number>(DEFAULT_TRADING_DAYS_PER_MONTH);

  // Table pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 12;

  // Active months count
  const effectiveMonths = selectedMonths === 0 ? Math.max(1, customMonths) : selectedMonths;

  // Mathematical Calculation
  const calculation = useMemo(() => {
    const P = Math.max(1, startingCapital);
    const r = Math.max(0, targetRatePercent) / 100;
    const daysPerMo = Math.max(1, tradingDaysPerMonth);

    let totalPeriods = 0;
    if (frequency === 'DAILY') {
      totalPeriods = effectiveMonths * daysPerMo;
    } else if (frequency === 'WEEKLY') {
      totalPeriods = effectiveMonths * 4;
    } else {
      totalPeriods = effectiveMonths;
    }

    // Cap periods for safety and UI performance
    const safePeriods = Math.min(1000, Math.max(1, totalPeriods));

    const rows: BreakdownRow[] = [];
    let currentBal = P;

    for (let i = 1; i <= safePeriods; i++) {
      const startBal = currentBal;
      const gain = startBal * r;
      const endBal = startBal + gain;
      const cumProfit = endBal - P;
      const growthPct = ((endBal - P) / P) * 100;

      let label = '';
      if (frequency === 'DAILY') {
        const monthNum = Math.ceil(i / daysPerMo);
        const dayInMonth = ((i - 1) % daysPerMo) + 1;
        label = `M${monthNum} D${dayInMonth} (#${i})`;
      } else if (frequency === 'WEEKLY') {
        const monthNum = Math.ceil(i / 4);
        const weekInMonth = ((i - 1) % 4) + 1;
        label = `M${monthNum} W${weekInMonth} (#${i})`;
      } else {
        label = `Month ${i}`;
      }

      rows.push({
        periodIndex: i,
        label,
        startBalance: startBal,
        gain,
        endBalance: endBal,
        cumulativeProfit: cumProfit,
        growthPercent: growthPct,
      });

      currentBal = endBal;
    }

    const finalBalance = currentBal;
    const totalProfit = finalBalance - P;
    const percentageGrowth = ((finalBalance - P) / P) * 100;

    return {
      rows,
      totalPeriods: safePeriods,
      finalBalance,
      totalProfit,
      percentageGrowth,
    };
  }, [startingCapital, targetRatePercent, frequency, effectiveMonths, tradingDaysPerMonth]);

  // Pagination for breakdown table
  const totalPages = Math.ceil(calculation.rows.length / rowsPerPage);
  const displayedRows = calculation.rows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Quick preset capital buttons
  const capitalPresets = [1000, 5000, 10000, 25000, 50000, 100000];

  // Quick preset rate buttons
  const ratePresets = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0];

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Period', 'Label', 'Starting Balance', 'Period Gain', 'Ending Balance', 'Cumulative Profit', 'Growth %'];
    const csvRows = [
      headers.join(','),
      ...calculation.rows.map((r) =>
        [
          r.periodIndex,
          `"${r.label}"`,
          r.startBalance.toFixed(2),
          r.gain.toFixed(2),
          r.endBalance.toFixed(2),
          r.cumulativeProfit.toFixed(2),
          r.growthPercent.toFixed(2),
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `compounding_breakdown_${effectiveMonths}M_${frequency}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Overview Card */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-cyan-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-military font-bold text-slate-100 tracking-wider flex items-center gap-2">
                <span>DEDICATED COMPOUNDING CALCULATOR</span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  REAL MATHEMATICAL FORMULA
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Exact exponential growth: B = P × (1 + r)ⁿ with rigorous trading-day cadence (1, 3, 6, 12 months)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono-code font-bold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT BREAKDOWN (CSV)</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs on Left, Real-Time Outputs on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUTS COLUMN */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-military font-bold text-slate-200 tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>CALCULATOR INPUTS</span>
              </h3>
              <span className="text-[10px] font-mono-code text-slate-400">PURE FINANCIAL MATH</span>
            </div>

            {/* 1. Starting Capital ($) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono-code text-slate-300 font-bold flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  <span>STARTING CAPITAL ({currency})</span>
                </label>
                <span className="text-xs font-mono-code text-cyan-400 font-bold">
                  {formatCurrency(startingCapital, currency)}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono-code text-xs">
                  {getCurrencySymbol(currency).trim()}
                </span>
                <input
                  id="calc-starting-capital-input"
                  type="number"
                  min="100"
                  step="500"
                  value={startingCapital}
                  onChange={(e) => setStartingCapital(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-mono-code text-xs outline-none focus:border-cyan-400"
                />
              </div>

              {/* Capital Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {capitalPresets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setStartingCapital(p)}
                    className={`px-2 py-1 rounded text-[10px] font-mono-code border transition cursor-pointer ${
                      startingCapital === p
                        ? 'bg-blue-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    ${p.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Target Rate / Risk per Period (%) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono-code text-slate-300 font-bold flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  <span>TARGET / RISK RATE PER PERIOD</span>
                </label>
                <span className="text-xs font-mono-code text-emerald-400 font-bold">
                  +{targetRatePercent.toFixed(2)}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="calc-target-rate-slider"
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.1"
                  value={targetRatePercent}
                  onChange={(e) => setTargetRatePercent(parseFloat(e.target.value) || 0.1)}
                  className="flex-1 accent-emerald-500 cursor-pointer"
                />
                <input
                  id="calc-target-rate-input"
                  type="number"
                  min="0.05"
                  max="50"
                  step="0.1"
                  value={targetRatePercent}
                  onChange={(e) => setTargetRatePercent(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono-code text-xs text-right outline-none focus:border-emerald-400"
                />
              </div>

              {/* Rate Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ratePresets.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTargetRatePercent(r)}
                    className={`px-2 py-1 rounded text-[10px] font-mono-code border transition cursor-pointer ${
                      targetRatePercent === r
                        ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Compounding Frequency */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-mono-code text-slate-300 font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                <span>COMPOUNDING FREQUENCY</span>
              </label>

              <div className="grid grid-cols-3 gap-2 font-mono-code text-xs">
                {(
                  [
                    { id: 'DAILY', label: 'Daily', sub: `${tradingDaysPerMonth}d / mo` },
                    { id: 'WEEKLY', label: 'Weekly', sub: '4w / mo' },
                    { id: 'MONTHLY', label: 'Monthly', sub: '1x / mo' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setFrequency(f.id);
                      setCurrentPage(1);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                      frequency === f.id
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold shadow'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold text-xs">{f.label}</span>
                    <span className="text-[10px] text-slate-500">{f.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Time Period (1, 3, 6, 12 Months or Custom) */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-mono-code text-slate-300 font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>TIME PERIOD (1, 3, 6, 12 MONTHS)</span>
              </label>

              <div className="grid grid-cols-5 gap-1.5 font-mono-code text-xs">
                {[
                  { label: '1 Month', months: 1 },
                  { label: '3 Months', months: 3 },
                  { label: '6 Months', months: 6 },
                  { label: '12 Months', months: 12 },
                  { label: 'Custom', months: 0 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setSelectedMonths(p.months);
                      setCurrentPage(1);
                    }}
                    className={`py-2 rounded-xl border text-center transition cursor-pointer text-xs font-bold ${
                      selectedMonths === p.months
                        ? 'bg-blue-500 text-slate-950 border-cyan-400 shadow'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {p.months === 0 ? 'Custom' : `${p.months}M`}
                  </button>
                ))}
              </div>

              {selectedMonths === 0 && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
                    <span>Custom Months Duration:</span>
                    <span className="text-cyan-400 font-bold">{customMonths} Months</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={customMonths}
                    onChange={(e) => setCustomMonths(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono-code text-xs outline-none focus:border-cyan-400"
                  />
                </div>
              )}
            </div>

            {/* 5. Trading Days per Month Setting */}
            {frequency === 'DAILY' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs font-mono-code text-slate-400">
                  <span>Trading Days per Month:</span>
                  <span className="text-teal-400 font-bold">{tradingDaysPerMonth} Days</span>
                </div>
                <div className="flex items-center gap-2">
                  {[18, 21, 22, 23].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setTradingDaysPerMonth(d)}
                      className={`flex-1 py-1 rounded text-xs font-mono-code border transition cursor-pointer ${
                        tradingDaysPerMonth === d
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {d} days {d === DEFAULT_TRADING_DAYS_PER_MONTH ? '(Standard)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* OUTPUTS COLUMN */}
        <div className="lg:col-span-7 space-y-5">
          {/* Primary 3 KPI Output Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-code">
            {/* 1. Final Capital */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/90 border border-blue-500/40 rounded-2xl p-4 shadow-xl space-y-1.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>FINAL CAPITAL</span>
                <DollarSign className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-300 tracking-tight">
                {formatCurrency(calculation.finalBalance, currency)}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span>Starting:</span>
                <span className="text-slate-300">{formatCurrency(startingCapital, currency)}</span>
              </div>
            </div>

            {/* 2. Total Projected Profit */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 shadow-xl space-y-1.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>TOTAL PROJECTED PROFIT</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-tight">
                +{formatCurrency(calculation.totalProfit, currency)}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span>Net compounding gain</span>
              </div>
            </div>

            {/* 3. Percentage Growth */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/90 border border-teal-500/40 rounded-2xl p-4 shadow-xl space-y-1.5 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>PERCENTAGE GROWTH</span>
                <Percent className="w-4 h-4 text-teal-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-teal-300 tracking-tight">
                +{calculation.percentageGrowth.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500">
                Over {effectiveMonths} mo ({calculation.totalPeriods} periods)
              </div>
            </div>
          </div>

          {/* Mathematical Formula Verification Badge */}
          <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono-code text-slate-300 flex flex-wrap items-center justify-between gap-3 shadow">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Formula:</strong> Balance = {startingCapital.toLocaleString()} × (1 + {(targetRatePercent / 100).toFixed(4)})^{calculation.totalPeriods} = <strong className="text-cyan-400">{formatCurrency(calculation.finalBalance, currency)}</strong>
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {calculation.totalPeriods} compounding cycles
            </span>
          </div>

          {/* PERIOD-BY-PERIOD BREAKDOWN TABLE */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Table className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-military font-bold text-slate-200 tracking-wider">
                  PERIOD-BY-PERIOD BREAKDOWN TABLE
                </h3>
              </div>
              <span className="text-[10px] font-mono-code text-slate-400">
                Page {currentPage} of {Math.max(1, totalPages)} ({calculation.rows.length} Total Periods)
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar rounded-xl border border-slate-800">
              <table className="w-full text-left font-mono-code text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px]">
                    <th className="py-2.5 px-3">PERIOD</th>
                    <th className="py-2.5 px-3 text-right">START BALANCE</th>
                    <th className="py-2.5 px-3 text-right">RETURN / GAIN</th>
                    <th className="py-2.5 px-3 text-right">END BALANCE</th>
                    <th className="py-2.5 px-3 text-right">CUMULATIVE PROFIT</th>
                    <th className="py-2.5 px-3 text-right">GROWTH (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {displayedRows.map((r) => (
                    <tr key={r.periodIndex} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 font-bold text-slate-300">
                        {r.label}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {formatCurrency(r.startBalance, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400">
                        +{formatCurrency(r.gain, currency)}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-amber-300">
                        {formatCurrency(r.endBalance, currency)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300">
                        +{formatCurrency(r.cumulativeProfit, currency)}
                      </td>
                      <td className="py-2 px-3 text-right text-teal-400">
                        +{r.growthPercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs font-mono-code">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
                >
                  Previous Page
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-blue-500 text-slate-950'
                            : 'bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-slate-500 px-1">...</span>}
                </div>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 cursor-pointer"
                >
                  Next Page
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
