import React, { useState } from 'react';
import { SbtModelVariation, CandleData, ZoneData, StructureLine } from '../../data/sbtModelsData';
import { Layers, Eye, EyeOff, Sparkles, Play, RotateCcw } from 'lucide-react';

interface SbtModelChartProps {
  variation: SbtModelVariation;
  show3DEffects?: boolean;
  interactiveReplay?: boolean;
}

export const SbtModelChart: React.FC<SbtModelChartProps> = ({
  variation,
  show3DEffects = false,
  interactiveReplay = true,
}) => {
  const [showZones, setShowZones] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [activeStep, setActiveStep] = useState<number>(variation.candles.length);
  const [hoveredCandle, setHoveredCandle] = useState<CandleData | null>(null);

  // Coordinate projection math
  // Canvas size: 800 x 440
  const width = 800;
  const height = 440;
  const paddingX = 60;
  const paddingY = 50;

  const minPrice = 0;
  const maxPrice = 120;

  const candles = variation.candles.slice(0, activeStep);

  const getY = (val: number) => {
    const scale = (height - paddingY * 2) / (maxPrice - minPrice);
    return height - paddingY - (val - minPrice) * scale;
  };

  const getX = (index: number) => {
    const totalCandles = variation.candles.length;
    const spacing = (width - paddingX * 2) / (totalCandles + 1);
    return paddingX + (index + 1) * spacing;
  };

  const candleWidth = 24;

  return (
    <div className="bg-[#0A0E17] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden group select-none">
      {/* Chart Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-military font-bold text-slate-200 tracking-wider">
            {variation.name}
          </span>
          <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            DETERMINISTIC 3D VECTOR
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Zones */}
          <button
            type="button"
            onClick={() => setShowZones(!showZones)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono-code transition cursor-pointer border ${
              showZones
                ? 'bg-blue-500/15 border-blue-500/40 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>ZONES</span>
          </button>

          {/* Toggle Labels */}
          <button
            type="button"
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono-code transition cursor-pointer border ${
              showLabels
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            {showLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>ANNOTATIONS</span>
          </button>

          {/* Step Replay Controls */}
          {interactiveReplay && (
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5">
              <button
                type="button"
                onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                disabled={activeStep <= 1}
                className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer font-mono-code"
                title="Step backward"
              >
                ◀
              </button>
              <span className="text-[10px] font-mono-code text-slate-300 px-1">
                {activeStep}/{variation.candles.length}
              </span>
              <button
                type="button"
                onClick={() => setActiveStep(Math.min(variation.candles.length, activeStep + 1))}
                disabled={activeStep >= variation.candles.length}
                className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer font-mono-code"
                title="Step forward"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={() => setActiveStep(variation.candles.length)}
                className="p-1 text-slate-400 hover:text-cyan-400 cursor-pointer"
                title="Reset to full chart"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Container */}
      <div className="relative w-full aspect-[800/440] bg-[#020617] rounded-xl border border-slate-800/70 overflow-hidden shadow-inner">
        {/* Ambient Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* 3D Bullish Candle Gradient */}
            <linearGradient id="bullishGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* 3D Bearish Candle Gradient */}
            <linearGradient id="bearishGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>

            {/* Highlight Glow Filter */}
            <filter id="entryGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Subtle Drop Shadow for 3D depth */}
            <filter id="candleShadow" x="-20%" y="-10%" width="140%" height="120%">
              <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* 1. Structure Zones (Shaded Areas) */}
          {showZones &&
            variation.zones.map((zone) => {
              const x1 = getX(zone.xStart);
              const x2 = getX(zone.xEnd);
              const y1 = getY(zone.yTop);
              const y2 = getY(zone.yBottom);
              const zoneW = Math.max(20, x2 - x1);
              const zoneH = Math.max(4, y2 - y1);

              return (
                <g key={zone.id} className="transition-opacity duration-300">
                  <rect
                    x={x1}
                    y={y1}
                    width={zoneW}
                    height={zoneH}
                    fill={zone.color}
                    stroke={zone.borderColor}
                    strokeWidth="1.5"
                    strokeDasharray={zone.type === 'FVG' ? '4 3' : undefined}
                    rx="3"
                  />
                  {showLabels && (
                    <text
                      x={x1 + 6}
                      y={y1 - 6}
                      fill="#94a3b8"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                      letterSpacing="0.5"
                    >
                      {zone.label}
                    </text>
                  )}
                </g>
              );
            })}

          {/* 2. Horizontal Structure Lines (BOS & IDM) */}
          {variation.lines.map((line, idx) => {
            const y = getY(line.y);
            const x1 = getX(line.xStart);
            const x2 = getX(line.xEnd);

            return (
              <g key={`line-${idx}`}>
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke={line.color === '#000000' ? '#e2e8f0' : line.color}
                  strokeWidth="2"
                  strokeDasharray={line.dashed ? '6 4' : undefined}
                />
                {showLabels && (
                  <text
                    x={x2 + 8}
                    y={y + 4}
                    fill={line.dashed ? '#fbbf24' : '#f8fafc'}
                    fontSize="12"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {line.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* 3. Candlesticks with 3D styling */}
          {candles.map((candle, idx) => {
            const x = getX(idx);
            const highY = getY(candle.high);
            const lowY = getY(candle.low);
            const openY = getY(candle.open);
            const closeY = getY(candle.close);

            const isBullish = candle.close >= candle.open;
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(3, Math.abs(closeY - openY));

            const isHovered = hoveredCandle?.id === candle.id;

            return (
              <g
                key={candle.id}
                onMouseEnter={() => setHoveredCandle(candle)}
                onMouseLeave={() => setHoveredCandle(null)}
                className="cursor-pointer transition-transform duration-150"
              >
                {/* Wicks */}
                <line
                  x1={x}
                  y1={highY}
                  x2={x}
                  y2={lowY}
                  stroke={isBullish ? '#34d399' : '#f87171'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* 3D Candle Body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  rx={show3DEffects ? 2 : 1}
                  fill={isBullish ? 'url(#bullishGradient)' : 'url(#bearishGradient)'}
                  stroke={isBullish ? '#10b981' : '#ef4444'}
                  strokeWidth={candle.highlight ? 2 : 1}
                  filter={candle.highlight ? 'url(#entryGlow)' : show3DEffects ? 'url(#candleShadow)' : undefined}
                />

                {/* Top Bevel for 3D highlight */}
                {show3DEffects && (
                  <rect
                    x={x - candleWidth / 2 + 1}
                    y={bodyTop + 1}
                    width={candleWidth - 2}
                    height={Math.min(bodyHeight - 2, 2.5)}
                    fill="rgba(255,255,255,0.3)"
                    rx="1"
                  />
                )}

                {/* Number or label above candle if present */}
                {showLabels && candle.label && (
                  <text
                    x={x}
                    y={highY - 8}
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {candle.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* 4. Entry Arrow Execution Marker */}
          {variation.entryArrow && activeStep >= variation.candles.length && (
            <g
              transform={`translate(${getX(variation.entryArrow.x)}, ${getY(
                variation.entryArrow.y
              )})`}
            >
              {/* Pulsing Target Ring */}
              <circle r="12" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.6">
                <animate attributeName="r" values="8;18;8" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* Arrow Polygon */}
              <polygon
                points="0,-16 -8,-4 -3,-4 -3,12 3,12 3,-4 8,-4"
                fill="#10b981"
                filter="url(#entryGlow)"
              />

              {/* Text Badge */}
              <rect
                x="-28"
                y="16"
                width="56"
                height="18"
                rx="4"
                fill="#064e3b"
                stroke="#10b981"
                strokeWidth="1.2"
              />
              <text
                x="0"
                y="29"
                textAnchor="middle"
                fill="#a7f3d0"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="0.5"
              >
                {variation.entryArrow.text}
              </text>
            </g>
          )}
        </svg>

        {/* Hovered Candle Tooltip Overlay */}
        {hoveredCandle && (
          <div className="absolute top-3 right-3 bg-slate-950/90 border border-slate-700 rounded-lg px-3 py-1.5 text-[11px] font-mono-code text-slate-200 shadow-xl pointer-events-none">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  hoveredCandle.type === 'BULLISH' ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span className="font-bold">Candle #{hoveredCandle.id}</span>
              <span className="text-slate-400">({hoveredCandle.type})</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              O: {hoveredCandle.open} | H: {hoveredCandle.high} | L: {hoveredCandle.low} | C: {hoveredCandle.close}
            </div>
          </div>
        )}
      </div>

      {/* Variation Notes */}
      {variation.notes && (
        <div className="mt-3 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono-code text-slate-400 flex items-center justify-between">
          <span>{variation.notes}</span>
          <span className="text-cyan-400 font-bold shrink-0 ml-2">PDF VERBATIM</span>
        </div>
      )}
    </div>
  );
};
