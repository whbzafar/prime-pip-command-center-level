import { isFutureDate } from './dateUtils.js';

export interface SanityRange {
  min: number;
  max: number;
}

/**
 * Standard macroeconomic and positioning sanity bounds per indicator / series.
 * Any raw observation falling outside these bounds triggers an out_of_range data quality flag.
 */
export const SANITY_RANGES: Record<string, SanityRange> = {
  // Monetary
  DFF: { min: -1.0, max: 25.0 },
  DGS2: { min: -1.0, max: 25.0 },
  DFII10: { min: -5.0, max: 15.0 },
  T5YIE: { min: -2.0, max: 15.0 },

  // Inflation & Prices
  CPIAUCSL: { min: 20.0, max: 600.0 }, // Index level
  CPILFESL: { min: 20.0, max: 600.0 },
  PCEPILFE: { min: 20.0, max: 300.0 },
  PPIACO: { min: 20.0, max: 600.0 },
  CES0500000003: { min: 5.0, max: 100.0 }, // Wage per hour in USD

  // Growth & Labor
  PAYEMS: { min: 50000, max: 250000 }, // Total nonfarm in thousands
  UNRATE: { min: 1.0, max: 30.0 }, // Unemployment %
  ICSA: { min: 50000, max: 10000000 }, // Weekly claims
  GDPC1: { min: 5000, max: 40000 }, // Billions of chained 2017 USD
  RSXFS: { min: 50000, max: 1500000 }, // Millions of USD
  UMCSENT: { min: 25.0, max: 150.0 }, // Sentiment index

  // Risk Sentiment
  VIXCLS: { min: 5.0, max: 130.0 }, // VIX volatility index
  BAMLH0A0HYM2: { min: 1.0, max: 35.0 }, // Option-adjusted spread %
  NFCI: { min: -4.0, max: 8.0 }, // Financial conditions index
  SP500: { min: 100, max: 20000 }, // S&P 500 level

  // Structural & Price
  BOPGSTB: { min: -200000, max: 100000 }, // Trade balance in millions
  GFDEGDQ188S: { min: 20.0, max: 300.0 }, // Debt % of GDP
  DTWEXBGS: { min: 40.0, max: 250.0 }, // Broad USD index

  // CFTC Positioning
  CFTC_LEV_NET_PCT_OI: { min: -100.0, max: 100.0 },
  CFTC_LEV_NET: { min: -1000000, max: 1000000 },
  CFTC_OPEN_INTEREST: { min: 1000, max: 5000000 },
  CFTC_ASSET_MGR_NET: { min: -1000000, max: 1000000 },
};

export interface ObservationValidationResult {
  isValid: boolean;
  rejectReason?: string;
  qualityFlagType?: 'out_of_range' | 'suspicious_jump';
  details?: Record<string, any>;
}

/**
 * Validates a single observation against:
 * 1. Numeric validity (reject NaN, null, undefined)
 * 2. Future-dated observation period (reject)
 * 3. Min/Max sanity ranges (flag if out of range)
 */
export function validateObservation(
  seriesOrCode: string,
  periodDate: string,
  value: number | string | null | undefined
): ObservationValidationResult {
  // 1. Check numeric
  if (value === null || value === undefined || value === '' || value === '.') {
    return {
      isValid: false,
      rejectReason: 'Missing or null value (".")',
    };
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || !isFinite(num)) {
    return {
      isValid: false,
      rejectReason: `Non-numeric value: ${String(value)}`,
    };
  }

  // 2. Reject future dates
  if (isFutureDate(periodDate)) {
    return {
      isValid: false,
      rejectReason: `Future-dated observation period: ${periodDate}`,
    };
  }

  // 3. Check sanity ranges
  const range = SANITY_RANGES[seriesOrCode];
  if (range) {
    if (num < range.min || num > range.max) {
      return {
        isValid: true, // Still stored in append-only observations per design principle
        qualityFlagType: 'out_of_range',
        details: {
          value: num,
          min: range.min,
          max: range.max,
          series: seriesOrCode,
        },
      };
    }
  }

  return { isValid: true };
}

/**
 * Detects suspicious jumps: checks if absolute difference between new value and prior value
 * exceeds N standard deviations of historical differences (or a fixed percentage threshold).
 */
export function detectSuspiciousJump(
  currentValue: number,
  previousValue: number | null | undefined,
  stdDevThreshold = 4.0,
  historicalStdDev = 1.0
): boolean {
  if (previousValue === null || previousValue === undefined) {
    return false;
  }
  const delta = Math.abs(currentValue - previousValue);
  const threshold = Math.max(0.001, historicalStdDev) * stdDevThreshold;
  return delta > threshold;
}

/**
 * Clamps a numerical value within [min, max] boundaries.
 */
export function clamp(value: number, min = -100, max = 100): number {
  if (isNaN(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

/**
 * Converts a bounded [-100..+100] score to a 0..100% gauge bullish percentage.
 * Formula: (score + 100) / 2
 */
export function scoreToBullishPct(score: number): number {
  const clamped = clamp(score, -100, 100);
  return Number(((clamped + 100) / 2).toFixed(2));
}

/**
 * Computes pair score: base_score - quote_score, clamped to [-100, 100].
 */
export function computePairScore(baseScore: number, quoteScore: number): number {
  return clamp(baseScore - quoteScore, -100, 100);
}

/**
 * Validates that an array of weights sums to 1.0 within floating point tolerance.
 */
export function validateWeightsSum(weights: number[], tolerance = 0.001): boolean {
  const sum = weights.reduce((acc, w) => acc + w, 0);
  return Math.abs(sum - 1.0) <= tolerance;
}
