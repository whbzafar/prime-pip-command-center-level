import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';
import { compliant, readState as readAgent } from './socialAgent.js';

/* Social Brain: the owner's brand memory, the quality gate every post must pass, per-post performance records,
   an adaptive weekly calendar, a weekly report built only from logged numbers, community triage and campaign planning.
   Rule: nothing here invents a trend, a statistic, a price, a feature or a result. Figures come only from what the owner entered. */

type Plat = 'facebook' | 'instagram' | 'youtube' | 'tiktok';
export const PLATFORMS: Plat[] = ['facebook', 'instagram', 'youtube', 'tiktok'];
export const WEEK_PLAN = ['educational-video', 'promotional-poster', 'interesting-facts', 'short-form-video', 'community-engagement', 'brand-advertisement', 'weekly-highlights'] as const;
export type ContentType = (typeof WEEK_PLAN)[number];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FORMULA = 'Engagement = (2 × saves + 3 × shares + 2 × comments + profile visits) ÷ views. This is our own weighting for your records, not an industry score.';

export interface Brand { name: string; site: string; founder: string; logoUrl: string; colors: string[]; typography: string; voice: string; slogans: string[]; audience: string; products: string[]; allowedFigures: string[]; guidelines: string[] }
export interface Perf { id: string; postId: string; platform: Plat; contentType: ContentType; at: string; views: number; saves: number; shares: number; comments: number; completion: number; followerGain: number; profileVisits: number }
interface State { brand: Brand; perf: Perf[] }

const FILE = 'social_brain.json';
const DEFAULT_BRAND: Brand = { name: 'PRIMEPIPFX', site: 'https://primepipfx.site', founder: 'Wahab Zafar', logoUrl: '', colors: [], typography: '', voice: 'Clear, honest, encouraging. Educational, never hype.', slogans: [], audience: '', products: [], allowedFigures: [], guidelines: ['Never promise profit or guaranteed results.', 'Always include the educational risk line.'] };
const lines = (v: unknown, max = 20, len = 160) => (Array.isArray(v) ? v : String(v ?? '').split('\n')).map((x) => String(x).trim().slice(0, len)).filter(Boolean).slice(0, max);
const one = (v: unknown, len = 200) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, len);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export function readBrain(): State {
  const st = safeReadJsonFile<State>(FILE, { brand: DEFAULT_BRAND, perf: [] });
  return { brand: { ...DEFAULT_BRAND, ...(st.brand || {}) }, perf: Array.isArray(st.perf) ? st.perf : [] };
}
function write(s: State) { s.perf = s.perf.slice(-2000); safeWriteJsonFile(FILE, s); }

export function saveBrand(input: any): Brand {
  const s = readBrain(); const site = one(input.site, 120);
  s.brand = { name: one(input.name, 60) || DEFAULT_BRAND.name, site: /^https:\/\//.test(site) ? site.replace(/\/$/, '') : DEFAULT_BRAND.site, founder: one(input.founder, 80), logoUrl: one(input.logoUrl, 300), colors: lines(input.colors, 8, 20), typography: one(input.typography, 120), voice: one(input.voice, 300), slogans: lines(input.slogans, 10, 120), audience: one(input.audience, 300), products: lines(input.products, 20, 120), allowedFigures: lines(input.allowedFigures, 40, 40), guidelines: lines(input.guidelines, 15, 200) };
  write(s); return s.brand;
}

export function logPerf(input: any): { ok: boolean; error?: string; record?: Perf } {
  const plat = PLATFORMS.includes(input.platform) ? input.platform : null;
  const ct = (WEEK_PLAN as readonly string[]).includes(input.contentType) ? input.contentType as ContentType : null;
  if (!plat) return { ok: false, error: 'Choose a platform.' };
  if (!ct) return { ok: false, error: 'Choose a content type.' };
  const n = (v: unknown, max = 1e12) => { const x = Number(v ?? 0); return Number.isFinite(x) && x >= 0 ? Math.min(max, Math.floor(x)) : NaN; };
  const vals = { views: n(input.views), saves: n(input.saves), shares: n(input.shares), comments: n(input.comments), completion: n(input.completion, 100), profileVisits: n(input.profileVisits), followerGain: Number(input.followerGain ?? 0) };
  if (Object.values(vals).some((v) => Number.isNaN(v))) return { ok: false, error: 'Numbers must be zero or more. Copy them from the platform analytics.' };
  const s = readBrain(); const record: Perf = { id: `pf_${Date.now().toString(36)}`, postId: one(input.postId, 80), platform: plat, contentType: ct, at: new Date().toISOString(), ...vals };
  s.perf.push(record); write(s); return { ok: true, record };
}

export const rate = (p: Perf) => (p.saves * 2 + p.shares * 3 + p.comments * 2 + p.profileVisits) / Math.max(p.views, 1);
function groupRates(list: Perf[]) {
  const m = new Map<ContentType, { type: ContentType; n: number; sum: number }>();
  for (const p of list) { const g = m.get(p.contentType) || { type: p.contentType, n: 0, sum: 0 }; g.n++; g.sum += rate(p); m.set(p.contentType, g); }
  return Array.from(m.values()).map((g) => ({ type: g.type, n: g.n, avg: g.sum / g.n }));
}

/** Weekly report built only from logged records. Below 5 posts it refuses to conclude anything. */
export function reportFrom(perf: Perf[], now = Date.now()) {
  const week = perf.filter((p) => now - Date.parse(p.at) < 7 * 864e5);
  if (week.length < 5) return { enough: false as const, records: week.length, message: `Log at least 5 posts from the last 7 days to get a report. You have ${week.length}. The agent does not guess.` };
  const groups = groupRates(week).filter((g) => g.n >= 2).sort((a, b) => b.avg - a.avg);
  const tested = WEEK_PLAN.find((t) => !week.some((p) => p.contentType === t)) || null;
  const out: string[] = [];
  if (groups[0]) out.push(`Repeat ${groups[0].type}: engagement ${pct(groups[0].avg)} across ${groups[0].n} posts.`);
  if (groups.length > 1) { const low = groups[groups.length - 1]; out.push(`Reduce ${low.type}: engagement ${pct(low.avg)} across ${low.n} posts.`); }
  if (tested) out.push(`Test next: ${tested}, which has no posts logged this week.`);
  if (!groups.length) out.push('No content type has 2 or more posts yet, so there is nothing to compare.');
  const followers = week.reduce((a, p) => a + p.followerGain, 0);
  out.push(`Follower change this week (your records): ${followers >= 0 ? '+' : ''}${followers}.`);
  return { enough: true as const, records: week.length, lines: out, formula: FORMULA };
}
export const weeklyReport = (now = Date.now()) => reportFrom(readBrain().perf, now);

/** Calendar follows the owner's weekly rhythm; it swaps in the best-performing type only when the records support it (3+ posts each). */
export function planFrom(perf: Perf[]) {
  const ranked = groupRates(perf).filter((g) => g.n >= 3).sort((a, b) => b.avg - a.avg);
  const days = WEEK_PLAN.map((contentType, i) => ({ day: DAYS[i], contentType, changed: false }));
  if (ranked.length < 2) return { basis: 'default' as const, note: 'Default weekly rhythm. Log at least 3 posts for two content types and the plan adapts to your results.', days };
  const top = ranked[0]; const low = ranked[ranked.length - 1]; const d = days.find((x) => x.contentType === low.type);
  if (d && top.type !== low.type) { d.contentType = top.type; d.changed = true; }
  return { basis: 'performance' as const, note: `${d?.day ?? 'One day'}: ${low.type} is replaced by ${top.type}, because its engagement in your records is ${pct(top.avg)} against ${pct(low.avg)}.`, days };
}
export const weeklyPlan = () => planFrom(readBrain().perf);

// ---------- quality gate ----------
const FIG = /(\$\s?\d[\d,.]*|\d[\d,.]*\s?(?:%|pips?|pairs|followers|students|users|traders|years|days|k\b|x\b))/gi;
export const extractFigures = (t: string) => Array.from(t.matchAll(FIG), (m) => m[0].trim());
const toks = (s: string) => new Set(s.toLowerCase().replace(/https?:\/\/\S+/g, '').split(/[^a-z0-9]+/).filter((w) => w.length > 2));
export function similarity(a: string, b: string) { const A = toks(a); const B = toks(b); if (!A.size || !B.size) return 0; let i = 0; A.forEach((w) => { if (B.has(w)) i++; }); return i / (A.size + B.size - i); }
export interface QCInput { platform: string; title?: string; caption: string; hashtags?: string[]; hooks?: string[]; cta?: string; video?: { width: number; height: number; durationSec: number } }
export function qualityCheck(input: QCInput, existing: string[] = [], brand: Brand = readBrain().brand) {
  const blockers: string[] = []; const warnings: string[] = [];
  const text = `${input.title || ''}\n${input.caption || ''}\n${input.cta || ''}\n${(input.hooks || []).join('\n')}`;
  if (!input.caption?.trim()) blockers.push('The caption is empty.');
  if (!compliant(text)) blockers.push('Contains a claim platforms penalise or that promises results (profit, guaranteed, risk-free). Remove it.');
  const host = brand.site.replace(/^https?:\/\//, '');
  if (!text.includes(host)) blockers.push(`Missing the official link ${host}.`);
  if (!/not financial advice/i.test(text)) blockers.push('Missing the risk line: "Educational content, not financial advice. Trading carries risk."');
  const allowed = brand.allowedFigures.map((a) => a.toLowerCase());
  for (const f of extractFigures(text)) if (!allowed.some((a) => f.toLowerCase().includes(a) || a.includes(f.toLowerCase()))) blockers.push(`Unverified figure "${f}". Add it to Brand memory only if it is true.`);
  const top = existing.length ? Math.max(...existing.map((e) => similarity(e, input.caption || ''))) : 0;
  if (top >= 0.8) blockers.push(`Too similar (${Math.round(top * 100)}%) to a post already made. Change the wording or topic.`);
  const hashLimit = input.platform === 'instagram' ? 15 : 8;
  if ((input.hashtags || []).length > hashLimit) warnings.push(`${(input.hashtags || []).length} hashtags; ${input.platform} works best with ${hashLimit} or fewer.`);
  if (input.hooks?.[0] && input.hooks[0].split(/\s+/).length > 12) warnings.push('The first hook is long. Keep it to 12 words or fewer.');
  if (input.video) {
    const r = input.video.height / input.video.width;
    if ((input.platform === 'tiktok' || input.platform === 'instagram') && Math.abs(r - 16 / 9) > 0.05) warnings.push('TikTok and Reels are 9:16 (vertical). This video is not.');
    if (input.video.durationSec < 3) blockers.push('The video is shorter than 3 seconds.');
    if (input.video.durationSec > 180) warnings.push('Over 3 minutes: check the platform limit for this format.');
  }
  return { pass: blockers.length === 0, blockers, warnings };
}

// ---------- community triage (drafts only; sensitive items go to a human) ----------
const SPAM = /(https?:\/\/|bit\.ly|t\.me\/|whatsapp\s*me|dm me|inbox me|earn (money|daily)|guaranteed|double your|free signals|join my group)/i;
const COMPLAINT = /\b(scam|fraud|cheat|cheated|refund|lost (my )?money|fake|not working|doesn'?t work|bug|error|crash|worst|bakwas|dhoka|pareshan)\b/i;
const INTEREST = /\b(price|cost|buy|purchase|subscribe|join|enroll|plan|kitna|kitne|payment|pay)\b/i;
const QUESTION = /\?|\b(how|what|when|where|why|which|can i|kya|kaise|kab|kahan|kyun|kon)\b/i;
const FEEDBACK = /\b(great|nice|love|thanks|thank you|awesome|good|helpful|shukriya|zabardast|mast|best)\b/i;
const PERSONAL = /(\+?\d[\d\s-]{8,}\d|[\w.+-]+@[\w-]+\.\w+|account number|password|cnic)/i;
const FIN = /\b(deposit|withdraw|account|broker|invest|money|paisa|transfer|payment)\b/i;
export type CommentCat = 'spam' | 'complaint' | 'interest' | 'question' | 'feedback' | 'other';
function draftReply(cat: CommentCat, ur: boolean, site: string): string | null {
  const m: Record<CommentCat, [string, string] | null> = {
    question: [`Thanks for asking! Full details are at ${site}. Which part should we explain next?`, `Shukriya! Mukammal tafseel ${site} par hai. Kis hissay ki wazahat chahiye?`],
    complaint: [`We're sorry you had this experience. Please message us through ${site} so the team can look at it directly.`, `Maafi chahte hain. Baraye meherbani ${site} par message karein, team khud dekhegi.`],
    interest: [`Thank you for your interest! Pricing and enrolment details are on ${site}. Our team will confirm anything specific.`, `Dilchaspi ka shukriya! Price aur enrolment ki tafseel ${site} par hai. Kuch khaas pooch na ho to team confirm karegi.`],
    feedback: ['Thank you, that means a lot! Which feature helps you most?', 'Shukriya! Kaunsi feature sab se zyada kaam ki lagi?'],
    other: [`Thanks for watching! Everything is at ${site}.`, `Dekhne ka shukriya! Sab kuch ${site} par hai.`],
    spam: null,
  };
  const v = m[cat]; return v ? (ur ? v[1] : v[0]) : null;
}
export function classifyComments(items: string[], brand: Brand = readBrain().brand) {
  return items.slice(0, 100).map((raw) => {
    const t = String(raw).slice(0, 500);
    const cat: CommentCat = SPAM.test(t) ? 'spam' : COMPLAINT.test(t) ? 'complaint' : INTEREST.test(t) ? 'interest' : QUESTION.test(t) ? 'question' : FEEDBACK.test(t) ? 'feedback' : 'other';
    const ur = /\b(kya|kaise|kab|shukriya|mujhe|hai|nahi|kitna|kitne)\b/i.test(t);
    const flags: string[] = [];
    if (PERSONAL.test(t)) flags.push('contains personal details: do not reply with them');
    if (cat === 'spam') flags.push('likely spam: hide or report');
    const needsHuman = cat === 'complaint' || cat === 'interest' || PERSONAL.test(t) || (cat === 'question' && FIN.test(t));
    return { text: t, category: cat, needsHuman, flags, language: ur ? 'roman-urdu' : 'en', reply: draftReply(cat, ur, brand.site) };
  });
}

// ---------- campaign plan (no invented audience, targets or results) ----------
export function campaign(sentence: string, topics: { id: string; title: string; short: string; features: string[] }[], brand: Brand = readBrain().brand) {
  const goal = one(sentence, 240);
  const calendar = WEEK_PLAN.map((ct, i) => {
    const t = topics.length ? topics[i % topics.length] : null; const plat: Plat = PLATFORMS[i % 4];
    const body = t ? `${t.title}: ${t.short}` : 'Add features in the app to generate topic posts.';
    const caption = `${body}\n\nExplore it at ${brand.site}\n\nEducational content, not financial advice. Trading carries risk.`;
    return { day: DAYS[i], contentType: ct, platform: plat, topic: t?.title || null, caption, qc: qualityCheck({ platform: plat, caption, cta: brand.site }, [], brand) };
  });
  return {
    goal,
    audience: brand.audience || 'Not set yet. Add it in Brand memory; the campaign will not guess an audience.',
    strategy: [`Goal: ${goal}`, `Core message: what ${brand.name} does, using only the features listed in the app.`, 'Rhythm: the weekly plan, adjusted once your performance records support it.'],
    calendar,
    videoConcepts: topics.slice(0, 5).map((t) => `${t.title}: 15–30 second screen tour that opens on the feature's own purpose.`),
    graphics: topics.slice(0, 5).map((t) => `Framed screenshot card: ${t.title}`),
    performanceTargets: 'Set your own targets. The agent reports actual numbers and does not invent targets.',
  };
}

// ---------- content library + approval queue ----------
export type AssetStatus = 'draft' | 'blocked' | 'approved' | 'rejected' | 'published';
export interface Asset { id: string; title: string; platform: string; topic: string; text: string; hooks: string[]; cta: string; hashtags: string[]; status: AssetStatus; qc: ReturnType<typeof qualityCheck>; createdAt: string; updatedAt: string; history: { at: string; from: string; to: string; note?: string }[] }
const LIB_FILE = 'social_library.json';
export function readLibrary(): Asset[] { const v = safeReadJsonFile<Asset[]>(LIB_FILE, []); return Array.isArray(v) ? v : []; }
function writeLibrary(list: Asset[]) { safeWriteJsonFile(LIB_FILE, list.slice(-1000)); }

/** Pure: builds a library item and its gate result. A blocked item is kept so the owner can see why, but it cannot be approved. */
export function buildAsset(input: any, existingTexts: string[], brand: Brand, now = new Date().toISOString()): Asset {
  const platform = PLATFORMS.includes(input.platform) ? input.platform : 'instagram';
  const text = String(input.text || input.caption || '').slice(0, 2500);
  const hooks = lines(input.hooks, 4, 160); const hashtags = lines(input.hashtags, 15, 40).map((h) => h.replace(/^#/, ''));
  const cta = one(input.cta, 120);
  const qc = qualityCheck({ platform, title: one(input.title, 120), caption: text, hashtags, hooks, cta }, existingTexts, brand);
  return { id: `as_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title: one(input.title, 120) || `${platform} post`, platform, topic: one(input.topic, 120), text, hooks, cta, hashtags, status: qc.pass ? 'draft' : 'blocked', qc, createdAt: now, updatedAt: now, history: [{ at: now, from: 'new', to: qc.pass ? 'draft' : 'blocked' }] };
}

const NEXT: Record<AssetStatus, AssetStatus[]> = { draft: ['approved', 'rejected'], blocked: ['rejected'], approved: ['published', 'rejected', 'draft'], rejected: ['draft'], published: [] };
/** Pure: the only allowed moves. Approval needs a passing gate; publishing needs prior approval. */
export function transition(a: Asset, to: AssetStatus, note?: string, now = new Date().toISOString()): { ok: boolean; error?: string; asset?: Asset } {
  if (!NEXT[a.status].includes(to)) return { ok: false, error: `Cannot move from ${a.status} to ${to}.` };
  if (to === 'approved' && !a.qc.pass) return { ok: false, error: 'This asset is blocked by the quality gate. Fix the blockers, then save it again as a new asset.' };
  return { ok: true, asset: { ...a, status: to, updatedAt: now, history: [...a.history, { at: now, from: a.status, to, note }] } };
}

export function addAsset(input: any) {
  const b = readBrain().brand; const list = readLibrary();
  const dup = list.filter((x) => x.status !== 'rejected').map((x) => x.text);
  const asset = buildAsset(input, dup, b); writeLibrary([asset, ...list]); return asset;
}
export function moveAsset(id: string, to: AssetStatus, note?: string) {
  const list = readLibrary(); const a = list.find((x) => x.id === id); if (!a) return { ok: false, error: 'Not found' };
  const r = transition(a, to, note); if (!r.ok || !r.asset) return r;
  writeLibrary(list.map((x) => (x.id === id ? r.asset! : x))); return r;
}
export function removeAsset(id: string) { writeLibrary(readLibrary().filter((x) => x.id !== id)); }
