import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, ExternalLink, Loader2, Pause, RefreshCw, Volume2, VolumeX, X } from 'lucide-react';
import { TABS, V, secs, useFeed } from './shared';
import type { Signal } from '../../utils/tasteProfile';

/** Full-screen vertical video scroller (Reels / Shorts style). One player mounted at a time; swipe / scroll / arrow keys to move. */
export const ReelsViewer: React.FC<{ startIndex?: number; initialVibe: string; seed: number; weights: string; saved: (id: string) => boolean; onSave: (v: V) => void; onSignal: (s: Signal, v: V) => void; onClose: () => void }> = ({ startIndex = 0, initialVibe, seed, weights, saved, onSave, onSignal, onClose }) => {
  const [vibe, setVibe] = useState(initialVibe === 'stories' || initialVibe === 'foryou' || TABS.some((t) => t.id === initialVibe) ? initialVibe : 'foryou');
  const feed = useFeed({ vibe, q: '', reel: true, seed, weights });
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);
  const since = useRef(Date.now());

  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev; }; }, []);
  const jumped = useRef(startIndex === 0);
  useEffect(() => { jumped.current = true; setActive(0); box.current?.scrollTo({ top: 0 }); }, [vibe]);
  useEffect(() => { // opened from a tapped reel card: jump straight to it
    if (jumped.current || feed.items.length <= startIndex) return;
    jumped.current = true; setActive(startIndex); box.current?.querySelector(`[data-i="${startIndex}"]`)?.scrollIntoView({ behavior: 'auto' });
  }, [feed.items.length, startIndex]);

  const cmd = useCallback((func: string) => { try { frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args: [] }), '*'); } catch { /* player not ready */ } }, []);
  // dwell → taste signal when the viewer moves on
  const lastRef = useRef<V | null>(null);
  useEffect(() => {
    const cur = feed.items[active]; setPaused(false);
    const prev = lastRef.current;
    if (prev && prev.id !== cur?.id) onSignal(Date.now() - since.current > 6000 ? 'reel_watch' : Date.now() - since.current < 2000 ? 'reel_skip' : 'reel_watch', prev);
    lastRef.current = cur || null; since.current = Date.now();
  }, [active, feed.items, onSignal]);
  useEffect(() => () => { const p = lastRef.current; if (p && Date.now() - since.current > 6000) onSignal('reel_watch', p); }, [onSignal]);

  useEffect(() => { // which slide is mostly visible
    const root = box.current; if (!root) return;
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting && e.intersectionRatio > 0.65) setActive(Number((e.target as HTMLElement).dataset.i)); }, { root, threshold: [0.65] });
    root.querySelectorAll('[data-i]').forEach((n) => io.observe(n)); return () => io.disconnect();
  }, [feed.items.length]);
  useEffect(() => { if (feed.items.length && active >= feed.items.length - 3 && feed.more && !feed.loading) feed.loadMore(); }, [active, feed]);
  const go = useCallback((d: number) => { const n = Math.max(0, Math.min(feed.items.length - 1, active + d)); box.current?.querySelector(`[data-i="${n}"]`)?.scrollIntoView({ behavior: 'smooth' }); }, [active, feed.items.length]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); go(1); } else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); go(-1); } else if (e.key === 'm') setMuted((m) => !m); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [go, onClose]);
  useEffect(() => { cmd(muted ? 'mute' : 'unMute'); }, [muted, cmd, active]);

  const cur = feed.items[active];
  return (
    <div className="fixed inset-0 z-[9500] bg-black text-white">
      {cur && <img src={cur.thumb} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-3xl" />}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-3">
        <button onClick={onClose} aria-label="Close reels" className="rounded-full bg-white/10 p-2 backdrop-blur hover:bg-white/20"><X className="h-5 w-5" /></button>
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {TABS.map((t) => <button key={t.id} onClick={() => setVibe(t.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur transition ${vibe === t.id ? 'bg-white text-slate-950' : 'bg-white/10 text-white/90 hover:bg-white/20'}`}>{t.label}</button>)}
        </div>
        <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="rounded-full bg-white/10 p-2 backdrop-blur hover:bg-white/20">{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
      </div>

      <div ref={box} className="relative z-10 mx-auto h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain sm:max-w-[440px] [scrollbar-width:none]">
        {feed.items.map((v, i) => {
          const live = i === active; const crop = v.short || secs(v.duration) <= 61;
          return (
            <section key={v.id} data-i={i} className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden bg-black" style={{ containerType: 'size' }}>
              {live ? (
                <iframe ref={(el) => { frame.current = el; }} key={v.id} title={v.title} allow="autoplay; encrypted-media; picture-in-picture" onLoad={() => cmd(muted ? 'mute' : 'unMute')}
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-0"
                  style={crop ? { width: '177.78cqh', height: '100cqh' } : { width: '100cqw', height: '56.25cqw' }}
                  src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&controls=0&disablekb=1&loop=1&playlist=${v.id}&playsinline=1&modestbranding=1&rel=0&enablejsapi=1`} />
              ) : (Math.abs(i - active) <= 2 && <img src={v.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />)}
              <button className="absolute inset-0 z-10" aria-label="Pause or play" onClick={() => { if (!live) return; cmd(paused ? 'playVideo' : 'pauseVideo'); setPaused((p) => !p); }} />
              {live && paused && <span className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/50 p-5 backdrop-blur"><Pause className="h-8 w-8 fill-white" /></span>}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-4 pb-8 pr-16">
                {v.vibe && <span className="mb-1.5 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur">{v.vibe}</span>}
                <h3 className="line-clamp-2 text-sm font-bold leading-snug drop-shadow">{v.title}</h3>
                {v.channel && <p className="mt-1 text-xs text-white/70">{v.channel}</p>}
              </div>
              <div className="absolute bottom-24 right-3 z-30 flex flex-col items-center gap-4">
                <button onClick={() => { onSave(v); if (!saved(v.id)) onSignal('save', v); }} aria-label="Save" className="rounded-full bg-black/40 p-3 backdrop-blur transition hover:bg-black/60">{saved(v.id) ? <BookmarkCheck className="h-6 w-6 text-cyan-300" /> : <Bookmark className="h-6 w-6" />}</button>
                <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube" className="rounded-full bg-black/40 p-3 backdrop-blur hover:bg-black/60"><ExternalLink className="h-6 w-6" /></a>
              </div>
            </section>
          );
        })}
        {feed.loading && <div className="flex h-[100dvh] snap-start items-center justify-center">{<Loader2 className="h-8 w-8 animate-spin text-white/70" />}</div>}
        {feed.err && <div className="flex h-[100dvh] snap-start flex-col items-center justify-center gap-3 text-sm"><p>Couldn’t load reels.</p><button onClick={feed.retry} className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-950"><RefreshCw className="h-3.5 w-3.5" />Try again</button></div>}
        {!feed.loading && !feed.err && feed.items.length === 0 && <div className="flex h-[100dvh] snap-start items-center justify-center px-8 text-center text-sm text-white/70">{feed.note?.text || 'No reels right now — try another category.'}</div>}
      </div>
      <div className="absolute right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        <button onClick={() => go(-1)} aria-label="Previous" className="rounded-full bg-white/10 p-3 backdrop-blur hover:bg-white/20"><ChevronUp className="h-5 w-5" /></button>
        <button onClick={() => go(1)} aria-label="Next" className="rounded-full bg-white/10 p-3 backdrop-blur hover:bg-white/20"><ChevronDown className="h-5 w-5" /></button>
      </div>
    </div>
  );
};
