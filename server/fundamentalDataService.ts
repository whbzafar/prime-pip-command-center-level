import { createHash } from 'crypto';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

type RegistryRow = {
  id: string;
  indicator_key: string;
  asset_code: string;
  indicator_name: string;
  category: string;
  frequency: string;
  external_series_id: string | null;
  unit: string | null;
  direction_rule: string;
  base_weight: number;
  priority: number;
  source: { source_key: string; source_name: string; provider_type: string; base_url: string | null } | null;
};

type NormalizedObservation = {
  indicator_id: string;
  observation_period: string;
  previous_value: number | null;
  forecast_value: number | null;
  actual_value: number | null;
  revised_previous_value: number | null;
  unit: string | null;
  release_timestamp: string | null;
  source_timestamp: string | null;
  source_url: string | null;
  source_record_id: string;
  validation_status: 'VALID' | 'DATA_UNAVAILABLE' | 'VALIDATION_ERROR' | 'SOURCE_ERROR';
  data_origin: 'API';
  raw_payload: unknown;
};

function adminHeaders() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Supabase server configuration is missing.');
  return {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function supabaseJson(path: string, init: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init.headers || {}) },
    signal: init.signal || AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

async function loadRegistry(scope = 'USD'): Promise<RegistryRow[]> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/fm_indicator_registry`);
  url.searchParams.set('select', 'id,indicator_key,asset_code,indicator_name,category,frequency,external_series_id,unit,direction_rule,base_weight,priority,source:fm_data_sources(source_key,source_name,provider_type,base_url)');
  url.searchParams.set('asset_code', `eq.${scope}`);
  url.searchParams.set('enabled', 'eq.true');
  url.searchParams.set('order', 'priority.asc,indicator_key.asc');
  return await supabaseJson(url.pathname + url.search);
}

async function beginSync(scope: string, sourceId?: string) {
  const rows = await supabaseJson('/rest/v1/fm_sync_runs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ scope, source_id: sourceId || null, status: 'RUNNING' }),
  });
  return rows?.[0]?.id as string;
}

async function finishSync(id: string, patch: Record<string, unknown>) {
  await supabaseJson(`/rest/v1/fm_sync_runs?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ...patch, completed_at: new Date().toISOString() }),
  });
}

async function fetchBlsSeries(seriesIds: string[]): Promise<any[]> {
  const now = new Date();
  const startYear = String(now.getUTCFullYear() - 2);
  const endYear = String(now.getUTCFullYear());
  const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ seriesid: seriesIds, startyear: startYear, endyear: endYear }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`BLS HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.status !== 'REQUEST_SUCCEEDED' || !Array.isArray(payload?.Results?.series)) {
    throw new Error('BLS returned an unsuccessful response.');
  }
  return payload.Results.series;
}

async function fetchFredLatest(seriesId: string) {
  const response = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`, {
    headers: { Accept: 'text/csv', 'User-Agent': 'PrimePipFX-Fundamental-Terminal/2.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`FRED HTTP ${response.status}`);
  const lines = (await response.text()).trim().split(/\r?\n/);
  const rows = lines.slice(1).map((line) => {
    const comma = line.indexOf(',');
    return comma > 0 ? { date: line.slice(0, comma), raw: line.slice(comma + 1) } : null;
  }).filter(Boolean) as Array<{date:string;raw:string}>;
  const valid = rows.filter((r) => r.raw !== '.' && Number.isFinite(Number(r.raw)));
  const latest = valid.at(-1);
  const previous = valid.at(-2);
  if (!latest) throw new Error(`FRED series ${seriesId} has no numeric observation.`);
  return { latest, previous };
}

function periodFromBls(year: string, period: string) {
  return period.startsWith('M') ? `${year}-${period.slice(1)}` : `${year}-${period}`;
}

function stableRecordId(indicatorKey: string, period: string, externalId: string) {
  return createHash('sha256').update(`${indicatorKey}|${period}|${externalId}`).digest('hex').slice(0, 40);
}

function numeric(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapBlsRows(registry: RegistryRow[], series: any[]): NormalizedObservation[] {
  const bySeries = new Map<string, any>();
  for (const item of series) bySeries.set(item.seriesID, item);
  const result: NormalizedObservation[] = [];

  for (const item of registry) {
    if (item.source?.source_key !== 'BLS_PUBLIC_API' || !item.external_series_id) continue;
    const data = Array.isArray(bySeries.get(item.external_series_id)?.data)
      ? bySeries.get(item.external_series_id).data.filter((x: any) => /^M\d{2}$/.test(x.period))
      : [];
    const newest = data[0];
    const prior = data[1];
    if (!newest) {
      result.push({
        indicator_id: item.id, observation_period: 'UNAVAILABLE',
        previous_value: null, forecast_value: null, actual_value: null, revised_previous_value: null,
        unit: item.unit, release_timestamp: null, source_timestamp: null, source_url: `https://data.bls.gov/timeseries/${item.external_series_id}`,
        source_record_id: stableRecordId(item.indicator_key, 'UNAVAILABLE', item.external_series_id),
        validation_status: 'DATA_UNAVAILABLE', data_origin: 'API', raw_payload: item,
      });
      continue;
    }
    const period = periodFromBls(newest.year, newest.period);
    result.push({
      indicator_id: item.id,
      observation_period: period,
      previous_value: numeric(prior?.value),
      forecast_value: null,
      actual_value: numeric(newest.value),
      revised_previous_value: null,
      unit: item.unit,
      release_timestamp: null,
      source_timestamp: new Date(`${newest.year}-${newest.period.slice(1)}-01T00:00:00Z`).toISOString(),
      source_url: `https://data.bls.gov/timeseries/${item.external_series_id}`,
      source_record_id: stableRecordId(item.indicator_key, period, item.external_series_id),
      validation_status: numeric(newest.value) === null ? 'VALIDATION_ERROR' : 'VALID',
      data_origin: 'API',
      raw_payload: newest,
    });
  }
  return result;
}

async function upsertObservations(observations: NormalizedObservation[]) {
  if (!observations.length) return { inserted: 0, updated: 0, rejected: 0 };
  const rows = observations.map((o) => ({ ...o, raw_payload: o.raw_payload }));
  const body = await supabaseJson('/rest/v1/fm_observations?on_conflict=indicator_id,observation_period,source_record_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(rows),
  });
  return { inserted: Array.isArray(body) ? body.length : rows.length, updated: 0, rejected: 0 };
}

export async function syncFundamentalData(scope = 'USD') {
  const registry = await loadRegistry(scope);
  if (!registry.length) throw new Error(`No enabled indicators are configured for ${scope}.`);

  const sourceGroups = new Map<string, RegistryRow[]>();
  for (const row of registry) {
    const key = row.source?.source_key || 'UNKNOWN';
    const group = sourceGroups.get(key) || [];
    group.push(row);
    sourceGroups.set(key, group);
  }

  const primarySource = registry[0].source;
  const syncId = await beginSync(scope, undefined);
  let received = 0;
  let inserted = 0;
  let rejected = 0;

  try {
    const all: NormalizedObservation[] = [];

    const bls = sourceGroups.get('BLS_PUBLIC_API') || [];
    if (bls.length) {
      const series = await fetchBlsSeries(bls.map((r) => r.external_series_id!).filter(Boolean));
      const mapped = mapBlsRows(bls, series);
      all.push(...mapped);
      received += mapped.length;
    }

    const fred = sourceGroups.get('FRED_PUBLIC_FEED') || [];
    for (const row of fred) {
      try {
        const values = await fetchFredLatest(row.external_series_id!);
        const latestValue = numeric(values.latest.raw);
        const previousValue = numeric(values.previous?.raw);
        const period = values.latest.date;
        all.push({
          indicator_id: row.id,
          observation_period: period,
          previous_value: previousValue,
          forecast_value: null,
          actual_value: latestValue,
          revised_previous_value: null,
          unit: row.unit,
          release_timestamp: null,
          source_timestamp: new Date(`${period}T00:00:00Z`).toISOString(),
          source_url: `https://fred.stlouisfed.org/series/${row.external_series_id}`,
          source_record_id: stableRecordId(row.indicator_key, period, row.external_series_id!),
          validation_status: latestValue === null ? 'VALIDATION_ERROR' : 'VALID',
          data_origin: 'API',
          raw_payload: { latest: values.latest, previous: values.previous },
        });
        received++;
      } catch (error) {
        all.push({
          indicator_id: row.id, observation_period: 'UNAVAILABLE',
          previous_value: null, forecast_value: null, actual_value: null, revised_previous_value: null,
          unit: row.unit, release_timestamp: null, source_timestamp: null,
          source_url: `https://fred.stlouisfed.org/series/${row.external_series_id}`,
          source_record_id: stableRecordId(row.indicator_key, 'UNAVAILABLE', row.external_series_id!),
          validation_status: 'SOURCE_ERROR', data_origin: 'API', raw_payload: { error: String(error) },
        });
        rejected++;
      }
    }

    const upsert = await upsertObservations(all);
    inserted = upsert.inserted;
    rejected += upsert.rejected;

    await finishSync(syncId, {
      status: rejected > 0 ? 'PARTIAL' : 'SUCCESS',
      records_received: received,
      records_inserted: inserted,
      records_updated: 0,
      records_rejected: rejected,
      metadata: {
        sources: [...sourceGroups.keys()],
        configuredIndicators: registry.length,
        primarySource: primarySource?.source_key || null,
      },
    });

    return { ok: true, scope, configuredIndicators: registry.length, received, inserted, rejected, observations: all };
  } catch (error) {
    await finishSync(syncId, {
      status: 'FAILED',
      records_received: received,
      records_inserted: inserted,
      records_rejected: rejected,
      error_message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getFundamentalDataStatus(scope = 'USD') {
  const registry = await loadRegistry(scope);
  const url = new URL(`${SUPABASE_URL}/rest/v1/fm_observations`);
  url.searchParams.set('select', 'id,indicator_id,observation_period,previous_value,forecast_value,actual_value,unit,retrieved_at,source_url,validation_status,data_origin');
  url.searchParams.set('indicator_id', 'in.(' + registry.map((r) => r.id).join(',') + ')');
  url.searchParams.set('order', 'retrieved_at.desc');
  const observations = registry.length ? await supabaseJson(url.pathname + url.search) : [];
  return { ok: true, scope, registry, observations };
}
