import { clamp } from '../shared/validation.js';
import { SCORING_MODEL_CONFIG } from './modelConfig.js';

export interface ScoredIndicatorInput {
  indicatorId: string;
  code?: string;
  name?: string;
  score: number; // -100 to +100
  baseWeight: number; // Configured weight within pillar
  freshnessFactor: number; // 1.0 (fresh), 0.5 (stale), 0.0 (very_stale)
  hasSuspiciousJump?: boolean;
}

export interface AggregatePillarResult {
  score: number;
  activeWeightSum: number;
  totalPossibleWeight: number;
  freshIndicatorCount: number;
  isEmpty: boolean;
  indicatorWeightsInPillar: Map<string, number>; // Normalized active weights summing to 1.0
}

/**
 * Aggregates individual indicator scores within a pillar into a single composite pillar score.
 * Formula: sum(indicator_score * active_weight) / sum(active_weight)
 *
 * Active weight = base_weight * freshness_factor * (0.5 if suspicious_jump else 1.0)
 * If sum(active_weight) == 0, returns score 0 and isEmpty: true.
 */
export function aggregatePillarScore(
  indicators: ScoredIndicatorInput[],
  jumpDownweightFactor = SCORING_MODEL_CONFIG.jumpDownweightFactor
): AggregatePillarResult {
  if (!indicators || indicators.length === 0) {
    return {
      score: 0,
      activeWeightSum: 0,
      totalPossibleWeight: 0,
      freshIndicatorCount: 0,
      isEmpty: true,
      indicatorWeightsInPillar: new Map(),
    };
  }

  let totalPossibleWeight = 0;
  let activeWeightSum = 0;
  let freshIndicatorCount = 0;
  let weightedScoreSum = 0;

  const indicatorWeightsInPillar = new Map<string, number>();

  // 1. Calculate active weights
  const weightedList: Array<{ indicatorId: string; score: number; activeWeight: number }> = [];

  for (const ind of indicators) {
    totalPossibleWeight += ind.baseWeight;
    const jumpFactor = ind.hasSuspiciousJump ? jumpDownweightFactor : 1.0;
    const activeWeight = ind.baseWeight * ind.freshnessFactor * jumpFactor;

    if (ind.freshnessFactor >= 0.5) {
      freshIndicatorCount++;
    }

    if (activeWeight > 0) {
      activeWeightSum += activeWeight;
      weightedScoreSum += ind.score * activeWeight;
      weightedList.push({ indicatorId: ind.indicatorId, score: ind.score, activeWeight });
    }
  }

  // 2. Handle empty or all-stale pillar
  if (activeWeightSum <= 0) {
    return {
      score: 0,
      activeWeightSum: 0,
      totalPossibleWeight,
      freshIndicatorCount: 0,
      isEmpty: true,
      indicatorWeightsInPillar,
    };
  }

  // 3. Record normalized relative weights within pillar
  for (const item of weightedList) {
    indicatorWeightsInPillar.set(item.indicatorId, item.activeWeight / activeWeightSum);
  }

  const rawScore = weightedScoreSum / activeWeightSum;
  return {
    score: clamp(rawScore, -100, 100),
    activeWeightSum,
    totalPossibleWeight,
    freshIndicatorCount,
    isEmpty: false,
    indicatorWeightsInPillar,
  };
}
