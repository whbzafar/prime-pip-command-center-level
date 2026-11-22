import React, { useEffect, useRef, useState } from 'react';
import { Bookmark, BookmarkCheck, Play } from 'lucide-react';
import { V, ago, fmtViews, secs } from './shared';

const canHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
let activePreview: (() => void) | null = null; // only one preview plays at a time

const BADGE: Record<string, string> = { sigma: 'bg-indigo-500/80', nature: 'bg-emerald-500/80', serene: 'bg-sky-500/80', dreamy: 'bg-fuchsia-500/80', stories: 'bg-amber-500/80' };

export const VideoCard: React.FC<{ v: V; saved: boolean; onOpen: () => void; onSave: () => void; compact?: boolean }> = ({ v, saved, onOpen, onSave, compact }) => {
  const [preview, setPreview] = useState(false);
  const timer = useRef<number>();
  const stop = () => { window.clearTimeout(timer.current); setPreview(false); if (activePreview === stopRef.current) activePreview = null; };
  const stopRef = useRef(stop); stopRef.current = stop;
  useEffect(() => () => { window.clearTimeout(timer.current); if (activePreview === stopRef.current) activePreview = null; }, []);
  const enter = () => {
    if (!canHover()) return;
    timer.current = window.setTimeout(() => { activePreview?.(); activePreview = stopRef.current; setPreview(true); }, 450);
  };
  const start = secs(v.duration) > 90 ? 12 : 0;
  return (
    <article className={`group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:shadow-[0_10px_40px_-10px_rgba(34,211,238,.35)] ${compact ? 'w-64 shrink-0 snap-start' : ''}`}>
      <div className="relative aspect-video w-full overflow-hidden bg-black" onMouseEnter={enter} onMouseLeave={stop}>
        <button onClick={onOpen} className="absolute inset-0 h-full w-full" aria-label={`Watch ${v.title}`}>
          <img src={v.thumb} alt="" loading="lazy" className={`h-full w-full object-cover transition duration-700 ${preview ? 'opacity-0' : 'group-hover:scale-105'}`} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.15'; }} />
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {!preview && <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white opacity-0 backdrop-blur-md transition group-hover:opacity-100"><Play className="ml-0.5 h-5 w-5 fill-current" /></span>}
        </button>
        {preview && <iframe className="pointer-events-none absolute inset-0 h-full w-full" title="preview" tabIndex={-1} allow="autoplay; encrypted-media" src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&controls=0&disablekb=1&modestbranding=1&playsinline=1&rel=0&start=${start}&loop=1&playlist=${v.id}`} />}
        {preview && <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Preview · click to watch</span>}
        {v.duration && <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white">{v.duration}</span>}
        {v.vibe && <span className={`pointer-events-none absolute left-2 bottom-2 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize text-white ${BADGE[v.vibe] || 'bg-slate-600'}`}>{v.vibe}</span>}
      </div>
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-white">{v.title}</h3>
          <p className="mt-1 truncate text-[11px] text-slate-400">{[v.channel, fmtViews(v.views), ago(v.published)].filter(Boolean).join(' · ')}</p>
        </div>
        <button onClick={onSave} aria-label={saved ? 'Remove from saved' : 'Save'} className={`shrink-0 rounded-lg p-2 transition ${saved ? 'bg-cyan-400/20 text-cyan-300' : 'bg-white/5 text-slate-400 hover:text-white'}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}</button>
      </div>
    </article>
  );
};
