import React from 'react';
import { CalendarCardPayload } from './types';
import { Calendar, AlertCircle, Clock } from 'lucide-react';

interface CalendarCardProps {
  payload: CalendarCardPayload;
}

export const CalendarCard: React.FC<CalendarCardProps> = ({ payload }) => {
  return (
    <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-[#0c1322] via-[#090f1d] to-[#060a14] border border-amber-500/30 shadow-xl space-y-3.5 max-w-xl text-left">
      <div className="flex items-center justify-between border-b border-amber-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
              {payload.title}
            </div>
            <div className="text-[10px] font-mono-code text-slate-400">
              Live Macro Data Wire
            </div>
          </div>
        </div>

        {payload.currencyFilter && (
          <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono-code font-bold">
            {payload.currencyFilter}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {payload.events.map((evt) => (
          <div
            key={evt.id}
            className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono-code"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">
                  {evt.currency}
                </span>
                <span className="font-bold text-slate-200 truncate">{evt.eventName}</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-teal-400" />
                <span>{evt.timePkt} (PKT)</span>
                <span>•</span>
                <span>{evt.timeUtc} (UTC)</span>
              </div>
            </div>

            <span
              className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-military font-bold uppercase border ${
                evt.importance === 'HIGH'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : evt.importance === 'MEDIUM'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}
            >
              {evt.importance}
            </span>
          </div>
        ))}
      </div>

      <div className="text-[10px] font-mono-code text-slate-400 flex items-center gap-1.5 pt-1">
        <AlertCircle className="w-3 h-3 text-amber-400" />
        <span>SBT Rule: Avoid placing market entries within 15 minutes of High-Impact red-folder releases.</span>
      </div>
    </div>
  );
};
