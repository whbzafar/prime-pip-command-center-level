import { describe, it, expect } from 'vitest';
import { todayStats, disciplineChecks, DEFAULT_LIMITS } from './dailyGuard';

const now = Date.parse('2026-11-22T15:00:00Z'); // 20:00 PKT, 22 Nov
const t = (o: any) => ({ status: 'CLOSED', date: '2026-11-22', time: '10:00', profitLoss: 0, ...o }) as any;
const st = (r: any[], id: string) => r.find((c) => c.id === id).status;

describe('daily discipline guard', () => {
  it('only counts today in Pakistan time', () => {
    const late = Date.parse('2026-11-22T20:00:00Z'); // 01:00 PKT on 23 Nov
    expect(todayStats([t({ profitLoss: -50 })], 1000, late).trades).toBe(0);
    expect(todayStats([t({ profitLoss: -50 })], 1000, now).trades).toBe(1);
  });
  it('fails at the daily loss limit and warns near it', () => {
    expect(st(disciplineChecks([t({ profitLoss: -30 })], 1000, DEFAULT_LIMITS, now), 'dloss')).toBe('fail');
    expect(st(disciplineChecks([t({ profitLoss: -22 })], 1000, DEFAULT_LIMITS, now), 'dloss')).toBe('warn');
    expect(st(disciplineChecks([t({ profitLoss: -5 })], 1000, DEFAULT_LIMITS, now), 'dloss')).toBe('pass');
  });
  it('skips the loss check when balance is unknown', () => {
    expect(st(disciplineChecks([], 0, DEFAULT_LIMITS, now), 'dloss')).toBe('skip');
  });
  it('counts a trailing loss streak and trade count', () => {
    const rows = [t({ time: '08:00', profitLoss: 20 }), t({ time: '09:00', profitLoss: -5 }), t({ time: '10:00', profitLoss: -5 }), t({ time: '11:00', status: 'OPEN' })];
    const s = todayStats(rows, 1000, now);
    expect(s.trades).toBe(4); expect(s.lossStreak).toBe(2);
    expect(st(disciplineChecks(rows, 1000, DEFAULT_LIMITS, now), 'dstreak')).toBe('warn');
  });
});
