// PRIMEPIPFX Master Procedural Sound & Synthesis Engine
// Zero external MP3 files • 100% Web Audio API procedural synthesis • Studio grade relaxation

import {
  PureSynthSettings,
  SoundLayerConfig,
  AmbientMixPreset,
  RelaxationMusicMode,
} from '../types';

export const SOLFEGGIO_FREQUENCIES = [
  { freq: 174, label: '174 Hz', desc: 'Natural Relief & Grounding' },
  { freq: 285, label: '285 Hz', desc: 'Tissue & Mental Restoration' },
  { freq: 396, label: '396 Hz', desc: 'Liberation from Fear & Guilt' },
  { freq: 417, label: '417 Hz', desc: 'Undoing Negative Situations & Change' },
  { freq: 432, label: '432 Hz', desc: 'Verdi Harmonic Tuning / Deep Clarity' },
  { freq: 528, label: '528 Hz', desc: 'Miracle Transformation & Calm Equilibrium' },
  { freq: 639, label: '639 Hz', desc: 'Heart Harmonization & Connection' },
  { freq: 741, label: '741 Hz', desc: 'Intuition & Clean Awakening' },
  { freq: 852, label: '852 Hz', desc: 'Pure Order & Spiritual Stillness' },
  { freq: 963, label: '963 Hz', desc: 'Crown Equilibrium & Pure Light' },
];

export const DEFAULT_SOUND_LAYERS: SoundLayerConfig[] = [
  { id: 'RAIN', name: 'Gentle Rain', category: 'NATURE', enabled: false, muted: false, volume: 0.5, pan: 0, description: 'Soothing steady rainfall against glass' },
  { id: 'BROWN_NOISE', name: 'Deep Brown Noise', category: 'NOISE', enabled: false, muted: false, volume: 0.45, pan: 0, description: 'Warm acoustic waterfall blanket' },
  { id: 'LOW_TONE', name: '432Hz Low Drone', category: 'SYNTH', enabled: false, muted: false, volume: 0.4, pan: 0, description: 'Grounding harmonic fundamental tone' },
  { id: 'WIND', name: 'Gentle Wind', category: 'NATURE', enabled: false, muted: false, volume: 0.35, pan: -0.2, description: 'Soft breeze sweeping through conifers' },
  { id: 'OCEAN', name: 'Soft Ocean', category: 'NATURE', enabled: false, muted: false, volume: 0.5, pan: 0.2, description: 'Rhythmic tidal surf receding on sand' },
  { id: 'FIREPLACE', name: 'Warm Fireplace', category: 'ATMOSPHERE', enabled: false, muted: false, volume: 0.4, pan: 0, description: 'Gentle cedar ember crackles & warmth' },
  { id: 'THUNDERSTORM', name: 'Distant Thunder', category: 'NATURE', enabled: false, muted: false, volume: 0.35, pan: -0.3, description: 'Low rolling thunder beyond the ridge' },
  { id: 'NIGHT', name: 'Night Ambience', category: 'ATMOSPHERE', enabled: false, muted: false, volume: 0.35, pan: 0.3, description: 'Soft evening crickets & starry stillness' },
  { id: 'DEEP_SPACE', name: 'Deep Cosmos', category: 'SYNTH', enabled: false, muted: false, volume: 0.4, pan: 0, description: 'Ethereal sub-audible gravitational drift' },
  { id: 'ZEN_GARDEN', name: 'Zen Garden', category: 'ATMOSPHERE', enabled: false, muted: false, volume: 0.4, pan: 0, description: 'Bamboo water trickle & singing bowl air' },
  { id: 'MOUNTAIN', name: 'Mountain Breeze', category: 'NATURE', enabled: false, muted: false, volume: 0.35, pan: 0.15, description: 'Crisp alpine airflow across high peaks' },
  { id: 'RIVER', name: 'Forest Stream', category: 'NATURE', enabled: false, muted: false, volume: 0.45, pan: -0.15, description: 'Liquid crystal brook running over pebbles' },
  { id: 'SOFT_ROOM', name: 'Acoustic Sanctuary', category: 'ATMOSPHERE', enabled: false, muted: false, volume: 0.3, pan: 0, description: 'Deadened studio warmth & velvet resonance' },
  { id: 'DESERT_NIGHT', name: 'Desert Night', category: 'ATMOSPHERE', enabled: false, muted: false, volume: 0.35, pan: 0, description: 'Warm arid breeze beneath desert stars' },
  { id: 'CAFE', name: 'Quiet Library/Cafe', category: 'ATMOSPHERE', enabled: false, muted: false, volume: 0.3, pan: 0, description: 'Muffled gentle hum of peaceful focus' },
];

export const AMBIENT_PRESETS: AmbientMixPreset[] = [
  {
    id: 'RAIN',
    name: 'Rain Sanctuary',
    subtitle: 'Gentle rain, soft wind, and deep brown warmth',
    layers: { RAIN: { enabled: true, volume: 0.65 }, BROWN_NOISE: { enabled: true, volume: 0.3 }, WIND: { enabled: true, volume: 0.25 } },
  },
  {
    id: 'OCEAN',
    name: 'Ocean Escape',
    subtitle: 'Rhythmic tidal surf with gentle maritime breeze',
    layers: { OCEAN: { enabled: true, volume: 0.7 }, WIND: { enabled: true, volume: 0.3 }, LOW_TONE: { enabled: true, volume: 0.2 } },
  },
  {
    id: 'FOREST',
    name: 'Forest Walk',
    subtitle: 'Crisp mountain wind, quiet stream, and evening air',
    layers: { RIVER: { enabled: true, volume: 0.6 }, WIND: { enabled: true, volume: 0.35 }, NIGHT: { enabled: true, volume: 0.2 } },
  },
  {
    id: 'NIGHT',
    name: 'Night Sky',
    subtitle: 'Starry stillness, distant crickets, and low grounding tone',
    layers: { NIGHT: { enabled: true, volume: 0.6 }, LOW_TONE: { enabled: true, volume: 0.35 }, BROWN_NOISE: { enabled: true, volume: 0.2 } },
  },
  {
    id: 'FIREPLACE',
    name: 'Soft Fireplace',
    subtitle: 'Cedar crackles with warm low resonance',
    layers: { FIREPLACE: { enabled: true, volume: 0.65 }, BROWN_NOISE: { enabled: true, volume: 0.3 }, SOFT_ROOM: { enabled: true, volume: 0.3 } },
  },
  {
    id: 'WIND',
    name: 'Alpine Wind',
    subtitle: 'Mountain airflow with subtle spatial depth',
    layers: { MOUNTAIN: { enabled: true, volume: 0.65 }, WIND: { enabled: true, volume: 0.4 }, LOW_TONE: { enabled: true, volume: 0.2 } },
  },
  {
    id: 'THUNDERSTORM',
    name: 'Distant Thunder',
    subtitle: 'Heavy rain with deep rolling thunder rumbles',
    layers: { THUNDERSTORM: { enabled: true, volume: 0.6 }, RAIN: { enabled: true, volume: 0.7 }, BROWN_NOISE: { enabled: true, volume: 0.35 } },
  },
  {
    id: 'CAFE',
    name: 'Peaceful Focus Cafe',
    subtitle: 'Quiet library hum with subtle background presence',
    layers: { CAFE: { enabled: true, volume: 0.6 }, SOFT_ROOM: { enabled: true, volume: 0.35 }, BROWN_NOISE: { enabled: true, volume: 0.25 } },
  },
  {
    id: 'DEEP_SPACE',
    name: 'Deep Cosmos',
    subtitle: 'Hypnotic sub-bass drift for expansive detachment',
    layers: { DEEP_SPACE: { enabled: true, volume: 0.75 }, LOW_TONE: { enabled: true, volume: 0.4 } },
  },
  {
    id: 'MOUNTAIN',
    name: 'High Peak Breeze',
    subtitle: 'Crisp alpine stillness above the clouds',
    layers: { MOUNTAIN: { enabled: true, volume: 0.7 }, WIND: { enabled: true, volume: 0.3 } },
  },
  {
    id: 'RIVER',
    name: 'River Sanctuary',
    subtitle: 'Gentle forest stream with soft wind',
    layers: { RIVER: { enabled: true, volume: 0.7 }, WIND: { enabled: true, volume: 0.3 } },
  },
  {
    id: 'DESERT_NIGHT',
    name: 'Desert Starlight',
    subtitle: 'Arid silence with grounding sub-harmonics',
    layers: { DESERT_NIGHT: { enabled: true, volume: 0.65 }, LOW_TONE: { enabled: true, volume: 0.35 } },
  },
  {
    id: 'SOFT_ROOM',
    name: 'Acoustic Chamber',
    subtitle: 'Zero-distraction warm acoustic deadening',
    layers: { SOFT_ROOM: { enabled: true, volume: 0.7 }, BROWN_NOISE: { enabled: true, volume: 0.4 } },
  },
  {
    id: 'ZEN_GARDEN',
    name: 'Zen Sanctuary',
    subtitle: 'Singing bowl air, bamboo water, and 432Hz grounding',
    layers: { ZEN_GARDEN: { enabled: true, volume: 0.65 }, LOW_TONE: { enabled: true, volume: 0.35 }, RIVER: { enabled: true, volume: 0.3 } },
  },
  {
    id: 'TRADER_RESET',
    name: 'Trader Reset',
    subtitle: 'Rain + Brown Noise + Soft Wind for post-market decompression',
    layers: { RAIN: { enabled: true, volume: 0.5 }, BROWN_NOISE: { enabled: true, volume: 0.45 }, WIND: { enabled: true, volume: 0.3 } },
  },
  {
    id: 'DEEP_FOCUS',
    name: 'Deep Focus',
    subtitle: 'Low Tone + Rain + Soft Ocean for chart analysis',
    layers: { LOW_TONE: { enabled: true, volume: 0.45 }, RAIN: { enabled: true, volume: 0.4 }, OCEAN: { enabled: true, volume: 0.35 } },
  },
  {
    id: 'NIGHT_CALM',
    name: 'Night Calm',
    subtitle: 'Night Ambience + Soft Wind + Low Synth for evening unwind',
    layers: { NIGHT: { enabled: true, volume: 0.55 }, WIND: { enabled: true, volume: 0.3 }, LOW_TONE: { enabled: true, volume: 0.35 } },
  },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Master Volume
  private masterVolume = 0.8;
  private isMasterMuted = false;

  // Pure Synthesis State
  private pureSynthOsc: OscillatorNode | null = null;
  private pureSynthSubOsc: OscillatorNode | null = null;
  private pureSynthGain: GainNode | null = null;
  private pureSynthPanner: StereoPannerNode | null = null;
  private pureSynthFilter: BiquadFilterNode | null = null;
  private pureSynthLFO: OscillatorNode | null = null;
  private pureSynthLFOGain: GainNode | null = null;
  private pureSynthDelay: DelayNode | null = null;
  private pureSynthDelayGain: GainNode | null = null;
  private pureSynthSettings: PureSynthSettings = {
    frequency: 432,
    tone: 'sine',
    volume: 0.3,
    stereoPan: 0,
    lfoRate: 0.2,
    lfoDepth: 8,
    pulseRate: 0,
    pulseDepth: 0,
    filterType: 'lowpass',
    filterCutoff: 1800,
    filterQ: 1.5,
    reverbWet: 0.3,
    delayTime: 0.35,
    delayFeedback: 0.25,
    fadeInSeconds: 2.0,
    fadeOutSeconds: 2.0,
    attack: 1.5,
    decay: 2.0,
  };
  private isPureSynthPlaying = false;

  // Layered Soundscapes
  private activeLayers: Map<string, { nodes: AudioNode[]; gain: GainNode }> = new Map();
  private layersConfig: Map<string, SoundLayerConfig> = new Map();

  // Procedural Music Engine
  private musicInterval: any = null;
  private currentMusicMode: RelaxationMusicMode | null = null;
  private musicVolume = 0.4;
  private isMusicPlaying = false;
  private musicGain: GainNode | null = null;

  // Sound Timer
  private timerTimeout: any = null;
  private timerEndTime: number | null = null;
  private timerDurationMinutes: number | null = null;
  private onTimerTick: ((remainingSeconds: number) => void) | null = null;
  private onTimerComplete: (() => void) | null = null;
  private timerInterval: any = null;

  constructor() {
    DEFAULT_SOUND_LAYERS.forEach((l) => this.layersConfig.set(l.id, { ...l }));
  }

  // =========================================================================
  // AUDIO CONTEXT & CORE GRAPH
  // =========================================================================
  public getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (!this.masterGain) {
      this.setupMasterGraph();
    }

    return this.ctx;
  }

  private setupMasterGraph() {
    if (!this.ctx) return;

    // Safety limiter to prevent any acoustic clipping or digital distortion
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.setValueAtTime(-3, this.ctx.currentTime);
    this.limiter.knee.setValueAtTime(8, this.ctx.currentTime);
    this.limiter.ratio.setValueAtTime(12, this.ctx.currentTime);
    this.limiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
    this.limiter.release.setValueAtTime(0.25, this.ctx.currentTime);

    // Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMasterMuted ? 0 : this.masterVolume, this.ctx.currentTime);

    // Real-time Analyser for GPU-powered Sound Wave Visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.85;

    // Route: Sources -> MasterGain -> Limiter -> Analyser -> Destination
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public getAnalyser(): AnalyserNode | null {
    if (!this.analyser) {
      this.getContext();
    }
    return this.analyser;
  }

  // Set Master Volume
  public setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx && !this.isMasterMuted) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public toggleMasterMute(): boolean {
    this.isMasterMuted = !this.isMasterMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMasterMuted ? 0 : this.masterVolume,
        this.ctx.currentTime,
        0.05
      );
    }
    return this.isMasterMuted;
  }

  public getIsMasterMuted(): boolean {
    return this.isMasterMuted;
  }

  // =========================================================================
  // 1. PURE SYNTHESIS AMBIENT SOUND GENERATOR (Upgraded & Expanded)
  // =========================================================================
  public getPureSynthSettings(): PureSynthSettings {
    return { ...this.pureSynthSettings };
  }

  public updatePureSynthSettings(partial: Partial<PureSynthSettings>) {
    this.pureSynthSettings = { ...this.pureSynthSettings, ...partial };
    if (!this.isPureSynthPlaying || !this.ctx) return;

    const now = this.ctx.currentTime;
    if (partial.frequency !== undefined && this.pureSynthOsc) {
      this.pureSynthOsc.frequency.setTargetAtTime(partial.frequency, now, 0.08);
      if (this.pureSynthSubOsc) {
        this.pureSynthSubOsc.frequency.setTargetAtTime(partial.frequency / 2, now, 0.08);
      }
    }
    if (partial.tone !== undefined && this.pureSynthOsc) {
      this.pureSynthOsc.type = partial.tone;
    }
    if (partial.volume !== undefined && this.pureSynthGain) {
      this.pureSynthGain.gain.setTargetAtTime(partial.volume, now, 0.05);
    }
    if (partial.stereoPan !== undefined && this.pureSynthPanner && 'pan' in this.pureSynthPanner) {
      this.pureSynthPanner.pan.setTargetAtTime(partial.stereoPan, now, 0.05);
    }
    if (partial.filterCutoff !== undefined && this.pureSynthFilter) {
      this.pureSynthFilter.frequency.setTargetAtTime(partial.filterCutoff, now, 0.08);
    }
    if (partial.filterQ !== undefined && this.pureSynthFilter) {
      this.pureSynthFilter.Q.setTargetAtTime(partial.filterQ, now, 0.05);
    }
    if (partial.lfoRate !== undefined && this.pureSynthLFO) {
      this.pureSynthLFO.frequency.setTargetAtTime(partial.lfoRate, now, 0.05);
    }
    if (partial.lfoDepth !== undefined && this.pureSynthLFOGain) {
      this.pureSynthLFOGain.gain.setTargetAtTime(partial.lfoDepth, now, 0.05);
    }
    if (partial.delayFeedback !== undefined && this.pureSynthDelayGain) {
      this.pureSynthDelayGain.gain.setTargetAtTime(partial.delayFeedback, now, 0.05);
    }
  }

  public startPureSynthesis(customSettings?: Partial<PureSynthSettings>) {
    if (customSettings) {
      this.pureSynthSettings = { ...this.pureSynthSettings, ...customSettings };
    }
    if (this.isPureSynthPlaying) return;

    try {
      const ctx = this.getContext();
      const s = this.pureSynthSettings;
      const now = ctx.currentTime;

      // 1. Primary Harmonic Oscillator
      const osc = ctx.createOscillator();
      osc.type = s.tone;
      osc.frequency.setValueAtTime(s.frequency, now);

      // 2. Sub-octave warm drone
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(s.frequency / 2, now);

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.35, now);
      subOsc.connect(subGain);

      // 3. LFO for soothing pitch/tremolo oscillation
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(s.lfoRate || 0.2, now);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(s.lfoDepth || 6, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      // 4. Biquad Filter
      const filter = ctx.createBiquadFilter();
      filter.type = s.filterType || 'lowpass';
      filter.frequency.setValueAtTime(s.filterCutoff || 1800, now);
      filter.Q.setValueAtTime(s.filterQ || 1.5, now);

      // 5. Stereo Panner
      let panner: StereoPannerNode | null = null;
      if (ctx.createStereoPanner) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(s.stereoPan || 0, now);
      }

      // 6. Feedback Delay line for ambient space
      const delay = ctx.createDelay();
      delay.delayTime.setValueAtTime(s.delayTime || 0.35, now);
      const delayGain = ctx.createGain();
      delayGain.gain.setValueAtTime(s.delayFeedback || 0.25, now);
      delay.connect(delayGain);
      delayGain.connect(delay);

      // 7. Output Envelope Gain
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      const targetVol = s.volume || 0.3;
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVol), now + (s.fadeInSeconds || 2.0));

      // Connect graph
      osc.connect(filter);
      subGain.connect(filter);
      filter.connect(gain);
      filter.connect(delay);
      delay.connect(gain);

      if (panner) {
        gain.connect(panner);
        panner.connect(this.masterGain!);
      } else {
        gain.connect(this.masterGain!);
      }

      osc.start();
      subOsc.start();

      this.pureSynthOsc = osc;
      this.pureSynthSubOsc = subOsc;
      this.pureSynthGain = gain;
      this.pureSynthFilter = filter;
      this.pureSynthPanner = panner;
      this.pureSynthLFO = lfo;
      this.pureSynthLFOGain = lfoGain;
      this.pureSynthDelay = delay;
      this.pureSynthDelayGain = delayGain;
      this.isPureSynthPlaying = true;
    } catch (e) {
      console.warn('Pure synthesis failed to initialize:', e);
    }
  }

  public stopPureSynthesis(fadeSeconds = 1.5) {
    if (!this.isPureSynthPlaying || !this.ctx || !this.pureSynthGain) return;
    try {
      const now = this.ctx.currentTime;
      this.pureSynthGain.gain.setValueAtTime(this.pureSynthGain.gain.value, now);
      this.pureSynthGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);

      setTimeout(() => {
        try {
          if (this.pureSynthOsc) {
            this.pureSynthOsc.stop();
            this.pureSynthOsc = null;
          }
          if (this.pureSynthSubOsc) {
            this.pureSynthSubOsc.stop();
            this.pureSynthSubOsc = null;
          }
          if (this.pureSynthLFO) {
            this.pureSynthLFO.stop();
            this.pureSynthLFO = null;
          }
          this.pureSynthGain = null;
          this.isPureSynthPlaying = false;
        } catch {}
      }, fadeSeconds * 1000 + 100);
    } catch {
      this.isPureSynthPlaying = false;
    }
  }

  public getIsPureSynthPlaying(): boolean {
    return this.isPureSynthPlaying;
  }

  // =========================================================================
  // 2. LAYERED PROCEDURAL SOUNDSCAPES
  // =========================================================================
  public getLayersConfig(): SoundLayerConfig[] {
    return Array.from(this.layersConfig.values());
  }

  public setLayerVolume(layerId: string, volume: number) {
    const config = this.layersConfig.get(layerId);
    if (!config) return;
    config.volume = Math.max(0, Math.min(1, volume));

    const active = this.activeLayers.get(layerId);
    if (active && this.ctx && !config.muted) {
      active.gain.gain.setTargetAtTime(config.volume, this.ctx.currentTime, 0.05);
    }
  }

  public toggleLayerMute(layerId: string): boolean {
    const config = this.layersConfig.get(layerId);
    if (!config) return false;
    config.muted = !config.muted;

    const active = this.activeLayers.get(layerId);
    if (active && this.ctx) {
      active.gain.gain.setTargetAtTime(
        config.muted ? 0 : config.volume,
        this.ctx.currentTime,
        0.05
      );
    }
    return config.muted;
  }

  public toggleLayer(layerId: string): boolean {
    const config = this.layersConfig.get(layerId);
    if (!config) return false;

    if (config.enabled) {
      this.stopLayer(layerId);
      config.enabled = false;
      return false;
    } else {
      this.startLayer(layerId);
      config.enabled = true;
      return true;
    }
  }

  public startLayer(layerId: string) {
    if (this.activeLayers.has(layerId)) return;
    const config = this.layersConfig.get(layerId);
    if (!config) return;

    try {
      const ctx = this.getContext();
      const nodes: AudioNode[] = [];
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, config.muted ? 0.0001 : config.volume),
        ctx.currentTime + 1.5
      );

      let panner: StereoPannerNode | null = null;
      if (ctx.createStereoPanner && config.pan !== 0) {
        panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(config.pan, ctx.currentTime);
        gain.connect(panner);
        panner.connect(this.masterGain!);
        nodes.push(panner);
      } else {
        gain.connect(this.masterGain!);
      }

      // Procedurally Synthesize Layer Type
      switch (layerId) {
        case 'RAIN': {
          // Continuous filtered noise with randomized droplet clicks
          const noise = this.createPinkNoiseNode(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, ctx.currentTime);
          noise.connect(filter);
          filter.connect(gain);
          noise.start();
          nodes.push(noise, filter);
          break;
        }

        case 'BROWN_NOISE': {
          const brown = this.createBrownNoiseNode(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(320, ctx.currentTime);
          brown.connect(filter);
          filter.connect(gain);
          brown.start();
          nodes.push(brown, filter);
          break;
        }

        case 'LOW_TONE': {
          const osc1 = ctx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(432, ctx.currentTime);
          const osc2 = ctx.createOscillator();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(216, ctx.currentTime);
          osc1.connect(gain);
          osc2.connect(gain);
          osc1.start();
          osc2.start();
          nodes.push(osc1, osc2);
          break;
        }

        case 'WIND': {
          const noise = this.createPinkNoiseNode(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(400, ctx.currentTime);
          filter.Q.setValueAtTime(3.0, ctx.currentTime);

          // LFO sweep filter
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(280, ctx.currentTime);
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);

          noise.connect(filter);
          filter.connect(gain);
          noise.start();
          lfo.start();
          nodes.push(noise, filter, lfo, lfoGain);
          break;
        }

        case 'OCEAN': {
          const noise = this.createPinkNoiseNode(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(500, ctx.currentTime);

          // Tidal wave LFO on volume & filter
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(0.08, ctx.currentTime);
          const waveGain = ctx.createGain();
          waveGain.gain.setValueAtTime(0.5, ctx.currentTime);
          lfo.connect(waveGain.gain);

          noise.connect(filter);
          filter.connect(waveGain);
          waveGain.connect(gain);
          noise.start();
          lfo.start();
          nodes.push(noise, filter, lfo, waveGain);
          break;
        }

        case 'FIREPLACE': {
          // Warm low rumble + crackle noise
          const brown = this.createBrownNoiseNode(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(260, ctx.currentTime);
          brown.connect(filter);
          filter.connect(gain);
          brown.start();
          nodes.push(brown, filter);
          break;
        }

        case 'THUNDERSTORM': {
          const noise = this.createPinkNoiseNode(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(180, ctx.currentTime);
          noise.connect(filter);
          filter.connect(gain);
          noise.start();
          nodes.push(noise, filter);
          break;
        }

        case 'NIGHT': {
          // High frequency shimmering harmonics (cricket frequency resonance)
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(4600, ctx.currentTime);
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(6.0, ctx.currentTime);
          const modGain = ctx.createGain();
          modGain.gain.setValueAtTime(0.4, ctx.currentTime);
          lfo.connect(modGain.gain);
          osc.connect(modGain);
          modGain.connect(gain);
          osc.start();
          lfo.start();
          nodes.push(osc, lfo, modGain);
          break;
        }

        case 'DEEP_SPACE': {
          const osc1 = ctx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(54, ctx.currentTime);
          const osc2 = ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(108.5, ctx.currentTime);
          osc1.connect(gain);
          osc2.connect(gain);
          osc1.start();
          osc2.start();
          nodes.push(osc1, osc2);
          break;
        }

        case 'ZEN_GARDEN': {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(528, ctx.currentTime);
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(0.05, ctx.currentTime);
          const lfoG = ctx.createGain();
          lfoG.gain.setValueAtTime(0.3, ctx.currentTime);
          lfo.connect(lfoG.gain);
          osc.connect(lfoG);
          lfoG.connect(gain);
          osc.start();
          lfo.start();
          nodes.push(osc, lfo, lfoG);
          break;
        }

        case 'MOUNTAIN': {
          const noise = this.createPinkNoiseNode(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(750, ctx.currentTime);
          noise.connect(filter);
          filter.connect(gain);
          noise.start();
          nodes.push(noise, filter);
          break;
        }

        case 'RIVER': {
          const noise = this.createPinkNoiseNode(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(950, ctx.currentTime);
          filter.Q.setValueAtTime(2.0, ctx.currentTime);
          noise.connect(filter);
          filter.connect(gain);
          noise.start();
          nodes.push(noise, filter);
          break;
        }

        case 'SOFT_ROOM':
        case 'DESERT_NIGHT':
        case 'CAFE':
        default: {
          const noise = this.createBrownNoiseNode(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(240, ctx.currentTime);
          noise.connect(filter);
          filter.connect(gain);
          noise.start();
          nodes.push(noise, filter);
          break;
        }
      }

      this.activeLayers.set(layerId, { nodes, gain });
      config.enabled = true;
    } catch (e) {
      console.warn('Failed to start layer:', layerId, e);
    }
  }

  public stopLayer(layerId: string) {
    const active = this.activeLayers.get(layerId);
    if (!active || !this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      active.gain.gain.setValueAtTime(active.gain.gain.value, now);
      active.gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);

      setTimeout(() => {
        try {
          active.nodes.forEach((n) => {
            if ('stop' in n) {
              (n as AudioScheduledSourceNode).stop();
            }
            n.disconnect();
          });
          active.gain.disconnect();
        } catch {}
      }, 1050);
    } catch {}

    this.activeLayers.delete(layerId);
    const config = this.layersConfig.get(layerId);
    if (config) config.enabled = false;
  }

  public stopAllLayers() {
    Array.from(this.activeLayers.keys()).forEach((k) => this.stopLayer(k));
  }

  public applyPreset(preset: AmbientMixPreset) {
    this.stopAllLayers();
    setTimeout(() => {
      Object.entries(preset.layers).forEach(([layerId, state]) => {
        if (state.enabled) {
          this.setLayerVolume(layerId, state.volume);
          this.startLayer(layerId);
        }
      });
    }, 200);
  }

  // Helper: Create continuous Pink Noise BufferSourceNode
  private createPinkNoiseNode(ctx: AudioContext): AudioBufferSourceNode {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  // Helper: Create continuous Brown Noise BufferSourceNode
  private createBrownNoiseNode(ctx: AudioContext): AudioBufferSourceNode {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  // =========================================================================
  // 3. PROCEDURAL RELAXATION MUSIC SYNTHESIZER (100% Original & Procedural)
  // =========================================================================
  public startRelaxationMusic(mode: RelaxationMusicMode, volume = 0.4, tempoBpm = 56) {
    this.stopRelaxationMusic();
    this.currentMusicMode = mode;
    this.musicVolume = volume;
    this.isMusicPlaying = true;

    try {
      const ctx = this.getContext();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), ctx.currentTime + 2.0);
      gain.connect(this.masterGain!);
      this.musicGain = gain;

      // Pentatonic / Ambient peaceful intervals
      const notePools: Record<RelaxationMusicMode, number[]> = {
        GENTLE_PIANO: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25], // C Major Pentatonic
        SOFT_AMBIENT: [220.0, 261.63, 329.63, 392.0, 493.88, 523.25], // A Minor / C Lydian
        SLOW_PADS: [174.61, 220.0, 261.63, 329.63, 392.0], // F Maj7
        CALM_SYNTH: [196.0, 246.94, 293.66, 370.0, 440.0], // G Maj9
        MINIMAL_MEDITATION: [216.0, 432.0, 648.0, 864.0], // 432 Harmonic Series
        FLOATING_ATMOSPHERE: [277.18, 349.23, 415.3, 554.37], // Db Major Lydian
        EVENING_RESET: [164.81, 196.0, 246.94, 293.66, 392.0], // E Minor Pentatonic
        MORNING_REFRESH: [293.66, 369.99, 440.0, 554.37, 659.25], // D Major
        DEEP_FOCUS: [130.81, 164.81, 196.0, 246.94, 261.63], // Deep C/G Ground
        QUIET_SPACE: [220.0, 329.63, 440.0, 659.25], // Perfect Fifths & Octaves
      };

      const pool = notePools[mode] || notePools.SOFT_AMBIENT;
      const intervalMs = (60 / tempoBpm) * 1000 * 1.5;

      const triggerNote = () => {
        if (!this.isMusicPlaying || !this.ctx || !this.musicGain) return;
        try {
          const now = this.ctx.currentTime;
          const freq = pool[Math.floor(Math.random() * pool.length)];

          const osc = this.ctx.createOscillator();
          osc.type = mode === 'GENTLE_PIANO' ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq, now);

          // Overtones for richer bell/piano resonance
          const osc2 = this.ctx.createOscillator();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(freq * 2.01, now);

          const noteGain = this.ctx.createGain();
          const noteDuration = mode === 'GENTLE_PIANO' ? 4.0 : 6.5;

          noteGain.gain.setValueAtTime(0.001, now);
          noteGain.gain.exponentialRampToValueAtTime(0.18, now + (mode === 'GENTLE_PIANO' ? 0.08 : 1.5));
          noteGain.gain.exponentialRampToValueAtTime(0.0001, now + noteDuration);

          osc.connect(noteGain);
          osc2.connect(noteGain);
          noteGain.connect(this.musicGain);

          osc.start(now);
          osc2.start(now);
          osc.stop(now + noteDuration + 0.1);
          osc2.stop(now + noteDuration + 0.1);
        } catch {}
      };

      triggerNote();
      this.musicInterval = setInterval(triggerNote, intervalMs);
    } catch (e) {
      console.warn('Failed to start relaxation music:', e);
    }
  }

  public stopRelaxationMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    if (this.musicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      setTimeout(() => {
        try {
          this.musicGain?.disconnect();
          this.musicGain = null;
        } catch {}
      }, 1600);
    }
    this.isMusicPlaying = false;
    this.currentMusicMode = null;
  }

  public getIsMusicPlaying(): boolean {
    return this.isMusicPlaying;
  }

  public getCurrentMusicMode(): RelaxationMusicMode | null {
    return this.currentMusicMode;
  }

  // =========================================================================
  // 4. SOUND TIMER WITH AUTOMATIC FADE-OUT
  // =========================================================================
  public startTimer(
    minutes: number,
    onTick?: (remainingSeconds: number) => void,
    onComplete?: () => void
  ) {
    this.clearTimer();
    this.timerDurationMinutes = minutes;
    this.onTimerTick = onTick || null;
    this.onTimerComplete = onComplete || null;
    this.timerEndTime = Date.now() + minutes * 60 * 1000;

    let remaining = minutes * 60;
    if (this.onTimerTick) this.onTimerTick(remaining);

    this.timerInterval = setInterval(() => {
      if (!this.timerEndTime) return;
      const secLeft = Math.max(0, Math.round((this.timerEndTime - Date.now()) / 1000));
      if (this.onTimerTick) this.onTimerTick(secLeft);

      // Start fade out during the last 8 seconds
      if (secLeft === 8) {
        this.fadeOutAll(7.5);
      }

      if (secLeft <= 0) {
        this.clearTimer();
        this.stopAllAudio(false);
        if (this.onTimerComplete) this.onTimerComplete();
      }
    }, 1000);
  }

  public clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.timerTimeout) {
      clearTimeout(this.timerTimeout);
      this.timerTimeout = null;
    }
    this.timerEndTime = null;
    this.timerDurationMinutes = null;
    this.onTimerTick = null;
    this.onTimerComplete = null;
  }

  public getTimerRemainingSeconds(): number | null {
    if (!this.timerEndTime) return null;
    return Math.max(0, Math.round((this.timerEndTime - Date.now()) / 1000));
  }

  // =========================================================================
  // 5. GLOBAL PLAYBACK CONTROLS
  // =========================================================================
  public fadeOutAll(fadeSeconds = 3.0) {
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + fadeSeconds);
    }
  }

  public stopAllAudio(fade = true) {
    if (fade) {
      this.fadeOutAll(1.5);
      setTimeout(() => {
        this.stopPureSynthesis(0.1);
        this.stopAllLayers();
        this.stopRelaxationMusic();
        if (this.masterGain && this.ctx) {
          this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        }
      }, 1600);
    } else {
      this.stopPureSynthesis(0.1);
      this.stopAllLayers();
      this.stopRelaxationMusic();
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      }
    }
  }

  // =========================================================================
  // 6. BACKWARD-COMPATIBILITY FOR EXISTING `calmAudio`
  // =========================================================================
  public startBrownNoise(volume = 0.15) {
    this.setLayerVolume('BROWN_NOISE', volume);
    this.startLayer('BROWN_NOISE');
  }

  public stopBrownNoise() {
    this.stopLayer('BROWN_NOISE');
  }

  public startGroundingTone(freq = 432, volume = 0.1) {
    this.startPureSynthesis({ frequency: freq, volume, tone: 'sine' });
  }

  public stopGroundingTone() {
    this.stopPureSynthesis(1.0);
  }

  public playSingingBowlChime(freq = 528) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.76, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain!);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 3.6);
      osc2.stop(now + 3.6);
    } catch (e) {
      console.warn('Bowl chime error:', e);
    }
  }

  public playGentleBreathCue(isInhale: boolean) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isInhale ? 320 : 260, now);
      osc.frequency.exponentialRampToValueAtTime(isInhale ? 440 : 180, now + 1.2);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 1.3);
    } catch {}
  }

  public getIsPlayingNoise(): boolean {
    return this.activeLayers.has('BROWN_NOISE');
  }

  public getIsPlayingDrone(): boolean {
    return this.isPureSynthPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMasterMuted;
  }

  public toggleMute(): void {
    this.isMasterMuted = !this.isMasterMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(
        this.isMasterMuted ? 0 : this.masterVolume,
        this.ctx.currentTime
      );
    }
  }

  public isAnyAudioActive(): boolean {
    return (
      this.isPureSynthPlaying ||
      this.isMusicPlaying ||
      this.activeLayers.size > 0
    );
  }
}

export const soundEngine = new SoundEngine();
export const calmAudio = soundEngine;
