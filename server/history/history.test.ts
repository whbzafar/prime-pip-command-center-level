import { describe, it, expect } from 'vitest';
import { aggregate, dukaInception, dukaInstrumentExists, listDukaInstruments } from './historyService.js';

describe('history service', () => {
  it('aggregates daily bars into Monday-based weeks and calendar months', () => {
    const d = (y: number, m: number, day: number, o: number, h: number, l: number, c: number) => ({ timestamp: Date.UTC(y, m, day), open: o, high: h, low: l, close: c, volume: 1 });
    const daily = [d(2026, 9, 29, 1, 2, 0.5, 1.5), d(2026, 9, 30, 1.5, 3, 1, 2), d(2026, 10, 2, 2, 2.5, 1.8, 2.2), d(2026, 10, 3, 2.2, 2.4, 2, 2.1)];
    const w = aggregate(daily, 'w1');
    expect(w.map((x) => new Date(x.timestamp).toISOString().slice(0, 10))).toEqual(['2026-10-26', '2026-11-02']);
    expect(w[0]).toMatchObject({ open: 1, high: 3, low: 0.5, close: 2, volume: 2 });
    const m = aggregate(daily, 'mn1');
    expect(m.map((x) => new Date(x.timestamp).toISOString().slice(0, 10))).toEqual(['2026-10-01', '2026-11-01']);
    expect(m[1]).toMatchObject({ open: 2, high: 2.5, low: 1.8, close: 2.1 });
  });
  it('knows Dukascopy instruments and their first data', () => {
    expect(dukaInstrumentExists('eurusd')).toBe(true);
    expect(new Date(dukaInception('xauusd', 'm1')).getUTCFullYear()).toBe(2003);
    expect(new Date(dukaInception('eurusd', 'd1')).getUTCFullYear()).toBe(1973);
    expect(listDukaInstruments().length).toBeGreaterThan(1400);
  });
});
