/**
 * Tools laid over the TradingView chart's own top toolbar (TradingView's embed cannot be changed
 * from outside, so these sit in the empty part of its toolbar):
 *  · live countdown to the current candle's close
 *  · Alert: create / edit / delete price alerts — the same alerts as the Pro chart (they fire with
 *    the chosen alert sound + a notification on either chart).
 */
import React, { useEffect, useState } from 'react';
import { Bell, BellOff, BellPlus, RotateCcw, Timer, Trash2, X } from 'lucide-react';
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
      try { const rows = await new FullHistoryDatafeed(() => {}).getHistoryKLineData(e as any, PRO_PERIODS[0], 0, Date.now() + 60_000); const b = rows?.[rows.length - 1]; if (b && !stop) setLive(b.close); } catch { /* ignore */ }
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

  return (
    <>
      <div className="absolute top-[5px] right-[92px] z-30 hidden md:flex items-center gap-1.5" data-testid="tv-chart-tools">
        <div title="Time left until this candle closes" data-testid="tv-countdown"
          className={`flex items-center gap-1.5 h-[28px] pl-2 pr-2.5 rounded-md border text-[12px] font-semibold ${countdown.closed ? 'border-slate-700 bg-[#1e222d] text-slate-300' : 'border-[#2962FF]/60 bg-[#2962FF]/15 text-white'}`}>
          <Timer className="w-3.5 h-3.5 opacity-80" />
          <span className="text-[10.5px] uppercase tracking-wide opacity-70">{countdown.label}</span>
          <span className="font-mono tabular-nums">{countdown.text}</span>
          {!countdown.closed && <span className="w-10 h-[3px] rounded bg-white/15 overflow-hidden"><span className="block h-full bg-[#2962FF]" style={{ width: `${countdown.progressPercent || 0}%` }} /></span>}
        </div>
        {ticker && (
          <button type="button" onClick={() => setOpen((v) => !v)} data-testid="tv-alert-btn" title="Price alerts"
            className={`relative flex items-center gap-1.5 h-[28px] px-2.5 rounded-md border text-[12px] font-semibold cursor-pointer ${open ? 'border-orange-400 bg-orange-500/20 text-white' : 'border-slate-700 bg-[#1e222d] text-slate-200 hover:text-white hover:border-slate-500'}`}>
            <BellPlus className="w-3.5 h-3.5" />Alert
            {list.filter((a) => !a.triggeredAt).length > 0 && <span className="ml-0.5 px-1 rounded bg-orange-500 text-[10px] text-white">{list.filter((a) => !a.triggeredAt).length}</span>}
          </button>
        )}
      </div>

      {open && ticker && (
        <div className="absolute top-[40px] right-[92px] z-40 w-[290px] rounded-xl border border-slate-700 bg-[#1e222d] shadow-2xl text-[12px] text-slate-200" data-testid="tv-alert-panel">
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
