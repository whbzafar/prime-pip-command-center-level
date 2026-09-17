import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Square,
  Clock,
  Maximize2,
  Minimize2,
  Wind,
  CheckCircle2,
  BookOpen,
  Crosshair,
  Activity,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';

interface FocusModeProps {
  onNavigateToTab?: (tab: string) => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({ onNavigateToTab }) => {
  const [sessionMinutes, setSessionMinutes] = useState<number>(10);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('20');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(10 * 60);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [ambientSound, setAmbientSound] = useState<'432HZ' | 'RAIN' | 'BROWN_NOISE' | 'OFF'>('432HZ');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  useEffect(() => {
    let timer: any;
    if (isActive && secondsRemaining > 0) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isActive, secondsRemaining]);

  const handleStart = (mins = sessionMinutes) => {
    setSessionMinutes(mins);
    setSecondsRemaining(mins * 60);
    setIsActive(true);
    setIsCompleted(false);

    // Trigger selected ambient sound
    startSelectedAudio(ambientSound);
  };

  const startSelectedAudio = (type: '432HZ' | 'RAIN' | 'BROWN_NOISE' | 'OFF') => {
    soundEngine.stopAllLayers();
    soundEngine.stopGroundingTone();

    if (type === '432HZ') {
      soundEngine.startGroundingTone(432, 0.2);
    } else if (type === 'RAIN') {
      soundEngine.startLayer('RAIN');
      soundEngine.setLayerVolume('RAIN', 0.4);
    } else if (type === 'BROWN_NOISE') {
      soundEngine.startBrownNoise(0.25);
    }
  };

  const handleStop = () => {
    setIsActive(false);
    soundEngine.stopAllAudio();
  };

  const handleComplete = () => {
    setIsActive(false);
    setIsCompleted(true);
    soundEngine.stopAllAudio();
    soundEngine.playSingingBowlChime(528);
  };

  const handleChangeAudio = (type: '432HZ' | 'RAIN' | 'BROWN_NOISE' | 'OFF') => {
    setAmbientSound(type);
    if (isActive) {
      startSelectedAudio(type);
    }
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = ((sessionMinutes * 60 - secondsRemaining) / (sessionMinutes * 60)) * 100;

  if (isCompleted) {
    return (
      <div className="p-8 sm:p-14 rounded-3xl prime-glass-card border border-teal-500/30 text-center space-y-6 max-w-xl mx-auto animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono-code px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 uppercase tracking-wider font-bold">
            SESSION COMPLETE
          </span>
          <h2 className="text-2xl sm:text-3xl font-military font-bold text-slate-100">
            Focus Session Complete
          </h2>
          <p className="text-xs sm:text-sm font-mono-code text-slate-400 max-w-md mx-auto">
            Your attention is quiet, centered, and sharp. Choose where you would like to direct your clarity next:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigateToTab && onNavigateToTab('DASHBOARD')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left hover:border-teal-400 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-military font-bold text-slate-200">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>RETURN TO DASHBOARD</span>
            </div>
            <p className="text-[10px] font-mono-code text-slate-500 mt-1">
              Review current metrics and market status
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab && onNavigateToTab('PRE_TRADE_PLAN')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left hover:border-cyan-400 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-military font-bold text-slate-200">
              <Crosshair className="w-4 h-4 text-cyan-400" />
              <span>OPEN PRE-TRADE PLAN</span>
            </div>
            <p className="text-[10px] font-mono-code text-slate-500 mt-1">
              Structure disciplined trade execution
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTab && onNavigateToTab('JOURNAL')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-left hover:border-indigo-400 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-military font-bold text-slate-200">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>OPEN TRADE JOURNAL</span>
            </div>
            <p className="text-[10px] font-mono-code text-slate-500 mt-1">
              Log observations & mental clarity notes
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleStart(sessionMinutes)}
            className="p-3.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-left hover:bg-teal-500/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-xs font-military font-bold text-teal-300">
              <RotateCcw className="w-4 h-4" />
              <span>START ANOTHER SESSION</span>
            </div>
            <p className="text-[10px] font-mono-code text-teal-400/80 mt-1">
              Continue immersed focus interval
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`space-y-6 animate-in fade-in duration-200 ${
        isFullScreen
          ? 'fixed inset-0 z-50 bg-[#020617] p-6 sm:p-12 overflow-y-auto flex flex-col justify-between'
          : ''
      }`}
    >
      {/* Top Banner / Full Screen Toggle */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
            <Clock className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              MINIMALIST FOCUS SANCTUARY
            </h3>
            <p className="text-xs font-mono-code text-slate-400">
              Calm attentional anchoring prior to market analysis
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
          title={isFullScreen ? 'Exit full screen' : 'Enter immersive full screen'}
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Focus Chamber */}
      <div className="prime-glass-card rounded-3xl p-8 sm:p-14 border border-white/[0.08] text-center flex flex-col items-center justify-center relative overflow-hidden min-h-[380px]">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.12),_transparent_70%)] pointer-events-none" />

        {/* Ambient Sound Selector Pills */}
        <div className="mb-6 flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 flex-wrap justify-center">
          {[
            { id: '432HZ', label: '432Hz Drone' },
            { id: 'RAIN', label: 'Gentle Rain' },
            { id: 'BROWN_NOISE', label: 'Brown Noise' },
            { id: 'OFF', label: 'Silent' },
          ].map((snd) => (
            <button
              key={snd.id}
              type="button"
              onClick={() => handleChangeAudio(snd.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-mono-code font-bold transition cursor-pointer ${
                ambientSound === snd.id
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {snd.label}
            </button>
          ))}
        </div>

        {/* Countdown Display */}
        <div className="my-3">
          <span className="text-6xl sm:text-8xl font-mono-code font-bold text-slate-100 tracking-tight">
            {formatTime(secondsRemaining)}
          </span>
          <span className="text-xs font-military font-bold text-teal-400 uppercase tracking-widest block mt-2">
            {isActive ? 'FOCUS IN PROGRESS' : 'FOCUS INTERVAL TIMER'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-md h-2 rounded-full bg-slate-950 overflow-hidden my-4">
          <div
            className="h-full bg-teal-400 transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Action Controls */}
        <div className="mt-4 flex items-center gap-3">
          {!isActive ? (
            <button
              type="button"
              onClick={() => handleStart(sessionMinutes)}
              className="px-8 py-3.5 rounded-2xl bg-teal-500 text-slate-950 font-military font-bold text-sm tracking-wider uppercase hover:bg-teal-400 transition shadow-lg shadow-teal-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START FOCUS INTERVAL</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className="px-8 py-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-military font-bold text-sm tracking-wider uppercase hover:bg-rose-500/30 transition flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>PAUSE / END SESSION</span>
            </button>
          )}
        </div>

        {/* Duration Selectors */}
        {!isActive && (
          <div className="mt-6 flex items-center gap-2 flex-wrap justify-center">
            {[5, 10, 15, 25].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setSessionMinutes(m);
                  setSecondsRemaining(m * 60);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono-code font-bold border transition cursor-pointer ${
                  sessionMinutes === m
                    ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m} MIN
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Embedded Real-Time Audio Visualizer */}
      <SoundWaveVisualizer height={120} showControls={false} />
    </div>
  );
};
