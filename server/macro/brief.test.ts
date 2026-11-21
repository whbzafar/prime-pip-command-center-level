import { describe, expect, it } from 'vitest';
import { assetBrief, pairBrief } from './brief.js';

const ind = (id: string, name: string, score: number, actual: number, fc: number | null, pv: number | null, title: string, pol = 'Higher = bullish (hawkish)'): any => ({
  id, name, description: '', frequency: 'M', weight: 1, effectiveWeight: 1, score, status: 'live', polarityNote: pol, reasoning: '', components: [],
  observation: { actual, forecast: fc, previous: pv, releasedAt: '2026-11-01T00:00:00Z', period: 'Oct', unit: '%', sourceTitle: title, sourceName: 't', sourceUrl: 'u' },
});
const asset = (symbol: string, score: number, inds: any[]): any => ({ symbol, name: symbol + ' name', assetClass: 'FOREX', score, bullishPct: 60, bearishPct: 40, bias: score >= 30 ? 'BULLISH' : score >= 10 ? 'MILD_BULLISH' : score > -10 ? 'NEUTRAL' : 'MILD_BEARISH', confidence: 80, summary: '', topDrivers: [], updatedAt: '2026-11-21T00:00:00Z',
  pillars: [{ id: 'm', name: 'Monetary', description: '', weight: 1, score, bullishPct: 60, coverage: 1, reasoning: '', indicators: inds }, { id: 'g', name: 'Growth', description: '', weight: 1, score: -20, bullishPct: 40, coverage: 1, reasoning: '', indicators: [] }] });
const NOW = Date.parse('2026-11-21T06:00:00Z');
const snap = (extra: any): any => ({ generatedAt: '2026-11-21T05:59:00Z', assets: [], pairs: [], correlations: { w30: null, w90: null }, releases: [], sources: [], methodologyVersion: '1', upcoming: [{ asset: 'USD', title: 'Core CPI (MoM)', scheduledAt: '2026-11-24T13:30:00Z', forecast: 0.3, previous: 0.2, importance: 'high' }], ...extra });

describe('market brief', () => {
  const usd = asset('USD', 38, [ind('cpi', 'Core CPI (MoM)', 60, 0.4, 0.3, 0.2, 'Core CPI (MoM)'), ind('nfp', 'Unemployment Rate', -25, 4.4, 4.2, 4.1, 'Unemployment Rate', 'Higher = bearish')]);
  it('asset brief: plain verdict, real numbers, Pakistan-time events, Urdu parity', () => {
    const b = assetBrief(usd, snap({}), NOW);
    expect(b.headline.en).toBe('USD (USD name) is Bullish — buyers have the edge.'); expect(b.headline.ur).toContain('تیزی');
    expect(b.side).toBe('bull');
    expect(b.why[0].en).toMatch(/Core CPI \(MoM\).*came in at 0\.4%, above the 0\.3% expected\. That is good for USD, so it makes USD stronger/);
    expect(b.why.some((l) => /bad for USD/.test(l.en) && l.ur.includes('برا'))).toBe(true);
    expect(b.summary.en).toBe('Of the 2 readings we track for USD, 1 push it up and 1 push it down.');
    const ev = b.watch[0];
    expect(ev.en).toContain('Tue 24 Nov, 6:30 PM Pakistan time'); expect(ev.en).toContain('Expected: 0.3% (last time 0.2%)');
    expect(ev.en).toContain('higher than expected, USD usually rises'); expect(ev.ur).toContain('پاکستانی وقت');
    expect(b.heading.some((l) => /Score now: \+38/.test(l.en) && /becomes Strongly Bullish/.test(l.en) && /becomes Slightly Bullish/.test(l.en))).toBe(true);
    expect(b.counter[0].en).toContain('Growth');
    for (const l of [...b.why, ...b.watch, ...b.heading, ...b.counter]) expect(l.en && l.ur).toBeTruthy();
  });
  it('pair brief: quote side is flipped and the event direction follows', () => {
    const eur = asset('EUR', 10, [ind('x', 'ECB Rate', 20, 2.0, 2.0, 2.25, 'ECB Rate')]);
    const pair: any = { symbol: 'EURUSD', display: 'EUR/USD', base: 'EUR', quote: 'USD', assetClass: 'FOREX', score: -28, bullishPct: 35, bias: 'MILD_BEARISH', confidence: 75, baseScore: 10, quoteScore: 38, explanation: '' };
    const b = pairBrief(pair, eur, usd, snap({}), NOW);
    expect(b.headline.en).toBe('EUR/USD is Slightly Bearish — a small lean down.');
    expect(b.summary.en).toBe('USD looks stronger than EUR, so EUR/USD leans down.');
    expect(b.why.some((l) => l.tone === 'bear' && /pushes EUR\/USD down/.test(l.en))).toBe(true);
    expect(b.watch[0].en).toContain('higher than expected, EUR/USD usually falls'); // USD beat = pair down
    expect(b.bearishPct).toBe(65);
    expect(b.heading.some((l) => /becomes Neutral/.test(l.en) && /becomes Bearish/.test(l.en))).toBe(true);
  });
  it('unscored asset says so instead of inventing a bias', () => {
    const b = assetBrief({ ...usd, score: null, bias: 'NEUTRAL' }, snap({}), NOW);
    expect(b.headline.en).toContain('not enough data'); expect(b.why).toHaveLength(0);
  });
});
