import { describe, it, expect, vi } from 'vitest';
import { clamp, scoreToBullishPct, computePairScore, validateWeightsSum } from '../shared/validation.js';
import { applyPolarity } from '../scoring/polarity.js';
import {
  calculateMedian,
  calculateMAD,
  calculateRobustStats,
  computeRobustZScore,
  computeDetailedRobustZScore,
  calculateWindowStats,
  computeZScore,
  computePercentileRank,
  winsorize,
} from '../scoring/normalize.js';
import { aggregatePillarScore, ScoredIndicatorInput } from '../scoring/pillars.js';
import { aggregateAssetScore, WeightedPillarScore } from '../scoring/aggregate.js';
import { applyTransform, computeDerivedSeries } from '../scoring/transform.js';
import { filterObservationsPointInTime, PointInTimeObservation } from '../scoring/data.js';
import { calculateConfidence } from '../scoring/confidence.js';
import {
  computeDriverAttribution,
  generateDeterministicDriverExplanation,
  IndicatorContributionItem,
} from '../scoring/drivers.js';
import {
  SCORING_MODEL_CONFIG,
  CURRENCY_RISK_SIGN,
  computeConfigHash,
  loadModelJsonConfig,
  verifyModelVersionInDb,
} from '../scoring/modelConfig.js';
import syntheticData from './fixtures/synthetic_macro_dataset.json' with { type: 'json' };

describe('Pro Fundamentals Quantitative Scoring Engine', () => {
  // --------------------------------------------------------------------------
  // 1. POINT-IN-TIME DATA ACCESS (ZERO LOOK-AHEAD BIAS)
  // --------------------------------------------------------------------------
  describe('1. Point-in-Time Data Access (Auditability & Revisions)', () => {
    const rawObs = [
      { id: '1', indicator_id: 'ind_cpi', period_date: '2026-04-01', value: 312.0, released_at: '2026-05-12T12:30:00Z', is_revision: false },
      // Revision published in June
      { id: '2', indicator_id: 'ind_cpi', period_date: '2026-04-01', value: 312.8, released_at: '2026-06-15T12:30:00Z', is_revision: true },
      // May observation published in June
      { id: '3', indicator_id: 'ind_cpi', period_date: '2026-05-01', value: 314.0, released_at: '2026-06-12T12:30:00Z', is_revision: false },
    ];

    it('as of June 1st ignores future prints and future revisions', () => {
      const asOf = '2026-06-01T00:00:00Z';
      const result = filterObservationsPointInTime(rawObs, asOf, [], 'monthly');

      // Must only contain the initial April observation
      expect(result.series.length).toBe(1);
      expect(result.series[0].periodDate).toBe('2026-04-01');
      expect(result.series[0].value).toBe(312.0); // Not revised 312.8
      expect(result.latestObservation?.value).toBe(312.0);
    });

    it('as of June 20th incorporates the revision and the new May print', () => {
      const asOf = '2026-06-20T00:00:00Z';
      const result = filterObservationsPointInTime(rawObs, asOf, [], 'monthly');

      expect(result.series.length).toBe(2);
      expect(result.series[0].periodDate).toBe('2026-04-01');
      expect(result.series[0].value).toBe(312.8); // Updated to latest vintage <= asOf
      expect(result.series[1].periodDate).toBe('2026-05-01');
      expect(result.series[1].value).toBe(314.0);
    });

    it('updating a past observation with a later released_at does NOT change past score', () => {
      const pastAsOf = '2026-06-01T00:00:00Z';
      const scoreBeforeRevision = filterObservationsPointInTime(rawObs, pastAsOf, [], 'monthly');

      // Later revision published in August 2026
      const obsWithAugustRevision = [
        ...rawObs,
        { id: '4', indicator_id: 'ind_cpi', period_date: '2026-04-01', value: 315.0, released_at: '2026-08-01T12:00:00Z', is_revision: true },
      ];

      const scoreAfterAugustRevision = filterObservationsPointInTime(obsWithAugustRevision, pastAsOf, [], 'monthly');

      expect(scoreAfterAugustRevision.series).toEqual(scoreBeforeRevision.series);
      expect(scoreAfterAugustRevision.latestObservation?.value).toBe(312.0);
    });

    it('filters out observations flagged as out_of_range or missing', () => {
      const asOf = '2026-06-01T00:00:00Z';
      const qualityFlags = [
        {
          indicator_id: 'ind_cpi',
          observation_id: '1',
          flag_type: 'out_of_range' as const,
          details: { period_date: '2026-04-01' },
          created_at: '2026-05-13T00:00:00Z',
        },
      ];

      const result = filterObservationsPointInTime(rawObs, asOf, qualityFlags, 'monthly');
      expect(result.series.length).toBe(0);
      expect(result.freshnessFactor).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. TRANSFORM LAYER (ALL 9 TRANSFORMS + DERIVED INDICATORS)
  // --------------------------------------------------------------------------
  describe('2. Transform Layer (All 9 Types & Derived Indicators)', () => {
    const testSeries: PointInTimeObservation[] = [
      { periodDate: '2025-01-01', value: 100, releasedAt: '2025-02-01T00:00:00Z' },
      { periodDate: '2025-02-01', value: 102, releasedAt: '2025-03-01T00:00:00Z' },
      { periodDate: '2025-03-01', value: 105, releasedAt: '2025-04-01T00:00:00Z' },
      { periodDate: '2025-04-01', value: 108, releasedAt: '2025-05-01T00:00:00Z' },
      { periodDate: '2025-05-01', value: 110, releasedAt: '2025-06-01T00:00:00Z' },
      { periodDate: '2026-01-01', value: 120, releasedAt: '2026-02-01T00:00:00Z' },
    ];

    it('1. level: preserves exact input values', () => {
      const res = applyTransform(testSeries, { type: 'level', description: 'Raw level' });
      expect(res.map((x) => x.value)).toEqual(testSeries.map((x) => x.value));
    });

    it('2. change_n: computes absolute difference over n periods', () => {
      const res = applyTransform(testSeries, { type: 'change_n', n: 1, description: '1m change' });
      expect(res.length).toBe(5);
      expect(res[0].value).toBe(2); // 102 - 100
      expect(res[1].value).toBe(3); // 105 - 102
      expect(res[2].value).toBe(3); // 108 - 105
    });

    it('3. pct_change_n: computes percentage growth', () => {
      const res = applyTransform(testSeries, { type: 'pct_change_n', n: 1, description: '1m % change' });
      expect(res[0].value).toBeCloseTo(2.0, 4); // (102 - 100)/100 * 100
      expect(res[1].value).toBeCloseTo(((105 - 102) / 102) * 100, 4);
    });

    it('4. yoy: computes year-over-year difference over lookback', () => {
      const res = applyTransform(testSeries, { type: 'yoy', n: 5, description: '5-period YoY' });
      expect(res.length).toBe(1);
      expect(res[0].value).toBe(20); // 120 - 100
    });

    it('5. annualized_3m: compounds 3-month growth to an annual rate', () => {
      // 100 -> 108 over 3 months: ratio = 108/100 = 1.08. Annualized = (1.08^4 - 1)*100 = 36.0489%
      const res = applyTransform(testSeries, { type: 'annualized_3m', n: 3, description: '3m annualized' });
      expect(res[0].value).toBeCloseTo(36.0489, 2);
    });

    it('6. avg_n: calculates moving average over n periods', () => {
      const res = applyTransform(testSeries.slice(0, 3), { type: 'avg_n', n: 3, description: '3m MA' });
      expect(res.length).toBe(1);
      expect(res[0].value).toBeCloseTo((100 + 102 + 105) / 3, 4);
    });

    it('7. return_n: calculates price series percentage return', () => {
      const res = applyTransform(testSeries, { type: 'return_n', n: 1, description: '1m return' });
      expect(res[0].value).toBeCloseTo(2.0, 4);
    });

    it('8. ma_distance: calculates distance from n-period moving average', () => {
      const sample: PointInTimeObservation[] = [
        { periodDate: '1', value: 100, releasedAt: '1' },
        { periodDate: '2', value: 100, releasedAt: '2' },
        { periodDate: '3', value: 110, releasedAt: '3' },
      ];
      // MA3 = (100+100+110)/3 = 103.3333. Distance = (110 - 103.3333)/103.3333 * 100 = 6.4516%
      const res = applyTransform(sample, { type: 'ma_distance', n: 3, description: 'MA distance' });
      expect(res[0].value).toBeCloseTo(6.4516, 2);
    });

    it('9. percentile_rank: computes percentile rank in rolling window', () => {
      const sample: PointInTimeObservation[] = [
        { periodDate: '1', value: 10, releasedAt: '1' },
        { periodDate: '2', value: 20, releasedAt: '2' },
        { periodDate: '3', value: 30, releasedAt: '3' },
        { periodDate: '4', value: 40, releasedAt: '4' },
      ];
      const res = applyTransform(sample, { type: 'percentile_rank', n: 4, description: 'Rank' });
      expect(res.length).toBe(4);
      // For value 40 in [10, 20, 30, 40]: (3 strictly less + 0.5*1) / 4 = 3.5/4 = 87.5%
      expect(res[3].value).toBe(87.5);
    });

    it('computes derived indicators: us_2y_minus_fedfunds and yield_curve_slope', () => {
      const series2Y: PointInTimeObservation[] = [
        { periodDate: '2026-05-01', value: 4.85, releasedAt: '2026-05-01T21:00:00Z' },
        { periodDate: '2026-05-02', value: 4.90, releasedAt: '2026-05-02T21:00:00Z' },
      ];
      const seriesFedFunds: PointInTimeObservation[] = [
        { periodDate: '2026-05-01', value: 5.33, releasedAt: '2026-05-02T09:00:00Z' },
        { periodDate: '2026-05-02', value: 5.33, releasedAt: '2026-05-03T09:00:00Z' },
      ];

      const spread = computeDerivedSeries('us_2y_minus_fedfunds', series2Y, seriesFedFunds);
      expect(spread.length).toBe(2);
      expect(spread[0].value).toBeCloseTo(-0.48, 4); // 4.85 - 5.33
      expect(spread[1].value).toBeCloseTo(-0.43, 4);
    });

    it('computes derived indicators: cftc_net_spec_pct_oi', () => {
      const netContracts: PointInTimeObservation[] = [
        { periodDate: '2026-05-26', value: 50000, releasedAt: '2026-05-29T20:30:00Z' },
      ];
      const openInterest: PointInTimeObservation[] = [
        { periodDate: '2026-05-26', value: 250000, releasedAt: '2026-05-29T20:30:00Z' },
      ];

      const pctOI = computeDerivedSeries('cftc_net_spec_pct_oi', netContracts, openInterest);
      expect(pctOI[0].value).toBeCloseTo(20.0, 4); // 50000 / 250000 * 100 = 20%
    });
  });

  // --------------------------------------------------------------------------
  // 3. ROBUST Z-SCORE & NORMALIZATION
  // --------------------------------------------------------------------------
  describe('3. Robust Z-Score Normalization (MAD, Winsorization, Fallbacks)', () => {
    it('calculates median and MAD accurately', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const median = calculateMedian(values);
      expect(median).toBe(5);

      const mad = calculateMAD(values, median);
      expect(mad).toBe(2); // |x - 5| = [4, 3, 2, 1, 0, 1, 2, 3, 4] -> sorted: [0, 1, 1, 2, 2, 3, 3, 4, 4] -> median is 2
    });

    it('winsorization caps extreme outliers at 1st and 99th percentiles', () => {
      // 100 elements: 98 normal points (10..12) plus extreme outliers (-1000 and +5000)
      const data = new Array(98).fill(10).map((v, i) => v + (i % 3) * 0.5);
      data.unshift(-1000);
      data.push(5000);

      const { winsorized, pLower, pUpper } = winsorize(data, 0.01, 0.99);
      expect(Math.min(...winsorized)).toBeGreaterThanOrEqual(pLower);
      expect(Math.max(...winsorized)).toBeLessThanOrEqual(pUpper);
      expect(Math.min(...winsorized)).toBeGreaterThan(-100);
      expect(Math.max(...winsorized)).toBeLessThan(100);
    });

    it('robust z-score caps extreme outliers and clips to [-3, 3]', () => {
      const normalWindow = new Array(40).fill(10).map((v, i) => v + (i % 5));
      const zResult = computeDetailedRobustZScore(500, normalWindow, 30);
      expect(zResult.isAvailable).toBe(true);
      expect(zResult.method).toBe('robust_mad');
      expect(zResult.zScore).toBe(3.0);
      expect(zResult.baseScore).toBe(100.0);
    });

    it('falls back to standard z when MAD is ~0 or fewer than 30 observations', () => {
      // 20 observations (less than 30): triggers standard z fallback
      const smallWindow = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const zResult = computeDetailedRobustZScore(25, smallWindow, 30);
      expect(zResult.isAvailable).toBe(true);
      expect(zResult.method).toBe('standard_fallback');
      expect(zResult.zScore).toBeGreaterThan(0);
    });

    it('flags indicator as unavailable when fewer than 2 observations or variance is 0', () => {
      // Variance is 0: identical numbers
      const identical = [5, 5, 5, 5, 5];
      const zResult = computeDetailedRobustZScore(5, identical, 30);
      expect(zResult.isAvailable).toBe(false);
      expect(zResult.method).toBe('unavailable');
    });
  });

  // --------------------------------------------------------------------------
  // 4. POLARITY & CONTRARIAN EXTREME
  // --------------------------------------------------------------------------
  describe('4. Polarity Mapping & Contrarian Extreme Curve', () => {
    it('higher_bullish: score = base_score; higher_bearish: score = -base_score', () => {
      expect(applyPolarity(3.0, 'higher_bullish')).toBe(100);
      expect(applyPolarity(-3.0, 'higher_bullish')).toBe(-100);
      expect(applyPolarity(1.5, 'higher_bullish')).toBe(50);

      expect(applyPolarity(3.0, 'higher_bearish')).toBe(-100);
      expect(applyPolarity(-3.0, 'higher_bearish')).toBe(100);
      expect(applyPolarity(1.5, 'higher_bearish')).toBe(-50);
    });

    it('contrarian_extreme: 0 score between 0.20 and 0.80 percentile rank', () => {
      expect(applyPolarity(0, 'contrarian_extreme', { percentileRank: 0.20 })).toBe(0);
      expect(applyPolarity(0, 'contrarian_extreme', { percentileRank: 0.50 })).toBe(0);
      expect(applyPolarity(0, 'contrarian_extreme', { percentileRank: 0.80 })).toBe(0);
    });

    it('contrarian_extreme: scales linearly above 0.80 down to -100 at 1.0 (crowded long is bearish)', () => {
      // At p = 0.90: -100 * (0.90 - 0.80) / 0.20 = -50
      const p90 = applyPolarity(0, 'contrarian_extreme', { percentileRank: 0.90 });
      expect(p90).toBeCloseTo(-50.0, 2);

      // At p = 1.00: -100 * (1.00 - 0.80) / 0.20 = -100
      const p100 = applyPolarity(0, 'contrarian_extreme', { percentileRank: 1.00 });
      expect(p100).toBe(-100.0);
    });

    it('contrarian_extreme: scales linearly below 0.20 up to +100 at 0.0 (crowded short is bullish)', () => {
      // At p = 0.10: +100 * (0.20 - 0.10) / 0.20 = +50
      const p10 = applyPolarity(0, 'contrarian_extreme', { percentileRank: 0.10 });
      expect(p10).toBeCloseTo(50.0, 2);

      // At p = 0.00: +100 * (0.20 - 0.00) / 0.20 = +100
      const p0 = applyPolarity(0, 'contrarian_extreme', { percentileRank: 0.00 });
      expect(p0).toBe(100.0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. RISK SIGN TEST (VIX & S&P 500 DIRECTIONALITY)
  // --------------------------------------------------------------------------
  describe('5. Risk Sign & Equity Direction Sensitivity', () => {
    it('rising VIX is bullish for USD (safe haven) and bearish for AUD (high beta)', () => {
      // VIX rises: positive zScore = +1.5 -> base score = +50
      const usdScore = applyPolarity(1.5, 'higher_bullish', {
        currency: 'USD',
        isRiskIndicator: true,
        riskAssetType: 'volatility',
      });
      // USD risk_sign is +1.0: 50 * (+1.0) = +50
      expect(usdScore).toBe(50.0);

      const audScore = applyPolarity(1.5, 'higher_bullish', {
        currency: 'AUD',
        isRiskIndicator: true,
        riskAssetType: 'volatility',
      });
      // AUD risk_sign is -1.0: 50 * (-1.0) = -50
      expect(audScore).toBe(-50.0);
    });

    it('rising S&P 500 is risk-on: bullish for AUD and bearish for USD', () => {
      // S&P 500 rises: positive zScore = +1.5 -> raw score = +50
      // Equity return applies -risk_sign
      const audScore = applyPolarity(1.5, 'higher_bullish', {
        currency: 'AUD',
        isRiskIndicator: true,
        riskAssetType: 'equity_index',
      });
      // AUD: -(-1.0) = +1.0 -> score = +50 (bullish for AUD)
      expect(audScore).toBe(50.0);

      const usdScore = applyPolarity(1.5, 'higher_bullish', {
        currency: 'USD',
        isRiskIndicator: true,
        riskAssetType: 'equity_index',
      });
      // USD: -(+1.0) = -1.0 -> score = -50 (bearish for USD)
      expect(usdScore).toBe(-50.0);
    });
  });

  // --------------------------------------------------------------------------
  // 6. AGGREGATION & INSUFFICIENT DATA THRESHOLDS
  // --------------------------------------------------------------------------
  describe('6. Aggregation & Data Insufficiency Thresholds', () => {
    it('insufficient pillar handling: returns null when available weight is < 50%', () => {
      const indicators: ScoredIndicatorInput[] = [
        { indicatorId: '1', score: 80, baseWeight: 0.20, freshnessFactor: 1.0 }, // 0.20 active
        { indicatorId: '2', score: 40, baseWeight: 0.80, freshnessFactor: 0.0 }, // 0.80 stale (excluded)
      ];
      // Total configured weight = 1.0. Available = 0.20 (20% < 50%).
      const res = aggregatePillarScore(indicators);
      expect(res.isInsufficient).toBe(true);
      expect(res.score).toBeNull();
    });

    it('sufficient pillar handling: aggregates when available weight is >= 50%', () => {
      const indicators: ScoredIndicatorInput[] = [
        { indicatorId: '1', score: 80, baseWeight: 0.60, freshnessFactor: 1.0 },
        { indicatorId: '2', score: 20, baseWeight: 0.40, freshnessFactor: 0.0 },
      ];
      // Available = 0.60 (60% >= 50%).
      const res = aggregatePillarScore(indicators);
      expect(res.isInsufficient).toBe(false);
      expect(res.score).toBe(80); // Renormalized across available indicator 1
    });

    it('skips asset score when fewer than 4 non-null pillars', () => {
      const pillars: WeightedPillarScore[] = [
        { pillarId: 'p1', score: 50, weight: 0.30 },
        { pillarId: 'p2', score: 40, weight: 0.30 },
        { pillarId: 'p3', score: 30, weight: 0.30 },
        { pillarId: 'p4', score: null, weight: 0.10 }, // only 3 non-null pillars
      ];
      const res = aggregateAssetScore(pillars);
      expect(res.isSufficient).toBe(false);
      expect(res.score).toBeNull();
      expect(res.insufficientReason).toContain('only 3/4 non-null pillars');
    });

    it('skips asset score when available weight is < 60% of total configured weight', () => {
      const pillars: WeightedPillarScore[] = [
        { pillarId: 'p1', score: 50, weight: 0.15 },
        { pillarId: 'p2', score: 40, weight: 0.15 },
        { pillarId: 'p3', score: 30, weight: 0.10 },
        { pillarId: 'p4', score: 20, weight: 0.10 }, // 4 pillars, but sum(weight) = 0.50 (50% < 60%)
        { pillarId: 'p5', score: null, weight: 0.50 },
      ];
      const res = aggregateAssetScore(pillars);
      expect(res.isSufficient).toBe(false);
      expect(res.score).toBeNull();
      expect(res.insufficientReason).toContain('50.0% configured weight');
    });

    it('computes asset score when >= 4 non-null pillars AND >= 60% weight', () => {
      const pillars: WeightedPillarScore[] = [
        { pillarId: 'p1', score: 50, weight: 0.25 },
        { pillarId: 'p2', score: 50, weight: 0.25 },
        { pillarId: 'p3', score: 50, weight: 0.25 },
        { pillarId: 'p4', score: 50, weight: 0.25 },
      ];
      const res = aggregateAssetScore(pillars, 1.0);
      expect(res.isSufficient).toBe(true);
      expect(res.score).toBe(50.0);
    });
  });

  // --------------------------------------------------------------------------
  // 7. INVARIANT TEST: SUM(DRIVERS) == ASSET SCORE
  // --------------------------------------------------------------------------
  describe('7. Driver Attribution Mathematical Invariant', () => {
    it('invariant: sum of ALL indicator contributions equals the asset score (+-0.01)', () => {
      // Simulate 4 pillars with 2 indicators each
      const pillarScores: WeightedPillarScore[] = [
        { pillarId: 'p1', score: 40, weight: 0.30 },
        { pillarId: 'p2', score: 20, weight: 0.30 },
        { pillarId: 'p3', score: -30, weight: 0.20 },
        { pillarId: 'p4', score: 10, weight: 0.20 },
      ];

      const assetRes = aggregateAssetScore(pillarScores, 1.0);
      expect(assetRes.isSufficient).toBe(true);
      const expectedAssetScore = assetRes.score!;

      // Indicators in pillars
      const contributors: IndicatorContributionItem[] = [
        // Pillar 1 (weight 0.30, score 40)
        { indicatorId: 'i1', code: 'I1', name: 'Ind 1', pillarId: 'p1', pillarName: 'P1', rawValue: 1, zScore: 1, score: 50, effectiveWeightInPillar: 0.5, sumEffectiveWeightsInPillar: 1, effectivePillarWeightInAsset: 0.3, effectiveWeightInAsset: 0.15, contribution: 0.15 * 50, unit: '%' },
        { indicatorId: 'i2', code: 'I2', name: 'Ind 2', pillarId: 'p1', pillarName: 'P1', rawValue: 1, zScore: 1, score: 30, effectiveWeightInPillar: 0.5, sumEffectiveWeightsInPillar: 1, effectivePillarWeightInAsset: 0.3, effectiveWeightInAsset: 0.15, contribution: 0.15 * 30, unit: '%' },
        // Pillar 2 (weight 0.30, score 20)
        { indicatorId: 'i3', code: 'I3', name: 'Ind 3', pillarId: 'p2', pillarName: 'P2', rawValue: 1, zScore: 1, score: 20, effectiveWeightInPillar: 1.0, sumEffectiveWeightsInPillar: 1, effectivePillarWeightInAsset: 0.3, effectiveWeightInAsset: 0.30, contribution: 0.30 * 20, unit: '%' },
        // Pillar 3 (weight 0.20, score -30)
        { indicatorId: 'i4', code: 'I4', name: 'Ind 4', pillarId: 'p3', pillarName: 'P3', rawValue: 1, zScore: 1, score: -30, effectiveWeightInPillar: 1.0, sumEffectiveWeightsInPillar: 1, effectivePillarWeightInAsset: 0.2, effectiveWeightInAsset: 0.20, contribution: 0.20 * -30, unit: '%' },
        // Pillar 4 (weight 0.20, score 10)
        { indicatorId: 'i5', code: 'I5', name: 'Ind 5', pillarId: 'p4', pillarName: 'P4', rawValue: 1, zScore: 1, score: 10, effectiveWeightInPillar: 1.0, sumEffectiveWeightsInPillar: 1, effectivePillarWeightInAsset: 0.2, effectiveWeightInAsset: 0.20, contribution: 0.20 * 10, unit: '%' },
      ];

      const attribution = computeDriverAttribution('USD', 'short', contributors);

      // Verify invariant: sum(contributions) == asset score (+-0.01)
      expect(attribution.totalContributionSum).toBeCloseTo(expectedAssetScore, 2);
    });

    it('deterministic explanation template format is strictly adhered to', () => {
      const expl = generateDeterministicDriverExplanation(
        'USD',
        'US Non-Farm Payrolls',
        254,
        1.4,
        'Growth & Labor',
        'bullish',
        'k'
      );
      expect(expl).toBe('US Non-Farm Payrolls at 254 k (+1.4 sigma) supports USD via Growth & Labor.');
    });
  });

  // --------------------------------------------------------------------------
  // 8. CONFIDENCE MONOTONICITY & WARNING FLAGS
  // --------------------------------------------------------------------------
  describe('8. Confidence Monotonicity & Warning Flags', () => {
    it('monotonicity: removing an indicator decreases or keeps confidence equal', () => {
      const full = calculateConfidence({
        totalConfiguredIndicatorWeight: 10,
        availableIndicatorWeight: 10,
        availableFreshnessFactors: [1.0, 1.0, 1.0, 1.0],
        nonNullPillarScores: [20, 20, 20, 20],
      });

      const missingOne = calculateConfidence({
        totalConfiguredIndicatorWeight: 10,
        availableIndicatorWeight: 8, // One 2.0-weight indicator missing
        availableFreshnessFactors: [1.0, 1.0, 1.0],
        nonNullPillarScores: [20, 20, 20, 20],
      });

      expect(missingOne.confidenceScore).toBeLessThan(full.confidenceScore);
    });

    it('monotonicity: increasing staleness decreases or keeps confidence equal', () => {
      const fresh = calculateConfidence({
        totalConfiguredIndicatorWeight: 10,
        availableIndicatorWeight: 10,
        availableFreshnessFactors: [1.0, 1.0, 1.0, 1.0],
        nonNullPillarScores: [20, 20, 20, 20],
      });

      const stale = calculateConfidence({
        totalConfiguredIndicatorWeight: 10,
        availableIndicatorWeight: 10,
        availableFreshnessFactors: [1.0, 0.5, 0.5, 1.0], // Staleness added
        nonNullPillarScores: [20, 20, 20, 20],
      });

      expect(stale.confidenceScore).toBeLessThan(fresh.confidenceScore);
    });

    it('caps regime stability at 0.70 when US 10y2y spread is inverted or VIX > 25', () => {
      const normal = calculateConfidence({
        totalConfiguredIndicatorWeight: 10,
        availableIndicatorWeight: 10,
        availableFreshnessFactors: [1.0, 1.0],
        nonNullPillarScores: [10, 10],
        yieldCurve10y2y: 0.5,
        vixLevel: 15.0,
      });

      const stressed = calculateConfidence({
        totalConfiguredIndicatorWeight: 10,
        availableIndicatorWeight: 10,
        availableFreshnessFactors: [1.0, 1.0],
        nonNullPillarScores: [10, 10],
        yieldCurve10y2y: -0.25, // Inverted!
        vixLevel: 28.0, // High VIX!
      });

      expect(stressed.confidenceDetail.regime_stability).toBe(0.70);
      expect(stressed.warningFlags).toContain('regime_stress');
      expect(stressed.confidenceScore).toBeLessThan(normal.confidenceScore);
    });
  });

  // --------------------------------------------------------------------------
  // 9. MODEL CONFIGURATION HASH & MISMATCH REFUSAL
  // --------------------------------------------------------------------------
  describe('9. Model Configuration Hash & DB Verification', () => {
    it('computes deterministic sha256 hash of JSON configuration', () => {
      const { hash } = loadModelJsonConfig('v0.1');
      expect(hash).toHaveLength(64); // SHA-256 hex string length
      const recomputed = computeConfigHash(JSON.stringify(loadModelJsonConfig('v0.1').config));
      expect(recomputed).toBe(computeConfigHash(JSON.stringify(loadModelJsonConfig('v0.1').config)));
    });

    it('verifyModelVersionInDb refuses to run and throws error on hash mismatch', async () => {
      const mockDb: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'v0.1',
                  version_label: 'v0.1',
                  config_hash: 'corrupted_hash_mismatch_1234567890abcdef',
                  is_active: true,
                },
              ],
              error: null,
            }),
          }),
        }),
      };

      await expect(verifyModelVersionInDb(mockDb, 'v0.1')).rejects.toThrow(
        /Model configuration hash mismatch/
      );
    });
  });

  // --------------------------------------------------------------------------
  // 10. PAIR SCORE ANTISYMMETRY
  // --------------------------------------------------------------------------
  describe('10. Pair Score Antisymmetry via Single Source of Truth', () => {
    it('satisfies PairScore(A, B) == -PairScore(B, A) within 0.01 precision', () => {
      const testCases = [
        { scoreA: 35.5, scoreB: -15.0 },
        { scoreA: -60.0, scoreB: 45.0 },
        { scoreA: 80.0, scoreB: 95.0 },
        { scoreA: -25.0, scoreB: -25.0 },
      ];

      for (const { scoreA, scoreB } of testCases) {
        const pairAB = computePairScore(scoreA, scoreB);
        const pairBA = computePairScore(scoreB, scoreA);
        expect(pairAB).toBeCloseTo(-pairBA, 2);
      }
    });
  });
});
