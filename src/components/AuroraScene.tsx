import { useEffect } from 'react';
import { getFx, onFx, probe, isAwake } from '../utils/perfGovernor';

/**
 * AURORA 3D SCENE — a slow perspective world behind the whole app (only while the Aurora theme is active):
 * a receding neon grid floor, depth-sorted floating particles with constellation lines, and gentle pointer parallax.
 * Cheap by design: 2D canvas, ≤ 30 fps, devicePixelRatio ≤ 1.5, paused when the tab is hidden, switched off for
 * "reduce motion". Also powers the optional card tilt (class "aurora-tilt").
 */
const isAurora = () => document.documentElement.dataset.theme === 'aurora' && getFx() !== 'off';

function startScene(): () => void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.id = 'ppfx-aurora-canvas'; canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => canvas.remove();
  let comet: { x: number; y: number; vx: number; vy: number; life: number } | null = null; let w = 0, h = 0, dpr = 1, raf = 0, last = 0, px = 0, py = 0, tx = 0, ty = 0, settled = false;
  const small = window.innerWidth < 700;
  const N = small ? 34 : 70;
  const pts = Array.from({ length: N }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 1.2, z: Math.random(), s: 0.4 + Math.random() * 1.1 }));
  const resize = () => { dpr = 1; w = window.innerWidth; h = window.innerHeight; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const onMove = (e: PointerEvent) => { tx = (e.clientX / w - 0.5) * 2; ty = (e.clientY / h - 0.5) * 2; };

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    probe(t);
    if (document.hidden || t - last < (isAwake(t) ? 33 : 80)) return;   // always alive: smooth while you move, gentle ~12 fps when idle
    settled = false;
    const dt = Math.min(0.1, (t - last) / 1000); last = t;
    px += (tx - px) * 0.05; py += (ty - py) * 0.05;
    ctx.clearRect(0, 0, w, h);
    const horizon = h * (0.56 + py * 0.02);
    const cx = w / 2 + px * 40;
    // grid floor: lines converge on a vanishing point; rows glide toward the viewer
    const phase = (t / 1000 * 0.09) % 1;
    ctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const f = (i + phase) / 14, y = horizon + (h - horizon) * f * f;
      ctx.strokeStyle = `rgba(99,102,241,${0.08 + f * 0.24})`;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let i = -12; i <= 12; i++) {
      const bx = cx + i * (w / 11);
      ctx.strokeStyle = `rgba(34,211,238,${0.08 + (1 - Math.abs(i) / 13) * 0.14})`;
      ctx.beginPath(); ctx.moveTo(cx + (bx - cx) * 0.04, horizon); ctx.lineTo(bx, h); ctx.stroke();
    }
    const glow = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 60);
    glow.addColorStop(0, 'rgba(99,102,241,0)'); glow.addColorStop(0.5, 'rgba(99,102,241,0.12)'); glow.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, horizon - 40, w, 100);
    // horizon sun-glow that breathes slowly
    const pulse = 0.5 + 0.5 * Math.sin(t / 3200);
    const sun = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, w * 0.45);
    sun.addColorStop(0, `rgba(129,140,248,${0.16 + pulse * 0.08})`); sun.addColorStop(0.4, 'rgba(56,189,248,0.05)'); sun.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
    // two slow 3D rings (perspective ellipses) tilting with the pointer
    for (let r = 0; r < 2; r++) {
      const rot = t / (r ? -9000 : 7000), rx = (r ? 0.30 : 0.19) * w, ry = rx * (0.16 + 0.06 * Math.sin(rot * 0.7) + py * 0.03);
      ctx.save(); ctx.translate(cx + px * (24 + r * 14), h * (r ? 0.34 : 0.27)); ctx.rotate(Math.sin(rot) * 0.12 + px * 0.05);
      ctx.strokeStyle = r ? 'rgba(34,211,238,0.10)' : 'rgba(167,139,250,0.13)'; ctx.lineWidth = r ? 1 : 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, 6.283); ctx.stroke();
      const a = rot * 2, dx = Math.cos(a) * rx, dy = Math.sin(a) * ry; ctx.fillStyle = 'rgba(224,231,255,0.8)'; ctx.beginPath(); ctx.arc(dx, dy, 2, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    // occasional shooting star
    if (!comet && Math.random() < 0.004) comet = { x: Math.random() * w * 0.8, y: Math.random() * h * 0.3, vx: 520 + Math.random() * 300, vy: 160 + Math.random() * 120, life: 1 };
    if (comet) {
      comet.x += comet.vx * dt; comet.y += comet.vy * dt; comet.life -= dt * 1.4;
      const g = ctx.createLinearGradient(comet.x, comet.y, comet.x - comet.vx * 0.12, comet.y - comet.vy * 0.12);
      g.addColorStop(0, `rgba(224,242,254,${Math.max(0, comet.life)})`); g.addColorStop(1, 'rgba(224,242,254,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(comet.x, comet.y); ctx.lineTo(comet.x - comet.vx * 0.12, comet.y - comet.vy * 0.12); ctx.stroke();
      if (comet.life <= 0) comet = null;
    }
    // particles in 3D
    const proj: Array<{ x: number; y: number; r: number; a: number }> = [];
    for (const p of pts) {
      p.z -= dt * 0.018 * p.s; if (p.z <= 0.02) { p.z = 1; p.x = (Math.random() - 0.5) * 2; p.y = (Math.random() - 0.5) * 1.2; }
      const k = 1 / (0.25 + p.z * 1.4);
      const sx = w / 2 + (p.x + px * 0.18 * (1 - p.z)) * w * 0.45 * k, sy = h * 0.42 + (p.y + py * 0.12 * (1 - p.z)) * h * 0.45 * k;
      proj.push({ x: sx, y: sy, r: Math.max(0.6, 2.4 * k * p.s * 0.6), a: Math.min(0.8, (1 - p.z) * 0.9 + 0.12) });
    }
    for (let i = 0; i < proj.length; i++) for (let j = i + 1; j < proj.length; j++) {
      const dx = proj[i].x - proj[j].x, dy = proj[i].y - proj[j].y, d = dx * dx + dy * dy;
      if (d < 9000) { ctx.strokeStyle = `rgba(167,139,250,${(1 - d / 9000) * 0.16 * Math.min(proj[i].a, proj[j].a)})`; ctx.beginPath(); ctx.moveTo(proj[i].x, proj[i].y); ctx.lineTo(proj[j].x, proj[j].y); ctx.stroke(); }
    }
    for (const p of proj) { ctx.fillStyle = `rgba(165,243,252,${p.a * 0.7})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
  };
  // cursor light: a soft spotlight that follows the pointer (or finger) over the whole app
  const spot = document.createElement('div'); spot.id = 'ppfx-spot'; spot.setAttribute('aria-hidden', 'true'); document.body.appendChild(spot);
  let sx = -400, sy = -400, sraf = 0;
  const onSpot = (e: PointerEvent) => { sx = e.clientX; sy = e.clientY; if (!sraf) sraf = requestAnimationFrame(() => { sraf = 0; spot.style.transform = `translate3d(${sx - 260}px, ${sy - 260}px, 0)`; spot.classList.add('on'); }); };
  const offSpot = () => { spot.classList.remove('on'); };
  window.addEventListener('pointermove', onSpot, { passive: true }); document.addEventListener('pointerleave', offSpot);
  resize();
  window.addEventListener('resize', resize); window.addEventListener('pointermove', onMove, { passive: true });
  if (reduce || getFx() === 'lite') { last = -1000; frame(0); cancelAnimationFrame(raf); } else raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onSpot); document.removeEventListener('pointerleave', offSpot); spot.remove(); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove); canvas.remove(); };
}

const TILT_SEL = '.aurora-tilt, .prime-card, .prime-card-elevated, [class*="rounded-2xl"][class*="bg-slate-9"], [class*="rounded-3xl"][class*="bg-slate-9"]';
/** Pointer-driven tilt for elements with class "aurora-tilt" (≤ 4°, hover devices only). */
function installTilt(): () => void {
  if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => undefined;
  let cur: HTMLElement | null = null;
  const move = (e: PointerEvent) => {
    let el = (e.target as HTMLElement | null)?.closest?.(TILT_SEL) as HTMLElement | null;
    if (el && !el.classList.contains('aurora-tilt')) { const b = el.getBoundingClientRect(); if (b.width > 760 || b.height > 520 || b.width < 140) el = null; else el.classList.add('aurora-tilt'); }
    if (cur && cur !== el) { cur.classList.remove('is-tilting'); cur.style.transform = ''; cur.style.setProperty('--tg', '0'); }
    cur = el; if (!el) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.classList.add('is-tilting');
    el.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 7).toFixed(2)}deg) rotateY(${((x - 0.5) * 9).toFixed(2)}deg) translateZ(14px) scale(1.012)`;
    el.style.setProperty('--tx', `${(x * 100).toFixed(0)}%`); el.style.setProperty('--ty', `${(y * 100).toFixed(0)}%`); el.style.setProperty('--tg', '1');
  };
  const leave = () => { if (cur) { cur.classList.remove('is-tilting'); cur.style.transform = ''; cur.style.setProperty('--tg', '0'); cur = null; } };
  document.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave, true);
  return () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave, true); };
}

export const AuroraScene = (): null => {
  useEffect(() => {
    let stopScene: (() => void) | null = null; let stopTilt: (() => void) | null = null;
    const sync = () => {
      if (isAurora() && !stopScene) { stopScene = startScene(); stopTilt = installTilt(); }
      else if (!isAurora() && stopScene) { stopScene(); stopScene = null; stopTilt?.(); stopTilt = null; }
    };
    sync();
    const offFx = onFx(() => { stopScene?.(); stopScene = null; stopTilt?.(); stopTilt = null; sync(); });
    const mo = new MutationObserver(sync); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { offFx(); mo.disconnect(); stopScene?.(); stopTilt?.(); };
  }, []);
  return null;
};
