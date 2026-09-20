import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Zap,
  Save,
  Check,
  Flame,
  Sparkles,
  Clock,
  Target,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  PlusCircle,
  Settings,
  HeartPulse,
  Compass,
  BookOpen,
  ArrowLeft,
  Activity,
  Award,
  HelpCircle,
  Sliders,
  AlertOctagon,
} from 'lucide-react';
import {
  Trade,
  AccountSettings,
  EmotionState,
  TradeIntention,
  PsychologyCheckIn,
  UserAccount,
  PsychologicalState,
  PsychologicalSettings,
} from '../types';
import { calculatePsychologyMetrics, calculateMistakeMetrics } from '../utils/tradeAnalytics';
import { formatCurrency } from '../utils/currencyFormatter';
import { getKarachiDate, getKarachiLiveClock, formatTo12Hour } from '../utils/time';
import { playDisciplineAlert } from '../utils/audioAlerts';
import { PsychologyTimelineChart } from './PsychologyTimelineChart';
import { BoxBreathingExercise } from './psychology/BoxBreathingExercise';
import { PatienceSimulator } from './psychology/PatienceSimulator';
import { RiskAssessmentGame } from './psychology/RiskAssessmentGame';
import { EmotionalBiasQuiz } from './psychology/EmotionalBiasQuiz';
import { TiltRadar } from './psychology/TiltRadar';
import { CBTThoughtRecordTool } from './psychology/CBTThoughtRecordTool';
import { ACTDefusionTool } from './psychology/ACTDefusionTool';
import { RecoveryModeModal } from './psychology/RecoveryModeModal';
import { PsychologicalSettingsModal } from './psychology/PsychologicalSettingsModal';
import { TradingDisciplineSection } from './psychology/TradingDisciplineSection';
import {
  CATEGORY_LIST,
  PsychologicalCategory,
  InteractiveSession,
  SessionResultLog,
  HabitProgressState,
} from './psychology/psychologyData';
import { PsychologyProfessionalDashboard } from './psychology/PsychologyProfessionalDashboard';
import { CategoryDetailView } from './psychology/CategoryDetailView';
import { CalmingToolsHub } from './psychology/CalmingToolsHub';
import { HabitsGamificationDashboard } from './psychology/HabitsGamificationDashboard';
import { InteractiveSessionRunner } from './psychology/InteractiveSessionRunner';
import { Wind } from 'lucide-react';
import { NasheedPlaylist } from './psychology/NasheedPlaylist';

interface PsychologyCenterProps {
  trades: Trade[];
  account?: AccountSettings;
  currentUser?: UserAccount | null;
  onUpdateTrade?: (updatedTrade: Trade) => void;
  onOpenNewTrade?: () => void;
  onClose?: () => void;
}

export type PsychSectionTab =
  | 'CATEGORIES'
  | 'CALMING_TOOLS'
  | 'HABITS'
  | 'STATE'
  | 'CHECKIN'
  | 'TRADING_PSYCH'
  | 'TILT_DETECTION'
  | 'COGNITIVE_TOOLS'
  | 'CBT_RECORD'
  | 'ACT_DEFUSION'
  | 'BREATHING'
  | 'DISCIPLINE'
  | 'PERFORMANCE'
  | 'SETTINGS';

export const PsychologyCenter: React.FC<PsychologyCenterProps> = ({
  trades = [],
  account,
  currentUser,
  onUpdateTrade,
  onOpenNewTrade,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<PsychSectionTab>('CATEGORIES');
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PsychologicalCategory | null>(null);
  const [activeSessionToRun, setActiveSessionToRun] = useState<{
    category: PsychologicalCategory;
    session: InteractiveSession;
  } | null>(null);
  const [cognitiveToolTab, setCognitiveToolTab] = useState<
    'BREATHING' | 'PATIENCE' | 'RISK_GAME' | 'BIAS_QUIZ'
  >('BREATHING');

  const currency = account?.currency || 'USD';
  const userId = currentUser?.id || account?.id || 'guest';
  const checkInStorageKey = `primepipfx_checkins_${userId}`;
  const resultLogsStorageKey = `primepipfx_psych_results_${userId}`;
  const habitProgressStorageKey = `primepipfx_psych_habits_${userId}`;

  // Dedicated Session Result Logs State
  const [resultLogs, setResultLogs] = useState<SessionResultLog[]>(() => {
    try {
      const saved = localStorage.getItem(resultLogsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Dedicated Process Habit State
  const [habitProgress, setHabitProgress] = useState<HabitProgressState>(() => {
    try {
      const saved = localStorage.getItem(habitProgressStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      currentStreakDays: 3,
      totalHabitPoints: 140,
      lastCheckInDateStr: new Date().toISOString().split('T')[0],
      totalCompletedSessions: 4,
      completedSessionsByCategory: {
        FEAR: 1,
        REVENGE_TRADING: 2,
        FOMO: 1,
      },
    };
  });

  const handleSaveSessionResult = (result: SessionResultLog) => {
    const updatedLogs = [result, ...resultLogs];
    setResultLogs(updatedLogs);
    try {
      localStorage.setItem(resultLogsStorageKey, JSON.stringify(updatedLogs));
    } catch {}

    const todayStr = new Date().toISOString().split('T')[0];
    const prevDate = habitProgress.lastCheckInDateStr;
    const isNextDay = prevDate !== todayStr;
    const newStreak = isNextDay ? habitProgress.currentStreakDays + 1 : habitProgress.currentStreakDays;

    const updatedHabits: HabitProgressState = {
      ...habitProgress,
      currentStreakDays: newStreak,
      totalHabitPoints: habitProgress.totalHabitPoints + result.habitPointsEarned,
      lastCheckInDateStr: todayStr,
      totalCompletedSessions: habitProgress.totalCompletedSessions + 1,
      completedSessionsByCategory: {
        ...habitProgress.completedSessionsByCategory,
        [result.categoryId]: (habitProgress.completedSessionsByCategory[result.categoryId] || 0) + 1,
      },
    };

    setHabitProgress(updatedHabits);
    try {
      localStorage.setItem(habitProgressStorageKey, JSON.stringify(updatedHabits));
    } catch {}

    // Send to backend if available
    try {
      fetch('/api/user/psychology/session-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, habits: updatedHabits }),
      }).catch(() => {});
    } catch {}
  };

  // --- Pre-Trade Check-In State ---
  const [feeling, setFeeling] = useState<EmotionState>('CALM');
  const [intention, setIntention] = useState<TradeIntention>('FOLLOW_PLAN');
  const [confidenceLevel, setConfidenceLevel] = useState<number>(4);
  const [riskAcceptedConfirmation, setRiskAcceptedConfirmation] = useState<boolean>(false);
  const [checkInNotes, setCheckInNotes] = useState<string>('');
  const [checkInSuccess, setCheckInSuccess] = useState<boolean>(false);

  const [checkInHistory, setCheckInHistory] = useState<PsychologyCheckIn[]>(() => {
    try {
      const saved = localStorage.getItem(checkInStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync check-in history from server
  useEffect(() => {
    if (currentUser?.id) {
      fetch('/api/user/psychology')
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && Array.isArray(data.checkIns)) {
            setCheckInHistory(data.checkIns);
            try {
              localStorage.setItem(checkInStorageKey, JSON.stringify(data.checkIns));
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [currentUser?.id, checkInStorageKey]);

  // Post-Trade Review State
  const [selectedTradeId, setSelectedTradeId] = useState<string>('');
  const [postTradeEmotion, setPostTradeEmotion] = useState<EmotionState>('CALM');
  const [followedPlan, setFollowedPlan] = useState<'YES' | 'NO' | 'PARTIALLY'>('YES');
  const [changedStopLoss, setChangedStopLoss] = useState<'YES' | 'NO'>('NO');
  const [closedEarly, setClosedEarly] = useState<'YES' | 'NO'>('NO');
  const [revengeTraded, setRevengeTraded] = useState<'YES' | 'NO'>('NO');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [reviewSuccess, setReviewSuccess] = useState<boolean>(false);

  // Closed Trades calculation
  const closedTrades = useMemo(
    () =>
      [...trades]
        .filter((t) => t.status !== 'OPEN')
        .sort((a, b) => b.timestamp - a.timestamp),
    [trades]
  );

  const todayStr = getKarachiDate();
  const tradesToday = trades.filter((t) => t.date === todayStr);
  const last2Trades = closedTrades.slice(0, 2);
  const consecutiveLosses =
    last2Trades.length >= 2 && last2Trades.every((t) => (t.profitLoss || 0) < 0);

  // Calculate live mental readiness score (0-100)
  const calculateMentalScore = (feel: EmotionState, intent: TradeIntention): number => {
    let score = 50;
    if (feel === 'CALM' || feel === 'DISCIPLINED') score += 40;
    else if (feel === 'CONFIDENT') score += 35;
    else if (feel === 'NEUTRAL') score += 25;
    else if (feel === 'EXCITED') score += 10;
    else if (feel === 'HESITANT') score -= 10;
    else if (feel === 'TIRED') score -= 15;
    else if (feel === 'FEARFUL' || feel === 'ANXIOUS') score -= 25;
    else if (feel === 'STRESSED' || feel === 'FRUSTRATED') score -= 30;
    else if (feel === 'GREEDY') score -= 35;
    else if (feel === 'ANGRY' || feel === 'REVENGE' || feel === 'FOMO') score -= 45;

    if (intent === 'PLANNED' || intent === 'FOLLOW_PLAN' || intent === 'SETUP_CONFIRMED') score += 10;
    else if (intent === 'BOREDOM') score -= 20;
    else if (intent === 'FOMO') score -= 25;
    else if (intent === 'IMPULSIVE') score -= 30;
    else if (intent === 'RECOVERY') score -= 35;
    else if (intent === 'REVENGE') score -= 45;

    return Math.max(10, Math.min(100, score));
  };

  const currentReadinessScore = calculateMentalScore(feeling, intention);

  // High Psychological Risk Detection
  const isHighPsychRisk =
    ['REVENGE', 'FOMO', 'FRUSTRATED', 'ANGRY', 'GREEDY'].includes(feeling) ||
    ['REVENGE', 'RECOVERY', 'FOMO', 'IMPULSIVE'].includes(intention);

  // Determine current Psychological State: CALM, READY, CAUTION, RECOVERY
  const psychologicalState: PsychologicalState = useMemo(() => {
    if (consecutiveLosses || isHighPsychRisk || tradesToday.length >= 3) {
      return 'RECOVERY';
    }
    if (currentReadinessScore < 60 || tradesToday.length === 2 || ['HESITANT', 'TIRED', 'ANXIOUS'].includes(feeling)) {
      return 'CAUTION';
    }
    if (currentReadinessScore >= 75 && riskAcceptedConfirmation) {
      return 'READY';
    }
    return 'CALM';
  }, [consecutiveLosses, isHighPsychRisk, tradesToday.length, currentReadinessScore, feeling, riskAcceptedConfirmation]);

  const stateDetails: Record<
    PsychologicalState,
    { label: string; color: string; bg: string; border: string; desc: string; advice: string }
  > = {
    CALM: {
      label: 'CALM',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      desc: 'Nervous system is balanced. Emotionally detached from market noise with disciplined cognitive composure.',
      advice: 'Optimal state to evaluate high-consequence playbook setups with patient execution.',
    },
    READY: {
      label: 'READY',
      color: 'text-sky-400',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/30',
      desc: 'Pre-trade check-in passed, risk limit accepted, and technical confluences verified.',
      advice: 'Execute planned order with mechanical precision. Hands off mouse once orders are active.',
    },
    CAUTION: {
      label: 'CAUTION',
      color: 'text-cyan-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      desc: 'Mild emotional friction or trade fatigue detected. Potential for early entry or micro-management.',
      advice: 'Perform 3-5 cycles of Box Breathing. Verify that this setup strictly meets 1:1.5 RR criteria.',
    },
    RECOVERY: {
      label: 'RECOVERY',
      color: 'text-rose-400',
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/40',
      desc: 'Cognitive degradation or tilt hazard detected (consecutive losses or high emotional arousal).',
      advice: 'MANDATORY PAUSE: Close order terminal, initiate Recovery Mode, and enforce cooling-off interval.',
    },
  };

  const handleSaveCheckIn = async () => {
    const clock = getKarachiLiveClock();
    const newCheckIn: PsychologyCheckIn = {
      id: `chk-${Date.now()}`,
      accountId: account?.id || 'default',
      date: getKarachiDate(),
      time: clock.time,
      feeling,
      tradeIntention: intention,
      readinessScore: currentReadinessScore,
      confidenceLevel,
      riskAccepted: riskAcceptedConfirmation,
      notes: checkInNotes.trim(),
      timestamp: Date.now(),
    };

    const updated = [newCheckIn, ...checkInHistory.slice(0, 49)];
    setCheckInHistory(updated);
    try {
      localStorage.setItem(checkInStorageKey, JSON.stringify(updated));
    } catch {}

    try {
      await fetch('/api/user/psychology/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkIn: newCheckIn }),
      });
    } catch {}

    playDisciplineAlert(isHighPsychRisk ? 'DANGER' : 'CHIME');
    setCheckInSuccess(true);
    setTimeout(() => setCheckInSuccess(false), 3000);
  };

  const handleSaveReview = () => {
    const selectedTrade = trades.find((t) => t.id === selectedTradeId);
    if (!selectedTrade || !onUpdateTrade) return;

    const updatedTrade: Trade = {
      ...selectedTrade,
      postEmotion: postTradeEmotion,
      notes: reviewNotes.trim()
        ? `${selectedTrade.notes || ''}\n[Post-Review]: ${reviewNotes.trim()}`.trim()
        : selectedTrade.notes,
      postPsychology: {
        ...selectedTrade.postPsychology,
        followedPlan: followedPlan === 'YES',
        movedStopLoss: changedStopLoss === 'YES',
        closedEarly: closedEarly === 'YES',
        revengeTraded: revengeTraded === 'YES',
        overtraded: selectedTrade.postPsychology?.overtraded ?? false,
        increasedLotSizeEmotionally:
          selectedTrade.postPsychology?.increasedLotSizeEmotionally ?? false,
      },
      ruleViolation:
        followedPlan === 'NO' || changedStopLoss === 'YES' || revengeTraded === 'YES'
          ? 'MAJOR'
          : 'NONE',
    };

    onUpdateTrade(updatedTrade);
    playDisciplineAlert('CHIME');
    setReviewSuccess(true);
    setTimeout(() => setReviewSuccess(false), 3000);
  };

  // Real Analytical Metrics derived directly from trades
  const calmTrades = useMemo(
    () => trades.filter((t) => ['CALM', 'DISCIPLINED', 'CONFIDENT'].includes(t.preEmotion || '')),
    [trades]
  );
  const calmWins = calmTrades.filter((t) => (t.profitLoss || 0) > 0).length;
  const calmWinRate = calmTrades.length > 0 ? Math.round((calmWins / calmTrades.length) * 100) : 100;

  const planFollowedCount = trades.filter((t) => t.postPsychology?.followedPlan ?? true).length;
  const followedPlanRate = trades.length > 0 ? Math.round((planFollowedCount / trades.length) * 100) : 100;

  const revengeTradingCost = trades
    .filter(
      (t) =>
        t.preEmotion === 'REVENGE' ||
        t.preEmotion === 'FOMO' ||
        t.postPsychology?.revengeTraded ||
        t.tradeIntention === 'REVENGE'
    )
    .filter((t) => (t.profitLoss || 0) < 0)
    .reduce((acc, t) => acc + Math.abs(t.profitLoss || 0), 0);

  const fomoCount = trades.filter(
    (t) => t.preEmotion === 'FOMO' || t.tradeIntention === 'FOMO' || t.mistakeReason === 'FOMO'
  ).length;

  const slMovedCount = trades.filter(
    (t) => t.postPsychology?.movedStopLoss || t.mistakeReason?.toLowerCase().includes('stop loss')
  ).length;

  const earlyCloseCount = trades.filter(
    (t) => t.postPsychology?.closedEarly || t.mistakeReason?.toLowerCase().includes('early')
  ).length;

  const revengeCount = trades.filter(
    (t) =>
      t.postPsychology?.revengeTraded ||
      t.preEmotion === 'REVENGE' ||
      t.mistakeReason?.toLowerCase().includes('revenge')
  ).length;

  const feelingOptions: { key: EmotionState; label: string; emoji: string; color: string }[] = [
    { key: 'CALM', label: 'Calm', emoji: '😌', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    { key: 'CONFIDENT', label: 'Confident', emoji: '😎', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    { key: 'DISCIPLINED', label: 'Disciplined', emoji: '🎯', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' },
    { key: 'NEUTRAL', label: 'Neutral', emoji: '😐', color: 'border-slate-700 text-slate-300 bg-slate-800/40' },
    { key: 'EXCITED', label: 'Excited', emoji: '🔥', color: 'border-blue-500/40 text-cyan-400 bg-blue-500/10' },
    { key: 'HESITANT', label: 'Hesitant', emoji: '🤔', color: 'border-blue-500/40 text-cyan-400 bg-blue-500/10' },
    { key: 'TIRED', label: 'Tired', emoji: '😴', color: 'border-blue-500/40 text-cyan-400 bg-blue-500/10' },
    { key: 'ANXIOUS', label: 'Anxious', emoji: '😰', color: 'border-orange-500/40 text-orange-400 bg-orange-500/10' },
    { key: 'FRUSTRATED', label: 'Frustrated', emoji: '😖', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
    { key: 'GREEDY', label: 'Greedy', emoji: '🤑', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
    { key: 'FOMO', label: 'FOMO', emoji: '⚡', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
    { key: 'REVENGE', label: 'Revenge', emoji: '💀', color: 'border-rose-500/40 text-rose-400 bg-rose-500/10' },
  ];

  const intentionOptions: { key: TradeIntention; label: string; desc: string; isDanger?: boolean }[] = [
    { key: 'FOLLOW_PLAN', label: 'Follow Plan', desc: 'Pre-analyzed setup strictly executing your model' },
    { key: 'SETUP_CONFIRMED', label: 'Setup Confirmed', desc: 'All HTF & LTF confirmation criteria verified' },
    { key: 'IMPULSIVE', label: 'Impulsive', desc: 'Unplanned entry without waiting for model setup', isDanger: true },
    { key: 'BOREDOM', label: 'Boredom', desc: 'Taking trade purely for market stimulation', isDanger: true },
    { key: 'RECOVERY', label: 'Recovery', desc: 'Attempting to quickly make back a recent loss', isDanger: true },
    { key: 'REVENGE', label: 'Revenge', desc: 'Aggressive retaliation against market movements', isDanger: true },
  ];

  // Navigation Items for the Psychological Command Center Sections
  const navTabs: { id: PsychSectionTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'CATEGORIES', label: '17 Psychology Categories', icon: Brain },
    { id: 'CALMING_TOOLS', label: 'Calming Tools Suite', icon: Wind },
    { id: 'HABITS', label: 'Process Habits & Gamification', icon: Award },
    { id: 'STATE', label: 'Psychological State', icon: Activity },
    { id: 'CHECKIN', label: 'Emotion Check-In', icon: Target },
    { id: 'TRADING_PSYCH', label: 'Trading Psychology', icon: Compass },
    { id: 'TILT_DETECTION', label: 'Tilt Detection', icon: ShieldAlert },
    { id: 'CBT_RECORD', label: 'CBT Thought Record', icon: BookOpen },
    { id: 'ACT_DEFUSION', label: 'ACT / Defusion', icon: Sparkles },
    { id: 'BREATHING', label: 'Breathing / Recovery', icon: HeartPulse },
    { id: 'DISCIPLINE', label: 'Trading Discipline', icon: ShieldCheck },
    { id: 'PERFORMANCE', label: 'Performance Analytics', icon: Flame },
    { id: 'SETTINGS', label: 'Psychological Settings', icon: Sliders },
  ];

  return (
    <div className="psychology-calm-canvas w-full max-w-full overflow-x-hidden box-border p-3 sm:p-6 rounded-3xl space-y-6 border border-indigo-950/60 shadow-2xl transition-all duration-300">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BANNER: Psychological Command Center (Calm Mode) */}
      {/* ========================================================================= */}
      <div className="psychology-calm-card p-5 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                title="Return to Main Dashboard"
                className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 border border-slate-700/80 transition active:scale-95 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shadow-lg shadow-indigo-950/50 shrink-0">
              <Brain className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
                  CENTRAL BEHAVIORAL PROTOCOL
                </span>
                <span className="text-[10px] font-mono-code text-slate-400 hidden sm:inline">
                  USER: @{currentUser?.username || 'Trader'}
                </span>
                <span className="text-[10px] font-mono-code text-indigo-400 font-bold px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/40">
                  CALM MODE
                </span>
              </div>
              <h1 className="text-lg sm:text-2xl font-military font-bold text-slate-100 tracking-wider mt-1 truncate">
                Psychological Command Center
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-sans mt-0.5">
                Train your mindset. Protect your discipline. Improve your execution.
              </p>
            </div>
          </div>

          {/* Direct Action Access Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="psych-recovery-btn"
              type="button"
              onClick={() => setIsRecoveryModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 hover:text-rose-200 border border-rose-500/50 text-xs font-military font-bold tracking-wider transition-all duration-180 active:scale-95 shadow-sm cursor-pointer"
              title="Open Dedicated Recovery Experience"
            >
              <HeartPulse className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>RECOVERY MODE</span>
            </button>

            <button
              id="psych-settings-btn"
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 hover:border-indigo-400 text-xs font-military font-bold tracking-wider transition-all duration-180 active:scale-95 shadow-sm cursor-pointer"
              title="Configure Psychological Settings"
            >
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>PSYCHOLOGICAL SETTINGS</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/90 text-slate-400 hover:text-slate-200 text-xs font-mono-code border border-slate-800 transition active:scale-95"
              >
                <span>Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PSYCHOLOGICAL FOCUS PLAYLIST & AUDIO ENGINE */}
      {/* ========================================================================= */}
      <NasheedPlaylist />

      {/* ========================================================================= */}
      {/* MEDICAL & BEHAVIORAL SCOPE DISCLAIMER BANNER */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-[#090e1c] border border-indigo-500/30 shadow-lg flex items-start gap-3.5 text-xs">
        <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="space-y-1 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-military font-bold text-teal-300 uppercase tracking-wider">
              TRADING PERFORMANCE & EMOTIONAL REGULATION DISCLAIMER
            </span>
            <span className="text-[9px] font-mono-code text-indigo-400 px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800">
              NON-MEDICAL TOOL
            </span>
          </div>
          <p className="text-[11px] font-mono-code leading-relaxed text-slate-400">
            The PRIMEPIPFX Psychology Center is an advanced cognitive, behavioral, and somatic regulation system specifically engineered for trading performance and risk discipline. <strong className="text-slate-200">This platform does not provide medical treatment, psychiatric care, clinical therapy, or medical diagnoses.</strong> It is designed to assist disciplined market operators in managing cognitive biases, probability acceptance, and autonomic down-regulation. If you are experiencing acute psychological or medical distress, please consult a licensed healthcare professional.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PSYCHOLOGICAL STATE MONITORING BANNER (Section 7) */}
      {/* ========================================================================= */}
      <div className={`p-5 sm:p-6 rounded-2xl border-2 ${stateDetails[psychologicalState].bg} ${stateDetails[psychologicalState].border} space-y-4 shadow-xl`}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-military font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-slate-950/80 border border-slate-700 text-slate-300">
              CURRENT PSYCHOLOGICAL STATE
            </span>
            <div className={`text-xl sm:text-2xl font-military font-extrabold tracking-wider ${stateDetails[psychologicalState].color} flex items-center gap-2`}>
              <span>{stateDetails[psychologicalState].label}</span>
              {psychologicalState === 'RECOVERY' && <AlertOctagon className="w-5 h-5 animate-pulse" />}
              {psychologicalState === 'READY' && <CheckCircle2 className="w-5 h-5" />}
              {psychologicalState === 'CALM' && <ShieldCheck className="w-5 h-5" />}
              {psychologicalState === 'CAUTION' && <AlertTriangle className="w-5 h-5" />}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">
                Mental Readiness Rating
              </span>
              <span className={`text-xl font-mono-code font-bold ${
                currentReadinessScore >= 75
                  ? 'text-emerald-400'
                  : currentReadinessScore >= 50
                  ? 'text-cyan-400'
                  : 'text-rose-400'
              }`}>
                {currentReadinessScore}/100
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActiveSection('CHECKIN')}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-mono-code text-slate-200 transition"
            >
              Update State
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono-code">
          <div className="md:col-span-2 space-y-1">
            <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider block">
              Behavioral State Evaluation
            </span>
            <p className="text-slate-300 leading-relaxed">
              {stateDetails[psychologicalState].desc}
            </p>
            <p className="text-amber-300/90 font-medium pt-1">
              Tactical Directive: {stateDetails[psychologicalState].advice}
            </p>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-1 text-[11px]">
            <span className="text-slate-400 font-bold block text-[10px] uppercase">
              Operational Guardrails Status:
            </span>
            <div className="flex items-center justify-between text-slate-300">
              <span>Trades Today:</span>
              <span className="font-bold text-cyan-400">{tradesToday.length} / {account?.maxDailyTrades || 2}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Consecutive Losses:</span>
              <span className={consecutiveLosses ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {consecutiveLosses ? '2 Active (Tilt Risk)' : '0 Clear'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Risk Per Trade:</span>
              <span className="text-sky-400 font-bold">{account?.maxRiskPerTradePercent || 1.0}% Max</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-sans border-t border-slate-800/60 pt-2 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            Notice: Psychological features are presented as trading-performance and behavioral-support tools. This system does not provide medical diagnoses or replace licensed health professionals.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SECTION NAVIGATION PILLS (11 Distinct Functional Sections in Calm Mode) */}
      {/* ========================================================================= */}
      <div className="bg-[#0B101E]/90 border border-indigo-900/40 rounded-2xl p-1.5 shadow-xl overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                id={`psych-nav-${tab.id.toLowerCase()}`}
                type="button"
                onClick={() => {
                  setActiveSection(tab.id);
                  setSelectedCategory(null);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-military font-bold tracking-wider transition-all duration-180 select-none whitespace-nowrap active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/50'
                    : 'text-slate-400 hover:text-indigo-200 hover:bg-indigo-950/40 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE INTERACTIVE SESSION RUNNER MODAL */}
      {/* ========================================================================= */}
      {activeSessionToRun && (
        <InteractiveSessionRunner
          session={activeSessionToRun.session}
          category={activeSessionToRun.category}
          onClose={() => setActiveSessionToRun(null)}
          onSaveResult={handleSaveSessionResult}
        />
      )}

      {/* ========================================================================= */}
      {/* CATEGORY DETAIL VIEW (Dedicated Experience for any selected category) */}
      {/* ========================================================================= */}
      {selectedCategory ? (
        <CategoryDetailView
          category={selectedCategory}
          onBack={() => setSelectedCategory(null)}
          resultLogs={resultLogs}
          onSaveResult={handleSaveSessionResult}
          habitProgress={habitProgress}
        />
      ) : (
        <>
          {/* ========================================================================= */}
          {/* SECTION: 17 DEDICATED PSYCHOLOGY CATEGORIES */}
          {/* ========================================================================= */}
          {activeSection === 'CATEGORIES' && (
            <PsychologyProfessionalDashboard
              onSelectCategory={(category) => setSelectedCategory(category)}
              onLaunchSessionDirect={(category, session) =>
                setActiveSessionToRun({ category, session })
              }
              resultLogs={resultLogs}
              habitProgress={habitProgress}
              trades={trades}
            />
          )}

          {/* ========================================================================= */}
          {/* SECTION: CALMING TOOLS SUITE */}
          {/* ========================================================================= */}
          {activeSection === 'CALMING_TOOLS' && (
            <CalmingToolsHub
              trades={trades}
              userId={userId}
              onNavigateToTab={(tab) => {
                if (tab === 'DASHBOARD' && onClose) {
                  onClose();
                }
              }}
            />
          )}

          {/* ========================================================================= */}
          {/* SECTION: PROCESS HABITS & GAMIFICATION */}
          {/* ========================================================================= */}
          {activeSection === 'HABITS' && (
            <HabitsGamificationDashboard
              habitProgress={habitProgress}
              resultLogs={resultLogs}
            />
          )}

          {/* ========================================================================= */}
          {/* SECTION VIEW 1: PSYCHOLOGICAL STATE (Detailed Overview) */}
          {/* ========================================================================= */}
          {activeSection === 'STATE' && (
            <div className="space-y-6">
              <TiltRadar
                trades={trades}
                account={account}
                currentUser={currentUser}
                onEnterRecoveryMode={() => setIsRecoveryModalOpen(true)}
                onOpenCBT={() => setActiveSection('CBT_RECORD')}
                onOpenACT={() => setActiveSection('ACT_DEFUSION')}
              />

              <TradingDisciplineSection
                account={account}
                currentUser={currentUser}
                trades={trades}
              />
            </div>
          )}

      {/* ========================================================================= */}
      {/* SECTION VIEW 2: EMOTION CHECK-IN & POST-TRADE REVIEW */}
      {/* ========================================================================= */}
      {activeSection === 'CHECKIN' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Interactive Check-in Form */}
          <div className="lg:col-span-2 bg-slate-950/70 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-mono-code text-cyan-400 uppercase font-bold tracking-wider">
                PRE-FLIGHT PSYCHOLOGICAL AUDIT
              </span>
              <h3 className="text-base font-military font-bold text-slate-100 mt-1">
                How Are You Feeling Right Now?
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Trading requires mental neutrality. Acknowledge your emotional state before risking capital.
              </p>
            </div>

            {/* High-Risk Psychological Warning */}
            {isHighPsychRisk && (
              <div className="p-4 rounded-xl bg-rose-950/40 border-2 border-rose-500 text-rose-200 shadow-2xl space-y-2.5 animate-pulse">
                <div className="flex items-center gap-2 font-military font-bold text-sm text-rose-400 uppercase tracking-wider">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>WARNING: HIGH PSYCHOLOGICAL RISK DETECTED</span>
                </div>
                <p className="text-xs font-mono-code text-rose-200">
                  Trading in this emotional state frequently leads to severe capital loss and revenge spiraling.
                </p>
                <div className="pt-2 border-t border-rose-800/60 font-mono-code text-xs text-rose-300">
                  <p className="font-bold text-rose-200 uppercase mb-1">Recommended action:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-300">
                    <li>Step away from the market.</li>
                    <li>Take a 15-minute break in Recovery Mode.</li>
                    <li>Review your trading rules before placing any order.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Emotional State Buttons Grid */}
            <div className="space-y-2">
              <label className="text-xs font-military font-bold text-slate-200 tracking-wider uppercase block">
                1. Select Dominant Emotion:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {feelingOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFeeling(opt.key)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-mono-code transition cursor-pointer ${
                      feeling === opt.key
                        ? `${opt.color} ring-2 ring-blue-500 shadow-md font-bold scale-[1.02]`
                        : 'border-slate-800 hover:border-slate-700 text-slate-400 bg-slate-950/60'
                    }`}
                  >
                    <span className="text-base">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Trade Intention */}
            <div className="space-y-2">
              <label className="text-xs font-military font-bold text-slate-200 tracking-wider uppercase block">
                2. Trade Intention & Objective:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {intentionOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setIntention(opt.key)}
                    className={`text-left p-3 rounded-lg border transition cursor-pointer ${
                      intention === opt.key
                        ? 'border-blue-500 bg-blue-500/10 text-slate-100 ring-1 ring-blue-500'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono-code font-bold">
                      <span>{opt.label}</span>
                      {opt.isDanger && (
                        <span className="text-[10px] text-rose-400 uppercase font-mono-code bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                          Hazard
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Confidence Level (1-5) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-military font-bold text-slate-200 tracking-wider uppercase block">
                  3. Confidence Level in Planned Setup:
                </label>
                <span className="text-xs font-mono-code text-cyan-400 font-bold">
                  {confidenceLevel} of 5
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setConfidenceLevel(lvl)}
                    className={`py-2 text-xs font-mono-code rounded-lg border transition cursor-pointer ${
                      confidenceLevel === lvl
                        ? 'bg-blue-500 text-slate-950 font-bold border-cyan-400 shadow'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ★ {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk Accepted Checkbox */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={riskAcceptedConfirmation}
                  onChange={(e) => setRiskAcceptedConfirmation(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-blue-500 rounded cursor-pointer"
                />
                <span className="text-xs font-mono-code text-slate-300">
                  <span className="font-bold text-cyan-400">Risk Acceptance Protocol:</span> I fully accept the 1% mathematical risk of this trade. I acknowledge that the outcome is uncertain, and I will not interfere with my predefined Stop Loss.
                </span>
              </label>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-military font-bold text-slate-200 tracking-wider uppercase block">
                4. Pre-Trade Mental Notes:
              </label>
              <textarea
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="What is your thesis? Are you calm? Any physical tension in jaw or neck?..."
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-mono-code text-slate-400">
                User-Isolated Storage: @{currentUser?.username || 'Trader'}
              </span>

              <button
                type="button"
                onClick={handleSaveCheckIn}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military text-xs font-bold tracking-wider transition shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>SAVE CHECK-IN RECORD</span>
              </button>
            </div>

            {checkInSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-mono-code flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Check-In saved successfully! Readiness score logged.</span>
              </div>
            )}
          </div>

          {/* Side Panel: Post-Trade Review & Recent Check-in History */}
          <div className="space-y-6">
            {/* Quick Post-Trade Review Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-mono-code text-cyan-400 uppercase font-bold tracking-wider">
                  POST-EXECUTION AUDIT
                </span>
                <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider mt-0.5">
                  Post-Trade Emotional Review
                </h4>
              </div>

              {closedTrades.length === 0 ? (
                <p className="text-xs font-mono-code text-slate-500">
                  No closed trades to review yet. Complete a trade to audit your execution.
                </p>
              ) : (
                <div className="space-y-3 text-xs font-mono-code">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Select Closed Trade:</label>
                    <select
                      value={selectedTradeId}
                      onChange={(e) => setSelectedTradeId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Choose a Trade --</option>
                      {closedTrades.slice(0, 10).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.instrument} ({t.direction}) • PnL: {formatCurrency(t.profitLoss || 0, currency)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTradeId && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Followed Written Plan?</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['YES', 'PARTIALLY', 'NO'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFollowedPlan(opt)}
                              className={`py-1.5 rounded border transition ${
                                followedPlan === opt
                                  ? opt === 'YES'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                    : 'bg-rose-500/20 text-rose-400 border-rose-500'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Moved Stop Loss?</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(['NO', 'YES'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setChangedStopLoss(opt)}
                              className={`py-1.5 rounded border transition ${
                                changedStopLoss === opt
                                  ? opt === 'NO'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                    : 'bg-rose-500/20 text-rose-400 border-rose-500'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveReview}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-military text-xs font-bold rounded-lg transition mt-2 shadow"
                      >
                        SAVE POST-TRADE AUDIT
                      </button>

                      {reviewSuccess && (
                        <span className="text-[11px] text-emerald-400 block text-center">
                          ✓ Review appended to trade record!
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Check-in History */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-military font-bold text-slate-200 tracking-wider uppercase">
                  RECENT CHECK-INS ({checkInHistory.length})
                </span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {checkInHistory.length === 0 ? (
                <p className="text-xs font-mono-code text-slate-500">No check-ins recorded yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {checkInHistory.slice(0, 5).map((chk) => (
                    <div
                      key={chk.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono-code space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{chk.date} {chk.time}</span>
                        <span className="text-cyan-400 font-bold">{chk.readinessScore}/100</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-bold">{chk.feeling}</span>
                        <span className="text-slate-400">{chk.tradeIntention}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION VIEW 3: TRADING PSYCHOLOGY & BEHAVIORAL AUDIT */}
      {/* ========================================================================= */}
      {activeSection === 'TRADING_PSYCH' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Calm Executions Win Rate</span>
              <div className="text-2xl font-mono-code font-bold text-emerald-400">
                {calmWinRate}%
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Win rate when entering trades with disciplined, calm mood.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Plan Adherence</span>
              <div className="text-2xl font-mono-code font-bold text-cyan-400">
                {followedPlanRate}%
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Percent of trades where predefined playbook rules were honored.
              </p>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
              <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Revenge/Impulsive Cost</span>
              <div className="text-2xl font-mono-code font-bold text-rose-400">
                {formatCurrency(revengeTradingCost, currency)}
              </div>
              <p className="text-[10px] text-slate-500 font-sans">
                Direct dollar losses attributable to emotional impulsivity.
              </p>
            </div>
          </div>

          <PsychologyTimelineChart trades={trades} currency={currency} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION VIEW 4: TILT DETECTION & 3-TIER FRAMEWORK (Section 8) */}
      {/* ========================================================================= */}
      {activeSection === 'TILT_DETECTION' && (
        <TiltRadar
          trades={trades}
          account={account}
          currentUser={currentUser}
          onEnterRecoveryMode={() => setIsRecoveryModalOpen(true)}
          onOpenCBT={() => setActiveSection('CBT_RECORD')}
          onOpenACT={() => setActiveSection('ACT_DEFUSION')}
        />
      )}

      {/* ========================================================================= */}
      {/* SECTION VIEW 5: CBT THOUGHT RECORD TOOL (Section 6 & 9) */}
      {/* ========================================================================= */}
      {activeSection === 'CBT_RECORD' && (
        <CBTThoughtRecordTool currentUser={currentUser} />
      )}

      {/* ========================================================================= */}
      {/* SECTION VIEW 6: ACT / COGNITIVE DEFUSION TOOL (Section 7 & 9) */}
      {/* ========================================================================= */}
      {activeSection === 'ACT_DEFUSION' && (
        <ACTDefusionTool currentUser={currentUser} />
      )}

      {/* ========================================================================= */}
      {/* SECTION VIEW 7: BREATHING & RECOVERY (Section 8) */}
      {/* ========================================================================= */}
      {activeSection === 'BREATHING' && (
        <div className="space-y-6">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-military font-bold text-emerald-400 uppercase tracking-widest">
                PARASYMPATHETIC DOWN-REGULATION
              </span>
              <h3 className="text-base font-military font-bold text-slate-100 mt-1">
                Breathing Cadence Guide
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Regulate heart rate and lower autonomic arousal between trades. 5 cycles will restore executive control.
              </p>
            </div>
            <BoxBreathingExercise />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION VIEW 8: TRADING DISCIPLINE (Section 9) */}
      {/* ========================================================================= */}
      {activeSection === 'DISCIPLINE' && (
        <TradingDisciplineSection
          account={account}
          currentUser={currentUser}
          trades={trades}
        />
      )}

      {/* ========================================================================= */}
      {/* SECTION VIEW 9: COGNITIVE TOOLS (Patience, Drawdown mini-game, Bias Quiz) */}
      {/* ========================================================================= */}
      {activeSection === 'COGNITIVE_TOOLS' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
            {[
              { id: 'BREATHING', label: 'Breathing' },
              { id: 'PATIENCE', label: 'Patience Simulator' },
              { id: 'RISK_GAME', label: 'Risk Assessment Game' },
              { id: 'BIAS_QUIZ', label: 'Emotional Bias Quiz' },
            ].map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setCognitiveToolTab(tool.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition ${
                  cognitiveToolTab === tool.id
                    ? 'bg-blue-500 text-slate-950 shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>

          {cognitiveToolTab === 'BREATHING' && <BoxBreathingExercise />}
          {cognitiveToolTab === 'PATIENCE' && <PatienceSimulator />}
          {cognitiveToolTab === 'RISK_GAME' && <RiskAssessmentGame />}
          {cognitiveToolTab === 'BIAS_QUIZ' && <EmotionalBiasQuiz />}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION VIEW 10: PERFORMANCE PSYCHOLOGY & EMPIRICAL METRICS (Section 10) */}
      {/* ========================================================================= */}
      {activeSection === 'PERFORMANCE' && (
        <div className="space-y-6">
          <PsychologyTimelineChart trades={trades} currency={currency} />

          {/* Behavioral Mistakes Distribution */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-military font-bold text-slate-100 tracking-wider uppercase">
              EMPIRICAL BEHAVIORAL MISTAKE ANALYSIS
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono-code">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">FOMO Entries:</span>
                <span className="text-cyan-400 font-bold text-lg">{fomoCount}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Moved Stop Loss:</span>
                <span className="text-rose-400 font-bold text-lg">{slMovedCount}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Closed Too Early:</span>
                <span className="text-sky-400 font-bold text-lg">{earlyCloseCount}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Revenge Trades:</span>
                <span className="text-rose-400 font-bold text-lg">{revengeCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

          {/* ========================================================================= */}
          {/* SECTION VIEW 11: PSYCHOLOGICAL SETTINGS (Section 11) */}
          {/* ========================================================================= */}
          {activeSection === 'SETTINGS' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-military font-bold text-slate-100 uppercase">
                    Psychological Preferences & Guardrails
                  </h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">
                    Configure your personalized psychological protection parameters. Isolated to @{currentUser?.username || 'Trader'}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold rounded-lg transition"
                >
                  Open Settings Editor
                </button>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-code space-y-2 text-slate-300">
                <p>• <strong className="text-cyan-400">Cooldown Timer:</strong> 30 minutes default lockout upon Level 2 or Level 3 tilt.</p>
                <p>• <strong className="text-cyan-400">Pre-Trade Check-In:</strong> Required before recording live executions.</p>
                <p>• <strong className="text-cyan-400">Tilt Sensitivity:</strong> STRICT (alert triggered at 2 consecutive losses or 3 daily trades).</p>
                <p>• <strong className="text-cyan-400">Recovery Mode:</strong> Automated prompts enabled when risk limit is reached.</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* RECOVERY MODE MODAL (Dedicated Experience) */}
      {/* ========================================================================= */}
      <RecoveryModeModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        currentUser={currentUser}
        account={account}
        initialTrigger={consecutiveLosses ? '2 Consecutive Losses Detected' : 'Trader Requested Reset'}
        onRecoveryCompleted={() => {
          setActiveSection('STATE');
        }}
      />

      {/* ========================================================================= */}
      {/* PSYCHOLOGICAL SETTINGS MODAL */}
      {/* ========================================================================= */}
      <PsychologicalSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
};
