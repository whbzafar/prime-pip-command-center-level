import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Columns2, Expand, Grid2x2, Layers3, LayoutGrid, Link2, Link2Off, Maximize2, Minimize2, Rows2, Shrink, Square } from 'lucide-react';
import { ProChartPane, type ProPaneState } from './ProChartPane';
import { CATALOG, PRO_PERIODS, type FeedStatus } from './fullHistoryDatafeed';

/**
 * UNLIMITED CHARTS — TradingView-style multi-chart workspace with complete history.
 * Each pane is a KLineChart Pro chart fed by Dukascopy / Binance / Yahoo (see fullHistoryDatafeed):
 * scroll left and older bars keep loading until the instrument's first recorded data.
 */

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

const QUICK: Array<{ group: string; tickers: string[] }> = [
  { group: 'Forex', tickers: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'GBPJPY', 'EURJPY', 'EURGBP'] },
  { group: 'Metals & Energy', tickers: ['XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'NATGAS', 'COPPER'] },
  { group: 'Indices', tickers: ['US500', 'US100', 'US30', 'GER40', 'UK100', 'JP225', 'DXY', 'VIX'] },
  { group: 'Crypto', tickers: ['BTCUSDT', 'ETHUSDT', 'XRPUSDT', 'SOLUSDT', 'BNBUSDT', 'DOGEUSDT'] },
  { group: 'Stocks', tickers: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'JPM'] },
];

interface WorkspaceState { layout: LayoutId; panes: ProPaneState[]; syncSymbol: boolean; syncInterval: boolean; height: number }
const STORAGE_KEY = 'ppfx.unlimitedCharts.pro.v2';
const DEFAULT_PANES: ProPaneState[] = [
  { ticker: 'XAUUSD', period: '1H' }, { ticker: 'EURUSD', period: '1H' }, { ticker: 'DXY', period: '1H' }, { ticker: 'BTCUSDT', period: '1H' },
  { ticker: 'US500', period: '1H' }, { ticker: 'GBPUSD', period: '1H' }, { ticker: 'US100', period: '1H' }, { ticker: 'USOIL', period: '1H' },
];
const DEFAULT_STATE: WorkspaceState = { layout: '1', panes: DEFAULT_PANES, syncSymbol: false, syncInterval: false, height: 780 };

function loadState(): WorkspaceState {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!s) return DEFAULT_STATE;
    const panes = Array.from({ length: 8 }, (_, i) => ({ ...DEFAULT_PANES[i], ...(s.panes?.[i] || {}) }));
    return { ...DEFAULT_STATE, ...s, panes };
  } catch { return DEFAULT_STATE; }
}

export const TradingViewWorkspace: React.FC = () => {
  const [state, setState] = useState<WorkspaceState>(loadState);
  const [maxIndex, setMaxIndex] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState<Record<number, FeedStatus>>({});
  /** Full-window overlay used when the browser refuses the Fullscreen API (e.g. inside a frame). */
  const [overlay, setOverlay] = useState(false);
  const [fsPane, setFsPane] = useState<number | null>(null);
  const paneRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);

  useEffect(() => {
    const onFs = () => {
      const el = document.fullscreenElement || (document as any).webkitFullscreenElement;
      setIsFullscreen(!!el && el === rootRef.current);
      // Leaving real full screen (Esc / browser UI) must also clear any pane/overlay state.
      if (!el) { setFsPane(null); setOverlay(false); }
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs as any);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOverlay(false); setFsPane(null); } };
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs as any);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  /** Real browser full screen when permitted; otherwise a full-window overlay. */
  const enterNativeFullscreen = async (el: HTMLElement | null): Promise<boolean> => {
    if (!el) return false;
    const req = (el.requestFullscreen || (el as any).webkitRequestFullscreen)?.bind(el);
    if (!req || !(document.fullscreenEnabled ?? (document as any).webkitFullscreenEnabled)) return false;
    try { await req(); return true; } catch { return false; }
  };
  const exitNativeFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if ((document as any).webkitFullscreenElement) (document as any).webkitExitFullscreen();
    } catch { /* ignore */ }
  };

  const fullscreenActive = isFullscreen || overlay;
  const toggleFullscreen = async () => {
    if (fullscreenActive) { setOverlay(false); await exitNativeFullscreen(); return; }
    setFsPane(null);
    if (!(await enterNativeFullscreen(rootRef.current))) setOverlay(true);
  };

  const togglePaneFullscreen = async (i: number) => {
    if (fsPane === i) { setFsPane(null); await exitNativeFullscreen(); return; }
    setFsPane(i);
    await enterNativeFullscreen(paneRefs.current[i] || null); // overlay styling applies either way
  };

  const layout = LAYOUTS.find((l) => l.id === state.layout) || LAYOUTS[0];
  const visible = maxIndex !== null ? [maxIndex] : Array.from({ length: layout.panes }, (_, i) => i);

  const updatePane = useCallback((i: number, next: ProPaneState) => {
    setState((s) => {
      const prev = s.panes[i];
      const panes = s.panes.map((p, j) => {
        if (j === i) return next;
        const q = { ...p };
        if (s.syncSymbol && next.ticker !== prev.ticker) q.ticker = next.ticker;
        if (s.syncInterval && next.period !== prev.period) q.period = next.period;
        return q;
      });
      return { ...s, panes };
    });
  }, []);

  const multiTimeframe = () => {
    const t = state.panes[active].ticker;
    const tfs = ['15m', '1H', '4H', 'D'];
    setMaxIndex(null);
    setState((s) => ({ ...s, layout: '4', syncSymbol: true, syncInterval: false, panes: s.panes.map((p, i) => (i < 4 ? { ticker: t, period: tfs[i] } : p)) }));
  };

  const height = fullscreenActive ? 'calc(100vh - 118px)' : state.height;
  const gridClass = maxIndex !== null ? 'grid-cols-1 grid-rows-1' : layout.grid;

  return (
    <div ref={rootRef} className={`space-y-3 ${fullscreenActive ? 'bg-slate-950 p-3 overflow-auto' : ''} ${overlay ? 'fixed inset-0 z-[2147483000]' : ''}`}>
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
        {(['syncSymbol', 'syncInterval'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setState((s) => ({ ...s, [k]: !s[k] }))}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono-code cursor-pointer ${state[k] ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 bg-slate-900 text-slate-400'}`}>
            {state[k] ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />} {k === 'syncSymbol' ? 'Sync symbol' : 'Sync timeframe'}
          </button>
        ))}
        <button type="button" onClick={multiTimeframe}
          className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-[11px] font-mono-code text-slate-300 hover:text-white hover:border-cyan-500/50 cursor-pointer">
          Multi-timeframe (15m · 1H · 4H · D)
        </button>
        <div className="ml-auto flex items-center gap-2">
          {!fullscreenActive && (
            <label className="flex items-center gap-2 text-[11px] font-mono-code text-slate-400">
              Height
              <input type="range" min={480} max={1600} step={20} value={state.height} onChange={(e) => setState((s) => ({ ...s, height: Number(e.target.value) }))} aria-label="Workspace height" />
            </label>
          )}
          <button type="button" onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-500/10 text-[11px] font-mono-code font-bold text-cyan-100 hover:bg-cyan-500/20 cursor-pointer">
            {fullscreenActive ? <><Shrink className="w-3.5 h-3.5" /> Exit full screen</> : <><Expand className="w-3.5 h-3.5" /> Full screen</>}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {QUICK.map((g) => (
          <div key={g.group} className="flex items-center gap-1 flex-wrap">
            <span className="text-[9.5px] font-mono-code uppercase text-slate-500 mr-0.5">{g.group}</span>
            {g.tickers.map((t) => {
              const c = CATALOG.find((x) => x.ticker === t);
              return (
                <button key={t} type="button" title={`${c?.name || t} → chart ${active + 1}`}
                  onClick={() => updatePane(active, { ...state.panes[active], ticker: t })}
                  className={`px-2 py-0.5 rounded-md border text-[10.5px] cursor-pointer ${state.panes[active].ticker === t ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-100' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40'}`}>
                  {t}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className={`grid gap-2 ${gridClass}`} style={{ height }}>
        {visible.map((i) => {
          const p = state.panes[i];
          return (
            <div key={i} ref={(el) => { paneRefs.current[i] = el; }} onMouseDown={() => setActive(i)}
              className={`flex flex-col min-h-[340px] min-w-0 overflow-hidden bg-[#151517] ${fsPane === i ? 'fixed inset-0 z-[2147483000] rounded-none border-0' : 'rounded-xl border'} ${active === i && layout.panes > 1 && maxIndex === null ? 'border-cyan-500/60' : 'border-slate-800'}`}>
              <div className="flex items-center gap-2 px-2 py-1 border-b border-slate-800 bg-slate-950 text-[10.5px] font-mono-code">
                <span className="text-slate-500">#{i + 1}</span>
                <span className="text-slate-200 font-bold">{p.ticker}</span>
                <span className="text-slate-500">· {p.period}</span>
                <PaneStatus st={status[i]} />
                <button type="button" onClick={() => togglePaneFullscreen(i)} aria-label={fsPane === i ? 'Exit full screen' : 'Full screen'}
                  className="ml-auto px-1.5 py-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer flex items-center gap-1">
                  {fsPane === i ? <><Shrink className="w-3.5 h-3.5" /> Exit</> : <Expand className="w-3.5 h-3.5" />}
                </button>
                <button type="button" onClick={() => setMaxIndex((m) => (m === i ? null : i))} aria-label={maxIndex === i ? 'Restore layout' : 'Maximize chart'}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
                  {maxIndex === i ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ProChartPane state={p} onStateChange={(s) => updatePane(i, s)} onStatus={(st) => setStatus((m) => ({ ...m, [i]: st }))} onToggleFullscreen={() => togglePaneFullscreen(i)} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10.5px] font-mono-code text-slate-500 leading-relaxed">
        Scroll or drag the chart to the left and older bars load automatically until the first recorded data: forex & gold minute bars from 2003 and EUR/USD daily from 1973 (Dukascopy Bank SA),
        crypto from its Binance listing at every timeframe, and index/stock daily, weekly & monthly bars from their first trade (Yahoo Finance — e.g. S&P 500 from 1927; intraday from Dukascopy CFDs).
        Search any of 1,500+ instruments with the symbol button; drawing tools are on the left, indicators and screenshot in the top bar. Crypto streams live; other markets refresh every 15 s.
      </p>
    </div>
  );
};

const PaneStatus: React.FC<{ st?: FeedStatus }> = ({ st }) => {
  if (!st) return null;
  if (st.state === 'loading') return <span className="text-slate-500">· loading…</span>;
  if (st.state === 'error') return <span className="text-rose-400 truncate" title={st.message}>· data error: {st.message}</span>;
  const from = st.oldest ? new Date(st.oldest).toISOString().slice(0, 10) : null;
  return (
    <span className="text-slate-500 truncate">
      · {st.source}{from ? ` · loaded back to ${from}` : ''}{st.state === 'start' ? (/backup/i.test(st.source) ? ' · backup source limit (full Dukascopy archive is being built)' : ' · start of available history') : ''}
    </span>
  );
};
