// Style preset measured from the owner's reference Short (720x1280, 13.6 s):
// - cut every ~1.5-2 s, bold uppercase title words, yellow caption box with dark text
// - rotating full-bleed backgrounds (green, red/black, blue chart, yellow)
// - steady music bed, integrated loudness about -19 LUFS, peak about -3.5 dBFS
export const STYLE_PRESET = {
  cutSeconds: { min: 1.5, max: 2 },
  captionBox: { fill: '#FACC15', text: '#0B0B0B' },
  titleCase: 'upper',
  targetLufs: -19,
  truePeakDb: -3.5,
  backgrounds: ['#0f7a3a', '#7a0f0f', '#0f2a7a', '#c9a100'],
} as const;

export interface PlanTopic { id: string; tab: string; title: string }
export interface PlanItem<T extends PlanTopic = PlanTopic> { topic: T; theme: number; seed: number; date: string }

// Stable 32-bit hash of a string (FNV-1a).
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export function dayKey(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Deterministic daily order: each topic is recorded once per cycle; topics recorded
// most recently go last, so the day's first videos are always fresh.
// Same date and same history give the same plan; the next date gives a new order.
export function dailyPlan<T extends PlanTopic>(topics: T[], date: string, recent: string[] = [], limit?: number): PlanItem<T>[] {
  if (!topics.length) return [];
  const base = hash32(date);
  const recency = new Map<string, number>();
  recent.forEach((id, i) => { if (!recency.has(id)) recency.set(id, i); });
  const keyed = topics.map((t) => ({
    t,
    rank: recency.has(t.id) ? 1e6 + (recency.get(t.id) as number) : 0,
    jitter: hash32(`${date}|${t.id}`) ^ base,
  }));
  keyed.sort((a, b) => a.rank - b.rank || a.jitter - b.jitter);
  const picked = limit ? keyed.slice(0, limit) : keyed;
  return picked.map(({ t }, i) => ({
    topic: t,
    theme: (hash32(`${date}|${t.id}`) + i) % STYLE_PRESET.backgrounds.length,
    seed: 1000 + (hash32(`${date}|${t.id}`) % 90000),
    date,
  }));
}
