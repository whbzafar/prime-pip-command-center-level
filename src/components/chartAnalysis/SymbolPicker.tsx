import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { CATALOG, type CatalogEntry } from './fullHistoryDatafeed';

const GROUPS: Array<{ id: string; label: string; match: (e: CatalogEntry) => boolean }> = [
  { id: 'forex', label: 'Forex', match: (e) => e.market === 'forex' },
  { id: 'metals', label: 'Metals & Energy', match: (e) => e.market === 'metals' || e.market === 'energy' },
  { id: 'indices', label: 'Indices', match: (e) => e.market === 'indices' || e.market === 'other' },
  { id: 'crypto', label: 'Crypto', match: (e) => e.market === 'crypto' },
  { id: 'stocks', label: 'Stocks', match: (e) => e.market === 'stocks' },
];

/** Searchable, grouped instrument picker (keyboard: ↑ ↓ Enter Esc). */
export const SymbolPicker: React.FC<{ value: string; onChange: (ticker: string) => void; className?: string }> = ({ value, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const current = CATALOG.find((c) => c.ticker === value);

  const list = useMemo(() => {
    const s = q.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    const g = GROUPS.find((x) => x.id === group);
    return CATALOG.filter((e) => (!g || g.match(e)) && (!s || e.ticker.includes(s.replace(/ /g, '')) || (e.name || '').toUpperCase().includes(s)));
  }, [q, group]);

  useEffect(() => {
    if (!open) return;
    const close = (ev: MouseEvent) => { if (box.current && !box.current.contains(ev.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    setTimeout(() => input.current?.focus(), 0);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => setHi(0), [q, group]);

  const pick = (t: string) => { onChange(t); setOpen(false); setQ(''); };

  return (
    <div ref={box} className={`relative ${className || ''}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="w-44 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-500/50 text-left cursor-pointer">
        <span className="text-[12.5px] font-bold text-slate-100 tracking-wide">{value}</span>
        <span className="text-[10px] text-slate-500 truncate flex-1">{current?.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-[340px] rounded-xl border border-slate-700 bg-[#0b1220] shadow-2xl shadow-black/60 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search symbol or name…"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
                else if (e.key === 'Enter' && list[hi]) pick(list[hi].ticker);
                else if (e.key === 'Escape') setOpen(false);
              }}
              className="flex-1 bg-transparent text-[12.5px] text-slate-100 placeholder:text-slate-600 outline-none" />
          </div>
          <div className="flex gap-1 px-2 py-1.5 border-b border-slate-800 overflow-x-auto">
            {[{ id: 'all', label: 'All' }, ...GROUPS].map((g) => (
              <button key={g.id} type="button" onClick={() => setGroup(g.id)}
                className={`px-2 py-0.5 rounded-md text-[10.5px] whitespace-nowrap cursor-pointer ${group === g.id ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40' : 'text-slate-400 border border-transparent hover:text-slate-200'}`}>{g.label}</button>
            ))}
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {list.length === 0 && <li className="px-3 py-3 text-[11.5px] text-slate-500">No instrument matches “{q}”.</li>}
            {list.map((e, i) => (
              <li key={e.ticker} role="option" aria-selected={e.ticker === value}>
                <button type="button" onMouseEnter={() => setHi(i)} onClick={() => pick(e.ticker)}
                  className={`w-full flex items-center gap-3 px-3 py-1.5 text-left cursor-pointer ${i === hi ? 'bg-slate-800/80' : ''}`}>
                  <span className={`text-[12px] font-bold w-20 ${e.ticker === value ? 'text-cyan-300' : 'text-slate-100'}`}>{e.ticker}</span>
                  <span className="text-[11px] text-slate-400 truncate flex-1">{e.name}</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-600">{e.market}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
