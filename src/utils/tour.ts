import { FONT, fitText, rr, THEMES } from './postVisuals';
import { go, lockedNotice, openScreen, sleep, SLOW, waitCalm } from './agentCapture';
import { getStoredToken } from './authClient';

/* Live tour video: the agent opens a real feature of the running app, records its live pixels, and edits them
   into a vertical 1080x1920 video: kinetic hook, word-by-word captions (Roman Urdu), a female Pakistani Urdu
   voice-over (server voice), transitions, zoom and pan on the real screen, music, progress and a call to action. */

export interface TourScene { say: string; caption: string; focus: 'left' | 'center' | 'right'; zoom: number; scroll: number; urdu?: string }
export interface TourScript { hook: string; hookUrdu?: string; scenes: TourScene[]; cta: string; ctaUrdu?: string }
export interface TourOpts { tab: string; title: string; script: TourScript; theme: number; voice: boolean; voiceLang?: 'ur' | 'en'; returnTab?: string; onProgress?: (p: number, label: string) => void }
export const tourStore: { videos: Record<string, { blob: Blob; title: string; at: number }>; running: boolean } = { videos: {}, running: false };
type Kind = 'hook' | 'body' | 'cta';

const wordsOf = (s: string) => s.split(/\s+/).filter(Boolean);
const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export const RECORD_BITRATE = 12_000_000;

/** Voice-over from the server (Azure Uzma when configured, otherwise the free fallback). Returns null if unavailable. */
async function voiceFor(ac: AudioContext, text: string, lang: 'ur' | 'en'): Promise<AudioBuffer | null> {
  try {
    const t = getStoredToken();
    const r = await fetch('/api/admin/social-brain/tts', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ text, lang }) });
    if (!r.ok) return null;
    return await ac.decodeAudioData(await r.arrayBuffer());
  } catch { return null; }
}

function music(ac: AudioContext, dest: AudioNode, seconds: number) {
  const master = ac.createGain(); master.gain.value = 0; master.connect(dest); const t = ac.currentTime;
  master.gain.linearRampToValueAtTime(0.07, t + 0.6); master.gain.setValueAtTime(0.07, t + seconds - 1); master.gain.linearRampToValueAtTime(0, t + seconds);
  [110, 164.81, 220, 277.18, 329.63].forEach((f, i) => { const o = ac.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = 0.3 / (i + 1.5); o.connect(g); g.connect(master); o.start(t); o.stop(t + seconds + 0.2); });
  const lfo = ac.createOscillator(); lfo.frequency.value = 2; const lg = ac.createGain(); lg.gain.value = 0.02; lfo.connect(lg); lg.connect(master.gain); lfo.start(t); lfo.stop(t + seconds + 0.2);
}

/** Records one real tour of a feature. With a shared screen (from openScreen), many tours can run after one permission click. */
export async function recordTour(o: TourOpts, shared?: { video: HTMLVideoElement }): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('Video recording is not supported in this browser. Use desktop Chrome or Edge.');
  const own = shared ? null : await openScreen(); const v = shared?.video || own!.video; tourStore.running = true;
  const lang = o.voiceLang || 'ur';
  try {
    go(o.tab); await sleep(1400); window.scrollTo(0, 0); const calm = await waitCalm(v, SLOW[o.tab] || 6500);
    if (lockedNotice()) throw new Error(`“${o.title}” is locked for this account, so it cannot be recorded.`);
    if (!calm) await sleep(1200);
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext; const ac: AudioContext = new AC(); if (ac.state === 'suspended') await ac.resume();
    const adest = ac.createMediaStreamDestination();
    type Sc = TourScene & { seconds: number; voice: AudioBuffer | null; kind: Kind };
    const scenes: Sc[] = []; let silent = 0;
    const mk = async (s: TourScene, kind: Kind, line?: string) => {
      const voice = o.voice && line ? await voiceFor(ac, line, lang) : null;
      if (o.voice && !voice) silent++;
      const base = Math.max(kind === 'hook' ? 2.4 : 2.6, wordsOf(s.say).length / 2.6 + 0.7);
      scenes.push({ ...s, kind, voice, seconds: voice ? Math.max(base * 0.8, voice.duration + 0.5) : base });
      o.onProgress?.(0, `Voice-over ${scenes.length}/${o.script.scenes.length + 2}`);
    };
    await mk({ say: o.script.hook, caption: o.script.hook, focus: 'center', zoom: 1, scroll: 0 }, 'hook', lang === 'ur' ? o.script.hookUrdu : o.script.hook);
    for (const s of o.script.scenes) await mk(s, 'body', lang === 'ur' ? s.urdu : s.say);
    await mk({ say: o.script.cta, caption: 'primepipfx.site', focus: 'center', zoom: 1, scroll: 0 }, 'cta', lang === 'ur' ? o.script.ctaUrdu : o.script.cta);
    const total = scenes.reduce((a, s) => a + s.seconds, 0); const starts: number[] = []; scenes.reduce((a, s) => { starts.push(a); return a + s.seconds; }, 0);

    const out = document.createElement('canvas'); out.width = 1080; out.height = 1920; const ctx = out.getContext('2d')!; const th = THEMES[o.theme % THEMES.length];
    const small = document.createElement('canvas'); small.width = 54; small.height = 96; const sctx = small.getContext('2d')!;
    const stream = out.captureStream(30); stream.addTrack(adest.stream.getAudioTracks()[0]);
    const mime = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: RECORD_BITRATE });
    const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const finished = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); });

    const BOX = { x: 60, y: 500, w: 960, h: 1000 };
    const cropFor = (s: TourScene) => {
      const vw = v.videoWidth; const vh = v.videoHeight; const cw = Math.min(vw, vh * (BOX.w / BOX.h)) / Math.max(1, s.zoom); const ch = cw * (BOX.h / BOX.w);
      const fx = s.focus === 'left' ? 0 : s.focus === 'right' ? 1 : 0.5; const x = (vw - cw) * fx; const y = Math.min(vh - ch, Math.max(0, (vh - ch) * (s.scroll * 0.6)));
      return { x, y, w: cw, h: ch };
    };
    let cur = cropFor(scenes[0]); let prev = cur; let lastScene = -1; let flashAt = -10; const t0 = ac.currentTime; music(ac, adest, total);
    scenes.forEach((s, i) => { if (s.voice) { const src = ac.createBufferSource(); src.buffer = s.voice; src.connect(adest); src.start(t0 + starts[i] + 0.15); } });
    rec.start(250); const start = performance.now();
    await new Promise<void>((resolve) => {
      const tick = () => {
        const t = (performance.now() - start) / 1000; if (t >= total) return resolve();
        let i = scenes.length - 1; while (i > 0 && t < starts[i]) i--; const sc = scenes[i]; const local = t - starts[i];
        if (i !== lastScene) { lastScene = i; flashAt = t; prev = cur; if (sc.kind === 'body' && sc.scroll > 0) { const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight); window.scrollTo({ top: max * sc.scroll, behavior: 'smooth' }); } if (sc.kind === 'cta') window.scrollTo({ top: 0, behavior: 'smooth' }); }
        const tgt = cropFor(sc); const k = ease(local / 0.7); const drift = 1 + 0.04 * (local / sc.seconds);
        cur = { x: prev.x + (tgt.x - prev.x) * k, y: prev.y + (tgt.y - prev.y) * k, w: (prev.w + (tgt.w - prev.w) * k) / drift, h: (prev.h + (tgt.h - prev.h) * k) / drift };
        // backdrop: blurred live screen + brand tint
        const g = ctx.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, th.bg0); g.addColorStop(1, th.bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
        sctx.drawImage(v, 0, 0, 54, 96); ctx.globalAlpha = 0.35; ctx.drawImage(small, 0, 0, 1080, 1920); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(2,6,23,.62)'; ctx.fillRect(0, 0, 1080, 1920);
        // header
        ctx.textBaseline = 'top'; ctx.font = `800 34px ${FONT}`; ctx.fillStyle = th.a; ctx.fillText('PRIMEPIPFX', 60, 60); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `600 22px ${FONT}`; ctx.fillText(o.title.toUpperCase(), 60, 104);
        // kinetic caption (Roman Urdu / English)
        const pop = easeOut(local / 0.35); const big = sc.kind === 'hook';
        ctx.save(); ctx.translate(540, big ? 330 : 280); ctx.scale(0.9 + 0.1 * pop, 0.9 + 0.1 * pop); ctx.globalAlpha = pop; ctx.translate(-540, big ? -330 : -280);
        const fit = fitText(ctx, sc.caption.toUpperCase(), 940, big ? 320 : 200, big ? 118 : 92); ctx.font = `900 ${fit.size}px ${FONT}`; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 24;
        const blockH = fit.lines.length * fit.size * 1.1; const y0 = (big ? 330 : 280) - blockH / 2;
        fit.lines.forEach((ln, li) => { ctx.fillStyle = li === fit.lines.length - 1 ? th.a : '#fff'; const w = ctx.measureText(ln).width; ctx.fillText(ln, 540 - w / 2, y0 + li * fit.size * 1.1); }); ctx.restore();
        // live screen in a glass frame
        ctx.save(); ctx.shadowColor = th.a + '88'; ctx.shadowBlur = 50; ctx.fillStyle = '#0b1220'; rr(ctx, BOX.x - 8, BOX.y - 8, BOX.w + 16, BOX.h + 16, 34); ctx.fill(); ctx.restore();
        ctx.save(); rr(ctx, BOX.x, BOX.y, BOX.w, BOX.h, 28); ctx.clip(); ctx.drawImage(v, cur.x, cur.y, cur.w, cur.h, BOX.x, BOX.y, BOX.w, BOX.h); ctx.restore();
        // word-by-word subtitles (Roman Urdu caption text)
        const ws = wordsOf(sc.say); const reveal = Math.min(ws.length, Math.floor((local / (sc.seconds * 0.85)) * ws.length) + 1);
        ctx.font = `800 54px ${FONT}`; const lines: string[][] = [[]];
        for (const w of ws) { const test = [...lines[lines.length - 1], w].join(' '); if (ctx.measureText(test).width > 940 && lines[lines.length - 1].length) lines.push([w]); else lines[lines.length - 1].push(w); }
        let idx = 0; const ty = 1560; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 14;
        lines.slice(0, 3).forEach((ln, li) => { const text = ln.join(' '); let x = 540 - ctx.measureText(text).width / 2; ln.forEach((w) => { const shown = idx < reveal; const active = idx === reveal - 1; ctx.fillStyle = !shown ? 'rgba(255,255,255,.18)' : active ? th.a : '#fff'; ctx.fillText(w, x, ty + li * 66); x += ctx.measureText(w + ' ').width; idx++; }); });
        ctx.shadowBlur = 0;
        // footer: call to action pill, risk line, progress
        const bw = 520; const gg = ctx.createLinearGradient(280, 0, 280 + bw, 0); gg.addColorStop(0, th.a); gg.addColorStop(1, th.b); ctx.fillStyle = gg; rr(ctx, 280, 1770, bw, 76, 38); ctx.fill();
        ctx.fillStyle = '#111827'; ctx.font = `800 36px ${FONT}`; ctx.textBaseline = 'middle'; const cta = 'primepipfx.site'; ctx.fillText(cta, 540 - ctx.measureText(cta).width / 2, 1809); ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = `500 20px ${FONT}`; const d = 'Educational content, not financial advice. Trading carries risk.'; ctx.fillText(d, 540 - ctx.measureText(d).width / 2, 1868);
        ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(0, 1906, 1080, 14); ctx.fillStyle = th.a; ctx.fillRect(0, 1906, 1080 * (t / total), 14);
        // scene-change flash (transition)
        const fa = Math.max(0, 1 - (t - flashAt) / 0.35); if (fa > 0) { ctx.fillStyle = `rgba(255,255,255,${0.22 * fa})`; ctx.fillRect(0, 0, 1080, 1920); }
        o.onProgress?.(t / total, `Recording ${o.title}`); requestAnimationFrame(tick);
      };
      tick();
    });
    rec.stop(); const blob = await finished; void ac.close();
    tourStore.videos[o.tab] = { blob, title: o.title, at: Date.now() };
    if (silent) o.onProgress?.(1, `${silent} scene(s) had no Urdu voice line: those use captions only`);
    return blob;
  } finally { tourStore.running = false; window.scrollTo(0, 0); if (own) { own.stream.getTracks().forEach((t) => t.stop()); go(o.returnTab || 'ADMIN'); } }
}

/** One "Share this tab" click, then every listed topic gets its own recorded tour (batch). */
export async function recordTours(items: Omit<TourOpts, 'returnTab'>[], onEach?: (i: number, n: number, ok: boolean, msg?: string) => void, returnTab = 'ADMIN'): Promise<void> {
  const scr = await openScreen();
  try { for (let i = 0; i < items.length; i++) { try { await recordTour({ ...items[i], returnTab }, scr); onEach?.(i, items.length, true); } catch (e: any) { onEach?.(i, items.length, false, String(e?.message || e)); } } }
  finally { scr.stream.getTracks().forEach((t) => t.stop()); go(returnTab); }
}

export interface StreamItem { tab: string; title: string; theme: number; script: () => Promise<TourScript> }
export interface StreamOpts { voice: boolean; voiceLang: 'ur' | 'en'; stop: { stop: boolean }; pauseMs?: number; onVideo: (v: { title: string; url: string; bytes: number; at: number; ext: string }) => void; onStatus: (s: string) => void }
/** Non-stop production: one permission click, then each feature is scripted, recorded and handed over as soon as it is ready. Stops when opts.stop.stop is set. */
export async function streamTours(items: StreamItem[], opts: StreamOpts): Promise<void> {
  const scr = await openScreen();
  try {
    for (let i = 0; i < items.length && !opts.stop.stop; i++) {
      const it = items[i]; opts.onStatus(`(${i + 1}/${items.length}) Writing ${it.title}…`);
      let script: TourScript;
      try { script = await it.script(); } catch (e: any) { opts.onStatus(`Skipped ${it.title}: ${String(e?.message || e)}`); continue; }
      if (opts.stop.stop) break;
      try {
        const blob = await recordTour({ tab: it.tab, title: it.title, script, theme: it.theme, voice: opts.voice, voiceLang: opts.voiceLang, onProgress: (p, label) => opts.onStatus(`(${i + 1}/${items.length}) ${it.title}: ${label || Math.round(p * 100) + '%'}`) }, scr);
        opts.onVideo({ title: it.title, url: URL.createObjectURL(blob), bytes: blob.size, at: Date.now(), ext: blob.type.includes('mp4') ? 'mp4' : 'webm' });
      } catch (e: any) { opts.onStatus(`Skipped ${it.title}: ${String(e?.message || e)}`); }
      await sleep(opts.pauseMs ?? 1500);
    }
  } finally { scr.stream.getTracks().forEach((t) => t.stop()); go('ADMIN'); }
}
