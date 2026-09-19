// PRIMEPIP FX COMMAND CENTER — PSYCHOLOGY CORE 2090
// Futuristic Deterministic Candlestick Scenario Simulation Engine
import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Gauge,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { TradingScenario, ScenarioCandle } from './scenarioTypes';
import { calmAudio } from '../calmAudio';

interface ScenarioSimulatorProps {
  scenario: TradingScenario;
  onReachPressurePoint?: () => void;
  onProceedToDecision?: () => void;
  className?: string;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  scenario,
  onReachPressurePoint,
  onProceedToDecision,
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1 = normal, 2 = fast
  const [hasTriggeredPressure, setHasTriggeredPressure] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const visibleCandles = scenario.candles.slice(0, currentStep + 1);
  const currentCandle: ScenarioCandle | undefined = scenario.candles[currentStep];

  // Calculate current floating R
  const isAtOrPastPressure = currentStep >= scenario.pressureCandleIndex;
  const currentFloatingR = isAtOrPastPressure
    ? scenario.floatingRAtPressure
    : currentCandle
    ? scenario.tradeDirection === 'LONG'
      ? ((currentCandle.close - scenario.entryPrice) / (scenario.entryPrice - scenario.stopLossPrice)) * -1
      : ((scenario.entryPrice - currentCandle.close) / (scenario.stopLossPrice - scenario.entryPrice)) * -1
    : 0;

  const floatingDollar = (currentFloatingR * scenario.plannedDollarRisk).toFixed(0);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      const intervalMs = playbackSpeed === 1 ? 1400 : 700;
      timerRef.current = setTimeout(() => {
        if (currentStep < scenario.candles.length - 1) {
          const nextStep = currentStep + 1;
          setCurrentStep(nextStep);

          // Check if reached pressure point
          if (nextStep === scenario.pressureCandleIndex && !hasTriggeredPressure) {
            setIsPlaying(false);
            setHasTriggeredPressure(true);
            calmAudio.playSingingBowlChime(432);
            if (onReachPressurePoint) onReachPressurePoint();
          }
        } else {
          setIsPlaying(false);
        }
      }, intervalMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStep, playbackSpeed, scenario, hasTriggeredPressure, onReachPressurePoint]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    if (currentStep < scenario.candles.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (nextStep === scenario.pressureCandleIndex && !hasTriggeredPressure) {
        setHasTriggeredPressure(true);
        setIsPlaying(false);
        if (onReachPressurePoint) onReachPressurePoint();
      }
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setHasTriggeredPressure(false);
  };

  // SVG Chart Dimensions & Scale calculations
  const chartHeight = 240;
  const chartWidth = 560;
  const padLeft = 45;
  const padRight = 55;
  const padTop = 30;
  const padBottom = 30;

  // Find min and max price across all scenario candles, plus stop/entry/tp
  const allPrices: number[] = scenario.candles.flatMap((c) => [c.high, c.low]);
  allPrices.push(scenario.entryPrice);
  allPrices.push(scenario.stopLossPrice);
  if (scenario.takeProfitPrice) allPrices.push(scenario.takeProfitPrice);

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 0.001;

  const getY = (price: number) => {
    const ratio = (price - minPrice) / priceRange;
    return chartHeight - padBottom - ratio * (chartHeight - padTop - padBottom);
  };

  const availableWidth = chartWidth - padLeft - padRight;
  const candleSpacing = availableWidth / Math.max(scenario.candles.length - 1, 1);

  return (
    <div
      id="psych-scenario-simulator"
      className={`rounded-2xl border border-indigo-500/40 bg-[#060913] p-4 sm:p-5 shadow-2xl overflow-hidden text-slate-100 ${className}`}
    >
      {/* Simulator HUD Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono-code font-bold text-xs">
            2090
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-military font-bold text-slate-100 tracking-wider">
                {scenario.symbol} • {scenario.timeframe}
              </span>
              <span
                className={`text-[9px] font-mono-code font-bold px-2 py-0.5 rounded border ${
                  scenario.tradeDirection === 'LONG'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {scenario.tradeDirection} POSITION
              </span>
            </div>
            <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
              {scenario.subtitle}
            </p>
          </div>
        </div>

        {/* Floating P&L / R-Multiple Telemetry Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] font-mono-code text-slate-400 block uppercase">
              Simulated Floating P&L
            </span>
            <div className="flex items-center gap-1.5 justify-end">
              <span
                className={`text-sm sm:text-base font-military font-black tracking-wider ${
                  currentFloatingR > 0
                    ? 'text-emerald-400'
                    : currentFloatingR < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {currentFloatingR > 0 ? `+${currentFloatingR.toFixed(1)}R` : `${currentFloatingR.toFixed(1)}R`}
              </span>
              <span className="text-[11px] font-mono-code text-slate-400">
                ({Number(floatingDollar) >= 0 ? `+$${floatingDollar}` : `-$${Math.abs(Number(floatingDollar))}`})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Parameters Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 px-3 my-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] font-mono-code text-slate-300">
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Planned Entry:</span>
          <span className="text-cyan-300 font-bold">{scenario.entryPrice}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Predefined Stop:</span>
          <span className="text-rose-400 font-bold">{scenario.stopLossPrice} (-1.0R)</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Target Objective:</span>
          <span className="text-emerald-400 font-bold">
            {scenario.takeProfitPrice || 'Structural'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[9px] uppercase">Max Planned Risk:</span>
          <span className="text-amber-300 font-bold">${scenario.plannedDollarRisk} (1.0% Equity)</span>
        </div>
      </div>

      {/* SVG Candlestick Viewport */}
      <div className="relative w-full overflow-x-auto rounded-xl bg-[#03060d] border border-indigo-950 p-2 select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto max-h-[280px] overflow-visible"
        >
          {/* Subtle Grid Lines */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={chartWidth - padRight}
            y2={padTop}
            stroke="#1e293b"
            strokeDasharray="2 4"
            strokeWidth="0.8"
          />
          <line
            x1={padLeft}
            y1={chartHeight / 2}
            x2={chartWidth - padRight}
            y2={chartHeight / 2}
            stroke="#1e293b"
            strokeDasharray="2 4"
            strokeWidth="0.8"
          />
          <line
            x1={padLeft}
            y1={chartHeight - padBottom}
            x2={chartWidth - padRight}
            y2={chartHeight - padBottom}
            stroke="#1e293b"
            strokeDasharray="2 4"
            strokeWidth="0.8"
          />

          {/* Reference Price Lines */}
          {/* Entry Line (Cyan) */}
          <line
            x1={padLeft}
            y1={getY(scenario.entryPrice)}
            x2={chartWidth - padRight}
            y2={getY(scenario.entryPrice)}
            stroke="#06b6d4"
            strokeDasharray="3 3"
            strokeWidth="1.2"
          />
          <text
            x={chartWidth - padRight + 4}
            y={getY(scenario.entryPrice) + 3}
            fill="#06b6d4"
            fontSize="9"
            fontFamily="monospace"
          >
            ENTRY
          </text>

          {/* Stop Loss Line (Rose) */}
          <line
            x1={padLeft}
            y1={getY(scenario.stopLossPrice)}
            x2={chartWidth - padRight}
            y2={getY(scenario.stopLossPrice)}
            stroke="#f43f5e"
            strokeDasharray="3 3"
            strokeWidth="1.2"
          />
          <text
            x={chartWidth - padRight + 4}
            y={getY(scenario.stopLossPrice) + 3}
            fill="#f43f5e"
            fontSize="9"
            fontFamily="monospace"
          >
            STOP -1R
          </text>

          {/* Take Profit Line (Emerald) if defined */}
          {scenario.takeProfitPrice && (
            <>
              <line
                x1={padLeft}
                y1={getY(scenario.takeProfitPrice)}
                x2={chartWidth - padRight}
                y2={getY(scenario.takeProfitPrice)}
                stroke="#10b981"
                strokeDasharray="3 3"
                strokeWidth="1.2"
              />
              <text
                x={chartWidth - padRight + 4}
                y={getY(scenario.takeProfitPrice) + 3}
                fill="#10b981"
                fontSize="9"
                fontFamily="monospace"
              >
                TARGET
              </text>
            </>
          )}

          {/* Visible Candlesticks */}
          {visibleCandles.map((c, i) => {
            const x = padLeft + i * candleSpacing;
            const yOpen = getY(c.open);
            const yClose = getY(c.close);
            const yHigh = getY(c.high);
            const yLow = getY(c.low);
            const isGreen = c.close >= c.open;
            const candleColor = isGreen ? '#10b981' : '#f43f5e';
            const bodyY = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(Math.abs(yClose - yOpen), 2);
            const candleWidth = 14;

            const isPressureCandle = i === scenario.pressureCandleIndex;
            const isCurrent = i === currentStep;

            return (
              <g key={c.index} className="transition-opacity duration-200">
                {/* Wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1.5"
                />
                {/* Candle Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyY}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={isGreen ? '#10b981' : '#f43f5e'}
                  rx="1.5"
                  stroke={candleColor}
                  strokeWidth="0.5"
                />

                {/* Pulsing Aura if at Pressure Point */}
                {isPressureCandle && (
                  <circle
                    cx={x}
                    cy={bodyY + bodyHeight / 2}
                    r="12"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    className="animate-ping"
                    opacity="0.6"
                  />
                )}

                {/* Candle Time Annotation */}
                <text
                  x={x}
                  y={chartHeight - 8}
                  fill={isCurrent ? '#38bdf8' : '#64748b'}
                  fontSize="8"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {c.time}
                </text>

                {/* Custom Annotation Tag */}
                {c.annotation && (
                  <text
                    x={x}
                    y={yHigh - 6}
                    fill={isPressureCandle ? '#fbbf24' : '#94a3b8'}
                    fontSize="8"
                    fontWeight={isPressureCandle ? 'bold' : 'normal'}
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {c.annotation}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Bottom Chart Status Line */}
        <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500 pt-1 px-1 border-t border-slate-900">
          <span>Candle {currentStep + 1} of {scenario.candles.length}</span>
          <span className="text-cyan-400">
            {currentStep >= scenario.pressureCandleIndex ? '⚠️ INFLECTION POINT TRIGGERED' : 'Playing simulated market sequence'}
          </span>
          <span>Deterministic Replayable Feed</span>
        </div>
      </div>

      {/* Simulator Playback Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3.5 pt-3 border-t border-indigo-900/30">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono-code font-bold transition cursor-pointer ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause' : 'Play Simulation'}</span>
          </button>

          <button
            type="button"
            onClick={handleStepForward}
            disabled={currentStep >= scenario.candles.length - 1}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-700/80 text-xs font-mono-code transition cursor-pointer"
            title="Step 1 candle forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Step</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-mono-code transition cursor-pointer"
            title="Restart simulation from candle 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[11px] font-mono-code">
            <span className="text-slate-500">Speed:</span>
            <button
              type="button"
              onClick={() => setPlaybackSpeed(1)}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                playbackSpeed === 1 ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
              }`}
            >
              1x
            </button>
            <button
              type="button"
              onClick={() => setPlaybackSpeed(2)}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                playbackSpeed === 2 ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400'
              }`}
            >
              2x
            </button>
          </div>

          {/* Action to jump straight to decision checkpoint if pressure reached */}
          {hasTriggeredPressure && onProceedToDecision && (
            <button
              type="button"
              onClick={onProceedToDecision}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-military font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer animate-pulse"
            >
              <span>Face Decision Moment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Pressure Event Alert Box */}
      {hasTriggeredPressure && (
        <div className="mt-3.5 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-amber-300 font-military font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{scenario.pressureEventTitle}</span>
          </div>
          <p className="text-xs font-mono-code text-slate-200 leading-relaxed">
            {scenario.pressureEventDescription}
          </p>
          <div className="text-[10px] font-mono-code text-amber-400/90 flex items-center gap-1 pt-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Simulation automatically paused. Proceed to the Decision Challenge to select your action.</span>
          </div>
        </div>
      )}

      {/* Educational Non-Real Money Disclaimer */}
      <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono-code flex items-center justify-between">
        <span>SIMULATED TRAINING SCENARIO • NO REAL ORDERS EXECUTED</span>
        <span>PRIMEPIP FX 2090 CORE</span>
      </div>
    </div>
  );
};
