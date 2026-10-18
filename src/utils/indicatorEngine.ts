export interface CandlestickPoint {
  time: number; // millisecond or second timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LinePoint {
  time: number;
  value: number;
}

export interface HistogramPoint {
  time: number;
  value: number;
  color?: string;
}

export interface BollingerBandsResult {
  upper: LinePoint[];
  middle: LinePoint[];
  lower: LinePoint[];
}

export interface MacdResult {
  macd: LinePoint[];
  signal: LinePoint[];
  histogram: HistogramPoint[];
}

export interface StochasticResult {
  k: LinePoint[];
  d: LinePoint[];
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(candles: CandlestickPoint[], period: number): LinePoint[] {
  const result: LinePoint[] = [];
  if (candles.length < period) return result;

  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      result.push({
        time: candles[i].time,
        value: Number((sum / period).toFixed(5)),
      });
    }
  }
  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: CandlestickPoint[], period: number): LinePoint[] {
  const result: LinePoint[] = [];
  if (candles.length < period) return result;

  const multiplier = 2 / (period + 1);

  // Initial SMA as first EMA seed
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / period;
  result.push({
    time: candles[period - 1].time,
    value: Number(prevEma.toFixed(5)),
  });

  for (let i = period; i < candles.length; i++) {
    const currentEma = (candles[i].close - prevEma) * multiplier + prevEma;
    result.push({
      time: candles[i].time,
      value: Number(currentEma.toFixed(5)),
    });
    prevEma = currentEma;
  }
  return result;
}

/**
 * Relative Strength Index (RSI) - Standard Wilder's Smoothing
 */
export function calculateRSI(candles: CandlestickPoint[], period: number = 14): LinePoint[] {
  const result: LinePoint[] = [];
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const firstRsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + firstRs);

  result.push({
    time: candles[period].time,
    value: Number(firstRsi.toFixed(2)),
  });

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    result.push({
      time: candles[i].time,
      value: Number(rsi.toFixed(2)),
    });
  }

  return result;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * Standard: Fast 12, Slow 26, Signal 9
 */
export function calculateMACD(
  candles: CandlestickPoint[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MacdResult {
  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);

  // Align by time
  const slowMap = new Map<number, number>();
  for (const p of slowEma) slowMap.set(p.time, p.value);

  const macdLine: LinePoint[] = [];
  for (const fast of fastEma) {
    if (slowMap.has(fast.time)) {
      const slowVal = slowMap.get(fast.time)!;
      macdLine.push({
        time: fast.time,
        value: Number((fast.value - slowVal).toFixed(5)),
      });
    }
  }

  // Calculate Signal line (EMA of MACD line)
  const signalMultiplier = 2 / (signalPeriod + 1);
  const signalLine: LinePoint[] = [];
  const histogram: HistogramPoint[] = [];

  if (macdLine.length >= signalPeriod) {
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) {
      sum += macdLine[i].value;
    }
    let prevSignal = sum / signalPeriod;
    signalLine.push({
      time: macdLine[signalPeriod - 1].time,
      value: Number(prevSignal.toFixed(5)),
    });

    const initialHist = macdLine[signalPeriod - 1].value - prevSignal;
    histogram.push({
      time: macdLine[signalPeriod - 1].time,
      value: Number(initialHist.toFixed(5)),
      color: initialHist >= 0 ? '#10b981' : '#ef4444',
    });

    for (let i = signalPeriod; i < macdLine.length; i++) {
      const currentSignal = (macdLine[i].value - prevSignal) * signalMultiplier + prevSignal;
      signalLine.push({
        time: macdLine[i].time,
        value: Number(currentSignal.toFixed(5)),
      });

      const histVal = macdLine[i].value - currentSignal;
      histogram.push({
        time: macdLine[i].time,
        value: Number(histVal.toFixed(5)),
        color: histVal >= 0 ? '#10b981' : '#ef4444',
      });
      prevSignal = currentSignal;
    }
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
  };
}

/**
 * Bollinger Bands
 * Standard: Period 20, Multiplier 2.0
 */
export function calculateBollingerBands(
  candles: CandlestickPoint[],
  period: number = 20,
  multiplier: number = 2.0
): BollingerBandsResult {
  const middle: LinePoint[] = [];
  const upper: LinePoint[] = [];
  const lower: LinePoint[] = [];

  if (candles.length < period) return { upper, middle, lower };

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    const mean = sum / period;

    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(candles[j].close - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    const time = candles[i].time;
    const up = mean + multiplier * stdDev;
    const low = mean - multiplier * stdDev;

    middle.push({ time, value: Number(mean.toFixed(5)) });
    upper.push({ time, value: Number(up.toFixed(5)) });
    lower.push({ time, value: Number(low.toFixed(5)) });
  }

  return { upper, middle, lower };
}

/**
 * Stochastic Oscillator (%K, %D)
 * Standard: %K period 14, %K smoothing 3, %D period 3
 */
export function calculateStochastic(
  candles: CandlestickPoint[],
  kPeriod: number = 14,
  kSmooth: number = 3,
  dPeriod: number = 3
): StochasticResult {
  const rawK: LinePoint[] = [];
  if (candles.length < kPeriod) return { k: [], d: [] };

  for (let i = kPeriod - 1; i < candles.length; i++) {
    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }

    const currentClose = candles[i].close;
    const range = highestHigh - lowestLow;
    const kVal = range === 0 ? 50 : ((currentClose - lowestLow) / range) * 100;
    rawK.push({ time: candles[i].time, value: kVal });
  }

  // Smooth %K
  const smoothedK: LinePoint[] = [];
  if (rawK.length >= kSmooth) {
    for (let i = kSmooth - 1; i < rawK.length; i++) {
      let sum = 0;
      for (let j = i - kSmooth + 1; j <= i; j++) {
        sum += rawK[j].value;
      }
      smoothedK.push({
        time: rawK[i].time,
        value: Number((sum / kSmooth).toFixed(2)),
      });
    }
  }

  // Calculate %D (SMA of smoothed %K)
  const dLine: LinePoint[] = [];
  if (smoothedK.length >= dPeriod) {
    for (let i = dPeriod - 1; i < smoothedK.length; i++) {
      let sum = 0;
      for (let j = i - dPeriod + 1; j <= i; j++) {
        sum += smoothedK[j].value;
      }
      dLine.push({
        time: smoothedK[i].time,
        value: Number((sum / dPeriod).toFixed(2)),
      });
    }
  }

  return { k: smoothedK, d: dLine };
}

/**
 * Volume Histogram
 */
export function formatVolumeSeries(candles: CandlestickPoint[]): HistogramPoint[] {
  return candles.map((c) => ({
    time: c.time,
    value: c.volume,
    color: c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.45)',
  }));
}
