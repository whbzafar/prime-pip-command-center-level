import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Users } from 'lucide-react';
import type { AssetResult, PairResult } from './types';
import { AssetDetail } from './AssetDetail';
import { BiasPill, BullBearBar, fmtScore, scoreColor } from './ui';

type Filter = 'ALL' | 'FOREX' | 'COMMODITIES' | 'CRYPTO';

export const PairsView: React.FC<{ pairs: PairResult[]; generatedAt: string; initial?: string | null }> = ({ pairs, generatedAt, initial }) => {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(initial || null);
  const [detail, setDetail] = useState<{ data: PairResult; base: AssetResult | null; quote: AssetResult | null } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (initial) setSel(initial); }, [initial]);

  useEffect(() => {
    if (!sel) { setDetail(null); return; }
    let alive = true;
    setLoading(true);
    fetch(`/api/macro/pair/${encodeURIComponent(sel)}`)
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok) setDetail({ data: j.data, base: j.base, quote: j.quote }); })
      .catch(() => undefined)
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [sel, generatedAt]);

  const rows = useMemo(() => pairs
    .filter((p) => filter === 'ALL' || p.assetClass === filter)
    .filter((p) => !q || p.display.toLowerCase().includes(q.toLowerCase().replace(/\s/g, '')) || p.symbol.toLowerCase().includes(q.toLowerCase())),
  [pairs, filter, q]);

  if (sel && detail) {
    const p = detail.data;
    const usdPriced = p.quote === 'USD' && p.assetClass !== 'FOREX';
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSel(null)} className="inline-flex items-center gap-1.5 text-[12px] text-cyan-400 hover:text-cyan-300 cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> All pairs
        </button>
        <div className="grid xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-4 items-start">
          {/* LEFT: pair verdict + base analysis */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 via-slate-950 to-slate-950 p-5">
              <div className="text-[10px] font-mono-code uppercase tracking-widest text-cyan-400">Pair fundamental verdict</div>
              <div className="flex flex-wrap items-end gap-3 mt-1">
                <h2 className="font-military text-3xl font-bold text-white">{p.display}</h2>
                <span className={`font-mono-code text-2xl font-bold ${scoreColor(p.score)}`}>{fmtScore(p.score)}</span>
                <BiasPill bias={p.bias} score={p.score} />
              </div>
              <div className="mt-3 flex items-center gap-3 text-[12px] font-mono-code">
                <span className="text-emerald-400 font-bold">{p.bullishPct === null ? '—' : `${p.bullishPct.toFixed(1)}% Bullish`}</span>
                <span className="text-rose-400 font-bold">{p.bullishPct === null ? '—' : `${(100 - p.bullishPct).toFixed(1)}% Bearish`}</span>
                <span className="text-slate-500">confidence {p.confidence}%</span>
              </div>
              <div className="mt-2"><BullBearBar bullishPct={p.bullishPct} height="h-3" /></div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
                  <div className="text-[10px] font-mono-code text-slate-500">{p.base}{usdPriced ? ' own drivers' : ''}</div>
                  <div className={`font-mono-code text-lg font-bold ${scoreColor(p.baseScore)}`}>{fmtScore(p.baseScore)}</div>
                </div>
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5 flex flex-col justify-center">
                  <div className="text-[10px] font-mono-code text-slate-500">{usdPriced ? 'own − USD (weighted)' : '(base − quote) ÷ 2'}</div>
                  <div className="text-slate-300 text-lg">→</div>
                </div>
                <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5">
                  <div className="text-[10px] font-mono-code text-slate-500">{p.quote}</div>
                  <div className={`font-mono-code text-lg font-bold ${scoreColor(p.quoteScore)}`}>{fmtScore(p.quoteScore)}</div>
                </div>
              </div>
              <p className="mt-3 text-[12.5px] text-slate-300 leading-relaxed">{p.explanation}</p>
              {p.retailSentiment && (
                <div className="mt-3 flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
                  <Users className="w-3.5 h-3.5" /> Retail: {p.retailSentiment.longPct}% long / {p.retailSentiment.shortPct}% short ({p.retailSentiment.source})
                </div>
              )}
              {p.correlationToUsd !== null && p.correlationToUsd !== undefined && (
                <div className="mt-1 text-[11px] font-mono-code text-slate-500">90-day correlation with DXY: {Math.round(p.correlationToUsd * 100)}%</div>
              )}
            </div>
            {detail.base && <AssetDetail asset={detail.base} compact title={`${p.base} — fundamental breakdown`} mirrors={detail.quote ? { [detail.quote.symbol]: detail.quote } : {}} />}
          </div>
          {/* RIGHT: quote analysis */}
          <div className="space-y-4">
            {detail.quote && <AssetDetail asset={detail.quote} compact title={`${p.quote} — fundamental breakdown${usdPriced ? ' (enters inverted)' : ''}`} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'FOREX', 'COMMODITIES', 'CRYPTO'] as Filter[]).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono-code border cursor-pointer ${filter === f ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}>
            {f === 'ALL' ? 'All pairs' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pair…" aria-label="Search pairs"
            className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[12px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50" />
        </div>
      </div>
      {loading && sel && <div className="text-[11px] font-mono-code text-slate-500">Loading {sel}…</div>}
      <div className="rounded-2xl border border-slate-800 overflow-hidden">
        <div className="grid grid-cols-[1fr_90px_1.3fr_80px] sm:grid-cols-[1.1fr_80px_80px_90px_1.6fr_90px] gap-2 px-4 py-2 bg-slate-900/80 text-[10px] font-mono-code uppercase text-slate-500">
          <span>Pair</span><span className="hidden sm:block text-right">Base</span><span className="hidden sm:block text-right">Quote</span><span className="text-right">Score</span><span>Bullish / Bearish</span><span className="text-right">Bias</span>
        </div>
        {rows.map((p) => (
          <button key={p.symbol} type="button" onClick={() => setSel(p.symbol)}
            className="w-full grid grid-cols-[1fr_90px_1.3fr_80px] sm:grid-cols-[1.1fr_80px_80px_90px_1.6fr_90px] gap-2 px-4 py-2.5 items-center border-t border-slate-800/70 bg-slate-950/50 hover:bg-slate-900/70 text-left cursor-pointer">
            <span className="font-military font-bold text-slate-100">{p.display}</span>
            <span className={`hidden sm:block text-right font-mono-code text-[12px] ${scoreColor(p.baseScore)}`}>{fmtScore(p.baseScore)}</span>
            <span className={`hidden sm:block text-right font-mono-code text-[12px] ${scoreColor(p.quoteScore)}`}>{fmtScore(p.quoteScore)}</span>
            <span className={`text-right font-mono-code font-bold ${scoreColor(p.score)}`}>{fmtScore(p.score)}</span>
            <div className="flex items-center gap-2">
              <BullBearBar bullishPct={p.bullishPct} />
              <span className="text-[10.5px] font-mono-code text-slate-400 w-10 shrink-0">{p.bullishPct === null ? '—' : `${p.bullishPct.toFixed(0)}%`}</span>
            </div>
            <span className="text-right"><BiasPill bias={p.bias} score={p.score} /></span>
          </button>
        ))}
        {rows.length === 0 && <div className="p-6 text-center text-sm text-slate-500">No pairs match.</div>}
      </div>
    </div>
  );
};
