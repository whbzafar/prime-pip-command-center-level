import React, { useState, useEffect, useRef } from 'react';
import { Wind, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { calmAudio } from '../calmAudio';

interface BreathingOrbProps {
  initialMode?: 'BOX_4_4_4_4' | 'RELAX_4_7_8' | 'PHYSIOLOGICAL_SIGH';
  targetCycles?: number;
  onComplete?: () => void;
  autoStart?: boolean;
}

type BreathPhase = 'INHALE' | 'HOLD_IN' | 'EXHALE' | 'HOLD_OUT' | 'INHALE_1' | 'INHALE_2';

interface CadenceConfig {
  name: string;
  subtitle: string;
  phases: { phase: BreathPhase; durationSeconds: number; label: string; cue: string }[];
}

const CADENCES: Record<'BOX_4_4_4_4' | 'RELAX_4_7_8' | 'PHYSIOLOGICAL_SIGH', CadenceConfig> = {
  BOX_4_4_4_4: {
    name: 'Box Breathing (4-4-4-4)',
    subtitle: 'Autonomic Equalizer: Balances sympathetic & parasympathetic tone',
    phases: [
      { phase: 'INHALE', durationSeconds: 4, label: 'Inhale Smoothly', cue: 'Draw breath deep into diaphragm' },
      { phase: 'HOLD_IN', durationSeconds: 4, label: 'Hold Lungs Full', cue: 'Remain still and peaceful' },
      { phase: 'EXHALE', durationSeconds: 4, label: 'Exhale Slowly', cue: 'Release all tension with breath' },
      { phase: 'HOLD_OUT', durationSeconds: 4, label: 'Hold Lungs Empty', cue: 'Feel quiet stillness' },
    ],
  },
  RELAX_4_7_8: {
    name: 'Relaxing Vagus Breath (4-7-8)',
    subtitle: 'Rapid Pulse Reducer: Drastically lowers heart rate and anxiety',
    phases: [
      { phase: 'INHALE', durationSeconds: 4, label: 'Inhale In Through Nose', cue: 'Expand belly with quiet air' },
      { phase: 'HOLD_IN', durationSeconds: 7, label: 'Gentle Sustained Hold', cue: 'Oxygenate bloodstream' },
      { phase: 'EXHALE', durationSeconds: 8, label: 'Long Whoosh Exhale', cue: 'Slowly blow out through mouth' },
    ],
  },
  PHYSIOLOGICAL_SIGH: {
    name: 'Physiological Sigh',
    subtitle: 'Emergency Impulse Brake: Rapid CO2 offload to break acute panic',
    phases: [
      { phase: 'INHALE_1', durationSeconds: 2.5, label: 'First Deep Inhale', cue: 'Inhale 80% through nose' },
      { phase: 'INHALE_2', durationSeconds: 1.5, label: 'Second Quick Top-Off', cue: 'Sharply pop extra air into lungs' },
      { phase: 'EXHALE', durationSeconds: 6, label: 'Full Sigh Exhale', cue: 'Release with a soft sigh of relief' },
    ],
  },
};

export const BreathingOrb: React.FC<BreathingOrbProps> = ({
  initialMode = 'BOX_4_4_4_4',
  targetCycles = 4,
  onComplete,
  autoStart = false,
}) => {
  const [mode, setMode] = useState<'BOX_4_4_4_4' | 'RELAX_4_7_8' | 'PHYSIOLOGICAL_SIGH'>(initialMode);
  const [isActive, setIsActive] = useState<boolean>(autoStart);
  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const [secondsRemainingInPhase, setSecondsRemainingInPhase] = useState<number>(CADENCES[initialMode].phases[0].durationSeconds);
  const [cyclesCompleted, setCyclesCompleted] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const activeCadence = CADENCES[mode];
  const currentPhase = activeCadence.phases[phaseIndex];

  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Switch mode reset
  const handleModeChange = (newMode: 'BOX_4_4_4_4' | 'RELAX_4_7_8' | 'PHYSIOLOGICAL_SIGH') => {
    setMode(newMode);
    setPhaseIndex(0);
    setSecondsRemainingInPhase(CADENCES[newMode].phases[0].durationSeconds);
    setCyclesCompleted(0);
  };

  useEffect(() => {
    if (!isActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsRemainingInPhase((prev) => {
        if (prev > 0.1) {
          return Math.max(0, parseFloat((prev - 0.1).toFixed(1)));
        }

        // Advance phase
        setPhaseIndex((currPhaseIdx) => {
          const nextPhaseIdx = currPhaseIdx + 1;
          if (nextPhaseIdx >= activeCadence.phases.length) {
            // Cycle finished
            setCyclesCompleted((prevCycles) => {
              const newCycleCount = prevCycles + 1;
              if (newCycleCount >= targetCycles && onComplete) {
                setTimeout(() => onComplete(), 500);
              }
              return newCycleCount;
            });

            const firstPhase = activeCadence.phases[0];
            setSecondsRemainingInPhase(firstPhase.durationSeconds);
            if (soundEnabled) {
              calmAudio.playSingingBowlChime(480);
            }
            return 0;
          } else {
            const nxtPhase = activeCadence.phases[nextPhaseIdx];
            setSecondsRemainingInPhase(nxtPhase.durationSeconds);
            if (soundEnabled) {
              const isInhale = nxtPhase.phase.includes('INHALE');
              calmAudio.playGentleBreathCue(isInhale);
            }
            return nextPhaseIdx;
          }
        });

        return 0;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, activeCadence, targetCycles, onComplete, soundEnabled]);

  // Compute visual scale
  const phaseFraction = 1 - secondsRemainingInPhase / (currentPhase?.durationSeconds || 1);
  let orbScale = 1.0;
  if (currentPhase.phase === 'INHALE' || currentPhase.phase === 'INHALE_1' || currentPhase.phase === 'INHALE_2') {
    orbScale = 1.0 + 0.45 * phaseFraction;
  } else if (currentPhase.phase === 'HOLD_IN') {
    orbScale = 1.45;
  } else if (currentPhase.phase === 'EXHALE') {
    orbScale = 1.45 - 0.45 * phaseFraction;
  } else if (currentPhase.phase === 'HOLD_OUT') {
    orbScale = 1.0;
  }

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  const handleReset = () => {
    setIsActive(false);
    setPhaseIndex(0);
    setSecondsRemainingInPhase(activeCadence.phases[0].durationSeconds);
    setCyclesCompleted(0);
  };

  return (
    <div className="bg-[#0c1222] border border-indigo-900/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/30 pb-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-teal-400" />
            <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase">
              {activeCadence.name}
            </h4>
          </div>
          <p className="text-xs font-mono-code text-slate-400 mt-0.5">
            {activeCadence.subtitle}
          </p>
        </div>

        {/* Audio Toggle & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
              soundEnabled
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Reset Breathing Counter"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cadence Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-8 relative z-10">
        {(['BOX_4_4_4_4', 'RELAX_4_7_8', 'PHYSIOLOGICAL_SIGH'] as const).map((cadenceKey) => (
          <button
            key={cadenceKey}
            type="button"
            onClick={() => handleModeChange(cadenceKey)}
            className={`py-2 px-3 rounded-xl border text-xs font-mono-code font-bold transition text-left cursor-pointer ${
              mode === cadenceKey
                ? 'bg-indigo-600/30 border-indigo-400 text-indigo-100 shadow-md shadow-indigo-500/15'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="truncate">{CADENCES[cadenceKey].name.split(' (')[0]}</div>
            <div className="text-[10px] text-slate-500 font-sans font-normal truncate">
              {cadenceKey === 'BOX_4_4_4_4' ? '4s-4s-4s-4s' : cadenceKey === 'RELAX_4_7_8' ? '4s-7s-8s' : 'Double Inhale'}
            </div>
          </button>
        ))}
      </div>

      {/* Center Breathing Orb Visualizer */}
      <div className="relative flex flex-col items-center justify-center min-h-[280px] my-4">
        {/* Concentric Halo Rings */}
        <div
          className="absolute w-60 h-60 rounded-full border border-indigo-500/20 transition-all duration-300 pointer-events-none"
          style={{ transform: `scale(${orbScale * 1.15})` }}
        />
        <div
          className="absolute w-48 h-48 rounded-full border border-teal-400/25 transition-all duration-300 pointer-events-none"
          style={{ transform: `scale(${orbScale * 1.08})` }}
        />

        {/* Central Luminous Orb */}
        <div
          className="relative z-10 w-36 h-36 rounded-full flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-200"
          style={{
            transform: `scale(${orbScale})`,
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(20, 184, 166, 0.25) 55%, rgba(15, 23, 42, 0.9) 100%)',
            boxShadow: '0 0 50px rgba(99, 102, 241, 0.35)',
            border: '2px solid rgba(165, 180, 252, 0.4)',
          }}
        >
          <span className="text-xl font-military font-black tracking-wider text-white drop-shadow">
            {Math.ceil(secondsRemainingInPhase)}s
          </span>
          <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-300 px-2 mt-0.5">
            {currentPhase.label.split(' ')[0]}
          </span>
        </div>

        {/* Pacing Prompt Below */}
        <div className="mt-8 text-center relative z-10 max-w-sm">
          <div className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase">
            {currentPhase.label}
          </div>
          <p className="text-xs font-mono-code text-indigo-300/90 mt-1">
            {currentPhase.cue}
          </p>
        </div>
      </div>

      {/* Progress & Cycle Indicator */}
      <div className="flex items-center justify-between text-xs font-mono-code border-t border-indigo-900/30 pt-4 mt-4 relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Cycles Completed:</span>
          <span className="text-emerald-400 font-bold">
            {cyclesCompleted} / {targetCycles}
          </span>
        </div>

        {/* Start / Pause Button */}
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-military font-bold tracking-wider uppercase transition active:scale-95 cursor-pointer ${
            isActive
              ? 'bg-blue-500/20 text-amber-300 border border-blue-500/40 hover:bg-blue-500/30'
              : 'bg-gradient-to-r from-teal-500 to-indigo-600 text-white shadow-lg shadow-teal-500/20 hover:opacity-95'
          }`}
        >
          {isActive ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE BREATH</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START PACING</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
