import { DataCollector, CollectorResult, NormalizedObservation, CollectorFetchOptions, SeriesVerificationResult } from './types.js';
import { IndicatorRecord } from '../shared/types.js';
import { config } from '../shared/config.js';
import { logger } from '../shared/logger.js';
import { withRetry, HttpError } from '../shared/retry.js';
import { fredRateLimiter } from '../shared/rateLimiter.js';
import { fetchWithTimeout } from '../shared/http.js';
import { validateObservation, detectSuspiciousJump } from '../shared/validation.js';

export type SeriesCategoryMode = 'revisable' | 'market_priced' | 'derived' | 'needs_alternative_source';

export interface FredSeriesConfig {
  seriesId: string;
  mode: SeriesCategoryMode;
  expectedFrequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly';
  expectedUnits: string;
  licensingNote?: string;
  isDerived?: boolean;
}

/**
 * Standard registry of FRED active USD series with revision mode and licensing audit.
 */
export const FRED_SERIES_CATALOG: Record<string, FredSeriesConfig> = {
  // Monetary (Market-priced, never revised)
  DFF: { seriesId: 'DFF', mode: 'market_priced', expectedFrequency: 'Daily', expectedUnits: 'Percent' },
  DGS2: { seriesId: 'DGS2', mode: 'market_priced', expectedFrequency: 'Daily', expectedUnits: 'Percent' },
  DFII10: { seriesId: 'DFII10', mode: 'market_priced', expectedFrequency: 'Daily', expectedUnits: 'Percent' },
  'DGS2-FEDFUNDS': { seriesId: 'DGS2-FEDFUNDS', mode: 'derived', expectedFrequency: 'Daily', expectedUnits: 'Basis Points', isDerived: true },

  // Inflation (Revisable official agency data)
  CPIAUCSL: { seriesId: 'CPIAUCSL', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Index 1982-1984=100' },
  CPILFESL: { seriesId: 'CPILFESL', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Index 1982-1984=100' },
  PCEPILFE: { seriesId: 'PCEPILFE', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Index 2017=100' },
  PPIACO: { seriesId: 'PPIACO', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Index 1982=100', licensingNote: 'VERIFY: PPI commodity final demand series choice' },
  CES0500000003: { seriesId: 'CES0500000003', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Dollars per Hour' },
  T5YIE: { seriesId: 'T5YIE', mode: 'market_priced', expectedFrequency: 'Daily', expectedUnits: 'Percent' }, // 5Y Breakeven

  // Growth & Labor (Revisable macro data)
  PAYEMS: { seriesId: 'PAYEMS', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Thousands of Persons' },
  UNRATE: { seriesId: 'UNRATE', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Percent' },
  ICSA: { seriesId: 'ICSA', mode: 'revisable', expectedFrequency: 'Weekly', expectedUnits: 'Number' },
  GDPC1: { seriesId: 'GDPC1', mode: 'revisable', expectedFrequency: 'Quarterly', expectedUnits: 'Billions of Chained 2017 Dollars' },
  RSXFS: { seriesId: 'RSXFS', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Millions of Dollars', licensingNote: 'Advance Retail Sales ex Food Services' },
  UMCSENT: { seriesId: 'UMCSENT', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Index 1966:Q1=100', licensingNote: 'FLAG LICENSE: Copyright University of Michigan; redistribution terms apply' },

  // Risk Sentiment (Market-priced daily indexes)
  VIXCLS: { seriesId: 'VIXCLS', mode: 'market_priced', expectedFrequency: 'Daily', expectedUnits: 'Index' },
  BAMLH0A0HYM2: { seriesId: 'BAMLH0A0HYM2', mode: 'market_priced', expectedFrequency: 'Daily', expectedUnits: 'Percent', licensingNote: 'FLAG LICENSE: ICE Data Indices, LLC; history on FRED limited' },
  NFCI: { seriesId: 'NFCI', mode: 'market_priced', expectedFrequency: 'Weekly', expectedUnits: 'Index' },
  SP500: { seriesId: 'SP500', mode: 'market_priced', expectedFrequency: 'Daily', expectedUnits: 'Index', licensingNote: 'FLAG LICENSE: S&P Dow Jones Indices LLC; 10-year rolling window on FRED' },

  // Structural & Price (Revisable structural vs market broad index)
  BOPGSTB: { seriesId: 'BOPGSTB', mode: 'revisable', expectedFrequency: 'Monthly', expectedUnits: 'Millions of Dollars', licensingNote: 'VERIFY: U.S. Goods and Services Trade Balance' },
  IEABC: { seriesId: 'IEABC', mode: 'revisable', expectedFrequency: 'Quarterly', expectedUnits: 'Millions of Dollars', licensingNote: 'VERIFY: U.S. Current Account Balance' },
  GFDEGDQ188S: { seriesId: 'GFDEGDQ188S', mode: 'revisable', expectedFrequency: 'Quarterly', expectedUnits: 'Percent of GDP' },
  DTWEXBGS: { seriesId: 'DTWEXBGS', mode: 'market_priced', expectedFrequency: 'Daily', expectedUnits: 'Index Jan 2006=100', licensingNote: 'Broad Trade-Weighted U.S. Dollar Index (Fed) - Note: Not ICE DXY' },

  // PMIs
  ISM_MFG: { seriesId: 'ISM_MFG', mode: 'needs_alternative_source', expectedFrequency: 'Monthly', expectedUnits: 'Index', licensingNote: 'NEEDS ALTERNATIVE SOURCE: ISM proprietary; not on FRED' },
};

export class FredCollector implements DataCollector {
  readonly sourceId = 'fred';
  readonly name = 'Federal Reserve Economic Data (FRED)';

  private verifiedSeries = new Map<string, SeriesVerificationResult>();

  /**
   * Verifies series metadata against FRED series endpoint at startup.
   */
  async verifySeries(seriesId: string): Promise<SeriesVerificationResult> {
    if (this.verifiedSeries.has(seriesId)) {
      return this.verifiedSeries.get(seriesId)!;
    }

    const catalogConfig = FRED_SERIES_CATALOG[seriesId];
    if (catalogConfig?.mode === 'derived') {
      const res: SeriesVerificationResult = {
        seriesId,
        isValid: false,
        warningMessage: 'Derived series: calculated in scoring engine, not collected directly.',
      };
      this.verifiedSeries.set(seriesId, res);
      return res;
    }

    if (catalogConfig?.mode === 'needs_alternative_source') {
      const res: SeriesVerificationResult = {
        seriesId,
        isValid: false,
        warningMessage: 'Series unavailable on FRED; requires commercial vendor source.',
      };
      this.verifiedSeries.set(seriesId, res);
      return res;
    }

    const apiKey = config.collectors.fredApiKey;
    if (!apiKey) {
      const res: SeriesVerificationResult = {
        seriesId,
        isValid: false,
        warningMessage: 'FRED_API_KEY missing from environment; cannot query series metadata.',
      };
      this.verifiedSeries.set(seriesId, res);
      return res;
    }

    try {
      await fredRateLimiter.acquire();
      const url = new URL('https://api.stlouisfed.org/fred/series');
      url.searchParams.set('series_id', seriesId);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('file_type', 'json');

      const response = await withRetry(async () => {
        const res = await fetchWithTimeout(url);
        if (res.status === 429 || res.status >= 500) {
          throw new HttpError(res.status, res.statusText, `FRED metadata API error HTTP ${res.status}`);
        }
        if (!res.ok) {
          throw new HttpError(res.status, res.statusText, `FRED metadata client error HTTP ${res.status}`);
        }
        return res;
      }, `FredVerify:${seriesId}`);

      const data = await response.json();
      const seriesObj = data?.seriess?.[0];

      if (!seriesObj) {
        const res: SeriesVerificationResult = {
          seriesId,
          isValid: false,
          warningMessage: `FRED returned empty metadata for series ${seriesId}.`,
        };
        this.verifiedSeries.set(seriesId, res);
        return res;
      }

      const res: SeriesVerificationResult = {
        seriesId,
        isValid: true,
        title: seriesObj.title,
        frequency: seriesObj.frequency,
        units: seriesObj.units,
        lastUpdated: seriesObj.last_updated,
      };

      if (catalogConfig?.licensingNote) {
        logger.info(`[FredCollector:LicenseAudit] ${seriesId}: ${catalogConfig.licensingNote}`);
      }

      this.verifiedSeries.set(seriesId, res);
      return res;
    } catch (err: any) {
      const res: SeriesVerificationResult = {
        seriesId,
        isValid: false,
        warningMessage: `Metadata verification failed for ${seriesId}: ${err?.message || err}`,
      };
      this.verifiedSeries.set(seriesId, res);
      return res;
    }
  }

  /**
   * Fetches observations for an indicator from FRED API.
   */
  async fetch(indicator: IndicatorRecord, options: CollectorFetchOptions = {}): Promise<CollectorResult> {
    let seriesId = indicator.source_series_id.trim();

    // Strip prefix if any (e.g. "VERIFY:DGS2-FEDFUNDS")
    if (seriesId.startsWith('VERIFY:')) {
      seriesId = seriesId.replace('VERIFY:', '').trim();
    }

    const catalogConfig = FRED_SERIES_CATALOG[seriesId];

    // Handle derived or unsupported
    if (catalogConfig?.mode === 'derived') {
      logger.info(`[FredCollector] Skipping derived indicator ${indicator.code} (${seriesId})`);
      return {
        indicatorId: indicator.id,
        observations: [],
        sourceStatus: 'OK',
        warningMessage: 'Derived indicator: will be computed by scoring engine.',
      };
    }

    if (catalogConfig?.mode === 'needs_alternative_source' || seriesId.includes('needs_alternative_source')) {
      logger.warn(`[FredCollector] Skipping unsupported indicator ${indicator.code} (needs alternative source)`);
      return {
        indicatorId: indicator.id,
        observations: [],
        sourceStatus: 'MISMATCH_WARNING',
        warningMessage: 'Series requires alternative commercial source (e.g. ISM PMI).',
      };
    }

    const apiKey = config.collectors.fredApiKey;
    if (!apiKey) {
      logger.error('[FredCollector] FRED_API_KEY environment variable is not configured.');
      return {
        indicatorId: indicator.id,
        observations: [],
        sourceStatus: 'AUTH_ERROR',
        errorMessage: 'FRED_API_KEY environment variable is missing.',
      };
    }

    // Verify metadata at startup
    const verification = await this.verifySeries(seriesId);
    if (!verification.isValid && verification.warningMessage) {
      logger.warn(`[FredCollector] Verification warning for ${indicator.code}: ${verification.warningMessage}`);
    }

    const isRevisable = catalogConfig?.mode === 'revisable';

    try {
      await fredRateLimiter.acquire();

      const url = new URL('https://api.stlouisfed.org/fred/series/observations');
      url.searchParams.set('series_id', seriesId);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('file_type', 'json');
      url.searchParams.set('sort_order', 'asc');

      if (options.since) {
        url.searchParams.set('observation_start', options.since);
      }

      // If revisable, request vintage realtime dates
      if (isRevisable) {
        url.searchParams.set('output_type', '4'); // ALFRED initial and revised releases
      }

      const response = await withRetry(async () => {
        const res = await fetchWithTimeout(url);
        if (res.status === 429 || res.status >= 500) {
          throw new HttpError(res.status, res.statusText, `FRED API error HTTP ${res.status}`);
        }
        if (!res.ok) {
          throw new HttpError(res.status, res.statusText, `FRED API client error HTTP ${res.status}`);
        }
        return res;
      }, `FredFetch:${seriesId}`);

      const data = await response.json();
      const rawObservations = data?.observations || [];

      const parsed = this.parseFredObservations(indicator.id, seriesId, rawObservations, isRevisable);

      return {
        indicatorId: indicator.id,
        observations: parsed,
        latestObservationDate: parsed.length > 0 ? parsed[parsed.length - 1].periodDate : undefined,
        sourceStatus: 'OK',
      };
    } catch (err: any) {
      logger.error(`[FredCollector] Error fetching ${seriesId} (${indicator.code}): ${err?.message || err}`);
      return {
        indicatorId: indicator.id,
        observations: [],
        sourceStatus: err instanceof HttpError && err.status === 429 ? 'RATE_LIMITED' : 'NETWORK_ERROR',
        errorMessage: err?.message || String(err),
      };
    }
  }

  /**
   * Pure parsing function for FRED observations array.
   * Exposed for deterministic testing with recorded JSON fixtures.
   */
  parseFredObservations(
    indicatorId: string,
    seriesId: string,
    rawList: any[],
    isRevisable = false
  ): NormalizedObservation[] {
    const results: NormalizedObservation[] = [];
    const seenPeriods = new Map<string, number>(); // periodDate -> count of observations
    let prevVal: number | null = null;

    for (const item of rawList) {
      const rawVal = item?.value;
      const periodDate = String(item?.date || '').trim();

      // 1. Skip missing values represented as "." in FRED, NEVER store as 0!
      if (!rawVal || rawVal === '.' || rawVal.trim() === '') {
        continue;
      }

      const validation = validateObservation(seriesId, periodDate, rawVal);
      if (!validation.isValid) {
        logger.debug(`[FredCollector:Skip] ${seriesId} observation ${periodDate} rejected: ${validation.rejectReason}`);
        continue;
      }

      const numVal = Number(rawVal);

      // Point-in-time vintage calculation
      const occurrenceCount = seenPeriods.get(periodDate) || 0;
      seenPeriods.set(periodDate, occurrenceCount + 1);

      let releasedAt: string;
      let isRevision = false;

      if (isRevisable && item?.realtime_start && item.realtime_start !== '1776-07-04') {
        releasedAt = `${item.realtime_start}T14:30:00Z`; // Standard US morning macro release time (8:30 AM ET)
        isRevision = occurrenceCount > 0;
      } else {
        // Market-priced series (yields, VIX, DTWEXBGS) are never revised
        releasedAt = `${periodDate}T23:59:59Z`;
        isRevision = false;
      }

      // Check for suspicious jump (> 4 std devs vs prior reading)
      const hasJump = detectSuspiciousJump(numVal, prevVal, 4.0);
      prevVal = numVal;

      const norm: NormalizedObservation = {
        indicatorId,
        periodDate,
        value: numVal,
        releasedAt,
        isRevision,
      };

      if (validation.qualityFlagType) {
        norm.qualityFlag = {
          flagType: validation.qualityFlagType,
          details: validation.details || {},
        };
      } else if (hasJump) {
        norm.qualityFlag = {
          flagType: 'suspicious_jump',
          details: { value: numVal, previous: prevVal, series: seriesId },
        };
      }

      results.push(norm);
    }

    return results;
  }
}
