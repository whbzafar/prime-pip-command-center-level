-- ============================================================================
-- PRO FUNDAMENTALS: VIEWS & RPC FUNCTIONS MIGRATION
-- Migration: 20261015130100_pro_fundamentals_views_and_rpc.sql
-- Description: Creates canonical views and stored RPC procedures for the
--              front-end Pro Fundamentals data service layer.
-- Single Source of Truth: Pair scores are strictly computed dynamically via
--                         v_pair_scores view and never stored in a table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. VIEW: v_latest_asset_scores
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_latest_asset_scores AS
WITH ranked_scores AS (
  SELECT
    s.id,
    s.asset_id,
    s.horizon,
    s.computed_at,
    s.model_version_id,
    s.score,
    s.confidence,
    s.confidence_detail,
    a.symbol,
    a.name AS asset_name,
    a.asset_class,
    a.metadata AS asset_metadata,
    ROW_NUMBER() OVER (
      PARTITION BY s.asset_id, s.horizon
      ORDER BY s.computed_at DESC
    ) AS rank_idx
  FROM public.asset_scores s
  JOIN public.assets a ON a.id = s.asset_id
  WHERE a.is_active = true
)
SELECT
  id,
  asset_id,
  symbol,
  asset_name,
  asset_class,
  asset_metadata,
  horizon,
  computed_at,
  model_version_id,
  score,
  confidence,
  confidence_detail,
  -- Bullish % formula: (score + 100) / 2
  ROUND(((score + 100.0) / 2.0), 2) AS bullish_pct,
  CASE
    WHEN score >= 40.0 THEN 'Strong Bullish'
    WHEN score >= 15.0 THEN 'Bullish'
    WHEN score <= -40.0 THEN 'Strong Bearish'
    WHEN score <= -15.0 THEN 'Bearish'
    ELSE 'Neutral'
  END AS bias_label
FROM ranked_scores
WHERE rank_idx = 1;

COMMENT ON VIEW public.v_latest_asset_scores IS 'Latest scoring snapshot per active asset and horizon, joined with asset profile metadata.';

-- ----------------------------------------------------------------------------
-- 2. VIEW: v_pair_scores
-- CANONICAL SINGLE SOURCE OF TRUTH: Pair scores are NEVER stored in a physical
-- table. Pair score = clamp(base_score - quote_score, -100, 100).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_pair_scores AS
SELECT
  b.symbol || '/' || q.symbol AS pair,
  b.symbol AS base_symbol,
  q.symbol AS quote_symbol,
  b.asset_id AS base_asset_id,
  q.asset_id AS quote_asset_id,
  b.horizon,
  b.score AS base_score,
  q.score AS quote_score,
  -- Dynamic computation: clamp(base_score - quote_score, -100, 100)
  GREATEST(-100.00, LEAST(100.00, ROUND(b.score - q.score, 2))) AS pair_score,
  -- Dynamic bullish percentage: (clamped_score + 100) / 2
  ROUND(((GREATEST(-100.00, LEAST(100.00, b.score - q.score)) + 100.00) / 2.0), 2) AS bullish_pct,
  CASE
    WHEN (b.score - q.score) >= 40.0 THEN 'Strong Bullish'
    WHEN (b.score - q.score) >= 15.0 THEN 'Bullish'
    WHEN (b.score - q.score) <= -40.0 THEN 'Strong Bearish'
    WHEN (b.score - q.score) <= -15.0 THEN 'Bearish'
    ELSE 'Neutral'
  END AS bias_label,
  CASE
    WHEN b.confidence = 'high' AND q.confidence = 'high' THEN 'high'
    WHEN b.confidence = 'low' OR q.confidence = 'low' THEN 'low'
    ELSE 'medium'
  END AS confidence,
  ABS(ROUND(b.score - q.score, 2)) AS score_gap,
  GREATEST(b.computed_at, q.computed_at) AS computed_at
FROM public.v_latest_asset_scores b
CROSS JOIN public.v_latest_asset_scores q
WHERE b.asset_class = 'currency'
  AND q.asset_class = 'currency'
  AND b.horizon = q.horizon
  AND b.asset_id <> q.asset_id;

COMMENT ON VIEW public.v_pair_scores IS 'SINGLE SOURCE OF TRUTH: Ordered currency pair differentials dynamically calculated by subtracting quote score from base score and clamping to [-100, 100].';

-- ----------------------------------------------------------------------------
-- 3. VIEW: v_pillar_gap
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_pillar_gap AS
WITH latest_pillar_scores AS (
  SELECT
    ps.asset_id,
    ps.pillar_id,
    ps.horizon,
    ps.score,
    ps.computed_at,
    ps.model_version_id,
    ROW_NUMBER() OVER (
      PARTITION BY ps.asset_id, ps.pillar_id, ps.horizon
      ORDER BY ps.computed_at DESC
    ) AS rank_idx
  FROM public.pillar_scores ps
)
SELECT
  b_asset.symbol || '/' || q_asset.symbol AS pair,
  b_asset.symbol AS base_symbol,
  q_asset.symbol AS quote_symbol,
  b_score.asset_id AS base_asset_id,
  q_score.asset_id AS quote_asset_id,
  p.id AS pillar_id,
  p.code AS pillar_code,
  p.name AS pillar_name,
  b_score.horizon,
  b_score.score AS base_pillar_score,
  q_score.score AS quote_pillar_score,
  ROUND(b_score.score - q_score.score, 2) AS gap,
  CASE
    WHEN (b_score.score - q_score.score) > 5.0 THEN 'base'
    WHEN (b_score.score - q_score.score) < -5.0 THEN 'quote'
    ELSE 'neutral'
  END AS favors,
  COALESCE(pw.weight, 0.0) AS pillar_weight,
  GREATEST(b_score.computed_at, q_score.computed_at) AS computed_at
FROM latest_pillar_scores b_score
JOIN public.assets b_asset ON b_asset.id = b_score.asset_id
JOIN latest_pillar_scores q_score
  ON q_score.pillar_id = b_score.pillar_id
 AND q_score.horizon = b_score.horizon
 AND q_score.rank_idx = 1
 AND q_score.asset_id <> b_score.asset_id
JOIN public.assets q_asset ON q_asset.id = q_score.asset_id
JOIN public.pillars p ON p.id = b_score.pillar_id
LEFT JOIN public.pillar_weights pw
  ON pw.pillar_id = p.id
 AND pw.horizon = b_score.horizon
 AND pw.model_version_id = b_score.model_version_id
WHERE b_score.rank_idx = 1
  AND b_asset.asset_class = 'currency'
  AND q_asset.asset_class = 'currency';

COMMENT ON VIEW public.v_pillar_gap IS 'Detailed breakdown comparing base vs quote pillar scores and divergence favorability for all currency pairs.';

-- ----------------------------------------------------------------------------
-- 4. VIEW: v_data_freshness
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_data_freshness AS
WITH latest_obs AS (
  SELECT
    indicator_id,
    MAX(period_date) AS latest_period_date,
    MAX(released_at) AS latest_released_at,
    MAX(ingested_at) AS latest_ingested_at,
    COUNT(*) AS total_observations
  FROM public.observations
  GROUP BY indicator_id
)
SELECT
  i.id AS indicator_id,
  i.code AS indicator_code,
  i.name AS indicator_name,
  a.symbol AS asset_symbol,
  p.name AS pillar_name,
  i.frequency,
  lo.latest_period_date,
  lo.latest_released_at,
  lo.latest_ingested_at,
  COALESCE(lo.total_observations, 0) AS total_observations,
  CASE
    WHEN lo.latest_period_date IS NULL THEN 'missing'
    WHEN i.frequency = 'daily' AND lo.latest_period_date < (CURRENT_DATE - INTERVAL '3 days') THEN 'stale'
    WHEN i.frequency = 'daily' AND lo.latest_period_date < (CURRENT_DATE - INTERVAL '7 days') THEN 'very_stale'
    WHEN i.frequency = 'weekly' AND lo.latest_period_date < (CURRENT_DATE - INTERVAL '14 days') THEN 'stale'
    WHEN i.frequency = 'weekly' AND lo.latest_period_date < (CURRENT_DATE - INTERVAL '28 days') THEN 'very_stale'
    WHEN i.frequency = 'monthly' AND lo.latest_period_date < (CURRENT_DATE - INTERVAL '45 days') THEN 'stale'
    WHEN i.frequency = 'monthly' AND lo.latest_period_date < (CURRENT_DATE - INTERVAL '90 days') THEN 'very_stale'
    WHEN i.frequency = 'quarterly' AND lo.latest_period_date < (CURRENT_DATE - INTERVAL '120 days') THEN 'stale'
    WHEN i.frequency = 'quarterly' AND lo.latest_period_date < (CURRENT_DATE - INTERVAL '180 days') THEN 'very_stale'
    ELSE 'fresh'
  END AS status
FROM public.indicators i
JOIN public.assets a ON a.id = i.asset_id
JOIN public.pillars p ON p.id = i.pillar_id
LEFT JOIN latest_obs lo ON lo.indicator_id = i.id
WHERE i.is_active = true;

COMMENT ON VIEW public.v_data_freshness IS 'Real-time observation freshness monitoring comparing expected release cadences with actual latest ingestion dates.';

-- ----------------------------------------------------------------------------
-- 5. RPC FUNCTION: get_currency_detail
-- Returns complete CurrencyFundamentalProfile JSON matching front-end types
-- ----------------------------------------------------------------------------
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
  v_asset record;
  v_short_score record;
  v_long_score record;
  v_pillars jsonb;
  v_drivers jsonb;
  v_indicators jsonb;
  v_explanation jsonb;
  v_history jsonb;
BEGIN
  -- Look up target asset
  SELECT * INTO v_asset
  FROM public.assets
  WHERE (symbol = UPPER(TRIM(p_code)) OR id = TRIM(p_code))
    AND asset_class = 'currency'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Currency % not found in database.', p_code;
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

  -- Aggregate 7 pillars
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

  -- Top Drivers
  WITH ranked_drivers AS (
    SELECT
      i.name AS factor,
      p.code AS "pillarId",
      d.contribution,
      COALESCE(d.detail_data->>'detail', i.description) AS detail,
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
      ), isc.raw_value) AS previous,
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
    v_explanation := jsonb_build_object(
      'summary', format('Macro fundamentals for %s are shaped by monetary policy expectations and relative macro momentum.', v_asset.name),
      'invalidation', jsonb_build_array('Unexpected central bank interest rate shift', 'Significant change in sovereign yield spreads'),
      'upcomingEvents', '[]'::jsonb
    );
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
    'scores', jsonb_build_object(
      'short', COALESCE(v_short_score.score, 0.0),
      'long', COALESCE(v_long_score.score, 0.0)
    ),
    'confidence', jsonb_build_object(
      'short', INITCAP(COALESCE(v_short_score.confidence::text, 'medium')),
      'long', INITCAP(COALESCE(v_long_score.confidence::text, 'medium'))
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

COMMENT ON FUNCTION public.get_currency_detail(text, text) IS 'RPC returning full CurrencyFundamentalProfile JSON structure conforming to front-end TypeScript types.';

-- ----------------------------------------------------------------------------
-- 6. RPC FUNCTION: get_pair_detail
-- Returns complete PairFundamentalProfile JSON with transparent base - quote
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_pair_detail(
  p_base text,
  p_quote text,
  p_horizon text DEFAULT 'short'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_profile jsonb;
  v_quote_profile jsonb;
  v_short_score numeric;
  v_long_score numeric;
  v_pillar_gaps jsonb;
  v_explanation jsonb;
  v_drivers jsonb;
  v_pair_label text;
  v_confidence_short text;
  v_confidence_long text;
BEGIN
  -- Retrieve base and quote full profiles
  v_base_profile := public.get_currency_detail(p_base, p_horizon);
  v_quote_profile := public.get_currency_detail(p_quote, p_horizon);

  v_pair_label := UPPER(TRIM(p_base)) || '/' || UPPER(TRIM(p_quote));

  -- CANONICAL FORMULA: Pair score = Base score - Quote score (clamped to [-100, 100])
  v_short_score := GREATEST(-100.0, LEAST(100.0,
    ((v_base_profile->'scores'->>'short')::numeric - (v_quote_profile->'scores'->>'short')::numeric)
  ));
  v_long_score := GREATEST(-100.0, LEAST(100.0,
    ((v_base_profile->'scores'->>'long')::numeric - (v_quote_profile->'scores'->>'long')::numeric)
  ));

  -- Confidence aggregation
  v_confidence_short := CASE
    WHEN (v_base_profile->'confidence'->>'short') = 'High' AND (v_quote_profile->'confidence'->>'short') = 'High' THEN 'High'
    WHEN (v_base_profile->'confidence'->>'short') = 'Low' OR (v_quote_profile->'confidence'->>'short') = 'Low' THEN 'Low'
    ELSE 'Medium'
  END;

  v_confidence_long := CASE
    WHEN (v_base_profile->'confidence'->>'long') = 'High' AND (v_quote_profile->'confidence'->>'long') = 'High' THEN 'High'
    WHEN (v_base_profile->'confidence'->>'long') = 'Low' OR (v_quote_profile->'confidence'->>'long') = 'Low' THEN 'Low'
    ELSE 'Medium'
  END;

  -- Build Pillar Gaps
  WITH base_p AS (
    SELECT * FROM jsonb_to_recordset(v_base_profile->'pillars') AS x(id text, name text, score numeric, weight jsonb)
  ),
  quote_p AS (
    SELECT * FROM jsonb_to_recordset(v_quote_profile->'pillars') AS y(id text, name text, score numeric, weight jsonb)
  ),
  gaps AS (
    SELECT
      bp.id AS "pillarId",
      bp.name AS "pillarName",
      bp.score AS "baseScore",
      COALESCE(qp.score, 0.0) AS "quoteScore",
      ROUND(bp.score - COALESCE(qp.score, 0.0), 2) AS gap,
      CASE
        WHEN (bp.score - COALESCE(qp.score, 0.0)) > 5.0 THEN 'base'
        WHEN (bp.score - COALESCE(qp.score, 0.0)) < -5.0 THEN 'quote'
        ELSE 'neutral'
      END AS favors,
      bp.weight
    FROM base_p bp
    LEFT JOIN quote_p qp ON qp.id = bp.id
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(g)), '[]'::jsonb) INTO v_pillar_gaps
  FROM gaps g;

  -- Retrieve pair explanation or synthesize dynamically
  SELECT jsonb_build_object(
    'summary', summary,
    'invalidation', invalidation,
    'upcomingEvents', upcoming_events
  ) INTO v_explanation
  FROM public.pair_explanations pe
  JOIN public.assets ba ON ba.id = pe.base_asset_id
  JOIN public.assets qa ON qa.id = pe.quote_asset_id
  WHERE ba.symbol = UPPER(TRIM(p_base))
    AND qa.symbol = UPPER(TRIM(p_quote))
    AND pe.horizon = (p_horizon::public.pf_horizon)
  ORDER BY pe.computed_at DESC
  LIMIT 1;

  IF v_explanation IS NULL THEN
    v_explanation := jsonb_build_object(
      'summary', format('The fundamental bias for %s is %s (Score: %s). Calculated by subtracting %s score (%s) from %s score (%s). The primary driver is central bank divergence.',
        v_pair_label,
        CASE WHEN v_short_score >= 15 THEN 'bullish' WHEN v_short_score <= -15 THEN 'bearish' ELSE 'neutral' END,
        CASE WHEN v_short_score > 0 THEN '+' || v_short_score::text ELSE v_short_score::text END,
        v_quote_profile->>'name', v_quote_profile->'scores'->>'short',
        v_base_profile->>'name', v_base_profile->'scores'->>'short'
      ),
      'invalidation', jsonb_build_array(
        format('Unexpected central bank shift from either %s or %s.', v_base_profile->>'centralBank', v_quote_profile->>'centralBank'),
        'Cross-asset shift in global risk sentiment altering capital flows.',
        'Sudden changes in short-term sovereign yield differentials.'
      ),
      'upcomingEvents', (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        FROM (
          SELECT elem FROM jsonb_array_elements(v_base_profile->'explanation'->'upcomingEvents') elem
          UNION ALL
          SELECT elem FROM jsonb_array_elements(v_quote_profile->'explanation'->'upcomingEvents') elem
          LIMIT 4
        ) combined
      )
    );
  END IF;

  -- Synthesize drivers
  WITH b_drivers AS (
    SELECT
      factor, "pillarId", contribution, format('[%s] %s', UPPER(TRIM(p_base)), detail) AS detail,
      source, "updatedAt", trend
    FROM jsonb_to_recordset(v_base_profile->'drivers') AS b(factor text, "pillarId" text, contribution numeric, detail text, source text, "updatedAt" text, trend text)
    LIMIT 4
  ),
  q_drivers AS (
    SELECT
      factor, "pillarId", -contribution AS contribution, format('[%s] %s', UPPER(TRIM(p_quote)), detail) AS detail,
      source, "updatedAt", trend
    FROM jsonb_to_recordset(v_quote_profile->'drivers') AS q(factor text, "pillarId" text, contribution numeric, detail text, source text, "updatedAt" text, trend text)
    LIMIT 4
  ),
  merged_drivers AS (
    SELECT * FROM b_drivers
    UNION ALL
    SELECT * FROM q_drivers
    ORDER BY abs(contribution) DESC
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(md)), '[]'::jsonb) INTO v_drivers
  FROM merged_drivers md;

  RETURN jsonb_build_object(
    'pair', v_pair_label,
    'base', UPPER(TRIM(p_base)),
    'quote', UPPER(TRIM(p_quote)),
    'scores', jsonb_build_object('short', v_short_score, 'long', v_long_score),
    'confidence', jsonb_build_object('short', v_confidence_short, 'long', v_confidence_long),
    'baseProfile', v_base_profile,
    'quoteProfile', v_quote_profile,
    'pillarGaps', v_pillar_gaps,
    'explanation', v_explanation,
    'drivers', v_drivers,
    'updatedAt', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );
END;
$$;

COMMENT ON FUNCTION public.get_pair_detail(text, text, text) IS 'RPC returning complete PairFundamentalProfile JSON conforming to front-end TypeScript types with single-source-of-truth score subtraction.';

-- ----------------------------------------------------------------------------
-- 7. RPC FUNCTION: get_score_history
-- Returns HistoricalScorePoint[] array for a specific currency
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_score_history(
  p_code text,
  p_from_date date DEFAULT NULL,
  p_to_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asset_id text;
  v_result jsonb;
  v_start date;
  v_end date;
BEGIN
  SELECT id INTO v_asset_id
  FROM public.assets
  WHERE symbol = UPPER(TRIM(p_code))
  LIMIT 1;

  IF v_asset_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  v_end := COALESCE(p_to_date, CURRENT_DATE);
  v_start := COALESCE(p_from_date, v_end - INTERVAL '30 days');

  WITH history_data AS (
    SELECT
      to_char(s.computed_at::date, 'YYYY-MM-DD') AS date,
      ROUND(s.score, 2) AS short,
      ROUND(COALESCE(l.score, s.score), 2) AS long
    FROM public.asset_scores s
    LEFT JOIN public.asset_scores l
      ON l.asset_id = s.asset_id
     AND l.horizon = 'long'
     AND l.computed_at::date = s.computed_at::date
    WHERE s.asset_id = v_asset_id
      AND s.horizon = 'short'
      AND s.computed_at::date BETWEEN v_start AND v_end
    ORDER BY s.computed_at ASC
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(hd)), '[]'::jsonb) INTO v_result
  FROM history_data hd;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_score_history(text, date, date) IS 'RPC returning time series score history for charts matching HistoricalScorePoint[] format.';
