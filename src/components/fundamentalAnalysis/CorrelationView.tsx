import React, { useMemo, useState } from 'react';
import type { CorrelationMatrix } from './types';

const GROUPS: Record<string, string[]> = {
  All: [],
  'Forex & USD': ['DXY', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'],
  'Commodities vs USD': ['DXY', 'XAUUSD', 'XAGUSD', 'XPTUSD', 'XCUUSD', 'USOIL', 'NATGAS', 'AUDUSD', 'USDCAD'],
  'Indices & Risk': ['US500', 'US100', 'US30', 'GER40', 'UK100', 'JP225', 'AUS200', 'USDJPY', 'BTCUSD'],
  Crypto: ['BTCUSD', 'ETHUSD', 'XRPUSD', 'SOLUSD', 'US100', 'XAUUSD', 'DXY'],
};

function cellColor(v: number | null): string {
  if (v === null) return 'rgba(30,41,59,0.5)';
  const a = Math.min(1, Math.abs(v)) * 0.85 + 0.08;
  return v >= 0 ? `rgba(16,185,129,${a})` : `rgba(244,63,94,${a})`;
}

function strength(v: number): string {
  const a = Math.abs(v);
  return a >= 0.8 ? 'very strong' : a >= 0.6 ? 'strong' : a >= 0.4 ? 'moderate' : a >= 0.2 ? 'weak' : 'negligible';
}

export const CorrelationView: React.FC<{ w30: CorrelationMatrix | null; w90: CorrelationMatrix | null }> = ({ w30, w90 }) => {
  const [win, setWin] = useState<30 | 90>(90);
  const [group, setGroup] = useState('Forex & USD');
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const m = win === 30 ? w30 : w90;

  const idx = useMemo(() => {
    if (!m) return [];
    const want = GROUPS[group];
    return m.symbols.map((s, i) => ({ s, i })).filter(({ s }) => !want.length || want.includes(s)).map(({ i }) => i);
  }, [m, group]);

  const strongest = useMemo(() => {
    if (!m) return [];
    const out: Array<{ a: string; b: string; v: number }> = [];
    for (let x = 0; x < idx.length; x++) for (let y = x + 1; y < idx.length; y++) {
      const v = m.matrix[idx[x]][idx[y]];
      if (v !== null) out.push({ a: m.labels[idx[x]], b: m.labels[idx[y]], v });
    }
    return out.sort((p, q) => Math.abs(q.v) - Math.abs(p.v)).slice(0, 8);
  }, [m, idx]);

  if (!m) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-sm text-slate-400">Price history is still loading — correlations appear once at least three daily series are available.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {Object.keys(GROUPS).map((g) => (
          <button key={g} type="button" onClick={() => setGroup(g)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono-code border cursor-pointer ${group === g ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}>{g}</button>
        ))}
        <div className="ml-auto flex rounded-lg border border-slate-800 overflow-hidden">
          {[30, 90].map((w) => (
            <button key={w} type="button" onClick={() => setWin(w as 30 | 90)} className={`px-3 py-1.5 text-[11px] font-mono-code cursor-pointer ${win === w ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400'}`}>{w}D</button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 overflow-x-auto">
          <table className="border-separate" style={{ borderSpacing: 2 }}>
            <thead>
              <tr>
                <th />
                {idx.map((j) => <th key={j} className="text-[9.5px] font-mono-code text-slate-400 font-normal px-0.5 pb-1 whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{m.symbols[j]}</th>)}
              </tr>
            </thead>
            <tbody>
              {idx.map((i) => (
                <tr key={i}>
                  <td className="text-[10px] font-mono-code text-slate-300 pr-2 whitespace-nowrap text-right">{m.symbols[i]}</td>
                  {idx.map((j) => {
                    const v = m.matrix[i][j];
                    const hl = hover && (hover.i === i || hover.j === j);
                    return (
                      <td key={j} onMouseEnter={() => setHover({ i, j })} onMouseLeave={() => setHover(null)}
                        className={`w-10 h-8 min-w-[2.4rem] text-center text-[10px] font-mono-code rounded ${hl ? 'ring-1 ring-cyan-400/60' : ''}`}
                        style={{ background: cellColor(v), color: v !== null && Math.abs(v) > 0.45 ? '#fff' : '#cbd5e1' }}
                        title={v === null ? 'insufficient overlap' : `${m.labels[i]} vs ${m.labels[j]}: ${(v * 100).toFixed(0)}% (${strength(v)})`}>
                        {v === null ? '·' : i === j ? '' : Math.round(v * 100)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-[10.5px] font-mono-code text-slate-500">
            Pearson correlation of daily log returns over the last {m.window} common trading days, shown in % (−100 … +100). As of {m.asOf ?? '—'} · {m.source}.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
          <div className="text-[10px] font-mono-code uppercase tracking-widest text-cyan-400">Strongest relationships</div>
          {hover && m.matrix[hover.i][hover.j] !== null && hover.i !== hover.j && (
            <div className="rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-[11.5px] text-slate-200">
              <b>{m.labels[hover.i]}</b> vs <b>{m.labels[hover.j]}</b>: {(m.matrix[hover.i][hover.j]! * 100).toFixed(0)}% — {strength(m.matrix[hover.i][hover.j]!)}{' '}
              {m.matrix[hover.i][hover.j]! >= 0 ? 'positive (move together)' : 'inverse (move opposite)'}.
            </div>
          )}
          {strongest.map((s) => (
            <div key={s.a + s.b} className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="text-slate-300 truncate">{s.a} ↔ {s.b}</span>
              <span className={`font-mono-code font-bold ${s.v >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{s.v > 0 ? '+' : ''}{Math.round(s.v * 100)}%</span>
            </div>
          ))}
          <p className="text-[10.5px] text-slate-500 leading-relaxed pt-1 border-t border-slate-800">
            Correlation shows how assets have moved together recently; it changes over time and is not a fundamental score. Use it to avoid doubling risk (e.g. long EUR/USD and long GBP/USD) or to find hedges.
          </p>
        </div>
      </div>
    </div>
  );
};
