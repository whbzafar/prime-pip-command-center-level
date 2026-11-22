/**
 * MOTIVATION — real, current, uplifting videos. No fake data.
 * Sources (all public, no paid key): YouTube channel RSS feeds of motivational speakers (newest uploads, with view counts),
 * and YouTube search for the user's topic (YouTube Data API instead when YOUTUBE_API_KEY is set — strict safe-search, embeddable only).
 * Everything is filtered: inappropriate searches return nothing, and self-harm searches get a support message instead of videos.
 */
import zlib from 'node:zlib';
import { getShared, setShared } from './durableStore.js';
export interface MVideo { id: string; title: string; channel: string; thumb: string; published?: string; views?: number; duration?: string; cid?: string; vibe?: string; short?: boolean; source: 'feed' | 'search' }

export const TOPICS = [
  'never give up', 'rise from rock bottom', 'comeback story', 'overcoming loss', 'discipline', 'morning motivation', 'success story', 'mindset shift',
  'fear to courage', 'start again', 'resilience', 'self belief', 'inspiring speech', 'hard work pays off', 'healing and growth', 'trader mindset',
  'patience and consistency', 'failure to success', 'staying strong', 'gratitude', 'focus', 'hope', 'purpose', 'overcoming anxiety',
];
const CHANNELS = ['motiversity', 'MulliganBrothers', 'EvanCarmichael', 'ImpactTheory', 'TonyRobbins', 'JayShetty', 'melrobbins', 'simonsinek', 'LewisHowes', 'goalcast', 'TED', 'TEDx', 'eddiepinero', 'BrendonBurchard', 'ToniaHarris', 'MotivationHub', 'mindvalley', 'ThomasFrank'];

const BAD = /\b(bikini|lingerie|twerk\w*|thot|booty|strip(per|tease)?|sensual|seductive|adult|explicit|hentai|18\+|nsfw|sex|sexy|porn|nude|naked|xxx|nsfw|onlyfans|erotic|fetish|escort|hookup|gore|murder|kill(ing|ed)?|rape|terror|bomb|weapon|gun|drug|cocaine|heroin|weed|cannabis|alcohol|drunk|beer|vape|gambl\w*|casino|betting|bet365|lottery|prank|roast|fight|brawl|violence|hate|racist|nazi|scam|ponzi|get rich quick|forex signals|crypto pump|trump|biden|election|politic\w*|israel|gaza|war)\b/i;
const SELFHARM = /\b(suicide|suicidal|kill myself|end my life|self[- ]?harm|cut myself|want to die|don'?t want to live|hurt myself)\b/i;
export const SUPPORT = 'You are not alone, and this moment will not last forever. If you are thinking about harming yourself, please reach out to someone you trust or a local crisis line right now — findahelpline.com lists free, confidential support in almost every country. Talking to someone can change how today feels.';
export const classifyQuery = (q: string): 'ok' | 'blocked' | 'support' => (SELFHARM.test(q) ? 'support' : BAD.test(q) ? 'blocked' : 'ok');
const MUSIC = /(lyric|lyrics|official (audio|video|music)|music video|\bsong\b|\bost\b|remix|album|instrumental|soundtrack|karaoke|\bft\.|\bfeat\.?|\bamv\b|gameplay|\bcover\b|playlist|kids?\b|nursery|\bmix\b|\bbeat\b|no copyright|copyright free|gospel|worship|\d+\s*hours?\b)/i;
const secs = (d?: string) => (d ? d.split(':').reverse().reduce((a, x, i) => a + Number(x) * 60 ** i, 0) : 0);
const GOOD = /(motivat|inspir|speech|story|transform|comeback|mindset|discipline|success|overcome|resilien|heal|struggle|rock bottom|lesson|believe)/i;
const clean = (t: string) => !BAD.test(t) && !SELFHARM.test(t);

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+cb; SOCS=CAI; PREF=f2=8000000' };
const hard = <T,>(p: Promise<T>, ms: number): Promise<T> => new Promise<T>((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
let running = 0; const waiters: Array<() => void> = [];
const slot = async () => { if (running >= 4) await new Promise<void>((r) => waiters.push(r)); running++; };
const release = () => { running--; waiters.shift()?.(); };
async function get(url: string, ms = 6000): Promise<string> {
  await slot(); // at most 4 requests to YouTube at once — gentler on their servers, and no pile-ups
  return hard((async () => {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  })(), ms + 1500).finally(release);
}
export type Vibe = 'stories' | 'sigma' | 'intense' | 'trader' | 'nature' | 'serene' | 'dreamy';
export const VIBES: Vibe[] = ['intense', 'dreamy', 'sigma', 'trader', 'stories', 'nature', 'serene'];
/** Until the viewer has shown a taste, lean energetic & aspirational (calm is one tap away). */
const DEFAULT_W: Record<string, number> = { intense: 3, dreamy: 3, sigma: 2, trader: 2, stories: 1, nature: 1, serene: 0 };
interface Cfg { queries: string[]; min: number; max: number; strictMusic: boolean; extraBad?: RegExp; minViews?: number; must?: RegExp; prefer?: RegExp }
const CFG: Record<Vibe, Cfg> = {
  stories: { queries: TOPICS.map((t) => `${t} motivational speech`), min: 90, max: 1800, strictMusic: true },
  sigma: { queries: ['sigma mindset discipline edit', 'silent grind motivation cinematic', 'sigma edit phonk discipline', 'stoic discipline motivation', 'lone wolf mindset cinematic', 'lone wolf solo training motivation edit', 'self mastery motivation edit', 'train alone discipline aesthetic', 'gym discipline motivation edit', 'mental toughness motivation cinematic'], min: 25, max: 1200, strictMusic: true, minViews: 20000, extraBad: /(women|woman|girls?|female|simp|red ?pill|toxic|dating|pick ?up|ex[- ]girlfriend|revenge|gangster|cartel)/i },
  intense: { queries: ['thomas shelby edit motivation', 'peaky blinders edit mindset', 'tommy shelby speech edit', 'peaky blinders attitude edit', 'shelby discipline edit phonk', 'peaky blinders cinematic motivation', 'villain arc edit motivation', 'aura edit motivation cinematic', 'dark mindset phonk edit discipline', 'shelby brothers edit', 'boss mindset cinematic edit'], min: 15, max: 600, strictMusic: false, minViews: 15000, must: /(shelby|peaky|\bedit\b|cinematic|villain|phonk|dark|boss)/i, prefer: /(shelby|peaky)/i, extraBad: /(women|woman|girls?|female|simp|red ?pill|toxic|dating|gangster|cartel|criminal|revenge|killer|\bgun\b|trailer|sneak peek|netflix|official|episode|reaction)/i },
  trader: { queries: ['trading psychology discipline', 'forex trader mindset', 'how to control emotions trading', 'overcoming fear of losing trading', 'revenge trading how to stop', 'trader discipline patience consistency', 'Mark Douglas trading in the zone', 'trading mindset motivation', 'trading journal habits discipline', 'handling a losing streak trader psychology'], min: 90, max: 2400, strictMusic: true, minViews: 5000, must: /(psycholog|mindset|discipline|emotion|fear|patience|revenge|tilt|journal|consisten|risk|routine|trader|trading|losing streak|zone)/i, extraBad: /(signals?|guaranteed|100%|win ?rate|telegram|dm me|copy ?trad|payout|discount|get rich|lambo|millionaire in|\bbot\b|prediction)/i },
  nature: { queries: ['aesthetic nature cinematic 4k vertical', 'relaxing nature 4k', 'rainy night cozy fire aesthetic', 'misty mountain sunrise cinematic', 'ocean waves relaxing', 'waterfall nature sounds', 'bonsai zen aesthetic', 'northern lights relaxing', 'autumn forest walk 4k', 'beautiful nature scenery drone', 'surreal nature transitions aesthetic'], min: 30, max: 10800, strictMusic: false },
  serene: { queries: ['calming aesthetic relaxing', 'chill vibe fantasy aesthetic', 'glowing in nature aesthetic edit', 'cozy rain window ambience', 'zen garden peaceful', 'sunset timelapse relaxing', 'dreamy clouds sky calming', 'peaceful piano relaxing music', 'floating planet fantasy aesthetic', 'night drive aesthetic chill', 'tranquil meditation visuals', 'surreal dreamy aesthetic video'], min: 30, max: 10800, strictMusic: false },
  dreamy: { queries: ['luxury lifestyle cinematic edit music', 'dream cars mansions cinematic edit', 'luxury villa cinematic music aesthetic', 'billionaire lifestyle visualization music', 'luxury mansion cinematic music edit', 'supercar cinematic edit luxury music', 'rich lifestyle motivation cinematic edit', 'luxury life aesthetic edit', 'dream home luxury cinematic music', 'penthouse luxury cinematic edit', 'luxury travel cinematic edit', 'evening drive road trip cinematic aesthetic', 'night drive luxury car cinematic'], min: 20, max: 900, strictMusic: false, minViews: 30000, must: /(luxury|mansion|villa|supercar|cars?|lifestyle|dream|penthouse|yacht|billionaire|rich|aesthetic|cinematic|estate)/i, prefer: /(cinematic|edit|aesthetic|music|motivation|visuali[sz]ation)/i, extraBad: /(girls?|women|woman|model|party|flex|gold ?digger|prank|roast|react|for sale|review|price|how much|vlog|unboxing|buying|tour|\$|cost|worth)/i },
};
export const VIBE_LABEL: Record<Vibe, string> = { stories: 'Stories', sigma: 'Sigma', intense: 'Intense', nature: 'Nature', serene: 'Serene', dreamy: 'Dreams', trader: 'Trader Mind' };
const LIGHT_MUSIC = /(lyric|lyrics|official (audio|video)|music video|remix|\bft\.|\bfeat\.?|karaoke|nursery|\bkids?\b)/i;
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffled = <T,>(a: T[], seed: number): T[] => { const r = rng(seed), o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
export const diag: Record<string, string> = {};
const memo = new Map<string, { at: number; v: any }>();
const flying = new Map<string, Promise<any>>();
const HARD = 12 * 3600_000;
/** Stale-while-revalidate: fresh → instant; stale (but < 12 h) → answer instantly from the old copy and refresh in the background; empty → wait once. */
async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const h = memo.get(key); const age = h ? Date.now() - h.at : Infinity;
  if (h && age < ttl) return h.v as T;
  const refresh = (): Promise<T> => {
    let p = flying.get(key); if (p) return p;
    p = fn().then((v) => { memo.set(key, { at: Date.now(), v }); if (memo.size > 700) memo.delete(memo.keys().next().value as string); return v; }).finally(() => flying.delete(key));
    flying.set(key, p); return p;
  };
  if (h && age < HARD) { void refresh().catch(() => undefined); return h.v as T; }
  try { return await refresh(); } catch (e) { if (h) return h.v as T; throw e; }
}
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** Reads only the start of a channel page (the id is in the first few KB), then stops — big channel pages are slow to download whole. */
async function channelId(handle: string): Promise<string | null> {
  return cached(`ch:${handle}`, 30 * 86400_000, async () => {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 14000);
    try {
      const r = await fetch(`https://www.youtube.com/@${handle}`, { headers: UA, signal: ctl.signal });
      if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
      const reader = r.body.getReader(); const dec = new TextDecoder(); let buf = '';
      for (let n = 0; n < 60; n++) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const m = /(?:channel_id=|\/channel\/|"channelId":"|"externalId":")(UC[\w-]{20,24})/.exec(buf);
        if (m) { void reader.cancel().catch(() => undefined); return m[1]; }
        if (buf.length > 900_000) break;
      }
      void reader.cancel().catch(() => undefined);
      throw new Error('no id');
    } finally { clearTimeout(timer); }
  }).catch((e) => { diag[handle] = `id: ${e?.message}`; return null; });
}
async function feed(handle: string): Promise<MVideo[]> {
  const id = /^UC[\w-]{20,24}$/.test(handle) ? handle : await channelId(handle); if (!id) return [];
  return cached(`feed:${id}`, 30 * 60_000, async () => {
    const xml = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
    const out: MVideo[] = [];
    for (const e of xml.split('<entry>').slice(1)) {
      const vid = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(e)?.[1]; const title = /<title>([^<]*)<\/title>/.exec(e)?.[1];
      if (!vid || !title) continue;
      const t = decode(title);
      if (!clean(t) || /#shorts?\b/i.test(t)) continue;
      out.push({ id: vid, title: t, channel: decode(/<author>\s*<name>([^<]*)<\/name>/.exec(e)?.[1] || handle), thumb: thumb(vid), published: /<published>([^<]*)<\/published>/.exec(e)?.[1], views: Number(/<media:statistics views="(\d+)"/.exec(e)?.[1] || 0) || undefined, source: 'feed' });
    }
    diag[handle] = `ok ${out.length}`;
    return out;
  }).catch((e) => { diag[handle] = `feed: ${e?.message}`; return [] as MVideo[]; });
}
/** Channels that YouTube itself ranks for motivational speeches — found by search, so no handle lookups needed. */
const discovered = () => cached('disc', 6 * 3600_000, async () => {
  const seeds = ['motivational speech', 'inspirational story never give up', 'rise from rock bottom motivation', 'powerful motivation video'];
  const ids = new Map<string, number>();
  for (const v of (await Promise.all(seeds.map((q) => search(q)))).flat()) if (v.cid && GOOD.test(v.title)) ids.set(v.cid, (ids.get(v.cid) || 0) + 1);
  return [...ids.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([id]) => id);
}).catch(() => [] as string[]);
/** Never waits: the cached channel pool (or nothing yet) while a refresh runs in the background. */
const poolNow = (): MVideo[] => { const h = memo.get('pool'); if (!h || Date.now() - h.at > 20 * 60_000) void feedPool().catch(() => undefined); return (h?.v as MVideo[]) || []; };
const feedPool = (): Promise<MVideo[]> => cached('pool', 20 * 60_000, async () => {
  const targets = [...new Set([...(await discovered()), ...CHANNELS])];
  const lists = await Promise.all(targets.map((h) => hard(feed(h), 10000).catch(() => [] as MVideo[])));
  if (lists.filter((l) => l.length).length < 6) setTimeout(() => memo.delete('pool'), 45_000); // too thin — retry soon rather than hold for 20 min
  const ids = new Set<string>(); const out: MVideo[] = [];
  const rows = lists.map((l) => [...l].sort((a, b) => String(b.published).localeCompare(String(a.published))));
  for (let i = 0; i < 12; i++) for (const r of rows) { const v = r[i]; if (v && !ids.has(v.id)) { ids.add(v.id); out.push(v); } } // round-robin: newest first, no channel dominates
  return out;
});

function walk(o: any, out: any[], reels: any[]) {
  if (!o || typeof o !== 'object') return;
  if (o.videoRenderer?.videoId) out.push(o.videoRenderer);
  if (o.shortsLockupViewModel) reels.push(o.shortsLockupViewModel);
  if (o.reelItemRenderer?.videoId) reels.push(o.reelItemRenderer);
  for (const k in o) walk(o[k], out, reels);
}
/** Raw results (filtering happens per vibe). filter: 'v' = videos, 's' = videos under 4 min incl. Shorts. */
async function searchPage(q: string, filter: 'v' | 's'): Promise<MVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    const j = JSON.parse(await get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&safeSearch=strict&videoEmbeddable=true${filter === 's' ? '&videoDuration=short' : ''}&relevanceLanguage=en&q=${encodeURIComponent(q)}&key=${key}`));
    return (j.items || []).map((i: any) => ({ id: i.id.videoId, title: decode(i.snippet.title), channel: decode(i.snippet.channelTitle), thumb: thumb(i.id.videoId), published: i.snippet.publishedAt, source: 'search' as const }));
  }
  const html = await get(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=${filter === 's' ? 'EgIYAQ%253D%253D' : 'EgIQAQ%253D%253D'}`, 8000);
  const m = /var ytInitialData = (\{.*?\});<\/script>/s.exec(html); if (!m) throw new Error('parse');
  const rs: any[] = [], reels: any[] = []; walk(JSON.parse(m[1]), rs, reels);
  const out: MVideo[] = rs.map((r) => {
    const views = /([\d,]+)\s*views/.exec(r.viewCountText?.simpleText || '')?.[1];
    return { id: r.videoId as string, title: String(r.title?.runs?.[0]?.text || ''), channel: String(r.ownerText?.runs?.[0]?.text || ''), cid: /"browseId":"(UC[\w-]{20,24})"/.exec(JSON.stringify([r.ownerText, r.longBylineText, r.shortBylineText]))?.[1], thumb: thumb(r.videoId), duration: r.lengthText?.simpleText as string | undefined, views: views ? Number(views.replace(/,/g, '')) : undefined, source: 'search' as const };
  }).filter((v) => v.title && v.duration);
  for (const r of reels) { // YouTube Shorts shelves
    const j = JSON.stringify(r); const id = /"videoId":"([\w-]{11})"/.exec(j)?.[1];
    const title = String(r.headline?.simpleText || r.overlayMetadata?.primaryText?.content || r.accessibilityText || '').split(', ')[0];
    if (id && title) out.push({ id, title, channel: '', thumb: thumb(id), short: true, duration: '0:30', source: 'search' });
  }
  return out;
}
const search = (q: string, filter: 'v' | 's' = 'v') => cached(`s:${filter}:${q.toLowerCase()}`, 40 * 60_000, () => searchPage(q, filter)).catch((e) => { diag[`search:${filter}`] = `${q} → ${e?.message}`; return [] as MVideo[]; });

/** Per-vibe quality gate: safe, on-theme, right length, not a song/clip dump. */
export function passes(v: MVideo, vibe: Vibe, reel: boolean): boolean {
  const cfg = CFG[vibe];
  const text = `${v.title} ${v.channel}`;
  if (!clean(text) || (cfg.extraBad && cfg.extraBad.test(text))) return false;
  if (cfg.strictMusic ? MUSIC.test(v.title) : LIGHT_MUSIC.test(v.title)) return false;
  if (cfg.must && !cfg.must.test(text)) return false;
  if (cfg.minViews && v.views !== undefined && v.views < cfg.minViews) return false;
  const d = secs(v.duration);
  if (reel) return v.short ? true : d > 0 && d <= 90;
  if (v.source === 'feed') return true;
  return d >= cfg.min && d <= cfg.max && !(v.short && d < 40);
}

/** Pull one vibe's videos (de-duplicated, seeded order so every visit feels fresh) until `need` are ready. */
async function vibeStream(vibe: Vibe, seed: number, need: number, reel: boolean, q = '', deadline = Date.now() + 10_000): Promise<{ items: MVideo[]; done: boolean }> {
  const cfg = CFG[vibe];
  const variants = shuffled(cfg.queries, seed + VIBES.indexOf(vibe) * 97);
  const sources: Array<() => Promise<MVideo[]>> = [];
  if (q) for (const v of variants.slice(0, 6)) sources.push(() => search(`${q} ${v.split(' ').slice(0, 2).join(' ')}`, reel ? 's' : 'v'));
  else {
    if (vibe === 'stories' && !reel) sources.push(async () => poolNow());
    for (const v of variants) sources.push(() => search(reel ? `${v} shorts` : v, reel ? 's' : 'v'));
  }
  const seen = new Set<string>(); const items: MVideo[] = []; let i = 0;
  while (items.length < need && i < sources.length && Date.now() < deadline) {
    const group = sources.slice(i, i + 3); i += group.length; // three searches at once keeps first load quick
    // time-boxed: a slow search can't hold the page hostage — it keeps running and lands in the cache for the next request
    for (const raw of await Promise.all(group.map((f) => hard(f(), Math.max(2000, deadline - Date.now())).catch(() => [] as MVideo[])))) {
    const batch = raw.filter((v) => passes(v, vibe, reel)).sort((a, b) => Number(!!cfg.prefer?.test(b.title)) - Number(!!cfg.prefer?.test(a.title)) || (b.views || 0) - (a.views || 0)); // on-theme first, then best-performing, within each search
    for (const v of batch) if (!seen.has(v.id)) { seen.add(v.id); items.push({ ...v, vibe }); }
    }
  }
  return { items, done: i >= sources.length };
}

/** Smooth weighted round-robin: higher-weight vibes appear more, every vibe still shows up (discovery). */
export function mixLists(lists: Partial<Record<Vibe, MVideo[]>>, w: Record<string, number>): MVideo[] {
  const keys = (Object.keys(lists) as Vibe[]).filter((k) => lists[k]?.length);
  const cur: Record<string, number> = {}; const idx: Record<string, number> = {}; const out: MVideo[] = []; const seen = new Set<string>();
  keys.forEach((k) => { cur[k] = 0; idx[k] = 0; });
  for (;;) {
    const live = keys.filter((k) => idx[k] < (lists[k] as MVideo[]).length); if (!live.length) break;
    const total = live.reduce((a, k) => a + (w[k] || 1), 0); let best = live[0];
    for (const k of live) { cur[k] += w[k] || 1; if (cur[k] > cur[best]) best = k; }
    cur[best] -= total;
    const v = (lists[best] as MVideo[])[idx[best]++]; if (!seen.has(v.id)) { seen.add(v.id); out.push(v); }
  }
  return out;
}

export interface StreamOpts { q?: string; vibe?: string; reel?: boolean; seed?: number; weights?: Record<string, number>; offset: number; limit: number }
/** Endless feed. vibe = one vibe, or 'foryou' (all, weighted by the viewer's taste). offset indexes the stream. */
export async function stream(o: StreamOpts) {
  const q = (o.q || '').trim().slice(0, 80); const reel = !!o.reel; const seed = o.seed || 1;
  const want = o.offset + o.limit;
  const vibes: Vibe[] = (VIBES as string[]).includes(o.vibe || '') ? [o.vibe as Vibe] : VIBES;
  const given = o.weights && Object.keys(o.weights).length ? o.weights : DEFAULT_W;
  const w: Record<string, number> = {}; for (const v of vibes) w[v] = 1 + Math.min(10, Math.max(0, Number(given[v]) || 0));
  const sum = vibes.reduce((a, v) => a + w[v], 0);
  const deadline = Date.now() + 8_000;
  const res = await Promise.all(vibes.map((v) => vibeStream(v, seed, Math.ceil((want * w[v]) / sum) + 3, reel, q, deadline).then((r) => [v, r] as const)));
  const lists: Partial<Record<Vibe, MVideo[]>> = {}; let anyMore = false;
  for (const [v, r] of res) { lists[v] = r.items; if (!r.done) anyMore = true; }
  let all = vibes.length === 1 ? (lists[vibes[0]] as MVideo[]) : mixLists(lists, w);
  if (q && all.length === 0 && !reel) { // search unavailable: match words in real recent uploads
    const words = q.toLowerCase().split(/\s+/).filter((x) => x.length > 2);
    all = poolNow().filter((v) => words.some((x) => v.title.toLowerCase().includes(x)));
  }
  const items = all.slice(o.offset, want);
  return { items, next: o.offset + items.length, hasMore: all.length > want || (anyMore && items.length > 0) };
}

const STOP = new Set(['the', 'and', 'for', 'with', 'your', 'you', 'this', 'that', 'from', 'what', 'how', 'why', 'video', 'official', 'best', 'new', 'most', 'powerful', 'motivational', 'speech']);
/** "More like this": real videos matching the topic words of what the viewer just watched. */
export async function similar(title: string, vibe: string, limit = 10) {
  const vb: Vibe = (VIBES as string[]).includes(vibe) ? (vibe as Vibe) : 'stories';
  const words = title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)).slice(0, 3).join(' ');
  if (!words || !clean(words)) return [];
  const raw = await search(`${words} ${CFG[vb].queries[0].split(' ').slice(0, 2).join(' ')}`);
  return raw.filter((v) => passes(v, vb, false) && v.title !== title).map((v) => ({ ...v, vibe: vb })).slice(0, limit);
}

export async function trending() {
  const pool = poolNow();
  const cutoff = Date.now() - 30 * 86400_000;
  const hot = pool.filter((v) => v.published && Date.parse(v.published) >= cutoff && v.views).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  return { topics: TOPICS, hot, diag };
}

const SNAP_KEY = 'motivation_cache_v1';
async function restore() {
  try {
    const snap = await getShared<{ at: number; z: string } | null>(SNAP_KEY, null, 0);
    if (!snap?.z || Date.now() - snap.at > HARD) return;
    const data = JSON.parse(zlib.gunzipSync(Buffer.from(snap.z, 'base64')).toString('utf8')) as Record<string, { at: number; v: any }>;
    for (const [k, e] of Object.entries(data)) if (!memo.has(k) && Date.now() - e.at < HARD) memo.set(k, e);
  } catch { /* no snapshot yet */ }
}
async function persist() {
  try {
    const out: Record<string, { at: number; v: any }> = {};
    for (const [k, e] of memo) if (k.startsWith('s:') || k === 'pool') out[k] = { at: e.at, v: (e.v as MVideo[]).map(({ id, title, channel, duration, views, cid, short, published, source }) => ({ id, title, channel, thumb: thumb(id), duration, views, cid, short, published, source })) };
    const z = zlib.gzipSync(Buffer.from(JSON.stringify(out), 'utf8')).toString('base64');
    if (z.length < 900_000) await setShared(SNAP_KEY, { at: Date.now(), z });
  } catch { /* best effort */ }
}
/** Fill the caches in the background (slowly), restoring last run's copy first so even a cold start answers instantly. */
let warming = false;
export async function prewarm() {
  if (warming) return; warming = true;
  try {
    await restore();
    void feedPool().catch(() => undefined);
    for (const v of VIBES) for (const q of CFG[v].queries) { await search(q); await search(`${q} shorts`, 's'); await new Promise((r) => setTimeout(r, 250)); }
    await persist();
  } catch { /* best effort */ } finally { warming = false; }
}
