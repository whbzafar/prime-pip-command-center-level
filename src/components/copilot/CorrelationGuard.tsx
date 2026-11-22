import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { GitMerge, X, RefreshCw, Plus, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';

/** CORRELATION & EXPOSURE GUARD — how markets really move together, and the hidden risk in the trades you hold. */
interface CorrData { ok: boolean; error?: string; generatedAt: string; symbols: string[]; failed: string[]; matrix30: Array<Array<number | null>>; matrix90: Array<Array<number | null>>;
  strong: Array<{ a: string; b: string; r30: number | null; r90: number | null }>; shifting: Array<{ a: string; b: string; r30: number | null; r90: number | null }>; method: string; disclaimer: string }
interface Pos { symbol: string; side: 'LONG' | 'SHORT'; riskPct: number }
interface Exposure { ok: boolean; error?: string; count: number; naiveRiskPct: number; adjustedRiskPct: number; multiplier: number; effectiveBets: number; currencies: Array<{ currency: string; netRiskPct: number }>; findings: Array<{ kind: 'double' | 'hedge'; text: string }>; covered: boolean }

const KEY = 'ppfx_corr_positions_v1';
const cell = (r: number | null) => {
  if (r === null) return { background: 'rgba(100,116,139,.15)', color: '#64748b' };
  const a = Math.min(1, Math.abs(r));
  return { background: r >= 0 ? `rgba(16,185,129,${0.12 + a * 0.6})` : `rgba(244,63,94,${0.12 + a * 0.6})`, color: a > 0.45 ? '#fff' : '#cbd5e1' };
};

export const CorrelationGuard: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [data, setData] = useState<CorrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [win, setWin] = useState<30 | 90>(90);
  const [pos, setPos] = useState<Pos[]>(() => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } });
  const [exp, setExp] = useState<Exposure | null>(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { const j = await fetch('/api/correlation').then((r) => r.json()).catch(() => null); if (!j?.ok) setErr(j?.error || 'Could not reach live market data. Please try again in a minute.'); else setData(j); }
    catch { setErr('No connection — please check your internet.'); }
    setLoading(false);
  }, []);
  useEffect(() => { if (open && !data) void load(); }, [open, data, load]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(pos)); } catch { /* ignore */ } }, [pos]);

  const check = useCallback(async () => {
    const valid = pos.filter((p) => p.symbol && p.riskPct > 0);
    if (!valid.length) { setExp(null); return; }
    setChecking(true);
    try { const j = await fetch('/api/correlation/exposure', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ positions: valid }) }).then((r) => r.json()); setExp(j); }
    catch { setExp({ ok: false, error: 'No connection.' } as Exposure); }
    setChecking(false);
  }, [pos]);
  useEffect(() => { if (!open) return; const t = window.setTimeout(() => void check(), 400); return () => window.clearTimeout(t); }, [pos, open, check]);

  const m = useMemo(() => (data ? (win === 30 ? data.matrix30 : data.matrix90) : []), [data, win]);
  const setP = (i: number, patch: Partial<Pos>) => setPos((a) => a.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  if (!open) return null;
  const syms = data?.symbols || [];

  return createPortal(
    <div className="fixed inset-0 z-[2147483100] flex items-center justify-center p-2 sm:p-4 bg-black/70" onClick={onClose} data-testid="correlation-guard">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl border border-emerald-500/30 shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#020617' }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0"><GitMerge className="w-4 h-4 text-white" /></div>
            <div className="min-w-0"><div className="text-sm font-black text-white tracking-wide">CORRELATION &amp; EXPOSURE GUARD</div>
              <div className="text-[10.5px] text-slate-500 truncate">See which markets move together — and the hidden risk when your trades are really one bet</div></div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => void load()} disabled={loading} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Exposure checker */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <div className="flex items-center justify-between mb-2"><div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">Your trades — hidden-risk check</div>
              <button type="button" onClick={() => setPos((a) => [...a, { symbol: 'EURUSD', side: 'LONG', riskPct: 1 }])} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/50 text-emerald-200 text-[11px] font-bold cursor-pointer hover:bg-emerald-500/10"><Plus className="w-3 h-3" />Add trade</button></div>
            {!pos.length && <div className="text-[12px] text-slate-500 py-2">Add the trades you hold or plan (instrument, direction, % of account at risk). The guard shows your net currency exposure and whether two trades are secretly the same bet. Saved on this device only.</div>}
            <div className="space-y-1.5">
              {pos.map((p, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <select aria-label="Instrument" value={p.symbol} onChange={(e) => setP(i, { symbol: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[12px] text-slate-100">
                    {(syms.length ? syms : ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD']).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="inline-flex rounded-lg overflow-hidden border border-slate-700">
                    {(['LONG', 'SHORT'] as const).map((s) => <button key={s} type="button" onClick={() => setP(i, { side: s })} className={`px-2.5 py-1 text-[11px] font-bold cursor-pointer ${p.side === s ? (s === 'LONG' ? 'bg-emerald-500/30 text-emerald-100' : 'bg-rose-500/30 text-rose-100') : 'text-slate-400'}`}>{s}</button>)}
                  </div>
                  <label className="inline-flex items-center gap-1 text-[11px] text-slate-400">risk <input aria-label="Risk percent" type="number" min={0.1} max={20} step={0.1} value={p.riskPct} onChange={(e) => setP(i, { riskPct: Number(e.target.value) })} className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[12px] text-slate-100" />%</label>
                  <button type="button" aria-label="Remove trade" onClick={() => setPos((a) => a.filter((_, k) => k !== i))} className="p-1.5 text-slate-500 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            {exp && !exp.ok && <div className="mt-2 text-[12px] text-rose-300">{exp.error}</div>}
            {exp?.ok && (
              <div className="mt-3 space-y-2" data-testid="exposure-result">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[['Stop-loss risk', `${exp.naiveRiskPct}%`], ['Real risk (after correlation)', `${exp.adjustedRiskPct}%`], ['Independent bets', `${exp.effectiveBets} of ${exp.count}`], ['Risk multiplier', `×${exp.multiplier}`]].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-slate-800 bg-slate-950/70 p-2"><div className="text-[9.5px] uppercase tracking-wider text-slate-500">{k}</div><div className="text-base font-black text-white">{v}</div></div>
                  ))}
                </div>
                {exp.findings.map((f, i) => (
                  <div key={i} className={`flex gap-2 rounded-lg border p-2 text-[12px] ${f.kind === 'double' ? 'border-amber-500/40 bg-amber-500/10 text-amber-100' : 'border-sky-500/40 bg-sky-500/10 text-sky-100'}`}><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{f.text}</div>
                ))}
                {!exp.findings.length && exp.count > 1 && <div className="flex gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-[12px] text-emerald-100"><ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />No two of these trades are strongly linked — your risk is genuinely spread.</div>}
                <div className="flex flex-wrap gap-1.5">{exp.currencies.map((c) => <span key={c.currency} className={`px-2 py-0.5 rounded-md border text-[11px] font-bold ${c.netRiskPct > 0 ? 'border-emerald-500/40 text-emerald-200' : 'border-rose-500/40 text-rose-200'}`}>{c.currency} {c.netRiskPct > 0 ? '+' : ''}{c.netRiskPct}%</span>)}<span className="text-[10.5px] text-slate-500 self-center">net exposure by currency</span></div>
                {!exp.covered && <div className="text-[11px] text-slate-500">Some instruments have no correlation data here; those are counted as uncorrelated.</div>}
              </div>
            )}
            {checking && <div className="mt-1 text-[10.5px] text-slate-500">Checking…</div>}
          </section>

          {loading && !data && <div className="py-12 text-center text-slate-400 text-sm"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />Measuring correlations on live daily data…</div>}
          {err && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div>}

          {data && (
            <>
              <section>
                <div className="flex items-center gap-2 mb-1.5"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Correlation map</div>
                  {([30, 90] as const).map((w) => <button key={w} type="button" onClick={() => setWin(w)} className={`px-2 py-0.5 rounded-md border text-[11px] font-bold cursor-pointer ${win === w ? 'border-emerald-400/60 bg-emerald-500/20 text-white' : 'border-slate-700 text-slate-400'}`}>{w} days</button>)}</div>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="text-[10.5px] border-collapse mx-auto" data-testid="corr-matrix">
                    <thead><tr><th className="p-1" />{syms.map((s) => <th key={s} className="p-1 font-bold text-slate-400 [writing-mode:vertical-rl] rotate-180 h-16">{s}</th>)}</tr></thead>
                    <tbody>{syms.map((a, i) => (
                      <tr key={a}><th className="pr-2 pl-1 text-right font-bold text-slate-400 whitespace-nowrap">{a}</th>
                        {syms.map((b, j) => <td key={b} title={`${a} / ${b}: ${m[i]?.[j] ?? 'n/a'}`} className="w-9 h-7 text-center font-mono" style={cell(m[i]?.[j] ?? null)}>{i === j ? '·' : m[i]?.[j] === null || m[i]?.[j] === undefined ? '–' : m[i][j]!.toFixed(2).replace('0.', '.').replace('-0.', '-.')}</td>)}</tr>
                    ))}</tbody>
                  </table>
                </div>
                <div className="mt-1 text-[10.5px] text-slate-500">Green = move together · red = move opposite · grey = no data. Window: last {win} trading days.</div>
              </section>
              <div className="grid sm:grid-cols-2 gap-3">
                <section className="rounded-xl border border-slate-800 p-3"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Strongest links (90 days)</div>
                  {data.strong.map((p) => <div key={p.a + p.b} className="flex justify-between text-[12px] py-0.5"><span className="text-slate-200">{p.a} / {p.b}</span><span className={`font-mono font-bold ${p.r90! > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{p.r90!.toFixed(2)}</span></div>)}
                  {!data.strong.length && <div className="text-[12px] text-slate-500">No pair is strongly linked right now.</div>}</section>
                <section className="rounded-xl border border-slate-800 p-3"><div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Relationships that are shifting</div>
                  {data.shifting.map((p) => <div key={p.a + p.b} className="flex justify-between text-[12px] py-0.5"><span className="text-slate-200">{p.a} / {p.b}</span><span className="font-mono text-slate-300">{p.r90!.toFixed(2)} → <b className="text-white">{p.r30!.toFixed(2)}</b></span></div>)}
                  {!data.shifting.length && <div className="text-[12px] text-slate-500">Nothing has changed sharply in the last 30 days.</div>}</section>
              </div>
              <p className="text-[10.5px] text-slate-500">{data.method} {data.disclaimer}{data.failed.length ? ` No live data for: ${data.failed.join(', ')}.` : ''}</p>
            </>
          )}
        </div>
      </div>
    </div>, document.body);
};
export default CorrelationGuard;
