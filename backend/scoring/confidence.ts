import { ConfidenceLevel } from '../shared/types.js';
import { clamp } from '../shared/validation.js';
import { SCORING_MODEL_CONFIG } from './modelConfig.js';

export interface ConfidenceCalculationParams {
  totalPossibleIndicatorWeight: number;
  activeIndicatorWeight: number;
  freshnessFactors: number[]; // Array of freshness factors of evaluated indicators
  totalPillarsCount: number; // e.g. 7
  pillarsWithFreshDataCount: number;
  topBullishContribution?: number;
  topBearishContribution?: number;
  customWarningFlags?: string[];
}

export interface DetailedConfidenceResult {
  confidence: ConfidenceLevel; // 'high' | 'medium' | 'low'
  confidenceScore: number; // 0 .. 100
  confidenceDetail: {
    data_completeness_pct: number; // 0 .. 100
    freshness_score_pct: number; // 0 .. 100
    pillar_coverage_pct: number; // 0 .. 100
    conflict_penalty_applied: boolean;
    conflict_penalty_points: number;
    regime_stability?: number;
    pillar_agreement?: number;
  };
  warningFlags: string[];
}

/**
 * Computes model confidence score (0..100), tier, and audit detail.
 *
 * Factors:
 * 1. Data Completeness (40%): sum(active weights) / sum(all possible weights)
 * 2. Freshness (30%): average freshness factor of evaluated indicators
 * 3. Pillar Coverage (30%): fraction of 7 pillars with at least one fresh indicator
 * 4. Conflict Penalty: 15 pt penalty if top bullish driver > +40 and top bearish driver < -40
 *
 * Confidence Tiers:
 * - High:   >= 75
 * - Medium: 50 .. 74
 * - Low:    < 50
 */
export function calculateConfidence(params: ConfidenceCalculationParams): DetailedConfidenceResult {
  const {
    totalPossibleIndicatorWeight,
    activeIndicatorWeight,
    freshnessFactors,
    totalPillarsCount,
    pillarsWithFreshDataCount,
    topBullishContribution = 0,
    topBearishContribution = 0,
    customWarningFlags = [],
  } = params;

  const warningFlags = [...customWarningFlags];

  // 1. Data Completeness (0.0 to 1.0)
  const completeness =
    totalPossibleIndicatorWeight > 0
      ? Math.min(1.0, activeIndicatorWeight / totalPossibleIndicatorWeight)
      : 0.0;

  if (completeness < 0.60) {
    warningFlags.push('low_data_completeness');
  }

  // 2. Average Freshness (0.0 to 1.0)
  const freshness =
    freshnessFactors.length > 0
      ? freshnessFactors.reduce((acc, f) => acc + f, 0) / freshnessFactors.length
      : 0.0;

  if (freshness < 0.65) {
    warningFlags.push('stale_indicator_releases');
  }

  // 3. Pillar Coverage (0.0 to 1.0)
  const pillarCoverage =
    totalPillarsCount > 0
      ? Math.min(1.0, pillarsWithFreshDataCount / totalPillarsCount)
      : 0.0;

  if (pillarCoverage < 0.70) {
    warningFlags.push('incomplete_pillar_coverage');
  }

  // 4. Macro Signal Conflict Detection
  // If top bullish and bearish drivers both exert high magnitude influence (> 40 contribution)
  const isConflict =
    topBullishContribution >= SCORING_MODEL_CONFIG.conflictDriverThreshold &&
    Math.abs(topBearishContribution) >= SCORING_MODEL_CONFIG.conflictDriverThreshold;

  const conflictPenalty = isConflict ? SCORING_MODEL_CONFIG.conflictPenaltyPoints : 0;
  if (isConflict) {
    warningFlags.push('conflicting_macro_signals');
  }

  // Composite 0..100 score
  const weights = SCORING_MODEL_CONFIG.confidenceWeights;
  const rawScore =
    (completeness * weights.dataCompleteness +
      freshness * weights.freshness +
      pillarCoverage * weights.pillarCoverage) *
      100 -
    conflictPenalty;

  const confidenceScore = clamp(Math.round(rawScore), 0, 100);

  // Assign tier
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
      data_completeness_pct: Number((completeness * 100).toFixed(1)),
      freshness_score_pct: Number((freshness * 100).toFixed(1)),
      pillar_coverage_pct: Number((pillarCoverage * 100).toFixed(1)),
      conflict_penalty_applied: isConflict,
      conflict_penalty_points: conflictPenalty,
      pillar_agreement: Math.round(pillarCoverage * 100),
      regime_stability: 85,
    },
    warningFlags: Array.from(new Set(warningFlags)),
  };
}
