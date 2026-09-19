// PRIMEPIP FX COMMAND CENTER — PSYCHOLOGY CORE 2090
// Unified 8-Stage Interactive Session Runner with Simulation Engine
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
  Brain,
  TrendingUp,
  ShieldCheck,
  AlertOctagon,
  Scale,
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
import { ScenarioSimulator } from './simulation/ScenarioSimulator';
import { DecisionCheckpoint } from './simulation/DecisionCheckpoint';
import { getScenarioForCategory } from './simulation/scenariosData';
import { ScenarioDecisionOption } from './simulation/scenarioTypes';

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
  const [selectedTrigger, setSelectedTrigger] = useState<string>(session.defaultTrigger);
  const [customTrigger, setCustomTrigger] = useState<string>('');

  // Scenario Data & Decision State (Steps 4, 5, 6)
  const scenario = getScenarioForCategory(category.id, session.id);
  const [chosenOption, setChosenOption] = useState<ScenarioDecisionOption | null>(null);
  const [rulePledged, setRulePledged] = useState<boolean>(false);

  // Step 7: Reflection & Shift State
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
      scenarioSymbol: scenario.symbol,
      scenarioDecision: chosenOption ? chosenOption.label : undefined,
      isPlanAligned: chosenOption ? chosenOption.isPlanAligned : true,
    };

    calmAudio.playSingingBowlChime(580);
    onSaveResult(resultLog);
    onClose();
  };

  const stepLabels: Record<StepId, string> = {
    1: '1. Self-Check-In',
    2: '2. Psychological Core',
    3: '3. Guided Regulation',
    4: '4. Trading Scenario',
    5: '5. Decision Challenge',
    6: '6. Educational Feedback',
    7: '7. Personal Reflection',
    8: '8. Mastery Report',
  };

  return (
    <div
      id="psych-interactive-runner-modal"
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-[#070b16] border border-indigo-500/40 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-indigo-900/40 bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-slate-950 flex items-center justify-between">
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
                <span>{session.durationMinutes} Min 2090 Protocol</span>
                <span>•</span>
                <span className="text-cyan-400 font-bold">{stepLabels[currentStep]}</span>
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
        <div className="grid grid-cols-8 gap-1 p-2 bg-slate-950/90 border-b border-indigo-950">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === currentStep
                  ? 'bg-cyan-400 shadow-sm shadow-cyan-400'
                  : s < currentStep
                  ? 'bg-indigo-600'
                  : 'bg-slate-800'
              }`}
              title={stepLabels[s as StepId]}
            />
          ))}
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* ========================================================================= */}
          {/* STEP 1: EMOTIONAL BASELINE CHECK-IN */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-indigo-900/30 pb-3">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-cyan-400">
                  STEP 1 OF 8 • EMOTIONAL SELF-CHECK-IN
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  Assess Current Intensity & Somatic Tension
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Acknowledge your honest baseline physiological state before engaging this training protocol.
                </p>
              </div>

              {/* Intensity Slider */}
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                    Current Emotional Intensity Level:
                  </label>
                  <span
                    className={`text-base font-military font-bold px-3 py-0.5 rounded-lg border ${
                      initialIntensity >= 7
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : initialIntensity >= 4
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
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
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] font-mono-code text-slate-500">
                  <span>1: Centered & Calm</span>
                  <span>5: Moderate Agitation</span>
                  <span>10: Acute Overwhelm / Panic</span>
                </div>
              </div>

              {/* Somatic Tension Selector */}
              <div className="space-y-2">
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  Where do you physically feel this sensation most?
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
                            ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 font-bold shadow'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {area}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Catalyst Selection */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider block">
                  What catalyst stimulated this state?
                </label>
                <div className="space-y-1.5">
                  {[
                    session.defaultTrigger,
                    'Price pulled back sharply right after my entry fill',
                    'Suffered consecutive losses in this trading window',
                    'Hesitated and watched a valid confluence setup expand without me',
                    'Market is moving slowly and I felt an urge to force a trade',
                  ].map((trig, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedTrigger(trig)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs font-mono-code transition cursor-pointer ${
                        selectedTrigger === trig
                          ? 'bg-indigo-600/30 border-cyan-400 text-cyan-100 font-bold'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      • {trig}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PSYCHOLOGICAL EXPLANATION & MECHANISM */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-indigo-900/30 pb-3">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-cyan-400">
                  STEP 2 OF 8 • NEURO-COGNITIVE MECHANISM
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  Why Your Brain Reacts This Way
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Understanding the evolutionary mechanism immediately removes self-blame and restores objective awareness.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-indigo-950/50 border border-indigo-500/30 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 text-xs font-military font-bold text-cyan-300 uppercase tracking-wider">
                  <Brain className="w-4 h-4 text-cyan-400" />
                  <span>The Core Trading Vulnerability:</span>
                </div>
                <p className="text-sm font-mono-code text-slate-200 leading-relaxed">
                  {session.tradingProblemExplanation}
                </p>

                <div className="pt-3 border-t border-indigo-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono-code">
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-bold mb-1">Evolutionary Root:</span>
                    <span className="text-slate-300">{category.whyItHappens.evolutionaryRoot}</span>
                  </div>
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block font-bold mb-1">Cognitive Trap:</span>
                    <span className="text-slate-300">{category.whyItHappens.cognitiveDistortion}</span>
                  </div>
                </div>
              </div>

              {/* Warning Signs Briefing */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider block">
                  Observable Behavioral Warning Signs:
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs font-mono-code text-slate-400">
                  {category.warningSigns.behavioral.map((sign, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-cyan-400">•</span>
                      <span>{sign}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: GUIDED REGULATION ACTIVITY */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-indigo-900/30 pb-2">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-cyan-400">
                  STEP 3 OF 8 • GUIDED REGULATION ACTIVITY
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-0.5">
                  Calm Nervous System Before Scenario Execution
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Engage this somatic or cognitive defusion exercise to return your brain to peak executive decision readiness.
                </p>
              </div>

              {/* Dynamic Exercise Rendering */}
              {session.exerciseType === 'BREATHING_ORB' && (
                <BreathingOrb
                  initialMode={session.exerciseCustomData?.breathingMode || 'RELAX_4_7_8'}
                  targetCycles={3}
                  onComplete={() => calmAudio.playSingingBowlChime(528)}
                />
              )}

              {session.exerciseType === 'THOUGHT_SORT' && (
                <ThoughtSorter
                  cards={session.exerciseCustomData?.thoughtCards}
                  title="Filter Process Control vs Stochastic Market Noise"
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
                    className="px-5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono-code text-xs font-bold cursor-pointer"
                  >
                    ✓ I Solemnly Affirm This Rule
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: INTERACTIVE TRADING SCENARIO SIMULATION */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-indigo-900/30 pb-2">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-cyan-400">
                  STEP 4 OF 8 • INTERACTIVE TRADING SCENARIO
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-0.5">
                  2090 Candlestick Simulation Engine
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Watch the simulated market unfold. Notice how your body reacts as price approaches the key emotional inflection zone.
                </p>
              </div>

              {/* The Reusable Candlestick Simulation Canvas */}
              <ScenarioSimulator
                scenario={scenario}
                onProceedToDecision={() => setCurrentStep(5)}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: DECISION-MAKING CHALLENGE */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <DecisionCheckpoint
                scenario={scenario}
                onDecisionSubmitted={(option) => {
                  setChosenOption(option);
                }}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: EDUCATIONAL FEEDBACK & RULE COMMITMENT */}
          {/* ========================================================================= */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-indigo-900/30 pb-3">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-cyan-400">
                  STEP 6 OF 8 • EDUCATIONAL FEEDBACK & CONCRETE BOUNDARY
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  Process Alignment & Operational Commandment
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Feelings fluctuate, but pre-committed boundaries protect capital during emotional fog.
                </p>
              </div>

              {/* Chosen Decision Summary Banner */}
              {chosenOption && (
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    chosenOption.isPlanAligned
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {chosenOption.isPlanAligned ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-military font-bold uppercase block">
                        Decision: {chosenOption.label}
                      </span>
                      <span className="text-[11px] font-mono-code text-slate-300">
                        {chosenOption.detailedFeedback.processVerdict}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono-code font-bold px-2 py-1 rounded bg-slate-950 border border-slate-800">
                    {chosenOption.isPlanAligned ? 'PLAN-ALIGNED' : 'IMPULSE BREACH'}
                  </span>
                </div>
              )}

              {/* Practical Rule Commitment Card */}
              <div className="p-6 rounded-2xl bg-slate-950/90 border-2 border-indigo-500/40 space-y-4 shadow-xl">
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
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-200 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                      rulePledged ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-700'
                    }`}
                  >
                    {rulePledged && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <span className="text-xs font-mono-code font-bold">
                    I solemnly commit to honoring this operational boundary in live market conditions.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 7: PERSONAL REFLECTION & SHIFT AUDIT */}
          {/* ========================================================================= */}
          {currentStep === 7 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-indigo-900/30 pb-3">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-cyan-400">
                  STEP 7 OF 8 • PERSONAL REFLECTION & SHIFT AUDIT
                </span>
                <h4 className="text-base font-military font-bold text-slate-100 mt-1">
                  Track the Quantitative Shift in Your Nervous System
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Record how this exercise changed your internal state and note key takeaways for your psychology log.
                </p>
              </div>

              {/* Shifted Intensity Slider */}
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-2xl border border-indigo-900/40">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                    Post-Exercise Emotional Intensity:
                  </label>
                  <span className="text-base font-military font-bold px-3 py-0.5 rounded-lg border bg-cyan-500/20 text-cyan-300 border-cyan-500/40">
                    {shiftedIntensity} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={shiftedIntensity}
                  onChange={(e) => setShiftedIntensity(Number(e.target.value))}
                  className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] font-mono-code text-slate-500">
                  <span>Shift: {initialIntensity} → {shiftedIntensity} (Δ -{Math.max(0, initialIntensity - shiftedIntensity)})</span>
                  <span className="text-emerald-400 font-bold">
                    {initialIntensity > shiftedIntensity ? '✓ Down-Regulated' : 'Neutral Baseline'}
                  </span>
                </div>
              </div>

              {/* Guided Reflection Prompt */}
              {chosenOption && (
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs font-mono-code text-slate-300 space-y-1">
                  <span className="text-cyan-400 font-bold block uppercase text-[10px]">
                    Tailored Reflection Prompt:
                  </span>
                  <p className="italic text-slate-200">"{chosenOption.reflectionFollowUp}"</p>
                </div>
              )}

              {/* Reflection Journal Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider block">
                  Your Psychology Log Reflection Note:
                </label>
                <textarea
                  value={reflectionNotes}
                  onChange={(e) => setReflectionNotes(e.target.value)}
                  placeholder="What key insight or bodily shift occurred during this protocol?..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Helpfulness Rating */}
              <div className="space-y-2">
                <label className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider block">
                  Perceived Regulation Impact:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'SIGNIFICANT', label: 'Significantly', color: 'border-cyan-500 text-cyan-300 bg-cyan-500/10' },
                    { id: 'MODERATE', label: 'Moderately', color: 'border-indigo-500 text-indigo-300 bg-indigo-500/10' },
                    { id: 'SLIGHT', label: 'Slightly', color: 'border-amber-500 text-amber-300 bg-amber-500/10' },
                    { id: 'NONE', label: 'Need More Time', color: 'border-slate-700 text-slate-400 bg-slate-950' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setHelpfulness(opt.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-mono-code font-bold transition cursor-pointer ${
                        helpfulness === opt.id ? `${opt.color} ring-2 ring-cyan-400` : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 8: PRACTICE HISTORY & MASTERY AUDIT */}
          {/* ========================================================================= */}
          {currentStep === 8 && (
            <div className="space-y-5 text-center py-4 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-lg font-military font-bold text-slate-100 uppercase tracking-wider">
                  Session Complete • Mastery Record Stored
                </h4>
                <p className="text-xs text-slate-400 font-mono-code mt-1">
                  Your process adherence record will be saved to your local practice history.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto text-xs font-mono-code space-y-2.5 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="text-slate-200 font-bold">{category.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Simulation Scenario:</span>
                  <span className="text-cyan-300 font-bold">{scenario.symbol}</span>
                </div>
                {chosenOption && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tactical Choice:</span>
                    <span className={chosenOption.isPlanAligned ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {chosenOption.shortDescription}
                    </span>
                  </div>
                )}
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

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleFinalSave}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-slate-950 font-military text-xs font-bold tracking-wider uppercase shadow-xl hover:opacity-95 transition active:scale-95 cursor-pointer"
                >
                  SAVE RESULT & RETURN TO CENTER
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation Toolbar */}
        <div className="p-4 border-t border-indigo-900/40 bg-slate-950/95 flex items-center justify-between">
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-slate-950 font-military text-xs font-bold tracking-wider uppercase shadow-lg hover:opacity-95 transition active:scale-95 cursor-pointer"
            >
              <span>{currentStep === 7 ? 'View Final Report' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
