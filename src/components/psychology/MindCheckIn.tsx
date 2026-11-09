/**
 * Entrance of the Psychological Center: a warm welcome, "How do you feel right now?" check-in
 * that routes to the right category, a "Calm in 60 seconds" reset (cyclic sighing), and a small
 * history of how much each guided session lowered the feeling.
 */
import React, { useMemo, useState } from 'react';
import { HeartHandshake, Wind } from 'lucide-react';
import type { PsychCategoryType } from './psychologyData';
import { CHECK_IN, MIND_GUIDE } from './mindGuide';
import { GuidedSessionPlayer, readMindLog } from './GuidedSessionPlayer';

const CALM60 = [
  { title: 'Settle', seconds: 10, kind: 'notice' as const, text: 'Sit back. Drop your shoulders. Unclench your jaw. Hands off the mouse.' },
  { title: 'Cyclic sighing', seconds: 45, kind: 'breathe' as const, breath: 'sigh' as const, text: 'In through the nose, a second short top-up breath, then a long slow exhale through the mouth. The long exhale tells your heart to slow down.' },
  { title: 'Come back', seconds: 10, kind: 'plan' as const, text: 'Notice your feet on the floor. Ask: "What is the next right action — not the most exciting one?"' },
];

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: 'numeric', hour12: false }).format(new Date()));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export const MindCheckIn: React.FC<{ onOpenCategory: (id: PsychCategoryType) => void; userName?: string }> = ({ onOpenCategory, userName }) => {
  const [calm, setCalm] = useState(false);
  const [session, setSession] = useState<PsychCategoryType | null>(null);
  const log = useMemo(() => readMindLog(), [calm, session]);
  const avgDrop = log.length ? log.slice(0, 20).reduce((a, l) => a + (l.before - l.after), 0) / Math.min(20, log.length) : 0;

  return (
    <section className="rounded-3xl p-[1px] bg-gradient-to-br from-teal-400/40 via-indigo-500/30 to-violet-500/40">
      <div className="rounded-[23px] bg-[radial-gradient(ellipse_at_top,rgba(45,212,191,0.10),transparent_60%)] bg-[#060a14] p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-teal-300"><HeartHandshake className="w-4 h-4" />Your calm space</div>
            <h2 className="mt-1 text-[22px] sm:text-[26px] font-bold text-slate-50">{greeting()}{userName ? `, ${userName.split(' ')[0]}` : ''}. How do you feel right now?</h2>
            <p className="mt-1 text-[13px] text-slate-400">Tap what fits — you’ll get a simple explanation, a 60-second action and a guided session made for exactly that feeling.</p>
          </div>
          <div className="flex flex-col items-stretch gap-2 shrink-0">
            <button type="button" onClick={() => setCalm(true)} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-400 to-cyan-500 text-slate-950 font-bold text-[14px] shadow-[0_0_30px_rgba(45,212,191,0.35)] cursor-pointer"><Wind className="w-5 h-5" />Calm in 60 seconds</button>
            {log.length > 0 && <div className="text-[11px] text-slate-400 text-center">{log.length} session{log.length > 1 ? 's' : ''} done · average drop {avgDrop.toFixed(1)} points</div>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {CHECK_IN.map((c) => (
            <div key={c.id} role="button" tabIndex={0} onClick={() => onOpenCategory(c.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpenCategory(c.id); }}
              className="group text-left rounded-2xl border border-slate-800 bg-slate-950/60 hover:border-teal-400/60 hover:bg-teal-500/[0.06] px-3 py-2.5 transition cursor-pointer">
              <div className="text-[20px] leading-none">{c.emoji}</div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-slate-100 leading-snug">{c.label}</div>
              <div className="mt-1 text-[10.5px] text-slate-500 group-hover:text-teal-300 flex items-center gap-1">
                <span>Open guide</span>
                <span className="opacity-0 group-hover:opacity-100 transition">→</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setSession(c.id); }} className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-teal-400/60 cursor-pointer">Session</button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[10.5px] text-slate-500">If you ever feel unsafe or your mood stays low for weeks, please talk to someone you trust or a qualified professional. This space is for trading performance and everyday stress.</p>
      </div>
      {calm && <GuidedSessionPlayer category="CALM_60" title="Calm in 60 seconds" steps={CALM60 as any} onClose={() => setCalm(false)} />}
      {session && <GuidedSessionPlayer category={session} title={MIND_GUIDE[session].session.title} steps={MIND_GUIDE[session].session.steps} onClose={() => setSession(null)} />}
    </section>
  );
};

export default MindCheckIn;
