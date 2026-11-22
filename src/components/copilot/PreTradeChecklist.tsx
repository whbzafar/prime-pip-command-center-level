import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Trade } from '../../types';
import { disciplineChecks, DEFAULT_LIMITS, type Limits } from '../../utils/dailyGuard';
import { ClipboardCheck, X, CheckCircle2, AlertTriangle, XCircle, MinusCircle, Loader2 } from 'lucide-react';

/** PRE-TRADE CHECKLIST — news, correlation, risk size and fundamentals in one pass (live data only). */
interface Check { id: string; title: string; status: 'pass' | 'warn' | 'fail' | 'skip'; detail: string }
interface Result { ok: boolean; error?: string; verdict: 'clear' | 'caution' | 'stop'; headline: string; checks: Check[]; disclaimer: string }
const LIM_KEY = 'ppfx_daily_limits_v1';
const POS_KEY = 'ppfx_corr_positions_v1'; // the open positions saved by the Correlation & Exposure Guard
const ICON = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle, skip: MinusCircle } as const;
const COLOR = { pass: 'text-emerald-400', warn: 'text-amber-400', fail: 'text-rose-400', skip: 'text-slate-500' } as const;
const VERDICT = { clear: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200', caution: 'border-amber-500/40 bg-amber-500/10 text-amber-200', stop: 'border-rose-500/40 bg-rose-500/10 text-rose-200' } as const;

export const PreTradeChecklist: React.FC<{ open: boolean; onClose: () => void; symbol?: string; trades?: Trade[]; balance?: number }> = ({ open, onClose, symbol, trades = [], balance = 0 }) => {
  const [limits, setLimits] = useState<Limits>(() => { try { return { ...DEFAULT_LIMITS, ...JSON.parse(localStorage.getItem(LIM_KEY) || '{}') }; } catch { return DEFAULT_LIMITS; } });
  const [showLim, setShowLim] = useState(false);
  useEffect(() => { try { localStorage.setItem(LIM_KEY, JSON.stringify(limits)); } catch { /* ignore */ } }, [limits]);
  const [sym, setSym] = useState('');
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [risk, setRisk] = useState('1');
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => { if (open) { setRes(null); if (symbol && !sym) setSym(String(symbol).replace(/^[A-Z]+:/, '').toUpperCase()); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  if (!open) return null;

  const run = async () => {
    setBusy(true);
    let held: any[] = [];
    try { const v = JSON.parse(localStorage.getItem(POS_KEY) || '[]'); if (Array.isArray(v)) held = v; } catch { /* ignore */ }
    setOpenCount(held.filter((p) => p?.symbol && p?.riskPct > 0).length);
    try {
      const j = await fetch('/api/pretrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trade: { symbol: sym, side, riskPct: Number(risk) }, open: held }) }).then((r) => r.json());
      if (j?.ok) {
        const d = disciplineChecks(trades, balance, limits);
        const checks = [...d, ...j.checks];
        const bad = checks.filter((c: Check) => c.status === 'fail').length, warn = checks.filter((c: Check) => c.status === 'warn').length;
        j.checks = checks; j.verdict = bad ? 'stop' : warn ? 'caution' : 'clear';
        j.headline = bad ? 'Not now — fix the red items first.' : warn ? 'Proceed carefully — review the amber items.' : 'No red flags from your journal or the live data.';
      }
      setRes(j);
    } catch { setRes({ ok: false, error: 'No connection — please check your internet.' } as Result); }
    setBusy(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-[2147483100] flex items-center justify-center p-2 sm:p-4 bg-black/70" onClick={onClose} data-testid="pretrade-checklist">
      <div className="w-full max-w-lg max-h-[94vh] overflow-y-auto rounded-2xl border border-cyan-500/30 shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#020617' }}>
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-cyan-300" /><div><div className="text-sm font-black text-white tracking-wide">PRE-TRADE CHECKLIST</div><div className="text-[10.5px] text-slate-500">News · correlation · risk · fundamentals — before you click</div></div></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <input value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} placeholder="XAUUSD" className="col-span-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white font-mono" aria-label="Instrument" />
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              {(['LONG', 'SHORT'] as const).map((s) => <button key={s} onClick={() => setSide(s)} className={`flex-1 text-xs font-bold ${side === s ? (s === 'LONG' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white') : 'bg-slate-900 text-slate-400'}`}>{s === 'LONG' ? 'Buy' : 'Sell'}</button>)}
            </div>
            <div className="relative"><input value={risk} onChange={(e) => setRisk(e.target.value)} inputMode="decimal" className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-2.5 pr-6 py-2 text-sm text-white font-mono" aria-label="Risk percent" /><span className="absolute right-2 top-2 text-xs text-slate-500">%</span></div>
          </div>
          <button onClick={run} disabled={busy || !sym || !(Number(risk) > 0)} className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-sm font-bold flex items-center justify-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />}Check this trade</button>
          <div className="text-[11px] text-slate-500">Uses today's trades from your journal (Pakistan time) and the open positions saved in the Correlation &amp; Exposure Guard{openCount ? ` (${openCount} found)` : ''}.</div>
          <button onClick={() => setShowLim((v) => !v)} className="text-[11px] text-cyan-400 underline">{showLim ? 'Hide' : 'Edit'} my daily limits</button>
          {showLim && (
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
              {([['maxDailyLossPct', 'Max daily loss %'], ['maxTrades', 'Max trades/day'], ['maxLossStreak', 'Max losses in a row']] as const).map(([k, label]) => (
                <label key={k} className="space-y-1"><span>{label}</span><input type="number" min={1} value={limits[k]} onChange={(e) => setLimits((l) => ({ ...l, [k]: Math.max(0.5, Number(e.target.value) || 1) }))} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-white font-mono" /></label>))}
            </div>)}
          {res && !res.ok && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">{res.error}</div>}
          {res?.ok && (
            <div className="space-y-2">
              <div className={`rounded-lg border p-3 text-sm font-bold ${VERDICT[res.verdict]}`}>{res.headline}</div>
              {res.checks.map((c) => { const I = ICON[c.status]; return (
                <div key={c.id} className="flex gap-2.5 rounded-lg border border-slate-800 p-2.5"><I className={`w-5 h-5 shrink-0 ${COLOR[c.status]}`} /><div><div className="text-[13px] font-bold text-slate-100">{c.title}</div><div className="text-[12px] text-slate-400">{c.detail}</div></div></div>); })}
              <div className="text-[10.5px] text-slate-600">{res.disclaimer}</div>
            </div>)}
        </div>
      </div>
    </div>, document.body);
};
