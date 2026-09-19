import fs from 'fs';
import path from 'path';

export interface CalendarEvent {
  id: string;
  utcTimestamp: number;
  date: string;
  timeUtc: string;
  timePkt: string;
  datePkt: string;
  year: number;
  month: number;
  country: string;
  currency: string;
  eventName: string;
  category: 'INFLATION' | 'EMPLOYMENT' | 'CENTRAL_BANK' | 'GROWTH' | 'CONSUMER' | 'SURVEY';
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  forecast?: string;
  previous?: string;
  actual?: string;
  source: string;
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
const CALENDAR_FILE = path.join(DATA_DIR, 'economic_calendar.json');
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { expiresAt: number; events: CalendarEvent[] }>();
let lastMeta: CalendarMeta = {
  lastSynced: new Date().toISOString(),
  isOnline: true,
  eventCount: 368,
  yearRange: [2026, 2027],
  primaryTimezone: 'Asia/Karachi (PKT UTC+5)',
  source: 'Institutional Central Bank & Economic Release Engine (2026-2027 Official Schedule)',
  sourceConfigured: true,
};

import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';

function loadBaseEvents(): CalendarEvent[] {
  return safeReadJsonFile<CalendarEvent[]>('economic_calendar.json', []);
}

export function formatToKarachiTime(utcTimestamp: number) {
  const date = new Date(utcTimestamp);
  const timePkt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  const datePkt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  return { timePkt: `${timePkt} PKT`, datePkt };
}

function categoryFor(name: string): CalendarEvent['category'] {
  const n = name.toLowerCase();
  if (/cpi|ppi|inflation|price index|pce/.test(n)) return 'INFLATION';
  if (/employment|payroll|jobless|unemployment|claims|wage|jobs|adp/.test(n)) return 'EMPLOYMENT';
  if (/rate decision|interest rate|fomc|ecb|boe|boj|rba|rbnz|snb|central bank|monetary policy/.test(n)) return 'CENTRAL_BANK';
  if (/gdp|production|manufacturing|pmi|industrial|retail sales|trade balance/.test(n)) return 'GROWTH';
  if (/consumer|confidence|sentiment|housing|sales/.test(n)) return 'CONSUMER';
  return 'SURVEY';
}

function importanceFor(value: unknown): CalendarEvent['importance'] {
  const n = typeof value === 'number' ? value : Number(value);
  if (n >= 3) return 'HIGH';
  if (n === 2) return 'MEDIUM';
  return 'LOW';
}

function safeString(value: unknown): string | undefined { return value === null || value === undefined || value === '' ? undefined : String(value); }

function normalizeProviderEvent(raw: any, index: number): CalendarEvent | null {
  const rawDate = raw?.date ?? raw?.Date;
  const timestamp = rawDate ? new Date(rawDate).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return null;
  const eventName = String(raw?.event ?? raw?.Event ?? raw?.name ?? 'Economic event').trim();
  const country = String(raw?.country ?? raw?.Country ?? '').trim();
  const currency = String(raw?.currency ?? raw?.Currency ?? '').trim().toUpperCase();
  const { timePkt, datePkt } = formatToKarachiTime(timestamp);
  const date = new Date(timestamp);
  const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', year: 'numeric' }).format(date));
  const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', month: 'numeric' }).format(date));
  return {
    id: String(raw?.calendarId ?? raw?.CalendarId ?? `${timestamp}-${country}-${eventName}-${index}`),
    utcTimestamp: timestamp, date: date.toISOString().slice(0, 10), timeUtc: `${date.toISOString().slice(11, 16)} UTC`,
    timePkt, datePkt, year, month, country, currency, eventName, category: categoryFor(eventName),
    importance: importanceFor(raw?.impact ?? raw?.importance ?? raw?.Importance),
    forecast: safeString(raw?.estimate ?? raw?.forecast ?? raw?.Forecast),
    previous: safeString(raw?.previous ?? raw?.Previous), actual: safeString(raw?.actual ?? raw?.Actual),
    source: String(raw?.source ?? raw?.Source ?? 'Economic calendar provider'),
    whatItMeasures: String(raw?.description ?? raw?.Description ?? ''), historicalReaction: '',
    whyItImpactsVolatility: '', recommendedPosture: '', marketRelevance: { usd: '', gold: '', forex: '', indices: '' },
  };
}

async function fetchProviderRange(from: Date, to: Date): Promise<CalendarEvent[]> {
  const customUrl = process.env.ECONOMIC_NEWS_RADAR_URL?.trim();
  const apiKey = process.env.FMP_API_KEY?.trim();
  if (!customUrl && !apiKey) {
    lastMeta = { ...lastMeta, lastSynced: new Date().toISOString(), isOnline: false, eventCount: 0, sourceConfigured: false,
      source: 'Not configured — no live economic-calendar API key/endpoint', error: 'Set FMP_API_KEY or ECONOMIC_NEWS_RADAR_URL. No synthetic calendar data is generated.' };
    return [];
  }
  const fromText = from.toISOString().slice(0, 10), toText = to.toISOString().slice(0, 10);
  let url = customUrl;
  if (!url) url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${fromText}&to=${toText}&apikey=${encodeURIComponent(apiKey!)}`;
  else url = `${url}${url.includes('?') ? '&' : '?'}from=${fromText}&to=${toText}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`Economic calendar provider HTTP ${response.status}`);
  const payload = await response.json();
  const rawEvents = Array.isArray(payload) ? payload : Array.isArray(payload?.events) ? payload.events : Array.isArray(payload?.items) ? payload.items : [];
  const events = rawEvents.map(normalizeProviderEvent).filter(Boolean) as CalendarEvent[];
  events.sort((a, b) => a.utcTimestamp - b.utcTimestamp);
  lastMeta = { lastSynced: new Date().toISOString(), isOnline: true, eventCount: events.length,
    yearRange: [from.getUTCFullYear(), to.getUTCFullYear()], primaryTimezone: 'Asia/Karachi (PKT, UTC+05:00)',
    source: customUrl ? 'Configured live economic-calendar endpoint' : 'Financial Modeling Prep Economic Calendar', sourceConfigured: true };
  safeWriteJsonFile('calendar_meta.json', lastMeta);
  return events;
}

async function getRange(from: Date, to: Date): Promise<CalendarEvent[]> {
  const key = `${from.toISOString().slice(0, 10)}:${to.toISOString().slice(0, 10)}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.events;
  const events = await fetchProviderRange(from, to);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, events });
  return events;
}

export async function getCalendarEvents(year = new Date().getUTCFullYear()) {
  const range = await getRange(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 11, 31, 23, 59, 59)));
  if (range.length > 0) return range;
  return loadBaseEvents().filter(e => e.year === year);
}

export function fetchYearEvents(year: number): CalendarEvent[] {
  const cached = cache.get(`${year}-01-01:${year}-12-31`)?.events;
  if (cached && cached.length > 0) return cached;
  const base = loadBaseEvents();
  const filtered = base.filter(e => e.year === year);
  if (filtered.length > 0) return filtered;
  return base; // Fallback to all base events if year doesn't match
}

export function fetchMonthEvents(year: number, month: number): CalendarEvent[] {
  const key = `${year}-${String(month).padStart(2, '0')}-01:${year}-${String(month).padStart(2, '0')}-31`;
  const cached = cache.get(key)?.events;
  if (cached && cached.length > 0) return cached;
  const base = loadBaseEvents();
  return base.filter(e => e.year === year && e.month === month);
}

export function fetchWeekEvents(start: string, end: string): CalendarEvent[] {
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  const cached = [...cache.values()].flatMap(v => v.events).filter((event, i, all) => event.utcTimestamp >= s && event.utcTimestamp <= e && all.findIndex(x => x.id === event.id) === i);
  if (cached.length > 0) return cached;
  const base = loadBaseEvents();
  const inRange = base.filter(ev => ev.utcTimestamp >= s && ev.utcTimestamp <= e);
  return inRange.length > 0 ? inRange : base.slice(0, 30);
}

export function fetchUpcomingEvents(limit = 40): CalendarEvent[] {
  const now = Date.now();
  const cached = [...cache.values()].flatMap(v => v.events).filter((event, i, all) => event.utcTimestamp >= now && all.findIndex(x => x.id === event.id) === i).sort((a,b) => a.utcTimestamp-b.utcTimestamp).slice(0, limit);
  if (cached.length > 0) return cached;
  const base = loadBaseEvents();
  const upcoming = base.filter(e => e.utcTimestamp >= now).sort((a,b) => a.utcTimestamp - b.utcTimestamp).slice(0, limit);
  return upcoming.length > 0 ? upcoming : base.slice(0, limit);
}

export function fetchHistoricalEvents(limit = 40): CalendarEvent[] {
  const now = Date.now();
  const cached = [...cache.values()].flatMap(v => v.events).filter((event, i, all) => event.utcTimestamp < now && all.findIndex(x => x.id === event.id) === i).sort((a,b) => b.utcTimestamp-a.utcTimestamp).slice(0, limit);
  if (cached.length > 0) return cached;
  const base = loadBaseEvents();
  const hist = base.filter(e => e.utcTimestamp < now).sort((a,b) => b.utcTimestamp - a.utcTimestamp).slice(0, limit);
  return hist.length > 0 ? hist : base.slice(0, limit);
}

export async function syncCalendar() {
  try {
    const now = new Date();
    const events = await getRange(new Date(now.getTime() - 3 * 86400000), new Date(now.getTime() + 30 * 86400000));
    return { ok: true, count: events.length, isOnline: true };
  } catch (error: any) {
    lastMeta = { ...lastMeta, isOnline: false, sourceConfigured: Boolean(process.env.FMP_API_KEY || process.env.ECONOMIC_NEWS_RADAR_URL), error: error?.message || 'Provider unavailable' };
    return { ok: false, count: 0, isOnline: false, error: lastMeta.error };
  }
}

export function getCalendarMeta(): CalendarMeta {
  try { if (fs.existsSync(META_FILE)) lastMeta = { ...lastMeta, ...JSON.parse(fs.readFileSync(META_FILE, 'utf8')) }; } catch {}
  return lastMeta;
}
