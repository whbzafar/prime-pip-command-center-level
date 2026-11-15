import { describe, expect, it } from 'vitest';
import { analyseRegime } from './radarRoutes';
const mk = (f: (i: number) => number) => Array.from({ length: 140 }, (_, i) => { const c = f(i); return { timestamp: i * 864e5, open: c, high: c * 1.002, low: c * 0.998, close: c, volume: 1 }; });
describe('regime radar', () => {
  it('detects a clean trend', () => { const r = analyseRegime(mk((i) => 100 + i * 0.3 + Math.sin(i) * 0.05))!; expect(['TRENDING', 'BREAKOUT']).toContain(r.regime); expect(r.direction).toBeGreaterThan(50); });
  it('detects a choppy range', () => { const r = analyseRegime(mk((i) => 100 + Math.sin(i * 1.7) * 2))!; expect(r.regime).toBe('RANGING'); });
  it('detects a volatility squeeze', () => { const r = analyseRegime(mk((i) => 100 + Math.sin(i * 1.7) * (i < 110 ? 3 : 0.1)))!; expect(r.regime).toBe('COILING'); });
  it('needs enough history', () => { expect(analyseRegime(mk((i) => i + 1).slice(0, 30))).toBeNull(); });
});
