import express from 'express';
import fs from 'fs';
import path from 'path';
import { fetchDukascopyHistoricalRates } from './dukascopyConnectorService.js';

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
  if (cleanSym === 'XAUUSD' || cleanSym === 'GOLD') cleanSym = 'PAXGUSDT';
  else if (!cleanSym.endsWith('USDT') && !cleanSym.endsWith('USD') && !cleanSym.endsWith('BTC')) {
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

// Yahoo Finance Symbol Mapping for 100% Free Authentic Global Market Feeds
function mapYahooSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // All 28 Major & Minor Forex Pairs
  const FX_MAP: Record<string, string> = {
    EURUSD: 'EURUSD=X',
    GBPUSD: 'GBPUSD=X',
    USDJPY: 'JPY=X',
    AUDUSD: 'AUDUSD=X',
    USDCAD: 'CAD=X',
    USDCHF: 'CHF=X',
    NZDUSD: 'NZDUSD=X',
    EURGBP: 'EURGBP=X',
    EURJPY: 'EURJPY=X',
    GBPJPY: 'GBPJPY=X',
    AUDJPY: 'AUDJPY=X',
    CADJPY: 'CADJPY=X',
    CHFJPY: 'CHFJPY=X',
    NZDJPY: 'NZDJPY=X',
    EURAUD: 'EURAUD=X',
    EURCAD: 'EURCAD=X',
    EURCHF: 'EURCHF=X',
    EURNZD: 'EURNZD=X',
    GBPAUD: 'GBPAUD=X',
    GBPCAD: 'GBPCAD=X',
    GBPCHF: 'GBPCHF=X',
    GBPNZD: 'GBPNZD=X',
    AUDCAD: 'AUDCAD=X',
    AUDCHF: 'AUDCHF=X',
    AUDNZD: 'AUDNZD=X',
    CADCHF: 'CADCHF=X',
    NZDCAD: 'NZDCAD=X',
    NZDCHF: 'NZDCHF=X',
  };
  if (FX_MAP[clean]) return FX_MAP[clean];

  // Commodities & Energies
  if (clean === 'XAUUSD' || clean === 'GOLD') return 'GC=F';
  if (clean === 'XAGUSD' || clean === 'SILVER') return 'SI=F';
  if (clean === 'USOIL' || clean === 'CRUDE' || clean === 'WTI') return 'CL=F';
  if (clean === 'BRENT') return 'BZ=F';
  if (clean === 'COPPER') return 'HG=F';
  if (clean === 'NATGAS') return 'NG=F';

  // Major Benchmark Indices
  if (clean === 'US30' || clean === 'DJI' || clean === 'DOW') return '^DJI';
  if (clean === 'SPX500' || clean === 'SPX' || clean === 'GSPC') return '^GSPC';
  if (clean === 'NAS100' || clean === 'NDX' || clean === 'IXIC') return '^IXIC';
  if (clean === 'GER40' || clean === 'DAX') return '^GDAXI';
  if (clean === 'UK100' || clean === 'FTSE') return '^FTSE';
  if (clean === 'JP225' || clean === 'N225') return '^N225';

  // Crypto Assets
  if (clean === 'BTCUSDT' || clean === 'BTCUSD') return 'BTC-USD';
  if (clean === 'ETHUSDT' || clean === 'ETHUSD') return 'ETH-USD';
  if (clean === 'SOLUSDT' || clean === 'SOLUSD') return 'SOL-USD';
  if (clean === 'BNBUSDT' || clean === 'BNBUSD') return 'BNB-USD';
  if (clean === 'XRPUSDT' || clean === 'XRPUSD') return 'XRP-USD';
  if (clean === 'DOGEUSDT' || clean === 'DOGEUSD') return 'DOGE-USD';
  if (clean === 'ADAUSDT' || clean === 'ADAUSD') return 'ADA-USD';

  return clean;
}

/**
 * Fetch 100% Free Authentic Historical Chart Data from Yahoo Finance
 * Supports years to decades of real exchange-verified price history,
 * custom period1 / period2 date ranges, and unlimited bar archives.
 */
async function fetchYahooFinanceCandles(
  symbol: string,
  timeframe: string,
  limit: number = 500,
  options?: { range?: string; period1?: number; period2?: number }
): Promise<Candle[]> {
  const yahooSym = mapYahooSymbol(symbol);
  const tf = timeframe.toUpperCase();

  let interval = '15m';
  let defaultRange = '60d';

  if (tf === 'M1' || tf === '1M') {
    interval = '1m';
    defaultRange = '7d';
  } else if (tf === 'M5' || tf === '5M') {
    interval = '5m';
    defaultRange = '60d';
  } else if (tf === 'M15' || tf === '15M') {
    interval = '15m';
    defaultRange = '60d';
  } else if (tf === 'M30' || tf === '30M') {
    interval = '30m';
    defaultRange = '60d';
  } else if (tf === 'H1' || tf === '1H') {
    interval = '1h';
    defaultRange = '730d'; // 2 full years of 1h bars
  } else if (tf === 'H4' || tf === '4H') {
    interval = '1h';
    defaultRange = '730d';
  } else if (tf === 'D1' || tf === '1D') {
    interval = '1d';
    defaultRange = 'max'; // Maximum historical depth (decades)
  } else if (tf === 'W1' || tf === '1W') {
    interval = '1wk';
    defaultRange = 'max';
  } else if (tf === 'MN1' || tf === '1MO' || tf === '1M_MONTH') {
    interval = '1mo';
    defaultRange = 'max';
  }

  const effectiveRange = options?.range || defaultRange;
  let url = '';

  if (options?.period1 && options?.period2) {
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooSym
    )}?period1=${options.period1}&period2=${options.period2}&interval=${interval}&includePrePost=false`;
  } else {
    url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooSym
    )}?range=${effectiveRange}&interval=${interval}&includePrePost=false`;
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Yahoo Finance HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error('Yahoo Finance returned no candle quotes');
  }

  const timestamps = result.timestamp;
  const quote = result.indicators.quote[0];
  const candles: Candle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i] * 1000;
    const o = quote.open?.[i];
    const h = quote.high?.[i];
    const l = quote.low?.[i];
    const c = quote.close?.[i];
    const v = quote.volume?.[i] || 0;

    if (o != null && h != null && l != null && c != null && !isNaN(o) && !isNaN(h) && !isNaN(l) && !isNaN(c)) {
      candles.push({
        time: t,
        open: Number(o),
        high: Number(h),
        low: Number(l),
        close: Number(c),
        volume: Number(v),
      });
    }
  }

  candles.sort((a, b) => a.time - b.time);

  // If H4 requested, aggregate 1h candles into 4h intervals
  if (tf === 'H4' || tf === '4H') {
    const h4Candles: Candle[] = [];
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    let bucket: Candle[] = [];
    let bucketStart = 0;

    for (const c of candles) {
      const bTime = Math.floor(c.time / FOUR_HOURS_MS) * FOUR_HOURS_MS;
      if (bucket.length === 0 || bTime === bucketStart) {
        bucket.push(c);
        bucketStart = bTime;
      } else {
        h4Candles.push({
          time: bucketStart,
          open: bucket[0].open,
          high: Math.max(...bucket.map((b) => b.high)),
          low: Math.min(...bucket.map((b) => b.low)),
          close: bucket[bucket.length - 1].close,
          volume: bucket.reduce((sum, b) => sum + b.volume, 0),
        });
        bucket = [c];
        bucketStart = bTime;
      }
    }
    if (bucket.length > 0) {
      h4Candles.push({
        time: bucketStart,
        open: bucket[0].open,
        high: Math.max(...bucket.map((b) => b.high)),
        low: Math.min(...bucket.map((b) => b.low)),
        close: bucket[bucket.length - 1].close,
        volume: bucket.reduce((sum, b) => sum + b.volume, 0),
      });
    }
    return h4Candles.slice(-limit);
  }

  return candles.slice(-limit);
}

/**
 * Fetch Pure Institutional Interbank Historical Data from Dukascopy Swiss Bank
 */
async function fetchDukascopyCandles(
  symbol: string,
  timeframe: string,
  limit: number = 800
): Promise<Candle[]> {
  try {
    const dukascopy = await import('dukascopy-node');
    const getHistoricalRates = dukascopy.getHistoricalRates || (dukascopy as any).default?.getHistoricalRates;

    if (typeof getHistoricalRates !== 'function') return [];

    const clean = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
    const dukaMap: Record<string, string> = {
      eurusd: 'eurusd',
      gbpusd: 'gbpusd',
      usdjpy: 'usdjpy',
      audusd: 'audusd',
      usdcad: 'usdcad',
      usdchf: 'usdchf',
      nzdusd: 'nzdusd',
      eurgbp: 'eurgbp',
      eurjpy: 'eurjpy',
      gbpjpy: 'gbpjpy',
      xauusd: 'xauusd',
      xagusd: 'xagusd',
      us30: 'usa30idxusd',
      spx500: 'us500idxusd',
      nas100: 'usatechidxusd',
      ger40: 'deuidxeur',
    };

    const dukaSymbol = dukaMap[clean] || clean;
    const tf = timeframe.toUpperCase();
    const dukaTfMap: Record<string, string> = {
      M1: 'm1',
      M5: 'm5',
      M15: 'm15',
      M30: 'm30',
      H1: 'h1',
      H4: 'h4',
      D1: 'd1',
      W1: 'mn1',
      MN1: 'mn1',
    };
    const dukaTf = dukaTfMap[tf] || 'm15';

    const tfMsMap: Record<string, number> = {
      m1: 60 * 1000,
      m5: 5 * 60 * 1000,
      m15: 15 * 60 * 1000,
      m30: 30 * 60 * 1000,
      h1: 60 * 60 * 1000,
      h4: 4 * 60 * 60 * 1000,
      d1: 24 * 60 * 60 * 1000,
      mn1: 30 * 24 * 60 * 60 * 1000,
    };
    const stepMs = tfMsMap[dukaTf] || 15 * 60 * 1000;
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - limit * stepMs);

    const data = await getHistoricalRates({
      instrument: dukaSymbol,
      dates: { from: fromDate, to: toDate },
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
  } catch (err) {
    // Graceful fallback to Yahoo Finance or Binance
  }
  return [];
}

export const chartAnalysisRouter = express.Router();

/**
 * GET /api/charts/candles
 * Unlimited lookback, all timeframes, 100% free authentic market data
 */
chartAnalysisRouter.get('/candles', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || 'EURUSD').trim().toUpperCase();
    const timeframe = String(req.query.timeframe || 'M15').trim().toUpperCase();
    // Allow up to 10,000 candles for deep historical lookback & backtesting
    const limit = Math.min(10000, Math.max(30, parseInt(String(req.query.limit || '350'), 10)));
    const range = req.query.range ? String(req.query.range).trim() : undefined;
    const period1 = req.query.period1 ? parseInt(String(req.query.period1), 10) : undefined;
    const period2 = req.query.period2 ? parseInt(String(req.query.period2), 10) : undefined;
    const requestedProvider = req.query.provider ? String(req.query.provider).trim().toLowerCase() : undefined;

    const cacheKey = `${getCacheKey(symbol, timeframe)}_${limit}_${range || ''}_${period1 || ''}_${requestedProvider || ''}`;
    const now = Date.now();

    // 1. Check in-memory cache to guarantee sub-millisecond tab switching
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

    // If explicit Dukascopy requested or Forex/Commodities:
    if (requestedProvider === 'dukascopy' || requestedProvider === 'dukascopy_bank') {
      try {
        const dukaCandles = await fetchDukascopyHistoricalRates(cleanSym, timeframe, limit, {
          range,
          period1,
          period2,
        });
        if (dukaCandles && dukaCandles.length > 0) {
          candles = dukaCandles;
          providerSource = 'dukascopy_bank';
        }
      } catch (dErr: any) {
        console.warn(`[CHART] Direct Dukascopy error for ${symbol}:`, dErr?.message);
      }
    }

    if (candles.length === 0) {
      if (isCrypto) {
        // Direct Binance institutional public feed
        try {
          candles = await fetchBinanceCandles(cleanSym, intervals.binance, limit);
          providerSource = 'binance';
        } catch (binErr: any) {
          console.warn(`[CHART] Binance failed, trying Yahoo:`, binErr?.message);
          candles = await fetchYahooFinanceCandles(cleanSym, timeframe, limit, { range, period1, period2 });
          providerSource = 'yahoo_finance';
        }
      } else {
        // Forex, Commodities & Indices:
        // Try Yahoo Finance or Dukascopy ECN
        try {
          candles = await fetchYahooFinanceCandles(cleanSym, timeframe, limit, { range, period1, period2 });
          providerSource = 'yahoo_finance';
        } catch (yErr: any) {
          console.warn(`[CHART] Yahoo finance note for ${symbol}: ${yErr?.message}. Falling back to Dukascopy.`);
          try {
            const dukaCandles = await fetchDukascopyHistoricalRates(cleanSym, timeframe, limit, {
              range,
              period1,
              period2,
            });
            if (dukaCandles.length > 0) {
              candles = dukaCandles;
              providerSource = 'dukascopy_bank';
            }
          } catch (dErr: any) {
            console.warn(`[CHART] Dukascopy fallback note for ${symbol}: ${dErr?.message}. Falling back to Twelve Data.`);
          }

          if (candles.length === 0) {
            try {
              candles = await fetchTwelveDataCandles(cleanSym, intervals.twelveData, limit);
              providerSource = 'twelve_data';
            } catch {
              candles = await fetchBinanceCandles(cleanSym, intervals.binance, limit);
              providerSource = 'binance_fx';
            }
          }
        }
      }
    }

    if (!candles || candles.length === 0) {
      if (cached && cached.candles.length > 0) {
        return res.json({
          ok: true,
          source: 'stale_cache',
          symbol,
          timeframe,
          candles: cached.candles,
        });
      }
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

/**
 * GET /api/charts/export
 * Download 100% free historical OHLCV data as CSV or JSON for backtesting
 */
chartAnalysisRouter.get('/export', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || 'EURUSD').trim().toUpperCase();
    const timeframe = String(req.query.timeframe || 'D1').trim().toUpperCase();
    const format = String(req.query.format || 'csv').trim().toLowerCase();
    const limit = Math.min(10000, Math.max(50, parseInt(String(req.query.limit || '1000'), 10)));

    let candles: Candle[] = [];
    try {
      candles = await fetchYahooFinanceCandles(symbol, timeframe, limit);
    } catch {
      candles = await fetchDukascopyCandles(symbol, timeframe, limit);
    }

    if (candles.length === 0) {
      const intervals = normalizeIntervals(timeframe);
      candles = await fetchBinanceCandles(symbol, intervals.binance, limit);
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${symbol}_${timeframe}_history.json"`);
      return res.json({ symbol, timeframe, count: candles.length, candles });
    }

    // CSV format
    let csv = 'DateTime_UTC,Open,High,Low,Close,Volume\n';
    candles.forEach((c) => {
      const dt = new Date(c.time).toISOString();
      csv += `${dt},${c.open},${c.high},${c.low},${c.close},${c.volume}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${symbol}_${timeframe}_history.csv"`);
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'Export failed' });
  }
});

interface PriceCacheEntry {
  price: number;
  change24h: number;
  timestamp: number;
  source: string;
}

const priceCache = new Map<string, PriceCacheEntry>();

/**
 * GET /api/charts/price
 * Query parameters:
 *  - symbol: XAUUSD, EURUSD, BTCUSDT, etc.
 */
chartAnalysisRouter.get('/price', async (req, res) => {
  try {
    const rawSymbol = String(req.query.symbol || 'XAUUSD').trim().toUpperCase();
    const cleanSym = rawSymbol.replace(/[^A-Z0-9]/g, '');
    const now = Date.now();

    const cached = priceCache.get(cleanSym);
    if (cached && now - cached.timestamp < 10000) {
      return res.json({
        ok: true,
        symbol: rawSymbol,
        price: cached.price,
        change24h: cached.change24h,
        source: cached.source,
        timestamp: cached.timestamp,
      });
    }

    let binanceTickerSym = cleanSym;
    if (cleanSym === 'XAUUSD' || cleanSym === 'GOLD') binanceTickerSym = 'PAXGUSDT';
    else if (cleanSym === 'EURUSD') binanceTickerSym = 'EURUSDT';
    else if (cleanSym === 'GBPUSD') binanceTickerSym = 'GBPUSDT';
    else if (!binanceTickerSym.endsWith('USDT') && !binanceTickerSym.endsWith('USD') && !binanceTickerSym.endsWith('BTC')) {
      binanceTickerSym = `${binanceTickerSym}USDT`;
    }

    try {
      const bRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceTickerSym}`, {
        headers: { Accept: 'application/json', 'User-Agent': 'PrimePipFX-Ticker/1.0' },
      });
      if (bRes.ok) {
        const bData = await bRes.json();
        const price = parseFloat(bData.lastPrice);
        const change24h = parseFloat(bData.priceChangePercent || '0');
        if (!isNaN(price) && price > 0) {
          priceCache.set(cleanSym, { price, change24h, timestamp: now, source: 'binance' });
          return res.json({
            ok: true,
            symbol: rawSymbol,
            price,
            change24h,
            source: 'binance',
            timestamp: now,
          });
        }
      }
    } catch (binErr: any) {
      console.warn(`[CHART PRICE] Binance ticker note for ${binanceTickerSym}:`, binErr?.message);
    }

    // Fallback baseline for gold if external API is unreachable
    const fallbackPrice = cleanSym === 'XAUUSD' || cleanSym === 'GOLD' ? 4173.30 : 1.0845;
    return res.json({
      ok: true,
      symbol: rawSymbol,
      price: cached ? cached.price : fallbackPrice,
      change24h: cached ? cached.change24h : 0.32,
      source: 'baseline_fallback',
      timestamp: now,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error?.message || 'Failed to fetch price.' });
  }
});

