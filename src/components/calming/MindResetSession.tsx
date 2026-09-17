import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  RotateCcw,
  Volume2,
  Wind,
  ShieldCheck,
  Clock,
  Heart,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';

interface ResetStep {
  number: number;
  title: string;
  headline: string;
  cue: string;
  detail: string;
  durationSeconds: number;
  soundPreset: 'LOW_TONE' | 'RAIN' | 'WIND' | 'OCEAN' | 'CHIME';
}

const RESET_STEPS: ResetStep[] = [
  {
    number: 1,
    title: 'PAUSE',
    headline: 'Step Away from the Price Tickers',
    cue: 'Take a moment away from the charts. The market will always be here.',
    detail: 'Remove your hands from the mouse and keyboard. Soften your gaze. Allow the rush of candlestick movements to slow down.',
    durationSeconds: 30,
    soundPreset: 'CHIME',
  },
  {
    number: 2,
    title: 'BREATHE',
    headline: 'Restore Autonomic Equilibrium',
    cue: 'Slow down your attention. Inhale deeply through your nose, exhale with ease.',
    detail: 'Take 4 slow diaphragmatic breaths. Let your stomach expand on the inhale. As you exhale, let go of any urgency.',
    durationSeconds: 45,
    soundPreset: 'LOW_TONE',
  },
  {
    number: 3,
    title: 'LISTEN',
    headline: 'Tune Into Ambient Stillness',
    cue: 'Notice the sound around you. Anchor your awareness in the present moment.',
    detail: 'Listen to the gentle acoustic frequencies. Notice the subtle details in the audio layer. You are in control of your response.',
    durationSeconds: 45,
    soundPreset: 'RAIN',
  },
  {
    number: 4,
    title: 'RELAX',
    headline: 'Release Physical & Mental Grip',
    cue: 'Release any tension in your shoulders, jaw, and neck.',
    detail: 'Traders often unconsciously tense their upper posture during market volatility. Drop your shoulders 2 inches. Unclench your jaw.',
    durationSeconds: 45,
    soundPreset: 'OCEAN',
  },
  {
    number: 5,
    title: 'REFLECT',
    headline: 'Separate Self-Worth from Market Variance',
    cue: 'A single candle or trade does not define your discipline or worth.',
    detail: 'Remind yourself: Your only job as an elite operator is executing your edge with disciplined risk. Market outcomes have random variance; your execution process is under your control.',
    durationSeconds: 60,
    soundPreset: 'LOW_TONE',
  },
  {
    number: 6,
    title: 'RETURN',
    headline: 'Step Forward with Quiet Composure',
    cue: 'Return when you feel calm, centered, and ready to observe.',
    detail: 'You have cleared cognitive clutter. When you view the charts again, look at them like an objective scientist—patient and grounded.',
    durationSeconds: 30,
    soundPreset: 'CHIME',
  },
];

interface MindResetSessionProps {
  onComplete?: () => void;
}

export const MindResetSession: React.FC<MindResetSessionProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isAutoAdvancing, setIsAutoAdvancing] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(RESET_STEPS[0].durationSeconds);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const step = RESET_STEPS[currentStepIndex];

  // Initialize gentle sound for current step
  useEffect(() => {
    if (isCompleted) return;

    if (step.soundPreset === 'CHIME') {
      soundEngine.playSingingBowlChime(528);
    } else if (step.soundPreset === 'LOW_TONE') {
      soundEngine.startGroundingTone(432, 0.25);
    } else if (step.soundPreset === 'RAIN') {
      soundEngine.startLayer('RAIN');
      soundEngine.setLayerVolume('RAIN', 0.4);
    } else if (step.soundPreset === 'OCEAN') {
      soundEngine.startLayer('OCEAN');
      soundEngine.setLayerVolume('OCEAN', 0.45);
    }

    return () => {
      // Clean up layer when switching
      if (step.soundPreset === 'RAIN') soundEngine.stopLayer('RAIN');
      if (step.soundPreset === 'OCEAN') soundEngine.stopLayer('OCEAN');
    };
  }, [currentStepIndex, isCompleted]);

  // Step countdown
  useEffect(() => {
    if (isCompleted) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (isAutoAdvancing) {
            handleNextStep();
          }
          return step.durationSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStepIndex, isAutoAdvancing, isCompleted]);

  const handleNextStep = () => {
    if (currentStepIndex < RESET_STEPS.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setSecondsRemaining(RESET_STEPS[nextIdx].durationSeconds);
    } else {
      setIsCompleted(true);
      soundEngine.stopAllLayers();
      soundEngine.stopGroundingTone();
      soundEngine.playSingingBowlChime(528);
      if (onComplete) onComplete();
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      setSecondsRemaining(RESET_STEPS[prevIdx].durationSeconds);
    }
  };

  const handleRestart = () => {
    setIsCompleted(false);
    setCurrentStepIndex(0);
    setSecondsRemaining(RESET_STEPS[0].durationSeconds);
  };

  if (isCompleted) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl prime-glass-card border border-teal-500/30 text-center space-y-6 max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono-code px-3 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 uppercase tracking-wider font-bold">
            RESET SESSION COMPLETE
          </span>
          <h3 className="text-2xl font-military font-bold text-slate-100">
            Mindset Grounded & Attention Refreshed
          </h3>
          <p className="text-sm font-mono-code text-slate-400 max-w-lg mx-auto">
            You have paused, breathed, unclenched tension, and regained neutral perspective. Return to trading only if you feel fully composed.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
          <button
            type="button"
            onClick={handleRestart}
            className="px-5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-military font-bold text-slate-300 hover:text-slate-100 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REPEAT RESET SESSION</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Step Stepper Header */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
        {RESET_STEPS.map((s, idx) => {
          const isCurrent = idx === currentStepIndex;
          const isDone = idx < currentStepIndex;

          return (
            <div
              key={s.number}
              onClick={() => {
                setCurrentStepIndex(idx);
                setSecondsRemaining(s.durationSeconds);
              }}
              className={`flex-1 min-w-[100px] p-2.5 rounded-xl border text-center transition cursor-pointer ${
                isCurrent
                  ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-md shadow-teal-500/10'
                  : isDone
                  ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                  : 'bg-slate-950/40 border-slate-900 text-slate-600'
              }`}
            >
              <div className="text-[10px] font-mono-code font-bold">
                STEP {s.number}
              </div>
              <div className="text-xs font-military font-bold truncate">
                {s.title}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Guided Step Card */}
      <div className="prime-glass-card rounded-3xl p-8 sm:p-12 border border-teal-500/20 space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono-code text-slate-400 pb-3 border-b border-slate-800">
          <span className="flex items-center gap-2 text-teal-300 font-bold">
            <Sparkles className="w-4 h-4" />
            GUIDED MIND RESET • STEP {step.number} OF 6
          </span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 font-bold">{secondsRemaining}s</span>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-military font-bold text-slate-100">
            {step.headline}
          </h2>
          <p className="text-base sm:text-lg font-mono-code text-teal-300 italic">
            "{step.cue}"
          </p>
          <p className="text-sm font-mono-code text-slate-400 leading-relaxed max-w-2xl">
            {step.detail}
          </p>
        </div>

        {/* Ambient Wave Graphic Bar */}
        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 transition-all duration-1000"
            style={{ width: `${((step.durationSeconds - secondsRemaining) / step.durationSeconds) * 100}%` }}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
            className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-military font-bold text-slate-400 hover:text-slate-200 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>PREVIOUS</span>
          </button>

          <button
            type="button"
            onClick={handleNextStep}
            className="px-6 py-2.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-military font-bold tracking-wider uppercase hover:bg-teal-400 transition flex items-center gap-2 shadow-lg shadow-teal-500/20 cursor-pointer"
          >
            <span>{currentStepIndex === RESET_STEPS.length - 1 ? 'FINISH RESET' : 'CONTINUE STEP'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
