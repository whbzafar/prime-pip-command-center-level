/** Data + symbol helpers shared by the Pine main chart and the Pine Editor. */
import type { DataProvider, OHLCV } from '@luxalgo/vela';
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS, type CatalogEntry } from '../chartAnalysis/fullHistoryDatafeed';
import { priceAlerts } from './priceAlerts';

export const titleOf = (src: string) => (src.match(/(?:indicator|strategy|library)\s*\(\s*(?:title\s*=\s*)?["']([^"']+)["']/)?.[1] || 'Untitled script').slice(0, 60);

// ───────────────────────────── symbol / timeframe mapping
const ALIAS: Record<string, string> = { SPX500: 'US500', NAS100: 'US100', BRENT: 'UKOIL' };
export const catalogFor = (sym: string) => { const c = sym.replace(/^[A-Z_]+:/, '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return CATALOG.find((e) => e.ticker === (ALIAS[c] || c)); };
/** TradingView interval (1, 5, 60, 240, D, W, M) → Vela timeframe (same notation). */
export const velaTf = (iv: string) => ({ '1': '1', '3': '3', '5': '5', '15': '15', '30': '30', '60': '60', '120': '120', '180': '180', '240': '240', D: 'D', '1D': 'D', W: 'W', '1W': 'W', M: 'M', '1M': 'M' } as Record<string, string>)[iv] || '60';
export const PERIOD_TEXT: Record<string, string> = { '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m', '60': '1H', '120': '2H', '240': '4H', D: 'D', W: 'W', M: 'M' };
const normTf = (tf: string) => {
  const t = String(tf).trim();
  const m = t.match(/^(\d+)\s*([mhdwM]?)$/);
  if (m) { const n = Number(m[1]); const u = m[2]; if (u === 'h') return String(n * 60); if (u === 'd') return 'D'; if (u === 'w') return 'W'; if (u === 'M') return 'M'; return String(n); }
  return t.toUpperCase().replace(/^1/, '');
};

/** Where each instrument's data really comes from (shown on the chart instead of a generic label). */
export const sourceOf = (ticker: string): 'binance' | 'dukascopy' => (CATALOG.find((e) => e.ticker === ticker)?.binance ? 'binance' : 'dukascopy');
export const SOURCE_LABEL = { dukascopy: 'Dukascopy', binance: 'Binance' } as const;
/** The chart symbol for a ticker, pinned to its real venue, e.g. DUKASCOPY:EURUSD, BINANCE:BTCUSDT. */
export const venueSymbol = (ticker: string) => `${sourceOf(ticker).toUpperCase()}:${ticker}`;

/** Vela data provider backed by the app's full-history feed (same data as Unlimited Charts / replay). */
export function makeProvider(source: 'dukascopy' | 'binance' = 'dukascopy'): DataProvider {
  const fetchBars = async (ticker: string, timeframe: string, range: any, onBatch?: (bars: OHLCV[]) => void, signal?: AbortSignal) => {
    const entry = CATALOG.find((e) => e.ticker === ticker.replace(/^[A-Z]+:/i, '').toUpperCase());
    const text = PERIOD_TEXT[normTf(timeframe)];
    const period = PRO_PERIODS.find((p) => p.text === text);
    if (!entry || !period) return [];
    let cursor = range.to ?? Date.now() + 60_000;
    const want = range.limit ?? 0;
    const all = new Map<number, OHLCV>();
    const sorted = () => {
      let bars = [...all.values()].filter((b) => range.from === undefined || b.time >= range.from).sort((a, b) => a.time - b.time);
      if (want > 0 && bars.length > want) bars = bars.slice(-want);
      return bars;
    };
    // A fresh feed per request (the feed keeps paging state). Big pages: 2,000 bars per request.
    for (let page = 0; page < 12 && !signal?.aborted; page++) {
      const feed = new FullHistoryDatafeed(() => {});
      feed.pageSize = page === 0 ? 1500 : 2500;
      let rows: any[] = [];
      for (let attempt = 0; attempt < 2 && !rows.length; attempt++) {
        try { rows = (await feed.getHistoryKLineData(entry as any, period, 0, cursor)) || []; } catch { rows = []; }
      }
      if (!rows.length) break;
      for (const r of rows) if (r.timestamp < (range.to ?? Infinity) + 1) all.set(r.timestamp, { time: r.timestamp, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume ?? 0 });
      onBatch?.(sorted());
      const oldest = rows[0].timestamp;
      if (oldest >= cursor) break; // no progress
      cursor = oldest - 1;
      const coveredFrom = range.from !== undefined && oldest <= range.from;
      const enough = want > 0 && all.size >= want;
      if (coveredFrom || enough || (range.from === undefined && !want)) break;
    }
    return sorted();
  };
  return {
    info: () => ({ name: source, displayName: SOURCE_LABEL[source], capabilities: {} }) as any,
    getBars: (ticker, timeframe, range) => fetchBars(ticker, timeframe, range),
    /** Paints the first page at once, then fills the rest of the history behind it. */
    getBarsProgressive: (ticker: string, timeframe: string, range: any, onBatch: (bars: OHLCV[]) => void, opts?: { signal?: AbortSignal }) => fetchBars(ticker, timeframe, range, onBatch, opts?.signal),
    /** True live stream: Binance WebSocket for crypto, a 5-second poll for everything else. Also feeds price alerts. */
    subscribe(ticker: string, timeframe: string, onBar: (bar: OHLCV) => void) {
      const t = ticker.replace(/^[A-Z]+:/i, '').toUpperCase();
      const entry = CATALOG.find((e) => e.ticker === t);
      const period = PRO_PERIODS.find((p) => p.text === PERIOD_TEXT[normTf(timeframe)]);
      if (!entry || !period) return () => {};
      const feed = new FullHistoryDatafeed(() => {});
      feed.subscribe(entry as any, period, (k: any) => {
        if (!k) return;
        onBar({ time: k.timestamp, open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume ?? 0 });
        try { priceAlerts.tick(t, k.close); } catch { /* ignore */ }
      });
      return () => { try { feed.unsubscribe(entry as any, period); feed.destroy(); } catch { /* ignore */ } };
    },
    async listSymbols() {
      return CATALOG.filter((e) => (e.binance ? 'binance' : 'dukascopy') === source).map((e) => ({ ticker: e.ticker, description: e.name, type: e.market === 'forex' ? 'forex' : e.market === 'crypto' ? 'crypto' : e.market === 'stocks' ? 'stock' : e.market === 'indices' ? 'index' : 'commodity' })) as any;
    },
    async getSymbolInfo(ticker: string) {
      const e = CATALOG.find((x) => x.ticker === ticker.replace(/^[A-Z]+:/i, '').toUpperCase()) as CatalogEntry | undefined;
      const p = e?.pricePrecision ?? 2;
      return { ticker, exchange: SOURCE_LABEL[source], description: e?.name || ticker, type: e?.market || 'forex', currency: e?.market === 'crypto' ? 'USDT' : 'USD', mintick: Number((10 ** -p).toFixed(p)), pricescale: 10 ** p, timezone: 'Etc/UTC', session: e?.market === 'crypto' ? '24x7' : '24x5' } as any;
    },
  } as DataProvider;
}

