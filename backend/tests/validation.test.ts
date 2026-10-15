import { describe, it, expect } from 'vitest';
import { validateObservation, detectSuspiciousJump, SANITY_RANGES } from '../shared/validation.js';

describe('Validation & Data Quality Rules Unit Tests', () => {
  describe('Non-numeric and missing values', () => {
    it('rejects missing "." string from FRED', () => {
      const res = validateObservation('DFF', '2026-10-01', '.');
      expect(res.isValid).toBe(false);
      expect(res.rejectReason).toContain('Missing or null');
    });

    it('rejects null, undefined, and empty string', () => {
      expect(validateObservation('DFF', '2026-10-01', null).isValid).toBe(false);
      expect(validateObservation('DFF', '2026-10-01', undefined).isValid).toBe(false);
      expect(validateObservation('DFF', '2026-10-01', '').isValid).toBe(false);
    });

    it('rejects non-numeric string values', () => {
      const res = validateObservation('UNRATE', '2026-10-01', 'not_a_number');
      expect(res.isValid).toBe(false);
      expect(res.rejectReason).toContain('Non-numeric');
    });
  });

  describe('Future-dated periods', () => {
    it('rejects future-dated observation periods', () => {
      const futureDate = '2099-01-01';
      const res = validateObservation('PAYEMS', futureDate, 150000);
      expect(res.isValid).toBe(false);
      expect(res.rejectReason).toContain('Future-dated');
    });

    it('accepts historical and current dates', () => {
      const historicalDate = '2026-01-15';
      const res = validateObservation('PAYEMS', historicalDate, 155000);
      expect(res.isValid).toBe(true);
    });
  });

  describe('Sanity Range Boundaries', () => {
    it('flags fed funds rate outside [-1.0, 25.0] range', () => {
      const lowCheck = validateObservation('DFF', '2026-05-01', -5.0);
      expect(lowCheck.isValid).toBe(true);
      expect(lowCheck.qualityFlagType).toBe('out_of_range');

      const highCheck = validateObservation('DFF', '2026-05-01', 32.0);
      expect(highCheck.isValid).toBe(true);
      expect(highCheck.qualityFlagType).toBe('out_of_range');

      const normalCheck = validateObservation('DFF', '2026-05-01', 4.83);
      expect(normalCheck.isValid).toBe(true);
      expect(normalCheck.qualityFlagType).toBeUndefined();
    });

    it('flags unemployment rate outside [1.0, 30.0] range', () => {
      const zeroCheck = validateObservation('UNRATE', '2026-05-01', 0.2);
      expect(zeroCheck.qualityFlagType).toBe('out_of_range');

      const normalCheck = validateObservation('UNRATE', '2026-05-01', 4.1);
      expect(normalCheck.qualityFlagType).toBeUndefined();
    });

    it('flags CFTC Net % of Open Interest outside [-100, 100] range', () => {
      const absurdCheck = validateObservation('CFTC_LEV_NET_PCT_OI', '2026-10-06', 150.0);
      expect(absurdCheck.qualityFlagType).toBe('out_of_range');

      const normalCheck = validateObservation('CFTC_LEV_NET_PCT_OI', '2026-10-06', 12.5);
      expect(normalCheck.qualityFlagType).toBeUndefined();
    });
  });

  describe('Suspicious Jump Detection', () => {
    it('flags daily/weekly change exceeding threshold standard deviations', () => {
      // Prior reading was 4.0, new reading is 12.0 with historical stdDev of 1.0 -> 8.0 > 4.0 threshold
      const jump = detectSuspiciousJump(12.0, 4.0, 4.0, 1.0);
      expect(jump).toBe(true);
    });

    it('does not flag normal fluctuations within tolerance', () => {
      // Prior reading was 4.0, new reading is 4.2 with historical stdDev of 1.0 -> 0.2 < 4.0 threshold
      const normal = detectSuspiciousJump(4.2, 4.0, 4.0, 1.0);
      expect(normal).toBe(false);
    });

    it('handles first observation without prior reading gracefully', () => {
      expect(detectSuspiciousJump(4.5, null)).toBe(false);
      expect(detectSuspiciousJump(4.5, undefined)).toBe(false);
    });
  });
});
