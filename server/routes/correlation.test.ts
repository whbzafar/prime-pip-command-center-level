import { describe, it, expect } from 'vitest';
import { analyseExposure, corrOver, legsOf, pearson, returnsByDay } from './correlationRoutes';

const mk = (closes: number[]) => closes.map((close, i) => ({ timestamp: Date.UTC(2026, 0, 1 + i), open: close, high: close, low: close, close, volume: 0 })) as any;
const walk = (n: number, f: (i: number) => number) => { let p = 100; const out = [p]; for (let i = 1; i < n; i++) { p *= Math.exp(f(i)); out.push(p); } return out; };

describe('correlation maths', () => {
  it('pearson: identical = 1, mirrored = -1, too few points = null', () => {
    const a = Array.from({ length: 30 }, (_, i) => Math.sin(i));
    expect(pearson(a, a)).toBeCloseTo(1, 6);
    expect(pearson(a, a.map((x) => -x))).toBeCloseTo(-1, 6);
    expect(pearson(a.slice(0, 5), a.slice(0, 5))).toBeNull();
  });
  it('aligns by date and uses the latest window', () => {
    const r = (i: number) => Math.sin(i * 1.3) * 0.01;
    const A = returnsByDay(mk(walk(60, r))), B = returnsByDay(mk(walk(60, (i) => -r(i))));
    const c = corrOver(A, B, 30); expect(c.n).toBe(30); expect(c.r).toBeCloseTo(-1, 2);
  });
});

describe('exposure', () => {
  it('splits currency legs', () => {
    expect(legsOf('EURUSD', 'LONG')).toEqual([['EUR', 1], ['USD', -1]]);
    expect(legsOf('USDJPY', 'SHORT')).toEqual([['USD', -1], ['JPY', 1]]);
    expect(legsOf('XAUUSD', 'LONG')).toEqual([['XAU', 1], ['USD', -1]]);
  });
  it('two correlated longs carry more than the sum of nothing — adjusted risk ≈ naive, effective bets ≈ 1; uncorrelated ≈ 2', () => {
    const same = analyseExposure([{ symbol: 'EURUSD', side: 'LONG', riskPct: 1 }, { symbol: 'GBPUSD', side: 'LONG', riskPct: 1 }], () => 0.9);
    expect(same.adjustedRiskPct).toBeGreaterThan(1.9); expect(same.effectiveBets).toBeLessThan(1.1); expect(same.findings[0].kind).toBe('double');
    const indep = analyseExposure([{ symbol: 'EURUSD', side: 'LONG', riskPct: 1 }, { symbol: 'XAUUSD', side: 'LONG', riskPct: 1 }], () => 0);
    expect(indep.effectiveBets).toBeCloseTo(2, 5); expect(indep.findings.length).toBe(0);
  });
  it('flags offsetting trades', () => {
    const e = analyseExposure([{ symbol: 'EURUSD', side: 'LONG', riskPct: 1 }, { symbol: 'GBPUSD', side: 'SHORT', riskPct: 1 }], () => 0.85);
    expect(e.findings[0].kind).toBe('hedge'); expect(e.adjustedRiskPct).toBeLessThan(1);
  });
  it('nets currency exposure', () => {
    const e = analyseExposure([{ symbol: 'EURUSD', side: 'LONG', riskPct: 1 }, { symbol: 'GBPUSD', side: 'LONG', riskPct: 1 }], () => 0);
    expect(e.currencies.find((c) => c.currency === 'USD')?.netRiskPct).toBe(-2);
  });
});
