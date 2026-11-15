import { describe, expect, it } from 'vitest';
import { classify, reactionFrom } from './shockRoutes';
describe('event shock simulator', () => {
  it('classifies surprises relative to the typical miss', () => {
    const c = classify([{ actual: 200, forecast: 150 }, { actual: 150, forecast: 152 }, { actual: 100, forecast: 160 }, { actual: null, forecast: 1 }]);
    expect(c).toEqual(['above', 'inline', 'below', 'unknown']);
  });
  it('measures moves from the bar before the release', () => {
    const ts = 1_700_000_000_000 - (1_700_000_000_000 % 900_000);
    const bars = Array.from({ length: 110 }, (_, i) => { const t = ts - 2 * 900_000 + i * 900_000; const c = t < ts ? 100 : 101; return { timestamp: t, open: c, high: c + 0.5, low: c - 0.2, close: c, volume: 1 }; });
    const r = reactionFrom(bars, ts)!;
    expect(r['15m']).toBeCloseTo(1, 3);
    expect(r['24h']).toBeCloseTo(1, 3);
    expect(r.spikeUp).toBeCloseTo(1.5, 3);
  });
});
