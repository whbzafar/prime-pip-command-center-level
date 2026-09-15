import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Award,
  Calendar,
  ListTodo,
  TrendingUp,
  Brain,
  Crosshair,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { DailyTaskItem, TaskStatus, DailyDisciplineRecord, AccountSettings, Trade, TradingRule } from '../types';
import { getKarachiDate, getKarachiTime12 } from '../utils/time';
import { playDisciplineAlert } from '../utils/audioAlerts';

interface DailyDevelopmentPlanProps {
  account: AccountSettings | null;
  trades: Trade[];
  rules: TradingRule[];
  onAutoSaveNotify?: (timeStr: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

const DEFAULT_CORE_TASKS: Array<Omit<DailyTaskItem, 'id' | 'status'>> = [
  {
    title: 'Check Higher Timeframe Direction',
    description: 'Establish Daily and 4-Hour trend alignment before looking for entries.',
    category: 'PRE_MARKET',
    isRecurring: true,
    recurrence: 'DAILY',
  },
  {
    title: 'Review Trading Rules',
    description: 'Acknowledge playbook constraints and daily risk boundaries.',
    category: 'PRE_MARKET',
    isRecurring: true,
    recurrence: 'DAILY',
  },
  {
    title: "Review Yesterday's Trades",
    description: 'Inspect previous executions and emotional notes to maintain awareness.',
    category: 'REVIEW',
    isRecurring: true,
    recurrence: 'DAILY',
  },
  {
    title: 'Complete Pre-Trading Psychology Check',
    description: 'Verify emotional neutrality, calm demeanor, and trade intention.',
    category: 'PSYCHOLOGY',
    isRecurring: true,
    recurrence: 'DAILY',
  },
  {
    title: 'Check Risk Limit',
    description: 'Calculate position size to ensure maximum 1% risk of account capital.',
    category: 'RISK',
    isRecurring: true,
    recurrence: 'DAILY',
  },
  {
    title: 'Execute Pre-Market Liquidity Mapping',
    description: 'Mark key liquidity pools, Fair Value Gaps, and key session highs/lows.',
    category: 'PRE_MARKET',
    isRecurring: true,
    recurrence: 'DAILY',
  },
  {
    title: 'Complete Backtesting Task',
    description: 'Verify minimum 10 sample trades in the Backtesting Tracker.',
    category: 'BACKTEST',
    isRecurring: true,
    recurrence: 'DAILY',
  },
  {
    title: 'Record Every Trade',
    description: 'Log entry price, stop loss, take profit, lot size, and execution notes.',
    category: 'EXECUTION',
    isRecurring: true,
    recurrence: 'DAILY',
  },
  {
    title: 'Complete Post-Trade Review',
    description: 'Check whether the plan was followed and if stop loss was respected.',
    category: 'REVIEW',
    isRecurring: true,
    recurrence: 'DAILY',
  },
  {
    title: 'Complete End-of-Day Review',
    description: 'Summarize lessons learned and verify daily lockout adherence.',
    category: 'REVIEW',
    isRecurring: true,
    recurrence: 'DAILY',
  },
];

const PRESET_CUSTOM_TASKS = [
  'Backtest 20 SBT Model 1 trades',
  'Review 10 losing trades without judgment',
  'Do not take more than 2 trades today',
  'Risk maximum 1% per trade strictly',
  'Wait for complete HTF confirmation candle close',
  'Take a 15-minute screen break after trade closes',
];

export const DailyDevelopmentPlan: React.FC<DailyDevelopmentPlanProps> = ({
  account,
  trades = [],
  rules = [],
  onAutoSaveNotify,
  onNavigateToTab,
}) => {
  const accountId = account?.id || 'default';
  const todayDate = getKarachiDate();
  const tasksStorageKey = `primepipfx_dailytasks_${accountId}_${todayDate}`;
  const historyStorageKey = `primepipfx_discipline_history_${accountId}`;

  // State: daily tasks
  const [tasks, setTasks] = useState<DailyTaskItem[]>(() => {
    try {
      const saved = localStorage.getItem(tasksStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not read daily tasks', e);
    }
    // Initialize default core tasks for today
    return DEFAULT_CORE_TASKS.map((task, idx) => ({
      ...task,
      id: `task-core-${idx + 1}`,
      status: 'NOT_COMPLETED' as TaskStatus,
    }));
  });

  // State: past discipline history
  const [history, setHistory] = useState<DailyDisciplineRecord[]>(() => {
    try {
      const saved = localStorage.getItem(historyStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      return [];
    }
    return [];
  });

  // Modal for adding custom task
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState<DailyTaskItem['category']>('CUSTOM');
  const [isRecurring, setIsRecurring] = useState(true);
  const [recurrenceType, setRecurrenceType] = useState<'DAILY' | 'WEEKLY'>('DAILY');

  // Editing task
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Sync tasks to local storage
  useEffect(() => {
    try {
      localStorage.setItem(tasksStorageKey, JSON.stringify(tasks));
      const savedTime = getKarachiTime12();
      onAutoSaveNotify?.(`${savedTime} PKT`);
    } catch (e) {
      console.warn('Failed saving daily tasks', e);
    }
  }, [tasks, tasksStorageKey, onAutoSaveNotify]);

  // Handle task status toggle (COMPLETED, NOT_COMPLETED, SKIPPED)
  const handleSetStatus = (taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    if (status === 'COMPLETED') {
      playDisciplineAlert('CHIME');
    }
  };

  // Add custom task
  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;

    if (editingTaskId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                title: customTitle.trim(),
                category: customCategory,
                isRecurring,
                recurrence: recurrenceType,
              }
            : t
        )
      );
      setEditingTaskId(null);
    } else {
      const newTask: DailyTaskItem = {
        id: `task-custom-${Date.now()}`,
        title: customTitle.trim(),
        status: 'NOT_COMPLETED',
        category: customCategory,
        isCustom: true,
        isRecurring,
        recurrence: recurrenceType,
        createdAt: getKarachiDate(),
      };
      setTasks((prev) => [...prev, newTask]);
    }

    setCustomTitle('');
    setIsAddModalOpen(false);
  };

  const handleEditTask = (task: DailyTaskItem) => {
    setEditingTaskId(task.id);
    setCustomTitle(task.title);
    setCustomCategory(task.category || 'CUSTOM');
    setIsRecurring(!!task.isRecurring);
    setRecurrenceType(task.recurrence || 'DAILY');
    setIsAddModalOpen(true);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Restore default core tasks
  const handleRestoreCoreTasks = () => {
    const defaultTasks: DailyTaskItem[] = DEFAULT_CORE_TASKS.map((task, idx) => ({
      ...task,
      id: `task-core-${idx + 1}`,
      status: 'NOT_COMPLETED' as TaskStatus,
    }));
    const customTasks = tasks.filter((t) => t.isCustom);
    setTasks([...defaultTasks, ...customTasks]);
  };

  // Reset daily tasks
  const handleResetTasks = () => {
    if (window.confirm("Reset all of today's tasks to NOT COMPLETED?")) {
      setTasks((prev) => prev.map((t) => ({ ...t, status: 'NOT_COMPLETED' })));
    }
  };

  // ----------------------------------------------------
  // DAILY DISCIPLINE SCORE ENGINE (Requirement 10)
  // ----------------------------------------------------
  // Calculate score 0-100:
  // Decoupled from profit!
  // Components:
  // 1. Task Completion: 40 points
  // 2. Rules Adherence: 30 points
  // 3. Risk Consistency & Daily Limits: 20 points
  // 4. Psychology Check Completion: 10 points
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalTasksCount = tasks.length;
  const taskCompletionRatio = totalTasksCount > 0 ? completedTasksCount / totalTasksCount : 0;
  const taskScore = Math.round(taskCompletionRatio * 40);

  // Rules adherence from active rules and today's trades
  const todayTrades = trades.filter((t) => t.date === todayDate);
  const totalRulesActive = rules.filter((r) => r.isActive ?? r.active ?? true).length;
  const ruleViolationsToday = todayTrades.filter(
    (t) => t.ruleViolation && t.ruleViolation !== 'NONE'
  ).length;
  const rulesFollowedCount = Math.max(0, totalRulesActive - ruleViolationsToday);
  const ruleRatio = totalRulesActive > 0 ? Math.max(0, 1 - (ruleViolationsToday / Math.max(1, totalRulesActive))) : 1;
  const ruleScore = Math.round(ruleRatio * 30);

  // Risk consistency
  const maxRiskPerTrade = account?.maxRiskPerTradePercent || 1.0;
  const maxDailyTrades = account?.maxDailyTrades || 2;
  const tradesTodayCount = todayTrades.length;
  const isTradeLimitExceeded = tradesTodayCount > maxDailyTrades;
  
  let riskComplianceRating: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'BREACHED' = 'EXCELLENT';
  let riskScore = 20;

  if (isTradeLimitExceeded) {
    riskComplianceRating = 'BREACHED';
    riskScore = 0;
  } else if (todayTrades.some((t) => (t.riskPercentage || 0) > maxRiskPerTrade * 1.1)) {
    riskComplianceRating = 'WARNING';
    riskScore = 8;
  } else if (todayTrades.length > 0) {
    riskComplianceRating = 'EXCELLENT';
    riskScore = 20;
  }

  // Psychology check-in completed today?
  const isPsychologyCheckDone = tasks.some(
    (t) => t.title.toLowerCase().includes('psychology') && t.status === 'COMPLETED'
  );
  const psychologyScore = isPsychologyCheckDone ? 10 : 0;

  const totalDisciplineScore = Math.min(100, Math.max(0, taskScore + ruleScore + riskScore + psychologyScore));

  // ----------------------------------------------------
  // DAILY IMPROVEMENT FEEDBACK (Requirement 11)
  // ----------------------------------------------------
  const todayDidWell: string[] = [];
  let areaToImprove = '';
  let tomorrowFocus = '';

  if (completedTasksCount >= Math.ceil(totalTasksCount * 0.7)) {
    todayDidWell.push('You completed the majority of your daily development rituals.');
  }
  if (ruleViolationsToday === 0) {
    todayDidWell.push('You followed your playbook rules with 100% adherence.');
  }
  if (!isTradeLimitExceeded) {
    todayDidWell.push(`You respected your daily execution limit (${tradesTodayCount}/${maxDailyTrades} trades).`);
  }
  if (isPsychologyCheckDone) {
    todayDidWell.push('You completed your pre-market psychology check-in.');
  }
  if (todayDidWell.length === 0) {
    todayDidWell.push('You opened the command center and initiated market preparation.');
  }

  // Identify primary area to improve
  const skippedTasks = tasks.filter((t) => t.status === 'SKIPPED');
  const incompleteTasks = tasks.filter((t) => t.status === 'NOT_COMPLETED');

  if (isTradeLimitExceeded) {
    areaToImprove = `You exceeded your daily limit of ${maxDailyTrades} trades. Overtrading compromises capital.`;
    tomorrowFocus = 'Shut down the terminal immediately after reaching your daily trade limit.';
  } else if (ruleViolationsToday > 0) {
    areaToImprove = `You recorded ${ruleViolationsToday} playbook rule violation(s) today.`;
    tomorrowFocus = 'Review rules before entering any order and demand full confirmation.';
  } else if (skippedTasks.some((t) => t.title.toLowerCase().includes('review'))) {
    areaToImprove = 'You skipped your trade or post-market review.';
    tomorrowFocus = 'Complete the trade review before ending the trading day to log critical lessons.';
  } else if (incompleteTasks.some((t) => t.title.toLowerCase().includes('backtest'))) {
    areaToImprove = 'You did not complete your daily backtesting quota.';
    tomorrowFocus = 'Dedicate 15 minutes to backtesting 10 sample trades to reinforce your edge.';
  } else if (incompleteTasks.length > 3) {
    areaToImprove = `${incompleteTasks.length} daily development tasks remain unfulfilled.`;
    tomorrowFocus = 'Prioritize checking higher timeframe direction and risk calculation before entering.';
  } else {
    areaToImprove = 'Maintain this high-level discipline through changing market volatility.';
    tomorrowFocus = 'Execute your edge with patience and let probabilities play out.';
  }

  // Save today's record into history
  const handleSaveDayRecord = () => {
    const record: DailyDisciplineRecord = {
      id: `disc-${todayDate}`,
      date: todayDate,
      tasksCompleted: completedTasksCount,
      totalTasks: totalTasksCount,
      rulesFollowedCount,
      totalRulesActive,
      riskComplianceRating,
      psychologyCheckCompleted: isPsychologyCheckDone,
      disciplineScore: totalDisciplineScore,
      todayDidWell,
      areaToImprove,
      tomorrowFocus,
      timestamp: Date.now(),
    };

    const updated = [record, ...history.filter((h) => h.date !== todayDate)].slice(0, 30);
    setHistory(updated);
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(updated));
      const savedTime = getKarachiTime12();
      onAutoSaveNotify?.(`${savedTime} PKT`);
      alert("Today's Discipline Record has been saved to your development history.");
    } catch (e) {
      console.warn('Error saving discipline record', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                DAILY TRADER HABIT ENGINE
              </span>
              <span className="text-xs font-mono-code text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {todayDate} (PKT)
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide mt-0.5">
              TODAY&apos;S TRADING DEVELOPMENT PLAN
            </h2>
            <p className="text-xs text-slate-400">
              Consistency is built on daily habits, risk discipline, and process adherence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleResetTasks}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-military font-bold transition"
            title="Reset today's tasks"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RESET</span>
          </button>
          <button
            id="add-custom-task-btn"
            onClick={() => {
              setEditingTaskId(null);
              setCustomTitle('');
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-military font-bold tracking-wider transition shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>ADD CUSTOM TASK</span>
          </button>
          <button
            id="save-eod-discipline-btn"
            onClick={handleSaveDayRecord}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-military font-bold tracking-wider transition shadow-lg shadow-emerald-500/20"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>SAVE END-OF-DAY REVIEW</span>
          </button>
        </div>
      </div>

      {/* Score and Process Alignment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Discipline Score Card (Requirement 10) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-military font-bold text-slate-400 tracking-wider">
                DAILY DISCIPLINE SCORE
              </span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 font-bold">
                PROCESS OVER PROFIT
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-3">
              <span
                className={`text-4xl font-military font-bold ${
                  totalDisciplineScore >= 80
                    ? 'text-emerald-400'
                    : totalDisciplineScore >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {totalDisciplineScore}
              </span>
              <span className="text-sm font-mono-code text-slate-400">/ 100</span>
            </div>

            {/* Score Breakdown (Factual, not fake) */}
            <div className="space-y-2 mt-4 text-xs font-mono-code">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Tasks Completed:</span>
                <span className="font-bold text-slate-100">
                  {completedTasksCount} / {totalTasksCount} (+{taskScore} pts)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Rules Followed:</span>
                <span className="font-bold text-slate-100">
                  {rulesFollowedCount} / {totalRulesActive} (+{ruleScore} pts)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Risk Management:</span>
                <span
                  className={`font-bold ${
                    riskComplianceRating === 'EXCELLENT'
                      ? 'text-emerald-400'
                      : riskComplianceRating === 'WARNING'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {riskComplianceRating} (+{riskScore} pts)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400">Psychology Check:</span>
                <span className={`font-bold ${isPsychologyCheckDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isPsychologyCheckDone ? 'COMPLETED (+10)' : 'PENDING (0)'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
            <span className="text-amber-400 font-bold">Important: </span>
            A trader can lose money on a disciplined trade (A+ setup hitting SL) and maintain a 95+ score.
            Discipline measures decision quality, not luck.
          </div>
        </div>

        {/* Daily Improvement Feedback (Requirement 11) */}
        <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-military font-bold text-slate-100 tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>DAILY IMPROVEMENT FEEDBACK (DATA-DRIVEN)</span>
              </h3>
              <span className="text-[10px] font-mono-code text-slate-400">AUTOMATIC EVALUATION</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              {/* Today you did well */}
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-[11px] font-military font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>TODAY YOU DID WELL:</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {todayDidWell.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 font-mono-code text-[11px]">
                      <span className="text-emerald-400 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Area to improve */}
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="text-[11px] font-military font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>AREA TO IMPROVE:</span>
                </div>
                <p className="text-xs font-mono-code text-slate-300 text-[11px] leading-relaxed">
                  {areaToImprove}
                </p>
              </div>

              {/* Tomorrow's focus */}
              <div className="p-3 rounded-lg bg-sky-500/5 border border-sky-500/20">
                <div className="text-[11px] font-military font-bold text-sky-400 flex items-center gap-1.5 mb-2">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>TOMORROW&apos;S FOCUS:</span>
                </div>
                <p className="text-xs font-mono-code text-slate-300 text-[11px] leading-relaxed">
                  {tomorrowFocus}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 text-[10px] font-mono-code text-slate-400 flex items-center justify-between">
            <span>Feedback is generated objectively from your live actions and task logs.</span>
            <span className="text-emerald-400 font-bold">100% Offline Analysis</span>
          </div>
        </div>
      </div>

      {/* Daily Development Checklist (Requirements 8 & 9) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-military font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>TODAY&apos;S HABIT CHECKLIST ({completedTasksCount}/{totalTasksCount} COMPLETED)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mark each task as COMPLETED, NOT COMPLETED, or SKIPPED. Custom and recurring tasks supported.
            </p>
          </div>

          {/* Quick preset tasks pills & restore */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleRestoreCoreTasks}
              className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-teal-950/40 hover:bg-teal-900/60 text-teal-300 border border-teal-800/50 transition flex items-center gap-1"
              title="Restore standard core discipline tasks"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restore Core Tasks</span>
            </button>
            <span className="text-[10px] font-mono-code text-slate-400">QUICK PRESETS:</span>
            {PRESET_CUSTOM_TASKS.slice(0, 3).map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (tasks.some((t) => t.title === preset)) return;
                  const newTask: DailyTaskItem = {
                    id: `task-preset-${Date.now()}-${idx}`,
                    title: preset,
                    status: 'NOT_COMPLETED',
                    category: 'CUSTOM',
                    isCustom: true,
                    isRecurring: true,
                    recurrence: 'DAILY',
                  };
                  setTasks((prev) => [...prev, newTask]);
                }}
                className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Task Cards */}
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`p-3 rounded-lg border transition flex flex-wrap items-center justify-between gap-3 ${
                task.status === 'COMPLETED'
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : task.status === 'SKIPPED'
                  ? 'bg-slate-950/40 border-slate-800 opacity-60'
                  : 'bg-slate-950/80 border-slate-800/90'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {task.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : task.status === 'SKIPPED' ? (
                    <XCircle className="w-5 h-5 text-slate-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-slate-600 text-[10px]">
                      ○
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold ${
                        task.status === 'COMPLETED'
                          ? 'text-emerald-300 font-bold'
                          : task.status === 'SKIPPED'
                          ? 'text-slate-400 line-through'
                          : 'text-slate-100'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.category && (
                      <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">
                        {task.category}
                      </span>
                    )}
                    {task.isRecurring && (
                      <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-sky-950/40 text-sky-400 border border-sky-800/40">
                        {task.recurrence || 'DAILY'}
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono-code">
                      {task.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Toggle Buttons */}
                <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-[11px] font-mono-code">
                  <button
                    onClick={() => handleSetStatus(task.id, 'COMPLETED')}
                    className={`px-2.5 py-1 rounded transition font-bold ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    COMPLETED
                  </button>
                  <button
                    onClick={() => handleSetStatus(task.id, 'NOT_COMPLETED')}
                    className={`px-2.5 py-1 rounded transition font-bold ${
                      task.status === 'NOT_COMPLETED'
                        ? 'bg-slate-800 text-amber-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    PENDING
                  </button>
                  <button
                    onClick={() => handleSetStatus(task.id, 'SKIPPED')}
                    className={`px-2.5 py-1 rounded transition font-bold ${
                      task.status === 'SKIPPED'
                        ? 'bg-slate-800 text-rose-300'
                        : 'text-slate-400 hover:text-rose-400'
                    }`}
                  >
                    SKIPPED
                  </button>
                </div>

                {/* Edit & Delete for any task */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditTask(task)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition"
                    title="Edit Task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Discipline Records History */}
      {history.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <h3 className="text-xs font-military font-bold text-slate-200 tracking-wider">
            RECENT DISCIPLINE AUDIT LOGS
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.slice(0, 6).map((rec) => (
              <div key={rec.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono-code">
                  <span className="text-slate-300 font-bold">{rec.date}</span>
                  <span
                    className={`font-bold ${
                      rec.disciplineScore >= 80
                        ? 'text-emerald-400'
                        : rec.disciplineScore >= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {rec.disciplineScore} / 100
                  </span>
                </div>
                <div className="text-[11px] font-mono-code text-slate-400">
                  Tasks: {rec.tasksCompleted}/{rec.totalTasks} • Rules: {rec.rulesFollowedCount}/{rec.totalRulesActive}
                </div>
                {rec.tomorrowFocus && (
                  <p className="text-[10px] font-mono-code text-slate-400 bg-slate-900 p-1.5 rounded border border-slate-800/80">
                    Focus: {rec.tomorrowFocus}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Custom Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-military font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{editingTaskId ? 'EDIT CUSTOM TASK' : 'CREATE CUSTOM TASK'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomTask} className="space-y-3">
              <div>
                <label className="text-xs font-mono-code text-slate-400 block mb-1">
                  Task Title / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Backtest 20 SBT Model 1 trades"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 font-mono-code"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-mono-code text-slate-400 block mb-1">Category</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 font-mono-code"
                  >
                    <option value="CUSTOM">Custom Habit</option>
                    <option value="PRE_MARKET">Pre-Market Prep</option>
                    <option value="RISK">Risk Management</option>
                    <option value="PSYCHOLOGY">Psychology</option>
                    <option value="EXECUTION">Execution</option>
                    <option value="BACKTEST">Backtesting</option>
                    <option value="REVIEW">Review</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono-code text-slate-400 block mb-1">Recurrence</label>
                  <select
                    value={recurrenceType}
                    onChange={(e) => setRecurrenceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-400 font-mono-code"
                  >
                    <option value="DAILY">Daily Habit</option>
                    <option value="WEEKLY">Weekly Habit</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recurring-checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                />
                <label htmlFor="recurring-checkbox" className="text-xs font-mono-code text-slate-300">
                  Repeat automatically every day
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-military font-bold tracking-wider"
                >
                  {editingTaskId ? 'UPDATE TASK' : 'SAVE TASK'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
