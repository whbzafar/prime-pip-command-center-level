/**
 * Live Economic News Radar provider adapter.
 *
 * This module intentionally does not generate or invent market/news values.
 * Configure ECONOMIC_NEWS_RADAR_URL with a legitimate provider endpoint that
 * returns a JSON array (or { events: [...] }).
 */

export interface LiveEconomicNewsItem {
  id: string;
  title: string;
  currency?: string;
  country?: string;
  impact?: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  timestamp?: string;
  source?: string;
  url?: string;
  actual?: string | number | null;
  forecast?: string | number | null;
  previous?: string | number | null;
}

export interface LiveEconomicNewsRadarResult {
  ok: boolean;
  sourceConfigured: boolean;
  fetchedAt: string;
  items: LiveEconomicNewsItem[];
  error?: string;
}

const REQUEST_TIMEOUT_MS = 8000;

function normalizeImpact(value: unknown): LiveEconomicNewsItem['impact'] {
  const normalized = String(value ?? '').toUpperCase();
  if (normalized.includes('HIGH') || normalized.includes('RED')) return 'HIGH';
  if (normalized.includes('MEDIUM') || normalized.includes('ORANGE')) return 'MEDIUM';
  if (normalized.includes('LOW') || normalized.includes('YELLOW')) return 'LOW';
  return 'UNKNOWN';
}

function normalizeItem(raw: any, index: number): LiveEconomicNewsItem | null {
  const title = raw?.title ?? raw?.event ?? raw?.eventName ?? raw?.name;
  if (typeof title !== 'string' || !title.trim()) return null;

  return {
    id: String(raw.id ?? raw.eventId ?? `${title}-${index}`),
    title: title.trim(),
    currency: raw.currency ?? raw.currencyCode,
    country: raw.country,
    impact: normalizeImpact(raw.impact ?? raw.importance ?? raw.volatility),
    timestamp: raw.timestamp ?? raw.date ?? raw.datetime ?? raw.utcTimestamp,
    source: raw.source ?? 'Configured live provider',
    url: raw.url ?? raw.link,
    actual: raw.actual ?? null,
    forecast: raw.forecast ?? raw.consensus ?? null,
    previous: raw.previous ?? raw.prior ?? null,
  };
}

export async function fetchLiveEconomicNewsRadar(): Promise<LiveEconomicNewsRadarResult> {
  const fetchedAt = new Date().toISOString();
  const endpoint = process.env.ECONOMIC_NEWS_RADAR_URL?.trim();

  if (!endpoint) {
    return {
      ok: false,
      sourceConfigured: false,
      fetchedAt,
      items: [],
      error: 'No live economic news provider is configured.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Provider returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rawItems = Array.isArray(payload) ? payload : payload?.events ?? payload?.items;

    if (!Array.isArray(rawItems)) {
      throw new Error('Provider response must be an array or contain events/items array.');
    }

    const items = rawItems.map(normalizeItem).filter(Boolean) as LiveEconomicNewsItem[];

    return {
      ok: true,
      sourceConfigured: true,
      fetchedAt,
      items,
    };
  } catch (error: any) {
    return {
      ok: false,
      sourceConfigured: true,
      fetchedAt,
      items: [],
      error: error?.name === 'AbortError' ? 'Live provider request timed out.' : String(error?.message ?? error),
    };
  } finally {
    clearTimeout(timeout);
  }
}
