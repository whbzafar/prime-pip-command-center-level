import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { V } from './shared';

/** Native video for a Pinterest pin. Tries each file in turn (H.264 → AV1 → HEVC); if none plays, shows the poster with a link to Pinterest. */
export const PinVideo: React.FC<{ v: V; play: boolean; muted: boolean; preload?: 'none' | 'metadata' | 'auto'; fit?: 'cover' | 'contain'; controls?: boolean; className?: string; onProgress?: (p: number) => void; onReady?: () => void }> = ({ v, play, muted, preload = 'metadata', fit = 'cover', controls, className = '', onProgress, onReady }) => {
  const [i, setI] = useState(0);
  const [ready, setReady] = useState(false);
  const el = useRef<HTMLVideoElement>(null);
  const srcs = v.srcs || [];
  useEffect(() => { setI(0); setReady(false); }, [v.id]);
  useEffect(() => { const e = el.current; if (!e) return; e.muted = muted; }, [muted, i]);
  useEffect(() => { const e = el.current; if (!e) return; if (play) { const p = e.play(); if (p) p.catch(() => { e.muted = true; e.play().catch(() => undefined); }); } else e.pause(); }, [play, i, ready]);
  if (i >= srcs.length) return (
    <div className={`relative h-full w-full ${className}`}><img src={v.thumb} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      <a href={`https://www.pinterest.com/pin/${v.pinId}/`} target="_blank" rel="noopener noreferrer" className="absolute inset-x-6 bottom-6 flex items-center justify-center gap-2 rounded-full bg-white/90 py-2 text-xs font-bold text-slate-950"><ExternalLink className="h-4 w-4" />Watch on Pinterest</a></div>
  );
  return (
    <video ref={el} key={srcs[i]} src={srcs[i]} poster={v.thumb} loop playsInline muted={muted} preload={preload} controls={controls} referrerPolicy="no-referrer"
      onLoadedData={(e) => { if (e.currentTarget.videoWidth === 0) { setI((n) => n + 1); return; } setReady(true); onReady?.(); }} onError={() => setI((n) => n + 1)}
      onTimeUpdate={(e) => onProgress?.(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
      className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`} />
  );
};
