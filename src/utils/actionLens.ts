/** Action lens: while a video is recorded, every real click, selection, typed value and freehand stroke in the app is
 *  captured and drawn on the video (ripple, "Selected: …" label, glowing stroke trail), so viewers SEE what is being done. */
export interface LensEvent { kind: 'tap' | 'draw'; label: string; verb: string; x: number; y: number; at: number; trail?: { x: number; y: number }[] }
export interface Lens { events: LensEvent[]; live: { x: number; y: number }[] | null; stop: () => void }

const clean = (s: string) => s.replace(/\s+/g, ' ').trim().slice(0, 34);
function describe(t: EventTarget | null): { label: string; verb: string } | null {
  let el = t as HTMLElement | null; if (!el || !el.closest) return null;
  const hit = el.closest('button, [role=tab], [role=button], a, label, select, input, textarea, summary, [role=option], [role=menuitem]') as HTMLElement | null; if (hit) el = hit;
  const aria = el.getAttribute?.('aria-label') || el.getAttribute?.('title') || '';
  const text = clean(aria || (el as HTMLInputElement).placeholder || el.innerText || '');
  if (!text || /^[\W_]+$/.test(text)) return null;
  const role = el.getAttribute?.('role') || el.tagName.toLowerCase(); const type = (el as HTMLInputElement).type;
  const verb = role === 'tab' ? 'Opened' : role === 'select' || role === 'option' || type === 'checkbox' || type === 'radio' ? 'Selected' : role === 'input' || role === 'textarea' ? 'Typed in' : role === 'summary' ? 'Expanded' : 'Tapped';
  return { label: text, verb };
}

let current: Lens | null = null;
export const stopActiveLens = () => { try { current?.stop(); } finally { current = null; } };
export function startLens(): Lens {
  stopActiveLens(); const lens: Lens = { events: [], live: null, stop: () => {} };
  const push = (e: LensEvent) => { lens.events.push(e); if (lens.events.length > 40) lens.events.shift(); };
  const onClick = (e: MouseEvent) => { const d = describe(e.target); if (!d) return; push({ kind: 'tap', ...d, x: e.clientX, y: e.clientY, at: performance.now() }); };
  let drag: { x: number; y: number }[] | null = null; let dragEl: HTMLElement | null = null;
  const onDown = (e: PointerEvent) => { const el = e.target as HTMLElement; if (el?.tagName === 'CANVAS' || el?.closest?.('canvas, svg[data-draw], [data-draw]')) { drag = [{ x: e.clientX, y: e.clientY }]; dragEl = el; lens.live = drag; } };
  const onMove = (e: PointerEvent) => { if (drag && drag.length < 400) drag.push({ x: e.clientX, y: e.clientY }); };
  const onUp = () => {
    if (drag && drag.length > 6) { const a = drag[0]; const b = drag[drag.length - 1]; const len = Math.hypot(b.x - a.x, b.y - a.y) + drag.length; if (len > 24) push({ kind: 'draw', label: 'Marking added', verb: 'Drew', x: b.x, y: b.y, at: performance.now(), trail: drag.slice() }); }
    drag = null; dragEl = null; lens.live = null;
  };
  document.addEventListener('click', onClick, true); document.addEventListener('pointerdown', onDown, true); document.addEventListener('pointermove', onMove, true); document.addEventListener('pointerup', onUp, true);
  lens.stop = () => { document.removeEventListener('click', onClick, true); document.removeEventListener('pointerdown', onDown, true); document.removeEventListener('pointermove', onMove, true); document.removeEventListener('pointerup', onUp, true); void dragEl; };
  current = lens; return lens;
}

interface Frame { shot: { x: number; y: number; w: number; h: number }; box: { x: number; y: number; w: number; h: number }; vw: number; vh: number; U: number; accent: string; font: string }
const rrect = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };

/** Draws ripples, the live stroke and the action labels inside the screen box. Call after the screen is drawn, inside its clip. */
export function drawLens(ctx: CanvasRenderingContext2D, lens: Lens, now: number, f: Frame) {
  const map = (cx: number, cy: number) => { const vx = (cx * f.vw) / window.innerWidth; const vy = (cy * f.vh) / window.innerHeight; return { x: f.box.x + ((vx - f.shot.x) / f.shot.w) * f.box.w, y: f.box.y + ((vy - f.shot.y) / f.shot.h) * f.box.h }; };
  const inside = (p: { x: number; y: number }) => p.x >= f.box.x && p.x <= f.box.x + f.box.w && p.y >= f.box.y && p.y <= f.box.y + f.box.h;
  const U = f.U; ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const stroke = (pts: { x: number; y: number }[], a: number) => { if (pts.length < 2) return; ctx.globalAlpha = a; ctx.shadowColor = f.accent; ctx.shadowBlur = 18 * U; ctx.strokeStyle = f.accent; ctx.lineWidth = 6 * U; ctx.beginPath(); pts.forEach((q, i) => { const m = map(q.x, q.y); if (i) ctx.lineTo(m.x, m.y); else ctx.moveTo(m.x, m.y); }); ctx.stroke(); ctx.shadowBlur = 0; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * U; ctx.stroke(); };
  if (lens.live) stroke(lens.live, 1);
  for (const e of lens.events) {
    const age = (now - e.at) / 1000; if (age < 0 || age > 3) continue;
    if (e.kind === 'draw' && e.trail && age < 2.2) stroke(e.trail, Math.max(0, 1 - Math.max(0, age - 1.4) / 0.8));
    const p = map(e.x, e.y); if (age < 0.8 && inside(p)) { const t = age / 0.8; ctx.globalAlpha = 1 - t; ctx.shadowBlur = 0; ctx.strokeStyle = f.accent; ctx.lineWidth = 5 * U; ctx.beginPath(); ctx.arc(p.x, p.y, (18 + 70 * t) * U, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 8 * U * (1 - t * 0.5), 0, Math.PI * 2); ctx.fill(); }
  }
  // labels: the two newest actions, sliding up from the bottom of the screen
  const recent = lens.events.filter((e) => (now - e.at) / 1000 < 2.6).slice(-2); ctx.shadowBlur = 0;
  recent.forEach((e, k) => {
    const age = (now - e.at) / 1000; const inT = Math.min(1, age / 0.25); const outT = Math.min(1, Math.max(0, (2.6 - age) / 0.35)); const a = Math.min(inT, outT);
    const text = `${e.verb}: ${e.label}`; ctx.font = `800 ${28 * U}px ${f.font}`; const tw = ctx.measureText(text).width + 64 * U; const h = 54 * U; const x = f.box.x + 24 * U; const y = f.box.y + f.box.h - (84 + (recent.length - 1 - k) * 66) * U + (1 - inT) * 24 * U;
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(2,6,23,.88)'; rrect(ctx, x, y, Math.min(tw, f.box.w - 48 * U), h, h / 2); ctx.fill(); ctx.fillStyle = f.accent; ctx.beginPath(); ctx.arc(x + 28 * U, y + h / 2, 9 * U, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 48 * U, y + h / 2 + 1); ctx.textBaseline = 'top';
  });
  ctx.restore();
}
