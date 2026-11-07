/**
 * PRIME PIP — FUNDAMENTAL ANALYSIS ENGINE: SHARED TYPES
 *
 * Every number shown in the Fundamental Analysis tab comes from a public, free,
 * primary or institutional source. Nothing here is ever synthesized: when a
 * source is unavailable the indicator is marked `missing` and is excluded from
 * the score (and the confidence figure drops accordingly).
 */

export type AssetClass = 'FOREX' | 'COMMODITIES' | 'INDICES' | 'STOCKS' | 'CRYPTO';

export type Bias =
  | 'STRONG_BULLISH'
  | 'BULLISH'
  | 'MILD_BULLISH'
  | 'NEUTRAL'
  | 'MILD_BEARISH'
  | 'BEARISH'
  | 'STRONG_BEARISH';

export type DataStatus = 'live' | 'stale' | 'missing';

/** One raw observation taken directly from a source (calendar print, FRED value, etc). */
export interface Observation {
  actual: number;
  forecast: number | null;
  previous: number | null;
  /** ISO timestamp of the release (or observation date for market series). */
  releasedAt: string;
  /** Reference period, e.g. "Oct", "Q3", "2026-10-31". */
  period?: string;
  unit?: string;
  /** Exact source title as published (e.g. TradingView calendar event title). */
  sourceTitle?: string;
  sourceName: string;
  sourceUrl: string;
  /** Extra context values (e.g. 1M change, COT index) for explanation text. */
  extra?: Record<string, number | string | null>;
}

export interface ScoreComponent {
  key: 'surprise' | 'momentum' | 'level' | 'trend' | 'positioning' | 'differential';
  label: string;
  /** Normalized contribution in -1..+1 BEFORE polarity is applied. */
  value: number;
  weight: number;
  detail: string;
}

export interface IndicatorResult {
  id: string;
  name: string;
  description: string;
  frequency: string;
  /** Weight inside its pillar (relative). */
  weight: number;
  /** Effective weight after freshness decay (0 when missing). */
  effectiveWeight: number;
  /** -100 (max bearish for this asset) .. +100 (max bullish). null when missing. */
  score: number | null;
  status: DataStatus;
  observation: Observation | null;
  components: ScoreComponent[];
  /** Plain-English reasoning for this sub-score. */
  reasoning: string;
  /** How a higher reading affects the asset, e.g. "Higher = bullish (hawkish)". */
  polarityNote: string;
}

export interface PillarResult {
  id: string;
  name: string;
  description: string;
  weight: number;
  score: number | null;
  bullishPct: number | null;
  coverage: number; // 0..1 share of indicator weight with live data
  indicators: IndicatorResult[];
  reasoning: string;
}

export interface AssetResult {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  score: number | null;
  bullishPct: number | null;
  bearishPct: number | null;
  bias: Bias;
  confidence: number; // 0..100 — weighted data coverage x freshness
  pillars: PillarResult[];
  summary: string;
  topDrivers: Array<{ name: string; pillar: string; impact: number }>;
  updatedAt: string;
  meta?: Record<string, string | number | null>;
}

export interface PairResult {
  symbol: string; // e.g. XAUUSD
  display: string; // e.g. XAU/USD
  base: string;
  quote: string;
  assetClass: AssetClass;
  score: number | null;
  bullishPct: number | null;
  bias: Bias;
  confidence: number;
  baseScore: number | null;
  quoteScore: number | null;
  retailSentiment?: { longPct: number; shortPct: number; source: string; contrarianScore: number } | null;
  correlationToUsd?: number | null;
  explanation: string;
}

export interface ReleaseEvent {
  id: string;
  asset: string;
  indicatorId: string;
  indicatorName: string;
  sourceTitle: string;
  actual: number;
  forecast: number | null;
  previous: number | null;
  unit?: string;
  releasedAt: string;
  detectedAt: string;
  indicatorScore: number | null;
  assetScoreBefore: number | null;
  assetScoreAfter: number | null;
  verdict: string;
  /** Every asset this single print moved (e.g. NFP → USD, US500, US100, US30). */
  impacts: Array<{ asset: string; indicatorScore: number | null; assetScoreBefore: number | null; assetScoreAfter: number | null }>;
}

export interface CorrelationMatrix {
  window: number;
  symbols: string[];
  labels: string[];
  matrix: Array<Array<number | null>>;
  asOf: string | null;
  source: string;
}

export interface SourceHealth {
  id: string;
  name: string;
  url: string;
  status: 'ok' | 'degraded' | 'down' | 'not_configured';
  lastSuccess: string | null;
  lastAttempt: string | null;
  lastError: string | null;
  itemCount: number;
  note?: string;
}

export interface MacroSnapshot {
  generatedAt: string;
  assets: AssetResult[];
  pairs: PairResult[];
  correlations: { w30: CorrelationMatrix | null; w90: CorrelationMatrix | null };
  releases: ReleaseEvent[];
  upcoming: Array<{ asset: string; title: string; scheduledAt: string; forecast: number | null; previous: number | null; importance: string }>;
  sources: SourceHealth[];
  methodologyVersion: string;
}
