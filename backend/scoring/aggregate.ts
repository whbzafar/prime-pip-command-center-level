import { clamp } from '../shared/validation.js';

export interface WeightedPillarScore {
  pillarId: string;
  score: number; // -100 to +100
  weight: number; // Configured weight (e.g. 0.30)
  isEmpty?: boolean; // Flagged true if pillar has zero usable active indicators
}

export interface AggregateAssetResult {
  score: number;
  availableWeightSum: number;
  totalConfiguredWeight: number;
  isRescaled: boolean;
  effectivePillarWeights: Map<string, number>; // Normalized weights summing to 1.0 across available pillars
}

/**
 * Aggregates pillar scores into an overall asset fundamental score for a specific horizon.
 *
 * Formula: sum(pillar_score * pillar_weight) / sum(available_pillar_weights)
 *
 * Rescales by the sum of available pillar weights so missing or stale pillars
 * do not artificially drag the asset score towards zero.
 */
export function aggregateAssetScore(pillars: WeightedPillarScore[]): AggregateAssetResult {
  if (!pillars || pillars.length === 0) {
    return {
      score: 0,
      availableWeightSum: 0,
      totalConfiguredWeight: 0,
      isRescaled: false,
      effectivePillarWeights: new Map(),
    };
  }

  let totalConfiguredWeight = 0;
  let availableWeightSum = 0;
  let weightedScoreSum = 0;
  const effectivePillarWeights = new Map<string, number>();

  const availableList: Array<{ pillarId: string; score: number; weight: number }> = [];

  for (const p of pillars) {
    totalConfiguredWeight += p.weight;
    if (!p.isEmpty && p.weight > 0) {
      availableWeightSum += p.weight;
      weightedScoreSum += p.score * p.weight;
      availableList.push({ pillarId: p.pillarId, score: p.score, weight: p.weight });
    }
  }

  if (availableWeightSum <= 0) {
    return {
      score: 0,
      availableWeightSum: 0,
      totalConfiguredWeight,
      isRescaled: false,
      effectivePillarWeights,
    };
  }

  // Calculate normalized effective weight per available pillar
  for (const item of availableList) {
    effectivePillarWeights.set(item.pillarId, item.weight / availableWeightSum);
  }

  const rawScore = weightedScoreSum / availableWeightSum;
  const isRescaled = Math.abs(availableWeightSum - totalConfiguredWeight) > 0.001;

  return {
    score: clamp(rawScore, -100, 100),
    availableWeightSum,
    totalConfiguredWeight,
    isRescaled,
    effectivePillarWeights,
  };
}
