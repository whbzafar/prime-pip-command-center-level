import React, { useState, useEffect } from 'react';
import {
  Music,
  Play,
  Square,
  Volume2,
  VolumeX,
  Sliders,
  Clock,
  Sparkles,
  Waves,
  Feather,
  Sun,
  Moon,
  Compass,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { RelaxationMusicMode } from './types';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';

interface MusicTrackInfo {
  id: RelaxationMusicMode;
  name: string;
  subtitle: string;
  icon: any;
  defaultBpm: number;
}

const MUSIC_MODES: MusicTrackInfo[] = [
  { id: 'GENTLE_PIANO', name: 'Gentle Acoustic Chimes', subtitle: 'Pentatonic crystalline chimes with warm acoustic decay', icon: Feather, defaultBpm: 48 },
  { id: 'SOFT_AMBIENT', name: 'Soft Ambient Drift', subtitle: 'Warm floating analog pads with gentle harmonic shifts', icon: Waves, defaultBpm: 52 },
  { id: 'SLOW_PADS', name: 'Slow Lydian Pads', subtitle: 'Elevated major-seventh ambient wash for mental decluttering', icon: Compass, defaultBpm: 44 },
  { id: 'CALM_SYNTH', name: 'Calm Analog Synth', subtitle: 'Mellow filtered arpeggio with subtle acoustic echo', icon: Sparkles, defaultBpm: 56 },
  { id: 'MINIMAL_MEDITATION', name: '432Hz Minimal Meditation', subtitle: 'Harmonic root drones with pure fifths interval intervals', icon: Feather, defaultBpm: 40 },
  { id: 'FLOATING_ATMOSPHERE', name: 'Floating Atmosphere', subtitle: 'Weightless spatial reverberations and soft upper overtones', icon: Waves, defaultBpm: 50 },
  { id: 'EVENING_RESET', name: 'Evening Reset', subtitle: 'Downtempo grounding progression for post-session relaxation', icon: Moon, defaultBpm: 46 },
  { id: 'MORNING_REFRESH', name: 'Morning Refresh', subtitle: 'Bright, crisp harmonic intervals for calm daytime readiness', icon: Sun, defaultBpm: 60 },
  { id: 'DEEP_FOCUS', name: 'Deep Focus Alpha Pulse', subtitle: 'Steady acoustic cadence for chart immersion & journaling', icon: Compass, defaultBpm: 54 },
  { id: 'QUIET_SPACE', name: 'Quiet Space', subtitle: 'Sparse, solitary acoustic resonance notes with wide silence', icon: Feather, defaultBpm: 38 },
];

export const RelaxationMusic: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(soundEngine.getIsMusicPlaying());
  const [currentMode, setCurrentMode] = useState<RelaxationMusicMode | null>(soundEngine.getCurrentMusicMode() || 'SOFT_AMBIENT');
  const [volume, setVolume] = useState<number>(0.4);
  const [tempo, setTempo] = useState<number>(50);
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => {
      setIsPlaying(soundEngine.getIsMusicPlaying());
      const active = soundEngine.getCurrentMusicMode();
      if (active) setCurrentMode(active);
      setTimerSecondsRemaining(soundEngine.getTimerRemainingSeconds());
    };
    const interval = setInterval(sync, 500);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePlay = (mode: RelaxationMusicMode) => {
    if (isPlaying && currentMode === mode) {
      soundEngine.stopRelaxationMusic();
      setIsPlaying(false);
    } else {
      setCurrentMode(mode);
      const track = MUSIC_MODES.find((m) => m.id === mode);
      const chosenTempo = track ? track.defaultBpm : tempo;
      setTempo(chosenTempo);
      soundEngine.startRelaxationMusic(mode, volume, chosenTempo);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    soundEngine.stopRelaxationMusic();
    setIsPlaying(false);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (isPlaying && currentMode) {
      soundEngine.startRelaxationMusic(currentMode, v, tempo);
    }
  };

  const handleTempoChange = (t: number) => {
    setTempo(t);
    if (isPlaying && currentMode) {
      soundEngine.startRelaxationMusic(currentMode, volume, t);
    }
  };

  const handleSetTimer = (minutes: number) => {
    if (timerMinutes === minutes && timerSecondsRemaining !== null) {
      soundEngine.clearTimer();
      setTimerMinutes(null);
      setTimerSecondsRemaining(null);
    } else {
      setTimerMinutes(minutes);
      soundEngine.startTimer(
        minutes,
        (sec) => setTimerSecondsRemaining(sec),
        () => {
          setTimerMinutes(null);
          setTimerSecondsRemaining(null);
          setIsPlaying(false);
        }
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-white/[0.08] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <Music className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                PROCEDURAL RELAXATION MUSIC
              </h3>
              <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                100% PROCEDURAL SYNTHESIS
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Zero copyrighted files • Infinite non-repeating acoustic harmony • Non-distracting
            </p>
          </div>
        </div>

        {isPlaying && (
          <button
            type="button"
            onClick={handleStop}
            className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-military font-bold flex items-center gap-2 hover:bg-rose-500/30 transition cursor-pointer shadow-lg shadow-rose-500/10"
          >
            <Square className="w-4 h-4 fill-current" />
            <span>STOP MUSIC</span>
          </button>
        )}
      </div>

      {/* Visualizer */}
      <SoundWaveVisualizer height={150} />

      {/* Playback Controls (Volume & Tempo) */}
      <div className="prime-glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Volume */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-military">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-teal-400" />
                MUSIC VOLUME
              </span>
              <span className="font-mono-code text-teal-400 font-bold">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>

          {/* Tempo */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-military">
              <span className="text-slate-300 font-bold uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" />
                TEMPO / CADENCE
              </span>
              <span className="font-mono-code text-indigo-300 font-bold">{tempo} BPM</span>
            </div>
            <input
              type="range"
              min={35}
              max={75}
              step={1}
              value={tempo}
              onChange={(e) => handleTempoChange(parseInt(e.target.value))}
              className="w-full accent-indigo-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Timer Bar */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400 font-military">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>SESSION TIMER:</span>
            {timerSecondsRemaining !== null && (
              <span className="text-cyan-400 font-mono-code font-bold">
                {Math.floor(timerSecondsRemaining / 60)}m {timerSecondsRemaining % 60}s left
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {[5, 10, 15, 25, 45].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleSetTimer(m)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono-code font-bold transition ${
                  timerMinutes === m
                    ? 'bg-blue-500 text-slate-950 font-bold'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 10 Procedural Relaxation Tracks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {MUSIC_MODES.map((mode) => {
          const Icon = mode.icon;
          const isThisPlaying = isPlaying && currentMode === mode.id;

          return (
            <div
              key={mode.id}
              className={`p-4 rounded-2xl border transition text-left flex items-start justify-between gap-3 ${
                isThisPlaying
                  ? 'bg-gradient-to-r from-teal-950/40 via-slate-900 to-indigo-950/40 border-teal-400/50 shadow-lg shadow-teal-500/10'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isThisPlaying
                      ? 'bg-teal-500 text-slate-950 font-bold animate-pulse'
                      : 'bg-slate-800 text-teal-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-military font-bold text-slate-100 flex items-center gap-2">
                    {mode.name}
                    {isThisPlaying && (
                      <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold animate-pulse">
                        PLAYING
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] font-mono-code text-slate-400 mt-0.5 line-clamp-2">
                    {mode.subtitle}
                  </p>
                  <span className="text-[10px] font-mono-code text-slate-500 mt-1 block">
                    Ideal Tempo: {mode.defaultBpm} BPM
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleTogglePlay(mode.id)}
                className={`p-2.5 rounded-xl border transition cursor-pointer shrink-0 ${
                  isThisPlaying
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                    : 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
                }`}
                title={isThisPlaying ? 'Pause' : 'Play'}
              >
                {isThisPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
