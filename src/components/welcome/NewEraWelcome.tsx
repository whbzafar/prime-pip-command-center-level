import React, { useEffect, useRef, useState } from 'react';
import { startNoirAmbient, Ambient } from './noirAmbient';

export function NewEraWelcome({ name, onEnter }: { name?: string; onEnter: () => void }) {
  const amb = useRef<Ambient | null>(null);
  const [muted, setMuted] = useState(false);
  const [needTap, setNeedTap] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    amb.current = startNoirAmbient();
    const t = setTimeout(() => { void amb.current?.resume().then((ok) => setNeedTap(!ok)); }, 900);
    return () => { clearTimeout(t); amb.current?.stop(); };
  }, []);
  const enable = () => { void amb.current?.resume().then((ok) => setNeedTap(!ok)); };
  const enter = () => { setLeaving(true); amb.current?.stop(); setTimeout(onEnter, 650); };
  const first = (name || '').trim().split(/\s+/)[0];
  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome to a New Era" onPointerDown={needTap ? enable : undefined}
      className={`ne-root fixed inset-0 z-[300] overflow-y-auto ${leaving ? 'ne-out' : ''}`}>
      <div className="ne-bg" aria-hidden />
      <div className="ne-veil" aria-hidden />
      <div className="ne-grain" aria-hidden />
      <button type="button" aria-label={muted ? 'Unmute ambient sound' : 'Mute ambient sound'} onClick={(e) => { e.stopPropagation(); const m = !muted; setMuted(m); amb.current?.setMuted(m); if (!m) enable(); }}
        className="fixed right-4 top-4 z-10 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-0">
        {muted ? '🔇 Sound off' : '🔊 Sound on'}
      </button>
      <div className="relative z-[1] mx-auto flex min-h-full max-w-xl flex-col justify-end px-6 pb-10 pt-24 sm:justify-center">
        <p className="ne-rise text-[11px] font-bold uppercase tracking-[0.35em] text-cyan-300/90" style={{ animationDelay: '.2s' }}>Prime Pip Command Center</p>
        <h1 className="ne-rise ne-title mt-3 text-4xl font-black leading-[1.05] text-white sm:text-5xl" style={{ animationDelay: '.45s' }}>
          Congratulations{first ? `, ${first}` : ''}.<br />Welcome to a <span className="ne-neon">New Era</span>.
        </h1>
        <div className="ne-rise mt-5 space-y-3 text-[15px] leading-relaxed text-slate-100 sm:text-base" style={{ animationDelay: '.8s' }}>
          <p>This platform will keep surprising you with things beyond what you imagine. Stay tuned.</p>
          <p>You are capable of what others find impossible. Ignore the noise and keep yourself motivated.</p>
          <p>Respect the application, and it will respect you back. Keep working hard, say your name, and your dreams will come true one day. Challenges will come — do not lose heart, and do not be afraid. That is normal.</p>
          <p className="text-slate-300">And remember <b className="text-white">Wahab</b> — the one who built every piece of this. Will you ever forget?</p>
        </div>
        <button type="button" onClick={enter} className="ne-rise ne-cta mt-8 w-full rounded-2xl px-6 py-4 text-base font-extrabold tracking-wide text-white" style={{ animationDelay: '1.2s' }}>
          Enter the New Era
        </button>
        {needTap && <p className="mt-3 text-center text-xs text-slate-300/80">Tap anywhere for ambient sound</p>}
      </div>
    </div>
  );
}
