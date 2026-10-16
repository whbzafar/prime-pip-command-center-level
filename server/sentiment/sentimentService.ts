import { CryptoSentimentProvider } from './providers/cryptoProvider.js';
import { MyfxbookSentimentProvider } from './providers/myfxbookProvider.js';
import { sentimentStorage } from './storage.js';
import { SentimentResponse, SentimentHistoryResponse, ProviderHealthStatus } from './types.js';

export class SentimentService {
  private cryptoProvider = new CryptoSentimentProvider();
  private myfxbookProvider = new MyfxbookSentimentProvider();
  private isInitialized = false;
  private cryptoTimer: NodeJS.Timeout | null = null;
  private myfxbookTimer: NodeJS.Timeout | null = null;

  public init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log('[SentimentService] Initializing retail sentiment engine...');

    // Purge any stored Binance commodities (commodities are strictly Myfxbook only)
    sentimentStorage.purgeBinanceCommodities();

    // 1. Initial fetches
    this.pollCrypto();
    this.pollMyfxbook();

    // 2. Scheduled loops
    // Crypto every 60s
    this.cryptoTimer = setInterval(() => {
      this.pollCrypto();
    }, 60 * 1000);

    // Myfxbook every 20 min (to respect ~100 req/24h)
    this.myfxbookTimer = setInterval(() => {
      this.pollMyfxbook();
    }, 20 * 60 * 1000);
  }

  private async pollCrypto(): Promise<void> {
    try {
      const items = await this.cryptoProvider.fetch();
      if (items.length > 0) {
        sentimentStorage.saveBatch(items);
      }
    } catch (err: any) {
      console.warn('[SentimentService] Crypto poll error:', err?.message || err);
    }
  }

  private async pollMyfxbook(): Promise<void> {
    try {
      const items = await this.myfxbookProvider.fetch();
      if (items.length > 0) {
        sentimentStorage.saveBatch(items);
      }
    } catch (err: any) {
      // Missing credentials or quota limits are handled gracefully
      if (err?.message !== 'MYFXBOOK_CREDENTIALS_MISSING') {
        console.warn('[SentimentService] Myfxbook poll notice:', err?.message || err);
      }
    }
  }

  /**
   * Return all sentiment items from server cache + provider statuses
   * Never calls external APIs synchronously
   */
  public getSentimentData(): SentimentResponse {
    const { items, lastUpdated } = sentimentStorage.getAllItems();
    const providers = this.getProviderStatuses();

    return {
      items,
      providers,
      lastUpdated: lastUpdated || Date.now(),
    };
  }

  /**
   * Return historical snapshots for a given symbol
   */
  public getSymbolHistory(symbol: string, timeframe: '24h' | '7d' | '30d' = '24h'): SentimentHistoryResponse {
    return sentimentStorage.getSymbolHistory(symbol, timeframe);
  }

  public getProviderStatuses(): ProviderHealthStatus[] {
    return [
      this.cryptoProvider.getStatus(),
      this.myfxbookProvider.getStatus(),
    ];
  }

  public stop(): void {
    if (this.cryptoTimer) clearInterval(this.cryptoTimer);
    if (this.myfxbookTimer) clearInterval(this.myfxbookTimer);
    this.isInitialized = false;
  }
}

export const sentimentService = new SentimentService();
