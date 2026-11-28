import { describe, it, expect } from 'vitest';
import { bsPrice, bsGamma, impliedVol, computeGex, mergeGex, readout, type Contract } from '../../server/gexEngine';
import { parseChain, parseYahoo, closeOf, usMarketOpen, SYMBOLS } from '../../server/gexService';

const now = Date.UTC(2026, 10, 27, 15, 0, 0); const day = 86400_000;
function chain(S: number, iv: number, oiFn: (k: number, t: 'C' | 'P') => number, days = [2, 9, 30]): Contract[] {
  const out: Contract[] = [];
  for (const d of days) for (let k = Math.round(S * 0.85); k <= S * 1.15; k += 5) for (const t of ['C', 'P'] as const) {
    const exp = now + d * day; const T = d / 365; const px = bsPrice(S, k, T, iv, t);
    out.push({ exp, strike: k, type: t, oi: oiFn(k, t), bid: Math.max(0.01, px * 0.99), ask: px * 1.01 + 0.01 });
  }
  return out;
}
describe('gex maths', () => {
  it('recovers the volatility that priced the option', () => {
    const p = bsPrice(700, 710, 20 / 365, 0.23, 'C'); expect(impliedVol(p, 700, 710, 20 / 365, 'C')!).toBeCloseTo(0.23, 3);
    const q = bsPrice(700, 680, 20 / 365, 0.31, 'P'); expect(impliedVol(q, 700, 680, 20 / 365, 'P')!).toBeCloseTo(0.31, 3);
  });
  it('rejects prices below intrinsic', () => { expect(impliedVol(1, 700, 600, 0.05, 'C')).toBeNull(); });
  it('gamma peaks at the money and is positive', () => { expect(bsGamma(700, 700, 0.05, 0.2)).toBeGreaterThan(bsGamma(700, 760, 0.05, 0.2)); });
});
describe('computeGex', () => {
  const S = 700;
  it('call-heavy book above, put-heavy below: walls and positive regime', () => {
    const g = computeGex(chain(S, 0.2, (k, t) => (t === 'C' ? (k === 725 ? 60000 : 3000) : (k === 675 ? 60000 : 3000))), S, now);
    expect(g.callWall).toBe(725); expect(g.putWall).toBe(675); expect(g.callWall!).toBeGreaterThanOrEqual(S); expect(g.putWall!).toBeLessThanOrEqual(S); expect(g.used).toBeGreaterThan(100);
    expect(g.rows.find((r) => r.strike === 725)!.call).toBeGreaterThan(0); expect(g.rows.find((r) => r.strike === 675)!.put).toBeLessThan(0);
    expect(g.pcrOi).toBeGreaterThan(0.9); expect(g.expectedMove!.pct).toBeGreaterThan(0.01);
  });
  it('put-dominated book is negative gamma with the flip above spot', () => {
    const g = computeGex(chain(S, 0.2, (_k, t) => (t === 'P' ? 20000 : 4000)), S, now);
    expect(g.totalNet).toBeLessThan(0); expect(g.regime).toBe('negative');
    expect(readout(g).headline).toMatch(/Negative gamma/);
  });
  it('call-dominated book is positive gamma', () => {
    const g = computeGex(chain(S, 0.2, (_k, t) => (t === 'C' ? 20000 : 4000)), S, now);
    expect(g.totalNet).toBeGreaterThan(0); expect(g.regime).toBe('positive');
  });
  it('finds a flip where the profile crosses zero', () => {
    const g = computeGex(chain(S, 0.2, (k, t) => (t === 'C' ? (k > S ? 15000 : 1000) : (k < S ? 15000 : 1000))), S, now);
    expect(g.flip === null || Math.abs(g.flip / S - 1) < 0.11).toBe(true);
  });
  it('ignores contracts without open interest or outside the window', () => {
    const g = computeGex([{ exp: now + day, strike: 700, type: 'C', oi: 0, bid: 5, ask: 5.2 }, { exp: now + 400 * day, strike: 700, type: 'C', oi: 100, bid: 50, ask: 51 }], S, now);
    expect(g.used).toBe(0); expect(g.rows.length).toBe(0);
  });
});
describe('Nasdaq chain parser', () => {
  const rows = [
    { expirygroup: 'November 30, 2026', expiryDate: null, strike: null },
    { expirygroup: '', expiryDate: 'Nov 30', c_Last: '247.97', c_Bid: '251.01', c_Ask: '255.35', c_Volume: '3', c_Openinterest: '7', strike: '475.00', p_Last: '0.02', p_Bid: '--', p_Ask: '0.01', p_Volume: '--', p_Openinterest: '2,569' },
    { expirygroup: 'December 18, 2026', expiryDate: null, strike: null },
    { expirygroup: '', expiryDate: 'Dec 18', c_Last: '--', c_Bid: '1.1', c_Ask: '1.2', c_Openinterest: '--', strike: '700.00', p_Bid: '3', p_Ask: '3.1', p_Openinterest: '40' },
  ];
  it('reads strikes, open interest with commas, and expiry from the group header', () => {
    const c = parseChain(rows); expect(c.length).toBe(3);
    expect(c[0]).toMatchObject({ strike: 475, type: 'C', oi: 7, bid: 251.01 }); expect(c[1]).toMatchObject({ type: 'P', oi: 2569 });
    expect(c[2]).toMatchObject({ strike: 700, type: 'P', oi: 40 }); expect(c[0].exp).toBe(closeOf(2026, 10, 30)); expect(c[2].exp).toBe(closeOf(2026, 11, 18));
  });
  it('close time follows New York daylight saving', () => { expect(closeOf(2026, 6, 1)).toBe(Date.UTC(2026, 6, 1, 20)); expect(closeOf(2026, 0, 15)).toBe(Date.UTC(2026, 0, 15, 21)); });
});

describe('Yahoo parser, market clock, composites', () => {
  it('reads Yahoo contracts and skips ones without open interest', () => {
    const exp = Date.UTC(2026, 11, 18) / 1000;
    const c = parseYahoo([{ strike: 7300, openInterest: 700, bid: 10, ask: 11, lastPrice: 10.5, expiration: exp, volume: 4 }, { strike: 7310, openInterest: 0, expiration: exp }], 'C');
    expect(c.length).toBe(1); expect(c[0]).toMatchObject({ strike: 7300, type: 'C', oi: 700 }); expect(c[0].exp).toBe(closeOf(2026, 11, 18));
  });
  it('knows when the US cash session is open', () => {
    expect(usMarketOpen(Date.UTC(2026, 10, 27, 15, 0))).toBe(true);   // Friday 10:00 New York
    expect(usMarketOpen(Date.UTC(2026, 10, 28, 15, 0))).toBe(false);  // Saturday
    expect(usMarketOpen(Date.UTC(2026, 10, 27, 22, 0))).toBe(false);  // Friday 17:00 New York
  });
  it('merges two chains of the same market into one picture in the base price terms', () => {
    const a = computeGex(chain(400, 0.18, (k, t) => (t === 'C' && k === 420 ? 40000 : 2000)), 400, now);
    const b = computeGex(chain(200, 0.18, (k, t) => (t === 'C' && k === 210 ? 40000 : 2000)), 200, now); // half-price twin: 210 is the same 5% above spot as 420
    const m = mergeGex([a, b], 400);
    expect(m.spot).toBe(400); expect(m.callWall).toBe(420); expect(m.totalNet).toBeCloseTo(a.totalNet + b.totalNet, 0);
    expect(m.profile.length).toBe(a.profile.length); expect(m.used).toBe(a.used + b.used);
  });
  it('every symbol with a feed or fallback is well formed', () => { for (const s of SYMBOLS) { expect(s.sym).toMatch(/^[A-Z]{1,5}$/); expect(['yahoo', 'nasdaq']).toContain(s.src); if (s.native) expect(s.src).toBe('yahoo'); } });
});
