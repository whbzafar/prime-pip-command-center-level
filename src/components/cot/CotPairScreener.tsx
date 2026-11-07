import React, { useState, useMemo } from 'react';
import {
  CotPairResult,
  CotAssetMetric,
  CotPairCategory,
  CotPairBiasLabel,
  generateAllCotPairs,
  evaluateCotPair,
} from '../../utils/cotPairEngine';
import { CotMarketSummary } from '../../types/cotTypes';
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Search,
  SlidersHorizontal,
  ArrowRight,
  Info,
  Layers,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  X,
  Gauge,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface CotPairScreenerProps {
  summaries: CotMarketSummary[];
  isLoading: boolean;
}

type FilterView = 'ALL' | 'TOP_DIVERGENCES' | 'FOREX' | 'COMMODITIES' | 'INDICES' | 'CRYPTO';
type SortOption = 'MOST_BULLISH' | 'MOST_BEARISH' | 'LARGEST_DIVERGENCE' | 'ALPHABETICAL';

export const CotPairScreener: React.FC<CotPairScreenerProps> = ({ summaries, isLoading }) => {
  // Generate all pairs and single-asset metrics
  const { assetMetrics, allPairs, pairsByCategory, topBullishPairs, topBearishPairs } = useMemo(() => {
    return generateAllCotPairs(summaries);
  }, [summaries]);

  // View & Filter States
  const [activeCategory, setActiveCategory] = useState<FilterView>('FOREX');
  const [searchTerm, setSearchTerm] = useState('');
  const [biasFilter, setBiasFilter] = useState<'ALL' | 'BULLISH_ONLY' | 'BEARISH_ONLY' | 'BALANCED_ONLY'>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('LARGEST_DIVERGENCE');

  // Custom Pair Builder State
  const [customBase, setCustomBase] = useState<string>('EUR');
  const [customQuote, setCustomQuote] = useState<string>('USD');
  const [selectedPairModal, setSelectedPairModal] = useState<CotPairResult | null>(null);

  // Compute live custom pair
  const customPairResult = useMemo(() => {
    if (!customBase || !customQuote || customBase === customQuote) return null;
    const baseMetric = assetMetrics.find((a) => a.symbol === customBase);
    const quoteMetric = assetMetrics.find((a) => a.symbol === customQuote);
    if (!baseMetric || !quoteMetric) return null;
    return evaluateCotPair(baseMetric, quoteMetric, 'CUSTOM');
  }, [customBase, customQuote, assetMetrics]);

  // Filtered and sorted pairs
  const displayedPairs = useMemo(() => {
    let list: CotPairResult[] = [];

    if (activeCategory === 'TOP_DIVERGENCES') {
      // Top 8 Bullish and Top 8 Bearish
      const combined = [...topBullishPairs, ...topBearishPairs];
      const unique = Array.from(new Map(combined.map((p) => [p.id, p])).values());
      list = unique;
    } else if (activeCategory === 'ALL') {
      list = allPairs;
    } else {
      list = pairsByCategory[activeCategory as CotPairCategory] || [];
    }

    // Apply Bias Filter
    if (biasFilter === 'BULLISH_ONLY') {
      list = list.filter((p) => p.bullishnessPct >= 53);
    } else if (biasFilter === 'BEARISH_ONLY') {
      list = list.filter((p) => p.bullishnessPct <= 47);
    } else if (biasFilter === 'BALANCED_ONLY') {
      list = list.filter((p) => p.bullishnessPct > 47 && p.bullishnessPct < 53);
    }

    // Apply Search Term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (p) =>
          p.pair.toLowerCase().includes(q) ||
          p.baseName.toLowerCase().includes(q) ||
          p.quoteName.toLowerCase().includes(q) ||
          p.biasLabel.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'MOST_BULLISH') return b.bullishnessPct - a.bullishnessPct;
      if (sortBy === 'MOST_BEARISH') return a.bullishnessPct - b.bullishnessPct;
      if (sortBy === 'LARGEST_DIVERGENCE') return Math.abs(b.differentialScore) - Math.abs(a.differentialScore);
      return a.pair.localeCompare(b.pair);
    });
  }, [
    activeCategory,
    allPairs,
    pairsByCategory,
    topBullishPairs,
    topBearishPairs,
    biasFilter,
    searchTerm,
    sortBy,
  ]);

  const getBiasPillStyle = (bias: CotPairBiasLabel) => {
    switch (bias) {
      case 'STRONGLY BULLISH':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30';
      case 'MODERATELY BULLISH':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'MILDLY BULLISH':
        return 'bg-emerald-500/10 text-emerald-300/90 border-emerald-500/30';
      case 'BALANCED':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'MILDLY BEARISH':
        return 'bg-rose-500/10 text-rose-300/90 border-rose-500/30';
      case 'MODERATELY BEARISH':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'STRONGLY BEARISH':
        return 'bg-red-500/20 text-red-300 border-red-500/40 ring-1 ring-red-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getGaugeColor = (pct: number) => {
    if (pct >= 72) return 'text-emerald-400 bg-emerald-500';
    if (pct >= 60) return 'text-teal-400 bg-teal-500';
    if (pct >= 53) return 'text-emerald-300 bg-emerald-400';
    if (pct <= 28) return 'text-red-400 bg-red-500';
    if (pct <= 40) return 'text-rose-400 bg-rose-500';
    if (pct <= 47) return 'text-rose-300 bg-rose-400';
    return 'text-slate-300 bg-slate-500';
  };

  if (isLoading && summaries.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-3xl space-y-4">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        <p className="text-sm font-military font-bold text-slate-200">
          Computing Cross-Asset COT Differentials &amp; Pair Bullishness...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Intelligence Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-950/80 border border-cyan-500/30 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base sm:text-lg font-military font-bold text-white tracking-wide">
                COT Relative Strength &amp; Cross-Asset Pair Screener
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Synthesizes large institutional speculator (non-commercial) positioning across the CFTC universe.
              By cross-referencing strong vs. weak contracts, the engine deterministically establishes the percentage
              and degree of bullishness or bearishness for every pair.
            </p>
          </div>

          {/* Quick Stats Strip */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-right">
              <span className="text-[10px] font-mono-code text-slate-400 block uppercase">Pairs Computed</span>
              <span className="text-sm font-bold font-mono-code text-cyan-300">{allPairs.length} Active</span>
            </div>
            {topBullishPairs[0] && (
              <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-right">
                <span className="text-[10px] font-mono-code text-emerald-400 block uppercase">Top Bullish</span>
                <span className="text-sm font-bold font-mono-code text-emerald-300">
                  {topBullishPairs[0].pair} ({topBullishPairs[0].bullishnessPct}%)
                </span>
              </div>
            )}
            {topBearishPairs[0] && (
              <div className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-right">
                <span className="text-[10px] font-mono-code text-rose-400 block uppercase">Top Bearish</span>
                <span className="text-sm font-bold font-mono-code text-rose-300">
                  {topBearishPairs[0].pair} ({topBearishPairs[0].bullishnessPct}%)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Custom Cross-Pair Comparison Builder */}
      <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wide">
              Custom Cross-Asset Pair Builder
            </span>
            <span className="text-[10px] font-mono-code text-slate-400 hidden sm:inline">
              (Cross-reference ANY two assets in the report)
            </span>
          </div>

          <span className="text-[10px] font-mono-code text-cyan-400">
            {assetMetrics.length} Verified CFTC Markets Available
          </span>
        </div>

        {/* Selector Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 space-y-1">
            <label className="text-[10px] font-mono-code text-slate-400 uppercase font-semibold">
              Base Asset (1st)
            </label>
            <select
              value={customBase}
              onChange={(e) => setCustomBase(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {assetMetrics.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} — {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex items-center justify-center pt-2 md:pt-4 text-slate-400 font-military font-bold text-xs">
            <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700">VS</span>
          </div>

          <div className="md:col-span-5 space-y-1">
            <label className="text-[10px] font-mono-code text-slate-400 uppercase font-semibold">
              Quote Asset (2nd)
            </label>
            <select
              value={customQuote}
              onChange={(e) => setCustomQuote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono-code text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {assetMetrics.map((a) => (
                <option key={a.symbol} value={a.symbol}>
                  {a.symbol} — {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Calculation Output Card */}
        {customPairResult && (
          <div className="mt-3 p-4 rounded-xl bg-slate-950/80 border border-cyan-500/40 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-4">
              <div className="text-center md:text-left">
                <span className="text-[11px] font-mono-code text-slate-400 uppercase block font-semibold">
                  Pair Result
                </span>
                <span className="text-xl font-military font-bold text-white tracking-wide">
                  {customPairResult.pair}
                </span>
                <span className="text-[11px] font-mono-code text-slate-400 block">
                  {customPairResult.baseName} vs {customPairResult.quoteName}
                </span>
              </div>

              <div className="h-10 w-px bg-slate-800 hidden sm:block" />

              <div>
                <span className="text-[10px] font-mono-code text-slate-400 uppercase block">
                  Relative Degree
                </span>
                <span
                  className={`inline-block px-2.5 py-1 rounded-lg text-xs font-mono-code font-bold uppercase border ${getBiasPillStyle(
                    customPairResult.biasLabel
                  )}`}
                >
                  {customPairResult.biasLabel}
                </span>
              </div>
            </div>

            {/* Percentage Bar & Numerical Bullishness */}
            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
              <div className="text-right">
                <div className="text-lg font-black font-mono-code text-cyan-300">
                  {customPairResult.bullishnessPct}% <span className="text-xs font-normal text-slate-400">Bullish</span>
                </div>
                <div className="text-[10px] font-mono-code text-slate-400">
                  Differential: {customPairResult.differentialScore > 0 ? `+${customPairResult.differentialScore}` : customPairResult.differentialScore} pts
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPairModal(customPairResult)}
                className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold transition cursor-pointer shrink-0"
              >
                Inspect Breakdown
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Controls: Categories, Search, Sort & Bias */}
      <div className="space-y-3">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
            {[
              { id: 'FOREX' as FilterView, label: 'Forex (28 G8 Pairs)', count: pairsByCategory.FOREX.length },
              { id: 'TOP_DIVERGENCES' as FilterView, label: '🔥 Top Divergences', count: topBullishPairs.length + topBearishPairs.length },
              { id: 'COMMODITIES' as FilterView, label: 'Commodities & Ratios', count: pairsByCategory.COMMODITIES.length },
              { id: 'INDICES' as FilterView, label: 'Stock Indices', count: pairsByCategory.INDICES.length },
              { id: 'CRYPTO' as FilterView, label: 'Crypto (CME)', count: pairsByCategory.CRYPTO.length },
              { id: 'ALL' as FilterView, label: 'All Pairs', count: allPairs.length },
            ].map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1 rounded ${
                      isActive ? 'bg-cyan-400/20 text-cyan-200' : 'bg-slate-850 text-slate-400'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search pair (e.g. EUR, JPY, Gold)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-code text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        </div>

        {/* Secondary Filter & Sort Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono-code text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase text-[10px]">Filter Degree:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'BULLISH_ONLY', label: 'Bullish Only' },
              { id: 'BEARISH_ONLY', label: 'Bearish Only' },
              { id: 'BALANCED_ONLY', label: 'Balanced Only' },
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setBiasFilter(b.id as any)}
                className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                  biasFilter === b.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase text-[10px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="LARGEST_DIVERGENCE">Largest Divergence (Absolute)</option>
              <option value="MOST_BULLISH">Most Bullish (Highest %)</option>
              <option value="MOST_BEARISH">Most Bearish (Lowest %)</option>
              <option value="ALPHABETICAL">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Pairs Grid */}
      {displayedPairs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
          <Scale className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No pairs match your criteria</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the search term or degree filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedPairs.map((p) => {
            const isBullish = p.bullishnessPct >= 53;
            const isBearish = p.bullishnessPct <= 47;
            const isBalanced = !isBullish && !isBearish;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPairModal(p)}
                className="bg-[#0b101b] hover:bg-[#0f1626] border border-slate-800/90 hover:border-cyan-500/50 rounded-2xl p-4 transition-all duration-150 cursor-pointer group shadow-lg flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Pair, Category, Degree Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition tracking-tight">
                          {p.pair}
                        </h4>
                        <span className="text-[9px] font-mono-code font-bold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
                        {p.baseName} / {p.quoteName}
                      </p>
                    </div>

                    <span
                      className={`text-[9px] font-mono-code font-bold px-2 py-0.5 rounded-md border uppercase shrink-0 ${getBiasPillStyle(
                        p.biasLabel
                      )}`}
                    >
                      {p.biasLabel}
                    </span>
                  </div>

                  {/* Percentage Bullishness Gauge Bar */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs font-mono-code">
                      <span className="text-slate-400 text-[10px] uppercase font-semibold">
                        COT Bullishness Index
                      </span>
                      <span
                        className={`text-sm font-black font-mono-code ${
                          isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        {p.bullishnessPct}%
                      </span>
                    </div>

                    {/* Visual Segmented Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden flex">
                      <div
                        style={{ width: `${p.bullishnessPct}%` }}
                        className={`h-full transition-all duration-300 ${
                          isBullish
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : isBearish
                            ? 'bg-gradient-to-r from-rose-500 to-red-500'
                            : 'bg-slate-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Comparative Single-Asset Strengths */}
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono-code">
                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-850">
                      <span className="text-slate-400 block font-semibold">{p.baseAsset} Score</span>
                      <span
                        className={`text-xs font-bold ${
                          p.baseMetric.strengthScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {p.baseMetric.strengthScore > 0
                          ? `+${p.baseMetric.strengthScore}`
                          : p.baseMetric.strengthScore}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Net: {p.baseMetric.netPctOI}% OI
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-850">
                      <span className="text-slate-400 block font-semibold">{p.quoteAsset} Score</span>
                      <span
                        className={`text-xs font-bold ${
                          p.quoteMetric.strengthScore >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {p.quoteMetric.strengthScore > 0
                          ? `+${p.quoteMetric.strengthScore}`
                          : p.quoteMetric.strengthScore}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">
                        Net: {p.quoteMetric.netPctOI}% OI
                      </span>
                    </div>
                  </div>

                  {/* Concise Thesis Line */}
                  <p className="mt-3 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {p.thesis}
                  </p>
                </div>

                {/* Footer Action */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono-code text-cyan-400 group-hover:text-cyan-300">
                  <span>
                    Diff: {p.differentialScore > 0 ? `+${p.differentialScore}` : p.differentialScore} pts
                  </span>
                  <span className="flex items-center gap-1 font-bold">
                    <span>Full Breakdown</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Pair Modal */}
      {selectedPairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0b101b] border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-military font-bold text-white tracking-wide">
                    {selectedPairModal.pair}
                  </h3>
                  <span
                    className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-md border uppercase ${getBiasPillStyle(
                      selectedPairModal.biasLabel
                    )}`}
                  >
                    {selectedPairModal.biasLabel}
                  </span>
                </div>
                <p className="text-xs font-mono-code text-slate-400 mt-1">
                  {selectedPairModal.baseName} vs {selectedPairModal.quoteName} · COT Institutional Differential
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPairModal(null)}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Bullishness Meter Gauge Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono-code text-slate-400 uppercase font-semibold block">
                  Directional Assessment
                </span>
                <span className="text-2xl font-black font-mono-code text-cyan-300">
                  {selectedPairModal.bullishnessPct}% <span className="text-xs font-normal text-slate-400">Bullish</span>
                </span>
                <div className="text-[11px] font-mono-code text-slate-400 mt-0.5">
                  Bearish Counter-Weight: {selectedPairModal.bearishnessPct}%
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase font-semibold block">
                  Net Divergence Score
                </span>
                <span
                  className={`text-xl font-black font-mono-code ${
                    selectedPairModal.differentialScore > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {selectedPairModal.differentialScore > 0
                    ? `+${selectedPairModal.differentialScore}`
                    : selectedPairModal.differentialScore}{' '}
                  <span className="text-xs font-normal text-slate-400">points</span>
                </span>
                <div className="text-[10px] font-mono-code text-slate-400">
                  Scale: -200 (Max Bearish) to +200 (Max Bullish)
                </div>
              </div>
            </div>

            {/* Side-by-Side Comparison Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-military font-bold text-slate-300 uppercase tracking-wide">
                Institutional Telemetry Breakdown
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono-code">
                {/* Base Asset Box */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white">{selectedPairModal.baseAsset}</span>
                    <span
                      className={`font-bold ${
                        selectedPairModal.baseMetric.strengthScore >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      Score: {selectedPairModal.baseMetric.strengthScore}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Non-Comm Net:</span>
                      <span className="font-bold">
                        {selectedPairModal.baseMetric.nonCommNet.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net % Open Interest:</span>
                      <span className="font-bold text-cyan-300">
                        {selectedPairModal.baseMetric.netPctOI}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Weekly Shift:</span>
                      <span className="font-bold">
                        {selectedPairModal.baseMetric.weeklyChangeNet > 0
                          ? `+${selectedPairModal.baseMetric.weeklyChangeNet.toLocaleString()}`
                          : selectedPairModal.baseMetric.weeklyChangeNet.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Open Interest:</span>
                      <span>{selectedPairModal.baseMetric.openInterest.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Quote Asset Box */}
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white">{selectedPairModal.quoteAsset}</span>
                    <span
                      className={`font-bold ${
                        selectedPairModal.quoteMetric.strengthScore >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      Score: {selectedPairModal.quoteMetric.strengthScore}
                    </span>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Non-Comm Net:</span>
                      <span className="font-bold">
                        {selectedPairModal.quoteMetric.nonCommNet.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net % Open Interest:</span>
                      <span className="font-bold text-cyan-300">
                        {selectedPairModal.quoteMetric.netPctOI}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Weekly Shift:</span>
                      <span className="font-bold">
                        {selectedPairModal.quoteMetric.weeklyChangeNet > 0
                          ? `+${selectedPairModal.quoteMetric.weeklyChangeNet.toLocaleString()}`
                          : selectedPairModal.quoteMetric.weeklyChangeNet.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Open Interest:</span>
                      <span>{selectedPairModal.quoteMetric.openInterest.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Research Thesis Narrative */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <span className="text-[10px] font-mono-code text-cyan-400 uppercase font-bold block">
                Institutional Positioning Thesis
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedPairModal.thesis}
              </p>

              {selectedPairModal.keyDrivers.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono-code text-slate-400 uppercase block">
                    Underlying Drivers:
                  </span>
                  <ul className="space-y-1">
                    {selectedPairModal.keyDrivers.map((d, i) => (
                      <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                        <span className="text-cyan-400">•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Close Action */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedPairModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-code font-bold transition cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
