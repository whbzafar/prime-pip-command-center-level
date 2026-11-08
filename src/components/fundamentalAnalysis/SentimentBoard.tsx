import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Info, LineChart, RefreshCw, Search, Users } from 'lucide-react';
import { fetchJsonSafe, timeAgo } from './ui';
import { openChart } from './LiveBiasStrip';

export interface SentRow {
  symbol: string; display: string; asset: 'FOREX' | 'COMMODITIES' | 'INDICES' | 'CRYPTO';
  longPct: number; shortPct: number; method: 'measured' | 'derived'; sources: Array<{ name: string; longPct: number }>;
  weight?: number; crowd: 'LONG' | 'SHORT' | 'BALANCED'; contrarian: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; strength: number; updatedAt: string;
}
export interface SentSnapshot {
  updatedAt: string; rows: SentRow[]; currencies: Array<{ currency: string; net: number; longPct: number; pairs: number }>;
  sources: Array<{ id: string; name: string; ok: boolean; count: number; error?: string; at: string }>;
}

let cache: SentSnapshot | null = null;
export function useSentiment(pollMs = 60_000) {
  const [data, setData] = useState<SentSnapshot | null>(cache);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const j = await fetchJsonSafe<{ ok: boolean; data: SentSnapshot }>('/api/macro/sentiment');
        cache = j.data;
        if (live) { setData(j.data); setError(null); }
      } catch (e: any) { if (live) setError(e?.message || 'Sentiment unavailable'); }
      finally { if (live) setLoading(false); }
    };
    load();
    const id = setInterval(() => { if (navigator.onLine) load(); }, pollMs);
    const back = () => load();
    window.addEventListener('online', back);
    return () => { live = false; clearInterval(id); window.removeEventListener('online', back); };
  }, [pollMs]);
  return { data, error, loading };
}

/** Long/short split bar. */
export const SplitBar: React.FC<{ longPct: number; height?: string }> = ({ longPct, height = 'h-2' }) => (
  <div className={`relative w-full ${height} rounded-full overflow-hidden bg-rose-500/80`} role="img" aria-label={`${longPct.toFixed(1)}% long, ${(100 - longPct).toFixed(1)}% short`}>
    <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${longPct}%` }} />
    <div className="absolute inset-y-0 left-1/2 w-px bg-slate-950/70" />
  </div>
);

const signalStyle = (c: SentRow['contrarian']) =>
  c === 'BULLISH' ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40' : c === 'BEARISH' ? 'text-rose-300 bg-rose-500/10 border-rose-500/40' : 'text-slate-300 bg-slate-800/60 border-slate-700';

const SentCard: React.FC<{ r: SentRow }> = ({ r }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-800/90 bg-gradient-to-b from-slate-900/70 to-slate-950/80 p-3 hover:border-slate-700 transition-colors">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[13.5px] text-slate-50 tracking-wide">{r.display}</span>
        {r.method === 'derived' && <span title="No source publishes this cross directly — derived from currency-level positioning of every measured pair." className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-indigo-500/40 text-indigo-300 bg-indigo-500/10">derived</span>}
        <span className={`ml-auto text-[10px] font-mono-code px-1.5 py-0.5 rounded border ${signalStyle(r.contrarian)}`}>{r.contrarian === 'NEUTRAL' ? 'Neutral' : `Contrarian ${r.contrarian.toLowerCase()}`}</span>
      </div>
      <div className="mt-2.5"><SplitBar longPct={r.longPct} /></div>
      <div className="mt-1.5 flex items-center text-[11px] font-mono-code">
        <span className="text-emerald-400 font-bold">{r.longPct.toFixed(1)}% long</span>
        <span className="mx-auto text-slate-500">{r.sources.length} {r.method === 'derived' ? 'inputs' : r.sources.length === 1 ? 'source' : 'sources'}</span>
        <span className="text-rose-400 font-bold">{r.shortPct.toFixed(1)}% short</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="text-[10.5px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer">
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Breakdown
        </button>
        <button type="button" onClick={() => openChart(r.symbol === 'BTCUSD' || r.symbol === 'ETHUSD' ? `${r.symbol}T` : r.symbol)} className="ml-auto text-[10.5px] text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"><LineChart className="w-3 h-3" /> Chart</button>
      </div>
      {open && (
        <div className="mt-2 space-y-1.5 border-t border-slate-800 pt-2">
          {r.sources.map((s) => (
            <div key={s.name} className="grid grid-cols-[88px_1fr_44px] items-center gap-2 text-[10.5px] font-mono-code">
              <span className="text-slate-400 truncate">{s.name}</span>
              <SplitBar longPct={s.longPct} height="h-1.5" />
              <span className="text-right text-slate-300">{s.longPct.toFixed(0)}%</span>
            </div>
          ))}
          <p className="text-[10.5px] text-slate-500 leading-relaxed">
            {r.method === 'derived'
              ? `Derived: ${r.display.split('/')[0]} and ${r.display.split('/')[1]} crowd positioning (from every measured pair), cross = (base − quote) / 2.`
              : r.asset === 'CRYPTO' && !r.symbol.endsWith('USD') ? 'Share of exchange accounts net long the USDT perpetual (5-minute data).' : 'Share of open retail positions that are long, per broker; headline = volume-weighted average.'}
            {' '}Crowd {r.crowd === 'BALANCED' ? 'is balanced' : `leans ${r.crowd.toLowerCase()}`} ({r.strength}/100 one-sided). Retail crowds are usually on the wrong side of big moves, so extremes are read contrarian.
          </p>
        </div>
      )}
    </div>
  );
};

const FILTERS = [['ALL', 'All'], ['FOREX', 'Forex'], ['COMMODITIES', 'Commodities'], ['INDICES', 'Indices'], ['CRYPTO', 'Crypto']] as const;

/** Live trader sentiment across forex, commodities, indices and crypto USDT pairs. */
export const SentimentBoard: React.FC<{ compactHeader?: boolean }> = ({ compactHeader }) => {
  const { data, error, loading } = useSentiment();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('ALL');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'extreme' | 'long' | 'short' | 'az'>('extreme');
  const [showDerived, setShowDerived] = useState(true);

  const rows = useMemo(() => {
    const s = q.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const list = (data?.rows || []).filter((r) => (filter === 'ALL' || r.asset === filter) && (showDerived || r.method === 'measured') && (!s || r.symbol.includes(s) || r.display.replace(/[^A-Z0-9]/gi, '').toUpperCase().includes(s)));
    const by = { extreme: (a: SentRow, b: SentRow) => b.strength - a.strength, long: (a: SentRow, b: SentRow) => b.longPct - a.longPct, short: (a: SentRow, b: SentRow) => a.longPct - b.longPct, az: (a: SentRow, b: SentRow) => a.display.localeCompare(b.display) }[sort];
    return [...list].sort((a, b) => (a.method === b.method ? by(a, b) : a.method === 'measured' ? -1 : 1));
  }, [data, filter, q, sort, showDerived]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: data?.rows.length || 0 };
    for (const r of data?.rows || []) c[r.asset] = (c[r.asset] || 0) + 1;
    return c;
  }, [data]);

  return (
    <div className="space-y-3">
      {!compactHeader && (
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-[#0c1526] to-slate-950 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-4.5 h-4.5 text-cyan-400" />
            <h3 className="font-semibold text-slate-50 tracking-wide">Live trader sentiment</h3>
            <span className="text-[10.5px] font-mono-code text-slate-500">{data ? `updated ${timeAgo(data.updatedAt)} · refreshes every 60 s` : ''}</span>
            {data && (
              <div className="ml-auto flex flex-wrap gap-1.5">
                {data.sources.map((s) => (
                  <span key={s.id} title={s.error || `${s.count} instruments`} className={`text-[10px] font-mono-code px-2 py-0.5 rounded-full border ${s.ok ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5' : 'border-amber-500/30 text-amber-300 bg-amber-500/5'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${s.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />{s.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {data && data.currencies.length > 0 && (
            <div className="mt-3 grid grid-cols-4 sm:grid-cols-8 gap-2">
              {[...data.currencies].sort((a, b) => b.longPct - a.longPct).map((c) => (
                <div key={c.currency} className="rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-center" title={`Retail crowd net positioning in ${c.currency} across ${c.pairs} measured pairs`}>
                  <div className="text-[12.5px] font-bold text-slate-100">{c.currency}</div>
                  <div className={`text-[11px] font-mono-code ${c.longPct >= 55 ? 'text-emerald-300' : c.longPct <= 45 ? 'text-rose-300' : 'text-slate-300'}`}>{c.longPct.toFixed(0)}% long</div>
                  <div className="mt-1"><SplitBar longPct={c.longPct} height="h-1" /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg border text-[11.5px] font-semibold cursor-pointer ${filter === id ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100' : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {label} <span className="text-slate-500 font-mono-code">{counts[id] || 0}</span>
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pair…" aria-label="Search sentiment" className="pl-8 pr-3 py-1.5 w-40 rounded-lg bg-slate-900 border border-slate-800 text-[12px] text-slate-100 outline-none focus:border-cyan-500/50" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="Sort" className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11.5px] text-slate-200">
          <option value="extreme">Most one-sided</option><option value="long">Most long</option><option value="short">Most short</option><option value="az">A–Z</option>
        </select>
        <label className="text-[11px] text-slate-400 inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={showDerived} onChange={(e) => setShowDerived(e.target.checked)} className="accent-cyan-500" /> Derived crosses</label>
      </div>

      {loading && !data && <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-sm text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />Pulling live positioning from 9 brokers and 3 crypto exchanges…</div>}
      {error && !data && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-[12px] text-amber-200">{error} — retrying automatically.</div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2.5">
        {rows.map((r) => <SentCard key={`${r.symbol}-${r.method}`} r={r} />)}
      </div>
      {data && rows.length === 0 && <div className="text-center text-sm text-slate-500 py-6">No instruments match.</div>}
      <p className="text-[10.5px] text-slate-500 leading-relaxed flex gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        Sources (all free, no keys): FXSSI current ratios — live long/short share of open positions at MyFxBook, OANDA, Dukascopy, IG, FXBlue, XM, InstaForex, FiboGroup and AMarkets clients (forex, gold, silver, WTI, Brent, S&amp;P 500, Nasdaq, Dow, DAX, dollar index, BTC/ETH CFDs); crypto USDT perpetuals — OKX, Gate.io and Bitget long/short account ratios. Instruments no source covers (other indices, natural gas, copper) are not shown rather than estimated.
      </p>
    </div>
  );
};
