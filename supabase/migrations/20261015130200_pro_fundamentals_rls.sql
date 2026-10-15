-- ============================================================================
-- PRO FUNDAMENTALS: ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20261015130200_pro_fundamentals_rls.sql
-- Description: Enforces zero-trust boundary. Public anon role receives read-only
--              access to reference, derived scoring data, views, and RPCs.
--              Internal operations tables (ingestion_runs, data_quality_flags)
--              and all write operations are strictly restricted to service_role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ----------------------------------------------------------------------------

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillar_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.indicator_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillar_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pair_explanations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_quality_flags ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. READ-ONLY POLICIES FOR PUBLIC (ANON & AUTHENTICATED)
-- Allows frontend clients to query reference and derived scores safely
-- ----------------------------------------------------------------------------

-- Reference Tables
DROP POLICY IF EXISTS "anon_read_data_sources" ON public.data_sources;
CREATE POLICY "anon_read_data_sources" ON public.data_sources
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "anon_read_assets" ON public.assets;
CREATE POLICY "anon_read_assets" ON public.assets
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "anon_read_pillars" ON public.pillars;
CREATE POLICY "anon_read_pillars" ON public.pillars
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_model_versions" ON public.model_versions;
CREATE POLICY "anon_read_model_versions" ON public.model_versions
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "anon_read_pillar_weights" ON public.pillar_weights;
CREATE POLICY "anon_read_pillar_weights" ON public.pillar_weights
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_indicators" ON public.indicators;
CREATE POLICY "anon_read_indicators" ON public.indicators
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- Raw Observations & Events (Auditability / Read-Only Transparency)
DROP POLICY IF EXISTS "anon_read_observations" ON public.observations;
CREATE POLICY "anon_read_observations" ON public.observations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_economic_events" ON public.economic_events;
CREATE POLICY "anon_read_economic_events" ON public.economic_events
  FOR SELECT TO anon, authenticated USING (true);

-- Derived Scoring Tables
DROP POLICY IF EXISTS "anon_read_indicator_scores" ON public.indicator_scores;
CREATE POLICY "anon_read_indicator_scores" ON public.indicator_scores
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_pillar_scores" ON public.pillar_scores;
CREATE POLICY "anon_read_pillar_scores" ON public.pillar_scores
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_asset_scores" ON public.asset_scores;
CREATE POLICY "anon_read_asset_scores" ON public.asset_scores
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_drivers" ON public.drivers;
CREATE POLICY "anon_read_drivers" ON public.drivers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_explanations" ON public.explanations;
CREATE POLICY "anon_read_explanations" ON public.explanations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_pair_explanations" ON public.pair_explanations;
CREATE POLICY "anon_read_pair_explanations" ON public.pair_explanations
  FOR SELECT TO anon, authenticated USING (true);

-- Deny Anon Access to Operational Tables (ingestion_runs, data_quality_flags)
DROP POLICY IF EXISTS "deny_anon_ingestion_runs" ON public.ingestion_runs;
CREATE POLICY "deny_anon_ingestion_runs" ON public.ingestion_runs
  FOR SELECT TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "deny_anon_data_quality_flags" ON public.data_quality_flags;
CREATE POLICY "deny_anon_data_quality_flags" ON public.data_quality_flags
  FOR SELECT TO anon, authenticated USING (false);

-- ----------------------------------------------------------------------------
-- 3. SERVICE ROLE POLICIES (FULL WRITE & ADMIN PRIVILEGES FOR BACKEND WORKERS)
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  table_item text;
BEGIN
  FOR table_item IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'data_sources', 'assets', 'pillars', 'model_versions', 'pillar_weights', 'indicators',
        'observations', 'economic_events', 'indicator_scores', 'pillar_scores', 'asset_scores',
        'drivers', 'explanations', 'pair_explanations', 'ingestion_runs', 'data_quality_flags'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all_%I" ON public.%I', table_item, table_item);
    EXECUTE format('CREATE POLICY "service_role_all_%I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', table_item, table_item);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. GRANT PERMISSIONS TO DATABASE ROLES
-- ----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
REVOKE SELECT ON TABLE public.ingestion_runs FROM anon, authenticated;
REVOKE SELECT ON TABLE public.data_quality_flags FROM anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Execute grants on RPC functions
GRANT EXECUTE ON FUNCTION public.get_currency_detail(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_pair_detail(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_score_history(text, date, date) TO anon, authenticated, service_role;
