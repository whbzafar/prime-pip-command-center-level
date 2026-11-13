import React, { useEffect, useState } from 'react';
import { ChevronRight, Lock, Sparkles } from 'lucide-react';

export interface ShowcaseItem { id: string; name: string; icon: React.ComponentType<{ className?: string }>; locked?: boolean }

/**
 * A slim, always-visible strip at the top of the dashboard: the categories take turns — one fades in, rests, fades out, then
 * the next — so every visitor (subscriber, demo, phone or PC) sees what the terminal contains. Tap to open the category.
 */
export const CategoryShowcase: React.FC<{ items: ShowcaseItem[]; onSelect: (id: string) => void; onOpenAll?: () => void; intervalMs?: number }> = ({ items, onSelect, onOpenAll, intervalMs = 2400 }) => {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(true);
  const [paused, setPaused] = useState(false);
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (items.length < 2 || paused) return;
    let swap = 0;
    const t = window.setInterval(() => {
      setShown(false);
      swap = window.setTimeout(() => { setI((x) => (x + 1) % items.length); setShown(true); }, reduce ? 0 : 420);
    }, intervalMs);
    return () => { window.clearInterval(t); window.clearTimeout(swap); };
  }, [items.length, intervalMs, paused, reduce]);

  if (!items.length) return null;
  const it = items[i % items.length];
  const Icon = it.icon;
  return (
    <div
      data-testid="category-showcase"
      className="relative flex items-center gap-2 border-b border-cyan-500/10 bg-gradient-to-r from-[#020617] via-[#06101f] to-[#020617] px-2.5 sm:px-4 py-1"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    >
      <Sparkles className="h-3 w-3 shrink-0 text-cyan-400/70" />
      <span className="hidden shrink-0 text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500 sm:inline">Inside the terminal</span>
      <span className="hidden text-slate-700 sm:inline">·</span>
      <button
        type="button" onClick={() => onSelect(it.id)} aria-label={`Open ${it.name}`}
        className="group flex min-w-0 flex-1 items-center gap-1.5 text-left cursor-pointer"
      >
        <span
          className="flex min-w-0 items-center gap-1.5 transition-all duration-[420ms] ease-out"
          style={{ opacity: shown ? 1 : 0, transform: reduce ? 'none' : `translateY(${shown ? 0 : -5}px)`, filter: shown || reduce ? 'none' : 'blur(1.5px)' }}
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-300/90" />
          <span className="truncate font-military text-[11.5px] font-semibold tracking-wide text-slate-200 group-hover:text-white">{it.name}</span>
          {it.locked && <Lock className="h-3 w-3 shrink-0 text-amber-400/80" aria-label="Subscription" />}
        </span>
      </button>
      <span className="hidden items-center gap-[3px] md:flex" aria-hidden="true">
        {items.map((_, k) => <span key={k} className={`h-[3px] rounded-full transition-all duration-300 ${k === i ? 'w-3 bg-cyan-400' : 'w-[3px] bg-slate-700'}`} />)}
      </span>
      <span className="shrink-0 text-[10px] tabular-nums text-slate-500">{(i % items.length) + 1}/{items.length}</span>
      {onOpenAll && (
        <button type="button" onClick={onOpenAll} className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-slate-700/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:border-cyan-400/60 hover:text-white cursor-pointer">
          All <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};
