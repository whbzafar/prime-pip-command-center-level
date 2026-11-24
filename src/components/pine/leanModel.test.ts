import { describe, it, expect } from 'vitest';
import { leanModel } from './remoteEngine';
describe('leanModel', () => {
  it('drops SBT 6, entry/TP/SL/exit labels and statistics tables, keeps structure labels', () => {
    const m = leanModel({
      labels: [{ text: 'SELL L1 | RR 1:2 | 0 lot' }, { text: 'TP 0.2R' }, { text: 'Exit' }, { text: 'SBT 6' }, { text: 'BOS' }, { text: 'L2 / SBT 4' }],
      tables: [{ cells: [[{ text: 'Trend shift' }]] }, { cells: [[{ text: 'WIN RATE' }]] }], trades: [{ a: 1 }],
    });
    expect(m.labels.map((l: any) => l.text)).toEqual(['BOS', 'L2 / SBT 4']);
    expect(m.tables).toHaveLength(1);
    expect(m.trades).toEqual([]);
  });
});
