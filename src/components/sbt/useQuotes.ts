/**
 * Real last price + 24-hour change for a list of symbols, from the same live feed as the charts.
 * Refreshes on its own; a symbol without a feed simply has no quote (never a made-up number).
 */
import { useEffect, useRef, useState } from 'react';
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS } from '../chartAnalysis/fullHistoryDatafeed';

export interface Quote { price: number; changePct: number | null; digits: number; at: number }
const cache = new Map<string, Quote>();
const norm = (s: string) => ({ BTCUSD: 'BTCUSDT', ETHUSD: 'ETHUSDT', XRPUSD: 'XRPUSDT', SOLUSD: 'SOLUSDT' } as Record<string, string>)[s] || s;
const H1P = PRO_PERIODS.find((p) => p.text === '1H') || PRO_PERIODS[0];

async function load(symbol: string): Promise<Quote | null> {
  const e = CATALOG.find((c) => c.ticker === norm(symbol));
  if (!e) return null;
  const f = new FullHistoryDatafeed(() => {}); f.pageSize = 30;
  const rows = await f.getHistoryKLineData(e as any, H1P, 0, Date.now() + 60_000);
  const b = rows?.[rows.length - 1];
  if (!b || !Number.isFinite(b.close)) return null;
  const ref = rows.length > 24 ? rows[rows.length - 25] : rows[0];
  return { price: b.close, changePct: ref && ref.close ? ((b.close - ref.close) / ref.close) * 100 : null, digits: (e as any).pricePrecision ?? 2, at: Date.now() };
}

export function useQuotes(symbols: string[], active: boolean, everyMs = 30_000): Map<string, Quote> {
  const [, tick] = useState(0);
  const key = symbols.join(',');
  const ref = useRef(symbols); ref.current = symbols;
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const run = async () => {
      const list: string[] = Array.from(new Set<string>(ref.current));
      let i = 0;
      const worker = async () => {
        while (!stop && i < list.length) {
          const s = list[i++];
          const had = cache.get(s);
          if (had && Date.now() - had.at < everyMs - 2000) continue;
          try { const q = await load(s); if (q && !stop) { cache.set(s, q); tick((n) => n + 1); } } catch { /* keep the previous quote */ }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    };
    run();
    const t = window.setInterval(() => { if (document.visibilityState !== 'hidden') run(); }, everyMs);
    return () => { stop = true; window.clearInterval(t); };
  }, [key, active, everyMs]);
  return cache;
}
