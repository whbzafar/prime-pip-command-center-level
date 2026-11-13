/** The ONE way into the application: a subscription. There is no free tier. */
export const PRICE_STANDARD = 200;
export const PRICE_WITH_CODE = 100;
export const DISCOUNT_PERCENT = 50;
export const SBT_INDICATOR_PRICE = 500;
export const OWNER_WHATSAPP = '923406671495';
export const OWNER_WHATSAPP_DISPLAY = '03406671495';
export const waLink = (text: string) => `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(text)}`;

/** Everything a subscription includes (the Pine Script editor is deliberately NOT part of it). */
export const SUBSCRIPTION_INCLUDES = [
  'Fundamentals engine — live bullish/bearish scores for forex, commodities, indices, stocks & crypto',
  'Announcements centre — top long-term picks, level alerts, Pakistan market news',
  'Premium TradingView terminal',
  'Backtesting suite & bar replay',
  'Unlimited chart analysis',
  'Psychological Center',
  'Trading Tool Suite',
  'Trade journal, risk engine, lot-size calculator, compounding & performance lab',
];

/** Rotating, unobtrusive labels shown in the top bar. */
export const DEMO_LOCKED_LABELS = [
  'Fundamentals', 'Announcements', 'Premium TradingView', 'Psychological Center', 'Trading Tool Suite',
];

/** Demo video of the SBT Indicator on the owner's YouTube channel. */
export const SBT_INDICATOR_VIDEO = 'https://www.youtube.com/live/lHpO4tQorW0?si=UkT9gBSAXRXcuriL';
export const SBT_INDICATOR_VIDEO_LABEL = 'Watch the SBT Indicator in action (YouTube)';

/**
 * LAUNCH OFFER — buy the SBT Indicator ($500) and the full Command Center is included at no extra cost.
 * Valid until 1 January 2027 (00:00, Pakistan time); it disappears everywhere on its own after that.
 */
export const BUNDLE_OFFER_ENDS_AT = Date.parse('2027-01-01T00:00:00+05:00');
export const BUNDLE_OFFER_END_LABEL = '1 January 2027';
export const isBundleOfferActive = (now = Date.now()) => now < BUNDLE_OFFER_ENDS_AT;
export const bundleOfferDaysLeft = (now = Date.now()) => Math.max(0, Math.ceil((BUNDLE_OFFER_ENDS_AT - now) / 86400000));
export const BUNDLE_OFFER_HEADLINE = `Buy the SBT Indicator for $${SBT_INDICATOR_PRICE} and get the full Command Center FREE`;
export const bundleOfferWaLink = () => waLink(`Hello PrimePipFX, I want the launch offer: SBT Indicator ($${SBT_INDICATOR_PRICE}) with the Command Center included free.`);
