import { describe, expect, it, vi } from 'vitest';

const fxssi = {
  formed: 1794132008,
  pairs: {
    EURUSD: { myfxbook: '60.00', dukscopy: '64.00', average: '62.00' },
    USDJPY: { myfxbook: '30.00', average: '30.00' },
    GBPUSD: { myfxbook: '55.00', average: '55.00' },
    AUDUSD: { myfxbook: '70.00', average: '70.00' },
    USDCAD: { myfxbook: '50.00', average: '50.00' },
    USDCHF: { myfxbook: '40.00', average: '40.00' },
    NZDUSD: { myfxbook: '65.00', average: '65.00' },
    XAUUSD: { myfxbook: '58.00', average: '58.00' },
    SP500: { myfxbook: '72.00', average: '72.00' },
    XTIUSD: { myfxbook: '80.00', average: '80.00' },
  },
  pair_weights: { EURUSD: 9000, USDJPY: 2000, GBPUSD: 5000, AUDUSD: 3000, USDCAD: 2000, USDCHF: 900, NZDUSD: 800 },
};

vi.stubGlobal('fetch', vi.fn(async (url: string) => {
  const body = url.includes('fxssi') ? fxssi
    : url.includes('okx') ? { code: '0', data: [['1', '3']] }            // ratio 3 → 75 % long
    : url.includes('gateio') ? [{ lsr_account: 1 }]                    // 50 %
    : url.includes('bitget') ? { data: [{ ts: '1', longAccountRatio: '0.70' }] } // 70 %
    : {};
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}));

describe('live sentiment engine', async () => {
  const { getSentiment, sentimentFor } = await import('./sources/sentiment.js');
  const snap = await getSentiment(0);

  it('maps measured instruments with per-broker breakdown', () => {
    const eu = sentimentFor(snap, 'EURUSD')!;
    expect(eu.method).toBe('measured');
    expect(eu.longPct).toBe(62);
    expect(eu.sources.map((s) => s.name)).toEqual(['MyFxBook', 'Dukascopy']);
    expect(eu.contrarian).toBe('BEARISH');
    expect(sentimentFor(snap, 'US500')!.asset).toBe('INDICES');
    expect(sentimentFor(snap, 'USOIL')!.longPct).toBe(80);
    expect(sentimentFor(snap, 'XAUUSD')!.contrarian).toBe('NEUTRAL');
  });

  it('covers every one of the 28 G8 crosses (measured or derived)', () => {
    const fx = snap.rows.filter((r) => r.asset === 'FOREX');
    expect(fx.length).toBe(28);
    const cj = sentimentFor(snap, 'CADJPY')!;
    expect(cj.method).toBe('derived');
    const c = Object.fromEntries(snap.currencies.map((x) => [x.currency, x.net]));
    expect(cj.longPct).toBeCloseTo(50 + 50 * ((c.CAD - c.JPY) / 2), 0);
  });

  it('averages crypto exchanges per USDT pair', () => {
    const btc = sentimentFor(snap, 'BTCUSDT')!;
    expect(btc.sources.length).toBe(3);
    expect(btc.longPct).toBeCloseTo((75 + 50 + 70) / 3, 1);
  });
});
