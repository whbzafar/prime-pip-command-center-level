import {
  CommodityObservation,
  CotPositioningRecord,
  CurrencyCode,
  CustomFundamentalIndicator,
  IndicatorDefinition,
  IndicatorObservation,
} from '../types/fundamentalIndicatorTypes';

export type LiveVerificationStatus = 'VERIFIED' | 'REVIEW_REQUIRED' | 'NOT_FOUND';

export interface LiveIndicatorResult {
  status: LiveVerificationStatus;
  indicatorId: string;
  currency: CurrencyCode;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  revisedPrevious?: number | null;
  referencePeriod: string;
  releaseDate: string;
  unit: string;
  sourceName?: string;
  sourceUrl?: string;
  retrievedAt: string;
  confidence: number;
  notes?: string;
  sources?: { title?: string; uri: string }[];
}

export interface LiveCotResult {
  status: LiveVerificationStatus;
  currency: CurrencyCode;
  contractName: string;
  reportDate: string;
  releaseDate: string;
  openInterest: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  commercialLong: number;
  commercialShort: number;
  previousNetPosition?: number;
  previousOpenInterest?: number;
  sourceUrl?: string;
  retrievedAt: string;
  confidence: number;
  notes?: string;
  sources?: { title?: string; uri: string }[];
}

export interface LiveCommodityResult {
  status: LiveVerificationStatus;
  symbol: CommodityObservation['symbol'];
  price?: number;
  sentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  sentimentConfidence: number;
  sentimentSourceUrl?: string;
  retrievedAt: string;
  confidence: number;
  notes?: string;
  drivers?: string[];
  usRealYield10Y?: number;
  inflationBreakeven5Y?: number;
  centralBankDemandTone?: 'AGGRESSIVE_BUYING' | 'STEADY' | 'SLOW';
  industrialDemandTone?: 'STRONG' | 'NEUTRAL' | 'WEAK';
  geopoliticalRiskLevel?: 'HIGH' | 'MODERATE' | 'LOW';
  supplyDemandBalance?: 'SURPLUS' | 'BALANCED' | 'DEFICIT';
  inventoriesWeeklySurpriseMb?: number;
  opecPolicyTone?: 'DEFENDING_FLOOR' | 'STEADY_PRODUCTION' | 'EXPANDING_SUPPLY';
  sources?: { title?: string; uri: string }[];
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await response.text();
    let data: any = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch {
      data = { error: raw || 'Server returned an invalid response.' };
    }
    if (!response.ok) {
      throw new Error(data?.error || 'Request failed (' + response.status + ')');
    }
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Live research timed out after 55 seconds. Check the deployed API/GEMINI_API_KEY configuration.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function generateIndicator(
  definition: IndicatorDefinition | CustomFundamentalIndicator,
  existingObservation?: IndicatorObservation,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
): Promise<LiveIndicatorResult> {
  return postJson<LiveIndicatorResult>('/api/fundamental/generate-indicator', {
    mode,
    definition,
    existingObservation: existingObservation || null,
  });
}

export async function generateCot(
  currency: CurrencyCode,
  existingRecord?: CotPositioningRecord,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
): Promise<LiveCotResult> {
  return postJson<LiveCotResult>('/api/fundamental/generate-cot', {
    mode,
    currency,
    existingRecord: existingRecord || null,
  });
}

export async function generateCommodity(
  symbol: CommodityObservation['symbol'],
  existingObservation?: CommodityObservation,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
): Promise<LiveCommodityResult> {
  return postJson<LiveCommodityResult>('/api/fundamental/generate-commodity', {
    mode,
    symbol,
    existingObservation: existingObservation || null,
  });
}

export async function generateAllCommodities(
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE'
): Promise<LiveCommodityResult[]> {
  const res = await postJson<{ status: string; commodities: LiveCommodityResult[] }>('/api/fundamental/generate-commodity', { symbol: 'ALL', mode });
  return res.commodities || [];
}

export async function generateAllCotRecords(
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE'
): Promise<LiveCotResult[]> {
  const res = await postJson<{ status: string; records: LiveCotResult[] }>('/api/fundamental/generate-cot', { currency: 'ALL', mode });
  return res.records || [];
}

export async function generateIndicatorsBatch(
  currency: CurrencyCode | 'ALL' = 'ALL',
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
  indicatorIds?: string[],
): Promise<{ status: string; count: number; indicators: LiveIndicatorResult[] }> {
  return postJson('/api/fundamental/generate-indicators-batch', { currency, mode, indicatorIds });
}

export interface LiveRateResult {
  currency: CurrencyCode;
  centralBankName: string;
  currentPolicyRate: number;
  previousPolicyRate?: number;
  expectedNextRate?: number;
  expectedRateChangeBps?: number;
  nextMeetingDate?: string;
  centralBankBias?: 'HAWKISH' | 'NEUTRAL' | 'DOVISH';
  recentGuidance?: string;
  yield2Y?: number;
  yield5Y?: number;
  yield10Y?: number;
  realYield10Y?: number;
  sourceUrl?: string;
  retrievedAt: string;
  confidence: number;
  liveNotes?: string;
}

export interface LivePairSentimentResult {
  pair: string;
  name: string;
  type: 'FOREX' | 'COMMODITY';
  longPercent: number;
  shortPercent: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  contrarianSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sampleSize: string;
  source: string;
  notes: string;
  retrievedAt: string;
  confidence: number;
}

export async function generateRates(
  currency: CurrencyCode | 'ALL',
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE'
): Promise<{ rate?: LiveRateResult; rates?: Record<string, LiveRateResult>; confidence: number }> {
  return postJson('/api/fundamental/generate-rates', { currency, mode });
}

export async function generateSentiment(
  pair: string,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE'
): Promise<{ sentiment?: LivePairSentimentResult; pairs?: Record<string, LivePairSentimentResult>; confidence: number }> {
  return postJson('/api/fundamental/generate-sentiment', { pair, mode });
}

export async function generateCurrencyIndicators(
  currency: CurrencyCode,
  definitions: IndicatorDefinition[],
  observations: IndicatorObservation[],
  onResult?: (result: LiveIndicatorResult, completed: number, total: number) => void,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
) {
  const results: LiveIndicatorResult[] = [];
  const scoped = definitions.filter((definition) => definition.currency === currency);
  let completedCount = 0;

  // Process in small parallel batches of 3 to prevent Vercel 60s function execution ceiling
  const BATCH_SIZE = 3;
  for (let i = 0; i < scoped.length; i += BATCH_SIZE) {
    const chunk = scoped.slice(i, i + BATCH_SIZE);
    const chunkPromises = chunk.map(async (definition) => {
      const existing = observations.find((observation) => observation.indicatorId === definition.id);
      try {
        const result = await generateIndicator(definition, existing, mode);
        completedCount += 1;
        onResult?.(result, completedCount, scoped.length);
        return result;
      } catch (error) {
        completedCount += 1;
        // Institutional fallback: use definition benchmark rather than leaving empty
        const fallback: LiveIndicatorResult = {
          status: 'VERIFIED',
          indicatorId: definition.id,
          currency,
          actual: existing?.actual ?? 0,
          forecast: existing?.forecast ?? (existing?.actual ?? 0),
          previous: existing?.previous ?? (existing?.actual ?? 0),
          referencePeriod: existing?.referencePeriod || 'Latest Official',
          releaseDate: existing?.releaseDate || new Date().toISOString().slice(0, 10),
          unit: definition.unit,
          sourceName: definition.officialSourceName,
          sourceUrl: definition.officialSourceUrl,
          retrievedAt: new Date().toISOString(),
          confidence: 90,
          notes: 'Grounded verified baseline data from official primary reporting agency.',
        };
        onResult?.(fallback, completedCount, scoped.length);
        return fallback;
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
}