import { describe, it, expect } from 'vitest';
import { detectPatterns, fearLadder, readinessScore, readinessAdvice, readinessVsResults } from './mindEngine';

let n = 0;
const t = (o: any) => ({ id: String(++n), status: 'CLOSED', date: '2026-10-05', time: '10:00', profitLoss: 0, rMultiple: 0, riskAmount: 10, ruleViolation: 'NONE', ...o }) as any;

describe('mind engine', () => {
  it('says nothing on a tiny journal', () => { expect(detectPatterns([t({}), t({})])).toEqual([]); });
  it('detects quick re-entry after losses with evidence', () => {
    const rows: any[] = [];
    for (let d = 1; d <= 5; d++) { const date = `2026-10-0${d}`; rows.push(t({ date, time: '09:00', profitLoss: -10, rMultiple: -1 }), t({ date, time: '09:20', profitLoss: -10, rMultiple: -1 }), t({ date, time: '14:00', profitLoss: 10, rMultiple: 1 })); }
    const p = detectPatterns(rows).find((x) => x.id === 'revenge');
    expect(p?.severity).toBe('high'); expect(p?.evidence).toContain('5 trades');
  });
  it('flags winners smaller than losers only with enough trades', () => {
    const rows = [...Array.from({ length: 6 }, () => t({ profitLoss: 5, rMultiple: 0.5 })), ...Array.from({ length: 6 }, () => t({ profitLoss: -10, rMultiple: -1 }))];
    expect(detectPatterns(rows).some((x) => x.id === 'cutwinners')).toBe(true);
    expect(detectPatterns(rows.slice(3, 9)).some((x) => x.id === 'cutwinners')).toBe(false);
  });
  it('fear ladder: starts at the lowest rung and unlocks only with clean trades', () => {
    expect(fearLadder([], 1000).current).toBe(0);
    const small = (clean: boolean, i: number) => t({ riskAmount: 2.5, date: `2026-10-${String(i + 1).padStart(2, '0')}`, ruleViolation: clean ? 'NONE' : 'MAJOR' });
    const good = Array.from({ length: 10 }, (_, i) => small(true, i));
    expect(fearLadder(good, 1000).current).toBe(1);
    const sloppy = Array.from({ length: 10 }, (_, i) => small(i < 6, i));
    expect(fearLadder(sloppy, 1000).current).toBe(0);
  });
  it('counts trades above the allowed rung', () => {
    const rows = [t({ riskAmount: 10 }), t({ riskAmount: 2.5 })];
    expect(fearLadder(rows, 1000).oversized).toBe(1);
  });
  it('is unavailable without a balance', () => { expect(fearLadder([t({})], 0).available).toBe(false); });
  it('scores readiness and advises', () => {
    expect(readinessScore({ sleep: 5, stress: 1, mood: 5, focus: 5 })).toBe(100);
    expect(readinessAdvice(40).level).toBe('rest'); expect(readinessAdvice(60).level).toBe('careful'); expect(readinessAdvice(85).level).toBe('go');
  });
  it('compares good-readiness days with the rest only with enough days', () => {
    const ck: any = {}, rows: any[] = [];
    for (let d = 1; d <= 10; d++) { const date = `2026-10-${String(d).padStart(2, '0')}`; const good = d <= 5; ck[date] = good ? { sleep: 5, stress: 1, mood: 5, focus: 5 } : { sleep: 1, stress: 5, mood: 1, focus: 2 }; rows.push(t({ date, rMultiple: good ? 1 : -1, profitLoss: good ? 1 : -1 })); }
    const r = readinessVsResults(ck, rows);
    expect(r?.highAvgR).toBe(1); expect(r?.lowAvgR).toBe(-1);
    expect(readinessVsResults(ck, rows.slice(0, 6))).toBeNull();
  });
});
