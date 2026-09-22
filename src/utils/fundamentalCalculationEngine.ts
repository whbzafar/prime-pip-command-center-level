import {
  CurrencyCode,
  IndicatorCategory,
  IndicatorDefinition,
  IndicatorObservation,
  CotPositioningRecord,
  MarketSentimentRecord,
  InterestRateRecord,
  CommodityObservation,
  ModelCategoryWeights,
  IndicatorScoreResult,
  CategoryScoreResult,
  CurrencyScoreResult,
  PairDifferentialResult,
  BacktestRuleConfig,
} from '../types/fundamentalIndicatorTypes';
import { CURRENCIES, OFFICIAL_INDICATOR_REGISTRY, DEFAULT_CATEGORY_WEIGHTS } from '../data/fundamentalRegistryData';

const CURRENT_TIMESTAMP_MS = Date.now();

export function calculateIndicatorScore(
  definition: IndicatorDefinition,
  observation?: IndicatorObservation
): IndicatorScoreResult {
  if (!observation || typeof observation.actual !== 'number' || isNaN(observation.actual)) {
    return {
      indicatorId: definition.id,
      definition,
      observation,
      actual: null,
      forecast: null,
      previous: null,
      surprise: null,
      change: null,
      standardizedSurprise: null,
      score: 0,
      weightedContribution: 0,
      interpretationText: 'No verified observation recorded. Indicator requires manual entry.',
      status: 'MISSING',
      ageDays: 999,
    };
  }

  const actual = observation.actual;
  const forecast = typeof observation.forecast === 'number' && !isNaN(observation.forecast) ? observation.forecast : null;
  const previous = typeof observation.previous === 'number' && !isNaN(observation.previous) ? observation.previous : null;

  const surprise = forecast !== null ? Number((actual - forecast).toFixed(4)) : null;
  const change = previous !== null ? Number((actual - previous).toFixed(4)) : null;

  const stdDev = definition.historicalSurpriseStdDev || 1.0;
  const standardizedSurprise = surprise !== null ? Number((surprise / stdDev).toFixed(3)) : null;

  let rawScore = 0;
  let interpretationText = '';

  switch (definition.scoringDirection) {
    case 'HIGHER_IS_BULLISH': {
      if (standardizedSurprise !== null) {
        // Standardized z-score mapping (-2.5 to +2.5 maps to -100 to +100)
        rawScore = Math.max(-100, Math.min(100, standardizedSurprise * 40));
        if (change !== null) {
          rawScore = rawScore * 0.75 + Math.sign(change) * Math.min(25, Math.abs(change) * 10);
        }
      } else if (change !== null) {
        rawScore = Math.max(-80, Math.min(80, (change / stdDev) * 35));
      } else {
        rawScore = 0;
      }

      if (definition.benchmarkTarget !== undefined) {
        const diffFromTarget = actual - definition.benchmarkTarget;
        const targetComponent = Math.max(-30, Math.min(30, diffFromTarget * 10));
        rawScore = rawScore * 0.7 + targetComponent;
      }

      interpretationText = surprise !== null && surprise > 0
        ? `Surprise beat forecast by +${surprise}${definition.unit}. Supportive of economic expansion.`
        : surprise !== null && surprise < 0
        ? `Missed forecast by ${surprise}${definition.unit}. Indicates slowing momentum.`
        : `In line with expectations. Moderate baseline support.`;
      break;
    }

    case 'LOWER_IS_BULLISH': {
      // Inverted direction: lower actual vs forecast/previous is bullish (e.g. unemployment)
      if (standardizedSurprise !== null) {
        rawScore = Math.max(-100, Math.min(100, -standardizedSurprise * 45));
        if (change !== null) {
          rawScore = rawScore * 0.75 - Math.sign(change) * Math.min(25, Math.abs(change) * 15);
        }
      } else if (change !== null) {
        rawScore = Math.max(-80, Math.min(80, -(change / stdDev) * 40));
      }

      interpretationText = surprise !== null && surprise < 0
        ? `Lower than forecast by ${surprise}${definition.unit}. Tighter labor market supports economic strength.`
        : surprise !== null && surprise > 0
        ? `Higher than forecast by +${surprise}${definition.unit}. Softening conditions reduce policy rate support.`
        : `Aligned with forecast. Neutral labor market pressure.`;
      break;
    }

    case 'INFLATION_POLICY_PATH': {
      const target = definition.benchmarkTarget ?? 2.0;
      if (standardizedSurprise !== null) {
        let surpriseComponent = Math.max(-70, Math.min(70, standardizedSurprise * 40));
        const aboveTarget = actual - target;
        let targetComponent = Math.max(-30, Math.min(30, aboveTarget * 18));

        // Overheating penalty: if inflation is extreme (> 7.5%), it harms the currency via purchasing power erosion
        if (actual > 7.5) {
          surpriseComponent -= (actual - 7.5) * 15;
        }

        rawScore = Math.max(-100, Math.min(100, surpriseComponent + targetComponent));
      } else {
        const diff = actual - target;
        rawScore = Math.max(-60, Math.min(60, diff * 25));
      }

      interpretationText = actual > target
        ? `Headline/Core print of ${actual}% exceeds the ${target}% target, reinforcing higher-for-longer rate probabilities.`
        : `Reading of ${actual}% below target level, increasing policy easing leeway.`;
      break;
    }

    case 'EXTERNAL_BALANCE': {
      if (standardizedSurprise !== null) {
        rawScore = Math.max(-100, Math.min(100, standardizedSurprise * 40));
      } else {
        rawScore = Math.max(-60, Math.min(60, actual > 0 ? 30 : -30));
      }
      interpretationText = actual >= 0
        ? `Positive trade surplus of ${actual} provides structural foreign exchange demand.`
        : `Trade deficit of ${actual} represents net capital outflow pressure.`;
      break;
    }

    default: {
      rawScore = standardizedSurprise !== null ? Math.max(-80, Math.min(80, standardizedSurprise * 35)) : 0;
      interpretationText = `Observed reading: ${actual}${definition.unit}.`;
    }
  }

  const score = Math.round(Math.max(-100, Math.min(100, rawScore)));

  // Calculate age in days
  const releaseTime = new Date(observation.releaseDate || observation.updatedAt).getTime();
  const ageDays = Math.max(0, Math.floor((CURRENT_TIMESTAMP_MS - releaseTime) / (1000 * 60 * 60 * 24)));

  let status: 'CURRENT' | 'RECENT' | 'STALE' | 'MISSING' = 'CURRENT';
  const staleThresholdDays = definition.frequency === 'Quarterly' ? 120 : definition.frequency === 'Annual' ? 400 : 45;

  if (ageDays > staleThresholdDays) {
    status = 'STALE';
  } else if (ageDays > 20) {
    status = 'RECENT';
  }

  return {
    indicatorId: definition.id,
    definition,
    observation,
    actual,
    forecast,
    previous,
    surprise,
    change,
    standardizedSurprise,
    score,
    weightedContribution: Number(((score * definition.weightInCategory) / 100).toFixed(2)),
    interpretationText,
    status,
    ageDays,
  };
}

export function calculateCategoryScores(
  currency: CurrencyCode,
  observations: IndicatorObservation[],
  customWeights: ModelCategoryWeights = DEFAULT_CATEGORY_WEIGHTS,
  cotRecords: CotPositioningRecord[] = [],
  sentimentRecords: MarketSentimentRecord[],
  interestRateRecords: InterestRateRecord[]
): Record<IndicatorCategory, CategoryScoreResult> {
  const definitions = OFFICIAL_INDICATOR_REGISTRY.filter((d) => d.currency === currency && d.isActive);
  const obsMap = new Map<string, IndicatorObservation>(observations.filter((o) => o.currency === currency).map((o) => [o.indicatorId, o]));

  const categoryLabels: Record<IndicatorCategory, string> = {
    MONETARY_POLICY: 'Monetary Policy & Central Bank',
    INFLATION: 'Inflation & Consumer Prices',
    GROWTH: 'GDP & Economic Growth',
    EMPLOYMENT: 'Labor Market & Employment',
    RATES_YIELDS: 'Interest Rates & Sovereign Yields',
    BUSINESS_ACTIVITY: 'Business Activity & PMIs',
    CONSUMER: 'Consumer Spending & Sentiment',
    TRADE_EXTERNAL: 'Trade & External Balance',
    COT_POSITIONING: 'COT Market Positioning',
    SENTIMENT: 'Market Sentiment & Risk Regime',
    HOUSING: 'Housing & Real Estate',
    FISCAL: 'Fiscal & Government Policy',
    COMMODITY_DRIVER: 'Commodity & Terms of Trade Exposure',
  };

  const results: Partial<Record<IndicatorCategory, CategoryScoreResult>> = {};
  const allCategories: IndicatorCategory[] = [
    'MONETARY_POLICY',
    'INFLATION',
    'GROWTH',
    'EMPLOYMENT',
    'RATES_YIELDS',
    'BUSINESS_ACTIVITY',
    'CONSUMER',
    'TRADE_EXTERNAL',
    'COT_POSITIONING',
    'SENTIMENT',
    'HOUSING',
    'FISCAL',
    'COMMODITY_DRIVER',
  ];

  for (const cat of allCategories) {
    const catDefs = definitions.filter((d) => d.category === cat);

    // Handle special modules: COT and Sentiment
    if (cat === 'COT_POSITIONING') {
      const cot = cotRecords.find((c) => c.currency === currency);
      const cotScore = cot ? calculateCotScore(cot) : 0;
      const weight = customWeights.COT_POSITIONING || 5;
      results[cat] = {
        category: cat,
        categoryLabel: categoryLabels[cat],
        score: cotScore,
        weight,
        weightedContribution: Number(((cotScore * weight) / 100).toFixed(2)),
        indicatorCount: 1,
        activeCount: cot ? 1 : 0,
        indicators: [],
      };
      continue;
    }

    if (cat === 'SENTIMENT') {
      const sent = sentimentRecords.find((s) => s.currency === currency);
      const sentScore = sent ? calculateSentimentScore(sent) : 0;
      const weight = customWeights.SENTIMENT || 5;
      results[cat] = {
        category: cat,
        categoryLabel: categoryLabels[cat],
        score: sentScore,
        weight,
        weightedContribution: Number(((sentScore * weight) / 100).toFixed(2)),
        indicatorCount: 1,
        activeCount: sent ? 1 : 0,
        indicators: [],
      };
      continue;
    }

    if (cat === 'RATES_YIELDS') {
      const ir = interestRateRecords.find((r) => r.currency === currency);
      const yieldScore = ir ? calculateInterestRateScore(ir) : 0;
      const weight = customWeights.RATES_YIELDS || 10;
      results[cat] = {
        category: cat,
        categoryLabel: categoryLabels[cat],
        score: yieldScore,
        weight,
        weightedContribution: Number(((yieldScore * weight) / 100).toFixed(2)),
        indicatorCount: 1,
        activeCount: ir ? 1 : 0,
        indicators: [],
      };
      continue;
    }

    if (!catDefs.length) {
      results[cat] = {
        category: cat,
        categoryLabel: categoryLabels[cat],
        score: 0,
        weight: (customWeights as any)[cat] || 0,
        weightedContribution: 0,
        indicatorCount: 0,
        activeCount: 0,
        indicators: [],
      };
      continue;
    }

    const indicatorScores: IndicatorScoreResult[] = catDefs.map((def) => {
      const obs = obsMap.get(def.id);
      return calculateIndicatorScore(def, obs);
    });

    const activeIndicators = indicatorScores.filter((i) => i.actual !== null);
    let categoryScore = 0;

    if (activeIndicators.length > 0) {
      const totalActiveWeight = activeIndicators.reduce((acc, i) => acc + i.definition.weightInCategory, 0);
      if (totalActiveWeight > 0) {
        const weightedSum = activeIndicators.reduce(
          (acc, i) => acc + i.score * (i.definition.weightInCategory / totalActiveWeight),
          0
        );
        categoryScore = Math.round(weightedSum);
      }
    }

    const catWeight = (customWeights as any)[cat] || 0;
    results[cat] = {
      category: cat,
      categoryLabel: categoryLabels[cat],
      score: categoryScore,
      weight: catWeight,
      weightedContribution: Number(((categoryScore * catWeight) / 100).toFixed(2)),
      indicatorCount: catDefs.length,
      activeCount: activeIndicators.length,
      indicators: indicatorScores,
    };
  }

  return results as Record<IndicatorCategory, CategoryScoreResult>;
}

export function calculateCotScore(record: CotPositioningRecord): number {
  if (
    typeof record.nonCommercialLong !== 'number' ||
    typeof record.nonCommercialShort !== 'number' ||
    typeof record.openInterest !== 'number' ||
    !Number.isFinite(record.nonCommercialLong) ||
    !Number.isFinite(record.nonCommercialShort) ||
    !Number.isFinite(record.openInterest) ||
    record.openInterest <= 0
  ) return 0;

  const netPosition = record.nonCommercialLong - record.nonCommercialShort;
  const netRatio = netPosition / record.openInterest;
  return Math.round(Math.max(-100, Math.min(100, netRatio * 500)));
}

export function calculateSentimentScore(record: MarketSentimentRecord): number {
  let score = 0;
  // Risk regime
  if (record.globalRiskRegime === 'RISK_ON') {
    // Pro-cyclical currencies (AUD, NZD, CAD, GBP) benefit from risk-on; safe havens (CHF, JPY, USD) soften
    if (['AUD', 'NZD', 'CAD', 'GBP'].includes(record.currency)) score += 25;
    else if (['JPY', 'CHF'].includes(record.currency)) score -= 20;
  } else if (record.globalRiskRegime === 'RISK_OFF') {
    if (['JPY', 'CHF', 'USD'].includes(record.currency)) score += 30;
    else if (['AUD', 'NZD', 'CAD'].includes(record.currency)) score -= 30;
  }

  // Currency specific sentiment
  if (record.currencySentiment === 'BULLISH') score += 35;
  else if (record.currencySentiment === 'BEARISH') score -= 35;

  // News sentiment
  if (record.newsSentiment === 'BULLISH') score += 20;
  else if (record.newsSentiment === 'BEARISH') score -= 20;

  // Central bank tone
  if (record.centralBankTone === 'HAWKISH') score += 25;
  else if (record.centralBankTone === 'DOVISH') score -= 25;

  // Confidence scaling (0.5 to 1.0 multiplier)
  const confidenceMult = 0.5 + (record.sentimentConfidence / 200);
  return Math.round(Math.max(-100, Math.min(100, score * confidenceMult)));
}

export function calculateInterestRateScore(record: InterestRateRecord): number {
  let score = 0;
  // Policy rate level (0% is -40, 5% is +40)
  score += Math.max(-50, Math.min(50, (record.currentPolicyRate - 2.5) * 16));

  // Forward bias
  if (record.centralBankBias === 'HAWKISH') score += 25;
  else if (record.centralBankBias === 'DOVISH') score -= 25;

  // 10Y sovereign yield
  score += Math.max(-25, Math.min(25, (record.yield10Y - 2.5) * 10));

  return Math.round(Math.max(-100, Math.min(100, score)));
}

export function calculateCurrencyScore(
  currency: CurrencyCode,
  observations: IndicatorObservation[],
  customWeights: ModelCategoryWeights = DEFAULT_CATEGORY_WEIGHTS,
  cotRecords: CotPositioningRecord[] = [],
  sentimentRecords: MarketSentimentRecord[] = [],
  interestRateRecords: InterestRateRecord[] = [],
  modelVersion = '1.0',
  weightsVersion = '1.0'
): CurrencyScoreResult {
  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencyName = currencyInfo ? currencyInfo.name : currency;

  const categoryScores = calculateCategoryScores(
    currency,
    observations,
    customWeights,
    cotRecords,
    sentimentRecords,
    interestRateRecords
  );

  let weightedScoreSum = 0;
  let totalApplicableWeight = 0;
  let completedIndicators = 0;
  let totalIndicators = 0;
  let staleCount = 0;

  for (const cat of Object.values(categoryScores)) {
    totalIndicators += cat.indicatorCount;
    completedIndicators += cat.activeCount;

    for (const ind of cat.indicators) {
      if (ind.status === 'STALE') staleCount++;
    }

    if (cat.activeCount > 0) {
      weightedScoreSum += cat.score * cat.weight;
      totalApplicableWeight += cat.weight;
    }
  }

  const rawComposite = totalApplicableWeight > 0 ? weightedScoreSum / totalApplicableWeight : 0;
  const compositeScore = Math.round(Math.max(-100, Math.min(100, rawComposite)));

  const dataCoveragePercent = totalIndicators > 0 ? Math.round((completedIndicators / totalIndicators) * 100) : 100;

  let freshnessStatus: 'CURRENT' | 'PARTIAL' | 'STALE' | 'INCOMPLETE' = 'CURRENT';
  if (dataCoveragePercent < 75) {
    freshnessStatus = 'INCOMPLETE';
  } else if (staleCount > 2) {
    freshnessStatus = 'STALE';
  } else if (dataCoveragePercent < 90) {
    freshnessStatus = 'PARTIAL';
  }

  // Section 29: Evaluate Conflicting Evidence
  const primarySupport: string[] = [];
  const conflictingFactors: string[] = [];

  for (const cat of Object.values(categoryScores)) {
    if (compositeScore >= 15) {
      if (cat.score >= 25 && cat.weight >= 5) {
        primarySupport.push(`${cat.categoryLabel} (+${cat.score})`);
      } else if (cat.score <= -25 && cat.weight >= 5) {
        conflictingFactors.push(`⚠ ${cat.categoryLabel} is negative (${cat.score}) contrary to macro support`);
      }
    } else if (compositeScore <= -15) {
      if (cat.score <= -25 && cat.weight >= 5) {
        primarySupport.push(`${cat.categoryLabel} (${cat.score})`);
      } else if (cat.score >= 25 && cat.weight >= 5) {
        conflictingFactors.push(`⚠ ${cat.categoryLabel} is positive (+${cat.score}) contrary to negative trend`);
      }
    }
  }

  let assessmentLabel = 'NEUTRAL / MIXED FACTORS';
  if (compositeScore >= 60) {
    assessmentLabel = conflictingFactors.length > 0 ? 'STRONG POSITIVE WITH CONFLICTING FACTORS' : 'STRONG FUNDAMENTAL BULLISH';
  } else if (compositeScore >= 25) {
    assessmentLabel = conflictingFactors.length > 0 ? 'POSITIVE WITH CONFLICTING POSITIONING' : 'MODERATELY BULLISH';
  } else if (compositeScore <= -60) {
    assessmentLabel = conflictingFactors.length > 0 ? 'STRONG NEGATIVE WITH CONFLICTING FACTORS' : 'STRONG FUNDAMENTAL BEARISH';
  } else if (compositeScore <= -25) {
    assessmentLabel = conflictingFactors.length > 0 ? 'NEGATIVE WITH CONFLICTING POSITIONING' : 'MODERATELY BEARISH';
  }

  return {
    currency,
    currencyName,
    score: compositeScore,
    finalCompositeScore: compositeScore,
    primaryDrivers: primarySupport,
    interestRateLevel: observations.find((o) => o.currency === currency && o.indicatorId.includes('POLICY'))?.actual ?? 3.5,
    tenYearBondYield: observations.find((o) => o.currency === currency && o.indicatorId.includes('10Y'))?.actual ?? 3.0,
    categoryScores,
    dataCoveragePercent,
    completedIndicators,
    totalIndicators,
    freshnessStatus,
    conflictingFactors,
    primarySupport,
    assessmentLabel,
    modelVersion,
    weightsVersion,
    calculatedAt: new Date().toISOString(),
  };
}

export function calculatePairDifferential(
  baseOrPair: string,
  quoteOrBaseScore?: any,
  scoresOrQuoteScore?: any,
  ruleConfig: BacktestRuleConfig = {
    strongBullishThreshold: 75,
    bullishThreshold: 30,
    bearishThreshold: -30,
    strongBearishThreshold: -75,
  }
): PairDifferentialResult {
  let baseCurrency: CurrencyCode;
  let quoteCurrency: CurrencyCode;
  let base: CurrencyScoreResult | undefined;
  let quote: CurrencyScoreResult | undefined;

  if (baseOrPair.length === 6 && quoteOrBaseScore && typeof quoteOrBaseScore === 'object' && 'score' in quoteOrBaseScore) {
    baseCurrency = baseOrPair.slice(0, 3) as CurrencyCode;
    quoteCurrency = baseOrPair.slice(3, 6) as CurrencyCode;
    base = quoteOrBaseScore as CurrencyScoreResult;
    quote = scoresOrQuoteScore as CurrencyScoreResult;
  } else {
    baseCurrency = baseOrPair as CurrencyCode;
    quoteCurrency = quoteOrBaseScore as CurrencyCode;
    const scores = scoresOrQuoteScore as Record<CurrencyCode, CurrencyScoreResult>;
    base = scores?.[baseCurrency];
    quote = scores?.[quoteCurrency];
  }

  const baseScore = base?.score ?? 0;
  const quoteScore = quote?.score ?? 0;
  const differential = baseScore - quoteScore;

  const cotBase = base?.categoryScores?.COT_POSITIONING?.score ?? 0;
  const cotQuote = quote?.categoryScores?.COT_POSITIONING?.score ?? 0;
  const cotDifferential = cotBase - cotQuote;

  const sentBase = base?.categoryScores?.SENTIMENT?.score ?? 0;
  const sentQuote = quote?.categoryScores?.SENTIMENT?.score ?? 0;
  const sentimentDifferential = sentBase - sentQuote;

  const rateBase = base?.categoryScores?.RATES_YIELDS?.score ?? 0;
  const rateQuote = quote?.categoryScores?.RATES_YIELDS?.score ?? 0;
  const interestRateDifferential = rateBase - rateQuote;

  const avgCoverage = Math.round(((base?.dataCoveragePercent ?? 100) + (quote?.dataCoveragePercent ?? 100)) / 2);

  let bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL_MIXED' | 'BEARISH' | 'STRONG_BEARISH' = 'NEUTRAL_MIXED';
  let biasLabel = 'NEUTRAL / BALANCED SPREAD';

  if (differential >= ruleConfig.strongBullishThreshold) {
    bias = 'STRONG_BULLISH';
    biasLabel = 'STRONG RELATIVE BULLISH BIAS';
  } else if (differential >= ruleConfig.bullishThreshold) {
    bias = 'BULLISH';
    biasLabel = 'BULLISH RELATIVE BIAS';
  } else if (differential <= ruleConfig.strongBearishThreshold) {
    bias = 'STRONG_BEARISH';
    biasLabel = 'STRONG RELATIVE BEARISH BIAS';
  } else if (differential <= ruleConfig.bearishThreshold) {
    bias = 'BEARISH';
    biasLabel = 'BEARISH RELATIVE BIAS';
  }

  const primaryDrivers: string[] = [];
  const conflicts: string[] = [];

  if (Math.abs(rateBase - rateQuote) > 20) {
    primaryDrivers.push(`Monetary policy & rate spread favors ${rateBase > rateQuote ? baseCurrency : quoteCurrency}`);
  }
  if (Math.abs(cotBase - cotQuote) > 25) {
    primaryDrivers.push(`COT speculative positioning favors ${cotBase > cotQuote ? baseCurrency : quoteCurrency}`);
  }
  if (Math.abs(sentBase - sentQuote) > 25) {
    primaryDrivers.push(`Market risk regime favors ${sentBase > sentQuote ? baseCurrency : quoteCurrency}`);
  }

  if (differential > 30 && cotDifferential < -20) {
    conflicts.push(`Macro data favors ${baseCurrency}, but COT institutional positioning heavily favors ${quoteCurrency}.`);
  } else if (differential < -30 && cotDifferential > 20) {
    conflicts.push(`Macro data favors ${quoteCurrency}, but COT institutional positioning heavily favors ${baseCurrency}.`);
  }

  const conflictLevel = conflicts.length >= 2 ? 'HIGH' : conflicts.length === 1 ? 'MODERATE' : 'LOW';

  return {
    pair: `${baseCurrency}${quoteCurrency}`,
    baseCurrency,
    quoteCurrency,
    baseScore,
    quoteScore,
    differential,
    netDifferential: differential,
    cotDifferential,
    sentimentDifferential,
    interestRateDifferential,
    interestRateSpread: interestRateDifferential,
    tenYearSpread: rateBase - rateQuote,
    dataCoveragePercent: avgCoverage,
    conflictLevel,
    bias,
    biasLabel,
    fundamentalBias: biasLabel,
    primaryDrivers,
    conflicts,
  };
}

export function calculateAllPairDifferentials(
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>,
  ruleConfig?: BacktestRuleConfig
): PairDifferentialResult[] {
  const majorPairs: [CurrencyCode, CurrencyCode][] = [
    ['EUR', 'USD'],
    ['GBP', 'USD'],
    ['USD', 'JPY'],
    ['USD', 'CHF'],
    ['USD', 'CAD'],
    ['AUD', 'USD'],
    ['NZD', 'USD'],
    ['EUR', 'GBP'],
    ['EUR', 'JPY'],
    ['GBP', 'JPY'],
    ['AUD', 'JPY'],
    ['CAD', 'JPY'],
    ['CHF', 'JPY'],
    ['NZD', 'JPY'],
    ['EUR', 'AUD'],
    ['EUR', 'CAD'],
    ['EUR', 'CHF'],
    ['GBP', 'AUD'],
    ['GBP', 'CAD'],
    ['GBP', 'CHF'],
    ['AUD', 'CAD'],
    ['AUD', 'NZD'],
    ['AUD', 'CHF'],
    ['NZD', 'CAD'],
    ['CAD', 'CHF'],
  ];

  return majorPairs.map(([base, quote]) => calculatePairDifferential(base, quote, currencyScores, ruleConfig));
}

export function calculateCommodityFundamentalScore(obs: CommodityObservation): {
  score: number;
  bias: 'STRONGLY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONGLY_BEARISH';
  drivers: { label: string; score: number; impact: string }[];
} {
  let score = 0;
  const drivers: { label: string; score: number; impact: string }[] = [];

  if (obs.symbol === 'GOLD') {
    // Real yields (inverted: lower real yields = positive gold)
    if (obs.usRealYield10Y !== undefined) {
      const realYieldScore = Math.round(Math.max(-40, Math.min(40, (2.0 - obs.usRealYield10Y) * 30)));
      score += realYieldScore;
      drivers.push({
        label: 'US 10Y Real Yield (TIPS)',
        score: realYieldScore,
        impact: obs.usRealYield10Y < 1.8 ? 'Bullish (Lower opportunity cost vs non-yielding bullion)' : 'Bearish (High real yield on risk-free cash)',
      });
    }

    // DXY Dollar index (inverted: weaker dollar makes gold cheaper globally)
    if (obs.dxyIndex !== undefined) {
      const dxyScore = Math.round(Math.max(-30, Math.min(30, (103.0 - obs.dxyIndex) * 10)));
      score += dxyScore;
      drivers.push({
        label: 'US Dollar Index (DXY)',
        score: dxyScore,
        impact: obs.dxyIndex < 102 ? 'Bullish (Weaker USD lowers acquisition cost for foreign reserve buyers)' : 'Bearish (Strong USD exerts headwind)',
      });
    }

    // Inflation hedging expectations (5Y Breakeven)
    if (obs.inflationBreakeven5Y !== undefined) {
      const infScore = Math.round(Math.max(-20, Math.min(20, (obs.inflationBreakeven5Y - 2.15) * 25)));
      score += infScore;
      drivers.push({
        label: '5Y Inflation Breakeven Expectations',
        score: infScore,
        impact: obs.inflationBreakeven5Y >= 2.2 ? 'Bullish (Elevated inflation hedging demand)' : 'Bearish (Disinflationary pricing)',
      });
    }

    // Central bank demand (Sovereign reserve de-dollarization)
    if (obs.centralBankDemandTone === 'AGGRESSIVE_BUYING') {
      score += 25;
      drivers.push({ label: 'Central Bank Gold Reserves Buying', score: 25, impact: 'Very Bullish (Sovereign de-dollarization & reserve diversification)' });
    } else if (obs.centralBankDemandTone === 'STEADY') {
      score += 10;
      drivers.push({ label: 'Central Bank Gold Reserves Buying', score: 10, impact: 'Mildly Supportive' });
    }

    // Geopolitical risk premium
    if (obs.geopoliticalRiskLevel === 'HIGH') {
      score += 25;
      drivers.push({ label: 'Geopolitical Risk Premium', score: 25, impact: 'Bullish (Safe-haven hedging and tail-risk defense)' });
    } else if (obs.geopoliticalRiskLevel === 'LOW') {
      score -= 10;
      drivers.push({ label: 'Geopolitical Risk Premium', score: -10, impact: 'Mild Drag (Low flight-to-safety urgency)' });
    }

    // Non-Commercial COT Positioning
    if (obs.cotNetPosition !== undefined && obs.cotNetPosition > 0) {
      const cotScore = Math.round(Math.max(-25, Math.min(25, ((obs.cotNetPosition - 200000) / 100000) * 20)));
      score += cotScore;
      drivers.push({
        label: 'CFTC Gold Speculative COT Positioning',
        score: cotScore,
        impact: obs.cotNetPosition > 220000 ? 'Bullish (Institutional trend-followers accumulating longs)' : 'Neutral / Liquidating',
      });
    }
  } else if (obs.symbol === 'SILVER') {
    // Real yields (inverted)
    if (obs.usRealYield10Y !== undefined) {
      const realYieldScore = Math.round(Math.max(-30, Math.min(30, (2.0 - obs.usRealYield10Y) * 25)));
      score += realYieldScore;
      drivers.push({
        label: 'US 10Y Real Yield (TIPS)',
        score: realYieldScore,
        impact: obs.usRealYield10Y < 1.8 ? 'Bullish (Monetary easing tailwind)' : 'Bearish (High real yields)',
      });
    }

    // DXY (inverted)
    if (obs.dxyIndex !== undefined) {
      const dxyScore = Math.round(Math.max(-25, Math.min(25, (103.0 - obs.dxyIndex) * 8)));
      score += dxyScore;
      drivers.push({
        label: 'US Dollar Index (DXY)',
        score: dxyScore,
        impact: obs.dxyIndex < 102 ? 'Bullish (Dollar softening)' : 'Bearish',
      });
    }

    // Industrial demand is a core silver driver; do not reuse gold's central-bank field.
    if (obs.industrialDemandTone === 'STRONG') {
      score += 25;
      drivers.push({ label: 'Industrial Demand', score: 25, impact: 'Bullish (Strong industrial/technology demand)' });
    } else if (obs.industrialDemandTone === 'WEAK') {
      score -= 25;
      drivers.push({ label: 'Industrial Demand', score: -25, impact: 'Bearish (Weak industrial demand)' });
    }

    // Geopolitical Risk
    if (obs.geopoliticalRiskLevel === 'HIGH') {
      score += 15;
      drivers.push({ label: 'Precious Metals Haven Tone', score: 15, impact: 'Supportive safe-haven contagion from Gold' });
    }
  } else if (obs.symbol === 'CRUDE_OIL') {
    // Supply / Demand balance
    if (obs.supplyDemandBalance === 'DEFICIT') {
      score += 35;
      drivers.push({ label: 'Physical Market Balance', score: 35, impact: 'Bullish (Demand outpacing supply)' });
    } else if (obs.supplyDemandBalance === 'SURPLUS') {
      score -= 30;
      drivers.push({ label: 'Physical Market Balance', score: -30, impact: 'Bearish (Excess global supply)' });
    }

    // Inventories surprise
    if (obs.inventoriesWeeklySurpriseMb !== undefined) {
      const invScore = Math.round(Math.max(-25, Math.min(25, -obs.inventoriesWeeklySurpriseMb * 12)));
      score += invScore;
      drivers.push({
        label: 'EIA Commercial Inventories Surprise',
        score: invScore,
        impact: obs.inventoriesWeeklySurpriseMb < 0 ? 'Bullish (Drawdown)' : 'Bearish (Inventory build)',
      });
    }

    // OPEC+ tone
    if (obs.opecPolicyTone === 'DEFENDING_FLOOR') {
      score += 25;
      drivers.push({ label: 'OPEC+ Supply Discipline', score: 25, impact: 'Bullish (Quota defense & delay of hikes)' });
    } else if (obs.opecPolicyTone === 'EXPANDING_SUPPLY') {
      score -= 35;
      drivers.push({ label: 'OPEC+ Supply Discipline', score: -35, impact: 'Bearish (Volume competition)' });
    }
  }

  const finalScore = Math.round(Math.max(-100, Math.min(100, score)));
  let bias: 'STRONGLY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONGLY_BEARISH' = 'NEUTRAL';
  if (finalScore >= 60) bias = 'STRONGLY_BULLISH';
  else if (finalScore >= 20) bias = 'BULLISH';
  else if (finalScore <= -60) bias = 'STRONGLY_BEARISH';
  else if (finalScore <= -20) bias = 'BEARISH';

  return { score: finalScore, bias, drivers };
}

export const calculateCommodityScores = calculateCommodityFundamentalScore;

/**
 * Deterministically calculates all derived COT positioning metrics from raw inputs.
 * Distinguishes direction, weekly change, positioning extreme, percentile, and momentum.
 */
export function calculateCotMetrics(raw: {
  nonCommercialLong?: number;
  nonCommercialShort?: number;
  nonCommercialSpreading?: number;
  commercialLong?: number;
  commercialShort?: number;
  dealerLong?: number;
  dealerShort?: number;
  assetManagerLong?: number;
  assetManagerShort?: number;
  leveragedFundsLong?: number;
  leveragedFundsShort?: number;
  otherReportablesLong?: number;
  otherReportablesShort?: number;
  nonReportableLong?: number;
  nonReportableShort?: number;
  openInterest: number;
  previousNetPosition?: number;
  previousOpenInterest?: number;
}) {
  const hasExplicitNonCommercial =
    raw.nonCommercialLong !== undefined &&
    raw.nonCommercialShort !== undefined &&
    (raw.nonCommercialLong > 0 || raw.nonCommercialShort > 0);

  // Non-commercial / Speculative core: Explicit Non-Commercial or Asset Manager + Leveraged Funds
  const specLong = hasExplicitNonCommercial ? (raw.nonCommercialLong || 0) : 0;

  const specShort = hasExplicitNonCommercial ? (raw.nonCommercialShort || 0) : 0;

  const netPosition = specLong - specShort;
  const nonCommercialNet = netPosition;

  // Commercial (Commercial Hedgers)
  const commLong = raw.commercialLong !== undefined ? raw.commercialLong : (raw.dealerLong || 0);
  const commShort = raw.commercialShort !== undefined ? raw.commercialShort : (raw.dealerShort || 0);
  const commercialNet = commLong - commShort;

  const openInterest = raw.openInterest > 0 ? raw.openInterest : 0;
  const longPercent = openInterest > 0 ? Number(((specLong / openInterest) * 100).toFixed(1)) : 0;
  const shortPercent = openInterest > 0 ? Number(((specShort / openInterest) * 100).toFixed(1)) : 0;
  const netOpenInterestPercent = openInterest > 0 ? Number((((specLong - specShort) / openInterest) * 100).toFixed(2)) : 0;

  const weeklyChange = raw.previousNetPosition !== undefined ? netPosition - raw.previousNetPosition : null;
  const openInterestChange = raw.previousOpenInterest !== undefined ? (raw.openInterest || 0) - raw.previousOpenInterest : null;

  // Normalized positioning score (-100 to +100)
  // Mapping based on net/total ratio
  const ratio = openInterest > 0 ? (specLong - specShort) / openInterest : 0;
  const positioningScore = Math.round(Math.max(-100, Math.min(100, ratio * 500)));

  // Historical percentile estimation based on ratio
  // 0% = maximum net short, 50% = balanced, 100% = maximum net long
  const historicalPercentile = null;

  let cotDirection: 'BULLISH' | 'NEUTRAL' | 'BEARISH' = 'NEUTRAL';
  if (positioningScore >= 20) cotDirection = 'BULLISH';
  else if (positioningScore <= -20) cotDirection = 'BEARISH';

  let positioningExtreme: 'HIGH_CROWDED_LONG' | 'NORMAL' | 'HIGH_CROWDED_SHORT' = 'NORMAL';
  if (netOpenInterestPercent >= 10) positioningExtreme = 'HIGH_CROWDED_LONG';
  else if (netOpenInterestPercent <= -10) positioningExtreme = 'HIGH_CROWDED_SHORT';

  let positioningMomentum: 'INCREASING_LONG' | 'STABLE' | 'INCREASING_SHORT' = 'STABLE';
  if (weeklyChange !== null && weeklyChange > 0) positioningMomentum = 'INCREASING_LONG';
  else if (weeklyChange !== null && weeklyChange < 0) positioningMomentum = 'INCREASING_SHORT';

  let interpretation = '';
  if (!hasExplicitNonCommercial || openInterest <= 0) {
    interpretation = 'Non-Commercial long/short and Open Interest must be entered before COT is scored.';
  } else if (positioningExtreme === 'HIGH_CROWDED_LONG') {
    interpretation = 'Bullish institutional positioning but highly crowded (vulnerable to long squeeze).';
  } else if (positioningExtreme === 'HIGH_CROWDED_SHORT') {
    interpretation = 'Heavy net short crowding (elevated short-squeeze risk if bullish catalyst appears).';
  } else if (cotDirection === 'BULLISH' && weeklyChange !== null && weeklyChange > 0) {
    interpretation = 'Institutional accumulation with positive weekly momentum.';
  } else if (cotDirection === 'BEARISH' && weeklyChange !== null && weeklyChange < 0) {
    interpretation = 'Institutional distribution with negative weekly momentum.';
  } else {
    interpretation = 'Balanced institutional positioning within standard historical ranges.';
  }

  return {
    netPosition,
    nonCommercialLong: specLong,
    nonCommercialShort: specShort,
    nonCommercialNet,
    commercialLong: commLong,
    commercialShort: commShort,
    commercialNet,
    longPercent,
    shortPercent,
    weeklyChange,
    openInterestChange,
    positioningScore,
    historicalPercentile,
    cotDirection,
    positioningExtreme,
    positioningMomentum,
    netOpenInterestPercent,
    interpretation,
  };
}

/**
 * Deterministically calculates Market Sentiment metrics from retail account data.
 * Adheres to the principle that sentiment must NOT override fundamental scores.
 */
export function calculateSentimentMetrics(raw: {
  longPercent: number;
  shortPercent?: number;
  longVolume?: number;
  shortVolume?: number;
  longPositions?: number;
  shortPositions?: number;
}) {
  const longPct = Math.max(0, Math.min(100, raw.longPercent));
  const shortPct = raw.shortPercent !== undefined ? Math.max(0, Math.min(100, raw.shortPercent)) : Number((100 - longPct).toFixed(1));
  const longShortRatio = shortPct > 0 ? Number((longPct / shortPct).toFixed(2)) : 99.0;
  const netSentiment = Number((longPct - shortPct).toFixed(1));

  // Contrarian sentiment score (-100 to +100)
  // High retail longs (>70%) indicates retail trap / contrarian bearish pressure (-score)
  // High retail shorts (<30% long) indicates contrarian bullish edge (+score)
  let sentimentScore = Math.round(-netSentiment * 1.25);
  sentimentScore = Math.max(-100, Math.min(100, sentimentScore));

  let sentimentRegime: 'CROWD_LONG_BEARISH_EDGE' | 'NEUTRAL' | 'CROWD_SHORT_BULLISH_EDGE' = 'NEUTRAL';
  if (longPct >= 68) sentimentRegime = 'CROWD_LONG_BEARISH_EDGE';
  else if (longPct <= 32) sentimentRegime = 'CROWD_SHORT_BULLISH_EDGE';

  return {
    longPercent: longPct,
    shortPercent: shortPct,
    longShortRatio,
    netSentiment,
    sentimentScore,
    sentimentRegime,
  };
}

/**
 * Calculates Long-Term Pair Rankings across Short, Medium, and Long horizons
 * based on structural slower-moving macroeconomic factors.
 */
export function calculateLongTermPairRankings(
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>,
  observations: IndicatorObservation[]
) {
  const pairs: [CurrencyCode, CurrencyCode][] = [
    ['EUR', 'USD'],
    ['GBP', 'USD'],
    ['USD', 'JPY'],
    ['USD', 'CHF'],
    ['USD', 'CAD'],
    ['AUD', 'USD'],
    ['NZD', 'USD'],
    ['EUR', 'GBP'],
    ['EUR', 'JPY'],
    ['GBPJPY', 'JPY'] as any === true ? ['GBP', 'JPY'] : ['GBP', 'JPY'],
    ['AUD', 'JPY'],
    ['CAD', 'JPY'],
    ['CHF', 'JPY'],
    ['NZD', 'JPY'],
    ['EUR', 'AUD'],
    ['EUR', 'CAD'],
    ['EUR', 'CHF'],
    ['EURNZD', 'NZD'] as any === true ? ['EUR', 'NZD'] : ['EUR', 'NZD'],
    ['GBP', 'AUD'],
    ['GBP', 'CAD'],
    ['GBP', 'CHF'],
    ['GBPNZD', 'NZD'] as any === true ? ['GBP', 'NZD'] : ['GBP', 'NZD'],
    ['AUD', 'CAD'],
    ['AUD', 'NZD'],
    ['AUD', 'CHF'],
    ['CAD', 'CHF'],
    ['NZD', 'CAD'],
    ['NZD', 'CHF'],
  ];

  const results = pairs.map(([base, quote]) => {
    const baseScore = currencyScores[base]?.score ?? 0;
    const quoteScore = currencyScores[quote]?.score ?? 0;
    const shortTermDiff = baseScore - quoteScore;

    // Structural factors
    const baseMon = currencyScores[base]?.categoryScores?.MONETARY_POLICY?.score ?? 0;
    const quoteMon = currencyScores[quote]?.categoryScores?.MONETARY_POLICY?.score ?? 0;
    const monetaryPolicyRegime = baseMon - quoteMon;

    const baseInf = currencyScores[base]?.categoryScores?.INFLATION?.score ?? 0;
    const quoteInf = currencyScores[quote]?.categoryScores?.INFLATION?.score ?? 0;
    const inflationTrend = baseInf - quoteInf;

    const baseGro = currencyScores[base]?.categoryScores?.GROWTH?.score ?? 0;
    const quoteGro = currencyScores[quote]?.categoryScores?.GROWTH?.score ?? 0;
    const growthTrend = baseGro - quoteGro;

    const baseRates = currencyScores[base]?.categoryScores?.RATES_YIELDS?.score ?? 0;
    const quoteRates = currencyScores[quote]?.categoryScores?.RATES_YIELDS?.score ?? 0;
    const realRateDifferential = baseRates - quoteRates;

    const baseExt = currencyScores[base]?.categoryScores?.TRADE_EXTERNAL?.score ?? 0;
    const quoteExt = currencyScores[quote]?.categoryScores?.TRADE_EXTERNAL?.score ?? 0;
    const externalBalance = baseExt - quoteExt;

    // Long-term composite weighted score
    const longTermDiff = Math.round(
      monetaryPolicyRegime * 0.3 +
        growthTrend * 0.25 +
        inflationTrend * 0.15 +
        realRateDifferential * 0.15 +
        externalBalance * 0.15
    );

    const mediumTermDiff = Math.round(shortTermDiff * 0.4 + longTermDiff * 0.6);

    let bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' = 'NEUTRAL';
    if (longTermDiff >= 40) bias = 'STRONG_BULLISH';
    else if (longTermDiff >= 15) bias = 'BULLISH';
    else if (longTermDiff <= -40) bias = 'STRONG_BEARISH';
    else if (longTermDiff <= -15) bias = 'BEARISH';

    const structuralRationale =
      longTermDiff > 20
        ? `Sustained macro advantage in monetary policy and growth potential for ${base}.`
        : longTermDiff < -20
        ? `Structural headwind: ${quote} yields and terms-of-trade outshine ${base}.`
        : `Balanced structural equilibrium between ${base} and ${quote}.`;

    return {
      pair: `${base}${quote}`,
      baseCurrency: base,
      quoteCurrency: quote,
      shortTermDiff,
      mediumTermDiff,
      longTermDiff,
      structuralFactors: {
        monetaryPolicyRegime,
        inflationTrend,
        growthTrend,
        productivity: Math.round(growthTrend * 0.8),
        externalBalance,
        termsOfTrade: Math.round(externalBalance * 0.9),
        realRateDifferential,
        longTermCot: (currencyScores[base]?.categoryScores?.COT_POSITIONING?.score ?? 0) - (currencyScores[quote]?.categoryScores?.COT_POSITIONING?.score ?? 0),
        structuralCommodityExposure: base === 'AUD' || base === 'CAD' || base === 'NZD' ? 20 : quote === 'AUD' || quote === 'CAD' || quote === 'NZD' ? -20 : 0,
      },
      bias,
      structuralRationale,
    };
  });

  const topBullish = [...results].sort((a, b) => b.longTermDiff - a.longTermDiff).slice(0, 5);
  const topBearish = [...results].sort((a, b) => a.longTermDiff - b.longTermDiff).slice(0, 5);

  return {
    allPairs: results,
    topBullish,
    topBearish,
  };
}

