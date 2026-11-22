import React, { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, X } from 'lucide-react';
import { V, ago, fmtViews } from './shared';
import { PinVideo } from './PinVideo';

export const PlayerModal: React.FC<{ v: V; saved: boolean; onSave: () => void; onClose: () => void; onPick: (v: V) => void }> = ({ v, saved, onSave, onClose, onPick }) => {
  const [more, setMore] = useState<V[]>([]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  useEffect(() => { setMore([]); if (v.kind === 'pin') return; let off = false; fetch(`/api/motivation/similar?title=${encodeURIComponent(v.title)}&vibe=${v.vibe || ''}`).then((r) => r.json()).then((j) => { if (!off) setMore((j.items || []).filter((x: V) => x.id !== v.id)); }).catch(() => undefined); return () => { off = true; }; }, [v.id, v.title, v.vibe]);
  return (
    <div className="fixed inset-0 z-[9000] flex items-start justify-center overflow-y-auto bg-slate-950/90 p-0 backdrop-blur-xl sm:p-6" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mh-pop w-full max-w-4xl overflow-hidden bg-slate-900 shadow-2xl sm:rounded-3xl sm:border sm:border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className={`relative w-full bg-black ${v.kind === 'pin' ? 'mx-auto h-[78vh] max-w-md' : 'aspect-video'}`}>
          {v.kind === 'pin' ? <PinVideo v={v} play muted={false} controls fit="contain" preload="auto" /> : <iframe key={v.id} className="absolute inset-0 h-full w-full" src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`} title={v.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />}
          <button onClick={onClose} aria-label="Close" className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white backdrop-blur hover:bg-black/80"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex items-start gap-3 p-4">
          <div className="min-w-0 flex-1"><h2 className="text-base font-bold leading-snug text-white sm:text-lg">{v.title}</h2><p className="mt-1 text-xs text-slate-400">{[v.channel, fmtViews(v.views), ago(v.published)].filter(Boolean).join(' · ')}</p></div>
          <button onClick={onSave} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${saved ? 'bg-cyan-400/20 text-cyan-300' : 'bg-white/10 text-white'}`}>{saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{saved ? 'Saved' : 'Save'}</button>
          <a href={v.kind === 'pin' ? `https://www.pinterest.com/pin/${v.pinId}/` : `https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white"><ExternalLink className="h-4 w-4" />{v.kind === 'pin' ? 'Pinterest' : 'YouTube'}</a>
        </div>
        {more.length > 0 && (
          <div className="border-t border-white/10 p-4">
            <h3 className="mb-3 text-sm font-bold text-white">More like this</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {more.slice(0, 6).map((m) => <button key={m.id} onClick={() => onPick(m)} className="flex gap-3 rounded-xl p-1.5 text-left transition hover:bg-white/5"><img src={m.thumb} alt="" loading="lazy" className="aspect-video w-32 shrink-0 rounded-lg object-cover" /><div className="min-w-0"><p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{m.title}</p><p className="mt-1 truncate text-[11px] text-slate-400">{m.channel}</p></div></button>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
