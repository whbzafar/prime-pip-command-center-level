import React from 'react';
import {
  CurrencyCode,
  CurrencyScoreResult,
  PairDifferentialResult,
  IndicatorCategory,
} from '../../types/fundamentalIndicatorTypes';
import { CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import {
  X,
  Sparkles,
  Scale,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
} from 'lucide-react';

interface PairDeepDiveModalProps {
  pairResult: PairDifferentialResult;
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  onClose: () => void;
  onRequestAiThesis: (pair: string, diff: PairDifferentialResult) => void;
  onSelectCurrency: (curr: CurrencyCode) => void;
}

const CATEGORY_NAMES: Record<IndicatorCategory, string> = {
  MONETARY_POLICY: 'Monetary Policy',
  INFLATION: 'Inflation & Prices',
  GROWTH: 'Economic Growth (GDP)',
  EMPLOYMENT: 'Labor & Employment',
  RATES_YIELDS: 'Bond Yields & Spreads',
  BUSINESS_ACTIVITY: 'Business PMI Activity',
  CONSUMER: 'Consumer & Retail',
  TRADE_EXTERNAL: 'Trade & Current Account',
  COT_POSITIONING: 'COT Market Positioning',
  SENTIMENT: 'Market Sentiment',
  HOUSING: 'Housing & Construction',
  FISCAL: 'Fiscal & Sovereign Debt',
  COMMODITY_DRIVER: 'Commodity Driver',
};

export const PairDeepDiveModal: React.FC<PairDeepDiveModalProps> = ({
  pairResult,
  currencyScores,
  onClose,
  onRequestAiThesis,
  onSelectCurrency,
}) => {
  const baseCode = pairResult.baseCurrency;
  const quoteCode = pairResult.quoteCurrency;
  const baseScore = currencyScores[baseCode];
  const quoteScore = currencyScores[quoteCode];
  const baseMeta = CURRENCY_METADATA[baseCode];
  const quoteMeta = CURRENCY_METADATA[quoteCode];

  // Category comparisons
  const categories: IndicatorCategory[] = [
    'MONETARY_POLICY',
    'INFLATION',
    'GROWTH',
    'EMPLOYMENT',
    'RATES_YIELDS',
    'BUSINESS_ACTIVITY',
    'CONSUMER',
    'TRADE_EXTERNAL',
    'COT_POSITIONING',
    'SENTIMENT',
  ];

  const categoryDeltas = categories.map((cat) => {
    const b = baseScore?.categoryScores?.[cat]?.score ?? 0;
    const q = quoteScore?.categoryScores?.[cat]?.score ?? 0;
    const delta = b - q;
    return {
      cat,
      name: CATEGORY_NAMES[cat] || cat,
      baseScore: b,
      quoteScore: q,
      delta,
      favors: delta > 0 ? baseCode : delta < 0 ? quoteCode : 'NEUTRAL',
    };
  });

  const getBiasBadge = (bias: PairDifferentialResult['bias']) => {
    switch (bias) {
      case 'STRONG_BULLISH':
        return (
          <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono-code font-bold inline-flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4" />
            <span>STRONG RELATIVE BULLISH ({pairResult.pair})</span>
          </span>
        );
      case 'BULLISH':
        return (
          <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono-code font-bold inline-flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4" />
            <span>RELATIVE BULLISH ({pairResult.pair})</span>
          </span>
        );
      case 'STRONG_BEARISH':
        return (
          <span className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono-code font-bold inline-flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4" />
            <span>STRONG RELATIVE BEARISH ({pairResult.pair})</span>
          </span>
        );
      case 'BEARISH':
        return (
          <span className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-mono-code font-bold inline-flex items-center gap-1.5">
            <ArrowDownRight className="w-4 h-4" />
            <span>RELATIVE BEARISH ({pairResult.pair})</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono-code font-bold">
            NEUTRAL / BALANCED SPREAD
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0a0f1d] border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 font-military font-bold text-lg">
              {baseMeta?.flag}{quoteMeta?.flag}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-military font-bold tracking-wide">
                  {pairResult.pair} Fundamental Deep Dive
                </h2>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono-code">
                  Base: {baseCode} • Quote: {quoteCode}
                </span>
              </div>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Deterministic Relative Valuation • Macro Spread Calculation • Divergence Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRequestAiThesis(pairResult.pair, pairResult)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI MACRO THESIS</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Section 1: Summary Calculation & Bias */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono-code uppercase text-slate-400">
                Deterministic Differential Formula
              </span>
              <div className="text-base font-mono-code font-bold flex items-center gap-2">
                <span className="text-cyan-400">{baseCode}: {baseScore?.score > 0 ? `+${baseScore?.score}` : baseScore?.score}</span>
                <span className="text-slate-500">minus</span>
                <span className="text-amber-400">{quoteCode}: {quoteScore?.score > 0 ? `+${quoteScore?.score}` : quoteScore?.score}</span>
                <span className="text-slate-500">=</span>
                <span
                  className={`text-xl font-military ${
                    pairResult.differential > 0 ? 'text-emerald-400' : pairResult.differential < 0 ? 'text-rose-400' : 'text-slate-300'
                  }`}
                >
                  {pairResult.differential > 0 ? `+${pairResult.differential}` : pairResult.differential} Net Points
                </span>
              </div>
            </div>

            <div>{getBiasBadge(pairResult.bias)}</div>
          </div>
        </div>

        {/* Section 2: Side-by-Side Currency Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Base Currency Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-500/30 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{baseMeta?.flag}</span>
                <div>
                  <h4 className="font-military font-bold text-sm text-slate-100">
                    {baseCode} Composite ({baseMeta?.name})
                  </h4>
                  <span className="text-[10px] font-mono-code text-slate-400">
                    Central Bank: {baseMeta?.centralBankShort}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Score</span>
                <span
                  className={`text-xl font-military font-bold ${
                    (baseScore?.score ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(baseScore?.score ?? 0) > 0 ? `+${baseScore?.score}` : baseScore?.score}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Policy Rate:</span>
                <span className="text-slate-200 font-bold">{baseScore?.interestRateLevel?.toFixed(2) ?? '—'}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">10Y Benchmark Yield:</span>
                <span className="text-slate-200 font-bold">{baseScore?.tenYearBondYield?.toFixed(2) ?? '—'}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Data Coverage:</span>
                <span className="text-slate-200 font-bold">{baseScore?.dataCoveragePercent ?? 100}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Assessment:</span>
                <span className="text-cyan-300 font-bold">{baseScore?.assessmentLabel}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onSelectCurrency(baseCode);
                onClose();
              }}
              className="w-full py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-blue-500/30 text-xs font-mono-code font-bold transition cursor-pointer"
            >
              Open {baseCode} Workspace →
            </button>
          </div>

          {/* Quote Currency Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{quoteMeta?.flag}</span>
                <div>
                  <h4 className="font-military font-bold text-sm text-slate-100">
                    {quoteCode} Composite ({quoteMeta?.name})
                  </h4>
                  <span className="text-[10px] font-mono-code text-slate-400">
                    Central Bank: {quoteMeta?.centralBankShort}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Score</span>
                <span
                  className={`text-xl font-military font-bold ${
                    (quoteScore?.score ?? 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {(quoteScore?.score ?? 0) > 0 ? `+${quoteScore?.score}` : quoteScore?.score}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Policy Rate:</span>
                <span className="text-slate-200 font-bold">{quoteScore?.interestRateLevel?.toFixed(2) ?? '—'}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">10Y Benchmark Yield:</span>
                <span className="text-slate-200 font-bold">{quoteScore?.tenYearBondYield?.toFixed(2) ?? '—'}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Data Coverage:</span>
                <span className="text-slate-200 font-bold">{quoteScore?.dataCoveragePercent ?? 100}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Assessment:</span>
                <span className="text-amber-300 font-bold">{quoteScore?.assessmentLabel}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onSelectCurrency(quoteCode);
                onClose();
              }}
              className="w-full py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono-code font-bold transition cursor-pointer"
            >
              Open {quoteCode} Workspace →
            </button>
          </div>
        </div>

        {/* Section 3: Conflict Analysis (Section 39 of Master Prompt) */}
        {pairResult.conflicts && pairResult.conflicts.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-military font-bold">
              <AlertTriangle className="w-4 h-4" />
              <span>CONFLICTING SIGNALS DETECTED (Do Not Ignore)</span>
            </div>
            <ul className="text-xs font-mono-code text-amber-200/90 space-y-1 list-disc list-inside">
              {pairResult.conflicts.map((conf, idx) => (
                <li key={idx}>{conf}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Section 4: "Why?" Detailed Category Breakdown Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Exact Factor Breakdown ("Why?" Transparent Calculation)</span>
            </h4>
            <span className="text-[10px] font-mono-code text-slate-400">
              Positive delta favors {baseCode} • Negative delta favors {quoteCode}
            </span>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden text-xs font-mono-code">
            <div className="grid grid-cols-12 bg-slate-900 p-2.5 font-bold text-slate-400 uppercase text-[10px]">
              <span className="col-span-4">Macro Category</span>
              <span className="col-span-2 text-right">{baseCode} Score</span>
              <span className="col-span-2 text-right">{quoteCode} Score</span>
              <span className="col-span-2 text-right">Delta</span>
              <span className="col-span-2 text-center">Advantage</span>
            </div>

            <div className="divide-y divide-slate-800/80 bg-slate-950/40">
              {categoryDeltas.map((item) => (
                <div key={item.cat} className="grid grid-cols-12 p-2.5 items-center hover:bg-slate-900/40 transition">
                  <span className="col-span-4 text-slate-200 font-semibold">{item.name}</span>
                  <span className="col-span-2 text-right text-cyan-400">
                    {item.baseScore > 0 ? `+${item.baseScore}` : item.baseScore}
                  </span>
                  <span className="col-span-2 text-right text-amber-400">
                    {item.quoteScore > 0 ? `+${item.quoteScore}` : item.quoteScore}
                  </span>
                  <span
                    className={`col-span-2 text-right font-bold ${
                      item.delta > 0 ? 'text-emerald-400' : item.delta < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {item.delta > 0 ? `+${item.delta}` : item.delta}
                  </span>
                  <span className="col-span-2 text-center">
                    {item.favors === 'NEUTRAL' ? (
                      <span className="text-slate-500 text-[10px]">Neutral</span>
                    ) : (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.favors === baseCode
                            ? 'bg-blue-500/20 text-cyan-300 border border-blue-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {item.favors}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 5: Primary Drivers & Methodology Note */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-code">
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Primary Drivers</span>
            <ul className="space-y-1 text-slate-300">
              {pairResult.primaryDrivers && pairResult.primaryDrivers.length > 0 ? (
                pairResult.primaryDrivers.map((d, i) => <li key={i}>• {d}</li>)
              ) : (
                <li>• Balanced macroeconomic drivers between {baseCode} and {quoteCode}.</li>
              )}
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Integrity & Reproducibility</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Every score shown above is deterministically generated from verified economic releases, standardized surprise z-scores, and weighted category scoring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
