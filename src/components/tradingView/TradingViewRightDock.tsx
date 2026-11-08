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
  tvSymbol?: string;
}

import { PairNewsPanel, PairWidgetPanel, SeasonalityPanel, SentimentCotPanel, TvCalendarPanel } from './PairIntelPanels';

export const TradingViewRightDock: React.FC<TradingViewRightDockProps> = ({
  tvSymbol,
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
          {activeTool === 'WIDGET' && <PieChart className="w-4 h-4 text-cyan-400" />}
          {activeTool === 'CALENDAR' && <Calendar className="w-4 h-4 text-cyan-400" />}

          <span>
            {activeTool === 'WATCHLIST' && `Watchlist (${watchlistSymbols.length})`}
            {activeTool === 'ALERTS' && `Alerts (${alerts.length})`}
            {activeTool === 'SENTIMENT' && `${selectedSymbol} Sentiment & COT`}
            {activeTool === 'SEASONALITY' && `${selectedSymbol} Seasonality`}
            {activeTool === 'NEWS' && `${selectedSymbol} Market News`}
            {activeTool === 'WIDGET' && `${selectedSymbol} · Fundamentals, Seasonality, COT & Sentiment`}
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
        {activeTool === 'WIDGET' && <PairWidgetPanel symbol={selectedSymbol} />}
        {activeTool === 'SENTIMENT' && <SentimentCotPanel symbol={selectedSymbol} />}
        {activeTool === 'SEASONALITY' && <SeasonalityPanel symbol={selectedSymbol} />}
        {activeTool === 'NEWS' && <PairNewsPanel tvSymbol={tvSymbol || selectedSymbol} display={selectedSymbol} />}
        {activeTool === 'CALENDAR' && <TvCalendarPanel />}
      </div>
    </div>
  );
};
