import { FONT, FORMATS, fitText, loadImage, rr, type VisualFormat } from './postVisuals';

/* Brand-locked graphics. Colours, logo, slogan and site come ONLY from Brand memory.
   If the owner has not set something, it is left out rather than invented. */
export type PosterKind = 'poster' | 'quote' | 'infographic' | 'event' | 'story';
export interface BrandLook { name: string; site: string; colors: string[]; logoUrl: string; slogans: string[]; founder?: string }
export interface PosterData { kind: PosterKind; headline: string; sub?: string; items?: string[]; cta?: string; quote?: string; author?: string; date?: string; time?: string; venue?: string; showSlogan?: boolean; eyebrow?: string }
export const RISK = 'Educational content, not financial advice. Trading carries risk.';
export const DEFAULT_LOOK: BrandLook = { name: 'PRIMEPIPFX', site: 'https://primepipfx.site', colors: [], logoUrl: '', slogans: [] };

export function palette(b: BrandLook) { return { bg: b.colors[0] || '#0b1220', accent: b.colors[1] || '#f5c542', ink: b.colors[2] || '#ffffff', custom: b.colors.length > 0 }; }
const hostOf = (site: string) => site.replace(/^https?:\/\//, '');

/** Every word that will appear on the graphic, so the quality gate checks exactly what gets exported. */
export function textFor(d: PosterData, b: BrandLook): string {
  return [d.eyebrow, d.headline, d.sub, d.quote, d.author, d.cta, d.date, d.time, d.venue, ...(d.items || []), d.showSlogan && b.slogans[0] ? b.slogans[0] : '', hostOf(b.site), RISK].filter(Boolean).join('\n');
}

/** Pure: a carousel from one topic. Cover, one slide per real feature, then a call to action. */
export function carouselSlides(topic: { title: string; short: string; features: string[] }, b: BrandLook): PosterData[] {
  const n = topic.features.length;
  return [
    { kind: 'poster', eyebrow: b.name, headline: topic.title, sub: topic.short, cta: 'Swipe →' },
    ...topic.features.slice(0, 7).map((f, i) => ({ kind: 'poster' as const, eyebrow: `${i + 1} of ${n} · ${topic.title}`, headline: f, sub: undefined })),
    { kind: 'poster', eyebrow: b.name, headline: 'See it inside the app', cta: hostOf(b.site) },
  ];
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []; let line = '';
  for (const w of text.split(/\s+/).filter(Boolean)) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

export async function renderGraphic(d: PosterData, b: BrandLook, format: VisualFormat = 'square', logo?: HTMLImageElement | null): Promise<HTMLCanvasElement> {
  const { w, h } = FORMATS[format]; const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d')!;
  const { bg, accent, ink } = palette(b); const pad = Math.round(w * 0.075); const maxW = w - pad * 2;
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, bg); g.addColorStop(1, '#020617'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent; ctx.fillRect(0, 0, w, Math.round(h * 0.012));
  ctx.textBaseline = 'top';
  let y = pad * 1.1;
  if (d.eyebrow) { ctx.fillStyle = accent; ctx.font = `800 ${Math.round(w * 0.028)}px ${FONT}`; ctx.fillText(d.eyebrow.toUpperCase(), pad, y); y += w * 0.07; }
  if (d.kind === 'quote') {
    ctx.fillStyle = accent; ctx.font = `900 ${Math.round(w * 0.24)}px ${FONT}`; ctx.fillText('“', pad, y - w * 0.05); y += w * 0.12;
    const t = fitText(ctx, d.quote || d.headline, maxW, h * 0.5, Math.round(w * 0.072)); ctx.fillStyle = ink; ctx.font = `800 ${t.size}px ${FONT}`;
    t.lines.forEach((ln, i) => ctx.fillText(ln, pad, y + i * t.size * 1.2)); y += t.lines.length * t.size * 1.2 + w * 0.04;
    if (d.author) { ctx.fillStyle = accent; ctx.font = `700 ${Math.round(w * 0.032)}px ${FONT}`; ctx.fillText(`— ${d.author}`, pad, y); }
  } else if (d.kind === 'infographic') {
    const t = fitText(ctx, d.headline.toUpperCase(), maxW, h * 0.18, Math.round(w * 0.065)); ctx.fillStyle = ink; ctx.font = `900 ${t.size}px ${FONT}`;
    t.lines.forEach((ln, i) => ctx.fillText(ln, pad, y + i * t.size * 1.1)); y += t.lines.length * t.size * 1.1 + w * 0.05;
    (d.items || []).slice(0, 5).forEach((it, i) => {
      const r = Math.round(w * 0.04); ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(pad + r, y + r, r, 0, 7); ctx.fill();
      ctx.fillStyle = bg; ctx.font = `900 ${Math.round(r * 1.1)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(i + 1), pad + r, y + r); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillStyle = ink; ctx.font = `700 ${Math.round(w * 0.035)}px ${FONT}`; const ls = wrapLines(ctx, it, maxW - r * 2.8); ls.forEach((ln, j) => ctx.fillText(ln, pad + r * 2.6, y + j * w * 0.045));
      y += Math.max(ls.length, 1) * w * 0.045 + w * 0.05;
    });
  } else {
    const t = fitText(ctx, d.headline.toUpperCase(), maxW, h * 0.32, Math.round(w * (d.kind === 'event' ? 0.07 : 0.085))); ctx.fillStyle = ink; ctx.font = `900 ${t.size}px ${FONT}`;
    t.lines.forEach((ln, i) => ctx.fillText(ln, pad, y + i * t.size * 1.08)); y += t.lines.length * t.size * 1.08 + w * 0.03;
    if (d.sub) { ctx.fillStyle = 'rgba(255,255,255,.82)'; ctx.font = `600 ${Math.round(w * 0.04)}px ${FONT}`; wrapLines(ctx, d.sub, maxW).slice(0, 4).forEach((ln, i) => ctx.fillText(ln, pad, y + i * w * 0.055)); y += Math.min(4, wrapLines(ctx, d.sub, maxW).length) * w * 0.055 + w * 0.04; }
    if (d.kind === 'event') {
      ctx.font = `800 ${Math.round(w * 0.042)}px ${FONT}`; ctx.fillStyle = accent;
      [d.date, d.time, d.venue].filter(Boolean).forEach((v) => { ctx.fillText(String(v), pad, y); y += w * 0.06; });
    }
    if (d.showSlogan && b.slogans[0]) { ctx.fillStyle = accent; ctx.font = `800 ${Math.round(w * 0.034)}px ${FONT}`; ctx.fillText(b.slogans[0], pad, h - pad * 4.6 - w * 0.03); }
  }
  if (d.cta) {
    ctx.font = `800 ${Math.round(w * 0.034)}px ${FONT}`; const tw = ctx.measureText(d.cta).width + w * 0.08; const by = h - pad * 3.7 - w * 0.03;
    ctx.fillStyle = accent; rr(ctx, pad, by, tw, w * 0.07, w * 0.035); ctx.fill(); ctx.fillStyle = bg; ctx.textBaseline = 'middle'; ctx.fillText(d.cta, pad + w * 0.04, by + w * 0.035); ctx.textBaseline = 'top';
  }
  // footer: logo, name, site, risk line (always)
  let fx = pad; const fy = h - pad * 2.6;
  if (logo) { const s = Math.round(w * 0.075); ctx.drawImage(logo, fx, fy - s * 0.1, s, s); fx += s + w * 0.02; }
  ctx.fillStyle = ink; ctx.font = `800 ${Math.round(w * 0.03)}px ${FONT}`; ctx.fillText(`${b.name} · ${hostOf(b.site)}`, fx, fy);
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `500 ${Math.round(w * 0.022)}px ${FONT}`; ctx.fillText(RISK, pad, fy + w * 0.045);
  if (!palette(b).custom) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = `500 ${Math.round(w * 0.02)}px ${FONT}`; ctx.fillText('Default colours (set yours in Brand memory)', pad, fy + w * 0.08); }
  return c;
}

export async function loadLogo(url: string): Promise<HTMLImageElement | null> { if (!url) return null; try { return await loadImage(url); } catch { return null; } }
