/**
 * MOTIVATION — real, current, uplifting videos. No fake data.
 * Sources (all public, no paid key): YouTube channel RSS feeds of motivational speakers (newest uploads, with view counts),
 * and YouTube search for the user's topic (YouTube Data API instead when YOUTUBE_API_KEY is set — strict safe-search, embeddable only).
 * Everything is filtered: inappropriate searches return nothing, and self-harm searches get a support message instead of videos.
 */
export interface MVideo { id: string; title: string; channel: string; thumb: string; published?: string; views?: number; duration?: string; cid?: string; source: 'feed' | 'search' }

export const TOPICS = [
  'never give up', 'rise from rock bottom', 'comeback story', 'overcoming loss', 'discipline', 'morning motivation', 'success story', 'mindset shift',
  'fear to courage', 'start again', 'resilience', 'self belief', 'inspiring speech', 'hard work pays off', 'healing and growth', 'trader mindset',
  'patience and consistency', 'failure to success', 'staying strong', 'gratitude', 'focus', 'hope', 'purpose', 'overcoming anxiety',
];
const CHANNELS = ['motiversity', 'MulliganBrothers', 'EvanCarmichael', 'ImpactTheory', 'TonyRobbins', 'JayShetty', 'melrobbins', 'simonsinek', 'LewisHowes', 'goalcast', 'TED', 'TEDx', 'eddiepinero', 'BrendonBurchard', 'ToniaHarris', 'MotivationHub', 'mindvalley', 'ThomasFrank'];

const BAD = /\b(sex|sexy|porn|nude|naked|xxx|nsfw|onlyfans|erotic|fetish|escort|hookup|gore|murder|kill(ing|ed)?|rape|terror|bomb|weapon|gun|drug|cocaine|heroin|weed|cannabis|alcohol|drunk|beer|vape|gambl\w*|casino|betting|bet365|lottery|prank|roast|fight|brawl|violence|hate|racist|nazi|scam|ponzi|get rich quick|forex signals|crypto pump|trump|biden|election|politic\w*|israel|gaza|war)\b/i;
const SELFHARM = /\b(suicide|suicidal|kill myself|end my life|self[- ]?harm|cut myself|want to die|don'?t want to live|hurt myself)\b/i;
export const SUPPORT = 'You are not alone, and this moment will not last forever. If you are thinking about harming yourself, please reach out to someone you trust or a local crisis line right now — findahelpline.com lists free, confidential support in almost every country. Talking to someone can change how today feels.';
export const classifyQuery = (q: string): 'ok' | 'blocked' | 'support' => (SELFHARM.test(q) ? 'support' : BAD.test(q) ? 'blocked' : 'ok');
const MUSIC = /(lyric|lyrics|official (audio|video|music)|music video|\bsong\b|\bost\b|remix|album|instrumental|soundtrack|karaoke|\bft\.|\bfeat\.?|\bamv\b|gameplay|\bcover\b|playlist|kids?\b|nursery|\bmix\b|\bbeat\b|no copyright|copyright free|gospel|worship|\d+\s*hours?\b)/i;
const secs = (d?: string) => (d ? d.split(':').reverse().reduce((a, x, i) => a + Number(x) * 60 ** i, 0) : 0);
const GOOD = /(motivat|inspir|speech|story|transform|comeback|mindset|discipline|success|overcome|resilien|heal|struggle|rock bottom|lesson|believe)/i;
const clean = (t: string) => !BAD.test(t) && !SELFHARM.test(t);

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+cb; SOCS=CAI' };
const hard = <T,>(p: Promise<T>, ms: number): Promise<T> => new Promise<T>((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
async function get(url: string, ms = 6000): Promise<string> {
  return hard((async () => {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  })(), ms + 1500);
}
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

function walk(o: any, out: any[]) {
  if (!o || typeof o !== 'object') return;
  if (o.videoRenderer?.videoId) out.push(o.videoRenderer);
  for (const k in o) walk(o[k], out);
}
async function searchPage(q: string): Promise<MVideo[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (key) {
    const j = JSON.parse(await get(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&safeSearch=strict&videoEmbeddable=true&relevanceLanguage=en&q=${encodeURIComponent(q)}&key=${key}`));
    return (j.items || []).map((i: any) => ({ id: i.id.videoId, title: decode(i.snippet.title), channel: decode(i.snippet.channelTitle), thumb: thumb(i.id.videoId), published: i.snippet.publishedAt, source: 'search' as const }));
  }
  const html = await get(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D`, 8000);
  const m = /var ytInitialData = (\{.*?\});<\/script>/s.exec(html); if (!m) throw new Error('parse');
  const rs: any[] = []; walk(JSON.parse(m[1]), rs);
  return rs.map((r) => {
    const views = /([\d,]+)\s*views/.exec(r.viewCountText?.simpleText || '')?.[1];
    return { id: r.videoId as string, title: String(r.title?.runs?.[0]?.text || ''), channel: String(r.ownerText?.runs?.[0]?.text || ''), cid: /"browseId":"(UC[\w-]{20,24})"/.exec(JSON.stringify([r.ownerText, r.longBylineText, r.shortBylineText]))?.[1], thumb: thumb(r.videoId), duration: r.lengthText?.simpleText as string | undefined, views: views ? Number(views.replace(/,/g, '')) : undefined, source: 'search' as const };
  }).filter((v) => v.title && v.duration && !MUSIC.test(v.title) && secs(v.duration) >= 90 && secs(v.duration) <= 1800) // speeches & stories, not songs, albums or clips
    .sort((a, b) => Number(GOOD.test(b.title)) - Number(GOOD.test(a.title)));
}
const search = (q: string) => cached(`s:${q.toLowerCase()}`, 15 * 60_000, () => searchPage(q)).catch(() => [] as MVideo[]);
const shape = (q: string) => `${q} motivational speech`;

/** Endless, de-duplicated stream. offset is an index into the stream; more sources are pulled in only as needed. */
export async function stream(q: string, offset: number, limit: number) {
  const qq = q.trim().slice(0, 80);
  const sources: Array<() => Promise<MVideo[]>> = qq
    ? [() => search(shape(qq)), () => search(`${qq} true story inspiring`), () => search(`${qq} motivation video`), () => search(`${qq} comeback story`), () => search(`${qq} life lessons`), ...TOPICS.slice(0, 6).map((t) => () => search(`${qq} ${t}`))]
    : [feedPool, ...TOPICS.map((t) => () => search(`${t} motivational speech`))];
  const seen = new Set<string>(); const all: MVideo[] = []; let i = 0;
  while (all.length < offset + limit && i < sources.length) {
    for (const v of await sources[i++]()) if (!seen.has(v.id) && clean(`${v.title} ${v.channel}`)) { seen.add(v.id); all.push(v); }
  }
  if (qq && all.length === 0) { // search unavailable: fall back to matching words in real recent uploads
    const words = qq.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    for (const v of await feedPool()) if (words.some((w) => v.title.toLowerCase().includes(w))) all.push(v);
  }
  const items = all.slice(offset, offset + limit);
  return { items, next: offset + items.length, hasMore: all.length > offset + limit || i < sources.length };
}

export async function trending() {
  const pool = await feedPool();
  const cutoff = Date.now() - 30 * 86400_000;
  const hot = pool.filter((v) => v.published && Date.parse(v.published) >= cutoff && v.views).sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  return { topics: TOPICS, hot, diag };
}
