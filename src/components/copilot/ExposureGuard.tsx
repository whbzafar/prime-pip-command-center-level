import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Scale, X, RefreshCw, AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import type { Trade } from '../../types';

/** EXPOSURE GUARD — currency strength, cross-market correlation and what your open trades really bet on. */
interface Data { ok: boolean; error?: string; generatedAt: string; strength: Record<string, { d1: number | null; d5: number | null; d20: number | null; pairs: number }>; correlation: Record<string, Record<string, number | null>>; symbols: string[]; failed: string[]; method: string; sources: string[] }
const FX = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
const norm = (s: string) => { const c = String(s || '').toUpperCase().replace(/^[A-Z_]+:/, '').replace(/[^A-Z0-9]/g, '').replace(/USDT$/, 'USD'); return ({ GOLD: 'XAUUSD', NAS100: 'US100', SPX500: 'US500', DJ30: 'US30', WTI: 'USOIL' } as Record<string, string>)[c] || c; };
/** Legs of a position: +1 long / −1 short per currency or asset. */
export function legsOf(sym: string, dir: string): Array<[string, number]> {
  const s = norm(sym); const d = /SELL|SHORT/i.test(dir) ? -1 : 1;
  if (/^[A-Z]{6}$/.test(s) && FX.includes(s.slice(3)) && (FX.includes(s.slice(0, 3)) || ['XAU', 'XAG'].includes(s.slice(0, 3)))) return [[s.slice(0, 3), d], [s.slice(3), -d]];
  if (/^(US30|US100|US500|GER40|UK100|JP225)$/.test(s)) return [['Stocks', d]];
  if (/OIL/.test(s)) return [['Oil', d], ['USD', -d]];
  if (/^(BTC|ETH)/.test(s)) return [['Crypto', d], ['USD', -d]];
  return [[s, d]];
}
const heat = (v: number | null) => v === null ? 'rgba(100,116,139,0.15)' : v >= 0 ? `rgba(16,185,129,${0.12 + Math.abs(v) * 0.75})` : `rgba(244,63,94,${0.12 + Math.abs(v) * 0.75})`;

export const ExposureGuard: React.FC<{ open: boolean; onClose: () => void; trades: Trade[] }> = ({ open, onClose, trades }) => {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [span, setSpan] = useState<'d1' | 'd5' | 'd20'>('d5');
  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const j = await fetch('/api/strength').then((r) => r.json()).catch(() => null);
    if (!j?.ok) setErr(j?.error || 'Live market data could not be reached. Try again in a minute.'); else setData(j);
    setLoading(false);
  }, []);
  useEffect(() => { if (open && !data) void load(); }, [open, data, load]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);

  const openTrades = useMemo(() => trades.filter((t) => t.status === 'OPEN'), [trades]);
  const exposure = useMemo(() => {
    const m = new Map<string, { net: number; trades: string[] }>();
    for (const t of openTrades) {
      const w = t.riskAmount || t.riskDollars || 1;
      for (const [k, d] of legsOf(t.instrument, String(t.direction))) { const e = m.get(k) || { net: 0, trades: [] }; e.net += d * w; e.trades.push(`${t.direction} ${norm(t.instrument)}`); m.set(k, e); }
    }
    return [...m.entries()].map(([k, v]) => ({ k, ...v })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [openTrades]);
  const stacked = exposure.filter((e) => e.trades.length >= 2 && Math.abs(e.net) >= 1.5 * Math.max(...openTrades.map((t) => t.riskAmount || t.riskDollars || 1)));
  const sameBets = useMemo(() => {
    if (!data) return [] as string[];
    const out: string[] = [];
    for (let i = 0; i < openTrades.length; i++) for (let j = i + 1; j < openTrades.length; j++) {
      const a = openTrades[i], b = openTrades[j]; const sa = norm(a.instrument), sb = norm(b.instrument);
      const c = data.correlation[sa]?.[sb]; if (c == null || Math.abs(c) < 0.7) continue;
      const da = /SELL|SHORT/i.test(String(a.direction)) ? -1 : 1, db = /SELL|SHORT/i.test(String(b.direction)) ? -1 : 1;
      if (Math.sign(c) * da * db > 0) out.push(`${a.direction} ${sa} and ${b.direction} ${sb} move together (correlation ${c.toFixed(2)}) — effectively one bigger trade.`);
      else out.push(`${a.direction} ${sa} and ${b.direction} ${sb} largely cancel each other out (correlation ${c.toFixed(2)}).`);
    }
    return out;
  }, [data, openTrades]);

  const ranked = useMemo(() => data ? FX.map((c) => ({ c, v: data.strength[c]?.[span] ?? null })).filter((x) => x.v !== null).sort((a, b) => (b.v as number) - (a.v as number)) : [], [data, span]);
  const maxAbs = Math.max(0.01, ...ranked.map((r) => Math.abs(r.v as number)));
  const strongest = ranked[0], weakest = ranked[ranked.length - 1];
  const idea = strongest && weakest ? (FX.indexOf(strongest.c) >= 0 ? (() => {
    const order = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY'];
    const [b, q] = order.indexOf(strongest.c) < order.indexOf(weakest.c) ? [strongest.c, weakest.c] : [weakest.c, strongest.c];
    return { pair: `${b}${q}`, dir: b === strongest.c ? 'up' : 'down' };
  })() : null) : null;

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[2147483100] flex items-center justify-center p-2 sm:p-4 bg-black/70" onClick={onClose} data-testid="exposure-guard">
      <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-2xl border border-emerald-500/30 shadow-2xl" style={{ backgroundColor: '#020617' }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800" style={{ backgroundColor: '#020617' }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0"><Scale className="w-4 h-4 text-white" /></div>
            <div className="min-w-0"><div className="text-sm font-black text-white tracking-wide">EXPOSURE GUARD</div><div className="text-[10.5px] text-slate-500 truncate">Currency strength · correlations · what your open trades really bet on</div></div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => void load()} disabled={loading} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Close exposure guard"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* Open-trade exposure */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
            <div className="text-xs font-black uppercase tracking-widest text-slate-300">Your open trades ({openTrades.length})</div>
            {openTrades.length === 0 ? <div className="text-xs text-slate-500">No open trades in your journal. When you log open trades, this shows your real net exposure per currency and warns when several trades are the same bet.</div> : (<>
              <div className="grid sm:grid-cols-2 gap-1.5">
                {exposure.map((e) => (
                  <div key={e.k} className="flex items-center justify-between gap-2 text-xs rounded-lg bg-slate-950 border border-slate-800 px-2 py-1.5">
                    <span className="font-bold text-white">{e.k}</span>
                    <span className="text-slate-500 truncate">{e.trades.join(', ')}</span>
                    <span className={`font-mono font-bold shrink-0 ${e.net > 0 ? 'text-emerald-300' : e.net < 0 ? 'text-rose-300' : 'text-slate-400'}`}>{e.net > 0 ? 'LONG' : e.net < 0 ? 'SHORT' : 'flat'} {Math.abs(e.net) >= 1 ? `$${Math.abs(e.net).toFixed(0)} risk` : ''}</span>
                  </div>
                ))}
              </div>
              {stacked.map((e) => <div key={e.k} className="flex gap-2 text-xs text-amber-100 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />You are {e.net > 0 ? 'long' : 'short'} {e.k} in {e.trades.length} trades at once — one {e.k} move hits all of them.</div>)}
              {sameBets.map((t, i) => <div key={i} className="flex gap-2 text-xs text-cyan-100 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5"><Link2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />{t}</div>)}
              {!stacked.length && !sameBets.length && <div className="flex gap-2 text-xs text-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" />Your open trades are not doubling up on the same currency or move.</div>}
            </>)}
          </div>

          {err && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div>}
          {loading && !data && <div className="py-10 text-center text-slate-400 text-sm"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />Measuring 28 pairs and 15 markets…</div>}

          {data && (<>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-widest text-slate-300">Currency strength</div>
                <div className="flex gap-1">{(['d1', 'd5', 'd20'] as const).map((k) => <button key={k} type="button" onClick={() => setSpan(k)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${span === k ? 'bg-emerald-500/20 border-emerald-400/60 text-white' : 'border-slate-800 text-slate-400 hover:text-white'}`}>{k === 'd1' ? '1 day' : k === 'd5' ? '5 days' : '20 days'}</button>)}</div>
              </div>
              {ranked.map((r) => (
                <div key={r.c} className="flex items-center gap-2 text-xs" data-testid="strength-row">
                  <span className="w-9 font-black text-white">{r.c}</span>
                  <div className="relative flex-1 h-3 rounded-full bg-slate-800 overflow-hidden"><div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-600" /><div className={`absolute top-0 bottom-0 ${(r.v as number) >= 0 ? 'left-1/2 bg-emerald-400' : 'right-1/2 bg-rose-400'}`} style={{ width: `${(Math.abs(r.v as number) / maxAbs) * 50}%` }} /></div>
                  <span className={`w-16 text-right font-mono ${(r.v as number) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{(r.v as number) > 0 ? '+' : ''}{(r.v as number).toFixed(2)}%</span>
                </div>
              ))}
              {idea && <div className="text-[11px] text-slate-400 pt-1">Strongest vs weakest right now: <b className="text-white">{strongest.c}</b> vs <b className="text-white">{weakest.c}</b> → <b className="text-cyan-300">{idea.pair}</b> has been moving {idea.dir}. Check fundamentals and the chart before acting.</div>}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="text-xs font-black uppercase tracking-widest text-slate-300">Correlation · last 60 trading days</div>
              <div className="overflow-x-auto">
                <table className="text-[10px] font-mono border-separate" style={{ borderSpacing: 2 }}>
                  <thead><tr><th />{data.symbols.map((s) => <th key={s} className="text-slate-400 font-bold px-0.5 [writing-mode:vertical-rl] rotate-180 h-14">{s}</th>)}</tr></thead>
                  <tbody>{data.symbols.map((a) => (
                    <tr key={a}><th className="text-slate-400 font-bold text-right pr-1 whitespace-nowrap">{a}</th>
                      {data.symbols.map((b) => { const v = data.correlation[a]?.[b] ?? null; return <td key={b} title={`${a} vs ${b}: ${v === null ? 'n/a' : v.toFixed(2)}`} className="w-8 h-7 text-center text-white rounded" style={{ background: a === b ? 'rgba(100,116,139,0.35)' : heat(v) }}>{a === b ? '' : v === null ? '·' : v.toFixed(1).replace('0.', '.')}</td>; })}
                    </tr>))}</tbody>
                </table>
              </div>
              <div className="text-[10.5px] text-slate-500">Green = move together, red = move opposite. Above ±0.7, two trades are close to the same bet.</div>
            </div>
            <div className="text-[10.5px] text-slate-600">Updated {new Date(data.generatedAt).toLocaleTimeString()} · {data.method} Sources: {data.sources.join(', ')}.{data.failed.length ? ` Unavailable now: ${data.failed.join(', ')}.` : ''}</div>
          </>)}
        </div>
      </div>
    </div>,
    document.body,
  );
};
