import React, { useEffect, useRef, useState } from 'react';
import { Sfx } from './sound';

const W = 480, H = 720;
const HI = 'ppfx_arcade_space_hi';
type V = { x: number; y: number };
interface Bul { x: number; y: number; vx: number; vy: number; dmg: number; r: number; hue: number }
interface Ene { x: number; y: number; vx: number; vy: number; hp: number; max: number; kind: 'scout' | 'weaver' | 'tank' | 'kami' | 'rock' | 'boss'; r: number; t: number; fire: number; ph: number; spin: number; flash: number }
interface Pow { x: number; y: number; k: 'W' | 'S' | 'B' | 'R'; t: number }
interface Par { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; h: number; ring?: boolean }

export const SpaceShooter: React.FC = () => {
  const cv = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'menu' | 'play' | 'over'>('menu');
  const [final, setFinal] = useState({ score: 0, level: 1, best: 0 });
  const [muted, setMuted] = useState(false);
  const sfx = useRef<Sfx>(new Sfx());
  const game = useRef<{ stop: () => void; pause: (p: boolean) => void } | null>(null);
  const best0 = (() => { try { return Number(localStorage.getItem(HI) || 0); } catch { return 0; } })();

  useEffect(() => () => { game.current?.stop(); sfx.current.dispose(); }, []);
  useEffect(() => { sfx.current.setMuted(muted); }, [muted]);

  const start = () => {
    sfx.current.unlock(); game.current?.stop(); setPhase('play');
    game.current = run(cv.current!, sfx.current, (score, level) => {
      let best = best0; try { best = Math.max(Number(localStorage.getItem(HI) || 0), score); localStorage.setItem(HI, String(best)); } catch { /* ignore */ }
      setFinal({ score, level, best }); setPhase('over');
    });
  };

  return (
    <div className="relative mx-auto w-full max-w-[420px] select-none" style={{ aspectRatio: `${W}/${H}` }}>
      <canvas ref={cv} data-testid="space-canvas" className="h-full w-full rounded-xl border border-cyan-500/30 bg-black touch-none" style={{ cursor: phase === 'play' ? 'none' : 'default' }} />
      <button type="button" aria-label={muted ? 'Sound on' : 'Sound off'} onClick={() => setMuted((m) => !m)} className="absolute right-2 top-2 z-10 rounded-md bg-slate-900/70 px-2 py-1 text-xs text-white cursor-pointer">{muted ? '🔇' : '🔊'}</button>
      {phase !== 'play' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-950/80 p-4 text-center text-white backdrop-blur-sm">
          <div className="text-2xl font-black tracking-widest text-cyan-300">STAR DEFENDER</div>
          {phase === 'over' ? (<><div className="text-sm text-slate-300">Game over</div><div className="text-3xl font-black">{final.score.toLocaleString()}</div><div className="text-xs text-slate-400">Reached level {final.level} · Best {final.best.toLocaleString()}</div></>)
            : (<div className="text-xs leading-relaxed text-slate-300">Move your mouse (or drag a finger) to fly. Your ship fires by itself.<br />Click, tap or press Space to launch a bomb. Pick up glowing pods.<br />Every level is faster. Boss every 5 levels.{best0 ? <><br />Best score: {best0.toLocaleString()}</> : null}</div>)}
          <button type="button" onClick={start} className="rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-6 py-2.5 text-sm font-black text-slate-950 cursor-pointer">{phase === 'over' ? 'PLAY AGAIN' : 'START'}</button>
        </div>
      )}
    </div>
  );
};

function run(canvas: HTMLCanvasElement, sfx: Sfx, onEnd: (score: number, level: number) => void) {
  const dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = W * dpr; canvas.height = H * dpr;
  const g = canvas.getContext('2d')!; g.scale(dpr, dpr);
  const R = Math.random; const rr = (a: number, b: number) => a + R() * (b - a);
  const music = sfx.startMusic([110, 110, 87.3, 98], 96);

  // world state
  const p = { x: W / 2, y: H - 110, tx: W / 2, ty: H - 110, shield: 100, lives: 3, wpn: 1, rapid: 0, bombs: 1, inv: 0, fire: 0, tilt: 0 };
  let bullets: Bul[] = [], eb: Bul[] = [], en: Ene[] = [], pw: Pow[] = [], pa: Par[] = [];
  let score = 0, level = 1, kills = 0, need = 10, spawnT = 0, banner = 2.2, shake = 0, time = 0, combo = 0, comboT = 0, bossOn = false, flash = 0, dead = false, paused = false, raf = 0, last = performance.now();
  const stars = [0, 1, 2].map((l) => Array.from({ length: 40 + l * 25 }, () => ({ x: R() * W, y: R() * H, s: 0.4 + l * 0.7, v: 25 + l * 55 })));
  const speedK = () => 1 + (level - 1) * 0.13;

  const burst = (x: number, y: number, n: number, h: number, sp = 220, size = 3) => { for (let i = 0; i < n; i++) { const a = R() * 6.283, v = rr(sp * 0.2, sp); pa.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rr(0.35, 0.9), max: 0.9, s: rr(size * 0.5, size * 1.6), h: h + rr(-18, 18) }); } };
  const ring = (x: number, y: number, h: number) => pa.push({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, s: 8, h, ring: true });
  const addEne = (k: Ene['kind'], x?: number) => {
    const m = speedK(); const e: Ene = { x: x ?? rr(40, W - 40), y: -40, vx: 0, vy: 0, hp: 1, max: 1, kind: k, r: 18, t: 0, fire: rr(0.8, 2), ph: R() * 6, spin: rr(-1.5, 1.5), flash: 0 };
    if (k === 'scout') { e.vy = rr(110, 160) * m; e.hp = e.max = 1 + Math.floor(level / 6); }
    if (k === 'weaver') { e.vy = rr(90, 130) * m; e.hp = e.max = 2 + Math.floor(level / 5); e.r = 17; }
    if (k === 'tank') { e.vy = rr(55, 80) * m; e.hp = e.max = 6 + level; e.r = 26; }
    if (k === 'kami') { e.vy = 120 * m; e.hp = e.max = 2; e.r = 15; }
    if (k === 'rock') { e.vy = rr(80, 150) * m; e.vx = rr(-40, 40); e.r = rr(18, 34); e.hp = e.max = Math.ceil(e.r / 9); }
    if (k === 'boss') { e.x = W / 2; e.y = -90; e.vy = 60; e.hp = e.max = 60 + level * 14; e.r = 62; }
    en.push(e);
  };
  const spawn = () => {
    const roll = R(); const L = level;
    if (roll < 0.28) addEne('rock'); else if (roll < 0.55 || L < 2) addEne('scout'); else if (roll < 0.74) addEne('weaver'); else if (roll < 0.86 && L >= 3) addEne('tank'); else if (L >= 2) addEne('kami'); else addEne('scout');
    if (L >= 4 && R() < 0.25) addEne('scout');
  };
  const drop = (x: number, y: number, chance: number) => { if (R() < chance) pw.push({ x, y, k: (['W', 'S', 'B', 'R', 'S', 'W'] as const)[Math.floor(R() * 6)], t: 0 }); };
  const kill = (e: Ene) => {
    const big = e.kind === 'boss' ? 4 : e.kind === 'tank' ? 2 : e.kind === 'rock' ? e.r / 24 : 1;
    burst(e.x, e.y, Math.round(18 * big + 10), e.kind === 'rock' ? 30 : e.kind === 'boss' ? 45 : 15, 260 * Math.min(2, big), 3 * Math.min(2, big)); ring(e.x, e.y, 40); sfx.boom(big); shake = Math.max(shake, 4 * big);
    combo++; comboT = 2; const pts = ({ scout: 100, weaver: 160, tank: 400, kami: 200, rock: 50, boss: 5000 })[e.kind] * (1 + Math.min(combo, 20) * 0.05); score += Math.round(pts); kills++;
    drop(e.x, e.y, e.kind === 'tank' ? 0.7 : e.kind === 'boss' ? 1 : 0.12);
    if (e.kind === 'rock' && e.r > 24) for (let i = 0; i < 2; i++) { addEne('rock', e.x + (i ? 14 : -14)); const c = en[en.length - 1]; c.y = e.y; c.r = e.r * 0.6; c.hp = c.max = 1; c.vx = i ? 70 : -70; }
    if (e.kind === 'boss') { bossOn = false; for (let i = 0; i < 6; i++) setTimeout(() => { burst(e.x + rr(-50, 50), e.y + rr(-40, 40), 30, 20, 300, 4); sfx.boom(2); }, i * 140); }
  };
  const hurtPlayer = (d: number) => {
    if (p.inv > 0 || dead) return; p.shield -= d; p.inv = 0.9; flash = 0.35; shake = 10; sfx.hurt(); burst(p.x, p.y, 16, 10, 200); combo = 0;
    if (p.shield <= 0) { p.lives--; burst(p.x, p.y, 60, 20, 340, 4); ring(p.x, p.y, 30); sfx.boom(2); if (p.lives <= 0) { dead = true; sfx.over(); setTimeout(() => { stop(); onEnd(score, level); }, 1100); } else { p.shield = 100; p.inv = 2.2; p.wpn = Math.max(1, p.wpn - 1); } }
  };
  const bomb = () => { if (p.bombs <= 0 || dead || paused) return; p.bombs--; sfx.bomb(); flash = 0.6; shake = 16; ring(p.x, p.y, 200); eb = []; for (const e of en) { if (e.kind === 'boss') { e.hp -= 25; e.flash = 0.2; } else { e.hp = 0; } } burst(p.x, p.y, 80, 200, 500, 3); };

  const shoot = () => {
    const w = p.wpn; const dmg = 1; const add = (dx: number, vx: number, hue = 185) => bullets.push({ x: p.x + dx, y: p.y - 22, vx, vy: -760, dmg, r: 3.2, hue });
    add(0, 0);
    if (w >= 2) { add(-9, -30); add(9, 30); }
    if (w >= 3) { add(-16, -120, 300); add(16, 120, 300); }
    if (w >= 4) { add(-4, -60, 60); add(4, 60, 60); }
    if (w >= 5) { add(-24, -210, 330); add(24, 210, 330); }
    sfx.laser(w);
  };

  const onMove = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); p.tx = ((e.clientX - r.left) / r.width) * W; p.ty = ((e.clientY - r.top) / r.height) * H - (e.pointerType === 'touch' ? 70 : 0); };
  const onDown = (e: PointerEvent) => { onMove(e); if (e.pointerType !== 'touch') bomb(); };
  const onKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); bomb(); } if (e.code === 'KeyP' || e.code === 'Escape') paused = !paused; };
  canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerdown', onDown); window.addEventListener('keydown', onKey);
  const onBlur = () => { paused = true; }; window.addEventListener('blur', onBlur);

  const update = (dt: number) => {
    time += dt; const m = speedK();
    // player follows pointer with smoothing
    const k = 1 - Math.exp(-dt * 14); const ox = p.x; p.x += (Math.min(W - 20, Math.max(20, p.tx)) - p.x) * k; p.y += (Math.min(H - 30, Math.max(60, p.ty)) - p.y) * k; p.tilt += (((p.x - ox) / Math.max(dt, 0.001)) / 900 - p.tilt) * 0.2;
    p.inv = Math.max(0, p.inv - dt); p.rapid = Math.max(0, p.rapid - dt); comboT -= dt; if (comboT <= 0) combo = 0;
    p.fire -= dt; if (!dead && p.fire <= 0) { shoot(); p.fire = p.rapid > 0 ? 0.09 : 0.17; }
    // level flow
    banner = Math.max(0, banner - dt); shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt);
    if (!bossOn) { spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = Math.max(0.22, 1.05 - level * 0.07) * rr(0.7, 1.2); } }
    if (bossOn === false && kills >= need && !dead) {
      if (level % 5 === 4 && !en.some((e) => e.kind === 'boss') && need !== -1) { /* boss level comes next */ }
      level++; kills = 0; need = 10 + level * 4; banner = 2.4; sfx.levelUp(); sfx.setIntensity(Math.min(1, level / 12)); score += 500 * level; ring(W / 2, H / 2, 180);
      if (level % 5 === 0) { bossOn = true; addEne('boss'); need = 1; kills = 0; }
    }
    // stars
    for (const layer of stars) for (const s of layer) { s.y += s.v * dt * (1 + level * 0.04); if (s.y > H) { s.y = 0; s.x = R() * W; } }
    // bullets
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; } bullets = bullets.filter((b) => b.y > -20 && b.x > -20 && b.x < W + 20);
    for (const b of eb) { b.x += b.vx * dt; b.y += b.vy * dt; } eb = eb.filter((b) => b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20);
    // enemies
    for (const e of en) {
      e.t += dt; e.flash = Math.max(0, e.flash - dt);
      if (e.kind === 'weaver') e.x += Math.sin(e.t * 3 + e.ph) * 150 * dt * m;
      if (e.kind === 'kami') { const dx = p.x - e.x; e.x += Math.sign(dx) * Math.min(Math.abs(dx), 120 * m * dt); e.vy += 40 * dt; }
      if (e.kind === 'rock') { e.x += e.vx * dt; e.ph += e.spin * dt; }
      if (e.kind === 'boss') { if (e.y < 110) e.y += e.vy * dt; e.x = W / 2 + Math.sin(e.t * 0.8) * 150; e.fire -= dt; if (e.fire <= 0) { e.fire = Math.max(0.55, 1.3 - level * 0.03); const n = 5 + Math.min(6, level / 2 | 0); for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.22 + Math.sin(e.t) * 0.2; eb.push({ x: e.x, y: e.y + 40, vx: Math.cos(a) * 200 * m, vy: Math.sin(a) * 200 * m, dmg: 12, r: 5, hue: 340 }); } } }
      else e.y += e.vy * dt;
      if (e.kind === 'tank' || (e.kind === 'weaver' && level >= 4)) { e.fire -= dt; if (e.fire <= 0 && e.y > 30 && e.y < H - 200) { e.fire = rr(1.3, 2.4) / Math.min(1.8, m); const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; eb.push({ x: e.x, y: e.y + 16, vx: (dx / d) * 230 * m, vy: (dy / d) * 230 * m, dmg: 12, r: 4.5, hue: 350 }); } }
    }
    // collisions: player bullets → enemies
    for (const b of bullets) for (const e of en) { if (b.dmg > 0 && e.hp > 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) { e.hp -= b.dmg; b.dmg = 0; e.flash = 0.08; sfx.hit(); burst(b.x, b.y, 3, b.hue, 120, 2); } }
    bullets = bullets.filter((b) => b.dmg > 0);
    for (const e of en) if (e.hp <= 0) kill(e);
    en = en.filter((e) => e.hp > 0 && e.y < H + 80);
    // enemy → player
    if (!dead) {
      for (const e of en) if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 12) { if (e.kind !== 'boss') e.hp = 0; hurtPlayer(e.kind === 'boss' ? 30 : 25); }
      for (const b of eb) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 11) { b.y = H + 99; hurtPlayer(b.dmg); }
    }
    for (const e of en) if (e.hp <= 0) kill(e);
    en = en.filter((e) => e.hp > 0);
    // power-ups
    for (const o of pw) { o.y += 90 * dt; o.t += dt; if (!dead && Math.hypot(p.x - o.x, p.y - o.y) < 28) { o.y = H + 99; sfx.power(); burst(o.x, o.y, 14, 120, 180); score += 150; if (o.k === 'W') p.wpn = Math.min(5, p.wpn + 1); if (o.k === 'S') p.shield = Math.min(100, p.shield + 45); if (o.k === 'B') p.bombs = Math.min(5, p.bombs + 1); if (o.k === 'R') p.rapid = 9; } }
    pw = pw.filter((o) => o.y < H + 40);
    // particles
    for (const q of pa) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; q.life -= dt; if (q.ring) q.s += 260 * dt; } pa = pa.filter((q) => q.life > 0);
    // engine trail
    if (!dead && R() < 0.8) pa.push({ x: p.x + rr(-4, 4), y: p.y + 20, vx: rr(-15, 15), vy: rr(120, 220), life: 0.35, max: 0.35, s: rr(2, 4), h: rr(20, 45) });
  };

  const hsl = (h: number, l = 60, a = 1) => `hsla(${h},100%,${l}%,${a})`;
  const drawShip = (x: number, y: number, tilt: number, inv: number) => {
    g.save(); g.translate(x, y); g.rotate(Math.max(-0.35, Math.min(0.35, tilt))); if (inv > 0 && Math.floor(inv * 14) % 2) g.globalAlpha = 0.45;
    const fl = 14 + R() * 10; const fg = g.createLinearGradient(0, 14, 0, 14 + fl * 2); fg.addColorStop(0, 'rgba(255,255,255,.95)'); fg.addColorStop(0.3, 'rgba(80,200,255,.8)'); fg.addColorStop(1, 'rgba(60,80,255,0)');
    g.fillStyle = fg; g.beginPath(); g.moveTo(-7, 14); g.quadraticCurveTo(0, 14 + fl * 2.2, 7, 14); g.fill();
    const body = g.createLinearGradient(-26, 0, 26, 0); body.addColorStop(0, '#5b6b8c'); body.addColorStop(0.5, '#e8f1ff'); body.addColorStop(1, '#5b6b8c');
    g.fillStyle = body; g.beginPath(); g.moveTo(0, -30); g.lineTo(8, -8); g.lineTo(28, 16); g.lineTo(26, 22); g.lineTo(10, 14); g.lineTo(6, 22); g.lineTo(-6, 22); g.lineTo(-10, 14); g.lineTo(-26, 22); g.lineTo(-28, 16); g.lineTo(-8, -8); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,229,255,.9)'; g.lineWidth = 1.4; g.stroke();
    g.fillStyle = '#0ea5e9'; g.beginPath(); g.ellipse(0, -6, 4.5, 10, 0, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-1.2, -9, 1.4, 4, 0, 0, 6.283); g.fill();
    g.fillStyle = '#ff3d71'; g.fillRect(-22, 14, 4, 5); g.fillRect(18, 14, 4, 5);
    if (p.shield > 0 && (inv > 0 || p.shield < 35)) { g.strokeStyle = hsl(190, 60, 0.5); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 34, 0, 6.283); g.stroke(); }
    g.restore();
  };
  const drawEne = (e: Ene) => {
    g.save(); g.translate(e.x, e.y);
    const fl = e.flash > 0; const fill = (c1: string, c2: string, r: number) => { const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r * 1.2); gr.addColorStop(0, fl ? '#fff' : c1); gr.addColorStop(1, fl ? '#fff' : c2); g.fillStyle = gr; };
    if (e.kind === 'rock') { g.rotate(e.ph); fill('#a89a8a', '#4a413a', e.r); g.beginPath(); for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283, r = e.r * (0.82 + ((i * 7919) % 5) / 18); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke(); }
    else if (e.kind === 'scout') { fill('#ff7a7a', '#a3123a', 18); g.beginPath(); g.moveTo(0, 18); g.lineTo(16, -12); g.lineTo(0, -5); g.lineTo(-16, -12); g.closePath(); g.fill(); g.fillStyle = '#ffd166'; g.fillRect(-2, -2, 4, 8); }
    else if (e.kind === 'weaver') { fill('#c18bff', '#5b21b6', 18); g.beginPath(); g.ellipse(0, 0, 18, 9, 0, 0, 6.283); g.fill(); g.fillStyle = '#e9d5ff'; g.beginPath(); g.arc(0, 0, 5, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(200,150,255,.7)'; g.beginPath(); g.moveTo(-18, 0); g.lineTo(-26, -8); g.moveTo(18, 0); g.lineTo(26, -8); g.stroke(); }
    else if (e.kind === 'kami') { g.rotate(Math.atan2(p.y - e.y, p.x - e.x) - Math.PI / 2); fill('#ffb347', '#c2410c', 15); g.beginPath(); g.moveTo(0, 16); g.lineTo(12, -12); g.lineTo(-12, -12); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-3, -4, 6, 6); }
    else if (e.kind === 'tank') { fill('#7dd3a8', '#14532d', 26); g.beginPath(); g.moveTo(-26, -6); g.lineTo(-14, -20); g.lineTo(14, -20); g.lineTo(26, -6); g.lineTo(18, 20); g.lineTo(-18, 20); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.stroke(); g.fillStyle = '#052e16'; g.fillRect(-4, 6, 8, 18); g.fillStyle = '#fca5a5'; g.beginPath(); g.arc(0, -6, 6, 0, 6.283); g.fill(); }
    else { fill('#ff6b9d', '#6d1138', 62); g.beginPath(); g.moveTo(0, 64); g.lineTo(60, 8); g.lineTo(46, -30); g.lineTo(20, -48); g.lineTo(-20, -48); g.lineTo(-46, -30); g.lineTo(-60, 8); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,220,240,.7)'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fde68a'; g.beginPath(); g.arc(0, -4, 14, 0, 6.283); g.fill(); g.fillStyle = '#7f1d1d'; g.beginPath(); g.arc(0, -4, 6, 0, 6.283); g.fill(); g.fillStyle = '#ff2e63'; g.fillRect(-40, 14, 10, 14); g.fillRect(30, 14, 10, 14); }
    if (e.kind === 'tank' || e.kind === 'boss' || (e.hp < e.max && e.kind !== 'rock')) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(-e.r, -e.r - 12, e.r * 2, 4); g.fillStyle = e.kind === 'boss' ? '#ff4d6d' : '#7dd3a8'; g.fillRect(-e.r, -e.r - 12, (e.r * 2) * Math.max(0, e.hp / e.max), 4); }
    g.restore();
  };

  const draw = () => {
    g.save(); const sx = shake ? rr(-shake, shake) * 0.4 : 0, sy = shake ? rr(-shake, shake) * 0.4 : 0; g.translate(sx, sy);
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#04030f'); bg.addColorStop(0.55, '#0b0a2a'); bg.addColorStop(1, '#1a0b33'); g.fillStyle = bg; g.fillRect(-10, -10, W + 20, H + 20);
    const nb = g.createRadialGradient(W * 0.25 + Math.sin(time * 0.15) * 30, H * 0.3, 10, W * 0.25, H * 0.3, 260); nb.addColorStop(0, 'rgba(120,60,255,.28)'); nb.addColorStop(1, 'rgba(120,60,255,0)'); g.fillStyle = nb; g.fillRect(0, 0, W, H);
    const nb2 = g.createRadialGradient(W * 0.8, H * 0.7, 10, W * 0.8, H * 0.7, 240); nb2.addColorStop(0, 'rgba(0,200,255,.18)'); nb2.addColorStop(1, 'rgba(0,200,255,0)'); g.fillStyle = nb2; g.fillRect(0, 0, W, H);
    for (const layer of stars) for (const s of layer) { g.fillStyle = `rgba(255,255,255,${0.35 + s.s * 0.25})`; g.fillRect(s.x, s.y, s.s, s.s * (1 + level * 0.12)); }
    g.globalCompositeOperation = 'lighter';
    for (const o of pw) { const c = ({ W: 50, S: 150, B: 20, R: 280 })[o.k]; const pr = 14 + Math.sin(o.t * 6) * 2; const gr = g.createRadialGradient(o.x, o.y, 2, o.x, o.y, pr * 2); gr.addColorStop(0, hsl(c, 80, 0.9)); gr.addColorStop(1, hsl(c, 50, 0)); g.fillStyle = gr; g.beginPath(); g.arc(o.x, o.y, pr * 2, 0, 6.283); g.fill(); }
    g.globalCompositeOperation = 'source-over';
    for (const o of pw) { g.fillStyle = '#0b1020'; g.beginPath(); g.arc(o.x, o.y, 11, 0, 6.283); g.fill(); g.strokeStyle = hsl(({ W: 50, S: 150, B: 20, R: 280 })[o.k], 60); g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 12px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.k, o.x, o.y + 1); }
    for (const e of en) drawEne(e);
    g.globalCompositeOperation = 'lighter';
    for (const b of bullets) { const gr = g.createLinearGradient(b.x, b.y - 14, b.x, b.y + 10); gr.addColorStop(0, hsl(b.hue, 70, 0)); gr.addColorStop(0.5, hsl(b.hue, 70, 0.95)); gr.addColorStop(1, hsl(b.hue, 70, 0)); g.fillStyle = gr; g.fillRect(b.x - b.r, b.y - 14, b.r * 2, 26); }
    for (const b of eb) { const gr = g.createRadialGradient(b.x, b.y, 1, b.x, b.y, b.r * 3); gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, hsl(b.hue, 70, 0.9)); gr.addColorStop(1, hsl(b.hue, 60, 0)); g.fillStyle = gr; g.beginPath(); g.arc(b.x, b.y, b.r * 3, 0, 6.283); g.fill(); }
    for (const q of pa) { const a = Math.max(0, q.life / q.max); if (q.ring) { g.strokeStyle = hsl(q.h, 70, a * 0.8); g.lineWidth = 3 * a + 1; g.beginPath(); g.arc(q.x, q.y, q.s, 0, 6.283); g.stroke(); } else { g.fillStyle = hsl(q.h, 60, a); g.beginPath(); g.arc(q.x, q.y, q.s * (0.4 + a * 0.6), 0, 6.283); g.fill(); } }
    g.globalCompositeOperation = 'source-over';
    if (!dead) drawShip(p.x, p.y, p.tilt, p.inv);
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * 0.6})`; g.fillRect(-10, -10, W + 20, H + 20); }
    // HUD
    g.textBaseline = 'top'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = 'bold 20px system-ui'; g.fillText(score.toLocaleString(), 14, 12);
    g.font = '12px system-ui'; g.fillStyle = '#94a3b8'; g.fillText(`LEVEL ${level}${bossOn ? ' · BOSS' : ''}`, 14, 38); if (combo > 2) { g.fillStyle = '#fde047'; g.fillText(`x${combo} combo`, 14, 54); }
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(14, H - 22, 150, 8); const sg = g.createLinearGradient(14, 0, 164, 0); sg.addColorStop(0, '#22d3ee'); sg.addColorStop(1, '#a78bfa'); g.fillStyle = p.shield < 30 ? '#fb7185' : sg; g.fillRect(14, H - 22, 150 * Math.max(0, p.shield) / 100, 8);
    g.textAlign = 'right'; g.fillStyle = '#e2e8f0'; g.font = '13px system-ui'; g.fillText(`♥ ${p.lives}   ✹ ${p.bombs}   ⚡ ${p.wpn}${p.rapid > 0 ? ' R' : ''}`, W - 14, H - 24);
    if (banner > 0) { const a = Math.min(1, banner); g.textAlign = 'center'; g.font = '900 44px system-ui'; g.fillStyle = `rgba(255,255,255,${a})`; g.shadowColor = '#22d3ee'; g.shadowBlur = 24; g.fillText(level % 5 === 0 && bossOn ? `BOSS · LEVEL ${level}` : `LEVEL ${level}`, W / 2, H * 0.38); g.shadowBlur = 0; }
    if (paused) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 34px system-ui'; g.fillText('PAUSED', W / 2, H * 0.42); g.font = '14px system-ui'; g.fillText('Press P or click to resume', W / 2, H * 0.42 + 46); }
    g.restore();
  };

  const loop = (now: number) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!paused) update(dt); draw(); raf = requestAnimationFrame(loop); };
  const resume = () => { if (paused) paused = false; }; canvas.addEventListener('pointerdown', resume);
  raf = requestAnimationFrame(loop);
  function stop() { cancelAnimationFrame(raf); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerdown', resume); window.removeEventListener('keydown', onKey); window.removeEventListener('blur', onBlur); sfx.stopMusic(); void music; }
  return { stop, pause: (v: boolean) => { paused = v; } };
}
export default SpaceShooter;
