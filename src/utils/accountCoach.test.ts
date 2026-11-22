import { describe, it, expect } from 'vitest';
import { coachFor, demoReadiness, type FundedFacts } from './accountCoach';

const f = (o: Partial<FundedFacts> = {}): FundedFacts => ({ phaseLabel: 'Phase 1', remainingDaily: 5000, remainingOverall: 10000, dailyLimit: 5000, overallLimit: 10000, profitRemaining: 8000, targetDollars: 10000, recommendedRiskDollars: 500, recommendedRiskPct: 0.5, consecutiveLosses: 0, tradesToday: 0, maxDailyTrades: 0, locked: false, targetPassed: false, ...o });
const base = { balance: 100000, trades: [] as any[] };
let n = 0; const tr = (o: any) => ({ id: String(++n), status: 'CLOSED', date: '2026-10-01', profitLoss: 0, rMultiple: 0, riskAmount: 500, ruleViolation: 'NONE', ...o }) as any;

describe('account coach — funded', () => {
  it('stops a trade that would breach a limit', () => {
    const c = coachFor({ ...base, category: 'FUNDED', riskPct: 6, riskAmount: 6000, funded: f() });
    expect(c.tone).toBe('stop'); expect(c.lines[0]).toContain('breach');
  });
  it('shows how many losses you can afford and the target pace', () => {
    const c = coachFor({ ...base, category: 'FUNDED', riskPct: 0.5, riskAmount: 500, funded: f() });
    expect(c.tone).toBe('good'); expect(c.lines[0]).toContain('10 losing trades'); expect(c.lines.join(' ')).toContain('8 winning trades');
  });
  it('warns when one loss burns over half of the daily room, and when streaking', () => {
    expect(coachFor({ ...base, category: 'FUNDED', riskPct: 3, riskAmount: 3000, funded: f() }).tone).toBe('warn');
    expect(coachFor({ ...base, category: 'FUNDED', riskPct: 0.5, riskAmount: 500, funded: f({ consecutiveLosses: 3 }) }).tone).toBe('warn');
  });
  it('locked, target-passed and daily-trade-limit states', () => {
    expect(coachFor({ ...base, category: 'FUNDED', riskPct: 1, riskAmount: 100, funded: f({ locked: true }) }).tone).toBe('stop');
    expect(coachFor({ ...base, category: 'FUNDED', riskPct: 1, riskAmount: 100, funded: f({ targetPassed: true }) }).headline).toContain('Target reached');
    expect(coachFor({ ...base, category: 'FUNDED', riskPct: 0.5, riskAmount: 500, funded: f({ tradesToday: 3, maxDailyTrades: 3 }) }).tone).toBe('stop');
  });
});

describe('account coach — demo & personal', () => {
  it('demo asks for real-money habits and checks readiness from the journal', () => {
    expect(coachFor({ ...base, category: 'DEMO', riskPct: 5, riskAmount: 5000 }).tone).toBe('stop');
    const good = Array.from({ length: 30 }, () => tr({ rMultiple: 0.5, profitLoss: 250 }));
    expect(demoReadiness(good, 100000).every((c) => c.ok)).toBe(true);
    expect(demoReadiness([tr({})], 100000).some((c) => !c.ok)).toBe(true);
  });
  it('personal: 1% is fine, 4% is stopped', () => {
    expect(coachFor({ ...base, category: 'PERSONAL', riskPct: 0.8, riskAmount: 800 }).tone).toBe('good');
    expect(coachFor({ ...base, category: 'PERSONAL', riskPct: 4, riskAmount: 4000 }).tone).toBe('stop');
    expect(coachFor({ ...base, category: 'PERSONAL', riskPct: 1.5, riskAmount: 1500 }).tone).toBe('warn');
  });
  it('asks for input before guiding', () => { expect(coachFor({ ...base, category: 'PERSONAL', riskPct: 0, riskAmount: 0 }).lines).toEqual([]); });
});
