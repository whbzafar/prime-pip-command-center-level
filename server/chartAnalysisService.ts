import express from 'express';
import fs from 'fs';
import path from 'path';

export interface Candle {
  time: number; // millisecond timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CacheEntry {
  candles: Candle[];
  timestamp: number;
  source: string;
}

// In-memory cache for ultra-fast pair switching (respecting free-tier rate limits)
const candlesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 1000; // 15 seconds for live candle feeds

// Throttle tracker to prevent hitting external free-tier rate limits
const lastRequestTime = new Map<string, number>();
const MIN_REQUEST_INTERVAL_MS = 1200; // Minimum 1.2s between external provider calls per symbol

function getCacheKey(symbol: string, timeframe: string): string {
  return `${symbol.toUpperCase().replace(/[^A-Z0-9]/g, '')}_${timeframe.toUpperCase()}`;
}

/**
 * Normalizes timeframe to Twelve Data and Binance format
 */
function normalizeIntervals(tf: string): { binance: string; twelveData: string } {
  const clean = tf.toUpperCase().trim();
  switch (clean) {
    case 'M1':
    case '1M':
    case '1':
      return { binance: '1m', twelveData: '1min' };
    case 'M5':
    case '5M':
    case '5':
      return { binance: '5m', twelveData: '5min' };
    case 'M15':
    case '15M':
    case '15':
      return { binance: '15m', twelveData: '15min' };
    case 'M30':
    case '30M':
    case '30':
      return { binance: '30m', twelveData: '30min' };
    case 'H1':
    case '1H':
    case '60':
      return { binance: '1h', twelveData: '1h' };
    case 'H4':
    case '4H':
    case '240':
      return { binance: '4h', twelveData: '4h' };
    case 'D1':
    case '1D':
    case 'D':
      return { binance: '1d', twelveData: '1day' };
    case 'W1':
    case '1W':
    case 'W':
      return { binance: '1w', twelveData: '1week' };
    default:
      return { binance: '15m', twelveData: '15min' };
  }
}

/**
 * Fetch Crypto or FX pair from Binance free public REST API
 */
async function fetchBinanceCandles(symbol: string, interval: string, limit: number = 300): Promise<Candle[]> {
  let cleanSym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleanSym === 'EURUSD') cleanSym = 'EURUSDT';
  if (cleanSym === 'GBPUSD') cleanSym = 'GBPUSDT';
  if (!cleanSym.endsWith('USDT') && !cleanSym.endsWith('USD') && !cleanSym.endsWith('BTC')) {
    cleanSym = `${cleanSym}USDT`;
  }

  const url = `https://api.binance.com/api/v3/klines?symbol=${cleanSym}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 PrimePipFX-Chart-Analysis/1.0',
    },
  });

  if (!res.ok) {
    throw new Error(`Binance returned HTTP ${res.status}`);
  }

  const raw = await res.json();
  if (!Array.isArray(raw)) throw new Error('Invalid response from Binance');

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
 * Fetch Forex pair from Twelve Data API (Free tier / Demo)
 */
async function fetchTwelveDataCandles(symbol: string, interval: string, limit: number = 300): Promise<Candle[]> {
  const apiKey = process.env.TWELVE_DATA_API_KEY || 'demo';
  // Format Twelve Data pair e.g. EUR/USD
  let formattedSymbol = symbol.toUpperCase().replace(/[^A-Z]/g, '');
  if (formattedSymbol.length === 6) {
    formattedSymbol = `${formattedSymbol.slice(0, 3)}/${formattedSymbol.slice(3, 6)}`;
  } else if (formattedSymbol === 'XAUUSD') {
    formattedSymbol = 'XAU/USD';
  }

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(formattedSymbol)}&interval=${interval}&outputsize=${Math.min(limit, 500)}&apikey=${apiKey}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 PrimePipFX-TwelveData/1.0',
    },
  });

  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);
  const data = await res.json();

  if (data.status === 'error') {
    throw new Error(data.message || 'Twelve Data error');
  }

  if (!Array.isArray(data.values) || data.values.length === 0) {
    throw new Error('Twelve Data returned empty values');
  }

  // Twelve Data returns newest first; reverse to chronological order
  const candles: Candle[] = data.values.map((v: any) => ({
    time: new Date(v.datetime).getTime(),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: parseFloat(v.volume || '1000'),
  }));

  candles.reverse();
  return candles;
}

export const chartAnalysisRouter = express.Router();

/**
 * GET /api/charts/candles
 * Query parameters:
 *  - symbol: EURUSD, GBPUSD, BTCUSDT, ETHUSDT, etc.
 *  - timeframe: M1, M5, M15, M30, H1, H4, D1, W1
 *  - limit: number (default 300)
 */
chartAnalysisRouter.get('/candles', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || 'EURUSD').trim().toUpperCase();
    const timeframe = String(req.query.timeframe || 'M15').trim().toUpperCase();
    const limit = Math.min(1000, Math.max(30, parseInt(String(req.query.limit || '300'), 10)));

    const cacheKey = getCacheKey(symbol, timeframe);
    const now = Date.now();

    // 1. Check in-memory cache to respect rate limits and allow instant 0ms pair switching
    const cached = candlesCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS && cached.candles.length > 0) {
      return res.json({
        ok: true,
        source: 'cache',
        originalSource: cached.source,
        symbol,
        timeframe,
        cachedAt: cached.timestamp,
        candles: cached.candles,
      });
    }

    // 2. Determine instrument category
    const cleanSym = symbol.replace(/[^A-Z0-9]/g, '');
    const isCrypto =
      cleanSym.includes('BTC') ||
      cleanSym.includes('ETH') ||
      cleanSym.includes('SOL') ||
      cleanSym.includes('BNB') ||
      cleanSym.includes('XRP') ||
      cleanSym.includes('DOGE') ||
      cleanSym.includes('ADA') ||
      cleanSym.endsWith('USDT');

    const intervals = normalizeIntervals(timeframe);
    let candles: Candle[] = [];
    let providerSource = '';

    if (isCrypto) {
      candles = await fetchBinanceCandles(cleanSym, intervals.binance, limit);
      providerSource = 'binance';
    } else {
      // Forex pair: Try Twelve Data first
      try {
        candles = await fetchTwelveDataCandles(cleanSym, intervals.twelveData, limit);
        providerSource = 'twelve_data';
      } catch (tdErr: any) {
        console.warn(`[CHART ANALYSIS] Twelve Data note for ${symbol}: ${tdErr?.message}. Falling back to Binance FX.`);
        // Fallback: Binance FX (EURUSDT, GBPUSDT, etc.)
        try {
          candles = await fetchBinanceCandles(cleanSym, intervals.binance, limit);
          providerSource = 'binance_fx';
        } catch (binErr: any) {
          // If still failing, return cached version even if slightly older
          if (cached && cached.candles.length > 0) {
            return res.json({
              ok: true,
              source: 'stale_cache',
              symbol,
              timeframe,
              candles: cached.candles,
            });
          }
          throw binErr;
        }
      }
    }

    if (!candles || candles.length === 0) {
      return res.status(404).json({
        ok: false,
        error: `No live candles available for ${symbol} (${timeframe}).`,
      });
    }

    // Cache the candles
    candlesCache.set(cacheKey, {
      candles,
      timestamp: now,
      source: providerSource,
    });

    return res.json({
      ok: true,
      source: providerSource,
      symbol,
      timeframe,
      cachedAt: now,
      candles,
    });
  } catch (error: any) {
    console.error('[CHART ANALYSIS ERROR]', error);
    return res.status(500).json({
      ok: false,
      error: error?.message || 'Failed to fetch chart data.',
    });
  }
});
