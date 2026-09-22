export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'NZD';

export type IndicatorCategory =
  | 'INFLATION'
  | 'EMPLOYMENT'
  | 'GROWTH'
  | 'CONSUMER'
  | 'BUSINESS_ACTIVITY'
  | 'HOUSING'
  | 'TRADE_EXTERNAL'
  | 'FISCAL'
  | 'MONETARY_POLICY'
  | 'RATES_YIELDS'
  | 'COT_POSITIONING'
  | 'SENTIMENT'
  | 'COMMODITY_DRIVER';

export type MeasurementFrequency =
  | 'Monthly'
  | 'Quarterly'
  | 'Weekly'
  | 'Bi-Weekly'
  | 'Annual'
  | 'Daily';

export type MeasurementPeriodType =
  | 'Year-over-Year (YoY) %'
  | 'Month-over-Month (MoM) %'
  | 'Quarter-over-Quarter (QoQ) %'
  | 'Annualized QoQ %'
  | 'Index Level (Points)'
  | 'Policy Rate %'
  | 'Rate Level'
  | 'Yield %'
  | 'Percentage (%)'
  | 'Net Amount (Billion USD)'
  | 'Net Amount (Billion Local)'
  | 'EUR Billions (Bn)'
  | 'CHF Billions (Bn)'
  | 'NZD Billions (Bn)'
  | 'Balance Points'
  | 'Net Balance Points'
  | 'Net Thousands (k)'
  | 'Futures Contracts';

export type ScoringDirection =
  | 'HIGHER_IS_BULLISH'      // e.g. GDP, Employment, Retail Sales, Rates
  | 'LOWER_IS_BULLISH'       // e.g. Unemployment Rate, Claims
  | 'INFLATION_POLICY_PATH'  // Above target increases policy rates (bullish currency), extreme overheating negative
  | 'CONTRARIAN_EXTREMES'    // Heavy net long crowding flips to bearish reversal risk
  | 'EXTERNAL_BALANCE';      // Trade surpluses supportive, widening deficits negative

export interface IndicatorDefinition {
  id: string;
  code: string;
  currency: CurrencyCode;
  category: IndicatorCategory;
  name: string;
  shortLabel: string;
  frequency: MeasurementFrequency;
  measurementPeriod: MeasurementPeriodType;
  unit: string;
  isSeasonallyAdjusted: boolean;
  requiredFields: string[];
  description: string;
  whyItMatters: string;
  interpretationRules: string;
  scoringDirection: ScoringDirection;
  benchmarkTarget?: number;
  weightInCategory: number;
  officialSourceName: string;
  officialSourceUrl: string;
  historicalSurpriseStdDev: number; // For standardized surprise z-score
  isCurrencySpecificDriver?: boolean;
  driverDescription?: string;
  isActive: boolean;
  required?: boolean;
}

export interface BacktestRuleConfig {
  bullishThreshold: number;
  strongBullishThreshold: number;
  bearishThreshold: number;
  strongBearishThreshold: number;
  minDataCoverage?: number;
}

export interface IndicatorObservation {
  id: string;
  indicatorId: string;
  currency: CurrencyCode;
  referencePeriod: string;
  releaseDate: string;
  actual: number;
  forecast: number | null;
  previous: number | null;
  revisedPrevious?: number | null;
  unit?: string;
  isSeasonallyAdjusted?: boolean;
  sourceUrl?: string;
  notes?: string;
  updatedAt: string;
  revisions?: {
    date: string;
    originalActual: number;
    revisedActual: number;
    note?: string;
  }[];
}

export interface CotPositioningRecord {
  id: string;
  currency: CurrencyCode;
  contractName: string;
  reportDate: string;
  releaseDate: string;
  openInterest: number;
  // Non-Commercial (Large Speculators / Hedge Funds)
  nonCommercialLong?: number;
  nonCommercialShort?: number;
  nonCommercialSpreading?: number;
  // Commercial (Commercial Hedgers / Producers / Users)
  commercialLong?: number;
  commercialShort?: number;
  // Disaggregated breakdown
  dealerLong: number;
  dealerShort: number;
  assetManagerLong: number;
  assetManagerShort: number;
  leveragedFundsLong: number;
  leveragedFundsShort: number;
  otherReportablesLong: number;
  otherReportablesShort: number;
  nonReportableLong: number;
  nonReportableShort: number;
  notes?: string;
  sourceUrl: string;
  previousNetPosition?: number;
  previousOpenInterest?: number;
  updatedAt: string;
}

export interface MarketSentimentRecord {
  id: string;
  currency: CurrencyCode;
  globalRiskRegime: 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
  currencySentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  newsSentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  centralBankTone: 'HAWKISH' | 'NEUTRAL' | 'DOVISH';
  sentimentConfidence: number; // 0 - 100
  source: string;
  date: string;
  time: string;
  notes: string;
  updatedAt: string;
}

export interface InterestRateRecord {
  currency: CurrencyCode;
  centralBankName: string;
  currentPolicyRate: number;
  previousPolicyRate: number;
  expectedNextRate: number;
  expectedRateChangeBps: number;
  nextMeetingDate: string;
  centralBankBias: 'HAWKISH' | 'NEUTRAL' | 'DOVISH';
  recentGuidance: string;
  balanceSheetDirection: 'EXPANDING' | 'NEUTRAL' | 'CONTRACTING_QT';
  yield2Y: number;
  yield5Y: number;
  yield10Y: number;
  realYield10Y?: number;
  sourceUrl: string;
  updatedAt: string;
}

export interface CommodityObservation {
  id: string;
  symbol: 'GOLD' | 'CRUDE_OIL' | 'SILVER';
  name: string;
  referenceDate: string;
  price: number;
  // Specific drivers:
  usRealYield10Y?: number;
  nominal10YYield?: number;
  dxyIndex?: number;
  fedExpectedRate?: number;
  inflationBreakeven5Y?: number;
  centralBankDemandTone?: 'AGGRESSIVE_BUYING' | 'STEADY' | 'SLOW';
  industrialDemandTone?: 'STRONG' | 'NEUTRAL' | 'WEAK';
  geopoliticalRiskLevel?: 'HIGH' | 'MODERATE' | 'LOW';
  // Oil specific drivers:
  supplyDemandBalance?: 'SURPLUS' | 'BALANCED' | 'DEFICIT';
  inventoriesWeeklySurpriseMb?: number;
  opecPolicyTone?: 'DEFENDING_FLOOR' | 'STEADY_PRODUCTION' | 'EXPANDING_SUPPLY';
  cotNetPosition?: number;
  notes?: string;
  updatedAt: string;
}

export interface ModelCategoryWeights {
  MONETARY_POLICY: number;     // e.g. 20
  INFLATION: number;           // e.g. 15
  GROWTH: number;              // e.g. 15
  EMPLOYMENT: number;          // e.g. 10
  RATES_YIELDS: number;        // e.g. 10
  BUSINESS_ACTIVITY: number;   // e.g. 8
  CONSUMER: number;            // e.g. 5
  TRADE_EXTERNAL: number;      // e.g. 5
  COT_POSITIONING: number;     // e.g. 5
  SENTIMENT: number;           // e.g. 5
  HOUSING: number;             // e.g. 1
  FISCAL: number;              // e.g. 1
}

export interface IndicatorScoreResult {
  indicatorId: string;
  definition: IndicatorDefinition;
  observation?: IndicatorObservation;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  surprise: number | null;
  change: number | null;
  standardizedSurprise: number | null;
  score: number; // -100 to +100
  weightedContribution: number;
  interpretationText: string;
  status: 'CURRENT' | 'RECENT' | 'STALE' | 'MISSING';
  ageDays: number;
}

export interface CategoryScoreResult {
  category: IndicatorCategory;
  categoryLabel: string;
  score: number; // -100 to +100
  weight: number;
  weightedContribution: number; // (score * weight) / 100
  indicatorCount: number;
  activeCount: number;
  indicators: IndicatorScoreResult[];
}

export interface CurrencyScoreResult {
  currency: CurrencyCode;
  currencyName: string;
  score: number; // -100 to +100
  finalCompositeScore?: number;
  categoryScores: Record<IndicatorCategory, CategoryScoreResult>;
  dataCoveragePercent: number;
  completedIndicators: number;
  totalIndicators: number;
  freshnessStatus: 'CURRENT' | 'PARTIAL' | 'STALE' | 'INCOMPLETE';
  conflictingFactors: string[];
  primarySupport: string[];
  primaryDrivers?: string[];
  assessmentLabel: string;
  interestRateLevel?: number;
  tenYearBondYield?: number;
  modelVersion: string;
  weightsVersion: string;
  calculatedAt: string;
}

export interface PairDifferentialResult {
  pair: string;
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  baseScore: number;
  quoteScore: number;
  differential: number; // baseScore - quoteScore (-200 to +200)
  netDifferential?: number;
  cotDifferential: number;
  sentimentDifferential: number;
  interestRateDifferential: number;
  interestRateSpread?: number;
  tenYearSpread?: number;
  dataCoveragePercent: number;
  conflictLevel: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL_MIXED' | 'BEARISH' | 'STRONG_BEARISH';
  biasLabel: string;
  fundamentalBias?: string;
  primaryDrivers: string[];
  conflicts: string[];
  aiExplanation?: string;
}

export interface FundamentalModelSnapshot {
  id: string;
  title: string;
  timestamp: number;
  dateStr: string;
  modelVersion: string;
  weightsVersion: string;
  createdBy: string;
  notes?: string;
  currencyScores: Record<CurrencyCode, number>;
  pairDifferentials: Record<string, number>;
  observationsCount: number;
}

export interface CotDetailRecord {
  id: string;
  currency: CurrencyCode | 'XAU' | 'XAG' | 'WTI';
  contractName: string;
  reportDate: string;
  releaseDate: string;
  // Raw fields entered manually
  dealerLong: number;
  dealerShort: number;
  assetManagerLong: number;
  assetManagerShort: number;
  leveragedFundsLong: number;
  leveragedFundsShort: number;
  otherReportablesLong: number;
  otherReportablesShort: number;
  nonReportableLong: number;
  nonReportableShort: number;
  openInterest: number;
  previousOpenInterest?: number;
  previousNetPosition?: number;
  sourceUrl: string;
  notes?: string;
  updatedAt: string;
  // Auto-calculated fields
  netPosition: number;
  longPercent: number;
  shortPercent: number;
  weeklyChange: number;
  openInterestChange: number;
  positioningScore: number; // -100 to +100
  historicalPercentile: number; // 0 to 100
  cotDirection: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  positioningExtreme: 'HIGH_CROWDED_LONG' | 'NORMAL' | 'HIGH_CROWDED_SHORT';
  positioningMomentum: 'INCREASING_LONG' | 'STABLE' | 'INCREASING_SHORT';
  interpretation: string;
}

export interface PairSentimentRecord {
  id: string;
  pair: string;
  longPercent: number;
  shortPercent: number;
  longVolume: number;
  shortVolume: number;
  longPositions: number;
  shortPositions: number;
  reportTimestamp: string;
  source: string;
  sourceUrl: string;
  notes?: string;
  // Auto-calculated fields
  longShortRatio: number;
  netSentiment: number; // % Long - % Short
  sentimentScore: number; // Normalized -100 to +100 (contrarian)
  sentimentRegime: 'CROWD_LONG_BEARISH_EDGE' | 'NEUTRAL' | 'CROWD_SHORT_BULLISH_EDGE';
  updatedAt: string;
}

export interface CommodityDetailState {
  symbol: 'GOLD' | 'SILVER' | 'CRUDE_OIL';
  name: string;
  price: number;
  referenceDate: string;
  sourceUrl: string;
  // Gold inputs
  usRealYield10Y?: number;
  us10YYield?: number;
  us2YYield?: number;
  inflationBreakeven10Y?: number;
  fedExpectedRate?: number;
  centralBankNetDemandTonnes?: number;
  cotManagedMoneyNet?: number;
  riskSentiment?: 'RISK_OFF' | 'NEUTRAL' | 'RISK_ON';
  geopoliticalRisk?: 'HIGH' | 'MODERATE' | 'LOW';
  etfFlowsTonnes?: number;
  physicalDemandTone?: 'ROBUST' | 'MODERATE' | 'WEAK';
  // Silver inputs
  industrialDemandIndex?: number;
  globalGrowthPmi?: number;
  chinaIndustrialDemand?: 'STRONG' | 'MODERATE' | 'SLUGGISH';
  mineSupplyGrowthYoY?: number;
  goldSilverRatio?: number;
  // Oil inputs
  globalDemandGrowthMbd?: number;
  usDemandMbd?: number;
  chinaDemandGrowthMbd?: number;
  opecProductionMbd?: number;
  opecQuotaCompliancePercent?: number;
  nonOpecSupplyGrowthMbd?: number;
  usCrudeProductionMbd?: number;
  usInventoriesSurpriseMb?: number;
  sprInventoryMb?: number;
  refineryUtilizationPercent?: number;
  supplyDisruptionsMbd?: number;
  geopoliticalRiskPremiumUsd?: number;
  // Auto calculated
  score: number;
  bias: 'STRONGLY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONGLY_BEARISH';
  relativePairBias?: string; // e.g. "XAU/USD: Bullish (Gold Macro Environment Outperforming USD)"
  drivers: { label: string; score: number; impact: string }[];
}

export interface LongTermPairOutlook {
  pair: string;
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  shortTermDiff: number;
  mediumTermDiff: number;
  longTermDiff: number;
  structuralFactors: {
    monetaryPolicyRegime: number;
    inflationTrend: number;
    growthTrend: number;
    productivity: number;
    externalBalance: number;
    termsOfTrade: number;
    realRateDifferential: number;
    longTermCot: number;
    structuralCommodityExposure: number;
  };
  bias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  structuralRationale: string;
}

export interface ReproducibleSnapshotMeta {
  snapshotId: string;
  createdAt: string;
  label: string;
  notes?: string;
  modelVersion: string;
  indicatorConfigVersion: string;
  weightVersion: string;
  rawDataVersion: string;
  observationsCount: number;
  currencyScores: Record<CurrencyCode, number>;
  pairDifferentials: Record<string, number>;
}


// Compatibility Aliases
export type EconomicCategory = IndicatorCategory;
export type CategoryWeightConfig = ModelCategoryWeights;
export type CurrencyFundamentalScoreResult = CurrencyScoreResult;
export type MarketSentimentOverview = MarketSentimentRecord[];
