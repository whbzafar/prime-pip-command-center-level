import { describe, it, expect } from 'vitest';
import { stripStatsTables } from './pineRunner';
const tbl = (...texts: string[]) => ({ cells: [texts.map((text) => ({ text }))] });
describe('stripStatsTables', () => {
  it('drops the SBT model table and the win-rate box, keeps the status box', () => {
    const m = stripStatsTables({ tables: [tbl('Trend shift', '-'), tbl('Model', 'Bull', 'Bear', 'All'), tbl('WIN RATE', '34.1%'), tbl('Total R', '-0.52')] });
    expect(m.tables).toHaveLength(1);
    expect(m.tables[0].cells[0][0].text).toBe('Trend shift');
  });
  it('passes models without tables through', () => expect(stripStatsTables({ a: 1 })).toEqual({ a: 1 }));
});
