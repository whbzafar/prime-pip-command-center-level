import { describe, it, expect } from 'vitest';
import { currentPlanPrice, isLifetimeOfferActive, LIFETIME_OFFER_ENDS_AT, msToParts, planPriceShort } from './pricing';

describe('early-bird lifetime offer', () => {
  it('is $50 up to the last second of November (Pakistan time) and reverts on 1 December', () => {
    const before = Date.parse('2026-11-30T23:59:59+05:00');
    const after = Date.parse('2026-12-01T00:00:00+05:00');
    expect(isLifetimeOfferActive(before)).toBe(true);
    expect(currentPlanPrice(false, before)).toBe(50);
    expect(currentPlanPrice(true, before)).toBe(50);
    expect(isLifetimeOfferActive(after)).toBe(false);
    expect(currentPlanPrice(false, after)).toBe(200);
    expect(currentPlanPrice(true, after)).toBe(100);
    expect(planPriceShort(after)).toContain('$200');
  });
  it('splits a duration into countdown parts', () => {
    expect(msToParts(LIFETIME_OFFER_ENDS_AT - Date.parse('2026-11-29T21:58:55+05:00'))).toEqual({ d: 1, h: 2, m: 1, s: 5 });
  });
});
