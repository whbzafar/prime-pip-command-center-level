import { describe, expect, it } from 'vitest';
import { diffEvents, marketEvents, toState } from './levelEvents';
const meta = { symbol: 'GBPCAD', display: 'GBP/CAD', market: 'forex', side: 1 as const, score: 20 };
const H = 3_600_000, T = Date.UTC(2026, 10, 16, 9);
const scan = (o: any) => ({ ok: true, lastCandle: T, lastClose: 1.88, pip: 0.0001, stale: false, dir: 1, level1: { top: 1.885, bottom: 1.884, modelReady: false }, level2: null, inTrade: false, signals: [], ...o });
describe('H1 level events', () => {
  it('activates only on the candle that just closed and only on the fundamentals side', () => {
    const sell = toState(meta, scan({ dir: -1, signals: [{ time: T, dir: -1, level: 1, price: 1.885, stop: 1.887, target: 1.881, zoneTop: 1.886, zoneBottom: 1.885, models: ['SBT 8A'] }] }));
    expect(sell.hit).toBeNull(); // GBPCAD is a fundamental BUY: a sell entry is never announced
    const old = toState(meta, scan({ signals: [{ time: T - 3 * H, dir: 1, level: 1, price: 1.88, stop: 1.878, target: 1.884, zoneTop: 1.881, zoneBottom: 1.88, models: [] }] }));
    expect(old.hit).toBeNull(); // an entry from earlier candles is not "reached" now
    const now = toState(meta, scan({ signals: [{ time: T, dir: 1, level: 2, price: 1.88, stop: 1.878, target: 1.884, zoneTop: 1.881, zoneBottom: 1.88, models: ['SBT 4'] }] }));
    const e = diffEvents({}, [now]);
    expect(e[0].kind).toBe('ACTIVATED'); expect(e[0].level).toBe(2); expect(e[0].speech).toMatch(/G B P C A D\. Level 2 activated/);
  });
  it('ready, deactivated and trade closed', () => {
    const prev = toState(meta, scan({ lastCandle: T - H, inTrade: true, level2: { top: 1.882, bottom: 1.881, modelReady: true }, signals: [{ time: T - 5 * H, dir: 1, level: 1, price: 1.879, stop: 1.877, target: 1.883, zoneTop: 1.88, zoneBottom: 1.879, models: [] }] }));
    const cur = toState(meta, scan({ level1: { top: 1.885, bottom: 1.884, modelReady: true }, level2: null, inTrade: false }));
    const kinds = diffEvents({ GBPCAD: prev }, [cur]).map((x) => x.kind).sort();
    expect(kinds).toEqual(['DEACTIVATED', 'READY', 'TRADE_CLOSED']);
  });
  it('structure turning against the fundamentals deactivates the waiting levels; stale scans say nothing', () => {
    const prev = toState(meta, scan({ lastCandle: T - H }));
    const flip = toState(meta, scan({ dir: -1 }));
    expect(diffEvents({ GBPCAD: prev }, [flip]).map((x) => x.kind)).toEqual(['DEACTIVATED']);
    expect(diffEvents({ GBPCAD: prev }, [toState(meta, scan({ dir: -1, stale: true }))])).toEqual([]);
  });
  it('market open / close', () => {
    expect(marketEvents(true, Date.UTC(2026, 10, 20, 21, 30)).events[0].kind).toBe('MARKET_CLOSED');
    expect(marketEvents(false, Date.UTC(2026, 10, 22, 22, 30)).events[0].kind).toBe('MARKET_OPEN');
    expect(marketEvents(undefined, Date.UTC(2026, 10, 22, 22, 30)).events).toEqual([]);
  });
});
