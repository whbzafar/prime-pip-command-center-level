import { ConfidenceLevel } from '../shared/types.js';
import { clamp } from '../shared/validation.js';
import { CONFIDENCE_COEFFICIENTS } from './modelConfig.js';

export interface ConfidenceCalculationParams {
  totalConfiguredIndicatorWeight: number;
  availableIndicatorWeight: number;
  availableFreshnessFactors: number[];
  nonNullPillarScores: number[];
  yieldCurve10y2y?: number | null; // e.g. 10Y minus 2Y yield (negative = inverted)
  vixLevel?: number | null; // e.g. CBOE VIX reading (> 25 = high volatility regime)
  hasSuspiciousJumpFlag?: boolean;
  customWarningFlags?: string[];
}

export interface DetailedConfidenceResult {
  confidence: ConfidenceLevel; // 'high' | 'medium' | 'low'
  confidenceScore: number; // 0 .. 100
  confidenceDetail: {
    data_completeness: number; // 0.0 .. 1.0
    freshness: number; // 0.0 .. 1.0
    pillar_agreement: number; // 0.0 .. 1.0
    regime_stability: number; // 0.0 .. 1.0
    data_completeness_pct: number;
    freshness_score_pct: number;
    pillar_coverage_pct: number;
    pillar_agreement_pct: number;
    regime_stability_pct: number;
  };
  warningFlags: string[];
}

/**
 * Computes standard deviation of an array of numbers.
 */
function computeStdDev(values: number[]): number {
  if (!values || values.length <= 1) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Calculates model confidence score (0..100), tier, and audit detail.
 *
 * Factors computed from non-null pillars:
 * 1. data_completeness: available indicator weight / total configured indicator weight.
 * 2. freshness: average freshness factor of available indicators.
 * 3. pillar_agreement: 1 - (std dev of non-null pillar scores / 100). Higher when pillars point the same way.
 * 4. regime_stability: 1.0 default; if US 10y2y spread inverted (< 0) or VIX > 25, cap at 0.7.
 *
 * Warning flags:
 * - sparse_data (completeness < 0.6)
 * - stale_observations (freshness < 0.7)
 * - pillar_conflict (pillar_agreement < 0.5)
 * - regime_stress (regime_stability < 0.8)
 * - indicator_jump_downweighted (any active indicator has a suspicious_jump flag)
 *
 * Monotonicity:
 * Missing an indicator or adding staleness cannot increase confidence.
 */
export function calculateConfidence(params: ConfidenceCalculationParams): DetailedConfidenceResult {
  const {
    totalConfiguredIndicatorWeight,
    availableIndicatorWeight,
    availableFreshnessFactors,
    nonNullPillarScores,
    yieldCurve10y2y = null,
    vixLevel = null,
    hasSuspiciousJumpFlag = false,
    customWarningFlags = [],
  } = params;

  const warningFlags: string[] = [...customWarningFlags];

  // 1. Data Completeness (0.0 to 1.0)
  const completeness = totalConfiguredIndicatorWeight > 0
    ? clamp(availableIndicatorWeight / totalConfiguredIndicatorWeight, 0.0, 1.0)
    : 0.0;

  if (completeness < 0.60) {
    warningFlags.push('sparse_data');
  }

  // 2. Freshness (0.0 to 1.0)
  const freshness = availableFreshnessFactors.length > 0
    ? clamp(
        availableFreshnessFactors.reduce((acc, f) => acc + f, 0) / availableFreshnessFactors.length,
        0.0,
        1.0
      )
    : 0.0;

  if (freshness < 0.70) {
    warningFlags.push('stale_observations');
  }

  // 3. Pillar Agreement (0.0 to 1.0)
  // Higher when non-null pillars point in the same direction
  let pillarAgreement = 1.0;
  if (nonNullPillarScores.length >= 2) {
    const stdDev = computeStdDev(nonNullPillarScores);
    pillarAgreement = clamp(1.0 - (stdDev / 100.0), 0.0, 1.0);
  }

  if (pillarAgreement < 0.50) {
    warningFlags.push('pillar_conflict');
  }

  // 4. Regime Stability (0.0 to 1.0)
  // Default 1.0; if US 10y2y spread inverted or VIX > 25, cap at 0.7
  let regimeStability = 1.0;
  const isInverted = yieldCurve10y2y !== null && yieldCurve10y2y !== undefined && yieldCurve10y2y < 0;
  const isHighVix = vixLevel !== null && vixLevel !== undefined && vixLevel > 25.0;

  if (isInverted || isHighVix) {
    regimeStability = Math.min(regimeStability, 0.70);
    warningFlags.push('regime_stress');
  }

  // 5. Suspicious jump flag
  if (hasSuspiciousJumpFlag) {
    warningFlags.push('indicator_jump_downweighted');
  }

  // Linear combination of the 4 factors
  const coeffs = CONFIDENCE_COEFFICIENTS;
  const rawScore =
    (completeness * coeffs.dataCompleteness +
      freshness * coeffs.freshness +
      pillarAgreement * coeffs.pillarAgreement +
      regimeStability * coeffs.regimeStability) * 100.0;

  const confidenceScore = clamp(Math.round(rawScore), 0, 100);

  // Map to tier: high (>= 75), medium (50-74), low (< 50)
  let confidence: ConfidenceLevel = 'medium';
  if (confidenceScore >= 75) {
    confidence = 'high';
  } else if (confidenceScore < 50) {
    confidence = 'low';
  }

  return {
    confidence,
    confidenceScore,
    confidenceDetail: {
      data_completeness: Number(completeness.toFixed(4)),
      freshness: Number(freshness.toFixed(4)),
      pillar_agreement: Number(pillarAgreement.toFixed(4)),
      regime_stability: Number(regimeStability.toFixed(4)),
      data_completeness_pct: Number((completeness * 100).toFixed(1)),
      freshness_score_pct: Number((freshness * 100).toFixed(1)),
      pillar_coverage_pct: Number((completeness * 100).toFixed(1)),
      pillar_agreement_pct: Number((pillarAgreement * 100).toFixed(1)),
      regime_stability_pct: Number((regimeStability * 100).toFixed(1)),
    },
    warningFlags: Array.from(new Set(warningFlags)),
  };
}
