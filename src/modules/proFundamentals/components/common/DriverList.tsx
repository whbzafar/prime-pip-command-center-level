import React from 'react';
import { FactorDriver } from '../../types';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';

export interface DriverListProps {
  drivers: FactorDriver[];
  title?: string;
  subtitle?: string;
  limit?: number;
}

export const DriverList: React.FC<DriverListProps> = ({
  drivers,
  title = 'Key Fundamental Drivers',
  subtitle = 'Ranked catalysts influencing institutional sentiment',
  limit = 8,
}) => {
  const visibleDrivers = drivers.slice(0, limit);

  return (
    <div className="bg-[#0D1424] border border-[#1B2742] rounded-2xl p-4 sm:p-5 shadow-lg">
      <div className="flex items-center justify-between mb-3.5">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">{subtitle}</p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
          {visibleDrivers.length} Catalysts
        </span>
      </div>

      <div className="divide-y divide-slate-800/80">
        {visibleDrivers.map((driver, index) => {
          const isPositive = driver.contribution > 0;
          const isNegative = driver.contribution < 0;

          return (
            <div key={`${driver.factor}-${index}`} className="py-3 first:pt-1 last:pb-1 group">
              <div className="flex items-start justify-between gap-3">
                {/* Left: Factor Name, Detail, and Metadata */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {driver.factor}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 uppercase">
                      {driver.source}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{driver.detail}</p>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 pt-0.5">
                    <span>Source: {driver.source}</span>
                    <span>•</span>
                    <span>Updated: {new Date(driver.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Right: Contribution Score & Trend */}
                <div className="flex items-center gap-2 shrink-0">
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-mono font-bold text-xs border ${
                      isPositive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : isNegative
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : isNegative ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="tabular-nums">
                      {isPositive ? `+${driver.contribution}` : driver.contribution}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
