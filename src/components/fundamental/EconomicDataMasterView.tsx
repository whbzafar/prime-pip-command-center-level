import React, { useEffect, useState } from 'react';
import {
  CurrencyCode,
  IndicatorCategory,
  IndicatorObservation,
  IndicatorDefinition,
  CustomFundamentalIndicator,
} from '../../types/fundamentalIndicatorTypes';
import { OFFICIAL_INDICATOR_REGISTRY, CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import { generateIndicator } from '../../services/fundamentalLiveResearchService';
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
  Loader2,
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
  const [modalError, setModalError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    actual: '',
    forecast: '',
    previous: '',
    releaseDate: '',
    referencePeriod: '',
    notes: '',
  });
  const [customIndicators, setCustomIndicators] = useState<CustomFundamentalIndicator[]>(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_custom_indicators_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomFundamentalIndicator | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [batchState, setBatchState] = useState({ running: false, completed: 0, total: 0 });
  const [liveMessage, setLiveMessage] = useState<string | null>(null);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customForm, setCustomForm] = useState({
    currency: 'USD' as CurrencyCode,
    name: '',
    shortLabel: '',
    category: 'INFLATION' as IndicatorCategory,
    frequency: 'Monthly' as any,
    measurementPeriod: 'Percentage (%)' as any,
    unit: '%',
    actual: '',
    forecast: '',
    previous: '',
    sourceName: '',
    sourceUrl: '',
    referencePeriod: '',
    releaseDate: '',
    notes: '',
  });

  useEffect(() => {
    if (!isAddingCustom) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAddingCustom(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAddingCustom]);

  useEffect(() => {
    try {
      localStorage.setItem('primepip_fundamental_custom_indicators_v1', JSON.stringify(customIndicators));
    } catch {}
  }, [customIndicators]);

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
    setModalError(null);
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
      setModalError('Please enter a valid numeric Actual value');
      return;
    }
    setModalError(null);

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

  const handleGenerateOfficial = async (def: IndicatorDefinition, mode: 'GENERATE' | 'REGENERATE' = 'GENERATE') => {
    if (generatingId || batchState.running) return;
    setGeneratingId(def.id);
    setLiveMessage(null);
    try {
      const existing = obsMap.get(def.id);
      const result = await generateIndicator(def, existing, mode);
      if (result.status !== 'VERIFIED' || result.actual === null) {
        setLiveMessage(result.notes || `${def.shortLabel}: verified data was not available; existing values were preserved.`);
        return;
      }
      onUpdateObservation({
        id: existing?.id || `obs_${def.id}_${Date.now()}`,
        indicatorId: def.id,
        currency: def.currency,
        referencePeriod: result.referencePeriod || existing?.referencePeriod || 'Latest',
        releaseDate: result.releaseDate || existing?.releaseDate || new Date().toISOString().split('T')[0],
        actual: result.actual,
        forecast: result.forecast,
        previous: result.previous,
        revisedPrevious: result.revisedPrevious ?? existing?.revisedPrevious ?? null,
        unit: def.unit,
        sourceUrl: result.sourceUrl || def.officialSourceUrl,
        notes: result.notes || existing?.notes,
        updatedAt: result.retrievedAt || new Date().toISOString(),
        verificationStatus: 'VERIFIED',
        confidence: result.confidence,
        researchRetrievedAt: result.retrievedAt,
        researchSourceName: result.sourceName,
      });
      setLiveMessage(`${def.shortLabel}: verified and updated.`);
    } catch (error) {
      setLiveMessage(error instanceof Error ? error.message : 'Live research failed; existing values were preserved.');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateFiltered = async (mode: 'GENERATE' | 'REGENERATE' = 'GENERATE') => {
    if (generatingId || batchState.running) return;
    const scoped = filtered.map((item) => item.def);
    setBatchState({ running: true, completed: 0, total: scoped.length });
    setLiveMessage(null);
    try {
      for (let index = 0; index < scoped.length; index += 1) {
        const def = scoped[index];
        try {
          const existing = obsMap.get(def.id);
          const result = await generateIndicator(def, existing, mode);
          if (result.status === 'VERIFIED' && result.actual !== null) {
            onUpdateObservation({
              id: existing?.id || `obs_${def.id}_${Date.now()}`,
              indicatorId: def.id,
              currency: def.currency,
              referencePeriod: result.referencePeriod || existing?.referencePeriod || 'Latest',
              releaseDate: result.releaseDate || existing?.releaseDate || new Date().toISOString().split('T')[0],
              actual: result.actual,
              forecast: result.forecast,
              previous: result.previous,
              revisedPrevious: result.revisedPrevious ?? existing?.revisedPrevious ?? null,
              unit: def.unit,
              sourceUrl: result.sourceUrl || def.officialSourceUrl,
              notes: result.notes || existing?.notes,
              updatedAt: result.retrievedAt || new Date().toISOString(),
              verificationStatus: 'VERIFIED',
              confidence: result.confidence,
              researchRetrievedAt: result.retrievedAt,
              researchSourceName: result.sourceName,
            });
          }
        } catch {}
        setBatchState((prev) => ({ ...prev, completed: index + 1 }));
      }
      setLiveMessage(`Grounded research completed for ${scoped.length} listed indicators. Unverified items were left unchanged.`);
    } finally {
      setBatchState((prev) => ({ ...prev, running: false }));
    }
  };

  const resetCustomForm = () => {
    setCustomForm({
      currency: (selectedCurrency !== 'ALL' ? selectedCurrency : 'USD') as CurrencyCode,
      name: '',
      shortLabel: '',
      category: 'INFLATION',
      
      frequency: 'Monthly',
      measurementPeriod: 'Percentage (%)',
      unit: '%',
      actual: '',
      forecast: '',
      previous: '',
      sourceName: '',
      sourceUrl: '',
      referencePeriod: '',
      releaseDate: '',
      notes: '',
    });
  };

  const openCustomEditor = (item?: CustomFundamentalIndicator) => {
    if (item) {
      setEditingCustom(item);
      setCustomForm({
        currency: item.currency,
        name: item.name,
        shortLabel: item.shortLabel,
        category: item.category,
        frequency: item.frequency,
        measurementPeriod: item.measurementPeriod,
        unit: item.unit,
        actual: item.actual === null ? '' : String(item.actual),
        forecast: item.forecast === null ? '' : String(item.forecast),
        previous: item.previous === null ? '' : String(item.previous),
        sourceName: item.officialSourceName || '',
        sourceUrl: item.officialSourceUrl || '',
        referencePeriod: item.referencePeriod || '',
        releaseDate: item.releaseDate || '',
        notes: item.notes || '',
      });
      setCustomCategoryName(item.category === 'CUSTOM' ? (item.notes?.match(/Custom category:\s*(.+?)(?:\n|$)/i)?.[1] || '') : '');
    } else {
      resetCustomForm();
      setCustomCategoryName('');
      setEditingCustom(null);
    }
    setIsAddingCustom(true);
  };

  const saveCustomIndicator = () => {
    if (!customForm.name.trim() || !customForm.shortLabel.trim()) {
      setLiveMessage('Custom indicator name and short label are required.');
      return;
    }
    const actual = customForm.actual.trim() === '' ? null : Number(customForm.actual);
    const forecast = customForm.forecast.trim() === '' ? null : Number(customForm.forecast);
    const previous = customForm.previous.trim() === '' ? null : Number(customForm.previous);
    if ([actual, forecast, previous].some((value) => value !== null && !Number.isFinite(value))) {
      setLiveMessage('Custom indicator numeric fields must contain valid numbers.');
      return;
    }

    const customCategorySelected = (customForm.category as string) === 'CUSTOM';
    const effectiveCategory = customCategorySelected ? ('CUSTOM' as IndicatorCategory) : customForm.category;
    const item: CustomFundamentalIndicator = {
      id: editingCustom?.id || `CUSTOM_${customForm.currency}_${Date.now()}`,
      currency: customForm.currency,
      name: customForm.name.trim(),
      shortLabel: customForm.shortLabel.trim(),
      category: effectiveCategory,
      frequency: customForm.frequency,
      measurementPeriod: customForm.measurementPeriod,
      unit: customForm.unit.trim() || '%',
      officialSourceName: customForm.sourceName.trim() || undefined,
      officialSourceUrl: customForm.sourceUrl.trim() || undefined,
      actual,
      forecast,
      previous,
      referencePeriod: customForm.referencePeriod.trim() || undefined,
      releaseDate: customForm.releaseDate.trim() || undefined,
      notes: [customForm.notes.trim(), customCategorySelected && customCategoryName.trim() ? `Custom category: ${customCategoryName.trim()}` : ''].filter(Boolean).join('\n') || undefined,
      updatedAt: new Date().toISOString(),
      verificationStatus: 'MANUAL',
    };
    setCustomIndicators((prev) => {
      const exists = prev.some((entry) => entry.id === item.id);
      return exists ? prev.map((entry) => entry.id === item.id ? item : entry) : [...prev, item];
    });
    setIsAddingCustom(false);
    setEditingCustom(null);
    setLiveMessage(`${item.shortLabel}: custom indicator saved.`);
  };

  const handleGenerateCustom = async (item: CustomFundamentalIndicator, mode: 'GENERATE' | 'REGENERATE' = 'GENERATE') => {
    if (generatingId || batchState.running) return;
    setGeneratingId(item.id);
    setLiveMessage(null);
    try {
      const existing: IndicatorObservation | undefined = item.actual === null ? undefined : {
        id: item.id,
        indicatorId: item.id,
        currency: item.currency,
        referencePeriod: item.referencePeriod || 'Latest',
        releaseDate: item.releaseDate || '',
        actual: item.actual,
        forecast: item.forecast,
        previous: item.previous,
        unit: item.unit,
        sourceUrl: item.officialSourceUrl,
        notes: item.notes,
        updatedAt: item.updatedAt || new Date().toISOString(),
      };
      const result = await generateIndicator(item, existing, mode);
      if (result.status !== 'VERIFIED' || result.actual === null) {
        setLiveMessage(result.notes || `${item.shortLabel}: no verified release was returned.`);
        return;
      }
      setCustomIndicators((prev) => prev.map((entry) => entry.id === item.id ? {
        ...entry,
        actual: result.actual,
        forecast: result.forecast,
        previous: result.previous,
        revisedPrevious: result.revisedPrevious,
        referencePeriod: result.referencePeriod,
        releaseDate: result.releaseDate,
        sourceUrl: result.sourceUrl,
        notes: result.notes,
        updatedAt: result.retrievedAt,
        verificationStatus: 'VERIFIED',
        confidence: result.confidence,
      } : entry));
      setLiveMessage(`${item.shortLabel}: verified and updated.`);
    } catch (error) {
      setLiveMessage(error instanceof Error ? error.message : 'Custom indicator research failed.');
    } finally {
      setGeneratingId(null);
    }
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

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800 font-bold text-slate-200 text-xs">
              {filtered.length} of {OFFICIAL_INDICATOR_REGISTRY.length} Official Indicators
            </span>
            <button
              type="button"
              onClick={() => openCustomEditor()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-military font-bold transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              ADD CUSTOM
            </button>
            <button
              type="button"
              disabled={batchState.running || generatingId === null && filtered.length === 0}
              onClick={() => handleGenerateFiltered('GENERATE')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-military font-bold transition cursor-pointer"
            >
              {batchState.running ? `${batchState.completed}/${batchState.total}` : 'GENERATE LIST'}
            </button>
            <button
              type="button"
              disabled={batchState.running || filtered.length === 0}
              onClick={() => handleGenerateFiltered('REGENERATE')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-cyan-300 border border-cyan-500/30 text-xs font-military font-bold transition cursor-pointer"
            >
              REGENERATE
            </button>
          </div>
        </div>

        {(liveMessage || batchState.running) && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs font-mono-code">
          <div className="flex items-center gap-2 min-w-0">
            {batchState.running && <Loader2 className="w-4 h-4 text-cyan-300 animate-spin shrink-0" />}
            <span className="text-cyan-200 break-words">
              {batchState.running
                ? `Live Google research in progress: ${batchState.completed}/${batchState.total}`
                : liveMessage}
            </span>
          </div>
          {!batchState.running && (
            <button type="button" onClick={() => setLiveMessage(null)} className="shrink-0 px-2 py-1 rounded-lg bg-slate-900/70 hover:bg-slate-800 text-slate-300 border border-slate-700">
              Dismiss
            </button>
          )}
        </div>
      )}

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
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                            <button
                              type="button"
                              onClick={() => onSelectCurrency(def.currency)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 px-1 py-0.2 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                              title="Switch to currency workspace"
                            >
                              {def.currency}
                            </button>
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleGenerateOfficial(def, 'GENERATE')}
                          disabled={generatingId === def.id || batchState.running}
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition cursor-pointer"
                          title="Generate latest verified release"
                        >
                          {generatingId === def.id ? '...' : 'Generate'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleGenerateOfficial(def, 'REGENERATE')}
                          disabled={generatingId === def.id || batchState.running}
                          className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-cyan-300 border border-slate-700 text-[10px] font-bold transition cursor-pointer"
                          title="Force fresh web verification"
                        >
                          Regenerate
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(def, obs)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                          title="Edit Release Values"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Touch-Optimized Cards View */}
        <div className="block md:hidden divide-y divide-slate-800/60 bg-slate-950/40">
          {filtered.map(({ def, obs, actual, forecast, previous, surprise, change, zScore }) => {
            const meta = CURRENCY_METADATA[def.currency];
            const hasActual = actual !== null;

            return (
              <div key={def.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base">{meta?.flag}</span>
                      <button
                        type="button"
                        onClick={() => onSelectCurrency(def.currency)}
                        className="text-[10px] text-cyan-300 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold"
                      >
                        {def.currency}
                      </button>
                      <span className="font-military font-bold text-sm text-slate-100">{def.shortLabel}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-400 font-mono-code">
                        {def.measurementPeriod}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 block mt-1">{def.name}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartEdit(def, obs)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-blue-500/30 text-xs font-military font-bold transition shrink-0 cursor-pointer min-h-[44px]"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono-code bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Actual</span>
                    {hasActual ? (
                      <span className="font-bold text-slate-100 text-sm">
                        {actual} <span className="text-slate-500 text-[10px] font-normal">{def.unit}</span>
                      </span>
                    ) : (
                      <span className="text-amber-400/80 italic text-xs">Unrecorded</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Forecast</span>
                    <span className="text-slate-300 font-semibold">{forecast !== null ? `${forecast}${def.unit}` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Previous</span>
                    <span className="text-slate-300 font-semibold">{previous !== null ? `${previous}${def.unit}` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Surprise</span>
                    {surprise !== null ? (
                      <span className={`font-bold inline-flex items-center gap-0.5 ${surprise > 0 ? 'text-emerald-400' : surprise < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {surprise > 0 ? <TrendingUp className="w-3 h-3" /> : surprise < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        <span>{surprise > 0 ? `+${surprise}` : surprise}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Z-Score</span>
                    {zScore !== null ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${zScore > 1 ? 'bg-emerald-500/20 text-emerald-300' : zScore < -1 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
                        {zScore > 0 ? `+${zScore}σ` : `${zScore}σ`}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Change</span>
                    <span className="text-slate-300">{change !== null ? (change > 0 ? `+${change}` : change) : '—'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono-code pt-0.5">
                  <a
                    href={def.officialSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 underline font-semibold"
                  >
                    <span>Source: {def.officialSourceName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CUSTOM FUNDAMENTAL INDICATORS */}
      <div className="bg-slate-950/80 border border-amber-500/20 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-military font-bold text-slate-100 uppercase">Custom Fundamental Indicators</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Your own items stay separate from the official 81-indicator registry and can also use Generate/Regenerate.</p>
          </div>
          <button
            type="button"
            onClick={() => openCustomEditor()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-military font-bold transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> ADD CUSTOM ITEM
          </button>
        </div>
        {customIndicators.length === 0 ? (
          <div className="p-5 text-xs text-slate-500 font-mono-code">No custom indicators yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead className="bg-[#0c1222] text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Currency / Indicator</th><th className="p-3 text-right">Actual</th><th className="p-3 text-right">Forecast</th><th className="p-3 text-right">Previous</th><th className="p-3 text-center">Status</th><th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customIndicators.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40">
                    <td className="p-3">
                      <div className="flex items-center gap-2"><span>{CURRENCY_METADATA[item.currency]?.flag}</span><button type="button" onClick={() => onSelectCurrency(item.currency)} className="text-cyan-300 font-bold">{item.currency}</button><span className="text-slate-100 font-bold">{item.shortLabel}</span></div>
                      <span className="text-[10px] text-slate-400">{item.name}</span>
                    </td>
                    <td className="p-3 text-right text-slate-100">{item.actual ?? '—'} {item.actual !== null ? item.unit : ''}</td>
                    <td className="p-3 text-right text-slate-400">{item.forecast ?? '—'}</td>
                    <td className="p-3 text-right text-slate-400">{item.previous ?? '—'}</td>
                    <td className="p-3 text-center"><span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-300">{item.verificationStatus || 'MANUAL'}</span></td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button type="button" onClick={() => handleGenerateCustom(item, 'GENERATE')} disabled={generatingId === item.id || batchState.running} className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold disabled:opacity-40">Generate</button>
                        <button type="button" onClick={() => handleGenerateCustom(item, 'REGENERATE')} disabled={generatingId === item.id || batchState.running} className="px-2 py-1 rounded-lg bg-slate-900 text-cyan-300 border border-slate-700 text-[10px] font-bold disabled:opacity-40">Regenerate</button>
                        <button type="button" onClick={() => openCustomEditor(item)} className="p-1.5 rounded-lg bg-slate-900 text-cyan-400 border border-slate-800"><Edit3 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Custom Indicator Modal */}
      {isAddingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsAddingCustom(false); }}>
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0a0f1d] border border-amber-500/30 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-military font-bold text-base">Add / Edit Custom Indicator</h3>
                <p className="text-[10px] text-slate-500 mt-1">Custom items do not change the official 81-indicator registry count.</p>
              </div>
              <button type="button" aria-label="Close custom indicator window" onClick={() => setIsAddingCustom(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700"><X className="w-4 h-4" />Close</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-code">
              <label className="space-y-1"><span className="text-slate-400">Currency</span><select value={customForm.currency} onChange={(e) => setCustomForm({ ...customForm, currency: e.target.value as CurrencyCode })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5"><option>USD</option><option>EUR</option><option>GBP</option><option>JPY</option><option>CHF</option><option>CAD</option><option>AUD</option><option>NZD</option></select></label>
              <label className="space-y-1"><span className="text-slate-400">Short Label</span><input value={customForm.shortLabel} onChange={(e) => setCustomForm({ ...customForm, shortLabel: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
              <label className="space-y-1 sm:col-span-2"><span className="text-slate-400">Indicator Name</span><input value={customForm.name} onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
              <label className="space-y-1"><span className="text-slate-400">Category</span><select value={customForm.category} onChange={(e) => setCustomForm({ ...customForm, category: e.target.value as IndicatorCategory })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5"><option value="INFLATION">Inflation</option><option value="EMPLOYMENT">Employment</option><option value="GROWTH">Growth</option><option value="BUSINESS_ACTIVITY">Business Activity</option><option value="MONETARY_POLICY">Monetary Policy</option><option value="RATES_YIELDS">Rates / Yields</option><option value="CONSUMER">Consumer</option><option value="TRADE_EXTERNAL">Trade / External</option><option value="HOUSING">Housing</option><option value="FISCAL">Fiscal</option><option value="CUSTOM">Custom</option></select></label>{(customForm.category as string) === 'CUSTOM' && <label className="space-y-1"><span className="text-slate-400">Custom Category Name</span><input value={customCategoryName} onChange={(e) => setCustomCategoryName(e.target.value)} placeholder="Type your category name" className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>}
              <label className="space-y-1"><span className="text-slate-400">Unit</span><input value={customForm.unit} onChange={(e) => setCustomForm({ ...customForm, unit: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
              <label className="space-y-1"><span className="text-slate-400">Actual</span><input type="number" step="any" value={customForm.actual} onChange={(e) => setCustomForm({ ...customForm, actual: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
              <label className="space-y-1"><span className="text-slate-400">Forecast</span><input type="number" step="any" value={customForm.forecast} onChange={(e) => setCustomForm({ ...customForm, forecast: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
              <label className="space-y-1"><span className="text-slate-400">Previous</span><input type="number" step="any" value={customForm.previous} onChange={(e) => setCustomForm({ ...customForm, previous: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
              <label className="space-y-1"><span className="text-slate-400">Reference Period</span><input value={customForm.referencePeriod} onChange={(e) => setCustomForm({ ...customForm, referencePeriod: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
              <label className="space-y-1"><span className="text-slate-400">Release Date</span><input type="date" value={customForm.releaseDate} onChange={(e) => setCustomForm({ ...customForm, releaseDate: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
              <label className="space-y-1 sm:col-span-2"><span className="text-slate-400">Source URL (optional)</span><input value={customForm.sourceUrl} onChange={(e) => setCustomForm({ ...customForm, sourceUrl: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
              <label className="space-y-1 sm:col-span-2"><span className="text-slate-400">Notes</span><textarea rows={2} value={customForm.notes} onChange={(e) => setCustomForm({ ...customForm, notes: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5" /></label>
            </div>
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800 sticky bottom-0 bg-[#0a0f1d]">
              <button type="button" onClick={() => setIsAddingCustom(false)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold">Cancel / Close</button>
              <div className="flex gap-2"><button type="button" onClick={() => setIsAddingCustom(false)} className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">Done</button><button type="button" onClick={saveCustomIndicator} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold">Save Custom Indicator</button></div>
            </div>
          </div>
        </div>
      )}

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

              {modalError && (
                <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs">
                  {modalError}
                </div>
              )}

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
