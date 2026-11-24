/**
 * Neon space panorama: a ringed gas giant, a glowing cyan planet with a moon, a distant violet planet,
 * a space station, rockets with flickering exhaust that fly across now and then, and shooting stars.
 * Planets are rendered ONCE into offscreen sprites; each frame only blits them (cheap). ~20 fps, paused
 * while scrolling, hidden tabs, Motivation page, or when effects are not 'full'.
 */
const rnd = (s: number) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };

function planetSprite(r: number, c1: string, c2: string, glow: string, ring?: string, bands = 0): HTMLCanvasElement {
  const pad = ring ? r * 1.4 : r * 0.6, S = Math.ceil((r + pad) * 2);
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d')!; const c = S / 2;
  const halo = g.createRadialGradient(c, c, r * 0.9, c, c, r + pad * 0.9); halo.addColorStop(0, glow); halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo; g.fillRect(0, 0, S, S);
  const drawRing = (front: boolean) => {
    if (!ring) return; g.save(); g.translate(c, c); g.rotate(-0.38); g.scale(1, 0.28);
    g.beginPath(); g.arc(0, 0, r * 1.95, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); g.lineWidth = r * 0.32; g.strokeStyle = ring; g.globalAlpha = 0.75; g.stroke();
    g.beginPath(); g.arc(0, 0, r * 1.55, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); g.lineWidth = r * 0.08; g.globalAlpha = 0.5; g.stroke(); g.restore();
  };
  drawRing(false);
  const body = g.createRadialGradient(c - r * 0.4, c - r * 0.4, r * 0.1, c, c, r); body.addColorStop(0, c1); body.addColorStop(1, c2);
  g.save(); g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.clip(); g.fillStyle = body; g.fillRect(c - r, c - r, r * 2, r * 2);
  for (let i = 0; i < bands; i++) { g.globalAlpha = 0.12 + rnd(i) * 0.12; g.fillStyle = i % 2 ? '#ffffff' : '#000000'; g.fillRect(c - r, c - r + (i + rnd(i * 3)) * (2 * r / bands), r * 2, r * (0.05 + rnd(i * 5) * 0.12)); }
  g.globalAlpha = 1; const shade = g.createLinearGradient(c - r, c - r, c + r, c + r); shade.addColorStop(0.45, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,10,.82)');
  g.fillStyle = shade; g.fillRect(c - r, c - r, r * 2, r * 2); g.restore();
  g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.lineWidth = Math.max(1, r * 0.03); g.strokeStyle = glow.replace(/[\d.]+\)$/, '0.9)'); g.stroke(); // neon rim
  drawRing(true);
  return cv;
}

interface Rocket { x: number; y: number; vx: number; vy: number; life: number; hue: string }
interface Comet { x: number; y: number; vx: number; vy: number; life: number }

export function startSpaceObjects(): () => void {
  const html = document.documentElement;
  const cv = document.createElement('canvas'); cv.id = 'ppfx-space-objects'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const g = cv.getContext('2d'); if (!g) { cv.remove(); return () => undefined; }
  let W = 0, H = 0, k = 1;
  let giant: HTMLCanvasElement, cyan: HTMLCanvasElement, violet: HTMLCanvasElement, moon: HTMLCanvasElement;
  const build = () => {
    W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; k = Math.min(1.3, Math.max(0.55, Math.min(W, H * 1.6) / 1300));
    giant = planetSprite(110 * k, '#ff9be8', '#4b1269', 'rgba(255,60,200,.35)', 'rgba(120,230,255,.85)', 9);
    cyan = planetSprite(46 * k, '#9ff8ff', '#06406b', 'rgba(0,220,255,.40)', undefined, 4);
    violet = planetSprite(22 * k, '#c9a6ff', '#2a1160', 'rgba(150,90,255,.40)');
    moon = planetSprite(11 * k, '#e8ecff', '#3c4366', 'rgba(200,210,255,.25)');
  };
  build(); window.addEventListener('resize', build);
  const rockets: Rocket[] = []; const comets: Comet[] = [];
  let nextRocket = performance.now() + 2500, nextComet = performance.now() + 1500;
  let raf = 0, last = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < 50 || (window as any).__ppfxScrolling) return;
    const hide = html.dataset.fx !== 'full' || html.dataset.theme !== 'aurora' || html.classList.contains('ppfx-clear-video');
    cv.style.display = hide ? 'none' : ''; if (hide) return;
    const dt = last ? Math.min(0.2, (now - last) / 1000) : 0; last = now; const t = now / 1000;
    g.clearRect(0, 0, W, H);
    // planets drift very slowly (parallax float)
    const gx = W * 0.80 + Math.sin(t * 0.03) * 14 * k, gy = H * 0.30 + Math.cos(t * 0.025) * 10 * k;
    g.drawImage(giant, gx - giant.width / 2, gy - giant.height / 2);
    const cx = W * 0.14 + Math.sin(t * 0.04 + 1) * 10 * k, cy = H * 0.20 + Math.cos(t * 0.035) * 8 * k;
    g.drawImage(cyan, cx - cyan.width / 2, cy - cyan.height / 2);
    const ma = t * 0.18; const mx = cx + Math.cos(ma) * 82 * k, my = cy + Math.sin(ma) * 26 * k;
    if (Math.sin(ma) > 0 || true) g.drawImage(moon, mx - moon.width / 2, my - moon.height / 2);
    // soft reflections of the two big planets on the ocean below the horizon
    const hy = H * 0.60;
    for (const [img, x, y] of [[giant, gx, gy], [cyan, cx, cy]] as const) {
      g.save(); g.globalAlpha = 0.09; g.translate(x + Math.sin(t * 1.7) * 2, 2 * hy - y + Math.sin(t * 1.2) * 3); g.scale(1.03, -0.62); g.drawImage(img, -img.width / 2, -img.height / 2); g.restore();
    }
    g.drawImage(violet, W * 0.55 - violet.width / 2, H * 0.09 - violet.height / 2);
    // space station: slowly rotating neon ring
    g.save(); g.translate(W * 0.40, H * 0.44); g.rotate(t * 0.15); g.strokeStyle = 'rgba(120,255,240,.55)'; g.lineWidth = 2 * k;
    g.beginPath(); g.ellipse(0, 0, 26 * k, 26 * k, 0, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(5 * k, 0); g.lineTo(26 * k, 0); g.stroke(); }
    g.fillStyle = 'rgba(255,90,210,.9)'; g.fillRect(-4 * k, -4 * k, 8 * k, 8 * k); g.restore();
    // rockets
    if (now > nextRocket && rockets.length < 2) {
      const fromLeft = rnd(now) > 0.5; const y = H * (0.10 + rnd(now * 1.7) * 0.38);
      rockets.push({ x: fromLeft ? -40 : W + 40, y, vx: (fromLeft ? 1 : -1) * (90 + rnd(now * 3) * 80) * k, vy: -(10 + rnd(now * 5) * 30) * k, life: 0, hue: rnd(now * 7) > 0.5 ? '0,240,255' : '255,80,210' });
      nextRocket = now + 9000 + rnd(now * 11) * 12000;
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.x += r.vx * dt; r.y += r.vy * dt; r.life += dt;
      if (r.x < -80 || r.x > W + 80) { rockets.splice(i, 1); continue; }
      const ang = Math.atan2(r.vy, r.vx);
      g.save(); g.translate(r.x, r.y); g.rotate(ang);
      const flick = 0.75 + 0.25 * Math.sin(t * 40 + i);
      const trail = g.createLinearGradient(-90 * k, 0, 0, 0); trail.addColorStop(0, `rgba(${r.hue},0)`); trail.addColorStop(1, `rgba(${r.hue},.75)`);
      g.fillStyle = trail; g.beginPath(); g.moveTo(-90 * k * flick, 0); g.lineTo(-10 * k, -3 * k); g.lineTo(-10 * k, 3 * k); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,240,200,.95)'; g.beginPath(); g.moveTo(-10 * k, -2.2 * k); g.lineTo(-17 * k * flick, 0); g.lineTo(-10 * k, 2.2 * k); g.fill();
      g.fillStyle = '#dfe7ff'; g.beginPath(); g.moveTo(14 * k, 0); g.quadraticCurveTo(6 * k, -4.5 * k, -10 * k, -3.5 * k); g.lineTo(-10 * k, 3.5 * k); g.quadraticCurveTo(6 * k, 4.5 * k, 14 * k, 0); g.fill();
      g.fillStyle = `rgba(${r.hue},1)`; g.beginPath(); g.moveTo(-6 * k, -3.5 * k); g.lineTo(-12 * k, -8 * k); g.lineTo(-10 * k, -3.5 * k); g.fill(); g.beginPath(); g.moveTo(-6 * k, 3.5 * k); g.lineTo(-12 * k, 8 * k); g.lineTo(-10 * k, 3.5 * k); g.fill();
      g.fillStyle = `rgba(${r.hue},1)`; g.beginPath(); g.arc(4 * k, 0, 1.6 * k, 0, 6.3); g.fill();
      g.restore();
    }
    // shooting stars
    if (now > nextComet) { comets.push({ x: W * rnd(now), y: H * rnd(now * 2) * 0.35, vx: (300 + rnd(now * 3) * 300) * k, vy: (120 + rnd(now * 4) * 120) * k, life: 0 }); nextComet = now + 3000 + rnd(now * 9) * 6000; }
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i]; c.x += c.vx * dt; c.y += c.vy * dt; c.life += dt;
      if (c.life > 1.4) { comets.splice(i, 1); continue; }
      const a = Math.sin((c.life / 1.4) * Math.PI);
      const tg = g.createLinearGradient(c.x - c.vx * 0.18, c.y - c.vy * 0.18, c.x, c.y); tg.addColorStop(0, 'rgba(180,240,255,0)'); tg.addColorStop(1, `rgba(220,250,255,${0.9 * a})`);
      g.strokeStyle = tg; g.lineWidth = 1.6 * k; g.beginPath(); g.moveTo(c.x - c.vx * 0.18, c.y - c.vy * 0.18); g.lineTo(c.x, c.y); g.stroke();
    }
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', build); cv.remove(); };
}
