/**
 * "Beyond the stars": an 11 second score built live with the Web Audio API (no audio files, no cost).
 * Arc: a slow breath of drone -> a pulse that quickens -> a riser -> a burst of light and a rising
 * melody -> one clean, bright final chord that stops sharply.
 * Every event is scheduled up front from a single start time so the picture can stay in step.
 */
export const SCORE_LENGTH = 13.2; // seconds
export const END_AT = 12.48; // the last hit, one beat after the final bar of the drop
const BURST = 6.9; // the moment the new world appears (the drop of the track lands here)
export const BEAT = 0.697; // seconds per beat of the track (about 86 bpm), counted from the burst

// the soundtrack file is decoded once and kept; if it cannot be loaded the generated score plays alone
let themeP: Promise<AudioBuffer | null> | null = null;
const loadTheme = () => (themeP ||= (async () => {
  try {
    const r = await fetch("/iqbal-theme-v2.mp3"); if (!r.ok) return null;
    const OAC: typeof OfflineAudioContext | undefined = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext; if (!OAC) return null;
    return await new OAC(2, 44100, 44100).decodeAudioData(await r.arrayBuffer());
  } catch { return null; }
})());

const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // MIDI note -> Hz
const D = { d2: 38, a2: 45, d3: 50, a3: 57, d4: 62, e4: 64, fs4: 66, a4: 69, b4: 71, d5: 74, e5: 76, fs5: 78, a5: 81, b5: 83, d6: 86, a6: 93 };

export type Score = { start: () => Promise<boolean>; stop: (fade?: number) => void; setMuted: (m: boolean) => void; canPlay: () => boolean; running: () => boolean };

export function createScore(): Score {
  const AC: typeof AudioContext | undefined = typeof window !== "undefined" ? (window.AudioContext || (window as any).webkitAudioContext) : undefined;
  void loadTheme();
  let pending: Promise<boolean> | null = null;
  let ctx: AudioContext | null = null; let master: GainNode | null = null; let muted = false; let live = false; let ender: ReturnType<typeof setTimeout> | undefined;

  const noiseBuf = (c: AudioContext, sec: number) => { const b = c.createBuffer(1, Math.ceil(c.sampleRate * sec), c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };

  function build(c: AudioContext, t0: number, theme: AudioBuffer | null) {
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.25;
    master = c.createGain(); master.gain.value = muted ? 0 : 0.85; comp.connect(master); master.connect(c.destination);
    // space: a short synthetic reverb plus a gentle echo
    const rv = c.createConvolver(); const ir = c.createBuffer(2, Math.ceil(c.sampleRate * 2.4), c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); } rv.buffer = ir;
    const wet = c.createGain(); wet.gain.value = 0.42; rv.connect(wet); wet.connect(comp);
    const dry = c.createGain(); dry.gain.value = 0.9; dry.connect(comp); dry.connect(rv);
    const echo = c.createDelay(1); echo.delayTime.value = 0.3; const fb = c.createGain(); fb.gain.value = 0.34; const ef = c.createBiquadFilter(); ef.type = "lowpass"; ef.frequency.value = 2600; echo.connect(ef); ef.connect(fb); fb.connect(echo); ef.connect(wet);
    const bus = c.createGain(); bus.gain.value = 1; bus.connect(dry); const ebus = c.createGain(); ebus.gain.value = 0.5; ebus.connect(echo);

    const env = (g: GainNode, at: number, a: number, peak: number, rel: number, hold = 0) => { g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(peak, at + a); if (hold) g.gain.setValueAtTime(peak, at + a + hold); g.gain.exponentialRampToValueAtTime(0.0001, at + a + hold + rel); };
    const tone = (type: OscillatorType, freq: number, at: number, a: number, peak: number, rel: number, hold = 0, dest: AudioNode = bus, send = 0, det = 0) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = det; const g = c.createGain(); env(g, at, a, peak, rel, hold); o.connect(g); g.connect(dest); if (send) { const s = c.createGain(); s.gain.value = send; g.connect(s); s.connect(ebus); } o.start(at); o.stop(at + a + hold + rel + 0.05);
    };

    if (theme) {
      // the track: it opens muffled and quiet, brightens as the rush builds, and is fully open when the drop lands
      const src = c.createBufferSource(); src.buffer = theme; const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.8;
      lp.frequency.setValueAtTime(380, t0); lp.frequency.exponentialRampToValueAtTime(15000, t0 + BURST - 0.05); lp.frequency.setValueAtTime(22000, t0 + BURST);
      const tg = c.createGain(); tg.gain.setValueAtTime(0.5, t0); tg.gain.linearRampToValueAtTime(0.78, t0 + BURST - 0.1); tg.gain.setValueAtTime(1, t0 + BURST);
      src.connect(lp); lp.connect(tg); tg.connect(comp); src.start(t0);
    }
    if (!theme) {
    // 1. the drone: a slow breath that opens up as the pulse quickens
    for (const [n, det, type] of [[D.d2, 0, "sawtooth"], [D.d2, 7, "sawtooth"], [D.a2, -5, "triangle"]] as [number, number, OscillatorType][]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = hz(n); o.detune.value = det; const f = c.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 2; f.frequency.setValueAtTime(140, t0); f.frequency.exponentialRampToValueAtTime(2400, t0 + BURST - 0.1); f.frequency.exponentialRampToValueAtTime(700, t0 + BURST + 1.2);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.16, t0 + 2.4); g.gain.linearRampToValueAtTime(0.24, t0 + BURST); g.gain.linearRampToValueAtTime(0.13, t0 + SCORE_LENGTH - 0.9); g.gain.setValueAtTime(0.13, t0 + 10.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 10.5);
      o.connect(f); f.connect(g); g.connect(bus); o.start(t0); o.stop(t0 + SCORE_LENGTH);
    }
    // 2. pads: Dsus -> Bm -> G -> D, a long inhale
    const chords: [number, number[]][] = [[0.4, [D.d3, D.a3, D.e4, D.a4]], [2.9, [D.d3 - 3, D.d4, D.fs4, D.a4]], [4.9, [D.d3 - 5, D.d4, D.b4, D.d5]], [BURST, [D.d3, D.a3, D.fs4, D.a4, D.d5]]];
    chords.forEach(([at, ns], i) => { const len = (chords[i + 1]?.[0] ?? 10.3) - at + 0.6; ns.forEach((n, k) => tone(k % 2 ? "sine" : "triangle", hz(n), t0 + at, 1.1, 0.07 + (i === 3 ? 0.03 : 0), 1.2, Math.max(0, len - 1.1), bus, 0.15, (k - 2) * 4)); });

    // 3. the pulse: a plucked arpeggio that keeps getting quicker and higher
    const seq = [D.d4, D.a4, D.fs4, D.a4, D.e4, D.b4, D.fs4, D.d5, D.a4, D.e5, D.b4, D.fs5, D.d5, D.a5, D.e5, D.b5];
    let at = 1.5, i = 0; while (at < BURST - 0.05) { const p = (at - 1.5) / (BURST - 1.5); const n = seq[Math.min(seq.length - 1, Math.floor(p * seq.length * 1.6) % seq.length)]; tone("triangle", hz(n), t0 + at, 0.008, 0.07 + p * 0.07, 0.35 - p * 0.18, 0, bus, 0.35); at += 0.5 - 0.39 * Math.pow(p, 0.8); i++; }

    }
    // 4. the heartbeat: a soft kick that races from calm to urgent
    let kt = 2.6; while (kt < BURST - 0.05) { const p = (kt - 2.6) / (BURST - 2.6); const o = c.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(130, t0 + kt); o.frequency.exponentialRampToValueAtTime(42, t0 + kt + 0.16); const g = c.createGain(); env(g, t0 + kt, 0.004, 0.45 + p * 0.3, 0.26); o.connect(g); g.connect(comp); o.start(t0 + kt); o.stop(t0 + kt + 0.4); kt += 0.95 - 0.78 * Math.pow(p, 0.7); }
    // 5. the riser: air rushing past, climbing in pitch and volume
    const nz = c.createBufferSource(); nz.buffer = noiseBuf(c, 8); const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.4; bp.frequency.setValueAtTime(260, t0 + 2.2); bp.frequency.exponentialRampToValueAtTime(9000, t0 + BURST - 0.02); const ng = c.createGain(); ng.gain.setValueAtTime(0.0001, t0 + 2.2); ng.gain.exponentialRampToValueAtTime(0.5, t0 + BURST - 0.05); ng.gain.setValueAtTime(0.0001, t0 + BURST); nz.connect(bp); bp.connect(ng); ng.connect(dry); nz.start(t0 + 2.2); nz.stop(t0 + BURST + 0.05);
    // a rising sweep underneath it
    const sw = c.createOscillator(); sw.type = "sawtooth"; sw.frequency.setValueAtTime(hz(D.d3), t0 + 3.5); sw.frequency.exponentialRampToValueAtTime(hz(D.d5 + 12), t0 + BURST); const swf = c.createBiquadFilter(); swf.type = "lowpass"; swf.frequency.value = 3200; const swg = c.createGain(); swg.gain.setValueAtTime(0.0001, t0 + 3.5); swg.gain.exponentialRampToValueAtTime(0.09, t0 + BURST - 0.05); swg.gain.setValueAtTime(0.0001, t0 + BURST + 0.02); sw.connect(swf); swf.connect(swg); swg.connect(bus); sw.start(t0 + 3.5); sw.stop(t0 + BURST + 0.1);

    // 6. the burst: impact, shimmer, and the melody that says "there is more"
    const B = t0 + BURST;
    const boom = c.createOscillator(); boom.type = "sine"; boom.frequency.setValueAtTime(90, B); boom.frequency.exponentialRampToValueAtTime(30, B + 1.6); const bg = c.createGain(); env(bg, B, 0.006, 0.95, 2.0); boom.connect(bg); bg.connect(comp); boom.start(B); boom.stop(B + 2.2);
    const crash = c.createBufferSource(); crash.buffer = noiseBuf(c, 2.4); const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3800; const cg = c.createGain(); env(cg, B, 0.005, 0.36, 1.9); crash.connect(hp); hp.connect(cg); cg.connect(dry); crash.start(B); crash.stop(B + 2.3);
    if (!theme) {
    const mel: [number, number, number][] = [[0.15, D.a4, 0.7], [0.55, D.d5, 0.7], [0.95, D.fs5, 0.9], [1.65, D.a5, 1.15], [2.65, D.fs5, 0.5], [3.1, D.e5, 0.5], [3.55, D.d5, 1.2]];
    mel.forEach(([off, n, len]) => { const f = hz(n); tone("triangle", f, B + off, 0.02, 0.2, 0.5, len, bus, 0.45); tone("sine", f * 2, B + off, 0.02, 0.06, 0.4, len * 0.8, bus, 0.5); });
    [D.d6, D.a6, D.fs5 + 12, D.d6, D.a6].forEach((n, k) => tone("sine", hz(n), B + 0.5 + k * 0.42, 0.005, 0.07, 1.0, 0, bus, 0.6));
    }
    // 7. the end: one bright, full chord, struck once and cut clean
    const E = t0 + END_AT;
    if (!theme) [D.d2, D.d3, D.a3, D.d4, D.fs4, D.a4, D.d5, D.fs5, D.a5].forEach((n) => tone(n < D.d4 ? "sawtooth" : "triangle", hz(n), E, 0.008, n < D.d4 ? 0.06 : 0.1, 0.34, 0.1, bus, 0.1));
    const fin = c.createBufferSource(); fin.buffer = noiseBuf(c, 0.8); const fh = c.createBiquadFilter(); fh.type = "highpass"; fh.frequency.value = 5000; const fg = c.createGain(); env(fg, E, 0.003, 0.28, 0.45); fin.connect(fh); fh.connect(fg); fg.connect(dry); fin.start(E); fin.stop(E + 0.6);
    const kick = c.createOscillator(); kick.type = "sine"; kick.frequency.setValueAtTime(110, E); kick.frequency.exponentialRampToValueAtTime(40, E + 0.3); const kg = c.createGain(); env(kg, E, 0.004, 0.8, 0.5); kick.connect(kg); kg.connect(comp); kick.start(E); kick.stop(E + 0.7);
    // hard stop right after the last hit
    master.gain.setValueAtTime(muted ? 0 : 0.85, t0 + END_AT + 0.16); master.gain.linearRampToValueAtTime(0, t0 + END_AT + 0.2);
  }

  return {
    canPlay: () => !!AC,
    running: () => live,
    start: (): Promise<boolean> => (pending ||= (async () => {
      if (!AC || live) return live;
      try {
        const c = new AC();
        // Browsers keep audio silent until the visitor has touched the page. Only a context that is really running may be scheduled, or the music would start out of step with the picture.
        if (c.state !== "running") await Promise.race([c.resume().catch(() => undefined), new Promise((r) => setTimeout(r, 180))]);
        if (c.state !== "running") { void c.close().catch(() => undefined); return false; }
        const theme = await Promise.race([loadTheme(), new Promise<null>((r) => setTimeout(() => r(null), 1500))]);
        ctx = c; build(c, c.currentTime + 0.06, theme); live = true; clearTimeout(ender);
        ender = setTimeout(() => { try { void c.close(); } catch { /* closed */ } live = false; }, (SCORE_LENGTH + 1) * 1000); return true;
      } catch { live = false; return false; }
    })().finally(() => { pending = null; })),
    stop: (fade = 0.25) => { if (!ctx) return; clearTimeout(ender); try { master?.gain.cancelScheduledValues(ctx.currentTime); master?.gain.setValueAtTime(master.gain.value, ctx.currentTime); master?.gain.linearRampToValueAtTime(0, ctx.currentTime + fade); const c = ctx; setTimeout(() => { try { void c.close(); } catch { /* closed */ } }, fade * 1000 + 60); } catch { /* closed */ } live = false; ctx = null; },
    setMuted: (m) => { muted = m; if (ctx && master) { master.gain.cancelScheduledValues(ctx.currentTime); master.gain.setValueAtTime(master.gain.value, ctx.currentTime); master.gain.linearRampToValueAtTime(m ? 0 : 0.85, ctx.currentTime + 0.12); } },
  };
}
