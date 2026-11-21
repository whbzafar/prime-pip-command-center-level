import { describe, it, expect } from 'vitest';
import { detectGaps } from './commandCenter';

const base = { sources: [], assets: [], snapshotAgeMin: 10, unmatched: {}, levelsAgeMin: 30, storageMode: 'redis' };
describe('command center gap detection', () => {
  it('reports nothing when everything measured is healthy', () => expect(detectGaps(base)).toEqual([]));
  it('flags a down source as critical with evidence', () => {
    const f = detectGaps({ ...base, sources: [{ id: 'fred', name: 'FRED', status: 'down', lastError: 'timeout', lastSuccess: null }] });
    expect(f[0].severity).toBe('critical'); expect(f[0].evidence?.[0]).toContain('FRED');
  });
  it('flags stale level alerts, non-durable storage and unscored releases, most severe first', () => {
    const f = detectGaps({ ...base, levelsAgeMin: 400, storageMode: 'temporary', unmatched: { US: ['ADP Employment'] } });
    expect(f.map((x) => x.id)).toEqual(['levels-stale', 'storage', 'unmatched']);
  });
  it('ignores stocks when judging coverage, reports thin markets', () => {
    const f = detectGaps({ ...base, assets: [{ symbol: 'AAPL', name: 'Apple', assetClass: 'STOCKS', score: null, confidence: 0 }, { symbol: 'NZD', name: 'NZD', assetClass: 'FOREX', score: 5, confidence: 40 }] });
    expect(f).toHaveLength(1); expect(f[0].evidence).toHaveLength(1);
  });
});
