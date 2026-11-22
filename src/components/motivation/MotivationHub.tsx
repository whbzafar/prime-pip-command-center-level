import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, Flame, HeartHandshake, Loader2, Play, RefreshCw, Search, Sparkles, X } from 'lucide-react';

interface V { id: string; title: string; channel: string; thumb: string; published?: string; views?: number; duration?: string }
const SAVE_KEY = 'ppfx_motivation_saved_v1';
const loadSaved = (): V[] => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]'); } catch { return []; } };
const fmtViews = (n?: number) => (!n ? '' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M views` : n >= 1e3 ? `${Math.round(n / 1e3)}K views` : `${n} views`);
const ago = (iso?: string) => { if (!iso) return ''; const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000); return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 30 ? `${d}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : `${Math.floor(d / 365)}y ago`; };

const Card: React.FC<{ v: V; playing: boolean; onPlay: () => void; saved: boolean; onSave: () => void }> = ({ v, playing, onPlay, saved, onSave }) => (
  <article className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/70 shadow-lg backdrop-blur">
    <div className="relative aspect-video w-full bg-black">
      {playing ? (
        <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`} title={v.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
      ) : (
        <button onClick={onPlay} className="group absolute inset-0 h-full w-full" aria-label={`Play ${v.title}`}>
          <img src={v.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2'; }} />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cyan-400/90 text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.55)] transition group-hover:scale-110"><Play className="ml-0.5 h-6 w-6 fill-current" /></span>
          {v.duration && <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">{v.duration}</span>}
        </button>
      )}
    </div>
    <div className="flex items-start gap-2 p-3">
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white">{v.title}</h3>
        <p className="mt-1 truncate text-[11px] text-slate-400">{v.channel}{[fmtViews(v.views), ago(v.published)].filter(Boolean).map((t) => ` · ${t}`).join('')}</p>
      </div>
      <button onClick={onSave} aria-label={saved ? 'Remove from saved' : 'Save'} className={`shrink-0 rounded-lg p-2 ${saved ? 'bg-cyan-400/20 text-cyan-300' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}</button>
      <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube" className="shrink-0 rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white"><ExternalLink className="h-4 w-4" /></a>
    </div>
  </article>
);

export const MotivationHub: React.FC = () => {
  const [q, setQ] = useState('');
  const [active, setActive] = useState('');
  const [items, setItems] = useState<V[]>([]);
  const [next, setNext] = useState(0);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const [note, setNote] = useState<{ kind: 'support' | 'blocked'; text: string } | null>(null);
  const [topics, setTopics] = useState<string[]>(['never give up', 'rise from rock bottom', 'comeback story', 'overcoming loss', 'discipline', 'morning motivation']);
  const [hot, setHot] = useState<V[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [saved, setSaved] = useState<V[]>(loadSaved);
  const [showSaved, setShowSaved] = useState(false);
  const [focus, setFocus] = useState(false);
  const gen = useRef(0);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (query: string, offset: number, reset: boolean) => {
    if (busy.current && !reset) return;
    const my = reset ? ++gen.current : gen.current;
    busy.current = true; setLoading(true); setErr(false);
    try {
      const r = await fetch(`/api/motivation/feed?q=${encodeURIComponent(query)}&offset=${offset}`);
      const j = await r.json();
      if (my !== gen.current) return;
      if (j.support) { setNote({ kind: 'support', text: j.support }); setItems([]); setMore(false); return; }
      if (j.blocked) { setNote({ kind: 'blocked', text: j.message }); setItems([]); setMore(false); return; }
      setNote(null);
      setItems((prev) => { const base = reset ? [] : prev; const seen = new Set(base.map((x) => x.id)); return [...base, ...(j.items as V[]).filter((x) => !seen.has(x.id))]; });
      setNext(j.next || 0); setMore(!!j.hasMore && (j.items?.length || 0) > 0);
    } catch { if (my === gen.current) setErr(true); }
    finally { if (my === gen.current) { busy.current = false; setLoading(false); } }
  }, []);

  useEffect(() => { void fetchPage('', 0, true); fetch('/api/motivation/trending').then((r) => r.json()).then((j) => { if (j.topics?.length) setTopics(j.topics.slice(0, 12)); setHot(j.hot || []); }).catch(() => undefined); }, [fetchPage]);
  useEffect(() => {
    const el = sentinel.current; if (!el || showSaved) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && more && !busy.current && !err) void fetchPage(active, next, false); }, { rootMargin: '900px' });
    io.observe(el); return () => io.disconnect();
  }, [more, next, active, err, fetchPage, showSaved]);

  const run = (term: string) => { const t = term.trim(); setQ(t); setActive(t); setShowSaved(false); setPlaying(null); setFocus(false); void fetchPage(t, 0, true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const toggleSave = (v: V) => setSaved((s) => { const n = s.some((x) => x.id === v.id) ? s.filter((x) => x.id !== v.id) : [v, ...s].slice(0, 200); try { localStorage.setItem(SAVE_KEY, JSON.stringify(n)); } catch { /* storage full */ } return n; });
  const sugg = q.trim() ? topics.filter((t) => t.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : topics.slice(0, 6);
  const list = showSaved ? saved : items;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 pb-24 pt-4 sm:px-4">
      <header className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/60 p-5 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300"><Sparkles className="h-4 w-4" />Motivation Hub</div>
          <h2 className="text-2xl font-black leading-tight text-white sm:text-4xl">Fall seven times. <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">Rise eight.</span></h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300">Real stories of people who came back from the bottom — fresh videos from top speakers, always updating, never ending. Watch one. Then take the next step.</p>
          <div className="relative mt-4">
            <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="flex items-center gap-2 rounded-2xl border border-slate-600/60 bg-slate-950/80 px-3 py-2 focus-within:border-cyan-400/70">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} placeholder="Search motivation… e.g. never give up, overcoming loss" maxLength={80} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
              {(q || active) && <button type="button" onClick={() => run('')} aria-label="Clear" className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>}
              <button type="submit" className="rounded-xl bg-cyan-400 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-300">Search</button>
            </form>
            {focus && sugg.length > 0 && <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">{sugg.map((t) => <li key={t}><button onMouseDown={(e) => { e.preventDefault(); run(t); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"><Flame className="h-3.5 w-3.5 text-amber-400" />{t}</button></li>)}</ul>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topics.slice(0, 10).map((t) => <button key={t} onClick={() => run(t)} className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${active === t ? 'border-cyan-400 bg-cyan-400/20 text-cyan-200' : 'border-slate-600/60 bg-slate-800/60 text-slate-300 hover:border-cyan-400/50'}`}>{t}</button>)}
          </div>
        </div>
      </header>

      {hot.length > 0 && !active && !showSaved && (
        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white"><Flame className="h-4 w-4 text-amber-400" />Trending this month</h3>
          <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0">
            {hot.map((v) => <button key={v.id} onClick={() => { setPlaying(v.id); setItems((p) => (p.some((x) => x.id === v.id) ? p : [v, ...p])); window.scrollTo({ top: 400, behavior: 'smooth' }); }} className="group w-56 shrink-0 snap-start text-left"><div className="relative aspect-video overflow-hidden rounded-xl bg-slate-800"><img src={v.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" /><span className="absolute bottom-1.5 left-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">{fmtViews(v.views)}</span></div><p className="mt-1.5 line-clamp-2 text-[11.5px] font-semibold leading-snug text-slate-200">{v.title}</p></button>)}
          </div>
        </section>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{showSaved ? 'Your saved videos' : active ? `Results for “${active}”` : 'For you — fresh & uplifting'}</h3>
        <button onClick={() => setShowSaved((s) => !s)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${showSaved ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-200'}`}><Bookmark className="h-3.5 w-3.5" />Saved ({saved.length})</button>
      </div>

      {note && <div className={`flex gap-3 rounded-2xl border p-4 text-sm ${note.kind === 'support' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/30 bg-amber-500/10 text-amber-100'}`}><HeartHandshake className="mt-0.5 h-5 w-5 shrink-0" /><p>{note.text}</p></div>}

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((v) => <Card key={v.id} v={v} playing={playing === v.id} onPlay={() => setPlaying(v.id)} saved={saved.some((s) => s.id === v.id)} onSave={() => toggleSave(v)} />)}
        {loading && items.length === 0 && !showSaved && Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-video animate-pulse rounded-2xl bg-slate-800/60" />)}
      </div>
      {showSaved && saved.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Tap the bookmark on any video to keep it here for the hard days.</p>}
      {!showSaved && !loading && !err && !note && items.length === 0 && <p className="py-10 text-center text-sm text-slate-400">No videos found for that. Try “never give up” or “comeback story”.</p>}
      {err && <div className="flex flex-col items-center gap-2 py-6 text-sm text-slate-300"><p>Couldn’t load videos right now.</p><button onClick={() => void fetchPage(active, next, items.length === 0)} className="flex items-center gap-1.5 rounded-lg bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>}
      {!showSaved && <div ref={sentinel} className="flex h-16 items-center justify-center">{loading && items.length > 0 && <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />}{!more && items.length > 0 && !loading && <span className="text-xs text-slate-500">You’ve reached the end — come back tomorrow for fresh videos.</span>}</div>}
      <p className="text-center text-[11px] leading-relaxed text-slate-500">Videos are played from YouTube and belong to their creators. If things feel too heavy, talk to someone you trust — findahelpline.com lists free support worldwide.</p>
    </div>
  );
};
