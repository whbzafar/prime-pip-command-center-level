import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
export interface V { id: string; title: string; channel: string; thumb: string; published?: string; views?: number; duration?: string; vibe?: string; short?: boolean; kind?: 'pin'; pinId?: string; srcs?: string[] }
export const TABS = [
  { id: 'foryou', label: 'For You', tag: 'Made for your mind', grad: 'from-cyan-950 via-slate-900 to-emerald-950' },
  { id: 'intense', label: 'Intense', tag: 'Walk in like you own the room.', grad: 'from-red-950/80 via-zinc-950 to-amber-950/50' },
  { id: 'trader', label: 'Trader Mind', tag: 'Master the market by mastering yourself.', grad: 'from-teal-950 via-slate-900 to-cyan-950' },
  { id: 'sigma', label: 'Sigma', tag: 'Silent discipline. Loud results.', grad: 'from-zinc-900 via-slate-900 to-indigo-950' },
  { id: 'nature', label: 'Nature', tag: 'Breathe. Look at the trees.', grad: 'from-emerald-950 via-slate-900 to-teal-950' },
  { id: 'serene', label: 'Serene', tag: 'Slow down. You are safe here.', grad: 'from-sky-950 via-slate-900 to-violet-950' },
  { id: 'dreamy', label: 'Dreams', tag: 'Luxury is a decision. Start by seeing it.', grad: 'from-amber-950/70 via-slate-900 to-fuchsia-950/60' },
  { id: 'pins', label: 'Pins', tag: 'Pinterest-style videos, curated for calm and drive.', grad: 'from-rose-950/60 via-slate-900 to-indigo-950' },
  { id: 'stories', label: 'Stories', tag: 'People who rose from the bottom.', grad: 'from-amber-950/60 via-slate-900 to-cyan-950' },
] as const;
export const secs = (d?: string) => (d ? d.split(':').reverse().reduce((a, x, i) => a + Number(x) * 60 ** i, 0) : 0);
export const fmtViews = (n?: number) => (!n ? '' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M views` : n >= 1e3 ? `${Math.round(n / 1e3)}K views` : `${n} views`);
export const ago = (iso?: string) => { if (!iso) return ''; const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000); return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 30 ? `${d}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`; };

export interface FeedState { items: V[]; loading: boolean; more: boolean; err: boolean; note: { kind: 'support' | 'blocked'; text: string } | null; loadMore: () => void; retry: () => void }
/** Endless feed. Resets when vibe / query / reel mode changes; stale responses are ignored. */
export function useFeed(opts: { vibe: string; q: string; reel: boolean; seed: number; weights: string; enabled?: boolean }): FeedState {
  const { vibe, q, reel, seed, weights, enabled = true } = opts;
  const [items, setItems] = useState<V[]>([]);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(true);
  const [err, setErr] = useState(false);
  const [note, setNote] = useState<FeedState['note']>(null);
  const next = useRef(0); const gen = useRef(0); const busy = useRef(false);
  const load = useCallback(async (reset: boolean) => {
    if (busy.current && !reset) return;
    const my = reset ? ++gen.current : gen.current;
    const ck = `mh_feed_v1_${vibe}_${reel ? 'r' : 'v'}`;
    let shown = false;
    if (reset) {
      next.current = 0; setMore(true); setNote(null);
      try { const c = !q && JSON.parse(localStorage.getItem(ck) || 'null'); if (c && Array.isArray(c.items) && c.items.length) { setItems(c.items); shown = true; } else setItems([]); } catch { setItems([]); }
    }
    busy.current = true; setLoading(true); setErr(false);
    try {
      const url = `/api/motivation/feed?vibe=${encodeURIComponent(vibe === 'foryou' ? '' : vibe)}&q=${encodeURIComponent(q)}&offset=${next.current}&seed=${seed}${reel ? '&reel=1' : ''}${vibe === 'foryou' && weights ? `&w=${encodeURIComponent(weights)}` : ''}`;
      const j = await (await fetch(url)).json();
      if (my !== gen.current) return;
      if (j.support) { setNote({ kind: 'support', text: j.support }); setMore(false); return; }
      if (j.blocked) { setNote({ kind: 'blocked', text: j.message }); setMore(false); return; }
      next.current = j.next || next.current;
      if (reset && !q && j.items?.length) { try { localStorage.setItem(ck, JSON.stringify({ items: (j.items as V[]).slice(0, 12) })); } catch { /* quota */ } }
      if (shown) setItems(j.items as V[]);
      else setItems((prev) => { const seen = new Set(prev.map((x) => x.id)); return [...prev, ...(j.items as V[]).filter((x) => !seen.has(x.id))]; });
      setMore(!!j.hasMore && (j.items?.length || 0) > 0);
    } catch { if (my === gen.current) setErr(true); }
    finally { if (my === gen.current) { busy.current = false; setLoading(false); } }
  }, [vibe, q, reel, seed, weights]);
  useEffect(() => { if (enabled) void load(true); }, [load, enabled]);
  return { items, loading, more, err, note, loadMore: () => void load(false), retry: () => void load(items.length === 0) };
}

/** Insert a Pinterest video after every `every` feed items (stable: depends only on earlier items, so appending never reshuffles). */
export function weave(items: V[], pins: V[], every = 4): V[] {
  if (!pins.length) return items;
  const out: V[] = []; let p = 0;
  items.forEach((v, i) => { out.push(v); if ((i + 1) % every === 0 && p < pins.length) out.push(pins[p++]); });
  return out;
}
export const shuffleSeeded = <T,>(a: T[], seed: number): T[] => { let x = seed || 1; const r = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; }; const o = [...a]; for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; };

/** Number of masonry columns for the current width. */
export function useCols(): number {
  const calc = () => (typeof window === 'undefined' ? 1 : window.innerWidth >= 1100 ? 3 : window.innerWidth >= 700 ? 2 : 1);
  const [n, setN] = useState(calc);
  useEffect(() => { const f = () => setN(calc()); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return n;
}
/** Pinterest-style masonry: each item goes to the currently shortest column; earlier items never move when more are appended. */
export function useMasonry(items: V[], cols: number): V[][] {
  return useMemo(() => {
    const h = Array<number>(cols).fill(0); const out: V[][] = Array.from({ length: cols }, () => []);
    for (const v of items) { let k = 0; for (let c = 1; c < cols; c++) if (h[c] < h[k]) k = c; out[k].push(v); h[k] += (v.kind === 'pin' ? (cols === 1 ? 1.25 : 1.78) : 0.5625) + 0.32; }
    return out;
  }, [items, cols]);
}
