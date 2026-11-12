import React, { useMemo, useState } from 'react';
import { ExternalLink, Search, Building2, LineChart } from 'lucide-react';
import { ALL_MARKETS, PK_INDICES, PK_STOCKS, WORLD_INDICES, WORLD_STOCKS, type MktEntry } from '../../data/markets';
import { URDU_FONT, type Lang } from './AdvancedLibrary';

type Group = 'all' | 'pk' | 'world' | 'index' | 'stock';

/**
 * Searchable reference directory of Pakistan (PSX) and world indices & major stocks.
 * Each entry links to the authoritative live source (PSX company page, or the index/quote page).
 * This is a catalog, not a live fundamentals feed — made clear in the banner.
 */
export const MarketsCatalog: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ur = lang === 'ur';
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<Group>('all');
  const ql = q.trim().toLowerCase();

  const base = useMemo(() => {
    if (group === 'pk') return [...PK_INDICES, ...PK_STOCKS];
    if (group === 'world') return [...WORLD_INDICES, ...WORLD_STOCKS];
    if (group === 'index') return ALL_MARKETS.filter((m) => m.kind === 'index');
    if (group === 'stock') return ALL_MARKETS.filter((m) => m.kind === 'stock');
    return ALL_MARKETS;
  }, [group]);

  const results = useMemo(() => base.filter((m) => !ql || `${m.sym} ${m.name} ${m.sector} ${m.market}`.toLowerCase().includes(ql)), [base, ql]);

  // group results by market for display
  const sections = useMemo(() => {
    const order = ['PSX', 'US', 'UK', 'Germany', 'France', 'Europe', 'Japan', 'Hong Kong', 'China', 'India', 'South Korea', 'Australia', 'Canada'];
    const by: Record<string, MktEntry[]> = {};
    for (const m of results) (by[m.market] ||= []).push(m);
    return Object.entries(by).sort((a, b) => {
      const ia = order.indexOf(a[0]); const ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [results]);

  const chips: { id: Group; en: string; ur: string }[] = [
    { id: 'all', en: 'All', ur: 'سب' },
    { id: 'pk', en: 'Pakistan (PSX)', ur: 'پاکستان (PSX)' },
    { id: 'world', en: 'World', ur: 'دنیا' },
    { id: 'index', en: 'Indices', ur: 'انڈیکس' },
    { id: 'stock', en: 'Stocks', ur: 'اسٹاکس' },
  ];
  const uf = ur ? URDU_FONT : undefined;

  return (
    <div className="space-y-4" data-testid="markets-catalog" dir={ur ? 'rtl' : 'ltr'}>
      <section className="rounded-3xl border border-sky-400/30 bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,0.16),transparent_60%),#06101c] p-5 sm:p-6 space-y-2">
        <div className="text-[11px] font-mono-code uppercase tracking-[0.25em] text-sky-300" dir="ltr">Markets · Pakistan + World</div>
        <h2 className="text-xl sm:text-3xl font-black text-white" style={uf}>{ur ? 'مارکیٹ ڈائریکٹری — انڈیکس اور اسٹاکس' : 'Market Directory — Indices & Stocks'}</h2>
        <p className={`text-[13px] text-slate-300 max-w-3xl ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={uf}>
          {ur
            ? 'پاکستان (PSX) اور دنیا کے بڑے انڈیکس و اسٹاکس تلاش کریں۔ ہر اندراج براہِ راست سرکاری ذریعہ (PSX کمپنی صفحہ یا کوٹ صفحہ) سے جُڑا ہے جہاں لائیو، تصدیق شدہ نمبر ملتے ہیں۔'
            : 'Search Pakistan (PSX) and the world’s major indices and stocks. Every entry links to the authoritative live source (its PSX company page or quote page) for current, verified numbers.'}
        </p>
        <p className="text-[11px] text-amber-300/90" style={uf}>
          {ur
            ? 'نوٹ: یہ ایک حوالہ ڈائریکٹری ہے، لائیو فی اسٹاک فنڈامینٹل فیڈ نہیں۔ PSX کا مکمل و تازہ ترین فہرست ہمیشہ psx.com.pk پر ہے۔'
            : 'Note: this is a reference directory, not a live per-stock fundamentals feed. The complete, up-to-the-minute PSX list is always on psx.com.pk.'}
        </p>
      </section>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1 max-w-md">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-500 ${ur ? 'right-3' : 'left-3'}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="markets-search" aria-label={ur ? 'اسٹاک یا انڈیکس تلاش کریں' : 'Search stock or index'}
            placeholder={ur ? 'نام یا سمبل تلاش کریں… (مثلاً OGDC، KSE-100، Apple)' : 'Search name or symbol… (e.g. OGDC, KSE-100, Apple)'}
            className={`w-full py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-sky-400 outline-none text-sm text-slate-100 placeholder:text-slate-500 ${ur ? 'pr-9 pl-3' : 'pl-9 pr-3'}`} style={uf} />
        </label>
        <span className="self-center text-[12px] text-slate-400">{results.length} {ur ? 'نتائج' : 'results'}</span>
      </div>

      <nav className="flex gap-1.5 flex-wrap" data-testid="markets-filters">
        {chips.map((c) => (
          <button key={c.id} type="button" onClick={() => setGroup(c.id)} style={uf}
            className={`px-3 py-1.5 rounded-full border text-[12px] font-bold cursor-pointer ${group === c.id ? 'border-sky-400 bg-sky-500/15 text-sky-100' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
            {ur ? c.ur : c.en}
          </button>
        ))}
      </nav>

      {sections.map(([market, items]) => (
        <section key={market} className="space-y-2">
          <h3 className="text-[13px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-2" dir="ltr">
            {market === 'PSX' ? <Building2 className="w-4 h-4 text-emerald-400" /> : <LineChart className="w-4 h-4 text-sky-400" />}
            {market}
            <span className="text-slate-500 font-mono-code text-[11px]">{items.length}</span>
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map((m) => (
              <a key={m.market + m.sym} href={m.url} target="_blank" rel="noopener noreferrer" dir="ltr"
                className="group rounded-2xl border border-slate-800 bg-slate-950/70 hover:border-sky-400/50 p-3 flex items-start gap-3 transition">
                <span className={`shrink-0 mt-0.5 px-2 py-1 rounded-lg text-[10px] font-black ${m.kind === 'index' ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-800 text-slate-300'}`}>{m.sym}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-slate-100 truncate">{m.name}</span>
                  <span className="block text-[11.5px] text-slate-400">{m.sector}{m.kind === 'index' ? '' : ` · ${m.kind}`}</span>
                  {m.note && <span className="block text-[11px] text-slate-500 mt-0.5 leading-snug">{m.note}</span>}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-sky-300 shrink-0" />
              </a>
            ))}
          </div>
        </section>
      ))}
      {!results.length && <p className="text-sm text-slate-500" style={uf}>{ur ? `“${q}” سے کوئی نتیجہ نہیں ملا۔` : `No match for “${q}”.`}</p>}
    </div>
  );
};

export default MarketsCatalog;
