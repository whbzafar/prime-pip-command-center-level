import { describe, expect, it } from 'vitest';
import { buildUniverseMap, sideOf } from './universeMap.js';

describe('universe map', () => {
  it('classifies sides with the engine thresholds', () => {
    expect(sideOf(10)).toBe('bull'); expect(sideOf(9.9)).toBe('neutral'); expect(sideOf(-10)).toBe('bear'); expect(sideOf(0)).toBe('neutral');
  });
  it('skips unscored items and keeps bull+bear = 100', () => {
    const snap: any = {
      generatedAt: 't',
      assets: [{ symbol: 'A', name: 'A', assetClass: 'FOREX', score: 40, bullishPct: 70, confidence: 80 }, { symbol: 'B', name: 'B', assetClass: 'STOCKS', score: null, bullishPct: null, confidence: 0 }],
      pairs: [{ symbol: 'EURUSD', display: 'EUR/USD', assetClass: 'FOREX', score: -24, bullishPct: 38, confidence: 90 }],
    };
    const u = buildUniverseMap(snap);
    expect(u.assets).toHaveLength(1); expect(u.assets[0].side).toBe('bull'); expect(u.assets[0].bullishPct + u.assets[0].bearishPct).toBe(100);
    expect(u.pairs[0].label).toBe('EUR/USD'); expect(u.pairs[0].side).toBe('bear');
  });
});
