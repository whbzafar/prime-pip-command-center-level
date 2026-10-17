import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Maximize2,
  Minimize2,
  Trash2,
  Eye,
  EyeOff,
  Crosshair as CrosshairIcon,
  Minus,
  Sparkles,
} from 'lucide-react';
import { LiveCandle, computeIndicators, ChartIndicators } from '../../services/liveChartDataService';

export interface ChartDrawing {
  id: string;
  type: 'HORIZONTAL_LINE' | 'TRENDLINE' | 'PRICE_LABEL';
  price1: number;
  time1?: number;
  price2?: number;
  time2?: number;
  color: string;
  label?: string;
}

interface LiveAnalysisChartProps {
  candles: LiveCandle[];
  symbol: string;
  timeframe: string;
  isLiveStreaming?: boolean;
  onOpenTradeModal?: (price: number) => void;
}

export const LiveAnalysisChart: React.FC<LiveAnalysisChartProps> = ({
  candles,
  symbol,
  timeframe,
  isLiveStreaming = false,
  onOpenTradeModal,
}) => {
  // Chart Display Settings
  const [chartType, setChartType] = useState<'CANDLE' | 'LINE'>('CANDLE');
  const [visibleCount, setVisibleCount] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<number>(0); // 0 means latest candles visible

  // Indicator Visibility
  const [showEMA20, setShowEMA20] = useState<boolean>(true);
  const [showEMA50, setShowEMA50] = useState<boolean>(true);
  const [showEMA200, setShowEMA200] = useState<boolean>(false);
  const [showBB, setShowBB] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showRSI, setShowRSI] = useState<boolean>(false);
  const [showMACD, setShowMACD] = useState<boolean>(false);

  // Drawing Tools
  const [activeDrawingTool, setActiveDrawingTool] = useState<'NONE' | 'HORIZONTAL' | 'TRENDLINE'>('NONE');
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [trendlineStart, setTrendlineStart] = useState<{ x: number; price: number; time: number } | null>(null);

  // Crosshair tracking
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<LiveCandle | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startDragXRef = useRef<number>(0);
  const startPanOffsetRef = useRef<number>(0);

  // Compute indicators for the entire candle series
  const indicators: ChartIndicators = useMemo(() => {
    return computeIndicators(candles);
  }, [candles]);

  // Sliced Visible Candles based on visibleCount and panOffset
  const { visibleCandles, visibleIndices } = useMemo(() => {
    const total = candles.length;
    if (total === 0) return { visibleCandles: [], visibleIndices: [] };

    const end = Math.max(1, total - panOffset);
    const start = Math.max(0, end - visibleCount);

    const sliced = candles.slice(start, end);
    const indices: number[] = [];
    for (let i = start; i < end; i++) indices.push(i);

    return { visibleCandles: sliced, visibleIndices: indices };
  }, [candles, visibleCount, panOffset]);

  // Dynamic Chart Geometry (Min / Max / Padding)
  const geometry = useMemo(() => {
    if (visibleCandles.length === 0) {
      return { minPrice: 0, maxPrice: 1, range: 1, maxVol: 1 };
    }

    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    visibleCandles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;
    });

    // Check Bollinger Bands extent if active
    if (showBB) {
      visibleIndices.forEach((idx) => {
        const u = indicators.bollingerUpper[idx];
        const l = indicators.bollingerLower[idx];
        if (u !== null && u > max) max = u;
        if (l !== null && l < min) min = l;
      });
    }

    const padding = (max - min) * 0.08 || 0.001;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      range: max - min + padding * 2,
      maxVol: maxVol || 1,
    };
  }, [visibleCandles, visibleIndices, showBB, indicators]);

  // Latest candle for live telemetry
  const latestCandle = candles[candles.length - 1] || null;
  const prevCandle = candles[candles.length - 2] || null;
  const priceChange = latestCandle && prevCandle ? latestCandle.close - prevCandle.close : 0;
  const priceChangePct = latestCandle && prevCandle && prevCandle.close > 0 ? (priceChange / prevCandle.close) * 100 : 0;
  const isUp = priceChange >= 0;

  // Zoom Handlers
  const handleZoomIn = () => setVisibleCount((v) => Math.max(25, v - 20));
  const handleZoomOut = () => setVisibleCount((v) => Math.min(250, v + 25));
  const handleResetZoom = () => {
    setVisibleCount(100);
    setPanOffset(0);
  };

  // Wheel zoom / pan
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    } else {
      // Horizontal pan
      const step = Math.sign(e.deltaY) * 5;
      setPanOffset((prev) => Math.max(0, Math.min(candles.length - 20, prev + step)));
    }
  };

  // Mouse pan drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeDrawingTool !== 'NONE') return;
    isDraggingRef.current = true;
    startDragXRef.current = e.clientX;
    startPanOffsetRef.current = panOffset;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || visibleCandles.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    setCrosshairPos({ x: relX, y: relY });

    // Identify hovered candle
    const chartWidth = rect.width - 65; // 65px right scale
    const candleWidth = chartWidth / visibleCandles.length;
    const candleIdx = Math.floor(relX / candleWidth);
    if (candleIdx >= 0 && candleIdx < visibleCandles.length) {
      setHoveredCandle(visibleCandles[candleIdx]);
    }

    if (isDraggingRef.current) {
      const deltaX = e.clientX - startDragXRef.current;
      const candlesShift = Math.round(deltaX / candleWidth);
      setPanOffset(Math.max(0, Math.min(candles.length - 20, startPanOffsetRef.current + candlesShift)));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Canvas Click for Drawing Tool placement
  const handleChartClick = (e: React.MouseEvent) => {
    if (activeDrawingTool === 'NONE' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    // Calculate clicked price
    const chartHeight = rect.height - 40;
    const priceRatio = Math.max(0, Math.min(1, (relY - 10) / chartHeight));
    const clickedPrice = geometry.maxPrice - priceRatio * geometry.range;

    if (activeDrawingTool === 'HORIZONTAL') {
      const newDraw: ChartDrawing = {
        id: `h_${Date.now()}`,
        type: 'HORIZONTAL_LINE',
        price1: Number(clickedPrice.toFixed(symbol.includes('JPY') ? 3 : 5)),
        color: '#00f0ff',
        label: `Level ${clickedPrice.toFixed(symbol.includes('JPY') ? 3 : 5)}`,
      };
      setDrawings((prev) => [...prev, newDraw]);
      setActiveDrawingTool('NONE');
    }
  };

  const clearAllDrawings = () => setDrawings([]);

  // Sub-panel heights
  const rsiHeight = showRSI ? 80 : 0;
  const macdHeight = showMACD ? 80 : 0;
  const totalSubPanels = rsiHeight + macdHeight;

  return (
    <div className="w-full rounded-2xl bg-[#060b18] border border-slate-800 shadow-2xl overflow-hidden flex flex-col font-mono-code select-none">
      {/* 1. CHART TOP COMMAND BAR */}
      <div className="px-3 py-2 bg-[#081024]/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Symbol & Live OHLC Stats Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm text-slate-100 tracking-tight">{symbol}</span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
              {timeframe}
            </span>
            {isLiveStreaming && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE STREAM
              </span>
            )}
          </div>

          {/* Live Price & Change */}
          {latestCandle && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-black text-white text-sm">
                {latestCandle.close.toFixed(symbol.includes('JPY') ? 3 : symbol.includes('BTC') ? 2 : 5)}
              </span>
              <span
                className={`font-bold flex items-center gap-0.5 text-[11px] ${
                  isUp ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>
                  {priceChange >= 0 ? '+' : ''}
                  {priceChange.toFixed(symbol.includes('JPY') ? 3 : 5)} ({priceChangePct.toFixed(2)}%)
                </span>
              </span>
            </div>
          )}

          {/* Interactive Hovered Candle Inspection Readout */}
          {hoveredCandle && (
            <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 pl-2 border-l border-slate-800">
              <span>
                O: <strong className="text-slate-200">{hoveredCandle.open}</strong>
              </span>
              <span>
                H: <strong className="text-emerald-400">{hoveredCandle.high}</strong>
              </span>
              <span>
                L: <strong className="text-rose-400">{hoveredCandle.low}</strong>
              </span>
              <span>
                C: <strong className="text-cyan-300">{hoveredCandle.close}</strong>
              </span>
              <span>
                Vol: <strong className="text-amber-300">{Math.round(hoveredCandle.volume).toLocaleString()}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Right: Chart Controls & Indicators Toggle Bar */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Chart Style Toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setChartType('CANDLE')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                chartType === 'CANDLE' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType('LINE')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                chartType === 'LINE' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Line
            </button>
          </div>

          {/* Technical Indicator Switches */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setShowEMA20(!showEMA20)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                showEMA20 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="EMA 20"
            >
              EMA 20
            </button>
            <button
              onClick={() => setShowEMA50(!showEMA50)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                showEMA50 ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="EMA 50"
            >
              EMA 50
            </button>
            <button
              onClick={() => setShowEMA200(!showEMA200)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                showEMA200 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="EMA 200"
            >
              EMA 200
            </button>
            <button
              onClick={() => setShowBB(!showBB)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                showBB ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Bollinger Bands (20, 2)"
            >
              BB
            </button>
            <button
              onClick={() => setShowRSI(!showRSI)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                showRSI ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="RSI 14"
            >
              RSI
            </button>
            <button
              onClick={() => setShowMACD(!showMACD)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                showMACD ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="MACD (12, 26, 9)"
            >
              MACD
            </button>
          </div>

          {/* Drawing Tools Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveDrawingTool(activeDrawingTool === 'HORIZONTAL' ? 'NONE' : 'HORIZONTAL')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition ${
                activeDrawingTool === 'HORIZONTAL'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Click on chart to place a Horizontal Support/Resistance Level"
            >
              + S/R Line
            </button>
            {drawings.length > 0 && (
              <button
                onClick={clearAllDrawings}
                className="p-1 rounded text-slate-400 hover:text-rose-400 transition cursor-pointer"
                title="Clear Drawings"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Zoom & Reset Buttons */}
          <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN SVG CHART VIEWPORT */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          setCrosshairPos(null);
          setHoveredCandle(null);
        }}
        onClick={handleChartClick}
        className={`relative w-full h-[480px] bg-[#040814] overflow-hidden select-none ${
          activeDrawingTool !== 'NONE' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        {visibleCandles.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Activity className="w-8 h-8 mb-2 opacity-30 animate-pulse" />
            <span>Connecting to live feed for {symbol}...</span>
          </div>
        ) : (
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 480">
            {/* Price Grid Horizontal Lines */}
            {[0.15, 0.35, 0.55, 0.75, 0.9].map((ratio, idx) => {
              const mainH = 480 - totalSubPanels;
              const y = mainH * ratio;
              const price = geometry.maxPrice - ratio * geometry.range;
              return (
                <g key={`grid-${idx}`}>
                  <line x1="0" y1={y} x2="935" y2={y} stroke="#172238" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="940" y={y + 4} fill="#64748b" fontSize="9.5" fontFamily="monospace">
                    {price.toFixed(symbol.includes('JPY') ? 3 : symbol.includes('BTC') ? 2 : 5)}
                  </text>
                </g>
              );
            })}

            {/* Volume Histogram (35px at bottom of main chart area) */}
            {showVolume &&
              visibleCandles.map((c, i) => {
                const chartW = 935;
                const candleW = chartW / visibleCandles.length;
                const x = i * candleW;
                const mainH = 480 - totalSubPanels;
                const volH = (c.volume / geometry.maxVol) * 45;
                const y = mainH - volH;
                const isBull = c.close >= c.open;
                return (
                  <rect
                    key={`v-${i}`}
                    x={x + 1}
                    y={y}
                    width={Math.max(1, candleW - 2)}
                    height={volH}
                    fill={isBull ? '#10b981' : '#f43f5e'}
                    opacity="0.22"
                  />
                );
              })}

            {/* Bollinger Bands Fill */}
            {showBB && (
              <polygon
                fill="#00f0ff"
                fillOpacity="0.05"
                points={[
                  ...visibleIndices.map((idx, i) => {
                    const u = indicators.bollingerUpper[idx];
                    if (u === null) return '';
                    const chartW = 935;
                    const candleW = chartW / visibleCandles.length;
                    const x = i * candleW + candleW / 2;
                    const mainH = 480 - totalSubPanels;
                    const y = ((geometry.maxPrice - u) / geometry.range) * (mainH - 40) + 15;
                    return `${x},${y}`;
                  }),
                  ...visibleIndices
                    .slice()
                    .reverse()
                    .map((idx, i) => {
                      const l = indicators.bollingerLower[idx];
                      if (l === null) return '';
                      const revI = visibleIndices.length - 1 - i;
                      const chartW = 935;
                      const candleW = chartW / visibleCandles.length;
                      const x = revI * candleW + candleW / 2;
                      const mainH = 480 - totalSubPanels;
                      const y = ((geometry.maxPrice - l) / geometry.range) * (mainH - 40) + 15;
                      return `${x},${y}`;
                    }),
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
            )}

            {/* Candlesticks or Line Series */}
            {chartType === 'CANDLE' ? (
              visibleCandles.map((c, i) => {
                const chartW = 935;
                const candleW = chartW / visibleCandles.length;
                const centerX = i * candleW + candleW / 2;
                const mainH = 480 - totalSubPanels;
                const isBull = c.close >= c.open;

                const highY = ((geometry.maxPrice - c.high) / geometry.range) * (mainH - 40) + 15;
                const lowY = ((geometry.maxPrice - c.low) / geometry.range) * (mainH - 40) + 15;
                const openY = ((geometry.maxPrice - c.open) / geometry.range) * (mainH - 40) + 15;
                const closeY = ((geometry.maxPrice - c.close) / geometry.range) * (mainH - 40) + 15;

                const bodyTop = Math.min(openY, closeY);
                const bodyH = Math.max(1.5, Math.abs(closeY - openY));
                const bodyW = Math.max(2, candleW * 0.72);

                return (
                  <g key={`c-${i}`}>
                    {/* Wicks */}
                    <line
                      x1={centerX}
                      y1={highY}
                      x2={centerX}
                      y2={lowY}
                      stroke={isBull ? '#10b981' : '#f43f5e'}
                      strokeWidth={Math.max(1, candleW * 0.14)}
                    />
                    {/* Body */}
                    <rect
                      x={centerX - bodyW / 2}
                      y={bodyTop}
                      width={bodyW}
                      height={bodyH}
                      rx={0.5}
                      fill={isBull ? '#10b981' : '#f43f5e'}
                    />
                  </g>
                );
              })
            ) : (
              <polyline
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2"
                points={visibleCandles
                  .map((c, i) => {
                    const chartW = 935;
                    const candleW = chartW / visibleCandles.length;
                    const x = i * candleW + candleW / 2;
                    const mainH = 480 - totalSubPanels;
                    const y = ((geometry.maxPrice - c.close) / geometry.range) * (mainH - 40) + 15;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}

            {/* EMA 20 Polyline */}
            {showEMA20 && (
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeOpacity="0.9"
                points={visibleIndices
                  .map((idx, i) => {
                    const val = indicators.ema20[idx];
                    if (val === null) return '';
                    const chartW = 935;
                    const candleW = chartW / visibleCandles.length;
                    const x = i * candleW + candleW / 2;
                    const mainH = 480 - totalSubPanels;
                    const y = ((geometry.maxPrice - val) / geometry.range) * (mainH - 40) + 15;
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ')}
              />
            )}

            {/* EMA 50 Polyline */}
            {showEMA50 && (
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeOpacity="0.9"
                points={visibleIndices
                  .map((idx, i) => {
                    const val = indicators.ema50[idx];
                    if (val === null) return '';
                    const chartW = 935;
                    const candleW = chartW / visibleCandles.length;
                    const x = i * candleW + candleW / 2;
                    const mainH = 480 - totalSubPanels;
                    const y = ((geometry.maxPrice - val) / geometry.range) * (mainH - 40) + 15;
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ')}
              />
            )}

            {/* EMA 200 Polyline */}
            {showEMA200 && (
              <polyline
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.5"
                strokeOpacity="0.9"
                points={visibleIndices
                  .map((idx, i) => {
                    const val = indicators.ema200[idx];
                    if (val === null) return '';
                    const chartW = 935;
                    const candleW = chartW / visibleCandles.length;
                    const x = i * candleW + candleW / 2;
                    const mainH = 480 - totalSubPanels;
                    const y = ((geometry.maxPrice - val) / geometry.range) * (mainH - 40) + 15;
                    return `${x},${y}`;
                  })
                  .filter(Boolean)
                  .join(' ')}
              />
            )}

            {/* User Placed Drawing Levels (Horizontal Support/Resistance Lines) */}
            {drawings.map((draw) => {
              const mainH = 480 - totalSubPanels;
              const y = ((geometry.maxPrice - draw.price1) / geometry.range) * (mainH - 40) + 15;
              return (
                <g key={draw.id}>
                  <line x1="0" y1={y} x2="935" y2={y} stroke={draw.color} strokeWidth="1.5" strokeDasharray="4 2" />
                  <rect x="10" y={y - 9} width="90" height="18" rx="4" fill="#0b1730" stroke={draw.color} strokeWidth="1" />
                  <text x="14" y={y + 4} fill={draw.color} fontSize="10" fontWeight="bold">
                    {draw.label || draw.price1}
                  </text>
                </g>
              );
            })}

            {/* Current Market Price Tracker Line */}
            {latestCandle && (
              <g>
                {(() => {
                  const mainH = 480 - totalSubPanels;
                  const curY = ((geometry.maxPrice - latestCandle.close) / geometry.range) * (mainH - 40) + 15;
                  return (
                    <>
                      <line x1="0" y1={curY} x2="935" y2={curY} stroke="#00f0ff" strokeWidth="1" strokeDasharray="3 3" />
                      <rect x="936" y={curY - 9} width="62" height="18" rx="3" fill="#0284c7" />
                      <text x="940" y={curY + 4} fill="#ffffff" fontSize="9.5" fontWeight="bold">
                        {latestCandle.close.toFixed(symbol.includes('JPY') ? 3 : 5)}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}

            {/* Crosshair Overlay */}
            {crosshairPos && (
              <g pointerEvents="none">
                <line x1="0" y1={crosshairPos.y} x2="935" y2={crosshairPos.y} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2 2" />
                <line x1={crosshairPos.x} y1="0" x2={crosshairPos.x} y2={480} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="2 2" />
              </g>
            )}
          </svg>
        )}

        {/* Floating Indicator Legend in Chart Corner */}
        <div className="absolute top-2 left-3 pointer-events-none flex items-center gap-1.5 text-[10px] font-mono-code">
          {showEMA20 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-amber-500/40 text-amber-300 font-bold">
              EMA 20
            </span>
          )}
          {showEMA50 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-sky-500/40 text-sky-300 font-bold">
              EMA 50
            </span>
          )}
          {showEMA200 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-purple-500/40 text-purple-300 font-bold">
              EMA 200
            </span>
          )}
          {showBB && (
            <span className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-cyan-500/40 text-cyan-300 font-bold">
              BB (20, 2)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
