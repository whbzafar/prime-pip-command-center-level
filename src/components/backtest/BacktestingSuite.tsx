import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  UTCTimestamp,
  Time,
} from 'lightweight-charts';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Scissors,
  TrendingUp,
  TrendingDown,
  Layers,
  Settings2,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  BarChart2,
  Maximize2,
  Minimize2,
  Sliders,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen,
  Eye,
  EyeOff,
  Trash2,
  Type,
  Square,
  Minus,
  Navigation,
  Compass,
  Key,
  ShieldCheck,
  ChevronDown,
  Clock,
  Calendar,
  X,
  Target,
  ArrowRight,
  Info,
} from 'lucide-react';
import { AccountSettings, Trade } from '../../types';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  formatVolumeSeries,
  CandlestickPoint,
} from '../../utils/indicatorEngine';
import { formatCurrency } from '../../utils/currencyFormatter';

export interface BacktestingSuiteProps {
  activeAccount?: AccountSettings | null;
  onAutoLogTrade?: (trade: Trade) => void;
  onNavigateToJournal?: () => void;
}

export interface BacktestInstrument {
  id: string;
  name: string;
  category: 'FOREX' | 'CRYPTO' | 'COMMODITIES' | 'INDICES' | 'STOCKS';
  flag: string;
  type: string;
  digits: number;
  pipMultiplier: number;
  description: string;
}

export interface SimulatedOrder {
  id: string;
  type: 'BUY' | 'SELL';
  orderMode: 'MARKET' | 'LIMIT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskAmount: number;
  entryTime: number;
  entryIndex: number;
  exitPrice?: number;
  exitTime?: number;
  exitIndex?: number;
  pnl?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN';
  rMultiple?: number;
  pipsGained?: number;
  notes?: string;
}

export type DrawingToolType =
  | 'CURSOR'
  | 'TRENDLINE'
  | 'HORIZONTAL_LINE'
  | 'FIBONACCI'
  | 'RECTANGLE'
  | 'LONG_POSITION'
  | 'SHORT_POSITION'
  | 'TEXT_NOTE';

export interface DrawingItem {
  id: string;
  type: DrawingToolType;
  points: { x: number; y: number; time?: number; price?: number }[];
  text?: string;
  color?: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

const DEFAULT_INSTRUMENTS: BacktestInstrument[] = [
  // Forex
  { id: 'EURUSD', name: 'EUR/USD', category: 'FOREX', flag: '🇪🇺 🇺🇸', type: 'Forex Major', digits: 5, pipMultiplier: 10000, description: 'Euro / US Dollar' },
  { id: 'GBPUSD', name: 'GBP/USD', category: 'FOREX', flag: '🇬🇧 🇺🇸', type: 'Forex Major', digits: 5, pipMultiplier: 10000, description: 'British Pound / US Dollar' },
  { id: 'USDJPY', name: 'USD/JPY', category: 'FOREX', flag: '🇺🇸 🇯🇵', type: 'Forex Major', digits: 3, pipMultiplier: 100, description: 'US Dollar / Japanese Yen' },
  { id: 'AUDUSD', name: 'AUD/USD', category: 'FOREX', flag: '🇦🇺 🇺🇸', type: 'Forex Major', digits: 5, pipMultiplier: 10000, description: 'Australian Dollar / US Dollar' },
  { id: 'USDCAD', name: 'USD/CAD', category: 'FOREX', flag: '🇺🇸 🇨🇦', type: 'Forex Major', digits: 5, pipMultiplier: 10000, description: 'US Dollar / Canadian Dollar' },
  { id: 'USDCHF', name: 'USD/CHF', category: 'FOREX', flag: '🇺🇸 🇨🇭', type: 'Forex Major', digits: 5, pipMultiplier: 10000, description: 'US Dollar / Swiss Franc' },
  { id: 'NZDUSD', name: 'NZD/USD', category: 'FOREX', flag: '🇳🇿 🇺🇸', type: 'Forex Major', digits: 5, pipMultiplier: 10000, description: 'New Zealand Dollar / US Dollar' },
  { id: 'GBPJPY', name: 'GBP/JPY', category: 'FOREX', flag: '🇬🇧 🇯🇵', type: 'Forex Cross', digits: 3, pipMultiplier: 100, description: 'Pound Sterling / Japanese Yen' },
  { id: 'EURGBP', name: 'EUR/GBP', category: 'FOREX', flag: '🇪🇺 🇬🇧', type: 'Forex Cross', digits: 5, pipMultiplier: 10000, description: 'Euro / British Pound' },

  // Commodities
  { id: 'XAUUSD', name: 'XAU/USD (Gold)', category: 'COMMODITIES', flag: '🥇', type: 'Precious Metal', digits: 2, pipMultiplier: 10, description: 'Spot Gold / US Dollar' },
  { id: 'XAGUSD', name: 'XAG/USD (Silver)', category: 'COMMODITIES', flag: '🥈', type: 'Precious Metal', digits: 3, pipMultiplier: 100, description: 'Spot Silver / US Dollar' },
  { id: 'BRENT', name: 'BRENT Crude Oil', category: 'COMMODITIES', flag: '🛢️', type: 'Energy Commodity', digits: 2, pipMultiplier: 100, description: 'Brent North Sea Crude' },
  { id: 'WTI', name: 'WTI Light Sweet', category: 'COMMODITIES', flag: '⛽', type: 'Energy Commodity', digits: 2, pipMultiplier: 100, description: 'West Texas Intermediate Crude' },

  // Crypto
  { id: 'BTCUSDT', name: 'BTC/USDT', category: 'CRYPTO', flag: '₿', type: 'Cryptocurrency', digits: 2, pipMultiplier: 1, description: 'Bitcoin / Tether USD' },
  { id: 'ETHUSDT', name: 'ETH/USDT', category: 'CRYPTO', flag: 'Ξ', type: 'Cryptocurrency', digits: 2, pipMultiplier: 1, description: 'Ethereum / Tether USD' },
  { id: 'SOLUSDT', name: 'SOL/USDT', category: 'CRYPTO', flag: '◎', type: 'Cryptocurrency', digits: 2, pipMultiplier: 10, description: 'Solana / Tether USD' },
  { id: 'BNBUSDT', name: 'BNB/USDT', category: 'CRYPTO', flag: '🟡', type: 'Cryptocurrency', digits: 2, pipMultiplier: 10, description: 'BNB / Tether USD' },
  { id: 'XRPUSDT', name: 'XRP/USDT', category: 'CRYPTO', flag: '✕', type: 'Cryptocurrency', digits: 4, pipMultiplier: 1000, description: 'XRP / Tether USD' },

  // Indices
  { id: 'US30', name: 'US30 (Dow Jones)', category: 'INDICES', flag: '🇺🇸 📈', type: 'Index', digits: 1, pipMultiplier: 1, description: 'Dow Jones Industrial Average' },
  { id: 'SPX500', name: 'SPX500 (S&P 500)', category: 'INDICES', flag: '🇺🇸 📊', type: 'Index', digits: 2, pipMultiplier: 10, description: 'Standard & Poor\'s 500' },
  { id: 'NAS100', name: 'NAS100 (Nasdaq)', category: 'INDICES', flag: '🇺🇸 💻', type: 'Index', digits: 2, pipMultiplier: 10, description: 'Nasdaq 100 Tech' },
  { id: 'GER40', name: 'GER40 (DAX)', category: 'INDICES', flag: '🇩🇪 📈', type: 'Index', digits: 1, pipMultiplier: 1, description: 'German DAX 40' },

  // Stocks
  { id: 'AAPL', name: 'AAPL (Apple)', category: 'STOCKS', flag: '🍎', type: 'US Equity', digits: 2, pipMultiplier: 100, description: 'Apple Inc.' },
  { id: 'TSLA', name: 'TSLA (Tesla)', category: 'STOCKS', flag: '⚡', type: 'US Equity', digits: 2, pipMultiplier: 100, description: 'Tesla Inc.' },
  { id: 'NVDA', name: 'NVDA (NVIDIA)', category: 'STOCKS', flag: '🎮', type: 'US Equity', digits: 2, pipMultiplier: 100, description: 'NVIDIA Corp.' },
  { id: 'MSFT', name: 'MSFT (Microsoft)', category: 'STOCKS', flag: '🪟', type: 'US Equity', digits: 2, pipMultiplier: 100, description: 'Microsoft Corp.' },
];

const TIMEFRAMES = [
  { id: '1m', label: '1m', desc: '1 Minute' },
  { id: '5m', label: '5m', desc: '5 Minutes' },
  { id: '15m', label: '15m', desc: '15 Minutes' },
  { id: '1H', label: '1H', desc: '1 Hour' },
  { id: '4H', label: '4H', desc: '4 Hours' },
  { id: '1D', label: '1D', desc: 'Daily' },
  { id: '1W', label: '1W', desc: 'Weekly' },
  { id: '1M', label: '1M', desc: 'Monthly' },
];

export const BacktestingSuite: React.FC<BacktestingSuiteProps> = ({
  activeAccount,
  onAutoLogTrade,
  onNavigateToJournal,
}) => {
  // Chart & Instrument Selection State
  const [selectedInstrument, setSelectedInstrument] = useState<BacktestInstrument>(DEFAULT_INSTRUMENTS[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('15m');
  const [isSymbolModalOpen, setIsSymbolModalOpen] = useState<boolean>(false);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState<string>('');
  const [symbolCategoryFilter, setSymbolCategoryFilter] = useState<string>('ALL');

  // Chart Data State
  const [allCandles, setAllCandles] = useState<CandlestickPoint[]>([]);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true);
  const [dataSourceName, setDataSourceName] = useState<string>('Twelve Data API');
  const [dataErrorMessage, setDataErrorMessage] = useState<string | null>(null);

  // Indicators State
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState<boolean>(false);
  const [showSMA20, setShowSMA20] = useState<boolean>(true);
  const [showSMA50, setShowSMA50] = useState<boolean>(false);
  const [showEMA9, setShowEMA9] = useState<boolean>(false);
  const [showEMA21, setShowEMA21] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(false);
  const [showRSI, setShowRSI] = useState<boolean>(false);
  const [showMACD, setShowMACD] = useState<boolean>(false);
  const [showStochastic, setShowStochastic] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<DrawingToolType>('CURSOR');
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [currentDraftDrawing, setCurrentDraftDrawing] = useState<DrawingItem | null>(null);

  // Replay State
  const [isReplayActive, setIsReplayActive] = useState<boolean>(false);
  const [isSelectingCutPoint, setIsSelectingCutPoint] = useState<boolean>(false);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [replaySpeedMs, setReplaySpeedMs] = useState<number>(500); // ms per bar
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulation & Paper Trading State
  const [simStartingBalance] = useState<number>(activeAccount?.currentBalance || 10000);
  const [simBalance, setSimBalance] = useState<number>(activeAccount?.currentBalance || 10000);
  const [simTrades, setSimTrades] = useState<SimulatedOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<SimulatedOrder | null>(null);
  const [orderLotSize, setOrderLotSize] = useState<number>(1.0);
  const [orderStopLossPips, setOrderStopLossPips] = useState<number>(25);
  const [orderTakeProfitPips, setOrderTakeProfitPips] = useState<number>(50);
  const [isTradePanelOpen, setIsTradePanelOpen] = useState<boolean>(true);
  const [tradeToast, setTradeToast] = useState<string | null>(null);

  // Providers & API Keys Modal
  const [isProvidersModalOpen, setIsProvidersModalOpen] = useState<boolean>(false);
  const [providersData, setProvidersData] = useState<any[]>([]);

  // Chart DOM Refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema9SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const svgOverlayRef = useRef<SVGSVGElement>(null);

  // Load Data for Selected Instrument and Timeframe
  const loadHistoricalData = useCallback(async () => {
    setIsLoadingCandles(true);
    setDataErrorMessage(null);

    try {
      const params = new URLSearchParams({
        instrument: selectedInstrument.id,
        timeframe: selectedTimeframe,
        limit: '800',
      });

      const res = await fetch(`/api/backtest/history?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.ok && Array.isArray(json.candles) && json.candles.length > 0) {
        setAllCandles(json.candles);
        setDataSourceName(json.source || 'Twelve Data API');
        setReplayIndex(json.candles.length - 1);
      } else {
        throw new Error(json.error || 'No candles returned for this pair');
      }
    } catch (err: any) {
      console.warn('[BACKTEST CLIENT ERROR]', err);
      setDataErrorMessage(err?.message || 'Failed to load historical data');
    } finally {
      setIsLoadingCandles(false);
    }
  }, [selectedInstrument.id, selectedTimeframe]);

  useEffect(() => {
    loadHistoricalData();
  }, [loadHistoricalData]);

  // Fetch Providers Status
  const loadProvidersStatus = async () => {
    try {
      const res = await fetch('/api/backtest/providers');
      if (res.ok) {
        const data = await res.json();
        setProvidersData(data.providers || []);
      }
    } catch {}
  };

  useEffect(() => {
    loadProvidersStatus();
  }, []);

  // Compute Visible Candles based on Replay Mode
  const visibleCandles = useMemo(() => {
    if (!allCandles || allCandles.length === 0) return [];
    if (!isReplayActive) return allCandles;
    return allCandles.slice(0, Math.max(1, replayIndex + 1));
  }, [allCandles, isReplayActive, replayIndex]);

  const currentReplayCandle = useMemo(() => {
    if (visibleCandles.length === 0) return null;
    return visibleCandles[visibleCandles.length - 1];
  }, [visibleCandles]);

  // Initialize and Configure Lightweight Charts Instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up prior instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#090e17' },
        textColor: '#94a3b8',
        fontSize: 12,
        fontFamily: "'JetBrains Mono', 'Plus Jakarta Sans', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#38bdf8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0284c7',
        },
        horzLine: {
          color: '#38bdf8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0284c7',
        },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        autoScale: true,
      },
    });

    chartInstanceRef.current = chart;

    // Add Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    // Add Volume Series on separate scale
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
    });
    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Add Moving Average Series
    sma20SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 2,
      title: 'SMA 20',
    });

    sma50SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      title: 'SMA 50',
    });

    ema9SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#ec4899',
      lineWidth: 1,
      lineStyle: LineStyle.Dotted,
      title: 'EMA 9',
    });

    ema21SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#06b6d4',
      lineWidth: 2,
      title: 'EMA 21',
    });

    // Bollinger Bands Series
    bbUpperSeriesRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(168, 85, 247, 0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: 'BB Upper',
    });
    bbMiddleSeriesRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(168, 85, 247, 0.9)',
      lineWidth: 1,
      title: 'BB Mid',
    });
    bbLowerSeriesRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(168, 85, 247, 0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: 'BB Lower',
    });

    // Handle Window Resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  // Update Data and Indicators on Series
  useEffect(() => {
    if (!candleSeriesRef.current || visibleCandles.length === 0) return;

    // Lightweight charts requires strictly ascending UTC timestamps in seconds
    const formattedCandles = visibleCandles.map((c) => ({
      time: Math.floor(c.time / 1000) as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    // Remove duplicates
    const uniqueCandles: typeof formattedCandles = [];
    const seenTimes = new Set<number>();
    for (const c of formattedCandles) {
      if (!seenTimes.has(c.time)) {
        seenTimes.add(c.time);
        uniqueCandles.push(c);
      }
    }

    candleSeriesRef.current.setData(uniqueCandles);

    // Update Volume
    if (volumeSeriesRef.current) {
      if (showVolume) {
        const volData = formatVolumeSeries(visibleCandles).map((v) => ({
          time: Math.floor(v.time / 1000) as UTCTimestamp,
          value: v.value,
          color: v.color,
        }));
        volumeSeriesRef.current.setData(volData);
      } else {
        volumeSeriesRef.current.setData([]);
      }
    }

    // Update SMA 20
    if (sma20SeriesRef.current) {
      if (showSMA20) {
        const sma20 = calculateSMA(visibleCandles, 20).map((p) => ({
          time: Math.floor(p.time / 1000) as UTCTimestamp,
          value: p.value,
        }));
        sma20SeriesRef.current.setData(sma20);
      } else {
        sma20SeriesRef.current.setData([]);
      }
    }

    // Update SMA 50
    if (sma50SeriesRef.current) {
      if (showSMA50) {
        const sma50 = calculateSMA(visibleCandles, 50).map((p) => ({
          time: Math.floor(p.time / 1000) as UTCTimestamp,
          value: p.value,
        }));
        sma50SeriesRef.current.setData(sma50);
      } else {
        sma50SeriesRef.current.setData([]);
      }
    }

    // Update EMA 9
    if (ema9SeriesRef.current) {
      if (showEMA9) {
        const ema9 = calculateEMA(visibleCandles, 9).map((p) => ({
          time: Math.floor(p.time / 1000) as UTCTimestamp,
          value: p.value,
        }));
        ema9SeriesRef.current.setData(ema9);
      } else {
        ema9SeriesRef.current.setData([]);
      }
    }

    // Update EMA 21
    if (ema21SeriesRef.current) {
      if (showEMA21) {
        const ema21 = calculateEMA(visibleCandles, 21).map((p) => ({
          time: Math.floor(p.time / 1000) as UTCTimestamp,
          value: p.value,
        }));
        ema21SeriesRef.current.setData(ema21);
      } else {
        ema21SeriesRef.current.setData([]);
      }
    }

    // Update Bollinger Bands
    if (bbUpperSeriesRef.current && bbMiddleSeriesRef.current && bbLowerSeriesRef.current) {
      if (showBollinger) {
        const bb = calculateBollingerBands(visibleCandles, 20, 2.0);
        bbUpperSeriesRef.current.setData(
          bb.upper.map((p) => ({ time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value }))
        );
        bbMiddleSeriesRef.current.setData(
          bb.middle.map((p) => ({ time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value }))
        );
        bbLowerSeriesRef.current.setData(
          bb.lower.map((p) => ({ time: Math.floor(p.time / 1000) as UTCTimestamp, value: p.value }))
        );
      } else {
        bbUpperSeriesRef.current.setData([]);
        bbMiddleSeriesRef.current.setData([]);
        bbLowerSeriesRef.current.setData([]);
      }
    }
  }, [visibleCandles, showVolume, showSMA20, showSMA50, showEMA9, showEMA21, showBollinger]);

  // Replay Step Forward Logic
  const handleStepForward = useCallback(() => {
    if (replayIndex < allCandles.length - 1) {
      const nextIdx = replayIndex + 1;
      setReplayIndex(nextIdx);

      // Evaluate active simulated trade against the new candle
      if (activeOrder && activeOrder.status === 'OPEN') {
        const newCandle = allCandles[nextIdx];
        const pipVal = selectedInstrument.pipMultiplier;
        let isClosed = false;
        let exitPrice = 0;
        let outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' = 'BREAKEVEN';

        if (activeOrder.type === 'BUY') {
          // Check Stop Loss
          if (newCandle.low <= activeOrder.stopLoss) {
            isClosed = true;
            exitPrice = activeOrder.stopLoss;
            outcome = 'LOSS';
          } else if (newCandle.high >= activeOrder.takeProfit) {
            isClosed = true;
            exitPrice = activeOrder.takeProfit;
            outcome = 'WIN';
          }
        } else {
          // SELL order
          if (newCandle.high >= activeOrder.stopLoss) {
            isClosed = true;
            exitPrice = activeOrder.stopLoss;
            outcome = 'LOSS';
          } else if (newCandle.low <= activeOrder.takeProfit) {
            isClosed = true;
            exitPrice = activeOrder.takeProfit;
            outcome = 'WIN';
          }
        }

        if (isClosed) {
          const deltaPrice =
            activeOrder.type === 'BUY' ? exitPrice - activeOrder.entryPrice : activeOrder.entryPrice - exitPrice;
          const pips = deltaPrice * pipVal;
          const dollarPnl = pips * (activeOrder.lotSize * 10);
          const rMult =
            activeOrder.riskAmount > 0 ? Number((dollarPnl / activeOrder.riskAmount).toFixed(2)) : 0;

          const closedOrder: SimulatedOrder = {
            ...activeOrder,
            status: 'CLOSED',
            exitPrice,
            exitTime: newCandle.time,
            exitIndex: nextIdx,
            pnl: Number(dollarPnl.toFixed(2)),
            outcome,
            rMultiple: rMult,
            pipsGained: Number(pips.toFixed(1)),
          };

          setSimTrades((prev) => [closedOrder, ...prev]);
          setSimBalance((prev) => prev + dollarPnl);
          setActiveOrder(null);
          setTradeToast(
            outcome === 'WIN'
              ? `🎯 TAKE PROFIT HIT: +${pips.toFixed(1)} pips (+$${dollarPnl.toFixed(2)})`
              : `🛑 STOP LOSS HIT: ${pips.toFixed(1)} pips (-$${Math.abs(dollarPnl).toFixed(2)})`
          );
        }
      }
    } else {
      setIsPlaying(false);
    }
  }, [replayIndex, allCandles, activeOrder, selectedInstrument.pipMultiplier]);

  const handleStepBackward = () => {
    if (replayIndex > 50) {
      setReplayIndex(replayIndex - 1);
    }
  };

  // Replay Auto Play Loop
  useEffect(() => {
    if (isPlaying) {
      replayTimerRef.current = setInterval(() => {
        handleStepForward();
      }, replaySpeedMs);
    } else if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }

    return () => {
      if (replayTimerRef.current) {
        clearInterval(replayTimerRef.current);
      }
    };
  }, [isPlaying, replaySpeedMs, handleStepForward]);

  // Order Placement Execution
  const handlePlaceOrder = (type: 'BUY' | 'SELL') => {
    if (!currentReplayCandle) return;

    const currentPrice = currentReplayCandle.close;
    const pipMultiplier = selectedInstrument.pipMultiplier;
    const pipSize = 1 / pipMultiplier;

    const slDelta = orderStopLossPips * pipSize;
    const tpDelta = orderTakeProfitPips * pipSize;

    const stopLoss = type === 'BUY' ? currentPrice - slDelta : currentPrice + slDelta;
    const takeProfit = type === 'BUY' ? currentPrice + tpDelta : currentPrice - tpDelta;
    const riskDollars = orderStopLossPips * (orderLotSize * 10);

    const newOrder: SimulatedOrder = {
      id: `sim_${Date.now()}`,
      type,
      orderMode: 'MARKET',
      entryPrice: Number(currentPrice.toFixed(selectedInstrument.digits)),
      stopLoss: Number(stopLoss.toFixed(selectedInstrument.digits)),
      takeProfit: Number(takeProfit.toFixed(selectedInstrument.digits)),
      lotSize: orderLotSize,
      riskAmount: riskDollars,
      entryTime: currentReplayCandle.time,
      entryIndex: replayIndex,
      status: 'OPEN',
      notes: `${selectedInstrument.name} ${selectedTimeframe} Backtest execution`,
    };

    setActiveOrder(newOrder);
    setTradeToast(`🚀 Position Opened: ${type} ${orderLotSize} lot @ ${currentPrice.toFixed(selectedInstrument.digits)}`);
    setTimeout(() => setTradeToast(null), 4000);
  };

  const handleCloseActiveOrderManually = () => {
    if (!activeOrder || !currentReplayCandle) return;
    const currentPrice = currentReplayCandle.close;
    const pipMultiplier = selectedInstrument.pipMultiplier;
    const delta =
      activeOrder.type === 'BUY' ? currentPrice - activeOrder.entryPrice : activeOrder.entryPrice - currentPrice;
    const pips = delta * pipMultiplier;
    const dollarPnl = pips * (activeOrder.lotSize * 10);
    const rMult = activeOrder.riskAmount > 0 ? Number((dollarPnl / activeOrder.riskAmount).toFixed(2)) : 0;

    const closedOrder: SimulatedOrder = {
      ...activeOrder,
      status: 'CLOSED',
      exitPrice: currentPrice,
      exitTime: currentReplayCandle.time,
      exitIndex: replayIndex,
      pnl: Number(dollarPnl.toFixed(2)),
      outcome: dollarPnl >= 0 ? 'WIN' : 'LOSS',
      rMultiple: rMult,
      pipsGained: Number(pips.toFixed(1)),
    };

    setSimTrades((prev) => [closedOrder, ...prev]);
    setSimBalance((prev) => prev + dollarPnl);
    setActiveOrder(null);
    setTradeToast(`Closed Position: ${dollarPnl >= 0 ? '+' : ''}$${dollarPnl.toFixed(2)}`);
    setTimeout(() => setTradeToast(null), 3500);
  };

  // Log simulated trade to Trade Journal
  const handleLogTradeToJournal = (order: SimulatedOrder) => {
    if (!onAutoLogTrade) return;

    const isWin = order.outcome === 'WIN';
    const journalTrade: Trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tradeNumber: Math.floor(Math.random() * 9000) + 1000,
      accountId: activeAccount?.id || 'demo_account',
      date: new Date(order.entryTime).toISOString().slice(0, 10),
      time: new Date(order.entryTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      broker: 'Backtesting Suite (Institutional Feed)',
      accountType: activeAccount?.accountType || 'DEMO',
      accountSize: activeAccount?.initialBalance || 10000,
      instrument: selectedInstrument.id,
      direction: order.type,
      timeframe: 'M15',
      session: 'LONDON_NY_OVERLAP',
      status: 'CLOSED',
      result: isWin ? 'WIN' : 'LOSS',
      entryPrice: order.entryPrice,
      exitPrice: order.exitPrice || order.entryPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      lotSize: order.lotSize,
      riskAmount: order.riskAmount,
      riskPercent: (order.riskAmount / (activeAccount?.initialBalance || 10000)) * 100,
      profitLoss: order.pnl || 0,
      rMultiple: order.rMultiple || (isWin ? 2 : -1),
      pips: Math.abs(order.pipsGained || 0),
      strategy: 'Backtesting Replay Model',
      htfTrend: 'BULLISH',
      ltfTrend: 'BULLISH',
      marketStructure: 'Liquidity Sweep',
      alignmentScore: {
        htfDirection: 25,
        marketStructure: 20,
        entryModel: 20,
        riskManagement: 20,
        newsCondition: 15,
        totalQuality: 90,
      },
      preEmotion: 'CALM',
      postPsychology: {
        followedPlan: true,
        movedStopLoss: false,
        closedEarly: false,
        overtraded: false,
        revengeTraded: false,
        increasedLotSizeEmotionally: false,
      },
      ruleViolation: 'NONE',
      violatedRules: [],
      mistakeReason: isWin ? 'None (Flawless)' : 'Other',
      grade: isWin ? 'A+' : 'B',
      screenshots: {},
      notes: `[Backtesting Suite] ${order.notes || ''} | PnL: $${order.pnl?.toFixed(2)} | Pips: ${order.pipsGained}`,
    };

    onAutoLogTrade(journalTrade);
    setTradeToast(`Saved to Journal: ${journalTrade.instrument} ${journalTrade.direction}`);
    setTimeout(() => setTradeToast(null), 3000);
  };

  // Backtest Performance Metrics
  const winCount = simTrades.filter((t) => t.outcome === 'WIN').length;
  const lossCount = simTrades.filter((t) => t.outcome === 'LOSS').length;
  const totalClosed = simTrades.length;
  const winRate = totalClosed > 0 ? ((winCount / totalClosed) * 100).toFixed(1) : '0.0';
  const grossProfit = simTrades.reduce((acc, t) => (t.pnl && t.pnl > 0 ? acc + t.pnl : acc), 0);
  const grossLoss = Math.abs(simTrades.reduce((acc, t) => (t.pnl && t.pnl < 0 ? acc + t.pnl : acc), 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';
  const netPnl = simBalance - simStartingBalance;

  // Filtered Instruments List
  const filteredInstruments = useMemo(() => {
    return DEFAULT_INSTRUMENTS.filter((inst) => {
      const matchesCat = symbolCategoryFilter === 'ALL' || inst.category === symbolCategoryFilter;
      const matchesQuery =
        inst.name.toLowerCase().includes(symbolSearchQuery.toLowerCase()) ||
        inst.id.toLowerCase().includes(symbolSearchQuery.toLowerCase()) ||
        inst.description.toLowerCase().includes(symbolSearchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [symbolCategoryFilter, symbolSearchQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[720px] bg-[#070b14] text-slate-100 overflow-hidden font-sans border border-slate-800/80 rounded-xl shadow-2xl relative">
      {/* ───────────────────────────────────────────────────────────
          TOP TRADINGVIEW-STYLE HEADER TOOLBAR
          ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0c1220] border-b border-slate-800/90 text-sm select-none gap-2 flex-wrap sm:flex-nowrap">
        {/* Left Section: Symbol & Timeframe & Indicators */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Symbol Selector Button */}
          <button
            onClick={() => setIsSymbolModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/70 rounded-md font-semibold text-slate-100 transition-colors shadow-sm"
            title="Search and change instrument"
          >
            <span className="text-base">{selectedInstrument.flag}</span>
            <span className="font-mono tracking-wide">{selectedInstrument.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="h-5 w-px bg-slate-800 mx-1" />

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-0.5 bg-slate-900/90 p-0.5 rounded-md border border-slate-800">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                onClick={() => setSelectedTimeframe(tf.id)}
                className={`px-2 py-1 text-xs font-mono font-medium rounded transition-all ${
                  selectedTimeframe === tf.id
                    ? 'bg-sky-500 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={tf.desc}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-800 mx-1" />

          {/* Indicators Dropdown Button */}
          <button
            onClick={() => setIsIndicatorsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/50 rounded-md text-xs font-medium text-slate-200 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Indicators</span>
            {(showSMA20 || showEMA21 || showBollinger || showRSI || showMACD) && (
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            )}
          </button>

          {/* Replay Mode Trigger Button */}
          <button
            onClick={() => {
              setIsReplayActive(!isReplayActive);
              if (!isReplayActive) {
                // Rewind 50 bars by default to start replay
                setReplayIndex(Math.max(20, allCandles.length - 80));
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
              isReplayActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-slate-800/60 text-slate-300 border-slate-700/50 hover:bg-slate-700/60'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isReplayActive ? 'text-amber-400 animate-spin-reverse' : ''}`} />
            <span>Bar Replay</span>
          </button>
        </div>

        {/* Right Section: Data Feed Badge, Reset, Providers */}
        <div className="flex items-center gap-2">
          {/* Data Feed Source Badge */}
          <button
            onClick={() => setIsProvidersModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md text-emerald-300 text-xs font-mono transition-colors"
            title="Click to view data sources & free API configuration"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="truncate max-w-[140px] sm:max-w-none">{dataSourceName}</span>
            <Info className="w-3 h-3 text-emerald-400/80 ml-0.5" />
          </button>

          {/* Toggle Simulator Trading Panel */}
          <button
            onClick={() => setIsTradePanelOpen(!isTradePanelOpen)}
            className={`p-1.5 rounded-md border text-xs transition-colors ${
              isTradePanelOpen
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-800/60 text-slate-400 border-slate-700/50 hover:text-slate-200'
            }`}
            title="Toggle Paper Trading Execution Panel"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Refresh Data */}
          <button
            onClick={loadHistoricalData}
            disabled={isLoadingCandles}
            className="p-1.5 bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/50 rounded-md text-slate-300 hover:text-white transition-colors"
            title="Refresh historical data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingCandles ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          REPLAY CONTROLS TOOLBAR (Active in Replay Mode)
          ─────────────────────────────────────────────────────────── */}
      {isReplayActive && (
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 border-b border-amber-500/30 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-semibold text-amber-400 uppercase tracking-wider text-[11px]">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Bar-by-Bar Replay
            </span>

            {/* Jump to Cut Point */}
            <button
              onClick={() => {
                const targetIdx = Math.max(10, replayIndex - 50);
                setReplayIndex(targetIdx);
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded flex items-center gap-1"
              title="Rewind 50 bars"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Jump Back 50 Bars</span>
            </button>

            {/* Play / Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1 font-semibold rounded flex items-center gap-1.5 transition-all ${
                isPlaying
                  ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                  : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Step 1 Bar Forward */}
            <button
              onClick={handleStepForward}
              disabled={isPlaying}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1 disabled:opacity-50"
              title="Advance 1 candle forward"
            >
              <SkipForward className="w-3.5 h-3.5 text-sky-400" />
              <span>Step 1 Bar</span>
            </button>

            {/* Step 1 Bar Backward */}
            <button
              onClick={handleStepBackward}
              disabled={isPlaying}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded flex items-center gap-1 disabled:opacity-50"
              title="Step 1 candle back"
            >
              <SkipBack className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center gap-1 ml-2 text-slate-400">
              <span>Speed:</span>
              {[
                { label: '0.1s', ms: 100 },
                { label: '0.5s', ms: 500 },
                { label: '1s', ms: 1000 },
                { label: '2s', ms: 2000 },
              ].map((s) => (
                <button
                  key={s.ms}
                  onClick={() => setReplaySpeedMs(s.ms)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                    replaySpeedMs === s.ms ? 'bg-amber-500/30 text-amber-300 font-bold' : 'hover:text-slate-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Current Replay Timestamp & Scrubber */}
          <div className="flex items-center gap-3">
            {currentReplayCandle && (
              <span className="font-mono text-slate-300 text-[11px]">
                {new Date(currentReplayCandle.time).toUTCString().slice(0, 22)}
              </span>
            )}
            <span className="text-slate-400 font-mono text-[11px]">
              Bar {replayIndex + 1} / {allCandles.length}
            </span>
            <button
              onClick={() => {
                setReplayIndex(allCandles.length - 1);
                setIsPlaying(false);
              }}
              className="text-amber-400 hover:text-amber-300 underline font-semibold text-[11px]"
            >
              Jump to Real-Time
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MAIN WORKSPACE: LEFT DRAWING TOOLBAR + CHART CANVAS + RIGHT SIMULATOR
          ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT TOOLBAR: TRADINGVIEW DRAWING SUITE */}
        <div className="w-11 bg-[#0a0f1c] border-r border-slate-800/80 flex flex-col items-center py-2.5 gap-2 select-none z-10 shrink-0">
          {[
            { id: 'CURSOR' as DrawingToolType, icon: Navigation, label: 'Crosshair / Pointer' },
            { id: 'TRENDLINE' as DrawingToolType, icon: TrendingUp, label: 'Trendline' },
            { id: 'HORIZONTAL_LINE' as DrawingToolType, icon: Minus, label: 'Horizontal S/R Line' },
            { id: 'FIBONACCI' as DrawingToolType, icon: Sliders, label: 'Fibonacci Retracement' },
            { id: 'RECTANGLE' as DrawingToolType, icon: Square, label: 'Rectangle / Order Block Zone' },
            { id: 'LONG_POSITION' as DrawingToolType, icon: Target, label: 'Long Position Risk/Reward' },
            { id: 'SHORT_POSITION' as DrawingToolType, icon: Target, label: 'Short Position Risk/Reward' },
            { id: 'TEXT_NOTE' as DrawingToolType, icon: Type, label: 'Text Annotation' },
          ].map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`p-2 rounded-lg transition-all relative group ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-[0_0_12px_rgba(14,165,233,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
                title={tool.label}
              >
                <Icon className="w-4 h-4" />
                {/* Tooltip */}
                <div className="absolute left-12 px-2 py-1 bg-slate-900 border border-slate-700 text-slate-100 text-[11px] rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                  {tool.label}
                </div>
              </button>
            );
          })}

          <div className="w-6 h-px bg-slate-800 my-1" />

          {/* Clear Drawings Button */}
          <button
            onClick={() => setDrawings([])}
            className="p-2 text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Clear All Drawings"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* CENTER: LIGHTWEIGHT CHARTS CANVAS */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          {/* Active Toast Notification */}
          {tradeToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-slate-900/95 border border-sky-500/50 text-sky-200 text-xs font-semibold rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>{tradeToast}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoadingCandles && (
            <div className="absolute inset-0 z-30 bg-[#090e17]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-slate-200 text-sm font-medium">Fetching real market history for {selectedInstrument.name}...</p>
              <p className="text-slate-400 text-xs font-mono">Multi-tier cascade: Twelve Data → Dukascopy → Yahoo → Binance</p>
            </div>
          )}

          {/* Error Banner */}
          {dataErrorMessage && (
            <div className="absolute top-3 left-4 right-4 z-20 p-3 bg-rose-950/80 border border-rose-500/50 rounded-lg text-rose-200 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{dataErrorMessage}</span>
              </div>
              <button
                onClick={loadHistoricalData}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded"
              >
                Retry
              </button>
            </div>
          )}

          {/* Chart Container for TradingView lightweight-charts */}
          <div ref={chartContainerRef} className="flex-1 w-full h-full relative" />

          {/* Active Trade On-Chart Floating HUD */}
          {activeOrder && currentReplayCandle && (
            <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 text-xs shadow-2xl backdrop-blur-md flex items-center gap-4">
              <div>
                <span
                  className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                    activeOrder.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {activeOrder.type} {activeOrder.lotSize}L
                </span>
                <p className="text-slate-400 text-[11px] mt-1 font-mono">
                  Entry: {activeOrder.entryPrice.toFixed(selectedInstrument.digits)}
                </p>
              </div>

              <div>
                <p className="text-slate-400 text-[10px]">CURRENT P&L</p>
                {(() => {
                  const currentPrice = currentReplayCandle.close;
                  const delta =
                    activeOrder.type === 'BUY'
                      ? currentPrice - activeOrder.entryPrice
                      : activeOrder.entryPrice - currentPrice;
                  const pips = delta * selectedInstrument.pipMultiplier;
                  const dollar = pips * (activeOrder.lotSize * 10);
                  const isProfit = dollar >= 0;
                  return (
                    <p className={`font-mono font-bold text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isProfit ? '+' : ''}${dollar.toFixed(2)} ({pips.toFixed(1)} pips)
                    </p>
                  );
                })()}
              </div>

              <div className="h-7 w-px bg-slate-800" />

              <div className="text-[11px] font-mono text-slate-300">
                <span className="text-rose-400">SL: {activeOrder.stopLoss.toFixed(selectedInstrument.digits)}</span>
                <span className="mx-2 text-slate-600">|</span>
                <span className="text-emerald-400">TP: {activeOrder.takeProfit.toFixed(selectedInstrument.digits)}</span>
              </div>

              <button
                onClick={handleCloseActiveOrderManually}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-semibold text-xs"
              >
                Close Now
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: SIMULATED BACKTEST EXECUTION & PERFORMANCE LEDGER */}
        {isTradePanelOpen && (
          <div className="w-80 bg-[#0a0f1c] border-l border-slate-800/80 flex flex-col shrink-0 text-xs">
            {/* Simulator Header */}
            <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-1.5 font-semibold text-slate-100">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Strategy Execution Simulator</span>
              </div>
              <button
                onClick={() => setIsTradePanelOpen(false)}
                className="text-slate-400 hover:text-slate-200"
                title="Collapse panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Account Equity Metrics */}
            <div className="p-3 bg-slate-900/40 border-b border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-400">
                <span>Simulated Equity:</span>
                <span className="font-mono text-slate-100 font-bold text-sm">{formatCurrency(simBalance)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Net Return:</span>
                <span
                  className={`font-mono font-bold ${
                    netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {netPnl >= 0 ? '+' : ''}
                  {formatCurrency(netPnl)} ({(((simBalance - simStartingBalance) / simStartingBalance) * 100).toFixed(2)}%)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1 text-center font-mono">
                <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Win Rate</span>
                  <span className="font-bold text-sky-400">{winRate}%</span>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Trades</span>
                  <span className="font-bold text-slate-200">{totalClosed}</span>
                </div>
                <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Profit Factor</span>
                  <span className="font-bold text-emerald-400">{profitFactor}</span>
                </div>
              </div>
            </div>

            {/* Order Execution Inputs */}
            <div className="p-3 border-b border-slate-800 space-y-3">
              <p className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">Place Simulated Order</p>

              <div>
                <label className="text-slate-400 block text-[11px] mb-1">Lot Size:</label>
                <div className="flex items-center gap-1.5">
                  {[0.1, 0.5, 1.0, 2.0].map((size) => (
                    <button
                      key={size}
                      onClick={() => setOrderLotSize(size)}
                      className={`flex-1 py-1 text-xs font-mono rounded border ${
                        orderLotSize === size
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">Stop Loss (pips):</label>
                  <input
                    type="number"
                    value={orderStopLossPips}
                    onChange={(e) => setOrderStopLossPips(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block text-[11px] mb-1">Take Profit (pips):</label>
                  <input
                    type="number"
                    value={orderTakeProfitPips}
                    onChange={(e) => setOrderTakeProfitPips(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* BUY / SELL Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handlePlaceOrder('BUY')}
                  disabled={Boolean(activeOrder)}
                  className="py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-lg shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>BUY MARKET</span>
                </button>
                <button
                  onClick={() => handlePlaceOrder('SELL')}
                  disabled={Boolean(activeOrder)}
                  className="py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold rounded-lg shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>SELL MARKET</span>
                </button>
              </div>

              {activeOrder && (
                <p className="text-[11px] text-amber-400 text-center">
                  1 trade currently active. Step forward or click Close to finish.
                </p>
              )}
            </div>

            {/* Backtest Closed Trades Ledger */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span className="font-semibold uppercase tracking-wider">Executed Trades Log ({simTrades.length})</span>
                {simTrades.length > 0 && (
                  <button onClick={() => setSimTrades([])} className="text-slate-500 hover:text-slate-300">
                    Clear Log
                  </button>
                )}
              </div>

              {simTrades.length === 0 ? (
                <div className="p-4 text-center text-slate-500 italic">
                  No completed trades yet. Use Bar Replay and place Buy/Sell orders to test your edge.
                </div>
              ) : (
                simTrades.map((trade) => {
                  const isWin = trade.outcome === 'WIN';
                  return (
                    <div
                      key={trade.id}
                      className="p-2.5 bg-slate-900/70 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trade.type === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {trade.type} {trade.lotSize}L
                        </span>
                        <span
                          className={`font-mono font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}
                        >
                          {isWin ? '+' : ''}${trade.pnl?.toFixed(2)} ({trade.pipsGained}p)
                        </span>
                      </div>

                      <div className="flex justify-between text-[11px] font-mono text-slate-400">
                        <span>Entry: {trade.entryPrice}</span>
                        <span>Exit: {trade.exitPrice}</span>
                        <span>R:R: {trade.rMultiple}R</span>
                      </div>

                      {/* Log to Journal Action */}
                      <button
                        onClick={() => handleLogTradeToJournal(trade)}
                        className="w-full mt-1 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700/60 font-medium text-[10px] flex items-center justify-center gap-1 transition-colors"
                      >
                        <BookOpen className="w-3 h-3 text-sky-400" />
                        <span>Log to Permanent Journal</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────
          MODAL 1: INSTRUMENT SELECTOR SEARCH MODAL
          ─────────────────────────────────────────────────────────── */}
      {isSymbolModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-700 rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-base">Select Market Instrument</h3>
              </div>
              <button
                onClick={() => setIsSymbolModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search pairs (e.g. EURUSD, Gold, BTC, AAPL, US30)..."
                  value={symbolSearchQuery}
                  onChange={(e) => setSymbolSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  autoFocus
                />
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                {['ALL', 'FOREX', 'COMMODITIES', 'CRYPTO', 'INDICES', 'STOCKS'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSymbolCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      symbolCategoryFilter === cat
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Instruments List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/50">
              {filteredInstruments.map((inst) => (
                <button
                  key={inst.id}
                  onClick={() => {
                    setSelectedInstrument(inst);
                    setIsSymbolModalOpen(false);
                  }}
                  className={`w-full p-3 flex items-center justify-between hover:bg-slate-800/60 rounded-lg transition-colors text-left ${
                    selectedInstrument.id === inst.id ? 'bg-sky-500/10 border border-sky-500/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{inst.flag}</span>
                    <div>
                      <p className="font-bold text-slate-100 font-mono flex items-center gap-2">
                        {inst.name}
                        <span className="px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded text-[10px] font-sans">
                          {inst.category}
                        </span>
                      </p>
                      <p className="text-slate-400 text-xs">{inst.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-sky-400 font-semibold">{inst.type}</span>
                    <p className="text-[10px] text-slate-500 font-mono">100% Free Data</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL 2: INDICATORS CONFIGURATION MODAL
          ─────────────────────────────────────────────────────────── */}
      {isIndicatorsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-700 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-slate-100 text-base">TradingView Indicators</h3>
              </div>
              <button
                onClick={() => setIsIndicatorsModalOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Volume (Colored Bars)', active: showVolume, toggle: () => setShowVolume(!showVolume), color: '#10b981' },
                { label: 'SMA 20 (Simple Moving Average)', active: showSMA20, toggle: () => setShowSMA20(!showSMA20), color: '#f59e0b' },
                { label: 'SMA 50 (Trend Baseline)', active: showSMA50, toggle: () => setShowSMA50(!showSMA50), color: '#3b82f6' },
                { label: 'EMA 9 (Fast Momentum)', active: showEMA9, toggle: () => setShowEMA9(!showEMA9), color: '#ec4899' },
                { label: 'EMA 21 (Dynamic S/R)', active: showEMA21, toggle: () => setShowEMA21(!showEMA21), color: '#06b6d4' },
                { label: 'Bollinger Bands (20, 2.0σ)', active: showBollinger, toggle: () => setShowBollinger(!showBollinger), color: '#a855f7' },
              ].map((ind, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-slate-900/60 rounded-lg border border-slate-800"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ind.color }} />
                    <span className="text-slate-200 text-sm font-medium">{ind.label}</span>
                  </div>
                  <button
                    onClick={ind.toggle}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      ind.active ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ind.active ? 'Active' : 'Add'}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setIsIndicatorsModalOpen(false)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL 3: PROVIDERS STATUS & FREE API KEYS GUIDE
          ─────────────────────────────────────────────────────────── */}
      {isProvidersModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-base">Data Providers & Free History Architecture</h3>
              </div>
              <button
                onClick={() => setIsProvidersModalOpen(false)}
                className="text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              PRIMEPIPFX Backtesting uses an automated multi-tier failover engine. 100% of data is sourced from free
              institutional tiers and cached to disk so you never pay any fees or experience rate limits:
            </p>

            <div className="space-y-2.5">
              {providersData.map((p, idx) => (
                <div key={idx} className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100 font-mono">{p.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'ACTIVE_FREE' || p.status === 'CONFIGURED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">{p.role}</p>
                  {p.envVar && (
                    <p className="text-[10px] font-mono text-slate-500">
                      Configured via env: <span className="text-sky-400">{p.envVar}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Simple Step Guide for Free Keys */}
            <div className="p-3 bg-sky-950/30 border border-sky-500/30 rounded-lg text-xs space-y-2">
              <p className="font-bold text-sky-300 flex items-center gap-1.5">
                <Key className="w-4 h-4" />
                How to Add Your Own Free API Keys (Optional)
              </p>
              <ol className="list-decimal list-inside text-slate-300 space-y-1 text-[11px]">
                <li>
                  <strong className="text-slate-200">Twelve Data</strong>: Register free at{' '}
                  <code className="text-sky-400">twelvedata.com</code> (800 free calls/day).
                </li>
                <li>
                  <strong className="text-slate-200">Alpha Vantage</strong>: Claim free key at{' '}
                  <code className="text-sky-400">alphavantage.co/support/#api-key</code>.
                </li>
                <li>
                  Paste keys into your environment as <code className="text-amber-300">TWELVE_DATA_API_KEY</code> and{' '}
                  <code className="text-amber-300">ALPHA_VANTAGE_API_KEY</code>.
                </li>
                <li>
                  <em>Note: Dukascopy, Yahoo Finance, and Binance operate 100% free with no keys required!</em>
                </li>
              </ol>
            </div>

            {/* Clear Cache Button */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/backtest/cache/clear', { method: 'POST' });
                    setTradeToast('Cache cleared successfully!');
                    setTimeout(() => setTradeToast(null), 3000);
                  } catch {}
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded border border-slate-700"
              >
                Clear Local Data Cache
              </button>

              <button
                onClick={() => setIsProvidersModalOpen(false)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
