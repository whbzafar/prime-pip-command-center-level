import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Search, Layers } from 'lucide-react';
import type { Topic } from '../utils/topicContent';
import { readOutline, scanOutline, type OutlineView } from '../utils/tour';

/** Pick a category and see, before recording, everything the video will show: every sub-category, screen, option and function.
 *  The outline is read live from the app itself (every tab and nested tab), so it always matches what is really there. */
export const CategoryPicker: React.FC<{ topics: Topic[]; value: string; onChange: (id: string) => void; back?: string; disabled?: boolean; auto?: boolean; onScanning?: (b: boolean) => void }> = ({ topics, value, onChange, back = 'DASHBOARD', disabled, auto = true, onScanning }) => {
  const [q, setQ] = useState('');
  const topic = topics.find((t) => t.id === value) || topics[0];
  const [outline, setOutline] = useState<OutlineView[] | null>(() => (topic ? readOutline(topic.tab) : null));
  const [scanning, setScanning] = useState(false); const [msg, setMsg] = useState(''); const gen = useRef(0); const scanned = useRef<Set<string>>(new Set());
  const list = useMemo(() => { const k = q.trim().toLowerCase(); return k ? topics.filter((t) => (t.title + ' ' + t.short + ' ' + t.features.join(' ')).toLowerCase().includes(k)) : topics; }, [topics, q]);

  const scan = async (t: Topic) => {
    const my = ++gen.current; setScanning(true); setMsg('Opening the category…');
    try { const r = await scanOutline(t.tab, t.title, back, (m) => { if (gen.current === my) setMsg(m); }, () => gen.current === my); if (gen.current === my) { if (r) setOutline(r); setMsg(r ? '' : 'This category has no sub-categories, so its video shows the whole screen top to bottom.'); } }
    catch { if (gen.current === my) setMsg(''); } finally { if (gen.current === my) setScanning(false); }
  };
  useEffect(() => {
    if (!topic) return; gen.current++; setScanning(false); const cached = readOutline(topic.tab); setOutline(cached); setMsg('');
    if (cached || scanned.current.has(topic.tab) || disabled || !auto) return;
    const t = window.setTimeout(() => { scanned.current.add(topic.tab); void scan(topic); }, 900); return () => window.clearTimeout(t);
  }, [topic?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onScanning?.(scanning); }, [scanning]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { gen.current++; onScanning?.(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => { const m = new Map<string, OutlineView[]>(); (outline || []).forEach((v) => { const a = m.get(v.section) || []; a.push(v); m.set(v.section, a); }); return [...m.entries()]; }, [outline]);
  const screens = outline?.length || 0; const options = (outline || []).reduce((a, v) => a + v.items.length, 0);

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]" data-testid="category-picker">
      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <label className="relative block"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories…" className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-8 pr-2 text-sm text-slate-100 placeholder:text-slate-500" aria-label="Search categories" /></label>
        <div className="flex max-h-44 gap-1.5 overflow-auto md:max-h-[52vh] md:flex-col" role="listbox" aria-label="Categories">
          {list.map((t) => { const on = t.id === topic?.id; return (
            <button key={t.id} type="button" role="option" aria-selected={on} disabled={disabled} onClick={() => onChange(t.id)} data-testid={`cat-${t.id}`} className={`shrink-0 rounded-xl border px-3 py-2 text-left transition md:shrink ${on ? 'border-rose-400/70 bg-gradient-to-br from-rose-500/20 to-transparent shadow-lg shadow-rose-900/20' : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'}`}>
              <span className="block whitespace-nowrap text-sm font-bold text-slate-100 md:whitespace-normal">{t.title}</span>
              <span className="mt-0.5 hidden text-[11px] leading-snug text-slate-400 md:line-clamp-2 md:block">{t.short}</span>
            </button>); })}
          {!list.length && <p className="p-2 text-xs text-slate-500">No category matches “{q}”.</p>}
        </div>
      </div>
      {topic && (
        <div className="min-h-0 space-y-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-3.5 md:max-h-[58vh] md:overflow-auto" data-testid="category-detail">
          <div><h3 className="text-base font-extrabold text-white">{topic.title}</h3><p className="mt-1 text-xs leading-relaxed text-slate-300">{topic.overview || topic.short}</p></div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 font-semibold text-emerald-200"><Layers className="mr-1 inline h-3 w-3" />{screens ? `${screens} screens` : `${topic.features.length} functions`}</span>
            {options > 0 && <span className="rounded-full bg-sky-500/15 px-2.5 py-1 font-semibold text-sky-200">{options}+ options</span>}
            <span className="rounded-full bg-slate-700/60 px-2.5 py-1 text-slate-200">one video · about 3 min</span>
            <button type="button" disabled={scanning || disabled} onClick={() => { scanned.current.add(topic.tab); void scan(topic); }} className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-600 px-2.5 py-1 font-semibold text-slate-200 hover:border-slate-400 disabled:opacity-50" data-testid="category-rescan">{scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}{scanning ? 'Reading…' : 'Re-read'}</button>
          </div>
          {scanning && <p className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-100"><Loader2 className="h-3.5 w-3.5 animate-spin" />{msg || 'Reading every sub-category…'}</p>}
          {!scanning && msg && <p className="rounded-lg bg-slate-800/70 px-3 py-2 text-xs text-slate-300">{msg}</p>}
          {groups.length > 0 && (
            <div className="space-y-2.5" data-testid="category-outline">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">The video opens and shows, in order</p>
              {groups.map(([section, vs], gi) => (
                <div key={section} className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-2.5">
                  <p className="text-sm font-bold text-white"><span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] text-white">{gi + 1}</span>{section}</p>
                  {vs[0].hint && vs[0].label !== section && <p className="ml-6 text-[11px] text-slate-400">{vs[0].hint}</p>}
                  <ul className="mt-1.5 space-y-1.5">
                    {vs.filter((v) => v.label !== section || v.items.length).map((v) => (
                      <li key={v.label} className="ml-6">
                        {v.label !== section && <p className="text-xs font-semibold text-emerald-200"><CheckCircle2 className="mr-1 inline h-3 w-3" />{v.label}</p>}
                        {v.items.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{v.items.map((it) => <span key={it} className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[10.5px] text-slate-200">{it}</span>)}</div>}
                      </li>))}
                  </ul>
                </div>))}
            </div>
          )}
          <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Functions covered ({topic.features.length})</p>
            <ul className="grid gap-1 sm:grid-cols-2" data-testid="category-features">{topic.features.map((f) => <li key={f} className="flex gap-1.5 text-[11.5px] leading-snug text-slate-200"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />{f}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
};
