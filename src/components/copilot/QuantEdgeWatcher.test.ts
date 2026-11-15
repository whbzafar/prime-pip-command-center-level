import { describe, expect, it } from 'vitest';
import { diffSignals } from './QuantEdgeWatcher';
describe('quant edge watcher', () => {
  it('alerts on a new signal and on a closed trade, not on first sight or unchanged state', () => {
    expect(diffSignals({}, [{ symbol: 'XAUUSD', status: 'BUY_NEXT_OPEN', watch: '' }])).toHaveLength(0);
    expect(diffSignals({ XAUUSD: 'FLAT' }, [{ symbol: 'XAUUSD', status: 'FLAT', watch: '' }])).toHaveLength(0);
    expect(diffSignals({ XAUUSD: 'FLAT' }, [{ symbol: 'XAUUSD', status: 'BUY_NEXT_OPEN', watch: 'w' }])[0].text).toMatch(/BUY signal/);
    expect(diffSignals({ XAUUSD: 'BUY_NEXT_OPEN' }, [{ symbol: 'XAUUSD', status: 'LONG', watch: '' }])).toHaveLength(0);
    expect(diffSignals({ XAUUSD: 'FLAT' }, [{ symbol: 'XAUUSD', status: 'LONG', watch: '' }])[0].text).toMatch(/entered a BUY/);
    expect(diffSignals({ XAUUSD: 'LONG' }, [{ symbol: 'XAUUSD', status: 'FLAT', watch: '' }])[0].text).toMatch(/closed/);
  });
});
