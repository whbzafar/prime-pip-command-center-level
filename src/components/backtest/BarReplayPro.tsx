import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { init, dispose, registerOverlay, getSupportedIndicators, type Chart, type KLineData } from 'klinecharts';
import { IND_CATS, indCategory } from '../../utils/indicatorCategories';

// MT5-style SL / TP line: a full-width dashed line whose label is recomputed on every frame, so
// the money, % of balance and pips follow the line live while it is dragged.
let levelOverlayRegistered = false;
function ensureLevelOverlay() {
  if (levelOverlayRegistered) return;
  levelOverlayRegistered = true;
  registerOverlay({
    name: 'ppfxLevel',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, bounding, overlay }: any) => {
      const c = coordinates[0];
      if (!c) return [];
      const ext = overlay.extendData || {};
      const value = overlay.points?.[0]?.value;
      const label = typeof ext.label === 'function' ? ext.label(value) : String(value ?? '');
      const color = ext.color || '#94a3b8';
      // Rough label width (11px bold font) so the drag handle sits just left of the label.
      const labelW = label.length * 6.4 + 14;
      const hx = Math.max(16, bounding.width - 8 - labelW - 14);
      return [
        { type: 'line', attrs: { coordinates: [{ x: 0, y: c.y }, { x: bounding.width, y: c.y }] }, styles: { style: 'dashed', color, size: 1.5, dashedValue: [6, 4] }, ignoreEvent: false },
        // Drag handle: a clear dot on the line — press and drag it (or the line) up / down.
        { type: 'circle', attrs: { x: hx, y: c.y, r: 7 }, styles: { style: 'stroke_fill', color: '#0b1220', borderColor: color, borderSize: 2.5 }, ignoreEvent: false },
        { type: 'circle', attrs: { x: hx, y: c.y, r: 2.5 }, styles: { style: 'fill', color }, ignoreEvent: false },
        { type: 'text', attrs: { x: bounding.width - 8, y: c.y - 3, text: label, align: 'right', baseline: 'bottom' }, styles: { color: '#0b1220', backgroundColor: color, borderColor: color, size: 11, weight: 'bold', paddingLeft: 6, paddingRight: 6, paddingTop: 3, paddingBottom: 3, borderRadius: 3 }, ignoreEvent: false },
      ];
    },
  } as any);
}
import { ChevronsRight, Download, Info, Maximize2, Minimize2, Pause, Play, SkipForward, StepForward, Target, Trash2, Undo2, X } from 'lucide-react';
import { SymbolPicker } from '../chartAnalysis/SymbolPicker';
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS, type CatalogEntry } from '../chartAnalysis/fullHistoryDatafeed';

/**
 * BAR REPLAY PRO — practise and backtest on real historical bars.
 * Pick any symbol/timeframe and a start date (back to the instrument's first data). The chart
 * hides the future; step or play bar by bar, trade with SL/TP, and get full statistics.
 * Data: the same full-history feed as Unlimited Charts (Dukascopy · Yahoo · Binance).
 */

type Side = 1 | -1;
interface Position { id: number; side: Side; entry: number; sl: number | null; tp: number | null; lots: number; openTime: number; overlays: string[]; slId?: string; tpId?: string }
interface ClosedTrade extends Omit<Position, 'overlays' | 'slId' | 'tpId'> { exit: number; exitTime: number; reason: 'TP' | 'SL' | 'Manual' | 'End'; pnl: number; r: number | null }

const PERIOD_MS: Record<string, number> = { '1m': 60e3, '3m': 180e3, '5m': 300e3, '15m': 900e3, '30m': 1800e3, '1H': 3600e3, '2H': 7200e3, '4H': 14400e3, D: 864e5, W: 6048e5, M: 2592e6 };
const SPEEDS = [0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256];

function contractSize(e: CatalogEntry): number {
  if (e.market === 'forex') return 100_000;
  if (e.ticker === 'XAUUSD') return 100;
  if (e.ticker === 'XAGUSD') return 5_000;
  if (e.ticker === 'USOIL' || e.ticker === 'UKOIL') return 1_000;
  if (e.ticker === 'NATGAS') return 10_000;
  if (e.ticker === 'COPPER') return 25_000;
  return 1;
}
function pipSize(e: CatalogEntry): number {
  const p = e.pricePrecision ?? 2;
  return Math.pow(10, -(Math.max(p, 1) - 1));
}
/** P&L currency: USD-quoted instruments convert directly; USDxxx pairs divide by price; others report in quote currency. */
function pnlCurrency(e: CatalogEntry): string {
  const t = e.ticker;
  if (e.market === 'crypto' || t.endsWith('USD') || ['USOIL', 'UKOIL', 'NATGAS', 'COPPER', 'US500', 'US100', 'US30', 'DXY', 'VIX'].includes(t) || e.market === 'stocks') return 'USD';
  if (e.market === 'forex' && t.startsWith('USD')) return 'USD';
  if (e.market === 'forex') return t.slice(3);
  return ({ GER40: 'EUR', FRA40: 'EUR', UK100: 'GBP', JP225: 'JPY', AUS200: 'AUD', HK50: 'HKD' } as Record<string, string>)[t] || 'USD';
}
function calcPnl(e: CatalogEntry, side: Side, entry: number, exit: number, lots: number): number {
  const raw = (exit - entry) * side * lots * contractSize(e);
  return e.market === 'forex' && e.ticker.startsWith('USD') ? raw / exit : raw;
}
const fmt = (v: number, d = 2) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
/** Money without pointless trailing zeros: 500 → "500", 512.5 → "512.50". */
const fmtMoney = (v: number) => (Math.abs(v - Math.round(v)) < 0.005 ? Math.round(v).toLocaleString('en-US') : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));


const FALLBACK_IND = ['MA', 'EMA', 'SMA', 'BBI', 'BOLL', 'SAR', 'VOL', 'MACD', 'KDJ', 'RSI', 'BIAS', 'BRAR', 'CCI', 'DMI', 'CR', 'PSY', 'DMA', 'TRIX', 'OBV', 'VR', 'WR', 'MTM', 'EMV', 'AO', 'ROC', 'PVT', 'AVP'];
const IND_NAMES: Record<string, string> = {
  MA: 'Moving Average', EMA: 'Exponential Moving Average', SMA: 'Smoothed Moving Average', BBI: 'Bull and Bear Index', BOLL: 'Bollinger Bands', SAR: 'Parabolic SAR', VOL: 'Volume',
  MACD: 'MACD', KDJ: 'KDJ / Stochastic', RSI: 'Relative Strength Index', BIAS: 'Bias Ratio', BRAR: 'Sentiment (BR / AR)', CCI: 'Commodity Channel Index', DMI: 'Directional Movement (ADX)',
  CR: 'Energy Index (CR)', PSY: 'Psychological Line', DMA: 'Different of Moving Average', TRIX: 'Triple Exponential Average', OBV: 'On Balance Volume', VR: 'Volume Ratio',
  WR: 'Williams %R', MTM: 'Momentum', EMV: 'Ease of Movement', AO: 'Awesome Oscillator', ROC: 'Rate of Change', PVT: 'Price and Volume Trend', AVP: 'Average Price',
};
/** Searchable, grouped indicator list (replaces the row of fixed chips). */
const IndicatorPicker: React.FC<{ list: string[]; active: Record<string, string>; onToggle: (n: string) => void; compact?: boolean }> = ({ list, active, onToggle, compact }) => {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('All');
  const ref = React.useRef<HTMLDivElement>(null);
  const btn = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);
  // The panel is fixed to the screen so a scrolling/clipped toolbar can never cut it off.
  React.useLayoutEffect(() => {
    if (!open) return;
    const place = () => { const r = btn.current?.getBoundingClientRect(); if (!r) return; const width = Math.min(360, window.innerWidth - 16); const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8)); const below = window.innerHeight - r.bottom; setPos({ top: below > 260 ? r.bottom + 4 : Math.max(8, r.top - 4 - Math.min(380, window.innerHeight - 16)), left, width }); };
    place(); window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  React.useEffect(() => { if (!open) return; const f = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f); }, [open]);
  const ql = q.trim().toLowerCase();
  const rows = list.map((n) => ({ n, name: IND_NAMES[n] || n, cat: indCategory({ type: `${n} ${IND_NAMES[n] || ''}` }) }))
    .filter((r) => (!ql || `${r.n} ${r.name} ${r.cat}`.toLowerCase().includes(ql)) && (cat === 'All' || r.cat === cat));
  const on = Object.keys(active);
  return (
    <div ref={ref} className="relative inline-flex items-center gap-1 flex-wrap" data-testid="bt-indicator-picker">
      {on.map((n) => (
        <button key={n} type="button" onClick={() => onToggle(n)} title={`Remove ${IND_NAMES[n] || n}`} className="px-1.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/50 text-cyan-200 cursor-pointer">{n} ×</button>
      ))}
      <button ref={btn} type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-testid="bt-indicator-open"
        className={`${compact ? 'px-1.5 py-0.5' : 'px-2 py-1'} rounded-md border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-500/50 cursor-pointer`}>+ Add indicator</button>
      {open && (
        <div style={pos ? { position: 'fixed', top: pos.top, left: pos.left, width: pos.width } : { position: 'fixed', visibility: 'hidden' }} className="z-[10000] rounded-xl border border-slate-700 bg-[#0d1220] shadow-2xl p-2 space-y-2 font-sans normal-case">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.stopPropagation()} placeholder="Search — e.g. RSI, Bollinger, volume" aria-label="Search indicators" data-testid="bt-indicator-search"
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 outline-none text-[12.5px] text-slate-100 placeholder:text-slate-500" />
          <div className="flex flex-wrap gap-1">
            {['All', ...IND_CATS].map((c) => <button key={c} type="button" onClick={() => setCat(c)} className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold cursor-pointer ${cat === c ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100' : 'border-slate-700 text-slate-400 hover:text-white'}`}>{c}</button>)}
          </div>
          <div className="max-h-72 overflow-y-auto space-y-0.5">
            {rows.map((r) => (
              <button key={r.n} type="button" onClick={() => onToggle(r.n)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/70 text-left cursor-pointer">
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${active[r.n] ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-600'}`}>{active[r.n] ? '✓' : ''}</span>
                <b className="font-mono-code text-[12px] text-slate-100 w-12">{r.n}</b>
                <span className="text-[12px] text-slate-300 flex-1 truncate">{r.name}</span>
                <span className="text-[10px] text-slate-500">{r.cat}</span>
              </button>
            ))}
            {!rows.length && <div className="px-2 py-2 text-[12px] text-slate-500">No indicator matches “{q}”.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export const BarReplayPro: React.FC = () => {
  const [ticker, setTicker] = useState('XAUUSD');
  const [periodText, setPeriodText] = useState('15m');
  const [startDate, setStartDate] = useState(() => new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 16));
  const [bars, setBars] = useState<KLineData[]>([]);
  const [cursor, setCursor] = useState(0); // index of the last visible bar
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [startBalance, setStartBalance] = useState(10_000);
  const [balanceDraft, setBalanceDraft] = useState('10000');
  const [lots, setLots] = useState(0.1);
  const [riskPct, setRiskPct] = useState(1);
  const startBalanceRef = useRef(10_000);
  const statsNetRef = useRef(0);
  const [slPips, setSlPips] = useState(20);
  const [tpPips, setTpPips] = useState(40);
  const [spreadPips, setSpreadPips] = useState(1);
  const [positions, setPositions] = useState<Position[]>([]);
  const [closed, setClosed] = useState<ClosedTrade[]>([]);
  const [source, setSource] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<{ minuteFrom: string | null; hourlyFrom: number | null; dailyFrom: number | null; building?: boolean } | null>(null);
  const [activeInd, setActiveInd] = useState<Record<string, string>>({}); // indicator → pane id
  const [drawings, setDrawings] = useState<string[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const drawingsRef = useRef<string[]>([]);
  const setDraw = (d: string[]) => { drawingsRef.current = d; setDrawings(d); };
  const chartHost = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);       // native full screen
  const [fsFallback, setFsFallback] = useState(false); // CSS full screen when the API is unavailable
  const fullscreen = isFs || fsFallback;
  const toggleFullscreen = () => {
    if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
    if (fsFallback) { setFsFallback(false); return; }
    const el = cardRef.current;
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => setFsFallback(true)); else setFsFallback(true);
  };
  useEffect(() => {
    const on = () => setIsFs(document.fullscreenElement === cardRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => chartRef.current?.resize(), 60);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && fsFallback) setFsFallback(false); };
    window.addEventListener('keydown', esc);
    return () => { clearTimeout(t); window.removeEventListener('keydown', esc); };
  }, [fullscreen, fsFallback]);
  const chartRef = useRef<Chart | null>(null);
  const feedRef = useRef<FullHistoryDatafeed | null>(null);
  const loadingMore = useRef(false);
  const feedErr = useRef<string | null>(null);
  const seq = useRef(1);
  const barsRef = useRef<KLineData[]>([]);
  const cursorRef = useRef(0);
  const posRef = useRef<Position[]>([]);
  const closedRef = useRef<ClosedTrade[]>([]);
  barsRef.current = bars;
  const setPos = (ps: Position[]) => { posRef.current = ps; setPositions(ps); };
  const setCur = (c: number) => { cursorRef.current = c; setCursor(c); };

  const entry: CatalogEntry = useMemo(() => CATALOG.find((c) => c.ticker === ticker) || CATALOG[0], [ticker]);
  const period = useMemo(() => PRO_PERIODS.find((p) => p.text === periodText) || PRO_PERIODS[3], [periodText]);
  const pip = pipSize(entry);
  const ccy = pnlCurrency(entry);

  // ── chart lifecycle
  useEffect(() => {
    const host = chartHost.current;
    if (!host) return;
    const chart = init(host, { styles: 'dark', timezone: 'Etc/UTC' });
    chartRef.current = chart;
    chart?.setStyles(REPLAY_STYLES as any);
    chart?.createIndicator('MA', false, { id: 'candle_pane' });
    const volPane = chart?.createIndicator('VOL');
    setActiveInd({ MA: 'candle_pane', ...(volPane ? { VOL: volPane } : {}) });
    feedRef.current = new FullHistoryDatafeed((s) => { if (s.source) setSource(s.source); if (s.state === 'error') feedErr.current = s.message || 'Data source error'; });
    const ro = new ResizeObserver(() => chart?.resize());
    ro.observe(host);
    return () => { ro.disconnect(); dispose(host); chartRef.current = null; feedRef.current?.destroy(); };
  }, []);

  useEffect(() => { chartRef.current?.setPriceVolumePrecision(entry.pricePrecision ?? 2, entry.volumePrecision ?? 0); }, [entry]);

  // What history exists for this symbol (archive coverage per timeframe family).
  useEffect(() => {
    setCoverage(null);
    if (entry.binance) return; // Binance: every timeframe since listing
    let live = true;
    fetch(`/api/history/archive?ticker=${encodeURIComponent(entry.ticker)}`).then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (!live) return;
      if (!j?.ok) { setCoverage({ minuteFrom: null, hourlyFrom: null, dailyFrom: null, building: true }); return; }
      setCoverage({ minuteFrom: j.minuteFrom || null, hourlyFrom: j.hourlyYears?.[0] ?? null, dailyFrom: j.dailyYears?.[0] ?? null });
    }).catch(() => {});
    return () => { live = false; };
  }, [entry]);

  // ── data loading: context before the start date + future bars after it (hidden until replayed)
  const fetchBefore = useCallback(async (to: number) => (await feedRef.current!.getHistoryKLineData(entry, period, 0, to)) || [], [entry, period]);
  const fetchWith = useCallback(async (pText: string, to: number) => {
    const p = PRO_PERIODS.find((x) => x.text === pText) || period;
    return (await feedRef.current!.getHistoryKLineData(entry, p, 0, to)) || [];
  }, [entry, period]);
  const skipReload = useRef(false);
  const loadSeq = useRef(0); // only the newest load may apply its bars (prevents races)

  const load = useCallback(async (overrideStart?: string) => {
    if (!feedRef.current) return;
    const my = ++loadSeq.current;
    const stale = () => my !== loadSeq.current;
    setLoading(true); setError(null); setNotice(null); setPlaying(false);
    for (const p of posRef.current) p.overlays.forEach((id) => chartRef.current?.removeOverlay(id));
    setPos([]); closedRef.current = []; setClosed([]);
    try {
      const startText = overrideStart ?? startDate;
      const start = Date.parse(startText.length === 16 ? `${startText}:00Z` : `${startText}Z`);
      if (!Number.isFinite(start)) throw new Error('Pick a valid start date and time.');
      if (start > Date.now()) throw new Error('The start date is in the future — pick a past date.');
      feedErr.current = null;
      // Bars around the start date for one timeframe: context before it + future bars after it.
      const gather = async (pText: string, from = start) => {
        const pMs = PERIOD_MS[pText];
        const context = await fetchWith(pText, from);
        let future: KLineData[] = [];
        let to = from;
        for (let i = 0; i < 8 && future.length < 400 && to < Date.now(); i++) {
          to = Math.min(Date.now() + pMs, to + 500 * pMs);
          const chunk = await fetchWith(pText, to);
          future = mergeBars(future, chunk.filter((b) => b.timestamp >= from));
          if (!chunk.length && to > from + 4000 * pMs) break;
        }
        return mergeBars(context, future);
      };
      let all = await gather(periodText);
      if (stale()) return;
      // Covers the start date? If this timeframe's history does not reach back that far yet, fall back
      // to the finest timeframe that does, so a replay can start from any date.
      const reaches = (bars: KLineData[]) => bars.length > 0 && bars[0].timestamp <= start + 3 * 864e5;
      if (!reaches(all)) {
        const order = ['1m', '3m', '5m', '15m', '30m', '1H', '2H', '4H', 'D', 'W', 'M'];
        for (const fb of order.slice(order.indexOf(periodText) + 1).filter((x) => ['1H', '4H', 'D', 'W'].includes(x))) {
          const alt = await gather(fb);
          if (stale()) return;
          if (reaches(alt)) {
            setNotice(`${periodText} history for ${ticker} does not reach ${startText.replace('T', ' ')} yet${coverage?.minuteFrom && ['1m', '3m', '5m', '15m', '30m'].includes(periodText) ? ` (minute archive currently from ${coverage.minuteFrom}, growing daily)` : ''} — replaying ${fb} bars from that date instead.`);
            all = alt; skipReload.current = true; setPeriodText(fb);
            break;
          }
        }
      }
      // The date is before the instrument's first recorded bar → start the replay at its very first bar.
      if (!all.length && entry.binance) {
        const iv = ({ '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m', '1H': '1h', '2H': '2h', '4H': '4h', D: '1d', W: '1w', M: '1M' } as Record<string, string>)[periodText] || '1h';
        const rows: any[] = await fetch(`https://data-api.binance.vision/api/v3/klines?symbol=${entry.binance}&interval=${iv}&startTime=${Math.max(0, start)}&limit=1000`).then((r) => r.json()).catch(() => []);
        if (stale()) return;
        all = (Array.isArray(rows) ? rows : []).map((r) => ({ timestamp: r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] }));
      }
      if (!all.length && coverage?.dailyFrom) {
        const first = Date.UTC(coverage.dailyFrom, 0, 1);
        if (first > start) { all = await gather('D', first); if (stale()) return; if (all.length) { skipReload.current = periodText !== 'D'; if (periodText !== 'D') setPeriodText('D'); } }
      }
      if (!all.length) {
        const minute = ['1m', '3m', '5m', '15m', '30m'].includes(periodText);
        throw new Error(minute && coverage?.minuteFrom
          ? `Minute-level history for ${ticker} currently starts in ${coverage.minuteFrom} (the full archive back to 2003 is still being filled, about 1.5 years per day). Pick a later date, or use 1H or higher for earlier dates.`
          : `No ${periodText} bars for ${ticker} around that date. Pick a later date or a higher timeframe.${feedErr.current ? ` (Source: ${feedErr.current})` : ''}`);
      }
      if (stale()) return;
      const firstFuture = all.findIndex((b) => b.timestamp >= start);
      let cur: number;
      if (firstFuture === -1) { cur = all.length - 1; setNotice('No bars after that date yet — replay starts at the latest bar.'); }
      else if (firstFuture === 0) { cur = 0; setNotice(`${ticker} ${periodText} history begins ${new Date(all[0].timestamp).toISOString().slice(0, 16).replace('T', ' ')} UTC (its first recorded bar) — replay starts there.`); }
      else cur = firstFuture - 1;
      barsRef.current = all;
      setBars(all);
      setCur(cur);
      chartRef.current?.applyNewData(all.slice(0, cur + 1));
    } catch (e: any) {
      if (!stale()) { setError(e?.message || String(e)); barsRef.current = []; setBars([]); setCur(0); chartRef.current?.applyNewData([]); }
    } finally { if (!stale()) setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, periodText, fetchWith, coverage, ticker]);

  useEffect(() => { if (skipReload.current) { skipReload.current = false; return; } load(); /* reload when symbol/timeframe change */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, periodText]);

  // Fetch more future bars when the replay approaches the end of what is loaded.
  useEffect(() => {
    if (loadingMore.current || !bars.length || bars.length - cursor > 60) return;
    const last = bars[bars.length - 1].timestamp;
    if (last > Date.now() - PERIOD_MS[periodText]) return;
    loadingMore.current = true;
    const seqAtStart = loadSeq.current;
    fetchBefore(Math.min(Date.now() + PERIOD_MS[periodText], last + 500 * PERIOD_MS[periodText]))
      .then((chunk) => { if (seqAtStart !== loadSeq.current) return; setBars((prev) => { const m = mergeBars(prev, chunk.filter((b) => b.timestamp > last)); barsRef.current = m; return m; }); })
      .finally(() => { loadingMore.current = false; });
  }, [cursor, bars, periodText, fetchBefore]);

  // ── trading engine
  const lastBar = bars[cursor];
  // Entry line (locked) + DRAGGABLE stop-loss / take-profit lines, MetaTrader-style: drag a line to
  // move the level; an invalid level (SL above the price on a buy, etc.) snaps back.
  const levelLabel = (posId: number, kind: 'sl' | 'tp', value: number | undefined) => {
    const p = posRef.current.find((x) => x.id === posId);
    if (!p || value === undefined || !Number.isFinite(value)) return kind.toUpperCase();
    const money = calcPnl(entry, p.side, p.entry, value, p.lots);
    const bal = startBalanceRef.current + statsNetRef.current;
    const pct = bal > 0 ? (money / bal) * 100 : 0;
    const pips = Math.abs(value - p.entry) / pip;
    const slDist = p.sl !== null ? Math.abs(p.entry - p.sl) : 0;
    const rr = kind === 'tp' && slDist > 0 ? ` · ${(Math.abs(value - p.entry) / slDist).toFixed(2)}R` : '';
    const sign = money >= 0 ? '+' : '−';
    return `${kind === 'sl' ? 'SL' : 'TP'} ${value.toFixed(entry.pricePrecision ?? 2)}   ${sign}${fmtMoney(Math.abs(money))} ${ccy} (${sign}${Math.abs(pct).toFixed(2)}%) · ${pips.toFixed(1)} pips${rr}`;
  };
  const levelLine = (posId: number, kind: 'sl' | 'tp', value: number): string => {
    const c = chartRef.current;
    if (!c || !lastBar) return '';
    ensureLevelOverlay();
    const color = kind === 'sl' ? '#f43f5e' : '#10b981';
    return c.createOverlay({
      name: 'ppfxLevel', lock: false, points: [{ timestamp: lastBar.timestamp, value }],
      extendData: { color, label: (v: number) => levelLabel(posId, kind, v) },
      styles: { point: { color, borderColor: color, activeColor: color, activeBorderColor: '#fff' } } as any,
      onPressedMoveEnd: (ev: any) => { moveLevel(posId, kind, ev.overlay.id, ev.overlay.points?.[0]?.value); return false; },
    } as any) as string;
  };
  const addLines = (p: Omit<Position, 'overlays'>): { overlays: string[]; slId?: string; tpId?: string } => {
    const c = chartRef.current;
    if (!c || !lastBar) return { overlays: [] };
    const entryId = c.createOverlay({ name: 'priceLine', lock: true, points: [{ timestamp: lastBar.timestamp, value: p.entry }], styles: { line: { color: '#38bdf8', size: 1, style: 'dashed' as any }, text: { color: '#0b1220', backgroundColor: '#38bdf8', borderColor: '#38bdf8' } } } as any) as string;
    const slId = p.sl !== null ? levelLine(p.id, 'sl', p.sl) : undefined;
    const tpId = p.tp !== null ? levelLine(p.id, 'tp', p.tp) : undefined;
    return { overlays: [entryId, slId, tpId].filter(Boolean) as string[], slId, tpId };
  };
  const moveLevel = (posId: number, kind: 'sl' | 'tp', overlayId: string, value: number | undefined) => {
    const cur = posRef.current.find((x) => x.id === posId);
    const bar = barsRef.current[cursorRef.current];
    if (!cur || !bar || value === undefined || !Number.isFinite(value)) return;
    const bid = bar.close, ask = bar.close + spreadPips * pip;
    const ref = cur.side > 0 ? bid : ask; // a buy closes at the bid, a sell at the ask
    const valid = kind === 'sl' ? (cur.side > 0 ? value < ref : value > ref) : (cur.side > 0 ? value > ref : value < ref);
    if (!valid) {
      const old = kind === 'sl' ? cur.sl : cur.tp;
      chartRef.current?.overrideOverlay({ id: overlayId, points: [{ timestamp: bar.timestamp, value: old ?? ref }] } as any);
      setNotice(`${kind === 'sl' ? 'Stop loss' : 'Take profit'} must be ${(kind === 'sl') === (cur.side > 0) ? 'below' : 'above'} the current ${cur.side > 0 ? 'bid' : 'ask'} (${ref.toFixed(entry.pricePrecision ?? 2)}) — level kept at ${(old ?? ref).toFixed(entry.pricePrecision ?? 2)}.`);
      return;
    }
    const rounded = Number(value.toFixed(entry.pricePrecision ?? 5));
    setPos(posRef.current.map((x) => (x.id === posId ? { ...x, [kind]: rounded } : x)));
  };
  /** Add (or remove) an SL / TP line on an open position from the ticket. */
  const toggleLevel = (posId: number, kind: 'sl' | 'tp') => {
    const cur = posRef.current.find((x) => x.id === posId);
    if (!cur) return;
    const id = kind === 'sl' ? cur.slId : cur.tpId;
    if (id) {
      chartRef.current?.removeOverlay(id);
      setPos(posRef.current.map((x) => (x.id === posId ? { ...x, [kind]: null, [kind === 'sl' ? 'slId' : 'tpId']: undefined, overlays: x.overlays.filter((o) => o !== id) } : x)));
      return;
    }
    const bar = barsRef.current[cursorRef.current];
    const dist = (kind === 'sl' ? slPips || 20 : tpPips || 40) * pip;
    const value = Number((kind === 'sl' ? cur.entry - cur.side * dist : cur.entry + cur.side * dist).toFixed(entry.pricePrecision ?? 5));
    const lid = levelLine(posId, kind, value);
    void bar;
    setPos(posRef.current.map((x) => (x.id === posId ? { ...x, [kind]: value, [kind === 'sl' ? 'slId' : 'tpId']: lid, overlays: [...x.overlays, lid] } : x)));
  };

  const open = (side: Side) => {
    if (!lastBar) { setError('Load a replay first (pick a symbol, timeframe and start date, then press Load replay).'); return; }
    const spread = spreadPips * pip;
    const price = side > 0 ? lastBar.close + spread : lastBar.close; // data is bid-based: buys pay the spread
    const p: Omit<Position, 'overlays'> = {
      id: seq.current++, side, entry: price, lots: tradeLots,
      sl: slPips > 0 ? price - side * slPips * pip : null,
      tp: tpPips > 0 ? price + side * tpPips * pip : null,
      openTime: lastBar.timestamp,
    };
    setPos([...posRef.current, { ...p, ...addLines(p) }]);
  };

  const closePos = (pos: Position, exit: number, reason: ClosedTrade['reason'], time: number) => {
    pos.overlays.forEach((id) => chartRef.current?.removeOverlay(id));
    const pnl = calcPnl(entry, pos.side, pos.entry, exit, pos.lots);
    const risk = pos.sl !== null ? Math.abs(pos.entry - pos.sl) : 0;
    const r = risk > 0 ? ((exit - pos.entry) * pos.side) / risk : null;
    const { overlays: _o, slId: _s, tpId: _t, ...rest } = pos;
    closedRef.current = [...closedRef.current, { ...rest, exit, exitTime: time, reason, pnl, r }];
    setClosed(closedRef.current);
  };

  /** Advance one bar: reveal it, then fill any SL/TP it touched (SL assumed first if both). */
  const step = useCallback(() => {
    const all = barsRef.current;
    const next = cursorRef.current + 1;
    if (next >= all.length) { setPlaying(false); return; }
    const b = all[next];
    chartRef.current?.updateData(b);
    const still: Position[] = [];
    for (const p of posRef.current) {
      const hitSL = p.sl !== null && (p.side > 0 ? b.low <= p.sl : b.high >= p.sl);
      const hitTP = p.tp !== null && (p.side > 0 ? b.high >= p.tp : b.low <= p.tp);
      if (hitSL) closePos(p, p.side > 0 ? Math.min(p.sl!, b.open) : Math.max(p.sl!, b.open), 'SL', b.timestamp);
      else if (hitTP) closePos(p, p.side > 0 ? Math.max(p.tp!, b.open) : Math.min(p.tp!, b.open), 'TP', b.timestamp);
      else still.push(p);
    }
    if (still.length !== posRef.current.length) setPos(still);
    setCur(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  useEffect(() => {
    if (!playing) return;
    const perTick = Math.max(1, Math.ceil(speed / 30));
    const id = setInterval(() => { for (let i = 0; i < perTick; i++) step(); }, Math.max(16, (1000 * perTick) / speed));
    return () => clearInterval(id);
  }, [playing, speed, step]);

  // Keyboard: Space play/pause · → step · B buy · S sell
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawing) { e.preventDefault(); removeDrawing(selectedDrawing); }
      else if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); undoDrawing(); }
      else if (e.key.toLowerCase() === 'b') open(1);
      else if (e.key.toLowerCase() === 's') open(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── drawings (tracked so they can be selected, deleted, undone and cleared)
  const DRAW_COLORS = ['#22d3ee', '#facc15', '#a78bfa', '#fb923c', '#34d399', '#f472b6'];
  const startDrawing = (name: string) => {
    const c = chartRef.current;
    if (!c) return;
    const color = DRAW_COLORS[drawingsRef.current.length % DRAW_COLORS.length];
    const id = c.createOverlay({
      name,
      styles: { line: { color, size: 2 }, point: { color, borderColor: color, activeColor: color, activeBorderColor: '#ffffff' }, text: { color: '#e2e8f0' }, polygon: { color: `${color}22` } } as any,
      onSelected: (ev: any) => { setSelectedDrawing(ev.overlay.id); return false; },
      onDeselected: () => { setSelectedDrawing(null); return false; },
      onRightClick: (ev: any) => { removeDrawing(ev.overlay.id); return true; },
    } as any) as string | null;
    if (id) setDraw([...drawingsRef.current, id]);
  };
  const removeDrawing = (id: string) => {
    chartRef.current?.removeOverlay(id);
    setDraw(drawingsRef.current.filter((x) => x !== id));
    setSelectedDrawing((s) => (s === id ? null : s));
  };
  const undoDrawing = () => { const last = drawingsRef.current[drawingsRef.current.length - 1]; if (last) removeDrawing(last); };
  const clearDrawings = () => { drawingsRef.current.forEach((id) => chartRef.current?.removeOverlay(id)); setDraw([]); setSelectedDrawing(null); };

  // ── indicators: toggle on/off (no duplicates)
  const MAIN_PANE = ['MA', 'EMA', 'SMA', 'BOLL', 'SAR', 'BBI'];
  const toggleIndicator = (n: string) => {
    const c = chartRef.current;
    if (!c) return;
    const pane = activeInd[n];
    if (pane) {
      c.removeIndicator(pane, n);
      const { [n]: _gone, ...rest } = activeInd;
      setActiveInd(rest);
    } else {
      const id = MAIN_PANE.includes(n) ? (c.createIndicator(n, true, { id: 'candle_pane' }), 'candle_pane') : c.createIndicator(n, false, { height: 110 });
      if (id) setActiveInd({ ...activeInd, [n]: id });
    }
  };

  // ── statistics
  const floating = positions.reduce((s, p) => s + (lastBar ? calcPnl(entry, p.side, p.entry, lastBar.close, p.lots) : 0), 0);
  const stats = useMemo(() => {
    const net = closed.reduce((s, t) => s + t.pnl, 0);
    const wins = closed.filter((t) => t.pnl > 0), losses = closed.filter((t) => t.pnl <= 0);
    const gw = wins.reduce((s, t) => s + t.pnl, 0), gl = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    let eq = startBalance, peak = startBalance, maxDD = 0;
    const curve = [startBalance];
    for (const t of closed) { eq += t.pnl; curve.push(eq); peak = Math.max(peak, eq); maxDD = Math.max(maxDD, peak > 0 ? (peak - eq) / peak : 0); }
    const rs = closed.map((t) => t.r).filter((r): r is number => r !== null);
    return {
      net, trades: closed.length, winRate: closed.length ? (wins.length / closed.length) * 100 : 0,
      pf: gl > 0 ? gw / gl : wins.length ? Infinity : 0, avgWin: wins.length ? gw / wins.length : 0, avgLoss: losses.length ? gl / losses.length : 0,
      maxDD: maxDD * 100, expectancyR: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null, curve,
    };
  }, [closed, startBalance]);
  startBalanceRef.current = startBalance;
  statsNetRef.current = stats.net;
  // Risk-based sizing: with Risk % > 0 the lot size is worked out from the balance and the SL distance.
  const refPrice = lastBar?.close ?? 0;
  const lossPerLot = refPrice && slPips > 0 ? Math.abs(calcPnl(entry, 1, refPrice, refPrice - slPips * pip, 1)) : 0;
  const balanceNow = startBalance + stats.net;
  const autoLots = riskPct > 0 && lossPerLot > 0 ? Math.max(0.01, Math.floor(((balanceNow * riskPct) / 100 / lossPerLot) * 100) / 100) : null;
  const tradeLots = autoLots ?? lots;
  const riskMoney = lossPerLot * tradeLots;
  const rewardMoney = refPrice && tpPips > 0 ? Math.abs(calcPnl(entry, 1, refPrice, refPrice + tpPips * pip, tradeLots)) : 0;

  const exportCsv = () => {
    const rows = [['#', 'Side', 'Lots', 'Open time (UTC)', 'Entry', 'SL', 'TP', 'Close time (UTC)', 'Exit', 'Reason', `P&L (${ccy})`, 'R'],
      ...closed.map((t, i) => [i + 1, t.side > 0 ? 'BUY' : 'SELL', t.lots, new Date(t.openTime).toISOString(), t.entry, t.sl ?? '', t.tp ?? '', new Date(t.exitTime).toISOString(), t.exit, t.reason, t.pnl.toFixed(2), t.r?.toFixed(2) ?? ''])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bar-replay-${ticker}-${periodText}.csv`; a.click();
  };

  const drawTools: Array<[string, string]> = [['segment', 'Trend line'], ['rayLine', 'Ray'], ['horizontalStraightLine', 'Horizontal'], ['verticalStraightLine', 'Vertical'], ['parallelStraightLine', 'Channel'], ['fibonacciLine', 'Fibonacci'], ['priceLine', 'Price label'], ['simpleAnnotation', 'Note']];
  const indicators = React.useMemo(() => { try { const l = getSupportedIndicators(); return l?.length ? l : FALLBACK_IND; } catch { return FALLBACK_IND; } }, []);
  const progress = bars.length ? Math.round((cursor / Math.max(1, bars.length - 1)) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-3 flex flex-wrap items-end gap-3 shadow-lg shadow-black/20">
        <div className="text-[10px] font-mono-code uppercase text-slate-500 flex flex-col gap-1">Symbol
          <SymbolPicker value={ticker} onChange={setTicker} />
        </div>
        <label className="text-[10px] font-mono-code uppercase text-slate-500 flex flex-col gap-1">Timeframe
          <select value={periodText} onChange={(e) => setPeriodText(e.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-slate-100">
            {PRO_PERIODS.map((p) => <option key={p.text} value={p.text}>{p.text}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-mono-code uppercase text-slate-500 flex flex-col gap-1">Start (UTC)
          <input type="datetime-local" value={startDate} max={new Date().toISOString().slice(0, 16)} onChange={(e) => setStartDate(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-slate-100 [color-scheme:dark]" />
        </label>
        <button type="button" onClick={() => load()} disabled={loading} className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 text-[12px] font-bold text-slate-950 hover:brightness-110 disabled:opacity-50 cursor-pointer shadow shadow-cyan-500/30">
          {loading ? 'Loading…' : 'Start replay'}
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={() => setPlaying((p) => !p)} disabled={!bars.length} title="Play / pause (Space)" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 disabled:opacity-40 cursor-pointer">{playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
          <button type="button" onClick={step} disabled={!bars.length} title="Next bar (→)" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 disabled:opacity-40 cursor-pointer"><StepForward className="w-4 h-4" /></button>
          <button type="button" onClick={() => { for (let i = 0; i < 10; i++) step(); }} disabled={!bars.length} title="Forward 10 bars" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 disabled:opacity-40 cursor-pointer"><ChevronsRight className="w-4 h-4" /></button>
          <button type="button" onClick={() => { for (let i = 0; i < 100; i++) step(); }} disabled={!bars.length} title="Forward 100 bars" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 disabled:opacity-40 cursor-pointer"><SkipForward className="w-4 h-4" /></button>
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Replay speed" className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-slate-100">
            {SPEEDS.map((s) => <option key={s} value={s}>{s} bar/s</option>)}
          </select>
        </div>
        <div className="basis-full flex items-center gap-2 text-[10.5px] font-mono-code text-slate-500">
          <Info className="w-3 h-3" />
          {entry.binance ? <span>History: every timeframe since the Binance listing.</span>
            : coverage?.building ? <span>The full Dukascopy archive for {ticker} is still being built (it fills automatically within hours). Until then: daily bars from 2003, hourly for the last 2 years, minutes for the last 1–2 months — older dates replay on the finest timeframe available.</span>
            : coverage ? <span>History available — minutes (1m–30m) from <b className="text-slate-300">{coverage.minuteFrom || '—'}</b> · hourly from <b className="text-slate-300">{coverage.hourlyFrom ?? '—'}</b> · daily from <b className="text-slate-300">{coverage.dailyFrom ?? '—'}</b> (Dukascopy archive; minute depth grows daily)</span>
            : <span>Checking available history…</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono-code">
        <span className="text-slate-500 uppercase mr-1">Draw</span>
        {drawTools.map(([n, l]) => <button key={n} type="button" onClick={() => startDrawing(n)} className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 cursor-pointer">{l}</button>)}
        <button type="button" onClick={undoDrawing} disabled={!drawings.length} title="Undo last drawing (Ctrl+Z)" className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:border-cyan-500/40 disabled:opacity-40 cursor-pointer flex items-center gap-1"><Undo2 className="w-3 h-3" />Undo</button>
        <button type="button" onClick={() => selectedDrawing && removeDrawing(selectedDrawing)} disabled={!selectedDrawing} title="Delete selected drawing (Delete key · or right-click a drawing)" className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-amber-300 hover:border-amber-500/40 disabled:opacity-40 cursor-pointer">Delete selected</button>
        <button type="button" onClick={clearDrawings} disabled={!drawings.length} className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-rose-300 hover:border-rose-500/40 disabled:opacity-40 cursor-pointer flex items-center gap-1"><Trash2 className="w-3 h-3" />Clear all ({drawings.length})</button>
        <span className="text-slate-500 uppercase mx-1">Indicators</span>
        <IndicatorPicker list={indicators} active={activeInd} onToggle={toggleIndicator} />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-3">
        <div ref={cardRef} className={`border border-slate-800 bg-[#151517] overflow-hidden flex flex-col ${fsFallback ? 'fixed inset-x-0 top-0 h-[100dvh] z-[9999] rounded-none' : isFs ? 'rounded-none' : 'rounded-2xl'}`}>
          <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-slate-800 text-[10.5px] font-mono-code text-slate-400 flex-wrap">
            <span className="text-slate-100 font-bold">{ticker}</span><span>{periodText}</span>
            {lastBar && <span className="hidden md:inline">Bar {new Date(lastBar.timestamp).toISOString().replace('T', ' ').slice(0, 16)} UTC · O {lastBar.open.toFixed(entry.pricePrecision ?? 2)} H {lastBar.high.toFixed(entry.pricePrecision ?? 2)} L {lastBar.low.toFixed(entry.pricePrecision ?? 2)} C <b className="text-slate-100">{lastBar.close.toFixed(entry.pricePrecision ?? 2)}</b></span>}
            <span className="hidden lg:inline text-slate-500">{source}</span>
            {/* Replay & trading controls — always here, so they work in full screen too */}
            <div className="ml-auto flex items-center gap-1 max-md:w-full max-md:overflow-x-auto max-md:[&>*]:shrink-0">
              <button type="button" onClick={() => setPlaying((p) => !p)} disabled={!bars.length} title="Play / pause (Space)" className="p-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 disabled:opacity-40 cursor-pointer">{playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}</button>
              <button type="button" onClick={step} disabled={!bars.length} title="Next bar (→)" className="p-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 disabled:opacity-40 cursor-pointer"><StepForward className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => { for (let i = 0; i < 10; i++) step(); }} disabled={!bars.length} title="Forward 10 bars" className="p-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 disabled:opacity-40 cursor-pointer"><ChevronsRight className="w-3.5 h-3.5" /></button>
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Replay speed" title="Replay speed" className="px-1 py-1 rounded-md bg-slate-900 border border-slate-700 text-[10.5px] text-slate-100">
                {SPEEDS.map((s) => <option key={s} value={s}>{s}×/s</option>)}
              </select>
              <button type="button" onClick={() => open(1)} disabled={!lastBar} title="Buy at market (B)" className="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-500/50 text-emerald-100 font-bold hover:bg-emerald-500/30 disabled:opacity-40 cursor-pointer">BUY</button>
              <button type="button" onClick={() => open(-1)} disabled={!lastBar} title="Sell at market (S)" className="px-2 py-1 rounded-md bg-rose-500/20 border border-rose-500/50 text-rose-100 font-bold hover:bg-rose-500/30 disabled:opacity-40 cursor-pointer">SELL</button>
              <button type="button" onClick={undoDrawing} disabled={!drawings.length} title="Undo last drawing" className="p-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer"><Undo2 className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={clearDrawings} disabled={!drawings.length} title="Clear all drawings" className="p-1.5 rounded-md bg-slate-900 border border-slate-700 text-rose-300 disabled:opacity-40 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={toggleFullscreen} title={fullscreen ? 'Exit full screen (Esc)' : 'Full screen'} className="p-1.5 rounded-md bg-cyan-500/15 border border-cyan-500/50 text-cyan-100 hover:bg-cyan-500/25 cursor-pointer">{fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}</button>
            </div>
          </div>
          {fullscreen && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 border-b border-slate-800 text-[10px] font-mono-code overflow-x-auto">
              {drawTools.map(([n, l]) => <button key={n} type="button" onClick={() => startDrawing(n)} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer whitespace-nowrap">{l}</button>)}
              <span className="text-slate-600 mx-1">|</span>
              <IndicatorPicker list={indicators} active={activeInd} onToggle={toggleIndicator} compact />
              {positions.length > 0 && <button type="button" onClick={() => { const b = barsRef.current[cursorRef.current]; if (!b) return; for (const p of posRef.current) closePos(p, b.close, 'Manual', b.timestamp); setPos([]); }} className="ml-2 px-1.5 py-0.5 rounded border border-amber-500/50 text-amber-200 cursor-pointer whitespace-nowrap">Close all ({positions.length})</button>}
              <span className="ml-auto text-slate-400 whitespace-nowrap">Equity <b className={stats.net + floating >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{fmtMoney(startBalance + stats.net + floating)} {ccy}</b> · open {positions.length} · trades {stats.trades}</span>
            </div>
          )}
          {error && <div className="px-3 py-2 text-[12px] text-rose-200 bg-rose-500/10 border-b border-rose-500/20 flex items-start gap-2"><span className="flex-1">{error}</span><button type="button" aria-label="Dismiss" onClick={() => setError(null)} className="text-rose-300 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button></div>}
          {notice && !error && <div className="px-3 py-1.5 text-[11.5px] text-amber-200 bg-amber-500/10 border-b border-amber-500/20">{notice}</div>}
          <div className={`relative ${fullscreen ? 'flex-1 min-h-0' : 'h-[420px] md:h-[560px]'}`}>
            <div ref={chartHost} className="absolute inset-0" />
            <button type="button" onClick={() => { try { chartRef.current?.scrollToRealTime(250); } catch { /* ignore */ } }}
              title="Back to the latest bar" aria-label="Back to the latest bar"
              className="absolute bottom-10 right-16 z-10 w-9 h-9 rounded-full bg-slate-900/90 border border-slate-600 text-slate-200 hover:text-white hover:border-cyan-400 shadow-lg flex items-center justify-center cursor-pointer">
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
          <div className="h-1 bg-slate-800"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 space-y-2.5">
            <div className="text-[10px] font-mono-code uppercase tracking-widest text-cyan-400">Order ticket</div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-code uppercase text-slate-500">
              <label className="flex flex-col gap-1">Risk % per trade<input type="number" min={0} max={100} step={0.1} value={riskPct} onChange={(e) => setRiskPct(Math.max(0, Number(e.target.value)))} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[12px]" /></label>
              <label className="flex flex-col gap-1">Lots{autoLots !== null ? ' (auto from risk)' : ''}<input type="number" min={0.01} step={0.01} value={autoLots ?? lots} disabled={autoLots !== null} onChange={(e) => setLots(Math.max(0.01, Number(e.target.value)))} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[12px] disabled:opacity-70" /></label>
              <label className="flex flex-col gap-1">Spread (pips)<input type="number" min={0} step={0.1} value={spreadPips} onChange={(e) => setSpreadPips(Math.max(0, Number(e.target.value)))} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[12px]" /></label>
              <label className="flex flex-col gap-1">Stop loss (pips)<input type="number" min={0} value={slPips} onChange={(e) => setSlPips(Math.max(0, Number(e.target.value)))} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[12px]" /></label>
              <label className="flex flex-col gap-1">Take profit (pips)<input type="number" min={0} value={tpPips} onChange={(e) => setTpPips(Math.max(0, Number(e.target.value)))} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[12px]" /></label>
            </div>
            {lastBar && slPips > 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[11px] font-mono-code flex flex-wrap gap-x-3 gap-y-0.5">
                <span className="text-rose-300">Risk −{fmtMoney(riskMoney)} {ccy} ({balanceNow > 0 ? ((riskMoney / balanceNow) * 100).toFixed(2) : '0'}%)</span>
                {tpPips > 0 && <span className="text-emerald-300">Reward +{fmtMoney(rewardMoney)} {ccy}</span>}
                {tpPips > 0 && <span className="text-slate-400">R:R 1:{(tpPips / slPips).toFixed(2)}</span>}
                <span className="text-slate-500">{tradeLots.toFixed(2)} lots</span>
              </div>
            )}
            <div className="text-[10px] font-mono-code text-slate-500">1 pip = {pip} · contract {contractSize(entry).toLocaleString()} units/lot · 0 = no SL/TP · Risk % 0 = set lots by hand · drag the SL/TP lines on the chart — their $ and % update live</div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => open(1)} className="py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-100 font-bold text-[13px] hover:bg-emerald-500/30 cursor-pointer">BUY (B)<div className="text-[10px] font-mono-code font-normal">{lastBar ? fmt(lastBar.close + spreadPips * pip, entry.pricePrecision ?? 2) : '—'}</div></button>
              <button type="button" onClick={() => open(-1)} className="py-2 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-100 font-bold text-[13px] hover:bg-rose-500/30 cursor-pointer">SELL (S)<div className="text-[10px] font-mono-code font-normal">{lastBar ? fmt(lastBar.close, entry.pricePrecision ?? 2) : '—'}</div></button>
            </div>
            {positions.map((p) => {
              const fl = lastBar ? calcPnl(entry, p.side, p.entry, lastBar.close, p.lots) : 0;
              return (
                <div key={p.id} className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-2 py-1.5 text-[11px] font-mono-code">
                  <span className={p.side > 0 ? 'text-emerald-400' : 'text-rose-400'}>{p.side > 0 ? 'BUY' : 'SELL'} {p.lots}</span>
                  <span className="text-slate-400">@ {p.entry.toFixed(entry.pricePrecision ?? 2)}</span>
                  <button type="button" onClick={() => toggleLevel(p.id, 'sl')} title={p.sl !== null ? `Stop loss ${p.sl.toFixed(entry.pricePrecision ?? 2)} (${(Math.abs(p.entry - p.sl) / pip).toFixed(1)} pips, ${fmtMoney(calcPnl(entry, p.side, p.entry, p.sl, p.lots))} ${ccy}) — drag the red line to move it; click to remove` : 'Add a stop-loss line (then drag it)'}
                    className={`px-1 rounded border text-[9.5px] cursor-pointer ${p.sl !== null ? 'border-rose-500/50 text-rose-300' : 'border-slate-700 text-slate-500 hover:text-rose-300'}`}>{p.sl !== null ? `SL ${(Math.abs(p.entry - p.sl) / pip).toFixed(0)}p` : '+SL'}</button>
                  <button type="button" onClick={() => toggleLevel(p.id, 'tp')} title={p.tp !== null ? `Take profit ${p.tp.toFixed(entry.pricePrecision ?? 2)} (${(Math.abs(p.tp - p.entry) / pip).toFixed(1)} pips, +${fmtMoney(calcPnl(entry, p.side, p.entry, p.tp, p.lots))} ${ccy}) — drag the green line to move it; click to remove` : 'Add a take-profit line (then drag it)'}
                    className={`px-1 rounded border text-[9.5px] cursor-pointer ${p.tp !== null ? 'border-emerald-500/50 text-emerald-300' : 'border-slate-700 text-slate-500 hover:text-emerald-300'}`}>{p.tp !== null ? `TP ${(Math.abs(p.tp - p.entry) / pip).toFixed(0)}p` : '+TP'}</button>
                  <span className={`ml-auto ${fl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fl >= 0 ? '+' : ''}{fmtMoney(fl)} {ccy}</span>
                  <button type="button" aria-label="Close position" onClick={() => { closePos(p, lastBar.close, 'Manual', lastBar.timestamp); setPos(posRef.current.filter((x) => x.id !== p.id)); }} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 space-y-2">
            <div className="flex items-center gap-2"><Target className="w-3.5 h-3.5 text-cyan-400" /><span className="text-[10px] font-mono-code uppercase tracking-widest text-cyan-400">Performance</span>
              <label className="ml-auto text-[10px] font-mono-code text-slate-500 flex items-center gap-1">Start balance
                <input type="text" inputMode="decimal" value={balanceDraft} aria-label="Start balance"
                  onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); setBalanceDraft(v); const n = Number(v); if (v && Number.isFinite(n) && n > 0) setStartBalance(n); }}
                  onBlur={() => setBalanceDraft(String(startBalance))}
                  className="w-24 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[11px]" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-code">
              {([
                ['Balance', `${fmtMoney(startBalance + stats.net)} ${ccy}`],
                ['Equity', `${fmtMoney(startBalance + stats.net + floating)} ${ccy}`],
                ['Net P&L', `${stats.net >= 0 ? '+' : ''}${fmtMoney(stats.net)}`],
                ['Trades', String(stats.trades)],
                ['Win rate', `${stats.winRate.toFixed(1)}%`],
                ['Profit factor', stats.pf === Infinity ? '∞' : stats.pf.toFixed(2)],
                ['Avg win / loss', `${fmt(stats.avgWin)} / ${fmt(stats.avgLoss)}`],
                ['Max drawdown', `${stats.maxDD.toFixed(2)}%`],
                ['Expectancy', stats.expectancyR === null ? '—' : `${stats.expectancyR.toFixed(2)} R`],
              ] as Array<[string, string]>).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-900/70 border border-slate-800 px-2 py-1.5"><div className="text-[9px] uppercase text-slate-500">{k}</div><div className="text-slate-100">{v}</div></div>
              ))}
            </div>
            {stats.curve.length > 1 && <EquityCurve values={stats.curve} />}
            <button type="button" onClick={exportCsv} disabled={!closed.length} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 hover:border-cyan-500/50 disabled:opacity-40 cursor-pointer"><Download className="w-3.5 h-3.5" /> Export trades (CSV)</button>
          </div>
        </div>
      </div>

      {closed.length > 0 && (
        <div className="rounded-2xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-[11px] font-mono-code">
            <thead className="bg-slate-900/80 text-[9.5px] uppercase text-slate-500"><tr>{['#', 'Side', 'Lots', 'Opened (UTC)', 'Entry', 'SL', 'TP', 'Closed (UTC)', 'Exit', 'Reason', `P&L ${ccy}`, 'R'].map((h) => <th key={h} className="px-2 py-1.5 text-left font-normal">{h}</th>)}</tr></thead>
            <tbody>
              {[...closed].reverse().map((t, i) => (
                <tr key={t.id} className="border-t border-slate-800/70">
                  <td className="px-2 py-1.5 text-slate-500">{closed.length - i}</td>
                  <td className={`px-2 py-1.5 ${t.side > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{t.side > 0 ? 'BUY' : 'SELL'}</td>
                  <td className="px-2 py-1.5 text-slate-300">{t.lots}</td>
                  <td className="px-2 py-1.5 text-slate-400">{new Date(t.openTime).toISOString().slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-2 py-1.5 text-slate-300">{t.entry.toFixed(entry.pricePrecision ?? 2)}</td>
                  <td className="px-2 py-1.5 text-slate-500">{t.sl?.toFixed(entry.pricePrecision ?? 2) ?? '—'}</td>
                  <td className="px-2 py-1.5 text-slate-500">{t.tp?.toFixed(entry.pricePrecision ?? 2) ?? '—'}</td>
                  <td className="px-2 py-1.5 text-slate-400">{new Date(t.exitTime).toISOString().slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-2 py-1.5 text-slate-300">{t.exit.toFixed(entry.pricePrecision ?? 2)}</td>
                  <td className="px-2 py-1.5 text-slate-400">{t.reason}</td>
                  <td className={`px-2 py-1.5 font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{t.pnl >= 0 ? '+' : ''}{fmt(t.pnl)}</td>
                  <td className="px-2 py-1.5 text-slate-300">{t.r === null ? '—' : t.r.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] font-mono-code text-slate-500 leading-relaxed">
        Keyboard: Space = play/pause · → = next bar · B = buy · S = sell · Delete = remove selected drawing · Ctrl+Z = undo drawing. Right-click a drawing to delete it. Fills: market orders at the revealed bar’s close (buys pay the spread, prices are bid-based); stops and targets fill on later bars
        at the level, or at the bar’s open if price gapped through it; if one bar touches both, the stop is assumed to fill first (conservative). P&L is in {ccy}{ccy !== 'USD' ? ' (quote currency)' : ''}.
      </p>
    </div>
  );
};

const REPLAY_STYLES = {
  grid: { horizontal: { color: 'rgba(148,163,184,0.06)' }, vertical: { color: 'rgba(148,163,184,0.06)' } },
  candle: {
    bar: { upColor: '#26a69a', downColor: '#ef5350', noChangeColor: '#94a3b8', upBorderColor: '#26a69a', downBorderColor: '#ef5350', upWickColor: '#26a69a', downWickColor: '#ef5350' },
    priceMark: { last: { upColor: '#26a69a', downColor: '#ef5350', line: { style: 'dashed' } } },
    tooltip: { text: { color: '#cbd5e1' } },
  },
  xAxis: { axisLine: { color: '#1e293b' }, tickText: { color: '#64748b' } },
  yAxis: { axisLine: { color: '#1e293b' }, tickText: { color: '#64748b' } },
  separator: { color: '#1e293b' },
  crosshair: { horizontal: { line: { color: '#475569' } }, vertical: { line: { color: '#475569' } } },
};

function mergeBars(a: KLineData[], b: KLineData[]): KLineData[] {
  const m = new Map<number, KLineData>();
  for (const x of a) m.set(x.timestamp, x);
  for (const x of b) m.set(x.timestamp, x);
  return Array.from(m.values()).sort((x, y) => x.timestamp - y.timestamp);
}

const EquityCurve: React.FC<{ values: number[] }> = ({ values }) => {
  const W = 300, H = 70, min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${max === min ? H / 2 : H - ((v - min) / (max - min)) * (H - 6) - 3}`).join(' ');
  const up = values[values.length - 1] >= values[0];
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16" role="img" aria-label="Equity curve"><polyline points={pts} fill="none" stroke={up ? '#10b981' : '#f43f5e'} strokeWidth="2" /></svg>;
};
