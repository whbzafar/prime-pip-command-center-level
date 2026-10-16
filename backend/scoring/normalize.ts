import { clamp } from '../shared/validation.js';
import { SCORING_MODEL_CONFIG } from './modelConfig.js';

export interface NormalizationWindowStats {
  mean: number;
  stdDev: number;
  count: number;
}

export interface RobustNormalizationStats {
  median: number;
  mad: number;
  mean: number;
  stdDev: number;
  count: number;
  p01: number;
  p99: number;
}

export interface RobustZScoreResult {
  isAvailable: boolean;
  zScore: number;
  baseScore: number; // 100 * z / 3 bounded [-100, 100]
  method: 'robust_mad' | 'standard_fallback' | 'unavailable';
  median: number;
  mad: number;
}

/**
 * Calculates median of an array of numbers.
 */
export function calculateMedian(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculates Median Absolute Deviation (MAD): median(|x_i - median(x)|).
 */
export function calculateMAD(values: number[], median: number): number {
  if (!values || values.length === 0) return 0;
  const absDiffs = values.map((v) => Math.abs(v - median));
  return calculateMedian(absDiffs);
}

/**
 * Computes standard sample mean and standard deviation.
 */
export function calculateWindowStats(values: number[]): NormalizationWindowStats {
  if (!values || values.length === 0) {
    return { mean: 0, stdDev: 0, count: 0 };
  }

  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;

  if (n === 1) {
    return { mean, stdDev: 0, count: 1 };
  }

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(Math.max(0, variance));

  return { mean, stdDev, count: n };
}

/**
 * Winsorizes an array of values at specified lower (e.g. 1st) and upper (e.g. 99th) percentiles.
 * Outliers outside [p_lower, p_upper] are replaced with the boundary values.
 */
export function winsorize(
  values: number[],
  lowerPct = SCORING_MODEL_CONFIG.winsorizeLowerPercentile,
  upperPct = SCORING_MODEL_CONFIG.winsorizeUpperPercentile
): { winsorized: number[]; pLower: number; pUpper: number } {
  if (!values || values.length === 0) {
    return { winsorized: [], pLower: 0, pUpper: 0 };
  }
  if (values.length <= 4) {
    return { winsorized: [...values], pLower: values[0], pUpper: values[values.length - 1] };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const lowIdx = Math.max(0, Math.min(n - 1, Math.floor(lowerPct * n)));
  const upIdx = Math.max(0, Math.min(n - 1, Math.ceil(upperPct * n) - 1));

  const pLower = sorted[lowIdx];
  const pUpper = sorted[upIdx];

  const winsorized = values.map((v) => {
    if (v < pLower) return pLower;
    if (v > pUpper) return pUpper;
    return v;
  });

  return { winsorized, pLower, pUpper };
}

/**
 * Calculates percentile rank of x within historical values (0.0 to 1.0).
 * Handles ties using mid-rank formula: (count_strictly_less + 0.5 * count_equal) / N.
 */
export function computePercentileRank(x: number, values: number[]): number {
  if (!values || values.length === 0) return 0.5;
  const count = values.length;
  let strictlyLess = 0;
  let equals = 0;

  for (const v of values) {
    if (v < x) strictlyLess++;
    else if (v === x) equals++;
  }

  return (strictlyLess + 0.5 * equals) / count;
}

/**
 * Calculates robust statistical metrics for an array of historical observations:
 * 1. Winsorizes at 1st and 99th percentiles.
 * 2. Computes median and MAD on the winsorized window.
 * 3. Computes sample mean and std dev.
 */
export function calculateRobustStats(
  values: number[],
  lowerPct = SCORING_MODEL_CONFIG.winsorizeLowerPercentile,
  upperPct = SCORING_MODEL_CONFIG.winsorizeUpperPercentile
): RobustNormalizationStats {
  if (!values || values.length === 0) {
    return { median: 0, mad: 0, mean: 0, stdDev: 0, count: 0, p01: 0, p99: 0 };
  }

  const { winsorized, pLower, pUpper } = winsorize(values, lowerPct, upperPct);
  const median = calculateMedian(winsorized);
  const mad = calculateMAD(winsorized, median);
  const { mean, stdDev, count } = calculateWindowStats(winsorized);

  return { median, mad, mean, stdDev, count, p01: pLower, p99: pUpper };
}

/**
 * Robust z-score computation per Pro Fundamentals quantitative specification:
 * - Formula: z = (x - median) / (1.4826 * MAD)
 * - Window: rolling window (e.g. 8 years) winsorized at 1st/99th percentile.
 * - Fallbacks:
 *   * If MAD is ~0 (< 1e-6) or fewer than 30 observations exist, fall back to standard z: (x - mean) / stdDev.
 *   * If still impossible (fewer than 2 observations, or stdDev == 0), the indicator is unavailable (do not guess).
 * - Clip z to [-3, 3]. Base score = 100 * z / 3.
 */
export function computeDetailedRobustZScore(
  value: number,
  historyValues: number[],
  minObservations = SCORING_MODEL_CONFIG.robustZMinObservations
): RobustZScoreResult {
  if (!historyValues || historyValues.length === 0) {
    return {
      isAvailable: false,
      zScore: 0,
      baseScore: 0,
      method: 'unavailable',
      median: 0,
      mad: 0,
    };
  }

  const stats = calculateRobustStats(historyValues);
  const normalConstant = 1.4826;

  // Primary: Robust MAD z-score (requires >= 30 observations and non-zero MAD)
  if (stats.count >= minObservations && stats.mad > 1e-6) {
    const rawZ = (value - stats.median) / (normalConstant * stats.mad);
    const clampedZ = clamp(rawZ, SCORING_MODEL_CONFIG.minZScore, SCORING_MODEL_CONFIG.maxZScore);
    const baseScore = clamp((100.0 * clampedZ) / 3.0, -100.0, 100.0);

    return {
      isAvailable: true,
      zScore: clampedZ,
      baseScore,
      method: 'robust_mad',
      median: stats.median,
      mad: stats.mad,
    };
  }

  // Fallback: standard z-score if count >= 2 and stdDev > 1e-6
  if (stats.count >= 2 && stats.stdDev > 1e-6) {
    const rawZ = (value - stats.mean) / stats.stdDev;
    const clampedZ = clamp(rawZ, SCORING_MODEL_CONFIG.minZScore, SCORING_MODEL_CONFIG.maxZScore);
    const baseScore = clamp((100.0 * clampedZ) / 3.0, -100.0, 100.0);

    return {
      isAvailable: true,
      zScore: clampedZ,
      baseScore,
      method: 'standard_fallback',
      median: stats.mean,
      mad: stats.stdDev,
    };
  }

  // Still impossible (fewer than 2 observations or identical values) -> unavailable (do not guess)
  return {
    isAvailable: false,
    zScore: 0,
    baseScore: 0,
    method: 'unavailable',
    median: stats.median,
    mad: stats.mad,
  };
}

/**
 * Backward compatible helper: returns clamped z-score or 0 if unavailable.
 */
export function computeRobustZScore(
  value: number,
  historyValues: number[],
  minObservations = SCORING_MODEL_CONFIG.robustZMinObservations
): number {
  const res = computeDetailedRobustZScore(value, historyValues, minObservations);
  return res.zScore;
}

/**
 * Standard z-score helper with clamp [-3.0, +3.0].
 */
export function computeZScore(value: number, stats: NormalizationWindowStats): number {
  if (stats.count < 2 || stats.stdDev === 0) {
    return 0;
  }
  const rawZ = (value - stats.mean) / stats.stdDev;
  return clamp(rawZ, SCORING_MODEL_CONFIG.minZScore, SCORING_MODEL_CONFIG.maxZScore);
}
