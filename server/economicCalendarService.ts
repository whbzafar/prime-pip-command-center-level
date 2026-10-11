import fs from 'fs';
import path from 'path';
import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';

export interface CalendarEvent {
  id: string;
  utcTimestamp: number;
  date: string;
  pktDateKey?: string;
  dayOfWeekPkt?: string;
  timeShortPkt?: string;
  timeUtc: string;
  timePkt: string;
  datePkt: string;
  year: number;
  month: number;
  country: string;
  currency: string;
  eventName: string;
  indicator?: string;
  period?: string;
  ticker?: string;
  category: 'INFLATION' | 'EMPLOYMENT' | 'CENTRAL_BANK' | 'GROWTH' | 'CONSUMER' | 'SURVEY';
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  forecast?: string;
  previous?: string;
  actual?: string;
  actualRaw?: number | null;
  forecastRaw?: number | null;
  previousRaw?: number | null;
  unit?: string;
  scale?: string;
  isInverseIndicator?: boolean;
  usualEffect?: string;
  source: string;
  sourceUrl?: string;
  whatItMeasures: string;
  historicalReaction: string;
  whyItImpactsVolatility: string;
  recommendedPosture: string;
  marketRelevance: { usd: string; gold: string; forex: string; indices: string };
}

export interface CalendarMeta {
  lastSynced: string;
  isOnline: boolean;
  eventCount: number;
  yearRange: [number, number];
  primaryTimezone: string;
  source: string;
  sourceConfigured?: boolean;
  error?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const META_FILE = path.join(DATA_DIR, 'calendar_meta.json');
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { expiresAt: number; events: CalendarEvent[] }>();

const TV_COUNTRIES = 'US,EU,GB,JP,CA,AU,NZ,CH,CN,DE,FR,IT,ES';

const COUNTRY_NAME_MAP: Record<string, string> = {
  US: 'United States',
  EU: 'Euro Area',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  GB: 'United Kingdom',
  JP: 'Japan',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  CH: 'Switzerland',
  CN: 'China',
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD',
  EU: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  GB: 'GBP',
  JP: 'JPY',
  CA: 'CAD',
  AU: 'AUD',
  NZ: 'NZD',
  CH: 'CHF',
  CN: 'CNY',
};

const DEFAULT_SOURCE_BY_CURRENCY: Record<string, { name: string; url: string }> = {
  USD: { name: 'U.S. Bureau of Economic Analysis / Federal Reserve', url: 'https://www.federalreserve.gov' },
  EUR: { name: 'Eurostat / European Central Bank', url: 'https://www.ecb.europa.eu' },
  GBP: { name: 'Office for National Statistics / Bank of England', url: 'https://www.ons.gov.uk' },
  JPY: { name: 'Cabinet Office of Japan / Bank of Japan', url: 'https://www.boj.or.jp' },
  CAD: { name: 'Statistics Canada / Bank of Canada', url: 'https://www.statcan.gc.ca' },
  AUD: { name: 'Australian Bureau of Statistics / RBA', url: 'https://www.abs.gov.au' },
  NZD: { name: 'Stats NZ / Reserve Bank of New Zealand', url: 'https://www.stats.govt.nz' },
  CHF: { name: 'State Secretariat for Economic Affairs / SNB', url: 'https://www.snb.ch' },
  CNY: { name: 'National Bureau of Statistics of China', url: 'https://www.stats.gov.cn' },
};

let lastMeta: CalendarMeta = {
  lastSynced: new Date().toISOString(),
  isOnline: true,
  eventCount: 0,
  yearRange: [2025, 2027],
  primaryTimezone: 'Asia/Karachi (PKT, UTC+05:00)',
  source: 'TradingView Live Economic Calendar Feed',
  sourceConfigured: true,
};

function loadBaseEvents(): CalendarEvent[] {
  return safeReadJsonFile<CalendarEvent[]>('economic_calendar.json', []);
}

export function formatToKarachiTime(utcTimestamp: number) {
  const date = new Date(utcTimestamp);

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  const timeShortPkt = timeParts.replace(/\s+/g, '').toLowerCase(); // e.g., "5:30pm"
  const datePkt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

  const dayOfWeekPkt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(date)
    .replace(',', '');

  const pktParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const y = pktParts.find((p) => p.type === 'year')?.value || String(date.getUTCFullYear());
  const m = pktParts.find((p) => p.type === 'month')?.value || '01';
  const d = pktParts.find((p) => p.type === 'day')?.value || '01';
  const pktDateKey = `${y}-${m}-${d}`;

  return {
    timePkt: `${timeParts} PKT`,
    timeShortPkt,
    datePkt,
    dayOfWeekPkt,
    pktDateKey,
    year: Number(y),
    month: Number(m),
  };
}

function categoryFor(name: string, tvCat?: string): CalendarEvent['category'] {
  const c = (tvCat || '').toLowerCase();
  if (c === 'inf') return 'INFLATION';
  if (c === 'lbr') return 'EMPLOYMENT';
  if (c === 'cntrl' || c === 'mny' || c === 'bnd') return 'CENTRAL_BANK';
  if (c === 'gdp' || c === 'trd') return 'GROWTH';
  if (c === 'cnsm' || c === 'hsng') return 'CONSUMER';
  if (c === 'bsnss') return 'SURVEY';

  const n = name.toLowerCase();
  if (/cpi|ppi|inflation|price index|pce/.test(n)) return 'INFLATION';
  if (/employment|payroll|jobless|unemployment|claims|wage|jobs|adp|labor|labour/.test(n)) return 'EMPLOYMENT';
  if (/rate decision|interest rate|fomc|ecb|boe|boj|rba|rbnz|snb|central bank|monetary policy|minutes|speech|auction|yield/.test(n)) return 'CENTRAL_BANK';
  if (/gdp|production|manufacturing|industrial|trade balance|exports|imports/.test(n)) return 'GROWTH';
  if (/consumer|confidence|sentiment|housing|retail sales|building|home/.test(n)) return 'CONSUMER';
  return 'SURVEY';
}

function mapTvImportance(value: unknown): CalendarEvent['importance'] {
  if (typeof value === 'string') {
    const u = value.toUpperCase();
    if (u.includes('HIGH')) return 'HIGH';
    if (u.includes('MED')) return 'MEDIUM';
    if (u.includes('LOW')) return 'LOW';
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (n >= 1) return 'HIGH';
  if (n === 0) return 'MEDIUM';
  return 'LOW';
}

function formatTvFigure(val: unknown, unit?: string, scale?: string): string | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const num = Number(val);
  if (!Number.isFinite(num)) return String(val);
  const u = (unit || '').trim();
  const s = (scale || '').trim();
  if (u === '%') {
    return `${num}${s}%`;
  }
  const isCurrencyPrefix = /^[$€£¥]|^(C\$|A\$|NZ\$|CHF|CNY)$/i.test(u);
  if (isCurrencyPrefix) {
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num);
    const space = /^(CHF|CNY)$/i.test(u) ? ' ' : '';
    return `${sign}${u}${space}${abs}${s}`;
  }
  return `${num}${s}${u ? ` ${u}` : ''}`;
}

function isInverseMetric(title: string, indicator: string): boolean {
  const combined = `${title} ${indicator}`.toLowerCase();
  return /unemployment|jobless|initial claims|continuing claims|claimant count|layoffs|bankruptcies/.test(combined);
}

function buildEventIntelligence(
  eventName: string,
  indicator: string,
  currency: string,
  category: CalendarEvent['category'],
  importance: CalendarEvent['importance'],
  tvComment?: string
) {
  const inverse = isInverseMetric(eventName, indicator);
  const usualEffect = inverse
    ? `'Actual' less than 'Forecast' is good for currency (${currency})`
    : `'Actual' greater than 'Forecast' is good for currency (${currency})`;

  const whatItMeasures =
    tvComment && tvComment.trim().length > 10
      ? tvComment.trim()
      : `${indicator || eventName} tracks macroeconomic performance in the ${category.toLowerCase().replace('_', ' ')} sector for ${currency}. Traders monitor deviations between the actual print and consensus forecast to gauge central bank policy expectations.`;

  const whyItImpactsVolatility =
    importance === 'HIGH'
      ? `Tier-1 high-impact release for ${currency}. Significant deviations between Actual and Forecast immediately re-price sovereign bond yields and central bank rate path probabilities, triggering algorithmic liquidity sweeps.`
      : importance === 'MEDIUM'
      ? `Medium-impact release for ${currency}. Can trigger 15–35 pip directional adjustments when the actual reading significantly surprises consensus estimates.`
      : `Low-impact release for ${currency}. Typically observed for broader macroeconomic trend confirmation unless accompanied by a major surprise.`;

  const historicalReaction =
    importance === 'HIGH'
      ? `${currency} pairs frequently experience 35–75 pip volatility expansions within the first 15 minutes of release, with XAUUSD moving $8–$20 on USD surprises.`
      : importance === 'MEDIUM'
      ? `${currency} crosses typically react with 15–30 pip intraday impulses upon notable forecast deviations.`
      : `Muted immediate price reaction unless aggregated with concurrent Tier-1 releases.`;

  const recommendedPosture =
    importance === 'HIGH'
      ? `STAND DOWN 15 minutes before and after release. Spreads widen and stop-runs are frequent. Wait for the first 15-minute post-release candle to close before executing.`
      : importance === 'MEDIUM'
      ? `Exercise caution during release window. Avoid tightening stops immediately prior to the print; trade post-release structure.`
      : `Standard execution conditions apply; monitor for cumulative macro bias.`;

  const marketRelevance = {
    usd:
      currency === 'USD'
        ? `Direct primary catalyst for the US Dollar Index (DXY) and US Treasury yield curve.`
        : `Affects USD indirectly via relative yield differentials against ${currency}.`,
    gold:
      currency === 'USD'
        ? `Stronger-than-expected USD data typically pressures Gold (XAUUSD) via rising real yields; softer data supports Gold.`
        : `Secondary cross-currency liquidity impact on precious metals.`,
    forex: `Direct repricing across ${currency} major and minor pairs based on the surprise vs. consensus forecast.`,
    indices: `Influences domestic equity indices via interest rate expectations and corporate growth outlook.`,
  };

  return {
    isInverseIndicator: inverse,
    usualEffect,
    whatItMeasures,
    whyItImpactsVolatility,
    historicalReaction,
    recommendedPosture,
    marketRelevance,
  };
}

function normalizeTradingViewEvent(raw: any, index: number): CalendarEvent | null {
  const rawDate = raw?.date ?? raw?.Date;
  const timestamp = rawDate ? new Date(rawDate).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return null;

  const countryCode = String(raw?.country || '').toUpperCase().trim();
  const country = COUNTRY_NAME_MAP[countryCode] || countryCode || 'Global';
  const currency = String(raw?.currency || COUNTRY_CURRENCY_MAP[countryCode] || 'USD')
    .toUpperCase()
    .trim();

  const rawTitle = String(raw?.title ?? raw?.event ?? raw?.name ?? 'Economic Release').trim();
  const period = raw?.period ? String(raw.period).trim() : undefined;
  const indicator = raw?.indicator ? String(raw.indicator).trim() : rawTitle;
  const eventName =
    countryCode && ['EU', 'DE', 'FR', 'IT', 'ES'].includes(countryCode) && countryCode !== 'EU' && !rawTitle.toLowerCase().includes(COUNTRY_NAME_MAP[countryCode].toLowerCase())
      ? `${COUNTRY_NAME_MAP[countryCode]} ${rawTitle}`
      : rawTitle;

  const { timePkt, timeShortPkt, datePkt, dayOfWeekPkt, pktDateKey, year, month } = formatToKarachiTime(timestamp);
  const dateObj = new Date(timestamp);

  const unit = raw?.unit ? String(raw.unit).trim() : undefined;
  const scale = raw?.scale ? String(raw.scale).trim() : undefined;

  const actualRaw = raw?.actual !== null && raw?.actual !== undefined && raw?.actual !== '' ? Number(raw.actual) : null;
  const forecastRaw =
    raw?.forecast !== null && raw?.forecast !== undefined && raw?.forecast !== ''
      ? Number(raw.forecast)
      : raw?.estimate !== null && raw?.estimate !== undefined && raw?.estimate !== ''
      ? Number(raw.estimate)
      : null;
  const previousRaw = raw?.previous !== null && raw?.previous !== undefined && raw?.previous !== '' ? Number(raw.previous) : null;

  const actual = formatTvFigure(raw?.actual, unit, scale);
  const forecast = formatTvFigure(raw?.forecast ?? raw?.estimate, unit, scale);
  const previous = formatTvFigure(raw?.previous, unit, scale);

  const category = categoryFor(eventName, raw?.category);
  const importance = mapTvImportance(raw?.importance ?? raw?.impact);

  const defaultSrc = DEFAULT_SOURCE_BY_CURRENCY[currency] || {
    name: 'Official National Statistics Agency',
    url: 'https://www.tradingview.com/economic-calendar/',
  };
  const source = raw?.source && String(raw.source).trim() ? String(raw.source).trim() : defaultSrc.name;
  const sourceUrl = raw?.source_url && String(raw.source_url).trim() ? String(raw.source_url).trim() : defaultSrc.url;

  const intel = buildEventIntelligence(eventName, indicator, currency, category, importance, raw?.comment);

  return {
    id: String(raw?.id ?? `${timestamp}-${currency}-${index}`),
    utcTimestamp: timestamp,
    date: dateObj.toISOString().slice(0, 10),
    pktDateKey,
    dayOfWeekPkt,
    timeShortPkt,
    timeUtc: `${dateObj.toISOString().slice(11, 16)} UTC`,
    timePkt,
    datePkt,
    year,
    month,
    country,
    currency,
    eventName,
    indicator,
    period,
    ticker: raw?.ticker ? String(raw.ticker) : undefined,
    category,
    importance,
    forecast,
    previous,
    actual,
    actualRaw: Number.isFinite(actualRaw) ? actualRaw : null,
    forecastRaw: Number.isFinite(forecastRaw) ? forecastRaw : null,
    previousRaw: Number.isFinite(previousRaw) ? previousRaw : null,
    unit,
    scale,
    isInverseIndicator: intel.isInverseIndicator,
    usualEffect: intel.usualEffect,
    source,
    sourceUrl,
    whatItMeasures: intel.whatItMeasures,
    historicalReaction: intel.historicalReaction,
    whyItImpactsVolatility: intel.whyItImpactsVolatility,
    recommendedPosture: intel.recommendedPosture,
    marketRelevance: intel.marketRelevance,
  };
}

export async function fetchTradingViewRange(from: Date, to: Date): Promise<CalendarEvent[]> {
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const tvUrl = `https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&countries=${TV_COUNTRIES}`;

  const response = await fetch(tvUrl, {
    headers: {
      Accept: 'application/json',
      Origin: 'https://www.tradingview.com',
      Referer: 'https://www.tradingview.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`TradingView Economic Calendar HTTP ${response.status}`);
  }

  const payload = await response.json();
  const rawEvents = Array.isArray(payload?.result)
    ? payload.result
    : Array.isArray(payload)
    ? payload
    : [];

  const events = rawEvents
    .map((item: any, idx: number) => normalizeTradingViewEvent(item, idx))
    .filter(Boolean) as CalendarEvent[];

  events.sort((a, b) => a.utcTimestamp - b.utcTimestamp);

  lastMeta = {
    lastSynced: new Date().toISOString(),
    isOnline: true,
    eventCount: events.length,
    yearRange: [from.getUTCFullYear(), to.getUTCFullYear()],
    primaryTimezone: 'Asia/Karachi (PKT, UTC+05:00)',
    source: 'TradingView Live Economic Calendar Feed',
    sourceConfigured: true,
  };
  safeWriteJsonFile('calendar_meta.json', lastMeta);
  return events;
}

export async function getRange(from: Date, to: Date): Promise<CalendarEvent[]> {
  const key = `${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now() && cached.events.length > 0) {
    return cached.events;
  }
  try {
    const events = await fetchTradingViewRange(from, to);
    if (events.length > 0) {
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, events });
      return events;
    }
  } catch (err: any) {
    console.warn('[TradingView Calendar] Live fetch warning:', err?.message || err);
    lastMeta = {
      ...lastMeta,
      isOnline: false,
      error: err?.message || 'TradingView live feed temporarily unreachable',
    };
  }
  const base = loadBaseEvents();
  const s = from.getTime();
  const e = to.getTime();
  return base.filter((ev) => ev.utcTimestamp >= s && ev.utcTimestamp <= e);
}

export async function getCalendarEvents(year = new Date().getUTCFullYear()): Promise<CalendarEvent[]> {
  const now = new Date();
  const targetMonth = now.getUTCFullYear() === year ? now.getUTCMonth() : 0;
  const from = new Date(Date.UTC(year, Math.max(0, targetMonth - 1), 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, Math.min(11, targetMonth + 2), 0, 23, 59, 59));
  const range = await getRange(from, to);
  if (range.length > 0) return range;
  return loadBaseEvents().filter((e) => e.year === year);
}

export async function fetchYearEvents(year: number): Promise<CalendarEvent[]> {
  return getCalendarEvents(year);
}

export async function fetchMonthEvents(year: number, month: number): Promise<CalendarEvent[]> {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  const events = await getRange(from, to);
  if (events.length > 0) return events;
  const base = loadBaseEvents();
  return base.filter((e) => e.year === year && e.month === month);
}

export async function fetchWeekEvents(start: string, end: string): Promise<CalendarEvent[]> {
  const from = new Date(start);
  const to = new Date(end);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) {
    const now = new Date();
    return getRange(new Date(now.getTime() - 3 * 86400000), new Date(now.getTime() + 7 * 86400000));
  }
  const events = await getRange(from, to);
  if (events.length > 0) return events;
  const s = from.getTime();
  const e = to.getTime();
  return loadBaseEvents().filter((ev) => ev.utcTimestamp >= s && ev.utcTimestamp <= e);
}

export async function fetchUpcomingEvents(limit = 150): Promise<CalendarEvent[]> {
  const now = new Date();
  const from = new Date(now.getTime() - 6 * 3600_000); // include events from last 6 hours for context
  const to = new Date(now.getTime() + 7 * 86400_000);
  const events = await getRange(from, to);
  const upcoming = events.filter((e) => e.utcTimestamp >= now.getTime() - 2 * 3600_000);
  if (upcoming.length > 0) return upcoming.slice(0, limit);
  return events.slice(0, limit);
}

export async function fetchHistoricalEvents(limit = 150): Promise<CalendarEvent[]> {
  const now = new Date();
  const from = new Date(now.getTime() - 10 * 86400_000);
  const to = now;
  const events = await getRange(from, to);
  const past = events
    .filter((e) => e.utcTimestamp <= now.getTime())
    .sort((a, b) => b.utcTimestamp - a.utcTimestamp);
  if (past.length > 0) return past.slice(0, limit);
  return events.slice(0, limit);
}

export async function syncCalendar() {
  try {
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 86400_000);
    const to = new Date(now.getTime() + 14 * 86400_000);
    const events = await fetchTradingViewRange(from, to);
    const key = `${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}`;
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, events });
    if (events.length > 0) {
      safeWriteJsonFile('economic_calendar.json', events);
    }
    return { ok: true, count: events.length, isOnline: true, source: 'TradingView Live Economic Calendar' };
  } catch (error: any) {
    lastMeta = {
      ...lastMeta,
      isOnline: false,
      sourceConfigured: true,
      error: error?.message || 'TradingView provider unavailable',
    };
    return { ok: false, count: 0, isOnline: false, error: lastMeta.error };
  }
}

export function getCalendarMeta(): CalendarMeta {
  try {
    if (fs.existsSync(META_FILE)) {
      lastMeta = { ...lastMeta, ...JSON.parse(fs.readFileSync(META_FILE, 'utf8')) };
    }
  } catch {}
  return lastMeta;
}
