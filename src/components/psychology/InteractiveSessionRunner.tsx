import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Heart,
  HelpCircle,
  ThumbsUp,
  Save,
  Volume2,
} from 'lucide-react';
import {
  InteractiveSession,
  PsychologicalCategory,
  SessionResultLog,
} from './psychologyData';
import { calmAudio } from './calmAudio';
import { BreathingOrb } from './tools/BreathingOrb';
import { ThoughtSorter } from './tools/ThoughtSorter';
import { CognitiveReframer } from './tools/CognitiveReframer';
import { SlowFocusGame } from './tools/SlowFocusGame';
import { PatternTracer } from './tools/PatternTracer';
import { PostLossResetTool } from './tools/PostLossResetTool';
import { PreTradeGroundingTool } from './tools/PreTradeGroundingTool';

interface InteractiveSessionRunnerProps {
  session: InteractiveSession;
  category: PsychologicalCategory;
  onClose: () => void;
  onSaveResult: (result: SessionResultLog) => void;
}

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const InteractiveSessionRunner: React.FC<InteractiveSessionRunnerProps> = ({
  session,
  category,
  onClose,
  onSaveResult,
}) => {
  const [currentStep, setCurrentStep] = useState<StepId>(1);

  // Step 1: Check-in State
  const [initialIntensity, setInitialIntensity] = useState<number>(7);
  const [tensionArea, setTensionArea] = useState<string>('Neck & Shoulders');

  // Step 2: Trigger State
  const [selectedTrigger, setSelectedTrigger] = useState<string>(session.defaultTrigger);
  const [customTrigger, setCustomTrigger] = useState<string>('');

  // Step 5: Practical Decision Rule State
  const [rulePledged, setRulePledged] = useState<boolean>(false);

  // Step 7: "Did this help?" State
  const [shiftedIntensity, setShiftedIntensity] = useState<number>(3);
  const [helpfulness, setHelpfulness] = useState<'SIGNIFICANT' | 'MODERATE' | 'SLIGHT' | 'NONE'>('SIGNIFICANT');
  const [reflectionNotes, setReflectionNotes] = useState<string>('');

  const handleNextStep = () => {
    calmAudio.playSingingBowlChime(500);
    setCurrentStep((prev) => Math.min(8, prev + 1) as StepId);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1) as StepId);
  };

  const handleFinalSave = () => {
    const now = new Date();
    const resultLog: SessionResultLog = {
      id: `log-${Date.now()}`,
      categoryId: category.id,
      sessionId: session.id,
      sessionTitle: session.title,
      timestamp: Date.now(),
      dateStr: now.toISOString().split('T')[0],
      timeStr: now.toTimeString().slice(0, 5),
      initialIntensity,
      shiftedIntensity,
      triggerIdentified: customTrigger.trim() || selectedTrigger,
      physicalTensionArea: tensionArea,
      decisionRulePledged: rulePledged,
      decisionRuleText: session.practicalDecisionRule,
      helpfulnessRating: helpfulness,
      reflectionNotes: reflectionNotes.trim() || undefined,
      habitPointsEarned: 35,
    };

    calmAudio.playSingingBowlChime(580);
    onSaveResult(resultLog);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[#090d19] border border-indigo-500/40 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-indigo-900/40 bg-gradient-to-r from-indigo-950/60 to-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-military font-bold px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
              {category.name}
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 tracking-wider">
                {session.title}
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-mono-code text-slate-400">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>{session.durationMinutes} Min Interactive Protocol</span>
                <span>•</span>
                <span className="text-teal-400 font-bold">Step {currentStep} of 8</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Dots */}
        <div className="grid grid-cols-8 gap-1 p-2 bg-slate-950/80 border-b border-indigo-950">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === currentStep
                  ? 'bg-teal-400 shadow-sm shadow-teal-400'
                  : s < currentStep
                  ? 'bg-indigo-500'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Main Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: CHECK-IN */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-indigo-900/30 pb-3">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
                  STEP 1 OF 8 • EMOTIONAL BASELINE CHECK-IN
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  Assess Current Intensity & Somatic Tension
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Acknowledge your honest physiological state before beginning this regulation exercise.
                </p>
              </div>

              {/* Emotional Intensity Slider */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                    Emotional Intensity Level:
                  </label>
                  <span
                    className={`text-base font-military font-bold px-3 py-0.5 rounded-lg border ${
                      initialIntensity >= 7
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : initialIntensity >= 4
                        ? 'bg-blue-500/20 text-amber-300 border-blue-500/40'
                        : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                    }`}
                  >
                    {initialIntensity} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={initialIntensity}
                  onChange={(e) => setInitialIntensity(Number(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
                <div className="flex justify-between text-[10px] font-mono-code text-slate-500">
                  <span>1: Barely Noticeable</span>
                  <span>5: Moderate Agitation</span>
                  <span>10: Acute Overwhelm / Tilt</span>
                </div>
              </div>

              {/* Somatic Tension Selector */}
              <div className="space-y-2">
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Where do you physically feel this tension most?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono-code">
                  {['Jaw & Face', 'Neck & Shoulders', 'Chest & Lungs', 'Stomach / Gut', 'Hands / Fingers', 'Head / Temples'].map(
                    (area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setTensionArea(area)}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          tensionArea === area
                            ? 'bg-teal-500/20 border-teal-500/60 text-teal-200 font-bold shadow'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {area}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: IDENTIFY TRIGGER */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="border-b border-indigo-900/30 pb-3">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
                  STEP 2 OF 8 • PINPOINT THE CATALYST
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  What Market or Personal Event Triggered This?
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Pinpoint the specific stimulus so we can defuse the exact cognitive loop.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  session.defaultTrigger,
                  'Price abruptly wicked through my planned level and reversed',
                  'Missed an explosive move while away from my desk',
                  'Suffered 2 or more consecutive stop-outs in this session',
                  'Saw a massive winning screenshot on social media',
                  'Market is moving slowly and I felt an urge to force a trade',
                ].map((trig, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedTrigger(trig)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-mono-code transition cursor-pointer ${
                      selectedTrigger === trig
                        ? 'bg-indigo-600/25 border-indigo-400 text-indigo-100 font-bold shadow'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    • {trig}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-mono-code text-slate-400 block">
                  Or describe your specific custom trigger:
                </label>
                <input
                  type="text"
                  value={customTrigger}
                  onChange={(e) => setCustomTrigger(e.target.value)}
                  placeholder="e.g. Slipped 5 pips on news entry and felt angry..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>
          )}

          {/* STEP 3: EXPLAIN TRADING-SPECIFIC PROBLEM */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div className="border-b border-indigo-900/30 pb-3">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
                  STEP 3 OF 8 • NEURO-COGNITIVE MECHANISM
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  Why Your Brain Is Doing This Right Now
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Understanding the evolutionary mechanism immediately reduces self-judgment.
                </p>
              </div>

              {/* Problem Breakdown Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-indigo-950/40 border border-indigo-500/30 space-y-4">
                <div className="flex items-center gap-2 text-xs font-military font-bold text-teal-300 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>The Core Trading Vulnerability:</span>
                </div>
                <p className="text-sm font-mono-code text-slate-200 leading-relaxed">
                  {session.tradingProblemExplanation}
                </p>

                <div className="pt-3 border-t border-indigo-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono-code">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-bold mb-1">Evolutionary Root:</span>
                    <span className="text-slate-300">{category.whyItHappens.evolutionaryRoot}</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-bold mb-1">Cognitive Trap:</span>
                    <span className="text-slate-300">{category.whyItHappens.cognitiveDistortion}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: INTERACTIVE EXERCISE */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="border-b border-indigo-900/30 pb-2">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
                  STEP 4 OF 8 • ACTIVE REGULATION EXERCISE
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-0.5">
                  Engage Somatic & Cognitive Defusion
                </h4>
              </div>

              {/* Dynamic Exercise Rendering */}
              {session.exerciseType === 'BREATHING_ORB' && (
                <BreathingOrb
                  initialMode={session.exerciseCustomData?.breathingMode || 'BOX_4_4_4_4'}
                  targetCycles={3}
                  onComplete={() => {
                    calmAudio.playSingingBowlChime(528);
                  }}
                />
              )}

              {session.exerciseType === 'THOUGHT_SORT' && (
                <ThoughtSorter
                  cards={session.exerciseCustomData?.thoughtCards}
                  title="Filter Process Control vs Market Noise"
                />
              )}

              {session.exerciseType === 'COGNITIVE_REFRAME' && (
                <CognitiveReframer
                  cards={session.exerciseCustomData?.reframeCards}
                  title="Invert Emotional Distortion Into Statistical Truth"
                />
              )}

              {session.exerciseType === 'SLOW_FOCUS' && (
                <SlowFocusGame durationSeconds={35} />
              )}

              {session.exerciseType === 'PATTERN_TRACE' && (
                <PatternTracer
                  patternType={session.exerciseCustomData?.patternType || 'INFINITY'}
                />
              )}

              {session.exerciseType === 'POST_LOSS_RESET' && (
                <PostLossResetTool />
              )}

              {session.exerciseType === 'PRE_TRADE_GROUNDING' && (
                <PreTradeGroundingTool />
              )}

              {session.exerciseType === 'DECISION_PLEDGE' && (
                <div className="p-6 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 text-center space-y-4">
                  <h5 className="text-base font-military font-bold text-slate-100 uppercase">
                    Commitment to Process
                  </h5>
                  <p className="text-sm font-mono-code text-slate-300 max-w-md mx-auto">
                    {session.practicalDecisionRule}
                  </p>
                  <button
                    type="button"
                    onClick={() => calmAudio.playSingingBowlChime(528)}
                    className="px-5 py-2 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 font-mono-code text-xs font-bold"
                  >
                    ✓ I Solemnly Affirm This Rule
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: PRACTICAL DECISION RULE */}
          {currentStep === 5 && (
            <div className="space-y-5">
              <div className="border-b border-indigo-900/30 pb-3">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
                  STEP 5 OF 8 • CONCRETE OPERATIONAL BOUNDARY
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  Commit to a Concrete Action Rule
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Feelings fade, but pre-committed rules protect capital during emotional fog.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950/80 border-2 border-indigo-500/40 space-y-4 shadow-xl">
                <span className="text-[10px] font-military font-bold text-cyan-400 uppercase tracking-widest">
                  OPERATIONAL COMMANDMENT:
                </span>
                <p className="text-base sm:text-lg font-mono-code font-bold text-slate-100 leading-snug">
                  "{session.practicalDecisionRule}"
                </p>

                <label
                  onClick={() => setRulePledged(!rulePledged)}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer select-none transition ${
                    rulePledged
                      ? 'bg-teal-950/40 border-teal-500/60 text-teal-200 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                      rulePledged ? 'bg-teal-500 border-teal-400 text-slate-950' : 'border-slate-700'
                    }`}
                  >
                    {rulePledged && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-mono-code font-bold">
                    I solemnly commit to honoring this operational boundary for this session.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 6: GROUNDING / RESET */}
          {currentStep === 6 && (
            <div className="space-y-5 text-center py-2">
              <div className="border-b border-indigo-900/30 pb-3 text-left">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
                  STEP 6 OF 8 • SOMATIC GROUNDING RESET
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  Final Somatic Realignment
                </h4>
              </div>

              <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 mx-auto">
                <Heart className="w-8 h-8 text-teal-400 animate-pulse" />
              </div>

              <div className="max-w-md mx-auto space-y-3">
                <h5 className="text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                  {session.groundingPrompt}
                </h5>
                <p className="text-xs font-mono-code text-slate-400">
                  Release all residual tension. The market is merely an auction of prices; you are the calm, disciplined master of your own process.
                </p>
              </div>

              <button
                type="button"
                onClick={() => calmAudio.playSingingBowlChime(528)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-indigo-300 text-xs font-mono-code hover:bg-slate-800 transition cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-teal-400" />
                <span>Sound Tibetan Reset Chime</span>
              </button>
            </div>
          )}

          {/* STEP 7: "DID THIS HELP?" */}
          {currentStep === 7 && (
            <div className="space-y-5">
              <div className="border-b border-indigo-900/30 pb-3">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
                  STEP 7 OF 8 • FEEDBACK & SHIFT AUDIT
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  Did This Protocol Help Reset Your State?
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Track the quantitative shift in your nervous system.
                </p>
              </div>

              {/* Helpfulness Rating Buttons */}
              <div className="space-y-2">
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Perceived Regulation Impact:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'SIGNIFICANT', label: 'Significantly', color: 'border-teal-500 text-teal-300 bg-teal-500/10' },
                    { id: 'MODERATE', label: 'Moderately', color: 'border-indigo-500 text-indigo-300 bg-indigo-500/10' },
                    { id: 'SLIGHT', label: 'Slightly', color: 'border-blue-500 text-amber-300 bg-blue-500/10' },
                    { id: 'NONE', label: 'Need More Time', color: 'border-slate-700 text-slate-400 bg-slate-950' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setHelpfulness(opt.id as any)}
                      className={`p-3 rounded-xl border text-xs font-mono-code font-bold transition cursor-pointer ${
                        helpfulness === opt.id ? `${opt.color} ring-2 ring-indigo-400` : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shifted Intensity Slider */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                    New Emotional Intensity Level:
                  </label>
                  <span className="text-base font-military font-bold px-3 py-0.5 rounded-lg border bg-teal-500/20 text-teal-300 border-teal-500/40">
                    {shiftedIntensity} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={shiftedIntensity}
                  onChange={(e) => setShiftedIntensity(Number(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
                <div className="flex justify-between text-[10px] font-mono-code text-slate-500">
                  <span>Shift: {initialIntensity} → {shiftedIntensity} (Δ -{Math.max(0, initialIntensity - shiftedIntensity)})</span>
                  <span className="text-emerald-400 font-bold">
                    {initialIntensity > shiftedIntensity ? '✓ Down-Regulated' : 'Neutral'}
                  </span>
                </div>
              </div>

              {/* Reflection text */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono-code text-slate-400 block">
                  Optional Reflection Note (for your psychology audit journal):
                </label>
                <textarea
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  placeholder="What was the key insight that helped you regain composure?..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>
          )}

          {/* STEP 8: SAVE RESULT */}
          {currentStep === 8 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <h4 className="text-lg font-military font-bold text-slate-100 uppercase tracking-wider">
                Session Complete • Process Habit Mastered
              </h4>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto text-xs font-mono-code space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="text-slate-200 font-bold">{category.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Intensity Shift:</span>
                  <span className="text-emerald-400 font-bold">
                    {initialIntensity}/10 → {shiftedIntensity}/10
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Process Habit Reward:</span>
                  <span className="text-cyan-400 font-bold">+35 Habit Points</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleFinalSave}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white font-military text-xs font-bold tracking-wider uppercase shadow-xl hover:opacity-95 transition cursor-pointer"
                >
                  SAVE RESULT & RETURN TO CENTER
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar */}
        <div className="p-4 border-t border-indigo-900/40 bg-slate-950/90 flex items-center justify-between">
          {currentStep > 1 && currentStep < 8 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 8 && (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 text-white font-military text-xs font-bold tracking-wider uppercase shadow-lg hover:opacity-95 transition cursor-pointer"
            >
              <span>{currentStep === 7 ? 'View Summary' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
