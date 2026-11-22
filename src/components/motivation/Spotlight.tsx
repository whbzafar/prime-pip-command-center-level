import React, { useEffect, useRef, useState } from 'react';
import { Clapperboard, Play, Volume2, VolumeX } from 'lucide-react';
import { V, fmtViews, secs } from './shared';

const canHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/** Cinematic featured video: slow-zoom still, then a silent live preview on desktop. */
export const Spotlight: React.FC<{ v: V; onWatch: () => void; onReels: () => void }> = ({ v, onWatch, onReels }) => {
  const [live, setLive] = useState(false);
  const t = useRef<number>();
  const [sound, setSound] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const toggle = () => { const n = !sound; setSound(n); frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: n ? 'unMute' : 'mute', args: [] }), '*'); };
  useEffect(() => { setLive(false); if (canHover()) t.current = window.setTimeout(() => setLive(true), 1200); return () => window.clearTimeout(t.current); }, [v.id]);
  const start = secs(v.duration) > 90 ? 15 : 0;
  return (
    <section className="group relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_20px_80px_-20px_rgba(0,0,0,.8)] sm:aspect-[21/9]">
      <style>{`@keyframes ppKen{from{transform:scale(1)}to{transform:scale(1.14)}}`}</style>
      <img src={v.thumb} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ animation: 'ppKen 18s ease-out infinite alternate' }} />
      {live && <iframe ref={frame} title="spotlight preview" tabIndex={-1} allow="autoplay; encrypted-media" className="pointer-events-none absolute left-1/2 top-1/2 h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2" src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&controls=0&disablekb=1&modestbranding=1&playsinline=1&rel=0&start=${start}&loop=1&playlist=${v.id}&enablejsapi=1`} />}
      {live && <button onClick={toggle} aria-label={sound ? 'Mute' : 'Turn sound on'} className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-3 text-white backdrop-blur transition hover:scale-110">{sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" /><div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />
      <div className="mh-rise absolute inset-x-0 bottom-0 p-4 sm:p-8">
        <span className="mb-2 inline-block rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-200 backdrop-blur">Featured{v.vibe ? ` · ${v.vibe === 'dreamy' ? 'dreams' : v.vibe}` : ''}</span>
        <h2 className="max-w-2xl text-xl font-black leading-tight text-white drop-shadow-lg sm:text-4xl">{v.title}</h2>
        <p className="mt-1 text-xs text-white/70">{[v.channel, fmtViews(v.views)].filter(Boolean).join(' · ')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={onWatch} className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:scale-105"><Play className="h-4 w-4 fill-current" />Watch now</button>
          <button onClick={onReels} className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"><Clapperboard className="h-4 w-4" />Reels</button>
        </div>
      </div>
    </section>
  );
};
