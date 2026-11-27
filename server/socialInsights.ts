/* Post history, performance numbers from Facebook/Instagram, and plain-language advice on when and what to post.
   The analysis functions are pure (unit-tested); the Graph API calls tolerate missing permissions and say what is missing. */

export interface PlatformResult { ok: boolean; id?: string; error?: string }
export interface Metrics { views?: number; reach?: number; likes?: number; comments?: number; shares?: number; saves?: number; at: number; note?: string }
export interface PostEntry {
  id: string; by?: string; at: number; title: string; category: string; targets: string[]; status: "pending" | "done" | "failed"; stage?: string;
  results: Record<string, PlatformResult>; metrics?: Record<string, Metrics>;
}

/** One number per post and platform: interactions weigh comments, saves and shares above likes; views add a small amount. */
export function score(m?: Metrics): number {
  if (!m) return 0;
  return (m.likes || 0) + 3 * (m.comments || 0) + 4 * (m.shares || 0) + 3 * (m.saves || 0) + 0.05 * (m.views || m.reach || 0);
}
export const postScore = (e: PostEntry) => Object.values(e.metrics || {}).reduce((a, m) => a + score(m), 0);

const PKT = 5 * 3600_000; // Asia/Karachi, no daylight saving
export const slotOf = (ms: number) => { const d = new Date(ms + PKT); return { day: d.getUTCDay(), hour: d.getUTCHours() }; };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const hh = (h: number) => `${h % 12 || 12}${h < 12 ? " AM" : " PM"}`;
export const slotLabel = (day: number, hour: number) => `${DAYS[day]} ${hh(hour)}–${hh((hour + 3) % 24)}`;

export interface Advice {
  posts: number; measured: number; confidence: "starting guess" | "early signal" | "reliable";
  bestSlots: { label: string; avg: number; posts: number }[];
  categories: { category: string; avg: number; posts: number }[];
  tips: string[];
}

export function analyse(list: PostEntry[]): Advice {
  const done = list.filter((e) => e.status === "done" && Object.values(e.results).some((r) => r.ok));
  const measured = done.filter((e) => e.metrics && Object.keys(e.metrics).length);
  const confidence = measured.length >= 12 ? "reliable" : measured.length >= 4 ? "early signal" : "starting guess";
  const slots = new Map<string, { day: number; hour: number; sum: number; n: number }>();
  const cats = new Map<string, { sum: number; n: number }>();
  for (const e of measured) {
    const s = slotOf(e.at); const h3 = Math.floor(s.hour / 3) * 3; const k = `${s.day}-${h3}`; const v = postScore(e);
    const a = slots.get(k) || { day: s.day, hour: h3, sum: 0, n: 0 }; a.sum += v; a.n++; slots.set(k, a);
    const c = cats.get(e.category) || { sum: 0, n: 0 }; c.sum += v; c.n++; cats.set(e.category, c);
  }
  const bestSlots = [...slots.values()].map((a) => ({ label: slotLabel(a.day, a.hour), avg: Math.round((a.sum / a.n) * 10) / 10, posts: a.n })).sort((x, y) => y.avg - x.avg).slice(0, 3);
  const categories = [...cats.entries()].map(([category, a]) => ({ category, avg: Math.round((a.sum / a.n) * 10) / 10, posts: a.n })).sort((x, y) => y.avg - x.avg);
  const tips: string[] = [];
  if (confidence === "starting guess") {
    tips.push("Not enough measured posts yet, so these times are a starting guess for a Pakistan audience: weekday evenings 8–11 PM and weekend afternoons 2–5 PM (Asia/Karachi). The advice becomes personal after about 4 posts and reliable after about 12.");
  } else if (bestSlots.length) {
    tips.push(`Your best slot so far is ${bestSlots[0].label} (Asia/Karachi). Record so the video is ready shortly before it, and post then.`);
  }
  if (categories.length >= 2) {
    const top = categories[0], low = categories[categories.length - 1];
    tips.push(`“${top.category}” is your strongest category so far; make more like it. “${low.category}” is the weakest: try a stronger first 3 seconds and a clearer hook.`);
  }
  const withViews = measured.filter((e) => Object.values(e.metrics || {}).some((m) => (m.views || m.reach || 0) > 0));
  if (withViews.length) {
    const ratio = withViews.map((e) => { const ms = Object.values(e.metrics || {}); const vw = ms.reduce((a, m) => a + (m.views || m.reach || 0), 0); const it = ms.reduce((a, m) => a + (m.likes || 0) + (m.comments || 0) + (m.shares || 0) + (m.saves || 0), 0); return vw ? it / vw : 0; });
    const avg = ratio.reduce((a, b) => a + b, 0) / ratio.length;
    if (avg < 0.02) tips.push("Many people watch but few react (under 2%). End with one clear question or call to action to get comments and saves.");
    else if (avg > 0.06) tips.push("Viewers react strongly (over 6%). The content works; the next gain is reach, so post at your best slot and keep hooks short.");
  }
  const noViews = measured.length > 0 && withViews.length === 0;
  if (noViews) tips.push("View counts are not available yet: only likes and comments are being read. Adding the Instagram insights permission to the Meta app unlocks views and reach (see the note under the table).");
  if (!measured.length && done.length) tips.push("Posts are live but their numbers have not been read yet. They appear after the first refresh, usually within an hour.");
  return { posts: done.length, measured: measured.length, confidence, bestSlots, categories, tips };
}
