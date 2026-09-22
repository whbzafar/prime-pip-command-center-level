import React from 'react';
import {
  CurrencyCode,
  CurrencyScoreResult,
  PairDifferentialResult,
} from '../../types/fundamentalIndicatorTypes';
import { CURRENCIES, CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Activity,
  Gem,
  Flame,
  Layers,
  Calendar,
  Users,
  Compass,
  FileText,
} from 'lucide-react';

interface OverviewViewProps {
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  pairDifferentials?: PairDifferentialResult[];
  onSelectCurrency: (curr: CurrencyCode) => void;
  onNavigateTab: (tab: any) => void;
  onOpenPairModal?: (pair: PairDifferentialResult) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  currencyScores,
  pairDifferentials = [],
  onSelectCurrency,
  onNavigateTab,
  onOpenPairModal,
}) => {
  // Sorted currencies
  const sortedCurrencies = [...CURRENCIES].sort((a, b) => {
    const scoreA = currencyScores[a.code]?.score ?? 0;
    const scoreB = currencyScores[b.code]?.score ?? 0;
    return scoreB - scoreA;
  });

  const safePairs = Array.isArray(pairDifferentials) ? pairDifferentials : [];

  // Top bullish and bearish pairs
  const topBullish = [...safePairs]
    .filter((p) => p.differential > 0)
    .sort((a, b) => b.differential - a.differential)
    .slice(0, 3);

  const topBearish = [...safePairs]
    .filter((p) => p.differential < 0)
    .sort((a, b) => a.differential - b.differential)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Executive Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono-code text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
              <span>DETERMINISTIC MACROECONOMIC ENGINE • INSTITUTIONAL GRADE</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wide">
              Global Fundamental Landscape & Currency Relative Strength
            </h2>
            <p className="text-xs font-mono-code text-slate-400 max-w-3xl">
              100% verified economic releases with standardized surprise z-scores, weighted category aggregation, and cross-currency differentials.
            </p>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateTab('CURRENCIES')}
              className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-blue-500/30 text-xs font-military font-bold transition cursor-pointer"
            >
              8 Currencies →
            </button>
            <button
              onClick={() => onNavigateTab('PAIR_SCANNER')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-military font-bold transition cursor-pointer"
            >
              Pair Scanner →
            </button>
            <button
              onClick={() => onNavigateTab('COMMODITIES')}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-military font-bold transition cursor-pointer"
            >
              Commodities →
            </button>
          </div>
        </div>
      </div>

      {/* 8 Currency Strength Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-military font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>8-Currency Relative Fundamental Ranking</span>
          </h3>
          <span className="text-xs font-mono-code text-slate-400">
            Score Scale: -100 (Extremely Weak) to +100 (Extremely Strong)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sortedCurrencies.map((c, idx) => {
            const res = currencyScores[c.code];
            const eligible = (res?.dataCoveragePercent ?? 0) >= 75;
            const score = res?.score ?? 0;
            const eligibleCurrencies = sortedCurrencies.filter((code) => (currencyScores[code.code]?.dataCoveragePercent ?? 0) >= 75);
            const isTop = eligible && eligibleCurrencies.length > 0 && c.code === eligibleCurrencies[0].code;
            const isBottom = eligible && eligibleCurrencies.length > 0 && c.code === eligibleCurrencies[eligibleCurrencies.length - 1].code;

            return (
              <div
                key={c.code}
                onClick={() => {
                  onSelectCurrency(c.code);
                  onNavigateTab('CURRENCIES');
                }}
                className={`p-4 rounded-xl border transition cursor-pointer group ${
                  score > 15
                    ? 'bg-slate-900/60 border-emerald-500/30 hover:border-emerald-500/60'
                    : score < -15
                    ? 'bg-slate-900/60 border-rose-500/30 hover:border-rose-500/60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{c.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-military font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition">
                          {c.code}
                        </span>
                        {isTop && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono-code font-bold">
                            LEADER
                          </span>
                        )}
                        {isBottom && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-mono-code font-bold">
                            LAGGARD
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono-code text-slate-500 block truncate">
                        {c.centralBankShort}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xl font-military font-bold ${
                        score > 15
                          ? 'text-emerald-400'
                          : score < -15
                          ? 'text-rose-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {eligible ? (score > 0 ? `+${score}` : score) : '—'}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 space-y-1 text-[11px] font-mono-code">
                  <div className="flex justify-between text-slate-400">
                    <span>Policy Rate:</span>
                    <span className="text-slate-200 font-semibold">{eligible && res?.interestRateLevel !== undefined ? `${res.interestRateLevel.toFixed(2)}%` : '—'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>10Y Bond Yield:</span>
                    <span className="text-slate-200 font-semibold">{eligible && res?.tenYearBondYield !== undefined ? `${res.tenYearBondYield.toFixed(2)}%` : '—'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Assessment:</span>
                    <span
                      className={`font-semibold ${
                        score > 15
                          ? 'text-emerald-300'
                          : score < -15
                          ? 'text-rose-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {eligible ? (res?.assessmentLabel || 'NEUTRAL') : 'INSUFFICIENT DATA'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Relative Differentials Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bullish Opportunities */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-xs font-military font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>Top Relative Bullish Differentials</span>
            </h4>
            <span className="text-[10px] font-mono-code text-slate-400">Base Strong vs Quote Weak</span>
          </div>

          <div className="space-y-2">
            {topBullish.map((p) => (
              <div
                key={p.pair}
                onClick={() => onOpenPairModal?.(p)}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-military font-bold text-sm text-slate-100">{p.pair}</span>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      {p.baseCurrency} ({p.baseScore > 0 ? `+${p.baseScore}` : p.baseScore}) vs {p.quoteCurrency} ({p.quoteScore > 0 ? `+${p.quoteScore}` : p.quoteScore})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-code text-emerald-400 block mt-0.5">
                    {p.biasLabel}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-lg font-military font-bold text-emerald-400">
                    +{p.differential}
                  </span>
                  <span className="text-[9px] font-mono-code text-slate-500 block">Diff Points</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bearish Opportunities */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <h4 className="text-xs font-military font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" />
              <span>Top Relative Bearish Differentials</span>
            </h4>
            <span className="text-[10px] font-mono-code text-slate-400">Base Weak vs Quote Strong</span>
          </div>

          <div className="space-y-2">
            {topBearish.map((p) => (
              <div
                key={p.pair}
                onClick={() => onOpenPairModal?.(p)}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-rose-500/40 transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-military font-bold text-sm text-slate-100">{p.pair}</span>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      {p.baseCurrency} ({p.baseScore > 0 ? `+${p.baseScore}` : p.baseScore}) vs {p.quoteCurrency} ({p.quoteScore > 0 ? `+${p.quoteScore}` : p.quoteScore})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono-code text-rose-400 block mt-0.5">
                    {p.biasLabel}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-lg font-military font-bold text-rose-400">
                    {p.differential}
                  </span>
                  <span className="text-[9px] font-mono-code text-slate-500 block">Diff Points</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Direct Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigateTab('ECONOMIC_DATA')}
          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer space-y-1 text-left"
        >
          <Calendar className="w-5 h-5 text-cyan-400" />
          <h4 className="font-military font-bold text-xs text-slate-100">Economic Data</h4>
          <p className="text-[10px] font-mono-code text-slate-400">
            Master releases table with surprise & change
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('COT_REPORT')}
          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer space-y-1 text-left"
        >
          <Activity className="w-5 h-5 text-blue-400" />
          <h4 className="font-military font-bold text-xs text-slate-100">COT Report</h4>
          <p className="text-[10px] font-mono-code text-slate-400">
            TradingView institutional futures flows
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('RATES_YIELDS')}
          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer space-y-1 text-left"
        >
          <Compass className="w-5 h-5 text-emerald-400" />
          <h4 className="font-military font-bold text-xs text-slate-100">Rates & Yields</h4>
          <p className="text-[10px] font-mono-code text-slate-400">
            Sovereign curves & 28-pair rate spreads
          </p>
        </div>

        <div
          onClick={() => onNavigateTab('METHODOLOGY')}
          className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer space-y-1 text-left"
        >
          <FileText className="w-5 h-5 text-purple-400" />
          <h4 className="font-military font-bold text-xs text-slate-100">Methodology</h4>
          <p className="text-[10px] font-mono-code text-slate-400">
            13-step deterministic mathematical audit
          </p>
        </div>
      </div>
    </div>
  );
};
