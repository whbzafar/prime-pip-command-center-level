import React, { useEffect, useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';

/**
 * Subtle fade-in / fade-out labels for the top bar. Each name appears for a moment and fades out before the next one, so
 * visitors learn what exists (and what a subscription includes) without a wall of text.
 */
export const RotatingFeatureLabels: React.FC<{ labels: string[]; locked?: boolean; className?: string; intervalMs?: number }> = ({
  labels, locked = true, className = '', intervalMs = 2600,
}) => {
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (labels.length < 2) return;
    let fade: number;
    const t = window.setInterval(() => {
      setVisible(false);
      fade = window.setTimeout(() => { setI((x) => (x + 1) % labels.length); setVisible(true); }, reduce ? 0 : 450);
    }, intervalMs);
    return () => { window.clearInterval(t); window.clearTimeout(fade); };
  }, [labels.length, intervalMs, reduce]);

  if (!labels.length) return null;
  const Icon = locked ? Lock : Sparkles;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono-code text-slate-400 min-w-0 ${className}`}
      aria-live="off"
      data-testid="rotating-feature-label"
    >
      <Icon className="w-3 h-3 shrink-0 text-cyan-400/70" />
      <span
        className="truncate transition-opacity duration-500"
        style={{ opacity: visible ? 0.9 : 0 }}
      >
        {labels[i]}
      </span>
    </span>
  );
};
