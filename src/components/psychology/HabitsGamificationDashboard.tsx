import React, { useMemo } from 'react';
import {
  Award,
  Flame,
  CheckCircle2,
  TrendingUp,
  Brain,
  ShieldCheck,
  Calendar,
  Sparkles,
  HelpCircle,
  Clock,
} from 'lucide-react';
import {
  HabitProgressState,
  SessionResultLog,
  CATEGORY_LIST,
} from './psychologyData';

interface HabitsGamificationDashboardProps {
  habitProgress: HabitProgressState;
  resultLogs: SessionResultLog[];
}

export const HabitsGamificationDashboard: React.FC<HabitsGamificationDashboardProps> = ({
  habitProgress,
  resultLogs,
}) => {
  // Compute regulation effectiveness by category / emotion
  const regulationStats = useMemo(() => {
    const stats: Record<string, { count: number; totalDelta: number; name: string }> = {};

    resultLogs.forEach((log) => {
      const cat = CATEGORY_LIST.find((c) => c.id === log.categoryId);
      const name = cat ? cat.name : log.categoryId;
      const delta = Math.max(0, log.initialIntensity - log.shiftedIntensity);

      if (!stats[log.categoryId]) {
        stats[log.categoryId] = { count: 0, totalDelta: 0, name };
      }
      stats[log.categoryId].count += 1;
      stats[log.categoryId].totalDelta += delta;
    });

    return Object.entries(stats).map(([categoryId, data]) => ({
      categoryId,
      name: data.name,
      count: data.count,
      avgDelta: parseFloat((data.totalDelta / data.count).toFixed(1)),
    })).sort((a, b) => b.avgDelta - a.avgDelta);
  }, [resultLogs]);

  // Determine Tier Level
  const points = habitProgress.totalHabitPoints;
  const tiers = [
    { title: 'Apprentice of Composure', minPoints: 0, maxPoints: 100 },
    { title: 'Disciplined Operator', minPoints: 100, maxPoints: 300 },
    { title: 'Mindful Risk Manager', minPoints: 300, maxPoints: 600 },
    { title: 'Institutional Stoic', minPoints: 600, maxPoints: 1000 },
    { title: 'Sovereign Market Mind', minPoints: 1000, maxPoints: 9999 },
  ];

  const currentTier = tiers.find((t) => points >= t.minPoints && points < t.maxPoints) || tiers[0];
  const nextTier = tiers[tiers.indexOf(currentTier) + 1] || currentTier;
  const tierProgress = Math.min(
    100,
    Math.round(((points - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints || 1)) * 100)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Notice Banner */}
      <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
              PROCESS-ONLY GAMIFICATION ARCHITECTURE
            </h4>
            <p className="text-[11px] font-mono-code text-slate-400">
              PRIMEPIPFX exclusively rewards healthy emotional regulation, stop-loss adherence, and pre-trade composure — never trading volume or reckless turnover.
            </p>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Healthy Habit Streak */}
        <div className="p-5 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-military font-bold text-cyan-400 uppercase tracking-wider">
              HEALTHY PROCESS STREAK
            </span>
            <Flame className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
          </div>
          <div className="text-3xl font-military font-black text-slate-100">
            {habitProgress.currentStreakDays} <span className="text-sm font-mono-code font-normal text-slate-400">Days</span>
          </div>
          <p className="text-[11px] font-mono-code text-slate-400">
            Consecutive daily composure check-ins completed
          </p>
        </div>

        {/* Total Process Habit Points */}
        <div className="p-5 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-military font-bold text-teal-400 uppercase tracking-wider">
              TOTAL HABIT POINTS
            </span>
            <Sparkles className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-military font-black text-teal-400">
            {habitProgress.totalHabitPoints} <span className="text-sm font-mono-code font-normal text-slate-400">pts</span>
          </div>
          <p className="text-[11px] font-mono-code text-slate-400">
            Earned through active defusion & regulation protocols
          </p>
        </div>

        {/* Current Composure Tier */}
        <div className="p-5 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-military font-bold text-indigo-400 uppercase tracking-wider">
              COMPOSURE TIER
            </span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-base font-military font-black text-indigo-200 truncate">
            {currentTier.title}
          </div>
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${tierProgress}%` }} />
            </div>
            <div className="text-[9px] font-mono-code text-slate-500 text-right">
              {tierProgress}% to {nextTier.title}
            </div>
          </div>
        </div>

        {/* Sessions Completed */}
        <div className="p-5 rounded-2xl bg-[#0b101e] border border-indigo-900/40 space-y-2 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-military font-bold text-emerald-400 uppercase tracking-wider">
              COMPLETED SESSIONS
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-military font-black text-slate-100">
            {resultLogs.length} <span className="text-sm font-mono-code font-normal text-slate-400">Total</span>
          </div>
          <p className="text-[11px] font-mono-code text-slate-400">
            Documented somatic & cognitive shifts
          </p>
        </div>
      </div>

      {/* Regulation Effectiveness by State */}
      <div className="p-6 rounded-3xl bg-[#0b101e] border border-indigo-900/40 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
          <div>
            <span className="text-[10px] font-mono-code font-bold uppercase tracking-widest text-teal-400">
              EMPIRICAL SHIFT ANALYSIS
            </span>
            <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider mt-0.5">
              Which Emotional States You Regulate Best
            </h4>
          </div>
          <span className="text-xs font-mono-code text-slate-400">
            Average down-regulation points per category
          </span>
        </div>

        {regulationStats.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono-code text-slate-500">
            Complete interactive regulation sessions across categories to view which emotions you regulate with greatest ease.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {regulationStats.map((item, idx) => (
              <div
                key={item.categoryId}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-military font-bold text-slate-200 uppercase">
                    #{idx + 1} {item.name}
                  </span>
                  <span className="text-xs font-mono-code text-emerald-400 font-bold">
                    - {item.avgDelta} Intensity
                  </span>
                </div>
                <div className="text-[10px] font-mono-code text-slate-500">
                  {item.count} sessions completed • Consistently neutralized
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Completed Result Logs Feed */}
      <div className="p-6 rounded-3xl bg-[#0b101e] border border-indigo-900/40 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-indigo-900/30 pb-3">
          <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
            Recent Interactive Session Audits
          </h4>
          <span className="text-xs font-mono-code text-slate-400">
            {resultLogs.length} Total Saved Records
          </span>
        </div>

        {resultLogs.length === 0 ? (
          <div className="text-center py-8 text-xs font-mono-code text-slate-500">
            No regulation sessions saved yet. Start with any of the 17 category protocols.
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {resultLogs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-indigo-950 space-y-2 text-xs font-mono-code"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{log.sessionTitle}</span>
                  <span className="text-[10px] text-slate-500">{log.dateStr} at {log.timeStr}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                  <span>Trigger: <strong className="text-slate-300">{log.triggerIdentified}</strong></span>
                  <span>Shift: <strong className="text-cyan-400">{log.initialIntensity}</strong> → <strong className="text-emerald-400">{log.shiftedIntensity}</strong></span>
                  <span className="text-teal-400 font-bold">+{log.habitPointsEarned} Habit Pts</span>
                </div>
                {log.decisionRuleText && (
                  <div className="text-[11px] p-2 rounded bg-indigo-950/40 border border-indigo-900/40 text-indigo-200">
                    Pledged: "{log.decisionRuleText}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
