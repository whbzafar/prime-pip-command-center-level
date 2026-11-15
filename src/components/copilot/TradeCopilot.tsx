import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, RefreshCw, ShieldAlert, Target, TrendingUp, TrendingDown, PauseCircle, CalendarClock, Users, Landmark, Activity } from 'lucide-react';

/**
 * TRADE COPILOT — one click turns live price structure, fundamentals, crowd positioning and the
 * economic calendar into a plain trade plan with a position size for the user's own account.
 * All numbers come from /api/copilot/:symbol (live data); nothing is generated client-side except the
 * lot-size arithmetic.
 */
interface CopilotData {
  ok: boolean; error?: string; symbol: string; price: number; digits: number; generatedAt: string;
  action: 'BUY' | 'SELL' | 'WAIT'; conviction: number; combined: number;
  inputs: {
    fundamentals: { score: number; bullishPct: number | null; confidence: number; explanation: string | null } | null;
    trend: { score: number; ema20: number; ema50: number; atr14: number; swingHigh: number; swingLow: number };
    crowd: { longPct: number; shortPct: number; contrarian: number | null; sources: string[] } | null;
  };
  weights: Array<{ input: string; score: number; weight: number }>;
  events: Array<{ currency: string; title: string; at: string; inHours: number; forecast: number | null; previous: number | null }>;
  plan: null | { direction: 'BUY' | 'SELL'; entryZone: [number, number]; entry: number; stop: number; targets: [number, number]; swingTarget: number | null; riskPerUnit: number; invalidation: string; note?: string };
  reasons: string[]; sources: string[]; disclaimer: string;
}

const ACC_KEY = 'ppfx_copilot_account_v1';
const ALIAS: Record<string, string> = { GOLD: 'XAUUSD', SILVER: 'XAGUSD', NAS100: 'US100', SPX500: 'US500', DJ30: 'US30', WTI: 'USOIL', BRENT: 'UKOIL', DE40: 'GER40' };
const clean = (s: string) => { const c = s.toUpperCase().replace(/^[A-Z_]+:/, '').replace(/[^A-Z0-9]/g, '').replace(/USDT$/, 'USD'); return ALIAS[c] || c; };

/** Contract size per 1.00 lot (standard MT5 specs; indices vary by broker). */
function contract(sym: string): { size: number; unit: string; quote: string } {
  if (sym === 'XAUUSD') return { size: 100, unit: 'oz', quote: 'USD' };
  if (sym === 'XAGUSD') return { size: 5000, unit: 'oz', quote: 'USD' };
  if (sym === 'USOIL' || sym === 'UKOIL') return { size: 1000, unit: 'barrels', quote: 'USD' };
  if (/^(US30|US100|US500)$/.test(sym)) return { size: 1, unit: 'index point', quote: 'USD' };
  if (sym === 'GER40') return { size: 1, unit: 'index point', quote: 'EUR' };
  if (sym === 'UK100') return { size: 1, unit: 'index point', quote: 'GBP' };
  if (sym === 'JP225') return { size: 1, unit: 'index point', quote: 'JPY' };
  if (/^(BTC|ETH)USD$/.test(sym)) return { size: 1, unit: 'coin', quote: 'USD' };
  return { size: 100_000, unit: 'units', quote: sym.slice(3) };
}

async function usdPer(ccy: string): Promise<number | null> {
  if (ccy === 'USD') return 1;
  const direct = ['EUR', 'GBP', 'AUD', 'NZD'].includes(ccy);
  try {
    const j = await fetch(`/api/charts/price?symbol=${direct ? `${ccy}USD` : `USD${ccy}`}`).then((r) => r.json());
    if (!(j?.price > 0)) return null;
    return direct ? j.price : 1 / j.price;
  } catch { return null; }
}

const Bar: React.FC<{ v: number }> = ({ v }) => (
  <div className="relative h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-600" />
    <div className={`absolute top-0 bottom-0 ${v >= 0 ? 'left-1/2 bg-emerald-400' : 'right-1/2 bg-rose-400'}`} style={{ width: `${Math.min(50, Math.abs(v) / 2)}%` }} />
  </div>
);

export const TradeCopilot: React.FC<{ open: boolean; symbol: string; onClose: () => void }> = ({ open, symbol, onClose }) => {
  const sym = clean(symbol || 'XAUUSD');
  const [data, setData] = useState<CopilotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [acc, setAcc] = useState<{ balance: number; riskPct: number }>(() => {
    try { const v = JSON.parse(localStorage.getItem(ACC_KEY) || 'null'); if (v && v.balance > 0) return v; } catch { /* ignore */ }
    return { balance: 1000, riskPct: 1 };
  });
  const [quoteUsd, setQuoteUsd] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch(`/api/copilot/${encodeURIComponent(sym)}`);
      const j = await r.json().catch(() => null);
      if (!j?.ok) { setErr(j?.error || 'The copilot could not reach the live data right now. Please try again.'); setData(null); }
      else setData(j);
    } catch { setErr('No connection — please check your internet and try again.'); }
    setLoading(false);
  }, [sym]);

  useEffect(() => { if (open) void load(); }, [open, load]);
  useEffect(() => { if (!open) return; const c = contract(sym); void usdPer(c.quote).then(setQuoteUsd); }, [open, sym]);
  useEffect(() => { try { localStorage.setItem(ACC_KEY, JSON.stringify(acc)); } catch { /* ignore */ } }, [acc]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);

  const sizing = useMemo(() => {
    if (!data?.plan || !quoteUsd) return null;
    const c = contract(sym);
    const riskUsd = (acc.balance * acc.riskPct) / 100;
    const lossPerLotUsd = data.plan.riskPerUnit * c.size * quoteUsd;
    if (!(lossPerLotUsd > 0)) return null;
    const lots = Math.floor((riskUsd / lossPerLotUsd) * 100) / 100;
    return { riskUsd, lots, lossPerLotUsd, reward1: lots * lossPerLotUsd, reward2: lots * lossPerLotUsd * 2, tooSmall: lots < 0.01 };
  }, [data, quoteUsd, acc, sym]);

  if (!open) return null;
  const d = data;
  const fmt = (x: number) => (d ? x.toFixed(d.digits) : String(x));
  const TONE = {
    BUY: { box: 'border-emerald-500/40 bg-emerald-500/10', icon: 'text-emerald-300', txt: 'text-emerald-200' },
    SELL: { box: 'border-rose-500/40 bg-rose-500/10', icon: 'text-rose-300', txt: 'text-rose-200' },
    WAIT: { box: 'border-amber-500/40 bg-amber-500/10', icon: 'text-amber-300', txt: 'text-amber-200' },
  } as const;
  const tone = TONE[d?.action || 'WAIT'];
  const ActIcon = d?.action === 'BUY' ? TrendingUp : d?.action === 'SELL' ? TrendingDown : PauseCircle;

  return createPortal(
    <div className="fixed inset-0 z-[2147483200] flex items-center justify-center p-2 sm:p-4 bg-black/70" onClick={onClose} data-testid="trade-copilot">
      <div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-950 shadow-2xl shadow-cyan-500/10" onClick={(e) => e.stopPropagation()}  style={{ backgroundColor: "#020617" }}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-800 bg-slate-950/95">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-white" /></div>
            <div className="min-w-0">
              <div className="text-sm font-black text-white tracking-wide">TRADE COPILOT · {sym}</div>
              <div className="text-[10.5px] text-slate-500 truncate">Live price structure + fundamentals + crowd + news risk → one plan</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => void load()} disabled={loading} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50" title="Refresh"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" title="Close" aria-label="Close copilot"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {loading && !d && <div className="py-12 text-center text-slate-400 text-sm"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />Reading live price, fundamentals, crowd positioning and the calendar…</div>}
          {err && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div>}

          {d && (<>
            {/* Verdict */}
            <div className={`rounded-2xl border p-4 ${tone.box}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <ActIcon className={`w-8 h-8 ${tone.icon}`} />
                  <div>
                    <div className={`text-2xl font-black ${tone.txt}`} data-testid="copilot-action">{d.action === 'WAIT' ? 'WAIT — no clear edge' : d.action}</div>
                    <div className="text-xs text-slate-400">Price {fmt(d.price)} · conviction {d.conviction}/100</div>
                  </div>
                </div>
                <div className="text-[10.5px] text-slate-500 text-right">Updated {new Date(d.generatedAt).toLocaleTimeString()}</div>
              </div>
              {d.reasons.length > 0 && <ul className="mt-3 space-y-1 text-xs text-slate-300 list-disc pl-5">{d.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
            </div>

            {/* Plan */}
            {d.plan && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-300"><Target className="w-4 h-4" />Trade plan</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-2"><div className="text-[10px] text-slate-500 uppercase">Entry zone</div><div className="font-mono text-sm text-white">{fmt(d.plan.entryZone[0])}–{fmt(d.plan.entryZone[1])}</div></div>
                  <div className="rounded-xl bg-slate-950 border border-rose-500/30 p-2"><div className="text-[10px] text-slate-500 uppercase">Stop loss</div><div className="font-mono text-sm text-rose-300">{fmt(d.plan.stop)}</div></div>
                  <div className="rounded-xl bg-slate-950 border border-emerald-500/30 p-2"><div className="text-[10px] text-slate-500 uppercase">Target 1 (1R)</div><div className="font-mono text-sm text-emerald-300">{fmt(d.plan.targets[0])}</div></div>
                  <div className="rounded-xl bg-slate-950 border border-emerald-500/30 p-2"><div className="text-[10px] text-slate-500 uppercase">Target 2 (2R)</div><div className="font-mono text-sm text-emerald-300">{fmt(d.plan.targets[1])}</div></div>
                </div>
                {d.plan.swingTarget != null && <div className="text-xs text-slate-400">Structure target (20-day {d.plan.direction === 'BUY' ? 'high' : 'low'}): <span className="font-mono text-slate-200">{fmt(d.plan.swingTarget)}</span></div>}
                <div className="text-xs text-amber-200/90 flex gap-2"><ShieldAlert className="w-4 h-4 shrink-0" />{d.plan.invalidation}{d.plan.note ? ` ${d.plan.note}` : ''}</div>

                {/* Position size */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300">Position size for your account</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <label className="flex items-center gap-1.5 text-slate-400">Balance ($)
                      <input type="number" min={1} value={acc.balance} onChange={(e) => setAcc((a) => ({ ...a, balance: Math.max(1, Number(e.target.value) || 0) }))} className="w-24 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-white font-mono outline-none focus:border-cyan-500" />
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-400">Risk %
                      <input type="number" min={0.1} max={10} step={0.1} value={acc.riskPct} onChange={(e) => setAcc((a) => ({ ...a, riskPct: Math.min(10, Math.max(0.1, Number(e.target.value) || 0)) }))} className="w-16 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-white font-mono outline-none focus:border-cyan-500" />
                    </label>
                  </div>
                  {sizing ? (
                    <div className="text-xs text-slate-300 space-y-0.5" data-testid="copilot-size">
                      {sizing.tooSmall
                        ? <div className="text-amber-300">This stop is too wide for a {acc.riskPct}% risk on ${acc.balance} — even 0.01 lot risks ${(sizing.lossPerLotUsd / 100).toFixed(2)}. Skip it or use a cent account.</div>
                        : <div><span className="text-lg font-black text-white font-mono">{sizing.lots.toFixed(2)} lots</span> <span className="text-slate-500">risks ${sizing.riskUsd.toFixed(2)}</span></div>}
                      {!sizing.tooSmall && <div className="text-slate-400">Target 1 ≈ +${sizing.reward1.toFixed(2)} · Target 2 ≈ +${sizing.reward2.toFixed(2)}</div>}
                      <div className="text-[10px] text-slate-600">Standard contract: 1 lot = {contract(sym).size.toLocaleString()} {contract(sym).unit}. Check your broker's contract size{/^(US|GER|UK|JP)/.test(sym) ? ' — index contracts differ a lot between brokers' : ''}.</div>
                    </div>
                  ) : <div className="text-[11px] text-slate-500">Working out the lot size…</div>}
                </div>
              </div>
            )}

            {/* Inputs */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
              <div className="text-xs font-black uppercase tracking-widest text-slate-300">Why — every input, weighted</div>
              {d.weights.map((w) => (
                <div key={w.input} className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-slate-300 flex items-center gap-1.5">{w.input === 'Trend' ? <Activity className="w-3.5 h-3.5" /> : w.input === 'Fundamentals' ? <Landmark className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}{w.input} <span className="text-slate-600">· weight {Math.round(w.weight * 100)}%</span></span><span className={`font-mono font-bold ${w.score >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{w.score > 0 ? '+' : ''}{w.score}</span></div>
                  <Bar v={w.score} />
                </div>
              ))}
              <div className="grid sm:grid-cols-3 gap-2 text-[11px] text-slate-400 pt-1">
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-2"><b className="text-slate-300">Trend</b><br />EMA20 {fmt(d.inputs.trend.ema20)} / EMA50 {fmt(d.inputs.trend.ema50)}<br />Daily ATR {fmt(d.inputs.trend.atr14)}<br />20-day range {fmt(d.inputs.trend.swingLow)}–{fmt(d.inputs.trend.swingHigh)}</div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-2"><b className="text-slate-300">Fundamentals</b><br />{d.inputs.fundamentals ? <>Score {d.inputs.fundamentals.score > 0 ? '+' : ''}{d.inputs.fundamentals.score}{d.inputs.fundamentals.bullishPct != null ? ` · ${Math.round(d.inputs.fundamentals.bullishPct)}% bullish` : ''}<br />Confidence {d.inputs.fundamentals.confidence}%</> : 'No fundamental model for this instrument — left out of the score.'}</div>
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-2"><b className="text-slate-300">Retail crowd</b><br />{d.inputs.crowd ? <>{d.inputs.crowd.longPct.toFixed(0)}% long / {d.inputs.crowd.shortPct.toFixed(0)}% short<br />Read contrarian: {d.inputs.crowd.longPct > 55 ? 'crowd long → bearish tilt' : d.inputs.crowd.longPct < 45 ? 'crowd short → bullish tilt' : 'balanced'}</> : 'No live positioning for this instrument.'}</div>
              </div>
              {d.inputs.fundamentals?.explanation && <div className="text-[11px] text-slate-500 leading-relaxed">{d.inputs.fundamentals.explanation}</div>}
            </div>

            {/* Events */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-300"><CalendarClock className="w-4 h-4" />High-impact news · next 48h</div>
              {d.events.length === 0 ? <div className="text-xs text-slate-500">No high-impact releases for this instrument's currencies in the next 48 hours.</div>
                : d.events.map((e, i) => (
                  <div key={i} className={`flex justify-between gap-2 text-xs rounded-lg px-2 py-1.5 ${e.inHours <= 6 ? 'bg-amber-500/10 border border-amber-500/30 text-amber-100' : 'bg-slate-950 border border-slate-800 text-slate-300'}`}>
                    <span><b>{e.currency}</b> {e.title}</span>
                    <span className="font-mono shrink-0">{e.inHours < 0 ? 'now' : e.inHours < 1 ? '<1h' : `in ${Math.round(e.inHours)}h`}</span>
                  </div>))}
            </div>

            <div className="text-[10.5px] text-slate-600 leading-relaxed">Sources: {d.sources.join(' · ')}.<br />{d.disclaimer}</div>
          </>)}
        </div>
      </div>
    </div>,
    document.body,
  );
};
