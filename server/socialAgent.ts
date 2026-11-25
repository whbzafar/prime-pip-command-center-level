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

export type Platform = 'facebook' | 'instagram' | 'youtube';
export type PostStatus = 'draft' | 'approved' | 'published' | 'failed' | 'rejected' | 'manual';

export interface SocialPost {
  id: string; platform: Platform; pillar: string; title: string; caption: string; hashtags: string[]; keywords: string[];
  cta: string; imageUrl?: string; scheduledAt: string; status: PostStatus; createdAt: string; publishedAt?: string; error?: string; remoteId?: string; source: 'ai' | 'template';
}
export interface AgentConfig {
  enabled: boolean; mode: 'review' | 'auto'; platforms: Record<Platform, boolean>; perDay: Record<Platform, number>; siteUrl: string; brand: string;
}

const FILE = 'social_agent.json';
const SITE = 'https://primepipfx.site';
const DEFAULT_IMAGE = `${SITE}/assets/you-can-do-it-1280.jpg`;
const DEFAULT_CFG: AgentConfig = {
  enabled: false, mode: 'review', platforms: { facebook: true, instagram: true, youtube: true }, perDay: { facebook: 2, instagram: 2, youtube: 1 }, siteUrl: SITE, brand: 'PRIMEPIPFX',
};
// General-audience best windows in Pakistan time (PKT, UTC+5). Defaults from common engagement patterns — adjustable, not guarantees.
export const BEST_TIMES_PKT: Record<Platform, string[]> = {
  facebook: ['13:00', '20:30', '18:30'],
  instagram: ['12:30', '21:00', '19:30'],
  youtube: ['18:00', '17:00', '20:00'],
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
export function readState() { return safeReadJsonFile<{ config: AgentConfig; posts: SocialPost[] }>(FILE, { config: DEFAULT_CFG, posts: [] }); }
function save(s: { config: AgentConfig; posts: SocialPost[] }) { s.posts = s.posts.slice(-400); safeWriteJsonFile(FILE, s); }
export function getConfig(): AgentConfig { return { ...DEFAULT_CFG, ...readState().config, platforms: { ...DEFAULT_CFG.platforms, ...readState().config?.platforms }, perDay: { ...DEFAULT_CFG.perDay, ...readState().config?.perDay } }; }
export function setConfig(patch: Partial<AgentConfig>) {
  const s = readState(); const c = getConfig();
  const next: AgentConfig = { ...c, ...patch, platforms: { ...c.platforms, ...(patch.platforms || {}) }, perDay: { ...c.perDay, ...(patch.perDay || {}) } };
  next.mode = next.mode === 'auto' ? 'auto' : 'review';
  (['facebook', 'instagram', 'youtube'] as Platform[]).forEach((p) => { next.perDay[p] = Math.max(0, Math.min(4, Math.round(Number(next.perDay[p]) || 0))); });
  s.config = next; save(s); return next;
}
export function credentialStatus() {
  const meta = !!(process.env.FB_PAGE_ID && process.env.META_PAGE_TOKEN);
  return { facebook: meta, instagram: !!(meta && process.env.IG_USER_ID), youtube: false, youtubeNote: 'YouTube has no public API for plain posts; the agent prepares a ready-to-upload package.' };
}

// ---------- compliance ----------
export function compliant(text: string): boolean { return !BANNED.some((r) => r.test(text)); }
function clean(p: Omit<SocialPost, 'id' | 'createdAt' | 'status' | 'scheduledAt'>): Omit<SocialPost, 'id' | 'createdAt' | 'status' | 'scheduledAt'> {
  let caption = p.caption.replace(/\s+\n/g, '\n').trim();
  if (!caption.includes('not financial advice')) caption += `\n\n${RISK_LINE}`;
  const tags = [...new Set(p.hashtags.map((h) => '#' + h.replace(/[^\p{L}\p{N}_]/gu, '')).filter((h) => h.length > 2))].slice(0, p.platform === 'instagram' ? 15 : 8);
  return { ...p, caption, hashtags: tags, title: p.title.slice(0, p.platform === 'youtube' ? 100 : 120) };
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

// ---------- writing ----------
function templatePost(platform: Platform, pillar: { id: string; brief: string }, cfg: AgentConfig, n: number): Omit<SocialPost, 'id' | 'createdAt' | 'status' | 'scheduledAt'> {
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
  return { platform, pillar: pillar.id, title: t.title, caption: `${t.title}\n\n${t.body}`, hashtags: [...base, ...t.tags], keywords: ['forex trading app', 'XAUUSD', 'gold trading', 'backtesting', 'PRIMEPIPFX'], cta: `Open ${url}`, imageUrl: platform === 'youtube' ? undefined : DEFAULT_IMAGE, source: 'template' };
}

async function aiPost(ai: any, platform: Platform, pillar: { id: string; brief: string }, cfg: AgentConfig, recent: string[]): Promise<Omit<SocialPost, 'id' | 'createdAt' | 'status' | 'scheduledAt'> | null> {
  if (!ai) return null;
  const rules = platform === 'instagram' ? 'Caption up to 900 characters, hook in the first line, 10-15 hashtags, link in bio style CTA (the link is not clickable).'
    : platform === 'facebook' ? 'Post up to 600 characters, conversational, include the link, 3-6 hashtags.'
    : 'Produce a YouTube video package: title under 70 characters with the main keyword near the start, description 600-1200 characters with keywords in the first two lines, the link and timestamps placeholder, 8 tags as hashtags, plus a pinned comment inside caption end.';
  const prompt = `You write social media promotion for ${cfg.brand}, a trading app by founder Wahab Zafar (${cfg.siteUrl}). Audience: forex and gold (XAUUSD) students, mostly in Pakistan and South Asia.
Platform: ${platform}. Content pillar: ${pillar.brief}
${rules}
Strict rules: never promise profits, income, win rates or guaranteed results; no "get rich"; no fake testimonials or fake numbers; be honest and motivating; do not copy other brands. Do not repeat these recent topics: ${recent.slice(0, 6).join(' | ') || 'none'}.
Return ONLY JSON: {"title":string,"caption":string,"hashtags":string[] (no # sign),"keywords":string[] (SEO search phrases),"cta":string}`;
  for (const model of ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite']) {
    try {
      const r = await Promise.race([ai.models.generateContent({ model, contents: prompt, config: { temperature: 0.9, responseMimeType: 'application/json' } }), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]) as any;
      const j = JSON.parse(String(r.text || '').replace(/^```json|```$/g, '').trim());
      if (!j?.caption || !j?.title) continue;
      if (!compliant(`${j.title} ${j.caption}`)) continue;
      return { platform, pillar: pillar.id, title: String(j.title), caption: String(j.caption), hashtags: Array.isArray(j.hashtags) ? j.hashtags.map(String) : [], keywords: Array.isArray(j.keywords) ? j.keywords.map(String).slice(0, 10) : [], cta: String(j.cta || `Open ${cfg.siteUrl}`), imageUrl: platform === 'youtube' ? undefined : DEFAULT_IMAGE, source: 'ai' };
    } catch { /* try next model */ }
  }
  return null;
}

export async function generatePosts(ai: any, opts: { platform?: Platform; count?: number } = {}): Promise<SocialPost[]> {
  const s = readState(); const cfg = getConfig();
  const platforms = (opts.platform ? [opts.platform] : (['facebook', 'instagram', 'youtube'] as Platform[])).filter((p) => cfg.platforms[p]);
  const out: SocialPost[] = [];
  const count = Math.max(1, Math.min(14, opts.count || 3));
  for (const platform of platforms) {
    for (let i = 0; i < count; i++) {
      const used = s.posts.filter((p) => p.platform === platform).slice(-PILLARS.length).map((p) => p.pillar);
      const pillar = PILLARS.find((p) => !used.includes(p.id)) || PILLARS[(s.posts.length + i) % PILLARS.length];
      const recent = s.posts.filter((p) => p.platform === platform).slice(-8).map((p) => p.title);
      const raw = (await aiPost(ai, platform, pillar, cfg, recent)) || templatePost(platform, pillar, cfg, i);
      const c = clean(raw);
      if (!compliant(`${c.title} ${c.caption}`)) continue;
      const slot = nextFreeSlot(platform, s.posts, cfg.perDay[platform]);
      const post: SocialPost = { ...c, id: crypto.randomUUID(), createdAt: now(), scheduledAt: slot.toISOString(), status: platform === 'youtube' ? 'manual' : (cfg.mode === 'auto' ? 'approved' : 'draft') };
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
    } else { throw new Error('YouTube posts are prepared as a package; upload manually in YouTube Studio.'); }
    p.status = 'published'; p.publishedAt = now(); p.error = undefined;
  } catch (e: any) { p.status = p.platform === 'youtube' ? 'manual' : 'failed'; p.error = String(e?.message || e).slice(0, 300); }
  save(s); return p;
}

export function updatePost(id: string, patch: Partial<Pick<SocialPost, 'title' | 'caption' | 'hashtags' | 'scheduledAt' | 'status'>>): SocialPost | null {
  const s = readState(); const p = s.posts.find((x) => x.id === id); if (!p) return null;
  if (patch.title != null) p.title = String(patch.title).slice(0, 120);
  if (patch.caption != null) { if (!compliant(String(patch.caption))) throw new Error('Caption contains claims that are not allowed (guarantees, income promises).'); p.caption = String(patch.caption); }
  if (Array.isArray(patch.hashtags)) p.hashtags = patch.hashtags.map(String);
  if (patch.scheduledAt && !Number.isNaN(Date.parse(patch.scheduledAt))) p.scheduledAt = new Date(patch.scheduledAt).toISOString();
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
    const due = s.posts.filter((p) => p.status === 'approved' && p.platform !== 'youtube' && cfg.platforms[p.platform] && Date.parse(p.scheduledAt) <= Date.now());
    for (const p of due) {
      const today = s.posts.filter((x) => x.platform === p.platform && x.status === 'published' && x.publishedAt && Date.now() - Date.parse(x.publishedAt) < 24 * 3600_000).length;
      if (today >= Math.max(1, cfg.perDay[p.platform])) continue;
      await publishPost(p.id);
    }
    if (cfg.mode === 'auto') {
      const fresh = readState();
      for (const platform of ['facebook', 'instagram', 'youtube'] as Platform[]) {
        if (!cfg.platforms[platform]) continue;
        const upcoming = fresh.posts.filter((p) => p.platform === platform && (p.status === 'approved' || p.status === 'draft' || p.status === 'manual') && Date.parse(p.scheduledAt) > Date.now()).length;
        if (upcoming < Math.max(2, cfg.perDay[platform] * 2)) await generatePosts(ai, { platform, count: 2 });
      }
    }
  } catch { /* keep running */ } finally { ticking = false; }
}
