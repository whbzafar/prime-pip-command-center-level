import React, { useState } from 'react';
import { Eye, Hand, Ear, Wind, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { calmAudio } from '../calmAudio';

interface PreTradeGroundingToolProps {
  onComplete?: () => void;
}

export const PreTradeGroundingTool: React.FC<PreTradeGroundingToolProps> = ({ onComplete }) => {
  const [step, setStep] = useState<number>(1);
  const [answers, setAnswers] = useState<{ [key: string]: boolean }>({});

  const toggleCheck = (id: string) => {
    setAnswers((prev) => ({ ...prev, [id]: true }));
    calmAudio.playSingingBowlChime(528);
  };

  const isCurrentStepDone = answers[`step_${step}`];

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      calmAudio.playSingingBowlChime(640);
      if (onComplete) onComplete();
    }
  };

  const stepsData = [
    {
      num: 5,
      label: 'Vision: 5 Structural Anchors',
      icon: Eye,
      prompt: 'Look at your charting screen. Acknowledge 5 objective technical facts:',
      bullets: [
        'Identify the Higher Timeframe (4h/1h) trend direction',
        'Identify the exact liquidity pool that was recently swept',
        'Confirm the location of the technical invalidation point (Stop Loss)',
        'Check that the economic calendar has no imminent red-folder news',
        'Verify that your risk-to-reward ratio is at least 1:1.5',
      ],
      checkLabel: 'I have visually confirmed these 5 structural anchors.',
    },
    {
      num: 4,
      label: 'Somatic: 4 Physical Checkpoints',
      icon: Hand,
      prompt: 'Scan your physical vessel right now for hidden fight-or-flight tension:',
      bullets: [
        'Unclench your jaw and separate your back teeth',
        'Drop both shoulders down away from your ears',
        'Place both feet flat and firmly grounded on the floor',
        'Relax your hand grip on the mouse or keyboard',
      ],
      checkLabel: 'My body is relaxed, grounded, and physically centered.',
    },
    {
      num: 3,
      label: 'Auditory: 3 Ambient Anchors',
      icon: Ear,
      prompt: 'Tune your hearing outward away from your internal panic chatter:',
      bullets: [
        'Notice the subtle sound of room silence or gentle background hum',
        'Listen to the steady rhythm of your own respiratory cycle',
        'Acknowledge that there are no external alarms or physical emergencies',
      ],
      checkLabel: 'I am grounded in present sensory reality.',
    },
    {
      num: 2,
      label: 'Respiration: 2 Deep Centering Breaths',
      icon: Wind,
      prompt: 'Perform two expansive, slow diaphragmatic breaths:',
      bullets: [
        'Breath 1: Inhale deep into belly for 4s, slow exhale for 6s',
        'Breath 2: Inhale fresh clarity for 4s, slow sigh exhale for 7s',
      ],
      checkLabel: 'My nervous system is balanced and operating in executive control.',
    },
    {
      num: 1,
      label: 'Risk Acceptance: The 1 Sacred Axiom',
      icon: ShieldCheck,
      prompt: 'Read and accept the ultimate truth of market execution:',
      bullets: [
        '"I fully accept the predetermined dollar risk of this execution before submitting the order."',
        '"The outcome of this single trade is completely uncertain and has zero bearing on my worth."',
        '"Once active, I will not interfere with my planned Stop Loss or Take Profit."',
      ],
      checkLabel: 'I accept 100% of the mathematical risk. I execute with zero fear.',
    },
  ];

  const currentStepData = stepsData[step - 1];
  const StepIcon = currentStepData.icon;

  return (
    <div className="bg-[#0b101e] border border-indigo-900/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
            <StepIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
              5-4-3-2-1 SENSORY ANCHOR
            </span>
            <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase mt-0.5">
              Pre-Trade Grounding & Risk Acceptance
            </h4>
          </div>
        </div>
        <div className="text-xs font-mono-code text-teal-300">Step {step} of 5</div>
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        <div className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
          {currentStepData.label}
        </div>
        <p className="text-xs font-mono-code text-slate-400">{currentStepData.prompt}</p>

        <div className="space-y-2 p-4 rounded-xl bg-slate-950/70 border border-indigo-900/30 text-xs font-mono-code text-slate-300">
          {currentStepData.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-teal-400 font-bold">•</span>
              <span>{b}</span>
            </div>
          ))}
        </div>

        {/* Affirmation Checkbox */}
        <label
          onClick={() => toggleCheck(`step_${step}`)}
          className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition ${
            isCurrentStepDone
              ? 'bg-teal-950/30 border-teal-500/50 text-teal-200'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div
            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
              isCurrentStepDone ? 'bg-teal-500 border-teal-400 text-slate-950' : 'border-slate-700'
            }`}
          >
            {isCurrentStepDone && <CheckCircle2 className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-mono-code font-bold">{currentStepData.checkLabel}</span>
        </label>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="text-xs font-mono-code text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            ← Previous Step
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          disabled={!isCurrentStepDone}
          onClick={handleNext}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-military text-xs font-bold tracking-wider uppercase shadow-lg disabled:opacity-40 cursor-pointer"
        >
          {step === 5 ? 'Complete Grounding' : 'Continue Grounding →'}
        </button>
      </div>
    </div>
  );
};
