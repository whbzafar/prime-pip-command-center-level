import React, { useEffect, useRef, useState } from 'react';

interface Props {
  aspect: number; maxWidth: number; muted: boolean; onMute: () => void;
  canPause: boolean; paused: boolean; onPause: () => void; lockLandscape?: boolean; toolbar?: 'top' | 'bottom'; children: React.ReactNode;
}
/** Frame shared by both games: windowed or true full-screen (with a CSS fallback where the browser has no Fullscreen API, e.g. iPhone Safari), pause, mute. */
export const GameShell: React.FC<Props> = ({ aspect, maxWidth, muted, onMute, canPause, paused, onPause, lockLandscape, toolbar = 'top', children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [native, setNative] = useState(false);
  const [fake, setFake] = useState(false);
  const full = native || fake;
  useEffect(() => {
    const h = () => setNative(document.fullscreenElement === ref.current || (document as any).webkitFullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', h); document.addEventListener('webkitfullscreenchange', h);
    return () => { document.removeEventListener('fullscreenchange', h); document.removeEventListener('webkitfullscreenchange', h); };
  }, []);
  useEffect(() => {
    if (!fake) return;
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setFake(false); };
    window.addEventListener('keydown', k);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', k); };
  }, [fake]);
  const unlock = () => { try { (screen.orientation as any)?.unlock?.(); } catch { /* ignore */ } };
  const exit = async () => {
    setFake(false);
    try { if (document.fullscreenElement) await document.exitFullscreen(); else if ((document as any).webkitFullscreenElement) (document as any).webkitExitFullscreen(); } catch { /* ignore */ }
    unlock();
  };
  const enter = async () => {
    const el: any = ref.current; if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else setFake(true);
    } catch { setFake(true); }
    if (lockLandscape) { try { await (screen.orientation as any)?.lock?.('landscape'); } catch { /* not supported */ } }
  };
  useEffect(() => () => { try { if (document.fullscreenElement) void document.exitFullscreen(); } catch { /* ignore */ } unlock(); }, []);
  const btn = 'rounded-md bg-slate-900/75 px-2.5 py-1.5 text-xs font-bold text-white backdrop-blur cursor-pointer hover:bg-slate-800';
  return (
    <div ref={ref} data-testid="game-shell" className={`${full ? 'fixed inset-0 z-[99999] bg-black' : 'relative mx-auto w-full'} select-none overflow-hidden rounded-xl`}
      style={full ? { width: '100%', height: '100%' } : { aspectRatio: String(aspect), maxWidth }}>
      {children}
      <div className={`absolute right-2 z-20 flex gap-1.5 ${toolbar === 'top' ? 'top-2' : 'bottom-2'}`}>
        {canPause && <button type="button" data-testid="game-pause" aria-label={paused ? 'Resume' : 'Pause'} onClick={onPause} className={btn}>{paused ? '▶' : '⏸'}</button>}
        <button type="button" aria-label={muted ? 'Sound on' : 'Sound off'} onClick={onMute} className={btn}>{muted ? '🔇' : '🔊'}</button>
        <button type="button" data-testid="game-fullscreen" aria-label={full ? 'Minimize' : 'Full screen'} onClick={full ? exit : enter} className={btn}>{full ? '🗗' : '⛶'}<span className="hidden sm:inline"> {full ? 'Minimize' : 'Full screen'}</span></button>
      </div>
    </div>
  );
};
