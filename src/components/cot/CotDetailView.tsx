import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Download,
  Table as TableIcon,
  LineChart as LineChartIcon,
  BarChart2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Clock,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { CotMarketSummary, CotRecord, CotLookbackPeriod, CotIndexResult } from '../../types/cotTypes';
import { fetchCotMarketHistory } from '../../services/cotService';
import {
  calculateCotIndex,
  filterRecordsByLookback,
} from '../../utils/cotCalculations';
import { SmartMoneyGauge } from './SmartMoneyGauge';

interface CotDetailViewProps {
  summary: CotMarketSummary;
  onBack: () => void;
}

type PositioningFilter = 'NON_COMMERCIAL' | 'COMMERCIAL';
type ChartType = 'LINE' | 'BAR';
type ViewMode = 'CHART' | 'TABLE';

export const CotDetailView: React.FC<CotDetailViewProps> = ({ summary, onBack }) => {
  const { market } = summary;

  // View States
  const [positioningType, setPositioningType] = useState<PositioningFilter>('NON_COMMERCIAL');
  const [chartLookback, setChartLookback] = useState<CotLookbackPeriod>('3Y');
  const [meterLookback, setMeterLookback] = useState<CotLookbackPeriod>('3Y');
  const [chartType, setChartType] = useState<ChartType>('LINE');
  const [viewMode, setViewMode] = useState<ViewMode>('CHART');

  // History Data
  const [history, setHistory] = useState<CotRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Fetch full history on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingHistory(true);
    setHistoryError(null);

    fetchCotMarketHistory(market.code)
      .then((res) => {
        if (!isMounted) return;
        setHistory(res.data);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setHistoryError(err?.message || 'Failed to load historical data');
      })
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [market.code]);

  // Latest record (prefer history latest if available)
  const latestRecord: CotRecord = useMemo(() => {
    if (history.length > 0) {
      return history[history.length - 1];
    }
    return summary.latest;
  }, [history, summary.latest]);

  // Previous record for weekly change verification
  const previousRecord: CotRecord | undefined = useMemo(() => {
    if (history.length > 1) {
      return history[history.length - 2];
    }
    return summary.previous;
  }, [history, summary.previous]);

  // Calculate Smart Money Indices for lookback
  const meterHistorySubset = useMemo(() => {
    return filterRecordsByLookback(history, meterLookback);
  }, [history, meterLookback]);

  const nonCommIndexResult: CotIndexResult = useMemo(() => {
    const historicalNets = meterHistorySubset.map((r) => r.nonCommNet);
    return calculateCotIndex(latestRecord.nonCommNet, historicalNets);
  }, [meterHistorySubset, latestRecord.nonCommNet]);

  const commIndexResult: CotIndexResult = useMemo(() => {
    const historicalNets = meterHistorySubset.map((r) => r.commNet);
    return calculateCotIndex(latestRecord.commNet, historicalNets);
  }, [meterHistorySubset, latestRecord.commNet]);

  // Filter historical records for Chart display
  const chartRecords = useMemo(() => {
    const subset = filterRecordsByLookback(history, chartLookback);
    return subset.map((r) => ({
      date: r.reportDate,
      timestamp: r.timestamp,
      displayDate: r.reportDate.slice(2), // YY-MM-DD
      openInterest: r.openInterest,
      long: positioningType === 'NON_COMMERCIAL' ? r.nonCommLong : r.commLong,
      short: positioningType === 'NON_COMMERCIAL' ? r.nonCommShort : r.commShort,
      net: positioningType === 'NON_COMMERCIAL' ? r.nonCommNet : r.commNet,
    }));
  }, [history, chartLookback, positioningType]);

  // Export CSV
  const handleExportCsv = () => {
    if (history.length === 0) return;

    const headers = [
      'Report Date',
      'Market Code',
      'Market Name',
      'Open Interest',
      'Non-Commercial Long',
      'Non-Commercial Short',
      'Non-Commercial Net',
      'Δ Non-Commercial Long',
      'Δ Non-Commercial Short',
      'Δ Non-Commercial Net',
      'Commercial Long',
      'Commercial Short',
      'Commercial Net',
      'Δ Commercial Long',
      'Δ Commercial Short',
      'Δ Commercial Net',
    ];

    const rows = history.map((r) => [
      r.reportDate,
      `"${r.marketCode}"`,
      `"${r.marketName.replace(/"/g, '""')}"`,
      r.openInterest,
      r.nonCommLong,
      r.nonCommShort,
      r.nonCommNet,
      r.changeNonCommLong,
      r.changeNonCommShort,
      r.changeNonCommNet,
      r.commLong,
      r.commShort,
      r.commNet,
      r.changeCommLong,
      r.changeCommShort,
      r.changeCommNet,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `CFTC_COT_${market.code}_${market.name.replace(/\s+/g, '_')}_${latestRecord.reportDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Active positioning figures based on toggle
  const isNonComm = positioningType === 'NON_COMMERCIAL';
  const currentLong = isNonComm ? latestRecord.nonCommLong : latestRecord.commLong;
  const currentShort = isNonComm ? latestRecord.nonCommShort : latestRecord.commShort;
  const currentNet = isNonComm ? latestRecord.nonCommNet : latestRecord.commNet;

  const changeLong = isNonComm ? latestRecord.changeNonCommLong : latestRecord.changeCommLong;
  const changeShort = isNonComm ? latestRecord.changeNonCommShort : latestRecord.changeCommShort;
  const changeNet = isNonComm ? latestRecord.changeNonCommNet : latestRecord.changeCommNet;

  return (
    <div className="space-y-5">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-mono-code font-bold"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>All Markets</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {market.name}
              </h2>
              <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/35 text-[10px] font-mono-code text-cyan-300 font-bold">
                {market.category}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono-code text-slate-300">
                {market.exchange} • #{market.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono-code mt-0.5">
              Symbol Reference: <strong className="text-cyan-300">{market.symbolHint}</strong> · Report Date: {latestRecord.reportDate}
            </p>
          </div>
        </div>

        {/* Positioning Type Switcher (Non-Commercial vs Commercial) */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 self-start sm:self-auto">
          <button
            onClick={() => setPositioningType('NON_COMMERCIAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
              positioningType === 'NON_COMMERCIAL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Non-Commercial (Speculators)
          </button>
          <button
            onClick={() => setPositioningType('COMMERCIAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
              positioningType === 'COMMERCIAL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Commercial (Hedgers)
          </button>
        </div>
      </div>

      {/* Crypto CME Info Badge */}
      {market.isCmeCrypto && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-purple-400 shrink-0" />
          <span>
            <strong>CME Futures Contract:</strong> {market.notes || 'Institutional CME futures positions, not retail spot.'} Shorter historical range handled gracefully.
          </span>
        </div>
      )}

      {/* Discrepancy & Validation Banner */}
      {latestRecord.hasDiscrepancy && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-amber-300 font-mono-code block">
              Data Audit Discrepancy Verified & Resolved
            </strong>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5">
              {latestRecord.discrepancyDetails}
            </p>
          </div>
        </div>
      )}

      {/* Key Positioning Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Net Positioning */}
        <div className="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase text-slate-400 font-bold">
              {isNonComm ? 'Non-Commercial' : 'Commercial'} Net
            </span>
            <span className="text-[10px] font-mono-code text-slate-400">Contracts</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span
              className={`text-2xl font-black font-mono-code tracking-tight ${
                currentNet > 0 ? 'text-emerald-400' : currentNet < 0 ? 'text-rose-400' : 'text-slate-200'
              }`}
            >
              {currentNet > 0 ? `+${currentNet.toLocaleString()}` : currentNet.toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400 text-[10px]">Weekly Δ Net:</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                changeNet > 0 ? 'text-emerald-400' : changeNet < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {changeNet > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : changeNet < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
              {changeNet > 0 ? `+${changeNet.toLocaleString()}` : changeNet.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Long Positions */}
        <div className="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase text-slate-400 font-bold">
              Total Longs
            </span>
            <span className="text-[10px] font-mono-code text-emerald-400">Bullish</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono-code text-emerald-400 tracking-tight">
              {currentLong.toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400 text-[10px]">Weekly Positions:</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                changeLong >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {changeLong >= 0 ? `+${changeLong.toLocaleString()} Added` : `${changeLong.toLocaleString()} Removed`}
            </span>
          </div>
        </div>

        {/* Short Positions */}
        <div className="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase text-slate-400 font-bold">
              Total Shorts
            </span>
            <span className="text-[10px] font-mono-code text-rose-400">Bearish</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono-code text-rose-400 tracking-tight">
              {currentShort.toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400 text-[10px]">Weekly Positions:</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                changeShort <= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {changeShort >= 0 ? `+${changeShort.toLocaleString()} Added` : `${changeShort.toLocaleString()} Covered`}
            </span>
          </div>
        </div>

        {/* Open Interest */}
        <div className="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono-code uppercase text-slate-400 font-bold">
              Open Interest
            </span>
            <span className="text-[10px] font-mono-code text-slate-400">Total Market</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono-code text-slate-200 tracking-tight">
              {latestRecord.openInterest.toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono-code">
            <span className="text-slate-400 text-[10px]">Weekly Δ OI:</span>
            <span
              className={`font-bold ${
                latestRecord.changeOpenInterest >= 0 ? 'text-cyan-400' : 'text-slate-400'
              }`}
            >
              {latestRecord.changeOpenInterest >= 0
                ? `+${latestRecord.changeOpenInterest.toLocaleString()}`
                : latestRecord.changeOpenInterest.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Smart Money Meter (Dual Gauges) */}
      <SmartMoneyGauge
        nonCommResult={nonCommIndexResult}
        commResult={commIndexResult}
        lookback={meterLookback}
        onLookbackChange={setMeterLookback}
        marketName={market.name}
      />

      {/* Historical Chart & Table Controls Container */}
      <div className="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Historical Positioning Trends</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono-code font-bold">
                {isNonComm ? 'Non-Commercial' : 'Commercial'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Weekly historical Long, Short, and Net position curves.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* View Mode Toggle: Chart vs Table */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('CHART')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'CHART'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LineChartIcon className="w-3.5 h-3.5" />
                <span>Chart</span>
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            {/* Chart Type: Line vs Bar (only in Chart mode) */}
            {viewMode === 'CHART' && (
              <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-0.5">
                <button
                  onClick={() => setChartType('LINE')}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    chartType === 'LINE'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Line Chart View"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setChartType('BAR')}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    chartType === 'BAR'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Bar Chart View"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Range Selector */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-0.5">
              {(['1Y', '3Y', '5Y', 'MAX'] as CotLookbackPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartLookback(period)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                    chartLookback === period
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>

            {/* CSV Download Button */}
            <button
              onClick={handleExportCsv}
              disabled={history.length === 0}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-xs font-mono-code text-emerald-300 font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              title="Download entire verified COT history as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingHistory && (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs font-mono-code">Fetching verified historical CFTC time series...</span>
          </div>
        )}

        {/* Error State */}
        {historyError && !isLoadingHistory && (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-xs font-mono-code">{historyError}</span>
          </div>
        )}

        {/* CHART VIEW */}
        {!isLoadingHistory && !historyError && viewMode === 'CHART' && (
          <div className="mt-4 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'LINE' ? (
                <LineChart data={chartRecords} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => (val >= 1000 || val <= -1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b101b',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                    formatter={(value: any) => [Number(value).toLocaleString(), '']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload?.date) {
                        return `CFTC Report Date: ${payload[0].payload.date}`;
                      }
                      return label;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => <span className="text-xs font-mono-code text-slate-300">{value}</span>}
                  />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
                  <Line
                    type="monotone"
                    dataKey="long"
                    name="Long Positions"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="short"
                    name="Short Positions"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Net Position"
                    stroke="#00f0ff"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartRecords} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="displayDate" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickFormatter={(val) => (val >= 1000 || val <= -1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0b101b',
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                    formatter={(value: any) => [Number(value).toLocaleString(), '']}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <ReferenceLine y={0} stroke="#475569" />
                  <Bar dataKey="long" name="Longs" fill="#10b981" />
                  <Bar dataKey="short" name="Shorts" fill="#f43f5e" />
                  <Bar dataKey="net" name="Net" fill="#00f0ff" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* TABLE VIEW */}
        {!isLoadingHistory && !historyError && viewMode === 'TABLE' && (
          <div className="mt-4 overflow-x-auto max-h-96 rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono-code border-collapse">
              <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5 text-right">{isNonComm ? 'Non-Comm' : 'Comm'} Long</th>
                  <th className="p-2.5 text-right">{isNonComm ? 'Non-Comm' : 'Comm'} Short</th>
                  <th className="p-2.5 text-right">{isNonComm ? 'Non-Comm' : 'Comm'} Net</th>
                  <th className="p-2.5 text-right">Weekly Δ Net</th>
                  <th className="p-2.5 text-right">Open Interest</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-[#090d16]">
                {history
                  .slice()
                  .reverse()
                  .map((row) => {
                    const longVal = isNonComm ? row.nonCommLong : row.commLong;
                    const shortVal = isNonComm ? row.nonCommShort : row.commShort;
                    const netVal = isNonComm ? row.nonCommNet : row.commNet;
                    const changeNetVal = isNonComm ? row.changeNonCommNet : row.changeCommNet;

                    return (
                      <tr key={row.reportDate} className="hover:bg-slate-900/60 transition">
                        <td className="p-2.5 font-bold text-slate-200">{row.reportDate}</td>
                        <td className="p-2.5 text-right text-emerald-400">{longVal.toLocaleString()}</td>
                        <td className="p-2.5 text-right text-rose-400">{shortVal.toLocaleString()}</td>
                        <td
                          className={`p-2.5 text-right font-bold ${
                            netVal > 0 ? 'text-emerald-300' : netVal < 0 ? 'text-rose-300' : 'text-slate-300'
                          }`}
                        >
                          {netVal > 0 ? `+${netVal.toLocaleString()}` : netVal.toLocaleString()}
                        </td>
                        <td
                          className={`p-2.5 text-right ${
                            changeNetVal > 0
                              ? 'text-emerald-400'
                              : changeNetVal < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {changeNetVal > 0 ? `+${changeNetVal.toLocaleString()}` : changeNetVal.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-slate-300">{row.openInterest.toLocaleString()}</td>
                        <td className="p-2.5 text-center">
                          {row.hasDiscrepancy ? (
                            <span
                              className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold"
                              title={row.discrepancyDetails}
                            >
                              AUDITED
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[9px]">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
