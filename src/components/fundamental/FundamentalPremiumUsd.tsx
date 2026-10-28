import React, { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, TrendingDown, TrendingUp, ExternalLink, Database } from 'lucide-react';

type Category = { id: string; label: string; weight: number; score: number; details: string };
type Series = { id: string; label: string; unit: string; frequency: string; url: string; latest: { date: string; value: number } | null; previous: { date: string; value: number } | null; status: 'LIVE' | 'STALE' | 'UNAVAILABLE'; error?: string };
type Payload = {
  ok: boolean; retrievedAt: string; provider: string; providerMode: string; liveSeriesCount: number; totalSeriesCount: number; errors: string[];
  dashboard: { score: number; bullishIndex: number; bearishIndex: number; classification: string; categories: Category[]; indicators: Record<string, number | null>; coveragePercent: number; dataStatus: string; methodology: string };
  series: Record<string, Series>; sourceNotes: string[];
};

const pct = (value: number | null | undefined, suffix = '') => value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(2)}${suffix}`;
const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;

export const FundamentalPremiumUsd: React.FC = () => {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/fundamental-premium-usd', { method: 'GET', credentials: 'include', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data?.ok) throw new Error(data?.error || `Request failed (${response.status})`);
      setPayload(data);
      try {
        const snapshots = JSON.parse(localStorage.getItem('primepip_fundamental_premium_usd_snapshots_v1') || '[]');
        const next = [{ retrievedAt: data.retrievedAt, score: data.dashboard.score, coveragePercent: data.dashboard.coveragePercent, classification: data.dashboard.classification }, ...snapshots.filter((s: any) => s.retrievedAt !== data.retrievedAt)].slice(0, 180);
        localStorage.setItem('primepip_fundamental_premium_usd_snapshots_v1', JSON.stringify(next));
      } catch {}
    } catch (e: any) {
      setError(e?.message || 'Could not load official data.');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  const d = payload?.dashboard;
  const scoreTone = (score: number) => score >= 25 ? 'text-emerald-300' : score <= -25 ? 'text-rose-300' : 'text-amber-200';
  const displayValue = (id: string) => {
    const value = d?.indicators[id];
    if (value === null || value === undefined) return '—';
    return id === 'nfpMonthlyChangeThousands' ? `${value >= 0 ? '+' : ''}${value.toFixed(0)}k` : `${value.toFixed(2)}${['unemploymentRate','effectiveFedFundsRate','treasury2Y','treasury10Y','realYield10Y','averageHourlyEarningsYoY','averageHourlyEarningsMoM','corePceYoY','coreCpiYoY','headlinePceYoY','realGdpQoQAnnualized'].includes(id) ? '%' : ''}`;
  };

  return (
    <div className="space-y-5 text-slate-100">
      <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/80 p-4 sm:p-6 shadow-xl shadow-cyan-950/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold uppercase tracking-[0.18em]"><Activity className="h-4 w-4"/> PrimePip FX / Fundamental Premium</div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">USD Fundamental Engine</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">Official US macro observations, trend-based scoring, auditable sources and automatic refresh. Consensus surprise scoring is intentionally not enabled in v1.</p>
          </div>
          <button onClick={() => void load(true)} disabled={loading || refreshing} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading || refreshing ? 'animate-spin' : ''}`}/>{refreshing ? 'Refreshing…' : 'Refresh official data'}
          </button>
        </div>
        {error && <div className="mt-4 flex gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5"/><span>{error} — the engine will not replace failed feeds with invented values.</span></div>}
        {loading && !payload && <div className="py-12 text-center text-slate-400"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin"/>Fetching official FRED observations…</div>}
        {d && <>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-wider text-slate-400">USD directional score</div><div className={`mt-2 text-3xl font-bold ${scoreTone(d.score)}`}>{signed(d.score)}<span className="text-sm text-slate-500"> / 100</span></div><div className="mt-1 text-xs text-slate-400">{d.classification}</div></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-wider text-slate-400">Bullish directional index</div><div className="mt-2 text-3xl font-bold text-emerald-300">{pct(d.bullishIndex, '%')}</div><div className="mt-1 text-xs text-slate-400">Not a probability</div></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-wider text-slate-400">Bearish directional index</div><div className="mt-2 text-3xl font-bold text-rose-300">{pct(d.bearishIndex, '%')}</div><div className="mt-1 text-xs text-slate-400">Not a probability</div></div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="text-xs uppercase tracking-wider text-slate-400">Source coverage</div><div className="mt-2 text-3xl font-bold text-white">{pct(d.coveragePercent, '%')}</div><div className="mt-1 text-xs text-slate-400">{payload.liveSeriesCount}/{payload.totalSeriesCount} series current</div></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/>Retrieved {new Date(payload.retrievedAt).toLocaleString()}</span>
            <span className="inline-flex items-center gap-1.5"><Database className="h-3.5 w-3.5"/>{payload.providerMode}</span>
            <span className={`inline-flex items-center gap-1.5 ${d.dataStatus === 'CURRENT' ? 'text-emerald-300' : 'text-amber-200'}`}>{d.dataStatus === 'CURRENT' ? <CheckCircle2 className="h-3.5 w-3.5"/> : <AlertTriangle className="h-3.5 w-3.5"/>}{d.dataStatus.replaceAll('_', ' ')}</span>
          </div>
          <div className="mt-5 rounded-xl border border-slate-800 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 font-semibold text-sm">Category contribution model</div>
            <div className="divide-y divide-slate-800">
              {d.categories.map((c) => <div key={c.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_80px_100px] gap-3 p-4">
                <div><div className="font-medium text-sm">{c.label}</div><div className="mt-1 text-xs leading-relaxed text-slate-400">{c.details}</div><div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full rounded-full ${c.score >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${Math.abs(c.score)}%` }}/></div></div>
                <div className="text-right text-xs text-slate-400">{c.weight}% weight</div><div className={`text-right font-mono font-bold ${scoreTone(c.score)}`}>{signed(c.score)}<span className="block text-[10px] font-normal text-slate-500">contribution {signed(c.score * c.weight / 100)}</span></div>
              </div>)}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="font-semibold">Latest derived indicators</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  ['Core PCE YoY', 'corePceYoY'], ['Core CPI YoY', 'coreCpiYoY'], ['Headline PCE YoY', 'headlinePceYoY'], ['NFP monthly change', 'nfpMonthlyChangeThousands'], ['Unemployment', 'unemploymentRate'], ['Hourly earnings YoY', 'averageHourlyEarningsYoY'], ['Hourly earnings MoM', 'averageHourlyEarningsMoM'], ['Real GDP QoQ annualized', 'realGdpQoQAnnualized'], ['Effective Fed funds', 'effectiveFedFundsRate'], ['2Y Treasury yield', 'treasury2Y'], ['10Y Treasury yield', 'treasury10Y'], ['10Y real yield', 'realYield10Y'], ['VIX', 'vix']
                ].map(([label, id]) => <div key={id} className="rounded-lg bg-slate-950/70 p-3"><div className="text-[11px] text-slate-400">{label}</div><div className="mt-1 font-mono text-lg text-white">{displayValue(id)}</div></div>)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <h3 className="font-semibold">Verified source series</h3>
              <p className="mt-1 text-xs text-slate-400">Each source row shows its observation date. Current means fresh relative to its expected publication frequency, not tick-by-tick live.</p>
              <div className="mt-3 max-h-[420px] overflow-auto divide-y divide-slate-800">
                {Object.values(payload.series).map((s) => <div key={s.id} className="flex items-start justify-between gap-3 py-3">
                  <div><div className="text-sm font-medium">{s.label}</div><div className="mt-1 text-[11px] text-slate-500">{s.id} · {s.frequency} · {s.latest?.date || 'No observation'}</div>{s.error && <div className="mt-1 text-xs text-rose-300">{s.error}</div>}</div>
                  <div className="text-right shrink-0"><div className="font-mono text-sm">{s.latest ? s.latest.value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : '—'}</div><div className={`mt-1 text-[10px] ${s.status === 'LIVE' ? 'text-emerald-300' : s.status === 'STALE' ? 'text-amber-200' : 'text-rose-300'}`}>{s.status}</div><a href={s.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:underline">Source <ExternalLink className="h-3 w-3"/></a></div>
                </div>)}
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-100/80">
            <div className="flex items-center gap-2 font-semibold text-amber-200"><AlertTriangle className="h-4 w-4"/> Methodology & limitations</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">{payload.sourceNotes.map((note) => <li key={note}>{note}</li>)}</ul>
            <p className="mt-2">Automatic refresh runs every 15 minutes while this panel is open. Economic releases update only when the source publishes new observations. The app currently stores up to 180 score snapshots in this browser; durable cross-device history will require an active database connection.</p>
          </div>
        </>}
      </div>
    </div>
  );
};
