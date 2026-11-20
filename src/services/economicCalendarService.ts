
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

const CACHE_KEY = 'primepipfx_calendar_tv_live_v1';
const META_KEY = 'primepipfx_calendar_tv_meta_v1';

export function getCachedCalendar(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return [];
}

export function setCachedCalendar(events: CalendarEvent[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(events));
  } catch {}
}

export function getCachedMeta(): CalendarMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // fallback
  }
  return { lastSynced: '', isOnline: false, eventCount: 0, yearRange: [new Date().getFullYear(), new Date().getFullYear()], primaryTimezone: 'Asia/Karachi', source: 'TradingView economic calendar (live)', error: 'No live calendar received yet' };
}

export function setCachedMeta(meta: CalendarMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
}

async function syncLiveCalendar(): Promise<boolean> {
  try {
    const res = await fetch('/api/calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return false;
    const result = await res.json();
    return Boolean(result.ok);
  } catch {
    return false;
  }
}

type Live = { events: CalendarEvent[]; meta?: CalendarMeta };
const liveMemo = new Map<string, { at: number; v: Live }>();
const LCK = 'ppfx_cal_peek_v1:';
/** Last live answer for an endpoint (memory, then storage) — lets the calendar paint at once while the fresh copy loads. */
export function peekCalendar(endpoint: string, maxAgeMs = 6 * 3600_000): Live | null {
  const m = liveMemo.get(endpoint);
  if (m && Date.now() - m.at < maxAgeMs) return m.v;
  try { const raw = localStorage.getItem(LCK + endpoint); if (raw) { const o = JSON.parse(raw); if (o && Date.now() - o.at < maxAgeMs) { liveMemo.set(endpoint, o); return o.v; } } } catch { /* ignore */ }
  return null;
}
export const weekEndpoint = (start: string, end: string) => `/api/calendar/week?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
export const monthEndpoint = (y: number, m: number) => `/api/calendar/month/${y}/${m}`;
export const warmCalendar = (endpoint: string) => getLiveEvents(endpoint).catch(() => null);

async function getLiveEvents(endpoint: string): Promise<Live | null> {
  try {
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data = await res.json();
    if (!Array.isArray(data.events) || data.events.length === 0) return null;
    if (data.meta) setCachedMeta(data.meta);
    setCachedCalendar(data.events);
    const v: Live = { events: data.events, meta: data.meta };
    const o = { at: Date.now(), v };
    liveMemo.set(endpoint, o);
    try { const str = JSON.stringify(o); if (str.length < 900_000) localStorage.setItem(LCK + endpoint, str); } catch { /* quota */ }
    return v;
  } catch {
    return null;
  }
}

export async function fetchYearEvents(year: number) {
  try {
    const live = await getLiveEvents(`/api/calendar/year/${year}`);
    if (live && live.events.length > 0) {
      return { events: live.events, isOnline: true, lastSynced: live.meta?.lastSynced || new Date().toISOString() };
    }
  } catch {}
  const events = getCachedCalendar().filter((e) => e.year === year);
  const meta = getCachedMeta();
  return {
    events,
    isOnline: true,
    lastSynced: meta?.lastSynced || new Date().toISOString(),
  };
}

export async function fetchMonthEvents(year: number, month: number): Promise<CalendarEvent[]> {
  try {
    const live = await getLiveEvents(`/api/calendar/month/${year}/${month}`);
    if (live && live.events.length > 0) return live.events;
  } catch {}
  const events = getCachedCalendar().filter((e) => e.year === year && e.month === month);
  return events;
}

export async function fetchWeekEvents(start: string, end: string): Promise<CalendarEvent[]> {
  try {
    const live = await getLiveEvents(`/api/calendar/week?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    if (live && live.events.length > 0) return live.events;
  } catch {}
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const events = getCachedCalendar().filter((event) => event.utcTimestamp >= s && event.utcTimestamp <= e);
  return events;
}

export async function fetchUpcomingEvents(limit = 150): Promise<CalendarEvent[]> {
  try {
    const live = await getLiveEvents(`/api/calendar/upcoming?limit=${limit}`);
    if (live && live.events.length > 0) return live.events;
  } catch {}
  const now = Date.now();
  const pool = getCachedCalendar();
  const upcoming = pool.filter((e) => e.utcTimestamp >= now - 2 * 3600_000);
  if (upcoming.length > 0) return upcoming.slice(0, limit);
  return pool.slice(0, limit);
}

export async function fetchHistoricalEvents(limit = 150): Promise<CalendarEvent[]> {
  try {
    const live = await getLiveEvents(`/api/calendar/historical?limit=${limit}`);
    if (live && live.events.length > 0) return live.events;
  } catch {}
  const now = Date.now();
  const pool = getCachedCalendar();
  const past = pool.filter((e) => e.utcTimestamp < now).sort((a, b) => b.utcTimestamp - a.utcTimestamp);
  if (past.length > 0) return past.slice(0, limit);
  return pool.slice(0, limit);
}

export async function syncCalendar() {
  const ok = await syncLiveCalendar();
  await getCalendarMeta();
  return { ok, count: getCachedCalendar().length, isOnline: true };
}

export async function getCalendarMeta(): Promise<CalendarMeta> {
  try {
    const res = await fetch('/api/calendar/meta', { cache: 'no-store' });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.meta) {
          setCachedMeta(data.meta);
          return data.meta;
        }
      }
    }
  } catch {}
  return getCachedMeta();
}
