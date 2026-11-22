/** Subtle "3 AM neon-noir" ambience synthesised with Web Audio (no audio files, no licensing): slow Dm9 pad, dark low-pass, generated reverb, sparse bell notes, faint rain-like noise. */
export interface Ambient { stop: () => void; setMuted: (m: boolean) => void; resume: () => Promise<boolean> }
export function startNoirAmbient(volume = 0.18): Ambient | null {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return null;
  const ctx: AudioContext = new AC();
  const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.6; lp.connect(master);
  // generated reverb tail
  const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const verb = ctx.createConvolver(); verb.buffer = ir; const wet = ctx.createGain(); wet.gain.value = 0.55; verb.connect(wet); wet.connect(lp);
  const dry = ctx.createGain(); dry.gain.value = 0.7; dry.connect(lp);
  const bus = ctx.createGain(); bus.connect(dry); bus.connect(verb);
  // slow filter sweep
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.045; const lg = ctx.createGain(); lg.gain.value = 320; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
  const pad = [38, 50, 53, 57, 60, 64]; // D1 D2 F2 A2 C3 E3  (Dm9)
  pad.forEach((m, i) => {
    [-6, 6].forEach((det) => {
      const o = ctx.createOscillator(); o.type = i < 2 ? 'sine' : 'triangle'; o.frequency.value = hz(m); o.detune.value = det;
      const g = ctx.createGain(); g.gain.value = i < 2 ? 0.1 : 0.045; o.connect(g); g.connect(bus); o.start();
    });
  });
  // faint rain noise
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 3800; nf.Q.value = 0.5; const ng = ctx.createGain(); ng.gain.value = 0.012; ns.connect(nf); nf.connect(ng); ng.connect(bus); ns.start();
  // sparse bell arpeggio
  const scale = [62, 65, 69, 72, 76, 74, 69, 65]; let step = 0; let alive = true;
  const bell = () => {
    if (!alive) return;
    if (ctx.state === 'running') {
      const t = ctx.currentTime, m = scale[step++ % scale.length] + (Math.random() < 0.15 ? 12 : 0);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m); const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t + 3.4);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + 3.6);
    }
    setTimeout(bell, 2600 + Math.random() * 2600);
  };
  setTimeout(bell, 1800);
  let muted = false;
  const fadeTo = (v: number, s: number) => { const t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(v, t + s); };
  const resume = async () => { try { await ctx.resume(); } catch { /* blocked */ } if (ctx.state === 'running') { fadeTo(muted ? 0 : volume, 3); return true; } return false; };
  void resume();
  return {
    resume,
    setMuted: (m) => { muted = m; fadeTo(m ? 0 : volume, 0.6); },
    stop: () => { alive = false; fadeTo(0, 1.6); setTimeout(() => { try { void ctx.close(); } catch { /* ignore */ } }, 1900); },
  };
}
