import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SupabaseClient } from '@supabase/supabase-js';
import { Horizon, IndicatorFrequency, CurrencyCode } from '../shared/types.js';
import { logger } from '../shared/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  pillarId?: string;
  weightInPillar?: number;
  shortTransform: TransformSpec;
  longTransform: TransformSpec;
  defaultPolarity: 'higher_bullish' | 'higher_bearish' | 'contrarian_extreme' | 'neutral_context';
  isDerived?: boolean;
  derivedFormula?: 'us_2y_minus_fedfunds' | 'yield_curve_slope' | 'real_yield' | 'cftc_net_spec_pct_oi';
  constituentCodes?: string[];
  normalizationWindowYears?: number;
  isRiskIndicator?: boolean;
  riskAssetType?: 'volatility' | 'credit_spread' | 'stress_index' | 'equity_index';
}

export interface FreshnessTolerance {
  freshDays: number;
  staleDays: number; // beyond staleDays is very_stale (factor 0.0, excluded)
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
 * Currency Risk-Sentiment Sensitivity Factors (risk_sign):
 *
 * Starting values (judgement assumptions):
 * - Safe Havens / Funding Currencies:
 *   * USD: +1.0 (US Dollar benefits from safe-haven flows during global stress)
 *   * JPY: +1.0 (Japanese Yen acts as premier global safe-haven / carry trade unwind currency)
 *   * CHF: +1.0 (Swiss Franc safe-haven destination)
 * - Pro-cyclical & High Beta Currencies:
 *   * EUR: -0.3 (Euro mildly pro-cyclical)
 *   * GBP: -0.5 (British Pound moderately pro-cyclical)
 *   * CAD: -0.6 (Canadian Dollar commodity-linked pro-cyclical)
 *   * AUD: -1.0 (Australian Dollar high-beta global growth proxy)
 *   * NZD: -1.0 (New Zealand Dollar high-beta commodity proxy)
 *
 * Directional rules:
 * - Rising VIX, widening credit spreads, and tightening financial conditions represent RISK-OFF:
 *   They are BULLISH for currencies with positive risk_sign (USD, JPY, CHF)
 *   and BEARISH for currencies with negative risk_sign (AUD, NZD, CAD, GBP, EUR).
 * - A rising equity index (e.g. S&P 500) represents RISK-ON:
 *   We apply the NEGATIVE of risk_sign for equity direction (-1.0 * risk_sign).
 *   Rising equities are BULLISH for AUD/NZD and BEARISH for USD/JPY/CHF safe-haven demand.
 */
export const CURRENCY_RISK_SIGN: Record<CurrencyCode, number> = {
  USD: 1.0,
  JPY: 1.0,
  CHF: 1.0,
  EUR: -0.3,
  GBP: -0.5,
  CAD: -0.6,
  AUD: -1.0,
  NZD: -1.0,
};

/**
 * Confidence Score Calculation Coefficients (linear combination of 4 factors).
 * Weights sum to 1.0 (scaled to 100).
 */
export const CONFIDENCE_COEFFICIENTS = {
  dataCompleteness: 0.35,
  freshness: 0.25,
  pillarAgreement: 0.25,
  regimeStability: 0.15,
};

/**
 * Calibration Scale per Asset (multiplies final raw score before [-100, 100] clamp).
 */
export const CALIBRATION_SCALE_BY_CURRENCY: Record<CurrencyCode, number> = {
  USD: 1.0,
  EUR: 1.0,
  JPY: 1.0,
  GBP: 1.0,
  CHF: 1.0,
  AUD: 1.0,
  CAD: 1.0,
  NZD: 1.0,
};

/**
 * Model Parameters and Hyperparameters.
 * Versioned identifier tags all derived data.
 */
export const SCORING_MODEL_CONFIG = {
  modelVersion: 'v0.1',
  jumpDownweightFactor: 0.5, // Down-weight indicators flagged with suspicious_jump
  maxZScore: 3.0,
  minZScore: -3.0,
  robustZMinObservations: 30, // Fall back to standard z if fewer than 30 observations
  defaultNormalizationWindowYears: 8,
  winsorizeLowerPercentile: 0.01,
  winsorizeUpperPercentile: 0.99,
  contrarianThresholds: {
    lowerNeutralPercentile: 0.20,
    upperNeutralPercentile: 0.80,
  },
  sanityThresholds: {
    minScore: -100.0,
    maxScore: 100.0,
    maxDailyJump: 25.0, // Flag if asset score changes by more than 25 points in a single day
  },
  confidenceWeights: CONFIDENCE_COEFFICIENTS,
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
    pillarId: 'curr_monetary',
    weightInPillar: 0.25,
    shortTransform: { type: 'change_n', n: 20, description: '20-day policy rate change' },
    longTransform: { type: 'level', description: 'Absolute Fed Funds level' },
    defaultPolarity: 'higher_bullish',
  },
  USD_2Y_TREASURY_YIELD: {
    code: 'USD_2Y_TREASURY_YIELD',
    pillarId: 'curr_monetary',
    weightInPillar: 0.25,
    shortTransform: { type: 'change_n', n: 20, description: '1-month 2Y Treasury yield change' },
    longTransform: { type: 'level', description: 'Absolute 2Y Treasury yield level' },
    defaultPolarity: 'higher_bullish',
  },
  USD_10Y_TREASURY_YIELD: {
    code: 'USD_10Y_TREASURY_YIELD',
    pillarId: 'curr_monetary',
    weightInPillar: 0.20,
    shortTransform: { type: 'change_n', n: 20, description: '1-month 10Y Treasury yield change' },
    longTransform: { type: 'level', description: 'Absolute 10Y Treasury yield level' },
    defaultPolarity: 'higher_bullish',
  },
  USD_10Y_TIPS_REAL_YIELD: {
    code: 'USD_10Y_TIPS_REAL_YIELD',
    pillarId: 'curr_monetary',
    weightInPillar: 0.15,
    shortTransform: { type: 'change_n', n: 20, description: '1-month 10Y real TIPS yield change' },
    longTransform: { type: 'level', description: 'Absolute 10Y real yield level' },
    defaultPolarity: 'higher_bullish',
  },
  // Derived Monetary Spreads
  USD_2Y_MINUS_FEDFUNDS: {
    code: 'USD_2Y_MINUS_FEDFUNDS',
    pillarId: 'curr_monetary',
    weightInPillar: 0.15,
    shortTransform: { type: 'level', description: '2Y minus Fed Funds policy lead spread' },
    longTransform: { type: 'avg_n', n: 60, description: '3-month average yield curve lead' },
    defaultPolarity: 'higher_bullish',
    isDerived: true,
    derivedFormula: 'us_2y_minus_fedfunds',
    constituentCodes: ['USD_2Y_TREASURY_YIELD', 'USD_FEDFUNDS'],
  },
  USD_YIELD_CURVE_SLOPE: {
    code: 'USD_YIELD_CURVE_SLOPE',
    pillarId: 'curr_monetary',
    weightInPillar: 0.10,
    shortTransform: { type: 'level', description: '10Y minus 2Y Treasury yield curve slope' },
    longTransform: { type: 'avg_n', n: 60, description: '3-month average yield curve slope' },
    defaultPolarity: 'higher_bullish',
    isDerived: true,
    derivedFormula: 'yield_curve_slope',
    constituentCodes: ['USD_10Y_TREASURY_YIELD', 'USD_2Y_TREASURY_YIELD'],
  },
  USD_REAL_YIELD_DERIVED: {
    code: 'USD_REAL_YIELD_DERIVED',
    pillarId: 'curr_monetary',
    weightInPillar: 0.10,
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
    pillarId: 'curr_inflation',
    weightInPillar: 0.30,
    shortTransform: { type: 'annualized_3m', n: 3, description: '3-month annualized CPI inflation rate' },
    longTransform: { type: 'yoy', n: 12, description: '12-month headline CPI YoY' },
    defaultPolarity: 'higher_bullish',
  },
  USD_CORE_CPI_YOY: {
    code: 'USD_CORE_CPI_YOY',
    pillarId: 'curr_inflation',
    weightInPillar: 0.30,
    shortTransform: { type: 'annualized_3m', n: 3, description: '3-month annualized core CPI' },
    longTransform: { type: 'yoy', n: 12, description: '12-month core CPI YoY' },
    defaultPolarity: 'higher_bullish',
  },
  USD_CORE_PCE_PRICE_INDEX: {
    code: 'USD_CORE_PCE_PRICE_INDEX',
    pillarId: 'curr_inflation',
    weightInPillar: 0.20,
    shortTransform: { type: 'annualized_3m', n: 3, description: '3-month annualized core PCE' },
    longTransform: { type: 'yoy', n: 12, description: '12-month core PCE YoY' },
    defaultPolarity: 'higher_bullish',
  },
  USD_PRODUCER_PRICE_INDEX: {
    code: 'USD_PRODUCER_PRICE_INDEX',
    pillarId: 'curr_inflation',
    weightInPillar: 0.10,
    shortTransform: { type: 'change_n', n: 1, description: 'Monthly PPI pipeline pressure change' },
    longTransform: { type: 'yoy', n: 12, description: '12-month PPI YoY rate' },
    defaultPolarity: 'higher_bullish',
  },
  USD_AVG_HOURLY_EARNINGS: {
    code: 'USD_AVG_HOURLY_EARNINGS',
    pillarId: 'curr_inflation',
    weightInPillar: 0.10,
    shortTransform: { type: 'change_n', n: 3, description: '3-month wage momentum' },
    longTransform: { type: 'yoy', n: 12, description: '12-month wage growth' },
    defaultPolarity: 'higher_bullish',
  },
  USD_5Y5Y_FORWARD_INFLATION: {
    code: 'USD_5Y5Y_FORWARD_INFLATION',
    pillarId: 'curr_inflation',
    weightInPillar: 0.10,
    shortTransform: { type: 'change_n', n: 20, description: '1-month change in inflation expectation' },
    longTransform: { type: 'level', description: '5Y breakeven inflation expectation level' },
    defaultPolarity: 'neutral_context',
  },

  // Growth & Labor
  USD_NONFARM_PAYROLLS: {
    code: 'USD_NONFARM_PAYROLLS',
    pillarId: 'curr_growth_labor',
    weightInPillar: 0.30,
    shortTransform: { type: 'change_n', n: 1, description: 'Monthly net payrolls added (thousands)' },
    longTransform: { type: 'yoy', n: 12, description: '12-month employment growth' },
    defaultPolarity: 'higher_bullish',
  },
  USD_UNEMPLOYMENT_RATE: {
    code: 'USD_UNEMPLOYMENT_RATE',
    pillarId: 'curr_growth_labor',
    weightInPillar: 0.25,
    shortTransform: { type: 'change_n', n: 3, description: '3-month unemployment drift' },
    longTransform: { type: 'level', description: 'Civilian unemployment rate level' },
    defaultPolarity: 'higher_bearish',
  },
  USD_INITIAL_JOBLESS_CLAIMS: {
    code: 'USD_INITIAL_JOBLESS_CLAIMS',
    pillarId: 'curr_growth_labor',
    weightInPillar: 0.15,
    shortTransform: { type: 'avg_n', n: 4, description: '4-week moving average jobless claims' },
    longTransform: { type: 'change_n', n: 13, description: '13-week claims trend' },
    defaultPolarity: 'higher_bearish',
  },
  USD_REAL_GDP_QOQ: {
    code: 'USD_REAL_GDP_QOQ',
    pillarId: 'curr_growth_labor',
    weightInPillar: 0.15,
    shortTransform: { type: 'pct_change_n', n: 1, description: 'Quarterly real GDP expansion pace' },
    longTransform: { type: 'yoy', n: 4, description: 'Annual real GDP growth' },
    defaultPolarity: 'higher_bullish',
  },
  USD_RETAIL_SALES: {
    code: 'USD_RETAIL_SALES',
    pillarId: 'curr_growth_labor',
    weightInPillar: 0.10,
    shortTransform: { type: 'pct_change_n', n: 1, description: 'Monthly retail sales momentum' },
    longTransform: { type: 'yoy', n: 12, description: '12-month consumer spending growth' },
    defaultPolarity: 'higher_bullish',
  },
  USD_CONSUMER_SENTIMENT: {
    code: 'USD_CONSUMER_SENTIMENT',
    pillarId: 'curr_growth_labor',
    weightInPillar: 0.05,
    shortTransform: { type: 'change_n', n: 3, description: '3-month sentiment direction' },
    longTransform: { type: 'level', description: 'Consumer sentiment index level' },
    defaultPolarity: 'higher_bullish',
  },

  // Risk Sentiment
  USD_CBOE_VIX: {
    code: 'USD_CBOE_VIX',
    pillarId: 'curr_risk_sentiment',
    weightInPillar: 0.35,
    shortTransform: { type: 'level', description: 'Instantaneous equity volatility (safe-haven proxy)' },
    longTransform: { type: 'avg_n', n: 60, description: '3-month volatility regime' },
    defaultPolarity: 'higher_bullish',
    isRiskIndicator: true,
    riskAssetType: 'volatility',
  },
  USD_HIGH_YIELD_CREDIT_SPREAD: {
    code: 'USD_HIGH_YIELD_CREDIT_SPREAD',
    pillarId: 'curr_risk_sentiment',
    weightInPillar: 0.35,
    shortTransform: { type: 'change_n', n: 20, description: '1-month high yield spread widening/tightening' },
    longTransform: { type: 'level', description: 'High yield credit risk premium level' },
    defaultPolarity: 'higher_bullish',
    isRiskIndicator: true,
    riskAssetType: 'credit_spread',
  },
  USD_FINANCIAL_CONDITIONS_INDEX: {
    code: 'USD_FINANCIAL_CONDITIONS_INDEX',
    pillarId: 'curr_risk_sentiment',
    weightInPillar: 0.15,
    shortTransform: { type: 'level', description: 'Financial conditions tightness index' },
    longTransform: { type: 'avg_n', n: 12, description: '12-week financial stress condition' },
    defaultPolarity: 'higher_bearish',
    isRiskIndicator: true,
    riskAssetType: 'stress_index',
  },
  USD_SP500_LEVEL: {
    code: 'USD_SP500_LEVEL',
    pillarId: 'curr_risk_sentiment',
    weightInPillar: 0.15,
    shortTransform: { type: 'return_n', n: 20, description: '1-month S&P 500 equity return' },
    longTransform: { type: 'return_n', n: 252, description: '1-year equity return' },
    defaultPolarity: 'neutral_context',
    isRiskIndicator: true,
    riskAssetType: 'equity_index',
  },

  // Positioning (CFTC)
  USD_CFTC_LEV_NET: {
    code: 'USD_CFTC_LEV_NET',
    pillarId: 'curr_positioning',
    weightInPillar: 0.50,
    shortTransform: { type: 'level', description: 'Net speculative contracts' },
    longTransform: { type: 'avg_n', n: 12, description: '12-week average net position' },
    defaultPolarity: 'contrarian_extreme',
  },
  USD_CFTC_LEV_NET_PCT_OI: {
    code: 'USD_CFTC_LEV_NET_PCT_OI',
    pillarId: 'curr_positioning',
    weightInPillar: 0.30,
    shortTransform: { type: 'level', description: 'Leveraged net positioning as % of open interest' },
    longTransform: { type: 'avg_n', n: 12, description: '12-week average net % OI' },
    defaultPolarity: 'contrarian_extreme',
    isDerived: true,
    derivedFormula: 'cftc_net_spec_pct_oi',
    constituentCodes: ['USD_CFTC_LEV_NET', 'USD_CFTC_OPEN_INTEREST'],
  },
  USD_CFTC_OPEN_INTEREST: {
    code: 'USD_CFTC_OPEN_INTEREST',
    pillarId: 'curr_positioning',
    weightInPillar: 0.20,
    shortTransform: { type: 'change_n', n: 4, description: '4-week open interest expansion' },
    longTransform: { type: 'level', description: 'Total market open interest level' },
    defaultPolarity: 'neutral_context',
  },

  // Structural & Flows
  USD_TRADE_BALANCE: {
    code: 'USD_TRADE_BALANCE',
    pillarId: 'curr_structural_flows',
    weightInPillar: 0.40,
    shortTransform: { type: 'change_n', n: 3, description: '3-month trade balance deficit change' },
    longTransform: { type: 'avg_n', n: 12, description: '12-month trade deficit average' },
    defaultPolarity: 'higher_bullish',
  },
  USD_CURRENT_ACCOUNT: {
    code: 'USD_CURRENT_ACCOUNT',
    pillarId: 'curr_structural_flows',
    weightInPillar: 0.30,
    shortTransform: { type: 'change_n', n: 1, description: 'Quarterly current account change' },
    longTransform: { type: 'level', description: 'Current account balance level' },
    defaultPolarity: 'higher_bullish',
  },
  USD_FEDERAL_DEBT_TO_GDP: {
    code: 'USD_FEDERAL_DEBT_TO_GDP',
    pillarId: 'curr_structural_flows',
    weightInPillar: 0.30,
    shortTransform: { type: 'change_n', n: 2, description: '2-quarter debt-to-GDP trajectory' },
    longTransform: { type: 'level', description: 'Federal debt % of GDP level' },
    defaultPolarity: 'higher_bearish',
  },

  // Price Confirmation
  USD_INDEX_TREND: {
    code: 'USD_INDEX_TREND',
    pillarId: 'curr_technical_momentum',
    weightInPillar: 1.0,
    shortTransform: { type: 'ma_distance', n: 50, description: 'Distance from 50-day moving average' },
    longTransform: { type: 'ma_distance', n: 200, description: 'Distance from 200-day moving average' },
    defaultPolarity: 'higher_bullish',
  },
};

// Add positioning configs for the other 7 currencies dynamically
const OTHER_CURRENCIES: CurrencyCode[] = ['EUR', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'];
for (const curr of OTHER_CURRENCIES) {
  INDICATOR_TRANSFORM_REGISTRY[`${curr}_CFTC_LEV_NET`] = {
    code: `${curr}_CFTC_LEV_NET`,
    pillarId: 'curr_positioning',
    weightInPillar: 0.50,
    shortTransform: { type: 'level', description: 'Net speculative contracts' },
    longTransform: { type: 'avg_n', n: 12, description: '12-week average net position' },
    defaultPolarity: 'contrarian_extreme',
  };
  INDICATOR_TRANSFORM_REGISTRY[`${curr}_CFTC_LEV_NET_PCT_OI`] = {
    code: `${curr}_CFTC_LEV_NET_PCT_OI`,
    pillarId: 'curr_positioning',
    weightInPillar: 0.30,
    shortTransform: { type: 'level', description: 'Leveraged net positioning as % of open interest' },
    longTransform: { type: 'avg_n', n: 12, description: '12-week average net % OI' },
    defaultPolarity: 'contrarian_extreme',
    isDerived: true,
    derivedFormula: 'cftc_net_spec_pct_oi',
    constituentCodes: [`${curr}_CFTC_LEV_NET`, `${curr}_CFTC_OPEN_INTEREST`],
  };
  INDICATOR_TRANSFORM_REGISTRY[`${curr}_CFTC_OPEN_INTEREST`] = {
    code: `${curr}_CFTC_OPEN_INTEREST`,
    pillarId: 'curr_positioning',
    weightInPillar: 0.20,
    shortTransform: { type: 'change_n', n: 4, description: '4-week open interest expansion' },
    longTransform: { type: 'level', description: 'Total market open interest level' },
    defaultPolarity: 'neutral_context',
  };
}

/**
 * Computes deterministic SHA-256 hash of a normalized object or JSON string.
 */
export function computeConfigHash(content: object | string): string {
  const str = typeof content === 'string'
    ? content
    : JSON.stringify(content, Object.keys(content as Record<string, any>).sort());
  return crypto.createHash('sha256').update(str.trim()).digest('hex');
}

/**
 * Loads the canonical model JSON configuration from disk and calculates its SHA-256 hash.
 */
export function loadModelJsonConfig(version = 'v0.1'): {
  config: any;
  hash: string;
  filePath: string;
} {
  const candidates = [
    path.resolve(__dirname, `../config/models/model-${version}.json`),
    path.resolve(process.cwd(), `backend/config/models/model-${version}.json`),
    path.resolve(process.cwd(), `config/models/model-${version}.json`),
  ];

  let foundPath: string | null = null;
  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      foundPath = cand;
      break;
    }
  }

  if (!foundPath) {
    // Generate fallback from in-memory configuration
    const fallbackObj = {
      version,
      sanityThresholds: SCORING_MODEL_CONFIG.sanityThresholds,
      riskSignByCurrency: CURRENCY_RISK_SIGN,
      confidenceCoefficients: CONFIDENCE_COEFFICIENTS,
      freshnessTolerances: FREQUENCY_FRESHNESS_CONFIG,
      indicatorConfigs: INDICATOR_TRANSFORM_REGISTRY,
    };
    const fallbackHash = computeConfigHash(fallbackObj);
    return { config: fallbackObj, hash: fallbackHash, filePath: 'in-memory-fallback' };
  }

  const raw = fs.readFileSync(foundPath, 'utf8');
  const parsed = JSON.parse(raw);
  const hash = computeConfigHash(raw);
  return { config: parsed, hash, filePath: foundPath };
}

/**
 * Model version verification in database:
 * Verifies that the active model version row exists in model_versions with matching config_hash.
 * If row exists with NULL config_hash, sets it.
 * If hash mismatch, throws error and refuses to run scoring.
 */
export async function verifyModelVersionInDb(
  db: SupabaseClient,
  version: string = SCORING_MODEL_CONFIG.modelVersion
): Promise<{ version: string; hash: string }> {
  const { config, hash } = loadModelJsonConfig(version);

  // Check database table model_versions
  const { data: rows, error } = await db
    .from('model_versions')
    .select('id, version_label, is_active, config_hash')
    .or(`id.eq.${version},id.eq.v0.1-initial,version_label.eq.${version}`);

  if (error) {
    logger.warn(`[ModelConfig] Could not query model_versions (${error.message}). Continuing with local verification.`);
    return { version, hash };
  }

  const exactRow = rows?.find((r) => r.id === version || r.version_label === version);

  if (!exactRow) {
    // Insert version row
    logger.info(`[ModelConfig] Registering new model version ${version} with hash ${hash.slice(0, 12)}...`);
    await db.from('model_versions').upsert({
      id: version,
      version_label: version,
      description: config.description || 'Canonical quantitative model',
      config_hash: hash,
      configuration: config,
      is_active: true,
    });
    return { version, hash };
  }

  if (exactRow.config_hash && exactRow.config_hash !== hash) {
    const errMsg = `[FATAL] Model configuration hash mismatch for version ${version}! DB hash: ${exactRow.config_hash}, Local hash: ${hash}. Refusing to run scoring engine to preserve audit integrity.`;
    logger.error(errMsg);
    throw new Error(errMsg);
  }

  if (!exactRow.config_hash) {
    // Populate hash
    await db
      .from('model_versions')
      .update({ config_hash: hash, configuration: config })
      .eq('id', exactRow.id);
  }

  return { version, hash };
}
