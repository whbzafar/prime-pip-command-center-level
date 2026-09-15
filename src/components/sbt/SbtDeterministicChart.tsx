import React, { useState } from 'react';
import {
  SbtModelSourceRecord,
  SbtVectorCandle,
  SbtVectorZone,
  SbtVectorLine,
  SbtVectorBracket,
  SbtVectorArrow,
  SBT_SOURCE_COLORS,
} from '../../data/sbtModelsSourceData';
import { ShieldCheck, Info, Eye, Sun, Moon } from 'lucide-react';

interface SbtDeterministicChartProps {
  model: SbtModelSourceRecord;
  selectedVariationId?: string;
  className?: string;
}

export const SbtDeterministicChart: React.FC<SbtDeterministicChartProps> = ({
  model,
  selectedVariationId,
  className = '',
}) => {
  // Allow toggling between 100% PDF Authentic White Canvas and Pro Dark Canvas
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [hoveredCandle, setHoveredCandle] = useState<SbtVectorCandle | null>(null);
  const [hoveredZone, setHoveredZone] = useState<SbtVectorZone | null>(null);

  // Resolve variation if specified
  const variation = model.variations?.find((v) => v.id === selectedVariationId);
  const activeVersion = variation?.sourceDiagramVersion || model.sourceDiagramVersion;
  const activePage = variation?.sourcePage || model.sourcePage;
  const candles = variation?.candles || model.candles;
  const zones = variation?.zones || model.zones;
  const lines = variation?.lines || model.lines;
  const brackets = variation?.brackets || model.brackets;
  const arrows = variation?.arrows || model.arrows;

  const bgFill = isDarkMode ? '#090D16' : '#FFFFFF';
  const textFill = isDarkMode ? '#E2E8F0' : '#0F172A';
  const subtleGrid = isDarkMode ? '#1E293B' : '#F1F5F9';
  const zoneFill = isDarkMode ? 'rgba(71, 85, 105, 0.4)' : 'rgba(226, 232, 240, 0.75)';
  const zoneStroke = isDarkMode ? '#64748B' : '#94A3B8';
  const lineStroke = isDarkMode ? '#CBD5E1' : '#0F172A';

  return (
    <div
      className={`relative rounded-xl border overflow-hidden flex flex-col transition-colors ${
        isDarkMode ? 'border-slate-800 bg-[#090D16]' : 'border-slate-300 bg-white'
      } ${className}`}
    >
      {/* Chart Tactical Header Bar */}
      <div
        className={`px-4 py-2.5 border-b flex items-center justify-between text-xs transition-colors ${
          isDarkMode
            ? 'bg-[#0F172A]/90 border-slate-800 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 font-mono text-[11px] font-semibold border border-teal-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            SOURCE VERIFIED
          </span>
          <span className="font-mono text-[11px] font-medium text-slate-500">
            {activeVersion}
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px]">
            PDF Page {activePage}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Legend indicator */}
          <div className="hidden md:flex items-center gap-3 text-[11px] font-mono mr-2">
            <span className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ backgroundColor: SBT_SOURCE_COLORS.bullishCandle }}
              />
              <span className="text-slate-500">Bullish</span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ backgroundColor: SBT_SOURCE_COLORS.bearishCandle }}
              />
              <span className="text-slate-500">Bearish</span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block border border-slate-400"
                style={{ backgroundColor: '#E2E8F0' }}
              />
              <span className="text-slate-500">Zone</span>
            </span>
          </div>

          {/* Canvas Mode Toggle: PDF Authentic White vs Institutional Dark */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer border ${
              isDarkMode
                ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 shadow-sm'
            }`}
            title="Toggle between 100% PDF Authentic White Canvas and Pro Dark Canvas"
          >
            {isDarkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>PDF White</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span>Pro Dark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full aspect-[460/330] max-h-[460px] flex items-center justify-center p-1 sm:p-2 select-none">
        <svg
          viewBox={model.viewBox || '0 0 460 330'}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Arrow Marker */}
            <marker
              id={`arrowhead-${activeVersion}`}
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill={SBT_SOURCE_COLORS.arrow} />
            </marker>

            {/* Subtle Grid Pattern */}
            <pattern
              id={`grid-${activeVersion}`}
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke={subtleGrid}
                strokeWidth="0.5"
              />
            </pattern>
          </defs>

          {/* Background */}
          <rect width="100%" height="100%" fill={bgFill} />
          <rect width="100%" height="100%" fill={`url(#grid-${activeVersion})`} />

          {/* ZONES (Rendered behind candles as per source PDF) */}
          {zones.map((zone) => (
            <g key={zone.id}>
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                fill={zoneFill}
                stroke={zoneStroke}
                strokeWidth="1"
                strokeDasharray={isDarkMode ? '2 2' : 'none'}
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer transition-opacity hover:opacity-90"
              />
              {zone.label && (
                <text
                  x={zone.x + zone.width / 2}
                  y={zone.y + zone.height / 2 + 3}
                  textAnchor="middle"
                  fill={isDarkMode ? '#94A3B8' : '#475569'}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {zone.label}
                </text>
              )}
            </g>
          ))}

          {/* STRUCTURAL HORIZONTAL LINES (BOS, IDM-A, IDM-B, etc.) */}
          {lines.map((line) => {
            const lx = line.labelX ?? (line.x1 + line.x2) / 2;
            const ly = line.labelY ?? line.y1 - 5;
            return (
              <g key={line.id}>
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={lineStroke}
                  strokeWidth="1.25"
                  strokeDasharray={line.dashed ? '4 3' : 'none'}
                />
                {line.label && (
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    fill={textFill}
                    fontSize="11"
                    fontFamily="sans-serif"
                    fontWeight="700"
                    letterSpacing="0.5"
                  >
                    {line.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* BRACKETS (e.g., FVG brackets) */}
          {brackets.map((br) => {
            const midX = (br.x1 + br.x2) / 2;
            const bracketPath = `M ${br.x1} ${br.y1} L ${br.x1} ${br.y2} L ${br.x2} ${br.y2} L ${br.x2} ${br.y1}`;
            return (
              <g key={br.id}>
                <path
                  d={bracketPath}
                  fill="none"
                  stroke={lineStroke}
                  strokeWidth="1"
                />
                <text
                  x={midX}
                  y={br.y2 + 13}
                  textAnchor="middle"
                  fill={textFill}
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight="700"
                >
                  {br.label}
                </text>
              </g>
            );
          })}

          {/* CANDLES (Deterministic SVG rectangles and center wicks) */}
          {candles.map((candle) => {
            const candleWidth = candle.width || 12;
            const halfW = candleWidth / 2;
            const bodyTop = Math.min(candle.openY, candle.closeY);
            const bodyHeight = Math.max(Math.abs(candle.openY - candle.closeY), 2);

            return (
              <g
                key={candle.id}
                onMouseEnter={() => setHoveredCandle(candle)}
                onMouseLeave={() => setHoveredCandle(null)}
                className="cursor-pointer"
              >
                {/* Candle Upper Wick */}
                <line
                  x1={candle.x}
                  y1={candle.highY}
                  x2={candle.x}
                  y2={bodyTop}
                  stroke={candle.wickColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                {/* Candle Lower Wick */}
                <line
                  x1={candle.x}
                  y1={bodyTop + bodyHeight}
                  x2={candle.x}
                  y2={candle.lowY}
                  stroke={candle.wickColor}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />

                {/* Candle Real Body */}
                <rect
                  x={candle.x - halfW}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={candle.bodyColor}
                  stroke={isDarkMode ? '#0F172A' : '#FFFFFF'}
                  strokeWidth="0.5"
                  rx="0.5"
                />
              </g>
            );
          })}

          {/* BLUE ARROWS AND LABELS (BUY, Un Test, Daily/Weekly OB, etc.) */}
          {arrows.map((arrow) => (
            <g key={arrow.id}>
              <line
                x1={arrow.fromX}
                y1={arrow.fromY}
                x2={arrow.toX}
                y2={arrow.toY}
                stroke={arrow.color || SBT_SOURCE_COLORS.arrow}
                strokeWidth="1.75"
                markerEnd={`url(#arrowhead-${activeVersion})`}
              />
              {arrow.text && (
                <text
                  x={arrow.fromX}
                  y={arrow.fromY < arrow.toY ? arrow.fromY - 5 : arrow.fromY + 14}
                  textAnchor="middle"
                  fill={arrow.color || SBT_SOURCE_COLORS.arrow}
                  fontSize="11"
                  fontFamily="sans-serif"
                  fontWeight="800"
                  letterSpacing="0.25"
                >
                  {arrow.text}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Hover Inspector Pill */}
        {hoveredCandle && (
          <div
            className={`absolute bottom-3 left-4 px-3 py-1.5 rounded-lg border text-xs font-mono shadow-lg backdrop-blur pointer-events-none transition-all ${
              isDarkMode
                ? 'bg-slate-900/90 border-slate-700 text-slate-200'
                : 'bg-white/95 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    hoveredCandle.type === 'BULLISH'
                      ? SBT_SOURCE_COLORS.bullishCandle
                      : SBT_SOURCE_COLORS.bearishCandle,
                }}
              />
              <span className="font-bold">Candle #{hoveredCandle.id}</span>
              <span className="text-slate-400">({hoveredCandle.type})</span>
            </div>
          </div>
        )}

        {hoveredZone && (
          <div
            className={`absolute bottom-3 right-4 px-3 py-1.5 rounded-lg border text-xs font-mono shadow-lg backdrop-blur pointer-events-none transition-all ${
              isDarkMode
                ? 'bg-slate-900/90 border-slate-700 text-slate-200'
                : 'bg-white/95 border-slate-300 text-slate-800'
            }`}
          >
            <span className="font-bold text-teal-500">Zone:</span> {hoveredZone.label || 'Identified Area'}
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div
        className={`px-4 py-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
          isDarkMode
            ? 'bg-[#0B0F19] border-slate-800/80 text-slate-400'
            : 'bg-slate-50/80 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span>Candle sequence, proportion, and zones strictly locked from Authoritative PDF.</span>
        </div>
        <div className="font-mono text-[10px] text-slate-400">
          Source Lock: <span className="text-emerald-500 font-semibold">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
