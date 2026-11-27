import { PACKS } from '../data/urduPack';

export type PublishPlatform = 'youtube' | 'tiktok' | 'instagram' | 'facebook';
export interface PlatformMeta { platform: PublishPlatform; title: string; description: string; hashtags: string[]; }
const SITE = 'https://primepipfx.site';
const BASE_TAGS = ['PrimePipFX', 'Forex', 'Trading', 'XAUUSD', 'Gold', 'ForexPakistan', 'TradingUrdu', 'SmartMoney'];

/** Titles, descriptions and hashtags for each platform, written from the category's own narration. */
export function metaFor(category: string, title: string): PlatformMeta[] {
  const pack = PACKS[category];
  const hook = pack?.hook[0] || `${title} — PrimePipFX`;
  const feats = (pack?.parts || []).map((p) => p[0]);
  const bullets = (pack?.parts || []).map((p) => `• ${p[0]}: ${p[1]}`).join('\n');
  const tag = (extra: string[]) => [...new Set([...extra, ...BASE_TAGS])];
  const catTag = title.replace(/[^A-Za-z0-9]+/g, '');
  const cta = `Link bio mein hai: ${SITE}`;
  const yt: PlatformMeta = { platform: 'youtube', title: `${hook} | ${title} (Urdu) #Shorts`.slice(0, 98),
    description: `${hook}\n\n${title} — PrimePipFX Command Center mein ye sab kuch milta hai:\n${bullets}\n\n${cta}\n\n${tag([catTag, 'Shorts']).map((t) => '#' + t).join(' ')}`, hashtags: tag([catTag, 'Shorts']) };
  const tt: PlatformMeta = { platform: 'tiktok', title: hook.slice(0, 90), description: `${hook} ${feats.slice(0, 3).join(' • ')} 👉 ${SITE} ${tag([catTag, 'fyp', 'foryou']).slice(0, 7).map((t) => '#' + t).join(' ')}`.slice(0, 2150), hashtags: tag([catTag, 'fyp', 'foryou']) };
  const ig: PlatformMeta = { platform: 'instagram', title: hook, description: `${hook}\n\n${feats.map((f) => '✅ ' + f).join('\n')}\n\n${cta} (link bio mein)\n\n${tag([catTag, 'Reels', 'Explore']).map((t) => '#' + t).join(' ')}`, hashtags: tag([catTag, 'Reels', 'Explore']) };
  const fb: PlatformMeta = { platform: 'facebook', title: hook, description: `${hook}\n\n${bullets}\n\n${cta}\n\n${tag([catTag]).slice(0, 6).map((t) => '#' + t).join(' ')}`, hashtags: tag([catTag]) };
  return [yt, tt, ig, fb];
}

/** A scroll-stopping cover frame: a sharp frame from the video, a dark gradient and the hook in big type. */
export async function makeThumbnail(video: Blob, headline: string, atFraction = 0.42): Promise<Blob> {
  const url = URL.createObjectURL(video); const v = document.createElement('video'); v.muted = true; v.src = url; v.playsInline = true;
  await new Promise<void>((res, rej) => { v.onloadedmetadata = () => res(); v.onerror = () => rej(new Error('video unreadable')); });
  v.currentTime = Math.max(0.1, (v.duration || 30) * atFraction); await new Promise<void>((res) => { v.onseeked = () => res(); });
  const W = v.videoWidth || 1080; const H = v.videoHeight || 1920; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d')!;
  g.drawImage(v, 0, 0, W, H);
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, 'rgba(5,8,20,.88)'); grad.addColorStop(0.45, 'rgba(5,8,20,.15)'); grad.addColorStop(1, 'rgba(5,8,20,.9)'); g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const fs = Math.round(Math.min(W, H) * (W > H ? 0.1 : 0.085)); g.font = `900 ${fs}px Inter, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'top';
  const words = headline.toUpperCase().split(/\s+/); const lines: string[] = []; let cur = '';
  for (const w of words) { const t = (cur + ' ' + w).trim(); if (g.measureText(t).width > W * 0.88 && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
  lines.slice(0, 4).forEach((ln, i) => { g.lineWidth = fs * 0.14; g.strokeStyle = '#000'; g.strokeText(ln, W / 2, H * 0.06 + i * fs * 1.08); g.fillStyle = i === lines.length - 1 || i === 3 ? '#FACC15' : '#fff'; g.fillText(ln, W / 2, H * 0.06 + i * fs * 1.08); });
  g.font = `800 ${Math.round(fs * 0.5)}px Inter, Arial, sans-serif`; g.fillStyle = '#FACC15'; g.fillText('PRIMEPIPFX.SITE  •  LINK IN BIO', W / 2, H * 0.92);
  URL.revokeObjectURL(url);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('thumbnail failed'))), 'image/jpeg', 0.92));
}
