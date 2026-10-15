import { describe, it, expect } from 'vitest';
import { CftcCollector, CFTC_CURRENCY_CONTRACTS } from '../collectors/cftcCollector.js';
import cftcTffSample from './fixtures/cftc_tff_sample.json';

describe('CFTC Collector & Parser Unit Tests', () => {
  const collector = new CftcCollector();

  describe('Contract Market Code Mapping', () => {
    it('contains verified contract market codes for all 8 major currencies', () => {
      const currencies = ['USD', 'EUR', 'JPY', 'GBP', 'CHF', 'AUD', 'CAD', 'NZD'];
      const registeredCurrencies = Object.values(CFTC_CURRENCY_CONTRACTS).map((c) => c.currency);

      currencies.forEach((c) => {
        expect(registeredCurrencies).toContain(c);
      });

      expect(CFTC_CURRENCY_CONTRACTS['099741'].currency).toBe('EUR');
      expect(CFTC_CURRENCY_CONTRACTS['098662'].currency).toBe('USD');
      expect(CFTC_CURRENCY_CONTRACTS['098662'].isProxy).toBe(true);
      expect(CFTC_CURRENCY_CONTRACTS['097741'].currency).toBe('JPY');
      expect(CFTC_CURRENCY_CONTRACTS['096742'].currency).toBe('GBP');
      expect(CFTC_CURRENCY_CONTRACTS['092741'].currency).toBe('CHF');
      expect(CFTC_CURRENCY_CONTRACTS['232741'].currency).toBe('AUD');
      expect(CFTC_CURRENCY_CONTRACTS['090741'].currency).toBe('CAD');
      expect(CFTC_CURRENCY_CONTRACTS['112741'].currency).toBe('NZD');
    });
  });

  describe('Report Date & Friday Release Timing', () => {
    it('parses Tuesday report dates and calculates Friday 15:30 ET / 20:30 UTC release timestamp', () => {
      const results = collector.parseCftcRows(
        'eur_cftc_lev_net',
        '099741',
        'LEV_NET',
        cftcTffSample.filter((r) => r.cftc_contract_market_code === '099741')
      );

      expect(results.length).toBe(2);

      // Tuesday 2026-10-06 -> Released Friday 2026-10-09T20:30:00Z
      expect(results[0].periodDate).toBe('2026-10-06');
      expect(results[0].releasedAt).toBe('2026-10-09T20:30:00Z');

      // Tuesday 2026-10-13 -> Released Friday 2026-10-16T20:30:00Z
      expect(results[1].periodDate).toBe('2026-10-13');
      expect(results[1].releasedAt).toBe('2026-10-16T20:30:00Z');
    });
  });

  describe('Positioning Formulas & Metrics Extraction', () => {
    it('calculates leveraged funds net positioning (Long - Short)', () => {
      // Row 1: Long 125,430, Short 85,210 -> Net = +40,220
      const results = collector.parseCftcRows(
        'eur_cftc_lev_net',
        '099741',
        'LEV_NET',
        cftcTffSample.filter((r) => r.cftc_contract_market_code === '099741')
      );

      expect(results[0].value).toBe(125430 - 85210); // 40220
      expect(results[1].value).toBe(130100 - 82050); // 48050
    });

    it('calculates leveraged funds net as % of open interest', () => {
      // Row 1: Net = 40,220, Open Interest = 650,200 -> Net % OI = (40220 / 650200) * 100 = 6.19%
      const results = collector.parseCftcRows(
        'eur_cftc_lev_net_pct_oi',
        '099741',
        'LEV_NET_PCT_OI',
        cftcTffSample.filter((r) => r.cftc_contract_market_code === '099741')
      );

      expect(results[0].value).toBe(6.19);
      // Row 2: Net = 48,050, Open Interest = 662,500 -> Net % OI = (48050 / 662500) * 100 = 7.25%
      expect(results[1].value).toBe(7.25);
    });

    it('extracts total open interest contracts correctly', () => {
      const results = collector.parseCftcRows(
        'usd_cftc_open_interest',
        '098662',
        'OPEN_INTEREST',
        cftcTffSample.filter((r) => r.cftc_contract_market_code === '098662')
      );

      expect(results.length).toBe(1);
      expect(results[0].value).toBe(48500);
      expect(results[0].periodDate).toBe('2026-10-13');
    });

    it('extracts institutional asset manager net positioning', () => {
      // USD Index row: Asset Mgr Long 32,100, Short 19,400 -> Net = +12,700
      const results = collector.parseCftcRows(
        'usd_cftc_asset_mgr_net',
        '098662',
        'ASSET_MGR_NET',
        cftcTffSample.filter((r) => r.cftc_contract_market_code === '098662')
      );

      expect(results.length).toBe(1);
      expect(results[0].value).toBe(32100 - 19400); // 12700
    });
  });

  describe('Contract Verification Mismatch Handling', () => {
    it('returns warning on unrecognized contract code', async () => {
      const result = await collector.verifySeries('999999:UNKNOWN');
      expect(result.isValid).toBe(false);
      expect(result.warningMessage).toContain('Unknown CFTC contract code');
    });
  });
});
