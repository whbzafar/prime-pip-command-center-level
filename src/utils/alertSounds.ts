/**
 * Alert sounds, synthesised with WebAudio (no audio files to download).
 * Shared by the announcements centre and chart price alerts.
 */
export type SoundId = 'chime' | 'bell' | 'ping' | 'marimba' | 'pulse' | 'alarm';

export const SOUNDS: { id: SoundId; label: string }[] = [
  { id: 'chime', label: 'Soft chime' },
  { id: 'bell', label: 'Desk bell' },
  { id: 'ping', label: 'Crystal ping' },
  { id: 'marimba', label: 'Marimba' },
  { id: 'pulse', label: 'Double pulse' },
  { id: 'alarm', label: 'Trading alarm' },
];

type Note = { f: number; at: number; dur: number; type?: OscillatorType; vol?: number; partials?: number[] };

const PATTERNS: Record<SoundId, Note[]> = {
  // E5 G#5 B5 — bright major arpeggio
  chime: [659.25, 830.61, 987.77].map((f, i) => ({ f, at: i * 0.16, dur: 0.9, vol: 0.17 })),
  // struck bell: fundamental + inharmonic partials, long decay
  bell: [{ f: 880, at: 0, dur: 1.8, vol: 0.16, partials: [2.4, 3.9, 5.4] }],
  // short high glassy ping, repeated softly
  ping: [{ f: 1760, at: 0, dur: 0.45, vol: 0.12, partials: [2] }, { f: 1760, at: 0.22, dur: 0.5, vol: 0.06, partials: [2] }],
  // warm wooden notes
  marimba: [523.25, 659.25, 783.99, 1046.5].map((f, i) => ({ f, at: i * 0.11, dur: 0.35, type: 'triangle' as OscillatorType, vol: 0.2, partials: [4] })),
  // two firm beeps
  pulse: [{ f: 988, at: 0, dur: 0.16, type: 'square', vol: 0.06 }, { f: 988, at: 0.24, dur: 0.16, type: 'square', vol: 0.06 }],
  // rising three-tone, twice
  alarm: [0, 0.5].flatMap((o) => [740, 932, 1175].map((f, i) => ({ f, at: o + i * 0.12, dur: 0.14, type: 'sawtooth' as OscillatorType, vol: 0.05 }))),
};

// One shared audio engine. Phones (iPhone above all) keep audio muted until the person has tapped
// the page once; a context created later, outside a tap, stays silent. So the engine is created and
// unlocked on the first tap anywhere, and every alert reuses it.
let shared: AudioContext | null = null;
const getCtx = (): AudioContext | null => {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!shared || (shared as any).state === 'closed') shared = new Ctx();
    return shared;
  } catch { return null; }
};
let unlocked = false;
export const audioUnlocked = () => unlocked;
export function unlockAudio() {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
    // a silent blip inside the tap is what actually unlocks iOS
    const b = ctx.createBuffer(1, 1, 22050); const src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0);
    unlocked = true;
  } catch { /* ignore */ }
  try { if ('speechSynthesis' in window && !(window as any).__ppfxSpeechPrimed) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); (window as any).__ppfxSpeechPrimed = true; } } catch { /* ignore */ }
}
if (typeof window !== 'undefined') {
  const once = () => { unlockAudio(); };
  window.addEventListener('pointerdown', once, { passive: true });
  window.addEventListener('touchend', once, { passive: true });
  window.addEventListener('keydown', once);
}

export function playSound(id: SoundId = 'chime', volume = 1) {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const master = ctx.createGain();
    master.gain.value = Math.max(0, Math.min(1, volume));
    master.connect(ctx.destination);
    for (const n of PATTERNS[id] || PATTERNS.chime) {
      const t = ctx.currentTime + 0.03 + n.at;
      for (const [k, mult] of [1, ...(n.partials || [])].entries()) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = k === 0 ? n.type || 'sine' : 'sine';
        o.frequency.value = n.f * mult;
        const v = (n.vol ?? 0.15) / (k === 0 ? 1 : 2.5 * k);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n.dur / (k === 0 ? 1 : 1 + k * 0.6));
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + n.dur + 0.05);
      }
    }
  } catch { /* audio blocked until the user interacts */ }
}

/** Reads a short message aloud (e.g. "Buy, G B P, C A D. Level 1 reached."). */
export function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 1; u.volume = 1; u.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch { /* not supported */ }
}

/** "GBP/CAD" → "G B P, C A D" so the pair is spelled out clearly. */
export const spokenPair = (display: string) => display.split('/').map((p) => (/^[A-Z]{2,5}$/.test(p) ? p.split('').join(' ') : p)).join(', ');
