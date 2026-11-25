/**
 * SOCIAL GROWTH AGENT — writes, schedules and (optionally) publishes promotion posts for PRIMEPIPFX.
 *  • Content: Gemini writes platform-specific posts (title, caption, hashtags, SEO keywords, call to action) from rotating
 *    content pillars; a built-in template writer is the fallback when no AI key is set.
 *  • Safety: every post passes a compliance filter (no profit guarantees / income claims) and carries a risk line.
 *  • Timing: each platform has best-time windows in Pakistan Standard Time; the scheduler picks the next free slot.
 *  • Publishing: Facebook Page + Instagram via the Meta Graph API when tokens are set. YouTube has no public API for plain
 *    posts, so it produces a ready-to-upload package (title, description, tags, pinned comment).
 *  • Control: "review" mode (default) waits for approval; "auto" publishes by itself. Daily caps stop spam.
 */
import crypto from 'crypto';
import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';

export type Platform = 'facebook' | 'instagram' | 'youtube' | 'tiktok';
export type PostStatus = 'draft' | 'approved' | 'published' | 'failed' | 'rejected' | 'manual';
export interface Beat { t: string; onScreen: string; voice: string }
export interface Score { total: number; hook: number; clarity: number; seo: number; cta: number; tags: number; tips: string[] }

export interface SocialPost {
  id: string; platform: Platform; pillar: string; title: string; caption: string; hashtags: string[]; keywords: string[];
  cta: string; imageUrl?: string; hooks: string[]; slides: string[]; beats: Beat[]; score: Score; rating?: 'good' | 'bad'; scheduledAt: string; status: PostStatus; createdAt: string; publishedAt?: string; error?: string; remoteId?: string; source: 'ai' | 'template';
}
export interface AgentConfig {
  enabled: boolean; mode: 'review' | 'auto'; platforms: Record<Platform, boolean>; perDay: Record<Platform, number>; siteUrl: string; brand: string;
}

const FILE = 'social_agent.json';
const SITE = 'https://primepipfx.site';
const DEFAULT_IMAGE = `${SITE}/assets/you-can-do-it-1280.jpg`;
const DEFAULT_CFG: AgentConfig = {
  enabled: false, mode: 'review', platforms: { facebook: true, instagram: true, youtube: true, tiktok: true }, perDay: { facebook: 2, instagram: 2, youtube: 1, tiktok: 2 }, siteUrl: SITE, brand: 'PRIMEPIPFX',
};
// General-audience best windows in Pakistan time (PKT, UTC+5). Defaults from common engagement patterns — adjustable, not guarantees.
export const BEST_TIMES_PKT: Record<Platform, string[]> = {
  facebook: ['13:00', '20:30', '18:30'],
  instagram: ['12:30', '21:00', '19:30'],
  youtube: ['18:00', '17:00', '20:00'],
  tiktok: ['20:00', '22:00', '13:30'],
};
const PILLARS = [
  { id: 'founder', brief: 'The founder story of Wahab Zafar: rural Jhang, three serious injuries, never giving up, building the PRIMEPIPFX Command Center and the Prime Pip SBT Indicator.' },
  { id: 'all-in-one', brief: 'Everything a forex and gold trader needs in one app: which pair to trade, fundamental data, backtesting, unlimited charts, premium TradingView, freehand canvas.' },
  { id: 'fundamentals', brief: 'Fundamental data and currency strength for forex pairs and XAUUSD (gold), explained simply for students.' },
  { id: 'backtesting', brief: 'Backtesting and replay tools: test ideas on past prices before risking money.' },
  { id: 'discipline', brief: 'Trading discipline and psychology: risk management, patience, the Psychological Command Center.' },
  { id: 'sbt', brief: 'The Prime Pip SBT Indicator: 10 institutional models, market structure shifts and liquidity boundaries.' },
  { id: 'community', brief: 'The student community: messaging, video calling, honest education and mentorship.' },
  { id: 'coming-soon', brief: 'More features are coming soon to the Command Center — stay tuned.' },
];
const RISK_LINE = 'Trading carries risk. Educational content only, not financial advice.';
const BANNED = [/guarantee/i, /100\s*%\s*(win|profit|accura)/i, /risk[-\s]?free/i, /get rich/i, /double your (money|account)/i, /no loss/i, /sure (profit|win)/i, /passive income/i, /quit your job/i, /millionaire/i];

const now = () => new Date().toISOString();
export function readState() {
  const st = safeReadJsonFile<{ config: AgentConfig; posts: SocialPost[] }>(FILE, { config: DEFAULT_CFG, posts: [] });
  st.posts = (st.posts || []).map((p) => { const q: SocialPost = { ...p, hooks: p.hooks || [], slides: p.slides || [], beats: p.beats || [], keywords: p.keywords || [], hashtags: p.hashtags || [] } as SocialPost; if (!q.score) q.score = scorePost(q); return q; });
  return st;
}
function save(s: { config: AgentConfig; posts: SocialPost[] }) { s.posts = s.posts.slice(-400); safeWriteJsonFile(FILE, s); }
export function getConfig(): AgentConfig { return { ...DEFAULT_CFG, ...readState().config, platforms: { ...DEFAULT_CFG.platforms, ...readState().config?.platforms }, perDay: { ...DEFAULT_CFG.perDay, ...readState().config?.perDay } }; }
export function setConfig(patch: Partial<AgentConfig>) {
  const s = readState(); const c = getConfig();
  const next: AgentConfig = { ...c, ...patch, platforms: { ...c.platforms, ...(patch.platforms || {}) }, perDay: { ...c.perDay, ...(patch.perDay || {}) } };
  next.mode = next.mode === 'auto' ? 'auto' : 'review';
  (['facebook', 'instagram', 'youtube', 'tiktok'] as Platform[]).forEach((p) => { next.perDay[p] = Math.max(0, Math.min(4, Math.round(Number(next.perDay[p]) || 0))); });
  s.config = next; save(s); return next;
}
export function credentialStatus() {
  const meta = !!(process.env.FB_PAGE_ID && process.env.META_PAGE_TOKEN);
  return { facebook: meta, instagram: !!(meta && process.env.IG_USER_ID), youtube: false, tiktok: false, youtubeNote: 'YouTube and TikTok do not allow automatic posting without app approval; the agent prepares a ready-to-upload package with HD visuals.' };
}

// ---------- compliance ----------
export function compliant(text: string): boolean { return !BANNED.some((r) => r.test(text)); }
type Draft = Omit<SocialPost, 'id' | 'createdAt' | 'status' | 'scheduledAt' | 'score'>;
function clean(p: Draft): Draft {
  let caption = p.caption.replace(/\s+\n/g, '\n').trim();
  if (!caption.includes('not financial advice')) caption += `\n\n${RISK_LINE}`;
  const tags = [...new Set(p.hashtags.map((h) => '#' + h.replace(/[^\p{L}\p{N}_]/gu, '')).filter((h) => h.length > 2))].slice(0, p.platform === 'instagram' ? 15 : 8);
  const ok = (t: string) => compliant(t) && t.trim().length > 0;
  return { ...p, caption, hashtags: tags, title: p.title.slice(0, p.platform === 'youtube' ? 100 : 120), hooks: (p.hooks || []).map(String).filter(ok).slice(0, 4), slides: (p.slides || []).map(String).filter(ok).slice(0, 6), beats: (p.beats || []).filter((b) => ok(`${b.onScreen} ${b.voice}`)).slice(0, 8) };
}

// ---------- content analysis ----------
const POWER = /\b(how|why|stop|never|secret|mistake|truth|before|without|only|free|new|proven|simple|step|learn|test|start|finally)\b/i;
export function scorePost(p: Pick<SocialPost, 'platform' | 'title' | 'caption' | 'hashtags' | 'keywords' | 'hooks' | 'slides'>): Score {
  const tips: string[] = []; const first = (p.hooks[0] || p.title || '').trim(); const words = first.split(/\s+/).filter(Boolean).length;
  let hook = 40 + (words >= 3 && words <= 8 ? 25 : 0) + (POWER.test(first) ? 15 : 0) + (/\d/.test(first) ? 10 : 0) + (/[?!]|\./.test(first) ? 10 : 0);
  if (words > 9) tips.push('Shorten the hook to 8 words or fewer.'); if (!POWER.test(first)) tips.push('Add a curiosity or benefit word to the hook.');
  const max = p.platform === 'tiktok' ? 220 : p.platform === 'facebook' ? 700 : p.platform === 'instagram' ? 1100 : 1600; const len = p.caption.length;
  let clarity = len <= max ? 80 : Math.max(40, 80 - Math.round((len - max) / 20)); if (len < 60) { clarity -= 25; tips.push('Caption is very short; add one clear benefit.'); } if (len > max) tips.push(`Trim the caption below ${max} characters for ${p.platform}.`);
  if (p.slides.length >= 3) clarity += 10; if (/\n\n/.test(p.caption)) clarity += 10;
  const text = `${p.title} ${p.caption}`.toLowerCase(); const hits = p.keywords.filter((k) => text.includes(k.toLowerCase().split(' ')[0])).length;
  const seo = Math.min(100, 35 + hits * 13 + (/(forex|xauusd|gold|trading)/.test(text) ? 15 : 0)); if (seo < 60) tips.push('Use the main keyword (forex, XAUUSD or gold) in the first line.');
  const cta = /(open|join|read|start|try|watch|link in bio|see)/i.test(p.caption) && /primepipfx\.site|link in bio/i.test(p.caption) ? 100 : /(open|join|read|start|try|link)/i.test(p.caption) ? 70 : 35; if (cta < 100) tips.push('End with a clear call to action and the link.');
  const wantTags = p.platform === 'instagram' ? [8, 15] : p.platform === 'tiktok' ? [3, 6] : [3, 8]; const nt = p.hashtags.length; const tags = nt >= wantTags[0] && nt <= wantTags[1] ? 100 : nt === 0 ? 20 : 65; if (tags < 100) tips.push(`Use ${wantTags[0]}-${wantTags[1]} hashtags on ${p.platform}.`);
  const total = Math.round(Math.min(100, hook) * 0.3 + Math.min(100, clarity) * 0.25 + seo * 0.2 + cta * 0.15 + tags * 0.1);
  return { total, hook: Math.min(100, hook), clarity: Math.min(100, clarity), seo, cta, tags, tips: tips.slice(0, 4) };
}

// ---------- scheduling in PKT ----------
function pktSlot(platform: Platform, dayOffset: number, idx: number): Date {
  const times = BEST_TIMES_PKT[platform]; const t = times[idx % times.length]; const [h, m] = t.split(':').map(Number);
  const pktNow = new Date(Date.now() + 5 * 3600_000);
  const y = pktNow.getUTCFullYear(), mo = pktNow.getUTCMonth(), d = pktNow.getUTCDate() + dayOffset;
  return new Date(Date.UTC(y, mo, d, h, m) - 5 * 3600_000);
}
function nextFreeSlot(platform: Platform, posts: SocialPost[], perDay: number): Date {
  const taken = new Set(posts.filter((p) => p.platform === platform && p.status !== 'rejected').map((p) => p.scheduledAt.slice(0, 16)));
  const per = Math.max(1, perDay);
  for (let day = 0; day < 30; day++) for (let i = 0; i < per; i++) {
    const s = pktSlot(platform, day, i);
    if (s.getTime() > Date.now() + 5 * 60_000 && !taken.has(s.toISOString().slice(0, 16))) return s;
  }
  return pktSlot(platform, 30, 0);
}

// ---------- learning: favour topics that worked ----------
function pickPillar(posts: SocialPost[], used: string[], i: number) {
  const fresh = PILLARS.filter((p) => !used.includes(p.id));
  if (fresh.length) {
    const w = (id: string) => 1 + posts.filter((x) => x.pillar === id && x.rating === 'good').length * 2 - posts.filter((x) => x.pillar === id && x.rating === 'bad').length;
    return [...fresh].sort((a, b) => w(b.id) - w(a.id))[0];
  }
  const good = PILLARS.filter((p) => posts.some((x) => x.pillar === p.id && x.rating === 'good'));
  const pool = good.length ? good : PILLARS; return pool[(posts.length + i) % pool.length];
}

// ---------- writing ----------
const VIS: Record<string, { hooks: string[]; slides: string[] }> = {
  founder: { hooks: ['Three injuries. He never gave up.', 'From rural Jhang to building a trading app', 'Life knocked him down 3 times'], slides: ['Born in rural Jhang', 'Three serious injuries', 'He never gave up', 'He built PRIMEPIPFX', 'Read the full story'] },
  'all-in-one': { hooks: ['One app. Every trading tool.', 'Stop switching between 5 apps', 'Which pair to trade? Start here'], slides: ['Which pair to trade', 'Fundamental data', 'Backtesting tools', 'Unlimited charts', 'All in one app'] },
  fundamentals: { hooks: ['Know WHY a pair moves', 'Currency strength, explained simply', 'Gold moves for a reason'], slides: ['Why does gold move?', 'See currency strength', 'Understand the news', 'Trade with context'] },
  backtesting: { hooks: ['Test it BEFORE you risk money', 'Replay the market. Learn faster.', 'Your idea vs past prices'], slides: ['Pick a pair', 'Replay past prices', 'Test your idea', 'Learn before you risk'] },
  discipline: { hooks: ['Discipline beats prediction', 'Your biggest enemy is your mind', 'Calm traders last longer'], slides: ['Risk first', 'Patience pays', 'Control emotions', 'Build a calm routine'] },
  sbt: { hooks: ['10 models. One indicator.', 'Structure shifts made visible', 'See liquidity boundaries'], slides: ['Prime Pip SBT Indicator', '10 institutional models', 'Market structure shifts', 'Liquidity boundaries'] },
  community: { hooks: ['Learn with real students', 'Do not trade alone', 'A community that teaches honestly'], slides: ['Student community', 'Messaging and calls', 'Honest education', 'Join today'] },
  'coming-soon': { hooks: ['Something big is coming', 'More features on the way', 'We are just getting started'], slides: ['New tools coming', 'Built by a founder who never quit', 'Stay tuned'] },
};
function templatePost(platform: Platform, pillar: { id: string; brief: string }, cfg: AgentConfig, n: number): Draft {
  const url = cfg.siteUrl; const base = ['PRIMEPIPFX', 'ForexTrading', 'XAUUSD', 'GoldTrading', 'TradingCommunity'];
  const T: Record<string, { title: string; body: string; tags: string[] }> = {
    founder: { title: 'Three injuries. One founder who never gave up.', body: `Wahab Zafar was born in rural Jhang. Three serious injuries could not stop him. He built the PRIMEPIPFX Command Center and the Prime Pip SBT Indicator, and more features are coming.\n\nRead his full story: ${url}/about.html`, tags: ['FounderStory', 'NeverGiveUp', 'Motivation'] },
    'all-in-one': { title: 'Forex & gold trading tools in one app', body: `Which pair to trade, fundamental data, backtesting, unlimited charts, premium TradingView and a freehand canvas. Everything in a single application.\n\nOpen it: ${url}`, tags: ['TradingTools', 'Backtesting', 'TradingView'] },
    fundamentals: { title: 'Understand currency strength before you trade', body: `See fundamental data for forex pairs and XAUUSD explained simply, so you know why a pair is moving.\n\nTry it: ${url}`, tags: ['FundamentalAnalysis', 'CurrencyStrength', 'Forex'] },
    backtesting: { title: 'Test your idea before you risk money', body: `Replay past prices and backtest your strategy inside the PRIMEPIPFX terminal.\n\nStart here: ${url}`, tags: ['Backtesting', 'TradingStrategy', 'ForexEducation'] },
    discipline: { title: 'Discipline beats prediction', body: `Risk management and a calm mind decide how long a trader lasts. The Psychological Command Center helps you build both.\n\nLearn more: ${url}`, tags: ['TradingPsychology', 'RiskManagement', 'Discipline'] },
    sbt: { title: 'Prime Pip SBT Indicator: 10 models, one chart', body: `Market structure shifts, liquidity boundaries and 10 institutional models on one indicator.\n\nDetails: ${url}`, tags: ['SBTIndicator', 'MarketStructure', 'SmartMoney'] },
    community: { title: 'Learn with a real trading community', body: `Messaging, video calling and honest education for students, all inside the Command Center.\n\nJoin: ${url}`, tags: ['TradingCommunity', 'ForexStudents', 'LearnToTrade'] },
    'coming-soon': { title: 'More features are coming', body: `The PRIMEPIPFX Command Center keeps growing. New tools are on the way. Stay tuned.\n\nSee what's live: ${url}`, tags: ['ComingSoon', 'NewFeatures', 'Trading'] },
  };
  const t = T[pillar.id] || T['all-in-one'];
  const v = VIS[pillar.id] || VIS['all-in-one'];
  const beats: Beat[] = platform === 'tiktok' || platform === 'instagram' ? [
    { t: '0-3s', onScreen: v.hooks[n % v.hooks.length], voice: v.hooks[n % v.hooks.length] },
    ...v.slides.slice(0, 3).map((x, i) => ({ t: `${3 + i * 5}-${8 + i * 5}s`, onScreen: x, voice: x })),
    { t: '18-22s', onScreen: 'Link in bio', voice: 'Open the PRIMEPIPFX terminal. Link in bio.' },
  ] : [];
  return { platform, pillar: pillar.id, title: t.title, caption: `${t.title}\n\n${t.body}`, hashtags: [...base, ...t.tags], keywords: ['forex trading app', 'XAUUSD', 'gold trading', 'backtesting', 'PRIMEPIPFX'], cta: `Open ${url}`, imageUrl: platform === 'youtube' ? undefined : DEFAULT_IMAGE, hooks: v.hooks, slides: v.slides, beats, source: 'template' };
}

async function aiPost(ai: any, platform: Platform, pillar: { id: string; brief: string }, cfg: AgentConfig, recent: string[]): Promise<Draft | null> {
  if (!ai) return null;
  const rules = platform === 'instagram' ? 'Caption up to 900 characters, hook in the first line, 10-15 hashtags, link in bio style CTA (the link is not clickable).'
    : platform === 'facebook' ? 'Post up to 600 characters, conversational, include the link, 3-6 hashtags.'
    : platform === 'tiktok' ? 'TikTok/Reels/Shorts video package: a 15-25 second script. Caption under 150 characters with a strong hook and 3-5 hashtags. beats: 5-6 items with timing t, short on-screen text (max 6 words) and voice-over line.'
    : 'Produce a YouTube video package: title under 70 characters with the main keyword near the start, description 600-1200 characters with keywords in the first two lines, the link and timestamps placeholder, 8 tags as hashtags, plus a pinned comment inside caption end.';
  const prompt = `You write social media promotion for ${cfg.brand}, a trading app by founder Wahab Zafar (${cfg.siteUrl}). Audience: forex and gold (XAUUSD) students, mostly in Pakistan and South Asia.
Platform: ${platform}. Content pillar: ${pillar.brief}
${rules}
Strict rules: never promise profits, income, win rates or guaranteed results; no "get rich"; no fake testimonials or fake numbers; be honest and motivating; do not copy other brands. Do not repeat these recent topics: ${recent.slice(0, 6).join(' | ') || 'none'}.
Also give "hooks": 3 alternative scroll-stopping headline options (max 7 words each, curiosity or benefit, no clickbait lies), "slides": 4-5 very short carousel/graphic lines (max 6 words), and "beats" (for TikTok/Instagram video; empty array otherwise) as [{"t":"0-3s","onScreen":string,"voice":string}].
Return ONLY JSON: {"title":string,"caption":string,"hashtags":string[] (no # sign),"keywords":string[] (SEO search phrases),"cta":string,"hooks":string[],"slides":string[],"beats":[{"t":string,"onScreen":string,"voice":string}]}`;
  for (const model of ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']) {
    try {
      const r = await Promise.race([ai.models.generateContent({ model, contents: prompt, config: { temperature: 0.9, responseMimeType: 'application/json' } }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]) as any;
      const j = JSON.parse(String(r.text || '').replace(/^```json|```$/g, '').trim());
      if (!j?.caption || !j?.title) continue;
      if (!compliant(`${j.title} ${j.caption}`)) continue;
      return { platform, pillar: pillar.id, title: String(j.title), caption: String(j.caption), hashtags: Array.isArray(j.hashtags) ? j.hashtags.map(String) : [], keywords: Array.isArray(j.keywords) ? j.keywords.map(String).slice(0, 10) : [], cta: String(j.cta || `Open ${cfg.siteUrl}`), imageUrl: platform === 'youtube' ? undefined : DEFAULT_IMAGE, hooks: Array.isArray(j.hooks) ? j.hooks.map(String) : [], slides: Array.isArray(j.slides) ? j.slides.map(String) : [], beats: Array.isArray(j.beats) ? j.beats.map((b: any) => ({ t: String(b.t || ''), onScreen: String(b.onScreen || ''), voice: String(b.voice || '') })) : [], source: 'ai' };
    } catch { /* try next model */ }
  }
  return null;
}

export async function generatePosts(ai: any, opts: { platform?: Platform; count?: number } = {}): Promise<SocialPost[]> {
  const s = readState(); const cfg = getConfig();
  const platforms = (opts.platform ? [opts.platform] : (['facebook', 'instagram', 'youtube', 'tiktok'] as Platform[])).filter((p) => cfg.platforms[p]);
  const out: SocialPost[] = [];
  const count = Math.max(1, Math.min(14, opts.count || 3));
  for (const platform of platforms) {
    for (let i = 0; i < count; i++) {
      const used = s.posts.filter((p) => p.platform === platform).slice(-PILLARS.length).map((p) => p.pillar);
      const pillar = pickPillar(s.posts, used, i);
      const recent = s.posts.filter((p) => p.platform === platform).slice(-8).map((p) => p.title);
      const tries = ai ? 2 : 1; let best: Draft | null = null; let bestScore = -1;
      for (let k = 0; k < tries; k++) { const cand = clean((await aiPost(ai, platform, pillar, cfg, recent)) || templatePost(platform, pillar, cfg, i + k)); const sc = scorePost(cand).total; if (sc > bestScore) { best = cand; bestScore = sc; } }
      const c = best as Draft;
      if (!compliant(`${c.title} ${c.caption}`)) continue;
      const slot = nextFreeSlot(platform, s.posts, cfg.perDay[platform]);
      const post: SocialPost = { ...c, score: scorePost(c), id: crypto.randomUUID(), createdAt: now(), scheduledAt: slot.toISOString(), status: platform === 'youtube' || platform === 'tiktok' ? 'manual' : (cfg.mode === 'auto' ? 'approved' : 'draft') };
      s.posts.push(post); out.push(post);
    }
  }
  save(s); return out;
}

// ---------- publishing ----------
async function graph(path: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({ ...params, access_token: process.env.META_PAGE_TOKEN || '' });
  const r = await fetch(`https://graph.facebook.com/v21.0/${path}`, { method: 'POST', body });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j?.error?.message || `Graph API ${r.status}`);
  return j;
}
function fullText(p: SocialPost) { return `${p.caption}\n\n${p.hashtags.join(' ')}`.trim(); }
export async function publishPost(id: string): Promise<SocialPost> {
  const s = readState(); const p = s.posts.find((x) => x.id === id);
  if (!p) throw new Error('Post not found');
  if (p.status === 'published') return p;
  if (!compliant(`${p.title} ${p.caption}`)) { p.status = 'rejected'; p.error = 'Blocked by compliance filter'; save(s); throw new Error(p.error); }
  const cred = credentialStatus();
  try {
    if (p.platform === 'facebook') {
      if (!cred.facebook) throw new Error('Facebook is not connected (set FB_PAGE_ID and META_PAGE_TOKEN on the server).');
      const r = p.imageUrl ? await graph(`${process.env.FB_PAGE_ID}/photos`, { url: p.imageUrl, caption: fullText(p) }) : await graph(`${process.env.FB_PAGE_ID}/feed`, { message: fullText(p) });
      p.remoteId = r.post_id || r.id;
    } else if (p.platform === 'instagram') {
      if (!cred.instagram) throw new Error('Instagram is not connected (set IG_USER_ID, FB_PAGE_ID and META_PAGE_TOKEN on the server).');
      if (!p.imageUrl) throw new Error('Instagram needs an image.');
      const c = await graph(`${process.env.IG_USER_ID}/media`, { image_url: p.imageUrl, caption: fullText(p).slice(0, 2200) });
      const r = await graph(`${process.env.IG_USER_ID}/media_publish`, { creation_id: c.id });
      p.remoteId = r.id;
    } else { throw new Error(`${p.platform === 'tiktok' ? 'TikTok' : 'YouTube'} posts are prepared as a package; download the visuals and upload manually.`); }
    p.status = 'published'; p.publishedAt = now(); p.error = undefined;
  } catch (e: any) { p.status = p.platform === 'youtube' || p.platform === 'tiktok' ? 'manual' : 'failed'; p.error = String(e?.message || e).slice(0, 300); }
  save(s); return p;
}

export function updatePost(id: string, patch: Partial<Pick<SocialPost, 'title' | 'caption' | 'hashtags' | 'scheduledAt' | 'status' | 'rating' | 'hooks' | 'slides'>>): SocialPost | null {
  const s = readState(); const p = s.posts.find((x) => x.id === id); if (!p) return null;
  if (patch.title != null) p.title = String(patch.title).slice(0, 120);
  if (patch.caption != null) { if (!compliant(String(patch.caption))) throw new Error('Caption contains claims that are not allowed (guarantees, income promises).'); p.caption = String(patch.caption); }
  if (Array.isArray(patch.hashtags)) p.hashtags = patch.hashtags.map(String);
  if (patch.scheduledAt && !Number.isNaN(Date.parse(patch.scheduledAt))) p.scheduledAt = new Date(patch.scheduledAt).toISOString();
  if (patch.rating === 'good' || patch.rating === 'bad') p.rating = patch.rating;
  if (Array.isArray(patch.hooks)) { const h = patch.hooks.map(String).slice(0, 4); if (!h.every(compliant)) throw new Error('Headline contains claims that are not allowed.'); p.hooks = h; }
  if (Array.isArray(patch.slides)) { const sl = patch.slides.map(String).slice(0, 6); if (!sl.every(compliant)) throw new Error('Slide text contains claims that are not allowed.'); p.slides = sl; }
  p.score = scorePost(p);
  if (patch.status && ['draft', 'approved', 'rejected'].includes(patch.status) && p.status !== 'published') p.status = patch.status;
  save(s); return p;
}
export function deletePost(id: string) { const s = readState(); s.posts = s.posts.filter((p) => p.id !== id); save(s); }

// ---------- scheduler ----------
let ticking = false;
export async function schedulerTick(ai: any) {
  if (ticking) return; ticking = true;
  try {
    const cfg = getConfig(); if (!cfg.enabled) return;
    const s = readState();
    const due = s.posts.filter((p) => p.status === 'approved' && p.platform !== 'youtube' && p.platform !== 'tiktok' && cfg.platforms[p.platform] && Date.parse(p.scheduledAt) <= Date.now());
    for (const p of due) {
      const today = s.posts.filter((x) => x.platform === p.platform && x.status === 'published' && x.publishedAt && Date.now() - Date.parse(x.publishedAt) < 24 * 3600_000).length;
      if (today >= Math.max(1, cfg.perDay[p.platform])) continue;
      await publishPost(p.id);
    }
    if (cfg.mode === 'auto') {
      const fresh = readState();
      for (const platform of ['facebook', 'instagram', 'youtube', 'tiktok'] as Platform[]) {
        if (!cfg.platforms[platform]) continue;
        const upcoming = fresh.posts.filter((p) => p.platform === platform && (p.status === 'approved' || p.status === 'draft' || p.status === 'manual') && Date.parse(p.scheduledAt) > Date.now()).length;
        if (upcoming < Math.max(2, cfg.perDay[platform] * 2)) await generatePosts(ai, { platform, count: 2 });
      }
    }
  } catch { /* keep running */ } finally { ticking = false; }
}
