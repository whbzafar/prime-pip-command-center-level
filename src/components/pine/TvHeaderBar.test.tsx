import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TvHeaderBar, TV_TIMEFRAMES } from './TvHeaderBar';
import { barCloseIn, fmtCountdown } from '../../utils/marketSession';

describe('TvHeaderBar', () => {
  const cd = { text: '59:11', label: '1h', closed: false };
  it('shows pair search, timeframes, more-arrow and timer', () => {
    const html = renderToStaticMarkup(<TvHeaderBar symbol="GBPNZD" interval="60" onInterval={() => {}} onSearch={() => {}} symbols={['GBPNZD', 'EURUSD']} countdown={cd} showTf />);
    expect(html).toContain('tv-header-search'); expect(html).toContain('tv-hdr-tf-4h'); expect(html).toContain('tv-hdr-tf-more'); expect(html).toContain('59:11');
  });
  it('lists every timeframe in the menu data', () => { expect(TV_TIMEFRAMES.map((t) => t[1])).toEqual(['1m', '3m', '5m', '15m', '30m', '1h', '2h', '3h', '4h', 'D', 'W', 'M']); });
  it('timer matches the clock for H1 and H4 (New York 17:00 cycle)', () => {
    const d = new Date(Date.UTC(2026, 10, 25, 4, 0, 49));
    expect(fmtCountdown(barCloseIn('60', 'fx', d).remaining)).toBe('59:11');
    expect(fmtCountdown(barCloseIn('240', 'fx', d).remaining)).toBe('01:59:11');
  });
});
