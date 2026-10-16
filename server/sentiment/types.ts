export type AssetClass = 'CRYPTO' | 'FOREX' | 'INDICES' | 'COMMODITIES';

export type ProviderHealth = 'LIVE' | 'STALE' | 'DOWN' | 'DISCONNECTED';

export interface NormalizedSentimentItem {
  symbol: string;
  assetClass: AssetClass;
  longPct: number;
  shortPct: number;
  source: string;
  traderGroup: string; // e.g. "Myfxbook forex traders", "Binance crypto-futures traders"
  disclaimer?: string; // e.g. "Free data, may be delayed up to 60 minutes."
  sourceUrl: string; // The exact URL queried
  fetchedAt: number; // Exact fetch timestamp in ms
  rawPayload?: any; // The raw unmanipulated JSON object/fields from the provider API
  timestamp: number;
  change1hPct?: number; // Difference in longPct vs ~1 hour ago
  isStale?: boolean;
  isUnavailable?: boolean;
  notProvided?: boolean; // True when symbol is recognized in universe but not returned by source
}

export interface SentimentSnapshot {
  symbol: string;
  assetClass: AssetClass;
  longPct: number;
  shortPct: number;
  source: string;
  traderGroup?: string;
  timestamp: number;
}

export interface ProviderHealthStatus {
  id: string;
  name: string;
  assetClasses: AssetClass[];
  status: ProviderHealth;
  lastSuccessTime: number | null;
  lastAttemptTime: number | null;
  lastError: string | null;
  consecutiveFailures: number;
  requestCountToday: number;
  refreshIntervalMs: number;
  notes?: string;
}

export interface SentimentResponse {
  items: NormalizedSentimentItem[];
  providers: ProviderHealthStatus[];
  lastUpdated: number;
}

export interface SentimentHistoryResponse {
  symbol: string;
  current: NormalizedSentimentItem | null;
  history: SentimentSnapshot[];
}
