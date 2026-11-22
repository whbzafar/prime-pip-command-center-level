/**
 * On-device taste profile for the Motivation feed. Nothing leaves the phone except coarse weights (e.g. nature:6,sigma:3).
 * Signals: played +3, saved +5, watched a reel >6 s +2, skipped a reel <2 s −1. Old interest fades (×0.9 per new day of use).
 */
export const VIBE_KEYS = ['stories', 'sigma', 'nature', 'serene', 'dreamy'] as const;
export type VibeKey = (typeof VIBE_KEYS)[number];
export interface Taste { scores: Record<string, number>; day: string; seen: string[]; recent: { id: string; title: string; vibe: string }[] }
export const emptyTaste = (): Taste => ({ scores: {}, day: '', seen: [], recent: [] });
export type Signal = 'play' | 'save' | 'reel_watch' | 'reel_skip';
const DELTA: Record<Signal, number> = { play: 3, save: 5, reel_watch: 2, reel_skip: -1 };

export function decay(t: Taste, today: string): Taste {
  if (t.day === today) return t;
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(t.scores)) { const n = Math.round(v * 0.9 * 100) / 100; if (Math.abs(n) >= 0.2) scores[k] = n; }
  return { ...t, scores, day: today };
}
export function record(t: Taste, sig: Signal, v: { id: string; title: string; vibe?: string }): Taste {
  const vibe = v.vibe && (VIBE_KEYS as readonly string[]).includes(v.vibe) ? v.vibe : null;
  const scores = { ...t.scores };
  if (vibe) scores[vibe] = Math.min(60, Math.max(-5, (scores[vibe] || 0) + DELTA[sig]));
  const watched = sig === 'play' || sig === 'reel_watch';
  return { ...t, scores, seen: watched ? [v.id, ...t.seen.filter((x) => x !== v.id)].slice(0, 400) : t.seen, recent: watched && vibe ? [{ id: v.id, title: v.title, vibe }, ...t.recent.filter((x) => x.id !== v.id)].slice(0, 12) : t.recent };
}
/** 0–10 integers per vibe for the server (relative to the viewer's strongest interest). */
export function weights(t: Taste): Record<string, number> {
  const max = Math.max(0, ...Object.values(t.scores));
  const out: Record<string, number> = {};
  if (max < 3) return out; // not enough signal yet → balanced mix
  for (const k of VIBE_KEYS) { const s = Math.max(0, t.scores[k] || 0); if (s) out[k] = Math.round((s / max) * 10); }
  return out;
}
export const weightParam = (w: Record<string, number>) => Object.entries(w).map(([k, v]) => `${k}:${v}`).join(',');
export const topVibe = (t: Taste): VibeKey | null => { const e = Object.entries(t.scores).filter(([, v]) => v >= 3).sort((a, b) => b[1] - a[1])[0]; return (e?.[0] as VibeKey) || null; };
