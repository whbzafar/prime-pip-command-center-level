import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CandlestickChart,
  Search,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Globe,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Clock,
  ShieldCheck,
  Building2,
  Trash2,
  Share2,
  Undo2,
  Redo2,
  Palette,
  Check,
  Copy,
  MessageCircle,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Magnet,
} from 'lucide-react';
import { calculateCurrencyScore, calculateLongTermPairRankings } from '../utils/fundamentalCalculationEngine';
import { CURRENCIES, DEFAULT_CATEGORY_WEIGHTS } from '../data/fundamentalRegistryData';
import { fetchFundamentalObservations } from '../services/fundamentalLiveResearchService';
import {
  DEFAULT_OBSERVATIONS,
  DEFAULT_COT_RECORDS,
  DEFAULT_SENTIMENT_RECORDS,
  DEFAULT_INTEREST_RATES,
  DEFAULT_RETAIL_POSITIONING,
} from '../data/defaultFundamentalObservations';
import { CurrencyCode, CurrencyScoreResult, IndicatorObservation } from '../types/fundamentalIndicatorTypes';

interface ProTradingViewProps {
  onOpenNewTrade?: () => void;
  defaultSymbol?: string;
}

export interface WatchlistGroup {
  name: string;
  symbols: { symbol: string; label: string; broker: string }[];
}

const BROKERS = [
  { id: 'OANDA', label: 'OANDA Corporation', prefix: 'OANDA' },
  { id: 'FXCM', label: 'FXCM (Forex Capital Markets)', prefix: 'FX' },
  { id: 'FOREXCOM', label: 'Forex.com (StoneX)', prefix: 'FOREXCOM' },
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

export const TIMEFRAMES = [
  { id: '1', label: '1m', seconds: 60 },
  { id: '5', label: '5m', seconds: 300 },
  { id: '15', label: '15m', seconds: 900 },
  { id: '30', label: '30m', seconds: 1800 },
  { id: '60', label: '1h', seconds: 3600 },
  { id: '240', label: '4h', seconds: 14400 },
  { id: 'D', label: '1D', seconds: 86400 },
  { id: 'W', label: '1W', seconds: 604800 },
];

function getTimeframeLabel(interval: string): string {
  const match = TIMEFRAMES.find((t) => t.id === interval);
  return match ? match.label : `${interval}m`;
}

// Helper: Calculate live seconds remaining until current candle closes for any timeframe
function calculateCandleCountdown(interval: string): {
  text: string;
  secondsRemaining: number;
  totalSeconds: number;
  label: string;
} {
  const now = new Date();
  const nowUnixSec = Math.floor(now.getTime() / 1000);
  const label = getTimeframeLabel(interval);

  let totalSeconds = 900;
  let secondsRemaining = 0;

  if (interval === '1') {
    totalSeconds = 60;
    secondsRemaining = 60 - (nowUnixSec % 60);
  } else if (interval === '5') {
    totalSeconds = 300;
    secondsRemaining = 300 - (nowUnixSec % 300);
  } else if (interval === '15') {
    totalSeconds = 900;
    secondsRemaining = 900 - (nowUnixSec % 900);
  } else if (interval === '30') {
    totalSeconds = 1800;
    secondsRemaining = 1800 - (nowUnixSec % 1800);
  } else if (interval === '60') {
    totalSeconds = 3600;
    secondsRemaining = 3600 - (nowUnixSec % 3600);
  } else if (interval === '240') {
    totalSeconds = 14400; // 4 Hours (Forex 4h candles align on 00, 04, 08, 12, 16, 20 UTC)
    secondsRemaining = 14400 - (nowUnixSec % 14400);
  } else if (interval === 'D') {
    totalSeconds = 86400; // 24 Hours
    // Daily candle rollover in Forex & TradingView occurs at 22:00 UTC (17:00 New York)
    const offset = 79200; // 22:00 UTC
    const diff = (86400 - ((nowUnixSec - offset) % 86400)) % 86400;
    secondsRemaining = diff === 0 ? 86400 : diff;
  } else if (interval === 'W') {
    totalSeconds = 604800; // 7 Days
    // Weekly candle closes Friday 22:00 UTC
    const currentUtc = new Date(now.toISOString());
    const dayOfWeek = currentUtc.getUTCDay();
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    if (dayOfWeek === 5 && currentUtc.getUTCHours() >= 22) {
      daysUntilFriday = 7;
    }
    const nextFriday = new Date(Date.UTC(
      currentUtc.getUTCFullYear(),
      currentUtc.getUTCMonth(),
      currentUtc.getUTCDate() + daysUntilFriday,
      22, 0, 0
    ));
    const targetUnixSec = Math.floor(nextFriday.getTime() / 1000);
    secondsRemaining = Math.max(1, targetUnixSec - nowUnixSec);
  } else {
    totalSeconds = 900;
    secondsRemaining = 900 - (nowUnixSec % 900);
  }

  if (secondsRemaining <= 0) secondsRemaining = totalSeconds;

  let text = '';
  if (totalSeconds <= 3600) {
    const m = Math.floor(secondsRemaining / 60);
    const s = secondsRemaining % 60;
    text = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else if (totalSeconds <= 86400) {
    const h = Math.floor(secondsRemaining / 3600);
    const m = Math.floor((secondsRemaining % 3600) / 60);
    const s = secondsRemaining % 60;
    text = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else {
    const d = Math.floor(secondsRemaining / 86400);
    const h = Math.floor((secondsRemaining % 86400) / 3600);
    const m = Math.floor((secondsRemaining % 3600) / 60);
    const s = secondsRemaining % 60;
    text = `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return { text, secondsRemaining, totalSeconds, label };
}

interface ChartHistoryState {
  symbol: string;
  broker: string;
  interval: string;
  backgroundColor: string;
}

export const ProTradingView: React.FC<ProTradingViewProps> = ({
  onOpenNewTrade,
  defaultSymbol = 'XAUUSD',
}) => {
  // Saved state initializers
  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_tv_chart_symbol');
      if (saved) return saved.toUpperCase();
    } catch {}
    return defaultSymbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'XAUUSD';
  });

  const [selectedBroker, setSelectedBroker] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_tv_chart_broker');
      if (saved) return saved;
    } catch {}
    return 'OANDA';
  });

  const [selectedInterval, setSelectedInterval] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_tv_chart_interval');
      if (saved) return saved;
    } catch {}
    return '15';
  });

  const [backgroundColor, setBackgroundColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_tv_chart_bgcolor');
      if (saved) return saved;
    } catch {}
    return '#070A12';
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number>(0);
  const [isScriptLoaded, setIsScriptLoaded] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showFundamentalPairs, setShowFundamentalPairs] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Auto-Save Active');
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>('Just now');
  const [isForkedCopy, setIsForkedCopy] = useState<boolean>(false);
  const [isMagnetActive, setIsMagnetActive] = useState<boolean>(false);
  const [timerVerticalPos, setTimerVerticalPos] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_tv_timer_pos');
      return saved ? parseInt(saved, 10) : 50;
    } catch {
      return 50;
    }
  });

  // Undo / Redo History
  const [history, setHistory] = useState<ChartHistoryState[]>([
    { symbol: selectedSymbol, broker: selectedBroker, interval: selectedInterval, backgroundColor },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Fundamental live observations & rankings
  const [fundamentalObservations, setFundamentalObservations] = useState<IndicatorObservation[]>(DEFAULT_OBSERVATIONS);
  const [bullishPairs, setBullishPairs] = useState<any[]>([]);
  const [bearishPairs, setBearishPairs] = useState<any[]>([]);

  // Candle close countdown live timer
  const [candleCountdown, setCandleCountdown] = useState(() => calculateCandleCountdown(selectedInterval));

  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const containerId = 'tradingview_pro_advanced_widget_canvas';

  // Live second-by-second countdown updater
  useEffect(() => {
    const timer = setInterval(() => {
      setCandleCountdown(calculateCandleCountdown(selectedInterval));
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedInterval]);

  // Load Fundamental Data and compute long-term bullish and bearish pairs with live sync
  const refreshFundamentalRankings = useCallback(() => {
    fetchFundamentalObservations().then((data) => {
      const obs = data?.observations?.length ? data.observations : DEFAULT_OBSERVATIONS;
      setFundamentalObservations(obs);

      try {
        const scores: Record<CurrencyCode, CurrencyScoreResult> = {} as any;
        CURRENCIES.forEach((c) => {
          scores[c.code] = calculateCurrencyScore(
            c.code,
            obs,
            DEFAULT_CATEGORY_WEIGHTS,
            DEFAULT_COT_RECORDS,
            DEFAULT_SENTIMENT_RECORDS,
            DEFAULT_INTEREST_RATES,
            DEFAULT_RETAIL_POSITIONING
          );
        });
        const rankings = calculateLongTermPairRankings(scores, obs, DEFAULT_RETAIL_POSITIONING);
        if (rankings?.allPairs) {
          const ready = rankings.allPairs.filter((p: any) => p.dataStatus === 'READY' || p.longTermDiff !== 0);
          const sorted = [...ready].sort((a: any, b: any) => b.longTermDiff - a.longTermDiff);
          setBullishPairs(sorted.slice(0, 6));
          setBearishPairs([...sorted].reverse().slice(0, 6));
        }
      } catch (err) {
        console.warn('Error calculating fundamental pair rankings:', err);
      }
    });
  }, []);

  useEffect(() => {
    refreshFundamentalRankings();
    const handleUpdate = () => refreshFundamentalRankings();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('primepipfx_fundamental_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('primepipfx_fundamental_updated', handleUpdate);
    };
  }, [refreshFundamentalRankings]);

  // Check URL params for shared chart ID (?chart=xyz)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const chartId = params.get('chart');
    if (chartId) {
      setIsForkedCopy(true);
      fetch(`/api/tradingview/shared-chart/${chartId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data.chart) {
            setSelectedSymbol(data.chart.symbol || 'XAUUSD');
            setSelectedBroker(data.chart.broker || 'OANDA');
            setSelectedInterval(data.chart.interval || '15');
            if (data.chart.backgroundColor) setBackgroundColor(data.chart.backgroundColor);
          }
        })
        .catch(() => {});
    }
  }, []);

  // Keyboard Shortcuts: Ctrl+Z (Undo) and Ctrl+Y (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

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
      script.onload = () => setIsScriptLoaded(true);
      script.onerror = () => console.error('Failed to load TradingView script.');
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => setIsScriptLoaded(true));
    }
  }, []);

  // Push state to Undo History and trigger Auto-Save
  const recordHistoryChange = useCallback(
    (newSymbol: string, newBroker: string, newInterval: string, newBg: string) => {
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, { symbol: newSymbol, broker: newBroker, interval: newInterval, backgroundColor: newBg }];
      });
      setHistoryIndex((prev) => prev + 1);

      // Auto-Save persistently to LocalStorage and Server
      try {
        localStorage.setItem('primepipfx_tv_chart_symbol', newSymbol);
        localStorage.setItem('primepipfx_tv_chart_broker', newBroker);
        localStorage.setItem('primepipfx_tv_chart_interval', newInterval);
        localStorage.setItem('primepipfx_tv_chart_bgcolor', newBg);
      } catch {}

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastAutoSavedTime(timeStr);
      setAutoSaveStatus('Auto-Saved');

      // Sync to backend persistent store
      fetch('/api/tradingview/chart-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: newSymbol,
          broker: newBroker,
          interval: newInterval,
          backgroundColor: newBg,
        }),
      }).catch(() => {});
    },
    [historyIndex]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex((i) => i - 1);
      setSelectedSymbol(prev.symbol);
      setSelectedBroker(prev.broker);
      setSelectedInterval(prev.interval);
      setBackgroundColor(prev.backgroundColor);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex((i) => i + 1);
      setSelectedSymbol(next.symbol);
      setSelectedBroker(next.broker);
      setSelectedInterval(next.interval);
      setBackgroundColor(next.backgroundColor);
    }
  };

  // Re-instantiate TradingView widget whenever symbol, broker, timeframe, or background color changes
  const formattedSymbol = `${selectedBroker}:${selectedSymbol}`;
  const isLightBg = backgroundColor === '#FFFFFF' || backgroundColor === '#F8FAFC';

  useEffect(() => {
    if (!isScriptLoaded || typeof (window as any).TradingView === 'undefined') return;

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    try {
      new (window as any).TradingView.widget({
        autosize: true,
        symbol: formattedSymbol,
        interval: selectedInterval,
        timezone: 'Asia/Karachi',
        theme: isLightBg ? 'light' : 'dark',
        style: '1', // Candles
        locale: 'en',
        toolbar_bg: backgroundColor,
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_side_toolbar: false, // Enables full side toolbar
        allow_symbol_change: true,
        show_popup_button: true,
        popup_width: '1000',
        popup_height: '650',
        container_id: containerId,
        studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
        drawings_access: {
          type: 'all',
          tools: [{ name: 'Regression Trend' }],
        },
        overrides: {
          'scalesProperties.showCountdown': true,
          'mainSeriesProperties.showCountdown': true,
          'paneProperties.background': backgroundColor,
          'paneProperties.vertGridProperties.color': isLightBg ? 'rgba(203, 213, 225, 0.4)' : 'rgba(30, 41, 59, 0.4)',
          'paneProperties.horzGridProperties.color': isLightBg ? 'rgba(203, 213, 225, 0.4)' : 'rgba(30, 41, 59, 0.4)',
          'symbolWatermarkProperties.transparency': 90,
          'scalesProperties.textColor': isLightBg ? '#0F172A' : '#94A3B8',
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
      console.warn('TradingView widget warning:', e);
    }
  }, [isScriptLoaded, formattedSymbol, selectedInterval, backgroundColor]);

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
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleSelectSymbol = (sym: string, broker?: string) => {
    const cleanSym = sym.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    let targetBroker = broker;
    if (!targetBroker) {
      if (cleanSym.includes('USDT') || cleanSym.includes('BTC') || cleanSym.includes('ETH')) {
        targetBroker = 'BINANCE';
      } else if (cleanSym === 'XAUUSD' || cleanSym === 'XAGUSD') {
        targetBroker = 'OANDA';
      } else if (['US30', 'NAS100', 'SPX500', 'GER40', 'DXY', 'USOIL', 'UKOIL'].includes(cleanSym)) {
        targetBroker = 'TVC';
      } else {
        targetBroker = 'FX';
      }
    }
    setSelectedSymbol(cleanSym);
    setSelectedBroker(targetBroker);
    recordHistoryChange(cleanSym, targetBroker, selectedInterval, backgroundColor);
  };

  const handleIntervalChange = (newInterval: string) => {
    setSelectedInterval(newInterval);
    recordHistoryChange(selectedSymbol, selectedBroker, newInterval, backgroundColor);
  };

  const handleBackgroundChange = (newBg: string) => {
    setBackgroundColor(newBg);
    recordHistoryChange(selectedSymbol, selectedBroker, selectedInterval, newBg);
  };

  // Recycle Bin: Delete all drawings and reset chart canvas
  const handleClearAllDrawings = () => {
    setShowClearConfirm(false);
    // Reload widget container to wipe all canvas drawing memory
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
      setTimeout(() => {
        recordHistoryChange(selectedSymbol, selectedBroker, selectedInterval, backgroundColor);
      }, 50);
    }
  };

  // Generate Collaborative Share Link (Recipient edits their own personal forked copy!)
  const handleGenerateShare = async () => {
    try {
      const res = await fetch('/api/tradingview/shared-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${selectedSymbol} Institutional Chart Analysis`,
          symbol: selectedSymbol,
          broker: selectedBroker,
          interval: selectedInterval,
          backgroundColor,
          allowEdit: true, // Recipient can edit their copy!
        }),
      });
      const data = await res.json();
      if (data?.ok && data.id) {
        const url = `${window.location.origin}${window.location.pathname}?chart=${data.id}&tab=PRO_TRADING`;
        setShareLink(url);
        setShowShareModal(true);
      }
    } catch {
      const fallbackUrl = `${window.location.origin}${window.location.pathname}?symbol=${selectedSymbol}&interval=${selectedInterval}&tab=PRO_TRADING`;
      setShareLink(fallbackUrl);
      setShowShareModal(true);
    }
  };

  const handleCopyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
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
      {/* Top Banner & Control Toolbar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-[#0B0F19] border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3">
        {/* Forked Copy Notice Banner */}
        {isForkedCopy && (
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs font-mono-code text-cyan-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>Collaborative Shared Analysis:</strong> You are editing your personal copy of this chart. Your edits are saved locally without modifying the original sender's chart.
              </span>
            </div>
            <button
              onClick={() => setIsForkedCopy(false)}
              className="text-slate-400 hover:text-white px-2 py-0.5 text-[10px]"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Active Pair Display */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
              <CandlestickChart className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-military font-bold tracking-wider text-slate-100 uppercase flex items-center gap-2">
                  <span>PREMIUM TRADINGVIEW TERMINAL</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-mono-code font-bold text-emerald-400 flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REAL-TIME RAW FEED
                </span>

                {/* Auto-Save Status Indicator */}
                <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-[10px] font-mono-code text-slate-300 flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>{autoSaveStatus} ({lastAutoSavedTime})</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-code">
                Institutional Candlestick Engine • Live Candle Timers • Background Customizer • Zero Lag
              </p>
            </div>
          </div>

          {/* Quick Controls: Undo, Redo, Recycle Bin, Share, Background, Timeframe */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Currency / Pair Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative min-w-[170px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search symbol (e.g. UBL, GBPJPY)..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-slate-100 placeholder:text-slate-500 uppercase outline-none focus:border-cyan-400"
              />
            </form>

            {/* Broker Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs font-mono-code">
              <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={selectedBroker}
                onChange={(e) => {
                  setSelectedBroker(e.target.value);
                  recordHistoryChange(selectedSymbol, e.target.value, selectedInterval, backgroundColor);
                }}
                className="bg-transparent text-slate-200 outline-none text-xs cursor-pointer font-bold"
                title="Select Broker / Data Provider"
              >
                {BROKERS.map((b) => (
                  <option key={b.id} value={b.prefix} className="bg-slate-900 text-slate-100">
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* LIVE CANDLE CLOSE COUNTDOWN TIMER */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/10 border border-cyan-400/40 text-xs font-mono-code font-bold text-cyan-300 shadow-sm"
              title={`Exact time remaining before the current ${candleCountdown.label} candle closes`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
              <span>{candleCountdown.label} CANDLE CLOSE:</span>
              <span className="text-white bg-slate-950/80 px-2 py-0.5 rounded font-mono-code tracking-wider text-xs font-bold">
                {candleCountdown.text}
              </span>
            </div>

            {/* Timeframe Quick Switcher */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[11px] font-mono-code">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => handleIntervalChange(tf.id)}
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

            {/* Undo / Redo Buttons */}
            <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                title="Undo Chart Action (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition cursor-pointer"
                title="Redo Chart Action (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Background Color Picker Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 transition cursor-pointer flex items-center gap-1.5 text-xs font-mono-code"
                title="Change Chart Background Color"
              >
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                <span className="w-3 h-3 rounded-full border border-slate-600" style={{ backgroundColor }} />
              </button>

              {showColorPicker && (
                <div className="absolute right-0 top-11 z-50 w-56 p-3 rounded-2xl bg-slate-950 border border-slate-700 shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95">
                  <div className="text-[11px] font-mono-code font-bold text-slate-300 uppercase pb-1 border-b border-slate-800">
                    Background Color Presets
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BG_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          handleBackgroundChange(p.id);
                          setShowColorPicker(false);
                        }}
                        className={`p-1.5 rounded-lg border text-left text-[10px] font-mono-code flex items-center gap-2 transition ${
                          backgroundColor === p.id
                            ? 'border-cyan-400 bg-cyan-500/10 text-white font-bold'
                            : 'border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" style={{ backgroundColor: p.id }} />
                        <span className="truncate">{p.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono-code text-slate-300">
                    <span>Custom Hex:</span>
                    <input
                      type="color"
                      value={backgroundColor.startsWith('#') ? backgroundColor : '#070A12'}
                      onChange={(e) => handleBackgroundChange(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recycle Bin / Trash Icon: Delete all drawings */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="p-2 rounded-xl bg-slate-950 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500 text-slate-300 hover:text-rose-400 transition cursor-pointer"
              title="Delete All Drawings & Reset Chart (Recycle Bin)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Fundamental Pairs Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFundamentalPairs(!showFundamentalPairs)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono-code font-bold transition cursor-pointer ${
                showFundamentalPairs
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                  : 'bg-slate-950 text-purple-300 border-purple-500/30 hover:border-purple-400'
              }`}
              title="View Long-Term Bullish & Bearish Pairs from Fundamental Analysis"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>FUNDAMENTAL PAIRS</span>
            </button>

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

        {/* FUNDAMENTAL PAIRS LIVE DRAWER: Bullish and Bearish Pairs */}
        {showFundamentalPairs && (
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-purple-500/40 space-y-2.5 animate-in slide-in-from-top-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                <span className="font-military font-bold text-xs text-white uppercase tracking-wider">
                  Live Fundamental Structural Pair Rankings
                </span>
                <span className="text-[10px] text-purple-300 font-mono-code bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  REAL-TIME MACRO SYNC
                </span>
              </div>
              <span className="text-[11px] font-mono-code text-slate-400">
                Click any pair below to load its chart instantly
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Bullish Pairs Column */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono-code font-bold text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>LONG-TERM BULLISH PAIRS (STRONGEST MACRO SPREAD)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {bullishPairs.map((p) => {
                    const cleanCode = p.pair?.replace('/', '') || p.symbol || 'XAUUSD';
                    return (
                      <button
                        key={p.pair || p.symbol}
                        type="button"
                        onClick={() => handleSelectSymbol(cleanCode)}
                        className={`p-2 rounded-xl border text-left font-mono-code transition cursor-pointer ${
                          selectedSymbol === cleanCode
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-emerald-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{p.pair || cleanCode}</span>
                          <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                            +{Math.abs(p.longTermDiff || p.score || 4.2).toFixed(1)}
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-400 mt-0.5 truncate">
                          {p.structuralBias || 'Bullish Spread'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bearish Pairs Column */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-mono-code font-bold text-rose-400">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>LONG-TERM BEARISH PAIRS (WEAKEST MACRO SPREAD)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {bearishPairs.map((p) => {
                    const cleanCode = p.pair?.replace('/', '') || p.symbol || 'NZDUSD';
                    return (
                      <button
                        key={p.pair || p.symbol}
                        type="button"
                        onClick={() => handleSelectSymbol(cleanCode)}
                        className={`p-2 rounded-xl border text-left font-mono-code transition cursor-pointer ${
                          selectedSymbol === cleanCode
                            ? 'bg-rose-500 text-slate-950 border-rose-400 font-bold shadow'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-rose-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{p.pair || cleanCode}</span>
                          <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-300 font-bold">
                            -{Math.abs(p.longTermDiff || p.score || 3.8).toFixed(1)}
                          </span>
                        </div>
                        <div className="text-[10px] text-rose-400 mt-0.5 truncate">
                          {p.structuralBias || 'Bearish Spread'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

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
        className={`border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative transition-all duration-300 ${
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[680px] sm:h-[750px] lg:h-[820px]'
        }`}
        style={{ backgroundColor }}
      >
        <div id={containerId} className="w-full h-full" />

        {/* On-Chart Left Vertical Tactical Tool Rail (Magnet & Recycle Bin directly below it) */}
        <div className="absolute left-3 top-14 z-10 flex flex-col items-center gap-1.5 p-1 rounded-xl bg-slate-950/85 border border-slate-800/80 backdrop-blur-md shadow-xl">
          <button
            type="button"
            onClick={() => setIsMagnetActive(!isMagnetActive)}
            className={`p-2 rounded-lg transition cursor-pointer ${
              isMagnetActive
                ? 'bg-blue-500 text-slate-950 font-bold shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-900'
            }`}
            title={isMagnetActive ? 'Magnet Tool Active (Snapping to price candles)' : 'Enable Magnet Tool (Snap drawing anchors to OHLC)'}
          >
            <Magnet className="w-4 h-4" />
          </button>

          {/* Recycle Bin / Trash Icon Placed Directly Below Magnet Tool */}
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border-t border-slate-800 transition cursor-pointer"
            title="Recycle Bin: Delete all drawings and written markings on chart"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer Info Notice with Live Exact Candle Countdown */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono-code text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Connected to <strong>{selectedBroker}</strong> raw feed ({formattedSymbol}). Current <strong>{candleCountdown.label}</strong> candle closes in <strong className="text-amber-300 font-mono-code">{candleCountdown.text}</strong>. Native countdown scale active.
          </span>
        </div>
        <span className="text-[10px] text-cyan-400 shrink-0">
          POWERED BY TRADINGVIEW ADVANCED CHARTS
        </span>
      </div>

      {/* CLEAR ALL DRAWINGS CONFIRMATION MODAL (RECYCLE BIN) */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-950 border border-rose-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-military font-bold text-white uppercase">Clear All Drawings?</h3>
              <p className="text-xs text-slate-300 font-mono-code">
                This will delete all trendlines, Fibonacci retracements, shapes, and notes from the chart canvas.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 font-mono-code text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllDrawings}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-military font-bold text-xs uppercase shadow-lg shadow-rose-600/30"
              >
                Clear Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE CHART MODAL (Collaborative Forking) */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-950 border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-military font-bold text-white uppercase">Collaborative Chart Sharing</h3>
                  <p className="text-[11px] font-mono-code text-slate-400">Recipient can view & edit their own personal copy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs font-mono-code text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Check className="w-4 h-4 shrink-0" />
                <span>Non-Destructive Collaborative Editing Enabled</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                When you share this link, the recipient can open the exact symbol ({selectedSymbol}), broker, and interval, and can edit or add their own annotations without altering your original analysis.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-mono-code uppercase text-slate-400 mb-1">
                Shareable Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono-code text-xs text-cyan-300 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono-code shrink-0 flex items-center gap-1.5 transition"
                >
                  {copiedShare ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedShare ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Check out this ${selectedSymbol} chart analysis on PrimePipFX Premium TradingView: ${shareLink}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-military font-bold text-xs tracking-wider uppercase text-center transition flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Share via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
