import React from 'react';
import { ConfidenceLevel } from '../../types';

export interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  size?: 'sm' | 'md';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ level, size = 'md' }) => {
  const barsFilled = level === 'High' ? 3 : level === 'Medium' ? 2 : 1;

  const colorConfig = {
    High: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      bar: 'bg-emerald-400',
    },
    Medium: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30',
      bar: 'bg-cyan-400',
    },
    Low: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      bar: 'bg-amber-400',
    },
  }[level];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono font-medium ${
        size === 'sm' ? 'text-[10px]' : 'text-xs'
      } ${colorConfig.bg} ${colorConfig.border} ${colorConfig.text}`}
      title={`Confidence Level: ${level} (Statistical certainty based on data freshness & consensus)`}
      aria-label={`Confidence level: ${level}`}
    >
      <span className="uppercase text-[9px] text-slate-400 tracking-wider">Conf</span>

      {/* 3-Bar Mini Meter */}
      <div className="flex items-end gap-0.5 h-3" aria-hidden="true">
        <div className={`w-1 rounded-sm ${barsFilled >= 1 ? colorConfig.bar : 'bg-slate-700'} h-1.5`} />
        <div className={`w-1 rounded-sm ${barsFilled >= 2 ? colorConfig.bar : 'bg-slate-700'} h-2.2`} />
        <div className={`w-1 rounded-sm ${barsFilled >= 3 ? colorConfig.bar : 'bg-slate-700'} h-3`} />
      </div>

      <span className="font-bold">{level}</span>
    </div>
  );
};
