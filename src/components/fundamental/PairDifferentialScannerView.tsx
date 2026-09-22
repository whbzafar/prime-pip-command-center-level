import React, { useState } from 'react';
import {
  CurrencyCode,
  CurrencyScoreResult,
  PairDifferentialResult,
} from '../../types/fundamentalIndicatorTypes';
import { calculatePairDifferential } from '../../utils/fundamentalCalculationEngine';
import { Sparkles, ArrowRight, ArrowUpRight, ArrowDownRight, Scale, AlertTriangle, ShieldCheck, Filter } from 'lucide-react';
import { CURRENCY_METADATA } from '../../data/fundamentalRegistryData';

interface PairDifferentialScannerViewProps {
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  onRequestAiPairThesis: (pair: string, diff: PairDifferentialResult) => void;
  onSelectCurrency: (curr: CurrencyCode) => void;
}

const MAJOR_AND_CROSS_PAIRS: Array<{ pair: string; base: CurrencyCode; quote: CurrencyCode; category: 'MAJOR' | 'CROSS' }> = [
  { pair: 'EURUSD', base: 'EUR', quote: 'USD', category: 'MAJOR' },
  { pair: 'GBPUSD', base: 'GBP', quote: 'USD', category: 'MAJOR' },
  { pair: 'USDJPY', base: 'USD', quote: 'JPY', category: 'MAJOR' },
  { pair: 'AUDUSD', base: 'AUD', quote: 'USD', category: 'MAJOR' },
  { pair: 'USDCAD', base: 'USD', quote: 'CAD', category: 'MAJOR' },
  { pair: 'USDCHF', base: 'USD', quote: 'CHF', category: 'MAJOR' },
  { pair: 'NZDUSD', base: 'NZD', quote: 'USD', category: 'MAJOR' },
  { pair: 'EURGBP', base: 'EUR', quote: 'GBP', category: 'CROSS' },
  { pair: 'EURJPY', base: 'EUR', quote: 'JPY', category: 'CROSS' },
  { pair: 'GBPJPY', base: 'GBP', quote: 'JPY', category: 'CROSS' },
  { pair: 'AUDJPY', base: 'AUD', quote: 'JPY', category: 'CROSS' },
  { pair: 'CADJPY', base: 'CAD', quote: 'JPY', category: 'CROSS' },
  { pair: 'CHFJPY', base: 'CHF', quote: 'JPY', category: 'CROSS' },
  { pair: 'NZDJPY', base: 'NZD', quote: 'JPY', category: 'CROSS' },
  { pair: 'EURAUD', base: 'EUR', quote: 'AUD', category: 'CROSS' },
  { pair: 'EURCAD', base: 'EUR', quote: 'CAD', category: 'CROSS' },
  { pair: 'EURCHF', base: 'EUR', quote: 'CHF', category: 'CROSS' },
  { pair: 'EURNZD', base: 'EUR', quote: 'NZD', category: 'CROSS' },
  { pair: 'GBPAUD', base: 'GBP', quote: 'AUD', category: 'CROSS' },
  { pair: 'GBPCAD', base: 'GBP', quote: 'CAD', category: 'CROSS' },
  { pair: 'GBPCHF', base: 'GBP', quote: 'CHF', category: 'CROSS' },
  { pair: 'GBPNZD', base: 'GBP', quote: 'NZD', category: 'CROSS' },
  { pair: 'AUDCAD', base: 'AUD', quote: 'CAD', category: 'CROSS' },
  { pair: 'AUDCHF', base: 'AUD', quote: 'CHF', category: 'CROSS' },
  { pair: 'AUDNZD', base: 'AUD', quote: 'NZD', category: 'CROSS' },
  { pair: 'CADCHF', base: 'CAD', quote: 'CHF', category: 'CROSS' },
  { pair: 'NZDCAD', base: 'NZD', quote: 'CAD', category: 'CROSS' },
  { pair: 'NZDCHF', base: 'NZD', quote: 'CHF', category: 'CROSS' },
];

export const PairDifferentialScannerView: React.FC<PairDifferentialScannerViewProps> = ({
  currencyScores,
  onRequestAiPairThesis,
  onSelectCurrency,
}) => {
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'MAJOR' | 'CROSS'>('ALL');
  const [minDifferential, setMinDifferential] = useState<number>(0);

  // Compute differentials
  const pairResults: Array<{
    pair: string;
    base: CurrencyCode;
    quote: CurrencyCode;
    category: 'MAJOR' | 'CROSS';
    diff: PairDifferentialResult;
  }> = MAJOR_AND_CROSS_PAIRS.map((p) => {
    const diff = calculatePairDifferential(p.base, p.quote, currencyScores);
    return {
      ...p,
      diff,
    };
  });

  // Filter pairs
  const filtered = pairResults.filter((item) => {
    if (filterCategory !== 'ALL' && item.category !== filterCategory) return false;
    if (Math.abs(item.diff.differential) < minDifferential) return false;
    return true;
  });

  // Sort pairs by absolute differential descending
  const sorted = [...filtered].sort(
    (a, b) => Math.abs(b.diff.differential) - Math.abs(a.diff.differential)
  );

  const getBiasBadge = (bias: PairDifferentialResult['bias']) => {
    switch (bias) {
      case 'STRONG_BULLISH':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono-code font-bold inline-flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>STRONG BUY</span>
          </span>
        );
      case 'BULLISH':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono-code font-bold inline-flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>BULLISH</span>
          </span>
        );
      case 'STRONG_BEARISH':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono-code font-bold inline-flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>STRONG SELL</span>
          </span>
        );
      case 'BEARISH':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-mono-code font-bold inline-flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>BEARISH</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono-code font-bold">
            NEUTRAL / MIXED
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Header & Filter Controls */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                Pair Fundamental Differential Matrix
              </h3>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Base Score minus Quote Score = Net Relative Divergence Spread (-200 to +200)
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-mono-code">
              {(['ALL', 'MAJOR', 'CROSS'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg transition font-bold cursor-pointer ${
                    filterCategory === cat
                      ? 'bg-blue-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat} PAIRS
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono-code text-slate-400">
              <span>Min Spread:</span>
              <select
                value={minDifferential}
                onChange={(e) => setMinDifferential(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-200 font-bold focus:outline-none focus:border-blue-500"
              >
                <option value={0}>All Spreads (≥ 0)</option>
                <option value={20}>Moderate (≥ 20 pts)</option>
                <option value={40}>Strong (≥ 40 pts)</option>
                <option value={60}>Elite Dislocation (≥ 60 pts)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pair Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(({ pair, base, quote, diff }) => {
            const baseMeta = CURRENCY_METADATA[base];
            const quoteMeta = CURRENCY_METADATA[quote];

            return (
              <div
                key={pair}
                className="p-4 rounded-xl border bg-slate-900/60 border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
              >
                {/* Card Top: Pair Name + Bias */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {baseMeta?.flag}{quoteMeta?.flag}
                    </span>
                    <div>
                      <div className="font-military font-bold text-base text-slate-100">
                        {pair}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-code">
                        {baseMeta?.name} / {quoteMeta?.name}
                      </div>
                    </div>
                  </div>

                  {getBiasBadge(diff.bias)}
                </div>

                {/* Card Middle: Scores Breakdown */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-center font-mono-code text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">{base} Score</span>
                    <span
                      className={`font-bold ${
                        diff.baseScore > 0 ? 'text-emerald-400' : diff.baseScore < 0 ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {diff.baseScore > 0 ? `+${diff.baseScore}` : diff.baseScore}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">{quote} Score</span>
                    <span
                      className={`font-bold ${
                        diff.quoteScore > 0 ? 'text-emerald-400' : diff.quoteScore < 0 ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {diff.quoteScore > 0 ? `+${diff.quoteScore}` : diff.quoteScore}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block">Net Spread</span>
                    <span
                      className={`font-military font-bold text-sm ${
                        diff.differential > 0
                          ? 'text-emerald-400'
                          : diff.differential < 0
                          ? 'text-rose-400'
                          : 'text-slate-200'
                      }`}
                    >
                      {diff.differential > 0 ? `+${diff.differential}` : diff.differential}
                    </span>
                  </div>
                </div>

                {/* Drivers / Conflict Flags */}
                <div className="space-y-1 text-xs">
                  {diff.primaryDrivers.slice(0, 1).map((driver, i) => (
                    <div key={i} className="text-[11px] text-slate-300 font-sans flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span className="line-clamp-1">{driver}</span>
                    </div>
                  ))}

                  {diff.conflicts.length > 0 && (
                    <div className="text-[11px] text-amber-300 font-mono-code flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{diff.conflicts[0]}</span>
                    </div>
                  )}
                </div>

                {/* Card Bottom: AI Thesis & Currency Links */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1 text-[11px] font-mono-code text-slate-400">
                    <button
                      onClick={() => onSelectCurrency(base)}
                      className="hover:text-cyan-300 transition cursor-pointer"
                    >
                      Inspect {base}
                    </button>
                    <span>/</span>
                    <button
                      onClick={() => onSelectCurrency(quote)}
                      className="hover:text-cyan-300 transition cursor-pointer"
                    >
                      {quote}
                    </button>
                  </div>

                  <button
                    onClick={() => onRequestAiPairThesis(pair, diff)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-cyan-300 text-xs font-military font-bold border border-blue-500/30 transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI THESIS</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
