import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, HeartPulse, ShieldCheck } from 'lucide-react';

type BreathingPhase = 'INHALE' | 'HOLD_IN' | 'EXHALE' | 'HOLD_OUT';

const PHASE_CONFIG: Record<BreathingPhase, { label: string; instruction: string; color: string; ringScale: string }> = {
  INHALE: {
    label: 'INHALE',
    instruction: 'Breathe in slowly through your nose into your diaphragm...',
    color: '#10B981', // emerald
    ringScale: 'scale-125',
  },
  HOLD_IN: {
    label: 'HOLD',
    instruction: 'Keep lungs gently full. Relax your shoulders and jaw...',
    color: '#F59E0B', // amber
    ringScale: 'scale-125',
  },
  EXHALE: {
    label: 'EXHALE',
    instruction: 'Release all tension through your mouth smoothly...',
    color: '#06B6D4', // cyan
    ringScale: 'scale-75',
  },
  HOLD_OUT: {
    label: 'HOLD EMPTY',
    instruction: 'Rest in the stillness. Acknowledge market neutrality...',
    color: '#8B5CF6', // purple
    ringScale: 'scale-75',
  },
};

const PHASE_SEQUENCE: BreathingPhase[] = ['INHALE', 'HOLD_IN', 'EXHALE', 'HOLD_OUT'];
const PHASE_SECONDS = 4;

export const BoxBreathingExercise: React.FC = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [phaseIndex, setPhaseIndex] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(PHASE_SECONDS);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const currentPhase = PHASE_SEQUENCE[phaseIndex];
  const config = PHASE_CONFIG[currentPhase];

  const playTone = (freq: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio not permitted or failed
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Next phase
            setPhaseIndex((cur) => {
              const nextIndex = (cur + 1) % 4;
              if (nextIndex === 0) {
                setCompletedCycles((c) => c + 1);
                playTone(528); // Miraculous 528 Hz completion chime
              } else {
                playTone(432); // Soothing 432 Hz frequency
              }
              return nextIndex;
            });
            return PHASE_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  const handleReset = () => {
    setIsActive(false);
    setPhaseIndex(0);
    setSecondsRemaining(PHASE_SECONDS);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-military font-bold text-amber-400 uppercase tracking-widest">
              AUTONOMIC NERVOUS SYSTEM CENTERING
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono-code bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              4-4-4-4 Protocol
            </span>
          </div>
          <h3 className="text-base font-military font-bold text-slate-100 mt-1">
            Box Breathing Exercise
          </h3>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Reset amygdala hijack, reduce heart-rate variability spikes, and eliminate FOMO/revenge impulse before market entry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Visual Animated Breathing Ring */}
      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Outer glow ring */}
          <div
            style={{ borderColor: config.color, boxShadow: `0 0 30px ${config.color}33` }}
            className={`absolute inset-0 rounded-full border-2 transition-transform duration-1000 ease-in-out ${
              isActive ? config.ringScale : 'scale-100'
            }`}
          />

          {/* Secondary pulsing halo */}
          <div
            style={{ backgroundColor: `${config.color}15` }}
            className={`absolute inset-4 rounded-full transition-transform duration-1000 ease-in-out ${
              isActive ? config.ringScale : 'scale-90'
            }`}
          />

          {/* Central Counter Display */}
          <div className="relative z-10 text-center space-y-1">
            <span
              style={{ color: config.color }}
              className="text-xs font-military font-bold tracking-widest uppercase block"
            >
              {config.label}
            </span>
            <div className="text-5xl font-mono-code font-extrabold text-slate-100">
              {isActive ? secondsRemaining : '4'}
            </div>
            <span className="text-[10px] text-slate-400 font-mono-code uppercase">
              {isActive ? 'SECONDS' : 'READY'}
            </span>
          </div>
        </div>

        {/* Phase Instruction */}
        <p className="mt-4 text-xs font-mono-code text-center text-slate-300 max-w-sm h-8">
          {isActive ? config.instruction : 'Press Start to begin 4-4-4-4 physiological centering.'}
        </p>

        {/* Cycle Counters */}
        <div className="flex items-center gap-4 mt-2 font-mono-code text-xs text-slate-400">
          <span>
            Completed Cycles: <strong className="text-amber-400">{completedCycles}</strong>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Optimal: 4-6 Cycles</span>
          </span>
        </div>
      </div>

      {/* Control Actions */}
      <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-800">
        <button
          onClick={() => setIsActive(!isActive)}
          className={`px-5 py-2.5 rounded-xl font-military font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg ${
            isActive
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>PAUSE EXERCISE</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>START CENTERING</span>
            </>
          )}
        </button>

        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono-code flex items-center gap-1.5 transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET</span>
        </button>
      </div>
    </div>
  );
};
