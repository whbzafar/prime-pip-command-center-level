import { describe, it, expect } from 'vitest';
import { oandaInstrument, oandaBefore } from './oanda';
describe('oanda', () => {
  it('maps instruments', () => { expect(oandaInstrument('eurusd')).toBe('EUR_USD'); expect(oandaInstrument('xauusd')).toBe('XAU_USD'); expect(oandaInstrument('lightcmdusd')).toBe('WTICO_USD'); expect(oandaInstrument('ausidxaud')).toBeNull(); });
  it('falls back (null) when not configured', async () => expect(await oandaBefore('eurusd', 'h1', Date.now(), 5)).toBeNull());
});
