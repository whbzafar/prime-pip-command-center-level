import React from 'react';
import { Horizon } from '../../types';
import { Clock, Calendar } from 'lucide-react';

export interface HorizonToggleProps {
  horizon: Horizon;
  onChange: (horizon: Horizon) => void;
  size?: 'sm' | 'md';
}

export const HorizonToggle: React.FC<HorizonToggleProps> = ({ horizon, onChange, size = 'md' }) => {
  return (
    <div
      role="tablist"
      aria-label="Fundamental forecasting horizon"
      className="inline-flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner select-none"
    >
      <button
        role="tab"
        aria-selected={horizon === 'short'}
        onClick={() => onChange('short')}
        className={`flex items-center gap-1.5 rounded-lg font-mono font-bold transition-all duration-150 cursor-pointer ${
          size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          horizon === 'short'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
      >
        <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Short-term</span>
        <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(1–4W)</span>
      </button>

      <button
        role="tab"
        aria-selected={horizon === 'long'}
        onClick={() => onChange('long')}
        className={`flex items-center gap-1.5 rounded-lg font-mono font-bold transition-all duration-150 cursor-pointer ${
          size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
        } ${
          horizon === 'long'
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'
        }`}
      >
        <Calendar className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Long-term</span>
        <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(6M+)</span>
      </button>
    </div>
  );
};
