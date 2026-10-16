-- ============================================================================
-- PRO FUNDAMENTALS: SCORING ENGINE ENHANCEMENTS MIGRATION
-- Migration: 20261015150000_scoring_engine_enhancements.sql
-- Description: Adds configuration jsonb and config_hash to model_versions,
--              establishes unique constraint on drivers to guarantee idempotency,
--              and updates get_currency_detail RPC to handle currencies with
--              insufficient data gracefully.
-- ============================================================================

-- 1. Add audit and reproducibility columns to model_versions
ALTER TABLE public.model_versions 
  ADD COLUMN IF NOT EXISTS config_hash text,
  ADD COLUMN IF NOT EXISTS configuration jsonb;

-- Register canonical v0.1 model version
INSERT INTO public.model_versions (id, version_label, description, is_active, config_hash)
VALUES (
  'v0.1',
  'v0.1',
  'Canonical 7-pillar institutional macroeconomic relative strength model with robust MAD normalization and dynamic positioning contrarian curve.',
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  version_label = EXCLUDED.version_label,
  description = EXCLUDED.description,
  is_active = true;

-- Also ensure v0.1-initial points to active configuration
UPDATE public.model_versions
SET is_active = true
WHERE id = 'v0.1-initial';

-- Copy pillar weights to v0.1 from v0.1-initial if not already present
INSERT INTO public.pillar_weights (model_version_id, asset_class, pillar_id, horizon, weight)
SELECT 'v0.1', asset_class, pillar_id, horizon, weight
FROM public.pillar_weights
WHERE model_version_id = 'v0.1-initial'
ON CONFLICT (model_version_id, asset_class, pillar_id, horizon) DO NOTHING;

-- 2. Idempotency guarantee for drivers table
-- Ensure unique index so re-running a scoring run for the same checkpoint upserts cleanly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drivers_asset_horizon_computed_model_indicator_key'
  ) THEN
    -- Delete any existing duplicates before adding constraint
    DELETE FROM public.drivers a USING public.drivers b
    WHERE a.id < b.id
      AND a.asset_id = b.asset_id
      AND a.horizon = b.horizon
      AND a.computed_at = b.computed_at
      AND a.model_version_id = b.model_version_id
      AND a.indicator_id = b.indicator_id;

    ALTER TABLE public.drivers
      ADD CONSTRAINT drivers_asset_horizon_computed_model_indicator_key
      UNIQUE (asset_id, horizon, computed_at, model_version_id, indicator_id);
  END IF;
END $$;

-- 3. Enhance get_currency_detail RPC to handle currencies without asset scores (insufficient data) gracefully
CREATE OR REPLACE FUNCTION public.get_currency_detail(
  p_code text,
  p_horizon text DEFAULT 'short'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset RECORD;
  v_short_score RECORD;
  v_long_score RECORD;
  v_pillars jsonb;
  v_drivers jsonb;
  v_indicators jsonb;
  v_explanation jsonb;
  v_history jsonb;
  v_has_sufficient_data boolean := false;
  v_status text := 'insufficient_data';
BEGIN
  -- Resolve asset
  SELECT * INTO v_asset
  FROM public.assets
  WHERE (symbol = UPPER(TRIM(p_code)) OR id = LOWER(TRIM(p_code)))
    AND asset_class = 'currency'
  LIMIT 1;

  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Currency % not found or not registered in assets catalog.', p_code;
  END IF;

  -- Latest short score
  SELECT score, confidence, computed_at INTO v_short_score
  FROM public.asset_scores
  WHERE asset_id = v_asset.id AND horizon = 'short'
  ORDER BY computed_at DESC
  LIMIT 1;

  -- Latest long score
  SELECT score, confidence, computed_at INTO v_long_score
  FROM public.asset_scores
  WHERE asset_id = v_asset.id AND horizon = 'long'
  ORDER BY computed_at DESC
  LIMIT 1;

  IF v_short_score.score IS NOT NULL THEN
    v_has_sufficient_data := true;
    v_status := 'active';
  END IF;

  -- Aggregate 7 pillars (including any positioning scores for non-USD currencies)
  WITH ranked_pillars AS (
    SELECT
      p.code AS id,
      p.name,
      ps.score,
      COALESCE(
        jsonb_build_object(
          'short', (SELECT weight FROM public.pillar_weights WHERE pillar_id = p.id AND horizon = 'short' AND asset_class = 'currency' LIMIT 1),
          'long', (SELECT weight FROM public.pillar_weights WHERE pillar_id = p.id AND horizon = 'long' AND asset_class = 'currency' LIMIT 1)
        ),
        '{"short": 0.15, "long": 0.15}'::jsonb
      ) AS weight,
      p.description
    FROM public.pillars p
    LEFT JOIN LATERAL (
      SELECT score FROM public.pillar_scores
      WHERE asset_id = v_asset.id AND pillar_id = p.id AND horizon = (p_horizon::public.pf_horizon)
      ORDER BY computed_at DESC LIMIT 1
    ) ps ON true
    WHERE p.asset_class = 'currency'
    ORDER BY p.sort_order ASC
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(rp)), '[]'::jsonb) INTO v_pillars
  FROM ranked_pillars rp;

  -- Top Drivers (if any exist)
  WITH ranked_drivers AS (
    SELECT
      i.name AS factor,
      p.code AS "pillarId",
      d.contribution,
      COALESCE(d.detail_data->>'explanation', d.detail_data->>'detail', i.description) AS detail,
      COALESCE(ds.name, 'Official Feed') AS source,
      to_char(d.computed_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt",
      COALESCE(d.detail_data->>'trend', 'neutral') AS trend
    FROM public.drivers d
    JOIN public.indicators i ON i.id = d.indicator_id
    JOIN public.pillars p ON p.id = d.pillar_id
    LEFT JOIN public.data_sources ds ON ds.id = i.source_id
    WHERE d.asset_id = v_asset.id AND d.horizon = (p_horizon::public.pf_horizon)
    ORDER BY d.computed_at DESC, d.rank ASC
    LIMIT 6
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(rd)), '[]'::jsonb) INTO v_drivers
  FROM ranked_drivers rd;

  -- Macro Indicators
  WITH latest_indicators AS (
    SELECT
      i.name,
      COALESCE(isc.raw_value, 0.0) AS value,
      COALESCE((
        SELECT value FROM public.observations
        WHERE indicator_id = i.id
        ORDER BY period_date DESC OFFSET 1 LIMIT 1
      ), isc.raw_value, 0.0) AS previous,
      i.unit,
      COALESCE(isc.z_score, 0.0) AS "zScore",
      i.polarity,
      COALESCE(ds.name, 'Official') AS source,
      to_char(COALESCE(isc.computed_at, now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt",
      p.code AS "pillarId"
    FROM public.indicators i
    JOIN public.pillars p ON p.id = i.pillar_id
    LEFT JOIN public.data_sources ds ON ds.id = i.source_id
    LEFT JOIN LATERAL (
      SELECT raw_value, z_score, computed_at
      FROM public.indicator_scores
      WHERE indicator_id = i.id
      ORDER BY computed_at DESC LIMIT 1
    ) isc ON true
    WHERE i.asset_id = v_asset.id AND i.is_active = true
    ORDER BY p.sort_order ASC, i.name ASC
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(li)), '[]'::jsonb) INTO v_indicators
  FROM latest_indicators li;

  -- Explanation
  SELECT jsonb_build_object(
    'summary', summary,
    'invalidation', invalidation,
    'upcomingEvents', upcoming_events
  ) INTO v_explanation
  FROM public.explanations
  WHERE asset_id = v_asset.id AND horizon = (p_horizon::public.pf_horizon)
  ORDER BY computed_at DESC
  LIMIT 1;

  IF v_explanation IS NULL THEN
    IF v_has_sufficient_data THEN
      v_explanation := jsonb_build_object(
        'summary', format('Macro fundamentals for %s are shaped by monetary policy expectations and relative macro momentum across verified economic indicators.', v_asset.name),
        'invalidation', jsonb_build_array('Unexpected central bank interest rate shift', 'Significant change in sovereign yield spreads'),
        'upcomingEvents', '[]'::jsonb
      );
    ELSE
      v_explanation := jsonb_build_object(
        'summary', format('Insufficient data for %s: only positioning data is currently active. At least 4 non-null pillars and 60%% configured weight are required to generate an overall asset fundamental score.', v_asset.name),
        'invalidation', jsonb_build_array('Pending official macroeconomic indicator integration'),
        'upcomingEvents', '[]'::jsonb
      );
    END IF;
  END IF;

  -- History (30 day series)
  WITH score_history AS (
    SELECT
      to_char(s.computed_at::date, 'YYYY-MM-DD') AS date,
      s.score AS short,
      COALESCE(l.score, s.score) AS long
    FROM public.asset_scores s
    LEFT JOIN public.asset_scores l
      ON l.asset_id = s.asset_id
     AND l.horizon = 'long'
     AND l.computed_at::date = s.computed_at::date
    WHERE s.asset_id = v_asset.id AND s.horizon = 'short'
    ORDER BY s.computed_at ASC
    LIMIT 30
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(sh)), '[]'::jsonb) INTO v_history
  FROM score_history sh;

  -- Return synthesized profile
  RETURN jsonb_build_object(
    'code', v_asset.symbol,
    'name', v_asset.name,
    'flag', COALESCE(v_asset.metadata->>'flag', '🏳️'),
    'centralBank', COALESCE(v_asset.metadata->>'central_bank', 'Central Bank'),
    'status', v_status,
    'hasSufficientData', v_has_sufficient_data,
    'scores', jsonb_build_object(
      'short', COALESCE(v_short_score.score, 0.0),
      'long', COALESCE(v_long_score.score, 0.0)
    ),
    'confidence', jsonb_build_object(
      'short', CASE WHEN v_short_score.score IS NOT NULL THEN INITCAP(COALESCE(v_short_score.confidence::text, 'medium')) ELSE 'Low' END,
      'long', CASE WHEN v_long_score.score IS NOT NULL THEN INITCAP(COALESCE(v_long_score.confidence::text, 'medium')) ELSE 'Low' END
    ),
    'pillars', v_pillars,
    'drivers', v_drivers,
    'indicators', v_indicators,
    'explanation', v_explanation,
    'history', v_history,
    'updatedAt', to_char(COALESCE(v_short_score.computed_at, now()), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;
