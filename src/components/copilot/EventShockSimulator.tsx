import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Zap, X, RefreshCw, CalendarClock, ArrowUpRight, ArrowDownRight, Equal, History } from 'lucide-react';

/** EVENT SHOCK SIMULATOR — how markets really moved after past releases of the same event, by surprise. */
interface Upcoming { id: string; title: string; key: string; country: string; currency: string; at: string; forecast: number | null; previous: number | null; actual: number | null; unit: string }
interface HStat { mean: number | null; p25: number | null; p75: number | null; upShare: number | null }
interface Block { n: number; '15m': HStat; '1h': HStat; '4h': HStat; '24h': HStat; spikeMedian: number | null }
interface Inst { symbol: string; measured: number; above: Block; inline: Block; below: Block }
interface Hist {
  ok: boolean; error?: string; note?: string; title: string; unit: string; count: number; surpriseBand: string;
  releases: Array<{ at: string; period: string | null; actual: number | null; forecast: number | null; previous: number | null; surprise: string; moves: Record<string, any> }>;
  instruments: Inst[]; sources: string[]; disclaimer: string;
}

const FLAG: Record<string, string> = { US: '🇺🇸', EU: '🇪🇺', DE: '🇩🇪', GB: '🇬🇧', JP: '🇯🇵', CA: '🇨🇦', AU: '🇦🇺', NZ: '🇳🇿', CH: '🇨🇭', CN: '🇨🇳' };
const SC = {
  above: { label: 'Above forecast', Icon: ArrowUpRight, cls: 'border-emerald-500/30 bg-emerald-500/5', txt: 'text-emerald-300' },
  inline: { label: 'In line', Icon: Equal, cls: 'border-slate-600 bg-slate-800/30', txt: 'text-slate-300' },
  below: { label: 'Below forecast', Icon: ArrowDownRight, cls: 'border-rose-500/30 bg-rose-500/5', txt: 'text-rose-300' },
} as const;
const pct = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`);
const dpOf = (p: number) => (p >= 1000 ? 2 : p >= 20 ? 3 : 5);

export const EventShockSimulator: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [up, setUp] = useState<Upcoming[] | null>(null);
  const [upErr, setUpErr] = useState<string | null>(null);
  const [sel, setSel] = useState<Upcoming | null>(null);
  const [hist, setHist] = useState<Hist | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<'15m' | '1h' | '4h' | '24h'>('1h');
  const [prices, setPrices] = useState<Record<string, number>>({});

  const loadUp = useCallback(async () => {
    setUpErr(null);
    const j = await fetch('/api/shock/upcoming').then((r) => r.json()).catch(() => null);
    if (!j?.ok) { setUpErr(j?.error || 'The economic calendar could not be reached. Try again in a minute.'); return; }
    // One entry per event type (the next occurrence).
    const seen = new Set<string>(); const rows: Upcoming[] = [];
    for (const r of j.rows as Upcoming[]) { const k = `${r.country}|${r.key}`; if (!seen.has(k)) { seen.add(k); rows.push(r); } }
    setUp(rows);
    setSel((s) => s || rows.find((r) => r.actual === null) || rows[0] || null);
  }, []);
  useEffect(() => { if (open && !up) void loadUp(); }, [open, up, loadUp]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);

  useEffect(() => {
    if (!open || !sel) return;
    let alive = true;
    setLoading(true); setErr(null); setHist(null);
    fetch(`/api/shock/history?country=${sel.country}&key=${encodeURIComponent(sel.key)}`).then((r) => r.json()).then((j) => {
      if (!alive) return;
      if (!j?.ok) setErr(j?.error || 'Could not measure past reactions right now.');
      else setHist(j);
    }).catch(() => alive && setErr('No connection — please try again.')).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [open, sel]);

  useEffect(() => {
    if (!hist?.instruments?.length) return;
    let alive = true;
    Promise.all(hist.instruments.map(async (i) => {
      const j = await fetch(`/api/charts/price?symbol=${i.symbol}`).then((r) => r.json()).catch(() => null);
      return [i.symbol, j?.price] as const;
    })).then((rows) => { if (alive) setPrices(Object.fromEntries(rows.filter(([, p]) => p > 0))); });
    return () => { alive = false; };
  }, [hist]);

  const byDay = useMemo(() => {
    const m = new Map<string, Upcoming[]>();
    for (const r of up || []) { const d = new Date(r.at).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); if (!m.has(d)) m.set(d, []); m.get(d)!.push(r); }
    return [...m.entries()];
  }, [up]);

  if (!open) return null;
  const primary = hist?.instruments?.[0]?.symbol;

  return createPortal(
    <div className="fixed inset-0 z-[2147483100] flex items-center justify-center p-2 sm:p-4 bg-black/70" onClick={onClose} data-testid="event-shock">
      <div className="w-full max-w-6xl h-[94vh] flex flex-col rounded-2xl border border-amber-500/30 bg-slate-950 shadow-2xl" onClick={(e) => e.stopPropagation()}  style={{ backgroundColor: "#020617" }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-white" /></div>
            <div className="min-w-0">
              <div className="text-sm font-black text-white tracking-wide">EVENT SHOCK SIMULATOR</div>
              <div className="text-[10.5px] text-slate-500 truncate">How price really moved after past releases of the same event — if it beats, matches or misses</div>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Close simulator"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Upcoming list */}
          <div className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto max-h-48 md:max-h-none p-2 space-y-2">
            <div className="flex items-center justify-between px-1 text-[10.5px] uppercase tracking-widest font-bold text-slate-400"><span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />High-impact · next 7 days</span><button type="button" onClick={() => { setUp(null); void loadUp(); }} className="p-1 rounded hover:bg-slate-800 cursor-pointer" title="Refresh"><RefreshCw className="w-3 h-3" /></button></div>
            {!up && !upErr && <div className="text-xs text-slate-500 p-2">Loading the calendar…</div>}
            {upErr && <div className="text-xs text-rose-300 p-2">{upErr}</div>}
            {up && up.length === 0 && <div className="text-xs text-slate-500 p-2">No high-impact releases in the next 7 days.</div>}
            {byDay.map(([day, rows]) => (
              <div key={day}>
                <div className="text-[10px] text-slate-500 px-1 pb-1">{day}</div>
                {rows.map((r) => (
                  <button key={r.id} type="button" onClick={() => setSel(r)} data-testid="shock-event"
                    className={`w-full text-left px-2 py-1.5 rounded-lg border mb-1 cursor-pointer ${sel?.id === r.id ? 'border-amber-400/60 bg-amber-500/10' : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'}`}>
                    <div className="text-xs text-white font-bold truncate">{FLAG[r.country] || ''} {r.title}</div>
                    <div className="text-[10.5px] text-slate-500 font-mono">{new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · F {r.forecast ?? '—'} · P {r.previous ?? '—'}{r.actual !== null ? ` · A ${r.actual}` : ''}</div>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Analysis */}
          <div className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-4 space-y-3">
            {!sel && <div className="text-sm text-slate-500 py-10 text-center">Pick a release on the left.</div>}
            {sel && (
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="text-lg font-black text-white">{FLAG[sel.country] || ''} {sel.title}</div>
                  <div className="text-xs text-slate-400">{new Date(sel.at).toLocaleString()} · Forecast <b className="text-white">{sel.forecast ?? '—'}{sel.unit && sel.forecast !== null ? sel.unit : ''}</b> · Previous {sel.previous ?? '—'}</div>
                </div>
                <div className="flex gap-1">{(['15m', '1h', '4h', '24h'] as const).map((h) => (
                  <button key={h} type="button" onClick={() => setHorizon(h)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${horizon === h ? 'bg-amber-500/20 border-amber-400/60 text-white' : 'border-slate-800 text-slate-400 hover:text-white'}`}>after {h}</button>
                ))}</div>
              </div>
            )}
            {loading && <div className="py-12 text-center text-slate-400 text-sm"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />Measuring how markets moved after every past release (first time can take up to a minute)…</div>}
            {err && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div>}
            {hist && !hist.instruments.length && <div className="rounded-xl border border-slate-800 p-4 text-sm text-slate-400">{hist.note || 'No history to measure for this release.'}</div>}

            {hist && hist.instruments.length > 0 && (<>
              <div className="text-[11px] text-slate-500">Based on the last <b className="text-slate-300">{hist.count}</b> releases. {hist.surpriseBand}</div>
              <div className="grid lg:grid-cols-2 gap-3">
                {hist.instruments.map((ins) => {
                  const p = prices[ins.symbol];
                  return (
                    <div key={ins.symbol} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3 space-y-2" data-testid="shock-instrument">
                      <div className="flex justify-between items-baseline"><span className="font-black font-mono text-white">{ins.symbol}</span><span className="text-[10.5px] text-slate-500">{p ? `now ${p.toFixed(dpOf(p))} · ` : ''}{ins.measured} releases measured</span></div>
                      {(['above', 'inline', 'below'] as const).map((k) => {
                        const b = ins[k]; const s = b[horizon]; const S = SC[k];
                        return (
                          <div key={k} className={`rounded-xl border px-2.5 py-2 ${S.cls}`}>
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className={`flex items-center gap-1 font-bold ${S.txt}`}><S.Icon className="w-3.5 h-3.5" />{S.label} <span className="text-slate-500 font-normal">({b.n}×)</span></span>
                              {b.n > 0 ? <span className="font-mono text-white font-bold">{pct(s.mean)} avg</span> : <span className="text-slate-500">no cases</span>}
                            </div>
                            {b.n > 0 && (
                              <div className="text-[10.5px] text-slate-400 mt-0.5 flex flex-wrap gap-x-3">
                                <span>Usual range {pct(s.p25)} to {pct(s.p75)}</span>
                                {p && s.p25 !== null && s.p75 !== null && <span className="font-mono text-slate-300">≈ {(p * (1 + s.p25 / 100)).toFixed(dpOf(p))} – {(p * (1 + s.p75 / 100)).toFixed(dpOf(p))}</span>}
                                {s.upShare !== null && <span>Went up {s.upShare}% of the time</span>}
                                {b.spikeMedian !== null && <span>First-hour spike ≈ {b.spikeMedian.toFixed(2)}%</span>}
                                {b.n < 3 && <span className="text-amber-300">few cases — treat with care</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {primary && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-300 mb-2"><History className="w-4 h-4" />Every past release · {primary} move after {horizon}</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead><tr className="text-slate-500 text-left"><th className="py-1 pr-2">Date</th><th className="pr-2">Actual</th><th className="pr-2">Forecast</th><th className="pr-2">Result</th>{hist.instruments.map((i) => <th key={i.symbol} className="pr-2 text-right">{i.symbol}</th>)}</tr></thead>
                      <tbody>
                        {hist.releases.map((r) => (
                          <tr key={r.at} className="border-t border-slate-800/80">
                            <td className="py-1 pr-2 text-slate-400 whitespace-nowrap">{new Date(r.at).toLocaleDateString()}</td>
                            <td className="pr-2 font-mono text-white">{r.actual ?? '—'}</td>
                            <td className="pr-2 font-mono text-slate-400">{r.forecast ?? '—'}</td>
                            <td className={`pr-2 ${r.surprise === 'above' ? 'text-emerald-300' : r.surprise === 'below' ? 'text-rose-300' : 'text-slate-400'}`}>{r.surprise === 'above' ? 'Above' : r.surprise === 'below' ? 'Below' : r.surprise === 'inline' ? 'In line' : '—'}</td>
                            {hist.instruments.map((i) => { const v = r.moves?.[i.symbol]?.[horizon]; return <td key={i.symbol} className={`pr-2 text-right font-mono ${typeof v !== 'number' ? 'text-slate-600' : v >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{typeof v === 'number' ? pct(v) : '—'}</td>; })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="text-[10.5px] text-slate-600">Sources: {hist.sources.join(' · ')}. {hist.disclaimer}</div>
            </>)}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
