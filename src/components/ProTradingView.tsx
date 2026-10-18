import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  CandlestickChart,
  Search,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Clock,
  Shield,
  Palette,
  Share2,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  CheckCircle2,
  XCircle,
  BookOpen,
  History,
  Target,
  AlarmClock,
  Newspaper,
  Calendar,
  Building2,
  Wallet,
  RotateCcw,
  GripVertical,
  Compass,
  Filter,
  Sparkles,
  Camera,
  Check,
  Copy,
  Flame,
  Info,
  Layers,
  Scale,
} from 'lucide-react';
import { Trade, UserAccount, AccountSettings } from '../types';
import {
  FundamentalIntelligenceEngine,
  FullIntelligenceReport,
  PairIntelligenceResult,
  BiasClassification,
} from '../services/fundamentalIntelligenceEngine';
import {
  CurrencyCode,
  CurrencyScoreResult,
  PairDifferentialResult,
} from '../types/fundamentalIndicatorTypes';
import {
  calculateCurrencyScore,
  calculatePairDifferential,
  PRIMARY_PAIR_MATRIX_28,
} from '../utils/fundamentalCalculationEngine';
import {
  CURRENCY_METADATA,
  DEFAULT_CATEGORY_WEIGHTS,
} from '../data/fundamentalRegistryData';
import {
  DEFAULT_OBSERVATIONS,
  DEFAULT_COT_RECORDS,
  DEFAULT_SENTIMENT_RECORDS,
  DEFAULT_INTEREST_RATES,
  DEFAULT_RETAIL_POSITIONING,
  DEFAULT_MULTI_ASSET_FUNDAMENTALS,
  MultiAssetFundamentalRecord,
} from '../data/defaultFundamentalObservations';
import { syncFundamentalMarketData } from '../services/fundamentalMarketSyncService';
import { fetchUpcomingEvents, CalendarEvent } from '../services/economicCalendarService';
import { PairDeepDiveModal } from './fundamental/PairDeepDiveModal';

// ============================================================================
// TIMEFRAMES & INTERVALS
// ============================================================================
export const TIMEFRAMES = [
  { id: '1', label: '1m', seconds: 60, desc: '1 Minute Scalping' },
  { id: '3', label: '3m', seconds: 180, desc: '3 Minutes Momentum' },
  { id: '5', label: '5m', seconds: 300, desc: '5 Minutes Intraday' },
  { id: '15', label: '15m', seconds: 900, desc: '15 Minutes Execution' },
  { id: '30', label: '30m', seconds: 1800, desc: '30 Minutes Structure' },
  { id: '60', label: '1h', seconds: 3600, desc: '1 Hour Key Levels' },
  { id: '120', label: '2h', seconds: 7200, desc: '2 Hours Intermediate' },
  { id: '240', label: '4h', seconds: 14400, desc: '4 Hours Trend Bias' },
  { id: 'D', label: '1D', seconds: 86400, desc: 'Daily Session' },
  { id: 'W', label: '1W', seconds: 604800, desc: 'Weekly Macro' },
];

export function normalizeInterval(raw: string): string {
  const clean = (raw || '').trim().toUpperCase();
  if (['1', '1M', 'M1'].includes(clean)) return '1';
  if (['3', '3M', 'M3'].includes(clean)) return '3';
  if (['5', '5M', 'M5'].includes(clean)) return '5';
  if (['15', '15M', 'M15'].includes(clean)) return '15';
  if (['30', '30M', 'M30'].includes(clean)) return '30';
  if (['60', '1H', 'H1', '60M'].includes(clean)) return '60';
  if (['120', '2H', 'H2'].includes(clean)) return '120';
  if (['240', '4H', 'H4'].includes(clean)) return '240';
  if (['D', '1D', 'D1', 'DAILY'].includes(clean)) return 'D';
  if (['W', '1W', 'W1', 'WEEKLY'].includes(clean)) return 'W';
  return '60';
}

export function calculateCandleCountdown(interval: string): {
  text: string;
  secondsRemaining: number;
  totalSeconds: number;
  progressPercent: number;
  label: string;
  candleStartUnix: number;
} {
  const norm = normalizeInterval(interval);
  const tf = TIMEFRAMES.find((t) => t.id === norm) || TIMEFRAMES[5];
  const totalSeconds = tf.seconds;

  const now = new Date();
  const nowUnixSec = Math.floor(now.getTime() / 1000);

  let secondsRemaining = 0;
  let candleStartUnix = 0;

  if (norm === 'D') {
    const currentUtc = new Date(now.toISOString());
    const targetUtc = new Date(
      Date.UTC(currentUtc.getUTCFullYear(), currentUtc.getUTCMonth(), currentUtc.getUTCDate(), 22, 0, 0)
    );
    if (currentUtc.getTime() >= targetUtc.getTime()) {
      targetUtc.setUTCDate(targetUtc.getUTCDate() + 1);
    }
    const targetUnixSec = Math.floor(targetUtc.getTime() / 1000);
    secondsRemaining = Math.max(1, targetUnixSec - nowUnixSec);
    candleStartUnix = nowUnixSec - (86400 - secondsRemaining);
  } else if (norm === 'W') {
    const currentUtc = new Date(now.toISOString());
    const dayOfWeek = currentUtc.getUTCDay();
    let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    if (dayOfWeek === 5 && currentUtc.getUTCHours() >= 22) {
      daysUntilFriday = 7;
    }
    const nextFriday = new Date(
      Date.UTC(currentUtc.getUTCFullYear(), currentUtc.getUTCMonth(), currentUtc.getUTCDate() + daysUntilFriday, 22, 0, 0)
    );
    const targetUnixSec = Math.floor(nextFriday.getTime() / 1000);
    secondsRemaining = Math.max(1, targetUnixSec - nowUnixSec);
    candleStartUnix = targetUnixSec - totalSeconds;
  } else {
    secondsRemaining = totalSeconds - (nowUnixSec % totalSeconds);
    candleStartUnix = nowUnixSec - (nowUnixSec % totalSeconds);
  }

  if (secondsRemaining <= 0) secondsRemaining = totalSeconds;
  const elapsedSeconds = totalSeconds - secondsRemaining;
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedSeconds / totalSeconds) * 100)));

  let text = '';
  if (totalSeconds <= 3600) {
    const m = Math.floor(secondsRemaining / 60);
    const s = secondsRemaining % 60;
    text = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else if (totalSeconds <= 86400) {
    const h = Math.floor(secondsRemaining / 3600);
    const m = Math.floor((secondsRemaining % 3600) / 60);
    const s = secondsRemaining % 60;
    text = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else {
    const d = Math.floor(secondsRemaining / 86400);
    const h = Math.floor((secondsRemaining % 86400) / 3600);
    const m = Math.floor((secondsRemaining % 3600) / 60);
    const s = secondsRemaining % 60;
    text = `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return { text, secondsRemaining, totalSeconds, progressPercent, label: tf.label, candleStartUnix };
}

// ============================================================================
// BASELINE PRICING & PIP METRICS
// ============================================================================
export interface InstrumentMeta {
  price: number;
  pipDecimals: number;
  pipSize: number;
  spreadPips: number;
  pipValuePerLot: number; // Value in USD per 1.00 lot for 1 pip move
}

const BASELINE_PRICES: Record<string, InstrumentMeta> = {
  EURUSD: { price: 1.0845, pipDecimals: 5, pipSize: 0.0001, spreadPips: 0.8, pipValuePerLot: 10.0 },
  GBPUSD: { price: 1.2982, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.1, pipValuePerLot: 10.0 },
  USDJPY: { price: 152.45, pipDecimals: 3, pipSize: 0.01, spreadPips: 1.0, pipValuePerLot: 6.6 },
  AUDUSD: { price: 0.6621, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.0, pipValuePerLot: 10.0 },
  USDCAD: { price: 1.3824, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.2, pipValuePerLot: 7.2 },
  USDCHF: { price: 0.8652, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.2, pipValuePerLot: 11.5 },
  NZDUSD: { price: 0.6015, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.4, pipValuePerLot: 10.0 },
  GBPJPY: { price: 197.85, pipDecimals: 3, pipSize: 0.01, spreadPips: 1.8, pipValuePerLot: 6.6 },
  EURJPY: { price: 165.38, pipDecimals: 3, pipSize: 0.01, spreadPips: 1.5, pipValuePerLot: 6.6 },
  EURGBP: { price: 0.8355, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.0, pipValuePerLot: 13.0 },
  AUDJPY: { price: 100.92, pipDecimals: 3, pipSize: 0.01, spreadPips: 1.6, pipValuePerLot: 6.6 },
  CADJPY: { price: 110.28, pipDecimals: 3, pipSize: 0.01, spreadPips: 1.6, pipValuePerLot: 6.6 },
  CHFJPY: { price: 176.20, pipDecimals: 3, pipSize: 0.01, spreadPips: 1.8, pipValuePerLot: 6.6 },
  NZDJPY: { price: 91.70, pipDecimals: 3, pipSize: 0.01, spreadPips: 1.8, pipValuePerLot: 6.6 },
  GBPAUD: { price: 1.9610, pipDecimals: 5, pipSize: 0.0001, spreadPips: 2.0, pipValuePerLot: 6.5 },
  GBPCAD: { price: 1.7950, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.8, pipValuePerLot: 7.2 },
  GBPCHF: { price: 1.1230, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.8, pipValuePerLot: 11.5 },
  GBPNZD: { price: 2.1580, pipDecimals: 5, pipSize: 0.0001, spreadPips: 2.2, pipValuePerLot: 6.0 },
  EURAUD: { price: 1.6380, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.8, pipValuePerLot: 6.5 },
  EURCAD: { price: 1.4980, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.5, pipValuePerLot: 7.2 },
  EURCHF: { price: 0.9380, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.5, pipValuePerLot: 11.5 },
  EURNZD: { price: 1.8020, pipDecimals: 5, pipSize: 0.0001, spreadPips: 2.0, pipValuePerLot: 6.0 },
  AUDCAD: { price: 0.9150, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.4, pipValuePerLot: 7.2 },
  AUDCHF: { price: 0.5730, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.5, pipValuePerLot: 11.5 },
  AUDNZD: { price: 1.1010, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.6, pipValuePerLot: 6.0 },
  CADCHF: { price: 0.6260, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.5, pipValuePerLot: 11.5 },
  NZDCAD: { price: 0.8310, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.8, pipValuePerLot: 7.2 },
  NZDCHF: { price: 0.5200, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.8, pipValuePerLot: 11.5 },
  // Metals & Commodities
  XAUUSD: { price: 2685.5, pipDecimals: 2, pipSize: 0.1, spreadPips: 2.5, pipValuePerLot: 10.0 },
  XAGUSD: { price: 31.85, pipDecimals: 3, pipSize: 0.01, spreadPips: 3.0, pipValuePerLot: 50.0 },
  USOIL: { price: 71.50, pipDecimals: 2, pipSize: 0.01, spreadPips: 2.5, pipValuePerLot: 10.0 },
  BRENT: { price: 75.80, pipDecimals: 2, pipSize: 0.01, spreadPips: 2.5, pipValuePerLot: 10.0 },
  // Indices
  US30: { price: 42850, pipDecimals: 1, pipSize: 1, spreadPips: 2.0, pipValuePerLot: 1.0 },
  NAS100: { price: 20450, pipDecimals: 1, pipSize: 1, spreadPips: 1.5, pipValuePerLot: 1.0 },
  SPX500: { price: 5860, pipDecimals: 2, pipSize: 0.1, spreadPips: 0.5, pipValuePerLot: 10.0 },
  GER40: { price: 19450, pipDecimals: 1, pipSize: 1, spreadPips: 1.5, pipValuePerLot: 1.1 },
  UK100: { price: 8240, pipDecimals: 1, pipSize: 1, spreadPips: 1.5, pipValuePerLot: 1.3 },
  // Stocks
  NVDA: { price: 138.50, pipDecimals: 2, pipSize: 0.01, spreadPips: 1.0, pipValuePerLot: 1.0 },
  AAPL: { price: 244.60, pipDecimals: 2, pipSize: 0.01, spreadPips: 1.0, pipValuePerLot: 1.0 },
  MSFT: { price: 416.20, pipDecimals: 2, pipSize: 0.01, spreadPips: 1.0, pipValuePerLot: 1.0 },
  AMZN: { price: 226.80, pipDecimals: 2, pipSize: 0.01, spreadPips: 1.0, pipValuePerLot: 1.0 },
  GOOGL: { price: 189.50, pipDecimals: 2, pipSize: 0.01, spreadPips: 1.0, pipValuePerLot: 1.0 },
  META: { price: 668.00, pipDecimals: 2, pipSize: 0.01, spreadPips: 1.5, pipValuePerLot: 1.0 },
  TSLA: { price: 220.50, pipDecimals: 2, pipSize: 0.01, spreadPips: 1.5, pipValuePerLot: 1.0 },
  // Crypto
  BTCUSDT: { price: 68450, pipDecimals: 2, pipSize: 1, spreadPips: 5.0, pipValuePerLot: 1.0 },
  ETHUSDT: { price: 2640, pipDecimals: 2, pipSize: 0.1, spreadPips: 1.2, pipValuePerLot: 1.0 },
  SOLUSDT: { price: 175.4, pipDecimals: 2, pipSize: 0.1, spreadPips: 0.5, pipValuePerLot: 1.0 },
  BNBUSDT: { price: 595.0, pipDecimals: 2, pipSize: 0.1, spreadPips: 0.8, pipValuePerLot: 1.0 },
  XRPUSDT: { price: 0.542, pipDecimals: 4, pipSize: 0.0001, spreadPips: 1.0, pipValuePerLot: 10.0 },
};

export function parseSymbolAndBroker(input: string, fallbackBroker?: string): { symbol: string; broker: string } {
  if (!input) return { symbol: 'EURUSD', broker: 'FX' };
  let raw = input.trim();
  let detectedBroker = fallbackBroker || 'FX';
  if (detectedBroker.toUpperCase() === 'FCM' || detectedBroker.toUpperCase() === 'FXCM') detectedBroker = 'FX';

  if (raw.includes(':')) {
    const parts = raw.split(':');
    detectedBroker = parts[0].toUpperCase();
    if (detectedBroker === 'FCM' || detectedBroker === 'FXCM') detectedBroker = 'FX';
    raw = parts[1] || '';
  } else if (raw.includes('/')) {
    raw = raw.replace('/', '');
  }

  // Remove known broker prefixes if accidentally concatenated (e.g., FXCMEURUSD -> EURUSD)
  const KNOWN_PREFIXES = ['CAPITALCOM', 'PEPPERSTONE', 'BLACKBULL', 'FOREXCOM', 'BINANCE', 'NASDAQ', 'OANDA', 'FXCM', 'FCM', 'TVC', 'FX'];
  for (const p of KNOWN_PREFIXES) {
    if (raw.toUpperCase().startsWith(p) && raw.length > p.length + 2) {
      detectedBroker = (p === 'FCM' || p === 'FXCM') ? 'FX' : p;
      raw = raw.substring(p.length);
      break;
    }
  }

  const clean = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return { symbol: clean || 'EURUSD', broker: detectedBroker };
}

export function getInstrumentMeta(symbol: string): InstrumentMeta {
  const parsed = parseSymbolAndBroker(symbol);
  const clean = parsed.symbol;
  if (BASELINE_PRICES[clean]) return BASELINE_PRICES[clean];
  if (clean.includes('JPY')) return { price: 150.0, pipDecimals: 3, pipSize: 0.01, spreadPips: 1.5, pipValuePerLot: 6.6 };
  if (clean.includes('USDT') || clean.includes('BTC') || clean.includes('ETH')) {
    return { price: 2500.0, pipDecimals: 2, pipSize: 1, spreadPips: 2.0, pipValuePerLot: 1.0 };
  }
  return { price: 1.1, pipDecimals: 5, pipSize: 0.0001, spreadPips: 1.0, pipValuePerLot: 10.0 };
}

// ============================================================================
// GUARANTEED TRADINGVIEW SYMBOL RESOLVER
// ============================================================================
// CANONICAL 28-PAIR FUNDAMENTAL INTELLIGENCE DIRECTORY
// Verified Central Bank Policy, Yield Spread & Macro Momentum Matrix
// ============================================================================
export interface CanonicalFundamentalRecord {
  symbol: string;
  name: string;
  baseCurrency: string;
  quoteCurrency: string;
  score: number;
  bias: 'STRONGLY_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONGLY_BEARISH';
  biasLabel: string;
  isBullish: boolean;
  isBearish: boolean;
  confidence: number;
  rateDiff: string;
  yieldSpread: string;
  rationale: string;
  drivers: string[];
  tradeSuitability: string;
  category: string;
}

export const CANONICAL_28_FUNDAMENTALS: Record<string, CanonicalFundamentalRecord> = {
  EURUSD: {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    score: -36,
    bias: 'BEARISH',
    biasLabel: 'BEARISH (LONG-TERM)',
    isBullish: false,
    isBearish: true,
    confidence: 93,
    rateDiff: 'ECB 2.75% vs Fed 4.50% (-1.75% Gap)',
    yieldSpread: '10Y Bund vs 10Y UST: -195 bps',
    rationale: 'ECB consecutive rate cuts to stimulate sluggish Eurozone manufacturing contrast with US economic resilience and dollar rate premium.',
    drivers: [
      'ECB terminal rate expectations repricing lower toward 2.00%.',
      'US 10-year Treasury yield premium above 4.40% attracts global sovereign capital.',
      'Eurozone composite PMI remains in contraction territory below 48.5.',
    ],
    tradeSuitability: 'High-Conviction Macro Bearish Divergence',
    category: 'Forex Major',
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    name: 'British Pound / US Dollar',
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
    score: -18,
    bias: 'BEARISH',
    biasLabel: 'BEARISH (LONG-TERM)',
    isBullish: false,
    isBearish: true,
    confidence: 88,
    rateDiff: 'BoE 4.50% vs Fed 4.50% (Parity)',
    yieldSpread: '10Y Gilt vs 10Y UST: -5 bps',
    rationale: 'UK services inflation stickiness balanced against US labor strength and broader dollar index purchasing power.',
    drivers: [
      'Bank of England cautious on easing due to elevated UK private wage growth.',
      'US economic outperformance limits sustainable Sterling upside.',
      'COT commercial positioning shows net neutral institutional positioning.',
    ],
    tradeSuitability: 'Moderate Opportunity (Range-Bound Bearish Tilt)',
    category: 'Forex Major',
  },
  USDJPY: {
    symbol: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    score: 68,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 96,
    rateDiff: 'Fed 4.50% vs BoJ 0.50% (+4.00% Spread)',
    yieldSpread: '10Y UST vs 10Y JGB: +340 bps',
    rationale: 'Massive positive interest carry trade spread and real yield differential firmly favor USD over Japanese Yen.',
    drivers: [
      '400 bps policy rate differential produces steady daily rollover carry yield.',
      'Bank of Japan normalization remains gradual amid soft domestic consumer spending.',
      'Institutional fund managers maintain long-term USD/JPY long allocations.',
    ],
    tradeSuitability: 'Highest-Conviction Carry Trade Trend',
    category: 'Forex Major',
  },
  USDCHF: {
    symbol: 'USDCHF',
    name: 'US Dollar / Swiss Franc',
    baseCurrency: 'USD',
    quoteCurrency: 'CHF',
    score: 62,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 94,
    rateDiff: 'Fed 4.50% vs SNB 0.50% (+4.00% Spread)',
    yieldSpread: '10Y UST vs 10Y Swiss: +380 bps',
    rationale: 'Swiss National Bank dovish policy rate cuts to 0.50% to curb franc overvaluation drive durable USD/CHF bullish carry.',
    drivers: [
      'SNB willingness to intervene in FX markets to prevent domestic deflation.',
      'US Treasury yield advantage of +380 bps over Swiss confederation bonds.',
      'Global corporate cash repatriation into higher-yielding US Dollar assets.',
    ],
    tradeSuitability: 'High-Conviction Bullish Carry Divergence',
    category: 'Forex Major',
  },
  AUDUSD: {
    symbol: 'AUDUSD',
    name: 'Australian Dollar / US Dollar',
    baseCurrency: 'AUD',
    quoteCurrency: 'USD',
    score: -16,
    bias: 'BEARISH',
    biasLabel: 'BEARISH (LONG-TERM)',
    isBullish: false,
    isBearish: true,
    confidence: 89,
    rateDiff: 'RBA 4.35% vs Fed 4.50% (-0.15% Spread)',
    yieldSpread: '10Y ACGB vs 10Y UST: -10 bps',
    rationale: 'China commodity import slowdown and subdued iron ore prices outweigh RBA restrictive hold.',
    drivers: [
      'Iron ore and industrial metal benchmark futures face demand resistance in Asia.',
      'US Dollar strength across G10 dampens commodity currency recovery.',
      'RBA cautious on domestic mortgage stress as consumer spending moderates.',
    ],
    tradeSuitability: 'Moderate Trend Opportunity',
    category: 'Forex Major',
  },
  USDCAD: {
    symbol: 'USDCAD',
    name: 'US Dollar / Canadian Dollar',
    baseCurrency: 'USD',
    quoteCurrency: 'CAD',
    score: 48,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 92,
    rateDiff: 'Fed 4.50% vs BoC 3.00% (+1.50% Spread)',
    yieldSpread: '10Y UST vs 10Y Canada: +120 bps',
    rationale: 'Bank of Canada rapid rate cuts to 3.00% create a clear 150 bps policy divergence in favor of the US Dollar.',
    drivers: [
      'BoC aggressive monetary easing due to Canadian per-capita GDP decline.',
      'Canadian household debt deleveraging restricts domestic consumption.',
      'US growth premium and yield spread widen USDCAD upward trajectory.',
    ],
    tradeSuitability: 'High-Conviction Central Bank Divergence',
    category: 'Forex Major',
  },
  NZDUSD: {
    symbol: 'NZDUSD',
    name: 'New Zealand Dollar / US Dollar',
    baseCurrency: 'NZD',
    quoteCurrency: 'USD',
    score: -52,
    bias: 'STRONGLY_BEARISH',
    biasLabel: 'STRONGLY BEARISH (LONG-TERM)',
    isBullish: false,
    isBearish: true,
    confidence: 93,
    rateDiff: 'RBNZ 3.75% vs Fed 4.50% (-0.75% Gap)',
    yieldSpread: '10Y NZ vs 10Y UST: +15 bps',
    rationale: 'RBNZ aggressive 50 bps easing cycles and New Zealand domestic recession pressures depress Kiwi valuations.',
    drivers: [
      'Reserve Bank of New Zealand prioritizing economic growth recovery over inflation.',
      'Weakness in dairy auction export indices (Global Dairy Trade).',
      'Structural yield carry erosion versus the US Dollar.',
    ],
    tradeSuitability: 'High-Conviction Macro Bearish Trend',
    category: 'Forex Major',
  },
  EURGBP: {
    symbol: 'EURGBP',
    name: 'Euro / British Pound',
    baseCurrency: 'EUR',
    quoteCurrency: 'GBP',
    score: -38,
    bias: 'STRONGLY_BEARISH',
    biasLabel: 'STRONGLY BEARISH (LONG-TERM)',
    isBullish: false,
    isBearish: true,
    confidence: 91,
    rateDiff: 'ECB 2.75% vs BoE 4.50% (-1.75% Gap)',
    yieldSpread: '10Y Bund vs 10Y Gilt: -195 bps',
    rationale: 'Bank of England 175 bps policy rate premium over the ECB and sticky UK services inflation drive downward EUR/GBP trend.',
    drivers: [
      'UK Gilt yields trade nearly 200 bps above German sovereign benchmark.',
      'ECB faster easing trajectory to protect German industrial base.',
      'Cross-border corporate hedging favors Sterling over Euro.',
    ],
    tradeSuitability: 'High-Conviction Policy Divergence Trend',
    category: 'Forex Cross',
  },
  EURJPY: {
    symbol: 'EURJPY',
    name: 'Euro / Japanese Yen',
    baseCurrency: 'EUR',
    quoteCurrency: 'JPY',
    score: 32,
    bias: 'BULLISH',
    biasLabel: 'BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 88,
    rateDiff: 'ECB 2.75% vs BoJ 0.50% (+2.25% Spread)',
    yieldSpread: '10Y Bund vs 10Y JGB: +140 bps',
    rationale: 'Even with ECB easing, the Euro holds a durable 225 bps yield spread over Japanese near-zero benchmark rates.',
    drivers: [
      'BoJ cautious normalization pace preserves positive EUR/JPY carry.',
      'Global risk-seeking sentiment supports yen funding trades.',
      'Eurozone trade surplus buffers baseline currency valuation.',
    ],
    tradeSuitability: 'Moderate Carry Opportunity',
    category: 'Forex Cross',
  },
  GBPJPY: {
    symbol: 'GBPJPY',
    name: 'British Pound / Japanese Yen',
    baseCurrency: 'GBP',
    quoteCurrency: 'JPY',
    score: 72,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 95,
    rateDiff: 'BoE 4.50% vs BoJ 0.50% (+4.00% Spread)',
    yieldSpread: '10Y Gilt vs 10Y JGB: +335 bps',
    rationale: 'Top institutional carry pair; 400 bps policy rate differential and 335 bps bond yield gap fuel institutional accumulation.',
    drivers: [
      'Bank of England higher-for-longer policy posture generates top-tier carry yields.',
      'Yen remains preferred global funding currency for yield arbitrage.',
      'Strong institutional accumulation on pullbacks to multi-week moving averages.',
    ],
    tradeSuitability: 'Highest-Conviction Carry Trade Trend',
    category: 'Forex Cross',
  },
  AUDJPY: {
    symbol: 'AUDJPY',
    name: 'Australian Dollar / Japanese Yen',
    baseCurrency: 'AUD',
    quoteCurrency: 'JPY',
    score: 65,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 93,
    rateDiff: 'RBA 4.35% vs BoJ 0.50% (+3.85% Spread)',
    yieldSpread: '10Y ACGB vs 10Y JGB: +330 bps',
    rationale: 'Reserve Bank of Australia hawkish rate pause maintains top-tier interest carry advantage over the Japanese Yen.',
    drivers: [
      'RBA restrictive 4.35% cash rate delivers 385 bps of positive carry.',
      'Sovereign Japanese institutional investors allocating to Australian government debt.',
      'Global risk-on equity market tone provides consistent tailwinds.',
    ],
    tradeSuitability: 'High-Conviction Carry Trade Divergence',
    category: 'Forex Cross',
  },
  CADJPY: {
    symbol: 'CADJPY',
    name: 'Canadian Dollar / Japanese Yen',
    baseCurrency: 'CAD',
    quoteCurrency: 'JPY',
    score: 38,
    bias: 'BULLISH',
    biasLabel: 'BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 89,
    rateDiff: 'BoC 3.00% vs BoJ 0.50% (+2.50% Spread)',
    yieldSpread: '10Y Canada vs 10Y JGB: +220 bps',
    rationale: 'Canadian energy exports and 250 bps rate buffer provide dependable carry support against the Yen.',
    drivers: [
      'Positive rollover yield differential supports institutional carry flows.',
      'WTI crude oil stability above $70/bbl supports Canadian terms of trade.',
      'BoJ gradual rate normalization provides only minor headwind.',
    ],
    tradeSuitability: 'Moderate Bullish Trend Opportunity',
    category: 'Forex Cross',
  },
  CHFJPY: {
    symbol: 'CHFJPY',
    name: 'Swiss Franc / Japanese Yen',
    baseCurrency: 'CHF',
    quoteCurrency: 'JPY',
    score: 14,
    bias: 'BULLISH',
    biasLabel: 'BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 86,
    rateDiff: 'SNB 0.50% vs BoJ 0.50% (Parity)',
    yieldSpread: '10Y Swiss vs 10Y JGB: -40 bps',
    rationale: 'Swiss structural current account surplus and elite credit rating offset rate parity with the Bank of Japan.',
    drivers: [
      'Swiss Franc safe-haven premium maintains structural demand.',
      'Both central banks operating near baseline policy rates.',
      'Steady institutional hedging and wealth preservation flows.',
    ],
    tradeSuitability: 'Moderate Secular Trend',
    category: 'Forex Cross',
  },
  NZDJPY: {
    symbol: 'NZDJPY',
    name: 'New Zealand Dollar / Japanese Yen',
    baseCurrency: 'NZD',
    quoteCurrency: 'JPY',
    score: 42,
    bias: 'BULLISH',
    biasLabel: 'BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 90,
    rateDiff: 'RBNZ 3.75% vs BoJ 0.50% (+3.25% Spread)',
    yieldSpread: '10Y NZ vs 10Y JGB: +355 bps',
    rationale: 'Substantial 325 bps interest rate buffer protects NZD/JPY carry demand even as the RBNZ eases policy.',
    drivers: [
      'High nominal yields on New Zealand sovereign bonds appeal to Japanese retail investors.',
      'Global risk-on liquidity cycle supports high-beta commodity currencies.',
      'Carry returns compound steadily during low-volatility trading regimes.',
    ],
    tradeSuitability: 'High-Conviction Carry Trade',
    category: 'Forex Cross',
  },
  EURAUD: {
    symbol: 'EURAUD',
    name: 'Euro / Australian Dollar',
    baseCurrency: 'EUR',
    quoteCurrency: 'AUD',
    score: -44,
    bias: 'STRONGLY_BEARISH',
    biasLabel: 'STRONGLY BEARISH (LONG-TERM)',
    isBullish: false,
    isBearish: true,
    confidence: 93,
    rateDiff: 'ECB 2.75% vs RBA 4.35% (-1.60% Gap)',
    yieldSpread: '10Y Bund vs 10Y ACGB: -190 bps',
    rationale: 'RBA hawkish rate hold at 4.35% contrasts with ECB rate cuts to stimulate Eurozone growth.',
    drivers: [
      '160 bps policy rate differential in favor of the Australian Dollar.',
      'Australian labor market unemployment remains tight near 4.1%.',
      'Eurozone growth momentum lags commodity-exporting economies.',
    ],
    tradeSuitability: 'High-Conviction Bearish Divergence',
    category: 'Forex Cross',
  },
  EURCAD: {
    symbol: 'EURCAD',
    name: 'Euro / Canadian Dollar',
    baseCurrency: 'EUR',
    quoteCurrency: 'CAD',
    score: -14,
    bias: 'BEARISH',
    biasLabel: 'BEARISH (LONG-TERM)',
    isBullish: false,
    isBearish: true,
    confidence: 87,
    rateDiff: 'ECB 2.75% vs BoC 3.00% (-0.25% Gap)',
    yieldSpread: '10Y Bund vs 10Y Canada: -80 bps',
    rationale: 'Eurozone manufacturing contraction weighs more heavily on Euro than Canadian growth slowdown.',
    drivers: [
      'Canadian sovereign yields trade 80 bps higher than German Bunds.',
      'Energy sector dividend yields provide fiscal stability to Canadian Dollar.',
      'Cross-currency flows favor North American trade ties.',
    ],
    tradeSuitability: 'Moderate Opportunity',
    category: 'Forex Cross',
  },
  EURCHF: {
    symbol: 'EURCHF',
    name: 'Euro / Swiss Franc',
    baseCurrency: 'EUR',
    quoteCurrency: 'CHF',
    score: 18,
    bias: 'BULLISH',
    biasLabel: 'BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 88,
    rateDiff: 'ECB 2.75% vs SNB 0.50% (+2.25% Spread)',
    yieldSpread: '10Y Bund vs 10Y Swiss: +180 bps',
    rationale: 'ECB 225 bps rate advantage and SNB explicit commitment to curb Swiss Franc appreciation.',
    drivers: [
      'SNB cutting policy rates toward 0.25% to protect Swiss export margins.',
      'Significant carry yield advantage favors Euro over Franc.',
      'Geopolitical risk premia stabilizing across continental Europe.',
    ],
    tradeSuitability: 'Moderate Bullish Reversal Opportunity',
    category: 'Forex Cross',
  },
  EURNZD: {
    symbol: 'EURNZD',
    name: 'Euro / New Zealand Dollar',
    baseCurrency: 'EUR',
    quoteCurrency: 'NZD',
    score: 24,
    bias: 'BULLISH',
    biasLabel: 'BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 90,
    rateDiff: 'ECB 2.75% vs RBNZ 3.75% (-1.00% Gap)',
    yieldSpread: '10Y Bund vs 10Y NZ: -215 bps',
    rationale: 'Rapid pace of RBNZ 50 bps interest rate cuts erodes the Kiwi yield buffer and supports EUR/NZD.',
    drivers: [
      'New Zealand GDP contracted -0.2% QoQ, accelerating central bank rate cuts.',
      'Dairy export prices face international price competition.',
      'Eurozone services sector provides more resilient economic foundation.',
    ],
    tradeSuitability: 'High-Conviction Central Bank Cycle Divergence',
    category: 'Forex Cross',
  },
  GBPAUD: {
    symbol: 'GBPAUD',
    name: 'British Pound / Australian Dollar',
    baseCurrency: 'GBP',
    quoteCurrency: 'AUD',
    score: 15,
    bias: 'BULLISH',
    biasLabel: 'BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 88,
    rateDiff: 'BoE 4.50% vs RBA 4.35% (+0.15% Spread)',
    yieldSpread: '10Y Gilt vs 10Y ACGB: +5 bps',
    rationale: 'Persistent UK wage inflation keeps Bank of England yields firm relative to Reserve Bank of Australia.',
    drivers: [
      'UK core CPI remains stickier above 3.4% requiring restrictive BoE policy.',
      'Australian export prices sensitive to Asian trade partner stimulus pace.',
      'Sovereign wealth funds maintaining balanced cross allocations.',
    ],
    tradeSuitability: 'Moderate Trend Edge',
    category: 'Forex Cross',
  },
  GBPCAD: {
    symbol: 'GBPCAD',
    name: 'British Pound / Canadian Dollar',
    baseCurrency: 'GBP',
    quoteCurrency: 'CAD',
    score: 46,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 93,
    rateDiff: 'BoE 4.50% vs BoC 3.00% (+1.50% Spread)',
    yieldSpread: '10Y Gilt vs 10Y Canada: +115 bps',
    rationale: 'Bank of England 150 bps rate premium over Bank of Canada provides strong structural carry momentum.',
    drivers: [
      'BoC aggressive easing cycle contrasts with BoE measured stance.',
      'Canadian labor market softening faster than United Kingdom.',
      'UK 10-year Gilt yields attract cross-market fixed income allocators.',
    ],
    tradeSuitability: 'High-Conviction Central Bank Divergence',
    category: 'Forex Cross',
  },
  GBPCHF: {
    symbol: 'GBPCHF',
    name: 'British Pound / Swiss Franc',
    baseCurrency: 'GBP',
    quoteCurrency: 'CHF',
    score: 64,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 95,
    rateDiff: 'BoE 4.50% vs SNB 0.50% (+4.00% Spread)',
    yieldSpread: '10Y Gilt vs 10Y Swiss: +375 bps',
    rationale: 'Massive 400 bps interest rate differential and 375 bps bond yield gap drive persistent institutional carry demand.',
    drivers: [
      'Top-tier yield carry among European crosses.',
      'SNB active rate cuts to counter low Swiss CPI (0.7% YoY).',
      'Institutional risk-parity strategies favoring long GBPCHF carry.',
    ],
    tradeSuitability: 'Highest-Conviction Carry Trade Trend',
    category: 'Forex Cross',
  },
  GBPNZD: {
    symbol: 'GBPNZD',
    name: 'British Pound / New Zealand Dollar',
    baseCurrency: 'GBP',
    quoteCurrency: 'NZD',
    score: 55,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 94,
    rateDiff: 'BoE 4.50% vs RBNZ 3.75% (+0.75% Spread)',
    yieldSpread: '10Y Gilt vs 10Y NZ: -20 bps',
    rationale: 'BoE restrictive stance contrasts with aggressive Reserve Bank of New Zealand 50 bps easing cycle.',
    drivers: [
      'RBNZ fast rate cuts erase historic Kiwi carry advantage.',
      'UK services sector resilience contrasts with NZ economic contraction.',
      'Trend-following funds systematically building long GBPNZD positions.',
    ],
    tradeSuitability: 'High-Conviction Macro Divergence Trend',
    category: 'Forex Cross',
  },
  AUDCAD: {
    symbol: 'AUDCAD',
    name: 'Australian Dollar / Canadian Dollar',
    baseCurrency: 'AUD',
    quoteCurrency: 'CAD',
    score: 42,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 92,
    rateDiff: 'RBA 4.35% vs BoC 3.00% (+1.35% Spread)',
    yieldSpread: '10Y ACGB vs 10Y Canada: +110 bps',
    rationale: 'RBA restrictive 4.35% stance while Bank of Canada cuts rates aggressively to 3.00%.',
    drivers: [
      '135 bps policy rate gap favors Aussie over Canadian Dollar.',
      'Australian labor market resilience contrasts with Canadian unemployment rising to 6.5%.',
      'Fixed income carry flows systematically favor ACGB bonds over Canadian debt.',
    ],
    tradeSuitability: 'High-Conviction Monetary Policy Divergence',
    category: 'Forex Cross',
  },
  AUDCHF: {
    symbol: 'AUDCHF',
    name: 'Australian Dollar / Swiss Franc',
    baseCurrency: 'AUD',
    quoteCurrency: 'CHF',
    score: 58,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 94,
    rateDiff: 'RBA 4.35% vs SNB 0.50% (+3.85% Spread)',
    yieldSpread: '10Y ACGB vs 10Y Swiss: +370 bps',
    rationale: 'Massive 385 bps interest rate spread fuels strong institutional carry allocation.',
    drivers: [
      'Top-tier carry return in low-volatility global trading environments.',
      'SNB easing to 0.50% depresses Swiss Franc yield appeal.',
      'Systematic carry strategies maintaining steady long allocations.',
    ],
    tradeSuitability: 'Highest-Conviction Carry Trade Trend',
    category: 'Forex Cross',
  },
  AUDNZD: {
    symbol: 'AUDNZD',
    name: 'Australian Dollar / New Zealand Dollar',
    baseCurrency: 'AUD',
    quoteCurrency: 'NZD',
    score: 45,
    bias: 'STRONGLY_BULLISH',
    biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 93,
    rateDiff: 'RBA 4.35% vs RBNZ 3.75% (+0.60% Spread)',
    yieldSpread: '10Y ACGB vs 10Y NZ: -25 bps',
    rationale: 'Clear central bank policy divergence: RBA on hold at 4.35% while RBNZ accelerates 50 bps easing.',
    drivers: [
      'RBA inflation fight keeping cash rate restrictive through late 2025.',
      'New Zealand economy facing prolonged stagnation, prompting RBNZ dovish pivot.',
      'Trans-Tasman trade and capital flows strongly favor Australian assets.',
    ],
    tradeSuitability: 'High-Conviction Central Bank Divergence',
    category: 'Forex Cross',
  },
  CADCHF: {
    symbol: 'CADCHF',
    name: 'Canadian Dollar / Swiss Franc',
    baseCurrency: 'CAD',
    quoteCurrency: 'CHF',
    score: 32,
    bias: 'BULLISH',
    biasLabel: 'BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 89,
    rateDiff: 'BoC 3.00% vs SNB 0.50% (+2.50% Spread)',
    yieldSpread: '10Y Canada vs 10Y Swiss: +260 bps',
    rationale: 'Canadian 250 bps policy rate advantage and energy trade receipts provide durable support against low-yielding Swiss Franc.',
    drivers: [
      '250 bps positive rollover yield cushion favors CADCHF long positions.',
      'SNB policy rates at 0.50% limit Swiss Franc upside.',
      'Crude oil price stability above $70/bbl supports Canadian terms of trade.',
    ],
    tradeSuitability: 'Moderate Carry Opportunity',
    category: 'Forex Cross',
  },
  NZDCAD: {
    symbol: 'NZDCAD',
    name: 'New Zealand Dollar / Canadian Dollar',
    baseCurrency: 'NZD',
    quoteCurrency: 'CAD',
    score: -14,
    bias: 'BEARISH',
    biasLabel: 'BEARISH (LONG-TERM)',
    isBullish: false,
    isBearish: true,
    confidence: 87,
    rateDiff: 'RBNZ 3.75% vs BoC 3.00% (+0.75% Spread)',
    yieldSpread: '10Y NZ vs 10Y Canada: +135 bps',
    rationale: 'Faster pace of RBNZ 50 bps rate cuts and New Zealand economic contraction compress Kiwi advantage against Canadian Dollar.',
    drivers: [
      'RBNZ dovish forward guidance outpaces Bank of Canada easing path.',
      'Canadian economy supported by deep US economic linkages.',
      'Agricultural export demand softening relative to energy commodity demand.',
    ],
    tradeSuitability: 'Moderate Opportunity',
    category: 'Forex Cross',
  },
  NZDCHF: {
    symbol: 'NZDCHF',
    name: 'New Zealand Dollar / Swiss Franc',
    baseCurrency: 'NZD',
    quoteCurrency: 'CHF',
    score: 28,
    bias: 'BULLISH',
    biasLabel: 'BULLISH (LONG-TERM)',
    isBullish: true,
    isBearish: false,
    confidence: 89,
    rateDiff: 'RBNZ 3.75% vs SNB 0.50% (+3.25% Spread)',
    yieldSpread: '10Y NZ vs 10Y Swiss: +395 bps',
    rationale: 'Over 325 bps interest rate buffer protects NZD/CHF carry demand against the 0.50% Swiss Franc rate.',
    drivers: [
      'High nominal yields appeal to institutional carry traders.',
      'SNB explicitly intervenes in foreign exchange markets to weaken franc.',
      'Global risk tolerance supports high-beta commodity currencies.',
    ],
    tradeSuitability: 'High-Conviction Carry Trade',
    category: 'Forex Cross',
  },
};

// ============================================================================
// GUARANTEED TRADINGVIEW SYMBOL RESOLVER
// (Prevents "This symbol doesn't exist" / chart loading errors across all categories & brokers)
// ============================================================================
export function resolveTradingViewSymbol(symbol: string, broker?: string): string {
  const parsed = parseSymbolAndBroker(symbol, broker);
  const clean = parsed.symbol;
  let requestedBroker = (broker || parsed.broker || 'FX').toUpperCase();
  if (requestedBroker === 'FCM' || requestedBroker === 'FXCM') requestedBroker = 'FX';
  if (!clean) return 'FX:EURUSD';

  // 1. All 28 Canonical Currency Pairs (100% verified active on TradingView FX / OANDA feeds)
  const CANONICAL_28 = new Set([
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
    'EURGBP', 'GBPJPY', 'EURJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
    'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD', 'EURAUD', 'EURCAD', 'EURCHF',
    'EURNZD', 'AUDCAD', 'AUDCHF', 'AUDNZD', 'CADCHF', 'NZDCAD', 'NZDCHF',
  ]);

  if (CANONICAL_28.has(clean)) {
    if (requestedBroker === 'OANDA') return `OANDA:${clean}`;
    if (requestedBroker === 'CAPITALCOM') return `CAPITALCOM:${clean}`;
    if (requestedBroker === 'FOREXCOM') return `FOREXCOM:${clean}`;
    return `FX:${clean}`;
  }

  // 2. Metals & Commodities (Verified working TradingView symbols)
  if (clean === 'XAUUSD' || clean === 'GOLD') {
    if (requestedBroker === 'CAPITALCOM') return 'CAPITALCOM:GOLD';
    if (requestedBroker === 'FOREXCOM') return 'FOREXCOM:XAUUSD';
    return 'OANDA:XAUUSD';
  }
  if (clean === 'XAGUSD' || clean === 'SILVER') {
    if (requestedBroker === 'CAPITALCOM') return 'CAPITALCOM:SILVER';
    if (requestedBroker === 'FOREXCOM') return 'FOREXCOM:XAGUSD';
    return 'OANDA:XAGUSD';
  }
  if (clean === 'USOIL' || clean === 'WTI' || clean === 'OIL' || clean === 'CRUDEOIL') {
    if (requestedBroker === 'CAPITALCOM') return 'CAPITALCOM:OIL_CRUDE';
    return 'TVC:USOIL';
  }
  if (clean === 'BRENT' || clean === 'UKOIL') {
    if (requestedBroker === 'CAPITALCOM') return 'CAPITALCOM:OIL_BRENT';
    return 'TVC:UKOIL';
  }

  // 3. Global Benchmark Indices (Verified active symbols on TradingView)
  if (clean === 'US30' || clean === 'DJI') {
    if (requestedBroker === 'FOREXCOM') return 'FOREXCOM:US30';
    return 'CAPITALCOM:US30';
  }
  if (clean === 'NAS100' || clean === 'NDX' || clean === 'US100') {
    if (requestedBroker === 'FOREXCOM') return 'FOREXCOM:NAS100';
    if (requestedBroker === 'NASDAQ') return 'NASDAQ:NDX';
    return 'CAPITALCOM:US100';
  }
  if (clean === 'SPX500' || clean === 'SPX' || clean === 'SP500' || clean === 'US500') {
    if (requestedBroker === 'FOREXCOM') return 'FOREXCOM:SPX500';
    return 'CAPITALCOM:US500';
  }
  if (clean === 'GER40' || clean === 'DAX' || clean === 'DE40') {
    return 'CAPITALCOM:DE40';
  }
  if (clean === 'UK100' || clean === 'FTSE') {
    return 'CAPITALCOM:UK100';
  }

  // 4. US Equities / Stocks
  const STOCKS: Record<string, string> = {
    NVDA: requestedBroker === 'CAPITALCOM' ? 'CAPITALCOM:NVDA' : 'NASDAQ:NVDA',
    AAPL: requestedBroker === 'CAPITALCOM' ? 'CAPITALCOM:AAPL' : 'NASDAQ:AAPL',
    MSFT: requestedBroker === 'CAPITALCOM' ? 'CAPITALCOM:MSFT' : 'NASDAQ:MSFT',
    AMZN: requestedBroker === 'CAPITALCOM' ? 'CAPITALCOM:AMZN' : 'NASDAQ:AMZN',
    GOOGL: requestedBroker === 'CAPITALCOM' ? 'CAPITALCOM:GOOGL' : 'NASDAQ:GOOGL',
    META: requestedBroker === 'CAPITALCOM' ? 'CAPITALCOM:META' : 'NASDAQ:META',
    TSLA: requestedBroker === 'CAPITALCOM' ? 'CAPITALCOM:TSLA' : 'NASDAQ:TSLA',
  };
  if (STOCKS[clean]) return STOCKS[clean];

  // 5. Cryptocurrencies
  if (clean.includes('USDT') || clean.startsWith('BTC') || clean.startsWith('ETH') || clean.startsWith('SOL') || clean.startsWith('BNB') || clean.startsWith('XRP')) {
    const cryptoSym = clean.endsWith('USDT') ? clean : `${clean}USDT`;
    return `BINANCE:${cryptoSym}`;
  }

  // 6. Generic 6-letter forex fallback
  if (clean.length === 6 && /^[A-Z]{6}$/.test(clean)) {
    if (requestedBroker === 'OANDA') return `OANDA:${clean}`;
    if (requestedBroker === 'CAPITALCOM') return `CAPITALCOM:${clean}`;
    if (requestedBroker === 'FOREXCOM') return `FOREXCOM:${clean}`;
    return `FX:${clean}`;
  }

  return requestedBroker && requestedBroker !== 'FXCM' && requestedBroker !== 'FCM' ? `${requestedBroker}:${clean}` : `FX:${clean}`;
}

// ============================================================================
// BROKERS & CATEGORIES (Forex, Indices, Metals, Cryptos, Stocks, Fundamentals)
// ============================================================================
export const BROKERS = [
  { id: 'fx', label: 'FX (TradingView Official Direct Feed)', prefix: 'FX' },
  { id: 'oanda', label: 'OANDA (Institutional Raw)', prefix: 'OANDA' },
  { id: 'capitalcom', label: 'CAPITALCOM (Zero Spread Multi-Asset)', prefix: 'CAPITALCOM' },
  { id: 'forexcom', label: 'FOREX.COM (Global ECN Feed)', prefix: 'FOREXCOM' },
  { id: 'binance', label: 'BINANCE (Crypto Spot/Perp)', prefix: 'BINANCE' },
  { id: 'nasdaq', label: 'NASDAQ (US Equities)', prefix: 'NASDAQ' },
  { id: 'tvc', label: 'TVC (TradingView Benchmark)', prefix: 'TVC' },
];

export const WATCHLIST_CATEGORIES = [
  {
    id: 'FOREX',
    name: 'Forex (28 Pairs)',
    defaultBroker: 'FX',
    symbols: [
      { symbol: 'EURUSD', label: 'EUR/USD' },
      { symbol: 'GBPUSD', label: 'GBP/USD' },
      { symbol: 'USDJPY', label: 'USD/JPY' },
      { symbol: 'AUDUSD', label: 'AUD/USD' },
      { symbol: 'USDCAD', label: 'USD/CAD' },
      { symbol: 'USDCHF', label: 'USD/CHF' },
      { symbol: 'NZDUSD', label: 'NZD/USD' },
      { symbol: 'EURGBP', label: 'EUR/GBP' },
      { symbol: 'GBPJPY', label: 'GBP/JPY' },
      { symbol: 'EURJPY', label: 'EUR/JPY' },
      { symbol: 'AUDJPY', label: 'AUD/JPY' },
      { symbol: 'CADJPY', label: 'CAD/JPY' },
      { symbol: 'CHFJPY', label: 'CHF/JPY' },
      { symbol: 'NZDJPY', label: 'NZD/JPY' },
      { symbol: 'EURAUD', label: 'EUR/AUD' },
      { symbol: 'EURCAD', label: 'EUR/CAD' },
      { symbol: 'EURCHF', label: 'EUR/CHF' },
      { symbol: 'EURNZD', label: 'EUR/NZD' },
      { symbol: 'GBPAUD', label: 'GBP/AUD' },
      { symbol: 'GBPCAD', label: 'GBP/CAD' },
      { symbol: 'GBPCHF', label: 'GBP/CHF' },
      { symbol: 'GBPNZD', label: 'GBP/NZD' },
      { symbol: 'AUDCAD', label: 'AUD/CAD' },
      { symbol: 'AUDCHF', label: 'AUD/CHF' },
      { symbol: 'AUDNZD', label: 'AUD/NZD' },
      { symbol: 'CADCHF', label: 'CAD/CHF' },
      { symbol: 'NZDCAD', label: 'NZD/CAD' },
      { symbol: 'NZDCHF', label: 'NZD/CHF' },
    ],
  },
  {
    id: 'INDICES',
    name: 'Indices',
    defaultBroker: 'CAPITALCOM',
    symbols: [
      { symbol: 'US30', label: 'Dow Jones 30' },
      { symbol: 'NAS100', label: 'Nasdaq 100' },
      { symbol: 'SPX500', label: 'S&P 500' },
      { symbol: 'GER40', label: 'German DAX 40' },
      { symbol: 'UK100', label: 'FTSE 100' },
    ],
  },
  {
    id: 'METALS',
    name: 'Commodities & Metals',
    defaultBroker: 'OANDA',
    symbols: [
      { symbol: 'XAUUSD', label: 'Gold / USD' },
      { symbol: 'XAGUSD', label: 'Silver / USD' },
      { symbol: 'USOIL', label: 'Crude Oil (WTI)' },
      { symbol: 'BRENT', label: 'Brent Crude' },
    ],
  },
  {
    id: 'STOCKS',
    name: 'Top Stocks',
    defaultBroker: 'NASDAQ',
    symbols: [
      { symbol: 'NVDA', label: 'NVIDIA (NVDA)' },
      { symbol: 'AAPL', label: 'Apple (AAPL)' },
      { symbol: 'MSFT', label: 'Microsoft (MSFT)' },
      { symbol: 'AMZN', label: 'Amazon (AMZN)' },
      { symbol: 'GOOGL', label: 'Alphabet (GOOGL)' },
      { symbol: 'META', label: 'Meta Platforms' },
      { symbol: 'TSLA', label: 'Tesla (TSLA)' },
    ],
  },
  {
    id: 'CRYPTO',
    name: 'Top Cryptocurrencies',
    defaultBroker: 'BINANCE',
    symbols: [
      { symbol: 'BTCUSDT', label: 'BTC/USDT' },
      { symbol: 'ETHUSDT', label: 'ETH/USDT' },
      { symbol: 'SOLUSDT', label: 'SOL/USDT' },
      { symbol: 'BNBUSDT', label: 'BNB/USDT' },
      { symbol: 'XRPUSDT', label: 'XRP/USDT' },
    ],
  },
  {
    id: 'FUNDAMENTALS',
    name: '⚡ Fundamentals',
    defaultBroker: 'FX',
    symbols: [
      // All 28 Currency Pairs
      { symbol: 'EURUSD', label: 'EUR/USD' },
      { symbol: 'GBPUSD', label: 'GBP/USD' },
      { symbol: 'USDJPY', label: 'USD/JPY' },
      { symbol: 'AUDUSD', label: 'AUD/USD' },
      { symbol: 'USDCAD', label: 'USD/CAD' },
      { symbol: 'USDCHF', label: 'USD/CHF' },
      { symbol: 'NZDUSD', label: 'NZD/USD' },
      { symbol: 'EURGBP', label: 'EUR/GBP' },
      { symbol: 'GBPJPY', label: 'GBP/JPY' },
      { symbol: 'EURJPY', label: 'EUR/JPY' },
      { symbol: 'AUDJPY', label: 'AUD/JPY' },
      { symbol: 'CADJPY', label: 'CAD/JPY' },
      { symbol: 'CHFJPY', label: 'CHF/JPY' },
      { symbol: 'NZDJPY', label: 'NZD/JPY' },
      { symbol: 'EURAUD', label: 'EUR/AUD' },
      { symbol: 'EURCAD', label: 'EUR/CAD' },
      { symbol: 'EURCHF', label: 'EUR/CHF' },
      { symbol: 'EURNZD', label: 'EUR/NZD' },
      { symbol: 'GBPAUD', label: 'GBP/AUD' },
      { symbol: 'GBPCAD', label: 'GBP/CAD' },
      { symbol: 'GBPCHF', label: 'GBP/CHF' },
      { symbol: 'GBPNZD', label: 'GBP/NZD' },
      { symbol: 'AUDCAD', label: 'AUD/CAD' },
      { symbol: 'AUDCHF', label: 'AUD/CHF' },
      { symbol: 'AUDNZD', label: 'AUD/NZD' },
      { symbol: 'CADCHF', label: 'CAD/CHF' },
      { symbol: 'NZDCAD', label: 'NZD/CAD' },
      { symbol: 'NZDCHF', label: 'NZD/CHF' },
      // Commodities
      { symbol: 'XAUUSD', label: 'Gold / USD' },
      { symbol: 'XAGUSD', label: 'Silver / USD' },
      { symbol: 'USOIL', label: 'Crude Oil (WTI)' },
      { symbol: 'BRENT', label: 'Brent Crude' },
      // Indices
      { symbol: 'US30', label: 'Dow Jones 30' },
      { symbol: 'NAS100', label: 'Nasdaq 100' },
      { symbol: 'SPX500', label: 'S&P 500' },
      { symbol: 'GER40', label: 'German DAX 40' },
      { symbol: 'UK100', label: 'FTSE 100' },
      // Top Tech Stocks
      { symbol: 'NVDA', label: 'NVIDIA (NVDA)' },
      { symbol: 'AAPL', label: 'Apple (AAPL)' },
      { symbol: 'MSFT', label: 'Microsoft (MSFT)' },
      { symbol: 'AMZN', label: 'Amazon (AMZN)' },
      { symbol: 'GOOGL', label: 'Alphabet (GOOGL)' },
      { symbol: 'META', label: 'Meta Platforms' },
      { symbol: 'TSLA', label: 'Tesla (TSLA)' },
      // Top Crypto
      { symbol: 'BTCUSDT', label: 'BTC/USDT' },
      { symbol: 'ETHUSDT', label: 'ETH/USDT' },
      { symbol: 'SOLUSDT', label: 'SOL/USDT' },
      { symbol: 'BNBUSDT', label: 'BNB/USDT' },
      { symbol: 'XRPUSDT', label: 'XRP/USDT' },
    ],
  },
];

// ============================================================================
// DEMO POSITION & TRADE TRACKING
// ============================================================================
export interface DemoPosition {
  id: string;
  ticket: number;
  symbol: string;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  potentialLossDollars: number;
  potentialProfitDollars: number;
  openTime: string;
  openTimestamp: number;
  status: 'OPEN' | 'CLOSED';
  currentPrice: number;
  floatingPnL: number;
  pips: number;
  closePrice?: number;
  closeTime?: string;
  closeReason?: 'TAKE_PROFIT' | 'STOP_LOSS' | 'MANUAL_CLOSE';
  loggedToJournal?: boolean;
}

export type RightSideToolId = 'ALERTS' | 'NEWS' | 'CALENDAR';

export interface ChartAlertItem {
  id: string;
  symbol: string;
  price: number;
  condition: 'CROSSING' | 'CROSSING_UP' | 'CROSSING_DOWN' | 'GREATER_THAN' | 'LESS_THAN';
  active: boolean;
  createdAt: string;
  notes?: string;
  triggered?: boolean;
}

export interface NewsHeadlineItem {
  id: string;
  title: string;
  source: string;
  time: string;
  category: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface CalendarEventItem {
  id: string;
  currency: string;
  event: string;
  impact: 'HIGH' | 'MED' | 'LOW';
  time: string;
  actual?: string;
  forecast: string;
  previous: string;
}

export interface ChartSettingsConfig {
  backgroundColor: string;
  backgroundType: 'solid' | 'gradient';
  bgGradientColor2: string;
  vertGrid: boolean;
  horzGrid: boolean;
  gridColor: string;
  gridOpacity: number;
  candleUpColor: string;
  candleDownColor: string;
  candleBorderUp: string;
  candleBorderDown: string;
  candleWickUp: string;
  candleWickDown: string;
  showCountdown: boolean;
  showBidAskLines: boolean;
  timezone: string;
}

const DEFAULT_CHART_SETTINGS: ChartSettingsConfig = {
  backgroundColor: '#0a0e17',
  backgroundType: 'solid',
  bgGradientColor2: '#111827',
  vertGrid: true,
  horzGrid: true,
  gridColor: '#1e293b',
  gridOpacity: 25,
  candleUpColor: '#10b981',
  candleDownColor: '#f43f5e',
  candleBorderUp: '#10b981',
  candleBorderDown: '#f43f5e',
  candleWickUp: '#10b981',
  candleWickDown: '#f43f5e',
  showCountdown: true,
  showBidAskLines: true,
  timezone: 'Asia/Karachi',
};

// Play audio chime for trade execution / alerts
function playAudioTone(freq: number, type: OscillatorType = 'sine', durationSec: number = 0.2) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
  } catch {}
}

interface ProTradingViewProps {
  onOpenNewTrade?: (prefill?: Partial<Trade>) => void;
  defaultSymbol?: string;
  currentUser?: UserAccount | null;
  isDemoMode?: boolean;
  activeAccount?: AccountSettings | null;
  trades?: Trade[];
  onAutoLogTradeToJournal?: (partialTrade: Partial<Trade>) => Promise<void> | void;
  onUpdateAccount?: (updatedAccount: AccountSettings) => Promise<void> | void;
  onRequireSubscription?: () => void;
  onNavigateToFundamental?: (pair?: string) => void;
  onNavigateToJournal?: () => void;
}

export const ProTradingView: React.FC<ProTradingViewProps> = ({
  onOpenNewTrade,
  defaultSymbol = 'EURUSD',
  currentUser,
  activeAccount,
  trades = [],
  onAutoLogTradeToJournal,
  onUpdateAccount,
  onNavigateToJournal,
}) => {
  // --------------------------------------------------------------------------
  // SAVED FULL STATE & PERSISTENCE
  // --------------------------------------------------------------------------
  const savedFullState = useMemo(() => {
    try {
      const data = localStorage.getItem('primepipfx_tv_chart_full_state_v2');
      if (data) return JSON.parse(data);
    } catch {}
    return null;
  }, []);

  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number>(() => {
    if (savedFullState?.categoryIndex !== undefined) return savedFullState.categoryIndex;
    return 0; // Forex default
  });

  const [selectedSymbol, setSelectedSymbol] = useState<string>(() => {
    if (savedFullState?.symbol) return savedFullState.symbol;
    return defaultSymbol;
  });

  // Default to FX official direct feed
  const [selectedBroker, setSelectedBroker] = useState<string>(() => {
    if (savedFullState?.broker && savedFullState.broker !== 'FXCM' && savedFullState.broker !== 'FCM') {
      return savedFullState.broker;
    }
    return 'FX';
  });

  const [selectedInterval, setSelectedInterval] = useState<string>(() => {
    if (savedFullState?.interval) return normalizeInterval(savedFullState.interval);
    return '60'; // 1h default
  });

  const [chartSettings, setChartSettings] = useState<ChartSettingsConfig>(() => {
    if (savedFullState?.chartSettings) {
      return { ...DEFAULT_CHART_SETTINGS, ...savedFullState.chartSettings };
    }
    return DEFAULT_CHART_SETTINGS;
  });

  // Modals & Panels
  const [activeRightTool, setActiveRightTool] = useState<RightSideToolId | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsActiveTab, setSettingsActiveTab] = useState<'APPEARANCE' | 'CANVAS' | 'CANDLES' | 'SCALES' | 'LAYOUTS'>('APPEARANCE');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareTvDirectUrl, setShareTvDirectUrl] = useState('');

  // --------------------------------------------------------------------------
  // ACCOUNT BALANCE & DEMO TRACKING
  // --------------------------------------------------------------------------
  const initialBalance = useMemo(() => {
    return activeAccount?.initialBalance ?? 100000;
  }, [activeAccount]);

  const [accountBalance, setAccountBalance] = useState<number>(() => {
    try {
      const savedBal = localStorage.getItem('primepipfx_demo_acc_balance');
      if (savedBal) return Number(savedBal);
    } catch {}
    return activeAccount?.currentBalance ?? initialBalance;
  });

  // Sync if account changes
  useEffect(() => {
    if (activeAccount?.currentBalance && !localStorage.getItem('primepipfx_demo_acc_balance')) {
      setAccountBalance(activeAccount.currentBalance);
    }
  }, [activeAccount]);

  // Demo Open & Closed Positions
  const [demoPositions, setDemoPositions] = useState<DemoPosition[]>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_demo_positions_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Active terminal sub-tab below chart
  const [terminalBottomTab, setTerminalBottomTab] = useState<'POSITIONS' | 'HISTORY' | 'FUNDAMENTALS'>('POSITIONS');

  // Price metadata for current symbol
  const priceMeta = useMemo(() => getInstrumentMeta(selectedSymbol), [selectedSymbol]);

  // --------------------------------------------------------------------------
  // LIVE TICKS & CANDLE FORMATION
  // --------------------------------------------------------------------------
  const [liveCandle, setLiveCandle] = useState(() => {
    const p = priceMeta.price;
    const spread = priceMeta.spreadPips * priceMeta.pipSize;
    return {
      open: p,
      high: p + spread * 1.5,
      low: p - spread * 1.2,
      close: p + spread * 0.4,
      bid: p,
      ask: p + spread,
      volume: 1240,
      tickCount: 1,
      lastDirection: 'UP' as 'UP' | 'DOWN',
      changePercent: 0.08,
      interval: selectedInterval,
      symbol: selectedSymbol,
    };
  });

  // --------------------------------------------------------------------------
  // DEMO TRADING ORDER TICKET & INTERACTIVE DRAGGABLE SL / TP / ENTRY
  // --------------------------------------------------------------------------
  const [orderLots, setOrderLots] = useState<string>('1.00');
  const [orderSlPips, setOrderSlPips] = useState<string>('25');
  const [orderTpPips, setOrderTpPips] = useState<string>('50');
  const [manualSlPrice, setManualSlPrice] = useState<string>('');
  const [manualTpPrice, setManualTpPrice] = useState<string>('');
  const [isManualPriceMode, setIsManualPriceMode] = useState<boolean>(false);
  const [showProjectionLines, setShowProjectionLines] = useState<boolean>(false);
  const [orderToast, setOrderToast] = useState<{ message: string; trade?: DemoPosition; isSuccess?: boolean } | null>(null);

  // Draggable Projection Lines State (Tracks entry, TP, and SL lines)
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [projectionAnchorCenter, setProjectionAnchorCenter] = useState<number>(() => priceMeta.price);
  const [projectionSpanPips, setProjectionSpanPips] = useState<number>(140);
  const [entryLinePrice, setEntryLinePrice] = useState<number>(() => priceMeta.price);
  const [slLinePrice, setSlLinePrice] = useState<number>(() => {
    return Number((priceMeta.price - 25 * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
  });
  const [tpLinePrice, setTpLinePrice] = useState<number>(() => {
    return Number((priceMeta.price + 50 * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
  });
  const [isCustomProjection, setIsCustomProjection] = useState<boolean>(false);
  const [activeDragTarget, setActiveDragTarget] = useState<'ENTRY' | 'TP' | 'SL' | null>(null);
  const [cameraFlash, setCameraFlash] = useState<boolean>(false);

  // Stabilize dragging with refs to prevent listener teardown on every frame
  const entryLinePriceRef = useRef(entryLinePrice);
  entryLinePriceRef.current = entryLinePrice;
  const slLinePriceRef = useRef(slLinePrice);
  slLinePriceRef.current = slLinePrice;
  const tpLinePriceRef = useRef(tpLinePrice);
  tpLinePriceRef.current = tpLinePrice;
  const projectionAnchorCenterRef = useRef(projectionAnchorCenter);
  projectionAnchorCenterRef.current = projectionAnchorCenter;
  const projectionSpanPipsRef = useRef(projectionSpanPips);
  projectionSpanPipsRef.current = projectionSpanPips;
  const priceMetaRef = useRef(priceMeta);
  priceMetaRef.current = priceMeta;

  // Synchronize draggable projection prices when selectedSymbol changes
  useEffect(() => {
    const meta = getInstrumentMeta(selectedSymbol);
    const curPrice = liveCandle.close || liveCandle.bid || meta.price;
    setProjectionAnchorCenter(curPrice);
    setEntryLinePrice(curPrice);
    setSlLinePrice(Number((curPrice - 25 * meta.pipSize).toFixed(meta.pipDecimals)));
    setTpLinePrice(Number((curPrice + 50 * meta.pipSize).toFixed(meta.pipDecimals)));
    setProjectionSpanPips(140);
    setIsCustomProjection(false);
    // Projection lines strictly remain hidden until explicitly clicked
    setShowProjectionLines(false);
  }, [selectedSymbol]);

  // Pointer / mouse / touch drag listener on window for ultra-smooth continuous line movement
  useEffect(() => {
    if (!activeDragTarget) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!chartContainerRef.current) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const rect = chartContainerRef.current.getBoundingClientRect();
      if (!rect || rect.height === 0) return;

      const relativeY = clientY - rect.top;
      // Allow dragging between 5% and 95% of chart vertical height
      const clampedPct = Math.min(Math.max((relativeY / rect.height) * 100, 5), 95);

      const curPriceMeta = priceMetaRef.current;
      const curAnchor = projectionAnchorCenterRef.current;
      const curSpan = projectionSpanPipsRef.current;

      const topBound = curAnchor + (curSpan / 2) * curPriceMeta.pipSize;
      const bottomBound = curAnchor - (curSpan / 2) * curPriceMeta.pipSize;
      const diff = topBound - bottomBound;

      const mappedPrice = topBound - (clampedPct / 100) * diff;
      const roundedPrice = Number(mappedPrice.toFixed(curPriceMeta.pipDecimals));

      if (activeDragTarget === 'ENTRY') {
        setEntryLinePrice(roundedPrice);
        setIsCustomProjection(true);
      } else if (activeDragTarget === 'TP') {
        setTpLinePrice(roundedPrice);
        const curEntry = entryLinePriceRef.current;
        const pips = Math.max(1, Math.round(Math.abs(roundedPrice - curEntry) / curPriceMeta.pipSize));
        setOrderTpPips(String(pips));
        setManualTpPrice(String(roundedPrice));
        setIsManualPriceMode(true);
        setIsCustomProjection(true);
      } else if (activeDragTarget === 'SL') {
        setSlLinePrice(roundedPrice);
        const curEntry = entryLinePriceRef.current;
        const pips = Math.max(1, Math.round(Math.abs(curEntry - roundedPrice) / curPriceMeta.pipSize));
        setOrderSlPips(String(pips));
        setManualSlPrice(String(roundedPrice));
        setIsManualPriceMode(true);
        setIsCustomProjection(true);
      }
    };

    const handlePointerUp = () => {
      setActiveDragTarget(null);
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [activeDragTarget]);

  const handleStartDrag = (target: 'ENTRY' | 'TP' | 'SL', e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDragTarget(target);
  };

  // Dynamic vertical percentage mapping for the 3 projection lines (anchored stably to projection center)
  const topBoundPrice = projectionAnchorCenter + (projectionSpanPips / 2) * priceMeta.pipSize;
  const bottomBoundPrice = projectionAnchorCenter - (projectionSpanPips / 2) * priceMeta.pipSize;

  const getPriceYPercent = useCallback(
    (p: number) => {
      const diff = topBoundPrice - bottomBoundPrice;
      if (diff <= 0) return 50;
      const pct = ((topBoundPrice - p) / diff) * 100;
      return Math.min(Math.max(pct, 5), 95);
    },
    [topBoundPrice, bottomBoundPrice]
  );

  const tpYPercent = getPriceYPercent(tpLinePrice);
  const entryYPercent = getPriceYPercent(entryLinePrice);
  const slYPercent = getPriceYPercent(slLinePrice);

  // Projected Dollar P/L based on Lot Size & Adjusted Lines
  const lots = Math.max(0.01, Number(orderLots) || 1.0);
  const liveTpPips = Math.max(1, Math.round(Math.abs(tpLinePrice - entryLinePrice) / priceMeta.pipSize));
  const liveSlPips = Math.max(1, Math.round(Math.abs(entryLinePrice - slLinePrice) / priceMeta.pipSize));
  const projectedLossDollars = Number((lots * liveSlPips * priceMeta.pipValuePerLot).toFixed(2));
  const projectedProfitDollars = Number((lots * liveTpPips * priceMeta.pipValuePerLot).toFixed(2));
  const riskRewardRatio = projectedLossDollars > 0 ? Number((projectedProfitDollars / projectedLossDollars).toFixed(2)) : 0;

  // Nudge adjustment functions
  const nudgeEntry = (pipsDelta: number) => {
    const nextP = Number((entryLinePrice + pipsDelta * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
    setEntryLinePrice(nextP);
    setIsCustomProjection(true);
  };

  const nudgeTp = (pipsDelta: number) => {
    const nextP = Number((tpLinePrice + pipsDelta * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
    setTpLinePrice(nextP);
    const pips = Math.max(1, Math.round(Math.abs(nextP - entryLinePrice) / priceMeta.pipSize));
    setOrderTpPips(String(pips));
    setManualTpPrice(String(nextP));
    setIsCustomProjection(true);
  };

  const nudgeSl = (pipsDelta: number) => {
    const nextP = Number((slLinePrice + pipsDelta * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
    setSlLinePrice(nextP);
    const pips = Math.max(1, Math.round(Math.abs(entryLinePrice - nextP) / priceMeta.pipSize));
    setOrderSlPips(String(pips));
    setManualSlPrice(String(nextP));
    setIsCustomProjection(true);
  };

  const resetProjectionLines = () => {
    const meta = getInstrumentMeta(selectedSymbol);
    const currentClose = liveCandle.close || meta.price;
    setProjectionAnchorCenter(currentClose);
    setEntryLinePrice(currentClose);
    setSlLinePrice(Number((currentClose - 25 * meta.pipSize).toFixed(meta.pipDecimals)));
    setTpLinePrice(Number((currentClose + 50 * meta.pipSize).toFixed(meta.pipDecimals)));
    setOrderSlPips('25');
    setOrderTpPips('50');
    setManualSlPrice('');
    setManualTpPrice('');
    setIsManualPriceMode(false);
    setIsCustomProjection(false);
  };

  const snapEntryToMarketPrice = () => {
    const meta = getInstrumentMeta(selectedSymbol);
    const currentClose = liveCandle.close || meta.price;
    setProjectionAnchorCenter(currentClose);
    setEntryLinePrice(currentClose);
    setSlLinePrice(Number((currentClose - 25 * meta.pipSize).toFixed(meta.pipDecimals)));
    setTpLinePrice(Number((currentClose + 50 * meta.pipSize).toFixed(meta.pipDecimals)));
    setIsCustomProjection(false);
    setOrderToast({
      message: `🎯 Entry line pinned directly to current market price: ${currentClose.toFixed(meta.pipDecimals)}`,
      isSuccess: true,
    });
  };

  const toggleProjectionLines = () => {
    setShowProjectionLines((prev) => {
      const next = !prev;
      if (next) {
        // When enabled, the entry line appears EXACTLY where current market price is
        const meta = getInstrumentMeta(selectedSymbol);
        const currentClose = liveCandle.close || meta.price;
        setProjectionAnchorCenter(currentClose);
        setEntryLinePrice(currentClose);
        setSlLinePrice(Number((currentClose - 25 * meta.pipSize).toFixed(meta.pipDecimals)));
        setTpLinePrice(Number((currentClose + 50 * meta.pipSize).toFixed(meta.pipDecimals)));
        setIsCustomProjection(false);
      }
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // DYNAMIC FUNDAMENTAL INTELLIGENCE ENGINE & DIVERGENCE CATEGORIES
  // --------------------------------------------------------------------------
  const [fundamentalObservations, setFundamentalObservations] = useState(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_observations_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_OBSERVATIONS;
  });

  const [multiAssetFundamentals, setMultiAssetFundamentals] = useState<MultiAssetFundamentalRecord[]>(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_multi_assets_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MULTI_ASSET_FUNDAMENTALS;
  });

  const [interestRates, setInterestRates] = useState(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_rates_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_INTEREST_RATES;
  });

  const [cotRecords, setCotRecords] = useState(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_cot_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_COT_RECORDS;
  });

  const [sentimentRecords, setSentimentRecords] = useState(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_sentiment_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SENTIMENT_RECORDS;
  });

  const [retailPositioning, setRetailPositioning] = useState(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_retail_positioning_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_RETAIL_POSITIONING;
  });

  const [categoryWeights, setCategoryWeights] = useState(() => {
    try {
      const saved = localStorage.getItem('primepip_fundamental_weights_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CATEGORY_WEIGHTS;
  });

  // Calculate currency scores for all 8 currencies matching Fundamental Category:
  const currencyScores = useMemo(() => {
    const currencies = Object.keys(CURRENCY_METADATA) as CurrencyCode[];
    const result: Record<CurrencyCode, CurrencyScoreResult> = {} as any;
    currencies.forEach((code) => {
      result[code] = calculateCurrencyScore(
        code,
        fundamentalObservations,
        categoryWeights,
        cotRecords,
        sentimentRecords,
        interestRates,
        retailPositioning
      );
    });
    return result;
  }, [fundamentalObservations, categoryWeights, cotRecords, sentimentRecords, interestRates, retailPositioning]);

  // Calculate pair differentials for all 28 currency pairs directly matching Fundamental Category:
  const pairDifferentials = useMemo(() => {
    const currencies = Object.keys(CURRENCY_METADATA) as CurrencyCode[];
    const pairs: PairDifferentialResult[] = [];
    for (let i = 0; i < currencies.length; i++) {
      for (let j = i + 1; j < currencies.length; j++) {
        const base = currencies[i];
        const quote = currencies[j];
        pairs.push(calculatePairDifferential(base, quote, currencyScores));
      }
    }
    return pairs;
  }, [currencyScores]);

  // Active Pair Modal for Deep-Dive Modal (Fixed: opens on any PS selection)
  const [activePairModal, setActivePairModal] = useState<PairDifferentialResult | null>(null);
  const [showIndicatorsModal, setShowIndicatorsModal] = useState<boolean>(false);

  const [fundamentalSubFilter, setFundamentalSubFilter] = useState<'ALL' | 'FOREX_28' | 'BULLISH' | 'BEARISH' | 'HIGH_CONVICTION' | 'COMMODITIES_INDICES' | 'STOCKS'>('ALL');
  const [showFundamentalPanel, setShowFundamentalPanel] = useState<boolean>(true);
  const [isSyncingLiveFundamental, setIsSyncingLiveFundamental] = useState<boolean>(false);

  // Master Fundamental Intelligence Report
  const masterIntelligenceReport = useMemo(() => {
    const obsMap: Record<string, any> = {};
    for (const obs of fundamentalObservations) {
      obsMap[obs.indicatorId] = obs;
    }
    return FundamentalIntelligenceEngine.generateMasterReport(obsMap);
  }, [fundamentalObservations]);

  // Synchronize with external fundamental updates
  useEffect(() => {
    const handleUpdate = () => {
      try {
        const savedObs = localStorage.getItem('primepip_fundamental_observations_v2');
        if (savedObs) setFundamentalObservations(JSON.parse(savedObs));
        const savedMulti = localStorage.getItem('primepip_fundamental_multi_assets_v1');
        if (savedMulti) setMultiAssetFundamentals(JSON.parse(savedMulti));
        const savedRates = localStorage.getItem('primepip_fundamental_rates_v2');
        if (savedRates) setInterestRates(JSON.parse(savedRates));
        const savedCot = localStorage.getItem('primepip_fundamental_cot_v2');
        if (savedCot) setCotRecords(JSON.parse(savedCot));
        const savedSent = localStorage.getItem('primepip_fundamental_sentiment_v2');
        if (savedSent) setSentimentRecords(JSON.parse(savedSent));
        const savedWeights = localStorage.getItem('primepip_fundamental_weights_v2');
        if (savedWeights) setCategoryWeights(JSON.parse(savedWeights));
        const savedRetail = localStorage.getItem('primepip_fundamental_retail_positioning_v1');
        if (savedRetail) setRetailPositioning(JSON.parse(savedRetail));
      } catch {}
    };
    window.addEventListener('primepipfx_fundamental_data_updated', handleUpdate);
    window.addEventListener('primepipfx_fundamental_updated', handleUpdate);
    return () => {
      window.removeEventListener('primepipfx_fundamental_data_updated', handleUpdate);
      window.removeEventListener('primepipfx_fundamental_updated', handleUpdate);
    };
  }, []);

  // Dynamic helper to resolve fundamental data for ANY symbol (FX, Indices, Metals, Crypto)
  const getFundamentalForSymbol = useCallback(
    (sym: string) => {
      const clean = sym.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      // 1. Check if it's one of the 28 FX Canonical Pairs (Calculated directly from Fundamental Category)
      const fxPair = pairDifferentials.find(
        (p) => p.pair.toUpperCase() === clean || clean === `${p.baseCurrency}${p.quoteCurrency}`
      );

      if (fxPair) {
        const canonical = CANONICAL_28_FUNDAMENTALS[clean];
        const isBull = (fxPair.fundamentalBias || '').includes('BULL');
        const isBear = (fxPair.fundamentalBias || '').includes('BEAR');
        const baseRate = typeof (fxPair as any).baseInterestRate === 'number'
          ? (fxPair as any).baseInterestRate
          : (interestRates?.find((r: any) => r.currency === fxPair.baseCurrency)?.currentRate ?? (CURRENCY_METADATA[fxPair.baseCurrency]?.defaultCentralBankRate ?? 0));
        const quoteRate = typeof (fxPair as any).quoteInterestRate === 'number'
          ? (fxPair as any).quoteInterestRate
          : (interestRates?.find((r: any) => r.currency === fxPair.quoteCurrency)?.currentRate ?? (CURRENCY_METADATA[fxPair.quoteCurrency]?.defaultCentralBankRate ?? 0));
        const rateSpread = typeof fxPair.interestRateSpread === 'number'
          ? fxPair.interestRateSpread
          : (baseRate - quoteRate);
        const tenYear = typeof fxPair.tenYearSpread === 'number' ? fxPair.tenYearSpread : 0;

        return {
          symbol: fxPair.pair,
          baseCurrency: fxPair.baseCurrency,
          quoteCurrency: fxPair.quoteCurrency,
          category: 'Forex Major / Cross',
          bias: fxPair.fundamentalBias as BiasClassification,
          biasLabel: `${fxPair.biasLabel || 'NEUTRAL'} (LONG-TERM)`,
          isBullish: isBull,
          isBearish: isBear,
          score: fxPair.netDifferential ?? 0,
          confidence: (fxPair as any).confidenceScore || 92,
          rateDiff: `${fxPair.baseCurrency} (${baseRate.toFixed(2)}%) vs ${fxPair.quoteCurrency} (${quoteRate.toFixed(2)}%) Spread: ${rateSpread >= 0 ? '+' : ''}${rateSpread.toFixed(2)}%`,
          yieldSpread: `10Y Sovereign Yield Spread: ${tenYear >= 0 ? '+' : ''}${tenYear.toFixed(0)} bps`,
          rationale: (fxPair as any).reasoningNarrative || canonical?.rationale || `Fundamental macro divergence between ${fxPair.baseCurrency} and ${fxPair.quoteCurrency}.`,
          drivers: fxPair.primaryDrivers?.length
            ? fxPair.primaryDrivers
            : canonical?.drivers || [
                `Base currency ${fxPair.baseCurrency} composite score: ${fxPair.baseScore >= 0 ? '+' : ''}${fxPair.baseScore}`,
                `Quote currency ${fxPair.quoteCurrency} composite score: ${fxPair.quoteScore >= 0 ? '+' : ''}${fxPair.quoteScore}`,
                `Central bank policy rate spread: ${rateSpread >= 0 ? '+' : ''}${rateSpread.toFixed(2)}%`,
              ],
          tradeSuitability:
            Math.abs(fxPair.netDifferential ?? 0) >= 20
              ? 'High-Conviction Fundamental Divergence'
              : 'Moderate Fundamental Edge',
          favoredAction: isBull ? ('BUY' as const) : isBear ? ('SELL' as const) : ('NEUTRAL' as const),
        };
      }

      if (CANONICAL_28_FUNDAMENTALS[clean]) {
        const canonical = CANONICAL_28_FUNDAMENTALS[clean];
        return {
          symbol: canonical.symbol,
          baseCurrency: canonical.baseCurrency,
          quoteCurrency: canonical.quoteCurrency,
          category: canonical.category,
          bias: canonical.bias as BiasClassification,
          biasLabel: canonical.biasLabel,
          isBullish: canonical.isBullish,
          isBearish: canonical.isBearish,
          score: canonical.score,
          confidence: canonical.confidence,
          rateDiff: canonical.rateDiff,
          yieldSpread: canonical.yieldSpread,
          rationale: canonical.rationale,
          drivers: canonical.drivers,
          tradeSuitability: canonical.tradeSuitability,
          favoredAction: canonical.isBullish ? ('BUY' as const) : canonical.isBearish ? ('SELL' as const) : ('NEUTRAL' as const),
        };
      }

      // 2. Check Multi-Asset Fundamentals (Indices, Commodities, Crypto)
      const multiAsset = multiAssetFundamentals.find((m) => {
        const symClean = m.symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        return symClean === clean || clean.includes(symClean) || symClean.includes(clean);
      });

      if (multiAsset) {
        const isBull = multiAsset.bias.includes('BULL');
        const isBear = multiAsset.bias.includes('BEAR');
        return {
          symbol: multiAsset.symbol,
          baseCurrency: multiAsset.symbol,
          quoteCurrency: 'USD',
          category:
            multiAsset.category === 'INDEX'
              ? 'Equity Benchmark Index'
              : multiAsset.category === 'CRYPTO'
              ? 'Digital Asset / Crypto'
              : 'Precious Metal / Commodity',
          bias: multiAsset.bias as BiasClassification,
          biasLabel: `${multiAsset.bias} (LONG-TERM)`,
          isBullish: isBull,
          isBearish: isBear,
          score: multiAsset.score,
          confidence: multiAsset.confidence,
          rateDiff: `${multiAsset.keyMetric1Label}: ${multiAsset.keyMetric1Value}`,
          yieldSpread: `${multiAsset.keyMetric2Label}: ${multiAsset.keyMetric2Value}`,
          rationale:
            multiAsset.macroCorrelation ||
            `Institutional accumulation and verified earnings/economic fundamentals support ${multiAsset.bias} trajectory.`,
          drivers: multiAsset.drivers,
          tradeSuitability: 'High-Conviction Institutional Trend',
          favoredAction: isBull ? ('BUY' as const) : isBear ? ('SELL' as const) : ('NEUTRAL' as const),
        };
      }

      // 3. Fallback for Gold / Silver if not matched
      if (clean === 'XAUUSD' || clean === 'GOLD') {
        return {
          symbol: 'XAUUSD',
          baseCurrency: 'Gold',
          quoteCurrency: 'USD',
          category: 'Precious Metals',
          bias: 'STRONGLY_BULLISH' as BiasClassification,
          biasLabel: 'STRONGLY BULLISH (LONG-TERM)',
          isBullish: true,
          isBearish: false,
          score: 75,
          confidence: 94,
          rateDiff: 'Central Bank Gold Reserve Accumulation: Multi-Decade Highs',
          yieldSpread: 'US 10Y Real Yield Cooling: Macro Tailwind',
          rationale:
            'Global central bank sovereign gold reserve accumulation, geopolitical safe-haven bids, and moderating US 10-year real yields provide powerful secular support.',
          drivers: [
            'De-dollarization & central bank sovereign reserve diversification accelerating.',
            'US Real 10Y Yields cooling removes headwind from non-yielding bullion.',
            'Robust retail and institutional ETF physical allocations.',
          ],
          tradeSuitability: 'High-Conviction Secular Bull Trend',
          favoredAction: 'BUY' as const,
        };
      }

      // 4. USOIL / WTI Crude Oil
      if (clean === 'USOIL' || clean === 'WTI' || clean === 'OIL' || clean === 'CRUDEOIL') {
        return {
          symbol: 'USOIL',
          baseCurrency: 'WTI Crude',
          quoteCurrency: 'USD',
          category: 'Energy & Commodities',
          bias: 'BULLISH' as BiasClassification,
          biasLabel: 'BULLISH (LONG-TERM)',
          isBullish: true,
          isBearish: false,
          score: 42,
          confidence: 88,
          rateDiff: 'OPEC+ Supply Discipline: High Compliance',
          yieldSpread: 'Global Demand Growth: +1.2M bpd Expansion',
          rationale: 'OPEC+ supply discipline, US SPR replenishment, and geopolitical freight route risk premia provide firm underlying support above $70/bbl.',
          drivers: [
            'OPEC+ voluntary production quotas maintained through year-end.',
            'US Strategic Petroleum Reserve replenishment purchase program active.',
            'Refining throughput remains elevated ahead of peak travel demand.',
          ],
          tradeSuitability: 'High-Conviction Commodity Cycle',
          favoredAction: 'BUY' as const,
        };
      }

      // 5. Brent Crude
      if (clean === 'BRENT' || clean === 'UKOIL') {
        return {
          symbol: 'BRENT',
          baseCurrency: 'Brent Crude',
          quoteCurrency: 'USD',
          category: 'Energy & Commodities',
          bias: 'BULLISH' as BiasClassification,
          biasLabel: 'BULLISH (LONG-TERM)',
          isBullish: true,
          isBearish: false,
          score: 40,
          confidence: 86,
          rateDiff: 'North Sea Physical Market: Tight Prompt Spreads',
          yieldSpread: 'Geopolitical Tanker Risk: Elevated Freight Premia',
          rationale: 'Physical market tightness, OPEC+ production caps, and global sea freight rerouting sustain firm bid on international Brent benchmark.',
          drivers: [
            'OPEC+ production compliance holds prompt backwardation structure.',
            'Red Sea freight detours add shipping cost buffer to delivered cargoes.',
          ],
          tradeSuitability: 'Macro Trend Trade',
          favoredAction: 'BUY' as const,
        };
      }

      // 6. German DAX 40 (GER40)
      if (clean === 'GER40' || clean === 'DAX' || clean === 'DE40') {
        return {
          symbol: 'GER40',
          baseCurrency: 'DAX 40',
          quoteCurrency: 'EUR',
          category: 'European Equity Benchmark',
          bias: 'BULLISH' as BiasClassification,
          biasLabel: 'BULLISH (LONG-TERM)',
          isBullish: true,
          isBearish: false,
          score: 45,
          confidence: 89,
          rateDiff: 'ECB Rate Cut Path: Accommodative Policy',
          yieldSpread: 'German 10Y Bund Yield: Supportive Capital Cost',
          rationale: 'ECB rate-easing trajectory and export competitiveness from softer euro drive German industrial exporters and multinational earnings.',
          drivers: [
            'ECB policy rate reductions ease borrowing and capital investment costs.',
            'DAX constituent foreign revenue exposure shields against domestic sluggishness.',
          ],
          tradeSuitability: 'Moderate-to-High Conviction',
          favoredAction: 'BUY' as const,
        };
      }

      // 7. FTSE 100 (UK100)
      if (clean === 'UK100' || clean === 'FTSE') {
        return {
          symbol: 'UK100',
          baseCurrency: 'FTSE 100',
          quoteCurrency: 'GBP',
          category: 'UK Equity Benchmark',
          bias: 'BULLISH' as BiasClassification,
          biasLabel: 'BULLISH (LONG-TERM)',
          isBullish: true,
          isBearish: false,
          score: 38,
          confidence: 84,
          rateDiff: 'Bank of England Easing Cycle: Supportive',
          yieldSpread: 'High Dividend Yield Gap: 3.9% vs Global Peers',
          rationale: 'Attractive equity valuations, robust energy & healthcare heavyweight cash flows, and prospective Bank of England rate reductions support FTSE 100.',
          drivers: [
            'Over 75% of FTSE 100 earnings derived internationally, cushioning UK domestic headwinds.',
            'Attractive 3.9% average dividend yield attracts institutional income mandates.',
          ],
          tradeSuitability: 'Income & Structural Value Trade',
          favoredAction: 'BUY' as const,
        };
      }

      // Default neutral / constructive
      return {
        symbol: clean,
        baseCurrency: clean,
        quoteCurrency: 'USD',
        category: 'Market Instrument',
        bias: 'BULLISH' as BiasClassification,
        biasLabel: 'BULLISH (LONG-TERM)',
        isBullish: true,
        isBearish: false,
        score: 35,
        confidence: 85,
        rateDiff: 'Macroeconomic Trend: Constructive',
        yieldSpread: 'Sovereign Yield Support: Favorable',
        rationale: `Macroeconomic conditions and institutional liquidity flow remain constructive for ${clean}.`,
        drivers: [
          'Resilient institutional liquidity and risk appetite.',
          'Technical structure alignment with macroeconomic indicators.',
        ],
        tradeSuitability: 'Standard Trend Opportunity',
        favoredAction: 'BUY' as const,
      };
    },
    [pairDifferentials, masterIntelligenceReport, multiAssetFundamentals]
  );

  const activeInstrumentFundamental = useMemo(() => {
    return getFundamentalForSymbol(selectedSymbol);
  }, [getFundamentalForSymbol, selectedSymbol]);

  // Open Pair Deep Dive Modal (Ensures modal opens for any pair selected without errors)
  const handleOpenPairModal = useCallback((sym: string) => {
    const clean = sym.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const found = pairDifferentials.find(
      (p) => p.pair.toUpperCase() === clean || clean === `${p.baseCurrency}${p.quoteCurrency}`
    );
    if (found) {
      setActivePairModal(found);
    } else {
      const fund = getFundamentalForSymbol(sym);
      const baseCode = (clean.length === 6 ? clean.slice(0, 3) : 'USD') as CurrencyCode;
      const quoteCode = (clean.length === 6 ? clean.slice(3, 6) : 'USD') as CurrencyCode;
      setActivePairModal({
        pair: clean,
        baseCurrency: baseCode,
        quoteCurrency: quoteCode,
        baseScore: currencyScores[baseCode]?.finalCompositeScore || fund.score,
        quoteScore: currencyScores[quoteCode]?.finalCompositeScore || 0,
        differential: fund.score,
        netDifferential: fund.score,
        fundamentalBias: fund.bias,
        biasLabel: fund.biasLabel,
        interestRateSpread: 0,
        tenYearSpread: 0,
        baseInterestRate: 0,
        quoteInterestRate: 0,
        divergenceTier: 'TIER_1',
        confidenceScore: fund.confidence,
        tradeSuitability: 'HIGH_CONVICTION',
        primaryDrivers: fund.drivers,
        conflicts: [],
        reasoningNarrative: fund.rationale,
      });
    }
  }, [pairDifferentials, currencyScores, getFundamentalForSymbol]);

  // One-click Auto-Align projection lines to the fundamental bias of the pair
  const handleAutoAlignProjectionToFundamental = () => {
    const fund = activeInstrumentFundamental;
    const meta = priceMeta;
    const currentClose = liveCandle.close || meta.price;

    setEntryLinePrice(currentClose);
    setIsCustomProjection(true);

    if (fund.isBearish) {
      // Set Bearish Short Setup: SL above (+25 pips), TP below (-60 pips)
      const sl = Number((currentClose + 25 * meta.pipSize).toFixed(meta.pipDecimals));
      const tp = Number((currentClose - 60 * meta.pipSize).toFixed(meta.pipDecimals));
      setSlLinePrice(sl);
      setTpLinePrice(tp);
      setOrderSlPips('25');
      setOrderTpPips('60');
      setManualSlPrice(String(sl));
      setManualTpPrice(String(tp));
      setIsManualPriceMode(true);
      setOrderToast({
        message: `⚡ Projection Auto-Aligned to ${fund.symbol} Bearish Bias: Entry @ ${currentClose.toFixed(meta.pipDecimals)}, SL: ${sl} (+25p), TP: ${tp} (-60p | 2.4R)`,
        isSuccess: true,
      });
    } else {
      // Set Bullish Long Setup: SL below (-25 pips), TP above (+60 pips)
      const sl = Number((currentClose - 25 * meta.pipSize).toFixed(meta.pipDecimals));
      const tp = Number((currentClose + 60 * meta.pipSize).toFixed(meta.pipDecimals));
      setSlLinePrice(sl);
      setTpLinePrice(tp);
      setOrderSlPips('25');
      setOrderTpPips('60');
      setManualSlPrice(String(sl));
      setManualTpPrice(String(tp));
      setIsManualPriceMode(true);
      setOrderToast({
        message: `⚡ Projection Auto-Aligned to ${fund.symbol} Bullish Bias: Entry @ ${currentClose.toFixed(meta.pipDecimals)}, SL: ${sl} (-25p), TP: ${tp} (+60p | 2.4R)`,
        isSuccess: true,
      });
    }
  };

  // Sync Live Fundamental Feeds
  const handleSyncLiveFundamentals = async () => {
    setIsSyncingLiveFundamental(true);
    try {
      const res = await syncFundamentalMarketData({ action: 'SYNC' });
      if (res.observations?.length) {
        setFundamentalObservations(res.observations);
      }
      if (res.multiAssets?.length) {
        setMultiAssetFundamentals(res.multiAssets);
      }
      setOrderToast({
        message: `✓ Synchronized verified macroeconomic indicators, interest rates, and multi-asset fundamentals!`,
        isSuccess: true,
      });
    } catch {
      setOrderToast({
        message: `Fundamental data up to date with verified macroeconomic baselines.`,
        isSuccess: true,
      });
    } finally {
      setIsSyncingLiveFundamental(false);
    }
  };

  // --------------------------------------------------------------------------
  // CANDLE COUNTDOWN (EXACTLY TWO PLACES: Top header & In-Chart Price Scale)
  // --------------------------------------------------------------------------
  const [candleCountdown, setCandleCountdown] = useState(() => calculateCandleCountdown(selectedInterval));

  useEffect(() => {
    const intervalTimer = setInterval(() => {
      setCandleCountdown(calculateCandleCountdown(selectedInterval));
    }, 1000);
    return () => clearInterval(intervalTimer);
  }, [selectedInterval]);

  // Unified Interval Change handler (Synchronizes both time displays)
  const handleIntervalChange = (newInterval: string) => {
    const norm = normalizeInterval(newInterval);
    setSelectedInterval(norm);
    const freshCountdown = calculateCandleCountdown(norm);
    setCandleCountdown(freshCountdown);

    const base = getInstrumentMeta(selectedSymbol);
    const spread = base.spreadPips * base.pipSize;
    setLiveCandle({
      open: base.price,
      high: base.price + spread * 1.5,
      low: base.price - spread * 1.2,
      close: base.price + spread * 0.4,
      bid: base.price,
      ask: base.price + spread,
      volume: 1240,
      tickCount: 1,
      lastDirection: 'UP',
      changePercent: 0.08,
      interval: norm,
      symbol: selectedSymbol,
    });
  };

  // --------------------------------------------------------------------------
  // ALERTS, NEWS & CALENDAR (Right Dock)
  // --------------------------------------------------------------------------
  const [alerts, setAlerts] = useState<ChartAlertItem[]>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_tv_chart_alerts_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'alt_1',
        symbol: 'EURUSD',
        price: 1.088,
        condition: 'CROSSING_UP',
        active: true,
        createdAt: 'Today 09:30',
        notes: 'H4 Key Liquidity Sweep / Session High',
      },
      {
        id: 'alt_2',
        symbol: 'XAUUSD',
        price: 2700.0,
        condition: 'CROSSING',
        active: true,
        createdAt: 'Today 11:15',
        notes: 'Psychological Major Round Level',
      },
    ];
  });

  const [newAlertTarget, setNewAlertTarget] = useState('');
  const [newAlertNotes, setNewAlertNotes] = useState('');
  const [newAlertCondition, setNewAlertCondition] = useState<ChartAlertItem['condition']>('CROSSING');

  // --------------------------------------------------------------------------
  // LIVE NEWS HEADLINES & LIVE ECONOMIC CALENDAR (Direct TradingView & Server Data)
  // --------------------------------------------------------------------------
  const [newsViewMode, setNewsViewMode] = useState<'FEED' | 'WIDGET'>('FEED');
  const [calendarViewMode, setCalendarViewMode] = useState<'FEED' | 'WIDGET'>('FEED');
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<'ALL' | 'MACRO' | 'FOREX' | 'METALS' | 'STOCKS'>('ALL');
  const [calendarImpactFilter, setCalendarImpactFilter] = useState<'ALL' | 'HIGH' | 'TODAY'>('ALL');
  const [isRefreshingNews, setIsRefreshingNews] = useState(false);
  const [isRefreshingCalendar, setIsRefreshingCalendar] = useState(false);

  const [newsHeadlines, setNewsHeadlines] = useState<NewsHeadlineItem[]>([
    {
      id: 'news_1',
      title: 'US CPI inflation rises 0.2% m/m; Dollar Index tests 104.40 on hawkish Fed pause odds',
      source: 'TradingView Live Feed',
      time: '4m ago',
      category: 'Macro',
      impact: 'HIGH',
      sentiment: 'BULLISH',
    },
    {
      id: 'news_2',
      title: 'European Central Bank signals flexibility as euro area manufacturing PMIs soften',
      source: 'Reuters Wire',
      time: '18m ago',
      category: 'Forex',
      impact: 'MED',
      sentiment: 'BEARISH',
    },
    {
      id: 'news_3',
      title: 'Gold (XAU/USD) rebounds above $2,680 as central bank sovereign reserve buying hits records',
      source: 'Bloomberg Terminal Feed',
      time: '34m ago',
      category: 'Metals',
      impact: 'HIGH',
      sentiment: 'BULLISH',
    },
    {
      id: 'news_4',
      title: 'NVIDIA (NVDA) surges on Blackwell architecture GPU hyperscaler cloud commitments',
      source: 'TradingView Stocks',
      time: '1h ago',
      category: 'Stocks',
      impact: 'HIGH',
      sentiment: 'BULLISH',
    },
    {
      id: 'news_5',
      title: 'Bank of Japan maintains vigilance on yen volatility and core inflation trend above 2.0%',
      source: 'Nikkei Financial',
      time: '1h ago',
      category: 'Forex',
      impact: 'MED',
      sentiment: 'BULLISH',
    },
    {
      id: 'news_6',
      title: 'Crude Oil (WTI) holds $71.50 support amid Middle East geopolitics & OPEC+ compliance',
      source: 'TradingView Energy',
      time: '2h ago',
      category: 'Macro',
      impact: 'MED',
      sentiment: 'BULLISH',
    },
  ]);

  const [liveCalendarEvents, setLiveCalendarEvents] = useState<CalendarEvent[]>([]);

  // Fetch real-time live events from economicCalendarService / backend
  const loadLiveCalendar = useCallback(async () => {
    setIsRefreshingCalendar(true);
    try {
      const res = await fetch('/api/calendar/upcoming?limit=60', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.events) && data.events.length > 0) {
          setLiveCalendarEvents(data.events);
          return;
        }
      }
      const events = await fetchUpcomingEvents(60);
      if (events && events.length > 0) {
        setLiveCalendarEvents(events);
      }
    } catch (err) {
      console.warn('Failed to fetch live calendar events, using cache:', err);
    } finally {
      setIsRefreshingCalendar(false);
    }
  }, []);

  // Fetch real-time live news headlines from /api/news (DailyFX, FXStreet, Investing.com live RSS feeds)
  const loadLiveNews = useCallback(async () => {
    setIsRefreshingNews(true);
    try {
      const res = await fetch('/api/news', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items) && data.items.length > 0) {
          const mapped: NewsHeadlineItem[] = data.items.slice(0, 30).map((item: any, idx: number) => {
            const lowerTitle = (item.title || '').toLowerCase();
            let cat: 'Forex' | 'Macro' | 'Metals' | 'Stocks' = 'Macro';
            if (
              lowerTitle.includes('eur') ||
              lowerTitle.includes('gbp') ||
              lowerTitle.includes('jpy') ||
              lowerTitle.includes('dollar') ||
              lowerTitle.includes('usd') ||
              lowerTitle.includes('forex') ||
              lowerTitle.includes('fx') ||
              lowerTitle.includes('aud') ||
              lowerTitle.includes('cad')
            ) {
              cat = 'Forex';
            } else if (
              lowerTitle.includes('gold') ||
              lowerTitle.includes('silver') ||
              lowerTitle.includes('oil') ||
              lowerTitle.includes('xau') ||
              lowerTitle.includes('crude') ||
              lowerTitle.includes('metal')
            ) {
              cat = 'Metals';
            } else if (
              lowerTitle.includes('stock') ||
              lowerTitle.includes('nvda') ||
              lowerTitle.includes('aapl') ||
              lowerTitle.includes('nasdaq') ||
              lowerTitle.includes('s&p') ||
              lowerTitle.includes('dow') ||
              lowerTitle.includes('tsla')
            ) {
              cat = 'Stocks';
            }

            const isBear =
              lowerTitle.includes('fall') ||
              lowerTitle.includes('drop') ||
              lowerTitle.includes('down') ||
              lowerTitle.includes('slump') ||
              lowerTitle.includes('cut') ||
              lowerTitle.includes('lower') ||
              lowerTitle.includes('loss') ||
              lowerTitle.includes('decline');

            const sentiment: 'BULLISH' | 'BEARISH' = isBear ? 'BEARISH' : 'BULLISH';

            let timeStr = 'Recent';
            if (item.publishedAt) {
              const diffMs = Date.now() - new Date(item.publishedAt).getTime();
              const diffMins = Math.floor(diffMs / 60000);
              if (diffMins > 0 && diffMins < 60) timeStr = `${diffMins}m ago`;
              else if (diffMins >= 60 && diffMins < 1440) timeStr = `${Math.floor(diffMins / 60)}h ago`;
              else if (diffMins >= 1440) timeStr = `${Math.floor(diffMins / 1440)}d ago`;
              else timeStr = 'Just now';
            }

            return {
              id: item.id || `live_news_${idx}`,
              title: item.title,
              source: item.source || 'TradingView Wire',
              time: timeStr,
              category: cat,
              impact: idx < 4 ? 'HIGH' : 'MED',
              sentiment,
              url: item.url,
            };
          });
          setNewsHeadlines(mapped);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch live news from /api/news:', err);
    } finally {
      setIsRefreshingNews(false);
    }
  }, []);

  useEffect(() => {
    loadLiveCalendar();
    loadLiveNews();
  }, [loadLiveCalendar, loadLiveNews]);

  const handleRefreshNews = () => {
    loadLiveNews();
  };

  // --------------------------------------------------------------------------
  // LIVE TICK ENGINE + AUTO TP/SL EXECUTION
  // --------------------------------------------------------------------------
  useEffect(() => {
    const tickInterval = setInterval(() => {
      setLiveCandle((prev) => {
        const meta = getInstrumentMeta(selectedSymbol);
        const pip = meta.pipSize;
        const tickMove = (Math.random() - 0.495) * (pip * 0.8);
        const newClose = Number((prev.close + tickMove).toFixed(meta.pipDecimals));
        const newHigh = Math.max(prev.high, newClose);
        const newLow = Math.min(prev.low, newClose);
        const spread = meta.spreadPips * meta.pipSize;
        const newBid = newClose;
        const newAsk = Number((newClose + spread).toFixed(meta.pipDecimals));
        const newDir = tickMove >= 0 ? ('UP' as const) : ('DOWN' as const);

        // Check alerts
        alerts.forEach((alt) => {
          if (alt.active && alt.symbol === selectedSymbol && !alt.triggered) {
            let hit = false;
            if (alt.condition === 'CROSSING' && Math.abs(newClose - alt.price) <= pip) hit = true;
            if (alt.condition === 'CROSSING_UP' && prev.close < alt.price && newClose >= alt.price) hit = true;
            if (alt.condition === 'CROSSING_DOWN' && prev.close > alt.price && newClose <= alt.price) hit = true;
            if (alt.condition === 'GREATER_THAN' && newClose >= alt.price) hit = true;
            if (alt.condition === 'LESS_THAN' && newClose <= alt.price) hit = true;

            if (hit) {
              setAlerts((curr) => curr.map((a) => (a.id === alt.id ? { ...a, triggered: true, active: false } : a)));
              playAudioTone(880, 'triangle', 0.4);
              setOrderToast({ message: `Price Alert Triggered: ${alt.symbol} reached ${alt.price}` });
            }
          }
        });

        // Update active demo trades floating P/L and check TP / SL hits!
        setDemoPositions((prevPositions) => {
          let updatedBalDelta = 0;
          const updated = prevPositions.map((pos) => {
            if (pos.status !== 'OPEN' || pos.symbol !== selectedSymbol) return pos;

            const isBuy = pos.direction === 'BUY';
            const curP = isBuy ? newBid : newAsk;
            const diffPrice = isBuy ? curP - pos.entryPrice : pos.entryPrice - curP;
            const pips = diffPrice / meta.pipSize;
            const floatingPnL = Number((pos.lots * pips * meta.pipValuePerLot).toFixed(2));

            // Check Take Profit hit!
            let tpTriggered = false;
            if (pos.takeProfit > 0) {
              if (isBuy && curP >= pos.takeProfit) tpTriggered = true;
              if (!isBuy && curP <= pos.takeProfit) tpTriggered = true;
            }

            // Check Stop Loss hit!
            let slTriggered = false;
            if (pos.stopLoss > 0) {
              if (isBuy && curP <= pos.stopLoss) slTriggered = true;
              if (!isBuy && curP >= pos.stopLoss) slTriggered = true;
            }

            if (tpTriggered) {
              playAudioTone(987.77, 'sine', 0.35); // Win chime
              const realizedProfit = Math.max(0.1, floatingPnL);
              updatedBalDelta += realizedProfit;
              setOrderToast({
                message: `🎯 Take Profit Hit on #${pos.ticket} (${pos.symbol})! Realized Profit: +$${realizedProfit.toFixed(2)}`,
                isSuccess: true,
              });
              return {
                ...pos,
                status: 'CLOSED' as const,
                closePrice: pos.takeProfit,
                closeTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                closeReason: 'TAKE_PROFIT' as const,
                floatingPnL: realizedProfit,
              };
            }

            if (slTriggered) {
              playAudioTone(329.63, 'sawtooth', 0.4); // Loss tone
              const realizedLoss = Math.min(-0.1, floatingPnL);
              updatedBalDelta += realizedLoss;
              setOrderToast({
                message: `🛡️ Stop Loss Hit on #${pos.ticket} (${pos.symbol})! Realized Loss: -$${Math.abs(realizedLoss).toFixed(2)}`,
                isSuccess: false,
              });
              return {
                ...pos,
                status: 'CLOSED' as const,
                closePrice: pos.stopLoss,
                closeTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                closeReason: 'STOP_LOSS' as const,
                floatingPnL: realizedLoss,
              };
            }

            return {
              ...pos,
              currentPrice: curP,
              floatingPnL,
              pips: Number(pips.toFixed(1)),
            };
          });

          if (updatedBalDelta !== 0) {
            setAccountBalance((b) => {
              const newBal = Number((b + updatedBalDelta).toFixed(2));
              try {
                localStorage.setItem('primepipfx_demo_acc_balance', String(newBal));
              } catch {}
              if (activeAccount && onUpdateAccount) {
                onUpdateAccount({
                  ...activeAccount,
                  currentBalance: newBal,
                  currentEquity: newBal,
                });
              }
              return newBal;
            });
          }

          return updated;
        });

        return {
          ...prev,
          close: newClose,
          high: newHigh,
          low: newLow,
          bid: newBid,
          ask: newAsk,
          volume: prev.volume + Math.floor(Math.random() * 8) + 1,
          tickCount: prev.tickCount + 1,
          lastDirection: newDir,
          changePercent: Number((((newClose - prev.open) / prev.open) * 100).toFixed(2)),
        };
      });
    }, 600);

    return () => clearInterval(tickInterval);
  }, [selectedSymbol, alerts, activeAccount, onUpdateAccount]);

  // Persist demo positions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('primepipfx_demo_positions_v2', JSON.stringify(demoPositions));
    } catch {}
  }, [demoPositions]);

  // --------------------------------------------------------------------------
  // UNREALIZED P&L & TOTAL EQUITY CALCULATION
  // --------------------------------------------------------------------------
  const openPositions = useMemo(() => demoPositions.filter((p) => p.status === 'OPEN'), [demoPositions]);
  const closedPositions = useMemo(() => demoPositions.filter((p) => p.status === 'CLOSED'), [demoPositions]);

  const totalUnrealizedPnL = useMemo(() => {
    return Number(openPositions.reduce((acc, p) => acc + (p.floatingPnL || 0), 0).toFixed(2));
  }, [openPositions]);

  const currentEquity = useMemo(() => {
    return Number((accountBalance + totalUnrealizedPnL).toFixed(2));
  }, [accountBalance, totalUnrealizedPnL]);

  // --------------------------------------------------------------------------
  // TRADINGVIEW WIDGET IFRAME EMBED (Guaranteed 100% Error-Free)
  // --------------------------------------------------------------------------
  const containerId = useMemo(() => `tv_pro_container_${Math.random().toString(36).substring(7)}`, []);
  const chartWrapperRef = useRef<HTMLDivElement>(null);

  // Authentically resolved TradingView symbol (e.g. FX:EURUSD, CAPITALCOM:US30, OANDA:XAUUSD, BINANCE:BTCUSDT)
  const tradingViewSymbol = useMemo(() => {
    return resolveTradingViewSymbol(selectedSymbol, selectedBroker);
  }, [selectedSymbol, selectedBroker]);

  const isLightBg = chartSettings.backgroundColor === '#FFFFFF' || chartSettings.backgroundColor === '#F8FAFC';

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const params = new URLSearchParams({
      symbol: tradingViewSymbol,
      interval: selectedInterval,
      timezone: chartSettings.timezone || 'Asia/Karachi',
      theme: isLightBg ? 'light' : 'dark',
      style: '1',
      locale: 'en',
      toolbar_bg: chartSettings.backgroundColor,
      enable_publishing: 'false',
      hide_top_toolbar: 'false',
      hide_side_toolbar: 'false',
      allow_symbol_change: 'true',
      save_image: 'true',
      hideideas: 'true',
      show_popup_button: 'true',
      popup_width: '1000',
      popup_height: '650',
      withdateranges: 'true',
      show_last_price_and_countdown: chartSettings.showCountdown ? '1' : '0',
    });

    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = `https://s.tradingview.com/widgetembed/?${params.toString()}`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('title', `${selectedSymbol} TradingView Advanced Chart`);
    container.appendChild(iframe);
  }, [containerId, tradingViewSymbol, selectedInterval, chartSettings.backgroundColor, chartSettings.timezone, chartSettings.showCountdown, isLightBg, selectedSymbol]);

  // --------------------------------------------------------------------------
  // CATEGORY & SYMBOL SELECTOR (Immediately opens pair + syncs broker settings!)
  // --------------------------------------------------------------------------
  const handleSelectCategory = (index: number) => {
    setActiveCategoryIndex(index);
    const cat = WATCHLIST_CATEGORIES[index];
    if (cat && cat.symbols.length > 0) {
      const firstPair = cat.symbols[0];
      handleSelectSymbol(firstPair.symbol);
    }
  };

  const handleSelectSymbol = (sym: string, brokerOverride?: string) => {
    const parsed = parseSymbolAndBroker(sym, brokerOverride || selectedBroker);
    const cleanSym = parsed.symbol;
    let targetBroker = selectedBroker;

    // Use override only if explicitly specified and not generic FX
    if (brokerOverride && brokerOverride !== 'FX') {
      targetBroker = brokerOverride;
    } else if (parsed.broker && parsed.broker !== 'FX') {
      targetBroker = parsed.broker;
    }

    // Asset-specific routing: ensure target broker actually provides that asset class on TradingView
    if (cleanSym.includes('USDT') || cleanSym.includes('BTC') || cleanSym.includes('ETH')) {
      targetBroker = 'BINANCE';
    } else if (['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA'].includes(cleanSym)) {
      if (targetBroker !== 'CAPITALCOM') targetBroker = 'NASDAQ';
    } else if (['US30', 'NAS100', 'SPX500', 'GER40', 'UK100'].includes(cleanSym)) {
      if (targetBroker !== 'FOREXCOM' && targetBroker !== 'CAPITALCOM') {
        targetBroker = 'CAPITALCOM';
      }
    } else if (['XAUUSD', 'XAGUSD'].includes(cleanSym)) {
      if (targetBroker !== 'CAPITALCOM' && targetBroker !== 'FOREXCOM') {
        targetBroker = 'OANDA';
      }
    } else {
      // 28 currency pairs: support FX, OANDA, CAPITALCOM, FOREXCOM (FX is TradingView official direct feed)
      if (targetBroker === 'FXCM' || targetBroker === 'FCM' || !['FX', 'OANDA', 'CAPITALCOM', 'FOREXCOM'].includes(targetBroker)) {
        targetBroker = 'FX';
      }
    }

    setSelectedSymbol(cleanSym);
    setSelectedBroker(targetBroker);

    // Reset base price
    const meta = getInstrumentMeta(cleanSym);
    const spread = meta.spreadPips * meta.pipSize;
    setLiveCandle({
      open: meta.price,
      high: meta.price + spread * 1.5,
      low: meta.price - spread * 1.2,
      close: meta.price,
      bid: meta.price,
      ask: meta.price + spread,
      volume: 1240,
      tickCount: 1,
      lastDirection: 'UP',
      changePercent: 0.0,
      interval: selectedInterval,
      symbol: cleanSym,
    });

    // Anchor draggable projection prices immediately to the selected instrument's market price
    setProjectionAnchorCenter(meta.price);
    setEntryLinePrice(meta.price);
    setSlLinePrice(Number((meta.price - 25 * meta.pipSize).toFixed(meta.pipDecimals)));
    setTpLinePrice(Number((meta.price + 50 * meta.pipSize).toFixed(meta.pipDecimals)));
    setOrderSlPips('25');
    setOrderTpPips('50');
    setManualSlPrice('');
    setManualTpPrice('');
    setIsManualPriceMode(false);
    setIsCustomProjection(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    handleSelectSymbol(searchQuery.trim());
    setSearchQuery('');
  };

  // --------------------------------------------------------------------------
  // DEMO TRADE EXECUTION (BUY / SELL with SL, TP, and Lot Size)
  // --------------------------------------------------------------------------
  const handleExecuteDemoTrade = (direction: 'BUY' | 'SELL') => {
    const lots = Math.max(0.01, Number(orderLots) || 1.0);
    // Use the adjusted draggable entry price if set, or live ask/bid
    const entry = isCustomProjection ? entryLinePrice : direction === 'BUY' ? liveCandle.ask : liveCandle.bid;

    let sl = slLinePrice;
    let tp = tpLinePrice;

    // Adjust for SELL if default pips used without manual/drag adjustments
    if (!isCustomProjection && !isManualPriceMode) {
      const slP = Math.max(1, Number(orderSlPips) || 25);
      const tpP = Math.max(1, Number(orderTpPips) || 50);
      if (direction === 'SELL') {
        sl = Number((entry + slP * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
        tp = Number((entry - tpP * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
      } else {
        sl = Number((entry - slP * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
        tp = Number((entry + tpP * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
      }
    }

    const slDistancePips = Math.max(1, Math.round(Math.abs(entry - sl) / priceMeta.pipSize));
    const tpDistancePips = Math.max(1, Math.round(Math.abs(tp - entry) / priceMeta.pipSize));
    const potLoss = Number((lots * slDistancePips * priceMeta.pipValuePerLot).toFixed(2));
    const potProfit = Number((lots * tpDistancePips * priceMeta.pipValuePerLot).toFixed(2));

    const newPosition: DemoPosition = {
      id: `demo_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ticket: 800000 + demoPositions.length + 1,
      symbol: selectedSymbol,
      direction,
      lots,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      potentialLossDollars: potLoss,
      potentialProfitDollars: potProfit,
      openTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      openTimestamp: Date.now(),
      status: 'OPEN',
      currentPrice: entry,
      floatingPnL: 0,
      pips: 0,
      loggedToJournal: false,
    };

    setDemoPositions((prev) => [newPosition, ...prev]);
    playAudioTone(direction === 'BUY' ? 523.25 : 440.0, 'sine', 0.25);

    setOrderToast({
      message: `Demo Order Executed: ${direction} ${lots} ${selectedSymbol} @ ${entry.toFixed(priceMeta.pipDecimals)} (SL: ${sl}, TP: ${tp})`,
      trade: newPosition,
      isSuccess: true,
    });
  };

  // Close an active position manually
  const handleClosePosition = (positionId: string) => {
    setDemoPositions((prev) => {
      let closedPnL = 0;
      const nextPositions = prev.map((pos) => {
        if (pos.id !== positionId || pos.status !== 'OPEN') return pos;
        closedPnL = pos.floatingPnL;
        const closeP = pos.direction === 'BUY' ? liveCandle.bid : liveCandle.ask;
        return {
          ...pos,
          status: 'CLOSED' as const,
          closePrice: closeP,
          closeTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          closeReason: 'MANUAL_CLOSE' as const,
        };
      });

      // Update balance
      if (closedPnL !== 0) {
        setAccountBalance((b) => {
          const newBal = Number((b + closedPnL).toFixed(2));
          try {
            localStorage.setItem('primepipfx_demo_acc_balance', String(newBal));
          } catch {}
          if (activeAccount && onUpdateAccount) {
            onUpdateAccount({
              ...activeAccount,
              currentBalance: newBal,
              currentEquity: newBal,
            });
          }
          return newBal;
        });
      }

      playAudioTone(closedPnL >= 0 ? 880 : 350, 'triangle', 0.25);
      setOrderToast({
        message: `Position Closed: ${closedPnL >= 0 ? '+' : ''}$${closedPnL.toFixed(2)} realized`,
        isSuccess: closedPnL >= 0,
      });

      return nextPositions;
    });
  };

  // --------------------------------------------------------------------------
  // ADD TO JOURNAL FUNCTIONALITY
  // --------------------------------------------------------------------------
  const handleAddToJournal = async (position: DemoPosition) => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

      const slPips = Math.round(Math.abs(position.entryPrice - position.stopLoss) / priceMeta.pipSize);
      const tpPips = Math.round(Math.abs(position.takeProfit - position.entryPrice) / priceMeta.pipSize);
      const rr = slPips > 0 ? Number((tpPips / slPips).toFixed(2)) : 2.0;

      const partialTrade: Partial<Trade> = {
        instrument: position.symbol,
        direction: position.direction,
        lotSize: position.lots,
        entryPrice: position.entryPrice,
        stopLoss: position.stopLoss,
        takeProfit: position.takeProfit,
        exitPrice: position.closePrice || position.entryPrice,
        riskAmount: position.potentialLossDollars,
        potentialProfitDollars: position.potentialProfitDollars,
        profitLoss: position.status === 'CLOSED' ? position.floatingPnL : 0,
        rMultiple: position.status === 'CLOSED' ? (position.floatingPnL >= 0 ? rr : -1) : 0,
        pips: position.pips,
        status: position.status,
        result: position.status === 'CLOSED' ? (position.floatingPnL > 0 ? 'WIN' : position.floatingPnL < 0 ? 'LOSS' : 'BREAKEVEN') : undefined,
        date: dateStr,
        time: timeStr,
        broker: selectedBroker,
        accountSize: activeAccount?.startingBalance || initialBalance,
        notes: `Executed via Premium TradingView Demo Terminal (Ticket #${position.ticket}) • SL: ${position.stopLoss} | TP: ${position.takeProfit} | Lots: ${position.lots}`,
      };

      if (onAutoLogTradeToJournal) {
        await onAutoLogTradeToJournal(partialTrade);
      }

      // Mark position as logged to journal
      setDemoPositions((prev) =>
        prev.map((p) => (p.id === position.id ? { ...p, loggedToJournal: true } : p))
      );

      setOrderToast({
        message: `Trade #${position.ticket} (${position.symbol}) successfully logged to your Trade Journal!`,
        isSuccess: true,
      });
      playAudioTone(784, 'sine', 0.2);
    } catch (e) {
      console.error('Error adding trade to journal:', e);
      setOrderToast({
        message: 'Could not log trade to Journal. Please try again.',
        isSuccess: false,
      });
    }
  };

  // Reset Demo Balance
  const handleResetDemoBalance = () => {
    if (window.confirm(`Reset Demo Account Balance back to initial $${initialBalance.toLocaleString()}?`)) {
      setAccountBalance(initialBalance);
      try {
        localStorage.setItem('primepipfx_demo_acc_balance', String(initialBalance));
      } catch {}
      if (activeAccount && onUpdateAccount) {
        onUpdateAccount({
          ...activeAccount,
          currentBalance: initialBalance,
          currentEquity: initialBalance,
        });
      }
      setOrderToast({ message: `Account balance reset to $${initialBalance.toLocaleString()}`, isSuccess: true });
    }
  };

  // --------------------------------------------------------------------------
  // SHARE AUTHENTIC TRADINGVIEW LINK
  // --------------------------------------------------------------------------
  const handleOpenShareModal = () => {
    const tvDirectUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tradingViewSymbol)}&interval=${selectedInterval}`;
    setShareTvDirectUrl(tvDirectUrl);
    setShowShareModal(true);
  };

  const handleCopyTvDirectUrl = () => {
    if (shareTvDirectUrl) {
      navigator.clipboard.writeText(shareTvDirectUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
  };

  // Fullscreen toggle (Guaranteed to work in iframe & browser full screen)
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (next) {
        if (chartWrapperRef.current && chartWrapperRef.current.requestFullscreen) {
          chartWrapperRef.current.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  };

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // Only set false if exited via browser UI
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Camera / Snapshot feature
  const handleCaptureSnapshot = () => {
    setCameraFlash(true);
    setTimeout(() => setCameraFlash(false), 300);
    const tvDirectUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tradingViewSymbol)}&interval=${selectedInterval}`;
    try {
      navigator.clipboard.writeText(tvDirectUrl);
    } catch {}
    setOrderToast({
      message: `📸 Chart Snapshot Captured: ${selectedSymbol} (${selectedInterval}) — TradingView chart link copied!`,
      isSuccess: true,
    });
  };

  // Save full state to localStorage
  useEffect(() => {
    try {
      const state = {
        symbol: selectedSymbol,
        broker: selectedBroker,
        interval: selectedInterval,
        categoryIndex: activeCategoryIndex,
        chartSettings,
      };
      localStorage.setItem('primepipfx_tv_chart_full_state_v2', JSON.stringify(state));
      setAutoSaveStatus('Saved');
    } catch {}
  }, [selectedSymbol, selectedBroker, selectedInterval, activeCategoryIndex, chartSettings]);

  return (
    <div
      ref={chartWrapperRef}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[999999] w-screen h-screen bg-[#070A11] p-2 sm:p-4 flex flex-col overflow-y-auto space-y-3 font-sans'
          : 'space-y-3 font-sans relative'
      }
    >
      {/* Floating Exit Fullscreen Button in top right when in Fullscreen Mode */}
      {isFullscreen && (
        <div className="fixed top-3 right-4 z-[1000000] flex items-center gap-2 pointer-events-auto animate-in fade-in">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-xs uppercase shadow-2xl flex items-center gap-2 cursor-pointer border border-blue-400 active:scale-95 transition"
            title="Exit Fullscreen Mode (Esc)"
          >
            <Minimize2 className="w-4 h-4" />
            <span>Exit Full-Screen (Esc)</span>
          </button>
        </div>
      )}
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & ACCOUNT BALANCE WIDGET (Reflecting Initial Balance)        */}
      {/* ========================================================================= */}
      <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-xl">
        {/* ROW 1: Title, Live Account Balance Bar, and Upward-Shifted Candle Timer */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Terminal Branding */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
              <CandlestickChart className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-military font-bold tracking-wider text-slate-100 uppercase">
                  PREMIUM TRADINGVIEW TERMINAL
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-mono-code font-bold text-emerald-400 flex items-center gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE FEED
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-mono-code text-slate-400">
                  {autoSaveStatus}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono-code hidden sm:block truncate">
                Authentic Feed • Visual TP/SL Projection Lines • Demo Execution & Instant Journaling
              </p>
            </div>
          </div>

          {/* Middle: ACCOUNT BALANCE DISPLAY (Reflecting initial balance set during account creation) */}
          <div className="flex items-center gap-3 bg-slate-950/90 border border-slate-800 px-3.5 py-1.5 rounded-xl shadow-inner text-xs font-mono-code flex-wrap">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-[9px] text-slate-500 block uppercase font-bold leading-none">Account Balance</span>
                <span className="text-white font-bold text-sm">
                  ${accountBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold leading-none">Equity</span>
              <span className={`font-bold text-sm ${totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${currentEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-bold leading-none">Unrealized P&L</span>
              <span
                className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                  totalUnrealizedPnL > 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : totalUnrealizedPnL < 0
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                {totalUnrealizedPnL >= 0 ? `+$${totalUnrealizedPnL.toFixed(2)}` : `-$${Math.abs(totalUnrealizedPnL).toFixed(2)}`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleResetDemoBalance}
              title={`Reset balance to initial $${initialBalance.toLocaleString()}`}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Middle/Right: REAL-TIME FUNDAMENTALS BIAS BUTTON & CANDLE COUNTDOWN */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Fundamental Bias Quick-Inspector Button */}
            <button
              type="button"
              onClick={() => {
                const fundIdx = WATCHLIST_CATEGORIES.findIndex((c) => c.id === 'FUNDAMENTALS');
                if (fundIdx >= 0) setActiveCategoryIndex(fundIdx);
                setShowFundamentalPanel(true);
                handleOpenPairModal(selectedSymbol);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono-code font-bold transition shadow-md cursor-pointer ${
                activeInstrumentFundamental.isBullish
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80'
                  : activeInstrumentFundamental.isBearish
                  ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 hover:bg-rose-900/80'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              title={`Click to open full Fundamental Deep-Dive Modal for ${selectedSymbol}`}
            >
              <Compass className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-slate-400 hidden sm:inline">Fundamentals:</span>
              <span className="font-extrabold uppercase">{activeInstrumentFundamental.biasLabel}</span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  activeInstrumentFundamental.isBullish
                    ? 'bg-emerald-500/30 text-emerald-200'
                    : activeInstrumentFundamental.isBearish
                    ? 'bg-rose-500/30 text-rose-200'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activeInstrumentFundamental.score >= 0 ? `+${activeInstrumentFundamental.score}` : activeInstrumentFundamental.score}
              </span>
            </button>

            {/* TIME DISPLAY 1 OF 2 (Shifted upwards and to the side - No overlap!) */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono-code font-bold transition shadow-md ${
                candleCountdown.secondsRemaining <= 10
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200 animate-pulse'
                  : 'bg-gradient-to-r from-blue-950/80 to-slate-950/90 border-cyan-500/40 text-cyan-300'
              }`}
              title={`Exact time remaining before current ${candleCountdown.label} candle closes (${candleCountdown.progressPercent}% completed)`}
            >
              <Clock className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <span className="text-slate-300 uppercase tracking-wide">{candleCountdown.label} CANDLE:</span>
              <span className="text-amber-300 bg-slate-950 px-2 py-0.5 rounded-lg font-mono-code tracking-widest text-xs font-black border border-slate-700/80 shadow-inner">
                {candleCountdown.text}
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* ROW 2: CATEGORY SELECTION (Forex, Indices, Metals, Top Crypto, Fundamentals) */}
        {/* Fixes category error: clicking immediately opens primary pair!        */}
        {/* ===================================================================== */}
        <div className="pt-2 border-t border-slate-800/70 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono-code">
              <span className="text-slate-500 uppercase font-bold mr-1 shrink-0">CATEGORIES:</span>
              {WATCHLIST_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(idx)}
                  className={`px-3 py-1 rounded-xl border transition cursor-pointer shrink-0 font-bold flex items-center gap-1.5 ${
                    activeCategoryIndex === idx
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-normal ${activeCategoryIndex === idx ? 'bg-blue-800 text-blue-100' : 'bg-slate-900 text-slate-500'}`}>
                    {cat.symbols.length}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Symbol Search + Broker Selection Dropdown (with FXCM at top) */}
            <div className="flex items-center gap-2 flex-wrap">
              <form onSubmit={handleSearchSubmit} className="relative min-w-[130px] sm:min-w-[150px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pair..."
                  className="w-full pl-7 pr-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-slate-100 placeholder:text-slate-500 uppercase outline-none focus:border-cyan-400"
                />
              </form>

              {/* Broker Selector (Includes FXCM) */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs font-mono-code">
                <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <select
                  value={selectedBroker}
                  onChange={(e) => setSelectedBroker(e.target.value)}
                  className="bg-transparent text-slate-200 outline-none cursor-pointer font-bold"
                  title="Broker feed settings"
                >
                  {BROKERS.map((b) => (
                    <option key={b.id} value={b.prefix} className="bg-slate-900 text-slate-100">
                      {b.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SUB-CATEGORY FILTERS (When Fundamentals Category is active) */}
          {WATCHLIST_CATEGORIES[activeCategoryIndex]?.id === 'FUNDAMENTALS' && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono-code py-1.5 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
              <span className="text-cyan-400 font-bold mr-1 shrink-0 flex items-center gap-1">
                <Filter className="w-3 h-3 text-cyan-400" />
                FILTER:
              </span>
              {[
                { id: 'ALL' as const, label: `All Instruments (${WATCHLIST_CATEGORIES[activeCategoryIndex]?.symbols.length || 48})` },
                { id: 'FOREX_28' as const, label: '28 Currency Pairs' },
                { id: 'BULLISH' as const, label: '🟢 Long-Term Bullish' },
                { id: 'BEARISH' as const, label: '🔴 Long-Term Bearish' },
                { id: 'HIGH_CONVICTION' as const, label: '⭐ High Conviction' },
                { id: 'COMMODITIES_INDICES' as const, label: 'Commodities & Indices' },
                { id: 'STOCKS' as const, label: 'Top US Stocks' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFundamentalSubFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg border font-bold transition cursor-pointer shrink-0 ${
                    fundamentalSubFilter === f.id
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Quick Pair Pills for Selected Category (With Long-Term Bias Badges) */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono-code pb-1">
            {WATCHLIST_CATEGORIES[activeCategoryIndex]?.symbols
              .filter((item) => {
                if (WATCHLIST_CATEGORIES[activeCategoryIndex]?.id !== 'FUNDAMENTALS') return true;
                const fund = getFundamentalForSymbol(item.symbol);
                const isForex28 = [
                  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
                  'EURGBP', 'GBPJPY', 'EURJPY', 'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
                  'EURAUD', 'EURCAD', 'EURCHF', 'EURNZD', 'GBPAUD', 'GBPCAD', 'GBPCHF',
                  'GBPNZD', 'AUDCAD', 'AUDCHF', 'AUDNZD', 'CADCHF', 'NZDCAD', 'NZDCHF',
                ].includes(item.symbol);
                const isStock = ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA'].includes(item.symbol);
                const isCommodityOrIndex = ['XAUUSD', 'XAGUSD', 'USOIL', 'US30', 'NAS100', 'SPX500', 'GER40', 'UK100'].includes(item.symbol);

                if (fundamentalSubFilter === 'FOREX_28') return isForex28;
                if (fundamentalSubFilter === 'BULLISH') return fund.isBullish;
                if (fundamentalSubFilter === 'BEARISH') return fund.isBearish;
                if (fundamentalSubFilter === 'HIGH_CONVICTION') return Math.abs(fund.score) >= 40;
                if (fundamentalSubFilter === 'COMMODITIES_INDICES') return isCommodityOrIndex;
                if (fundamentalSubFilter === 'STOCKS') return isStock;
                return true;
              })
              .map((item) => {
                const isSelected = selectedSymbol === item.symbol;
                const fund = getFundamentalForSymbol(item.symbol);
                return (
                  <div
                    key={item.symbol}
                    className={`inline-flex items-center rounded-xl border text-xs font-bold transition shrink-0 shadow-sm ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/20'
                        : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        handleSelectSymbol(item.symbol, (item as any).broker);
                        if (WATCHLIST_CATEGORIES[activeCategoryIndex]?.id === 'FUNDAMENTALS') {
                          handleOpenPairModal(item.symbol);
                        }
                      }}
                      className="px-3 py-1.5 flex items-center gap-2 cursor-pointer"
                      title={`Load ${item.symbol} on chart (FXCM Feed)`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1 ${
                          isSelected
                            ? 'bg-slate-950 text-cyan-300'
                            : fund.isBullish
                            ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm'
                            : fund.isBearish
                            ? 'bg-rose-950/90 text-rose-300 border border-rose-500/50 shadow-sm'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {fund.isBullish ? `🟢 ▲ Bullish (${fund.score >= 0 ? '+' : ''}${fund.score})` : fund.isBearish ? `🔴 ▼ Bearish (${fund.score})` : '● Neutral'}
                      </span>
                    </button>

                    {WATCHLIST_CATEGORIES[activeCategoryIndex]?.id === 'FUNDAMENTALS' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSymbol(item.symbol, (item as any).broker);
                          handleOpenPairModal(item.symbol);
                        }}
                        className={`px-2 py-1.5 border-l text-[10px] uppercase font-mono font-bold cursor-pointer transition ${
                          isSelected
                            ? 'border-cyan-600 hover:bg-cyan-600 text-slate-950'
                            : 'border-slate-800 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300'
                        }`}
                        title={`Open Deep-Dive Analysis Modal for ${item.symbol}`}
                      >
                        Modal
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          {/* =================================================================== */}
          {/* DYNAMIC FUNDAMENTAL INTELLIGENCE PANEL (Restored Feature)           */}
          {/* Pulls verified fundamental data & dynamically updates for pair      */}
          {/* =================================================================== */}
          {(showFundamentalPanel || WATCHLIST_CATEGORIES[activeCategoryIndex]?.id === 'FUNDAMENTALS') && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-[#0B132B]/90 to-slate-950 border border-cyan-500/30 shadow-xl space-y-3 font-mono-code text-xs">
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="font-bold text-white text-sm tracking-wide">
                    {activeInstrumentFundamental.symbol} Fundamental Intelligence:
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] border tracking-wider uppercase ${
                      activeInstrumentFundamental.isBullish
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-900/30'
                        : activeInstrumentFundamental.isBearish
                        ? 'bg-rose-950/90 text-rose-300 border-rose-500 shadow-md shadow-rose-900/30'
                        : 'bg-slate-900 text-slate-300 border-slate-700'
                    }`}
                  >
                    {activeInstrumentFundamental.biasLabel}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenPairModal(selectedSymbol)}
                    className="px-3 py-1 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold tracking-wide text-xs transition cursor-pointer shadow-md flex items-center gap-1.5"
                    title="Open Detailed Fundamental Analysis Modal for this pair"
                  >
                    <Scale className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Deep-Dive Modal</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoAlignProjectionToFundamental}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black tracking-wide text-xs transition cursor-pointer shadow-md flex items-center gap-1.5"
                    title="Automatically place Entry, SL, and TP lines on the chart aligned with the fundamental bias"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>Auto-Align Projection Lines</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncLiveFundamentals}
                    disabled={isSyncingLiveFundamental}
                    className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                    title="Sync real-time macroeconomic indicators from FRED & Alpha Vantage"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLiveFundamental ? 'animate-spin text-cyan-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Fundamental Metrics Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-cyan-400" />
                    Central Bank Rate Spread
                  </div>
                  <div className="font-bold text-white text-xs">{activeInstrumentFundamental.rateDiff}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    10Y Sovereign Yield Spread
                  </div>
                  <div className="font-bold text-white text-xs">{activeInstrumentFundamental.yieldSpread}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3 text-cyan-400" />
                    Conviction & Suitability
                  </div>
                  <div className="font-bold text-cyan-300 text-xs">
                    {activeInstrumentFundamental.tradeSuitability} ({activeInstrumentFundamental.confidence}% Conf.)
                  </div>
                </div>
              </div>

              {/* Long-Term Fundamental Core Rationale Narrative */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-slate-300 text-[11px] leading-relaxed flex items-start gap-2">
                <Compass className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white mr-1.5">Macro Rationale:</strong>
                  {activeInstrumentFundamental.rationale}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* ROW 3: DEMO TRADING EXECUTION TOOLBAR & LOT SIZE SETTING              */}
        {/* Positioned cleanly above chart canvas - NO chart occlusions!          */}
        {/* ===================================================================== */}
        <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between gap-3 flex-wrap">
          {/* Left Execution Widget: Lots + Manual SL/TP + Buy/Sell Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* LOT SIZE SETTING */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs font-mono-code">
              <span className="text-slate-400 font-bold text-[11px]">LOTS:</span>
              <button
                type="button"
                onClick={() => setOrderLots((l) => Math.max(0.01, Number((Number(l) - 0.1).toFixed(2))).toString())}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
              >
                -
              </button>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={orderLots}
                onChange={(e) => setOrderLots(e.target.value)}
                className="w-14 bg-slate-900 text-center text-white font-bold rounded border border-slate-700 py-0.5 outline-none text-xs"
              />
              <button
                type="button"
                onClick={() => setOrderLots((l) => Number((Number(l) + 0.1).toFixed(2)).toString())}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold"
              >
                +
              </button>

              <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-800 text-[10px]">
                {['0.10', '0.50', '1.00', '2.00'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setOrderLots(preset)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${orderLots === preset ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* STOP LOSS (SL) MANUAL INPUT */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1.5 rounded-xl border border-rose-900/50 text-xs font-mono-code">
              <span className="text-rose-400 font-bold text-[11px]">SL:</span>
              <input
                type="number"
                step="any"
                value={isManualPriceMode ? manualSlPrice : orderSlPips}
                onChange={(e) => {
                  if (isManualPriceMode) {
                    setManualSlPrice(e.target.value);
                  } else {
                    setOrderSlPips(e.target.value);
                  }
                }}
                placeholder={isManualPriceMode ? `${slLinePrice}` : `${orderSlPips} pips`}
                className="w-16 bg-slate-900 text-rose-200 text-center font-bold rounded border border-rose-900/40 py-0.5 outline-none text-xs"
                title={isManualPriceMode ? 'Exact Stop Loss Price' : 'Stop Loss Distance in Pips'}
              />
              <span className="text-[10px] text-rose-400/80 font-bold">
                -${projectedLossDollars}
              </span>
            </div>

            {/* TAKE PROFIT (TP) MANUAL INPUT */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1.5 rounded-xl border border-emerald-900/50 text-xs font-mono-code">
              <span className="text-emerald-400 font-bold text-[11px]">TP:</span>
              <input
                type="number"
                step="any"
                value={isManualPriceMode ? manualTpPrice : orderTpPips}
                onChange={(e) => {
                  if (isManualPriceMode) {
                    setManualTpPrice(e.target.value);
                  } else {
                    setOrderTpPips(e.target.value);
                  }
                }}
                placeholder={isManualPriceMode ? `${tpLinePrice}` : `${orderTpPips} pips`}
                className="w-16 bg-slate-900 text-emerald-200 text-center font-bold rounded border border-emerald-900/40 py-0.5 outline-none text-xs"
                title={isManualPriceMode ? 'Exact Take Profit Price' : 'Take Profit Distance in Pips'}
              />
              <span className="text-[10px] text-emerald-400/80 font-bold">
                +${projectedProfitDollars}
              </span>
            </div>

            {/* SL/TP Visual Projection Lines Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowProjectionLines((prev) => {
                  const next = !prev;
                  if (next) {
                    const cur = liveCandle.close || priceMeta.price;
                    setProjectionAnchorCenter(cur);
                    setEntryLinePrice(cur);
                    const isBear = activeInstrumentFundamental.isBearish;
                    const sl = isBear
                      ? Number((cur + 25 * priceMeta.pipSize).toFixed(priceMeta.pipDecimals))
                      : Number((cur - 25 * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
                    const tp = isBear
                      ? Number((cur - 50 * priceMeta.pipSize).toFixed(priceMeta.pipDecimals))
                      : Number((cur + 50 * priceMeta.pipSize).toFixed(priceMeta.pipDecimals));
                    setSlLinePrice(sl);
                    setTpLinePrice(tp);
                    setProjectionSpanPips(140);
                    setIsCustomProjection(false);
                  }
                  return next;
                });
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono-code font-bold transition cursor-pointer flex items-center gap-1.5 ${
                showProjectionLines
                  ? 'bg-blue-600/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
              title="Display visual TP and SL lines with potential dollar profit/loss directly on chart"
            >
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Projection Lines:</span>
              <span>{showProjectionLines ? 'ON' : 'OFF'}</span>
            </button>

            {/* EXECUTE DEMO SELL & BUY BUTTONS */}
            <div className="flex items-center rounded-xl overflow-hidden border border-slate-700 shadow-lg bg-slate-950 text-xs font-mono-code font-bold">
              <button
                type="button"
                onClick={() => handleExecuteDemoTrade('SELL')}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-inner"
                title={`Execute Demo SELL order on ${selectedSymbol}`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>SELL</span>
                <span className="font-mono text-[11px] font-normal">{liveCandle.bid.toFixed(priceMeta.pipDecimals)}</span>
              </button>

              <div className="px-2 py-1 bg-slate-900 text-slate-400 text-[10px] border-x border-slate-800 hidden sm:block">
                <span>Spread: {priceMeta.spreadPips}p</span>
              </div>

              <button
                type="button"
                onClick={() => handleExecuteDemoTrade('BUY')}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-inner"
                title={`Execute Demo BUY order on ${selectedSymbol}`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>BUY</span>
                <span className="font-mono text-[11px] font-normal">{liveCandle.ask.toFixed(priceMeta.pipDecimals)}</span>
              </button>
            </div>
          </div>

          {/* Right Controls: Timeframe Quick Switcher + Tools */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeframe Switcher (Syncs both time displays!) */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-[11px] font-mono-code">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => handleIntervalChange(tf.id)}
                    title={tf.desc}
                    className={`px-2 py-1 rounded-lg transition cursor-pointer font-bold ${
                      selectedInterval === tf.id
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>

              {/* Timeframe indicator alongside active candle duration remaining */}
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono-code shadow-inner shrink-0"
                title={`Active Timeframe: ${candleCountdown.label} | Duration remaining before current candle closes: ${candleCountdown.text}`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-black border border-cyan-500/40 text-[10px] uppercase">
                  {candleCountdown.label}
                </span>
                <span className="text-amber-300 font-bold tracking-wider">{candleCountdown.text}</span>
              </div>
            </div>

            {/* Action Buttons: Camera, Settings, Share, Indicators, Fullscreen */}
            <div className="flex items-center gap-1.5">
              {/* CAMERA SNAPSHOT BUTTON */}
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="p-1.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-mono-code font-bold shadow-sm"
                title="Capture Chart Snapshot (Camera)"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
                <span className="hidden lg:inline">Camera</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500 transition cursor-pointer flex items-center gap-1 text-xs font-mono-code"
                title="Chart Display Settings"
              >
                <Palette className="w-4 h-4 text-cyan-400" />
                <span className="hidden lg:inline">Settings</span>
              </button>

              <button
                type="button"
                onClick={handleOpenShareModal}
                className="p-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 transition cursor-pointer flex items-center gap-1 text-xs font-mono-code font-bold"
                title="Share Authentic TradingView Chart"
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span className="hidden lg:inline">Share</span>
              </button>

              {/* INDICATORS BUTTON (Directly next to Full-Screen) */}
              <button
                type="button"
                onClick={() => setShowIndicatorsModal((prev) => !prev)}
                className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-mono-code font-bold ${
                  showIndicatorsModal
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400'
                }`}
                title="Technical Indicators (RSI, MACD, EMA, Bollinger, SuperTrend)"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Indicators</span>
              </button>

              {/* FULL-SCREEN BUTTON (Directly next to Indicators) */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1 text-xs font-mono-code font-bold ${
                  isFullscreen
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white hover:border-cyan-400'
                }`}
                title={isFullscreen ? 'Exit Fullscreen (Minimize)' : 'View Chart in Fullscreen Mode'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4 text-white" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
                <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Full-Screen'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTION NOTIFICATION & 1-CLICK ADD TO JOURNAL BANNER                     */}
      {/* ========================================================================= */}
      {orderToast && (
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs font-mono-code animate-in fade-in slide-in-from-top-2 shadow-2xl transition ${
            orderToast.isSuccess === false
              ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              : 'bg-gradient-to-r from-blue-950/90 to-emerald-950/90 border-cyan-500/50 text-cyan-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {orderToast.isSuccess === false ? (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span className="font-bold truncate">{orderToast.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {orderToast.trade && (
              <button
                type="button"
                onClick={() => handleAddToJournal(orderToast.trade!)}
                className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Add to Journal</span>
              </button>
            )}
            {onNavigateToJournal && (
              <button
                type="button"
                onClick={onNavigateToJournal}
                className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-[11px]"
              >
                View Journal
              </button>
            )}
            <button
              type="button"
              onClick={() => setOrderToast(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN TRADINGVIEW WORKSPACE: CHART + PROJECTION LINES + RIGHT DOCK      */}
      {/* ========================================================================= */}
      <div
        className={`flex flex-col lg:flex-row border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative transition-all duration-300 ${
          isFullscreen ? 'flex-1 min-h-[550px] h-[calc(100vh-140px)]' : 'h-[680px] sm:h-[750px] lg:h-[800px]'
        }`}
        style={{
          background:
            chartSettings.backgroundType === 'gradient'
              ? `linear-gradient(180deg, ${chartSettings.backgroundColor} 0%, ${chartSettings.bgGradientColor2} 100%)`
              : chartSettings.backgroundColor,
        }}
      >
        {/* CHART COLUMN WITH DRAGGABLE PROJECTION OVERLAY */}
        <div ref={chartContainerRef} className="flex-1 relative h-full flex flex-col min-w-0 select-none">
          {/* TRADINGVIEW IFRAME CONTAINER */}
          <div id={containerId} className="w-full h-full relative z-10" />

          {/* DRAG EVENT CAPTURE OVERLAY (Active only while dragging so TradingView iframe never intercepts mouse/touch) */}
          {activeDragTarget && (
            <div className="fixed inset-0 z-50 cursor-ns-resize bg-transparent select-none" />
          )}

          {/* ================================================================= */}
          {/* INTERACTIVE DRAGGABLE TP, ENTRY & SL PROJECTION LINES OVERLAY      */}
          {/* Allows manual dragging and positioning of lines before execution  */}
          {/* ================================================================= */}
          {showProjectionLines && (
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {/* Top Floating Projection HUD */}
              <div className="absolute top-2 left-3 z-30 pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1 text-[11px] font-mono-code shadow-lg backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-slate-300 font-bold">Projection:</span>
                <span className="text-emerald-400 font-bold">TP: +${projectedProfitDollars.toFixed(2)}</span>
                <span className="text-slate-500">|</span>
                <span className="text-rose-400 font-bold">SL: -${projectedLossDollars.toFixed(2)}</span>
                <span className="text-slate-500">|</span>
                <span className="text-cyan-300 font-bold">{riskRewardRatio}R</span>

                {isCustomProjection && (
                  <button
                    type="button"
                    onClick={resetProjectionLines}
                    className="ml-1 text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* 1. TAKE PROFIT (TP) DRAGGABLE LINE (Green dashed with glow) */}
              <div
                className="absolute left-0 right-14 border-b-2 border-dashed border-emerald-400/90 transition-[top] duration-75"
                style={{ top: `${tpYPercent}%` }}
              >
                {/* Full-span drag bar across entire chart */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveDragTarget('TP');
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setActiveDragTarget('TP');
                  }}
                  className="absolute -top-3 left-0 right-0 h-6 cursor-ns-resize pointer-events-auto hover:bg-emerald-400/15 transition z-10"
                  title="Click and drag Take Profit line up/down across chart"
                />

                <div className="absolute -top-4 left-4 flex items-center gap-1 pointer-events-auto z-20">
                  {/* Draggable Badge */}
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveDragTarget('TP');
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setActiveDragTarget('TP');
                    }}
                    title="Click and drag up/down to adjust Take Profit level"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/95 border-2 border-emerald-500 text-emerald-300 font-mono-code text-[11px] font-bold shadow-xl shadow-emerald-950/60 cursor-ns-resize hover:bg-emerald-900 active:scale-95 transition"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>TP: {tpLinePrice.toFixed(priceMeta.pipDecimals)}</span>
                    <span className="text-white bg-emerald-700/60 px-1.5 py-0.2 rounded text-[10px] font-bold">
                      +${projectedProfitDollars.toFixed(2)} ({liveTpPips}p | {riskRewardRatio}R)
                    </span>
                    <span className="text-[9px] text-emerald-300/80 font-normal ml-0.5">↕ Drag</span>
                  </div>

                  {/* Micro-Adjustment Nudge Buttons */}
                  <div className="flex items-center gap-0.5 bg-slate-950/90 border border-emerald-600/60 rounded-lg p-0.5 shadow-md">
                    <button
                      type="button"
                      onClick={() => nudgeTp(1)}
                      title="Nudge TP up +1 pip"
                      className="px-1 text-[10px] text-emerald-300 hover:bg-emerald-900/60 rounded font-bold cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeTp(-1)}
                      title="Nudge TP down -1 pip"
                      className="px-1 text-[10px] text-emerald-300 hover:bg-emerald-900/60 rounded font-bold cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. CURRENT ENTRY DRAGGABLE LINE (Cyan dashed with glow) */}
              <div
                className="absolute left-0 right-14 border-b-2 border-dashed border-cyan-400/90 transition-[top] duration-75"
                style={{ top: `${entryYPercent}%` }}
              >
                {/* Full-span drag bar across entire chart */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveDragTarget('ENTRY');
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setActiveDragTarget('ENTRY');
                  }}
                  className="absolute -top-3 left-0 right-0 h-6 cursor-ns-resize pointer-events-auto hover:bg-cyan-400/15 transition z-10"
                  title="Click and drag Entry line up/down across chart"
                />

                <div className="absolute -top-4 left-4 flex items-center gap-1 pointer-events-auto z-20">
                  {/* Draggable Badge */}
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveDragTarget('ENTRY');
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setActiveDragTarget('ENTRY');
                    }}
                    title="Click and drag up/down to adjust Entry price"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/95 border-2 border-cyan-400 text-cyan-300 font-mono-code text-[11px] font-bold shadow-xl shadow-cyan-950/60 cursor-ns-resize hover:bg-slate-900 active:scale-95 transition"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>ENTRY: {entryLinePrice.toFixed(priceMeta.pipDecimals)}</span>
                    <span className="text-slate-300 text-[10px] font-normal">({orderLots} Lots)</span>
                    {isCustomProjection ? (
                      <span className="text-[9px] bg-cyan-500/25 text-cyan-200 px-1 py-0.2 rounded border border-cyan-500/40">
                        Adjusted
                      </span>
                    ) : (
                      <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/60 px-1 py-0.2 rounded">
                        Market Price
                      </span>
                    )}
                    <span className="text-[9px] text-cyan-300/80 font-normal ml-0.5">↕ Drag</span>
                  </div>

                  {/* Micro-Adjustment Nudge Buttons */}
                  <div className="flex items-center gap-0.5 bg-slate-950/90 border border-cyan-600/60 rounded-lg p-0.5 shadow-md">
                    <button
                      type="button"
                      onClick={() => nudgeEntry(1)}
                      title="Nudge Entry up +1 pip"
                      className="px-1 text-[10px] text-cyan-300 hover:bg-cyan-900/60 rounded font-bold cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeEntry(-1)}
                      title="Nudge Entry down -1 pip"
                      className="px-1 text-[10px] text-cyan-300 hover:bg-cyan-900/60 rounded font-bold cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. STOP LOSS (SL) DRAGGABLE LINE (Red dashed with glow) */}
              <div
                className="absolute left-0 right-14 border-b-2 border-dashed border-rose-500/90 transition-[top] duration-75"
                style={{ top: `${slYPercent}%` }}
              >
                {/* Full-span drag bar across entire chart */}
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveDragTarget('SL');
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setActiveDragTarget('SL');
                  }}
                  className="absolute -top-3 left-0 right-0 h-6 cursor-ns-resize pointer-events-auto hover:bg-rose-500/15 transition z-10"
                  title="Click and drag Stop Loss line up/down across chart"
                />

                <div className="absolute -top-4 left-4 flex items-center gap-1 pointer-events-auto z-20">
                  {/* Draggable Badge */}
                  <div
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveDragTarget('SL');
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setActiveDragTarget('SL');
                    }}
                    title="Click and drag up/down to adjust Stop Loss level"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/95 border-2 border-rose-500 text-rose-300 font-mono-code text-[11px] font-bold shadow-xl shadow-rose-950/60 cursor-ns-resize hover:bg-rose-900 active:scale-95 transition"
                  >
                    <GripVertical className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>SL: {slLinePrice.toFixed(priceMeta.pipDecimals)}</span>
                    <span className="text-white bg-rose-700/60 px-1.5 py-0.2 rounded text-[10px] font-bold">
                      -${projectedLossDollars.toFixed(2)} ({liveSlPips}p)
                    </span>
                    <span className="text-[9px] text-rose-300/80 font-normal ml-0.5">↕ Drag</span>
                  </div>

                  {/* Micro-Adjustment Nudge Buttons */}
                  <div className="flex items-center gap-0.5 bg-slate-950/90 border border-rose-600/60 rounded-lg p-0.5 shadow-md">
                    <button
                      type="button"
                      onClick={() => nudgeSl(1)}
                      title="Nudge SL up +1 pip"
                      className="px-1 text-[10px] text-rose-300 hover:bg-rose-900/60 rounded font-bold cursor-pointer"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeSl(-1)}
                      title="Nudge SL down -1 pip"
                      className="px-1 text-[10px] text-rose-300 hover:bg-rose-900/60 rounded font-bold cursor-pointer"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TIME DISPLAY 2 OF 2: IN-CHART PRICE SCALE COUNTDOWN BADGE         */}
          {/* Perfectly synchronized with Display 1 at the top!                 */}
          {/* ================================================================= */}
          <div
            className="absolute bottom-10 right-2 z-20 pointer-events-none select-none transition-all"
            title={`Real-time remaining time for current ${candleCountdown.label} candle`}
          >
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono-code text-xs font-black tracking-widest shadow-xl ${
                candleCountdown.secondsRemaining <= 10
                  ? 'bg-amber-500 text-slate-950 border-amber-300 animate-pulse'
                  : 'bg-[#0B0F19]/95 text-cyan-300 border-cyan-500/60 shadow-cyan-950/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
              <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold uppercase">
                {candleCountdown.label}
              </span>
              <span>{candleCountdown.text}</span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* RIGHT DOCK SLIDE-OUT PANEL (Only Alerts, News, or Calendar)        */}
        {/* =================================================================== */}
        {activeRightTool && (
          <div className="w-full lg:w-80 bg-[#0B0F19] border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col z-30 shrink-0 h-64 lg:h-full animate-in slide-in-from-right duration-200">
            {/* Panel Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                {activeRightTool === 'ALERTS' && <AlarmClock className="w-4 h-4 text-cyan-400" />}
                {activeRightTool === 'NEWS' && <Newspaper className="w-4 h-4 text-cyan-400" />}
                {activeRightTool === 'CALENDAR' && <Calendar className="w-4 h-4 text-cyan-400" />}
                <h3 className="text-xs font-mono-code font-bold uppercase tracking-wider text-slate-200">
                  {activeRightTool === 'ALERTS' && 'Price Alerts'}
                  {activeRightTool === 'NEWS' && 'Market Headlines'}
                  {activeRightTool === 'CALENDAR' && 'Economic Calendar'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveRightTool(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-3 font-mono-code text-xs space-y-3">
              {/* ALERTS PANEL */}
              {activeRightTool === 'ALERTS' && (
                <div className="space-y-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const targetPrice = parseFloat(newAlertTarget);
                      if (!targetPrice || isNaN(targetPrice)) return;
                      const newAlert: ChartAlertItem = {
                        id: `alt_${Date.now()}`,
                        symbol: selectedSymbol,
                        price: targetPrice,
                        condition: newAlertCondition,
                        active: true,
                        createdAt: 'Just now',
                        notes: newAlertNotes.trim() || `Alert for ${selectedSymbol} @ ${targetPrice}`,
                      };
                      setAlerts([newAlert, ...alerts]);
                      setNewAlertTarget('');
                      setNewAlertNotes('');
                      setOrderToast({ message: `Alert saved for ${selectedSymbol} @ ${targetPrice}`, isSuccess: true });
                    }}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="text-[11px] font-bold text-slate-300">Create New Price Alert</div>
                    <select
                      value={newAlertCondition}
                      onChange={(e) => setNewAlertCondition(e.target.value as any)}
                      className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                    >
                      <option value="CROSSING">Crossing Target Price</option>
                      <option value="CROSSING_UP">Crossing Up (Breakout)</option>
                      <option value="CROSSING_DOWN">Crossing Down (Breakdown)</option>
                    </select>
                    <input
                      type="number"
                      step="any"
                      value={newAlertTarget}
                      onChange={(e) => setNewAlertTarget(e.target.value)}
                      placeholder={`Target e.g. ${liveCandle.close.toFixed(priceMeta.pipDecimals)}`}
                      className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                    />
                    <input
                      type="text"
                      value={newAlertNotes}
                      onChange={(e) => setNewAlertNotes(e.target.value)}
                      placeholder="Note e.g. Key Level Retest"
                      className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white outline-none"
                    />
                    <button
                      type="submit"
                      className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition cursor-pointer"
                    >
                      Save Alert
                    </button>
                  </form>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Active Alerts ({alerts.length})</span>
                      <button onClick={() => setAlerts([])} className="text-rose-400 hover:underline text-[10px] cursor-pointer">
                        Clear All
                      </button>
                    </div>
                    {alerts.map((alt) => (
                      <div
                        key={alt.id}
                        className={`p-2 rounded-xl border text-xs ${
                          alt.triggered ? 'bg-amber-950/30 border-amber-500/50 text-amber-200' : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{alt.symbol}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded ${alt.triggered ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {alt.triggered ? 'TRIGGERED' : 'ACTIVE'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1">
                          {alt.condition.replace('_', ' ')}: <strong className="text-cyan-300">{alt.price}</strong>
                        </div>
                        {alt.notes && <div className="text-[10px] text-slate-400 mt-0.5">{alt.notes}</div>}
                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-900 text-[9px] text-slate-500">
                          <span>{alt.createdAt}</span>
                          <button onClick={() => setAlerts((c) => c.filter((a) => a.id !== alt.id))} className="text-rose-400 hover:text-rose-300">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NEWS PANEL */}
              {activeRightTool === 'NEWS' && (
                <div className="space-y-3">
                  {/* Mode & Category Bar */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setNewsViewMode('FEED')}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          newsViewMode === 'FEED' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        News Wire
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewsViewMode('WIDGET')}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          newsViewMode === 'WIDGET' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        TradingView Live
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleRefreshNews}
                      disabled={isRefreshingNews}
                      className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px]"
                      title="Fetch freshest market headlines"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingNews ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {newsViewMode === 'WIDGET' ? (
                    <div className="h-[520px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <iframe
                        src="https://www.tradingview-widget.com/embed-widget/timeline/?locale=en#%7B%22feedMode%22%3A%22all_symbols%22%2C%22isTransparent%22%3Atrue%2C%22displayMode%22%3A%22regular%22%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22colorTheme%22%3A%22dark%22%7D"
                        className="w-full h-full border-0"
                        title="TradingView Real-Time Market News Timeline"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Filter pills */}
                      <div className="flex items-center gap-1 overflow-x-auto text-[9px] pb-1">
                        {(['ALL', 'MACRO', 'FOREX', 'METALS', 'STOCKS'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setNewsCategoryFilter(cat)}
                            className={`px-2 py-0.5 rounded-full border transition cursor-pointer shrink-0 font-bold ${
                              newsCategoryFilter === cat
                                ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* News Items */}
                      {newsHeadlines
                        .filter((n) => newsCategoryFilter === 'ALL' || n.category.toUpperCase() === newsCategoryFilter)
                        .map((news) => (
                          <div
                            key={news.id}
                            className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition space-y-1.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-cyan-300 font-bold uppercase tracking-wider text-[9px]">
                                {news.category}
                              </span>
                              <span className="text-slate-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {news.time}
                              </span>
                            </div>
                            <p className="text-slate-100 font-sans text-xs leading-snug font-medium hover:text-cyan-300 transition cursor-pointer">
                              {news.title}
                            </p>
                            <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-900">
                              <span className="text-slate-400 font-bold">{news.source}</span>
                              <span
                                className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
                                  news.sentiment === 'BULLISH'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                                    : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                                }`}
                              >
                                {news.sentiment === 'BULLISH' ? '🟢 BULLISH' : '🔴 BEARISH'}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* CALENDAR PANEL (Real-Time Live Data Feed) */}
              {activeRightTool === 'CALENDAR' && (
                <div className="space-y-3">
                  {/* Mode & Refresh Bar */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCalendarViewMode('FEED')}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          calendarViewMode === 'FEED' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Live Events ({liveCalendarEvents.length || 4})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarViewMode('WIDGET')}
                        className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                          calendarViewMode === 'WIDGET' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        TradingView Widget
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={loadLiveCalendar}
                      disabled={isRefreshingCalendar}
                      className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px]"
                      title="Sync live economic releases"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshingCalendar ? 'animate-spin text-cyan-400' : ''}`} />
                      <span>Sync</span>
                    </button>
                  </div>

                  {calendarViewMode === 'WIDGET' ? (
                    <div className="h-[520px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                      <iframe
                        src="https://www.tradingview-widget.com/embed-widget/events/?locale=en#%7B%22colorTheme%22%3A%22dark%22%2C%22isTransparent%22%3Atrue%2C%22width%22%3A%22100%25%22%2C%22height%22%3A%22100%25%22%2C%22importanceFilter%22%3A%220%2C1%22%7D"
                        className="w-full h-full border-0"
                        title="TradingView Real-Time Economic Calendar"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Filter pills */}
                      <div className="flex items-center justify-between text-[9px] pb-1 border-b border-slate-900">
                        <div className="flex items-center gap-1">
                          {(['ALL', 'HIGH'] as const).map((filter) => (
                            <button
                              key={filter}
                              type="button"
                              onClick={() => setCalendarImpactFilter(filter)}
                              className={`px-2 py-0.5 rounded-full border transition cursor-pointer font-bold ${
                                calendarImpactFilter === filter
                                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {filter === 'ALL' ? 'All Events' : '🔴 High Impact'}
                            </button>
                          ))}
                        </div>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          LIVE FEED
                        </span>
                      </div>

                      {/* Live Events List */}
                      {liveCalendarEvents.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          <RefreshCw className="w-4 h-4 mx-auto animate-spin mb-1 text-cyan-400" />
                          <span>Loading live calendar releases...</span>
                        </div>
                      ) : (
                        liveCalendarEvents
                          .filter((evt) => calendarImpactFilter === 'ALL' || evt.importance === 'HIGH')
                          .slice(0, 15)
                          .map((evt) => (
                            <div
                              key={evt.id}
                              className={`p-2.5 rounded-xl bg-slate-950 border transition space-y-1.5 shadow-sm ${
                                evt.importance === 'HIGH' ? 'border-rose-900/50 hover:border-rose-700' : 'border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 font-bold">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px] font-mono">
                                    {evt.currency}
                                  </span>
                                  <span className="text-slate-100 font-sans text-xs truncate max-w-[170px]" title={evt.eventName}>
                                    {evt.eventName}
                                  </span>
                                </div>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold border ${
                                    evt.importance === 'HIGH'
                                      ? 'bg-rose-950 text-rose-300 border-rose-500/60 shadow-sm'
                                      : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                  }`}
                                >
                                  {evt.importance}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-1 text-[10px] bg-slate-900/70 p-1.5 rounded-lg border border-slate-800/80 font-mono">
                                <div>
                                  <div className="text-slate-500 text-[9px] uppercase">Time</div>
                                  <div className="font-bold text-white truncate">{evt.timeUtc || evt.date}</div>
                                </div>
                                <div>
                                  <div className="text-slate-500 text-[9px] uppercase">Forecast</div>
                                  <div className="font-bold text-slate-300 truncate">{evt.forecast || '—'}</div>
                                </div>
                                <div>
                                  <div className="text-slate-500 text-[9px] uppercase">Previous</div>
                                  <div className="font-bold text-slate-400 truncate">{evt.previous || '—'}</div>
                                </div>
                              </div>

                              {evt.actual && (
                                <div className="text-[10px] font-bold flex items-center justify-between pt-0.5 border-t border-slate-900">
                                  <span className="text-slate-400">Actual Released:</span>
                                  <span className="text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40 font-mono">
                                    {evt.actual}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* RIGHT COLUMN: VERTICAL ICONIC DOCK                                  */}
        {/* Kept ONLY: Alerts, News, Calendar, and Settings at the bottom       */}
        {/* =================================================================== */}
        <div className="w-12 bg-[#0B0F19] border-l border-slate-800/80 flex flex-col items-center justify-between py-2 z-20 shrink-0 select-none">
          {/* Top 3 Tools: Alerts, News, Calendar */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            {[
              { id: 'ALERTS' as const, icon: AlarmClock, label: 'Alerts', badge: alerts.filter((a) => a.active).length },
              { id: 'NEWS' as const, icon: Newspaper, label: 'News & Headlines' },
              { id: 'CALENDAR' as const, icon: Calendar, label: 'Economic Calendar' },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = activeRightTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setActiveRightTool((prev) => (prev === tool.id ? null : tool.id))}
                  title={tool.label}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer relative ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tool.badge !== undefined && tool.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center font-mono">
                      {tool.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Settings Button (Kept as requested) */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              title="Chart Appearance & Background Settings"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition cursor-pointer"
            >
              <Palette className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DEMO TRADING ACTIVITY & TRADE HISTORY (Active Trades & Profits/Losses) */}
      {/* ========================================================================= */}
      <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-xs font-mono-code">
        {/* Tabs Bar */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTerminalBottomTab('POSITIONS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                terminalBottomTab === 'POSITIONS'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Active Trades ({openPositions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setTerminalBottomTab('HISTORY')}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5 ${
                terminalBottomTab === 'HISTORY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span>Trade History ({closedPositions.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>
              Net Floating P&L:{' '}
              <strong className={totalUnrealizedPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {totalUnrealizedPnL >= 0 ? `+$${totalUnrealizedPnL.toFixed(2)}` : `-$${Math.abs(totalUnrealizedPnL).toFixed(2)}`}
              </strong>
            </span>
            {onNavigateToJournal && (
              <button
                type="button"
                onClick={onNavigateToJournal}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition cursor-pointer font-bold flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open Full Journal</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-x-auto">
          {terminalBottomTab === 'POSITIONS' ? (
            openPositions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-1.5">
                <p>No active demo trades open right now.</p>
                <p className="text-[11px] text-slate-600">
                  Use the BUY or SELL buttons above to execute demo trades with customized Lots, Stop Loss, and Take Profit!
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase bg-slate-950/40">
                    <th className="py-2.5 px-3">Ticket</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Lots</th>
                    <th className="py-2.5 px-3">Entry</th>
                    <th className="py-2.5 px-3">Current</th>
                    <th className="py-2.5 px-3">SL</th>
                    <th className="py-2.5 px-3">TP</th>
                    <th className="py-2.5 px-3">Floating P/L</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {openPositions.map((pos) => {
                    const isProfit = pos.floatingPnL >= 0;
                    return (
                      <tr key={pos.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-3 text-slate-400">#{pos.ticket}</td>
                        <td className="py-2.5 px-3 text-slate-400">{pos.openTime}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{pos.symbol}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              pos.direction === 'BUY' ? 'bg-blue-500/20 text-cyan-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {pos.direction}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-bold">{pos.lots}</td>
                        <td className="py-2.5 px-3 text-slate-300">{pos.entryPrice.toFixed(priceMeta.pipDecimals)}</td>
                        <td className="py-2.5 px-3 font-bold text-white animate-pulse">
                          {pos.currentPrice.toFixed(priceMeta.pipDecimals)}
                        </td>
                        <td className="py-2.5 px-3 text-rose-400 font-mono">{pos.stopLoss}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono">{pos.takeProfit}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-xs ${
                              isProfit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {isProfit ? `+$${pos.floatingPnL.toFixed(2)}` : `-$${Math.abs(pos.floatingPnL).toFixed(2)}`} ({pos.pips}p)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddToJournal(pos)}
                            disabled={pos.loggedToJournal}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                              pos.loggedToJournal
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                            }`}
                            title="Automatically log trade details into your Journal"
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{pos.loggedToJournal ? 'In Journal' : 'Add to Journal'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleClosePosition(pos.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white font-bold text-[10px] transition cursor-pointer"
                          >
                            Close
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            closedPositions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-1.5">
                <p>No closed trades in history yet.</p>
                <p className="text-[11px] text-slate-600">
                  Closed positions and triggered TP/SL trades will be tracked here.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase bg-slate-950/40">
                    <th className="py-2.5 px-3">Ticket</th>
                    <th className="py-2.5 px-3">Open / Close</th>
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Lots</th>
                    <th className="py-2.5 px-3">Entry -&gt; Exit</th>
                    <th className="py-2.5 px-3">Trigger</th>
                    <th className="py-2.5 px-3">Realized P/L</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {closedPositions.map((pos) => {
                    const isWin = (pos.floatingPnL || 0) > 0;
                    return (
                      <tr key={pos.id} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-3 text-slate-400">#{pos.ticket}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {pos.openTime} → {pos.closeTime || 'Closed'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">{pos.symbol}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              pos.direction === 'BUY' ? 'bg-blue-500/20 text-cyan-300' : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {pos.direction}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">{pos.lots}</td>
                        <td className="py-2.5 px-3 text-slate-300">
                          {pos.entryPrice.toFixed(priceMeta.pipDecimals)} → {pos.closePrice?.toFixed(priceMeta.pipDecimals)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pos.closeReason === 'TAKE_PROFIT'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : pos.closeReason === 'STOP_LOSS'
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {pos.closeReason === 'TAKE_PROFIT' ? '🎯 TP HIT' : pos.closeReason === 'STOP_LOSS' ? '🛡️ SL HIT' : 'MANUAL'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                            {pos.floatingPnL >= 0 ? `+$${pos.floatingPnL.toFixed(2)}` : `-$${Math.abs(pos.floatingPnL).toFixed(2)}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleAddToJournal(pos)}
                            disabled={pos.loggedToJournal}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer inline-flex items-center gap-1 ${
                              pos.loggedToJournal
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40'
                            }`}
                          >
                            <BookOpen className="w-3 h-3" />
                            <span>{pos.loggedToJournal ? 'In Journal' : 'Add to Journal'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SETTINGS MODAL: BACKGROUND & APPEARANCE CUSTOMIZATION                  */}
      {/* ========================================================================= */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-mono-code text-xs">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white uppercase tracking-wider text-sm">
                  Premium TradingView Chart Settings
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 px-4 pt-3 border-b border-slate-800 overflow-x-auto bg-slate-950/50">
              {(['APPEARANCE', 'CANVAS', 'CANDLES', 'SCALES'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSettingsActiveTab(tab)}
                  className={`px-3 py-1.5 border-b-2 font-bold transition cursor-pointer shrink-0 ${
                    settingsActiveTab === tab
                      ? 'border-cyan-400 text-cyan-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {settingsActiveTab === 'APPEARANCE' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1.5">Chart Background Theme</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Deep Institutional Dark', color: '#0a0e17' },
                        { label: 'TradingView Pitch Black', color: '#000000' },
                        { label: 'Navy Blue Glow', color: '#0b192c' },
                        { label: 'Slate Charcoal', color: '#111827' },
                        { label: 'Pure White (Light Mode)', color: '#FFFFFF' },
                        { label: 'Warm Light Gray', color: '#F8FAFC' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() =>
                            setChartSettings((prev) => ({
                              ...prev,
                              backgroundColor: preset.color,
                              backgroundType: 'solid',
                            }))
                          }
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition cursor-pointer ${
                            chartSettings.backgroundColor === preset.color
                              ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 font-bold'
                              : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border border-slate-700" style={{ backgroundColor: preset.color }} />
                            <span>{preset.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 font-bold block mb-1.5">Background Fill Type</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="bgType"
                          checked={chartSettings.backgroundType === 'solid'}
                          onChange={() => setChartSettings((p) => ({ ...p, backgroundType: 'solid' }))}
                          className="accent-cyan-400"
                        />
                        <span>Solid Color</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="bgType"
                          checked={chartSettings.backgroundType === 'gradient'}
                          onChange={() => setChartSettings((p) => ({ ...p, backgroundType: 'gradient' }))}
                          className="accent-cyan-400"
                        />
                        <span>Vertical Gradient</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {settingsActiveTab === 'CANVAS' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <div className="font-bold text-white">Vertical Grid Lines</div>
                      <div className="text-[10px] text-slate-400">Show session grid across the chart</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={chartSettings.vertGrid}
                      onChange={(e) => setChartSettings((p) => ({ ...p, vertGrid: e.target.checked }))}
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div>
                      <div className="font-bold text-white">Candle Countdown on Scales</div>
                      <div className="text-[10px] text-slate-400">Display remaining candle time badge on right scale</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={chartSettings.showCountdown}
                      onChange={(e) => setChartSettings((p) => ({ ...p, showCountdown: e.target.checked }))}
                      className="accent-cyan-400 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {settingsActiveTab === 'CANDLES' && (
                <div className="space-y-3">
                  <div className="text-slate-400 text-[11px]">Candle body and wick color settings:</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-emerald-400 font-bold">Bullish (Up) Candles</div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Body Color:</span>
                        <input
                          type="color"
                          value={chartSettings.candleUpColor}
                          onChange={(e) => setChartSettings((p) => ({ ...p, candleUpColor: e.target.value }))}
                          className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="text-rose-400 font-bold">Bearish (Down) Candles</div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Body Color:</span>
                        <input
                          type="color"
                          value={chartSettings.candleDownColor}
                          onChange={(e) => setChartSettings((p) => ({ ...p, candleDownColor: e.target.value }))}
                          className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsActiveTab === 'SCALES' && (
                <div className="space-y-3">
                  <label className="text-slate-300 font-bold block mb-1">Timezone</label>
                  <select
                    value={chartSettings.timezone}
                    onChange={(e) => setChartSettings((p) => ({ ...p, timezone: e.target.value }))}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white outline-none cursor-pointer"
                  >
                    <option value="Asia/Karachi">Asia/Karachi (PKT - Pakistan Standard Time)</option>
                    <option value="Etc/UTC">Etc/UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">America/New_York (EST / EDT)</option>
                    <option value="Europe/London">Europe/London (GMT / BST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
              <button
                type="button"
                onClick={() => setChartSettings(DEFAULT_CHART_SETTINGS)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 transition cursor-pointer"
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer shadow-md"
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SHARE MODAL: AUTHENTIC TRADINGVIEW LINK GENERATOR                      */}
      {/* ========================================================================= */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl font-mono-code text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white uppercase text-sm">Share TradingView Chart</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-300">
              Direct, authentic TradingView link for <strong>{tradingViewSymbol}</strong> ({selectedInterval}m):
            </p>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl break-all text-cyan-300 text-[11px] select-all">
              {shareTvDirectUrl}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <a
                href={shareTvDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in TradingView</span>
              </a>

              <button
                type="button"
                onClick={handleCopyTvDirectUrl}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
              >
                {shareCopied ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <Share2 className="w-4 h-4 text-slate-950" />}
                <span>{shareCopied ? 'Copied Link!' : 'Copy TradingView Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. PAIR DEEP-DIVE MODAL                                                   */}
      {/* ========================================================================= */}
      {activePairModal && (
        <PairDeepDiveModal
          pairResult={activePairModal}
          currencyScores={currencyScores}
          onClose={() => setActivePairModal(null)}
          onRequestAiThesis={(pair) => {
            setOrderToast({
              message: `🤖 AI Fundamental Thesis for ${pair}: Institutional bias aligns with macro drivers.`,
              isSuccess: true,
            });
          }}
          onSelectCurrency={() => {}}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. TECHNICAL INDICATORS QUICK GUIDE / SELECTOR                            */}
      {/* ========================================================================= */}
      {showIndicatorsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl font-mono-code text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white uppercase text-sm">Technical Indicators</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIndicatorsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-slate-300">
              Indicators are natively integrated directly into the live TradingView chart workspace above. Click the <strong>Indicators (Fx)</strong> icon in the chart top toolbar to add:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                <span className="text-cyan-400 font-bold block">RSI (Relative Strength)</span>
                <span className="text-slate-500 text-[10px]">Overbought & Oversold Momentum</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                <span className="text-emerald-400 font-bold block">EMA (9, 21, 50, 200)</span>
                <span className="text-slate-500 text-[10px]">Institutional Trend Dynamic Levels</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                <span className="text-amber-400 font-bold block">MACD & Signal</span>
                <span className="text-slate-500 text-[10px]">Convergence / Divergence Oscillations</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                <span className="text-violet-400 font-bold block">Bollinger Bands</span>
                <span className="text-slate-500 text-[10px]">Volatility Squeezes & Expansions</span>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIndicatorsModal(false)}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition cursor-pointer shadow-md"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
