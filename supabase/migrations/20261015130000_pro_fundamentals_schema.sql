-- ============================================================================
-- PRO FUNDAMENTALS: CORE RELATIONAL SCHEMA MIGRATION
-- Migration: 20261015130000_pro_fundamentals_schema.sql
-- Description: Creates reference tables, append-only raw observation tables,
--              derived scoring tables, and operations logging tables.
-- Principles: Auditability, immutability of raw data, asset-class agnosticism.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. ENUMS & DOMAINS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.pf_asset_class AS ENUM ('currency', 'commodity', 'crypto', 'index', 'stock');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.pf_horizon AS ENUM ('short', 'long');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.pf_indicator_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'event');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.pf_indicator_polarity AS ENUM ('higher_bullish', 'higher_bearish', 'contrarian_extreme', 'neutral_context');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.pf_impact_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.pf_confidence_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.pf_job_status AS ENUM ('success', 'partial', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.pf_quality_flag_type AS ENUM ('stale', 'out_of_range', 'missing', 'suspicious_jump');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- 1. REFERENCE & CONFIGURATION TABLES
-- ----------------------------------------------------------------------------

-- Table: data_sources
CREATE TABLE IF NOT EXISTS public.data_sources (
  id text PRIMARY KEY,
  name text NOT NULL,
  base_url text NOT NULL,
  license_note text NOT NULL,
  commercial_use_ok boolean NOT NULL DEFAULT false,
  rate_limit_note text,
  is_active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.data_sources IS 'Registry of institutional and official economic data providers, with licensing and rate limit audits.';
COMMENT ON COLUMN public.data_sources.id IS 'Unique identifier for data source (e.g., fred, cftc, ecb, boe).';
COMMENT ON COLUMN public.data_sources.name IS 'Human-readable provider name.';
COMMENT ON COLUMN public.data_sources.base_url IS 'Root endpoint or portal URL for the source API.';
COMMENT ON COLUMN public.data_sources.license_note IS 'Commercial attribution, redistribution requirements, or verification notes.';
COMMENT ON COLUMN public.data_sources.commercial_use_ok IS 'Flag indicating whether redistribution/commercial use has been legally audited.';
COMMENT ON COLUMN public.data_sources.rate_limit_note IS 'Rate limiting policy guidelines (e.g., 120 req/min).';
COMMENT ON COLUMN public.data_sources.is_active IS 'Whether this data provider is currently polled by automated jobs.';

-- Table: assets
CREATE TABLE IF NOT EXISTS public.assets (
  id text PRIMARY KEY,
  asset_class public.pf_asset_class NOT NULL,
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.assets IS 'Asset catalog across currencies, commodities, crypto, indices, and stocks.';
COMMENT ON COLUMN public.assets.id IS 'Normalized primary key (e.g. curr_usd, comm_xau).';
COMMENT ON COLUMN public.assets.asset_class IS 'Domain asset class categorization (currency, commodity, crypto, index, stock).';
COMMENT ON COLUMN public.assets.symbol IS 'Market symbol or ISO ticker (e.g. USD, EUR, XAU, BTC).';
COMMENT ON COLUMN public.assets.name IS 'Full formal asset name (e.g. US Dollar, Gold Spot).';
COMMENT ON COLUMN public.assets.metadata IS 'Structured attributes such as central bank, country code, sector, flag emoji.';
COMMENT ON COLUMN public.assets.is_active IS 'Enables or disables scoring and presentation for this asset.';

-- Table: pillars
CREATE TABLE IF NOT EXISTS public.pillars (
  id text PRIMARY KEY,
  asset_class public.pf_asset_class NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE(asset_class, code)
);

COMMENT ON TABLE public.pillars IS 'Macroeconomic and structural pillars configuring scoring dimensions per asset class.';
COMMENT ON COLUMN public.pillars.id IS 'Primary identifier for pillar (e.g. curr_monetary, curr_inflation).';
COMMENT ON COLUMN public.pillars.asset_class IS 'Asset class to which this pillar applies.';
COMMENT ON COLUMN public.pillars.code IS 'Short machine-readable identifier (e.g. monetary, inflation, growth_labor).';
COMMENT ON COLUMN public.pillars.name IS 'Display name of fundamental pillar.';
COMMENT ON COLUMN public.pillars.description IS 'Detailed scope explaining what indicators belong in this pillar.';
COMMENT ON COLUMN public.pillars.sort_order IS 'Visual sequencing order in dashboards.';

-- Table: model_versions
CREATE TABLE IF NOT EXISTS public.model_versions (
  id text PRIMARY KEY,
  version_label text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.model_versions IS 'Audited registry of scoring algorithm and weight configurations for reproducible backtesting.';
COMMENT ON COLUMN public.model_versions.id IS 'Unique version identifier (e.g. v0.1-initial).';
COMMENT ON COLUMN public.model_versions.version_label IS 'Semantic label of the quantitative model.';
COMMENT ON COLUMN public.model_versions.description IS 'Summary of methodological changes introduced in this version.';
COMMENT ON COLUMN public.model_versions.created_at IS 'Timestamp when this version was ratified and activated.';
COMMENT ON COLUMN public.model_versions.is_active IS 'Whether this model version is active for live production scoring.';

-- Table: pillar_weights
CREATE TABLE IF NOT EXISTS public.pillar_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id text NOT NULL REFERENCES public.model_versions(id) ON DELETE CASCADE,
  asset_class public.pf_asset_class NOT NULL,
  pillar_id text NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
  horizon public.pf_horizon NOT NULL,
  weight numeric(6,4) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  UNIQUE(model_version_id, asset_class, pillar_id, horizon)
);

COMMENT ON TABLE public.pillar_weights IS 'Configured weights allocating relative importance across pillars per model, asset class, and horizon.';
COMMENT ON COLUMN public.pillar_weights.id IS 'Unique row UUID.';
COMMENT ON COLUMN public.pillar_weights.model_version_id IS 'Associated quantitative model version.';
COMMENT ON COLUMN public.pillar_weights.asset_class IS 'Target asset class.';
COMMENT ON COLUMN public.pillar_weights.pillar_id IS 'Target fundamental pillar.';
COMMENT ON COLUMN public.pillar_weights.horizon IS 'Time horizon (short: 1-4 weeks, long: 6+ months).';
COMMENT ON COLUMN public.pillar_weights.weight IS 'Relative decimal weight between 0.00 and 1.00 (must sum to 1.00 across all pillars in cohort).';

-- Table: indicators
CREATE TABLE IF NOT EXISTS public.indicators (
  id text PRIMARY KEY,
  asset_id text NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  pillar_id text NOT NULL REFERENCES public.pillars(id) ON DELETE RESTRICT,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  unit text NOT NULL DEFAULT '%',
  frequency public.pf_indicator_frequency NOT NULL,
  polarity public.pf_indicator_polarity NOT NULL,
  source_id text NOT NULL REFERENCES public.data_sources(id) ON DELETE RESTRICT,
  source_series_id text NOT NULL,
  normalization_window_years integer NOT NULL DEFAULT 8,
  weight_in_pillar numeric(6,4) NOT NULL DEFAULT 1.0000,
  is_active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.indicators IS 'Catalog of raw economic metrics, their series codes, normalization parameters, and polarities.';
COMMENT ON COLUMN public.indicators.id IS 'Canonical identifier (e.g. usd_fedfunds, usd_cpi_core).';
COMMENT ON COLUMN public.indicators.asset_id IS 'Asset this indicator measures.';
COMMENT ON COLUMN public.indicators.pillar_id IS 'Pillar under which this indicator rolls up.';
COMMENT ON COLUMN public.indicators.code IS 'Unique symbol or identifier code for lookups.';
COMMENT ON COLUMN public.indicators.name IS 'Full indicator name.';
COMMENT ON COLUMN public.indicators.description IS 'Economic definition and measurement rationale.';
COMMENT ON COLUMN public.indicators.unit IS 'Measurement unit (%, bps, Index, USD Millions, Persons).';
COMMENT ON COLUMN public.indicators.frequency IS 'Release cycle: daily, weekly, monthly, quarterly, event.';
COMMENT ON COLUMN public.indicators.polarity IS 'Economic directional bias: higher_bullish, higher_bearish, contrarian_extreme, neutral_context.';
COMMENT ON COLUMN public.indicators.source_id IS 'Data provider responsible for this series.';
COMMENT ON COLUMN public.indicators.source_series_id IS 'Provider-specific series key (e.g. FRED series ID "FEDFUNDS").';
COMMENT ON COLUMN public.indicators.normalization_window_years IS 'Rolling historical lookback period used for z-score normalization (default 8 years).';
COMMENT ON COLUMN public.indicators.weight_in_pillar IS 'Relative weighting of this indicator inside its parent pillar.';
COMMENT ON COLUMN public.indicators.is_active IS 'Whether this indicator is currently included in live calculation cycles.';

-- ----------------------------------------------------------------------------
-- 2. RAW DATA (IMMUTABLE & APPEND-ONLY)
-- ----------------------------------------------------------------------------

-- Table: observations
CREATE TABLE IF NOT EXISTS public.observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id text NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  period_date date NOT NULL,
  value numeric(20,8) NOT NULL,
  released_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  is_revision boolean NOT NULL DEFAULT false,
  UNIQUE(indicator_id, period_date, released_at)
);

COMMENT ON TABLE public.observations IS 'Immutable append-only raw economic observations. Historical releases are preserved without overwrite to prevent look-ahead bias.';
COMMENT ON COLUMN public.observations.id IS 'Unique observation UUID.';
COMMENT ON COLUMN public.observations.indicator_id IS 'Foreign key to parent indicator catalog.';
COMMENT ON COLUMN public.observations.period_date IS 'Reference period date the data point represents (e.g. 2026-09-01 for September reading).';
COMMENT ON COLUMN public.observations.value IS 'Exact numerical observed value.';
COMMENT ON COLUMN public.observations.released_at IS 'Official publication timestamp by issuing agency.';
COMMENT ON COLUMN public.observations.ingested_at IS 'System recording timestamp in database.';
COMMENT ON COLUMN public.observations.is_revision IS 'Flag indicating this data point is a revision of a previously released observation for the same period.';

CREATE INDEX IF NOT EXISTS idx_observations_indicator_period ON public.observations (indicator_id, period_date DESC);
CREATE INDEX IF NOT EXISTS idx_observations_released_at ON public.observations (released_at DESC);

-- Table: economic_events
CREATE TABLE IF NOT EXISTS public.economic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text REFERENCES public.assets(id) ON DELETE SET NULL,
  name text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  impact public.pf_impact_level NOT NULL,
  previous_value numeric(18,6),
  forecast_value numeric(18,6),
  actual_value numeric(18,6),
  source_id text REFERENCES public.data_sources(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.economic_events IS 'Upcoming calendar releases and historical prints acting as market catalysts.';
COMMENT ON COLUMN public.economic_events.id IS 'Unique calendar event UUID.';
COMMENT ON COLUMN public.economic_events.asset_id IS 'Target asset affected (nullable for global events).';
COMMENT ON COLUMN public.economic_events.name IS 'Formal title of the economic release.';
COMMENT ON COLUMN public.economic_events.scheduled_at IS 'Scheduled release timestamp.';
COMMENT ON COLUMN public.economic_events.impact IS 'Expected market impact severity (low, medium, high).';
COMMENT ON COLUMN public.economic_events.previous_value IS 'Prior period published reading.';
COMMENT ON COLUMN public.economic_events.forecast_value IS 'Consensus market estimate.';
COMMENT ON COLUMN public.economic_events.actual_value IS 'Actual published reading once released.';
COMMENT ON COLUMN public.economic_events.source_id IS 'Data source calendar feed.';

CREATE INDEX IF NOT EXISTS idx_economic_events_scheduled ON public.economic_events (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_economic_events_asset ON public.economic_events (asset_id, scheduled_at);

-- ----------------------------------------------------------------------------
-- 3. DERIVED DATA (WRITTEN ONLY BY BACKEND SCORING JOBS)
-- ----------------------------------------------------------------------------

-- Table: indicator_scores
CREATE TABLE IF NOT EXISTS public.indicator_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id text NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  model_version_id text NOT NULL REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  raw_value numeric(20,8) NOT NULL,
  z_score numeric(10,4) NOT NULL,
  score numeric(6,2) NOT NULL CHECK (score >= -100.00 AND score <= 100.00),
  UNIQUE(indicator_id, computed_at, model_version_id)
);

COMMENT ON TABLE public.indicator_scores IS 'Normalized z-scores and bounded -100..+100 directional scores for individual indicators.';
COMMENT ON COLUMN public.indicator_scores.id IS 'Unique score UUID.';
COMMENT ON COLUMN public.indicator_scores.indicator_id IS 'Associated indicator.';
COMMENT ON COLUMN public.indicator_scores.computed_at IS 'Timestamp when score was calculated.';
COMMENT ON COLUMN public.indicator_scores.model_version_id IS 'Model version used for calculation.';
COMMENT ON COLUMN public.indicator_scores.raw_value IS 'Raw observation value used at calculation time.';
COMMENT ON COLUMN public.indicator_scores.z_score IS 'Statistical z-score against rolling normalization window.';
COMMENT ON COLUMN public.indicator_scores.score IS 'Polarity-transformed score bounded between -100 and +100.';

CREATE INDEX IF NOT EXISTS idx_indicator_scores_lookup ON public.indicator_scores (indicator_id, computed_at DESC);

-- Table: pillar_scores
CREATE TABLE IF NOT EXISTS public.pillar_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  pillar_id text NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
  horizon public.pf_horizon NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  model_version_id text NOT NULL REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  score numeric(6,2) NOT NULL CHECK (score >= -100.00 AND score <= 100.00),
  UNIQUE(asset_id, pillar_id, horizon, computed_at, model_version_id)
);

COMMENT ON TABLE public.pillar_scores IS 'Aggregated pillar scores computed from underlying indicator scores using pillar weights.';
COMMENT ON COLUMN public.pillar_scores.id IS 'Unique pillar score UUID.';
COMMENT ON COLUMN public.pillar_scores.asset_id IS 'Target asset.';
COMMENT ON COLUMN public.pillar_scores.pillar_id IS 'Target pillar.';
COMMENT ON COLUMN public.pillar_scores.horizon IS 'Time horizon (short or long).';
COMMENT ON COLUMN public.pillar_scores.computed_at IS 'Calculation timestamp.';
COMMENT ON COLUMN public.pillar_scores.model_version_id IS 'Model version applied.';
COMMENT ON COLUMN public.pillar_scores.score IS 'Composite pillar score between -100 and +100.';

CREATE INDEX IF NOT EXISTS idx_pillar_scores_lookup ON public.pillar_scores (asset_id, horizon, computed_at DESC);

-- Table: asset_scores
CREATE TABLE IF NOT EXISTS public.asset_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  horizon public.pf_horizon NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  model_version_id text NOT NULL REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  score numeric(6,2) NOT NULL CHECK (score >= -100.00 AND score <= 100.00),
  confidence public.pf_confidence_level NOT NULL,
  confidence_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(asset_id, horizon, computed_at, model_version_id)
);

COMMENT ON TABLE public.asset_scores IS 'Overall top-level fundamental score and confidence rating per asset and horizon.';
COMMENT ON COLUMN public.asset_scores.id IS 'Unique asset score UUID.';
COMMENT ON COLUMN public.asset_scores.asset_id IS 'Target asset.';
COMMENT ON COLUMN public.asset_scores.horizon IS 'Time horizon (short or long).';
COMMENT ON COLUMN public.asset_scores.computed_at IS 'Calculation timestamp.';
COMMENT ON COLUMN public.asset_scores.model_version_id IS 'Model version applied.';
COMMENT ON COLUMN public.asset_scores.score IS 'Weighted fundamental score between -100 (Strong Bearish) and +100 (Strong Bullish).';
COMMENT ON COLUMN public.asset_scores.confidence IS 'Confidence rating: low, medium, high.';
COMMENT ON COLUMN public.asset_scores.confidence_detail IS 'Audit breakdown: pillar agreement percentage, data freshness penalty, regime stability metrics.';

CREATE INDEX IF NOT EXISTS idx_asset_scores_lookup ON public.asset_scores (asset_id, horizon, computed_at DESC);

-- Table: drivers
CREATE TABLE IF NOT EXISTS public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  horizon public.pf_horizon NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  model_version_id text NOT NULL REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  indicator_id text NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  pillar_id text NOT NULL REFERENCES public.pillars(id) ON DELETE CASCADE,
  contribution numeric(6,2) NOT NULL,
  rank integer NOT NULL CHECK (rank >= 1),
  detail_data jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.drivers IS 'Ranked positive and negative macroeconomic drivers contributing to the asset score.';
COMMENT ON COLUMN public.drivers.id IS 'Unique driver UUID.';
COMMENT ON COLUMN public.drivers.asset_id IS 'Target asset.';
COMMENT ON COLUMN public.drivers.horizon IS 'Time horizon.';
COMMENT ON COLUMN public.drivers.computed_at IS 'Calculation timestamp.';
COMMENT ON COLUMN public.drivers.model_version_id IS 'Model version.';
COMMENT ON COLUMN public.drivers.indicator_id IS 'Key indicator driving this factor.';
COMMENT ON COLUMN public.drivers.pillar_id IS 'Associated pillar.';
COMMENT ON COLUMN public.drivers.contribution IS 'Numerical score contribution (-100 to +100).';
COMMENT ON COLUMN public.drivers.rank IS 'Importance rank within the horizon (1 = primary driver).';
COMMENT ON COLUMN public.drivers.detail_data IS 'JSON object storing the exact numbers behind the driver (raw value, previous value, zScore, unit).';

CREATE INDEX IF NOT EXISTS idx_drivers_lookup ON public.drivers (asset_id, horizon, computed_at DESC, rank ASC);

-- Table: explanations
CREATE TABLE IF NOT EXISTS public.explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id text NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  horizon public.pf_horizon NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  model_version_id text NOT NULL REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  summary text NOT NULL,
  invalidation jsonb NOT NULL DEFAULT '[]'::jsonb,
  upcoming_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  llm_model text NOT NULL,
  input_hash text NOT NULL,
  UNIQUE(asset_id, horizon, model_version_id, input_hash)
);

COMMENT ON TABLE public.explanations IS 'Cached LLM-generated narrative synthesis for single assets. LLM is strictly constrained to narrative of verified numbers.';
COMMENT ON COLUMN public.explanations.id IS 'Unique explanation UUID.';
COMMENT ON COLUMN public.explanations.asset_id IS 'Target asset.';
COMMENT ON COLUMN public.explanations.horizon IS 'Time horizon.';
COMMENT ON COLUMN public.explanations.computed_at IS 'Synthesis timestamp.';
COMMENT ON COLUMN public.explanations.model_version_id IS 'Model version.';
COMMENT ON COLUMN public.explanations.summary IS 'Strictly grounded fundamental summary paragraph.';
COMMENT ON COLUMN public.explanations.invalidation IS 'JSON array of macro developments that would invalidate this bias.';
COMMENT ON COLUMN public.explanations.upcoming_events IS 'JSON array of near-term catalyst events with impact ratings.';
COMMENT ON COLUMN public.explanations.llm_model IS 'Exact LLM model name used for narration (e.g. gemini-2.5-flash).';
COMMENT ON COLUMN public.explanations.input_hash IS 'Cryptographic SHA-256 hash of input numerical data to avoid redundant API regeneration.';

CREATE INDEX IF NOT EXISTS idx_explanations_lookup ON public.explanations (asset_id, horizon, computed_at DESC);

-- Table: pair_explanations
CREATE TABLE IF NOT EXISTS public.pair_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_asset_id text NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  quote_asset_id text NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  horizon public.pf_horizon NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  model_version_id text NOT NULL REFERENCES public.model_versions(id) ON DELETE RESTRICT,
  summary text NOT NULL,
  invalidation jsonb NOT NULL DEFAULT '[]'::jsonb,
  upcoming_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  llm_model text NOT NULL,
  input_hash text NOT NULL,
  UNIQUE(base_asset_id, quote_asset_id, horizon, model_version_id, input_hash)
);

COMMENT ON TABLE public.pair_explanations IS 'Cached narrative explanations for relative asset pairs. Only explanations are stored; pair scores are computed in SQL views.';
COMMENT ON COLUMN public.pair_explanations.id IS 'Unique pair explanation UUID.';
COMMENT ON COLUMN public.pair_explanations.base_asset_id IS 'Base asset in pair.';
COMMENT ON COLUMN public.pair_explanations.quote_asset_id IS 'Quote asset in pair.';
COMMENT ON COLUMN public.pair_explanations.horizon IS 'Time horizon.';
COMMENT ON COLUMN public.pair_explanations.computed_at IS 'Synthesis timestamp.';
COMMENT ON COLUMN public.pair_explanations.model_version_id IS 'Model version.';
COMMENT ON COLUMN public.pair_explanations.summary IS 'Relative divergence narrative synthesis.';
COMMENT ON COLUMN public.pair_explanations.invalidation IS 'JSON array of pair invalidation factors.';
COMMENT ON COLUMN public.pair_explanations.upcoming_events IS 'JSON array of catalyst releases for both assets.';
COMMENT ON COLUMN public.pair_explanations.llm_model IS 'LLM model used for synthesis.';
COMMENT ON COLUMN public.pair_explanations.input_hash IS 'Input hash for idempotency and caching.';

CREATE INDEX IF NOT EXISTS idx_pair_explanations_lookup ON public.pair_explanations (base_asset_id, quote_asset_id, horizon, computed_at DESC);

-- ----------------------------------------------------------------------------
-- 4. OPERATIONS & DATA QUALITY AUDIT TABLES
-- ----------------------------------------------------------------------------

-- Table: ingestion_runs
CREATE TABLE IF NOT EXISTS public.ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status public.pf_job_status NOT NULL DEFAULT 'success',
  rows_written integer NOT NULL DEFAULT 0,
  error_message text
);

COMMENT ON TABLE public.ingestion_runs IS 'Audit log of automated backend data collector and calculation pipeline executions.';
COMMENT ON COLUMN public.ingestion_runs.id IS 'Unique job execution UUID.';
COMMENT ON COLUMN public.ingestion_runs.job_name IS 'Name of job run (e.g. runCollectors, runScoring, runQualityChecks).';
COMMENT ON COLUMN public.ingestion_runs.started_at IS 'Run start timestamp.';
COMMENT ON COLUMN public.ingestion_runs.finished_at IS 'Run completion timestamp.';
COMMENT ON COLUMN public.ingestion_runs.status IS 'Job status: success, partial, failed.';
COMMENT ON COLUMN public.ingestion_runs.rows_written IS 'Total observations or derived rows inserted.';
COMMENT ON COLUMN public.ingestion_runs.error_message IS 'Exception or warning text if errors occurred.';

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_time ON public.ingestion_runs (started_at DESC);

-- Table: data_quality_flags
CREATE TABLE IF NOT EXISTS public.data_quality_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id text NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  observation_id uuid REFERENCES public.observations(id) ON DELETE SET NULL,
  flag_type public.pf_quality_flag_type NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

COMMENT ON TABLE public.data_quality_flags IS 'Automated data quality flags detecting stale feeds, anomalous spikes, or missing series.';
COMMENT ON COLUMN public.data_quality_flags.id IS 'Unique flag UUID.';
COMMENT ON COLUMN public.data_quality_flags.indicator_id IS 'Target indicator where anomaly was detected.';
COMMENT ON COLUMN public.data_quality_flags.observation_id IS 'Specific observation flagged (if applicable).';
COMMENT ON COLUMN public.data_quality_flags.flag_type IS 'Quality category: stale, out_of_range, missing, suspicious_jump.';
COMMENT ON COLUMN public.data_quality_flags.details IS 'Diagnostic telemetry describing the threshold violation.';
COMMENT ON COLUMN public.data_quality_flags.created_at IS 'Detection timestamp.';
COMMENT ON COLUMN public.data_quality_flags.resolved_at IS 'Resolution timestamp (null if still active).';

CREATE INDEX IF NOT EXISTS idx_data_quality_flags_unresolved ON public.data_quality_flags (created_at DESC) WHERE resolved_at IS NULL;
