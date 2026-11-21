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
  it('asset brief explains drivers with real numbers, outlook and Urdu parity', () => {
    const b = assetBrief(usd, snap({}), NOW);
    expect(b.headline.en).toContain('USD name'); expect(b.headline.en).toContain('+38'); expect(b.headline.ur).toContain('تیزی');
    expect(b.why[0].en).toMatch(/Core CPI \(MoM\).*0\.4%.*forecast 0\.3%.*previous 0\.2%.*supports USD/);
    expect(b.why.some((l) => /weighs on USD/.test(l.en) && l.ur.includes('دباؤ'))).toBe(true);
    const ev = b.outlook.find((l) => l.en.includes('Core CPI (MoM) is due'))!;
    expect(ev.en).toContain('above forecast would be bullish for USD'); expect(ev.ur).toContain('توقع سے اوپر');
    expect(b.outlook.some((l) => /Strong Bullish/.test(l.en))).toBe(true);
    expect(b.counter[0].en).toContain('Growth');
    expect(b.why.length).toBe(b.why.filter((l) => l.en && l.ur).length);
  });
  it('pair brief orients the quote side and the event direction', () => {
    const eur = asset('EUR', 10, [ind('x', 'ECB Rate', 20, 2.0, 2.0, 2.25, 'ECB Rate')]);
    const pair: any = { symbol: 'EURUSD', display: 'EUR/USD', base: 'EUR', quote: 'USD', assetClass: 'FOREX', score: -28, bullishPct: 35, bias: 'MILD_BEARISH', confidence: 75, baseScore: 10, quoteScore: 38, explanation: '' };
    const b = pairBrief(pair, eur, usd, snap({}), NOW);
    expect(b.headline.en).toContain('EUR/USD is Mild Bearish');
    expect(b.why.some((l) => l.tone === 'bear' && /bearish for EUR\/USD/.test(l.en))).toBe(true);
    expect(b.outlook[0].en).toContain('above forecast would be bearish for EUR/USD'); // USD beat = pair down
  });
  it('unscored asset says so instead of inventing a bias', () => {
    const b = assetBrief({ ...usd, score: null, bias: 'NEUTRAL' }, snap({}), NOW);
    expect(b.headline.en).toContain('not enough data'); expect(b.why).toHaveLength(1);
  });
});
