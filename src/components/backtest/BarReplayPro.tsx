import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { init, dispose, type Chart, type KLineData } from 'klinecharts';
import { ChevronsRight, Download, Pause, Play, SkipForward, StepForward, Target, Trash2, X } from 'lucide-react';
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS, type CatalogEntry } from '../chartAnalysis/fullHistoryDatafeed';

/**
 * BAR REPLAY PRO — practise and backtest on real historical bars.
 * Pick any symbol/timeframe and a start date (back to the instrument's first data). The chart
 * hides the future; step or play bar by bar, trade with SL/TP, and get full statistics.
 * Data: the same full-history feed as Unlimited Charts (Dukascopy · Yahoo · Binance).
 */

type Side = 1 | -1;
interface Position { id: number; side: Side; entry: number; sl: number | null; tp: number | null; lots: number; openTime: number; overlays: string[] }
interface ClosedTrade extends Omit<Position, 'overlays'> { exit: number; exitTime: number; reason: 'TP' | 'SL' | 'Manual' | 'End'; pnl: number; r: number | null }

const PERIOD_MS: Record<string, number> = { '1m': 60e3, '3m': 180e3, '5m': 300e3, '15m': 900e3, '30m': 1800e3, '1H': 3600e3, '2H': 7200e3, '4H': 14400e3, D: 864e5, W: 6048e5, M: 2592e6 };
const SPEEDS = [0.5, 1, 2, 4, 8, 16, 32];

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
  const [lots, setLots] = useState(0.1);
  const [slPips, setSlPips] = useState(20);
  const [tpPips, setTpPips] = useState(40);
  const [spreadPips, setSpreadPips] = useState(1);
  const [positions, setPositions] = useState<Position[]>([]);
  const [closed, setClosed] = useState<ClosedTrade[]>([]);
  const [source, setSource] = useState('');
  const chartHost = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const feedRef = useRef<FullHistoryDatafeed | null>(null);
  const loadingMore = useRef(false);
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
    chart?.createIndicator('MA', false, { id: 'candle_pane' });
    chart?.createIndicator('VOL');
    feedRef.current = new FullHistoryDatafeed((s) => { if (s.state === 'error') setError(s.message || 'Data error'); if (s.source) setSource(s.source); });
    const ro = new ResizeObserver(() => chart?.resize());
    ro.observe(host);
    return () => { ro.disconnect(); dispose(host); chartRef.current = null; feedRef.current?.destroy(); };
  }, []);

  useEffect(() => { chartRef.current?.setPriceVolumePrecision(entry.pricePrecision ?? 2, entry.volumePrecision ?? 0); }, [entry]);

  // ── data loading: context before the start date + future bars after it (hidden until replayed)
  const fetchBefore = useCallback(async (to: number) => (await feedRef.current!.getHistoryKLineData(entry, period, 0, to)) || [], [entry, period]);

  const load = useCallback(async () => {
    if (!feedRef.current) return;
    setLoading(true); setError(null); setPlaying(false);
    for (const p of posRef.current) p.overlays.forEach((id) => chartRef.current?.removeOverlay(id));
    setPos([]); closedRef.current = []; setClosed([]);
    try {
      const start = new Date(startDate + 'Z').getTime();
      const pMs = PERIOD_MS[periodText];
      const context = await fetchBefore(start);
      let future: KLineData[] = [];
      let to = start;
      for (let i = 0; i < 6 && future.length < 300 && to < Date.now(); i++) {
        to = Math.min(Date.now() + pMs, to + 500 * pMs);
        const chunk = await fetchBefore(to);
        future = mergeBars(future, chunk.filter((b) => b.timestamp >= start));
      }
      const all = mergeBars(context, future);
      if (!all.length) throw new Error('No historical data for this symbol/timeframe at that date. Try a later start date.');
      const startIdx = Math.max(0, all.findIndex((b) => b.timestamp >= start) - 1);
      barsRef.current = all;
      setBars(all);
      setCur(startIdx < 0 ? all.length - 1 : startIdx);
      chartRef.current?.applyNewData(all.slice(0, (startIdx < 0 ? all.length - 1 : startIdx) + 1));
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, periodText, fetchBefore]);

  useEffect(() => { load(); /* reload when symbol/timeframe change */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, periodText]);

  // Fetch more future bars when the replay approaches the end of what is loaded.
  useEffect(() => {
    if (loadingMore.current || !bars.length || bars.length - cursor > 60) return;
    const last = bars[bars.length - 1].timestamp;
    if (last > Date.now() - PERIOD_MS[periodText]) return;
    loadingMore.current = true;
    fetchBefore(Math.min(Date.now() + PERIOD_MS[periodText], last + 500 * PERIOD_MS[periodText]))
      .then((chunk) => setBars((prev) => { const m = mergeBars(prev, chunk.filter((b) => b.timestamp > last)); barsRef.current = m; return m; }))
      .finally(() => { loadingMore.current = false; });
  }, [cursor, bars, periodText, fetchBefore]);

  // ── trading engine
  const lastBar = bars[cursor];
  const addLines = (p: Omit<Position, 'overlays'>): string[] => {
    const c = chartRef.current;
    if (!c || !lastBar) return [];
    const mk = (value: number, color: string) => c.createOverlay({ name: 'horizontalStraightLine', lock: true, points: [{ timestamp: lastBar.timestamp, value }], styles: { line: { color, size: 1, style: 'dashed' as any } } }) as string;
    return [mk(p.entry, '#38bdf8'), p.sl !== null ? mk(p.sl, '#f43f5e') : '', p.tp !== null ? mk(p.tp, '#10b981') : ''].filter(Boolean);
  };

  const open = (side: Side) => {
    if (!lastBar) return;
    const spread = spreadPips * pip;
    const price = side > 0 ? lastBar.close + spread : lastBar.close; // data is bid-based: buys pay the spread
    const p: Omit<Position, 'overlays'> = {
      id: seq.current++, side, entry: price, lots,
      sl: slPips > 0 ? price - side * slPips * pip : null,
      tp: tpPips > 0 ? price + side * tpPips * pip : null,
      openTime: lastBar.timestamp,
    };
    setPos([...posRef.current, { ...p, overlays: addLines(p) }]);
  };

  const closePos = (pos: Position, exit: number, reason: ClosedTrade['reason'], time: number) => {
    pos.overlays.forEach((id) => chartRef.current?.removeOverlay(id));
    const pnl = calcPnl(entry, pos.side, pos.entry, exit, pos.lots);
    const risk = pos.sl !== null ? Math.abs(pos.entry - pos.sl) : 0;
    const r = risk > 0 ? ((exit - pos.entry) * pos.side) / risk : null;
    const { overlays: _o, ...rest } = pos;
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
    const id = setInterval(step, Math.max(30, 1000 / speed));
    return () => clearInterval(id);
  }, [playing, speed, step]);

  // Keyboard: Space play/pause · → step · B buy · S sell
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(); }
      else if (e.key.toLowerCase() === 'b') open(1);
      else if (e.key.toLowerCase() === 's') open(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

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

  const exportCsv = () => {
    const rows = [['#', 'Side', 'Lots', 'Open time (UTC)', 'Entry', 'SL', 'TP', 'Close time (UTC)', 'Exit', 'Reason', `P&L (${ccy})`, 'R'],
      ...closed.map((t, i) => [i + 1, t.side > 0 ? 'BUY' : 'SELL', t.lots, new Date(t.openTime).toISOString(), t.entry, t.sl ?? '', t.tp ?? '', new Date(t.exitTime).toISOString(), t.exit, t.reason, t.pnl.toFixed(2), t.r?.toFixed(2) ?? ''])];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `bar-replay-${ticker}-${periodText}.csv`; a.click();
  };

  const drawTools: Array<[string, string]> = [['segment', 'Trend line'], ['rayLine', 'Ray'], ['horizontalStraightLine', 'Horizontal'], ['verticalStraightLine', 'Vertical'], ['parallelStraightLine', 'Channel'], ['fibonacciLine', 'Fibonacci'], ['priceLine', 'Price label'], ['simpleAnnotation', 'Note']];
  const indicators = ['MA', 'EMA', 'BOLL', 'SAR', 'RSI', 'MACD', 'KDJ', 'CCI'];
  const progress = bars.length ? Math.round((cursor / Math.max(1, bars.length - 1)) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 flex flex-wrap items-end gap-3">
        <label className="text-[10px] font-mono-code uppercase text-slate-500 flex flex-col gap-1">Symbol
          <input list="replay-symbols" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onBlur={(e) => { if (!CATALOG.some((c) => c.ticker === e.target.value.toUpperCase())) setTicker('XAUUSD'); }}
            className="w-32 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-slate-100 normal-case" />
          <datalist id="replay-symbols">{CATALOG.map((c) => <option key={c.ticker} value={c.ticker}>{c.name}</option>)}</datalist>
        </label>
        <label className="text-[10px] font-mono-code uppercase text-slate-500 flex flex-col gap-1">Timeframe
          <select value={periodText} onChange={(e) => setPeriodText(e.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-slate-100">
            {PRO_PERIODS.map((p) => <option key={p.text} value={p.text}>{p.text}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-mono-code uppercase text-slate-500 flex flex-col gap-1">Start (UTC)
          <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-slate-100" />
        </label>
        <button type="button" onClick={load} disabled={loading} className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-[12px] font-bold text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50 cursor-pointer">
          {loading ? 'Loading…' : 'Load replay'}
        </button>
        <div className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={() => setPlaying((p) => !p)} title="Play / pause (Space)" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 cursor-pointer">{playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
          <button type="button" onClick={step} title="Next bar (→)" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 cursor-pointer"><StepForward className="w-4 h-4" /></button>
          <button type="button" onClick={() => { for (let i = 0; i < 10; i++) step(); }} title="Forward 10 bars" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 cursor-pointer"><ChevronsRight className="w-4 h-4" /></button>
          <button type="button" onClick={() => { for (let i = 0; i < 100; i++) step(); }} title="Forward 100 bars" className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 hover:border-cyan-500/50 cursor-pointer"><SkipForward className="w-4 h-4" /></button>
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Replay speed" className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[12px] text-slate-100">
            {SPEEDS.map((s) => <option key={s} value={s}>{s} bar/s</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono-code">
        <span className="text-slate-500 uppercase mr-1">Draw</span>
        {drawTools.map(([n, l]) => <button key={n} type="button" onClick={() => chartRef.current?.createOverlay(n)} className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 cursor-pointer">{l}</button>)}
        <button type="button" onClick={() => { chartRef.current?.removeOverlay(); setPos(posRef.current.map((p) => ({ ...p, overlays: addLines(p) }))); }} className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-rose-300 hover:border-rose-500/40 cursor-pointer flex items-center gap-1"><Trash2 className="w-3 h-3" />Clear drawings</button>
        <span className="text-slate-500 uppercase mx-1">Indicators</span>
        {indicators.map((n) => (
          <button key={n} type="button" onClick={() => (['MA', 'EMA', 'BOLL', 'SAR'].includes(n) ? chartRef.current?.createIndicator(n, true, { id: 'candle_pane' }) : chartRef.current?.createIndicator(n))}
            className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 cursor-pointer">{n}</button>
        ))}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-3">
        <div className="rounded-2xl border border-slate-800 bg-[#151517] overflow-hidden">
          <div className="flex items-center gap-3 px-3 py-1.5 border-b border-slate-800 text-[10.5px] font-mono-code text-slate-400">
            <span className="text-slate-100 font-bold">{ticker}</span><span>{periodText}</span>
            {lastBar && <span>Bar time {new Date(lastBar.timestamp).toISOString().replace('T', ' ').slice(0, 16)} UTC · O {lastBar.open.toFixed(entry.pricePrecision ?? 2)} H {lastBar.high.toFixed(entry.pricePrecision ?? 2)} L {lastBar.low.toFixed(entry.pricePrecision ?? 2)} C <b className="text-slate-100">{lastBar.close.toFixed(entry.pricePrecision ?? 2)}</b></span>}
            <span className="ml-auto">{source}</span>
          </div>
          {error && <div className="px-3 py-2 text-[12px] text-rose-300 bg-rose-500/10 border-b border-rose-500/20">{error}</div>}
          <div ref={chartHost} className="h-[560px]" />
          <div className="h-1 bg-slate-800"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 space-y-2.5">
            <div className="text-[10px] font-mono-code uppercase tracking-widest text-cyan-400">Order ticket</div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-code uppercase text-slate-500">
              <label className="flex flex-col gap-1">Lots<input type="number" min={0.01} step={0.01} value={lots} onChange={(e) => setLots(Math.max(0.01, Number(e.target.value)))} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[12px]" /></label>
              <label className="flex flex-col gap-1">Spread (pips)<input type="number" min={0} step={0.1} value={spreadPips} onChange={(e) => setSpreadPips(Math.max(0, Number(e.target.value)))} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[12px]" /></label>
              <label className="flex flex-col gap-1">Stop loss (pips)<input type="number" min={0} value={slPips} onChange={(e) => setSlPips(Math.max(0, Number(e.target.value)))} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[12px]" /></label>
              <label className="flex flex-col gap-1">Take profit (pips)<input type="number" min={0} value={tpPips} onChange={(e) => setTpPips(Math.max(0, Number(e.target.value)))} className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[12px]" /></label>
            </div>
            <div className="text-[10px] font-mono-code text-slate-500">1 pip = {pip} · contract {contractSize(entry).toLocaleString()} units/lot · 0 = no SL/TP</div>
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
                  <span className={`ml-auto ${fl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fl >= 0 ? '+' : ''}{fmt(fl)} {ccy}</span>
                  <button type="button" aria-label="Close position" onClick={() => { closePos(p, lastBar.close, 'Manual', lastBar.timestamp); setPos(posRef.current.filter((x) => x.id !== p.id)); }} className="text-slate-500 hover:text-white cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 space-y-2">
            <div className="flex items-center gap-2"><Target className="w-3.5 h-3.5 text-cyan-400" /><span className="text-[10px] font-mono-code uppercase tracking-widest text-cyan-400">Performance</span>
              <label className="ml-auto text-[10px] font-mono-code text-slate-500 flex items-center gap-1">Start balance<input type="number" value={startBalance} onChange={(e) => setStartBalance(Math.max(1, Number(e.target.value)))} className="w-20 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-100 text-[11px]" /></label>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono-code">
              {([
                ['Balance', `${fmt(startBalance + stats.net)} ${ccy}`],
                ['Equity', `${fmt(startBalance + stats.net + floating)} ${ccy}`],
                ['Net P&L', `${stats.net >= 0 ? '+' : ''}${fmt(stats.net)}`],
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
        Keyboard: Space = play/pause · → = next bar · B = buy · S = sell. Fills: market orders at the revealed bar’s close (buys pay the spread, prices are bid-based); stops and targets fill on later bars
        at the level, or at the bar’s open if price gapped through it; if one bar touches both, the stop is assumed to fill first (conservative). P&L is in {ccy}{ccy !== 'USD' ? ' (quote currency)' : ''}.
      </p>
    </div>
  );
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
