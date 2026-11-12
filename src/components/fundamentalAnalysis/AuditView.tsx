import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleDashed, RefreshCw, TriangleAlert } from 'lucide-react';
import { fetchJsonSafe, scoreColor } from './ui';

interface Row {
  symbol: string; name: string; assetClass: string; score: number | null; bias: string; confidence: number;
  indicators: number; live: number; stale: number; missing: number;
  gaps: Array<{ pillar: string; name: string; status: string }>;
}
interface Audit { ok: boolean; generatedAt: string; assets: Row[]; currencyParity: Array<{ indicator: string; byCurrency: Record<string, string> }> }

const CCY = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
const CLASS_LABEL: Record<string, string> = { FOREX: 'Currencies', COMMODITIES: 'Commodities', INDICES: 'Indices', CRYPTO: 'Crypto' };

const cell = (st: string) =>
  st === 'live' ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-400" aria-label="live" />
  : st === 'stale' ? <TriangleAlert className="mx-auto h-4 w-4 text-amber-400" aria-label="stale" />
  : st === 'missing' ? <CircleDashed className="mx-auto h-4 w-4 text-rose-400" aria-label="missing" />
  : <span className="text-slate-700">–</span>;

/** Transparency: what every score is built from, what is live, and what is not available for free. */
export const AuditView: React.FC = () => {
  const [a, setA] = useState<Audit | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => fetchJsonSafe<Audit>('/api/macro/audit').then(setA).catch((e) => setErr(e?.message || 'Audit unavailable'));
  useEffect(() => { load(); const id = setInterval(load, 120_000); return () => clearInterval(id); }, []);
  if (err && !a) return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-rose-300">{err}</div>;
  if (!a) return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-sm text-slate-500" data-testid="audit-loading">Auditing every indicator…</div>;
  const groups = ['FOREX', 'COMMODITIES', 'INDICES', 'CRYPTO'].map((c) => ({ c, rows: a.assets.filter((r) => r.assetClass === c) }));
  return (
    <div className="space-y-5" data-testid="audit-view">
      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <div>
          <div className="text-sm font-semibold text-slate-100">Data audit — what every score is built from</div>
          <div className="mt-1 text-xs text-slate-400">Live = released inside its normal cycle · Stale = older than expected, down-weighted · Missing = not published free. Two terminals can disagree on the same asset when they weigh different indicators or hold different release dates; this table shows exactly what this one uses.</div>
        </div>
        <button onClick={load} className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800" aria-label="Refresh audit"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
        <div className="border-b border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Currency parity — same indicator, same treatment for all eight</div>
        <table className="w-full text-xs">
          <thead><tr className="text-slate-500"><th className="px-3 py-2 text-left font-medium">Indicator</th>{CCY.map((c) => <th key={c} className="px-2 py-2 font-medium">{c}</th>)}</tr></thead>
          <tbody>
            {a.currencyParity.map((p) => (
              <tr key={p.indicator} className="border-t border-slate-900">
                <td className="px-3 py-1.5 text-slate-300">{p.indicator}</td>
                {CCY.map((c) => <td key={c} className="px-2 py-1.5 text-center">{cell(p.byCurrency[c] ?? 'n/a')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-4 border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-400" /> live</span>
          <span className="flex items-center gap-1"><TriangleAlert className="h-3 w-3 text-amber-400" /> stale</span>
          <span className="flex items-center gap-1"><CircleDashed className="h-3 w-3 text-rose-400" /> missing</span>
          <span>– not part of that currency’s model (by design, e.g. NFP is US-only)</span>
        </div>
      </div>

      {groups.map(({ c, rows }) => (
        <div key={c} className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <div className="border-b border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{CLASS_LABEL[c]}</div>
          <table className="w-full text-xs">
            <thead><tr className="text-slate-500"><th className="px-3 py-2 text-left font-medium">Asset</th><th className="px-2 font-medium">Score</th><th className="px-2 font-medium">Conf.</th><th className="px-2 font-medium">Live</th><th className="px-2 font-medium">Stale</th><th className="px-2 font-medium">Missing</th><th className="px-3 text-left font-medium">Gaps</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.symbol} className="border-t border-slate-900 align-top">
                  <td className="px-3 py-1.5 font-medium text-slate-200">{r.symbol} <span className="text-slate-500">{r.name}</span></td>
                  <td className={`px-2 py-1.5 text-center font-mono ${scoreColor(r.score)}`}>{r.score === null ? '–' : r.score.toFixed(1)}</td>
                  <td className="px-2 py-1.5 text-center text-slate-300">{r.confidence}%</td>
                  <td className="px-2 py-1.5 text-center text-emerald-400">{r.live}</td>
                  <td className="px-2 py-1.5 text-center text-amber-400">{r.stale}</td>
                  <td className="px-2 py-1.5 text-center text-rose-400">{r.missing}</td>
                  <td className="px-3 py-1.5 text-slate-500">{r.gaps.length ? r.gaps.map((g) => `${g.name}${g.status === 'stale' ? ' (stale)' : ''}`).join(' · ') : 'none'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-400">
        Known free-data limits: S&amp;P Global / HCOB / au Jibun / procure.ch PMI values are licensed, so a business-survey indicator (ESI, Tankan, NAB, CBI, KOF) stands in for them. Central-bank gold buying and gold-ETF holdings have no free live feed and are not scored.
      </div>
    </div>
  );
};
