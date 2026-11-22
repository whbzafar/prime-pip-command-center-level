import { describe, it, expect } from 'vitest';
import { buildBriefing } from './briefingRoutes';

const now = Date.parse('2026-11-23T04:00:00Z');
const snap = {
  pairs: [
    { symbol: 'EURUSD', display: 'EUR/USD', assetClass: 'FOREX', score: 40, confidence: 80, bias: 'BULLISH', explanation: 'x' },
    { symbol: 'USDJPY', display: 'USD/JPY', assetClass: 'FOREX', score: -35, confidence: 70, bias: 'BEARISH', explanation: 'y' },
    { symbol: 'GBPUSD', display: 'GBP/USD', assetClass: 'FOREX', score: 60, confidence: 30, bias: 'BULLISH', explanation: 'low confidence → excluded' },
    { symbol: 'AAA', display: 'AAA', assetClass: 'STOCKS', score: 90, confidence: 90, bias: 'BULLISH', explanation: 'stock → excluded' },
  ],
  upcoming: [
    { asset: 'USD', title: 'CPI', scheduledAt: new Date(now + 2 * 3600e3).toISOString(), importance: 'HIGH' },
    { asset: 'EUR', title: 'Minor', scheduledAt: new Date(now + 2 * 3600e3).toISOString(), importance: 'LOW' },
    { asset: 'USD', title: 'Far', scheduledAt: new Date(now + 40 * 3600e3).toISOString(), importance: 'HIGH' },
  ],
};
const radar = { rows: [
  { symbol: 'XAUUSD', side: 'LONG', regime: 'BREAKOUT', score: 70, alignment: 'aligned', fundamentals: 30, setup: 's', events: [{ inHours: 2 }] },
  { symbol: 'EURGBP', side: 'NEUTRAL', regime: 'RANGING', score: 80, events: [] },
  { symbol: 'USDCAD', side: 'SHORT', regime: 'TRENDING', score: 20, events: [] },
] };

describe('daily briefing', () => {
  const b = buildBriefing(snap, radar, now);
  it('keeps only confident non-stock pairs', () => { expect(b.bullish.map((p) => p.symbol)).toEqual(['EURUSD']); expect(b.bearish.map((p) => p.symbol)).toEqual(['USDJPY']); });
  it('lists only high-impact releases inside 24h', () => { expect(b.events.length).toBe(1); expect(b.events[0].title).toBe('CPI'); expect(b.newsSoonCurrencies).toEqual(['USD']); });
  it('picks directional set-ups above the score bar and flags news-risk markets', () => { expect(b.setups.map((s) => s.symbol)).toEqual(['XAUUSD']); expect(b.avoid).toEqual(['XAUUSD']); });
  it('says so when nothing is scheduled', () => { expect(buildBriefing({ pairs: [], upcoming: [] }, { rows: [] }, now).headline[0]).toContain('No high-impact'); });
});
