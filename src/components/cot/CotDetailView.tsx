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
  Eye,
  Check,
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
  Cell,
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
export type PositionSeriesFilter = 'ALL' | 'LONG' | 'SHORT' | 'NET';

export const CotDetailView: React.FC<CotDetailViewProps> = ({ summary, onBack }) => {
  const { market } = summary;

  // View States - default to BAR for vertical-style boxes presentation
  const [positioningType, setPositioningType] = useState<PositioningFilter>('NON_COMMERCIAL');
  const [positionSeries, setPositionSeries] = useState<PositionSeriesFilter>('ALL');
  const [chartLookback, setChartLookback] = useState<CotLookbackPeriod>('3Y');
  const [meterLookback, setMeterLookback] = useState<CotLookbackPeriod>('3Y');
  const [chartType, setChartType] = useState<ChartType>('BAR');
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
      displayDate: r.reportDate.slice(2), // YY-MM-DD format as seen in reference image
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

  // Custom Institutional Tooltip matching the reference layout
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const entry = payload[0]?.payload;
    if (!entry) return null;

    const showLong = positionSeries === 'ALL' || positionSeries === 'LONG';
    const showNet = positionSeries === 'ALL' || positionSeries === 'NET';
    const showShort = positionSeries === 'ALL' || positionSeries === 'SHORT';

    return (
      <div className="bg-[#080d18]/95 backdrop-blur-md border border-slate-700/90 rounded-xl px-3.5 py-2.5 shadow-2xl font-mono text-xs min-w-[170px] pointer-events-none z-50">
        <div className="text-white font-extrabold pb-1.5 mb-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] tracking-wide">
          <span>{entry.displayDate}</span>
          <span className="text-[10px] text-slate-400 font-normal">{entry.date}</span>
        </div>
        <div className="space-y-1.5">
          {showLong && (
            <div className="flex items-center justify-between gap-3 text-[#00E396]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-sm bg-[#00E396] inline-block shadow-sm" />
                <span>: </span>
              </span>
              <span className="font-extrabold tabular-nums">
                {Number(entry.long).toLocaleString()}
              </span>
            </div>
          )}
          {showNet && (
            <div className={`flex items-center justify-between gap-3 ${entry.net >= 0 ? 'text-[#00F0FF]' : 'text-[#FF4560]'}`}>
              <span className="flex items-center gap-1.5 font-medium">
                <span className={`w-2 h-2 rounded-sm inline-block shadow-sm ${entry.net >= 0 ? 'bg-[#00F0FF]' : 'bg-[#FF4560]'}`} />
                <span>: </span>
              </span>
              <span className="font-extrabold tabular-nums">
                {entry.net > 0 ? `+${Number(entry.net).toLocaleString()}` : Number(entry.net).toLocaleString()}
              </span>
            </div>
          )}
          {showShort && (
            <div className="flex items-center justify-between gap-3 text-[#FF4560]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-sm bg-[#FF4560] inline-block shadow-sm" />
                <span>: </span>
              </span>
              <span className="font-extrabold tabular-nums">
                {Number(entry.short).toLocaleString()}
              </span>
            </div>
          )}
          {entry.openInterest ? (
            <div className="pt-1 mt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span>Open Interest:</span>
              <span className="text-slate-300 font-bold tabular-nums">{Number(entry.openInterest).toLocaleString()}</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-300 transition cursor-pointer flex items-center gap-1.5 text-xs font-mono font-bold"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>All Markets</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {market.name}
              </h2>
              <span className="px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/35 text-[10px] font-mono text-cyan-300 font-bold">
                {market.category}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                {market.exchange} • #{market.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Symbol Reference: <strong className="text-cyan-300">{market.symbolHint}</strong> · Report Date: {latestRecord.reportDate}
            </p>
          </div>
        </div>

        {/* Positioning Type Switcher (Non-Commercial vs Commercial) */}
        <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1 self-start sm:self-auto">
          <button
            onClick={() => setPositioningType('NON_COMMERCIAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              positioningType === 'NON_COMMERCIAL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Non-Commercial (Speculators)
          </button>
          <button
            onClick={() => setPositioningType('COMMERCIAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
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
            <strong className="font-bold text-amber-300 font-mono block">
              Data Audit Discrepancy Verified & Resolved
            </strong>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5">
              {latestRecord.discrepancyDetails}
            </p>
          </div>
        </div>
      )}

      {/* Key Positioning Metrics Grid - Interactive: Clicking filters chart view! */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Net Positioning Card */}
        <button
          type="button"
          onClick={() => setPositionSeries(positionSeries === 'NET' ? 'ALL' : 'NET')}
          className={`bg-[#0b101b] border rounded-2xl p-4 shadow-lg text-left transition-all cursor-pointer relative group ${
            positionSeries === 'NET'
              ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-cyan-950/20 shadow-cyan-950/50'
              : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/40'
          }`}
          title="Click to display Net Positions on chart"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#00F0FF] inline-block shadow-sm" />
              <span>{isNonComm ? 'Non-Commercial' : 'Commercial'} Net</span>
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition ${
              positionSeries === 'NET'
                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 group-hover:text-cyan-300'
            }`}>
              {positionSeries === 'NET' ? 'Active in Chart' : 'Click to View'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span
              className={`text-2xl font-black font-mono tracking-tight tabular-nums ${
                currentNet > 0 ? 'text-[#00F0FF]' : currentNet < 0 ? 'text-[#FF4560]' : 'text-slate-200'
              }`}
            >
              {currentNet > 0 ? `+${currentNet.toLocaleString()}` : currentNet.toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 text-[10px]">Weekly Δ Net:</span>
            <span
              className={`font-bold flex items-center gap-1 tabular-nums ${
                changeNet > 0 ? 'text-[#00E396]' : changeNet < 0 ? 'text-[#FF4560]' : 'text-slate-400'
              }`}
            >
              {changeNet > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : changeNet < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
              {changeNet > 0 ? `+${changeNet.toLocaleString()}` : changeNet.toLocaleString()}
            </span>
          </div>
        </button>

        {/* Long Positions Card */}
        <button
          type="button"
          onClick={() => setPositionSeries(positionSeries === 'LONG' ? 'ALL' : 'LONG')}
          className={`bg-[#0b101b] border rounded-2xl p-4 shadow-lg text-left transition-all cursor-pointer relative group ${
            positionSeries === 'LONG'
              ? 'border-[#00E396] ring-2 ring-emerald-500/30 bg-emerald-950/20 shadow-emerald-950/50'
              : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/40'
          }`}
          title="Click to display Long Positions on chart"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#00E396] inline-block shadow-sm" />
              <span>Total Longs</span>
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition ${
              positionSeries === 'LONG'
                ? 'bg-emerald-500/25 text-[#00E396] border border-emerald-500/40'
                : 'text-slate-400 group-hover:text-[#00E396]'
            }`}>
              {positionSeries === 'LONG' ? 'Active in Chart' : 'Click to View'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono text-[#00E396] tracking-tight tabular-nums">
              {currentLong.toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 text-[10px]">Weekly Positions:</span>
            <span
              className={`font-bold flex items-center gap-1 tabular-nums ${
                changeLong >= 0 ? 'text-[#00E396]' : 'text-[#FF4560]'
              }`}
            >
              {changeLong >= 0 ? `+${changeLong.toLocaleString()} Added` : `${changeLong.toLocaleString()} Removed`}
            </span>
          </div>
        </button>

        {/* Short Positions Card */}
        <button
          type="button"
          onClick={() => setPositionSeries(positionSeries === 'SHORT' ? 'ALL' : 'SHORT')}
          className={`bg-[#0b101b] border rounded-2xl p-4 shadow-lg text-left transition-all cursor-pointer relative group ${
            positionSeries === 'SHORT'
              ? 'border-[#FF4560] ring-2 ring-rose-500/30 bg-rose-950/20 shadow-rose-950/50'
              : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/40'
          }`}
          title="Click to display Short Positions on chart"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-[#FF4560] inline-block shadow-sm" />
              <span>Total Shorts</span>
            </span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition ${
              positionSeries === 'SHORT'
                ? 'bg-rose-500/25 text-[#FF4560] border border-rose-500/40'
                : 'text-slate-400 group-hover:text-[#FF4560]'
            }`}>
              {positionSeries === 'SHORT' ? 'Active in Chart' : 'Click to View'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono text-[#FF4560] tracking-tight tabular-nums">
              {currentShort.toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 text-[10px]">Weekly Positions:</span>
            <span
              className={`font-bold flex items-center gap-1 tabular-nums ${
                changeShort <= 0 ? 'text-[#00E396]' : 'text-[#FF4560]'
              }`}
            >
              {changeShort >= 0 ? `+${changeShort.toLocaleString()} Added` : `${changeShort.toLocaleString()} Covered`}
            </span>
          </div>
        </button>

        {/* Open Interest */}
        <div className="bg-[#0b101b] border border-slate-800/90 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">
              Open Interest
            </span>
            <span className="text-[10px] font-mono text-slate-400">Total Market</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black font-mono text-slate-200 tracking-tight tabular-nums">
              {latestRecord.openInterest.toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 text-[10px]">Weekly Δ OI:</span>
            <span
              className={`font-bold tabular-nums ${
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
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                {isNonComm ? 'Non-Commercial' : 'Commercial'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Interactive vertical-style boxes: click Long, Short, or Net to isolate positions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Interactive Series Filter Buttons (All, Long, Short, Net) */}
            <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setPositionSeries('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                  positionSeries === 'ALL'
                    ? 'bg-slate-800 text-white shadow border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Display Long, Short, and Net together"
              >
                <span>All</span>
              </button>
              <button
                type="button"
                onClick={() => setPositionSeries(positionSeries === 'LONG' ? 'ALL' : 'LONG')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  positionSeries === 'LONG'
                    ? 'bg-emerald-500/20 text-[#00E396] border border-emerald-500/50 shadow'
                    : 'text-slate-400 hover:text-[#00E396]'
                }`}
                title="Click to isolate Long positions"
              >
                <span className="w-2 h-2 rounded-sm bg-[#00E396] inline-block" />
                <span>Long</span>
              </button>
              <button
                type="button"
                onClick={() => setPositionSeries(positionSeries === 'SHORT' ? 'ALL' : 'SHORT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  positionSeries === 'SHORT'
                    ? 'bg-rose-500/20 text-[#FF4560] border border-rose-500/50 shadow'
                    : 'text-slate-400 hover:text-[#FF4560]'
                }`}
                title="Click to isolate Short positions"
              >
                <span className="w-2 h-2 rounded-sm bg-[#FF4560] inline-block" />
                <span>Short</span>
              </button>
              <button
                type="button"
                onClick={() => setPositionSeries(positionSeries === 'NET' ? 'ALL' : 'NET')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  positionSeries === 'NET'
                    ? 'bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/50 shadow'
                    : 'text-slate-400 hover:text-[#00F0FF]'
                }`}
                title="Click to isolate Net positions"
              >
                <span className="w-2 h-2 rounded-sm bg-[#00F0FF] inline-block" />
                <span>Net</span>
              </button>
            </div>

            {/* View Mode Toggle: Chart vs Table */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('CHART')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'CHART'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Boxes</span>
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            {/* Chart Type: Bar (vertical boxes) vs Line */}
            {viewMode === 'CHART' && (
              <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-0.5">
                <button
                  onClick={() => setChartType('BAR')}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    chartType === 'BAR'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Vertical-Style Boxes (Bar Chart View)"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setChartType('LINE')}
                  className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                    chartType === 'LINE'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Line Trend View"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Range Selector */}
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-0.5">
              {(['1Y', '3Y', '5Y', 'MAX'] as CotLookbackPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartLookback(period)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
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
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/50 text-xs font-mono text-emerald-300 font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
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
            <span className="text-xs font-mono">Fetching verified historical CFTC time series...</span>
          </div>
        )}

        {/* Error State */}
        {historyError && !isLoadingHistory && (
          <div className="h-72 flex flex-col items-center justify-center gap-2 text-rose-400">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-xs font-mono">{historyError}</span>
          </div>
        )}

        {/* CHART VIEW */}
        {!isLoadingHistory && !historyError && viewMode === 'CHART' && (
          <div className="mt-4">
            {/* High-Fidelity Interactive Header Legend (Matching Reference Image) */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-6 pb-3 pt-1">
              {/* Longs Legend Button */}
              <button
                type="button"
                onClick={() => setPositionSeries(positionSeries === 'LONG' ? 'ALL' : 'LONG')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-mono text-xs font-extrabold select-none ${
                  positionSeries === 'LONG'
                    ? 'bg-[#00E396]/20 text-[#00E396] border border-[#00E396] shadow-lg shadow-[#00E396]/20'
                    : positionSeries === 'ALL'
                    ? 'text-[#00E396] hover:bg-slate-800/80 border border-transparent'
                    : 'text-[#00E396]/40 hover:text-[#00E396] border border-transparent opacity-60 hover:opacity-100'
                }`}
                title="Click to toggle Long Positions only"
              >
                <span className="w-3 h-3 rounded-sm bg-[#00E396] shadow-sm inline-block" />
                <span>Longs</span>
                {positionSeries === 'LONG' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00E396]/30 text-[#00E396] border border-[#00E396]/40 font-mono">
                    Showing
                  </span>
                )}
              </button>

              {/* Net Legend Button */}
              <button
                type="button"
                onClick={() => setPositionSeries(positionSeries === 'NET' ? 'ALL' : 'NET')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-mono text-xs font-extrabold select-none ${
                  positionSeries === 'NET'
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF] shadow-lg shadow-[#00F0FF]/20'
                    : positionSeries === 'ALL'
                    ? 'text-[#00F0FF] hover:bg-slate-800/80 border border-transparent'
                    : 'text-[#00F0FF]/40 hover:text-[#00F0FF] border border-transparent opacity-60 hover:opacity-100'
                }`}
                title="Click to toggle Net Positions only"
              >
                <span className="w-3 h-3 rounded-sm bg-[#00F0FF] shadow-sm inline-block" />
                <span>Net</span>
                {positionSeries === 'NET' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00F0FF]/30 text-[#00F0FF] border border-[#00F0FF]/40 font-mono">
                    Showing
                  </span>
                )}
              </button>

              {/* Shorts Legend Button */}
              <button
                type="button"
                onClick={() => setPositionSeries(positionSeries === 'SHORT' ? 'ALL' : 'SHORT')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-mono text-xs font-extrabold select-none ${
                  positionSeries === 'SHORT'
                    ? 'bg-[#FF4560]/20 text-[#FF4560] border border-[#FF4560] shadow-lg shadow-[#FF4560]/20'
                    : positionSeries === 'ALL'
                    ? 'text-[#FF4560] hover:bg-slate-800/80 border border-transparent'
                    : 'text-[#FF4560]/40 hover:text-[#FF4560] border border-transparent opacity-60 hover:opacity-100'
                }`}
                title="Click to toggle Short Positions only"
              >
                <span className="w-3 h-3 rounded-sm bg-[#FF4560] shadow-sm inline-block" />
                <span>Shorts</span>
                {positionSeries === 'SHORT' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#FF4560]/30 text-[#FF4560] border border-[#FF4560]/40 font-mono">
                    Showing
                  </span>
                )}
              </button>

              {/* Reset to All link if filtered */}
              {positionSeries !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setPositionSeries('ALL')}
                  className="text-[11px] font-mono text-slate-400 hover:text-white underline underline-offset-2 transition cursor-pointer ml-1"
                >
                  Show All 3
                </button>
              )}
            </div>

            {/* Chart Container */}
            <div className="h-88 sm:h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'LINE' ? (
                  <LineChart data={chartRecords} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
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
                      content={<CustomChartTooltip />}
                      cursor={{ stroke: 'rgba(255, 255, 255, 0.2)', strokeWidth: 1 }}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />

                    {(positionSeries === 'ALL' || positionSeries === 'LONG') && (
                      <Line
                        type="monotone"
                        dataKey="long"
                        name="Longs"
                        stroke="#00E396"
                        strokeWidth={2.2}
                        dot={false}
                        activeDot={{ r: 5, fill: '#00E396', stroke: '#080d18', strokeWidth: 2 }}
                      />
                    )}
                    {(positionSeries === 'ALL' || positionSeries === 'SHORT') && (
                      <Line
                        type="monotone"
                        dataKey="short"
                        name="Shorts"
                        stroke="#FF4560"
                        strokeWidth={2.2}
                        dot={false}
                        activeDot={{ r: 5, fill: '#FF4560', stroke: '#080d18', strokeWidth: 2 }}
                      />
                    )}
                    {(positionSeries === 'ALL' || positionSeries === 'NET') && (
                      <Line
                        type="monotone"
                        dataKey="net"
                        name="Net"
                        stroke="#00F0FF"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: '#00F0FF', stroke: '#080d18', strokeWidth: 2 }}
                      />
                    )}
                  </LineChart>
                ) : (
                  <BarChart
                    data={chartRecords}
                    margin={{ top: 10, right: 15, left: 10, bottom: 0 }}
                    barGap={positionSeries === 'ALL' ? 1 : 0}
                    barCategoryGap="16%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
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
                    {/* Tooltip with vertical box cursor highlight (exact look from reference) */}
                    <Tooltip
                      content={<CustomChartTooltip />}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.08)' }}
                    />
                    <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />

                    {/* Long Positions Vertical Boxes */}
                    {(positionSeries === 'ALL' || positionSeries === 'LONG') && (
                      <Bar
                        dataKey="long"
                        name="Longs"
                        fill="#00E396"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={positionSeries === 'LONG' ? 24 : 12}
                      />
                    )}

                    {/* Net Positions Vertical Boxes */}
                    {(positionSeries === 'ALL' || positionSeries === 'NET') && (
                      <Bar
                        dataKey="net"
                        name="Net"
                        fill="#00F0FF"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={positionSeries === 'NET' ? 24 : 12}
                      >
                        {chartRecords.map((entry, index) => (
                          <Cell
                            key={`net-cell-${index}`}
                            fill={entry.net >= 0 ? '#00F0FF' : '#FF4560'}
                          />
                        ))}
                      </Bar>
                    )}

                    {/* Short Positions Vertical Boxes */}
                    {(positionSeries === 'ALL' || positionSeries === 'SHORT') && (
                      <Bar
                        dataKey="short"
                        name="Shorts"
                        fill="#FF4560"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={positionSeries === 'SHORT' ? 24 : 12}
                      />
                    )}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TABLE VIEW */}
        {!isLoadingHistory && !historyError && viewMode === 'TABLE' && (
          <div className="mt-4 overflow-x-auto max-h-96 rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th
                    onClick={() => setPositionSeries('LONG')}
                    className={`p-2.5 text-right cursor-pointer hover:text-[#00E396] ${
                      positionSeries === 'LONG' ? 'bg-[#00E396]/10 text-[#00E396] font-bold' : ''
                    }`}
                    title="Filter to Longs"
                  >
                    {isNonComm ? 'Non-Comm' : 'Comm'} Long
                  </th>
                  <th
                    onClick={() => setPositionSeries('SHORT')}
                    className={`p-2.5 text-right cursor-pointer hover:text-[#FF4560] ${
                      positionSeries === 'SHORT' ? 'bg-[#FF4560]/10 text-[#FF4560] font-bold' : ''
                    }`}
                    title="Filter to Shorts"
                  >
                    {isNonComm ? 'Non-Comm' : 'Comm'} Short
                  </th>
                  <th
                    onClick={() => setPositionSeries('NET')}
                    className={`p-2.5 text-right cursor-pointer hover:text-[#00F0FF] ${
                      positionSeries === 'NET' ? 'bg-[#00F0FF]/10 text-[#00F0FF] font-bold' : ''
                    }`}
                    title="Filter to Net"
                  >
                    {isNonComm ? 'Non-Comm' : 'Comm'} Net
                  </th>
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
                        <td className="p-2.5 font-bold text-slate-200 tabular-nums">{row.reportDate}</td>
                        <td className={`p-2.5 text-right text-[#00E396] tabular-nums ${positionSeries === 'LONG' ? 'bg-[#00E396]/10 font-bold' : ''}`}>
                          {longVal.toLocaleString()}
                        </td>
                        <td className={`p-2.5 text-right text-[#FF4560] tabular-nums ${positionSeries === 'SHORT' ? 'bg-[#FF4560]/10 font-bold' : ''}`}>
                          {shortVal.toLocaleString()}
                        </td>
                        <td
                          className={`p-2.5 text-right font-bold tabular-nums ${
                            positionSeries === 'NET' ? 'bg-[#00F0FF]/10 ' : ''
                          }${
                            netVal > 0 ? 'text-[#00F0FF]' : netVal < 0 ? 'text-[#FF4560]' : 'text-slate-300'
                          }`}
                        >
                          {netVal > 0 ? `+${netVal.toLocaleString()}` : netVal.toLocaleString()}
                        </td>
                        <td
                          className={`p-2.5 text-right tabular-nums ${
                            changeNetVal > 0
                              ? 'text-[#00E396]'
                              : changeNetVal < 0
                              ? 'text-[#FF4560]'
                              : 'text-slate-400'
                          }`}
                        >
                          {changeNetVal > 0 ? `+${changeNetVal.toLocaleString()}` : changeNetVal.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-slate-300 tabular-nums">{row.openInterest.toLocaleString()}</td>
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
