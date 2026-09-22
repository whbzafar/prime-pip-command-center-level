import {
  IndicatorObservation,
  CotPositioningRecord,
  MarketSentimentRecord,
  InterestRateRecord,
  CommodityObservation,
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

export const DEFAULT_SENTIMENT_RECORDS: MarketSentimentRecord[] = [];

export const DEFAULT_INTEREST_RATES: InterestRateRecord[] = [];

export const DEFAULT_COMMODITY_OBSERVATIONS: CommodityObservation[] = [
  { id: 'comm_gold', symbol: 'GOLD', name: 'Gold (XAU/USD)', referenceDate: '', price: 0, notes: '', updatedAt: '' },
  { id: 'comm_silver', symbol: 'SILVER', name: 'Silver (XAG/USD)', referenceDate: '', price: 0, notes: '', updatedAt: '' },
  { id: 'comm_oil', symbol: 'CRUDE_OIL', name: 'Crude Oil (WTI)', referenceDate: '', price: 0, notes: '', updatedAt: '' },
];

export const DEFAULT_COT_REPORTS = DEFAULT_COT_RECORDS;
export const DEFAULT_SENTIMENT_OVERVIEW = DEFAULT_SENTIMENT_RECORDS;
