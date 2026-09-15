import React, { useState, useEffect, useRef } from 'react';
import {
  Wind,
  Play,
  Square,
  RotateCcw,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Heart,
  ShieldAlert,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { BreathingPatternId, BreathingPatternConfig } from './types';

const BREATHING_PATTERNS: Record<BreathingPatternId, BreathingPatternConfig> = {
  BALANCED_4_4: {
    id: 'BALANCED_4_4',
    name: 'Balanced Coherence (4-4)',
    subtitle: 'Equal duration steady autonomic harmony for clear focus',
    phases: [
      { name: 'INHALE', label: 'Inhale In', duration: 4, cue: 'Breathe smoothly through nose' },
      { name: 'EXHALE', label: 'Exhale Out', duration: 4, cue: 'Release steadily through mouth' },
    ],
  },
  RELAX_4_6: {
    id: 'RELAX_4_6',
    name: 'Relax Vagus (4-6)',
    subtitle: 'Extended exhale stimulates vagal parasympathetic relaxation',
    phases: [
      { name: 'INHALE', label: 'Inhale In', duration: 4, cue: 'Fill lower diaphragm calmly' },
      { name: 'EXHALE', label: 'Exhale Long', duration: 6, cue: 'Slowly let the air wash away' },
    ],
  },
  BOX_4_4_4_4: {
    id: 'BOX_4_4_4_4',
    name: 'Box Breathing (4-4-4-4)',
    subtitle: 'Military & tactical focus calibration for discipline',
    phases: [
      { name: 'INHALE', label: 'Inhale In', duration: 4, cue: 'Draw air into lungs' },
      { name: 'HOLD', label: 'Hold Full', duration: 4, cue: 'Remain still and centered' },
      { name: 'EXHALE', label: 'Exhale Out', duration: 4, cue: 'Slowly empty lungs completely' },
      { name: 'REST', label: 'Hold Empty', duration: 4, cue: 'Rest in quiet stillness' },
    ],
  },
  RELAX_4_7_8: {
    id: 'RELAX_4_7_8',
    name: 'Deep Calm (4-7-8)',
    subtitle: 'Long hold and sustained release for deeper tension relief',
    phases: [
      { name: 'INHALE', label: 'Inhale In', duration: 4, cue: 'Quiet breath in through nose' },
      { name: 'HOLD', label: 'Hold Full', duration: 7, cue: 'Sustain gentle inner awareness' },
      { name: 'EXHALE', label: 'Exhale Out', duration: 8, cue: 'Long soft whoosh through mouth' },
    ],
  },
  PHYSIOLOGICAL_SIGH: {
    id: 'PHYSIOLOGICAL_SIGH',
    name: 'Physiological Sigh',
    subtitle: 'Double inhale + long sigh for immediate mental decompression',
    phases: [
      { name: 'INHALE', label: 'Deep Inhale', duration: 3, cue: 'Inhale 80% through nose' },
      { name: 'HOLD', label: 'Top-Off Inhale', duration: 1.5, cue: 'Extra quick breath to top off lungs' },
      { name: 'EXHALE', label: 'Long Sigh Out', duration: 6, cue: 'Full unhurried sigh of relief' },
    ],
  },
  CUSTOM: {
    id: 'CUSTOM',
    name: 'Custom Cadence',
    subtitle: 'Tailor your own inhale, hold, and exhale durations',
    phases: [
      { name: 'INHALE', label: 'Inhale In', duration: 4, cue: 'Breathe in steadily' },
      { name: 'HOLD', label: 'Hold Full', duration: 2, cue: 'Hold breath with ease' },
      { name: 'EXHALE', label: 'Exhale Out', duration: 5, cue: 'Breathe out slowly' },
      { name: 'REST', label: 'Hold Empty', duration: 2, cue: 'Rest in stillness' },
    ],
  },
};

export const BreathingCenter: React.FC = () => {
  const [selectedPattern, setSelectedPattern] = useState<BreathingPatternId>('BALANCED_4_4');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(4);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [soundCuesEnabled, setSoundCuesEnabled] = useState<boolean>(true);

  // Custom durations
  const [customInhale, setCustomInhale] = useState<number>(4);
  const [customHold, setCustomHold] = useState<number>(2);
  const [customExhale, setCustomExhale] = useState<number>(5);
  const [customRest, setCustomRest] = useState<number>(2);

  const patternConfig = selectedPattern === 'CUSTOM'
    ? {
        id: 'CUSTOM' as BreathingPatternId,
        name: 'Custom Cadence',
        subtitle: 'Tailor your own inhale, hold, and exhale durations',
        phases: [
          { name: 'INHALE' as const, label: 'Inhale In', duration: customInhale, cue: 'Breathe in steadily' },
          ...(customHold > 0 ? [{ name: 'HOLD' as const, label: 'Hold Full', duration: customHold, cue: 'Hold breath with ease' }] : []),
          { name: 'EXHALE' as const, label: 'Exhale Out', duration: customExhale, cue: 'Breathe out slowly' },
          ...(customRest > 0 ? [{ name: 'REST' as const, label: 'Hold Empty', duration: customRest, cue: 'Rest in stillness' }] : []),
        ],
      }
    : BREATHING_PATTERNS[selectedPattern];

  const currentPhase = patternConfig.phases[phaseIndex] || patternConfig.phases[0];

  useEffect(() => {
    let timer: any;
    if (isActive) {
      timer = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Next phase
            const nextIdx = (phaseIndex + 1) % patternConfig.phases.length;
            if (nextIdx === 0) {
              setCompletedCycles((c) => c + 1);
            }
            setPhaseIndex(nextIdx);
            const nextPhase = patternConfig.phases[nextIdx];

            if (soundCuesEnabled) {
              soundEngine.playGentleBreathCue(nextPhase.name === 'INHALE');
            }

            return nextPhase.duration;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isActive, phaseIndex, patternConfig, soundCuesEnabled]);

  const handleStart = () => {
    setIsActive(true);
    setPhaseIndex(0);
    setSecondsRemaining(patternConfig.phases[0].duration);
    if (soundCuesEnabled) {
      soundEngine.playGentleBreathCue(true);
    }
  };

  const handleStop = () => {
    setIsActive(false);
    setPhaseIndex(0);
    setSecondsRemaining(patternConfig.phases[0].duration);
  };

  const handleSelectPattern = (id: BreathingPatternId) => {
    setSelectedPattern(id);
    setIsActive(false);
    setPhaseIndex(0);
    const targetConfig = id === 'CUSTOM'
      ? { phases: [{ duration: customInhale }] }
      : BREATHING_PATTERNS[id];
    setSecondsRemaining(targetConfig.phases[0].duration);
  };

  // Determine orb scale & glow based on phase
  const isExpand = currentPhase.name === 'INHALE';
  const isContract = currentPhase.name === 'EXHALE';
  const isHold = currentPhase.name === 'HOLD' || currentPhase.name === 'REST';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-white/[0.08] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
            <Wind className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                BREATHING & GROUNDING CENTER
              </h3>
              <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                AUTONOMIC RESET
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Visual pacing orb • Selectable cadences • Non-medical relaxation tool
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundCuesEnabled(!soundCuesEnabled)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-military font-bold transition flex items-center gap-1.5 cursor-pointer ${
              soundCuesEnabled
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            {soundCuesEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundCuesEnabled ? 'AUDIO CUES ON' : 'MUTED'}</span>
          </button>
        </div>
      </div>

      {/* Pattern Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {Object.values(BREATHING_PATTERNS).map((p) => {
          const isSelected = selectedPattern === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPattern(p.id)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                isSelected
                  ? 'bg-teal-500/20 border-teal-400 text-teal-100 shadow-md shadow-teal-500/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-xs font-military font-bold block truncate">{p.name}</span>
              <span className="text-[10px] font-mono-code text-slate-400 block mt-0.5 line-clamp-1">
                {p.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom Duration Adjusters (When Custom is selected) */}
      {selectedPattern === 'CUSTOM' && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] font-military font-bold text-slate-400 block mb-1">
              INHALE: {customInhale}s
            </label>
            <input
              type="range"
              min={2}
              max={10}
              value={customInhale}
              onChange={(e) => setCustomInhale(parseInt(e.target.value))}
              className="w-full accent-teal-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-military font-bold text-slate-400 block mb-1">
              HOLD: {customHold}s
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={customHold}
              onChange={(e) => setCustomHold(parseInt(e.target.value))}
              className="w-full accent-teal-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-military font-bold text-slate-400 block mb-1">
              EXHALE: {customExhale}s
            </label>
            <input
              type="range"
              min={2}
              max={12}
              value={customExhale}
              onChange={(e) => setCustomExhale(parseInt(e.target.value))}
              className="w-full accent-teal-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-military font-bold text-slate-400 block mb-1">
              REST: {customRest}s
            </label>
            <input
              type="range"
              min={0}
              max={10}
              value={customRest}
              onChange={(e) => setCustomRest(parseInt(e.target.value))}
              className="w-full accent-teal-400"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN VISUAL BREATHING ORB ARENA */}
      {/* ========================================================================= */}
      <div className="prime-glass-card rounded-3xl p-8 sm:p-12 border border-teal-500/20 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[380px] sm:min-h-[460px]">
        {/* Background Radial Glow */}
        <div
          className={`absolute inset-0 transition-opacity duration-1000 -z-10 ${
            isActive
              ? isExpand
                ? 'opacity-40 bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.25),_transparent_70%)]'
                : isContract
                ? 'opacity-20 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.2),_transparent_70%)]'
                : 'opacity-30 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.15),_transparent_70%)]'
              : 'opacity-10 bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.1),_transparent_70%)]'
          }`}
        />

        {/* Phase Indicator & Cue */}
        <div className="mb-6 space-y-1">
          <span className="text-[11px] font-mono-code px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-teal-300 uppercase tracking-wider font-bold">
            {isActive ? patternConfig.name : 'READY TO BEGIN'}
          </span>
          <h2 className="text-2xl sm:text-4xl font-military font-bold text-slate-100 tracking-wider transition-all duration-300">
            {isActive ? currentPhase.label.toUpperCase() : 'CENTER YOUR ATTENTION'}
          </h2>
          <p className="text-xs sm:text-sm font-mono-code text-slate-400 max-w-md mx-auto">
            {isActive ? currentPhase.cue : 'Select a cadence and click Begin to start guided pacing.'}
          </p>
        </div>

        {/* The Animated Breathing Orb */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Outer Ripple Rings */}
          <div
            className={`w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-teal-500/20 absolute transition-transform duration-1000 ${
              isActive && isExpand ? 'scale-125 opacity-80' : 'scale-90 opacity-20'
            }`}
          />
          <div
            className={`w-52 h-52 sm:w-64 sm:h-64 rounded-full border-2 border-dashed border-teal-400/30 absolute transition-transform duration-1000 ${
              isActive && (isExpand || isHold) ? 'scale-110 rotate-45' : 'scale-95 rotate-0'
            }`}
          />

          {/* Central Glowing Orb */}
          <div
            className={`w-40 h-40 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all ${
              isActive
                ? isExpand
                  ? 'scale-125 bg-gradient-to-tr from-teal-500/40 via-teal-400/30 to-emerald-400/40 shadow-teal-500/40 border-2 border-teal-300 duration-1000'
                  : isContract
                  ? 'scale-90 bg-gradient-to-tr from-indigo-900/50 via-slate-800/60 to-teal-950/40 shadow-indigo-500/20 border border-indigo-400/40 duration-1000'
                  : 'scale-110 bg-gradient-to-tr from-amber-500/30 via-slate-800 to-teal-900/40 shadow-amber-500/20 border-2 border-amber-300/60 duration-500'
                : 'scale-100 bg-slate-900/80 border border-slate-800 shadow-slate-950'
            }`}
          >
            {isActive ? (
              <>
                <span className="text-4xl sm:text-5xl font-mono-code font-bold text-slate-100 animate-in zoom-in">
                  {secondsRemaining}
                </span>
                <span className="text-[10px] font-military font-bold text-teal-300 uppercase tracking-widest mt-1">
                  SECONDS
                </span>
              </>
            ) : (
              <Wind className="w-12 h-12 text-teal-400/60" />
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
          {!isActive ? (
            <button
              type="button"
              onClick={handleStart}
              className="px-6 py-3 rounded-2xl bg-teal-500 text-slate-950 font-military font-bold text-sm tracking-wider uppercase flex items-center gap-2 hover:bg-teal-400 transition shadow-lg shadow-teal-500/20 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START GUIDED BREATHING</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStop}
                className="px-6 py-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-military font-bold text-sm tracking-wider uppercase flex items-center gap-2 hover:bg-rose-500/30 transition cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>PAUSE / STOP</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhaseIndex(0);
                  setSecondsRemaining(patternConfig.phases[0].duration);
                }}
                className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Reset current cycle"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Completed Cycles Counter */}
        {completedCycles > 0 && (
          <div className="mt-4 text-xs font-mono-code text-teal-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{completedCycles} full breathing cycles completed</span>
          </div>
        )}

        {/* Non-Medical Disclaimer */}
        <p className="text-[10px] font-mono-code text-slate-500 mt-6 max-w-sm mx-auto">
          Notice: This is a professional relaxation and focus pacer for trading discipline. It is not intended as medical treatment.
        </p>
      </div>
    </div>
  );
};
