import { describe, expect, it } from 'vitest';
import { buildCopilot } from './copilotRoutes';

const mk = (n: number, start: number, step: number) => Array.from({ length: n }, (_, i) => {
  const c = start + i * step; return { timestamp: i * 86_400_000, open: c - step / 2, high: c * 1.003, low: c * 0.997, close: c, volume: 1 };
});
const now = Date.now();

describe('trade copilot', () => {
  it('BUY plan when trend, fundamentals and crowd agree', () => {
    const snap = { pairs: [{ symbol: 'XAUUSD', score: 60, confidence: 80, bullishPct: 80, explanation: 'x' }], upcoming: [] };
    const sent = { rows: [{ symbol: 'XAUUSD', longPct: 30, shortPct: 70, method: 'measured', sources: [{ name: 'FXSSI' }] }] };
    const r = buildCopilot('XAUUSD', mk(80, 3000, 10), 'test', snap, sent, now);
    expect(r.action).toBe('BUY');
    expect(r.plan.stop).toBeLessThan(r.plan.entry);
    expect(r.plan.targets[0]).toBeGreaterThan(r.plan.entry);
    expect(r.plan.targets[1] - r.plan.entry).toBeCloseTo(2 * (r.plan.entry - r.plan.stop), 0);
  });
  it('WAIT when inputs disagree, and flags imminent high-impact news', () => {
    const snap = { pairs: [{ symbol: 'EURUSD', score: -60, confidence: 80 }], upcoming: [{ asset: 'USD', title: 'CPI', scheduledAt: new Date(now + 2 * 3_600_000).toISOString(), importance: 'high', forecast: null, previous: null }] };
    const r = buildCopilot('EURUSD', mk(80, 1.05, 0.001), 'test', snap, null, now);
    expect(r.action).toBe('WAIT');
    expect(r.plan).toBeNull();
    expect(r.events[0].title).toBe('CPI');
    expect(r.reasons.join(' ')).toMatch(/CPI/);
  });
  it('SELL plan in a downtrend with bearish fundamentals; returns null on short history', () => {
    const snap = { pairs: [{ symbol: 'GBPJPY', score: -50, confidence: 70 }], upcoming: [] };
    const r = buildCopilot('GBPJPY', mk(80, 200, -0.3), 'test', snap, null, now);
    expect(r.action).toBe('SELL');
    expect(r.plan.stop).toBeGreaterThan(r.plan.entry);
    expect(buildCopilot('GBPJPY', mk(10, 200, -0.3), 'test', snap, null, now)).toBeNull();
  });
});
