import { describe, it, expect } from 'vitest';
import { FredCollector } from '../collectors/fredCollector.js';
import fredDffSample from './fixtures/fred_dff_sample.json';
import fredGdpSample from './fixtures/fred_revisable_gdp_sample.json';

describe('FRED Collector & Parser Unit Tests', () => {
  const collector = new FredCollector();

  describe('Missing Value Handling ("." in FRED)', () => {
    it('skips "." values and never stores them as zero or NaN', () => {
      const results = collector.parseFredObservations(
        'usd_fedfunds',
        'DFF',
        fredDffSample.observations,
        false
      );

      // The fixture has 5 rows: 3 valid numbers (4.83, 4.83, 4.82) and 2 "." rows.
      expect(results.length).toBe(3);

      // Verify no "." values or zeros were ingested for the missing weekend rows
      const dates = results.map((r) => r.periodDate);
      expect(dates).toContain('2026-10-01');
      expect(dates).toContain('2026-10-02');
      expect(dates).toContain('2026-10-05');
      expect(dates).not.toContain('2026-10-03');
      expect(dates).not.toContain('2026-10-04');

      results.forEach((r) => {
        expect(typeof r.value).toBe('number');
        expect(isNaN(r.value)).toBe(false);
        expect(r.value).toBeGreaterThan(0);
      });
    });
  });

  describe('Point-in-Time & Revision Handling', () => {
    it('creates separate distinct rows for revisions of the same period date', () => {
      const results = collector.parseFredObservations(
        'usd_gdp_real',
        'GDPC1',
        fredGdpSample.observations,
        true // isRevisable
      );

      // All 3 observations in the fixture describe period '2026-04-01'
      expect(results.length).toBe(3);

      const periodDates = results.map((r) => r.periodDate);
      expect(periodDates.every((d) => d === '2026-04-01')).toBe(true);

      // First release is initial (isRevision = false)
      expect(results[0].isRevision).toBe(false);
      expect(results[0].releasedAt).toBe('2026-07-30T14:30:00Z');
      expect(results[0].value).toBe(22850.5);

      // Second print is revision 1 (isRevision = true) with its own releasedAt
      expect(results[1].isRevision).toBe(true);
      expect(results[1].releasedAt).toBe('2026-08-29T14:30:00Z');
      expect(results[1].value).toBe(22890.2);

      // Third print is revision 2 (isRevision = true)
      expect(results[2].isRevision).toBe(true);
      expect(results[2].releasedAt).toBe('2026-09-26T14:30:00Z');
      expect(results[2].value).toBe(22915.8);

      // Unique keys: (indicator_id, period_date, released_at) are all distinct!
      const uniqueKeys = new Set(
        results.map((r) => `${r.indicatorId}|${r.periodDate}|${r.releasedAt}`)
      );
      expect(uniqueKeys.size).toBe(3);
    });

    it('sets isRevision=false and single end-of-day timestamp for market-priced series', () => {
      const results = collector.parseFredObservations(
        'usd_dgs2',
        'DGS2',
        [
          { date: '2026-10-01', value: '3.98' },
          { date: '2026-10-02', value: '4.01' },
        ],
        false // market-priced, not revisable
      );

      expect(results.length).toBe(2);
      expect(results[0].isRevision).toBe(false);
      expect(results[0].releasedAt).toBe('2026-10-01T23:59:59Z');
      expect(results[1].isRevision).toBe(false);
      expect(results[1].releasedAt).toBe('2026-10-02T23:59:59Z');
    });
  });

  describe('Out of Range & Sanity Handling', () => {
    it('flags observations that violate indicator sanity ranges without dropping them', () => {
      const results = collector.parseFredObservations(
        'usd_fedfunds',
        'DFF',
        [
          { date: '2026-10-01', value: '4.83' },
          { date: '2026-10-02', value: '85.00' }, // Absurd 85% fed funds rate!
        ],
        false
      );

      expect(results.length).toBe(2);
      expect(results[0].qualityFlag).toBeUndefined();
      expect(results[1].qualityFlag).toBeDefined();
      expect(results[1].qualityFlag?.flagType).toBe('out_of_range');
    });
  });
});
