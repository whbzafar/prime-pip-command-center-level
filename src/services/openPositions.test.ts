import { describe, it, expect } from 'vitest';
import { setOpenTrades, alertContext } from './openPositions';

const tr = (o: any) => ({ status: 'OPEN', instrument: 'EURUSD', direction: 'BUY', ...o }) as any;
describe('alert context for open trades', () => {
  it('is null when you hold nothing in that pair', () => { setOpenTrades([tr({ instrument: 'GBPUSD' })]); expect(alertContext('EURUSD', 1, 'EUR/USD')).toBeNull(); });
  it('flags a same-direction alert as not a new entry', () => { setOpenTrades([tr({})]); expect(alertContext('EURUSD', 1, 'EUR/USD')?.kind).toBe('same'); });
  it('flags an opposite alert', () => { setOpenTrades([tr({})]); expect(alertContext('EURUSD', -1, 'EUR/USD')?.kind).toBe('opposite'); });
  it('ignores closed trades and matches USDT crypto symbols', () => {
    setOpenTrades([tr({ status: 'CLOSED' })]); expect(alertContext('EURUSD', 1, 'x')).toBeNull();
    setOpenTrades([tr({ instrument: 'BTCUSD' })]); expect(alertContext('BTCUSDT', 1, 'BTC')?.kind).toBe('same');
  });
});
