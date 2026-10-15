-- ============================================================================
-- PRO FUNDAMENTALS: CFTC COMMITMENTS OF TRADERS (TFF) INDICATORS
-- Migration: 20261015140000_cftc_positioning_indicators.sql
-- Description: Establishes official indicators for CFTC Traders in Financial
--              Futures (TFF) positioning for the 8 major currencies:
--              Leveraged Funds Net, Net % of Open Interest, Asset Manager Net,
--              and Total Open Interest.
-- ============================================================================

DO $$
DECLARE
  curr_item RECORD;
BEGIN
  FOR curr_item IN
    SELECT * FROM (VALUES
      ('curr_usd', 'USD', '098662', 'USD Index (ICE Proxy - VERIFY)', 'USD Index futures used as market proxy for aggregate USD positioning'),
      ('curr_eur', 'EUR', '099741', 'Euro FX (CME)', 'Euro FX CME futures contract 099741'),
      ('curr_jpy', 'JPY', '097741', 'Japanese Yen (CME)', 'Japanese Yen CME futures contract 097741'),
      ('curr_gbp', 'GBP', '096742', 'British Pound (CME)', 'British Pound CME futures contract 096742'),
      ('curr_chf', 'CHF', '092741', 'Swiss Franc (CME)', 'Swiss Franc CME futures contract 092741'),
      ('curr_aud', 'AUD', '232741', 'Australian Dollar (CME)', 'Australian Dollar CME futures contract 232741'),
      ('curr_cad', 'CAD', '090741', 'Canadian Dollar (CME)', 'Canadian Dollar CME futures contract 090741'),
      ('curr_nzd', 'NZD', '112741', 'New Zealand Dollar (CME)', 'New Zealand Dollar CME futures contract 112741')
    ) AS t(asset_id, symbol, contract_code, contract_name, notes)
  LOOP

    -- 1. Leveraged Funds Net Positioning (Contracts)
    INSERT INTO public.indicators (
      id, asset_id, pillar_id, code, name, description, unit,
      frequency, polarity, source_id, source_series_id,
      normalization_window_years, weight_in_pillar, is_active
    )
    VALUES (
      LOWER(curr_item.symbol) || '_cftc_lev_net',
      curr_item.asset_id,
      'curr_positioning',
      curr_item.symbol || '_CFTC_LEV_NET',
      curr_item.symbol || ' CFTC Leveraged Funds Net Speculative',
      'CFTC TFF Leveraged Funds Long minus Short futures contracts for ' || curr_item.contract_name || '. ' || curr_item.notes,
      'Contracts',
      'weekly',
      'contrarian_extreme',
      'cftc',
      curr_item.contract_code || ':LEV_NET',
      8,
      0.50,
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      pillar_id = EXCLUDED.pillar_id,
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      source_id = EXCLUDED.source_id,
      source_series_id = EXCLUDED.source_series_id,
      is_active = true;

    -- 2. Leveraged Funds Net as % of Open Interest
    INSERT INTO public.indicators (
      id, asset_id, pillar_id, code, name, description, unit,
      frequency, polarity, source_id, source_series_id,
      normalization_window_years, weight_in_pillar, is_active
    )
    VALUES (
      LOWER(curr_item.symbol) || '_cftc_lev_net_pct_oi',
      curr_item.asset_id,
      'curr_positioning',
      curr_item.symbol || '_CFTC_LEV_NET_PCT_OI',
      curr_item.symbol || ' CFTC Leveraged Net % of Open Interest',
      'Leveraged funds net speculative contracts as a percentage of total market open interest for ' || curr_item.contract_name || '.',
      '%',
      'weekly',
      'contrarian_extreme',
      'cftc',
      curr_item.contract_code || ':LEV_NET_PCT_OI',
      8,
      0.30,
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      pillar_id = EXCLUDED.pillar_id,
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      source_id = EXCLUDED.source_id,
      source_series_id = EXCLUDED.source_series_id,
      is_active = true;

    -- 3. Total Open Interest
    INSERT INTO public.indicators (
      id, asset_id, pillar_id, code, name, description, unit,
      frequency, polarity, source_id, source_series_id,
      normalization_window_years, weight_in_pillar, is_active
    )
    VALUES (
      LOWER(curr_item.symbol) || '_cftc_open_interest',
      curr_item.asset_id,
      'curr_positioning',
      curr_item.symbol || '_CFTC_OPEN_INTEREST',
      curr_item.symbol || ' CFTC Futures Open Interest',
      'Aggregate open interest in futures contracts for ' || curr_item.contract_name || '.',
      'Contracts',
      'weekly',
      'neutral_context',
      'cftc',
      curr_item.contract_code || ':OPEN_INTEREST',
      8,
      0.10,
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      pillar_id = EXCLUDED.pillar_id,
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      source_id = EXCLUDED.source_id,
      source_series_id = EXCLUDED.source_series_id,
      is_active = true;

    -- 4. Asset Manager / Institutional Net Positioning
    INSERT INTO public.indicators (
      id, asset_id, pillar_id, code, name, description, unit,
      frequency, polarity, source_id, source_series_id,
      normalization_window_years, weight_in_pillar, is_active
    )
    VALUES (
      LOWER(curr_item.symbol) || '_cftc_asset_mgr_net',
      curr_item.asset_id,
      'curr_positioning',
      curr_item.symbol || '_CFTC_ASSET_MGR_NET',
      curr_item.symbol || ' CFTC Asset Manager Net Positioning',
      'CFTC TFF Institutional Asset Manager / Institutional Long minus Short contracts for ' || curr_item.contract_name || '.',
      'Contracts',
      'weekly',
      'contrarian_extreme',
      'cftc',
      curr_item.contract_code || ':ASSET_MGR_NET',
      8,
      0.10,
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      pillar_id = EXCLUDED.pillar_id,
      code = EXCLUDED.code,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      source_id = EXCLUDED.source_id,
      source_series_id = EXCLUDED.source_series_id,
      is_active = true;

  END LOOP;
END $$;
