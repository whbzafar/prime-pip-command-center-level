import React, { useState } from 'react';
import {
  ShieldCheck,
  Sun,
  Moon,
  Info,
  Box,
  Layers,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import {
  SbtModelItem,
  SbtVectorCandle,
  SbtVectorZone,
  SBT_SOURCE_COLORS,
} from '../../data/sbtModelsData';
import { getSbtAssetPath } from './SbtModelsHub';

interface SbtDeterministicChartProps {
  model: SbtModelItem;
  selectedVariationId?: string;
  className?: string;
  initialFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const SbtDeterministicChart: React.FC<SbtDeterministicChartProps> = ({
  model,
  selectedVariationId,
  className = '',
  initialFullscreen = false,
  onToggleFullscreen,
}) => {
  // Canvas Settings
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [showPictureLayer, setShowPictureLayer] = useState<boolean>(true);
  const [pictureOpacity, setPictureOpacity] = useState<number>(0.25);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(initialFullscreen);

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

  const bgFill = isDarkMode ? '#070B14' : '#FFFFFF';
  const textFill = isDarkMode ? '#E2E8F0' : '#0F172A';
  const subtleGrid = isDarkMode ? '#172033' : '#F1F5F9';
  const zoneFill = isDarkMode ? 'rgba(51, 65, 85, 0.45)' : 'rgba(226, 232, 240, 0.75)';
  const zoneStroke = isDarkMode ? '#64748B' : '#94A3B8';
  const lineStroke = isDarkMode ? '#94A3B8' : '#0F172A';

  // 3D Depth Isometric Offset (pixels)
  const depth = 3.5;

  // Source picture asset URL
  const sourceGraphicUrl = getSbtAssetPath(model.modelNumber, selectedVariationId);

  const handleToggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      setIsFullscreen(!isFullscreen);
    }
  };

  return (
    <div
      id={`sbt-chart-container-${model.modelNumber}`}
      className={`relative rounded-xl border overflow-hidden flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-none bg-[#050811] h-screen w-screen'
          : isDarkMode
          ? 'border-slate-800 bg-[#070B14]'
          : 'border-slate-300 bg-white'
      } ${className}`}
    >
      {/* 3D Model HUD Top Control Strip */}
      <div
        className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs select-none transition-colors ${
          isDarkMode
            ? 'bg-[#0B101D] border-slate-800 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {/* Model ID & Source Verification Badge */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/15 text-teal-400 font-mono-code text-[11px] font-bold border border-teal-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            3D VECTOR
          </span>
          <span className="font-mono-code text-[11px] font-semibold text-slate-300">
            {model.title}
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono-code text-[10px]">
            {activeVersion} • Page {activePage}
          </span>
        </div>

        {/* Tactical Controls: 3D Shape, Picture Layer, Opacity, Light/Dark, Fullscreen */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* 3D Volumetric Mode Button */}
          <button
            type="button"
            onClick={() => setIs3DMode(!is3DMode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono-code font-bold transition cursor-pointer border ${
              is3DMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle 3D Graphical Representation (Isometric Volumetric Depth)"
          >
            <Box className="w-3.5 h-3.5 text-amber-400" />
            <span>3D SHAPE: {is3DMode ? 'ON' : 'FLAT'}</span>
          </button>

          {/* Picture Layer in Vector Toggle */}
          <button
            type="button"
            onClick={() => setShowPictureLayer(!showPictureLayer)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono-code font-bold transition cursor-pointer border ${
              showPictureLayer
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Display actual source picture aligned inside the vector workspace"
          >
            <ImageIcon className="w-3.5 h-3.5 text-teal-400" />
            <span>PICTURE: {showPictureLayer ? 'ACTIVE' : 'OFF'}</span>
          </button>

          {/* Picture Layer Opacity Slider (When picture is active) */}
          {showPictureLayer && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-slate-800/60 border border-slate-700 text-[10px] font-mono-code">
              <span className="text-slate-400">BLEND:</span>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={pictureOpacity}
                onChange={(e) => setPictureOpacity(parseFloat(e.target.value))}
                className="w-14 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
                title={`Picture Layer Opacity: ${Math.round(pictureOpacity * 100)}%`}
              />
              <span className="text-teal-400 w-6">{Math.round(pictureOpacity * 100)}%</span>
            </div>
          )}

          {/* Canvas Mode Toggle: PDF White vs Pro Dark */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono-code transition cursor-pointer border ${
              isDarkMode
                ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100 shadow-sm'
            }`}
            title="Toggle White PDF theme vs Dark Institutional theme"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          {/* Zoom In / Out Controls */}
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 2))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.7))}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            {zoomLevel !== 1 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Fullscreen / Minimize Toggle Button */}
          <button
            id={`sbt-fullscreen-toggle-${model.modelNumber}`}
            type="button"
            onClick={handleToggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-mono-code font-bold transition cursor-pointer"
            title={isFullscreen ? 'Minimize back to standard view' : 'View model in Full Screen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>MINIMIZE</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>FULLSCREEN</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main SVG Vector Canvas Area */}
      <div
        className={`relative w-full flex items-center justify-center p-2 select-none overflow-hidden ${
          isFullscreen ? 'flex-1 h-[calc(100vh-80px)]' : 'aspect-[460/330] max-h-[520px]'
        }`}
      >
        <div
          className="w-full h-full flex items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <svg
            viewBox={model.viewBox || '0 0 460 330'}
            className="w-full h-full max-h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Arrow Marker */}
              <marker
                id={`arrowhead-3d-${activeVersion}`}
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
                id={`grid-3d-${activeVersion}`}
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

              {/* 3D Bullish Candle Gradient (Lighting specular on cylindrical face) */}
              <linearGradient id="candleBullish3D" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="35%" stopColor="#34D399" />
                <stop offset="70%" stopColor="#059669" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>

              {/* 3D Bullish Side Face Shading */}
              <linearGradient id="candleBullishSide" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#047857" />
                <stop offset="100%" stopColor="#064E3B" />
              </linearGradient>

              {/* 3D Bearish Candle Gradient */}
              <linearGradient id="candleBearish3D" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="35%" stopColor="#F87171" />
                <stop offset="70%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#B91C1C" />
              </linearGradient>

              {/* 3D Bearish Side Face Shading */}
              <linearGradient id="candleBearishSide" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#B91C1C" />
                <stop offset="100%" stopColor="#7F1D1D" />
              </linearGradient>

              {/* 3D Top Cap Gradient */}
              <linearGradient id="candleTopCapBullish" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#6EE7B7" />
              </linearGradient>

              <linearGradient id="candleTopCapBearish" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#FCA5A5" />
              </linearGradient>

              {/* 3D Drop Shadow Filter */}
              <filter id="candle3DShadow" x="-20%" y="-20%" width="150%" height="150%">
                <feDropShadow dx="2" dy="3" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Background Canvas */}
            <rect width="100%" height="100%" fill={bgFill} />
            <rect width="100%" height="100%" fill={`url(#grid-3d-${activeVersion})`} />

            {/* INTEGRATED ACTUAL PICTURE LAYER INSIDE VECTOR */}
            {showPictureLayer && sourceGraphicUrl && (
              <image
                href={sourceGraphicUrl}
                x="0"
                y="0"
                width="460"
                height="330"
                preserveAspectRatio="xMidYMid meet"
                opacity={pictureOpacity}
                className="transition-opacity duration-150 pointer-events-none"
              />
            )}

            {/* ZONES (Rendered as 3D Volumetric Blocks or Flat 2D Slabs) */}
            {zones.map((zone) => {
              if (is3DMode) {
                // 3D Isometric Extruded Zone Block
                const zDepth = 5;
                return (
                  <g key={zone.id}>
                    {/* 3D Zone Top Plane */}
                    <polygon
                      points={`${zone.x},${zone.y} ${zone.x + zDepth},${zone.y - zDepth} ${zone.x + zone.width + zDepth},${zone.y - zDepth} ${zone.x + zone.width},${zone.y}`}
                      fill={isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.5)'}
                      stroke={zoneStroke}
                      strokeWidth="0.5"
                    />
                    {/* 3D Zone Right Extrusion */}
                    <polygon
                      points={`${zone.x + zone.width},${zone.y} ${zone.x + zone.width + zDepth},${zone.y - zDepth} ${zone.x + zone.width + zDepth},${zone.y + zone.height - zDepth} ${zone.x + zone.width},${zone.y + zone.height}`}
                      fill={isDarkMode ? 'rgba(30, 41, 59, 0.4)' : 'rgba(148, 163, 184, 0.4)'}
                      stroke={zoneStroke}
                      strokeWidth="0.5"
                    />
                    {/* 3D Zone Front Face */}
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
                );
              }

              // Standard 2D Zone
              return (
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
              );
            })}

            {/* STRUCTURAL HORIZONTAL LINES (BOS, IDM, FVG) */}
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

            {/* BRACKETS (e.g. FVG brackets) */}
            {brackets.map((br) => {
              const midX = (br.x1 + br.x2) / 2;
              const bracketPath = `M ${br.x1} ${br.y1} L ${br.x1} ${br.y2} L ${br.x2} ${br.y2} L ${br.x2} ${br.y1}`;
              return (
                <g key={br.id}>
                  <path d={bracketPath} fill="none" stroke={lineStroke} strokeWidth="1" />
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

            {/* CANDLESTICKS: ACTUAL GRAPHICAL 3D SHAPES vs FLAT 2D */}
            {candles.map((candle) => {
              const candleWidth = candle.width || 12;
              const halfW = candleWidth / 2;
              const bodyTop = Math.min(candle.openY, candle.closeY);
              const bodyHeight = Math.max(Math.abs(candle.openY - candle.closeY), 2);
              const isBull = candle.type === 'BULLISH';

              if (is3DMode) {
                // 3D ISOMETRIC VOLUMETRIC CANDLESTICK
                const d = depth;
                const frontFill = isBull ? 'url(#candleBullish3D)' : 'url(#candleBearish3D)';
                const sideFill = isBull ? 'url(#candleBullishSide)' : 'url(#candleBearishSide)';
                const topCapFill = isBull ? 'url(#candleTopCapBullish)' : 'url(#candleTopCapBearish)';

                return (
                  <g
                    key={candle.id}
                    onMouseEnter={() => setHoveredCandle(candle)}
                    onMouseLeave={() => setHoveredCandle(null)}
                    className="cursor-pointer group"
                    filter="url(#candle3DShadow)"
                  >
                    {/* 3D Upper Wick with depth */}
                    <line
                      x1={candle.x}
                      y1={candle.highY}
                      x2={candle.x}
                      y2={bodyTop}
                      stroke={candle.wickColor}
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />

                    {/* 3D Lower Wick with depth */}
                    <line
                      x1={candle.x}
                      y1={bodyTop + bodyHeight}
                      x2={candle.x}
                      y2={candle.lowY}
                      stroke={candle.wickColor}
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />

                    {/* 3D Top Cap Plane */}
                    <polygon
                      points={`${candle.x - halfW},${bodyTop} ${candle.x - halfW + d},${bodyTop - d} ${candle.x + halfW + d},${bodyTop - d} ${candle.x + halfW},${bodyTop}`}
                      fill={topCapFill}
                      stroke={isDarkMode ? '#0F172A' : '#E2E8F0'}
                      strokeWidth="0.5"
                    />

                    {/* 3D Right Side Extrusion Plane */}
                    <polygon
                      points={`${candle.x + halfW},${bodyTop} ${candle.x + halfW + d},${bodyTop - d} ${candle.x + halfW + d},${bodyTop + bodyHeight - d} ${candle.x + halfW},${bodyTop + bodyHeight}`}
                      fill={sideFill}
                      stroke={isDarkMode ? '#022C22' : '#7F1D1D'}
                      strokeWidth="0.5"
                    />

                    {/* 3D Front Face */}
                    <rect
                      x={candle.x - halfW}
                      y={bodyTop}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={frontFill}
                      stroke={isDarkMode ? '#1E293B' : '#FFFFFF'}
                      strokeWidth="0.75"
                      rx="0.5"
                    />
                  </g>
                );
              }

              // Flat 2D Mode
              return (
                <g
                  key={candle.id}
                  onMouseEnter={() => setHoveredCandle(candle)}
                  onMouseLeave={() => setHoveredCandle(null)}
                  className="cursor-pointer"
                >
                  <line
                    x1={candle.x}
                    y1={candle.highY}
                    x2={candle.x}
                    y2={bodyTop}
                    stroke={candle.wickColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1={candle.x}
                    y1={bodyTop + bodyHeight}
                    x2={candle.x}
                    y2={candle.lowY}
                    stroke={candle.wickColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
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

            {/* BLUE ARROWS AND LABELS (BUY, Un Test, Daily/Weekly OB) */}
            {arrows.map((arrow) => (
              <g key={arrow.id}>
                <line
                  x1={arrow.fromX}
                  y1={arrow.fromY}
                  x2={arrow.toX}
                  y2={arrow.toY}
                  stroke={arrow.color || SBT_SOURCE_COLORS.arrow}
                  strokeWidth="2"
                  markerEnd={`url(#arrowhead-3d-${activeVersion})`}
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
        </div>

        {/* Hover Inspector Tooltip */}
        {hoveredCandle && (
          <div
            className={`absolute bottom-3 left-4 px-3 py-1.5 rounded-lg border text-xs font-mono-code shadow-xl backdrop-blur pointer-events-none transition-all ${
              isDarkMode ? 'bg-slate-900/95 border-slate-700 text-slate-200' : 'bg-white/95 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    hoveredCandle.type === 'BULLISH'
                      ? SBT_SOURCE_COLORS.bullishCandle
                      : SBT_SOURCE_COLORS.bearishCandle,
                }}
              />
              <span className="font-bold">Candle #{hoveredCandle.id}</span>
              <span className="text-slate-400">({hoveredCandle.type} • 3D Volumetric)</span>
            </div>
          </div>
        )}

        {hoveredZone && (
          <div
            className={`absolute bottom-3 right-4 px-3 py-1.5 rounded-lg border text-xs font-mono-code shadow-xl backdrop-blur pointer-events-none transition-all ${
              isDarkMode ? 'bg-slate-900/95 border-slate-700 text-slate-200' : 'bg-white/95 border-slate-300 text-slate-800'
            }`}
          >
            <span className="font-bold text-teal-400">3D Mitigation Zone:</span> {hoveredZone.label || 'Institutional Block'}
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      <div
        className={`px-4 py-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] ${
          isDarkMode
            ? 'bg-[#0B101D] border-slate-800/80 text-slate-400'
            : 'bg-slate-50/80 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          <span className="font-mono-code">
            Actual 3D Graphical Representation • Picture Layer Integrated Inside Vector
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono-code text-[10px]">
          <span>
            Shape: <strong className="text-amber-400">{is3DMode ? '3D ISOMETRIC' : '2D FLAT'}</strong>
          </span>
          <span>
            Lock: <strong className="text-emerald-400">AUTHORITATIVE VERIFIED</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
