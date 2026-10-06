-- Prime FX verified fundamental data foundation
-- Generated from the live schema on 2026-10-06 after direct schema verification.
create table if not exists public.fm_data_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text not null,
  provider_type text not null check (provider_type in ('OFFICIAL_API','OFFICIAL_FEED','MARKET_API','CONSENSUS','MANUAL')),
  base_url text,
  reliability_rank integer not null default 100 check (reliability_rank between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fm_assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  asset_class text not null check (asset_class in ('CURRENCY','FOREX_PAIR','COMMODITY','STOCK','INDEX','CRYPTO')),
  base_code text,
  quote_code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fm_indicator_registry (
  id uuid primary key default gen_random_uuid(),
  indicator_key text not null unique,
  asset_code text not null,
  indicator_name text not null,
  category text not null,
  frequency text not null,
  source_id uuid not null references public.fm_data_sources(id),
  external_series_id text,
  unit text,
  direction_rule text not null,
  base_weight numeric(8,4) not null default 0,
  priority integer not null default 3 check (priority between 1 and 5),
  enabled boolean not null default true,
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.fm_observations (
  id uuid primary key default gen_random_uuid(),
  indicator_id uuid not null references public.fm_indicator_registry(id),
  observation_period text not null,
  previous_value numeric,
  forecast_value numeric,
  actual_value numeric,
  revised_previous_value numeric,
  unit text,
  release_timestamp timestamptz,
  source_timestamp timestamptz,
  retrieved_at timestamptz not null default now(),
  source_url text,
  source_record_id text,
  validation_status text not null default 'PENDING_VALIDATION',
  data_origin text not null default 'API',
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(indicator_id, observation_period, source_record_id)
);
create table if not exists public.fm_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.fm_data_sources(id),
  scope text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'RUNNING',
  records_received integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_rejected integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb
);
