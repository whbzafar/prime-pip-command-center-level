import { Router, Request, Response } from 'express';
import { COT_MARKETS, CFTC_API_CONFIG, COT_COLUMN_MAPPINGS } from '../src/config/cotConfig.js';
import { processCotHistory, parseAndValidateCotRow } from '../src/utils/cotCalculations.js';
import { RawCotRow } from '../src/types/cotTypes.js';

const router = Router();

// In-memory server cache
let cachedLatestDate: string | null = null;
let lastDateCheckTimestamp = 0;

let cachedMarketSnapshots: {
  records: any[];
  timestamp: number;
} | null = null;

const historyCache = new Map<string, { data: any[]; timestamp: number }>();

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes for market snapshots
const HISTORY_TTL_MS = 60 * 60 * 1000; // 1 hour for historical series
const DATE_CHECK_TTL_MS = 45 * 1000; // 45 seconds for latest report date check

function getCftcHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const token = CFTC_API_CONFIG.appToken || process.env.CFTC_APP_TOKEN || process.env.SOCRATA_APP_TOKEN;
  if (token) {
    headers['X-App-Token'] = token;
  }
  return headers;
}

/**
 * Verify CFTC dataset availability and column names at server startup
 */
export async function verifyCftcDatasetAtBoot(): Promise<{ ok: boolean; columns: string[]; error?: string }> {
  try {
    const url = `${CFTC_API_CONFIG.baseUrl}/${CFTC_API_CONFIG.datasetId}.json?$limit=1`;
    const res = await fetch(url, {
      headers: getCftcHeaders(),
      signal: AbortSignal.timeout(CFTC_API_CONFIG.timeoutMs),
    });
    if (!res.ok) {
      const err = `CFTC SODA API returned HTTP ${res.status}`;
      console.warn(`[CFTC Boot Warning] ${err}`);
      return { ok: false, columns: [], error: err };
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return { ok: false, columns: [], error: 'Empty dataset response from CFTC' };
    }
    const sampleRow = data[0];
    const columns = Object.keys(sampleRow);
    
    // Check critical columns
    const requiredCols = [
      COT_COLUMN_MAPPINGS.contractMarketCode,
      COT_COLUMN_MAPPINGS.reportDate,
      COT_COLUMN_MAPPINGS.nonCommLong,
      COT_COLUMN_MAPPINGS.nonCommShort,
    ];
    const missing = requiredCols.filter((col) => !columns.includes(col));
    if (missing.length > 0) {
      console.error(`[CFTC Boot Error] Missing critical columns: ${missing.join(', ')}`);
      return { ok: false, columns, error: `Missing columns: ${missing.join(', ')}` };
    }
    console.log(`[CFTC Boot] Verified dataset ${CFTC_API_CONFIG.datasetId} with ${columns.length} columns.`);
    return { ok: true, columns };
  } catch (err: any) {
    console.warn(`[CFTC Boot Warning] Could not verify dataset at boot: ${err?.message || err}`);
    return { ok: false, columns: [], error: err?.message || 'Network error' };
  }
}

/**
 * Lightweight check for the latest available report date in the CFTC dataset
 */
export async function fetchLatestReportDate(force = false): Promise<string | null> {
  const now = Date.now();
  if (!force && cachedLatestDate && now - lastDateCheckTimestamp < DATE_CHECK_TTL_MS) {
    return cachedLatestDate;
  }

  try {
    const url = `${CFTC_API_CONFIG.baseUrl}/${CFTC_API_CONFIG.datasetId}.json?$select=report_date_as_yyyy_mm_dd&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=1`;
    const res = await fetch(url, {
      headers: getCftcHeaders(),
      signal: AbortSignal.timeout(CFTC_API_CONFIG.timeoutMs),
    });
    if (!res.ok) return cachedLatestDate;
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0]?.report_date_as_yyyy_mm_dd) {
      const rawDate = data[0].report_date_as_yyyy_mm_dd;
      const match = String(rawDate).match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) {
        cachedLatestDate = match[1];
        lastDateCheckTimestamp = now;
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return cachedLatestDate;
}

/**
 * GET /api/cot/status
 */
router.get('/status', async (_req: Request, res: Response) => {
  const latestDate = await fetchLatestReportDate();
  return res.json({
    ok: true,
    datasetId: CFTC_API_CONFIG.datasetId,
    verifiedMarketsCount: COT_MARKETS.length,
    latestReportDate: latestDate,
    hasToken: Boolean(CFTC_API_CONFIG.appToken || process.env.CFTC_APP_TOKEN),
    checkedAt: new Date().toISOString(),
  });
});

/**
 * GET /api/cot/latest
 * Fetches recent snapshot (last 2-3 reports) for all supported markets to display list & weekly change
 */
router.get('/latest', async (req: Request, res: Response) => {
  const force = req.query.force === 'true';
  const now = Date.now();

  if (!force && cachedMarketSnapshots && now - cachedMarketSnapshots.timestamp < CACHE_TTL_MS) {
    return res.json({
      ok: true,
      cached: true,
      fetchedAt: new Date(cachedMarketSnapshots.timestamp).toISOString(),
      data: cachedMarketSnapshots.records,
    });
  }

  try {
    // Construct SODA WHERE clause for all market codes
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

    // Fetch the latest 500 rows ordered by date descending (covers recent 5-10 weeks for all ~42 markets)
    const url = `${CFTC_API_CONFIG.baseUrl}/${CFTC_API_CONFIG.datasetId}.json?$select=${selectFields}&$where=${encodeURIComponent(whereClause)}&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=500`;

    const response = await fetch(url, {
      headers: getCftcHeaders(),
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      throw new Error(`CFTC SODA API returned HTTP ${response.status}`);
    }

    const rawRows: RawCotRow[] = await response.json();
    if (!Array.isArray(rawRows)) {
      throw new Error('Invalid JSON array from CFTC');
    }

    // Group rows by marketCode
    const marketRowsMap = new Map<string, RawCotRow[]>();
    for (const row of rawRows) {
      const code = String(row.cftc_contract_market_code || '').trim();
      if (!code) continue;
      const list = marketRowsMap.get(code) || [];
      list.push(row);
      marketRowsMap.set(code, list);
    }

    const summaries: any[] = [];
    for (const market of COT_MARKETS) {
      const rows = marketRowsMap.get(market.code) || [];
      if (rows.length === 0) {
        continue;
      }
      // Process consecutive history
      const processed = processCotHistory(rows);
      if (processed.length === 0) continue;

      const latest = processed[processed.length - 1];
      const previous = processed.length > 1 ? processed[processed.length - 2] : undefined;

      summaries.push({
        market,
        latest,
        previous,
        hasData: true,
        historyCount: processed.length,
      });
    }

    cachedMarketSnapshots = {
      records: summaries,
      timestamp: now,
    };

    if (summaries.length > 0 && summaries[0]?.latest?.reportDate) {
      cachedLatestDate = summaries[0].latest.reportDate;
    }

    return res.json({
      ok: true,
      cached: false,
      fetchedAt: new Date(now).toISOString(),
      data: summaries,
    });
  } catch (err: any) {
    // If cache exists, return stale cache with warning
    if (cachedMarketSnapshots) {
      return res.json({
        ok: true,
        cached: true,
        stale: true,
        error: err?.message,
        fetchedAt: new Date(cachedMarketSnapshots.timestamp).toISOString(),
        data: cachedMarketSnapshots.records,
      });
    }
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Failed to fetch COT market snapshots',
    });
  }
});

/**
 * GET /api/cot/history/:marketCode
 * Fetches historical records for a specific market with lazy pagination
 */
router.get('/history/:marketCode', async (req: Request, res: Response) => {
  const code = String(req.params.marketCode).trim();
  const force = req.query.force === 'true';
  const now = Date.now();

  const cached = historyCache.get(code);
  if (!force && cached && now - cached.timestamp < HISTORY_TTL_MS) {
    return res.json({
      ok: true,
      cached: true,
      marketCode: code,
      data: cached.data,
    });
  }

  try {
    const whereClause = `cftc_contract_market_code='${code}'`;
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

    // Fetch up to 5000 historical records ordered by date ascending
    const url = `${CFTC_API_CONFIG.baseUrl}/${CFTC_API_CONFIG.datasetId}.json?$select=${selectFields}&$where=${encodeURIComponent(whereClause)}&$order=report_date_as_yyyy_mm_dd%20ASC&$limit=5000`;

    const response = await fetch(url, {
      headers: getCftcHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`CFTC SODA API returned HTTP ${response.status}`);
    }

    const rawRows: RawCotRow[] = await response.json();
    if (!Array.isArray(rawRows)) {
      throw new Error('Invalid JSON array from CFTC');
    }

    const processed = processCotHistory(rawRows);

    historyCache.set(code, {
      data: processed,
      timestamp: now,
    });

    return res.json({
      ok: true,
      cached: false,
      marketCode: code,
      count: processed.length,
      data: processed,
    });
  } catch (err: any) {
    if (cached) {
      return res.json({
        ok: true,
        cached: true,
        stale: true,
        error: err?.message,
        marketCode: code,
        data: cached.data,
      });
    }
    return res.status(500).json({
      ok: false,
      error: err?.message || `Failed to fetch COT history for ${code}`,
    });
  }
});

export default router;
export { router as cotRouter };
