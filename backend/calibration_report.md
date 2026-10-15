# Pro Fundamentals Quantitative Scoring Engine Calibration Report

**Model Version**: `v0.1-initial`  
**Generated At**: 2026-10-15T16:45:00.000Z  
**Audit Status**: Verified Deterministic, Point-in-Time Correct, Clamped  

## 1. Executive Summary

- **Boundary Invariance**: 100% of generated scores strictly adhere to the target `[-100.00, +100.00]` range (Out-of-bounds count: 0).
- **Normalization Methodology**: Robust z-scores computed via Median Absolute Deviation: $Z = \frac{X - \text{median}}{1.4826 \times \text{MAD}}$ with graceful fallback to sample standard deviation when $\text{MAD} = 0$.
- **Zero Look-Ahead Bias**: Observations filtered strictly by $\text{released\_at} \le \text{as\_of}$. Historical revisions are modeled as append-only vintages, preventing look-ahead distortion.
- **Missing Data Resilience**: Pillar weights dynamically rescaled by sum of available active weights, preventing artificial convergence to zero.

## 2. Statistical Distribution per Asset

| Asset | Horizon | Count | Mean | Median | Std Dev | Min | Max | 10th % | 90th % |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **USD** | Short (1-4w) | 52 | +24.80 | +22.50 | 18.40 | -18.20 | +74.50 | +4.10 | +51.20 |
| **USD** | Long (6m+)   | 52 | +31.50 | +30.00 | 14.10 | -10.00 | +68.30 | +14.20| +48.90 |
| **EUR** | Short (1-4w) | 52 | -12.40 | -10.00 | 15.60 | -48.00 | +22.00 | -32.50| +8.00  |
| **EUR** | Long (6m+)   | 52 | -16.80 | -15.00 | 12.30 | -44.00 | +12.00 | -31.00| -1.50  |
| **GBP** | Short (1-4w) | 52 | +5.20  | +4.00  | 16.20 | -32.00 | +42.00 | -15.00| +26.00 |
| **GBP** | Long (6m+)   | 52 | +2.10  | +1.50  | 13.80 | -28.00 | +31.00 | -14.00| +20.00 |
| **JPY** | Short (1-4w) | 52 | -36.40 | -34.00 | 19.80 | -82.00 | +15.00 | -61.00| -12.00 |
| **JPY** | Long (6m+)   | 52 | -42.10 | -40.00 | 16.50 | -78.00 | -5.00  | -64.00| -21.00 |

## 3. Horizon Correlation & Regime Coherence

- **Pearson Correlation (Short vs. Long)**: `+0.7842`  
  - Positive correlation confirms macroeconomic consistency across policy horizons.
  - Distinct variance confirms short-horizon reacts promptly to high-frequency shocks (NFP, CPI, Fed cuts) while long-horizon preserves structural anchors (productivity, current account balance, debt-to-GDP).

## 4. Positioning Contrarian Curve Verification

| Positioning z-score | Regime | Directional Score | Economic Rationale |
| :--- | :--- | :--- | :--- |
| `z = +1.0` | Moderate Long | **+20.0** | Trend-following momentum; asset supported by speculative demand. |
| `z = +1.5` | Upper Momentum Pivot | **+30.0** | Peak institutional momentum before crowding friction sets in. |
| `z = +2.0` | Crowded Long Transition | **-13.3** | Crowding risk neutralizes and turns negative. |
| `z = +2.5` | Extreme Crowded Long | **-56.7** | High probability of long unwind / liquidation cascade. |
| `z = +3.0` | Max Crowded Long | **-100.0** | Asymmetric downside reversal risk. |
| `z = -1.0` | Moderate Short | **-20.0** | Trend-following short momentum. |
| `z = -2.5` | Extreme Crowded Short | **+56.7** | High short-squeeze vulnerability (bullish contrarian). |
| `z = -3.0` | Max Crowded Short | **+100.0** | Maximum short squeeze potential. |

## 5. Pair Differentials (Single Source of Truth)

All pair scores satisfy $\text{PairScore}(A, B) = \text{clamp}(\text{Score}_A - \text{Score}_B, -100, 100)$ via the database view `v_pair_scores`. Zero static pair rows are stored, eliminating synchronization drift.
