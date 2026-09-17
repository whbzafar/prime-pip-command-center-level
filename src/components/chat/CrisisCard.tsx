import React from 'react';
import { CrisisCardPayload } from './types';
import { HeartHandshake, PhoneCall, ShieldAlert, LogOut } from 'lucide-react';

interface CrisisCardProps {
  payload: CrisisCardPayload;
}

export const CrisisCard: React.FC<CrisisCardProps> = ({ payload }) => {
  return (
    <div className="mt-3 p-5 rounded-2xl bg-gradient-to-br from-rose-950/80 via-slate-950 to-indigo-950/70 border border-rose-500/50 shadow-2xl space-y-4 max-w-xl text-left">
      <div className="flex items-center gap-3 border-b border-rose-900/50 pb-3">
        <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40">
          <HeartHandshake className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-military font-bold text-rose-100 uppercase tracking-wider">
            {payload.title}
          </h4>
          <span className="text-[10px] font-mono-code text-rose-300">
            Confidential Human Support & Immediate Care
          </span>
        </div>
      </div>

      <p className="text-xs font-mono-code text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-rose-900/40">
        {payload.compassionateMessage}
      </p>

      <div className="space-y-2">
        <span className="text-[11px] font-military font-bold text-slate-300 uppercase tracking-wider block">
          Free, 24/7 Confidential Helplines:
        </span>
        {payload.helplines.map((line, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-xs font-mono-code space-y-1"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-300">{line.name}</span>
              <span className="flex items-center gap-1 text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                <PhoneCall className="w-3 h-3" />
                {line.contact}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">{line.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-xs font-mono-code text-rose-200">
        <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
        <span>{payload.recommendedAction}</span>
      </div>
    </div>
  );
};
