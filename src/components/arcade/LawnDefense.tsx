import React, { useEffect, useRef, useState } from 'react';
import { Sfx } from './sound';
import { GameShell } from './GameShell';
import { loadProg, saveProg, type Prog } from './progress';

/** An original lawn-defence game (own plants, own zombies, own art): collect energy, plant defenders, stop every wave. */
const KEY = 'ppfx_arcade_lawn_v2';
const W0 = 840, COLS = 9, ROWS = 5, CW = 80, CH = 90, GX = 100, LEVELS = 10;
type PK = 'sun' | 'bolt' | 'stone' | 'frost' | 'berry' | 'twin' | 'mine';
const PLANTS: Record<PK, { name: string; cost: number; cd: number; hp: number; unlock: number; blurb: string }> = {
  sun: { name: 'Sunbloom', cost: 50, cd: 5, hp: 300, unlock: 1, blurb: 'Makes energy' },
  bolt: { name: 'Bolt Sprout', cost: 100, cd: 5, hp: 300, unlock: 1, blurb: 'Fires bolts' },
  stone: { name: 'Stone Bulb', cost: 50, cd: 14, hp: 3600, unlock: 2, blurb: 'Tough wall' },
  frost: { name: 'Frost Fern', cost: 175, cd: 6, hp: 300, unlock: 3, blurb: 'Slows zombies' },
  berry: { name: 'Blast Berry', cost: 150, cd: 20, hp: 300, unlock: 4, blurb: 'Big blast' },
  twin: { name: 'Twin Bolt', cost: 200, cd: 6, hp: 300, unlock: 5, blurb: 'Double fire' },
  mine: { name: 'Pulse Mine', cost: 25, cd: 12, hp: 100, unlock: 6, blurb: 'Hidden trap' },
};
const ORDER: PK[] = ['sun', 'bolt', 'stone', 'frost', 'berry', 'twin', 'mine'];
const UPS = [
  { id: 'start', name: 'Seed stock', icon: '🌰', desc: '+25 starting energy per level' },
  { id: 'cool', name: 'Fast roots', icon: '⏱️', desc: '−8% card recharge per level' },
  { id: 'power', name: 'Plant food', icon: '💪', desc: '+10% plant damage per level' },
  { id: 'sunv', name: 'Rich light', icon: '☀️', desc: '+4 energy per orb per level' },
  { id: 'mower', name: 'Lawn sweepers', icon: '🚜', desc: 'Sweepers can fire an extra time (levels 2 and 4)' },
];
const COST = [150, 300, 500, 800];
interface Plant { k: PK; r: number; c: number; hp: number; t: number; fuse: number; hurt: number; arm: number }
type ZK = 'walker' | 'cone' | 'runner' | 'brute' | 'jumper' | 'giant';
interface Zom { r: number; x: number; hp: number; max: number; kind: ZK; speed: number; slow: number; eat: number; t: number; flash: number; dmg: number; jumped: boolean; hop: number }
interface Bolt { r: number; x: number; frost: boolean }
interface Orb { x: number; y: number; ty: number; v: number; life: number; fall: boolean }
interface Fx { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; c: string }
export interface LawnResult { win: boolean; level: number; stars: number; seeds: number; unlocked?: PK[] }
interface Handle { stop: () => void; pause: (v: boolean) => void; key: (k: string) => void }
interface Cfg { level: number; up: Record<string, number>; onEnd: (r: LawnResult) => void; onUi: (u: { paused?: boolean }) => void }

export const LawnDefense: React.FC = () => {
  const cv = useRef<HTMLCanvasElement>(null);
  const sfx = useRef<Sfx>(null as unknown as Sfx); if (!sfx.current) sfx.current = new Sfx();
  const game = useRef<Handle | null>(null);
  const [scr, setScr] = useState<'menu' | 'play' | 'pause' | 'result'>('menu');
  const [tab, setTab] = useState<'levels' | 'shed'>('levels');
  const [prog, setProg] = useState<Prog>(() => loadProg(KEY));
  const progRef = useRef(prog); progRef.current = prog;
  const [res, setRes] = useState<LawnResult | null>(null);
  const [muted, setMuted] = useState(false);
  useEffect(() => () => { game.current?.stop(); sfx.current.dispose(); }, []);
  useEffect(() => { sfx.current.setMuted(muted); }, [muted]);

  const start = (level: number) => {
    if (level > progRef.current.unlocked) return;
    sfx.current.unlock(); game.current?.stop(); setScr('play');
    game.current = runLawn(cv.current!, sfx.current, {
      level, up: progRef.current.up,
      onUi: (u) => { if (u.paused !== undefined) setScr((s) => (s === 'play' || s === 'pause') ? (u.paused ? 'pause' : 'play') : s); },
      onEnd: (r) => {
        game.current = null; const p = progRef.current; const key = String(level);
        const next: Prog = { ...p, credits: p.credits + r.seeds, unlocked: r.win ? Math.min(LEVELS, Math.max(p.unlocked, level + 1)) : p.unlocked, stars: { ...p.stars, [key]: Math.max(p.stars[key] || 0, r.win ? r.stars : 0) } };
        saveProg(KEY, next); setProg(next); setRes(r); setScr('result');
      },
    });
  };
  const togglePause = () => game.current?.pause(scr === 'play');
  const quit = () => { game.current?.stop(); game.current = null; setScr('menu'); };
  const buy = (id: string) => { const p = progRef.current; const lv = p.up[id] || 0; if (lv >= 4 || p.credits < COST[lv]) return; const next = { ...p, credits: p.credits - COST[lv], up: { ...p.up, [id]: lv + 1 } }; saveProg(KEY, next); setProg(next); sfx.current.unlock(); sfx.current.sun(); };
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const btn = 'rounded-lg px-4 py-2 text-sm font-black cursor-pointer';
  const cur = res ? res.level : 1;

  return (
    <GameShell aspect={840 / 560} maxWidth={860} lockLandscape toolbar="bottom" muted={muted} onMute={() => setMuted((m) => !m)} canPause={scr === 'play' || scr === 'pause'} paused={scr === 'pause'} onPause={togglePause}>
      <canvas ref={cv} data-testid="lawn-canvas" className="absolute inset-0 h-full w-full touch-none bg-emerald-950" onContextMenu={(e) => e.preventDefault()} />
      {scr === 'menu' && (
        <div className="absolute inset-0 z-10 overflow-y-auto bg-slate-950/90 p-3 pt-12 text-white backdrop-blur-sm sm:p-5 sm:pt-12" data-testid="lawn-menu">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-2xl font-black tracking-widest text-emerald-300">GARDEN GUARD</div>
            <div className="mt-1 text-[11px] text-slate-400">Tap/click falling energy orbs · pick a card (or press 1–7), then a tile · X = shovel · P = pause. Rotate your phone or use full screen for a bigger lawn.</div>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs"><span className="rounded-full bg-lime-400/15 px-3 py-1 font-bold text-lime-300">🌱 {prog.credits.toLocaleString()} seeds</span>
              <button type="button" onClick={() => setTab('levels')} className={`rounded-full px-3 py-1 font-bold cursor-pointer ${tab === 'levels' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>Levels</button>
              <button type="button" data-testid="lawn-shed" onClick={() => setTab('shed')} className={`rounded-full px-3 py-1 font-bold cursor-pointer ${tab === 'shed' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>Garden shed</button></div>
            {tab === 'levels' ? (
              <>
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {Array.from({ length: LEVELS }, (_, i) => i + 1).map((l) => { const locked = l > prog.unlocked; const st = prog.stars[String(l)] || 0; const boss = l === 5 || l === 10; return (
                    <button key={l} type="button" data-testid={`lawn-level-${l}`} disabled={locked} onClick={() => start(l)} className={`rounded-xl border p-2 text-center transition ${locked ? 'border-slate-800 bg-slate-900/60 text-slate-600 cursor-not-allowed' : 'border-emerald-500/40 bg-slate-900 hover:border-emerald-300 hover:bg-slate-800 cursor-pointer'}`}>
                      <div className="text-lg font-black">{locked ? '🔒' : boss ? '🧟' : l}</div><div className="text-[10px] uppercase tracking-wider">{boss ? 'Giant' : `Level ${l}`}</div><div className="text-[11px] text-amber-300">{locked ? '—' : stars(st)}</div></button>); })}
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-[10px] text-slate-400">{ORDER.map((k) => <span key={k} className={`rounded-full border px-2 py-0.5 ${PLANTS[k].unlock <= prog.unlocked ? 'border-emerald-500/40 text-emerald-300' : 'border-slate-800 text-slate-600'}`}>{PLANTS[k].unlock <= prog.unlocked ? PLANTS[k].name : `🔒 Level ${PLANTS[k].unlock}`}</span>)}</div>
              </>
            ) : (
              <div className="mt-3 space-y-2 text-left">
                {UPS.map((u) => { const lv = prog.up[u.id] || 0; const maxed = lv >= 4; const cost = COST[lv]; const can = !maxed && prog.credits >= cost; return (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5"><div className="text-2xl">{u.icon}</div>
                    <div className="min-w-0 flex-1"><div className="text-sm font-bold">{u.name} <span className="text-[11px] text-emerald-300">{'■'.repeat(lv)}{'□'.repeat(4 - lv)}</span></div><div className="text-[11px] text-slate-400">{u.desc}</div></div>
                    <button type="button" data-testid={`lawn-buy-${u.id}`} disabled={!can} onClick={() => buy(u.id)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black ${can ? 'bg-lime-400 text-slate-950 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>{maxed ? 'MAX' : `🌱 ${cost}`}</button></div>); })}
              </div>
            )}
            <div className="mt-3 text-[11px] text-slate-500">Clear a level to unlock the next one and new plants. Earn seeds, upgrade in the shed.</div>
          </div>
        </div>
      )}
      {scr === 'pause' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-white backdrop-blur-sm" data-testid="lawn-paused">
          <div className="text-3xl font-black tracking-widest">PAUSED</div>
          <button type="button" onClick={togglePause} className={`${btn} bg-emerald-400 text-slate-950`}>RESUME</button>
          <button type="button" onClick={quit} className={`${btn} border border-slate-600 text-slate-200`}>QUIT TO MENU</button>
        </div>
      )}
      {scr === 'result' && res && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/88 p-4 text-center text-white backdrop-blur-sm" data-testid="lawn-result">
          <div className={`text-2xl font-black tracking-widest ${res.win ? 'text-emerald-300' : 'text-rose-300'}`}>{res.win ? 'LEVEL CLEARED' : 'THEY BROKE THROUGH'}</div>
          {res.win && <div className="text-2xl text-amber-300">{stars(res.stars)}</div>}
          <div className="text-xs text-slate-300">Level {res.level} · +{res.seeds} seeds</div>
          {res.unlocked && res.unlocked.length > 0 && <div className="text-xs font-bold text-lime-300">New plant: {res.unlocked.map((k) => PLANTS[k].name).join(', ')}</div>}
          {res.win && res.level === LEVELS && <div className="text-xs font-bold text-cyan-300">You defended the whole garden!</div>}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {res.win && cur < LEVELS && <button type="button" onClick={() => start(cur + 1)} className={`${btn} bg-gradient-to-r from-emerald-400 to-lime-400 text-slate-950`}>NEXT LEVEL</button>}
            <button type="button" onClick={() => start(cur)} className={`${btn} border border-slate-600`}>{res.win ? 'REPLAY' : 'TRY AGAIN'}</button>
            <button type="button" onClick={() => { setTab('shed'); setScr('menu'); }} className={`${btn} border border-lime-400/50 text-lime-300`}>SHED</button>
            <button type="button" onClick={() => { setTab('levels'); setScr('menu'); }} className={`${btn} border border-slate-600`}>LEVELS</button>
          </div>
        </div>
      )}
    </GameShell>
  );
};

function runLawn(canvas: HTMLCanvasElement, sfx: Sfx, cfg: Cfg): Handle {
  const g = canvas.getContext('2d')!;
  const R = Math.random; const rr = (a: number, b: number) => a + R() * (b - a);
  const L = cfg.level; const up = (id: string) => cfg.up[id] || 0;
  const avail = ORDER.filter((k) => PLANTS[k].unlock <= L); const bossLevel = L === 5 || L === 10;
  const dmgK = 1 + up('power') * 0.1, coolK = 1 - up('cool') * 0.08, orbV = 25 + up('sunv') * 4, charges = 1 + (up('mower') >= 2 ? 1 : 0) + (up('mower') >= 4 ? 1 : 0);
  sfx.startMusic([98, 87.3, 82.4, 98], 80 + L * 2);
  let dpr = 1, s = 1, offX = 0, offY = 0, W = W0, H = 560, BY = 0, GY = 110, tall = false;
  const resize = () => {
    const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight); dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    H = Math.max(560, Math.min(1300, W0 / (cw / ch))); s = Math.min(cw / W0, ch / H); offX = (cw / s - W0) / 2; offY = (ch / s - H) / 2; W = W0;
    tall = H > 700; BY = 0; GY = tall ? 110 + (H - 110 - ROWS * CH) / 3 : 110;
  };
  resize(); const ro = new ResizeObserver(resize); ro.observe(canvas);

  let plants: Plant[] = [], zoms: Zom[] = [], bolts: Bolt[] = [], orbs: Orb[] = [], fx: Fx[] = [];
  let sweepers = Array.from({ length: ROWS }, () => charges), sweeping: { r: number; x: number }[] = [], used = 0;
  let energy = 150 + up('start') * 25, sel: PK | null = null, shovel = false, mouse = { x: -99, y: -99 }, time = 0, skyT = 5, raf = 0, last = performance.now(), acc = 0, ended = false, paused = false, endT = -1, lostAt = -1, touchSeen = false;
  const total = 8 + L * 4 + (bossLevel ? 0 : 0); let toSpawn = total, spawned = 0, waveT = 6, waveMsg = 3, waveText = bossLevel ? `LEVEL ${L} · A GIANT APPROACHES` : `LEVEL ${L}`, killed = 0, shake = 0, giants = L === 10 ? 2 : L === 5 ? 1 : 0;
  const cool: Record<PK, number> = { sun: 0, bolt: 0, stone: 0, frost: 0, berry: 0, twin: 0, mine: 0 };
  const cdOf = (k: PK) => PLANTS[k].cd * coolK;
  const cardX = (i: number) => 12 + i * 64; const shovelX = () => cardX(avail.length) + 78;

  const puff = (x: number, y: number, n: number, c: string, sp = 90) => { if (fx.length > 300) return; for (let i = 0; i < n; i++) { const a = R() * 6.283, v = rr(sp * 0.2, sp); fx.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life: rr(0.3, 0.8), max: 0.8, s: rr(2, 5), c }); } };
  const cell = (mx: number, my: number) => { const c = Math.floor((mx - GX) / CW), r = Math.floor((my - GY) / CH); return c >= 0 && c < COLS && r >= 0 && r < ROWS ? { r, c } : null; };
  const spawnZ = () => {
    let kind: ZK;
    if (giants > 0 && spawned >= Math.floor(total * (giants === 2 ? 0.55 : 0.65))) { kind = 'giant'; giants--; } else {
      const roll = R(); kind = L >= 5 && roll < 0.1 ? 'brute' : L >= 4 && roll < 0.28 ? 'jumper' : L >= 3 && roll < 0.42 ? 'runner' : L >= 2 && roll < 0.55 ? 'cone' : 'walker';
    }
    const base = { walker: [200, 9], cone: [560, 9], runner: [220, 20], brute: [1500, 7], jumper: [300, 12], giant: [5500 + L * 400, 6] }[kind]; const k = 1 + (L - 1) * 0.05;
    const hp = kind === 'giant' ? base[0] : base[0] * (1 + (L - 1) * 0.08);
    zoms.push({ r: Math.floor(R() * ROWS), x: W0 + 30, hp, max: hp, kind, speed: base[1] * k, slow: 0, eat: 0, t: R() * 6, flash: 0, dmg: kind === 'giant' ? 700 : kind === 'brute' ? 140 : 100, jumped: false, hop: 0 });
    spawned++; toSpawn--; if (kind === 'giant') { waveText = 'A GIANT IS HERE!'; waveMsg = 3; sfx.boom(1.5); } else if (R() < 0.3) sfx.groan();
  };
  const dmgZ = (z: Zom, d: number, frost = false) => { z.hp -= d * dmgK; z.flash = 0.1; if (frost) z.slow = z.kind === 'giant' ? 1.2 : 3; };
  const dropOrb = (x: number, y: number, v = orbV) => orbs.push({ x, y, ty: y + 30, v, life: 9, fall: true });

  const toWorld = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / s - offX, y: (e.clientY - r.top) / s - offY }; };
  const pick = (k: PK) => { if (!avail.includes(k)) return; if (energy >= PLANTS[k].cost && cool[k] <= 0) { sel = sel === k ? null : k; shovel = false; sfx.pop(); } };
  const onDown = (e: PointerEvent) => {
    if (paused || ended) return; if (e.pointerType !== 'mouse') touchSeen = true; const w = toWorld(e); mouse = w; const reach = touchSeen ? 46 : 32;
    for (const o of orbs) if (o.life > 0 && Math.hypot(w.x - o.x, w.y - o.y) < reach) { energy += o.v; o.life = -1; sfx.sun(); puff(o.x, o.y, 8, '#fde047'); return; }
    if (w.y >= BY && w.y < BY + 92) {
      const i = Math.floor((w.x - 12) / 64); if (w.x >= 12 && w.x < 12 + avail.length * 64 && i >= 0 && i < avail.length) { pick(avail[i]); return; }
      if (w.x > shovelX() && w.x < shovelX() + 90) { shovel = !shovel; sel = null; sfx.pop(); } return;
    }
    const ce = cell(w.x, w.y); if (!ce) { sel = null; return; }
    const ex = plants.find((p) => p.r === ce.r && p.c === ce.c);
    if (shovel) { if (ex) { plants = plants.filter((p) => p !== ex); puff(GX + ce.c * CW + CW / 2, GY + ce.r * CH + CH / 2, 10, '#a3e635'); sfx.pop(); } shovel = false; return; }
    if (sel && !ex && energy >= PLANTS[sel].cost && cool[sel] <= 0) {
      const k = sel; energy -= PLANTS[k].cost; cool[k] = cdOf(k);
      plants.push({ k, r: ce.r, c: ce.c, hp: PLANTS[k].hp, t: k === 'sun' ? 4 : 0.5, fuse: k === 'berry' ? 1 : 0, hurt: 0, arm: k === 'mine' ? 6 : 0 });
      sfx.plant(); puff(GX + ce.c * CW + CW / 2, GY + ce.r * CH + CH - 8, 10, '#86efac'); sel = null;
    }
  };
  const onMove = (e: PointerEvent) => { mouse = toWorld(e); };
  const key = (k: string) => {
    if (k >= '1' && k <= '9') { const p = avail[Number(k) - 1]; if (p) pick(p); }
    if (k === 'x' || k === 'X') { shovel = !shovel; sel = null; } if (k === 'Escape') { sel = null; shovel = false; }
  };
  const setPaused = (v: boolean) => { if (ended || paused === v) return; paused = v; last = performance.now(); acc = 0; cfg.onUi({ paused: v }); };
  const kd = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; if (e.code === 'KeyP') { if (!e.repeat) setPaused(!paused); return; } if (e.key === 'Escape' && !sel && !shovel) { setPaused(!paused); return; } key(e.key); };
  const onVis = () => { if (document.hidden) setPaused(true); }; const onBlur = () => setPaused(true);
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); window.addEventListener('keydown', kd); window.addEventListener('blur', onBlur); document.addEventListener('visibilitychange', onVis);

  const finish = (win: boolean) => {
    if (ended) return; ended = true;
    const stars3 = win ? (used === 0 ? 3 : used <= 2 ? 2 : 1) : 0; const seeds = win ? 40 + L * 15 + stars3 * 30 + Math.floor(killed / 4) : Math.floor(killed / 3);
    const unlocked = win ? ORDER.filter((k) => PLANTS[k].unlock === L + 1) : [];
    stop(); cfg.onEnd({ win, level: L, stars: stars3, seeds, unlocked });
  };

  const update = (dt: number) => {
    time += dt; shake = Math.max(0, shake - dt * 20); waveMsg = Math.max(0, waveMsg - dt);
    for (const k of ORDER) cool[k] = Math.max(0, cool[k] - dt);
    skyT -= dt; if (skyT <= 0) { skyT = rr(7, 10); orbs.push({ x: rr(GX + 20, GX + COLS * CW - 20), y: GY - 30, ty: rr(GY + 40, GY + ROWS * CH - 30), v: orbV, life: 10, fall: true }); }
    waveT -= dt; if (toSpawn > 0 && waveT <= 0) { spawnZ(); waveT = Math.max(1.2, (7 - L * 0.4) * rr(0.6, 1.2)) * (spawned > total * 0.75 ? 0.55 : 1); if (spawned === Math.floor(total * 0.75) && !bossLevel) { waveText = 'A HUGE WAVE IS COMING'; waveMsg = 3; sfx.groan(); } }
    for (const o of orbs) { if (o.fall && o.y < o.ty) o.y += 45 * dt; else o.fall = false; if (o.life > 0) o.life -= dt; }
    orbs = orbs.filter((o) => o.life > 0);
    for (const p of plants) {
      p.t -= dt; p.hurt = Math.max(0, p.hurt - dt); const cx = GX + p.c * CW + CW / 2, cy = GY + p.r * CH + CH / 2;
      if (p.k === 'sun' && p.t <= 0) { p.t = 11; orbs.push({ x: cx + rr(-14, 14), y: cy - 10, ty: cy + 22, v: orbV, life: 10, fall: true }); }
      if ((p.k === 'bolt' || p.k === 'frost' || p.k === 'twin') && p.t <= 0 && zoms.some((z) => z.r === p.r && z.x > cx - 10 && z.x < W0 + 10)) { p.t = p.k === 'frost' ? 1.6 : 1.4; bolts.push({ r: p.r, x: cx + 26, frost: p.k === 'frost' }); if (p.k === 'twin') bolts.push({ r: p.r, x: cx - 4, frost: false }); sfx.pop(); }
      if (p.k === 'berry') { p.fuse -= dt; if (p.fuse <= 0) { for (const z of zoms) if (Math.abs(z.r - p.r) <= 1 && Math.abs(z.x - cx) < CW * 1.6) dmgZ(z, 1800); puff(cx, cy, 40, '#fb7185', 260); puff(cx, cy, 20, '#fde047', 200); shake = 10; sfx.boom(1.4); p.hp = 0; } }
      if (p.k === 'mine') { p.arm = Math.max(0, p.arm - dt); if (p.arm <= 0 && zoms.some((z) => z.r === p.r && Math.abs(z.x - cx) < 38)) { for (const z of zoms) if (Math.abs(z.r - p.r) <= 1 && Math.abs(z.x - cx) < CW * 1.3) dmgZ(z, 1400); puff(cx, cy, 30, '#fbbf24', 240); shake = 8; sfx.boom(1.1); p.hp = 0; } }
    }
    plants = plants.filter((p) => p.hp > 0);
    for (const b of bolts) { b.x += 360 * dt; for (const z of zoms) if (z.r === b.r && z.hp > 0 && Math.abs(z.x - b.x) < 18) { dmgZ(z, b.frost ? 16 : 22, b.frost); puff(b.x, GY + b.r * CH + 30, 4, b.frost ? '#a5f3fc' : '#bbf7d0', 70); sfx.hit(); b.x = W0 + 99; break; } }
    bolts = bolts.filter((b) => b.x < W0 + 20);
    for (const z of zoms) {
      z.t += dt; z.flash = Math.max(0, z.flash - dt); z.slow = Math.max(0, z.slow - dt);
      const sp = z.speed * (z.slow > 0 ? 0.5 : 1);
      if (z.hop > 0) { z.hop -= dt; z.x -= 190 * dt; }
      else {
        const tgt = plants.find((p) => p.r === z.r && p.k !== 'mine' && z.x - (GX + p.c * CW + CW / 2) < 34 && z.x - (GX + p.c * CW + CW / 2) > -10);
        if (tgt && z.kind === 'jumper' && !z.jumped) { z.jumped = true; z.hop = 0.5; }
        else if (tgt) { z.eat -= dt; if (z.eat <= 0) { z.eat = 0.5; tgt.hp -= z.dmg * 0.5; tgt.hurt = 0.15; sfx.bite(); } }
        else z.x -= sp * dt;
      }
      if (z.x < GX - 40 && !ended && lostAt < 0) {
        if (sweepers[z.r] > 0) { sweepers[z.r]--; used++; sweeping.push({ r: z.r, x: 40 }); sfx.boom(0.8); } else if (z.x < 40) { lostAt = time + 1; sfx.over(); waveText = 'THEY BROKE THROUGH!'; waveMsg = 3; }
      }
    }
    for (const sw of sweeping) { sw.x += 520 * dt; for (const z of zoms) if (z.r === sw.r && Math.abs(z.x - sw.x) < 40) z.hp = Math.min(z.hp, z.kind === 'giant' ? z.hp - 900 * dt * 3 : 0); } sweeping = sweeping.filter((x) => x.x < W0 + 40);
    for (const z of zoms) if (z.hp <= 0) { killed++; puff(z.x, GY + z.r * CH + 40, z.kind === 'giant' ? 40 : 14, '#a3b18a', 140); sfx.splat(); if (z.kind === 'giant') { shake = 14; sfx.boom(2); dropOrb(z.x, GY + z.r * CH + 30, 150); } else if (R() < 0.15) dropOrb(z.x, GY + z.r * CH + 30, orbV); }
    zoms = zoms.filter((z) => z.hp > 0);
    if (lostAt >= 0 && time >= lostAt) { finish(false); return; }
    if (!ended && endT < 0 && lostAt < 0 && toSpawn <= 0 && zoms.length === 0) { endT = time + 1.4; sfx.levelUp(); waveText = 'LEVEL CLEARED!'; waveMsg = 3; }
    if (endT >= 0 && !ended && time >= endT) { finish(true); return; }
    for (const f of fx) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 160 * dt; f.life -= dt; } fx = fx.filter((f) => f.life > 0);
  };

  // drawing
  const circle = (x: number, y: number, r: number, fill: string, stroke?: string) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); } };
  const drawPlant = (k: PK, x: number, y: number, t: number, hurt = false, fuse = 0, arm = 0) => {
    g.save(); g.translate(x, y); const bob = Math.sin(t * 3) * 1.8; if (hurt) g.globalAlpha = 0.6;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 30, 22, 7, 0, 0, 6.283); g.fill();
    if (k === 'mine') { g.fillStyle = arm > 0 ? '#57534e' : '#78716c'; g.strokeStyle = '#292524'; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 24, 24, 9, 0, 0, 6.283); g.fill(); g.stroke(); const on = arm <= 0 && Math.sin(time * 9) > 0; circle(0, 22, 5, on ? '#ef4444' : '#7f1d1d'); g.strokeStyle = '#a8a29e'; g.lineWidth = 2; g.beginPath(); g.moveTo(-14, 22); g.lineTo(-20, 16); g.moveTo(14, 22); g.lineTo(20, 16); g.stroke(); g.restore(); return; }
    g.strokeStyle = '#15803d'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 30); g.quadraticCurveTo(-4, 14, 0, 6 + bob); g.stroke(); g.fillStyle = '#22c55e'; g.beginPath(); g.ellipse(-12, 22, 10, 4, -0.5, 0, 6.283); g.ellipse(12, 22, 10, 4, 0.5, 0, 6.283); g.fill();
    const face = (ex: number) => { circle(ex - 5, -2 + bob, 2.4, '#111'); circle(ex + 5, -2 + bob, 2.4, '#111'); g.strokeStyle = '#111'; g.lineWidth = 1.6; g.beginPath(); g.arc(ex, 4 + bob, 4, 0.2, Math.PI - 0.2); g.stroke(); };
    if (k === 'sun') { for (let i = 0; i < 12; i++) { g.save(); g.translate(0, -2 + bob); g.rotate((i / 12) * 6.283 + t * 0.3); g.fillStyle = i % 2 ? '#fbbf24' : '#f59e0b'; g.beginPath(); g.ellipse(0, -21, 6, 11, 0, 0, 6.283); g.fill(); g.restore(); } circle(0, -2 + bob, 14, '#92400e', '#78350f'); circle(0, -2 + bob, 11, '#b45309'); face(0); }
    if (k === 'bolt' || k === 'twin') { g.fillStyle = '#16a34a'; for (const a of [-0.9, 0, 0.9]) { g.save(); g.translate(0, 6 + bob); g.rotate(a); g.beginPath(); g.ellipse(0, -14, 5, 15, 0, 0, 6.283); g.fill(); g.restore(); } g.fillStyle = k === 'twin' ? '#34d399' : '#4ade80'; g.strokeStyle = '#14532d'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -30 + bob); g.lineTo(17, -12 + bob); g.lineTo(11, 8 + bob); g.lineTo(-11, 8 + bob); g.lineTo(-17, -12 + bob); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#fb923c'; g.fillRect(-11, -14 + bob, 22, 7); g.fillStyle = '#7c2d12'; g.fillRect(-9, -12 + bob, 18, 3); const gl = 0.6 + Math.sin(time * 8) * 0.3; g.fillStyle = `rgba(190,255,120,${gl})`; g.beginPath(); g.arc(18, -2 + bob, 7, 0, 6.283); g.fill(); g.strokeStyle = '#14532d'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, -2 + bob); g.lineTo(16, -2 + bob); g.stroke(); if (k === 'twin') { g.fillStyle = `rgba(190,255,120,${gl})`; g.beginPath(); g.arc(-18, -2 + bob, 7, 0, 6.283); g.fill(); g.beginPath(); g.moveTo(-10, -2 + bob); g.lineTo(-16, -2 + bob); g.stroke(); } }
    if (k === 'frost') { for (let i = -3; i <= 3; i++) { g.save(); g.translate(0, 8 + bob); g.rotate(i * 0.38); g.strokeStyle = '#0891b2'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(i * 2, -18, i * 4, -32 + Math.abs(i) * 3); g.stroke(); for (let q = 1; q <= 3; q++) { g.strokeStyle = '#67e8f9'; g.lineWidth = 2; g.beginPath(); g.moveTo(i * 1.3 * q * 0.6, -q * 8); g.lineTo(i * 1.3 * q * 0.6 - 6, -q * 8 - 5); g.moveTo(i * 1.3 * q * 0.6, -q * 8); g.lineTo(i * 1.3 * q * 0.6 + 6, -q * 8 - 5); g.stroke(); } g.restore(); } g.fillStyle = '#e0f7ff'; g.strokeStyle = '#0e7490'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -24 + bob); g.lineTo(9, -10 + bob); g.lineTo(0, 4 + bob); g.lineTo(-9, -10 + bob); g.closePath(); g.fill(); g.stroke(); circle(-3, -10 + bob, 2, '#083344'); circle(3, -10 + bob, 2, '#083344'); }
    if (k === 'stone') { const sl = [[0, 22, 26, 10, '#94a3b8'], [-2, 10, 21, 10, '#a8b5c7'], [1, -2, 16, 9, '#8b9bb0'], [-1, -12, 10, 7, '#9fb0c4']] as const; for (const [ox, oy, w, h, c] of sl) { g.fillStyle = c; g.strokeStyle = '#475569'; g.lineWidth = 2; g.beginPath(); g.ellipse(ox, oy, w, h, 0, 0, 6.283); g.fill(); g.stroke(); } g.fillStyle = '#65a30d'; g.beginPath(); g.ellipse(-14, 14, 8, 3, 0.3, 0, 6.283); g.ellipse(10, 1, 6, 2.5, -0.3, 0, 6.283); g.fill(); circle(0, -14, 2, '#0f172a'); g.fillStyle = '#4ade80'; g.beginPath(); g.moveTo(0, -19); g.quadraticCurveTo(-5, -28, 1, -30); g.quadraticCurveTo(5, -26, 0, -19); g.fill(); }
    if (k === 'berry') { const sc = 1 + (fuse > 0 ? Math.sin(time * 22) * 0.08 * (1 - fuse) : 0); g.scale(sc, sc); const hot = fuse < 0.4; g.fillStyle = hot ? '#fff' : '#e11d48'; g.strokeStyle = '#881337'; g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283, r = i % 2 ? 17 : 25; g.lineTo(Math.cos(a) * r, -4 + bob + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); const cg = g.createRadialGradient(0, -4 + bob, 1, 0, -4 + bob, 13); cg.addColorStop(0, '#fff7ae'); cg.addColorStop(1, '#fb923c'); g.fillStyle = cg; g.beginPath(); g.arc(0, -4 + bob, 12, 0, 6.283); g.fill(); circle(-4, -6 + bob, 2.2, '#111'); circle(4, -6 + bob, 2.2, '#111'); g.strokeStyle = '#111'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 1 + bob, 4, 0.2, Math.PI - 0.2); g.stroke(); }
    g.restore();
  };
  const drawZom = (z: Zom) => {
    const hopY = z.hop > 0 ? -Math.sin((1 - z.hop / 0.5) * Math.PI) * 46 : 0;
    const y = GY + z.r * CH + CH / 2 + 8; g.save(); g.translate(z.x, y + hopY); const sway = Math.sin(z.t * (z.kind === 'runner' ? 9 : 4)) * 0.07; const big = z.kind === 'giant' ? 1.75 : z.kind === 'brute' ? 1.3 : 1; g.scale(big, big); g.rotate(sway);
    const tint = z.flash > 0 ? '#fff' : z.slow > 0 ? '#9fd8e6' : z.kind === 'giant' ? '#9a7fbf' : '#8fbfae';
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(0, 36 - hopY / big, 22, 7, 0, 0, 6.283); g.fill();
    const leg = Math.sin(z.t * (z.kind === 'runner' ? 9 : 4)) * 6; g.fillStyle = '#475569'; g.fillRect(-9, 16, 8, 20 + leg * 0.3); g.fillRect(2, 16, 8, 20 - leg * 0.3); g.fillStyle = '#1f2937'; g.fillRect(-11, 34 + leg * 0.3, 12, 5); g.fillRect(1, 34 - leg * 0.3, 12, 5);
    g.fillStyle = z.flash > 0 ? '#fff' : z.kind === 'giant' ? '#4c1d95' : '#64748b'; g.beginPath(); g.moveTo(-14, -8); g.lineTo(14, -8); g.lineTo(12, 20); g.lineTo(-12, 20); g.closePath(); g.fill(); g.fillStyle = '#a78bfa'; g.beginPath(); g.moveTo(-14, -8); g.lineTo(14, -8); g.lineTo(0, 6); g.closePath(); g.fill();
    const reach = z.eat > 0 ? Math.sin(z.t * 14) * 4 : 0; g.fillStyle = tint; g.fillRect(-30 + reach, -4, 22, 7); g.fillRect(-26 + reach, 6, 20, 7);
    circle(0, -22, 14, tint, '#3f6b4a'); circle(-5, -24, 4, '#fff'); circle(5, -24, 4, '#fff'); circle(-5, -24, 1.8, '#7f1d1d'); circle(5, -24, 1.8, '#7f1d1d'); g.strokeStyle = '#1f2937'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-6, -15); g.lineTo(6, -15); g.stroke();
    if (z.kind === 'cone') { g.fillStyle = 'rgba(147,210,255,.55)'; g.strokeStyle = '#38bdf8'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, -24, 19, Math.PI, 0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#38bdf8'; g.fillRect(-20, -26, 40, 4); }
    if (z.kind === 'brute' || z.kind === 'giant') { g.fillStyle = '#7c2d12'; for (const sx of [-16, 0, 16]) { g.beginPath(); g.moveTo(sx - 5, -34); g.lineTo(sx, -48); g.lineTo(sx + 5, -34); g.closePath(); g.fill(); } g.fillStyle = '#92400e'; g.fillRect(-20, -12, 10, 8); g.fillRect(10, -12, 10, 8); }
    if (z.kind === 'runner') { g.strokeStyle = '#38bdf8'; g.lineWidth = 3; g.beginPath(); g.moveTo(-12, -30); g.lineTo(12, -30); g.stroke(); }
    if (z.kind === 'jumper') { g.fillStyle = '#f97316'; g.fillRect(-14, 18, 28, 4); g.strokeStyle = '#f97316'; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, 20); g.lineTo(-10, 30); g.moveTo(8, 20); g.lineTo(12, 30); g.stroke(); circle(0, -33, 4, '#f97316'); }
    if (z.hp < z.max) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(-16, -48, 32, 4); g.fillStyle = '#ef4444'; g.fillRect(-16, -48, 32 * Math.max(0, z.hp / z.max), 4); }
    g.restore();
  };
  const sweeper = (x: number, y: number, moving = false) => { g.fillStyle = '#64748b'; g.strokeStyle = '#1e293b'; g.lineWidth = 2; g.fillRect(x - 19, y - 14, 38, 28); g.strokeRect(x - 19, y - 14, 38, 28); g.fillStyle = '#cbd5e1'; for (let q = 0; q < 4; q++) { g.beginPath(); g.moveTo(x - 17 + q * 9, y - 14); g.lineTo(x - 13 + q * 9, y - 24); g.lineTo(x - 9 + q * 9, y - 14); g.fill(); } if (moving) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x - 56, y - 6, 34, 3); } else { g.fillStyle = '#f59e0b'; g.fillRect(x - 7, y - 4, 14, 8); } };

  const draw = () => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#4d7c0f'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.setTransform(dpr * s, 0, 0, dpr * s, 0, 0); g.translate(offX, offY);
    g.save(); if (shake) g.translate(rr(-shake, shake) * 0.4, rr(-shake, shake) * 0.4);
    const sky = g.createLinearGradient(0, 0, 0, GY); sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(1, '#bae6fd'); g.fillStyle = sky; g.fillRect(-offX - 10, -offY - 10, W0 + offX * 2 + 20, GY + offY + 10);
    g.fillStyle = '#3f6212'; g.fillRect(-offX - 10, GY, W0 + offX * 2 + 20, H - GY + offY + 10);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { g.fillStyle = (r + c) % 2 ? '#5a9a1c' : '#65a30d'; g.fillRect(GX + c * CW, GY + r * CH, CW, CH); }
    g.fillStyle = '#78350f'; g.fillRect(-offX - 10, GY - 14, GX - 6 + offX + 10, ROWS * CH + 14); g.fillStyle = '#92400e'; g.fillRect(-offX - 10, GY - 14, GX - 20 + offX + 10, ROWS * CH + 14); g.fillStyle = '#fde68a'; for (let r = 0; r < ROWS; r++) g.fillRect(14, GY + r * CH + 24, 34, 44);
    for (let r = 0; r < ROWS; r++) if (sweepers[r] > 0) { sweeper(GX - 33, GY + r * CH + CH / 2); if (sweepers[r] > 1) { g.fillStyle = '#fde047'; g.font = 'bold 11px system-ui'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(`x${sweepers[r]}`, GX - 33, GY + r * CH + CH / 2 + 30); } }
    for (const sw of sweeping) sweeper(sw.x, GY + sw.r * CH + CH / 2, true);
    const hc = cell(mouse.x, mouse.y); if (hc && !touchSeen) { g.fillStyle = shovel ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.14)'; g.fillRect(GX + hc.c * CW, GY + hc.r * CH, CW, CH); if (sel && !plants.some((p) => p.r === hc.r && p.c === hc.c)) { g.globalAlpha = 0.5; drawPlant(sel, GX + hc.c * CW + CW / 2, GY + hc.r * CH + CH / 2, time); g.globalAlpha = 1; } }
    for (let r = 0; r < ROWS; r++) { for (const p of plants) if (p.r === r) drawPlant(p.k, GX + p.c * CW + CW / 2, GY + r * CH + CH / 2, time + p.c, p.hurt > 0, p.fuse, p.arm); for (const z of zoms) if (z.r === r) drawZom(z); }
    for (const b of bolts) { const y = GY + b.r * CH + CH / 2 - 3; const gr = g.createRadialGradient(b.x, y, 1, b.x, y, 12); gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, b.frost ? '#67e8f9' : '#86efac'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(b.x, y, 12, 0, 6.283); g.fill(); }
    for (const f of fx) { g.globalAlpha = Math.max(0, f.life / f.max); circle(f.x, f.y, f.s, f.c); g.globalAlpha = 1; }
    for (const o of orbs) { if (o.life <= 0) continue; const pr = 18 + Math.sin(time * 5) * 2; const gr = g.createRadialGradient(o.x, o.y, 2, o.x, o.y, pr * 1.7); gr.addColorStop(0, 'rgba(255,240,150,1)'); gr.addColorStop(0.5, 'rgba(251,191,36,.85)'); gr.addColorStop(1, 'rgba(251,191,36,0)'); g.fillStyle = gr; g.beginPath(); g.arc(o.x, o.y, pr * 1.7, 0, 6.283); g.fill(); circle(o.x, o.y, pr * 0.7, '#fde047', '#f59e0b'); }
    // bar
    g.fillStyle = 'rgba(30,20,10,.9)'; g.fillRect(-offX - 10, BY, W0 + offX * 2 + 20, 92);
    avail.forEach((k, i) => { const x = cardX(i), can = energy >= PLANTS[k].cost && cool[k] <= 0; g.fillStyle = sel === k ? '#fde68a' : can ? '#d6c3a0' : '#7c6f5a'; g.fillRect(x, BY + 8, 60, 78); g.strokeStyle = '#3b2a14'; g.lineWidth = 2; g.strokeRect(x, BY + 8, 60, 78); g.save(); g.beginPath(); g.rect(x, BY + 8, 60, 78); g.clip(); g.translate(x + 30, BY + 48); g.scale(0.85, 0.85); drawPlant(k, 0, 0, 0, false, 1, 0); g.restore(); g.fillStyle = '#111'; g.font = 'bold 12px system-ui'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(String(PLANTS[k].cost), x + 30, BY + 82); g.fillStyle = 'rgba(0,0,0,.6)'; g.font = '10px system-ui'; g.fillText(String(i + 1), x + 8, BY + 20); if (cool[k] > 0) { g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, BY + 8, 60, 78 * Math.min(1, cool[k] / cdOf(k))); } });
    const ex = cardX(avail.length) + 2; g.fillStyle = '#fde68a'; g.fillRect(ex, BY + 8, 72, 78); circle(ex + 36, BY + 34, 16, '#fbbf24', '#b45309'); g.fillStyle = '#111'; g.font = 'bold 22px system-ui'; g.textAlign = 'center'; g.fillText(String(Math.floor(energy)), ex + 36, BY + 76);
    g.fillStyle = shovel ? '#fca5a5' : '#d6c3a0'; g.fillRect(shovelX(), BY + 8, 86, 78); g.fillStyle = '#111'; g.font = 'bold 13px system-ui'; g.fillText(touchSeen ? 'SHOVEL' : 'SHOVEL (X)', shovelX() + 43, BY + 52);
    const prog = total ? Math.min(1, killed / total) : 0; const iy = 98; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(W0 - 360, iy, 230, 12); g.fillStyle = '#a3e635'; g.fillRect(W0 - 360, iy, 230 * prog, 12); g.fillStyle = '#fff'; g.font = 'bold 12px system-ui'; g.textAlign = 'right'; g.fillText(`LEVEL ${L}`, W0 - 372, iy + 11);
    if (waveMsg > 0) { g.textAlign = 'center'; g.font = '900 36px system-ui'; g.fillStyle = `rgba(255,255,255,${Math.min(1, waveMsg)})`; g.shadowColor = '#000'; g.shadowBlur = 12; g.fillText(waveText, W0 / 2 + 40, GY + ROWS * CH * 0.5); g.shadowBlur = 0; }
    g.restore();
  };
  const STEP = 1 / 60;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop); const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!paused) { acc += dt; let n = 0; while (acc >= STEP && n < 5) { update(STEP); acc -= STEP; n++; } if (n === 5) acc = 0; }
    draw();
  };
  raf = requestAnimationFrame(loop);
  let stopped = false;
  function stop() {
    if (stopped) return; stopped = true; cancelAnimationFrame(raf); ro.disconnect();
    canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); window.removeEventListener('keydown', kd); window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', onVis); sfx.stopMusic();
  }
  return { stop, pause: setPaused, key };
}
export default LawnDefense;
