import {
  IndicatorObservation,
  CotPositioningRecord,
  MarketSentimentRecord,
  InterestRateRecord,
  CommodityObservation,
  RetailPositioningRecord,
} from '../types/fundamentalIndicatorTypes';

export const DEFAULT_OBSERVATIONS: IndicatorObservation[] = [];

export const DEFAULT_COT_RECORDS: CotPositioningRecord[] = [
  { id: 'cot_usd', currency: 'USD', contractName: 'U.S. Dollar Index Futures (ICE)', reportDate: '', releaseDate: '', openInterest: 0, nonCommercialLong: 0, nonCommercialShort: 0, commercialLong: 0, commercialShort: 0, dealerLong: 0, dealerShort: 0, assetManagerLong: 0, assetManagerShort: 0, leveragedFundsLong: 0, leveragedFundsShort: 0, otherReportablesLong: 0, otherReportablesShort: 0, nonReportableLong: 0, nonReportableShort: 0, sourceUrl: 'https://www.tradingster.com/cot', notes: '', updatedAt: '' },
  { id: 'cot_eur', currency: 'EUR', contractName: 'Euro FX Futures (CME)', reportDate: '', releaseDate: '', openInterest: 0, nonCommercialLong: 0, nonCommercialShort: 0, commercialLong: 0, commercialShort: 0, dealerLong: 0, dealerShort: 0, assetManagerLong: 0, assetManagerShort: 0, leveragedFundsLong: 0, leveragedFundsShort: 0, otherReportablesLong: 0, otherReportablesShort: 0, nonReportableLong: 0, nonReportableShort: 0, sourceUrl: 'https://www.tradingster.com/cot', notes: '', updatedAt: '' },
  { id: 'cot_gbp', currency: 'GBP', contractName: 'British Pound Futures (CME)', reportDate: '', releaseDate: '', openInterest: 0, nonCommercialLong: 0, nonCommercialShort: 0, commercialLong: 0, commercialShort: 0, dealerLong: 0, dealerShort: 0, assetManagerLong: 0, assetManagerShort: 0, leveragedFundsLong: 0, leveragedFundsShort: 0, otherReportablesLong: 0, otherReportablesShort: 0, nonReportableLong: 0, nonReportableShort: 0, sourceUrl: 'https://www.tradingster.com/cot', notes: '', updatedAt: '' },
  { id: 'cot_jpy', currency: 'JPY', contractName: 'Japanese Yen Futures (CME)', reportDate: '', releaseDate: '', openInterest: 0, nonCommercialLong: 0, nonCommercialShort: 0, commercialLong: 0, commercialShort: 0, dealerLong: 0, dealerShort: 0, assetManagerLong: 0, assetManagerShort: 0, leveragedFundsLong: 0, leveragedFundsShort: 0, otherReportablesLong: 0, otherReportablesShort: 0, nonReportableLong: 0, nonReportableShort: 0, sourceUrl: 'https://www.tradingster.com/cot', notes: '', updatedAt: '' },
  { id: 'cot_chf', currency: 'CHF', contractName: 'Swiss Franc Futures (CME)', reportDate: '', releaseDate: '', openInterest: 0, nonCommercialLong: 0, nonCommercialShort: 0, commercialLong: 0, commercialShort: 0, dealerLong: 0, dealerShort: 0, assetManagerLong: 0, assetManagerShort: 0, leveragedFundsLong: 0, leveragedFundsShort: 0, otherReportablesLong: 0, otherReportablesShort: 0, nonReportableLong: 0, nonReportableShort: 0, sourceUrl: 'https://www.tradingster.com/cot', notes: '', updatedAt: '' },
  { id: 'cot_cad', currency: 'CAD', contractName: 'Canadian Dollar Futures (CME)', reportDate: '', releaseDate: '', openInterest: 0, nonCommercialLong: 0, nonCommercialShort: 0, commercialLong: 0, commercialShort: 0, dealerLong: 0, dealerShort: 0, assetManagerLong: 0, assetManagerShort: 0, leveragedFundsLong: 0, leveragedFundsShort: 0, otherReportablesLong: 0, otherReportablesShort: 0, nonReportableLong: 0, nonReportableShort: 0, sourceUrl: 'https://www.tradingster.com/cot', notes: '', updatedAt: '' },
  { id: 'cot_aud', currency: 'AUD', contractName: 'Australian Dollar Futures (CME)', reportDate: '', releaseDate: '', openInterest: 0, nonCommercialLong: 0, nonCommercialShort: 0, commercialLong: 0, commercialShort: 0, dealerLong: 0, dealerShort: 0, assetManagerLong: 0, assetManagerShort: 0, leveragedFundsLong: 0, leveragedFundsShort: 0, otherReportablesLong: 0, otherReportablesShort: 0, nonReportableLong: 0, nonReportableShort: 0, sourceUrl: 'https://www.tradingster.com/cot', notes: '', updatedAt: '' },
  { id: 'cot_nzd', currency: 'NZD', contractName: 'New Zealand Dollar Futures (CME)', reportDate: '', releaseDate: '', openInterest: 0, nonCommercialLong: 0, nonCommercialShort: 0, commercialLong: 0, commercialShort: 0, dealerLong: 0, dealerShort: 0, assetManagerLong: 0, assetManagerShort: 0, leveragedFundsLong: 0, leveragedFundsShort: 0, otherReportablesLong: 0, otherReportablesShort: 0, nonReportableLong: 0, nonReportableShort: 0, sourceUrl: 'https://www.tradingster.com/cot', notes: '', updatedAt: '' },
];

export const DEFAULT_RETAIL_POSITIONING: RetailPositioningRecord[] = [
  ...(['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD'] as const).map((asset) => ({
    asset,
    longPercent: 0,
    shortPercent: 0,
    updatedAt: '',
    isEntered: false,
  })),
  { asset: 'GOLD', longPercent: 0, shortPercent: 0, updatedAt: '', isEntered: false },
  { asset: 'SILVER', longPercent: 0, shortPercent: 0, updatedAt: '', isEntered: false },
  { asset: 'CRUDE_OIL', longPercent: 0, shortPercent: 0, updatedAt: '', isEntered: false },
];

export const DEFAULT_SENTIMENT_RECORDS: MarketSentimentRecord[] = [
  ...(['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD'] as const).map((currency) => ({
    id: 'sent_' + currency.toLowerCase(),
    currency,
    globalRiskRegime: 'NEUTRAL' as const,
    currencySentiment: 'NEUTRAL' as const,
    newsSentiment: 'NEUTRAL' as const,
    centralBankTone: 'NEUTRAL' as const,
    sentimentConfidence: 0,
    source: 'Manual input required',
    date: '',
    time: '',
    notes: '',
    updatedAt: '',
    isEntered: false,
  })),
];

const RATE_SOURCES: Record<string, string> = {
  USD: 'https://www.federalreserve.gov/monetarypolicy/fomc.htm',
  EUR: 'https://www.ecb.europa.eu/press/govcdec/mopo/html/index.en.html',
  GBP: 'https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes',
  JPY: 'https://www.boj.or.jp/en/mopo/mpmdeci/index.htm',
  CHF: 'https://www.snb.ch/en/the-snb/mandates-goals/monetary-policy',
  CAD: 'https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/',
  AUD: 'https://www.rba.gov.au/monetary-policy/rba-board-decisions/',
  NZD: 'https://www.rbnz.govt.nz/monetary-policy/official-cash-rate-decisions',
};

const RATE_BANKS: Record<string, string> = {
  USD: 'Federal Reserve',
  EUR: 'European Central Bank',
  GBP: 'Bank of England',
  JPY: 'Bank of Japan',
  CHF: 'Swiss National Bank',
  CAD: 'Bank of Canada',
  AUD: 'Reserve Bank of Australia',
  NZD: 'Reserve Bank of New Zealand',
};

export const DEFAULT_INTEREST_RATES: InterestRateRecord[] =
  (['USD','EUR','GBP','JPY','CHF','CAD','AUD','NZD'] as const).map((currency) => ({
    currency,
    centralBankName: RATE_BANKS[currency],
    currentPolicyRate: 0,
    previousPolicyRate: 0,
    expectedNextRate: 0,
    expectedRateChangeBps: 0,
    nextMeetingDate: '',
    centralBankBias: 'NEUTRAL' as const,
    recentGuidance: '',
    balanceSheetDirection: 'NEUTRAL' as const,
    yield2Y: 0,
    yield5Y: 0,
    yield10Y: 0,
    realYield10Y: undefined,
    sourceUrl: RATE_SOURCES[currency],
    updatedAt: '',
    isEntered: false,
  }));

export const DEFAULT_COMMODITY_OBSERVATIONS: CommodityObservation[] = [
  { id: 'comm_gold', symbol: 'GOLD', name: 'Gold (XAU/USD)', referenceDate: '', price: 0, notes: '', updatedAt: '' },
  { id: 'comm_silver', symbol: 'SILVER', name: 'Silver (XAG/USD)', referenceDate: '', price: 0, notes: '', updatedAt: '' },
  { id: 'comm_oil', symbol: 'CRUDE_OIL', name: 'Crude Oil (WTI)', referenceDate: '', price: 0, notes: '', updatedAt: '' },
];

export const DEFAULT_COT_REPORTS = DEFAULT_COT_RECORDS;
export const DEFAULT_SENTIMENT_OVERVIEW = DEFAULT_SENTIMENT_RECORDS;
