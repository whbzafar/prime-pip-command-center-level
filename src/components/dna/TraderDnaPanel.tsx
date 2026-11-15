import React, { useMemo } from 'react';
import { Dna, TrendingUp, TrendingDown, ShieldAlert, ListChecks, AlertTriangle, Siren } from 'lucide-react';
import type { Trade } from '../../types';
import { analyseDna, liveWarnings } from '../../utils/traderDna';

const R = (x: number) => `${x > 0 ? '+' : ''}${x.toFixed(2)}R`;
const money = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(2)}`;

/** Live discipline warnings (compact) — shown on the dashboard and above the coach. */
export const DisciplineGuard: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  const warnings = useMemo(() => liveWarnings(trades, analyseDna(trades)), [trades]);
  if (!warnings.length) return null;
  return (
    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 space-y-1.5" data-testid="discipline-guard">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-200"><Siren className="w-4 h-4" />Discipline guard</div>
      {warnings.map((w, i) => <div key={i} className={`text-xs flex gap-2 ${w.level === 'high' ? 'text-rose-100' : 'text-amber-100'}`}><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w.text}</div>)}
    </div>
  );
};

/** TRADER DNA — real edge and costly habits, measured from the trader's own closed trades. */
export const TraderDnaPanel: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  const d = useMemo(() => analyseDna(trades), [trades]);
  return (
    <div className="rounded-2xl border border-violet-500/30 bg-slate-950/80 p-4 sm:p-5 space-y-4" data-testid="trader-dna">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center"><Dna className="w-5 h-5 text-white" /></div>
          <div>
            <div className="text-base font-black text-white tracking-wide">TRADER DNA</div>
            <div className="text-[11px] text-slate-400">Your real edge and your costly habits — measured from your own {d.closed} closed trades</div>
          </div>
        </div>
      </div>

      <DisciplineGuard trades={trades} />

      {!d.enoughData ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
          {d.closed === 0 ? 'No closed trades in this account yet.' : `${d.closed} closed trade${d.closed === 1 ? '' : 's'} so far.`} Log at least 10 closed trades (with session, setup, mood and risk) and your DNA appears here automatically — no guesses before then.
        </div>
      ) : (<>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
          {[
            ['Win rate', `${d.winRate}%`, ''],
            ['Expectancy', R(d.expR), d.expR >= 0 ? 'text-emerald-300' : 'text-rose-300'],
            ['Profit factor', d.profitFactor === null ? '—' : d.profitFactor.toFixed(2), d.profitFactor !== null && d.profitFactor >= 1 ? 'text-emerald-300' : 'text-rose-300'],
            ['Avg win / loss', `${R(d.avgWinR)} / ${R(d.avgLossR)}`, ''],
            ['Net P/L', money(d.pnl), d.pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'],
          ].map(([k, v, c]) => (
            <div key={k} className="rounded-xl bg-slate-900/70 border border-slate-800 p-2"><div className="text-[10px] uppercase text-slate-500">{k}</div><div className={`font-mono font-black text-sm ${c || 'text-white'}`}>{v}</div></div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-300"><TrendingUp className="w-4 h-4" />Where your edge is</div>
            {d.edges.length === 0 ? <div className="text-xs text-slate-400">No group clearly beats your average yet.</div> : d.edges.map((g) => (
              <div key={g.dim + g.key} className="flex justify-between gap-2 text-xs"><span className="text-slate-300"><span className="text-slate-500">{g.dim}:</span> <b className="text-white">{g.key}</b> <span className="text-slate-500">· {g.n} trades · {g.winRate}% wins</span></span><span className="font-mono font-bold text-emerald-300">{R(g.expR)}</span></div>
            ))}
          </div>
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-rose-300"><TrendingDown className="w-4 h-4" />Where you lose money</div>
            {d.leaks.length === 0 ? <div className="text-xs text-slate-400">No losing group stands out — good.</div> : d.leaks.map((g) => (
              <div key={g.dim + g.key} className="flex justify-between gap-2 text-xs"><span className="text-slate-300"><span className="text-slate-500">{g.dim}:</span> <b className="text-white">{g.key}</b> <span className="text-slate-500">· {g.n} trades · {money(g.pnl)}</span></span><span className="font-mono font-bold text-rose-300">{R(g.expR)}</span></div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-amber-300"><ShieldAlert className="w-4 h-4" />Costly habits</div>
          {d.habits.length === 0 ? <div className="text-xs text-slate-400">None of the tracked habits (revenge trading, overtrading, oversizing, rule breaks, bad mood, low-grade setups) is costing you money right now.</div> : d.habits.map((h) => (
            <div key={h.id} className="text-xs">
              <div className="flex justify-between gap-2"><b className="text-white">{h.title}</b><span className="font-mono text-rose-300">{money(h.pnl)}</span></div>
              <div className="text-slate-400">{h.detail}</div>
            </div>
          ))}
        </div>

        {d.rules.length > 0 && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-cyan-300"><ListChecks className="w-4 h-4" />Your personal rules (from your own results)</div>
            <ol className="list-decimal pl-5 space-y-0.5 text-xs text-slate-200">{d.rules.map((r, i) => <li key={i}>{r}</li>)}</ol>
          </div>
        )}
        <div className="text-[10.5px] text-slate-600">Groups need at least {d.closed >= 40 ? 5 : 3} trades to be shown. Expectancy in R = average result per trade measured in units of risk. Updates every time you log or close a trade.</div>
      </>)}
    </div>
  );
};

/** Floating version shown while the trade-entry form is open, so the warning comes before the trade. */
export const DisciplineToast: React.FC<{ trades: Trade[] }> = ({ trades }) => {
  const [hidden, setHidden] = React.useState(false);
  const warnings = useMemo(() => liveWarnings(trades, analyseDna(trades)), [trades]);
  if (hidden || !warnings.length) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-[2147483300] w-[min(560px,94vw)] rounded-xl border border-rose-500/50 shadow-2xl p-3 space-y-1.5" style={{ backgroundColor: '#1a0710' }} data-testid="discipline-toast">
      <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-rose-200"><Siren className="w-4 h-4" />Before you take this trade</span><button type="button" onClick={() => setHidden(true)} className="text-[11px] text-rose-200/80 hover:text-white cursor-pointer px-2 py-0.5 rounded hover:bg-rose-500/20">I understand</button></div>
      {warnings.map((w, i) => <div key={i} className={`text-xs flex gap-2 ${w.level === 'high' ? 'text-rose-100' : 'text-amber-100'}`}><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w.text}</div>)}
    </div>
  );
};
