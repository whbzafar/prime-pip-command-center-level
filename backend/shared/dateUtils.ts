/**
 * UTC Date and Timestamp Utilities for Pro Fundamentals
 */

/**
 * Formats a Date or timestamp as YYYY-MM-DD in UTC.
 */
export function formatUtcDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided: ${date}`);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Checks if a YYYY-MM-DD string is in the future relative to UTC today.
 */
export function isFutureDate(dateStr: string): boolean {
  const todayUtc = new Date().toISOString().slice(0, 10);
  return dateStr > todayUtc;
}

/**
 * Calculates a date N days in the past as YYYY-MM-DD in UTC.
 */
export function subtractDaysUtc(days: number, fromDate: Date = new Date()): string {
  const d = new Date(fromDate.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculates a date N years in the past as YYYY-MM-DD in UTC.
 */
export function subtractYearsUtc(years: number, fromDate: Date = new Date()): string {
  const d = new Date(fromDate.getTime());
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculates the previous Tuesday report date for a given date.
 * CFTC positions are measured as of Tuesday.
 */
export function getPreviousTuesday(fromDate: Date = new Date()): string {
  const d = new Date(fromDate.getTime());
  const day = d.getUTCDay(); // 0 is Sunday, 2 is Tuesday
  const diff = (day + 7 - 2) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Calculates Friday release timestamp for a CFTC Tuesday report date.
 * CFTC reports are released on Friday afternoon US Eastern (15:30 ET).
 * Standardized to 20:30:00Z (EDT is UTC-4 -> 19:30Z, EST is UTC-5 -> 20:30Z).
 * We document and standardize release timestamp as Friday 20:30:00Z.
 */
export function calculateCftcReleaseTimestamp(tuesdayReportDate: string): string {
  const d = new Date(tuesdayReportDate + 'T00:00:00Z');
  // Tuesday + 3 days = Friday
  d.setUTCDate(d.getUTCDate() + 3);
  const fridayStr = d.toISOString().slice(0, 10);
  return `${fridayStr}T20:30:00Z`;
}
