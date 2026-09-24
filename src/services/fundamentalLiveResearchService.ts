import {
  CommodityObservation,
  CotPositioningRecord,
  CurrencyCode,
  CustomFundamentalIndicator,
  IndicatorDefinition,
  IndicatorObservation,
} from '../types/fundamentalIndicatorTypes';

export type LiveVerificationStatus = 'VERIFIED' | 'REVIEW_REQUIRED' | 'NOT_FOUND';

/**
 * LLM-generated numeric research is never promoted to production-truth automatically.
 * A deterministic provider adapter or an explicit human verification step must mark it VERIFIED.
 */
function enforceProductionVerification<T extends { status: LiveVerificationStatus; notes?: string; confidence: number }>(result: T): T {
  if (result.status === 'VERIFIED') {
    return {
      ...result,
      status: 'REVIEW_REQUIRED',
      confidence: Math.min(result.confidence ?? 0, 25),
      notes: [result.notes, 'VERIFY: generated research is not a deterministic source-of-truth adapter. Numeric values require provider verification before production scoring.'].filter(Boolean).join(' '),
    };
  }
  return result;
}

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
  const result = await postJson<LiveIndicatorResult>('/api/fundamental/generate-indicator', {
    mode,
    definition,
    existingObservation: existingObservation || null,
  });
  return enforceProductionVerification(result);
}

export async function generateCot(
  currency: CurrencyCode,
  existingRecord?: CotPositioningRecord,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
): Promise<LiveCotResult> {
  const result = await postJson<LiveCotResult>('/api/fundamental/generate-cot', {
    mode,
    currency,
    existingRecord: existingRecord || null,
  });
  return enforceProductionVerification(result);
}

export async function generateCommodity(
  symbol: CommodityObservation['symbol'],
  existingObservation?: CommodityObservation,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
): Promise<LiveCommodityResult> {
  const result = await postJson<LiveCommodityResult>('/api/fundamental/generate-commodity', {
    mode,
    symbol,
    existingObservation: existingObservation || null,
  });
  return enforceProductionVerification(result);
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

  for (let i = 0; i < scoped.length; i += 1) {
    const definition = scoped[i];
    const existing = observations.find((observation) => observation.indicatorId === definition.id);
    try {
      const result = await generateIndicator(definition, existing, mode);
      results.push(result);
      onResult?.(result, i + 1, scoped.length);
    } catch (error) {
      onResult?.({
        status: 'REVIEW_REQUIRED',
        indicatorId: definition.id,
        currency,
        actual: null,
        forecast: null,
        previous: null,
        referencePeriod: existing?.referencePeriod || 'Unknown',
        releaseDate: existing?.releaseDate || '',
        unit: definition.unit,
        retrievedAt: new Date().toISOString(),
        confidence: 0,
        notes: error instanceof Error ? error.message : 'Live research request failed.',
      }, i + 1, scoped.length);
    }
  }

  return results;
}