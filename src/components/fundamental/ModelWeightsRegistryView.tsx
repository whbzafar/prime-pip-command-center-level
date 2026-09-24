import React, { useState } from 'react';
import { ModelCategoryWeights, IndicatorCategory, IndicatorDefinition } from '../../types/fundamentalIndicatorTypes';
import { OFFICIAL_INDICATOR_REGISTRY, DEFAULT_CATEGORY_WEIGHTS } from '../../data/fundamentalRegistryData';
import { Sliders, RotateCcw, Search, ExternalLink, ShieldCheck, Download, Upload, Info } from 'lucide-react';

interface ModelWeightsRegistryViewProps {
  weights?: ModelCategoryWeights;
  categoryWeights?: ModelCategoryWeights;
  onUpdateWeights: (weights: ModelCategoryWeights) => void;
  onResetWeights: () => void;
  onExportJson?: () => void;
  onImportJson?: (data: any) => void;
  onOpenIndicatorModal?: (indicator: IndicatorDefinition) => void;
}

const CATEGORY_METADATA: { key: keyof ModelCategoryWeights; label: string; desc: string }[] = [
  { key: 'MONETARY_POLICY', label: 'Monetary Policy & Central Bank Path', desc: 'Policy interest rates, dot plot projections, quantitative tightening/easing bias.' },
  { key: 'INFLATION', label: 'Inflation & Price Pressures', desc: 'Headline and Core CPI, PCE Deflator, PPI, and short/medium-term inflation expectations.' },
  { key: 'GROWTH', label: 'Economic Growth & GDP', desc: 'Real Gross Domestic Product quarterly output, annualized expansion, and revisions.' },
  { key: 'EMPLOYMENT', label: 'Labor Market & Employment', desc: 'Non-Farm Payrolls, Unemployment Rate, Wage Growth, and Labor Force Participation.' },
  { key: 'RATES_YIELDS', label: 'Benchmark Sovereign Yields', desc: '2Y short-end yield expectations and 10Y sovereign benchmark interest differentials.' },
  { key: 'BUSINESS_ACTIVITY', label: 'Business Activity & PMIs', desc: 'Manufacturing and Services Purchasing Managers Indices (PMI), New Orders, and Capex.' },
  { key: 'CONSUMER', label: 'Consumer Demand & Sentiment', desc: 'Retail Sales volumes, University of Michigan Consumer Sentiment, and Consumer Confidence.' },
  { key: 'TRADE_EXTERNAL', label: 'Trade Balance & Current Account', desc: 'Goods & services trade balance, terms of trade index, and international net exports.' },
  { key: 'COT_POSITIONING', label: 'CFTC COT Institutional Positioning', desc: 'Commercial vs. Non-commercial futures positioning, crowding risk, and squeeze vulnerability.' },
  { key: 'SENTIMENT', label: 'Market Sentiment & Risk Regime', desc: 'Global risk-on / risk-off appetite, cross-asset volatility (VIX), and capital flows.' },
  { key: 'HOUSING', label: 'Housing & Construction', desc: 'Building permits, housing starts, existing home sales, and nationwide price appreciation.' },
  { key: 'FISCAL', label: 'Fiscal Health & Sovereign Debt', desc: 'Government budget deficit/surplus, debt-to-GDP ratio, and sovereign issuance supply.' },
];

export const ModelWeightsRegistryView: React.FC<ModelWeightsRegistryViewProps> = ({
  weights,
  categoryWeights,
  onUpdateWeights,
  onResetWeights,
  onExportJson,
  onImportJson,
  onOpenIndicatorModal,
}) => {
  const activeWeights = weights || categoryWeights || DEFAULT_CATEGORY_WEIGHTS;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrencyFilter, setSelectedCurrencyFilter] = useState<string>('ALL');

  const totalWeight = (Object.values(activeWeights) as number[]).reduce((sum, w) => sum + (Number(w) || 0), 0);

  const handleWeightChange = (category: keyof ModelCategoryWeights, newWeight: number) => {
    onUpdateWeights({
      ...activeWeights,
      [category]: Math.max(0, Math.min(100, newWeight)),
    });
  };

  const filteredIndicators = OFFICIAL_INDICATOR_REGISTRY.filter((ind) => {
    if (selectedCurrencyFilter !== 'ALL' && ind.currency !== selectedCurrencyFilter) return false;
    if (
      searchQuery &&
      !ind.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ind.code.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ind.officialSourceName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Weights Configurator */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                Macro Category Weights Calibration
              </h3>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Deterministic weighting engine • Target Sum: 100% (Current: {totalWeight}%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetWeights}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-mono-code transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET TO INSTITUTIONAL BASELINE</span>
            </button>
          </div>
        </div>

        {totalWeight !== 100 && (
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-300 font-mono-code">
            <Info className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Warning: Total assigned weight is {totalWeight}%. The engine will automatically normalize active weights proportionally, but 100% total allocation is recommended.
            </span>
          </div>
        )}

        {/* Weights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {CATEGORY_METADATA.map(({ key, label, desc }) => {
            const currentWeight = activeWeights[key] || 0;
            return (
              <div
                key={key}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-military font-bold text-xs text-slate-200 uppercase">
                      {label}
                    </span>
                    <span className="font-mono-code font-bold text-sm text-cyan-400">
                      {currentWeight}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed mt-1">
                    {desc}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={currentWeight}
                    onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[10px] font-mono-code text-slate-500">
                    <span>0% (Excluded)</span>
                    <span>25%</span>
                    <span>50% (Max)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Indicator Registry Dictionary */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                Official Institutional Indicator Registry ({filteredIndicators.length} of {OFFICIAL_INDICATOR_REGISTRY.length})
              </h3>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                All indicators mapped to primary central bank and government statistical release agencies
              </p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search registry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-56 font-mono-code"
              />
            </div>

            <select
              value={selectedCurrencyFilter}
              onChange={(e) => setSelectedCurrencyFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono-code focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Currencies</option>
              <option value="USD">USD (United States)</option>
              <option value="EUR">EUR (Eurozone)</option>
              <option value="GBP">GBP (United Kingdom)</option>
              <option value="JPY">JPY (Japan)</option>
              <option value="CHF">CHF (Switzerland)</option>
              <option value="CAD">CAD (Canada)</option>
              <option value="AUD">AUD (Australia)</option>
              <option value="NZD">NZD (New Zealand)</option>
            </select>
          </div>
        </div>

        {/* Indicators Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code">
            <thead className="bg-[#0b1120] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Currency / Code</th>
                <th className="p-3">Indicator Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Frequency</th>
                <th className="p-3">Primary Source Agency</th>
                <th className="p-3 text-right">Weight</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredIndicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-3">
                    <span className="font-bold text-cyan-300">{ind.currency}</span>
                    <span className="text-slate-500 ml-1.5">[{ind.code}]</span>
                  </td>
                  <td className="p-3 font-sans font-bold text-slate-200">{ind.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                      {ind.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{ind.frequency}</td>
                  <td className="p-3 text-slate-300">{ind.officialSourceName}</td>
                  <td className="p-3 text-right font-bold text-cyan-300">{ind.weightInCategory}%</td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => onOpenIndicatorModal?.(ind)}
                      className="px-2.5 py-1 rounded bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-cyan-300 text-[11px] font-bold transition cursor-pointer"
                    >
                      Inspect Spec
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
