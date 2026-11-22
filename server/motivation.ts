/**
 * MOTIVATION — real, current, uplifting videos. No fake data.
 * Sources (all public, no paid key): YouTube channel RSS feeds of motivational speakers (newest uploads, with view counts),
 * and YouTube search for the user's topic (YouTube Data API instead when YOUTUBE_API_KEY is set — strict safe-search, embeddable only).
 * Everything is filtered: inappropriate searches return nothing, and self-harm searches get a support message instead of videos.
 */
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
async function get(url: string, ms = 6000): Promise<string> {
  return hard((async () => {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  })(), ms + 1500);
}
export type Vibe = 'stories' | 'sigma' | 'intense' | 'nature' | 'serene' | 'dreamy';
export const VIBES: Vibe[] = ['intense', 'dreamy', 'sigma', 'stories', 'nature', 'serene'];
/** Until the viewer has shown a taste, lean energetic & aspirational (calm is one tap away). */
const DEFAULT_W: Record<string, number> = { intense: 3, dreamy: 3, sigma: 2, stories: 1, nature: 1, serene: 0 };
interface Cfg { queries: string[]; min: number; max: number; strictMusic: boolean; extraBad?: RegExp; minViews?: number }
const CFG: Record<Vibe, Cfg> = {
  stories: { queries: TOPICS.map((t) => `${t} motivational speech`), min: 90, max: 1800, strictMusic: true },
  sigma: { queries: ['sigma mindset discipline edit', 'silent grind motivation cinematic', 'sigma edit phonk discipline', 'stoic discipline motivation', 'lone wolf mindset cinematic', 'self mastery motivation edit', 'build yourself in silence', 'gym discipline motivation edit', 'mental toughness motivation cinematic'], min: 25, max: 1200, strictMusic: true, minViews: 20000, extraBad: /(women|woman|girls?|female|simp|red ?pill|toxic|dating|pick ?up|ex[- ]girlfriend|revenge|gangster|cartel)/i },
  intense: { queries: ['thomas shelby motivation edit', 'peaky blinders mindset edit', 'dark cinematic motivation', 'boss mindset cinematic edit', 'villain arc motivation edit', 'peaky blinders discipline motivation', 'ruthless focus motivation edit', 'cinematic mafia aesthetic motivation', 'walk alone motivation cinematic', 'war mindset discipline cinematic edit'], min: 20, max: 900, strictMusic: false, minViews: 20000, extraBad: /(women|woman|girls?|female|simp|red ?pill|toxic|dating|gangster|cartel|criminal|revenge|killer)/i },
  nature: { queries: ['relaxing nature 4k', 'forest ambience relaxing', 'misty mountain sunrise cinematic', 'ocean waves relaxing', 'waterfall nature sounds', 'rain on leaves calming', 'peaceful lake morning', 'northern lights relaxing', 'autumn forest walk 4k', 'beautiful nature scenery drone'], min: 30, max: 10800, strictMusic: false },
  serene: { queries: ['calming aesthetic relaxing', 'cozy rain window ambience', 'zen garden peaceful', 'sunset timelapse relaxing', 'dreamy clouds sky calming', 'peaceful piano relaxing music', 'soft morning light aesthetic', 'cozy cabin fireplace ambience', 'lofi calm nature', 'tranquil meditation visuals'], min: 30, max: 10800, strictMusic: false },
  dreamy: { queries: ['luxury lifestyle cinematic music', 'dream cars and mansions cinematic', 'luxury villa ocean view cinematic', 'billionaire lifestyle visualization music', 'luxury mansion tour cinematic music', 'supercar luxury cinematic edit', 'rich lifestyle motivation cinematic', 'yacht life cinematic luxury', 'dream home luxury aesthetic music', 'penthouse city view luxury cinematic', 'luxury travel resort cinematic'], min: 25, max: 1500, strictMusic: false, minViews: 30000, extraBad: /(girls?|women|woman|model|party|flex|gold ?digger|prank|roast|react)/i },
};
export const VIBE_LABEL: Record<Vibe, string> = { stories: 'Stories', sigma: 'Sigma', intense: 'Intense', nature: 'Nature', serene: 'Serene', dreamy: 'Dreams' };
const LIGHT_MUSIC = /(lyric|lyrics|official (audio|video)|music video|remix|\bft\.|\bfeat\.?|karaoke|nursery|\bkids?\b)/i;
const rng = (seed: number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffled = <T,>(a: T[], seed: number): T[] => { const r = rng(seed), o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };
export const diag: Record<string, string> = {};
const memo = new Map<string, { at: number; v: any }>();
async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const h = memo.get(key); if (h && Date.now() - h.at < ttl) return h.v as T;
  try { const v = await fn(); memo.set(key, { at: Date.now(), v }); if (memo.size > 400) memo.delete(memo.keys().next().value as string); return v; }
  catch (e) { if (h) return h.v as T; throw e; }
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
  const html = await get(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=${filter === 's' ? 'EgQQARgB' : 'EgIQAQ%253D%253D'}`, 8000);
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
const search = (q: string, filter: 'v' | 's' = 'v') => cached(`s:${filter}:${q.toLowerCase()}`, 15 * 60_000, () => searchPage(q, filter)).catch(() => [] as MVideo[]);

/** Per-vibe quality gate: safe, on-theme, right length, not a song/clip dump. */
export function passes(v: MVideo, vibe: Vibe, reel: boolean): boolean {
  const cfg = CFG[vibe];
  const text = `${v.title} ${v.channel}`;
  if (!clean(text) || (cfg.extraBad && cfg.extraBad.test(text))) return false;
  if (cfg.strictMusic ? MUSIC.test(v.title) : LIGHT_MUSIC.test(v.title)) return false;
  if (cfg.minViews && v.views !== undefined && v.views < cfg.minViews) return false;
  const d = secs(v.duration);
  if (reel) return v.short ? true : d > 0 && d <= 90;
  if (v.source === 'feed') return true;
  return d >= cfg.min && d <= cfg.max && !(v.short && d < 40);
}

/** Pull one vibe's videos (de-duplicated, seeded order so every visit feels fresh) until `need` are ready. */
async function vibeStream(vibe: Vibe, seed: number, need: number, reel: boolean, q = ''): Promise<{ items: MVideo[]; done: boolean }> {
  const cfg = CFG[vibe];
  const variants = shuffled(cfg.queries, seed + VIBES.indexOf(vibe) * 97);
  const sources: Array<() => Promise<MVideo[]>> = [];
  if (q) for (const v of variants.slice(0, 6)) sources.push(() => search(`${q} ${v.split(' ').slice(0, 2).join(' ')}`, reel ? 's' : 'v'));
  else {
    if (vibe === 'stories' && !reel) sources.push(feedPool);
    for (const v of variants) sources.push(() => search(reel ? `${v} shorts` : v, reel ? 's' : 'v'));
  }
  const seen = new Set<string>(); const items: MVideo[] = []; let i = 0;
  while (items.length < need && i < sources.length) {
    const batch = (await sources[i++]()).filter((v) => passes(v, vibe, reel)).sort((a, b) => (b.views || 0) - (a.views || 0)); // best-performing first within each search
    for (const v of batch) if (!seen.has(v.id)) { seen.add(v.id); items.push({ ...v, vibe }); }
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
  const res = await Promise.all(vibes.map((v) => vibeStream(v, seed, Math.ceil((want * w[v]) / sum) + 8, reel, q).then((r) => [v, r] as const)));
  const lists: Partial<Record<Vibe, MVideo[]>> = {}; let anyMore = false;
  for (const [v, r] of res) { lists[v] = r.items; if (!r.done) anyMore = true; }
  let all = vibes.length === 1 ? (lists[vibes[0]] as MVideo[]) : mixLists(lists, w);
  if (q && all.length === 0 && !reel) { // search unavailable: match words in real recent uploads
    const words = q.toLowerCase().split(/\s+/).filter((x) => x.length > 2);
    all = (await feedPool()).filter((v) => words.some((x) => v.title.toLowerCase().includes(x)));
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
  const pool = await feedPool();
  const cutoff = Date.now() - 30 * 86400_000;
  const hot = pool.filter((v) => v.published && Date.parse(v.published) >= cutoff && v.views).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  return { topics: TOPICS, hot, diag };
}
