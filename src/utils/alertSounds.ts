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

export function playSound(id: SoundId = 'chime', volume = 1) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    const master = ctx.createGain();
    master.gain.value = Math.max(0, Math.min(1, volume));
    master.connect(ctx.destination);
    let end = 0;
    for (const n of PATTERNS[id] || PATTERNS.chime) {
      const t = ctx.currentTime + n.at;
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
      end = Math.max(end, n.at + n.dur);
    }
    setTimeout(() => { try { ctx.close(); } catch { /* ignore */ } }, (end + 0.5) * 1000);
  } catch { /* audio blocked until the user interacts */ }
}
