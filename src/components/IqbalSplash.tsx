import { useEffect, useRef } from "react";

/**
 * Opening screen: Allama Iqbal's "Sitaron se aage jahan aur bhi hain" over a living galaxy.
 * Pure canvas + CSS, no assets, so it paints instantly and never blocks loading.
 */
const WORDS = ["ستاروں", "سے", "آگے", "جہاں", "اور", "بھی", "ہیں"]; // read right to left

type Star = { x: number; y: number; z: number; r: number; tw: number; hue: number };
type Dot = { a: number; d: number; arm: number; s: number; hue: number; l: number; o: number };

export default function IqbalSplash({ onSkip, ready }: { onSkip?: () => void; ready?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext("2d"); if (!ctx) return;
    const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, M = 0, dpr = 1, raf = 0, last = 0; const t0 = performance.now();
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    type S = { x: number; y: number; z: number; r: number; h: number };
    type R = { x: number; y: number; z: number; sz: number; rot: number; vr: number; pts: number[] };
    type C = { x: number; y: number; vx: number; vy: number; len: number; h: number; life: number };
    const stars: S[] = [], rocks: R[] = [], comets: C[] = []; const dots: { a: number; d: number; s: number; hue: number; l: number; o: number }[] = [];
    let nextComet = 300, px = 0, py = 0, tx = 0, ty = 0;

    const seedStar = (z = rnd(0.02, 1)): S => ({ x: rnd(-1, 1) * 1.25 * (W / M), y: rnd(-1, 1) * 1.25 * (H / M), z, r: rnd(0.5, 1.5), h: Math.random() < 0.2 ? rnd(190, 215) : Math.random() < 0.12 ? rnd(25, 45) : Math.random() < 0.08 ? rnd(300, 330) : 220 });
    const seedRock = (z = 1): R => { const n = 8 + Math.floor(Math.random() * 3), pts: number[] = []; for (let i = 0; i < n; i++) pts.push(rnd(0.62, 1.15)); return { x: rnd(-1, 1) * 1.1 * (W / M), y: rnd(-1, 1) * 1.1 * (H / M), z, sz: rnd(0.012, 0.05), rot: rnd(0, 6.28), vr: rnd(-0.004, 0.004), pts }; };
    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75); W = cv.clientWidth; H = cv.clientHeight; M = Math.min(W, H); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      stars.length = 0; rocks.length = 0; dots.length = 0;
      const n = Math.round(Math.min(1000, (W * H) / 1500)); for (let i = 0; i < n; i++) stars.push(seedStar());
      for (let i = 0; i < (W < 700 ? 9 : 16); i++) rocks.push(seedRock(rnd(0.1, 1)));
      const arms = 3, count = W < 640 ? 2200 : 3600;
      for (let i = 0; i < count; i++) { const d = Math.pow(Math.random(), 0.62); const arm = i % arms; dots.push({ a: arm * (6.283 / arms) + d * 7.2 + rnd(-1, 1) * (0.34 - d * 0.2), d, s: rnd(0.5, 1.6), hue: 205 + d * 120 + rnd(-14, 14), l: 62 + (1 - d) * 24, o: rnd(0.35, 0.95) * (1 - d * 0.5) }); }
    };

    const nebula = (x: number, y: number, r: number, h: number, a: number) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `hsla(${h},80%,55%,${a})`); g.addColorStop(0.5, `hsla(${h + 20},70%,35%,${a * 0.4})`); g.addColorStop(1, "hsla(230,60%,10%,0)"); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); };

    const galaxy = (gx: number, gy: number, R: number, rot: number, alpha: number) => {
      const tilt = 0.4; ctx.globalAlpha = alpha;
      const core = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 0.45); core.addColorStop(0, "rgba(255,244,214,0.95)"); core.addColorStop(0.12, "rgba(255,206,130,0.55)"); core.addColorStop(0.4, "rgba(150,120,255,0.18)"); core.addColorStop(1, "rgba(60,40,160,0)");
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(-0.5); ctx.scale(1, tilt + 0.25); ctx.translate(-gx, -gy); ctx.fillStyle = core; ctx.fillRect(gx - R, gy - R, R * 2, R * 2); ctx.restore();
      const c = Math.cos(-0.5), s = Math.sin(-0.5);
      for (const d of dots) { const a = d.a + rot * (1.4 - d.d), rr = d.d * R, x0 = Math.cos(a) * rr, y0 = Math.sin(a) * rr * tilt; ctx.fillStyle = `hsla(${d.hue},85%,${d.l}%,${d.o})`; ctx.fillRect(gx + x0 * c - y0 * s, gy + x0 * s + y0 * c, d.s, d.s); }
      ctx.globalAlpha = 1;
    };

    // the newly found world, rising over the lower edge with a sun igniting behind its rim
    const world = (cx: number, cy: number, R: number, t: number, flare: number) => {
      const halo = ctx.createRadialGradient(cx, cy, R * 0.96, cx, cy, R * 1.28); halo.addColorStop(0, "hsla(178,95%,62%,0.55)"); halo.addColorStop(0.35, "hsla(200,90%,55%,0.22)"); halo.addColorStop(1, "hsla(240,80%,40%,0)"); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = "source-over";
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.clip();
      const base = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.05, cx, cy, R * 1.05); base.addColorStop(0, "hsl(172,75%,62%)"); base.addColorStop(0.35, "hsl(205,70%,38%)"); base.addColorStop(0.75, "hsl(250,62%,20%)"); base.addColorStop(1, "hsl(268,70%,7%)"); ctx.fillStyle = base; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      for (let i = 0; i < 12; i++) { const yb = cy - R + ((i + 0.5) / 12) * R * 2, ph = t * 0.00035 * (i % 2 ? 1 : -1) + i; ctx.strokeStyle = i % 3 ? `hsla(${170 + i * 6},70%,75%,0.11)` : "rgba(255,255,255,0.09)"; ctx.lineWidth = R * (0.035 + (i % 4) * 0.012); ctx.beginPath(); for (let x = -R; x <= R; x += R / 14) { const y = yb + Math.sin(x / R * 3 + ph) * R * 0.035; x === -R ? ctx.moveTo(cx + x, y) : ctx.lineTo(cx + x, y); } ctx.stroke(); }
      const aur = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.6, cy + R * 0.3); aur.addColorStop(0, "rgba(120,255,214,0.0)"); aur.addColorStop(0.5, `rgba(120,255,214,${0.10 + 0.05 * Math.sin(t * 0.002)})`); aur.addColorStop(1, "rgba(160,120,255,0)"); ctx.fillStyle = aur; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      const term = ctx.createLinearGradient(cx - R * 0.75, cy - R * 0.75, cx + R * 0.85, cy + R * 0.85); term.addColorStop(0, "rgba(2,3,12,0)"); term.addColorStop(0.5, "rgba(2,3,12,0.28)"); term.addColorStop(1, "rgba(2,3,12,0.92)"); ctx.fillStyle = term; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.shadowColor = "rgba(120,235,255,0.9)"; ctx.shadowBlur = 26; const rim = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.2, cy); rim.addColorStop(0, "rgba(255,255,255,0.95)"); rim.addColorStop(1, "rgba(120,235,255,0)"); ctx.strokeStyle = rim; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, R, -2.9, -0.7); ctx.stroke(); ctx.restore();
      if (flare > 0.01) {
        const th = -2.2, fx = cx + Math.cos(th) * R, fy = cy + Math.sin(th) * R; ctx.save(); ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, R * 0.55); g.addColorStop(0, `rgba(255,252,235,${0.95 * flare})`); g.addColorStop(0.08, `rgba(255,225,160,${0.6 * flare})`); g.addColorStop(0.35, `rgba(255,170,90,${0.16 * flare})`); g.addColorStop(1, "rgba(255,140,60,0)"); ctx.fillStyle = g; ctx.fillRect(fx - R, fy - R, R * 2, R * 2);
        const st = ctx.createLinearGradient(fx - W * 0.5, 0, fx + W * 0.5, 0); st.addColorStop(0, "rgba(120,200,255,0)"); st.addColorStop(0.5, `rgba(200,235,255,${0.85 * flare})`); st.addColorStop(1, "rgba(120,200,255,0)"); ctx.fillStyle = st; ctx.fillRect(fx - W * 0.5, fy - 1.2, W, 2.4);
        const st2 = ctx.createLinearGradient(fx - W * 0.4, 0, fx + W * 0.4, 0); st2.addColorStop(0, "rgba(140,120,255,0)"); st2.addColorStop(0.5, `rgba(170,150,255,${0.35 * flare})`); st2.addColorStop(1, "rgba(140,120,255,0)"); ctx.fillStyle = st2; ctx.fillRect(fx - W * 0.4, fy - 7, W * 0.8, 14);
        for (let i = 1; i <= 3; i++) { const gx = fx + (W / 2 - fx) * i * 0.32, gy = fy + (H / 2 - fy) * i * 0.32; ctx.fillStyle = `hsla(${190 + i * 40},90%,70%,${0.12 * flare})`; ctx.beginPath(); ctx.arc(gx, gy, M * 0.03 * i, 0, 6.283); ctx.fill(); }
        ctx.restore();
      }
    };

    // a lone explorer, drifting, reaching toward what nobody has seen
    const astronaut = (x: number, y: number, u: number, t: number) => {
      ctx.save(); ctx.translate(x, y + Math.sin(t * 0.0013) * u * 0.35); ctx.rotate(-0.12 + Math.sin(t * 0.0009) * 0.05);
      const suit = ctx.createLinearGradient(-u * 1.6, 0, u * 1.8, 0); suit.addColorStop(0, "#5d6a8c"); suit.addColorStop(0.55, "#c9d4ea"); suit.addColorStop(1, "#f4fbff");
      const limb = (x1: number, y1: number, x2: number, y2: number, w: number) => { ctx.lineCap = "round"; ctx.strokeStyle = "#7f8db0"; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = suit; ctx.lineWidth = w * 0.78; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
      // tether
      ctx.strokeStyle = "rgba(200,215,240,0.45)"; ctx.lineWidth = Math.max(1, u * 0.07); ctx.beginPath(); ctx.moveTo(-u * 1.2, -u * 0.2); ctx.bezierCurveTo(-u * 4, u * 1.5 + Math.sin(t * 0.0015) * u, -u * 7, -u * 1 + Math.cos(t * 0.0012) * u, -u * 14, u * 2); ctx.stroke();
      limb(0.2 * u, 1.3 * u, -0.7 * u, 2.5 * u, u * 0.85); limb(-0.7 * u, 2.5 * u, -2 * u, 3 * u, u * 0.8); limb(0.6 * u, 1.3 * u, 1.5 * u, 2.5 * u, u * 0.85); limb(1.5 * u, 2.5 * u, 1.1 * u, 3.8 * u, u * 0.8);
      ctx.fillStyle = "#59658a"; ctx.beginPath(); ctx.roundRect(-u * 1.7, -u * 1.6, u * 1.1, u * 2.7, u * 0.3); ctx.fill();
      ctx.fillStyle = suit; ctx.beginPath(); ctx.roundRect(-u * 0.9, -u * 1.4, u * 2.1, u * 2.9, u * 0.7); ctx.fill();
      ctx.fillStyle = "rgba(255,120,90,0.9)"; ctx.fillRect(-u * 0.2, -u * 0.3, u * 0.7, u * 0.3);
      limb(-0.3 * u, -0.9 * u, -1.4 * u, 0.1 * u, u * 0.75); limb(0.9 * u, -1 * u, 2 * u, -2 * u, u * 0.75); limb(2 * u, -2 * u, 3 * u, -2.8 * u, u * 0.7);
      ctx.fillStyle = "#e9f0ff"; ctx.beginPath(); ctx.arc(3.15 * u, -2.9 * u, u * 0.42, 0, 6.283); ctx.fill();
      ctx.fillStyle = suit; ctx.beginPath(); ctx.arc(0.25 * u, -2.2 * u, u * 1.05, 0, 6.283); ctx.fill();
      const v = ctx.createLinearGradient(0.3 * u, -3 * u, 1.3 * u, -1.5 * u); v.addColorStop(0, "#9ff6ff"); v.addColorStop(0.5, "#3d7bd8"); v.addColorStop(1, "#d98cff"); ctx.fillStyle = v; ctx.beginPath(); ctx.ellipse(0.62 * u, -2.2 * u, u * 0.62, u * 0.78, 0.1, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.beginPath(); ctx.ellipse(0.8 * u, -2.6 * u, u * 0.16, u * 0.3, 0.4, 0, 6.283); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(160,235,255,0.75)"; ctx.shadowColor = "rgba(120,235,255,1)"; ctx.shadowBlur = 12; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0.25 * u, -2.2 * u, u * 1.05, -1.1, 0.7); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-u * 0.9, -u * 1.4, u * 2.1, u * 2.9, u * 0.7); ctx.stroke(); ctx.restore();
      if (Math.floor(t / 600) % 2) { ctx.fillStyle = "#ff5a5a"; ctx.shadowColor = "#ff5a5a"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(-u * 1.3, -u * 1.3, u * 0.12, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; }
      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(48, now - (last || now)); last = now; const t = still ? 9000 : now - t0;
      const w = still ? 0 : 1 - sm(1300, 3900, t); const rise = sm(2300, 6800, t), reveal = sm(3000, 5600, t);
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const shake = w > 0.35 ? (w - 0.35) * 3 : 0; ctx.translate((Math.random() - 0.5) * shake + px * -8, (Math.random() - 0.5) * shake + py * -8);
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#02030a"); bg.addColorStop(0.55, "#070a1c"); bg.addColorStop(1, "#0b0620"); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
      const drift = Math.sin(t * 0.00012) * 14; ctx.globalCompositeOperation = "lighter";
      nebula(W * 0.2 + drift, H * 0.28, Math.max(W, H) * 0.5, 262, 0.2); nebula(W * 0.85 - drift, H * 0.7, Math.max(W, H) * 0.55, 322, 0.14); nebula(W * 0.55, H * 0.12, Math.max(W, H) * 0.4, 196, 0.12);
      // the galaxy nobody has seen: fades in at the far edge as the rush slows
      if (reveal > 0.01) galaxy(W * (W < 700 ? 0.62 : 0.8), H * (W < 700 ? 0.17 : 0.27), M * (W < 700 ? 0.62 : 0.5), t * 0.00005, reveal * 0.95);
      ctx.globalCompositeOperation = "source-over";

      // hyperspace: stars become streaks while the rush lasts
      const f = M * 0.5, cx = W / 2 + px * 10, cy = H * 0.5 + py * 10, sp = (0.00018 + w * 0.0026) * dt; ctx.lineCap = "round";
      for (const s of stars) {
        const z0 = s.z; s.z -= sp * (0.4 + z0); if (s.z < 0.02) Object.assign(s, seedStar(1));
        const x1 = cx + (s.x / s.z) * f * 0.5, y1 = cy + (s.y / s.z) * f * 0.5; if (x1 < -80 || x1 > W + 80 || y1 < -80 || y1 > H + 80) { Object.assign(s, seedStar(1)); continue; }
        const zt = s.z + sp * (0.4 + s.z) * (2 + w * 14), x0 = cx + (s.x / zt) * f * 0.5, y0 = cy + (s.y / zt) * f * 0.5, a = Math.min(1, (1.1 - s.z) * 1.4);
        ctx.strokeStyle = `hsla(${s.h},${s.h === 220 ? 25 : 85}%,${s.h === 220 ? 90 : 76}%,${a})`; ctx.lineWidth = s.r * (0.6 + (1 - s.z)); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      // chaos: tumbling rock, comets
      const rs = (0.00006 + w * 0.0016) * dt;
      for (const r of rocks) {
        r.z -= rs * (0.3 + r.z); r.rot += r.vr * dt * (1 + w * 3); if (r.z < 0.04) { Object.assign(r, seedRock(1)); continue; }
        const x = cx + (r.x / r.z) * f * 0.5, y = cy + (r.y / r.z) * f * 0.5, sz = Math.min(M * 0.1, (r.sz / r.z) * M * 0.5); if (x < -sz * 2 || x > W + sz * 2 || y < -sz * 2 || y > H + sz * 2) { Object.assign(r, seedRock(1)); continue; }
        ctx.save(); ctx.translate(x, y); ctx.rotate(r.rot); ctx.globalAlpha = Math.min(1, (1.05 - r.z) * 2) * (sz > M * 0.07 ? 0.55 : 1); ctx.beginPath(); r.pts.forEach((k, i) => { const an = (i / r.pts.length) * 6.283; i ? ctx.lineTo(Math.cos(an) * sz * k, Math.sin(an) * sz * k) : ctx.moveTo(Math.cos(an) * sz * k, Math.sin(an) * sz * k); }); ctx.closePath();
        const g = ctx.createLinearGradient(-sz, -sz, sz, sz); g.addColorStop(0, "#4a4670"); g.addColorStop(1, "#0d0b1c"); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = "rgba(170,210,255,0.55)"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
      }
      if (!still && t > nextComet) { nextComet = t + (w > 0.2 ? rnd(160, 380) : rnd(2400, 4200)); const l2r = Math.random() < 0.5; comets.push({ x: l2r ? -40 : W + 40, y: rnd(0, H * 0.7), vx: (l2r ? 1 : -1) * rnd(9, 16), vy: rnd(1.5, 5), len: rnd(90, 220), h: [190, 45, 320, 210][Math.floor(Math.random() * 4)], life: 1 }); }
      ctx.globalCompositeOperation = "lighter";
      for (let i = comets.length - 1; i >= 0; i--) { const c = comets[i]; c.x += c.vx * dt / 16; c.y += c.vy * dt / 16; if (c.x < -300 || c.x > W + 300 || c.y > H + 100) { comets.splice(i, 1); continue; } const tl = Math.hypot(c.vx, c.vy), ex = c.x - (c.vx / tl) * c.len, ey = c.y - (c.vy / tl) * c.len; const g = ctx.createLinearGradient(c.x, c.y, ex, ey); g.addColorStop(0, `hsla(${c.h},90%,88%,0.95)`); g.addColorStop(0.3, `hsla(${c.h},90%,62%,0.4)`); g.addColorStop(1, `hsla(${c.h},90%,60%,0)`); ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.fillStyle = `hsla(${c.h},100%,92%,0.9)`; ctx.beginPath(); ctx.arc(c.x, c.y, 2.6, 0, 6.283); ctx.fill(); }
      ctx.globalCompositeOperation = "source-over";

      // the new world comes over the horizon
      const portrait = W < 700, R = portrait ? W * 0.95 : M * 0.54, wx = W * (portrait ? 0.7 : 0.74), wy = H * (portrait ? 1.2 : 1.14) + (1 - rise) * R * 1.15;
      world(wx, wy, R, t, sm(3400, 5400, t) * (1 - 0.55 * sm(6200, 8500, t)) * (0.9 + 0.1 * Math.sin(t * 0.004)));
      // discovery pulses
      if (t > 4800) { ctx.globalCompositeOperation = "lighter"; for (let i = 0; i < 3; i++) { const ph = ((t - 4800 - i * 900) % 2700) / 2700; if (t - 4800 - i * 900 < 0) continue; ctx.strokeStyle = `rgba(140,235,255,${0.5 * (1 - ph)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(wx - R * 0.45, wy - R * 0.9, ph * M * 0.7, 0, 6.283); ctx.stroke(); } ctx.globalCompositeOperation = "source-over"; }
      astronaut(W * (portrait ? 0.2 : 0.17), H * (portrait ? 0.8 : 0.64), M * (portrait ? 0.034 : 0.034), t);
      const vg = ctx.createRadialGradient(W / 2, H / 2, M * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78); vg.addColorStop(0, "rgba(2,3,10,0)"); vg.addColorStop(1, "rgba(2,3,10,0.7)"); ctx.fillStyle = vg; ctx.fillRect(-20, -20, W + 40, H + 40);
      if (w > 0.15) { ctx.fillStyle = `rgba(190,215,255,${w * 0.05})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
      if (!still) raf = requestAnimationFrame(frame);
    };

    const move = (e: PointerEvent) => { tx = (e.clientX / (W || 1) - 0.5) * 2; ty = (e.clientY / (H || 1) - 0.5) * 2; };
    build(); raf = requestAnimationFrame(frame);
    const on = () => { build(); if (still) frame(performance.now()); };
    window.addEventListener("resize", on); window.addEventListener("pointermove", move);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", on); window.removeEventListener("pointermove", move); };
  }, []);

  return (
    <div role="status" aria-label="Beyond the stars there are still other worlds, Allama Iqbal" onClick={onSkip} className="iq-wrap">
      <style>{CSS}</style>
      <canvas ref={ref} className="iq-canvas" aria-hidden="true" />
      <div className="iq-content">
        <p className="iq-kicker">PRIMEPIPFX</p>
        <h1 dir="rtl" lang="ur" className="iq-urdu">
          {[WORDS.slice(0, 3), WORDS.slice(3)].map((line, li) => (
            <span key={li} className="iq-line">
              {line.map((w, j) => { const i = li * 3 + j; return <span key={i} className="iq-word" style={{ animationDelay: `${2.4 + i * 0.4}s` }}>{w}</span>; })}
            </span>
          ))}
        </h1>
        <div className="iq-rule" aria-hidden="true"><i /></div>
        <p className="iq-roman">Sitaron se aage jahan aur bhi hain</p>
        <p className="iq-en">Beyond the stars, there are still other worlds.</p>
        <p className="iq-by">— Allama Muhammad Iqbal</p>
      </div>
      <div className="iq-foot" aria-hidden="true"><span className={ready ? "iq-dot on" : "iq-dot"} />{ready ? "Tap to enter" : "Preparing your journey"}</div>
    </div>
  );
}

const CSS = `
.iq-wrap{position:fixed;inset:0;z-index:9999;background:#02030a;overflow:hidden;cursor:pointer;color:#f3ead2;-webkit-tap-highlight-color:transparent}
.iq-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;animation:iqIn 1.2s ease-out both}
.iq-content{padding-bottom:9vh!important;position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;pointer-events:none}
.iq-kicker{font:600 11px/1 'Chakra Petch',system-ui,sans-serif;letter-spacing:.55em;color:rgba(245,217,138,.7);margin:0 0 clamp(18px,4vh,40px);padding-left:.55em;opacity:0;animation:iqUp 1.2s .2s ease-out forwards}
.iq-urdu{margin:0;display:flex;flex-wrap:wrap;justify-content:center;gap:0 .32em;max-width:min(94vw,1000px);font-family:'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Noto Naskh Arabic',serif;font-weight:700;font-size:clamp(34px,5.1vw,78px);line-height:2.05;
 background:linear-gradient(180deg,#fff8e1 0%,#f7d98b 42%,#d89a3c 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;filter:drop-shadow(0 0 22px rgba(255,196,96,.38)) drop-shadow(0 3px 14px rgba(0,0,0,.65))}
.iq-line{display:contents}
.iq-word{display:inline-block;opacity:0;transform:translateY(18px) scale(.96);filter:blur(10px);animation:iqWord 1.1s cubic-bezier(.2,.8,.2,1) forwards}
.iq-rule{width:min(240px,50vw);height:1px;margin:clamp(8px,2vh,22px) 0 clamp(14px,3vh,26px);background:linear-gradient(90deg,transparent,rgba(245,217,138,.8),transparent);position:relative;opacity:0;animation:iqUp 1s 5.1s ease-out forwards}
.iq-rule i{position:absolute;left:50%;top:-3px;width:7px;height:7px;margin-left:-3.5px;transform:rotate(45deg);background:#f5d98a;box-shadow:0 0 14px #f5d98a}
.iq-roman{margin:0;font:500 clamp(15px,2.2vw,22px)/1.4 'Plus Jakarta Sans',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,244,214,.92);opacity:0;animation:iqUp 1.1s 5.3s ease-out forwards}
.iq-en{margin:10px 0 0;font:italic 400 clamp(14px,1.9vw,19px)/1.5 'Plus Jakarta Sans',system-ui,sans-serif;color:rgba(200,214,255,.8);opacity:0;animation:iqUp 1.1s 5.6s ease-out forwards}
.iq-by{margin:clamp(14px,3vh,26px) 0 0;font:600 12px/1 'Chakra Petch',system-ui,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:rgba(245,217,138,.75);opacity:0;animation:iqUp 1.1s 5.9s ease-out forwards}
.iq-foot{position:absolute;left:0;right:0;bottom:max(22px,env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:center;gap:10px;font:500 11px/1 'Chakra Petch',system-ui,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:rgba(200,214,255,.6)}
.iq-dot{width:6px;height:6px;border-radius:50%;background:#7aa2ff;box-shadow:0 0 10px #7aa2ff;animation:iqPulse 1.2s ease-in-out infinite}.iq-dot.on{background:#f5d98a;box-shadow:0 0 12px #f5d98a}
@keyframes iqIn{from{opacity:0;transform:scale(1.06)}to{opacity:1;transform:scale(1)}}
@keyframes iqUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes iqWord{0%{opacity:0;transform:translateY(18px) scale(.96);filter:blur(10px)}100%{opacity:1;transform:none;filter:blur(0)}}
@keyframes iqPulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
@media (max-width:700px){.iq-content{padding-bottom:20vh}.iq-roman{font-size:13px;letter-spacing:.08em}.iq-urdu{font-size:clamp(34px,10.5vw,52px);line-height:2.1}.iq-line{display:flex;justify-content:center;gap:0 .3em;width:100%}}
@media (prefers-reduced-motion:reduce){.iq-canvas,.iq-kicker,.iq-word,.iq-rule,.iq-roman,.iq-en,.iq-by{animation-duration:.01s!important;animation-delay:0s!important}}
`;
