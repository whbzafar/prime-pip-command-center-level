import { FONT, fitText, rr, THEMES } from './postVisuals';
import { go, grab, lockedNotice, openScreen, shotStore, sleep, SLOW, waitCalm } from './agentCapture';
import { getStoredToken } from './authClient';
import { type Beat, type Box, bringIntoView, describePart, discoverBeats, discoverTabBeats, findByText, primaryTabs, setSkipTablists, tablists, findScroller, fitCrop, fullCrop, panCrop, scrollToTop, toVideo } from './sectionDirector';
import { startLiveCaptions, toSrt, type LiveCaptions } from './liveCaptions';
import { loadClipBuffer } from './voiceClips';
import { HOOK_OPENERS, MUSIC_BPM, OUTRO_VARIANTS, OVERVIEW_VARIANTS, PACKS } from '../data/urduPack';

/** How many videos have been made for this category (kept in this browser): drives a different hook, order, outro, look and music each time. */
function nextTake(tab: string): number { try { const k = `pp_take_${tab}`; const n = Number(localStorage.getItem(k) || '0'); localStorage.setItem(k, String(n + 1)); return n; } catch { return Math.floor(Math.random() * 50); } }
import { stageVideo } from './publishClient';
import { noFree } from './noFree';
import { DANGEROUS } from './sectionDirector';
import { chunkCaption, pickFeature, planTimeline, titleCase, type Item } from './timeline';

/* Live tour video. The director reads the real section (every heading, card and safe inner tab, top to bottom),
   scrolls the real page to each part, and the camera follows that part's live box on screen with a spotlight and a
   label of its real name. Audio is one of: the AI Urdu voice (server), the owner's own microphone with live Urdu
   captions (browser speech recognition, free), or music only. A generated beat ducks under the voice. */

export interface TourScene { say: string; caption: string; focus: 'left' | 'center' | 'right'; zoom: number; scroll: number; urdu?: string }
export interface TourScript { hook: string; hookUrdu?: string; scenes: TourScene[]; cta: string; ctaUrdu?: string }
export type AudioMode = 'ai' | 'mic' | 'none';
export interface TourOpts {
  tab: string; title: string; script: TourScript; theme: number; voice: boolean;
  /** Overrides `voice`: 'ai' voice-over, 'mic' owner's voice with live Urdu captions, 'none' music only. */
  audio?: AudioMode;
  /** Seconds the camera stays on each part when the owner narrates (mic mode). */
  secondsPerPart?: number;
  /** Final ffmpeg pass on the server (default on). */
  finish?: boolean;
  /** Every feature of the category; shown as an overview card and used for the narration. */
  features?: string[];
  /** One video about one sub-category (inner tab) of the section, e.g. “CFTC COT Report” inside Fundamentals. */
  sub?: { path: string[]; label: string; index: number; total: number; part?: number };
  format?: VideoFormatId; voiceLang?: 'ur' | 'en'; returnTab?: string; onProgress?: (p: number, label: string) => void;
}
export const tourStore: { videos: Record<string, { blob: Blob; title: string; at: number }>; running: boolean; lastSrt: string; finished: { blob: Blob; category: string; title: string; headline: string; at: number } | null; handled: Set<number>; uploading?: boolean; lastParts?: number } = { videos: {}, running: false, lastSrt: '', finished: null, handled: new Set() };
/** After the tour returns to the admin page, reopen the Social Agent tab so the studio (and the publish panel) is on screen again. */
export function reopenStudio() { let n = 0; const t = window.setInterval(() => { const el = document.querySelector('[data-testid="admin-tab-social-agent"]') as HTMLElement | null; if (el) { el.click(); window.clearInterval(t); } else if (++n > 40) window.clearInterval(t); }, 250); }

const wordsOf = (s: string) => s.split(/\s+/).filter(Boolean);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
const ease = (t: number) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
const easeBack = (t: number) => { const x = clamp01(t); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const latin = (s: string) => !/[؀-ۿ]/.test(s);
const URDU_FONT = '"Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Segoe UI",Tahoma,sans-serif';
export const RECORD_BITRATE = 14_000_000;
/** Output formats the owner can pick. Layout is proportional to the height so every ratio keeps the same structure. */
export const VIDEO_FORMATS = {
  '9:16': { label: 'Reels, TikTok, YouTube Shorts (9:16)', w: 1080, h: 1920 },
  '4:5': { label: 'Instagram and Facebook feed (4:5)', w: 1080, h: 1350 },
  '1:1': { label: 'Square post (1:1)', w: 1080, h: 1080 },
  '16:9': { label: 'YouTube and Facebook landscape (16:9)', w: 1920, h: 1080 },
} as const;
export type VideoFormatId = keyof typeof VIDEO_FORMATS;

/** English lines to Urdu script through the server (free Google Translate). Unchanged text comes back when it cannot translate. */
async function urduFor(texts: string[]): Promise<string[]> {
  if (!texts.length) return [];
  const isUr = (x: string) => /[\u0600-\u06FF]/.test(x || '');
  let out = texts;
  try {
    const t = getStoredToken();
    const r = await fetch('/api/admin/social-brain/urdu', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ texts }) });
    if (r.ok) { const j = await r.json(); if (Array.isArray(j.texts)) out = j.texts; }
  } catch { /* the browser translates below */ }
  // anything the server could not translate is translated by the browser itself (free Google endpoint allows browsers)
  return await Promise.all(out.map(async (x, i) => {
    if (isUr(x)) return x;
    try {
      const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=${encodeURIComponent(texts[i].slice(0, 900))}`);
      const j = await r.json(); const ur = (j?.[0] || []).map((y: any) => y?.[0] || '').join('').trim(); return isUr(ur) ? ur : x;
    } catch { return x; }
  }));
}

/** Final pass on the server with ffmpeg: H.264 + AAC MP4 at short-video loudness. Returns the original recording if the server cannot do it. */
export async function finishOnServer(blob: Blob): Promise<Blob> {
  try {
    const t = getStoredToken(); const H = t ? { Authorization: `Bearer ${t}` } : {}; const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const id = await stageVideo(blob, ext); // in small pieces: one 100 MB request is refused by the host
    const r = await fetch(`/api/admin/social/finish-staged?id=${id}`, { method: 'POST', credentials: 'include', headers: H }); const j = await r.json().catch(() => ({})); if (!j.job) return blob;
    for (let k = 0; k < 150; k++) {
      await sleep(4000); const p = await (await fetch(`/api/admin/social/meta/publish-status?job=${j.job}`, { credentials: 'include', headers: H, cache: 'no-store' })).json();
      if (p.done) { const vid = p.results?.video; if (!vid?.ok) return blob; const g = await fetch(`/api/public/staged/${vid.id}.mp4`); const out = await g.blob(); return out.size > 1000 ? new Blob([out], { type: 'video/mp4' }) : blob; }
    }
    return blob;
  } catch { return blob; }
}

let serverVoiceDown = false;
/** Voice-over. Urdu: server voice (Azure/Edge/Google) first; if it is unreachable, the Urdu female voice that runs inside the browser. English: server voice. */
async function voiceFor(ac: AudioContext, text: string, lang: 'ur' | 'en', note?: (m: string) => void): Promise<AudioBuffer | null> {
  const real = await loadClipBuffer(ac, text); if (real) return real; // a real recorded voice always wins
  if (!serverVoiceDown) {
    try {
      const t = getStoredToken();
      const r = await fetch('/api/admin/social-brain/tts', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ text, lang }) });
      if (r.ok) return await ac.decodeAudioData(await r.arrayBuffer());
      serverVoiceDown = true; // do not wait for the failing server again for every line
    } catch { serverVoiceDown = true; }
  }
  if (lang === 'ur' && /[\u0600-\u06FF]/.test(text)) {
    try { const uv = await import('./urduVoice'); return uv.toAudioBuffer(ac, await uv.speakUrdu(text, note)); } catch (e) { note?.(`Browser Urdu voice failed: ${String((e as Error)?.message || e).slice(0, 120)}`); }
  }
  return null;
}

/** Short sound effects that make each cut feel edited: whoosh on every transition, a pop on every feature, a rising hit on the hook. */
function sfx(ac: AudioContext, dest: AudioNode, kind: 'whoosh' | 'pop' | 'hit') {
  const t = ac.currentTime; const g = ac.createGain(); g.connect(dest);
  if (kind === 'whoosh') {
    const len = Math.floor(ac.sampleRate * 0.45); const buf = ac.createBuffer(1, len, ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(); src.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(4200, t + 0.38);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); src.connect(f); f.connect(g); src.start(t);
  } else {
    const o = ac.createOscillator(); o.type = kind === 'pop' ? 'sine' : 'sawtooth'; const f0 = kind === 'pop' ? 520 : 70; const f1 = kind === 'pop' ? 1040 : 220;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + (kind === 'pop' ? 0.09 : 0.5));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'pop' ? 0.35 : 0.55, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'pop' ? 0.2 : 0.7)); o.connect(g); o.start(t); o.stop(t + 0.8);
  }
}

/** Voices installed in this browser (Edge ships a free natural Urdu female voice, "Uzma"). */
export function browserVoice(lang: 'ur' | 'en'): SpeechSynthesisVoice | null {
  try {
    const all = window.speechSynthesis?.getVoices?.() || [];
    const pre = lang === 'ur' ? 'ur' : 'en';
    const mine = all.filter((x) => x.lang.toLowerCase().startsWith(pre));
    return mine.find((x) => /uzma|female|zira|aria|jenny/i.test(x.name)) || mine[0] || null;
  } catch { return null; }
}
/** Asks the server which voice engines work from where it runs. */
export async function testServerVoice(): Promise<{ ok: boolean; trace: string[]; ms?: number; error?: string; azure?: boolean }> {
  try {
    const t = getStoredToken();
    const r = await fetch('/api/admin/social-brain/tts/test', { method: 'POST', credentials: 'include', headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) } });
    const j = await r.json().catch(() => ({})); if (!r.ok) return { ok: false, trace: [], error: j?.error || `HTTP ${r.status}` };
    return j;
  } catch (e: any) { return { ok: false, trace: [], error: String(e?.message || e) }; }
}

/** Generated music (no licensing): kick, clap, hats, bass line and pad at `bpm`. Returns the ducking gain. */
function beatTrack(ac: AudioContext, dest: AudioNode, seconds: number, bpm = 102): GainNode {
  const t = ac.currentTime + 0.05; const spb = 60 / bpm;
  const fade = ac.createGain(); fade.gain.setValueAtTime(0, t); fade.gain.linearRampToValueAtTime(1, t + 0.8); fade.gain.setValueAtTime(1, Math.max(t + 1, t + seconds - 1.4)); fade.gain.linearRampToValueAtTime(0, t + seconds); fade.connect(dest);
  const duck = ac.createGain(); duck.gain.value = 1; duck.connect(fade);
  const master = ac.createGain(); master.gain.value = 0.2; master.connect(duck);
  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const roots = [55, 43.65, 65.41, 49]; // A, F, C, G
  const env = (g: GainNode, at: number, peak: number, len: number) => { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + len); };
  const hit = (at: number, filter: BiquadFilterType, freq: number, peak: number, len: number) => { const s = ac.createBufferSource(); s.buffer = noise; const f = ac.createBiquadFilter(); f.type = filter; f.frequency.value = freq; const g = ac.createGain(); env(g, at, peak, len); s.connect(f); f.connect(g); g.connect(master); s.start(at); s.stop(at + len + 0.05); };
  const beats = Math.ceil(seconds / spb);
  for (let b = 0; b < beats; b++) {
    const at = t + b * spb; if (at > t + seconds) break;
    const intro = b < 4; const bar = Math.floor(b / 4); const root = roots[bar % 4];
    if (!intro || b % 2 === 0) { const k = ac.createOscillator(); k.type = 'sine'; k.frequency.setValueAtTime(150, at); k.frequency.exponentialRampToValueAtTime(42, at + 0.13); const g = ac.createGain(); env(g, at, 0.95, 0.28); k.connect(g); g.connect(master); k.start(at); k.stop(at + 0.3); }
    if (!intro && b % 4 === 2) hit(at, 'bandpass', 1900, 0.45, 0.16);
    hit(at + spb / 2, 'highpass', 7500, 0.18, 0.05);
    if (b % 2 === 1) hit(at + spb * 0.75, 'highpass', 9000, 0.08, 0.03);
    if (!intro) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = b % 4 === 3 ? root * 1.5 : root; const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; const g = ac.createGain(); env(g, at, 0.28, spb * 0.85); o.connect(f); f.connect(g); g.connect(master); o.start(at); o.stop(at + spb); }
    if (b % 4 === 0) [4, 5, 6].forEach((m) => { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = root * m * (m === 5 && bar % 2 ? 0.96 : 1); const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.05, at + 0.3); g.gain.linearRampToValueAtTime(0.0001, at + spb * 4); o.connect(g); g.connect(master); o.start(at); o.stop(at + spb * 4 + 0.05); });
  }
  return duck;
}

type Kind = 'intro' | 'overview' | 'part' | 'outro';
interface Seg { spoken?: string; spokenLang?: 'ur' | 'en'; kind: Kind; beat?: Beat; headline: string; label: string; say: string; ur?: string; chunks?: string[]; feats?: string[]; voice: AudioBuffer | null; seconds: number }

/** Records one real tour of a section. With a shared screen (from openScreen), many tours can run after one permission click. */
export async function recordTour(o: TourOpts, shared?: { video: HTMLVideoElement }): Promise<Blob> {
  if (typeof MediaRecorder === 'undefined') throw new Error('Video recording is not supported in this browser. Use desktop Chrome or Edge.');
  const mode: AudioMode = o.audio || (o.voice ? 'ai' : 'none');
  const lang = o.voiceLang || 'ur';
  // microphone first, so the permission prompt appears before the agent leaves this screen
  let mic: MediaStream | null = null;
  if (mode === 'mic') {
    try { mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { throw new Error('Microphone access was blocked, so your voice cannot be recorded. Allow the microphone for this site and try again.'); }
  }
  const own = shared ? null : await openScreen(); const v = shared?.video || own!.video; tourStore.running = true;
  let captions: LiveCaptions | null = null;
  try {
    o.onProgress?.(0, `Opening ${o.title}`);
    go(o.tab); await sleep(1500); window.scrollTo(0, 0); const calm = await waitCalm(v, SLOW[o.tab] || 6500);
    if (lockedNotice()) throw new Error(`“${o.title}” is locked for this account, so it cannot be recorded.`);
    if (!calm) await sleep(1500);
    if (o.sub) {
      // click down the path of sub-categories (e.g. Fundamentals › Pairs), one level at a time
      const used: HTMLElement[] = [];
      for (const step of o.sub.path) {
        let hit: { el: HTMLElement } | undefined; let host: HTMLElement | undefined;
        for (let tries = 0; tries < 6 && !hit; tries++) { for (const c of tablists(used)) { const f = c.tabs.find((x) => x.label === step); if (f) { hit = f; host = c.list; break; } } if (!hit) await sleep(600); }
        if (!hit || !host) throw new Error(`Could not find “${step}” inside ${o.title}.`);
        used.push(host); try { hit.el.click(); } catch { /* handled by the check below */ } await sleep(1500); await waitCalm(v, SLOW[o.tab] || 6500);
      }
      setSkipTablists(tablists().map((x) => x.list)); await sleep(800); window.scrollTo(0, 0);
    }
    // every recording also leaves a real screenshot of this section for the image posts
    try { if (v.videoWidth) shotStore.shots[o.tab] = { img: await grab(v), label: o.title, tab: o.tab, at: Date.now() }; } catch { /* optional */ }
    try { await (document as any).fonts?.load?.(`700 40px "Noto Nastaliq Urdu"`); } catch { /* font optional */ }

    // 1. read the section: what is actually on this screen, top to bottom
    const scroller = findScroller();
    const allBeats = discoverBeats(scroller, o.sub?.path[o.sub.path.length - 1] || o.title, o.sub ? 40 : 9);
    // a long sub-category is told in parts of 7 shots each, so every part stays a short video and nothing is left out
    const CH = 7; const nParts = o.sub ? Math.max(1, Math.ceil(allBeats.length / CH)) : 1; const partNo = o.sub?.part || 0; tourStore.lastParts = nParts;
    const beats = o.sub ? allBeats.slice(partNo * CH, partNo * CH + CH) : allBeats;
    o.onProgress?.(0, `Found ${beats.length} parts in ${o.title}`);

    // 2. build the edit: intro, one shot per real part, outro
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext; const ac: AudioContext = new AC(); if (ac.state === 'suspended') await ac.resume();
    const adest = ac.createMediaStreamDestination();
    // master limiter: voice, microphone and music never clip
    const mix = ac.createDynamicsCompressor(); mix.threshold.value = -6; mix.knee.value = 4; mix.ratio.value = 20; mix.attack.value = 0.002; mix.release.value = 0.15; mix.connect(adest);
    const feats = (o.features || []).filter(Boolean);
    const segs: Seg[] = [];
    const take = nextTake(o.tab); let silent = 0; let wanted = 0; let rate = 1; let browserSpeech: { lang: 'ur' | 'en'; tab: MediaStreamTrack[] } | null = null;
    const per = Math.max(3, Math.min(15, o.secondsPerPart || 6));
    const useUrdu = mode === 'ai' && lang === 'ur';
    if (mode === 'mic') {
      // the owner narrates: one shot per real part, no generated speech
      segs.push({ kind: 'intro', headline: o.script.hook, label: o.title, say: '', voice: null, seconds: 3.4 });
      (beats.length ? beats : [undefined]).forEach((bt, i) => segs.push({ kind: 'part', beat: bt, headline: bt?.label || o.script.scenes[i]?.caption || o.title, label: bt?.label || o.title, say: '', voice: null, seconds: per }));
      segs.push({ kind: 'outro', headline: o.script.cta, label: 'primepipfx.site', say: '', voice: null, seconds: 3.4 });
    } else {
      // what is said about each real part: its name plus the best matching feature of the category
      const used = new Set<number>();
      const src: { kind: Kind; headline: string; label: string; en: string; urdu?: string; rm?: string; beat?: Beat; feats?: string[] }[] = [];
      const pack = !o.sub && useUrdu ? PACKS[o.tab] : undefined;
      if (pack) {
        const opener = HOOK_OPENERS[take % HOOK_OPENERS.length]; const ov = OVERVIEW_VARIANTS[take % OVERVIEW_VARIANTS.length]; const ou = OUTRO_VARIANTS[take % OUTRO_VARIANTS.length];
        // hand-written Urdu for this category: voice speaks Urdu script, viewers read Roman Urdu captions
        src.push({ kind: 'intro', headline: opener[0] || pack.hook[0], label: o.title, en: `${opener[0]} ${pack.hook[0]}`.trim(), rm: `${opener[0]} ${pack.hook[0]}`.trim(), urdu: `${opener[1]} ${pack.hook[1]}`.trim() });
        if (feats.length) src.push({ kind: 'overview', headline: `Inside ${o.title}`, label: o.title, en: ov[0], rm: ov[0], urdu: ov[1], feats: pack.parts.map((p) => p[0]) });
        // each line is paired with the part of the screen it describes (by name where known), the rest in reading order
        const free = beats.slice(); const taken: HTMLElement[] = []; const pick: (Beat | undefined)[] = pack.parts.map((pt) => { const k = pt[3] ? free.findIndex((b) => pt[3]!.test(b.label)) : -1; if (k >= 0) { const b = free.splice(k, 1)[0]; taken.push(b.el); return b; } const f = pt[3] ? findByText(pt[3], taken) : null; if (f) taken.push(f.el); return f || undefined; });
        const order = pack.parts.map((_, i) => i); const rot = take % Math.max(1, order.length); const seq = [...order.slice(rot), ...order.slice(0, rot)]; seq.forEach((i) => { const pt = pack.parts[i]; src.push({ kind: 'part', headline: pt[0], label: pt[0], en: pt[1], rm: pt[1], urdu: pt[2], beat: pick[i] || free.shift() }); });
        // every sub-category (inner tab) of this section gets its own shot, so nothing inside the category is left out
        const shownTabs = new Set(src.filter((x) => x.beat?.click).map((x) => x.label.toLowerCase())); const TAB_LINES: [string, string][] = [['Now the next sub-section: ', 'اب اگلا سب سیکشن دیکھیں۔'], ['Also inside: ', 'اس کے اندر یہ بھی موجود ہے۔'], ['Next up: ', 'اور یہ بھی دیکھیے۔']];
        discoverTabBeats(8).forEach((tb, i) => { if (shownTabs.has(tb.label.toLowerCase())) return; const tl = TAB_LINES[(i + take) % TAB_LINES.length]; src.push({ kind: 'part', headline: tb.label, label: tb.label, en: `${tl[0]}${tb.label}.`, rm: `${tl[0]}${tb.label}.`, urdu: tl[1], beat: tb }); });
        src.push({ kind: 'outro', headline: o.script.cta, label: 'primepipfx.site', en: ou[0], rm: ou[0], urdu: ou[1] });
      } else if (o.sub) {
        // one video per sub-category (or part of one): each real part and each function in it is shown and described from the screen
        const S = o.sub; const pn = nParts > 1 ? ` Part ${partNo + 1} of ${nParts}.` : ''; const where = S.path.join(' › ');
        const HK = [`Everything inside ${where}, from top to bottom.${pn}`, `Do you really know what ${where} can do? Let us go through it.${pn}`, `${where}: every function, one by one.${pn}`, `Most traders use only half of ${where}. Here is all of it.${pn}`, `Open ${where} with me, and I will show you each part.${pn}`, `A complete tour of ${where}.${pn}`];
        const HU = [`${where} کے اندر جو کچھ ہے، اوپر سے نیچے تک دیکھتے ہیں۔`, `کیا آپ واقعی جانتے ہیں کہ ${where} کیا کچھ کر سکتا ہے؟ آئیے دیکھتے ہیں۔`, `${where}، ایک ایک فنکشن کے ساتھ۔`, `زیادہ تر ٹریڈرز ${where} کا آدھا حصہ ہی استعمال کرتے ہیں۔ یہ رہا پورا۔`, `میرے ساتھ ${where} کھولیے، میں ہر حصہ دکھاتا ہوں۔`, `${where} کا مکمل جائزہ۔`];
        const hi = take % HK.length; src.push({ kind: 'intro', headline: `${o.title} · ${S.label}`, label: o.title, en: HK[hi], rm: HK[hi], urdu: HU[hi] });
        const LEAD = ['Start with ', 'Next, ', 'Then ', 'Look at ', 'Here you get ', 'Do not miss ', 'And ', 'Finally, ']; const TABLEAD = ['Switch to the ', 'Now open the ', 'Then the ']; 
        beats.forEach((bt, i) => { const d = describePart(bt.el, bt.label, take + i); const lead = bt.click ? `${TABLEAD[(i + take) % TABLEAD.length]}${bt.label} view. ` : `${LEAD[(i + take) % LEAD.length]}${titleCase(bt.label)}. `; src.push({ kind: 'part', headline: bt.label, label: bt.label, en: `${lead}${d}`.trim(), beat: bt }); });
        const ou = OUTRO_VARIANTS[take % OUTRO_VARIANTS.length]; src.push({ kind: 'outro', headline: o.script.cta, label: 'primepipfx.site', en: ou[0], rm: ou[0], urdu: ou[1] });
      } else {
      src.push({ kind: 'intro', headline: o.script.hook, label: o.title, en: o.script.hook, urdu: o.script.hookUrdu });
      if (feats.length) src.push({ kind: 'overview', headline: `Inside ${o.title}`, label: o.title, en: `Here is everything inside ${o.title}: ${feats.length} tools, all in one place.`, feats });
      (beats.length ? beats : o.script.scenes.map(() => undefined)).forEach((bt, i) => {
        const label = bt?.label || o.script.scenes[i]?.caption || o.title; const f = pickFeature(label, feats, used);
        src.push({ kind: 'part', headline: label, label, en: `${titleCase(label)}.${f ? ' ' + f : ''}`, beat: bt });
      });
      src.push({ kind: 'outro', headline: o.script.cta, label: 'primepipfx.site', en: o.script.cta, urdu: o.script.ctaUrdu });
      }
      // the offer is never described as free or at no cost; viewers are sent to the link in the bio instead
      const nofree = noFree;
      src.forEach((x) => { x.en = nofree(x.en); if (x.rm) x.rm = nofree(x.rm); if (x.urdu) x.urdu = nofree(x.urdu); if (x.feats) x.feats = x.feats.map((f) => nofree(f)); });
      let urdu: string[] = src.map((x) => x.urdu || '');
      if (useUrdu) {
        o.onProgress?.(0, 'Writing the Urdu narration');
        const need = src.map((x, i) => (urdu[i] ? -1 : i)).filter((i) => i >= 0);
        const tr = await urduFor(need.map((i) => src[i].en)); need.forEach((i, k) => { if (/[\u0600-\u06FF]/.test(tr[k] || '')) urdu[i] = tr[k]; });
      }
      // voices, four at a time
      const voices: (AudioBuffer | null)[] = src.map(() => null);
      if (mode === 'ai') {
        let next = 0; let done = 0;
        const worker = async () => { while (next < src.length) { const i = next++; const line = useUrdu ? urdu[i] : src[i].en; if (!line) continue; wanted++; voices[i] = await voiceFor(ac, line, useUrdu && urdu[i] ? 'ur' : 'en', (m) => o.onProgress?.(0, m)); if (!voices[i]) silent++; o.onProgress?.(0, `Voice-over ${++done}/${src.length}`); } };
        serverVoiceDown = false; await Promise.all([worker(), worker(), worker()]);
        if (wanted && silent === wanted) {
          // the server voices are unreachable: the browser speaks instead and its sound is captured from the shared tab
          const ts = (v.srcObject as MediaStream | null)?.getAudioTracks?.() || [];
          const bu = browserVoice(useUrdu ? 'ur' : 'en') ? 'ur' : null; const be = browserVoice('en');
          if (!ts.length) throw new Error('The server voice is unreachable, so the browser voice is needed. When sharing the tab, tick “Also share tab audio”, then try again.');
          if (!bu && !be) throw new Error('No voice is available: the server voice is unreachable and this browser has no speech voice. Open the site in Microsoft Edge (it includes the free Urdu voice “Uzma”) or use “My voice”.');
          browserSpeech = { lang: bu && useUrdu ? 'ur' : 'en', tab: ts };
          o.onProgress?.(0, bu && useUrdu ? 'Using this browser’s Urdu voice' : 'Using this browser’s English voice (no Urdu voice installed)');
        }
      }
      const items: Item[] = src.map((x, i) => ({ kind: x.kind, voice: voices[i]?.duration ?? null, base: Math.max(x.kind === 'overview' ? 5 : 3, wordsOf(x.en).length / 2.6 + 0.9) }));
      const plan = planTimeline(items, 35, 90, 1.15); rate = plan.rate;
      src.forEach((x, i) => { if (!plan.keep[i]) return; const ur = undefined as string | undefined; segs.push({ spoken: browserSpeech ? (browserSpeech.lang === 'ur' ? (urdu[i] && /[\u0600-\u06FF]/.test(urdu[i]) ? urdu[i] : x.en) : x.en) : undefined, spokenLang: browserSpeech ? (browserSpeech.lang === 'ur' && urdu[i] && /[\u0600-\u06FF]/.test(urdu[i]) ? 'ur' : 'en') : undefined, kind: x.kind, beat: x.beat, headline: x.headline, label: x.label, say: x.rm || x.en, ur, chunks: ur ? chunkCaption(ur, 6) : undefined, feats: x.feats, voice: voices[i], seconds: plan.seconds[i] }); });
    }
    const total = segs.reduce((a, s) => a + s.seconds, 0); const starts: number[] = []; segs.reduce((a, s) => { starts.push(a); return a + s.seconds; }, 0);
    o.onProgress?.(0, `Edit ready: ${segs.length} shots, ${Math.round(total)} seconds`);

    // 3. canvas, recorder and audio graph
    const fmt = VIDEO_FORMATS[o.format ?? '9:16']; const W = fmt.w; const H = fmt.h; const land = W > H;
    const U = Math.min(W, H) / 1080; // type scale
    const out = document.createElement('canvas'); out.width = W; out.height = H; const ctx = out.getContext('2d')!; const th = THEMES[(o.theme + take) % THEMES.length];
    const small = document.createElement('canvas'); small.width = 64; small.height = 36; const sctx = small.getContext('2d')!;
    const stream = out.captureStream(30); stream.addTrack(adest.stream.getAudioTracks()[0]);
    const mime = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const rec = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), videoBitsPerSecond: RECORD_BITRATE, audioBitsPerSecond: 192_000 });
    const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const finished = new Promise<Blob>((res) => { rec.onstop = () => res(new Blob(chunks, { type: rec.mimeType || 'video/webm' })); });

    // layout: header, headline, live screen box, captions, footer (portrait); screen left + text right (landscape)
    const M = Math.round(56 * U);
    const BOX: Box = land ? { x: M, y: Math.round(H * 0.13), w: Math.round(W * 0.64), h: Math.round(H * 0.74) }
      : { x: M, y: Math.round(H * (H / W > 1.5 ? 0.25 : H / W > 1.1 ? 0.24 : 0.22)), w: W - M * 2, h: Math.round(H * (H / W > 1.5 ? 0.52 : H / W > 1.1 ? 0.5 : 0.47)) };
    const aspect = BOX.w / BOX.h;
    const headY = land ? Math.round(H * 0.3) : Math.round(BOX.y * 0.6);
    const capY = land ? Math.round(H * 0.62) : Math.round(BOX.y + BOX.h + (H - BOX.y - BOX.h) * 0.28);
    const textX = land ? BOX.x + BOX.w + M : M; const textW = land ? W - textX - M : W - M * 2; const textCX = textX + textW / 2;

    const music = beatTrack(ac, mix, total + 0.3, MUSIC_BPM[take % MUSIC_BPM.length]);
    const t0 = ac.currentTime + 0.05;
    if (mode === 'ai') segs.forEach((s, i) => {
      if (!s.voice) return; const at = t0 + starts[i] + 0.2;
      const src = ac.createBufferSource(); src.buffer = s.voice; src.playbackRate.value = rate; const vg = ac.createGain(); vg.gain.value = 1.15; src.connect(vg); vg.connect(mix); src.start(at);
      music.gain.setTargetAtTime(0.28, at - 0.1, 0.06); music.gain.setTargetAtTime(1, at + s.voice.duration / rate, 0.25);
    });
    if (browserSpeech) { try { const tg = ac.createGain(); tg.gain.value = 1.2; ac.createMediaStreamSource(new MediaStream(browserSpeech.tab)).connect(tg); tg.connect(mix); } catch { /* tab audio unavailable */ } }
    if (mic) {
      const src = ac.createMediaStreamSource(mic); const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -26; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      const g = ac.createGain(); g.gain.value = 1.7; src.connect(hp); hp.connect(comp); comp.connect(g); g.connect(mix);
      music.gain.value = 0.3; // music stays under your voice the whole time
    }

    // 4. live render loop; the director moves the real page while the camera follows
    const vw = () => v.videoWidth || 1280; const vh = () => v.videoHeight || 720;
    let cam = fullCrop(aspect, vw(), vh()); let segIdx = -1; let segAt = 0; let lastT = 0; let spot: Box | null = null;
    rec.start(250); if (mode === 'mic') captions = startLiveCaptions(lang === 'ur' ? 'ur-PK' : 'en-US');
    const start = performance.now();
    const enter = (i: number) => {
      const s = segs[i];
      try { sfx(ac, mix, i === 0 ? 'hit' : 'whoosh'); if (s.kind === 'part') window.setTimeout(() => { try { sfx(ac, mix, 'pop'); } catch { /* ignore */ } }, 380); } catch { /* ignore */ }
      if (s.spoken) { try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(s.spoken); const bv = browserVoice(s.spokenLang || 'en'); if (bv) u.voice = bv; u.lang = bv?.lang || (s.spokenLang === 'ur' ? 'ur-PK' : 'en-US'); u.rate = Math.min(1.35, Math.max(0.85, (s.spoken.split(/\s+/).length / 2.6) / Math.max(1, s.seconds - 0.4))); window.speechSynthesis.speak(u); } catch { /* speech unavailable */ } }
      if (s.kind === 'part' && s.beat) {
        if (s.beat.click) { try { s.beat.click.click(); } catch { /* ignore */ } }
        bringIntoView(scroller, s.beat.el);
      } else if (s.kind === 'part') {
        const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight); const frac = (i - 1) / Math.max(1, segs.length - 3);
        if (scroller === document.scrollingElement || scroller === document.documentElement) window.scrollTo({ top: max * frac, behavior: 'smooth' }); else scroller.scrollTo({ top: max * frac, behavior: 'smooth' });
      } else scrollToTop(scroller);
    };

    await new Promise<void>((resolve) => {
      const tick = () => {
        const t = (performance.now() - start) / 1000; if (t >= total) return resolve();
        const dt = Math.min(0.1, t - lastT); lastT = t;
        let i = segs.length - 1; while (i > 0 && t < starts[i]) i--;
        if (i !== segIdx) { segIdx = i; segAt = t; enter(i); }
        const s = segs[i]; const local = t - starts[i]; const since = t - segAt; const prog = local / s.seconds;

        // camera target: the part's live box on screen, else the whole screen
        const box = s.kind === 'part' && s.beat ? toVideo(s.beat.el, vw(), vh()) : null;
        const fit0 = box ? fitCrop(box, aspect, vw(), vh()) : fullCrop(aspect, vw(), vh());
        const tgt = box ? panCrop(box, fit0, vw(), vh(), ease((since - 0.8) / Math.max(0.5, s.seconds - 1.2))) : fit0;
        const k = 1 - Math.exp(-dt * (since < 1 ? 4.2 : 2.6));
        cam = { x: cam.x + (tgt.x - cam.x) * k, y: cam.y + (tgt.y - cam.y) * k, w: cam.w + (tgt.w - cam.w) * k, h: cam.h + (tgt.h - cam.h) * k };
        const push = 1 + 0.045 * ease(prog); // slow push-in
        const shot = { x: cam.x + (cam.w - cam.w / push) / 2, y: cam.y + (cam.h - cam.h / push) / 2, w: cam.w / push, h: cam.h / push };
        spot = box;

        // backdrop: blurred live screen + brand gradient
        const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, th.bg0); g.addColorStop(1, th.bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        sctx.drawImage(v, 0, 0, 64, 36); ctx.globalAlpha = 0.4; ctx.imageSmoothingQuality = 'low'; ctx.drawImage(small, 0, 0, W, H); ctx.globalAlpha = 1; ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = 'rgba(2,6,23,.58)'; ctx.fillRect(0, 0, W, H);
        const glow = ctx.createRadialGradient(W * 0.5, BOX.y, 0, W * 0.5, BOX.y, W * 0.8); glow.addColorStop(0, th.a + '33'); glow.addColorStop(1, 'transparent'); ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

        // header: brand, section, part counter
        ctx.textBaseline = 'top'; ctx.font = `800 ${34 * U}px ${FONT}`; ctx.fillStyle = th.a; ctx.fillText('PRIMEPIPFX', M, M);
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `600 ${22 * U}px ${FONT}`; ctx.fillText(o.title.toUpperCase(), M, M + 44 * U);
        const partNo = segs.slice(0, i + 1).filter((x) => x.kind === 'part').length; const partTotal = segs.filter((x) => x.kind === 'part').length;
        if (s.kind === 'part') { const lab = `${String(partNo).padStart(2, '0')} / ${String(partTotal).padStart(2, '0')}`; ctx.font = `800 ${26 * U}px ${FONT}`; const lw = ctx.measureText(lab).width; ctx.fillStyle = 'rgba(255,255,255,.1)'; rr(ctx, W - M - lw - 36 * U, M - 6 * U, lw + 36 * U, 46 * U, 23 * U); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(lab, W - M - lw - 18 * U, M + 4 * U); }

        // live screen: transition punch + whip on every cut, then the camera shot
        const punch = Math.max(0, 1 - since / 0.45); const sc = 1 + 0.06 * punch * punch;
        ctx.save(); ctx.translate(BOX.x + BOX.w / 2, BOX.y + BOX.h / 2); ctx.scale(sc, sc); ctx.translate(-(BOX.x + BOX.w / 2), -(BOX.y + BOX.h / 2));
        ctx.save(); ctx.shadowColor = th.a + '99'; ctx.shadowBlur = 60 * U; ctx.fillStyle = '#0b1220'; rr(ctx, BOX.x - 8 * U, BOX.y - 8 * U, BOX.w + 16 * U, BOX.h + 16 * U, 34 * U); ctx.fill(); ctx.restore();
        ctx.save(); rr(ctx, BOX.x, BOX.y, BOX.w, BOX.h, 28 * U); ctx.clip();
        ctx.drawImage(v, shot.x, shot.y, shot.w, shot.h, BOX.x, BOX.y, BOX.w, BOX.h);
        if (since < 0.22 && i > 0) { const off = (1 - since / 0.22) * BOX.w * 0.08; ctx.globalAlpha = 0.28; ctx.drawImage(v, shot.x, shot.y, shot.w, shot.h, BOX.x - off, BOX.y, BOX.w, BOX.h); ctx.drawImage(v, shot.x, shot.y, shot.w, shot.h, BOX.x + off, BOX.y, BOX.w, BOX.h); ctx.globalAlpha = 1; }
        // spotlight on the real part, with its real name
        if (spot && s.kind === 'part') {
          const fx = BOX.w / shot.w; const fy = BOX.h / shot.h;
          const hx = BOX.x + (spot.x - shot.x) * fx; const hy = BOX.y + (spot.y - shot.y) * fy; const hw = spot.w * fx; const hh = spot.h * fy;
          const a = ease((since - 0.5) / 0.5);
          if (a > 0) {
            ctx.fillStyle = `rgba(2,6,23,${0.5 * a})`; ctx.beginPath(); ctx.rect(BOX.x, BOX.y, BOX.w, BOX.h);
            if (ctx.roundRect) ctx.roundRect(hx - 10 * U, hy - 10 * U, hw + 20 * U, hh + 20 * U, 18 * U); else ctx.rect(hx - 10 * U, hy - 10 * U, hw + 20 * U, hh + 20 * U);
            ctx.fill('evenodd');
            const pulse = 0.65 + 0.35 * Math.sin(t * 5); ctx.strokeStyle = th.a; ctx.globalAlpha = a * pulse; ctx.lineWidth = 5 * U; ctx.shadowColor = th.a; ctx.shadowBlur = 24 * U; rr(ctx, hx - 10 * U, hy - 10 * U, hw + 20 * U, hh + 20 * U, 18 * U); ctx.stroke(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
            // callout pill with the part's real label
            const pa = easeBack((since - 0.7) / 0.45);
            if (pa > 0 && s.label) {
              ctx.font = `800 ${30 * U}px ${FONT}`; const txt = s.label.toUpperCase(); const pw = Math.min(BOX.w - 40 * U, ctx.measureText(txt).width + 56 * U + 44 * U); const ph = 56 * U;
              let px = Math.min(BOX.x + BOX.w - pw - 20 * U, Math.max(BOX.x + 20 * U, hx)); let py = hy - ph - 22 * U; if (py < BOX.y + 16 * U) py = Math.min(BOX.y + BOX.h - ph - 16 * U, hy + hh + 22 * U);
              ctx.save(); ctx.translate(px + pw / 2, py + ph / 2); ctx.scale(pa, pa); ctx.translate(-(px + pw / 2), -(py + ph / 2));
              ctx.fillStyle = th.a; rr(ctx, px, py, pw, ph, ph / 2); ctx.fill(); ctx.fillStyle = '#0b0b0b'; ctx.beginPath(); ctx.arc(px + ph / 2, py + ph / 2, ph * 0.32, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = th.a; ctx.font = `900 ${22 * U}px ${FONT}`; ctx.textBaseline = 'middle'; const n = String(partNo); ctx.fillText(n, px + ph / 2 - ctx.measureText(n).width / 2, py + ph / 2 + 1);
              ctx.fillStyle = '#0b0b0b'; ctx.font = `800 ${30 * U}px ${FONT}`; let shown = txt; while (ctx.measureText(shown).width > pw - ph - 26 * U && shown.length > 4) shown = shown.slice(0, -2); if (shown !== txt) shown += '…';
              ctx.fillText(shown, px + ph + 6 * U, py + ph / 2 + 1); ctx.textBaseline = 'top'; ctx.restore();
              px = 0; py = 0;
            }
          }
        }
        ctx.restore(); ctx.restore();

        // headline (kinetic): hook, part caption, call to action
        const pop = easeBack(since / 0.4); const big = s.kind !== 'part';
        const head = latin(s.headline) ? s.headline.toUpperCase() : s.headline;
        ctx.save(); ctx.translate(textCX, headY); ctx.scale(0.85 + 0.15 * pop, 0.85 + 0.15 * pop); ctx.globalAlpha = clamp01(since / 0.25); ctx.translate(-textCX, -headY);
        const maxH = land ? H * 0.32 : Math.max(120, BOX.y - M - 120 * U);
        const fit = fitText(ctx, head, textW, maxH, (big ? 112 : 84) * U, 900); ctx.font = `900 ${fit.size}px ${latin(head) ? FONT : URDU_FONT}`; ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 26 * U;
        const lh = fit.size * (latin(head) ? 1.08 : 1.6); const y0 = headY - (fit.lines.length * lh) / 2;
        fit.lines.forEach((ln, li) => { ctx.fillStyle = li === fit.lines.length - 1 ? th.a : '#fff'; const w = ctx.measureText(ln).width; ctx.fillText(ln, land ? textX : textCX - w / 2, y0 + li * lh); }); ctx.restore();

        // intro teaser: gives a reason to stay until the end
        if (s.kind === 'intro' && mode !== 'mic') {
          const ta = easeBack((since - 0.9) / 0.5); if (ta > 0) {
            const tx = mode === 'ai' && lang === 'ur' ? 'AAKHIR TAK DEKHEIN  ▼' : 'WATCH TILL THE END  ▼'; ctx.font = `900 ${34 * U}px ${FONT}`; const tw = ctx.measureText(tx).width + 70 * U; const th2 = 62 * U; const tcx = land ? textX + textW / 2 : W / 2; const ty = land ? H * 0.46 : BOX.y + BOX.h * 0.5;
            ctx.save(); ctx.translate(tcx, ty); ctx.scale(ta, ta); ctx.fillStyle = '#FACC15'; rr(ctx, -tw / 2, -th2 / 2, tw, th2, th2 / 2); ctx.fill(); ctx.fillStyle = '#0b0b0b'; ctx.textBaseline = 'middle'; ctx.fillText(tx, -tw / 2 + 35 * U, 2 * U); ctx.restore(); ctx.textBaseline = 'top';
          }
        }

        // captions: live transcript of your voice (Urdu script) or word-by-word voice-over captions
        const urduBox = (said: string) => {
          ctx.save(); ctx.font = `700 ${50 * U}px ${URDU_FONT}`; ctx.direction = 'rtl'; ctx.textBaseline = 'middle';
          const words = said.split(/\s+/); const lines: string[] = []; let line = '';
          for (const w of words) { const test = line ? `${line} ${w}` : w; if (ctx.measureText(test).width > textW - 60 * U && line) { lines.push(line); line = w; } else line = test; }
          if (line) lines.push(line); const keep = lines.slice(-2); const lh2 = 92 * U; const bh = keep.length * lh2 + 34 * U;
          const bw = Math.min(textW, Math.max(...keep.map((l) => ctx.measureText(l).width)) + 70 * U);
          ctx.fillStyle = '#FACC15'; rr(ctx, textCX - bw / 2, capY - 17 * U, bw, bh, 22 * U); ctx.fill();
          ctx.fillStyle = '#0b0b0b'; keep.forEach((l, li) => { const w = ctx.measureText(l).width; ctx.fillText(l, textCX + w / 2, capY + lh2 / 2 + li * lh2); });
          ctx.restore();
        };
        if (mode === 'mic') {
          const said = (captions?.current() || '').trim();
          if (said) urduBox(said);
          else if (s.kind === 'part' && since < 1.2) {
            ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.font = `600 ${26 * U}px ${FONT}`; const hint = '● LIVE'; ctx.fillText(hint, textCX - ctx.measureText(hint).width / 2, capY);
          }
        } else if (s.chunks && s.chunks.length) {
          urduBox(s.chunks[Math.min(s.chunks.length - 1, Math.floor((local / Math.max(0.5, s.seconds - 0.4)) * s.chunks.length))]);
        } else if (s.say) {
          const ws = wordsOf(s.say); const spanT = s.voice ? s.voice.duration / rate + 0.1 : s.seconds * 0.85; const reveal = Math.min(ws.length, Math.max(1, Math.floor((Math.max(0, local - 0.2) / spanT) * ws.length) + 1));
          ctx.font = `800 ${50 * U}px ${FONT}`; const lines: string[][] = [[]];
          for (const w of ws) { const test = [...lines[lines.length - 1], w].join(' '); if (ctx.measureText(test).width > textW - 50 * U && lines[lines.length - 1].length) lines.push([w]); else lines[lines.length - 1].push(w); }
          const curLine = (() => { let n = 0; for (let li = 0; li < lines.length; li++) { n += lines[li].length; if (reveal <= n) return li; } return lines.length - 1; })();
          const from = Math.max(0, Math.min(curLine, lines.length - 2)); const show = lines.slice(from, from + 2); let idx = lines.slice(0, from).reduce((a, l) => a + l.length, 0);
          const lh2 = 64 * U; const bw = Math.min(textW, Math.max(...show.map((l) => ctx.measureText(l.join(' ')).width)) + 60 * U);
          ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(ctx, textCX - bw / 2, capY - 14 * U, bw, show.length * lh2 + 22 * U, 20 * U); ctx.fill();
          show.forEach((ln, li) => { const text = ln.join(' '); let x = textCX - ctx.measureText(text).width / 2; ln.forEach((w) => { const shown = idx < reveal; const active = idx === reveal - 1; ctx.fillStyle = !shown ? 'rgba(255,255,255,.3)' : active ? '#FACC15' : '#fff'; ctx.fillText(w, x, capY + li * lh2); x += ctx.measureText(w + ' ').width; idx++; }); });
        }

        // overview card: every feature of the category, checked off one by one
        if (s.kind === 'overview' && s.feats) {
          const a = ease(since / 0.4); ctx.fillStyle = `rgba(2,6,23,${0.82 * a})`; rr(ctx, BOX.x, BOX.y, BOX.w, BOX.h, 28 * U); ctx.fill();
          const list = s.feats.slice(0, 8); const more = s.feats.length - list.length;
          ctx.textBaseline = 'middle'; ctx.font = `900 ${40 * U}px ${FONT}`; ctx.fillStyle = th.a; ctx.fillText('WHAT’S INSIDE', BOX.x + 40 * U, BOX.y + 56 * U);
          const rowH = Math.min(86 * U, (BOX.h - 150 * U) / (list.length + (more > 0 ? 1 : 0)));
          list.forEach((f, li) => {
            const at = 0.5 + (li * Math.max(0.3, s.seconds - 1.2)) / list.length; const pa = easeBack((since - at) / 0.35); if (pa <= 0) return;
            const y = BOX.y + 120 * U + li * rowH + rowH / 2; ctx.save(); ctx.globalAlpha = clamp01(pa); ctx.translate(0, (1 - clamp01(pa)) * 18 * U);
            ctx.fillStyle = th.a; ctx.beginPath(); ctx.arc(BOX.x + 62 * U, y, 20 * U, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#0b0b0b'; ctx.lineWidth = 5 * U; ctx.beginPath(); ctx.moveTo(BOX.x + 52 * U, y); ctx.lineTo(BOX.x + 60 * U, y + 8 * U); ctx.lineTo(BOX.x + 73 * U, y - 8 * U); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.font = `700 ${31 * U}px ${FONT}`; let t = f; const maxw = BOX.w - 140 * U; while (ctx.measureText(t).width > maxw && t.length > 6) t = t.slice(0, -2); if (t !== f) t = t.trimEnd() + '…';
            ctx.fillText(t, BOX.x + 100 * U, y); ctx.restore();
          });
          if (more > 0 && since > s.seconds - 1) { ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = `700 ${28 * U}px ${FONT}`; ctx.fillText(`+ ${more} more inside`, BOX.x + 100 * U, BOX.y + BOX.h - 40 * U); }
          ctx.textBaseline = 'top';
        }

        // outro card
        if (s.kind === 'outro') {
          const a = ease(since / 0.5); ctx.fillStyle = `rgba(2,6,23,${0.55 * a})`; ctx.fillRect(BOX.x, BOX.y, BOX.w, BOX.h);
          const pa = easeBack((since - 0.25) / 0.5); if (pa > 0) {
            const cx = BOX.x + BOX.w / 2; const cy = BOX.y + BOX.h / 2; ctx.save(); ctx.translate(cx, cy); ctx.scale(pa, pa);
            ctx.font = `900 ${84 * U}px ${FONT}`; const site = 'primepipfx.site'; const sw = ctx.measureText(site).width; const gg = ctx.createLinearGradient(-sw / 2, 0, sw / 2, 0); gg.addColorStop(0, th.a); gg.addColorStop(1, th.b); ctx.fillStyle = gg; ctx.textBaseline = 'middle'; ctx.fillText(site, -sw / 2, 0);
            ctx.font = `700 ${34 * U}px ${FONT}`; ctx.fillStyle = '#fff'; const sub = 'Link in bio'; ctx.fillText(sub, -ctx.measureText(sub).width / 2, 80 * U); ctx.font = `800 ${36 * U}px ${FONT}`; ctx.fillStyle = th.a; const ask = mode === 'ai' && lang === 'ur' ? 'Comment mein likhein: kaun sa feature pasand aaya?' : 'Comment: which feature do you want next?'; ctx.fillText(ask, -ctx.measureText(ask).width / 2, 150 * U); ctx.font = `700 ${30 * U}px ${FONT}`; ctx.fillStyle = '#fff'; const fol = mode === 'ai' && lang === 'ur' ? 'Follow karein, roz naya feature' : 'Follow for a new feature every day'; ctx.fillText(fol, -ctx.measureText(fol).width / 2, 205 * U); ctx.restore(); ctx.textBaseline = 'top';
          }
        }

        // footer: risk line and progress
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = `500 ${20 * U}px ${FONT}`; const d = 'Educational content, not financial advice. Trading carries risk.'; ctx.fillText(d, W / 2 - ctx.measureText(d).width / 2, H - 52 * U);
        ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(0, H - 12 * U, W, 12 * U); ctx.fillStyle = th.a; ctx.fillRect(0, H - 12 * U, W * (t / total), 12 * U);
        // cut flash
        const fa = Math.max(0, 1 - since / 0.3); if (fa > 0 && i > 0) { ctx.fillStyle = `rgba(255,255,255,${0.18 * fa})`; ctx.fillRect(0, 0, W, H); }
        o.onProgress?.(t / total, s.kind === 'part' ? `Recording ${o.title}: ${s.label} (${partNo}/${partTotal})` : `Recording ${o.title}`);
        requestAnimationFrame(tick);
      };
      tick();
    });
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    rec.stop(); let blob = await finished;
    if (o.finish !== false) { o.onProgress?.(1, 'Finishing the video (MP4, loudness)'); blob = await finishOnServer(blob); }
    if (captions) { captions.stop(); tourStore.lastSrt = toSrt(captions.lines()); } else tourStore.lastSrt = '';
    void ac.close();
    tourStore.videos[o.tab] = { blob, title: o.title, at: Date.now() };
    if (mode === 'ai' && silent) o.onProgress?.(1, `${silent} line(s) had no Urdu voice: those use captions only`);
    return blob;
  } finally {
    captions?.stop(); mic?.getTracks().forEach((t) => t.stop()); setSkipTablists([]);
    tourStore.running = false; window.scrollTo(0, 0);
    if (own) { own.stream.getTracks().forEach((t) => t.stop()); go(o.returnTab || 'ADMIN'); if ((o.returnTab || 'ADMIN') === 'ADMIN') reopenStudio(); }
  }
}

/** One "Share this tab" click, then every listed topic gets its own recorded tour (batch). */
export async function recordTours(items: Omit<TourOpts, 'returnTab'>[], onEach?: (i: number, n: number, ok: boolean, msg?: string) => void, returnTab = 'ADMIN'): Promise<void> {
  const scr = await openScreen();
  try { for (let i = 0; i < items.length; i++) { try { await recordTour({ ...items[i], returnTab }, scr); onEach?.(i, items.length, true); } catch (e: any) { onEach?.(i, items.length, false, String(e?.message || e)); } } }
  finally { scr.stream.getTracks().forEach((t) => t.stop()); go(returnTab); if (returnTab === 'ADMIN') reopenStudio(); }
}

export interface StreamItem { tab: string; title: string; features?: string[]; theme: number; script: () => Promise<TourScript> }
export interface StreamOpts { voice: boolean; audio?: AudioMode; secondsPerPart?: number; voiceLang: 'ur' | 'en'; format?: VideoFormatId; stop: { stop: boolean }; pauseMs?: number; onVideo: (v: { title: string; url: string; bytes: number; at: number; ext: string }) => void; onStatus: (s: string) => void }
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
        const blob = await recordTour({ tab: it.tab, title: it.title, script, theme: it.theme, voice: opts.voice, audio: opts.audio, secondsPerPart: opts.secondsPerPart, features: it.features, voiceLang: opts.voiceLang, format: opts.format, onProgress: (p, label) => opts.onStatus(`(${i + 1}/${items.length}) ${it.title}: ${label || Math.round(p * 100) + '%'}`) }, scr);
        opts.onVideo({ title: it.title, url: URL.createObjectURL(blob), bytes: blob.size, at: Date.now(), ext: blob.type.includes('mp4') ? 'mp4' : 'webm' });
      } catch (e: any) { opts.onStatus(`Skipped ${it.title}: ${String(e?.message || e)}`); }
      await sleep(opts.pauseMs ?? 1500);
    }
  } finally { scr.stream.getTracks().forEach((t) => t.stop()); go('ADMIN'); }
}

export interface SeriesOpts { tab: string; title: string; theme: number; features?: string[]; script: () => Promise<TourScript>; voice: boolean; audio?: AudioMode; secondsPerPart?: number; voiceLang: 'ur' | 'en'; format?: VideoFormatId; stop: { stop: boolean }; onVideo: (blob: Blob, meta: { label: string; index: number; total: number }) => void | Promise<void>; onStatus: (s: string) => void }
export interface Leaf { path: string[]; label: string }
/** Every sub-category of a category, down to the last level of tabs, read from the live screen. Empty when it has none. */
export async function listSubTabs(tab: string): Promise<Leaf[]> {
  go(tab); await sleep(2500); for (let i = 0; i < 8 && !primaryTabs(); i++) await sleep(700);
  const prim = primaryTabs(); if (!prim) return [];
  const names = prim.tabs.map((t) => t.label); const leaves: Leaf[] = [];
  for (const name of names) {
    const cur = primaryTabs(); const t = cur?.tabs.find((x) => x.label === name); if (!cur || !t) continue;
    try { t.el.click(); } catch { /* skip */ } await sleep(1500);
    const nested = tablists([cur.list]).filter((l) => !l.list.contains(cur.list) && !cur.list.contains(l.list)); const seen = new Set<string>();
    for (const l of nested) for (const nt of l.tabs) { const k = nt.label.toLowerCase(); if (seen.has(k) || DANGEROUS.test(nt.label)) continue; seen.add(k); leaves.push({ path: [name, nt.label], label: `${name} › ${nt.label}` }); }
    if (!seen.size) leaves.push({ path: [name], label: name });
  }
  return leaves;
}
/** One permission click, then finished videos for every sub-category of the category (long ones in parts). Each is handed over as soon as it is ready. */
export async function recordSeries(o: SeriesOpts): Promise<number> {
  o.onStatus(`Reading every sub-category of ${o.title}…`); const subs = await listSubTabs(o.tab);
  if (!subs.length) { o.onStatus(`${o.title} has no sub-categories: recording it as one video`); const blob = await recordTour({ tab: o.tab, title: o.title, script: await o.script(), theme: o.theme, voice: o.voice, audio: o.audio, secondsPerPart: o.secondsPerPart, features: o.features, voiceLang: o.voiceLang, format: o.format, onProgress: (_p, l) => l && o.onStatus(l) }); await o.onVideo(blob, { label: o.title, index: 1, total: 1 }); return 1; }
  o.onStatus(`Found ${subs.length} sub-categories in ${o.title}: ${subs.map((x) => x.label).join(', ')}`); await sleep(1500);
  const scr = await openScreen(); let made = 0;
  try {
    for (let i = 0; i < subs.length && !o.stop.stop; i++) {
      const leaf = subs[i];
      for (let part = 0, parts = 1; part < parts && !o.stop.stop; part++) {
        o.onStatus(`(${i + 1}/${subs.length}) Recording ${leaf.label}${parts > 1 ? ` · part ${part + 1}/${parts}` : ''}…`);
        try {
          const blob = await recordTour({ tab: o.tab, title: o.title, script: await o.script(), theme: (o.theme + i + part) % THEMES.length, voice: o.voice, audio: o.audio, secondsPerPart: o.secondsPerPart, features: o.features, voiceLang: o.voiceLang, format: o.format, sub: { path: leaf.path, label: leaf.label, index: i + 1, total: subs.length, part }, onProgress: (_p, l) => l && o.onStatus(`(${i + 1}/${subs.length}) ${leaf.label}: ${l}`) }, scr);
          parts = Math.max(1, tourStore.lastParts || 1);
          await o.onVideo(blob, { label: parts > 1 ? `${leaf.label} (part ${part + 1}/${parts})` : leaf.label, index: i + 1, total: subs.length }); made++;
          // the next recording waits until this one has been uploaded, so recording and uploading never compete for the computer
          await sleep(2500); for (let k = 0; k < 200 && tourStore.uploading; k++) await sleep(3000);
        } catch (e: any) { o.onStatus(`Skipped ${leaf.label}: ${String(e?.message || e)}`); break; }
      }
    }
  } finally { scr.stream.getTracks().forEach((t) => t.stop()); go('ADMIN'); reopenStudio(); }
  return made;
}

/** Read-only helper: names of the parts the director finds on the screen that is open now (used to check narration coverage). */
if (typeof window !== 'undefined') (window as any).__ppParts = (title: string) => { try { return discoverBeats(findScroller(), title, 9).map((b) => b.label); } catch { return []; } };
(window as any).__ppFind = (src: string) => { try { const b = findByText(new RegExp(src, 'i')); if (!b) return null; const r = b.el.getBoundingClientRect(); return { label: b.label, tag: b.el.tagName, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), cls: String(b.el.className).slice(0, 70) }; } catch (e) { return String(e); } };

(window as any).__ppSubs = () => { const p = primaryTabs(); return p ? p.tabs.map((t) => ({ label: t.label, hint: t.hint })) : []; };
(window as any).__ppDescribe = () => { try { return discoverBeats(findScroller(), 'x', 11).map((b) => ({ label: b.label, click: !!b.click, say: describePart(b.el, b.label) })); } catch (e) { return String(e); } };
