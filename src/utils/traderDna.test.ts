import { describe, expect, it } from 'vitest';
import { analyseDna, liveWarnings } from './traderDna';

const T = (o: any) => ({ id: Math.random().toString(), tradeNumber: 1, broker: 'x', accountType: 'DEMO', accountSize: 1000, timeframe: 'M15', session: 'LONDON', entryPrice: 1, stopLoss: 1, takeProfit: 1, exitPrice: 1, lotSize: 0.1, riskAmount: 10, riskPercent: 1, pips: 0, strategy: 'SBT', htfTrend: 'BULLISH', ltfTrend: 'BULLISH', marketStructure: 'BOS', alignmentScore: 3, preEmotion: 'CALM', postPsychology: 'X', ruleViolation: 'NONE', violatedRules: [], mistakeReason: 'None (Flawless)', grade: 'A', screenshots: {}, status: 'CLOSED', direction: 'BUY', instrument: 'XAUUSD', ...o });

describe('trader DNA', () => {
  it('finds the edge, the leak and the revenge habit from real trades', () => {
    const trades: any[] = [];
    for (let d = 1; d <= 12; d++) {
      const date = `2026-10-${String(d).padStart(2, '0')}`;
      trades.push(T({ date, time: '13:00', instrument: 'XAUUSD', session: 'LONDON', profitLoss: 20, rMultiple: 2, result: 'WIN' }));
      trades.push(T({ date, time: '19:00', instrument: 'GBPJPY', session: 'NEW_YORK', profitLoss: -10, rMultiple: -1, result: 'LOSS' }));
      trades.push(T({ date, time: '19:30', instrument: 'GBPJPY', session: 'NEW_YORK', profitLoss: -10, rMultiple: -1, result: 'LOSS', preEmotion: 'ANGRY', ruleViolation: 'MAJOR' }));
    }
    const r = analyseDna(trades as any);
    expect(r.closed).toBe(36);
    expect(r.edges[0].expR).toBe(2);
    expect(r.leaks.some((l) => l.key === 'GBPJPY')).toBe(true);
    expect(r.habits.map((h) => h.id)).toEqual(expect.arrayContaining(['revenge', 'rules', 'emotion']));
    expect(r.rules.join(' ')).toMatch(/60 minutes/);
  });
  it('warns right after a loss and after two losses today', () => {
    const now = Date.parse('2026-11-15T15:00:00Z'); // 20:00 PKT
    const trades: any[] = [
      T({ date: '2026-11-15', time: '18:00', profitLoss: -10, rMultiple: -1, result: 'LOSS' }),
      T({ date: '2026-11-15', time: '19:40', profitLoss: -10, rMultiple: -1, result: 'LOSS' }),
    ];
    const w = liveWarnings(trades as any, analyseDna(trades as any), now);
    expect(w.map((x) => x.text).join(' ')).toMatch(/20 min ago/);
    expect(w.map((x) => x.text).join(' ')).toMatch(/2 losses today/);
  });
  it('handles an empty journal', () => { const r = analyseDna([]); expect(r.enoughData).toBe(false); expect(r.habits).toEqual([]); });
});
