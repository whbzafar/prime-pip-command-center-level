import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { chartSymbolFor } from '../fundamentalAnalysis/LiveBiasStrip';
import { Sunrise, X, RefreshCw, TrendingUp, TrendingDown, CalendarClock, Target, ShieldAlert } from 'lucide-react';

/** DAILY BRIEFING — fundamentals, best set-ups and the day's high-impact news on one page (live data only). */
interface Pair { symbol: string; display: string; score: number; confidence: number; why: string }
interface Brief { ok: boolean; error?: string; generatedAt: string; headline: string[]; bullish: Pair[]; bearish: Pair[];
  events: Array<{ currency: string; title: string; at: string; inHours: number; forecast: string | null; previous: string | null }>;
  setups: Array<{ symbol: string; side: 'LONG' | 'SHORT'; regime: string; score: number; alignment: string; fundamentals: number | null; setup: string; nextNewsHours: number | null }>;
  avoid: string[]; newsSoonCurrencies: string[]; disclaimer: string }

const pkt = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

export const DailyBriefing: React.FC<{ open: boolean; onClose: () => void; onOpenSymbol?: (sym: string) => void }> = ({ open, onClose, onOpenSymbol }) => {
  const [d, setD] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { const j = await fetch('/api/briefing').then((r) => r.json()).catch(() => null); if (!j?.ok) setErr(j?.error || 'Could not reach the live engines. Please try again in a minute.'); else setD(j); }
    catch { setErr('No connection — please check your internet.'); }
    setLoading(false);
  }, []);
  useEffect(() => { if (open && !d) void load(); }, [open, d, load]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  if (!open) return null;
  const col = (title: string, list: Pair[], up: boolean) => (
    <section className="rounded-xl border border-slate-800 p-3">
      <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-1.5 ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}{title}</div>
      {list.map((p) => (
        <button key={p.symbol} type="button" onClick={() => { onOpenSymbol?.(chartSymbolFor(p.symbol) as string); onClose(); }} className="w-full text-left py-1.5 border-t border-slate-800/70 first:border-0 cursor-pointer hover:bg-slate-900/60 rounded">
          <div className="flex justify-between text-[13px]"><b className="text-slate-100">{p.display}</b><span className={`font-mono font-bold ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{p.score > 0 ? '+' : ''}{p.score} <span className="text-slate-500 font-normal">· {p.confidence}% conf</span></span></div>
          <div className="text-[11px] text-slate-500 line-clamp-2">{p.why}</div>
        </button>))}
      {!list.length && <div className="text-[12px] text-slate-500">Nothing is strongly {up ? 'bullish' : 'bearish'} with enough confidence right now.</div>}
    </section>);
  return createPortal(
    <div className="fixed inset-0 z-[2147483100] flex items-center justify-center p-2 sm:p-4 bg-black/70" onClick={onClose} data-testid="daily-briefing">
      <div className="w-full max-w-4xl max-h-[94vh] flex flex-col rounded-2xl border border-amber-400/30 shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#020617' }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0"><div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shrink-0"><Sunrise className="w-4 h-4 text-white" /></div>
            <div className="min-w-0"><div className="text-sm font-black text-white tracking-wide">DAILY BRIEFING</div><div className="text-[10.5px] text-slate-500 truncate">Your trading day on one page — live fundamentals, best set-ups and the news to respect (Pakistan time)</div></div></div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => void load()} disabled={loading} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button></div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading && !d && <div className="py-14 text-center text-slate-400 text-sm"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-300" />Reading the live engines…</div>}
          {err && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div>}
          {d && (<>
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 space-y-1" data-testid="briefing-headline">{d.headline.map((l, i) => <div key={i} className="text-[13px] text-amber-50">• {l}</div>)}</div>
            <div className="grid sm:grid-cols-2 gap-3">{col('Strongest fundamentals', d.bullish, true)}{col('Weakest fundamentals', d.bearish, false)}</div>
            <section className="rounded-xl border border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-300 mb-1.5"><Target className="w-3.5 h-3.5" />Best live set-ups</div>
              {d.setups.map((s) => (
                <button key={s.symbol} type="button" onClick={() => { onOpenSymbol?.(chartSymbolFor(s.symbol) as string); onClose(); }} className="w-full text-left py-1.5 border-t border-slate-800/70 first:border-0 cursor-pointer hover:bg-slate-900/60 rounded">
                  <div className="flex flex-wrap items-center gap-2 text-[13px]"><b className="text-slate-100">{s.symbol}</b>
                    <span className={`px-1.5 rounded text-[10.5px] font-bold ${s.side === 'LONG' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>{s.side}</span>
                    <span className="text-[11px] text-slate-400">{s.regime.toLowerCase()} · score {s.score}{s.alignment === 'aligned' ? ' · fundamentals agree' : s.alignment === 'conflict' ? ' · fundamentals disagree' : ''}</span>
                    {s.nextNewsHours !== null && s.nextNewsHours <= 6 && <span className="text-[10.5px] text-amber-300">news in {s.nextNewsHours} h</span>}</div>
                  <div className="text-[11.5px] text-slate-400">{s.setup}</div>
                </button>))}
              {!d.setups.length && <div className="text-[12px] text-slate-500">No market is showing a clean, directional set-up right now — standing aside is a position.</div>}
            </section>
            <section className="rounded-xl border border-slate-800 p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fuchsia-300 mb-1.5"><CalendarClock className="w-3.5 h-3.5" />High-impact news — next 24 hours</div>
              {d.events.map((e, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-3 text-[12.5px] py-1 border-t border-slate-800/70 first:border-0">
                  <span className="font-mono text-slate-400 w-24">{pkt(e.at)}</span><b className="text-slate-100 w-10">{e.currency}</b><span className="text-slate-200 flex-1 min-w-[10rem]">{e.title}</span>
                  <span className="text-[11px] text-slate-500">{e.forecast ? `forecast ${e.forecast}` : ''}{e.previous ? ` · prev ${e.previous}` : ''}</span>
                  <span className={`text-[11px] font-bold ${e.inHours <= 3 ? 'text-amber-300' : 'text-slate-400'}`}>{e.inHours < 1 ? 'under 1 h' : `in ${e.inHours} h`}</span></div>))}
              {!d.events.length && <div className="text-[12px] text-slate-500">No high-impact releases are scheduled for the tracked currencies in the next 24 hours.</div>}
            </section>
            {d.avoid.length > 0 && <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-[12.5px] text-amber-100"><ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /><span><b>News inside 3 hours:</b> {d.avoid.join(', ')} — spreads widen and stops get hunted around releases; consider waiting.</span></div>}
            <p className="text-[10.5px] text-slate-500">Built from the live fundamentals engine, the Market Regime Radar and the economic calendar. {d.disclaimer}</p>
          </>)}
        </div>
      </div>
    </div>, document.body);
};
export default DailyBriefing;
