import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  CurrencyCode,
  CurrencyScoreResult,
  CommodityObservation,
  RetailPositioningRecord,
  PairDifferentialResult,
  CotPositioningRecord,
  InterestRateRecord,
  IndicatorObservation,
} from '../../types/fundamentalIndicatorTypes';
import { CURRENCIES } from '../../data/fundamentalRegistryData';
import { calculateCommodityFundamentalScore } from '../../utils/fundamentalCalculationEngine';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Gauge,
  Globe,
  Coins,
  Gem,
  Flame,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BarChart2,
  Zap,
  Sliders,
  Scale,
} from 'lucide-react';

export interface TrendConfidenceResult {
  score: number; // 0 - 100%
  tier: 'HIGH' | 'MODERATE' | 'LOW';
  tierLabel: string;
  volumeScore: number; // 0 - 100%
  volumeLabel: string;
  volumeDetail: string;
  volatilityScore: number; // 0 - 100% (higher = more stable / orderly trend)
  volatilityLabel: string;
  volatilityDetail: string;
  dataFidelityScore: number; // 0 - 100%
  summary: string;
}

interface FundamentalSentimentMeterProps {
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  commodityObservations: CommodityObservation[];
  pairDifferentials?: PairDifferentialResult[];
  retailPositioning?: RetailPositioningRecord[];
  cotRecords?: CotPositioningRecord[];
  interestRates?: InterestRateRecord[];
  observations?: IndicatorObservation[];
  activeCurrency?: CurrencyCode;
  onSelectCurrency?: (currency: CurrencyCode) => void;
  onSelectTab?: (tab: any) => void;
}

export type AssetCategoryFilter = 'ALL' | 'GLOBAL' | 'CURRENCIES' | 'COMMODITIES' | 'MAJORS' | 'CROSSES';

export interface SelectableAsset {
  id: string; // e.g. 'GLOBAL', 'USD', 'XAU/USD', 'EUR/USD'
  ticker: string;
  name: string;
  category: 'GLOBAL' | 'CURRENCY' | 'COMMODITY' | 'PAIR_MAJOR' | 'PAIR_CROSS';
  icon?: string;
  score: number; // -100 to +100
  sentimentStrengthPercent: number; // 50 to 100%
  isBullish: boolean;
  isBearish: boolean;
  isNeutral: boolean;
  statusText: string;
}

const MAJOR_PAIR_LIST = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'USD/CHF', 'NZD/USD'];

export const FundamentalSentimentMeter: React.FC<FundamentalSentimentMeterProps> = ({
  currencyScores,
  commodityObservations,
  pairDifferentials = [],
  retailPositioning = [],
  cotRecords = [],
  interestRates = [],
  observations = [],
  activeCurrency = 'USD',
  onSelectCurrency,
  onSelectTab,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('GLOBAL');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<AssetCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const carouselRef = useRef<HTMLDivElement>(null);

  // Synchronize when external component dispatches asset selection
  useEffect(() => {
    const handleCustomSelect = (e: Event) => {
      const customEvt = e as CustomEvent<{ asset: string }>;
      if (customEvt.detail?.asset) {
        let assetKey = customEvt.detail.asset.trim().toUpperCase();
        if (assetKey === 'GOLD') assetKey = 'XAU/USD';
        if (assetKey === 'SILVER') assetKey = 'XAG/USD';
        if (assetKey === 'CRUDE_OIL' || assetKey === 'OIL' || assetKey === 'USOIL') assetKey = 'US Oil';
        if (assetKey.length === 6 && !assetKey.includes('/')) {
          assetKey = `${assetKey.slice(0, 3)}/${assetKey.slice(3, 6)}`;
        }
        setSelectedTarget(assetKey);
      }
    };
    window.addEventListener('primepipfx_select_fundamental_asset', handleCustomSelect);
    return () => window.removeEventListener('primepipfx_select_fundamental_asset', handleCustomSelect);
  }, []);

  // Synchronize when parent activeCurrency changes and target is currently a currency
  useEffect(() => {
    if (activeCurrency && selectedTarget !== 'GLOBAL' && CURRENCIES.some((c) => c.code === selectedTarget)) {
      setSelectedTarget(activeCurrency);
    }
  }, [activeCurrency]);

  // 1. Process Commodity Scores
  const commodityScores = useMemo(() => {
    const map: Record<string, { score: number; bias: string; drivers: any[]; price?: number; raw: CommodityObservation }> = {};
    for (const obs of commodityObservations) {
      const retailRec = retailPositioning.find((r) => r.asset === obs.symbol);
      const calc = calculateCommodityFundamentalScore(obs, retailRec);
      map[obs.symbol] = {
        score: calc.score,
        bias: calc.bias,
        drivers: calc.drivers,
        price: obs.price,
        raw: obs,
      };
    }
    return map;
  }, [commodityObservations, retailPositioning]);

  // 2. Precompute Pair Differential Lookup Map
  const pairDifferentialsMap = useMemo(() => {
    const map = new Map<string, PairDifferentialResult>();
    for (const p of pairDifferentials) {
      map.set(`${p.baseCurrency}/${p.quoteCurrency}`, p);
      map.set(`${p.baseCurrency}${p.quoteCurrency}`, p);
    }
    return map;
  }, [pairDifferentials]);

  // 3. Memoized Trend Confidence Calculator per asset (cached, non-recursive)
  const currencyConfidenceMap = useMemo(() => {
    const map = new Map<CurrencyCode, TrendConfidenceResult>();

    CURRENCIES.forEach((c) => {
      const code = c.code;
      const sc = currencyScores[code];
      const cot = cotRecords.find((r) => r.currency === code);
      const obsList = observations.filter((o) => o.currency === code);

      // Volume Context
      let volumeScore = 55;
      let volumeDetail = 'Baseline interbank futures liquidity';
      if (cot && cot.openInterest > 0) {
        if (cot.previousOpenInterest && cot.openInterest > cot.previousOpenInterest) {
          const delta = cot.openInterest - cot.previousOpenInterest;
          volumeScore += Math.min(18, Math.round((delta / cot.previousOpenInterest) * 120));
          volumeDetail = `Expanding Open Interest (+${delta.toLocaleString()} contracts) confirms institutional capital inflow`;
        } else if (cot.previousOpenInterest && cot.openInterest < cot.previousOpenInterest) {
          const delta = cot.previousOpenInterest - cot.openInterest;
          volumeScore -= Math.min(15, Math.round((delta / cot.previousOpenInterest) * 100));
          volumeDetail = `Contracting Open Interest (-${delta.toLocaleString()} contracts) flags profit taking / liquidation`;
        } else {
          volumeDetail = `Steady Open Interest (${cot.openInterest.toLocaleString()} total open contracts)`;
        }

        if (cot.nonCommercialLong !== undefined && cot.nonCommercialShort !== undefined) {
          const netSpec = Math.abs(cot.nonCommercialLong - cot.nonCommercialShort);
          const specRatio = netSpec / (cot.openInterest || 1);
          if (specRatio > 0.18) {
            volumeScore += 16;
            volumeDetail += ' • Heavy speculative volume alignment';
          } else if (specRatio > 0.08) {
            volumeScore += 8;
            volumeDetail += ' • Moderate speculative volume alignment';
          }
        }
      } else {
        volumeScore = 48;
        volumeDetail = 'Standard interbank FX flow context';
      }
      volumeScore = Math.max(15, Math.min(95, volumeScore));

      // Volatility Context
      let volatilityScore = 72;
      let volatilityDetail = 'Orderly economic surprise dispersion';
      const conflicts = sc?.conflictingFactors?.length || 0;
      if (conflicts > 0) {
        volatilityScore -= conflicts * 14;
        volatilityDetail = `${conflicts} conflicting macro factor${conflicts > 1 ? 's' : ''} create volatility turbulence`;
      }

      const obsWithForecast = obsList.filter((o) => o.forecast !== null && o.actual !== null && o.forecast !== 0);
      if (obsWithForecast.length >= 3) {
        const surprises = obsWithForecast.map((o) => Math.abs((o.actual - o.forecast!) / Math.abs(o.forecast!)));
        const avgSurprise = surprises.reduce((a, b) => a + b, 0) / surprises.length;
        if (avgSurprise > 0.28) {
          volatilityScore -= 14;
          volatilityDetail += ' • Elevated economic surprise shocks';
        } else if (avgSurprise < 0.10) {
          volatilityScore += 10;
          volatilityDetail += ' • Clustered near consensus expectations';
        }
      }

      if (sc?.tenYearBondYield !== undefined && sc?.interestRateLevel !== undefined) {
        const spread = sc.tenYearBondYield - sc.interestRateLevel;
        if (spread < -1.2) {
          volatilityScore -= 10;
          volatilityDetail += ' • Deep yield curve inversion creates macro turbulence';
        } else if (spread >= 0) {
          volatilityScore += 5;
        }
      }
      volatilityScore = Math.max(15, Math.min(95, volatilityScore));

      // Data Fidelity
      const coverage = sc?.dataCoveragePercent ?? 60;
      const verifiedCount = obsList.filter((o) => o.verificationStatus === 'VERIFIED').length;
      const verifRate = obsList.length > 0 ? (verifiedCount / obsList.length) * 100 : 70;
      const dataFidelityScore = Math.round(coverage * 0.6 + verifRate * 0.4);

      // Composite Confidence
      const score = Math.round(volumeScore * 0.38 + volatilityScore * 0.37 + dataFidelityScore * 0.25);
      const clamped = Math.max(18, Math.min(95, score));
      const tier: 'HIGH' | 'MODERATE' | 'LOW' = clamped >= 70 ? 'HIGH' : clamped >= 50 ? 'MODERATE' : 'LOW';

      map.set(code, {
        score: clamped,
        tier,
        tierLabel: tier === 'HIGH' ? 'HIGH CONVICTION' : tier === 'MODERATE' ? 'MODERATE CONVICTION' : 'ELEVATED VOLATILITY RISK',
        volumeScore,
        volumeLabel: volumeScore >= 70 ? 'Strong Volume Participation' : volumeScore >= 50 ? 'Steady Volume' : 'Thin Volume Flow',
        volumeDetail,
        volatilityScore,
        volatilityLabel: volatilityScore >= 70 ? 'Low Volatility Noise' : volatilityScore >= 50 ? 'Manageable Volatility' : 'Turbulent Volatility Regime',
        volatilityDetail,
        dataFidelityScore,
        summary: `${code} trend confidence is ${clamped}%. Volume commitment is ${volumeScore}% with ${volatilityScore}% macro volatility stability.`,
      });
    });

    return map;
  }, [currencyScores, cotRecords, observations]);

  const commodityConfidenceMap = useMemo(() => {
    const map = new Map<string, TrendConfidenceResult>();

    ['GOLD', 'SILVER', 'CRUDE_OIL'].forEach((sym) => {
      const c = commodityScores[sym];
      const raw = c?.raw;

      let volumeScore = 62;
      let volumeDetail = 'Physical & derivatives volume balance';

      if (sym === 'GOLD') {
        if (raw?.centralBankDemandTone === 'AGGRESSIVE_BUYING') {
          volumeScore += 20;
          volumeDetail = 'Sovereign central banks driving aggressive physical accumulation volume';
        } else if (raw?.centralBankDemandTone === 'STEADY') {
          volumeScore += 10;
          volumeDetail = 'Consistent central bank physical gold demand';
        }
      } else if (sym === 'SILVER') {
        if (raw?.industrialDemandTone === 'STRONG') {
          volumeScore += 18;
          volumeDetail = 'Heavy industrial & solar manufacturing volume consumption';
        } else if (raw?.industrialDemandTone === 'WEAK') {
          volumeScore -= 12;
          volumeDetail = 'Softening industrial manufacturing off-take volume';
        }
      } else if (sym === 'CRUDE_OIL') {
        if (raw?.inventoriesWeeklySurpriseMb !== undefined) {
          if (raw.inventoriesWeeklySurpriseMb < -2.0) {
            volumeScore += 16;
            volumeDetail = `Substantial crude inventory draw (${raw.inventoriesWeeklySurpriseMb}Mb) signals strong volume absorption`;
          } else if (raw.inventoriesWeeklySurpriseMb > 2.0) {
            volumeScore -= 10;
            volumeDetail = `Inventory build (+${raw.inventoriesWeeklySurpriseMb}Mb) indicates surplus physical volume`;
          }
        }
        if (raw?.opecPolicyTone === 'DEFENDING_FLOOR') {
          volumeScore += 10;
          volumeDetail += ' • OPEC+ actively defending physical supply volume';
        }
      }
      volumeScore = Math.max(20, Math.min(95, volumeScore));

      let volatilityScore = 68;
      let volatilityDetail = 'Macro commodity volatility baseline';
      if (raw?.geopoliticalRiskLevel === 'HIGH') {
        if (sym === 'GOLD') {
          volatilityScore += 10;
          volatilityDetail = 'Elevated geopolitical risk creates persistent safe-haven trend backing';
        } else {
          volatilityScore -= 16;
          volatilityDetail = 'Elevated geopolitical risk introduces sudden supply shock volatility';
        }
      } else if (raw?.geopoliticalRiskLevel === 'LOW') {
        volatilityScore += 8;
        volatilityDetail = 'Low geopolitical disruption risk supports predictable price trends';
      }

      if (raw?.usRealYield10Y !== undefined && Math.abs(raw.usRealYield10Y) > 2.2) {
        volatilityScore -= 8;
        volatilityDetail += ' • Elevated real yield volatility';
      }
      volatilityScore = Math.max(20, Math.min(95, volatilityScore));

      const dataFidelityScore = raw?.sentimentConfidence ?? 82;
      const score = Math.round(volumeScore * 0.4 + volatilityScore * 0.35 + dataFidelityScore * 0.25);
      const clamped = Math.max(20, Math.min(95, score));
      const tier: 'HIGH' | 'MODERATE' | 'LOW' = clamped >= 70 ? 'HIGH' : clamped >= 50 ? 'MODERATE' : 'LOW';

      const res: TrendConfidenceResult = {
        score: clamped,
        tier,
        tierLabel: tier === 'HIGH' ? 'HIGH CONVICTION' : tier === 'MODERATE' ? 'MODERATE CONVICTION' : 'ELEVATED VOLATILITY RISK',
        volumeScore,
        volumeLabel: volumeScore >= 70 ? 'Strong Volume Participation' : volumeScore >= 50 ? 'Steady Volume' : 'Light Volume Flow',
        volumeDetail,
        volatilityScore,
        volatilityLabel: volatilityScore >= 70 ? 'Low Volatility Noise' : volatilityScore >= 50 ? 'Moderate Volatility' : 'Turbulent Volatility Regime',
        volatilityDetail,
        dataFidelityScore,
        summary: `${sym} trend confidence is ${clamped}%, with ${volumeScore}% volume backing and ${volatilityScore}% volatility stability.`,
      };

      map.set(sym, res);
      if (sym === 'GOLD') {
        map.set('XAU', res);
        map.set('XAU/USD', res);
      } else if (sym === 'SILVER') {
        map.set('XAG', res);
        map.set('XAG/USD', res);
      } else if (sym === 'CRUDE_OIL') {
        map.set('WTI', res);
        map.set('US Oil', res);
        map.set('USOIL', res);
      }
    });

    return map;
  }, [commodityScores]);

  // Global Market Pulse Metrics
  const globalSummary = useMemo(() => {
    let sumScore = 0;
    let sumConfidence = 0;
    let bullishCount = 0;
    let bearishCount = 0;
    let neutralCount = 0;
    const total = 11; // 8 currencies + 3 commodities

    CURRENCIES.forEach((c) => {
      const sc = currencyScores[c.code];
      const s = sc?.finalCompositeScore ?? 0;
      sumScore += s;
      if (s >= 12) bullishCount++;
      else if (s <= -12) bearishCount++;
      else neutralCount++;

      const conf = currencyConfidenceMap.get(c.code)?.score ?? 50;
      sumConfidence += conf;
    });

    ['GOLD', 'SILVER', 'CRUDE_OIL'].forEach((sym) => {
      const c = commodityScores[sym];
      const s = c?.score ?? 0;
      sumScore += s;
      if (s >= 12) bullishCount++;
      else if (s <= -12) bearishCount++;
      else neutralCount++;

      const conf = commodityConfidenceMap.get(sym)?.score ?? 50;
      sumConfidence += conf;
    });

    const avgScore = Math.round(sumScore / total);
    const avgConfidence = Math.round(sumConfidence / total);
    const bullishPercent = Math.round((bullishCount / total) * 100);
    const bearishPercent = Math.round((bearishCount / total) * 100);

    return {
      avgScore,
      avgConfidence,
      bullishCount,
      bearishCount,
      neutralCount,
      bullishPercent,
      bearishPercent,
    };
  }, [currencyScores, commodityScores, currencyConfidenceMap, commodityConfidenceMap]);

  // 4. Complete Catalog of Selectable Assets (Global + 8 Currencies + 3 Commodities + 28 Pairs = 40 Assets)
  const allSelectableAssets = useMemo<SelectableAsset[]>(() => {
    const list: SelectableAsset[] = [];

    // Global
    list.push({
      id: 'GLOBAL',
      ticker: 'GLOBAL',
      name: 'Global Market Pulse',
      category: 'GLOBAL',
      icon: '🌐',
      score: globalSummary.avgScore,
      sentimentStrengthPercent: Math.round(50 + Math.abs(globalSummary.avgScore) / 2),
      isBullish: globalSummary.avgScore >= 12,
      isBearish: globalSummary.avgScore <= -12,
      isNeutral: globalSummary.avgScore > -12 && globalSummary.avgScore < 12,
      statusText: globalSummary.avgScore >= 12 ? 'BULLISH' : globalSummary.avgScore <= -12 ? 'BEARISH' : 'NEUTRAL',
    });

    // 8 Currencies
    CURRENCIES.forEach((c) => {
      const sc = currencyScores[c.code];
      const score = sc?.finalCompositeScore ?? 0;
      const isBullish = score >= 12;
      const isBearish = score <= -12;
      const isNeutral = !isBullish && !isBearish;
      const strength = Math.min(100, Math.round(50 + Math.abs(score) / 2));

      list.push({
        id: c.code,
        ticker: c.code,
        name: c.name,
        category: 'CURRENCY',
        icon: c.flag,
        score,
        sentimentStrengthPercent: strength,
        isBullish,
        isBearish,
        isNeutral,
        statusText: isBullish ? 'BULLISH' : isBearish ? 'BEARISH' : 'NEUTRAL',
      });
    });

    // 3 Commodities (Gold XAU/USD, Silver XAG/USD, US Oil WTI)
    const commDefs = [
      { id: 'XAU/USD', ticker: 'XAU/USD', key: 'GOLD', name: 'Gold (XAU/USD)', icon: '🥇' },
      { id: 'XAG/USD', ticker: 'XAG/USD', key: 'SILVER', name: 'Silver (XAG/USD)', icon: '🥈' },
      { id: 'US Oil', ticker: 'US Oil', key: 'CRUDE_OIL', name: 'US Oil (WTI Crude)', icon: '🛢️' },
    ];

    commDefs.forEach((comm) => {
      const c = commodityScores[comm.key];
      const score = c?.score ?? 0;
      const isBullish = score >= 12;
      const isBearish = score <= -12;
      const isNeutral = !isBullish && !isBearish;
      const strength = Math.min(100, Math.round(50 + Math.abs(score) / 2));

      list.push({
        id: comm.id,
        ticker: comm.ticker,
        name: comm.name,
        category: 'COMMODITY',
        icon: comm.icon,
        score,
        sentimentStrengthPercent: strength,
        isBullish,
        isBearish,
        isNeutral,
        statusText: isBullish ? 'BULLISH' : isBearish ? 'BEARISH' : 'NEUTRAL',
      });
    });

    // 28 Pairs
    const currencies = CURRENCIES.map((c) => c.code);
    for (let i = 0; i < currencies.length; i++) {
      for (let j = i + 1; j < currencies.length; j++) {
        const base = currencies[i];
        const quote = currencies[j];
        const pairKey = `${base}/${quote}`;
        const isMajor = MAJOR_PAIR_LIST.includes(pairKey);

        const pairDiff = pairDifferentialsMap.get(pairKey);
        const score = pairDiff ? pairDiff.differential : (currencyScores[base]?.finalCompositeScore ?? 0) - (currencyScores[quote]?.finalCompositeScore ?? 0);
        const isBullish = score >= 12;
        const isBearish = score <= -12;
        const isNeutral = !isBullish && !isBearish;
        const strength = Math.min(100, Math.round(50 + Math.abs(score) / 2));

        list.push({
          id: pairKey,
          ticker: pairKey,
          name: `${base}/${quote}`,
          category: isMajor ? 'PAIR_MAJOR' : 'PAIR_CROSS',
          icon: '🔄',
          score,
          sentimentStrengthPercent: strength,
          isBullish,
          isBearish,
          isNeutral,
          statusText: isBullish ? 'BULLISH' : isBearish ? 'BEARISH' : 'NEUTRAL',
        });
      }
    }

    return list;
  }, [globalSummary, currencyScores, commodityScores, pairDifferentialsMap]);

  // Filtered Assets based on Category Tabs and Search Query
  const filteredAssets = useMemo(() => {
    let items = allSelectableAssets;

    if (categoryFilter === 'GLOBAL') {
      items = items.filter((a) => a.category === 'GLOBAL');
    } else if (categoryFilter === 'CURRENCIES') {
      items = items.filter((a) => a.category === 'CURRENCY');
    } else if (categoryFilter === 'COMMODITIES') {
      items = items.filter((a) => a.category === 'COMMODITY');
    } else if (categoryFilter === 'MAJORS') {
      items = items.filter((a) => a.category === 'PAIR_MAJOR');
    } else if (categoryFilter === 'CROSSES') {
      items = items.filter((a) => a.category === 'PAIR_CROSS');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((a) => a.ticker.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    }

    return items;
  }, [allSelectableAssets, categoryFilter, searchQuery]);

  // 5. Active Target Computed Data & Detailed Metrics
  const targetData = useMemo(() => {
    const rawTarget = selectedTarget.trim();

    // 1. GLOBAL MARKET PULSE
    if (rawTarget === 'GLOBAL') {
      const score = globalSummary.avgScore;
      const isBullish = score >= 12;
      const isBearish = score <= -12;
      const isNeutral = !isBullish && !isBearish;
      const strengthPercent = Math.min(100, Math.round(50 + Math.abs(score) / 2));

      const trendConfidence: TrendConfidenceResult = {
        score: globalSummary.avgConfidence,
        tier: globalSummary.avgConfidence >= 70 ? 'HIGH' : globalSummary.avgConfidence >= 50 ? 'MODERATE' : 'LOW',
        tierLabel: globalSummary.avgConfidence >= 70 ? 'HIGH CONVICTION' : globalSummary.avgConfidence >= 50 ? 'MODERATE CONVICTION' : 'ELEVATED VOLATILITY RISK',
        volumeScore: 65,
        volumeLabel: 'Aggregated Interbank & Futures Liquidity',
        volumeDetail: 'Cross-market futures open interest & commercial flow balance across 11 key macro assets',
        volatilityScore: 70,
        volatilityLabel: 'Controlled Macro Surprise Dispersion',
        volatilityDetail: 'Synthesized economic variance across G8 central bank rate regimes',
        dataFidelityScore: 88,
        summary: `Global market pulse reflects ${globalSummary.avgConfidence}% macro confidence across 8 major currencies and 3 premier commodities.`,
      };

      return {
        id: 'GLOBAL',
        title: 'GLOBAL MACRO MARKET PULSE',
        subtitle: 'Synthesized real-time sentiment across 8 G8 Currencies & 3 Premier Commodities',
        type: 'GLOBAL' as const,
        score,
        strengthPercent,
        label: isBullish ? 'BULLISH (GREEN)' : isBearish ? 'BEARISH (RED)' : 'NEUTRAL / BALANCED',
        isBullish,
        isBearish,
        isNeutral,
        trendConfidence,
        drivers: [
          `Bullish Assets: ${globalSummary.bullishCount} of 11 (${globalSummary.bullishPercent}%)`,
          `Bearish Assets: ${globalSummary.bearishCount} of 11 (${globalSummary.bearishPercent}%)`,
          `Neutral/Consolidating Assets: ${globalSummary.neutralCount} of 11`,
          `Institutional Open Interest: Balanced interbank order flow with stable macro liquidity`,
        ],
        conflicts: [],
        policyRate: undefined,
        yield10Y: undefined,
        pairDetails: undefined,
      };
    }

    // 2. CURRENCY (USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD)
    const currMeta = CURRENCIES.find((c) => c.code === rawTarget);
    if (currMeta) {
      const sc = currencyScores[currMeta.code];
      const score = sc?.finalCompositeScore ?? 0;
      const isBullish = score >= 12;
      const isBearish = score <= -12;
      const isNeutral = !isBullish && !isBearish;
      const strengthPercent = Math.min(100, Math.round(50 + Math.abs(score) / 2));
      const trendConfidence = currencyConfidenceMap.get(currMeta.code) || {
        score: 60,
        tier: 'MODERATE' as const,
        tierLabel: 'MODERATE CONVICTION',
        volumeScore: 55,
        volumeLabel: 'Standard Liquidity',
        volumeDetail: 'Interbank flow',
        volatilityScore: 65,
        volatilityLabel: 'Normal Noise',
        volatilityDetail: 'Normal macroeconomic dispersion',
        dataFidelityScore: 80,
        summary: 'Baseline trend confidence',
      };

      return {
        id: currMeta.code,
        title: `${currMeta.code} — ${currMeta.name}`,
        subtitle: `Deterministic Macro Score: ${sc?.completedIndicators || 0} indicators completed (${sc?.dataCoveragePercent || 0}% coverage)`,
        type: 'CURRENCY' as const,
        score,
        strengthPercent,
        label: isBullish ? 'BULLISH (GREEN)' : isBearish ? 'BEARISH (RED)' : 'NEUTRAL / MIXED',
        isBullish,
        isBearish,
        isNeutral,
        trendConfidence,
        drivers: sc?.primaryDrivers?.length ? sc.primaryDrivers : ['Awaiting published indicator releases'],
        conflicts: sc?.conflictingFactors || [],
        policyRate: sc?.interestRateLevel,
        yield10Y: sc?.tenYearBondYield,
        pairDetails: undefined,
      };
    }

    // 3. COMMODITY (XAU/USD, XAG/USD, US Oil / WTI)
    const isGold = rawTarget.includes('XAU') || rawTarget.toUpperCase().includes('GOLD');
    const isSilver = rawTarget.includes('XAG') || rawTarget.toUpperCase().includes('SILVER');
    const isOil = rawTarget.includes('WTI') || rawTarget.toUpperCase().includes('OIL');

    if (isGold || isSilver || isOil) {
      const commKey = isGold ? 'GOLD' : isSilver ? 'SILVER' : 'CRUDE_OIL';
      const c = commodityScores[commKey];
      const score = c?.score ?? 0;
      const isBullish = score >= 12;
      const isBearish = score <= -12;
      const isNeutral = !isBullish && !isBearish;
      const strengthPercent = Math.min(100, Math.round(50 + Math.abs(score) / 2));
      const trendConfidence = commodityConfidenceMap.get(commKey) || {
        score: 65,
        tier: 'MODERATE' as const,
        tierLabel: 'MODERATE CONVICTION',
        volumeScore: 60,
        volumeLabel: 'Active Physical & Paper Flow',
        volumeDetail: 'Futures and physical trade volume',
        volatilityScore: 70,
        volatilityLabel: 'Controlled Commodity Volatility',
        volatilityDetail: 'Macro price trend alignment',
        dataFidelityScore: 85,
        summary: 'Commodity trend confidence',
      };

      const fullName = isGold ? 'Gold (XAU/USD)' : isSilver ? 'Silver (XAG/USD)' : 'US Oil (WTI Crude)';
      const livePriceText = c?.price ? `Live Spot Price: $${c.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD` : 'Verified Institutional Macro Valuation';

      return {
        id: isGold ? 'XAU/USD' : isSilver ? 'XAG/USD' : 'US Oil',
        title: fullName,
        subtitle: livePriceText,
        type: 'COMMODITY' as const,
        score,
        strengthPercent,
        label: isBullish ? 'BULLISH (GREEN)' : isBearish ? 'BEARISH (RED)' : 'NEUTRAL',
        isBullish,
        isBearish,
        isNeutral,
        trendConfidence,
        drivers: c?.drivers?.length
          ? c.drivers.map((d: any) => `${d.label}: ${d.impact} (${d.score > 0 ? '+' : ''}${d.score})`)
          : ['Awaiting fundamental commodity metric releases'],
        conflicts: [],
        policyRate: undefined,
        yield10Y: undefined,
        pairDetails: undefined,
      };
    }

    // 4. CURRENCY PAIRS (e.g. EUR/USD, GBP/USD, USD/JPY, etc.)
    let cleanPair = rawTarget.toUpperCase();
    if (cleanPair.length === 6 && !cleanPair.includes('/')) {
      cleanPair = `${cleanPair.slice(0, 3)}/${cleanPair.slice(3, 6)}`;
    }

    const pairParts = cleanPair.split('/');
    if (pairParts.length === 2) {
      const baseCode = pairParts[0] as CurrencyCode;
      const quoteCode = pairParts[1] as CurrencyCode;
      const baseSc = currencyScores[baseCode];
      const quoteSc = currencyScores[quoteCode];

      const pairDiff = pairDifferentialsMap.get(cleanPair);
      const score = pairDiff ? pairDiff.differential : (baseSc?.finalCompositeScore ?? 0) - (quoteSc?.finalCompositeScore ?? 0);
      const isBullish = score >= 12;
      const isBearish = score <= -12;
      const isNeutral = !isBullish && !isBearish;
      const strengthPercent = Math.min(100, Math.round(50 + Math.abs(score) / 2));

      // Trend confidence derived from base and quote confidences
      const baseConf = currencyConfidenceMap.get(baseCode);
      const quoteConf = currencyConfidenceMap.get(quoteCode);

      const combinedScore = Math.round(((baseConf?.score ?? 55) + (quoteConf?.score ?? 55)) / 2);
      const combinedVolume = Math.round(((baseConf?.volumeScore ?? 50) + (quoteConf?.volumeScore ?? 50)) / 2);
      const combinedVolatility = Math.round(((baseConf?.volatilityScore ?? 65) + (quoteConf?.volatilityScore ?? 65)) / 2);
      const tier: 'HIGH' | 'MODERATE' | 'LOW' = combinedScore >= 70 ? 'HIGH' : combinedScore >= 50 ? 'MODERATE' : 'LOW';

      const trendConfidence: TrendConfidenceResult = {
        score: combinedScore,
        tier,
        tierLabel: tier === 'HIGH' ? 'HIGH CONVICTION' : tier === 'MODERATE' ? 'MODERATE CONVICTION' : 'ELEVATED VOLATILITY RISK',
        volumeScore: combinedVolume,
        volumeLabel: combinedVolume >= 70 ? 'Heavy Interbank Flow Alignment' : 'Steady Cross-Currency Liquidity',
        volumeDetail: `${baseCode} vs ${quoteCode} futures open interest and institutional positioning differential`,
        volatilityScore: combinedVolatility,
        volatilityLabel: combinedVolatility >= 70 ? 'Smooth Macro Trend Persistence' : 'Cross-Current Volatility Noise',
        volatilityDetail: `${baseCode}/${quoteCode} interest rate yield differential and economic surprise variance`,
        dataFidelityScore: Math.round(((baseConf?.dataFidelityScore ?? 75) + (quoteConf?.dataFidelityScore ?? 75)) / 2),
        summary: `${cleanPair} trend confidence reads ${combinedScore}%, with ${combinedVolume}% volume participation and ${combinedVolatility}% volatility stability.`,
      };

      const baseName = CURRENCIES.find((c) => c.code === baseCode)?.name || baseCode;
      const quoteName = CURRENCIES.find((c) => c.code === quoteCode)?.name || quoteCode;

      const rateSpread = (baseSc?.interestRateLevel !== undefined && quoteSc?.interestRateLevel !== undefined)
        ? (baseSc.interestRateLevel - quoteSc.interestRateLevel).toFixed(2)
        : null;

      const yield10YSpread = (baseSc?.tenYearBondYield !== undefined && quoteSc?.tenYearBondYield !== undefined)
        ? (baseSc.tenYearBondYield - quoteSc.tenYearBondYield).toFixed(2)
        : null;

      const drivers = [
        `${baseCode} Macro Composite: ${baseSc?.finalCompositeScore !== undefined ? (baseSc.finalCompositeScore > 0 ? `+${baseSc.finalCompositeScore}` : baseSc.finalCompositeScore) : '0'} (${baseSc?.assessmentLabel || 'NEUTRAL'})`,
        `${quoteCode} Macro Composite: ${quoteSc?.finalCompositeScore !== undefined ? (quoteSc.finalCompositeScore > 0 ? `+${quoteSc.finalCompositeScore}` : quoteSc.finalCompositeScore) : '0'} (${quoteSc?.assessmentLabel || 'NEUTRAL'})`,
        rateSpread ? `Central Bank Rate Spread: ${rateSpread}% (${baseCode} vs ${quoteCode})` : `Net Macro Differential: ${score > 0 ? `+${score}` : score} pts`,
        yield10YSpread ? `10Y Sovereign Bond Yield Spread: ${yield10YSpread}%` : `Data Coverage: Combined ${pairDiff?.dataCoveragePercent || 85}%`,
      ];

      return {
        id: cleanPair,
        title: `${cleanPair} — ${baseName} / ${quoteName}`,
        subtitle: `Differential: ${score > 0 ? `+${score}` : score} pts • ${isBullish ? 'Base Currency Dominance' : isBearish ? 'Quote Currency Dominance' : 'Balanced Parity'}`,
        type: 'PAIR' as const,
        score,
        strengthPercent,
        label: isBullish ? 'BULLISH (GREEN)' : isBearish ? 'BEARISH (RED)' : 'NEUTRAL / BALANCED',
        isBullish,
        isBearish,
        isNeutral,
        trendConfidence,
        drivers,
        conflicts: baseSc?.conflictingFactors?.concat(quoteSc?.conflictingFactors || []) || [],
        policyRate: baseSc?.interestRateLevel,
        yield10Y: baseSc?.tenYearBondYield,
        pairDetails: {
          base: baseCode,
          quote: quoteCode,
          baseScore: baseSc?.finalCompositeScore ?? 0,
          quoteScore: quoteSc?.finalCompositeScore ?? 0,
          rateSpread,
          yieldSpread: yield10YSpread,
        },
      };
    }

    // Default Fallback
    return {
      id: 'GLOBAL',
      title: 'GLOBAL MACRO MARKET PULSE',
      subtitle: 'Synthesized fundamental intelligence',
      type: 'GLOBAL' as const,
      score: 0,
      strengthPercent: 50,
      label: 'NEUTRAL',
      isBullish: false,
      isBearish: false,
      isNeutral: true,
      trendConfidence: {
        score: 60,
        tier: 'MODERATE' as const,
        tierLabel: 'MODERATE CONVICTION',
        volumeScore: 50,
        volumeLabel: 'Steady Volume',
        volumeDetail: 'Interbank flow',
        volatilityScore: 60,
        volatilityLabel: 'Manageable Volatility',
        volatilityDetail: 'Normal macro conditions',
        dataFidelityScore: 80,
        summary: 'Baseline trend confidence',
      },
      drivers: [],
      conflicts: [],
      policyRate: undefined,
      yield10Y: undefined,
      pairDetails: undefined,
    };
  }, [
    selectedTarget,
    globalSummary,
    currencyScores,
    commodityScores,
    currencyConfidenceMap,
    commodityConfidenceMap,
    pairDifferentialsMap,
  ]);

  // Angle for Gauge Needle (-100 to +100 mapped to -80deg to +80deg)
  const clampedScore = Math.max(-100, Math.min(100, targetData.score));
  const needleRotation = (clampedScore / 100) * 80;
  const normalizedPercent = Math.round(((clampedScore + 100) / 200) * 100);

  // Circular progress ring calculations for Trend Confidence Score
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~263.89
  const confidenceScore = targetData.trendConfidence.score;
  const strokeDashoffset = ringCircumference - (confidenceScore / 100) * ringCircumference;

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const amount = direction === 'left' ? -260 : 260;
      carouselRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-slate-950/95 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 backdrop-blur-xl relative overflow-hidden transition-all duration-300">
      {/* Dynamic ambient radial caustics based on selected asset sentiment */}
      <div
        className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-20 ${
          targetData.isBullish
            ? 'bg-emerald-500'
            : targetData.isBearish
            ? 'bg-rose-500'
            : 'bg-cyan-500'
        }`}
      />
      <div
        className={`absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-15 ${
          targetData.trendConfidence.tier === 'HIGH'
            ? 'bg-emerald-600'
            : targetData.trendConfidence.tier === 'LOW'
            ? 'bg-rose-600'
            : 'bg-amber-600'
        }`}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-lg transition-colors ${
              targetData.isBullish
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-emerald-500/15'
                : targetData.isBearish
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-rose-500/15'
                : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-cyan-500/15'
            }`}
          >
            <Gauge className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 uppercase tracking-wider">
                AGGREGATED SENTIMENT GAUGE & CONVICTION METER
              </span>
              <span className="text-[10px] font-mono-code text-slate-400 hidden sm:inline">
                8 CURRENCIES • 3 COMMODITIES • 28 PAIRS
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide mt-0.5 flex items-center gap-2 flex-wrap">
              <span>FUNDAMENTAL INTELLIGENCE SENTIMENT METER</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono-code font-bold border transition-colors ${
                  targetData.isBullish
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : targetData.isBearish
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {targetData.isBullish
                  ? `BULLISH (GREEN) • ${targetData.strengthPercent}% STRENGTH`
                  : targetData.isBearish
                  ? `BEARISH (RED) • ${targetData.strengthPercent}% PRESSURE`
                  : 'NEUTRAL (50% BALANCED)'}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono-code font-bold border ${
                  targetData.trendConfidence.tier === 'HIGH'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : targetData.trendConfidence.tier === 'LOW'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {targetData.trendConfidence.score}% CONFIDENCE
              </span>
            </h2>
          </div>
        </div>

        {/* Global Pulse Badge & Collapse Button */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono-code">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>{globalSummary.bullishCount} Bullish</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>{globalSummary.bearishCount} Bearish</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-300 font-bold">
              Global Confidence: {globalSummary.avgConfidence}%
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title={isCollapsed ? 'Expand Sentiment Meter' : 'Collapse Sentiment Meter'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 relative z-10 animate-in fade-in duration-300">
          {/* Category Filter Pills & Search Input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            {/* Category Segment Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 text-xs font-military select-none">
              {(
                [
                  { id: 'ALL', label: `ALL (${allSelectableAssets.length})` },
                  { id: 'GLOBAL', label: 'GLOBAL (1)' },
                  { id: 'CURRENCIES', label: 'CURRENCIES (8)' },
                  { id: 'COMMODITIES', label: 'COMMODITIES (3)' },
                  { id: 'MAJORS', label: 'MAJORS (7)' },
                  { id: 'CROSSES', label: 'CROSSES (21)' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition shrink-0 cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-md shadow-cyan-500/20'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Quick Filter Search Input */}
            <div className="relative shrink-0 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search Gold, EUR/USD, JPY..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 font-mono-code"
              />
            </div>
          </div>

          {/* Horizontally Scrollable Asset Chips Bar */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              className="hidden sm:flex items-center justify-center p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition shrink-0 mr-1.5 cursor-pointer z-10"
              title="Scroll Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div
              ref={carouselRef}
              className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 text-xs font-military select-none w-full scroll-smooth"
            >
              {filteredAssets.map((asset) => {
                const isSelected = selectedTarget === asset.id || (selectedTarget === 'GLOBAL' && asset.id === 'GLOBAL');
                const isBull = asset.isBullish;
                const isBear = asset.isBearish;

                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      setSelectedTarget(asset.id);
                      if (asset.category === 'CURRENCY' && onSelectCurrency) {
                        onSelectCurrency(asset.id as CurrencyCode);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono-code transition shrink-0 cursor-pointer ${
                      isSelected
                        ? isBull
                          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                          : isBear
                          ? 'bg-rose-500/25 text-rose-200 border-rose-400 shadow-md shadow-rose-500/20 scale-[1.02]'
                          : 'bg-slate-800 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{asset.icon}</span>
                    <span className="font-bold">{asset.ticker}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isBull ? 'bg-emerald-400' : isBear ? 'bg-rose-400' : 'bg-slate-500'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold ${
                        isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {asset.score > 0 ? `+${asset.score}` : asset.score}
                    </span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono-code font-bold ${
                        isBull
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isBear
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {asset.sentimentStrengthPercent}%
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              className="hidden sm:flex items-center justify-center p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition shrink-0 ml-1.5 cursor-pointer z-10"
              title="Scroll Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Main Visual Sentiment & Trend Confidence Meters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 items-stretch bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
            {/* 1. Bullish/Bearish Directional Gauge Display (Cols 1-4 on XL) */}
            <div className="xl:col-span-4 flex flex-col items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-850">
              <div className="w-full flex items-center justify-between pb-1 border-b border-slate-800/60">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>DIRECTIONAL SENTIMENT</span>
                </span>
                <span
                  className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full border ${
                    targetData.isBullish
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : targetData.isBearish
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {targetData.isBullish ? 'BULLISH' : targetData.isBearish ? 'BEARISH' : 'NEUTRAL'}
                </span>
              </div>

              {/* Semi-Circle SVG Radial Gauge */}
              <div className="relative w-60 h-32 flex items-end justify-center overflow-visible my-2">
                <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="sentimentGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="25%" stopColor="#f43f5e" />
                      <stop offset="48%" stopColor="#eab308" />
                      <stop offset="52%" stopColor="#eab308" />
                      <stop offset="75%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Background Arc Track */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />

                  {/* Gradient Arc */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="url(#sentimentGaugeGradient)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    filter="url(#gaugeGlow)"
                    opacity="0.9"
                  />

                  {/* Tick Marks */}
                  <line x1="20" y1="100" x2="28" y2="100" stroke="#f87171" strokeWidth="2" />
                  <line x1="43" y1="43" x2="49" y2="49" stroke="#fb7185" strokeWidth="2" />
                  <line x1="100" y1="20" x2="100" y2="28" stroke="#facc15" strokeWidth="2.5" />
                  <line x1="157" y1="43" x2="151" y2="49" stroke="#34d399" strokeWidth="2" />
                  <line x1="180" y1="100" x2="172" y2="100" stroke="#10b981" strokeWidth="2" />

                  {/* Pivot Point */}
                  <circle cx="100" cy="100" r="10" fill="#0f172a" stroke="#475569" strokeWidth="3" />
                  <circle
                    cx="100"
                    cy="100"
                    r="5"
                    fill={targetData.isBullish ? '#10b981' : targetData.isBearish ? '#ef4444' : '#38bdf8'}
                  />

                  {/* Animated Dial Needle */}
                  <g
                    style={{
                      transform: `rotate(${needleRotation}deg)`,
                      transformOrigin: '100px 100px',
                      transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    <line
                      x1="100"
                      y1="100"
                      x2="100"
                      y2="24"
                      stroke={targetData.isBullish ? '#34d399' : targetData.isBearish ? '#f87171' : '#cbd5e1'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="96,100 104,100 100,20"
                      fill={targetData.isBullish ? '#10b981' : targetData.isBearish ? '#ef4444' : '#e2e8f0'}
                    />
                    <circle
                      cx="100"
                      cy="22"
                      r="3"
                      fill={targetData.isBullish ? '#34d399' : targetData.isBearish ? '#f87171' : '#ffffff'}
                    />
                  </g>
                </svg>

                {/* Score Number in Center Bottom of Arc */}
                <div className="absolute bottom-0 flex flex-col items-center">
                  <div
                    className={`text-2xl sm:text-3xl font-military font-bold tracking-tight ${
                      targetData.isBullish
                        ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : targetData.isBearish
                        ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                        : 'text-slate-200'
                    }`}
                  >
                    {targetData.score > 0 ? `+${targetData.score}` : targetData.score}
                  </div>
                  <span className="text-[9px] font-mono-code text-slate-400 uppercase -mt-0.5">
                    NET SCORE (-100 to +100)
                  </span>
                </div>
              </div>

              {/* Gauge Extremes Labels */}
              <div className="w-full flex justify-between px-4 text-[10px] font-mono-code font-bold">
                <span className="text-rose-400 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                  <span>BEARISH (-100)</span>
                </span>
                <span className="text-amber-300">NEUTRAL (0)</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span>BULLISH (+100)</span>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </span>
              </div>

              {/* Linear Color-Coded Progress Track with Needle Position */}
              <div className="w-full px-2 mt-3 space-y-1">
                <div className="relative w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                  <div className="h-full w-[44%] bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500/70" />
                  <div className="h-full w-[12%] bg-amber-500/80" />
                  <div className="h-full w-[44%] bg-gradient-to-r from-amber-500/70 via-emerald-500 to-emerald-400" />
                </div>

                <div className="relative w-full h-3">
                  <div
                    className="absolute top-0 -ml-1.5 transition-all duration-700 ease-out flex flex-col items-center"
                    style={{ left: `${normalizedPercent}%` }}
                  >
                    <div
                      className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] ${
                        targetData.isBullish
                          ? 'border-b-emerald-400'
                          : targetData.isBearish
                          ? 'border-b-rose-400'
                          : 'border-b-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Clear Percentage Strength Indicator */}
                <div className="text-center pt-0.5">
                  <span
                    className={`text-[11px] font-mono-code font-bold ${
                      targetData.isBullish
                        ? 'text-emerald-400'
                        : targetData.isBearish
                        ? 'text-rose-400'
                        : 'text-amber-300'
                    }`}
                  >
                    {targetData.isBullish
                      ? `🟢 ${targetData.strengthPercent}% Bullish Strength (Net ${targetData.score > 0 ? `+${targetData.score}` : targetData.score})`
                      : targetData.isBearish
                      ? `🔴 ${targetData.strengthPercent}% Bearish Pressure (Net ${targetData.score})`
                      : `⚪ 50% Neutral Balance (Score 0)`}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Trend Confidence Score Display (Cols 5-8 on XL) */}
            <div className="xl:col-span-4 flex flex-col justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>TREND CONFIDENCE SCORE</span>
                </span>
                <span
                  className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full border ${
                    targetData.trendConfidence.tier === 'HIGH'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : targetData.trendConfidence.tier === 'LOW'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {targetData.trendConfidence.tierLabel}
                </span>
              </div>

              {/* Radial Confidence Ring & Percentage */}
              <div className="flex items-center justify-center gap-4 py-1">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={ringRadius}
                      className="stroke-slate-800"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={ringRadius}
                      stroke={
                        targetData.trendConfidence.tier === 'HIGH'
                          ? '#10b981'
                          : targetData.trendConfidence.tier === 'LOW'
                          ? '#ef4444'
                          : '#f59e0b'
                      }
                      strokeWidth="9"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span
                      className={`text-xl sm:text-2xl font-military font-bold tracking-tight ${
                        targetData.trendConfidence.tier === 'HIGH'
                          ? 'text-emerald-300'
                          : targetData.trendConfidence.tier === 'LOW'
                          ? 'text-rose-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {targetData.trendConfidence.score}%
                    </span>
                    <span className="text-[8px] font-mono-code text-slate-400 uppercase -mt-0.5">
                      CONFIDENCE
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-xs font-military font-bold text-slate-200">
                    {targetData.trendConfidence.score >= 70
                      ? 'Strong Trend Alignment'
                      : targetData.trendConfidence.score >= 50
                      ? 'Moderate Trend Conviction'
                      : 'High Macro Uncertainty'}
                  </div>
                  <p className="text-[10px] font-mono-code text-slate-400 leading-tight">
                    Derived from institutional futures volume flow and macroeconomic volatility stability.
                  </p>
                </div>
              </div>

              {/* Breakdown: Volume Context & Volatility Context Micro-Gauges */}
              <div className="space-y-2 pt-1 border-t border-slate-800/60 font-mono-code text-[10px]">
                {/* 1. Volume Context Meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-300">
                      <BarChart2 className="w-3 h-3 text-cyan-400" />
                      <span>Volume Flow Context:</span>
                    </span>
                    <span className="font-bold text-cyan-300">
                      {targetData.trendConfidence.volumeScore}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${targetData.trendConfidence.volumeScore}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 truncate" title={targetData.trendConfidence.volumeDetail}>
                    {targetData.trendConfidence.volumeDetail}
                  </div>
                </div>

                {/* 2. Volatility Stability Meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Activity className="w-3 h-3 text-amber-400" />
                      <span>Volatility Stability:</span>
                    </span>
                    <span className="font-bold text-amber-300">
                      {targetData.trendConfidence.volatilityScore}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${targetData.trendConfidence.volatilityScore}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 truncate" title={targetData.trendConfidence.volatilityDetail}>
                    {targetData.trendConfidence.volatilityDetail}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Target Breakdown & Institutional Drivers (Cols 9-12 on XL) */}
            <div className="xl:col-span-4 flex flex-col justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <span>EVALUATION TARGET</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-cyan-400 font-bold">{targetData.type}</span>
                  </div>
                  <div className="text-xs font-mono-code font-bold text-slate-300 truncate max-w-[180px]">
                    {targetData.id}
                  </div>
                </div>

                {/* Big Sentiment Bias Badge with Icon */}
                <div
                  className={`mt-2 p-2.5 rounded-xl border flex items-center gap-2.5 shadow-lg transition-all ${
                    targetData.isBullish
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-emerald-500/15'
                      : targetData.isBearish
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-rose-500/15'
                      : 'bg-slate-800/80 border-slate-700 text-slate-200'
                  }`}
                >
                  {targetData.isBullish ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
                  ) : targetData.isBearish ? (
                    <TrendingDown className="w-5 h-5 text-rose-400 stroke-[2.5]" />
                  ) : (
                    <Minus className="w-5 h-5 text-slate-400 stroke-[2.5]" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono-code uppercase tracking-wider opacity-80">
                      SENTIMENT BIAS
                    </div>
                    <div className="text-xs font-military font-bold tracking-wide truncate">
                      {targetData.label} ({targetData.score > 0 ? `+${targetData.score}` : targetData.score})
                    </div>
                  </div>
                </div>

                {/* Key Drivers List */}
                <div className="mt-2.5 space-y-1.5 text-[11px] font-mono-code">
                  <div className="text-[10px] font-military font-bold text-cyan-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>CATALYSTS & EVIDENCE</span>
                  </div>
                  {targetData.drivers.slice(0, 4).map((driver: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                          targetData.isBullish
                            ? 'bg-emerald-400'
                            : targetData.isBearish
                            ? 'bg-rose-400'
                            : 'bg-cyan-400'
                        }`}
                      />
                      <span className="leading-tight line-clamp-1">{driver}</span>
                    </div>
                  ))}
                  {targetData.conflicts && targetData.conflicts.length > 0 && (
                    <div className="pt-1 text-[10px] text-amber-300/90 flex items-start gap-1">
                      <span className="shrink-0 text-amber-400 font-bold">⚠️</span>
                      <span className="line-clamp-1">{targetData.conflicts[0]}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Links & Key Rates */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <div className="flex items-center gap-2 text-[10px] font-mono-code text-slate-400">
                  {targetData.policyRate !== undefined && (
                    <span>Rate: <strong className="text-slate-200">{targetData.policyRate.toFixed(2)}%</strong></span>
                  )}
                  {targetData.yield10Y !== undefined && (
                    <span>10Y: <strong className="text-slate-200">{targetData.yield10Y.toFixed(2)}%</strong></span>
                  )}
                  {targetData.pairDetails && (
                    <span className="text-slate-300 font-bold">{targetData.pairDetails.base} vs {targetData.pairDetails.quote}</span>
                  )}
                </div>

                {onSelectTab && (
                  <button
                    type="button"
                    onClick={() => {
                      if (targetData.type === 'COMMODITY') onSelectTab('COMMODITIES');
                      else if (targetData.type === 'CURRENCY') onSelectTab('WORKSPACES');
                      else if (targetData.type === 'PAIR') onSelectTab('PAIR_SCANNER');
                      else onSelectTab('OVERVIEW');
                    }}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-military font-bold text-xs hover:underline cursor-pointer"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
