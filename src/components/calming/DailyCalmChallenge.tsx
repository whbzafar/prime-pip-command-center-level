import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Play, Calendar, ShieldCheck } from 'lucide-react';
import { CalmingSuiteTab } from './types';

interface ChallengeDay {
  day: number;
  title: string;
  duration: string;
  desc: string;
  targetTab: CalmingSuiteTab;
}

const CHALLENGE_DAYS: ChallengeDay[] = [
  { day: 1, title: 'Day 1: Gentle Breath Pacing', duration: '2 min', desc: 'Box breathing cadence to establish baseline calmness', targetTab: 'BREATHING' },
  { day: 2, title: 'Day 2: Ambient Soundscape Immersion', duration: '3 min', desc: 'Listen to rain & brown noise to clear cognitive fog', targetTab: 'AMBIENT_MIXER' },
  { day: 3, title: 'Day 3: Centered Focus Interval', duration: '5 min', desc: 'Minimalist focus sanctuary before chart review', targetTab: 'FOCUS_MODE' },
  { day: 4, title: 'Day 4: Mindful Calm Game', duration: '4 min', desc: 'Serene flow path tracking to ground motor impulses', targetTab: 'CALM_GAMES' },
  { day: 5, title: 'Day 5: 6-Step Mind Reset', duration: '5 min', desc: 'Pause, breathe, listen, relax, reflect, return', targetTab: 'MIND_RESET' },
  { day: 6, title: 'Day 6: Procedural Relaxation Music', duration: '5 min', desc: 'Harmonic Lydian pads for decompression', targetTab: 'RELAXATION_MUSIC' },
  { day: 7, title: 'Day 7: Full Discipline Reset', duration: '6 min', desc: 'Integrate pre-trade grounding with breathing', targetTab: 'RESET_SESSIONS' },
];

interface DailyCalmChallengeProps {
  onSelectTab: (tab: CalmingSuiteTab) => void;
  userId?: string;
}

export const DailyCalmChallenge: React.FC<DailyCalmChallengeProps> = ({ onSelectTab, userId = 'default' }) => {
  const [completedDays, setCompletedDays] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(`primepipfx_calm_challenge_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleDayComplete = (day: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = completedDays.includes(day)
      ? completedDays.filter((d) => d !== day)
      : [...completedDays, day];
    setCompletedDays(updated);
    try {
      localStorage.setItem(`primepipfx_calm_challenge_${userId}`, JSON.stringify(updated));
    } catch {}
  };

  return (
    <div className="prime-glass-card rounded-3xl p-6 sm:p-10 border border-teal-500/20 space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
              7-DAY DAILY CALM JOURNEY
            </h3>
            <p className="text-xs font-mono-code text-slate-400">
              Gentle self-paced progression • No streak pressure • Zero punishment for breaks
            </p>
          </div>
        </div>

        <span className="text-xs font-mono-code px-2.5 py-1 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-bold">
          {completedDays.length} / 7 DAYS COMPLETED
        </span>
      </div>

      <div className="space-y-2.5">
        {CHALLENGE_DAYS.map((ch) => {
          const isDone = completedDays.includes(ch.day);
          return (
            <div
              key={ch.day}
              onClick={() => onSelectTab(ch.targetTab)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                isDone
                  ? 'bg-slate-950/90 border-teal-500/40 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={(e) => toggleDayComplete(ch.day, e)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition shrink-0 ${
                    isDone
                      ? 'bg-teal-500 text-slate-950 font-bold'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-teal-300'
                  }`}
                  title={isDone ? 'Mark uncompleted' : 'Mark completed'}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-military font-bold text-slate-100 truncate">
                      {ch.title}
                    </span>
                    <span className="text-[10px] font-mono-code px-1.5 py-0.2 rounded bg-slate-800 text-teal-400">
                      {ch.duration}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono-code text-slate-400 truncate mt-0.5">
                    {ch.desc}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectTab(ch.targetTab)}
                className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[11px] font-military font-bold hover:bg-teal-400 hover:text-slate-950 transition shrink-0 flex items-center gap-1"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>START</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
