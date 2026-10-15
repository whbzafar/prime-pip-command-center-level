import React, { useState, useMemo } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Info,
  Layers,
  AlertTriangle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { MarketCategory, CATEGORIES } from '../../config/cotConfig';
import { CotMarketSummary } from '../../types/cotTypes';

interface CotMarketListProps {
  summaries: CotMarketSummary[];
  selectedCategory: MarketCategory;
  onSelectCategory: (cat: MarketCategory) => void;
  onSelectMarket: (summary: CotMarketSummary) => void;
  isLoading: boolean;
}

export const CotMarketList: React.FC<CotMarketListProps> = ({
  summaries,
  selectedCategory,
  onSelectCategory,
  onSelectMarket,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter summaries by selected category and search term
  const filteredSummaries = useMemo(() => {
    return summaries.filter((s) => {
      const matchesCategory = s.market.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.market.name.toLowerCase().includes(term) ||
        s.market.symbolHint.toLowerCase().includes(term) ||
        s.market.code.toLowerCase().includes(term) ||
        s.market.exchange.toLowerCase().includes(term)
      );
    });
  }, [summaries, selectedCategory, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
          {CATEGORIES.map((cat) => {
            const count = summaries.filter((s) => s.market.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1 rounded ${isActive ? 'bg-cyan-400/20 text-cyan-200' : 'bg-slate-850 text-slate-400'}`}>
                  {count}
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
            placeholder="Search market or symbol..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-code text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>
      </div>

      {/* Special Crypto Notice */}
      {selectedCategory === 'Crypto' && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-start gap-2.5 text-xs text-purple-200">
          <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold text-purple-300 font-mono-code block">
              CME Regulated Futures Positioning (Not Spot Exchange Data)
            </strong>
            <p className="text-[11px] text-slate-300 font-sans mt-0.5">
              Reflects institutional positioning on the Chicago Mercantile Exchange (CME). Crypto futures have a shorter historical depth compared to traditional macro assets.
            </p>
          </div>
        </div>
      )}

      {/* Skeleton Loading State */}
      {isLoading && summaries.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-slate-900/50 border border-slate-800 animate-pulse p-4 space-y-3"
            >
              <div className="h-4 bg-slate-800 rounded w-2/3" />
              <div className="h-6 bg-slate-800 rounded w-1/2" />
              <div className="h-4 bg-slate-800 rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {/* Market Cards Grid */}
      {!isLoading && filteredSummaries.length === 0 && (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
          <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-300">No markets found</p>
          <p className="text-xs text-slate-400 mt-1">Try refining your search filter.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSummaries.map((s) => {
          const { market, latest } = s;
          const isNetBullish = latest.nonCommNet > 0;
          const isNetBearish = latest.nonCommNet < 0;
          const isNetChangeBullish = latest.changeNonCommNet > 0;
          const isNetChangeBearish = latest.changeNonCommNet < 0;

          return (
            <div
              key={market.code}
              onClick={() => onSelectMarket(s)}
              className="bg-[#0b101b] hover:bg-[#0f1626] border border-slate-800/90 hover:border-cyan-500/50 rounded-2xl p-4 transition-all duration-150 cursor-pointer group shadow-lg flex flex-col justify-between"
            >
              {/* Card Header: Market Name, Exchange & Code */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition tracking-tight">
                      {market.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono-code text-slate-400">
                      <span className="text-cyan-400 font-semibold">{market.symbolHint}</span>
                      <span>•</span>
                      <span>{market.exchange}</span>
                      <span>•</span>
                      <span className="text-slate-400">#{market.code}</span>
                    </div>
                  </div>

                  <span className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-cyan-500/40 text-slate-400 group-hover:text-cyan-300 transition">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                {/* Net Positioning Number */}
                <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono-code text-slate-400 block font-semibold">
                      Non-Commercial Net
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span
                        className={`text-lg font-black font-mono-code tracking-tight ${
                          isNetBullish
                            ? 'text-emerald-400'
                            : isNetBearish
                            ? 'text-rose-400'
                            : 'text-slate-200'
                        }`}
                      >
                        {latest.nonCommNet > 0 ? `+${latest.nonCommNet.toLocaleString()}` : latest.nonCommNet.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-mono-code text-slate-400">contracts</span>
                    </div>
                  </div>

                  {/* Weekly Net Change Pill */}
                  <div
                    className={`px-2 py-1 rounded-lg text-xs font-mono-code font-bold flex items-center gap-1 border ${
                      isNetChangeBullish
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : isNetChangeBearish
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    {isNetChangeBullish ? (
                      <TrendingUp className="w-3.5 h-3.5" />
                    ) : isNetChangeBearish ? (
                      <TrendingDown className="w-3.5 h-3.5" />
                    ) : null}
                    <span>
                      {latest.changeNonCommNet > 0
                        ? `+${latest.changeNonCommNet.toLocaleString()}`
                        : latest.changeNonCommNet.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Specs: Long, Short, Open Interest */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-[10px] font-mono-code text-slate-400">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Longs</span>
                  <span className="text-emerald-400 font-bold">{latest.nonCommLong.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-400 block">
                    {latest.changeNonCommLong >= 0 ? `+${latest.changeNonCommLong}` : latest.changeNonCommLong}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Shorts</span>
                  <span className="text-rose-400 font-bold">{latest.nonCommShort.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-400 block">
                    {latest.changeNonCommShort >= 0 ? `+${latest.changeNonCommShort}` : latest.changeNonCommShort}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase">Open Interest</span>
                  <span className="text-slate-200 font-bold">{latest.openInterest.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-400 block">
                    {latest.changeOpenInterest >= 0 ? `+${latest.changeOpenInterest}` : latest.changeOpenInterest}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
