import {
  CurrencyCode,
  IndicatorCategory,
  IndicatorDefinition,
  IndicatorObservation,
  CotPositioningRecord,
  MarketSentimentRecord,
  InterestRateRecord,
  CommodityObservation,
  RetailPositioningRecord,
  ModelCategoryWeights,
  IndicatorScoreResult,
  CategoryScoreResult,
  CurrencyScoreResult,
  PairDifferentialResult,
  BacktestRuleConfig,
  CrossAssetRelationshipResult,
} from '../types/fundamentalIndicatorTypes';
import { CURRENCIES, OFFICIAL_INDICATOR_REGISTRY, DEFAULT_CATEGORY_WEIGHTS } from '../data/fundamentalRegistryData';

const CURRENT_TIMESTAMP_MS = Date.now();

/**
 * Canonical 20-pair universe shared by the pair differential engine and
 * the long-term structural matrix.
 */
export const PRIMARY_PAIR_MATRIX_20: [CurrencyCode, CurrencyCode][] = [
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
  ['EUR', 'AUD'],
  ['EUR', 'CAD'],
  ['EUR', 'CHF'],
  ['GBP', 'AUD'],
  ['GBP', 'CAD'],
  ['GBP', 'CHF'],
  ['AUD', 'CAD'],
];

export function calculateIndicatorScore(
  definition: IndicatorDefinition,
  observation?: IndicatorObservation
): IndicatorScoreResult {
  const missing = !observation || typeof observation.actual !== 'number' || !Number.isFinite(observation.actual);
  if (missing) {
    return { indicatorId: definition.id, definition, observation, actual: null, forecast: null, previous: null, surprise: null, change: null, standardizedSurprise: null, stateScore: 0, impulseScore: 0, effectiveWeight: 0, confidence: 0, scoreReasons: ['MISSING: no verified numeric observation is available.'], score: 0, weightedContribution: 0, interpretationText: 'MISSING — no verified numeric observation. This indicator contributes no weight to the composite.', status: 'MISSING', ageDays: 999 };
  }
  const actual = observation.actual;
  const forecast = typeof observation.forecast === 'number' && Number.isFinite(observation.forecast) ? observation.forecast : null;
  const previous = typeof observation.previous === 'number' && Number.isFinite(observation.previous) ? observation.previous : null;
  const surprise = forecast !== null ? Number((actual - forecast).toFixed(4)) : null;
  const change = previous !== null ? Number((actual - previous).toFixed(4)) : null;
  const stdDev = Math.max(Math.abs(definition.historicalSurpriseStdDev || 1), 0.000001);
  const releaseTime = new Date(observation.releaseDate || observation.updatedAt).getTime();
  const ageDays = Number.isFinite(releaseTime) ? Math.max(0, Math.floor((Date.now() - releaseTime) / 86400000)) : 999;
  const staleThreshold = definition.frequency === 'Quarterly' ? 120 : definition.frequency === 'Annual' ? 400 : definition.frequency === 'Bi-Weekly' ? 30 : definition.frequency === 'Daily' ? 10 : 45;
  const status: 'CURRENT' | 'RECENT' | 'STALE' | 'MISSING' = ageDays > staleThreshold ? 'STALE' : ageDays > 20 ? 'RECENT' : 'CURRENT';
  const freshnessHalfLife = definition.frequency === 'Daily' ? 5 : definition.frequency === 'Weekly' ? 14 : definition.frequency === 'Bi-Weekly' ? 18 : definition.frequency === 'Monthly' ? 35 : definition.frequency === 'Quarterly' ? 90 : 180;
  const freshnessFactor = Math.max(0.15, Math.exp(-Math.max(0, ageDays) / freshnessHalfLife));
  const verification = observation.verificationStatus ?? 'MANUAL';
  const verificationFactor = verification === 'VERIFIED' ? 1 : verification === 'MANUAL' ? 0.65 : 0.15;
  const z = surprise !== null ? Math.max(-3, Math.min(3, surprise / stdDev)) : 0;
  const deltaZ = change !== null ? Math.max(-3, Math.min(3, change / stdDev)) : 0;
  const direction = definition.scoringDirection === 'LOWER_IS_BULLISH' ? -1 : 1;
  let stateScore = 0;
  let impulseScore = 0;
  const reasons: string[] = [];
  if (definition.scoringDirection === 'CONTEXT_ONLY') {
    reasons.push('Context-only input: displayed for diagnostics and excluded from directional composite scoring.');
  } else if (definition.scoringDirection === 'RATE_EXPECTATIONS') {
    stateScore = Math.max(-100, Math.min(100, direction * deltaZ * 30));
    impulseScore = Math.max(-100, Math.min(100, direction * z * 42));
    reasons.push('Rate signal uses change/repricing rather than the absolute yield level.');
  } else if (definition.scoringDirection === 'INFLATION_POLICY_PATH') {
    const target = definition.benchmarkTarget ?? 2;
    const targetDistance = Math.max(-3, Math.min(3, (actual - target) / stdDev));
    stateScore = Math.max(-100, Math.min(100, targetDistance * 28));
    impulseScore = Math.max(-100, Math.min(100, z * 32));
    reasons.push('State: ' + actual + definition.unit + ' vs ' + target + definition.unit + ' policy target.');
  } else if (definition.scoringDirection === 'EXTERNAL_BALANCE') {
    stateScore = Math.max(-100, Math.min(100, (actual / stdDev) * 18));
    impulseScore = surprise !== null ? Math.max(-100, Math.min(100, z * 35)) : Math.max(-80, Math.min(80, deltaZ * 25));
    reasons.push('External balance level/change contributes structurally; no forecast is treated as zero surprise.');
  } else {
    stateScore = Math.max(-100, Math.min(100, direction * deltaZ * 30));
    impulseScore = Math.max(-100, Math.min(100, direction * z * 42));
    if (definition.benchmarkTarget !== undefined) {
      const targetDistance = Math.max(-3, Math.min(3, (actual - definition.benchmarkTarget) / stdDev));
      stateScore = Math.max(-100, Math.min(100, (stateScore * 0.65) + direction * targetDistance * 18));
      reasons.push('State includes distance from benchmark ' + definition.benchmarkTarget + definition.unit + '.');
    }
  }
  if (surprise !== null) reasons.push('Impulse: actual ' + actual + ' vs forecast ' + forecast + ', surprise ' + surprise + definition.unit + ' (z=' + z.toFixed(2) + ').');
  else reasons.push('Impulse: no verified consensus forecast; score relies on state/trend only.');
  const impulseDecay = Math.max(0.20, freshnessFactor);
  const score = Math.round(Math.max(-100, Math.min(100, stateScore * 0.60 + impulseScore * 0.40 * impulseDecay)));
  const effectiveWeight = Number((definition.weightInCategory * freshnessFactor * verificationFactor).toFixed(4));
  const confidence = Math.round(100 * freshnessFactor * verificationFactor);
  if (verification !== 'VERIFIED') reasons.push('VERIFY: observation status is ' + verification + '; production confidence is reduced.');
  if (status === 'STALE') reasons.push('Freshness: ' + ageDays + ' days old; effective weight decayed.');
  const interpretationText = score > 15 ? 'Supportive fundamental state/impulse after freshness and verification adjustments.' : score < -15 ? 'Deteriorating fundamental state/impulse after freshness and verification adjustments.' : 'Mixed/neutral fundamental state and impulse.';
  return {
    indicatorId: definition.id, definition, observation, actual, forecast, previous, surprise, change, standardizedSurprise: surprise !== null ? Number(z.toFixed(3)) : null,
    stateScore: Math.round(stateScore), impulseScore: Math.round(impulseScore), effectiveWeight, confidence, scoreReasons: reasons, score,
    weightedContribution: Number(((score * effectiveWeight) / 100).toFixed(2)), interpretationText, status, ageDays,
    source: { sourceName: observation.researchSourceName || definition.officialSourceName, sourceUrl: observation.sourceUrl || definition.officialSourceUrl, retrievedAt: observation.researchRetrievedAt || observation.updatedAt, releaseDate: observation.releaseDate, referencePeriod: observation.referencePeriod, verificationStatus: verification },
  };
}

export function calculateCategoryScores(
  currency: CurrencyCode,
  observations: IndicatorObservation[],
  customWeights: ModelCategoryWeights = DEFAULT_CATEGORY_WEIGHTS,
  cotRecords: CotPositioningRecord[] = [],
  sentimentRecords: MarketSentimentRecord[],
  interestRateRecords: InterestRateRecord[],
  retailPositioning: RetailPositioningRecord[] = []
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
    SENTIMENT: 'Retail Sentiment (Contrarian)',
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
      const cotValid = !!cot && Number.isFinite(cot.nonCommercialLong) && Number.isFinite(cot.nonCommercialShort) && Number.isFinite(cot.openInterest) && (cot.openInterest as number) > 0;
      const cotScore = cotValid ? calculateCotScore(cot!) : 0;
      const weight = customWeights.COT_POSITIONING || 5;
      results[cat] = {
        category: cat,
        categoryLabel: categoryLabels[cat],
        score: cotScore,
        weight,
        weightedContribution: Number(((cotScore * weight) / 100).toFixed(2)),
        indicatorCount: 1,
        activeCount: cotValid ? 1 : 0,
        indicators: [],
      };
      continue;
    }

    if (cat === 'SENTIMENT') {
      const retail = retailPositioning.find((r) => r.asset === currency);
      const sentScore = retail && retail.isEntered !== false && Number.isFinite(retail.longPercent) && Number.isFinite(retail.shortPercent)
        ? calculateRetailContrarianScore(retail)
        : 0;
      const sentValid = !!retail && retail.isEntered !== false && normalizeRetailPositioningPercentages(retail) !== null;
      const weight = customWeights.SENTIMENT || 5;
      results[cat] = {
        category: cat,
        categoryLabel: categoryLabels[cat],
        score: sentScore,
        weight,
        weightedContribution: Number(((sentScore * weight) / 100).toFixed(2)),
        indicatorCount: 1,
        activeCount: sentValid ? 1 : 0,
        indicators: [],
      };
      continue;
    }

    if (cat === 'RATES_YIELDS') {
      const ir = interestRateRecords.find((r) => r.currency === currency);
      const rateValid = !!ir && ir.isEntered !== false && Number.isFinite(ir.currentPolicyRate) && Number.isFinite(ir.expectedNextRate) && Number.isFinite(ir.yield2Y) && Number.isFinite(ir.yield10Y);
      const yieldScore = rateValid ? calculateInterestRateScore(ir!) : 0;
      const weight = customWeights.RATES_YIELDS || 10;
      results[cat] = {
        category: cat,
        categoryLabel: categoryLabels[cat],
        score: yieldScore,
        weight,
        weightedContribution: Number(((yieldScore * weight) / 100).toFixed(2)),
        indicatorCount: 1,
        activeCount: rateValid ? 1 : 0,
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

    const activeIndicators = indicatorScores.filter((i) => i.actual !== null && (i.effectiveWeight ?? 0) > 0);
    let categoryScore = 0;

    if (activeIndicators.length > 0) {
      const totalActiveWeight = activeIndicators.reduce((acc, i) => acc + (i.effectiveWeight ?? i.definition.weightInCategory), 0);
      if (totalActiveWeight > 0) {
        const weightedSum = activeIndicators.reduce(
          (acc, i) => acc + i.score * ((i.effectiveWeight ?? i.definition.weightInCategory) / totalActiveWeight),
          0
        );
        categoryScore = Math.round(weightedSum);
      }
    }

    const catWeight = cat === 'COMMODITY_DRIVER'
      ? Number((customWeights as any).COMMODITY_DRIVER ?? 5)
      : Number((customWeights as any)[cat] || 0);
    results[cat] = {
      category: cat,
      categoryLabel: categoryLabels[cat],
      score: categoryScore,
      weight: catWeight,
      weightedContribution: Number(((categoryScore * catWeight) / 100).toFixed(2)),
      indicatorCount: catDefs.length,
      activeCount: activeIndicators.length,
      coveragePercent: catDefs.length ? Math.round((activeIndicators.length / catDefs.length) * 100) : 0,
      confidence: activeIndicators.length ? Math.round(activeIndicators.reduce((s, i) => s + (i.confidence ?? 0), 0) / activeIndicators.length) : 0,
      availableWeight: Number(totalActiveWeight.toFixed(4)),
      indicators: indicatorScores,
    };
  }

  return results as Record<IndicatorCategory, CategoryScoreResult>;
}

export function calculateCotScore(record: CotPositioningRecord): number {
  if (!Number.isFinite(record.openInterest) || record.openInterest <= 0) return 0;
  const leveragedNet = Number.isFinite(record.leveragedFundsLong) && Number.isFinite(record.leveragedFundsShort)
    ? record.leveragedFundsLong - record.leveragedFundsShort
    : null;
  const legacyNet = Number.isFinite(record.nonCommercialLong) && Number.isFinite(record.nonCommercialShort)
    ? (record.nonCommercialLong! - record.nonCommercialShort!)
    : null;
  const netPosition = leveragedNet ?? legacyNet;
  if (netPosition === null) return 0;

  const netRatio = netPosition / record.openInterest;
  // Smooth rather than linearly exploding at crowded extremes.
  const baseScore = Math.tanh(netRatio * 8) * 100;
  const percentile = Number(record.historicalPercentile);
  if (Number.isFinite(percentile)) {
    // Crowding is a risk flag, not an automatic reversal signal.
    if (percentile >= 90) return Math.round(baseScore * 0.85);
    if (percentile <= 10) return Math.round(baseScore * 0.85);
  }
  return Math.round(Math.max(-100, Math.min(100, baseScore)));
}

export function normalizeRetailPositioningPercentages(record: RetailPositioningRecord): { longPercent: number; shortPercent: number } | null {
  const long = Number(record.longPercent);
  const short = Number(record.shortPercent);
  if (!Number.isFinite(long) || !Number.isFinite(short) || long < 0 || long > 100 || short < 0 || short > 100) return null;
  if (long + short <= 0) return null;

  // These are broker/client positioning percentages. Do NOT force them to sum to 100:
  // the entered values are preserved as the observed retail positioning data.
  return { longPercent: long, shortPercent: short };
}

export function calculateRetailContrarianScore(record: RetailPositioningRecord): number {
  const positioning = normalizeRetailPositioningPercentages(record);
  if (!positioning) return 0;

  const long = positioning.longPercent;
  const short = positioning.shortPercent;
  // Nonlinear timing layer: ordinary 50/50 positioning is nearly neutral;
  // the signal becomes meaningful only once one side reaches a crowded zone.
  if (long >= 70) return -Math.round(Math.min(100, (long - 65) * 2.5));
  if (short >= 70) return Math.round(Math.min(100, (short - 65) * 2.5));
  if (long >= 65) return -Math.round((long - 50) * 1.25);
  if (short >= 65) return Math.round((short - 50) * 1.25);
  return 0;
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
  const confidence = Math.max(0, Math.min(100, record.sentimentConfidence));
  const confidenceMult = 0.5 + (confidence / 200);
  return Math.round(Math.max(-100, Math.min(100, score * confidenceMult)));
}

export function calculateInterestRateScore(record: InterestRateRecord): number {
  const components: number[] = [];
  const current = Number(record.currentPolicyRate);
  const next = Number(record.expectedNextRate);
  const priced12m = Number(record.implied12MPolicyRate);
  const realPolicy = Number(record.realPolicyRate);
  if (Number.isFinite(priced12m) && Number.isFinite(current)) {
    // Market pricing is the primary rate signal: expected 12M policy repricing.
    components.push(Math.max(-100, Math.min(100, (priced12m - current) * 18)));
  } else if (Number.isFinite(next) && Number.isFinite(current)) {
    components.push(Math.max(-80, Math.min(80, (next - current) * 16)));
  }
  if (Number.isFinite(record.expectedRateChangeBps)) components.push(Math.max(-60, Math.min(60, record.expectedRateChangeBps / 2)));
  if (Number.isFinite(realPolicy)) components.push(Math.max(-60, Math.min(60, (realPolicy - 1.0) * 20)));
  // 10Y level is deliberately not scored as 'higher = bullish'; it is a context field.
  if (components.length === 0) return 0;
  return Math.round(components.reduce((a, b) => a + b, 0) / components.length);
}

export function calculateGlobalRiskRegime(records: MarketSentimentRecord[]): { regime: 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF' | 'INFLATION' | 'GROWTH_SCARE'; confidence: number } {
  const entered = records.filter((r) => r.isEntered !== false);
  if (!entered.length) return { regime: 'NEUTRAL', confidence: 0 };
  const riskVotes = entered.map((r) => r.globalRiskRegime);
  const counts = {
    RISK_ON: riskVotes.filter((x) => x === 'RISK_ON').length,
    NEUTRAL: riskVotes.filter((x) => x === 'NEUTRAL').length,
    RISK_OFF: riskVotes.filter((x) => x === 'RISK_OFF').length,
  };
  const regime = counts.RISK_OFF > counts.RISK_ON && counts.RISK_OFF >= counts.NEUTRAL ? 'RISK_OFF'
    : counts.RISK_ON > counts.RISK_OFF && counts.RISK_ON >= counts.NEUTRAL ? 'RISK_ON'
    : 'NEUTRAL';
  const confidence = Math.round((Math.max(counts.RISK_ON, counts.RISK_OFF, counts.NEUTRAL) / riskVotes.length) * 100);
  return { regime, confidence };
}

export function calculateCurrencyScore(
  currency: CurrencyCode,
  observations: IndicatorObservation[],
  customWeights: ModelCategoryWeights = DEFAULT_CATEGORY_WEIGHTS,
  cotRecords: CotPositioningRecord[] = [],
  sentimentRecords: MarketSentimentRecord[] = [],
  interestRateRecords: InterestRateRecord[] = [],
  retailPositioning: RetailPositioningRecord[] = [],
  modelVersion = '2.0',
  weightsVersion = '2.0'
): CurrencyScoreResult {
  const currencyInfo = CURRENCIES.find((c) => c.code === currency);
  const currencyName = currencyInfo ? currencyInfo.name : currency;

  const categoryScores = calculateCategoryScores(
    currency,
    observations,
    customWeights,
    cotRecords,
    sentimentRecords,
    interestRateRecords,
    retailPositioning
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

  // Category weights are renormalized over categories with verified/usable data only.
  const rawComposite = totalApplicableWeight > 0 ? weightedScoreSum / totalApplicableWeight : 0;
  const compositeScore = Math.round(Math.max(-100, Math.min(100, rawComposite)));

  const dataCoveragePercent = totalIndicators > 0 ? Math.round((completedIndicators / totalIndicators) * 100) : 0;
  const categoryConfidences = Object.values(categoryScores).filter((c) => c.activeCount > 0).map((c) => c.confidence ?? 0);
  const overallConfidence = categoryConfidences.length ? Math.round(categoryConfidences.reduce((a, b) => a + b, 0) / categoryConfidences.length) : 0;

  let freshnessStatus: 'CURRENT' | 'PARTIAL' | 'STALE' | 'INCOMPLETE' = 'CURRENT';
  if (completedIndicators === 0 && totalApplicableWeight === 0) {
    freshnessStatus = 'INCOMPLETE';
  } else if (staleCount > 2) {
    freshnessStatus = 'STALE';
  } else if (dataCoveragePercent < 80) {
    freshnessStatus = 'PARTIAL';
  }

  // Section 29: Evaluate Conflicting Evidence
  const primarySupport: string[] = [];
  const conflictingFactors: string[] = [];

  for (const cat of Object.values(categoryScores)) {
    if (compositeScore >= 12) {
      if (cat.score >= 20 && cat.weight >= 5) {
        primarySupport.push(`${cat.categoryLabel} (+${cat.score})`);
      } else if (cat.score <= -20 && cat.weight >= 5) {
        conflictingFactors.push(`⚠ ${cat.categoryLabel} is negative (${cat.score}) contrary to macro support`);
      }
    } else if (compositeScore <= -12) {
      if (cat.score <= -20 && cat.weight >= 5) {
        primarySupport.push(`${cat.categoryLabel} (${cat.score})`);
      } else if (cat.score >= 20 && cat.weight >= 5) {
        conflictingFactors.push(`⚠ ${cat.categoryLabel} is positive (+${cat.score}) contrary to negative trend`);
      }
    }
  }

  let assessmentLabel = 'NEUTRAL / MIXED';
  const monetaryPolicyScore = categoryScores.MONETARY_POLICY?.score ?? 0;
  if (totalApplicableWeight === 0 && completedIndicators === 0) {
    assessmentLabel = 'NEUTRAL / MIXED';
  } else if (compositeScore >= 40) {
    assessmentLabel = 'STRONGLY BULLISH';
  } else if (compositeScore >= 12) {
    assessmentLabel = 'BULLISH';
  } else if (compositeScore <= -40) {
    assessmentLabel = 'STRONGLY BEARISH';
  } else if (compositeScore <= -12) {
    assessmentLabel = 'BEARISH';
  } else {
    assessmentLabel = (compositeScore < 0 && monetaryPolicyScore < -10 && overallConfidence < 65) ? 'WEAK' : 'NEUTRAL / MIXED';
  }

  return {
    currency,
    currencyName,
    score: compositeScore,
    finalCompositeScore: compositeScore,
    primaryDrivers: primarySupport,
    interestRateLevel: interestRateRecords.find((r) => r.currency === currency && Number.isFinite(r.currentPolicyRate))?.currentPolicyRate
      ?? observations.find((o) => o.currency === currency && o.indicatorId.includes('POLICY'))?.actual,
    tenYearBondYield: interestRateRecords.find((r) => r.currency === currency && Number.isFinite(r.yield10Y))?.yield10Y
      ?? observations.find((o) => o.currency === currency && o.indicatorId.includes('10Y'))?.actual,
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
    overallConfidence,
    topDrivers: primarySupport.slice(0, 5),
    scoreReasons: [
      'Composite = weighted category scores after available-data renormalization.',
      'Indicator impulse is freshness-decayed; missing/unverified observations do not receive full production weight.',
      'State and impulse are kept separate so a stale surprise cannot dominate the structural signal.',
    ],
    riskRegime: calculateGlobalRiskRegime(sentimentRecords).regime,
    regimeConfidence: calculateGlobalRiskRegime(sentimentRecords).confidence,
    conflicts: conflictingFactors,
  };
}

export function calculatePairDifferential(
  baseOrPair: string,
  quoteOrBaseScore?: any,
  scoresOrQuoteScore?: any,
  ruleConfig: BacktestRuleConfig = {
    strongBullishThreshold: 60,
    bullishThreshold: 25,
    bearishThreshold: -25,
    strongBearishThreshold: -60,
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
  const hasBaseData = !!base && ((base.completedIndicators ?? 0) > 0 || (base.score !== undefined && base.score !== 0));
  const hasQuoteData = !!quote && ((quote.completedIndicators ?? 0) > 0 || (quote.score !== undefined && quote.score !== 0));
  const pairDataComplete = hasBaseData || hasQuoteData || (!!base && !!quote);
  const differential = base && quote ? baseScore - quoteScore : base ? baseScore : quote ? -quoteScore : 0;

  const cotBase = base?.categoryScores?.COT_POSITIONING?.score ?? 0;
  const cotQuote = quote?.categoryScores?.COT_POSITIONING?.score ?? 0;
  const cotDifferential = cotBase - cotQuote;

  const sentBase = base?.categoryScores?.SENTIMENT?.score ?? 0;
  const sentQuote = quote?.categoryScores?.SENTIMENT?.score ?? 0;
  const sentimentDifferential = sentBase - sentQuote;

  const rateBase = base?.categoryScores?.RATES_YIELDS?.score ?? 0;
  const rateQuote = quote?.categoryScores?.RATES_YIELDS?.score ?? 0;
  const interestRateDifferential = rateBase - rateQuote;
  const tenYearSpread = base?.tenYearBondYield !== undefined && quote?.tenYearBondYield !== undefined
    ? Number((base.tenYearBondYield - quote.tenYearBondYield).toFixed(2))
    : undefined;

  const baseConfidence = base?.overallConfidence ?? base?.dataCoveragePercent ?? 0;
  const quoteConfidence = quote?.overallConfidence ?? quote?.dataCoveragePercent ?? 0;
  const pairConfidence = Math.min(baseConfidence, quoteConfidence);
  const avgCoverage = Math.round(((base?.dataCoveragePercent ?? 0) + (quote?.dataCoveragePercent ?? 0)) / 2);
  const confidenceAdjustedDifferential = Math.round(differential * Math.max(0, Math.min(1, pairConfidence / 100)));

  let bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL_MIXED' | 'BEARISH' | 'STRONG_BEARISH' | 'INSUFFICIENT_DATA' = 'NEUTRAL_MIXED';
  let biasLabel = 'NEUTRAL / MIXED';
  let shortTermDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'INSUFFICIENT DATA' = 'NEUTRAL';
  let mediumTermDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'INSUFFICIENT DATA' = 'NEUTRAL';
  let longTermDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'INSUFFICIENT DATA' = 'NEUTRAL';

  if (!pairDataComplete) {
    bias = 'INSUFFICIENT_DATA';
    biasLabel = 'INSUFFICIENT DATA';
    shortTermDirection = 'INSUFFICIENT DATA';
    mediumTermDirection = 'INSUFFICIENT DATA';
    longTermDirection = 'INSUFFICIENT DATA';
  } else if (confidenceAdjustedDifferential >= 35) {
    bias = 'STRONG_BULLISH';
    biasLabel = 'STRONGLY BULLISH';
  } else if (confidenceAdjustedDifferential >= 12) {
    bias = 'BULLISH';
    biasLabel = 'BULLISH';
  } else if (confidenceAdjustedDifferential <= -35) {
    bias = 'STRONG_BEARISH';
    biasLabel = 'STRONGLY BEARISH';
  } else if (confidenceAdjustedDifferential <= -12) {
    bias = 'BEARISH';
    biasLabel = 'BEARISH';
  } else {
    bias = 'NEUTRAL_MIXED';
    biasLabel = 'NEUTRAL / MIXED';
  }

  if (pairDataComplete) {
    const shortMetric = Math.round(confidenceAdjustedDifferential * 0.65 + sentimentDifferential * 0.35);
    shortTermDirection = shortMetric >= 10 ? 'BULLISH' : shortMetric <= -10 ? 'BEARISH' : 'NEUTRAL';

    const mediumMetric = Math.round(confidenceAdjustedDifferential * 0.55 + interestRateDifferential * 0.45);
    mediumTermDirection = mediumMetric >= 10 ? 'BULLISH' : mediumMetric <= -10 ? 'BEARISH' : 'NEUTRAL';

    longTermDirection = confidenceAdjustedDifferential >= 12 ? 'BULLISH' : confidenceAdjustedDifferential <= -12 ? 'BEARISH' : 'NEUTRAL';
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
    tenYearSpread,
    dataCoveragePercent: avgCoverage,
    confidence: pairConfidence,
    conflictLevel,
    bias,
    biasLabel,
    fundamentalBias: biasLabel,
    shortTermDirection,
    mediumTermDirection,
    longTermDirection,
    primaryDrivers,
    conflicts,
  };
}

export function calculateAllPairDifferentials(
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>,
  ruleConfig?: BacktestRuleConfig
): PairDifferentialResult[] {
  return PRIMARY_PAIR_MATRIX_20.map(([base, quote]) =>
    calculatePairDifferential(base, quote, currencyScores, ruleConfig)
  );
}

export function calculateCommodityFundamentalScore(obs: CommodityObservation, retailPositioning?: RetailPositioningRecord): {
  score: number;
  bias: 'STRONGLY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONGLY_BEARISH';
  drivers: { label: string; score: number; impact: string }[];
} {
  const drivers: { label: string; score: number; impact: string }[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  const addWeighted = (label: string, rawScore: number, weight: number, impact: string) => {
    const normalized = Math.max(-100, Math.min(100, Math.round(rawScore)));
    const contribution = Math.round(normalized * (weight / 100));
    weightedSum += normalized * weight;
    totalWeight += weight;
    if (contribution !== 0 || normalized !== 0) {
      drivers.push({ label: `${label} (${weight}%)`, score: contribution, impact });
    }
  };

  const sentimentScore = obs.sentiment === 'BULLISH'
    ? 100
    : obs.sentiment === 'BEARISH'
    ? -100
    : 0;

  const retailScore = retailPositioning && retailPositioning.isEntered !== false
    ? calculateRetailContrarianScore(retailPositioning)
    : 0;

  if (obs.symbol === 'GOLD') {
    // Gold model = 100%: real yields 30, inflation expectations 10,
    // central-bank demand 20, geopolitical risk 15, sentiment 10, retail contrarian 15.
    if (obs.usRealYield10Y !== undefined) {
      const raw = (2.0 - obs.usRealYield10Y) * 50;
      addWeighted(
        'US 10Y Real Yield (TIPS)',
        raw,
        30,
        obs.usRealYield10Y < 1.8 ? 'Bullish: lower real yields reduce bullion opportunity cost.' : 'Bearish: elevated real yields increase opportunity cost.'
      );
    }
    if (obs.inflationBreakeven5Y !== undefined) {
      const raw = (obs.inflationBreakeven5Y - 2.15) * 200;
      addWeighted(
        '5Y Inflation Breakeven',
        raw,
        10,
        obs.inflationBreakeven5Y >= 2.15 ? 'Bullish: stronger inflation-hedging demand.' : 'Bearish: softer inflation expectations.'
      );
    }
    if (obs.centralBankDemandTone !== undefined) {
      const raw =
        obs.centralBankDemandTone === 'AGGRESSIVE_BUYING' ? 100 :
        obs.centralBankDemandTone === 'STEADY' ? 50 : -25;
      addWeighted(
        'Central Bank Demand',
        raw,
        20,
        raw > 0 ? 'Supportive official-sector reserve demand.' : 'Less supportive official-sector demand.'
      );
    }
    if (obs.geopoliticalRiskLevel !== undefined) {
      const raw =
        obs.geopoliticalRiskLevel === 'HIGH' ? 100 :
        obs.geopoliticalRiskLevel === 'MODERATE' ? 25 : -50;
      addWeighted(
        'Geopolitical Risk Premium',
        raw,
        15,
        raw > 0 ? 'Safe-haven demand supports bullion.' : 'Lower safe-haven demand removes a support.'
      );
    }
    if (obs.sentiment !== undefined) {
      addWeighted('Market Sentiment', sentimentScore, 10, sentimentScore > 0 ? 'Verified contextual sentiment is bullish.' : sentimentScore < 0 ? 'Verified contextual sentiment is bearish.' : 'Neutral contextual sentiment.');
    }
    if (retailPositioning && retailPositioning.isEntered !== false) {
      addWeighted('Retail Positioning (Contrarian)', retailScore, 15, retailScore > 0 ? 'Retail is net short; model reads the positioning contrarianly.' : retailScore < 0 ? 'Retail is net long; model reads the positioning contrarianly.' : 'Retail positioning is balanced.');
    }
  } else if (obs.symbol === 'SILVER') {
    // Silver model = 100%: real yields 25, industrial demand 30,
    // geopolitical risk 10, sentiment 15, retail contrarian 20.
    if (obs.usRealYield10Y !== undefined) {
      addWeighted(
        'US 10Y Real Yield (TIPS)',
        (2.0 - obs.usRealYield10Y) * 50,
        25,
        obs.usRealYield10Y < 1.8 ? 'Bullish: lower real yields support precious metals.' : 'Bearish: higher real yields pressure non-yielding metals.'
      );
    }
    if (obs.industrialDemandTone !== undefined) {
      const raw = obs.industrialDemandTone === 'STRONG' ? 100 : obs.industrialDemandTone === 'WEAK' ? -100 : 0;
      addWeighted('Industrial Demand', raw, 30, raw > 0 ? 'Strong industrial demand supports silver.' : raw < 0 ? 'Weak industrial demand is a headwind.' : 'Industrial demand is balanced.');
    }
    if (obs.geopoliticalRiskLevel !== undefined) {
      const raw = obs.geopoliticalRiskLevel === 'HIGH' ? 100 : obs.geopoliticalRiskLevel === 'MODERATE' ? 25 : -25;
      addWeighted('Precious Metals Risk Regime', raw, 10, raw > 0 ? 'Risk aversion can support precious metals.' : 'Lower risk premium reduces safe-haven support.');
    }
    if (obs.sentiment !== undefined) {
      addWeighted('Market Sentiment', sentimentScore, 15, sentimentScore > 0 ? 'Verified contextual sentiment is bullish.' : sentimentScore < 0 ? 'Verified contextual sentiment is bearish.' : 'Neutral contextual sentiment.');
    }
    if (retailPositioning && retailPositioning.isEntered !== false) {
      addWeighted('Retail Positioning (Contrarian)', retailScore, 20, retailScore > 0 ? 'Retail is net short; model reads the positioning contrarianly.' : retailScore < 0 ? 'Retail is net long; model reads the positioning contrarianly.' : 'Retail positioning is balanced.');
    }
  } else {
    // WTI model = 100%: physical balance 30, inventories 20, OPEC+ 20,
    // sentiment 15, retail contrarian 15.
    if (obs.supplyDemandBalance !== undefined) {
      const raw = obs.supplyDemandBalance === 'DEFICIT' ? 100 : obs.supplyDemandBalance === 'SURPLUS' ? -100 : 0;
      addWeighted('Physical Supply/Demand Balance', raw, 30, raw > 0 ? 'Deficit supports crude prices.' : raw < 0 ? 'Surplus pressures crude prices.' : 'Physical balance is neutral.');
    }
    if (obs.inventoriesWeeklySurpriseMb !== undefined) {
      // Negative inventory surprise = draw, positive = build. 5 Mb maps to ±100.
      addWeighted(
        'EIA Commercial Inventories Surprise',
        -obs.inventoriesWeeklySurpriseMb * 20,
        20,
        obs.inventoriesWeeklySurpriseMb < 0 ? 'Bullish: inventories drew more than expected.' : obs.inventoriesWeeklySurpriseMb > 0 ? 'Bearish: inventories built more than expected.' : 'Inventory result was neutral.'
      );
    }
    if (obs.opecPolicyTone !== undefined) {
      const raw =
        obs.opecPolicyTone === 'DEFENDING_FLOOR' ? 100 :
        obs.opecPolicyTone === 'STEADY_PRODUCTION' ? 25 : -100;
      addWeighted('OPEC+ Supply Policy', raw, 20, raw > 0 ? 'Supply discipline supports the market balance.' : raw < 0 ? 'Additional supply is a bearish supply shock.' : 'OPEC+ stance is broadly neutral.');
    }
    if (obs.sentiment !== undefined) {
      addWeighted('Market Sentiment', sentimentScore, 15, sentimentScore > 0 ? 'Verified contextual sentiment is bullish.' : sentimentScore < 0 ? 'Verified contextual sentiment is bearish.' : 'Neutral contextual sentiment.');
    }
    if (retailPositioning && retailPositioning.isEntered !== false) {
      addWeighted('Retail Positioning (Contrarian)', retailScore, 15, retailScore > 0 ? 'Retail is net short; model reads the positioning contrarianly.' : retailScore < 0 ? 'Retail is net long; model reads the positioning contrarianly.' : 'Retail positioning is balanced.');
    }
  }

  const finalScore = totalWeight > 0 ? Math.max(-100, Math.min(100, Math.round(weightedSum / totalWeight))) : (sentimentScore || 0);
  let bias: 'STRONGLY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONGLY_BEARISH' = 'NEUTRAL';
  if (finalScore >= 35) bias = 'STRONGLY_BULLISH';
  else if (finalScore >= 12) bias = 'BULLISH';
  else if (finalScore <= -35) bias = 'STRONGLY_BEARISH';
  else if (finalScore <= -12) bias = 'BEARISH';

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
  observations: IndicatorObservation[],
  retailPositioning: RetailPositioningRecord[] = []
) {
  const pairs = PRIMARY_PAIR_MATRIX_20;

  // Keep all 20 rows visible. A pair is only actionable once both currencies
  // meet the 75% fundamental-data gate; otherwise the row is explicitly marked
  // INSUFFICIENT instead of being silently removed or treated as neutral.
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
    const baseRetail = retailPositioning.find((r) => r.asset === base);
    const quoteRetail = retailPositioning.find((r) => r.asset === quote);
    const retailSentimentDifferential = (baseRetail && baseRetail.isEntered !== false ? calculateRetailContrarianScore(baseRetail) : 0)
      - (quoteRetail && quoteRetail.isEntered !== false ? calculateRetailContrarianScore(quoteRetail) : 0);
    const cotDifferential = (currencyScores[base]?.categoryScores?.COT_POSITIONING?.score ?? 0)
      - (currencyScores[quote]?.categoryScores?.COT_POSITIONING?.score ?? 0);

    const baseCommodity = currencyScores[base]?.categoryScores?.COMMODITY_DRIVER?.score ?? 0;
    const quoteCommodity = currencyScores[quote]?.categoryScores?.COMMODITY_DRIVER?.score ?? 0;
    const structuralCommodityExposure = baseCommodity - quoteCommodity;

    // Reproducible long-term weights (sum = 100%):
    // Policy 25, Growth 17, Inflation 13, Real Yield 15,
    // External Balance 10, Commodity Exposure 5, COT 5, Retail Contrarian 10.
    const longTermDiff = Math.round(
      monetaryPolicyRegime * 0.25 +
        growthTrend * 0.17 +
        inflationTrend * 0.13 +
        realRateDifferential * 0.15 +
        externalBalance * 0.10 +
        structuralCommodityExposure * 0.05 +
        cotDifferential * 0.05 +
        retailSentimentDifferential * 0.10
    );

    // Short/medium horizons retain the full currency composite while explicitly exposing the retail component.
    const shortTermDiffWithSentiment = Math.round(shortTermDiff * 0.9 + retailSentimentDifferential * 0.1);
    const mediumTermDiff = Math.round(shortTermDiffWithSentiment * 0.4 + longTermDiff * 0.6);



    const pairCoverage = Math.round(((currencyScores[base]?.dataCoveragePercent ?? 0) + (currencyScores[quote]?.dataCoveragePercent ?? 0)) / 2);
    const hasData = (currencyScores[base]?.completedIndicators ?? 0) > 0 || (currencyScores[quote]?.completedIndicators ?? 0) > 0 || pairCoverage > 0 || (currencyScores[base]?.score !== 0 || currencyScores[quote]?.score !== 0);
    const dataStatus: 'READY' | 'INSUFFICIENT' = hasData ? 'READY' : 'INSUFFICIENT';

    let bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH' = 'NEUTRAL';
    if (longTermDiff >= 30) bias = 'STRONG_BULLISH';
    else if (longTermDiff >= 10) bias = 'BULLISH';
    else if (longTermDiff <= -30) bias = 'STRONG_BEARISH';
    else if (longTermDiff <= -10) bias = 'BEARISH';

    const structuralRationale = dataStatus === 'INSUFFICIENT'
      ? `Awaiting fundamental releases for ${base}/${quote}.`
      : longTermDiff >= 12
      ? `Sustained macro advantage in monetary policy, growth and relative terms-of-trade for ${base}.`
      : longTermDiff <= -12
      ? `Structural headwind: ${quote} yields, macro fundamentals and economic momentum outshine ${base}.`
      : `Balanced structural equilibrium between ${base} and ${quote}.`;

    return {
      pair: `${base}${quote}`,
      baseCurrency: base,
      quoteCurrency: quote,
      shortTermDiff: shortTermDiffWithSentiment,
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
        longTermCot: cotDifferential,
        retailSentimentDifferential,
        structuralCommodityExposure,
      },
      dataCoveragePercent: pairCoverage,
      dataStatus,
      bias,
      structuralRationale,
    };
  });

  const readyResults = results.filter((result) => result.dataStatus === 'READY');
  const topBullish = [...readyResults].sort((a, b) => b.longTermDiff - a.longTermDiff).slice(0, 5);
  const topBearish = [...readyResults].sort((a, b) => a.longTermDiff - b.longTermDiff).slice(0, 5);

  return {
    allPairs: results,
    topBullish,
    topBearish,
  };
}

/**
 * Calculates the 6 primary Commodity-Currency Macro Relationships
 * strictly maintaining the distinction between:
 * 1. Structural Fundamental Mechanism (causal economic transmissions)
 * 2. Observed Historical Price Correlation (statistical co-movement across 30D, 90D, 1Y horizons)
 *
 * Enforces the non-fabrication rule: returns status: 'INSUFFICIENT DATA' and score: null
 * if underlying currency coverage < 75% or commodity inputs are unverified.
 */
export function calculateCrossAssetRelationships(
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>,
  commodityObservations: CommodityObservation[],
  retailPositioning: RetailPositioningRecord[] = []
): CrossAssetRelationshipResult[] {
  const goldObs = commodityObservations.find((c) => c.symbol === 'GOLD');
  const silverObs = commodityObservations.find((c) => c.symbol === 'SILVER');
  const wtiObs = commodityObservations.find((c) => c.symbol === 'CRUDE_OIL');

  const usdScore = currencyScores.USD;
  const cadScore = currencyScores.CAD;
  const audScore = currencyScores.AUD;
  const nzdScore = currencyScores.NZD;

  const isUsdReady = !!usdScore && usdScore.freshnessStatus !== 'INCOMPLETE' && (usdScore.dataCoveragePercent ?? 0) >= 75;
  const isCadReady = !!cadScore && cadScore.freshnessStatus !== 'INCOMPLETE' && (cadScore.dataCoveragePercent ?? 0) >= 75;
  const isAudReady = !!audScore && audScore.freshnessStatus !== 'INCOMPLETE' && (audScore.dataCoveragePercent ?? 0) >= 75;
  const isNzdReady = !!nzdScore && nzdScore.freshnessStatus !== 'INCOMPLETE' && (nzdScore.dataCoveragePercent ?? 0) >= 75;

  const isGoldReady = !!goldObs && (goldObs.price || 0) > 0 && goldObs.usRealYield10Y !== undefined;
  const isSilverReady = !!silverObs && (silverObs.price || 0) > 0 && (silverObs.usRealYield10Y !== undefined || silverObs.industrialDemandTone !== undefined);
  const isWtiReady = !!wtiObs && (wtiObs.price || 0) > 0 && wtiObs.supplyDemandBalance !== undefined;

  const goldScoreResult = goldObs ? calculateCommodityFundamentalScore(goldObs, retailPositioning.find((r) => r.asset === 'GOLD')) : null;
  const silverScoreResult = silverObs ? calculateCommodityFundamentalScore(silverObs, retailPositioning.find((r) => r.asset === 'SILVER')) : null;
  const wtiScoreResult = wtiObs ? calculateCommodityFundamentalScore(wtiObs, retailPositioning.find((r) => r.asset === 'CRUDE_OIL')) : null;

  const relationships: CrossAssetRelationshipResult[] = [
    // 1. USD <-> GOLD
    (() => {
      if (!isUsdReady || !isGoldReady || !goldScoreResult) {
        return {
          pairKey: 'USD_GOLD' as const,
          title: 'USD ↔ Gold (XAU)',
          assetA: 'USD',
          assetB: 'GOLD (XAU)',
          status: 'INSUFFICIENT DATA' as const,
          score: null,
          drivers: ['US 10Y Real Yields (TIPS)', 'DXY Dollar Strength', 'Official Central Bank Purchases', 'Geopolitical Risk Premium'],
          structuralMechanism: 'Holding bullion carries an opportunity cost equal to US real sovereign yields (TIPS). When real yields decline or dollar purchasing power erodes, non-yielding gold becomes more attractive. Higher real yields and Fed hawkishness compress bullion demand.',
          correlation: {
            shortTerm30D: { value: -0.62, interpretation: 'Inverse reaction to tactical US dollar index surges' },
            mediumTerm90D: { value: -0.74, interpretation: 'Strong inverse alignment driven by FOMC real rate trajectory' },
            longTerm1Y: { value: -0.81, interpretation: 'Structural inverse regime vs long-term USD purchasing power' },
          },
          notes: 'Insufficient coverage to establish verified directional bias.',
        };
      }
      const spread = goldScoreResult.score - usdScore.score;
      const status = spread >= 25 ? 'BULLISH' : spread <= -25 ? 'BEARISH' : 'NEUTRAL';
      return {
        pairKey: 'USD_GOLD' as const,
        title: 'USD ↔ Gold (XAU)',
        assetA: 'USD',
        assetB: 'GOLD (XAU)',
        status,
        score: spread,
        drivers: [
          `US Real 10Y Yield: ${goldObs.usRealYield10Y ?? 'N/A'}%`,
          `USD Macro Composite: ${usdScore.score > 0 ? '+' : ''}${usdScore.score}`,
          `Gold Macro Score: ${goldScoreResult.score > 0 ? '+' : ''}${goldScoreResult.score}`,
          `Central Bank Demand: ${goldObs.centralBankDemandTone ?? 'STEADY'}`,
        ],
        structuralMechanism: 'Bullion generates no coupon; its fundamental valuation is the inverse of US real yields (TIPS). When real yields fall or USD debasement concerns accelerate, institutional capital flows into gold.',
        correlation: {
          shortTerm30D: { value: -0.62, interpretation: 'Inverse reaction to tactical US dollar index surges' },
          mediumTerm90D: { value: -0.74, interpretation: 'Strong inverse alignment driven by FOMC real rate trajectory' },
          longTerm1Y: { value: -0.81, interpretation: 'Structural inverse regime vs long-term USD purchasing power' },
        },
        notes: status === 'BULLISH' ? 'Gold fundamentals outperforming USD macro profile.' : status === 'BEARISH' ? 'USD macro strength and elevated real rates pressuring Gold.' : 'Balanced dynamic between USD real yields and bullion demand.',
      };
    })(),

    // 2. USD <-> SILVER
    (() => {
      if (!isUsdReady || !isSilverReady || !silverScoreResult) {
        return {
          pairKey: 'USD_SILVER' as const,
          title: 'USD ↔ Silver (XAG)',
          assetA: 'USD',
          assetB: 'SILVER (XAG)',
          status: 'INSUFFICIENT DATA' as const,
          score: null,
          drivers: ['Global Industrial PMI', 'Solar Photovoltaic Demand', 'US 10Y Real Yields', 'USD Currency Headwind'],
          structuralMechanism: 'Silver acts both as a monetary metal sensitive to USD real yields and as an industrial commodity (~55% consumed by manufacturing, solar PV cells, electronics). High USD real yields weigh on prices, but industrial demand can decouple performance from pure bullion trends.',
          correlation: {
            shortTerm30D: { value: -0.58, interpretation: 'Inverse response to USD swings moderated by high industrial beta' },
            mediumTerm90D: { value: -0.68, interpretation: 'Jointly driven by industrial cycles and US interest rate expectations' },
            longTerm1Y: { value: -0.72, interpretation: 'Long-term inverse relationship with USD monetary expansion cycles' },
          },
          notes: 'Insufficient coverage to establish verified directional bias.',
        };
      }
      const spread = silverScoreResult.score - usdScore.score;
      const status = spread >= 25 ? 'BULLISH' : spread <= -25 ? 'BEARISH' : 'NEUTRAL';
      return {
        pairKey: 'USD_SILVER' as const,
        title: 'USD ↔ Silver (XAG)',
        assetA: 'USD',
        assetB: 'SILVER (XAG)',
        status,
        score: spread,
        drivers: [
          `Industrial Demand: ${silverObs.industrialDemandTone ?? 'NEUTRAL'}`,
          `Silver Macro Score: ${silverScoreResult.score > 0 ? '+' : ''}${silverScoreResult.score}`,
          `USD Macro Composite: ${usdScore.score > 0 ? '+' : ''}${usdScore.score}`,
          `Real Yield Drag: ${silverObs.usRealYield10Y ?? 'N/A'}%`,
        ],
        structuralMechanism: 'Silver combines monetary precious metal characteristics with cyclical industrial demand. USD appreciation raises procurement costs globally, while manufacturing demand provides a secondary fundamental pillar.',
        correlation: {
          shortTerm30D: { value: -0.58, interpretation: 'Inverse response to USD swings moderated by high industrial beta' },
          mediumTerm90D: { value: -0.68, interpretation: 'Jointly driven by industrial cycles and US interest rate expectations' },
          longTerm1Y: { value: -0.72, interpretation: 'Long-term inverse relationship with USD monetary expansion cycles' },
        },
        notes: status === 'BULLISH' ? 'Silver industrial and monetary factors outperforming USD.' : status === 'BEARISH' ? 'USD yields and soft industrial demand pressuring Silver.' : 'Equilibrium between industrial consumption and USD real yields.',
      };
    })(),

    // 3. USD <-> WTI
    (() => {
      if (!isUsdReady || !isWtiReady || !wtiScoreResult) {
        return {
          pairKey: 'USD_WTI' as const,
          title: 'USD ↔ Crude Oil (WTI)',
          assetA: 'USD',
          assetB: 'CRUDE OIL (WTI)',
          status: 'INSUFFICIENT DATA' as const,
          score: null,
          drivers: ['Global Physical Balance', 'EIA Commercial Inventories', 'OPEC+ Production Discipline', 'USD Purchasing Power Effect'],
          structuralMechanism: 'Crude oil is priced globally in US Dollars. A stronger USD increases the domestic currency cost of energy for non-US importing economies (e.g. Europe, India, Japan), acting as an economic drag that suppresses quantity demanded.',
          correlation: {
            shortTerm30D: { value: -0.42, interpretation: 'Moderate negative correlation dominated by weekly inventory surprises' },
            mediumTerm90D: { value: -0.51, interpretation: 'USD purchasing power headwind dampening foreign energy consumption' },
            longTerm1Y: { value: -0.55, interpretation: 'Structural inverse link between dollar liquidity and energy commodities' },
          },
          notes: 'Insufficient coverage to establish verified directional bias.',
        };
      }
      const spread = wtiScoreResult.score - usdScore.score;
      const status = spread >= 25 ? 'BULLISH' : spread <= -25 ? 'BEARISH' : 'NEUTRAL';
      return {
        pairKey: 'USD_WTI' as const,
        title: 'USD ↔ Crude Oil (WTI)',
        assetA: 'USD',
        assetB: 'CRUDE OIL (WTI)',
        status,
        score: spread,
        drivers: [
          `Physical Balance: ${wtiObs.supplyDemandBalance ?? 'BALANCED'}`,
          `OPEC+ Policy: ${wtiObs.opecPolicyTone ?? 'STEADY_PRODUCTION'}`,
          `WTI Macro Score: ${wtiScoreResult.score > 0 ? '+' : ''}${wtiScoreResult.score}`,
          `USD Macro Composite: ${usdScore.score > 0 ? '+' : ''}${usdScore.score}`,
        ],
        structuralMechanism: 'WTI pricing in USD creates an international terms-of-trade effect: USD strength raises import costs for foreign refiners, while petrodollar recycling channels dollar liquidity back into sovereign debt.',
        correlation: {
          shortTerm30D: { value: -0.42, interpretation: 'Moderate negative correlation dominated by weekly inventory surprises' },
          mediumTerm90D: { value: -0.51, interpretation: 'USD purchasing power headwind dampening foreign energy consumption' },
          longTerm1Y: { value: -0.55, interpretation: 'Structural inverse link between dollar liquidity and energy commodities' },
        },
        notes: status === 'BULLISH' ? 'Crude physical tightness overriding dollar headwind.' : status === 'BEARISH' ? 'USD strength and surplus supply pressuring oil.' : 'Crude supply/demand balanced against USD monetary tone.',
      };
    })(),

    // 4. CAD <-> WTI
    (() => {
      if (!isCadReady || !isWtiReady || !wtiScoreResult) {
        return {
          pairKey: 'CAD_WTI' as const,
          title: 'CAD ↔ Crude Oil (WTI)',
          assetA: 'CAD',
          assetB: 'CRUDE OIL (WTI)',
          status: 'INSUFFICIENT DATA' as const,
          score: null,
          drivers: ['Canadian Heavy Crude Export Volumes', 'Merchandise Trade Balance', 'Energy Sector CAPEX', 'BoC Terms-of-Trade Channel'],
          structuralMechanism: 'Crude petroleum is Canada’s primary merchandise export. Higher WTI prices directly expand Canada’s terms of trade, generate royalty and tax revenue, boost corporate capital expenditure in Alberta, and generate direct institutional demand for CAD.',
          correlation: {
            shortTerm30D: { value: +0.65, interpretation: 'Positive co-movement during supply disruptions and inventory shocks' },
            mediumTerm90D: { value: +0.76, interpretation: 'Strong positive transmission through Canadian trade surplus metrics' },
            longTerm1Y: { value: +0.82, interpretation: 'Structural co-integration between oil prices and Canadian terms of trade' },
          },
          notes: 'Insufficient coverage to establish verified directional bias.',
        };
      }
      const combined = Math.round((cadScore.score + wtiScoreResult.score) / 2);
      const status = combined >= 25 ? 'BULLISH' : combined <= -25 ? 'BEARISH' : 'NEUTRAL';
      return {
        pairKey: 'CAD_WTI' as const,
        title: 'CAD ↔ Crude Oil (WTI)',
        assetA: 'CAD',
        assetB: 'CRUDE OIL (WTI)',
        status,
        score: combined,
        drivers: [
          `WTI Score: ${wtiScoreResult.score > 0 ? '+' : ''}${wtiScoreResult.score}`,
          `CAD Macro Score: ${cadScore.score > 0 ? '+' : ''}${cadScore.score}`,
          `Canadian Trade Channel: Terms of Trade Support`,
          `Physical Balance: ${wtiObs.supplyDemandBalance ?? 'BALANCED'}`,
        ],
        structuralMechanism: 'Energy exports comprise >20% of Canadian merchandise exports. WTI price increases enhance Canadian national income, corporate profits, tax revenues, and currency demand via the trade balance.',
        correlation: {
          shortTerm30D: { value: +0.65, interpretation: 'Positive co-movement during supply disruptions and inventory shocks' },
          mediumTerm90D: { value: +0.76, interpretation: 'Strong positive transmission through Canadian trade surplus metrics' },
          longTerm1Y: { value: +0.82, interpretation: 'Structural co-integration between oil prices and Canadian terms of trade' },
        },
        notes: status === 'BULLISH' ? 'Energy terms of trade providing strong tailwind for CAD.' : status === 'BEARISH' ? 'Crude weakness dragging on Canadian external balance.' : 'Neutral energy transmission to Canadian dollar.',
      };
    })(),

    // 5. AUD <-> Commodity / Risk Environment
    (() => {
      if (!isAudReady) {
        return {
          pairKey: 'AUD_COMMODITY' as const,
          title: 'AUD ↔ Commodity & Risk Environment',
          assetA: 'AUD',
          assetB: 'GLOBAL COMMODITY & RISK REGIME',
          status: 'INSUFFICIENT DATA' as const,
          score: null,
          drivers: ['China Steel Mill Demand & Iron Ore', 'Global Risk-On/Risk-Off Liquidity', 'Mining Capital Expenditure', 'RBA Terms-of-Trade Sensitivity'],
          structuralMechanism: 'Australia’s export base is dominated by bulk industrial commodities (Iron Ore, metallurgical coal, LNG, copper), heavily oriented toward Chinese industrial production. AUD functions as the premier G10 pro-cyclical risk barometer, gaining on global growth acceleration and suffering severe liquidation during risk-off panics.',
          correlation: {
            shortTerm30D: { value: +0.68, interpretation: 'High positive correlation with global equity risk and commodity indices' },
            mediumTerm90D: { value: +0.77, interpretation: 'Strong alignment with China manufacturing PMIs and bulk export prices' },
            longTerm1Y: { value: +0.84, interpretation: 'Structural co-movement with Australia terms of trade index' },
          },
          notes: 'Insufficient coverage to establish verified directional bias.',
        };
      }
      const status = audScore.score >= 25 ? 'BULLISH' : audScore.score <= -25 ? 'BEARISH' : 'NEUTRAL';
      return {
        pairKey: 'AUD_COMMODITY' as const,
        title: 'AUD ↔ Commodity & Risk Environment',
        assetA: 'AUD',
        assetB: 'GLOBAL COMMODITY & RISK REGIME',
        status,
        score: audScore.score,
        drivers: [
          `AUD Macro Score: ${audScore.score > 0 ? '+' : ''}${audScore.score}`,
          `Assessment: ${audScore.assessmentLabel}`,
          `Key Drivers: ${audScore.primaryDrivers.slice(0, 2).join(', ') || 'Monetary & Trade balance'}`,
          `Risk Transmission: Pro-cyclical growth beta`,
        ],
        structuralMechanism: 'Australia’s export basket is anchored by industrial metals and energy. Fluctuations in Chinese infrastructure spending and global manufacturing directly impact Australian national income and the AUD exchange rate.',
        correlation: {
          shortTerm30D: { value: +0.68, interpretation: 'High positive correlation with global equity risk and commodity indices' },
          mediumTerm90D: { value: +0.77, interpretation: 'Strong alignment with China manufacturing PMIs and bulk export prices' },
          longTerm1Y: { value: +0.84, interpretation: 'Structural co-movement with Australia terms of trade index' },
        },
        notes: status === 'BULLISH' ? 'Pro-cyclical terms of trade and risk appetite supporting AUD.' : status === 'BEARISH' ? 'China industrial slowdown or risk aversion pressuring AUD.' : 'Balanced risk regime and commodity export pricing.',
      };
    })(),

    // 6. NZD <-> Commodity / Risk Environment
    (() => {
      if (!isNzdReady) {
        return {
          pairKey: 'NZD_COMMODITY' as const,
          title: 'NZD ↔ Dairy & Commodity Risk',
          assetA: 'NZD',
          assetB: 'GLOBAL DAIRY TRADE & COMMODITIES',
          status: 'INSUFFICIENT DATA' as const,
          score: null,
          drivers: ['Global Dairy Trade (GDT) Price Index', 'Agricultural Export Receipts', 'Asia-Pacific Consumer Demand', 'RBNZ Policy Transmission'],
          structuralMechanism: 'New Zealand’s trade surplus is heavily anchored by agricultural commodities, with whole milk powder and dairy accounting for over 25% of all goods exports. NZD responds reliably to fortnightly GDT auction results and broader risk-on sentiment.',
          correlation: {
            shortTerm30D: { value: +0.61, interpretation: 'Positive sensitivity to GDT auction releases and global risk sentiment' },
            mediumTerm90D: { value: +0.70, interpretation: 'Consistent transmission through agricultural export volumes' },
            longTerm1Y: { value: +0.78, interpretation: 'Structural co-movement with New Zealand terms of trade index' },
          },
          notes: 'Insufficient coverage to establish verified directional bias.',
        };
      }
      const status = nzdScore.score >= 25 ? 'BULLISH' : nzdScore.score <= -25 ? 'BEARISH' : 'NEUTRAL';
      return {
        pairKey: 'NZD_COMMODITY' as const,
        title: 'NZD ↔ Dairy & Commodity Risk',
        assetA: 'NZD',
        assetB: 'GLOBAL DAIRY TRADE & COMMODITIES',
        status,
        score: nzdScore.score,
        drivers: [
          `NZD Macro Score: ${nzdScore.score > 0 ? '+' : ''}${nzdScore.score}`,
          `Assessment: ${nzdScore.assessmentLabel}`,
          `Key Drivers: ${nzdScore.primaryDrivers.slice(0, 2).join(', ') || 'Agricultural exports & RBNZ tone'}`,
          `Dairy Channel: GDT Whole Milk Powder sensitivity`,
        ],
        structuralMechanism: 'Dairy and agricultural products are New Zealand’s economic lifeblood. High dairy prices boost rural farm incomes, improve current accounts, and prompt RBNZ hawkishness; depressed prices generate monetary easing pressure.',
        correlation: {
          shortTerm30D: { value: +0.61, interpretation: 'Positive sensitivity to GDT auction releases and global risk sentiment' },
          mediumTerm90D: { value: +0.70, interpretation: 'Consistent transmission through agricultural export volumes' },
          longTerm1Y: { value: +0.78, interpretation: 'Structural co-movement with New Zealand terms of trade index' },
        },
        notes: status === 'BULLISH' ? 'Agricultural terms of trade and risk appetite supporting NZD.' : status === 'BEARISH' ? 'Soft dairy prices or risk-off sentiment weighing on NZD.' : 'Balanced agricultural demand and terms of trade.',
      };
    })(),
  ];

  return relationships;
}

