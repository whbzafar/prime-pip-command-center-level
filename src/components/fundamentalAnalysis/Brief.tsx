import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';
import { fetchJsonSafe } from './ui';

interface L { en: string; ur: string }
interface Line extends L { tone?: 'bull' | 'bear' | 'neutral' | 'info'; at?: number }
interface BriefData {
  symbol: string; display: string; kind: 'asset' | 'pair'; assetClass: string; bias: string; biasLabel: L;
  score: number | null; confidence: number | null; updatedAt: string; asOf: string | null;
  headline: L; why: Line[]; outlook: Line[]; counter: Line[]; disclaimer: L;
}

const EVT = 'ppfx:brief';
export const openBrief = (symbol: string) => window.dispatchEvent(new CustomEvent(EVT, { detail: symbol }));

/** span (not button) so it can sit inside clickable rows. */
export const BriefButton: React.FC<{ symbol: string; className?: string }> = ({ symbol, className = '' }) => (
  <span
    role="button" tabIndex={0} title="Brief — why, and where next"
    onClick={(e) => { e.stopPropagation(); e.preventDefault(); openBrief(symbol); }}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); openBrief(symbol); } }}
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:bg-cyan-500/20 shrink-0 ${className}`}
  ><FileText className="w-3 h-3" />Brief</span>
);

const toneCls = (t?: string) => t === 'bull' ? 'border-emerald-500/60' : t === 'bear' ? 'border-rose-500/60' : 'border-slate-600';

const Section: React.FC<{ title: L; lines: Line[]; ur: boolean }> = ({ title, lines, ur }) => lines.length === 0 ? null : (
  <div className="space-y-1.5">
    <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/80">{ur ? title.ur : title.en}</div>
    {lines.map((l, i) => (
      <div key={i} className={`border-l-2 ${toneCls(l.tone)} pl-3 py-0.5 text-[13px] leading-relaxed text-slate-200`}>{ur ? l.ur : l.en}</div>
    ))}
  </div>
);

export const BriefHost: React.FC = () => {
  const [sym, setSym] = useState<string | null>(null);
  const [data, setData] = useState<BriefData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ur, setUr] = useState(false);

  useEffect(() => {
    const h = (e: Event) => { setSym(String((e as CustomEvent).detail)); setData(null); setErr(null); };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
  useEffect(() => {
    if (!sym) return;
    let dead = false;
    fetchJsonSafe<BriefData>(`/api/macro/brief/${encodeURIComponent(sym)}`).then((d) => { if (!dead) setData(d); }).catch((e) => { if (!dead) setErr(String(e?.message || e)); });
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setSym(null); };
    window.addEventListener('keydown', k);
    return () => { dead = true; window.removeEventListener('keydown', k); };
  }, [sym]);
  if (!sym) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm" onClick={() => setSym(null)}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-950/95 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950/95">
          <FileText className="w-4 h-4 text-cyan-400" />
          <div className="font-military font-bold text-white tracking-wide">{data?.display ?? sym} — Brief</div>
          {data && <span className="text-[11px] font-mono-code text-slate-400">{ur ? data.biasLabel.ur : data.biasLabel.en}</span>}
          <div className="ml-auto flex items-center rounded-lg border border-slate-700 overflow-hidden text-[11px] font-bold">
            <button type="button" onClick={() => setUr(false)} className={`px-2.5 py-1 ${!ur ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}>English</button>
            <button type="button" onClick={() => setUr(true)} className={`px-2.5 py-1 ${ur ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'}`}>اردو</button>
          </div>
          <button type="button" onClick={() => setSym(null)} aria-label="Close" className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-4" dir={ur ? 'rtl' : 'ltr'} lang={ur ? 'ur' : 'en'} style={ur ? { fontFamily: "'Noto Nastaliq Urdu','Jameel Noori Nastaleeq',serif", lineHeight: 2.1 } : undefined}>
          {!data && !err && <div className="text-sm text-slate-400">Loading…</div>}
          {err && <div className="text-sm text-rose-400">Brief unavailable: {err}</div>}
          {data && (<>
            <div className="text-[15px] font-semibold text-white leading-snug">{ur ? data.headline.ur : data.headline.en}</div>
            <Section title={{ en: 'Why', ur: 'وجہ' }} lines={data.why} ur={ur} />
            <Section title={{ en: 'What could happen next', ur: 'آگے کیا ہو سکتا ہے' }} lines={data.outlook} ur={ur} />
            <Section title={{ en: 'Counter-forces', ur: 'مخالف عوامل' }} lines={data.counter} ur={ur} />
            <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
              {ur ? data.disclaimer.ur : data.disclaimer.en}
              <div className="mt-1 font-mono-code" dir="ltr">Updated {new Date(data.updatedAt).toUTCString()}{data.asOf ? ` · data as of ${data.asOf}` : ''}</div>
            </div>
          </>)}
        </div>
      </div>
    </div>, document.body);
};
