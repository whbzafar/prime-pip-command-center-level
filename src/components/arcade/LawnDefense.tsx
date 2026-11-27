import React, { useEffect, useRef, useState } from 'react';
import { Sfx } from './sound';

/** An original lawn-defence game (own plants, own zombies, own art). Genre-style play: collect energy, plant defenders, stop the wave. */
const W = 900, H = 580, COLS = 9, ROWS = 5, CW = 80, CH = 90, GX = 130, GY = 110;
const HI = 'ppfx_arcade_lawn_hi';
type PK = 'sun' | 'bolt' | 'frost' | 'stone' | 'berry';
const PLANTS: Record<PK, { name: string; cost: number; cd: number; hp: number; color: string; blurb: string }> = {
  sun: { name: 'Sunbloom', cost: 50, cd: 5, hp: 300, color: '#fbbf24', blurb: 'Makes energy' },
  bolt: { name: 'Bolt Sprout', cost: 100, cd: 5, hp: 300, color: '#4ade80', blurb: 'Fires bolts' },
  frost: { name: 'Frost Fern', cost: 175, cd: 6, hp: 300, color: '#67e8f9', blurb: 'Slows zombies' },
  stone: { name: 'Stone Bulb', cost: 50, cd: 14, hp: 3600, color: '#94a3b8', blurb: 'Tough wall' },
  berry: { name: 'Blast Berry', cost: 150, cd: 20, hp: 300, color: '#f43f5e', blurb: 'Big blast' },
};
const ORDER: PK[] = ['sun', 'bolt', 'frost', 'stone', 'berry'];
interface Plant { k: PK; r: number; c: number; hp: number; t: number; fuse: number; hurt: number }
interface Zom { r: number; x: number; hp: number; max: number; kind: 'walker' | 'cone' | 'runner' | 'brute'; speed: number; slow: number; eat: number; t: number; flash: number; dmg: number }
interface Bolt { r: number; x: number; frost: boolean }
interface Sun { x: number; y: number; ty: number; v: number; life: number; fall: boolean }
interface Fx { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; c: string }

export const LawnDefense: React.FC = () => {
  const cv = useRef<HTMLCanvasElement>(null);
  const sfx = useRef(new Sfx());
  const game = useRef<{ stop: () => void; key: (k: string) => void } | null>(null);
  const [phase, setPhase] = useState<'menu' | 'play' | 'over'>('menu');
  const [res, setRes] = useState({ level: 1, best: 0 });
  const [muted, setMuted] = useState(false);
  const best0 = (() => { try { return Number(localStorage.getItem(HI) || 0); } catch { return 0; } })();
  useEffect(() => () => { game.current?.stop(); sfx.current.dispose(); }, []);
  useEffect(() => { sfx.current.setMuted(muted); }, [muted]);
  const start = () => {
    sfx.current.unlock(); game.current?.stop(); setPhase('play');
    game.current = runLawn(cv.current!, sfx.current, (level) => { let best = best0; try { best = Math.max(Number(localStorage.getItem(HI) || 0), level); localStorage.setItem(HI, String(best)); } catch { /* ignore */ } setRes({ level, best }); setPhase('over'); });
  };
  return (
    <div className="relative mx-auto w-full max-w-[860px] select-none" style={{ aspectRatio: `${W}/${H}` }}>
      <canvas ref={cv} data-testid="lawn-canvas" className="h-full w-full rounded-xl border border-emerald-500/30 bg-emerald-950 touch-none" />
      <button type="button" aria-label={muted ? 'Sound on' : 'Sound off'} onClick={() => setMuted((m) => !m)} className="absolute right-2 bottom-2 z-10 rounded-md bg-slate-900/70 px-2 py-1 text-xs text-white cursor-pointer">{muted ? '🔇' : '🔊'}</button>
      {phase !== 'play' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-950/85 p-4 text-center text-white backdrop-blur-sm">
          <div className="text-2xl font-black tracking-widest text-emerald-300">GARDEN GUARD</div>
          {phase === 'over' ? (<><div className="text-sm text-slate-300">The shamblers broke through</div><div className="text-xl font-black">You held out to level {res.level}</div><div className="text-xs text-slate-400">Best level {res.best}</div></>)
            : (<div className="max-w-md text-xs leading-relaxed text-slate-300">Collect the falling energy orbs, plant defenders on the lawn and stop every wave before it reaches your house.<br />Pick a card (or press 1–5), click a tile to plant. Press X for the shovel.<br />Each level brings more and tougher zombies.{best0 ? <><br />Best level: {best0}</> : null}</div>)}
          <button type="button" onClick={start} className="rounded-lg bg-gradient-to-r from-emerald-400 to-lime-400 px-6 py-2.5 text-sm font-black text-slate-950 cursor-pointer">{phase === 'over' ? 'TRY AGAIN' : 'START'}</button>
        </div>
      )}
    </div>
  );
};

function runLawn(canvas: HTMLCanvasElement, sfx: Sfx, onEnd: (level: number) => void) {
  const dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = W * dpr; canvas.height = H * dpr; const g = canvas.getContext('2d')!; g.scale(dpr, dpr);
  const R = Math.random; const rr = (a: number, b: number) => a + R() * (b - a);
  sfx.startMusic([98, 87.3, 82.4, 98], 84);
  let plants: Plant[] = [], zoms: Zom[] = [], bolts: Bolt[] = [], suns: Sun[] = [], fx: Fx[] = [];
  let sweepers = [true, true, true, true, true], sweeping: { r: number; x: number }[] = [];
  let energy = 150, level = 1, sel: PK | null = null, shovel = false, mouse = { x: 0, y: 0 }, time = 0, skyT = 6, raf = 0, last = performance.now(), ended = false;
  let toSpawn = 0, spawned = 0, waveT = 6, waveMsg = 3, waveText = 'LEVEL 1', killed = 0, total = 0, cool: Record<PK, number> = { sun: 0, bolt: 0, frost: 0, stone: 0, berry: 0 }, shake = 0;
  const begin = () => { total = 6 + level * 4; toSpawn = total; spawned = 0; killed = 0; waveT = 7; waveMsg = 3; waveText = `LEVEL ${level}`; };
  begin();

  const puff = (x: number, y: number, n: number, c: string, sp = 90) => { for (let i = 0; i < n; i++) { const a = R() * 6.283, v = rr(sp * 0.2, sp); fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: rr(0.3, 0.8), max: 0.8, s: rr(2, 5), c }); } };
  const cell = (mx: number, my: number) => { const c = Math.floor((mx - GX) / CW), r = Math.floor((my - GY) / CH); return c >= 0 && c < COLS && r >= 0 && r < ROWS ? { r, c } : null; };
  const spawnZ = () => {
    const roll = R(); const kind: Zom['kind'] = level >= 4 && roll < 0.12 ? 'brute' : level >= 2 && roll < 0.4 ? 'cone' : level >= 3 && roll < 0.55 ? 'runner' : 'walker';
    const base = { walker: [200, 9], cone: [560, 9], runner: [220, 20], brute: [1500, 7] }[kind]; const k = 1 + (level - 1) * 0.06;
    const hp = base[0] * (1 + (level - 1) * 0.08); zoms.push({ r: Math.floor(R() * ROWS), x: W + 30, hp, max: hp, kind, speed: base[1] * k, slow: 0, eat: 0, t: R() * 6, flash: 0, dmg: kind === 'brute' ? 140 : 100 });
    spawned++; toSpawn--; if (R() < 0.3) sfx.groan();
  };
  const dmgZ = (z: Zom, d: number, frost = false) => { z.hp -= d; z.flash = 0.1; if (frost) z.slow = 3; };

  const click = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect(); const mx = ((e.clientX - r.left) / r.width) * W, my = ((e.clientY - r.top) / r.height) * H; mouse = { x: mx, y: my };
    for (const s of suns) if (!s.life || s.life > 0) if (Math.hypot(mx - s.x, my - s.y) < 30) { energy += s.v; s.life = -1; sfx.sun(); puff(s.x, s.y, 8, '#fde047'); return; }
    if (my < 92) { const i = Math.floor((mx - 14) / 78); if (i >= 0 && i < ORDER.length && mx >= 14) { const k = ORDER[i]; if (energy >= PLANTS[k].cost && cool[k] <= 0) { sel = sel === k ? null : k; shovel = false; sfx.pop(); } } if (mx > W - 110) { shovel = !shovel; sel = null; sfx.pop(); } return; }
    const ce = cell(mx, my); if (!ce) { sel = null; return; }
    const ex = plants.find((p) => p.r === ce.r && p.c === ce.c);
    if (shovel) { if (ex) { plants = plants.filter((p) => p !== ex); puff(GX + ce.c * CW + CW / 2, GY + ce.r * CH + CH / 2, 10, '#a3e635'); sfx.pop(); } shovel = false; return; }
    if (sel && !ex && energy >= PLANTS[sel].cost) { const k = sel; energy -= PLANTS[k].cost; cool[k] = PLANTS[k].cd; plants.push({ k, r: ce.r, c: ce.c, hp: PLANTS[k].hp, t: k === 'sun' ? 4 : 0.5, fuse: k === 'berry' ? 1 : 0, hurt: 0 }); sfx.plant(); puff(GX + ce.c * CW + CW / 2, GY + ce.r * CH + CH - 8, 10, '#86efac'); sel = null; }
  };
  const move = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); mouse = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  const key = (k: string) => { if (k >= '1' && k <= '5') { const p = ORDER[Number(k) - 1]; if (energy >= PLANTS[p].cost && cool[p] <= 0) { sel = sel === p ? null : p; shovel = false; } } if (k === 'x' || k === 'X') { shovel = !shovel; sel = null; } if (k === 'Escape') { sel = null; shovel = false; } };
  const kd = (e: KeyboardEvent) => key(e.key);
  canvas.addEventListener('pointerdown', click); canvas.addEventListener('pointermove', move); window.addEventListener('keydown', kd);

  const update = (dt: number) => {
    time += dt; shake = Math.max(0, shake - dt * 20); waveMsg = Math.max(0, waveMsg - dt);
    for (const k of ORDER) cool[k] = Math.max(0, cool[k] - dt);
    skyT -= dt; if (skyT <= 0) { skyT = rr(7, 10); suns.push({ x: rr(GX + 20, GX + COLS * CW - 20), y: -20, ty: rr(GY + 40, GY + ROWS * CH - 30), v: 25, life: 9, fall: true }); }
    waveT -= dt; if (toSpawn > 0 && waveT <= 0) { spawnZ(); waveT = Math.max(1.3, (7 - level * 0.35) * rr(0.6, 1.2)) * (spawned > total * 0.75 ? 0.55 : 1); if (spawned === Math.floor(total * 0.75)) { waveText = 'A HUGE WAVE IS COMING'; waveMsg = 3; sfx.groan(); } }
    for (const s of suns) { if (s.fall && s.y < s.ty) s.y += 45 * dt; else s.fall = false; if (s.life > 0) s.life -= dt; }
    suns = suns.filter((s) => s.life > 0 || (s.life === 0 && false) || (s.life > 0));
    // plants
    for (const p of plants) {
      p.t -= dt; p.hurt = Math.max(0, p.hurt - dt); const cx = GX + p.c * CW + CW / 2, cy = GY + p.r * CH + CH / 2;
      if (p.k === 'sun' && p.t <= 0) { p.t = 11; suns.push({ x: cx + rr(-14, 14), y: cy - 10, ty: cy + 22, v: 25, life: 10, fall: true }); }
      if ((p.k === 'bolt' || p.k === 'frost') && p.t <= 0 && zoms.some((z) => z.r === p.r && z.x > cx - 10 && z.x < W)) { p.t = p.k === 'bolt' ? 1.4 : 1.6; bolts.push({ r: p.r, x: cx + 26, frost: p.k === 'frost' }); sfx.pop(); }
      if (p.k === 'berry') { p.fuse -= dt; if (p.fuse <= 0) { for (const z of zoms) if (Math.abs(z.r - p.r) <= 1 && Math.abs(z.x - cx) < CW * 1.6) dmgZ(z, 1800); puff(cx, cy, 40, '#fb7185', 260); puff(cx, cy, 20, '#fde047', 200); shake = 10; sfx.boom(1.4); p.hp = 0; } }
    }
    plants = plants.filter((p) => p.hp > 0);
    // bolts
    for (const b of bolts) { b.x += 360 * dt; for (const z of zoms) if (z.r === b.r && z.hp > 0 && Math.abs(z.x - b.x) < 18) { dmgZ(z, b.frost ? 16 : 22, b.frost); puff(b.x, GY + b.r * CH + 30, 4, b.frost ? '#a5f3fc' : '#bbf7d0', 70); sfx.hit?.(); b.x = W + 99; break; } }
    bolts = bolts.filter((b) => b.x < W + 20);
    // zombies
    for (const z of zoms) {
      z.t += dt; z.flash = Math.max(0, z.flash - dt); z.slow = Math.max(0, z.slow - dt);
      const tgt = plants.find((p) => p.r === z.r && z.x - (GX + p.c * CW + CW / 2) < 34 && z.x - (GX + p.c * CW + CW / 2) > -10);
      if (tgt) { z.eat -= dt; if (z.eat <= 0) { z.eat = 0.5; tgt.hp -= z.dmg * 0.5; tgt.hurt = 0.15; sfx.bite(); } }
      else z.x -= z.speed * (z.slow > 0 ? 0.5 : 1) * dt;
      if (z.x < GX - 40 && !ended) {
        if (sweepers[z.r]) { sweepers[z.r] = false; sweeping.push({ r: z.r, x: 60 }); sfx.boom(0.8); } else if (z.x < 50) { ended = true; sfx.over(); setTimeout(() => { stop(); onEnd(level); }, 900); }
      }
    }
    for (const s of sweeping) { s.x += 520 * dt; for (const z of zoms) if (z.r === s.r && Math.abs(z.x - s.x) < 40) { z.hp = 0; } } sweeping = sweeping.filter((s) => s.x < W + 40);
    for (const z of zoms) if (z.hp <= 0) { killed++; puff(z.x, GY + z.r * CH + 40, 14, '#a3b18a', 140); sfx.splat(); if (R() < 0.15) suns.push({ x: z.x, y: GY + z.r * CH + 30, ty: GY + z.r * CH + 60, v: 25, life: 8, fall: true }); }
    zoms = zoms.filter((z) => z.hp > 0);
    if (!ended && toSpawn <= 0 && zoms.length === 0) { level++; energy += 100; sfx.levelUp(); plants = plants.filter((p) => p.k !== 'berry'); bolts = []; sweepers = sweepers.map(() => true); begin(); }
    for (const f of fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 160 * dt; f.life -= dt; } fx = fx.filter((f) => f.life > 0);
  };

  // ── drawing
  const circle = (x: number, y: number, r: number, fill: string, stroke?: string) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
  const drawPlant = (k: PK, x: number, y: number, t: number, hurt = false, fuse = 0) => {
    g.save(); g.translate(x, y); const bob = Math.sin(t * 3) * 1.8; if (hurt) g.globalAlpha = 0.6;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 30, 22, 7, 0, 0, 6.283); g.fill();
    g.strokeStyle = '#15803d'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 30); g.quadraticCurveTo(-4, 14, 0, 6 + bob); g.stroke(); g.fillStyle = '#22c55e'; g.beginPath(); g.ellipse(-12, 22, 10, 4, -0.5, 0, 6.283); g.ellipse(12, 22, 10, 4, 0.5, 0, 6.283); g.fill();
    const face = (ex: number) => { circle(ex - 5, -2 + bob, 2.4, '#111'); circle(ex + 5, -2 + bob, 2.4, '#111'); g.strokeStyle = '#111'; g.lineWidth = 1.6; g.beginPath(); g.arc(ex, 4 + bob, 4, 0.2, Math.PI - 0.2); g.stroke(); };
    if (k === 'sun') { for (let i = 0; i < 12; i++) { g.save(); g.translate(0, -2 + bob); g.rotate((i / 12) * 6.283 + t * 0.3); g.fillStyle = i % 2 ? '#fbbf24' : '#f59e0b'; g.beginPath(); g.ellipse(0, -21, 6, 11, 0, 0, 6.283); g.fill(); g.restore(); } circle(0, -2 + bob, 14, '#92400e', '#78350f'); circle(0, -2 + bob, 11, '#b45309'); face(0); }
    if (k === 'bolt') { g.fillStyle = '#16a34a'; for (const a of [-0.9, 0, 0.9]) { g.save(); g.translate(0, 6 + bob); g.rotate(a); g.beginPath(); g.ellipse(0, -14, 5, 15, 0, 0, 6.283); g.fill(); g.restore(); } g.fillStyle = '#4ade80'; g.strokeStyle = '#14532d'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -30 + bob); g.lineTo(17, -12 + bob); g.lineTo(11, 8 + bob); g.lineTo(-11, 8 + bob); g.lineTo(-17, -12 + bob); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fb923c'; g.fillRect(-11, -14 + bob, 22, 7); g.fillStyle = '#7c2d12'; g.fillRect(-9, -12 + bob, 18, 3); const gl = 0.6 + Math.sin(time * 8) * 0.3; g.fillStyle = `rgba(190,255,120,${gl})`; g.beginPath(); g.arc(18, -2 + bob, 7, 0, 6.283); g.fill(); g.strokeStyle = '#14532d'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, -2 + bob); g.lineTo(16, -2 + bob); g.stroke(); }
    if (k === 'frost') { for (let i = -3; i <= 3; i++) { g.save(); g.translate(0, 8 + bob); g.rotate(i * 0.38); g.strokeStyle = '#0891b2'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(i * 2, -18, i * 4, -32 + Math.abs(i) * 3); g.stroke(); for (let q = 1; q <= 3; q++) { g.strokeStyle = '#67e8f9'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 1.3 * q * 0.6, -q * 8); g.lineTo(i * 1.3 * q * 0.6 - 6, -q * 8 - 5); g.moveTo(i * 1.3 * q * 0.6, -q * 8); g.lineTo(i * 1.3 * q * 0.6 + 6, -q * 8 - 5); g.stroke(); } g.restore(); } g.fillStyle = '#e0f7ff'; g.strokeStyle = '#0e7490'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -24 + bob); g.lineTo(9, -10 + bob); g.lineTo(0, 4 + bob); g.lineTo(-9, -10 + bob); g.closePath(); g.fill(); g.stroke(); circle(-3, -10 + bob, 2, '#083344'); circle(3, -10 + bob, 2, '#083344'); }
    if (k === 'stone') { const sl = [[0, 22, 26, 10, '#94a3b8'], [-2, 10, 21, 10, '#a8b5c7'], [1, -2, 16, 9, '#8b9bb0'], [-1, -12, 10, 7, '#9fb0c4']] as const; for (const [ox, oy, w, h, c] of sl) { g.fillStyle = c; g.strokeStyle = '#475569'; g.lineWidth = 2; g.beginPath(); g.ellipse(ox, oy, w, h, 0, 0, 6.283); g.fill(); g.stroke(); } g.fillStyle = '#65a30d'; g.beginPath(); g.ellipse(-14, 14, 8, 3, 0.3, 0, 6.283); g.ellipse(10, 1, 6, 2.5, -0.3, 0, 6.283); g.fill(); g.fillStyle = '#e2e8f0'; circle(0, -14, 2, '#0f172a'); g.fillStyle = '#4ade80'; g.beginPath(); g.moveTo(0, -19); g.quadraticCurveTo(-5, -28, 1, -30); g.quadraticCurveTo(5, -26, 0, -19); g.fill(); }
    if (k === 'berry') { const sc = 1 + (fuse > 0 ? Math.sin(time * 22) * 0.08 * (1 - fuse) : 0); g.scale(sc, sc); const hot = fuse < 0.4; g.fillStyle = hot ? '#fff' : '#e11d48'; g.strokeStyle = '#881337'; g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283, r = i % 2 ? 17 : 25; g.lineTo(Math.cos(a) * r, -4 + bob + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); const cg = g.createRadialGradient(0, -4 + bob, 1, 0, -4 + bob, 13); cg.addColorStop(0, '#fff7ae'); cg.addColorStop(1, '#fb923c'); g.fillStyle = cg; g.beginPath(); g.arc(0, -4 + bob, 12, 0, 6.283); g.fill(); circle(-4, -6 + bob, 2.2, '#111'); circle(4, -6 + bob, 2.2, '#111'); g.strokeStyle = '#111'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 1 + bob, 4, 0.2, Math.PI - 0.2); g.stroke(); }
    g.restore();
  };
  const drawZom = (z: Zom) => {
    const y = GY + z.r * CH + CH / 2 + 8; g.save(); g.translate(z.x, y); const sway = Math.sin(z.t * (z.kind === 'runner' ? 9 : 4)) * 0.07; const big = z.kind === 'brute' ? 1.3 : 1; g.scale(big, big); g.rotate(sway);
    if (z.slow > 0) g.globalAlpha = 0.9; const tint = z.flash > 0 ? '#fff' : z.slow > 0 ? '#9fd8e6' : '#8fbfae';
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 36, 22, 7, 0, 0, 6.283); g.fill();
    const leg = Math.sin(z.t * (z.kind === 'runner' ? 9 : 4)) * 6; g.fillStyle = '#475569'; g.fillRect(-9, 16, 8, 20 + leg * 0.3); g.fillRect(2, 16, 8, 20 - leg * 0.3); g.fillStyle = '#1f2937'; g.fillRect(-11, 34 + leg * 0.3, 12, 5); g.fillRect(1, 34 - leg * 0.3, 12, 5);
    g.fillStyle = z.flash > 0 ? '#fff' : '#64748b'; g.beginPath(); g.moveTo(-14, -8); g.lineTo(14, -8); g.lineTo(12, 20); g.lineTo(-12, 20); g.closePath(); g.fill(); g.fillStyle = '#a78bfa'; g.beginPath(); g.moveTo(-14, -8); g.lineTo(14, -8); g.lineTo(0, 6); g.closePath(); g.fill();
    const reach = z.eat > 0 ? Math.sin(z.t * 14) * 4 : 0; g.fillStyle = tint; g.fillRect(-30 + reach, -4, 22, 7); g.fillRect(-26 + reach, 6, 20, 7);
    circle(0, -22, 14, tint, '#3f6b4a'); circle(-5, -24, 4, '#fff'); circle(5, -24, 4, '#fff'); circle(-5, -24, 1.8, '#7f1d1d'); circle(5, -24, 1.8, '#7f1d1d'); g.strokeStyle = '#1f2937'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, -15); g.lineTo(6, -15); g.stroke();
    if (z.kind === 'cone') { g.fillStyle = 'rgba(147,210,255,.55)'; g.strokeStyle = '#38bdf8'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, -24, 19, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#38bdf8'; g.fillRect(-20, -26, 40, 4); }
    if (z.kind === 'brute') { g.fillStyle = '#7c2d12'; for (const sx of [-16, 0, 16]) { g.beginPath(); g.moveTo(sx - 5, -34); g.lineTo(sx, -48); g.lineTo(sx + 5, -34); g.closePath(); g.fill(); } g.fillStyle = '#92400e'; g.fillRect(-20, -12, 10, 8); g.fillRect(10, -12, 10, 8); }
    if (z.kind === 'runner') { g.strokeStyle = '#38bdf8'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, -30); g.lineTo(12, -30); g.stroke(); }
    if (z.hp < z.max) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(-16, -48, 32, 4); g.fillStyle = '#ef4444'; g.fillRect(-16, -48, 32 * Math.max(0, z.hp / z.max), 4); }
    g.restore();
  };

  const draw = () => {
    g.save(); if (shake) g.translate(rr(-shake, shake) * 0.4, rr(-shake, shake) * 0.4);
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(0.2, '#bae6fd'); sky.addColorStop(0.2, '#4d7c0f'); sky.addColorStop(1, '#365314'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { g.fillStyle = (r + c) % 2 ? '#5a9a1c' : '#65a30d'; g.fillRect(GX + c * CW, GY + r * CH, CW, CH); }
    g.fillStyle = '#78350f'; g.fillRect(0, 96, GX - 6, H - 96); g.fillStyle = '#92400e'; g.fillRect(0, 96, GX - 20, H - 96); g.fillStyle = '#fde68a'; for (let r = 0; r < ROWS; r++) { g.fillRect(14, GY + r * CH + 24, 34, 44); } // house windows
    for (let r = 0; r < ROWS; r++) if (sweepers[r]) { const y = GY + r * CH + CH / 2; g.fillStyle = '#64748b'; g.strokeStyle = '#1e293b'; g.lineWidth = 2; g.fillRect(GX - 52, y - 14, 38, 28); g.strokeRect(GX - 52, y - 14, 38, 28); g.fillStyle = '#cbd5e1'; for (let q = 0; q < 4; q++) { g.beginPath(); g.moveTo(GX - 50 + q * 9, y - 14); g.lineTo(GX - 46 + q * 9, y - 24); g.lineTo(GX - 42 + q * 9, y - 14); g.fill(); } g.fillStyle = '#f59e0b'; g.fillRect(GX - 40, y - 4, 14, 8); }
    for (const s of sweeping) { const y = GY + s.r * CH + CH / 2; g.fillStyle = '#64748b'; g.fillRect(s.x - 19, y - 14, 38, 28); g.fillStyle = '#cbd5e1'; for (let q = 0; q < 4; q++) { g.beginPath(); g.moveTo(s.x - 17 + q * 9, y - 14); g.lineTo(s.x - 13 + q * 9, y - 24); g.lineTo(s.x - 9 + q * 9, y - 14); g.fill(); } g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(s.x - 56, y - 6, 34, 3); }
    // hover ghost
    const hc = cell(mouse.x, mouse.y); if (hc) { g.fillStyle = shovel ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.14)'; g.fillRect(GX + hc.c * CW, GY + hc.r * CH, CW, CH); if (sel && !plants.some((p) => p.r === hc.r && p.c === hc.c)) { g.globalAlpha = 0.5; drawPlant(sel, GX + hc.c * CW + CW / 2, GY + hc.r * CH + CH / 2, time); g.globalAlpha = 1; } }
    // draw by row so depth is correct
    for (let r = 0; r < ROWS; r++) { for (const p of plants) if (p.r === r) drawPlant(p.k, GX + p.c * CW + CW / 2, GY + r * CH + CH / 2, time + p.c, p.hurt > 0, p.fuse); for (const z of zoms) if (z.r === r) drawZom(z); }
    for (const b of bolts) { const y = GY + b.r * CH + CH / 2 - 3; const gr = g.createRadialGradient(b.x, y, 1, b.x, y, 12); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, b.frost ? '#67e8f9' : '#86efac'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(b.x, y, 12, 0, 6.283); g.fill(); }
    for (const f of fx) { g.globalAlpha = Math.max(0, f.life / f.max); circle(f.x, f.y, f.s, f.c); g.globalAlpha = 1; }
    for (const s of suns) { if (s.life <= 0) continue; const pr = 18 + Math.sin(time * 5) * 2; const gr = g.createRadialGradient(s.x, s.y, 2, s.x, s.y, pr * 1.7); gr.addColorStop(0, 'rgba(255,240,150,1)'); gr.addColorStop(0.5, 'rgba(251,191,36,.85)'); gr.addColorStop(1, 'rgba(251,191,36,0)'); g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, pr * 1.7, 0, 6.283); g.fill(); circle(s.x, s.y, pr * 0.7, '#fde047', '#f59e0b'); }
    // top bar
    g.fillStyle = 'rgba(30,20,10,.88)'; g.fillRect(0, 0, W, 92);
    ORDER.forEach((k, i) => { const x = 14 + i * 78, can = energy >= PLANTS[k].cost && cool[k] <= 0; g.fillStyle = sel === k ? '#fde68a' : can ? '#d6c3a0' : '#7c6f5a'; g.fillRect(x, 8, 72, 78); g.strokeStyle = '#3b2a14'; g.lineWidth = 2; g.strokeRect(x, 8, 72, 78); g.save(); g.beginPath(); g.rect(x, 8, 72, 78); g.clip(); drawPlant(k, x + 36, 50, 0); g.restore(); g.fillStyle = '#111'; g.font = 'bold 12px system-ui'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(String(PLANTS[k].cost), x + 36, 82); g.fillStyle = 'rgba(0,0,0,.6)'; g.font = '10px system-ui'; g.fillText(String(i + 1), x + 8, 20); if (cool[k] > 0) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, 8, 72, 78 * Math.min(1, cool[k] / PLANTS[k].cd)); } });
    g.fillStyle = '#fde68a'; g.fillRect(14 + 5 * 78 + 10, 8, 84, 78); circle(14 + 5 * 78 + 52, 34, 16, '#fbbf24', '#b45309'); g.fillStyle = '#111'; g.font = 'bold 22px system-ui'; g.textAlign = 'center'; g.fillText(String(Math.floor(energy)), 14 + 5 * 78 + 52, 76);
    g.fillStyle = shovel ? '#fca5a5' : '#d6c3a0'; g.fillRect(W - 100, 14, 86, 64); g.fillStyle = '#111'; g.font = 'bold 13px system-ui'; g.fillText('SHOVEL (X)', W - 57, 52);
    const prog = total ? Math.min(1, killed / total) : 0; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(W - 360, 100, 230, 12); g.fillStyle = '#a3e635'; g.fillRect(W - 360, 100, 230 * prog, 12); g.fillStyle = '#fff'; g.font = 'bold 12px system-ui'; g.textAlign = 'right'; g.fillText(`LEVEL ${level}`, W - 372, 111);
    if (waveMsg > 0) { g.textAlign = 'center'; g.font = '900 38px system-ui'; g.fillStyle = `rgba(255,255,255,${Math.min(1, waveMsg)})`; g.shadowColor = '#000'; g.shadowBlur = 12; g.fillText(waveText, W / 2 + 40, H * 0.55); g.shadowBlur = 0; }
    g.restore();
  };
  const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw(); raf = requestAnimationFrame(loop); };
  raf = requestAnimationFrame(loop);
  function stop() { cancelAnimationFrame(raf); canvas.removeEventListener('pointerdown', click); canvas.removeEventListener('pointermove', move); window.removeEventListener('keydown', kd); sfx.stopMusic(); }
  return { stop, key };
}
export default LawnDefense;
