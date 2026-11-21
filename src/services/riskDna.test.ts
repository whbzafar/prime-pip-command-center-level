import { describe, expect, it } from 'vitest';
import { computeRiskDna, karachiDay } from './riskDna';

const NOW = Date.parse('2026-11-21T06:00:00Z'); // 11:00 Karachi
const day = karachiDay(NOW);
const t = (time: string, pl: number, r: number, model = 'A', extra: any = {}): any => ({ id: time + model, date: day, time, status: 'CLOSED', result: pl > 0 ? 'WIN' : pl < 0 ? 'LOSS' : 'BREAKEVEN', profitLoss: pl, rMultiple: r, sbtModel: model, ...extra });
const acct = { currentEquity: 10_000, maxDailyLossPercent: 3, maxDailyTrades: 5, targetRiskPerTradePercent: 1 };

describe('riskDna', () => {
  it('no trades: full risk, no locks', () => { const d = computeRiskDna([], acct, NOW); expect(d.allowedRiskPct).toBe(1); expect(d.locked).toBe(false); });
  it('two fast losses halve risk twice and cool down', () => {
    const d = computeRiskDna([t('10:30', -50, -1), t('10:50', -50, -1)], acct, NOW);
    expect(d.lossStreak).toBe(2); expect(d.allowedRiskPct).toBe(0.25);
    expect(d.locks.some((l) => l.code === 'LOSS_STREAK' && !l.hard)).toBe(true); expect(d.lockedUntil).not.toBeNull();
  });
  it('cooldown expires after 20 minutes', () => { const d = computeRiskDna([t('09:00', -50, -1), t('09:10', -50, -1)], acct, NOW); expect(d.locks.find((l) => l.code === 'LOSS_STREAK')).toBeUndefined(); });
  it('daily loss limit hard-locks and freezes capsules', () => {
    const d = computeRiskDna([t('08:00', -450, -4.5, 'A'), t('08:30', 100, 1, 'A')], acct, NOW); expect(d.hardLocked).toBe(true); expect(d.allowedRiskPct).toBe(0);
  });
  it('trade cap hard-locks', () => { const d = computeRiskDna([1, 2, 3, 4, 5].map((i) => t(`0${i}:00`, 10, 1)), acct, NOW); expect(d.locks[0].code).toBe('DAILY_TRADES'); });
  it('capsules: edge strategy active, losing strategy quarantined, thin one on probation', () => {
    const past = (i: number, pl: number, r: number, m: string) => ({ ...t('10:00', pl, r, m), id: `${m}${i}`, date: '2026-11-10' });
    const trades = [...Array.from({ length: 6 }, (_, i) => past(i, 50, 1.5, 'WIN')), ...Array.from({ length: 6 }, (_, i) => past(i, -50, -1, 'LOSE')), past(0, 20, 1, 'NEW')];
    const d = computeRiskDna(trades, acct, NOW);
    const by = Object.fromEntries(d.capsules.map((c) => [c.id, c]));
    expect(by.WIN.state).toBe('active'); expect(by.LOSE.state).toBe('quarantined'); expect(by.LOSE.riskPct).toBe(0); expect(by.NEW.state).toBe('probation');
    expect(d.capsules.reduce((s, c) => s + c.sharePct, 0)).toBeGreaterThanOrEqual(98);
  });
  it('biometric stress halves risk and soft-locks', () => {
    const d = computeRiskDna([], acct, NOW, { hr: 100, rmssd: 30, at: NOW }, { hr: 65, rmssd: 55 });
    expect(d.locks[0].code).toBe('BIOMETRIC'); expect(d.allowedRiskPct).toBe(0.5); expect(d.hardLocked).toBe(false);
  });
  it('stale biometric sample is ignored', () => { const d = computeRiskDna([], acct, NOW, { hr: 120, rmssd: 10, at: NOW - 120_000 }, { hr: 65, rmssd: 55 }); expect(d.locked).toBe(false); });
});
