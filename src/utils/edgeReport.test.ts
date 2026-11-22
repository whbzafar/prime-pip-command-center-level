import { describe, it, expect } from 'vitest';
import { buildEdgeReport, MIN_N } from './edgeReport';

let id = 0;
const t = (o: any) => ({ id: String(++id), status: 'CLOSED', date: '2026-10-05', time: '10:00', instrument: 'EURUSD', direction: 'LONG', session: 'LONDON', ruleViolation: 'NONE', profitLoss: 0, rMultiple: 0, ...o }) as any;

describe('personal edge report', () => {
  it('ignores open trades and reports totals', () => {
    const r = buildEdgeReport([t({ profitLoss: 100, rMultiple: 1 }), t({ profitLoss: -50, rMultiple: -0.5 }), t({ status: 'OPEN', profitLoss: 999, rMultiple: 9 })]);
    expect(r.closed).toBe(2); expect(r.totalR).toBe(0.5); expect(r.profitFactor).toBe(2); expect(r.enough).toBe(false);
  });
  it('never calls a small sample an edge or a leak', () => {
    const few = Array.from({ length: MIN_N - 1 }, () => t({ instrument: 'XAUUSD', profitLoss: 100, rMultiple: 2 })).concat(Array.from({ length: MIN_N - 1 }, () => t({ instrument: 'GBPUSD', profitLoss: -100, rMultiple: -1 })));
    expect(buildEdgeReport(few).findings.length).toBe(0);
  });
  it('finds the instrument that makes money and the one that loses', () => {
    const many = [...Array.from({ length: 8 }, () => t({ instrument: 'XAUUSD', profitLoss: 100, rMultiple: 1.5 })), ...Array.from({ length: 8 }, () => t({ instrument: 'GBPJPY', profitLoss: -100, rMultiple: -1 }))];
    const f = buildEdgeReport(many).findings;
    expect(f.some((x) => x.kind === 'edge' && x.text.includes('XAUUSD'))).toBe(true);
    expect(f.some((x) => x.kind === 'leak' && x.text.includes('GBPJPY'))).toBe(true);
  });
  it('measures the cost of rule-breaking', () => {
    const rows = [...Array.from({ length: 7 }, () => t({ ruleViolation: 'NONE', profitLoss: 50, rMultiple: 1 })), ...Array.from({ length: 7 }, () => t({ ruleViolation: 'MAJOR', profitLoss: -50, rMultiple: -1 }))];
    const f = buildEdgeReport(rows).findings.find((x) => x.dimension === 'Rule discipline');
    expect(f?.kind).toBe('leak'); expect(f?.text).toContain('-1R versus 1R');
  });
  it('flags trading right after a loss', () => {
    const rows: any[] = [];
    for (let d = 1; d <= 8; d++) { const date = `2026-10-${String(d).padStart(2, '0')}`; rows.push(t({ date, time: '09:00', profitLoss: -50, rMultiple: -1 }), t({ date, time: '09:30', profitLoss: -50, rMultiple: -1 }), t({ date, time: '15:00', profitLoss: 50, rMultiple: 1 })); }
    const f = buildEdgeReport(rows).findings.find((x) => x.dimension === 'Right after a loss');
    expect(f?.kind).toBe('leak');
  });
});
