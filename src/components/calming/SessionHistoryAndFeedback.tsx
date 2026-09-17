import React, { useState, useEffect } from 'react';
import {
  History,
  Star,
  Check,
  RotateCcw,
  Sparkles,
  Heart,
  Smile,
  Meh,
  Frown,
  Coffee,
} from 'lucide-react';
import { CalmingHistoryEntry } from './types';

interface SessionHistoryAndFeedbackProps {
  userId?: string;
  onSaveFeedback?: (entry: CalmingHistoryEntry) => void;
}

export const SessionHistoryAndFeedback: React.FC<SessionHistoryAndFeedbackProps> = ({
  userId = 'default',
  onSaveFeedback,
}) => {
  const [history, setHistory] = useState<CalmingHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`primepipfx_calm_history_${userId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Seed sample initial records if empty
    return [
      {
        id: 'HIST_1',
        userId,
        sessionType: 'BREATHING',
        sessionTitle: 'Box Breathing (4-4-4-4)',
        durationMinutes: 4,
        completedAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
        completed: true,
        userRating: 5,
        feedbackStatus: 'CALMER',
      },
      {
        id: 'HIST_2',
        userId,
        sessionType: 'PURE_SYNTHESIS',
        sessionTitle: '432Hz Harmonic Solfeggio',
        durationMinutes: 10,
        completedAt: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
        completed: true,
        userRating: 5,
        feedbackStatus: 'FOCUSED',
      },
    ];
  });

  const [activeFeedbackModal, setActiveFeedbackModal] = useState<CalmingHistoryEntry | null>(null);

  const handleUpdateFeedback = (
    entryId: string,
    status: 'BETTER' | 'CALMER' | 'FOCUSED' | 'NEUTRAL' | 'STILL_TIRED' | 'PREFER_ANOTHER',
    rating: number
  ) => {
    const updated = history.map((h) => {
      if (h.id === entryId) {
        return { ...h, feedbackStatus: status, userRating: rating };
      }
      return h;
    });
    setHistory(updated);
    try {
      localStorage.setItem(`primepipfx_calm_history_${userId}`, JSON.stringify(updated));
    } catch {}
    setActiveFeedbackModal(null);
  };

  return (
    <div className="prime-glass-card rounded-3xl p-6 sm:p-10 border border-white/[0.08] space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <History className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
              SESSION LOG & USER REFLECTIONS
            </h3>
            <p className="text-xs font-mono-code text-slate-400">
              Non-medical post-session tracking • Isolated to your authenticated profile
            </p>
          </div>
        </div>

        <span className="text-xs font-mono-code px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-400 font-bold">
          {history.length} SESSIONS RECORDED
        </span>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between flex-wrap gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 font-bold text-xs">
                ✓
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-military font-bold text-slate-200">
                  {item.sessionTitle}
                </h4>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono-code text-slate-400">
                  <span>{item.durationMinutes} minutes</span>
                  <span>•</span>
                  <span>{new Date(item.completedAt).toLocaleDateString()}</span>
                  {item.feedbackStatus && (
                    <>
                      <span>•</span>
                      <span className="text-teal-400 font-bold">Feeling: {item.feedbackStatus}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center text-cyan-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < (item.userRating || 5) ? 'fill-cyan-400 text-cyan-400' : 'text-slate-700'
                    }`}
                  />
                ))}
              </div>

              {!item.feedbackStatus && (
                <button
                  type="button"
                  onClick={() => setActiveFeedbackModal(item)}
                  className="px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-military font-bold hover:bg-teal-500/30 transition"
                >
                  HOW DO YOU FEEL?
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Post-Session Feedback Modal */}
      {activeFeedbackModal && (
        <div className="p-5 rounded-2xl bg-slate-950 border border-teal-500/40 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-military font-bold text-teal-300 uppercase tracking-wider">
              HOW DO YOU FEEL AFTER THIS SESSION?
            </h4>
            <button
              type="button"
              onClick={() => setActiveFeedbackModal(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Skip
            </button>
          </div>

          <p className="text-xs font-mono-code text-slate-400">
            Select how your mental state has shifted (non-medical self-assessment):
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'CALMER', label: 'Calmer', icon: Heart },
              { id: 'FOCUSED', label: 'Focused', icon: Sparkles },
              { id: 'BETTER', label: 'Better', icon: Smile },
              { id: 'NEUTRAL', label: 'Neutral', icon: Meh },
              { id: 'STILL_TIRED', label: 'Still Tired', icon: Coffee },
              { id: 'PREFER_ANOTHER', label: 'Need Another Session', icon: RotateCcw },
            ].map((st) => {
              const Icon = st.icon;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => handleUpdateFeedback(activeFeedbackModal.id, st.id as any, 5)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:border-teal-400 hover:text-teal-300 transition text-left flex items-center gap-2 cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-teal-400 shrink-0" />
                  <span className="text-xs font-military font-bold">{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
