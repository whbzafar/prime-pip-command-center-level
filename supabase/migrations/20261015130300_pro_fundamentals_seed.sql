-- ============================================================================
-- PRO FUNDAMENTALS: CANONICAL SEED DATA
-- Migration: 20261015130300_pro_fundamentals_seed.sql
-- Description: Seeds the 8 major currencies, data sources with licensing audits,
--              model version v0.1-initial, 7 fundamental pillars with exact weights,
--              USD indicator catalog with verified FRED series & explicit VERIFY notes,
--              placeholder indicator catalogs for the other 7 currencies, and
--              initial baseline scoring state.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MODEL VERSION: v0.1-initial
-- ----------------------------------------------------------------------------
INSERT INTO public.model_versions (id, version_label, description, is_active)
VALUES (
  'v0.1-initial',
  'v0.1-initial',
  'Foundational 7-pillar macroeconomic relative strength scoring model for currencies. Distinguishes short-horizon (1-4w) and long-horizon (6m+) rate expectations and macro momentum.',
  true
)
ON CONFLICT (id) DO UPDATE SET
  version_label = EXCLUDED.version_label,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 2. DATA SOURCES REGISTRY (WITH LICENSING AUDIT)
-- ----------------------------------------------------------------------------
INSERT INTO public.data_sources (id, name, base_url, license_note, commercial_use_ok, rate_limit_note, is_active)
VALUES
  ('fred', 'Federal Reserve Bank of St. Louis (FRED)', 'https://api.stlouisfed.org/fred', 'Public domain US government economic data; API key required. Terms permit redistribution of non-copyrighted series. Commercial redistribution OK for official releases. Check individual series copyright notes.', true, '120 requests per minute', true),
  ('ecb', 'European Central Bank (ECB Data Portal)', 'https://data-api.ecb.europa.eu', 'unverified - TODO: verify license terms before launch (ECB statistical dataset usage terms)', false, 'No formal key; polite concurrency limit recommended (2 req/sec)', true),
  ('boe', 'Bank of England Interactive Database', 'https://www.bankofengland.co.uk/boeapps/database', 'unverified - TODO: verify license terms before launch (Open Government Licence v3.0 / BoE terms)', false, 'Web scraping / periodic CSV sync; verify usage caps', true),
  ('ons', 'UK Office for National Statistics (ONS)', 'https://api.beta.ons.gov.uk', 'Open Government Licence v3.0; free redistribution with attribution. Commercial use OK.', true, 'No strict key requirement; standard throttling applies', true),
  ('boj', 'Bank of Japan Statistical Portal (BOJ Time-Series)', 'https://www.stat-search.boj.or.jp', 'unverified - TODO: verify license terms before launch (BOJ Terms of Use regarding automated redistribution)', false, 'Batch export / crawler; rate limit conservatively', true),
  ('snb', 'Swiss National Bank Data Portal', 'https://data.snb.ch', 'unverified - TODO: verify license terms before launch (SNB terms of use for data reuse and commercial redistribution)', false, 'REST API & CSV export; 10 req/min recommended', true),
  ('rba', 'Reserve Bank of Australia Statistical Tables', 'https://www.rba.gov.au/statistics', 'unverified - TODO: verify license terms before launch (RBA copyright and disclaimer policies)', false, 'Weekly batch sync of statistical tables (A2, G1)', true),
  ('boc', 'Bank of Canada Valet API', 'https://www.bankofcanada.ca/valet', 'Terms of Use allow non-exclusive, royalty-free license to use, reproduce, and distribute. Commercial use OK with attribution.', true, 'No key required; maximum 10 req/sec', true),
  ('rbnz', 'Reserve Bank of New Zealand Statistics', 'https://www.rbnz.govt.nz/statistics', 'Creative Commons Attribution 4.0 International (CC BY 4.0). Commercial use OK with attribution.', true, 'Batch CSV download; infrequent polling needed', true),
  ('cftc', 'Commodity Futures Trading Commission (CFTC)', 'https://publicreporting.cftc.gov', 'US federal regulatory agency public data. Public domain. Commercial use OK with non-endorsement attribution.', true, 'Socrata API token optional (1000 req/hr without, 50k req/hr with token)', true),
  ('worldbank', 'World Bank Open Data API', 'https://api.worldbank.org/v2', 'Creative Commons Attribution 4.0 (CC BY 4.0). Commercial use OK with attribution.', true, 'No key required; standard batch limits', true),
  ('oecd', 'OECD Data API (SDMX-JSON)', 'https://sdmx.oecd.org/public/rest', 'unverified - TODO: verify license terms before launch (OECD terms and conditions for commercial redistributors)', false, 'SDMX query endpoints; requires request caching', true),
  ('imf', 'International Monetary Fund (IMF Data API)', 'https://data.imf.org', 'unverified - TODO: verify license terms before launch (IMF terms of use on redistribution of IFS datasets)', false, 'REST API limits: 10 requests per 5-second interval', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  license_note = EXCLUDED.license_note,
  commercial_use_ok = EXCLUDED.commercial_use_ok,
  rate_limit_note = EXCLUDED.rate_limit_note,
  is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 3. THE 8 MAJOR CURRENCIES (ASSETS)
-- ----------------------------------------------------------------------------
INSERT INTO public.assets (id, asset_class, symbol, name, metadata, is_active)
VALUES
  ('curr_usd', 'currency', 'USD', 'US Dollar', '{"central_bank": "Federal Reserve (Fed)", "country": "United States", "flag": "🇺🇸", "base_rate_name": "Federal Funds Target Rate", "iso_alpha2": "US"}'::jsonb, true),
  ('curr_eur', 'currency', 'EUR', 'Euro', '{"central_bank": "European Central Bank (ECB)", "country": "Eurozone", "flag": "🇪🇺", "base_rate_name": "Main Refinancing Operations / Deposit Rate", "iso_alpha2": "EU"}'::jsonb, true),
  ('curr_jpy', 'currency', 'JPY', 'Japanese Yen', '{"central_bank": "Bank of Japan (BOJ)", "country": "Japan", "flag": "🇯🇵", "base_rate_name": "Policy Rate Balance", "iso_alpha2": "JP"}'::jsonb, true),
  ('curr_gbp', 'currency', 'GBP', 'British Pound', '{"central_bank": "Bank of England (BOE)", "country": "United Kingdom", "flag": "🇬🇧", "base_rate_name": "Bank Rate", "iso_alpha2": "GB"}'::jsonb, true),
  ('curr_chf', 'currency', 'CHF', 'Swiss Franc', '{"central_bank": "Swiss National Bank (SNB)", "country": "Switzerland", "flag": "🇨🇭", "base_rate_name": "SNB Policy Rate", "iso_alpha2": "CH"}'::jsonb, true),
  ('curr_aud', 'currency', 'AUD', 'Australian Dollar', '{"central_bank": "Reserve Bank of Australia (RBA)", "country": "Australia", "flag": "🇦🇺", "base_rate_name": "Cash Rate Target", "iso_alpha2": "AU"}'::jsonb, true),
  ('curr_cad', 'currency', 'CAD', 'Canadian Dollar', '{"central_bank": "Bank of Canada (BOC)", "country": "Canada", "flag": "🇨🇦", "base_rate_name": "Overnight Rate Target", "iso_alpha2": "CA"}'::jsonb, true),
  ('curr_nzd', 'currency', 'NZD', 'New Zealand Dollar', '{"central_bank": "Reserve Bank of New Zealand (RBNZ)", "country": "New Zealand", "flag": "🇳🇿", "base_rate_name": "Official Cash Rate (OCR)", "iso_alpha2": "NZ"}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  name = EXCLUDED.name,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 4. THE 7 FUNDAMENTAL PILLARS FOR CURRENCY
-- ----------------------------------------------------------------------------
INSERT INTO public.pillars (id, asset_class, code, name, description, sort_order)
VALUES
  ('curr_monetary', 'currency', 'monetary', 'Monetary policy and rate expectations', 'Central bank policy trajectory, terminal rate pricing, forward guidance, dot plots, and 2-year sovereign yield spreads.', 1),
  ('curr_inflation', 'currency', 'inflation', 'Inflation', 'Headline and core CPI, PCE deflators, producer prices, and consumer/market-based inflation expectations.', 2),
  ('curr_growth_labor', 'currency', 'growth_labor', 'Growth and labor', 'GDP momentum, manufacturing/services PMIs, retail demand, non-farm payrolls, and unemployment rate dynamics.', 3),
  ('curr_risk_sentiment', 'currency', 'risk_sentiment', 'Risk sentiment', 'Global risk-on / risk-off regime, equity market liquidity, credit spreads, and cross-asset safe-haven demand.', 4),
  ('curr_positioning', 'currency', 'positioning', 'Positioning', 'CFTC Commitments of Traders (COT) net speculative positioning, retail sentiment ratios, and crowded trade metrics.', 5),
  ('curr_structural_flows', 'currency', 'structural_flows', 'Structural and flows', 'Current account balances, terms of trade, foreign direct investment (FDI), and international capital flows.', 6),
  ('curr_price_confirmation', 'currency', 'price_confirmation', 'Price confirmation', 'Cross-asset technical market confirmation, trend alignment with macro regime, and key technical breakout levels.', 7)
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ----------------------------------------------------------------------------
-- 5. PILLAR WEIGHTS FOR MODEL v0.1-initial
-- Short Horizon Sum: 0.30 + 0.10 + 0.15 + 0.15 + 0.15 + 0.05 + 0.10 = 1.00
-- Long Horizon Sum:  0.30 + 0.20 + 0.20 + 0.05 + 0.05 + 0.15 + 0.05 = 1.00
-- ----------------------------------------------------------------------------
DELETE FROM public.pillar_weights
WHERE model_version_id = 'v0.1-initial' AND asset_class = 'currency';

INSERT INTO public.pillar_weights (model_version_id, asset_class, pillar_id, horizon, weight)
VALUES
  -- SHORT HORIZON (1-4 Weeks)
  ('v0.1-initial', 'currency', 'curr_monetary', 'short', 0.3000),
  ('v0.1-initial', 'currency', 'curr_inflation', 'short', 0.1000),
  ('v0.1-initial', 'currency', 'curr_growth_labor', 'short', 0.1500),
  ('v0.1-initial', 'currency', 'curr_risk_sentiment', 'short', 0.1500),
  ('v0.1-initial', 'currency', 'curr_positioning', 'short', 0.1500),
  ('v0.1-initial', 'currency', 'curr_structural_flows', 'short', 0.0500),
  ('v0.1-initial', 'currency', 'curr_price_confirmation', 'short', 0.1000),

  -- LONG HORIZON (6+ Months)
  ('v0.1-initial', 'currency', 'curr_monetary', 'long', 0.3000),
  ('v0.1-initial', 'currency', 'curr_inflation', 'long', 0.2000),
  ('v0.1-initial', 'currency', 'curr_growth_labor', 'long', 0.2000),
  ('v0.1-initial', 'currency', 'curr_risk_sentiment', 'long', 0.0500),
  ('v0.1-initial', 'currency', 'curr_positioning', 'long', 0.0500),
  ('v0.1-initial', 'currency', 'curr_structural_flows', 'long', 0.1500),
  ('v0.1-initial', 'currency', 'curr_price_confirmation', 'long', 0.0500);

-- ----------------------------------------------------------------------------
-- 6. USD INDICATOR CATALOG (WITH KNOWN FRED SERIES & VERIFY NOTES)
-- ----------------------------------------------------------------------------
INSERT INTO public.indicators (
  id, asset_id, pillar_id, code, name, description, unit, frequency, polarity,
  source_id, source_series_id, normalization_window_years, weight_in_pillar, is_active
)
VALUES
  -- Monetary Policy Pillar
  ('usd_fedfunds', 'curr_usd', 'curr_monetary', 'USD_FEDFUNDS', 'Federal Funds Effective Rate',
   'Official Fed effective overnight interest rate reflecting monetary policy stance.', '%', 'monthly', 'higher_bullish',
   'fred', 'FEDFUNDS', 8, 0.35, true),

  ('usd_dgs2', 'curr_usd', 'curr_monetary', 'USD_2Y_TREASURY_YIELD', '2-Year Treasury Constant Maturity Yield',
   'Market pricing of near-term Federal Reserve policy rate expectations.', '%', 'daily', 'higher_bullish',
   'fred', 'DGS2', 8, 0.35, true),

  ('usd_dfii10', 'curr_usd', 'curr_monetary', 'USD_10Y_TIPS_REAL_YIELD', '10-Year TIPS Real Yield',
   'Inflation-adjusted risk-free real yield attracting international capital allocation.', '%', 'daily', 'higher_bullish',
   'fred', 'DFII10', 8, 0.15, true),

  ('usd_2y_minus_ff', 'curr_usd', 'curr_monetary', 'USD_2Y_MINUS_FEDFUNDS', '2Y Treasury Yield minus Fed Funds',
   'Yield curve policy lead spread (VERIFY: Derived spread between DGS2 and FEDFUNDS calculated at collection time).', 'bps', 'daily', 'higher_bullish',
   'fred', 'VERIFY:DGS2-FEDFUNDS', 8, 0.15, true),

  -- Inflation Pillar
  ('usd_cpiaucsl', 'curr_usd', 'curr_inflation', 'USD_CPI_HEADLINE_YOY', 'Consumer Price Index: All Urban Consumers',
   'Headline inflation index measuring broad consumer basket price changes YoY.', '%', 'monthly', 'higher_bullish',
   'fred', 'CPIAUCSL', 8, 0.20, true),

  ('usd_cpilfesl', 'curr_usd', 'curr_inflation', 'USD_CORE_CPI_YOY', 'Core CPI (Excluding Food & Energy)',
   'Core consumer price pressure reflecting persistent underlying inflation.', '%', 'monthly', 'higher_bullish',
   'fred', 'CPILFESL', 8, 0.25, true),

  ('usd_pcepilfe', 'curr_usd', 'curr_inflation', 'USD_CORE_PCE_PRICE_INDEX', 'Core PCE Price Index',
   'The Federal Reserve official target inflation metric.', '%', 'monthly', 'higher_bullish',
   'fred', 'PCEPILFE', 8, 0.25, true),

  ('usd_ppiaco', 'curr_usd', 'curr_inflation', 'USD_PRODUCER_PRICE_INDEX', 'Producer Price Index: Final Demand',
   'Pipeline producer price pressure passing through to retail goods.', '%', 'monthly', 'higher_bullish',
   'fred', 'PPIACO', 8, 0.10, true),

  ('usd_ces0500000003', 'curr_usd', 'curr_inflation', 'USD_AVG_HOURLY_EARNINGS', 'Average Hourly Earnings (YoY)',
   'Labor wage growth inflation pressure feeding into service sector prices.', '%', 'monthly', 'higher_bullish',
   'fred', 'CES0500000003', 8, 0.10, true),

  ('usd_t5yifr', 'curr_usd', 'curr_inflation', 'USD_5Y5Y_FORWARD_INFLATION', '5-Year, 5-Year Forward Inflation Expectation Rate',
   'Financial market implied medium-term inflation anchoring.', '%', 'daily', 'neutral_context',
   'fred', 'T5YIFR', 8, 0.10, true),

  -- Growth and Labor Pillar
  ('usd_payems', 'curr_usd', 'curr_growth_labor', 'USD_NONFARM_PAYROLLS', 'Total Nonfarm Payroll Employment',
   'Monthly net payroll job creation across the United States economy.', 'Persons (K)', 'monthly', 'higher_bullish',
   'fred', 'PAYEMS', 8, 0.25, true),

  ('usd_unrate', 'curr_usd', 'curr_growth_labor', 'USD_UNEMPLOYMENT_RATE', 'Civilian Unemployment Rate',
   'Headline labor market slack (lower unemployment signals tighter economy).', '%', 'monthly', 'higher_bearish',
   'fred', 'UNRATE', 8, 0.20, true),

  ('usd_icsa', 'curr_usd', 'curr_growth_labor', 'USD_INITIAL_JOBLESS_CLAIMS', 'Initial Jobless Claims (Weekly)',
   'Leading weekly indicator of emerging labor market layoffs and softening.', 'Claims', 'weekly', 'higher_bearish',
   'fred', 'ICSA', 8, 0.15, true),

  ('usd_gdpc1', 'curr_usd', 'curr_growth_labor', 'USD_REAL_GDP_QOQ', 'Real Gross Domestic Product (Annualized QoQ)',
   'Broadest quarterly measure of aggregate economic output and expansion.', '%', 'quarterly', 'higher_bullish',
   'fred', 'GDPC1', 8, 0.15, true),

  ('usd_rsafs', 'curr_usd', 'curr_growth_labor', 'USD_RETAIL_SALES', 'Advance Retail Sales: Retail and Food Services',
   'Consumer spending momentum representing approx 70% of US GDP.', 'USD Millions', 'monthly', 'higher_bullish',
   'fred', 'RSAFS', 8, 0.15, true),

  ('usd_umcsent', 'curr_usd', 'curr_growth_labor', 'USD_CONSUMER_SENTIMENT', 'University of Michigan Consumer Sentiment',
   'Survey measure of household financial confidence and spending appetite.', 'Index', 'monthly', 'higher_bullish',
   'fred', 'UMCSENT', 8, 0.10, true),

  ('usd_ism_mfg', 'curr_usd', 'curr_growth_labor', 'USD_ISM_MANUFACTURING_PMI', 'ISM Manufacturing PMI (needs alternative source)',
   'needs alternative source: ISM Manufacturing PMI is proprietary to Institute for Supply Management; not freely redistributable from FRED. Using S&P Global US Mfg PMI as proxy until vendor feed is connected.', 'Index', 'monthly', 'higher_bullish',
   'fred', 'VERIFY:needs_alternative_source_ism_pmi', 8, 0.00, false),

  -- Risk Sentiment Pillar
  ('usd_vixcls', 'curr_usd', 'curr_risk_sentiment', 'USD_CBOE_VIX', 'CBOE Volatility Index (VIX)',
   'Equity options implied volatility; USD typically exhibits safe-haven appreciation during extreme risk-off spikes.', 'Index', 'daily', 'higher_bullish',
   'fred', 'VIXCLS', 8, 0.35, true),

  ('usd_bamlh0a0hym2', 'curr_usd', 'curr_risk_sentiment', 'USD_HIGH_YIELD_CREDIT_SPREAD', 'ICE BofA US High Yield Index Option-Adjusted Spread',
   'Corporate credit stress premium; wider spreads signal tightening liquidity and risk aversion.', 'bps', 'daily', 'higher_bullish',
   'fred', 'BAMLH0A0HYM2', 8, 0.25, true),

  ('usd_nfci', 'curr_usd', 'curr_risk_sentiment', 'USD_FINANCIAL_CONDITIONS_INDEX', 'Chicago Fed National Financial Conditions Index (NFCI)',
   'Comprehensive index of money market, debt, and equity market liquidity stress.', 'Index', 'weekly', 'higher_bearish',
   'fred', 'NFCI', 8, 0.20, true),

  ('usd_sp500', 'curr_usd', 'curr_risk_sentiment', 'USD_SP500_LEVEL', 'S&P 500 Composite Index',
   'Benchmark US equity performance measuring risk asset performance.', 'Index', 'daily', 'neutral_context',
   'fred', 'SP500', 8, 0.20, true),

  -- Positioning Pillar
  ('usd_cftc_net', 'curr_usd', 'curr_positioning', 'USD_CFTC_NET_SPECULATIVE', 'CFTC Net Speculative Positioning (USD Index equivalent)',
   'Institutional non-commercial net futures contracts; extreme stretch signals contrarian reversal vulnerability (VERIFY exact CFTC market code 098662 before production collector run).', 'Contracts', 'weekly', 'contrarian_extreme',
   'cftc', 'VERIFY:CFTC_098662_USD_NET', 8, 1.00, true),

  -- Structural and Flows Pillar
  ('usd_bopgstb', 'curr_usd', 'curr_structural_flows', 'USD_TRADE_BALANCE', 'US Goods and Services Trade Balance',
   'Net monthly export minus import deficit affecting structural dollar outflows.', 'USD Millions', 'monthly', 'higher_bullish',
   'fred', 'BOPGSTB', 8, 0.40, true),

  ('usd_ieabc', 'curr_usd', 'curr_structural_flows', 'USD_CURRENT_ACCOUNT', 'US Current Account Balance',
   'Broadest balance of payments metric measuring net foreign income, transfers, and trade.', 'USD Millions', 'quarterly', 'higher_bullish',
   'fred', 'IEABC', 8, 0.30, true),

  ('usd_gfd_gdp', 'curr_usd', 'curr_structural_flows', 'USD_FEDERAL_DEBT_TO_GDP', 'Federal Debt: Total Public Debt as Percent of GDP',
   'Long-term sovereign debt sustainability and fiscal expansion burden.', '%', 'quarterly', 'higher_bearish',
   'fred', 'GFDEGDQ188S', 8, 0.30, true),

  -- Price Confirmation Pillar
  ('usd_dtwexbgs', 'curr_usd', 'curr_price_confirmation', 'USD_INDEX_TREND', 'Trade Weighted U.S. Dollar Index: Broad (Goods and Services)',
   'Trade-weighted index trend confirming whether price action corroborates macro fundamentals.', 'Index', 'daily', 'higher_bullish',
   'fred', 'DTWEXBGS', 8, 1.00, true)
ON CONFLICT (id) DO UPDATE SET
  asset_id = EXCLUDED.asset_id,
  pillar_id = EXCLUDED.pillar_id,
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  frequency = EXCLUDED.frequency,
  polarity = EXCLUDED.polarity,
  source_id = EXCLUDED.source_id,
  source_series_id = EXCLUDED.source_series_id,
  weight_in_pillar = EXCLUDED.weight_in_pillar,
  is_active = EXCLUDED.is_active;

-- ----------------------------------------------------------------------------
-- 7. PLACEHOLDER INDICATOR ROWS FOR OTHER 7 CURRENCIES
-- Standardized 7-pillar indicators to be populated with source series IDs later
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  curr_code text;
  curr_id text;
  c_name text;
BEGIN
  FOR curr_code, curr_id, c_name IN
    VALUES
      ('EUR', 'curr_eur', 'Euro'),
      ('JPY', 'curr_jpy', 'Japanese Yen'),
      ('GBP', 'curr_gbp', 'British Pound'),
      ('CHF', 'curr_chf', 'Swiss Franc'),
      ('AUD', 'curr_aud', 'Australian Dollar'),
      ('CAD', 'curr_cad', 'Canadian Dollar'),
      ('NZD', 'curr_nzd', 'New Zealand Dollar')
  LOOP
    -- 1. Monetary
    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_central_bank_rate', curr_id, 'curr_monetary',
      curr_code || '_CENTRAL_BANK_RATE', c_name || ' Benchmark Policy Rate',
      'Official central bank interest rate. Placeholder: to be mapped to national central bank feed.', '%', 'monthly', 'higher_bullish',
      'fred', 'PLACEHOLDER:VERIFY_SERIES_ID', true
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_2y_yield', curr_id, 'curr_monetary',
      curr_code || '_2Y_SOVEREIGN_YIELD', c_name || ' 2-Year Sovereign Bond Yield',
      'Benchmark 2Y sovereign yield reflecting near-term policy expectations.', '%', 'daily', 'higher_bullish',
      'fred', 'PLACEHOLDER:VERIFY_SERIES_ID', true
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Inflation
    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_cpi_headline', curr_id, 'curr_inflation',
      curr_code || '_CPI_HEADLINE', c_name || ' Headline CPI (YoY)',
      'Consumer Price Index headline YoY inflation print.', '%', 'monthly', 'higher_bullish',
      'fred', 'PLACEHOLDER:VERIFY_SERIES_ID', true
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_cpi_core', curr_id, 'curr_inflation',
      curr_code || '_CPI_CORE', c_name || ' Core CPI (YoY)',
      'Underlying inflation excluding volatile food and energy components.', '%', 'monthly', 'higher_bullish',
      'fred', 'PLACEHOLDER:VERIFY_SERIES_ID', true
    ) ON CONFLICT (id) DO NOTHING;

    -- 3. Growth & Labor
    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_gdp_growth', curr_id, 'curr_growth_labor',
      curr_code || '_GDP_GROWTH', c_name || ' Quarterly Real GDP Growth',
      'Quarterly GDP expansion rate.', '%', 'quarterly', 'higher_bullish',
      'fred', 'PLACEHOLDER:VERIFY_SERIES_ID', true
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_unemployment_rate', curr_id, 'curr_growth_labor',
      curr_code || '_UNEMPLOYMENT_RATE', c_name || ' Unemployment Rate',
      'Civilian unemployment percentage.', '%', 'monthly', 'higher_bearish',
      'fred', 'PLACEHOLDER:VERIFY_SERIES_ID', true
    ) ON CONFLICT (id) DO NOTHING;

    -- 4. Risk Sentiment
    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_risk_beta', curr_id, 'curr_risk_sentiment',
      curr_code || '_RISK_BETA', c_name || ' Cross-Asset Risk Beta Spread',
      'Currency response profile to global risk-on / risk-off equity regime.', 'Index', 'daily',
      CASE WHEN curr_code IN ('JPY', 'CHF') THEN 'higher_bearish' ELSE 'higher_bullish' END::public.pf_indicator_polarity,
      'fred', 'PLACEHOLDER:VERIFY_SERIES_ID', true
    ) ON CONFLICT (id) DO NOTHING;

    -- 5. Positioning
    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_cftc_net', curr_id, 'curr_positioning',
      curr_code || '_CFTC_NET_SPEC', c_name || ' CFTC Non-Commercial Net Positioning',
      'Commitments of Traders net speculative positioning contract count.', 'Contracts', 'weekly', 'contrarian_extreme',
      'cftc', 'PLACEHOLDER:VERIFY_CFTC_CODE', true
    ) ON CONFLICT (id) DO NOTHING;

    -- 6. Structural & Flows
    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_current_account', curr_id, 'curr_structural_flows',
      curr_code || '_CURRENT_ACCOUNT', c_name || ' Current Account Balance (% of GDP)',
      'National current account surplus or deficit relative to economic size.', '%', 'quarterly', 'higher_bullish',
      'worldbank', 'PLACEHOLDER:VERIFY_SERIES_ID', true
    ) ON CONFLICT (id) DO NOTHING;

    -- 7. Price Confirmation
    INSERT INTO public.indicators (id, asset_id, pillar_id, code, name, description, unit, frequency, polarity, source_id, source_series_id, is_active)
    VALUES (
      LOWER(curr_code) || '_currency_index_trend', curr_id, 'curr_price_confirmation',
      curr_code || '_CURRENCY_INDEX_TREND', c_name || ' Nominal Effective Exchange Rate Trend',
      'Nominal effective exchange rate trend moving average alignment.', 'Index', 'daily', 'higher_bullish',
      'fred', 'PLACEHOLDER:VERIFY_SERIES_ID', true
    ) ON CONFLICT (id) DO NOTHING;

  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 8. SEED INITIAL SCORES & PILLAR BASELINES FOR IMMEDIATE APP BOOT
-- Provides realistic initial quantitative state so views & RPCs return data
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  asset_row record;
  p_row record;
  base_short numeric;
  base_long numeric;
  conf public.pf_confidence_level;
BEGIN
  FOR asset_row IN SELECT id, symbol, name FROM public.assets WHERE asset_class = 'currency' LOOP
    -- Assign realistic initial scores
    IF asset_row.symbol = 'USD' THEN base_short := 42.0; base_long := 35.0; conf := 'high';
    ELSIF asset_row.symbol = 'GBP' THEN base_short := 24.0; base_long := 18.0; conf := 'medium';
    ELSIF asset_row.symbol = 'AUD' THEN base_short := 16.0; base_long := 22.0; conf := 'medium';
    ELSIF asset_row.symbol = 'CAD' THEN base_short := 8.0;  base_long := 12.0; conf := 'medium';
    ELSIF asset_row.symbol = 'NZD' THEN base_short := -5.0; base_long := 2.0;  conf := 'medium';
    ELSIF asset_row.symbol = 'EUR' THEN base_short := -18.0; base_long := -12.0; conf := 'high';
    ELSIF asset_row.symbol = 'CHF' THEN base_short := -28.0; base_long := -20.0; conf := 'medium';
    ELSIF asset_row.symbol = 'JPY' THEN base_short := -48.0; base_long := -38.0; conf := 'high';
    ELSE base_short := 0.0; base_long := 0.0; conf := 'medium';
    END IF;

    -- Insert asset_scores
    INSERT INTO public.asset_scores (asset_id, horizon, computed_at, model_version_id, score, confidence, confidence_detail)
    VALUES
      (asset_row.id, 'short', now(), 'v0.1-initial', base_short, conf, '{"pillar_agreement": 86, "freshness_ratio": 0.94, "regime_stability": 91}'::jsonb),
      (asset_row.id, 'long', now(), 'v0.1-initial', base_long, conf, '{"pillar_agreement": 82, "freshness_ratio": 0.94, "regime_stability": 88}'::jsonb)
    ON CONFLICT (asset_id, horizon, computed_at, model_version_id) DO NOTHING;

    -- Insert pillar_scores for each pillar
    FOR p_row IN SELECT id, code, sort_order FROM public.pillars WHERE asset_class = 'currency' LOOP
      INSERT INTO public.pillar_scores (asset_id, pillar_id, horizon, computed_at, model_version_id, score)
      VALUES
        (asset_row.id, p_row.id, 'short', now(), 'v0.1-initial', GREATEST(-100.0, LEAST(100.0, base_short + (p_row.sort_order * 3.5 - 12.0)))),
        (asset_row.id, p_row.id, 'long', now(), 'v0.1-initial', GREATEST(-100.0, LEAST(100.0, base_long + (p_row.sort_order * 2.0 - 8.0))))
      ON CONFLICT (asset_id, pillar_id, horizon, computed_at, model_version_id) DO NOTHING;
    END LOOP;

    -- Insert explanation
    INSERT INTO public.explanations (asset_id, horizon, computed_at, model_version_id, summary, invalidation, upcoming_events, llm_model, input_hash)
    VALUES (
      asset_row.id, 'short', now(), 'v0.1-initial',
      format('The macroeconomic trajectory for %s shows a score of %s. Divergence is driven by policy rate differentials, employment stability, and terms of trade dynamics.', asset_row.name, base_short),
      jsonb_build_array('Unexpected dovish central bank pivot.', 'Sharp escalation in systemic cross-asset liquidity risk.'),
      jsonb_build_array(
        jsonb_build_object('name', format('%s Interest Rate Decision', asset_row.symbol), 'date', '2026-10-22', 'impact', 'High'),
        jsonb_build_object('name', format('%s Consumer Price Index (CPI)', asset_row.symbol), 'date', '2026-10-28', 'impact', 'High')
      ),
      'deterministic-baseline',
      md5(asset_row.id || '-short-v0.1-initial')
    ) ON CONFLICT (asset_id, horizon, model_version_id, input_hash) DO NOTHING;

  END LOOP;
END $$;
