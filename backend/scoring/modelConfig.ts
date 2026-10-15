import { Horizon, IndicatorFrequency } from '../shared/types.js';

export type TransformType =
  | 'level'
  | 'change_n'
  | 'pct_change_n'
  | 'yoy'
  | 'annualized_3m'
  | 'avg_n'
  | 'return_n'
  | 'ma_distance'
  | 'percentile_rank';

export interface TransformSpec {
  type: TransformType;
  n?: number;
  description: string;
}

export interface IndicatorModelConfig {
  code: string;
  shortTransform: TransformSpec;
  longTransform: TransformSpec;
  defaultPolarity: 'higher_bullish' | 'higher_bearish' | 'contrarian_extreme' | 'neutral_context';
  isDerived?: boolean;
  derivedFormula?: 'us_2y_minus_fedfunds' | 'yield_curve_slope' | 'real_yield' | 'cftc_net_spec_pct_oi';
  constituentCodes?: string[];
  normalizationWindowYears?: number;
}

export interface FreshnessTolerance {
  freshDays: number;
  staleDays: number; // beyond staleDays is very_stale (excluded)
}

/**
 * Freshness tolerances per indicator release frequency.
 */
export const FREQUENCY_FRESHNESS_CONFIG: Record<IndicatorFrequency, FreshnessTolerance> = {
  daily: { freshDays: 3, staleDays: 7 },
  weekly: { freshDays: 14, staleDays: 28 },
  monthly: { freshDays: 45, staleDays: 90 },
  quarterly: { freshDays: 120, staleDays: 180 },
  event: { freshDays: 90, staleDays: 180 },
};

/**
 * Model Parameters and Hyperparameters.
 * Versioned identifier tags all derived data.
 */
export const SCORING_MODEL_CONFIG = {
  modelVersion: 'v0.1-initial',
  jumpDownweightFactor: 0.5, // Down-weight indicators flagged with suspicious_jump
  maxZScore: 3.0,
  minZScore: -3.0,
  robustZMinObservations: 15, // Minimum observations to compute rolling robust z-score
  defaultNormalizationWindowYears: 8,
  winsorizeLowerPercentile: 0.01,
  winsorizeUpperPercentile: 0.99,
  contrarianThresholds: {
    moderateZ: 1.5,
    extremeZ: 2.0,
    maxZ: 3.0,
    moderateScale: 20.0,
    crowdingPenaltySlope: 86.67, // Triggers steep reversal as z exceeds 1.5 into 3.0
  },
  confidenceWeights: {
    dataCompleteness: 0.40,
    freshness: 0.30,
    pillarCoverage: 0.30,
  },
  conflictDriverThreshold: 40.0, // Contribution threshold for contradictory drivers
  conflictPenaltyPoints: 15,
};

/**
 * Indicator Transform Specs per Horizon.
 * Short horizon (1-4w) captures near-term rate & momentum changes.
 * Long horizon (6m+) captures structural levels, trends, and YoY macro balances.
 */
export const INDICATOR_TRANSFORM_REGISTRY: Record<string, IndicatorModelConfig> = {
  // Monetary Policy
  USD_FEDFUNDS: {
    code: 'USD_FEDFUNDS',
    shortTransform: { type: 'change_n', n: 20, description: '20-day policy rate change' },
    longTransform: { type: 'level', description: 'Absolute Fed Funds level' },
    defaultPolarity: 'higher_bullish',
  },
  USD_2Y_TREASURY_YIELD: {
    code: 'USD_2Y_TREASURY_YIELD',
    shortTransform: { type: 'change_n', n: 20, description: '1-month 2Y Treasury yield change' },
    longTransform: { type: 'level', description: 'Absolute 2Y Treasury yield level' },
    defaultPolarity: 'higher_bullish',
  },
  USD_10Y_TREASURY_YIELD: {
    code: 'USD_10Y_TREASURY_YIELD',
    shortTransform: { type: 'change_n', n: 20, description: '1-month 10Y Treasury yield change' },
    longTransform: { type: 'level', description: 'Absolute 10Y Treasury yield level' },
    defaultPolarity: 'higher_bullish',
  },
  USD_10Y_TIPS_REAL_YIELD: {
    code: 'USD_10Y_TIPS_REAL_YIELD',
    shortTransform: { type: 'change_n', n: 20, description: '1-month 10Y real TIPS yield change' },
    longTransform: { type: 'level', description: 'Absolute 10Y real yield level' },
    defaultPolarity: 'higher_bullish',
  },
  // Derived Monetary Spreads
  USD_2Y_MINUS_FEDFUNDS: {
    code: 'USD_2Y_MINUS_FEDFUNDS',
    shortTransform: { type: 'level', description: '2Y minus Fed Funds policy lead spread' },
    longTransform: { type: 'avg_n', n: 60, description: '3-month average yield curve lead' },
    defaultPolarity: 'higher_bullish',
    isDerived: true,
    derivedFormula: 'us_2y_minus_fedfunds',
    constituentCodes: ['USD_2Y_TREASURY_YIELD', 'USD_FEDFUNDS'],
  },
  USD_YIELD_CURVE_SLOPE: {
    code: 'USD_YIELD_CURVE_SLOPE',
    shortTransform: { type: 'level', description: '10Y minus 2Y Treasury yield curve slope' },
    longTransform: { type: 'avg_n', n: 60, description: '3-month average yield curve slope' },
    defaultPolarity: 'higher_bullish',
    isDerived: true,
    derivedFormula: 'yield_curve_slope',
    constituentCodes: ['USD_10Y_TREASURY_YIELD', 'USD_2Y_TREASURY_YIELD'],
  },
  USD_REAL_YIELD_DERIVED: {
    code: 'USD_REAL_YIELD_DERIVED',
    shortTransform: { type: 'change_n', n: 20, description: '1-month real yield shift' },
    longTransform: { type: 'level', description: '10Y nominal minus 10Y breakeven real yield' },
    defaultPolarity: 'higher_bullish',
    isDerived: true,
    derivedFormula: 'real_yield',
    constituentCodes: ['USD_10Y_TREASURY_YIELD', 'USD_5Y5Y_FORWARD_INFLATION'],
  },

  // Inflation
  USD_CPI_HEADLINE_YOY: {
    code: 'USD_CPI_HEADLINE_YOY',
    shortTransform: { type: 'annualized_3m', n: 3, description: '3-month annualized CPI inflation rate' },
    longTransform: { type: 'yoy', n: 12, description: '12-month headline CPI YoY' },
    defaultPolarity: 'higher_bullish',
  },
  USD_CORE_CPI_YOY: {
    code: 'USD_CORE_CPI_YOY',
    shortTransform: { type: 'annualized_3m', n: 3, description: '3-month annualized core CPI' },
    longTransform: { type: 'yoy', n: 12, description: '12-month core CPI YoY' },
    defaultPolarity: 'higher_bullish',
  },
  USD_CORE_PCE_PRICE_INDEX: {
    code: 'USD_CORE_PCE_PRICE_INDEX',
    shortTransform: { type: 'annualized_3m', n: 3, description: '3-month annualized core PCE' },
    longTransform: { type: 'yoy', n: 12, description: '12-month core PCE YoY' },
    defaultPolarity: 'higher_bullish',
  },
  USD_PRODUCER_PRICE_INDEX: {
    code: 'USD_PRODUCER_PRICE_INDEX',
    shortTransform: { type: 'change_n', n: 1, description: 'Monthly PPI pipeline pressure change' },
    longTransform: { type: 'yoy', n: 12, description: '12-month PPI YoY rate' },
    defaultPolarity: 'higher_bullish',
  },
  USD_AVG_HOURLY_EARNINGS: {
    code: 'USD_AVG_HOURLY_EARNINGS',
    shortTransform: { type: 'change_n', n: 3, description: '3-month wage momentum' },
    longTransform: { type: 'yoy', n: 12, description: '12-month wage growth' },
    defaultPolarity: 'higher_bullish',
  },
  USD_5Y5Y_FORWARD_INFLATION: {
    code: 'USD_5Y5Y_FORWARD_INFLATION',
    shortTransform: { type: 'change_n', n: 20, description: '1-month change in inflation expectation' },
    longTransform: { type: 'level', description: '5Y breakeven inflation expectation level' },
    defaultPolarity: 'neutral_context',
  },

  // Growth & Labor
  USD_NONFARM_PAYROLLS: {
    code: 'USD_NONFARM_PAYROLLS',
    shortTransform: { type: 'change_n', n: 1, description: 'Monthly net payrolls added (thousands)' },
    longTransform: { type: 'yoy', n: 12, description: '12-month employment growth' },
    defaultPolarity: 'higher_bullish',
  },
  USD_UNEMPLOYMENT_RATE: {
    code: 'USD_UNEMPLOYMENT_RATE',
    shortTransform: { type: 'change_n', n: 3, description: '3-month unemployment drift' },
    longTransform: { type: 'level', description: 'Civilian unemployment rate level' },
    defaultPolarity: 'higher_bearish',
  },
  USD_INITIAL_JOBLESS_CLAIMS: {
    code: 'USD_INITIAL_JOBLESS_CLAIMS',
    shortTransform: { type: 'avg_n', n: 4, description: '4-week moving average jobless claims' },
    longTransform: { type: 'change_n', n: 13, description: '13-week claims trend' },
    defaultPolarity: 'higher_bearish',
  },
  USD_REAL_GDP_QOQ: {
    code: 'USD_REAL_GDP_QOQ',
    shortTransform: { type: 'pct_change_n', n: 1, description: 'Quarterly real GDP expansion pace' },
    longTransform: { type: 'yoy', n: 4, description: 'Annual real GDP growth' },
    defaultPolarity: 'higher_bullish',
  },
  USD_RETAIL_SALES: {
    code: 'USD_RETAIL_SALES',
    shortTransform: { type: 'pct_change_n', n: 1, description: 'Monthly retail sales momentum' },
    longTransform: { type: 'yoy', n: 12, description: '12-month consumer spending growth' },
    defaultPolarity: 'higher_bullish',
  },
  USD_CONSUMER_SENTIMENT: {
    code: 'USD_CONSUMER_SENTIMENT',
    shortTransform: { type: 'change_n', n: 3, description: '3-month sentiment direction' },
    longTransform: { type: 'level', description: 'Consumer sentiment index level' },
    defaultPolarity: 'higher_bullish',
  },

  // Risk Sentiment
  USD_CBOE_VIX: {
    code: 'USD_CBOE_VIX',
    shortTransform: { type: 'level', description: 'Instantaneous equity volatility (safe-haven proxy)' },
    longTransform: { type: 'avg_n', n: 60, description: '3-month volatility regime' },
    defaultPolarity: 'higher_bullish',
  },
  USD_HIGH_YIELD_CREDIT_SPREAD: {
    code: 'USD_HIGH_YIELD_CREDIT_SPREAD',
    shortTransform: { type: 'change_n', n: 20, description: '1-month high yield spread widening/tightening' },
    longTransform: { type: 'level', description: 'High yield credit risk premium level' },
    defaultPolarity: 'higher_bullish',
  },
  USD_FINANCIAL_CONDITIONS_INDEX: {
    code: 'USD_FINANCIAL_CONDITIONS_INDEX',
    shortTransform: { type: 'level', description: 'Financial conditions tightness index' },
    longTransform: { type: 'avg_n', n: 12, description: '12-week financial stress condition' },
    defaultPolarity: 'higher_bearish',
  },
  USD_SP500_LEVEL: {
    code: 'USD_SP500_LEVEL',
    shortTransform: { type: 'return_n', n: 20, description: '1-month S&P 500 equity return' },
    longTransform: { type: 'return_n', n: 252, description: '1-year equity return' },
    defaultPolarity: 'neutral_context',
  },

  // Positioning (CFTC)
  USD_CFTC_LEV_NET: {
    code: 'USD_CFTC_LEV_NET',
    shortTransform: { type: 'level', description: 'Net speculative contracts' },
    longTransform: { type: 'avg_n', n: 12, description: '12-week average net position' },
    defaultPolarity: 'contrarian_extreme',
  },
  USD_CFTC_LEV_NET_PCT_OI: {
    code: 'USD_CFTC_LEV_NET_PCT_OI',
    shortTransform: { type: 'level', description: 'Leveraged net positioning as % of open interest' },
    longTransform: { type: 'avg_n', n: 12, description: '12-week average net % OI' },
    defaultPolarity: 'contrarian_extreme',
    isDerived: true,
    derivedFormula: 'cftc_net_spec_pct_oi',
    constituentCodes: ['USD_CFTC_LEV_NET', 'USD_CFTC_OPEN_INTEREST'],
  },
  USD_CFTC_OPEN_INTEREST: {
    code: 'USD_CFTC_OPEN_INTEREST',
    shortTransform: { type: 'change_n', n: 4, description: '4-week open interest expansion' },
    longTransform: { type: 'level', description: 'Total market open interest level' },
    defaultPolarity: 'neutral_context',
  },

  // Structural & Flows
  USD_TRADE_BALANCE: {
    code: 'USD_TRADE_BALANCE',
    shortTransform: { type: 'change_n', n: 3, description: '3-month trade balance deficit change' },
    longTransform: { type: 'avg_n', n: 12, description: '12-month trade deficit average' },
    defaultPolarity: 'higher_bullish',
  },
  USD_CURRENT_ACCOUNT: {
    code: 'USD_CURRENT_ACCOUNT',
    shortTransform: { type: 'change_n', n: 1, description: 'Quarterly current account change' },
    longTransform: { type: 'level', description: 'Current account balance level' },
    defaultPolarity: 'higher_bullish',
  },
  USD_FEDERAL_DEBT_TO_GDP: {
    code: 'USD_FEDERAL_DEBT_TO_GDP',
    shortTransform: { type: 'change_n', n: 2, description: '2-quarter debt-to-GDP trajectory' },
    longTransform: { type: 'level', description: 'Federal debt % of GDP level' },
    defaultPolarity: 'higher_bearish',
  },

  // Price Confirmation
  USD_INDEX_TREND: {
    code: 'USD_INDEX_TREND',
    shortTransform: { type: 'ma_distance', n: 50, description: 'Distance from 50-day moving average' },
    longTransform: { type: 'ma_distance', n: 200, description: 'Distance from 200-day moving average' },
    defaultPolarity: 'higher_bullish',
  },
};
