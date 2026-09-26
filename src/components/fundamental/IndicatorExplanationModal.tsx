import React from 'react';
import { X, ExternalLink, BookOpen, Scale, ShieldCheck } from 'lucide-react';
import { IndicatorDefinition } from '../../types/fundamentalIndicatorTypes';

interface IndicatorExplanationModalProps {
  indicator: IndicatorDefinition | null;
  onClose: () => void;
}

export const IndicatorExplanationModal: React.FC<IndicatorExplanationModalProps> = ({
  indicator,
  onClose,
}) => {
  if (!indicator) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0c1222]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {indicator.currency} • {indicator.code}
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  {indicator.frequency} • {indicator.measurementPeriod}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide mt-0.5">
                {indicator.name}
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
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Official Source Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono-code uppercase tracking-wider text-slate-400">
                Official Primary Source Agency
              </span>
              <div className="text-xs font-bold text-slate-200 font-mono-code">
                {indicator.officialSourceName}
              </div>
            </div>
            {indicator.officialSourceUrl && (
              <a
                href={indicator.officialSourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-cyan-300 text-xs font-mono-code font-bold transition shrink-0 cursor-pointer"
              >
                <span>VERIFIED SOURCE</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Core Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
              Indicator Definition & Description
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
              {indicator.description}
            </p>
          </div>

          {/* Why It Matters */}
          <div className="space-y-2 p-4 rounded-xl bg-blue-950/20 border border-blue-500/20">
            <div className="flex items-center gap-2 text-xs font-military font-bold text-cyan-300 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Why This Indicator Matters</span>
            </div>
            <p className="text-xs sm:text-sm text-cyan-100/90 font-sans leading-relaxed">
              {indicator.whyItMatters}
            </p>
          </div>

          {/* How to Interpret */}
          <div className="space-y-2">
            <h4 className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
              Interpretation Rules & Directionality
            </h4>
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
              {indicator.interpretationRules}
            </div>
          </div>

          {/* Required Data Cadence & Forecast Dynamics */}
          <div className="space-y-2 p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
            <div className="flex items-center gap-2 text-xs font-military font-bold text-purple-300 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-purple-400" />
              <span>Required Data Cadence & Economic Forecast Dynamics</span>
            </div>
            <div className="space-y-2 text-xs text-purple-100/90 leading-relaxed font-sans">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/20">
                <strong className="text-cyan-300 font-mono-code block mb-1">
                  Required Data Cadence: {indicator.frequency.toUpperCase()} DATA ({indicator.measurementPeriod})
                </strong>
                <p className="text-slate-300">
                  {indicator.frequency === 'Monthly' && (
                    <>This indicator requires <strong>Monthly Data</strong> (e.g. NFP Non-Farm Payrolls, CPI, Unemployment, Retail Sales). Monthly prints establish immediate short-term velocity and monetary policy pressure.</>
                  )}
                  {indicator.frequency === 'Weekly' && (
                    <>This indicator requires <strong>Weekly Data</strong> (e.g. Initial Jobless Claims, Weekly Petroleum Inventories). Weekly data provides high-frequency early warning before monthly figures are released.</>
                  )}
                  {indicator.frequency === 'Quarterly' && (
                    <>This indicator requires <strong>Quarterly Data (3rd Month / 6th Month Revisions)</strong> (e.g. GDP, Current Account). Releases progress through Advance (1st month), Preliminary (2nd month), Final (3rd month), and multi-quarter benchmark revisions.</>
                  )}
                  {indicator.frequency === 'Annual' && (
                    <>This indicator requires <strong>Annual Data</strong> (e.g. Sovereign Debt-to-GDP, fiscal balance benchmarks) to track long-term macroeconomic solvency.</>
                  )}
                  {indicator.frequency !== 'Monthly' && indicator.frequency !== 'Weekly' && indicator.frequency !== 'Quarterly' && indicator.frequency !== 'Annual' && (
                    <>This indicator is evaluated on a <strong>{indicator.frequency}</strong> cadence to track macroeconomic cyclical adjustments.</>
                  )}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/20 space-y-1">
                <strong className="text-amber-300 font-mono-code block">Previous vs. Forecast vs. Actual:</strong>
                <p className="text-slate-300">
                  • <strong>Previous:</strong> The prior period's baseline benchmark (frequently revised by statistical bureaus).<br />
                  • <strong>Forecast:</strong> The median consensus expectation across institutional economists.<br />
                  • <strong>Actual:</strong> The official government print. The <em>Economic Surprise (Actual − Forecast)</em> drives institutional order flow and sharp currency repricing.
                </p>
              </div>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono-code">
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Direction</span>
              <span className="font-bold text-slate-200">{indicator.scoringDirection.replace(/_/g, ' ')}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Category Weight</span>
              <span className="font-bold text-cyan-300">{indicator.weightInCategory}% in Category</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Unit</span>
              <span className="font-bold text-slate-200">{indicator.unit}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Seasonally Adjusted</span>
              <span className="font-bold text-slate-200">{indicator.isSeasonallyAdjusted ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-[#0c1222] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-military font-bold transition cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
