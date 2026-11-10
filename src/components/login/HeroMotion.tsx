import React, { useEffect, useRef } from 'react';

/**
 * Motion layer over the "You can do it" golden-hour photo:
 *  · sun rays streaming down from the sun (top-right), slowly turning and breathing
 *  · a pulsing sun flare
 *  · the jumper's "soul" — a luminous copy of the figure rising out of the body and dissolving into light
 *  · golden motes drifting up through the light, with a spark stream rising from the figure
 * Everything is CSS + one small canvas; it pauses when the screen is hidden and respects reduced motion.
 */
const SUN = { x: 0.975, y: 0.44 };     // where the sun sits in the photo (fractions of width / height)
const FIGURE = { x: 0.51, y: 0.68 };   // the jumping figure

export const HeroMotion: React.FC<{ src: string }> = ({ src }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current; if (!c) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let raf = 0; let w = 0; let h = 0; const dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = () => { const r = c.getBoundingClientRect(); w = r.width; h = r.height; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const ro = new ResizeObserver(size); ro.observe(c);
    type P = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; soul: boolean };
    const ps: P[] = [];
    const spawn = (soul: boolean): P => soul
      ? { x: FIGURE.x * w + (Math.random() - 0.5) * w * 0.05, y: FIGURE.y * h - Math.random() * h * 0.08, vx: (Math.random() - 0.5) * 0.25, vy: -(0.35 + Math.random() * 0.7), r: 0.6 + Math.random() * 1.8, life: 0, max: 120 + Math.random() * 110, soul }
      : { x: Math.random() * w, y: h * (0.35 + Math.random() * 0.7), vx: (Math.random() - 0.3) * 0.18, vy: -(0.08 + Math.random() * 0.25), r: 0.4 + Math.random() * 1.4, life: 0, max: 260 + Math.random() * 260, soul };
    for (let i = 0; i < 46; i++) { const p = spawn(false); p.life = Math.random() * p.max; ps.push(p); }
    const tick = () => {
      if (document.visibilityState === 'hidden') { raf = requestAnimationFrame(tick); return; }
      ctx.clearRect(0, 0, w, h);
      if (Math.random() < 0.55) ps.push(spawn(true));
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life++; p.x += p.vx + Math.sin((p.life + i) / 26) * (p.soul ? 0.22 : 0.08); p.y += p.vy;
        const t = p.life / p.max;
        if (t >= 1) { if (p.soul) ps.splice(i, 1); else Object.assign(p, spawn(false)); continue; }
        const a = Math.sin(Math.PI * t) * (p.soul ? 0.95 : 0.7);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(255,246,214,${a})`); g.addColorStop(0.35, `rgba(255,196,92,${a * 0.6})`); g.addColorStop(1, 'rgba(255,170,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const rayAt = `${30 + SUN.x * 40}% ${30 + SUN.y * 40}%`; // sun position inside the oversized ray layer
  const sun = `${SUN.x * 100}% ${SUN.y * 100}%`;
  const fig = `${FIGURE.x * 100}% ${FIGURE.y * 100}%`;
  const rayMask = `radial-gradient(circle at ${rayAt}, #000 0%, rgba(0,0,0,.55) 22%, transparent 48%)`;
  const soulMask = `radial-gradient(ellipse 7% 17% at ${fig}, #000 30%, transparent 75%)`;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" data-testid="hero-motion">
      {/* sun rays, streaming from the sun */}
      <div className="absolute inset-[-40%] ppfx-rays mix-blend-screen" style={{
        transformOrigin: rayAt,
        background: `repeating-conic-gradient(from 200deg at ${rayAt}, rgba(255,226,160,0) 0deg, rgba(255,226,160,0.2) 3deg, rgba(255,226,160,0) 7deg, rgba(255,210,130,0) 11deg)`,
        WebkitMaskImage: rayMask, maskImage: rayMask,
      }} />
      {/* sun flare */}
      <div className="absolute inset-0 ppfx-flare mix-blend-screen" style={{ background: `radial-gradient(circle at ${sun}, rgba(255,250,225,0.95) 0%, rgba(255,214,140,0.55) 6%, rgba(255,170,80,0.18) 18%, transparent 38%)` }} />
      {/* the soul: a glowing copy of the figure rising out of the body */}
      {[0, 1].map((k) => (
        <div key={k} className="absolute inset-0 ppfx-soul mix-blend-screen" style={{
          animationDelay: `${k * 2.6}s`,
          backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center',
          WebkitMaskImage: soulMask, maskImage: soulMask,
        }} />
      ))}
      {/* glow around the figure, breathing */}
      <div className="absolute inset-0 ppfx-aura mix-blend-screen" style={{ background: `radial-gradient(ellipse 12% 22% at ${fig}, rgba(255,220,150,0.45), transparent 70%)` }} />
      <canvas ref={canvas} className="absolute inset-0 w-full h-full mix-blend-screen" />
    </div>
  );
};
