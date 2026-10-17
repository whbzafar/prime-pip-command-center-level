import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Search,
  RefreshCw,
  Clock,
  Layers,
  Database,
  ShieldCheck,
  Compass,
  DollarSign,
  Maximize2,
  Calendar,
  Filter,
  ArrowRight,
  BookOpen,
  Calculator,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { LiveAnalysisChart } from '../charts/LiveAnalysisChart';
import {
  LiveCandle,
  fetchLiveChartCandles,
  connectBinanceWebSocket,
} from '../../services/liveChartDataService';
import { AccountSettings, Trade } from '../../types';

interface UnlimitedChartAnalysisProps {
  activeAccount: AccountSettings | null;
  onOpenNewTrade?: (prefill?: Partial<Trade>) => void;
  onNavigateToTab?: (tab: string) => void;
}

interface InstrumentOption {
  symbol: string;
  name: string;
  category: 'FOREX_MAJOR' | 'FOREX_CROSS' | 'COMMODITIES' | 'CRYPTO';
  flag: string;
  type: string;
}

const INSTRUMENT_DIRECTORY: InstrumentOption[] = [
  // Forex Majors
  { symbol: 'EURUSD', name: 'EUR / USD', category: 'FOREX_MAJOR', flag: '🇪🇺 🇺🇸', type: 'Forex Major' },
  { symbol: 'GBPUSD', name: 'GBP / USD', category: 'FOREX_MAJOR', flag: '🇬🇧 🇺🇸', type: 'Forex Major' },
  { symbol: 'USDJPY', name: 'USD / JPY', category: 'FOREX_MAJOR', flag: '🇺🇸 🇯🇵', type: 'Forex Major' },
  { symbol: 'AUDUSD', name: 'AUD / USD', category: 'FOREX_MAJOR', flag: '🇦🇺 🇺🇸', type: 'Forex Major' },
  { symbol: 'USDCAD', name: 'USD / CAD', category: 'FOREX_MAJOR', flag: '🇺🇸 🇨🇦', type: 'Forex Major' },
  { symbol: 'USDCHF', name: 'USD / CHF', category: 'FOREX_MAJOR', flag: '🇺🇸 🇨🇭', type: 'Forex Major' },
  { symbol: 'NZDUSD', name: 'NZD / USD', category: 'FOREX_MAJOR', flag: '🇳🇿 🇺🇸', type: 'Forex Major' },

  // Forex Crosses
  { symbol: 'EURGBP', name: 'EUR / GBP', category: 'FOREX_CROSS', flag: '🇪🇺 🇬🇧', type: 'Forex Cross' },
  { symbol: 'GBPJPY', name: 'GBP / JPY', category: 'FOREX_CROSS', flag: '🇬🇧 🇯🇵', type: 'Forex Cross' },
  { symbol: 'EURJPY', name: 'EUR / JPY', category: 'FOREX_CROSS', flag: '🇪🇺 🇯🇵', type: 'Forex Cross' },
  { symbol: 'AUDJPY', name: 'AUD / JPY', category: 'FOREX_CROSS', flag: '🇦🇺 🇯🇵', type: 'Forex Cross' },
  { symbol: 'CADJPY', name: 'CAD / JPY', category: 'FOREX_CROSS', flag: '🇨🇦 🇯🇵', type: 'Forex Cross' },
  { symbol: 'GBPAUD', name: 'GBP / AUD', category: 'FOREX_CROSS', flag: '🇬🇧 🇦🇺', type: 'Forex Cross' },
  { symbol: 'EURAUD', name: 'EUR / AUD', category: 'FOREX_CROSS', flag: '🇪🇺 🇦🇺', type: 'Forex Cross' },

  // Commodities
  { symbol: 'XAUUSD', name: 'Gold / USD', category: 'COMMODITIES', flag: '🥇', type: 'Precious Metal' },
  { symbol: 'XAGUSD', name: 'Silver / USD', category: 'COMMODITIES', flag: '🥈', type: 'Precious Metal' },

  // Crypto
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', category: 'CRYPTO', flag: '₿', type: 'Crypto' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT', category: 'CRYPTO', flag: 'Ξ', type: 'Crypto' },
  { symbol: 'SOLUSDT', name: 'Solana / USDT', category: 'CRYPTO', flag: '◎', type: 'Crypto' },
  { symbol: 'BNBUSDT', name: 'BNB / USDT', category: 'CRYPTO', flag: '🟡', type: 'Crypto' },
  { symbol: 'XRPUSDT', name: 'XRP / USDT', category: 'CRYPTO', flag: '✕', type: 'Crypto' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin / USDT', category: 'CRYPTO', flag: '🐕', type: 'Crypto' },
  { symbol: 'ADAUSDT', name: 'Cardano / USDT', category: 'CRYPTO', flag: '₳', type: 'Crypto' },
];

const TIMEFRAMES = [
  { id: 'M1', label: '1m', desc: '1 Minute Scalp' },
  { id: 'M5', label: '5m', desc: '5 Minutes Momentum' },
  { id: 'M15', label: '15m', desc: '15 Minutes Execution' },
  { id: 'M30', label: '30m', desc: '30 Minutes Structure' },
  { id: 'H1', label: '1h', desc: '1 Hour Key Levels' },
  { id: 'H4', label: '4h', desc: '4 Hours Macro Trend' },
  { id: 'D1', label: '1D', desc: 'Daily Session' },
  { id: 'W1', label: '1W', desc: 'Weekly Overview' },
];

export const UnlimitedChartAnalysis: React.FC<UnlimitedChartAnalysisProps> = ({
  activeAccount,
  onOpenNewTrade,
  onNavigateToTab,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('M15');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FOREX_MAJOR' | 'FOREX_CROSS' | 'CRYPTO' | 'COMMODITIES'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [candles, setCandles] = useState<LiveCandle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>(Date.now());
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(10); // 10s default polling for forex
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);

  // Quick Watchlist Drawer
  const [pinnedSymbols, setPinnedSymbols] = useState<string[]>(['EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSDT', 'ETHUSDT']);

  // Fetch candles
  const loadCandles = useCallback(
    async (sym: string, tf: string, isSilent: boolean = false) => {
      if (!isSilent) setIsLoading(true);
      try {
        const res = await fetchLiveChartCandles(sym, tf, 350);
        if (res.ok && res.candles.length > 0) {
          setCandles(res.candles);
          setDataSource(res.source);
          setLastRefreshedAt(Date.now());
        }
      } catch (err) {
        console.warn('[UNLIMITED CHARTS] Fetch error:', err);
      } finally {
        if (!isSilent) setIsLoading(false);
      }
    },
    []
  );

  // Reload when symbol or timeframe changes
  useEffect(() => {
    loadCandles(selectedSymbol, selectedTimeframe, false);
  }, [selectedSymbol, selectedTimeframe, loadCandles]);

  // Connect live WebSocket if Crypto
  useEffect(() => {
    const isCrypto =
      selectedSymbol.includes('BTC') ||
      selectedSymbol.includes('ETH') ||
      selectedSymbol.includes('SOL') ||
      selectedSymbol.includes('BNB') ||
      selectedSymbol.includes('XRP') ||
      selectedSymbol.includes('DOGE') ||
      selectedSymbol.includes('ADA') ||
      selectedSymbol.endsWith('USDT');

    if (!isCrypto) {
      setIsLiveStreaming(false);
      return;
    }

    setIsLiveStreaming(true);
    const disconnectWs = connectBinanceWebSocket(selectedSymbol, selectedTimeframe, (updatedCandle) => {
      setCandles((prev) => {
        if (prev.length === 0) return [updatedCandle];
        const last = prev[prev.length - 1];
        if (last.time === updatedCandle.time) {
          // Update current candle in real-time
          const next = [...prev];
          next[next.length - 1] = updatedCandle;
          return next;
        } else if (updatedCandle.time > last.time) {
          // New candle closed
          return [...prev.slice(-349), updatedCandle];
        }
        return prev;
      });
      setLastRefreshedAt(Date.now());
    });

    return () => {
      disconnectWs();
      setIsLiveStreaming(false);
    };
  }, [selectedSymbol, selectedTimeframe]);

  // Auto-refresh interval polling for Forex pairs (respecting rate limits)
  useEffect(() => {
    const isCrypto =
      selectedSymbol.includes('BTC') ||
      selectedSymbol.includes('ETH') ||
      selectedSymbol.includes('SOL') ||
      selectedSymbol.includes('BNB') ||
      selectedSymbol.includes('XRP') ||
      selectedSymbol.includes('DOGE') ||
      selectedSymbol.includes('ADA') ||
      selectedSymbol.endsWith('USDT');

    if (isCrypto || autoRefreshSec <= 0) return;

    const interval = setInterval(() => {
      loadCandles(selectedSymbol, selectedTimeframe, true);
    }, autoRefreshSec * 1000);

    return () => clearInterval(interval);
  }, [selectedSymbol, selectedTimeframe, autoRefreshSec, loadCandles]);

  // Filtered Instrument List
  const filteredInstruments = useMemo(() => {
    return INSTRUMENT_DIRECTORY.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [categoryFilter, searchQuery]);

  const activeMeta = useMemo(() => {
    return INSTRUMENT_DIRECTORY.find((i) => i.symbol === selectedSymbol) || {
      symbol: selectedSymbol,
      name: selectedSymbol,
      flag: '🌐',
      type: 'Asset',
    };
  }, [selectedSymbol]);

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const clean = searchQuery.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setSelectedSymbol(clean);
  };

  return (
    <div className="w-full space-y-4 pb-12 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. TOP HEADER & TELEMETRY HUD */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0a1226]/95 to-slate-900/90 border border-cyan-500/30 p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                  <span>UNLIMITED CHART ANALYSIS</span>
                  <span className="text-[10px] uppercase font-mono-code px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
                    UNRESTRICTED ACCESS
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Free-tier live price charts across Forex &amp; Crypto feeds</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-300">No pair caps • No time limits • Instant switching cache</span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Provider Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono-code">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">DATA FEED:</span>
              <span className="text-white font-bold uppercase">
                {dataSource === 'cache'
                  ? 'Memory Cache (0ms)'
                  : dataSource === 'twelve_data'
                  ? 'Twelve Data Free Tier'
                  : dataSource.includes('binance')
                  ? 'Binance Public Stream'
                  : 'Live Market Feed'}
              </span>
            </div>

            {onOpenNewTrade && (
              <button
                onClick={() =>
                  onOpenNewTrade({
                    instrument: selectedSymbol,
                    entryPrice: candles[candles.length - 1]?.close,
                  })
                }
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-500/20"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>TRADE THIS PAIR</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. INSTRUMENT QUICK PIN STRIP */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono-code">
          <span className="text-slate-500 text-[10px] font-bold uppercase mr-1 shrink-0">PINNED:</span>
          {pinnedSymbols.map((sym) => {
            const isSelected = selectedSymbol === sym;
            const meta = INSTRUMENT_DIRECTORY.find((i) => i.symbol === sym);
            return (
              <button
                key={sym}
                onClick={() => setSelectedSymbol(sym)}
                className={`px-3 py-1 rounded-xl border font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                    : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span>{meta?.flag || '🌐'}</span>
                <span>{sym}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTROLS BAR: CATEGORY FILTER, TIMEFRAME SELECTOR & AUTO-REFRESH */}
      <div className="rounded-2xl bg-[#081024]/90 border border-slate-800 p-3 shadow-lg flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono-code">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'ALL' as const, label: 'All Pairs' },
            { id: 'FOREX_MAJOR' as const, label: 'Forex Majors' },
            { id: 'FOREX_CROSS' as const, label: 'Crosses' },
            { id: 'COMMODITIES' as const, label: 'Commodities' },
            { id: 'CRYPTO' as const, label: 'Crypto' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer shrink-0 ${
                categoryFilter === cat.id
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Timeframe Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setSelectedTimeframe(tf.id)}
              title={tf.desc}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer text-xs ${
                selectedTimeframe === tf.id
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Refresh & Polling Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 text-[11px]">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-500">POLL:</span>
            {[5, 10, 30].map((sec) => (
              <button
                key={sec}
                onClick={() => setAutoRefreshSec(sec)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  autoRefreshSec === sec ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          <button
            onClick={() => loadCandles(selectedSymbol, selectedTimeframe, false)}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 transition cursor-pointer"
            title="Refresh Live Chart"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE: CHART VIEWPORT (4 COLS) + PAIR DIRECTORY (1 COL) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart Column (3 cols on large screen) */}
        <div className="lg:col-span-3 space-y-3">
          <LiveAnalysisChart
            candles={candles}
            symbol={selectedSymbol}
            timeframe={selectedTimeframe}
            isLiveStreaming={isLiveStreaming}
            onOpenTradeModal={(price) => {
              if (onOpenNewTrade) {
                onOpenNewTrade({
                  instrument: selectedSymbol,
                  entryPrice: price,
                });
              }
            }}
          />

          {/* Bottom Utility Bar: Direct Links to Other Modules */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between gap-3 text-xs font-mono-code flex-wrap">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full-Spectrum Free-Tier Analytical Environment. No limitations.</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onNavigateToTab && (
                <>
                  <button
                    onClick={() => onNavigateToTab('PRE_TRADE_PLAN')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition cursor-pointer text-[11px]"
                  >
                    Open in Pre-Trade Plan →
                  </button>
                  <button
                    onClick={() => onNavigateToTab('LOT_SIZE')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition cursor-pointer text-[11px]"
                  >
                    Calculate Lot Size →
                  </button>
                  <button
                    onClick={() => onNavigateToTab('JOURNAL')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition cursor-pointer text-[11px]"
                  >
                    Trade Journal →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pair Directory & Search Sidebar (1 col) */}
        <div className="rounded-2xl bg-[#070d1e] border border-slate-800 p-3 shadow-xl flex flex-col h-[560px]">
          {/* Search Header */}
          <form onSubmit={handleCustomSearchSubmit} className="mb-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search or enter symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono-code text-white outline-none focus:border-cyan-400 uppercase"
              />
            </div>
          </form>

          {/* Instrument List Scroll View */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1 pr-0.5">
            {filteredInstruments.map((item) => {
              const isSelected = selectedSymbol === item.symbol;
              return (
                <button
                  key={item.symbol}
                  onClick={() => setSelectedSymbol(item.symbol)}
                  className={`w-full p-2.5 rounded-xl border text-left font-mono-code transition flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-slate-950/70 hover:bg-slate-900 border-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.flag}</span>
                    <div>
                      <div className="font-bold text-xs leading-none">{item.symbol}</div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                        {item.name}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                      isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {item.type.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
