import { describe, expect, it } from 'vitest';
import { aggregate, rsi, signals, simulate, statsOf, EDGE_UNIVERSE } from '../strategy/quantEdge';
const gold = EDGE_UNIVERSE[0];
describe('quant edge engine', () => {
  it('aggregates H1 into UTC 4-hour bars', () => {
    const h1 = Array.from({ length: 8 }, (_, i) => ({ timestamp: Date.UTC(2026, 0, 5, i), open: i, high: i + 1, low: i - 1, close: i + 0.5 }));
    const b = aggregate(h1, 'H4'); expect(b.length).toBe(2); expect(b[0]).toMatchObject({ open: 0, high: 4, low: -1, close: 3.5 });
  });
  it('RSI(2) of a steady fall is near zero', () => { const r = rsi(Array.from({ length: 30 }, (_, i) => 100 - i), 2); expect(r[29]).toBeLessThan(1); });
  it('takes a breakout long and trails the stop to a profit in a rising market', () => {
    const bars = Array.from({ length: 400 }, (_, i) => { const c = 1000 + (i < 250 ? Math.sin(i / 5) * 5 : (i - 250) * 3); return { timestamp: i * 14_400_000, open: c - 1, high: c + 2, low: c - 2, close: c }; });
    bars.push({ timestamp: 400 * 14_400_000, open: 1300, high: 1301, low: 1100, close: 1110 }); // collapse → trailing stop hit
    const { trades } = simulate(bars, gold, signals(bars, gold));
    const longs = trades.filter((t) => t.dir === 1);
    expect(longs.length).toBeGreaterThan(0);
    expect(longs[longs.length - 1].r!).toBeGreaterThan(1);
    expect(statsOf(trades.map((t) => t.r!)).n).toBe(trades.length);
  });
});
