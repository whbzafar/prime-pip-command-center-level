import { describe, it, expect } from 'vitest';
import { clamp, scoreToBullishPct, computePairScore, validateWeightsSum } from '../shared/validation.js';
import { applyPolarity } from '../scoring/polarity.js';
import {
  calculateMedian,
  calculateMAD,
  calculateRobustStats,
  computeRobustZScore,
  calculateWindowStats,
  computeZScore,
} from '../scoring/normalize.js';
import { aggregatePillarScore, ScoredIndicatorInput } from '../scoring/pillars.js';
import { aggregateAssetScore, WeightedPillarScore } from '../scoring/aggregate.js';
import { applyTransform, computeDerivedSeries } from '../scoring/transform.js';
import { filterObservationsPointInTime, PointInTimeObservation } from '../scoring/data.js';
import { calculateConfidence } from '../scoring/confidence.js';
import { computeDriverAttribution } from '../scoring/drivers.js';
import syntheticData from './fixtures/synthetic_macro_dataset.json' with { type: 'json' };

describe('Pro Fundamentals Quantitative Scoring Engine', () => {
  describe('1. Point-in-Time Data Correctness (Zero Look-Ahead Bias)', () => {
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

    it('adding distant future observations does not change the score as of past date', () => {
      const asOf = '2026-06-01T00:00:00Z';
      const initial = filterObservationsPointInTime(rawObs, asOf, [], 'monthly');

      const corruptedWithFuture = [
        ...rawObs,
        { id: '4', indicator_id: 'ind_cpi', period_date: '2026-09-01', value: 399.9, released_at: '2026-10-12T12:30:00Z' },
        { id: '5', indicator_id: 'ind_cpi', period_date: '2026-04-01', value: 200.0, released_at: '2026-11-01T12:30:00Z' },
      ];

      const afterFutureAdded = filterObservationsPointInTime(corruptedWithFuture, asOf, [], 'monthly');
      expect(afterFutureAdded.series).toEqual(initial.series);
      expect(afterFutureAdded.latestObservation).toEqual(initial.latestObservation);
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

  describe('2. Mathematical Transform Layer', () => {
    const monthlySeries: PointInTimeObservation[] = [
      { periodDate: '2025-01-01', value: 100, releasedAt: '2025-02-01T00:00:00Z' },
      { periodDate: '2025-02-01', value: 102, releasedAt: '2025-03-01T00:00:00Z' },
      { periodDate: '2025-03-01', value: 105, releasedAt: '2025-04-01T00:00:00Z' },
      { periodDate: '2025-04-01', value: 108, releasedAt: '2025-05-01T00:00:00Z' },
      { periodDate: '2026-01-01', value: 120, releasedAt: '2026-02-01T00:00:00Z' },
    ];

    it('change_n computes exact period differences', () => {
      const res = applyTransform(monthlySeries, { type: 'change_n', n: 1, description: '1m change' });
      expect(res.length).toBe(4);
      expect(res[0].value).toBe(2); // 102 - 100
      expect(res[1].value).toBe(3); // 105 - 102
      expect(res[2].value).toBe(3); // 108 - 105
    });

    it('pct_change_n computes accurate percentage growth', () => {
      const res = applyTransform(monthlySeries, { type: 'pct_change_n', n: 1, description: '1m % change' });
      expect(res[0].value).toBeCloseTo(2.0, 4); // (102 - 100)/100 * 100
    });

    it('annualized_3m compounds 3-month growth to an annual rate', () => {
      // 100 -> 108 over 3 months: ratio = 108/100 = 1.08. Annualized = (1.08^4 - 1)*100 = 36.048896%
      const res = applyTransform(monthlySeries, { type: 'annualized_3m', n: 3, description: '3m annualized' });
      expect(res.length).toBe(2);
      expect(res[0].value).toBeCloseTo(36.0489, 2);
    });

    it('avg_n calculates moving averages correctly', () => {
      const res = applyTransform(monthlySeries.slice(0, 3), { type: 'avg_n', n: 3, description: '3m MA' });
      expect(res.length).toBe(1);
      expect(res[0].value).toBeCloseTo((100 + 102 + 105) / 3, 4);
    });

    it('ma_distance computes percentage deviation from moving average', () => {
      // Series of 3 items: 100, 100, 110. MA3 = 310/3 = 103.3333. Distance = (110 - 103.3333)/103.3333 * 100 = +6.45%
      const testData: PointInTimeObservation[] = [
        { periodDate: '1', value: 100, releasedAt: '1' },
        { periodDate: '2', value: 100, releasedAt: '2' },
        { periodDate: '3', value: 110, releasedAt: '3' },
      ];
      const res = applyTransform(testData, { type: 'ma_distance', n: 3, description: 'dist' });
      expect(res[0].value).toBeCloseTo(6.4516, 2);
    });

    it('computes derived series: us_2y_minus_fedfunds and yield_curve_slope', () => {
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
      expect(spread[1].value).toBeCloseTo(-0.43, 4); // 4.90 - 5.33
    });

    it('computes derived series: cftc_net_spec_pct_oi', () => {
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

  describe('3. Robust Z-Score Normalization & Polarity Mapping', () => {
    it('calculates median and MAD accurately', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      const median = calculateMedian(values);
      expect(median).toBe(5);

      const mad = calculateMAD(values, median);
      expect(mad).toBe(2); // |1-5|..|9-5| -> [0, 1, 1, 2, 2, 3, 3, 4, 4] -> median is 2
    });

    it('robust z-score rejects outliers compared to standard z-score', () => {
      // Normal data with a massive extreme outlier
      const data = [10, 11, 10, 12, 11, 10, 11, 12, 10, 11, 500]; // 500 is outlier
      const robustZ = computeRobustZScore(11, data, 5);
      // Value 11 is close to median (11) -> robustZ should be very close to 0
      expect(Math.abs(robustZ)).toBeLessThan(0.5);

      // Value 500 should be clamped at +3.0
      const outlierZ = computeRobustZScore(500, data, 5);
      expect(outlierZ).toBe(3.0);
    });

    it('falls back to standard deviation when MAD is 0', () => {
      // 80% identical values: MAD is 0, but variance exists
      const data = [5, 5, 5, 5, 5, 5, 5, 5, 10, 15];
      const z = computeRobustZScore(10, data, 5);
      expect(z).toBeGreaterThan(0);
      expect(z).toBeLessThanOrEqual(3.0);
    });

    it('handles identical history (variance == 0) gracefully returning 0', () => {
      const data = [5, 5, 5, 5, 5, 5, 5];
      const z = computeRobustZScore(5, data, 5);
      expect(z).toBe(0);
    });

    it('polarity higher_bullish scales z * (100 / 3) and clamps', () => {
      expect(applyPolarity(3.0, 'higher_bullish')).toBe(100);
      expect(applyPolarity(-3.0, 'higher_bullish')).toBe(-100);
      expect(applyPolarity(1.5, 'higher_bullish')).toBe(50);
      expect(applyPolarity(0, 'higher_bullish')).toBe(0);
    });

    it('polarity higher_bearish inverts score: -z * (100 / 3)', () => {
      expect(applyPolarity(3.0, 'higher_bearish')).toBe(-100);
      expect(applyPolarity(-3.0, 'higher_bearish')).toBe(100);
      expect(applyPolarity(1.5, 'higher_bearish')).toBe(-50);
    });

    it('contrarian_extreme positioning curve handles moderate vs extreme crowding', () => {
      // Moderate long: trend following (+20)
      const moderateLong = applyPolarity(1.0, 'contrarian_extreme');
      expect(moderateLong).toBe(20.0);

      // Moderate short: trend following (-20)
      const moderateShort = applyPolarity(-1.0, 'contrarian_extreme');
      expect(moderateShort).toBe(-20.0);

      // Extreme crowded long (> +2 z): turns bearish (unwind risk)
      const extremeLong2 = applyPolarity(2.0, 'contrarian_extreme');
      expect(extremeLong2).toBeLessThan(0); // Bearish!

      const extremeLong25 = applyPolarity(2.5, 'contrarian_extreme');
      expect(extremeLong25).toBeCloseTo(-56.67, 1);

      const maxLong = applyPolarity(3.0, 'contrarian_extreme');
      expect(maxLong).toBe(-100.0);

      // Extreme crowded short (< -2 z): turns bullish (short squeeze potential)
      const extremeShort2 = applyPolarity(-2.0, 'contrarian_extreme');
      expect(extremeShort2).toBeGreaterThan(0); // Bullish squeeze!

      const extremeShort25 = applyPolarity(-2.5, 'contrarian_extreme');
      expect(extremeShort25).toBeCloseTo(56.67, 1);

      const maxShort = applyPolarity(-3.0, 'contrarian_extreme');
      expect(maxShort).toBe(100.0);
    });
  });

  describe('4. Pillar & Asset Aggregation with Rescaling & Jump Down-Weighting', () => {
    it('aggregates indicator scores into pillar score using active weights', () => {
      const indicators: ScoredIndicatorInput[] = [
        { indicatorId: '1', score: 60, baseWeight: 1.0, freshnessFactor: 1.0 },
        { indicatorId: '2', score: 20, baseWeight: 1.0, freshnessFactor: 1.0 },
      ];
      const res = aggregatePillarScore(indicators);
      expect(res.score).toBe(40); // (60*1 + 20*1) / 2 = 40
      expect(res.isEmpty).toBe(false);
    });

    it('down-weights indicators flagged with suspicious_jump by 50%', () => {
      const indicators: ScoredIndicatorInput[] = [
        { indicatorId: '1', score: 100, baseWeight: 1.0, freshnessFactor: 1.0, hasSuspiciousJump: true }, // active = 0.5
        { indicatorId: '2', score: 0, baseWeight: 1.0, freshnessFactor: 1.0, hasSuspiciousJump: false },   // active = 1.0
      ];
      // Total active weight = 0.5 + 1.0 = 1.5. Weighted score = 100*0.5 + 0*1.0 = 50. Score = 50 / 1.5 = 33.33
      const res = aggregatePillarScore(indicators, 0.5);
      expect(res.score).toBeCloseTo(33.33, 2);
    });

    it('excludes very stale indicators (freshnessFactor = 0)', () => {
      const indicators: ScoredIndicatorInput[] = [
        { indicatorId: '1', score: 80, baseWeight: 1.0, freshnessFactor: 1.0 },
        { indicatorId: '2', score: -80, baseWeight: 1.0, freshnessFactor: 0.0 }, // Excluded!
      ];
      const res = aggregatePillarScore(indicators);
      expect(res.score).toBe(80);
    });

    it('rescales pillar-to-asset weights so missing pillars do not drag score to zero', () => {
      // 3 configured pillars with base weights 0.40, 0.30, 0.30
      // But pillar 3 is empty (no fresh indicators)
      const pillars: WeightedPillarScore[] = [
        { pillarId: 'p1', score: 50, weight: 0.40, isEmpty: false },
        { pillarId: 'p2', score: 50, weight: 0.30, isEmpty: false },
        { pillarId: 'p3', score: 0, weight: 0.30, isEmpty: true }, // Missing
      ];

      const res = aggregateAssetScore(pillars);
      // Available weights sum = 0.70. Weighted sum = 50*0.4 + 50*0.3 = 35.
      // Rescaled score = 35 / 0.70 = 50.
      expect(res.score).toBe(50);
      expect(res.isRescaled).toBe(true);
    });
  });

  describe('5. Confidence Scoring & Signal Conflict Penalties', () => {
    it('awards high confidence when completeness and freshness are high and no conflict exists', () => {
      const conf = calculateConfidence({
        totalPossibleIndicatorWeight: 10,
        activeIndicatorWeight: 10,
        freshnessFactors: [1.0, 1.0, 1.0, 1.0],
        totalPillarsCount: 7,
        pillarsWithFreshDataCount: 7,
        topBullishContribution: 20,
        topBearishContribution: -15,
      });

      expect(conf.confidence).toBe('high');
      expect(conf.confidenceScore).toBe(100);
      expect(conf.warningFlags.length).toBe(0);
    });

    it('applies a 15-point conflict penalty when top drivers strongly contradict each other', () => {
      const normalConf = calculateConfidence({
        totalPossibleIndicatorWeight: 10,
        activeIndicatorWeight: 9,
        freshnessFactors: [1.0, 1.0],
        totalPillarsCount: 7,
        pillarsWithFreshDataCount: 6,
        topBullishContribution: 25,
        topBearishContribution: -20,
      });

      const conflictingConf = calculateConfidence({
        totalPossibleIndicatorWeight: 10,
        activeIndicatorWeight: 9,
        freshnessFactors: [1.0, 1.0],
        totalPillarsCount: 7,
        pillarsWithFreshDataCount: 6,
        topBullishContribution: 45, // > 40
        topBearishContribution: -45, // < -40
      });

      expect(conflictingConf.confidenceScore).toBe(normalConf.confidenceScore - 15);
      expect(conflictingConf.warningFlags).toContain('conflicting_macro_signals');
    });
  });

  describe('6. Deterministic Driver Attribution', () => {
    it('ranks top 3 positive contributors as bullish drivers and top 3 negative as bearish', () => {
      const contributors = [
        { indicatorId: '1', code: 'FEDFUNDS', name: 'Fed Funds Rate', pillarId: 'p1', pillarName: 'Monetary', rawValue: 5.33, zScore: 1.8, score: 60, weightInAsset: 0.25, contribution: 15.0, unit: '%' },
        { indicatorId: '2', code: 'NFP', name: 'Nonfarm Payrolls', pillarId: 'p3', pillarName: 'Growth & Labor', rawValue: 250, zScore: 1.5, score: 50, weightInAsset: 0.20, contribution: 10.0, unit: 'k' },
        { indicatorId: '3', code: 'UNRATE', name: 'Unemployment Rate', pillarId: 'p3', pillarName: 'Growth & Labor', rawValue: 4.2, zScore: 1.2, score: -40, weightInAsset: 0.15, contribution: -6.0, unit: '%' },
        { indicatorId: '4', code: 'DEBT', name: 'Debt to GDP', pillarId: 'p6', pillarName: 'Structural', rawValue: 122, zScore: 2.1, score: -70, weightInAsset: 0.10, contribution: -7.0, unit: '%' },
      ];

      const res = computeDriverAttribution('USD', 'short', contributors);
      expect(res.bullishDrivers.length).toBe(2);
      expect(res.bullishDrivers[0].metricName).toBe('Fed Funds Rate');
      expect(res.bullishDrivers[0].rank).toBe(1);
      expect(res.bullishDrivers[0].explanation).toContain('Fed Funds Rate at 5.33 % (+1.8 sigma) supports USD via Monetary.');

      expect(res.bearishDrivers.length).toBe(2);
      expect(res.bearishDrivers[0].metricName).toBe('Debt to GDP'); // Most negative (-7.0) is rank 1 bearish
      expect(res.bearishDrivers[0].rank).toBe(1);
      expect(res.bearishDrivers[1].metricName).toBe('Unemployment Rate'); // -6.0 is rank 2 bearish
    });
  });

  describe('7. Determinism Test', () => {
    it('running scoring calculations twice on identical inputs produces identical floating point numbers', () => {
      const sampleValues = [4.2, 4.5, 4.8, 5.0, 5.25, 5.33, 5.33];
      const run1Z = computeRobustZScore(5.33, sampleValues);
      const run2Z = computeRobustZScore(5.33, sampleValues);
      expect(run1Z).toBe(run2Z);

      const run1Score = applyPolarity(run1Z, 'higher_bullish');
      const run2Score = applyPolarity(run2Z, 'higher_bullish');
      expect(run1Score).toBe(run2Score);
    });
  });

  describe('8. Synthetic Dataset End-to-End Validation', () => {
    it('validates synthetic multi-indicator dataset across vintages and horizons', () => {
      const { observations, asOfTestDate } = syntheticData;

      // Extract DFF
      const dffObs = observations.filter((o) => o.indicator_id === 'ind_dff');
      const dffPit = filterObservationsPointInTime(dffObs, asOfTestDate, [], 'daily');

      // 4 observations in fixture: 3 before June 1, 1 in July (July 1st)
      // Must include exactly the 3 released prior to June 1st
      expect(dffPit.series.length).toBe(3);
      expect(dffPit.latestObservation?.periodDate).toBe('2026-05-28');
      expect(dffPit.latestObservation?.value).toBe(5.33);

      // Extract CPI
      const cpiObs = observations.filter((o) => o.indicator_id === 'ind_cpi');
      const cpiPit = filterObservationsPointInTime(cpiObs, asOfTestDate, [], 'monthly');

      // Before June 1st: March print and unrevised April print (312.0)
      expect(cpiPit.series.length).toBe(2);
      expect(cpiPit.latestObservation?.value).toBe(312.0); // Not the revised 312.5 released on June 15
    });
  });
});
