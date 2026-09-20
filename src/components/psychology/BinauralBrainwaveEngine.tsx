import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Headphones,
  Activity,
  Sliders,
  Sparkles,
  Zap,
  Moon,
  Sun,
  Shield,
} from 'lucide-react';

export type BrainwaveBand = 'ALPHA' | 'THETA' | 'BETA' | 'DELTA';

interface FrequencyPreset {
  id: BrainwaveBand;
  name: string;
  hz: number;
  carrierHz: number;
  tagline: string;
  description: string;
  color: string;
  borderColor: string;
  badgeBg: string;
  icon: React.ElementType;
}

const PRESETS: FrequencyPreset[] = [
  {
    id: 'ALPHA',
    name: 'Alpha Flow (10.0 Hz)',
    hz: 10.0,
    carrierHz: 216.0,
    tagline: 'Execution Flow & Calm Alertness',
    description: 'Optimal state for active charting and trade execution. Keeps autonomic arousal balanced.',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/40',
    badgeBg: 'bg-cyan-950/60 text-cyan-300',
    icon: Sparkles,
  },
  {
    id: 'THETA',
    name: 'Theta Reset (6.0 Hz)',
    hz: 6.0,
    carrierHz: 196.0,
    tagline: 'Deep Nervous System Reset',
    description: 'Used after severe drawdown, missed fills, or emotional spikes to down-regulate the amygdala.',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    badgeBg: 'bg-purple-950/60 text-purple-300',
    icon: Moon,
  },
  {
    id: 'BETA',
    name: 'Beta Focus (18.0 Hz)',
    hz: 18.0,
    carrierHz: 240.0,
    tagline: 'Macro Data & Fast Analysis',
    description: 'Heightens analytical vigilance for FOMC, NFP releases, and fast-moving volatility breaks.',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/40',
    badgeBg: 'bg-amber-950/60 text-amber-300',
    icon: Zap,
  },
  {
    id: 'DELTA',
    name: 'Delta Recovery (2.5 Hz)',
    hz: 2.5,
    carrierHz: 140.0,
    tagline: 'Post-Market Recovery & Sleep',
    description: 'Deep physical and cognitive recovery after the market closes. Clears cognitive fatigue.',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    badgeBg: 'bg-emerald-950/60 text-emerald-300',
    icon: Shield,
  },
];

export const BinauralBrainwaveEngine: React.FC = () => {
  const [selectedBand, setSelectedBand] = useState<BrainwaveBand>('ALPHA');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [noiseMix, setNoiseMix] = useState(0.2); // Pink/Brown noise blend
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Audio Context references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscLeftRef = useRef<OscillatorNode | null>(null);
  const oscRightRef = useRef<OscillatorNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const activePreset = PRESETS.find((p) => p.id === selectedBand) || PRESETS[0];

  // Stop audio graph cleanly
  const stopAudio = () => {
    try {
      if (oscLeftRef.current) {
        oscLeftRef.current.stop();
        oscLeftRef.current.disconnect();
        oscLeftRef.current = null;
      }
      if (oscRightRef.current) {
        oscRightRef.current.stop();
        oscRightRef.current.disconnect();
        oscRightRef.current = null;
      }
      if (noiseNodeRef.current) {
        noiseNodeRef.current.disconnect();
        noiseNodeRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {
      console.warn('Audio cleanup exception:', e);
    }
    setIsPlaying(false);
  };

  // Start audio graph with stereo binaural detune
  const startAudio = async () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxClass();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      audioCtxRef.current = ctx;

      // Master Gain
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : volume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      // Left Channel
      const oscLeft = ctx.createOscillator();
      const pannerLeft = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      oscLeft.type = 'sine';
      oscLeft.frequency.setValueAtTime(activePreset.carrierHz, ctx.currentTime);

      // Right Channel (Carrier + Beat Frequency)
      const oscRight = ctx.createOscillator();
      const pannerRight = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      oscRight.type = 'sine';
      oscRight.frequency.setValueAtTime(activePreset.carrierHz + activePreset.hz, ctx.currentTime);

      if (pannerLeft && pannerRight) {
        pannerLeft.pan.setValueAtTime(-1.0, ctx.currentTime);
        pannerRight.pan.setValueAtTime(1.0, ctx.currentTime);
        oscLeft.connect(pannerLeft);
        pannerLeft.connect(masterGain);
        oscRight.connect(pannerRight);
        pannerRight.connect(masterGain);
      } else {
        // Fallback if StereoPannerNode not supported
        const merger = ctx.createChannelMerger(2);
        oscLeft.connect(merger, 0, 0);
        oscRight.connect(merger, 0, 1);
        merger.connect(masterGain);
      }

      // Soft ambient noise generator (Brownian noise for organic grounding)
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain compensation
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(noiseMix * 0.15, ctx.currentTime);
      noiseSource.connect(noiseGain);
      noiseGain.connect(masterGain);

      noiseGainRef.current = noiseGain;
      noiseNodeRef.current = noiseSource;

      oscLeft.start();
      oscRight.start();
      noiseSource.start();

      oscLeftRef.current = oscLeft;
      oscRightRef.current = oscRight;

      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to initialize Web Audio Binaural Engine:', err);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  // Switch preset on the fly
  const handlePresetChange = (band: BrainwaveBand) => {
    setSelectedBand(band);
    const newPreset = PRESETS.find((p) => p.id === band) || PRESETS[0];
    if (isPlaying && oscLeftRef.current && oscRightRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      oscLeftRef.current.frequency.setTargetAtTime(newPreset.carrierHz, ctx.currentTime, 0.1);
      oscRightRef.current.frequency.setTargetAtTime(newPreset.carrierHz + newPreset.hz, ctx.currentTime, 0.1);
    }
  };

  // Adjust volume
  useEffect(() => {
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(isMuted ? 0 : volume, audioCtxRef.current.currentTime, 0.05);
    }
  }, [volume, isMuted]);

  // Adjust noise level
  useEffect(() => {
    if (noiseGainRef.current && audioCtxRef.current) {
      noiseGainRef.current.gain.setTargetAtTime(noiseMix * 0.15, audioCtxRef.current.currentTime, 0.05);
    }
  }, [noiseMix]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Visualizer Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      // Draw subtle background grid line
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      if (isPlaying) {
        phase += 0.05;
        // Draw Left Carrier Sine
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y = midY + Math.sin((x * 0.04) + phase) * (height * 0.28);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw Right Detune Sine (Constructive interference visualization)
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x++) {
          const y = midY + Math.sin((x * 0.045) + phase * 1.1) * (height * 0.28);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Flat dormant line
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(width, midY);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, selectedBand]);

  return (
    <div
      id="binaural-brainwave-engine"
      className="w-full rounded-2xl border border-cyan-500/30 bg-[#090e1c]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md transition-all duration-300 overflow-hidden box-border"
    >
      {/* Header with Title and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Radio className={`w-5 h-5 ${isPlaying ? 'animate-pulse text-cyan-300' : ''}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-military text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-100 truncate">
                2090 BINAURAL BRAINWAVE SYNTHESIZER
              </h3>
              <span className="text-[10px] font-mono-code bg-indigo-950/80 text-indigo-300 px-2 py-0.5 rounded border border-indigo-700/40">
                WEB AUDIO COGNITION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">
              Pure acoustic entrainment for neural stabilization and peak trading flow
            </p>
          </div>
        </div>

        {/* Play/Stop and Expand controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={togglePlay}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-military font-bold tracking-wider transition active:scale-95 cursor-pointer shadow-lg min-h-[40px] ${
              isPlaying
                ? 'bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
            }`}
            aria-label={isPlaying ? 'Stop Synthesis' : 'Start Synthesis'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>STOP ENTRAINMENT</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>START ENTRAINMENT</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            title={isExpanded ? 'Collapse Engine Settings' : 'Expand Engine Settings'}
            aria-label="Toggle Engine Settings"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Headphone Recommendation Notice */}
      <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300 font-mono-code">
        <Headphones className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="truncate">
          Stereo headphones required: Left and right ears receive independent detuned frequencies to synthesize theta/alpha oscillations.
        </span>
      </div>

      {/* Frequency Band Selector Grid */}
      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {PRESETS.map((preset) => {
          const isSelected = selectedBand === preset.id;
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetChange(preset.id)}
              className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900/90 border-cyan-400/80 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className={`text-[10px] font-military font-bold tracking-wider ${isSelected ? preset.color : 'text-slate-300'}`}>
                  {preset.name}
                </span>
                <Icon className={`w-3.5 h-3.5 ${isSelected ? preset.color : 'text-slate-500'}`} />
              </div>
              <p className="text-[10px] text-slate-400 font-sans line-clamp-1">
                {preset.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {/* Real-time Oscilloscope Canvas */}
      <div className="mt-3.5 p-3 rounded-xl bg-slate-950/90 border border-slate-800/80 flex flex-col sm:flex-row items-center gap-4">
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Activity className={`w-3 h-3 ${isPlaying ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              NEURAL WAVEFORM SPECTRUM ({activePreset.hz} Hz BEAT OFFSET)
            </span>
            <span className={isPlaying ? 'text-emerald-400' : 'text-slate-500'}>
              {isPlaying ? 'ACTIVE MODULATION' : 'STANDBY'}
            </span>
          </div>
          <canvas
            ref={canvasRef}
            width={400}
            height={44}
            className="w-full h-11 rounded-lg bg-slate-900/80 border border-slate-800"
          />
        </div>

        {/* Audio Volume & Mix Sliders */}
        <div className="w-full sm:w-64 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-300">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3 text-cyan-400" />
              SYNTH VOLUME
            </span>
            <span>{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            aria-label="Tone Volume Slider"
          />

          <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-300 pt-1">
            <span>ORGANIC BROWN NOISE MIX</span>
            <span>{Math.round(noiseMix * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={noiseMix}
            onChange={(e) => setNoiseMix(parseFloat(e.target.value))}
            className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            aria-label="Brown Noise Mix Slider"
          />
        </div>
      </div>

      {/* Expanded Explanatory Protocol Guide */}
      {isExpanded && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs font-mono-code space-y-2 animate-in fade-in duration-200">
          <div className="text-[11px] font-military font-bold text-cyan-300 uppercase tracking-wider">
            CLINICAL TRADING PROTOCOL SPECIFICATION:
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            {activePreset.description}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-200 font-bold block">Left Channel:</span>
              Carrier Frequency: {activePreset.carrierHz} Hz
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-200 font-bold block">Right Channel:</span>
              Detuned Frequency: {activePreset.carrierHz + activePreset.hz} Hz
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
