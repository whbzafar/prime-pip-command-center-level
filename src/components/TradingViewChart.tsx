import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  Minimize2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  BarChart2,
  RefreshCw,
  Clock,
  Layers,
  Search,
  Compass,
} from 'lucide-react';

interface TradingViewChartProps {
  initialSymbol?: string;
  onOpenLotCalculator?: (pair: string) => void;
  onOpenTradeJournal?: () => void;
}

interface QuickSymbol {
  symbol: string;
  name: string;
  category: 'FOREX' | 'COMMODITIES' | 'INDICES' | 'CRYPTO';
  tvSymbol: string;
  flag: string;
}

const QUICK_SYMBOLS: QuickSymbol[] = [
  // Forex
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', category: 'FOREX', tvSymbol: 'FX:EURUSD', flag: '🇪🇺 🇺🇸' },
  { symbol: 'GBP/USD', name: 'Pound / US Dollar', category: 'FOREX', tvSymbol: 'FX:GBPUSD', flag: '🇬🇧 🇺🇸' },
  { symbol: 'USD/JPY', name: 'US Dollar / Yen', category: 'FOREX', tvSymbol: 'FX:USDJPY', flag: '🇺🇸 🇯🇵' },
  { symbol: 'AUD/USD', name: 'Aussie / US Dollar', category: 'FOREX', tvSymbol: 'FX:AUDUSD', flag: '🇦🇺 🇺🇸' },
  { symbol: 'USD/CAD', name: 'US Dollar / Loonie', category: 'FOREX', tvSymbol: 'FX:USDCAD', flag: '🇺🇸 🇨🇦' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swissy', category: 'FOREX', tvSymbol: 'FX:USDCHF', flag: '🇺🇸 🇨🇭' },
  { symbol: 'NZD/USD', name: 'Kiwi / US Dollar', category: 'FOREX', tvSymbol: 'FX:NZDUSD', flag: '🇳🇿 🇺🇸' },

  // Commodities
  { symbol: 'XAU/USD', name: 'Gold / US Dollar', category: 'COMMODITIES', tvSymbol: 'OANDA:XAUUSD', flag: '🥇' },
  { symbol: 'XAG/USD', name: 'Silver / US Dollar', category: 'COMMODITIES', tvSymbol: 'OANDA:XAGUSD', flag: '🥈' },
  { symbol: 'USOIL', name: 'Crude Oil (WTI)', category: 'COMMODITIES', tvSymbol: 'TVC:USOIL', flag: '🛢️' },

  // Indices
  { symbol: 'US30', name: 'Dow Jones 30', category: 'INDICES', tvSymbol: 'BLACKBULL:US30', flag: '🇺🇸' },
  { symbol: 'NAS100', name: 'Nasdaq 100', category: 'INDICES', tvSymbol: 'BLACKBULL:NAS100', flag: '🇺🇸' },
  { symbol: 'SPX500', name: 'S&P 500 Index', category: 'INDICES', tvSymbol: 'BLACKBULL:SPX500', flag: '🇺🇸' },

  // Crypto
  { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', category: 'CRYPTO', tvSymbol: 'BINANCE:BTCUSDT', flag: '₿' },
  { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', category: 'CRYPTO', tvSymbol: 'BINANCE:ETHUSDT', flag: 'Ξ' },
];

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  initialSymbol = 'XAU/USD',
  onOpenLotCalculator,
  onOpenTradeJournal,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'FOREX' | 'COMMODITIES' | 'INDICES' | 'CRYPTO'>('ALL');
  const [timeframe, setTimeframe] = useState<string>('15');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const matched = QUICK_SYMBOLS.find(
    (s) => s.symbol.toUpperCase() === selectedSymbol.toUpperCase() || s.tvSymbol === selectedSymbol
  ) || QUICK_SYMBOLS[7]; // Default to Gold

  const activeTvSymbol = matched.tvSymbol;

  // Build the embed widget whenever activeTvSymbol or timeframe changes
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const params = new URLSearchParams({
      symbol: activeTvSymbol,
      interval: timeframe,
      timezone: 'Asia/Karachi',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: 'false',
      hide_top_toolbar: 'false',
      hide_side_toolbar: 'false',
      allow_symbol_change: 'true',
      save_image: 'true',
      hideideas: 'true',
    });

    const iframe = document.createElement('iframe');
    iframe.src = `https://s.tradingview.com/widgetembed/?${params.toString()}`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('title', `${activeTvSymbol} TradingView Chart`);
    container.appendChild(iframe);

    return () => {
      container.innerHTML = '';
    };
  }, [activeTvSymbol, timeframe]);

  const filteredSymbols = QUICK_SYMBOLS.filter((s) => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className={`space-y-4 max-w-7xl mx-auto px-2 sm:px-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#030712] p-4 max-w-none overflow-y-auto' : ''}`}>
      {/* Top Banner & Instrument Selection Bar */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code font-bold tracking-widest text-cyan-400 uppercase bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  REAL-TIME INSTITUTIONAL CHARTS
                </span>
                <span className="text-[10px] font-mono-code text-slate-400">
                  TradingView Technical Feed
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-military font-bold text-slate-100 mt-0.5">
                TradingView Interactive Workspace
              </h2>
              <p className="text-xs font-mono-code text-slate-400">
                Live candles, fair value gaps, liquidity levels, Order Blocks, and multi-timeframe analysis for G8 Forex, Gold (XAU), Silver (XAG), US Oil, Indices, and Crypto.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Timeframe Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-mono-code font-bold">
              {[
                { label: '1m', val: '1' },
                { label: '5m', val: '5' },
                { label: '15m', val: '15' },
                { label: '1H', val: '60' },
                { label: '4H', val: '240' },
                { label: '1D', val: 'D' },
                { label: '1W', val: 'W' },
              ].map((tf) => (
                <button
                  key={tf.val}
                  type="button"
                  onClick={() => setTimeframe(tf.val)}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    timeframe === tf.val
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Lot Size Calculator Shortcut */}
            {onOpenLotCalculator && (
              <button
                type="button"
                onClick={() => onOpenLotCalculator(selectedSymbol)}
                className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-blue-500/30 text-xs font-military font-bold transition cursor-pointer"
                title="Calculate 1% risk position size for this instrument"
              >
                CALCULATE LOT SIZE
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Category Filters and Quick Symbol Ticker */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-mono-code font-bold">
              {(['ALL', 'FOREX', 'COMMODITIES', 'INDICES', 'CRYPTO'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono-code text-slate-400">
              Active: <strong className="text-cyan-300 font-bold">{matched.flag} {matched.symbol} ({matched.name})</strong>
            </div>
          </div>

          {/* Quick Instrument Buttons */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {filteredSymbols.map((item) => {
              const isSelected = selectedSymbol.toUpperCase() === item.symbol.toUpperCase();
              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(item.symbol)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-mono-code transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-md shadow-cyan-500/10 ring-1 ring-cyan-400/40'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span>{item.flag}</span>
                  <span className="font-bold">{item.symbol}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className={`relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl ${isFullscreen ? 'h-[calc(100vh-230px)]' : 'h-[680px]'}`}>
        <div ref={containerRef} className="tradingview-widget-container w-full h-full" />
      </div>

      {/* Bottom Technical Reference & Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono-code">
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-cyan-400 font-bold uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SBT MODEL IDENTIFICATION</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Look for liquidity sweep at Asian/London session highs or lows, followed by an aggressive displacement breaking market structure (BOS) into Fair Value Gaps.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-amber-400 font-bold uppercase flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>SESSION KILLZONES (PKT)</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            London Open: 12:00 PM – 03:00 PM PKT • New York AM: 05:00 PM – 08:00 PM PKT • High probability setups occur predominantly during killzone liquidity releases.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
          <div className="text-emerald-400 font-bold uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>1% RISK RULE DIRECTIVE</span>
          </div>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Never risk more than 1% of account equity per trade. Ensure stop-loss is placed beyond swing high/low before sizing your position.
          </p>
        </div>
      </div>
    </div>
  );
};
