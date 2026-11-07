import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark,
  AlarmClock,
  PieChart,
  CalendarDays,
  Newspaper,
  Users2,
  Calendar,
  X,
  Plus,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  Sliders,
  DollarSign,
  Palette,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { RightSideToolId, ChartAlertItem } from '../ProTradingView';
import {
  PairTechnicalAnalysis,
  PairSentimentData,
  PairSeasonalityData,
  PairNewsItem,
  PairCommunityData,
} from '../../utils/tradingViewPairIntelligence';
import { CalendarEvent } from '../../services/economicCalendarService';
import { CotMarketSummary } from '../../types/cotTypes';
import { fetchCotMarketSummaries } from '../../services/cotService';
import { getCotPairForSymbol, CotPairResult } from '../../utils/cotPairEngine';

export interface TradingViewRightDockProps {
  activeTool: RightSideToolId | null;
  onClose: () => void;
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  livePrice: number;
  pipDecimals: number;
  spreadPips: number;
  watchlistSymbols: string[];
  onAddWatchlistSymbol: (symbol: string) => void;
  onRemoveWatchlistSymbol: (symbol: string) => void;
  onClearWatchlist: () => void;
  alerts: ChartAlertItem[];
  onAddAlert: (alert: { symbol: string; price: number; condition: ChartAlertItem['condition']; notes?: string }) => void;
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  onClearAlerts: () => void;
  technical?: PairTechnicalAnalysis;
  sentiment: PairSentimentData;
  seasonality: PairSeasonalityData;
  news: PairNewsItem[];
  community: PairCommunityData;
  calendarEvents: CalendarEvent[];
}

export const TradingViewRightDock: React.FC<TradingViewRightDockProps> = ({
  activeTool,
  onClose,
  selectedSymbol,
  onSelectSymbol,
  livePrice,
  pipDecimals,
  spreadPips,
  watchlistSymbols,
  onAddWatchlistSymbol,
  onRemoveWatchlistSymbol,
  onClearWatchlist,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onToggleAlert,
  onClearAlerts,
  sentiment,
  seasonality,
  news,
  community,
  calendarEvents,
}) => {
  // Watchlist input
  const [watchlistInput, setWatchlistInput] = useState('');

  // Alerts form
  const [alertTargetPrice, setAlertTargetPrice] = useState(livePrice ? livePrice.toFixed(pipDecimals) : '');
  const [alertCondition, setAlertCondition] = useState<ChartAlertItem['condition']>('CROSSING');
  const [alertNotes, setAlertNotes] = useState('');

  // Calendar filter and expansion
  const [calFilter, setCalFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [calSearch, setCalSearch] = useState('');
  const [expandedCalIds, setExpandedCalIds] = useState<Record<string, boolean>>({});

  // Dynamic COT Market Summaries for selected symbol
  const [cotSummaries, setCotSummaries] = useState<CotMarketSummary[]>([]);
  const [isLoadingCot, setIsLoadingCot] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoadingCot(true);
    fetchCotMarketSummaries()
      .then((res) => {
        if (mounted && res.data) {
          setCotSummaries(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingCot(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const dynamicCotPair = useMemo<CotPairResult | null>(() => {
    return getCotPairForSymbol(selectedSymbol, cotSummaries);
  }, [selectedSymbol, cotSummaries]);

  const toggleEventExpand = (id: string) => {
    setExpandedCalIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!activeTool) return null;

  return (
    <div className="w-full lg:w-84 xl:w-96 bg-[#0B0F19] border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col z-30 shrink-0 h-80 lg:h-full animate-in slide-in-from-right duration-200 select-none font-sans">
      {/* Dock Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
          {activeTool === 'WATCHLIST' && <Bookmark className="w-4 h-4 text-cyan-400" />}
          {activeTool === 'ALERTS' && <AlarmClock className="w-4 h-4 text-cyan-400" />}
          {activeTool === 'SENTIMENT' && <PieChart className="w-4 h-4 text-cyan-400" />}
          {activeTool === 'SEASONALITY' && <CalendarDays className="w-4 h-4 text-cyan-400" />}
          {activeTool === 'NEWS' && <Newspaper className="w-4 h-4 text-cyan-400" />}
          {activeTool === 'COMMUNITY' && <Users2 className="w-4 h-4 text-cyan-400" />}
          {activeTool === 'CALENDAR' && <Calendar className="w-4 h-4 text-cyan-400" />}

          <span>
            {activeTool === 'WATCHLIST' && `Watchlist (${watchlistSymbols.length})`}
            {activeTool === 'ALERTS' && `Alerts (${alerts.length})`}
            {activeTool === 'SENTIMENT' && `${selectedSymbol} Sentiment & COT`}
            {activeTool === 'SEASONALITY' && `${selectedSymbol} Seasonality`}
            {activeTool === 'NEWS' && `${selectedSymbol} Market News`}
            {activeTool === 'COMMUNITY' && `${selectedSymbol} Community Ideas`}
            {activeTool === 'CALENDAR' && 'Live News Calendar'}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          title="Close Dock"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Dock Content Body */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-3">
        {/* ================================================================= */}
        {/* 1. WATCHLIST PANEL                                                */}
        {/* ================================================================= */}
        {activeTool === 'WATCHLIST' && (
          <div className="space-y-3">
            {/* Add symbol form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = watchlistInput.trim().toUpperCase();
                if (trimmed) {
                  onAddWatchlistSymbol(trimmed);
                  setWatchlistInput('');
                }
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={watchlistInput}
                  onChange={(e) => setWatchlistInput(e.target.value)}
                  placeholder="Add symbol e.g. XAUUSD, NAS100..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none uppercase font-bold"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Quick popular add buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
              {['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'US30', 'NAS100', 'BTCUSDT', 'USOIL'].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => onAddWatchlistSymbol(quick)}
                  disabled={watchlistSymbols.includes(quick)}
                  className={`px-2 py-0.5 rounded-full border transition cursor-pointer shrink-0 ${
                    watchlistSymbols.includes(quick)
                      ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-default'
                      : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400'
                  }`}
                >
                  +{quick}
                </button>
              ))}
            </div>

            {/* Watchlist Items */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                <span>Symbol</span>
                <div className="flex items-center gap-4">
                  <span>Price</span>
                  {watchlistSymbols.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearWatchlist}
                      className="text-rose-400 hover:underline text-[10px] cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {watchlistSymbols.map((sym) => {
                const isSelected = sym === selectedSymbol;
                const isGold = sym.includes('XAU');
                const isCrypto = sym.includes('BTC') || sym.includes('ETH');
                const isIndex = sym.includes('US30') || sym.includes('NAS') || sym.includes('SPX');
                const defaultP = isGold ? 4039.2 : isCrypto ? 68450 : isIndex ? 42850 : 1.0845;
                const priceStr = isSelected ? livePrice.toFixed(pipDecimals) : defaultP.toFixed(pipDecimals);

                return (
                  <div
                    key={sym}
                    onClick={() => onSelectSymbol(sym)}
                    className={`p-2 rounded-xl border flex items-center justify-between transition cursor-pointer group ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-md'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
                      <div>
                        <span className="font-bold font-mono text-xs block text-white group-hover:text-cyan-300">
                          {sym}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {isGold ? 'Gold Spot' : isCrypto ? 'Binance Spot' : isIndex ? 'Index CFD' : 'FX Major'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs block text-slate-200">
                          {priceStr}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          +0.14%
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveWatchlistSymbol(sym);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                        title="Remove from Watchlist"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. ALERTS PANEL                                                   */}
        {/* ================================================================= */}
        {activeTool === 'ALERTS' && (
          <div className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = parseFloat(alertTargetPrice);
                if (!p || isNaN(p)) return;
                onAddAlert({
                  symbol: selectedSymbol,
                  price: p,
                  condition: alertCondition,
                  notes: alertNotes.trim() || `Alert for ${selectedSymbol} @ ${p}`,
                });
                setAlertNotes('');
              }}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200 uppercase">
                  Add Price Alert for {selectedSymbol}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  Live: {livePrice.toFixed(pipDecimals)}
                </span>
              </div>

              <select
                value={alertCondition}
                onChange={(e) => setAlertCondition(e.target.value as any)}
                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none"
              >
                <option value="CROSSING">Crossing Target Price</option>
                <option value="CROSSING_UP">Crossing Up (Breakout)</option>
                <option value="CROSSING_DOWN">Crossing Down (Breakdown)</option>
                <option value="GREATER_THAN">Greater Than (≥)</option>
                <option value="LESS_THAN">Less Than (≤)</option>
              </select>

              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  value={alertTargetPrice}
                  onChange={(e) => setAlertTargetPrice(e.target.value)}
                  placeholder={`Target e.g. ${livePrice.toFixed(pipDecimals)}`}
                  className="flex-1 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setAlertTargetPrice(livePrice.toFixed(pipDecimals))}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer"
                  title="Reset to current market price"
                >
                  Current
                </button>
              </div>

              <input
                type="text"
                value={alertNotes}
                onChange={(e) => setAlertNotes(e.target.value)}
                placeholder="Alert note e.g. Key Level Retest / Invalidation"
                className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none"
              >
              </input>

              <button
                type="submit"
                className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <AlarmClock className="w-3.5 h-3.5" />
                <span>Save Alert</span>
              </button>
            </form>

            {/* List of Alerts */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Active Alerts ({alerts.length})</span>
                {alerts.length > 0 && (
                  <button onClick={onClearAlerts} className="text-rose-400 hover:underline text-[10px] cursor-pointer">
                    Clear All
                  </button>
                )}
              </div>

              {alerts.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
                  No active alerts. Add one above to get real-time price alerts!
                </div>
              ) : (
                alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                      alt.triggered
                        ? 'bg-amber-950/25 border-amber-500/50 text-amber-200'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-white font-mono">{alt.symbol}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                            alt.triggered ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {alt.triggered ? 'TRIGGERED' : 'ACTIVE'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleAlert(alt.id)}
                          className="text-slate-400 hover:text-white p-0.5"
                          title={alt.active ? 'Pause Alert' : 'Resume Alert'}
                        >
                          {alt.active ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAlert(alt.id)}
                          className="text-slate-400 hover:text-rose-400 p-0.5"
                          title="Delete Alert"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300">
                      {alt.condition.replace(/_/g, ' ')}:{' '}
                      <strong className="text-cyan-300 font-mono">{alt.price}</strong>
                    </div>

                    {alt.notes && <div className="text-[10px] text-slate-400">{alt.notes}</div>}

                    <div className="text-[9px] text-slate-500 pt-1 border-t border-slate-900 flex justify-between">
                      <span>Created {alt.createdAt}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* SENTIMENT & COT PANEL (Dynamic Institutional CFTC COT by Active Pair) */}
        {/* ================================================================= */}
        {activeTool === 'SENTIMENT' && (
          <div className="space-y-3">
            {/* Dynamic Institutional COT for Active Symbol */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{selectedSymbol} COT Positioning</span>
                </span>
                {dynamicCotPair ? (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      dynamicCotPair.biasGrade === 'STRONG_BUY' || dynamicCotPair.biasGrade === 'BUY'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : dynamicCotPair.biasGrade === 'STRONG_SELL' || dynamicCotPair.biasGrade === 'SELL'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {dynamicCotPair.biasLabel}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {sentiment.cot.biasLabel}
                  </span>
                )}
              </div>

              {dynamicCotPair ? (
                <>
                  {/* Bullishness Meter */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-300">COT Bullish Probability</span>
                      <span className="text-cyan-400 font-mono">{dynamicCotPair.bullishnessPct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${dynamicCotPair.bullishnessPct}%` }}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all duration-300"
                        style={{ width: `${100 - dynamicCotPair.bullishnessPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>Differential: {dynamicCotPair.differentialScore > 0 ? `+${dynamicCotPair.differentialScore}` : dynamicCotPair.differentialScore} pts</span>
                      <span>Flow: {dynamicCotPair.weeklyFlowBias}</span>
                    </div>
                  </div>

                  {/* Base vs Quote Breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-cyan-400 block font-bold">
                        {dynamicCotPair.baseAsset} (Base)
                      </span>
                      <div className="text-white font-bold mt-0.5">
                        Score: {dynamicCotPair.baseMetric.strengthScore >= 0 ? `+${dynamicCotPair.baseMetric.strengthScore}` : dynamicCotPair.baseMetric.strengthScore}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Net: {dynamicCotPair.baseMetric.nonCommNet > 0 ? `+${dynamicCotPair.baseMetric.nonCommNet.toLocaleString()}` : dynamicCotPair.baseMetric.nonCommNet.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Net % OI: {dynamicCotPair.baseMetric.netPctOI}%
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-amber-400 block font-bold">
                        {dynamicCotPair.quoteAsset} (Quote)
                      </span>
                      <div className="text-white font-bold mt-0.5">
                        Score: {dynamicCotPair.quoteMetric.strengthScore >= 0 ? `+${dynamicCotPair.quoteMetric.strengthScore}` : dynamicCotPair.quoteMetric.strengthScore}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Net: {dynamicCotPair.quoteMetric.nonCommNet > 0 ? `+${dynamicCotPair.quoteMetric.nonCommNet.toLocaleString()}` : dynamicCotPair.quoteMetric.nonCommNet.toLocaleString()}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        Net % OI: {dynamicCotPair.quoteMetric.netPctOI}%
                      </div>
                    </div>
                  </div>

                  {/* Institutional Thesis */}
                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                    {dynamicCotPair.thesis}
                  </p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Large Speculators Net</span>
                      <strong className="text-white font-mono">{sentiment.cot.largeSpeculatorsNet}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Commercial Hedgers</span>
                      <strong className="text-white font-mono">{sentiment.cot.commercialHedgersNet}</strong>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Weekly Shift:</span>
                    <span className="text-cyan-300 font-bold">{sentiment.cot.weeklyChangeContracts}</span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {sentiment.cot.institutionalSummary}
                  </p>
                </>
              )}
            </div>

            {/* Retail Crowd Positioning */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase">Retail Crowd Positioning</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    sentiment.retail.contrarianSignal === 'BULLISH'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : sentiment.retail.contrarianSignal === 'BEARISH'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Contrarian {sentiment.retail.contrarianSignal}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-800 h-4 rounded-lg overflow-hidden flex text-[10px] font-bold text-white leading-4">
                  <div
                    className="bg-blue-600 flex items-center justify-start pl-2 transition-all duration-500"
                    style={{ width: `${sentiment.retail.longPct}%` }}
                  >
                    {sentiment.retail.longPct}% Long
                  </div>
                  <div
                    className="bg-rose-600 flex items-center justify-end pr-2 transition-all duration-500"
                    style={{ width: `${sentiment.retail.shortPct}%` }}
                  >
                    {sentiment.retail.shortPct}% Short
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {sentiment.retail.interpretation}
              </p>

              <div className="text-[10px] text-slate-500 font-mono">
                Sample: {sentiment.retail.sampleSize}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 5. SEASONALITY PANEL                                              */}
        {/* ================================================================= */}
        {activeTool === 'SEASONALITY' && (
          <div className="space-y-3">
            {/* Current Month Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/40 via-slate-950 to-slate-950 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">{seasonality.currentMonthName} Seasonality</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {seasonality.currentMonthWinRate}% Win Rate
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-cyan-300">
                  {seasonality.historicalTendency}
                </span>
                <span className="text-xs text-slate-400">
                  (Avg: {seasonality.currentMonthAvgReturn >= 0 ? '+' : ''}{seasonality.currentMonthAvgReturn}%)
                </span>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {seasonality.institutionalDrivers}
              </p>
            </div>

            {/* 12-Month Table */}
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-slate-400 pb-1 border-b border-slate-800">
                10-Year Historical Performance by Month
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {seasonality.monthlyBreakdown.map((m) => (
                  <div
                    key={m.month}
                    className={`p-2 rounded-lg border flex items-center justify-between ${
                      m.isCurrent
                        ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow'
                        : 'bg-slate-950/70 border-slate-900 text-slate-300'
                    }`}
                  >
                    <span>{m.month}</span>
                    <div className="text-right font-mono">
                      <span className={m.winRate >= 55 ? 'text-emerald-400' : m.winRate <= 45 ? 'text-rose-400' : 'text-slate-400'}>
                        {m.winRate}%
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({m.avgReturnPct >= 0 ? '+' : ''}{m.avgReturnPct}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 6. NEWS PANEL                                                     */}
        {/* ================================================================= */}
        {activeTool === 'NEWS' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-1.5">
              <span>Headlines for {selectedSymbol}</span>
              <span className="text-[10px] text-cyan-400">{news.length} updates</span>
            </div>

            {news.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-cyan-400 font-bold">{item.source}</span>
                  <span className="text-slate-500">{item.timeAgo}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-100 font-sans leading-snug">
                  {item.title}
                </h4>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  {item.summary}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px]">
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
                      item.sentiment === 'BULLISH'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                        : item.sentiment === 'BEARISH'
                        ? 'bg-rose-950 text-rose-400 border border-rose-500/40'
                        : 'bg-slate-900 text-slate-300'
                    }`}
                  >
                    {item.sentiment === 'BULLISH' ? '🟢 BULLISH' : item.sentiment === 'BEARISH' ? '🔴 BEARISH' : '⚪ NEUTRAL'}
                  </span>
                  <span className="text-slate-500 uppercase text-[9px] font-bold">
                    Impact: {item.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ================================================================= */}
        {/* 7. COMMUNITY IDEAS & CONSENSUS PANEL                              */}
        {/* ================================================================= */}
        {activeTool === 'COMMUNITY' && (
          <div className="space-y-3">
            {/* Community Consensus */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase">Trader Community Consensus</span>
                <span className="text-emerald-400 font-bold">{community.bullishPct}% Bullish</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                <div className="bg-emerald-500 h-full" style={{ width: `${community.bullishPct}%` }} />
                <div className="bg-rose-500 h-full" style={{ width: `${community.bearishPct}%` }} />
              </div>

              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Target: <strong className="text-emerald-400">{community.bullishPriceTarget}</strong></span>
                <span>Invalidation: <strong className="text-rose-400">{community.bearishPriceTarget}</strong></span>
              </div>

              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                {community.communityConsensus}
              </p>
            </div>

            {/* Ideas List */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400">Top Verified Community Setups</div>
              {community.ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-cyan-300">{idea.author}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        idea.bias === 'LONG'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {idea.bias} · {idea.timeframe}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white font-sans leading-snug">
                    {idea.title}
                  </div>

                  <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1.5 rounded-lg text-[10px] font-mono">
                    <div>Entry: <strong className="text-white">{idea.entry}</strong></div>
                    <div>Target: <strong className="text-emerald-400">{idea.target}</strong></div>
                    <div>SL: <strong className="text-rose-400">{idea.stopLoss}</strong></div>
                  </div>

                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    {idea.rationale}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                    <span>{idea.likes} Likes · {idea.comments} Comments</span>
                    <span>{idea.timeAgo}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 8. ECONOMIC CALENDAR PANEL                                        */}
        {/* ================================================================= */}
        {/* 8. LIVE ECONOMIC CALENDAR PANEL (Click to View Full Details)       */}
        {/* ================================================================= */}
        {activeTool === 'CALENDAR' && (
          <div className="space-y-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px] font-bold">
              {(['ALL', 'HIGH', 'MEDIUM'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setCalFilter(filter)}
                  className={`flex-1 py-1 rounded text-center transition cursor-pointer ${
                    calFilter === filter ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Calendar Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={calSearch}
                onChange={(e) => setCalSearch(e.target.value)}
                placeholder="Search CPI, NFP, Fed, EUR..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
              />
            </div>

            {/* List of News Events with Full Detail Expansion */}
            <div className="space-y-2">
              {calendarEvents
                .filter((evt) => {
                  if (calFilter === 'HIGH' && evt.importance !== 'HIGH') return false;
                  if (calFilter === 'MEDIUM' && evt.importance === 'LOW') return false;
                  if (calSearch.trim()) {
                    const q = calSearch.toLowerCase();
                    return (
                      evt.eventName.toLowerCase().includes(q) ||
                      evt.currency.toLowerCase().includes(q) ||
                      (evt.description && evt.description.toLowerCase().includes(q))
                    );
                  }
                  return true;
                })
                .slice(0, 30)
                .map((evt) => {
                  const isExpanded = Boolean(expandedCalIds[evt.id]);
                  return (
                    <div
                      key={evt.id}
                      onClick={() => toggleEventExpand(evt.id)}
                      className={`p-2.5 rounded-xl border space-y-1.5 text-xs transition cursor-pointer ${
                        isExpanded
                          ? 'bg-slate-900 border-cyan-500/50 shadow-lg'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                            {evt.currency}
                          </span>
                          <span className="text-slate-100 font-sans truncate max-w-[170px]">
                            {evt.eventName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                              evt.importance === 'HIGH'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/50'
                                : evt.importance === 'MEDIUM'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {evt.importance}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                      </div>

                      {/* Snapshot Figures Grid */}
                      <div className="grid grid-cols-3 gap-1 text-[10px] bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/80 font-mono">
                        <div>
                          <div className="text-slate-500 text-[9px] uppercase">Time (PKT)</div>
                          <div className="font-bold text-white truncate">{evt.timeShortPkt || evt.timeUtc || evt.date}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-[9px] uppercase">Forecast</div>
                          <div className="font-bold text-slate-300 truncate">{evt.forecast || '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 text-[9px] uppercase">Previous</div>
                          <div className="font-bold text-slate-400 truncate">{evt.previous || '—'}</div>
                        </div>
                      </div>

                      {evt.actual && (
                        <div className="text-[10px] font-bold flex items-center justify-between pt-0.5 border-t border-slate-900">
                          <span className="text-slate-400">Actual Print:</span>
                          <span className="text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded font-mono">
                            {evt.actual}
                          </span>
                        </div>
                      )}

                      {/* Expanded In-Depth Details */}
                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-800 space-y-2 text-[11px] font-sans">
                          {evt.description && (
                            <p className="text-slate-300 leading-relaxed bg-slate-950 p-2 rounded border border-slate-800">
                              {evt.description}
                            </p>
                          )}

                          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                            {evt.source && (
                              <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                                <span className="text-slate-500 block">SOURCE / AGENCY:</span>
                                <span className="text-slate-300 font-bold truncate block">{evt.source}</span>
                              </div>
                            )}
                            {evt.datePkt && (
                              <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                                <span className="text-slate-500 block">LOCAL PKT DATE:</span>
                                <span className="text-cyan-300 font-bold block">{evt.datePkt}</span>
                              </div>
                            )}
                          </div>

                          {evt.marketRelevance && (
                            <div className="p-2 rounded bg-slate-950/90 border border-slate-800 space-y-1">
                              <span className="text-[10px] font-bold text-cyan-400 uppercase block font-mono">
                                Potential Market Impact:
                              </span>
                              <div className="text-slate-300 text-[11px] leading-snug">
                                • Forex: {evt.marketRelevance.forex}
                              </div>
                              <div className="text-slate-300 text-[11px] leading-snug">
                                • Commodities: {evt.marketRelevance.gold}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
