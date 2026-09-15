import React, { useState } from 'react';
import {
  Target,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Trophy,
  Flame,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { TradingGoal, Trade } from '../types';

interface GoalsProgressProps {
  goals: TradingGoal[];
  onToggleGoal: (id: string) => void;
  onAddGoal: (title: string, target: number, unit: string) => void;
  onDeleteGoal: (id: string) => void;
  trades: Trade[];
}

export const GoalsProgress: React.FC<GoalsProgressProps> = ({
  goals,
  onToggleGoal,
  onAddGoal,
  onDeleteGoal,
  trades,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState<number>(20);
  const [newUnit, setNewUnit] = useState('trades');
  const [weeklyNotes, setWeeklyNotes] = useState(
    'Weekly debrief: Maintained 1:2.8 avg R on London XAUUSD sessions. Reined in post-loss tilt. Focus for next week: Strict no-trade protocol after 2 PM EST.'
  );

  const completedCount = goals.filter((g) => g.isCompleted).length;
  const overallGoalProgress = Math.round((completedCount / (goals.length || 1)) * 100);

  return (
    <div className="space-y-6">
      {/* Process Goals Spotlight Banner */}
      <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono-code uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  DISCIPLINE ENGINE
                </span>
              </div>
              <h2 className="text-lg font-military font-bold text-slate-100 tracking-wide mt-1">
                PROCESS OVER OUTCOME: PROFESSIONAL GOALS
              </h2>
              <p className="text-xs text-slate-300 font-sans mt-0.5">
                "A professional trader needs process goals, not just money." Consistency is forged through routine.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl text-center font-mono-code">
              <span className="text-[10px] text-slate-400 block uppercase">Milestones Mastered</span>
              <span className="text-lg font-bold text-emerald-400">
                {completedCount} / {goals.length} ({overallGoalProgress}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((goal) => {
          const progressPercent = Math.min(100, Math.round((goal.current / goal.target) * 100));

          return (
            <div
              key={goal.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition shadow-lg ${
                goal.isCompleted
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-100">{goal.title}</span>
                  <button
                    onClick={() => onDeleteGoal(goal.id)}
                    className="text-slate-600 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 font-mono-code text-xs mt-3">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Progress:</span>
                    <span
                      className={`font-bold ${
                        goal.isCompleted ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {goal.current} / {goal.target} {goal.unit} ({progressPercent}%)
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.isCompleted ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono-code text-slate-400 uppercase">
                  {goal.category}
                </span>

                <button
                  onClick={() => onToggleGoal(goal.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-military font-bold tracking-wider transition ${
                    goal.isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{goal.isCompleted ? 'COMPLETED' : 'MARK COMPLETE'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Goal & Weekly Review Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Goal Form */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <Plus className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-military font-bold tracking-wider text-slate-200">
                ENLIST NEW PROCESS DISCIPLINE GOAL
              </h4>
            </div>

            <div className="space-y-3 font-mono-code text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Process Goal Title</label>
                <input
                  type="text"
                  placeholder="e.g. 'Never trade after 2 consecutive stop-outs'"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Target Quantity</label>
                  <input
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (newTitle.trim()) {
                onAddGoal(newTitle.trim(), newTarget, newUnit);
                setNewTitle('');
              }
            }}
            className="mt-4 w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold text-xs tracking-wider transition"
          >
            COMMIT TO PROCESS GOAL
          </button>
        </div>

        {/* Weekly Debrief & Performance Reflection */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-military font-bold tracking-wider text-slate-200">
                  WEEKLY COMMAND DEBRIEF & REVIEW
                </h4>
              </div>
              <span className="text-[10px] font-mono-code text-slate-400">SATURDAY AUDIT</span>
            </div>

            <textarea
              rows={5}
              value={weeklyNotes}
              onChange={(e) => setWeeklyNotes(e.target.value)}
              className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-xs text-slate-200 outline-none focus:border-amber-400 leading-relaxed"
            />
          </div>

          <div className="mt-3 text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
            <span>WEEKLY REVIEW COMPLIANCE: 100% (4/4 WEEKS)</span>
            <span className="text-emerald-400 font-bold">SAVED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
