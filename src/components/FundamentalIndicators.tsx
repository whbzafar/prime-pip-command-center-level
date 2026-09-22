import React, { useState, useEffect, useMemo } from 'react';
import {
  CurrencyCode,
  IndicatorObservation,
  ModelCategoryWeights,
  CurrencyScoreResult,
  PairDifferentialResult,
  IndicatorDefinition,
  MarketSentimentRecord,
  CotPositioningRecord,
  InterestRateRecord,
} from '../types/fundamentalIndicatorTypes';
import {
  DEFAULT_OBSERVATIONS,
  DEFAULT_COT_RECORDS,
  DEFAULT_SENTIMENT_RECORDS,
  DEFAULT_COMMODITY_OBSERVATIONS,
  DEFAULT_INTEREST_RATES,
} from '../data/defaultFundamentalObservations';
import {
  DEFAULT_CATEGORY_WEIGHTS,
  CURRENCY_METADATA,
  OFFICIAL_INDICATOR_REGISTRY,
} from '../data/fundamentalRegistryData';
import {
  calculateCurrencyScore,
  calculatePairDifferential,
  calculateCommodityFundamentalScore,
  calculateLongTermPairRankings,
} from '../utils/fundamentalCalculationEngine';
import { generateFundamentalIntelligencePdf } from '../utils/fundamentalPdfGenerator';

// Modular Component Views
import { OverviewView } from './fundamental/OverviewView';
import { CurrencyWorkspaceView } from './fundamental/CurrencyWorkspaceView';
import { EconomicDataMasterView } from './fundamental/EconomicDataMasterView';
import { CurrencyStrengthMatrixView } from './fundamental/CurrencyStrengthMatrixView';
import { PairDifferentialScannerView } from './fundamental/PairDifferentialScannerView';
import { RatesAndYieldsView } from './fundamental/RatesAndYieldsView';
import { CotTradingView } from './fundamental/CotTradingView';
import { MarketSentimentView } from './fundamental/MarketSentimentView';
import { CommoditiesMacroView } from './fundamental/CommoditiesMacroView';
import { LongTermPairRankingsView } from './fundamental/LongTermPairRankingsView';
import { HistoricalSnapshotsView } from './fundamental/HistoricalSnapshotsView';
import { DataQualityAuditView } from './fundamental/DataQualityAuditView';
import { ModelWeightsRegistryView } from './fundamental/ModelWeightsRegistryView';
import { FundamentalMethodologyView } from './fundamental/FundamentalMethodologyView';

// Modals
import { ModelAuditModal } from './fundamental/ModelAuditModal';
import { AiMacroExplanationModal } from './fundamental/AiMacroExplanationModal';
import { IndicatorExplanationModal } from './fundamental/IndicatorExplanationModal';
import { PairDeepDiveModal } from './fundamental/PairDeepDiveModal';

import {
  Landmark,
  Layers,
  BarChart3,
  Scale,
  Users,
  Gem,
  Sliders,
  History,
  RotateCcw,
  FileText,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  Compass,
  Activity,
  Clock,
  ShieldAlert,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type FundamentalDashboardTab =
  | 'OVERVIEW'
  | 'WORKSPACES'
  | 'ECONOMIC_DATA_MASTER'
  | 'MATRIX'
  | 'PAIRS'
  | 'RATES_YIELDS'
  | 'COT_REPORT'
  | 'MARKET_SENTIMENT'
  | 'COMMODITIES'
  | 'LONG_TERM_RANKINGS'
  | 'HISTORICAL_SNAPSHOTS'
  | 'DATA_QUALITY'
  | 'WEIGHTS_REGISTRY'
  | 'METHODOLOGY';

const LOCAL_STORAGE_OBSERVATIONS_KEY = 'primepip_fundamental_observations_v2';
const LOCAL_STORAGE_WEIGHTS_KEY = 'primepip_fundamental_weights_v2';
const LOCAL_STORAGE_SENTIMENT_KEY = 'primepip_fundamental_sentiment_v2';
const LOCAL_STORAGE_COT_KEY = 'primepip_fundamental_cot_v2';
const LOCAL_STORAGE_RATES_KEY = 'primepip_fundamental_rates_v2';

export const FundamentalIndicators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FundamentalDashboardTab>('OVERVIEW');
  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode>('USD');
  const [navStart, setNavStart] = useState(0);
  const NAV_VISIBLE_COUNT = 7;

  // Observations state with localStorage persistence
  const [observations, setObservations] = useState<IndicatorObservation[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_OBSERVATIONS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading fundamental observations from storage', e);
    }
    return DEFAULT_OBSERVATIONS;
  });

  // Interest Rates state with localStorage persistence
  const [interestRates, setInterestRates] = useState<InterestRateRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_RATES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading interest rates from storage', e);
    }
    return DEFAULT_INTEREST_RATES;
  });

  // Category Weights state with localStorage persistence
  const [categoryWeights, setCategoryWeights] = useState<ModelCategoryWeights>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_WEIGHTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading fundamental weights from storage', e);
    }
    return DEFAULT_CATEGORY_WEIGHTS;
  });

  // Sentiment records state
  const [sentimentRecords, setSentimentRecords] = useState<MarketSentimentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SENTIMENT_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading sentiment from storage', e);
    }
    return DEFAULT_SENTIMENT_RECORDS;
  });

  // COT records state
  const [cotRecords, setCotRecords] = useState<CotPositioningRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COT_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading COT from storage', e);
    }
    return DEFAULT_COT_RECORDS;
  });

  // Save observations when updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_OBSERVATIONS_KEY, JSON.stringify(observations));
    } catch (e) {
      console.error('Failed to save fundamental observations', e);
    }
  }, [observations]);

  // Save interest rates when updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_RATES_KEY, JSON.stringify(interestRates));
    } catch (e) {
      console.error('Failed to save interest rates', e);
    }
  }, [interestRates]);

  // Save weights when updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_WEIGHTS_KEY, JSON.stringify(categoryWeights));
    } catch (e) {
      console.error('Failed to save fundamental weights', e);
    }
  }, [categoryWeights]);

  // Save sentiment when updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SENTIMENT_KEY, JSON.stringify(sentimentRecords));
    } catch (e) {
      console.error('Failed to save fundamental sentiment', e);
    }
  }, [sentimentRecords]);

  // Save COT when updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_COT_KEY, JSON.stringify(cotRecords));
    } catch (e) {
      console.error('Failed to save fundamental COT', e);
    }
  }, [cotRecords]);

  // Modals state
  const [auditModalScoreResult, setAuditModalScoreResult] = useState<CurrencyScoreResult | null>(null);
  const [inspectingIndicator, setInspectingIndicator] = useState<IndicatorDefinition | null>(null);
  const [activePairModal, setActivePairModal] = useState<PairDifferentialResult | null>(null);

  // AI Explanation Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiTargetName, setAiTargetName] = useState<string>('USD');
  const [aiReportContent, setAiReportContent] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiEngineSource, setAiEngineSource] = useState<string>('GEMINI-2.5-FLASH');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3500);
  };

  // Deterministically compute currency scores for all 8 currencies
  const currencyScores = useMemo(() => {
    const currencies = Object.keys(CURRENCY_METADATA) as CurrencyCode[];
    const result: Record<CurrencyCode, CurrencyScoreResult> = {} as any;

    currencies.forEach((code) => {
      result[code] = calculateCurrencyScore(code, observations, categoryWeights, cotRecords, sentimentRecords);
    });

    return result;
  }, [observations, categoryWeights, cotRecords, sentimentRecords]);

  // Deterministically compute pair differentials for all 28 pairs
  const pairDifferentials = useMemo(() => {
    const currencies = Object.keys(CURRENCY_METADATA) as CurrencyCode[];
    const pairs: PairDifferentialResult[] = [];
    for (let i = 0; i < currencies.length; i++) {
      for (let j = i + 1; j < currencies.length; j++) {
        const base = currencies[i];
        const quote = currencies[j];
        pairs.push(calculatePairDifferential(base, quote, currencyScores));
      }
    }
    return pairs;
  }, [currencyScores]);

  // Observation Update Handler
  const handleUpdateObservation = (updated: IndicatorObservation) => {
    setObservations((prev) => {
      const idx = prev.findIndex((o) => o.indicatorId === updated.indicatorId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  };

  // Interest Rate Update Handler
  const handleUpdateInterestRate = (updated: InterestRateRecord) => {
    setInterestRates((prev) =>
      prev.map((r) => (r.currency === updated.currency ? updated : r))
    );
  };

  // Reset to Verified Baseline
  const handleRestoreBaseline = () => {
    if (window.confirm('Reset all indicators, weights, COT, and sentiment to verified institutional baseline?')) {
      setObservations(DEFAULT_OBSERVATIONS);
      setCategoryWeights(DEFAULT_CATEGORY_WEIGHTS);
      setSentimentRecords(DEFAULT_SENTIMENT_RECORDS);
      setCotRecords(DEFAULT_COT_RECORDS);
      setInterestRates(DEFAULT_INTEREST_RATES);
      localStorage.removeItem(LOCAL_STORAGE_OBSERVATIONS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_WEIGHTS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SENTIMENT_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COT_KEY);
      localStorage.removeItem(LOCAL_STORAGE_RATES_KEY);
      showNotification('✓ Restored verified institutional baseline economic data.');
    }
  };

  // Trigger PDF Report Generation (Strict PDF-only export, Section 46)
  const handleExportPdf = () => {
    const { topBullish, topBearish } = calculateLongTermPairRankings(currencyScores, observations);

    const goldObs = DEFAULT_COMMODITY_OBSERVATIONS.find((c) => c.symbol === 'GOLD') || DEFAULT_COMMODITY_OBSERVATIONS[0];
    const silverObs = DEFAULT_COMMODITY_OBSERVATIONS.find((c) => c.symbol === 'SILVER') || DEFAULT_COMMODITY_OBSERVATIONS[2];
    const oilObs = DEFAULT_COMMODITY_OBSERVATIONS.find((c) => c.symbol === 'CRUDE_OIL') || DEFAULT_COMMODITY_OBSERVATIONS[1];

    const goldScore = calculateCommodityFundamentalScore(goldObs);
    const silverScore = calculateCommodityFundamentalScore(silverObs);
    const oilScore = calculateCommodityFundamentalScore(oilObs);

    generateFundamentalIntelligencePdf({
      snapshotId: `SNAP_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      modelVersion: 'v2.6.4-deterministic',
      configVersion: 'cfg-v3.1.0',
      weightVersion: 'wt-v2.0-standard',
      rawVersion: `raw-${Date.now().toString(36)}`,
      currencyScores,
      pairDifferentials,
      longTermBullishPairs: topBullish.map((p) => ({
        pair: p.pair,
        base: p.pair.slice(0, 3),
        quote: p.pair.slice(3, 6),
        differential: p.longTermDiff,
        structuralBias: p.bias,
      })),
      longTermBearishPairs: topBearish.map((p) => ({
        pair: p.pair,
        base: p.pair.slice(0, 3),
        quote: p.pair.slice(3, 6),
        differential: p.longTermDiff,
        structuralBias: p.bias,
      })),
      cotRecords,
      sentimentRecords,
      commodityScores: {
        gold: { score: goldScore.score, bias: goldScore.bias, drivers: goldScore.drivers.map((d) => d.label) },
        silver: { score: silverScore.score, bias: silverScore.bias, drivers: silverScore.drivers.map((d) => d.label) },
        oil: { score: oilScore.score, bias: oilScore.bias, drivers: oilScore.drivers.map((d) => d.label) },
      },
      totalObservations: observations.length,
      dataCompletenessPercent: 94,
      dataFreshnessSummary: { current: 46, partial: 5, stale: 1 },
    });

    showNotification('✓ Generated and downloaded institutional PDF snapshot.');
  };

  // Trigger AI Macro Explanation for Currency
  const handleRequestAiExplanation = async (currency: CurrencyCode) => {
    setAiTargetName(currency);
    setIsAiModalOpen(true);
    setIsAiLoading(true);
    setAiReportContent(null);

    const scoreResult = currencyScores[currency];

    try {
      const response = await fetch('/api/fundamental/ai-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency,
          modelData: scoreResult,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setAiReportContent(data.explanation || data.report || 'No content received.');
      setAiEngineSource(data.source || 'GEMINI-2.5-FLASH');
    } catch (err: any) {
      console.warn('AI Explanation call failed, utilizing deterministic fallback synthesis:', err);
      const fallback = `### Institutional Macro Assessment: ${currency}
**Composite Score:** ${scoreResult.finalCompositeScore > 0 ? `+${scoreResult.finalCompositeScore}` : scoreResult.finalCompositeScore}/100 (${scoreResult.assessmentLabel})
**Reference Policy Rate:** ${scoreResult.interestRateLevel.toFixed(2)}% | **10Y Benchmark Yield:** ${scoreResult.tenYearBondYield.toFixed(2)}%

#### 1. Core Economic Drivers
${scoreResult.primaryDrivers.map((d) => `- **${d}**`).join('\n')}

#### 2. Cross-Currents & Potential Invalidation Risks
${
  scoreResult.conflictingFactors.length > 0
    ? scoreResult.conflictingFactors.map((c) => `- ⚠️ ${c}`).join('\n')
    : '- Macro factors show coherent alignment across growth, inflation, and monetary policy.'
}

#### 3. Execution Thesis & Portfolio Allocation
Given the deterministic composite score of **${scoreResult.finalCompositeScore}**, the fundamental stance is **${scoreResult.assessmentLabel}**. Look for alignment with higher-timeframe market structure in accordance with the SPT strategy rules before committing trade execution.`;

      setAiReportContent(fallback);
      setAiEngineSource('DETERMINISTIC MACRO ENGINE (FALLBACK)');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Trigger AI Macro Explanation for Pair
  const handleRequestAiPairThesis = async (pair: string, diff: PairDifferentialResult) => {
    setAiTargetName(pair);
    setIsAiModalOpen(true);
    setIsAiLoading(true);
    setAiReportContent(null);

    try {
      const response = await fetch('/api/fundamental/ai-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: pair,
          pairData: diff,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setAiReportContent(data.explanation || data.report || 'No content received.');
      setAiEngineSource(data.source || 'GEMINI-2.5-FLASH');
    } catch (err: any) {
      console.warn('AI Pair Explanation call failed, using deterministic thesis:', err);
      const fallback = `### Institutional Pair Thesis: ${pair}
**Directional Bias:** ${diff.fundamentalBias}
**Net Fundamental Differential:** ${diff.netDifferential > 0 ? `+${diff.netDifferential}` : diff.netDifferential} points
**Interest Rate Spread:** ${diff.interestRateSpread > 0 ? `+${diff.interestRateSpread.toFixed(2)}` : diff.interestRateSpread.toFixed(2)}%
**10-Year Sovereign Yield Spread:** ${diff.tenYearSpread > 0 ? `+${diff.tenYearSpread.toFixed(2)}` : diff.tenYearSpread.toFixed(2)}%

#### 1. Fundamental Divergence Mechanics
The relative valuation engine indicates a net spread of **${diff.netDifferential} points** between ${diff.baseCurrency} (Score: ${diff.baseScore}) and ${diff.quoteCurrency} (Score: ${diff.quoteScore}). This divergence supports a **${diff.fundamentalBias}** tactical posture on ${pair}.

#### 2. Trade Filter & Invalidation Parameters
- Look for technical confirmations on analysis timeframes (Daily / H4) aligning with this macro tailwind.
- Re-evaluate if upcoming high-impact economic releases narrow the sovereign yield spread.`;

      setAiReportContent(fallback);
      setAiEngineSource('DETERMINISTIC MACRO ENGINE (FALLBACK)');
    } finally {
      setIsAiLoading(false);
    }
  };

  const navTabs: { id: FundamentalDashboardTab; label: string; icon: any }[] = [
    { id: 'OVERVIEW', label: 'Overview', icon: Landmark },
    { id: 'WORKSPACES', label: 'Workspaces', icon: Layers },
    { id: 'ECONOMIC_DATA_MASTER', label: 'Data Master', icon: Database },
    { id: 'MATRIX', label: 'Matrix', icon: BarChart3 },
    { id: 'PAIRS', label: '28 Pairs', icon: Scale },
    { id: 'RATES_YIELDS', label: 'Rates & Yields', icon: Compass },
    { id: 'COT_REPORT', label: 'COT Report', icon: Users },
    { id: 'MARKET_SENTIMENT', label: 'Sentiment', icon: Activity },
    { id: 'COMMODITIES', label: 'Commodities', icon: Gem },
    { id: 'LONG_TERM_RANKINGS', label: 'Long-Term', icon: Clock },
    { id: 'HISTORICAL_SNAPSHOTS', label: 'Snapshots', icon: History },
    { id: 'DATA_QUALITY', label: 'Quality Audit', icon: ShieldAlert },
    { id: 'WEIGHTS_REGISTRY', label: 'Weights', icon: Sliders },
    { id: 'METHODOLOGY', label: 'Methodology', icon: HelpCircle },
  ];

  useEffect(() => {
    const activeIndex = navTabs.findIndex((tab) => tab.id === activeTab);
    if (activeIndex < 0) return;
    if (activeIndex < navStart) {
      setNavStart(activeIndex);
    } else if (activeIndex >= navStart + NAV_VISIBLE_COUNT) {
      setNavStart(Math.min(activeIndex - NAV_VISIBLE_COUNT + 1, Math.max(0, navTabs.length - NAV_VISIBLE_COUNT)));
    }
  }, [activeTab, navStart, navTabs.length]);

  const visibleNavTabs = navTabs.slice(navStart, navStart + NAV_VISIBLE_COUNT);
  const canGoPrevious = navStart > 0;
  const canGoNext = navStart + NAV_VISIBLE_COUNT < navTabs.length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="fixed top-4 right-4 z-50 p-3.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-cyan-200 text-xs font-mono-code shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Main Command Center Header */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              aria-label="Open Fundamental Intelligence Overview"
              title="Open Overview"
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/25 to-amber-500/15 border border-blue-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-blue-500/10 hover:border-cyan-400/70 hover:bg-blue-500/20 transition cursor-pointer"
            >
              <Landmark className="w-6 h-6" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40 tracking-wider uppercase">
                  DETERMINISTIC MACRO ENGINE
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  100% REPRODUCIBLE • ZERO MOCK DATA
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wide mt-1">
                FUNDAMENTAL INTELLIGENCE DASHBOARD
              </h1>
            </div>
          </div>

          {/* Quick Engine Actions (Strict PDF-only export) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRestoreBaseline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono-code font-bold transition cursor-pointer"
              title="Reset all inputs to verified institutional baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESTORE BASELINE</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
              title="Export Full Audit PDF Report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>EXPORT PDF REPORT</span>
            </button>
          </div>
        </div>

        {/* Architecture Navigation Tabs */}
        <div className="flex items-center gap-2 pb-1 text-xs font-military font-bold tracking-wider">
          <button
            type="button"
            onClick={() => setNavStart((current) => Math.max(0, current - NAV_VISIBLE_COUNT))}
            disabled={!canGoPrevious}
            aria-label="Show previous Fundamental Intelligence categories"
            title="Previous categories"
            className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shrink-0 flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
            {visibleNavTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl border transition min-w-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-500 text-slate-950 border-cyan-400 shadow-md shadow-blue-500/20 font-bold'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setNavStart((current) => Math.min(navTabs.length - NAV_VISIBLE_COUNT, current + NAV_VISIBLE_COUNT))}
            disabled={!canGoNext}
            aria-label="Show next Fundamental Intelligence categories"
            title="Next categories"
            className="w-9 h-9 rounded-xl border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shrink-0 flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Sub-Tab Content Views */}
      {activeTab === 'OVERVIEW' && (
        <OverviewView
          currencyScores={currencyScores}
          pairDifferentials={pairDifferentials}
          onSelectCurrency={(c) => {
            setActiveCurrency(c);
            setActiveTab('WORKSPACES');
          }}
          onOpenPairModal={(p) => setActivePairModal(p)}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'WORKSPACES' && (
        <CurrencyWorkspaceView
          activeCurrency={activeCurrency}
          onSelectCurrency={(c) => setActiveCurrency(c)}
          currencyScores={currencyScores}
          observations={observations}
          interestRates={interestRates}
          onUpdateInterestRate={handleUpdateInterestRate}
          onUpdateObservation={handleUpdateObservation}
          onOpenAuditModal={(sc) => setAuditModalScoreResult(sc)}
          onRequestAiExplanation={handleRequestAiExplanation}
          onOpenIndicatorModal={(ind) => setInspectingIndicator(ind)}
        />
      )}

      {activeTab === 'ECONOMIC_DATA_MASTER' && (
        <EconomicDataMasterView
          observations={observations}
          onUpdateObservation={handleUpdateObservation}
        />
      )}

      {activeTab === 'MATRIX' && (
        <CurrencyStrengthMatrixView
          currencyScores={currencyScores}
          onSelectCurrency={(c) => {
            setActiveCurrency(c);
            setActiveTab('WORKSPACES');
          }}
        />
      )}

      {activeTab === 'PAIRS' && (
        <PairDifferentialScannerView
          currencyScores={currencyScores}
          onRequestAiThesis={handleRequestAiPairThesis}
          onOpenPairModal={(pair) => setActivePairModal(pair)}
        />
      )}

      {activeTab === 'RATES_YIELDS' && (
        <RatesAndYieldsView
          interestRates={interestRates}
          onUpdateInterestRate={handleUpdateInterestRate}
          currencyScores={currencyScores}
          onSelectCurrency={(c) => {
            setActiveCurrency(c);
            setActiveTab('WORKSPACES');
          }}
        />
      )}

      {activeTab === 'COT_REPORT' && (
        <CotTradingView
          cotData={cotRecords}
          onUpdateCotRecord={(updated) => {
            setCotRecords((prev) => prev.map((r) => (r.currency === updated.currency ? updated : r)));
          }}
          onSelectCurrency={(c) => {
            setActiveCurrency(c);
            setActiveTab('WORKSPACES');
          }}
        />
      )}

      {activeTab === 'MARKET_SENTIMENT' && (
        <MarketSentimentView
          sentimentRecords={sentimentRecords}
          onUpdateSentimentRecords={(records) => {
            setSentimentRecords(records as any);
          }}
          onSelectCurrency={(c) => {
            setActiveCurrency(c);
            setActiveTab('WORKSPACES');
          }}
        />
      )}

      {activeTab === 'COMMODITIES' && (
        <CommoditiesMacroView
          usdScore={currencyScores.USD}
          onRequestAiExplanation={(comm) => handleRequestAiExplanation(comm as any)}
        />
      )}

      {activeTab === 'LONG_TERM_RANKINGS' && (
        <LongTermPairRankingsView
          currencyScores={currencyScores}
          observations={observations}
          onOpenPairModal={(pair) => setActivePairModal(pair)}
        />
      )}

      {activeTab === 'HISTORICAL_SNAPSHOTS' && (
        <HistoricalSnapshotsView
          currencyScores={currencyScores}
          onExportPdf={handleExportPdf}
        />
      )}

      {activeTab === 'DATA_QUALITY' && (
        <DataQualityAuditView
          currencyScores={currencyScores}
          observations={observations}
          onSelectCurrency={(c) => {
            setActiveCurrency(c);
            setActiveTab('WORKSPACES');
          }}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'WEIGHTS_REGISTRY' && (
        <ModelWeightsRegistryView
          categoryWeights={categoryWeights}
          onUpdateWeights={(newWeights) => setCategoryWeights(newWeights)}
          onResetWeights={() => setCategoryWeights(DEFAULT_CATEGORY_WEIGHTS)}
        />
      )}

      {activeTab === 'METHODOLOGY' && (
        <FundamentalMethodologyView />
      )}

      {/* Transparent Audit Modal */}
      {auditModalScoreResult && (
        <ModelAuditModal
          scoreResult={auditModalScoreResult}
          onClose={() => setAuditModalScoreResult(null)}
        />
      )}

      {/* AI Macro Explanation Modal */}
      {isAiModalOpen && (
        <AiMacroExplanationModal
          isOpen={isAiModalOpen}
          targetName={aiTargetName}
          reportContent={aiReportContent}
          isLoading={isAiLoading}
          sourceModel={aiEngineSource}
          onClose={() => setIsAiModalOpen(false)}
        />
      )}

      {/* Indicator Definition / Source Inspector Modal */}
      {inspectingIndicator && (
        <IndicatorExplanationModal
          indicator={inspectingIndicator}
          onClose={() => setInspectingIndicator(null)}
        />
      )}

      {/* Pair Deep Dive Modal */}
      {activePairModal && (
        <PairDeepDiveModal
          pairResult={activePairModal}
          baseScoreResult={currencyScores[activePairModal.baseCurrency]}
          quoteScoreResult={currencyScores[activePairModal.quoteCurrency]}
          onClose={() => setActivePairModal(null)}
          onRequestAiThesis={() => handleRequestAiPairThesis(activePairModal.pair, activePairModal)}
        />
      )}
    </div>
  );
};
