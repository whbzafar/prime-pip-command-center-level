import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Crown, FileDown, ExternalLink, Flame, RefreshCw, ShieldAlert } from 'lucide-react';
import { fetchJsonSafe, fmtScore, scoreColor, timeAgo } from './ui';

export interface PickRow {
  symbol: string; name: string; assetClass: string; region: string | null; sector: string | null; kind: string | null;
  score: number | null; bullishPct: number | null; bearishPct: number | null; confidence: number; bias: string;
  price: number | null; currency: string | null; change1y: number | null; pe: number | null; divYield: number | null; members: number | null; covered: number | null;
  pillars: Array<{ id: string; name: string; score: number | null }>; drivers: Array<{ name: string; impact: number }>;
}
export interface Picks {
  generatedAt: string; dataAsOf: string | null; tracked: number; scoredStocks: number;
  criteria: { vip: string; strong: string };
  vip: PickRow[]; strongBullish: PickRow[]; strongBearish: PickRow[];
  regions: Record<string, { bullish: PickRow[]; bearish: PickRow[] }>;
  indices: { bullish: PickRow[]; bearish: PickRow[] };
  commodities: { bullish: PickRow[]; bearish: PickRow[]; all: PickRow[] };
  forex: { all: PickRow[] }; crypto: { all: PickRow[] };
  noFreeData: Array<{ symbol: string; name: string; region: string; url: string }>;
}

export const REGION_LABEL: Record<string, string> = { PK: 'Pakistan', ASIA: 'Asia', US: 'United States', EU: 'Europe', GLOBAL: 'Other global' };

let cache: { at: number; data: Picks } | null = null;
export function usePicks(pollMs = 5 * 60_000) {
  const [data, setData] = useState<Picks | null>(cache?.data || null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const j = await fetchJsonSafe<{ ok: boolean; data: Picks }>('/api/macro/picks');
        cache = { at: Date.now(), data: j.data };
        if (live) { setData(j.data); setError(null); }
      } catch (e: any) { if (live) setError(e?.message || 'Picks unavailable'); }
    };
    if (!cache || Date.now() - cache.at > pollMs) load();
    const id = setInterval(load, pollMs);
    return () => { live = false; clearInterval(id); };
  }, [pollMs]);
  return { data, error };
}

const PkrNote = ({ r }: { r: PickRow }) => (r.price !== null ? <span className="text-slate-500">{r.currency || ''} {r.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span> : null);

export const PickCard: React.FC<{ r: PickRow; onOpen?: (r: PickRow) => void; vip?: boolean }> = ({ r, onOpen, vip }) => {
  const up = (r.score ?? 0) >= 0;
  return (
    <button type="button" onClick={() => onOpen?.(r)} data-testid="pick-card"
      className={`text-left rounded-2xl border p-3 transition-colors cursor-pointer ${vip ? 'border-amber-400/50 bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 hover:border-amber-300/80' : up ? 'border-emerald-500/25 bg-emerald-500/[0.04] hover:border-emerald-400/60' : 'border-rose-500/25 bg-rose-500/[0.04] hover:border-rose-400/60'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {vip ? <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" /> : up ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
            <span className="font-military font-bold text-slate-100 truncate">{r.symbol}</span>
            {r.region && <span className="text-[9.5px] font-mono-code uppercase text-slate-500">{r.region}</span>}
          </div>
          <div className="text-[11px] text-slate-400 truncate">{r.name}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-mono-code text-lg font-bold ${scoreColor(r.score)}`}>{fmtScore(r.score)}</div>
          <div className="text-[10px] font-mono-code text-slate-500">conf {r.confidence}%</div>
        </div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-rose-500/40 overflow-hidden"><div className="h-full bg-emerald-400" style={{ width: `${r.bullishPct ?? 50}%` }} /></div>
      <div className="mt-1 flex justify-between text-[10px] font-mono-code"><span className="text-emerald-400">{r.bullishPct === null ? '' : `${Math.round(r.bullishPct)}% bull`}</span><span className="text-rose-400">{r.bullishPct === null ? '' : `${100 - Math.round(r.bullishPct)}% bear`}</span></div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] font-mono-code text-slate-400">
        {r.sector && <span className="truncate max-w-[10rem]">{r.sector}</span>}
        <PkrNote r={r} />
        {r.change1y !== null && <span className={r.change1y >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}>1y {r.change1y >= 0 ? '+' : ''}{r.change1y}%</span>}
        {r.pe !== null && <span>P/E {r.pe}</span>}
        {r.divYield !== null && <span>yield {r.divYield}%</span>}
        {r.members !== null && <span>{r.covered ?? '?'}/{r.members} companies scored</span>}
      </div>
      {r.drivers.length > 0 && <div className="mt-1 text-[10.5px] text-slate-500 truncate">Driven by {r.drivers.map((d) => d.name).join(' · ')}</div>}
    </button>
  );
};

const Section: React.FC<{ title: string; sub?: string; icon?: React.ReactNode; rows: PickRow[]; onOpen?: (r: PickRow) => void; vip?: boolean; empty: string }> = ({ title, sub, icon, rows, onOpen, vip, empty }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">{icon}<span className="text-[11px] font-mono-code uppercase tracking-widest text-cyan-300">{title}</span>{sub && <span className="text-[10.5px] text-slate-500">{sub}</span>}</div>
    {rows.length ? <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 xl:grid-cols-3 gap-2">{rows.map((r) => <PickCard key={r.symbol} r={r} onOpen={onOpen} vip={vip} />)}</div>
      : <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-4 text-[12px] text-slate-500">{empty}</div>}
  </div>
);

/** Long-term picks: VIP, Strong Bullish, Strong Bearish, by region, indices and commodities. */
export const PicksView: React.FC<{ onOpen: (r: PickRow) => void }> = ({ onOpen }) => {
  const { data, error } = usePicks();
  const [region, setRegion] = useState<string>('ALL');
  const filt = (rows: PickRow[]) => (region === 'ALL' ? rows : rows.filter((r) => r.region === region));
  const regionRows = useMemo(() => {
    if (!data) return { bull: [] as PickRow[], bear: [] as PickRow[] };
    const regs = region === 'ALL' ? Object.keys(data.regions) : [region];
    const bull = regs.flatMap((k) => data.regions[k]?.bullish || []).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 18);
    const bear = regs.flatMap((k) => data.regions[k]?.bearish || []).sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 18);
    return { bull, bear };
  }, [data, region]);
  if (!data) return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-10 text-center text-sm text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />{error || 'Ranking every tracked stock, index, commodity and currency…'}</div>;
  return (
    <div className="space-y-5" data-testid="picks-view">
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.05] p-4 text-[12px] text-slate-300 leading-relaxed">
        <b className="text-white">Long-term picks.</b> Ranked from the same fundamental scores shown in every tab — reported revenue, profit, margins, debt, cash flow, analyst outlook and the country backdrop. {data.scoredStocks} of {data.tracked} tracked stocks currently have enough data to score (updated {timeAgo(data.generatedAt)}; company statements as of {data.dataAsOf ? timeAgo(data.dataAsOf) : 'n/a'}).
        <div className="mt-1 text-[11px] text-slate-400"><b className="text-amber-300">VIP</b> — {data.criteria.vip}</div>
        <div className="text-[11px] text-slate-400"><b className="text-emerald-300">Strong</b> — {data.criteria.strong}</div>
        <div className="mt-1 text-[11px] text-slate-500">Fundamentals describe business quality and direction — they are not a price forecast or personal advice. Check price, risk and your own plan before investing.</div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" data-testid="picks-pdf" onClick={() => import('../../utils/macroPdf').then((m) => m.exportPicksPdf(data))} className="order-last ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-400/50 bg-emerald-500/10 text-[11.5px] font-semibold text-emerald-100 hover:bg-emerald-500/20 cursor-pointer"><FileDown className="w-3.5 h-3.5" />Download PDF (everything listed)</button>
        {['ALL', 'PK', 'ASIA', 'US', 'EU', 'GLOBAL'].map((k) => (
          <button key={k} type="button" onClick={() => setRegion(k)} className={`px-3 py-1.5 rounded-xl border text-[11.5px] font-semibold cursor-pointer ${region === k ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100' : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'}`}>{k === 'ALL' ? 'All regions' : REGION_LABEL[k]}</button>
        ))}
      </div>
      <Section title="VIP long-term picks" sub="highest-quality, best-supported bullish stocks" icon={<Crown className="w-4 h-4 text-amber-300" />} rows={filt(data.vip)} onOpen={onOpen} vip empty="No stock passes every VIP check in this region right now — the bar is deliberately high." />
      <Section title="Strong bullish" sub="score +60 or higher" icon={<Flame className="w-4 h-4 text-emerald-400" />} rows={filt(data.strongBullish)} onOpen={onOpen} empty="No strong bullish stocks in this region right now." />
      <Section title={`Best fundamentals · ${region === 'ALL' ? 'all regions' : REGION_LABEL[region]}`} sub="bullish, strongest first" icon={<ArrowUpRight className="w-4 h-4 text-emerald-400" />} rows={regionRows.bull} onOpen={onOpen} empty="No bullish stocks with enough data here right now." />
      <Section title={`Weakest fundamentals · ${region === 'ALL' ? 'all regions' : REGION_LABEL[region]}`} sub="bearish, weakest first — avoid or be cautious" icon={<ArrowDownRight className="w-4 h-4 text-rose-400" />} rows={regionRows.bear} onOpen={onOpen} empty="No bearish stocks with enough data here right now." />
      <Section title="Strong bearish" sub="score −60 or lower" icon={<ShieldAlert className="w-4 h-4 text-rose-400" />} rows={filt(data.strongBearish)} onOpen={onOpen} empty="No strong bearish stocks in this region right now." />
      <Section title="Indices & sector baskets — most bullish" rows={data.indices.bullish} onOpen={onOpen} empty="No bullish indices right now." />
      <Section title="Indices & sector baskets — most bearish" rows={data.indices.bearish} onOpen={onOpen} empty="No bearish indices right now." />
      <Section title="Commodities" sub="live fundamental bias" rows={data.commodities.all} onOpen={onOpen} empty="Commodity scores are loading." />
      <details className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
        <summary className="cursor-pointer text-[12px] text-slate-300">{data.noFreeData.length} tracked companies have no free fundamentals feed (not scored — never guessed)</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.noFreeData.map((n) => <a key={n.symbol} href={n.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-800 bg-slate-900/70 text-[11px] text-slate-300 hover:text-white">{n.symbol} · {n.name}<ExternalLink className="w-3 h-3 opacity-60" /></a>)}
        </div>
      </details>
    </div>
  );
};
