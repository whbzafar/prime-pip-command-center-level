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
  sources?: { title?: string; uri: string }[];
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed (' + response.status + ')');
  }
  return data as T;
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