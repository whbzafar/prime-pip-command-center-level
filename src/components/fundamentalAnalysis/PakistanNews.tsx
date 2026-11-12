import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus, Radio, RefreshCw } from 'lucide-react';
import { fetchJsonSafe } from './ui';

export interface PkNews {
  id: string; title: string; summary: string; link: string; source: string; publishedAt: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW'; category: string; sectors: string[]; tone: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

let cache: { at: number; items: PkNews[]; updatedAt: string; sources: Record<string, number | string> } | null = null;

/** Live Pakistan market news; refreshes itself (default every 90 s) and when the tab becomes visible. */
export function usePkNews(pollMs = 90_000) {
  const [state, setState] = useState(cache);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const j = await fetchJsonSafe<{ ok: boolean; items: PkNews[]; updatedAt: string; sources: Record<string, number | string> }>('/api/news/pakistan');
        cache = { at: Date.now(), items: j.items, updatedAt: j.updatedAt, sources: j.sources };
        if (live) { setState(cache); setError(null); }
      } catch (e: any) { if (live) setError(e?.message || 'Pakistan news unavailable'); }
    };
    if (!cache || Date.now() - cache.at > pollMs / 2) load();
    const id = setInterval(() => { if (document.visibilityState === 'visible') load(); }, pollMs);
    const vis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', vis);
    return () => { live = false; clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [pollMs]);
  return { items: state?.items ?? null, updatedAt: state?.updatedAt ?? null, sources: state?.sources ?? {}, error };
}

export const ago = (t: number) => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; };
const clean = (s: string) => String(s || '').replace(/<[^>]*>?/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

const FILTERS = ['All', 'High impact', 'Stock market', 'Banks & rates', 'Macro & IMF', 'Oil & gas', 'Power', 'Politics & security', 'Cement', 'Fertilizer', 'Autos', 'Textile & exports', 'Technology'];

export const PakistanNewsCard: React.FC<{ n: PkNews; compact?: boolean }> = ({ n, compact }) => {
  const sm = clean(n.summary);
  const Tone = n.tone === 'POSITIVE' ? ArrowUpRight : n.tone === 'NEGATIVE' ? ArrowDownRight : Minus;
  const tcol = n.tone === 'POSITIVE' ? 'text-emerald-300 bg-emerald-500/15' : n.tone === 'NEGATIVE' ? 'text-rose-300 bg-rose-500/15' : 'text-slate-300 bg-slate-700/40';
  return (
    <div data-testid="pk-news-item" className={`rounded-xl border px-3 py-2.5 ${n.impact === 'HIGH' ? 'border-rose-500/30 bg-gradient-to-r from-rose-500/[0.08] to-transparent' : 'border-slate-800 bg-slate-950/60'}`}>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className={`px-1.5 py-[1px] rounded font-bold ${n.impact === 'HIGH' ? 'bg-rose-500/20 text-rose-200' : 'bg-amber-500/15 text-amber-200'}`}>{n.impact === 'HIGH' ? 'HIGH IMPACT' : 'MARKET MOVER'}</span>
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded font-bold ${tcol}`} title="Keyword-based tone of the headline — not a forecast"><Tone className="w-3 h-3" />{n.tone === 'POSITIVE' ? 'Positive tone' : n.tone === 'NEGATIVE' ? 'Negative tone' : 'Neutral'}</span>
        {n.sectors.map((s) => <span key={s} className="px-1.5 py-[1px] rounded bg-cyan-500/10 text-cyan-200">{s}</span>)}
        <span className="text-slate-500 ml-auto">{ago(n.publishedAt)}</span>
      </div>
      <a href={n.link} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[12.5px] font-semibold text-slate-100 hover:text-cyan-200 leading-snug">{n.title} <ExternalLink className="inline w-3 h-3 opacity-60" /></a>
      {!compact && sm && !sm.startsWith(n.title.slice(0, 30)) && <div className="mt-0.5 text-[11px] text-slate-400 line-clamp-2">{sm}</div>}
      <div className="mt-0.5 text-[10px] text-slate-500">{n.source}</div>
    </div>
  );
};

/** Dedicated Pakistan market-news feed: stories that move the PSX / KSE-100, live. */
export const PakistanNewsView: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { items, updatedAt, sources, error } = usePkNews();
  const [f, setF] = useState('All');
  const shown = useMemo(() => (items || []).filter((n) => f === 'All' ? true : f === 'High impact' ? n.impact === 'HIGH' : n.sectors.includes(f)), [items, f]);
  const live = Object.values(sources).filter((v) => typeof v === 'number' && v > 0).length;
  return (
    <div className="space-y-3" data-testid="pk-news">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-3 text-[11.5px] text-slate-300 leading-relaxed">
        <div className="flex items-center gap-2"><Radio className="w-4 h-4 text-emerald-400" /><b className="text-white">Pakistan market news · live</b>
          <span className="text-slate-500 ml-auto">{updatedAt ? `updated ${ago(Date.parse(updatedAt))} · auto-refresh 90 s` : 'loading…'}</span></div>
        <div className="mt-1 text-slate-400">Stories about the SBP, IMF, budget, rupee, oil prices, politics and security, and the PSX itself — from Dawn, Express Tribune, Business Recorder and Google News ({live} sources responding). “Tone” is a keyword reading of the headline, not a forecast.</div>
      </div>
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((k) => <button key={k} type="button" onClick={() => setF(k)} className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-semibold cursor-pointer ${f === k ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100' : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'}`}>{k}</button>)}
      </div>
      {!items && <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center text-sm text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />{error || 'Loading Pakistan market news…'}</div>}
      {items && !shown.length && <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center text-[12px] text-slate-500">No stories in this category right now.</div>}
      <div className="space-y-2">{shown.slice(0, compact ? 20 : 80).map((n) => <PakistanNewsCard key={n.id} n={n} compact={compact} />)}</div>
    </div>
  );
};
