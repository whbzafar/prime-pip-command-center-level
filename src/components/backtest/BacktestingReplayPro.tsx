import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Zap,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
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
  ShieldAlert,
  Sliders,
  Sparkles,
  RefreshCw,
  Search,
  BookOpen,
} from 'lucide-react';
import { AccountSettings, Trade } from '../../types';
import { calculateForexLotSize } from '../../utils/lotSize';
import { formatCurrency } from '../../utils/currencyFormatter';
import {
  HistoricalCandle,
  fetchReplayCandles,
  calculateEMA,
  detectFairValueGaps,
  FairValueGap,
} from '../../services/backtestDataService';

interface BacktestingReplayProProps {
  activeAccount: AccountSettings | null;
  onAutoLogTrade?: (trade: Trade) => void;
  onNavigateToJournal?: () => void;
}

interface SimulatedTrade {
  id: string;
  orderType: 'MARKET' | 'PENDING';
  pendingType?: 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  triggerPrice?: number;
  direction: 'BUY' | 'SELL';
  instrument: string;
  timeframe: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  lotSize: number;
  riskAmount: number;
  status: 'PENDING' | 'OPEN' | 'CLOSED';
  entryTime: number;
  entryCandleIndex: number;
  closeTime?: number;
  closeCandleIndex?: number;
  exitPrice?: number;
  result?: 'WIN' | 'LOSS' | 'BREAKEVEN';
  pnl?: number;
  rMultiple?: number;
  strategy: string;
  notes?: string;
}

const INSTRUMENT_LIST = [
  // Forex Majors & Minors (Dukascopy historical data feed)
  { id: 'EURUSD', name: 'EUR/USD', category: 'FOREX', flag: '🇪🇺 🇺🇸', type: 'Forex' },
  { id: 'GBPUSD', name: 'GBP/USD', category: 'FOREX', flag: '🇬🇧 🇺🇸', type: 'Forex' },
  { id: 'USDJPY', name: 'USD/JPY', category: 'FOREX', flag: '🇺🇸 🇯🇵', type: 'Forex' },
  { id: 'AUDUSD', name: 'AUD/USD', category: 'FOREX', flag: '🇦🇺 🇺🇸', type: 'Forex' },
  { id: 'USDCAD', name: 'USD/CAD', category: 'FOREX', flag: '🇺🇸 🇨🇦', type: 'Forex' },
  { id: 'USDCHF', name: 'USD/CHF', category: 'FOREX', flag: '🇺🇸 🇨🇭', type: 'Forex' },
  { id: 'NZDUSD', name: 'NZD/USD', category: 'FOREX', flag: '🇳🇿 🇺🇸', type: 'Forex' },
  { id: 'EURGBP', name: 'EUR/GBP', category: 'FOREX', flag: '🇪🇺 🇬🇧', type: 'Forex' },
  { id: 'GBPJPY', name: 'GBP/JPY', category: 'FOREX', flag: '🇬🇧 🇯🇵', type: 'Forex' },
  // Commodities
  { id: 'XAUUSD', name: 'XAU/USD (Gold)', category: 'COMMODITIES', flag: '🥇', type: 'Precious Metal' },
  // Crypto (Binance public historical REST API)
  { id: 'BTCUSDT', name: 'BTC/USDT', category: 'CRYPTO', flag: '₿', type: 'Crypto' },
  { id: 'ETHUSDT', name: 'ETH/USDT', category: 'CRYPTO', flag: 'Ξ', type: 'Crypto' },
  { id: 'SOLUSDT', name: 'SOL/USDT', category: 'CRYPTO', flag: '◎', type: 'Crypto' },
  { id: 'BNBUSDT', name: 'BNB/USDT', category: 'CRYPTO', flag: '🟡', type: 'Crypto' },
  { id: 'XRPUSDT', name: 'XRP/USDT', category: 'CRYPTO', flag: '✕', type: 'Crypto' },
];

const TIMEFRAME_OPTIONS = [
  { id: 'M1', label: '1m', desc: '1 Minute Scalp' },
  { id: 'M5', label: '5m', desc: '5 Minutes Intraday' },
  { id: 'M15', label: '15m', desc: '15 Minutes Execution' },
  { id: 'H1', label: '1h', desc: '1 Hour Structure' },
  { id: 'H4', label: '4h', desc: '4 Hours Trend' },
  { id: 'D1', label: '1D', desc: 'Daily Session' },
];

export const BacktestingReplayPro: React.FC<BacktestingReplayProProps> = ({
  activeAccount,
  onAutoLogTrade,
  onNavigateToJournal,
}) => {
  // 1. Configuration State
  const [selectedInstrument, setSelectedInstrument] = useState<string>('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('M15');
  const [startDateStr, setStartDateStr] = useState<string>(() => {
    // Default to 30 days ago
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });

  // 2. Data State
  const [candles, setCandles] = useState<HistoricalCandle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 3. Replay Engine Cursor & Playback
  // Only candles from 0 to cursorIndex are visible (future candles hidden)
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x
  const [chartViewCandlesCount, setChartViewCandlesCount] = useState<number>(80);

  // 4. Indicator Overlays
  const [showEMA20, setShowEMA20] = useState<boolean>(true);
  const [showEMA50, setShowEMA50] = useState<boolean>(true);
  const [showFVG, setShowFVG] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);

  // 5. Simulated Trading State
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);
  const [orderMode, setOrderMode] = useState<'MARKET' | 'PENDING'>('MARKET');
  const [pendingType, setPendingType] = useState<'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP'>('BUY_LIMIT');
  const [triggerPriceInput, setTriggerPriceInput] = useState<string>('');
  const [orderDirection, setOrderDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [riskPercent, setRiskPercent] = useState<number>(() => activeAccount?.maxRiskPerTradePercent || 1.0);
  const [stopLossInput, setStopLossInput] = useState<string>('');
  const [takeProfitInput, setTakeProfitInput] = useState<string>('');
  const [strategyTag, setStrategyTag] = useState<string>('SBT Model 1 - Liquidity Sweep');
  const [tradeNotes, setTradeNotes] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const replayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Current replayed candle
  const currentCandle = candles[cursorIndex] || null;

  // Initial Data Fetch
  const handleLoadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsPlaying(false);
    try {
      const result = await fetchReplayCandles(
        selectedInstrument,
        selectedTimeframe,
        startDateStr,
        600
      );

      if (result.ok && result.candles.length > 0) {
        setCandles(result.candles);
        setDataSource(result.source);
        // Start replay at candle 30 so user has initial context to evaluate
        const initialCursor = Math.min(30, result.candles.length - 1);
        setCursorIndex(initialCursor);
        setToastMessage(`Loaded ${result.candles.length} historical candles (${result.source})`);
      } else {
        setErrorMessage(result.error || 'Failed to fetch historical market data.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error loading historical candles.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedInstrument, selectedTimeframe, startDateStr]);

  // Load default data on first mount
  useEffect(() => {
    handleLoadData();
  }, []);

  // Update default SL & TP whenever currentCandle changes or user flips direction
  useEffect(() => {
    if (!currentCandle) return;
    const price = currentCandle.close;
    const isGold = selectedInstrument.includes('XAU');
    const isCrypto = selectedInstrument.includes('BTC') || selectedInstrument.includes('ETH') || selectedInstrument.includes('SOL');
    const isJpy = selectedInstrument.includes('JPY');

    let defaultSlDistance: number;
    if (isCrypto) {
      defaultSlDistance = price * 0.015; // 1.5%
    } else if (isGold) {
      defaultSlDistance = 5.0; // $5 move
    } else if (isJpy) {
      defaultSlDistance = 0.30; // 30 pips
    } else {
      defaultSlDistance = 0.0020; // 20 pips
    }

    const sl = orderDirection === 'BUY' ? price - defaultSlDistance : price + defaultSlDistance;
    const tp = orderDirection === 'BUY' ? price + defaultSlDistance * 2 : price - defaultSlDistance * 2;

    const decimals = isCrypto ? 2 : isGold ? 2 : isJpy ? 3 : 5;
    setStopLossInput(sl.toFixed(decimals));
    setTakeProfitInput(tp.toFixed(decimals));
    setTriggerPriceInput(price.toFixed(decimals));
  }, [currentCandle?.close, orderDirection, selectedInstrument]);

  // Evaluate open simulated trades and pending orders against a candle
  const processTradeEventsForCandle = useCallback(
    (candle: HistoricalCandle, candleIdx: number) => {
      setTrades((prevTrades) => {
        let hasChanges = false;
        const updated = prevTrades.map((trade) => {
          // 1. Process Pending Orders
          if (trade.status === 'PENDING') {
            const trig = trade.triggerPrice || trade.entryPrice;
            const touchesTrigger = candle.low <= trig && candle.high >= trig;
            if (touchesTrigger) {
              hasChanges = true;
              return {
                ...trade,
                status: 'OPEN' as const,
                entryPrice: trig,
                entryTime: candle.time,
                entryCandleIndex: candleIdx,
              };
            }
            return trade;
          }

          // 2. Process Open Orders
          if (trade.status === 'OPEN') {
            let hitSl = false;
            let hitTp = false;

            if (trade.direction === 'BUY') {
              hitSl = candle.low <= trade.stopLoss;
              hitTp = candle.high >= trade.takeProfit;
            } else {
              hitSl = candle.high >= trade.stopLoss;
              hitTp = candle.low <= trade.takeProfit;
            }

            if (hitSl || hitTp) {
              hasChanges = true;
              const exitPrice = hitSl ? trade.stopLoss : trade.takeProfit;
              const isWin = hitTp;
              const pnl = isWin ? Math.abs(trade.riskAmount) * 2 : -Math.abs(trade.riskAmount);
              const rMult = isWin ? 2.0 : -1.0;

              const closedTrade: SimulatedTrade = {
                ...trade,
                status: 'CLOSED',
                exitPrice,
                closeTime: candle.time,
                closeCandleIndex: candleIdx,
                result: isWin ? 'WIN' : 'LOSS',
                pnl,
                rMultiple: rMult,
              };

              // Auto-log to existing journal
              if (onAutoLogTrade) {
                const journalEntry: Trade = {
                  id: `bt_${trade.id}`,
                  tradeNumber: Math.floor(Math.random() * 9000) + 1000,
                  date: new Date(candle.time).toISOString().slice(0, 10),
                  time: new Date(candle.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                  broker: 'Backtest Replay Pro (Historical)',
                  accountType: activeAccount?.accountType || 'DEMO',
                  accountSize: activeAccount?.initialBalance || 10000,
                  instrument: trade.instrument,
                  direction: trade.direction,
                  timeframe: trade.timeframe as any,
                  session: 'LONDON_NY_OVERLAP',
                  status: 'CLOSED',
                  result: isWin ? 'WIN' : 'LOSS',
                  entryPrice: trade.entryPrice,
                  stopLoss: trade.stopLoss,
                  takeProfit: trade.takeProfit,
                  exitPrice,
                  lotSize: trade.lotSize,
                  riskAmount: trade.riskAmount,
                  riskPercent: trade.riskAmount / (activeAccount?.initialBalance || 10000) * 100,
                  profitLoss: pnl,
                  rMultiple: rMult,
                  pips: Math.abs(exitPrice - trade.entryPrice) * 10000,
                  strategy: trade.strategy,
                  htfTrend: 'BULLISH',
                  ltfTrend: 'BULLISH',
                  marketStructure: 'Liquidity Sweep',
                  alignmentScore: {
                    htfDirection: 25,
                    marketStructure: 20,
                    entryModel: 20,
                    riskManagement: 20,
                    newsCondition: 15,
                    totalQuality: 95,
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
                  mistakeReason: isWin ? 'Other' : 'Strategy Mistake',
                  grade: isWin ? 'A+' : 'A',
                  screenshots: {},
                  notes: `[Backtest Replay Pro] ${trade.notes || trade.strategy}. Simulated historical trade.`,
                };
                onAutoLogTrade(journalEntry);
              }

              return closedTrade;
            }
          }

          return trade;
        });

        return hasChanges ? updated : prevTrades;
      });
    },
    [activeAccount, onAutoLogTrade]
  );

  // Advance Replay Engine by 1 Candle
  const stepForward = useCallback(() => {
    if (cursorIndex < candles.length - 1) {
      const nextIdx = cursorIndex + 1;
      setCursorIndex(nextIdx);
      const candle = candles[nextIdx];
      if (candle) {
        processTradeEventsForCandle(candle, nextIdx);
      }
    } else {
      setIsPlaying(false);
      setToastMessage('Reached the end of available historical candles.');
    }
  }, [cursorIndex, candles, processTradeEventsForCandle]);

  // Step backward by 1 Candle
  const stepBackward = useCallback(() => {
    if (cursorIndex > 1) {
      setCursorIndex((prev) => prev - 1);
    }
  }, [cursorIndex]);

  // Reset to Start
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCursorIndex(Math.min(30, candles.length - 1));
    setTrades([]);
    setToastMessage('Replay reset to starting position.');
  }, [candles.length]);

  // Playback Loop
  useEffect(() => {
    if (isPlaying) {
      const ms = Math.max(80, 1000 / playbackSpeed);
      replayIntervalRef.current = setInterval(() => {
        stepForward();
      }, ms);
    } else {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
        replayIntervalRef.current = null;
      }
    }

    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, stepForward]);

  // Calculated Position Size based on Account Balance and Risk %
  const calculatedPosition = useMemo(() => {
    if (!currentCandle) return { lotSize: 0.1, riskAmount: 100 };
    const price = orderMode === 'PENDING' && parseFloat(triggerPriceInput) > 0 ? parseFloat(triggerPriceInput) : currentCandle.close;
    const sl = parseFloat(stopLossInput);
    const balance = activeAccount?.currentBalance || activeAccount?.initialBalance || 10000;
    const slDistance = Math.abs(price - (isNaN(sl) ? price * 0.99 : sl));

    const res = calculateForexLotSize(
      balance,
      riskPercent,
      slDistance,
      selectedInstrument,
      activeAccount?.currency || 'USD'
    );
    return res;
  }, [currentCandle, orderMode, triggerPriceInput, stopLossInput, activeAccount, riskPercent, selectedInstrument]);

  // Place a Simulated Trade
  const handleExecuteTrade = () => {
    if (!currentCandle) return;
    const entryPrice = orderMode === 'PENDING' ? parseFloat(triggerPriceInput) : currentCandle.close;
    const sl = parseFloat(stopLossInput);
    const tp = parseFloat(takeProfitInput);

    if (isNaN(entryPrice) || isNaN(sl) || isNaN(tp)) {
      setToastMessage('Please enter valid Entry, Stop Loss, and Take Profit values.');
      return;
    }

    if (orderDirection === 'BUY' && (sl >= entryPrice || tp <= entryPrice)) {
      setToastMessage('For a BUY: Stop Loss must be below Entry, and Take Profit must be above Entry.');
      return;
    }

    if (orderDirection === 'SELL' && (sl <= entryPrice || tp >= entryPrice)) {
      setToastMessage('For a SELL: Stop Loss must be above Entry, and Take Profit must be below Entry.');
      return;
    }

    const newTrade: SimulatedTrade = {
      id: `bt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      orderType: orderMode,
      pendingType: orderMode === 'PENDING' ? pendingType : undefined,
      triggerPrice: orderMode === 'PENDING' ? entryPrice : undefined,
      direction: orderDirection,
      instrument: selectedInstrument,
      timeframe: selectedTimeframe,
      entryPrice,
      stopLoss: sl,
      takeProfit: tp,
      lotSize: calculatedPosition.lotSize,
      riskAmount: calculatedPosition.riskAmount,
      status: orderMode === 'PENDING' ? 'PENDING' : 'OPEN',
      entryTime: currentCandle.time,
      entryCandleIndex: cursorIndex,
      strategy: strategyTag,
      notes: tradeNotes,
    };

    setTrades((prev) => [newTrade, ...prev]);
    setToastMessage(`Simulated ${orderDirection} ${orderMode} order submitted at ${entryPrice}!`);
  };

  // Close an Open Trade Manually at Current Price
  const handleManualCloseTrade = (tradeId: string) => {
    if (!currentCandle) return;
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id === tradeId && t.status === 'OPEN') {
          const exitPrice = currentCandle.close;
          const isWin =
            t.direction === 'BUY' ? exitPrice > t.entryPrice : exitPrice < t.entryPrice;
          const diff = Math.abs(exitPrice - t.entryPrice);
          const slDiff = Math.abs(t.entryPrice - t.stopLoss);
          const rMult = slDiff > 0 ? (isWin ? diff / slDiff : -diff / slDiff) : 0;
          const pnl = rMult * t.riskAmount;

          const closed = {
            ...t,
            status: 'CLOSED' as const,
            exitPrice,
            closeTime: currentCandle.time,
            closeCandleIndex: cursorIndex,
            result: isWin ? ('WIN' as const) : ('LOSS' as const),
            pnl,
            rMultiple: rMult,
          };

          if (onAutoLogTrade) {
            const entry: Trade = {
              id: `bt_${t.id}`,
              tradeNumber: Math.floor(Math.random() * 9000) + 1000,
              date: new Date(currentCandle.time).toISOString().slice(0, 10),
              time: new Date(currentCandle.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
              broker: 'Backtest Replay Pro (Historical)',
              accountType: activeAccount?.accountType || 'DEMO',
              accountSize: activeAccount?.initialBalance || 10000,
              instrument: t.instrument,
              direction: t.direction,
              timeframe: t.timeframe as any,
              session: 'LONDON_NY_OVERLAP',
              status: 'CLOSED',
              result: isWin ? 'WIN' : 'LOSS',
              entryPrice: t.entryPrice,
              stopLoss: t.stopLoss,
              takeProfit: t.takeProfit,
              exitPrice,
              lotSize: t.lotSize,
              riskAmount: t.riskAmount,
              riskPercent: (t.riskAmount / (activeAccount?.initialBalance || 10000)) * 100,
              profitLoss: pnl,
              rMultiple: rMult,
              pips: Math.abs(exitPrice - t.entryPrice) * 10000,
              strategy: t.strategy,
              htfTrend: 'BULLISH',
              ltfTrend: 'BULLISH',
              marketStructure: 'Liquidity Sweep',
              alignmentScore: {
                htfDirection: 25,
                marketStructure: 20,
                entryModel: 20,
                riskManagement: 20,
                newsCondition: 15,
                totalQuality: 92,
              },
              preEmotion: 'CALM',
              postPsychology: {
                followedPlan: true,
                movedStopLoss: false,
                closedEarly: true,
                overtraded: false,
                revengeTraded: false,
                increasedLotSizeEmotionally: false,
              },
              ruleViolation: 'NONE',
              violatedRules: [],
              mistakeReason: isWin ? 'Other' : 'Closed Early',
              grade: isWin ? 'A' : 'B',
              screenshots: {},
              notes: `[Backtest Replay Pro] Manual early exit. ${t.notes || ''}`,
            };
            onAutoLogTrade(entry);
          }

          return closed;
        }
        return t;
      })
    );
    setToastMessage('Simulated position closed at current market price.');
  };

  // Replay Stats Computation
  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.status === 'CLOSED');
    const totalTrades = closed.length;
    const wins = closed.filter((t) => t.result === 'WIN').length;
    const losses = closed.filter((t) => t.result === 'LOSS').length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const totalPnL = closed.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const totalR = closed.reduce((acc, t) => acc + (t.rMultiple || 0), 0);
    const grossProfit = closed.filter((t) => (t.pnl || 0) > 0).reduce((acc, t) => acc + (t.pnl || 0), 0);
    const grossLoss = Math.abs(closed.filter((t) => (t.pnl || 0) < 0).reduce((acc, t) => acc + (t.pnl || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

    return {
      totalTrades,
      wins,
      losses,
      winRate,
      totalPnL,
      totalR,
      profitFactor,
    };
  }, [trades]);

  // Visible Slice of Candles for Chart Display (strictly up to cursorIndex)
  const visibleCandles = useMemo(() => {
    if (candles.length === 0) return [];
    const endIndex = cursorIndex;
    const startIndex = Math.max(0, endIndex - chartViewCandlesCount + 1);
    return candles.slice(startIndex, endIndex + 1);
  }, [candles, cursorIndex, chartViewCandlesCount]);

  // Indicator series
  const ema20Series = useMemo(() => calculateEMA(visibleCandles, 20), [visibleCandles]);
  const ema50Series = useMemo(() => calculateEMA(visibleCandles, 50), [visibleCandles]);
  const fvgs = useMemo(() => detectFairValueGaps(visibleCandles), [visibleCandles]);

  // Chart Min/Max Geometry
  const chartGeometry = useMemo(() => {
    if (visibleCandles.length === 0) {
      return { minPrice: 0, maxPrice: 1, range: 1, maxVol: 1 };
    }
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    for (const c of visibleCandles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    }

    // Add 5% padding top and bottom for clean viewing
    const padding = (max - min) * 0.06 || 0.001;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      range: max - min + padding * 2,
      maxVol: maxVol || 1,
    };
  }, [visibleCandles]);

  // Open Trades for Chart Overlays
  const openTrades = useMemo(() => trades.filter((t) => t.status === 'OPEN'), [trades]);

  return (
    <div className="w-full space-y-4 pb-12 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header & Replay Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900/90 via-[#0a1226]/95 to-slate-900/90 border border-cyan-500/30 p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                  <span>BACKTESTING REPLAY PRO</span>
                  <span className="text-[10px] uppercase font-mono-code px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold">
                    CANDLE-BY-CANDLE
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Real historical market replay engine (Dukascopy &amp; Binance feeds)</span>
                <span className="text-slate-600">•</span>
                <span className="text-amber-400 font-medium">Practice &amp; Simulation only — Zero look-ahead bias</span>
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono-code">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">TRADES:</span>
              <span className="font-bold text-cyan-300">{stats.totalTrades}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">WIN RATE:</span>
              <span className={`font-bold ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {stats.winRate.toFixed(1)}%
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">REALIZED R:</span>
              <span className={`font-bold ${stats.totalR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.totalR >= 0 ? `+${stats.totalR.toFixed(1)}R` : `${stats.totalR.toFixed(1)}R`}
              </span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="text-slate-500">PNL:</span>
              <span className={`font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(stats.totalPnL, activeAccount?.currency || 'USD')}
              </span>
            </div>
          </div>
        </div>

        {/* Configuration Row: Instrument, Timeframe, Date Picker */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Instrument Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <span className="text-[10px] uppercase font-mono-code text-slate-400">Pair:</span>
              <select
                value={selectedInstrument}
                onChange={(e) => setSelectedInstrument(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-100 outline-none cursor-pointer"
              >
                {INSTRUMENT_LIST.map((item) => (
                  <option key={item.id} value={item.id} className="bg-slate-900 text-slate-100">
                    {item.flag} {item.name} ({item.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Selector */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-xl p-1">
              {TIMEFRAME_OPTIONS.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setSelectedTimeframe(tf.id)}
                  title={tf.desc}
                  className={`px-2 py-1 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                    selectedTimeframe === tf.id
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Start Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] uppercase font-mono-code text-slate-400">Replay Start:</span>
              <input
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="bg-transparent text-xs font-mono-code text-slate-100 outline-none cursor-pointer"
              />
            </div>

            {/* Load Data Button */}
            <button
              onClick={handleLoadData}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'FETCHING DATA...' : 'LOAD HISTORICAL FEED'}</span>
            </button>
          </div>

          {/* Source and Cache indicator */}
          <div className="flex items-center gap-2 text-xs font-mono-code text-slate-400">
            {dataSource && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800">
                <Database className="w-3 h-3 text-cyan-400" />
                <span className="uppercase text-slate-300">
                  {dataSource === 'indexeddb_cache'
                    ? 'IndexedDB (Cached)'
                    : dataSource === 'server_cache'
                    ? 'Server Disk Cache'
                    : dataSource.includes('binance')
                    ? 'Binance Public REST API'
                    : 'Dukascopy Public Datafeed'}
                </span>
              </span>
            )}
            <span className="text-slate-500">
              Candle {cursorIndex + 1} / {candles.length}
            </span>
          </div>
        </div>
      </div>

      {/* Replay Video Player HUD Controls */}
      <div className="rounded-2xl bg-[#070d1e]/90 border border-slate-800/80 p-3 sm:p-4 shadow-xl backdrop-blur flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Playback Button Group */}
        <div className="flex items-center gap-2">
          {/* Step Backward */}
          <button
            onClick={stepBackward}
            disabled={cursorIndex <= 1 || isPlaying}
            title="Step Back 1 Candle (Left Arrow)"
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex items-center justify-center transition cursor-pointer disabled:opacity-40"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause Replay' : 'Play Candle-by-Candle'}
            className={`px-5 h-9 rounded-xl font-bold font-military text-xs tracking-wider flex items-center gap-2 transition cursor-pointer shadow-lg ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>PLAY REPLAY</span>
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            onClick={stepForward}
            disabled={cursorIndex >= candles.length - 1 || isPlaying}
            title="Step Forward 1 Candle (Right Arrow)"
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex items-center justify-center transition cursor-pointer disabled:opacity-40"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            title="Reset to Replay Start"
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-slate-200 flex items-center justify-center transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
          <span className="text-[10px] uppercase font-mono-code text-slate-500 px-1.5">Speed:</span>
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                playbackSpeed === s
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Timeline Scrub Slider */}
        <div className="flex-1 w-full max-w-md flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={Math.max(1, candles.length - 1)}
            value={cursorIndex}
            onChange={(e) => {
              setIsPlaying(false);
              const idx = parseInt(e.target.value, 10);
              setCursorIndex(idx);
              if (candles[idx]) {
                processTradeEventsForCandle(candles[idx], idx);
              }
            }}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="text-right shrink-0">
            <div className="text-xs font-mono-code font-bold text-slate-200">
              {currentCandle ? new Date(currentCandle.time).toISOString().slice(0, 10) : '--'}
            </div>
            <div className="text-[10px] font-mono-code text-cyan-400">
              {currentCandle ? new Date(currentCandle.time).toLocaleTimeString('en-GB') : '--'}
            </div>
          </div>
        </div>

        {/* Chart Overlays Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-xl text-xs font-mono-code">
          <button
            onClick={() => setShowEMA20(!showEMA20)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              showEMA20 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-500'
            }`}
          >
            EMA 20
          </button>
          <button
            onClick={() => setShowEMA50(!showEMA50)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              showEMA50 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-slate-500'
            }`}
          >
            EMA 50
          </button>
          <button
            onClick={() => setShowFVG(!showFVG)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
              showFVG ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40' : 'text-slate-500'
            }`}
          >
            FVG
          </button>
        </div>
      </div>

      {/* Main Backtest Viewport: Chart Canvas (Left/Top) + Simulated Execution Terminal (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Replay Chart Container (3 Columns) */}
        <div className="lg:col-span-3 rounded-2xl bg-[#060b18] border border-slate-800/80 p-4 shadow-2xl relative flex flex-col justify-between min-h-[520px]">
          {/* Chart Header Bar */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60 text-xs font-mono-code">
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm text-slate-100">{selectedInstrument}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-bold text-[11px]">
                {selectedTimeframe}
              </span>
              {currentCandle && (
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
                  <span>
                    O: <strong className="text-slate-200">{currentCandle.open}</strong>
                  </span>
                  <span>
                    H: <strong className="text-emerald-400">{currentCandle.high}</strong>
                  </span>
                  <span>
                    L: <strong className="text-rose-400">{currentCandle.low}</strong>
                  </span>
                  <span>
                    C: <strong className="text-cyan-300">{currentCandle.close}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                REPLAY WINDOW: {visibleCandles.length} CANDLES
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setChartViewCandlesCount((c) => Math.min(180, c + 20))}
                  title="Zoom Out (Show More Candles)"
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-[11px] cursor-pointer"
                >
                  -
                </button>
                <button
                  onClick={() => setChartViewCandlesCount((c) => Math.max(30, c - 20))}
                  title="Zoom In (Show Fewer Candles)"
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 text-[11px] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* SVG Replay Candlestick & Volume Canvas */}
          <div className="relative flex-1 w-full h-[440px] bg-[#040814] rounded-xl overflow-hidden border border-slate-800/40 select-none">
            {visibleCandles.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono-code">
                <BarChart2 className="w-8 h-8 mb-2 opacity-40" />
                <span>No historical candles loaded. Click "LOAD HISTORICAL FEED" above.</span>
              </div>
            ) : (
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 440">
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Horizontal Price Grid Lines */}
                {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
                  const y = 440 * ratio;
                  const price = chartGeometry.maxPrice - ratio * chartGeometry.range;
                  return (
                    <g key={idx}>
                      <line x1="0" y1={y} x2="920" y2={y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" />
                      <text x="930" y={y + 4} fill="#64748b" fontSize="10" fontFamily="monospace">
                        {price.toFixed(selectedInstrument.includes('JPY') ? 3 : selectedInstrument.includes('XAU') ? 2 : 5)}
                      </text>
                    </g>
                  );
                })}

                {/* Volume Histogram at the bottom (Height max 60px) */}
                {showVolume &&
                  visibleCandles.map((c, i) => {
                    const candleWidth = 920 / visibleCandles.length;
                    const x = i * candleWidth;
                    const volHeight = (c.volume / chartGeometry.maxVol) * 60;
                    const y = 440 - volHeight;
                    const isBull = c.close >= c.open;
                    return (
                      <rect
                        key={`vol-${i}`}
                        x={x + 1}
                        y={y}
                        width={Math.max(1, candleWidth - 2)}
                        height={volHeight}
                        fill={isBull ? '#10b981' : '#f43f5e'}
                        opacity="0.22"
                      />
                    );
                  })}

                {/* Fair Value Gaps (FVG) */}
                {showFVG &&
                  fvgs.map((fvg, i) => {
                    const candleWidth = 920 / visibleCandles.length;
                    const x = fvg.startIndex * candleWidth;
                    const topY = ((chartGeometry.maxPrice - fvg.top) / chartGeometry.range) * 360 + 20;
                    const bottomY = ((chartGeometry.maxPrice - fvg.bottom) / chartGeometry.range) * 360 + 20;
                    const h = Math.abs(bottomY - topY);
                    const y = Math.min(topY, bottomY);
                    return (
                      <rect
                        key={`fvg-${i}`}
                        x={x}
                        y={y}
                        width={candleWidth * 3}
                        height={Math.max(2, h)}
                        fill={fvg.type === 'BULLISH' ? '#10b981' : '#f43f5e'}
                        opacity="0.18"
                        stroke={fvg.type === 'BULLISH' ? '#10b981' : '#f43f5e'}
                        strokeWidth="0.5"
                        strokeDasharray="2 2"
                      />
                    );
                  })}

                {/* Candlesticks */}
                {visibleCandles.map((c, i) => {
                  const candleWidth = 920 / visibleCandles.length;
                  const centerX = i * candleWidth + candleWidth / 2;
                  const isBull = c.close >= c.open;

                  // Vertical price coordinate mapping
                  const highY = ((chartGeometry.maxPrice - c.high) / chartGeometry.range) * 360 + 20;
                  const lowY = ((chartGeometry.maxPrice - c.low) / chartGeometry.range) * 360 + 20;
                  const openY = ((chartGeometry.maxPrice - c.open) / chartGeometry.range) * 360 + 20;
                  const closeY = ((chartGeometry.maxPrice - c.close) / chartGeometry.range) * 360 + 20;

                  const bodyTop = Math.min(openY, closeY);
                  const bodyHeight = Math.max(2, Math.abs(closeY - openY));
                  const bodyWidth = Math.max(2, candleWidth * 0.7);

                  return (
                    <g key={`candle-${i}`}>
                      {/* Upper & Lower Wick */}
                      <line
                        x1={centerX}
                        y1={highY}
                        x2={centerX}
                        y2={lowY}
                        stroke={isBull ? '#10b981' : '#f43f5e'}
                        strokeWidth={Math.max(1, candleWidth * 0.15)}
                      />
                      {/* Candle Body */}
                      <rect
                        x={centerX - bodyWidth / 2}
                        y={bodyTop}
                        width={bodyWidth}
                        height={bodyHeight}
                        rx={0.5}
                        fill={isBull ? '#10b981' : '#f43f5e'}
                      />
                    </g>
                  );
                })}

                {/* EMA 20 Line */}
                {showEMA20 && (
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeOpacity="0.85"
                    points={visibleCandles
                      .map((_, i) => {
                        const val = ema20Series[i];
                        if (val === null) return '';
                        const candleWidth = 920 / visibleCandles.length;
                        const x = i * candleWidth + candleWidth / 2;
                        const y = ((chartGeometry.maxPrice - val) / chartGeometry.range) * 360 + 20;
                        return `${x},${y}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                  />
                )}

                {/* EMA 50 Line */}
                {showEMA50 && (
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeOpacity="0.85"
                    points={visibleCandles
                      .map((_, i) => {
                        const val = ema50Series[i];
                        if (val === null) return '';
                        const candleWidth = 920 / visibleCandles.length;
                        const x = i * candleWidth + candleWidth / 2;
                        const y = ((chartGeometry.maxPrice - val) / chartGeometry.range) * 360 + 20;
                        return `${x},${y}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                  />
                )}

                {/* Open Trade Overlays: Entry, SL, TP Lines */}
                {openTrades.map((t) => {
                  const entryY = ((chartGeometry.maxPrice - t.entryPrice) / chartGeometry.range) * 360 + 20;
                  const slY = ((chartGeometry.maxPrice - t.stopLoss) / chartGeometry.range) * 360 + 20;
                  const tpY = ((chartGeometry.maxPrice - t.takeProfit) / chartGeometry.range) * 360 + 20;

                  return (
                    <g key={t.id}>
                      {/* Entry Line */}
                      <line x1="0" y1={entryY} x2="920" y2={entryY} stroke="#00f0ff" strokeWidth="1.5" />
                      <text x="10" y={entryY - 4} fill="#00f0ff" fontSize="10" fontWeight="bold">
                        OPEN {t.direction} @ {t.entryPrice}
                      </text>

                      {/* SL Line */}
                      <line x1="0" y1={slY} x2="920" y2={slY} stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 4" />
                      <text x="10" y={slY - 4} fill="#f43f5e" fontSize="9" fontWeight="bold">
                        SL @ {t.stopLoss}
                      </text>

                      {/* TP Line */}
                      <line x1="0" y1={tpY} x2="920" y2={tpY} stroke="#10b981" strokeWidth="1" strokeDasharray="4 4" />
                      <text x="10" y={tpY - 4} fill="#10b981" fontSize="9" fontWeight="bold">
                        TP @ {t.takeProfit}
                      </text>
                    </g>
                  );
                })}

                {/* Current Market Price Tracker Line */}
                {currentCandle && (
                  <g>
                    {(() => {
                      const curY = ((chartGeometry.maxPrice - currentCandle.close) / chartGeometry.range) * 360 + 20;
                      return (
                        <>
                          <line x1="0" y1={curY} x2="920" y2={curY} stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" />
                          <rect x="922" y={curY - 9} width="74" height="18" rx="3" fill="#0284c7" />
                          <text x="926" y={curY + 4} fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                            {currentCandle.close.toFixed(selectedInstrument.includes('JPY') ? 3 : 5)}
                          </text>
                        </>
                      );
                    })()}
                  </g>
                )}
              </svg>
            )}

            {/* In-Chart Legend & Status Overlay */}
            <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2 text-[10px] font-mono-code">
              {showEMA20 && (
                <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-amber-500/30 text-amber-300 font-bold">
                  EMA 20
                </span>
              )}
              {showEMA50 && (
                <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-blue-500/30 text-blue-300 font-bold">
                  EMA 50
                </span>
              )}
              {showFVG && (
                <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-fuchsia-500/30 text-fuchsia-300 font-bold">
                  FVG / Liquidity Sweeps
                </span>
              )}
            </div>

            {/* Bottom Disclaimer Watermark */}
            <div className="absolute bottom-2 left-3 pointer-events-none text-[9px] font-mono-code text-slate-600 uppercase tracking-widest">
              PRIMEPIPFX REPLAY ENGINE • DUKASCOPY (FOREX) &amp; BINANCE (CRYPTO) FEED
            </div>
          </div>
        </div>

        {/* Simulated Execution & Order Terminal (1 Column) */}
        <div className="rounded-2xl bg-gradient-to-b from-[#091124] to-[#050a16] border border-cyan-500/30 p-4 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-military">
                  SIMULATED ORDER DOCK
                </h3>
              </div>
              <span className="text-[10px] font-mono-code text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                ACTIVE REPLAY
              </span>
            </div>

            {/* Order Mode (Market vs Pending) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl mb-3 text-xs font-mono-code">
              <button
                onClick={() => setOrderMode('MARKET')}
                className={`py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  orderMode === 'MARKET' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                MARKET
              </button>
              <button
                onClick={() => setOrderMode('PENDING')}
                className={`py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  orderMode === 'PENDING' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                PENDING
              </button>
            </div>

            {/* Buy / Sell Direction Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setOrderDirection('BUY')}
                className={`py-2 rounded-xl font-bold font-military text-xs tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  orderDirection === 'BUY'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-2 ring-emerald-400'
                    : 'bg-slate-900/90 text-emerald-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>BUY (LONG)</span>
              </button>
              <button
                onClick={() => setOrderDirection('SELL')}
                className={`py-2 rounded-xl font-bold font-military text-xs tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  orderDirection === 'SELL'
                    ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/25 ring-2 ring-rose-400'
                    : 'bg-slate-900/90 text-rose-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>SELL (SHORT)</span>
              </button>
            </div>

            {/* Pending Order Trigger Input */}
            {orderMode === 'PENDING' && (
              <div className="space-y-1.5 mb-3">
                <label className="text-[10px] uppercase font-mono-code text-slate-400">Trigger Order Price:</label>
                <input
                  type="number"
                  step="any"
                  value={triggerPriceInput}
                  onChange={(e) => setTriggerPriceInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono-code text-slate-100 outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {/* Stop Loss & Take Profit Inputs */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] uppercase font-mono-code text-rose-400 flex items-center justify-between">
                  <span>Stop Loss:</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={stopLossInput}
                  onChange={(e) => setStopLossInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono-code text-slate-100 outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-mono-code text-emerald-400 flex items-center justify-between">
                  <span>Take Profit:</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={takeProfitInput}
                  onChange={(e) => setTakeProfitInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono-code text-slate-100 outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Quick R:R Presets */}
            <div className="flex items-center gap-1.5 mb-3 text-[10px] font-mono-code">
              <span className="text-slate-500">R:R Presets:</span>
              {[1.5, 2.0, 3.0, 5.0].map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    if (!currentCandle) return;
                    const entry = orderMode === 'PENDING' ? parseFloat(triggerPriceInput) : currentCandle.close;
                    const sl = parseFloat(stopLossInput);
                    if (!isNaN(entry) && !isNaN(sl)) {
                      const dist = Math.abs(entry - sl);
                      const newTp = orderDirection === 'BUY' ? entry + dist * r : entry - dist * r;
                      setTakeProfitInput(newTp.toFixed(selectedInstrument.includes('JPY') ? 3 : 5));
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 font-bold transition cursor-pointer"
                >
                  1:{r}
                </button>
              ))}
            </div>

            {/* Auto Risk & Position Sizing Calculator Dock */}
            <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-2.5 space-y-1.5 text-xs font-mono-code mb-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Risk Allocation:</span>
                <div className="flex items-center gap-1">
                  {[0.5, 1.0, 2.0].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setRiskPercent(pct)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        riskPercent === pct ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="text-slate-400">Risk Capital:</span>
                <span className="font-bold text-amber-300">
                  {formatCurrency(calculatedPosition.riskAmount, activeAccount?.currency || 'USD')}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="text-slate-400">Auto Lot Size:</span>
                <span className="font-bold text-cyan-300">{calculatedPosition.lotSize.toFixed(2)} lots</span>
              </div>
            </div>

            {/* Strategy Tag Selector */}
            <div className="space-y-1 mb-3">
              <label className="text-[10px] uppercase font-mono-code text-slate-400">Strategy Model:</label>
              <select
                value={strategyTag}
                onChange={(e) => setStrategyTag(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 outline-none cursor-pointer"
              >
                <option value="SBT Model 1 - Liquidity Sweep">SBT Model 1 - Liquidity Sweep</option>
                <option value="SBT Model 2 - Market Structure Shift (MSS)">SBT Model 2 - Market Structure Shift (MSS)</option>
                <option value="SBT Model 3 - Fair Value Gap Mitigation">SBT Model 3 - Fair Value Gap Mitigation</option>
                <option value="SBT Model 4 - Order Block Reaction">SBT Model 4 - Order Block Reaction</option>
                <option value="SBT Model 5 - Multi-Timeframe Confluence">SBT Model 5 - Multi-Timeframe Confluence</option>
                <option value="Institutional Breakout">Institutional Breakout</option>
                <option value="Session Open Reversal">Session Open Reversal</option>
              </select>
            </div>

            {/* Submit Trade Button */}
            <button
              onClick={handleExecuteTrade}
              disabled={!currentCandle}
              className={`w-full py-2.5 rounded-xl font-military font-bold text-xs tracking-wider uppercase transition cursor-pointer shadow-lg disabled:opacity-40 flex items-center justify-center gap-2 ${
                orderDirection === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-rose-500/20'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>PLACE SIMULATED {orderDirection}</span>
            </button>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-mono-code text-cyan-200 flex items-center justify-between">
              <span>{toastMessage}</span>
              <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-200 ml-2">
                ✕
              </button>
            </div>
          )}

          {/* Active Open Positions Bar */}
          {openTrades.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <span className="text-[10px] font-bold uppercase font-military text-slate-400">
                ACTIVE POSITION ({openTrades.length})
              </span>
              {openTrades.map((t) => {
                const currentPrice = currentCandle ? currentCandle.close : t.entryPrice;
                const isFloatingWin = t.direction === 'BUY' ? currentPrice >= t.entryPrice : currentPrice <= t.entryPrice;
                return (
                  <div
                    key={t.id}
                    className="p-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs font-mono-code flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span className={t.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                          {t.direction}
                        </span>
                        <span className="text-slate-200">@{t.entryPrice}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Current: <span className={isFloatingWin ? 'text-emerald-300' : 'text-rose-300'}>{currentPrice}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleManualCloseTrade(t.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition cursor-pointer"
                    >
                      CLOSE NOW
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Backtest Session Journal & Performance Table */}
      <div className="rounded-2xl bg-gradient-to-b from-[#070c1a] to-[#040813] border border-slate-800 p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-2">
              <span>BACKTEST REPLAY LOG &amp; TRADE JOURNAL INTEGRATION</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                AUTO-SAVED WITH TAG "BACKTEST"
              </span>
            </h3>
          </div>

          {onNavigateToJournal && (
            <button
              onClick={onNavigateToJournal}
              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer"
            >
              VIEW IN MAIN TRADE JOURNAL →
            </button>
          )}
        </div>

        {trades.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs font-mono-code">
            <span>No simulated trades recorded in this replay session yet. Place a trade on any candle to start.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Dir</th>
                  <th className="pb-2">Pair</th>
                  <th className="pb-2">Entry</th>
                  <th className="pb-2">Exit</th>
                  <th className="pb-2">Stop Loss</th>
                  <th className="pb-2">Take Profit</th>
                  <th className="pb-2">Result</th>
                  <th className="pb-2">R-Multiple</th>
                  <th className="pb-2">PnL</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trades.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 text-slate-300">{t.orderType}</td>
                    <td className="py-2.5 font-bold">
                      <span className={t.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-200">{t.instrument}</td>
                    <td className="py-2.5 text-slate-300">{t.entryPrice}</td>
                    <td className="py-2.5 text-slate-300">{t.exitPrice ?? '--'}</td>
                    <td className="py-2.5 text-rose-400">{t.stopLoss}</td>
                    <td className="py-2.5 text-emerald-400">{t.takeProfit}</td>
                    <td className="py-2.5">
                      {t.result === 'WIN' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                          WIN
                        </span>
                      )}
                      {t.result === 'LOSS' && (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                          LOSS
                        </span>
                      )}
                      {!t.result && <span className="text-slate-500">OPEN</span>}
                    </td>
                    <td className="py-2.5 font-bold">
                      {t.rMultiple !== undefined ? (
                        <span className={t.rMultiple >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {t.rMultiple >= 0 ? `+${t.rMultiple.toFixed(2)}R` : `${t.rMultiple.toFixed(2)}R`}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="py-2.5 font-bold">
                      {t.pnl !== undefined ? (
                        <span className={t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {formatCurrency(t.pnl, activeAccount?.currency || 'USD')}
                        </span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          t.status === 'CLOSED'
                            ? 'bg-slate-800 text-slate-300'
                            : t.status === 'OPEN'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
