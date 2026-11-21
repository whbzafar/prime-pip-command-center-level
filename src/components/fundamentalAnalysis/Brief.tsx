import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';
import { fetchJsonSafe } from './ui';

interface L { en: string; ur: string }
interface Line extends L { tone?: 'bull' | 'bear' | 'neutral' | 'info'; at?: number }
interface BriefData {
  symbol: string; display: string; kind: 'asset' | 'pair'; assetClass: string; bias: string; biasLabel: L; side: 'bull' | 'bear' | 'neutral';
  score: number | null; bullishPct: number | null; bearishPct: number | null; confidence: number | null; updatedAt: string; asOf: string | null;
  headline: L; summary: L; trust: L; why: Line[]; watch: Line[]; heading: Line[]; counter: Line[]; disclaimer: L;
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

const toneCls = (t?: string) => t === 'bull' ? 'border-emerald-500/70' : t === 'bear' ? 'border-rose-500/70' : t === 'info' ? 'border-cyan-500/50' : 'border-slate-600';

const Section: React.FC<{ icon: string; title: L; hint?: L; lines: Line[]; ur: boolean }> = ({ icon, title, hint, lines, ur }) => lines.length === 0 ? null : (
  <div className="space-y-2">
    <div>
      <div className="text-[13px] font-bold text-white"><span className="mr-1.5 ml-1.5">{icon}</span>{ur ? title.ur : title.en}</div>
      {hint && <div className="text-[11px] text-slate-500">{ur ? hint.ur : hint.en}</div>}
    </div>
    {lines.map((l, i) => (
      <div key={i} className={`border-s-2 ${toneCls(l.tone)} ps-3 py-1 text-[13.5px] leading-relaxed text-slate-200 bg-white/[0.02] rounded-e-lg`}>{ur ? l.ur : l.en}</div>
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
    fetchJsonSafe<{ data: BriefData }>(`/api/macro/brief/${encodeURIComponent(sym)}`).then((r) => { if (!dead) setData(r.data); }).catch((e) => { if (!dead) setErr(String(e?.message || e)); });
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
          {data && <span className="text-[11px] font-bold" style={{ color: data.side === 'bull' ? '#34d399' : data.side === 'bear' ? '#fb7185' : '#94a3b8' }}>{ur ? data.biasLabel.ur : data.biasLabel.en}</span>}
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
            <div className={`rounded-xl border p-3.5 ${data.side === 'bull' ? 'border-emerald-500/40 bg-emerald-500/5' : data.side === 'bear' ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-600 bg-slate-800/30'}`}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{ur ? 'مختصر جواب' : 'Quick answer'}</div>
              <div className="mt-1 text-[16px] font-bold text-white leading-snug">{ur ? data.headline.ur : data.headline.en}</div>
              <div className="mt-1.5 text-[13.5px] text-slate-200 leading-relaxed">{ur ? data.summary.ur : data.summary.en}</div>
              {data.bullishPct !== null && data.bearishPct !== null && (
                <div className="mt-3" dir="ltr">
                  <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-800"><div style={{ width: `${data.bullishPct}%`, background: '#34d399' }} /><div style={{ width: `${data.bearishPct}%`, background: '#fb3f5e' }} /></div>
                  <div className="mt-1 flex justify-between text-[12px] font-semibold tabular-nums"><span className="text-emerald-300">{Math.round(data.bullishPct)}% {ur ? 'تیزی' : 'bullish'}</span><span className="text-rose-300">{100 - Math.round(data.bullishPct)}% {ur ? 'مندی' : 'bearish'}</span></div>
                </div>
              )}
              <div className="mt-2 text-[11.5px] text-slate-400">{ur ? data.trust.ur : data.trust.en}</div>
            </div>
            <Section icon="❓" title={{ en: 'Why is it like this?', ur: 'ایسا کیوں ہے؟' }} hint={{ en: 'The main reasons, strongest first', ur: 'اہم وجوہات، سب سے مضبوط پہلے' }} lines={data.why} ur={ur} />
            <Section icon="📅" title={{ en: 'What to watch next', ur: 'آگے کیا دیکھیں' }} hint={{ en: 'Upcoming releases (Pakistan time)', ur: 'آنے والی ریلیزز (پاکستانی وقت)' }} lines={data.watch} ur={ur} />
            <Section icon="🧭" title={{ en: 'Where it may head', ur: 'یہ کس طرف جا سکتا ہے' }} lines={data.heading} ur={ur} />
            <Section icon="⚖️" title={{ en: 'What could change this', ur: 'اسے کیا بدل سکتا ہے' }} lines={data.counter} ur={ur} />
            <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-3">
              {ur ? data.disclaimer.ur : data.disclaimer.en}
              <div className="mt-1 font-mono-code" dir="ltr">Updated {new Date(data.updatedAt).toLocaleString()}</div>
            </div>
          </>)}
        </div>
      </div>
    </div>, document.body);
};
