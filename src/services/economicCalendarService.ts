import { DEFAULT_CALENDAR_EVENTS, DEFAULT_CALENDAR_META } from '../data/calendarEventsDatabase';

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

const CACHE_KEY = 'primepipfx_calendar_live_cache_v5';
const META_KEY = 'primepipfx_calendar_live_meta_v5';

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
  return DEFAULT_CALENDAR_EVENTS;
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
  return DEFAULT_CALENDAR_META;
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

async function getLiveEvents(endpoint: string): Promise<{ events: CalendarEvent[]; meta?: CalendarMeta } | null> {
  try {
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data = await res.json();
    if (!Array.isArray(data.events) || data.events.length === 0) return null;
    if (data.meta) setCachedMeta(data.meta);
    setCachedCalendar(data.events);
    return { events: data.events, meta: data.meta };
  } catch {
    return null;
  }
}

export async function fetchYearEvents(year: number) {
  try {
    await syncLiveCalendar();
    const live = await getLiveEvents(`/api/calendar/year/${year}`);
    if (live && live.events.length > 0) {
      return { events: live.events, isOnline: true, lastSynced: live.meta?.lastSynced || new Date().toISOString() };
    }
  } catch {}
  const events = getCachedCalendar().filter((e) => e.year === year);
  const meta = getCachedMeta();
  return {
    events: events.length > 0 ? events : DEFAULT_CALENDAR_EVENTS.filter((e) => e.year === year),
    isOnline: true,
    lastSynced: meta?.lastSynced || new Date().toISOString(),
  };
}

export async function fetchMonthEvents(year: number, month: number): Promise<CalendarEvent[]> {
  try {
    await syncLiveCalendar();
    const live = await getLiveEvents(`/api/calendar/month/${year}/${month}`);
    if (live && live.events.length > 0) return live.events;
  } catch {}
  const events = getCachedCalendar().filter((e) => e.year === year && e.month === month);
  return events.length > 0 ? events : DEFAULT_CALENDAR_EVENTS.filter((e) => e.year === year && e.month === month);
}

export async function fetchWeekEvents(start: string, end: string): Promise<CalendarEvent[]> {
  try {
    await syncLiveCalendar();
    const live = await getLiveEvents(`/api/calendar/week?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    if (live && live.events.length > 0) return live.events;
  } catch {}
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const events = getCachedCalendar().filter((event) => event.utcTimestamp >= s && event.utcTimestamp <= e);
  return events.length > 0 ? events : DEFAULT_CALENDAR_EVENTS.filter((event) => event.utcTimestamp >= s && event.utcTimestamp <= e);
}

export async function fetchUpcomingEvents(limit = 60): Promise<CalendarEvent[]> {
  try {
    await syncLiveCalendar();
    const live = await getLiveEvents(`/api/calendar/upcoming?limit=${limit}`);
    if (live && live.events.length > 0) return live.events;
  } catch {}
  const now = Date.now();
  const pool = getCachedCalendar();
  const upcoming = pool.filter((e) => e.utcTimestamp >= now);
  if (upcoming.length > 0) return upcoming.slice(0, limit);
  return pool.slice(0, limit);
}

export async function fetchHistoricalEvents(limit = 60): Promise<CalendarEvent[]> {
  try {
    await syncLiveCalendar();
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
  const meta = await getCalendarMeta();
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
