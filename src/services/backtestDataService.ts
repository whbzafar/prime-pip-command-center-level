export interface HistoricalCandle {
  time: number; // millisecond timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestFetchResult {
  ok: boolean;
  candles: HistoricalCandle[];
  source: 'dukascopy' | 'binance' | 'server_cache' | 'indexeddb_cache' | 'client_binance';
  instrument: string;
  timeframe: string;
  error?: string;
}

const DB_NAME = 'primepipfx_backtest_vault';
const STORE_NAME = 'historical_candles';
const DB_VERSION = 1;

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (evt) => {
      const db = (evt.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedCandlesFromIndexedDb(
  instrument: string,
  timeframe: string,
  startDateStr: string
): Promise<HistoricalCandle[] | null> {
  try {
    const db = await openIndexedDb();
    const key = `${instrument.toUpperCase()}_${timeframe.toUpperCase()}_${startDateStr.slice(0, 10)}`;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result?.candles && Array.isArray(req.result.candles)) {
          resolve(req.result.candles);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveCandlesToIndexedDb(
  instrument: string,
  timeframe: string,
  startDateStr: string,
  candles: HistoricalCandle[]
): Promise<void> {
  try {
    const db = await openIndexedDb();
    const key = `${instrument.toUpperCase()}_${timeframe.toUpperCase()}_${startDateStr.slice(0, 10)}`;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id: key, candles, savedAt: Date.now() });
  } catch (err) {
    console.warn('[BACKTEST IDB] Save error:', err);
  }
}

/**
 * Direct client fetch from Binance REST API (no auth needed)
 * Acts as high-reliability fallback if server endpoint is unreachable
 */
async function fetchDirectBinance(
  instrument: string,
  timeframe: string,
  startTimeMs: number,
  limit: number = 800
): Promise<HistoricalCandle[]> {
  const tfMap: Record<string, string> = {
    M1: '1m',
    M5: '5m',
    M15: '15m',
    H1: '1h',
    H4: '4h',
    D1: '1d',
  };
  const binanceTf = tfMap[timeframe.toUpperCase()] || '15m';

  let sym = instrument.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (sym === 'EURUSD') sym = 'EURUSDT';
  if (sym === 'GBPUSD') sym = 'GBPUSDT';
  if (!sym.endsWith('USDT') && !sym.endsWith('USD') && !sym.endsWith('BTC')) {
    sym = `${sym}USDT`;
  }

  const url = `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${binanceTf}&startTime=${startTimeMs}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance client HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Invalid candle data array');

  return data.map((k: any) => ({
    time: Number(k[0]),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

/**
 * Primary entrypoint for fetching historical data for Backtesting Replay Pro
 */
export async function fetchReplayCandles(
  instrument: string,
  timeframe: string,
  startDateStr: string,
  limit: number = 600
): Promise<BacktestFetchResult> {
  const cleanInst = instrument.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanTf = timeframe.toUpperCase();

  // 1. Check local browser IndexedDB cache first
  const idbCached = await getCachedCandlesFromIndexedDb(cleanInst, cleanTf, startDateStr);
  if (idbCached && idbCached.length >= 30) {
    return {
      ok: true,
      candles: idbCached,
      source: 'indexeddb_cache',
      instrument: cleanInst,
      timeframe: cleanTf,
    };
  }

  // 2. Fetch from backend /api/backtest/history (which queries Dukascopy / Binance and checks disk cache)
  try {
    const params = new URLSearchParams({
      instrument: cleanInst,
      timeframe: cleanTf,
      startDate: startDateStr,
      limit: String(limit),
    });

    const res = await fetch(`/api/backtest/history?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.candles) && data.candles.length > 0) {
        // Save to browser IndexedDB
        await saveCandlesToIndexedDb(cleanInst, cleanTf, startDateStr, data.candles);
        return {
          ok: true,
          candles: data.candles,
          source: data.source === 'cache' ? 'server_cache' : data.source,
          instrument: cleanInst,
          timeframe: cleanTf,
        };
      }
    }
  } catch (err) {
    console.warn('[BACKTEST SERVICE] Server endpoint error, trying direct public source:', err);
  }

  // 3. Fallback: Direct Binance public REST API call from browser
  try {
    const startMs = new Date(startDateStr).getTime() || (Date.now() - 30 * 24 * 60 * 60 * 1000);
    const directCandles = await fetchDirectBinance(cleanInst, cleanTf, startMs, limit);
    if (directCandles.length > 0) {
      await saveCandlesToIndexedDb(cleanInst, cleanTf, startDateStr, directCandles);
      return {
        ok: true,
        candles: directCandles,
        source: 'client_binance',
        instrument: cleanInst,
        timeframe: cleanTf,
      };
    }
  } catch (directErr: any) {
    console.warn('[BACKTEST SERVICE] Direct public source error:', directErr);
  }

  return {
    ok: false,
    candles: [],
    source: 'dukascopy',
    instrument: cleanInst,
    timeframe: cleanTf,
    error: `Unable to download historical candles for ${instrument}. Please check your connection or choose another starting date.`,
  };
}

/**
 * Compute Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: HistoricalCandle[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const emaValues: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length < period) return emaValues;

  // Simple moving average for the first period
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / period;
  emaValues[period - 1] = prevEma;

  for (let i = period; i < candles.length; i++) {
    const currentEma = candles[i].close * k + prevEma * (1 - k);
    emaValues[i] = currentEma;
    prevEma = currentEma;
  }

  return emaValues;
}

/**
 * Detect Fair Value Gaps (FVG) / Inefficiencies on visible candles
 */
export interface FairValueGap {
  startIndex: number;
  type: 'BULLISH' | 'BEARISH';
  top: number;
  bottom: number;
}

export function detectFairValueGaps(candles: HistoricalCandle[]): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  if (candles.length < 3) return fvgs;

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c3 = candles[i];

    // Bullish FVG: Candle 1 High < Candle 3 Low
    if (c3.low > c1.high) {
      fvgs.push({
        startIndex: i - 1,
        type: 'BULLISH',
        top: c3.low,
        bottom: c1.high,
      });
    }

    // Bearish FVG: Candle 1 Low > Candle 3 High
    if (c3.high < c1.low) {
      fvgs.push({
        startIndex: i - 1,
        type: 'BEARISH',
        top: c1.low,
        bottom: c3.high,
      });
    }
  }

  return fvgs;
}
