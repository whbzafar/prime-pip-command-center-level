import React from 'react';
import { FundamentalExplanation } from '../../types';
import { Lightbulb, AlertTriangle, Calendar, ChevronRight } from 'lucide-react';

export interface ExplanationCardProps {
  explanation: FundamentalExplanation;
  assetName: string;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({ explanation, assetName }) => {
  return (
    <div className="bg-[#0D1424] border border-[#1B2742] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* 1. Why is this Bullish/Bearish? */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Lightbulb className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-bold text-white tracking-tight">
            Fundamental Thesis: Why is {assetName} biased here?
          </h4>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
          {explanation.summary}
        </p>
      </div>

      {/* 2. What would change this view (Invalidation Triggers) */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-sm font-bold text-white tracking-tight">
            Invalidation Scenarios (What would flip this bias?)
          </h4>
        </div>
        <ul className="space-y-2">
          {explanation.invalidation.map((trigger, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 text-xs text-slate-300 font-sans p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
              <span className="leading-relaxed">{trigger}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. Upcoming Catalyst Events */}
      {explanation.upcomingEvents && explanation.upcomingEvents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-bold text-white tracking-tight">
              Upcoming High-Impact Catalysts
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {explanation.upcomingEvents.map((event, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-200 block truncate">{event.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(event.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                    event.impact === 'High'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}
                >
                  {event.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
