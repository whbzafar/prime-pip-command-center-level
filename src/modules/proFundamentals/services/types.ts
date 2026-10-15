import {
  CurrencyCode,
  CurrencyFundamentalProfile,
  CurrencySummaryItem,
  Horizon,
  PairFundamentalProfile,
  PairOpportunity,
  HistoricalScorePoint,
} from '../types';

export interface FundamentalsDataService {
  /**
   * Retrieves summary scores, bullish %, and rank for all 8 major currencies
   */
  getCurrencyScores(horizon: Horizon): Promise<CurrencySummaryItem[]>;

  /**
   * Retrieves full profile including 7 pillars, drivers, and indicators for a specific currency
   */
  getCurrencyDetail(code: CurrencyCode): Promise<CurrencyFundamentalProfile>;

  /**
   * Dynamically evaluates a pair: base score minus quote score
   */
  getPairDetail(base: CurrencyCode, quote: CurrencyCode): Promise<PairFundamentalProfile>;

  /**
   * Retrieves 30-day historical time series for chart display
   */
  getHistory(code: CurrencyCode, days?: number): Promise<HistoricalScorePoint[]>;

  /**
   * Returns ranked currency pair opportunities by score divergence
   */
  getOpportunities(horizon: Horizon): Promise<PairOpportunity[]>;

  /**
   * Returns metadata about the data source and freshness
   */
  getMetadata(): Promise<{
    isDemo: boolean;
    lastUpdated: string;
    source: string;
  }>;
}
