import React from 'react';
import { BiasLabel } from '../../types';
import { scoreToBiasLabel, scoreToBullishPct, getSemanticStyle, ProThemeMode } from '../../config/theme';

export interface BiasGaugeProps {
  score: number | null | undefined; // -100 to +100 or null if insufficient
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showPercent?: boolean;
  sublabel?: string;
  themeMode?: ProThemeMode;
}

export const BiasGauge: React.FC<BiasGaugeProps> = ({
  score,
  size = 'medium',
  showLabel = true,
  showPercent = true,
  sublabel,
  themeMode = 'dark',
}) => {
  if (score === null || score === undefined) {
    return (
      <div className="flex flex-col items-center justify-center select-none text-center p-3 rounded-xl border border-slate-700/50 bg-slate-800/20 my-auto">
        <div className="text-slate-400 font-mono text-xs uppercase tracking-wider font-semibold">
          Insufficient Data
        </div>
        <div className="text-[10px] text-slate-500 mt-1 max-w-[150px] leading-tight">
          {sublabel || 'Awaiting multi-pillar fundamental dataset'}
        </div>
      </div>
    );
  }

  const bullishPct = scoreToBullishPct(score);
  const biasLabel: BiasLabel = scoreToBiasLabel(score);
  const semantic = getSemanticStyle(biasLabel, themeMode);

  // Gauge needle rotation from -90 deg (0% bullish) to +90 deg (100% bullish)
  const angle = -90 + (bullishPct / 100) * 180;

  // Dimensional scale configs
  const dimensions = {
    small: { width: 100, height: 58, stroke: 7, radius: 40, fontVal: 'text-sm', fontLbl: 'text-[9px]' },
    medium: { width: 170, height: 95, stroke: 10, radius: 68, fontVal: 'text-xl', fontLbl: 'text-[11px]' },
    large: { width: 240, height: 135, stroke: 14, radius: 98, fontVal: 'text-3xl', fontLbl: 'text-xs' },
  }[size];

  // SVG Coordinates
  const cx = dimensions.width / 2;
  const cy = dimensions.height + dimensions.stroke / 2 - (size === 'small' ? 4 : 8);
  const r = dimensions.radius;

  return (
    <div
      className="flex flex-col items-center select-none text-center"
      role="meter"
      aria-valuenow={bullishPct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Fundamental bias gauge: ${bullishPct}% bullish (${biasLabel})`}
    >
      {/* SVG Semi-Circle */}
      <div className="relative overflow-visible" style={{ width: dimensions.width, height: dimensions.height }}>
        <svg
          viewBox={`0 0 ${dimensions.width} ${dimensions.height + 4}`}
          className="w-full h-full overflow-visible"
        >
          {/* Base background track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={themeMode === 'dark' ? '#1E293B' : '#E2E8F0'}
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
          />

          {/* Bearish Arc Zone (0-40% of gauge) */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx - r * 0.3} ${cy - r * 0.95}`}
            fill="none"
            stroke="#F43F5E"
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
            className="opacity-75"
          />

          {/* Neutral Arc Zone (40-60% of gauge) */}
          <path
            d={`M ${cx - r * 0.3} ${cy - r * 0.95} A ${r} ${r} 0 0 1 ${cx + r * 0.3} ${cy - r * 0.95}`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={dimensions.stroke}
            className="opacity-75"
          />

          {/* Bullish Arc Zone (60-100% of gauge) */}
          <path
            d={`M ${cx + r * 0.3} ${cy - r * 0.95} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#10B981"
            strokeWidth={dimensions.stroke}
            strokeLinecap="round"
            className="opacity-75"
          />

          {/* Needle Pointer with smooth CSS transition */}
          <g
            style={{
              transform: `rotate(${angle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - r + (size === 'small' ? 5 : 8)}
              stroke={themeMode === 'dark' ? '#FFFFFF' : '#0F172A'}
              strokeWidth={size === 'small' ? 2 : 3}
              strokeLinecap="round"
              filter="drop-shadow(0 0 3px rgba(0,0,0,0.5))"
            />
            <circle cx={cx} cy={cy - r + (size === 'small' ? 5 : 8)} r={size === 'small' ? 2.5 : 3.5} fill={semantic.color} />
          </g>

          {/* Center Hub */}
          <circle cx={cx} cy={cy} r={size === 'small' ? 4 : 6} fill={semantic.color} stroke="#0B101B" strokeWidth="2" />
        </svg>

        {/* Center Percentage Display */}
        {showPercent && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end leading-none">
            <span
              className={`font-black font-mono tracking-tight tabular-nums ${dimensions.fontVal} ${
                themeMode === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {bullishPct}%
            </span>
          </div>
        )}
      </div>

      {/* Semantic Bias Badge */}
      {showLabel && (
        <div className="mt-1 flex flex-col items-center gap-0.5">
          <span
            className={`inline-flex items-center gap-1 font-bold font-mono uppercase px-2 py-0.5 rounded-full border ${dimensions.fontLbl}`}
            style={{
              color: semantic.color,
              backgroundColor: semantic.bg,
              borderColor: semantic.border,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: semantic.color }} />
            <span>{biasLabel}</span>
          </span>
          {sublabel && (
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
};
