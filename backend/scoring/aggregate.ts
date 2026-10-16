import { clamp } from '../shared/validation.js';

export interface WeightedPillarScore {
  pillarId: string;
  pillarCode?: string;
  score: number | null; // null if insufficient data in pillar
  weight: number; // Configured weight from pillar_weights table for active model version
}

export interface AggregateAssetResult {
  score: number | null; // null if insufficient data (< 4 pillars or < 60% total weight)
  isSufficient: boolean;
  insufficientReason?: string;
  availableWeightSum: number;
  totalConfiguredWeight: number;
  nonNullPillarCount: number;
  totalPillarCount: number;
  isRescaled: boolean;
  effectivePillarWeights: Map<string, number>; // Normalized weights summing to 1.0 across available pillars
}

/**
 * Aggregates non-null pillar scores into an overall asset fundamental score.
 *
 * Rules:
 * 1. Asset score = sum(pillar_weight[horizon] * pillar_score) / sum(pillar_weight of non-null pillars).
 * 2. Strict threshold: Require at least 4 non-null pillars AND at least 60% of total configured pillar weight.
 *    Otherwise returns score: null and isSufficient: false with logged reason.
 * 3. Multiplies by calibration scale (default 1.0) and clamps to [-100, +100].
 * 4. Weights must come dynamically from pillar_weights; never hardcoded.
 */
export function aggregateAssetScore(
  pillars: WeightedPillarScore[],
  calibrationScale = 1.0
): AggregateAssetResult {
  if (!pillars || pillars.length === 0) {
    return {
      score: null,
      isSufficient: false,
      insufficientReason: 'No pillars supplied for evaluation.',
      availableWeightSum: 0,
      totalConfiguredWeight: 0,
      nonNullPillarCount: 0,
      totalPillarCount: 0,
      isRescaled: false,
      effectivePillarWeights: new Map(),
    };
  }

  let totalConfiguredWeight = 0;
  let availableWeightSum = 0;
  let weightedScoreSum = 0;
  const effectivePillarWeights = new Map<string, number>();

  const nonNullPillars: Array<{ pillarId: string; score: number; weight: number }> = [];

  for (const p of pillars) {
    totalConfiguredWeight += p.weight;
    if (p.score !== null && !isNaN(p.score) && p.weight > 0) {
      availableWeightSum += p.weight;
      weightedScoreSum += p.score * p.weight;
      nonNullPillars.push({ pillarId: p.pillarId, score: p.score, weight: p.weight });
    }
  }

  const nonNullPillarCount = nonNullPillars.length;
  const totalPillarCount = pillars.length;

  const weightCoverageRatio = totalConfiguredWeight > 0 ? availableWeightSum / totalConfiguredWeight : 0;

  // Threshold validation: >= 4 non-null pillars AND >= 60% total configured weight
  const hasMinPillars = nonNullPillarCount >= 4;
  const hasMinWeight = weightCoverageRatio >= 0.60;

  if (!hasMinPillars || !hasMinWeight) {
    const reasons: string[] = [];
    if (!hasMinPillars) reasons.push(`only ${nonNullPillarCount}/${totalPillarCount} non-null pillars (minimum 4 required)`);
    if (!hasMinWeight) reasons.push(`only ${(weightCoverageRatio * 100).toFixed(1)}% configured weight available (minimum 60% required)`);

    return {
      score: null,
      isSufficient: false,
      insufficientReason: `Insufficient data: ${reasons.join(', ')}.`,
      availableWeightSum,
      totalConfiguredWeight,
      nonNullPillarCount,
      totalPillarCount,
      isRescaled: false,
      effectivePillarWeights,
    };
  }

  // Calculate normalized effective weights across available pillars summing to 1.0
  for (const item of nonNullPillars) {
    effectivePillarWeights.set(item.pillarId, item.weight / availableWeightSum);
  }

  const rawScore = weightedScoreSum / availableWeightSum;
  const scaledScore = rawScore * calibrationScale;
  const clampedScore = clamp(scaledScore, -100.0, 100.0);
  const isRescaled = Math.abs(availableWeightSum - totalConfiguredWeight) > 0.001;

  return {
    score: clampedScore,
    isSufficient: true,
    availableWeightSum,
    totalConfiguredWeight,
    nonNullPillarCount,
    totalPillarCount,
    isRescaled,
    effectivePillarWeights,
  };
}
