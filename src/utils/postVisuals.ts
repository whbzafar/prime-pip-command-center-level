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

// ---------- Quick Post: varied layouts, themes and optional free AI artwork ----------
export type Layout = 'hero' | 'chart' | 'features' | 'quote';
export const LAYOUTS: Layout[] = ['hero', 'chart', 'features', 'quote'];
export const THEMES = [
  { name: 'Gold', a: '#fbbf24', b: '#f97316', up: '#34d399', dn: '#f87171', bg0: '#05070d', bg1: '#161028' },
  { name: 'Neon', a: '#22d3ee', b: '#a78bfa', up: '#4ade80', dn: '#fb7185', bg0: '#030712', bg1: '#0b1a33' },
  { name: 'Royal', a: '#c4b5fd', b: '#f472b6', up: '#5eead4', dn: '#fda4af', bg0: '#0a0618', bg1: '#241046' },
  { name: 'Emerald', a: '#34d399', b: '#fbbf24', up: '#6ee7b7', dn: '#fca5a5', bg0: '#04100d', bg1: '#0a2a22' },
];
export type Theme = (typeof THEMES)[number];
export const FEATURES: { icon: string; label: string }[] = [
  { icon: '🎯', label: 'Which pair to trade' }, { icon: '📊', label: 'Fundamental data' }, { icon: '⏪', label: 'Backtesting & replay' },
  { icon: '📈', label: 'Unlimited charts' }, { icon: '⭐', label: 'Premium TradingView' }, { icon: '✏️', label: 'Freehand canvas' },
  { icon: '🧠', label: 'Psychology center' }, { icon: '🤝', label: 'Student community' },
];
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function drawCandles(ctx: CanvasRenderingContext2D, w: number, h: number, th: Theme, r: () => number) {
  const n = 26; const cw = w / n; let price = h * 0.62; const top = h * 0.12;
  ctx.save(); ctx.globalAlpha = 0.55;
  for (let i = 0; i < n; i++) {
    const open = price; const move = (r() - 0.46) * h * 0.075; const close = Math.max(top, Math.min(h * 0.9, open - move));
    const hi = Math.min(open, close) - r() * h * 0.03; const lo = Math.max(open, close) + r() * h * 0.03; price = close;
    const up = close < open; ctx.strokeStyle = ctx.fillStyle = up ? th.up : th.dn; ctx.lineWidth = Math.max(2, cw * 0.08);
    const x = i * cw + cw / 2; ctx.beginPath(); ctx.moveTo(x, hi); ctx.lineTo(x, lo); ctx.stroke();
    ctx.fillRect(x - cw * 0.3, Math.min(open, close), cw * 0.6, Math.max(4, Math.abs(open - close)));
  }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = th.a; ctx.globalAlpha = 0.35; ctx.lineWidth = 3; ctx.setLineDash([10, 14]);
  for (const f of [0.3, 0.5, 0.7]) { ctx.beginPath(); ctx.moveTo(0, h * f); ctx.lineTo(w, h * f); ctx.stroke(); } ctx.restore();
}
export interface VariantOpts { format: VisualFormat; layout: Layout; theme: number; seed: number; headline: string; sub?: string; slides: string[]; features?: { icon: string; label: string }[]; art?: HTMLImageElement | null; hero?: HTMLImageElement | null; cta?: string }

export function renderVariant(o: VariantOpts): HTMLCanvasElement {
  const th = THEMES[o.theme % THEMES.length];
  if (o.layout === 'hero') return renderCard({ format: o.format, headline: o.headline, sub: o.sub, bg: o.art || o.hero || null, accent: th.a, cta: o.cta });
  const { w, h } = FORMATS[o.format]; const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d')!; const r = rng(o.seed); const tall = h > w * 1.2; const pad = Math.round(w * 0.075);
  const g = ctx.createLinearGradient(0, 0, w * 0.4, h); g.addColorStop(0, th.bg0); g.addColorStop(1, th.bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (o.art) { ctx.globalAlpha = 0.55; cover(ctx, o.art, 0, 0, w, h); ctx.globalAlpha = 1; } else if (o.layout === 'chart' || o.layout === 'quote') drawCandles(ctx, w, h, th, r);
  const v = ctx.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(0,0,0,.5)'); v.addColorStop(0.45, 'rgba(0,0,0,.3)'); v.addColorStop(1, 'rgba(0,0,0,.88)'); ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * (0.2 + r() * 0.6), h * 0.15, 10, w * 0.5, h * 0.2, w * 0.8); glow.addColorStop(0, th.a + '40'); glow.addColorStop(1, th.a + '00'); ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'top'; ctx.fillStyle = th.a; ctx.font = `800 ${Math.round(w * 0.03)}px ${FONT}`; ctx.fillText('PRIMEPIPFX', pad, pad * 0.8);
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `600 ${Math.round(w * 0.019)}px ${FONT}`; ctx.fillText('TRADING COMMAND CENTER', pad, pad * 0.8 + w * 0.04);
  const cta = o.cta || 'primepipfx.site';
  const footer = () => {
    const bf = Math.round(w * 0.034); ctx.font = `800 ${bf}px ${FONT}`; const cw = ctx.measureText(cta).width + bf * 2; const cy = h - pad * 2.1 - bf * 1.3;
    const gg = ctx.createLinearGradient(pad, 0, pad + cw, 0); gg.addColorStop(0, th.a); gg.addColorStop(1, th.b); ctx.fillStyle = gg; rr(ctx, pad, cy, cw, bf * 2, bf); ctx.fill();
    ctx.fillStyle = '#111827'; ctx.textBaseline = 'middle'; ctx.fillText(cta, pad + bf, cy + bf); ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = `500 ${Math.round(w * 0.0185)}px ${FONT}`; ctx.fillText('Trading carries risk. Educational content, not financial advice.', pad, h - pad * 0.95);
  };
  if (o.layout === 'features') {
    const feats = (o.features && o.features.length ? o.features : FEATURES).slice(0, 6);
    const t = fitText(ctx, o.headline.toUpperCase(), w - pad * 2, h * (tall ? 0.2 : 0.22), Math.round(w * 0.09));
    ctx.font = `800 ${t.size}px ${FONT}`; t.lines.forEach((ln, i) => { ctx.fillStyle = i === t.lines.length - 1 && t.lines.length > 1 ? th.a : '#fff'; ctx.fillText(ln, pad, pad * 2.1 + i * t.size * 1.12); });
    const gridTop = pad * 2.1 + t.lines.length * t.size * 1.12 + 30; const cols = 2; const rows = Math.ceil(feats.length / cols); const gap = 22;
    const tw = (w - pad * 2 - gap) / cols; const th2 = Math.min(tw * 0.62, (h - gridTop - pad * 3.7 - gap * (rows - 1)) / rows);
    feats.forEach((f, i) => {
      const x = pad + (i % cols) * (tw + gap); const y = gridTop + Math.floor(i / cols) * (th2 + gap);
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 24; ctx.fillStyle = 'rgba(255,255,255,.08)'; rr(ctx, x, y, tw, th2, 28); ctx.fill(); ctx.restore();
      ctx.strokeStyle = th.a + '88'; ctx.lineWidth = 2.5; rr(ctx, x, y, tw, th2, 28); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `${Math.round(th2 * 0.34)}px ${FONT}`; ctx.fillText(f.icon, x + 26, y + th2 * 0.14);
      ctx.font = `700 ${Math.round(w * 0.033)}px ${FONT}`; ctx.fillStyle = '#fff'; wrap(ctx, f.label, tw - 52).slice(0, 2).forEach((ln, k) => ctx.fillText(ln, x + 26, y + th2 * 0.58 + k * w * 0.04));
    });
    footer(); return c;
  }
  if (o.layout === 'quote') {
    ctx.fillStyle = th.a; ctx.font = `800 ${Math.round(w * 0.3)}px Georgia,serif`; ctx.globalAlpha = 0.35; ctx.fillText('“', pad * 0.7, h * 0.14); ctx.globalAlpha = 1;
  }
  const t = fitText(ctx, o.headline.toUpperCase(), w - pad * 2, h * (tall ? 0.4 : 0.42), Math.round(w * (tall ? 0.118 : 0.105)));
  const top = h * (tall ? 0.28 : 0.24); ctx.font = `800 ${t.size}px ${FONT}`; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 20;
  t.lines.forEach((ln, i) => { ctx.fillStyle = i === t.lines.length - 1 && t.lines.length > 1 ? th.a : '#fff'; ctx.fillText(ln, pad, top + i * t.size * 1.12); }); ctx.shadowBlur = 0;
  let y = top + t.lines.length * t.size * 1.12 + 26;
  const pts = o.slides.slice(0, 3);
  if (o.layout === 'chart' && pts.length) { ctx.font = `700 ${Math.round(w * 0.036)}px ${FONT}`; pts.forEach((s, i) => { ctx.fillStyle = th.a; ctx.fillText('▲', pad, y + i * w * 0.07); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillText(s, pad + w * 0.06, y + i * w * 0.07); }); }
  else if (o.sub) { ctx.fillStyle = 'rgba(226,232,240,.92)'; const f = Math.round(w * 0.036); ctx.font = `600 ${f}px ${FONT}`; wrap(ctx, o.sub, w - pad * 2).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, pad, y + i * f * 1.35)); }
  footer(); return c;
}

/** Free AI artwork (Pollinations: no key, no cost). Returns null if the service is slow or down so the post still works. */
export async function aiArt(prompt: string, w: number, h: number, seed: number): Promise<HTMLImageElement | null> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${Math.min(w, 1080)}&height=${Math.min(h, 1920)}&nologo=true&seed=${seed}&model=flux`;
  try { return await Promise.race([loadImage(url), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 40000))]); } catch { return null; }
}
export const ART_PROMPTS: Record<string, string> = {
  founder: 'lone determined man walking toward a glowing sunrise over mountains, cinematic, golden hour, inspirational, no text',
  'all-in-one': 'futuristic holographic trading dashboard with glowing candlestick charts, dark navy and gold, cinematic lighting, no text',
  fundamentals: 'abstract glowing world map with currency flows, dark blue, gold light trails, cinematic, no text',
  backtesting: 'glowing timeline of candlestick charts rewinding with motion trails, dark background, neon gold, no text',
  discipline: 'calm focused trader silhouette at a desk with glowing monitors at night, moody cinematic, no text',
  sbt: 'abstract geometric market structure lines with golden liquidity zones on dark background, futuristic, no text',
  community: 'group of diverse students collaborating around glowing screens, warm light, modern, no text',
  'coming-soon': 'sleek rocket of light rising above a digital city skyline, dark blue and gold, cinematic, no text',
};
