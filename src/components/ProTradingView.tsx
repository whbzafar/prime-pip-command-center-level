import React, { useState, useEffect, useRef } from 'react';
import {
  CandlestickChart,
  Search,
  Maximize2,
  Minimize2,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Clock,
  ShieldCheck,
  Building2,
} from 'lucide-react';

interface ProTradingViewProps {
  onOpenNewTrade?: () => void;
  defaultSymbol?: string;
}

export interface WatchlistGroup {
  name: string;
  symbols: { symbol: string; label: string; broker: string }[];
}

const BROKERS = [
  { id: 'FXCM', label: 'FXCM (Forex Capital Markets)', prefix: 'FX' },
  { id: 'FOREXCOM', label: 'Forex.com (StoneX)', prefix: 'FOREXCOM' },
  { id: 'OANDA', label: 'OANDA Corporation', prefix: 'OANDA' },
  { id: 'PEPPERSTONE', label: 'Pepperstone Markets', prefix: 'PEPPERSTONE' },
  { id: 'CAPITALCOM', label: 'Capital.com', prefix: 'CAPITALCOM' },
  { id: 'BINANCE', label: 'Binance (Crypto)', prefix: 'BINANCE' },
  { id: 'TVC', label: 'TradingView Composite / Index', prefix: 'TVC' },
];

const WATCHLIST_GROUPS: WatchlistGroup[] = [
  {
    name: 'FOREX MAJORS',
    symbols: [
      { symbol: 'EURUSD', label: 'EUR/USD', broker: 'FX' },
      { symbol: 'GBPUSD', label: 'GBP/USD', broker: 'FX' },
      { symbol: 'USDJPY', label: 'USD/JPY', broker: 'FX' },
      { symbol: 'AUDUSD', label: 'AUD/USD', broker: 'FX' },
      { symbol: 'USDCAD', label: 'USD/CAD', broker: 'FX' },
      { symbol: 'USDCHF', label: 'USD/CHF', broker: 'FX' },
      { symbol: 'NZDUSD', label: 'NZD/USD', broker: 'FX' },
    ],
  },
  {
    name: 'CROSSES',
    symbols: [
      { symbol: 'GBPJPY', label: 'GBP/JPY', broker: 'FX' },
      { symbol: 'EURJPY', label: 'EUR/JPY', broker: 'FX' },
      { symbol: 'EURGBP', label: 'EUR/GBP', broker: 'FX' },
      { symbol: 'AUDJPY', label: 'AUD/JPY', broker: 'FX' },
      { symbol: 'CADJPY', label: 'CAD/JPY', broker: 'FX' },
      { symbol: 'GBPAUD', label: 'GBP/AUD', broker: 'FX' },
      { symbol: 'EURAUD', label: 'EUR/AUD', broker: 'FX' },
    ],
  },
  {
    name: 'METALS & GOLD',
    symbols: [
      { symbol: 'XAUUSD', label: 'XAU/USD (Gold)', broker: 'OANDA' },
      { symbol: 'GOLD', label: 'Spot Gold Index', broker: 'TVC' },
      { symbol: 'XAGUSD', label: 'XAG/USD (Silver)', broker: 'OANDA' },
      { symbol: 'SILVER', label: 'Spot Silver Index', broker: 'TVC' },
    ],
  },
  {
    name: 'ENERGY & OIL',
    symbols: [
      { symbol: 'USOIL', label: 'WTI Crude Oil', broker: 'TVC' },
      { symbol: 'UKOIL', label: 'Brent Crude Oil', broker: 'TVC' },
      { symbol: 'NATGAS', label: 'Natural Gas', broker: 'TVC' },
    ],
  },
  {
    name: 'INDICES',
    symbols: [
      { symbol: 'US30', label: 'Dow Jones 30', broker: 'TVC' },
      { symbol: 'NAS100', label: 'Nasdaq 100', broker: 'TVC' },
      { symbol: 'SPX500', label: 'S&P 500 Index', broker: 'TVC' },
      { symbol: 'GER40', label: 'DAX 40 (Germany)', broker: 'TVC' },
      { symbol: 'DXY', label: 'US Dollar Index', broker: 'TVC' },
    ],
  },
  {
    name: 'CRYPTO',
    symbols: [
      { symbol: 'BTCUSDT', label: 'BTC/USDT', broker: 'BINANCE' },
      { symbol: 'ETHUSDT', label: 'ETH/USDT', broker: 'BINANCE' },
      { symbol: 'SOLUSDT', label: 'SOL/USDT', broker: 'BINANCE' },
    ],
  },
];

const TIMEFRAMES = [
  { id: '1', label: '1m' },
  { id: '5', label: '5m' },
  { id: '15', label: '15m' },
  { id: '60', label: '1h' },
  { id: '240', label: '4h' },
  { id: 'D', label: '1D' },
  { id: 'W', label: '1W' },
];

export const ProTradingView: React.FC<ProTradingViewProps> = ({
  onOpenNewTrade,
  defaultSymbol = 'XAUUSD',
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    return defaultSymbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'XAUUSD';
  });
  const [selectedBroker, setSelectedBroker] = useState<string>('OANDA');
  const [selectedInterval, setSelectedInterval] = useState<string>('15');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number>(0);
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(false);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const containerId = 'tradingview_pro_advanced_widget_canvas';

  // Load TradingView official library script once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).TradingView) {
      setIsScriptLoaded(true);
      return;
    }

    const scriptId = 'tradingview-advanced-widget-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      script.onload = () => {
        setIsScriptLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load TradingView tv.js script.');
      };
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => setIsScriptLoaded(true));
    }
  }, []);

  // Compute clean formatted TradingView symbol: e.g. "OANDA:XAUUSD" or "FX:EURUSD"
  const formattedSymbol = `${selectedBroker}:${selectedSymbol}`;

  // Re-instantiate TradingView widget whenever symbol, broker, or timeframe changes
  useEffect(() => {
    if (!isScriptLoaded || typeof (window as any).TradingView === 'undefined') return;

    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous widget iframe to prevent ghost DOM elements
    container.innerHTML = '';

    try {
      new (window as any).TradingView.widget({
        autosize: true,
        symbol: formattedSymbol,
        interval: selectedInterval,
        timezone: 'Asia/Karachi',
        theme: 'dark',
        style: '1', // 1 = Candles
        locale: 'en',
        toolbar_bg: '#0B0F19',
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_side_toolbar: false, // Enables full drawing toolbar: trendlines, fib, shapes, text
        allow_symbol_change: true, // Enables TradingView's built-in symbol search modal
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        container_id: containerId,
        studies: [
          'RSI@tv-basicstudies',
          'MASimple@tv-basicstudies',
        ],
        drawings_access: {
          type: 'all',
          tools: [{ name: 'Regression Trend' }],
        },
        overrides: {
          'paneProperties.background': '#070A12',
          'paneProperties.vertGridProperties.color': 'rgba(30, 41, 59, 0.4)',
          'paneProperties.horzGridProperties.color': 'rgba(30, 41, 59, 0.4)',
          'symbolWatermarkProperties.transparency': 90,
          'scalesProperties.textColor': '#94A3B8',
          'mainSeriesProperties.candleStyle.upColor': '#10B981',
          'mainSeriesProperties.candleStyle.downColor': '#F43F5E',
          'mainSeriesProperties.candleStyle.drawWick': true,
          'mainSeriesProperties.candleStyle.drawBorder': true,
          'mainSeriesProperties.candleStyle.borderColor': '#374151',
          'mainSeriesProperties.candleStyle.borderUpColor': '#10B981',
          'mainSeriesProperties.candleStyle.borderDownColor': '#F43F5E',
          'mainSeriesProperties.candleStyle.wickUpColor': '#10B981',
          'mainSeriesProperties.candleStyle.wickDownColor': '#F43F5E',
        },
      });
    } catch (e) {
      console.warn('TradingView widget initialization warning:', e);
    }
  }, [isScriptLoaded, formattedSymbol, selectedInterval]);

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!chartWrapperRef.current) return;
    if (!document.fullscreenElement) {
      chartWrapperRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Filter symbols based on search
  const handleSelectSymbol = (sym: string, broker?: string) => {
    const cleanSym = sym.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    setSelectedSymbol(cleanSym);
    if (broker) {
      setSelectedBroker(broker);
    } else {
      // Auto-assign smart broker
      if (cleanSym.includes('USDT') || cleanSym.includes('BTC') || cleanSym.includes('ETH')) {
        setSelectedBroker('BINANCE');
      } else if (cleanSym === 'XAUUSD' || cleanSym === 'XAGUSD') {
        setSelectedBroker('OANDA');
      } else if (['US30', 'NAS100', 'SPX500', 'GER40', 'DXY', 'USOIL', 'UKOIL'].includes(cleanSym)) {
        setSelectedBroker('TVC');
      } else {
        setSelectedBroker('FX');
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    handleSelectSymbol(searchQuery.trim());
    setSearchQuery('');
  };

  return (
    <div
      ref={chartWrapperRef}
      className={`space-y-4 max-w-7xl mx-auto ${
        isFullscreen ? 'p-3 bg-[#070A12] h-screen w-screen overflow-hidden' : 'pb-16'
      }`}
    >
      {/* Top Pro Trading Control Toolbar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0B0F19] border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Active Pair Display */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <CandlestickChart className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-military font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
                  <span>PRO TRADING TERMINAL</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-mono-code font-bold text-emerald-400 flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REAL-TIME RAW DATA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-code">
                TradingView Interactive Engine • Full Multi-Asset Analysis • Zero Lag
              </p>
            </div>
          </div>

          {/* Search, Broker Selector & Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Currency / Pair Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative min-w-[180px] sm:min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search any pair (e.g. GBPJPY)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-slate-100 placeholder:text-slate-500 uppercase outline-none focus:border-cyan-400"
              />
            </form>

            {/* Broker Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs font-mono-code">
              <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={selectedBroker}
                onChange={(e) => setSelectedBroker(e.target.value)}
                className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer font-bold"
                title="Select Broker / Data Provider for Live Candles"
              >
                {BROKERS.map((b) => (
                  <option key={b.id} value={b.prefix} className="bg-slate-900 text-slate-100">
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Quick Switcher */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[11px] font-mono-code">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setSelectedInterval(tf.id)}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer font-bold ${
                    selectedInterval === tf.id
                      ? 'bg-blue-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Analysis Mode'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Quick Record Trade Action */}
            {onOpenNewTrade && (
              <button
                type="button"
                onClick={onOpenNewTrade}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs tracking-wider transition shadow shadow-blue-500/20 cursor-pointer active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>RECORD TRADE</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Instrument Watchlist Bar */}
        <div className="pt-2 border-t border-slate-800/80 space-y-2">
          {/* Watchlist Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono-code">
            <span className="text-slate-500 uppercase font-bold shrink-0 mr-1">WATCHLIST:</span>
            {WATCHLIST_GROUPS.map((grp, idx) => (
              <button
                key={grp.name}
                type="button"
                onClick={() => setActiveGroupIndex(idx)}
                className={`px-2.5 py-1 rounded-lg border transition cursor-pointer shrink-0 ${
                  activeGroupIndex === idx
                    ? 'bg-blue-500/20 text-cyan-400 border-blue-500/40 font-bold'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {grp.name}
              </button>
            ))}
          </div>

          {/* Watchlist Symbols in Selected Group */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono-code pb-1">
            {WATCHLIST_GROUPS[activeGroupIndex]?.symbols.map((item) => {
              const isSelected = selectedSymbol === item.symbol;
              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => handleSelectSymbol(item.symbol, item.broker)}
                  className={`px-3 py-1 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-500 text-slate-950 border-cyan-400 shadow-md shadow-blue-500/20'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`text-[9px] px-1 rounded ${isSelected ? 'bg-slate-950 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
                    {item.broker}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main TradingView Advanced Chart Container */}
      <div
        className={`bg-[#070A12] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative ${
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[680px] sm:h-[750px] lg:h-[820px]'
        }`}
      >
        <div id={containerId} className="w-full h-full" />
      </div>

      {/* Footer Info Notice */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono-code text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Connected to <strong>{selectedBroker}</strong> raw feed ({formattedSymbol}). All drawing tools, Fibonacci retracements, multi-timeframe candles, and custom technical indicators are fully enabled.
          </span>
        </div>
        <span className="text-[10px] text-cyan-400 shrink-0">
          POWERED BY TRADINGVIEW ADVANCED CHARTS
        </span>
      </div>
    </div>
  );
};
