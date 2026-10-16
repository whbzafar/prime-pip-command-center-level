import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  RefreshCw,
  Search,
  Grid,
  List,
  AlertTriangle,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  X,
  BarChart2,
  SlidersHorizontal,
  FileCode2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export type AssetClass = 'CRYPTO' | 'FOREX' | 'INDICES' | 'COMMODITIES';
export type FilterCategory = 'ALL' | AssetClass;
export type SortOption = 'MOST_LONG' | 'MOST_SHORT' | 'MOST_EXTREME' | 'ALPHABETICAL';
export type Timeframe = '24h' | '7d' | '30d';

export interface NormalizedSentimentItem {
  symbol: string;
  assetClass: AssetClass;
  longPct: number;
  shortPct: number;
  source: string;
  traderGroup: string;
  disclaimer?: string;
  sourceUrl: string;
  fetchedAt: number;
  rawPayload?: any;
  timestamp: number;
  change1hPct?: number;
  isStale?: boolean;
  isUnavailable?: boolean;
  notProvided?: boolean;
}

export interface ProviderHealthStatus {
  id: string;
  name: string;
  assetClasses: AssetClass[];
  status: 'LIVE' | 'STALE' | 'DOWN' | 'DISCONNECTED';
  lastSuccessTime: number | null;
  lastAttemptTime: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  requestCountToday: number;
  refreshIntervalMs: number;
  notes?: string;
}

export interface SentimentSnapshot {
  symbol: string;
  assetClass: AssetClass;
  longPct: number;
  shortPct: number;
  source: string;
  traderGroup?: string;
  timestamp: number;
}

// Expected reference instruments to detect if a source omits symbols
const COMMODITY_REFERENCE_SYMBOLS = ['XAUUSD', 'XAGUSD', 'USOIL', 'BRENT'];
const INDEX_REFERENCE_SYMBOLS = ['US30', 'NAS100', 'SPX500', 'GER40', 'UK100'];

function timeAgo(timestamp: number | null | undefined): string {
  if (!timestamp || timestamp <= 0) return 'Never';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatSymbol(sym: string): string {
  if (!sym) return '';
  if (sym === 'XAUUSD') return 'XAU/USD (Gold)';
  if (sym === 'XAGUSD') return 'XAG/USD (Silver)';
  if (sym === 'USOIL') return 'USOIL (WTI Crude)';
  if (sym === 'BRENT') return 'Brent Crude';
  if (sym === 'US30') return 'US30 (Dow Jones)';
  if (sym === 'NAS100') return 'NAS100 (Nasdaq)';
  if (sym === 'SPX500') return 'SPX500 (S&P 500)';
  if (sym === 'GER40') return 'GER40 (DAX)';
  if (sym === 'UK100') return 'UK100 (FTSE)';
  if (sym.length === 6 && !sym.includes('/') && !sym.endsWith('USDT')) {
    return `${sym.slice(0, 3)}/${sym.slice(3)}`;
  }
  if (sym.endsWith('USDT')) {
    return `${sym.replace('USDT', '')}/USDT`;
  }
  return sym;
}

export const RetailSentimentView: React.FC = () => {
  const [items, setItems] = useState<NormalizedSentimentItem[]>([]);
  const [providers, setProviders] = useState<ProviderHealthStatus[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters & Controls
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('MOST_EXTREME');
  const [viewMode, setViewMode] = useState<'LIST' | 'HEATMAP'>('LIST');

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<NormalizedSentimentItem | null>(null);
  const [historyData, setHistoryData] = useState<SentimentSnapshot[]>([]);
  const [historyTimeframe, setHistoryTimeframe] = useState<Timeframe>('24h');
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Data Audit Modal State
  const [auditItem, setAuditItem] = useState<NormalizedSentimentItem | null>(null);

  // Fetch sentiment data from server cache (never external APIs directly)
  const fetchSentiment = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const res = await fetch('/api/sentiment');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setProviders(Array.isArray(data.providers) ? data.providers : []);
      if (data.lastUpdated) setLastUpdated(data.lastUpdated);
    } catch (err: any) {
      console.warn('[RetailSentiment] Fetch error:', err?.message || err);
    } finally {
      setIsLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, []);

  // Initial load and periodic polling every 30 seconds
  useEffect(() => {
    fetchSentiment(false);
    const interval = setInterval(() => {
      fetchSentiment(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSentiment]);

  // Fetch symbol history when detail modal opens or timeframe changes
  useEffect(() => {
    if (!selectedItem || selectedItem.notProvided || selectedItem.isUnavailable) {
      setHistoryData([]);
      return;
    }

    let isMounted = true;
    setIsLoadingHistory(true);

    fetch(`/api/sentiment/${encodeURIComponent(selectedItem.symbol)}/history?timeframe=${historyTimeframe}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data) {
          setHistoryData(Array.isArray(data.history) ? data.history : []);
        }
      })
      .catch((err) => {
        console.warn('[RetailSentiment] History fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingHistory(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedItem, historyTimeframe]);

  // Provider statuses
  const cryptoProvider = providers.find((p) => p.id === 'crypto-binance-bybit');
  const myfxbookProvider = providers.find((p) => p.id === 'myfxbook-outlook');

  // Build complete list including "Not provided by this source" placeholders when category is selected
  const allEnrichedItems = useMemo(() => {
    const existingMap = new Map<string, NormalizedSentimentItem>();
    for (const item of items) {
      existingMap.set(item.symbol, item);
    }

    const combined = [...items];

    // If Myfxbook is connected, check if any expected commodities or indices were missing from its payload
    if (myfxbookProvider && myfxbookProvider.status !== 'DISCONNECTED') {
      if (activeCategory === 'COMMODITIES' || activeCategory === 'ALL') {
        for (const sym of COMMODITY_REFERENCE_SYMBOLS) {
          if (!existingMap.has(sym)) {
            combined.push({
              symbol: sym,
              assetClass: 'COMMODITIES',
              longPct: 0,
              shortPct: 0,
              source: 'Myfxbook Community Outlook',
              traderGroup: 'Myfxbook commodity traders',
              disclaimer: 'Free data, may be delayed up to 60 minutes.',
              sourceUrl: 'https://www.myfxbook.com/api/get-community-outlook.json',
              fetchedAt: myfxbookProvider.lastSuccessTime || Date.now(),
              timestamp: myfxbookProvider.lastSuccessTime || Date.now(),
              notProvided: true,
            });
          }
        }
      }

      if (activeCategory === 'INDICES' || activeCategory === 'ALL') {
        for (const sym of INDEX_REFERENCE_SYMBOLS) {
          if (!existingMap.has(sym)) {
            combined.push({
              symbol: sym,
              assetClass: 'INDICES',
              longPct: 0,
              shortPct: 0,
              source: 'Myfxbook Community Outlook',
              traderGroup: 'Myfxbook index traders',
              disclaimer: 'Free data, may be delayed up to 60 minutes.',
              sourceUrl: 'https://www.myfxbook.com/api/get-community-outlook.json',
              fetchedAt: myfxbookProvider.lastSuccessTime || Date.now(),
              timestamp: myfxbookProvider.lastSuccessTime || Date.now(),
              notProvided: true,
            });
          }
        }
      }
    }

    return combined;
  }, [items, myfxbookProvider, activeCategory]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = [...allEnrichedItems];

    // Filter by category
    if (activeCategory !== 'ALL') {
      result = result.filter((item) => item.assetClass === activeCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toUpperCase();
      result = result.filter(
        (item) =>
          item.symbol.toUpperCase().includes(query) ||
          formatSymbol(item.symbol).toUpperCase().includes(query) ||
          item.source.toUpperCase().includes(query) ||
          (item.traderGroup && item.traderGroup.toUpperCase().includes(query))
      );
    }

    // Sort items
    result.sort((a, b) => {
      // Put notProvided items at the bottom
      if (a.notProvided && !b.notProvided) return 1;
      if (!a.notProvided && b.notProvided) return -1;

      if (sortBy === 'MOST_LONG') {
        return b.longPct - a.longPct;
      }
      if (sortBy === 'MOST_SHORT') {
        return b.shortPct - a.shortPct;
      }
      if (sortBy === 'MOST_EXTREME') {
        const extremeA = Math.abs(a.longPct - 50);
        const extremeB = Math.abs(b.longPct - 50);
        return extremeB - extremeA;
      }
      if (sortBy === 'ALPHABETICAL') {
        return a.symbol.localeCompare(b.symbol);
      }
      return 0;
    });

    return result;
  }, [allEnrichedItems, activeCategory, searchQuery, sortBy]);

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* HEADER SECTION */}
      <div className="bg-[#0c121e] border border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Market Sentiment: Retail Positioning</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                    Contrarian Context
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real retail long vs. short account ratios. Zero simulated numbers. Verified by provider Data Audit.
                </p>
              </div>
            </div>
          </div>

          {/* Top Right Controls & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Last updated indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Last updated {timeAgo(lastUpdated)}</span>
            </div>

            {/* Refresh button (reads from server cache) */}
            <button
              onClick={() => fetchSentiment(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Refresh sentiment snapshot from server cache"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Reading Cache...' : 'Refresh'}</span>
            </button>

            {/* View Mode Toggle */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-900/90 border border-slate-800">
              <button
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'LIST'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Rows</span>
              </button>
              <button
                onClick={() => setViewMode('HEATMAP')}
                className={`p-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'HEATMAP'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Heatmap matrix"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Heatmap</span>
              </button>
            </div>
          </div>
        </div>

        {/* DATA STATUS INDICATORS BAR */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Data Status:
            </span>

            {/* Crypto Provider Pill (Binance Futures / Bybit) */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px]">
              <span className="text-slate-400 font-medium">Crypto (Binance / Bybit):</span>
              {cryptoProvider?.status === 'LIVE' ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live ({timeAgo(cryptoProvider.lastSuccessTime)})
                </span>
              ) : cryptoProvider?.status === 'STALE' ? (
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Stale
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Down
                </span>
              )}
            </div>

            {/* Forex, Commodities & Indices Provider Pill (Myfxbook) */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-[11px]">
              <span className="text-slate-400 font-medium">Forex, Commodities & Indices (Myfxbook):</span>
              {myfxbookProvider?.status === 'LIVE' ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Live ({timeAgo(myfxbookProvider.lastSuccessTime)})
                </span>
              ) : myfxbookProvider?.status === 'STALE' ? (
                <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Stale
                </span>
              ) : myfxbookProvider?.status === 'DISCONNECTED' ? (
                <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Credentials not configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  Down
                </span>
              )}
            </div>
          </div>

          {/* Crowded & Extreme Key */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Crowded ≥70%
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Extreme ≥80%
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & SORT BAR */}
      <div className="bg-[#0c121e] border border-slate-800/90 rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Category Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['ALL', 'FOREX', 'CRYPTO', 'INDICES', 'COMMODITIES'] as FilterCategory[]).map((cat) => {
            const isActive = activeCategory === cat;
            const count =
              cat === 'ALL'
                ? filteredItems.length
                : allEnrichedItems.filter((i) => i.assetClass === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                <span>{cat === 'ALL' ? 'All Instruments' : cat.charAt(0) + cat.slice(1).toLowerCase()}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-cyan-500/30 text-cyan-200' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Dropdown */}
        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search symbol..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="MOST_EXTREME" className="bg-slate-900 text-white">Sort: Most Extreme Skew</option>
              <option value="MOST_LONG" className="bg-slate-900 text-white">Sort: Most Long %</option>
              <option value="MOST_SHORT" className="bg-slate-900 text-white">Sort: Most Short %</option>
              <option value="ALPHABETICAL" className="bg-slate-900 text-white">Sort: A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* SKELETON LOADER */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-[#0c121e] border border-slate-800/80 rounded-xl p-4 animate-pulse flex items-center justify-between"
            >
              <div className="space-y-2 w-1/4">
                <div className="h-4 bg-slate-800 rounded w-20" />
                <div className="h-2.5 bg-slate-800/60 rounded w-32" />
              </div>
              <div className="h-7 bg-slate-800 rounded w-1/2" />
              <div className="h-4 bg-slate-800 rounded w-20" />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE WHEN SOURCE DISCONNECTED */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="bg-[#0c121e] border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
            <Info className="w-6 h-6" />
          </div>
          {myfxbookProvider?.status === 'DISCONNECTED' && (activeCategory === 'FOREX' || activeCategory === 'COMMODITIES' || activeCategory === 'INDICES') ? (
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-white">
                {activeCategory === 'FOREX' ? 'Forex' : activeCategory === 'COMMODITIES' ? 'Commodities' : 'Indices'} sentiment source not connected
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Positioning for {activeCategory.toLowerCase()} is sourced strictly from Myfxbook Community Outlook.
                Configure <code className="text-cyan-400 font-mono bg-slate-900 px-1 py-0.5 rounded">MYFXBOOK_EMAIL</code> and{' '}
                <code className="text-cyan-400 font-mono bg-slate-900 px-1 py-0.5 rounded">MYFXBOOK_PASSWORD</code> in environment variables.
                In accordance with strict data integrity rules, no mock or hardcoded numbers are displayed.
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-base font-bold text-white">No instruments found</h3>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? `No sentiment records match "${searchQuery}". Try clearing your search query.`
                  : 'No active sentiment records available in this category.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* LIST / ROWS VIEW */}
      {!isLoading && viewMode === 'LIST' && filteredItems.length > 0 && (
        <div className="space-y-2.5">
          {filteredItems.map((item) => {
            const isCrowded = !item.notProvided && (item.longPct >= 70 || item.shortPct >= 70);
            const isExtreme = !item.notProvided && (item.longPct >= 80 || item.shortPct >= 80);
            const isBullishSkew = item.longPct > item.shortPct;

            return (
              <div
                key={item.symbol}
                onClick={() => {
                  if (!item.notProvided) setSelectedItem(item);
                }}
                className={`group bg-[#0c121e] hover:bg-[#111928] border border-slate-800/90 hover:border-slate-700/90 rounded-xl p-3.5 transition-all shadow-sm ${
                  item.notProvided ? 'opacity-70 cursor-default' : 'cursor-pointer hover:shadow-md'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  {/* Left Column: Symbol & Identifiers */}
                  <div className="flex items-center gap-3 min-w-[240px]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white font-mono group-hover:text-cyan-300 transition">
                          {formatSymbol(item.symbol)}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {item.assetClass}
                        </span>

                        {/* Extreme / Crowded Badges */}
                        {isExtreme ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse">
                            Extreme
                          </span>
                        ) : isCrowded ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Crowded
                          </span>
                        ) : null}

                        {/* Staleness Badge */}
                        {item.isStale && !item.isUnavailable && !item.notProvided && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Stale
                          </span>
                        )}
                      </div>

                      {/* Required Labels: Source name, trader group, and updated time */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="text-slate-300 font-medium">{item.source}</span>
                        <span>•</span>
                        <span className="text-cyan-400/90 font-medium">{item.traderGroup}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400">
                          updated {timeAgo(item.fetchedAt || item.timestamp)}
                        </span>
                      </div>

                      {/* Myfxbook Specific Delay Disclaimer Label */}
                      {item.disclaimer && (
                        <div className="text-[10px] text-slate-500 font-mono italic">
                          {item.disclaimer}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Horizontal Long/Short Split Bar or Not Provided / Unavailable */}
                  <div className="flex-1 max-w-xl">
                    {item.notProvided ? (
                      <div className="py-2 px-3 text-center text-xs font-mono text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg">
                        Not provided by this source
                      </div>
                    ) : item.isUnavailable ? (
                      <div className="py-2 px-3 text-center text-xs font-mono text-rose-400/90 bg-rose-950/20 border border-rose-900/30 rounded-lg">
                        Unavailable (data older than 1 hour)
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono font-bold">
                          <span className="text-emerald-400 flex items-center gap-1">
                            <span>Long {item.longPct}%</span>
                            {isBullishSkew && item.longPct >= 65 && (
                              <span className="text-[10px] px-1 rounded bg-emerald-500/20 text-emerald-300">
                                Skew
                              </span>
                            )}
                          </span>
                          <span className="text-rose-400 flex items-center gap-1">
                            {!isBullishSkew && item.shortPct >= 65 && (
                              <span className="text-[10px] px-1 rounded bg-rose-500/20 text-rose-300">
                                Skew
                              </span>
                            )}
                            <span>Short {item.shortPct}%</span>
                          </span>
                        </div>

                        {/* Bar Container */}
                        <div className="h-3 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                          <div
                            style={{ width: `${item.longPct}%` }}
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300"
                            title={`Long: ${item.longPct}%`}
                          />
                          <div
                            style={{ width: `${item.shortPct}%` }}
                            className="h-full bg-gradient-to-r from-rose-500 to-rose-600 transition-all duration-300"
                            title={`Short: ${item.shortPct}%`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: 1-hour change delta & Actions (Data Audit + Chart) */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 min-w-[210px]">
                    {!item.notProvided && !item.isUnavailable && (
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 font-mono uppercase">1h Delta</div>
                        <div className="font-mono text-xs font-bold">
                          {item.change1hPct === undefined ? (
                            <span className="text-slate-500 flex items-center gap-0.5 justify-end">
                              <Minus className="w-3 h-3" />
                              <span>0.0%</span>
                            </span>
                          ) : item.change1hPct > 0 ? (
                            <span className="text-emerald-400 flex items-center gap-0.5 justify-end">
                              <ArrowUp className="w-3 h-3" />
                              <span>+{item.change1hPct.toFixed(1)}%</span>
                            </span>
                          ) : item.change1hPct < 0 ? (
                            <span className="text-rose-400 flex items-center gap-0.5 justify-end">
                              <ArrowDown className="w-3 h-3" />
                              <span>{item.change1hPct.toFixed(1)}%</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-0.5 justify-end">
                              <Minus className="w-3 h-3" />
                              <span>0.0%</span>
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Data Audit Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAuditItem(item);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-mono text-cyan-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                      title="Inspect raw API payload, fetch timestamp, and endpoint URL"
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Data audit</span>
                    </button>

                    {/* Open Detail Panel Button */}
                    {!item.notProvided && (
                      <div className="p-1.5 rounded-lg bg-slate-900 text-slate-400 group-hover:text-cyan-300 group-hover:bg-cyan-500/10 transition">
                        <BarChart2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* HEATMAP GRID VIEW */}
      {!isLoading && viewMode === 'HEATMAP' && filteredItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filteredItems.map((item) => {
            const isCrowded = !item.notProvided && (item.longPct >= 70 || item.shortPct >= 70);
            const isExtreme = !item.notProvided && (item.longPct >= 80 || item.shortPct >= 80);

            // Compute background color based on skew
            let cardBg = 'bg-slate-900/80 border-slate-800';
            if (item.notProvided) {
              cardBg = 'bg-slate-950/40 border-slate-800/50 text-slate-500';
            } else if (item.longPct >= 75) {
              cardBg = 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200';
            } else if (item.longPct >= 60) {
              cardBg = 'bg-emerald-950/25 border-emerald-600/30 text-emerald-300';
            } else if (item.shortPct >= 75) {
              cardBg = 'bg-rose-950/50 border-rose-500/40 text-rose-200';
            } else if (item.shortPct >= 60) {
              cardBg = 'bg-rose-950/25 border-rose-600/30 text-rose-300';
            }

            return (
              <div
                key={item.symbol}
                onClick={() => {
                  if (!item.notProvided) setSelectedItem(item);
                }}
                className={`p-3 rounded-xl border transition-all shadow-sm flex flex-col justify-between ${cardBg} ${
                  item.notProvided ? 'opacity-60 cursor-default' : 'cursor-pointer hover:scale-[1.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono text-xs text-white">
                    {formatSymbol(item.symbol)}
                  </span>
                  {item.notProvided ? (
                    <span className="text-[9px] text-slate-500 font-mono">N/A</span>
                  ) : isExtreme ? (
                    <span className="text-[9px] font-bold px-1 rounded bg-purple-500/30 text-purple-200 border border-purple-500/40">
                      EXTREME
                    </span>
                  ) : isCrowded ? (
                    <span className="text-[9px] font-bold px-1 rounded bg-amber-500/30 text-amber-200 border border-amber-500/40">
                      CROWD
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 font-mono">
                      {item.assetClass}
                    </span>
                  )}
                </div>

                <div className="my-2 space-y-1">
                  {item.notProvided ? (
                    <div className="text-[10px] text-slate-500 font-mono text-center py-1">
                      Not provided
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                        <span className="text-emerald-400">{item.longPct}% L</span>
                        <span className="text-rose-400">{item.shortPct}% S</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                        <div style={{ width: `${item.longPct}%` }} className="bg-emerald-500" />
                        <div style={{ width: `${item.shortPct}%` }} className="bg-rose-500" />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                  <span className="truncate max-w-[70px]">{item.source.replace('Futures', '')}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAuditItem(item);
                    }}
                    className="text-cyan-400 hover:text-white underline text-[9px] cursor-pointer"
                  >
                    Audit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DATA AUDIT MODAL */}
      {auditItem && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0b101b] border border-cyan-500/40 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-mono">
                    <span>Data Audit: {formatSymbol(auditItem.symbol)}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {auditItem.assetClass}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Authentic raw payload, API endpoint, and fetch timestamp verification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditItem(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Verification Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Source Name</div>
                <div className="text-white font-bold">{auditItem.source}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Trader Group</div>
                <div className="text-cyan-300 font-bold">{auditItem.traderGroup}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 sm:col-span-2">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Source Endpoint URL</div>
                <div className="text-slate-300 break-all select-all text-[11px] bg-slate-950 p-2 rounded border border-slate-800/80">
                  {auditItem.sourceUrl || 'https://fapi.binance.com/futures/data/globalLongShortAccountRatio'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Fetch Timestamp</div>
                <div className="text-white">
                  {new Date(auditItem.fetchedAt || auditItem.timestamp).toISOString()}
                </div>
                <div className="text-[10px] text-slate-400">
                  ({timeAgo(auditItem.fetchedAt || auditItem.timestamp)})
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Validation Status</div>
                {auditItem.notProvided ? (
                  <div className="text-amber-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Not returned by API response</span>
                  </div>
                ) : (
                  <div className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Valid (Sum: {(auditItem.longPct + auditItem.shortPct).toFixed(1)}%)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Raw API Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="font-bold uppercase tracking-wider text-[10px]">
                  Raw API Payload (Unmanipulated JSON)
                </span>
                <span className="text-[10px] text-cyan-400">Direct Upstream Response</span>
              </div>
              <pre className="bg-[#050811] border border-slate-800 rounded-xl p-3 text-[11px] text-emerald-300 font-mono overflow-x-auto max-h-48 leading-relaxed">
                {auditItem.rawPayload
                  ? JSON.stringify(auditItem.rawPayload, null, 2)
                  : auditItem.notProvided
                  ? JSON.stringify({ status: 'OMITTED_BY_PROVIDER', message: 'Symbol was not included in provider response list' }, null, 2)
                  : JSON.stringify({
                      symbol: auditItem.symbol,
                      longPct: auditItem.longPct,
                      shortPct: auditItem.shortPct,
                      source: auditItem.source,
                      timestamp: auditItem.timestamp,
                    }, null, 2)}
              </pre>
            </div>

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setAuditItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL PANEL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0b101b] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-5 sm:p-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>{formatSymbol(selectedItem.symbol)}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {selectedItem.assetClass}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Source: {selectedItem.source} • Trader group: {selectedItem.traderGroup} • Updated {timeAgo(selectedItem.fetchedAt || selectedItem.timestamp)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Long / Short Split Breakdown */}
            <div className="bg-[#0f172a]/90 border border-slate-800/90 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Current Positioning Split
                </span>
                <div className="flex items-center gap-1.5">
                  {selectedItem.longPct >= 80 || selectedItem.shortPct >= 80 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Extreme Positioning
                    </span>
                  ) : selectedItem.longPct >= 70 || selectedItem.shortPct >= 70 ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Crowded Side
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      Balanced
                    </span>
                  )}
                </div>
              </div>

              {/* Numbers Display */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400 font-mono uppercase font-bold">Long Accounts</div>
                  <div className="text-2xl font-black text-emerald-300 font-mono mt-0.5">
                    {selectedItem.longPct}%
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30">
                  <div className="text-[10px] text-rose-400 font-mono uppercase font-bold">Short Accounts</div>
                  <div className="text-2xl font-black text-rose-300 font-mono mt-0.5">
                    {selectedItem.shortPct}%
                  </div>
                </div>
              </div>

              {/* Large Split Bar */}
              <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                <div
                  style={{ width: `${selectedItem.longPct}%` }}
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                />
                <div
                  style={{ width: `${selectedItem.shortPct}%` }}
                  className="h-full bg-gradient-to-r from-rose-500 to-rose-600"
                />
              </div>
            </div>

            {/* Historical Trend Chart Section */}
            <div className="bg-[#0f172a]/90 border border-slate-800/90 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Long % Historical Trend
                  </h3>
                  <p className="text-[11px] text-slate-400">Recorded snapshots across 5-minute intervals</p>
                </div>

                {/* Horizon Switcher */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 self-start">
                  {(['24h', '7d', '30d'] as Timeframe[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setHistoryTimeframe(tf)}
                      className={`px-2.5 py-1 text-xs font-mono font-bold rounded-md transition cursor-pointer ${
                        historyTimeframe === tf
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* History Rendering */}
              {isLoadingHistory ? (
                <div className="h-36 flex items-center justify-center text-xs text-slate-500 font-mono">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2 text-cyan-400" />
                  Loading snapshot history...
                </div>
              ) : historyData.length < 2 ? (
                <div className="h-36 flex flex-col items-center justify-center text-center p-4 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <Clock className="w-6 h-6 text-slate-500 mb-1.5" />
                  <p className="text-xs font-bold text-slate-300">History builds over time</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                    Snapshots are appended to storage automatically during each polling cycle to plot 24h, 7d, and 30d trajectories.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* SVG Line Chart */}
                  <div className="h-40 w-full relative pt-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                      {/* 50% Neutral Grid Line */}
                      <line
                        x1="0"
                        y1="60"
                        x2="500"
                        y2="60"
                        stroke="#334155"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      {/* 70% Crowded Long Line */}
                      <line
                        x1="0"
                        y1="24"
                        x2="500"
                        y2="24"
                        stroke="#f59e0b"
                        strokeDasharray="2 2"
                        strokeOpacity="0.4"
                        strokeWidth="0.8"
                      />
                      {/* 30% Crowded Short Line */}
                      <line
                        x1="0"
                        y1="96"
                        x2="500"
                        y2="96"
                        stroke="#f43f5e"
                        strokeDasharray="2 2"
                        strokeOpacity="0.4"
                        strokeWidth="0.8"
                      />

                      {/* Polyline of points */}
                      {(() => {
                        const minTime = historyData[0].timestamp;
                        const maxTime = historyData[historyData.length - 1].timestamp;
                        const timeSpan = Math.max(1, maxTime - minTime);

                        const points = historyData.map((d) => {
                          const x = ((d.timestamp - minTime) / timeSpan) * 500;
                          const y = 120 - (d.longPct / 100) * 120;
                          return `${x.toFixed(1)},${y.toFixed(1)}`;
                        });

                        return (
                          <>
                            <polyline
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={points.join(' ')}
                            />
                            {/* Dots */}
                            {historyData.map((d, idx) => {
                              const x = ((d.timestamp - minTime) / timeSpan) * 500;
                              const y = 120 - (d.longPct / 100) * 120;
                              return (
                                <circle
                                  key={idx}
                                  cx={x}
                                  cy={y}
                                  r="3"
                                  fill="#00f0ff"
                                  className="transition-transform hover:scale-150"
                                />
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
                    <span>{timeAgo(historyData[0].timestamp)}</span>
                    <span className="text-cyan-400 font-bold">
                      {historyData.length} snapshots recorded
                    </span>
                    <span>Latest</span>
                  </div>
                </div>
              )}
            </div>

            {/* Plain-Language Contrarian Educational Note */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/90 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-200">
                  {selectedItem.longPct}% of {selectedItem.source} traders are long.
                </p>
                <p className="text-slate-400 mt-1">
                  Crowded retail positioning is often watched as a contrarian context indicator, but it is not a trade signal.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setAuditItem(selectedItem);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-cyan-300 font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Open Data Audit</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER MANDATORY DISCLAIMER */}
      <div className="bg-[#0c121e]/60 border border-slate-800/60 rounded-xl p-3 text-center text-xs text-slate-400 leading-relaxed font-mono">
        Retail sentiment reflects a sample of traders from the named source, not the whole market. Context only. Not financial advice.
      </div>
    </div>
  );
};

export default RetailSentimentView;
