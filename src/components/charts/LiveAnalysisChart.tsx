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
  Zap,
} from 'lucide-react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  UTCTimestamp,
} from 'lightweight-charts';
import { LiveCandle, computeIndicators } from '../../services/liveChartDataService';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Indicator Visibility States
  const [showEMA20, setShowEMA20] = useState<boolean>(true);
  const [showEMA50, setShowEMA50] = useState<boolean>(true);
  const [showEMA200, setShowEMA200] = useState<boolean>(false);
  const [showBB, setShowBB] = useState<boolean>(false);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredPrice, setHoveredPrice] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    time: string;
  } | null>(null);

  // Latest candle for live HUD header
  const latestCandle = candles[candles.length - 1] || null;
  const prevCandle = candles[candles.length - 2] || null;
  const priceChange = latestCandle && prevCandle ? latestCandle.close - prevCandle.close : 0;
  const priceChangePct =
    latestCandle && prevCandle && prevCandle.close > 0 ? (priceChange / prevCandle.close) * 100 : 0;
  const isUp = priceChange >= 0;

  // Initialize TradingView lightweight chart instance
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    // Clean up previous instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const chart = createChart(container, {
      width: container.clientWidth || 800,
      height: container.clientHeight || 560,
      layout: {
        background: { type: ColorType.Solid, color: '#090e17' },
        textColor: '#94a3b8',
        fontSize: 11,
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

    // Candlestick Series (TradingView institutional green/red style)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
    });
    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Technical Indicators Series
    ema20SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#06b6d4',
      lineWidth: 2,
      title: 'EMA 20',
    });

    ema50SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      title: 'EMA 50',
    });

    ema200SeriesRef.current = chart.addSeries(LineSeries, {
      color: '#a855f7',
      lineWidth: 2,
      title: 'EMA 200',
    });

    bbUpperSeriesRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(236, 72, 153, 0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: 'BB Upper',
    });

    bbLowerSeriesRef.current = chart.addSeries(LineSeries, {
      color: 'rgba(236, 72, 153, 0.7)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      title: 'BB Lower',
    });

    // Crosshair hover listener for OHLC HUD update
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setHoveredPrice(null);
        return;
      }
      const data: any = param.seriesData.get(candleSeries);
      if (data && data.open !== undefined) {
        const timeStr = typeof param.time === 'number'
          ? new Date(param.time * 1000).toLocaleString()
          : String(param.time);
        setHoveredPrice({
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          time: timeStr,
        });
      }
    });

    // Responsive Auto-Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height });
      }
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

  // Update Data across all Series when candles change
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    // Deduplicate and format chronological bars for lightweight-charts
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const seenTimes = new Set<number>();
    const formattedCandles: { time: UTCTimestamp; open: number; high: number; low: number; close: number }[] = [];
    const formattedVolume: { time: UTCTimestamp; value: number; color: string }[] = [];

    sorted.forEach((c) => {
      const sec = Math.floor(c.time / 1000) as UTCTimestamp;
      if (!seenTimes.has(sec)) {
        seenTimes.add(sec);
        formattedCandles.push({
          time: sec,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        });
        formattedVolume.push({
          time: sec,
          value: c.volume || 100,
          color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)',
        });
      }
    });

    if (formattedCandles.length === 0) return;

    candleSeriesRef.current.setData(formattedCandles);

    if (volumeSeriesRef.current) {
      if (showVolume) {
        volumeSeriesRef.current.setData(formattedVolume);
      } else {
        volumeSeriesRef.current.setData([]);
      }
    }

    // Compute technical indicators
    const indicators = computeIndicators(sorted);

    // EMA 20
    if (ema20SeriesRef.current) {
      if (showEMA20) {
        const ema20Data: { time: UTCTimestamp; value: number }[] = [];
        sorted.forEach((c, i) => {
          const val = indicators.ema20[i];
          const sec = Math.floor(c.time / 1000) as UTCTimestamp;
          if (val !== null && !isNaN(val)) ema20Data.push({ time: sec, value: val });
        });
        ema20SeriesRef.current.setData(ema20Data);
      } else {
        ema20SeriesRef.current.setData([]);
      }
    }

    // EMA 50
    if (ema50SeriesRef.current) {
      if (showEMA50) {
        const ema50Data: { time: UTCTimestamp; value: number }[] = [];
        sorted.forEach((c, i) => {
          const val = indicators.ema50[i];
          const sec = Math.floor(c.time / 1000) as UTCTimestamp;
          if (val !== null && !isNaN(val)) ema50Data.push({ time: sec, value: val });
        });
        ema50SeriesRef.current.setData(ema50Data);
      } else {
        ema50SeriesRef.current.setData([]);
      }
    }

    // EMA 200
    if (ema200SeriesRef.current) {
      if (showEMA200) {
        const ema200Data: { time: UTCTimestamp; value: number }[] = [];
        sorted.forEach((c, i) => {
          const val = indicators.ema200[i];
          const sec = Math.floor(c.time / 1000) as UTCTimestamp;
          if (val !== null && !isNaN(val)) ema200Data.push({ time: sec, value: val });
        });
        ema200SeriesRef.current.setData(ema200Data);
      } else {
        ema200SeriesRef.current.setData([]);
      }
    }

    // Bollinger Bands
    if (bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      if (showBB) {
        const upperData: { time: UTCTimestamp; value: number }[] = [];
        const lowerData: { time: UTCTimestamp; value: number }[] = [];
        sorted.forEach((c, i) => {
          const u = indicators.bollingerUpper[i];
          const l = indicators.bollingerLower[i];
          const sec = Math.floor(c.time / 1000) as UTCTimestamp;
          if (u !== null && !isNaN(u)) upperData.push({ time: sec, value: u });
          if (l !== null && !isNaN(l)) lowerData.push({ time: sec, value: l });
        });
        bbUpperSeriesRef.current.setData(upperData);
        bbLowerSeriesRef.current.setData(lowerData);
      } else {
        bbUpperSeriesRef.current.setData([]);
        bbLowerSeriesRef.current.setData([]);
      }
    }
  }, [candles, showEMA20, showEMA50, showEMA200, showBB, showVolume]);

  const handleFitContent = () => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  };

  const handleZoomIn = () => {
    if (chartInstanceRef.current) {
      const timeScale = chartInstanceRef.current.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (range) {
        const center = (range.from + range.to) / 2;
        const halfSpan = (range.to - range.from) * 0.35;
        timeScale.setVisibleLogicalRange({ from: center - halfSpan, to: center + halfSpan });
      }
    }
  };

  const handleZoomOut = () => {
    if (chartInstanceRef.current) {
      const timeScale = chartInstanceRef.current.timeScale();
      const range = timeScale.getVisibleLogicalRange();
      if (range) {
        const center = (range.from + range.to) / 2;
        const halfSpan = (range.to - range.from) * 0.75;
        timeScale.setVisibleLogicalRange({ from: center - halfSpan, to: center + halfSpan });
      }
    }
  };

  return (
    <div
      className={`rounded-2xl bg-[#090e17] border border-slate-800 shadow-2xl flex flex-col overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'w-full h-[620px]'
      }`}
    >
      {/* 1. TOP TELEMETRY & OHLC HUD BAR */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code">
        {/* Symbol & Live Price Telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm tracking-tight">{symbol}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
              {timeframe}
            </span>
            {isLiveStreaming && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>LIVE STREAM</span>
              </span>
            )}
          </div>

          {latestCandle && (
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {latestCandle.close.toFixed(symbol.includes('JPY') ? 3 : symbol.includes('BTC') ? 2 : 5)}
              </span>
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                  isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>
                  {priceChange > 0 ? '+' : ''}
                  {priceChangePct.toFixed(2)}%
                </span>
              </span>
            </div>
          )}

          {/* Crosshair Hover OHLC HUD */}
          {hoveredPrice ? (
            <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 pl-2 border-l border-slate-800">
              <span>O: <b className="text-slate-200">{hoveredPrice.open.toFixed(4)}</b></span>
              <span>H: <b className="text-emerald-400">{hoveredPrice.high.toFixed(4)}</b></span>
              <span>L: <b className="text-rose-400">{hoveredPrice.low.toFixed(4)}</b></span>
              <span>C: <b className="text-slate-200">{hoveredPrice.close.toFixed(4)}</b></span>
            </div>
          ) : (
            latestCandle && (
              <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 pl-2 border-l border-slate-800">
                <span>H: <b className="text-emerald-400">{latestCandle.high.toFixed(4)}</b></span>
                <span>L: <b className="text-rose-400">{latestCandle.low.toFixed(4)}</b></span>
                <span>Bars: <b className="text-cyan-400">{candles.length}</b></span>
              </div>
            )
          )}
        </div>

        {/* Indicator Toggles & Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Indicator Pills */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[10px]">
            <button
              onClick={() => setShowEMA20((v) => !v)}
              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                showEMA20 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              EMA 20
            </button>
            <button
              onClick={() => setShowEMA50((v) => !v)}
              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                showEMA50 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              EMA 50
            </button>
            <button
              onClick={() => setShowEMA200((v) => !v)}
              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                showEMA200 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              EMA 200
            </button>
            <button
              onClick={() => setShowBB((v) => !v)}
              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                showBB ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              BOLLINGER
            </button>
            <button
              onClick={() => setShowVolume((v) => !v)}
              className={`px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                showVolume ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
              }`}
            >
              VOL
            </button>
          </div>

          {/* Zoom & Fit Actions */}
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFitContent}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title="Reset Zoom / Fit History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Chart'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Quick Trade Trigger */}
          {onOpenTradeModal && latestCandle && (
            <button
              onClick={() => onOpenTradeModal(latestCandle.close)}
              className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>TRADE</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN TRADINGVIEW LIGHTWEIGHT CANVAS CONTAINER */}
      <div className="flex-1 w-full relative">
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
