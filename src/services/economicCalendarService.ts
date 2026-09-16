export interface CalendarEvent {
  id: string;
  utcTimestamp: number;
  date: string; // YYYY-MM-DD
  timeUtc: string;
  timePkt: string; // e.g. "05:30 PM PKT" (Asia/Karachi 12-hour AM/PM)
  datePkt: string; // e.g. "11 Sep 2026"
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
  marketRelevance: {
    usd: string;
    gold: string;
    forex: string;
    indices: string;
  };
}

export interface CalendarMeta {
  lastSynced: string;
  isOnline: boolean;
  eventCount: number;
  yearRange: [number, number];
  primaryTimezone: string;
  source: string;
}

const CACHE_KEY = 'primepipfx_calendar_cache_v3';
const META_KEY = 'primepipfx_calendar_meta_v3';

export function getCachedCalendar(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading calendar cache:', err);
  }
  return [];
}

export function setCachedCalendar(events: CalendarEvent[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn('Error saving calendar cache:', err);
  }
}

export function getCachedMeta(): CalendarMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    return null;
  }
  return null;
}

export function setCachedMeta(meta: CalendarMeta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn('Error saving calendar meta:', err);
  }
}

// Client service API
export async function fetchYearEvents(year: number): Promise<{ events: CalendarEvent[]; isOnline: boolean; lastSynced: string }> {
  try {
    const res = await fetch(`/api/calendar/year/${year}`);
    if (res.ok) {
      const data = await res.json();
      if (data.events) {
        setCachedCalendar(data.events);
        if (data.meta) setCachedMeta(data.meta);
        return {
          events: data.events,
          isOnline: data.meta?.isOnline ?? true,
          lastSynced: data.meta?.lastSynced ?? new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('Network issue fetching year events, falling back to cache:', err);
  }

  // Fallback to local cache
  const cached = getCachedCalendar().filter((e) => e.year === year);
  const meta = getCachedMeta();
  return {
    events: cached,
    isOnline: false,
    lastSynced: meta?.lastSynced ?? new Date().toISOString(),
  };
}

export async function fetchMonthEvents(year: number, month: number): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`/api/calendar/month/${year}/${month}`);
    if (res.ok) {
      const data = await res.json();
      if (data.events) return data.events;
    }
  } catch (err) {
    console.warn('Network issue fetching month events, using cache:', err);
  }
  return getCachedCalendar().filter((e) => e.year === year && e.month === month);
}

export async function fetchWeekEvents(start: string, end: string): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`/api/calendar/week?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.events) return data.events;
    }
  } catch (err) {
    console.warn('Network issue fetching week events, using cache:', err);
  }
  const sTime = new Date(start).getTime();
  const eTime = new Date(end).getTime();
  return getCachedCalendar().filter((e) => e.utcTimestamp >= sTime && e.utcTimestamp <= eTime);
}

export async function fetchUpcomingEvents(limit = 40): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`/api/calendar/upcoming?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (data.events) return data.events;
    }
  } catch (err) {
    console.warn('Network issue fetching upcoming events, using cache:', err);
  }
  const now = Date.now();
  return getCachedCalendar().filter((e) => e.utcTimestamp >= now).slice(0, limit);
}

export async function fetchHistoricalEvents(limit = 40): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(`/api/calendar/historical?limit=${limit}`);
    if (res.ok) {
      const data = await res.json();
      if (data.events) return data.events;
    }
  } catch (err) {
    console.warn('Network issue fetching historical events, using cache:', err);
  }
  const now = Date.now();
  return getCachedCalendar().filter((e) => e.utcTimestamp < now).reverse().slice(0, limit);
}

export async function syncCalendar(): Promise<{ ok: boolean; count: number; isOnline: boolean }> {
  try {
    const res = await fetch('/api/calendar/meta');
    if (res.ok) {
      const data = await res.json();
      if (data.meta) setCachedMeta(data.meta);
    }
    const yearRes = await fetchYearEvents(2026);
    return { ok: true, count: yearRes.events.length, isOnline: yearRes.isOnline };
  } catch {
    return { ok: false, count: 0, isOnline: false };
  }
}

export async function getCalendarMeta(): Promise<CalendarMeta | null> {
  try {
    const res = await fetch('/api/calendar/meta');
    if (res.ok) {
      const data = await res.json();
      if (data.meta) {
        setCachedMeta(data.meta);
        return data.meta;
      }
    }
  } catch {
    // fallback
  }
  return getCachedMeta();
}
