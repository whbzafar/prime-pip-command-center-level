/** Data + symbol helpers shared by the Pine main chart and the Pine Editor. */
import type { DataProvider, OHLCV } from '@luxalgo/vela';
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS, type CatalogEntry } from '../chartAnalysis/fullHistoryDatafeed';

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

/** Vela data provider backed by the app's full-history feed (same data as Unlimited Charts / replay). */
export function makeProvider(): DataProvider {
  const feed = new FullHistoryDatafeed(() => {});
  return {
    async getBars(ticker, timeframe, range) {
      const entry = CATALOG.find((e) => e.ticker === ticker.replace(/^PPFX:/i, '').toUpperCase());
      const text = PERIOD_TEXT[normTf(timeframe)];
      const period = PRO_PERIODS.find((p) => p.text === text);
      if (!entry || !period) return [];
      const to = range.to ?? Date.now() + 60_000;
      let rows: any[] = [];
      for (let attempt = 0; attempt < 2 && !rows.length; attempt++) {
        try { rows = (await feed.getHistoryKLineData(entry as any, period, 0, to)) || []; } catch { rows = []; }
      }
      const bars: OHLCV[] = rows.map((r) => ({ time: r.timestamp, open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume ?? 0 }))
        .filter((b) => (range.from === undefined || b.time >= range.from) && b.time < to)
        .sort((a, b) => a.time - b.time);
      return bars.filter((b, i) => i === 0 || b.time !== bars[i - 1].time);
    },
    async listSymbols() {
      return CATALOG.map((e) => ({ ticker: e.ticker, description: e.name, type: e.market === 'forex' ? 'forex' : e.market === 'crypto' ? 'crypto' : e.market === 'stocks' ? 'stock' : e.market === 'indices' ? 'index' : 'commodity' })) as any;
    },
    async getSymbolInfo(ticker: string) {
      const e = CATALOG.find((x) => x.ticker === ticker) as CatalogEntry | undefined;
      const p = e?.pricePrecision ?? 2;
      return { ticker, description: e?.name || ticker, type: e?.market || 'forex', currency: e?.market === 'crypto' ? 'USDT' : 'USD', mintick: Number((10 ** -p).toFixed(p)), pricescale: 10 ** p, timezone: 'Etc/UTC', session: e?.market === 'crypto' ? '24x7' : '24x5' } as any;
    },
  } as DataProvider;
}

