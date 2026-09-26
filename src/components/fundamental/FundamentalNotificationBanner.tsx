import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  Gauge,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  Activity,
  Flame,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CurrencyCode, CurrencyScoreResult, IndicatorObservation, RetailPositioningRecord } from '../../types/fundamentalIndicatorTypes';
import {
  calculatePairDifferential,
  calculateCommodityFundamentalScore,
  calculateCurrencyScore,
  calculateLongTermPairRankings,
  PRIMARY_PAIR_MATRIX_20,
} from '../../utils/fundamentalCalculationEngine';
import { CURRENCY_METADATA, DEFAULT_CATEGORY_WEIGHTS } from '../../data/fundamentalRegistryData';
import {
  DEFAULT_OBSERVATIONS,
  DEFAULT_COT_RECORDS,
  DEFAULT_SENTIMENT_RECORDS,
  DEFAULT_INTEREST_RATES,
  DEFAULT_COMMODITY_OBSERVATIONS,
  DEFAULT_RETAIL_POSITIONING,
} from '../../data/defaultFundamentalObservations';

interface FundamentalNotificationBannerProps {
  currencyScores?: Record<CurrencyCode, CurrencyScoreResult>;
  onNavigateToFundamental?: (targetAsset?: string) => void;
}

export const FundamentalNotificationBanner: React.FC<FundamentalNotificationBannerProps> = ({
  currencyScores: propCurrencyScores,
  onNavigateToFundamental,
}) => {
  // Toggle state: click to reveal, click again to hide
  const [isRevealed, setIsRevealed] = useState<boolean>(false);
  const [localScores, setLocalScores] = useState<Record<CurrencyCode, CurrencyScoreResult> | null>(null);

  // Compute live scores from storage if not supplied from props, with live sync listeners
  useEffect(() => {
    const computeScores = () => {
      if (propCurrencyScores && Object.keys(propCurrencyScores).length > 0) {
        setLocalScores(propCurrencyScores);
        return;
      }

      try {
        const rawObs = localStorage.getItem('primepip_fundamental_observations_v2');
        const observations: IndicatorObservation[] = rawObs ? JSON.parse(rawObs) : DEFAULT_OBSERVATIONS;
        const rawWeights = localStorage.getItem('primepip_fundamental_weights_v2');
        const categoryWeights = rawWeights ? JSON.parse(rawWeights) : DEFAULT_CATEGORY_WEIGHTS;
        const rawRates = localStorage.getItem('primepip_fundamental_rates_v2');
        const interestRates = rawRates ? JSON.parse(rawRates) : DEFAULT_INTEREST_RATES;
        const rawCot = localStorage.getItem('primepip_fundamental_cot_v2');
        const cotRecords = rawCot ? JSON.parse(rawCot) : DEFAULT_COT_RECORDS;
        const rawSentiment = localStorage.getItem('primepip_fundamental_sentiment_v2');
        const sentimentRecords = rawSentiment ? JSON.parse(rawSentiment) : DEFAULT_SENTIMENT_RECORDS;
        const rawRetail = localStorage.getItem('primepip_fundamental_retail_v1');
        const retailPositioning: RetailPositioningRecord[] = rawRetail ? JSON.parse(rawRetail) : DEFAULT_RETAIL_POSITIONING;

        const currencies = Object.keys(CURRENCY_METADATA) as CurrencyCode[];
        const computed: Record<CurrencyCode, CurrencyScoreResult> = {} as any;
        currencies.forEach((code) => {
          computed[code] = calculateCurrencyScore(
            code,
            observations,
            categoryWeights,
            cotRecords,
            sentimentRecords,
            interestRates,
            retailPositioning
          );
        });
        setLocalScores(computed);
      } catch {
        // Fallback
      }
    };

    computeScores();

    const handleDataUpdate = () => computeScores();
    window.addEventListener('primepipfx_fundamental_data_updated', handleDataUpdate);
    window.addEventListener('storage', handleDataUpdate);

    return () => {
      window.removeEventListener('primepipfx_fundamental_data_updated', handleDataUpdate);
      window.removeEventListener('storage', handleDataUpdate);
    };
  }, [propCurrencyScores]);

  const activeCurrencyScores = propCurrencyScores && Object.keys(propCurrencyScores).length > 0
    ? propCurrencyScores
    : localScores || ({} as Record<CurrencyCode, CurrencyScoreResult>);

  // Compute live long-term ranked pairs
  const rankedData = useMemo(() => {
    const list: Array<{
      pair: string;
      baseCurrency: string;
      quoteCurrency: string;
      score: number;
      strengthPercent: number;
      isBullish: boolean;
      isBearish: boolean;
      bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
      biasLabel: string;
      rationale: string;
      actionTag: 'BUY' | 'SELL' | 'HOLD';
      horizon: string;
    }> = [];

    // Use 20 canonical FX pairs
    for (const [base, quote] of PRIMARY_PAIR_MATRIX_20) {
      const diffResult = calculatePairDifferential(base, quote, activeCurrencyScores);
      const score = diffResult.differential;
      const isBullish = score > 0;
      const isBearish = score < 0;
      const strengthPercent = Math.min(100, Math.max(50, Math.round(50 + Math.abs(score) / 2)));

      let bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' = 'NEUTRAL';
      let actionTag: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

      if (score >= 25) {
        bias = 'STRONG_BULLISH';
        actionTag = 'BUY';
      } else if (score >= 10) {
        bias = 'BULLISH';
        actionTag = 'BUY';
      } else if (score <= -25) {
        bias = 'STRONG_BEARISH';
        actionTag = 'SELL';
      } else if (score <= -10) {
        bias = 'BEARISH';
        actionTag = 'SELL';
      } else if (score > 0) {
        bias = 'BULLISH';
        actionTag = 'BUY';
      } else if (score < 0) {
        bias = 'BEARISH';
        actionTag = 'SELL';
      }

      const rationale = score >= 12
        ? `Long-term macroeconomic edge favors ${base} yield differentials, terms of trade & structural positioning over ${quote}.`
        : score <= -12
        ? `Structural headwind: ${quote} yields and monetary momentum significantly outpace ${base}.`
        : `Balanced structural macroeconomic equilibrium between ${base} and ${quote}.`;

      list.push({
        pair: `${base}/${quote}`,
        baseCurrency: base,
        quoteCurrency: quote,
        score,
        strengthPercent,
        isBullish,
        isBearish,
        bias,
        biasLabel: bias.replace('_', ' '),
        rationale,
        actionTag,
        horizon: 'Long-Term Structural (Macro + COT)',
      });
    }

    // Add Key Commodities (XAU/USD, XAG/USD, US Oil)
    for (const comm of DEFAULT_COMMODITY_OBSERVATIONS) {
      const commCalc = calculateCommodityFundamentalScore(comm);
      const score = commCalc.score;
      const isBullish = score > 0;
      const isBearish = score < 0;
      const strengthPercent = Math.min(100, Math.max(50, Math.round(50 + Math.abs(score) / 2)));
      const assetTicker = comm.symbol === 'GOLD' ? 'XAU/USD' : comm.symbol === 'SILVER' ? 'XAG/USD' : 'US Oil';
      const actionTag: 'BUY' | 'SELL' | 'HOLD' = score > 0 ? 'BUY' : score < 0 ? 'SELL' : 'HOLD';

      list.push({
        pair: assetTicker,
        baseCurrency: comm.symbol,
        quoteCurrency: 'USD',
        score,
        strengthPercent,
        isBullish,
        isBearish,
        bias: score >= 20 ? 'STRONG_BULLISH' : score <= -20 ? 'STRONG_BEARISH' : score > 0 ? 'BULLISH' : 'BEARISH',
        biasLabel: score >= 20 ? 'STRONG BULLISH' : score <= -20 ? 'STRONG BEARISH' : score > 0 ? 'BULLISH' : 'BEARISH',
        rationale: typeof commCalc.drivers[0] === 'string' ? commCalc.drivers[0] : (commCalc.drivers[0]?.label || 'Commodity macro yield & supply/demand driver'),
        actionTag,
        horizon: 'Long-Term Structural',
      });
    }

    // Sort by score descending for Bullish, ascending for Bearish
    const bullishSorted = [...list].filter((i) => i.score > 0).sort((a, b) => b.score - a.score);
    const bearishSorted = [...list].filter((i) => i.score < 0).sort((a, b) => a.score - b.score);

    return {
      all: list,
      topBullish: bullishSorted.slice(0, 4),
      topBearish: bearishSorted.slice(0, 4),
      bestBullish: bullishSorted[0] || list[0],
      bestBearish: bearishSorted[0] || list[list.length - 1],
    };
  }, [activeCurrencyScores]);

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const handleSelectAsset = (asset: string) => {
    if (onNavigateToFundamental) {
      onNavigateToFundamental(asset);
    }
  };

  return (
    <div className="w-full mb-4">
      {/* ─────────────────────────────────────────────────────────────────
          FUNDAMENTAL SURPRISE NOTIFICATION HEADER / TOGGLE BAR
          Click to reveal / Click again to hide
          ───────────────────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsRevealed(!isRevealed)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsRevealed(!isRevealed);
          }
        }}
        aria-expanded={isRevealed}
        className={`w-full p-2.5 sm:p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer group relative overflow-hidden select-none ${
          isRevealed
            ? 'bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-cyan-400 shadow-xl shadow-cyan-950/50'
            : 'bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950 border-cyan-500/35 hover:border-cyan-400 shadow-lg shadow-cyan-950/20'
        }`}
      >
        {/* Top Iridescent Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-rose-400 opacity-90" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Left Title Block with Surprise Notification Icon */}
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                  isRevealed
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 scale-105'
                    : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 group-hover:scale-105'
                }`}
              >
                <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-slate-950 animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 text-amber-400 animate-bounce" />
                  <span>FUNDAMENTAL SURPRISE</span>
                </span>
                <span className="text-[10px] font-mono-code text-slate-400 hidden xs:inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span>{todayStr} • Institutional Signal</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm font-military font-bold text-slate-100 tracking-wide mt-0.5 group-hover:text-cyan-200 transition-colors">
                Top Long-Term Pairs (Bullish Buy / Bearish Sell)
              </p>
            </div>
          </div>

          {/* Right Highlights Preview & Reveal/Hide Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2 text-xs font-mono-code">
              {rankedData.bestBullish && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-bold">{rankedData.bestBullish.pair}</span>
                  <span className="text-[10px] font-bold text-emerald-400">
                    +{rankedData.bestBullish.score}
                  </span>
                </div>
              )}

              {rankedData.bestBearish && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-bold">{rankedData.bestBearish.pair}</span>
                  <span className="text-[10px] font-bold text-rose-400">
                    {rankedData.bestBearish.score}
                  </span>
                </div>
              )}
            </div>

            {/* Click to Reveal / Click to Hide Toggle Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-military font-bold border transition-all cursor-pointer shrink-0 ${
                isRevealed
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-xs'
                  : 'bg-slate-800/80 text-cyan-400 border-slate-700 hover:border-cyan-400 group-hover:bg-slate-800'
              }`}
            >
              {isRevealed ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>HIDE SURPRISE</span>
                  <ChevronUp className="w-3.5 h-3.5 text-cyan-300" />
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>REVEAL SURPRISE</span>
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          EXPANDABLE INLINE DASHBOARD CONTENT
          Reveals top long-term Bullish (BUY) pairs and Bearish (SELL) pairs
          ───────────────────────────────────────────────────────────────── */}
      {isRevealed && (
        <div className="mt-2.5 rounded-2xl bg-slate-950/95 border border-cyan-500/35 p-3.5 sm:p-5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200">
          {/* Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800/80 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-military font-bold tracking-wider text-cyan-300 uppercase">
                  FUNDAMENTAL SURPRISE • INSTITUTIONAL POSITIONING MATRIX
                </span>
                <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  REAL-TIME MACRO
                </span>
              </div>
              <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">
                Top rated long-term fundamental pairs ranked by monetary policy, sovereign yields, inflation, growth, and COT positioning.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsRevealed(false)}
              className="self-end sm:self-center px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-mono-code border border-slate-800 transition flex items-center gap-1 cursor-pointer"
            >
              <EyeOff className="w-3 h-3" />
              <span>Hide Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ─────────────────────────────────────────────────────────────
                1. TOP LONG-TERM BULLISH (BUY) POSITIONS
                ───────────────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                      ▲
                    </div>
                    <div>
                      <h4 className="font-military font-bold text-xs tracking-wider text-emerald-400 uppercase">
                        TOP BULLISH (BUY) PAIRS
                      </h4>
                      <p className="text-[10px] font-mono-code text-emerald-300/70">
                        Highest Institutional Long Differential
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    LONG BIAS
                  </span>
                </div>

                <div className="space-y-2">
                  {rankedData.topBullish.map((item, idx) => (
                    <div
                      key={item.pair}
                      onClick={() => handleSelectAsset(item.baseCurrency || item.pair)}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 hover:border-emerald-400 hover:bg-emerald-950/25 transition-all cursor-pointer group flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="font-mono-code text-xs font-bold text-slate-500 pt-0.5">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-military font-bold text-sm text-slate-100 group-hover:text-emerald-300 transition-colors">
                              {item.pair}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-military font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                              BUY
                            </span>
                            <span className="text-[10px] font-mono-code text-slate-400">
                              {item.strengthPercent}% Strength
                            </span>
                          </div>
                          <p className="text-[11px] font-mono-code text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.rationale}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-military font-bold text-emerald-400">
                          +{item.score}
                        </span>
                        <div className="text-[9px] font-mono-code text-slate-500">DIFF SCORE</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-mono-code text-emerald-300/80">
                <span>Confidence: High Structural Support</span>
                <span className="text-slate-400">Click any pair to inspect</span>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                2. TOP LONG-TERM BEARISH (SELL) POSITIONS
                ───────────────────────────────────────────────────────────── */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/10 p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-rose-500/20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-xs">
                      ▼
                    </div>
                    <div>
                      <h4 className="font-military font-bold text-xs tracking-wider text-rose-400 uppercase">
                        TOP BEARISH (SELL) PAIRS
                      </h4>
                      <p className="text-[10px] font-mono-code text-rose-300/70">
                        Highest Institutional Short Differential
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                    SHORT BIAS
                  </span>
                </div>

                <div className="space-y-2">
                  {rankedData.topBearish.map((item, idx) => (
                    <div
                      key={item.pair}
                      onClick={() => handleSelectAsset(item.baseCurrency || item.pair)}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/20 hover:border-rose-400 hover:bg-rose-950/25 transition-all cursor-pointer group flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="font-mono-code text-xs font-bold text-slate-500 pt-0.5">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-military font-bold text-sm text-slate-100 group-hover:text-rose-300 transition-colors">
                              {item.pair}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-military font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                              SELL
                            </span>
                            <span className="text-[10px] font-mono-code text-slate-400">
                              {item.strengthPercent}% Pressure
                            </span>
                          </div>
                          <p className="text-[11px] font-mono-code text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.rationale}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-military font-bold text-rose-400">
                          {item.score}
                        </span>
                        <div className="text-[9px] font-mono-code text-slate-500">DIFF SCORE</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-rose-500/20 flex items-center justify-between text-[11px] font-mono-code text-rose-300/80">
                <span>Confidence: Structural Macro Deterioration</span>
                <span className="text-slate-400">Click any pair to inspect</span>
              </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono-code text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full 11-asset coverage with real multi-pillar econometric aggregation</span>
            </div>

            <button
              type="button"
              onClick={() => handleSelectAsset('GLOBAL')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-military font-bold text-xs tracking-wider uppercase transition shadow-md shadow-cyan-500/20 flex items-center gap-2 cursor-pointer"
            >
              <span>OPEN FULL FUNDAMENTAL WORKSPACE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
