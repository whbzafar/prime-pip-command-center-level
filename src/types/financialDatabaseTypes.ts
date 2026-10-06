/**
 * PRIME PIP FX COMMAND CENTER — Production Financial Database Architecture
 * TypeScript Data Models & Schemas for Institutional Financial Data
 *
 * Enforces strict separation between:
 * 1. Raw & Official Data (observations, revisions, economic releases, indicators, sources)
 * 2. Calculated Data (marketScores, currencyScores, pairScores, commodityScores, indexScores, cryptoScores, stockScores)
 * 3. AI-Generated Analysis (aiAnalysis)
 */

// ==========================================
// 1. ENUMS & UNION TYPES
// ==========================================

export type UserRole = 'USER' | 'TRADER' | 'ANALYST' | 'ADMIN' | 'DEVELOPER';

export type AssetType = 'CURRENCY' | 'COMMODITY' | 'INDEX' | 'CRYPTO' | 'STOCK';

export type AssetStatus = 'ACTIVE' | 'INACTIVE' | 'DELISTED';

export type IndicatorCategory =
  | 'MONETARY_POLICY'
  | 'INFLATION'
  | 'GROWTH'
  | 'EMPLOYMENT'
  | 'WAGES'
  | 'INTEREST_RATES'
  | 'BOND_YIELDS'
  | 'TRADE'
  | 'CONSUMPTION'
  | 'BUSINESS_ACTIVITY'
  | 'HOUSING'
  | 'FISCAL'
  | 'COMMODITIES'
  | 'SENTIMENT'
  | 'POSITIONING';

export type IndicatorFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUAL'
  | 'ANNUAL'
  | 'IRREGULAR';

export type IndicatorImportance = 'HIGH' | 'MEDIUM' | 'LOW';

export type DirectionRule = 'HIGHER_IS_BULLISH' | 'HIGHER_IS_BEARISH' | 'RANGE_BOUND';

export type PeriodType = 'MONTHLY' | 'WEEKLY' | 'DAILY' | 'QUARTERLY' | 'ANNUAL';

/** Explicit Validation Status */
export type ValidationStatus =
  | 'VERIFIED'
  | 'PENDING_VALIDATION'
  | 'DATA_UNAVAILABLE'
  | 'SOURCE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NEEDS_REVIEW'
  | 'SUPERSEDED';

/** Explicit Data Quality */
export type DataQuality = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

/** Explicit Data Freshness */
export type DataFreshness = 'LIVE' | 'RECENT' | 'HISTORICAL' | 'STALE' | 'UNAVAILABLE';

/** Source Type Classification */
export type SourceType =
  | 'CENTRAL_BANK'
  | 'STATISTICAL_AGENCY'
  | 'GOVERNMENT_TREASURY'
  | 'INTERNATIONAL_ORGANIZATION'
  | 'FINANCIAL_EXCHANGE'
  | 'COMMERCIAL_VENDOR';

/** Economic Release Status */
export type EconomicReleaseStatus =
  | 'SCHEDULED'
  | 'RELEASED'
  | 'DELAYED'
  | 'CANCELLED'
  | 'DATA_UNAVAILABLE';

/** Synchronization Job Status */
export type SyncJobStatus = 'RUNNING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';

/** Validation Check Status */
export type ValidationCheckStatus = 'PASSED' | 'FAILED' | 'WARNING';

/** Audit Result Status */
export type AuditResult = 'SUCCESS' | 'FAILURE' | 'DENIED';

// ==========================================
// 2. CORE DATABASE MODELS (23 ENTITIES)
// ==========================================

/** 1. Users */
export interface UserRecord {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: string;
  updatedAt: string;
}

/** 2. Assets (Currencies, Commodities, Indices, Crypto, Stocks) */
export interface AssetRecord {
  id: string;
  symbol: string; // e.g. 'USD', 'XAU', 'US30', 'BTCUSDT', 'NVDA'
  name: string;
  assetType: AssetType;
  currency: string; // Base, quote or reporting currency
  country: string;
  exchange: string;
  status: AssetStatus;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/** 3. Currencies */
export interface CurrencyRecord {
  id: string;
  code: string; // e.g. 'USD'
  name: string;
  country: string;
  centralBank: string;
  policyRateKey?: string;
  benchmark10YRateKey?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

/** 4. Indicators (Registry Definition - No hardcoded observation data) */
export interface IndicatorRecord {
  id: string; // e.g. 'ind_us_cpi_yoy'
  name: string;
  shortName: string;
  category: IndicatorCategory;
  asset: string; // Asset symbol or code
  currency: string;
  country: string;
  description: string;
  unit: string;
  frequency: IndicatorFrequency;
  sourceProvider: string;
  sourceIdentifier: string;
  sourceUrl: string;
  releaseSchedule?: string;
  importance: IndicatorImportance;
  directionRule: DirectionRule;
  status: 'ACTIVE' | 'DEPRECATED' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

/** 5. Data Sources */
export interface DataSourceRecord {
  id: string;
  name: string;
  organization: string;
  country: string;
  sourceType: SourceType;
  official: boolean;
  website: string;
  apiUrl?: string;
  documentationUrl?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'DEPRECATED';
  lastSuccessfulSync?: string | null;
  lastAttemptedSync?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 6. Data Providers */
export interface DataProviderRecord {
  id: string;
  name: string;
  providerCode: string; // 'FRED' | 'ALPHA_VANTAGE' | 'TWELVE_DATA' | 'BLS' | 'BEA' | 'ECB' | 'BOE' | 'SEC_EDGAR' | 'CFTC' | 'MANUAL_OFFICIAL'
  baseUrl: string;
  authType: 'API_KEY' | 'OAUTH' | 'PUBLIC_NO_AUTH' | 'MANUAL_VERIFIED';
  status: 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE';
  rateLimitPerMin?: number;
  supportedAssetClasses: AssetType[];
  lastHealthCheck?: string;
  isHealthOk?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 7. Observations (Central Official Economic Observation Record) */
export interface ObservationRecord {
  id: string;
  indicatorId: string;
  assetId: string;
  currency: string;
  country: string;
  period: string; // e.g. '2026-09', '2026-Q3'
  periodType: PeriodType;
  releaseDate: string | null; // ISO 8601 date string
  value: number | null; // Realized observation value, strictly nullable
  unit: string;
  previousValue: number | null; // Strictly null if missing from source
  forecastValue: number | null; // Strictly null if missing from source
  actualValue: number | null; // Strictly null if missing from source
  revisionValue: number | null; // Strictly null if no revision
  isRevision: boolean;
  sourceId: string;
  providerId: string;
  sourceUrl: string;
  retrievedAt: string;
  validationStatus: ValidationStatus;
  validationReason?: string | null;
  dataQuality: DataQuality;
  confidence: number; // 0 to 100
  freshness?: DataFreshness;
  isSyntheticTest?: boolean; // Must be false or absent in production
  createdAt: string;
  updatedAt: string;
}

/** 8. Economic Releases */
export interface EconomicReleaseRecord {
  id: string;
  indicatorId: string;
  scheduledReleaseDate: string;
  actualReleaseDate: string | null;
  period: string;
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  revision: number | null;
  source: string;
  sourceUrl: string;
  status: EconomicReleaseStatus;
  createdAt: string;
  updatedAt: string;
}

/** 9. Revisions (Track Historical Revision Evolution) */
export interface RevisionRecord {
  id: string;
  observationId: string;
  originalValue: number | null;
  revisedValue: number | null;
  revisionDate: string;
  source: string;
  reason?: string;
  sourceUrl: string;
  createdAt: string;
}

/** 10. Validation Results (14 Automated Rule Checks) */
export interface ValidationResultRecord {
  id: string;
  observationId: string;
  check:
    | 'SOURCE_AUTHENTICITY'
    | 'INDICATOR_IDENTITY'
    | 'SERIES_IDENTIFIER'
    | 'DATE_FORMAT'
    | 'PERIOD_FORMAT'
    | 'UNIT_VALIDITY'
    | 'NUMERICAL_FORMAT'
    | 'DUPLICATE_CHECK'
    | 'REVISION_CONSISTENCY'
    | 'PREVIOUS_VALUE'
    | 'ACTUAL_VALUE'
    | 'FORECAST_VALUE'
    | 'SOURCE_URL'
    | 'RETRIEVAL_TIMESTAMP';
  status: ValidationCheckStatus;
  message: string;
  details?: Record<string, any>;
  createdAt: string;
}

/** 11. Sync Jobs */
export interface SyncJobRecord {
  id: string;
  provider: string;
  startedAt: string;
  completedAt: string | null;
  status: SyncJobStatus;
  recordsRequested: number;
  recordsReceived: number;
  recordsAccepted: number;
  recordsRejected: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errorCount: number;
  errorMessage: string | null;
  createdAt: string;
}

/** 12. Market Scores (CALCULATED - Separated from Raw Data) */
export interface MarketScoreRecord {
  id: string;
  assetId: string;
  scoreType: string;
  compositeScore: number;
  assessmentLabel: string;
  calculationTimestamp: string;
  modelVersion: string;
  components: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

/** 13. Currency Scores (CALCULATED) */
export interface CurrencyScoreRecord {
  id: string;
  currency: string;
  finalCompositeScore: number;
  assessmentLabel: string;
  primaryDrivers: string[];
  conflictingFactors?: string[];
  categoryScores: Record<string, number>;
  calculationTimestamp: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** 14. Pair Scores (CALCULATED) */
export interface PairScoreRecord {
  id: string;
  pair: string;
  baseCurrency: string;
  quoteCurrency: string;
  netDifferential: number;
  fundamentalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  biasLabel: string;
  calculationTimestamp: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** 15. Commodity Scores (CALCULATED) */
export interface CommodityScoreRecord {
  id: string;
  symbol: string;
  score: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  drivers: string[];
  calculationTimestamp: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** 16. Index Scores (CALCULATED) */
export interface IndexScoreRecord {
  id: string;
  symbol: string;
  valuationScore: number;
  valuationStatus: 'OVERVALUED' | 'FAIR_VALUE' | 'UNDERVALUED' | 'DATA_UNAVAILABLE';
  primaryDrivers: string[];
  calculationTimestamp: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** 17. Crypto Scores (CALCULATED) */
export interface CryptoScoreRecord {
  id: string;
  symbol: string;
  macroScore: number;
  macroBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  primaryDrivers: string[];
  calculationTimestamp: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** 18. Stock Scores (CALCULATED) */
export interface StockScoreRecord {
  id: string;
  symbol: string;
  valuationScore: number;
  valuationStatus: 'OVERVALUED' | 'FAIR_VALUE' | 'UNDERVALUED' | 'DATA_UNAVAILABLE';
  primaryDrivers: string[];
  calculationTimestamp: string;
  modelVersion: string;
  createdAt: string;
  updatedAt: string;
}

/** 19. Cross Asset Relationships */
export interface CrossAssetRelationshipRecord {
  id: string;
  baseAssetId: string;
  relatedAssetId: string;
  relationshipType: 'INVERSE' | 'DIRECT' | 'LEAD_LAG' | 'SPREAD';
  correlationCoefficient?: number;
  description: string;
  updatedAt: string;
}

/** 20. AI Analysis (AI-GENERATED - Strictly Isolated) */
export interface AiAnalysisRecord {
  id: string;
  targetType: 'CURRENCY' | 'PAIR' | 'COMMODITY' | 'GLOBAL_REGIME' | 'INDEX' | 'STOCK' | 'CRYPTO';
  targetId: string;
  promptSummary: string;
  analysisText: string;
  engineSource: string; // e.g. 'GEMINI-3.8-FLASH' or 'DETERMINISTIC_FALLBACK'
  confidenceScore: number;
  generatedAt: string;
  expiresAt: string;
  createdAt: string;
}

/** 21. User Preferences */
export interface UserPreferencesRecord {
  id: string; // userId
  userId: string;
  defaultCurrency: string;
  defaultAssetCategory: AssetType | 'ALL';
  theme: 'dark' | 'midnight' | 'matrix' | 'terminal';
  notificationSettings: {
    highImpactAlerts: boolean;
    syncFailureAlerts: boolean;
  };
  riskProfile?: string;
  updatedAt: string;
}

/** 22. Watchlists */
export interface WatchlistRecord {
  id: string;
  userId: string;
  name: string;
  assetIds: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 23. Audit Logs */
export interface AuditLogRecord {
  id: string;
  userId: string;
  role: UserRole;
  action:
    | 'DATA_CREATION'
    | 'DATA_MODIFICATION'
    | 'DATA_REJECTION'
    | 'DATA_VALIDATION'
    | 'PROVIDER_CONFIGURATION_CHANGE'
    | 'SYNC_EXECUTION'
    | 'ROLE_CHANGE'
    | 'ADMIN_ACTION'
    | 'SYSTEM_INITIALIZATION';
  resource: string;
  resourceId: string;
  timestamp: string;
  result: AuditResult;
  metadata?: Record<string, any>;
}

// ==========================================
// 3. PROVIDER ABSTRACTION INTERFACES
// ==========================================

export interface RawProviderResponse {
  providerId: string;
  seriesId: string;
  fetchedAt: string;
  rawPayload: any;
  statusCode?: number;
}

export interface RawProviderRelease {
  providerId: string;
  seriesId: string;
  releaseDate: string;
  period: string;
  value?: any;
  previous?: any;
  forecast?: any;
}

export interface ProviderHealthCheckResult {
  providerId: string;
  isHealthy: boolean;
  responseTimeMs: number;
  message: string;
  checkedAt: string;
}

export interface HistoryQueryParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
  frequency?: IndicatorFrequency;
}

/**
 * Independent Provider Abstraction Contract
 */
export interface EconomicDataProvider {
  readonly providerId: string;
  readonly name: string;
  readonly supportedAssetClasses: AssetType[];

  getLatestObservation(indicatorId: string): Promise<RawProviderResponse | null>;
  getHistoricalObservations(indicatorId: string, params?: HistoryQueryParams): Promise<RawProviderResponse[]>;
  getRelease(indicatorId: string, period?: string): Promise<RawProviderRelease | null>;
  validateData(rawData: RawProviderResponse): Promise<ValidationResultRecord[]>;
  healthCheck(): Promise<ProviderHealthCheckResult>;
}

/**
 * Pipeline stages:
 * PROVIDER -> RAW RESPONSE -> PARSER -> NORMALIZER -> VALIDATOR -> VERIFIED OBSERVATION -> ANALYSIS ENGINE
 */
export interface ProviderDataPipeline<TRaw, TNormalized> {
  parse(raw: TRaw): Promise<TNormalized>;
  normalize(parsed: TNormalized): Promise<ObservationRecord>;
  validate(observation: ObservationRecord): Promise<{
    isValid: boolean;
    status: ValidationStatus;
    quality: DataQuality;
    results: ValidationResultRecord[];
  }>;
}
