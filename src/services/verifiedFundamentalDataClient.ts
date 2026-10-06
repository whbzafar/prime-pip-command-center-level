export type VerifiedFundamentalStatus = {
  ok: boolean;
  scope: string;
  registry: Array<{
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
    source?: { source_key: string; source_name: string; provider_type: string; base_url: string | null } | null;
  }>;
  observations: Array<{
    id: string;
    indicator_id: string;
    observation_period: string;
    previous_value: number | null;
    forecast_value: number | null;
    actual_value: number | null;
    unit: string | null;
    retrieved_at: string;
    source_url: string | null;
    validation_status: string;
    data_origin: string;
  }>;
};

export async function getVerifiedFundamentalStatus(scope = 'USD'): Promise<VerifiedFundamentalStatus> {
  const response = await fetch(`/api/fundamental-data/status?scope=${encodeURIComponent(scope)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Verified fundamental data is unavailable.');
  }
  return payload;
}

export async function syncVerifiedFundamentalData(scope = 'USD') {
  const response = await fetch('/api/fundamental-data/sync', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ scope }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Verified fundamental synchronization failed.');
  }
  return payload;
}
