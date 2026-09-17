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

const CACHE_KEY = 'primepipfx_calendar_live_cache_v4';
const META_KEY = 'primepipfx_calendar_live_meta_v4';

export function getCachedCalendar(): CalendarEvent[] {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export function setCachedCalendar(events: CalendarEvent[]) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(events)); } catch {} }
export function getCachedMeta(): CalendarMeta | null {
  try { const raw = localStorage.getItem(META_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function setCachedMeta(meta: CalendarMeta) { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {} }

async function syncLiveCalendar(): Promise<boolean> {
  try {
    const res = await fetch('/api/calendar/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) return false;
    const result = await res.json();
    return Boolean(result.ok);
  } catch { return false; }
}

async function getLiveEvents(endpoint: string): Promise<{ events: CalendarEvent[]; meta?: CalendarMeta } | null> {
  try {
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.events)) return null;
    if (data.meta) setCachedMeta(data.meta);
    setCachedCalendar(data.events);
    return { events: data.events, meta: data.meta };
  } catch { return null; }
}

export async function fetchYearEvents(year: number) {
  // A live sync happens before every calendar view refresh. No generated/fake values are used.
  await syncLiveCalendar();
  const live = await getLiveEvents(`/api/calendar/year/${year}`);
  if (live) return { events: live.events, isOnline: true, lastSynced: live.meta?.lastSynced || new Date().toISOString() };
  const cached = getCachedCalendar().filter(e => e.year === year);
  const meta = getCachedMeta();
  return { events: cached, isOnline: false, lastSynced: meta?.lastSynced || new Date(0).toISOString() };
}

export async function fetchMonthEvents(year: number, month: number): Promise<CalendarEvent[]> {
  await syncLiveCalendar();
  const live = await getLiveEvents(`/api/calendar/month/${year}/${month}`);
  return live?.events || getCachedCalendar().filter(e => e.year === year && e.month === month);
}

export async function fetchWeekEvents(start: string, end: string): Promise<CalendarEvent[]> {
  await syncLiveCalendar();
  const live = await getLiveEvents(`/api/calendar/week?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  if (live) return live.events;
  const s = new Date(start).getTime(), e = new Date(end).getTime();
  return getCachedCalendar().filter(event => event.utcTimestamp >= s && event.utcTimestamp <= e);
}

export async function fetchUpcomingEvents(limit = 40): Promise<CalendarEvent[]> {
  await syncLiveCalendar();
  const live = await getLiveEvents(`/api/calendar/upcoming?limit=${limit}`);
  if (live) return live.events;
  const now = Date.now();
  return getCachedCalendar().filter(e => e.utcTimestamp >= now).slice(0, limit);
}

export async function fetchHistoricalEvents(limit = 40): Promise<CalendarEvent[]> {
  await syncLiveCalendar();
  const live = await getLiveEvents(`/api/calendar/historical?limit=${limit}`);
  if (live) return live.events;
  const now = Date.now();
  return getCachedCalendar().filter(e => e.utcTimestamp < now).sort((a,b) => b.utcTimestamp-a.utcTimestamp).slice(0, limit);
}

export async function syncCalendar() {
  const ok = await syncLiveCalendar();
  const meta = await getCalendarMeta();
  return { ok, count: getCachedCalendar().length, isOnline: Boolean(meta?.isOnline) };
}

export async function getCalendarMeta(): Promise<CalendarMeta | null> {
  try {
    const res = await fetch('/api/calendar/meta', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.meta) { setCachedMeta(data.meta); return data.meta; }
    }
  } catch {}
  return getCachedMeta();
}
