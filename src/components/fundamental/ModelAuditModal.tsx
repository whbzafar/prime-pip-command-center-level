import React from 'react';
import { X, Calculator, ShieldCheck, Layers, ChevronRight } from 'lucide-react';
import { CurrencyScoreResult, CategoryScoreResult } from '../../types/fundamentalIndicatorTypes';

interface ModelAuditModalProps {
  scoreResult: CurrencyScoreResult | null;
  onClose: () => void;
}

export const ModelAuditModal: React.FC<ModelAuditModalProps> = ({ scoreResult, onClose }) => {
  if (!scoreResult) return null;

  const categories: CategoryScoreResult[] = Object.values(scoreResult.categoryScores) as CategoryScoreResult[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0c1222]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40">
                  {scoreResult.currency} TRANSPARENT MODEL AUDIT
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  Engine Model v{scoreResult.modelVersion} • Calculated: {new Date(scoreResult.calculatedAt).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide mt-0.5">
                Deterministic Mathematical Breakdown ("Why?")
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Top Formula Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-military font-bold text-cyan-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Core Deterministic Equation</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono-code text-xs text-slate-200 overflow-x-auto">
              <code>
                Composite Currency Score = ∑ [ Category Score_i × Active Weight_i ] / ∑ Active Weights
              </code>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Every category score is derived strictly from verified economic observations using standardized surprise z-scores. Weights of unobserved indicators are proportionally redistributed among active factors.
            </p>
          </div>

          {/* Composite Score Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase">Composite Score</div>
              <div className={`text-2xl font-bold font-military mt-1 ${
                scoreResult.score > 20 ? 'text-emerald-400' : scoreResult.score < -20 ? 'text-rose-400' : 'text-slate-200'
              }`}>
                {scoreResult.score > 0 ? `+${scoreResult.score}` : scoreResult.score}
                <span className="text-xs text-slate-500 font-mono-code">/100</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase">Model Assessment</div>
              <div className="text-xs font-bold text-cyan-300 mt-1 uppercase truncate font-mono-code">
                {scoreResult.assessmentLabel}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase">Completed / Total</div>
              <div className="text-sm font-bold text-slate-200 mt-1 font-mono-code">
                {scoreResult.completedIndicators} / {scoreResult.totalIndicators} Indicators
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] font-mono-code text-slate-400 uppercase">Data Coverage</div>
              <div className="text-sm font-bold text-emerald-400 mt-1 font-mono-code">
                {scoreResult.dataCoveragePercent}% Verified
              </div>
            </div>
          </div>

          {/* Category Contributions Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Category Weighting & Points Contribution</span>
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left text-xs font-mono-code">
                <thead className="bg-[#0b1120] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Category Score</th>
                    <th className="p-3 text-right">Assigned Weight</th>
                    <th className="p-3 text-right">Contribution (Points)</th>
                    <th className="p-3 text-center">Indicators Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {categories.map((cat) => (
                    <tr key={cat.category} className="hover:bg-slate-900/40 transition">
                      <td className="p-3 font-sans font-bold text-slate-200">
                        {cat.categoryLabel}
                      </td>
                      <td className={`p-3 text-right font-bold ${
                        cat.score > 15 ? 'text-emerald-400' : cat.score < -15 ? 'text-rose-400' : 'text-slate-300'
                      }`}>
                        {cat.score > 0 ? `+${cat.score}` : cat.score}
                      </td>
                      <td className="p-3 text-right text-slate-400">
                        {cat.weight}%
                      </td>
                      <td className={`p-3 text-right font-bold ${
                        cat.weightedContribution > 0 ? 'text-emerald-400' : cat.weightedContribution < 0 ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {cat.weightedContribution > 0 ? `+${cat.weightedContribution}` : cat.weightedContribution}
                      </td>
                      <td className="p-3 text-center text-slate-400">
                        {cat.activeCount} / {cat.indicatorCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Primary Drivers vs Conflicts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
              <div className="text-xs font-military font-bold text-emerald-300 uppercase tracking-wider">
                Primary Supporting Drivers
              </div>
              {scoreResult.primarySupport.length > 0 ? (
                <ul className="space-y-1 text-xs text-slate-300">
                  {scoreResult.primarySupport.map((sup, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{sup}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-500 font-mono-code">No strong bullish drivers active.</div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
              <div className="text-xs font-military font-bold text-rose-300 uppercase tracking-wider">
                Conflicting / Drag Factors
              </div>
              {scoreResult.conflictingFactors.length > 0 ? (
                <ul className="space-y-1 text-xs text-slate-300">
                  {scoreResult.conflictingFactors.map((conf, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{conf}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-slate-500 font-mono-code">No major conflicting drag factors identified.</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-[#0c1222] flex items-center justify-between">
          <span className="text-xs font-mono-code text-slate-500">
            DETERMINISTIC VERIFICATION PASS • NO SYNTHETIC VALUES
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-military font-bold transition cursor-pointer"
          >
            CLOSE AUDIT
          </button>
        </div>
      </div>
    </div>
  );
};
