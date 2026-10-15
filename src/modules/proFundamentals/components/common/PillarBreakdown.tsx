import React, { useState } from 'react';
import { FundamentalPillar, Horizon } from '../../types';
import { Info, HelpCircle } from 'lucide-react';
import { FUNDAMENTAL_PILLARS } from '../../config/pillars';

export interface PillarBreakdownProps {
  pillars: FundamentalPillar[];
  horizon: Horizon;
  title?: string;
  subtitle?: string;
}

export const PillarBreakdown: React.FC<PillarBreakdownProps> = ({
  pillars,
  horizon,
  title = 'Fundamental Pillar Breakdown',
  subtitle = 'Score contribution by macroeconomic factor category',
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  return (
    <div className="bg-[#0D1424] border border-[#1B2742] rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-semibold uppercase">
              7 PILLARS
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">{subtitle}</p>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-400">Horizon:</span>
          <span className="ml-1 text-xs font-mono font-bold text-cyan-400 uppercase">
            {horizon === 'short' ? 'Short-term (1–4W)' : 'Long-term (6M+)'}
          </span>
        </div>
      </div>

      {/* Axis Scale Markers */}
      <div className="relative mb-2 flex justify-between text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-1">
        <span>-100 (Bearish)</span>
        <span className="text-slate-400 font-bold">0 (Neutral)</span>
        <span>+100 (Bullish)</span>
      </div>

      {/* Pillars List */}
      <div className="space-y-3.5">
        {pillars.map((pillar) => {
          const weight = pillar.weight[horizon];
          const weightPercent = Math.round(weight * 100);
          const meta = FUNDAMENTAL_PILLARS.find((p) => p.id === pillar.id);
          const isPositive = pillar.score > 0;
          const isNegative = pillar.score < 0;
          const barWidth = Math.min(100, Math.abs(pillar.score));

          return (
            <div key={pillar.id} className="group relative">
              <div className="flex items-center justify-between text-xs font-sans mb-1 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                    {pillar.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTooltip(activeTooltip === pillar.id ? null : pillar.id)}
                    className="text-slate-400 hover:text-cyan-400 cursor-pointer p-0.5 transition"
                    title="Inspect pillar definition and weight"
                    aria-label={`Inspect ${pillar.name}`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 font-mono shrink-0">
                  <span className="text-[11px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    Weight {weightPercent}%
                  </span>
                  <span
                    className={`font-bold tabular-nums text-xs min-w-[3rem] text-right ${
                      isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {pillar.score > 0 ? `+${pillar.score}` : pillar.score}
                  </span>
                </div>
              </div>

              {/* Bidirectional Horizontal Bar with Center Zero Line */}
              <div className="relative h-2.5 bg-slate-900/80 rounded-full overflow-hidden border border-slate-800">
                {/* Center 0 Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-600 z-10" />

                {/* Left/Negative Bar */}
                {isNegative && (
                  <div
                    className="absolute top-0 bottom-0 bg-gradient-to-l from-rose-500 to-rose-600 rounded-l-full transition-all duration-300"
                    style={{
                      right: '50%',
                      width: `${barWidth / 2}%`,
                    }}
                  />
                )}

                {/* Right/Positive Bar */}
                {isPositive && (
                  <div
                    className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-r-full transition-all duration-300"
                    style={{
                      left: '50%',
                      width: `${barWidth / 2}%`,
                    }}
                  />
                )}
              </div>

              {/* Expandable Explanation Tooltip */}
              {activeTooltip === pillar.id && meta && (
                <div className="mt-2 p-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-xs text-slate-300 space-y-1 shadow-xl animate-fadeIn">
                  <div className="flex items-center justify-between font-mono font-bold text-cyan-300 text-[11px]">
                    <span>{meta.name}</span>
                    <span>Weight: {weightPercent}%</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    {meta.description}
                  </p>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {meta.keyFactors.map((kf) => (
                      <span key={kf} className="text-[10px] font-mono bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800">
                        {kf}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
