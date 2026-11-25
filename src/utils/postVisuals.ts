/** HD post graphics drawn on a canvas in the browser (free, no server cost). */
export type VisualFormat = 'portrait' | 'story' | 'square' | 'landscape' | 'thumb';
export const FORMATS: Record<VisualFormat, { w: number; h: number; label: string; for: string }> = {
  portrait: { w: 1080, h: 1350, label: '4:5 HD', for: 'Instagram feed · Facebook' },
  story: { w: 1080, h: 1920, label: '9:16 HD', for: 'TikTok · Reels · Shorts · Stories' },
  square: { w: 1080, h: 1080, label: '1:1 HD', for: 'Any feed' },
  landscape: { w: 1200, h: 630, label: '1.91:1', for: 'Facebook link post' },
  thumb: { w: 1280, h: 720, label: '16:9 HD', for: 'YouTube thumbnail' },
};
export interface CardOpts {
  format: VisualFormat; headline: string; sub?: string; bg?: HTMLImageElement | null; shot?: HTMLImageElement | null;
  index?: number; total?: number; cta?: string; accent?: string; risk?: boolean;
}
const FONT = '"Plus Jakarta Sans","Inter","Segoe UI",system-ui,sans-serif';

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('Image failed to load')); i.src = src; });
}
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const r = Math.max(w / img.width, h / img.height); const iw = img.width * r, ih = img.height * r;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) * 0.3, iw, ih);
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean); const lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxH: number, start: number, weight = 800) {
  for (let size = start; size >= 28; size -= 4) {
    ctx.font = `${weight} ${size}px ${FONT}`; const lines = wrap(ctx, text, maxW);
    if (lines.length * size * 1.12 <= maxH) return { size, lines };
  }
  ctx.font = `${weight} 28px ${FONT}`; return { size: 28, lines: wrap(ctx, text, maxW) };
}

export function renderCard(o: CardOpts): HTMLCanvasElement {
  const { w, h } = FORMATS[o.format]; const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!; const gold = o.accent || '#fbbf24'; const tall = h > w * 1.2; const wide = w > h;
  // background
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#05070d'); g.addColorStop(0.55, '#0b1226'); g.addColorStop(1, '#1a1030'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (o.bg) { ctx.globalAlpha = 0.5; cover(ctx, o.bg, 0, 0, w, h); ctx.globalAlpha = 1; }
  const v = ctx.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(5,7,13,.55)'); v.addColorStop(0.5, 'rgba(5,7,13,.45)'); v.addColorStop(1, 'rgba(5,7,13,.92)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * 0.85, h * 0.1, 10, w * 0.85, h * 0.1, w * 0.7); glow.addColorStop(0, 'rgba(251,191,36,.28)'); glow.addColorStop(1, 'rgba(251,191,36,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  const pad = Math.round(w * 0.075);
  // brand
  ctx.fillStyle = gold; ctx.font = `800 ${Math.round(w * 0.03)}px ${FONT}`; ctx.textBaseline = 'top'; ctx.fillText('PRIMEPIPFX', pad, pad * 0.8);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `600 ${Math.round(w * 0.019)}px ${FONT}`; ctx.fillText('TRADING COMMAND CENTER', pad, pad * 0.8 + w * 0.04);
  if (o.total && o.total > 1) { // progress dots
    const r = 7; for (let i = 0; i < o.total; i++) { ctx.beginPath(); ctx.arc(w - pad - (o.total - 1 - i) * 26, pad * 0.8 + 14, r, 0, 7); ctx.fillStyle = i === (o.index || 0) ? gold : 'rgba(255,255,255,.3)'; ctx.fill(); }
  }
  let top = pad * 2.1;
  // screenshot in a device frame
  if (o.shot) {
    const maxW = wide ? w * 0.42 : w - pad * 2; const maxH = wide ? h - top - pad * 1.5 : h * (tall ? 0.42 : 0.4);
    const r = Math.min(maxW / o.shot.width, maxH / o.shot.height); const sw = o.shot.width * r, sh = o.shot.height * r;
    const sx = wide ? w - pad - sw : (w - sw) / 2; const sy = wide ? top : h - pad * 3.2 - sh - (tall ? h * 0.1 : 0);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; ctx.fillStyle = '#0b1020'; rr(ctx, sx - 14, sy - 14, sw + 28, sh + 28, 34); ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx, sx, sy, sw, sh, 22); ctx.clip(); ctx.drawImage(o.shot, sx, sy, sw, sh); ctx.restore();
    ctx.strokeStyle = 'rgba(251,191,36,.7)'; ctx.lineWidth = 3; rr(ctx, sx - 14, sy - 14, sw + 28, sh + 28, 34); ctx.stroke();
  }
  // headline
  const textW = wide && o.shot ? w * 0.46 - pad : w - pad * 2;
  const hlMaxH = o.shot ? (wide ? h * 0.5 : h * (tall ? 0.24 : 0.2)) : h * (tall ? 0.42 : 0.4);
  const hlTop = o.shot ? top : h * (tall ? 0.3 : 0.26);
  const t = fitText(ctx, o.headline.toUpperCase(), textW, hlMaxH, Math.round(w * (tall ? 0.115 : 0.1)));
  ctx.fillStyle = '#fff'; ctx.font = `800 ${t.size}px ${FONT}`; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 18;
  t.lines.forEach((ln, i) => { ctx.fillStyle = i === t.lines.length - 1 && t.lines.length > 1 ? gold : '#fff'; ctx.fillText(ln, pad, hlTop + i * t.size * 1.12); });
  ctx.shadowBlur = 0;
  let y = hlTop + t.lines.length * t.size * 1.12 + 24;
  if (o.sub) { ctx.fillStyle = 'rgba(226,232,240,.92)'; const f = Math.round(w * 0.034); ctx.font = `600 ${f}px ${FONT}`; wrap(ctx, o.sub, textW).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, pad, y + i * f * 1.35)); }
  // CTA pill + url
  const cta = o.cta || 'primepipfx.site'; const bf = Math.round(w * 0.034); ctx.font = `800 ${bf}px ${FONT}`; const cw = ctx.measureText(cta).width + bf * 2; const cy = h - pad * (o.risk === false ? 1.5 : 2.1) - bf * 1.3;
  ctx.fillStyle = gold; rr(ctx, pad, cy, cw, bf * 2, bf); ctx.fill(); ctx.fillStyle = '#111827'; ctx.textBaseline = 'middle'; ctx.fillText(cta, pad + bf, cy + bf); ctx.textBaseline = 'top';
  if (o.risk !== false) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = `500 ${Math.round(w * 0.0185)}px ${FONT}`; ctx.fillText('Trading carries risk. Educational content, not financial advice.', pad, h - pad * 0.95); }
  return c;
}
export const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Export failed'))), 'image/png'));
export function download(blob: Blob, name: string) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

/** One-tap screen capture of the terminal using the browser's own screen-share picker (nothing is uploaded anywhere). */
export async function captureScreen(): Promise<HTMLImageElement> {
  const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (c?: unknown) => Promise<MediaStream> };
  if (!md?.getDisplayMedia) throw new Error('Screen capture is not supported on this browser. Use "Upload screenshot" instead.');
  const stream = await md.getDisplayMedia({ video: true, audio: false });
  try {
    const v = document.createElement('video'); v.srcObject = stream; v.muted = true; await v.play();
    await new Promise((r) => setTimeout(r, 450));
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d')!.drawImage(v, 0, 0);
    return await loadImage(c.toDataURL('image/png'));
  } finally { stream.getTracks().forEach((t) => t.stop()); }
}
export const fileToImage = (f: File) => loadImage(URL.createObjectURL(f));
