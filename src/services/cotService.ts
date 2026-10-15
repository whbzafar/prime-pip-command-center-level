import { COT_MARKETS, MarketDefinition, MarketCategory, CFTC_API_CONFIG, COT_COLUMN_MAPPINGS } from '../config/cotConfig';
import { CotMarketSummary, CotRecord, CotReleaseStatus, RawCotRow } from '../types/cotTypes';
import { processCotHistory, isCotReportDue, getNextExpectedRelease, extractDateString } from '../utils/cotCalculations';

const CACHE_KEY_LATEST = 'primepipfx_cot_latest_cache';
const CACHE_KEY_HISTORY_PREFIX = 'primepipfx_cot_history_';

export interface CotFetchResult<T> {
  data: T;
  isStale: boolean;
  cachedAt?: string;
  source: 'SERVER_PROXY' | 'DIRECT_CFTC' | 'LOCAL_CACHE';
  error?: string;
}

/**
 * Fetch latest COT market summaries for all markets
 * Stale-while-revalidate pattern using localStorage
 */
export async function fetchCotMarketSummaries(force = false): Promise<CotFetchResult<CotMarketSummary[]>> {
  // 1. Check local cache first
  let cachedData: CotMarketSummary[] | null = null;
  let cachedTimestamp: string | undefined;

  try {
    const raw = localStorage.getItem(CACHE_KEY_LATEST);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        cachedData = parsed.data;
        cachedTimestamp = parsed.timestamp;
      }
    }
  } catch {
    // Ignore storage errors
  }

  // If cached data exists and not forced, return cached while revalidating
  try {
    // Try server proxy first
    const proxyUrl = `/api/cot/latest${force ? '?force=true' : ''}`;
    const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });

    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
        const summaries: CotMarketSummary[] = json.data;
        // Save to cache
        try {
          localStorage.setItem(
            CACHE_KEY_LATEST,
            JSON.stringify({ data: summaries, timestamp: new Date().toISOString() })
          );
        } catch {}

        return {
          data: summaries,
          isStale: false,
          source: 'SERVER_PROXY',
          cachedAt: json.fetchedAt,
        };
      }
    }
  } catch (proxyErr) {
    console.warn('[COT Client] Server proxy unreachable, attempting direct CFTC fetch:', proxyErr);
  }

  // 2. Direct CFTC fallback (if client-side or server proxy failed)
  try {
    const codes = COT_MARKETS.map((m) => `'${m.code}'`).join(',');
    const whereClause = `cftc_contract_market_code in (${codes})`;
    const selectFields = [
      COT_COLUMN_MAPPINGS.contractMarketCode,
      COT_COLUMN_MAPPINGS.marketAndExchangeNames,
      COT_COLUMN_MAPPINGS.reportDate,
      COT_COLUMN_MAPPINGS.openInterest,
      COT_COLUMN_MAPPINGS.nonCommLong,
      COT_COLUMN_MAPPINGS.nonCommShort,
      COT_COLUMN_MAPPINGS.commLong,
      COT_COLUMN_MAPPINGS.commShort,
      COT_COLUMN_MAPPINGS.changeNonCommLong,
      COT_COLUMN_MAPPINGS.changeNonCommShort,
      COT_COLUMN_MAPPINGS.changeCommLong,
      COT_COLUMN_MAPPINGS.changeCommShort,
      COT_COLUMN_MAPPINGS.changeOpenInterest,
    ].join(',');

    const directUrl = `${CFTC_API_CONFIG.baseUrl}/${CFTC_API_CONFIG.datasetId}.json?$select=${selectFields}&$where=${encodeURIComponent(whereClause)}&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=500`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (CFTC_API_CONFIG.appToken) headers['X-App-Token'] = CFTC_API_CONFIG.appToken;

    const directRes = await fetch(directUrl, { headers, signal: AbortSignal.timeout(10000) });
    if (directRes.ok) {
      const rawRows: RawCotRow[] = await directRes.json();
      if (Array.isArray(rawRows) && rawRows.length > 0) {
        const marketRowsMap = new Map<string, RawCotRow[]>();
        for (const row of rawRows) {
          const code = String(row.cftc_contract_market_code || '').trim();
          if (!code) continue;
          const list = marketRowsMap.get(code) || [];
          list.push(row);
          marketRowsMap.set(code, list);
        }

        const summaries: CotMarketSummary[] = [];
        for (const market of COT_MARKETS) {
          const rows = marketRowsMap.get(market.code) || [];
          if (rows.length === 0) continue;
          const processed = processCotHistory(rows);
          if (processed.length === 0) continue;

          summaries.push({
            market,
            latest: processed[processed.length - 1],
            previous: processed.length > 1 ? processed[processed.length - 2] : undefined,
            hasData: true,
            historyCount: processed.length,
          });
        }

        if (summaries.length > 0) {
          try {
            localStorage.setItem(
              CACHE_KEY_LATEST,
              JSON.stringify({ data: summaries, timestamp: new Date().toISOString() })
            );
          } catch {}

          return {
            data: summaries,
            isStale: false,
            source: 'DIRECT_CFTC',
            cachedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch (directErr: any) {
    console.warn('[COT Client] Direct CFTC fetch failed:', directErr);
  }

  // 3. Fallback to cached data if network failed
  if (cachedData && cachedData.length > 0) {
    return {
      data: cachedData,
      isStale: true,
      source: 'LOCAL_CACHE',
      cachedAt: cachedTimestamp,
      error: 'Network request failed. Showing last saved dataset.',
    };
  }

  throw new Error('Unable to connect to CFTC Public Reporting Environment. Please verify internet connection or try again.');
}

/**
 * Fetch full historical records for a specific market code (lazy loading)
 */
export async function fetchCotMarketHistory(marketCode: string, force = false): Promise<CotFetchResult<CotRecord[]>> {
  const cacheKey = `${CACHE_KEY_HISTORY_PREFIX}${marketCode}`;

  let cachedHistory: CotRecord[] | null = null;
  let cachedTimestamp: string | undefined;

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
        cachedHistory = parsed.data;
        cachedTimestamp = parsed.timestamp;
      }
    }
  } catch {}

  // 1. Try server proxy
  try {
    const proxyUrl = `/api/cot/history/${encodeURIComponent(marketCode)}${force ? '?force=true' : ''}`;
    const proxyRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });

    if (proxyRes.ok) {
      const json = await proxyRes.json();
      if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({ data: json.data, timestamp: new Date().toISOString() })
          );
        } catch {}

        return {
          data: json.data,
          isStale: false,
          source: 'SERVER_PROXY',
          cachedAt: new Date().toISOString(),
        };
      }
    }
  } catch (proxyErr) {
    console.warn(`[COT Client] Server history proxy unreachable for ${marketCode}:`, proxyErr);
  }

  // 2. Direct CFTC SODA API fallback
  try {
    const whereClause = `cftc_contract_market_code='${marketCode}'`;
    const selectFields = [
      COT_COLUMN_MAPPINGS.contractMarketCode,
      COT_COLUMN_MAPPINGS.marketAndExchangeNames,
      COT_COLUMN_MAPPINGS.reportDate,
      COT_COLUMN_MAPPINGS.openInterest,
      COT_COLUMN_MAPPINGS.nonCommLong,
      COT_COLUMN_MAPPINGS.nonCommShort,
      COT_COLUMN_MAPPINGS.commLong,
      COT_COLUMN_MAPPINGS.commShort,
      COT_COLUMN_MAPPINGS.changeNonCommLong,
      COT_COLUMN_MAPPINGS.changeNonCommShort,
      COT_COLUMN_MAPPINGS.changeCommLong,
      COT_COLUMN_MAPPINGS.changeCommShort,
      COT_COLUMN_MAPPINGS.changeOpenInterest,
    ].join(',');

    const directUrl = `${CFTC_API_CONFIG.baseUrl}/${CFTC_API_CONFIG.datasetId}.json?$select=${selectFields}&$where=${encodeURIComponent(whereClause)}&$order=report_date_as_yyyy_mm_dd%20ASC&$limit=5000`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (CFTC_API_CONFIG.appToken) headers['X-App-Token'] = CFTC_API_CONFIG.appToken;

    const directRes = await fetch(directUrl, { headers, signal: AbortSignal.timeout(12000) });
    if (directRes.ok) {
      const rawRows: RawCotRow[] = await directRes.json();
      if (Array.isArray(rawRows) && rawRows.length > 0) {
        const processed = processCotHistory(rawRows);
        if (processed.length > 0) {
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({ data: processed, timestamp: new Date().toISOString() })
            );
          } catch {}

          return {
            data: processed,
            isStale: false,
            source: 'DIRECT_CFTC',
            cachedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch (directErr: any) {
    console.warn(`[COT Client] Direct CFTC history fetch failed for ${marketCode}:`, directErr);
  }

  if (cachedHistory && cachedHistory.length > 0) {
    return {
      data: cachedHistory,
      isStale: true,
      source: 'LOCAL_CACHE',
      cachedAt: cachedTimestamp,
      error: 'Network unavailable. Displaying cached history.',
    };
  }

  throw new Error(`Unable to load historical positioning for market ${marketCode}.`);
}

/**
 * Check CFTC release status and compute expected release schedule
 */
export async function checkCotReleaseStatus(currentReportDate: string | null): Promise<CotReleaseStatus> {
  let latestDateOnServer: string | null = currentReportDate;

  try {
    const res = await fetch('/api/cot/status', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const json = await res.json();
      if (json.latestReportDate) {
        latestDateOnServer = json.latestReportDate;
      }
    }
  } catch {
    // Non-blocking
  }

  const now = new Date();
  const nextRelease = getNextExpectedRelease(latestDateOnServer, now);
  const isDue = isCotReportDue(latestDateOnServer, now);

  return {
    latestReportDate: latestDateOnServer,
    latestTuesdayDate: extractDateString(latestDateOnServer) || '',
    isDue,
    lastReleaseTimestamp: now.getTime(),
    nextExpectedReleaseUtc: nextRelease.nextReleaseDate.toISOString(),
    nextExpectedReleaseLocalFormatted: nextRelease.formattedLocal,
    statusText: isDue ? 'Pending release' : 'Up to date',
    isPollingFast: isDue,
  };
}
