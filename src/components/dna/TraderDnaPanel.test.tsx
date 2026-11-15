import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { TraderDnaPanel } from './TraderDnaPanel';

const T = (o: any) => ({ id: Math.random().toString(), status: 'CLOSED', direction: 'BUY', session: 'LONDON', timeframe: 'M15', riskAmount: 10, riskPercent: 1, preEmotion: 'CALM', ruleViolation: 'NONE', grade: 'A', ...o });
describe('TraderDnaPanel', () => {
  it('renders edges, leaks, habits and rules from real trades', () => {
    const trades: any[] = [];
    for (let d = 1; d <= 12; d++) {
      const date = `2026-10-${String(d).padStart(2, '0')}`;
      trades.push(T({ date, time: '13:00', instrument: 'XAUUSD', profitLoss: 20, rMultiple: 2, result: 'WIN' }));
      trades.push(T({ date, time: '19:00', instrument: 'GBPJPY', session: 'NEW_YORK', profitLoss: -10, rMultiple: -1, result: 'LOSS' }));
      trades.push(T({ date, time: '19:30', instrument: 'GBPJPY', session: 'NEW_YORK', profitLoss: -10, rMultiple: -1, result: 'LOSS', preEmotion: 'ANGRY', ruleViolation: 'MAJOR' }));
    }
    const html = renderToString(<TraderDnaPanel trades={trades} />);
    expect(html).toContain('Where your edge is');
    expect(html).toContain('XAUUSD');
    expect(html).toContain('Revenge trading');
    expect(html).toContain('60 minutes');
  });
});
