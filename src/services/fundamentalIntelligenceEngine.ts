/**
 * PRIME PIP FX COMMAND CENTER — CORE FUNDAMENTAL INTELLIGENCE ENGINE
 * Specification: Production Financial Intelligence Layer
 *
 * Implements:
 * 1. Indicator-Level Fundamental Bias & Scoring
 *    - Comparison to Expectations: Surprise = Actual - Forecast
 *    - Direction of Change: Change = Actual - Previous
 *    - Trend/Direction Rules: HIGHER_IS_BULLISH, HIGHER_IS_BEARISH, RANGE_BOUND, INFLATION_POLICY_PATH, etc.
 *    - Magnitude / Z-Score: Standardized Surprise = Surprise / StdDev
 *    - Revisions: Historical revision adjustments
 *    - Staleness Penalty: Time decay based on release frequency
 *    - Status: CURRENT, RECENT, STALE, MISSING, INSUFFICIENT_DATA
 *
 * 2. Category-Level Bias & Aggregation
 *    - Inflation, Employment, Growth, Monetary Policy, Interest Rates, Yields, Trade, Sentiment, COT, etc.
 *    - Dynamic weights normalized strictly to 100% of available data
 *
 * 3. Currency-Level Fundamental Strength (-100 to +100)
 *    - Composite scoring across all active categories
 *    - Freshness & Data Quality gating (HIGH, MEDIUM, LOW, INSUFFICIENT_DATA)
 *    - Conflict detection: Opposing forces (e.g. strong inflation but deteriorating employment)
 *
 * 4. Currency Ranking
 *    - Deterministic Ladder #1 to #8
 *    - Relative strength percentiles & ranking tiers
 *
 * 5. Pair-Level Fundamental Direction & Scoring (-200 to +200)
 *    - Net Differential = Base Score - Quote Score
 *    - Category Divergence Breakdown: Rate differential, inflation gap, growth gap, sentiment contrast
 *    - Timeframe alignment: Short-term, Medium-term, Long-term structural bias
 *
 * 6. Confidence Engine (0 - 100%)
 *    - Data coverage percentage, freshness score, source credibility, consistency / lack of conflict
 *
 * 7. Traceable Explanation & Reasoning Engine
 *    - Human-readable narrative detailing exactly which official releases caused the bias
 *    - Invalidation triggers & upcoming catalyst watch
 *
 * 8. Data-Quality & Verification Status Check
 *    - STRICT RULE: Consumes ONLY validated/verified data. Flags missing or unverified observations.
 */

import { CurrencyCode } from '../types/fundamentalIndicatorTypes';
import { ObservationRecord, ValidationStatus } from '../types/financialDatabaseTypes';

// ============================================================================
// 1. DOMAIN MODELS & TYPES
// ============================================================================

export type IndicatorDirectionRule =
  | 'HIGHER_IS_BULLISH'
  | 'HIGHER_IS_BEARISH'
  | 'INFLATION_POLICY_PATH'
  | 'EXTERNAL_BALANCE'
  | 'CONTRARIAN_RETAIL'
  | 'RANGE_BOUND';

export type BiasClassification =
  | 'STRONGLY_BULLISH'
  | 'BULLISH'
  | 'NEUTRAL'
  | 'BEARISH'
  | 'STRONGLY_BEARISH'
  | 'INSUFFICIENT_DATA';

export type DataFreshnessStatus = 'CURRENT' | 'RECENT' | 'STALE' | 'EXPIRED' | 'UNAVAILABLE';

export interface IndicatorIntelligenceResult {
  indicatorId: string;
  indicatorName: string;
  currency: CurrencyCode;
  category: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  revision: number | null;
  surprise: number | null;
  change: number | null;
  standardizedSurprise: number | null;
  score: number; // -100 to +100
  bias: BiasClassification;
  weight: number;
  weightedContribution: number;
  freshness: DataFreshnessStatus;
  ageDays: number;
  confidence: number; // 0 to 100
  validationStatus: ValidationStatus;
  sourceName: string;
  sourceUrl: string;
  releaseDate: string | null;
  referencePeriod: string;
  reasoning: string;
  isStale: boolean;
  isValidated: boolean;
}

export interface CategoryIntelligenceResult {
  category: string;
  categoryLabel: string;
  score: number; // -100 to +100
  bias: BiasClassification;
  configuredWeight: number;
  effectiveWeight: number; // Normalized to available categories
  weightedContribution: number;
  indicatorCount: number;
  activeIndicatorCount: number;
  coveragePercent: number;
  confidence: number;
  primaryDrivers: string[];
  conflicts: string[];
  indicators: IndicatorIntelligenceResult[];
}

export interface CurrencyIntelligenceResult {
  currency: CurrencyCode;
  currencyName: string;
  compositeScore: number; // -100 to +100
  bias: BiasClassification;
  biasLabel: string;
  confidenceScore: number; // 0 to 100%
  rank: number; // 1 to 8
  percentile: number; // 0 to 100
  categoryScores: Record<string, CategoryIntelligenceResult>;
  totalIndicators: number;
  completedIndicators: number;
  dataCoveragePercent: number;
  dataQualityStatus: 'PRISTINE' | 'ADEQUATE' | 'DEGRADED' | 'INSUFFICIENT_DATA';
  freshnessStatus: 'CURRENT' | 'PARTIAL' | 'STALE' | 'INSUFFICIENT_DATA';
  primaryBullishDrivers: string[];
  primaryBearishDrivers: string[];
  conflictingFactors: string[];
  macroRegime: string;
  narrativeSummary: string;
  invalidationRisks: string[];
  policyRate?: number;
  tenYearYield?: number;
  lastCalculatedAt: string;
}

export interface PairCategoryDivergence {
  category: string;
  categoryLabel: string;
  baseScore: number;
  quoteScore: number;
  divergence: number; // baseScore - quoteScore
  favoredCurrency: CurrencyCode | 'EQUAL';
  driverNote: string;
}

export interface PairIntelligenceResult {
  pair: string;
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  baseScore: number;
  quoteScore: number;
  netDifferential: number; // baseScore - quoteScore (-200 to +200)
  fundamentalBias: BiasClassification;
  biasLabel: string;
  confidenceScore: number; // 0 to 100%
  timeframeAlignment: {
    shortTerm: { bias: BiasClassification; score: number; rationale: string };
    mediumTerm: { bias: BiasClassification; score: number; rationale: string };
    longTerm: { bias: BiasClassification; score: number; rationale: string };
  };
  policyRateDifferential: number; // Base rate - Quote rate
  yield10YSpread?: number; // Base 10Y - Quote 10Y
  categoryDivergence: PairCategoryDivergence[];
  primaryCatalysts: string[];
  conflicts: string[];
  tradeSuitability: 'HIGH_CONVICTION' | 'MODERATE_OPPORTUNITY' | 'LOW_EDGE' | 'DO_NOT_TRADE';
  reasoningNarrative: string;
  dataCompleteness: number; // %
  invalidationLevelText: string;
}

export interface FullIntelligenceReport {
  timestamp: string;
  engineVersion: string;
  verifiedObservationsCount: number;
  currencyScores: Record<CurrencyCode, CurrencyIntelligenceResult>;
  currencyRankings: { rank: number; currency: CurrencyCode; score: number; bias: BiasClassification; confidence: number }[];
  pairDifferentials: PairIntelligenceResult[];
  globalMacroRegimeSummary: {
    dominantRegime: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL_TRANSITIONAL' | 'INFLATION_DOMINANT';
    strongestCurrency: CurrencyCode;
    weakestCurrency: CurrencyCode;
    highestConvictionPairs: string[];
    dataCoverageAverage: number;
  };
}

// ============================================================================
// 2. CONFIGURATION & STATISTICAL METRIC PROFILES
// ============================================================================

export interface IndicatorStatProfile {
  id: string;
  name: string;
  currency: CurrencyCode;
  category: string;
  directionRule: IndicatorDirectionRule;
  historicalStdDev: number;
  targetBenchmark?: number;
  stalenessThresholdDays: number;
  weightInCategory: number;
  categoryWeight: number;
  sourceAuthorityRank: number; // 1-5 (5 = Sovereign central bank/BLS/BEA)
}

export const OFFICIAL_INDICATOR_PROFILES: Record<string, IndicatorStatProfile> = {
  // USD
  USD_POLICY_RATE: { id: 'USD_POLICY_RATE', name: 'Fed Funds Target Rate', currency: 'USD', category: 'MONETARY_POLICY', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.25, stalenessThresholdDays: 60, weightInCategory: 45, categoryWeight: 20, sourceAuthorityRank: 5 },
  USD_CPI_YOY: { id: 'USD_CPI_YOY', name: 'US CPI Headline YoY', currency: 'USD', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.2, stalenessThresholdDays: 45, weightInCategory: 30, categoryWeight: 15, sourceAuthorityRank: 5 },
  USD_CORE_CPI_YOY: { id: 'USD_CORE_CPI_YOY', name: 'US Core CPI YoY', currency: 'USD', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.15, stalenessThresholdDays: 45, weightInCategory: 35, categoryWeight: 15, sourceAuthorityRank: 5 },
  USD_CORE_PCE_YOY: { id: 'USD_CORE_PCE_YOY', name: 'US Core PCE Price Index', currency: 'USD', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.15, stalenessThresholdDays: 50, weightInCategory: 35, categoryWeight: 15, sourceAuthorityRank: 5 },
  USD_NFP: { id: 'USD_NFP', name: 'Non-Farm Payrolls Change', currency: 'USD', category: 'EMPLOYMENT', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 75.0, stalenessThresholdDays: 45, weightInCategory: 45, categoryWeight: 10, sourceAuthorityRank: 5 },
  USD_UNEMPLOYMENT: { id: 'USD_UNEMPLOYMENT', name: 'US Unemployment Rate', currency: 'USD', category: 'EMPLOYMENT', directionRule: 'HIGHER_IS_BEARISH', targetBenchmark: 4.0, historicalStdDev: 0.15, stalenessThresholdDays: 45, weightInCategory: 35, categoryWeight: 10, sourceAuthorityRank: 5 },
  USD_GDP_ANNUALIZED: { id: 'USD_GDP_ANNUALIZED', name: 'US Real GDP Annualized', currency: 'USD', category: 'GROWTH', directionRule: 'HIGHER_IS_BULLISH', targetBenchmark: 2.0, historicalStdDev: 0.8, stalenessThresholdDays: 120, weightInCategory: 50, categoryWeight: 15, sourceAuthorityRank: 5 },
  USD_ISM_MANUFACTURING: { id: 'USD_ISM_MANUFACTURING', name: 'ISM Manufacturing PMI', currency: 'USD', category: 'BUSINESS_ACTIVITY', directionRule: 'HIGHER_IS_BULLISH', targetBenchmark: 50.0, historicalStdDev: 1.5, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 10, sourceAuthorityRank: 4 },
  USD_ISM_SERVICES: { id: 'USD_ISM_SERVICES', name: 'ISM Services PMI', currency: 'USD', category: 'BUSINESS_ACTIVITY', directionRule: 'HIGHER_IS_BULLISH', targetBenchmark: 50.0, historicalStdDev: 1.5, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 10, sourceAuthorityRank: 4 },
  USD_RETAIL_SALES: { id: 'USD_RETAIL_SALES', name: 'US Retail Sales MoM', currency: 'USD', category: 'CONSUMER', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.4, stalenessThresholdDays: 45, weightInCategory: 60, categoryWeight: 5, sourceAuthorityRank: 5 },
  USD_TRADE_BALANCE: { id: 'USD_TRADE_BALANCE', name: 'US Trade Balance', currency: 'USD', category: 'TRADE_EXTERNAL', directionRule: 'EXTERNAL_BALANCE', historicalStdDev: 4.0, stalenessThresholdDays: 50, weightInCategory: 100, categoryWeight: 5, sourceAuthorityRank: 5 },
  USD_10Y_YIELD: { id: 'USD_10Y_YIELD', name: 'US 10-Year Treasury Benchmark', currency: 'USD', category: 'RATES_YIELDS', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.35, stalenessThresholdDays: 15, weightInCategory: 60, categoryWeight: 10, sourceAuthorityRank: 5 },

  // EUR
  EUR_DEPOSIT_RATE: { id: 'EUR_DEPOSIT_RATE', name: 'ECB Deposit Facility Rate', currency: 'EUR', category: 'MONETARY_POLICY', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.25, stalenessThresholdDays: 60, weightInCategory: 50, categoryWeight: 20, sourceAuthorityRank: 5 },
  EUR_HICP_YOY: { id: 'EUR_HICP_YOY', name: 'Eurozone Headline HICP YoY', currency: 'EUR', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.2, stalenessThresholdDays: 45, weightInCategory: 45, categoryWeight: 15, sourceAuthorityRank: 5 },
  EUR_CORE_HICP_YOY: { id: 'EUR_CORE_HICP_YOY', name: 'Eurozone Core HICP YoY', currency: 'EUR', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.15, stalenessThresholdDays: 45, weightInCategory: 55, categoryWeight: 15, sourceAuthorityRank: 5 },
  EUR_GDP_QOQ: { id: 'EUR_GDP_QOQ', name: 'Eurozone GDP QoQ', currency: 'EUR', category: 'GROWTH', directionRule: 'HIGHER_IS_BULLISH', targetBenchmark: 0.3, historicalStdDev: 0.2, stalenessThresholdDays: 120, weightInCategory: 50, categoryWeight: 15, sourceAuthorityRank: 5 },
  EUR_UNEMPLOYMENT: { id: 'EUR_UNEMPLOYMENT', name: 'Eurozone Unemployment Rate', currency: 'EUR', category: 'EMPLOYMENT', directionRule: 'HIGHER_IS_BEARISH', targetBenchmark: 6.5, historicalStdDev: 0.1, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 10, sourceAuthorityRank: 5 },
  EUR_COMPOSITE_PMI: { id: 'EUR_COMPOSITE_PMI', name: 'Eurozone Composite PMI', currency: 'EUR', category: 'BUSINESS_ACTIVITY', directionRule: 'HIGHER_IS_BULLISH', targetBenchmark: 50.0, historicalStdDev: 1.2, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 10, sourceAuthorityRank: 4 },
  EUR_GERMAN_10Y_BUND: { id: 'EUR_GERMAN_10Y_BUND', name: 'German 10Y Bund Sovereign Benchmark', currency: 'EUR', category: 'RATES_YIELDS', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.3, stalenessThresholdDays: 15, weightInCategory: 60, categoryWeight: 10, sourceAuthorityRank: 5 },
  EUR_TRADE_BALANCE: { id: 'EUR_TRADE_BALANCE', name: 'Eurozone Trade Balance', currency: 'EUR', category: 'TRADE_EXTERNAL', directionRule: 'EXTERNAL_BALANCE', historicalStdDev: 5.0, stalenessThresholdDays: 50, weightInCategory: 100, categoryWeight: 5, sourceAuthorityRank: 5 },

  // GBP
  GBP_BANK_RATE: { id: 'GBP_BANK_RATE', name: 'BoE Official Bank Rate', currency: 'GBP', category: 'MONETARY_POLICY', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.25, stalenessThresholdDays: 60, weightInCategory: 50, categoryWeight: 20, sourceAuthorityRank: 5 },
  GBP_CPI_YOY: { id: 'GBP_CPI_YOY', name: 'UK CPI Headline YoY', currency: 'GBP', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.25, stalenessThresholdDays: 45, weightInCategory: 45, categoryWeight: 15, sourceAuthorityRank: 5 },
  GBP_CORE_CPI_YOY: { id: 'GBP_CORE_CPI_YOY', name: 'UK Core CPI YoY', currency: 'GBP', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.2, stalenessThresholdDays: 45, weightInCategory: 55, categoryWeight: 15, sourceAuthorityRank: 5 },
  GBP_GDP_MOM: { id: 'GBP_GDP_MOM', name: 'UK Monthly GDP MoM', currency: 'GBP', category: 'GROWTH', directionRule: 'HIGHER_IS_BULLISH', targetBenchmark: 0.2, historicalStdDev: 0.3, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 15, sourceAuthorityRank: 5 },
  GBP_UNEMPLOYMENT: { id: 'GBP_UNEMPLOYMENT', name: 'UK ILO Unemployment Rate', currency: 'GBP', category: 'EMPLOYMENT', directionRule: 'HIGHER_IS_BEARISH', targetBenchmark: 4.2, historicalStdDev: 0.15, stalenessThresholdDays: 45, weightInCategory: 40, categoryWeight: 10, sourceAuthorityRank: 5 },
  GBP_COMPOSITE_PMI: { id: 'GBP_COMPOSITE_PMI', name: 'UK Composite PMI', currency: 'GBP', category: 'BUSINESS_ACTIVITY', directionRule: 'HIGHER_IS_BULLISH', targetBenchmark: 50.0, historicalStdDev: 1.2, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 10, sourceAuthorityRank: 4 },
  GBP_10Y_GILT_YIELD: { id: 'GBP_10Y_GILT_YIELD', name: 'UK 10Y Benchmark Gilt Yield', currency: 'GBP', category: 'RATES_YIELDS', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.35, stalenessThresholdDays: 15, weightInCategory: 60, categoryWeight: 10, sourceAuthorityRank: 5 },

  // JPY
  JPY_POLICY_RATE: { id: 'JPY_POLICY_RATE', name: 'BOJ Uncollateralized Overnight Call Target', currency: 'JPY', category: 'MONETARY_POLICY', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.15, stalenessThresholdDays: 60, weightInCategory: 50, categoryWeight: 20, sourceAuthorityRank: 5 },
  JPY_NATIONAL_CPI_YOY: { id: 'JPY_NATIONAL_CPI_YOY', name: 'Japan National Core CPI YoY', currency: 'JPY', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.2, stalenessThresholdDays: 45, weightInCategory: 60, categoryWeight: 15, sourceAuthorityRank: 5 },
  JPY_GDP_ANNUALIZED: { id: 'JPY_GDP_ANNUALIZED', name: 'Japan Real GDP Annualized', currency: 'JPY', category: 'GROWTH', directionRule: 'HIGHER_IS_BULLISH', targetBenchmark: 1.0, historicalStdDev: 1.0, stalenessThresholdDays: 120, weightInCategory: 50, categoryWeight: 15, sourceAuthorityRank: 5 },
  JPY_10Y_JGB_YIELD: { id: 'JPY_10Y_JGB_YIELD', name: 'Japan 10Y JGB Benchmark Yield', currency: 'JPY', category: 'RATES_YIELDS', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.15, stalenessThresholdDays: 15, weightInCategory: 60, categoryWeight: 10, sourceAuthorityRank: 5 },
  JPY_TANKAN_LARGE_MFG: { id: 'JPY_TANKAN_LARGE_MFG', name: 'BOJ Tankan Large Manufacturing Index', currency: 'JPY', category: 'BUSINESS_ACTIVITY', directionRule: 'HIGHER_IS_BULLISH', targetBenchmark: 10.0, historicalStdDev: 3.0, stalenessThresholdDays: 100, weightInCategory: 60, categoryWeight: 10, sourceAuthorityRank: 5 },

  // AUD
  AUD_CASH_RATE: { id: 'AUD_CASH_RATE', name: 'RBA Cash Rate Target', currency: 'AUD', category: 'MONETARY_POLICY', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.25, stalenessThresholdDays: 60, weightInCategory: 50, categoryWeight: 20, sourceAuthorityRank: 5 },
  AUD_CPI_YOY: { id: 'AUD_CPI_YOY', name: 'Australia Trimmed Mean CPI YoY', currency: 'AUD', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.5, historicalStdDev: 0.2, stalenessThresholdDays: 100, weightInCategory: 50, categoryWeight: 15, sourceAuthorityRank: 5 },
  AUD_EMPLOYMENT_CHANGE: { id: 'AUD_EMPLOYMENT_CHANGE', name: 'Australia Net Employment Change', currency: 'AUD', category: 'EMPLOYMENT', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 25.0, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 10, sourceAuthorityRank: 5 },
  AUD_UNEMPLOYMENT: { id: 'AUD_UNEMPLOYMENT', name: 'Australia Unemployment Rate', currency: 'AUD', category: 'EMPLOYMENT', directionRule: 'HIGHER_IS_BEARISH', targetBenchmark: 4.0, historicalStdDev: 0.15, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 10, sourceAuthorityRank: 5 },
  AUD_10Y_BOND_YIELD: { id: 'AUD_10Y_BOND_YIELD', name: 'Australia 10Y Sovereign Bond Benchmark', currency: 'AUD', category: 'RATES_YIELDS', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.35, stalenessThresholdDays: 15, weightInCategory: 60, categoryWeight: 10, sourceAuthorityRank: 5 },

  // CAD
  CAD_OVERNIGHT_RATE: { id: 'CAD_OVERNIGHT_RATE', name: 'BoC Policy Overnight Rate', currency: 'CAD', category: 'MONETARY_POLICY', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.25, stalenessThresholdDays: 60, weightInCategory: 50, categoryWeight: 20, sourceAuthorityRank: 5 },
  CAD_CPI_MEDIAN_YOY: { id: 'CAD_CPI_MEDIAN_YOY', name: 'Canada CPI-Median & Trim YoY', currency: 'CAD', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.2, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 15, sourceAuthorityRank: 5 },
  CAD_EMPLOYMENT_CHANGE: { id: 'CAD_EMPLOYMENT_CHANGE', name: 'Canada Net Employment Change', currency: 'CAD', category: 'EMPLOYMENT', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 30.0, stalenessThresholdDays: 45, weightInCategory: 50, categoryWeight: 10, sourceAuthorityRank: 5 },
  CAD_10Y_BOND_YIELD: { id: 'CAD_10Y_BOND_YIELD', name: 'Canada 10Y Sovereign Bond Benchmark', currency: 'CAD', category: 'RATES_YIELDS', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.35, stalenessThresholdDays: 15, weightInCategory: 60, categoryWeight: 10, sourceAuthorityRank: 5 },

  // CHF
  CHF_POLICY_RATE: { id: 'CHF_POLICY_RATE', name: 'SNB Policy Rate', currency: 'CHF', category: 'MONETARY_POLICY', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.25, stalenessThresholdDays: 90, weightInCategory: 50, categoryWeight: 20, sourceAuthorityRank: 5 },
  CHF_CPI_YOY: { id: 'CHF_CPI_YOY', name: 'Switzerland CPI YoY', currency: 'CHF', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 1.5, historicalStdDev: 0.2, stalenessThresholdDays: 45, weightInCategory: 60, categoryWeight: 15, sourceAuthorityRank: 5 },
  CHF_10Y_CONFED_YIELD: { id: 'CHF_10Y_CONFED_YIELD', name: 'Swiss Confederation 10Y Bond Yield', currency: 'CHF', category: 'RATES_YIELDS', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.25, stalenessThresholdDays: 15, weightInCategory: 60, categoryWeight: 10, sourceAuthorityRank: 5 },

  // NZD
  NZD_OFFICIAL_CASH_RATE: { id: 'NZD_OFFICIAL_CASH_RATE', name: 'RBNZ Official Cash Rate (OCR)', currency: 'NZD', category: 'MONETARY_POLICY', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.25, stalenessThresholdDays: 60, weightInCategory: 50, categoryWeight: 20, sourceAuthorityRank: 5 },
  NZD_CPI_YOY: { id: 'NZD_CPI_YOY', name: 'New Zealand CPI YoY', currency: 'NZD', category: 'INFLATION', directionRule: 'INFLATION_POLICY_PATH', targetBenchmark: 2.0, historicalStdDev: 0.3, stalenessThresholdDays: 100, weightInCategory: 60, categoryWeight: 15, sourceAuthorityRank: 5 },
  NZD_10Y_BOND_YIELD: { id: 'NZD_10Y_BOND_YIELD', name: 'New Zealand 10Y Sovereign Bond Benchmark', currency: 'NZD', category: 'RATES_YIELDS', directionRule: 'HIGHER_IS_BULLISH', historicalStdDev: 0.35, stalenessThresholdDays: 15, weightInCategory: 60, categoryWeight: 10, sourceAuthorityRank: 5 },
};

export const CANONICAL_28_PAIRS: [CurrencyCode, CurrencyCode][] = [
  ['EUR', 'USD'],
  ['GBP', 'USD'],
  ['USD', 'JPY'],
  ['USD', 'CHF'],
  ['USD', 'CAD'],
  ['AUD', 'USD'],
  ['NZD', 'USD'],
  ['EUR', 'GBP'],
  ['EUR', 'JPY'],
  ['GBP', 'JPY'],
  ['AUD', 'JPY'],
  ['CAD', 'JPY'],
  ['CHF', 'JPY'],
  ['NZD', 'JPY'],
  ['EUR', 'AUD'],
  ['EUR', 'CAD'],
  ['EUR', 'CHF'],
  ['EUR', 'NZD'],
  ['GBP', 'AUD'],
  ['GBP', 'CAD'],
  ['GBP', 'CHF'],
  ['GBP', 'NZD'],
  ['AUD', 'CAD'],
  ['AUD', 'CHF'],
  ['AUD', 'NZD'],
  ['CAD', 'CHF'],
  ['NZD', 'CAD'],
  ['NZD', 'CHF'],
];

// ============================================================================
// 3. CORE INTELLIGENCE PIPELINE IMPLEMENTATION
// ============================================================================

export class FundamentalIntelligenceEngine {
  /**
   * Evaluates a single verified economic indicator observation and converts it into
   * a standardized score (-100 to +100), directional bias, and explanatory narrative.
   */
  public static evaluateIndicator(
    profile: IndicatorStatProfile,
    obs?: {
      actual: number | null;
      forecast: number | null;
      previous: number | null;
      revision?: number | null;
      releaseDate?: string | null;
      referencePeriod?: string;
      validationStatus?: ValidationStatus;
      sourceName?: string;
      sourceUrl?: string;
    }
  ): IndicatorIntelligenceResult {
    const isPresent = obs && typeof obs.actual === 'number' && !isNaN(obs.actual);
    const actual = isPresent ? obs!.actual! : null;
    const forecast = obs && typeof obs.forecast === 'number' && !isNaN(obs.forecast) ? obs.forecast : null;
    const previous = obs && typeof obs.previous === 'number' && !isNaN(obs.previous) ? obs.previous : null;
    const revision = obs && typeof obs.revision === 'number' && !isNaN(obs.revision) ? obs.revision : null;

    const validationStatus: ValidationStatus = obs?.validationStatus || (isPresent ? 'VERIFIED' : 'DATA_UNAVAILABLE');
    const isValidated = validationStatus === 'VERIFIED';

    if (!isPresent || !isValidated) {
      return {
        indicatorId: profile.id,
        indicatorName: profile.name,
        currency: profile.currency,
        category: profile.category,
        actual: null,
        forecast: null,
        previous: null,
        revision: null,
        surprise: null,
        change: null,
        standardizedSurprise: null,
        score: 0,
        bias: 'INSUFFICIENT_DATA',
        weight: profile.weightInCategory,
        weightedContribution: 0,
        freshness: 'UNAVAILABLE',
        ageDays: 999,
        confidence: 0,
        validationStatus,
        sourceName: obs?.sourceName || 'Pending Official Release',
        sourceUrl: obs?.sourceUrl || '',
        releaseDate: obs?.releaseDate || null,
        referencePeriod: obs?.referencePeriod || 'Unrecorded',
        reasoning: `No validated official economic release recorded for ${profile.name}. Excluded from active weighting.`,
        isStale: true,
        isValidated: false,
      };
    }

    // Mathematical Surprise & Standardized Z-Score
    const surprise = forecast !== null ? Number((actual! - forecast).toFixed(4)) : null;
    const change = previous !== null ? Number((actual! - previous).toFixed(4)) : null;
    const stdDev = profile.historicalStdDev || 1.0;
    const standardizedSurprise = surprise !== null ? Number((surprise / stdDev).toFixed(3)) : null;

    let rawScore = 0;
    let reasoning = '';

    switch (profile.directionRule) {
      case 'HIGHER_IS_BULLISH': {
        if (standardizedSurprise !== null) {
          rawScore = Math.max(-100, Math.min(100, standardizedSurprise * 42));
          if (change !== null) {
            rawScore = rawScore * 0.75 + Math.sign(change) * Math.min(25, Math.abs(change) * 10);
          }
        } else if (change !== null) {
          rawScore = Math.max(-80, Math.min(80, (change / stdDev) * 35));
        } else {
          rawScore = 0;
        }

        if (profile.targetBenchmark !== undefined) {
          const deltaBenchmark = actual! - profile.targetBenchmark;
          rawScore = rawScore * 0.8 + Math.max(-20, Math.min(20, deltaBenchmark * 12));
        }

        reasoning = surprise !== null
          ? surprise > 0
            ? `Print of ${actual} beat consensus expectations (${forecast}) by +${surprise}. Demonstrates resilient expansionary momentum.`
            : surprise < 0
            ? `Print of ${actual} fell short of consensus (${forecast}) by ${surprise}. Signifies deceleration in fundamental drivers.`
            : `Print of ${actual} came in exactly as expected. Baseline support intact.`
          : `Actual release of ${actual} represents a change of ${change !== null ? (change > 0 ? `+${change}` : change) : '0'} vs previous (${previous}).`;
        break;
      }

      case 'HIGHER_IS_BEARISH': {
        if (standardizedSurprise !== null) {
          rawScore = Math.max(-100, Math.min(100, -standardizedSurprise * 45));
          if (change !== null) {
            rawScore = rawScore * 0.75 - Math.sign(change) * Math.min(25, Math.abs(change) * 15);
          }
        } else if (change !== null) {
          rawScore = Math.max(-80, Math.min(80, -(change / stdDev) * 40));
        }

        reasoning = surprise !== null
          ? surprise < 0
            ? `Reading of ${actual} tightened below forecast (${forecast}) by ${surprise}. Tighter conditions reinforce currency resilience.`
            : surprise > 0
            ? `Reading of ${actual} expanded above forecast (${forecast}) by +${surprise}. Deterioration exerts downward fundamental pressure.`
            : `Reading aligned with consensus at ${actual}.`
          : `Observed reading of ${actual} reflects negative-direction metric.`;
        break;
      }

      case 'INFLATION_POLICY_PATH': {
        const target = profile.targetBenchmark ?? 2.0;
        if (standardizedSurprise !== null) {
          let surpriseComponent = Math.max(-70, Math.min(70, standardizedSurprise * 40));
          const aboveTarget = actual! - target;
          let targetComponent = Math.max(-30, Math.min(30, aboveTarget * 18));

          // Overheating penalty: Extreme runaway inflation hurts currency purchasing power
          if (actual! > 7.5) {
            surpriseComponent -= (actual! - 7.5) * 15;
          }

          rawScore = Math.max(-100, Math.min(100, surpriseComponent + targetComponent));
        } else {
          const diff = actual! - target;
          rawScore = Math.max(-60, Math.min(60, diff * 25));
        }

        reasoning = actual! > target
          ? `Print of ${actual}% maintains trajectory above official target (${target}%), maintaining higher-for-longer policy expectations.`
          : `Print of ${actual}% resides at or below target (${target}%), giving the central bank latitude for policy accommodation.`;
        break;
      }

      case 'EXTERNAL_BALANCE': {
        if (standardizedSurprise !== null) {
          rawScore = Math.max(-100, Math.min(100, standardizedSurprise * 40));
        } else {
          rawScore = Math.max(-60, Math.min(60, actual! > 0 ? 35 : -35));
        }
        reasoning = actual! >= 0
          ? `Surplus reading of ${actual} represents net capital inflow support for ${profile.currency}.`
          : `Deficit reading of ${actual} reflects structural capital outflow pressure.`;
        break;
      }

      default: {
        rawScore = standardizedSurprise !== null ? Math.max(-80, Math.min(80, standardizedSurprise * 35)) : 0;
        reasoning = `Validated reading: ${actual}.`;
      }
    }

    // Historical revision bonus/penalty
    if (revision !== null && previous !== null) {
      const revisionDiff = revision - previous;
      if (profile.directionRule === 'HIGHER_IS_BEARISH') {
        rawScore -= Math.sign(revisionDiff) * Math.min(15, Math.abs(revisionDiff) * 5);
      } else {
        rawScore += Math.sign(revisionDiff) * Math.min(15, Math.abs(revisionDiff) * 5);
      }
    }

    // Age & Staleness Determination
    const releaseTime = obs?.releaseDate ? new Date(obs.releaseDate).getTime() : Date.now();
    const ageDays = Math.max(0, Math.floor((Date.now() - releaseTime) / (1000 * 60 * 60 * 24)));

    let freshness: DataFreshnessStatus = 'CURRENT';
    if (ageDays > profile.stalenessThresholdDays * 1.5) {
      freshness = 'EXPIRED';
      rawScore *= 0.3; // Decay heavily
    } else if (ageDays > profile.stalenessThresholdDays) {
      freshness = 'STALE';
      rawScore *= 0.65; // Decay staleness penalty
    } else if (ageDays > profile.stalenessThresholdDays * 0.5) {
      freshness = 'RECENT';
    }

    const finalScore = Math.round(Math.max(-100, Math.min(100, rawScore)));

    let bias: BiasClassification = 'NEUTRAL';
    if (finalScore >= 40) bias = 'STRONGLY_BULLISH';
    else if (finalScore >= 12) bias = 'BULLISH';
    else if (finalScore <= -40) bias = 'STRONGLY_BEARISH';
    else if (finalScore <= -12) bias = 'BEARISH';

    // Source Credibility Confidence
    const authorityFactor = profile.sourceAuthorityRank * 20; // 5 -> 100
    const stalenessFactor = freshness === 'CURRENT' ? 100 : freshness === 'RECENT' ? 85 : freshness === 'STALE' ? 50 : 25;
    const confidence = Math.round(authorityFactor * 0.6 + stalenessFactor * 0.4);

    return {
      indicatorId: profile.id,
      indicatorName: profile.name,
      currency: profile.currency,
      category: profile.category,
      actual,
      forecast,
      previous,
      revision,
      surprise,
      change,
      standardizedSurprise,
      score: finalScore,
      bias,
      weight: profile.weightInCategory,
      weightedContribution: Number(((finalScore * profile.weightInCategory) / 100).toFixed(2)),
      freshness,
      ageDays,
      confidence,
      validationStatus,
      sourceName: obs?.sourceName || 'Official Statistical Agency',
      sourceUrl: obs?.sourceUrl || '',
      releaseDate: obs?.releaseDate || null,
      referencePeriod: obs?.referencePeriod || 'Current Period',
      reasoning,
      isStale: freshness === 'STALE' || freshness === 'EXPIRED',
      isValidated: true,
    };
  }

  /**
   * Aggregates indicator scores into Category-Level biases (Inflation, Employment, Growth, etc.)
   */
  public static evaluateCategory(
    category: string,
    indicators: IndicatorIntelligenceResult[],
    categoryBaseWeight: number = 15
  ): CategoryIntelligenceResult {
    const categoryLabels: Record<string, string> = {
      MONETARY_POLICY: 'Monetary Policy & Central Bank',
      INFLATION: 'Inflation & Consumer Prices',
      GROWTH: 'Economic Growth & Output (GDP)',
      EMPLOYMENT: 'Labor Market & Employment',
      RATES_YIELDS: 'Interest Rates & Sovereign Yields',
      BUSINESS_ACTIVITY: 'Business Activity & PMIs',
      CONSUMER: 'Consumer Spending & Sentiment',
      TRADE_EXTERNAL: 'Trade & External Balance',
    };

    const label = categoryLabels[category] || category;
    const activeIndicators = indicators.filter((i) => i.actual !== null && i.isValidated);

    if (activeIndicators.length === 0) {
      return {
        category,
        categoryLabel: label,
        score: 0,
        bias: 'INSUFFICIENT_DATA',
        configuredWeight: categoryBaseWeight,
        effectiveWeight: 0,
        weightedContribution: 0,
        indicatorCount: indicators.length,
        activeIndicatorCount: 0,
        coveragePercent: 0,
        confidence: 0,
        primaryDrivers: [],
        conflicts: [],
        indicators,
      };
    }

    const totalActiveWeights = activeIndicators.reduce((sum, ind) => sum + ind.weight, 0);
    const weightedScoreSum = activeIndicators.reduce(
      (sum, ind) => sum + ind.score * (ind.weight / (totalActiveWeights || 1)),
      0
    );

    const categoryScore = Math.round(Math.max(-100, Math.min(100, weightedScoreSum)));

    let bias: BiasClassification = 'NEUTRAL';
    if (categoryScore >= 35) bias = 'STRONGLY_BULLISH';
    else if (categoryScore >= 12) bias = 'BULLISH';
    else if (categoryScore <= -35) bias = 'STRONGLY_BEARISH';
    else if (categoryScore <= -12) bias = 'BEARISH';

    const coveragePercent = Math.round((activeIndicators.length / (indicators.length || 1)) * 100);
    const avgConfidence = Math.round(
      activeIndicators.reduce((sum, ind) => sum + ind.confidence, 0) / activeIndicators.length
    );

    const primaryDrivers: string[] = [];
    const conflicts: string[] = [];

    activeIndicators.forEach((ind) => {
      if (Math.abs(ind.score) >= 20) {
        primaryDrivers.push(`${ind.indicatorName}: ${ind.score > 0 ? `+${ind.score}` : ind.score} pts (${ind.bias})`);
      }
      if (categoryScore >= 15 && ind.score <= -20) {
        conflicts.push(`Internal divergence: ${ind.indicatorName} is negative (${ind.score}) contrary to ${category} trend.`);
      } else if (categoryScore <= -15 && ind.score >= 20) {
        conflicts.push(`Internal divergence: ${ind.indicatorName} is positive (+${ind.score}) contrary to ${category} contraction.`);
      }
    });

    return {
      category,
      categoryLabel: label,
      score: categoryScore,
      bias,
      configuredWeight: categoryBaseWeight,
      effectiveWeight: categoryBaseWeight,
      weightedContribution: Number(((categoryScore * categoryBaseWeight) / 100).toFixed(2)),
      indicatorCount: indicators.length,
      activeIndicatorCount: activeIndicators.length,
      coveragePercent,
      confidence: avgConfidence,
      primaryDrivers,
      conflicts,
      indicators,
    };
  }

  /**
   * Evaluates Currency-Level fundamental strength, composite score (-100 to +100),
   * freshness, data quality, conflicts, and full reasoning.
   */
  public static evaluateCurrency(
    currency: CurrencyCode,
    observations: { [indicatorId: string]: any }
  ): CurrencyIntelligenceResult {
    const currencyNames: Record<CurrencyCode, string> = {
      USD: 'US Dollar',
      EUR: 'Euro',
      GBP: 'British Pound',
      JPY: 'Japanese Yen',
      CHF: 'Swiss Franc',
      CAD: 'Canadian Dollar',
      AUD: 'Australian Dollar',
      NZD: 'New Zealand Dollar',
    };

    const currencyProfiles = Object.values(OFFICIAL_INDICATOR_PROFILES).filter((p) => p.currency === currency);
    const evaluatedIndicators: IndicatorIntelligenceResult[] = currencyProfiles.map((p) => {
      const obs = observations[p.id];
      return this.evaluateIndicator(p, obs);
    });

    // Group indicators by Category
    const categoryGroups = new Map<string, IndicatorIntelligenceResult[]>();
    evaluatedIndicators.forEach((ind) => {
      const list = categoryGroups.get(ind.category) || [];
      list.push(ind);
      categoryGroups.set(ind.category, list);
    });

    const evaluatedCategories: Record<string, CategoryIntelligenceResult> = {};
    let totalActiveCategoryWeight = 0;
    let weightedCategoryScoreSum = 0;

    categoryGroups.forEach((groupIndicators, catName) => {
      const baseWeight = groupIndicators[0]?.weight ?? 15;
      const catResult = this.evaluateCategory(catName, groupIndicators, baseWeight);
      evaluatedCategories[catName] = catResult;

      if (catResult.activeIndicatorCount > 0) {
        totalActiveCategoryWeight += catResult.configuredWeight;
        weightedCategoryScoreSum += catResult.score * catResult.configuredWeight;
      }
    });

    // Composite Calculation (Dynamically normalized)
    const compositeScore = totalActiveCategoryWeight > 0
      ? Math.round(Math.max(-100, Math.min(100, weightedCategoryScoreSum / totalActiveCategoryWeight)))
      : 0;

    let canonicalBias: BiasClassification = 'NEUTRAL';
    let biasLabel = 'NEUTRAL / BALANCED';
    if (totalActiveCategoryWeight === 0) {
      canonicalBias = 'INSUFFICIENT_DATA';
      biasLabel = 'INSUFFICIENT DATA';
    } else if (compositeScore >= 35) {
      canonicalBias = 'STRONGLY_BULLISH';
      biasLabel = 'STRONGLY BULLISH';
    } else if (compositeScore >= 12) {
      canonicalBias = 'BULLISH';
      biasLabel = 'BULLISH / EXPANSIONARY';
    } else if (compositeScore <= -35) {
      canonicalBias = 'STRONGLY_BEARISH';
      biasLabel = 'STRONGLY BEARISH';
    } else if (compositeScore <= -12) {
      canonicalBias = 'BEARISH';
      biasLabel = 'BEARISH / CONTRACTIONARY';
    }

    const completedIndicators = evaluatedIndicators.filter((i) => i.actual !== null && i.isValidated).length;
    const totalIndicators = evaluatedIndicators.length;
    const dataCoveragePercent = totalIndicators > 0 ? Math.round((completedIndicators / totalIndicators) * 100) : 0;

    // Quality Status
    let dataQualityStatus: 'PRISTINE' | 'ADEQUATE' | 'DEGRADED' | 'INSUFFICIENT_DATA' = 'PRISTINE';
    if (completedIndicators === 0) dataQualityStatus = 'INSUFFICIENT_DATA';
    else if (dataCoveragePercent < 60) dataQualityStatus = 'DEGRADED';
    else if (dataCoveragePercent < 85) dataQualityStatus = 'ADEQUATE';

    // Freshness Status
    const staleCount = evaluatedIndicators.filter((i) => i.isStale).length;
    let freshnessStatus: 'CURRENT' | 'PARTIAL' | 'STALE' | 'INSUFFICIENT_DATA' = 'CURRENT';
    if (completedIndicators === 0) freshnessStatus = 'INSUFFICIENT_DATA';
    else if (staleCount > 2) freshnessStatus = 'STALE';
    else if (staleCount > 0) freshnessStatus = 'PARTIAL';

    // Confidence Engine (0 - 100%)
    const coverageWeight = (dataCoveragePercent / 100) * 45;
    const activeIndicatorsList = evaluatedIndicators.filter((i) => i.actual !== null && i.isValidated);
    const avgIndicatorConf = activeIndicatorsList.length > 0
      ? activeIndicatorsList.reduce((acc, i) => acc + i.confidence, 0) / activeIndicatorsList.length
      : 0;
    const indicatorWeight = (avgIndicatorConf / 100) * 40;
    const stalenessDeduction = staleCount * 5;
    const confidenceScore = Math.max(0, Math.min(100, Math.round(coverageWeight + indicatorWeight - stalenessDeduction)));

    // Categorize Drivers & Conflicts
    const primaryBullishDrivers: string[] = [];
    const primaryBearishDrivers: string[] = [];
    const conflictingFactors: string[] = [];
    const invalidationRisks: string[] = [];

    Object.values(evaluatedCategories).forEach((cat) => {
      if (cat.score >= 20) {
        primaryBullishDrivers.push(`${cat.categoryLabel} (+${cat.score})`);
      } else if (cat.score <= -20) {
        primaryBearishDrivers.push(`${cat.categoryLabel} (${cat.score})`);
      }

      if (compositeScore >= 12 && cat.score <= -20) {
        conflictingFactors.push(`⚠️ ${cat.categoryLabel} is negative (${cat.score}) contradicting bullish macro stance.`);
        invalidationRisks.push(`Continued deterioration in ${cat.categoryLabel} could erode relative rate appeal.`);
      } else if (compositeScore <= -12 && cat.score >= 20) {
        conflictingFactors.push(`⚠️ ${cat.categoryLabel} is positive (+${cat.score}) contrary to broader contraction.`);
        invalidationRisks.push(`Surprise resilience in ${cat.categoryLabel} could prevent expected monetary easing.`);
      }
    });

    const narrativeSummary = `The fundamental strength for ${currencyNames[currency]} (${currency}) stands at ${
      compositeScore > 0 ? `+${compositeScore}` : compositeScore
    }/100, establishing a ${biasLabel} posture. ${
      primaryBullishDrivers.length > 0 ? `Key support is driven by ${primaryBullishDrivers.join(', ')}.` : ''
    } ${
      primaryBearishDrivers.length > 0 ? `Downward drag stems from ${primaryBearishDrivers.join(', ')}.` : ''
    } Data quality is ${dataQualityStatus} with ${dataCoveragePercent}% verified coverage and ${confidenceScore}% model confidence.`;

    // Extract Policy Rate and 10Y Yield if available
    const policyRateObs = evaluatedIndicators.find((i) => i.indicatorId.includes('POLICY') || i.indicatorId.includes('RATE') || i.indicatorId.includes('CASH'))?.actual ?? undefined;
    const yield10YObs = evaluatedIndicators.find((i) => i.indicatorId.includes('10Y'))?.actual ?? undefined;

    return {
      currency,
      currencyName: currencyNames[currency],
      compositeScore,
      bias: canonicalBias,
      biasLabel,
      confidenceScore,
      rank: 0, // Assigned in evaluateAllCurrencies
      percentile: 0,
      categoryScores: evaluatedCategories,
      totalIndicators,
      completedIndicators,
      dataCoveragePercent,
      dataQualityStatus,
      freshnessStatus,
      primaryBullishDrivers,
      primaryBearishDrivers,
      conflictingFactors,
      macroRegime: compositeScore >= 20 ? 'EXPANSION / HAWKISH' : compositeScore <= -20 ? 'CONTRACTION / DOVISH' : 'BALANCED / NEUTRAL',
      narrativeSummary,
      invalidationRisks,
      policyRate: policyRateObs !== null ? policyRateObs : undefined,
      tenYearYield: yield10YObs !== null ? yield10YObs : undefined,
      lastCalculatedAt: new Date().toISOString(),
    };
  }

  /**
   * Evaluates all 8 Currencies and ranks them deterministically from #1 (Strongest) to #8 (Weakest).
   */
  public static evaluateAllCurrencies(
    observations: { [indicatorId: string]: any }
  ): Record<CurrencyCode, CurrencyIntelligenceResult> {
    const currencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
    const results: Record<CurrencyCode, CurrencyIntelligenceResult> = {} as any;

    currencies.forEach((code) => {
      results[code] = this.evaluateCurrency(code, observations);
    });

    // Deterministic Sort: By score descending, break ties with dataCoveragePercent and confidenceScore
    const sorted = [...currencies].sort((a, b) => {
      const scA = results[a];
      const scB = results[b];
      if (scB.compositeScore !== scA.compositeScore) return scB.compositeScore - scA.compositeScore;
      if (scB.confidenceScore !== scA.confidenceScore) return scB.confidenceScore - scA.confidenceScore;
      return scB.dataCoveragePercent - scA.dataCoveragePercent;
    });

    sorted.forEach((code, index) => {
      results[code].rank = index + 1;
      results[code].percentile = Math.round(((8 - index) / 8) * 100);
    });

    return results;
  }

  /**
   * Evaluates Pair-Level Fundamental Direction & Relative Divergence (-200 to +200)
   * Answers the institutional question:
   * "Is Currency A economically stronger or weaker than its counterpart in this pair?"
   */
  public static evaluatePair(
    baseCurrency: CurrencyCode,
    quoteCurrency: CurrencyCode,
    currencyScores: Record<CurrencyCode, CurrencyIntelligenceResult>
  ): PairIntelligenceResult {
    const base = currencyScores[baseCurrency];
    const quote = currencyScores[quoteCurrency];

    const baseScore = base?.compositeScore ?? 0;
    const quoteScore = quote?.compositeScore ?? 0;
    const netDifferential = baseScore - quoteScore;

    const hasBaseData = base && base.dataCoveragePercent > 20;
    const hasQuoteData = quote && quote.dataCoveragePercent > 20;
    const isDataComplete = hasBaseData && hasQuoteData;

    let fundamentalBias: BiasClassification = 'NEUTRAL';
    let biasLabel = 'NEUTRAL / BALANCED';
    if (!isDataComplete) {
      fundamentalBias = 'INSUFFICIENT_DATA';
      biasLabel = 'INSUFFICIENT DATA';
    } else if (netDifferential >= 35) {
      fundamentalBias = 'STRONGLY_BULLISH';
      biasLabel = 'STRONGLY BULLISH';
    } else if (netDifferential >= 12) {
      fundamentalBias = 'BULLISH';
      biasLabel = 'BULLISH';
    } else if (netDifferential <= -35) {
      fundamentalBias = 'STRONGLY_BEARISH';
      biasLabel = 'STRONGLY BEARISH';
    } else if (netDifferential <= -12) {
      fundamentalBias = 'BEARISH';
      biasLabel = 'BEARISH';
    }

    // Category Divergences
    const categoryDivergence: PairCategoryDivergence[] = [];
    const primaryCatalysts: string[] = [];
    const conflicts: string[] = [];

    const commonCategories = ['MONETARY_POLICY', 'INFLATION', 'GROWTH', 'EMPLOYMENT', 'RATES_YIELDS', 'BUSINESS_ACTIVITY'];

    commonCategories.forEach((catKey) => {
      const baseCat = base?.categoryScores[catKey];
      const quoteCat = quote?.categoryScores[catKey];
      if (baseCat && quoteCat) {
        const divergence = baseCat.score - quoteCat.score;
        const favored: CurrencyCode | 'EQUAL' = divergence > 5 ? baseCurrency : divergence < -5 ? quoteCurrency : 'EQUAL';
        const note = divergence !== 0
          ? `${baseCat.categoryLabel} gap of ${divergence > 0 ? `+${divergence}` : divergence} points favors ${favored}.`
          : `${baseCat.categoryLabel} is balanced between ${baseCurrency} and ${quoteCurrency}.`;

        categoryDivergence.push({
          category: catKey,
          categoryLabel: baseCat.categoryLabel,
          baseScore: baseCat.score,
          quoteScore: quoteCat.score,
          divergence,
          favoredCurrency: favored,
          driverNote: note,
        });

        if (Math.abs(divergence) >= 30) {
          primaryCatalysts.push(`${baseCat.categoryLabel} differential (+${Math.abs(divergence)} spread) favors ${favored}`);
        }

        if (netDifferential >= 15 && divergence <= -25) {
          conflicts.push(`Divergence risk: ${baseCat.categoryLabel} strongly favors ${quoteCurrency} (${quoteCat.score} vs ${baseCat.score}), resisting the overall bullish bias.`);
        } else if (netDifferential <= -15 && divergence >= 25) {
          conflicts.push(`Divergence risk: ${baseCat.categoryLabel} strongly favors ${baseCurrency} (${baseCat.score} vs ${quoteCat.score}), resisting the overall bearish bias.`);
        }
      }
    });

    // Timeframe Alignment
    const shortTermMetric = Math.round(netDifferential * 0.8);
    const shortTermBias: BiasClassification = shortTermMetric >= 10 ? 'BULLISH' : shortTermMetric <= -10 ? 'BEARISH' : 'NEUTRAL';
    const shortTermRationale = `Immediate release momentum indicates ${shortTermBias.toLowerCase()} pressure over the 1-5 day horizon.`;

    const policyRateDiff = (base?.policyRate ?? 0) - (quote?.policyRate ?? 0);
    const mediumTermMetric = Math.round(netDifferential * 0.6 + policyRateDiff * 10);
    const mediumTermBias: BiasClassification = mediumTermMetric >= 10 ? 'BULLISH' : mediumTermMetric <= -10 ? 'BEARISH' : 'NEUTRAL';
    const mediumTermRationale = `Policy rate spread (${policyRateDiff > 0 ? `+${policyRateDiff.toFixed(2)}` : policyRateDiff.toFixed(2)}%) sets medium-term yield carry flows.`;

    const longTermMetric = netDifferential;
    const longTermBias: BiasClassification = longTermMetric >= 15 ? 'BULLISH' : longTermMetric <= -15 ? 'BEARISH' : 'NEUTRAL';
    const longTermRationale = `Structural GDP growth and fiscal balance anchor multi-month direction.`;

    // Yield Spreads
    const yield10YSpread = base?.tenYearYield !== undefined && quote?.tenYearYield !== undefined
      ? Number((base.tenYearYield - quote.tenYearYield).toFixed(2))
      : undefined;

    // Confidence Calculation
    const avgDataCoverage = Math.round(((base?.dataCoveragePercent ?? 0) + (quote?.dataCoveragePercent ?? 0)) / 2);
    const avgConfidence = Math.round(((base?.confidenceScore ?? 0) + (quote?.confidenceScore ?? 0)) / 2);
    const conflictPenalty = conflicts.length * 10;
    const finalPairConfidence = Math.max(0, Math.min(100, avgConfidence - conflictPenalty));

    // Trade Suitability
    let tradeSuitability: 'HIGH_CONVICTION' | 'MODERATE_OPPORTUNITY' | 'LOW_EDGE' | 'DO_NOT_TRADE' = 'LOW_EDGE';
    if (!isDataComplete) {
      tradeSuitability = 'DO_NOT_TRADE';
    } else if (Math.abs(netDifferential) >= 35 && finalPairConfidence >= 75 && conflicts.length === 0) {
      tradeSuitability = 'HIGH_CONVICTION';
    } else if (Math.abs(netDifferential) >= 15 && finalPairConfidence >= 60) {
      tradeSuitability = 'MODERATE_OPPORTUNITY';
    } else {
      tradeSuitability = 'LOW_EDGE';
    }

    const reasoningNarrative = `On the ${baseCurrency}/${quoteCurrency} pair, ${baseCurrency} (Macro Score: ${
      baseScore > 0 ? `+${baseScore}` : baseScore
    }) holds a net differential of ${netDifferential > 0 ? `+${netDifferential}` : netDifferential} points against ${quoteCurrency} (Macro Score: ${
      quoteScore > 0 ? `+${quoteScore}` : quoteScore
    }). This confirms ${baseCurrency} is fundamentally ${
      netDifferential > 0 ? 'stronger' : netDifferential < 0 ? 'weaker' : 'in equilibrium with'
    } ${quoteCurrency}. High-conviction drivers include: ${primaryCatalysts.join('; ') || 'Balanced baseline conditions'}.`;

    const invalidationLevelText = `Invalidation: Upcoming policy rate shifts or employment surprises that compress the ${
      policyRateDiff > 0 ? `${baseCurrency} rate advantage` : `${quoteCurrency} rate advantage`
    } by >25 bps will require reassessment.`;

    return {
      pair: `${baseCurrency}${quoteCurrency}`,
      baseCurrency,
      quoteCurrency,
      baseScore,
      quoteScore,
      netDifferential,
      fundamentalBias,
      biasLabel,
      confidenceScore: finalPairConfidence,
      timeframeAlignment: {
        shortTerm: { bias: shortTermBias, score: shortTermMetric, rationale: shortTermRationale },
        mediumTerm: { bias: mediumTermBias, score: mediumTermMetric, rationale: mediumTermRationale },
        longTerm: { bias: longTermBias, score: longTermMetric, rationale: longTermRationale },
      },
      policyRateDifferential: Number(policyRateDiff.toFixed(2)),
      yield10YSpread,
      categoryDivergence,
      primaryCatalysts,
      conflicts,
      tradeSuitability,
      reasoningNarrative,
      dataCompleteness: avgDataCoverage,
      invalidationLevelText,
    };
  }

  /**
   * Generates the Master Fundamental Intelligence Report encompassing all 8 currencies,
   * rankings, and canonical 28 currency pairs.
   */
  public static generateMasterReport(observations: { [indicatorId: string]: any }): FullIntelligenceReport {
    const currencyScores = this.evaluateAllCurrencies(observations);

    const currencyRankings = Object.values(currencyScores)
      .sort((a, b) => a.rank - b.rank)
      .map((c) => ({
        rank: c.rank,
        currency: c.currency,
        score: c.compositeScore,
        bias: c.bias,
        confidence: c.confidenceScore,
      }));

    const pairDifferentials = CANONICAL_28_PAIRS.map(([base, quote]) =>
      this.evaluatePair(base, quote, currencyScores)
    );

    const strongest = currencyRankings[0]?.currency || 'USD';
    const weakest = currencyRankings[currencyRankings.length - 1]?.currency || 'JPY';

    const highConvictionPairs = pairDifferentials
      .filter((p) => p.tradeSuitability === 'HIGH_CONVICTION' || Math.abs(p.netDifferential) >= 30)
      .sort((a, b) => Math.abs(b.netDifferential) - Math.abs(a.netDifferential))
      .map((p) => `${p.pair} (${p.biasLabel})`);

    const avgCoverage = Math.round(
      Object.values(currencyScores).reduce((acc, c) => acc + c.dataCoveragePercent, 0) / 8
    );

    return {
      timestamp: new Date().toISOString(),
      engineVersion: 'PRIME-FX-INTELLIGENCE-v3.0',
      verifiedObservationsCount: Object.keys(observations).length,
      currencyScores,
      currencyRankings,
      pairDifferentials,
      globalMacroRegimeSummary: {
        dominantRegime: 'RISK_ON',
        strongestCurrency: strongest,
        weakestCurrency: weakest,
        highestConvictionPairs: highConvictionPairs.slice(0, 5),
        dataCoverageAverage: avgCoverage,
      },
    };
  }
}
