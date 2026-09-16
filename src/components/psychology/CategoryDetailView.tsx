import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Brain,
  ShieldCheck,
  BookOpen,
  History,
  Clock,
  Compass,
  Zap,
  HelpCircle,
  TrendingDown,
} from 'lucide-react';
import {
  PsychologicalCategory,
  InteractiveSession,
  SessionResultLog,
  HabitProgressState,
} from './psychologyData';
import { InteractiveSessionRunner } from './InteractiveSessionRunner';

interface CategoryDetailViewProps {
  category: PsychologicalCategory;
  onBack: () => void;
  resultLogs: SessionResultLog[];
  onSaveResult: (result: SessionResultLog) => void;
  habitProgress: HabitProgressState;
}

type TabType = 'DIAGNOSTIC' | 'SESSIONS' | 'OVERVIEW' | 'SIGNS' | 'REFLECTIONS' | 'LOGS';

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  category,
  onBack,
  resultLogs,
  onSaveResult,
  habitProgress,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('DIAGNOSTIC');
  const [activeSessionToRun, setActiveSessionToRun] = useState<InteractiveSession | null>(null);

  // Filter logs for this specific category
  const categoryLogs = resultLogs.filter((l) => l.categoryId === category.id);
  const completedCount = categoryLogs.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Active Interactive Session Runner Modal */}
      {activeSessionToRun && (
        <InteractiveSessionRunner
          session={activeSessionToRun}
          category={category}
          onClose={() => setActiveSessionToRun(null)}
          onSaveResult={onSaveResult}
        />
      )}

      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/30 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono-code text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All 17 Categories</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono-code text-slate-400">Mastery Level:</span>
          <span className="text-xs font-military font-bold px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40">
            Level {Math.min(5, Math.floor(completedCount / 2) + 1)}/5
          </span>
          <span className="text-[11px] font-mono-code text-indigo-400">
            ({completedCount} sessions completed)
          </span>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#0d1424] via-indigo-950/40 to-slate-950 border border-indigo-500/30 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="text-xs font-military font-bold px-3 py-1 rounded-xl bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 uppercase tracking-widest">
              CATEGORY SPECIALIZATION
            </span>
            <span className="text-[10px] font-mono-code text-slate-400">
              5 INTERACTIVE SESSIONS AVAILABLE
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-military font-black tracking-wider text-slate-100 uppercase">
            {category.name}
          </h2>

          <p className="text-sm font-mono-code text-slate-300 leading-relaxed">
            {category.shortDescription}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono-code text-slate-400">
            <div className="flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-teal-400" />
              <span>Cognitive Trap: <strong className="text-slate-200">{category.whyItHappens.cognitiveDistortion}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Capital Risk: <strong className="text-slate-200">{category.possibleImpact.capitalRisk}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-indigo-900/30 pb-2">
        {[
          { id: 'DIAGNOSTIC', label: '1. What It Is & How To Prevent It', icon: Sparkles },
          { id: 'SESSIONS', label: '2. 5 Interactive Sessions', icon: Play },
          { id: 'OVERVIEW', label: '3. Neuro-Mechanisms & Impact', icon: Brain },
          { id: 'SIGNS', label: '4. Warning Signs & Symptoms', icon: AlertTriangle },
          { id: 'REFLECTIONS', label: '5. Deep Reflections', icon: BookOpen },
          { id: 'LOGS', label: `6. Result Logs (${completedCount})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-military font-bold tracking-wider uppercase transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-600/40 to-teal-600/30 border border-indigo-400 text-indigo-100 shadow-md'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-teal-400" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 0: DIAGNOSTIC GUIDE (WHAT IT IS, HOW IT OCCURS, SYMPTOMS, HOW TO PREVENT IT) */}
      {activeTab === 'DIAGNOSTIC' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. What It Is in Simple Language */}
            <div className="p-6 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-3">
              <div className="flex items-center gap-2 text-sm font-military font-bold text-teal-300 uppercase tracking-wider border-b border-indigo-900/30 pb-3">
                <Brain className="w-4 h-4 text-teal-400" />
                <span>1. WHAT IT IS (SIMPLE LANGUAGE EXPLANATION)</span>
              </div>
              <p className="text-sm font-mono-code text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                {category.shortDescription || (category as any).tagline || `${category.name} is a psychological state where emotional impulse overrides rule-based trade execution.`}
              </p>
              <div className="text-xs font-mono-code text-slate-400 leading-relaxed">
                Core Cognitive Trap: <strong className="text-teal-300">{category.whyItHappens.cognitiveDistortion}</strong>
              </div>
            </div>

            {/* 2. How It Occurs */}
            <div className="p-6 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-3">
              <div className="flex items-center gap-2 text-sm font-military font-bold text-amber-300 uppercase tracking-wider border-b border-indigo-900/30 pb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>2. HOW IT OCCURS (TRIGGER TO ACTION CYCLE)</span>
              </div>
              <div className="space-y-2 text-xs font-mono-code text-slate-300">
                <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">1</span>
                  <span><strong>Trigger:</strong> Rapid price expansion or sudden PnL change triggers amygdala survival response.</span>
                </div>
                <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">2</span>
                  <span><strong>Distortion:</strong> Mind creates an irrational sense of urgency: {category.whyItHappens.evolutionaryRoot}</span>
                </div>
                <div className="flex items-start gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0">3</span>
                  <span><strong>Impulse:</strong> Prefrontal cortex executive function temporarily drops, leading to unverified order clicks.</span>
                </div>
              </div>
            </div>

            {/* 3. Symptoms */}
            <div className="p-6 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-3">
              <div className="flex items-center gap-2 text-sm font-military font-bold text-rose-300 uppercase tracking-wider border-b border-indigo-900/30 pb-3">
                <Zap className="w-4 h-4 text-rose-400" />
                <span>3. RECOGNIZED SYMPTOMS (WARNING SIGNS)</span>
              </div>
              <div className="space-y-3 text-xs font-mono-code">
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Physical Body Sensations:</span>
                  <p className="text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    {category.warningSigns?.physical?.join(', ') || 'Shallow breathing, elevated pulse, clenched jaw, shoulder tightness.'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Mental / Internal Thoughts:</span>
                  <p className="text-rose-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 italic">
                    "{category.warningSigns?.mental?.[0] || 'I have to make back what I lost right now'}" or "{category.warningSigns?.mental?.[1] || 'If I do not enter this candle I will miss the move'}"
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-1">Behavioral Patterns:</span>
                  <p className="text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    {category.warningSigns?.behavioral?.join(', ') || 'Switching timeframes frantically, increasing lot size without calculation, ignoring Stop Loss.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 4. How To Prevent It */}
            <div className="p-6 rounded-2xl bg-[#0b101e] border border-teal-900/40 space-y-3">
              <div className="flex items-center gap-2 text-sm font-military font-bold text-teal-300 uppercase tracking-wider border-b border-teal-900/30 pb-3">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>4. HOW TO PREVENT IT (CLINICAL ACTION PROTOCOL)</span>
              </div>
              <div className="space-y-2 text-xs font-mono-code">
                <div className="flex items-start gap-2 bg-teal-950/30 p-3 rounded-lg border border-teal-900/30 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span><strong>Physical Brake:</strong> Step away from the screens for 3 minutes. Take three slow 4-7-8 physiological sighs to reset heart rate variability.</span>
                </div>
                <div className="flex items-start gap-2 bg-teal-950/30 p-3 rounded-lg border border-teal-900/30 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span><strong>SBT Execution Rule:</strong> Never place a market order on an active running candle. Only limit orders at predefined discount/premium zones.</span>
                </div>
                <div className="flex items-start gap-2 bg-teal-950/30 p-3 rounded-lg border border-teal-900/30 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span><strong>Hard Stop Enforcer:</strong> Set automated daily max loss limits. Once hit, the trading terminal must remain locked for the session.</span>
                </div>
                <div className="flex items-start gap-2 bg-teal-950/30 p-3 rounded-lg border border-teal-900/30 text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <span><strong>Run an Interactive Elimination Session:</strong> Complete one of the 5 dedicated interactive exercises below to re-wire neural pathways.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action to Jump to 5 Sessions */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/40 via-indigo-950/40 to-slate-900 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-military font-bold text-teal-200 uppercase">
                Ready to Eliminate {category.name}?
              </h4>
              <p className="text-xs font-mono-code text-slate-400">
                Choose one of the 5 interactive cognitive and somatic regulation sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('SESSIONS')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white text-xs font-military font-bold uppercase tracking-wider shadow-lg hover:opacity-95 transition cursor-pointer flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>LAUNCH 5 SESSIONS</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: 5 INTERACTIVE SESSIONS */}
      {activeTab === 'SESSIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-military font-bold text-slate-200 uppercase tracking-wider">
              Choose an Interactive Regulation Session
            </h4>
            <span className="text-xs font-mono-code text-slate-400">
              8-Step Guided Somatic & Cognitive Protocol
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.sessions.map((session, index) => (
              <div
                key={session.id}
                className="p-5 rounded-2xl bg-[#0b1122] border border-indigo-900/40 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-4 group shadow-lg relative overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-military font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                      Session 0{index + 1}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-mono-code text-slate-400">
                      <Clock className="w-3 h-3 text-teal-400" />
                      <span>{session.durationMinutes}m</span>
                    </div>
                  </div>

                  <h5 className="text-base font-military font-bold text-slate-100 group-hover:text-teal-300 transition">
                    {session.title}
                  </h5>

                  <p className="text-xs font-mono-code text-slate-400 leading-relaxed line-clamp-2">
                    {session.objective}
                  </p>

                  <div className="pt-2 flex items-center gap-2 text-[10px] font-mono-code text-teal-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                    <span>Tool: {session.exerciseType.replace('_', ' ')}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-900/30 flex items-center justify-between">
                  <div className="text-[10px] font-mono-code text-amber-400/90 font-bold">
                    +35 Habit Pts
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSessionToRun(session)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 text-white text-xs font-military font-bold uppercase tracking-wider shadow-md hover:opacity-95 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Launch</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: OVERVIEW - WHY IT HAPPENS & IMPACT */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Why It Happens */}
          <div className="p-6 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-4">
            <div className="flex items-center gap-2 text-sm font-military font-bold text-teal-300 uppercase tracking-wider border-b border-indigo-900/30 pb-3">
              <Brain className="w-4 h-4 text-teal-400" />
              <span>WHY IT HAPPENS (NEURO-COGNITIVE MECHANISMS)</span>
            </div>

            <div className="space-y-3 text-xs font-mono-code">
              <div>
                <span className="text-slate-400 block font-bold">Evolutionary Survival Root:</span>
                <p className="text-slate-200 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {category.whyItHappens.evolutionaryRoot}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-bold">Cognitive Distortion / Bias:</span>
                <p className="text-slate-200 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {category.whyItHappens.cognitiveDistortion}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-bold">Neurological Brain Driver:</span>
                <p className="text-slate-200 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {category.whyItHappens.neurologicalDriver}
                </p>
              </div>
            </div>
          </div>

          {/* Possible Impact */}
          <div className="p-6 rounded-2xl bg-[#0b101e] border border-rose-900/30 space-y-4">
            <div className="flex items-center gap-2 text-sm font-military font-bold text-rose-300 uppercase tracking-wider border-b border-rose-900/30 pb-3">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span>POSSIBLE TRADING IMPACT</span>
            </div>

            <div className="space-y-3 text-xs font-mono-code">
              <div>
                <span className="text-slate-400 block font-bold">Direct Capital Risk:</span>
                <p className="text-rose-200 mt-1 leading-relaxed bg-rose-950/20 p-3 rounded-xl border border-rose-900/30">
                  {category.possibleImpact.capitalRisk}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-bold">Distortion of Probabilities:</span>
                <p className="text-slate-200 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {category.possibleImpact.probabilityDistortion}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block font-bold">Long-Term Career Survival Threat:</span>
                <p className="text-slate-200 mt-1 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {category.possibleImpact.careerSurvivalThreat}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WARNING SIGNS & HOW IT APPEARS */}
      {activeTab === 'SIGNS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* How It Appears In Trading */}
          <div className="p-6 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-4">
            <div className="flex items-center gap-2 text-sm font-military font-bold text-amber-300 uppercase tracking-wider border-b border-indigo-900/30 pb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>HOW IT APPEARS IN TRADING</span>
            </div>

            <div className="space-y-4 text-xs font-mono-code">
              <div>
                <span className="text-slate-400 block font-bold mb-1.5">Chart & Order Execution Manifestations:</span>
                <div className="space-y-1.5">
                  {(
                    (category as any).howItAppearsInTrading ||
                    (category as any).howItAppears?.chartBehavior ||
                    []
                  ).map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-amber-400 font-bold">•</span>
                      <span className="text-slate-300 leading-relaxed">{item}</span>
                    </div>
                  ))}
                  {(!((category as any).howItAppearsInTrading?.length) && !((category as any).howItAppears?.chartBehavior?.length)) && (
                    <div className="p-3 bg-slate-950/50 rounded-lg text-slate-500 italic">
                      Observe order sizing, stop placement, and emotional urgency during live execution.
                    </div>
                  )}
                </div>
              </div>

              {((category as any).howItAppears?.internalDialogue?.length > 0 || (category.warningSigns as any)?.mental?.length > 0) && (
                <div>
                  <span className="text-slate-400 block font-bold mb-1.5">Internal Dialogue & Subconscious Narratives:</span>
                  <div className="space-y-1.5">
                    {(
                      (category as any).howItAppears?.internalDialogue ||
                      (category.warningSigns as any)?.mental ||
                      []
                    ).map((item: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 italic">
                        <span className="text-rose-400 font-bold">"</span>
                        <span className="text-rose-200 leading-relaxed">{item}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Warning Signs */}
          <div className="p-6 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-4">
            <div className="flex items-center gap-2 text-sm font-military font-bold text-teal-300 uppercase tracking-wider border-b border-indigo-900/30 pb-3">
              <Zap className="w-4 h-4 text-teal-400" />
              <span>EARLY WARNING SIGNS & SYMPTOMS</span>
            </div>

            <div className="space-y-4 text-xs font-mono-code">
              <div>
                <span className="text-slate-400 block font-bold mb-1.5">Physical / Somatic Signals:</span>
                <div className="space-y-1.5">
                  {(
                    category.warningSigns?.physical ||
                    (category.warningSigns as any)?.physicalSignals ||
                    []
                  ).map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-teal-400 font-bold">•</span>
                      <span className="text-slate-300 leading-relaxed">{item}</span>
                    </div>
                  ))}
                  {(!(category.warningSigns?.physical?.length) && !((category.warningSigns as any)?.physicalSignals?.length)) && (
                    <div className="p-3 bg-slate-950/50 rounded-lg text-slate-500 italic">
                      Elevated heart rate, muscle tension in shoulders, shallow breathing, clenched jaw.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block font-bold mb-1.5">Behavioral Clues:</span>
                <div className="space-y-1.5">
                  {(
                    category.warningSigns?.behavioral ||
                    (category.warningSigns as any)?.behavioralPatterns ||
                    []
                  ).map((item: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span className="text-slate-300 leading-relaxed">{item}</span>
                    </div>
                  ))}
                  {(!(category.warningSigns?.behavioral?.length) && !((category.warningSigns as any)?.behavioralPatterns?.length)) && (
                    <div className="p-3 bg-slate-950/50 rounded-lg text-slate-500 italic">
                      Impulsive mouse movements, looking away from invalidating evidence, tab switching.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REFLECTIONS */}
      {activeTab === 'REFLECTIONS' && (
        <div className="p-6 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-5">
          <div className="border-b border-indigo-900/30 pb-3">
            <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              Deep Inward Audit & Reflection Prompts
            </h4>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Journaling these prompts uncouples your self-worth from random distribution outcomes.
            </p>
          </div>

          <div className="space-y-4">
            {category.reflectionPrompts.map((prompt, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-military font-bold text-teal-300 uppercase">
                  <span>Prompt #{idx + 1}</span>
                </div>
                <p className="text-xs font-mono-code text-slate-200">"{prompt}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: RESULT LOG */}
      {activeTab === 'LOGS' && (
        <div className="p-6 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
            <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              Saved Session Logs for {category.name}
            </h4>
            <span className="text-xs font-mono-code text-slate-400">
              {categoryLogs.length} Total Registered Sessions
            </span>
          </div>

          {categoryLogs.length === 0 ? (
            <div className="text-center py-10 text-xs font-mono-code text-slate-500">
              No sessions completed for this category yet. Launch any of the 5 interactive sessions above to log your regulation data.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-indigo-900/30 space-y-2 text-xs font-mono-code"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{log.sessionTitle}</span>
                    <span className="text-slate-500 text-[10px]">
                      {log.dateStr} at {log.timeStr}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                    <div>
                      Trigger: <strong className="text-slate-300">{log.triggerIdentified}</strong>
                    </div>
                    <div>
                      Intensity: <strong className="text-amber-400">{log.initialIntensity}</strong> → <strong className="text-emerald-400">{log.shiftedIntensity}</strong>
                    </div>
                    <div>
                      Regulation: <strong className="text-teal-300">{log.helpfulnessRating}</strong>
                    </div>
                  </div>

                  {log.decisionRuleText && (
                    <div className="text-[11px] p-2 rounded bg-indigo-950/30 border border-indigo-900/40 text-indigo-200">
                      Pledged Rule: "{log.decisionRuleText}"
                    </div>
                  )}

                  {log.reflectionNotes && (
                    <div className="text-[11px] text-slate-400 italic">
                      Note: "{log.reflectionNotes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
