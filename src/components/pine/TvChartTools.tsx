/**
 * Tools laid over the TradingView chart's own top toolbar (TradingView's embed cannot be changed
 * from outside, so these sit in the empty part of its toolbar):
 *  · live countdown to the current candle's close
 *  · Alert: create / edit / delete price alerts — the same alerts as the Pro chart (they fire with
 *    the chosen alert sound + a notification on either chart).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BellPlus, GripVertical, Plus, RotateCcw, Timer, Trash2, X } from 'lucide-react';
import { catalogFor } from './pineData';
import { priceAlerts, type AlertCondition, type PriceAlert } from './priceAlerts';
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS } from '../chartAnalysis/fullHistoryDatafeed';

export const TvChartTools: React.FC<{ symbol: string; countdown: { label: string; text: string; closed?: boolean; progressPercent?: number; session?: string } }> = ({ symbol, countdown }) => {
  const entry = catalogFor(symbol);
  const ticker = entry?.ticker || '';
  const digits = entry?.pricePrecision ?? 2;
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<PriceAlert[]>(() => priceAlerts.forTicker(ticker));
  const [price, setPrice] = useState('');
  const [cond, setCond] = useState<AlertCondition>('cross');
  const [live, setLive] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { setList(priceAlerts.forTicker(ticker)); return priceAlerts.subscribe(() => setList(priceAlerts.forTicker(ticker))); }, [ticker]);
  useEffect(() => { const f = (e: any) => { setToast(e.detail.title); window.setTimeout(() => setToast(null), 7000); }; window.addEventListener('ppfx:price-alert', f); return () => window.removeEventListener('ppfx:price-alert', f); }, []);
  // live price for the alert form (same feed that checks the alerts)
  useEffect(() => {
    if (!open || !ticker) return;
    let stop = false;
    const e = CATALOG.find((c) => c.ticker === ticker);
    const get = async () => {
      const lp = priceAlerts.lastPrice(ticker);
      if (lp !== undefined) { setLive(lp); return; }
      for (const per of [PRO_PERIODS[0], PRO_PERIODS.find((x) => x.text === '1H') || PRO_PERIODS[0]]) {
        try { const f = new FullHistoryDatafeed(() => {}); f.pageSize = 3; const rows = await f.getHistoryKLineData(e as any, per, 0, Date.now() + 60_000); const b = rows?.[rows.length - 1]; if (b) { if (!stop) setLive(b.close); return; } } catch { /* try the next timeframe */ }
      }
    };
    get();
    const t = window.setInterval(get, 5000);
    return () => { stop = true; window.clearInterval(t); };
  }, [open, ticker]);
  useEffect(() => { if (open && live !== null && !price) setPrice(live.toFixed(digits)); }, [open, live, digits, price]);

  const create = () => {
    const v = Number(price);
    if (!ticker || !Number.isFinite(v) || v <= 0) return;
    priceAlerts.add(ticker, Number(v.toFixed(digits)), cond);
    setPrice('');
  };

  // Price-scale chip: sits on the right price scale like the Pro chart's countdown. TradingView's
  // chart is a sealed frame, so the app cannot read where the price label is; the chip is dragged
  // once to sit beside it and remembers its place.
  const [chipY, setChipY] = useState<number>(() => { try { return Number(localStorage.getItem('ppfx_tv_chip_y')) || 46; } catch { return 46; } });
  const drag = useRef<{ startY: number; base: number; moved: boolean } | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const onDown = (e: React.PointerEvent) => { drag.current = { startY: e.clientY, base: chipY, moved: false }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const h = chipRef.current?.parentElement?.clientHeight || 600;
    const pct = Math.min(88, Math.max(8, d.base + ((e.clientY - d.startY) / h) * 100));
    if (Math.abs(e.clientY - d.startY) > 3) d.moved = true;
    setChipY(pct);
  };
  const onUp = () => { if (drag.current) { try { localStorage.setItem('ppfx_tv_chip_y', String(chipY)); } catch { /* storage blocked */ } } drag.current = null; };

  return (
    <>
      <div ref={chipRef} data-testid="tv-scale-chip" style={{ top: `${chipY}%` }}
        className="absolute right-[3px] z-30 flex flex-col items-stretch w-[62px] rounded-[4px] overflow-hidden shadow-lg border border-[#2962FF]/70 select-none">
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} title="Time left until this candle closes — drag up or down to sit beside the price"
          className={`flex items-center justify-center gap-0.5 h-[19px] text-[11px] font-mono tabular-nums font-semibold cursor-ns-resize touch-none ${countdown.closed ? 'bg-[#2a2e39] text-slate-300' : 'bg-[#2962FF] text-white'}`}>
          <GripVertical className="w-2.5 h-2.5 opacity-60" />{countdown.text}
        </div>
        {ticker && (
          <button type="button" onClick={() => setOpen((v) => !v)} data-testid="tv-scale-plus" title="Add a price alert" aria-label="Add a price alert"
            className="flex items-center justify-center gap-0.5 h-[18px] bg-[#131722] hover:bg-[#1e222d] text-[10px] font-semibold text-slate-200 hover:text-white cursor-pointer">
            <Plus className="w-3 h-3" />Alert
          </button>
        )}
      </div>

      <div className="absolute top-[5px] right-[92px] z-30 hidden md:flex items-center gap-1.5" data-testid="tv-chart-tools">
        {ticker && (
          <button type="button" onClick={() => setOpen((v) => !v)} data-testid="tv-alert-btn" title="Price alerts"
            className={`relative flex items-center gap-1.5 h-[28px] px-2.5 rounded-md border text-[12px] font-semibold cursor-pointer ${open ? 'border-orange-400 bg-orange-500/20 text-white' : 'border-slate-700 bg-[#1e222d] text-slate-200 hover:text-white hover:border-slate-500'}`}>
            <BellPlus className="w-3.5 h-3.5" />Alert
            {list.filter((a) => !a.triggeredAt).length > 0 && <span className="ml-0.5 px-1 rounded bg-orange-500 text-[10px] text-white">{list.filter((a) => !a.triggeredAt).length}</span>}
          </button>
        )}
      </div>

      {open && ticker && (
        <div className="absolute top-[40px] right-2 md:right-[92px] z-40 w-[290px] max-w-[calc(100%-16px)] rounded-xl border border-slate-700 bg-[#1e222d] shadow-2xl text-[12px] text-slate-200" data-testid="tv-alert-panel">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700"><Bell className="w-4 h-4 text-orange-300" /><b className="text-slate-50">Alert on {ticker}</b><button type="button" onClick={() => setOpen(false)} className="ml-auto p-0.5 text-slate-400 hover:text-white cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button></div>
          <div className="p-3 space-y-2">
            <label className="block text-[10.5px] text-slate-400">Price {live !== null && <span className="text-slate-500">· live {live.toFixed(digits)}</span>}
              <input type="number" step={10 ** -digits} value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') create(); }} data-testid="tv-alert-price"
                className="mt-0.5 w-full bg-[#131722] border border-slate-600 rounded-md px-2 py-1.5 text-slate-100 font-mono" />
            </label>
            <div className="flex gap-1.5">
              <select value={cond} onChange={(e) => setCond(e.target.value as AlertCondition)} className="flex-1 bg-[#131722] border border-slate-600 rounded-md px-2 py-1.5 text-slate-100 cursor-pointer">
                <option value="cross">Crossing</option><option value="above">Crossing up</option><option value="below">Crossing down</option>
              </select>
              <button type="button" onClick={create} data-testid="tv-alert-create" className="px-3 py-1.5 rounded-md bg-[#2962FF] text-white font-semibold hover:brightness-110 cursor-pointer">Create</button>
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto border-t border-slate-700">
            {!list.length && <div className="px-3 py-3 text-slate-500 text-center">No alerts on {ticker} yet.</div>}
            {list.map((a) => (
              <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 last:border-0">
                {a.triggeredAt ? <BellOff className="w-3.5 h-3.5 text-slate-500" /> : <Bell className="w-3.5 h-3.5 text-orange-300" />}
                <span className="font-mono text-slate-100">{a.condition === 'above' ? '↑' : a.condition === 'below' ? '↓' : '↕'} {a.price}</span>
                <span className="text-[10.5px] text-slate-500">{a.triggeredAt ? 'triggered' : 'active'}</span>
                <span className="ml-auto flex items-center gap-1">
                  {a.triggeredAt && <button type="button" title="Re-arm" onClick={() => priceAlerts.rearm(a.id)} className="p-1 rounded hover:bg-[#2a2e39] cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /></button>}
                  <button type="button" title="Delete" onClick={() => priceAlerts.remove(a.id)} className="p-1 rounded hover:bg-[#2a2e39] text-rose-300 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </span>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 text-[10.5px] text-slate-500 border-t border-slate-700">Same alerts as the Pro chart — they show there as lines you can drag. Checked against the live interbank price, which can differ from {`TradingView's`} broker feed by a pip.</div>
        </div>
      )}

      {toast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-lg bg-orange-500 text-white px-3 py-2 text-[12.5px] font-semibold shadow-2xl">
          <Bell className="w-4 h-4" />{toast}<button type="button" onClick={() => setToast(null)} className="ml-1 p-0.5 rounded hover:bg-black/20 cursor-pointer" aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </>
  );
};

export default TvChartTools;
