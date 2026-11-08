import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Columns2, Grid2x2, LayoutGrid, Link2, Link2Off, Maximize2, Minimize2, Rows2, Search, Square, Layers3 } from 'lucide-react';

/**
 * UNLIMITED CHARTS — multi-chart workspace built on TradingView's official, free
 * "Advanced Real-Time Chart" widget (https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/).
 *
 * Every pane is a genuine TradingView chart: same look, TradingView's live data feed, every
 * timeframe, the drawing-tools sidebar, 100+ built-in indicators, compare, and scroll-back history
 * as deep as TradingView holds for that symbol. No account or subscription is needed. The
 * "Powered by TradingView" attribution must stay visible (widget terms).
 */

export const TV_INTERVALS: Array<{ v: string; label: string }> = [
  { v: '1', label: '1m' }, { v: '3', label: '3m' }, { v: '5', label: '5m' }, { v: '15', label: '15m' }, { v: '30', label: '30m' },
  { v: '60', label: '1H' }, { v: '120', label: '2H' }, { v: '240', label: '4H' }, { v: 'D', label: '1D' }, { v: 'W', label: '1W' }, { v: 'M', label: '1M' },
];

export const TV_QUICK_SYMBOLS: Array<{ group: string; items: Array<{ s: string; n: string }> }> = [
  { group: 'Forex', items: [
    { s: 'FX:EURUSD', n: 'EUR/USD' }, { s: 'FX:GBPUSD', n: 'GBP/USD' }, { s: 'FX:USDJPY', n: 'USD/JPY' }, { s: 'FX:AUDUSD', n: 'AUD/USD' },
    { s: 'FX:USDCAD', n: 'USD/CAD' }, { s: 'FX:USDCHF', n: 'USD/CHF' }, { s: 'FX:NZDUSD', n: 'NZD/USD' }, { s: 'FX:GBPJPY', n: 'GBP/JPY' },
    { s: 'FX:EURJPY', n: 'EUR/JPY' }, { s: 'FX:EURGBP', n: 'EUR/GBP' }, { s: 'TVC:DXY', n: 'US Dollar Index' },
  ] },
  { group: 'Metals & Energy', items: [
    { s: 'OANDA:XAUUSD', n: 'Gold' }, { s: 'OANDA:XAGUSD', n: 'Silver' }, { s: 'OANDA:XPTUSD', n: 'Platinum' }, { s: 'TVC:USOIL', n: 'WTI Crude' },
    { s: 'TVC:UKOIL', n: 'Brent' }, { s: 'CAPITALCOM:NATURALGAS', n: 'Natural Gas' }, { s: 'CAPITALCOM:COPPER', n: 'Copper' },
  ] },
  { group: 'Indices', items: [
    { s: 'SP:SPX', n: 'S&P 500' }, { s: 'NASDAQ:NDX', n: 'Nasdaq 100' }, { s: 'DJ:DJI', n: 'Dow Jones' }, { s: 'XETR:DAX', n: 'DAX 40' },
    { s: 'TVC:UKX', n: 'FTSE 100' }, { s: 'TVC:NI225', n: 'Nikkei 225' }, { s: 'TVC:VIX', n: 'VIX' },
  ] },
  { group: 'Crypto', items: [
    { s: 'BINANCE:BTCUSDT', n: 'Bitcoin' }, { s: 'BINANCE:ETHUSDT', n: 'Ethereum' }, { s: 'BINANCE:XRPUSDT', n: 'XRP' }, { s: 'BINANCE:SOLUSDT', n: 'Solana' },
    { s: 'BINANCE:BNBUSDT', n: 'BNB' }, { s: 'BINANCE:DOGEUSDT', n: 'Dogecoin' },
  ] },
  { group: 'Stocks', items: [
    { s: 'NASDAQ:AAPL', n: 'Apple' }, { s: 'NASDAQ:MSFT', n: 'Microsoft' }, { s: 'NASDAQ:NVDA', n: 'NVIDIA' }, { s: 'NASDAQ:TSLA', n: 'Tesla' },
    { s: 'NASDAQ:AMZN', n: 'Amazon' }, { s: 'NASDAQ:META', n: 'Meta' }, { s: 'NYSE:JPM', n: 'JPMorgan' },
  ] },
];

const STUDY_PRESETS: Array<{ id: string; label: string }> = [
  { id: 'STD;EMA', label: 'EMA' },
  { id: 'STD;Bollinger_Bands', label: 'Bollinger' },
  { id: 'STD;VWAP', label: 'VWAP' },
  { id: 'STD;RSI', label: 'RSI' },
  { id: 'STD;MACD', label: 'MACD' },
];

type LayoutId = '1' | '2v' | '2h' | '3' | '4' | '6' | '8';
const LAYOUTS: Array<{ id: LayoutId; panes: number; label: string; icon: React.ComponentType<{ className?: string }>; grid: string }> = [
  { id: '1', panes: 1, label: '1 chart', icon: Square, grid: 'grid-cols-1 grid-rows-1' },
  { id: '2v', panes: 2, label: '2 side by side', icon: Columns2, grid: 'grid-cols-1 md:grid-cols-2 md:grid-rows-1' },
  { id: '2h', panes: 2, label: '2 stacked', icon: Rows2, grid: 'grid-cols-1 grid-rows-2' },
  { id: '3', panes: 3, label: '3 charts', icon: Layers3, grid: 'grid-cols-1 md:grid-cols-3 md:grid-rows-1' },
  { id: '4', panes: 4, label: '4 charts', icon: Grid2x2, grid: 'grid-cols-1 md:grid-cols-2 md:grid-rows-2' },
  { id: '6', panes: 6, label: '6 charts', icon: LayoutGrid, grid: 'grid-cols-1 md:grid-cols-3 md:grid-rows-2' },
  { id: '8', panes: 8, label: '8 charts', icon: LayoutGrid, grid: 'grid-cols-1 md:grid-cols-4 md:grid-rows-2' },
];

interface PaneState { symbol: string; interval: string; studies: string[] }
interface WorkspaceState { layout: LayoutId; panes: PaneState[]; syncSymbol: boolean; syncInterval: boolean; height: number }

const STORAGE_KEY = 'ppfx.unlimitedCharts.workspace.v1';
const DEFAULT_PANES: PaneState[] = [
  { symbol: 'OANDA:XAUUSD', interval: '60', studies: [] },
  { symbol: 'FX:EURUSD', interval: '60', studies: [] },
  { symbol: 'TVC:DXY', interval: '60', studies: [] },
  { symbol: 'BINANCE:BTCUSDT', interval: '60', studies: [] },
  { symbol: 'SP:SPX', interval: '60', studies: [] },
  { symbol: 'FX:GBPUSD', interval: '60', studies: [] },
  { symbol: 'NASDAQ:NDX', interval: '60', studies: [] },
  { symbol: 'TVC:USOIL', interval: '60', studies: [] },
];
const DEFAULT_STATE: WorkspaceState = { layout: '1', panes: DEFAULT_PANES, syncSymbol: false, syncInterval: false, height: 760 };

function loadState(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const s = JSON.parse(raw);
    const panes: PaneState[] = Array.from({ length: 8 }, (_, i) => ({ ...DEFAULT_PANES[i], ...(s?.panes?.[i] || {}) }));
    return { ...DEFAULT_STATE, ...s, panes };
  } catch {
    return DEFAULT_STATE;
  }
}

/** Normalizes user input like "eurusd", "XAU/USD", "btcusdt" into a TradingView symbol. */
export function normalizeTvSymbol(input: string): string {
  const raw = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return '';
  if (raw.includes(':')) return raw;
  const s = raw.replace('/', '');
  for (const g of TV_QUICK_SYMBOLS) for (const it of g.items) if (it.s.split(':')[1] === s) return it.s;
  if (/^(XAU|XAG|XPT|XPD)[A-Z]{3}$/.test(s)) return `OANDA:${s}`;
  if (/USDT$|USDC$/.test(s)) return `BINANCE:${s}`;
  if (/^[A-Z]{6}$/.test(s)) return `FX:${s}`;
  return s; // TradingView resolves bare tickers (e.g. AAPL, SPX) itself
}

// ───────────────────────────────────────── single TradingView pane

const TradingViewPane: React.FC<{ pane: PaneState; index: number; onChange: (p: Partial<PaneState>) => void; maximized: boolean; onToggleMax: () => void }> = ({ pane, index, onChange, maximized, onToggleMax }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [symbolInput, setSymbolInput] = useState(pane.symbol);
  useEffect(() => setSymbolInput(pane.symbol), [pane.symbol]);

  // (Re)build the official widget whenever symbol / timeframe / preset indicators change.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.height = '100%';
    container.style.width = '100%';
    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = 'calc(100% - 22px)';
    widget.style.width = '100%';
    const copyright = document.createElement('div');
    copyright.className = 'tradingview-widget-copyright';
    copyright.style.cssText = 'font-size:10px;line-height:22px;text-align:right;padding-right:6px;color:#64748b';
    copyright.innerHTML = '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color:#38bdf8">Charts powered by TradingView</a>';
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: pane.symbol,
      interval: pane.interval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: 'rgba(2, 6, 23, 1)',
      gridColor: 'rgba(30, 41, 59, 0.6)',
      allow_symbol_change: true,
      hide_side_toolbar: false, // drawing tools sidebar
      hide_top_toolbar: false,
      hide_legend: false,
      withdateranges: true,
      save_image: true,
      details: false,
      hotlist: false,
      calendar: false,
      studies: pane.studies,
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(widget);
    container.appendChild(copyright);
    container.appendChild(script);
    host.appendChild(container);
    return () => { host.innerHTML = ''; };
  }, [pane.symbol, pane.interval, pane.studies.join(',')]);

  const submitSymbol = () => {
    const s = normalizeTvSymbol(symbolInput);
    if (s && s !== pane.symbol) onChange({ symbol: s });
  };

  return (
    <div className="flex flex-col min-h-0 min-w-0 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-800 bg-slate-900/80 flex-wrap">
        <span className="text-[10px] font-mono-code text-slate-500 w-4 text-center">{index + 1}</span>
        <form onSubmit={(e) => { e.preventDefault(); submitSymbol(); }} className="relative">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value)}
            onBlur={submitSymbol}
            list="tv-quick-symbols"
            aria-label={`Symbol for chart ${index + 1}`}
            className="w-40 pl-6 pr-2 py-1 rounded-md bg-slate-950 border border-slate-700 text-[11.5px] font-mono-code text-slate-100 focus:outline-none focus:border-cyan-500/60"
          />
        </form>
        <div className="flex rounded-md border border-slate-700 overflow-hidden">
          {TV_INTERVALS.map((iv) => (
            <button key={iv.v} type="button" onClick={() => onChange({ interval: iv.v })}
              className={`px-1.5 py-1 text-[10.5px] font-mono-code cursor-pointer ${pane.interval === iv.v ? 'bg-cyan-500/20 text-cyan-200' : 'bg-slate-950 text-slate-400 hover:text-slate-200'}`}>
              {iv.label}
            </button>
          ))}
        </div>
        <div className="hidden xl:flex gap-1">
          {STUDY_PRESETS.map((st) => {
            const on = pane.studies.includes(st.id);
            return (
              <button key={st.id} type="button" title={`Toggle ${st.label} on load (add any of 100+ indicators from the chart's Indicators button)`}
                onClick={() => onChange({ studies: on ? pane.studies.filter((x) => x !== st.id) : [...pane.studies, st.id] })}
                className={`px-1.5 py-1 rounded text-[10px] font-mono-code border cursor-pointer ${on ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                {st.label}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onToggleMax} aria-label={maximized ? 'Restore layout' : 'Maximize chart'}
          className="ml-auto p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
          {maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div ref={hostRef} className="flex-1 min-h-[320px]" />
    </div>
  );
};

// ───────────────────────────────────────── workspace

export const TradingViewWorkspace: React.FC = () => {
  const [state, setState] = useState<WorkspaceState>(loadState);
  const [maxIndex, setMaxIndex] = useState<number | null>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }, [state]);

  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
  const visible = maxIndex !== null ? [maxIndex] : Array.from({ length: layout.panes }, (_, i) => i);

  const updatePane = useCallback((i: number, patch: Partial<PaneState>) => {
    setState((s) => {
      const panes = s.panes.map((p, j) => {
        if (j === i) return { ...p, ...patch };
        const next = { ...p };
        if (patch.symbol && s.syncSymbol) next.symbol = patch.symbol;
        if (patch.interval && s.syncInterval) next.interval = patch.interval;
        return next;
      });
      return { ...s, panes };
    });
  }, []);

  const multiTimeframe = () => {
    const sym = state.panes[0].symbol;
    const tfs = ['15', '60', '240', 'D'];
    setMaxIndex(null);
    setState((s) => ({ ...s, layout: '4', syncSymbol: true, syncInterval: false, panes: s.panes.map((p, i) => (i < 4 ? { ...p, symbol: sym, interval: tfs[i] } : p)) }));
  };

  const gridClass = maxIndex !== null ? 'grid-cols-1 grid-rows-1' : layout.grid;
  const datalist = useMemo(() => TV_QUICK_SYMBOLS.flatMap((g) => g.items), []);

  return (
    <div className="space-y-3">
      <datalist id="tv-quick-symbols">
        {datalist.map((it) => <option key={it.s} value={it.s}>{it.n}</option>)}
      </datalist>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2.5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono-code uppercase tracking-widest text-cyan-400 mr-1">Layout</span>
        <div className="flex gap-1">
          {LAYOUTS.map((l) => {
            const Icon = l.icon;
            return (
              <button key={l.id} type="button" title={l.label} aria-label={l.label} onClick={() => { setMaxIndex(null); setState((s) => ({ ...s, layout: l.id })); }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-mono-code cursor-pointer ${state.layout === l.id && maxIndex === null ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-100' : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'}`}>
                <Icon className="w-3.5 h-3.5" /> {l.panes}
              </button>
            );
          })}
        </div>
        <span className="w-px h-6 bg-slate-800 mx-1" />
        <button type="button" onClick={() => setState((s) => ({ ...s, syncSymbol: !s.syncSymbol }))}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono-code cursor-pointer ${state.syncSymbol ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 bg-slate-900 text-slate-400'}`}>
          {state.syncSymbol ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />} Sync symbol
        </button>
        <button type="button" onClick={() => setState((s) => ({ ...s, syncInterval: !s.syncInterval }))}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono-code cursor-pointer ${state.syncInterval ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 bg-slate-900 text-slate-400'}`}>
          {state.syncInterval ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />} Sync timeframe
        </button>
        <button type="button" onClick={multiTimeframe}
          className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-[11px] font-mono-code text-slate-300 hover:text-white hover:border-cyan-500/50 cursor-pointer">
          Multi-timeframe (15m · 1H · 4H · 1D)
        </button>
        <label className="ml-auto flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
          Height
          <input type="range" min={480} max={1400} step={20} value={state.height} onChange={(e) => setState((s) => ({ ...s, height: Number(e.target.value) }))} aria-label="Workspace height" />
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TV_QUICK_SYMBOLS.map((g) => (
          <div key={g.group} className="flex items-center gap-1 flex-wrap">
            <span className="text-[9.5px] font-mono-code uppercase text-slate-500 mr-0.5">{g.group}</span>
            {g.items.map((it) => (
              <button key={it.s} type="button" title={`${it.s} — loads into chart 1${state.syncSymbol ? ' (and all synced charts)' : ''}`}
                onClick={() => updatePane(maxIndex ?? 0, { symbol: it.s })}
                className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10.5px] text-slate-300 hover:text-white hover:border-cyan-500/40 cursor-pointer">
                {it.n}
              </button>
            ))}
            <span className="w-2" />
          </div>
        ))}
      </div>

      <div className={`grid gap-2 ${gridClass}`} style={{ height: state.height }}>
        {visible.map((i) => (
          <TradingViewPane key={i} index={i} pane={state.panes[i]} onChange={(p) => updatePane(i, p)}
            maximized={maxIndex === i} onToggleMax={() => setMaxIndex((m) => (m === i ? null : i))} />
        ))}
      </div>

      <p className="text-[10.5px] font-mono-code text-slate-500 leading-relaxed">
        Each pane is TradingView’s official Advanced Real-Time Chart: type any symbol TradingView lists (e.g. FX:EURUSD, OANDA:XAUUSD, BINANCE:BTCUSDT, NASDAQ:AAPL),
        use the left toolbar for drawing tools and “Indicators” for 100+ studies, and scroll left to load older history. Data comes from TradingView’s feed — forex and crypto
        stream in real time; some exchanges (e.g. CME futures) are delayed on the free feed, as TradingView marks on the chart. Drawings live inside each chart session.
      </p>
    </div>
  );
};
