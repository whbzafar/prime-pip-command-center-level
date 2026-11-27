import { useCallback, useEffect, useRef, useState } from 'react';
import { getStoredToken } from '../../utils/authClient';

interface Metrics { views?: number; reach?: number; likes?: number; comments?: number; shares?: number; saves?: number; at: number; note?: string }
interface Post { id: string; at: number; title: string; category: string; targets: string[]; status: 'pending' | 'done' | 'failed'; stage?: string; results: Record<string, { ok: boolean; id?: string; error?: string }>; metrics?: Record<string, Metrics> }
interface Advice { posts: number; measured: number; confidence: string; bestSlots: { label: string; avg: number; posts: number }[]; categories: { category: string; avg: number; posts: number }[]; tips: string[] }
const NAMES: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram' };
const auth = () => { const t = getStoredToken(); return t ? { Authorization: `Bearer ${t}` } : {}; };
const n = (v?: number) => (v === undefined ? '–' : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));
const when = (ms: number) => new Date(ms).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Every post's progress (pending → uploading → processing → published), its numbers, and advice on when and what to post. */
export function PerformancePanel({ onDone }: { onDone?: (ok: boolean, text: string) => void }) {
  const [posts, setPosts] = useState<Post[]>([]); const [advice, setAdvice] = useState<Advice | null>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const seen = useRef<Map<string, string>>(new Map()); const first = useRef(true);
  const load = useCallback(async (refresh = false) => {
    if (refresh) setBusy(true);
    try {
      const r = await fetch(`/api/admin/social/insights${refresh ? '?refresh=1' : ''}`, { credentials: 'include', headers: auth(), cache: 'no-store' }); const j = await r.json();
      if (!j.ok) { setErr(j.error || `HTTP ${r.status}`); return; } setErr(''); const list: Post[] = j.posts || [];
      // a post that was pending a moment ago and has now finished: tell the owner, even if the page was reloaded meanwhile
      if (!first.current) list.forEach((p) => { const was = seen.current.get(p.id); if (was === 'pending' && p.status !== 'pending') { const ok = p.status === 'done'; const names = Object.entries(p.results).filter(([k, v]) => k !== 'error' && v.ok).map(([k]) => NAMES[k]); onDone?.(ok, ok ? `✅ “${p.title}” is live on ${names.join(' and ')}.` : `❌ “${p.title}” was not posted: ${Object.values(p.results).map((v) => v.error).filter(Boolean).join(' · ') || 'unknown error'}`); } });
      first.current = false; seen.current = new Map(list.map((p) => [p.id, p.status])); setPosts(list); setAdvice(j.advice);
    } catch (e: any) { setErr(String(e?.message || e)); } finally { setBusy(false); }
  }, [onDone]);
  const pending = posts.some((p) => p.status === 'pending');
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const t = setInterval(() => void load(), pending ? 6000 : 120_000); return () => clearInterval(t); }, [load, pending]);
  const missing = posts.some((p) => (Object.values(p.metrics || {}) as Metrics[]).some((m) => m.note && /permission/.test(m.note)));
  return (
    <details open className="rounded-xl border border-sky-500/30 bg-slate-950/70 p-3" data-testid="performance-panel">
      <summary className="cursor-pointer text-sm font-semibold text-sky-200">📈 Post status, performance and best times {pending ? '— posting now…' : ''}</summary>
      <div className="mt-3 space-y-3 text-xs text-slate-200">
        <div className="flex items-center gap-2"><button type="button" onClick={() => void load(true)} disabled={busy} className="rounded bg-sky-600 px-2.5 py-1 font-bold text-white disabled:opacity-50">{busy ? 'Reading numbers…' : 'Refresh numbers now'}</button>
          <span className="text-slate-400">Numbers refresh by themselves: every 20 minutes on new posts, then every 6 hours. Times are Pakistan time.</span></div>
        {err && <div className="rounded bg-rose-500/15 p-2 text-rose-100">Could not load: {err}</div>}
        {advice && <div className="rounded-lg bg-slate-900/70 p-2">
          <div className="mb-1 font-bold text-amber-200">Suggestions <span className="font-normal text-slate-400">({advice.confidence} · {advice.measured} measured post{advice.measured === 1 ? '' : 's'})</span></div>
          <ul className="list-disc space-y-1 pl-4">{advice.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          {advice.bestSlots.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{advice.bestSlots.map((s) => <span key={s.label} className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-100">⏰ {s.label} · score {s.avg} ({s.posts} post{s.posts === 1 ? '' : 's'})</span>)}</div>}
          {advice.categories.length > 0 && <div className="mt-2 space-y-1">{advice.categories.map((c) => { const top = advice.categories[0].avg || 1; return <div key={c.category} className="flex items-center gap-2"><span className="w-40 truncate">{c.category}</span><div className="h-2 flex-1 rounded bg-slate-800"><div className="h-2 rounded bg-sky-400" style={{ width: `${Math.max(4, Math.round((c.avg / top) * 100))}%` }} /></div><span className="w-16 text-right text-slate-400">{c.avg}</span></div>; })}</div>}
        </div>}
        {posts.length === 0 && !err && <div className="text-slate-400">No posts yet. After you record a video it appears here at once, with its progress.</div>}
        {posts.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left">
          <thead className="text-slate-400"><tr><th className="py-1 pr-2">Video</th><th className="pr-2">Status</th><th className="pr-2">Platform</th><th className="pr-2">Views</th><th className="pr-2">Likes</th><th className="pr-2">Comments</th><th className="pr-2">Shares</th><th>Saves</th></tr></thead>
          <tbody>{posts.flatMap((p) => { const ks = (p.targets.length ? p.targets : Object.keys(p.results)).filter((k) => k === 'facebook' || k === 'instagram'); return (ks.length ? ks : ['']).map((k, i) => { const r = p.results[k]; const m = p.metrics?.[k];
            const st = p.status === 'pending' ? <span className="text-amber-300">⏳ {p.stage || 'Pending'}…</span> : r?.ok ? <span className="text-emerald-300">✅ Published</span> : <span className="text-rose-300" title={r?.error}>❌ {r?.error ? r.error.slice(0, 60) : 'Not posted'}</span>;
            return <tr key={`${p.id}-${k}`} className="border-t border-slate-800 align-top"><td className="py-1 pr-2">{i === 0 ? <><div className="font-semibold text-slate-100">{p.title}</div><div className="text-slate-500">{p.category} · {when(p.at)}</div></> : ''}</td><td className="pr-2">{st}</td><td className="pr-2">{NAMES[k] || '–'}</td>
              <td className="pr-2">{n(m?.views ?? m?.reach)}</td><td className="pr-2">{n(m?.likes)}</td><td className="pr-2">{n(m?.comments)}</td><td className="pr-2">{n(m?.shares)}</td><td>{n(m?.saves)}</td></tr>; }); })}</tbody></table></div>}
        {missing && <div className="rounded bg-amber-500/10 p-2 text-amber-100">Views, reach, shares and saves are hidden because the Meta app lacks the insights permissions (instagram_manage_insights and read_insights). Likes and comments are still tracked. Add the two permissions to the app’s use cases and make a new token once, and the missing columns fill in by themselves.</div>}
      </div>
    </details>
  );
}
