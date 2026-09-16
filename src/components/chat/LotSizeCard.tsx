import React from 'react';
import { LotSizeCardPayload } from './types';
import { Calculator, ShieldCheck } from 'lucide-react';

interface LotSizeCardProps {
  payload: LotSizeCardPayload;
}

export const LotSizeCard: React.FC<LotSizeCardProps> = ({ payload }) => {
  return (
    <div className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-[#0c1322] via-[#090f1d] to-[#060a14] border border-indigo-500/30 shadow-xl space-y-3.5 max-w-xl text-left">
      <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-military font-bold text-slate-100 uppercase tracking-wider">
              {payload.title}
            </div>
            <div className="text-[10px] font-mono-code text-indigo-300">
              {payload.pair} • Standard Lot Formulation
            </div>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono-code font-bold">
          {payload.riskPercentage}% Risk Rule
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono-code">
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Balance</span>
          <span className="text-sm font-bold text-slate-200">
            ${payload.accountBalance.toLocaleString()}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Risk Amount</span>
          <span className="text-sm font-bold text-amber-400">
            ${payload.riskAmount.toFixed(2)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Stop Loss</span>
          <span className="text-sm font-bold text-slate-200">
            {payload.stopLossPips} pips
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-teal-950/30 border border-teal-500/40">
          <span className="text-[10px] text-teal-400 block font-bold">Computed Lots</span>
          <span className="text-base font-black text-teal-300">
            {payload.calculatedLotSize.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-900/30 text-[10px] font-mono-code text-slate-400 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <span>Calculated with strict drawdown ceiling preservation. Never exceed your pre-calculated lots.</span>
      </div>
    </div>
  );
};
