/**
 * BREAKING NEWS — live, free market-moving headlines (central banks, data, geopolitics, trade,
 * commodities, crypto) merged from public feeds. Refreshes every 60 s. Click a story to read the
 * summary and open the full article at its source.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Flame, Loader2, Radio, RefreshCw, Search, X } from 'lucide-react';

interface NewsItem { id: string; title: string; summary: string; link: string; source: string; kind: string; publishedAt: number; impact: 'HIGH' | 'MEDIUM' | 'LOW'; tags: string[]; category: string }

const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};
const pkt = (t: number) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(t));
const CATS = ['All', 'Geopolitics', 'Central banks', 'Economic data', 'Trade & sanctions', 'Politics', 'Commodities', 'Crypto', 'Markets', 'World'];

export const BreakingNewsPanel: React.FC<{ initialCat?: string }> = ({ initialCat = 'All' }) => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [cat, setCat] = useState(initialCat);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<NewsItem | null>(null);
  const [, tick] = useState(0);

  const load = async () => {
    try {
      const r = await fetch('/api/news/breaking', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      setItems(j.items || []); setUpdatedAt(j.updatedAt); setError(null);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const a = window.setInterval(() => { if (!document.hidden) load(); }, 60_000);
    const b = window.setInterval(() => tick((x) => x + 1), 30_000);
    return () => { window.clearInterval(a); window.clearInterval(b); };
  }, []);

  const list = useMemo(() => items.filter((x) =>
    (impact === 'ALL' || (impact === 'HIGH' ? x.impact === 'HIGH' : x.impact !== 'LOW')) &&
    (cat === 'All' || x.category === cat) &&
    (!q.trim() || `${x.title} ${x.summary} ${x.tags.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()))), [items, impact, cat, q]);
  const highCount = items.filter((x) => x.impact === 'HIGH' && x.publishedAt > Date.now() - 6 * 3600_000).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-200"><Radio className="w-3.5 h-3.5 animate-pulse" />LIVE · {items.length} stories</span>
        {highCount > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-200"><Flame className="w-3.5 h-3.5" />{highCount} high-impact in the last 6h</span>}
        <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden text-[11px] font-semibold">
          {(['ALL', 'HIGH', 'MEDIUM'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setImpact(k)} className={`px-2.5 py-1 cursor-pointer ${impact === k ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}>{k === 'ALL' ? 'All impact' : k === 'HIGH' ? 'High only' : 'Medium +'}</button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Fed, oil, war, USD…" className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-slate-100 w-56 max-w-full" />
        </div>
        <button type="button" onClick={() => { setLoading(true); load(); }} className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white cursor-pointer" title="Refresh now"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATS.map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] cursor-pointer ${cat === c ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{c}</button>
        ))}
      </div>

      {error && <div className="px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-[12px] text-rose-200 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />News feeds unavailable right now ({error}). Retrying every minute.</div>}
      {loading && !items.length && <div className="py-10 text-center text-[12px] text-slate-400 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading live headlines…</div>}

      <div className="grid gap-2">
        {list.map((x) => (
          <button key={x.id} type="button" onClick={() => setOpen(x)}
            className={`text-left rounded-xl border p-3 transition cursor-pointer hover:-translate-y-px ${x.impact === 'HIGH' ? 'border-rose-500/40 bg-rose-500/[0.06] hover:border-rose-400/70' : x.impact === 'MEDIUM' ? 'border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-400/60' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}>
            <div className="flex items-center gap-2 flex-wrap text-[10.5px]">
              <span className={`font-extrabold uppercase px-1.5 py-0.5 rounded ${x.impact === 'HIGH' ? 'bg-rose-500 text-white' : x.impact === 'MEDIUM' ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'}`}>{x.impact}</span>
              <span className="text-cyan-300 font-semibold">{x.category}</span>
              <span className="text-slate-500">{x.source}</span>
              <span className="text-slate-500 ml-auto" title={pkt(x.publishedAt)}>{ago(x.publishedAt)}</span>
            </div>
            <div className="mt-1 text-[13.5px] font-semibold text-slate-100 leading-snug">{x.title}</div>
            {x.tags.length > 0 && <div className="mt-1.5 flex gap-1 flex-wrap">{x.tags.map((t) => <span key={t} className="text-[10px] font-mono-code px-1.5 py-0.5 rounded border border-slate-700 text-slate-300">{t}</span>)}</div>}
          </button>
        ))}
        {!loading && !error && list.length === 0 && <div className="py-8 text-center text-[12px] text-slate-500">No stories match these filters.</div>}
      </div>
      <div className="text-[10px] text-slate-500">Free public feeds: Investing.com, CNBC, FXEmpire, BBC, Al Jazeera and Google News. Updated {updatedAt ? ago(Date.parse(updatedAt)) : '—'}; refreshes every minute. Impact and affected currencies are rated automatically from the headline.</div>

      {open && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(null)}>
          <div className="w-full sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-[#0b1020] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span className={`font-extrabold uppercase px-1.5 py-0.5 rounded ${open.impact === 'HIGH' ? 'bg-rose-500 text-white' : open.impact === 'MEDIUM' ? 'bg-amber-400 text-slate-950' : 'bg-slate-700 text-slate-200'}`}>{open.impact} impact</span>
                  <span className="text-cyan-300 font-semibold">{open.category}</span>
                  <span className="text-slate-400">{open.source} · {pkt(open.publishedAt)} PKT</span>
                </div>
                <h3 className="mt-2 text-[18px] font-bold text-slate-50 leading-snug">{open.title}</h3>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            {open.summary ? <p className="mt-3 text-[14px] leading-relaxed text-slate-300">{open.summary}</p> : <p className="mt-3 text-[13px] text-slate-500">The source did not include a summary — open the full article below.</p>}
            {open.tags.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[10px] uppercase tracking-widest text-slate-500">Likely to move</div>
                <div className="mt-1.5 flex gap-1.5 flex-wrap">{open.tags.map((t) => <span key={t} className="text-[12px] font-mono-code font-bold px-2 py-0.5 rounded-md border border-cyan-500/40 text-cyan-200">{t}</span>)}</div>
                {open.impact === 'HIGH' && <div className="mt-2 text-[11.5px] text-amber-200">High-impact story: expect wider spreads and fast moves — reduce size or wait for the reaction to settle.</div>}
              </div>
            )}
            <a href={open.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold text-[13px]">Read the full article at {open.source} <ExternalLink className="w-4 h-4" /></a>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreakingNewsPanel;
