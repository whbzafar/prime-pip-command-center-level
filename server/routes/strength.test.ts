import { describe, expect, it } from 'vitest';
import { correlationFrom, strengthFrom } from './strengthRoutes';
const series = (f: (i: number) => number) => Array.from({ length: 70 }, (_, i) => ({ timestamp: Date.UTC(2026, 0, 1) + i * 864e5, open: 1, high: 1, low: 1, close: f(i), volume: 0 }));
describe('strength & correlation', () => {
  it('a rising EURUSD makes EUR strong and USD weak', () => {
    const s = strengthFrom({ EURUSD: series((i) => 1 + i * 0.001) });
    expect(s.EUR.d20!).toBeGreaterThan(0); expect(s.USD.d20!).toBeLessThan(0);
  });
  it('perfectly mirrored markets correlate -1, identical +1', () => {
    const wig = (i: number) => Math.sin(i * 1.3) * 0.01;
    const m = correlationFrom({ A: series((i) => 100 * (1 + wig(i))), B: series((i) => 100 * (1 + wig(i))), C: series((i) => 100 * (1 - wig(i))) });
    expect(m.A.B).toBeCloseTo(1, 1); expect(m.A.C!).toBeLessThan(-0.9);
  });
});
