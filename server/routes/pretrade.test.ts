import { describe, it, expect } from 'vitest';
import { buildChecklist } from './pretradeRoutes';

const now = Date.parse('2026-11-23T10:00:00Z');
const ev = (asset: string, mins: number) => ({ asset, title: 'NFP', importance: 'HIGH', scheduledAt: new Date(now + mins * 60000).toISOString() });
const snap = (upcoming: any[] = [], pairs: any[] = []) => ({ upcoming, pairs });
const by = (r: any, id: string) => r.checks.find((c: any) => c.id === id);
const buy = { symbol: 'EURUSD', side: 'LONG' as const, riskPct: 1 };

describe('pre-trade checklist', () => {
  it('fails on imminent high-impact news for either leg', () => {
    expect(by(buildChecklist(buy, [], { corr: null, snap: snap([ev('USD', 30)]), now }), 'news').status).toBe('fail');
    expect(by(buildChecklist(buy, [], { corr: null, snap: snap([ev('EUR', 180)]), now }), 'news').status).toBe('warn');
    expect(by(buildChecklist(buy, [], { corr: null, snap: snap([ev('JPY', 30), ev('USD', 600)]), now }), 'news').status).toBe('pass');
  });
  it('skips news and fundamentals when data is missing instead of guessing', () => {
    const r = buildChecklist(buy, [], { corr: null, snap: null, now });
    expect(by(r, 'news').status).toBe('skip'); expect(by(r, 'fund').status).toBe('skip');
  });
  it('warns when the trade duplicates an open one', () => {
    const corr = (a: string, b: string) => (a === b ? 1 : 0.85);
    const r = buildChecklist(buy, [{ symbol: 'GBPUSD', side: 'LONG', riskPct: 1 }], { corr, snap: snap(), now });
    expect(by(r, 'corr').status).toBe('warn');
    expect(buildChecklist({ ...buy, side: 'SHORT' }, [{ symbol: 'GBPUSD', side: 'LONG', riskPct: 1 }], { corr, snap: snap(), now }).checks.find((c) => c.id === 'corr')!.status).toBe('pass');
  });
  it('flags oversized risk', () => {
    expect(by(buildChecklist({ ...buy, riskPct: 4 }, [], { corr: null, snap: snap(), now }), 'risk').status).toBe('fail');
    expect(by(buildChecklist({ ...buy, riskPct: 2.5 }, [], { corr: null, snap: snap(), now }), 'risk').status).toBe('warn');
  });
  it('compares direction with fundamentals and gives a verdict', () => {
    const s = snap([], [{ symbol: 'EURUSD', score: -40, confidence: 70 }]);
    const r = buildChecklist(buy, [], { corr: null, snap: s, now });
    expect(by(r, 'fund').status).toBe('warn'); expect(r.verdict).toBe('caution');
    expect(buildChecklist({ ...buy, side: 'SHORT' }, [], { corr: null, snap: s, now }).verdict).toBe('clear');
    expect(buildChecklist(buy, [], { corr: null, snap: snap([ev('USD', 10)]), now }).verdict).toBe('stop');
  });
});
