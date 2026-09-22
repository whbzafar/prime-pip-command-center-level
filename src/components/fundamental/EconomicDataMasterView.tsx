import React, { useState } from 'react';
import {
  CurrencyCode,
  IndicatorCategory,
  IndicatorObservation,
  IndicatorDefinition,
} from '../../types/fundamentalIndicatorTypes';
import { OFFICIAL_INDICATOR_REGISTRY, CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import {
  Search,
  Filter,
  ExternalLink,
  Edit3,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Layers,
  X,
  Plus,
} from 'lucide-react';

interface EconomicDataMasterViewProps {
  observations: IndicatorObservation[];
  onUpdateObservation: (updated: IndicatorObservation) => void;
  onSelectCurrency: (curr: CurrencyCode) => void;
}

export const EconomicDataMasterView: React.FC<EconomicDataMasterViewProps> = ({
  observations,
  onUpdateObservation,
  onSelectCurrency,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [surpriseFilter, setSurpriseFilter] = useState<'ALL' | 'BEATS' | 'MISSES' | 'INLINE'>('ALL');
  const [editingDef, setEditingDef] = useState<IndicatorDefinition | null>(null);
  const [editForm, setEditForm] = useState({
    actual: '',
    forecast: '',
    previous: '',
    releaseDate: '',
    referencePeriod: '',
    notes: '',
  });

  // Map definitions to observations
  const obsMap = new Map<string, IndicatorObservation>();
  observations.forEach((o) => obsMap.set(o.indicatorId, o));

  const items = OFFICIAL_INDICATOR_REGISTRY.map((def) => {
    const obs = obsMap.get(def.id);
    const actual = obs?.actual !== undefined ? obs.actual : null;
    const forecast = obs?.forecast !== undefined ? obs.forecast : null;
    const previous = obs?.previous !== undefined ? obs.previous : null;

    const surprise = actual !== null && forecast !== null ? Number((actual - forecast).toFixed(3)) : null;
    const change = actual !== null && previous !== null ? Number((actual - previous).toFixed(3)) : null;
    const stdDev = def.historicalSurpriseStdDev || 1.0;
    const zScore = surprise !== null ? Number((surprise / stdDev).toFixed(2)) : null;

    return {
      def,
      obs,
      actual,
      forecast,
      previous,
      surprise,
      change,
      zScore,
    };
  });

  // Filter items
  const filtered = items.filter(({ def, obs, surprise }) => {
    if (selectedCurrency !== 'ALL' && def.currency !== selectedCurrency) return false;
    if (selectedCategory !== 'ALL' && def.category !== selectedCategory) return false;

    if (surpriseFilter === 'BEATS' && (surprise === null || surprise <= 0)) return false;
    if (surpriseFilter === 'MISSES' && (surprise === null || surprise >= 0)) return false;
    if (surpriseFilter === 'INLINE' && (surprise === null || Math.abs(surprise) > 0.05)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = def.name.toLowerCase().includes(q);
      const matchLabel = def.shortLabel.toLowerCase().includes(q);
      const matchCurr = def.currency.toLowerCase().includes(q);
      const matchCat = def.category.toLowerCase().includes(q);
      if (!matchName && !matchLabel && !matchCurr && !matchCat) return false;
    }

    return true;
  });

  const handleStartEdit = (def: IndicatorDefinition, obs?: IndicatorObservation) => {
    setEditingDef(def);
    setEditForm({
      actual: obs?.actual !== undefined && obs?.actual !== null ? String(obs.actual) : '',
      forecast: obs?.forecast !== undefined && obs?.forecast !== null ? String(obs.forecast) : '',
      previous: obs?.previous !== undefined && obs?.previous !== null ? String(obs.previous) : '',
      releaseDate: obs?.releaseDate || new Date().toISOString().split('T')[0],
      referencePeriod: obs?.referencePeriod || 'Current Period',
      notes: obs?.notes || '',
    });
  };

  const handleSaveEdit = () => {
    if (!editingDef) return;
    const act = parseFloat(editForm.actual);
    if (isNaN(act)) {
      alert('Please enter a valid numeric Actual value');
      return;
    }

    const fcast = editForm.forecast ? parseFloat(editForm.forecast) : null;
    const prev = editForm.previous ? parseFloat(editForm.previous) : null;
    const existingObs = obsMap.get(editingDef.id);

    const updated: IndicatorObservation = {
      id: existingObs?.id || `obs_${editingDef.id}_${Date.now()}`,
      indicatorId: editingDef.id,
      currency: editingDef.currency,
      referencePeriod: editForm.referencePeriod || 'Current Period',
      releaseDate: editForm.releaseDate || new Date().toISOString().split('T')[0],
      actual: act,
      forecast: isNaN(fcast as any) ? null : fcast,
      previous: isNaN(prev as any) ? null : prev,
      unit: editingDef.unit,
      sourceUrl: editingDef.officialSourceUrl,
      notes: editForm.notes || undefined,
      updatedAt: new Date().toISOString(),
    };

    onUpdateObservation(updated);
    setEditingDef(null);
  };

  const currencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                Economic Data Master Registry
              </h3>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Official Macro Releases • Multi-Frequency Harmonization (YoY / MoM / QoQ) • Economic Surprise Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono-code text-slate-400">
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-bold text-slate-200">
              {filtered.length} of {OFFICIAL_INDICATOR_REGISTRY.length} Indicators Listed
            </span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono-code">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search release (e.g. CPI, GDP, NFP)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Currency Filter */}
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            <option value="ALL">All Currencies (8)</option>
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c} — {CURRENCY_METADATA[c]?.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            <option value="MONETARY_POLICY">Monetary Policy</option>
            <option value="INFLATION">Inflation</option>
            <option value="GROWTH">Economic Growth</option>
            <option value="EMPLOYMENT">Employment</option>
            <option value="RATES_YIELDS">Rates & Yields</option>
            <option value="BUSINESS_ACTIVITY">Business Activity (PMI)</option>
            <option value="CONSUMER">Consumer</option>
            <option value="TRADE_EXTERNAL">Trade & External</option>
            <option value="HOUSING">Housing</option>
            <option value="FISCAL">Fiscal</option>
          </select>

          {/* Surprise Filter */}
          <select
            value={surpriseFilter}
            onChange={(e) => setSurpriseFilter(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 transition cursor-pointer"
          >
            <option value="ALL">All Outcomes</option>
            <option value="BEATS">Beats Forecast (Surprise &gt; 0)</option>
            <option value="MISSES">Missed Forecast (Surprise &lt; 0)</option>
            <option value="INLINE">In-Line With Forecast</option>
          </select>
        </div>
      </div>

      {/* Economic Releases Master Table */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-code border-collapse">
            <thead>
              <tr className="bg-[#0c1222] border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="p-3">Currency / Release</th>
                <th className="p-3">Period / Frequency</th>
                <th className="p-3 text-right">Actual</th>
                <th className="p-3 text-right">Forecast</th>
                <th className="p-3 text-right">Previous</th>
                <th className="p-3 text-right">Surprise</th>
                <th className="p-3 text-right">Z-Score</th>
                <th className="p-3 text-center">Official Source</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {filtered.map(({ def, obs, actual, forecast, previous, surprise, change, zScore }) => {
                const meta = CURRENCY_METADATA[def.currency];
                const hasActual = actual !== null;

                return (
                  <tr key={def.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{meta?.flag}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-military font-bold text-xs text-slate-100">
                              {def.shortLabel}
                            </span>
                            <span className="text-[10px] text-slate-500 px-1 py-0.2 rounded bg-slate-900 border border-slate-800">
                              {def.currency}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate max-w-[260px]">
                            {def.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 text-slate-400">
                      <div>
                        <span className="text-slate-300 font-semibold">{def.measurementPeriod}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {def.frequency} • {obs?.referencePeriod || 'Latest'}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      {hasActual ? (
                        <span className="font-bold text-slate-100 text-sm">
                          {actual}
                          <span className="text-slate-500 text-[10px] ml-0.5">{def.unit}</span>
                        </span>
                      ) : (
                        <span className="text-amber-400/80 italic text-[11px]">Unrecorded</span>
                      )}
                    </td>

                    <td className="p-3 text-right text-slate-400">
                      {forecast !== null ? `${forecast}${def.unit}` : '—'}
                    </td>

                    <td className="p-3 text-right text-slate-400">
                      {previous !== null ? `${previous}${def.unit}` : '—'}
                    </td>

                    <td className="p-3 text-right">
                      {surprise !== null ? (
                        <span
                          className={`font-bold inline-flex items-center gap-0.5 ${
                            surprise > 0 ? 'text-emerald-400' : surprise < 0 ? 'text-rose-400' : 'text-slate-400'
                          }`}
                        >
                          {surprise > 0 ? <TrendingUp className="w-3 h-3" /> : surprise < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                          <span>{surprise > 0 ? `+${surprise}` : surprise}</span>
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      {zScore !== null ? (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            zScore > 1
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : zScore < -1
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-slate-900 text-slate-400'
                          }`}
                        >
                          {zScore > 0 ? `+${zScore}σ` : `${zScore}σ`}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <a
                        href={def.officialSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold transition"
                      >
                        <span>Open Official Source</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleStartEdit(def, obs)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                        title="Edit Release Values"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Release Modal */}
      {editingDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-[#0a0f1d] border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-military font-bold text-base text-slate-100">
                  Update Economic Release: {editingDef.shortLabel}
                </h3>
                <span className="text-xs font-mono-code text-cyan-400 block mt-0.5">
                  {editingDef.currency} • {editingDef.measurementPeriod} ({editingDef.unit})
                </span>
              </div>
              <button
                onClick={() => setEditingDef(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono-code">
              <div>
                <label className="text-slate-400 block mb-1">
                  Actual Value <span className="text-rose-400">* (Required)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={editForm.actual}
                  onChange={(e) => setEditForm({ ...editForm, actual: e.target.value })}
                  placeholder={`e.g. 3.2 (${editingDef.unit})`}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Forecast / Consensus</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.forecast}
                    onChange={(e) => setEditForm({ ...editForm, forecast: e.target.value })}
                    placeholder={`e.g. 3.0 (${editingDef.unit})`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Previous Period</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.previous}
                    onChange={(e) => setEditForm({ ...editForm, previous: e.target.value })}
                    placeholder={`e.g. 2.9 (${editingDef.unit})`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Reference Period</label>
                  <input
                    type="text"
                    value={editForm.referencePeriod}
                    onChange={(e) => setEditForm({ ...editForm, referencePeriod: e.target.value })}
                    placeholder="e.g. August 2026 / Q2 2026"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Release Date</label>
                  <input
                    type="date"
                    value={editForm.releaseDate}
                    onChange={(e) => setEditForm({ ...editForm, releaseDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Audit Notes / Source Citation</label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="e.g. Bureau of Labor Statistics headline release, season-adjusted..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[11px] text-cyan-300">
                Official Agency: <a href={editingDef.officialSourceUrl} target="_blank" rel="noreferrer" className="underline font-bold">{editingDef.officialSourceName} ↗</a>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setEditingDef(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-military font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military font-bold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
