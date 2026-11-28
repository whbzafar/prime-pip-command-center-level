import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { createScore, BEAT, END_AT, type Score } from "../lib/iqbalScore";

/**
 * Opening film (about 11 s): Allama Iqbal's "Sitaron se aage jahan aur bhi hain".
 *   0 - 2 s   calm: an explorer drifting in the dark, stars barely moving
 *   2 - 6.8 s the rush builds: stars stretch, rocks and comets tear past, the soundtrack races
 *   6.9 s     burst of light: a new world and a new galaxy appear, the verse is revealed
 *   10.25 s   one clean final chord, a flash, and straight into the app
 * Pure canvas + CSS + Web Audio, so there are no files to download.
 */
const WORDS = ["ستاروں", "سے", "آگے", "جہاں", "اور", "بھی", "ہیں"]; // read right to left
const BURST = 6900, ENDED = Math.round(END_AT * 1000) + 420, BEATMS = BEAT * 1000;

export default function IqbalSplash({ onDone, ready }: { onDone?: () => void; ready?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t0 = useRef(performance.now());
  const score = useRef<Score | null>(null);
  const [sound, setSound] = useState<"trying" | "playing" | "blocked" | "off">("trying");
  const [muted, setMuted] = useState(false);
  const [key, setKey] = useState(0);
  const [ended, setEnded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  const restart = useCallback(() => { t0.current = performance.now(); setEnded(false); setKey((k) => k + 1); }, []);
  const leave = useCallback(() => { if (done.current) return; done.current = true; score.current?.stop(0.3); setLeaving(true); setTimeout(() => onDone?.(), 340); }, [onDone]);

  // soundtrack: starts by itself where the browser allows it, otherwise on the first touch
  useEffect(() => {
    const s = (score.current = createScore());
    if (!s.canPlay()) { setSound("off"); return; }
    let alive = true;
    void s.start().then((ok) => { if (!alive) return; if (ok) { setSound("playing"); restart(); } else setSound("blocked"); });
    return () => { alive = false; s.stop(0.2); };
  }, [restart]);

  // the film ends itself: finale, then wait for the app to be ready, then hand over
  useEffect(() => { const e = setTimeout(() => setEnded(true), ENDED); return () => clearTimeout(e); }, [key]);
  useEffect(() => { if (ended && ready) leave(); }, [ended, ready, leave]);

  const poke = useCallback(() => {
    const s = score.current;
    if (sound === "blocked" && s) { void s.start().then((ok) => { if (ok) { setSound("playing"); restart(); } }); return; }
    if (performance.now() - t0.current > 900) leave();
  }, [sound, restart, leave]);
  // the first touch, click or key press anywhere starts the music (the only moment a browser allows it)
  useEffect(() => {
    if (sound !== "blocked") return;
    const go = () => { void score.current?.start().then((ok) => { if (ok) { setSound("playing"); restart(); } }); };
    // iOS Safari only unlocks audio on a finished tap (touchend / pointerup / click), so listen to those and keep trying until one works
    const ev = ["pointerup", "touchend", "click", "keydown"] as const;
    ev.forEach((n) => window.addEventListener(n, go, { passive: true }));
    return () => ev.forEach((n) => window.removeEventListener(n, go));
  }, [sound, restart]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (["Enter", " ", "Escape"].includes(e.key)) poke(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [poke]);

  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext("2d"); if (!ctx) return;
    const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, M = 0, dpr = 1, raf = 0, last = 0, px = 0, py = 0, tx = 0, ty = 0, nextComet = 3000, nextNova = 4300;
    type Sh = { x: number; y: number; vx: number; vy: number; a: number; va: number; s: number; h: number; life: number; max: number; spark: boolean };
    const shards: Sh[] = [];
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const sm = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    type S = { x: number; y: number; z: number; r: number; h: number };
    type R = { x: number; y: number; z: number; sz: number; rot: number; vr: number; pts: number[]; cr: number[] };
    type C = { x: number; y: number; vx: number; vy: number; len: number; h: number };
    type P = { x: number; y: number; vx: number; vy: number; r: number; ph: number };
    const stars: S[] = [], rocks: R[] = [], comets: C[] = [], motes: P[] = []; const dots: { a: number; d: number; s: number; hue: number; l: number; o: number }[] = [];

    const seedStar = (z = rnd(0.02, 1)): S => ({ x: rnd(-1, 1) * 1.25 * (W / M), y: rnd(-1, 1) * 1.25 * (H / M), z, r: rnd(0.5, 1.4), h: Math.random() < 0.2 ? rnd(190, 215) : Math.random() < 0.12 ? rnd(25, 45) : Math.random() < 0.07 ? rnd(300, 330) : 220 });
    const seedRock = (z = 1): R => { const n = 9 + Math.floor(Math.random() * 4); return { x: rnd(-1, 1) * 1.1 * (W / M), y: rnd(-1, 1) * 1.1 * (H / M), z, sz: rnd(0.012, 0.04), rot: rnd(0, 6.28), vr: rnd(-0.0025, 0.0025), pts: Array.from({ length: n }, () => rnd(0.7, 1.12)), cr: [rnd(-0.4, 0.4), rnd(-0.4, 0.4), rnd(0.12, 0.26), rnd(-0.4, 0.4), rnd(-0.4, 0.4), rnd(0.08, 0.18)] }; };
    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75); W = cv.clientWidth; H = cv.clientHeight; M = Math.min(W, H); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      stars.length = rocks.length = motes.length = dots.length = 0;
      for (let i = 0, n = Math.round(Math.min(1000, (W * H) / 1500)); i < n; i++) stars.push(seedStar());
      for (let i = 0; i < (W < 700 ? 7 : 12); i++) rocks.push(seedRock(rnd(0.1, 1)));
      for (let i = 0; i < 46; i++) motes.push({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-6, 10), vy: rnd(-8, 4), r: rnd(0.6, 2), ph: rnd(0, 6.28) });
      for (let i = 0, n = W < 640 ? 2200 : 3600; i < n; i++) { const d = Math.pow(Math.random(), 0.62); dots.push({ a: (i % 3) * 2.094 + d * 7.2 + rnd(-1, 1) * (0.34 - d * 0.2), d, s: rnd(0.5, 1.6), hue: 205 + d * 120 + rnd(-14, 14), l: 62 + (1 - d) * 24, o: rnd(0.35, 0.95) * (1 - d * 0.5) }); }
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
      const aur = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.6, cy + R * 0.3); aur.addColorStop(0, "rgba(120,255,214,0)"); aur.addColorStop(0.5, `rgba(120,255,214,${0.1 + 0.05 * Math.sin(t * 0.002)})`); aur.addColorStop(1, "rgba(160,120,255,0)"); ctx.fillStyle = aur; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
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

    // a rock with a lit side, a shadow side and a few craters, so it reads as an object and not a cut-out
    const rock = (r: R, x: number, y: number, sz: number, alpha: number) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r.rot); ctx.globalAlpha = alpha; ctx.beginPath();
      r.pts.forEach((k, i) => { const an = (i / r.pts.length) * 6.283, ax = Math.cos(an) * sz * k, ay = Math.sin(an) * sz * k; i ? ctx.lineTo(ax, ay) : ctx.moveTo(ax, ay); }); ctx.closePath();
      const g = ctx.createRadialGradient(-sz * 0.5, -sz * 0.55, sz * 0.1, 0, 0, sz * 1.15); g.addColorStop(0, "#8a86b4"); g.addColorStop(0.45, "#3a3760"); g.addColorStop(1, "#07061a"); ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = "rgba(5,4,20,0.45)"; for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(r.cr[i * 3] * sz, r.cr[i * 3 + 1] * sz, r.cr[i * 3 + 2] * sz, 0, 6.283); ctx.fill(); } ctx.restore();
      ctx.strokeStyle = "rgba(150,200,255,0.28)"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    };

    // a lone explorer: a dark suit lit only by the glow of the world ahead, so it sits inside the scene
    const astronaut = (x: number, y: number, u: number, t: number, shake: number) => {
      ctx.save(); ctx.translate(x + (Math.random() - 0.5) * shake, y + Math.sin(t * 0.0013) * u * 0.35 + (Math.random() - 0.5) * shake); ctx.rotate(-0.12 + Math.sin(t * 0.0009) * 0.05);
      const suit = ctx.createLinearGradient(-u * 1.6, -u, u * 2.2, u); suit.addColorStop(0, "#161b33"); suit.addColorStop(0.5, "#46537c"); suit.addColorStop(0.85, "#a8c2ee"); suit.addColorStop(1, "#e8f6ff");
      const limb = (x1: number, y1: number, x2: number, y2: number, w: number) => { ctx.lineCap = "round"; ctx.strokeStyle = "#0e1226"; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = suit; ctx.lineWidth = w * 0.8; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
      ctx.strokeStyle = "rgba(190,210,240,0.35)"; ctx.lineWidth = Math.max(1, u * 0.06); ctx.beginPath(); ctx.moveTo(-u * 1.2, -u * 0.2); ctx.bezierCurveTo(-u * 4, u * 1.5 + Math.sin(t * 0.0015) * u, -u * 7, -u + Math.cos(t * 0.0012) * u, -u * 14, u * 2); ctx.stroke();
      limb(0.2 * u, 1.3 * u, -0.7 * u, 2.5 * u, u * 0.85); limb(-0.7 * u, 2.5 * u, -2 * u, 3 * u, u * 0.8); limb(0.6 * u, 1.3 * u, 1.5 * u, 2.5 * u, u * 0.85); limb(1.5 * u, 2.5 * u, 1.1 * u, 3.8 * u, u * 0.8);
      ctx.fillStyle = "#12172e"; ctx.beginPath(); ctx.roundRect(-u * 1.7, -u * 1.6, u * 1.1, u * 2.7, u * 0.3); ctx.fill();
      ctx.fillStyle = suit; ctx.beginPath(); ctx.roundRect(-u * 0.9, -u * 1.4, u * 2.1, u * 2.9, u * 0.7); ctx.fill();
      ctx.fillStyle = "rgba(255,130,90,0.85)"; ctx.fillRect(-u * 0.2, -u * 0.3, u * 0.7, u * 0.25);
      limb(-0.3 * u, -0.9 * u, -1.4 * u, 0.1 * u, u * 0.75); limb(0.9 * u, -1 * u, 2 * u, -2 * u, u * 0.75); limb(2 * u, -2 * u, 3 * u, -2.8 * u, u * 0.7);
      ctx.fillStyle = "#cfe3ff"; ctx.beginPath(); ctx.arc(3.15 * u, -2.9 * u, u * 0.42, 0, 6.283); ctx.fill();
      ctx.fillStyle = suit; ctx.beginPath(); ctx.arc(0.25 * u, -2.2 * u, u * 1.05, 0, 6.283); ctx.fill();
      const v = ctx.createLinearGradient(0.1 * u, -3 * u, 1.3 * u, -1.5 * u); v.addColorStop(0, "#0b1a33"); v.addColorStop(0.45, "#2c6fc9"); v.addColorStop(1, "#9ff6ff"); ctx.fillStyle = v; ctx.beginPath(); ctx.ellipse(0.62 * u, -2.2 * u, u * 0.62, u * 0.78, 0.1, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(0.82 * u, -2.6 * u, u * 0.14, u * 0.28, 0.4, 0, 6.283); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "rgba(160,235,255,0.8)"; ctx.shadowColor = "rgba(120,235,255,1)"; ctx.shadowBlur = 12; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0.25 * u, -2.2 * u, u * 1.05, -1.1, 0.7); ctx.stroke(); ctx.beginPath(); ctx.roundRect(-u * 0.9, -u * 1.4, u * 2.1, u * 2.9, u * 0.7); ctx.stroke(); ctx.restore();
      if (Math.floor(t / 600) % 2) { ctx.fillStyle = "#ff5a5a"; ctx.shadowColor = "#ff5a5a"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(-u * 1.3, -u * 1.3, u * 0.12, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0; }
      ctx.restore();
    };

    const frame = (now: number) => {
      const dt = Math.min(48, now - (last || now)); last = now; const el = Math.max(0, now - t0.current), t = still ? 9000 : el;
      const w = still ? 0 : Math.pow(sm(1800, 6700, t), 1.7) * (1 - sm(6850, 7500, t));
      const rise = sm(BURST, 10300, t), reveal = sm(BURST, 9000, t);
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bp = t > BURST && t < ENDED - 380 ? (t - BURST) / BEATMS : -1, kick = bp >= 0 ? Math.exp(-(bp % 1) * 5.5) : 0, preKick = t > 2600 && t < BURST ? Math.exp(-(((t - 2600) / (480 - 260 * sm(2600, BURST, t))) % 1) * 5) * (0.25 + w) : 0;
      const shake = (w > 0.3 ? (w - 0.3) * 2.6 : 0) + kick * 3.2 + preKick * 1.6; ctx.translate((Math.random() - 0.5) * shake - px * 8, (Math.random() - 0.5) * shake - py * 8);
      const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#02030a"); bg.addColorStop(0.55, "#070a1c"); bg.addColorStop(1, "#0b0620"); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40);
      const dx = Math.sin(t * 0.00012) * 18, dy = Math.cos(t * 0.00009) * 12; ctx.globalCompositeOperation = "lighter";
      nebula(W * 0.2 + dx, H * 0.28 + dy, Math.max(W, H) * 0.5, 262, 0.2); nebula(W * 0.85 - dx, H * 0.7 - dy, Math.max(W, H) * 0.55, 322, 0.14); nebula(W * 0.55 + dy, H * 0.12, Math.max(W, H) * 0.4, 196, 0.12);
      // far-off galaxies, slowly turning, to say the universe goes on
      for (let i = 0; i < 4; i++) { const gx = W * [0.12, 0.38, 0.9, 0.62][i] + Math.sin(t * 0.00006 + i) * 10, gy = H * [0.15, 0.08, 0.5, 0.36][i], gr = M * [0.05, 0.035, 0.04, 0.03][i]; ctx.save(); ctx.translate(gx, gy); ctx.rotate(t * 0.00004 + i); ctx.scale(1, 0.38); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr); g.addColorStop(0, "rgba(255,235,200,0.5)"); g.addColorStop(0.4, "rgba(150,140,255,0.18)"); g.addColorStop(1, "rgba(80,60,200,0)"); ctx.fillStyle = g; ctx.fillRect(-gr, -gr, gr * 2, gr * 2); ctx.restore(); }
      if (reveal > 0.01) galaxy(W * (W < 700 ? 0.62 : 0.8), H * (W < 700 ? 0.17 : 0.27), M * (W < 700 ? 0.62 : 0.5), t * 0.00005, reveal * 0.95);

      // drifting dust: always moving, never still
      for (const m of motes) { m.x += (m.vx * dt) / 1000 * (1 + w * 14); m.y += (m.vy * dt) / 1000 * (1 + w * 14); if (m.x < -5) m.x = W + 5; if (m.x > W + 5) m.x = -5; if (m.y < -5) m.y = H + 5; if (m.y > H + 5) m.y = -5; ctx.fillStyle = `rgba(190,215,255,${0.1 + 0.12 * Math.abs(Math.sin(t * 0.001 + m.ph))})`; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 6.283); ctx.fill(); }

      // stars: calm points that stretch into light as the rush builds
      const f = M * 0.5, cx = W / 2 + px * 10, cy = H * 0.5 + py * 10, sp = (0.00012 + w * 0.0034) * dt; ctx.lineCap = "round";
      for (const s of stars) {
        s.z -= sp * (0.4 + s.z); if (s.z < 0.02) { Object.assign(s, seedStar(1)); continue; }
        const x1 = cx + (s.x / s.z) * f * 0.5, y1 = cy + (s.y / s.z) * f * 0.5; if (x1 < -80 || x1 > W + 80 || y1 < -80 || y1 > H + 80) { Object.assign(s, seedStar(1)); continue; }
        const zt = s.z + sp * (0.4 + s.z) * (1.5 + w * 16), x0 = cx + (s.x / zt) * f * 0.5, y0 = cy + (s.y / zt) * f * 0.5, a = Math.min(1, (1.1 - s.z) * 1.4) * (0.55 + 0.45 * Math.abs(Math.sin(t * 0.0012 + s.x * 9)));
        ctx.strokeStyle = `hsla(${s.h},${s.h === 220 ? 25 : 85}%,${s.h === 220 ? 90 : 76}%,${a * (1 - w * 0.25)})`; ctx.lineWidth = s.r * (0.5 + (1 - s.z) * (0.7 + w)); ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      // a glowing core where the rush converges
      if (w > 0.02) { ctx.globalCompositeOperation = "lighter"; const b = ctx.createRadialGradient(cx, cy, 0, cx, cy, M * (0.25 + w * 0.5)); b.addColorStop(0, `rgba(180,215,255,${0.6 * w})`); b.addColorStop(0.2, `rgba(110,140,255,${0.22 * w})`); b.addColorStop(1, "rgba(60,60,200,0)"); ctx.fillStyle = b; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over"; }

      // rocks tumble past once the rush builds, then drift quietly behind the new world
      const rs = (0.00005 + w * 0.0018) * dt, ra = sm(2600, 5200, t) * (1 - sm(6850, 7500, t) * 0.55);
      if (ra > 0.02) for (const r of rocks) {
        r.z -= rs * (0.3 + r.z); r.rot += r.vr * dt * (1 + w * 3); if (r.z < 0.05) { Object.assign(r, seedRock(1)); continue; }
        const x = cx + (r.x / r.z) * f * 0.5, y = cy + (r.y / r.z) * f * 0.5, sz = Math.min(M * 0.06, (r.sz / r.z) * M * 0.5); if (x < -sz * 2 || x > W + sz * 2 || y < -sz * 2 || y > H + sz * 2) { Object.assign(r, seedRock(1)); continue; }
        rock(r, x, y, sz, Math.min(1, (1.05 - r.z) * 2) * ra * 0.9);
      }
      if (!still && t > nextComet) { nextComet = t + (w > 0.25 ? rnd(180, 420) : rnd(2600, 4200)); const l2r = Math.random() < 0.5; comets.push({ x: l2r ? -40 : W + 40, y: rnd(0, H * 0.7), vx: (l2r ? 1 : -1) * rnd(9, 16), vy: rnd(1.5, 5), len: rnd(90, 220), h: [190, 45, 320, 210][Math.floor(Math.random() * 4)] }); }
      ctx.globalCompositeOperation = "lighter";
      for (let i = comets.length - 1; i >= 0; i--) { const c = comets[i]; c.x += (c.vx * dt) / 16; c.y += (c.vy * dt) / 16; if (c.x < -300 || c.x > W + 300 || c.y > H + 100) { comets.splice(i, 1); continue; } const tl = Math.hypot(c.vx, c.vy), ex = c.x - (c.vx / tl) * c.len, ey = c.y - (c.vy / tl) * c.len; const g = ctx.createLinearGradient(c.x, c.y, ex, ey); g.addColorStop(0, `hsla(${c.h},90%,88%,0.95)`); g.addColorStop(0.3, `hsla(${c.h},90%,62%,0.4)`); g.addColorStop(1, `hsla(${c.h},90%,60%,0)`); ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ex, ey); ctx.stroke(); ctx.fillStyle = `hsla(${c.h},100%,92%,0.9)`; ctx.beginPath(); ctx.arc(c.x, c.y, 2.6, 0, 6.283); ctx.fill(); }
      ctx.globalCompositeOperation = "source-over";

      // the climb turns violent: novas burst, rocks shatter into shards, and a black hole opens where the stars converge
      if (!still && t > nextNova && t < ENDED - 1100 && !(t >= BURST - 150 && t < BURST + 250)) {
        nextNova = t + rnd(520, 900) * (1 - w * 0.55) * (t > BURST ? 0.8 : 1); const nx = rnd(W * 0.12, W * 0.88), ny = rnd(H * 0.12, H * 0.78), nh = [200, 30, 320, 55][Math.floor(Math.random() * 4)];
        shards.push({ x: nx, y: ny, vx: 0, vy: 0, a: 0, va: 0, s: M * rnd(0.05, 0.1), h: nh, life: 0.7, max: 0.7, spark: false });
        for (let i = 0; i < 26; i++) { const an = rnd(0, 6.283), v = rnd(80, 420) * (0.8 + w); shards.push({ x: nx, y: ny, vx: Math.cos(an) * v, vy: Math.sin(an) * v, a: rnd(0, 6.283), va: rnd(-9, 9), s: i < 16 ? rnd(2, 5) : rnd(5, 11), h: nh + rnd(-14, 14), life: rnd(0.6, 1.3), max: 1.3, spark: i < 16 }); }
      }
      ctx.globalCompositeOperation = "lighter";
      for (let i = shards.length - 1; i >= 0; i--) {
        const q = shards[i]; q.life -= dt / 1000; if (q.life <= 0) { shards.splice(i, 1); continue; }
        const k = q.life / q.max; q.x += (q.vx * dt) / 1000; q.y += (q.vy * dt) / 1000; q.vx *= 0.985; q.vy *= 0.985; q.a += (q.va * dt) / 1000;
        if (q.vx === 0 && q.vy === 0) { const rg = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.s * (2 - k)); rg.addColorStop(0, `hsla(${q.h},100%,92%,${0.9 * k})`); rg.addColorStop(0.4, `hsla(${q.h},100%,62%,${0.4 * k})`); rg.addColorStop(1, `hsla(${q.h},100%,50%,0)`); ctx.fillStyle = rg; ctx.fillRect(q.x - q.s * 2, q.y - q.s * 2, q.s * 4, q.s * 4); continue; }
        if (q.spark) { ctx.strokeStyle = `hsla(${q.h},100%,78%,${k})`; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04); ctx.stroke(); }
        else { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.fillStyle = `hsla(${q.h},70%,70%,${0.85 * k})`; ctx.beginPath(); ctx.moveTo(q.s, 0); ctx.lineTo(-q.s * 0.6, q.s * 0.7); ctx.lineTo(-q.s * 0.3, -q.s * 0.8); ctx.closePath(); ctx.fill(); ctx.restore(); }
      }
      ctx.globalCompositeOperation = "source-over";
      const bh = sm(4600, 6500, t) * (1 - sm(6800, 7050, t));
      if (bh > 0.01) {
        const br = M * 0.075 * bh, spin = t * 0.004; ctx.save(); ctx.translate(cx, cy); ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(spin * (1 + i * 0.25) + i); ctx.scale(1, 0.28); ctx.strokeStyle = `hsla(${28 + i * 10},100%,${62 + i * 6}%,${(0.7 - i * 0.1) * bh})`; ctx.lineWidth = br * (0.22 - i * 0.03); ctx.beginPath(); ctx.arc(0, 0, br * (1.5 + i * 0.5), 0, 6.283); ctx.stroke(); ctx.restore(); }
        const lens = ctx.createRadialGradient(0, 0, br * 0.9, 0, 0, br * 2.6); lens.addColorStop(0, `rgba(255,220,160,${0.6 * bh})`); lens.addColorStop(1, "rgba(255,120,60,0)"); ctx.fillStyle = lens; ctx.beginPath(); ctx.arc(0, 0, br * 2.6, 0, 6.283); ctx.fill();
        ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#000"; ctx.shadowColor = "rgba(255,200,120,.9)"; ctx.shadowBlur = br * 0.8; ctx.beginPath(); ctx.arc(0, 0, br, 0, 6.283); ctx.fill(); ctx.restore();
      }

      // the new world comes over the horizon
      const portrait = W < 700, R = portrait ? W * 0.95 : M * 0.54, wx = W * (portrait ? 0.7 : 0.74), wy = H * (portrait ? 1.2 : 1.14) + (1 - rise) * R * 1.3;
      if (rise > 0.001) world(wx, wy, R, t, sm(BURST, BURST + 1400, t) * (1 - 0.5 * sm(9600, 10200, t)) * (0.92 + 0.08 * Math.sin(t * 0.004) + kick * 0.3));
      if (t > BURST) { // shockwave from the burst, then slow discovery pulses
        ctx.globalCompositeOperation = "lighter"; const sw = sm(BURST, BURST + 1500, t); if (sw < 1) { ctx.strokeStyle = `rgba(210,235,255,${0.7 * (1 - sw)})`; ctx.lineWidth = 3 + (1 - sw) * 6; ctx.beginPath(); ctx.arc(cx, cy, sw * Math.max(W, H) * 0.8, 0, 6.283); ctx.stroke(); }
        if (t > 8300) for (let i = 0; i < 3; i++) { const q = t - 8300 - i * 900; if (q < 0) continue; const ph = (q % 2700) / 2700; ctx.strokeStyle = `rgba(140,235,255,${0.45 * (1 - ph)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(wx - R * 0.45, wy - R * 0.9, ph * M * 0.7, 0, 6.283); ctx.stroke(); }
        ctx.globalCompositeOperation = "source-over";
      }
      astronaut(W * (portrait ? 0.2 : 0.17), H * (portrait ? 0.8 : 0.64), M * 0.034, t, w * 2.4);
      const vg = ctx.createRadialGradient(W / 2, H / 2, M * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78); vg.addColorStop(0, "rgba(2,3,10,0)"); vg.addColorStop(1, `rgba(2,3,10,${0.7 - w * 0.2})`); ctx.fillStyle = vg; ctx.fillRect(-20, -20, W + 40, H + 40);
      if (kick > 0.02 && !still) { ctx.fillStyle = `rgba(160,215,255,${0.1 * kick})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
      // the burst of light, then it settles
      const fl = t < BURST - 120 ? 0 : t < BURST + 180 ? sm(BURST - 120, BURST + 60, t) : 1 - sm(BURST + 180, BURST + 1300, t);
      const endHit = t > END_AT * 1000 - 40 ? 1 - sm(END_AT * 1000 - 40, END_AT * 1000 + 380, t) : 0;
      if ((fl > 0.01 || endHit > 0.01) && !still) { ctx.fillStyle = `rgba(225,238,255,${0.85 * Math.max(fl, endHit)})`; ctx.fillRect(-20, -20, W + 40, H + 40); }
      if (!still) raf = requestAnimationFrame(frame);
    };

    const move = (e: PointerEvent) => { tx = (e.clientX / (W || 1) - 0.5) * 2; ty = (e.clientY / (H || 1) - 0.5) * 2; };
    build(); raf = requestAnimationFrame(frame);
    const on = () => { build(); if (still) frame(performance.now()); };
    window.addEventListener("resize", on); window.addEventListener("pointermove", move);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", on); window.removeEventListener("pointermove", move); };
  }, []);

  const toggleMute = (e: MouseEvent) => { e.stopPropagation(); setMuted((m) => { score.current?.setMuted(!m); return !m; }); };
  const hint = sound === "blocked" ? "Tap for sound" : "Tap to skip";

  return (
    <div role="status" aria-label="Beyond the stars, there are still other worlds. Allama Iqbal" onClick={poke} className={`iq-wrap${leaving ? " iq-leave" : ""}`}>
      <style>{CSS}</style>
      <canvas ref={ref} className="iq-canvas" aria-hidden="true" />
      <div key={key} className="iq-content">
        <p className="iq-kicker">PRIMEPIPFX</p>
        <h1 dir="rtl" lang="ur" className="iq-urdu">
          {[WORDS.slice(0, 3), WORDS.slice(3)].map((line, li) => (
            <span key={li} className="iq-line">
              {line.map((w, j) => { const i = li * 3 + j; return <span key={i} className="iq-word" style={{ animationDelay: `${7.3 + i * 0.17}s` }}>{w}</span>; })}
            </span>
          ))}
        </h1>
        <div className="iq-rule" aria-hidden="true"><i /></div>
        <p className="iq-roman">Sitaron se aage jahan aur bhi hain</p>
        <p className="iq-en">Beyond the stars, there are still other worlds.</p>
        <p className="iq-by">— Allama Muhammad Iqbal</p>
      </div>
      {sound === "playing" && (
        <button type="button" className="iq-mute" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Turn sound off"}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4z" />{muted ? <path d="m22 9-6 6m0-6 6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}</svg>
        </button>
      )}
      <div className={`iq-foot${sound === "blocked" ? " iq-cta" : ""}`} aria-hidden="true"><span className="iq-dot" />{hint}</div>
      <div className="iq-flash" aria-hidden="true" key={`f${key}`} />
    </div>
  );
}

const CSS = `
.iq-wrap{position:fixed;inset:0;z-index:9999;background:#02030a;overflow:hidden;cursor:pointer;color:#f3ead2;-webkit-tap-highlight-color:transparent;transition:opacity .34s ease}
.iq-leave{opacity:0;pointer-events:none}
.iq-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;animation:iqIn 1.2s ease-out both}
.iq-content{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 24px 9vh;text-align:center;pointer-events:none}
.iq-kicker{font:600 11px/1 'Chakra Petch',system-ui,sans-serif;letter-spacing:.55em;color:rgba(245,217,138,.7);margin:0 0 clamp(18px,4vh,40px);padding-left:.55em;opacity:0;animation:iqUp 1.2s .4s ease-out forwards}
.iq-urdu{margin:0;display:flex;flex-wrap:wrap;justify-content:center;gap:0 .32em;max-width:min(94vw,1000px);font-family:'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Noto Naskh Arabic',serif;font-weight:700;font-size:clamp(34px,5.1vw,78px);line-height:2.05;
 filter:drop-shadow(0 0 24px rgba(255,196,96,.42)) drop-shadow(0 3px 16px rgba(0,0,0,.75))}
.iq-line{display:contents}
.iq-word{display:inline-block;background:linear-gradient(180deg,#fff8e1 0%,#f7d98b 42%,#d89a3c 100%);-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;opacity:0;transform:translateY(18px) scale(.96);animation:iqWord 1s cubic-bezier(.2,.8,.2,1) forwards}
.iq-rule{width:min(240px,50vw);height:1px;margin:clamp(8px,2vh,22px) 0 clamp(14px,3vh,26px);background:linear-gradient(90deg,transparent,rgba(245,217,138,.8),transparent);position:relative;opacity:0;animation:iqUp 1s 9s ease-out forwards}
.iq-rule i{position:absolute;left:50%;top:-3px;width:7px;height:7px;margin-left:-3.5px;transform:rotate(45deg);background:#f5d98a;box-shadow:0 0 14px #f5d98a}
.iq-roman{margin:0;font:500 clamp(15px,2.2vw,22px)/1.4 'Plus Jakarta Sans',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,244,214,.92);opacity:0;animation:iqUp 1s 9.15s ease-out forwards}
.iq-en{margin:10px 0 0;font:italic 400 clamp(14px,1.9vw,19px)/1.5 'Plus Jakarta Sans',system-ui,sans-serif;color:rgba(200,214,255,.85);opacity:0;animation:iqUp 1s 9.45s ease-out forwards}
.iq-by{margin:clamp(14px,3vh,26px) 0 0;font:600 12px/1 'Chakra Petch',system-ui,sans-serif;letter-spacing:.3em;text-transform:uppercase;color:rgba(245,217,138,.8);opacity:0;animation:iqUp 1s 9.75s ease-out forwards}
.iq-foot{position:absolute;left:0;right:0;bottom:max(22px,env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:center;gap:10px;font:500 11px/1 'Chakra Petch',system-ui,sans-serif;letter-spacing:.32em;text-transform:uppercase;color:rgba(200,214,255,.6)}
.iq-cta{color:#fff;letter-spacing:.24em}.iq-cta::before{content:"";width:170px;height:40px;position:absolute;border:1px solid rgba(245,217,138,.55);border-radius:99px;box-shadow:0 0 22px rgba(245,217,138,.25);animation:iqRing 2s ease-in-out infinite}
.iq-dot{width:6px;height:6px;border-radius:50%;background:#f5d98a;box-shadow:0 0 12px #f5d98a;animation:iqPulse 1.2s ease-in-out infinite}
.iq-mute{position:absolute;top:max(16px,env(safe-area-inset-top));right:16px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(200,214,255,.28);background:rgba(8,12,30,.5);color:#dbe6ff;display:flex;align-items:center;justify-content:center;cursor:pointer;backdrop-filter:blur(6px)}
.iq-mute:hover{border-color:rgba(245,217,138,.7);color:#f5d98a}
.iq-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,#fff 0,#dff0ff 40%,rgba(255,255,255,0) 100%);opacity:0;pointer-events:none;animation:iqFlash 13.3s linear both}
@keyframes iqIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:scale(1)}}
@keyframes iqUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes iqWord{0%{opacity:0;transform:translateY(18px) scale(.96);filter:blur(10px)}100%{opacity:1;transform:none;filter:blur(0)}}
@keyframes iqPulse{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
@keyframes iqRing{0%,100%{opacity:.35;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}
@keyframes iqFlash{0%,93.4%{opacity:0}93.8%{opacity:.7}97%{opacity:0}100%{opacity:0}}
@media (max-width:700px){.iq-roman{font-size:13px;letter-spacing:.08em}.iq-content{padding-bottom:20vh}.iq-urdu{font-size:clamp(34px,10.5vw,52px);line-height:2.1}.iq-line{display:flex;justify-content:center;gap:0 .3em;width:100%}}
@media (prefers-reduced-motion:reduce){.iq-canvas,.iq-kicker,.iq-word,.iq-rule,.iq-roman,.iq-en,.iq-by{animation-duration:.01s!important;animation-delay:0s!important}.iq-flash{display:none}}
`;
