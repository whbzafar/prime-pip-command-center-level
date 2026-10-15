import { RawCotRow, CotRecord, CotIndexResult, CotLookbackPeriod, CotReleaseStatus } from '../types/cotTypes';
import { COT_COLUMN_MAPPINGS } from '../config/cotConfig';

/**
 * Safely parse an integer from various CFTC formats (string, number, with signs/spaces)
 */
export function parseIntegerSafe(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? Math.round(val) : null;
  }
  const str = String(val).trim();
  if (str === '' || str === '—' || str === '-') return null;
  const cleaned = str.replace(/[^0-9.-]/g, '');
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  return Number.isFinite(num) ? num : null;
}

/**
 * Extract clean date YYYY-MM-DD from CFTC report date string (e.g. "2026-10-06T00:00:00.000")
 */
export function extractDateString(dateVal: any): string | null {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Validate and sanitize a single raw CFTC row
 */
export function parseAndValidateCotRow(row: RawCotRow): { record: Omit<CotRecord, 'changeNonCommLong' | 'changeNonCommShort' | 'changeNonCommNet' | 'changeCommLong' | 'changeCommShort' | 'changeCommNet' | 'changeOpenInterest'> | null; warning?: string } {
  const code = String(row[COT_COLUMN_MAPPINGS.contractMarketCode] || row.cftc_contract_market_code || '').trim();
  const rawDate = row[COT_COLUMN_MAPPINGS.reportDate] || row.report_date_as_yyyy_mm_dd;
  const reportDate = extractDateString(rawDate);

  if (!code || !reportDate) {
    return { record: null, warning: 'Missing market code or report date' };
  }

  const ncLong = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.nonCommLong] ?? row.noncomm_positions_long_all);
  const ncShort = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.nonCommShort] ?? row.noncomm_positions_short_all);
  const cLong = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.commLong] ?? row.comm_positions_long_all);
  const cShort = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.commShort] ?? row.comm_positions_short_all);
  const oi = parseIntegerSafe(row[COT_COLUMN_MAPPINGS.openInterest] ?? row.open_interest_all) ?? 0;

  // Reject rows with null or invalid non-commercial positions
  if (ncLong === null || ncShort === null) {
    return { record: null, warning: `Null/invalid non-commercial positions for market ${code} on ${reportDate}` };
  }

  const warnings: string[] = [];
  if (ncLong < 0) warnings.push('Non-commercial long < 0');
  if (ncShort < 0) warnings.push('Non-commercial short < 0');
  if (cLong !== null && cLong < 0) warnings.push('Commercial long < 0');
  if (cShort !== null && cShort < 0) warnings.push('Commercial short < 0');
  if (oi > 0 && (ncLong > oi || ncShort > oi)) {
    warnings.push('Position exceeds total open interest');
  }

  const marketName = String(
    row[COT_COLUMN_MAPPINGS.marketAndExchangeNames] ||
    row.market_and_exchange_names ||
    row[COT_COLUMN_MAPPINGS.contractMarketName] ||
    code
  ).trim();

  const timestamp = new Date(reportDate + 'T12:00:00Z').getTime();

  return {
    record: {
      marketCode: code,
      marketName,
      reportDate,
      timestamp,
      openInterest: oi,
      nonCommLong: Math.max(0, ncLong),
      nonCommShort: Math.max(0, ncShort),
      nonCommNet: ncLong - ncShort,
      commLong: Math.max(0, cLong ?? 0),
      commShort: Math.max(0, cShort ?? 0),
      commNet: (cLong ?? 0) - (cShort ?? 0),
      dataWarning: warnings.length > 0 ? warnings.join('; ') : undefined,
    },
    warning: warnings.length > 0 ? warnings.join('; ') : undefined,
  };
}

/**
 * Clean, deduplicate, sort chronologically (ascending), and calculate consecutive weekly changes
 */
export function processCotHistory(rawRows: RawCotRow[]): CotRecord[] {
  const seenDates = new Set<string>();
  const parsedRows: Array<Omit<CotRecord, 'changeNonCommLong' | 'changeNonCommShort' | 'changeNonCommNet' | 'changeCommLong' | 'changeCommShort' | 'changeCommNet' | 'changeOpenInterest'> & { rawRow: RawCotRow }> = [];

  for (const raw of rawRows) {
    const { record, warning } = parseAndValidateCotRow(raw);
    if (!record) continue;
    if (seenDates.has(record.reportDate)) {
      // Remove duplicate date entry
      continue;
    }
    seenDates.add(record.reportDate);
    parsedRows.push({ ...record, rawRow: raw });
  }

  // Sort ascending chronologically (oldest to newest)
  parsedRows.sort((a, b) => a.timestamp - b.timestamp);

  const results: CotRecord[] = [];

  for (let i = 0; i < parsedRows.length; i++) {
    const curr = parsedRows[i];
    const prev = i > 0 ? parsedRows[i - 1] : null;

    // Check for week gaps > 10 days
    let hasGap = false;
    if (prev) {
      const daysDiff = (curr.timestamp - prev.timestamp) / (1000 * 60 * 60 * 24);
      if (daysDiff > 10) {
        hasGap = true;
      }
    }

    // Consecutive weekly calculated changes
    const computedChangeNcLong = prev ? curr.nonCommLong - prev.nonCommLong : 0;
    const computedChangeNcShort = prev ? curr.nonCommShort - prev.nonCommShort : 0;
    const computedChangeNcNet = prev ? curr.nonCommNet - prev.nonCommNet : 0;

    const computedChangeCommLong = prev ? curr.commLong - prev.commLong : 0;
    const computedChangeCommShort = prev ? curr.commShort - prev.commShort : 0;
    const computedChangeCommNet = prev ? curr.commNet - prev.commNet : 0;

    const computedChangeOi = prev ? curr.openInterest - prev.openInterest : 0;

    // Cross-check against CFTC reported change fields
    const reportedChangeNcLong = parseIntegerSafe(curr.rawRow[COT_COLUMN_MAPPINGS.changeNonCommLong]);
    const reportedChangeNcShort = parseIntegerSafe(curr.rawRow[COT_COLUMN_MAPPINGS.changeNonCommShort]);

    let hasDiscrepancy = false;
    let discrepancyDetails: string | undefined;

    if (
      prev &&
      reportedChangeNcLong !== null &&
      reportedChangeNcLong !== computedChangeNcLong
    ) {
      hasDiscrepancy = true;
      discrepancyDetails = `CFTC reported ΔLong ${reportedChangeNcLong} vs computed ${computedChangeNcLong}. Using verified consecutive computed value.`;
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[COT Discrepancy] ${curr.marketCode} on ${curr.reportDate}: ${discrepancyDetails}`);
      }
    }

    results.push({
      marketCode: curr.marketCode,
      marketName: curr.marketName,
      reportDate: curr.reportDate,
      timestamp: curr.timestamp,
      openInterest: curr.openInterest,
      nonCommLong: curr.nonCommLong,
      nonCommShort: curr.nonCommShort,
      nonCommNet: curr.nonCommNet,
      commLong: curr.commLong,
      commShort: curr.commShort,
      commNet: curr.commNet,
      changeNonCommLong: computedChangeNcLong,
      changeNonCommShort: computedChangeNcShort,
      changeNonCommNet: computedChangeNcNet,
      changeCommLong: computedChangeCommLong,
      changeCommShort: computedChangeCommShort,
      changeCommNet: computedChangeCommNet,
      changeOpenInterest: computedChangeOi,
      hasDiscrepancy,
      discrepancyDetails,
      hasGap,
      dataWarning: curr.dataWarning,
    });
  }

  return results;
}

/**
 * Calculate the COT Index ("Smart Money Meter")
 * Formula: COT Index = (current net - min net) / (max net - min net) * 100
 */
export function calculateCotIndex(
  currentNet: number,
  historicalNets: number[]
): CotIndexResult {
  if (!historicalNets || historicalNets.length === 0) {
    return {
      index: null,
      minNet: currentNet,
      maxNet: currentNet,
      currentNet,
      lookbackCount: 0,
      status: 'INSUFFICIENT_DATA',
      zone: 'UNKNOWN',
    };
  }

  const allNets = [...historicalNets, currentNet];
  let min = allNets[0];
  let max = allNets[0];

  for (let i = 1; i < allNets.length; i++) {
    if (allNets[i] < min) min = allNets[i];
    if (allNets[i] > max) max = allNets[i];
  }

  if (max === min) {
    return {
      index: null,
      minNet: min,
      maxNet: max,
      currentNet,
      lookbackCount: allNets.length,
      status: 'FLAT_RANGE',
      zone: 'UNKNOWN',
    };
  }

  const rawIndex = ((currentNet - min) / (max - min)) * 100;
  // Clamp between 0 and 100
  const index = Math.max(0, Math.min(100, Math.round(rawIndex * 10) / 10));

  let zone: CotIndexResult['zone'] = 'NEUTRAL';
  if (index >= 80) zone = 'EXTREME_LONG';
  else if (index <= 20) zone = 'EXTREME_SHORT';

  return {
    index,
    minNet: min,
    maxNet: max,
    currentNet,
    lookbackCount: allNets.length,
    status: 'VALID',
    zone,
  };
}

/**
 * Filter historical records by lookback range
 */
export function filterRecordsByLookback(
  records: CotRecord[],
  lookback: CotLookbackPeriod
): CotRecord[] {
  if (lookback === 'MAX' || records.length === 0) return records;

  const latestTs = records[records.length - 1].timestamp;
  let years = 3;
  if (lookback === '1Y') years = 1;
  else if (lookback === '3Y') years = 3;
  else if (lookback === '5Y') years = 5;

  const cutoff = latestTs - years * 365.25 * 24 * 60 * 60 * 1000;
  const filtered = records.filter((r) => r.timestamp >= cutoff);
  // Ensure we at least return whatever records exist
  return filtered.length > 0 ? filtered : records;
}

/**
 * Timezone & Release Schedule Engine
 * Normal schedule: Positions as of Tuesday, released Friday 3:30 PM America/New_York (ET).
 */

/**
 * Get current time in America/New_York
 */
export function getNewYorkParts(now: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, 2 = Tuesday, 5 = Friday
  isoDate: string;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) partMap[p.type] = p.value;

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);

  const weekdayStr = partMap.weekday;
  const daysMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dayOfWeek = daysMap[weekdayStr] ?? 0;

  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { year, month, day, hour, minute, dayOfWeek, isoDate };
}

/**
 * Find the most recent Tuesday date (YYYY-MM-DD) in America/New_York
 */
export function getMostRecentTuesdayDate(now: Date = new Date()): string {
  const ny = getNewYorkParts(now);
  // How many days since Tuesday?
  // 0(Sun) -> 5 days ago
  // 1(Mon) -> 6 days ago
  // 2(Tue) -> 0 days ago (today)
  // 3(Wed) -> 1 day ago
  // 4(Thu) -> 2 days ago
  // 5(Fri) -> 3 days ago
  // 6(Sat) -> 4 days ago
  const daysSinceTuesday = (ny.dayOfWeek + 7 - 2) % 7;
  
  // Create Date at noon UTC, subtract days
  const baseDate = new Date(Date.UTC(ny.year, ny.month - 1, ny.day, 12, 0, 0));
  baseDate.setUTCDate(baseDate.getUTCDate() - daysSinceTuesday);

  const y = baseDate.getUTCFullYear();
  const m = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(baseDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Determine if a COT report is due right now
 * A report is due when the latest stored report date is older than the most recent Tuesday
 * and it is past Friday 3:30 PM ET (or any later day until data arrives).
 */
export function isCotReportDue(latestReportDate: string | null, now: Date = new Date()): boolean {
  if (!latestReportDate) return true;

  const mostRecentTuesday = getMostRecentTuesdayDate(now);
  if (latestReportDate >= mostRecentTuesday) {
    // Current week's report is already released
    return false;
  }

  // Current week's report is not yet in our data.
  // Check if we are past Friday 15:30 ET of this cycle.
  const ny = getNewYorkParts(now);
  const isPastFriday1530 =
    ny.dayOfWeek > 5 || // Saturday (6) or Sunday (0)
    (ny.dayOfWeek === 5 && (ny.hour > 15 || (ny.hour === 15 && ny.minute >= 30))) ||
    (ny.dayOfWeek === 1 || ny.dayOfWeek === 2 || ny.dayOfWeek === 3 || ny.dayOfWeek === 4); // Mon-Thu waiting for previous Tuesday release

  return isPastFriday1530;
}

/**
 * Get next expected release date & time in local user format
 */
export function getNextExpectedRelease(latestReportDate: string | null, now: Date = new Date()): {
  nextReleaseDate: Date;
  formattedLocal: string;
  isPending: boolean;
} {
  const ny = getNewYorkParts(now);
  const isDue = isCotReportDue(latestReportDate, now);

  // If Friday before 15:30 ET -> this Friday 15:30 ET
  // If Friday after 15:30 ET and isDue -> Pending immediate release
  // Otherwise next Friday 15:30 ET
  const daysUntilFriday = (5 - ny.dayOfWeek + 7) % 7;
  
  // Approximate Friday 15:30 NY in UTC (handles EDT UTC-4 / EST UTC-5 dynamically)
  const targetDate = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
  const targetNy = getNewYorkParts(targetDate);
  
  // Construct Date object for target Friday at 15:30 NY time
  // Using Intl format string to parse into local Date cleanly
  const fridayIso = `${targetNy.year}-${String(targetNy.month).padStart(2, '0')}-${String(targetNy.day).padStart(2, '0')}`;
  
  // New York offset estimate
  const testDate = new Date(`${fridayIso}T19:30:00Z`); // 19:30 UTC = 15:30 EDT or 14:30 EST
  const nyTest = getNewYorkParts(testDate);
  const hourDiff = 15 - nyTest.hour;
  const exactReleaseUtc = new Date(testDate.getTime() + hourDiff * 3600 * 1000 + (30 - nyTest.minute) * 60 * 1000);

  const localFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return {
    nextReleaseDate: exactReleaseUtc,
    formattedLocal: localFormatter.format(exactReleaseUtc),
    isPending: isDue,
  };
}
