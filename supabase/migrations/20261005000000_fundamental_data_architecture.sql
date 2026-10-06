-- ============================================================================
-- PRIME FX COMMAND CENTER — STEP 1: FOUNDATIONAL DATA ARCHITECTURE
-- Clean normalized PostgreSQL/Supabase schema for verified financial & economic
-- data ingestion, validation, audit trails, and scheduled synchronization.
-- ============================================================================

-- Standardized validation status check constraint values:
-- 'VALID', 'STALE', 'MISSING', 'DATA_UNAVAILABLE', 'DATA_CONFLICT',
-- 'VALIDATION_ERROR', 'SOURCE_ERROR', 'PENDING_VALIDATION'

-- 1. DATA SOURCES REGISTRY
create table if not exists public.data_sources (
  id text primary key,
  source_name text not null,
  provider text not null,
  source_type text not null check (source_type in ('OFFICIAL_CENTRAL_BANK', 'OFFICIAL_STATISTICAL_AGENCY', 'MARKET_DATA_API', 'REGULATORY_EXCHANGE', 'MANUAL')),
  official_url text not null,
  api_endpoint text,
  asset_classes text[] not null default '{}',
  reliability_level integer not null default 1 check (reliability_level between 1 and 5),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. ASSETS UNIVERSE REGISTRY
create table if not exists public.assets (
  id text primary key,
  symbol text not null unique,
  name text not null,
  asset_class text not null check (asset_class in ('FOREX_CURRENCY', 'FOREX_PAIR', 'COMMODITY', 'STOCK', 'INDEX', 'CRYPTO')),
  base_currency text,
  quote_currency text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. ECONOMIC INDICATORS REGISTRY
create table if not exists public.economic_indicators (
  id text primary key,
  indicator_code text not null unique,
  indicator_name text not null,
  asset_currency text not null references public.assets(id) on delete restrict,
  category text not null check (category in (
    'MONETARY_POLICY', 'INFLATION', 'GROWTH', 'EMPLOYMENT',
    'RATES_YIELDS', 'EXTERNAL_TRADE', 'COMMODITY_DRIVER',
    'POSITIONING_RISK', 'CORPORATE_EARNINGS', 'VALUATION',
    'ON_CHAIN_FLOWS', 'MARKET_BREADTH'
  )),
  frequency text not null check (frequency in ('REAL_TIME', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'EVENT_DRIVEN')),
  source_id text not null references public.data_sources(id) on delete restrict,
  source_series_id text not null,
  expected_unit text not null default '%',
  transformation text not null default 'LEVEL',
  importance_level text not null check (importance_level in ('TIER_1_EXTREME', 'TIER_2_HIGH', 'TIER_3_MODERATE', 'TIER_4_LOW')),
  base_weight numeric(6,2) not null default 1.00,
  direction_rule text not null check (direction_rule in (
    'HIGHER_IS_BULLISH', 'LOWER_IS_BULLISH', 'INFLATION_POLICY_PATH',
    'YIELD_DIFFERENTIAL', 'NEUTRAL_CONTEXT'
  )),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3B. ASSET & REGIME-SPECIFIC WEIGHT OVERRIDES
-- Supports different weights for different assets and different market regimes
create table if not exists public.indicator_regime_weights (
  id uuid primary key default gen_random_uuid(),
  indicator_id text not null references public.economic_indicators(id) on delete cascade,
  asset_id text not null references public.assets(id) on delete cascade,
  regime_type text not null default 'NORMAL' check (regime_type in ('NORMAL', 'INFLATION_CRISIS', 'RECESSION', 'GLOBAL_RISK_OFF', 'CARRY_REGIME')),
  weight numeric(6,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(indicator_id, asset_id, regime_type)
);

-- 4. ECONOMIC OBSERVATIONS (IMMUTABLE AUDITABLE RELEASES & REVISIONS)
create table if not exists public.economic_observations (
  id uuid primary key default gen_random_uuid(),
  indicator_id text not null references public.economic_indicators(id) on delete cascade,
  observation_period text not null,
  previous_value numeric(18,6),
  forecast_value numeric(18,6),
  actual_value numeric(18,6),
  revised_previous_value numeric(18,6),
  surprise_value numeric(18,6),
  surprise_score numeric(8,4),
  source_id text not null references public.data_sources(id) on delete restrict,
  source_url text not null,
  source_timestamp timestamptz,
  retrieved_at timestamptz not null default now(),
  release_timestamp timestamptz,
  validation_status text not null default 'PENDING_VALIDATION' check (validation_status in (
    'VALID', 'STALE', 'MISSING', 'DATA_UNAVAILABLE',
    'DATA_CONFLICT', 'VALIDATION_ERROR', 'SOURCE_ERROR', 'PENDING_VALIDATION'
  )),
  verification_status text not null default 'API_RETRIEVED' check (verification_status in (
    'VERIFIED', 'API_RETRIEVED', 'MANUAL', 'CONFLICT_FLAGGED', 'REJECTED'
  )),
  entered_by text,
  entered_at timestamptz,
  notes text,
  data_quality_score integer not null default 100 check (data_quality_score between 0 and 100),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(indicator_id, observation_period, source_id)
);

-- 5. MARKET PRICES (MULTI-ASSET OHLCV FEED)
create table if not exists public.market_prices (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references public.assets(id) on delete cascade,
  timestamp timestamptz not null,
  open numeric(20,8),
  high numeric(20,8),
  low numeric(20,8),
  close numeric(20,8),
  volume numeric(24,4),
  timeframe text not null default '1D' check (timeframe in ('15M', '1H', '4H', '1D', '1W')),
  source_id text not null references public.data_sources(id) on delete restrict,
  retrieved_at timestamptz not null default now(),
  validation_status text not null default 'VALID' check (validation_status in (
    'VALID', 'STALE', 'MISSING', 'DATA_UNAVAILABLE',
    'DATA_CONFLICT', 'VALIDATION_ERROR', 'SOURCE_ERROR', 'PENDING_VALIDATION'
  )),
  unique(asset_id, timeframe, timestamp, source_id)
);

-- 6. DATA QUALITY LOGS
create table if not exists public.data_quality_logs (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.data_sources(id) on delete set null,
  endpoint text not null,
  request_time timestamptz not null default now(),
  response_status integer,
  validation_result text not null check (validation_result in (
    'VALID', 'STALE', 'MISSING', 'DATA_UNAVAILABLE',
    'DATA_CONFLICT', 'VALIDATION_ERROR', 'SOURCE_ERROR', 'PENDING_VALIDATION'
  )),
  missing_fields text[] not null default '{}',
  stale_data boolean not null default false,
  duplicate_data boolean not null default false,
  conflicting_data boolean not null default false,
  error_message text,
  created_at timestamptz not null default now()
);

-- 7. AUTOMATED SYNCHRONIZATION LOGS
create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.data_sources(id) on delete set null,
  function_name text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null check (status in ('RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED')),
  records_received integer not null default 0,
  records_inserted integer not null default 0,
  records_updated integer not null default 0,
  records_rejected integer not null default 0,
  error_message text
);

-- INDEXES FOR FAST AUDIT TRAIL & TIME-SERIES RETRIEVAL
create index if not exists idx_economic_indicators_asset_currency on public.economic_indicators(asset_currency);
create index if not exists idx_economic_indicators_source_id on public.economic_indicators(source_id);
create index if not exists idx_economic_observations_indicator_period on public.economic_observations(indicator_id, observation_period desc);
create index if not exists idx_economic_observations_validation_status on public.economic_observations(validation_status);
create index if not exists idx_market_prices_asset_timestamp on public.market_prices(asset_id, timestamp desc);
create index if not exists idx_data_quality_logs_request_time on public.data_quality_logs(request_time desc);
create index if not exists idx_sync_logs_started_at on public.sync_logs(started_at desc);

-- ROW LEVEL SECURITY (Server-Authoritative Boundary)
alter table public.data_sources enable row level security;
alter table public.assets enable row level security;
alter table public.economic_indicators enable row level security;
alter table public.indicator_regime_weights enable row level security;
alter table public.economic_observations enable row level security;
alter table public.market_prices enable row level security;
alter table public.data_quality_logs enable row level security;
alter table public.sync_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'data_sources','assets','economic_indicators','indicator_regime_weights',
    'economic_observations','market_prices','data_quality_logs','sync_logs'
  ] loop
    execute format('drop policy if exists "deny direct data api access" on public.%I', t);
    execute format('create policy "deny direct data api access" on public.%I for all to anon, authenticated using (false) with check (false)', t);
  end loop;
end $$;
