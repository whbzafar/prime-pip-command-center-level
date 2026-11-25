/**
 * One header bar above the TradingView chart: pair search, the timeframe list (with a ▾ arrow for the rest)
 * and the live bar-close timer. TradingView's embedded chart cannot report a timeframe chosen inside it, so
 * the timeframe is chosen HERE and drives both the chart and the timer — they cannot disagree.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, Timer } from 'lucide-react';

export const TV_TIMEFRAMES: Array<[string, string]> = [['1', '1m'], ['3', '3m'], ['5', '5m'], ['15', '15m'], ['30', '30m'], ['60', '1h'], ['120', '2h'], ['180', '3h'], ['240', '4h'], ['D', 'D'], ['W', 'W'], ['M', 'M']];
const QUICK = ['1', '5', '15', '30', '60', '240', 'D', 'W'];

export const TvHeaderBar: React.FC<{
  symbol: string; interval: string; onInterval: (iv: string) => void; onSearch: (q: string) => void; symbols: string[];
  countdown: { text: string; label: string; closed?: boolean; session?: string; progressPercent?: number }; showTf: boolean;
}> = ({ symbol, interval, onInterval, onSearch, symbols, countdown, showTf }) => {
  const [q, setQ] = useState('');
  const [more, setMore] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!more) return;
    const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setMore(false); };
    document.addEventListener('mousedown', f); return () => document.removeEventListener('mousedown', f);
  }, [more]);
  const quick = QUICK.includes(interval) ? QUICK : [...QUICK, interval];
  const labelOf = (id: string) => (TV_TIMEFRAMES.find((t) => t[0] === id) || [id, id])[1];
  const btn = (on: boolean) => `h-[28px] min-w-[32px] px-2 rounded-md text-[12.5px] font-semibold cursor-pointer transition-colors ${on ? 'bg-[#2962FF] text-white' : 'text-slate-300 hover:bg-[#2a2e39] hover:text-white'}`;
  return (
    <div data-testid="tv-header-bar" className="shrink-0 flex items-center gap-2 flex-wrap px-2 py-1.5 bg-[#131722] border-b border-[#2a2e39] relative z-20">
      <form onSubmit={(e) => { e.preventDefault(); const v = q.trim(); if (v) { onSearch(v); setQ(''); } }} className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-[7px]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} list="ppfx-tv-symbols" autoComplete="off" spellCheck={false} placeholder={symbol} data-testid="tv-header-search" aria-label="Search pair"
          className="h-[28px] w-[130px] sm:w-[160px] pl-7 pr-2 rounded-md bg-[#1e222d] border border-[#2a2e39] text-[12.5px] font-semibold text-slate-100 placeholder:text-slate-200 uppercase outline-none focus:border-[#2962FF]" />
        <datalist id="ppfx-tv-symbols">{symbols.map((s) => <option key={s} value={s} />)}</datalist>
      </form>
      <span className="hidden md:inline text-[13px] font-bold text-slate-100 tracking-wide">{symbol}</span>
      {showTf && (
        <div ref={box} className="relative flex items-center gap-0.5" role="radiogroup" aria-label="Timeframe" data-testid="tv-header-tf">
          {quick.map((id) => <button key={id} type="button" role="radio" aria-checked={id === interval} onClick={() => onInterval(id)} data-testid={`tv-hdr-tf-${labelOf(id)}`} className={btn(id === interval)}>{labelOf(id)}</button>)}
          <button type="button" onClick={() => setMore((v) => !v)} aria-label="More timeframes" data-testid="tv-hdr-tf-more" className={`${btn(false)} flex items-center justify-center px-1.5`}><ChevronDown className="w-4 h-4" /></button>
          {more && (
            <div className="absolute left-0 top-[32px] z-40 grid grid-cols-3 gap-1 p-1.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] shadow-2xl min-w-[150px]" data-testid="tv-hdr-tf-menu">
              {TV_TIMEFRAMES.map(([id, l]) => <button key={id} type="button" onClick={() => { onInterval(id); setMore(false); }} className={btn(id === interval)}>{l}</button>)}
            </div>
          )}
        </div>
      )}
      {showTf && <div className={`ml-auto flex items-center gap-1.5 h-[28px] px-2.5 rounded-md text-[12.5px] font-mono tabular-nums font-bold ${countdown.closed ? 'bg-[#2a2e39] text-slate-300' : 'bg-[#2962FF]/20 text-sky-200 border border-[#2962FF]/60'}`} title={countdown.closed ? countdown.session : `Time left until the ${countdown.label} candle closes`} data-testid="tv-header-timer">
        <Timer className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-[10.5px] font-sans font-semibold opacity-80">{countdown.label} closes in</span>
        <span>{countdown.text}</span>
      </div>}
    </div>
  );
};
export default TvHeaderBar;
