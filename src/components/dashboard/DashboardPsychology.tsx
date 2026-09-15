import React from 'react';
import {
  Brain,
  Wind,
  ShieldCheck,
  AlertTriangle,
  Smile,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Trade } from '../../types';

interface DashboardPsychologyProps {
  trades: Trade[];
  onNavigateToTab: (tab: string) => void;
}

export const DashboardPsychology: React.FC<DashboardPsychologyProps> = ({
  trades,
  onNavigateToTab,
}) => {
  // Discipline calculation
  const cleanTrades = trades.filter((t) => !t.ruleViolation || t.ruleViolation === 'NONE');
  const disciplineScore = trades.length > 0 ? Math.round((cleanTrades.length / trades.length) * 100) : 100;

  // Emotional states breakdown from actual trades
  const emotionCounts: Record<string, number> = {};
  trades.forEach((t) => {
    if (t.preEmotion) {
      emotionCounts[t.preEmotion] = (emotionCounts[t.preEmotion] || 0) + 1;
    }
  });

  const emotionList = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
  const primaryEmotion = emotionList.length > 0 ? emotionList[0][0] : null;

  // Emotional friction alert
  const hasNegativeEmotions = trades.slice(-3).some((t) => 
    t.preEmotion === 'FEARFUL' ||
    t.preEmotion === 'ANGRY' ||
    t.preEmotion === 'GREEDY' ||
    t.preEmotion === 'STRESSED'
  );

  return (
    <div className="rounded-2xl bg-[#090D16] border border-slate-800/80 p-5 shadow-xl flex flex-col justify-between space-y-4">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase">
              PSYCHOLOGY & DISCIPLINE
            </h3>
          </div>
          <span
            className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded border uppercase ${
              disciplineScore >= 90
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : disciplineScore >= 75
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            DISCIPLINE: {disciplineScore}%
          </span>
        </div>

        {trades.length === 0 ? (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center font-mono-code space-y-2">
            <div className="text-amber-400 font-bold text-xs">NO TRADES RECORDED YET</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Not enough data yet. Log your trades and select pre-trade emotional states in your Trade Journal to unlock psychological profiling.
            </p>
          </div>
        ) : (
          <div className="mt-3.5 space-y-3 font-mono-code text-xs">
            {/* Rule Adherence Bar */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400 text-[10px] uppercase">RULE ADHERENCE PROTOCOL</span>
                <span className="font-bold text-slate-200">
                  {cleanTrades.length} / {trades.length} clean trades
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    disciplineScore >= 85
                      ? 'bg-emerald-400'
                      : disciplineScore >= 70
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                  }`}
                  style={{ width: `${disciplineScore}%` }}
                />
              </div>
            </div>

            {/* Emotional Profile Chips */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 text-[10px] block uppercase mb-2">
                DOMINANT PRE-TRADE EMOTIONS
              </span>
              {emotionList.length === 0 ? (
                <span className="text-slate-500 text-[11px]">No emotion tags logged yet</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {emotionList.slice(0, 4).map(([emo, count]) => (
                    <span
                      key={emo}
                      className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-bold"
                    >
                      {emo}: {count} ({Math.round((count / trades.length) * 100)}%)
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Friction Warning or Clean State */}
            {hasNegativeEmotions && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Emotional friction detected in recent executions. Take a reset before entering a new setup.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Shortcuts */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigateToTab('PSYCHOLOGY')}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 text-purple-300 text-xs font-military font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Brain className="w-3.5 h-3.5" />
          <span>PSYCHOLOGY CENTER</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateToTab('CALMING_TOOLS')}
          className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-500/40 text-teal-300 text-xs font-military font-bold tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Wind className="w-3.5 h-3.5" />
          <span>CALMING SUITE</span>
        </button>
      </div>
    </div>
  );
};
