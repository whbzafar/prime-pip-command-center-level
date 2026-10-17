import express from 'express';
import fs from 'fs';
import path from 'path';

export interface HistoricalCandle {
  time: number; // timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const CACHE_DIR = path.join(process.cwd(), 'data', 'backtest_cache');
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (err) {
    console.warn('[BACKTEST] Failed to create cache directory:', err);
  }
}

function getCacheKey(instrument: string, timeframe: string, startDateStr: string): string {
  const safeInst = instrument.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const safeTf = timeframe.toUpperCase();
  const safeDate = startDateStr.slice(0, 10);
  return `${safeInst}_${safeTf}_${safeDate}.json`;
}

function readFromDiskCache(cacheKey: string): HistoricalCandle[] | null {
  try {
    const filePath = path.join(CACHE_DIR, cacheKey);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Cache miss or read error
  }
  return null;
}

function writeToDiskCache(cacheKey: string, candles: HistoricalCandle[]): void {
  try {
    const filePath = path.join(CACHE_DIR, cacheKey);
    fs.writeFileSync(filePath, JSON.stringify(candles), 'utf-8');
  } catch (err) {
    console.warn('[BACKTEST] Failed to write cache to disk:', err);
  }
}

/**
 * Fetch Binance historical klines (free public REST API, no API key required).
 */
async function fetchBinanceKlines(
  symbol: string,
  timeframe: string,
  startTimeMs: number,
  limit: number = 800
): Promise<HistoricalCandle[]> {
  // Map timeframes: M1 -> 1m, M5 -> 5m, M15 -> 15m, H1 -> 1h, H4 -> 4h, D1 -> 1d
  const tfMap: Record<string, string> = {
    M1: '1m',
    '1M': '1m',
    '1': '1m',
    M5: '5m',
    '5M': '5m',
    '5': '5m',
    M15: '15m',
    '15M': '15m',
    '15': '15m',
    H1: '1h',
    '1H': '1h',
    '60': '1h',
    H4: '4h',
    '4H': '4h',
    '240': '4h',
    D1: '1d',
    '1D': '1d',
    D: '1d',
  };

  const binanceTf = tfMap[timeframe.toUpperCase()] || '15m';

  // Normalize symbol (e.g. BTC/USDT -> BTCUSDT, EUR/USD -> EURUSDT)
  let binanceSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (binanceSymbol === 'EURUSD') binanceSymbol = 'EURUSDT';
  if (binanceSymbol === 'GBPUSD') binanceSymbol = 'GBPUSDT';
  if (!binanceSymbol.endsWith('USDT') && !binanceSymbol.endsWith('USD') && !binanceSymbol.endsWith('BTC')) {
    binanceSymbol = `${binanceSymbol}USDT`;
  }

  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${binanceTf}&startTime=${startTimeMs}&limit=${limit}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PrimePipFX-Backtest/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`Binance returned HTTP ${res.status}: ${res.statusText}`);
  }

  const raw = await res.json();
  if (!Array.isArray(raw)) {
    throw new Error('Binance response is not an array');
  }

  return raw.map((k: any) => ({
    time: Number(k[0]),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

/**
 * Fetch Dukascopy historical rates using the open-source dukascopy-node library
 * and Dukascopy public download endpoints.
 */
async function fetchDukascopyRates(
  pair: string,
  timeframe: string,
  startDate: Date,
  limit: number = 800
): Promise<HistoricalCandle[]> {
  try {
    const dukascopy = await import('dukascopy-node');
    const getHistoricalRates = dukascopy.getHistoricalRates || (dukascopy as any).default?.getHistoricalRates;

    const tfMap: Record<string, string> = {
      M1: 'm1',
      M5: 'm5',
      M15: 'm15',
      H1: 'h1',
      H4: 'h4',
      D1: 'd1',
    };
    const dukaTf = tfMap[timeframe.toUpperCase()] || 'm15';

    // Calculate approximate end date based on timeframe and limit
    const tfMsMap: Record<string, number> = {
      m1: 60 * 1000,
      m5: 5 * 60 * 1000,
      m15: 15 * 60 * 1000,
      h1: 60 * 60 * 1000,
      h4: 4 * 60 * 60 * 1000,
      d1: 24 * 60 * 60 * 1000,
    };
    const stepMs = tfMsMap[dukaTf] || (15 * 60 * 1000);
    const toDate = new Date(startDate.getTime() + limit * stepMs);

    const inst = pair.replace(/[^a-zA-Z]/g, '').toLowerCase();

    if (typeof getHistoricalRates === 'function') {
      const data = await getHistoricalRates({
        instrument: inst,
        dates: { from: startDate, to: toDate },
        timeframe: dukaTf as any,
        format: 'json',
      });

      if (Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          time: new Date(d.timestamp).getTime(),
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
          volume: Number(d.volume || 0),
        }));
      }
    }
  } catch (err: any) {
    console.warn('[BACKTEST] Dukascopy fetch notice:', err?.message || err);
  }

  return [];
}

export const backtestRouter = express.Router();

/**
 * GET /api/backtest/history
 * Parameters:
 *  - instrument: pair string (e.g. EURUSD, GBPUSD, BTCUSDT, ETHUSDT)
 *  - timeframe: M1, M5, M15, H1, H4, D1
 *  - startDate: ISO date string or timestamp
 *  - limit: number of candles
 */
backtestRouter.get('/history', async (req, res) => {
  try {
    const instrument = String(req.query.instrument || 'BTCUSDT').trim().toUpperCase();
    const timeframe = String(req.query.timeframe || 'M15').trim().toUpperCase();
    const limit = Math.min(1000, Math.max(50, parseInt(String(req.query.limit || '500'), 10)));

    let startDateMs: number;
    if (req.query.startDate) {
      const parsed = new Date(String(req.query.startDate)).getTime();
      startDateMs = isNaN(parsed) ? Date.now() - 30 * 24 * 60 * 60 * 1000 : parsed;
    } else {
      // Default to 14 days ago
      startDateMs = Date.now() - 14 * 24 * 60 * 60 * 1000;
    }

    const startDateStr = new Date(startDateMs).toISOString();
    const cacheKey = getCacheKey(instrument, timeframe, startDateStr);

    // 1. Check disk cache
    const cached = readFromDiskCache(cacheKey);
    if (cached && cached.length >= 30) {
      return res.json({
        ok: true,
        source: 'cache',
        instrument,
        timeframe,
        count: cached.length,
        candles: cached,
      });
    }

    const cleanInst = instrument.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const isCrypto =
      cleanInst.includes('BTC') ||
      cleanInst.includes('ETH') ||
      cleanInst.includes('SOL') ||
      cleanInst.includes('BNB') ||
      cleanInst.includes('XRP') ||
      cleanInst.includes('DOGE') ||
      cleanInst.includes('ADA') ||
      cleanInst.includes('USDT');

    let candles: HistoricalCandle[] = [];
    let sourceName = 'binance';

    if (isCrypto) {
      candles = await fetchBinanceKlines(cleanInst, timeframe, startDateMs, limit);
      sourceName = 'binance';
    } else {
      // Forex pair: try Dukascopy first
      candles = await fetchDukascopyRates(cleanInst, timeframe, new Date(startDateMs), limit);
      if (candles.length > 0) {
        sourceName = 'dukascopy';
      } else {
        // Fallback: If Dukascopy is IP-challenged in cloud environment, use Binance's FX pairs (e.g. EURUSDT, GBPUSDT)
        try {
          candles = await fetchBinanceKlines(cleanInst, timeframe, startDateMs, limit);
          sourceName = 'binance_fx';
        } catch (err: any) {
          console.warn('[BACKTEST] Binance FX fallback note:', err?.message || err);
        }
      }
    }

    if (!candles || candles.length === 0) {
      return res.status(404).json({
        ok: false,
        error: `No historical candles found for ${instrument} from date ${startDateStr}. Please select a different start date or pair.`,
      });
    }

    // Sort chronologically ascending
    candles.sort((a, b) => a.time - b.time);

    // Write to server disk cache for instant subsequent hits
    writeToDiskCache(cacheKey, candles);

    return res.json({
      ok: true,
      source: sourceName,
      instrument,
      timeframe,
      count: candles.length,
      candles,
    });
  } catch (error: any) {
    console.error('[BACKTEST ROUTER ERROR]', error);
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to fetch historical market data.',
    });
  }
});
