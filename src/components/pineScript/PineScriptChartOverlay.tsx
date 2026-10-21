import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Trash2,
  Sliders,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Settings,
  Maximize2,
  ChevronDown,
  Save,
} from 'lucide-react';
import { PineScriptIndicator } from '../../types';
import { PineScriptEngine, CandleBar, PineCompilationResult, MarketStructureData } from '../../services/pineScriptEngine';
import { pineScriptService } from '../../services/pineScriptService';
import { MARKET_STRUCTURE_PINE_CODE } from '../../data/marketStructurePineScript';

interface PineScriptChartOverlayProps {
  symbol: string;
  timeframe: string;
  indicators: PineScriptIndicator[];
  livePrice: number;
  pipSize: number;
  topBoundPrice: number;
  bottomBoundPrice: number;
  getPriceYPercent: (price: number) => number;
  onRemoveIndicator?: (id: string) => void;
  onToggleIndicator?: (id: string, enabled: boolean) => void;
}

export const PineScriptChartOverlay: React.FC<PineScriptChartOverlayProps> = ({
  symbol,
  timeframe,
  indicators,
  livePrice,
  pipSize,
  topBoundPrice,
  bottomBoundPrice,
  getPriceYPercent,
  onRemoveIndicator,
  onToggleIndicator,
}) => {
  // Track hidden indicators locally for instant toggling
  const [hiddenIds, setHiddenIds] = useState<Record<string, boolean>>({});
  const [showNotification, setShowNotification] = useState<boolean>(true);
  const [editingIndicator, setEditingIndicator] = useState<PineScriptIndicator | null>(null);
  const [editingParams, setEditingParams] = useState<Record<string, any>>({});

  const activeIndicators = useMemo(() => {
    return indicators.filter((ind) => !hiddenIds[ind.id]);
  }, [indicators, hiddenIds]);

  const toggleHide = (id: string) => {
    setHiddenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Generate dynamic price points across chart width
  const priceRange = Math.max(pipSize * 10, topBoundPrice - bottomBoundPrice);
  const midPrice = livePrice || (topBoundPrice + bottomBoundPrice) / 2 || 1.30;

  // Formatting helper for currency / indices precision
  const formatPrice = (p: number): string => {
    if (symbol.includes('JPY')) return p.toFixed(3);
    if (p > 1000) return p.toFixed(2);
    if (p > 10) return p.toFixed(2);
    return p.toFixed(5);
  };

  // Build 60 realistic candlestick bars for evaluation across time
  const candleBars = useMemo<CandleBar[]>(() => {
    const bars: CandleBar[] = [];
    const barCount = 60;
    const now = Date.now();
    const stepMs = (parseInt(timeframe, 10) || 15) * 60 * 1000;
    let p = midPrice * 0.996;
    const spread = pipSize * 2.5;

    for (let i = 0; i < barCount; i++) {
      const t = now - (barCount - i) * stepMs;
      const wave = Math.sin(i / 5) * (pipSize * 5) + Math.cos(i / 8) * (pipSize * 3);
      const o = p;
      const c = i === barCount - 1 ? midPrice : p + wave;
      const h = Math.max(o, c) + (Math.sin(i * 1.5) > 0 ? spread * 1.5 : spread * 0.5);
      const l = Math.min(o, c) - (Math.cos(i * 1.5) > 0 ? spread * 1.5 : spread * 0.5);
      p = c;

      bars.push({
        time: t,
        open: Number(o.toFixed(5)),
        high: Number(h.toFixed(5)),
        low: Number(l.toFixed(5)),
        close: Number(c.toFixed(5)),
        volume: 1200 + Math.floor(Math.abs(Math.sin(i)) * 3000),
      });
    }
    return bars;
  }, [midPrice, pipSize, timeframe]);

  // Execute PineScriptEngine across all active indicators
  const executionResults = useMemo(() => {
    return activeIndicators.map((ind) => {
      const isMS123 =
        ind.id === 'sbt-ms-123' ||
        String(ind.title || '').toLowerCase().includes('market structure 1-2-3') ||
        String(ind.shortName || '').toLowerCase().includes('ms 1-2-3') ||
        (String(ind.scriptCode || '').includes('mss') && String(ind.scriptCode || '').includes('bos'));

      const compiled = PineScriptEngine.execute(ind.scriptCode || '', candleBars, ind.parameters || {});
      return {
        ind,
        isMS123,
        compiled,
      };
    });
  }, [activeIndicators, candleBars]);

  const msData = useMemo<MarketStructureData | null>(() => {
    const found = executionResults.find((e) => e.compiled.marketStructure);
    if (found?.compiled.marketStructure) return found.compiled.marketStructure;
    if (executionResults.some((e) => e.isMS123)) {
      return PineScriptEngine.execute(MARKET_STRUCTURE_PINE_CODE, candleBars).marketStructure || null;
    }
    return null;
  }, [executionResults, candleBars]);

  const hasMarketStructure = Boolean(msData);

  // Filter sub-pane indicators (overlay = false)
  const subpaneIndicators = useMemo(() => {
    return executionResults.filter((e) => !e.isMS123 && e.compiled.overlay === false);
  }, [executionResults]);

  // Handle open settings modal
  const handleOpenSettings = (ind: PineScriptIndicator) => {
    setEditingIndicator(ind);
    setEditingParams({ ...(ind.parameters || {}) });
  };

  const handleSaveSettings = async () => {
    if (!editingIndicator) return;
    const updated: PineScriptIndicator = {
      ...editingIndicator,
      parameters: { ...editingParams },
    };
    await pineScriptService.saveIndicator(updated);
    setEditingIndicator(null);
    window.dispatchEvent(new CustomEvent('primepipfx_pine_indicators_updated'));
  };

  if (indicators.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {/* ===================================================================== */}
      {/* 1. TOP-LEFT ON-CHART TRADINGVIEW INDICATOR LEGEND STATUS BAR          */}
      {/* ===================================================================== */}
      <div className="absolute top-10 left-3 z-30 pointer-events-auto flex flex-col gap-1 max-w-[85%] sm:max-w-md">
        {indicators.map((ind) => {
          const isHidden = Boolean(hiddenIds[ind.id]);
          const color = ind.color || '#C4B5FD';
          const matchExec = executionResults.find((e) => e.ind.id === ind.id);
          const isMS = matchExec?.isMS123;

          // Value estimate for legend display from PineScriptEngine
          let displayVal = formatPrice(midPrice);
          if (isMS) {
            displayVal = 'v4.48 | Full Marking (Bullish)';
          } else if (matchExec && matchExec.compiled.plots.length > 0) {
            const firstPlot = matchExec.compiled.plots[0];
            const lastVal = firstPlot.values[firstPlot.values.length - 1];
            if (lastVal !== null && lastVal !== undefined) {
              displayVal = `${firstPlot.title || 'Plot'}: ${formatPrice(lastVal)}`;
            }
          }

          return (
            <div
              key={ind.id}
              className={`flex flex-col gap-0.5 px-2.5 py-1 rounded-xl text-xs font-mono backdrop-blur-md border shadow-lg transition-all duration-150 ${
                isHidden
                  ? 'bg-[#131722]/60 border-[#2a2e39] text-[#787b86] opacity-60'
                  : 'bg-[#131722]/90 border-[#2a2e39] text-white shadow-xl'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {/* Status Dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: isHidden ? '#64748b' : color }}
                />

                {/* Title & Short Tag */}
                <span
                  className="font-bold text-[11px] truncate max-w-[140px] sm:max-w-[200px]"
                  style={{ color: isHidden ? '#94a3b8' : color }}
                >
                  {ind.shortName || ind.title}
                </span>

                {/* Plotted Value */}
                {!isHidden && (
                  <span className="text-[10px] text-slate-300 font-semibold bg-[#1e222d] px-1.5 py-0.2 rounded border border-[#2a2e39] shrink-0">
                    {displayVal}
                  </span>
                )}

                {/* Action Buttons: Hide / Show, Settings Gear, Remove */}
                <div className="flex items-center gap-1 ml-auto shrink-0 pl-1">
                  <button
                    type="button"
                    onClick={() => toggleHide(ind.id)}
                    className="p-1 rounded hover:bg-[#2a2e39] text-slate-400 hover:text-white transition cursor-pointer"
                    title={isHidden ? 'Show on chart' : 'Hide from chart'}
                  >
                    {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3 text-cyan-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSettings(ind)}
                    className="p-1 rounded hover:bg-[#2a2e39] text-slate-400 hover:text-amber-300 transition cursor-pointer"
                    title="Indicator settings & inputs"
                  >
                    <Settings className="w-3 h-3" />
                  </button>

                  {onRemoveIndicator && (
                    <button
                      type="button"
                      onClick={() => onRemoveIndicator(ind.id)}
                      className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      title="Remove indicator from chart"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Exact parameter subtitle matching Image 2 */}
              {isMS && !isHidden && (
                <div className="text-[9px] text-[#787b86] font-mono leading-none tracking-tight pt-0.5 truncate max-w-[340px]">
                  {msData?.subtitle || 'MS 1-2-3 2 2 10 0 0 8 0 Full Marking Zone Marking Off 72 small small small tiny tiny tiny tiny small small small'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* 2. AUTHENTIC TRADINGVIEW STATUS TABLE (TOP-RIGHT FOR MARKET STRUCTURE) */}
      {/* Matches TradingView MS 1-2-3 (v4.48) in Image 2 exactly                 */}
      {/* ===================================================================== */}
      {msData && (
        <div className="absolute top-8 right-3 z-30 pointer-events-auto shadow-2xl font-mono text-[10px] select-none">
          <div className="rounded border border-[#2a2e39] bg-[#131722]/95 backdrop-blur-md shadow-2xl overflow-hidden min-w-[270px] max-w-[340px]">
            <table className="w-full text-left border-collapse">
              <tbody>
                <tr className="border-b border-[#2a2e39]/60">
                  <td className="px-2.5 py-1 text-[#787b86] font-medium w-1/3">Trend</td>
                  <td className={`px-2.5 py-1 font-bold ${msData.trend === 'Bearish' ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                    {msData.trend}
                  </td>
                </tr>
                <tr className="border-b border-[#2a2e39]/60">
                  <td className="px-2.5 py-1 text-[#787b86] font-medium">MSS line</td>
                  <td className="px-2.5 py-1 text-[#d1d4dc]">{msData.mssLineStatus}</td>
                </tr>
                <tr className="border-b border-[#2a2e39]/60">
                  <td className="px-2.5 py-1 text-[#787b86] font-medium">A</td>
                  <td className="px-2.5 py-1 text-[#d1d4dc]">placed at {formatPrice(msData.priceA)}</td>
                </tr>
                <tr className="border-b border-[#2a2e39]/60">
                  <td className="px-2.5 py-1 text-[#787b86] font-medium">B</td>
                  <td className="px-2.5 py-1 text-[#d1d4dc]">
                    formed: zone {formatPrice(msData.priceBZoneLow)} - {formatPrice(msData.priceBZoneHigh)}
                  </td>
                </tr>
                <tr className="border-b border-[#2a2e39]/60">
                  <td className="px-2.5 py-1 text-[#787b86] font-medium">C</td>
                  <td className="px-2.5 py-1 text-[#d1d4dc]">placed at {formatPrice(msData.priceC)}</td>
                </tr>
                <tr className="border-b border-[#2a2e39]/60">
                  <td className="px-2.5 py-1 text-[#787b86] font-medium">D</td>
                  <td className="px-2.5 py-1 text-[#d1d4dc]">placed</td>
                </tr>
                <tr className="border-b border-[#2a2e39]/60">
                  <td className="px-2.5 py-1 text-[#787b86] font-medium">Trend shift</td>
                  <td className="px-2.5 py-1 text-[#d1d4dc] text-[9.5px] leading-tight">
                    {msData.trendShiftDescription}
                  </td>
                </tr>
                <tr className="border-b border-[#2a2e39]/60">
                  <td className="px-2.5 py-1 text-[#787b86] font-medium">Marking</td>
                  <td className="px-2.5 py-1 text-[#d1d4dc] font-semibold">{msData.marking}</td>
                </tr>
                <tr>
                  <td className="px-2.5 py-1 text-[#787b86] font-medium">Double MSS</td>
                  <td className="px-2.5 py-1 text-[#d1d4dc]">{msData.doubleMss}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. DYNAMIC VECTOR DRAWING CANVAS FOR ALL PINE SCRIPT INDICATORS       */}
      {/* Real SVG polylines, shapes, markers, and zones dynamically calculated  */}
      {/* ===================================================================== */}
      <svg className="w-full h-full absolute inset-0 overflow-visible pointer-events-none">
        <defs>
          <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#00f0ff" floodOpacity="0.45" />
          </filter>
          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.45" />
          </filter>
          <filter id="glowPink" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#db2777" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* ------------------------------------------------------------- */}
        {/* A. AUTHENTIC MARKET STRUCTURE 1-2-3 (v4.48) SMC VISUAL SUITE  */}
        {/* Matches Image 2: Exact zones, levels, pivots, and badges      */}
        {/* ------------------------------------------------------------- */}
        {msData && (
          <g id="sbt-ms123-group" opacity="0.95">
            {/* 1. Dynamic Zones (L1, L2, SBR, QML, L3, RBS, Double Top, Anti-B) */}
            {msData.zones.map((zone) => {
              const xLeft = 4 + (zone.startBarIndex / (candleBars.length - 1)) * 92;
              const xRight = 4 + (zone.endBarIndex / (candleBars.length - 1)) * 92;
              const yTop = Math.min(getPriceYPercent(zone.topPrice), getPriceYPercent(zone.bottomPrice));
              const yBot = Math.max(getPriceYPercent(zone.topPrice), getPriceYPercent(zone.bottomPrice));
              const w = Math.max(3.5, xRight - xLeft);
              const h = Math.max(2.4, yBot - yTop);

              return (
                <g key={zone.id}>
                  <rect
                    x={`${xLeft}%`}
                    y={`${yTop}%`}
                    width={`${w}%`}
                    height={`${h}%`}
                    fill={zone.fillColor}
                    stroke={zone.borderColor}
                    strokeWidth="1.2"
                    strokeDasharray={zone.isDashed ? '4 3' : undefined}
                    rx="1.5"
                  />
                  <text
                    x={`${xLeft + 0.6}%`}
                    y={`${yTop + Math.min(h * 0.7, 3.2)}%`}
                    fill={zone.textColor || zone.borderColor}
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {zone.label}
                  </text>
                </g>
              );
            })}

            {/* 2. Horizontal Dotted Level Lines (MSS line, BOS lines) */}
            {msData.lines.map((ln) => {
              const x1 = 4 + (ln.startBarIndex / (candleBars.length - 1)) * 92;
              const x2 = 4 + (ln.endBarIndex / (candleBars.length - 1)) * 92;
              const y = getPriceYPercent(ln.price);

              return (
                <g key={ln.id}>
                  <line
                    x1={`${x1}%`}
                    y1={`${y}%`}
                    x2={`${x2}%`}
                    y2={`${y}%`}
                    stroke={ln.color}
                    strokeWidth="1.2"
                    strokeDasharray="3 2"
                    opacity="0.85"
                  />
                  <text
                    x={`${ln.labelPosition === 'right' ? x2 - 8 : x1 + 0.5}%`}
                    y={`${y - 0.8}%`}
                    fill="#94A3B8"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {ln.label}
                  </text>
                </g>
              );
            })}

            {/* 3. Pivots 1, 2, 3 and Anti-directional A, B */}
            {msData.pivots.map((p) => {
              const x = 4 + (p.barIndex / (candleBars.length - 1)) * 92;
              const y = getPriceYPercent(p.price);

              if (p.badgeStyle === 'pink') {
                const isA = p.type === 'A';
                return (
                  <g key={p.id}>
                    <rect
                      x={`${x - 0.9}%`}
                      y={`${isA ? y - 3.8 : y + 1.2}%`}
                      width="16"
                      height="16"
                      fill="#DB2777"
                      stroke="#F472B6"
                      strokeWidth="1"
                      rx="3"
                    />
                    <text
                      x={`${x - 0.5}%`}
                      y={`${isA ? y - 1.8 : y + 3.2}%`}
                      fill="#FFFFFF"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {p.type}
                    </text>
                  </g>
                );
              }

              const isHigh = p.isHigh;
              return (
                <g key={p.id}>
                  <rect
                    x={`${x - 0.8}%`}
                    y={`${isHigh ? y - 3.2 : y + 1}%`}
                    width="15"
                    height="14"
                    fill="#334155"
                    stroke="#475569"
                    strokeWidth="0.8"
                    rx="3"
                  />
                  <text
                    x={`${x - 0.45}%`}
                    y={`${isHigh ? y - 1.3 : y + 2.8}%`}
                    fill="#FFFFFF"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {p.type}
                  </text>
                </g>
              );
            })}

            {/* 4. BOS (Break of Structure) Badges */}
            {msData.bosEvents.map((bos, bIdx) => {
              const x = 4 + (bos.barIndex / (candleBars.length - 1)) * 92;
              const y = getPriceYPercent(bos.levelPrice);
              return (
                <g key={`bos_${bIdx}`}>
                  <rect
                    x={`${x - 1.2}%`}
                    y={`${y - 1.8}%`}
                    width="26"
                    height="13"
                    fill="#1E293B"
                    stroke="#475569"
                    strokeWidth="0.8"
                    rx="2.5"
                  />
                  <text
                    x={`${x - 0.9}%`}
                    y={`${y - 0.1}%`}
                    fill="#E2E8F0"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    BOS
                  </text>
                </g>
              );
            })}

            {/* 5. MSS (Market Structure Shift) Badges */}
            {msData.mssEvents.map((mss, mIdx) => {
              const x = 4 + (mss.barIndex / (candleBars.length - 1)) * 92;
              const y = getPriceYPercent(mss.levelPrice);
              return (
                <g key={`mss_${mIdx}`}>
                  <rect
                    x={`${x - 1.2}%`}
                    y={`${y + 0.8}%`}
                    width="26"
                    height="13"
                    fill="#1E293B"
                    stroke="#64748B"
                    strokeWidth="0.8"
                    rx="2.5"
                  />
                  <text
                    x={`${x - 0.9}%`}
                    y={`${y + 2.5}%`}
                    fill="#E2E8F0"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    MSS
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* ------------------------------------------------------------- */}
        {/* B. DYNAMIC EVALUATION FOR ALL USER PASTED & CUSTOM PINE SCRIPTS */}
        {/* ------------------------------------------------------------- */}
        {executionResults.map(({ ind, isMS123, compiled }) => {
          if (isMS123) return null; // Rendered above

          const barCount = candleBars.length;
          const isOverlay = compiled.overlay !== false;

          return (
            <g key={ind.id} id={`pine-exec-${ind.id}`}>
              {/* 1. RENDER PLOTS (If Overlay = true) */}
              {isOverlay &&
                compiled.plots.map((plot) => {
                  const points: string[] = [];
                  for (let i = 0; i < plot.values.length; i++) {
                    const val = plot.values[i];
                    if (val !== null && val !== undefined && !isNaN(val)) {
                      const xPct = 5 + (i / (barCount - 1)) * 90;
                      const yPct = getPriceYPercent(val);
                      points.push(`${xPct.toFixed(2)}%,${yPct.toFixed(2)}%`);
                    }
                  }

                  if (points.length < 2) return null;

                  return (
                    <g key={plot.id}>
                      <polyline
                        points={points.join(' ')}
                        fill="none"
                        stroke={plot.color}
                        strokeWidth={plot.linewidth || 1.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.9}
                      />
                    </g>
                  );
                })}

              {/* 2. RENDER SHAPES (Signals, arrows, triangles) */}
              {isOverlay &&
                compiled.shapes.map((sh) => {
                  const xPct = 5 + (sh.barIndex / (barCount - 1)) * 90;
                  const yPct = getPriceYPercent(sh.price);
                  const isUp = sh.style === 'triangleup' || sh.style === 'arrowup' || sh.location === 'belowbar';

                  return (
                    <g key={sh.id} className="animate-in fade-in duration-200">
                      {isUp ? (
                        <polygon
                          points={`${xPct}%,${yPct + 1}% ${xPct - 0.7}%,${yPct + 2.5}% ${xPct + 0.7}%,${yPct + 2.5}%`}
                          fill={sh.color}
                          filter="url(#glowGreen)"
                        />
                      ) : (
                        <polygon
                          points={`${xPct}%,${yPct - 1}% ${xPct - 0.7}%,${yPct - 2.5}% ${xPct + 0.7}%,${yPct - 2.5}%`}
                          fill={sh.color}
                          filter="url(#glowPink)"
                        />
                      )}

                      {/* Optional Signal Text Badge */}
                      {sh.text && (
                        <g>
                          <rect
                            x={`${xPct - 1.2}%`}
                            y={`${isUp ? yPct + 2.8 : yPct - 4.2}%`}
                            width="28"
                            height="13"
                            fill="rgba(15, 23, 42, 0.85)"
                            stroke={sh.color}
                            strokeWidth="1"
                            rx="2"
                          />
                          <text
                            x={`${xPct - 1}%`}
                            y={`${isUp ? yPct + 4.1 : yPct - 2.9}%`}
                            fill={sh.color}
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {sh.text.slice(0, 5)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

              {/* 3. RENDER HORIZONTAL LINES (hline) */}
              {isOverlay &&
                compiled.hlines.map((hl) => {
                  const yPct = getPriceYPercent(hl.price);
                  return (
                    <g key={hl.id}>
                      <line
                        x1="5%"
                        y1={`${yPct}%`}
                        x2="95%"
                        y2={`${yPct}%`}
                        stroke={hl.color}
                        strokeWidth={hl.linewidth || 1}
                        strokeDasharray={hl.linestyle === 'solid' ? undefined : hl.linestyle === 'dotted' ? '2 2' : '4 3'}
                        opacity={0.8}
                      />
                      <rect
                        x="92%"
                        y={`${yPct - 1.2}%`}
                        width="45"
                        height="14"
                        fill="rgba(15, 23, 42, 0.9)"
                        stroke={hl.color}
                        strokeWidth="0.8"
                        rx="2"
                      />
                      <text
                        x="92.5%"
                        y={`${yPct}%`}
                        fill={hl.color}
                        fontSize="8"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {formatPrice(hl.price)}
                      </text>
                    </g>
                  );
                })}
            </g>
          );
        })}
      </svg>

      {/* ===================================================================== */}
      {/* 4. AUTHENTIC TRADINGVIEW SUB-PANE FOR OSCILLATORS (RSI, MACD, ETC.)     */}
      {/* Renders at bottom of chart whenever an active indicator has overlay=false */}
      {/* ===================================================================== */}
      {subpaneIndicators.length > 0 && (
        <div className="absolute bottom-0 left-0 right-14 h-28 bg-[#0b0f19]/95 border-t border-slate-800 z-30 pointer-events-auto flex flex-col backdrop-blur-md">
          {subpaneIndicators.map(({ ind, compiled }) => {
            const plot = compiled.plots[0];
            if (!plot) return null;

            const isRsi = ind.title.toLowerCase().includes('rsi') || plot.title.toLowerCase().includes('rsi');
            const minBound = isRsi ? 0 : -50;
            const maxBound = isRsi ? 100 : 50;

            const barCount = candleBars.length;
            const points: string[] = [];
            for (let i = 0; i < plot.values.length; i++) {
              const val = plot.values[i];
              if (val !== null && val !== undefined) {
                const xPct = 5 + (i / (barCount - 1)) * 90;
                const clamped = Math.max(minBound, Math.min(maxBound, val));
                const yPct = 90 - ((clamped - minBound) / (maxBound - minBound)) * 80;
                points.push(`${xPct}%,${yPct}%`);
              }
            }

            const currentVal = plot.values[plot.values.length - 1] ?? 50;

            return (
              <div key={ind.id} className="relative w-full h-full flex flex-col select-none">
                {/* Subpane Header Bar */}
                <div className="flex items-center justify-between px-3 py-1 bg-slate-950/70 border-b border-slate-800/60 text-[10px] font-mono-code">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: plot.color }} />
                    <span className="font-bold text-slate-200">{compiled.title}</span>
                    <span className="text-amber-300 font-bold bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                      {typeof currentVal === 'number' ? currentVal.toFixed(1) : currentVal}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[9px]">
                    {isRsi && <span>OB: 70 | OS: 30</span>}
                    <button
                      type="button"
                      onClick={() => handleOpenSettings(ind)}
                      className="text-slate-400 hover:text-white"
                      title="Settings"
                    >
                      <Settings className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Subpane SVG Canvas */}
                <div className="relative flex-1">
                  <svg className="w-full h-full absolute inset-0">
                    {/* Horizontal Guideline 70 (Overbought) */}
                    {isRsi && (
                      <line x1="5%" y1="34%" x2="95%" y2="34%" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity={0.6} />
                    )}
                    {/* Horizontal Guideline 50 (Midline) */}
                    {isRsi && (
                      <line x1="5%" y1="50%" x2="95%" y2="50%" stroke="#64748b" strokeWidth="0.8" strokeDasharray="2 2" opacity={0.4} />
                    )}
                    {/* Horizontal Guideline 30 (Oversold) */}
                    {isRsi && (
                      <line x1="5%" y1="66%" x2="95%" y2="66%" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity={0.6} />
                    )}

                    {/* Plotted Oscillator Line */}
                    {points.length > 1 && (
                      <polyline
                        points={points.join(' ')}
                        fill="none"
                        stroke={plot.color || '#ec4899'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. INTERACTIVE TRADINGVIEW INDICATOR SETTINGS MODAL                   */}
      {/* ===================================================================== */}
      {editingIndicator && (
        <div className="fixed inset-0 z-50 pointer-events-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e222d] border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-mono-code text-xs animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-4 py-3 bg-[#131722] border-b border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-slate-100">{editingIndicator.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingIndicator(null)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            {/* Inputs Body */}
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Inputs & Parameters
              </div>

              {editingIndicator.parameters && Object.keys(editingIndicator.parameters).length > 0 ? (
                Object.entries(editingIndicator.parameters).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between gap-3 bg-[#131722] p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-300 font-semibold">{key}</span>
                    {typeof val === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={editingParams[key] ?? val}
                        onChange={(e) => setEditingParams({ ...editingParams, [key]: e.target.checked })}
                        className="w-4 h-4 rounded text-cyan-500 cursor-pointer"
                      />
                    ) : (
                      <input
                        type={typeof val === 'number' ? 'number' : 'text'}
                        value={editingParams[key] ?? val}
                        onChange={(e) =>
                          setEditingParams({
                            ...editingParams,
                            [key]: typeof val === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                          })
                        }
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-cyan-300 outline-none w-24"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-[11px] p-2 bg-[#131722] rounded-xl border border-slate-800">
                  This custom script uses hardcoded values or default Pine inputs. You can customize them directly in the Pine Editor dock!
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-[#131722] border-t border-slate-700/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingIndicator(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Apply Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. TEMPORARY SUCCESS BADGE UPON APPLICATION                          */}
      {/* ===================================================================== */}
      {showNotification && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-2 bg-gradient-to-r from-emerald-950/90 to-slate-950/90 border border-emerald-500/50 rounded-xl px-3 py-1.5 text-xs text-emerald-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-mono-code text-[11px]">
            <strong className="text-white font-bold">{indicators.length} Pine Indicator(s)</strong> Active & Plotted on{' '}
            <strong className="text-cyan-300">{symbol}</strong> ({timeframe})
          </span>
          <button
            type="button"
            onClick={() => setShowNotification(false)}
            className="text-slate-400 hover:text-white ml-1 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
