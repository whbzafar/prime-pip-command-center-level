import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Camera,
  Brain,
  AlertTriangle,
  Award,
  ChevronRight,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Activity,
  Sliders,
  LayoutGrid,
  List,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Trade, StrategyType, TradeGrade, TradingSession } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import {
  formatTradeDateTime,
  getKarachiEpoch,
  APP_TIMEZONE_LABEL,
  APP_TIMEZONE_FULL_LABEL,
} from '../utils/time';
import { TradeDiagnosticEngine } from './TradeDiagnosticEngine';

interface TradeJournalProps {
  trades: Trade[];
  onOpenNewTrade: () => void;
  onDeleteTrade: (id: string) => void;
  onUpdateTrade?: (updatedTrade: Trade) => void;
  currency?: string;
}

export const TradeJournal: React.FC<TradeJournalProps> = ({
  trades,
  onOpenNewTrade,
  onDeleteTrade,
  onUpdateTrade,
  currency = 'USD',
}) => {
  const [viewMode, setViewMode] = useState<'VAULT' | 'DIAGNOSTICS'>('VAULT');
  const [displayLayout, setDisplayLayout] = useState<'AUTO' | 'TABLE' | 'CARDS'>('AUTO');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ALL');
  const [selectedPair, setSelectedPair] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedResult, setSelectedResult] = useState<string>('ALL');
  const [selectedSession, setSelectedSession] = useState<string>('ALL');

  // Active Trade Inspector modal
  const [inspectedTrade, setInspectedTrade] = useState<Trade | null>(null);
  const [isInspectorFullscreen, setIsInspectorFullscreen] = useState(false);
  const [diagnosingTrade, setDiagnosingTrade] = useState<Trade | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Filter logic
  const filteredTrades = trades.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.strategy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStrategy = selectedStrategy === 'ALL' || t.strategy === selectedStrategy;
    const matchesPair = selectedPair === 'ALL' || t.instrument === selectedPair;
    const matchesGrade = selectedGrade === 'ALL' || t.grade === selectedGrade;
    const matchesSession = selectedSession === 'ALL' || t.session === selectedSession;
    const matchesResult =
      selectedResult === 'ALL' ||
      (selectedResult === 'WIN' && t.profitLoss > 0) ||
      (selectedResult === 'LOSS' && t.profitLoss < 0) ||
      (selectedResult === 'BE' && t.profitLoss === 0);

    return matchesSearch && matchesStrategy && matchesPair && matchesGrade && matchesSession && matchesResult;
  }).sort((a, b) => getKarachiEpoch(b.date, b.time) - getKarachiEpoch(a.date, a.time));

  // Extract unique instruments and strategies for filter dropdowns
  const availablePairs = Array.from(new Set(trades.map((t) => t.instrument)));
  const availableStrategies = Array.from(new Set(trades.map((t) => t.strategy)));

  // Aggregate Diagnostic Metrics
  const diagnosedTrades = trades.filter((t) => !!t.tradeDiagnostic);
  const winTrades = trades.filter((t) => (t.profitLoss || 0) > 0);
  const lossTrades = trades.filter((t) => (t.profitLoss || 0) < 0);

  const edgeWins = diagnosedTrades.filter((t) => t.tradeDiagnostic?.classification === 'A_PLUS_EDGE_WIN').length;
  const earlyExitWins = diagnosedTrades.filter((t) => t.tradeDiagnostic?.classification === 'SUBOPTIMAL_EARLY_EXIT_WIN').length;
  const luckyWins = diagnosedTrades.filter((t) => t.tradeDiagnostic?.classification === 'LUCKY_BAD_WIN').length;

  const goodLosses = diagnosedTrades.filter((t) => t.tradeDiagnostic?.classification === 'GOOD_BUSINESS_LOSS').length;
  const execLosses = diagnosedTrades.filter((t) => t.tradeDiagnostic?.classification === 'EXECUTION_ERROR_LOSS').length;
  const emotionalLosses = diagnosedTrades.filter((t) => t.tradeDiagnostic?.classification === 'DISCIPLINE_BREACH_LOSS').length;

  const avgProcessQuality = diagnosedTrades.length > 0
    ? Math.round(diagnosedTrades.reduce((acc, t) => acc + (t.tradeDiagnostic?.adherenceScore || 0), 0) / diagnosedTrades.length)
    : 100;

  const handleDiagnosticSaved = (updatedTrade: Trade) => {
    onUpdateTrade?.(updatedTrade);
    if (inspectedTrade && inspectedTrade.id === updatedTrade.id) {
      setInspectedTrade(updatedTrade);
    }
    setDiagnosingTrade(null);
  };

  return (
    <div className="space-y-5">
      {/* View Mode Switcher & Diagnostic KPI Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('VAULT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer flex items-center gap-2 ${
              viewMode === 'VAULT'
                ? 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/10'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>TRADE VAULT ({filteredTrades.length})</span>
          </button>

          <button
            onClick={() => setViewMode('DIAGNOSTICS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-military font-bold tracking-wider transition cursor-pointer flex items-center gap-2 ${
              viewMode === 'DIAGNOSTICS'
                ? 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/10'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>WIN/LOSS DIAGNOSTIC INTELLIGENCE</span>
          </button>
        </div>

        {/* Quick Diagnostic Stats */}
        <div className="flex items-center gap-2 text-xs font-mono-code">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            A+ Edge Wins: {edgeWins}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Good Losses: {goodLosses}
          </span>
          {luckyWins + emotionalLosses > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Process Breaches: {luckyWins + emotionalLosses}
            </span>
          )}
        </div>
      </div>

      {/* Top Filter Bar */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, pair, setup..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-200 placeholder:text-slate-500 outline-none focus:border-cyan-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Layout Mode Selector (Cards vs Table) */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setDisplayLayout('AUTO')}
              className={`px-2.5 py-1 rounded text-[11px] font-military font-bold transition ${
                displayLayout === 'AUTO' ? 'bg-blue-500/20 text-amber-300 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Responsive: Cards on Mobile, Table on Desktop"
            >
              AUTO
            </button>
            <button
              type="button"
              onClick={() => setDisplayLayout('CARDS')}
              className={`p-1.5 rounded transition ${
                displayLayout === 'CARDS' ? 'bg-blue-500/20 text-amber-300 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Force Touch-First Card Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDisplayLayout('TABLE')}
              className={`p-1.5 rounded transition ${
                displayLayout === 'TABLE' ? 'bg-blue-500/20 text-amber-300 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Force Full Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-military font-bold text-cyan-400"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>FILTERS</span>
            {(selectedPair !== 'ALL' || selectedStrategy !== 'ALL' || selectedGrade !== 'ALL' || selectedResult !== 'ALL') && (
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
            )}
          </button>

          <button
            id="journal-new-trade-btn"
            onClick={onOpenNewTrade}
            className="prime-btn-primary flex items-center gap-1.5 px-3.5 py-1.5 text-xs tracking-wider cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">RECORD TRADE</span>
            <span className="sm:hidden">RECORD</span>
          </button>
        </div>

        {/* Filter Dropdowns (Always visible on md+, collapsible on mobile) */}
        <div className={`${mobileFiltersOpen ? 'flex' : 'hidden md:flex'} items-center gap-2 flex-wrap pt-2 border-t border-slate-800/80`}>
          {/* Pair */}
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-300 outline-none"
          >
            <option value="ALL">All Instruments</option>
            {availablePairs.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Strategy */}
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-300 outline-none"
          >
            <option value="ALL">All Strategies</option>
            {availableStrategies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Grade */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-300 outline-none"
          >
            <option value="ALL">All Grades</option>
            <option value="A+">A+ Trade</option>
            <option value="A">A Trade</option>
            <option value="B">B Trade</option>
            <option value="C">C Trade</option>
            <option value="F">F Trade</option>
          </select>

          {/* Result */}
          <select
            value={selectedResult}
            onChange={(e) => setSelectedResult(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-300 outline-none"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">Wins (+P&L)</option>
            <option value="LOSS">Losses (-P&L)</option>
            <option value="BE">Break Even</option>
          </select>

          {(selectedPair !== 'ALL' || selectedStrategy !== 'ALL' || selectedGrade !== 'ALL' || selectedResult !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedPair('ALL');
                setSelectedStrategy('ALL');
                setSelectedGrade('ALL');
                setSelectedResult('ALL');
              }}
              className="text-[11px] font-mono-code text-cyan-400 hover:underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Trade Journal Content */}
      {viewMode === 'VAULT' ? (
        <div className="space-y-4">
          {/* Mobile / Touch-First Card Grid */}
          <div
            className={
              displayLayout === 'TABLE'
                ? 'hidden'
                : displayLayout === 'CARDS'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
                : 'grid grid-cols-1 sm:grid-cols-2 lg:hidden gap-3.5'
            }
          >
            {filteredTrades.map((trade) => {
              const isWin = trade.profitLoss > 0;
              const isLoss = trade.profitLoss < 0;
              return (
                <div
                  key={trade.id}
                  onClick={() => setInspectedTrade(trade)}
                  className="prime-glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-cyan-400/50 transition cursor-pointer relative overflow-hidden prime-ios-touch space-y-3"
                >
                  {/* Card Header: Instrument, Direction, Session, R & PnL */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-cyan-400 font-mono-code tracking-wide">
                          {trade.instrument}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono-code ${
                            trade.direction === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {trade.direction}
                        </span>
                        <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                          {trade.session}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono-code text-slate-400 mt-1 flex items-center gap-2">
                        <span>{formatTradeDateTime(trade.date, trade.time)}</span>
                        <span>•</span>
                        <span className="text-slate-300 font-semibold">{trade.lotSize} Lots</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-bold font-mono-code ${
                          isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {formatCurrency(trade.profitLoss, currency, { showSign: true })}
                      </div>
                      <div className="text-[11px] font-mono-code font-bold text-slate-300">
                        {isWin ? '+' : ''}
                        {trade.rMultiple?.toFixed(1) || '0.0'}R
                      </div>
                    </div>
                  </div>

                  {/* Execution Matrix (Entry, SL, TP) */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center font-mono-code">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block">ENTRY</span>
                      <span className="text-xs font-semibold text-slate-200 mt-0.5 block truncate">
                        {trade.entryPrice}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block">STOP LOSS</span>
                      <span className="text-xs font-semibold text-rose-400 mt-0.5 block truncate">
                        {trade.stopLoss}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase tracking-wider block">TAKE PROFIT</span>
                      <span className="text-xs font-semibold text-emerald-400 mt-0.5 block truncate">
                        {trade.takeProfit}
                      </span>
                    </div>
                  </div>

                  {/* Strategy & Diagnostic Badges Footer */}
                  <div className="flex items-center justify-between text-xs font-mono-code pt-1 border-t border-slate-800/60">
                    <div className="text-slate-300 text-[11px] truncate max-w-[180px]">
                      {trade.strategy}
                    </div>

                    <div className="flex items-center gap-2">
                      {trade.tradeDiagnostic && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setDiagnosingTrade(trade);
                          }}
                          className={`text-[9px] px-2 py-0.5 rounded font-mono-code font-bold border ${
                            trade.tradeDiagnostic.classification === 'A_PLUS_EDGE_WIN'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : trade.tradeDiagnostic.classification === 'GOOD_BUSINESS_LOSS'
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                              : 'bg-blue-500/20 text-amber-300 border-blue-500/30'
                          }`}
                        >
                          {trade.tradeDiagnostic.classification === 'A_PLUS_EDGE_WIN'
                            ? 'EDGE WIN'
                            : trade.tradeDiagnostic.classification === 'GOOD_BUSINESS_LOSS'
                            ? 'GOOD LOSS'
                            : 'AUDITED'}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700">
                        {trade.grade || 'A'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div
            className={
              displayLayout === 'CARDS'
                ? 'hidden'
                : displayLayout === 'TABLE'
                ? 'bg-slate-950/70 border border-slate-800 rounded-xl shadow-lg overflow-hidden'
                : 'hidden lg:block bg-slate-950/70 border border-slate-800 rounded-xl shadow-lg overflow-hidden'
            }
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs font-mono-code text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-slate-100 font-bold font-military tracking-wider text-sm">
                  TRADE VAULT
                </span>
                <span>({filteredTrades.length} RECORDED)</span>
              </div>
              <span className="text-emerald-400">ALL RECORDS SECURED IN DATA VAULT</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-code">
            <thead>
              <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-medium">ID & DATE ({APP_TIMEZONE_LABEL})</th>
                <th className="py-3 px-3 font-medium">PAIR & DIR</th>
                <th className="py-3 px-3 font-medium">STRATEGY & MS</th>
                <th className="py-3 px-3 font-medium">EXECUTION (ENTRY / SL / TP)</th>
                <th className="py-3 px-3 font-medium text-center">GRADE</th>
                <th className="py-3 px-3 font-medium text-center">QUALITY</th>
                <th className="py-3 px-3 font-medium text-center">PSYCH</th>
                <th className="py-3 px-3 font-medium text-center">DIAGNOSTIC</th>
                <th className="py-3 px-3 font-medium text-right">R-MULT</th>
                <th className="py-3 px-3 font-medium text-right">NET P&L</th>
                <th className="py-3 px-4 font-medium text-center">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTrades.map((trade) => {
                const isWin = trade.profitLoss > 0;
                const isLoss = trade.profitLoss < 0;

                return (
                  <tr
                    key={trade.id}
                    className="hover:bg-slate-800/40 transition group cursor-pointer"
                    onClick={() => setInspectedTrade(trade)}
                  >
                    {/* ID & Date */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{trade.id}</span>
                        {trade.screenshots?.entry && (
                          <Camera className="w-3 h-3 text-cyan-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span className="text-slate-300 font-medium">
                          {formatTradeDateTime(trade.date, trade.time)}
                        </span>
                        <span>•</span>
                        <span>{trade.session}</span>
                      </div>
                    </td>

                    {/* Pair & Direction */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-cyan-400 text-sm">{trade.instrument}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            trade.direction === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {trade.timeframe} • {trade.lotSize} Lots
                      </div>
                    </td>

                    {/* Strategy & Market Structure */}
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{trade.strategy}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="text-amber-300">{trade.marketStructure}</span>
                        <span>•</span>
                        <span>HTF: {trade.htfTrend.slice(0, 4)}</span>
                      </div>
                    </td>

                    {/* Execution */}
                    <td className="py-3 px-3 text-[11px]">
                      <div className="text-slate-300">
                        In: <strong className="text-slate-100">{trade.entryPrice}</strong>
                      </div>
                      <div className="text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="text-rose-400">SL: {trade.stopLoss}</span>
                        <span className="text-emerald-400">TP: {trade.takeProfit}</span>
                      </div>
                    </td>

                    {/* Grade */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          trade.grade === 'A+' || trade.grade === 'A'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : trade.grade === 'B'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : trade.grade === 'C'
                            ? 'bg-blue-500/20 text-cyan-400 border border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {trade.grade}
                      </span>
                    </td>

                    {/* Quality */}
                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-200">
                        {trade.alignmentScore?.totalQuality || 85}
                        <span className="text-[10px] text-slate-500 font-normal">/100</span>
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {trade.ruleViolation === 'NONE' ? (
                          <span className="text-emerald-400">🟢 Clean</span>
                        ) : trade.ruleViolation === 'MINOR' ? (
                          <span className="text-cyan-400">🟡 Minor</span>
                        ) : (
                          <span className="text-rose-400">🔴 Major</span>
                        )}
                      </div>
                    </td>

                    {/* Psych */}
                    <td className="py-3 px-3 text-center">
                      <div className="text-base" title={trade.preEmotion}>
                        {trade.preEmotion === 'CONFIDENT'
                          ? '😎'
                          : trade.preEmotion === 'FEARFUL'
                          ? '😨'
                          : trade.preEmotion === 'ANGRY'
                          ? '😤'
                          : trade.preEmotion === 'GREEDY'
                          ? '🤑'
                          : trade.preEmotion === 'STRESSED'
                          ? '😓'
                          : trade.preEmotion === 'TIRED'
                          ? '😴'
                          : trade.preEmotion === 'EXCITED'
                          ? '🔥'
                          : '😐'}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {trade.postPsychology?.followedPlan ? 'Plan OK' : 'Deviated'}
                      </div>
                    </td>

                    {/* Diagnostic Outcome Badge */}
                    <td
                      className="py-3 px-3 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiagnosingTrade(trade);
                      }}
                    >
                      {trade.tradeDiagnostic ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono-code font-bold cursor-pointer hover:opacity-80 transition ${
                            trade.tradeDiagnostic.classification === 'A_PLUS_EDGE_WIN'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : trade.tradeDiagnostic.classification === 'GOOD_BUSINESS_LOSS'
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : trade.tradeDiagnostic.classification === 'SUBOPTIMAL_EARLY_EXIT_WIN'
                              ? 'bg-blue-500/20 text-amber-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                          title={trade.tradeDiagnostic.headline}
                        >
                          {trade.tradeDiagnostic.classification === 'A_PLUS_EDGE_WIN'
                            ? 'EDGE WIN'
                            : trade.tradeDiagnostic.classification === 'GOOD_BUSINESS_LOSS'
                            ? 'GOOD LOSS'
                            : trade.tradeDiagnostic.classification === 'SUBOPTIMAL_EARLY_EXIT_WIN'
                            ? 'EARLY EXIT'
                            : trade.tradeDiagnostic.classification === 'LUCKY_BAD_WIN'
                            ? 'LUCKY WIN'
                            : 'BREACH'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-blue-500 hover:text-slate-950 text-slate-400 text-[10px] font-mono-code transition cursor-pointer"
                        >
                          AUDIT [?]
                        </button>
                      )}
                    </td>

                    {/* R Multiple */}
                    <td
                      className={`py-3 px-3 text-right font-bold text-sm ${
                        isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {isWin ? '+' : ''}
                      {trade.rMultiple?.toFixed(1) || '0.0'}R
                    </td>

                    {/* Net P&L */}
                    <td
                      className={`py-3 px-3 text-right font-bold text-sm ${
                        isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(trade.profitLoss, currency, { showSign: true })}
                    </td>

                    {/* Action */}
                    <td
                      className="py-3 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setInspectedTrade(trade)}
                          title="Inspect Trade"
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteTrade(trade.id)}
                          title="Delete Trade"
                          className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTrades.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto px-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
                        <Sliders className="w-6 h-6 text-cyan-400/80" />
                      </div>
                      <h4 className="text-sm font-military font-bold text-slate-200 uppercase tracking-wider mb-1">
                        NO TRADES MATCH CRITERIA
                      </h4>
                      <p className="text-xs font-mono-code text-slate-500 mb-4">
                        Adjust your search filters or record a new trade execution into the vault.
                      </p>
                      <button
                        type="button"
                        onClick={onOpenNewTrade}
                        className="prime-btn-primary px-4 py-2 text-xs uppercase"
                      >
                        Record New Trade
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
      ) : (
        /* WIN/LOSS DIAGNOSTIC INTELLIGENCE HUB */
        <div className="space-y-6">
          {/* Header Directive */}
          <div className="p-5 rounded-2xl bg-[#090D16] border border-blue-500/20 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-military font-bold text-slate-100 tracking-wider">
                WIN / LOSS DIAGNOSTIC AUDIT CENTER
              </h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Professional trading performance separates <strong>OUTCOME</strong> (financial win or loss) from <strong>PROCESS</strong> (system adherence vs behavioral defect). A <em>Good Business Loss</em> with 100% rule adherence is an investment into statistical edge, whereas an emotional <em>Lucky Win</em> reinforces destructive trading habits that eventually liquidate accounts.
            </p>
          </div>

          {/* Core Diagnostic Intelligence KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Loss Diagnostics Card */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-military font-bold text-rose-400">
                  LOSS OUTCOME AUDIT ({lossTrades.length} TOTAL LOSSES)
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-rose-500/10 text-rose-300">
                  Defect Hunter
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono-code">
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                  <span className="text-sky-300">Good Business Losses:</span>
                  <span className="font-bold text-sky-400">{goodLosses}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                  <span className="text-amber-300">Execution Error Losses:</span>
                  <span className="font-bold text-cyan-400">{execLosses}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                  <span className="text-rose-300">Discipline Breach Losses:</span>
                  <span className="font-bold text-rose-400">{emotionalLosses}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                {goodLosses > emotionalLosses
                  ? '✅ Healthy loss profile. Losses are primarily systematic business costs.'
                  : '⚠️ Warning: Losses driven by emotional breaches, overtrading, or moving stops.'}
              </p>
            </div>

            {/* Win Diagnostics Card */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-military font-bold text-emerald-400">
                  WIN OUTCOME AUDIT ({winTrades.length} TOTAL WINS)
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                  Edge Quality
                </span>
              </div>
              <div className="space-y-2 text-xs font-mono-code">
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                  <span className="text-emerald-300">Institutional Edge Wins:</span>
                  <span className="font-bold text-emerald-400">{edgeWins}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                  <span className="text-amber-300">Early Exit / Fear Wins:</span>
                  <span className="font-bold text-cyan-400">{earlyExitWins}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                  <span className="text-rose-300">Lucky / Rule-Breaker Wins:</span>
                  <span className="font-bold text-rose-400">{luckyWins}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">
                {luckyWins === 0
                  ? '🎯 High integrity wins. Positive outcomes are earned through protocol adherence.'
                  : '⚠️ Bad habits alerted: Some wins occurred despite rule violations.'}
              </p>
            </div>

            {/* Process Decision Score Card */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-military font-bold text-cyan-400">
                  PROCESS DECISION QUALITY
                </span>
                <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-blue-500/10 text-amber-300">
                  System Integrity
                </span>
              </div>
              <div className="text-center py-2">
                <div className="text-3xl font-bold font-military text-slate-100">
                  {avgProcessQuality}%
                </div>
                <span className="text-[10px] text-slate-400 font-mono-code">
                  AVERAGE PROTOCOL ADHERENCE SCORE
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-sans leading-relaxed">
                {diagnosedTrades.length} of {trades.length} trades have undergone complete post-trade diagnostic interrogation.
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${avgProcessQuality}%` }}
                />
              </div>
            </div>
          </div>

          {/* Diagnostic Trades Queue */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-military font-bold text-slate-100 tracking-wider">
                TRADE DIAGNOSTIC AUDIT LOG
              </span>
              <span className="text-xs font-mono-code text-slate-400">
                AUDITED: {diagnosedTrades.length} / {trades.length}
              </span>
            </div>
            <div className="divide-y divide-slate-800/80 font-mono-code text-xs">
              {filteredTrades.map((trade) => {
                const isWin = trade.profitLoss > 0;
                const diag = trade.tradeDiagnostic;

                return (
                  <div
                    key={trade.id}
                    className="p-4 hover:bg-slate-800/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{trade.id}</span>
                        <span className="text-cyan-400 font-bold">{trade.instrument}</span>
                        <span className={trade.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                          {trade.direction}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            isWin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {formatCurrency(trade.profitLoss, currency, { showSign: true })}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatTradeDateTime(trade.date, trade.time)} • Strategy: {trade.strategy} • Grade: {trade.grade}
                      </div>
                      {diag && (
                        <div className="text-xs text-slate-300 pt-1 font-sans">
                          <strong className="text-cyan-400 font-mono-code">Verdict:</strong> {diag.verdict}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {diag ? (
                        <div className="text-right">
                          <span
                            className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                              diag.classification === 'A_PLUS_EDGE_WIN'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : diag.classification === 'GOOD_BUSINESS_LOSS'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : 'bg-blue-500/20 text-amber-300 border border-blue-500/30'
                            }`}
                          >
                            {diag.headline} ({diag.adherenceScore}%)
                          </span>
                          <button
                            type="button"
                            onClick={() => setDiagnosingTrade(trade)}
                            className="block mt-1 text-[11px] text-slate-400 hover:text-cyan-400 underline transition cursor-pointer"
                          >
                            Re-run Interrogation
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDiagnosingTrade(trade)}
                          className="px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider transition cursor-pointer flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>AUDIT {isWin ? 'WIN' : 'LOSS'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Trade Inspector Modal */}
      {inspectedTrade && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-200 ${
            isInspectorFullscreen
              ? 'p-0 bg-black/95 backdrop-blur-md'
              : 'p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto'
          }`}
        >
          <div
            className={`bg-[#0B0F19] border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
              isInspectorFullscreen
                ? 'w-full h-full rounded-none max-w-none max-h-none'
                : 'rounded-2xl w-full max-w-4xl my-auto max-h-[90vh]'
            }`}
          >
            {/* Inspector Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-[#020617] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-cyan-400 font-bold font-military">
                  {inspectedTrade.grade}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-military font-bold text-slate-100">
                      MISSION INSPECTOR: {inspectedTrade.id}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono-code font-bold ${
                        inspectedTrade.profitLoss > 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {formatCurrency(inspectedTrade.profitLoss, currency, { showSign: true })}{' '}
                      ({inspectedTrade.rMultiple > 0 ? '+' : ''}{inspectedTrade.rMultiple}R)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono-code flex items-center gap-1.5 flex-wrap">
                    <span className="text-amber-300 font-bold">{inspectedTrade.instrument}</span>
                    <span
                      className={
                        inspectedTrade.direction === 'BUY' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                      }
                    >
                      {inspectedTrade.direction}
                    </span>
                    <span>•</span>
                    <span className="text-slate-200">
                      {formatTradeDateTime(inspectedTrade.date, inspectedTrade.time, { format: 'full' })}
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">{inspectedTrade.session}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInspectorFullscreen(!isInspectorFullscreen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono-code font-bold transition cursor-pointer"
                  title={isInspectorFullscreen ? 'Minimize to window' : 'Expand to full screen'}
                >
                  {isInspectorFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>MINIMIZE</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>FULLSCREEN</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setInspectedTrade(null);
                    setIsInspectorFullscreen(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
                  title="Close Inspector"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Inspector Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-200 font-mono-code">
              {/* Row: Technical & Execution Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">ENTRY PRICE</span>
                  <span className="text-sm font-bold text-slate-100">{inspectedTrade.entryPrice}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">STOP LOSS</span>
                  <span className="text-sm font-bold text-rose-400">{inspectedTrade.stopLoss}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TAKE PROFIT</span>
                  <span className="text-sm font-bold text-emerald-400">{inspectedTrade.takeProfit}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">EXIT PRICE</span>
                  <span className="text-sm font-bold text-slate-100">{inspectedTrade.exitPrice}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">LOT SIZE</span>
                  <span className="text-sm font-bold text-cyan-400">{inspectedTrade.lotSize} Lots</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">RISK AMOUNT</span>
                  <span className="text-sm font-bold text-slate-200">
                    {formatCurrency(inspectedTrade.riskAmount, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PIPS GAINED/LOST</span>
                  <span className="text-sm font-bold text-slate-200">{inspectedTrade.pips} pips</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">STRATEGY MODEL</span>
                  <span className="text-sm font-bold text-cyan-400">{inspectedTrade.strategy}</span>
                </div>
              </div>

              {/* Section 4: Market Structure & Alignment Matrix */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-military font-bold text-cyan-400">
                  <span>MARKET STRUCTURE & QUALITY ALIGNMENT</span>
                  <span className="font-mono-code font-bold">
                    QUALITY: {inspectedTrade.alignmentScore?.totalQuality || 85}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Higher Timeframe:</span>
                    <strong>{inspectedTrade.htfTrend}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Lower Timeframe:</span>
                    <strong>{inspectedTrade.ltfTrend}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Market Structure:</span>
                    <strong className="text-amber-300">{inspectedTrade.marketStructure}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-300 text-[11px]">
                  <div>HTF Trend: {inspectedTrade.alignmentScore?.htfDirection || 25}/25</div>
                  <div>Structure: {inspectedTrade.alignmentScore?.marketStructure || 20}/20</div>
                  <div>Entry Model: {inspectedTrade.alignmentScore?.entryModel || 20}/20</div>
                  <div>Risk Mgmt: {inspectedTrade.alignmentScore?.riskManagement || 20}/20</div>
                  <div>News Filter: {inspectedTrade.alignmentScore?.newsCondition || 15}/15</div>
                </div>
              </div>

              {/* Section 5: Screenshots Viewer */}
              {Object.values(inspectedTrade.screenshots || {}).some(Boolean) && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="text-xs font-military font-bold text-cyan-400 flex items-center gap-1.5">
                    <Camera className="w-4 h-4" />
                    <span>MISSION CHARTS & SCREENSHOTS</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {inspectedTrade.screenshots.beforeEntry && (
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Before Entry</span>
                        <img
                          src={inspectedTrade.screenshots.beforeEntry}
                          alt="Before Entry"
                          onClick={() => setExpandedImage(inspectedTrade.screenshots.beforeEntry!)}
                          className="w-full h-28 object-cover rounded border border-slate-800 cursor-pointer hover:border-cyan-400 transition"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {inspectedTrade.screenshots.entry && (
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">Entry Execution</span>
                        <img
                          src={inspectedTrade.screenshots.entry}
                          alt="Entry"
                          onClick={() => setExpandedImage(inspectedTrade.screenshots.entry!)}
                          className="w-full h-28 object-cover rounded border border-slate-800 cursor-pointer hover:border-cyan-400 transition"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {inspectedTrade.screenshots.afterTrade && (
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">After Trade</span>
                        <img
                          src={inspectedTrade.screenshots.afterTrade}
                          alt="After Trade"
                          onClick={() => setExpandedImage(inspectedTrade.screenshots.afterTrade!)}
                          className="w-full h-28 object-cover rounded border border-slate-800 cursor-pointer hover:border-cyan-400 transition"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {inspectedTrade.screenshots.htfAnalysis && (
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">HTF Structure</span>
                        <img
                          src={inspectedTrade.screenshots.htfAnalysis}
                          alt="HTF"
                          onClick={() => setExpandedImage(inspectedTrade.screenshots.htfAnalysis!)}
                          className="w-full h-28 object-cover rounded border border-slate-800 cursor-pointer hover:border-cyan-400 transition"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Vision Audit Feedback */}
              {inspectedTrade.aiAudit && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-amber-300 space-y-1.5">
                  <div className="flex items-center justify-between font-military font-bold text-sm">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      AI VISION AUDITOR DIRECTIVE
                    </span>
                    <span className="font-mono-code">{inspectedTrade.aiAudit.verdict}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {inspectedTrade.aiAudit.critique}
                  </p>
                </div>
              )}

              {/* Win/Loss Diagnostic Engine Audit Card */}
              {inspectedTrade.tradeDiagnostic ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <span className="font-military font-bold text-sm text-slate-100">
                        DIAGNOSTIC AUDIT: {inspectedTrade.tradeDiagnostic.headline}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono-code bg-blue-500/20 text-cyan-400 border border-blue-500/30">
                      Adherence: {inspectedTrade.tradeDiagnostic.adherenceScore}%
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 text-xs leading-relaxed font-sans">
                    <span className="text-cyan-400 font-bold font-mono-code block text-[10px] mb-1">
                      DECISION QUALITY & VERDICT
                    </span>
                    {inspectedTrade.tradeDiagnostic.verdict}
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                    <span className="text-emerald-400 font-bold font-mono-code block text-[10px] mb-1">
                      PERMANENT DISCIPLINE TAKEAWAY
                    </span>
                    {inspectedTrade.tradeDiagnostic.actionableTakeaway}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-950/50 border border-dashed border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-military font-bold text-slate-200">
                      NO DIAGNOSTIC AUDIT RECORDED YET
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Classify whether this {inspectedTrade.profitLoss >= 0 ? 'win' : 'loss'} was due to repeatable edge or psychological execution breach.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiagnosingTrade(inspectedTrade)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider transition cursor-pointer"
                  >
                    RUN AUDIT
                  </button>
                </div>
              )}

              {/* Section 6 & 7: Psychology, Rules & Mistakes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-military font-bold text-cyan-400">
                    PSYCHOLOGICAL STATE
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Pre-Trade State:</span>
                    <span className="text-white font-bold">{inspectedTrade.preEmotion}</span>
                  </div>
                  <div className="space-y-1 text-slate-300 text-[11px] pt-1">
                    <div>Followed plan: {inspectedTrade.postPsychology?.followedPlan ? '✅ Yes' : '❌ No'}</div>
                    <div>Moved stop loss: {inspectedTrade.postPsychology?.movedStopLoss ? '⚠️ Yes' : '✅ No'}</div>
                    <div>Closed early: {inspectedTrade.postPsychology?.closedEarly ? '⚠️ Yes' : '✅ No'}</div>
                    <div>Overtraded: {inspectedTrade.postPsychology?.overtraded ? '⚠️ Yes' : '✅ No'}</div>
                    <div>Revenge trade: {inspectedTrade.postPsychology?.revengeTraded ? '🔴 Yes' : '✅ No'}</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-military font-bold text-cyan-400">
                    DISCIPLINE & MISTAKE LOG
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Violation Status:</span>
                    <span
                      className={`font-bold ${
                        inspectedTrade.ruleViolation === 'NONE'
                          ? 'text-emerald-400'
                          : inspectedTrade.ruleViolation === 'MINOR'
                          ? 'text-cyan-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {inspectedTrade.ruleViolation}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Mistake Reason: <strong className="text-white">{inspectedTrade.mistakeReason}</strong>
                  </div>
                  {inspectedTrade.violatedRules && inspectedTrade.violatedRules.length > 0 && (
                    <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                      Violations: {inspectedTrade.violatedRules.join(', ')}
                    </div>
                  )}
                  {inspectedTrade.notes && (
                    <div className="text-[11px] text-slate-300 pt-1">
                      <span className="text-slate-400 block text-[10px]">Notes:</span>
                      <span className="italic">{inspectedTrade.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-[#020617] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDiagnosingTrade(inspectedTrade)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider transition cursor-pointer shadow-md shadow-blue-500/10"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{inspectedTrade.tradeDiagnostic ? 'RE-AUDIT WIN/LOSS' : 'RUN DIAGNOSTIC AUDIT'}</span>
              </button>
              <button
                onClick={() => setInspectedTrade(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-code text-xs transition"
              >
                CLOSE INSPECTOR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Diagnostic Engine Modal */}
      {diagnosingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl my-auto">
            <TradeDiagnosticEngine
              trade={diagnosingTrade}
              currency={currency}
              onSaveDiagnostic={handleDiagnosticSaved}
              onClose={() => setDiagnosingTrade(null)}
            />
          </div>
        </div>
      )}

      {/* Expanded Image Modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <div className="max-w-5xl max-h-[90vh] relative">
            <img
              src={expandedImage}
              alt="Expanded Chart"
              className="max-w-full max-h-[90vh] object-contain rounded-lg border border-slate-700 shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <span className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-slate-300 text-xs rounded font-mono-code">
              CLICK ANYWHERE TO CLOSE
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
