# Pro Fundamentals Data Engine & Collectors Guide

Institutional-grade macroeconomic and positioning data collectors for "Pro Fundamentals". Prioritizes point-in-time correctness, complete auditability, and idempotent operations.

---

## 1. Architecture Overview (ASCII)

```
       [ Institutional Economic & Macro Data Feeds ]
      FRED (St. Louis Fed)          CFTC (Socrata Open Data)
   - Realtime vintage ALFRED     - Traders in Financial Futures (TFF)
   - Throttled ~1 req/sec        - Tuesday report dates
   - Skips missing "." values    - Friday 15:30 ET releases
              |                              |
              +--------------+---------------+
                             |
                             v
              +-------------------------------+
              | /backend/collectors           |
              |  - FredCollector              |
              |  - CftcCollector              |
              |  - Shared HTTP & RateLimiter  |
              |  - Retry (429 & 5xx ONLY)     |
              |  - Sanity Ranges & Jump Check |
              +-------------------------------+
                             |
                             v
              +-------------------------------+
              | /backend/jobs                 |
              |  - runBackfill (Historical)   |
              |  - runCollectors (Incremental)|
              |  - runQualityChecks (Audits)  |
              +-------------------------------+
                             |
                             | (SUPABASE_SERVICE_ROLE_KEY)
                             v
              +-------------------------------+
              | Supabase PostgreSQL           |
              |  - observations (Append-Only) |
              |  - data_quality_flags         |
              |  - ingestion_runs (Audit log) |
              +-------------------------------+
                             |
                             | (VITE_SUPABASE_PUBLISHABLE_KEY)
                             v
              +-------------------------------+
              | Frontend RealApiProvider      |
              |  - v_latest_asset_scores      |
              |  - v_pair_scores              |
              |  - get_currency_detail RPC    |
              |  - get_pair_detail RPC        |
              +-------------------------------+
```

---

## 2. Quickstart & How to Obtain API Keys

### How to Get a Free FRED API Key
1. Visit the Federal Reserve Bank of St. Louis developer portal: [https://fred.stlouisfed.org/](https://fred.stlouisfed.org/).
2. Create a free user account or log in.
3. Navigate to **My Account -> API Keys** or go directly to [https://fredaccount.stlouisfed.org/apikeys](https://fredaccount.stlouisfed.org/apikeys).
4. Request an API key (instant approval for educational/research/commercial development).
5. Copy the 32-character hexadecimal key into your `.env` as `FRED_API_KEY=<your_key>`.

### CFTC Socrata Token (Optional)
CFTC public data does not strictly require an API key for modest request volumes (1,000 req/hr). For high-volume polling, create an account on [https://publicreporting.cftc.gov](https://publicreporting.cftc.gov) and generate an App Token, saved as `CFTC_APP_TOKEN`.

---

## 3. Running Data Jobs via CLI

All jobs can be executed locally using `npx tsx`:

### 3.1 Historical Backfill (`runBackfill.ts`)
Fetches deep historical series (default 15 years), batching in chunks of 500 rows, completely resumable and idempotent:

```bash
# Backfill all sources (FRED + CFTC) for the last 15 years
npx tsx backend/jobs/runBackfill.ts

# Backfill only FRED series for 10 years
npx tsx backend/jobs/runBackfill.ts --source fred --years 10

# Backfill only CFTC currency futures positioning
npx tsx backend/jobs/runBackfill.ts --source cftc --years 8

# Dry-run test (prints what would be fetched without writing to database)
npx tsx backend/jobs/runBackfill.ts --source fred --indicator USD_NONFARM_PAYROLLS --dry-run
```

### 3.2 Incremental Collector (`runCollectors.ts`)
Fetches only new observations since the latest stored observation period (plus an automatic revision lookback window of 90 days for macro series, 14 days for market/positioning):

```bash
# Poll all active indicators incrementally
npx tsx backend/jobs/runCollectors.ts

# Poll only FRED
npx tsx backend/jobs/runCollectors.ts --source fred

# Poll only CFTC
npx tsx backend/jobs/runCollectors.ts --source cftc

# Dry-run incremental simulation
npx tsx backend/jobs/runCollectors.ts --dry-run
```

---

## 4. How to Read `ingestion_runs` and Audit Tables

Every execution of `runCollectors`, `runBackfill`, or `runQualityChecks` writes a single audit row to `public.ingestion_runs`.

```sql
-- View recent collector execution history and status
SELECT job_name, started_at, finished_at, status, rows_written, error_message
FROM public.ingestion_runs
ORDER BY started_at DESC
LIMIT 15;
```

### Ingestion Statuses:
- `success`: All targeted indicators polled and upserted with zero unhandled errors.
- `partial`: At least one indicator succeeded and wrote rows, but another encountered an error or warning (individual failures do not abort the pipeline).
- `failed`: Fatal pipeline exception occurred before any data could be committed.

### Inspecting Data Quality Flags:
```sql
-- View unresolved data quality flags (out of range, suspicious jumps, stale)
SELECT q.flag_type, i.code AS indicator_code, q.details, q.created_at
FROM public.data_quality_flags q
JOIN public.indicators i ON i.id = q.indicator_id
WHERE q.resolved_at IS NULL
ORDER BY q.created_at DESC;
```

---

## 5. Indicator Catalog & Verification Matrix

| Indicator Code | Name | Source | Series ID / Contract | Frequency | Revision Mode | License / Audit Note |
|---|---|---|---|---|---|---|
| `USD_FEDFUNDS` | Effective Federal Funds Rate | FRED | `DFF` | Daily | `market_priced` | Public domain |
| `USD_2Y_TREASURY_YIELD` | 2-Year Treasury Constant Maturity Yield | FRED | `DGS2` | Daily | `market_priced` | Public domain |
| `USD_10Y_TIPS_REAL_YIELD`| 10-Year TIPS Real Yield | FRED | `DFII10` | Daily | `market_priced` | Public domain |
| `USD_2Y_MINUS_FEDFUNDS` | 2Y Yield minus Fed Funds Spread | FRED | `DGS2-FEDFUNDS` | Daily | `derived` | **DERIVED**: Computed in scoring engine; not collected |
| `USD_CPI_HEADLINE_YOY` | Consumer Price Index: All Urban | FRED | `CPIAUCSL` | Monthly | `revisable` | Bureau of Labor Statistics (BLS) |
| `USD_CORE_CPI_YOY` | Core CPI (Ex Food & Energy) | FRED | `CPILFESL` | Monthly | `revisable` | Bureau of Labor Statistics (BLS) |
| `USD_CORE_PCE_PRICE_INDEX`| Core PCE Price Index | FRED | `PCEPILFE` | Monthly | `revisable` | Bureau of Economic Analysis (BEA) |
| `USD_PRODUCER_PRICE_INDEX`| Producer Price Index Final Demand | FRED | `PPIACO` | Monthly | `revisable` | **VERIFY**: Choice of final demand vs commodity PPI |
| `USD_AVG_HOURLY_EARNINGS` | Average Hourly Earnings (YoY) | FRED | `CES0500000003` | Monthly | `revisable` | BLS Current Employment Statistics |
| `USD_5Y5Y_FORWARD_INFLATION`| 5-Year Forward Inflation Expectation | FRED | `T5YIE` | Daily | `market_priced` | Federal Reserve Bank of St. Louis |
| `USD_NONFARM_PAYROLLS` | Total Nonfarm Payroll Employment | FRED | `PAYEMS` | Monthly | `revisable` | BLS Establishment Survey |
| `USD_UNEMPLOYMENT_RATE` | Civilian Unemployment Rate | FRED | `UNRATE` | Monthly | `revisable` | BLS Household Survey |
| `USD_INITIAL_JOBLESS_CLAIMS`| Initial Unemployment Claims | FRED | `ICSA` | Weekly | `revisable` | US Department of Labor |
| `USD_REAL_GDP_QOQ` | Real Gross Domestic Product | FRED | `GDPC1` | Quarterly | `revisable` | BEA National Income & Product Accounts |
| `USD_RETAIL_SALES` | Advance Retail Sales | FRED | `RSXFS` | Monthly | `revisable` | **VERIFY**: RSXFS (ex Food Services) vs RSAFS total |
| `USD_CONSUMER_SENTIMENT` | Consumer Sentiment Index | FRED | `UMCSENT` | Monthly | `revisable` | **FLAG LICENSE**: University of Michigan copyright |
| `USD_ISM_MANUFACTURING_PMI`| ISM Manufacturing PMI | FRED | `VERIFY:needs_alt` | Monthly | `needs_alt` | **NEEDS ALTERNATIVE SOURCE**: Proprietary ISM data |
| `USD_CBOE_VIX` | CBOE Volatility Index | FRED | `VIXCLS` | Daily | `market_priced` | CBOE Market Index |
| `USD_HIGH_YIELD_CREDIT_SPREAD`| ICE BofA US High Yield OAS | FRED | `BAMLH0A0HYM2` | Daily | `market_priced` | **FLAG LICENSE**: ICE Data Indices LLC; history limited |
| `USD_FINANCIAL_CONDITIONS`| Chicago Fed Financial Conditions | FRED | `NFCI` | Weekly | `market_priced` | Federal Reserve Bank of Chicago |
| `USD_SP500_LEVEL` | S&P 500 Composite Index | FRED | `SP500` | Daily | `market_priced` | **FLAG LICENSE**: S&P Dow Jones; 10yr FRED window |
| `USD_TRADE_BALANCE` | US Goods & Services Trade Balance | FRED | `BOPGSTB` | Monthly | `revisable` | **VERIFY**: Census Bureau / BEA |
| `USD_CURRENT_ACCOUNT` | US Current Account Balance | FRED | `IEABC` | Quarterly | `revisable` | **VERIFY**: BEA international transactions |
| `USD_FEDERAL_DEBT_TO_GDP`| Federal Debt % of GDP | FRED | `GFDEGDQ188S` | Quarterly | `revisable` | US Treasury / Fed |
| `USD_INDEX_TREND` | Broad Trade-Weighted USD Index | FRED | `DTWEXBGS` | Daily | `market_priced` | **Fed Broad Index** (Honest label: NOT ICE DXY) |
| `USD_CFTC_LEV_NET` | USD Index Leveraged Net | CFTC | `098662:LEV_NET` | Weekly | `final_weekly` | **PROXY**: USD Index futures used as USD aggregate |
| `EUR_CFTC_LEV_NET` | Euro FX Leveraged Net | CFTC | `099741:LEV_NET` | Weekly | `final_weekly` | CME Euro FX contract 099741 |
| `JPY_CFTC_LEV_NET` | Japanese Yen Leveraged Net | CFTC | `097741:LEV_NET` | Weekly | `final_weekly` | CME Japanese Yen contract 097741 |
| `GBP_CFTC_LEV_NET` | British Pound Leveraged Net | CFTC | `096742:LEV_NET` | Weekly | `final_weekly` | CME British Pound contract 096742 |
| `CHF_CFTC_LEV_NET` | Swiss Franc Leveraged Net | CFTC | `092741:LEV_NET` | Weekly | `final_weekly` | CME Swiss Franc contract 092741 |
| `AUD_CFTC_LEV_NET` | Australian Dollar Leveraged Net | CFTC | `232741:LEV_NET` | Weekly | `final_weekly` | CME Australian Dollar contract 232741 |
| `CAD_CFTC_LEV_NET` | Canadian Dollar Leveraged Net | CFTC | `090741:LEV_NET` | Weekly | `final_weekly` | CME Canadian Dollar contract 090741 |
| `NZD_CFTC_LEV_NET` | New Zealand Dollar Leveraged Net| CFTC | `112741:LEV_NET` | Weekly | `final_weekly` | CME New Zealand Dollar contract 112741 |

---

## 6. How to Add a New FRED Series

1. Find the official FRED series ID on `https://fred.stlouisfed.org/` (e.g. `CPILFESL`).
2. Add the series definition to `FRED_SERIES_CATALOG` in `backend/collectors/fredCollector.ts`:
   ```typescript
   MY_SERIES: {
     seriesId: 'MY_SERIES',
     mode: 'revisable', // or 'market_priced'
     expectedFrequency: 'Monthly',
     expectedUnits: 'Percent',
     licensingNote: 'Optional copyright or verification note'
   }
   ```
3. Insert the indicator into `public.indicators` via SQL:
   ```sql
   INSERT INTO public.indicators (
     id, asset_id, pillar_id, code, name, description, unit,
     frequency, polarity, source_id, source_series_id,
     normalization_window_years, weight_in_pillar, is_active
   ) VALUES (
     'usd_my_series', 'curr_usd', 'curr_growth_labor', 'USD_MY_SERIES',
     'My Series Name', 'Description of metric', '%', 'monthly',
     'higher_bullish', 'fred', 'MY_SERIES', 8, 0.20, true
   );
   ```
4. Run `npx tsx backend/jobs/runCollectors.ts --source fred --indicator USD_MY_SERIES`.

---

## 7. GitHub Actions Schedulers & Inactivity Notice

- **Daily FRED Incremental Pipeline (`pro-fundamentals-daily.yml`)**: Runs Monday-Friday at `22:30 UTC` (6:30 PM US Eastern), safely after the US market close and Federal Reserve updates.
- **Weekly CFTC COT Pipeline (`pro-fundamentals-weekly-cot.yml`)**: Runs Friday at `21:30 UTC` (5:30 PM US Eastern), 2 hours after the CFTC 15:30 ET report publication, with an automatic retry on Saturday at `02:00 UTC`.
- **Manual Ingestion Dispatch (`pro-fundamentals-manual.yml`)**: On-demand execution with `--source`, `--indicator`, and `--dry-run` parameter selectors.
- **Historical Backfill (`pro-fundamentals-backfill.yml`)**: On-demand manual workflow for full history backfills.

> **CRITICAL SCHEDULING CAVEAT**:
> GitHub automatically disables scheduled cron workflows if a repository has no commits or activity for 60 consecutive days.
> To ensure continuous operation on quiet repositories, either push periodic maintenance commits, or use an external ping / uptime service (e.g., cron-job.org or AWS EventBridge) to trigger the workflow via `workflow_dispatch` webhook.

---

## 8. Quantitative Scoring Engine Pipeline

### 8.1 Scoring Pipeline Diagram (ASCII)

```
                       [ Point-in-Time Observations ]
                                     |
                                     v
                       [ 1. Point-in-Time Filter ]
                       (released_at <= asOf; resolve revisions;
                        filter out_of_range/missing; downweight jumps)
                                     |
                                     v
                       [ 2. Transform Layer ]
                       (level, change_n, pct_change_n, yoy,
                        annualized_3m, avg_n, percentile_rank)
                                     |
                                     v
                       [ 3. Robust Normalization ]
                       (Rolling 8Y window, 1st/99th % winsorization,
                        Z = (x - median)/(1.4826*MAD), standard Z fallback,
                        clamped [-3, 3], base score = 100 * z / 3)
                                     |
                                     v
                       [ 4. Polarity & Risk Signs ]
                       - higher_bullish / higher_bearish
                       - contrarian_extreme piecewise curve
                       - risk_sign (USD +1.0, JPY +1.0, AUD -1.0...)
                                     |
                                     v
                      +-----------------------------+
                      | indicator_scores (DB table) |
                      +-----------------------------+
                                     |
                                     v
                       [ 5. Pillar Aggregation ]
                       (Effective weight = base * freshness * jump;
                        insufficient if available weight < 50%)
                                     |
                                     v
                      +--------------------------+
                      | pillar_scores (DB table) |
                      +--------------------------+
                                     |
                                     v
                       [ 6. Asset Score Aggregation ]
                       (Requires >= 4 non-null pillars & >= 60% weight;
                        sum(pillar_weight * pillar_score) / sum(avail);
                        apply calibration_scale; clamp [-100, 100])
                                     |
                     +---------------+---------------+
                     |                               |
                     v                               v
          [ 7. Confidence & Flags ]       [ 8. Exact Driver Attribution ]
          (A, C, F, D; index formula;     (Exact sum == unclamped asset score;
           VIX > 90th % stress cap;        rank top 12; deterministic templates;
           price_divergence, crowded)      zero LLM generation)
                     |                               |
                     v                               v
         +-------------------------+      +--------------------+
         | asset_scores (DB table) |      | drivers (DB table) |
         +-------------------------+      +--------------------+
                     |
                     v
         [ 9. Pair Differentials (View) ]
         v_pair_scores: clamp(base_score - quote_score, -100, 100)
         (NEVER stored in a table; single source of truth)
```

### 8.2 How Each Score is Built

1. **Point-in-Time Correctness**: `getSeriesAsOf` only reads observations with `released_at <= asOf`. Any revision published after the calculation timestamp is strictly ignored.
2. **Transform Layer**: Converts raw observations into economic signals (e.g., 3-month annualized CPI inflation rate, 20-day yield change, or rolling percentile rank).
3. **Winsorized Robust Z-Score**:
   $$Z = \frac{X - \text{median}}{1.4826 \times \text{MAD}}$$
   Computed on a rolling 8-year window, winsorized at the 1st and 99th percentiles. If $\text{MAD} < 10^{-9}$ or fewer than 30 observations exist, falls back to standard $Z = (X - \text{mean}) / \text{stdDev}$. If fewer than 2 points exist or variance is zero, the indicator is marked **unavailable** (`null`).
4. **Polarity**:
   - `higher_bullish`: $\text{Score} = \text{BaseScore}$
   - `higher_bearish`: $\text{Score} = -\text{BaseScore}$
   - `contrarian_extreme`: For percentile $p \in [0, 1]$:
     - $0.20 \le p \le 0.80 \implies \text{Score} = 0$
     - $p > 0.80 \implies \text{Score} = -100 \times \frac{p - 0.80}{0.20}$ (crowded long is bearish)
     - $p < 0.20 \implies \text{Score} = +100 \times \frac{0.20 - p}{0.20}$ (crowded short is bullish squeeze)
   - Risk Indicators (VIX, credit spread, NFCI) are scaled by currency `risk_sign` (USD +1.0, AUD -1.0). Equities (S&P 500) use the inverse sign (rising equities = risk-on).
5. **Pillar Aggregation**: Requires at least 50% of the pillar's configured weight to be available; otherwise the pillar is insufficient (`null`).
6. **Asset Aggregation**: Requires at least 4 non-null pillars and at least 60% of total configured weight. Currencies without sufficient data (e.g. non-USD currencies before multi-pillar data ingestion) do **not** write an `asset_scores` row, logging "insufficient data" instead.
7. **Pair Differentials**: Dynamic database view `v_pair_scores` computes $\text{PairScore}(A, B) = \text{clamp}(\text{Score}_A - \text{Score}_B, -100, 100)$. Pairs are never stored in a table, guaranteeing zero synchronization drift.

### 8.3 The Model Configuration File (`model-v0.1.json`)

All quantitative hyperparameters live in `/backend/scoring/config/model-v0.1.json`:
- `calibrationScale`: Multiplier applied before clamping (default `1.0`).
- `riskSigns`: Directional sensitivity to global risk appetite per currency.
- `freshnessTolerances`: Fresh and stale thresholds per release frequency.
- `confidenceCoefficients`: Weights for Agreement (0.40), Coverage (0.25), Freshness (0.20), Dispersion (0.15).
- `indicatorTransforms`: Complete mapping of every indicator's short and long transform specs and polarities.

### 8.4 How to Bump the Model Version

1. Copy `/backend/scoring/config/model-v0.1.json` to a new file (e.g. `model-v0.2.json`) or edit `modelVersion` in the file.
2. Publish the new configuration to Supabase:
   ```bash
   npx tsx backend/jobs/publishModelConfig.ts
   ```
   This computes the canonical SHA-256 hash and updates `public.model_versions`.
3. `runScoring` automatically checks the file's hash against `model_versions.config_hash` and will refuse to execute if an un-audited file modification is detected.

### 8.5 How to Read `confidence_detail`

The `confidence_detail` JSON object in `public.asset_scores` provides a complete audit trail:
- `A` (Pillar Agreement, 0-1): Fraction of pillar weights that agree with the asset score direction.
- `C` (Coverage, 0-1): Ratio of active effective indicator weights to total configured weight.
- `F` (Freshness, 0-1): Weighted average freshness factor across indicators.
- `D` (Dispersion): Weighted standard deviation of pillar scores.
- `confidence_index` (0-1): Composite index $0.40A + 0.25C + 0.20F + 0.15(1 - \min(1, D/50))$.
- `regime`: `'normal'` or `'stress'`. If VIX percentile $> 0.90$, regime is `'stress'` and confidence is capped at `medium`.
- `flags`: Warning indicators such as `price_divergence`, `crowded_positioning`, `low_coverage`, `stale_inputs`.
- `unavailable_indicators` & `stale_indicators`: List of specific series needing attention.

### 8.6 Known Simplifications & Explicit Assumptions

1. **Inflation Polarity Assumption**: In the current model, higher inflation is treated as `higher_bullish` under the prevailing central bank hiking / tight rate regime. In stagflation or recessionary regimes where inflation degrades real growth, this relationship can decouple.
2. **Risk Sign Assumptions**: Fixed baseline heuristic signs (USD +1.0, JPY +1.0, CHF +1.0, EUR -0.3, GBP -0.5, CAD -0.6, AUD -1.0, NZD -1.0). To be calibrated and validated in future backtesting steps.
3. **USD Positioning Proxy**: CFTC USD Index futures (contract `098662`) are used as the aggregate proxy for US Dollar speculative positioning.
4. **Missing ISM PMI Data**: ISM Manufacturing PMI is proprietary to the Institute for Supply Management; it is automatically skipped (`unavailable`) and never faked with synthetic numbers.

### 8.7 Calibration Procedure

After running historical backfill:
```bash
# Run 90-day daily historical backfill
npx tsx backend/jobs/runScoring.ts --backfill-days 90

# Generate empirical calibration report
npx tsx backend/jobs/generateCalibrationReport.ts
```
The report displays score percentiles, label bucket shares, and recommends an updated `calibrationScale` so roughly 10% of days land in the conviction Strong Bearish / Strong Bullish buckets. The scale is **never applied automatically**; a human researcher reviews the output, updates `model-v0.X.json`, and publishes the ratified version.

