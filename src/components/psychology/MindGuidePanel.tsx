/**
 * MIND GUIDE panel shown at the top of every category: understand → act now → plan → build,
 * with a depth switch (Simple · Trader · Expert) and a one-tap guided session.
 */
import React, { useState } from 'react';
import { BookOpen, Brain, GraduationCap, HeartPulse, Lightbulb, ListChecks, MessageCircle, PlayCircle, Sparkles, Sprout, Zap } from 'lucide-react';
import type { PsychCategoryType } from './psychologyData';
import { MIND_GUIDE } from './mindGuide';
import { GuidedSessionPlayer } from './GuidedSessionPlayer';

type Depth = 'SIMPLE' | 'TRADER' | 'EXPERT';

const Card: React.FC<{ icon: React.ReactNode; title: string; tone?: string; children: React.ReactNode }> = ({ icon, title, tone = 'border-slate-800 bg-slate-950/60', children }) => (
  <div className={`rounded-2xl border p-4 ${tone}`}>
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">{icon}{title}</div>
    <div className="mt-2.5">{children}</div>
  </div>
);
const List: React.FC<{ items: string[]; dot?: string }> = ({ items, dot = 'text-cyan-400' }) => (
  <ul className="space-y-1.5">{items.map((t) => <li key={t} className="flex gap-2 text-[13.5px] leading-relaxed text-slate-200"><span className={`${dot} mt-0.5`}>•</span><span>{t}</span></li>)}</ul>
);

export const MindGuidePanel: React.FC<{ categoryId: PsychCategoryType; categoryName: string }> = ({ categoryId, categoryName }) => {
  const g = MIND_GUIDE[categoryId];
  const [depth, setDepth] = useState<Depth>('SIMPLE');
  const [playing, setPlaying] = useState(false);
  if (!g) return null;

  return (
    <section className="space-y-4">
      {/* hero */}
      <div className="rounded-3xl p-[1px] bg-gradient-to-br from-cyan-400/40 via-indigo-500/30 to-violet-500/40">
        <div className="rounded-[23px] bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.12),transparent_60%)] bg-[#070b16] p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Mind guide · {categoryName}</div>
              <p className="mt-1.5 text-[18px] sm:text-[20px] font-semibold leading-snug text-slate-50">{g.oneLine}</p>
              <p className="mt-1 text-[12.5px] text-slate-400">“{g.feeling}”</p>
            </div>
            <button type="button" onClick={() => setPlaying(true)} className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-500 text-slate-950 font-bold text-[14px] shadow-[0_0_30px_rgba(99,102,241,0.35)] cursor-pointer">
              <PlayCircle className="w-5 h-5" />Start guided session · {Math.round(g.session.steps.reduce((a, s) => a + s.seconds, 0) / 60)} min
            </button>
          </div>
          <div className="mt-4 inline-flex rounded-xl border border-slate-700 bg-slate-950/70 p-1 text-[12px] font-semibold">
            {([['SIMPLE', 'Simple', <Sparkles key="s" className="w-3.5 h-3.5" />], ['TRADER', 'Trader', <Brain key="t" className="w-3.5 h-3.5" />], ['EXPERT', 'Expert & science', <GraduationCap key="e" className="w-3.5 h-3.5" />]] as const).map(([k, l, ic]) => (
              <button key={k} type="button" onClick={() => setDepth(k)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer ${depth === k ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}>{ic}{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* understand */}
      {depth === 'SIMPLE' && (
        <div className="grid gap-3 md:grid-cols-3">
          <Card icon={<Lightbulb className="w-4 h-4 text-amber-300" />} title="What it is"><p className="text-[13.5px] leading-relaxed text-slate-200">{g.simple.what}</p></Card>
          <Card icon={<Brain className="w-4 h-4 text-violet-300" />} title="Why it happens"><p className="text-[13.5px] leading-relaxed text-slate-200">{g.simple.why}</p></Card>
          <Card icon={<HeartPulse className="w-4 h-4 text-rose-300" />} title="How it shows up"><p className="text-[13.5px] leading-relaxed text-slate-200">{g.simple.how}</p><div className="mt-2.5 text-[10.5px] uppercase tracking-wider text-slate-500">Warning signs</div><List items={g.signs} dot="text-rose-400" /></Card>
        </div>
      )}
      {depth === 'TRADER' && (
        <Card icon={<Brain className="w-4 h-4 text-cyan-300" />} title="The professional playbook" tone="border-cyan-500/25 bg-cyan-500/[0.04]"><List items={g.trader} /></Card>
      )}
      {depth === 'EXPERT' && (
        <Card icon={<GraduationCap className="w-4 h-4 text-violet-300" />} title="What the research shows" tone="border-violet-500/25 bg-violet-500/[0.04]">
          <div className="space-y-2.5">
            {g.science.map((s) => (
              <div key={s.point} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-[13.5px] leading-relaxed text-slate-200">{s.point}</p>
                <p className="mt-1 text-[11px] font-mono-code text-violet-300">{s.source}</p>
              </div>
            ))}
            <p className="text-[10.5px] text-slate-500">Performance-psychology education for traders — not a substitute for professional mental-health care.</p>
          </div>
        </Card>
      )}

      {/* act */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card icon={<Zap className="w-4 h-4 text-emerald-300" />} title="Do this now · 60 seconds" tone="border-emerald-500/30 bg-emerald-500/[0.05]">
          <ol className="space-y-2">{g.doNow.map((t, i) => <li key={t} className="flex gap-2.5 text-[13.5px] leading-relaxed text-slate-100"><span className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-[12px] font-bold flex items-center justify-center shrink-0">{i + 1}</span><span>{t}</span></li>)}</ol>
        </Card>
        <Card icon={<ListChecks className="w-4 h-4 text-cyan-300" />} title="If → then plans (decide now, act automatically later)"><List items={g.ifThen} /></Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card icon={<MessageCircle className="w-4 h-4 text-amber-300" />} title="Change the voice in your head">
          <div className="space-y-2">{g.selfTalk.map((s) => (
            <div key={s.instead} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.05] px-3 py-2 text-[13px] text-rose-200"><span className="text-[10px] uppercase tracking-wider text-rose-400 block">Instead of</span>{s.instead}</div>
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] px-3 py-2 text-[13px] text-emerald-200"><span className="text-[10px] uppercase tracking-wider text-emerald-400 block">Say</span>{s.say}</div>
            </div>
          ))}</div>
        </Card>
        <Card icon={<Sprout className="w-4 h-4 text-teal-300" />} title="Build it over the next weeks"><List items={g.build} dot="text-teal-400" /></Card>
      </div>

      <Card icon={<BookOpen className="w-4 h-4 text-indigo-300" />} title="Journal questions">
        <div className="grid gap-2 sm:grid-cols-3">{g.journal.map((q) => <div key={q} className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-[13px] text-slate-200 italic">{q}</div>)}</div>
      </Card>

      {playing && <GuidedSessionPlayer category={categoryId} title={g.session.title} steps={g.session.steps} onClose={() => setPlaying(false)} />}
    </section>
  );
};

export default MindGuidePanel;
