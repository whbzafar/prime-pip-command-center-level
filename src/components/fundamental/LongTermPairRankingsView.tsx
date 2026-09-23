import React, { useState } from 'react';
import {
  CurrencyCode,
  CurrencyScoreResult,
  IndicatorObservation,
  RetailPositioningRecord,
} from '../../types/fundamentalIndicatorTypes';
import { calculateLongTermPairRankings } from '../../utils/fundamentalCalculationEngine';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ChevronRight,
} from 'lucide-react';

interface LongTermPairRankingsViewProps {
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  observations: IndicatorObservation[];
  retailPositioning?: RetailPositioningRecord[];
  onOpenPairModal: (pairResult: any) => void;
}

export const LongTermPairRankingsView: React.FC<LongTermPairRankingsViewProps> = ({
  currencyScores,
  observations,
  retailPositioning = [],
  onOpenPairModal,
}) => {
  const [horizon, setHorizon] = useState<'SHORT' | 'MEDIUM' | 'LONG'>('LONG');

  const { allPairs, topBullish, topBearish } = calculateLongTermPairRankings(
    currencyScores,
    observations,
    retailPositioning
  );

  const getScoreForHorizon = (item: (typeof allPairs)[0]) => {
    if (horizon === 'SHORT') return item.shortTermDiff;
    if (horizon === 'MEDIUM') return item.mediumTermDiff;
    return item.longTermDiff;
  };

  const sortedPairs = [...allPairs].sort((a, b) => getScoreForHorizon(b) - getScoreForHorizon(a));

  return (
    <div className="space-y-6">
      {/* Banner & Horizon Toggle */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                Multi-Horizon Structural Pair Rankings
              </h3>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Deterministic Weighting Across Short, Medium, and Structural Long-Term Macro Horizons
              </p>
            </div>
          </div>

          {/* Horizon Toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-mono-code">
            <button
              onClick={() => setHorizon('SHORT')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                horizon === 'SHORT'
                  ? 'bg-blue-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Short-Term (1-4 Wks)
            </button>
            <button
              onClick={() => setHorizon('MEDIUM')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                horizon === 'MEDIUM'
                  ? 'bg-blue-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Medium-Term (1-3 Mos)
            </button>
            <button
              onClick={() => setHorizon('LONG')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                horizon === 'LONG'
                  ? 'bg-purple-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Long-Term Structural (6-12 Mos)
            </button>
          </div>
        </div>

        {/* Structural Explanation */}
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs font-mono-code text-purple-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>
            {horizon === 'LONG' &&
              'Structural Long-Term horizon weights slower-moving fundamentals: Policy (25%), Growth (22%), Inflation (13%), Real Yields (15%), External Balance (10%), COT (5%), and Retail Contrarian Sentiment (10%).'}
            {horizon === 'MEDIUM' &&
              'Medium-Term horizon blends current surprise momentum (40%) with structural policy fundamentals (60%).'}
            {horizon === 'SHORT' &&
              'Short-Term horizon is driven primarily by recent data surprises, surprise z-scores, and immediate central bank meeting dates.'}
          </span>
        </div>
      </div>

      {/* Top Relative Bullish & Bearish Cards (Section 40) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Bullish */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-xs font-military font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Top Relative Bullish Pairs ({horizon} Horizon)</span>
            </h4>
            <span className="text-[10px] font-mono-code text-slate-400">Widest Macro Advantage</span>
          </div>

          <div className="space-y-2">
            {topBullish.map((item) => {
              const score = getScoreForHorizon(item);
              return (
                <div
                  key={item.pair}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-military font-bold text-sm text-slate-100">{item.pair}</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono-code font-bold">
                        {item.bias.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-code text-slate-400 block mt-0.5">
                      {item.structuralRationale}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-military font-bold text-emerald-400">
                      +{score} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Bearish */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-xs font-military font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              <span>Top Relative Bearish Pairs ({horizon} Horizon)</span>
            </h4>
            <span className="text-[10px] font-mono-code text-slate-400">Widest Macro Disadvantage</span>
          </div>

          <div className="space-y-2">
            {topBearish.map((item) => {
              const score = getScoreForHorizon(item);
              return (
                <div
                  key={item.pair}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/40 transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-military font-bold text-sm text-slate-100">{item.pair}</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono-code font-bold">
                        {item.bias.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono-code text-slate-400 block mt-0.5">
                      {item.structuralRationale}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-military font-bold text-rose-400">
                      {score} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comprehensive Structural Factor Breakdown Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 bg-[#0c1222] flex items-center justify-between">
          <h4 className="font-military font-bold text-xs text-slate-100 uppercase tracking-wider">
            Eligible Pair Structural Factor Matrix
          </h4>
          <span className="text-[10px] font-mono-code text-slate-400">
            Sorted by {horizon} Fundamental Score
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="p-3">Currency Pair</th>
                <th className="p-3 text-right">Short-Term</th>
                <th className="p-3 text-right">Medium-Term</th>
                <th className="p-3 text-right">Long-Term</th>
                <th className="p-3 text-right">Policy Spread</th>
                <th className="p-3 text-right">Growth Spread</th>
                <th className="p-3 text-right">Real Rate Spread</th>
                <th className="p-3 text-right">Retail Sentiment</th>
                <th className="p-3 text-center">Short Bias</th>
                <th className="p-3 text-center">Medium Bias</th>
                <th className="p-3 text-center">Long Bias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {sortedPairs.map((item) => {
                const activeScore = getScoreForHorizon(item);
                return (
                  <tr key={item.pair} className="hover:bg-slate-900/40 transition">
                    <td className="p-3 font-military font-bold text-slate-100">
                      {item.pair}
                    </td>

                    <td className="p-3 text-right text-slate-300">
                      {item.shortTermDiff > 0 ? `+${item.shortTermDiff}` : item.shortTermDiff}
                    </td>

                    <td className="p-3 text-right text-slate-300">
                      {item.mediumTermDiff > 0 ? `+${item.mediumTermDiff}` : item.mediumTermDiff}
                    </td>

                    <td className="p-3 text-right font-military font-bold text-purple-300">
                      {item.longTermDiff > 0 ? `+${item.longTermDiff}` : item.longTermDiff}
                    </td>

                    <td className="p-3 text-right text-slate-400">
                      {item.structuralFactors.monetaryPolicyRegime > 0 ? `+${item.structuralFactors.monetaryPolicyRegime}` : item.structuralFactors.monetaryPolicyRegime}
                    </td>

                    <td className="p-3 text-right text-slate-400">
                      {item.structuralFactors.growthTrend > 0 ? `+${item.structuralFactors.growthTrend}` : item.structuralFactors.growthTrend}
                    </td>

                    <td className="p-3 text-right text-slate-400">
                      {item.structuralFactors.realRateDifferential > 0 ? `+${item.structuralFactors.realRateDifferential}` : item.structuralFactors.realRateDifferential}
                    </td>

                    <td className="p-3 text-right text-cyan-300">
                      {item.structuralFactors.retailSentimentDifferential > 0 ? '+' : ''}{item.structuralFactors.retailSentimentDifferential}
                    </td>
                    {([
                      ['SHORT', item.shortTermDiff],
                      ['MEDIUM', item.mediumTermDiff],
                      ['LONG', item.longTermDiff],
                    ] as const).map(([label, value]) => (
                      <td key={label} className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${value > 15 ? 'bg-emerald-500/20 text-emerald-300' : value < -15 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
                          {value > 15 ? 'BULLISH' : value < -15 ? 'BEARISH' : 'NEUTRAL'}
                        </span>
                      </td>
                    ))}                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
