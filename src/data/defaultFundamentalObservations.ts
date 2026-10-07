import {
  IndicatorObservation,
  CotPositioningRecord,
  PairSentimentRecord,
  MarketSentimentRecord,
  InterestRateRecord,
  CommodityObservation,
  RetailPositioningRecord,
  CurrencyCode,
} from '../types/fundamentalIndicatorTypes';
import { OFFICIAL_INDICATOR_REGISTRY } from './fundamentalRegistryData';
import { VERIFIED_RATES } from './verifiedFundamentalBaselines';

export const DEFAULT_OBSERVATIONS: IndicatorObservation[] = OFFICIAL_INDICATOR_REGISTRY.map((def) => ({
  id: `obs_${def.id}`,
  indicatorId: def.id,
  indicatorName: def.name,
  currency: def.currency,
  category: def.category,
  frequency: def.frequency,
  referencePeriod: '',
  releaseDate: '',
  actual: null,
  forecast: null,
  previous: null,
  revisedPrevious: null,
  unit: def.unit || '',
  dataSource: '',
  sourceName: '',
  sourceUrl: '',
  sourceType: '',
  verificationStatus: 'NOT_FOUND',
  dataStatus: 'UNAVAILABLE',
  confidence: 0,
  notes: 'No fresh official observation has been retrieved yet.',
  updatedAt: '',
  isEntered: false,
}));

export const DEFAULT_INTEREST_RATES: InterestRateRecord[] = Object.values(VERIFIED_RATES).map((r) => ({
  currency: r.currency as CurrencyCode,
  centralBankName: r.centralBankName,
  currentPolicyRate: 0,
  previousPolicyRate: 0,
  expectedNextRate: 0,
  expectedRateChangeBps: 0,
  nextMeetingDate: '',
  centralBankBias: 'NEUTRAL',
  recentGuidance: '',
  balanceSheetDirection: 'NEUTRAL',
  yield2Y: 0,
  yield5Y: 0,
  yield10Y: 0,
  sourceUrl: '',
  updatedAt: '',
  sourceDate: '',
  verifiedFields: [],
  isEntered: false,
}));

export const DEFAULT_COMMODITY_OBSERVATIONS: CommodityObservation[] = (['GOLD', 'SILVER', 'CRUDE_OIL'] as const).map((symbol) => ({
  id: `comm_${symbol.toLowerCase()}`,
  symbol,
  name: symbol === 'GOLD' ? 'Gold (XAU/USD)' : symbol === 'SILVER' ? 'Silver (XAG/USD)' : 'Crude Oil (WTI)',
  referenceDate: '',
  price: 0,
  notes: 'No fresh official quote has been retrieved yet.',
  updatedAt: '',
}));

export interface MultiAssetFundamentalRecord {
  id: string;
  symbol: string;
  name: string;
  category: 'INDEX' | 'STOCK' | 'CRYPTO';
  price: number;
  priceUnit: string;
  changePercent: number;
  score: number; // -100 to +100
  bias: 'STRONG BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG BEARISH';
  confidence: number;
  keyMetric1Label: string;
  keyMetric1Value: string;
  keyMetric2Label: string;
  keyMetric2Value: string;
  keyMetric3Label: string;
  keyMetric3Value: string;
  macroCorrelation: string;
  drivers: string[];
  sourceName: string;
  sourceUrl: string;
  updatedAt: string;
  verificationStatus: 'VERIFIED';
}

export const DEFAULT_MULTI_ASSET_FUNDAMENTALS: MultiAssetFundamentalRecord[] = [];

export const DEFAULT_PAIR_SENTIMENT_RECORDS: PairSentimentRecord[] = [];
export const DEFAULT_COT_RECORDS: CotPositioningRecord[] = [];
export const DEFAULT_SENTIMENT_RECORDS: MarketSentimentRecord[] = [];
export const DEFAULT_RETAIL_POSITIONING: RetailPositioningRecord[] = [];
export const DEFAULT_COT_REPORTS: CotPositioningRecord[] = DEFAULT_COT_RECORDS;
export const DEFAULT_SENTIMENT_OVERVIEW: MarketSentimentRecord[] = DEFAULT_SENTIMENT_RECORDS;
