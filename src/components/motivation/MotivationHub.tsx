import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Clapperboard, Flame, HeartHandshake, Link2, Loader2, Plus, RefreshCw, Search, Sparkles, Wand2, X } from 'lucide-react';
import { TABS, V, shuffleSeeded, useCols, useFeed, useMasonry, weave } from './shared';
import './motivation.css';
import { PINS } from './pinsData';
import { PinCard } from './PinCard';
import { VideoCard } from './VideoCard';
import { PlayerModal } from './PlayerModal';
import { ReelsViewer } from './ReelsViewer';
import { Spotlight } from './Spotlight';
import { Signal, Taste, decay, emptyTaste, record, topVibe, weightParam, weights } from '../../utils/tasteProfile';

const SAVE_KEY = 'ppfx_motivation_saved_v1', TASTE_KEY = 'ppfx_taste_v1';
const read = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || '') as T; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } };
const today = () => new Date().toISOString().slice(0, 10);
const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const SUGGEST = ['thomas shelby motivation', 'luxury mansion cinematic', 'peaky blinders mindset', 'supercar luxury', 'never give up', 'rise from rock bottom', 'sigma discipline', 'forest rain', 'luxury homes', 'calm sunset', 'comeback story', 'ocean waves', 'dream life', 'morning motivation', 'overcoming loss', 'mountain sunrise'];

const Shelf: React.FC<{ title: string; icon?: React.ReactNode; items: V[]; saved: (id: string) => boolean; onOpen: (v: V) => void; onSave: (v: V) => void }> = ({ title, icon, items, saved, onOpen, onSave }) => items.length === 0 ? null : (
  <section>
    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">{icon}{title}</h3>
    <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">{items.map((v) => <VideoCard key={v.id} v={v} compact saved={saved(v.id)} onOpen={() => onOpen(v)} onSave={() => onSave(v)} />)}</div>
  </section>
);

export const MotivationHub: React.FC = () => {
  const seed = useRef(Math.floor(Math.random() * 2 ** 31) + 1).current; // new every visit → fresh feed
  const [tab, setTab] = useState<string>('foryou');
  const [q, setQ] = useState(''); const [active, setActive] = useState('');
  const [focus, setFocus] = useState(false);
  const [saved, setSaved] = useState<V[]>(() => read<V[]>(SAVE_KEY, []));
  const [taste, setTaste] = useState<Taste>(() => decay(read<Taste>(TASTE_KEY, emptyTaste()), today()));
  const [open, setOpen] = useState<V | null>(null);
  const [reels, setReels] = useState<number | null>(null);
  const [reelPicks, setReelPicks] = useState<V[]>([]);
  const [userPins, setUserPins] = useState<V[]>(() => read<V[]>('ppfx_user_pins_v1', []));
  const [pinUrl, setPinUrl] = useState(''); const [pinBusy, setPinBusy] = useState(false); const [pinMsg, setPinMsg] = useState('');
  const [pinCat, setPinCat] = useState('all');
  const cols = useCols();
  const allPins = useMemo(() => shuffleSeeded([...userPins, ...PINS], seed), [userPins, seed]);
  const [picks, setPicks] = useState<V[]>([]);
  const [because, setBecause] = useState<{ from: string; items: V[] } | null>(null);
  const [hot, setHot] = useState<V[]>([]);
  const tasteRef = useRef(taste); tasteRef.current = taste;
  const wParam = useMemo(() => weightParam(weights(tasteRef.current)), []); // taste read once per visit; feed doesn't reshuffle while you watch
  const showSaved = tab === 'saved';
  const pinsTab = tab === 'pins';
  const meta = TABS.find((t) => t.id === tab) || TABS[0];
  const feed = useFeed({ vibe: showSaved ? 'foryou' : tab, q: active, reel: false, seed, weights: wParam, enabled: !showSaved && !pinsTab });
  const sentinel = useRef<HTMLDivElement>(null);

  const signal = useCallback((s: Signal, v: V) => setTaste((t) => { const n = record(t, s, v); write(TASTE_KEY, n); return n; }), []);
  const isSaved = useCallback((id: string) => saved.some((x) => x.id === id), [saved]);
  const toggleSave = useCallback((v: V) => setSaved((s) => { const had = s.some((x) => x.id === v.id); const n = had ? s.filter((x) => x.id !== v.id) : [v, ...s].slice(0, 300); write(SAVE_KEY, n); if (!had) signal('save', v); return n; }), [signal]);
  const play = (v: V) => { signal('play', v); setOpen(v); };
  const addPin = async () => {
    const u = pinUrl.trim(); if (!u) return; setPinBusy(true); setPinMsg('');
    try {
      const j = await (await fetch(`/api/motivation/pin?url=${encodeURIComponent(u)}`)).json();
      if (!j.ok) throw new Error(j.error || 'Could not read that pin');
      const p = j.pin; const v: V = { id: `pin_${p.id}`, kind: 'pin', pinId: p.id, title: p.title, channel: 'Pinterest', thumb: p.poster, vibe: p.vibe, srcs: p.srcs };
      setUserPins((l) => { const n = [v, ...l.filter((x) => x.id !== v.id)].slice(0, 100); write('ppfx_user_pins_v1', n); return n; });
      setPinUrl(''); setPinMsg('Added to your Pins ✓');
    } catch (e: any) { setPinMsg(e?.message || 'Could not read that pin'); }
    setPinBusy(false); setTimeout(() => setPinMsg(''), 6000);
  };

  // proactive suggestions: strongest interest, and "because you watched …"
  useEffect(() => {
    const t = tasteRef.current; const tv = topVibe(t);
    if (tv) fetch(`/api/motivation/feed?vibe=${tv}&offset=0&seed=${seed + 7}`).then((r) => r.json()).then((j) => setPicks((j.items || []).filter((x: V) => !t.seen.includes(x.id)).slice(0, 8))).catch(() => undefined);
    const last = t.recent[0];
    if (last) fetch(`/api/motivation/similar?title=${encodeURIComponent(last.title)}&vibe=${last.vibe}`).then((r) => r.json()).then((j) => setBecause({ from: last.title, items: (j.items || []).filter((x: V) => !t.seen.includes(x.id)).slice(0, 8) })).catch(() => undefined);
    fetch(`/api/motivation/feed?reel=1&seed=${seed + 1}${wParam ? `&w=${encodeURIComponent(wParam)}` : ''}&offset=0`).then((r) => r.json()).then((j) => setReelPicks((j.items || []).slice(0, 8))).catch(() => undefined);
    fetch('/api/motivation/trending').then((r) => r.json()).then((j) => setHot(j.hot || [])).catch(() => undefined);
  }, [seed, wParam]);

  useEffect(() => {
    const el = sentinel.current; if (!el || showSaved || pinsTab) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting && feed.more && !feed.loading && !feed.err) feed.loadMore(); }, { rootMargin: '1000px' });
    io.observe(el); return () => io.disconnect();
  }, [feed, showSaved, pinsTab]);

  const go = (t: string) => { setTab(t); setActive(''); setQ(''); };
  const run = (term: string) => { const s = term.trim(); setQ(s); setActive(s); setFocus(false); if (showSaved) setTab('foryou'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const seen = useMemo(() => new Set(taste.seen), [taste.seen]);
  const shelfIds = useMemo(() => new Set([...picks, ...(because?.items || [])].map((x) => x.id)), [picks, because]);
  const firstId = feed.items[0]?.id;
  const spot = useMemo(() => { const pool = (showSaved ? [] : feed.items).slice(0, 10).filter((v) => v.views); return [...pool].sort((a, b) => (b.views || 0) - (a.views || 0))[0] || feed.items[0] || null; }, [showSaved, firstId]); // eslint-disable-line react-hooks/exhaustive-deps — pick once per feed, don't swap while scrolling
  const pinsForTab = useMemo(() => (tab === 'foryou' ? allPins : allPins.filter((p) => p.vibe === tab)), [allPins, tab]);
  const mainItems = useMemo(() => {
    if (showSaved) return saved;
    if (pinsTab) return pinCat === 'all' ? allPins : allPins.filter((p) => p.vibe === pinCat);
    if (active) return feed.items.filter((v) => v.id !== spot?.id);
    let base = feed.items.filter((v) => v.id !== spot?.id);
    if (tab === 'foryou') { const fresh = base.filter((v) => !seen.has(v.id) && !shelfIds.has(v.id)); base = fresh.length >= 6 || feed.more ? fresh : base; }
    return weave(base, pinsForTab, 4);
  }, [showSaved, saved, pinsTab, pinCat, allPins, active, feed.items, feed.more, tab, seen, shelfIds, spot, pinsForTab]);
  const columns = useMasonry(mainItems, pinsTab ? Math.max(2, cols) : cols);
  const sugg = q.trim() ? SUGGEST.filter((t) => t.includes(q.toLowerCase())).slice(0, 5) : SUGGEST.slice(0, 6);

  return (
    <div className="relative mx-auto max-w-6xl space-y-5 px-3 pb-28 pt-4 sm:px-5">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" /><div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" /><div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <header className={`relative z-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${showSaved ? 'from-slate-900 via-slate-900 to-cyan-950' : meta.grad} p-5 transition-colors duration-700 sm:p-8`}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-200/90"><Sparkles className="h-4 w-4" />{greeting()}</div>
          <h2 className="text-2xl font-black leading-tight text-white sm:text-4xl">{showSaved ? 'Your saved moments' : meta.tag}</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-300/90">{tab === 'foryou' && taste.recent.length ? 'Your feed learns what calms and drives you — fresh every time you come back.' : 'Calm visuals, quiet discipline and real comeback stories. Fresh every visit, endless, and tuned to you.'}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => setReels(0)} className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(255,255,255,.25)] transition hover:scale-105"><Clapperboard className="h-4 w-4" />Watch Reels</button>
            <button onClick={() => setTab('saved')} className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"><Bookmark className="h-4 w-4" />Saved ({saved.length})</button>
          </div>
          <div className="relative mt-4">
            <form onSubmit={(e) => { e.preventDefault(); run(q); }} className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/60 px-3 py-2 backdrop-blur focus-within:border-cyan-300/70">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} placeholder="Search — Shelby mindset, luxury villas, forest rain…" maxLength={80} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
              {(q || active) && <button type="button" onClick={() => { setQ(''); setActive(''); }} aria-label="Clear" className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>}
              <button type="submit" className="rounded-xl bg-cyan-300 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-200">Search</button>
            </form>
            {focus && sugg.length > 0 && <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur">{sugg.map((t) => <li key={t}><button onMouseDown={(e) => { e.preventDefault(); run(t); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5"><Flame className="h-3.5 w-3.5 text-amber-400" />{t}</button></li>)}</ul>}
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-20 -mx-3 flex gap-2 overflow-x-auto bg-slate-950/70 px-3 py-2 backdrop-blur-xl [scrollbar-width:none] sm:mx-0 sm:rounded-2xl sm:px-3" aria-label="Categories">
        {TABS.map((t) => <button key={t.id} onClick={() => go(t.id)} className={`mh-tab shrink-0 rounded-full px-4 py-2 text-xs font-bold ${tab === t.id ? 'bg-white text-slate-950 shadow-lg' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{t.id === 'foryou' && <Wand2 className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />}{t.label}</button>)}
        <button onClick={() => setReels(0)} className="shrink-0 rounded-full bg-gradient-to-r from-fuchsia-500 to-amber-400 px-4 py-2 text-xs font-bold text-slate-950"><Clapperboard className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />Reels</button>
      </nav>

      <div className="relative z-10 space-y-6">
        {!showSaved && !active && spot && <Spotlight v={spot} onWatch={() => play(spot)} onReels={() => setReels(0)} />}
        {!showSaved && !active && reelPicks.length > 3 && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white"><Clapperboard className="h-4 w-4 text-fuchsia-300" />Reels</h3>
            <div className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
              {reelPicks.map((v, i) => <button key={v.id} onClick={() => setReels(i)} className="group relative aspect-[9/16] w-32 shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-slate-900 sm:w-40"><img src={v.thumb} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" /><span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" /><span className="absolute inset-x-0 bottom-0 line-clamp-3 p-2 text-left text-[11px] font-bold leading-snug text-white">{v.title}</span></button>)}
            </div>
          </section>
        )}
        {tab === 'foryou' && !active && (
          <>
            <Shelf title="Picked for you" icon={<Wand2 className="h-4 w-4 text-cyan-300" />} items={picks} saved={isSaved} onOpen={play} onSave={toggleSave} />
            {because && <Shelf title={`Because you watched “${because.from.length > 48 ? because.from.slice(0, 48) + '…' : because.from}”`} items={because.items} saved={isSaved} onOpen={play} onSave={toggleSave} />}
            {hot.length > 0 && <Shelf title="Trending this month" icon={<Flame className="h-4 w-4 text-amber-400" />} items={hot.map((h) => ({ ...h, vibe: 'stories' }))} saved={isSaved} onOpen={play} onSave={toggleSave} />}
          </>
        )}
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-white">{showSaved ? `Saved (${saved.length})` : active ? `Results for “${active}”` : tab === 'foryou' ? 'Fresh for you' : meta.label}</h3>{!showSaved && <span className="text-[11px] text-slate-500">Endless · updates every visit</span>}</div>

        {feed.note && !showSaved && <div className={`flex gap-3 rounded-2xl border p-4 text-sm ${feed.note.kind === 'support' ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-amber-400/30 bg-amber-500/10 text-amber-100'}`}><HeartHandshake className="mt-0.5 h-5 w-5 shrink-0" /><p>{feed.note.text}</p></div>}

        {pinsTab && (
          <div className="space-y-3">
            <form onSubmit={(e) => { e.preventDefault(); void addPin(); }} className="mh-rise flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur">
              <Link2 className="h-4 w-4 shrink-0 text-rose-300" />
              <input value={pinUrl} onChange={(e) => setPinUrl(e.target.value)} placeholder="Paste a Pinterest video link (pin.it/… or pinterest.com/pin/…)" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
              <button disabled={pinBusy || !pinUrl.trim()} className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-400 disabled:opacity-40">{pinBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}Add pin</button>
              {pinMsg && <p className="w-full text-xs text-rose-200">{pinMsg}</p>}
            </form>
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">{['all', 'nature', 'serene', 'dreamy', 'intense', 'sigma', 'stories'].map((c) => <button key={c} onClick={() => setPinCat(c)} className={`mh-tab shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${pinCat === c ? 'bg-rose-400 text-slate-950' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{c === 'dreamy' ? 'dreams' : c}</button>)}</div>
          </div>
        )}
        <div className="flex items-start gap-4">
          {columns.map((col, ci) => (
            <div key={ci} className="flex min-w-0 flex-1 flex-col gap-4">
              {col.map((v, k) => (v.kind === 'pin'
                ? <PinCard key={v.id} v={v} ratio={cols === 1 && !pinsTab ? '4/5' : '9/16'} delay={Math.min(k, 6) * 70} saved={isSaved(v.id)} onOpen={() => play(v)} onSave={() => toggleSave(v)} />
                : <VideoCard key={v.id} v={v} delay={Math.min(k, 6) * 70} saved={isSaved(v.id)} onOpen={() => play(v)} onSave={() => toggleSave(v)} />))}
            </div>
          ))}
        </div>
        {feed.loading && mainItems.length === 0 && !showSaved && !pinsTab && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="mh-skel aspect-video rounded-2xl" />)}</div>}
        {showSaved && saved.length === 0 && <p className="py-12 text-center text-sm text-slate-500">Tap the bookmark on any video to keep it here for the heavy days.</p>}
        {!showSaved && !pinsTab && !feed.loading && !feed.err && !feed.note && mainItems.length === 0 && <p className="py-12 text-center text-sm text-slate-400">Nothing found for that. Try “forest rain” or “never give up”.</p>}
        {feed.err && !showSaved && !pinsTab && <div className="flex flex-col items-center gap-2 py-6 text-sm text-slate-300"><p>Couldn’t load videos right now.</p><button onClick={feed.retry} className="flex items-center gap-1.5 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>}
        {!showSaved && !pinsTab && <div ref={sentinel} className="flex h-16 items-center justify-center">{feed.loading && mainItems.length > 0 && <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />}{!feed.more && mainItems.length > 0 && !feed.loading && <span className="text-xs text-slate-500">You’ve reached the end — come back later for fresh videos.</span>}</div>}
        <p className="text-center text-[11px] leading-relaxed text-slate-500">Videos play from YouTube and belong to their creators. If things feel too heavy, talk to someone you trust — findahelpline.com lists free support worldwide.</p>
      </div>

      {open && <PlayerModal v={open} saved={isSaved(open.id)} onSave={() => toggleSave(open)} onClose={() => setOpen(null)} onPick={play} />}
      {reels !== null && <ReelsViewer startIndex={reels} pins={allPins} initialVibe={tab === 'saved' ? 'foryou' : tab} seed={seed + 1} weights={wParam} saved={isSaved} onSave={toggleSave} onSignal={signal} onClose={() => setReels(null)} />}
    </div>
  );
};
