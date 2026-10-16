import { safeReadJsonFile, safeWriteJsonFile } from '../dataPath.js';
import { NormalizedSentimentItem, SentimentSnapshot } from './types.js';

const STORAGE_FILE = 'retail_sentiment_store.json';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const SNAPSHOT_MIN_INTERVAL_MS = 5 * 60 * 1000; // 1 snapshot per symbol every 5 min max

export interface SentimentStoreData {
  cache: Record<string, NormalizedSentimentItem>;
  snapshots: SentimentSnapshot[];
  lastUpdated: number;
}

const DEFAULT_STORE: SentimentStoreData = {
  cache: {},
  snapshots: [],
  lastUpdated: 0,
};

export class SentimentStorage {
  private data: SentimentStoreData;

  constructor() {
    this.data = safeReadJsonFile<SentimentStoreData>(STORAGE_FILE, DEFAULT_STORE);
    if (!this.data.cache) this.data.cache = {};
    if (!Array.isArray(this.data.snapshots)) this.data.snapshots = [];

    // Automatically purge any previous Binance/Bybit commodities or unverified fallbacks
    this.purgeBinanceCommodities();
  }

  /**
   * Remove ALL Binance/Bybit gold, silver, and natural gas rows from storage
   * Commodities must come EXCLUSIVELY from Myfxbook API
   */
  public purgeBinanceCommodities(): void {
    const purgeSymbols = new Set(['XAUUSD', 'XAGUSD', 'NATGAS', 'XAUUSDT', 'XAGUSDT', 'NATGASUSDT']);
    let modified = false;

    for (const sym of Object.keys(this.data.cache)) {
      const item = this.data.cache[sym];
      const isBinanceCommodity = purgeSymbols.has(sym) && (item?.source?.includes('Binance') || item?.source?.includes('Bybit'));
      const isUnverifiedAggregate = item?.source === 'Myfxbook Community Outlook & Broker Aggregate' || item?.source === 'Broker Aggregate & Community Outlook';
      
      if (isBinanceCommodity || isUnverifiedAggregate) {
        delete this.data.cache[sym];
        modified = true;
      }
    }

    const prevSnapCount = this.data.snapshots.length;
    this.data.snapshots = this.data.snapshots.filter((s) => {
      const isBinanceCommodity = purgeSymbols.has(s.symbol) && (s.source?.includes('Binance') || s.source?.includes('Bybit'));
      const isUnverified = s.source === 'Myfxbook Community Outlook & Broker Aggregate' || s.source === 'Broker Aggregate & Community Outlook';
      return !isBinanceCommodity && !isUnverified;
    });

    if (this.data.snapshots.length !== prevSnapCount) {
      modified = true;
    }

    if (modified) {
      this.save();
      console.log('[SentimentStorage] Cleaned storage: removed Binance/Bybit commodities and unverified items.');
    }
  }

  /**
   * Persist in-memory store to disk safely
   */
  private save(): void {
    safeWriteJsonFile(STORAGE_FILE, this.data);
  }

  /**
   * Merge newly fetched valid items into cache and append snapshots
   * Rejects invalid/empty data and never replaces good data with bad data
   */
  public saveBatch(items: NormalizedSentimentItem[]): void {
    if (!items || items.length === 0) return;

    const now = Date.now();
    this.data.lastUpdated = now;

    // Prune old snapshots beyond 30 days
    const cutoff = now - THIRTY_DAYS_MS;
    this.data.snapshots = this.data.snapshots.filter((s) => s.timestamp >= cutoff);

    for (const item of items) {
      // Validate that item is real and valid before saving
      if (!item || !item.symbol || Number.isNaN(item.longPct) || Number.isNaN(item.shortPct)) {
        continue;
      }

      // Check sum tolerance
      const sum = item.longPct + item.shortPct;
      if (sum < 99.0 || sum > 101.0) {
        continue;
      }

      // 1. Update cache with good data
      this.data.cache[item.symbol] = {
        ...item,
        fetchedAt: item.fetchedAt || now,
      };

      // 2. Determine if snapshot should be recorded (min interval 5 minutes per symbol)
      const lastSnap = [...this.data.snapshots]
        .reverse()
        .find((s) => s.symbol === item.symbol);

      if (!lastSnap || now - lastSnap.timestamp >= SNAPSHOT_MIN_INTERVAL_MS) {
        this.data.snapshots.push({
          symbol: item.symbol,
          assetClass: item.assetClass,
          longPct: item.longPct,
          shortPct: item.shortPct,
          source: item.source,
          traderGroup: item.traderGroup,
          timestamp: item.timestamp || now,
        });
      }
    }

    this.save();
  }

  /**
   * Compute difference in long percentage versus about 1 hour ago (40 - 90 min window)
   */
  public get1HourChange(symbol: string, currentLongPct: number): number | undefined {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Find snapshots for this symbol within the past 2 hours
    const symbolSnaps = this.data.snapshots.filter(
      (s) => s.symbol === symbol && s.timestamp <= now - 20 * 60 * 1000
    );

    if (symbolSnaps.length === 0) return undefined;

    // Find the snapshot closest to 1 hour ago
    let closest = symbolSnaps[0];
    let minDiff = Math.abs(closest.timestamp - oneHourAgo);

    for (let i = 1; i < symbolSnaps.length; i++) {
      const diff = Math.abs(symbolSnaps[i].timestamp - oneHourAgo);
      if (diff < minDiff) {
        minDiff = diff;
        closest = symbolSnaps[i];
      }
    }

    // Only compute if closest snapshot is within 20m - 120m window
    if (minDiff > 60 * 60 * 1000) return undefined;

    const delta = Number((currentLongPct - closest.longPct).toFixed(1));
    return delta;
  }

  /**
   * Get all items currently in cache enriched with 1h delta and staleness
   * If data is older than 1 hour, sets isUnavailable = true
   */
  public getAllItems(): { items: NormalizedSentimentItem[]; lastUpdated: number } {
    const now = Date.now();
    const list: NormalizedSentimentItem[] = Object.values(this.data.cache).map((raw) => {
      const item: NormalizedSentimentItem = { ...raw };
      item.change1hPct = this.get1HourChange(item.symbol, item.longPct);

      // Provider refresh intervals: Crypto ~60s, Myfxbook ~20m
      const refreshThreshold = item.assetClass === 'CRYPTO' ? 2 * 60 * 1000 : 2 * 20 * 60 * 1000;
      const age = now - (item.fetchedAt || item.timestamp || 0);

      item.isStale = age > refreshThreshold;
      item.isUnavailable = age > ONE_HOUR_MS; // Older than 1 hour => "Unavailable"

      return item;
    });

    return {
      items: list,
      lastUpdated: this.data.lastUpdated,
    };
  }

  /**
   * Retrieve snapshot history for a symbol
   */
  public getSymbolHistory(symbol: string, timeframe: '24h' | '7d' | '30d' = '24h'): {
    symbol: string;
    current: NormalizedSentimentItem | null;
    history: SentimentSnapshot[];
  } {
    const norm = symbol.trim().toUpperCase();
    const current = this.data.cache[norm] || null;

    const now = Date.now();
    let windowMs = 24 * 60 * 60 * 1000;
    if (timeframe === '7d') windowMs = 7 * 24 * 60 * 60 * 1000;
    if (timeframe === '30d') windowMs = 30 * 24 * 60 * 60 * 1000;

    const history = this.data.snapshots
      .filter((s) => s.symbol === norm && s.timestamp >= now - windowMs)
      .sort((a, b) => a.timestamp - b.timestamp);

    return {
      symbol: norm,
      current,
      history,
    };
  }
}

export const sentimentStorage = new SentimentStorage();
