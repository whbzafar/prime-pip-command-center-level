import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Clock,
  HeartPulse,
  BookOpen,
  CheckSquare,
  Square,
  RotateCcw,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { UserAccount, AccountSettings, PsychologicalRecoveryLog } from '../../types';
import { BoxBreathingExercise } from './BoxBreathingExercise';
import { getKarachiDate, getKarachiLiveClock } from '../../utils/time';

interface RecoveryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  account?: AccountSettings;
  initialTrigger?: string;
  onRecoveryCompleted?: () => void;
}

export const RecoveryModeModal: React.FC<RecoveryModeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  account,
  initialTrigger = 'Consecutive losses or emotional disruption',
  onRecoveryCompleted,
}) => {
  const userId = currentUser?.id || currentUser?.username || 'guest';
  const cooldownKey = `primepipfx_cooldown_end_${userId}`;

  // Cooldown countdown timer in seconds (default 15 minutes = 900s)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(cooldownKey);
      if (stored) {
        const diff = Math.floor((parseInt(stored, 10) - Date.now()) / 1000);
        return diff > 0 ? diff : 900;
      }
    } catch {}
    return 900;
  });

  const [timerActive, setTimerActive] = useState<boolean>(true);
  const [breathingDone, setBreathingDone] = useState<boolean>(false);

  // Short Reflection State
  const [reflectionEmotion, setReflectionEmotion] = useState<string>('FRUSTRATED / IMPATIENT');
  const [reflectionNotes, setReflectionNotes] = useState<string>('');
  const [rootCause, setRootCause] = useState<string>('Revenge trading urge after stopped trade');

  // Return to Market Checklist
  const [check1, setCheck1] = useState<boolean>(false); // Breathing & nervous system calm
  const [check2, setCheck2] = useState<boolean>(false); // No urge to recover monetary loss
  const [check3, setCheck3] = useState<boolean>(false); // Playbook rules strictly reaffirmed
  const [check4, setCheck4] = useState<boolean>(false); // 1% risk limit & max 2 trades/day accepted

  const allChecklistPassed = check1 && check2 && check3 && check4;

  useEffect(() => {
    if (!isOpen) return;

    // Set expiration timestamp in localStorage
    const targetTime = Date.now() + cooldownRemaining * 1000;
    try {
      localStorage.setItem(cooldownKey, targetTime.toString());
    } catch {}

    const interval = setInterval(() => {
      if (!timerActive) return;
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timerActive]);

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleFinishRecovery = async () => {
    if (!allChecklistPassed) return;

    const clock = getKarachiLiveClock();
    const recoveryLog: PsychologicalRecoveryLog = {
      id: `rec-${Date.now()}`,
      userId,
      timestamp: Date.now(),
      date: getKarachiDate(),
      time: clock.time,
      triggerReason: initialTrigger,
      breathingCompleted: breathingDone,
      reflectionNotes: `${reflectionEmotion} | Cause: ${rootCause} | Notes: ${reflectionNotes}`,
      checklistPassed: true,
    };

    // Save locally
    const storageKey = `primepipfx_recovery_${userId}`;
    try {
      const prev = JSON.parse(localStorage.getItem(storageKey) || '[]');
      localStorage.setItem(storageKey, JSON.stringify([recoveryLog, ...prev]));
      localStorage.removeItem(cooldownKey);
    } catch {}

    // Save to server
    try {
      await fetch('/api/user/psychology/recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ log: recoveryLog }),
      });
    } catch {}

    if (onRecoveryCompleted) onRecoveryCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border-2 border-rose-500/50 rounded-2xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl shadow-rose-950/50 my-8 space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                  TACTICAL RECOVERY PROTOCOL
                </span>
                <span className="text-[10px] font-mono-code text-slate-400">
                  USER: @{currentUser?.username || 'Trader'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-military font-bold text-slate-100 tracking-wider mt-0.5">
                MANDATORY RECOVERY MODE
              </h2>
              <p className="text-xs text-slate-400 font-sans">
                Pause trading immediately. Slow down your nervous system, reflect on behavioral disruption, and return to your predefined process.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Cooling-Off Countdown Timer */}
        <div className="bg-slate-950 rounded-xl p-4 sm:p-5 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono-code uppercase text-slate-400 font-bold block">
                MANDATORY COOLING-OFF TIMER
              </span>
              <div className="text-2xl sm:text-3xl font-mono-code font-bold text-amber-400">
                {formatTimer(cooldownRemaining)}
              </div>
              <span className="text-[11px] text-slate-400">
                No orders should be executed during this cooling-off interval.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimerActive(!timerActive)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition"
            >
              {timerActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{timerActive ? 'PAUSE' : 'RESUME'}</span>
            </button>
            <button
              onClick={() => setCooldownRemaining(900)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET 15M</span>
            </button>
          </div>
        </div>

        {/* 2. Regulative Breathing Guide */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
                STEP 1: REGULATE NERVOUS SYSTEM (BOX BREATHING)
              </span>
            </div>
            <button
              onClick={() => setBreathingDone(true)}
              className={`text-[11px] font-mono-code px-2.5 py-1 rounded transition ${
                breathingDone
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {breathingDone ? '✓ Breathing Completed' : 'Mark as Completed'}
            </button>
          </div>
          <div className="py-2">
            <BoxBreathingExercise />
          </div>
        </div>

        {/* 3. Short Reflection & Emotion Check-In */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
              STEP 2: SHORT BEHAVIORAL REFLECTION
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono-code">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Current Dominant Emotion:</label>
              <select
                value={reflectionEmotion}
                onChange={(e) => setReflectionEmotion(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="FRUSTRATED / IMPATIENT">Frustrated / Impatient</option>
                <option value="REVENGE_MINDSET">Revenge Mindset (Must win back loss)</option>
                <option value="FEAR_OF_MISSING_OUT">FOMO (Chasing candles)</option>
                <option value="OVERCONFIDENT">Overconfident (Euphoric after win)</option>
                <option value="DISAPPOINTED">Disappointed with Execution</option>
                <option value="EXHAUSTED">Fatigued / Overtraded</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Root Disruption Cause:</label>
              <input
                type="text"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-sky-500"
                placeholder="e.g., Took trade outside playbook session"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">
              Honest Self-Assessment (What will you do differently next trade?):
            </label>
            <textarea
              value={reflectionNotes}
              onChange={(e) => setReflectionNotes(e.target.value)}
              rows={2}
              placeholder="e.g., I recognize I was tilted by the sudden spread spike. I will shut down MT5 and only re-enter after market session opens tomorrow."
              className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-xs font-mono-code text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* 4. Trading Plan Re-Anchor */}
        <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 space-y-2">
          <span className="text-[10px] font-mono-code uppercase font-bold text-amber-400 block">
            STEP 3: TRADING PLAN REAFFIRMATION
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-code">
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">RULE #1: MAX LOSS</span>
              <span className="text-amber-400 font-bold text-sm">STRICT 1% RISK</span>
              <span className="text-slate-400 block text-[10px] mt-0.5">Never move stop loss</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">RULE #2: DAILY LIMIT</span>
              <span className="text-amber-400 font-bold text-sm">MAX 2 TRADES / DAY</span>
              <span className="text-slate-400 block text-[10px] mt-0.5">Cease after 2 trades</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-slate-400 block text-[10px]">RULE #3: PLAYBOOK</span>
              <span className="text-amber-400 font-bold text-sm">PRE-DEFINED CONFLUENCE</span>
              <span className="text-slate-400 block text-[10px] mt-0.5">No market impulse entries</span>
            </div>
          </div>
        </div>

        {/* 5. Return-to-Market Checklist (All 4 must be checked) */}
        <div className="bg-slate-950/90 rounded-xl p-4 sm:p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-military font-bold text-slate-200 uppercase tracking-wider">
              STEP 4: RETURN-TO-MARKET READINESS CHECKLIST
            </span>
            <span className="text-[11px] font-mono-code text-amber-400">
              ({[check1, check2, check3, check4].filter(Boolean).length}/4 Confirmed)
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-mono-code">
            <button
              type="button"
              onClick={() => setCheck1(!check1)}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition cursor-pointer"
            >
              {check1 ? (
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              )}
              <span className={check1 ? 'text-slate-200 font-semibold' : 'text-slate-400'}>
                1. My breathing and nervous system are calm, slow, and regulated.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCheck2(!check2)}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition cursor-pointer"
            >
              {check2 ? (
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              )}
              <span className={check2 ? 'text-slate-200 font-semibold' : 'text-slate-400'}>
                2. I have fully detached from recovering any recent monetary loss; I accept that the past trade is gone.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCheck3(!check3)}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition cursor-pointer"
            >
              {check3 ? (
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              )}
              <span className={check3 ? 'text-slate-200 font-semibold' : 'text-slate-400'}>
                3. I commit to evaluating any upcoming setup against my strict written playbook criteria.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCheck4(!check4)}
              className="w-full flex items-start gap-3 p-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-left transition cursor-pointer"
            >
              {check4 ? (
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              )}
              <span className={check4 ? 'text-slate-200 font-semibold' : 'text-slate-400'}>
                4. I accept my 1% max risk limit and will honor the 2 trades/day hard stop without exception.
              </span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono-code transition"
          >
            Stay in Recovery Mode
          </button>

          <button
            type="button"
            onClick={handleFinishRecovery}
            disabled={!allChecklistPassed}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-military text-xs font-bold tracking-wider transition shadow-lg shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>COMPLETE RECOVERY & RETURN TO DASHBOARD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
