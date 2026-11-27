/** Small synthesized sound engine for the arcade games (no audio files: everything is generated with the Web Audio API). */
export class Sfx {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;
  private music: { stop: () => void } | null = null;

  private ctx() {
    if (!this.ac) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext; if (!AC) return null;
      this.ac = new AC(); this.master = this.ac!.createGain(); this.master.gain.value = this.muted ? 0 : 0.7;
      const comp = this.ac!.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 8; this.master.connect(comp); comp.connect(this.ac!.destination);
      const len = this.ac!.sampleRate; this.noiseBuf = this.ac!.createBuffer(1, len, this.ac!.sampleRate); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ac!.state === 'suspended') void this.ac!.resume();
    return this.ac;
  }
  unlock() { this.ctx(); }
  setMuted(m: boolean) { this.muted = m; if (this.master && this.ac) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ac.currentTime, 0.03); }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0, dest?: AudioNode) {
    const ac = this.ctx(); if (!ac || this.muted) return; const t = ac.currentTime + delay;
    const o = ac.createOscillator(); const g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.master!); o.start(t); o.stop(t + dur + 0.03);
  }
  private noise(dur: number, vol: number, f0: number, f1: number, delay = 0, q = 0.8) {
    const ac = this.ctx(); if (!ac || this.muted || !this.noiseBuf) return; const t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = this.noiseBuf; const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(this.master!); s.start(t); s.stop(t + dur + 0.05);
  }

  laser(level = 1) { this.tone('sawtooth', 1500 - level * 60, 260, 0.11, 0.07); this.tone('square', 900, 200, 0.07, 0.03); }
  hit() { this.tone('square', 320, 90, 0.07, 0.07); this.noise(0.05, 0.12, 4000, 600); }
  boom(size = 1) { this.noise(0.45 + size * 0.25, 0.5 * Math.min(1.4, size), 2400, 90, 0, 0.5); this.tone('sine', 140, 28, 0.5 + size * 0.2, 0.45 * Math.min(1.3, size)); }
  hurt() { this.noise(0.5, 0.55, 1800, 80); this.tone('sawtooth', 220, 40, 0.5, 0.3); }
  power() { [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.14, 0.12, i * 0.06)); }
  levelUp() { [392, 523, 659, 784, 1047].forEach((f, i) => { this.tone('triangle', f, f * 1.01, 0.22, 0.14, i * 0.09); this.tone('sine', f / 2, f / 2, 0.22, 0.1, i * 0.09); }); }
  bomb() { this.noise(1.1, 0.7, 3000, 60, 0, 0.4); this.tone('sine', 90, 20, 1.0, 0.6); this.tone('sawtooth', 600, 40, 0.8, 0.2); }
  over() { [392, 330, 262, 196].forEach((f, i) => this.tone('sawtooth', f, f * 0.96, 0.35, 0.12, i * 0.22)); }
  plant() { this.tone('sine', 300, 520, 0.12, 0.15); this.noise(0.08, 0.08, 2500, 500); }
  pop() { this.tone('sine', 700, 1400, 0.09, 0.12); }
  sun() { this.tone('triangle', 880, 1320, 0.12, 0.13); this.tone('triangle', 1320, 1760, 0.12, 0.1, 0.07); }
  bite() { this.tone('square', 180, 120, 0.06, 0.07); }
  splat() { this.noise(0.18, 0.28, 1400, 200); this.tone('sine', 220, 90, 0.16, 0.2); }
  groan() { this.tone('sawtooth', 110, 70, 0.6, 0.05); }

  /** Looping ambient music: bass pulse + slow arpeggio, tempo rises with intensity (0..1). */
  startMusic(minor: number[], bpm = 100) {
    this.stopMusic(); const ac = this.ctx(); if (!ac) return;
    let step = 0; let intensity = 0; let alive = true; const bar = () => 60 / (bpm * (1 + intensity * 0.5)) / 2;
    const loop = () => {
      if (!alive) return;
      if (!this.muted) {
        const root = minor[Math.floor(step / 8) % minor.length]; const arp = [0, 7, 12, 7, 15, 12, 7, 3][step % 8];
        this.tone('sine', root / 2, root / 2, bar() * 1.8, 0.1); this.tone('triangle', root * Math.pow(2, arp / 12), root * Math.pow(2, arp / 12), bar() * 0.9, 0.05);
        if (step % 2 === 0) this.tone('sine', 70, 38, 0.12, 0.2 + intensity * 0.1);
      }
      step++; setTimeout(loop, bar() * 1000);
    };
    loop(); const m = { stop: () => { alive = false; }, set: (v: number) => { intensity = v; } } as any; this.music = m; return m as { stop: () => void; set: (v: number) => void };
  }
  setIntensity(v: number) { (this.music as any)?.set?.(v); }
  stopMusic() { this.music?.stop(); this.music = null; }
  dispose() { this.stopMusic(); try { void this.ac?.close(); } catch { /* ignore */ } this.ac = null; }
}
