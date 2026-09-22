import React from 'react';
import { GraduationCap, Lock, BookOpen, Bot, Target, PlayCircle, Sparkles } from 'lucide-react';

export const ProLearningTrading: React.FC = () => {
  const modules = [
    { icon: BookOpen, title: 'Complete Trading Strategies', text: 'Structured strategy modules, playbooks, execution rules and examples.' },
    { icon: Target, title: 'Professional Execution Courses', text: 'Step-by-step learning paths from market structure to disciplined execution.' },
    { icon: Bot, title: 'Trading Bots & Automation', text: 'A dedicated home for future Prime Pip FX bots, tools and automation modules.' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-slate-950/95 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-mono-code font-bold tracking-[0.2em] uppercase">
              <GraduationCap className="w-4 h-4" />
              Prime Pip FX Learning Division
            </div>
            <h1 className="mt-2 text-2xl sm:text-4xl font-military font-bold tracking-wide text-slate-100">
              PRO LEARNING TRADING
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              A future all-in-one learning command center for trading strategies, complete courses,
              execution playbooks, research lessons and Prime Pip FX trading bots.
            </p>
          </div>

          <div className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/35 text-amber-300 font-military font-bold text-xs">
            <Lock className="w-4 h-4" />
            COMING SOON
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modules.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-cyan-400 flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </div>
            <h2 className="mt-4 text-sm font-military font-bold text-slate-100">{title}</h2>
            <p className="mt-2 text-[11px] leading-5 text-slate-500 font-mono-code">{text}</p>
            <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-600 font-mono-code">
              <PlayCircle className="w-3.5 h-3.5" />
              MODULE NOT YET AVAILABLE
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-military font-bold text-slate-200">LEARNING COMMAND CENTER</div>
          <p className="mt-1 text-[11px] text-slate-500 font-mono-code">
            This category is intentionally staged as Coming Soon. Course content, strategy libraries and future bots can be added here without changing the existing trading workflow.
          </p>
        </div>
      </section>
    </div>
  );
};
