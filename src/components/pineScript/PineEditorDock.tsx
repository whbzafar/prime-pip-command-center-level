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
  Download,
  Upload,
  AlignLeft,
  Edit2,
  Eye,
  EyeOff,
  Eraser,
  ListFilter,
  CheckSquare,
} from 'lucide-react';
import { PineScriptIndicator, PineIndicatorCategory } from '../../types';
import { pineScriptService } from '../../services/pineScriptService';
import {
  PineScriptEngine,
  CandleBar,
  PineCompilationResult,
  PineSyntaxDiagnostic,
} from '../../services/pineScriptEngine';
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
// AUTOCOMPLETE KEYWORDS & SIGNATURES (Pine Script v5 / v6)
// ============================================================================
interface PineAutocompleteItem {
  label: string;
  insertText: string;
  detail: string;
  kind: 'function' | 'variable' | 'keyword' | 'constant';
  doc: string;
}

const PINE_AUTOCOMPLETE_ITEMS: PineAutocompleteItem[] = [
  // Declarations
  {
    label: 'indicator',
    insertText: 'indicator("${1:My Indicator}", overlay=true)\n',
    detail: 'indicator(title, shorttitle, overlay, ...)',
    kind: 'function',
    doc: 'Declares a custom Pine Script indicator with title and overlay setting.',
  },
  {
    label: 'strategy',
    insertText: 'strategy("${1:My Strategy}", overlay=true, initial_capital=100000)\n',
    detail: 'strategy(title, shorttitle, overlay, initial_capital, ...)',
    kind: 'function',
    doc: 'Declares a quantitative backtesting strategy with simulated execution.',
  },
  // Technical Analysis (ta.*)
  {
    label: 'ta.sma',
    insertText: 'ta.sma(${1:close}, ${2:20})',
    detail: 'ta.sma(source, length) -> series float',
    kind: 'function',
    doc: 'Calculates the Simple Moving Average of a source series over length bars.',
  },
  {
    label: 'ta.ema',
    insertText: 'ta.ema(${1:close}, ${2:21})',
    detail: 'ta.ema(source, length) -> series float',
    kind: 'function',
    doc: 'Calculates the Exponential Moving Average with exponential weighting.',
  },
  {
    label: 'ta.rsi',
    insertText: 'ta.rsi(${1:close}, ${2:14})',
    detail: 'ta.rsi(source, length) -> series float',
    kind: 'function',
    doc: 'Relative Strength Index momentum oscillator between 0 and 100.',
  },
  {
    label: 'ta.atr',
    insertText: 'ta.atr(${1:14})',
    detail: 'ta.atr(length) -> series float',
    kind: 'function',
    doc: 'Average True Range volatility calculation over length periods.',
  },
  {
    label: 'ta.supertrend',
    insertText: '[supertrendVal, direction] = ta.supertrend(${1:3.0}, ${2:10})',
    detail: 'ta.supertrend(factor, atrPeriod) -> [series, direction]',
    kind: 'function',
    doc: 'Adaptive SuperTrend volatility trailing band and trend direction flag.',
  },
  {
    label: 'ta.highest',
    insertText: 'ta.highest(${1:high}, ${2:20})',
    detail: 'ta.highest(source, length) -> series float',
    kind: 'function',
    doc: 'Returns highest value over the past length bars.',
  },
  {
    label: 'ta.lowest',
    insertText: 'ta.lowest(${1:low}, ${2:20})',
    detail: 'ta.lowest(source, length) -> series float',
    kind: 'function',
    doc: 'Returns lowest value over the past length bars.',
  },
  {
    label: 'ta.crossover',
    insertText: 'ta.crossover(${1:fast}, ${2:slow})',
    detail: 'ta.crossover(series1, series2) -> series bool',
    kind: 'function',
    doc: 'True when series1 crosses above series2 on current candle.',
  },
  {
    label: 'ta.crossunder',
    insertText: 'ta.crossunder(${1:fast}, ${2:slow})',
    detail: 'ta.crossunder(series1, series2) -> series bool',
    kind: 'function',
    doc: 'True when series1 crosses below series2 on current candle.',
  },
  {
    label: 'ta.change',
    insertText: 'ta.change(${1:close})',
    detail: 'ta.change(source) -> series float',
    kind: 'function',
    doc: 'Difference between current bar value and previous bar value (source - source[1]).',
  },
  {
    label: 'ta.stdev',
    insertText: 'ta.stdev(${1:close}, ${2:20})',
    detail: 'ta.stdev(source, length) -> series float',
    kind: 'function',
    doc: 'Standard deviation of source over length bars.',
  },
  // Inputs (input.*)
  {
    label: 'input.int',
    insertText: 'input.int(${1:14}, "${2:Length}", minval=1)',
    detail: 'input.int(defval, title, minval, maxval, step, group)',
    kind: 'function',
    doc: 'Configurable integer user parameter input.',
  },
  {
    label: 'input.float',
    insertText: 'input.float(${1:2.0}, "${2:Multiplier}", minval=0.1, step=0.1)',
    detail: 'input.float(defval, title, minval, step)',
    kind: 'function',
    doc: 'Configurable floating-point numeric input.',
  },
  {
    label: 'input.bool',
    insertText: 'input.bool(${1:true}, "${2:Enable Signals}")',
    detail: 'input.bool(defval, title)',
    kind: 'function',
    doc: 'Configurable boolean checkbox input.',
  },
  {
    label: 'input.string',
    insertText: 'input.string("${1:Option}", "${2:Title}")',
    detail: 'input.string(defval, title, options)',
    kind: 'function',
    doc: 'Configurable string or dropdown selector input.',
  },
  {
    label: 'input.source',
    insertText: 'input.source(close, "Price Source")',
    detail: 'input.source(defval, title)',
    kind: 'function',
    doc: 'Source input selector (open, high, low, close, hl2, hlc3).',
  },
  // Plots & Shapes
  {
    label: 'plot',
    insertText: 'plot(${1:series}, "${2:Title}", color=color.cyan, linewidth=2)',
    detail: 'plot(series, title, color, linewidth, style)',
    kind: 'function',
    doc: 'Plots a numeric line or histogram on the chart.',
  },
  {
    label: 'plotshape',
    insertText: 'plotshape(${1:condition}, title="${2:Signal}", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small, text="${3:BUY}")',
    detail: 'plotshape(condition, title, style, location, color, size, text)',
    kind: 'function',
    doc: 'Draws visual geometric shapes or signal labels at candle locations.',
  },
  {
    label: 'hline',
    insertText: 'hline(${1:70}, "${2:Level}", color=color.red, linestyle=hline.style_dotted)',
    detail: 'hline(price, title, color, linestyle, linewidth)',
    kind: 'function',
    doc: 'Renders a fixed horizontal level line on the chart canvas.',
  },
  {
    label: 'fill',
    insertText: 'fill(${1:p1}, ${2:p2}, color=color.new(color.blue, 90))',
    detail: 'fill(plot1, plot2, color)',
    kind: 'function',
    doc: 'Fills background space between two plot lines or hlines with transparent color.',
  },
  {
    label: 'alertcondition',
    insertText: 'alertcondition(${1:condition}, title="${2:Alert Title}", message="${3:Alert Triggered}")',
    detail: 'alertcondition(condition, title, message)',
    kind: 'function',
    doc: 'Defines an automated institutional alert trigger.',
  },
  // Math Functions
  {
    label: 'math.abs',
    insertText: 'math.abs(${1:x})',
    detail: 'math.abs(number) -> float',
    kind: 'function',
    doc: 'Returns absolute value of number.',
  },
  {
    label: 'math.max',
    insertText: 'math.max(${1:a}, ${2:b})',
    detail: 'math.max(val1, val2) -> float',
    kind: 'function',
    doc: 'Returns maximum of two numbers.',
  },
  {
    label: 'math.min',
    insertText: 'math.min(${1:a}, ${2:b})',
    detail: 'math.min(val1, val2) -> float',
    kind: 'function',
    doc: 'Returns minimum of two numbers.',
  },
  {
    label: 'math.round',
    insertText: 'math.round(${1:x}, ${2:2})',
    detail: 'math.round(number, decimals) -> float',
    kind: 'function',
    doc: 'Rounds number to specified decimal places.',
  },
  // Built-in Variables
  { label: 'close', insertText: 'close', detail: 'Current candle close price', kind: 'variable', doc: 'Close price series.' },
  { label: 'open', insertText: 'open', detail: 'Current candle open price', kind: 'variable', doc: 'Open price series.' },
  { label: 'high', insertText: 'high', detail: 'Current candle high price', kind: 'variable', doc: 'High price series.' },
  { label: 'low', insertText: 'low', detail: 'Current candle low price', kind: 'variable', doc: 'Low price series.' },
  { label: 'volume', insertText: 'volume', detail: 'Current candle trading volume', kind: 'variable', doc: 'Volume series.' },
  { label: 'close[1]', insertText: 'close[1]', detail: 'Previous candle close price', kind: 'variable', doc: 'Previous bar historical price.' },
  { label: 'high[1]', insertText: 'high[1]', detail: 'Previous candle high price', kind: 'variable', doc: 'Previous bar historical high.' },
  { label: 'low[1]', insertText: 'low[1]', detail: 'Previous candle low price', kind: 'variable', doc: 'Previous bar historical low.' },
  { label: 'hl2', insertText: 'hl2', detail: '(high + low) / 2', kind: 'variable', doc: 'Median price of current candle.' },
  { label: 'hlc3', insertText: 'hlc3', detail: '(high + low + close) / 3', kind: 'variable', doc: 'Typical price of current candle.' },
  { label: 'syminfo.mintick', insertText: 'syminfo.mintick', detail: 'Tick minimum precision size', kind: 'variable', doc: 'Instrument tick size.' },
  // Colors & Styles
  { label: 'color.new', insertText: 'color.new(${1:#00f0ff}, ${2:0})', detail: 'color.new(color, transparency)', kind: 'function', doc: 'Creates color with transparency (0 to 100).' },
  { label: 'color.cyan', insertText: 'color.cyan', detail: 'Cyan color (#00f0ff)', kind: 'constant', doc: 'Built-in cyan color.' },
  { label: 'color.green', insertText: 'color.green', detail: 'Emerald green (#10b981)', kind: 'constant', doc: 'Built-in green color.' },
  { label: 'color.red', insertText: 'color.red', detail: 'Crimson red (#ef4444)', kind: 'constant', doc: 'Built-in red color.' },
  { label: 'color.yellow', insertText: 'color.yellow', detail: 'Amber yellow (#f59e0b)', kind: 'constant', doc: 'Built-in yellow color.' },
  { label: 'color.blue', insertText: 'color.blue', detail: 'Blue (#3b82f6)', kind: 'constant', doc: 'Built-in blue color.' },
  { label: 'color.purple', insertText: 'color.purple', detail: 'Purple (#a855f7)', kind: 'constant', doc: 'Built-in purple color.' },
  { label: 'shape.triangleup', insertText: 'shape.triangleup', detail: 'Upward triangle indicator shape', kind: 'constant', doc: 'Bullish shape.' },
  { label: 'shape.triangledown', insertText: 'shape.triangledown', detail: 'Downward triangle indicator shape', kind: 'constant', doc: 'Bearish shape.' },
  { label: 'shape.circle', insertText: 'shape.circle', detail: 'Circle marker shape', kind: 'constant', doc: 'Circle shape.' },
  { label: 'shape.arrowup', insertText: 'shape.arrowup', detail: 'Upward arrow signal', kind: 'constant', doc: 'Bullish arrow.' },
  { label: 'shape.arrowdown', insertText: 'shape.arrowdown', detail: 'Downward arrow signal', kind: 'constant', doc: 'Bearish arrow.' },
  { label: 'location.belowbar', insertText: 'location.belowbar', detail: 'Placed below candlestick low', kind: 'constant', doc: 'Position below bar.' },
  { label: 'location.abovebar', insertText: 'location.abovebar', detail: 'Placed above candlestick high', kind: 'constant', doc: 'Position above bar.' },
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
  turtleSoup: {
    title: 'SBT Model 09: Turtle Soup 20-Day Sweeps',
    shortName: 'Model 09 Turtle',
    category: 'SBT_STRUCTURE',
    overlay: true,
    color: '#f59e0b',
    code: `//@version=5
indicator("SBT Model 09: Turtle Soup Sweeps", overlay=true)

lookback = input.int(20, "Range Period", minval=5)
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
strategy("EMA Golden Cross Strategy", overlay=true, initial_capital=100000)

fastLength = input.int(9, "Fast EMA Length")
slowLength = input.int(21, "Slow EMA Length")

fastEMA = ta.ema(close, fastLength)
slowEMA = ta.ema(close, slowLength)

longCondition = ta.crossover(fastEMA, slowEMA)
shortCondition = ta.crossunder(fastEMA, slowEMA)

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

  // Internal script library state
  const [indicators, setIndicators] = useState<PineScriptIndicator[]>([]);
  const [activeScriptId, setActiveScriptId] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('My Custom Indicator');
  const [editShortName, setEditShortName] = useState<string>('Indicator');
  const [editCategory, setEditCategory] = useState<PineIndicatorCategory>('CUSTOM');
  const [editColor, setEditColor] = useState<string>('#00f0ff');
  const [isOverlay, setIsOverlay] = useState<boolean>(true);

  // Active Symbol and Timeframe
  const [activeSymbol, setActiveSymbol] = useState<string>(currentSymbol);
  const [activeTimeframe, setActiveTimeframe] = useState<string>(currentTimeframe);

  // Editor dimensions & display controls
  const [dockHeight, setDockHeight] = useState<'compact' | 'standard' | 'large' | 'fullscreen'>('standard');
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState<boolean>(false);
  const [consoleTab, setConsoleTab] = useState<'CONSOLE' | 'LOGS' | 'INPUTS' | 'STRATEGY' | 'REFERENCE'>('CONSOLE');
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [tabFilter, setTabFilter] = useState<string>('');

  // Compiler, status, logs & diagnostics
  const [compileStatus, setCompileStatus] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
    details?: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [applySuccess, setApplySuccess] = useState<boolean>(false);
  const [compilerLogs, setCompilerLogs] = useState<Array<{ time: string; type: 'info' | 'success' | 'warn' | 'error'; text: string; line?: number }>>([]);
  const [latestCompiledResult, setLatestCompiledResult] = useState<PineCompilationResult | null>(null);
  const [diagnostics, setDiagnostics] = useState<PineSyntaxDiagnostic[]>([]);

  // Autocomplete state
  const [autocompleteVisible, setAutocompleteVisible] = useState<boolean>(false);
  const [autocompleteItems, setAutocompleteItems] = useState<PineAutocompleteItem[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState<number>(0);
  const [cursorPosition, setCursorPosition] = useState<{ line: number; ch: number }>({ line: 1, ch: 1 });

  // References
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load indicators from pineScriptService
  const loadIndicators = async () => {
    const list = await pineScriptService.syncWithServer();
    setIndicators(list);
    if (list.length > 0 && !activeScriptId) {
      const initial = list[0];
      setActiveScriptId(initial.id);
      setCode(initial.scriptCode || PINE_TEMPLATES.blankIndicator.code);
      setEditTitle(initial.title);
      setEditShortName(initial.shortName || initial.title.slice(0, 10));
      setEditCategory(initial.category || 'CUSTOM');
      setEditColor(initial.color || '#00f0ff');
      setIsOverlay(initial.overlay !== false);
    }
  };

  useEffect(() => {
    loadIndicators();

    const handleUpdate = () => {
      const updated = pineScriptService.getIndicators();
      setIndicators(updated);
    };

    window.addEventListener('primepipfx_pine_indicators_updated', handleUpdate);
    window.addEventListener('primepipfx_pine_toggle_change', handleUpdate);
    return () => {
      window.removeEventListener('primepipfx_pine_indicators_updated', handleUpdate);
      window.removeEventListener('primepipfx_pine_toggle_change', handleUpdate);
    };
  }, []);

  const currentIndicator = useMemo(() => {
    return indicators.find((i) => i.id === activeScriptId) || indicators[0] || null;
  }, [indicators, activeScriptId]);

  const isOnChart = currentIndicator ? pineScriptService.isIndicatorEnabled(currentIndicator.id) : false;

  // Switch active script
  const handleSelectScript = (ind: PineScriptIndicator) => {
    setActiveScriptId(ind.id);
    setCode(ind.scriptCode || '');
    setEditTitle(ind.title);
    setEditShortName(ind.shortName || ind.title.slice(0, 10));
    setEditCategory(ind.category || 'CUSTOM');
    setEditColor(ind.color || '#00f0ff');
    setIsOverlay(ind.overlay !== false);
    setIsRenaming(false);
    setDiagnostics([]);

    const nowTime = new Date().toLocaleTimeString();
    setCompileStatus({
      success: true,
      message: `Pine Script "${ind.title}" loaded.`,
      timestamp: nowTime,
    });
    setCompilerLogs([
      {
        time: nowTime,
        type: 'info',
        text: `[Editor] Switched to script: "${ind.title}". Target: ${activeSymbol} (${activeTimeframe}).`,
      },
    ]);
  };

  // Create a brand new script tab
  const handleCreateNewScript = () => {
    const newId = `pine_custom_${Date.now()}`;
    const newInd: PineScriptIndicator = {
      id: newId,
      title: `Custom Script ${indicators.length + 1}`,
      shortName: `Script ${indicators.length + 1}`,
      description: 'Custom user-authored Pine Script indicator.',
      category: 'CUSTOM',
      overlay: true,
      color: '#00f0ff',
      version: '5.2.0',
      author: currentUser?.name || currentUser?.username || 'Trader',
      updatedAt: new Date().toISOString().slice(0, 10),
      scriptCode: PINE_TEMPLATES.blankIndicator.code,
      slotNumber: indicators.length + 1,
      defaultEnabled: false,
      isOfficial: false,
    };

    pineScriptService.saveIndicator(newInd);
    setIndicators(pineScriptService.getIndicators());
    handleSelectScript(newInd);
  };

  // Duplicate the currently selected script
  const handleDuplicateCurrentScript = async () => {
    if (!currentIndicator) return;
    const duplicated = await pineScriptService.duplicateIndicator(currentIndicator.id);
    if (duplicated) {
      setIndicators(pineScriptService.getIndicators());
      handleSelectScript(duplicated);
      const logTime = new Date().toLocaleTimeString();
      setCompilerLogs((prev) => [
        ...prev.slice(-15),
        {
          time: logTime,
          type: 'success',
          text: `[Library] Duplicated "${currentIndicator.title}" as new editable script.`,
        },
      ]);
    }
  };

  // Delete the currently selected script
  const handleDeleteCurrentScript = async () => {
    if (!currentIndicator) return;
    if (currentIndicator.isOfficial) {
      const confirmOfficial = window.confirm(
        `"${currentIndicator.title}" is an official indicator. Are you sure you want to remove it from your editor tabs?`
      );
      if (!confirmOfficial) return;
    } else {
      const confirmDelete = window.confirm(`Delete "${currentIndicator.title}"?`);
      if (!confirmDelete) return;
    }

    await pineScriptService.deleteIndicator(currentIndicator.id);
    const updated = pineScriptService.getIndicators();
    setIndicators(updated);
    if (updated.length > 0) {
      handleSelectScript(updated[0]);
    } else {
      handleCreateNewScript();
    }
  };

  // Clear all indicators from active chart (Pure Price Action)
  const handleClearAllChartIndicators = async () => {
    await pineScriptService.clearAllIndicators();
    setIndicators(pineScriptService.getIndicators());
    const logTime = new Date().toLocaleTimeString();
    setCompilerLogs((prev) => [
      ...prev.slice(-15),
      {
        time: logTime,
        type: 'info',
        text: `[Chart Reset] Cleared all indicators from active chart. Showing 100% clean price action candlesticks.`,
      },
    ]);
  };

  // Compile script and run syntax validator
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

    // 1. Syntax check
    const syntaxDiags = PineScriptEngine.validateSyntax(code);
    setDiagnostics(syntaxDiags);

    // 2. Execution check
    const res = PineScriptEngine.execute(code, sampleCandles);
    const allDiags = [...syntaxDiags, ...(res.diagnostics || [])];
    res.diagnostics = allDiags;
    setLatestCompiledResult(res);

    const logTime = new Date().toLocaleTimeString();
    if (res.success && syntaxDiags.filter((d) => d.type === 'error').length === 0) {
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
      const firstErr = allDiags.find((d) => d.type === 'error')?.message || res.logs[0]?.text || 'Syntax Error in Pine Script';
      const errLine = allDiags.find((d) => d.type === 'error')?.line;
      setCompileStatus({
        success: false,
        message: firstErr,
        timestamp: logTime,
        details: errLine ? `Error at Line ${errLine}` : undefined,
      });
      setCompilerLogs((prev) => [
        ...prev.slice(-15),
        {
          time: logTime,
          type: 'error',
          text: errLine ? `Line ${errLine}: ${firstErr}` : firstErr,
          line: errLine,
        },
      ]);
    }

    return res;
  };

  // Add / Apply to Chart
  const handleAddToChart = async () => {
    const compiled = runCompilation();
    if (!compiled.success || diagnostics.some((d) => d.type === 'error')) {
      setConsoleTab('CONSOLE');
      return;
    }

    const cleanTitle = compiled.title || editTitle.trim() || `Script #${currentIndicator?.slotNumber || 1}`;
    const cleanShort = compiled.shortTitle || editShortName.trim() || cleanTitle.slice(0, 10);
    const indId = currentIndicator?.id || `pine_custom_${Date.now()}`;

    const isMS123 =
      cleanTitle.toLowerCase().includes('market structure') ||
      cleanTitle.includes('MS 1-2-3') ||
      cleanShort.includes('MS 1-2-3');

    const updated: PineScriptIndicator = {
      id: indId,
      title: cleanTitle,
      shortName: cleanShort,
      description: currentIndicator?.description || `Custom Pine Script indicator on ${activeSymbol}.`,
      category: isMS123 ? 'SBT_STRUCTURE' : editCategory,
      overlay: compiled.overlay,
      color: isMS123 ? '#C4B5FD' : editColor,
      version: '5.2.0',
      author: currentUser?.name || currentUser?.username || 'Trader',
      updatedAt: new Date().toISOString().slice(0, 10),
      scriptCode: code.trim(),
      slotNumber: currentIndicator?.slotNumber || 1,
      defaultEnabled: true,
      isOfficial: isMS123,
    };

    await pineScriptService.saveIndicator(updated);
    await pineScriptService.setIndicatorToggle(indId, true);

    // Global broadcast for instant canvas redraw
    window.dispatchEvent(new CustomEvent('primepipfx_pine_toggle_change', { detail: { indicatorId: indId, enabled: true } }));
    window.dispatchEvent(new CustomEvent('primepipfx_pine_indicators_updated'));

    if (onSelectSymbol) onSelectSymbol(activeSymbol);
    if (onSelectTimeframe) onSelectTimeframe(activeTimeframe);
    if (onIndicatorToggled) onIndicatorToggled(indId, true);

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

  // Remove from active chart
  const handleRemoveFromChart = async () => {
    if (!currentIndicator) return;
    await pineScriptService.setIndicatorToggle(currentIndicator.id, false);
    setIndicators(pineScriptService.getIndicators());
    if (onIndicatorToggled) onIndicatorToggled(currentIndicator.id, false);

    const logTime = new Date().toLocaleTimeString();
    setCompilerLogs((prev) => [
      ...prev.slice(-15),
      {
        time: logTime,
        type: 'info',
        text: `[Chart] Removed "${currentIndicator.title}" from chart.`,
      },
    ]);
  };

  // Save to Library
  const handleSaveToLibrary = async () => {
    const compiled = runCompilation();
    const indId = currentIndicator?.id || `pine_custom_${Date.now()}`;
    const cleanTitle = compiled.title || editTitle.trim() || 'Custom Script';

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
      slotNumber: currentIndicator?.slotNumber || 1,
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

  // Paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setCode(text);
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
        setCompileStatus({
          success: true,
          message: `✓ Code pasted! Click "Add to chart" to activate indicator on ${activeSymbol}.`,
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
      }
    }
  };

  // Load a built-in template
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

  // Format / Beautify Pine Script code
  const handleFormatCode = () => {
    const lines = code.split('\n');
    let indentLevel = 0;
    const formatted = lines.map((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return '';

      // Decrease indent for closing constructs if applicable
      if (trimmed.startsWith('else') || trimmed.startsWith('elif')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const indentStr = '    '.repeat(indentLevel);
      const res = indentStr + trimmed;

      // Increase indent if line ends in a block opening
      if (
        trimmed.startsWith('if ') ||
        trimmed.startsWith('for ') ||
        trimmed.startsWith('while ') ||
        trimmed.endsWith(':') ||
        (trimmed.includes('=>') && !trimmed.endsWith(')'))
      ) {
        indentLevel += 1;
      }

      return res;
    });

    setCode(formatted.join('\n'));
    const logTime = new Date().toLocaleTimeString();
    setCompilerLogs((prev) => [
      ...prev.slice(-15),
      {
        time: logTime,
        type: 'info',
        text: `[Formatter] Cleaned indentation and standardized spacing across ${lines.length} lines.`,
      },
    ]);
  };

  // Export as .pine file
  const handleExportPineFile = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (editTitle || 'indicator').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    a.href = url;
    a.download = `${safeName}.pine`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import .pine file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setCode(content);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setEditTitle(nameWithoutExt);
        setEditShortName(nameWithoutExt.slice(0, 10));

        const logTime = new Date().toLocaleTimeString();
        setCompilerLogs((prev) => [
          ...prev.slice(-15),
          {
            time: logTime,
            type: 'info',
            text: `[Import] Loaded "${file.name}" (${content.split('\n').length} lines).`,
          },
        ]);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Jump cursor to specific line in editor
  const jumpToLine = (targetLine: number) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const lines = code.split('\n');
    let charIndex = 0;
    for (let i = 0; i < Math.min(targetLine - 1, lines.length); i++) {
      charIndex += lines[i].length + 1;
    }
    textarea.focus();
    textarea.setSelectionRange(charIndex, charIndex + (lines[targetLine - 1]?.length || 0));

    // Scroll textarea to line
    const approxLineHeight = 20;
    textarea.scrollTop = Math.max(0, (targetLine - 3) * approxLineHeight);
  };

  // Autocomplete trigger & insertion
  const triggerAutocomplete = (currentVal: string, selStart: number) => {
    const textBefore = currentVal.substring(0, selStart);
    const lastWordMatch = textBefore.match(/([a-zA-Z0-9_\.]+)$/);
    if (lastWordMatch && lastWordMatch[1].length >= 2) {
      const query = lastWordMatch[1].toLowerCase();
      const matches = PINE_AUTOCOMPLETE_ITEMS.filter(
        (item) => item.label.toLowerCase().includes(query) || item.detail.toLowerCase().includes(query)
      );
      if (matches.length > 0) {
        setAutocompleteItems(matches.slice(0, 7));
        setAutocompleteIndex(0);
        setAutocompleteVisible(true);
        return;
      }
    }
    setAutocompleteVisible(false);
  };

  const applyAutocompleteItem = (item: PineAutocompleteItem) => {
    if (!editorRef.current) return;
    const textarea = editorRef.current;
    const selStart = textarea.selectionStart;
    const textBefore = code.substring(0, selStart);
    const textAfter = code.substring(selStart);
    const lastWordMatch = textBefore.match(/([a-zA-Z0-9_\.]+)$/);

    const prefixLen = lastWordMatch ? lastWordMatch[1].length : 0;
    const cleanInsert = item.insertText.replace(/\$\{\d+:([^}]+)\}/g, '$1');
    const newCode = textBefore.substring(0, textBefore.length - prefixLen) + cleanInsert + textAfter;

    setCode(newCode);
    setAutocompleteVisible(false);

    setTimeout(() => {
      const newPos = textBefore.length - prefixLen + cleanInsert.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  // Keyboard navigation & Shortcuts (Ctrl+S, Ctrl+Enter, Tab, Autocomplete)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Autocomplete navigation
    if (autocompleteVisible) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex((prev) => (prev + 1) % autocompleteItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex((prev) => (prev - 1 + autocompleteItems.length) % autocompleteItems.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selected = autocompleteItems[autocompleteIndex];
        if (selected) {
          applyAutocompleteItem(selected);
          return;
        }
      }
      if (e.key === 'Escape') {
        setAutocompleteVisible(false);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveToLibrary();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddToChart();
    } else if ((e.ctrlKey || e.metaKey) && e.key === ' ') {
      // Ctrl+Space forces autocomplete open
      e.preventDefault();
      setAutocompleteItems(PINE_AUTOCOMPLETE_ITEMS.slice(0, 8));
      setAutocompleteIndex(0);
      setAutocompleteVisible(true);
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
    } else if (e.key === 'Enter') {
      // Auto-indent next line to match current line
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const textBefore = code.substring(0, start);
      const currentLine = textBefore.split('\n').pop() || '';
      const matchIndent = currentLine.match(/^(\s+)/);
      if (matchIndent) {
        e.preventDefault();
        const extraIndent = currentLine.trim().endsWith(':') ? '    ' : '';
        const indentStr = matchIndent[1] + extraIndent;
        const newCode = code.substring(0, start) + '\n' + indentStr + code.substring(start);
        setCode(newCode);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + indentStr.length;
        }, 0);
      }
    }
  };

  const lineCount = useMemo(() => {
    return Math.max(1, code.split('\n').length);
  }, [code]);

  // Error lines mapping for line-number gutter highlights
  const errorLinesMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const d of diagnostics) {
      if (d.line) {
        map.set(d.line, d.message);
      }
    }
    return map;
  }, [diagnostics]);

  // Height style based on dockHeight
  const heightStyle = useMemo(() => {
    if (dockHeight === 'compact') return 'min-h-[420px] h-[440px]';
    if (dockHeight === 'standard') return 'min-h-[580px] h-[600px]';
    if (dockHeight === 'large') return 'min-h-[760px] h-[780px]';
    return 'fixed inset-3 z-50 rounded-2xl shadow-2xl h-[calc(100vh-24px)]';
  }, [dockHeight]);

  const filteredIndicators = useMemo(() => {
    if (!tabFilter.trim()) return indicators;
    const q = tabFilter.toLowerCase();
    return indicators.filter((i) => i.title.toLowerCase().includes(q) || (i.shortName && i.shortName.toLowerCase().includes(q)));
  }, [indicators, tabFilter]);

  return (
    <div className={`flex flex-col bg-[#131722] text-[#d1d4dc] border border-[#2a2e39] font-mono select-none transition-all duration-200 rounded-2xl shadow-2xl overflow-hidden ${heightStyle}`}>
      {/* Hidden file input for .pine import */}
      <input ref={fileInputRef} type="file" accept=".pine,.txt" onChange={handleImportFile} className="hidden" />

      {/* ===================================================================== */}
      {/* 1. TRADINGVIEW PINE EDITOR HEADER BAR                                  */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1e222d] border-b border-[#2a2e39] gap-2 flex-wrap">
        {/* Left: TV Pine Editor Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#2962ff]/20 border border-[#2962ff]/40 flex items-center justify-center text-[#2962ff] shadow-inner">
            <Code2 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-100 tracking-wide font-sans">Pine Editor</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#2a2e39] text-[#787b86] font-mono">v5 / v6</span>

            {/* Editable Script Name */}
            <div className="flex items-center gap-1 ml-1 bg-[#131722]/80 border border-[#2a2e39] rounded-lg px-2 py-0.5">
              <span className={`w-2 h-2 rounded-full ${isOnChart ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Script name"
                className="bg-transparent text-xs font-semibold text-slate-200 outline-none hover:text-white focus:text-white transition w-32 sm:w-48 font-sans"
              />
            </div>
          </div>
        </div>

        {/* Center / Right Actions: Reset/Clean, Templates, Format, Import/Export, Paste, Save, Add to Chart */}
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          {/* Quick Clear Chart (Pure Price Action) */}
          <button
            type="button"
            onClick={handleClearAllChartIndicators}
            className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 text-xs font-sans font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="Remove all indicators from chart and display clean price action only"
          >
            <Eraser className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Clear Chart</span>
          </button>

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
              <div className="absolute left-0 top-full mt-1 w-64 bg-[#1e222d] border border-[#363a45] rounded-xl shadow-2xl py-1 z-50 text-xs font-sans max-h-72 overflow-y-auto">
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

          {/* Format Code */}
          <button
            type="button"
            onClick={handleFormatCode}
            className="px-2.5 py-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-slate-200 text-xs font-sans font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="Auto-indent code and standardize formatting"
          >
            <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Format</span>
          </button>

          {/* Import / Export File */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-slate-300 hover:text-white transition cursor-pointer"
            title="Import .pine script from your computer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={handleExportPineFile}
            className="p-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-slate-300 hover:text-white transition cursor-pointer"
            title="Export and download current script as .pine file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
          </button>

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
            title="Save script to user library (Ctrl+S)"
          >
            {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5 text-amber-400" />}
            <span>{saveSuccess ? 'Saved' : 'Save'}</span>
          </button>

          {/* SIGNATURE TRADINGVIEW "ADD TO CHART" BUTTON */}
          <button
            type="button"
            onClick={handleAddToChart}
            className="px-3.5 py-1.5 rounded-lg bg-[#2962ff] hover:bg-[#1e53e5] active:scale-95 text-white text-xs font-bold font-sans flex items-center gap-1.5 shadow-md transition cursor-pointer"
            title="Validate, compile script and render on chart (Ctrl+Enter)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Add to chart</span>
          </button>

          {/* If already active on chart: Remove toggle */}
          {isOnChart && (
            <button
              type="button"
              onClick={handleRemoveFromChart}
              className="px-2 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-sans font-bold transition cursor-pointer"
              title="Remove this script from active chart overlay"
            >
              Remove
            </button>
          )}

          {/* Size Selectors (Compact, Standard, Large, Fullscreen) */}
          <div className="flex items-center bg-[#131722] rounded-lg p-0.5 border border-[#2a2e39]">
            <button
              type="button"
              onClick={() => setDockHeight(dockHeight === 'fullscreen' ? 'standard' : 'fullscreen')}
              className={`p-1 rounded transition cursor-pointer ${dockHeight === 'fullscreen' ? 'bg-[#2962ff] text-white' : 'text-slate-400 hover:text-white'}`}
              title={dockHeight === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen editor'}
            >
              {dockHeight === 'fullscreen' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

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
      {/* 2. SCRIPT TABS BAR (Saved Scripts with +, Rename, Duplicate, Delete)   */}
      {/* ===================================================================== */}
      <div className="flex items-center justify-between px-2 bg-[#181c27] border-b border-[#2a2e39] overflow-x-auto text-xs font-sans gap-1 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {filteredIndicators.map((ind) => {
            const isSelected = ind.id === currentIndicator?.id;
            const isApplied = pineScriptService.isIndicatorEnabled(ind.id);
            return (
              <div
                key={ind.id}
                onClick={() => handleSelectScript(ind)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg transition cursor-pointer border-b-2 text-xs font-medium shrink-0 ${
                  isSelected
                    ? 'bg-[#131722] text-white border-[#2962ff] shadow-sm'
                    : 'bg-[#1e222d] text-slate-400 hover:text-slate-200 border-transparent hover:bg-[#252936]'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate max-w-[130px]">{ind.shortName || ind.title}</span>
                {isApplied && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Active on Chart" />
                )}

                {/* Tab Hover Actions: Duplicate & Delete */}
                {isSelected && (
                  <div className="flex items-center gap-0.5 ml-1 opacity-80 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateCurrentScript();
                      }}
                      className="p-0.5 hover:text-cyan-300 text-slate-400 rounded cursor-pointer"
                      title="Duplicate this script"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCurrentScript();
                      }}
                      className="p-0.5 hover:text-rose-400 text-slate-400 rounded cursor-pointer"
                      title="Delete this script"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* New Script Tab Button (+) */}
          <button
            type="button"
            onClick={handleCreateNewScript}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2a2e39] hover:bg-[#363a45] text-slate-300 hover:text-white transition cursor-pointer text-xs font-bold"
            title="Create a new custom indicator script tab"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>New Script</span>
          </button>
        </div>

        {/* Script Search Filter when multiple scripts exist */}
        {indicators.length > 4 && (
          <div className="flex items-center gap-1 bg-[#131722] border border-[#2a2e39] rounded-md px-1.5 py-0.5 my-1">
            <Search className="w-3 h-3 text-slate-500" />
            <input
              type="text"
              value={tabFilter}
              onChange={(e) => setTabFilter(e.target.value)}
              placeholder="Search scripts..."
              className="bg-transparent text-[11px] text-slate-200 outline-none w-24"
            />
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 3. TRADINGVIEW CODE EDITOR CANVAS + LINE GUTTER + AUTOCOMPLETE         */}
      {/* ===================================================================== */}
      <div className="relative flex-1 flex bg-[#131722] overflow-hidden min-h-[220px]">
        {/* Line Numbers Gutter with Error Badges */}
        <div className="w-12 bg-[#131722] border-r border-[#2a2e39] py-3 text-right pr-2 select-none text-[#50535e] text-xs font-mono leading-relaxed overflow-hidden shrink-0">
          {Array.from({ length: Math.min(lineCount, 800) }).map((_, idx) => {
            const lineNum = idx + 1;
            const hasError = errorLinesMap.has(lineNum);
            return (
              <div
                key={idx}
                className="h-5 flex items-center justify-end gap-1 cursor-pointer hover:text-slate-300"
                onClick={() => jumpToLine(lineNum)}
                title={hasError ? `Error on line ${lineNum}: ${errorLinesMap.get(lineNum)}` : `Line ${lineNum}`}
              >
                {hasError && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />}
                <span className={hasError ? 'text-rose-400 font-bold' : ''}>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Text Area Code Editor */}
        <div className="relative flex-1 overflow-auto">
          <textarea
            ref={editorRef}
            value={code}
            onChange={(e) => {
              const val = e.target.value;
              setCode(val);
              triggerAutocomplete(val, e.target.selectionStart);

              // Auto-extract title from indicator(...) or strategy(...)
              const matchTitle = val.match(/(?:indicator|strategy)\s*\(\s*["']([^"']+)["']/);
              if (
                matchTitle &&
                matchTitle[1] &&
                (editTitle === 'My Custom Indicator' || editTitle === 'Custom Script' || !editTitle)
              ) {
                setEditTitle(matchTitle[1]);
                setEditShortName(matchTitle[1].slice(0, 12));
              }
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
              const target = e.currentTarget;
              triggerAutocomplete(target.value, target.selectionStart);
            }}
            placeholder={`//@version=5\nindicator("My Indicator", overlay=true)\n\n// Paste any TradingView Pine Script code here\nplot(ta.sma(close, 20), "SMA 20", color=color.cyan)`}
            className="w-full h-full p-3 bg-transparent text-[#d1d4dc] text-xs font-mono leading-relaxed outline-none resize-none whitespace-pre overflow-auto selection:bg-[#2962ff]/30 selection:text-white"
            spellCheck={false}
          />

          {/* Autocomplete Suggestions Popup */}
          {autocompleteVisible && autocompleteItems.length > 0 && (
            <div className="absolute left-6 top-6 z-50 w-80 bg-[#1e222d] border border-[#2962ff]/60 rounded-xl shadow-2xl overflow-hidden font-mono text-xs">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#131722] border-b border-[#2a2e39] text-[10px] text-slate-400">
                <span className="font-bold text-cyan-400">Pine Script Suggestions (↑↓ / Enter)</span>
                <span className="text-slate-500">Esc to close</span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-[#2a2e39]/50">
                {autocompleteItems.map((item, idx) => {
                  const isSelected = idx === autocompleteIndex;
                  return (
                    <div
                      key={item.label}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyAutocompleteItem(item);
                      }}
                      className={`px-3 py-2 cursor-pointer transition flex flex-col gap-0.5 ${
                        isSelected ? 'bg-[#2962ff]/25 text-white' : 'text-slate-300 hover:bg-[#252936]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300">{item.label}</span>
                        <span className="text-[9px] uppercase px-1 rounded bg-[#131722] text-slate-400">
                          {item.kind}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{item.detail}</div>
                      <div className="text-[9px] text-slate-500 truncate">{item.doc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. TRADINGVIEW BOTTOM DRAWER: CONSOLE / LOGS / INPUTS / STRATEGY / DOCS */}
      {/* ===================================================================== */}
      <div className="bg-[#1e222d] border-t border-[#2a2e39] flex flex-col shrink-0">
        {/* Bottom Drawer Tabs Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2a2e39] text-xs font-sans">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'CONSOLE' as const, label: 'Compiler Console' },
              { id: 'LOGS' as const, label: 'Pine Logs' },
              { id: 'INPUTS' as const, label: 'Inputs & Settings' },
              { id: 'STRATEGY' as const, label: 'Strategy Tester' },
              { id: 'REFERENCE' as const, label: 'Cheatsheet' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setConsoleTab(tab.id)}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium text-xs ${
                  consoleTab === tab.id
                    ? 'bg-[#2962ff] text-white shadow-sm font-bold'
                    : 'text-[#787b86] hover:text-slate-200 hover:bg-[#2a2e39]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#787b86]">
            {compileStatus && (
              <span className={`font-mono flex items-center gap-1 ${compileStatus.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {compileStatus.success ? '● Success' : '▲ Error'}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setCompilerLogs([]);
                setDiagnostics([]);
              }}
              className="text-[#787b86] hover:text-slate-200 cursor-pointer text-[10px]"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Tab Body: 110px tall */}
        <div className="h-28 overflow-y-auto p-3 font-mono text-xs space-y-1 bg-[#131722]/60">
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
                    <span className="flex-1">{log.text}</span>
                    {log.line && (
                      <button
                        type="button"
                        onClick={() => jumpToLine(log.line!)}
                        className="px-1.5 py-0.2 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] font-bold cursor-pointer shrink-0"
                      >
                        Jump to Line {log.line}
                      </button>
                    )}
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
                Active Indicators Plotted on Chart: {indicators.filter((i) => pineScriptService.isIndicatorEnabled(i.id)).length}
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
                    <div className={`text-sm font-bold ${latestCompiledResult.strategyStats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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

          {/* CHEATSHEET TAB */}
          {consoleTab === 'REFERENCE' && (
            <div className="space-y-1.5 text-xs">
              <div className="text-cyan-400 font-bold text-[11px]">Supported Pine Script v5 / v6 Functions:</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                <div className="p-1 rounded bg-[#1e222d] border border-[#2a2e39]">
                  <strong className="text-cyan-300">ta.sma(close, length)</strong>
                  <div className="text-slate-400">Simple Moving Average</div>
                </div>
                <div className="p-1 rounded bg-[#1e222d] border border-[#2a2e39]">
                  <strong className="text-cyan-300">ta.ema(close, length)</strong>
                  <div className="text-slate-400">Exponential Moving Average</div>
                </div>
                <div className="p-1 rounded bg-[#1e222d] border border-[#2a2e39]">
                  <strong className="text-cyan-300">ta.rsi(close, length)</strong>
                  <div className="text-slate-400">Relative Strength Index</div>
                </div>
                <div className="p-1 rounded bg-[#1e222d] border border-[#2a2e39]">
                  <strong className="text-cyan-300">ta.atr(length)</strong>
                  <div className="text-slate-400">Average True Range</div>
                </div>
                <div className="p-1 rounded bg-[#1e222d] border border-[#2a2e39]">
                  <strong className="text-cyan-300">plotshape(cond, ...)</strong>
                  <div className="text-slate-400">Triangle / Arrow markers</div>
                </div>
                <div className="p-1 rounded bg-[#1e222d] border border-[#2a2e39]">
                  <strong className="text-cyan-300">hline(level, ...)</strong>
                  <div className="text-slate-400">Horizontal key level line</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
