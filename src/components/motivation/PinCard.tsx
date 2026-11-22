import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, Volume2, VolumeX } from 'lucide-react';
import { V } from './shared';
import { PinVideo } from './PinVideo';

const canHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
let current: (() => void) | null = null; // one pin plays at a time
const BADGE: Record<string, string> = { intense: 'bg-red-600/85', sigma: 'bg-indigo-500/80', nature: 'bg-emerald-500/80', serene: 'bg-sky-500/80', dreamy: 'bg-amber-500/85', stories: 'bg-cyan-600/80' };

/** Pinterest-format card: tall poster; plays on hover (desktop) or when scrolled into view (touch); sound button on the preview. */
export const PinCard: React.FC<{ v: V; saved: boolean; onOpen: () => void; onSave: () => void; ratio: string; delay?: number }> = ({ v, saved, onOpen, onSave, ratio, delay = 0 }) => {
  const [on, setOn] = useState(false);
  const [muted, setMuted] = useState(true);
  const [prog, setProg] = useState(0);
  const box = useRef<HTMLElement>(null);
  const timer = useRef<number>();
  const stop = useRef(() => { setOn(false); setMuted(true); }); stop.current = () => { setOn(false); setMuted(true); };
  const claim = () => { if (current && current !== stop.current) current(); current = stop.current; setOn(true); };
  const release = () => { window.clearTimeout(timer.current); setOn(false); setMuted(true); if (current === stop.current) current = null; };
  useEffect(() => () => { window.clearTimeout(timer.current); if (current === stop.current) current = null; }, []);
  useEffect(() => { // touch screens: play whichever pin is mostly on screen
    if (canHover() || !box.current) return;
    const io = new IntersectionObserver((es) => { const e = es[0]; window.clearTimeout(timer.current); if (e.isIntersecting && e.intersectionRatio > 0.7) timer.current = window.setTimeout(claim, 350); else release(); }, { threshold: [0, 0.7] });
    io.observe(box.current); return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <article ref={box} style={{ animationDelay: `${delay}ms` }} className="mh-rise group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-lg transition duration-300 hover:-translate-y-0.5 hover:border-rose-300/40 hover:shadow-[0_14px_44px_-12px_rgba(244,63,94,.4)]"
      onMouseEnter={() => { if (canHover()) { timer.current = window.setTimeout(claim, 250); } }} onMouseLeave={() => { if (canHover()) release(); }}>
      <div className="relative w-full" style={{ aspectRatio: ratio }}>
        <img src={v.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
        {on && <div className="absolute inset-0 animate-[mhfade_.4s_ease]"><PinVideo v={v} play muted={muted} preload="auto" onProgress={setProg} /></div>}
        <button onClick={onOpen} className="absolute inset-0 z-10" aria-label={`Watch ${v.title}`} />
        <span className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-transparent to-black/25" />
        <span className="pointer-events-none absolute left-2 top-2 z-20 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-extrabold text-red-600"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-black leading-none text-white">P</span>Pin</span>
        {v.vibe && <span className={`pointer-events-none absolute right-2 top-2 z-20 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize text-white ${BADGE[v.vibe] || 'bg-slate-600'}`}>{v.vibe === 'dreamy' ? 'dreams' : v.vibe}</span>}
        {on && <button onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} aria-label={muted ? 'Turn sound on' : 'Mute'} className="absolute bottom-12 right-2 z-30 rounded-full bg-black/60 p-2.5 text-white backdrop-blur transition hover:scale-110 hover:bg-black/80">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3"><h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-white drop-shadow">{v.title}</h3></div>
        {on && <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-0.5 bg-white/20"><div className="h-full bg-rose-400" style={{ width: `${prog * 100}%` }} /></div>}
        <button onClick={(e) => { e.stopPropagation(); onSave(); }} aria-label={saved ? 'Remove from saved' : 'Save'} className={`absolute bottom-2 right-2 z-30 rounded-full p-2 backdrop-blur transition ${on ? 'opacity-0' : ''} ${saved ? 'bg-cyan-400/30 text-cyan-200' : 'bg-black/40 text-white hover:bg-black/60'}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}</button>
      </div>
    </article>
  );
};
