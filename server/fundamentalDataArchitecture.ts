import { randomUUID } from 'crypto';
import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';

// ============================================================================
// STANDARDIZED VALIDATION & SYNC STATUSES (STEP 1 SPECIFICATION)
// ============================================================================

export type DataValidationStatus =
  | 'VALID'
  | 'STALE'
  | 'MISSING'
  | 'DATA_UNAVAILABLE'
  | 'DATA_CONFLICT'
  | 'VALIDATION_ERROR'
  | 'SOURCE_ERROR'
  | 'PENDING_VALIDATION';

export type VerificationStatus =
  | 'VERIFIED'
  | 'API_RETRIEVED'
  | 'MANUAL'
  | 'CONFLICT_FLAGGED'
  | 'REJECTED';

export type AssetClass =
  | 'FOREX_CURRENCY'
  | 'FOREX_PAIR'
  | 'COMMODITY'
  | 'STOCK'
  | 'INDEX'
  | 'CRYPTO';

export type ImportanceLevel =
  | 'TIER_1_EXTREME'
  | 'TIER_2_HIGH'
  | 'TIER_3_MODERATE'
  | 'TIER_4_LOW';

// ============================================================================
// DATABASE ENTITY INTERFACES
// ============================================================================

export interface DataSourceRecord {
  id: string;
  source_name: string;
  provider: string;
  source_type:
    | 'OFFICIAL_CENTRAL_BANK'
    | 'OFFICIAL_STATISTICAL_AGENCY'
    | 'MARKET_DATA_API'
    | 'REGULATORY_EXCHANGE'
    | 'MANUAL';
  official_url: string;
  api_endpoint: string;
  asset_classes: AssetClass[];
  reliability_level: number; // 1 (lowest) to 5 (official primary source)
  active: boolean;
  requires_api_key: boolean;
  env_key_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AssetRecord {
  id: string;
  symbol: string;
  name: string;
  asset_class: AssetClass;
  base_currency: string | null;
  quote_currency: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EconomicIndicatorRecord {
  id: string;
  indicator_code: string;
  dashboard_indicator_id?: string; // Maps to existing FundamentalIndicators.tsx ID
  indicator_name: string;
  asset_currency: string;
  category:
    | 'MONETARY_POLICY'
    | 'INFLATION'
    | 'GROWTH'
    | 'EMPLOYMENT'
    | 'RATES_YIELDS'
    | 'EXTERNAL_TRADE'
    | 'COMMODITY_DRIVER'
    | 'POSITIONING_RISK'
    | 'CORPORATE_EARNINGS'
    | 'VALUATION'
    | 'ON_CHAIN_FLOWS'
    | 'MARKET_BREADTH';
  frequency: 'REAL_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'EVENT_DRIVEN';
  source_id: string;
  secondary_source_id?: string;
  source_series_id: string;
  bls_series_id?: string;
  expected_unit: string;
  transformation: 'LEVEL' | 'YOY_PCT' | 'MOM_DIFF' | 'MOM_PCT' | 'QOQ_SAAR';
  importance_level: ImportanceLevel;
  base_weight: number;
  direction_rule:
    | 'HIGHER_IS_BULLISH'
    | 'LOWER_IS_BULLISH'
    | 'INFLATION_POLICY_PATH'
    | 'YIELD_DIFFERENTIAL'
    | 'NEUTRAL_CONTEXT';
  min_plausible?: number;
  max_plausible?: number;
  max_staleness_days: number;
  can_automate_free: boolean;
  has_previous_actual: boolean;
  has_consensus_forecast: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IndicatorRegimeWeightRecord {
  id: string;
  indicator_id: string;
  asset_id: string;
  regime_type: 'NORMAL' | 'INFLATION_CRISIS' | 'RECESSION' | 'GLOBAL_RISK_OFF' | 'CARRY_REGIME';
  weight: number;
  updated_at: string;
}

export interface EconomicObservationRecord {
  id: string;
  indicator_id: string;
  indicator_code: string;
  indicator_name: string;
  asset_currency: string;
  observation_period: string;
  previous_value: number | null;
  forecast_value: number | null;
  actual_value: number | null;
  revised_previous_value: number | null;
  surprise_value: number | null;
  surprise_score: number | null;
  unit: string;
  source_id: string;
  source_name: string;
  source_url: string;
  source_timestamp: string | null;
  retrieved_at: string;
  release_timestamp: string | null;
  validation_status: DataValidationStatus;
  verification_status: VerificationStatus;
  entered_by: string | null;
  entered_at: string | null;
  notes: string | null;
  data_quality_score: number;
  raw_payload: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MarketPriceRecord {
  id: string;
  asset_id: string;
  timestamp: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  timeframe: '15M' | '1H' | '4H' | '1D' | '1W';
  source_id: string;
  retrieved_at: string;
  validation_status: DataValidationStatus;
}

export interface DataQualityLogRecord {
  id: string;
  source_id: string;
  endpoint: string;
  request_time: string;
  response_status: number | null;
  validation_result: DataValidationStatus;
  missing_fields: string[];
  stale_data: boolean;
  duplicate_data: boolean;
  conflicting_data: boolean;
  error_message: string | null;
}

export interface SyncLogRecord {
  id: string;
  source_id: string;
  profile_target: string;
  function_name: string;
  started_at: string;
  completed_at: string | null;
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  records_received: number;
  records_inserted: number;
  records_updated: number;
  records_rejected: number;
  error_message: string | null;
}

export interface ScheduleConfigRecord {
  id: string;
  name: string;
  cron_expression: string;
  frequency_label: string;
  target_scope: string;
  edge_function_name: string;
  active: boolean;
  last_run_at: string | null;
}

// ============================================================================
// PROVIDER ADAPTER INTERFACE (STEP 1 REQUIREMENT)
// ============================================================================

export interface NormalizedSeriesPoint {
  period: string;
  value: number | null;
  releaseTimestamp: string | null;
  rawPoint: Record<string, any>;
}

export interface ProviderFetchResult {
  ok: boolean;
  httpStatus: number | null;
  endpoint: string;
  points: NormalizedSeriesPoint[];
  errorMessage?: string;
  rawResponseSample?: Record<string, any>;
}

export interface DataProvider {
  getSourceMetadata(): DataSourceRecord;
  fetchEconomicData(indicator: EconomicIndicatorRecord): Promise<ProviderFetchResult>;
  fetchMarketData(asset: AssetRecord): Promise<MarketPriceRecord | null>;
  validateResponse(result: ProviderFetchResult, indicator: EconomicIndicatorRecord): {
    status: DataValidationStatus;
    qualityScore: number;
    missingFields: string[];
    isStale: boolean;
    errorMessage: string | null;
  };
  normalizeData(
    result: ProviderFetchResult,
    indicator: EconomicIndicatorRecord,
    existingObs?: EconomicObservationRecord
  ): Omit<EconomicObservationRecord, 'id' | 'created_at' | 'updated_at'>;
}

// ============================================================================
// 1. PRE-CONFIGURED OFFICIAL DATA SOURCES REGISTRY
// ============================================================================

const NOW_ISO = '2026-10-05T00:00:00.000Z';

export const PRECONFIGURED_DATA_SOURCES: DataSourceRecord[] = [
  {
    id: 'SRC_FRED',
    source_name: 'Federal Reserve Economic Data (FRED)',
    provider: 'Federal Reserve Bank of St. Louis',
    source_type: 'OFFICIAL_CENTRAL_BANK',
    official_url: 'https://fred.stlouisfed.org',
    api_endpoint: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    asset_classes: ['FOREX_CURRENCY', 'COMMODITY', 'INDEX', 'STOCK'],
    reliability_level: 5,
    active: true,
    requires_api_key: false, // Public CSV graph endpoint works free without key; JSON API uses optional FRED_API_KEY
    env_key_name: 'FRED_API_KEY',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_BLS',
    source_name: 'U.S. Bureau of Labor Statistics (BLS)',
    provider: 'U.S. Department of Labor',
    source_type: 'OFFICIAL_STATISTICAL_AGENCY',
    official_url: 'https://www.bls.gov/developers/',
    api_endpoint: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
    asset_classes: ['FOREX_CURRENCY', 'INDEX'],
    reliability_level: 5,
    active: true,
    requires_api_key: false, // Public API v2 works free without registration; BLS_API_KEY increases daily quota
    env_key_name: 'BLS_API_KEY',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_BEA',
    source_name: 'U.S. Bureau of Economic Analysis (BEA)',
    provider: 'U.S. Department of Commerce',
    source_type: 'OFFICIAL_STATISTICAL_AGENCY',
    official_url: 'https://apps.bea.gov/API/signup/',
    api_endpoint: 'https://apps.bea.gov/api/data',
    asset_classes: ['FOREX_CURRENCY', 'INDEX'],
    reliability_level: 5,
    active: true,
    requires_api_key: false, // Synced via FRED BEA mirror series out-of-the-box or direct BEA_API_KEY
    env_key_name: 'BEA_API_KEY',
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_FED',
    source_name: 'Board of Governors of the Federal Reserve System',
    provider: 'Federal Reserve FOMC',
    source_type: 'OFFICIAL_CENTRAL_BANK',
    official_url: 'https://www.federalreserve.gov/monetarypolicy/fomc.htm',
    api_endpoint: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    asset_classes: ['FOREX_CURRENCY', 'COMMODITY', 'INDEX'],
    reliability_level: 5,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_ECB',
    source_name: 'European Central Bank (ECB Data Portal)',
    provider: 'European Central Bank / Eurostat',
    source_type: 'OFFICIAL_CENTRAL_BANK',
    official_url: 'https://data.ecb.europa.eu',
    api_endpoint: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    asset_classes: ['FOREX_CURRENCY'],
    reliability_level: 5,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_BOE',
    source_name: 'Bank of England & UK ONS',
    provider: 'Bank of England / Office for National Statistics',
    source_type: 'OFFICIAL_CENTRAL_BANK',
    official_url: 'https://www.bankofengland.co.uk/boeapps/database/',
    api_endpoint: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    asset_classes: ['FOREX_CURRENCY'],
    reliability_level: 5,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_BOJ',
    source_name: 'Bank of Japan & Statistics Bureau of Japan',
    provider: 'Bank of Japan / e-Stat',
    source_type: 'OFFICIAL_CENTRAL_BANK',
    official_url: 'https://www.stat-search.boj.or.jp',
    api_endpoint: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    asset_classes: ['FOREX_CURRENCY'],
    reliability_level: 5,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_SNB',
    source_name: 'Swiss National Bank (SNB Data Portal)',
    provider: 'Swiss National Bank / FSO',
    source_type: 'OFFICIAL_CENTRAL_BANK',
    official_url: 'https://data.snb.ch',
    api_endpoint: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    asset_classes: ['FOREX_CURRENCY'],
    reliability_level: 5,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_BOC',
    source_name: 'Bank of Canada (Valet API) & StatCan',
    provider: 'Bank of Canada',
    source_type: 'OFFICIAL_CENTRAL_BANK',
    official_url: 'https://www.bankofcanada.ca/valet/docs',
    api_endpoint: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    asset_classes: ['FOREX_CURRENCY'],
    reliability_level: 5,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_RBA',
    source_name: 'Reserve Bank of Australia & ABS',
    provider: 'Reserve Bank of Australia',
    source_type: 'OFFICIAL_CENTRAL_BANK',
    official_url: 'https://www.rba.gov.au/statistics/',
    api_endpoint: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    asset_classes: ['FOREX_CURRENCY'],
    reliability_level: 5,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_RBNZ',
    source_name: 'Reserve Bank of New Zealand & Stats NZ',
    provider: 'Reserve Bank of New Zealand',
    source_type: 'OFFICIAL_CENTRAL_BANK',
    official_url: 'https://www.rbnz.govt.nz/statistics',
    api_endpoint: 'https://fred.stlouisfed.org/graph/fredgraph.csv',
    asset_classes: ['FOREX_CURRENCY'],
    reliability_level: 5,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_CFTC',
    source_name: 'U.S. Commodity Futures Trading Commission (COT)',
    provider: 'CFTC Public Reporting',
    source_type: 'REGULATORY_EXCHANGE',
    official_url: 'https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm',
    api_endpoint: 'https://publicreporting.cftc.gov/resource/6dca-aqww.json',
    asset_classes: ['FOREX_CURRENCY', 'COMMODITY', 'INDEX', 'CRYPTO'],
    reliability_level: 5,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'SRC_MANUAL',
    source_name: 'Institutional Analyst Verified Manual Entry',
    provider: 'Prime FX Command Center Operator',
    source_type: 'MANUAL',
    official_url: 'internal://manual-verified-entry',
    api_endpoint: '/api/fundamental-architecture/manual-entry',
    asset_classes: ['FOREX_CURRENCY', 'FOREX_PAIR', 'COMMODITY', 'STOCK', 'INDEX', 'CRYPTO'],
    reliability_level: 4,
    active: true,
    requires_api_key: false,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
];

// ============================================================================
// 2. PRE-CONFIGURED ASSETS UNIVERSE REGISTRY
// ============================================================================

export const PRECONFIGURED_ASSETS: AssetRecord[] = [
  // 8 Major Forex Currencies
  { id: 'USD', symbol: 'USD', name: 'United States Dollar', asset_class: 'FOREX_CURRENCY', base_currency: 'USD', quote_currency: null, active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'EUR', symbol: 'EUR', name: 'Eurozone Euro', asset_class: 'FOREX_CURRENCY', base_currency: 'EUR', quote_currency: null, active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'GBP', symbol: 'GBP', name: 'British Pound Sterling', asset_class: 'FOREX_CURRENCY', base_currency: 'GBP', quote_currency: null, active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'JPY', symbol: 'JPY', name: 'Japanese Yen', asset_class: 'FOREX_CURRENCY', base_currency: 'JPY', quote_currency: null, active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'CHF', symbol: 'CHF', name: 'Swiss Franc', asset_class: 'FOREX_CURRENCY', base_currency: 'CHF', quote_currency: null, active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'CAD', symbol: 'CAD', name: 'Canadian Dollar', asset_class: 'FOREX_CURRENCY', base_currency: 'CAD', quote_currency: null, active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'AUD', symbol: 'AUD', name: 'Australian Dollar', asset_class: 'FOREX_CURRENCY', base_currency: 'AUD', quote_currency: null, active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'NZD', symbol: 'NZD', name: 'New Zealand Dollar', asset_class: 'FOREX_CURRENCY', base_currency: 'NZD', quote_currency: null, active: true, created_at: NOW_ISO, updated_at: NOW_ISO },

  // Major Forex Pairs
  { id: 'EURUSD', symbol: 'EUR/USD', name: 'Euro vs US Dollar', asset_class: 'FOREX_PAIR', base_currency: 'EUR', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'GBPUSD', symbol: 'GBP/USD', name: 'British Pound vs US Dollar', asset_class: 'FOREX_PAIR', base_currency: 'GBP', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'USDJPY', symbol: 'USD/JPY', name: 'US Dollar vs Japanese Yen', asset_class: 'FOREX_PAIR', base_currency: 'USD', quote_currency: 'JPY', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'USDCHF', symbol: 'USD/CHF', name: 'US Dollar vs Swiss Franc', asset_class: 'FOREX_PAIR', base_currency: 'USD', quote_currency: 'CHF', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'USDCAD', symbol: 'USD/CAD', name: 'US Dollar vs Canadian Dollar', asset_class: 'FOREX_PAIR', base_currency: 'USD', quote_currency: 'CAD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'AUDUSD', symbol: 'AUD/USD', name: 'Australian Dollar vs US Dollar', asset_class: 'FOREX_PAIR', base_currency: 'AUD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'NZDUSD', symbol: 'NZD/USD', name: 'New Zealand Dollar vs US Dollar', asset_class: 'FOREX_PAIR', base_currency: 'NZD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },

  // 3 Core Commodities
  { id: 'XAUUSD', symbol: 'XAU/USD', name: 'Spot Gold vs US Dollar', asset_class: 'COMMODITY', base_currency: 'XAU', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'XAGUSD', symbol: 'XAG/USD', name: 'Spot Silver vs US Dollar', asset_class: 'COMMODITY', base_currency: 'XAG', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'WTI', symbol: 'WTI', name: 'WTI Crude Oil', asset_class: 'COMMODITY', base_currency: 'WTI', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },

  // 5 Core International Stocks
  { id: 'NVDA', symbol: 'NVDA', name: 'NVIDIA Corporation', asset_class: 'STOCK', base_currency: 'USD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'AAPL', symbol: 'AAPL', name: 'Apple Inc.', asset_class: 'STOCK', base_currency: 'USD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft Corporation', asset_class: 'STOCK', base_currency: 'USD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'AMZN', symbol: 'AMZN', name: 'Amazon.com, Inc.', asset_class: 'STOCK', base_currency: 'USD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet Inc.', asset_class: 'STOCK', base_currency: 'USD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },

  // 3 Major Indices
  { id: 'US30', symbol: 'US30', name: 'Dow Jones Industrial Average', asset_class: 'INDEX', base_currency: 'USD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'NASDAQ100', symbol: 'NASDAQ100', name: 'Nasdaq-100 Index', asset_class: 'INDEX', base_currency: 'USD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'SP500', symbol: 'S&P500', name: 'S&P 500 Index', asset_class: 'INDEX', base_currency: 'USD', quote_currency: 'USD', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },

  // 5 Core Cryptocurrencies
  { id: 'BTC', symbol: 'BTC/USDT', name: 'Bitcoin', asset_class: 'CRYPTO', base_currency: 'BTC', quote_currency: 'USDT', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'ETH', symbol: 'ETH/USDT', name: 'Ethereum', asset_class: 'CRYPTO', base_currency: 'ETH', quote_currency: 'USDT', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'BNB', symbol: 'BNB/USDT', name: 'BNB', asset_class: 'CRYPTO', base_currency: 'BNB', quote_currency: 'USDT', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'SOL', symbol: 'SOL/USDT', name: 'Solana', asset_class: 'CRYPTO', base_currency: 'SOL', quote_currency: 'USDT', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
  { id: 'XRP', symbol: 'XRP/USDT', name: 'XRP', asset_class: 'CRYPTO', base_currency: 'XRP', quote_currency: 'USDT', active: true, created_at: NOW_ISO, updated_at: NOW_ISO },
];

// ============================================================================
// 3. PRIME FX VERIFIED DATA SOURCE MAP (INDICATOR-BY-INDICATOR REGISTRY)
// ============================================================================

export const VERIFIED_DATA_SOURCE_MAP: EconomicIndicatorRecord[] = [
  // --------------------------------------------------------------------------
  // USD CORE PROFILE — TIER 1 & TIER 2 (100-POINT MODEL WEIGHTS)
  // --------------------------------------------------------------------------
  {
    id: 'IND_USD_FED_FUNDS',
    indicator_code: 'USD_FED_FUNDS',
    dashboard_indicator_id: 'USD_POLICY_RATE',
    indicator_name: 'Fed Funds Target Rate (Upper Limit)',
    asset_currency: 'USD',
    category: 'MONETARY_POLICY',
    frequency: 'EVENT_DRIVEN',
    source_id: 'SRC_FED',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'DFEDTARU',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 15.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 0.0,
    max_plausible: 25.0,
    max_staleness_days: 60,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_EFFR',
    indicator_code: 'USD_EFFR_EXPECTATIONS',
    indicator_name: 'Effective Federal Funds Rate / Policy Path Proxy',
    asset_currency: 'USD',
    category: 'MONETARY_POLICY',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'FEDFUNDS',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 15.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 0.0,
    max_plausible: 25.0,
    max_staleness_days: 45,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_CPI_YOY',
    indicator_code: 'USD_CPI_YOY',
    dashboard_indicator_id: 'USD_CPI_YOY',
    indicator_name: 'US CPI Headline YoY',
    asset_currency: 'USD',
    category: 'INFLATION',
    frequency: 'MONTHLY',
    source_id: 'SRC_BLS',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'CPIAUCSL',
    bls_series_id: 'CUUR0000SA0',
    expected_unit: '%',
    transformation: 'YOY_PCT',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 4.0,
    direction_rule: 'INFLATION_POLICY_PATH',
    min_plausible: -5.0,
    max_plausible: 25.0,
    max_staleness_days: 45,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_CORE_CPI_YOY',
    indicator_code: 'USD_CORE_CPI_YOY',
    dashboard_indicator_id: 'USD_CORE_CPI_YOY',
    indicator_name: 'US Core CPI (ex Food & Energy) YoY',
    asset_currency: 'USD',
    category: 'INFLATION',
    frequency: 'MONTHLY',
    source_id: 'SRC_BLS',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'CPILFESL',
    bls_series_id: 'CUUR0000SA0L1E',
    expected_unit: '%',
    transformation: 'YOY_PCT',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 5.0,
    direction_rule: 'INFLATION_POLICY_PATH',
    min_plausible: -5.0,
    max_plausible: 20.0,
    max_staleness_days: 45,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_PCE_YOY',
    indicator_code: 'USD_PCE_YOY',
    indicator_name: 'US Headline PCE Price Index YoY',
    asset_currency: 'USD',
    category: 'INFLATION',
    frequency: 'MONTHLY',
    source_id: 'SRC_BEA',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'PCEPI',
    expected_unit: '%',
    transformation: 'YOY_PCT',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 3.0,
    direction_rule: 'INFLATION_POLICY_PATH',
    min_plausible: -5.0,
    max_plausible: 20.0,
    max_staleness_days: 50,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_CORE_PCE_YOY',
    indicator_code: 'USD_CORE_PCE_YOY',
    dashboard_indicator_id: 'USD_CORE_PCE_YOY',
    indicator_name: 'US Core PCE Price Index YoY (Fed Target)',
    asset_currency: 'USD',
    category: 'INFLATION',
    frequency: 'MONTHLY',
    source_id: 'SRC_BEA',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'PCEPILFE',
    expected_unit: '%',
    transformation: 'YOY_PCT',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 5.0,
    direction_rule: 'INFLATION_POLICY_PATH',
    min_plausible: -5.0,
    max_plausible: 20.0,
    max_staleness_days: 50,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_PPI_YOY',
    indicator_code: 'USD_PPI_YOY',
    dashboard_indicator_id: 'USD_PPI_YOY',
    indicator_name: 'US Producer Price Index (Final Demand) YoY',
    asset_currency: 'USD',
    category: 'INFLATION',
    frequency: 'MONTHLY',
    source_id: 'SRC_BLS',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'PPIFIS',
    bls_series_id: 'WPUFD4',
    expected_unit: '%',
    transformation: 'YOY_PCT',
    importance_level: 'TIER_2_HIGH',
    base_weight: 3.0,
    direction_rule: 'INFLATION_POLICY_PATH',
    min_plausible: -15.0,
    max_plausible: 30.0,
    max_staleness_days: 50,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_NFP',
    indicator_code: 'USD_NFP',
    dashboard_indicator_id: 'USD_NFP',
    indicator_name: 'US Non-Farm Payrolls (MoM Net Change)',
    asset_currency: 'USD',
    category: 'EMPLOYMENT',
    frequency: 'MONTHLY',
    source_id: 'SRC_BLS',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'PAYEMS',
    bls_series_id: 'CES0000000001',
    expected_unit: 'k',
    transformation: 'MOM_DIFF',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 4.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -20000,
    max_plausible: 20000,
    max_staleness_days: 45,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_UNRATE',
    indicator_code: 'USD_UNEMP_RATE',
    dashboard_indicator_id: 'USD_UNEMPLOYMENT',
    indicator_name: 'US Unemployment Rate (U-3)',
    asset_currency: 'USD',
    category: 'EMPLOYMENT',
    frequency: 'MONTHLY',
    source_id: 'SRC_BLS',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'UNRATE',
    bls_series_id: 'LNS14000000',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 2.5,
    direction_rule: 'LOWER_IS_BULLISH',
    min_plausible: 1.0,
    max_plausible: 30.0,
    max_staleness_days: 45,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_AHE_YOY',
    indicator_code: 'USD_AHE_YOY',
    dashboard_indicator_id: 'USD_WAGE_GROWTH',
    indicator_name: 'US Average Hourly Earnings YoY',
    asset_currency: 'USD',
    category: 'EMPLOYMENT',
    frequency: 'MONTHLY',
    source_id: 'SRC_BLS',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'CES0500000003',
    bls_series_id: 'CES0500000003',
    expected_unit: '%',
    transformation: 'YOY_PCT',
    importance_level: 'TIER_2_HIGH',
    base_weight: 2.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -5.0,
    max_plausible: 20.0,
    max_staleness_days: 45,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_INITIAL_CLAIMS',
    indicator_code: 'USD_INITIAL_CLAIMS',
    dashboard_indicator_id: 'USD_JOBLESS_CLAIMS',
    indicator_name: 'US Initial Jobless Claims (Weekly)',
    asset_currency: 'USD',
    category: 'EMPLOYMENT',
    frequency: 'WEEKLY',
    source_id: 'SRC_FRED',
    source_series_id: 'ICSA',
    expected_unit: 'persons',
    transformation: 'LEVEL',
    importance_level: 'TIER_2_HIGH',
    base_weight: 1.5,
    direction_rule: 'LOWER_IS_BULLISH',
    min_plausible: 50000,
    max_plausible: 7000000,
    max_staleness_days: 15,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_GDP_QOQ',
    indicator_code: 'USD_GDP_QOQ',
    dashboard_indicator_id: 'USD_GDP_QOQ',
    indicator_name: 'US Real GDP Growth (QoQ Annualized)',
    asset_currency: 'USD',
    category: 'GROWTH',
    frequency: 'QUARTERLY',
    source_id: 'SRC_BEA',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'A191RL1Q225SBEA',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 6.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -35.0,
    max_plausible: 35.0,
    max_staleness_days: 110,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_RETAIL_SALES',
    indicator_code: 'USD_RETAIL_SALES_YOY',
    dashboard_indicator_id: 'USD_RETAIL_SALES_MOM',
    indicator_name: 'US Advance Retail Sales (MoM %)',
    asset_currency: 'USD',
    category: 'GROWTH',
    frequency: 'MONTHLY',
    source_id: 'SRC_FRED',
    source_series_id: 'RSAFS',
    expected_unit: '%',
    transformation: 'MOM_PCT',
    importance_level: 'TIER_2_HIGH',
    base_weight: 4.5,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -25.0,
    max_plausible: 25.0,
    max_staleness_days: 50,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_INDPRO',
    indicator_code: 'USD_INDPRO_YOY',
    dashboard_indicator_id: 'USD_IND_PROD',
    indicator_name: 'US Industrial Production Index (YoY %)',
    asset_currency: 'USD',
    category: 'GROWTH',
    frequency: 'MONTHLY',
    source_id: 'SRC_FRED',
    source_series_id: 'INDPRO',
    expected_unit: '%',
    transformation: 'YOY_PCT',
    importance_level: 'TIER_2_HIGH',
    base_weight: 4.5,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -25.0,
    max_plausible: 25.0,
    max_staleness_days: 50,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_2Y_YIELD',
    indicator_code: 'USD_US02Y',
    dashboard_indicator_id: 'USD_2Y_YIELD',
    indicator_name: 'US 2-Year Treasury Yield',
    asset_currency: 'USD',
    category: 'RATES_YIELDS',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'DGS2',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 4.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -2.0,
    max_plausible: 20.0,
    max_staleness_days: 10,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_10Y_YIELD',
    indicator_code: 'USD_US10Y',
    dashboard_indicator_id: 'USD_10Y_YIELD',
    indicator_name: 'US 10-Year Treasury Yield',
    asset_currency: 'USD',
    category: 'RATES_YIELDS',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'DGS10',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 3.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -2.0,
    max_plausible: 20.0,
    max_staleness_days: 10,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_REAL_YIELD_10Y',
    indicator_code: 'USD_TIPS_10Y',
    indicator_name: 'US 10-Year Real Yield (TIPS)',
    asset_currency: 'USD',
    category: 'RATES_YIELDS',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'DFII10',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 3.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -5.0,
    max_plausible: 10.0,
    max_staleness_days: 10,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_USD_TRADE_BALANCE',
    indicator_code: 'USD_TRADE_BALANCE',
    dashboard_indicator_id: 'USD_TRADE_BALANCE',
    indicator_name: 'US Trade Balance in Goods & Services',
    asset_currency: 'USD',
    category: 'EXTERNAL_TRADE',
    frequency: 'MONTHLY',
    source_id: 'SRC_BEA',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'BOPGSTB',
    expected_unit: '$M',
    transformation: 'LEVEL',
    importance_level: 'TIER_3_MODERATE',
    base_weight: 5.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -250000,
    max_plausible: 250000,
    max_staleness_days: 65,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },

  // --------------------------------------------------------------------------
  // G8 CENTRAL BANK POLICY RATES & BENCHMARK SERIES (EUR, GBP, JPY, CHF, CAD, AUD, NZD)
  // --------------------------------------------------------------------------
  {
    id: 'IND_EUR_POLICY_RATE',
    indicator_code: 'EUR_ECB_DEPOSIT_RATE',
    dashboard_indicator_id: 'EUR_POLICY_RATE',
    indicator_name: 'ECB Deposit Facility Rate',
    asset_currency: 'EUR',
    category: 'MONETARY_POLICY',
    frequency: 'EVENT_DRIVEN',
    source_id: 'SRC_ECB',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'ECBDFR',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 30.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -2.0,
    max_plausible: 15.0,
    max_staleness_days: 60,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_GBP_POLICY_RATE',
    indicator_code: 'GBP_BOE_RATE',
    dashboard_indicator_id: 'GBP_POLICY_RATE',
    indicator_name: 'Bank of England Short-Term Policy Rate',
    asset_currency: 'GBP',
    category: 'MONETARY_POLICY',
    frequency: 'MONTHLY',
    source_id: 'SRC_BOE',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'IRSTCI01GBM156N',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 30.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -1.0,
    max_plausible: 20.0,
    max_staleness_days: 90,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_JPY_POLICY_RATE',
    indicator_code: 'JPY_BOJ_RATE',
    dashboard_indicator_id: 'JPY_POLICY_RATE',
    indicator_name: 'Bank of Japan Call Money / Policy Rate',
    asset_currency: 'JPY',
    category: 'MONETARY_POLICY',
    frequency: 'MONTHLY',
    source_id: 'SRC_BOJ',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'IRSTCI01JPM156N',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 30.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -1.0,
    max_plausible: 10.0,
    max_staleness_days: 90,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_CHF_POLICY_RATE',
    indicator_code: 'CHF_SNB_RATE',
    dashboard_indicator_id: 'CHF_POLICY_RATE',
    indicator_name: 'Swiss National Bank Short-Term Rate',
    asset_currency: 'CHF',
    category: 'MONETARY_POLICY',
    frequency: 'MONTHLY',
    source_id: 'SRC_SNB',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'IRSTCI01CHM156N',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 30.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -2.0,
    max_plausible: 10.0,
    max_staleness_days: 90,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_CAD_POLICY_RATE',
    indicator_code: 'CAD_BOC_RATE',
    dashboard_indicator_id: 'CAD_POLICY_RATE',
    indicator_name: 'Bank of Canada Short-Term Policy Rate',
    asset_currency: 'CAD',
    category: 'MONETARY_POLICY',
    frequency: 'MONTHLY',
    source_id: 'SRC_BOC',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'IRSTCI01CAM156N',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 30.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 0.0,
    max_plausible: 15.0,
    max_staleness_days: 90,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_AUD_POLICY_RATE',
    indicator_code: 'AUD_RBA_RATE',
    dashboard_indicator_id: 'AUD_POLICY_RATE',
    indicator_name: 'Reserve Bank of Australia Cash Rate',
    asset_currency: 'AUD',
    category: 'MONETARY_POLICY',
    frequency: 'MONTHLY',
    source_id: 'SRC_RBA',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'IRSTCI01AUM156N',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 30.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 0.0,
    max_plausible: 15.0,
    max_staleness_days: 90,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_NZD_POLICY_RATE',
    indicator_code: 'NZD_RBNZ_RATE',
    dashboard_indicator_id: 'NZD_POLICY_RATE',
    indicator_name: 'Reserve Bank of New Zealand Official Cash Rate',
    asset_currency: 'NZD',
    category: 'MONETARY_POLICY',
    frequency: 'MONTHLY',
    source_id: 'SRC_RBNZ',
    secondary_source_id: 'SRC_FRED',
    source_series_id: 'IRSTCI01NZM156N',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 30.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 0.0,
    max_plausible: 15.0,
    max_staleness_days: 90,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },

  // --------------------------------------------------------------------------
  // COMMODITIES & CROSS-ASSET MACRO DRIVERS (WTI, GOLD REAL YIELD, SP500, NASDAQ100)
  // --------------------------------------------------------------------------
  {
    id: 'IND_WTI_SPOT_PRICE',
    indicator_code: 'WTI_CRUDE_SPOT',
    indicator_name: 'WTI Crude Oil Spot Price (Cushing, OK)',
    asset_currency: 'WTI',
    category: 'COMMODITY_DRIVER',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'DCOILWTICO',
    expected_unit: '$',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 35.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 5.0,
    max_plausible: 250.0,
    max_staleness_days: 15,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_GOLD_REAL_YIELD_DRIVER',
    indicator_code: 'XAU_REAL_YIELD_DRIVER',
    indicator_name: 'Gold Opportunity Cost Driver (US 10Y TIPS Real Yield)',
    asset_currency: 'XAUUSD',
    category: 'MONETARY_POLICY',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'DFII10',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 25.0,
    direction_rule: 'LOWER_IS_BULLISH', // Falling real yields -> Bullish Gold
    min_plausible: -5.0,
    max_plausible: 10.0,
    max_staleness_days: 15,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_GOLD_INFLATION_BREAKEVEN',
    indicator_code: 'XAU_5Y_BREAKEVEN',
    indicator_name: 'US 5-Year Breakeven Inflation Rate',
    asset_currency: 'XAUUSD',
    category: 'INFLATION',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'T5YIE',
    expected_unit: '%',
    transformation: 'LEVEL',
    importance_level: 'TIER_2_HIGH',
    base_weight: 15.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: -2.0,
    max_plausible: 10.0,
    max_staleness_days: 15,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_NASDAQ100_INDEX',
    indicator_code: 'NASDAQ100_BENCHMARK',
    indicator_name: 'NASDAQ-100 Index Official Close',
    asset_currency: 'NASDAQ100',
    category: 'MARKET_BREADTH',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'NASDAQ100',
    expected_unit: 'pts',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 20.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 1000,
    max_plausible: 100000,
    max_staleness_days: 10,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_SP500_INDEX',
    indicator_code: 'SP500_BENCHMARK',
    indicator_name: 'S&P 500 Index Official Close',
    asset_currency: 'SP500',
    category: 'MARKET_BREADTH',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'SP500',
    expected_unit: 'pts',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 20.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 500,
    max_plausible: 30000,
    max_staleness_days: 10,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_US30_INDEX',
    indicator_code: 'US30_BENCHMARK',
    indicator_name: 'Dow Jones Industrial Average Official Close',
    asset_currency: 'US30',
    category: 'MARKET_BREADTH',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'DJIA',
    expected_unit: 'pts',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 20.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 5000,
    max_plausible: 200000,
    max_staleness_days: 10,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_BTC_SPOT_PRICE',
    indicator_code: 'BTC_COINBASE_USD',
    indicator_name: 'Bitcoin Spot Price (Coinbase USD Benchmark)',
    asset_currency: 'BTC',
    category: 'ON_CHAIN_FLOWS',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'CBBTCUSD',
    expected_unit: '$',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 20.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 1000,
    max_plausible: 1000000,
    max_staleness_days: 10,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
  {
    id: 'IND_ETH_SPOT_PRICE',
    indicator_code: 'ETH_COINBASE_USD',
    indicator_name: 'Ethereum Spot Price (Coinbase USD Benchmark)',
    asset_currency: 'ETH',
    category: 'ON_CHAIN_FLOWS',
    frequency: 'DAILY',
    source_id: 'SRC_FRED',
    source_series_id: 'CBETHUSD',
    expected_unit: '$',
    transformation: 'LEVEL',
    importance_level: 'TIER_1_EXTREME',
    base_weight: 20.0,
    direction_rule: 'HIGHER_IS_BULLISH',
    min_plausible: 50,
    max_plausible: 100000,
    max_staleness_days: 10,
    can_automate_free: true,
    has_previous_actual: true,
    has_consensus_forecast: false,
    active: true,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
  },
];

// ============================================================================
// 4. PREPARED SUPABASE CRON + EDGE FUNCTION SCHEDULES
// ============================================================================

export const PREPARED_SYNC_SCHEDULES: ScheduleConfigRecord[] = [
  {
    id: 'SCHED_MARKET_PRICES_15M',
    name: 'Frequent Market & Yield Feeds',
    cron_expression: '*/15 * * * *',
    frequency_label: 'Every 15 Minutes',
    target_scope: 'FX Spot, US02Y, US10Y, Real Yields, WTI, Gold, Crypto',
    edge_function_name: 'sync-market-prices',
    active: true,
    last_run_at: null,
  },
  {
    id: 'SCHED_ECONOMIC_RELEASES_HOURLY',
    name: 'Economic Indicator Release Polling',
    cron_expression: '5 * * * *',
    frequency_label: 'Hourly (Release-Driven)',
    target_scope: 'FRED, BLS, BEA, ECB, BoE, BoJ, SNB, BoC, RBA, RBNZ',
    edge_function_name: 'sync-economic-releases',
    active: true,
    last_run_at: null,
  },
  {
    id: 'SCHED_DAILY_MACRO_REGIME',
    name: 'Daily Macro & Cross-Asset Regime',
    cron_expression: '0 6 * * *',
    frequency_label: 'Daily at 06:00 UTC',
    target_scope: 'Sovereign Yield Curves, Inflation Breakevens, Index Breadth',
    edge_function_name: 'sync-daily-macro',
    active: true,
    last_run_at: null,
  },
  {
    id: 'SCHED_WEEKLY_COT_POSITIONING',
    name: 'Weekly CFTC COT & Institutional Positioning',
    cron_expression: '0 21 * * 5',
    frequency_label: 'Weekly Friday 21:00 UTC',
    target_scope: 'CFTC Commitments of Traders (G8 Currencies, Gold, Silver, Oil)',
    edge_function_name: 'sync-weekly-cot',
    active: true,
    last_run_at: null,
  },
];

// ============================================================================
// 5. PERSISTENT ARCHITECTURE STORE
// ============================================================================

interface FundamentalArchitectureStore {
  observations: EconomicObservationRecord[];
  marketPrices: MarketPriceRecord[];
  qualityLogs: DataQualityLogRecord[];
  syncLogs: SyncLogRecord[];
  regimeWeights: IndicatorRegimeWeightRecord[];
  lastUpdatedAt: string;
}

const STORE_FILENAME = 'fundamental_data_architecture_store.json';

function loadArchitectureStore(): FundamentalArchitectureStore {
  return safeReadJsonFile<FundamentalArchitectureStore>(STORE_FILENAME, {
    observations: [],
    marketPrices: [],
    qualityLogs: [],
    syncLogs: [],
    regimeWeights: [],
    lastUpdatedAt: new Date().toISOString(),
  });
}

function saveArchitectureStore(store: FundamentalArchitectureStore): void {
  store.lastUpdatedAt = new Date().toISOString();
  // Keep logs bounded so JSON file stays fast and compact
  if (store.qualityLogs.length > 250) {
    store.qualityLogs = store.qualityLogs.slice(0, 250);
  }
  if (store.syncLogs.length > 120) {
    store.syncLogs = store.syncLogs.slice(0, 120);
  }
  safeWriteJsonFile(STORE_FILENAME, store);
}

// ============================================================================
// 6. CONCRETE PROVIDER ADAPTERS (FRED, BLS, MANUAL)
// ============================================================================

export class FredProviderAdapter implements DataProvider {
  private sourceMeta: DataSourceRecord;

  constructor(sourceMeta?: DataSourceRecord) {
    this.sourceMeta =
      sourceMeta ||
      PRECONFIGURED_DATA_SOURCES.find((s) => s.id === 'SRC_FRED')!;
  }

  getSourceMetadata(): DataSourceRecord {
    return this.sourceMeta;
  }

  async fetchEconomicData(indicator: EconomicIndicatorRecord): Promise<ProviderFetchResult> {
    const seriesId = indicator.source_series_id;
    const fredApiKey = (process.env.FRED_API_KEY || '').trim();

    // If FRED_API_KEY is configured, use official JSON API; otherwise use official FRED CSV endpoint (100% free, zero key required)
    const endpoint = fredApiKey
      ? `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(fredApiKey)}&file_type=json&sort_order=desc&limit=15`
      : `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;

    const safeEndpointForLog = fredApiKey
      ? `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}&file_type=json`
      : endpoint;

    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: fredApiKey ? 'application/json' : 'text/csv',
          'User-Agent': 'PrimePipFX-DataArchitecture/1.0',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok) {
        return {
          ok: false,
          httpStatus: response.status,
          endpoint: safeEndpointForLog,
          points: [],
          errorMessage: `FRED responded with HTTP ${response.status} for series ${seriesId}`,
        };
      }

      if (fredApiKey) {
        const json: any = await response.json();
        const rawObs = Array.isArray(json?.observations) ? json.observations : [];
        const validPoints: NormalizedSeriesPoint[] = rawObs
          .filter((r: any) => r && r.value !== '.' && Number.isFinite(Number(r.value)))
          .map((r: any) => ({
            period: String(r.date),
            value: Number(r.value),
            releaseTimestamp: r.realtime_start ? `${r.realtime_start}T00:00:00Z` : `${r.date}T00:00:00Z`,
            rawPoint: r,
          }));
        return {
          ok: validPoints.length > 0,
          httpStatus: response.status,
          endpoint: safeEndpointForLog,
          points: validPoints,
          rawResponseSample: { series_id: seriesId, latestPoints: validPoints.slice(0, 3) },
        };
      }

      // Parse FRED CSV response
      const text = await response.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) {
        return {
          ok: false,
          httpStatus: response.status,
          endpoint: safeEndpointForLog,
          points: [],
          errorMessage: `Empty CSV series returned for ${seriesId}`,
        };
      }

      // Parse from newest to oldest (take last 24 rows for YoY / MoM calculations)
      const dataLines = lines.slice(1).slice(-26).reverse();
      const validPoints: NormalizedSeriesPoint[] = [];

      for (const line of dataLines) {
        const [dateStr, valStr] = line.split(',');
        if (dateStr && valStr && valStr !== '.' && Number.isFinite(Number(valStr))) {
          validPoints.push({
            period: dateStr.trim(),
            value: Number(valStr.trim()),
            releaseTimestamp: `${dateStr.trim()}T00:00:00Z`,
            rawPoint: { date: dateStr.trim(), value: valStr.trim(), seriesId },
          });
        }
      }

      return {
        ok: validPoints.length > 0,
        httpStatus: response.status,
        endpoint: safeEndpointForLog,
        points: validPoints,
        rawResponseSample: {
          seriesId,
          totalRowsParsed: validPoints.length,
          latestThree: validPoints.slice(0, 3).map((p) => ({ period: p.period, value: p.value })),
        },
      };
    } catch (error: any) {
      return {
        ok: false,
        httpStatus: null,
        endpoint: safeEndpointForLog,
        points: [],
        errorMessage: error?.message || 'Network timeout or fetch failure talking to FRED',
      };
    }
  }

  async fetchMarketData(asset: AssetRecord): Promise<MarketPriceRecord | null> {
    const indicator = VERIFIED_DATA_SOURCE_MAP.find((i) => i.asset_currency === asset.id);
    if (!indicator) return null;
    const res = await this.fetchEconomicData(indicator);
    if (!res.ok || res.points.length === 0) return null;
    const latest = res.points[0];
    return {
      id: randomUUID(),
      asset_id: asset.id,
      timestamp: latest.releaseTimestamp || new Date().toISOString(),
      open: latest.value,
      high: latest.value,
      low: latest.value,
      close: latest.value,
      volume: null,
      timeframe: '1D',
      source_id: this.sourceMeta.id,
      retrieved_at: new Date().toISOString(),
      validation_status: 'VALID',
    };
  }

  validateResponse(result: ProviderFetchResult, indicator: EconomicIndicatorRecord) {
    // RULE 1: Never invent missing financial values
    if (!result.ok || result.points.length === 0) {
      return {
        status: (result.httpStatus ? 'DATA_UNAVAILABLE' : 'SOURCE_ERROR') as DataValidationStatus,
        qualityScore: 0,
        missingFields: ['actual_value', 'observation_period'],
        isStale: false,
        errorMessage: result.errorMessage || 'No verified observations returned from source.',
      };
    }

    const latest = result.points[0];
    if (latest.value === null || !Number.isFinite(latest.value)) {
      return {
        status: 'VALIDATION_ERROR' as DataValidationStatus,
        qualityScore: 0,
        missingFields: ['actual_value'],
        isStale: false,
        errorMessage: 'Malformed non-numeric value received from source.',
      };
    }

    // Calculate transformed value for plausibility check
    const transformed = computeTransformedSeriesValues(result.points, indicator.transformation);
    if (transformed.actual === null || !Number.isFinite(transformed.actual)) {
      return {
        status: 'DATA_UNAVAILABLE' as DataValidationStatus,
        qualityScore: 25,
        missingFields: ['historical_comparison_points'],
        isStale: false,
        errorMessage: `Insufficient historical observations to compute ${indicator.transformation}`,
      };
    }

    // RULE 7: Detect impossible or malformed numerical values
    if (
      (indicator.min_plausible !== undefined && transformed.actual < indicator.min_plausible) ||
      (indicator.max_plausible !== undefined && transformed.actual > indicator.max_plausible)
    ) {
      return {
        status: 'VALIDATION_ERROR' as DataValidationStatus,
        qualityScore: 10,
        missingFields: [],
        isStale: false,
        errorMessage: `Value ${transformed.actual} outside plausible bounds [${indicator.min_plausible}, ${indicator.max_plausible}]`,
      };
    }

    // RULE 6: Detect stale data
    const obsDateMs = Date.parse(latest.period);
    const ageDays = Number.isFinite(obsDateMs) ? (Date.now() - obsDateMs) / (1000 * 60 * 60 * 24) : 0;
    const isStale = ageDays > indicator.max_staleness_days;

    const missingFields: string[] = [];
    if (!indicator.has_consensus_forecast) {
      missingFields.push('forecast_value (not provided by free official statistical agency)');
    }

    return {
      status: (isStale ? 'STALE' : 'VALID') as DataValidationStatus,
      qualityScore: isStale ? 72 : 98,
      missingFields,
      isStale,
      errorMessage: null,
    };
  }

  normalizeData(
    result: ProviderFetchResult,
    indicator: EconomicIndicatorRecord,
    existingObs?: EconomicObservationRecord
  ): Omit<EconomicObservationRecord, 'id' | 'created_at' | 'updated_at'> {
    const validation = this.validateResponse(result, indicator);
    const nowIso = new Date().toISOString();

    // RULE 1: If data cannot be obtained or verified, store NULL and mark DATA_UNAVAILABLE
    if (!result.ok || result.points.length === 0) {
      return {
        indicator_id: indicator.id,
        indicator_code: indicator.indicator_code,
        indicator_name: indicator.indicator_name,
        asset_currency: indicator.asset_currency,
        observation_period: 'UNAVAILABLE',
        previous_value: null,
        forecast_value: null,
        actual_value: null,
        revised_previous_value: null,
        surprise_value: null,
        surprise_score: null,
        unit: indicator.expected_unit,
        source_id: indicator.source_id,
        source_name: this.sourceMeta.source_name,
        source_url: `https://fred.stlouisfed.org/series/${indicator.source_series_id}`,
        source_timestamp: null,
        retrieved_at: nowIso,
        release_timestamp: null,
        validation_status: validation.status,
        verification_status: 'API_RETRIEVED',
        entered_by: null,
        entered_at: null,
        notes: validation.errorMessage,
        data_quality_score: validation.qualityScore,
        raw_payload: result.rawResponseSample || {},
      };
    }

    const latest = result.points[0];
    const transformed = computeTransformedSeriesValues(result.points, indicator.transformation);

    // RULE 4: Do not silently overwrite historical observations. Preserve revisions.
    let revisedPrevious: number | null = null;
    if (
      existingObs &&
      existingObs.observation_period === latest.period &&
      existingObs.actual_value !== null &&
      transformed.actual !== null &&
      Math.abs(existingObs.actual_value - transformed.actual) > 0.0001
    ) {
      revisedPrevious = existingObs.actual_value;
    }

    const forecastVal = existingObs?.forecast_value ?? null;
    const surpriseVal =
      transformed.actual !== null && forecastVal !== null
        ? Number((transformed.actual - forecastVal).toFixed(4))
        : null;

    return {
      indicator_id: indicator.id,
      indicator_code: indicator.indicator_code,
      indicator_name: indicator.indicator_name,
      asset_currency: indicator.asset_currency,
      observation_period: latest.period,
      previous_value: transformed.previous,
      forecast_value: forecastVal,
      actual_value: transformed.actual,
      revised_previous_value: revisedPrevious,
      surprise_value: surpriseVal,
      surprise_score: null, // Step 1 does not implement final scoring models yet
      unit: indicator.expected_unit,
      source_id: indicator.source_id,
      source_name: this.sourceMeta.source_name,
      source_url: `https://fred.stlouisfed.org/series/${indicator.source_series_id}`,
      source_timestamp: latest.releaseTimestamp,
      retrieved_at: nowIso,
      release_timestamp: latest.releaseTimestamp,
      validation_status: validation.status,
      verification_status: 'API_RETRIEVED',
      entered_by: null,
      entered_at: null,
      notes: `Automated pull via ${this.sourceMeta.source_name} (${indicator.source_series_id}, ${indicator.transformation})`,
      data_quality_score: validation.qualityScore,
      raw_payload: result.rawResponseSample || {},
    };
  }
}

// ============================================================================
// SERIES TRANSFORMATION HELPER (LEVEL, YOY_PCT, MOM_DIFF, MOM_PCT)
// ============================================================================

function computeTransformedSeriesValues(
  points: NormalizedSeriesPoint[],
  transformation: EconomicIndicatorRecord['transformation']
): { actual: number | null; previous: number | null } {
  if (points.length === 0) return { actual: null, previous: null };

  if (transformation === 'LEVEL' || transformation === 'QOQ_SAAR') {
    const actual = points[0]?.value ?? null;
    const previous = points[1]?.value ?? null;
    return {
      actual: actual !== null ? Number(actual.toFixed(2)) : null,
      previous: previous !== null ? Number(previous.toFixed(2)) : null,
    };
  }

  if (transformation === 'MOM_DIFF') {
    // e.g. Non-Farm Payrolls PAYEMS is in thousands; MoM net change = current - previous month
    if (points.length < 2 || points[0].value === null || points[1].value === null) {
      return { actual: null, previous: null };
    }
    const actualDiff = Number((points[0].value - points[1].value).toFixed(1));
    const prevDiff =
      points.length >= 3 && points[2].value !== null
        ? Number((points[1].value - points[2].value).toFixed(1))
        : null;
    return { actual: actualDiff, previous: prevDiff };
  }

  if (transformation === 'MOM_PCT') {
    if (points.length < 2 || !points[0].value || !points[1].value) {
      return { actual: null, previous: null };
    }
    const actualPct = Number((((points[0].value - points[1].value) / points[1].value) * 100).toFixed(2));
    const prevPct =
      points.length >= 3 && points[2].value
        ? Number((((points[1].value - points[2].value) / points[2].value) * 100).toFixed(2))
        : null;
    return { actual: actualPct, previous: prevPct };
  }

  if (transformation === 'YOY_PCT') {
    // Monthly series: 12 observations ago is index 12
    if (points.length < 13 || !points[0].value || !points[12].value) {
      return { actual: null, previous: null };
    }
    const actualYoY = Number((((points[0].value - points[12].value) / points[12].value) * 100).toFixed(2));
    const prevYoY =
      points.length >= 14 && points[1].value && points[13].value
        ? Number((((points[1].value - points[13].value) / points[13].value) * 100).toFixed(2))
        : null;
    return { actual: actualYoY, previous: prevYoY };
  }

  return { actual: points[0]?.value ?? null, previous: points[1]?.value ?? null };
}

// ============================================================================
// 7. AUTOMATED PROFILE SYNCHRONIZATION & VALIDATION ENGINE
// ============================================================================

export async function syncFundamentalProfile(profileTarget: string = 'USD') {
  const store = loadArchitectureStore();
  const normalizedTarget = profileTarget.toUpperCase();

  // Select indicators matching target profile
  const targetIndicators = VERIFIED_DATA_SOURCE_MAP.filter((ind) => {
    if (!ind.active) return false;
    if (normalizedTarget === 'ALL') return true;
    if (normalizedTarget === 'COMMODITIES') {
      return ['XAUUSD', 'XAGUSD', 'WTI'].includes(ind.asset_currency);
    }
    if (normalizedTarget === 'INDICES') {
      return ['US30', 'NASDAQ100', 'SP500'].includes(ind.asset_currency);
    }
    if (normalizedTarget === 'CRYPTO') {
      return ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'].includes(ind.asset_currency);
    }
    if (normalizedTarget === 'G8_RATES') {
      return ind.category === 'MONETARY_POLICY';
    }
    return ind.asset_currency === normalizedTarget;
  });

  const syncLog: SyncLogRecord = {
    id: randomUUID(),
    source_id: normalizedTarget === 'USD' ? 'SRC_FRED' : 'SRC_FRED',
    profile_target: normalizedTarget,
    function_name: `syncFundamentalProfile(${normalizedTarget})`,
    started_at: new Date().toISOString(),
    completed_at: null,
    status: 'RUNNING',
    records_received: 0,
    records_inserted: 0,
    records_updated: 0,
    records_rejected: 0,
    error_message: null,
  };

  const syncedObservations: EconomicObservationRecord[] = [];
  const errors: string[] = [];

  for (const indicator of targetIndicators) {
    const sourceMeta =
      PRECONFIGURED_DATA_SOURCES.find((s) => s.id === indicator.source_id) ||
      PRECONFIGURED_DATA_SOURCES[0];
    const adapter = new FredProviderAdapter(sourceMeta);

    const fetchResult = await adapter.fetchEconomicData(indicator);
    const validation = adapter.validateResponse(fetchResult, indicator);

    const existingIdx = store.observations.findIndex(
      (o) => o.indicator_id === indicator.id && o.source_id === indicator.source_id
    );
    const existingObs = existingIdx >= 0 ? store.observations[existingIdx] : undefined;

    const normalizedObs = adapter.normalizeData(fetchResult, indicator, existingObs);

    // RULE 5: Detect duplicate observations
    const isDuplicate =
      existingObs !== undefined &&
      existingObs.observation_period === normalizedObs.observation_period &&
      existingObs.actual_value === normalizedObs.actual_value;

    // RULE 8: Check for conflict with another source (e.g., MANUAL vs API_RETRIEVED for the same period)
    const otherSourceObs = store.observations.find(
      (o) =>
        o.indicator_id === indicator.id &&
        o.observation_period === normalizedObs.observation_period &&
        o.source_id !== indicator.source_id &&
        o.actual_value !== null &&
        normalizedObs.actual_value !== null &&
        Math.abs(o.actual_value - normalizedObs.actual_value) > 0.01
    );

    if (otherSourceObs) {
      normalizedObs.validation_status = 'DATA_CONFLICT';
      normalizedObs.verification_status = 'CONFLICT_FLAGGED';
      normalizedObs.notes = `DATA_CONFLICT: ${sourceMeta.source_name} reported ${normalizedObs.actual_value}${indicator.expected_unit} while ${otherSourceObs.source_name} reported ${otherSourceObs.actual_value}${indicator.expected_unit}. Both records preserved.`;
      otherSourceObs.validation_status = 'DATA_CONFLICT';
      otherSourceObs.verification_status = 'CONFLICT_FLAGGED';
    }

    // Record data quality log
    store.qualityLogs.unshift({
      id: randomUUID(),
      source_id: indicator.source_id,
      endpoint: fetchResult.endpoint,
      request_time: new Date().toISOString(),
      response_status: fetchResult.httpStatus,
      validation_result: normalizedObs.validation_status,
      missing_fields: validation.missingFields,
      stale_data: validation.isStale,
      duplicate_data: isDuplicate,
      conflicting_data: Boolean(otherSourceObs),
      error_message: validation.errorMessage,
    });

    if (fetchResult.ok) {
      syncLog.records_received += 1;
    }

    if (
      normalizedObs.validation_status === 'VALIDATION_ERROR' ||
      normalizedObs.validation_status === 'SOURCE_ERROR'
    ) {
      syncLog.records_rejected += 1;
      if (validation.errorMessage) errors.push(`${indicator.indicator_code}: ${validation.errorMessage}`);
    }

    const recordToSave: EconomicObservationRecord = {
      id: existingObs?.id || randomUUID(),
      ...normalizedObs,
      // Preserve VERIFIED status if operator already verified this exact period/value
      verification_status:
        isDuplicate && existingObs?.verification_status === 'VERIFIED'
          ? 'VERIFIED'
          : normalizedObs.verification_status,
      created_at: existingObs?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      store.observations[existingIdx] = recordToSave;
      syncLog.records_updated += 1;
    } else {
      store.observations.unshift(recordToSave);
      syncLog.records_inserted += 1;
    }

    syncedObservations.push(recordToSave);
  }

  syncLog.completed_at = new Date().toISOString();
  syncLog.status =
    syncLog.records_rejected === 0
      ? 'SUCCESS'
      : syncLog.records_received > 0
      ? 'PARTIAL_SUCCESS'
      : 'FAILED';
  syncLog.error_message = errors.length > 0 ? errors.join(' | ') : null;

  store.syncLogs.unshift(syncLog);
  saveArchitectureStore(store);

  return {
    ok: syncLog.status !== 'FAILED',
    syncLog,
    syncedObservations,
    totalStoreObservations: store.observations.length,
  };
}

// ============================================================================
// 8. VERIFY & ACCEPT OBSERVATION WORKFLOW
// ============================================================================

export function verifyArchitectureObservation(observationId: string, verifiedBy: string = 'Analyst Operator') {
  const store = loadArchitectureStore();
  const obs = store.observations.find((o) => o.id === observationId);
  if (!obs) {
    return { ok: false, error: 'Observation record not found.' };
  }
  obs.verification_status = 'VERIFIED';
  if (obs.validation_status === 'PENDING_VALIDATION' || obs.validation_status === 'DATA_CONFLICT') {
    obs.validation_status = 'VALID';
  }
  obs.entered_by = verifiedBy;
  obs.entered_at = new Date().toISOString();
  obs.updated_at = new Date().toISOString();
  saveArchitectureStore(store);

  const indicatorMeta = VERIFIED_DATA_SOURCE_MAP.find((i) => i.id === obs.indicator_id);

  return {
    ok: true,
    observation: obs,
    dashboardIndicatorId: indicatorMeta?.dashboard_indicator_id || obs.indicator_code,
  };
}

// ============================================================================
// 9. MANUAL VERIFIED DATA ENTRY MECHANISM (RULE 4 & RULE 8 COMPLIANT)
// ============================================================================

export function createManualVerifiedObservation(payload: {
  indicator_id: string;
  observation_period: string;
  previous_value: number | null;
  forecast_value: number | null;
  actual_value: number | null;
  source_name: string;
  source_url: string;
  release_date: string;
  notes: string;
  entered_by: string;
}) {
  const store = loadArchitectureStore();
  const indicator = VERIFIED_DATA_SOURCE_MAP.find(
    (i) => i.id === payload.indicator_id || i.indicator_code === payload.indicator_id
  );
  if (!indicator) {
    return { ok: false, error: `Unknown indicator_id: ${payload.indicator_id}` };
  }

  const nowIso = new Date().toISOString();

  // Check if an API record exists for the same indicator & period that disagrees (RULE 8)
  const conflictingApiObs = store.observations.find(
    (o) =>
      o.indicator_id === indicator.id &&
      o.observation_period === payload.observation_period &&
      o.source_id !== 'SRC_MANUAL' &&
      o.actual_value !== null &&
      payload.actual_value !== null &&
      Math.abs(o.actual_value - payload.actual_value) > 0.01
  );

  const validationStatus: DataValidationStatus =
    payload.actual_value === null
      ? 'DATA_UNAVAILABLE'
      : conflictingApiObs
      ? 'DATA_CONFLICT'
      : 'VALID';

  if (conflictingApiObs) {
    conflictingApiObs.validation_status = 'DATA_CONFLICT';
    conflictingApiObs.verification_status = 'CONFLICT_FLAGGED';
  }

  const surpriseValue =
    payload.actual_value !== null && payload.forecast_value !== null
      ? Number((payload.actual_value - payload.forecast_value).toFixed(4))
      : null;

  const manualObs: EconomicObservationRecord = {
    id: randomUUID(),
    indicator_id: indicator.id,
    indicator_code: indicator.indicator_code,
    indicator_name: indicator.indicator_name,
    asset_currency: indicator.asset_currency,
    observation_period: payload.observation_period,
    previous_value: payload.previous_value,
    forecast_value: payload.forecast_value,
    actual_value: payload.actual_value,
    revised_previous_value: null,
    surprise_value: surpriseValue,
    surprise_score: null,
    unit: indicator.expected_unit,
    source_id: 'SRC_MANUAL',
    source_name: payload.source_name || 'MANUAL (Operator Verified)',
    source_url: payload.source_url || 'internal://manual-verified-entry',
    source_timestamp: payload.release_date ? `${payload.release_date}T00:00:00Z` : nowIso,
    retrieved_at: nowIso,
    release_timestamp: payload.release_date ? `${payload.release_date}T00:00:00Z` : nowIso,
    validation_status: validationStatus,
    verification_status: 'MANUAL',
    entered_by: payload.entered_by || 'Operator',
    entered_at: nowIso,
    notes: payload.notes || 'Explicitly entered manual record labeled MANUAL',
    data_quality_score: validationStatus === 'VALID' ? 95 : 65,
    raw_payload: { manualEntry: true, ...payload },
    created_at: nowIso,
    updated_at: nowIso,
  };

  store.observations.unshift(manualObs);
  store.qualityLogs.unshift({
    id: randomUUID(),
    source_id: 'SRC_MANUAL',
    endpoint: '/api/fundamental-architecture/manual-entry',
    request_time: nowIso,
    response_status: 200,
    validation_result: validationStatus,
    missing_fields: [],
    stale_data: false,
    duplicate_data: false,
    conflicting_data: Boolean(conflictingApiObs),
    error_message: conflictingApiObs
      ? `Conflict detected between MANUAL (${payload.actual_value}) and ${conflictingApiObs.source_name} (${conflictingApiObs.actual_value})`
      : null,
  });

  saveArchitectureStore(store);

  return {
    ok: true,
    observation: manualObs,
    conflictDetected: Boolean(conflictingApiObs),
  };
}

// ============================================================================
// 10. ARCHITECTURE STATUS & FULL AUDIT TRAIL QUERY
// ============================================================================

let initialAutoSyncTriggered = false;

export function getFundamentalArchitectureOverview() {
  const store = loadArchitectureStore();
  if (store.observations.length === 0 && !initialAutoSyncTriggered) {
    initialAutoSyncTriggered = true;
    void syncFundamentalProfile('USD').catch(() => {});
  }
  const envStatus = {
    FRED_PUBLIC_CSV: 'ACTIVE_FREE_NO_KEY',
    FRED_API_KEY: Boolean(process.env.FRED_API_KEY),
    BLS_PUBLIC_API: 'ACTIVE_FREE_NO_KEY',
    BLS_API_KEY: Boolean(process.env.BLS_API_KEY),
    BEA_API_KEY: Boolean(process.env.BEA_API_KEY),
    SUPABASE_CONFIGURED: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY),
  };

  const countsByStatus: Record<DataValidationStatus, number> = {
    VALID: 0,
    STALE: 0,
    MISSING: 0,
    DATA_UNAVAILABLE: 0,
    DATA_CONFLICT: 0,
    VALIDATION_ERROR: 0,
    SOURCE_ERROR: 0,
    PENDING_VALIDATION: 0,
  };

  for (const obs of store.observations) {
    countsByStatus[obs.validation_status] = (countsByStatus[obs.validation_status] || 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    step: 'STEP_1_DATA_ARCHITECTURE_AND_CONTROL_CENTER',
    envStatus,
    sources: PRECONFIGURED_DATA_SOURCES,
    assets: PRECONFIGURED_ASSETS,
    indicators: VERIFIED_DATA_SOURCE_MAP,
    schedules: PREPARED_SYNC_SCHEDULES,
    observations: store.observations,
    qualityLogs: store.qualityLogs.slice(0, 60),
    syncLogs: store.syncLogs.slice(0, 40),
    countsByStatus,
    lastSyncAt: store.syncLogs[0]?.completed_at || null,
  };
}
