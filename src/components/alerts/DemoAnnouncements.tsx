/**
 * Demo-mode announcements: only the live Pakistan market news is available. Everything else
 * (fundamentals, picks, level alerts, owner announcements) is part of the subscription.
 */
import React, { useState } from 'react';
import { Lock, Megaphone, X } from 'lucide-react';
import { NewsHub } from './NewsHub';
import { PRICE_STANDARD, PRICE_WITH_CODE } from '../../config/pricing';

export const DemoAnnouncements: React.FC<{ onOpenSubscription?: () => void }> = ({ onOpenSubscription }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} title="Announcements (demo: live news)" aria-label="Announcements"
        className="relative p-2 rounded-xl bg-slate-950/90 border border-slate-700 hover:border-violet-400 cursor-pointer">
        <Megaphone className="w-4 h-4 text-violet-300" />
      </button>
      {open && (
        <div className="fixed top-[calc(env(safe-area-inset-top,0px)+3.5rem)] right-3 z-[85] w-[min(420px,calc(100vw-1.5rem))] max-h-[min(calc(100dvh-env(safe-area-inset-top,0px)-9rem),680px)] flex flex-col rounded-2xl border border-slate-700 bg-[#0b0f17] shadow-2xl">
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-800">
            <Megaphone className="w-4 h-4 text-violet-300" />
            <span className="text-[13px] font-bold text-slate-50">Announcements</span>
            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded border border-amber-400/40 text-amber-200">Demo · News</span>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            <NewsHub />
            <button type="button" onClick={() => { setOpen(false); onOpenSubscription?.(); }}
              className="w-full flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-left text-[11px] text-amber-100 hover:bg-amber-500/20 cursor-pointer">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>Long-term fundamentals, stock picks, level alerts and owner announcements unlock with the subscription — ${PRICE_STANDARD} (${PRICE_WITH_CODE} with a code).</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
