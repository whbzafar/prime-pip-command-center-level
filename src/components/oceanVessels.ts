/**
 * Night-time silhouettes that travel along the ocean horizon: a container ship (stacked boxes, bridge,
 * navigation lights), a cargo tanker, a sailboat, a small fishing boat with a lantern, and a passenger
 * train crossing a long sea bridge with lit windows. Everything has a soft wobbling reflection on the water.
 * Plain 2D canvas, ~24 fps, scaled to the screen; objects re-enter from the edges at random intervals.
 */
type Kind = 'container' | 'tanker' | 'sail' | 'fishing';
interface Vessel { kind: Kind; x: number; dir: 1 | -1; speed: number; depth: number; seed: number }
const HORIZON = 0.60; // fraction from the top (matches the ocean shader's horizon at 40% from the bottom)

const BOX = ['#7a2e2e', '#2e4d7a', '#7a6a2e', '#2e7a5a', '#5a2e7a', '#7a4a2e'];
const rnd = (s: number) => { const x = Math.sin(s * 9301 + 49297) * 233280; return x - Math.floor(x); };

function hull(g: CanvasRenderingContext2D, w: number, h: number) {
  g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2 + h * 0.9, 0); g.lineTo(w / 2, h); g.lineTo(-w / 2 + h * 0.3, h); g.closePath(); g.fill();
}
function drawVessel(g: CanvasRenderingContext2D, v: Vessel, s: number, t: number) {
  const bob = Math.sin(t * 1.3 + v.seed) * 0.6 * s;
  g.save(); g.translate(0, bob); g.scale(v.dir, 1);
  g.fillStyle = '#05080f';
  if (v.kind === 'container' || v.kind === 'tanker') {
    const L = 120 * s, H = 9 * s;
    hull(g, L, H);
    if (v.kind === 'container') {
      const cw = 7 * s, ch = 4.2 * s;
      for (let c = 0; c < 13; c++) for (let r = 0; r < 3 + Math.floor(rnd(v.seed + c) * 2); r++) {
        g.fillStyle = BOX[Math.floor(rnd(v.seed * 3 + c * 7 + r) * BOX.length)];
        g.globalAlpha = 0.55; g.fillRect(-L / 2 + 8 * s + c * (cw + 0.6 * s), -ch * (r + 1), cw, ch - 0.5 * s);
      }
      g.globalAlpha = 1;
    } else {
      g.fillRect(-L / 2 + 6 * s, -3 * s, L - 22 * s, 3 * s);
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-L / 2 + 22 * s + i * 17 * s, -3 * s, 4 * s, Math.PI, 0); g.fill(); }
    }
    g.fillStyle = '#05080f';
    g.fillRect(-L / 2 - 2 * s, -16 * s, 12 * s, 16 * s);            // bridge / accommodation
    g.fillRect(-L / 2 + 1 * s, -22 * s, 4 * s, 6 * s);               // funnel
    g.fillStyle = '#ffd98a';
    for (let i = 0; i < 4; i++) g.fillRect(-L / 2 - 0.5 * s + i * 2.6 * s, -13 * s, 1.4 * s, 1.2 * s);
    // navigation lights: masthead white, port red / starboard green, stern white
    g.fillStyle = '#fff'; g.fillRect(-L / 2 + 2.5 * s, -25 * s, 1.4 * s, 1.4 * s);
    g.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * Math.sin(t * 3 + v.seed)) + ')'; g.fillRect(L / 2 + 4 * s, -6 * s, 1.4 * s, 1.4 * s);
    g.fillStyle = '#ff4d5e'; g.fillRect(-L / 2 + 10 * s, -10 * s, 1.2 * s, 1.2 * s);
  } else if (v.kind === 'sail') {
    const L = 26 * s;
    hull(g, L, 4 * s);
    g.fillRect(-1 * s, -34 * s, 1.2 * s, 34 * s);
    g.globalAlpha = 0.9; g.fillStyle = '#c9d4f2';
    g.beginPath(); g.moveTo(0, -33 * s); g.lineTo(13 * s, -2 * s); g.lineTo(0, -2 * s); g.closePath(); g.fill();
    g.fillStyle = '#9fb0de'; g.beginPath(); g.moveTo(-1.5 * s, -28 * s); g.lineTo(-11 * s, -2 * s); g.lineTo(-1.5 * s, -2 * s); g.closePath(); g.fill();
    g.globalAlpha = 1; g.fillStyle = '#fff'; g.fillRect(-1.2 * s, -36 * s, 1.4 * s, 1.4 * s);
  } else {
    const L = 22 * s;
    hull(g, L, 4 * s);
    g.fillRect(-6 * s, -7 * s, 8 * s, 7 * s);
    g.fillRect(5 * s, -14 * s, 0.9 * s, 14 * s);
    const glow = g.createRadialGradient(-2 * s, -4 * s, 0, -2 * s, -4 * s, 7 * s);
    glow.addColorStop(0, 'rgba(255,210,120,.9)'); glow.addColorStop(1, 'rgba(255,210,120,0)');
    g.fillStyle = glow; g.fillRect(-9 * s, -11 * s, 14 * s, 14 * s);
  }
  g.restore();
}

export function startVessels(): () => void {
  const html = document.documentElement;
  const cv = document.createElement('canvas'); cv.id = 'ppfx-vessels'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const g = cv.getContext('2d'); if (!g) { cv.remove(); return () => undefined; }
  let W = 0, Hh = 0;
  const size = () => { W = cv.width = window.innerWidth; Hh = cv.height = window.innerHeight; };
  size(); window.addEventListener('resize', size);
  const kinds: Kind[] = ['container', 'tanker', 'sail', 'fishing', 'container'];
  const fleet: Vessel[] = kinds.map((k, i) => ({ kind: k, x: rnd(i + 1) * 1.2 - 0.1, dir: rnd(i + 7) > 0.5 ? 1 : -1, speed: k === 'sail' ? 0.010 : k === 'fishing' ? 0.008 : 0.005, depth: [0.05, 0.02, 0.11, 0.17, 0.08][i], seed: i * 17 + 3 }));
  let train = { x: 0.25, next: 0 };
  let raf = 0, last = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden || now - last < 40) return;
    const hide = html.dataset.fx === 'off' || html.dataset.theme !== 'aurora' || html.classList.contains('ppfx-clear-video');
    cv.style.display = hide ? 'none' : ''; if (hide) return;
    const dt = last ? Math.min(0.2, (now - last) / 1000) : 0; last = now;
    const t = now / 1000; const hy = Hh * HORIZON; const base = Math.min(1.4, Math.max(0.6, W / 1400));
    g.clearRect(0, 0, W, Hh);
    // faint glow along the horizon so the far silhouettes read against the sky
    const hg = g.createLinearGradient(0, hy - 60 * base, 0, hy + 4); hg.addColorStop(0, 'rgba(70,90,170,0)'); hg.addColorStop(1, 'rgba(70,90,170,.22)');
    g.fillStyle = hg; g.fillRect(0, hy - 60 * base, W, 64 * base);
    // distant coastline + sea bridge with the train
    g.fillStyle = 'rgba(14,20,40,.98)';
    g.beginPath(); g.moveTo(0, hy); for (let x = 0; x <= W * 0.28; x += 20) g.lineTo(x, hy - 10 * base - 14 * base * Math.abs(Math.sin(x * 0.013)) - 6 * base * Math.sin(x * 0.05)); g.lineTo(W * 0.3, hy); g.closePath(); g.fill();
    const by = hy - 9 * base;
    g.fillStyle = 'rgba(16,22,44,.98)'; g.fillRect(W * 0.26, by, W * 0.46, 2 * base);
    for (let x = W * 0.27; x < W * 0.72; x += 28 * base) g.fillRect(x, by, 1.6 * base, 9 * base);
    if (now > train.next) {
      train.x += dt * 0.045;
      const tx = W * 0.26 + train.x * W * 0.46, carL = 16 * base;
      g.save(); g.beginPath(); g.rect(W * 0.26, by - 10 * base, W * 0.46, 12 * base); g.clip();
      for (let c = 0; c < 7; c++) {
        const cx = tx - c * (carL + 1.5 * base);
        g.fillStyle = '#060a14'; g.fillRect(cx - carL, by - 5 * base, carL, 5 * base);
        g.fillStyle = 'rgba(255,220,150,.85)'; for (let w = 0; w < 4; w++) g.fillRect(cx - carL + 2 * base + w * 3.6 * base, by - 3.8 * base, 2 * base, 1.4 * base);
      }
      g.fillStyle = 'rgba(255,245,210,.9)'; g.beginPath(); g.arc(tx + 0.5 * base, by - 2.5 * base, 1.4 * base, 0, 6.3); g.fill();
      g.restore();
      if (train.x > 1.9) { train.x = -0.1; train.next = now + 20000 + rnd(now) * 25000; }
    }
    // vessels (far first), with reflections
    for (const v of [...fleet].sort((a, b) => a.depth - b.depth)) {
      v.x += v.dir * v.speed * dt;
      if (v.x > 1.25 || v.x < -0.25) { v.dir = rnd(now + v.seed) > 0.5 ? 1 : -1; v.x = v.dir > 0 ? -0.2 : 1.2; v.depth = 0.02 + rnd(now * 0.3 + v.seed) * 0.16; }
      const sc = base * (0.75 + v.depth * 6), x = v.x * W, y = hy + v.depth * Hh;
      g.save(); g.translate(x, y); drawVessel(g, v, sc, t); g.restore();
      g.save(); g.translate(x, y + 1); g.scale(1, -0.55); g.globalAlpha = 0.22; g.filter = 'blur(1.5px)'; drawVessel(g, v, sc, t); g.restore();
    }
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); cv.remove(); };
}
