import React, { useEffect, useRef, useState } from 'react';

/**
 * QuantumFx — (1) cinematic boot sequence with the animated intelligence core (once per session, click to skip,
 * skipped for reduced-motion) and (2) light-reactive panel edges: the panel under the pointer lights up in champagne
 * gold + electric cyan. Pure CSS class toggling; no layout changes, no transforms.
 */
const GOLD = '212,175,55', CYAN = '34,211,238', VIOLET = '167,139,250';
const SESSION_KEY = 'ppfx_boot_seen_v1';
const LINES = ['Initialising intelligence core', 'Linking macro, positioning and sentiment feeds', 'Calibrating global market model', 'Core online'];

function Boot({ onDone }: { onDone: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const c = cv.current!; const ctx = c.getContext('2d')!; const dpr = Math.min(2, window.devicePixelRatio || 1);
    const S = 240; c.width = S * dpr; c.height = S * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let raf = 0; const t0 = performance.now();
    const f = (now: number) => {
      raf = requestAnimationFrame(f); const t = (now - t0) / 1000; ctx.clearRect(0, 0, S, S); const cx = S / 2, cy = S / 2;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 110); g.addColorStop(0, `rgba(${GOLD},0.55)`); g.addColorStop(0.45, `rgba(${CYAN},0.14)`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      for (let r = 0; r < 3; r++) {
        ctx.strokeStyle = `rgba(${r === 1 ? CYAN : r === 2 ? VIOLET : GOLD},${0.55 - r * 0.12})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(cx, cy, 44 + r * 24, (44 + r * 24) * (0.32 + 0.1 * r), t * (0.6 + r * 0.35) * (r % 2 ? -1 : 1), 0, 7); ctx.stroke();
        for (let i = 0; i < 6; i++) { const a = t * (1.2 + r * 0.5) * (r % 2 ? -1 : 1) + i * 1.0472; const rr = 44 + r * 24, ry = rr * (0.32 + 0.1 * r), rot = t * (0.6 + r * 0.35) * (r % 2 ? -1 : 1); const x = Math.cos(a) * rr, y = Math.sin(a) * ry; ctx.fillStyle = `rgba(${GOLD},0.9)`; ctx.fillRect(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot), 2, 2); }
      }
      const pulse = 7 + Math.sin(t * 3) * 2; ctx.fillStyle = `rgba(${GOLD},0.95)`; ctx.beginPath(); ctx.arc(cx, cy, pulse, 0, 7); ctx.fill();
    };
    raf = requestAnimationFrame(f);
    const timers = [500, 1000, 1500].map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    const end = window.setTimeout(onDone, 2100);
    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); clearTimeout(end); };
  }, [onDone]);
  return (
    <div data-testid="boot-sequence" onClick={onDone} className="fixed inset-0 z-[500] flex cursor-pointer flex-col items-center justify-center bg-[#01030a]" style={{ animation: 'ppfxBootOut .5s ease 1.7s forwards' }}>
      <canvas ref={cv} style={{ width: 240, height: 240 }} />
      <div className="mt-2 text-2xl sm:text-4xl font-extralight uppercase tracking-[0.35em] text-slate-100">PrimePipFx</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.5em] text-[#d4af37]">Financial Intelligence Facility</div>
      <div className="mt-6 h-4 text-[10px] uppercase tracking-[0.3em] text-cyan-300/80">{LINES[step]}</div>
      <div className="mt-3 h-px w-48 overflow-hidden bg-slate-800"><div className="h-full bg-gradient-to-r from-[#d4af37] to-cyan-300" style={{ width: `${(step + 1) * 25}%`, transition: 'width .45s ease' }} /></div>
      <style>{`@keyframes ppfxBootOut{to{opacity:0;visibility:hidden}}`}</style>
    </div>
  );
}

export const QuantumFx: React.FC = () => {
  const [boot, setBoot] = useState(() => { try { return !sessionStorage.getItem(SESSION_KEY) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } });
  const done = React.useCallback(() => { try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ } setBoot(false); }, []);
  useEffect(() => {
    let cur: HTMLElement | null = null; let raf = 0;
    const move = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const t = e.target as HTMLElement | null;
        const p = t?.closest?.('[class*="rounded-xl"],[class*="rounded-2xl"],[class*="rounded-3xl"]') as HTMLElement | null;
        let next: HTMLElement | null = p;
        if (next) { const r = next.getBoundingClientRect(); if (r.width > window.innerWidth * 0.94 && r.height > 520) next = null; else if (next.closest('[data-testid=command-palette],[data-testid=boot-sequence]')) next = null; }
        if (next === cur) return;
        cur?.classList.remove('ppfx-lit'); next?.classList.add('ppfx-lit'); cur = next;
      });
    };
    const leave = () => { cur?.classList.remove('ppfx-lit'); cur = null; };
    window.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave);
    return () => { window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); cur?.classList.remove('ppfx-lit'); };
  }, []);
  return (
    <>
      <style>{`.ppfx-lit{box-shadow:0 0 0 1px rgba(${GOLD},.5),0 0 26px -8px rgba(${CYAN},.5),inset 0 0 22px -14px rgba(${GOLD},.45)!important;transition:box-shadow .22s ease}
.ppfx-lit{border-color:rgba(${GOLD},.55)!important}`}</style>
      {boot && <Boot onDone={done} />}
    </>
  );
};
export default QuantumFx;
