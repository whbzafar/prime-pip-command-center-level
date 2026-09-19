import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  History,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  Activity,
  BookOpen,
} from 'lucide-react';
import {
  PsychologicalCategory,
  InteractiveSession,
  SessionResultLog,
  HabitProgressState,
} from './psychologyData';

interface CategoryDetailViewProps {
  category: PsychologicalCategory;
  onBack: () => void;
  resultLogs: SessionResultLog[];
  onSaveResult: (result: SessionResultLog) => void;
  habitProgress: HabitProgressState;
}

type ViewMode = 'OVERVIEW' | 'SIMULATOR' | 'REFLECTIONS' | 'LOGS';

type Decision = 'PAUSE_AND_REVIEW' | 'EXIT_IMPULSIVELY' | 'ADD_RISK' | 'WAIT_FOR_RULE';

const decisionCopy: Record<Decision, { title: string; tone: string; feedback: string }> = {
  PAUSE_AND_REVIEW: {
    title: 'Pause and review the plan',
    tone: 'text-emerald-300',
    feedback: 'You selected a deliberate review. In this scenario, the next step is to compare the current market state with the predefined invalidation criteria before acting.',
  },
  EXIT_IMPULSIVELY: {
    title: 'Close immediately from fear',
    tone: 'text-amber-300',
    feedback: 'This response may reduce short-term discomfort, but it can also bypass the plan. Review whether the exit is rule-based or driven primarily by the emotional pressure point.',
  },
  ADD_RISK: {
    title: 'Increase exposure to recover',
    tone: 'text-rose-300',
    feedback: 'Adding exposure to reduce emotional discomfort can compound risk. In this exercise, compare the proposed action with the original risk limit and the written plan.',
  },
  WAIT_FOR_RULE: {
    title: 'Wait for a defined rule',
    tone: 'text-cyan-300',
    feedback: 'You selected a rule-based pause. Identify the exact condition that would justify action instead of reacting to an uncertain short-term price move.',
  },
};

const makePracticeRecord = (
  category: PsychologicalCategory,
  session: InteractiveSession,
  initialIntensity: number,
  shiftedIntensity: number,
  decision: Decision,
  reflectionNotes: string,
  helpfulnessRating: SessionResultLog['helpfulnessRating']
): SessionResultLog => ({
  id: `psych-sim-${Date.now()}`,
  categoryId: category.id,
  sessionId: session.id,
  sessionTitle: session.title,
  timestamp: Date.now(),
  dateStr: new Date().toISOString().slice(0, 10),
  timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  initialIntensity,
  shiftedIntensity,
  triggerIdentified: session.defaultTrigger,
  physicalTensionArea: 'Self-reported during practice',
  decisionRulePledged: decision === 'PAUSE_AND_REVIEW' || decision === 'WAIT_FOR_RULE',
  decisionRuleText: session.practicalDecisionRule,
  helpfulnessRating,
  reflectionNotes: `${decisionCopy[decision].title}. ${reflectionNotes}`.trim(),
  habitPointsEarned: 10,
});

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({
  category,
  onBack,
  resultLogs,
  onSaveResult,
}) => {
  const [mode, setMode] = useState<ViewMode>('OVERVIEW');
  const [sessionIndex, setSessionIndex] = useState(0);
  const [simulationStep, setSimulationStep] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [initialIntensity, setInitialIntensity] = useState(6);
  const [shiftedIntensity, setShiftedIntensity] = useState(4);
  const [reflection, setReflection] = useState('');
  const [helpfulness, setHelpfulness] = useState<SessionResultLog['helpfulnessRating']>('MODERATE');
  const [saved, setSaved] = useState(false);

  const sessions = category.sessions || [];
  const session = sessions[Math.min(sessionIndex, Math.max(0, sessions.length - 1))];
  const categoryLogs = useMemo(
    () => resultLogs.filter((log) => log.categoryId === category.id),
    [resultLogs, category.id]
  );
  const completedCount = categoryLogs.length;

  const isFearPilot = category.id === 'FEAR';
  const progressPercent = Math.min(100, Math.round((completedCount / Math.max(1, sessions.length)) * 100));

  const resetSimulation = () => {
    setSimulationStep(0);
    setIsPaused(true);
    setDecision(null);
    setReflection('');
    setShiftedIntensity(4);
    setSaved(false);
  };

  const chooseSession = (index: number) => {
    setSessionIndex(index);
    resetSimulation();
    setMode('SIMULATOR');
  };

  const advanceSimulation = () => {
    setSimulationStep((current) => Math.min(3, current + 1));
    setIsPaused(true);
  };

  const handleSave = () => {
    if (!session || !decision) return;
    const result = makePracticeRecord(
      category,
      session,
      initialIntensity,
      shiftedIntensity,
      decision,
      reflection,
      helpfulness
    );
    onSaveResult(result);
    setSaved(true);
  };

  if (!session) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-slate-200">
        <button onClick={onBack} className="mb-4 flex items-center gap-2 text-sm text-slate-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to categories
        </button>
        No interactive sessions are configured for this category yet.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/40 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-500/50 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to All 17 Categories
        </button>
        <div className="flex items-center gap-2 text-xs font-mono-code text-slate-400">
          <span>Mastery</span>
          <span className="rounded-md border border-teal-500/40 bg-teal-500/15 px-2 py-1 text-teal-300">
            Level {Math.min(5, Math.floor(completedCount / 2) + 1)}/5
          </span>
          <span>({completedCount} completed)</span>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-[#0d1424] via-indigo-950/40 to-slate-950 p-5 shadow-2xl sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
              Psychology Core / {isFearPilot ? 'Fear Pilot' : 'Category Training'}
            </span>
            <span className="text-[10px] font-mono-code text-slate-400">{sessions.length} interactive sessions</span>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-2xl font-black uppercase tracking-wider text-slate-100 sm:text-4xl">{category.name}</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{category.shortDescription || category.tagline}</p>
            </div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/60 px-4 py-3 text-right">
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Practice progress</div>
              <div className="text-xl font-black text-cyan-300">{progressPercent}%</div>
              <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-300">
              <div className="mb-1 flex items-center gap-2 text-cyan-300"><Brain className="h-4 w-4" /> Cognitive pattern</div>
              {category.whyItHappens.cognitiveDistortion}
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-300">
              <div className="mb-1 flex items-center gap-2 text-rose-300"><TrendingDown className="h-4 w-4" /> Trading impact</div>
              {category.possibleImpact.capitalRisk}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-b border-indigo-900/40 pb-3">
        {([
          ['OVERVIEW', 'Mission Overview'],
          ['SIMULATOR', 'Interactive Simulator'],
          ['REFLECTIONS', 'Deep Reflection'],
          ['LOGS', `Result Logs (${completedCount})`],
        ] as [ViewMode, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${mode === id ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'OVERVIEW' && (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-[#0b101e] p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-300"><Activity className="h-4 w-4" /> Trigger → Thought → Action</div>
              <div className="space-y-2 text-xs text-slate-300">
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><strong className="text-cyan-300">Trigger:</strong> {session.defaultTrigger}</div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><strong className="text-amber-300">Pattern:</strong> {category.whyItHappens.cognitiveDistortion}</div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"><strong className="text-emerald-300">Practice response:</strong> Pause, inspect the plan, and choose a rule-based action.</div>
              </div>
            </div>
            <div className="rounded-2xl border border-teal-900/40 bg-[#0b101e] p-5">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-teal-300"><ShieldCheck className="h-4 w-4" /> Practice protocol</div>
              <p className="text-sm leading-relaxed text-slate-300">{session.practicalDecisionRule}</p>
              <div className="mt-4 rounded-xl border border-teal-900/40 bg-teal-950/20 p-3 text-xs text-slate-300">{session.groundingPrompt}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 to-slate-950 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Recommended starting point</div>
                <h2 className="mt-1 text-lg font-black text-slate-100">{isFearPilot ? 'Market Pressure Protocol' : `${category.name} Practice Protocol`}</h2>
                <p className="mt-1 text-xs text-slate-400">Start a guided scenario with a simulated decision point and reflective feedback.</p>
              </div>
              <button onClick={() => chooseSession(0)} className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-3 text-xs font-bold text-slate-950 transition hover:brightness-110">
                <Play className="h-4 w-4" /> Start Pilot
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {sessions.map((item, index) => (
              <button key={item.id} onClick={() => chooseSession(index)} className="group rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-cyan-500/50 hover:bg-indigo-950/20">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-300">SESSION {String(index + 1).padStart(2, '0')}</span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500"><Clock className="h-3 w-3" /> {item.durationMinutes}m</span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-slate-100 group-hover:text-cyan-200">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.objective}</p>
                <div className="mt-3 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">Launch simulation <ArrowRight className="h-3 w-3" /></div>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'SIMULATOR' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Session {sessionIndex + 1} / {sessions.length}</div>
              <h2 className="mt-1 text-xl font-black text-slate-100">{session.title}</h2>
            </div>
            <button onClick={resetSimulation} className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-300 hover:border-cyan-500/50"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-slate-800 bg-[#080d18] p-4">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-400"><span className="font-bold text-cyan-300">SIMULATED MARKET / {isFearPilot ? 'PRESSURE EVENT' : 'BEHAVIORAL SCENARIO'}</span><span>Stage {simulationStep + 1}/4</span></div>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 p-2">
                <svg viewBox="0 0 520 245" className="h-auto w-full" role="img" aria-label="Illustrative simulated candlestick chart">
                  <g stroke="currentColor" strokeOpacity="0.12" strokeWidth="1">
                    {[35, 75, 115, 155, 195, 235].map((y) => <line key={y} x1="8" y1={y} x2="512" y2={y} />)}
                    {[45, 95, 145, 195, 245, 295, 345, 395, 445, 495].map((x) => <line key={x} x1={x} y1="8" x2={x} y2="235" />)}
                  </g>
                  <line x1="8" y1="86" x2="512" y2="86" stroke="#e5b44b" strokeDasharray="5 5" />
                  <line x1="8" y1="192" x2="512" y2="192" stroke="#ef6470" strokeDasharray="5 5" />
                  <text x="508" y="80" fill="#e5b44b" fontSize="10" textAnchor="end">ENTRY</text>
                  <text x="508" y="186" fill="#ef6470" fontSize="10" textAnchor="end">STOP</text>
                  {[
                    [40, 125, 95, 18], [70, 110, 76, 24], [100, 94, 62, 20], [130, 78, 46, 24], [160, 88, 66, 30], [190, 103, 81, 28], [220, 119, 95, 33], [250, 142, 111, 34], [280, 162, 132, 36], [310, 174, 149, 35], [340, 156, 134, 30], [370, 143, 119, 25], [400, 128, 103, 23], [430, 116, 92, 22], [460, 104, 82, 18],
                  ].map(([x, y, bodyY, bodyH], index) => {
                    const bearish = index >= 4 && index <= 9;
                    const bodyTop = Math.min(y, bodyY);
                    const bodyBottom = Math.max(y, bodyY) + bodyH / 4;
                    return <g key={index}><line x1={x} y1={y - 15} x2={x} y2={y + 22} stroke={bearish ? '#ef6470' : '#28c99a'} strokeWidth="2" /><rect x={x - 7} y={bodyTop} width="14" height={Math.max(8, bodyBottom - bodyTop)} rx="2" fill={bearish ? '#ef6470' : '#28c99a'} /></g>;
                  })}
                  {simulationStep >= 2 && <rect x="300" y="12" width="170" height="214" rx="8" fill="#ef6470" fillOpacity="0.06" stroke="#ef6470" strokeDasharray="4 5" />}
                  {simulationStep >= 3 && <text x="385" y="30" fill="#fbbf24" fontSize="11" textAnchor="middle">PRESSURE POINT</text>}
                </svg>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500"><span>Illustrative data only • no live orders</span><span>OHLC playback prototype</span></div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setIsPaused((value) => !value)} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:border-cyan-500/50">{isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}{isPaused ? 'Resume preview' : 'Pause preview'}</button>
                <button disabled={!isPaused || simulationStep >= 3} onClick={advanceSimulation} className="flex items-center gap-2 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Advance event <ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-[#0b101e] p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300"><Target className="h-4 w-4" /> Scenario briefing</div>
                <p className="text-sm leading-relaxed text-slate-300">{simulationStep === 0 ? 'You have a predefined trade plan. Observe the scenario before making any decision.' : simulationStep === 1 ? 'Price begins moving against the simulated position. Notice your thoughts and physical response without rushing.' : simulationStep === 2 ? 'The pressure event is active. The chart is uncertain, but the original plan remains the reference point.' : 'Decision point reached. Review the rules and choose the response you want to practice.'}</p>
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">{session.tradingProblemExplanation}</div>
              </div>

              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-200"><BookOpen className="h-4 w-4" /> Emotional check-in</div>
                <label className="mb-1 block text-xs text-slate-400">Initial intensity: {initialIntensity}/10</label>
                <input type="range" min="1" max="10" value={initialIntensity} onChange={(event) => setInitialIntensity(Number(event.target.value))} className="w-full accent-cyan-400" />
                <label className="mb-1 mt-3 block text-xs text-slate-400">Current intensity: {shiftedIntensity}/10</label>
                <input type="range" min="1" max="10" value={shiftedIntensity} onChange={(event) => setShiftedIntensity(Number(event.target.value))} className="w-full accent-cyan-400" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300"><Sparkles className="h-4 w-4" /> Decision moment</div>
            <h3 className="mt-2 text-lg font-black text-slate-100">How do you respond to the pressure?</h3>
            <p className="mt-1 text-xs text-slate-400">Choose a response for educational feedback. The exercise does not predict profitability.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {([
                ['PAUSE_AND_REVIEW', 'Pause and review predefined criteria'],
                ['WAIT_FOR_RULE', 'Wait for a defined rule or confirmation'],
                ['EXIT_IMPULSIVELY', 'Close immediately to stop discomfort'],
                ['ADD_RISK', 'Increase risk to recover the loss'],
              ] as [Decision, string][]).map(([value, label]) => (
                <button key={value} onClick={() => setDecision(value)} className={`rounded-xl border p-3 text-left text-xs transition ${decision === value ? 'border-cyan-400 bg-cyan-500/10 text-cyan-100' : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-600'}`}>{label}</button>
              ))}
            </div>
            {decision && (
              <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/70 p-4">
                <div className={`text-sm font-bold ${decisionCopy[decision].tone}`}>{decisionCopy[decision].title}</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{decisionCopy[decision].feedback}</p>
                <div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">Rule reference: {session.practicalDecisionRule}</div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setMode('OVERVIEW')} className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs text-slate-300 hover:border-slate-600">Back to sessions</button>
            <button disabled={!decision} onClick={() => setMode('REFLECTIONS')} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Continue to reflection <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {mode === 'REFLECTIONS' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-[#0b101e] p-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300"><BookOpen className="h-4 w-4" /> Deep reflection</div>
            <h2 className="mt-2 text-xl font-black text-slate-100">What did you notice?</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Write a short, honest reflection. The system records your practice, not a medical assessment.</p>
            <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} rows={5} placeholder="What thought appeared first? Which rule helped you slow down? What would you check before a real trade?" className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-200 outline-none transition focus:border-cyan-500" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">Helpfulness rating<select value={helpfulness} onChange={(event) => setHelpfulness(event.target.value as SessionResultLog['helpfulnessRating'])} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-xs"><option value="SIGNIFICANT">Significant</option><option value="MODERATE">Moderate</option><option value="SLIGHT">Slight</option><option value="NONE">None</option></select></label>
              <div className="rounded-xl border border-teal-900/40 bg-teal-950/20 p-3 text-xs text-slate-300"><div className="mb-1 font-bold text-teal-300">Grounding prompt</div>{session.groundingPrompt}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setMode('SIMULATOR')} className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs text-slate-300 hover:border-slate-600">Back to simulator</button>
            <button onClick={handleSave} disabled={!decision || saved} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /> {saved ? 'Session saved' : 'Save practice result'}</button>
          </div>
          {saved && <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-200">Practice record saved locally through the existing Psychology Center result workflow. You can review it in Result Logs.</div>}
        </div>
      )}

      {mode === 'LOGS' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300"><History className="h-4 w-4" /> Session history</div>
          {categoryLogs.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">No practice records yet. Complete a simulation to create your first record.</div>
          ) : categoryLogs.map((log) => (
            <div key={log.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-100">{log.sessionTitle}</h3><span className="text-[10px] text-slate-500">{log.dateStr} • {log.timeStr}</span></div>
              <div className="mt-2 grid gap-2 text-xs text-slate-400 sm:grid-cols-3"><span>Initial: {log.initialIntensity}/10</span><span>After: {log.shiftedIntensity}/10</span><span>Helpful: {log.helpfulnessRating}</span></div>
              {log.reflectionNotes && <p className="mt-3 text-xs leading-relaxed text-slate-300">{log.reflectionNotes}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[10px] leading-relaxed text-slate-500">
        Educational simulation only. It does not execute trades, diagnose mental health conditions, guarantee emotional improvement, or guarantee trading outcomes. Use predefined risk controls and seek qualified professional support when needed.
      </div>
    </div>
  );
};