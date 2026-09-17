/**
 * Centralized Global Time & Market Session Engine for PRIMEPIPFX Trading Command Center
 * 
 * Supports:
 * 1. Standard IANA Timezones (Auto-detected browser timezone by default, fully user-customizable)
 * 2. 12-Hour (AM/PM) and 24-Hour Time Format preferences
 * 3. Real-time Market Sessions (Sydney, Tokyo, London, New York, London/NY Overlap)
 * 4. UTC timestamps for authoritative trade storage and cross-timezone consistency
 * 5. Full backwards compatibility with existing callers
 * 6. Strict Pakistan Standard Time (Asia/Karachi) daily trade limit helpers
 */

export const DEFAULT_FALLBACK_TIMEZONE = 'Asia/Karachi';

export interface TimezoneOption {
  value: string;
  label: string;
  city: string;
  country: string;
  region: string;
  utcOffsetStr: string;
}

export const GLOBAL_TRADING_HUBS: TimezoneOption[] = [
  { value: 'America/New_York', label: 'New York (Wall Street, NYSE/CME)', city: 'New York', country: 'United States', region: 'Americas', utcOffsetStr: 'UTC-5 / -4' },
  { value: 'Europe/London', label: 'London (The City, LSE/Forex Core)', city: 'London', country: 'United Kingdom', region: 'Europe', utcOffsetStr: 'UTC+0 / +1' },
  { value: 'Asia/Tokyo', label: 'Tokyo (TSE, Asian Core)', city: 'Tokyo', country: 'Japan', region: 'Asia-Pacific', utcOffsetStr: 'UTC+9' },
  { value: 'Australia/Sydney', label: 'Sydney (ASX, Pacific Session)', city: 'Sydney', country: 'Australia', region: 'Asia-Pacific', utcOffsetStr: 'UTC+10 / +11' },
  { value: 'Asia/Dubai', label: 'Dubai (DFM/DGCX, Gulf Hub)', city: 'Dubai', country: 'United Arab Emirates', region: 'Middle East', utcOffsetStr: 'UTC+4' },
  { value: 'Asia/Singapore', label: 'Singapore (SGX, Forex Hub)', city: 'Singapore', country: 'Singapore', region: 'Asia-Pacific', utcOffsetStr: 'UTC+8' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKEX)', city: 'Hong Kong', country: 'Hong Kong', region: 'Asia-Pacific', utcOffsetStr: 'UTC+8' },
  { value: 'Europe/Frankfurt', label: 'Frankfurt (Deutsche Börse / ECB)', city: 'Frankfurt', country: 'Germany', region: 'Europe', utcOffsetStr: 'UTC+1 / +2' },
  { value: 'Europe/Zurich', label: 'Zurich (SIX Swiss Exchange)', city: 'Zurich', country: 'Switzerland', region: 'Europe', utcOffsetStr: 'UTC+1 / +2' },
  { value: 'Asia/Karachi', label: 'Karachi / Islamabad (PSX, PKT)', city: 'Karachi', country: 'Pakistan', region: 'South Asia', utcOffsetStr: 'UTC+5' },
  { value: 'America/Chicago', label: 'Chicago (CME / CBOT Futures)', city: 'Chicago', country: 'United States', region: 'Americas', utcOffsetStr: 'UTC-6 / -5' },
  { value: 'America/Los_Angeles', label: 'Los Angeles / San Francisco', city: 'Los Angeles', country: 'United States', region: 'Americas', utcOffsetStr: 'UTC-8 / -7' },
  { value: 'America/Toronto', label: 'Toronto (TSX)', city: 'Toronto', country: 'Canada', region: 'Americas', utcOffsetStr: 'UTC-5 / -4' },
  { value: 'Asia/Riyadh', label: 'Riyadh (Tadawul)', city: 'Riyadh', country: 'Saudi Arabia', region: 'Middle East', utcOffsetStr: 'UTC+3' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (Bursa)', city: 'Kuala Lumpur', country: 'Malaysia', region: 'Asia-Pacific', utcOffsetStr: 'UTC+8' },
  { value: 'Africa/Cairo', label: 'Cairo (EGX)', city: 'Cairo', country: 'Egypt', region: 'Africa', utcOffsetStr: 'UTC+2 / +3' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (JSE)', city: 'Johannesburg', country: 'South Africa', region: 'Africa', utcOffsetStr: 'UTC+2' },
  { value: 'Europe/Istanbul', label: 'Istanbul (Borsa Istanbul)', city: 'Istanbul', country: 'Turkey', region: 'Europe', utcOffsetStr: 'UTC+3' },
  { value: 'Pacific/Auckland', label: 'Auckland / Wellington (NZX)', city: 'Auckland', country: 'New Zealand', region: 'Asia-Pacific', utcOffsetStr: 'UTC+12 / +13' },
  { value: 'UTC', label: 'UTC / GMT (Universal Coordinated Time)', city: 'Greenwich', country: 'International', region: 'Universal', utcOffsetStr: 'UTC+0' },
];

/**
 * Auto-detect user's browser timezone or retrieve saved preference
 */
export function getUserTimezone(): string {
  if (typeof window === 'undefined') return DEFAULT_FALLBACK_TIMEZONE;
  try {
    const saved = localStorage.getItem('primepipfx_user_timezone');
    if (saved && isValidTimezone(saved)) {
      return saved;
    }
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && isValidTimezone(detected)) {
      return detected;
    }
  } catch {
    // Fallback
  }
  return DEFAULT_FALLBACK_TIMEZONE;
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function setUserTimezone(tz: string): void {
  if (typeof window === 'undefined') return;
  if (!isValidTimezone(tz)) return;
  localStorage.setItem('primepipfx_user_timezone', tz);
  window.dispatchEvent(new CustomEvent('primepipfx_timezone_changed', { detail: { timezone: tz } }));
}

/**
 * Get / Set 12h vs 24h format preference
 */
export function getUserTimeFormat(): '12h' | '24h' {
  if (typeof window === 'undefined') return '12h';
  const saved = localStorage.getItem('primepipfx_time_format');
  return saved === '24h' ? '24h' : '12h';
}

export function setUserTimeFormat(format: '12h' | '24h'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('primepipfx_time_format', format);
  window.dispatchEvent(new CustomEvent('primepipfx_timezone_changed', { detail: { format } }));
}

/**
 * Returns a valid Date object from various inputs
 */
function toDate(input?: Date | string | number): Date {
  if (input === undefined || input === null) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Format date (YYYY-MM-DD) in specified or active user timezone
 */
export function getAppDate(dateInput?: Date | string | number, timezone?: string): string {
  const d = toDate(dateInput);
  const tz = timezone || getUserTimezone();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Format time string in 12h (e.g. "02:30 PM") or 24h (e.g. "14:30")
 */
export function getAppTime(
  dateInput?: Date | string | number,
  includeSeconds: boolean = false,
  timezone?: string,
  forceFormat?: '12h' | '24h'
): string {
  const d = toDate(dateInput);
  const tz = timezone || getUserTimezone();
  const is24h = (forceFormat || getUserTimeFormat()) === '24h';

  if (is24h) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: includeSeconds ? '2-digit' : undefined,
      hour12: false,
    }).format(d);
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  }).formatToParts(d);

  let hour = '';
  let minute = '';
  let second = '';
  let dayPeriod = '';

  for (const part of parts) {
    if (part.type === 'hour') hour = part.value.padStart(2, '0');
    if (part.type === 'minute') minute = part.value.padStart(2, '0');
    if (part.type === 'second') second = part.value.padStart(2, '0');
    if (part.type === 'dayPeriod') dayPeriod = part.value.toUpperCase();
  }

  if (includeSeconds && second) {
    return `${hour}:${minute}:${second} ${dayPeriod}`;
  }
  return `${hour}:${minute} ${dayPeriod}`;
}

/**
 * Get short timezone abbreviation or city label for user's timezone
 */
export function getTimezoneLabel(timezone?: string): string {
  const tz = timezone || getUserTimezone();
  const match = GLOBAL_TRADING_HUBS.find((h) => h.value === tz);
  if (match) return match.city;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart) return tzPart.value;
  } catch {
    // Fallback
  }
  return tz.split('/').pop()?.replace(/_/g, ' ') || tz;
}

/**
 * Converts any time string to 12-hour AM/PM format
 */
export function formatTo12Hour(timeStr?: string): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (trimmed.toUpperCase().includes('AM') || trimmed.toUpperCase().includes('PM')) {
    return trimmed.toUpperCase();
  }

  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    let hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    if (isNaN(hour) || isNaN(minute)) return trimmed;

    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    const hourStr = hour.toString().padStart(2, '0');
    const minStr = minute.toString().padStart(2, '0');
    return `${hourStr}:${minStr} ${period}`;
  }

  return trimmed;
}

/**
 * Format Trade Date and Time respecting user's configured timezone and format
 */
export function formatTradeDateTime(
  dateStr: string,
  timeStr?: string,
  options?: {
    showTimezone?: boolean;
    format?: 'standard' | 'friendly' | 'full';
    timezone?: string;
  }
): string {
  const tz = options?.timezone || getUserTimezone();
  const showTz = options?.showTimezone ?? true;
  const style = options?.format ?? 'standard';
  const tzLabel = getTimezoneLabel(tz);

  const cleanTime = timeStr ? (getUserTimeFormat() === '12h' ? formatTo12Hour(timeStr) : timeStr) : '';

  if (style === 'friendly' || style === 'full') {
    try {
      const parsedDate = parseUserDateTime(dateStr, timeStr || '00:00', tz);
      const friendlyDate = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }).format(parsedDate);

      const timeFormatted = cleanTime || getAppTime(parsedDate, false, tz);
      const tzSuffix = showTz ? ` ${tzLabel}` : '';
      return `${friendlyDate} • ${timeFormatted}${tzSuffix}`;
    } catch {
      // Fallback
    }
  }

  const tzSuffix = showTz ? ` ${tzLabel}` : '';
  if (!cleanTime) {
    return `${dateStr}${tzSuffix}`;
  }
  return `${dateStr} • ${cleanTime}${tzSuffix}`;
}

/**
 * Parses date string (YYYY-MM-DD) and time string in specified or user timezone
 */
export function parseUserDateTime(dateStr: string, timeStr: string = '00:00', timezone?: string): Date {
  const tz = timezone || getUserTimezone();
  const cleanDate = dateStr.trim();
  let cleanTime = timeStr.trim();

  if (cleanTime.toUpperCase().includes('AM') || cleanTime.toUpperCase().includes('PM')) {
    const isPM = cleanTime.toUpperCase().includes('PM');
    const timeOnly = cleanTime.replace(/AM|PM/gi, '').trim();
    const parts = timeOnly.split(':');
    let h = parseInt(parts[0], 10) || 0;
    const m = parts[1] || '00';
    const s = parts[2] || '00';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    cleanTime = `${h.toString().padStart(2, '0')}:${m}:${s}`;
  }

  if (cleanTime.length === 5) {
    cleanTime = `${cleanTime}:00`;
  }

  const d = new Date(`${cleanDate}T${cleanTime}`);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}

/**
 * Formats a date for human-readable display
 */
export function formatAppDisplayDate(
  dateInput: Date | string | number = new Date(),
  style: 'short' | 'medium' | 'long' = 'medium',
  timezone?: string
): string {
  const d = toDate(dateInput);
  const tz = timezone || getUserTimezone();

  if (style === 'short') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      month: 'numeric',
      day: 'numeric',
    }).format(d);
  }
  if (style === 'long') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).format(d);
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Returns formatted live clock string for headers and indicators
 */
export function getAppLiveClock(now: Date = new Date(), timezone?: string): {
  time: string;
  date: string;
  badge: string;
  full: string;
  timezone: string;
} {
  const tz = timezone || getUserTimezone();
  const time = getAppTime(now, true, tz);
  const date = formatAppDisplayDate(now, 'medium', tz);
  const label = getTimezoneLabel(tz);
  return {
    time,
    date,
    badge: label,
    full: `${time} ${label} • ${date}`,
    timezone: tz,
  };
}

// ----------------------------------------------------------------------
// MARKET SESSIONS ENGINE
// ----------------------------------------------------------------------

export interface MarketSession {
  id: 'sydney' | 'tokyo' | 'london' | 'new_york' | 'london_ny_overlap';
  name: string;
  city: string;
  flag: string;
  openUtcHour: number;
  closeUtcHour: number;
  isOpen: boolean;
  isPeakLiquidity?: boolean;
  statusText: string;
  timeRemainingStr: string;
  localOpenStr: string;
  localCloseStr: string;
  progressPercent: number;
}

/**
 * Calculates current market session statuses and countdowns based on UTC time
 * Standard institutional trading hours:
 * - Sydney: 21:00 UTC to 06:00 UTC
 * - Tokyo: 00:00 UTC to 09:00 UTC
 * - London: 07:00 UTC to 16:00 UTC
 * - New York: 12:00 UTC to 21:00 UTC
 * - London / New York Overlap: 12:00 UTC to 16:00 UTC (Peak Institutional Volume)
 */
export function getMarketSessions(now: Date = new Date(), timezone?: string): {
  sessions: MarketSession[];
  activeSessionsCount: number;
  isPeakLiquidityActive: boolean;
  activeSessionSummary: string;
} {
  const tz = timezone || getUserTimezone();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;

  const checkSession = (
    openHour: number,
    closeHour: number
  ): { isOpen: boolean; progress: number; timeRemainingStr: string; statusText: string } => {
    let isOpen = false;
    let duration = 0;
    let elapsed = 0;
    let remainingMins = 0;

    if (openHour < closeHour) {
      // Normal range within same UTC day (e.g. London 7 to 16)
      duration = (closeHour - openHour) * 60;
      if (utcHours >= openHour && utcHours < closeHour) {
        isOpen = true;
        elapsed = (utcHours - openHour) * 60;
        remainingMins = Math.round((closeHour - utcHours) * 60);
      } else {
        isOpen = false;
        if (utcHours < openHour) {
          remainingMins = Math.round((openHour - utcHours) * 60);
        } else {
          remainingMins = Math.round((24 - utcHours + openHour) * 60);
        }
      }
    } else {
      // Crosses midnight UTC (e.g. Sydney 21 to 06)
      duration = (24 - openHour + closeHour) * 60;
      if (utcHours >= openHour || utcHours < closeHour) {
        isOpen = true;
        elapsed = utcHours >= openHour ? (utcHours - openHour) * 60 : (24 - openHour + utcHours) * 60;
        const hoursLeft = utcHours >= openHour ? (24 - utcHours + closeHour) : (closeHour - utcHours);
        remainingMins = Math.round(hoursLeft * 60);
      } else {
        isOpen = false;
        remainingMins = Math.round((openHour - utcHours) * 60);
      }
    }

    const progress = isOpen ? Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100))) : 0;
    const h = Math.floor(remainingMins / 60);
    const m = remainingMins % 60;
    const timeRemainingStr = isOpen ? `Closes in ${h}h ${m}m` : `Opens in ${h}h ${m}m`;
    const statusText = isOpen ? 'ACTIVE / OPEN' : 'CLOSED';

    return { isOpen, progress, timeRemainingStr, statusText };
  };

  // Convert UTC session hours to user's local timezone format string
  const formatUtcToLocal = (utcH: number): string => {
    const dummy = new Date();
    dummy.setUTCHours(utcH, 0, 0, 0);
    return getAppTime(dummy, false, tz);
  };

  const sydneyCalc = checkSession(21, 6);
  const tokyoCalc = checkSession(0, 9);
  const londonCalc = checkSession(7, 16);
  const nyCalc = checkSession(12, 21);
  const overlapCalc = checkSession(12, 16);

  const sessions: MarketSession[] = [
    {
      id: 'sydney',
      name: 'Sydney Session',
      city: 'Sydney, Australia',
      flag: '🇦🇺',
      openUtcHour: 21,
      closeUtcHour: 6,
      isOpen: sydneyCalc.isOpen,
      statusText: sydneyCalc.statusText,
      timeRemainingStr: sydneyCalc.timeRemainingStr,
      localOpenStr: formatUtcToLocal(21),
      localCloseStr: formatUtcToLocal(6),
      progressPercent: sydneyCalc.progress,
    },
    {
      id: 'tokyo',
      name: 'Tokyo Session',
      city: 'Tokyo, Japan',
      flag: '🇯🇵',
      openUtcHour: 0,
      closeUtcHour: 9,
      isOpen: tokyoCalc.isOpen,
      statusText: tokyoCalc.statusText,
      timeRemainingStr: tokyoCalc.timeRemainingStr,
      localOpenStr: formatUtcToLocal(0),
      localCloseStr: formatUtcToLocal(9),
      progressPercent: tokyoCalc.progress,
    },
    {
      id: 'london',
      name: 'London Session',
      city: 'London, United Kingdom',
      flag: '🇬🇧',
      openUtcHour: 7,
      closeUtcHour: 16,
      isOpen: londonCalc.isOpen,
      statusText: londonCalc.statusText,
      timeRemainingStr: londonCalc.timeRemainingStr,
      localOpenStr: formatUtcToLocal(7),
      localCloseStr: formatUtcToLocal(16),
      progressPercent: londonCalc.progress,
    },
    {
      id: 'new_york',
      name: 'New York Session',
      city: 'New York, United States',
      flag: '🇺🇸',
      openUtcHour: 12,
      closeUtcHour: 21,
      isOpen: nyCalc.isOpen,
      statusText: nyCalc.statusText,
      timeRemainingStr: nyCalc.timeRemainingStr,
      localOpenStr: formatUtcToLocal(12),
      localCloseStr: formatUtcToLocal(21),
      progressPercent: nyCalc.progress,
    },
    {
      id: 'london_ny_overlap',
      name: 'London / NY Overlap',
      city: 'Peak Liquidity Window',
      flag: '⚡',
      openUtcHour: 12,
      closeUtcHour: 16,
      isOpen: overlapCalc.isOpen,
      isPeakLiquidity: true,
      statusText: overlapCalc.isOpen ? 'PEAK LIQUIDITY ACTIVE' : 'CLOSED',
      timeRemainingStr: overlapCalc.timeRemainingStr,
      localOpenStr: formatUtcToLocal(12),
      localCloseStr: formatUtcToLocal(16),
      progressPercent: overlapCalc.progress,
    },
  ];

  const active = sessions.filter((s) => s.id !== 'london_ny_overlap' && s.isOpen);
  const activeNames = active.map((s) => s.name.replace(' Session', ''));
  const isPeak = overlapCalc.isOpen;

  let activeSessionSummary = 'GLOBAL SESSIONS CLOSED';
  if (isPeak) {
    activeSessionSummary = '⚡ LONDON • NY OVERLAP (PEAK LIQUIDITY)';
  } else if (activeNames.length > 0) {
    activeSessionSummary = `${activeNames.join(' • ')} OPEN`;
  }

  return {
    sessions,
    activeSessionsCount: active.length,
    isPeakLiquidityActive: isPeak,
    activeSessionSummary,
  };
}

// ----------------------------------------------------------------------
// BACKWARDS COMPATIBILITY LAYER
// Guarantees existing callers of PKT / Karachi functions never break
// ----------------------------------------------------------------------

export const APP_TIMEZONE = 'Asia/Karachi' as const;
export const APP_TIMEZONE_OFFSET = '+05:00' as const;
export const APP_TIMEZONE_LABEL = 'PKT' as const;
export const APP_TIMEZONE_FULL_LABEL = 'PKT (UTC+5)' as const;

export function getKarachiDate(dateInput?: Date | string | number): string {
  return getAppDate(dateInput, 'Asia/Karachi');
}

export function getKarachiTime12(dateInput?: Date | string | number, includeSeconds: boolean = false): string {
  return getAppTime(dateInput, includeSeconds, 'Asia/Karachi', '12h');
}

export function getKarachiTime24(dateInput?: Date | string | number, includeSeconds: boolean = false): string {
  return getAppTime(dateInput, includeSeconds, 'Asia/Karachi', '24h');
}

export function getKarachiTime(dateInput?: Date | string | number, includeSeconds: boolean = false): string {
  return getKarachiTime12(dateInput, includeSeconds);
}

export function getKarachiTimestamp(dateInput?: Date | string | number, includeSeconds: boolean = true): string {
  const d = toDate(dateInput);
  return `${getKarachiDate(d)} ${getKarachiTime12(d, includeSeconds)}`;
}

export function parseKarachiDateTime(dateStr: string, timeStr: string = '00:00'): Date {
  return parseUserDateTime(dateStr, timeStr, 'Asia/Karachi');
}

export function getKarachiEpoch(dateStr: string, timeStr: string = '00:00'): number {
  return parseKarachiDateTime(dateStr, timeStr).getTime();
}

export function isTodayInKarachi(dateStr: string): boolean {
  return dateStr === getKarachiDate();
}

export function formatKarachiDisplayDate(
  dateInput: Date | string | number = new Date(),
  style: 'short' | 'medium' | 'long' = 'medium'
): string {
  return formatAppDisplayDate(dateInput, style, 'Asia/Karachi');
}

export function formatFullKarachiDateTime(dateInput: Date | string | number = new Date()): string {
  const d = toDate(dateInput);
  return `${getKarachiDate(d)} ${getKarachiTime12(d, true)} ${APP_TIMEZONE_FULL_LABEL}`;
}

export function getKarachiLiveClock(now: Date = new Date()): {
  time: string;
  date: string;
  badge: string;
  full: string;
} {
  const appClock = getAppLiveClock(now);
  return {
    time: appClock.time,
    date: appClock.date,
    badge: appClock.badge,
    full: appClock.full,
  };
}

export const PK_TIMEZONE = APP_TIMEZONE;
export const getPakistanDateString = getKarachiDate;
export const getPakistanTimeString = getKarachiTime;
export const formatPakistanFull = formatFullKarachiDateTime;
export const formatJournalDateTime = formatTradeDateTime;

// ----------------------------------------------------------------------
// DAILY TRADE LIMIT HELPERS (Issue #1)
// Strict Pakistan Standard Time (Asia/Karachi) calendar-day enforcement
// ----------------------------------------------------------------------

/**
 * Authoritative current Pakistan calendar date (YYYY-MM-DD).
 * Always uses Asia/Karachi. Never relies on browser local timezone.
 */
export function getCurrentPakistanDate(): string {
  return getKarachiDate();
}

/**
 * Normalize any trade date string (or ISO timestamp) to a pure
 * YYYY-MM-DD string in Asia/Karachi. Handles:
 * - "2026-09-16"
 * - "2026-09-16T18:30:00.000Z"
 * - full ISO strings
 */
export function normalizeTradeDateToPakistan(dateInput: string | Date | number | undefined | null): string {
  if (dateInput === undefined || dateInput === null || dateInput === '') {
    return getCurrentPakistanDate();
  }
  // Already a clean YYYY-MM-DD string
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  // Convert any other representation via Karachi formatter
  return getKarachiDate(dateInput);
}

/**
 * Count how many trades belong to a specific Pakistan calendar day.
 * Defaults to today (PKT). Used by TradeEntryModal, metrics, RiskCenter.
 */
export function countTradesForPakistanDate(
  trades: Array<{ date?: string }> | null | undefined,
  targetDate?: string
): number {
  const day = targetDate ? normalizeTradeDateToPakistan(targetDate) : getCurrentPakistanDate();
  if (!Array.isArray(trades) || trades.length === 0) return 0;
  return trades.filter((t) => normalizeTradeDateToPakistan(t.date) === day).length;
}

/**
 * Returns true when the given date already has reached the hard daily limit.
 */
export function isPakistanDailyTradeLimitReached(
  trades: Array<{ date?: string }> | null | undefined,
  maxDailyTrades: number = 2,
  targetDate?: string
): boolean {
  if (maxDailyTrades <= 0) return false;
  return countTradesForPakistanDate(trades, targetDate) >= maxDailyTrades;
}
