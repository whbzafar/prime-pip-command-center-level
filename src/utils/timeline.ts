/* Pure helpers for the tour edit: what to say about each part, how long each shot lasts, and how the whole video is kept
   between a minimum and a maximum length (30 to 60 seconds for Reels, TikTok and Shorts). */

export interface Item { kind: 'intro' | 'overview' | 'part' | 'outro'; voice: number | null; base: number }
export interface Planned { seconds: number[]; keep: boolean[]; rate: number; total: number }

const tokens = (s: string) => (s.toLowerCase().match(/[a-z0-9]{3,}/g) || []);

/** Picks the feature sentence that best matches a part's label; falls back to the next feature not used yet. */
export function pickFeature(label: string, features: string[], used: Set<number>): string {
  if (!features.length) return '';
  const lt = new Set(tokens(label)); let best = -1; let score = 0;
  features.forEach((f, i) => { if (used.has(i)) return; const sc = tokens(f).filter((t) => lt.has(t)).length; if (sc > score) { score = sc; best = i; } });
  if (best < 0) best = features.findIndex((_, i) => !used.has(i));
  if (best < 0) return '';
  used.add(best); return features[best];
}

export const titleCase = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Short caption pieces (at most `maxWords` words) so Urdu captions stay readable and follow the voice. */
export function chunkCaption(text: string, maxWords = 7): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean); const out: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) out.push(words.slice(i, i + maxWords).join(' '));
  return out;
}

/** Plans shot lengths. Voice is sped up (at most `maxRate`) if the video is too long, then the longest parts are dropped
 *  (never intro, overview or outro, and at least `minParts` parts stay). Too short: shots are held longer. */
export function planTimeline(items: Item[], min = 30, max = 58, maxRate = 1.12, minParts = 2): Planned {
  const pad = 0.5;
  const keep = items.map(() => true);
  const calc = (rate: number) => items.map((it, i) => (!keep[i] ? 0 : it.voice != null ? Math.max(2.4, it.voice / rate + pad) : it.base));
  let rate = 1; let secs = calc(rate); let total = secs.reduce((a, b) => a + b, 0);
  if (total > max) { rate = Math.min(maxRate, total / max); secs = calc(rate); total = secs.reduce((a, b) => a + b, 0); }
  while (total > max) {
    const parts = items.map((it, i) => ({ it, i })).filter((x) => x.it.kind === 'part' && keep[x.i]);
    if (parts.length <= minParts) break;
    const drop = parts.reduce((a, b) => (secs[b.i] > secs[a.i] ? b : a));
    keep[drop.i] = false; secs = calc(rate); total = secs.reduce((a, b) => a + b, 0);
  }
  if (total < min) {
    const idx = items.map((it, i) => (it.kind === 'part' && keep[i] ? i : -1)).filter((i) => i >= 0);
    const hold = idx.length ? idx : items.map((_, i) => i).filter((i) => keep[i]);
    const extra = (min - total) / hold.length; hold.forEach((i) => { secs[i] += extra; }); total = secs.reduce((a, b) => a + b, 0);
  }
  return { seconds: secs, keep, rate, total };
}
