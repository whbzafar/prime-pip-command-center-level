import { Horizon } from '../shared/types.js';

export interface IndicatorContributionItem {
  indicatorId: string;
  code: string;
  name: string;
  pillarId: string;
  pillarName: string;
  rawValue: number;
  zScore: number;
  score: number; // -100 to +100
  weightInAsset: number; // 0.0 to 1.0
  contribution: number; // weightInAsset * score (-100 to +100)
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
  };
}

/**
 * Generates deterministic institutional template explanation for macroeconomic drivers.
 * Zero LLM dependency - strictly verified quantitative numbers and economic relationships.
 */
export function generateDeterministicDriverExplanation(
  assetSymbol: string,
  indicatorName: string,
  code: string,
  rawValue: number,
  zScore: number,
  pillarName: string,
  driverType: 'bullish' | 'bearish',
  unit = ''
): string {
  const formattedVal = Number.isInteger(rawValue)
    ? rawValue.toLocaleString()
    : rawValue.toFixed(2);
  const formattedZ = (zScore >= 0 ? '+' : '') + zScore.toFixed(1);
  const unitSuffix = unit ? ` ${unit}` : '';

  if (driverType === 'bullish') {
    return `${indicatorName} at ${formattedVal}${unitSuffix} (${formattedZ} sigma) supports ${assetSymbol} via ${pillarName}.`;
  } else {
    return `${indicatorName} at ${formattedVal}${unitSuffix} (${formattedZ} sigma) weighs on ${assetSymbol} via ${pillarName}.`;
  }
}

/**
 * Computes exact macroeconomic driver attribution from scored indicators.
 * Selects top 3 positive contributors (bullish) and top 3 negative contributors (bearish).
 */
export function computeDriverAttribution(
  assetSymbol: string,
  horizon: Horizon,
  contributors: IndicatorContributionItem[]
): {
  bullishDrivers: EvaluatedDriver[];
  bearishDrivers: EvaluatedDriver[];
  allDrivers: EvaluatedDriver[];
} {
  // Filter and sort positive contributors (bullish)
  const positive = contributors
    .filter((c) => c.contribution > 0.001)
    .sort((a, b) => b.contribution - a.contribution);

  // Filter and sort negative contributors (bearish)
  const negative = contributors
    .filter((c) => c.contribution < -0.001)
    .sort((a, b) => a.contribution - b.contribution); // Most negative first

  const bullishDrivers: EvaluatedDriver[] = positive.slice(0, 3).map((item, idx) => {
    const rank = idx + 1;
    const explanation = generateDeterministicDriverExplanation(
      assetSymbol,
      item.name,
      item.code,
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
      },
    };
  });

  const bearishDrivers: EvaluatedDriver[] = negative.slice(0, 3).map((item, idx) => {
    const rank = idx + 1;
    const explanation = generateDeterministicDriverExplanation(
      assetSymbol,
      item.name,
      item.code,
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
      },
    };
  });

  return {
    bullishDrivers,
    bearishDrivers,
    allDrivers: [...bullishDrivers, ...bearishDrivers],
  };
}
