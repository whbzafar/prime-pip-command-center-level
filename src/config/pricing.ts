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
