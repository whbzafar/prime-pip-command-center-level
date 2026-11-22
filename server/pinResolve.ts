/**
 * Resolve a Pinterest pin link (pin.it short link or pinterest.com/pin/...) into a playable record: id, title, poster and video files.
 * SSRF-safe: only Pinterest hosts are fetched, redirects are followed manually and re-checked at every hop.
 */
export interface PinRec { id: string; title: string; poster: string; srcs: string[]; vibe: string }
const OK_HOST = /^(?:[\w-]+\.)*(?:pinterest\.[a-z.]{2,6}|pin\.it)$/i;
export const hostAllowed = (u: string): boolean => { try { const x = new URL(u); return x.protocol === 'https:' && OK_HOST.test(x.hostname); } catch { return false; } };

/** H.264 first (plays everywhere), then AV1, then HEVC (Safari/Edge only). Removes duplicates and thumbnails-only tiers. */
export function rankSrcs(urls: string[]): string[] {
  const score = (u: string) => (/hevc|h265/i.test(u) ? 3 : /av1/i.test(u) ? 2 : /_t\d\.mp4$/i.test(u) ? 4 : 1) * 10 + (/720/i.test(u) ? 0 : /540|480/i.test(u) ? 1 : 2);
  return [...new Set(urls)].filter((u) => /^https:\/\/v1\.pinimg\.com\/videos\//.test(u)).sort((a, b) => score(a) - score(b)).slice(0, 5);
}
const VIBE_HINTS: Array<[RegExp, string]> = [[/(peaky|shelby|villain|aura|sigma edit|dark)/i, 'intense'], [/(lone wolf|discipline|gym|fitness|grind|sigma)/i, 'sigma'], [/(luxury|mansion|villa|car|drive|lifestyle|travel|dream)/i, 'dreamy'], [/(motivat|speech|focus|never give up|mindset|quote)/i, 'stories'], [/(nature|forest|rain|ocean|mountain|bonsai|waterfall|landscape)/i, 'nature']];
export const guessVibe = (t: string) => VIBE_HINTS.find(([r]) => r.test(t))?.[1] || 'serene';

async function fetchHtml(start: string): Promise<{ html: string; url: string }> {
  let url = start;
  for (let hop = 0; hop < 6; hop++) {
    if (!hostAllowed(url)) throw new Error('Only Pinterest links are supported');
    const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(9000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9' } });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { url = new URL(r.headers.get('location') as string, url).toString(); continue; }
    if (!r.ok) throw new Error(`Pinterest answered ${r.status}`);
    return { html: (await r.text()).slice(0, 4_000_000), url };
  }
  throw new Error('Too many redirects');
}
const meta = (html: string, n: string) => new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']*)["']`, 'i').exec(html)?.[1] || new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${n}["']`, 'i').exec(html)?.[1] || '';
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

export async function resolvePin(link: string): Promise<PinRec> {
  const { html, url } = await fetchHtml(link);
  const id = /<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']*\/pin\/(\d+)/i.exec(html)?.[1] || /\/pin\/(\d+)/.exec(url)?.[1];
  const srcs = rankSrcs(html.match(/https:\/\/v1\.pinimg\.com\/videos\/[^"'\\\s<]+?\.mp4/g) || []);
  if (!id || !srcs.length) throw new Error('That pin has no playable video');
  const title = decode((meta(html, 'og:title') || /<title>([^<]*)<\/title>/i.exec(html)?.[1] || 'Pinterest video').split(' | ')[0]).trim().slice(0, 120) || 'Pinterest video';
  return { id, title, poster: meta(html, 'og:image'), srcs, vibe: guessVibe(title) };
}
