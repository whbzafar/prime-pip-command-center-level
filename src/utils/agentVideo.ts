import { renderVariant, type VariantOpts } from './postVisuals';

export interface Scene { opts: VariantOpts; seconds: number }

/** Soft generated background music (no copyright, no download): a slow chord pad with a gentle pulse. Returns a track to mix into the recording, or null. */
function makeMusic(seconds: number): { track: MediaStreamTrack; stop: () => void } | null {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return null;
    const ac: AudioContext = new AC(); const dest = ac.createMediaStreamDestination(); const master = ac.createGain(); master.gain.value = 0; master.connect(dest);
    master.gain.linearRampToValueAtTime(0.16, ac.currentTime + 0.8); master.gain.setValueAtTime(0.16, ac.currentTime + seconds - 1); master.gain.linearRampToValueAtTime(0, ac.currentTime + seconds);
    [110, 164.81, 220, 277.18, 329.63].forEach((f, i) => { const o = ac.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = 0.35 / (i + 1.5); o.connect(g); g.connect(master); o.start(); o.stop(ac.currentTime + seconds + 0.2); });
    const lfo = ac.createOscillator(); lfo.frequency.value = 2; const lg = ac.createGain(); lg.gain.value = 0.04; lfo.connect(lg); lg.connect(master.gain); lfo.start(); lfo.stop(ac.currentTime + seconds + 0.2);
    return { track: dest.stream.getAudioTracks()[0], stop: () => { void ac.close(); } };
  } catch { return null; }
}

/** Renders scenes to a vertical 1080x1920 video (zoom + cross-fades + music) in the browser. Free, nothing uploaded. */
export async function recordScenes(scenes: Scene[], onProgress?: (p: number) => void): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('Video recording is not supported in this browser. Use desktop Chrome or Edge.');
  if (!scenes.length) throw new Error('Nothing to record.');
  const frames = scenes.map((s) => renderVariant({ ...s.opts, format: 'story' }));
  const total = scenes.reduce((a, s) => a + s.seconds, 0);
  const out = document.createElement('canvas'); out.width = 1080; out.height = 1920; const ctx = out.getContext('2d')!;
  const stream = out.captureStream(30); const music = makeMusic(total); if (music) stream.addTrack(music.track);
  const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); });
  const starts: number[] = []; scenes.reduce((a, s) => { starts.push(a); return a + s.seconds; }, 0);
  const fade = 0.4; const t0 = performance.now(); rec.start(250);
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000; if (t >= total) return resolve();
      let i = starts.length - 1; while (i > 0 && t < starts[i]) i--; const local = t - starts[i]; const dur = scenes[i].seconds;
      const draw = (f: HTMLCanvasElement, alpha: number, zt: number) => { const z = 1 + 0.07 * zt; const w = 1080 * z; const h = 1920 * z; ctx.globalAlpha = alpha; ctx.drawImage(f, (1080 - w) / 2, (1920 - h) / 2 - zt * 30, w, h); };
      ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1920); draw(frames[i], 1, local / dur);
      if (local > dur - fade && i + 1 < frames.length) draw(frames[i + 1], (local - (dur - fade)) / fade, 0);
      onProgress?.(t / total); requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop(); const blob = await done; music?.stop(); return blob;
}
