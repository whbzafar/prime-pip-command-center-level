import React, { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Search } from 'lucide-react';
import { DIVISIONS, TOPIC_COUNT, invest, wiki } from '../../data/advanced';

export type Lang = 'en' | 'ur';
export const URDU_FONT = { fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif" } as const;

/**
 * Institutional research library: 22 divisions, ~470 topics. Every topic is explained in simple
 * English and Urdu, with read-more links (Investopedia + Wikipedia search, plus a few curated pages per division).
 */
export const AdvancedLibrary: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ur = lang === 'ur';
  const [div, setDiv] = useState<string>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const ql = q.trim().toLowerCase();
  const shown = useMemo(() => DIVISIONS
    .filter((d) => div === 'all' || d.id === div)
    .map((d) => ({ ...d, list: d.topics.map((t, i) => ({ t, i })).filter(({ t }) => !ql || t.join(' ').toLowerCase().includes(ql)) }))
    .filter((d) => d.list.length), [div, ql]);
  const matches = shown.reduce((n, d) => n + d.list.length, 0);
  const txt = ur ? 'text-right' : '';
  return (
    <div className="space-y-4" data-testid="advanced-library" dir={ur ? 'rtl' : 'ltr'}>
      <section className="rounded-3xl border border-violet-400/30 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.18),transparent_60%),#08061a] p-5 sm:p-6 space-y-2">
        <div className="text-[11px] font-mono-code uppercase tracking-[0.25em] text-violet-300" dir="ltr">Global Institutional Trading & Financial Market Intelligence</div>
        <h2 className="text-xl sm:text-3xl font-black text-white" style={ur ? URDU_FONT : undefined}>{ur ? 'ادارہ جاتی ریسرچ لائبریری' : 'Institutional Research Library'}</h2>
        <p className={`text-[13px] text-slate-300 max-w-3xl ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={ur ? URDU_FONT : undefined}>
          {ur ? `${DIVISIONS.length} شعبے اور ${TOPIC_COUNT} موضوعات — وہی علوم جو انویسٹمنٹ بینک، ہیج فنڈز اور مرکزی بینک استعمال کرتے ہیں، ہر ایک آسان الفاظ میں، مزید پڑھنے کے لنکس کے ساتھ۔` : `${DIVISIONS.length} divisions and ${TOPIC_COUNT} topics — the disciplines used by investment banks, hedge funds and central banks, each explained in simple words with links to read more.`}
        </p>
      </section>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1 max-w-md">
          <Search className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-500 ${ur ? 'right-3' : 'left-3'}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="library-search" aria-label={ur ? 'موضوع تلاش کریں' : 'Search topics'}
            placeholder={ur ? `${TOPIC_COUNT} موضوعات میں تلاش کریں…` : `Search ${TOPIC_COUNT} topics… (e.g. VWAP, carry, gamma)`}
            className={`w-full py-2 rounded-xl bg-slate-950 border border-slate-700 focus:border-violet-400 outline-none text-sm text-slate-100 placeholder:text-slate-500 ${ur ? 'pr-9 pl-3' : 'pl-9 pr-3'}`} style={ur ? URDU_FONT : undefined} />
        </label>
        {ql && <span className="self-center text-[12px] text-slate-400">{matches} {ur ? 'نتائج' : 'results'}</span>}
      </div>

      <nav className="flex gap-1.5 overflow-x-auto pb-1" aria-label={ur ? 'شعبے' : 'Divisions'} data-testid="library-divisions">
        <button type="button" onClick={() => setDiv('all')} className={`shrink-0 px-3 py-1.5 rounded-full border text-[12px] font-bold cursor-pointer ${div === 'all' ? 'border-violet-400 bg-violet-500/15 text-violet-100' : 'border-slate-700 text-slate-400 hover:text-white'}`} style={ur ? URDU_FONT : undefined}>{ur ? 'سب' : 'All'} · {TOPIC_COUNT}</button>
        {DIVISIONS.map((d) => (
          <button key={d.id} type="button" onClick={() => setDiv(d.id)} title={d.title.en}
            className={`shrink-0 px-3 py-1.5 rounded-full border text-[12px] font-bold cursor-pointer ${div === d.id ? 'border-violet-400 bg-violet-500/15 text-violet-100' : 'border-slate-700 text-slate-400 hover:text-white'}`} style={ur ? URDU_FONT : undefined}>
            {d.no}. {ur ? d.title.ur : d.title.en}
          </button>
        ))}
      </nav>

      {shown.map((d) => (
        <section key={d.id} className="space-y-2 ppfx-up" data-testid={`division-${d.id}`}>
          <div className={`flex items-baseline gap-2 flex-wrap ${txt}`}>
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-fuchsia-500 text-slate-950 text-[12px] font-black flex items-center justify-center shrink-0">{d.no}</span>
            <h3 className="text-[15px] sm:text-lg font-black text-white" style={ur ? URDU_FONT : undefined}>{ur ? d.title.ur : d.title.en}</h3>
            {!ur && <span className="text-[11px] text-slate-500">{d.topics.length} topics</span>}
          </div>
          {!ql && <p className={`text-[12.5px] text-slate-400 max-w-4xl ${ur ? 'leading-[2.2]' : 'leading-relaxed'}`} style={ur ? URDU_FONT : undefined}>{ur ? d.intro.ur : d.intro.en}</p>}
          {!ql && d.links?.length ? (
            <div className="flex flex-wrap gap-1.5" dir="ltr">
              {d.links.map((k) => <a key={k.url} href={k.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-violet-500/30 bg-violet-500/5 text-[11.5px] font-semibold text-violet-200 hover:text-white">{k.label}<span className="text-slate-500 font-normal">· {k.site}</span><ExternalLink className="w-3 h-3" /></a>)}
            </div>
          ) : null}
          <div className="grid md:grid-cols-2 gap-2">
            {d.list.map(({ t, i }) => {
              const id = `${d.id}-${i}`;
              const on = open === id;
              const [en, urT, enX, urX] = t;
              return (
                <article key={id} className={`rounded-2xl border bg-slate-950/70 transition ${on ? 'border-violet-400/50 md:col-span-2' : 'border-slate-800 hover:border-slate-600'}`}>
                  <button type="button" onClick={() => setOpen(on ? null : id)} aria-expanded={on} className={`w-full flex items-center gap-3 px-4 py-3 cursor-pointer ${ur ? 'text-right' : 'text-left'}`}>
                    <span className="text-[11px] font-mono-code text-violet-300/70 shrink-0" dir="ltr">{d.no}.{i + 1}</span>
                    <span className="flex-1 font-semibold text-slate-100 text-[13.5px]" style={ur ? URDU_FONT : undefined}>{ur ? urT : en}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ${on ? 'rotate-180' : ''}`} />
                  </button>
                  {!on && <p className={`px-4 pb-3 -mt-1 text-[12px] text-slate-400 line-clamp-2 ${ur ? 'leading-[2.1]' : ''}`} style={ur ? URDU_FONT : undefined}>{ur ? urX : enX}</p>}
                  {on && (
                    <div className="px-4 pb-4 space-y-3">
                      <p className={`text-[14px] text-slate-200 ${ur ? 'leading-[2.3]' : 'leading-relaxed'}`} style={ur ? URDU_FONT : undefined}>{ur ? urX : enX}</p>
                      <p className={`text-[12.5px] text-slate-500 border-t border-slate-800 pt-2 ${ur ? 'leading-relaxed text-left' : 'leading-[2.2] text-right'}`} dir={ur ? 'ltr' : 'rtl'} style={ur ? undefined : URDU_FONT}>{ur ? `${en} — ${enX}` : `${urT} — ${urX}`}</p>
                      <div className="flex flex-wrap gap-2" dir="ltr">
                        <a href={invest(en)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[12px] font-semibold text-violet-200 hover:text-white">Read on Investopedia<ExternalLink className="w-3 h-3" /></a>
                        <a href={wiki(en)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-[12px] font-semibold text-violet-200 hover:text-white">Read on Wikipedia<ExternalLink className="w-3 h-3" /></a>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {!shown.length && <p className="text-sm text-slate-500" style={ur ? URDU_FONT : undefined}>{ur ? `“${q}” کا کوئی موضوع نہیں ملا۔` : `No topic matches “${q}”.`}</p>}
      <p className="text-[11px] text-slate-500" style={ur ? URDU_FONT : undefined}>{ur ? 'یہ تعلیمی مواد ہے، سرمایہ کاری کا مشورہ نہیں۔' : 'Educational content, not investment advice.'}</p>
    </div>
  );
};

export default AdvancedLibrary;
