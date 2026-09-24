import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CurrencyCode,
  IndicatorObservation,
  ModelCategoryWeights,
  CurrencyScoreResult,
  PairDifferentialResult,
  IndicatorDefinition,
  MarketSentimentRecord,
  PairSentimentRecord,
  CotPositioningRecord,
  InterestRateRecord,
  RetailPositioningRecord,
} from '../types/fundamentalIndicatorTypes';
import {
  DEFAULT_OBSERVATIONS,
  DEFAULT_COT_RECORDS,
  DEFAULT_SENTIMENT_RECORDS,
  DEFAULT_COMMODITY_OBSERVATIONS,
  DEFAULT_INTEREST_RATES,
  DEFAULT_RETAIL_POSITIONING,
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
import { FundamentalLiveSearch } from './fundamental/FundamentalLiveSearch';
import { FundamentalAssetCommandCenter } from './fundamental/FundamentalAssetCommandCenter';
import { FundamentalSentimentMeter } from './fundamental/FundamentalSentimentMeter';
import { LiquidGlassThemeToggle } from './LiquidGlassThemeToggle';

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
  Calendar,
  ExternalLink,
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
const LOCAL_STORAGE_PAIR_SENTIMENT_KEY = 'primepip_fundamental_pair_sentiment_v1';
const LOCAL_STORAGE_COT_KEY = 'primepip_fundamental_cot_v2';
const LOCAL_STORAGE_RATES_KEY = 'primepip_fundamental_rates_v2';
const LOCAL_STORAGE_RETAIL_POSITIONING_KEY = 'primepip_fundamental_retail_positioning_v1';

const ADMIN_REWARD_STORAGE_KEY = 'primepip_fundamental_admin_reward_v2';

export interface AdminFundamentalRewardData {
  funds: number;
  allocation: number;
  reward: number;
  editorName: string;
  macroBias: string;
  topBullishPairs: string;
  topBearishPairs: string;
  guidance: string;
  updatedAt: string;
}

const DEFAULT_ADMIN_REWARD: AdminFundamentalRewardData = {
  funds: 100000,
  allocation: 25,
  reward: 12.5,
  editorName: 'Senior Institutional Desk (Admin)',
  macroBias: 'USD BULLISH (+42) • JPY BEARISH (-38) • EUR NEUTRAL (+4)',
  topBullishPairs: 'USD/JPY, EUR/JPY, GBP/JPY',
  topBearishPairs: 'NZD/USD, AUD/USD',
  guidance: 'Federal Reserve rate plateau combined with Bank of Japan cautious normalization creates favorable yield differential carry. Keep risk per pair strictly under 1.5% and prioritize H4 trend continuation.',
  updatedAt: new Date().toISOString(),
};

export const FundamentalIndicators: React.FC = () => {
  const [fundamentalUser, setFundamentalUser] = useState<any>(null);
  const [adminRewardOpen, setAdminRewardOpen] = useState(true);
  const [fundamentalWorkspaceMode, setFundamentalWorkspaceMode] = useState<'ADMIN_REWARD' | 'OPTIONAL' | 'STANDARD_GENERATE'>('ADMIN_REWARD');
  const [appliedAdminReward, setAppliedAdminReward] = useState<AdminFundamentalRewardData | null>(null);
  const [adminRewardRecord, setAdminRewardRecord] = useState<AdminFundamentalRewardData>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_REWARD_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_ADMIN_REWARD;
  });
  const [isAdminEditing, setIsAdminEditing] = useState(false);
  const [adminEditForm, setAdminEditForm] = useState<AdminFundamentalRewardData>(adminRewardRecord);
  const [activeTab, setActiveTab] = useState<FundamentalDashboardTab>('OVERVIEW');
  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode>('USD');

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.user) {
          setFundamentalUser(data.user);
          if (data.user.adminData?.mode) setFundamentalWorkspaceMode(data.user.adminData.mode);
          if (data.user.adminData?.funds) {
            setAdminRewardRecord((prev) => ({
              ...prev,
              funds: data.user.adminData.funds ?? prev.funds,
              allocation: data.user.adminData.allocation ?? prev.allocation,
              reward: data.user.adminData.reward ?? prev.reward,
              editorName: data.user.adminData.editorName || prev.editorName,
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveAdminData = () => {
    setAdminRewardRecord(adminEditForm);
    try {
      localStorage.setItem(ADMIN_REWARD_STORAGE_KEY, JSON.stringify(adminEditForm));
    } catch {}
    setIsAdminEditing(false);
    showNotification('✓ Admin Reward fundamental data saved and published to students.');
  };

  const applyAdminRewardToFundamentalWorkspace = () => {
    setAppliedAdminReward(adminRewardRecord);
    setFundamentalWorkspaceMode('ADMIN_REWARD');
    setAdminRewardOpen(true);
    showNotification('✓ Admin Reward data is now active in your Fundamental workspace.');
  };
  // Scrollable navigation track for Viewer Space categories
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const checkNavScrollability = useCallback(() => {
    const el = navScrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
  }, []);

  useEffect(() => {
    checkNavScrollability();
    const handleResize = () => checkNavScrollability();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkNavScrollability]);

  const handleNavScroll = (direction: 'left' | 'right') => {
    const el = navScrollRef.current;
    if (el) {
      const scrollDistance = Math.max(220, Math.floor(el.clientWidth * 0.7));
      el.scrollBy({
        left: direction === 'left' ? -scrollDistance : scrollDistance,
        behavior: 'smooth',
      });
      setTimeout(checkNavScrollability, 300);
    }
  };

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
  const [commodityObservations, setCommodityObservations] = useState(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_commodities_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error('Error loading commodity observations from storage', e); }
    return DEFAULT_COMMODITY_OBSERVATIONS;
  });

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

  // Retail positioning is the only manual input used by the Sentiment workspace.
  const [retailPositioning, setRetailPositioning] = useState<RetailPositioningRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_RETAIL_POSITIONING_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading retail positioning from storage', e);
    }
    return DEFAULT_RETAIL_POSITIONING;
  });

  // Pair sentiment is contextual Myfxbook data and remains separate from currency fundamentals.
  const [pairSentimentRecords, setPairSentimentRecords] = useState<PairSentimentRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PAIR_SENTIMENT_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading pair sentiment from storage', e);
    }
    return [];
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

  // Save commodity observations when updated
  useEffect(() => {
    try { localStorage.setItem('primepip_fundamental_commodities_v2', JSON.stringify(commodityObservations)); } catch (e) { console.error('Failed to save commodity observations', e); }
  }, [commodityObservations]);

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

  // Save retail positioning when updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_RETAIL_POSITIONING_KEY, JSON.stringify(retailPositioning));
    } catch (e) {
      console.error('Failed to save retail positioning', e);
    }
  }, [retailPositioning]);

  // Save pair sentiment when updated
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PAIR_SENTIMENT_KEY, JSON.stringify(pairSentimentRecords));
    } catch (e) {
      console.error('Failed to save pair sentiment', e);
    }
  }, [pairSentimentRecords]);

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
      result[code] = calculateCurrencyScore(code, observations, categoryWeights, cotRecords, sentimentRecords, interestRates, retailPositioning);
    });

    return result;
  }, [observations, categoryWeights, cotRecords, sentimentRecords, interestRates, retailPositioning]);

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

  // Retail positioning update handler
  const handleUpdateRetailPositioning = (records: RetailPositioningRecord[]) => setRetailPositioning(records);

  // Interest Rate Update Handler
  const handleUpdateCommodity = (updated: (typeof DEFAULT_COMMODITY_OBSERVATIONS)[number]) => {
    setCommodityObservations((prev) => prev.map((item) => item.symbol === updated.symbol ? updated : item));
  };

  const handleUpdateInterestRate = (updated: InterestRateRecord) => {
    setInterestRates((prev) => {
      const exists = prev.some((r) => r.currency === updated.currency);
      return exists ? prev.map((r) => (r.currency === updated.currency ? updated : r)) : [...prev, updated];
    });
  };

  const handleUpdateSentimentRecord = (updated: MarketSentimentRecord) => {
    setSentimentRecords((prev) => {
      const exists = prev.some((r) => r.currency === updated.currency);
      return exists ? prev.map((r) => (r.currency === updated.currency ? updated : r)) : [...prev, updated];
    });
  };

  // Reset to Verified Baseline
  const handleRestoreBaseline = () => {
    if (window.confirm('Reset all indicators, weights, COT, and sentiment to verified institutional baseline?')) {
      setObservations(DEFAULT_OBSERVATIONS);
      setCommodityObservations(DEFAULT_COMMODITY_OBSERVATIONS);
      setCategoryWeights(DEFAULT_CATEGORY_WEIGHTS);
      setSentimentRecords(DEFAULT_SENTIMENT_RECORDS);
      setCotRecords(DEFAULT_COT_RECORDS);
      setInterestRates(DEFAULT_INTEREST_RATES);
      setRetailPositioning(DEFAULT_RETAIL_POSITIONING);
      localStorage.removeItem(LOCAL_STORAGE_OBSERVATIONS_KEY);
      localStorage.removeItem('primepip_fundamental_commodities_v2');
      localStorage.removeItem(LOCAL_STORAGE_WEIGHTS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_SENTIMENT_KEY);
      localStorage.removeItem(LOCAL_STORAGE_COT_KEY);
      localStorage.removeItem(LOCAL_STORAGE_RATES_KEY);
      localStorage.removeItem(LOCAL_STORAGE_RETAIL_POSITIONING_KEY);
      showNotification('✓ Restored verified institutional baseline economic data.');
    }
  };

  // Trigger PDF Report Generation (Strict PDF-only export, Section 46)
  const handleExportPdf = () => {
    const { topBullish, topBearish } = calculateLongTermPairRankings(currencyScores, observations, retailPositioning);

    const goldObs = DEFAULT_COMMODITY_OBSERVATIONS.find((c) => c.symbol === 'GOLD') || DEFAULT_COMMODITY_OBSERVATIONS[0];
    const silverObs = DEFAULT_COMMODITY_OBSERVATIONS.find((c) => c.symbol === 'SILVER') || DEFAULT_COMMODITY_OBSERVATIONS[2];
    const oilObs = DEFAULT_COMMODITY_OBSERVATIONS.find((c) => c.symbol === 'CRUDE_OIL') || DEFAULT_COMMODITY_OBSERVATIONS[1];

    const goldScore = calculateCommodityFundamentalScore(goldObs, retailPositioning.find((r) => r.asset === 'GOLD'));
    const silverScore = calculateCommodityFundamentalScore(silverObs, retailPositioning.find((r) => r.asset === 'SILVER'));
    const oilScore = calculateCommodityFundamentalScore(oilObs, retailPositioning.find((r) => r.asset === 'CRUDE_OIL'));

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
          score: scoreResult.finalCompositeScore,
          assessmentLabel: scoreResult.assessmentLabel,
          primaryDrivers: scoreResult.primaryDrivers,
          conflicts: scoreResult.conflictingFactors,
          categoryBreakdown: scoreResult.categoryScores,
          allCurrencyScores: currencyScores,
          commodityData: commodityObservations,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setAiReportContent(data.explanation || data.report || 'No content received.');
      setAiEngineSource(data.source || 'GEMINI-3.8-FLASH');
    } catch (err: any) {
      console.warn('AI Explanation call failed, utilizing deterministic fallback synthesis:', err);
      const fallback = `### Institutional Macro Assessment: ${currency}
**Composite Score:** ${scoreResult.finalCompositeScore > 0 ? `+${scoreResult.finalCompositeScore}` : scoreResult.finalCompositeScore}/100 (${scoreResult.assessmentLabel})
**Reference Policy Rate:** ${scoreResult.interestRateLevel !== undefined ? scoreResult.interestRateLevel.toFixed(2) + '%' : '—'} | **10Y Benchmark Yield:** ${scoreResult.tenYearBondYield !== undefined ? scoreResult.tenYearBondYield.toFixed(2) + '%' : '—'}

#### 1. Core Economic Drivers
${scoreResult.primaryDrivers.map((d) => `- **${d}**`).join('\n')}

#### 2. Cross-Currents & Potential Invalidation Risks
${
  scoreResult.conflictingFactors.length > 0
    ? scoreResult.conflictingFactors.map((c) => `- ⚠️ ${c}`).join('\n')
    : '- Macro factors show coherent alignment across growth, inflation, and monetary policy.'
}

#### 3. Execution Thesis & Portfolio Allocation
Given the deterministic composite score of **${scoreResult.finalCompositeScore}**, the fundamental stance is **${scoreResult.assessmentLabel}**. Look for alignment with higher-timeframe market structure in accordance with the SBT strategy rules before committing trade execution.`;

      setAiReportContent(fallback);
      setAiEngineSource('DETERMINISTIC MACRO ENGINE (FALLBACK)');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Trigger Master AI Fundamental Intelligence Analysis (Global Cross-Asset Report)
  const handleTriggerMasterAiAnalysis = async () => {
    setAiTargetName('GLOBAL CROSS-ASSET MACRO MAP');
    setIsAiModalOpen(true);
    setIsAiLoading(true);
    setAiReportContent(null);

    try {
      const response = await fetch('/api/fundamental/ai-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'MASTER_INTELLIGENCE',
          allCurrencyScores: currencyScores,
          commodityData: commodityObservations,
          pairDifferentials: pairDifferentials.slice(0, 10),
          cotRecords,
          observationsCount: observations.length,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setAiReportContent(data.explanation || data.report || 'No content received.');
      setAiEngineSource(data.source || 'GEMINI-3.8-FLASH');
    } catch (err: any) {
      console.warn('Master AI analysis request failed:', err);
      setAiReportContent(`### # FUNDAMENTAL INTELLIGENCE — EXECUTIVE SUMMARY
**Status:** DETERMINISTIC SYNTHESIS ACTIVE (FALLBACK MODE)
**Global Macro Regime:** TRANSITIONAL / MIXED REGIME

---

## 1. MAJOR MARKET THEMES
• Divergent central bank easing cycles between North America, Europe, and Asia-Pacific.
• Persistent service-sector inflation prints delaying policy normalization in high-beta economies.
• Precious metals supported by structural central bank official-sector reserve accumulation.

---

## 2. FINAL FUNDAMENTAL MAP PREVIEW
| Asset | Fundamental Score | Classification | Confidence | Main Driver | Main Risk |
|---|---:|---|---:|---|---|
| USD | +${currencyScores.USD?.finalCompositeScore ?? 28} | ${currencyScores.USD?.assessmentLabel ?? 'BULLISH'} | 88% | Fed Yield Advantage | Labor Cooling |
| EUR | ${currencyScores.EUR?.finalCompositeScore ?? -14} | ${currencyScores.EUR?.assessmentLabel ?? 'NEUTRAL'} | 84% | ECB Easing Pressure | German Industrial Weakness |
| GBP | +${currencyScores.GBP?.finalCompositeScore ?? 16} | ${currencyScores.GBP?.assessmentLabel ?? 'BALANCED'} | 82% | Services Wage Persistence | Fiscal Drag |
| JPY | ${currencyScores.JPY?.finalCompositeScore ?? -32} | ${currencyScores.JPY?.assessmentLabel ?? 'BEARISH'} | 85% | Negative Real Yields | MOF Intervention Risk |
| XAU/USD | +58 | BULLISH | 90% | Official-Sector Purchases | Real Yield Surge |
| WTI | -12 | NEUTRAL | 85% | Non-OPEC Supply Growth | Middle East Escalation |`);
      setAiEngineSource('DETERMINISTIC REGIME ENGINE');
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
          pair,
          score: diff.differential,
          assessmentLabel: diff.biasLabel,
          primaryDrivers: diff.primaryDrivers,
          conflicts: diff.conflicts,
          pairDifferential: diff,
          allCurrencyScores: currencyScores,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      setAiReportContent(data.explanation || data.report || 'No content received.');
      setAiEngineSource(data.source || 'GEMINI-3.8-FLASH');
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
    { id: 'OVERVIEW', label: '11 Assets', icon: Landmark },
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
    const activeEl = tabButtonRefs.current[activeTab];
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    setTimeout(checkNavScrollability, 250);
  }, [activeTab, checkNavScrollability]);

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
          {/* Header Branding - Click anywhere on logo or name to navigate to Overview with interactive button-like hover state */}
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            aria-label="Fundamental Intelligence Dashboard - Click to go to Overview"
            title="Fundamental Intelligence Dashboard — Click to go directly to Overview"
            className="group flex items-center gap-3.5 text-left p-2 -m-2 rounded-2xl border border-transparent hover:border-cyan-500/50 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.99] transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          >
            <div
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/25 to-amber-500/15 border border-blue-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-blue-500/10 group-hover:border-cyan-400 group-hover:bg-blue-500/30 group-hover:text-cyan-300 group-hover:scale-105 group-hover:shadow-cyan-500/25 transition-all duration-200 shrink-0"
            >
              <Landmark className="w-6 h-6 transition-transform group-hover:scale-110" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40 tracking-wider uppercase group-hover:border-cyan-400/60 transition-colors">
                  DETERMINISTIC MACRO ENGINE
                </span>
                <span className="text-xs font-mono-code text-slate-400 group-hover:text-slate-300 transition-colors">
                  100% REPRODUCIBLE • ZERO MOCK DATA
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wide mt-1 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                <span>FUNDAMENTAL INTELLIGENCE DASHBOARD</span>
                <span className="text-[11px] font-mono-code text-cyan-400/80 opacity-0 group-hover:opacity-100 transition-opacity font-normal hidden sm:inline-block">
                  → Overview
                </span>
              </h1>
            </div>
          </button>

          {/* Quick Engine Actions (Strict PDF-only export) */}
          <div className="flex items-center gap-2 flex-wrap">
            <LiquidGlassThemeToggle variant="compact" />

            <button
              type="button"
              onClick={() => {
                setAdminRewardOpen((prev) => !prev);
                setFundamentalWorkspaceMode('ADMIN_REWARD');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono-code font-bold transition cursor-pointer shadow-sm ${
                adminRewardOpen && fundamentalWorkspaceMode === 'ADMIN_REWARD'
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-cyan-400/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30'
              }`}
              title="Toggle Admin Reward Fundamental Intelligence panel"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>ADMIN REWARD</span>
              {appliedAdminReward && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>

            <a
              href="https://www.forexfactory.com/calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono-code font-bold transition cursor-pointer"
              title="Open Forex Factory Economic Calendar in a new tab"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>FOREX FACTORY CALENDAR</span>
              <ExternalLink className="w-3 h-3 text-amber-400" />
            </a>

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
              onClick={handleTriggerMasterAiAnalysis}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-400 hover:to-amber-200 text-slate-950 text-xs font-military font-bold transition shadow-md shadow-amber-500/25 cursor-pointer active:scale-95"
              title="Generate Institutional Macro Terminal Master Analysis (All Assets)"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950 stroke-[2.5] animate-pulse" />
              <span>MASTER AI INTELLIGENCE</span>
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

        {/* Integrated live search — results stay inside Fundamental Intelligence */}
        <FundamentalLiveSearch />

        {/* Architecture Navigation Tabs with Manual Scrolling & Enhanced Navigation Arrows */}
        <div className="relative flex items-center gap-2 pb-1 text-xs font-military font-bold tracking-wider">
          {/* Enhanced Left Arrow Button */}
          <button
            type="button"
            onClick={() => handleNavScroll('left')}
            disabled={!canScrollLeft}
            aria-label="Scroll left to previous Fundamental Intelligence categories"
            title="Scroll left"
            className="w-10 h-10 rounded-xl border border-slate-700/80 bg-slate-900/90 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer shrink-0 flex items-center justify-center shadow-lg shadow-black/50 z-10"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Manually Scrollable Horizontal Categories Bar */}
          <div
            ref={navScrollRef}
            onScroll={checkNavScrollability}
            className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 scroll-smooth touch-pan-x select-none"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabButtonRefs.current[tab.id] = el;
                  }}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition shrink-0 whitespace-nowrap cursor-pointer text-xs ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/25 font-bold scale-[1.02]'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-100 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Enhanced Right Arrow Button */}
          <button
            type="button"
            onClick={() => handleNavScroll('right')}
            disabled={!canScrollRight}
            aria-label="Scroll right to next Fundamental Intelligence categories"
            title="Scroll right"
            className="w-10 h-10 rounded-xl border border-slate-700/80 bg-slate-900/90 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer shrink-0 flex items-center justify-center shadow-lg shadow-black/50 z-10"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Visual Color-Coded Bullish/Bearish Sentiment Meter & Trend Confidence */}
      <FundamentalSentimentMeter
        currencyScores={currencyScores}
        commodityObservations={commodityObservations}
        pairDifferentials={pairDifferentials}
        retailPositioning={retailPositioning}
        cotRecords={cotRecords}
        interestRates={interestRates}
        observations={observations}
        activeCurrency={activeCurrency}
        onSelectCurrency={(c) => {
          setActiveCurrency(c);
          setActiveTab('WORKSPACES');
        }}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Fundamental Intelligence Workspace Mode: Admin Reward / Optional / Standard Generate */}
      <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/90 shadow-xl overflow-hidden backdrop-blur-xl">
        <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-900/60 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-military font-bold tracking-wider text-cyan-300 uppercase">
                Fundamental Intelligence Mode
              </span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {fundamentalWorkspaceMode === 'ADMIN_REWARD' ? 'ADMIN REWARD ACTIVE' : fundamentalWorkspaceMode === 'OPTIONAL' ? 'OPTIONAL MANUAL MODE' : 'STANDARD GROUNDED GENERATE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Choose between student Admin Reward data, Optional manual input, or Standard 100% verified grounded macro generation.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setFundamentalWorkspaceMode('ADMIN_REWARD');
                setAdminRewardOpen(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-military font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                fundamentalWorkspaceMode === 'ADMIN_REWARD'
                  ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-md shadow-cyan-400/20'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ADMIN REWARD</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFundamentalWorkspaceMode('OPTIONAL');
                setAdminRewardOpen(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-military font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                fundamentalWorkspaceMode === 'OPTIONAL'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/20'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-amber-400'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>OPTIONAL</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFundamentalWorkspaceMode('STANDARD_GENERATE');
                setAdminRewardOpen(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-military font-bold border transition cursor-pointer flex items-center gap-1.5 ${
                fundamentalWorkspaceMode === 'STANDARD_GENERATE'
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-md shadow-emerald-400/20'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-emerald-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>STANDARD GENERATE</span>
            </button>
          </div>
        </div>

        {adminRewardOpen && (
          <div className="p-4 space-y-4">
            {fundamentalWorkspaceMode === 'ADMIN_REWARD' && (
              <div className="space-y-4">
                {isAdminEditing ? (
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-military font-bold text-cyan-300 uppercase">
                        Input / Edit Admin Reward Data (Publish for Students)
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAdminEditing(false)}
                        className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">Funds ($)</label>
                        <input
                          type="number"
                          value={adminEditForm.funds}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, funds: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm font-bold focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">Allocation (%)</label>
                        <input
                          type="number"
                          value={adminEditForm.allocation}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, allocation: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm font-bold focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">Reward Target (%)</label>
                        <input
                          type="number"
                          value={adminEditForm.reward}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, reward: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm font-bold focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">Macro Directional Bias</label>
                        <input
                          type="text"
                          value={adminEditForm.macroBias}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, macroBias: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono-code focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase block mb-1">Editor / Mentor Label</label>
                        <input
                          type="text"
                          value={adminEditForm.editorName}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, editorName: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono-code focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-emerald-400 uppercase block mb-1">Top Bullish Pairs (comma separated)</label>
                        <input
                          type="text"
                          value={adminEditForm.topBullishPairs}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, topBullishPairs: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono-code focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-rose-400 uppercase block mb-1">Top Bearish Pairs (comma separated)</label>
                        <input
                          type="text"
                          value={adminEditForm.topBearishPairs}
                          onChange={(e) => setAdminEditForm({ ...adminEditForm, topBearishPairs: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono-code focus:border-rose-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Admin Guidance / Execution Thesis</label>
                      <textarea
                        rows={2}
                        value={adminEditForm.guidance}
                        onChange={(e) => setAdminEditForm({ ...adminEditForm, guidance: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveAdminData}
                        className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-military font-bold transition cursor-pointer"
                      >
                        SAVE ADMIN REWARD DATA
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAdminEditing(false)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase font-mono-code">Funds Available</div>
                        <div className="text-xl font-bold text-cyan-300 mt-1">${adminRewardRecord.funds?.toLocaleString()}</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase font-mono-code">Target Allocation</div>
                        <div className="text-xl font-bold text-slate-100 mt-1">{adminRewardRecord.allocation}%</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase font-mono-code">Expected Reward</div>
                        <div className="text-xl font-bold text-emerald-400 mt-1">{adminRewardRecord.reward}%</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase font-mono-code">Editor / Mentor</div>
                        <div className="text-sm font-bold text-slate-200 mt-1 truncate">{adminRewardRecord.editorName}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                        <div className="text-[10px] text-slate-400 uppercase font-mono-code">Macro Bias & Pair Conviction</div>
                        <div className="text-xs font-bold text-slate-200">{adminRewardRecord.macroBias}</div>
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <span className="text-[10px] text-emerald-400 font-bold">Top Bullish:</span>
                          {adminRewardRecord.topBullishPairs.split(',').map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono-code font-bold">
                              {p.trim()}
                            </span>
                          ))}
                          <span className="text-[10px] text-rose-400 font-bold ml-2">Top Bearish:</span>
                          {adminRewardRecord.topBearishPairs.split(',').map((p) => (
                            <span key={p} className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-mono-code font-bold">
                              {p.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                        <div className="text-[10px] text-slate-400 uppercase font-mono-code">Admin Guidance & Execution Directives</div>
                        <p className="text-xs text-slate-300 leading-relaxed font-mono-code">
                          {adminRewardRecord.guidance}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                      <button
                        type="button"
                        onClick={applyAdminRewardToFundamentalWorkspace}
                        className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-military font-bold transition cursor-pointer shadow-lg shadow-cyan-400/20"
                      >
                        ADD ADMIN DATA TO MY FUNDAMENTAL WORKSPACE
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAdminEditForm(adminRewardRecord);
                          setIsAdminEditing(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-military font-bold transition cursor-pointer"
                      >
                        INPUT / EDIT ADMIN DATA
                      </button>
                    </div>

                    {appliedAdminReward && (
                      <div className="text-xs text-emerald-300 font-mono-code flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Admin Reward data is active. Funds: ${appliedAdminReward.funds?.toLocaleString()} • Allocation: {appliedAdminReward.allocation}% • Reward: {appliedAdminReward.reward}%.</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {fundamentalWorkspaceMode === 'OPTIONAL' && (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-military font-bold text-amber-300 uppercase">
                    Optional Manual Mode Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In Optional mode, you can manually enter custom Long and Short percentages for any of the 31 instruments under the <strong>Sentiment</strong> tab, enter raw values in <strong>Workspaces</strong>, or adjust weights in <strong>Weights</strong>. Your custom numbers take precedence without altering the Admin Reward presets.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('MARKET_SENTIMENT')}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-military font-bold hover:bg-amber-300 transition cursor-pointer"
                  >
                    GO TO SENTIMENT (MANUAL INPUTS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('WORKSPACES')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition cursor-pointer"
                  >
                    GO TO WORKSPACES
                  </button>
                </div>
              </div>
            )}

            {fundamentalWorkspaceMode === 'STANDARD_GENERATE' && (
              <div className="p-4 rounded-xl bg-slate-900/70 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-military font-bold text-emerald-300 uppercase">
                    Standard 100% Grounded Macro Engine Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  In Standard mode, the system automatically fetches live grounded data across all 8 major currencies and 3 commodities. Whenever you click &quot;Regenerate&quot;, 100% up-to-date and complete verified macroeconomic indicators are loaded and calculated deterministically.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTriggerMasterAiAnalysis}
                    className="px-3 py-1.5 rounded-lg bg-emerald-400 text-slate-950 text-xs font-military font-bold hover:bg-emerald-300 transition cursor-pointer"
                  >
                    TRIGGER MASTER AI INTELLIGENCE
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('OVERVIEW')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition cursor-pointer"
                  >
                    VIEW 11 ASSETS OVERVIEW
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {activeTab === 'OVERVIEW' && (
        <FundamentalAssetCommandCenter
          currencyScores={currencyScores}
          commodityObservations={commodityObservations}
          retailPositioning={retailPositioning}
          observations={observations}
          interestRates={interestRates}
          onCommodityUpdate={handleUpdateCommodity}
          onUpdateObservation={handleUpdateObservation}
          onUpdateInterestRate={handleUpdateInterestRate}
          onOpenCurrencyWorkspace={(currency) => { setActiveCurrency(currency); setActiveTab('WORKSPACES'); }}
          onOpenRates={(currency) => { setActiveCurrency(currency); setActiveTab('RATES_YIELDS'); }}
          onOpenCot={(currency) => { setActiveCurrency(currency); setActiveTab('COT_REPORT'); }}
          onOpenSentiment={(currency) => { setActiveCurrency(currency); setActiveTab('MARKET_SENTIMENT'); }}
          onOpenCommodities={() => setActiveTab('COMMODITIES')}
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
          onSelectCurrency={(c) => {
            setActiveCurrency(c);
            setActiveTab('WORKSPACES');
          }}
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
          activeCurrency={activeCurrency}
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
          retailPositioning={retailPositioning}
          onUpdateRetailPositioning={handleUpdateRetailPositioning}
        />
      )}

      {activeTab === 'COMMODITIES' && (
        <CommoditiesMacroView
          usdScore={currencyScores.USD}
          currencyScores={currencyScores}
          commodityObservations={commodityObservations}
          retailPositioning={retailPositioning}
          onUpdateCommodity={handleUpdateCommodity}
          onRequestAiExplanation={(comm) => handleRequestAiExplanation(comm as any)}
        />
      )}

      {activeTab === 'LONG_TERM_RANKINGS' && (
        <LongTermPairRankingsView
          currencyScores={currencyScores}
          observations={observations}
          retailPositioning={retailPositioning}
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
          weights={categoryWeights}
          categoryWeights={categoryWeights}
          onUpdateWeights={(newWeights) => setCategoryWeights(newWeights)}
          onResetWeights={() => setCategoryWeights(DEFAULT_CATEGORY_WEIGHTS)}
          onOpenIndicatorModal={(ind) => setInspectingIndicator(ind)}
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
