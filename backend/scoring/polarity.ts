import { IndicatorPolarity, CurrencyCode } from '../shared/types.js';
import { clamp } from '../shared/validation.js';
import { SCORING_MODEL_CONFIG, CURRENCY_RISK_SIGN } from './modelConfig.js';

export interface PolarityEvaluationOptions {
  percentileRank?: number; // 0.0 to 1.0 for contrarian_extreme
  currency?: CurrencyCode;
  isRiskIndicator?: boolean;
  riskAssetType?: 'volatility' | 'credit_spread' | 'stress_index' | 'equity_index';
}

/**
 * Maps a standardized z-score [-3.0 .. +3.0] and percentile rank into a bounded directional score [-100 .. +100].
 *
 * Polarities:
 * - higher_bullish: score = base_score = 100 * z / 3
 * - higher_bearish: score = -base_score = -100 * z / 3
 * - contrarian_extreme: uses percentile rank p (0-1) of transformed value in rolling window:
 *     * p in [0.20, 0.80]: score = 0
 *     * p > 0.80: score = -100 * (p - 0.80) / 0.20 (crowded long is bearish)
 *     * p < 0.20: score = +100 * (0.20 - p) / 0.20 (crowded short is bullish / short squeeze)
 * - neutral_context: score = 0 (informative context, no directional bias)
 *
 * Risk-sentiment sign:
 * - Risk indicators (VIX, credit spread, NFCI, S&P 500) are adjusted by the currency's risk_sign.
 * - Rising VIX and widening credit spreads are risk-off (bullish for positive risk_sign currencies like USD, JPY, CHF;
 *   bearish for negative risk_sign currencies like AUD, NZD, CAD, GBP, EUR).
 * - A rising S&P 500 is risk-on, so the negative of the risk_sign is applied (-1.0 * risk_sign).
 */
export function applyPolarity(
  zScore: number,
  polarity: IndicatorPolarity | 'contrarian_extreme' | 'neutral_context',
  options: PolarityEvaluationOptions = {}
): number {
  const clampedZ = clamp(zScore, SCORING_MODEL_CONFIG.minZScore, SCORING_MODEL_CONFIG.maxZScore);
  const baseScore = (100.0 * clampedZ) / 3.0;

  let rawScore = 0;

  switch (polarity) {
    case 'higher_bullish':
      rawScore = baseScore;
      break;

    case 'higher_bearish':
      rawScore = -baseScore;
      break;

    case 'contrarian_extreme': {
      // If percentileRank is provided (preferred exact quantitative specification)
      if (options.percentileRank !== undefined) {
        const p = clamp(options.percentileRank, 0.0, 1.0);
        if (p >= 0.20 && p <= 0.80) {
          rawScore = 0;
        } else if (p > 0.80) {
          rawScore = -100.0 * ((p - 0.80) / 0.20);
        } else {
          rawScore = 100.0 * ((0.20 - p) / 0.20);
        }
        rawScore = Math.round(rawScore * 1e6) / 1e6;
      } else {
        // Fallback approximation using z-score if percentile rank was not pre-computed:
        // z <= -1.5 is lower 6.7%, z >= 1.5 is upper 6.7%
        if (Math.abs(clampedZ) <= 1.0) {
          rawScore = 0;
        } else if (clampedZ > 1.0) {
          rawScore = -100.0 * ((clampedZ - 1.0) / 2.0);
        } else {
          rawScore = 100.0 * ((-clampedZ - 1.0) / 2.0);
        }
      }
      break;
    }

    case 'neutral_context':
    default:
      rawScore = 0;
      break;
  }

  // Apply Risk-Sentiment Sensitivity if applicable
  if (options.isRiskIndicator && options.currency) {
    const riskSign = CURRENCY_RISK_SIGN[options.currency] ?? 1.0;
    if (options.riskAssetType === 'equity_index') {
      // S&P 500 up is risk-on: opposite sign (-1.0 * riskSign)
      rawScore = rawScore * (-riskSign);
    } else {
      // VIX, credit spread, NFCI up is risk-off: multiply by riskSign
      rawScore = rawScore * riskSign;
    }
  }

  return clamp(rawScore, -100.0, 100.0);
}
