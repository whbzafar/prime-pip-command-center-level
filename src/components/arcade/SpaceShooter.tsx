import React, { useEffect, useRef, useState } from 'react';
import { Sfx } from './sound';
import { GameShell } from './GameShell';
import { loadProg, saveProg, type Prog } from './progress';

const KEY = 'ppfx_arcade_space_v2';
const H0 = 720, STAGES = 12, BOSS_AT = [4, 8, 12];
const UPS = [
  { id: 'hull', name: 'Hull plating', icon: '🛡️', desc: '+20 max shield per level' },
  { id: 'cannon', name: 'Cannons', icon: '🔫', desc: '+12% damage, better starting weapon' },
  { id: 'rate', name: 'Fire control', icon: '⚡', desc: '+6% fire rate per level' },
  { id: 'bombs', name: 'Bomb bay', icon: '💣', desc: '+1 starting bomb per level' },
  { id: 'magnet', name: 'Tractor beam', icon: '🧲', desc: 'Pulls power pods from farther away' },
  { id: 'regen', name: 'Repair drones', icon: '🔧', desc: 'Shield slowly repairs itself' },
];
const COST = [250, 500, 900, 1400, 2000];
const goalOf = (s: number) => 14 + s * 3;
const THEME = [265, 205, 150, 330, 20, 190, 285, 45, 230, 340, 170, 300];

export interface SpaceResult { win: boolean; score: number; stage: number; stars: number; credits: number }
interface Handle { stop: () => void; pause: (v: boolean) => void; bomb: () => void; gift: () => void }
interface Cfg { stage: number; up: Record<string, number>; onEnd: (r: SpaceResult) => void; onUi: (u: { paused?: boolean }) => void }

export const SpaceShooter: React.FC = () => {
  const cv = useRef<HTMLCanvasElement>(null);
  const sfx = useRef<Sfx>(null as unknown as Sfx); if (!sfx.current) sfx.current = new Sfx();
  const game = useRef<Handle | null>(null);
  const [scr, setScr] = useState<'menu' | 'play' | 'pause' | 'result'>('menu');
  const [tab, setTab] = useState<'missions' | 'hangar'>('missions');
  const [prog, setProg] = useState<Prog>(() => loadProg(KEY));
  const progRef = useRef(prog); progRef.current = prog;
  const [res, setRes] = useState<SpaceResult | null>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => () => { game.current?.stop(); sfx.current.dispose(); }, []);
  useEffect(() => { sfx.current.setMuted(muted); }, [muted]);

  const start = (stage: number) => {
    if (stage > progRef.current.unlocked) return;
    sfx.current.unlock(); game.current?.stop(); setScr('play');
    game.current = run(cv.current!, sfx.current, {
      stage, up: progRef.current.up,
      onUi: (u) => { if (u.paused !== undefined) setScr((s) => (s === 'play' || s === 'pause') ? (u.paused ? 'pause' : 'play') : s); },
      onEnd: (r) => {
        game.current = null;
        const p = progRef.current; const key = String(stage);
        const next: Prog = { ...p, credits: p.credits + r.credits, unlocked: r.win ? Math.min(STAGES, Math.max(p.unlocked, stage + 1)) : p.unlocked, stars: { ...p.stars, [key]: Math.max(p.stars[key] || 0, r.win ? r.stars : 0) }, best: { ...p.best, [key]: Math.max(p.best[key] || 0, r.score) } };
        saveProg(KEY, next); setProg(next); setRes(r); setScr('result');
      },
    });
  };
  const togglePause = () => game.current?.pause(scr === 'play');
  const quit = () => { game.current?.stop(); game.current = null; setScr('menu'); };
  const buy = (id: string) => {
    const p = progRef.current; const lv = p.up[id] || 0; if (lv >= 5 || p.credits < COST[lv]) return;
    const next = { ...p, credits: p.credits - COST[lv], up: { ...p.up, [id]: lv + 1 } }; saveProg(KEY, next); setProg(next); sfx.current.unlock(); sfx.current.power();
  };
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
  const btn = 'rounded-lg px-4 py-2 text-sm font-black cursor-pointer';
  const cur = res ? res.stage : 1;

  return (
    <GameShell aspect={480 / 720} maxWidth={440} muted={muted} onMute={() => setMuted((m) => !m)} canPause={scr === 'play' || scr === 'pause'} paused={scr === 'pause'} onPause={togglePause}>
      <canvas ref={cv} data-testid="space-canvas" className="absolute inset-0 h-full w-full touch-none bg-black" style={{ cursor: scr === 'play' ? 'none' : 'default' }} onContextMenu={(e) => e.preventDefault()} />
      {scr === 'menu' && (
        <div className="absolute inset-0 z-10 overflow-y-auto bg-slate-950/90 p-3 pt-12 text-white backdrop-blur-sm sm:p-5 sm:pt-12" data-testid="space-menu">
          <div className="mx-auto max-w-xl text-center">
            <div className="text-2xl font-black tracking-widest text-cyan-300">STAR DEFENDER</div>
            <div className="mt-1 text-[11px] text-slate-400">Fly with mouse / finger / WASD · ship fires automatically · Space, B or the 💣 button = bomb · P = pause</div>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs"><span className="rounded-full bg-amber-400/15 px-3 py-1 font-bold text-amber-300">💠 {prog.credits.toLocaleString()} credits</span>
              <button type="button" onClick={() => setTab('missions')} className={`rounded-full px-3 py-1 font-bold cursor-pointer ${tab === 'missions' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>Missions</button>
              <button type="button" data-testid="space-hangar" onClick={() => setTab('hangar')} className={`rounded-full px-3 py-1 font-bold cursor-pointer ${tab === 'hangar' ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>Hangar</button></div>
            {tab === 'missions' ? (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {Array.from({ length: STAGES }, (_, i) => i + 1).map((s) => {
                  const locked = s > prog.unlocked; const boss = BOSS_AT.includes(s); const st = prog.stars[String(s)] || 0;
                  return (
                    <button key={s} type="button" data-testid={`space-stage-${s}`} disabled={locked} onClick={() => start(s)} className={`rounded-xl border p-2 text-center transition ${locked ? 'border-slate-800 bg-slate-900/60 text-slate-600 cursor-not-allowed' : 'border-cyan-500/40 bg-slate-900 hover:border-cyan-300 hover:bg-slate-800 cursor-pointer'}`}>
                      <div className="text-lg font-black">{locked ? '🔒' : boss ? '👾' : s}</div>
                      <div className="text-[10px] uppercase tracking-wider">{boss ? `Boss ${s}` : `Stage ${s}`}</div>
                      <div className="text-[11px] text-amber-300">{locked ? '—' : stars(st)}</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 space-y-2 text-left">
                {UPS.map((u) => { const lv = prog.up[u.id] || 0; const maxed = lv >= 5; const cost = COST[lv]; const can = !maxed && prog.credits >= cost; return (
                  <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5">
                    <div className="text-2xl">{u.icon}</div>
                    <div className="min-w-0 flex-1"><div className="text-sm font-bold">{u.name} <span className="text-[11px] text-cyan-300">{'■'.repeat(lv)}{'□'.repeat(5 - lv)}</span></div><div className="text-[11px] text-slate-400">{u.desc}</div></div>
                    <button type="button" data-testid={`space-buy-${u.id}`} disabled={!can} onClick={() => buy(u.id)} className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-black ${can ? 'bg-amber-400 text-slate-950 cursor-pointer' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>{maxed ? 'MAX' : `💠 ${cost}`}</button>
                  </div>); })}
              </div>
            )}
            <div className="mt-3 text-[11px] text-slate-500">Clear a stage to unlock the next one. Earn credits, upgrade your ship in the Hangar.</div>
          </div>
        </div>
      )}
      {scr === 'pause' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-950/80 text-white backdrop-blur-sm" data-testid="space-paused">
          <div className="text-3xl font-black tracking-widest">PAUSED</div>
          <button type="button" onClick={togglePause} className={`${btn} bg-cyan-400 text-slate-950`}>RESUME</button>
          <button type="button" onClick={quit} className={`${btn} border border-slate-600 text-slate-200`}>QUIT TO MENU</button>
        </div>
      )}
      {scr === 'result' && res && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/88 p-4 text-center text-white backdrop-blur-sm" data-testid="space-result">
          <div className={`text-2xl font-black tracking-widest ${res.win ? 'text-emerald-300' : 'text-rose-300'}`}>{res.win ? 'STAGE CLEAR' : 'SHIP LOST'}</div>
          {res.win && <div className="text-2xl text-amber-300">{stars(res.stars)}</div>}
          <div className="text-3xl font-black">{res.score.toLocaleString()}</div>
          <div className="text-xs text-slate-300">+{res.credits} credits · stage {res.stage}</div>
          {res.win && res.stage === STAGES && <div className="text-xs font-bold text-cyan-300">You beat the whole campaign!</div>}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {res.win && cur < STAGES && <button type="button" onClick={() => start(cur + 1)} className={`${btn} bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950`}>NEXT STAGE</button>}
            <button type="button" onClick={() => start(cur)} className={`${btn} border border-slate-600`}>{res.win ? 'REPLAY' : 'TRY AGAIN'}</button>
            <button type="button" onClick={() => { setTab('hangar'); setScr('menu'); }} className={`${btn} border border-amber-400/50 text-amber-300`}>HANGAR</button>
            <button type="button" onClick={() => { setTab('missions'); setScr('menu'); }} className={`${btn} border border-slate-600`}>MISSIONS</button>
          </div>
        </div>
      )}
    </GameShell>
  );
};

// ───────────────────────── engine ─────────────────────────
type Kind = 'scout' | 'weaver' | 'tank' | 'kami' | 'rock' | 'sniper' | 'boss';
interface Bul { x: number; y: number; vx: number; vy: number; dmg: number; r: number; hue: number }
interface Ene { x: number; y: number; vx: number; vy: number; hp: number; max: number; kind: Kind; r: number; t: number; fire: number; ph: number; spin: number; flash: number; ty: number; hold: number; burst: number }
interface Pow { x: number; y: number; k: 'W' | 'S' | 'B' | 'R' | 'L'; t: number }
interface Par { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; h: number; ring?: boolean }

const sprites = new Map<string, HTMLCanvasElement>();
const mk = (key: string, w: number, h: number, flash: boolean, fn: (g: CanvasRenderingContext2D, flash: boolean) => void) => {
  const k = key + (flash ? '!' : ''); let c = sprites.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d')!; x.scale(2, 2); x.translate(w / 2, h / 2); fn(x, flash); sprites.set(k, c); return c;
};
const glows = new Map<number, HTMLCanvasElement>();
const glow = (h: number) => {
  const k = Math.round(h / 8) * 8; let c = glows.get(k); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d')!; const gr = x.createRadialGradient(32, 32, 1, 32, 32, 32);
  gr.addColorStop(0, `hsla(${k},100%,92%,1)`); gr.addColorStop(0.25, `hsla(${k},100%,65%,.75)`); gr.addColorStop(1, `hsla(${k},100%,50%,0)`); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); glows.set(k, c); return c;
};
const grad = (g: CanvasRenderingContext2D, f: boolean, c1: string, c2: string, r: number) => { const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r * 1.2); gr.addColorStop(0, f ? '#fff' : c1); gr.addColorStop(1, f ? '#fff' : c2); g.fillStyle = gr; };

const spriteFor = (kind: Kind, flash: boolean, variant = 0) => {
  switch (kind) {
    case 'rock': return mk('rock', 84, 84, flash, (g, f) => { grad(g, f, '#b3a595', '#4a413a', 36); g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283, r = 36 * (0.8 + ((i * 7919) % 5) / 17); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(-10, -6, 7, 0, 6.283); g.arc(12, 10, 5, 0, 6.283); g.fill(); });
    case 'scout': return mk('scout', 48, 48, flash, (g, f) => { grad(g, f, '#ff7a7a', '#a3123a', 18); g.beginPath(); g.moveTo(0, 20); g.lineTo(18, -14); g.lineTo(0, -6); g.lineTo(-18, -14); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,200,200,.6)'; g.lineWidth = 1.2; g.stroke(); g.fillStyle = f ? '#fff' : '#ffd166'; g.fillRect(-2, -3, 4, 9); });
    case 'weaver': return mk('weaver', 64, 40, flash, (g, f) => { grad(g, f, '#c18bff', '#5b21b6', 18); g.beginPath(); g.ellipse(0, 0, 19, 10, 0, 0, 6.283); g.fill(); g.fillStyle = f ? '#fff' : '#e9d5ff'; g.beginPath(); g.arc(0, 0, 5, 0, 6.283); g.fill(); g.strokeStyle = f ? '#fff' : 'rgba(200,150,255,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-19, 0); g.lineTo(-28, -9); g.moveTo(19, 0); g.lineTo(28, -9); g.stroke(); });
    case 'kami': return mk('kami', 44, 44, flash, (g, f) => { grad(g, f, '#ffb347', '#c2410c', 15); g.beginPath(); g.moveTo(0, 17); g.lineTo(13, -13); g.lineTo(-13, -13); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-3, -4, 6, 6); });
    case 'tank': return mk('tank', 70, 66, flash, (g, f) => { grad(g, f, '#7dd3a8', '#14532d', 26); g.beginPath(); g.moveTo(-28, -6); g.lineTo(-15, -22); g.lineTo(15, -22); g.lineTo(28, -6); g.lineTo(19, 22); g.lineTo(-19, 22); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = f ? '#fff' : '#052e16'; g.fillRect(-4, 6, 8, 20); g.fillStyle = f ? '#fff' : '#fca5a5'; g.beginPath(); g.arc(0, -6, 6, 0, 6.283); g.fill(); });
    case 'sniper': return mk('sniper', 60, 60, flash, (g, f) => { grad(g, f, '#7dd3fc', '#075985', 20); g.beginPath(); g.moveTo(0, 22); g.lineTo(10, 0); g.lineTo(24, -16); g.lineTo(8, -10); g.lineTo(0, -22); g.lineTo(-8, -10); g.lineTo(-24, -16); g.lineTo(-10, 0); g.closePath(); g.fill(); g.strokeStyle = 'rgba(186,230,253,.7)'; g.lineWidth = 1.2; g.stroke(); g.fillStyle = f ? '#fff' : '#f43f5e'; g.beginPath(); g.arc(0, -2, 5, 0, 6.283); g.fill(); });
    default: { const hues = [['#ff6b9d', '#6d1138', '#fde68a'], ['#a78bfa', '#312e81', '#67e8f9'], ['#fb923c', '#7c2d12', '#fef08a']][variant % 3];
      return mk('boss' + variant, 150, 150, flash, (g, f) => { grad(g, f, hues[0], hues[1], 62); g.beginPath(); g.moveTo(0, 66); g.lineTo(64, 8); g.lineTo(50, -30); g.lineTo(22, -50); g.lineTo(-22, -50); g.lineTo(-50, -30); g.lineTo(-64, 8); g.closePath(); g.fill(); g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 2; g.stroke(); g.fillStyle = f ? '#fff' : hues[2]; g.beginPath(); g.arc(0, -4, 15, 0, 6.283); g.fill(); g.fillStyle = f ? '#fff' : '#7f1d1d'; g.beginPath(); g.arc(0, -4, 6, 0, 6.283); g.fill(); g.fillStyle = f ? '#fff' : hues[2]; g.fillRect(-44, 14, 10, 16); g.fillRect(34, 14, 10, 16); g.strokeStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(-30, 30); g.lineTo(-18, -34); g.moveTo(30, 30); g.lineTo(18, -34); g.stroke(); }); }
  }
};
const shipSprite = () => mk('ship', 72, 64, false, (g) => {
  g.translate(0, 4);
  const body = g.createLinearGradient(-26, 0, 26, 0); body.addColorStop(0, '#5b6b8c'); body.addColorStop(0.5, '#e8f1ff'); body.addColorStop(1, '#5b6b8c');
  g.fillStyle = body; g.beginPath(); g.moveTo(0, -30); g.lineTo(8, -8); g.lineTo(28, 16); g.lineTo(26, 22); g.lineTo(10, 14); g.lineTo(6, 22); g.lineTo(-6, 22); g.lineTo(-10, 14); g.lineTo(-26, 22); g.lineTo(-28, 16); g.lineTo(-8, -8); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,229,255,.9)'; g.lineWidth = 1.4; g.stroke();
  g.fillStyle = '#0ea5e9'; g.beginPath(); g.ellipse(0, -6, 4.5, 10, 0, 0, 6.283); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-1.2, -9, 1.4, 4, 0, 0, 6.283); g.fill();
  g.fillStyle = '#ff3d71'; g.fillRect(-22, 14, 4, 5); g.fillRect(18, 14, 4, 5);
});

function run(canvas: HTMLCanvasElement, sfx: Sfx, cfg: Cfg): Handle {
  const g = canvas.getContext('2d')!;
  const R = Math.random; const rr = (a: number, b: number) => a + R() * (b - a);
  const S = cfg.stage, up = (id: string) => cfg.up[id] || 0;
  const isBossStage = BOSS_AT.includes(S); const bossVar = BOSS_AT.indexOf(S);
  const theme = THEME[(S - 1) % THEME.length];
  const spK = 1 + (S - 1) * 0.09; const goal = isBossStage ? 1 : goalOf(S);
  let dpr = 1, sc = 1, W = 480, HH = H0, offX = 0;
  const maxShield = 100 + up('hull') * 20; const dmgMul = 1 + up('cannon') * 0.12; const fireIv = 0.17 * (1 - up('rate') * 0.06);
  const magnet = up('magnet') ? 60 + up('magnet') * 45 : 0; const regen = up('regen') * 2.2;
  const p = { x: 240, y: 600, tx: 240, ty: 600, shield: maxShield, lives: 3 + (up('hull') >= 4 ? 1 : 0), wpn: 1 + (up('cannon') >= 2 ? 1 : 0) + (up('cannon') >= 4 ? 1 : 0), rapid: 0, bombs: Math.min(6, 1 + up('bombs')), inv: 1.5, fire: 0, tilt: 0, calm: 0 };
  let bullets: Bul[] = [], eb: Bul[] = [], en: Ene[] = [], pw: Pow[] = [], pa: Par[] = [];
  let score = 0, kills = 0, spawnT = 1, banner = 2.4, shake = 0, time = 0, combo = 0, comboT = 0, flash = 0, dead = false, paused = false, ended = false, raf = 0, last = performance.now(), acc = 0, lostLife = false, endT = -1, touchSeen = false, bossSpawned = false, spiral = 0;
  let stars: { x: number; y: number; s: number; v: number }[][] = [];
  // Wahab's gift: appears once per stage when the player is about to lose; double-click / double-tap / Enter clears the screen
  let giftState: 'idle' | 'offer' | 'used' = 'idle', giftT = 0, giftMsg = 0, calmFor = 0, lastTapAt = -1, lastTapX = 0, lastTapY = 0;
  const keys = new Set<string>(); let moveId: number | null = null, lx = 0, ly = 0;
  const music = sfx.startMusic([110, 110, 87.3, 98], 90 + S * 3); void music; sfx.setIntensity(Math.min(1, S / 12));
  const bombBtn = () => ({ x: W - 46, y: HH - 70, r: 30 });

  const resize = () => {
    const cw = Math.max(1, canvas.clientWidth), ch = Math.max(1, canvas.clientHeight); dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    if (cw / ch < 380 / H0) { sc = cw / 380; W = 380; HH = ch / sc; offX = 0; } else { sc = ch / H0; HH = H0; const w = cw / sc; W = Math.min(1600, w); offX = (w - W) / 2; }
    p.x = Math.min(W - 20, Math.max(20, p.x)); p.tx = Math.min(W - 20, Math.max(20, p.tx)); p.y = Math.min(HH - 30, p.y); p.ty = Math.min(HH - 30, p.ty);
    stars = [0, 1, 2].map((l) => Array.from({ length: Math.round((40 + l * 25) * (W / 480)) }, () => ({ x: R() * W, y: R() * HH, s: 0.4 + l * 0.7, v: 25 + l * 55 })));
  };
  resize(); p.x = p.tx = W / 2; p.y = p.ty = HH - 110;
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  const burst = (x: number, y: number, n: number, h: number, sp = 220, size = 3) => { if (pa.length > 420) return; for (let i = 0; i < n; i++) { const a = R() * 6.283, v = rr(sp * 0.2, sp); pa.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rr(0.35, 0.9), max: 0.9, s: rr(size * 0.5, size * 1.6), h: h + rr(-18, 18) }); } };
  const ring = (x: number, y: number, h: number) => pa.push({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, s: 8, h, ring: true });
  const addEne = (k: Kind, x?: number, y?: number) => {
    const e: Ene = { x: x ?? rr(40, W - 40), y: y ?? -40, vx: 0, vy: 0, hp: 1, max: 1, kind: k, r: 18, t: 0, fire: rr(0.8, 2), ph: R() * 6, spin: rr(-1.5, 1.5), flash: 0, ty: 0, hold: 0, burst: 0 };
    if (k === 'scout') { e.vy = rr(110, 160) * spK; e.hp = e.max = 1 + Math.floor(S / 6); }
    if (k === 'weaver') { e.vy = rr(90, 130) * spK; e.hp = e.max = 2 + Math.floor(S / 5); e.r = 17; }
    if (k === 'tank') { e.vy = rr(55, 80) * spK; e.hp = e.max = 6 + S; e.r = 26; }
    if (k === 'kami') { e.vy = 120 * spK; e.hp = e.max = 2; e.r = 15; }
    if (k === 'rock') { e.vy = rr(80, 150) * spK; e.vx = rr(-40, 40); e.r = rr(18, 34); e.hp = e.max = Math.ceil(e.r / 9); }
    if (k === 'sniper') { e.vy = 170; e.hp = e.max = 4 + Math.floor(S / 2); e.r = 20; e.ty = rr(90, 200); e.hold = 6; e.fire = 1.2; }
    if (k === 'boss') { e.x = W / 2; e.y = -90; e.vy = 60; e.hp = e.max = 240 + S * 45; e.r = 62; e.fire = 1.5; }
    en.push(e); return e;
  };
  const spawn = () => {
    const roll = R();
    if (S >= 3 && roll < 0.1) { const n = 5, cx = rr(130, W - 130); for (let i = 0; i < n; i++) addEne('scout', cx + (i - 2) * 46, -40 - Math.abs(i - 2) * 36); return; }
    if (S >= 5 && roll < 0.2) { addEne('sniper'); return; }
    if (roll < 0.3) addEne('rock'); else if (roll < 0.56 || S < 2) addEne('scout'); else if (roll < 0.74) addEne('weaver'); else if (roll < 0.86 && S >= 4) addEne('tank'); else if (S >= 3) addEne('kami'); else addEne('scout');
    if (S >= 6 && R() < 0.25) addEne('scout');
  };
  const drop = (x: number, y: number, chance: number) => { if (R() < chance) pw.push({ x, y, k: R() < 0.04 ? 'L' : (['W', 'S', 'B', 'R', 'S', 'W'] as const)[Math.floor(R() * 6)], t: 0 }); };
  const kill = (e: Ene) => {
    const big = e.kind === 'boss' ? 4 : e.kind === 'tank' ? 2 : e.kind === 'rock' ? e.r / 24 : 1;
    burst(e.x, e.y, Math.round(14 * big + 8), e.kind === 'rock' ? 30 : e.kind === 'boss' ? 45 : 15, 260 * Math.min(2, big), 3 * Math.min(2, big)); ring(e.x, e.y, 40); sfx.boom(big); shake = Math.max(shake, 4 * big);
    combo++; comboT = 2; const pts = ({ scout: 100, weaver: 160, tank: 400, kami: 200, rock: 50, sniper: 300, boss: 5000 } as Record<Kind, number>)[e.kind] * (1 + Math.min(combo, 20) * 0.05); score += Math.round(pts);
    if (e.kind !== 'boss') kills++;
    drop(e.x, e.y, e.kind === 'tank' || e.kind === 'sniper' ? 0.6 : e.kind === 'boss' ? 0 : 0.13);
    if (e.kind === 'rock' && e.r > 24) for (let i = 0; i < 2; i++) { const c = addEne('rock', e.x + (i ? 14 : -14), e.y); c.r = e.r * 0.6; c.hp = c.max = 1; c.vx = i ? 70 : -70; }
    if (e.kind === 'boss') { eb = []; for (let i = 0; i < 6; i++) fxQ.push({ at: time + i * 0.14, fn: () => { burst(e.x + rr(-50, 50), e.y + rr(-40, 40), 26, 20, 300, 4); sfx.boom(2); } }); score += 2000; kills = goal; }
  };
  const fxQ: { at: number; fn: () => void }[] = [];
  const finish = (win: boolean) => {
    if (ended) return; ended = true;
    const stars3 = win ? (!lostLife && p.shield > maxShield * 0.5 ? 3 : !lostLife ? 2 : 1) : 0;
    const credits = Math.floor(score / 25) + (win ? 120 + S * 40 + stars3 * 60 : 0);
    stop(); cfg.onEnd({ win, score, stage: S, stars: stars3, credits });
  };
  const hurt = (d: number) => {
    if (p.inv > 0 || dead || ended) return; p.shield -= d; p.inv = 0.9; p.calm = 0; flash = 0.35; shake = 10; sfx.hurt(); burst(p.x, p.y, 14, 10, 200); combo = 0;
    if (p.shield <= 0) { lostLife = true; p.lives--; burst(p.x, p.y, 50, 20, 340, 4); ring(p.x, p.y, 30); sfx.boom(2); if (p.lives <= 0) { dead = true; sfx.over(); endT = time + 1.2; } else { p.shield = maxShield; p.inv = 2.4; p.wpn = Math.max(1, p.wpn - 1); eb = []; } }
  };
  const bomb = () => { if (p.bombs <= 0 || dead || paused || ended) return; p.bombs--; sfx.bomb(); flash = 0.6; shake = 16; ring(p.x, p.y, 200); eb = []; for (const e of en) { if (e.kind === 'boss') { e.hp -= 30; e.flash = 0.2; } else e.hp = 0; } burst(p.x, p.y, 70, 200, 500, 3); };
  const useGift = () => {
    if (giftState !== 'offer' || dead || paused || ended) return; giftState = 'used'; giftMsg = 4;
    eb = []; for (const e of en) { if (e.kind === 'boss') { e.hp -= e.max * 0.35; e.flash = 0.3; } else { e.r = Math.min(e.r, 20); e.hp = 0; } }
    p.shield = Math.min(maxShield, p.shield + maxShield * 0.5); p.inv = Math.max(p.inv, 2.5); p.calm = 0; flash = 1; shake = 26; sfx.bomb(); sfx.power();
    for (let i = 0; i < 4; i++) fxQ.push({ at: time + i * 0.12, fn: () => { ring(p.x, p.y, 40 + i * 25); burst(p.x, p.y, 60, 40 + i * 30, 620, 4); sfx.boom(2); } });
  };
  const shoot = () => {
    const w = p.wpn; const dmg = dmgMul; const add = (dx: number, vx: number, hue = 185) => bullets.push({ x: p.x + dx, y: p.y - 22, vx, vy: -780, dmg, r: 3.2, hue });
    add(0, 0); if (w >= 2) { add(-9, -30); add(9, 30); } if (w >= 3) { add(-16, -120, 300); add(16, 120, 300); } if (w >= 4) { add(-4, -60, 60); add(4, 60, 60); } if (w >= 5) { add(-24, -210, 330); add(24, 210, 330); }
    sfx.laser(w);
  };
  const aimed = (e: Ene, spd: number, n = 1, spread = 0.18, hue = 350, dmg = 12) => { const a0 = Math.atan2(p.y - e.y, p.x - e.x); for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * spread; eb.push({ x: e.x, y: e.y + 16, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, r: 4.5, hue }); } };

  // input
  const toWorld = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / sc - offX, y: (e.clientY - r.top) / sc, rect: r }; };
  const onDown = (e: PointerEvent) => {
    if (paused || ended) return; const w = toWorld(e);
    if (e.pointerType === 'touch' || e.pointerType === 'pen') touchSeen = true;
    if (e.button === 2) { bomb(); return; }
    const b = bombBtn();
    if (giftState === 'offer') { const nowT = performance.now(); if (lastTapAt > 0 && nowT - lastTapAt < 380 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 70) { lastTapAt = -1; useGift(); return; } lastTapAt = nowT; lastTapX = e.clientX; lastTapY = e.clientY; } if (touchSeen && Math.hypot(w.x - b.x, w.y - b.y) < b.r + 10) { bomb(); return; }
    if (moveId === null) { moveId = e.pointerId; lx = e.clientX; ly = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ } if (e.pointerType === 'mouse') { p.tx = w.x; p.ty = w.y; } }
  };
  const onMove = (e: PointerEvent) => {
    if (paused || ended) return;
    if (e.pointerType === 'mouse') { const w = toWorld(e); p.tx = w.x; p.ty = w.y; return; }
    if (e.pointerId !== moveId) return; p.tx += ((e.clientX - lx) / sc) * 1.25; p.ty += ((e.clientY - ly) / sc) * 1.25; lx = e.clientX; ly = e.clientY;
  };
  const onUp = (e: PointerEvent) => { if (e.pointerId === moveId) moveId = null; };
  const setPaused = (v: boolean) => { if (ended || dead || paused === v) return; paused = v; if (v) { moveId = null; keys.clear(); } last = performance.now(); acc = 0; cfg.onUi({ paused: v }); };
  const onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.type === 'keyup') { keys.delete(e.code); return; }
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.code === 'Enter' || e.code === 'KeyG') { if (!e.repeat) useGift(); } else if (e.code === 'Space' || e.code === 'KeyB') { if (!e.repeat) bomb(); } else if (e.code === 'KeyP' || e.code === 'Escape') { if (!e.repeat) setPaused(!paused); } else keys.add(e.code);
  };
  const onVis = () => { if (document.hidden) setPaused(true); };
  const onBlur = () => setPaused(true);
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', onBlur); document.addEventListener('visibilitychange', onVis);

  const update = (dt: number) => {
    time += dt;
    const ax = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0), ay = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    if (ax || ay) { p.tx += ax * 520 * dt; p.ty += ay * 520 * dt; }
    p.tx = Math.min(W - 20, Math.max(20, p.tx)); p.ty = Math.min(HH - 30, Math.max(60, p.ty));
    const k = 1 - Math.exp(-dt * 14); const ox = p.x; p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.tilt += (((p.x - ox) / Math.max(dt, 0.001)) / 900 - p.tilt) * 0.2;
    p.inv = Math.max(0, p.inv - dt); p.rapid = Math.max(0, p.rapid - dt); p.calm += dt; comboT -= dt; if (comboT <= 0) combo = 0;
    if (regen && p.calm > 3 && !dead) p.shield = Math.min(maxShield, p.shield + regen * dt);
    p.fire -= dt; if (!dead && p.fire <= 0) { shoot(); p.fire = p.rapid > 0 ? fireIv * 0.55 : fireIv; }
    giftMsg = Math.max(0, giftMsg - dt);
    if (giftState === 'offer') { giftT -= dt; if (giftT <= 0) giftState = 'used'; }
    else if (giftState === 'idle' && !dead && time > 6) {
      let near = 0; for (const b of eb) if (Math.hypot(b.x - p.x, b.y - p.y) < 170) near++; for (const e of en) if (Math.hypot(e.x - p.x, e.y - p.y) < 190) near++;
      const lowShield = p.shield < maxShield * 0.4, lastLife = p.lives <= 1, crowded = near >= 9 && p.shield < maxShield * 0.7;
      calmFor = (lowShield && lastLife) || crowded || (lowShield && near >= 4) ? calmFor + dt : 0;
      if (calmFor > 0.6) { giftState = 'offer'; giftT = 10; sfx.power(); }
    }
    banner = Math.max(0, banner - dt); shake = Math.max(0, shake - dt * 30); flash = Math.max(0, flash - dt);
    for (let i = fxQ.length - 1; i >= 0; i--) if (fxQ[i].at <= time) { fxQ[i].fn(); fxQ.splice(i, 1); }
    if (!isBossStage) { if (kills < goal) { spawnT -= dt; if (spawnT <= 0) { spawn(); spawnT = Math.max(0.28, 1.05 - S * 0.05) * rr(0.7, 1.2); } } }
    else if (!bossSpawned && time > 2) { bossSpawned = true; addEne('boss'); sfx.groan?.(); }
    if (isBossStage && bossSpawned && en.some((e) => e.kind === 'boss') && R() < dt * 0.35) addEne(R() < 0.6 ? 'scout' : 'rock');
    if (!ended && !dead && endT < 0 && kills >= goal && (!isBossStage || (bossSpawned && !en.some((e) => e.kind === 'boss')))) { endT = time + 1.6; sfx.levelUp(); score += 500 * S; banner = 3; ring(W / 2, HH / 2, 180); eb = []; }
    if (endT >= 0 && time >= endT) { finish(!dead); return; }
    for (const layer of stars) for (const s of layer) { s.y += s.v * dt * (1 + S * 0.03); if (s.y > HH) { s.y = 0; s.x = R() * W; } }
    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; } bullets = bullets.filter((b) => b.y > -20 && b.x > -20 && b.x < W + 20);
    for (const b of eb) { b.x += b.vx * dt; b.y += b.vy * dt; } eb = eb.filter((b) => b.y < HH + 20 && b.y > -30 && b.x > -30 && b.x < W + 30);
    for (const e of en) {
      e.t += dt; e.flash = Math.max(0, e.flash - dt);
      if (e.kind === 'weaver') e.x += Math.sin(e.t * 3 + e.ph) * 150 * dt * spK;
      if (e.kind === 'kami') { const dx = p.x - e.x; e.x += Math.sign(dx) * Math.min(Math.abs(dx), 120 * spK * dt); e.vy += 40 * dt; }
      if (e.kind === 'rock') { e.x += e.vx * dt; e.ph += e.spin * dt; }
      if (e.kind === 'sniper') {
        if (e.y < e.ty) e.y += e.vy * dt; else if (e.hold > 0) { e.hold -= dt; e.x += Math.sin(e.t * 1.4 + e.ph) * 40 * dt; e.fire -= dt; if (e.fire <= 0) { e.fire = 2.1; e.burst = 3; } if (e.burst > 0) { e.burst -= dt * 6; if (Math.floor(e.burst + dt * 6) !== Math.floor(e.burst)) aimed(e, 300 * Math.min(1.5, spK), 1, 0, 190, 14); } } else e.y += 150 * dt;
      } else if (e.kind === 'boss') {
        if (e.y < 110) e.y += e.vy * dt; e.x = W / 2 + Math.sin(e.t * 0.7) * Math.min(W / 2 - 90, 190); e.fire -= dt;
        const ph = e.hp / e.max < 0.35 ? 2 : e.hp / e.max < 0.7 ? 1 : 0; const rate = Math.max(0.5, 1.3 - S * 0.03 - ph * 0.22);
        if (e.fire <= 0 && e.y > 60) {
          e.fire = rate;
          if (bossVar === 0 || (bossVar === 2 && ph === 0)) { const n = 5 + Math.min(4, S / 3 | 0) + ph * 2; for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.22 + Math.sin(e.t) * 0.2; eb.push({ x: e.x, y: e.y + 40, vx: Math.cos(a) * 200 * spK, vy: Math.sin(a) * 200 * spK, dmg: 12, r: 5, hue: 340 }); } }
          if (bossVar === 1 || (bossVar === 2 && ph >= 1)) { for (let i = 0; i < 6; i++) { const a = spiral + (i / 6) * 6.283; eb.push({ x: e.x, y: e.y + 20, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, dmg: 12, r: 4.5, hue: 270 }); } spiral += 0.45; e.fire = rate * 0.45; }
          if ((bossVar >= 1 && ph >= 1) || ph === 2) { if (R() < 0.5) aimed(e, 260, 3, 0.16, 20, 14); }
          if (bossVar === 2 && ph === 2 && R() < 0.3) addEne('scout', e.x + rr(-60, 60), e.y + 40);
        }
      } else e.y += e.vy * dt;
      if (e.kind === 'tank' || (e.kind === 'weaver' && S >= 4)) { e.fire -= dt; if (e.fire <= 0 && e.y > 30 && e.y < HH - 200) { e.fire = rr(1.3, 2.4) / Math.min(1.8, spK); aimed(e, 230 * spK, 1, 0, 350); } }
    }
    for (const b of bullets) for (const e of en) { if (b.dmg > 0 && e.hp > 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) { e.hp -= b.dmg; b.dmg = 0; e.flash = 0.08; sfx.hit(); burst(b.x, b.y, 2, b.hue, 120, 2); } }
    bullets = bullets.filter((b) => b.dmg > 0);
    for (const e of en) if (e.hp <= 0) kill(e);
    en = en.filter((e) => e.hp > 0 && e.y < HH + 90);
    if (!dead) {
      for (const e of en) if (Math.hypot(p.x - e.x, p.y - e.y) < e.r + 12) { if (e.kind !== 'boss') e.hp = 0; hurt(e.kind === 'boss' ? 30 : 25); }
      for (const b of eb) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 10) { b.y = HH + 99; hurt(b.dmg); }
    }
    for (const e of en) if (e.hp <= 0) kill(e);
    en = en.filter((e) => e.hp > 0);
    for (const o of pw) {
      o.y += 90 * dt; o.t += dt;
      if (!dead && magnet) { const d = Math.hypot(p.x - o.x, p.y - o.y); if (d < magnet && d > 1) { o.x += ((p.x - o.x) / d) * 260 * dt; o.y += ((p.y - o.y) / d) * 260 * dt; } }
      if (!dead && Math.hypot(p.x - o.x, p.y - o.y) < 28) {
        o.y = HH + 99; sfx.power(); burst(o.x, o.y, 12, 120, 180); score += 150;
        if (o.k === 'W') p.wpn = Math.min(5, p.wpn + 1); if (o.k === 'S') p.shield = Math.min(maxShield, p.shield + 45); if (o.k === 'B') p.bombs = Math.min(6, p.bombs + 1); if (o.k === 'R') p.rapid = 9; if (o.k === 'L') p.lives = Math.min(5, p.lives + 1);
      }
    }
    pw = pw.filter((o) => o.y < HH + 40);
    for (const q of pa) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; q.life -= dt; if (q.ring) q.s += 260 * dt; } pa = pa.filter((q) => q.life > 0);
    if (!dead && pa.length < 380 && R() < 0.8) pa.push({ x: p.x + rr(-4, 4), y: p.y + 20, vx: rr(-15, 15), vy: rr(120, 220), life: 0.3, max: 0.3, s: rr(2, 4), h: rr(20, 45) });
  };

  const hsl = (h: number, l = 60, a = 1) => `hsla(${h},100%,${l}%,${a})`;
  const draw = () => {
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#04030f'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0); g.translate(offX, 0);
    g.save(); if (shake) g.translate(rr(-shake, shake) * 0.4, rr(-shake, shake) * 0.4);
    const bg = g.createLinearGradient(0, 0, 0, HH); bg.addColorStop(0, '#04030f'); bg.addColorStop(0.55, `hsl(${theme},55%,9%)`); bg.addColorStop(1, `hsl(${(theme + 40) % 360},60%,14%)`); g.fillStyle = bg; g.fillRect(-offX - 10, -10, W + offX * 2 + 20, HH + 20);
    const nb = g.createRadialGradient(W * 0.25 + Math.sin(time * 0.15) * 30, HH * 0.3, 10, W * 0.25, HH * 0.3, 280); nb.addColorStop(0, hsl(theme, 55, 0.22)); nb.addColorStop(1, hsl(theme, 55, 0)); g.fillStyle = nb; g.fillRect(0, 0, W, HH);
    const nb2 = g.createRadialGradient(W * 0.8, HH * 0.7, 10, W * 0.8, HH * 0.7, 260); nb2.addColorStop(0, hsl(theme + 120, 55, 0.14)); nb2.addColorStop(1, hsl(theme + 120, 55, 0)); g.fillStyle = nb2; g.fillRect(0, 0, W, HH);
    for (const layer of stars) for (const s of layer) { g.fillStyle = `rgba(255,255,255,${0.35 + s.s * 0.25})`; g.fillRect(s.x, s.y, s.s, s.s * (1 + S * 0.1)); }
    g.globalCompositeOperation = 'lighter';
    for (const o of pw) { const c = ({ W: 50, S: 150, B: 20, R: 280, L: 340 })[o.k]; const pr = 30 + Math.sin(o.t * 6) * 4; g.drawImage(glow(c), o.x - pr, o.y - pr, pr * 2, pr * 2); }
    g.globalCompositeOperation = 'source-over';
    for (const o of pw) { const c = ({ W: 50, S: 150, B: 20, R: 280, L: 340 })[o.k]; g.fillStyle = '#0b1020'; g.beginPath(); g.arc(o.x, o.y, 11, 0, 6.283); g.fill(); g.strokeStyle = hsl(c, 60); g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff'; g.font = 'bold 12px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.k === 'L' ? '♥' : o.k, o.x, o.y + 1); }
    for (const e of en) {
      g.save(); g.translate(e.x, e.y); const f = e.flash > 0;
      if (e.kind === 'rock') { g.rotate(e.ph); const sp = spriteFor('rock', f); const s = (e.r / 36) * 84; g.drawImage(sp, -s / 2, -s / 2, s, s); }
      else if (e.kind === 'kami') { g.rotate(Math.atan2(p.y - e.y, p.x - e.x) - Math.PI / 2); const sp = spriteFor('kami', f); g.drawImage(sp, -22, -22, 44, 44); }
      else if (e.kind === 'boss') { const sp = spriteFor('boss', f, Math.max(0, bossVar)); g.drawImage(sp, -75, -75, 150, 150); }
      else { const sp = spriteFor(e.kind, f); g.drawImage(sp, -sp.width / 4, -sp.height / 4, sp.width / 2, sp.height / 2); }
      if (e.kind === 'tank' || e.kind === 'boss' || e.kind === 'sniper' || (e.hp < e.max && e.kind !== 'rock')) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(-e.r, -e.r - 12, e.r * 2, 4); g.fillStyle = e.kind === 'boss' ? '#ff4d6d' : '#7dd3a8'; g.fillRect(-e.r, -e.r - 12, (e.r * 2) * Math.max(0, e.hp / e.max), 4); }
      g.restore();
    }
    g.globalCompositeOperation = 'lighter';
    for (const b of bullets) { const gr = g.createLinearGradient(b.x, b.y - 14, b.x, b.y + 12); gr.addColorStop(0, hsl(b.hue, 70, 0)); gr.addColorStop(0.5, hsl(b.hue, 70, 0.95)); gr.addColorStop(1, hsl(b.hue, 70, 0)); g.fillStyle = gr; g.fillRect(b.x - b.r, b.y - 14, b.r * 2, 26); }
    for (const b of eb) { const s = b.r * 6; g.drawImage(glow(b.hue), b.x - s / 2, b.y - s / 2, s, s); g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y, b.r * 0.5, 0, 6.283); g.fill(); }
    for (const q of pa) { const a = Math.max(0, q.life / q.max); if (q.ring) { g.strokeStyle = hsl(q.h, 70, a * 0.8); g.lineWidth = 3 * a + 1; g.beginPath(); g.arc(q.x, q.y, q.s, 0, 6.283); g.stroke(); } else { g.globalAlpha = a; const s = q.s * (0.4 + a * 0.6) * 4; g.drawImage(glow(q.h), q.x - s / 2, q.y - s / 2, s, s); g.globalAlpha = 1; } }
    g.globalCompositeOperation = 'source-over';
    if (!dead) {
      g.save(); g.translate(p.x, p.y); g.rotate(Math.max(-0.35, Math.min(0.35, p.tilt))); if (p.inv > 0 && Math.floor(p.inv * 14) % 2) g.globalAlpha = 0.45;
      const fl = 16 + R() * 12; g.globalCompositeOperation = 'lighter'; g.drawImage(glow(200), -14, 12, 28, fl * 2); g.globalCompositeOperation = 'source-over';
      const sp = shipSprite(); g.drawImage(sp, -36, -28, 72, 64);
      if (p.inv > 0 || p.shield < 35) { g.strokeStyle = hsl(190, 60, 0.5); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 34, 0, 6.283); g.stroke(); }
      g.restore();
    }
    if (flash > 0) { g.fillStyle = `rgba(255,255,255,${flash * 0.6})`; g.fillRect(-offX - 10, -10, W + offX * 2 + 20, HH + 20); }
    // HUD
    g.textBaseline = 'top'; g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = 'bold 20px system-ui'; g.fillText(score.toLocaleString(), 14, 12);
    g.font = '12px system-ui'; g.fillStyle = '#94a3b8'; g.fillText(isBossStage ? `STAGE ${S} · BOSS` : `STAGE ${S}`, 14, 38);
    if (!isBossStage) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(14, 56, 120, 5); g.fillStyle = hsl(theme, 60); g.fillRect(14, 56, 120 * Math.min(1, kills / goal), 5); }
    if (combo > 2) { g.fillStyle = '#fde047'; g.fillText(`x${combo} combo`, 14, 66); }
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(14, HH - 22, 150, 8); const sg = g.createLinearGradient(14, 0, 164, 0); sg.addColorStop(0, '#22d3ee'); sg.addColorStop(1, '#a78bfa'); g.fillStyle = p.shield < 30 ? '#fb7185' : sg; g.fillRect(14, HH - 22, 150 * Math.max(0, p.shield) / maxShield, 8);
    g.textAlign = 'left'; g.fillStyle = '#e2e8f0'; g.font = '13px system-ui'; g.fillText(`♥ ${p.lives}   💣 ${p.bombs}   ⚡ ${p.wpn}${p.rapid > 0 ? ' R' : ''}`, 14, HH - 46);
    if (touchSeen) { const b = bombBtn(); g.fillStyle = p.bombs ? 'rgba(251,146,60,.35)' : 'rgba(100,116,139,.25)'; g.strokeStyle = p.bombs ? '#fb923c' : '#64748b'; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.283); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '22px system-ui'; g.fillText('💣', b.x, b.y + 1); }
    if (banner > 0) { const a = Math.min(1, banner); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = '900 40px system-ui'; g.fillStyle = `rgba(255,255,255,${a})`; g.shadowColor = '#22d3ee'; g.shadowBlur = 24; g.fillText(endT >= 0 && !dead ? 'STAGE CLEAR' : isBossStage ? `BOSS · STAGE ${S}` : `STAGE ${S}`, W / 2, HH * 0.38); g.shadowBlur = 0; }
    if (giftState === 'offer') {
      const a = 0.75 + Math.sin(time * 8) * 0.25, cx = W / 2, cy = 108; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(30,18,4,.78)'; g.strokeStyle = `rgba(251,191,36,${a})`; g.lineWidth = 2.5; g.shadowColor = '#fbbf24'; g.shadowBlur = 22; g.beginPath(); g.roundRect(cx - 150, cy - 38, 300, 76, 18); g.fill(); g.stroke(); g.shadowBlur = 0;
      g.fillStyle = '#fde68a'; g.font = '800 15px system-ui'; g.fillText('🎁 A GIFT FROM WAHAB', cx, cy - 20);
      g.fillStyle = '#fff'; g.font = '700 14px system-ui'; g.fillText(touchSeen ? 'Double-tap the screen!' : 'Double-click  (or press Enter)!', cx, cy - 1);
      g.fillStyle = '#fcd34d'; g.font = "700 15px 'Noto Nastaliq Urdu','Noto Naskh Arabic',system-ui"; g.fillText(touchSeen ? 'وہاب کا تحفہ — ڈبل ٹیپ کریں' : 'وہاب کا تحفہ — ڈبل کلک کریں', cx, cy + 22);
      g.fillStyle = 'rgba(251,191,36,.9)'; g.fillRect(cx - 130, cy + 34, 260 * Math.max(0, giftT / 10), 2.5);
    }
    if (giftMsg > 0) {
      const k = Math.min(1, giftMsg / 0.8) * Math.min(1, (4 - giftMsg) / 0.25 + 0.2), cx = W / 2, cy = HH * 0.42; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.globalAlpha = k; g.shadowColor = '#f59e0b'; g.shadowBlur = 28; g.fillStyle = '#fff7d6'; g.font = '900 25px system-ui';
      const msg = "Don't worry, Wahab is here with you!"; const parts = W < 460 ? ["Don't worry,", 'Wahab is here with you!'] : [msg];
      parts.forEach((t, i) => g.fillText(t, cx, cy - 18 + i * 30 - (parts.length - 1) * 10));
      g.fillStyle = '#fcd34d'; g.font = "700 26px 'Noto Nastaliq Urdu','Noto Naskh Arabic',system-ui"; g.fillText('فکر نہ کریں، وہاب آپ کے ساتھ ہے!', cx, cy + 42 + (parts.length - 1) * 12); g.shadowBlur = 0; g.globalAlpha = 1;
    }
    g.restore();
  };

  const STEP = 1 / 60;
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop); if (ended) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!paused) { acc += dt; let n = 0; while (acc >= STEP && n < 5) { update(STEP); acc -= STEP; n++; if (ended) return; } if (n === 5) acc = 0; }
    draw();
  };
  raf = requestAnimationFrame(loop);
  function stop() {
    ended = true; cancelAnimationFrame(raf); ro.disconnect();
    canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
    window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', onBlur); document.removeEventListener('visibilitychange', onVis); sfx.stopMusic();
  }
  return { stop, pause: setPaused, bomb, gift: useGift };
}
export default SpaceShooter;
