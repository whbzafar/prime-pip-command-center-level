import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, FileDown, Info, LineChart, RefreshCw, Trophy } from 'lucide-react';
import type { PairResult } from './types';
import { fmtScore, scoreColor } from './ui';
import { openChart, useRankings, type RankedPair } from './LiveBiasStrip';
import { LevelAlertsPanel, LevelBadge } from '../sbt/LevelAlerts';

const Row: React.FC<{ p: RankedPair; i: number; horizon: 'longTerm' | 'shortTerm'; onPair: (s: string) => void }> = ({ p, i, horizon, onPair }) => {
  const v = p[horizon];
  const other = horizon === 'longTerm' ? p.shortTerm : p.longTerm;
  const up = (v ?? 0) > 0;
  const agree = other !== null && v !== null && Math.sign(other) === Math.sign(v);
  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70 transition-colors">
      <span className="w-6 text-[11px] font-mono-code text-slate-500">#{i + 1}</span>
      <button type="button" onClick={() => onPair(p.symbol)} className="min-w-0 flex-1 text-left cursor-pointer">
        <div className="flex items-center gap-2">
          {up ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-rose-400" />}
          <span className="font-semibold text-slate-50">{p.display}</span>
          {horizon === 'longTerm' && <LevelBadge symbol={p.symbol} />}
          <span className="text-[9.5px] uppercase tracking-wider text-slate-500">{p.assetClass.toLowerCase()}</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div className={`h-full ${up ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-rose-600 to-rose-400'}`} style={{ width: `${Math.min(100, Math.abs(v ?? 0))}%` }} />
        </div>
      </button>
      <div className="text-right">
        <div className={`font-mono-code font-bold text-[15px] ${scoreColor(v)}`}>{fmtScore(v)}</div>
        <div className={`text-[10px] font-mono-code ${agree ? 'text-cyan-300' : 'text-slate-500'}`} title={agree ? 'Short- and long-term signals agree' : 'Short- and long-term signals disagree'}>
          {horizon === 'longTerm' ? 'now' : 'LT'} {fmtScore(other)}{agree ? ' ✓' : ''}
        </div>
      </div>
      <button type="button" onClick={() => openChart(p.symbol)} title={`Open ${p.display} chart`} className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 cursor-pointer"><LineChart className="w-3.5 h-3.5" /></button>
    </div>
  );
};

const PRIORITY = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];

/** Every combination of the 8 major currencies: row currency vs column currency. */
const CurrencyMatrix: React.FC<{ pairs: PairResult[]; onPair: (s: string) => void }> = ({ pairs, onPair }) => {
  const map = useMemo(() => new Map(pairs.filter((p) => p.assetClass === 'FOREX').map((p) => [p.symbol, p])), [pairs]);
  const cell = (a: string, b: string): { p: PairResult; score: number | null } | null => {
    const d = map.get(a + b); if (d) return { p: d, score: d.score };
    const r = map.get(b + a); if (r) return { p: r, score: r.score === null ? null : -r.score };
    return null;
  };
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-mono-code uppercase tracking-[0.16em] text-cyan-300">All 28 currency pairs · matrix</span>
        <span className="text-[10.5px] text-slate-500">row currency vs column currency (green = row stronger) · click any cell</span>
      </div>
      <table className="border-separate border-spacing-1 mx-auto">
        <thead><tr><th />{PRIORITY.map((c) => <th key={c} className="text-[11px] font-mono-code text-slate-400 font-normal px-1">{c}</th>)}</tr></thead>
        <tbody>
          {PRIORITY.map((a) => (
            <tr key={a}>
              <th className="text-[11px] font-mono-code text-slate-300 pr-2 text-right">{a}</th>
              {PRIORITY.map((b) => {
                if (a === b) return <td key={b} className="w-14 h-10 rounded-md bg-slate-900/40" />;
                const c = cell(a, b);
                const v = c?.score ?? null;
                const alpha = v === null ? 0 : Math.min(0.55, Math.abs(v) / 80 + 0.08);
                return (
                  <td key={b}>
                    <button type="button" onClick={() => c && onPair(c.p.symbol)} title={c ? `${a}/${b}: ${fmtScore(v)}` : 'no data'}
                      className="w-14 h-10 rounded-md text-[11px] font-mono-code font-bold border border-slate-800/80 cursor-pointer hover:ring-1 hover:ring-cyan-400/60"
                      style={{ background: v === null ? 'rgba(30,41,59,.4)' : v >= 0 ? `rgba(16,185,129,${alpha})` : `rgba(244,63,94,${alpha})` }}>
                      <span className="text-slate-50">{fmtScore(v)}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const RankingsView: React.FC<{ pairs: PairResult[]; onPair: (symbol: string) => void }> = ({ pairs, onPair }) => {
  const { data, error } = useRankings();
  const [horizon, setHorizon] = useState<'longTerm' | 'shortTerm'>('longTerm');
  const set = data?.[horizon];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-[#0c1526] to-slate-950 p-4 flex flex-wrap items-center gap-3">
        <Trophy className="w-5 h-5 text-amber-300" />
        <div>
          <div className="font-semibold text-slate-50">Top bullish &amp; bearish pairs</div>
          <div className="text-[11px] text-slate-500">Ranked live from the fundamentals engine · click a pair for its full analysis, or the chart icon to open it in Premium TradingView</div>
        </div>
        <button type="button" disabled={!data} data-testid="export-rankings-pdf" onClick={() => data && import('../../utils/macroPdf').then((m) => m.exportRankingsPdf(data, horizon))}
          className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-400/50 bg-emerald-500/10 text-[12px] font-semibold text-emerald-100 hover:bg-emerald-500/20 cursor-pointer disabled:opacity-40" title="Download these rankings as a PDF to share">
          <FileDown className="w-4 h-4" />Export PDF
        </button>
        <div className="flex rounded-xl border border-slate-800 overflow-hidden text-[12px]">
          {(['longTerm', 'shortTerm'] as const).map((h) => (
            <button key={h} type="button" onClick={() => setHorizon(h)} className={`px-4 py-2 font-semibold cursor-pointer ${horizon === h ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-400 hover:text-slate-200'}`}>{h === 'longTerm' ? 'Long-term' : 'Current (short-term)'}</button>
          ))}
        </div>
      </div>

      {!data && !error && <div className="rounded-2xl border border-slate-800 p-8 text-center text-sm text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />Ranking every pair…</div>}
      {error && !data && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-[12px] text-amber-200">{error} — retrying automatically.</div>}

      <LevelAlertsPanel onOpen={openChart} />

      {set && (
        <div className="grid lg:grid-cols-2 gap-4">
          {([['bullish', `${horizon === 'longTerm' ? 'Long-term' : 'Current'} bullish`, 'text-emerald-300'], ['bearish', `${horizon === 'longTerm' ? 'Long-term' : 'Current'} bearish`, 'text-rose-300']] as const).map(([k, title, cls]) => (
            <div key={k} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
              <div className={`text-[11px] font-mono-code uppercase tracking-[0.16em] ${cls} px-1`}>{title}</div>
              {set[k].length ? set[k].map((p, i) => <Row key={p.symbol} p={p} i={i} horizon={horizon} onPair={onPair} />)
                : <div className="text-[12px] text-slate-500 px-1 py-4">No pair has a clear {k} reading right now.</div>}
            </div>
          ))}
        </div>
      )}
      {data && <p className="text-[10.5px] text-slate-500 leading-relaxed flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />{data.method} Pairs need ≥ 25% data confidence to be ranked.</p>}

      <CurrencyMatrix pairs={pairs} onPair={onPair} />
    </div>
  );
};
