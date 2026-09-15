import React, { useState } from 'react';
import {
  ShieldAlert,
  Compass,
  CheckCircle2,
  Wind,
  Coffee,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Volume2,
  AlertTriangle,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';

export type ResetSessionType = 'PRE_TRADE' | 'POST_LOSS' | 'POST_WIN' | 'FATIGUE';

interface ResetSessionsProps {
  initialType?: ResetSessionType;
  onNavigateToTab?: (tab: string) => void;
  onLogJournalNote?: (note: string) => void;
}

export const ResetSessions: React.FC<ResetSessionsProps> = ({
  initialType = 'PRE_TRADE',
  onNavigateToTab,
  onLogJournalNote,
}) => {
  const [activeType, setActiveType] = useState<ResetSessionType>(initialType);

  // Pre-Trade state
  const [preTradeStep, setPreTradeStep] = useState<number>(0);
  const [emotionalCheck, setEmotionalCheck] = useState<string | null>(null);

  // Post-Loss state
  const [lossReflectAnswer1, setLossReflectAnswer1] = useState<string>('');
  const [lossReflectAnswer2, setLossReflectAnswer2] = useState<string>('');
  const [lossCooldownSeconds, setLossCooldownSeconds] = useState<number>(180);
  const [isCooldownRunning, setIsCooldownRunning] = useState<boolean>(false);
  const [lossJournalSaved, setLossJournalSaved] = useState<boolean>(false);

  // Post-Win state
  const [winBreathingDone, setWinBreathingDone] = useState<boolean>(false);

  // Fatigue state
  const [fatigueMinutes, setFatigueMinutes] = useState<number>(10);
  const [fatigueActive, setFatigueActive] = useState<boolean>(false);
  const [fatigueRemaining, setFatigueRemaining] = useState<number>(10 * 60);

  // Pre-Trade Steps
  const preTradeReminders = [
    { title: 'DO NOT TRADE FROM URGENCY', desc: 'The market is continuous. Urgency is an illusion created by moving prices.' },
    { title: 'DO NOT CHASE THE MARKET', desc: 'If the setup is gone, let it go. Chasing invalidates your predefined risk-reward.' },
    { title: 'FOLLOW YOUR TRADING PLAN', desc: 'Execute only predetermined confluence criteria. No impulsive discretionary overrides.' },
    { title: 'RISK REMAINS CONTROLLED', desc: 'Position size must respect your strict 1-2% risk model. No oversized lots.' },
    { title: 'ONE SETUP IS ENOUGH', desc: 'You only need one clean, disciplined execution. Quality always supersedes frequency.' },
  ];

  const handleStartCooldown = () => {
    setIsCooldownRunning(true);
    soundEngine.startBrownNoise(0.2);
    const interval = setInterval(() => {
      setLossCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsCooldownRunning(false);
          soundEngine.playSingingBowlChime(528);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSaveLossNote = () => {
    if (!lossReflectAnswer1 && !lossReflectAnswer2) return;
    const note = `[Post-Loss Reset Note]: What happened: ${lossReflectAnswer1 || 'N/A'}. Lesson & Next Step: ${lossReflectAnswer2 || 'N/A'}`;
    if (onLogJournalNote) onLogJournalNote(note);
    setLossJournalSaved(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { id: 'PRE_TRADE', label: 'Pre-Trade Reset', icon: Compass, color: 'text-amber-400' },
          { id: 'POST_LOSS', label: 'Post-Loss Reset', icon: ShieldAlert, color: 'text-rose-400' },
          { id: 'POST_WIN', label: 'Post-Win Reset', icon: CheckCircle2, color: 'text-teal-400' },
          { id: 'FATIGUE', label: 'Fatigue Break', icon: Coffee, color: 'text-indigo-400' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveType(tab.id as any);
                soundEngine.stopAllAudio();
              }}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-center gap-3 ${
                isSelected
                  ? 'bg-slate-900 border-teal-400/50 shadow-md shadow-teal-500/10'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 ${tab.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-military font-bold block text-slate-200">
                  {tab.label}
                </span>
                <span className="text-[10px] font-mono-code text-slate-500">
                  Targeted Reset
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. PRE-TRADE RESET */}
      {/* ========================================================================= */}
      {activeType === 'PRE_TRADE' && (
        <div className="prime-glass-card rounded-3xl p-6 sm:p-10 border border-amber-500/20 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                  PRE-TRADE MENTAL CALIBRATION (1-5 MIN)
                </h3>
                <p className="text-xs font-mono-code text-slate-400">
                  Mental preparation tool • Strict non-signal protocol • Check internal composure
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              NON-SIGNAL
            </span>
          </div>

          {/* Emotional State Self-Check */}
          <div className="space-y-3">
            <label className="text-xs font-military font-bold text-slate-300 uppercase block">
              1. ASSESS CURRENT EMOTIONAL EQUILIBRIUM
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'CALM & OBJECTIVE', status: 'optimal', note: 'Clear mind' },
                { label: 'SLIGHTLY IMPATIENT', status: 'caution', note: 'Slow down' },
                { label: 'FEELING FOMO', status: 'danger', note: 'Step back' },
                { label: 'FATIGUED / TIRED', status: 'caution', note: 'Rest recommended' },
              ].map((em) => (
                <button
                  key={em.label}
                  type="button"
                  onClick={() => setEmotionalCheck(em.label)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    emotionalCheck === em.label
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-military font-bold block">{em.label}</span>
                  <span className="text-[10px] font-mono-code text-slate-400">{em.note}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Discipline Reminders */}
          <div className="space-y-3">
            <label className="text-xs font-military font-bold text-slate-300 uppercase block">
              2. MANDATORY OPERATING DISCIPLINE REMINDERS
            </label>
            <div className="space-y-2">
              {preTradeReminders.map((rem, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-mono-code font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-military font-bold text-slate-200">{rem.title}</h4>
                    <p className="text-[11px] font-mono-code text-slate-400 mt-0.5">{rem.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800 flex-wrap gap-3">
            <button
              type="button"
              onClick={() => soundEngine.startGroundingTone(432, 0.2)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-military font-bold text-slate-300 hover:text-teal-300 flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
              <span>432Hz Grounding Tone</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('PRE_TRADE_PLAN')}
              className="px-6 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-military font-bold tracking-wider uppercase hover:bg-amber-400 transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <span>RETURN TO PRE-TRADE ANALYSIS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. POST-LOSS RESET (NEUTRAL, CALM, NEVER SHAMING) */}
      {/* ========================================================================= */}
      {activeType === 'POST_LOSS' && (
        <div className="prime-glass-card rounded-3xl p-6 sm:p-10 border border-rose-500/20 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                  POST-LOSS NEUTRAL DECOMPRESSION
                </h3>
                <p className="text-xs font-mono-code text-slate-400">
                  Neutral perspective • Break revenge impulses • Zero automatic trade prompts
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
              PROTECTION
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs sm:text-sm font-mono-code text-rose-200 leading-relaxed">
            "You recorded a loss. A loss is a statistical cost of business in probabilistic environments.
            Take a short reset before making another decision. Never revenge trade or increase risk."
          </div>

          {/* Cooldown Timer */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-rose-400" />
              <div>
                <span className="text-xs font-military font-bold text-slate-200 uppercase block">
                  NEUTRAL COOLDOWN INTERVAL
                </span>
                <span className="text-xs font-mono-code text-slate-400">
                  {Math.floor(lossCooldownSeconds / 60)}m {lossCooldownSeconds % 60}s remaining
                </span>
              </div>
            </div>

            {!isCooldownRunning ? (
              <button
                type="button"
                onClick={handleStartCooldown}
                className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-military font-bold hover:bg-rose-500/30 transition"
              >
                START 3-MIN COOLDOWN
              </button>
            ) : (
              <span className="text-xs font-mono-code text-rose-300 animate-pulse font-bold">
                COOLDOWN ACTIVE • BREATHING IN PROGRESS
              </span>
            )}
          </div>

          {/* Reflection Questions */}
          <div className="space-y-3">
            <h4 className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider">
              CONSTRUCTIVE REFLECTION (OBJECTIVE LOGGING)
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  1. What happened? What was under your control vs outside your control?
                </label>
                <textarea
                  rows={2}
                  value={lossReflectAnswer1}
                  onChange={(e) => setLossReflectAnswer1(e.target.value)}
                  placeholder="e.g., Executed model setup according to rulebook; price swept high before turning. Execution was within plan."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  2. What can you learn, and what will you do differently next time?
                </label>
                <textarea
                  rows={2}
                  value={lossReflectAnswer2}
                  onChange={(e) => setLossReflectAnswer2(e.target.value)}
                  placeholder="e.g., Wait for the 15m candle close confirmation rather than entering on the initial impulse."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSaveLossNote}
                disabled={lossJournalSaved || (!lossReflectAnswer1 && !lossReflectAnswer2)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-military font-bold text-slate-300 hover:text-teal-300 disabled:opacity-40 flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                <span>{lossJournalSaved ? 'NOTE SAVED TO LOG' : 'LOG NOTE TO JOURNAL'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigateToTab && onNavigateToTab('DASHBOARD')}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-military font-bold text-slate-400 hover:text-slate-200"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. POST-WIN RESET (PREVENT OVERCONFIDENCE) */}
      {/* ========================================================================= */}
      {activeType === 'POST_WIN' && (
        <div className="prime-glass-card rounded-3xl p-6 sm:p-10 border border-teal-500/20 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                  POST-WIN DISCIPLINE RE-CENTERING
                </h3>
                <p className="text-xs font-mono-code text-slate-400">
                  Neutralize euphoria • Guard against overtrading • Maintain strict risk size
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
              DISCIPLINE
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-500/30 text-xs sm:text-sm font-mono-code text-teal-200 leading-relaxed">
            "A winning trade does not require increasing risk. Keep the same process. Protect your discipline."
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
            <h4 className="text-xs font-military font-bold text-slate-200 uppercase">
              POST-WIN DISCIPLINE CHECKLIST:
            </h4>
            <div className="space-y-2 text-xs font-mono-code text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Did the trade follow predetermined model rules rather than luck?</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Will you resist increasing position size on the next trade?</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span>Are you ready to step away if daily target has been reached?</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => soundEngine.playSingingBowlChime(528)}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-military font-bold text-slate-300 hover:text-teal-300 flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-teal-400" />
              <span>Singing Bowl (528Hz)</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToTab && onNavigateToTab('JOURNAL')}
              className="px-5 py-2.5 rounded-xl bg-teal-500 text-slate-950 text-xs font-military font-bold hover:bg-teal-400 transition"
            >
              LOG TO JOURNAL & CLOSE CHARTS
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TRADING FATIGUE RESET */}
      {/* ========================================================================= */}
      {activeType === 'FATIGUE' && (
        <div className="prime-glass-card rounded-3xl p-6 sm:p-10 border border-indigo-500/20 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                  TRADING SCREEN FATIGUE RESET
                </h3>
                <p className="text-xs font-mono-code text-slate-400">
                  Unwind mental tiredness • 5, 10, or 15 minute restful intermission
                </p>
              </div>
            </div>
          </div>

          {/* Duration Selector */}
          <div className="grid grid-cols-3 gap-3">
            {[5, 10, 15].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setFatigueMinutes(m);
                  setFatigueRemaining(m * 60);
                }}
                className={`p-3 rounded-xl border text-center font-military font-bold text-xs transition cursor-pointer ${
                  fatigueMinutes === m
                    ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m} MINUTE BREAK
              </button>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-4">
            <div className="text-4xl font-mono-code font-bold text-slate-100">
              {Math.floor(fatigueRemaining / 60)}:{(fatigueRemaining % 60).toString().padStart(2, '0')}
            </div>

            <p className="text-xs font-mono-code text-slate-400 max-w-sm mx-auto">
              Step away from screen glare. Hydrate. Rest your eyes on distant objects to relax ocular convergence.
            </p>

            <button
              type="button"
              onClick={() => {
                if (fatigueActive) {
                  setFatigueActive(false);
                  soundEngine.stopAllAudio();
                } else {
                  setFatigueActive(true);
                  soundEngine.startLayer('WIND');
                  soundEngine.startLayer('RIVER');
                }
              }}
              className={`px-6 py-2.5 rounded-xl font-military font-bold text-xs tracking-wider uppercase transition cursor-pointer ${
                fatigueActive
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-indigo-500 text-slate-950 hover:bg-indigo-400'
              }`}
            >
              {fatigueActive ? 'STOP BREAK' : 'START FATIGUE BREAK'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
