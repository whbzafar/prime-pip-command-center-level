import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, RotateCcw, Clock, HeartHandshake, Sparkles, Wind } from 'lucide-react';
import { calmAudio } from '../calmAudio';
import { BreathingOrb } from './BreathingOrb';

interface PostLossResetToolProps {
  onComplete?: () => void;
}

export const PostLossResetTool: React.FC<PostLossResetToolProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [checklist, setChecklist] = useState<{ [key: string]: boolean }>({
    rule1: false,
    rule2: false,
    rule3: false,
    rule4: false,
  });

  const toggleCheck = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
    calmAudio.playSingingBowlChime(480);
  };

  const allChecked = Object.values(checklist).every(Boolean);

  const handleFinish = () => {
    calmAudio.playSingingBowlChime(528);
    if (onComplete) onComplete();
  };

  return (
    <div className="bg-[#0b101e] border border-rose-900/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-900/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-rose-400">
              EMERGENCY DECOMPRESSION
            </span>
            <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase mt-0.5">
              Post-Loss Nervous System Reset
            </h4>
          </div>
        </div>
        <div className="text-xs font-mono-code text-rose-300">Phase {currentStep} of 3</div>
      </div>

      {/* Phase 1: Autonomic Down-Regulation */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs font-mono-code text-rose-200">
            <strong>Phase 1: Physiological De-escalation.</strong> A stop-loss causes an immediate adrenaline dump into your blood. Take 3 cycles of Physiological Sigh to purge CO2 and prevent retaliatory revenge trading.
          </div>

          <BreathingOrb
            initialMode="PHYSIOLOGICAL_SIGH"
            targetCycles={3}
            onComplete={() => {
              calmAudio.playSingingBowlChime(528);
            }}
          />

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-military text-xs font-bold tracking-wider uppercase shadow-lg shadow-rose-500/20 hover:opacity-95 cursor-pointer"
            >
              Proceed to Phase 2: Decouple Outcome
            </button>
          </div>
        </div>
      )}

      {/* Phase 2: Decouple Identity & Outcome */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs font-mono-code text-indigo-200">
            <strong>Phase 2: Rational Fact Audit.</strong> Confirm your adherence to institutional risk protocols. Check off each reality:
          </div>

          <div className="space-y-2.5">
            {[
              {
                id: 'rule1',
                title: 'The defined 1R risk was mathematically capped',
                desc: 'My stop loss was hit at my planned price. The remaining 99% of my capital is 100% intact.',
              },
              {
                id: 'rule2',
                title: 'This loss contains zero information about my personal intelligence',
                desc: 'Losses are randomly distributed across any mathematical edge. Even legendary traders experience 40% loss rates.',
              },
              {
                id: 'rule3',
                title: 'I refuse to enter any retaliatory trade today',
                desc: 'Re-entering out of indignation is gambling. I will not donate my hard-earned capital to the market in a rage.',
              },
              {
                id: 'rule4',
                title: 'The trade outcome is fully settled and accepted',
                desc: 'I release the trade with dignity. It belongs to past data.',
              },
            ].map((item) => (
              <label
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition select-none ${
                  checklist[item.id]
                    ? 'bg-teal-950/30 border-teal-500/50 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                    checklist[item.id]
                      ? 'bg-teal-500 border-teal-400 text-slate-950'
                      : 'border-slate-700'
                  }`}
                >
                  {checklist[item.id] && <CheckCircle2 className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-mono-code font-bold text-slate-200">
                    {item.title}
                  </div>
                  <div className="text-[11px] font-sans text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs font-mono-code text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              ← Back to Breathing
            </button>
            <button
              type="button"
              disabled={!allChecked}
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-military text-xs font-bold tracking-wider uppercase shadow-lg disabled:opacity-40 cursor-pointer"
            >
              Proceed to Phase 3: Lockout
            </button>
          </div>
        </div>
      )}

      {/* Phase 3: Final Lockout & Capital Preservation Contract */}
      {currentStep === 3 && (
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 mx-auto mb-2">
            <HeartHandshake className="w-6 h-6" />
          </div>

          <h5 className="text-base font-military font-bold text-slate-100 uppercase tracking-wider">
            Capital Preservation Vow Active
          </h5>
          <p className="text-xs font-mono-code text-slate-300 max-w-md mx-auto leading-relaxed">
            "I have accepted this loss with professional calm. I protect my account like a fortress. I will not trade again until my nervous system is 100% neutral and a pristine playbook setup appears."
          </p>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-sm mx-auto text-xs font-mono-code text-slate-400 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Recommended Cooldown Interval: <strong>30 Minutes</strong></span>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-military text-xs font-bold tracking-wider uppercase shadow-xl hover:opacity-95 cursor-pointer"
            >
              Complete Post-Loss Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
