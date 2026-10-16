import { Horizon, CurrencyCode } from '../shared/types.js';

export interface IndicatorContributionItem {
  indicatorId: string;
  code: string;
  name: string;
  pillarId: string;
  pillarName: string;
  rawValue: number;
  zScore: number;
  score: number; // -100 to +100
  effectiveWeightInPillar: number; // unnormalized or normalized within pillar
  sumEffectiveWeightsInPillar: number; // sum of effective weights in that pillar
  effectivePillarWeightInAsset: number; // normalized weight of this pillar in the asset score
  effectiveWeightInAsset: number; // (effective_weight_in_pillar / sum(effective_weight_in_pillar)) * effective_pillar_weight_in_asset
  contribution: number; // effectiveWeightInAsset * score
  unit?: string;
  periodDate?: string;
}

export interface EvaluatedDriver {
  indicatorId: string;
  pillarId: string;
  horizon: Horizon;
  rank: number;
  driverType: 'bullish' | 'bearish';
  metricName: string;
  value: number;
  contribution: number;
  explanation: string;
  detailData: {
    metric_name: string;
    indicator_code: string;
    raw_value: number;
    z_score: number;
    score: number;
    unit: string;
    pillar_name: string;
    driver_type: 'bullish' | 'bearish';
    period_date?: string;
    effective_weight: number;
    explanation?: string;
  };
}

/**
 * Deterministic institutional template explanation for macroeconomic drivers.
 * Zero LLM dependency - strictly verified quantitative numbers and economic relationships.
 * Format:
 * '[indicator_name] at [value] [unit] ([+z/-z] sigma) [supports / weighs on] [currency] via [pillar_name].'
 * Example:
 * 'US Non-Farm Payrolls at 254k (+1.4 sigma) supports USD via Growth & Labor.'
 */
export function generateDeterministicDriverExplanation(
  currency: string,
  indicatorName: string,
  rawValue: number,
  zScore: number,
  pillarName: string,
  driverType: 'bullish' | 'bearish',
  unit = ''
): string {
  let formattedVal = '';
  if (Math.abs(rawValue) >= 1000) {
    formattedVal = Math.round(rawValue).toLocaleString();
  } else if (Number.isInteger(rawValue)) {
    formattedVal = rawValue.toString();
  } else {
    formattedVal = rawValue.toFixed(2);
  }

  const sign = zScore >= 0 ? '+' : '';
  const formattedZ = `${sign}${zScore.toFixed(1)} sigma`;
  const unitSuffix = unit ? (unit.startsWith('%') ? unit : ` ${unit}`) : '';
  const verb = driverType === 'bullish' ? 'supports' : 'weighs on';

  return `${indicatorName} at ${formattedVal}${unitSuffix} (${formattedZ}) ${verb} ${currency} via ${pillarName}.`;
}

/**
 * Computes exact macroeconomic driver attribution from scored indicators.
 *
 * Attribution Invariant:
 * effective_weight_in_asset = (effective_weight_in_pillar / sum(effective_weight_in_pillar)) * effective_pillar_weight_in_asset
 * contribution = effective_weight_in_asset * indicator_score
 * sum(all contributions across non-null pillars) == asset_score (+-0.01)
 *
 * Selects:
 * - Top 3 bullish (highest positive contribution)
 * - Top 3 bearish (most negative contribution)
 */
export function computeDriverAttribution(
  currency: string,
  horizon: Horizon,
  contributors: IndicatorContributionItem[]
): {
  bullishDrivers: EvaluatedDriver[];
  bearishDrivers: EvaluatedDriver[];
  allDrivers: EvaluatedDriver[];
  totalContributionSum: number;
} {
  // Compute sum of all contributions
  const totalContributionSum = contributors.reduce((acc, c) => acc + c.contribution, 0);

  // Filter and sort positive contributors (bullish) descending by contribution
  const positive = contributors
    .filter((c) => c.contribution > 0.0001)
    .sort((a, b) => b.contribution - a.contribution);

  // Filter and sort negative contributors (bearish) ascending (most negative first)
  const negative = contributors
    .filter((c) => c.contribution < -0.0001)
    .sort((a, b) => a.contribution - b.contribution);

  const bullishDrivers: EvaluatedDriver[] = positive.slice(0, 3).map((item, idx) => {
    const rank = idx + 1;
    const explanation = generateDeterministicDriverExplanation(
      currency,
      item.name,
      item.rawValue,
      item.zScore,
      item.pillarName,
      'bullish',
      item.unit
    );

    return {
      indicatorId: item.indicatorId,
      pillarId: item.pillarId,
      horizon,
      rank,
      driverType: 'bullish',
      metricName: item.name,
      value: item.rawValue,
      contribution: Number(item.contribution.toFixed(2)),
      explanation,
      detailData: {
        metric_name: item.name,
        indicator_code: item.code,
        raw_value: item.rawValue,
        z_score: Number(item.zScore.toFixed(2)),
        score: Number(item.score.toFixed(2)),
        unit: item.unit || '',
        pillar_name: item.pillarName,
        driver_type: 'bullish',
        period_date: item.periodDate,
        effective_weight: Number(item.effectiveWeightInAsset.toFixed(4)),
        explanation,
      },
    };
  });

  const bearishDrivers: EvaluatedDriver[] = negative.slice(0, 3).map((item, idx) => {
    const rank = idx + 1;
    const explanation = generateDeterministicDriverExplanation(
      currency,
      item.name,
      item.rawValue,
      item.zScore,
      item.pillarName,
      'bearish',
      item.unit
    );

    return {
      indicatorId: item.indicatorId,
      pillarId: item.pillarId,
      horizon,
      rank,
      driverType: 'bearish',
      metricName: item.name,
      value: item.rawValue,
      contribution: Number(item.contribution.toFixed(2)),
      explanation,
      detailData: {
        metric_name: item.name,
        indicator_code: item.code,
        raw_value: item.rawValue,
        z_score: Number(item.zScore.toFixed(2)),
        score: Number(item.score.toFixed(2)),
        unit: item.unit || '',
        pillar_name: item.pillarName,
        driver_type: 'bearish',
        period_date: item.periodDate,
        effective_weight: Number(item.effectiveWeightInAsset.toFixed(4)),
        explanation,
      },
    };
  });

  return {
    bullishDrivers,
    bearishDrivers,
    allDrivers: [...bullishDrivers, ...bearishDrivers],
    totalContributionSum: Number(totalContributionSum.toFixed(4)),
  };
}
