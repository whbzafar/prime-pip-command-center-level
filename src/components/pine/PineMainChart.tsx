/**
 * PREMIUM MAIN CHART (TradingView-style, Vela engine on the app's own live full-history feed).
 *
 * One chart for everything — indicators and strategies draw directly on it, so nothing opens a
 * second chart:
 *  - Countdown to bar close under the live price label on the price scale (built in).
 *  - Price alerts like TradingView: hover the price scale → "+" → "Add alert"; drag an alert's
 *    label to move it; click it to edit / re-arm / delete. Right-click on the chart also offers
 *    "Add alert here". Alerts sound (your chosen alert sound) and notify when the price crosses.
 *  - Auto-save: drawings are saved per symbol every time they change (including Undo / Redo with
 *    Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z) and come back on reload; tool styles are remembered too.
 *  - Indicators: each shown indicator is applied exactly once (duplicates are removed).
 *
 * Students' indicators run on the server (RemotePineEngine) — their browser never receives the
 * code. The administrator's scripts and drafts run locally in a worker.
 */
import { IND_CATS, indCategory } from '../../utils/indicatorCategories';
import { pineCompat } from '../../utils/pineCompat';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellOff, Check, Loader2, Minus, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { VelaWorkspace } from '@luxalgo/vela/workspace';
import { TvLeftToolbar } from './TvLeftToolbar';
import { registerIcon, registerRendererLayer, registerWidgetAction } from '@luxalgo/vela/plugin';
import { PineWorkerEngine } from '@luxalgo/vela-pinets';
import { catalogFor, makeProvider, normTf, prewarmPopular, velaTf, venueSymbol } from './pineData';
import { DRAFT_ID, hideIndicator, indicatorStatus, loadLibrary, pineLib, setIndicatorStatus, showIndicator, type LibraryScript } from './pineLibrary';
import { RemotePineEngine, REMOTE_LANG, remoteRef, warmPine } from './remoteEngine';
import { markOnScreen, priceAlerts, type AlertCondition, type PriceAlert } from './priceAlerts';

interface Running { key: string; remove: () => void }

/** Bars of history loaded behind the chart (the library default is only 500). */
const HISTORY_BARS = 5000;
const DRAW_KEY = (t: string) => `ppfx_drawings_v1:${t}`;
const TOOLS_KEY = 'ppfx_drawing_tools_v1';
const REVERSE_ALIAS: Record<string, string> = { US500: 'SPX500', US100: 'NAS100' };

// ───────────────────────────── chart ↔ overlay coordinate bridge (one renderer layer, all charts)
interface Mapping { canvas: HTMLCanvasElement; width: number; paneTop: number; paneHeight: number; priceToY: (p: number) => number; yToPrice: (y: number) => number }
interface Binding { mapping: Mapping | null; lines: () => { price: number; color: string; dashed: boolean }[]; onFrame: () => void }
const bindings = new Map<HTMLElement, Binding>();
const LOOK_KEY = 'ppfx_pro_chart_look_v1';
const GRID_KEY = 'ppfx_pro_chart_grid_v1'; // '0' = grid lines hidden
const THEME_KEY = 'ppfx_pro_chart_theme_v1';
const savedTheme = (): string => { try { const t = localStorage.getItem(THEME_KEY); return t === 'light' || t === 'dark' ? t : 'light'; } catch { return 'light'; } };

/** TradingView-style chrome for the Pro chart: same top row (timeframe chips · style · Indicators · Alert · camera) and the same left tool order. */
const TV_SKIN_ID = 'ppfx-tv-skin';
const TV_SKIN_CSS = `
.ppfx-tv-skin .vela-widget-topbar{padding:4px 8px;gap:2px;border-bottom:1px solid rgba(128,140,160,.28);min-height:38px}
.ppfx-tv-skin .vela-widget-tf,.ppfx-tv-skin .vela-widget-style,.ppfx-tv-skin .vela-widget-indicators,.ppfx-tv-skin .vela-widget-action-left{border-radius:4px;padding:5px 9px;font-weight:600;font-size:13px;transition:background .12s}
.ppfx-tv-skin .vela-widget-tf[data-current='1']{background:rgba(41,98,255,.14);color:#2962ff}
.ppfx-tv-skin .vela-widget-tf:hover,.ppfx-tv-skin .vela-widget-style:hover,.ppfx-tv-skin .vela-widget-indicators:hover{background:rgba(128,140,160,.18)}
.ppfx-tv-skin .vela-widget-indicators{font-weight:600}
.ppfx-tv-skin .vela-dtb{border-right:1px solid rgba(128,140,160,.28)}
.ppfx-tv-skin .vela-dtb-btn,.ppfx-tv-skin .vela-dtb-cell{border-radius:4px}
.ppfx-tv-skin .vela-dtb-btn:hover,.ppfx-tv-skin .vela-dtb-cell:hover{background:rgba(128,140,160,.2)}
`;
const PRO_TF_LIST: Array<[string, string]> = [['1', '1 minute'], ['3', '3 minutes'], ['5', '5 minutes'], ['15', '15 minutes'], ['30', '30 minutes'], ['60', '1 hour'], ['120', '2 hours'], ['240', '4 hours'], ['D', '1 day'], ['W', '1 week'], ['M', '1 month']];
const TV_TIMEFRAMES = ['1', '15', '30', '60', '240', 'D', 'W'];
function ensureTvSkin() {
  if (typeof document === 'undefined' || document.getElementById(TV_SKIN_ID)) return;
  const st = document.createElement('style'); st.id = TV_SKIN_ID; st.textContent = TV_SKIN_CSS; document.head.appendChild(st);
}
let registered = false;
function registerPlugins() {
  if (registered) return;
  registered = true;
  try {
    registerIcon('ppfx-bell', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M19 3v4M17 5h4"/></svg>');
    registerIcon('ppfx-expand', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>');
  } catch { /* icons optional */ }
  registerRendererLayer({
    id: 'ppfx-alert-lines',
    placement: 'above-data',
    create: () => {
      let canvas: HTMLCanvasElement | null = null;
      return {
        mount(c: HTMLCanvasElement) { canvas = c; },
        render(args: any) {
          if (!canvas) return;
          const g = canvas.getContext('2d');
          if (!g) return;
          const dpr = args.coords.dpr || window.devicePixelRatio || 1;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, canvas.width, canvas.height);
          let b: Binding | undefined;
          for (const [el, x] of bindings) if (el.contains(canvas)) { b = x; break; }
          if (!b) return;
          const { scale, bounds, coords } = args;
          b.mapping = {
            canvas, width: coords.width, paneTop: bounds.top, paneHeight: bounds.height,
            priceToY: (p) => coords.priceToY(p, scale, bounds), yToPrice: (y) => coords.yToPrice(y, scale, bounds),
          };
          g.setTransform(dpr, 0, 0, dpr, 0, 0);
          for (const l of b.lines()) {
            const y = Math.round(coords.priceToY(l.price, scale, bounds)) + 0.5;
            if (y < bounds.top || y > bounds.top + bounds.height) continue;
            g.strokeStyle = l.color; g.lineWidth = 1; g.setLineDash(l.dashed ? [5, 4] : []);
            g.beginPath(); g.moveTo(0, y); g.lineTo(coords.width, y); g.stroke();
          }
          g.setLineDash([]);
          b.onFrame();
        },
      };
    },
  } as any);
  const fire = (name: string, ctx: any, extra: Record<string, unknown> = {}) => window.dispatchEvent(new CustomEvent(name, { detail: { chart: ctx.chart, symbol: ctx.symbol, ...extra } }));
  // The chart's own "Indicators" button (and the "/" key) opens the Prime Pip indicator library + built-in studies.
  registerWidgetAction({
    id: 'indicators', target: 'topbar', label: 'Indicators', icon: 'indicators',
    run: (ctx: any) => {
      const natives = Promise.resolve(ctx.chart?.availableNativeIndicators?.() || []).catch(() => []);
      fire('ppfx:indicators-menu', ctx, { natives, addNative: (t: string) => ctx.addNativeIndicator?.(t) });
    },
  } as any);
  registerWidgetAction({ id: 'ppfx.price-alerts', target: 'topbar', label: 'Price alerts', icon: 'ppfx-bell', iconOnly: true, order: 5, run: (ctx: any) => fire('ppfx:alerts-panel', ctx) } as any);
  registerWidgetAction({ id: 'ppfx.fullscreen', target: 'topbar', label: 'Full screen (Esc to exit)', icon: 'ppfx-expand', iconOnly: true, order: 50, run: (ctx: any) => fire('ppfx:fullscreen', ctx) } as any);
  registerWidgetAction({
    id: 'ppfx.add-alert', target: 'context:body', label: 'Add alert here', icon: 'ppfx-bell', order: -100,
    when: (ctx: any) => ctx.pointer?.paneKind === 'price' && Number.isFinite(ctx.pointer?.price),
    run: (ctx: any) => fire('ppfx:add-alert', ctx, { price: ctx.pointer.price }),
  } as any);
}


/** Quant Edge signals as timeline marks (B / S at entries, ✓ / ✗ at exits) for the chart's market. */
async function loadEdgeMarks(chart: any, ticker: string) {
  try {
    if (!chart?.marks) return;
    chart.marks.defineGroup?.({ id: 'quantedge', label: 'Quant Edge signals' });
    const get = () => fetch(`/api/quant-edge/trades/${encodeURIComponent(ticker)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    let j = await get();
    if (!j) { await new Promise((r) => setTimeout(r, 3000)); j = await get(); } // one retry (cold start)
    const old = (chart.marks.all?.() || []).filter((m: any) => m.group === 'quantedge');
    old.forEach((m: any) => chart.marks.remove(m.id));
    if (!j?.ok || !j.covered) return;
    const dp = (x: number) => (x >= 1000 ? x.toFixed(2) : x >= 20 ? x.toFixed(3) : x.toFixed(5));
    const when = (t: number) => new Date(t).toLocaleString([], { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    for (const t of j.trades as any[]) {
      const buy = t.dir === 1;
      chart.marks.add({
        id: `qe-in-${t.entryTime}`, time: t.entryTime, group: 'quantedge',
        title: `Quant Edge ${buy ? 'BUY' : 'SELL'}${t.open ? ' (open)' : ''}`,
        tooltip: `${buy ? 'BUY' : 'SELL'} ${dp(t.entry)}${t.open ? ' · open' : ` · ${t.r > 0 ? '+' : ''}${t.r}R`}`,
        glyph: { shape: 'pin', color: buy ? '#10b981' : '#f43f5e', letter: buy ? 'B' : 'S' },
        content: { panel: { items: [
          { type: 'field', label: 'Setup', value: j.engine === 'TREND' ? `Trend breakout · ${j.tf}` : `Pullback · ${j.tf}` },
          { type: 'field', label: 'Entry', value: `${dp(t.entry)} · ${when(t.entryTime)}` },
          { type: 'field', label: t.open ? 'Stop now' : 'Initial stop', value: dp(t.open ? t.stop : t.stop0) },
          ...(t.open ? [] : [{ type: 'field', label: 'Exit', value: `${dp(t.exit)} · ${t.reason}` }, { type: 'field', label: 'Result', value: `${t.r > 0 ? '+' : ''}${t.r}R` }]),
        ] } },
      });
      if (!t.open && t.exitTime) chart.marks.add({
        id: `qe-out-${t.entryTime}`, time: t.exitTime, group: 'quantedge', title: 'Quant Edge exit',
        tooltip: `Exit ${dp(t.exit)} · ${t.r > 0 ? '+' : ''}${t.r}R (${t.reason})`,
        glyph: { shape: 'circle', color: t.r >= 0 ? '#22d3ee' : '#64748b', letter: t.r >= 0 ? '✓' : '×' },
      });
    }
  } catch { /* markers are optional */ }
}

const fmtPrice = (p: number, digits: number) => (Number.isFinite(p) ? p.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—');

export const PineMainChart: React.FC<{
  symbol: string; interval: string; height?: number | string;
  onSymbolChange?: (sym: string) => void; onIntervalChange?: (iv: string) => void; onToggleFullscreen?: () => void;
}> = ({ symbol, interval, height = '100%', onSymbolChange, onIntervalChange, onToggleFullscreen }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const ws = useRef<VelaWorkspace | null>(null);
  const running = useRef(new Map<string, Running>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const tickerRef = useRef<string>('');
  const savedJson = useRef<string>('');
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [build, setBuild] = useState(0);
  const [lib, setLib] = useState(() => ({ ...pineLib.get() }));
  const entry = useMemo(() => catalogFor(symbol), [symbol]);
  const digits = entry?.pricePrecision ?? 2;
  const tf = velaTf(interval);
  const cbs = useRef({ onSymbolChange, onIntervalChange, onToggleFullscreen });
  cbs.current = { onSymbolChange, onIntervalChange, onToggleFullscreen };

  useEffect(() => pineLib.subscribe(() => setLib({ ...pineLib.get() })), []);
  useEffect(() => { if (lib.scripts.length) warmPine(lib.scripts); }, [lib.scripts]);

  // ── drawings auto-save (per symbol)
  // A symbol's drawings are only ever written after they have been loaded INTO the chart for that symbol
  // (loadedFor), and an empty chart never overwrites a stored non-empty document unless the user really
  // deleted something (allowEmpty). Before this, the 2-second auto-save could store an empty chart while the
  // 5,000-bar history was still loading, which wiped every drawing (and its timeframe-visibility settings).
  const loadedFor = useRef<string>('');
  const allowEmpty = useRef(false);
  const [clearAsk, setClearAsk] = useState(false);
  const clearAllObjects = () => {
    const chart = ws.current?.chart ?? ws.current;
    try {
      const ids = (chart?.drawings?.all?.() || []).map((d: any) => String(d?.id ?? '')).filter(Boolean);
      allowEmpty.current = true;
      if (ids.length) chart.drawings.removeMany ? chart.drawings.removeMany(ids) : ids.forEach((id: string) => chart.drawings.remove(id));
      window.setTimeout(saveDrawings, 60);
    } catch { /* nothing to delete */ }
    setClearAsk(false);
  };
  const lastGood = useRef<{ t: string; json: string; n: number }>({ t: '', json: '', n: 0 });
  const countOf = (doc: any) => { try { return Array.isArray(doc?.drawings) ? doc.drawings.length : Array.isArray(doc) ? doc.length : (doc?.items?.length ?? 0); } catch { return 0; } };
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [tfMenu, setTfMenu] = useState<{ x: number; y: number } | null>(null);
  const saveDrawings = useCallback(() => {
    const chart: any = ws.current?.chart;
    const t = tickerRef.current;
    if (!chart?.drawings || !t || loadedFor.current !== t) return;
    try {
      const all = chart.drawings.all?.() || [];
      const doc = chart.drawings.toJSON();
      const s = JSON.stringify(doc);
      if (all.length === 0 && lastGood.current.t === t && lastGood.current.n > 0 && !allowEmpty.current && !chart.drawings.canRedo?.()) return; // transient empty state: keep what we have
      if (s !== savedJson.current) {
        savedJson.current = s;
        localStorage.setItem(DRAW_KEY(t), s);
        lastGood.current = { t, json: s, n: all.length };
        if (all.length === 0) allowEmpty.current = false;
        setSavedAt(Date.now());
      }
      localStorage.setItem(TOOLS_KEY, JSON.stringify(chart.drawings.toolDefaults?.() || {}));
    } catch { /* storage full or blocked */ }
  }, []);
  const loadDrawings = useCallback((t: string) => {
    const chart: any = ws.current?.chart;
    if (!chart?.drawings) return;
    try {
      const raw = localStorage.getItem(DRAW_KEY(t));
      chart.drawings.fromJSON(raw ? JSON.parse(raw) : null);
      savedJson.current = JSON.stringify(chart.drawings.toJSON());
      lastGood.current = { t, json: savedJson.current, n: (chart.drawings.all?.() || []).length };
    } catch { /* bad document → empty */ }
    loadedFor.current = t;
  }, []);
  /** After a timeframe / market switch: if any drawing went missing from the chart, put the saved copy back. */
  const ensureDrawings = useCallback(() => {
    const chart: any = ws.current?.chart;
    const t = tickerRef.current;
    if (!chart?.drawings || loadedFor.current !== t || lastGood.current.t !== t || !lastGood.current.json) return;
    try {
      const doc = JSON.parse(lastGood.current.json);
      const want: string[] = (Array.isArray(doc?.drawings) ? doc.drawings : []).map((d: any) => String(d?.id ?? '')).filter(Boolean);
      const have = new Set<string>((chart.drawings.all?.() || []).map((d: any) => String(d?.id ?? '')));
      const lost = want.length ? want.some((id) => !have.has(id)) : have.size < lastGood.current.n;
      if (lost) chart.drawings.fromJSON(doc);
    } catch { /* ignore */ }
  }, []);

  // ── grid lines (hide them for a clean chart, like TradingView; the choice is kept across pairs and visits)
  const [gridOn, setGridOn] = useState<boolean>(() => { try { return localStorage.getItem(GRID_KEY) !== '0'; } catch { return true; } });
  const gridOnRef = useRef(gridOn);
  gridOnRef.current = gridOn;
  const applyGrid = useCallback((chart: any) => {
    const on = gridOnRef.current;
    try {
      const g = chart?.renderer?.getConfig?.()?.grid;
      const isOn = !!(g?.vertLines?.visible || g?.horzLines?.visible);
      if (isOn !== on || (g && (g.vertLines?.visible !== on || g.horzLines?.visible !== on))) chart.renderer.applyConfig({ grid: { vertLines: { visible: on }, horzLines: { visible: on } } });
      chart.renderer?.set?.({ gridlines: on });
    } catch { /* renderer not ready */ }
  }, []);
  useEffect(() => { try { localStorage.setItem(GRID_KEY, gridOn ? '1' : '0'); } catch { /* ignore */ } if (ready) applyGrid(ws.current?.chart); }, [gridOn, ready, applyGrid]);

  // ── build the chart
  useEffect(() => {
    if (!host.current || !entry) return;
    registerPlugins(); ensureTvSkin(); host.current.classList.add('ppfx-tv-skin');
    const w = new VelaWorkspace(host.current, {
      layout: false, symbol: venueSymbol(entry.ticker), timeframe: tf, bars: HISTORY_BARS, theme: savedTheme(), live: true, persist: false,
      timezone: 'Asia/Karachi',
      topbar: { left: ['timeframes', 'style', 'indicators', 'undo-redo'], right: ['alerts', 'panels', 'screenshot'] },
      drawings: { toolbar: false },
      timeframes: ['1', '3', '5', '15', '30', '60', '120', '240', 'D', 'W', 'M'],
      providers: { dukascopy: () => makeProvider('dukascopy'), binance: () => makeProvider('binance') },
      engines: { pine: () => new PineWorkerEngine(), [REMOTE_LANG]: () => new RemotePineEngine() },
    } as any);
    ws.current = w;
    tickerRef.current = entry.ticker;
    markOnScreen(entry.ticker, true);
    let alive = true;
    let offLook: any = null; let offGuard: any = null; let offGrab: any = null;
    const slowT = window.setTimeout(() => { if (alive) setSlow(true); }, 20_000);
    const chart: any = w.chart;
    const offTheme = chart.on?.('theme:changed', (t: any) => { try { const id = t?.id || t?.name || (t?.isDark === false || t?.mode === 'light' ? 'light' : 'dark'); localStorage.setItem(THEME_KEY, String(id)); window.dispatchEvent(new Event('ppfx:pro-theme')); } catch { /* ignore */ } });
    chart.ready().then(() => {
      if (!alive) return;
      setReady(true); setSlow(false);
      // The chart library's own timeframe list closed as soon as the pointer reached it, so its caret opens OUR menu instead.
      try {
        const hostEl = host.current!;
        const grab = (e: Event) => {
          const el = (e.target as HTMLElement | null)?.closest?.('.vela-widget-tf-caret') as HTMLElement | null;
          if (!el) return;
          e.stopPropagation(); e.preventDefault();
          if (e.type === 'click') { const r = el.getBoundingClientRect(); const wr = wrap.current?.getBoundingClientRect(); setTfMenu((cur) => (cur ? null : { x: r.left - (wr?.left || 0), y: r.bottom - (wr?.top || 0) + 2 })); }
        };
        ['pointerdown', 'mousedown', 'click', 'keydown'].forEach((ev) => hostEl.addEventListener(ev, grab, true));
        offGrab = () => ['pointerdown', 'mousedown', 'click', 'keydown'].forEach((ev) => hostEl.removeEventListener(ev, grab, true));
      } catch { /* ignore */ }
      // (legacy guard, kept as a fallback)  The timeframe list used to vanish the moment the pointer moved over it: every live market update re-projected the topbar and rebuilt the open menu.
      try { const m = (w as any).topbar?.tfMenu; if (m && !m.__ppfxGuard) { m.__ppfxGuard = true; const orig = m.setItems.bind(m); let pend: any = null; m.setItems = (it: any) => { if (m.api?.open) { pend = it; return; } orig(it); }; const t = window.setInterval(() => { if (pend && !m.api?.open) { const x = pend; pend = null; orig(x); } }, 400); offGuard = () => window.clearInterval(t); } } catch { /* ignore */ }
      // TradingView's quick timeframe chips (1m 15m 30m 1h 4h D W) as favourites, unless the user already starred their own.
      try { const st: any = (w as any).getState?.(); if (st && !(st.timeframeFavorites || []).length ) { (w as any).applyState?.({ ...st, timeframeFavorites: TV_TIMEFRAMES }); } } catch { /* ignore */ }
      try { const tools = JSON.parse(localStorage.getItem(TOOLS_KEY) || 'null'); if (tools) chart.drawings?.setToolDefaults?.(tools); } catch { /* ignore */ }
      // Chart look (background colour, grid, candle colours, …) from Settings → Canvas, kept across pairs and visits.
      try { const cfg = JSON.parse(localStorage.getItem(LOOK_KEY) || 'null'); if (cfg) chart.renderer?.applyConfig?.(cfg); } catch { /* ignore */ }
      applyGrid(chart);
      try { offLook = chart.renderer?.onConfigChanged?.(() => { try { localStorage.setItem(LOOK_KEY, JSON.stringify(chart.renderer.getConfig())); } catch { /* ignore */ } if (!gridOnRef.current) window.setTimeout(() => applyGrid(chart), 0); }); } catch { /* ignore */ }
      loadDrawings(entry.ticker);
      void loadEdgeMarks(chart, entry.ticker);
    }).catch(() => {});
    // Follow changes made from the chart's own symbol search / timeframe menu back to the terminal.
    const offMarket = chart.on?.('market:changed', () => {
      const m = chart.market || {};
      const t = String(m.symbol || '').replace(/^[A-Z]+:/, '').toUpperCase();
      if (t && t !== tickerRef.current) {
        saveDrawings();
        markOnScreen(tickerRef.current, false);
        tickerRef.current = t;
        markOnScreen(t, true);
        loadDrawings(t);
        void loadEdgeMarks(chart, t);
        cbs.current.onSymbolChange?.(REVERSE_ALIAS[t] || t);
      }
      else { // timeframe-only switch: drawings must still be there (visibility is per timeframe)
        window.setTimeout(ensureDrawings, 0); window.setTimeout(ensureDrawings, 600); window.setTimeout(ensureDrawings, 2500);
      }
      if (m.timeframe) cbs.current.onIntervalChange?.(normTf(String(m.timeframe)));
    });
    const offs = ['drawing:created', 'drawing:edited', 'drawing:removed', 'drawing:defaults'].map((e) => chart.on?.(e, () => { if (e === 'drawing:removed') allowEmpty.current = true; window.setTimeout(saveDrawings, 30); }));
    const autosave = window.setInterval(saveDrawings, 2000); // also catches Undo / Redo
    const flush = () => saveDrawings();
    window.addEventListener('beforeunload', flush);
    return () => {
      alive = false;
      window.clearTimeout(slowT);
      window.clearInterval(autosave);
      window.removeEventListener('beforeunload', flush);
      saveDrawings();
      loadedFor.current = '';
      try { offGuard?.(); offGrab?.(); } catch { /* ignore */ }
      try { offMarket?.(); offs.forEach((o: any) => o?.()); offLook?.(); offTheme?.(); } catch { /* ignore */ }
      markOnScreen(tickerRef.current, false);
      running.current.clear();
      try { w.destroy(); } catch { /* ignore */ }
      ws.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(entry), build]);

  // ── speed: once the chart is up, quietly pre-load the most-used pairs for this timeframe
  useEffect(() => {
    if (!ready || !entry) return;
    return prewarmPopular(entry.ticker, tf, HISTORY_BARS);
  }, [ready, entry?.ticker, tf]);

  // ── follow the terminal's pair and timeframe
  useEffect(() => {
    const chart: any = ws.current?.chart;
    if (!chart || !entry || !ready) return;
    if (tickerRef.current !== entry.ticker) {
      saveDrawings();
      markOnScreen(tickerRef.current, false);
      tickerRef.current = entry.ticker;
      markOnScreen(entry.ticker, true);
      chart.setMarket({ symbol: venueSymbol(entry.ticker), bars: HISTORY_BARS }).catch?.(() => {});
      loadDrawings(entry.ticker);
      void loadEdgeMarks(chart, entry.ticker);
    }
  }, [entry, ready, saveDrawings, loadDrawings]);
  useEffect(() => {
    const chart: any = ws.current?.chart;
    if (!chart || !ready) return;
    if (normTf(String(chart.market?.timeframe || '')) !== tf) {
      saveDrawings();
      Promise.resolve(chart.setMarket({ timeframe: tf, bars: HISTORY_BARS })).catch?.(() => {}).finally?.(() => window.setTimeout(ensureDrawings, 0));
    }
  }, [tf, ready, saveDrawings, ensureDrawings]);

  // ── indicators: exactly one instance of each shown indicator
  useEffect(() => {
    if (!ready) return;
    const chart: any = ws.current?.chart;
    if (!chart) return;
    const wanted = new Map<string, { key: string; source: string; language: string; name: string }>();
    const draftName = lib.isAdmin && lib.draft && lib.shown.includes(DRAFT_ID) ? lib.draft.name : null;
    const names = new Set<string>();
    for (const id of [...lib.shown].sort((a, b) => (a === DRAFT_ID ? -1 : b === DRAFT_ID ? 1 : 0))) {
      if (id === DRAFT_ID) {
        if (lib.isAdmin && lib.draft) { wanted.set(id, { key: `draft:${lib.draft.source}`, source: lib.draft.source, language: 'pine', name: lib.draft.name }); names.add(lib.draft.name); }
        continue;
      }
      const s: LibraryScript | undefined = lib.scripts.find((x) => x.id === id);
      if (!s) continue;
      if (names.has(s.name) || s.name === draftName) continue; // same indicator already on the chart
      names.add(s.name);
      if (lib.isAdmin && s.source) wanted.set(id, { key: `${s.id}:${s.updatedAt}`, source: s.source, language: 'pine', name: s.name });
      else wanted.set(id, { key: `${s.id}:${s.updatedAt}`, source: remoteRef(s.id), language: REMOTE_LANG, name: s.name });
    }

    const purge = () => {
      // Remove any script copy that is not the one tracked for its id (stale or doubled runs).
      const keep = new Set([...running.current.keys()].map((id) => `ind_${id}`));
      const seen = new Set<string>();
      for (const h of (chart.indicators?.() || []) as any[]) {
        if (h?.source === undefined) continue; // built-in studies the user added are left alone
        const hid = String(h.id || '');
        if (!hid.startsWith('ind_')) continue;
        if (!keep.has(hid) || seen.has(hid)) { try { h.remove(); } catch { /* gone */ } continue; }
        seen.add(hid);
      }
    };

    queue.current = queue.current.then(async () => {
      for (const [id, r] of [...running.current]) {
        const w = wanted.get(id);
        if (w && w.key !== r.key && w.language === 'pine') {
          // Edited code: swap it in place (same legend row, no re-add) — much faster than remove + add.
          const h = ((chart.indicators?.() || []) as any[]).find((x) => x?.id === `ind_${id}`);
          if (h?.updateCode) {
            setIndicatorStatus(id, { kind: 'busy', text: `Updating “${w.name}”…` });
            const out: any = await h.updateCode(w.language === 'pine' ? pineCompat(w.source) : w.source).catch((e: any) => ({ ok: false, error: e }));
            if (out?.ok) { r.key = w.key; setIndicatorStatus(id, { kind: 'ok', text: `“${w.name}” updated on the chart.` }); continue; }
            const msg = out?.error?.message || String(out?.error || 'The indicator could not run.');
            const line = Number(out?.error?.line ?? (String(msg).match(/line\s+(\d+)/i)?.[1] ?? NaN));
            r.key = w.key; setIndicatorStatus(id, { kind: 'error', text: msg, line: Number.isFinite(line) ? line : null }); continue;
          }
        }
        if (!w || w.key !== r.key) { r.remove(); running.current.delete(id); if (!w) setIndicatorStatus(id, null); }
      }
      purge();
      for (const [id, w] of wanted) {
        if (running.current.has(id)) continue;
        for (const h of (chart.indicators?.() || []) as any[]) if (h?.id === `ind_${id}`) { try { h.remove(); } catch { /* gone */ } }
        setIndicatorStatus(id, { kind: 'busy', text: `Loading “${w.name}”…` });
        const res: any = await chart.runScript(w.language === 'pine' ? pineCompat(w.source) : w.source, { id: `ind_${id}`, language: w.language, title: w.name }).catch((e: any) => ({ ok: false, error: e }));
        if (res?.ok) {
          running.current.set(id, { key: w.key, remove: () => { try { res.remove(); } catch { /* gone */ } } });
          const st = res.run?.strategy;
          setIndicatorStatus(id, { kind: 'ok', text: `“${res.run?.title || w.name}” is on the chart.${st ? ` Strategy: net P&L ${Number(st.netPnl ?? 0).toFixed(2)}, ${st.closedTrades ?? st.totalTrades ?? 0} closed trades.` : ''}` });
        } else {
          const err = res?.error;
          const msg = typeof err === 'string' ? err : err?.message || 'The indicator could not run.';
          const line = Number(err?.line ?? err?.loc?.line ?? (String(msg).match(/line\s+(\d+)/i)?.[1] ?? NaN));
          setIndicatorStatus(id, { kind: 'error', text: msg, line: Number.isFinite(line) ? line : null });
        }
      }
      purge();
    }).catch(() => {});
  }, [lib.shown, lib.scripts, lib.draft, lib.isAdmin, ready]);

  // Keep the chart's own top bar clear: while it sits under the floating global buttons, they step aside.
  useEffect(() => {
    const check = () => {
      const r = wrap.current?.getBoundingClientRect();
      const under = Boolean(r && r.top < 56 && r.bottom > 56);
      document.documentElement.classList.toggle('ppfx-chart-under-float', under);
    };
    check();
    window.addEventListener('scroll', check, { passive: true, capture: true });
    window.addEventListener('resize', check);
    return () => { window.removeEventListener('scroll', check, { capture: true } as any); window.removeEventListener('resize', check); document.documentElement.classList.remove('ppfx-chart-under-float'); };
  }, []);

  // ── topbar / context-menu actions from this chart
  const [panel, setPanel] = useState(false);
  const [indMenu, setIndMenu] = useState<{ natives: any[]; addNative: (t: string) => void } | null>(null);
  useEffect(() => {
    const onMenu = async (e: any) => {
      if (!(e?.detail?.chart && e.detail.chart === ws.current?.chart)) return;
      loadLibrary();
      const natives = await e.detail.natives;
      setIndMenu({ natives: Array.isArray(natives) ? natives : [], addNative: e.detail.addNative });
    };
    window.addEventListener('ppfx:indicators-menu', onMenu);
    return () => window.removeEventListener('ppfx:indicators-menu', onMenu);
  }, []);
  useEffect(() => {
    const mine = (e: any) => e?.detail?.chart && e.detail.chart === ws.current?.chart;
    const onPanel = (e: any) => { if (mine(e)) setPanel((v) => !v); };
    const onFs = (e: any) => { if (mine(e)) cbs.current.onToggleFullscreen?.(); };
    const onAdd = (e: any) => { if (mine(e) && tickerRef.current) priceAlerts.add(tickerRef.current, Number(e.detail.price.toFixed(digits))); };
    const onHline = (e: any) => {
      const chart: any = ws.current?.chart;
      if (!chart || e?.detail?.host !== host.current) return;
      try { chart.drawings?.add?.('hline', { paneId: 'price', anchors: [{ time: Date.now(), price: e.detail.price }] }); } catch { /* unsupported */ }
      window.setTimeout(saveDrawings, 50);
    };
    window.addEventListener('ppfx:hline', onHline);
    window.addEventListener('ppfx:alerts-panel', onPanel);
    window.addEventListener('ppfx:fullscreen', onFs);
    window.addEventListener('ppfx:add-alert', onAdd);
    return () => { window.removeEventListener('ppfx:hline', onHline); window.removeEventListener('ppfx:alerts-panel', onPanel); window.removeEventListener('ppfx:fullscreen', onFs); window.removeEventListener('ppfx:add-alert', onAdd); };
  }, [digits, saveDrawings]);

  if (!entry) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[12px] text-amber-300 p-4 text-center">
        {symbol} is not available on the Pro chart yet — pick a listed pair.
      </div>
    );
  }
  return (
    <div ref={wrap} className="relative w-full overflow-hidden" style={{ height }}>
      <div ref={host} className="absolute inset-y-0 right-0 left-[48px]" />
      <div className="absolute inset-y-0 left-0 z-30"><TvLeftToolbar getChart={() => (ws.current?.chart ?? null)} ready={ready} onClearAll={clearAllObjects} /></div>
      {ready && (
        <div className="absolute left-14 bottom-9 z-20 flex items-center gap-1.5">
          
      {ready && (
        <button type="button" onClick={() => setGridOn((v) => !v)} data-testid="pro-grid-toggle" aria-pressed={!gridOn} title={gridOn ? 'Hide the grid lines' : 'Show the grid lines'}
          className="h-6 px-2 rounded-md border border-slate-600/70 bg-[#1e222d]/90 text-[10.5px] font-semibold text-slate-200 hover:text-white hover:border-cyan-400 cursor-pointer">{gridOn ? 'Grid: on' : 'Grid: off'}</button>
      )}        </div>
      )}

      {tfMenu && ready && (
        <>
          <div className="absolute inset-0 z-40" onPointerDown={() => setTfMenu(null)} />
          <div role="menu" data-testid="pro-tf-menu" className="absolute z-50 w-[150px] rounded-md border border-slate-300 bg-white py-1 text-[13px] text-slate-900 shadow-[0_8px_28px_rgba(0,0,0,.28)]" style={{ left: tfMenu.x, top: tfMenu.y }}>
            {PRO_TF_LIST.map(([id, lab]) => {
              const cur = normTf(String(ws.current?.chart?.market?.timeframe || tf)) === id;
              return (
                <button key={id} type="button" data-testid={`pro-tf-${id}`} onClick={() => { setTfMenu(null); try { ws.current?.chart?.setMarket({ timeframe: id, bars: HISTORY_BARS }); } catch { /* ignore */ } }}
                  className={`flex h-8 w-full items-center justify-between px-3 text-left hover:bg-slate-100 ${cur ? 'bg-blue-50 font-bold text-blue-700' : ''}`}><span>{lab}</span>{cur && <span>✓</span>}</button>
              );
            })}
          </div>
        </>
      )}
      {ready && (
        <div data-testid="pro-autosave" title="Drawings, tool settings, favourites and chart look are saved automatically in this browser" className="pointer-events-none absolute bottom-1.5 right-20 z-20 rounded px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 bg-white/80">
          ● Auto-save on{savedAt ? ` · saved ${new Date(savedAt).toLocaleTimeString()}` : ''}
        </div>
      )}
      {ready && <AlertOverlay wrap={wrap} host={host} chartRef={ws} ticker={tickerRef.current || entry.ticker} digits={digits} panel={panel} setPanel={setPanel} />}
      {indMenu && <IndicatorMenu lib={lib} natives={indMenu.natives} addNative={indMenu.addNative} onClose={() => setIndMenu(null)} />}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-[12px] gap-2">
          <span className="flex items-center gap-2 pointer-events-none"><Loader2 className="w-4 h-4 animate-spin" /> Loading {entry.ticker} chart…</span>
          {slow && <button type="button" onClick={() => { setSlow(false); setBuild((n) => n + 1); }} className="px-3 py-1 rounded-lg border border-slate-600 text-slate-200 hover:text-white hover:border-cyan-400 cursor-pointer">Taking long — retry</button>}
        </div>
      )}
    </div>
  );
};

// ───────────────────────────── indicator menu (replaces the chart's built-in picker)

const IndicatorMenu: React.FC<{ lib: ReturnType<typeof pineLib.get>; natives: any[]; addNative: (t: string) => void; onClose: () => void }> = ({ lib, natives, addNative, onClose }) => {
  const [q, setQ] = useState('');
  const ql = q.trim().toLowerCase();
  const scripts = lib.scripts.filter((x) => !ql || x.name.toLowerCase().includes(ql));
  const [cat, setCat] = useState<string>('All');
  const builtinsAll = natives.filter((n) => n?.supported !== false && (!ql || String(n.title || n.type).toLowerCase().includes(ql) || indCategory(n).toLowerCase().includes(ql)));
  const builtins = builtinsAll.filter((n) => cat === 'All' || indCategory(n) === cat);
  const cats = ['All', ...IND_CATS.filter((c) => builtinsAll.some((n) => indCategory(n) === c))];
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onClose(); } }; window.addEventListener('keydown', k, true); return () => window.removeEventListener('keydown', k, true); }, [onClose]);
  return (
    <div className="absolute inset-0 z-[8] flex items-start justify-center pt-16 bg-black/30" onPointerDown={onClose} data-testid="ppfx-indicator-menu">
      <div className="w-[min(460px,92%)] max-h-[70%] flex flex-col rounded-xl border border-slate-700 bg-[#1e222d] shadow-2xl text-[12.5px] text-slate-200" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
          <b className="text-[14px] text-slate-50">Indicators</b>
          <button type="button" onClick={onClose} className="ml-auto p-1 rounded text-slate-400 hover:text-white hover:bg-[#2a2e39] cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-2 border-b border-slate-800">
          <div className="flex items-center gap-2 rounded-lg bg-[#131722] border border-slate-700 px-2.5 py-1.5"><Search className="w-4 h-4 text-slate-500" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" style={{ boxShadow: "none", outline: "none", border: 0 }} className="flex-1 bg-transparent text-slate-100 placeholder:text-slate-500" /></div>
        </div>
        <div className="overflow-y-auto py-1">
          <div className="px-4 pt-2 pb-1 text-[10.5px] uppercase tracking-wider text-violet-300 font-bold">Prime Pip indicators</div>
          {!scripts.length && <div className="px-4 py-2 text-slate-500">{lib.loaded ? 'No indicators published yet.' : 'Loading…'}</div>}
          {scripts.map((x) => {
            const on = lib.shown.includes(x.id);
            const st = indicatorStatus(x.id);
            return (
              <button key={x.id} type="button" onClick={() => (on ? hideIndicator(x.id) : showIndicator(x.id))} className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-[#2a2e39] text-left cursor-pointer">
                <span className={`w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-[#2962FF] border-[#2962FF]' : 'border-slate-500'}`}>{on && (st?.kind === 'busy' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />)}</span>
                <span className="font-semibold text-slate-100">{x.name}</span>
                {lib.isAdmin && x.published === false && <span className="text-[10px] text-amber-300">private</span>}
                <span className="ml-auto text-[10.5px] text-slate-500">{on ? (st?.kind === 'error' ? 'error' : 'on chart') : 'add'}</span>
              </button>
            );
          })}
          {builtinsAll.length > 0 && <div className="px-4 pt-3 pb-1 text-[10.5px] uppercase tracking-wider text-cyan-300 font-bold">Built-in studies</div>}
          {builtinsAll.length > 0 && (
            <div className="px-4 pb-1.5 flex flex-wrap gap-1" role="tablist" aria-label="Indicator category">
              {cats.map((c) => (
                <button key={c} type="button" role="tab" aria-selected={c === cat} onClick={() => setCat(c)}
                  className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold cursor-pointer ${c === cat ? 'border-[#2962FF] bg-[#2962FF]/20 text-white' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
                  {c}{c !== 'All' ? <span className="ml-1 text-slate-500">{builtinsAll.filter((n) => indCategory(n) === c).length}</span> : null}
                </button>
              ))}
            </div>
          )}
          {(cat === 'All' ? IND_CATS : [cat]).map((c) => {
            const group = builtins.filter((n) => indCategory(n) === c);
            if (!group.length) return null;
            return (
              <React.Fragment key={c}>
                {cat === 'All' && <div className="px-4 pt-2 pb-0.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">{c}</div>}
                {group.map((n) => (
            <button key={n.type} type="button" onClick={() => { addNative(n.type); onClose(); }} className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-[#2a2e39] text-left cursor-pointer">
              <Plus className="w-4 h-4 text-slate-500" /><span className="text-slate-100">{n.title || n.type}</span>
              {n.present && !n.multiInstance && <span className="ml-auto text-[10.5px] text-slate-500">on chart</span>}
            </button>
                ))}
              </React.Fragment>
            );
          })}
          {ql && !scripts.length && !builtinsAll.length && <div className="px-4 py-3 text-slate-500">No indicator matches “{q}”.</div>}
        </div>
      </div>
    </div>
  );
};

// ───────────────────────────── price-alert overlay ("+" on the price scale, alert labels, editor)
const AlertOverlay: React.FC<{
  wrap: React.RefObject<HTMLDivElement>; host: React.RefObject<HTMLDivElement>; chartRef: React.MutableRefObject<VelaWorkspace | null>;
  ticker: string; digits: number; panel: boolean; setPanel: (v: boolean | ((x: boolean) => boolean)) => void;
}> = ({ wrap, host, ticker, digits, panel, setPanel }) => {
  const [list, setList] = useState<PriceAlert[]>(() => priceAlerts.forTicker(ticker));
  const [, setFrame] = useState(0);
  const [hover, setHover] = useState<{ y: number; price: number } | null>(null);
  const [menu, setMenu] = useState<{ y: number; price: number } | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; price: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const binding = useRef<Binding>({ mapping: null, lines: () => [], onFrame: () => {} });
  const raf = useRef(0);
  const listRef = useRef(list); listRef.current = list;
  const dragRef = useRef(drag); dragRef.current = drag;

  useEffect(() => { setList(priceAlerts.forTicker(ticker)); return priceAlerts.subscribe(() => setList(priceAlerts.forTicker(ticker))); }, [ticker]);
  useEffect(() => {
    const onHit = (e: any) => { setToast(`${e.detail.title}`); window.setTimeout(() => setToast(null), 7000); };
    window.addEventListener('ppfx:price-alert', onHit);
    return () => window.removeEventListener('ppfx:price-alert', onHit);
  }, []);

  // Register with the renderer layer; repaint the overlay on every chart frame (pan, zoom, tick).
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const b = binding.current;
    b.lines = () => listRef.current.map((a) => ({ price: dragRef.current?.id === a.id ? dragRef.current.price : a.price, color: a.triggeredAt ? 'rgba(148,163,184,0.55)' : 'rgba(251,146,60,0.9)', dashed: true }));
    b.onFrame = () => { if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; setFrame((n) => (n + 1) % 1e6); }); };
    bindings.set(el, b);
    return () => { bindings.delete(el); if (raf.current) cancelAnimationFrame(raf.current); };
  }, [host]);

  // Geometry of the price pane inside the wrapper.
  const geo = () => {
    const m = binding.current.mapping;
    const w = wrap.current;
    if (!m || !w || !m.canvas.isConnected) return null;
    const cr = m.canvas.getBoundingClientRect();
    const wr = w.getBoundingClientRect();
    return { m, left: cr.left - wr.left, top: cr.top - wr.top, plotRight: cr.left - wr.left + m.width, wrapW: wr.width, wr, cr };
  };
  const g = geo();

  // "+" follows the pointer along the right edge of the plot / the price scale.
  useEffect(() => {
    const w = wrap.current;
    if (!w) return;
    const move = (e: PointerEvent) => {
      if (dragRef.current) return;
      const gg = geo();
      if (!gg) return;
      const y = e.clientY - gg.cr.top;
      const x = e.clientX - gg.wr.left;
      const inPane = y >= gg.m.paneTop && y <= gg.m.paneTop + gg.m.paneHeight;
      const nearScale = x >= gg.plotRight - 36 && x <= gg.wrapW;
      if (inPane && nearScale) setHover({ y, price: gg.m.yToPrice(y) });
      else setHover(null);
    };
    const leave = () => setHover(null);
    w.addEventListener('pointermove', move);
    w.addEventListener('pointerleave', leave);
    return () => { w.removeEventListener('pointermove', move); w.removeEventListener('pointerleave', leave); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrap]);

  const startDrag = (a: PriceAlert, e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const gg = geo();
    if (!gg) return;
    const y0 = e.clientY;
    let moved = false;
    setDrag({ id: a.id, price: a.price });
    const mv = (ev: PointerEvent) => {
      if (Math.abs(ev.clientY - y0) > 3) moved = true;
      const g2 = geo();
      if (!g2) return;
      const p = g2.m.yToPrice(ev.clientY - g2.cr.top);
      setDrag({ id: a.id, price: Number(p.toFixed(digits)) });
    };
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      const d = dragRef.current;
      if (moved && d) priceAlerts.update(a.id, { price: d.price, triggeredAt: null });
      else setEdit((cur) => (cur === a.id ? null : a.id));
      setDrag(null);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  const last = priceAlerts.lastPrice(ticker);
  const editing = list.find((a) => a.id === edit) || null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[5]" data-testid="price-alert-overlay">
      {g && list.map((a) => {
        const price = drag?.id === a.id ? drag.price : a.price;
        const y = g.top + g.m.priceToY(price);
        if (y < g.top + g.m.paneTop - 2 || y > g.top + g.m.paneTop + g.m.paneHeight + 2) return null;
        return (
          <div key={a.id} data-testid="price-alert-label" onPointerDown={(e) => startDrag(a, e)} title="Drag to move · click to edit"
            className={`absolute pointer-events-auto select-none cursor-ns-resize flex items-center gap-1 h-[20px] pl-1.5 pr-1 rounded-[4px] text-[11px] font-semibold font-mono shadow-md -translate-y-1/2 ${a.triggeredAt ? 'bg-slate-600 text-slate-100' : 'bg-orange-500 text-white'}`}
            style={{ top: y, right: g.wrapW - g.plotRight + 4 }}>
            {a.triggeredAt ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
            <span>{fmtPrice(price, digits)}</span>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); priceAlerts.remove(a.id); }} className="ml-0.5 p-[1px] rounded hover:bg-black/25 cursor-pointer" aria-label="Remove alert"><X className="w-3 h-3" /></button>
          </div>
        );
      })}

      {g && hover && !menu && !drag && (
        <button type="button" data-testid="price-scale-plus" title={`Add alert at ${fmtPrice(hover.price, digits)}`}
          onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); setMenu(hover); }}
          className="absolute pointer-events-auto w-[18px] h-[18px] -translate-y-1/2 -translate-x-1/2 rounded-full bg-[#2a2e39] border border-slate-500 text-slate-100 hover:bg-[#2962FF] hover:border-[#2962FF] flex items-center justify-center shadow cursor-pointer"
          style={{ top: g.top + hover.y, left: g.plotRight - 2 }}>
          <Plus className="w-3 h-3" />
        </button>
      )}

      {g && menu && (
        <>
          <div className="absolute inset-0 pointer-events-auto" onPointerDown={() => setMenu(null)} />
          <div className="absolute pointer-events-auto min-w-[250px] rounded-lg border border-slate-700 bg-[#1e222d] shadow-2xl py-1 text-[12.5px] text-slate-100"
            style={{ top: Math.min(g.top + menu.y, (wrap.current?.clientHeight || 400) - 90), right: g.wrapW - g.plotRight + 14 }}>
            <button type="button" className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#2a2e39] text-left cursor-pointer" onClick={() => { priceAlerts.add(ticker, Number(menu.price.toFixed(digits))); setMenu(null); }}>
              <Bell className="w-4 h-4 text-orange-300" />Add alert on {ticker} at {fmtPrice(menu.price, digits)}
            </button>
            <button type="button" className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#2a2e39] text-left cursor-pointer" onClick={() => {
              window.dispatchEvent(new CustomEvent('ppfx:hline', { detail: { host: host.current, price: Number(menu.price.toFixed(digits)) } }));
              setMenu(null);
            }}>
              <Minus className="w-4 h-4 text-cyan-300" />Draw horizontal line at {fmtPrice(menu.price, digits)}
            </button>
          </div>
        </>
      )}

      {editing && g && (
        <div className="absolute pointer-events-auto w-[260px] rounded-xl border border-slate-700 bg-[#1e222d] shadow-2xl p-3 text-[12px] text-slate-200 space-y-2"
          style={{ top: Math.max(8, Math.min(g.top + g.m.priceToY(editing.price) - 20, (wrap.current?.clientHeight || 400) - 220)), right: g.wrapW - g.plotRight + 110 }}>
          <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-orange-300" /><b className="text-slate-50">Alert · {editing.ticker}</b><button type="button" onClick={() => setEdit(null)} className="ml-auto p-0.5 text-slate-400 hover:text-white cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button></div>
          <label className="block text-[10.5px] text-slate-400">Price
            <input type="number" step={10 ** -digits} defaultValue={editing.price} key={`${editing.id}:${editing.price}`} onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v > 0) priceAlerts.update(editing.id, { price: v, triggeredAt: null }); }}
              className="mt-0.5 w-full bg-[#131722] border border-slate-600 rounded-md px-2 py-1 text-slate-100 font-mono" />
          </label>
          <label className="block text-[10.5px] text-slate-400">Condition
            <select value={editing.condition} onChange={(e) => priceAlerts.update(editing.id, { condition: e.target.value as AlertCondition })} className="mt-0.5 w-full bg-[#131722] border border-slate-600 rounded-md px-2 py-1 text-slate-100 cursor-pointer">
              <option value="cross">Crossing</option><option value="above">Crossing up</option><option value="below">Crossing down</option>
            </select>
          </label>
          <label className="block text-[10.5px] text-slate-400">Message (optional)
            <input type="text" defaultValue={editing.message || ''} key={`m:${editing.id}`} onBlur={(e) => priceAlerts.update(editing.id, { message: e.target.value.slice(0, 140) })} placeholder={`${editing.ticker} reached ${editing.price}`}
              className="mt-0.5 w-full bg-[#131722] border border-slate-600 rounded-md px-2 py-1 text-slate-100" />
          </label>
          <div className="text-[10.5px] text-slate-500">{editing.triggeredAt ? `Triggered ${new Date(editing.triggeredAt).toLocaleString()}` : last !== undefined ? `Live price ${fmtPrice(last, digits)} · waiting` : 'Waiting for the price'}</div>
          <div className="flex gap-1.5">
            {editing.triggeredAt && <button type="button" onClick={() => priceAlerts.rearm(editing.id)} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-[#2962FF] text-white font-semibold cursor-pointer"><RotateCcw className="w-3.5 h-3.5" />Re-arm</button>}
            <button type="button" onClick={() => { priceAlerts.remove(editing.id); setEdit(null); }} className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md border border-rose-500/50 text-rose-200 hover:bg-rose-500/10 cursor-pointer"><Trash2 className="w-3.5 h-3.5" />Delete</button>
          </div>
        </div>
      )}

      {panel && (
        <div className="absolute top-10 right-12 pointer-events-auto w-[300px] max-h-[60%] overflow-y-auto rounded-xl border border-slate-700 bg-[#1e222d] shadow-2xl text-[12px] text-slate-200" data-testid="price-alert-panel">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700"><Bell className="w-4 h-4 text-orange-300" /><b className="text-slate-50">Price alerts</b><button type="button" onClick={() => setPanel(false)} className="ml-auto p-0.5 text-slate-400 hover:text-white cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button></div>
          {!priceAlerts.all().length && <div className="px-3 py-4 text-slate-400 text-center leading-relaxed">No alerts yet. Hover the price scale and click <b className="text-slate-100">+</b>, or right-click the chart → <b className="text-slate-100">Add alert here</b>.</div>}
          {priceAlerts.all().map((a) => (
            <div key={a.id} className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 last:border-0">
              {a.triggeredAt ? <BellOff className="w-3.5 h-3.5 text-slate-500" /> : <Bell className="w-3.5 h-3.5 text-orange-300" />}
              <div className="min-w-0">
                <div className="font-semibold text-slate-100">{a.ticker} {a.condition === 'above' ? '↑' : a.condition === 'below' ? '↓' : '↕'} {a.price}</div>
                <div className="text-[10.5px] text-slate-500 truncate">{a.triggeredAt ? 'Triggered' : 'Active'}{a.message ? ` · ${a.message}` : ''}</div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {a.triggeredAt && <button type="button" title="Re-arm" onClick={() => priceAlerts.rearm(a.id)} className="p-1 rounded hover:bg-[#2a2e39] cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /></button>}
                <button type="button" title="Delete" onClick={() => priceAlerts.remove(a.id)} className="p-1 rounded hover:bg-[#2a2e39] text-rose-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
          <div className="px-3 py-2 text-[10.5px] text-slate-500">The alert sound is the one chosen in Announcements → Alerts.</div>
        </div>
      )}

      {toast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 rounded-lg bg-orange-500 text-white px-3 py-2 text-[12.5px] font-semibold shadow-2xl">
          <Bell className="w-4 h-4" />{toast}
          <button type="button" onClick={() => setToast(null)} className="ml-1 p-0.5 rounded hover:bg-black/20 cursor-pointer" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
};

export default PineMainChart;
