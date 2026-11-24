import { describe, it, expect } from 'vitest';
import { forexcomQueries, parseCiDate, forexcomBefore } from './forexcom';
describe('forexcom', () => {
  it('maps pairs and commodities', () => {
    expect(forexcomQueries('eurusd')).toEqual(['EUR/USD']);
    expect(forexcomQueries('xauusd')?.[0]).toBe('Spot Gold');
    expect(forexcomQueries('ausidxaud')).toBeNull();
  });
  it('parses CIAPI dates', () => expect(parseCiDate('/Date(1700000000000)/')).toBe(1700000000000));
  it('returns null (fallback) when not configured', async () => expect(await forexcomBefore('eurusd', 'h1', Date.now(), 10)).toBeNull());
});
