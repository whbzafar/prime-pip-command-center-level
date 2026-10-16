import { SentimentProvider } from './types.js';
import { NormalizedSentimentItem, ProviderHealthStatus } from '../types.js';
import { validateSentimentItem, CircuitBreaker, fetchWithRetry } from '../validation.js';
import { normalizeSymbol } from '../symbolMapping.js';

// Strictly Crypto ONLY - No commodities or non-crypto instruments allowed here
export const CRYPTO_TARGET_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'BNBUSDT',
  'DOGEUSDT',
  'ADAUSDT',
  'LINKUSDT',
];

interface BinanceLSRatioItem {
  symbol: string;
  longAccount: string;
  shortAccount: string;
  longShortRatio: string;
  timestamp: number;
}

interface BybitResponse {
  retCode: number;
  retMsg: string;
  result?: {
    list?: Array<{
      symbol: string;
      buyRatio: string;
      sellRatio: string;
      timestamp: string;
    }>;
  };
}

/**
 * Pure parser for Binance Futures account ratio response
 */
export function parseBinanceCryptoItem(raw: any, targetSymbol: string, sourceUrl = ''): NormalizedSentimentItem | null {
  if (!raw) return null;
  const item: BinanceLSRatioItem = Array.isArray(raw) ? raw[0] : raw;
  if (!item || !item.longAccount || !item.shortAccount) return null;

  const longRaw = parseFloat(item.longAccount);
  const shortRaw = parseFloat(item.shortAccount);
  if (Number.isNaN(longRaw) || Number.isNaN(shortRaw)) return null;

  const longPct = Number((longRaw * 100).toFixed(1));
  const shortPct = Number((shortRaw * 100).toFixed(1));

  const cleanSym = normalizeSymbol(item.symbol || targetSymbol);

  const validated = validateSentimentItem({
    symbol: cleanSym,
    assetClass: 'CRYPTO',
    longPct,
    shortPct,
    source: 'Binance Futures',
    traderGroup: 'Binance crypto-futures traders',
    sourceUrl: sourceUrl || `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${cleanSym}&period=5m&limit=1`,
    fetchedAt: Date.now(),
    rawPayload: item,
    timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
  });

  return validated.isValid && validated.sanitized ? validated.sanitized : null;
}

/**
 * Pure parser for Bybit account ratio response
 */
export function parseBybitCryptoItem(raw: any, targetSymbol: string, sourceUrl = ''): NormalizedSentimentItem | null {
  if (!raw) return null;
  const res: BybitResponse = raw;
  const item = res.result?.list?.[0];
  if (!item || !item.buyRatio || !item.sellRatio) return null;

  const buyRaw = parseFloat(item.buyRatio);
  const sellRaw = parseFloat(item.sellRatio);
  if (Number.isNaN(buyRaw) || Number.isNaN(sellRaw)) return null;

  const longPct = Number((buyRaw * 100).toFixed(1));
  const shortPct = Number((sellRaw * 100).toFixed(1));

  const cleanSym = normalizeSymbol(item.symbol || targetSymbol);

  const validated = validateSentimentItem({
    symbol: cleanSym,
    assetClass: 'CRYPTO',
    longPct,
    shortPct,
    source: 'Bybit',
    traderGroup: 'Bybit crypto-derivatives traders',
    sourceUrl: sourceUrl || `https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=${cleanSym}&period=5min&limit=1`,
    fetchedAt: Date.now(),
    rawPayload: item,
    timestamp: item.timestamp ? parseInt(item.timestamp, 10) || Date.now() : Date.now(),
  });

  return validated.isValid && validated.sanitized ? validated.sanitized : null;
}

export class CryptoSentimentProvider implements SentimentProvider {
  public id = 'crypto-binance-bybit';
  public name = 'Binance Futures (Bybit Fallback)';
  private refreshIntervalMs = 60000; // 60s
  private circuitBreaker = new CircuitBreaker(5, 60000);

  private lastSuccessTime: number | null = null;
  private lastAttemptTime: number | null = null;
  private lastError: string | null = null;
  private requestCountToday: number = 0;
  private lastResetDay: number = new Date().getUTCDate();
  private lastUsedSource: string = 'Binance Futures';

  public getStatus(): ProviderHealthStatus {
    const now = Date.now();
    let status: ProviderHealthStatus['status'] = 'LIVE';

    if (!this.lastSuccessTime) {
      status = this.lastError ? 'DOWN' : 'STALE';
    } else if (now - this.lastSuccessTime > 2 * this.refreshIntervalMs) {
      status = 'STALE';
    } else if (this.circuitBreaker.getState() === 'OPEN') {
      status = 'DOWN';
    }

    return {
      id: this.id,
      name: this.name,
      assetClasses: ['CRYPTO'],
      status,
      lastSuccessTime: this.lastSuccessTime,
      lastAttemptTime: this.lastAttemptTime,
      lastError: this.lastError,
      consecutiveFailures: this.circuitBreaker.getConsecutiveFailures(),
      requestCountToday: this.requestCountToday,
      refreshIntervalMs: this.refreshIntervalMs,
      notes: `Active source: ${this.lastUsedSource}. Automatic Bybit failover on geo-restriction or HTTP errors.`,
    };
  }

  private checkDailyReset(): void {
    const currentDay = new Date().getUTCDate();
    if (currentDay !== this.lastResetDay) {
      this.requestCountToday = 0;
      this.lastResetDay = currentDay;
    }
  }

  /**
   * Fetch single symbol from Binance Futures
   */
  private async fetchBinanceSymbol(symbol: string): Promise<NormalizedSentimentItem | null> {
    const url = `https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`;
    return await fetchWithRetry(async (signal) => {
      const res = await fetch(url, {
        signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'PrimePipFX-Sentiment/1.0' },
      });
      if (res.status === 451 || res.status === 403) {
        throw new Error(`BINANCE_GEOBLOCKED_HTTP_${res.status}`);
      }
      if (!res.ok) {
        throw new Error(`Binance HTTP error: ${res.status}`);
      }
      const data = await res.json();
      const parsed = parseBinanceCryptoItem(data, symbol, url);
      if (!parsed) {
        throw new Error(`Failed to parse Binance response for ${symbol}`);
      }
      return parsed;
    }, 3, 8000);
  }

  /**
   * Fetch single symbol from Bybit as fallback
   */
  private async fetchBybitSymbol(symbol: string): Promise<NormalizedSentimentItem | null> {
    const url = `https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=${symbol}&period=5min&limit=1`;
    return await fetchWithRetry(async (signal) => {
      const res = await fetch(url, {
        signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'PrimePipFX-Sentiment/1.0' },
      });
      if (!res.ok) {
        throw new Error(`Bybit HTTP error: ${res.status}`);
      }
      const data = await res.json();
      const parsed = parseBybitCryptoItem(data, symbol, url);
      if (!parsed) {
        throw new Error(`Failed to parse Bybit response for ${symbol}`);
      }
      return parsed;
    }, 3, 8000);
  }

  public async fetch(): Promise<NormalizedSentimentItem[]> {
    this.checkDailyReset();
    this.lastAttemptTime = Date.now();

    if (!this.circuitBreaker.canExecute()) {
      console.warn(`[CryptoSentimentProvider] Circuit breaker is OPEN. Skipping external calls.`);
      throw new Error('Circuit breaker open due to consecutive failures');
    }

    const results: NormalizedSentimentItem[] = [];
    let binanceGeoBlocked = false;
    let anySuccess = false;

    for (const sym of CRYPTO_TARGET_SYMBOLS) {
      this.requestCountToday++;
      let item: NormalizedSentimentItem | null = null;

      if (!binanceGeoBlocked) {
        try {
          item = await this.fetchBinanceSymbol(sym);
          if (item) {
            results.push(item);
            this.lastUsedSource = 'Binance Futures';
            anySuccess = true;
          }
        } catch (err: any) {
          const errMsg = String(err?.message || err);
          if (errMsg.includes('BINANCE_GEOBLOCKED')) {
            console.warn(`[CryptoSentimentProvider] Binance geoblocked/forbidden, falling back to Bybit.`);
            binanceGeoBlocked = true;
          } else {
            console.warn(`[CryptoSentimentProvider] Binance failed for ${sym}: ${errMsg}, trying Bybit fallback.`);
          }
        }
      }

      // If Binance failed or is geoblocked, use Bybit
      if (!item) {
        try {
          item = await this.fetchBybitSymbol(sym);
          if (item) {
            results.push(item);
            this.lastUsedSource = 'Bybit';
            anySuccess = true;
          }
        } catch (bybitErr: any) {
          console.warn(`[CryptoSentimentProvider] Bybit fallback failed for ${sym}:`, bybitErr?.message);
        }
      }
    }

    if (anySuccess && results.length > 0) {
      this.circuitBreaker.recordSuccess();
      this.lastSuccessTime = Date.now();
      this.lastError = null;
      return results;
    } else {
      this.circuitBreaker.recordFailure();
      this.lastError = 'Failed to fetch any crypto sentiment from both Binance Futures and Bybit';
      throw new Error(this.lastError);
    }
  }
}
