import { renderVariant, type VariantOpts } from './postVisuals';
import type { Shot } from './agentCapture';

/** Builds a vertical (1080x1920) clip for TikTok / Reels / Shorts from real terminal captures: slow zoom, cross-fades, headline per scene. Runs fully in the browser, free, no upload. */
export async function makeVideo(shots: Shot[], base: Omit<VariantOpts, 'layout' | 'shot' | 'shotLabel' | 'format'>, headlines: string[], perScene = 2.6, onProgress?: (p: number) => void): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('Video recording is not supported in this browser. Use desktop Chrome or Edge.');
  if (!shots.length) throw new Error('Capture the terminal first.');
  const frames = shots.map((s, i) => renderVariant({ ...base, format: 'story', layout: 'shot', shot: s.img, shotLabel: s.label, headline: headlines[i % Math.max(1, headlines.length)] || s.label }));
  const out = document.createElement('canvas'); out.width = 1080; out.height = 1920; const ctx = out.getContext('2d')!;
  const stream = out.captureStream(30);
  const mime = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); });
  const fade = 0.45; const total = frames.length * perScene; const t0 = performance.now(); rec.start(250);
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000; if (t >= total) return resolve();
      const i = Math.min(frames.length - 1, Math.floor(t / perScene)); const local = t - i * perScene;
      const draw = (f: HTMLCanvasElement, alpha: number, zt: number) => { const z = 1 + 0.06 * zt; const w = 1080 * z; const h = 1920 * z; ctx.globalAlpha = alpha; ctx.drawImage(f, (1080 - w) / 2, (1920 - h) / 2, w, h); };
      ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1920);
      draw(frames[i], 1, local / perScene);
      if (local > perScene - fade && i + 1 < frames.length) draw(frames[i + 1], (local - (perScene - fade)) / fade, 0);
      onProgress?.(t / total); requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop(); return done;
}
