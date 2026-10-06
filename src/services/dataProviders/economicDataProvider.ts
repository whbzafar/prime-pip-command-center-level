/**
 * PRIME PIP FX COMMAND CENTER — MODULAR DATA PROVIDER ARCHITECTURE
 * Sections 5, 6 & 7 Specification:
 * - Abstract EconomicDataProvider interface
 * - Methods: getIndicator(), getHistoricalData(), getLatestObservation(), getRelease(), validateObservation()
 * - Strict Data Validation Pipeline:
 *   SOURCE -> RAW DATA -> NORMALIZATION -> VALIDATION -> VERIFIED OBSERVATION -> ANALYSIS -> MARKET BIAS
 * - Validation statuses: VERIFIED | PENDING_VALIDATION | DATA_UNAVAILABLE | SOURCE_ERROR | VALIDATION_ERROR | NEEDS_REVIEW | SUPERSEDED
 * - Never fabricates fake values or placeholder numbers. If unavailable: DATA_UNAVAILABLE.
 */

export type DataValidationStatus =
  | 'VERIFIED'
  | 'PENDING_VALIDATION'
  | 'DATA_UNAVAILABLE'
  | 'SOURCE_ERROR'
  | 'VALIDATION_ERROR'
  | 'NEEDS_REVIEW'
  | 'SUPERSEDED';

export type AuthoritativeSourceCode =
  | 'FED'
  | 'FRED'
  | 'BLS'
  | 'BEA'
  | 'US_CENSUS'
  | 'US_TREASURY'
  | 'ECB'
  | 'BOE'
  | 'BOJ'
  | 'SNB'
  | 'BOC'
  | 'RBA'
  | 'RBNZ'
  | 'WGC'
  | 'EIA'
  | 'CME'
  | 'SEC'
  | 'CHAIN_NODE';

export interface AuthoritativeSourceInfo {
  code: AuthoritativeSourceCode;
  name: string;
  officialDomain: string;
  countryOrRegion: string;
  reliabilityRank: 1 | 2 | 3 | 4 | 5; // 5 = Sovereign / Central Bank Primary Authority
  supportedIndicatorsCount: number;
  connectionStatus: 'READY' | 'CONFIGURED' | 'PENDING_API_KEY' | 'OFFICIAL_DOC_EXTRACT';
  description: string;
}

export interface EconomicObservationRecord {
  asset: string;
  currency: string;
  indicator: string;
  category: string;
  value: number | null;
  unit: string;
  period: string;
  releaseDate: string | null;
  previousValue: number | null;
  forecastValue: number | null;
  actualValue: number | null;
  revision: number | null;
  sourceName: string;
  sourceUrl: string;
  provider: string;
  retrievalTimestamp: string;
  validationStatus: DataValidationStatus;
  dataFrequency: 'REAL_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  confidence: number; // 0 - 100
  createdAt: string;
  updatedAt: string;
}

export interface HistoricalDataPoint {
  period: string;
  date: string;
  value: number | null;
  validationStatus: DataValidationStatus;
  sourceTimestamp?: string;
}

export interface IndicatorDefinition {
  indicatorCode: string;
  indicatorName: string;
  asset: string;
  currency: string;
  category: string;
  unit: string;
  frequency: 'REAL_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  sourceName: string;
  sourceUrl: string;
  minPlausible?: number;
  maxPlausible?: number;
  maxStalenessDays: number;
}

export interface EconomicReleaseInfo {
  releaseId: string;
  releaseName: string;
  agency: string;
  scheduledTimeUtc: string;
  indicators: string[];
  isHighImpact: boolean;
  officialReleaseUrl: string;
}

export interface ValidationResult {
  isValid: boolean;
  status: DataValidationStatus;
  errors: string[];
  warnings: string[];
  checkedAt: string;
}

/**
 * Institutional Data Provider Contract
 * Replaceable and extensible for any authoritative source agency.
 */
export interface EconomicDataProvider {
  readonly providerId: string;
  readonly providerName: string;
  readonly authoritativeSource: AuthoritativeSourceCode;
  readonly isConnected: boolean;

  getIndicator(indicatorCode: string): Promise<IndicatorDefinition | null>;
  getHistoricalData(indicatorCode: string, startDate?: string, endDate?: string): Promise<HistoricalDataPoint[]>;
  getLatestObservation(indicatorCode: string): Promise<EconomicObservationRecord | null>;
  getRelease(releaseId: string): Promise<EconomicReleaseInfo | null>;
  validateObservation(observation: Partial<EconomicObservationRecord>, def?: IndicatorDefinition): ValidationResult;
}

/**
 * Authoritative Sovereign Statistical Agency Directory
 */
export const AUTHORITATIVE_SOURCES_DIRECTORY: AuthoritativeSourceInfo[] = [
  {
    code: 'FRED',
    name: 'Federal Reserve Bank of St. Louis (FRED)',
    officialDomain: 'fred.stlouisfed.org',
    countryOrRegion: 'United States',
    reliabilityRank: 5,
    supportedIndicatorsCount: 820,
    connectionStatus: 'READY',
    description: 'Premier macroeconomic database maintained by the Research Division of the Federal Reserve Bank of St. Louis.',
  },
  {
    code: 'BLS',
    name: 'U.S. Bureau of Labor Statistics',
    officialDomain: 'bls.gov',
    countryOrRegion: 'United States',
    reliabilityRank: 5,
    supportedIndicatorsCount: 140,
    connectionStatus: 'READY',
    description: 'Principal federal agency responsible for measuring labor market activity, CPI inflation, and productivity.',
  },
  {
    code: 'BEA',
    name: 'U.S. Bureau of Economic Analysis',
    officialDomain: 'bea.gov',
    countryOrRegion: 'United States',
    reliabilityRank: 5,
    supportedIndicatorsCount: 95,
    connectionStatus: 'READY',
    description: 'Produces official Gross Domestic Product (GDP), Core PCE Price Index, and corporate profits.',
  },
  {
    code: 'FED',
    name: 'Federal Reserve Board of Governors',
    officialDomain: 'federalreserve.gov',
    countryOrRegion: 'United States',
    reliabilityRank: 5,
    supportedIndicatorsCount: 45,
    connectionStatus: 'READY',
    description: 'Monetary policy actions, FOMC Economic Projections (Dot Plot), and H.4.1 Balance Sheet assets.',
  },
  {
    code: 'US_TREASURY',
    name: 'U.S. Department of the Treasury',
    officialDomain: 'home.treasury.gov',
    countryOrRegion: 'United States',
    reliabilityRank: 5,
    supportedIndicatorsCount: 30,
    connectionStatus: 'READY',
    description: 'Daily Treasury yield curve rates, TIPS real yields, and Treasury General Account (TGA) cash balances.',
  },
  {
    code: 'ECB',
    name: 'European Central Bank',
    officialDomain: 'ecb.europa.eu',
    countryOrRegion: 'Eurozone',
    reliabilityRank: 5,
    supportedIndicatorsCount: 110,
    connectionStatus: 'READY',
    description: 'Official deposit facility rate, Eurozone Harmonised Index of Consumer Prices (HICP), and ECB balance sheet.',
  },
  {
    code: 'BOE',
    name: 'Bank of England',
    officialDomain: 'bankofengland.co.uk',
    countryOrRegion: 'United Kingdom',
    reliabilityRank: 5,
    supportedIndicatorsCount: 85,
    connectionStatus: 'READY',
    description: 'Official Bank Rate, UK Monetary Policy Committee (MPC) voting distributions, and Gilt reserves.',
  },
  {
    code: 'BOJ',
    name: 'Bank of Japan',
    officialDomain: 'boj.or.jp',
    countryOrRegion: 'Japan',
    reliabilityRank: 5,
    supportedIndicatorsCount: 75,
    connectionStatus: 'READY',
    description: 'Uncollateralized overnight call rate, 10Y JGB Yield Curve Control targets, and Tankan economic sentiment.',
  },
  {
    code: 'SNB',
    name: 'Swiss National Bank',
    officialDomain: 'snb.ch',
    countryOrRegion: 'Switzerland',
    reliabilityRank: 5,
    supportedIndicatorsCount: 40,
    connectionStatus: 'READY',
    description: 'SNB policy interest rate, Swiss consumer price index, and official foreign currency reserve holdings.',
  },
  {
    code: 'BOC',
    name: 'Bank of Canada',
    officialDomain: 'bankofcanada.ca',
    countryOrRegion: 'Canada',
    reliabilityRank: 5,
    supportedIndicatorsCount: 60,
    connectionStatus: 'READY',
    description: 'Target for the overnight rate, Canadian CPI-median and CPI-trim inflation metrics, and Valet data feeds.',
  },
  {
    code: 'RBA',
    name: 'Reserve Bank of Australia',
    officialDomain: 'rba.gov.au',
    countryOrRegion: 'Australia',
    reliabilityRank: 5,
    supportedIndicatorsCount: 55,
    connectionStatus: 'READY',
    description: 'Cash Rate Target, Australian Trimmed Mean CPI, and commodity export price index.',
  },
  {
    code: 'RBNZ',
    name: 'Reserve Bank of New Zealand',
    officialDomain: 'rbnz.govt.nz',
    countryOrRegion: 'New Zealand',
    reliabilityRank: 5,
    supportedIndicatorsCount: 45,
    connectionStatus: 'READY',
    description: 'Official Cash Rate (OCR), New Zealand CPI, sectoral factor model inflation, and macroprudential data.',
  },
  {
    code: 'WGC',
    name: 'World Gold Council',
    officialDomain: 'gold.org',
    countryOrRegion: 'Global',
    reliabilityRank: 4,
    supportedIndicatorsCount: 20,
    connectionStatus: 'READY',
    description: 'Central bank quarterly net gold purchases, global gold supply/demand balance, and ETF physically backed holdings.',
  },
  {
    code: 'EIA',
    name: 'U.S. Energy Information Administration',
    officialDomain: 'eia.gov',
    countryOrRegion: 'United States / Global',
    reliabilityRank: 5,
    supportedIndicatorsCount: 50,
    connectionStatus: 'READY',
    description: 'Weekly Petroleum Status Report, U.S. crude oil inventory build/draw surprises, and Strategic Petroleum Reserve levels.',
  },
];

/**
 * Standard deterministic Observation Validator
 * Evaluates whether an economic observation meets strict institutional data integrity rules.
 */
export function validateObservationRecord(
  obs: Partial<EconomicObservationRecord>,
  def?: IndicatorDefinition
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!obs.indicator) errors.push('Missing indicator code');
  if (!obs.currency && !obs.asset) errors.push('Missing currency or asset reference');
  if (!obs.sourceName) errors.push('Missing authoritative source agency name');
  if (!obs.period) errors.push('Missing observation reference period (e.g. 2026-Q1, 2026-09)');

  if (obs.actualValue === null || obs.actualValue === undefined) {
    return {
      isValid: false,
      status: 'DATA_UNAVAILABLE',
      errors: ['Official actual value is not available or unreleased'],
      warnings: [],
      checkedAt: new Date().toISOString(),
    };
  }

  if (typeof obs.actualValue !== 'number' || isNaN(obs.actualValue)) {
    errors.push('Actual value must be a valid numeric figure');
  }

  // Plausible range verification
  if (def && typeof obs.actualValue === 'number') {
    if (def.minPlausible !== undefined && obs.actualValue < def.minPlausible) {
      errors.push(`Value ${obs.actualValue} is below plausible lower bound of ${def.minPlausible}`);
    }
    if (def.maxPlausible !== undefined && obs.actualValue > def.maxPlausible) {
      errors.push(`Value ${obs.actualValue} is above plausible upper bound of ${def.maxPlausible}`);
    }
  }

  // Staleness check
  if (def?.maxStalenessDays && obs.releaseDate) {
    const releaseTime = new Date(obs.releaseDate).getTime();
    const now = Date.now();
    const ageDays = (now - releaseTime) / (1000 * 60 * 60 * 24);
    if (ageDays > def.maxStalenessDays) {
      warnings.push(`Data is ${Math.round(ageDays)} days old, exceeding ${def.maxStalenessDays} staleness limit`);
    }
  }

  const isValid = errors.length === 0;
  const status: DataValidationStatus = isValid
    ? warnings.length > 0
      ? 'NEEDS_REVIEW'
      : 'VERIFIED'
    : 'VALIDATION_ERROR';

  return {
    isValid,
    status,
    errors,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}
