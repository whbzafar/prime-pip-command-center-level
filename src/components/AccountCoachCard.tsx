import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import type { Coach } from '../utils/accountCoach';

/** Live coaching card — tone follows the account type and what you are about to risk. */
const STYLE = {
  good: { box: 'border-emerald-500/40 bg-emerald-500/5', title: 'text-emerald-300', Icon: ShieldCheck },
  warn: { box: 'border-amber-500/40 bg-amber-500/5', title: 'text-amber-300', Icon: AlertTriangle },
  stop: { box: 'border-rose-500/50 bg-rose-500/10', title: 'text-rose-300', Icon: ShieldAlert },
} as const;

export const AccountCoachCard: React.FC<{ coach: Coach; onApplyRisk?: (pct: number) => void }> = ({ coach, onApplyRisk }) => {
  const s = STYLE[coach.tone]; const I = s.Icon;
  return (
    <div className={`rounded-xl border p-3 space-y-1.5 ${s.box}`} data-testid="account-coach" role={coach.tone === 'stop' ? 'alert' : 'status'}>
      <div className={`flex items-center gap-2 text-[12px] font-black uppercase tracking-wide ${s.title}`}><I className="w-4 h-4 shrink-0" />{coach.headline}</div>
      {coach.lines.map((l, i) => <div key={i} className="text-[12px] text-slate-300 leading-snug">{l}</div>)}
      {coach.checklist && (
        <div className="pt-1 space-y-0.5">{coach.checklist.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5 text-[11.5px] text-slate-400">{c.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />}{c.label}</div>))}</div>)}
      {coach.suggestedRiskPct !== null && onApplyRisk && (
        <button type="button" onClick={() => onApplyRisk(coach.suggestedRiskPct as number)} className="mt-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-cyan-300 border border-slate-700">Use {coach.suggestedRiskPct}% risk instead</button>)}
      <div className="text-[10px] text-slate-600">Educational guidance, not financial advice. Always confirm your firm's current rules.</div>
    </div>
  );
};
