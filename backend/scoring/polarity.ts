import { IndicatorPolarity } from '../shared/types.js';
import { clamp } from '../shared/validation.js';
import { SCORING_MODEL_CONFIG } from './modelConfig.js';

/**
 * Maps a standardized z-score [-3.0 .. +3.0] into a bounded directional score [-100 .. +100]
 * according to the macroeconomic indicator polarity specification.
 *
 * Polarities:
 * - higher_bullish: score = z * (100 / 3)
 * - higher_bearish: score = -z * (100 / 3)
 * - contrarian_extreme: for positioning (CFTC).
 *     * Moderate long (|z| <= 1.5): mildly bullish (momentum/trend following)
 *     * Extreme long (> +2 z): bearish (crowded long unwind risk)
 *     * Extreme short (< -2 z): bullish (short squeeze potential)
 * - neutral_context: 0 (informs confidence or regime, zero directional bias)
 */
export function applyPolarity(zScore: number, polarity: IndicatorPolarity): number {
  const clampedZ = clamp(zScore, SCORING_MODEL_CONFIG.minZScore, SCORING_MODEL_CONFIG.maxZScore);
  const linearScale = 100.0 / 3.0; // 33.333333333

  switch (polarity) {
    case 'higher_bullish':
      return clamp(clampedZ * linearScale, -100, 100);

    case 'higher_bearish':
      return clamp(-clampedZ * linearScale, -100, 100);

    case 'contrarian_extreme': {
      // Piecewise positioning curve:
      // Zone 1: Moderate positioning (-1.5 <= z <= 1.5)
      // Follows trend: score = z * 20 (z = 1.0 -> +20; z = -1.0 -> -20)
      if (Math.abs(clampedZ) <= 1.5) {
        return clamp(clampedZ * 20.0, -100, 100);
      }

      // Zone 2: Extreme Long (z > 1.5)
      // Reversal curve: at z = 1.5 -> +30; at z = 2.0 -> -13.3; at z = 2.5 -> -56.7; at z = 3.0 -> -100
      if (clampedZ > 1.5) {
        const excess = clampedZ - 1.5; // range (0 .. 1.5]
        const score = 30.0 - (excess / 1.5) * 130.0;
        return clamp(score, -100, 100);
      }

      // Zone 3: Extreme Short (z < -1.5)
      // Squeeze curve: at z = -1.5 -> -30; at z = -2.0 -> +13.3; at z = -2.5 -> +56.7; at z = -3.0 -> +100
      const excessShort = -clampedZ - 1.5; // range (0 .. 1.5]
      const scoreShort = -30.0 + (excessShort / 1.5) * 130.0;
      return clamp(scoreShort, -100, 100);
    }

    case 'neutral_context':
    default:
      return 0;
  }
}
