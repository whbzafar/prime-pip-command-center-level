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

import { applySbt } from './copilotRoutes';
describe('copilot × SBT', () => {
  const base = { digits: 2, action: 'BUY', plan: { x: 1 }, reasons: ['High-impact USD release "CPI" in 2h — expect a volatility spike.'], inputs: { fundamentals: { score: -40 } } };
  const H = 3_600_000, last = Date.UTC(2026, 10, 16, 8);
  const sig = { time: last, dir: -1, level: 1, price: 3925, stop: 3950, target: 3875, zoneTop: 3928, zoneBottom: 3924, models: ['SBT 5'] };
  it('valid sell when the strategy fired on the last closed H1 candle and fundamentals agree', () => {
    const r = applySbt(base, { ok: true, stale: false, lastCandle: last, signals: [sig], armed: true, dir: -1, level1: { top: 3928, bottom: 3924, modelReady: true } }, last + H + 60_000);
    expect(r.action).toBe('SELL'); expect(r.sbt.valid).toBe(true); expect(r.plan.stop).toBe(3950); expect(r.plan.targets[1]).toBe(3875);
    expect(r.reasons.join(' ')).toMatch(/VALID SETUP/); expect(r.reasons.join(' ')).toMatch(/CPI/);
  });
  it('no trade when fundamentals point the other way', () => {
    const r = applySbt(base, { ok: true, stale: false, lastCandle: last, signals: [{ ...sig, dir: 1 }], armed: true, dir: 1 }, last + H);
    expect(r.action).toBe('WAIT'); expect(r.sbt.valid).toBe(false);
  });
  it('waits (with the zones) when price is not at a level, and when data is stale or the strategy is not loaded', () => {
    const w = applySbt(base, { ok: true, stale: false, lastCandle: last, signals: [{ ...sig, time: last - 5 * H }], armed: true, dir: -1, level1: { top: 3928, bottom: 3924, modelReady: true } }, last + H);
    expect(w.action).toBe('WAIT'); expect(w.reasons[0]).toMatch(/Level 1 3924–3928 \(model ready\)/);
    expect(applySbt(base, { ok: true, stale: true }).action).toBe('WAIT');
    expect(applySbt(base, { ok: false, code: 'not_configured' }).sbt.status).toBe('NOT_LOADED');
  });
});
