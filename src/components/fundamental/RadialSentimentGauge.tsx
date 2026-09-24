import React from 'react';
import { Gauge, TrendingUp, TrendingDown, Minus, ShieldCheck } from 'lucide-react';

export interface RadialSentimentGaugeProps {
  score: number; // -100 to +100
  label?: string; // e.g. "BULLISH", "BEARISH", "NEUTRAL"
  strengthPercent?: number; // 50 to 100%
  confidence?: number; // 0 to 100%
  assetName: string;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  onClickInspect?: () => void;
}

export const RadialSentimentGauge: React.FC<RadialSentimentGaugeProps> = ({
  score,
  label,
  strengthPercent,
  confidence = 85,
  assetName,
  size = 'md',
  subtitle,
  onClickInspect,
}) => {
  const clampedScore = Math.max(-100, Math.min(100, isNaN(score) ? 0 : score));
  // Map score -100..+100 to needle angle -80deg..+80deg
  const needleRotation = (clampedScore / 100) * 80;

  const isBullish = clampedScore >= 12;
  const isBearish = clampedScore <= -12;
  const isNeutral = !isBullish && !isBearish;

  const displayStrength = strengthPercent ?? Math.min(100, Math.round(50 + Math.abs(clampedScore) / 2));
  const displayLabel = label ?? (isBullish ? 'BULLISH' : isBearish ? 'BEARISH' : 'NEUTRAL');

  const width = size === 'sm' ? 180 : size === 'lg' ? 260 : 220;
  const height = size === 'sm' ? 100 : size === 'lg' ? 145 : 125;

  return (
    <div
      onClick={onClickInspect}
      className={`relative flex flex-col items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border transition-all duration-300 ${
        isBullish
          ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10'
          : isBearish
          ? 'border-rose-500/40 shadow-lg shadow-rose-500/10'
          : 'border-slate-800 shadow-lg shadow-cyan-500/5'
      } ${onClickInspect ? 'cursor-pointer hover:border-cyan-400 group' : ''}`}
    >
      {/* Header Info */}
      <div className="w-full flex items-center justify-between pb-1.5 border-b border-slate-800/80 text-xs font-mono-code">
        <div className="flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-slate-200 group-hover:text-cyan-300 transition-colors uppercase">
            {assetName} SENTIMENT METER
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            isBullish
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : isBearish
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          {displayLabel} • {displayStrength}%
        </span>
      </div>

      {/* SVG Radial Gauge */}
      <div className="relative flex items-end justify-center overflow-visible my-1" style={{ width, height }}>
        <svg viewBox="0 0 200 115" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`gaugeGrad_${assetName.replace(/[^a-zA-Z0-9]/g, '_')}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f43f5e" />
              <stop offset="48%" stopColor="#eab308" />
              <stop offset="52%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <filter id="gaugeGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Arc Track */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke="#1e293b"
            strokeWidth="15"
            strokeLinecap="round"
          />

          {/* Colored Gradient Arc */}
          <path
            d="M 20 105 A 80 80 0 0 1 180 105"
            fill="none"
            stroke={`url(#gaugeGrad_${assetName.replace(/[^a-zA-Z0-9]/g, '_')})`}
            strokeWidth="13"
            strokeLinecap="round"
            filter="url(#gaugeGlowFilter)"
            opacity="0.9"
          />

          {/* Calibrated Tick Marks */}
          <line x1="20" y1="105" x2="28" y2="105" stroke="#f87171" strokeWidth="2.5" />
          <line x1="43" y1="48" x2="49" y2="54" stroke="#fb7185" strokeWidth="2" />
          <line x1="100" y1="25" x2="100" y2="33" stroke="#facc15" strokeWidth="2.5" />
          <line x1="157" y1="48" x2="151" y2="54" stroke="#34d399" strokeWidth="2" />
          <line x1="180" y1="105" x2="172" y2="105" stroke="#10b981" strokeWidth="2.5" />

          {/* Pivot Center Ring */}
          <circle cx="100" cy="105" r="9" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
          <circle
            cx="100"
            cy="105"
            r="4.5"
            fill={isBullish ? '#10b981' : isBearish ? '#ef4444' : '#38bdf8'}
          />

          {/* Dynamic Dial Needle */}
          <g
            style={{
              transform: `rotate(${needleRotation}deg)`,
              transformOrigin: '100px 105px',
              transition: 'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <line
              x1="100"
              y1="105"
              x2="100"
              y2="34"
              stroke={isBullish ? '#10b981' : isBearish ? '#ef4444' : '#38bdf8'}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Needle arrow pointer */}
            <polygon
              points="100,28 96,36 104,36"
              fill={isBullish ? '#10b981' : isBearish ? '#ef4444' : '#38bdf8'}
            />
          </g>
        </svg>

        {/* Needle Value Badge */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 shadow-md">
          <span
            className={`text-xs font-military font-bold ${
              isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-slate-300'
            }`}
          >
            {clampedScore > 0 ? `+${clampedScore}` : clampedScore}
          </span>
          <span className="text-[9px] font-mono-code text-slate-500">/ 100</span>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="w-full flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] font-mono-code text-slate-400">
        <span className="flex items-center gap-1">
          {isBullish ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : isBearish ? (
            <TrendingDown className="w-3 h-3 text-rose-400" />
          ) : (
            <Minus className="w-3 h-3 text-slate-400" />
          )}
          <span className={isBullish ? 'text-emerald-300 font-bold' : isBearish ? 'text-rose-300 font-bold' : 'text-slate-300'}>
            {isBullish ? `${displayStrength}% BULLISH` : isBearish ? `${displayStrength}% BEARISH` : '50% NEUTRAL'}
          </span>
        </span>

        <span className="flex items-center gap-1 text-slate-400">
          <ShieldCheck className="w-3 h-3 text-cyan-400" />
          <span>{confidence}% Conviction</span>
        </span>
      </div>

      {subtitle && (
        <div className="w-full text-[9px] font-mono-code text-slate-500 text-center mt-1 truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
};
