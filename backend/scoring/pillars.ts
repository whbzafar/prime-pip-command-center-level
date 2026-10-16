import { clamp } from '../shared/validation.js';
import { SCORING_MODEL_CONFIG } from './modelConfig.js';

export interface ScoredIndicatorInput {
  indicatorId: string;
  code?: string;
  name?: string;
  score: number; // -100 to +100
  baseWeight: number; // Configured weight within pillar (e.g. from indicators.weight_in_pillar)
  freshnessFactor: number; // 1.0 (fresh), 0.5 (stale), 0.0 (very_stale)
  hasSuspiciousJump?: boolean;
  isAvailable?: boolean; // false if insufficient history or observation missing
}

export interface AggregatePillarResult {
  score: number | null; // null if insufficient data (< 50% configured weight)
  isInsufficient: boolean;
  activeWeightSum: number;
  totalConfiguredWeight: number;
  freshIndicatorCount: number;
  indicatorWeightsInPillar: Map<string, number>; // Normalized weights summing to 1.0 across available indicators
  effectiveIndicatorWeights: Map<string, number>; // Unnormalized effective weights
}

/**
 * Aggregates individual indicator scores within a fundamental pillar into a single composite pillar score.
 *
 * Rules:
 * 1. Indicator weights: use indicators.weight_in_pillar (if null/undefined, equal weight 1.0).
 * 2. Effective weight = weight_in_pillar * freshness_factor * (jump_factor if suspicious_jump).
 * 3. Pillar score = sum(effective_weight * indicator_score) / sum(effective_weight) over available indicators.
 * 4. Insufficiency check: If available active weight is below 50% of the pillar's total configured weight,
 *    the pillar is "insufficient" (null) for that run.
 */
export function aggregatePillarScore(
  indicators: ScoredIndicatorInput[],
  jumpDownweightFactor = SCORING_MODEL_CONFIG.jumpDownweightFactor
): AggregatePillarResult {
  if (!indicators || indicators.length === 0) {
    return {
      score: null,
      isInsufficient: true,
      activeWeightSum: 0,
      totalConfiguredWeight: 0,
      freshIndicatorCount: 0,
      indicatorWeightsInPillar: new Map(),
      effectiveIndicatorWeights: new Map(),
    };
  }

  let totalConfiguredWeight = 0;
  let activeWeightSum = 0;
  let freshIndicatorCount = 0;
  let weightedScoreSum = 0;

  const indicatorWeightsInPillar = new Map<string, number>();
  const effectiveIndicatorWeights = new Map<string, number>();

  const usableItems: Array<{ indicatorId: string; score: number; effectiveWeight: number }> = [];

  for (const ind of indicators) {
    const baseWeight = ind.baseWeight > 0 ? ind.baseWeight : 1.0;
    totalConfiguredWeight += baseWeight;

    // Check availability & staleness
    const isAvailable = ind.isAvailable !== false && ind.freshnessFactor > 0.0;
    if (!isAvailable) {
      effectiveIndicatorWeights.set(ind.indicatorId, 0);
      continue;
    }

    if (ind.freshnessFactor >= 0.5) {
      freshIndicatorCount++;
    }

    const jumpFactor = ind.hasSuspiciousJump ? jumpDownweightFactor : 1.0;
    const effectiveWeight = baseWeight * ind.freshnessFactor * jumpFactor;

    if (effectiveWeight > 0) {
      activeWeightSum += effectiveWeight;
      weightedScoreSum += ind.score * effectiveWeight;
      effectiveIndicatorWeights.set(ind.indicatorId, effectiveWeight);
      usableItems.push({ indicatorId: ind.indicatorId, score: ind.score, effectiveWeight });
    } else {
      effectiveIndicatorWeights.set(ind.indicatorId, 0);
    }
  }

  // Insufficiency rule: available weight must be >= 50% of total configured weight
  const isInsufficient = totalConfiguredWeight > 0
    ? (activeWeightSum / totalConfiguredWeight) < 0.50
    : true;

  if (isInsufficient || activeWeightSum <= 0) {
    return {
      score: null,
      isInsufficient: true,
      activeWeightSum,
      totalConfiguredWeight,
      freshIndicatorCount,
      indicatorWeightsInPillar,
      effectiveIndicatorWeights,
    };
  }

  // Normalize relative weights within pillar summing to 1.0
  for (const item of usableItems) {
    indicatorWeightsInPillar.set(item.indicatorId, item.effectiveWeight / activeWeightSum);
  }

  const rawScore = weightedScoreSum / activeWeightSum;

  return {
    score: clamp(rawScore, -100.0, 100.0),
    isInsufficient: false,
    activeWeightSum,
    totalConfiguredWeight,
    freshIndicatorCount,
    indicatorWeightsInPillar,
    effectiveIndicatorWeights,
  };
}
