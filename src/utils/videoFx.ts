/** Video effects library ("skills"): cinematic colour grade, film grain, vignette, light leaks, glitch cuts, camera shake, holographic HUD,
 *  gold dust, parallax glow, lens flare. All are drawn on the recorder's canvas with plain 2D drawing (no download, no cost) and are cheap
 *  enough to keep the frame rate steady. The recorder picks a different set of skills for every take. */
export type SkillId = 'leak' | 'glitch' | 'shake' | 'hud' | 'dust' | 'flare' | 'parallax' | 'scan';
export const GRADES = [
  { name: 'Teal & orange grade', a: 'rgba(0,150,170,.16)', b: 'rgba(255,120,40,.14)' },
  { name: 'Gold HDR grade', a: 'rgba(255,190,60,.12)', b: 'rgba(120,60,0,.14)' },
  { name: 'Cool steel grade', a: 'rgba(60,120,255,.14)', b: 'rgba(0,0,40,.18)' },
  { name: 'Warm cinema grade', a: 'rgba(255,160,90,.12)', b: 'rgba(60,0,80,.16)' },
];
export const SKILL_NAMES: Record<SkillId, string> = { leak: 'Light leaks', glitch: 'Glitch cuts', shake: 'Camera shake on impacts', hud: 'Holographic HUD', dust: 'Gold dust particles', flare: 'Cinematic lens flare', parallax: 'Parallax glow depth', scan: 'Scan-line reveal' };
const ALL: SkillId[] = ['leak', 'glitch', 'shake', 'hud', 'dust', 'flare', 'parallax', 'scan'];

/** Five of the eight skills, a different mix every take; colour grade, grain and vignette are always on. */
export function pickSkills(take: number): { grade: (typeof GRADES)[number]; skills: SkillId[]; labels: string[] } {
  const grade = GRADES[take % GRADES.length]; const start = (take * 3) % ALL.length; const skills = Array.from({ length: 5 }, (_, k) => ALL[(start + k * 3 + (k > 2 ? 1 : 0)) % ALL.length]);
  const uniq = [...new Set(skills)]; for (const s of ALL) { if (uniq.length >= 5) break; if (!uniq.includes(s)) uniq.push(s); }
  return { grade, skills: uniq, labels: [grade.name, 'Film grain', 'Vignette', ...uniq.map((s) => SKILL_NAMES[s])] };
}

export interface FxState { W: number; H: number; U: number; accent: string; t: number; since: number; i: number; kind: string; box: { x: number; y: number; w: number; h: number }; v: CanvasImageSource; shot: { x: number; y: number; w: number; h: number }; take: number; skills: SkillId[]; grade: (typeof GRADES)[number] }

let grain: CanvasPattern | null = null;
function grainPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (grain) return grain; try { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!; const d = g.createImageData(128, 128); for (let k = 0; k < d.data.length; k += 4) { const n = Math.random() * 255; d.data[k] = d.data[k + 1] = d.data[k + 2] = n; d.data[k + 3] = 255; } g.putImageData(d, 0, 0); grain = ctx.createPattern(c, 'repeat'); } catch { grain = null; } return grain;
}
const dust = Array.from({ length: 46 }, (_, k) => ({ x: (k * 97 % 100) / 100, y: (k * 53 % 100) / 100, s: 0.5 + (k % 5) * 0.35, v: 0.012 + (k % 7) * 0.006, p: k * 1.7 }));
const has = (st: FxState, s: SkillId) => st.skills.includes(s);

/** Behind the screen: parallax glow orbs and gold dust drifting at different speeds. */
export function fxBack(ctx: CanvasRenderingContext2D, st: FxState) {
  ctx.save();
  if (has(st, 'parallax')) { ctx.globalCompositeOperation = 'screen'; for (let k = 0; k < 3; k++) { const r = (260 + k * 120) * st.U; const x = st.W * (0.2 + 0.3 * k) + Math.sin(st.t * (0.3 + k * 0.17) + k) * 120 * st.U * (k + 1); const y = st.H * (0.25 + 0.25 * k) + Math.cos(st.t * (0.25 + k * 0.11)) * 90 * st.U * (k + 1); const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, st.accent + '30'); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); } }
  if (has(st, 'dust')) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = st.accent; for (const d of dust) { const y = ((d.y - st.t * d.v) % 1 + 1) % 1; const x = (d.x + Math.sin(st.t * 0.6 + d.p) * 0.02 + 1) % 1; ctx.globalAlpha = 0.25 + 0.25 * Math.sin(st.t * 2 + d.p); ctx.beginPath(); ctx.arc(x * st.W, y * st.H, d.s * 2.2 * st.U, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
}

/** Shake offset for the first moments of each cut (impact), zero otherwise. */
export function fxShake(st: FxState): { x: number; y: number } {
  if (!has(st, 'shake') || st.since > 0.28 || st.i === 0) return { x: 0, y: 0 }; const k = (1 - st.since / 0.28) ** 2 * 9 * st.U; return { x: Math.sin(st.t * 91) * k, y: Math.cos(st.t * 77) * k };
}

/** Inside the screen clip: colour grade, light leak, glitch slices, scan line, HUD, grain. */
export function fxScreen(ctx: CanvasRenderingContext2D, st: FxState) {
  const { x, y, w, h } = st.box; ctx.save();
  // cinematic colour grade (soft light, so the app stays readable)
  ctx.globalCompositeOperation = 'soft-light'; const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, st.grade.a); g.addColorStop(1, st.grade.b); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  if (has(st, 'leak')) { const ph = (st.t * 0.22 + st.take * 0.31) % 1; const lx = x + w * ph; const gr = ctx.createRadialGradient(lx, y + h * 0.2, 0, lx, y + h * 0.2, w * 0.45); gr.addColorStop(0, 'rgba(255,170,60,.22)'); gr.addColorStop(1, 'transparent'); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = gr; ctx.fillRect(x, y, w, h); }
  ctx.globalCompositeOperation = 'source-over';
  if (has(st, 'glitch') && st.since < 0.2 && st.i > 0) { const a = 1 - st.since / 0.2; for (let k = 0; k < 4; k++) { const by = Math.random() * 0.85; const bh = 0.03 + Math.random() * 0.07; const off = (Math.random() - 0.5) * w * 0.12 * a; ctx.drawImage(st.v, st.shot.x, st.shot.y + st.shot.h * by, st.shot.w, st.shot.h * bh, x + off, y + h * by, w, h * bh); } ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.25 * a; ctx.fillStyle = '#ff2a6d'; ctx.fillRect(x - 6 * st.U, y, w, h); ctx.fillStyle = '#05d9e8'; ctx.fillRect(x + 6 * st.U, y, w, h); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  if (has(st, 'scan')) { const sy = y + ((st.t * 0.35) % 1) * h; const sg = ctx.createLinearGradient(0, sy - 40 * st.U, 0, sy + 40 * st.U); sg.addColorStop(0, 'transparent'); sg.addColorStop(0.5, st.accent + '38'); sg.addColorStop(1, 'transparent'); ctx.fillStyle = sg; ctx.fillRect(x, sy - 40 * st.U, w, 80 * st.U); }
  if (has(st, 'hud')) { const L = 46 * st.U; ctx.strokeStyle = st.accent; ctx.lineWidth = 4 * st.U; ctx.globalAlpha = 0.85; for (const [cx, cy, dx, dy] of [[x + 14 * st.U, y + 14 * st.U, 1, 1], [x + w - 14 * st.U, y + 14 * st.U, -1, 1], [x + 14 * st.U, y + h - 14 * st.U, 1, -1], [x + w - 14 * st.U, y + h - 14 * st.U, -1, -1]] as number[][]) { ctx.beginPath(); ctx.moveTo(cx, cy + dy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + dx * L, cy); ctx.stroke(); } ctx.globalAlpha = 0.7; ctx.fillStyle = st.accent; ctx.font = `700 ${16 * st.U}px monospace`; ctx.textBaseline = 'top'; ctx.fillText(`REC ● ${st.t.toFixed(1).padStart(5, '0')}s  ·  PRIMEPIPFX LIVE`, x + 28 * st.U, y + 24 * st.U); ctx.globalAlpha = 1; }
  const gp = grainPattern(ctx); if (gp) { ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.08; ctx.save(); ctx.translate(Math.random() * 128, Math.random() * 128); ctx.fillStyle = gp; ctx.fillRect(x - 128, y - 128, w + 256, h + 256); ctx.restore(); }
  ctx.restore();
}

/** Over the whole frame: vignette, and a cinematic lens flare that sweeps across the opening and the ending. */
export function fxFront(ctx: CanvasRenderingContext2D, st: FxState) {
  ctx.save(); const { W, H } = st; const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'transparent'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (has(st, 'flare') && (st.kind === 'intro' || st.kind === 'outro') && st.since < 1.6) { const p = st.since / 1.6; const fx = W * (-0.1 + 1.2 * p); const fy = H * 0.3; const a = Math.sin(Math.PI * p); ctx.globalCompositeOperation = 'screen'; const rg = ctx.createRadialGradient(fx, fy, 0, fx, fy, 220 * st.U); rg.addColorStop(0, `rgba(255,240,200,${0.8 * a})`); rg.addColorStop(0.3, `rgba(255,170,60,${0.35 * a})`); rg.addColorStop(1, 'transparent'); ctx.fillStyle = rg; ctx.fillRect(fx - 240 * st.U, fy - 240 * st.U, 480 * st.U, 480 * st.U); ctx.globalAlpha = 0.55 * a; ctx.fillStyle = 'rgba(255,220,150,1)'; ctx.fillRect(0, fy - 2 * st.U, W, 4 * st.U); for (let k = 1; k <= 3; k++) { ctx.globalAlpha = 0.25 * a; ctx.fillStyle = k % 2 ? '#7dd3fc' : '#fda4af'; ctx.beginPath(); ctx.arc(fx + (W / 2 - fx) * k * 0.5, fy + (H / 2 - fy) * k * 0.5, (30 + k * 14) * st.U, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
}
