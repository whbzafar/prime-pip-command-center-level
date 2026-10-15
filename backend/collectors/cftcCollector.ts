import { DataCollector, CollectorResult, NormalizedObservation, CollectorFetchOptions, SeriesVerificationResult } from './types.js';
import { IndicatorRecord } from '../shared/types.js';
import { config } from '../shared/config.js';
import { logger } from '../shared/logger.js';
import { withRetry, HttpError } from '../shared/retry.js';
import { cftcRateLimiter } from '../shared/rateLimiter.js';
import { fetchWithTimeout } from '../shared/http.js';
import { calculateCftcReleaseTimestamp, formatUtcDate } from '../shared/dateUtils.js';
import { validateObservation } from '../shared/validation.js';

export interface CftcContractConfig {
  currency: string;
  contractCode: string;
  contractName: string;
  isProxy?: boolean;
}

/**
 * Verified contract market codes mapping to the 8 major currencies in the
 * CFTC Traders in Financial Futures (TFF) dataset.
 */
export const CFTC_CURRENCY_CONTRACTS: Record<string, CftcContractConfig> = {
  '098662': { currency: 'USD', contractCode: '098662', contractName: 'USD INDEX - ICE FUTURES U.S.', isProxy: true },
  '099741': { currency: 'EUR', contractCode: '099741', contractName: 'EURO FX - CHICAGO MERCANTILE EXCHANGE' },
  '097741': { currency: 'JPY', contractCode: '097741', contractName: 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE' },
  '096742': { currency: 'GBP', contractCode: '096742', contractName: 'BRITISH POUND - CHICAGO MERCANTILE EXCHANGE' },
  '092741': { currency: 'CHF', contractCode: '092741', contractName: 'SWISS FRANC - CHICAGO MERCANTILE EXCHANGE' },
  '232741': { currency: 'AUD', contractCode: '232741', contractName: 'AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE' },
  '090741': { currency: 'CAD', contractCode: '090741', contractName: 'CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE' },
  '112741': { currency: 'NZD', contractCode: '112741', contractName: 'NEW ZEALAND DOLLAR - CHICAGO MERCANTILE EXCHANGE' },
};

export class CftcCollector implements DataCollector {
  readonly sourceId = 'cftc';
  readonly name = 'Commodity Futures Trading Commission (CFTC)';

  // Official Socrata dataset ID for CFTC Traders in Financial Futures (TFF) Futures Only
  // https://publicreporting.cftc.gov/stories/s/Financial-Futures-Markets/e79n-s92j/
  readonly datasetId = 'jun7-fc8e';
  readonly socrataBaseUrl = 'https://publicreporting.cftc.gov/resource/jun7-fc8e.json';

  private metadataVerified = false;

  /**
   * Verifies CFTC Socrata endpoint and dataset schema at startup.
   */
  async verifySeries(seriesId: string): Promise<SeriesVerificationResult> {
    const [contractCode] = seriesId.split(':');
    const contract = CFTC_CURRENCY_CONTRACTS[contractCode];

    if (!contract) {
      return {
        seriesId,
        isValid: false,
        warningMessage: `Unknown CFTC contract code: ${contractCode}`,
      };
    }

    if (!this.metadataVerified) {
      try {
        await cftcRateLimiter.acquire();
        // Query dataset schema view metadata
        const metadataUrl = `https://publicreporting.cftc.gov/api/views/${this.datasetId}.json`;
        const res = await withRetry(async () => {
          return fetchWithTimeout(metadataUrl, {}, 10000);
        }, 'CftcMetadataVerify');

        if (res.ok) {
          const metaJson = await res.json();
          logger.info(`[CftcCollector] Verified CFTC dataset: ${metaJson?.name || this.datasetId}`);
          this.metadataVerified = true;
        } else {
          logger.warn(`[CftcCollector] CFTC metadata query returned HTTP ${res.status}. Proceeding with verified field schema.`);
        }
      } catch (err: any) {
        logger.warn(`[CftcCollector] Could not verify CFTC dataset metadata online: ${err?.message || err}. Using verified field mapping.`);
      }
    }

    return {
      seriesId,
      isValid: true,
      title: contract.contractName,
      units: 'Contracts',
      frequency: 'Weekly',
    };
  }

  /**
   * Fetches weekly CFTC positioning observations for an indicator.
   */
  async fetch(indicator: IndicatorRecord, options: CollectorFetchOptions = {}): Promise<CollectorResult> {
    const rawSeries = indicator.source_series_id.trim();
    const parts = rawSeries.split(':');
    const contractCode = parts[0];
    const metricType = parts[1] || 'LEV_NET'; // LEV_NET, LEV_NET_PCT_OI, OPEN_INTEREST, ASSET_MGR_NET

    const contract = CFTC_CURRENCY_CONTRACTS[contractCode];
    if (!contract) {
      logger.warn(`[CftcCollector] Unrecognized CFTC contract code in ${indicator.code}: ${contractCode}`);
      return {
        indicatorId: indicator.id,
        observations: [],
        sourceStatus: 'MISMATCH_WARNING',
        warningMessage: `Unrecognized CFTC contract code: ${contractCode}`,
      };
    }

    try {
      await cftcRateLimiter.acquire();

      const url = new URL(this.socrataBaseUrl);
      url.searchParams.set('$select', 'cftc_contract_market_code,contract_market_name,report_date_as_yyyy_mm_dd,lev_money_positions_long_all,lev_money_positions_short_all,asset_mgr_positions_long_all,asset_mgr_positions_short_all,open_interest_all');
      url.searchParams.set('cftc_contract_market_code', contractCode);
      url.searchParams.set('$order', 'report_date_as_yyyy_mm_dd ASC');
      url.searchParams.set('$limit', options.fullHistory ? '5000' : '100');

      if (options.since) {
        url.searchParams.set('$where', `report_date_as_yyyy_mm_dd >= '${options.since}'`);
      }

      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (config.collectors.cftcAppToken) {
        headers['X-App-Token'] = config.collectors.cftcAppToken;
      }

      const response = await withRetry(async () => {
        const res = await fetchWithTimeout(url.toString(), { headers });
        if (res.status === 429 || res.status >= 500) {
          throw new HttpError(res.status, res.statusText, `CFTC API error HTTP ${res.status}`);
        }
        if (!res.ok) {
          throw new HttpError(res.status, res.statusText, `CFTC client error HTTP ${res.status}`);
        }
        return res;
      }, `CftcFetch:${contractCode}`);

      const rows: any[] = await response.json();
      if (!Array.isArray(rows)) {
        throw new Error('CFTC API response is not an array.');
      }

      const parsed = this.parseCftcRows(indicator.id, contractCode, metricType, rows);

      return {
        indicatorId: indicator.id,
        observations: parsed,
        latestObservationDate: parsed.length > 0 ? parsed[parsed.length - 1].periodDate : undefined,
        sourceStatus: 'OK',
      };
    } catch (err: any) {
      logger.error(`[CftcCollector] Error fetching CFTC for ${indicator.code}: ${err?.message || err}`);
      return {
        indicatorId: indicator.id,
        observations: [],
        sourceStatus: err instanceof HttpError && err.status === 429 ? 'RATE_LIMITED' : 'NETWORK_ERROR',
        errorMessage: err?.message || String(err),
      };
    }
  }

  /**
   * Pure parsing function for CFTC TFF rows.
   * Exposed for deterministic testing with recorded JSON fixtures.
   */
  parseCftcRows(
    indicatorId: string,
    contractCode: string,
    metricType: string,
    rows: any[]
  ): NormalizedObservation[] {
    const results: NormalizedObservation[] = [];

    for (const r of rows) {
      // 1. Parse Tuesday report date
      const rawDate = r.report_date_as_yyyy_mm_dd || r.report_date || '';
      if (!rawDate) continue;

      const tuesdayDate = formatUtcDate(rawDate);

      // 2. Compute release timestamp (Friday afternoon 15:30 ET / 20:30 UTC)
      const releasedAt = calculateCftcReleaseTimestamp(tuesdayDate);

      // 3. Extract positions
      const levLong = Number(r.lev_money_positions_long_all || 0);
      const levShort = Number(r.lev_money_positions_short_all || 0);
      const openInterest = Number(r.open_interest_all || 0);
      const assetMgrLong = Number(r.asset_mgr_positions_long_all || 0);
      const assetMgrShort = Number(r.asset_mgr_positions_short_all || 0);

      const levNet = levLong - levShort;
      const assetMgrNet = assetMgrLong - assetMgrShort;
      const levNetPctOi = openInterest > 0 ? Number(((levNet / openInterest) * 100).toFixed(2)) : 0;

      // 4. Determine metric value
      let value: number;
      let sanityKey: string;

      switch (metricType) {
        case 'LEV_NET_PCT_OI':
          value = levNetPctOi;
          sanityKey = 'CFTC_LEV_NET_PCT_OI';
          break;
        case 'OPEN_INTEREST':
          value = openInterest;
          sanityKey = 'CFTC_OPEN_INTEREST';
          break;
        case 'ASSET_MGR_NET':
          value = assetMgrNet;
          sanityKey = 'CFTC_ASSET_MGR_NET';
          break;
        case 'LEV_NET':
        default:
          value = levNet;
          sanityKey = 'CFTC_LEV_NET';
          break;
      }

      const valCheck = validateObservation(sanityKey, tuesdayDate, value);
      if (!valCheck.isValid) {
        logger.debug(`[CftcCollector:Skip] ${contractCode} ${tuesdayDate} rejected: ${valCheck.rejectReason}`);
        continue;
      }

      const obs: NormalizedObservation = {
        indicatorId,
        periodDate: tuesdayDate,
        value,
        releasedAt,
        isRevision: false, // CFTC releases weekly final reports
      };

      if (valCheck.qualityFlagType) {
        obs.qualityFlag = {
          flagType: valCheck.qualityFlagType,
          details: valCheck.details || {},
        };
      }

      results.push(obs);
    }

    return results;
  }
}
