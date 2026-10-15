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
 * Standard statistical mean and standard deviation.
 */
export function calculateWindowStats(values: number[]): NormalizationWindowStats {
  if (!values || values.length === 0) {
    return { mean: 0, stdDev: 1, count: 0 };
  }

  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;

  if (n === 1) {
    return { mean, stdDev: 1, count: 1 };
  }

  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev: stdDev || 1, count: n };
}

/**
 * Calculates robust statistical metrics for an array of historical observations.
 */
export function calculateRobustStats(values: number[]): RobustNormalizationStats {
  if (!values || values.length === 0) {
    return { median: 0, mad: 0, mean: 0, stdDev: 1, count: 0 };
  }

  const median = calculateMedian(values);
  const mad = calculateMAD(values, median);
  const { mean, stdDev, count } = calculateWindowStats(values);

  return { median, mad, mean, stdDev, count };
}

/**
 * Robust z-score computation:
 * Formula: (value - median) / (1.4826 * MAD)
 *
 * Fallbacks:
 * - If MAD == 0, falls back to standard standard deviation: (value - mean) / stdDev
 * - If stdDev == 0 (all values identical), returns 0.
 *
 * Clamps z-score strictly to [-3.0, +3.0] to prevent extreme outlier distortion.
 */
export function computeRobustZScore(
  value: number,
  historyValues: number[],
  minObservations = SCORING_MODEL_CONFIG.robustZMinObservations
): number {
  if (!historyValues || historyValues.length === 0) {
    return 0;
  }

  const stats = calculateRobustStats(historyValues);
  if (stats.count < minObservations && stats.count < 5) {
    return 0; // Insufficient history to establish statistical significance
  }

  let rawZ = 0;
  const normalConstant = 1.4826; // Consistency factor for normal distribution

  if (stats.mad > 0) {
    rawZ = (value - stats.median) / (normalConstant * stats.mad);
  } else if (stats.stdDev > 0) {
    // Fallback to standard deviation
    rawZ = (value - stats.mean) / stats.stdDev;
  } else {
    // All numbers in history are identical
    rawZ = 0;
  }

  return clamp(rawZ, SCORING_MODEL_CONFIG.minZScore, SCORING_MODEL_CONFIG.maxZScore);
}

/**
 * Standard z-score calculation with clamp [-3.0, +3.0].
 * Maintained for backward compatibility.
 */
export function computeZScore(value: number, stats: NormalizationWindowStats): number {
  if (stats.count < 2 || stats.stdDev === 0) {
    return 0;
  }
  const rawZ = (value - stats.mean) / stats.stdDev;
  return clamp(rawZ, SCORING_MODEL_CONFIG.minZScore, SCORING_MODEL_CONFIG.maxZScore);
}
