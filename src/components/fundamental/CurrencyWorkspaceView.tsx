import React, { useState, useRef, useEffect } from 'react';
import {
  CurrencyCode,
  IndicatorCategory,
  IndicatorObservation,
  CurrencyScoreResult,
  IndicatorDefinition,
} from '../../types/fundamentalIndicatorTypes';
import {
  HelpCircle,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Edit3,
  Compass,
  Activity,
  Users,
  RotateCcw,
} from 'lucide-react';
import { OFFICIAL_INDICATOR_REGISTRY, CURRENCY_METADATA } from '../../data/fundamentalRegistryData';
import { DEFAULT_INTEREST_RATES, DEFAULT_COT_RECORDS } from '../../data/defaultFundamentalObservations';
import { calculateCotMetrics } from '../../utils/fundamentalCalculationEngine';
import { InterestRateRecord } from '../../types/fundamentalIndicatorTypes';
import { generateIndicator } from '../../services/fundamentalLiveResearchService';

interface CurrencyWorkspaceViewProps {
  activeCurrency: CurrencyCode;
  onSelectCurrency: (curr: CurrencyCode) => void;
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  observations: IndicatorObservation[];
  onUpdateObservation: (updated: IndicatorObservation) => void;
  onOpenAuditModal: (scoreResult: CurrencyScoreResult) => void;
  onRequestAiExplanation: (currency: CurrencyCode) => void;
  onOpenIndicatorModal: (indicator: IndicatorDefinition) => void;
  interestRates?: InterestRateRecord[];
  onUpdateInterestRate?: (updated: InterestRateRecord) => void;
}

const CATEGORIES_NAV: { key: IndicatorCategory; label: string }[] = [
  { key: 'INFLATION', label: 'Inflation' },
  { key: 'EMPLOYMENT', label: 'Employment' },
  { key: 'GROWTH', label: 'Growth' },
  { key: 'BUSINESS_ACTIVITY', label: 'PMI' },
  { key: 'MONETARY_POLICY', label: 'Monetary Policy' },
  { key: 'RATES_YIELDS', label: 'Yields' },
  { key: 'CONSUMER', label: 'Consumer' },
  { key: 'TRADE_EXTERNAL', label: 'Trade' },
];

export const CurrencyWorkspaceView: React.FC<CurrencyWorkspaceViewProps> = ({
  activeCurrency,
  onSelectCurrency,
  currencyScores,
  observations,
  onUpdateObservation,
  onOpenAuditModal,
  onRequestAiExplanation,
  onOpenIndicatorModal,
  interestRates,
  onUpdateInterestRate,
}) => {
  const [activeCategory, setActiveCategory] = useState<IndicatorCategory>('INFLATION');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [editingObsId, setEditingObsId] = useState<string | null>(null);
  const [generatingIndicatorId, setGeneratingIndicatorId] = useState<string | null>(null);
  const [generateAllState, setGenerateAllState] = useState<{ running: boolean; completed: number; total: number; mode: 'GENERATE' | 'REGENERATE' }>({
    running: false,
    completed: 0,
    total: 0,
    mode: 'GENERATE',
  });
  const [liveResearchMessage, setLiveResearchMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    actual: string;
    forecast: string;
    previous: string;
    releaseDate: string;
    referencePeriod: string;
    notes: string;
  }>({ actual: '', forecast: '', previous: '', releaseDate: '', referencePeriod: '', notes: '' });

  // Policy Card Direct Edit State
  const [isEditingPolicyCard, setIsEditingPolicyCard] = useState(false);
  const [policyCardForm, setPolicyCardForm] = useState({
    currentPolicyRate: '',
    expectedNextRate: '',
    nextMeetingDate: '',
    centralBankBias: 'NEUTRAL' as 'HAWKISH' | 'NEUTRAL' | 'DOVISH',
    guidance: '',
  });

  // Category navigation scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollBoundaries = () => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 5);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScrollBoundaries();
    window.addEventListener('resize', checkScrollBoundaries);
    return () => window.removeEventListener('resize', checkScrollBoundaries);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = 240;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
      setTimeout(checkScrollBoundaries, 300);
    }
  };

  // Group indicators by category
  const indicatorsForCurrency = OFFICIAL_INDICATOR_REGISTRY.filter((i) => i.currency === activeCurrency);

  const currentCurrencyScore = currencyScores[activeCurrency];
  const meta = CURRENCY_METADATA[activeCurrency];
  const interestRateRec = (interestRates || DEFAULT_INTEREST_RATES).find((r) => r.currency === activeCurrency);
  const cotRec = DEFAULT_COT_RECORDS.find((r) => r.currency === activeCurrency);
  const cotMetrics = cotRec ? calculateCotMetrics(cotRec) : null;

  // Primary monetary policy indicator definition & observation
  const policyDef = indicatorsForCurrency.find(
    (i) => i.category === 'MONETARY_POLICY' || i.id.includes('POLICY_RATE') || i.id.includes('FED_FUNDS')
  );
  const policyObs = policyDef ? observations.find((o) => o.indicatorId === policyDef.id) : undefined;

  // 10Y sovereign yield observation
  const yield10YObs = observations.find(
    (o) =>
      o.currency === activeCurrency &&
      (o.indicatorId.includes('10Y') || o.indicatorId.includes('BUND') || o.indicatorId.includes('GILT') || o.indicatorId.includes('JGB') || o.indicatorId.includes('ACGB'))
  );

  // Dynamic values reactive to monetary policy indicator observation and interestRateRec
  const effectivePolicyRate =
    policyObs?.actual !== undefined && policyObs?.actual !== null
      ? policyObs.actual
      : (interestRateRec?.currentPolicyRate ?? 0);

  const effectiveNextMeetingDate =
    policyObs?.releaseDate || interestRateRec?.nextMeetingDate || 'TBD';

  const effectiveExpectedRate =
    policyObs?.forecast !== undefined && policyObs?.forecast !== null
      ? policyObs.forecast
      : (interestRateRec?.expectedNextRate ?? effectivePolicyRate);

  const effectiveYield10Y =
    yield10YObs?.actual !== undefined && yield10YObs?.actual !== null
      ? yield10YObs.actual
      : (interestRateRec?.yield10Y ?? 0);

  const effectiveBias: 'HAWKISH' | 'NEUTRAL' | 'DOVISH' =
    policyObs?.forecast !== null && policyObs?.forecast !== undefined && policyObs?.actual !== null && policyObs?.actual !== undefined
      ? (policyObs.forecast > policyObs.actual ? 'HAWKISH' : policyObs.forecast < policyObs.actual ? 'DOVISH' : (interestRateRec?.centralBankBias || 'NEUTRAL'))
      : (interestRateRec?.centralBankBias || 'NEUTRAL');

  const effectiveGuidance = policyObs?.notes || interestRateRec?.recentGuidance || 'Data-dependent policy calibration.';

  const handleOpenPolicyCardEdit = () => {
    setPolicyCardForm({
      currentPolicyRate: String(effectivePolicyRate),
      expectedNextRate: String(effectiveExpectedRate),
      nextMeetingDate: effectiveNextMeetingDate !== 'TBD' ? effectiveNextMeetingDate : new Date().toISOString().split('T')[0],
      centralBankBias: effectiveBias,
      guidance: effectiveGuidance,
    });
    setIsEditingPolicyCard(true);
  };

  const handleSavePolicyCardEdit = () => {
    const rateVal = parseFloat(policyCardForm.currentPolicyRate);
    if (isNaN(rateVal)) {
      alert('Please enter a valid numeric Current Policy Rate');
      return;
    }
    const expVal = policyCardForm.expectedNextRate ? parseFloat(policyCardForm.expectedNextRate) : rateVal;

    // Update observation for the policy rate indicator
    if (policyDef) {
      const updatedObs: IndicatorObservation = {
        id: policyObs?.id || `obs_${policyDef.id}_${Date.now()}`,
        indicatorId: policyDef.id,
        currency: activeCurrency,
        referencePeriod: policyObs?.referencePeriod || 'Current Period',
        releaseDate: policyCardForm.nextMeetingDate || new Date().toISOString().split('T')[0],
        actual: rateVal,
        forecast: isNaN(expVal) ? null : expVal,
        previous: policyObs?.previous ?? null,
        unit: '%',
        sourceUrl: policyDef.officialSourceUrl,
        notes: policyCardForm.guidance || undefined,
        updatedAt: new Date().toISOString(),
      };
      onUpdateObservation(updatedObs);
    }

    // Update interestRateRec
    if (onUpdateInterestRate && interestRateRec) {
      onUpdateInterestRate({
        ...interestRateRec,
        currentPolicyRate: rateVal,
        expectedNextRate: isNaN(expVal) ? rateVal : expVal,
        nextMeetingDate: policyCardForm.nextMeetingDate,
        centralBankBias: policyCardForm.centralBankBias,
        recentGuidance: policyCardForm.guidance,
        updatedAt: new Date().toISOString(),
      });
    }

    setIsEditingPolicyCard(false);
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [cat]: !prev[cat],
    }));
  };

  const handleStartEdit = (def: IndicatorDefinition, obs?: IndicatorObservation) => {
    setEditingObsId(def.id);
    setEditError(null);
    const isPolicy = def.category === 'MONETARY_POLICY' || def.id.includes('POLICY_RATE') || def.id.includes('FED_FUNDS');
    setEditForm({
      actual: obs?.actual !== undefined && obs?.actual !== null ? String(obs.actual) : '',
      forecast: obs?.forecast !== undefined && obs?.forecast !== null ? String(obs.forecast) : '',
      previous: obs?.previous !== undefined && obs?.previous !== null ? String(obs.previous) : '',
      releaseDate: obs?.releaseDate || (isPolicy ? (interestRateRec?.nextMeetingDate || '') : new Date().toISOString().split('T')[0]),
      referencePeriod: obs?.referencePeriod || 'Current Period',
      notes: obs?.notes || '',
    });
  };

  const handleSaveEdit = (def: IndicatorDefinition, existingObs?: IndicatorObservation) => {
    const act = parseFloat(editForm.actual);
    if (isNaN(act)) {
      setEditError('Please enter a valid numeric Actual value');
      return;
    }
    setEditError(null);

    const fcast = editForm.forecast ? parseFloat(editForm.forecast) : null;
    const prev = editForm.previous ? parseFloat(editForm.previous) : null;
    const isPolicy = def.category === 'MONETARY_POLICY' || def.id.includes('POLICY_RATE') || def.id.includes('FED_FUNDS');

    const updated: IndicatorObservation = {
      id: existingObs?.id || `obs_${def.id}_${Date.now()}`,
      indicatorId: def.id,
      currency: activeCurrency,
      referencePeriod: editForm.referencePeriod || existingObs?.referencePeriod || 'Current Period',
      releaseDate: editForm.releaseDate || existingObs?.releaseDate || new Date().toISOString().split('T')[0],
      actual: act,
      forecast: isNaN(fcast as any) ? null : fcast,
      previous: isNaN(prev as any) ? null : prev,
      unit: def.unit,
      sourceUrl: def.officialSourceUrl,
      notes: editForm.notes || undefined,
      updatedAt: new Date().toISOString(),
    };

    onUpdateObservation(updated);

    // If this is the monetary policy rate, synchronize with interest rates record
    if (isPolicy && onUpdateInterestRate && interestRateRec) {
      const nextMeeting = editForm.releaseDate || interestRateRec.nextMeetingDate;
      const expectedRate = fcast !== null && !isNaN(fcast) ? fcast : act;
      const bias: 'HAWKISH' | 'NEUTRAL' | 'DOVISH' =
        fcast !== null && !isNaN(fcast)
          ? fcast > act
            ? 'HAWKISH'
            : fcast < act
            ? 'DOVISH'
            : 'NEUTRAL'
          : interestRateRec.centralBankBias;

      onUpdateInterestRate({
        ...interestRateRec,
        currentPolicyRate: act,
        expectedNextRate: expectedRate,
        previousPolicyRate: prev !== null && !isNaN(prev) ? prev : interestRateRec.previousPolicyRate,
        nextMeetingDate: nextMeeting,
        centralBankBias: bias,
        recentGuidance: editForm.notes || interestRateRec.recentGuidance,
        updatedAt: new Date().toISOString(),
      });
    }

    setEditingObsId(null);
  };

  const handleGenerateIndicator = async (def: IndicatorDefinition, mode: 'GENERATE' | 'REGENERATE' = 'GENERATE') => {
    if (generatingIndicatorId || generateAllState.running) return;
    setGeneratingIndicatorId(def.id);
    setLiveResearchMessage(null);
    try {
      const existing = observations.find((observation) => observation.indicatorId === def.id);
      const result = await generateIndicator(def, existing, mode);
      if (result.status !== 'VERIFIED' || result.actual === null) {
        setLiveResearchMessage(result.notes || `${def.shortLabel}: no verified release was returned; existing data was preserved.`);
        return;
      }

      const updated: IndicatorObservation = {
        id: existing?.id || `obs_${def.id}_${Date.now()}`,
        indicatorId: def.id,
        currency: activeCurrency,
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
      };
      onUpdateObservation(updated);
      setLiveResearchMessage(`${def.shortLabel}: verified and updated from grounded web research.`);
    } catch (error) {
      setLiveResearchMessage(error instanceof Error ? error.message : 'Live research failed; existing data was preserved.');
    } finally {
      setGeneratingIndicatorId(null);
    }
  };

  const handleGenerateAllCurrentCurrency = async (mode: 'GENERATE' | 'REGENERATE' = 'GENERATE') => {
    if (generatingIndicatorId || generateAllState.running) return;
    const scoped = indicatorsForCurrency;
    setGenerateAllState({ running: true, completed: 0, total: scoped.length, mode });
    setLiveResearchMessage(null);
    try {
      for (let index = 0; index < scoped.length; index += 1) {
        const def = scoped[index];
        try {
          const existing = observations.find((observation) => observation.indicatorId === def.id);
          const result = await generateIndicator(def, existing, mode);
          if (result.status === 'VERIFIED' && result.actual !== null) {
            onUpdateObservation({
              id: existing?.id || `obs_${def.id}_${Date.now()}`,
              indicatorId: def.id,
              currency: activeCurrency,
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
        } catch {
          // One failed research item must not stop the remaining indicators.
        }
        setGenerateAllState((prev) => ({ ...prev, completed: index + 1 }));
      }
      setLiveResearchMessage(`${activeCurrency}: completed grounded research for ${scoped.length} indicators. Unverified items were left unchanged.`);
    } finally {
      setGenerateAllState((prev) => ({ ...prev, running: false }));
    }
  };

  const scrollToCategory = (cat: IndicatorCategory) => {
    setActiveCategory(cat);
    const element = document.getElementById(`category-section-${cat}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 8 Currency Selector Tabs */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 shadow-2xl overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {(Object.keys(CURRENCY_METADATA) as CurrencyCode[]).map((code) => {
            const cMeta = CURRENCY_METADATA[code];
            const cScore = currencyScores[code];
            const isActive = activeCurrency === code;
            const scoreVal = cScore?.score ?? 0;

            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelectCurrency(code)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition border text-left cursor-pointer ${
                  isActive
                    ? 'bg-blue-500/20 border-blue-500 text-cyan-300 shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="text-xl">{cMeta?.flag}</span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-military font-bold text-xs">{code}</span>
                    <span
                      className={`text-[10px] font-mono-code font-bold ${
                        scoreVal > 15
                          ? 'text-emerald-400'
                          : scoreVal < -15
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {scoreVal > 0 ? `+${scoreVal}` : scoreVal}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-code text-slate-500 block truncate max-w-[80px]">
                    {cMeta?.centralBankShort}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Currency Header Banner & Score Card */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5">
            <span className="text-4xl">{meta?.flag}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40">
                  {activeCurrency} WORKSPACE
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  Central Bank: {meta?.centralBank} ({meta?.centralBankShort})
                </span>
              </div>
              <h2 className="text-xl font-military font-bold text-slate-100 tracking-wide mt-1">
                {meta?.name} Fundamental Profile
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Transparent "Why?" Button */}
            <button
              type="button"
              onClick={() => onOpenAuditModal(currentCurrencyScore)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-military font-bold transition shadow cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span>TRANSPARENT "WHY?" AUDIT</span>
            </button>

            {/* AI Explanation Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={generateAllState.running}
                onClick={() => handleGenerateAllCurrentCurrency('GENERATE')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-military font-bold transition shadow-md shadow-emerald-500/20 cursor-pointer"
                title="Sequentially research every indicator belonging to the selected currency"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generateAllState.running ? `${generateAllState.completed}/${generateAllState.total}` : `GENERATE ${activeCurrency}`}</span>
              </button>
              <button
                type="button"
                disabled={generateAllState.running}
                onClick={() => handleGenerateAllCurrentCurrency('REGENERATE')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-cyan-300 border border-cyan-500/30 text-xs font-military font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>REGENERATE</span>
              </button>
              <button
                type="button"
                onClick={() => onRequestAiExplanation(activeCurrency)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>AI MACRO EXPLANATION</span>
              </button>
            </div>
          </div>
        </div>

        {/* Currency Quick Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Composite Fundamental Score</span>
            <div
              className={`text-2xl font-bold font-military mt-1 ${
                (currentCurrencyScore?.score ?? 0) > 15
                  ? 'text-emerald-400'
                  : (currentCurrencyScore?.score ?? 0) < -15
                  ? 'text-rose-400'
                  : 'text-slate-200'
              }`}
            >
              {(currentCurrencyScore?.score ?? 0) > 0 ? `+${currentCurrencyScore?.score}` : currentCurrencyScore?.score ?? 0}
              <span className="text-xs text-slate-500 font-mono-code font-normal"> / 100</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Model Bias & Regime</span>
            <div className="text-xs font-bold font-military text-cyan-300 mt-2 uppercase truncate">
              {currentCurrencyScore?.assessmentLabel || 'CALCULATING...'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Data Freshness & Coverage</span>
            <div className="text-xs font-bold text-emerald-400 mt-2">
              {currentCurrencyScore?.dataCoveragePercent ?? 100}% Verified • {currentCurrencyScore?.freshnessStatus}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase block">Active Indicators Count</span>
            <div className="text-xs font-bold text-slate-200 mt-2">
              {currentCurrencyScore?.completedIndicators ?? 0} of {currentCurrencyScore?.totalIndicators ?? 0} Tracked
            </div>
          </div>
        </div>

        {liveResearchMessage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-900/70 border border-cyan-500/20 text-[11px] font-mono-code text-slate-300">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span><strong className="text-cyan-300">GROUND-VERIFIED RESEARCH:</strong> {liveResearchMessage}</span>
          </div>
        )}

        {/* Central Bank Policy Card (Mandatory Section 13) */}
        {interestRateRec && (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-blue-500/30 space-y-2 text-xs font-mono-code">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                <span className="font-military font-bold text-slate-100 uppercase">
                  {meta?.centralBank} ({meta?.centralBankShort}) Policy Status
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    effectiveBias === 'HAWKISH'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : effectiveBias === 'DOVISH'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {effectiveBias} STANCE
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPolicyCardEdit}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-blue-500/30 text-[11px] font-military font-bold transition cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Update Policy & Meeting</span>
                </button>

                <a
                  href={interestRateRec.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 text-[11px] underline font-semibold"
                >
                  <span>Central Bank Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Direct Edit Form */}
            {isEditingPolicyCard ? (
              <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/40 space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-military font-bold text-xs">
                    UPDATE CENTRAL BANK POLICY & NEXT MEETING ({activeCurrency})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Syncs with Monetary Policy Indicator & Rates Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Current Policy Rate (%) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={policyCardForm.currentPolicyRate}
                      onChange={(e) => setPolicyCardForm({ ...policyCardForm, currentPolicyRate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono-code font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Expected Next Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={policyCardForm.expectedNextRate}
                      onChange={(e) => setPolicyCardForm({ ...policyCardForm, expectedNextRate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono-code"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">
                      Next Meeting Date <span className="text-cyan-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={policyCardForm.nextMeetingDate}
                      onChange={(e) => setPolicyCardForm({ ...policyCardForm, nextMeetingDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono-code font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Policy Stance / Bias</label>
                    <select
                      value={policyCardForm.centralBankBias}
                      onChange={(e) =>
                        setPolicyCardForm({
                          ...policyCardForm,
                          centralBankBias: e.target.value as 'HAWKISH' | 'NEUTRAL' | 'DOVISH',
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono-code"
                    >
                      <option value="HAWKISH">HAWKISH (Tightening / Restrictive)</option>
                      <option value="NEUTRAL">NEUTRAL (Balanced Hold)</option>
                      <option value="DOVISH">DOVISH (Easing / Rate Cuts)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Forward Guidance / Meeting Outlook</label>
                  <input
                    type="text"
                    value={policyCardForm.guidance}
                    onChange={(e) => setPolicyCardForm({ ...policyCardForm, guidance: e.target.value })}
                    placeholder="e.g. Committed to returning inflation sustainably to 2.0% target..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingPolicyCard(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-military font-bold text-xs hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePolicyCardEdit}
                    className="px-4 py-1.5 rounded-lg bg-blue-500 text-slate-950 font-military font-bold text-xs hover:bg-cyan-400 cursor-pointer shadow-md"
                  >
                    Save & Recalculate
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Current Policy Rate:</span>
                    <span className="text-slate-100 font-bold text-sm">{effectivePolicyRate.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Next Meeting Date:</span>
                    <span className="text-cyan-300 font-bold text-sm">{effectiveNextMeetingDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Expected Next Rate:</span>
                    <span className="text-slate-200 font-bold">{effectiveExpectedRate.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">10Y Benchmark Yield:</span>
                    <span className="text-cyan-300 font-bold">{effectiveYield10Y.toFixed(2)}%</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 pt-1">
                  <strong>Guidance:</strong> {effectiveGuidance}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: CATEGORY NAVIGATION HORIZONTAL SCROLLER WITH ARROWS */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 shadow-2xl flex items-center gap-2">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          disabled={!canScrollLeft}
          className={`p-2 rounded-xl border transition ${
            canScrollLeft
              ? 'bg-slate-900 border-slate-700 text-cyan-400 hover:bg-slate-800 cursor-pointer'
              : 'bg-slate-950 border-slate-800/40 text-slate-600 cursor-not-allowed'
          }`}
          title="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollBoundaries}
          className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 flex-1 scroll-smooth"
        >
          {CATEGORIES_NAV.map((cat) => {
            const isActive = activeCategory === cat.key;
            const catScore = currentCurrencyScore?.categoryScores?.[cat.key]?.score;

            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => scrollToCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono-code whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-500/20 border-cyan-500 text-cyan-300 font-bold shadow-md shadow-blue-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                {catScore !== undefined && (
                  <span
                    className={`text-[10px] font-bold ${
                      catScore > 15
                        ? 'text-emerald-400'
                        : catScore < -15
                        ? 'text-rose-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {catScore > 0 ? `+${catScore}` : catScore}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          disabled={!canScrollRight}
          className={`p-2 rounded-xl border transition ${
            canScrollRight
              ? 'bg-slate-900 border-slate-700 text-cyan-400 hover:bg-slate-800 cursor-pointer'
              : 'bg-slate-950 border-slate-800/40 text-slate-600 cursor-not-allowed'
          }`}
          title="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Categories & Indicators Table */}
      <div className="space-y-5">
        {CATEGORIES_NAV.map((catItem) => {
          const category = catItem.key;
          const categoryIndicators = indicatorsForCurrency.filter((ind) => ind.category === category);
          if (categoryIndicators.length === 0) return null;

          const catScoreResult = currentCurrencyScore?.categoryScores?.[category];
          const isCollapsed = !!collapsedCategories[category];

          return (
            <div
              key={category}
              id={`category-section-${category}`}
              className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl scroll-mt-20"
            >
              {/* Category Header Bar */}
              <div
                onClick={() => toggleCategory(category)}
                className="flex items-center justify-between p-4 bg-[#0c1222] border-b border-slate-800/80 cursor-pointer hover:bg-[#10172c] transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </span>
                  <div>
                    <span className="font-military font-bold text-sm text-slate-100 uppercase tracking-wider">
                      {catScoreResult?.categoryLabel || catItem.label}
                    </span>
                    <span className="text-xs font-mono-code text-slate-400 ml-2">
                      ({categoryIndicators.length} indicators • {catScoreResult?.weight || 0}% model weight)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono-code text-xs">
                    <span className="text-slate-400 mr-2 text-[11px]">Category Score:</span>
                    <span
                      className={`font-military font-bold text-sm px-2 py-0.5 rounded ${
                        (catScoreResult?.score ?? 0) > 15
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : (catScoreResult?.score ?? 0) < -15
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {(catScoreResult?.score ?? 0) > 0 ? `+${catScoreResult?.score}` : catScoreResult?.score ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Indicators Table */}
              {!isCollapsed && (
                <>
                  <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono-code">
                    <thead className="bg-[#0b1120] text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                      <tr>
                        <th className="p-3">Indicator / Measurement</th>
                        <th className="p-3 text-right">Actual</th>
                        <th className="p-3 text-right">Forecast</th>
                        <th className="p-3 text-right">Previous</th>
                        <th className="p-3 text-right">Surprise</th>
                        <th className="p-3 text-right">Change</th>
                        <th className="p-3 text-center">Score (-100..+100)</th>
                        <th className="p-3 text-center">Official Source</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                      {categoryIndicators.map((def) => {
                        const obs = observations.find((o) => o.indicatorId === def.id);
                        const isEditing = editingObsId === def.id;

                        const actualVal = obs?.actual !== undefined ? obs.actual : null;
                        const forecastVal = obs?.forecast !== undefined ? obs.forecast : null;
                        const previousVal = obs?.previous !== undefined ? obs.previous : null;

                        const surprise =
                          actualVal !== null && forecastVal !== null ? Number((actualVal - forecastVal).toFixed(3)) : null;
                        const change =
                          actualVal !== null && previousVal !== null ? Number((actualVal - previousVal).toFixed(3)) : null;

                        const indScore = catScoreResult?.indicatorScores?.find((s) => s.indicatorId === def.id);

                        return (
                          <React.Fragment key={def.id}>
                            <tr className="hover:bg-slate-900/40 transition">
                              <td className="p-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-military font-bold text-xs text-slate-100">
                                      {def.shortLabel}
                                    </span>
                                    {/* Measurement period badge */}
                                    <span className="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-300">
                                      {def.measurementPeriod}
                                    </span>
                                    {/* Required Tag (Mandatory Section 11) */}
                                    {def.required ? (
                                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                        Required
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px]">
                                        Optional
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-400 block truncate max-w-[280px]">
                                    {def.name}
                                  </span>
                                </div>
                              </td>

                              <td className="p-3 text-right">
                                {actualVal !== null ? (
                                  <span className="font-bold text-slate-100 text-sm">
                                    {actualVal}
                                    <span className="text-slate-500 text-[10px] ml-0.5">{def.unit}</span>
                                  </span>
                                ) : (
                                  <span className="text-amber-400 italic text-[11px]">Unrecorded</span>
                                )}
                              </td>

                              <td className="p-3 text-right text-slate-400">
                                {forecastVal !== null ? `${forecastVal}${def.unit}` : '—'}
                              </td>

                              <td className="p-3 text-right text-slate-400">
                                {previousVal !== null ? `${previousVal}${def.unit}` : '—'}
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

                              <td className="p-3 text-right text-slate-400">
                                {change !== null ? (change > 0 ? `+${change}` : change) : '—'}
                              </td>

                              <td className="p-3 text-center">
                                {indScore ? (
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      indScore.normalizedScore > 15
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : indScore.normalizedScore < -15
                                        ? 'bg-rose-500/20 text-rose-300'
                                        : 'bg-slate-800 text-slate-300'
                                    }`}
                                  >
                                    {indScore.normalizedScore > 0 ? `+${indScore.normalizedScore}` : indScore.normalizedScore}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">—</span>
                                )}
                              </td>

                              {/* Prominent Button: Open Official Source ↗ (Mandatory Section 12) */}
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
                                    onClick={() => handleGenerateIndicator(def, 'GENERATE')}
                                    disabled={generatingIndicatorId === def.id || generateAllState.running}
                                    className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition cursor-pointer"
                                    title="Generate latest verified release"
                                  >
                                    {generatingIndicatorId === def.id ? '...' : 'Generate'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleGenerateIndicator(def, 'REGENERATE')}
                                    disabled={generatingIndicatorId === def.id || generateAllState.running}
                                    className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-cyan-300 border border-slate-700 text-[10px] font-bold transition cursor-pointer"
                                    title="Force a fresh web search and verification"
                                  >
                                    Regenerate
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(def, obs)}
                                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 transition cursor-pointer"
                                    title="Edit observation values"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Inline Edit Row */}
                            {isEditing && (
                              <tr className="bg-[#11192e] border-b border-cyan-500/30">
                                <td colSpan={9} className="p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-cyan-300 font-military font-bold text-xs">
                                      MANUAL DATA ENTRY: {def.name} ({def.measurementPeriod})
                                    </span>
                                    <span className="text-slate-400 text-[10px]">
                                      Verified Source: {def.officialSourceName}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                                    <div>
                                      <label className="text-slate-400 block mb-1">
                                        {def.category === 'MONETARY_POLICY' || def.id.includes('POLICY_RATE') || def.id.includes('FED_FUNDS')
                                          ? 'Current Rate (%)'
                                          : 'Actual'}{' '}
                                        <span className="text-rose-400">*</span>
                                      </label>
                                      <input
                                        type="number"
                                        step="any"
                                        value={editForm.actual}
                                        onChange={(e) => setEditForm({ ...editForm, actual: e.target.value })}
                                        placeholder={`e.g. 2.4 (${def.unit})`}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 font-bold focus:outline-none focus:border-cyan-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-slate-400 block mb-1">
                                        {def.category === 'MONETARY_POLICY' || def.id.includes('POLICY_RATE') || def.id.includes('FED_FUNDS')
                                          ? 'Expected Next Rate (%)'
                                          : 'Forecast / Consensus'}
                                      </label>
                                      <input
                                        type="number"
                                        step="any"
                                        value={editForm.forecast}
                                        onChange={(e) => setEditForm({ ...editForm, forecast: e.target.value })}
                                        placeholder={`e.g. 2.2 (${def.unit})`}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-slate-400 block mb-1">Previous Period</label>
                                      <input
                                        type="number"
                                        step="any"
                                        value={editForm.previous}
                                        onChange={(e) => setEditForm({ ...editForm, previous: e.target.value })}
                                        placeholder={`e.g. 2.1 (${def.unit})`}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-slate-400 block mb-1">Notes / Guidance</label>
                                      <input
                                        type="text"
                                        value={editForm.notes}
                                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                        placeholder="Headline beat, core sticky, guidance..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                                      />
                                    </div>
                                  </div>

                                  {editError && (
                                    <div className="p-2 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs">
                                      {editError}
                                    </div>
                                  )}

                                  <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingObsId(null)}
                                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-military font-bold text-xs hover:bg-slate-700 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEdit(def, obs)}
                                      className="px-4 py-1.5 rounded-lg bg-blue-500 text-slate-950 font-military font-bold text-xs hover:bg-cyan-400 cursor-pointer shadow-md"
                                    >
                                      Save & Recalculate
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Touch-Optimized Cards View (Visible on small screens) */}
                <div className="block md:hidden divide-y divide-slate-800/60 bg-slate-950/40">
                  {categoryIndicators.map((def) => {
                    const obs = observations.find((o) => o.indicatorId === def.id);
                    const isEditing = editingObsId === def.id;

                    const actualVal = obs?.actual !== undefined ? obs.actual : null;
                    const forecastVal = obs?.forecast !== undefined ? obs.forecast : null;
                    const previousVal = obs?.previous !== undefined ? obs.previous : null;

                    const surprise =
                      actualVal !== null && forecastVal !== null ? Number((actualVal - forecastVal).toFixed(3)) : null;
                    const change =
                      actualVal !== null && previousVal !== null ? Number((actualVal - previousVal).toFixed(3)) : null;

                    const indScore = catScoreResult?.indicatorScores?.find((s) => s.indicatorId === def.id);

                    return (
                      <div key={def.id} className="p-3.5 space-y-3">
                        {/* Mobile Card Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-military font-bold text-sm text-slate-100">{def.shortLabel}</span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-cyan-300 font-mono-code">
                                {def.measurementPeriod}
                              </span>
                              {def.required ? (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                  Required
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[9px]">
                                  Optional
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 block mt-0.5">{def.name}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => (isEditing ? setEditingObsId(null) : handleStartEdit(def, obs))}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-cyan-300 border border-blue-500/30 text-xs font-military font-bold transition shrink-0 cursor-pointer min-h-[36px]"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isEditing ? 'Close' : 'Edit'}</span>
                          </button>
                        </div>

                        {/* Mobile Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 text-xs font-mono-code bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Actual</span>
                            {actualVal !== null ? (
                              <span className="font-bold text-slate-100 text-sm">
                                {actualVal} <span className="text-slate-500 text-[10px] font-normal">{def.unit}</span>
                              </span>
                            ) : (
                              <span className="text-amber-400/80 italic text-xs">Unrecorded</span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Forecast</span>
                            <span className="text-slate-300 font-semibold">{forecastVal !== null ? `${forecastVal}${def.unit}` : '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Previous</span>
                            <span className="text-slate-300 font-semibold">{previousVal !== null ? `${previousVal}${def.unit}` : '—'}</span>
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
                            <span className="text-[10px] text-slate-500 block uppercase">Change</span>
                            <span className="text-slate-300">{change !== null ? (change > 0 ? `+${change}` : change) : '—'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase">Score</span>
                            {indScore ? (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${indScore.normalizedScore > 15 ? 'bg-emerald-500/20 text-emerald-300' : indScore.normalizedScore < -15 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
                                {indScore.normalizedScore > 0 ? `+${indScore.normalizedScore}` : indScore.normalizedScore}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </div>
                        </div>

                        {/* Official Agency Source */}
                        <div className="flex items-center justify-between text-[11px] font-mono-code pt-0.5">
                          <a
                            href={def.officialSourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 underline font-semibold"
                          >
                            <span>Official: {def.officialSourceName}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        {/* Mobile Direct Edit Form */}
                        {isEditing && (
                          <div className="p-3.5 bg-slate-900 border border-cyan-500/40 rounded-xl space-y-3 mt-2 font-mono-code text-xs">
                            <div className="text-cyan-300 font-military font-bold text-xs uppercase tracking-wide">
                              EDIT VALUE: {def.shortLabel} ({def.measurementPeriod})
                            </div>

                            {editError && (
                              <div className="p-2 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs">
                                {editError}
                              </div>
                            )}

                            <div className="space-y-2.5">
                              <div>
                                <label className="text-slate-300 block mb-1 font-semibold">
                                  {def.category === 'MONETARY_POLICY' || def.id.includes('POLICY_RATE') || def.id.includes('FED_FUNDS')
                                    ? 'Current Rate (%)'
                                    : 'Actual'}{' '}
                                  <span className="text-rose-400">*</span>
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={editForm.actual}
                                  onChange={(e) => setEditForm({ ...editForm, actual: e.target.value })}
                                  placeholder={`e.g. 2.4 (${def.unit})`}
                                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-bold focus:outline-none focus:border-cyan-500 text-sm"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-slate-300 block mb-1">
                                    {def.category === 'MONETARY_POLICY' || def.id.includes('POLICY_RATE') || def.id.includes('FED_FUNDS')
                                      ? 'Expected Next Rate (%)'
                                      : 'Forecast'}
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={editForm.forecast}
                                    onChange={(e) => setEditForm({ ...editForm, forecast: e.target.value })}
                                    placeholder={`e.g. 2.2`}
                                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500 text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-slate-300 block mb-1">Previous</label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={editForm.previous}
                                    onChange={(e) => setEditForm({ ...editForm, previous: e.target.value })}
                                    placeholder={`e.g. 2.1`}
                                    className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500 text-sm"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-slate-300 block mb-1">Notes / Guidance</label>
                                <input
                                  type="text"
                                  value={editForm.notes}
                                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                  placeholder="Headline beat, core sticky..."
                                  className="w-full min-h-[44px] bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-500 text-sm"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => setEditingObsId(null)}
                                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 font-military font-bold text-xs hover:bg-slate-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(def, obs)}
                                className="min-h-[44px] px-4 py-2 rounded-lg bg-blue-500 text-slate-950 font-military font-bold text-xs hover:bg-cyan-400 cursor-pointer shadow-md"
                              >
                                Save & Recalculate
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
};
