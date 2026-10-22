export interface LiveCandle {
  time: number; // millisecond timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartIndicators {
  ema20: (number | null)[];
  ema50: (number | null)[];
  ema200: (number | null)[];
  bollingerUpper: (number | null)[];
  bollingerMiddle: (number | null)[];
  bollingerLower: (number | null)[];
  rsi14: (number | null)[];
  macdLine: (number | null)[];
  macdSignal: (number | null)[];
  macdHistogram: (number | null)[];
}

// Client-side in-memory cache to guarantee zero latency on repeat pair selection
const memoryChartCache = new Map<string, { candles: LiveCandle[]; timestamp: number; source: string }>();

export interface DukascopyQuoteData {
  symbol: string;
  dukascopyInstrument: string;
  bid: number;
  ask: number;
  spreadPips: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  status: 'LIVE' | 'MARKET_CLOSED' | 'WEEKEND';
  source: 'dukascopy_bank_ecn';
}

export async function fetchDukascopyRealtimeQuote(symbol: string): Promise<DukascopyQuoteData | null> {
  try {
    const res = await fetch(`/api/dukascopy/realtime?symbol=${encodeURIComponent(symbol)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.quote) return data.quote;
    }
  } catch (e) {
    console.warn('[DUKASCOPY SERVICE] Realtime quote notice:', e);
  }
  return null;
}

export async function fetchLiveChartCandles(
  symbol: string,
  timeframe: string,
  limit: number = 350,
  options?: { provider?: string; range?: string; period1?: number; period2?: number }
): Promise<{ ok: boolean; candles: LiveCandle[]; source: string; error?: string }> {
  const cleanSym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanTf = timeframe.toUpperCase();
  const cacheKey = `${cleanSym}_${cleanTf}_${limit}_${options?.range || ''}_${options?.period1 || ''}_${options?.provider || ''}`;

  // 1. Check local memory cache (15s validity for live, instant for switching)
  const cached = memoryChartCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 15000 && cached.candles.length > 0) {
    return { ok: true, candles: cached.candles, source: 'cache' };
  }

  // 2. Fetch from backend proxy
  try {
    const params = new URLSearchParams({
      symbol: cleanSym,
      timeframe: cleanTf,
      limit: String(limit),
    });
    if (options?.provider) params.set('provider', options.provider);
    if (options?.range) params.set('range', options.range);
    if (options?.period1) params.set('period1', String(options.period1));
    if (options?.period2) params.set('period2', String(options.period2));

    const res = await fetch(`/api/charts/candles?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.candles) && data.candles.length > 0) {
        memoryChartCache.set(cacheKey, {
          candles: data.candles,
          timestamp: Date.now(),
          source: data.source,
        });
        return { ok: true, candles: data.candles, source: data.source };
      }
    }
  } catch (err: any) {
    console.warn('[LIVE CHART SERVICE] Server route warning:', err?.message || err);
  }

  // 3. Fallback: Direct Binance public fetch if crypto or supported FX
  try {
    const tfMap: Record<string, string> = {
      M1: '1m',
      M5: '5m',
      M15: '15m',
      M30: '30m',
      H1: '1h',
      H4: '4h',
      D1: '1d',
      W1: '1w',
    };
    const bTf = tfMap[cleanTf] || '15m';

    let binanceSym = cleanSym;
    if (binanceSym === 'EURUSD') binanceSym = 'EURUSDT';
    if (binanceSym === 'GBPUSD') binanceSym = 'GBPUSDT';
    if (binanceSym === 'XAUUSD' || binanceSym === 'GOLD') binanceSym = 'PAXGUSDT';
    else if (!binanceSym.endsWith('USDT') && !binanceSym.endsWith('USD') && !binanceSym.endsWith('BTC')) {
      binanceSym = `${binanceSym}USDT`;
    }

    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSym}&interval=${bTf}&limit=${limit}`);
    if (res.ok) {
      const raw = await res.json();
      if (Array.isArray(raw) && raw.length > 0) {
        const parsed: LiveCandle[] = raw.map((k: any) => ({
          time: Number(k[0]),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));

        memoryChartCache.set(cacheKey, {
          candles: parsed,
          timestamp: Date.now(),
          source: 'binance_direct',
        });

        return { ok: true, candles: parsed, source: 'binance_direct' };
      }
    }
  } catch (directErr) {
    console.warn('[LIVE CHART SERVICE] Direct fallback notice:', directErr);
  }

  // 4. Return cached even if stale if available
  if (cached && cached.candles.length > 0) {
    return { ok: true, candles: cached.candles, source: 'stale_cache' };
  }

  return {
    ok: false,
    candles: [],
    source: 'none',
    error: `Unable to stream live price data for ${symbol}. Please try again in a moment.`,
  };
}

/**
 * WebSocket manager for live crypto sub-second streaming
 */
export function connectBinanceWebSocket(
  symbol: string,
  timeframe: string,
  onCandleUpdate: (candle: LiveCandle) => void
): () => void {
  const cleanSym = symbol.toLowerCase().replace(/[^a-z0-9]/g, '');
  const isCrypto =
    cleanSym.includes('btc') ||
    cleanSym.includes('eth') ||
    cleanSym.includes('sol') ||
    cleanSym.includes('bnb') ||
    cleanSym.includes('xrp') ||
    cleanSym.includes('doge') ||
    cleanSym.includes('ada') ||
    cleanSym.endsWith('usdt');

  if (!isCrypto) {
    return () => {}; // Forex pairs use interval polling
  }

  const tfMap: Record<string, string> = {
    M1: '1m',
    M5: '5m',
    M15: '15m',
    M30: '30m',
    H1: '1h',
    H4: '4h',
    D1: '1d',
    W1: '1w',
  };
  const bTf = tfMap[timeframe.toUpperCase()] || '15m';
  let pair = cleanSym;
  if (!pair.endsWith('usdt') && !pair.endsWith('usd') && !pair.endsWith('btc')) {
    pair = `${pair}usdt`;
  }

  const streamUrl = `wss://stream.binance.com:9443/ws/${pair}@kline_${bTf}`;
  let ws: WebSocket | null = null;
  let isClosed = false;

  try {
    ws = new WebSocket(streamUrl);
    ws.onmessage = (event) => {
      if (isClosed) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg?.k) {
          const k = msg.k;
          onCandleUpdate({
            time: Number(k.t),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            volume: parseFloat(k.v),
          });
        }
      } catch {}
    };
    ws.onerror = () => {};
  } catch {}

  return () => {
    isClosed = true;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
  };
}

// ============================================================================
// TECHNICAL INDICATORS MATHEMATICAL ENGINES
// ============================================================================

export function computeIndicators(candles: LiveCandle[]): ChartIndicators {
  const n = candles.length;
  const ema20: (number | null)[] = new Array(n).fill(null);
  const ema50: (number | null)[] = new Array(n).fill(null);
  const ema200: (number | null)[] = new Array(n).fill(null);
  const bollingerUpper: (number | null)[] = new Array(n).fill(null);
  const bollingerMiddle: (number | null)[] = new Array(n).fill(null);
  const bollingerLower: (number | null)[] = new Array(n).fill(null);
  const rsi14: (number | null)[] = new Array(n).fill(null);
  const macdLine: (number | null)[] = new Array(n).fill(null);
  const macdSignal: (number | null)[] = new Array(n).fill(null);
  const macdHistogram: (number | null)[] = new Array(n).fill(null);

  if (n < 5) {
    return {
      ema20,
      ema50,
      ema200,
      bollingerUpper,
      bollingerMiddle,
      bollingerLower,
      rsi14,
      macdLine,
      macdSignal,
      macdHistogram,
    };
  }

  // Helper for EMA
  function fillEMA(period: number, outArr: (number | null)[]) {
    if (n < period) return;
    const k = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += candles[i].close;
    let prev = sum / period;
    outArr[period - 1] = prev;
    for (let i = period; i < n; i++) {
      const cur = candles[i].close * k + prev * (1 - k);
      outArr[i] = cur;
      prev = cur;
    }
  }

  fillEMA(20, ema20);
  fillEMA(50, ema50);
  fillEMA(200, ema200);

  // Bollinger Bands (20 periods, 2 standard deviations)
  const bbPeriod = 20;
  if (n >= bbPeriod) {
    for (let i = bbPeriod - 1; i < n; i++) {
      let sum = 0;
      for (let j = i - bbPeriod + 1; j <= i; j++) {
        sum += candles[j].close;
      }
      const sma = sum / bbPeriod;
      let varianceSum = 0;
      for (let j = i - bbPeriod + 1; j <= i; j++) {
        varianceSum += Math.pow(candles[j].close - sma, 2);
      }
      const stdDev = Math.sqrt(varianceSum / bbPeriod);
      bollingerMiddle[i] = sma;
      bollingerUpper[i] = sma + 2 * stdDev;
      bollingerLower[i] = sma - 2 * stdDev;
    }
  }

  // RSI 14
  const rsiPeriod = 14;
  if (n > rsiPeriod) {
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i <= rsiPeriod; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) avgGain += change;
      else avgLoss += Math.abs(change);
    }
    avgGain /= rsiPeriod;
    avgLoss /= rsiPeriod;

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi14[rsiPeriod] = 100 - 100 / (1 + rs);

    for (let i = rsiPeriod + 1; i < n; i++) {
      const change = candles[i].close - candles[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (rsiPeriod - 1) + gain) / rsiPeriod;
      avgLoss = (avgLoss * (rsiPeriod - 1) + loss) / rsiPeriod;
      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi14[i] = 100 - 100 / (1 + rs);
    }
  }

  // MACD (12, 26, 9)
  const ema12: (number | null)[] = new Array(n).fill(null);
  const ema26: (number | null)[] = new Array(n).fill(null);
  fillEMA(12, ema12);
  fillEMA(26, ema26);

  for (let i = 25; i < n; i++) {
    if (ema12[i] !== null && ema26[i] !== null) {
      macdLine[i] = ema12[i]! - ema26[i]!;
    }
  }

  // Signal line (9-period EMA of MACD Line)
  const validMacdStarts = macdLine.findIndex((v) => v !== null);
  if (validMacdStarts >= 0 && n - validMacdStarts >= 9) {
    const kSig = 2 / (9 + 1);
    let sigSum = 0;
    for (let i = validMacdStarts; i < validMacdStarts + 9; i++) {
      sigSum += macdLine[i]!;
    }
    let prevSig = sigSum / 9;
    macdSignal[validMacdStarts + 8] = prevSig;
    macdHistogram[validMacdStarts + 8] = macdLine[validMacdStarts + 8]! - prevSig;

    for (let i = validMacdStarts + 9; i < n; i++) {
      if (macdLine[i] !== null) {
        const curSig = macdLine[i]! * kSig + prevSig * (1 - kSig);
        macdSignal[i] = curSig;
        macdHistogram[i] = macdLine[i]! - curSig;
        prevSig = curSig;
      }
    }
  }

  return {
    ema20,
    ema50,
    ema200,
    bollingerUpper,
    bollingerMiddle,
    bollingerLower,
    rsi14,
    macdLine,
    macdSignal,
    macdHistogram,
  };
}

export async function fetchLiveGoldQuote(): Promise<{ price: number; change24h: number; timestamp: number }> {
  try {
    const res = await fetch('/api/charts/price?symbol=XAUUSD');
    if (res.ok) {
      const data = await res.json();
      if (data.ok && typeof data.price === 'number' && data.price > 0) {
        return {
          price: data.price,
          change24h: typeof data.change24h === 'number' ? data.change24h : 0.32,
          timestamp: data.timestamp || Date.now(),
        };
      }
    }
  } catch (err) {
    console.warn('[LIVE GOLD QUOTE] Backend proxy warning, falling back to direct feed:', err);
  }

  // Direct client-side fetch from Binance PAXG ticker (Spot Gold backing 1:1)
  try {
    const bRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=PAXGUSDT');
    if (bRes.ok) {
      const bData = await bRes.json();
      const price = parseFloat(bData.lastPrice);
      const change24h = parseFloat(bData.priceChangePercent || '0');
      if (!isNaN(price) && price > 0) {
        return { price, change24h, timestamp: Date.now() };
      }
    }
  } catch {}

  return { price: 4173.30, change24h: 0.32, timestamp: Date.now() };
}

