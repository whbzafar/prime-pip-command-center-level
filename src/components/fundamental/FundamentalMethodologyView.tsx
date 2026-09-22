import React from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Code2,
  Scale,
  Compass,
} from 'lucide-react';

export const FundamentalMethodologyView: React.FC = () => {
  const steps = [
    {
      num: 1,
      title: 'Observation Collection & Verified Source Input',
      formula: 'Obs = { Actual, Forecast (Consensus), Previous, Revised Previous }',
      desc: 'Trader manually enters verified figures from official national statistical agencies or central banks. No guessed or AI-fabricated values permitted.',
    },
    {
      num: 2,
      title: 'Economic Surprise Calculation',
      formula: 'Surprise = Actual - Forecast',
      desc: 'Captures the deviation between actual published data and consensus market expectations.',
    },
    {
      num: 3,
      title: 'Sequential Change Calculation',
      formula: 'Change = Actual - Previous',
      desc: 'Evaluates the directional momentum of the economic series relative to the preceding measurement period.',
    },
    {
      num: 4,
      title: 'Standardized Surprise Z-Score',
      formula: 'z = (Actual - Forecast) / σ_historical',
      desc: 'Normalizes the economic surprise by dividing by the 3-year historical standard deviation of surprises for that specific release.',
    },
    {
      num: 5,
      title: 'Directional Sign Alignment & Regime Adjustment',
      formula: 'Directional Surprise = z * DirectionMultiplier',
      desc: 'Aligns the sign based on economic impact: Higher GDP/PMI is positive (+1), while Higher Unemployment is negative (-1) for currency strength.',
    },
    {
      num: 6,
      title: 'Normalized Indicator Score',
      formula: 'Score_i = clamp(-100, +100, tanh(z / 1.5) * 100)',
      desc: 'Compresses large macro deviations into a bounded, standardized -100 to +100 scale using continuous hyperbolic saturation.',
    },
    {
      num: 7,
      title: 'Category Indicator Weighting',
      formula: 'CategoryScore = ∑(Score_i * w_i) / ∑(w_i)',
      desc: 'Aggregates indicators inside each category according to their pre-calibrated institutional weights.',
    },
    {
      num: 8,
      title: 'Category Weight Allocation',
      formula: 'CurrencyComposite = ∑(CategoryScore_c * W_c)',
      desc: 'Monetary Policy (20%), Inflation (15%), Growth (15%), Employment (10%), Rates/Yields (10%), Business PMI (10%), Trade (5%), Consumer (5%), COT (5%), Sentiment (5%).',
    },
    {
      num: 9,
      title: 'Data Completeness Adjustment',
      formula: 'AdjustedCurrencyScore = CurrencyComposite * (CoveragePercent / 100)',
      desc: 'Penalizes currency scores if core required economic indicators are missing from the manual registry.',
    },
    {
      num: 10,
      title: 'Cross-Currency Relative Differential',
      formula: 'PairDifferential = BaseCurrencyScore - QuoteCurrencyScore',
      desc: 'Calculates the relative macroeconomic divergence between the two currencies in an FX pair (e.g. AUD - JPY).',
    },
    {
      num: 11,
      title: 'Directional Bias Classification',
      formula: 'Diff ≥ +30: BULLISH, Diff ≥ +75: STRONG BULLISH, Diff ≤ -30: BEARISH, Diff ≤ -75: STRONG BEARISH',
      desc: 'Deterministic classification thresholds with zero arbitrary bias manipulation.',
    },
    {
      num: 12,
      title: 'Multi-Horizon Structural Projection',
      formula: 'LongTerm = 0.30*Policy + 0.25*Growth + 0.15*Inflation + 0.15*Yields + 0.15*External',
      desc: 'Weights slow-moving structural macro fundamentals heavily for 6-12 month investment horizons.',
    },
    {
      num: 13,
      title: 'Transparent Audit & Explanation Layer',
      formula: 'AI = Explanation of deterministic math; AI ≠ Data generator',
      desc: 'The mathematical calculation engine is the sole authority. The AI layer explains the results without fabricating missing inputs.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
          <FileText className="w-5 h-5 text-purple-400" />
          <div>
            <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              Fundamental Intelligence Methodology & Mathematical Engine Specification
            </h3>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              100% Reproducible Calculations • Explicit Formulas • Transparent Category Aggregation
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs font-mono-code text-purple-300 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>
            Strict adherence to the Master Development Prompt: Zero black-box calculations, zero fabricated economic figures, 100% deterministic reproducibility.
          </span>
        </div>
      </div>

      {/* 13 Steps Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider">
          The 13-Step Mathematical Sequence
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((s) => (
            <div
              key={s.num}
              className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2.5 text-xs font-mono-code"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-cyan-300 font-military font-bold text-xs flex items-center justify-center">
                    {s.num}
                  </span>
                  <h5 className="font-military font-bold text-slate-100">{s.title}</h5>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-cyan-300 font-bold text-[11px]">
                <code>{s.formula}</code>
              </div>

              <p className="text-slate-400 leading-relaxed text-[11px]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
