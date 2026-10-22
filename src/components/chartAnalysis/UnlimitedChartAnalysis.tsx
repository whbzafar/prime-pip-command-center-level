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
  Download,
  Play,
  Share2,
  Sliders,
  ExternalLink,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { LiveAnalysisChart } from '../charts/LiveAnalysisChart';
import {
  LiveCandle,
  fetchLiveChartCandles,
  connectBinanceWebSocket,
  DukascopyQuoteData,
  fetchDukascopyRealtimeQuote,
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
  category: 'FOREX_MAJOR' | 'FOREX_CROSS' | 'COMMODITIES' | 'INDICES' | 'CRYPTO' | 'STOCKS';
  flag: string;
  type: string;
}

export const INSTRUMENT_DIRECTORY: InstrumentOption[] = [
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
  { symbol: 'CHFJPY', name: 'CHF / JPY', category: 'FOREX_CROSS', flag: '🇨🇭 🇯🇵', type: 'Forex Cross' },
  { symbol: 'NZDJPY', name: 'NZD / JPY', category: 'FOREX_CROSS', flag: '🇳🇿 🇯🇵', type: 'Forex Cross' },
  { symbol: 'GBPAUD', name: 'GBP / AUD', category: 'FOREX_CROSS', flag: '🇬🇧 🇦🇺', type: 'Forex Cross' },
  { symbol: 'GBPCAD', name: 'GBP / CAD', category: 'FOREX_CROSS', flag: '🇬🇧 🇨🇦', type: 'Forex Cross' },
  { symbol: 'GBPCHF', name: 'GBP / CHF', category: 'FOREX_CROSS', flag: '🇬🇧 🇨🇭', type: 'Forex Cross' },
  { symbol: 'GBPNZD', name: 'GBP / NZD', category: 'FOREX_CROSS', flag: '🇬🇧 🇳🇿', type: 'Forex Cross' },
  { symbol: 'EURAUD', name: 'EUR / AUD', category: 'FOREX_CROSS', flag: '🇪🇺 🇦🇺', type: 'Forex Cross' },
  { symbol: 'EURCAD', name: 'EUR / CAD', category: 'FOREX_CROSS', flag: '🇪🇺 🇨🇦', type: 'Forex Cross' },
  { symbol: 'EURCHF', name: 'EUR / CHF', category: 'FOREX_CROSS', flag: '🇪🇺 🇨🇭', type: 'Forex Cross' },
  { symbol: 'EURNZD', name: 'EUR / NZD', category: 'FOREX_CROSS', flag: '🇪🇺 🇳🇿', type: 'Forex Cross' },
  { symbol: 'AUDCAD', name: 'AUD / CAD', category: 'FOREX_CROSS', flag: '🇦🇺 🇨🇦', type: 'Forex Cross' },
  { symbol: 'AUDCHF', name: 'AUD / CHF', category: 'FOREX_CROSS', flag: '🇦🇺 🇨🇭', type: 'Forex Cross' },
  { symbol: 'AUDNZD', name: 'AUD / NZD', category: 'FOREX_CROSS', flag: '🇦🇺 🇳🇿', type: 'Forex Cross' },
  { symbol: 'CADCHF', name: 'CAD / CHF', category: 'FOREX_CROSS', flag: '🇨🇦 🇨🇭', type: 'Forex Cross' },
  { symbol: 'NZDCAD', name: 'NZD / CAD', category: 'FOREX_CROSS', flag: '🇳🇿 🇨🇦', type: 'Forex Cross' },
  { symbol: 'NZDCHF', name: 'NZD / CHF', category: 'FOREX_CROSS', flag: '🇳🇿 🇨🇭', type: 'Forex Cross' },

  // Commodities
  { symbol: 'XAUUSD', name: 'Gold / USD', category: 'COMMODITIES', flag: '🥇', type: 'Precious Metal' },
  { symbol: 'XAGUSD', name: 'Silver / USD', category: 'COMMODITIES', flag: '🥈', type: 'Precious Metal' },
  { symbol: 'USOIL', name: 'Crude Oil (WTI)', category: 'COMMODITIES', flag: '🛢️', type: 'Energy' },
  { symbol: 'BRENT', name: 'Brent Crude Oil', category: 'COMMODITIES', flag: '⛽', type: 'Energy' },
  { symbol: 'COPPER', name: 'Copper High Grade', category: 'COMMODITIES', flag: '🧱', type: 'Metal' },
  { symbol: 'NATGAS', name: 'Natural Gas', category: 'COMMODITIES', flag: '🔥', type: 'Energy' },

  // Indices
  { symbol: 'US30', name: 'Dow Jones 30', category: 'INDICES', flag: '🇺🇸', type: 'Equity Index' },
  { symbol: 'NAS100', name: 'Nasdaq 100', category: 'INDICES', flag: '🇺🇸', type: 'Equity Index' },
  { symbol: 'SPX500', name: 'S&P 500', category: 'INDICES', flag: '🇺🇸', type: 'Equity Index' },
  { symbol: 'GER40', name: 'DAX 40', category: 'INDICES', flag: '🇩🇪', type: 'Equity Index' },
  { symbol: 'UK100', name: 'FTSE 100', category: 'INDICES', flag: '🇬🇧', type: 'Equity Index' },
  { symbol: 'JP225', name: 'Nikkei 225', category: 'INDICES', flag: '🇯🇵', type: 'Equity Index' },

  // Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'STOCKS', flag: '🍎', type: 'Equity' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'STOCKS', flag: '⚡', type: 'Equity' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', category: 'STOCKS', flag: '🟢', type: 'Equity' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', category: 'STOCKS', flag: '💻', type: 'Equity' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'STOCKS', flag: '📦', type: 'Equity' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'STOCKS', flag: '🔍', type: 'Equity' },
  { symbol: 'META', name: 'Meta Platforms', category: 'STOCKS', flag: '🌐', type: 'Equity' },

  // Crypto
  { symbol: 'BTCUSDT', name: 'Bitcoin / USDT', category: 'CRYPTO', flag: '₿', type: 'Crypto' },
  { symbol: 'ETHUSDT', name: 'Ethereum / USDT', category: 'CRYPTO', flag: 'Ξ', type: 'Crypto' },
  { symbol: 'SOLUSDT', name: 'Solana / USDT', category: 'CRYPTO', flag: '◎', type: 'Crypto' },
  { symbol: 'BNBUSDT', name: 'BNB / USDT', category: 'CRYPTO', flag: '🟡', type: 'Crypto' },
  { symbol: 'XRPUSDT', name: 'XRP / USDT', category: 'CRYPTO', flag: '✕', type: 'Crypto' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin / USDT', category: 'CRYPTO', flag: '🐕', type: 'Crypto' },
  { symbol: 'ADAUSDT', name: 'Cardano / USDT', category: 'CRYPTO', flag: '₳', type: 'Crypto' },
];

export const TIMEFRAMES = [
  { id: 'M1', label: '1m', desc: '1 Minute Scalp' },
  { id: 'M3', label: '3m', desc: '3 Minutes Momentum' },
  { id: 'M5', label: '5m', desc: '5 Minutes Intraday' },
  { id: 'M15', label: '15m', desc: '15 Minutes Execution' },
  { id: 'M30', label: '30m', desc: '30 Minutes Structure' },
  { id: 'H1', label: '1h', desc: '1 Hour Key Levels' },
  { id: 'H2', label: '2h', desc: '2 Hours Intermediate' },
  { id: 'H4', label: '4h', desc: '4 Hours Trend Bias' },
  { id: 'D1', label: '1D', desc: 'Daily Session' },
  { id: 'W1', label: '1W', desc: 'Weekly Macro' },
  { id: 'MN1', label: '1M', desc: 'Monthly Multi-Year' },
];

export const HISTORY_DEPTH_OPTIONS = [
  { limit: 350, label: '350 Bars', desc: 'Fast Real-Time Session' },
  { limit: 1000, label: '1,000 Bars', desc: 'Deep Multi-Day Intraday' },
  { limit: 3000, label: '3,000 Bars', desc: 'Multi-Month Swing Scope' },
  { limit: 5000, label: '5,000 Bars', desc: 'Multi-Year Historical Depth' },
  { limit: 10000, label: '10,000+ Bars', desc: 'Maximum Institutional Archive (Decades)' },
];

export const HISTORY_RANGE_PRESETS = [
  { id: '', label: 'Default' },
  { id: '1mo', label: '1 Month' },
  { id: '6mo', label: '6 Months' },
  { id: '1y', label: '1 Year' },
  { id: '2y', label: '2 Years' },
  { id: '5y', label: '5 Years' },
  { id: 'max', label: 'All-Time (Decades)' },
];

export const UnlimitedChartAnalysis: React.FC<UnlimitedChartAnalysisProps> = ({
  activeAccount,
  onOpenNewTrade,
  onNavigateToTab,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('M15');
  const [historyDepth, setHistoryDepth] = useState<number>(350);
  const [historyRange, setHistoryRange] = useState<string>('');
  const [dataProvider, setDataProvider] = useState<'DUKASCOPY' | 'AUTO'>('DUKASCOPY');
  const [chartEngine, setChartEngine] = useState<'NATIVE' | 'TRADINGVIEW'>('NATIVE');
  const [categoryFilter, setCategoryFilter] = useState<
    'ALL' | 'FOREX_MAJOR' | 'FOREX_CROSS' | 'COMMODITIES' | 'INDICES' | 'CRYPTO' | 'STOCKS'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [candles, setCandles] = useState<LiveCandle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('');
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>(Date.now());
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(10);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [dukascopyQuote, setDukascopyQuote] = useState<DukascopyQuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);

  // Quick Watchlist Drawer
  const [pinnedSymbols, setPinnedSymbols] = useState<string[]>([
    'EURUSD',
    'GBPUSD',
    'XAUUSD',
    'US30',
    'BTCUSDT',
    'ETHUSDT',
  ]);

  // Fetch candles
  const loadCandles = useCallback(
    async (
      sym: string,
      tf: string,
      depth: number,
      rangeStr: string,
      providerMode: 'DUKASCOPY' | 'AUTO',
      isSilent: boolean = false
    ) => {
      if (!isSilent) setIsLoading(true);
      try {
        const options: { provider?: string; range?: string } = {};
        if (rangeStr) options.range = rangeStr;
        if (providerMode === 'DUKASCOPY') options.provider = 'dukascopy';

        const res = await fetchLiveChartCandles(sym, tf, depth, options);
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

  // Poll real-time Dukascopy ECN quote for current symbol
  useEffect(() => {
    let active = true;
    const fetchQuote = async () => {
      try {
        const q = await fetchDukascopyRealtimeQuote(selectedSymbol);
        if (active && q) {
          setDukascopyQuote(q);
        }
      } catch (err) {
        // Soft fail
      }
    };

    setQuoteLoading(true);
    fetchQuote().finally(() => {
      if (active) setQuoteLoading(false);
    });

    const interval = setInterval(fetchQuote, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedSymbol]);

  // Reload when symbol, timeframe, depth, range, or provider changes
  useEffect(() => {
    loadCandles(selectedSymbol, selectedTimeframe, historyDepth, historyRange, dataProvider, false);
  }, [selectedSymbol, selectedTimeframe, historyDepth, historyRange, dataProvider, loadCandles]);

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
          const next = [...prev];
          next[next.length - 1] = updatedCandle;
          return next;
        } else if (updatedCandle.time > last.time) {
          return [...prev.slice(-historyDepth + 1), updatedCandle];
        }
        return prev;
      });
      setLastRefreshedAt(Date.now());
    });

    return () => {
      disconnectWs();
      setIsLiveStreaming(false);
    };
  }, [selectedSymbol, selectedTimeframe, historyDepth]);

  // Auto-refresh interval polling for Forex & Commodities
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
      loadCandles(selectedSymbol, selectedTimeframe, historyDepth, historyRange, dataProvider, true);
    }, autoRefreshSec * 1000);

    return () => clearInterval(interval);
  }, [selectedSymbol, selectedTimeframe, historyDepth, historyRange, dataProvider, autoRefreshSec, loadCandles]);

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
    return (
      INSTRUMENT_DIRECTORY.find((i) => i.symbol === selectedSymbol) || {
        symbol: selectedSymbol,
        name: selectedSymbol,
        flag: '🌐',
        type: 'Custom Asset',
        category: 'FOREX_MAJOR' as const,
      }
    );
  }, [selectedSymbol]);

  const handleCustomSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const clean = searchQuery.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setSelectedSymbol(clean);
  };

  // Export historical data as CSV, JSON, or Dukascopy Bank CSV
  const handleExportData = async (format: 'csv' | 'json' | 'dukascopy') => {
    setIsExporting(true);
    try {
      const url =
        format === 'dukascopy'
          ? `/api/dukascopy/export?symbol=${encodeURIComponent(
              selectedSymbol
            )}&timeframe=${encodeURIComponent(selectedTimeframe)}&limit=${historyDepth}`
          : `/api/charts/export?symbol=${encodeURIComponent(
              selectedSymbol
            )}&timeframe=${encodeURIComponent(selectedTimeframe)}&limit=${historyDepth}&format=${format}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export download failed');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${format === 'dukascopy' ? 'dukascopy_' : ''}${selectedSymbol}_${selectedTimeframe}_${historyDepth}bars.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.warn('Export error:', err);
      // Fallback: Client-side CSV export
      let csv = 'DateTime_UTC,Open,High,Low,Close,Volume\n';
      candles.forEach((c) => {
        csv += `${new Date(c.time).toISOString()},${c.open},${c.high},${c.low},${c.close},${c.volume}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const dl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dl;
      a.download = `${selectedSymbol}_${selectedTimeframe}_data.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setIsExporting(false);
    }
  };

  // Launch Bar Replay Backtesting
  const handleLaunchBacktest = () => {
    if (onNavigateToTab) {
      onNavigateToTab('BACKTESTING');
    }
  };

  // TradingView Symbol mapping for widget
  const tradingViewWidgetSymbol = useMemo(() => {
    const sym = selectedSymbol.toUpperCase();
    if (sym === 'EURUSD') return 'FX:EURUSD';
    if (sym === 'GBPUSD') return 'FX:GBPUSD';
    if (sym === 'USDJPY') return 'FX:USDJPY';
    if (sym === 'AUDUSD') return 'FX:AUDUSD';
    if (sym === 'USDCAD') return 'FX:USDCAD';
    if (sym === 'USDCHF') return 'FX:USDCHF';
    if (sym === 'NZDUSD') return 'FX:NZDUSD';
    if (sym === 'XAUUSD' || sym === 'GOLD') return 'OANDA:XAUUSD';
    if (sym === 'XAGUSD') return 'OANDA:XAGUSD';
    if (sym === 'USOIL') return 'TVC:USOIL';
    if (sym === 'US30') return 'BLACKBULL:US30';
    if (sym === 'NAS100') return 'BLACKBULL:NAS100';
    if (sym === 'SPX500') return 'BLACKBULL:SPX500';
    if (sym.includes('BTC')) return 'BINANCE:BTCUSDT';
    if (sym.includes('ETH')) return 'BINANCE:ETHUSDT';
    if (sym.includes('SOL')) return 'BINANCE:SOLUSDT';
    return `FX:${sym}`;
  }, [selectedSymbol]);

  const tradingViewInterval = useMemo(() => {
    const map: Record<string, string> = {
      M1: '1',
      M3: '3',
      M5: '5',
      M15: '15',
      M30: '30',
      H1: '60',
      H2: '120',
      H4: '240',
      D1: 'D',
      W1: 'W',
      MN1: 'M',
    };
    return map[selectedTimeframe] || '15';
  }, [selectedTimeframe]);

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
                    100% FREE &bull; ZERO BAR LIMITS
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap font-mono-code">
                <span>Free Institutional Data: Dukascopy Bank SA &bull; Binance Stream &bull; Yahoo Finance</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-cyan-300">Decades of Historical Depth &bull; Multi-Timeframe Replay</span>
              </p>
            </div>
          </div>

          {/* Quick Actions, Data Source Badge & Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono-code">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400">FEED:</span>
              <span className="text-emerald-400 font-bold uppercase">
                {dataSource === 'cache'
                  ? 'Memory Cache (0ms)'
                  : dataSource === 'dukascopy_bank'
                  ? 'Dukascopy Swiss Bank SA (ECN)'
                  : dataSource === 'yahoo_finance'
                  ? 'Yahoo Finance Exchange Feed'
                  : dataSource === 'binance' || dataSource === 'binance_fx'
                  ? 'Binance Public Stream'
                  : dataSource === 'twelve_data'
                  ? 'Twelve Data'
                  : 'Live Institutional Feed'}
              </span>
            </div>

            {/* Launch Bar Replay Backtesting */}
            <button
              onClick={handleLaunchBacktest}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-mono-code text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Launch Bar Replay Backtesting on this pair"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>BAR REPLAY BACKTEST</span>
            </button>

            {/* Export Standard CSV */}
            <button
              onClick={() => handleExportData('csv')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono-code text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Export historical OHLCV candles to CSV"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>EXPORT CSV</span>
            </button>

            {/* Export Dukascopy Bank CSV */}
            <button
              onClick={() => handleExportData('dukascopy')}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-mono-code text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Export authentic tick/candle history directly from Dukascopy Bank SA"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>DUKASCOPY CSV</span>
            </button>

            {onOpenNewTrade && (
              <button
                onClick={() =>
                  onOpenNewTrade({
                    instrument: selectedSymbol,
                    entryPrice: candles[candles.length - 1]?.close,
                  })
                }
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-500/20 font-mono-code"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>LOG TRADE</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. INSTRUMENT QUICK PIN STRIP */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono-code">
          <span className="text-slate-500 text-[10px] font-bold uppercase mr-1 shrink-0">QUICK WATCHLIST:</span>
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

        {/* 2b. DUKASCOPY SWISS ECN LIVE TICKER BAR */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>🇨🇭 DUKASCOPY SWISS ECN</span>
            </span>
            <span className="text-slate-200 text-[11px] font-bold">{selectedSymbol}</span>

            {dukascopyQuote ? (
              <>
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                  <span className="text-slate-500">BID:</span>
                  <span className="text-slate-200 font-bold">{dukascopyQuote.bid}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                  <span className="text-slate-500">ASK:</span>
                  <span className="text-slate-200 font-bold">{dukascopyQuote.ask}</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                  <span className="text-slate-500">SPREAD:</span>
                  <span className="text-emerald-400 font-bold">{dukascopyQuote.spreadPips} pips</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                  <span className="text-slate-500">24H HIGH:</span>
                  <span className="text-cyan-300">{dukascopyQuote.high}</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                  <span className="text-slate-500">24H LOW:</span>
                  <span className="text-cyan-300">{dukascopyQuote.low}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-950 border border-slate-800 text-slate-400">
                  <span>SESSION:</span>
                  <span className={dukascopyQuote.status === 'LIVE' ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {dukascopyQuote.status}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-slate-500 text-[11px] italic">
                {quoteLoading ? 'Connecting Dukascopy Bank SA ECN stream...' : 'Dukascopy real-time feed connected'}
              </span>
            )}
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <span className="text-emerald-400 font-bold">100% Free Interbank Feed</span>
            <span className="text-slate-600">&bull;</span>
            <span>Geneva, Switzerland &bull; SWX / LD4 ECN</span>
          </div>
        </div>
      </div>

      {/* 3. CONTROLS BAR: CATEGORIES, TIMEFRAME, HISTORICAL DEPTH & ENGINE SWITCH */}
      <div className="rounded-2xl bg-[#081024]/90 border border-slate-800 p-3 shadow-lg flex flex-col xl:flex-row items-center justify-between gap-3 text-xs font-mono-code">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto w-full xl:w-auto">
          {[
            { id: 'ALL' as const, label: 'All' },
            { id: 'FOREX_MAJOR' as const, label: 'Majors' },
            { id: 'FOREX_CROSS' as const, label: 'Crosses' },
            { id: 'COMMODITIES' as const, label: 'Commodities' },
            { id: 'INDICES' as const, label: 'Indices' },
            { id: 'STOCKS' as const, label: 'Stocks' },
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
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setSelectedTimeframe(tf.id)}
              title={tf.desc}
              className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer text-xs shrink-0 ${
                selectedTimeframe === tf.id
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Historical Lookback Depth Selector */}
        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 shrink-0">
          <Layers className="w-3 h-3 text-cyan-400" />
          <span className="text-slate-500 text-[10px]">DEPTH:</span>
          {HISTORY_DEPTH_OPTIONS.map((opt) => (
            <button
              key={opt.limit}
              onClick={() => setHistoryDepth(opt.limit)}
              title={opt.desc}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                historyDepth === opt.limit
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Historical Range Lookback Presets */}
        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-xl border border-slate-800 shrink-0">
          <Calendar className="w-3 h-3 text-emerald-400" />
          <span className="text-slate-500 text-[10px]">RANGE:</span>
          {HISTORY_RANGE_PRESETS.map((rng) => (
            <button
              key={rng.id}
              onClick={() => setHistoryRange(rng.id)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                historyRange === rng.id
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {rng.label}
            </button>
          ))}
        </div>

        {/* Data Feed Provider Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] shrink-0">
          <button
            onClick={() => setDataProvider('DUKASCOPY')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
              dataProvider === 'DUKASCOPY'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Dukascopy Bank SA (Geneva, Switzerland) Direct ECN Feed"
          >
            <span>🇨🇭</span>
            <span>DUKASCOPY ECN</span>
          </button>
          <button
            onClick={() => setDataProvider('AUTO')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              dataProvider === 'AUTO'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Multi-Feed Auto-Failover (Dukascopy + Yahoo Finance + Binance)"
          >
            AUTO FEED
          </button>
        </div>

        {/* Chart Engine Switcher & Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => setChartEngine('NATIVE')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                chartEngine === 'NATIVE' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              UNLIMITED CANVAS
            </button>
            <button
              onClick={() => setChartEngine('TRADINGVIEW')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                chartEngine === 'TRADINGVIEW' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              TRADINGVIEW WIDGET
            </button>
          </div>

          <button
            onClick={() => loadCandles(selectedSymbol, selectedTimeframe, historyDepth, historyRange, dataProvider, false)}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 transition cursor-pointer"
            title="Refresh Live Chart"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE: CHART VIEWPORT + PAIR DIRECTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart Column (3 cols on large screen) */}
        <div className="lg:col-span-3 space-y-3">
          {chartEngine === 'NATIVE' ? (
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
          ) : (
            <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl relative">
              <iframe
                title="TradingView Embedded Chart"
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
                  tradingViewWidgetSymbol
                )}&interval=${tradingViewInterval}&theme=dark&style=1&timezone=Etc%2FUTC&hide_top_toolbar=false&hide_side_toolbar=false&allow_symbol_change=true&save_image=true`}
                className="w-full h-full border-0"
              />
            </div>
          )}

          {/* Bottom Utility Bar: Direct Links to Other Modules */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between gap-3 text-xs font-mono-code flex-wrap">
            <div className="flex items-center gap-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full institutional free-tier analytical stack. 100% real tick and candlestick data.</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onNavigateToTab && (
                <>
                  <button
                    onClick={() => onNavigateToTab('BACKTESTING')}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition cursor-pointer text-[11px] font-bold"
                  >
                    Open in Bar Replay Backtesting &rarr;
                  </button>
                  <button
                    onClick={() => onNavigateToTab('PRE_TRADE_PLAN')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition cursor-pointer text-[11px]"
                  >
                    Pre-Trade Plan &rarr;
                  </button>
                  <button
                    onClick={() => onNavigateToTab('LOT_SIZE')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition cursor-pointer text-[11px]"
                  >
                    Calculate Lot Size &rarr;
                  </button>
                  <button
                    onClick={() => onNavigateToTab('JOURNAL')}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition cursor-pointer text-[11px]"
                  >
                    Trade Journal &rarr;
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Institutional Free Data Architecture Explainer Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900/60 to-blue-950/30 border border-cyan-500/20 shadow-md">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-200">How Unlimited, Free, 100% Authentic Market Data Works Here:</div>
                <p className="text-slate-400 leading-relaxed font-sans">
                  Unlike proprietary subscriptions that charge $15–$60/month and restrict historical bar counts, this platform sources authentic market feeds directly from open institutional endpoints:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 font-mono-code text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="font-bold text-emerald-400">1. Dukascopy Swiss Bank SA</div>
                    <div className="text-slate-400 mt-0.5">ECN interbank Bid/Ask tick and candlestick data spanning 20+ years (2003–present) for Forex &amp; Metals.</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="font-bold text-cyan-400">2. Binance Institutional Feed</div>
                    <div className="text-slate-400 mt-0.5">Sub-second live WebSocket streaming &amp; deep historical klines for 1,000+ crypto assets and tokenized gold (PAXG).</div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="font-bold text-amber-400">3. Yahoo Finance &amp; Stooq</div>
                    <div className="text-slate-400 mt-0.5">Maximum history range covering 50+ years of daily/weekly index and equity benchmarks (US30, NAS100, SPX500).</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pair Directory & Search Sidebar (1 col) */}
        <div className="rounded-2xl bg-[#070d1e] border border-slate-800 p-3 shadow-xl flex flex-col h-[750px]">
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
            <p className="text-[10px] text-slate-500 mt-1 font-mono-code">
              Tip: Press enter to load any global ticker.
            </p>
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
