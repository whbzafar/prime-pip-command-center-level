import { describe, expect, it } from 'vitest';
import { legsOf } from './ExposureGuard';
describe('exposure legs', () => {
  it('splits FX, gold and indices into currency/asset legs', () => {
    expect(legsOf('OANDA:EURUSD', 'BUY')).toEqual([['EUR', 1], ['USD', -1]]);
    expect(legsOf('XAUUSD', 'SELL')).toEqual([['XAU', -1], ['USD', 1]]);
    expect(legsOf('NAS100', 'BUY')).toEqual([['Stocks', 1]]);
  });
});
