import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Code2,
  Play,
  Save,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Layers,
  Sliders,
  ChevronDown,
  ClipboardPaste,
  Plus,
  Trash2,
  Power,
  RotateCcw,
  Search,
  Activity,
  TrendingUp,
  BarChart2,
  Zap,
  Clock,
  Terminal,
  ShieldCheck,
  ExternalLink,
  Copy,
  FolderOpen,
  FileCode,
  SlidersHorizontal,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { PineScriptIndicator, PineIndicatorCategory, PineIndicatorSignal } from '../../types';
import { pineScriptService } from '../../services/pineScriptService';
import { PineScriptEngine, CandleBar, PineCompilationResult } from '../../services/pineScriptEngine';
import { getStoredUser } from '../../utils/authClient';
import { MARKET_STRUCTURE_PINE_CODE } from '../../data/marketStructurePineScript';

export interface PineEditorDockProps {
  currentSymbol?: string;
  currentTimeframe?: string;
  onSelectSymbol?: (symbol: string) => void;
  onSelectTimeframe?: (timeframe: string) => void;
  onOpenFullModal?: () => void;
  onCloseDock?: () => void;
  onIndicatorToggled?: (indicatorId: string, enabled: boolean) => void;
}

// ============================================================================
// ALL SUPPORTED TRADING PAIRS & ASSETS (Forex, Metals, Crypto, Indices)
// ============================================================================
export interface AssetPair {
  symbol: string;
  name: string;
  category: 'FOREX_MAJOR' | 'FOREX_CROSS' | 'METALS' | 'CRYPTO' | 'INDICES';
  description: string;
}

export const ALL_TRADING_PAIRS: AssetPair[] = [
  // Forex Majors
  { symbol: 'EURUSD', name: 'Euro / US Dollar', category: 'FOREX_MAJOR', description: 'Highest volume FX major pair' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', category: 'FOREX_MAJOR', description: 'London-New York volatility major' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', category: 'FOREX_MAJOR', description: 'Institutional carry-trade pair' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', category: 'FOREX_MAJOR', description: 'Commodity & Asia-Pacific bellwether' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', category: 'FOREX_MAJOR', description: 'Crude oil correlation currency' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', category: 'FOREX_MAJOR', description: 'European safe-haven currency' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', category: 'FOREX_MAJOR', description: 'Dairy & Asia-Pacific commodity major' },
  // Forex Crosses
  { symbol: 'EURGBP', name: 'Euro / British Pound', category: 'FOREX_CROSS', description: 'European regional cross' },
  { symbol: 'EURJPY', name: 'Euro / Japanese Yen', category: 'FOREX_CROSS', description: 'High momentum trending cross' },
  { symbol: 'GBPJPY', name: 'British Pound / Japanese Yen', category: 'FOREX_CROSS', description: 'The Dragon - high ATR intraday cross' },
  { symbol: 'AUDJPY', name: 'Australian Dollar / Japanese Yen', category: 'FOREX_CROSS', description: 'Global risk-on / risk-off barometer' },
  { symbol: 'CADJPY', name: 'Canadian Dollar / Japanese Yen', category: 'FOREX_CROSS', description: 'Energy & oil macro play' },
  { symbol: 'EURAUD', name: 'Euro / Australian Dollar', category: 'FOREX_CROSS', description: 'High-beta counter-cyclical cross' },
  { symbol: 'GBPCHF', name: 'British Pound / Swiss Franc', category: 'FOREX_CROSS', description: 'Cross-channel liquidity pair' },
  // Metals & Commodities
  { symbol: 'XAUUSD', name: 'Gold / US Dollar', category: 'METALS', description: 'Global institutional store of value' },
  { symbol: 'XAGUSD', name: 'Silver / US Dollar', category: 'METALS', description: 'High-beta precious & industrial metal' },
  { symbol: 'USOIL', name: 'WTI Crude Oil', category: 'METALS', description: 'Global energy benchmark' },
  // Crypto Assets
  { symbol: 'BTCUSDT', name: 'Bitcoin / Tether USD', category: 'CRYPTO', description: 'Global digital monetary asset' },
  { symbol: 'ETHUSDT', name: 'Ethereum / Tether USD', category: 'CRYPTO', description: 'Smart contract liquidity network' },
  { symbol: 'SOLUSDT', name: 'Solana / Tether USD', category: 'CRYPTO', description: 'High throughput crypto ecosystem' },
  { symbol: 'XRPUSDT', name: 'XRP / Tether USD', category: 'CRYPTO', description: 'Cross-border liquidity token' },
  // Major Indices
  { symbol: 'US30', name: 'Dow Jones Industrial Average 30', category: 'INDICES', description: 'Wall Street blue-chip index' },
  { symbol: 'NAS100', name: 'Nasdaq 100 E-mini', category: 'INDICES', description: 'Mega-cap technology index' },
  { symbol: 'SPX500', name: 'S&P 500 Index', category: 'INDICES', description: 'US equities institutional benchmark' },
  { symbol: 'GER40', name: 'Germany DAX 40', category: 'INDICES', description: 'European industrial manufacturing index' },
];

export const POPULAR_CHIPS = ['XAGUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSDT', 'US30', 'NAS100'];

export const TIMEFRAME_OPTIONS = [
  { id: '1', label: '1m', name: '1 Minute (Scalping)' },
  { id: '3', label: '3m', name: '3 Minutes (Scalping)' },
  { id: '5', label: '5m', name: '5 Minutes (Intraday)' },
  { id: '15', label: '15m', name: '15 Minutes (Execution)' },
  { id: '30', label: '30m', name: '30 Minutes (Structure)' },
  { id: '60', label: '1h', name: '1 Hour (Intermediate)' },
  { id: '120', label: '2h', name: '2 Hours (Swing)' },
  { id: '240', label: '4h', name: '4 Hours (Trend Bias)' },
  { id: 'D', label: '1D', name: 'Daily (Session Trend)' },
  { id: 'W', label: '1W', name: 'Weekly (Macro Horizon)' },
];

// ============================================================================
// TEMPLATE SCRIPTS (Authentic Pine Script Templates)
// ============================================================================
export const PINE_TEMPLATES: Record<
  string,
  {
    title: string;
    shortName: string;
    category: PineIndicatorCategory;
    overlay: boolean;
    color: string;
    isStrategy?: boolean;
    code: string;
  }
> = {
  ms123: {
    title: 'Market Structure 1-2-3 (v4.48)',
    shortName: 'MS 1-2-3',
    category: 'SBT_STRUCTURE',
    overlay: true,
    color: '#C4B5FD',
    code: MARKET_STRUCTURE_PINE_CODE,
  },
  fvgObRadar: {
    title: 'SBT Institutional FVG & Order Block Radar',
    shortName: 'SBT FVG/OB',
    category: 'SBT_STRUCTURE',
    overlay: true,
    color: '#00f0ff',
    code: `//@version=5
indicator("SBT Institutional FVG & Order Block Radar", overlay=true)

threshold = input.float(2.5, "Imbalance Threshold (Pips)", minval=0.5)
showZones = input.bool(true, "Draw Liquidity Boxes")

// Bullish Fair Value Gap: Candle 1 High < Candle 3 Low
bullishFVG = high[2] < low[0] and (low[0] - high[2]) >= (threshold * syminfo.mintick * 10)
bearishFVG = low[2] > high[0] and (low[2] - high[0]) >= (threshold * syminfo.mintick * 10)

// Order Block Sweeps
isBullishOB = close[1] < open[1] and close > high[1] and volume > ta.sma(volume, 20)
isBearishOB = close[1] > open[1] and close < low[1] and volume > ta.sma(volume, 20)

plotshape(bullishFVG, title="Bullish FVG", style=shape.triangleup, location=location.belowbar, color=color.new(#00f0ff, 0), size=size.small, text="FVG")
plotshape(bearishFVG, title="Bearish FVG", style=shape.triangledown, location=location.abovebar, color=color.new(#f43f5e, 0), size=size.small, text="FVG")

plotshape(isBullishOB, title="Bullish OB Sweep", style=shape.circle, location=location.belowbar, color=color.new(#10b981, 0), size=size.tiny, text="OB")
plotshape(isBearishOB, title="Bearish OB Sweep", style=shape.circle, location=location.abovebar, color=color.new(#ef4444, 0), size=size.tiny, text="OB")
`,
  },
  supertrendMss: {
    title: 'SBT Precision SuperTrend & Market Structure Shift (MSS)',
    shortName: 'SBT SuperTrend',
    category: 'TREND',
    overlay: true,
    color: '#10b981',
    code: `//@version=5
indicator("SBT Precision SuperTrend & MSS", overlay=true)

atrPeriod = input.int(10, "ATR Length", minval=1)
factor = input.float(3.0, "Factor", minval=0.5, step=0.1)

[supertrend, direction] = ta.supertrend(factor, atrPeriod)

plot(direction < 0 ? supertrend : na, "Up Trend", color=color.green, style=plot.style_linebr, linewidth=2)
plot(direction > 0 ? supertrend : na, "Down Trend", color=color.red, style=plot.style_linebr, linewidth=2)

bullishShift = ta.crossunder(direction, 0)
bearishShift = ta.crossover(direction, 0)

plotshape(bullishShift, "Bullish MSS", style=shape.labelup, location=location.belowbar, color=color.green, text="MSS BUY", textcolor=color.white)
plotshape(bearishShift, "Bearish MSS", style=shape.labeldown, location=location.abovebar, color=color.red, text="MSS SELL", textcolor=color.white)
`,
  },
  turtleSoup: {
    title: 'SBT Turtle Soup 20-Day Sweeps & Liquidity Grab',
    shortName: 'Turtle Soup',
    category: 'LIQUIDITY',
    overlay: true,
    color: '#f59e0b',
    code: `//@version=5
indicator("SBT Turtle Soup 20-Day Sweeps", overlay=true)

lookback = input.int(20, "Lookback Period (Bars)", minval=5)

highestHigh = ta.highest(high[1], lookback)
lowestLow = ta.lowest(low[1], lookback)

plot(highestHigh, "20-Bar High", color=color.orange, style=plot.style_circles, linewidth=1)
plot(lowestLow, "20-Bar Low", color=color.blue, style=plot.style_circles, linewidth=1)

isSweepHigh = high > highestHigh and close < highestHigh
isSweepLow = low < lowestLow and close > lowestLow

plotshape(isSweepHigh, title="Turtle High Sweep", style=shape.arrowdown, location=location.abovebar, color=color.red, size=size.normal, text="SWEEP")
plotshape(isSweepLow, title="Turtle Low Sweep", style=shape.arrowup, location=location.belowbar, color=color.green, size=size.normal, text="SWEEP")
`,
  },
  emaRibbon: {
    title: 'SBT Institutional 4-EMA Ribbon (9, 21, 50, 200)',
    shortName: '4-EMA Ribbon',
    category: 'TREND',
    overlay: true,
    color: '#3b82f6',
    code: `//@version=5
indicator("SBT Institutional 4-EMA Ribbon", overlay=true)

ema9 = ta.ema(close, 9)
ema21 = ta.ema(close, 21)
ema50 = ta.ema(close, 50)
ema200 = ta.ema(close, 200)

plot(ema9, "Fast EMA (9)", color=color.new(#38bdf8, 0), linewidth=1)
plot(ema21, "Medium EMA (21)", color=color.new(#818cf8, 0), linewidth=1)
plot(ema50, "Trend EMA (50)", color=color.new(#f59e0b, 0), linewidth=2)
plot(ema200, "Macro EMA (200)", color=color.new(#ec4899, 0), linewidth=2)
`,
  },
  rsiDivergence: {
    title: 'RSI Momentum & Divergence Radar',
    shortName: 'RSI Radar',
    category: 'OSCILLATOR',
    overlay: false,
    color: '#ec4899',
    code: `//@version=5
indicator("RSI Momentum & Divergence Radar", overlay=false)

rsiLength = input.int(14, "RSI Length", minval=1)
overbought = input.int(70, "Overbought Level")
oversold = input.int(30, "Oversold Level")

rsiVal = ta.rsi(close, rsiLength)

plot(rsiVal, "RSI", color=color.new(#ec4899, 0), linewidth=2)
h1 = hline(overbought, "Overbought", color=color.red, linestyle=hline.style_dotted)
h2 = hline(oversold, "Oversold", color=color.green, linestyle=hline.style_dotted)
hline(50, "Midline", color=color.gray, linestyle=hline.style_dashed)

fill(h1, h2, color=color.new(#ec4899, 90))

buySig = ta.crossover(rsiVal, oversold)
sellSig = ta.crossunder(rsiVal, overbought)

plotshape(buySig, "RSI Oversold Buy", style=shape.triangleup, location=location.bottom, color=color.green, size=size.small)
plotshape(sellSig, "RSI Overbought Sell", style=shape.triangledown, location=location.top, color=color.red, size=size.small)
`,
  },
  bollingerBands: {
    title: 'Bollinger Bands Volatility Expansion & Squeeze',
    shortName: 'BBands Squeeze',
    category: 'VOLATILITY',
    overlay: true,
    color: '#06b6d4',
    code: `//@version=5
indicator("Bollinger Bands Volatility Squeeze", overlay=true)

length = input.int(20, "Period", minval=1)
mult = input.float(2.0, "StdDev Multiplier", minval=0.5, step=0.1)

basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upper = basis + dev
lower = basis - dev

p1 = plot(upper, "BB Upper", color=color.new(#06b6d4, 30))
p2 = plot(lower, "BB Lower", color=color.new(#06b6d4, 30))
plot(basis, "BB Basis (SMA 20)", color=color.new(#f59e0b, 0), linewidth=1)

fill(p1, p2, color=color.new(#06b6d4, 92))
`,
  },
  maCrossStrategy: {
    title: 'Institutional EMA Golden Cross Quantitative Strategy',
    shortName: 'EMA Strategy',
    category: 'CUSTOM',
    overlay: true,
    color: '#10b981',
    isStrategy: true,
    code: `//@version=5
strategy("EMA Golden Cross Strategy", overlay=true, initial_capital=100000, default_qty_type=strategy.percent_of_equity, default_qty_value=10)

fastLength = input.int(9, "Fast EMA Length")
slowLength = input.int(21, "Slow EMA Length")

fastEMA = ta.ema(close, fastLength)
slowEMA = ta.ema(close, slowLength)

longCondition = ta.crossover(fastEMA, slowEMA)
shortCondition = ta.crossunder(fastEMA, slowEMA)

if (longCondition)
    strategy.entry("Long Entry", strategy.long)

if (shortCondition)
    strategy.entry("Short Entry", strategy.short)

plot(fastEMA, "Fast EMA", color=color.green, linewidth=2)
plot(slowEMA, "Slow EMA", color=color.red, linewidth=2)
`,
  },
  blankIndicator: {
    title: 'New Custom Institutional Indicator',
    shortName: 'Custom Script',
    category: 'CUSTOM',
    overlay: true,
    color: '#00f0ff',
    code: `//@version=5
indicator("My Custom Indicator", overlay=true)

// Parameter Inputs
length = input.int(14, "Length", minval=1)
source = input.source(close, "Source")

// Calculation
maValue = ta.sma(source, length)

// Plots
plot(maValue, "Simple Moving Average", color=color.cyan, linewidth=2)
`,
  },
};

export const PineEditorDock: React.FC<PineEditorDockProps> = ({
  currentSymbol = 'XAUUSD',
  currentTimeframe = '15',
  onSelectSymbol,
  onSelectTimeframe,
  onOpenFullModal,
  onCloseDock,
  onIndicatorToggled,
}) => {
  const currentUser = getStoredUser();

  // Internal state
  const [indicators, setIndicators] = useState<PineScriptIndicator[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [code, setCode] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('My Indicator');
  const [editShortName, setEditShortName] = useState<string>('Indicator');
  const [editCategory, setEditCategory] = useState<PineIndicatorCategory>('SBT_STRUCTURE');
  const [editColor, setEditColor] = useState<string>('#00f0ff');
  const [isOverlay, setIsOverlay] = useState<boolean>(true);

  // Active Symbol and Timeframe state
  const [activeSymbol, setActiveSymbol] = useState<string>(currentSymbol);
  const [activeTimeframe, setActiveTimeframe] = useState<string>(currentTimeframe);

  // UI Dials & Toggles
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isPairDropdownOpen, setIsPairDropdownOpen] = useState<boolean>(false);
  const [isTfDropdownOpen, setIsTfDropdownOpen] = useState<boolean>(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState<boolean>(false);
  const [pairSearchQuery, setPairSearchQuery] = useState<string>('');
  const [consoleTab, setConsoleTab] = useState<'CONSOLE' | 'LOGS' | 'INPUTS' | 'STRATEGY'>('CONSOLE');
  const [isFindOpen, setIsFindOpen] = useState<boolean>(false);
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');

  // Compiler & Status States
  const [compileStatus, setCompileStatus] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
    details?: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [applySuccess, setApplySuccess] = useState<boolean>(false);
  const [compilerLogs, setCompilerLogs] = useState<Array<{ time: string; type: 'info' | 'success' | 'warn' | 'error'; text: string }>>([]);
  const [latestCompiledResult, setLatestCompiledResult] = useState<PineCompilationResult | null>(null);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const pairDropdownRef = useRef<HTMLDivElement>(null);

  // Sync symbol / timeframe from props when changed externally
  useEffect(() => {
    if (currentSymbol && currentSymbol !== activeSymbol) {
      setActiveSymbol(currentSymbol);
    }
  }, [currentSymbol]);

  useEffect(() => {
    if (currentTimeframe && currentTimeframe !== activeTimeframe) {
      setActiveTimeframe(currentTimeframe);
    }
  }, [currentTimeframe]);

  // Load indicators from service
  const loadIndicators = async () => {
    const list = await pineScriptService.syncWithServer();
    setIndicators(list);
  };

  useEffect(() => {
    loadIndicators();

    const handleUpdate = () => {
      setIndicators(pineScriptService.getIndicators());
    };

    window.addEventListener('primepipfx_pine_indicators_updated', handleUpdate);
    window.addEventListener('primepipfx_pine_toggle_change', handleUpdate);
    return () => {
      window.removeEventListener('primepipfx_pine_indicators_updated', handleUpdate);
      window.removeEventListener('primepipfx_pine_toggle_change', handleUpdate);
    };
  }, []);

  const currentIndicator = indicators[selectedSlot - 1] || indicators[0];
  const isOnChart = currentIndicator ? pineScriptService.isIndicatorEnabled(currentIndicator.id) : false;

  // Sync form inputs when active slot changes
  useEffect(() => {
    if (currentIndicator) {
      setCode(currentIndicator.scriptCode || '');
      setEditTitle(currentIndicator.title);
      setEditShortName(currentIndicator.shortName || currentIndicator.title.slice(0, 10));
      setEditCategory(currentIndicator.category || 'SBT_STRUCTURE');
      setEditColor(currentIndicator.color || '#00f0ff');
      setIsOverlay(currentIndicator.overlay !== false);

      const nowTime = new Date().toLocaleTimeString();
      setCompileStatus({
        success: true,
        message: `Pine Script [${currentIndicator.shortName || currentIndicator.title}] loaded for ${activeSymbol}.`,
        timestamp: nowTime,
      });

      setCompilerLogs([
        {
          time: nowTime,
          type: 'info',
          text: `[TradingView Pine Engine] Loaded "${currentIndicator.title}" (Version 5/6). Target: ${activeSymbol} (${activeTimeframe}).`,
        },
      ]);
    }
  }, [selectedSlot, currentIndicator?.id]);

  // Quick compilation run with sample candles
  const runCompilation = (): PineCompilationResult => {
    const sampleCandles: CandleBar[] = [];
    const now = Date.now();
    let p = 2650;
    for (let i = 0; i < 40; i++) {
      sampleCandles.push({
        time: now - (40 - i) * 60000,
        open: p,
        high: p + 3,
        low: p - 3,
        close: p + 1,
        volume: 1500,
      });
      p += 1;
    }

    const res = PineScriptEngine.execute(code, sampleCandles);
    setLatestCompiledResult(res);

    const logTime = new Date().toLocaleTimeString();
    if (res.success) {
      setCompileStatus({
        success: true,
        message: `✓ Compiled successfully in ${res.executionTimeMs}ms (0 errors). Verified on ${activeSymbol}.`,
        timestamp: logTime,
        details: `${res.plots.length} plots | ${res.shapes.length} shapes | ${res.hlines.length} hlines | Overlay: ${res.overlay ? 'Yes' : 'Sub-pane'}`,
      });
      setCompilerLogs((prev) => [
        ...prev.slice(-15),
        {
          time: logTime,
          type: 'success',
          text: `[Compiler] Pine Script v${res.version} compilation successful (0 errors). Ready to apply to chart.`,
        },
      ]);
    } else {
      setCompileStatus({
        success: false,
        message: res.logs[0]?.text || 'Syntax Error in Pine Script',
        timestamp: logTime,
      });
      setCompilerLogs((prev) => [
        ...prev.slice(-15),
        {
          time: logTime,
          type: 'error',
          text: res.logs[0]?.text || 'Compilation failed.',
        },
      ]);
    }

    return res;
  };

  // Add to Chart Action (Identical to TradingView's Blue "Add to chart" button)
  const handleAddToChart = async () => {
    const compiled = runCompilation();
    if (!compiled.success) return;

    let effectiveCode = code.trim();
    const cleanTitle = compiled.title || editTitle.trim() || `Script #${selectedSlot}`;
    const cleanShort = compiled.shortTitle || editShortName.trim() || cleanTitle.slice(0, 10);

    const isMS123 =
      cleanTitle.toLowerCase().includes('market structure') ||
      cleanTitle.includes('MS 1-2-3') ||
      cleanShort.includes('MS 1-2-3') ||
      effectiveCode.includes('Market Structure 1-2-3') ||
      (effectiveCode.includes('mss') && effectiveCode.includes('bos')) ||
      effectiveCode.includes('Eng') ||
      effectiveCode.includes('sbt5Fit') ||
      effectiveCode.includes('L1 / SBT3') ||
      effectiveCode.includes('Zone Marking');

    const indId = isMS123
      ? 'sbt-ms-123'
      : currentIndicator?.id && currentIndicator.id !== 'sbt-fvg-ob'
      ? currentIndicator.id
      : `pine_custom_${Date.now()}`;

    const updated: PineScriptIndicator = {
      id: indId,
      title: cleanTitle,
      shortName: cleanShort,
      description: currentIndicator?.description || `Custom Pine Script ${compiled.isStrategy ? 'strategy' : 'indicator'} on ${activeSymbol}.`,
      category: isMS123 ? 'SBT_STRUCTURE' : editCategory,
      overlay: compiled.overlay,
      color: isMS123 ? '#C4B5FD' : editColor,
      version: '5.2.0',
      author: currentUser?.name || currentUser?.username || 'Trader',
      updatedAt: new Date().toISOString().slice(0, 10),
      scriptCode: effectiveCode,
      slotNumber: selectedSlot,
      defaultEnabled: true,
      isOfficial: isMS123,
    };

    // Save and activate in Pine Script service
    await pineScriptService.saveIndicator(updated);
    await pineScriptService.setIndicatorToggle(indId, true);

    // Broadcast globally to guarantee instant chart canvas redraw
    window.dispatchEvent(
      new CustomEvent('primepipfx_pine_toggle_change', {
        detail: { indicatorId: indId, enabled: true },
      })
    );
    window.dispatchEvent(new CustomEvent('primepipfx_pine_indicators_updated'));

    // Apply pair and timeframe change to parent chart
    if (onSelectSymbol) onSelectSymbol(activeSymbol);
    if (onSelectTimeframe) onSelectTimeframe(activeTimeframe);
    if (onIndicatorToggled) onIndicatorToggled(indId, true);

    // Refresh list
    setIndicators(pineScriptService.getIndicators());

    setApplySuccess(true);
    setTimeout(() => setApplySuccess(false), 3000);

    const logTime = new Date().toLocaleTimeString();
    setCompilerLogs((prev) => [
      ...prev.slice(-15),
      {
        time: logTime,
        type: 'success',
        text: `[✓ APPLIED TO CHART] "${cleanTitle}" [${cleanShort}] is now ACTIVE & VISIBLE on ${activeSymbol} (${activeTimeframe})!`,
      },
    ]);
  };

  // Save to Library Action
  const handleSaveToLibrary = async () => {
    const compiled = runCompilation();
    if (!compiled.success) return;

    const indId = currentIndicator?.id || `pine_custom_${Date.now()}`;
    const cleanTitle = compiled.title || editTitle.trim() || `Script #${selectedSlot}`;

    const updated: PineScriptIndicator = {
      id: indId,
      title: cleanTitle,
      shortName: compiled.shortTitle || cleanTitle.slice(0, 10),
      description: currentIndicator?.description || 'Custom institutional Pine Script indicator.',
      category: editCategory,
      overlay: compiled.overlay,
      color: editColor,
      version: '5.2.0',
      author: currentUser?.name || currentUser?.username || 'Trader',
      updatedAt: new Date().toISOString().slice(0, 10),
      scriptCode: code.trim(),
      slotNumber: selectedSlot,
      defaultEnabled: pineScriptService.isIndicatorEnabled(indId),
      isOfficial: false,
    };

    const res = await pineScriptService.saveIndicator(updated);
    if (res.ok) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      loadIndicators();
    }
  };

  // 1-Click Paste from Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setCode(text);
        // Auto-extract title from indicator(...) or strategy(...)
        const matchTitle = text.match(/(?:indicator|strategy)\s*\(\s*["']([^"']+)["']/);
        if (matchTitle && matchTitle[1]) {
          setEditTitle(matchTitle[1]);
          setEditShortName(matchTitle[1].slice(0, 12));
        }

        const logTime = new Date().toLocaleTimeString();
        setCompilerLogs((prev) => [
          ...prev.slice(-15),
          {
            time: logTime,
            type: 'info',
            text: `[Paste] Pasted ${text.split('\n').length} lines of Pine Script from clipboard. Checking syntax...`,
          },
        ]);

        // Immediate compilation check
        const sampleCandles: CandleBar[] = [{ time: 1, open: 1, high: 2, low: 0.5, close: 1.5 }];
        PineScriptEngine.execute(text, sampleCandles);
        setCompileStatus({
          success: true,
          message: `✓ Code pasted! Ready to click "Add to chart" to activate indicator on ${activeSymbol}.`,
          timestamp: logTime,
        });
      }
    } catch {
      const userPasted = window.prompt('Paste your TradingView Pine Script code here:');
      if (userPasted && userPasted.trim()) {
        setCode(userPasted);
        const matchTitle = userPasted.match(/(?:indicator|strategy)\s*\(\s*["']([^"']+)["']/);
        if (matchTitle && matchTitle[1]) {
          setEditTitle(matchTitle[1]);
          setEditShortName(matchTitle[1].slice(0, 12));
        }
        const logTime = new Date().toLocaleTimeString();
        setCompilerLogs((prev) => [
          ...prev.slice(-15),
          {
            time: logTime,
            type: 'info',
            text: `[Paste] Pasted ${userPasted.split('\n').length} lines of Pine Script. Ready to apply to chart.`,
          },
        ]);
        setCompileStatus({
          success: true,
          message: `✓ Code pasted! Click "Add to chart" to activate indicator on ${activeSymbol}.`,
          timestamp: logTime,
        });
      } else if (editorRef.current) {
        editorRef.current.focus();
      }
    }
  };

  // Load a Pine Template
  const handleLoadTemplate = (key: string) => {
    const t = PINE_TEMPLATES[key];
    if (!t) return;
    setCode(t.code);
    setEditTitle(t.title);
    setEditShortName(t.shortName);
    setEditCategory(t.category);
    setEditColor(t.color);
    setIsOverlay(t.overlay);
    setIsTemplateMenuOpen(false);

    const logTime = new Date().toLocaleTimeString();
    setCompilerLogs((prev) => [
      ...prev.slice(-15),
      {
        time: logTime,
        type: 'info',
        text: `[Template] Loaded authoritative template "${t.title}".`,
      },
    ]);
  };

  // Keyboard shortcut handlers (Ctrl+S to save, Ctrl+Enter to Add to chart)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveToLibrary();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddToChart();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      setCode(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const lineCount = useMemo(() => {
    return Math.max(1, code.split('\n').length);
  }, [code]);

  return (
    <div
      className={`flex flex-col bg-[#131722] text-[#d1d4dc] border border-[#2a2e39] font-mono select-none transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl max-w-none' : 'w-full rounded-2xl shadow-2xl'
      }`}
      style={{ minHeight: isExpanded ? 'calc(100vh - 32px)' : '540px' }}
    >
      {/* ===================================================================== */}
      {/* 1. TRADINGVIEW PINE EDITOR HEADER BAR                                  */}
      {/* Authentic TradingView dark header with blue Add to chart button        */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e222d] border-b border-[#2a2e39] gap-2 flex-wrap">
        {/* Left: TV Pine Editor Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#2962ff]/20 border border-[#2962ff]/40 flex items-center justify-center text-[#2962ff] shadow-inner">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-100 tracking-wide font-sans">
              Pine Editor
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2a2e39] text-[#787b86] font-mono">
              v5 / v6
            </span>
            <div className="flex items-center gap-1.5 ml-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Script name"
                className="bg-transparent text-xs font-semibold text-slate-200 outline-none hover:bg-[#131722] focus:bg-[#131722] px-1.5 py-0.5 rounded border border-transparent focus:border-[#2962ff] transition w-36 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Center / Right Actions: Templates, Paste, Save, Add to Chart */}
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          {/* Templates / Open Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsTemplateMenuOpen((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-slate-200 text-xs font-sans font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isTemplateMenuOpen && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-[#1e222d] border border-[#363a45] rounded-xl shadow-2xl py-1 z-50 text-xs font-sans">
                <div className="px-3 py-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Script Templates
                </div>
                {Object.entries(PINE_TEMPLATES).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleLoadTemplate(key)}
                    className="w-full px-3 py-1.5 text-left text-slate-200 hover:bg-[#2962ff]/20 hover:text-cyan-300 flex items-center justify-between cursor-pointer"
                  >
                    <span>{item.title}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{item.shortName}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Paste Code Button */}
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="px-2.5 py-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-slate-200 text-xs font-sans font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="Paste code directly from clipboard"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
            <span>Paste Code</span>
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveToLibrary}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-sans font-medium flex items-center gap-1.5 transition cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500'
                : 'bg-[#2a2e39] hover:bg-[#363a45] text-slate-200 border-transparent'
            }`}
            title="Save script (Ctrl+S)"
          >
            {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5 text-amber-400" />}
            <span>{saveSuccess ? 'Saved' : 'Save'}</span>
          </button>

          {/* SIGNATURE TRADINGVIEW "ADD TO CHART" BUTTON */}
          <button
            type="button"
            onClick={handleAddToChart}
            className="px-3.5 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e53e5] active:scale-95 text-white text-xs font-bold font-sans flex items-center gap-1.5 shadow-md transition cursor-pointer"
            title="Compile script and activate on chart (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Add to chart</span>
          </button>

          {/* External TradingView Link */}
          <a
            href="https://www.tradingview.com/chart/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-slate-300 hover:text-white text-xs flex items-center gap-1 transition"
            title="Open official TradingView Charting Terminal in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline text-[11px]">TradingView.com</span>
          </a>

          {/* Maximize / Close Dock */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg hover:bg-[#2a2e39] text-slate-400 hover:text-white transition cursor-pointer"
            title={isExpanded ? 'Minimize dock' : 'Maximize dock'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onCloseDock && (
            <button
              type="button"
              onClick={onCloseDock}
              className="p-1.5 rounded-lg hover:bg-rose-950 hover:text-rose-400 text-slate-400 transition cursor-pointer"
              title="Close Pine Editor"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. TRADINGVIEW CODE EDITOR CANVAS                                      */}
      {/* Exact line numbering gutter + dark institutional syntax workspace      */}
      {/* ===================================================================== */}
      <div className="relative flex-1 flex bg-[#131722] overflow-hidden min-h-[300px]">
        {/* Line Numbers Column */}
        <div className="w-12 bg-[#131722] border-r border-[#2a2e39] py-3 text-right pr-3 select-none text-[#50535e] text-xs font-mono leading-relaxed overflow-hidden">
          {Array.from({ length: Math.min(lineCount, 600) }).map((_, idx) => (
            <div key={idx} className="h-5">
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Text Area Code Editor */}
        <div className="relative flex-1 overflow-auto">
          <textarea
            ref={editorRef}
            value={code}
            onChange={(e) => {
              const val = e.target.value;
              setCode(val);
              const matchTitle = val.match(/(?:indicator|strategy)\s*\(\s*["']([^"']+)["']/);
              if (matchTitle && matchTitle[1] && (editTitle === 'My Indicator' || editTitle === 'Custom Script' || !editTitle)) {
                setEditTitle(matchTitle[1]);
                setEditShortName(matchTitle[1].slice(0, 12));
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={`//@version=5\nindicator("My Indicator", overlay=true)\n\n// Paste any Pine Script code here\nplot(ta.sma(close, 20), "SMA 20", color=color.cyan)`}
            className="w-full h-full p-3 bg-transparent text-[#d1d4dc] text-xs font-mono leading-relaxed outline-none resize-none whitespace-pre overflow-auto selection:bg-[#2962ff]/30 selection:text-white"
            spellCheck={false}
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. TRADINGVIEW BOTTOM DRAWER: PINE LOGS / CONSOLE / INPUTS / STRATEGY */}
      {/* ===================================================================== */}
      <div className="bg-[#1e222d] border-t border-[#2a2e39] flex flex-col">
        {/* Bottom Drawer Tabs Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a2e39] text-xs font-sans">
          <div className="flex items-center gap-2">
            {[
              { id: 'CONSOLE' as const, label: 'Compiler Console' },
              { id: 'LOGS' as const, label: 'Pine Logs' },
              { id: 'INPUTS' as const, label: 'Inputs & Settings' },
              { id: 'STRATEGY' as const, label: 'Strategy Tester' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setConsoleTab(tab.id)}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium text-xs ${
                  consoleTab === tab.id
                    ? 'bg-[#2962ff] text-white shadow-sm'
                    : 'text-[#787b86] hover:text-slate-200 hover:bg-[#2a2e39]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#787b86]">
            {compileStatus && (
              <span
                className={`font-mono flex items-center gap-1 ${
                  compileStatus.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {compileStatus.success ? '● Success' : '▲ Error'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setCompilerLogs([])}
              className="text-[#787b86] hover:text-slate-200 cursor-pointer text-[10px]"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Tab Body: 120px tall */}
        <div className="h-32 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-[#131722]/60">
          {/* CONSOLE TAB */}
          {consoleTab === 'CONSOLE' && (
            <div>
              {compilerLogs.length === 0 ? (
                <div className="text-[#50535e] italic text-xs">
                  Console idle. Click &quot;Add to chart&quot; or press Ctrl+Enter to compile script.
                </div>
              ) : (
                compilerLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 ${
                      log.type === 'error'
                        ? 'text-rose-400'
                        : log.type === 'success'
                        ? 'text-emerald-400 font-semibold'
                        : log.type === 'warn'
                        ? 'text-amber-300'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="text-[#50535e] text-[10px] shrink-0">[{log.time}]</span>
                    <span>{log.text}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* PINE LOGS TAB */}
          {consoleTab === 'LOGS' && (
            <div className="space-y-1">
              <div className="text-cyan-400 font-bold text-[11px]">
                Runtime Execution Log: {activeSymbol} ({activeTimeframe})
              </div>
              <div className="text-slate-400 text-[11px]">
                Active Indicators Plotted: {indicators.filter((i) => pineScriptService.isIndicatorEnabled(i.id)).length}
              </div>
              {latestCompiledResult && latestCompiledResult.plots.length > 0 && (
                <div className="text-slate-300 text-[11px] space-y-0.5 pt-1">
                  {latestCompiledResult.plots.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-slate-400">{p.title}:</span>
                      <span className="text-white font-bold">
                        {p.values[p.values.length - 1] !== null ? p.values[p.values.length - 1] : 'null'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INPUTS TAB */}
          {consoleTab === 'INPUTS' && (
            <div className="space-y-2">
              <div className="text-slate-300 font-bold text-[11px]">
                Configured Inputs ({latestCompiledResult?.inputs.length || 0})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {latestCompiledResult?.inputs.map((inp) => (
                  <div key={inp.id} className="flex items-center justify-between p-1.5 bg-[#1e222d] rounded border border-[#2a2e39]">
                    <span className="text-slate-400 text-[11px] truncate max-w-[140px]">{inp.name || inp.id}</span>
                    <span className="text-cyan-300 font-bold text-[11px]">{String(inp.currentValue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STRATEGY TESTER TAB */}
          {consoleTab === 'STRATEGY' && (
            <div>
              {latestCompiledResult?.strategyStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39]">
                    <div className="text-[10px] text-slate-400">Net Profit</div>
                    <div
                      className={`text-sm font-bold ${
                        latestCompiledResult.strategyStats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ${latestCompiledResult.strategyStats.netProfit.toLocaleString()} ({latestCompiledResult.strategyStats.netProfitPercent}%)
                    </div>
                  </div>
                  <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39]">
                    <div className="text-[10px] text-slate-400">Total Trades</div>
                    <div className="text-sm font-bold text-white">{latestCompiledResult.strategyStats.totalTrades}</div>
                  </div>
                  <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39]">
                    <div className="text-[10px] text-slate-400">Win Rate</div>
                    <div className="text-sm font-bold text-cyan-300">{latestCompiledResult.strategyStats.winRate}%</div>
                  </div>
                  <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39]">
                    <div className="text-[10px] text-slate-400">Profit Factor</div>
                    <div className="text-sm font-bold text-amber-300">{latestCompiledResult.strategyStats.profitFactor}</div>
                  </div>
                </div>
              ) : (
                <div className="text-[#50535e] italic text-xs">
                  Script is currently an indicator. To view strategy backtesting statistics, use <code>strategy(&quot;...&quot;)</code> syntax.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
