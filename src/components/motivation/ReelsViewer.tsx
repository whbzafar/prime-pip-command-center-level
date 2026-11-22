import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, ExternalLink, Heart, Loader2, Pause, RefreshCw, Volume2, VolumeX, X } from 'lucide-react';
import { TABS, V, secs, useFeed, weave } from './shared';
import { PinVideo } from './PinVideo';
import type { Signal } from '../../utils/tasteProfile';

/**
 * Full-screen vertical scroller. Speed: the next and previous reels are loaded in the background (paused) so a swipe lands on a
 * ready player instead of waiting for one to boot; only the visible reel plays. Pinterest pins play from native video (instant).
 */
export const ReelsViewer: React.FC<{ startIndex?: number; initialVibe: string; seed: number; weights: string; pins: V[]; saved: (id: string) => boolean; onSave: (v: V) => void; onSignal: (s: Signal, v: V) => void; onClose: () => void }> = ({ startIndex = 0, initialVibe, seed, weights, pins, saved, onSave, onSignal, onClose }) => {
  const [vibe, setVibe] = useState(initialVibe === 'pins' || !TABS.some((t) => t.id === initialVibe) ? 'foryou' : initialVibe);
  const feed = useFeed({ vibe, q: '', reel: true, seed, weights });
  const mine = useMemo(() => (vibe === 'foryou' ? pins : pins.filter((p) => p.vibe === vibe)), [pins, vibe]);
  const items = useMemo(() => weave(feed.items, mine, 3), [feed.items, mine]);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [heart, setHeart] = useState<string | null>(null);
  const [prog, setProg] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const frames = useRef(new Map<number, HTMLIFrameElement>());
  const since = useRef(Date.now());
  const lastTap = useRef(0); const tapTimer = useRef<number>();

  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  const jumped = useRef(startIndex === 0);
  useEffect(() => { jumped.current = true; setActive(0); box.current?.scrollTo({ top: 0 }); }, [vibe]);
  useEffect(() => { if (jumped.current || items.length <= startIndex) return; jumped.current = true; setActive(startIndex); box.current?.querySelector(`[data-i="${startIndex}"]`)?.scrollIntoView({ behavior: 'auto' }); }, [items.length, startIndex]);

  const cmd = useCallback((i: number, func: string) => { try { frames.current.get(i)?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*'); } catch { /* player not ready yet */ } }, []);
  // play the visible YouTube reel, pause the preloaded neighbours; retry a few times because a freshly loaded player needs a moment
  useEffect(() => {
    setPaused(false); setProg(0);
    const run = () => frames.current.forEach((_, i) => { cmd(i, i === active ? 'playVideo' : 'pauseVideo'); cmd(i, muted ? 'mute' : 'unMute'); });
    run(); const t1 = setTimeout(run, 500), t2 = setTimeout(run, 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active, muted, cmd, items.length]);

  const lastRef = useRef<V | null>(null);
  useEffect(() => {
    const cur = items[active]; const prev = lastRef.current;
    if (prev && prev.id !== cur?.id) { const dwell = Date.now() - since.current; onSignal(dwell < 2000 ? 'reel_skip' : 'reel_watch', prev); }
    lastRef.current = cur || null; since.current = Date.now();
  }, [active, items, onSignal]);
  useEffect(() => () => { const p = lastRef.current; if (p && Date.now() - since.current > 6000) onSignal('reel_watch', p); }, [onSignal]);

  useEffect(() => {
    const root = box.current; if (!root) return;
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset.i)); }, { root, threshold: [0.6] });
    root.querySelectorAll('[data-i]').forEach((n) => io.observe(n)); return () => io.disconnect();
  }, [items.length]);
  useEffect(() => { if (items.length && active >= items.length - 4 && feed.more && !feed.loading) feed.loadMore(); }, [active, feed, items.length]);
  const go = useCallback((d: number) => { const n = Math.max(0, Math.min(items.length - 1, active + d)); box.current?.querySelector(`[data-i="${n}"]`)?.scrollIntoView({ behavior: 'smooth' }); }, [active, items.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); go(1); } else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); go(-1); } else if (e.key === 'm') setMuted((m) => !m); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [go, onClose]);

  const tap = (v: V, i: number) => {
    const now = Date.now();
    if (now - lastTap.current < 280) { window.clearTimeout(tapTimer.current); lastTap.current = 0; if (!saved(v.id)) { onSave(v); onSignal('save', v); } setHeart(v.id); setTimeout(() => setHeart(null), 800); return; }
    lastTap.current = now;
    tapTimer.current = window.setTimeout(() => { if (i !== active) return; if (v.kind !== 'pin') cmd(i, paused ? 'playVideo' : 'pauseVideo'); setPaused((p) => !p); }, 250);
  };
  const cur = items[active];
  return (
    <div className="mh-pop fixed inset-0 z-[9500] bg-black text-white">
      {cur && <img src={cur.thumb} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-3xl transition-opacity duration-700" />}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-3">
        <button onClick={onClose} aria-label="Close reels" className="rounded-full bg-white/10 p-2 backdrop-blur transition hover:scale-110 hover:bg-white/20"><X className="h-5 w-5" /></button>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {TABS.filter((t) => t.id !== 'pins').map((t) => <button key={t.id} onClick={() => setVibe(t.id)} className={`mh-tab shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur ${vibe === t.id ? 'bg-white text-slate-950 shadow-lg' : 'bg-white/10 text-white/90 hover:bg-white/20'}`}>{t.label}</button>)}
        </div>
        <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Turn sound on' : 'Mute'} className="rounded-full bg-white/10 p-2 backdrop-blur transition hover:scale-110 hover:bg-white/20">{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
      </div>

      <div ref={box} className="relative z-10 mx-auto h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain sm:max-w-[440px] [scrollbar-width:none]">
        {items.map((v, i) => {
          const live = i === active; const near = Math.abs(i - active) <= 1; const crop = v.short || secs(v.duration) <= 61;
          return (
            <section key={v.id} data-i={i} className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black" style={{ containerType: 'size', contain: 'layout paint' }}>
              <img src={v.thumb} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
              {v.kind === 'pin' ? (Math.abs(i - active) <= 2 && <div className="absolute inset-0"><PinVideo v={v} play={live && !paused} muted={muted} preload={near ? 'auto' : 'metadata'} onProgress={live ? setProg : undefined} /></div>)
                : near && <iframe ref={(el) => { if (el) frames.current.set(i, el); else frames.current.delete(i); }} title={v.title} allow="autoplay; encrypted-media; picture-in-picture" onLoad={() => { cmd(i, muted ? 'mute' : 'unMute'); if (i === active) cmd(i, 'playVideo'); }}
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0" style={crop ? { width: '177.78cqh', height: '100cqh' } : { width: '100cqw', height: '56.25cqw' }}
                  src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=0&mute=1&controls=0&disablekb=1&loop=1&playlist=${v.id}&playsinline=1&modestbranding=1&rel=0&enablejsapi=1`} />}
              <button className="absolute inset-0 z-10" aria-label="Pause or play · double-tap to save" onClick={() => tap(v, i)} />
              {live && paused && <span className="mh-pop pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 p-5 backdrop-blur"><Pause className="h-8 w-8 fill-white" /></span>}
              {heart === v.id && <Heart className="mh-heart pointer-events-none absolute left-1/2 top-1/2 z-30 h-24 w-24 -translate-x-1/2 -translate-y-1/2 fill-rose-500 text-rose-500 drop-shadow-2xl" />}
              <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 pb-8 pr-16 ${live ? 'mh-slide' : ''}`}>
                {v.vibe && <span className="mb-1.5 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">{v.kind === 'pin' ? 'Pinterest · ' : ''}{v.vibe === 'dreamy' ? 'dreams' : v.vibe}</span>}
                <h3 className="line-clamp-2 text-sm font-bold leading-snug drop-shadow">{v.title}</h3>
                {v.channel && v.kind !== 'pin' && <p className="mt-1 text-xs text-white/70">{v.channel}</p>}
              </div>
              {live && v.kind === 'pin' && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-0.5 bg-white/20"><div className="h-full bg-rose-400" style={{ width: `${prog * 100}%` }} /></div>}
              <div className="absolute bottom-24 right-3 z-30 flex flex-col items-center gap-4">
                <button onClick={() => { onSave(v); if (!saved(v.id)) onSignal('save', v); }} aria-label="Save" className="rounded-full bg-black/40 p-3 backdrop-blur transition hover:scale-110 hover:bg-black/60 active:scale-90">{saved(v.id) ? <BookmarkCheck className="h-6 w-6 text-cyan-300" /> : <Bookmark className="h-6 w-6" />}</button>
                <a href={v.kind === 'pin' ? `https://www.pinterest.com/pin/${v.pinId}/` : `https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" aria-label="Open original" className="rounded-full bg-black/40 p-3 backdrop-blur transition hover:scale-110 hover:bg-black/60"><ExternalLink className="h-6 w-6" /></a>
              </div>
            </section>
          );
        })}
        {feed.loading && <div className="flex h-[100dvh] snap-start items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-white/70" /></div>}
        {feed.err && <div className="flex h-[100dvh] snap-start flex-col items-center justify-center gap-3 text-sm"><p>Couldn’t load reels.</p><button onClick={feed.retry} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>}
        {!feed.loading && !feed.err && items.length === 0 && <div className="flex h-[100dvh] snap-start items-center justify-center px-8 text-center text-sm text-white/70">{feed.note?.text || 'No reels right now — try another category.'}</div>}
      </div>
      <div className="absolute right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button onClick={() => go(-1)} aria-label="Previous" className="rounded-full bg-white/10 p-3 backdrop-blur transition hover:scale-110 hover:bg-white/20"><ChevronUp className="h-5 w-5" /></button>
        <button onClick={() => go(1)} aria-label="Next" className="rounded-full bg-white/10 p-3 backdrop-blur transition hover:scale-110 hover:bg-white/20"><ChevronDown className="h-5 w-5" /></button>
      </div>
    </div>
  );
};
