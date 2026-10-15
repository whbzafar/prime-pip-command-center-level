import React, { useState } from 'react';
import { Info, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { CotIndexResult, CotLookbackPeriod } from '../../types/cotTypes';

interface SmartMoneyGaugeProps {
  nonCommResult: CotIndexResult;
  commResult: CotIndexResult;
  lookback: CotLookbackPeriod;
  onLookbackChange: (lb: CotLookbackPeriod) => void;
  marketName: string;
}

export const SmartMoneyGauge: React.FC<SmartMoneyGaugeProps> = ({
  nonCommResult,
  commResult,
  lookback,
  onLookbackChange,
  marketName,
}) => {
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);

  // Check for strong divergence between Speculators (Non-Commercial) and Hedgers (Commercial)
  const isDivergent =
    nonCommResult.status === 'VALID' &&
    commResult.status === 'VALID' &&
    nonCommResult.index !== null &&
    commResult.index !== null &&
    Math.abs(nonCommResult.index - commResult.index) >= 50;

  return (
    <div className="bg-[#0b101b] border border-slate-800/80 rounded-2xl p-4 sm:p-5 relative shadow-xl">
      {/* Header & Lookback Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Smart Money Meter</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono-code font-bold">
                COT INDEX
              </span>
            </h3>
            <button
              onClick={() => setShowFormulaTooltip(!showFormulaTooltip)}
              className="text-slate-400 hover:text-cyan-300 transition cursor-pointer"
              title="Click for COT Index calculation methodology"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Normalized 0–100 percentile oscillator comparing current net against historical extremes.
          </p>
        </div>

        {/* Lookback Selector */}
        <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-950/80 border border-slate-800 rounded-xl p-1">
          <span className="text-[10px] font-mono-code text-slate-400 px-1.5">LOOKBACK:</span>
          {(['1Y', '3Y', '5Y'] as CotLookbackPeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => onLookbackChange(period)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                lookback === period
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {period}
              {period === '3Y' && <span className="ml-1 text-[9px] opacity-75">(Def)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Info Explanation Tooltip */}
      {showFormulaTooltip && (
        <div className="mt-3 p-3 bg-slate-950/90 border border-cyan-500/30 rounded-xl text-xs text-slate-300 space-y-1.5 font-sans">
          <div className="font-bold text-cyan-300 font-mono-code flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>COT Index Methodology (Larry Williams Formulation)</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            Formula: <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300 font-mono-code">COT Index = (Current Net - Min Net over Lookback) / (Max Net - Min Net) × 100</code>
          </p>
          <p className="text-[11px] text-slate-400">
            • Data is recorded as of Tuesday close by the CFTC and released on Friday at 3:30 PM New York time.
            <br />
            • Lookback compares current weekly net positions over 1-year (52 weeks), 3-years (156 weeks), or 5-years (260 weeks).
            <br />
            • <strong className="text-white">Zones:</strong> 80–100 Extreme Long Positioning | 20–80 Neutral Range | 0–20 Extreme Short Positioning.
          </p>
        </div>
      )}

      {/* Dual Gauges Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Primary Gauge: Non-Commercial (Hedge Funds & Speculators) */}
        <GaugeCard
          title="Non-Commercial Speculators"
          subtitle="Hedge Funds & Trend Followers (Primary Indicator)"
          result={nonCommResult}
          lookback={lookback}
          isPrimary={true}
        />

        {/* Secondary Gauge: Commercial (Hedgers & Producers) */}
        <GaugeCard
          title="Commercial Hedgers"
          subtitle="Producers & Institutional Users (Counter-Trend Smart Money)"
          result={commResult}
          lookback={lookback}
          isPrimary={false}
        />
      </div>

      {/* Strong Divergence Alert Banner */}
      {isDivergent && (
        <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-2.5 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong className="font-bold text-amber-300 font-mono-code uppercase block">
              Significant Smart Money Divergence ({Math.abs((nonCommResult.index ?? 0) - (commResult.index ?? 0))} pts)
            </strong>
            <span>
              Speculators and Commercial Hedgers are in opposing extremes. When hedge funds are aggressively long and hedgers are heavily short, institutional smart money is hedging into retail/speculator momentum.
            </span>
          </div>
        </div>
      )}

      {/* Mandatory Regulatory / Financial Advisory Disclaimer */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono-code text-slate-400 gap-2">
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>POSITIONING INDICATOR — Not a direct buy or sell signal.</span>
        </span>
        <span className="text-slate-400 text-center sm:text-right italic">
          Positioning data is informational and not financial advice.
        </span>
      </div>
    </div>
  );
};

interface GaugeCardProps {
  title: string;
  subtitle: string;
  result: CotIndexResult;
  lookback: CotLookbackPeriod;
  isPrimary: boolean;
}

const GaugeCard: React.FC<GaugeCardProps> = ({ title, subtitle, result, lookback, isPrimary }) => {
  const { index, minNet, maxNet, currentNet, status, zone } = result;

  // Gauge Angle: -90 deg to +90 deg (semi-circle)
  const angle = index !== null ? -90 + (index / 100) * 180 : -90;

  const zoneColor =
    zone === 'EXTREME_LONG'
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/15'
      : zone === 'EXTREME_SHORT'
      ? 'text-rose-400 border-rose-500/40 bg-rose-500/15'
      : 'text-cyan-400 border-cyan-500/40 bg-cyan-500/15';

  const zoneLabel =
    zone === 'EXTREME_LONG'
      ? 'EXTREME LONG POSITIONING (80–100)'
      : zone === 'EXTREME_SHORT'
      ? 'EXTREME SHORT POSITIONING (0–20)'
      : 'NEUTRAL POSITIONING RANGE (20–80)';

  return (
    <div className={`p-4 rounded-xl border ${isPrimary ? 'bg-slate-900/60 border-cyan-500/30' : 'bg-slate-900/40 border-slate-800'} flex flex-col items-center text-center relative`}>
      <div className="w-full text-left mb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono-code font-bold text-white uppercase tracking-wider">
            {title}
          </span>
          <span className="text-[10px] font-mono-code text-slate-400">{lookback} Lookback</span>
        </div>
        <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>
      </div>

      {/* SVG Semi-Circle Dial */}
      <div className="relative w-48 h-26 my-2">
        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
          {/* Background Arc Tracks */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Extreme Short Zone (0 - 20) */}
          <path
            d="M 20 100 A 80 80 0 0 1 45 43"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="16"
            strokeDasharray="1 0"
            className="opacity-70"
          />

          {/* Neutral Range Zone (20 - 80) */}
          <path
            d="M 45 43 A 80 80 0 0 1 155 43"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="16"
            className="opacity-40"
          />

          {/* Extreme Long Zone (80 - 100) */}
          <path
            d="M 155 43 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#10b981"
            strokeWidth="16"
            strokeLinecap="round"
            className="opacity-70"
          />

          {/* Center Pivot */}
          <circle cx="100" cy="100" r="7" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />

          {/* Pointer Needle */}
          {status === 'VALID' && index !== null && (
            <g transform={`rotate(${angle} 100 100)`}>
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="28"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="drop-shadow(0 0 4px rgba(0,240,255,0.7))"
              />
              <circle cx="100" cy="28" r="4" fill="#00f0ff" />
            </g>
          )}
        </svg>

        {/* Center Big Value */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end">
          {status === 'VALID' && index !== null ? (
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-black font-mono-code text-white tracking-tight">
                {index.toFixed(1)}
              </span>
              <span className="text-xs font-mono-code text-slate-400">%</span>
            </div>
          ) : status === 'FLAT_RANGE' ? (
            <span className="text-xs font-mono-code text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
              Not enough range
            </span>
          ) : (
            <span className="text-xs font-mono-code text-slate-400">Insufficient Data</span>
          )}
        </div>
      </div>

      {/* Zone Badge */}
      <div className={`mt-2 px-3 py-1 rounded-full text-[10px] font-mono-code font-bold uppercase border ${zoneColor}`}>
        {status === 'VALID' ? zoneLabel : status === 'FLAT_RANGE' ? 'Range is Flat (Max = Min)' : 'Historical Gap'}
      </div>

      {/* Range Min/Max Telemetry */}
      <div className="w-full grid grid-cols-3 gap-1 mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono-code text-slate-400">
        <div>
          <span className="block text-[9px] uppercase text-slate-400">Min Net</span>
          <span className="text-slate-300 font-bold">{minNet.toLocaleString()}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase text-cyan-400">Current</span>
          <span className="text-cyan-300 font-bold">{currentNet.toLocaleString()}</span>
        </div>
        <div>
          <span className="block text-[9px] uppercase text-slate-400">Max Net</span>
          <span className="text-slate-300 font-bold">{maxNet.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
