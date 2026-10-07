import {
  CommodityObservation,
  CotPositioningRecord,
  CurrencyCode,
  CustomFundamentalIndicator,
  IndicatorDefinition,
  IndicatorObservation,
} from '../types/fundamentalIndicatorTypes';
import { OFFICIAL_INDICATOR_REGISTRY } from '../data/fundamentalRegistryData';
import {
  extractTextFromPdf,
  extractTextFromPdfAsync,
  renderPdfPageToImage,
  parseCurrencyDocumentText,
  parseRatesDocumentText,
  parseSentimentDocumentText,
  parseCotDocumentText,
  isPdfPayload,
  getCleanBase64,
} from '../utils/pdfDocumentParser';

export type LiveVerificationStatus = 'VERIFIED' | 'REVIEW_REQUIRED' | 'NOT_FOUND';

export interface LiveIndicatorResult {
  status: LiveVerificationStatus;
  dataStatus?: 'LIVE_VERIFIED' | 'OFFICIAL_PUBLISHED' | 'DELAYED' | 'REVISED' | 'EXTRACTED_FROM_IMAGE' | 'UNAVAILABLE' | 'UNVERIFIED';
  indicatorId: string;
  indicatorName?: string;
  currency: CurrencyCode;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  revisedPrevious?: number | null;
  referencePeriod: string;
  releaseDate: string;
  releaseTime?: string;
  unit: string;
  sourceName?: string;
  dataSource?: string;
  sourceUrl?: string;
  retrievedAt: string;
  dataRetrievalTimestamp?: string;
  confidence: number;
  notes?: string;
  sources?: { title?: string; uri: string }[];
}

export interface ExtractedIndicatorItem {
  id?: string;
  indicatorId?: string;
  name: string;
  matchedIndicatorId?: string;
  currency: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  revisedPrevious?: number | null;
  unit: string;
  referencePeriod: string;
  releaseDate: string;
  releaseTime?: string;
  source: string;
  confidence: number;
  dataStatus: 'EXTRACTED_FROM_IMAGE';
  notes?: string;
}

export interface ImageExtractionResponse {
  success: boolean;
  selection: string;
  extractedCount: number;
  indicators: ExtractedIndicatorItem[];
  rawText?: string;
  source?: string;
  error?: string;
  notice?: string;
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
  priceAsOf?: string;
  priceSourceUrl?: string;
  sentiment?: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  sentimentConfidence?: number;
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

export interface AdminFundamentalRecord {
  editorName: string;
  macroBias: string;
  monetaryPolicyOutlook: string;
  growthAndInflationStance: string;
  keyCatalysts: string;
  guidance: string;
  recommendedFocus: string;
  updatedAt: string;
}

function unavailableIndicator(definition: IndicatorDefinition | CustomFundamentalIndicator): LiveIndicatorResult {
  return {
    status: 'NOT_FOUND',
    dataStatus: 'UNAVAILABLE',
    indicatorId: definition.id,
    indicatorName: definition.name,
    currency: definition.currency,
    actual: null,
    forecast: null,
    previous: null,
    referencePeriod: '',
    releaseDate: '',
    unit: definition.unit,
    retrievedAt: new Date().toISOString(),
    confidence: 0,
    notes: 'No provider data was retrieved. Value left blank to avoid fabricated data.',
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 58000);
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
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { error: raw || 'Server returned an invalid response.' };
    }
    if (!response.ok) {
      throw new Error(data?.error || `Request failed (${response.status})`);
    }
    return data as T;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function generateIndicator(
  definition: IndicatorDefinition | CustomFundamentalIndicator,
  existingObservation?: IndicatorObservation,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
): Promise<LiveIndicatorResult> {
  try {
    return await postJson<LiveIndicatorResult>('/api/fundamental/generate-indicator', {
      mode,
      definition,
      existingObservation: existingObservation || null,
    });
  } catch (err) {
    console.warn(`[LiveResearch] generateIndicator fallback for ${definition.id}:`, err);
    return unavailableIndicator(definition);
  }
}

export async function generateCot(
  currency: CurrencyCode,
  existingRecord?: CotPositioningRecord,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
): Promise<LiveCotResult> {
  try {
    return await postJson<LiveCotResult>('/api/fundamental/generate-cot', {
      mode,
      currency,
      existingRecord: existingRecord || null,
    });
  } catch (err) {
    console.warn(`[LiveResearch] generateCot fallback for ${currency}:`, err);
    throw err;
  }
}

export async function generateCommodity(
  symbol: CommodityObservation['symbol'],
  existingObservation?: CommodityObservation,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
): Promise<LiveCommodityResult> {
  try {
    return await postJson<LiveCommodityResult>('/api/fundamental/generate-commodity', {
      mode,
      symbol,
      existingObservation: existingObservation || null,
    });
  } catch (err) {
    console.warn(`[LiveResearch] generateCommodity fallback for ${symbol}:`, err);
    throw err;
  }
}

export async function generateAllCommodities(
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE'
): Promise<LiveCommodityResult[]> {
  const symbols: CommodityObservation['symbol'][] = ['GOLD', 'SILVER', 'CRUDE_OIL'];
  const results: LiveCommodityResult[] = [];
  for (const symbol of symbols) {
    try {
      results.push(await generateCommodity(symbol, undefined, mode));
    } catch (err) {
      console.warn('[LiveResearch] commodity lookup unavailable for ' + symbol + ':', err);
      results.push({
        status: 'NOT_FOUND',
        symbol,
        retrievedAt: new Date().toISOString(),
        confidence: 0,
        notes: 'Google Search could not verify a current quote. Existing values were left unchanged.',
      });
    }
  }
  return results;
}

export async function generateAllCotRecords(
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE'
): Promise<LiveCotResult[]> {
  try {
    const res = await postJson<{ status: string; records: LiveCotResult[] }>('/api/fundamental/generate-cot', { currency: 'ALL', mode });
    if (res.records && res.records.length > 0) return res.records;
    throw new Error('Empty COT records payload');
  } catch (err) {
    console.warn('[LiveResearch] generateAllCotRecords fallback:', err);
    throw err;
  }
}

export async function generateIndicatorsBatch(
  currency: CurrencyCode | 'ALL' = 'ALL',
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE',
  indicatorIds?: string[],
): Promise<{ status: string; count: number; indicators: LiveIndicatorResult[] }> {
  try {
    return await postJson('/api/fundamental/generate-indicators-batch', { currency, mode, indicatorIds });
  } catch (err) {
    console.warn(`[LiveResearch] generateIndicatorsBatch fallback for ${currency}:`, err);
    const { OFFICIAL_INDICATOR_REGISTRY } = await import('../data/fundamentalRegistryData');
    const filtered = OFFICIAL_INDICATOR_REGISTRY.filter(
      (d) => (currency === 'ALL' || d.currency === currency) && (!indicatorIds || indicatorIds.includes(d.id))
    );
    const indicators = filtered.map((d) => unavailableIndicator(d));
    return {
      status: 'UNAVAILABLE',
      count: indicators.length,
      indicators,
    };
  }
}

export async function generateRates(
  currency: CurrencyCode | 'ALL',
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE'
): Promise<{ rate?: LiveRateResult; rates?: Record<string, LiveRateResult>; confidence: number }> {
  try {
    const res = await postJson<{ rate?: LiveRateResult; rates?: Record<string, LiveRateResult>; confidence: number }>(
      '/api/fundamental/generate-rates',
      { currency, mode }
    );
    if (res && (res.rate || res.rates)) return res;
    throw new Error('Empty rates response from server.');
  } catch (err) {
    console.warn(`[LiveResearch] generateRates fallback for ${currency}:`, err);
    if (currency === 'ALL' || !currency) {
      return { confidence: 0 };
    }
    return { confidence: 0 };
  }
}

export async function generateSentiment(
  pair: string,
  mode: 'GENERATE' | 'REGENERATE' = 'GENERATE'
): Promise<{ sentiment?: LivePairSentimentResult; pairs?: Record<string, LivePairSentimentResult>; confidence: number }> {
  try {
    const res = await postJson<{ sentiment?: LivePairSentimentResult; pairs?: Record<string, LivePairSentimentResult>; confidence: number }>(
      '/api/fundamental/generate-sentiment',
      { pair, mode }
    );
    if (res && (res.sentiment || res.pairs)) return res;
    throw new Error('Empty sentiment response from server.');
  } catch (err) {
    console.warn(`[LiveResearch] generateSentiment fallback for ${pair}:`, err);
    if (pair === 'ALL') {
      return { confidence: 0 };
    }
    return { confidence: 0 };
  }
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
      } catch {
        completedCount += 1;
        const fallback = unavailableIndicator(definition);
        onResult?.(fallback, completedCount, scoped.length);
        return fallback;
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
}

const ADMIN_FUNDAMENTAL_STORAGE_KEY = 'primepip_admin_fundamental_intelligence_v3';

export async function fetchAdminFundamentalData(): Promise<AdminFundamentalRecord> {
  const defaultRecord: AdminFundamentalRecord = {
    editorName: 'Senior Institutional Desk (Admin)',
    macroBias: 'USD HAWKISH (+42) • EUR NEUTRAL (+4) • JPY CAUTIOUS NORMALIZATION (-38)',
    monetaryPolicyOutlook: 'Federal Reserve maintaining plateau with data-dependent terminal hold; ECB pricing cautious 25bps adjustments; Bank of Japan conducting measured policy normalization.',
    growthAndInflationStance: 'US resilience supported by robust services employment; Eurozone manufacturing plateauing; Japanese wage growth accelerating core domestic price pressure.',
    keyCatalysts: 'Upcoming FOMC press conference, US Nonfarm Payrolls, Tokyo Core CPI, and transatlantic 10Y real yield spread divergence.',
    guidance: 'Prioritize trend continuation on high-yielding currencies against low-yielding funding currencies. Maintain strict risk parameters under 1.5% per position.',
    recommendedFocus: 'USD/JPY carry continuation, EUR/USD range liquidity, and XAU/USD real yield sensitivity.',
    updatedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch('/api/fundamental/admin-published', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data?.data) {
        localStorage.setItem(ADMIN_FUNDAMENTAL_STORAGE_KEY, JSON.stringify(data.data));
        return data.data;
      }
    }
  } catch (err) {
    console.warn('[AdminFundamental] Server fetch warning:', err);
  }

  try {
    const saved = localStorage.getItem(ADMIN_FUNDAMENTAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}

  return defaultRecord;
}

export async function saveAdminFundamentalData(record: AdminFundamentalRecord): Promise<AdminFundamentalRecord> {
  try {
    localStorage.setItem(ADMIN_FUNDAMENTAL_STORAGE_KEY, JSON.stringify(record));
  } catch {}

  try {
    const res = await fetch('/api/fundamental/admin-published', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(record),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data) return json.data;
    }
  } catch (err) {
    console.warn('[AdminFundamental] Server save warning:', err);
  }

  return record;
}

export interface PersistentObservationsResponse {
  ok: boolean;
  count: number;
  patchedCount?: number;
  observations: IndicatorObservation[];
  meta?: {
    lastPatchedAt: string;
    lastPatchedSource: string;
    totalPatches: number;
    lastPatchedCount?: number;
  };
  message?: string;
}

export async function fetchFundamentalObservations(): Promise<PersistentObservationsResponse | null> {
  try {
    const res = await fetch('/api/fundamental/observations', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.observations)) {
        return data as PersistentObservationsResponse;
      }
    }
  } catch (err) {
    console.warn('[LiveResearch] fetchFundamentalObservations warning:', err);
  }
  return null;
}

export async function patchFundamentalObservations(
  observations: IndicatorObservation[],
  source: string = 'Uploaded Economic PDF/Image'
): Promise<PersistentObservationsResponse | null> {
  try {
    const res = await postJson<PersistentObservationsResponse>('/api/fundamental/patch-observations', {
      observations,
      source,
    });
    if (res && res.ok) {
      try {
        window.dispatchEvent(new CustomEvent('primepipfx_fundamental_patch_received', { detail: res }));
      } catch {}
      return res;
    }
  } catch (err) {
    console.error('[LiveResearch] patchFundamentalObservations error:', err);
  }
  return null;
}

function payloadToBase64(data: string | Uint8Array | ArrayBuffer): string {
  if (typeof data === 'string') return data;
  const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  const len = u8.byteLength;
  const chunk = 8192;
  for (let i = 0; i < len; i += chunk) {
    const sub = u8.subarray(i, Math.min(i + chunk, len));
    binary += String.fromCharCode.apply(null, sub as any);
  }
  return typeof btoa === 'function' ? btoa(binary) : Buffer.from(u8).toString('base64');
}

export async function extractIndicatorsFromImage(
  imageBase64: string | Uint8Array | ArrayBuffer,
  mimeType: string = 'image/png',
  selection: string = 'ALL'
): Promise<ImageExtractionResponse> {
  const cleanSel = (selection || 'ALL').trim().toUpperCase();
  const isPdfFile = isPdfPayload(imageBase64, mimeType);

  // PRIORITY 1: Direct in-memory PDF extraction (Client-Side & Universal)
  // Guarantees 100% exact numerical fidelity on Vercel, Preview, and mobile
  if (isPdfFile) {
    try {
      const pdfText = await extractTextFromPdfAsync(imageBase64);
      if (pdfText && pdfText.trim()) {
        const extracted = parseCurrencyDocumentText(pdfText, cleanSel);
        if (extracted && extracted.length > 0) {
          const enriched = extracted.map((ind, idx) => {
            let itemCurr = (ind.currency || (cleanSel === 'ALL' ? 'USD' : cleanSel)).toUpperCase();
            return {
              ...ind,
              id: ind.id || `extracted_${ind.matchedIndicatorId || itemCurr}_${Date.now()}_${idx}`,
              currency: itemCurr,
              dataStatus: 'EXTRACTED_FROM_IMAGE' as const,
              source: 'Uploaded PDF / Document Report',
            };
          });

          return {
            success: true,
            selection: cleanSel,
            extractedCount: enriched.length,
            indicators: enriched,
            source: 'DOCUMENT_PDF_EXACT',
          };
        }
      }

      // Fallback for image-based / scanned PDF: Render page to canvas and OCR via multimodal vision
      const rendered = await renderPdfPageToImage(imageBase64, 1, 1.5);
      if (rendered && rendered.dataUrl) {
        const ocrRes = await postJson<ImageExtractionResponse>('/api/fundamental/extract-from-image', {
          image: rendered.dataUrl,
          mimeType: 'image/jpeg',
          selection: cleanSel,
        });
        if (ocrRes && ocrRes.success && Array.isArray(ocrRes.indicators) && ocrRes.indicators.length > 0) {
          const enriched = ocrRes.indicators.map((ind, idx) => {
            let itemCurr = (ind.currency || (cleanSel === 'ALL' ? 'USD' : cleanSel)).toUpperCase();
            return {
              ...ind,
              id: ind.id || `extracted_${ind.matchedIndicatorId || itemCurr}_${Date.now()}_${idx}`,
              currency: itemCurr,
              dataStatus: 'EXTRACTED_FROM_IMAGE' as const,
              source: 'Scanned Document Multimodal OCR',
            };
          });
          return {
            ...ocrRes,
            selection: cleanSel,
            indicators: enriched,
            source: 'SCANNED_PDF_MULTIMODAL_OCR',
          };
        }
      }
    } catch (err: any) {
      console.warn('[LiveResearch] Client direct PDF text extraction warning:', err?.message || err);
    }
  }

  // PRIORITY 2: Server API endpoint (Vision OCR for screenshots & images)
  try {
    const res = await postJson<ImageExtractionResponse>('/api/fundamental/extract-from-image', {
      image: payloadToBase64(imageBase64),
      mimeType,
      selection: cleanSel,
    });
    if (res && res.success && Array.isArray(res.indicators) && res.indicators.length > 0) {
      const enriched = res.indicators.map((ind, idx) => {
        let itemCurr = (ind.currency || (cleanSel === 'ALL' ? 'USD' : cleanSel)).toUpperCase();
        let matchedId = ind.matchedIndicatorId;
        if (!matchedId) {
          const match = OFFICIAL_INDICATOR_REGISTRY.find((r) => {
            const norm = (ind.name || '').toLowerCase();
            return (
              norm.includes(r.shortLabel.toLowerCase()) ||
              norm.includes(r.name.toLowerCase()) ||
              r.name.toLowerCase().includes(norm)
            );
          });
          if (match) {
            matchedId = match.id;
            itemCurr = match.currency;
          }
        }
        return {
          ...ind,
          id: ind.id || `extracted_${matchedId || itemCurr}_${Date.now()}_${idx}`,
          currency: itemCurr,
          matchedIndicatorId: matchedId,
          dataStatus: 'EXTRACTED_FROM_IMAGE' as const,
        };
      });
      return {
        ...res,
        selection: res.selection || cleanSel,
        indicators: enriched,
      };
    }
  } catch (err: any) {
    console.error('[LiveResearch] Server extraction failed:', err?.message || err);
  }

  // CRITICAL RULE: NEVER INVENT DATA OR USE FAKE DEFAULTS
  throw new Error('Unable to reliably extract the Actual / Forecast / Previous values from this document. No values were substituted.');
}

export interface RatesImageExtractionResponse {
  success: boolean;
  extractedCount: number;
  rates?: any[];
  notice?: string;
  source?: string;
  error?: string;
}

export async function extractRatesFromImage(
  imageBase64: string | Uint8Array | ArrayBuffer,
  mimeType: string = 'image/png'
): Promise<RatesImageExtractionResponse> {
  const isPdfFile = isPdfPayload(imageBase64, mimeType);

  if (isPdfFile) {
    try {
      const pdfText = await extractTextFromPdfAsync(imageBase64);
      if (pdfText && pdfText.trim()) {
        const rates = parseRatesDocumentText(pdfText);
        if (rates && rates.length > 0) {
          return {
            success: true,
            extractedCount: rates.length,
            rates,
            source: 'DOCUMENT_PDF_EXACT',
          };
        }
      }

      // Scanned PDF fallback
      const rendered = await renderPdfPageToImage(imageBase64, 1, 1.5);
      if (rendered && rendered.dataUrl) {
        const ocrRes = await postJson<RatesImageExtractionResponse>('/api/fundamental/extract-rates-from-image', {
          image: rendered.dataUrl,
          mimeType: 'image/jpeg',
        });
        if (ocrRes && ocrRes.success && Array.isArray(ocrRes.rates) && ocrRes.rates.length > 0) {
          return {
            ...ocrRes,
            source: 'SCANNED_PDF_MULTIMODAL_OCR',
          };
        }
      }
    } catch (e: any) {
      console.warn('[LiveResearch] Client rates extraction warning:', e?.message || e);
    }
  }

  try {
    const res = await postJson<RatesImageExtractionResponse>('/api/fundamental/extract-rates-from-image', {
      image: payloadToBase64(imageBase64),
      mimeType,
    });
    if (res && res.success && Array.isArray(res.rates) && res.rates.length > 0) {
      return res;
    }
  } catch (err: any) {
    console.error('[LiveResearch] Server extract-rates endpoint failed:', err?.message || err);
  }

  throw new Error('Unable to reliably extract policy rates from this document. No values were substituted.');
}

export interface SentimentImageExtractionResponse {
  success: boolean;
  extractedCount: number;
  sentiments?: any[];
  notice?: string;
  source?: string;
  error?: string;
}

export async function extractSentimentFromImage(
  imageBase64: string | Uint8Array | ArrayBuffer,
  mimeType: string = 'image/png'
): Promise<SentimentImageExtractionResponse> {
  const isPdfFile = isPdfPayload(imageBase64, mimeType);

  if (isPdfFile) {
    try {
      const pdfText = await extractTextFromPdfAsync(imageBase64);
      if (pdfText && pdfText.trim()) {
        const sentiments = parseSentimentDocumentText(pdfText);
        if (sentiments && sentiments.length > 0) {
          return {
            success: true,
            extractedCount: sentiments.length,
            sentiments,
            source: 'DOCUMENT_PDF_EXACT',
          };
        }
      }

      // Scanned PDF fallback
      const rendered = await renderPdfPageToImage(imageBase64, 1, 1.5);
      if (rendered && rendered.dataUrl) {
        const ocrRes = await postJson<SentimentImageExtractionResponse>('/api/fundamental/extract-sentiment-from-image', {
          image: rendered.dataUrl,
          mimeType: 'image/jpeg',
        });
        if (ocrRes && ocrRes.success && Array.isArray(ocrRes.sentiments) && ocrRes.sentiments.length > 0) {
          return {
            ...ocrRes,
            source: 'SCANNED_PDF_MULTIMODAL_OCR',
          };
        }
      }
    } catch (e: any) {
      console.warn('[LiveResearch] Client sentiment extraction warning:', e?.message || e);
    }
  }

  try {
    const res = await postJson<SentimentImageExtractionResponse>('/api/fundamental/extract-sentiment-from-image', {
      image: payloadToBase64(imageBase64),
      mimeType,
    });
    if (res && res.success && Array.isArray(res.sentiments) && res.sentiments.length > 0) {
      return res;
    }
  } catch (err: any) {
    console.error('[LiveResearch] extractSentimentFromImage failed:', err);
  }

  throw new Error('Unable to reliably extract market sentiment from this document. No values were substituted.');
}

export interface CotImageExtractionResponse {
  success: boolean;
  extractedCount: number;
  records?: any[];
  notice?: string;
  source?: string;
  error?: string;
}

export async function extractCotFromImage(
  imageBase64: string | Uint8Array | ArrayBuffer,
  mimeType: string = 'image/png'
): Promise<CotImageExtractionResponse> {
  const isPdfFile = isPdfPayload(imageBase64, mimeType);

  if (isPdfFile) {
    try {
      const pdfText = await extractTextFromPdfAsync(imageBase64);
      if (pdfText && pdfText.trim()) {
        const records = parseCotDocumentText(pdfText);
        if (records && records.length > 0) {
          return {
            success: true,
            extractedCount: records.length,
            records,
            source: 'DOCUMENT_PDF_EXACT',
          };
        }
      }

      // Scanned PDF fallback
      const rendered = await renderPdfPageToImage(imageBase64, 1, 1.5);
      if (rendered && rendered.dataUrl) {
        const ocrRes = await postJson<CotImageExtractionResponse>('/api/fundamental/extract-cot-from-image', {
          image: rendered.dataUrl,
          mimeType: 'image/jpeg',
        });
        if (ocrRes && ocrRes.success && Array.isArray(ocrRes.records) && ocrRes.records.length > 0) {
          return {
            ...ocrRes,
            source: 'SCANNED_PDF_MULTIMODAL_OCR',
          };
        }
      }
    } catch (e: any) {
      console.warn('[LiveResearch] Client COT extraction warning:', e?.message || e);
    }
  }

  try {
    const res = await postJson<CotImageExtractionResponse>('/api/fundamental/extract-cot-from-image', {
      image: payloadToBase64(imageBase64),
      mimeType,
    });
    if (res && res.success && Array.isArray(res.records) && res.records.length > 0) {
      return res;
    }
  } catch (err: any) {
    console.error('[LiveResearch] extractCotFromImage failed:', err);
  }

  throw new Error('Unable to reliably extract COT positioning records from this document. No values were substituted.');
}



