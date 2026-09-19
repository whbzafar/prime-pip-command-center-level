// PRIMEPIP FX COMMAND CENTER — PSYCHOLOGY CORE 2090
// Interactive Decision Checkpoint & Educational Feedback Component
import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Brain,
  Scale,
  Sparkles,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { TradingScenario, ScenarioDecisionOption } from './scenarioTypes';
import { calmAudio } from '../calmAudio';

interface DecisionCheckpointProps {
  scenario: TradingScenario;
  onDecisionSubmitted: (option: ScenarioDecisionOption) => void;
  className?: string;
}

export const DecisionCheckpoint: React.FC<DecisionCheckpointProps> = ({
  scenario,
  onDecisionSubmitted,
  className = '',
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [confirmedOption, setConfirmedOption] = useState<ScenarioDecisionOption | null>(null);

  const selectedOption = scenario.options.find((opt) => opt.id === selectedOptionId);

  const handleConfirm = () => {
    if (!selectedOption) return;
    setConfirmedOption(selectedOption);

    if (selectedOption.isPlanAligned) {
      calmAudio.playSingingBowlChime(528);
    } else {
      calmAudio.playSingingBowlChime(396);
    }

    onDecisionSubmitted(selectedOption);
  };

  const handleResetChoice = () => {
    setConfirmedOption(null);
    setSelectedOptionId(null);
  };

  return (
    <div
      id="psych-decision-checkpoint"
      className={`space-y-6 ${className}`}
    >
      {/* Context Briefing Header */}
      <div className="border-b border-indigo-900/40 pb-3">
        <div className="flex items-center gap-2 text-[10px] font-mono-code font-bold uppercase tracking-widest text-amber-400">
          <Brain className="w-3.5 h-3.5 text-amber-400" />
          <span>STEP 5 OF 8 • TACTICAL DECISION CHALLENGE</span>
        </div>
        <h4 className="text-base font-military font-bold text-slate-100 mt-1">
          {scenario.pressureEventTitle}
        </h4>
        <p className="text-xs text-slate-300 font-sans mt-0.5">
          {scenario.pressureEventDescription}
        </p>
      </div>

      {/* Predefined Invalidation Reminder */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono-code space-y-1.5">
        <span className="text-[10px] font-military font-bold text-slate-400 uppercase tracking-wider block">
          Your Pre-Agreed Invalidation Rules:
        </span>
        <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
          {scenario.invalidationCriteria.map((crit, idx) => (
            <li key={idx}>{crit}</li>
          ))}
        </ul>
      </div>

      {/* Decision Options Grid */}
      {!confirmedOption ? (
        <div className="space-y-3">
          <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
            Select Your Immediate Action:
          </label>

          <div className="space-y-2.5">
            {scenario.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => setSelectedOptionId(option.id)}
                  className={`p-4 rounded-xl border text-xs font-mono-code transition cursor-pointer select-none ${
                    isSelected
                      ? 'bg-indigo-950/60 border-cyan-400 text-slate-100 ring-2 ring-cyan-500/20 shadow-lg'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-100 block text-xs sm:text-sm">
                        {option.label}
                      </span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {option.actionText}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 flex justify-end">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedOptionId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-military font-bold text-xs uppercase tracking-wider shadow-xl transition active:scale-95 cursor-pointer"
            >
              <span>Lock In Decision</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* STEP 6: EDUCATIONAL FEEDBACK REVEAL */
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
          {/* Outcome Header Banner */}
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
              confirmedOption.isPlanAligned
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
            }`}
          >
            {confirmedOption.isPlanAligned ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertOctagon className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <span className="text-xs font-military font-bold uppercase tracking-wider block">
                {confirmedOption.detailedFeedback.processVerdict}
              </span>
              <p className="text-xs font-mono-code text-slate-300">
                You selected: <span className="text-white font-bold">{confirmedOption.label}</span>
              </p>
            </div>
          </div>

          {/* Educational Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono-code">
            {/* Cognitive Mechanism */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-cyan-400 font-military font-bold uppercase tracking-wider text-[11px]">
                <Brain className="w-4 h-4" />
                <span>Behavioral Mechanism:</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {confirmedOption.detailedFeedback.behavioralMechanism}
              </p>
            </div>

            {/* Probabilistic Reality */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-400 font-military font-bold uppercase tracking-wider text-[11px]">
                <Scale className="w-4 h-4" />
                <span>Probabilistic Reality:</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {confirmedOption.detailedFeedback.probabilisticReality}
              </p>
            </div>
          </div>

          {/* Practical Rule Takeaway */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/50 via-slate-950 to-indigo-950/50 border border-indigo-500/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-teal-300 font-military font-bold uppercase tracking-wider text-[11px]">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Core Takeaway for Live Execution:</span>
            </div>
            <p className="text-slate-200 text-xs font-mono-code leading-relaxed">
              {confirmedOption.detailedFeedback.practicalTakeaway}
            </p>
          </div>

          {/* Reflection Prompt Preview */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono-code text-slate-400 space-y-1">
            <span className="text-slate-300 font-bold block">Reflection Prompt for Step 7:</span>
            <p className="italic text-cyan-200">"{confirmedOption.reflectionFollowUp}"</p>
          </div>

          {/* Re-try or change option button */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetChoice}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono-code transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Alternate Choice</span>
            </button>

            <span className="text-[10px] font-mono-code text-slate-500">
              Click 'Next Step' below to record your reflection
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
