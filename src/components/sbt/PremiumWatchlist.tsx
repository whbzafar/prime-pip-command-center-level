import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronDown, ListPlus, Plus, Star, X } from 'lucide-react';
import { chartSymbolFor, useRankings, type RankedPair } from '../fundamentalAnalysis/LiveBiasStrip';
import { TOP_N, useLevelAlerts } from '../../services/sbtSetups';
import { LevelBadge } from './LevelAlerts';

const K_LIST = 'ppfx_watchlist_v1';
const K_OPEN = 'ppfx_watchlist_open_v1';
const read = <T,>(k: string, d: T): T => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };
const clean = (s: string) => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
const score = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '' : `${v > 0 ? '+' : ''}${v.toFixed(0)}`);

/**
 * Watchlist for Premium TradingView: the live top long-term bullish and bearish pairs (always
 * current — they follow the fundamentals engine) plus the pairs the user adds. Tap a pair to open it.
 */
export const PremiumWatchlist: React.FC<{ activeSymbol?: string; onSelect: (chartSymbol: string) => void; known: { symbol: string; label: string }[] }> = ({ activeSymbol, onSelect, known }) => {
  const { data } = useRankings();
  const levels = useLevelAlerts();
  const [open, setOpen] = useState<boolean>(() => read(K_OPEN, true));
  const [mine, setMine] = useState<string[]>(() => read<string[]>(K_LIST, []).map(clean).filter(Boolean));
  const [draft, setDraft] = useState('');
  const active = clean(activeSymbol || '');
  const labels = useMemo(() => new Map(known.map((k) => [k.symbol, k.label])), [known]);
  const ranked = useMemo(() => {
    const m = new Map<string, RankedPair>();
    for (const l of [data?.longTerm.bullish, data?.longTerm.bearish]) for (const p of l || []) { m.set(p.symbol, p); m.set(chartSymbolFor(p.symbol), p); }
    return m;
  }, [data]);
  const save = (l: string[]) => { setMine(l); write(K_LIST, l); };
  const add = (raw: string) => { const s = clean(raw); if (s.length < 3 || mine.includes(s)) { setDraft(''); return; } save([...mine, s].slice(0, 40)); setDraft(''); };
  const toggle = () => { write(K_OPEN, !open); setOpen(!open); };
  const hits = levels.pairs.filter((p) => p.hit).length;

  const Item: React.FC<{ sym: string; display: string; lt?: number | null; onRemove?: () => void }> = ({ sym, display, lt, onRemove }) => {
    const up = (lt ?? 0) > 0; const has = lt !== null && lt !== undefined;
    const on = chartSymbolFor(sym) === active || sym === active;
    return (
      <div className={`group flex items-center gap-1.5 pl-2 pr-1.5 py-1.5 rounded-lg border text-[12px] transition ${on ? 'border-cyan-400/70 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}>
        <button type="button" onClick={() => onSelect(chartSymbolFor(sym))} className="flex-1 min-w-0 flex items-center gap-1.5 text-left cursor-pointer" title={`Open ${display}`}>
          {has ? (up ? <ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 shrink-0 text-rose-400" />) : <Star className="w-3 h-3 shrink-0 text-slate-500" />}
          <span className="font-semibold text-slate-100 truncate">{display}</span>
          <LevelBadge symbol={sym} state={levels} compact />
          {has && <span className={`ml-auto font-mono-code text-[10.5px] ${up ? 'text-emerald-300' : 'text-rose-300'}`}>{score(lt)}</span>}
        </button>
        {onRemove && <button type="button" onClick={onRemove} aria-label={`Remove ${display}`} title="Remove from my pairs" className="p-0.5 rounded text-slate-600 hover:text-rose-300 cursor-pointer"><X className="w-3 h-3" /></button>}
      </div>
    );
  };

  return (
    <div data-testid="premium-watchlist" className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950 via-[#0b1424] to-slate-950">
      <button type="button" onClick={toggle} className="w-full flex items-center gap-2 px-3 py-2 cursor-pointer text-left">
        <ListPlus className="w-4 h-4 text-cyan-400" />
        <span className="text-[11px] font-mono-code uppercase tracking-[0.16em] text-cyan-300">Watchlist</span>
        <span className="text-[10.5px] text-slate-500 hidden sm:inline">top fundamental pairs, updated live · your own pairs</span>
        {hits > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-extrabold">{hits} at key level</span>}
        <ChevronDown className={`ml-auto w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 grid gap-3 md:grid-cols-3">
          {([['Top bullish pairs', data?.longTerm.bullish, 'text-emerald-300'], ['Top bearish pairs', data?.longTerm.bearish, 'text-rose-300']] as const).map(([title, list, cls]) => (
            <div key={title} className="space-y-1.5 min-w-0">
              <div className={`text-[10px] uppercase tracking-widest font-bold ${cls}`}>{title}</div>
              {(list || []).slice(0, TOP_N).map((p) => <Item key={p.symbol} sym={p.symbol} display={p.display} lt={p.longTerm} />)}
              {!list && <div className="text-[11px] text-slate-500">Loading live ranking…</div>}
              {list && !list.length && <div className="text-[11px] text-slate-500">None right now.</div>}
            </div>
          ))}
          <div className="space-y-1.5 min-w-0">
            <div className="text-[10px] uppercase tracking-widest font-bold text-slate-300">My pairs</div>
            <form onSubmit={(e) => { e.preventDefault(); add(draft); }} className="flex gap-1.5">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} list="ppfx-watchlist-known" placeholder="Add pair, e.g. GBPJPY" aria-label="Add a pair to my watchlist"
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[12px] font-mono-code uppercase text-slate-100 placeholder:normal-case placeholder:text-slate-500 outline-none focus:border-cyan-400" />
              <datalist id="ppfx-watchlist-known">{known.map((k) => <option key={k.symbol} value={k.symbol}>{k.label}</option>)}</datalist>
              <button type="submit" className="px-2 rounded-lg border border-cyan-400/50 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 cursor-pointer" aria-label="Add pair"><Plus className="w-4 h-4" /></button>
            </form>
            {active && !mine.includes(active) && <button type="button" onClick={() => add(active)} className="text-[10.5px] text-cyan-300 hover:text-cyan-100 cursor-pointer">+ add the open chart ({labels.get(active) || active})</button>}
            {mine.map((s) => <Item key={s} sym={s} display={labels.get(s) || ranked.get(s)?.display || s} lt={ranked.get(s)?.longTerm} onRemove={() => save(mine.filter((x) => x !== s))} />)}
            {!mine.length && <div className="text-[11px] text-slate-500">Add any pair and it stays here on this device.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumWatchlist;
