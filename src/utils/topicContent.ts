import { CATEGORY_SUMMARIES } from '../data/categorySummaries';
import { rng } from './postVisuals';

export type Platform = 'instagram' | 'facebook' | 'tiktok' | 'youtube';
export interface Topic { id: string; tab: string; title: string; short: string; overview: string; features: string[]; tags: string[] }
export interface TopicPost { headline: string; hooks: string[]; caption: string; hashtags: string[]; title: string; onScreen: string[]; text: string }

const EXCLUDE = new Set(['ADMIN', 'SETTINGS', 'ACCOUNTS', 'COMMUNITY']);
const EXTRA_TAGS: Record<string, string[]> = {
  DASHBOARD: ['tradingdashboard', 'equitycurve'], JOURNAL: ['tradejournal', 'tradingjournal'], SBT_MODELS: ['smartmoney', 'primepipsbt', 'fvg'],
  LOT_SIZE: ['lotsize', 'positionsizing'], RISK: ['riskmanagement', 'drawdown'], PRE_TRADE_PLAN: ['tradingplan', 'disciplinedtrading'],
  FUNDAMENTAL_CALENDAR: ['economiccalendar', 'forexnews'], FUNDAMENTAL_INDICATORS: ['fundamentalanalysis', 'macro'], SIGNALS: ['forexsignals', 'tradeideas'],
  PRO_TRADING: ['tradingview', 'charting'], BACKTESTING: ['backtesting', 'strategytesting'], BACKTEST_REPLAY: ['backtesting', 'barreplay'],
  CHART_ANALYSIS: ['technicalanalysis', 'chartanalysis'], COMPOUNDING: ['compounding', 'moneymanagement'], PERFORMANCE: ['tradingperformance', 'tradingstats'],
  DAILY_DEV: ['tradinghabits', 'selfimprovement'], PSYCHOLOGY: ['tradingpsychology', 'mindset'], CALMING_TOOLS: ['tradingtools', 'focus'],
  RESEARCH: ['tradingeducation', 'research'], FREEHAND_WORKSPACE: ['chartdrawing', 'freehand'], SITUATION_SAVER: ['tradesetups', 'tradingnotes'],
  PAIR_SAVER: ['currencypairs', 'watchlist'], PRO_LEARNING: ['forexeducation', 'learntotrade'], BOOK_SESSION: ['tradingmentor', 'coaching'], META5_PREMIUM: ['metatrader5', 'mt5'],
};
const BASE_TAGS = ['forex', 'xauusd', 'gold', 'trading', 'forextrading', 'primepipfx', 'daytrading', 'tradingtools'];
const clean = (s: string) => s.replace(/^\s*\d+[a-z]?\.\s*/i, '').replace(/\s*\((pro|owner)\)\s*/i, ' ').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '').replace(/[,;:\-–]$/, '') + '…');

export function getTopics(): Topic[] {
  return Object.values(CATEGORY_SUMMARIES).filter((c) => !EXCLUDE.has(c.id)).map((c) => ({
    id: c.id, tab: c.id, title: clean(c.name), short: c.shortDesc, overview: c.overview, features: c.keyFeatures.slice(),
    tags: [...(EXTRA_TAGS[c.id] || []), ...BASE_TAGS],
  }));
}

const HOOKS = [
  'Stop guessing. {T} is built into one app.', 'Most traders don\'t have this: {T}.', '{T}, explained in 20 seconds.', 'Is your plan missing {T}?',
  'One app. {T}. Zero tab-hopping.', 'How students use {T} every day.', 'Trade with more structure: meet {T}.', '{F}. That\'s {T} in PrimePipFX.',
  'Inside the terminal: {T}.', 'What does {T} actually do? Let\'s look.', 'Tired of switching apps? {T} is right here.', 'Real tools for real traders: {T}.',
];
const HEADS = ['{T}', 'Meet {T}', '{T} built in', 'Inside: {T}', 'Use {T} daily', 'Learn {T}', '{T}: see it live', 'Your {T}'];
const CTAS = ['Try it at primepipfx.site', 'Open it free at primepipfx.site', 'See it live: primepipfx.site', 'Start at primepipfx.site'];
const QUESTIONS = ['Which tool do you use the most?', 'What would you add next?', 'Which feature should we show next?', 'Are you using this yet?'];
export const DISCLAIMER = 'Educational content, not financial advice. Trading carries risk.';
const BANNED = /\b(guaranteed|guarantee|get rich|risk[- ]free|100% win|sure profit|double your)\b/i;

function pick<T>(a: T[], r: () => number): T { return a[Math.floor(r() * a.length) % a.length]; }
function shuffled<T>(a: T[], r: () => number): T[] { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
const fill = (t: string, T: string, F: string) => t.replace(/\{T\}/g, T).replace(/\{F\}/g, F);

/** Every post is written from the topic's own description and feature list, so the text always matches the screenshot of that same topic. Any seed gives a new variation. */
export function generateTopicPost(topic: Topic, platform: Platform, seed: number): TopicPost {
  const r = rng(seed * 7919 + topic.id.length * 31 + platform.length);
  const T = topic.title; const feats = shuffled(topic.features, r).map((f) => cut(f, 78));
  const hooks = shuffled(HOOKS, r).slice(0, 4).map((h) => fill(h, T, feats[0] || topic.short));
  const headline = fill(pick(HEADS, r), T, '');
  const hook = hooks[0]; const f3 = feats.slice(0, 3); const cta = pick(CTAS, r); const q = pick(QUESTIONS, r);
  const founder = r() < 0.4 ? '\nBuilt by Wahab Zafar, founder of PrimePipFX.' : '';
  const tagPool = shuffled(topic.tags, r);
  const tags = (n: number) => Array.from(new Set(tagPool.slice(0, n))).map((t) => `#${t}`);
  let caption = ''; let hashtags: string[] = []; let title = ''; let onScreen: string[] = [];
  if (platform === 'instagram') {
    hashtags = tags(10);
    caption = `${hook}\n\n${cut(topic.short, 140)}\n\n${f3.map((f) => `✅ ${f}`).join('\n')}${founder}\n\n👉 ${cta} (link in bio)\n\n${DISCLAIMER}`;
  } else if (platform === 'facebook') {
    hashtags = tags(4);
    caption = `${hook}\n\n${cut(topic.overview, 260)}\n\n${f3.map((f) => `• ${f}`).join('\n')}${founder}\n\n${q} Tell us below 👇\n\n${cta}\n\n${DISCLAIMER}`;
  } else if (platform === 'tiktok') {
    hashtags = tags(5);
    caption = `${cut(hook, 90)} ${cta.replace('Try it at', '').trim() ? '' : ''}\n${cut(topic.short, 100)}\n\n${cta}`.trim();
    onScreen = [cut(hook, 60), ...f3.map((f) => cut(f, 56)), cta];
  } else {
    hashtags = tags(8);
    title = cut(`${T} in PrimePipFX | Forex & Gold Trading Terminal`, 70);
    caption = `${topic.short}\n\n${cut(topic.overview, 320)}\n\nWhat you'll see:\n${f3.map((f) => `• ${f}`).join('\n')}${founder}\n\n${cta}\n\n${DISCLAIMER}`;
    onScreen = [T, ...f3.map((f) => cut(f, 56))];
  }
  if (BANNED.test(caption)) caption = caption.replace(BANNED, 'powerful');
  const text = platform === 'youtube' ? `TITLE: ${title}\n\nDESCRIPTION:\n${caption}\n\nTAGS: ${hashtags.map((h) => h.slice(1)).join(', ')}` : `${caption}\n\n${hashtags.join(' ')}`;
  return { headline, hooks, caption, hashtags, title, onScreen, text };
}
