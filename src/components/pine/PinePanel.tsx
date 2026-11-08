/**
 * PINE EDITOR — runs real Pine Script® v5/v6 (indicators AND strategies) on a full chart.
 *
 * TradingView's free embedded chart cannot load custom scripts, so scripts run here on Vela
 * (LuxAlgo's open-source chart, Apache-2.0) through PineTS (open-source Pine runtime, AGPL-3.0 —
 * this repository is public, which satisfies its source-availability terms). The chart is fed by
 * the app's own deep-history feed (Dukascopy archive / HistData / Yahoo / Binance), so a script
 * sees the same data as the rest of the app, back to each instrument's first bar.
 *
 * Editor: line numbers, Tab indent, Ctrl/Cmd+Enter = Add to chart, Ctrl/Cmd+S = Save.
 * "Save & publish" stores the script in this browser and keeps it applied on every symbol and
 * timeframe; published scripts load automatically whenever the Pine chart opens.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Code2, Eye, EyeOff, FilePlus2, Loader2, Play, Save, Trash2, Upload, X } from 'lucide-react';
import { VelaWorkspace } from '@luxalgo/vela/workspace';
import type { DataProvider, OHLCV } from '@luxalgo/vela';
import { PineWorkerEngine } from '@luxalgo/vela-pinets';
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS, type CatalogEntry } from '../chartAnalysis/fullHistoryDatafeed';

interface SavedScript { id: string; name: string; source: string; published: boolean; updatedAt: number }
const STORE = 'ppfx_pine_scripts_v1';
const loadScripts = (): SavedScript[] => { try { return JSON.parse(localStorage.getItem(STORE) || '[]'); } catch { return []; } };
const saveScripts = (s: SavedScript[]) => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* storage full/blocked */ } };
const titleOf = (src: string) => (src.match(/(?:indicator|strategy|library)\s*\(\s*(?:title\s*=\s*)?["']([^"']+)["']/)?.[1] || 'Untitled script').slice(0, 60);

const TEMPLATE = `//@version=6
indicator("My indicator", overlay=true)
fast = ta.ema(close, 9)
slow = ta.ema(close, 21)
plot(fast, "EMA 9", color.new(color.aqua, 0), 2)
plot(slow, "EMA 21", color.new(color.orange, 0), 2)
plotshape(ta.crossover(fast, slow), "Buy", shape.triangleup, location.belowbar, color.lime, size=size.small)
plotshape(ta.crossunder(fast, slow), "Sell", shape.triangledown, location.abovebar, color.red, size=size.small)
`;

// ───────────────────────────── symbol / timeframe mapping
const ALIAS: Record<string, string> = { SPX500: 'US500', NAS100: 'US100', BRENT: 'UKOIL' };
export const catalogFor = (sym: string) => { const c = sym.replace(/^[A-Z_]+:/, '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return CATALOG.find((e) => e.ticker === (ALIAS[c] || c)); };
/** TradingView interval (1, 5, 60, 240, D, W, M) → Vela timeframe (same notation). */
export const velaTf = (iv: string) => ({ '1': '1', '3': '3', '5': '5', '15': '15', '30': '30', '60': '60', '120': '120', '180': '180', '240': '240', D: 'D', '1D': 'D', W: 'W', '1W': 'W', M: 'M', '1M': 'M' } as Record<string, string>)[iv] || '60';
const PERIOD_TEXT: Record<string, string> = { '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m', '60': '1H', '120': '2H', '240': '4H', D: 'D', W: 'W', M: 'M' };
const normTf = (tf: string) => {
  const t = String(tf).trim();
  const m = t.match(/^(\d+)\s*([mhdwM]?)$/);
  if (m) { const n = Number(m[1]); const u = m[2]; if (u === 'h') return String(n * 60); if (u === 'd') return 'D'; if (u === 'w') return 'W'; if (u === 'M') return 'M'; return String(n); }
  return t.toUpperCase().replace(/^1/, '');
};

/** Vela data provider backed by the app's full-history feed (same data as Unlimited Charts / replay). */
function makeProvider(): DataProvider {
  const feed = new FullHistoryDatafeed(() => {});
  return {
    async getBars(ticker, timeframe, range) {
      const entry = CATALOG.find((e) => e.ticker === ticker.replace(/^PPFX:/i, '').toUpperCase());
      const text = PERIOD_TEXT[normTf(timeframe)];
      const period = PRO_PERIODS.find((p) => p.text === text);
      if (!entry || !period) return [];
      const to = range.to ?? Date.now() + 60_000;
      let rows: any[] = [];
      for (let attempt = 0; attempt < 2 && !rows.length; attempt++) {
        try { rows = (await feed.getHistoryKLineData(entry as any, period, 0, to)) || []; } catch { rows = []; }
      }
      const bars: OHLCV[] = rows.map((r) => ({ time: r.timestamp, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume ?? 0 }))
        .filter((b) => (range.from === undefined || b.time >= range.from) && b.time < to)
        .sort((a, b) => a.time - b.time);
      return bars.filter((b, i) => i === 0 || b.time !== bars[i - 1].time);
    },
    async listSymbols() {
      return CATALOG.map((e) => ({ ticker: e.ticker, description: e.name, type: e.market === 'forex' ? 'forex' : e.market === 'crypto' ? 'crypto' : e.market === 'stocks' ? 'stock' : e.market === 'indices' ? 'index' : 'commodity' })) as any;
    },
    async getSymbolInfo(ticker: string) {
      const e = CATALOG.find((x) => x.ticker === ticker) as CatalogEntry | undefined;
      const p = e?.pricePrecision ?? 2;
      return { ticker, description: e?.name || ticker, type: e?.market || 'forex', currency: e?.market === 'crypto' ? 'USDT' : 'USD', mintick: Number((10 ** -p).toFixed(p)), pricescale: 10 ** p, timezone: 'Etc/UTC', session: e?.market === 'crypto' ? '24x7' : '24x5' } as any;
    },
  } as DataProvider;
}

// ───────────────────────────── editor with line numbers
const CodeEditor: React.FC<{ value: string; onChange: (v: string) => void; onRun: () => void; onSave: () => void; errorLine?: number | null }> = ({ value, onChange, onRun, onSave, errorLine }) => {
  const ta = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const lines = value.split('\n').length;
  return (
    <div className="relative flex h-full font-mono text-[12.5px] leading-[19px] bg-[#0b0f17]">
      <div ref={gutter} className="select-none text-right pr-2 pl-2 pt-2 text-slate-600 overflow-hidden bg-[#090c12] border-r border-slate-800" aria-hidden>
        {Array.from({ length: lines }, (_, i) => <div key={i} className={errorLine === i + 1 ? 'text-rose-400 font-bold' : ''}>{i + 1}</div>)}
      </div>
      <textarea ref={ta} value={value} spellCheck={false} aria-label="Pine Script editor"
        onScroll={(e) => { if (gutter.current) gutter.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop; }}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(); return; }
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); onSave(); return; }
          if (e.key === 'Tab') {
            e.preventDefault();
            const el = e.currentTarget; const a = el.selectionStart, b = el.selectionEnd;
            const next = value.slice(0, a) + '    ' + value.slice(b);
            onChange(next);
            requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = a + 4; });
          }
        }}
        className="flex-1 resize-none bg-transparent text-slate-100 caret-cyan-300 outline-none p-2 whitespace-pre overflow-auto" />
    </div>
  );
};

// ───────────────────────────── panel
export const PinePanel: React.FC<{ symbol: string; interval: string; onClose: () => void }> = ({ symbol, interval, onClose }) => {
  const host = useRef<HTMLDivElement>(null);
  const ws = useRef<VelaWorkspace | null>(null);
  const running = useRef(new Map<string, () => void>()); // script id → remove()
  const [scripts, setScripts] = useState<SavedScript[]>(() => loadScripts());
  const [activeId, setActiveId] = useState<string | null>(() => loadScripts()[0]?.id || null);
  const [code, setCode] = useState<string>(() => loadScripts()[0]?.source || TEMPLATE);
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'error'; text: string; line?: number | null }>({ kind: 'idle', text: 'Write or paste a Pine Script® (v5/v6), then “Add to chart”.' });
  const [ready, setReady] = useState(false);
  const entry = useMemo(() => catalogFor(symbol), [symbol]);
  const tf = velaTf(interval);

  const persist = (next: SavedScript[]) => { setScripts(next); saveScripts(next); };

  const runOnChart = useCallback(async (id: string, source: string): Promise<boolean> => {
    const chart = ws.current?.chart;
    if (!chart) return false;
    running.current.get(id)?.();
    running.current.delete(id);
    setStatus({ kind: 'busy', text: `Compiling and running “${titleOf(source)}”…` });
    const res: any = await chart.runScript(source);
    if (res?.ok) {
      running.current.set(id, () => { try { res.remove(); } catch { /* already gone */ } });
      const st = res.run?.strategy;
      setStatus({ kind: 'ok', text: `“${titleOf(source)}” is running on ${entry?.ticker} ${PERIOD_TEXT[tf] || tf}.${st ? ` Strategy: net P&L ${Number(st.netPnl ?? 0).toFixed(2)}, ${st.closedTrades ?? st.totalTrades ?? 0} closed trades.` : ''}` });
      return true;
    }
    const err = res?.error;
    const msg = typeof err === 'string' ? err : err?.message || JSON.stringify(err || 'Unknown error');
    const line = Number(err?.line ?? err?.loc?.line ?? (String(msg).match(/line\s+(\d+)/i)?.[1] ?? NaN));
    setStatus({ kind: 'error', text: msg, line: Number.isFinite(line) ? line : null });
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, tf]);

  // Build the chart once.
  useEffect(() => {
    if (!host.current || !entry) return;
    const w = new VelaWorkspace(host.current, {
      layout: false, symbol: entry.ticker, timeframe: tf, theme: 'dark', live: true, persist: false,
      providers: { ppfx: () => makeProvider() },
      engines: { pine: () => new PineWorkerEngine() },
    } as any);
    ws.current = w;
    let alive = true;
    w.chart.ready().then(async () => {
      if (!alive) return;
      setReady(true);
      for (const s of loadScripts().filter((x) => x.published)) await runOnChart(s.id, s.source);
    }).catch(() => {});
    return () => { alive = false; running.current.clear(); try { w.destroy(); } catch { /* ignore */ } ws.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the Premium chart's symbol / timeframe (scripts re-run automatically on the new bars).
  useEffect(() => {
    const chart = ws.current?.chart;
    if (!chart || !entry) return;
    chart.setMarket({ symbol: entry.ticker, timeframe: tf }).catch?.(() => {});
  }, [entry, tf]);

  const current = scripts.find((s) => s.id === activeId) || null;
  const addToChart = () => runOnChart(activeId || 'draft', code);
  const save = (publish: boolean) => {
    const now = Date.now();
    let next: SavedScript[];
    let id = activeId;
    if (current) next = scripts.map((s) => (s.id === current.id ? { ...s, source: code, name: titleOf(code), published: publish || s.published, updatedAt: now } : s));
    else { id = `pine_${now}`; next = [{ id, name: titleOf(code), source: code, published: publish, updatedAt: now }, ...scripts]; setActiveId(id); }
    persist(next);
    if (publish && id) runOnChart(id, code);
    else setStatus({ kind: 'ok', text: `Saved “${titleOf(code)}”.` });
  };
  const newScript = () => { setActiveId(null); setCode(TEMPLATE); setStatus({ kind: 'idle', text: 'New script — edit, then “Add to chart”.' }); };
  const togglePublished = (s: SavedScript) => {
    const next = scripts.map((x) => (x.id === s.id ? { ...x, published: !x.published } : x));
    persist(next);
    if (s.published) { running.current.get(s.id)?.(); running.current.delete(s.id); setStatus({ kind: 'idle', text: `“${s.name}” removed from the chart.` }); }
    else runOnChart(s.id, s.source);
  };
  const remove = (s: SavedScript) => {
    running.current.get(s.id)?.(); running.current.delete(s.id);
    const next = scripts.filter((x) => x.id !== s.id);
    persist(next);
    if (activeId === s.id) { setActiveId(next[0]?.id || null); setCode(next[0]?.source || TEMPLATE); }
  };
  const importFile = (f: File) => f.text().then((t) => { setActiveId(null); setCode(t); setStatus({ kind: 'idle', text: `Loaded ${f.name} — “Add to chart” to run it.` }); });

  if (!entry) return <div className="p-4 text-[12px] text-amber-300">No data feed for {symbol} in the Pine chart yet.</div>;

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0b0f17] overflow-hidden shadow-2xl">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-gradient-to-r from-[#0d1424] to-[#0b0f17]">
        <Code2 className="w-4 h-4 text-cyan-400" />
        <span className="text-[12px] font-bold text-slate-100 tracking-wide">Pine Editor</span>
        <span className="text-[10.5px] text-slate-500 hidden md:inline">Pine Script® v5/v6 · indicators &amp; strategies · {entry.ticker} {PERIOD_TEXT[tf] || tf} · runs on the Pine chart below with full-depth data</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={newScript} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 text-[11px] text-slate-300 hover:text-white cursor-pointer"><FilePlus2 className="w-3.5 h-3.5" />New</button>
          <label className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 text-[11px] text-slate-300 hover:text-white cursor-pointer"><Upload className="w-3.5 h-3.5" />Open .pine<input type="file" accept=".pine,.txt,.pinescript" className="hidden" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} /></label>
          <button type="button" onClick={() => save(false)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700 text-[11px] text-slate-300 hover:text-white cursor-pointer"><Save className="w-3.5 h-3.5" />Save</button>
          <button type="button" onClick={() => save(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-violet-500/20 border border-violet-400/50 text-[11px] text-violet-100 font-semibold hover:bg-violet-500/30 cursor-pointer">Save &amp; publish</button>
          <button type="button" onClick={addToChart} disabled={!ready || status.kind === 'busy'} className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-sky-500 text-[11.5px] font-bold text-slate-950 disabled:opacity-50 cursor-pointer" title="Ctrl/Cmd + Enter">
            {status.kind === 'busy' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}Add to chart
          </button>
          <button type="button" onClick={onClose} aria-label="Close Pine Editor" className="p-1 rounded-md text-slate-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      </div>
      <div className={`px-3 py-1.5 text-[11.5px] border-b flex items-start gap-2 ${status.kind === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : status.kind === 'ok' ? 'bg-emerald-500/[0.07] border-emerald-500/20 text-emerald-200' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
        {status.kind === 'error' ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : status.kind === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : status.kind === 'busy' ? <Loader2 className="w-3.5 h-3.5 mt-0.5 animate-spin shrink-0" /> : null}
        <span className="whitespace-pre-wrap break-words">{status.kind === 'error' && status.line ? `Line ${status.line}: ` : ''}{status.text}</span>
      </div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
        <div ref={host} className="h-[620px] min-w-0 border-r border-slate-800" />
        <div className="flex flex-col h-[620px]">
          <div className="flex-1 min-h-0"><CodeEditor value={code} onChange={setCode} onRun={addToChart} onSave={() => save(false)} errorLine={status.kind === 'error' ? status.line : null} /></div>
          <div className="border-t border-slate-800 max-h-[170px] overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-mono-code uppercase tracking-[0.14em] text-slate-500">My scripts ({scripts.length})</div>
            {scripts.length === 0 && <div className="px-3 pb-2 text-[11px] text-slate-500">Saved scripts appear here. Published scripts stay on the chart for every symbol and timeframe.</div>}
            {scripts.map((s) => (
              <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 text-[11.5px] ${s.id === activeId ? 'bg-cyan-500/10' : 'hover:bg-slate-900'}`}>
                <button type="button" onClick={() => { setActiveId(s.id); setCode(s.source); }} className="flex-1 min-w-0 text-left truncate text-slate-200 cursor-pointer">{s.name}</button>
                {s.published && <span className="text-[9px] uppercase px-1.5 py-0.5 rounded border border-violet-400/40 text-violet-200">published</span>}
                <button type="button" onClick={() => togglePublished(s)} title={s.published ? 'Remove from chart' : 'Publish to chart'} className="text-slate-400 hover:text-white cursor-pointer">{s.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}</button>
                <button type="button" onClick={() => remove(s)} title="Delete script" className="text-slate-500 hover:text-rose-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] text-slate-500 leading-relaxed">
        Scripts run on Vela (open-source chart) through PineTS, an independent open-source Pine Script® runtime — TradingView’s embedded chart cannot load custom scripts. Most Pine v5/v6 features run (plots, shapes, labels, lines, boxes, tables, inputs, request.security on these symbols, strategy orders with on-chart fills); a feature PineTS has not implemented yet is reported here with its line. Scripts are saved in this browser.
      </div>
    </div>
  );
};

export default PinePanel;
