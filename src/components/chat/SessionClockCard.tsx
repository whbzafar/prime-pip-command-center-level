import React from 'react';
import { SessionClockCardPayload } from './types';
import { Clock, Globe, Zap } from 'lucide-react';

interface SessionClockCardProps {
  payload: SessionClockCardPayload;
}

export const SessionClockCard: React.FC<SessionClockCardProps> = ({ payload }) => {
  return (
    <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-[#0c1322] via-[#090f1d] to-[#060a14] border border-cyan-500/30 shadow-xl space-y-3.5 max-w-xl text-left">
      <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
              {payload.title}
            </div>
            <div className="text-[10px] font-mono-code text-cyan-300">
              {payload.currentTimePkt} | {payload.currentTimeUtc}
            </div>
          </div>
        </div>

        {payload.isOverlapActive && (
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-military font-bold uppercase animate-pulse">
            OVERLAP ACTIVE
          </span>
        )}
      </div>

      {payload.overlapName && (
        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs font-mono-code text-emerald-200 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{payload.overlapName}</span>
        </div>
      )}

      {/* Grid of sessions */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono-code">
        {payload.sessions.map((sess) => (
          <div
            key={sess.name}
            className={`p-2.5 rounded-xl border flex items-center justify-between ${
              sess.status === 'OPEN'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div>
              <div className="font-bold flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sess.status === 'OPEN' ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'
                  }`}
                />
                <span>{sess.name}</span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">{sess.opensPkt}</div>
            </div>

            <span
              className={`text-[9px] font-military font-bold px-1.5 py-0.5 rounded border uppercase ${
                sess.status === 'OPEN'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {sess.status}
            </span>
          </div>
        ))}
      </div>

      <div className="text-[10px] font-mono-code text-slate-400 flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-cyan-400" />
        <span>{payload.nextEventDescription}</span>
      </div>
    </div>
  );
};
