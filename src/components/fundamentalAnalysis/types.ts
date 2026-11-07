// Client mirror of server/macro/types.ts
export type AssetClass = 'FOREX' | 'COMMODITIES' | 'INDICES' | 'STOCKS' | 'CRYPTO';
export type Bias = 'STRONG_BULLISH' | 'BULLISH' | 'MILD_BULLISH' | 'NEUTRAL' | 'MILD_BEARISH' | 'BEARISH' | 'STRONG_BEARISH';

export interface Observation {
  actual: number;
  forecast: number | null;
  previous: number | null;
  releasedAt: string;
  period?: string;
  unit?: string;
  sourceTitle?: string;
  sourceName: string;
  sourceUrl: string;
  extra?: Record<string, number | string | null>;
}

export interface ScoreComponent { key: string; label: string; value: number; weight: number; detail: string }

export interface IndicatorResult {
  id: string; name: string; description: string; frequency: string; weight: number; effectiveWeight: number;
  score: number | null; status: 'live' | 'stale' | 'missing'; observation: Observation | null;
  components: ScoreComponent[]; reasoning: string; polarityNote: string;
}

export interface PillarResult {
  id: string; name: string; description?: string; weight: number; score: number | null; bullishPct: number | null;
  coverage: number; indicators?: IndicatorResult[]; reasoning?: string;
}

export interface AssetResult {
  symbol: string; name: string; assetClass: AssetClass; score: number | null; bullishPct: number | null; bearishPct: number | null;
  bias: Bias; confidence: number; pillars: PillarResult[]; summary: string;
  topDrivers: Array<{ name: string; pillar: string; impact: number }>; updatedAt: string; meta?: Record<string, string | number | null>;
}

export interface PairResult {
  symbol: string; display: string; base: string; quote: string; assetClass: AssetClass; score: number | null; bullishPct: number | null;
  bias: Bias; confidence: number; baseScore: number | null; quoteScore: number | null;
  retailSentiment?: { longPct: number; shortPct: number; source: string; contrarianScore: number } | null;
  correlationToUsd?: number | null; explanation: string;
}

export interface ReleaseEvent {
  id: string; asset: string; indicatorId: string; indicatorName: string; sourceTitle: string; actual: number; forecast: number | null;
  previous: number | null; unit?: string; releasedAt: string; detectedAt: string; indicatorScore: number | null;
  assetScoreBefore: number | null; assetScoreAfter: number | null; verdict: string;
  impacts: Array<{ asset: string; indicatorScore: number | null; assetScoreBefore: number | null; assetScoreAfter: number | null }>;
}

export interface CorrelationMatrix { window: number; symbols: string[]; labels: string[]; matrix: Array<Array<number | null>>; asOf: string | null; source: string }

export interface SourceHealth {
  id: string; name: string; url: string; status: 'ok' | 'degraded' | 'down' | 'not_configured';
  lastSuccess: string | null; lastAttempt: string | null; lastError: string | null; itemCount: number; note?: string;
}

export interface Overview {
  generatedAt: string;
  assets: AssetResult[];
  pairs: PairResult[];
  correlations: { w30: CorrelationMatrix | null; w90: CorrelationMatrix | null };
  releases: ReleaseEvent[];
  upcoming: Array<{ asset: string; title: string; scheduledAt: string; forecast: number | null; previous: number | null; importance: string }>;
  sources: SourceHealth[];
  methodologyVersion: string;
  warming?: boolean;
}
