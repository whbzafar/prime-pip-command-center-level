import React from 'react';
import { CurrencyCode, CurrencyScoreResult, IndicatorCategory } from '../../types/fundamentalIndicatorTypes';
import { CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import { Trophy, ArrowUpRight, ArrowDownRight, Layers, BarChart2 } from 'lucide-react';

interface CurrencyStrengthMatrixViewProps {
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  onSelectCurrency: (curr: CurrencyCode) => void;
}

export const CurrencyStrengthMatrixView: React.FC<CurrencyStrengthMatrixViewProps> = ({
  currencyScores,
  onSelectCurrency,
}) => {
  const currencies = Object.keys(CURRENCY_METADATA) as CurrencyCode[];

  // Sort currencies by composite score descending
  const ranked = [...currencies].sort((a, b) => {
    const sA = currencyScores[a]?.score ?? 0;
    const sB = currencyScores[b]?.score ?? 0;
    return sB - sA;
  });

  const categories: { key: IndicatorCategory; label: string }[] = [
    { key: 'INFLATION', label: 'Inflation' },
    { key: 'MONETARY_POLICY', label: 'Policy Rate' },
    { key: 'GROWTH', label: 'GDP Growth' },
    { key: 'EMPLOYMENT', label: 'Labor Market' },
    { key: 'RATES_YIELDS', label: 'Yields' },
    { key: 'BUSINESS_ACTIVITY', label: 'Activity' },
    { key: 'CONSUMER', label: 'Consumer' },
    { key: 'TRADE_EXTERNAL', label: 'Trade Balance' },
  ];

  return (
    <div className="space-y-6">
      {/* Ranked Strength Ladder */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              Fundamental Currency Strength Ranking (Deterministic Ladder)
            </h3>
          </div>
          <span className="text-xs font-mono-code text-slate-400">
            Ranked mathematically by composite economic score (-100 to +100)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ranked.map((code, index) => {
            const sc = currencyScores[code];
            const score = sc?.score ?? 0;
            const meta = CURRENCY_METADATA[code];
            const rank = index + 1;

            const isTop = rank <= 2;
            const isBottom = rank >= 7;

            return (
              <div
                key={code}
                onClick={() => onSelectCurrency(code)}
                className={`p-4 rounded-xl border transition cursor-pointer relative overflow-hidden group ${
                  isTop
                    ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-400'
                    : isBottom
                    ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-400'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{meta?.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-military font-bold text-base text-slate-100">
                          {code}
                        </span>
                        <span className="text-xs font-mono-code text-slate-400">
                          #{rank}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-code">
                        {meta?.name}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xl font-bold font-military ${
                        score > 15
                          ? 'text-emerald-400'
                          : score < -15
                          ? 'text-rose-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {score > 0 ? `+${score}` : score}
                    </div>
                    <div className="text-[10px] font-mono-code text-slate-500 uppercase">
                      {sc?.assessmentLabel || 'NEUTRAL'}
                    </div>
                  </div>
                </div>

                {/* Relative Strength Progress Bar */}
                <div className="mt-3 space-y-1">
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full ${
                        score > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.abs(score))}%`,
                        marginLeft: score < 0 ? 'auto' : 0,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-Category Heatmap Matrix */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              Cross-Currency Category Heatmap Matrix
            </h3>
          </div>
          <span className="text-xs font-mono-code text-slate-400">
            Green: Bullish Support • Red: Fundamental Drag
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead className="bg-[#0b1120] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Currency</th>
                <th className="p-3 text-center">Composite</th>
                {categories.map((cat) => (
                  <th key={cat.key} className="p-3 text-center">
                    {cat.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {ranked.map((curr) => {
                const sc = currencyScores[curr];
                const meta = CURRENCY_METADATA[curr];
                return (
                  <tr
                    key={curr}
                    onClick={() => onSelectCurrency(curr)}
                    className="hover:bg-slate-900/60 transition cursor-pointer"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{meta?.flag}</span>
                        <span className="font-bold font-military text-slate-100">{curr}</span>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`font-military font-bold px-2 py-0.5 rounded ${
                          sc?.score > 15
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : sc?.score < -15
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {sc?.score > 0 ? `+${sc.score}` : sc?.score}
                      </span>
                    </td>

                    {categories.map((cat) => {
                      const catScore = sc?.categoryScores?.[cat.key]?.score ?? 0;
                      return (
                        <td key={cat.key} className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              catScore >= 25
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : catScore <= -25
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'text-slate-400'
                            }`}
                          >
                            {catScore > 0 ? `+${catScore}` : catScore}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
