import React, { useEffect, useRef, useState } from 'react';

/**
 * Opening scene of "Who is Wahab": a desolate winter night. Snow falls, a faint moon behind cloud,
 * a lone figure with a small lantern walks a snowy ridge, searching. Lines of the story fade in one
 * by one. Canvas + SVG; pauses when hidden; respects reduced motion.
 */
const LINES = [
  'A cold winter night.',
  'One man. One faint light.',
  'Searching for something the world said was not there.',
  'Nobody showed him the way.',
  'So he decided to build one.',
];

export const WinterNightIntro: React.FC<{ onContinue?: () => void }> = ({ onContinue }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduce) { setStep(LINES.length + 1); return; }
    const timers = LINES.map((_, i) => setTimeout(() => setStep(i + 1), 900 + i * 2300));
    timers.push(setTimeout(() => setStep(LINES.length + 1), 900 + LINES.length * 2300 + 600));
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  useEffect(() => {
    const c = canvas.current; if (!c || reduce) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let w = 0, h = 0, raf = 0; const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => { const r = c.getBoundingClientRect(); w = r.width; h = r.height; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); const ro = new ResizeObserver(size); ro.observe(c);
    type F = { x: number; y: number; r: number; v: number; drift: number; ph: number };
    const flakes: F[] = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 2.2, v: 0.0006 + Math.random() * 0.0016, drift: 0.3 + Math.random(), ph: Math.random() * 6.28 }));
    let t = 0;
    const tick = () => {
      if (document.visibilityState !== 'hidden') {
        t++;
        ctx.clearRect(0, 0, w, h);
        const wind = Math.sin(t / 240) * 0.0006 + 0.0003;
        for (const f of flakes) {
          f.y += f.v * (0.6 + f.r / 2.5); f.x += wind * f.drift + Math.sin(t / 60 + f.ph) * 0.00025;
          if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
          if (f.x > 1.02) f.x = -0.02; if (f.x < -0.02) f.x = 1.02;
          const a = 0.35 + f.r / 3.2;
          ctx.fillStyle = `rgba(226,236,255,${Math.min(0.95, a)})`;
          ctx.beginPath(); ctx.arc(f.x * w, f.y * h, f.r, 0, 6.283); ctx.fill();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [reduce]);

  return (
    <section className="relative -mx-3 sm:-mx-8 -mt-6 sm:-mt-12 overflow-hidden rounded-b-[2rem] border-b border-sky-200/10" style={{ minHeight: 'min(78vh, 640px)' }} data-testid="winter-intro">
      {/* night sky */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_18%,#1b2a4a_0%,#0b1324_38%,#05080f_75%)]" />
      {/* faint moon behind cloud */}
      <div className="absolute right-[14%] top-[12%] w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-[radial-gradient(circle,#e8eefc_0%,#b9c7e6_35%,rgba(185,199,230,0.15)_60%,transparent_72%)] opacity-70 ppfx-moon" />
      <div className="absolute right-[6%] top-[16%] w-72 h-16 rounded-full bg-slate-900/70 blur-2xl ppfx-cloud" />
      {/* distant hills */}
      <svg className="absolute inset-x-0 bottom-0 w-full h-[46%]" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="wnSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9d6ee" /><stop offset="1" stopColor="#6d7fa3" /></linearGradient>
          <radialGradient id="wnLamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffd98a" stopOpacity="0.9" /><stop offset="0.35" stopColor="#ffb54a" stopOpacity="0.35" /><stop offset="1" stopColor="#ff9a2e" stopOpacity="0" /></radialGradient>
        </defs>
        <path d="M0 210 C 180 150, 320 190, 480 160 S 820 120, 1000 170 S 1150 150, 1200 160 L1200 400 L0 400Z" fill="#1a2440" opacity="0.9" />
        <path d="M0 280 C 220 230, 420 270, 640 245 S 980 220, 1200 255 L1200 400 L0 400Z" fill="url(#wnSnow)" opacity="0.55" />
        <path d="M0 330 C 260 300, 520 335, 760 315 S 1060 300, 1200 320 L1200 400 L0 400Z" fill="#dfe8f8" opacity="0.9" />
        {/* footprints behind the walker */}
        <g className="ppfx-walker" fill="#9fb0cf" opacity="0.6">
          {Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={440 - i * 34} cy={318 + (i % 2) * 5} rx="5" ry="2" />)}
        </g>
        {/* lone figure with a lantern */}
        <g className="ppfx-walker">
          <circle cx="508" cy="268" r="46" fill="url(#wnLamp)" className="ppfx-lamp" />
          <g fill="#04060c">
            <circle cx="470" cy="236" r="9" />
            <path d="M462 246 q8 -4 16 0 l6 40 q-14 4 -28 0z" />
            <path d="M478 252 l26 10 l-2 5 l-26 -8z" />
            <path d="M462 285 l-6 30 l6 1 l9 -27z" className="ppfx-step-a" />
            <path d="M476 285 l8 30 l-6 1 l-9 -27z" className="ppfx-step-b" />
          </g>
          <rect x="503" y="262" width="9" height="12" rx="2" fill="#ffcf73" className="ppfx-lamp" />
        </g>
      </svg>
      <canvas ref={canvas} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />
      {/* story lines */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-20 pb-40 sm:pt-28 min-h-[inherit]">
        <div className="space-y-3 max-w-xl">
          {LINES.map((l, i) => (
            <p key={l} className={`font-display text-[17px] sm:text-[24px] tracking-wide transition-all duration-[1400ms] ${step > i ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-3 blur-sm'} ${i === LINES.length - 1 ? 'text-amber-200 font-bold text-[20px] sm:text-[30px] drop-shadow-[0_0_18px_rgba(255,190,90,0.55)]' : 'text-slate-200/90'}`}>{l}</p>
          ))}
        </div>
        <div className={`mt-8 transition-all duration-[1600ms] ${step > LINES.length ? 'opacity-100' : 'opacity-0'}`}>
          <div className="text-[11px] font-mono-code uppercase tracking-[0.4em] text-sky-200/70">This is the story of</div>
          <div className="mt-1 text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-white drop-shadow-[0_0_30px_rgba(160,190,255,0.35)]">WAHAB ZAFAR</div>
          <div className="mt-1 text-[11px] sm:text-xs font-mono-code uppercase tracking-[0.3em] text-amber-200/90">Founder of the SBT Indicator · Prime Pip FX</div>
          {onContinue && (
            <button type="button" onClick={onContinue} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-amber-200/50 bg-amber-200/10 text-amber-100 text-sm font-bold hover:bg-amber-200/20 cursor-pointer">
              Walk with him ↓
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
