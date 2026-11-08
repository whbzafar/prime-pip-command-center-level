/**
 * FULL-HISTORY DATAFEED for KLineChart Pro.
 *
 * Routing (all sources free, verified live):
 *  - Crypto (…USDT): Binance public market-data mirror (data-api.binance.vision) — every interval,
 *    complete history since listing, live via WebSocket (data-stream.binance.vision).
 *  - Forex, metals, energy: Dukascopy via /api/history — minute data since 2003, daily since 1973.
 *  - Indices & stocks: intraday from Dukascopy CFDs; daily/weekly/monthly from Yahoo back to the
 *    first recorded trade (S&P 500 since 1927).
 * Every request asks for "N bars before T"; the server walks back over weekends and gaps until it
 * reaches the instrument's first data, so scrolling left keeps loading until the real beginning.
 */
import type { Datafeed, DatafeedSubscribeCallback, Period, SymbolInfo } from '@klinecharts/pro';
import type { KLineData } from 'klinecharts';

type Tf = 'm1' | 'm5' | 'm15' | 'm30' | 'h1' | 'h4' | 'd1' | 'w1' | 'mn1';

export interface CatalogEntry extends SymbolInfo {
  duka?: string;   // Dukascopy instrument id (intraday + forex/metal/energy daily)
  yahoo?: string;  // Yahoo symbol (daily/weekly/monthly for indices & stocks)
  binance?: string; // Binance spot symbol
  alt?: string;     // Yahoo symbol used automatically if Dukascopy is unavailable
}

export interface FeedStatus { state: 'loading' | 'ok' | 'error' | 'start'; source: string; oldest?: number; message?: string }

const fx = (t: string, n: string): CatalogEntry => ({ ticker: t, name: n, shortName: t, market: 'forex', exchange: 'Dukascopy', pricePrecision: t.endsWith('JPY') ? 3 : 5, volumePrecision: 0, duka: t.toLowerCase(), alt: `${t}=X` });

export const CATALOG: CatalogEntry[] = [
  fx('EURUSD', 'Euro / US Dollar'), fx('GBPUSD', 'British Pound / US Dollar'), fx('USDJPY', 'US Dollar / Japanese Yen'), fx('AUDUSD', 'Australian Dollar / US Dollar'),
  fx('USDCAD', 'US Dollar / Canadian Dollar'), fx('USDCHF', 'US Dollar / Swiss Franc'), fx('NZDUSD', 'New Zealand Dollar / US Dollar'),
  fx('EURGBP', 'Euro / British Pound'), fx('EURJPY', 'Euro / Japanese Yen'), fx('GBPJPY', 'British Pound / Japanese Yen'), fx('AUDJPY', 'Australian Dollar / Yen'),
  fx('CADJPY', 'Canadian Dollar / Yen'), fx('CHFJPY', 'Swiss Franc / Yen'), fx('NZDJPY', 'New Zealand Dollar / Yen'), fx('EURAUD', 'Euro / Australian Dollar'),
  fx('EURCAD', 'Euro / Canadian Dollar'), fx('EURCHF', 'Euro / Swiss Franc'), fx('EURNZD', 'Euro / New Zealand Dollar'), fx('GBPAUD', 'Pound / Australian Dollar'),
  fx('GBPCAD', 'Pound / Canadian Dollar'), fx('GBPCHF', 'Pound / Swiss Franc'), fx('GBPNZD', 'Pound / New Zealand Dollar'), fx('AUDCAD', 'Australian / Canadian Dollar'),
  fx('AUDCHF', 'Australian Dollar / Franc'), fx('AUDNZD', 'Australian / New Zealand Dollar'), fx('CADCHF', 'Canadian Dollar / Franc'), fx('NZDCAD', 'New Zealand / Canadian Dollar'),
  fx('NZDCHF', 'New Zealand Dollar / Franc'), fx('USDMXN', 'US Dollar / Mexican Peso'), fx('USDZAR', 'US Dollar / Rand'), fx('USDTRY', 'US Dollar / Turkish Lira'),
  fx('USDSGD', 'US Dollar / Singapore Dollar'), fx('USDHKD', 'US Dollar / Hong Kong Dollar'), fx('USDNOK', 'US Dollar / Norwegian Krone'), fx('USDSEK', 'US Dollar / Swedish Krona'),
  { ticker: 'XAUUSD', name: 'Gold / US Dollar', shortName: 'XAUUSD', market: 'metals', exchange: 'Dukascopy', pricePrecision: 2, volumePrecision: 0, duka: 'xauusd', alt: 'GC=F' },
  { ticker: 'XAGUSD', name: 'Silver / US Dollar', shortName: 'XAGUSD', market: 'metals', exchange: 'Dukascopy', pricePrecision: 3, volumePrecision: 0, duka: 'xagusd', alt: 'SI=F' },
  { ticker: 'USOIL', name: 'WTI Crude Oil', shortName: 'USOIL', market: 'energy', exchange: 'Dukascopy', pricePrecision: 2, volumePrecision: 0, duka: 'lightcmdusd', alt: 'CL=F' },
  { ticker: 'UKOIL', name: 'Brent Crude Oil', shortName: 'UKOIL', market: 'energy', exchange: 'Dukascopy', pricePrecision: 2, volumePrecision: 0, duka: 'brentcmdusd', alt: 'BZ=F' },
  { ticker: 'NATGAS', name: 'Natural Gas', shortName: 'NATGAS', market: 'energy', exchange: 'Dukascopy', pricePrecision: 3, volumePrecision: 0, duka: 'gascmdusd', alt: 'NG=F' },
  { ticker: 'COPPER', name: 'High Grade Copper', shortName: 'COPPER', market: 'energy', exchange: 'Dukascopy', pricePrecision: 4, volumePrecision: 0, duka: 'coppercmdusd', yahoo: 'HG=F', alt: 'HG=F' },
  { ticker: 'US500', name: 'S&P 500', shortName: 'US500', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'usa500idxusd', yahoo: '^GSPC', alt: '^GSPC' },
  { ticker: 'US100', name: 'Nasdaq 100', shortName: 'US100', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'usatechidxusd', yahoo: '^NDX', alt: '^NDX' },
  { ticker: 'US30', name: 'Dow Jones 30', shortName: 'US30', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'usa30idxusd', yahoo: '^DJI', alt: '^DJI' },
  { ticker: 'GER40', name: 'DAX 40', shortName: 'GER40', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'deuidxeur', yahoo: '^GDAXI', alt: '^GDAXI' },
  { ticker: 'UK100', name: 'FTSE 100', shortName: 'UK100', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'gbridxgbp', yahoo: '^FTSE', alt: '^FTSE' },
  { ticker: 'JP225', name: 'Nikkei 225', shortName: 'JP225', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'jpnidxjpy', yahoo: '^N225', alt: '^N225' },
  { ticker: 'FRA40', name: 'CAC 40', shortName: 'FRA40', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'fraidxeur', yahoo: '^FCHI', alt: '^FCHI' },
  { ticker: 'AUS200', name: 'ASX 200', shortName: 'AUS200', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'ausidxaud', yahoo: '^AXJO', alt: '^AXJO' },
  { ticker: 'HK50', name: 'Hang Seng', shortName: 'HK50', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'hkgidxhkd', yahoo: '^HSI', alt: '^HSI' },
  { ticker: 'DXY', name: 'US Dollar Index', shortName: 'DXY', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 3, volumePrecision: 0, duka: 'dollaridxusd', yahoo: 'DX-Y.NYB', alt: 'DX-Y.NYB' },
  { ticker: 'VIX', name: 'CBOE Volatility Index', shortName: 'VIX', market: 'indices', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: 'volidxusd', yahoo: '^VIX', alt: '^VIX' },
  ...['BTC', 'ETH', 'XRP', 'SOL', 'BNB', 'DOGE', 'ADA', 'LINK', 'AVAX', 'DOT', 'LTC', 'TRX', 'TON', 'SHIB', 'PEPE', 'SUI'].map((c) => ({
    ticker: `${c}USDT`, name: `${c} / Tether`, shortName: `${c}USDT`, market: 'crypto', exchange: 'Binance', pricePrecision: ['BTC', 'ETH', 'BNB', 'SOL', 'LTC', 'AVAX'].includes(c) ? 2 : ['SHIB', 'PEPE'].includes(c) ? 8 : 4, volumePrecision: 2, binance: `${c}USDT`,
  } as CatalogEntry)),
  ...[['AAPL', 'Apple'], ['MSFT', 'Microsoft'], ['NVDA', 'NVIDIA'], ['AMZN', 'Amazon'], ['GOOGL', 'Alphabet'], ['META', 'Meta Platforms'], ['TSLA', 'Tesla'], ['AMD', 'AMD'], ['NFLX', 'Netflix'], ['JPM', 'JPMorgan Chase'], ['V', 'Visa'], ['XOM', 'Exxon Mobil'], ['WMT', 'Walmart'], ['LLY', 'Eli Lilly']].map(([t, n]) => stockEntry(t, n)),
];

function stockEntry(t: string, n?: string): CatalogEntry {
  return { ticker: t, name: n || t, shortName: t, market: 'stocks', exchange: 'Dukascopy · Yahoo', pricePrecision: 2, volumePrecision: 0, duka: `${t.toLowerCase()}ususd`, yahoo: t, alt: t };
}

// ───────────────────────────────────────── helpers

function periodToTf(p: Period): { base: Tf; mult: number; binance: string } {
  const m = p.multiplier;
  switch (p.timespan) {
    case 'minute':
      if (m === 1) return { base: 'm1', mult: 1, binance: '1m' };
      if (m === 3) return { base: 'm1', mult: 3, binance: '3m' };
      if (m === 5) return { base: 'm5', mult: 1, binance: '5m' };
      if (m === 15) return { base: 'm15', mult: 1, binance: '15m' };
      if (m === 30) return { base: 'm30', mult: 1, binance: '30m' };
      return { base: 'm1', mult: m, binance: `${m}m` };
    case 'hour':
      if (m === 1) return { base: 'h1', mult: 1, binance: '1h' };
      if (m === 2) return { base: 'h1', mult: 2, binance: '2h' };
      if (m === 4) return { base: 'h4', mult: 1, binance: '4h' };
      return { base: 'h1', mult: m, binance: `${m}h` };
    case 'day': return { base: 'd1', mult: 1, binance: '1d' };
    case 'week': return { base: 'w1', mult: 1, binance: '1w' };
    default: return { base: 'mn1', mult: 1, binance: '1M' };
  }
}

const BASE_MS: Record<string, number> = { m1: 60_000, m5: 300_000, m15: 900_000, m30: 1_800_000, h1: 3_600_000, h4: 14_400_000 };

/** Combine N base bars into one (e.g. 3×1m → 3m, 2×1h → 2h), aligned to UTC. */
function combine(bars: KLineData[], base: Tf, mult: number): KLineData[] {
  if (mult === 1) return bars;
  const size = BASE_MS[base] * mult;
  const out: KLineData[] = [];
  for (const b of bars) {
    const t = Math.floor(b.timestamp / size) * size;
    const last = out[out.length - 1];
    if (last && last.timestamp === t) {
      last.high = Math.max(last.high, b.high); last.low = Math.min(last.low, b.low); last.close = b.close; last.volume = (last.volume || 0) + (b.volume || 0);
    } else out.push({ ...b, timestamp: t });
  }
  return out;
}

const isIntraday = (tf: Tf) => tf !== 'd1' && tf !== 'w1' && tf !== 'mn1';

function entryFor(symbol: SymbolInfo): CatalogEntry {
  const known = CATALOG.find((c) => c.ticker === symbol.ticker);
  if (known) return known;
  const s = symbol as CatalogEntry;
  if (s.duka || s.yahoo || s.binance) return s;
  if (/USDT$/.test(symbol.ticker)) return { ...symbol, binance: symbol.ticker, market: 'crypto' };
  return stockEntry(symbol.ticker);
}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url);
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`History server error (HTTP ${res.status})`); }
}

// ───────────────────────────────────────── datafeed

export class FullHistoryDatafeed implements Datafeed {
  private sockets = new Map<string, WebSocket>();
  private timers = new Map<string, ReturnType<typeof setInterval>>();
  private dukaList: Array<{ id: string; name: string; description: string }> | null = null;
  private oldest = Infinity;
  constructor(private onStatus?: (s: FeedStatus) => void) {}
  private report(s: FeedStatus) { try { this.onStatus?.(s); } catch { /* ignore */ } }

  /** Exposed so the UI can show where each pane's data comes from. */
  static describeSource(symbol: SymbolInfo, period: Period): string {
    const e = entryFor(symbol);
    const { base } = periodToTf(period);
    if (e.binance) return 'Binance (live)';
    if (!isIntraday(base) && e.yahoo) return 'Yahoo Finance (full daily history)';
    if (e.duka) return 'Dukascopy Bank SA';
    return 'Unavailable';
  }

  async searchSymbols(search?: string): Promise<SymbolInfo[]> {
    const q = (search || '').trim().toUpperCase().replace(/[\s/]/g, '');
    const base = CATALOG.filter((c) => !q || c.ticker.includes(q) || (c.name || '').toUpperCase().replace(/\s/g, '').includes(q));
    if (!this.dukaList) {
      try { this.dukaList = (await getJson('/api/history/instruments')).instruments || []; } catch { this.dukaList = []; }
    }
    const extra: CatalogEntry[] = [];
    if (q.length >= 2) {
      for (const i of this.dukaList || []) {
        if (extra.length >= 40) break;
        const t = i.id.toUpperCase();
        if (CATALOG.some((c) => c.duka === i.id)) continue;
        if (t.includes(q) || i.description.toUpperCase().replace(/\s/g, '').includes(q)) {
          const stock = /ususd$/.test(i.id);
          extra.push(stock ? stockEntry(i.id.replace(/ususd$/, '').toUpperCase(), i.description)
            : { ticker: t, name: i.description, shortName: i.name, market: 'other', exchange: 'Dukascopy', pricePrecision: 5, volumePrecision: 0, duka: i.id });
        }
      }
      if (/^[A-Z0-9]{2,10}USDT$/.test(q) && !base.some((b) => b.ticker === q)) extra.unshift({ ticker: q, name: `${q.replace('USDT', '')} / Tether`, shortName: q, market: 'crypto', exchange: 'Binance', pricePrecision: 4, volumePrecision: 2, binance: q });
      else if (/^[A-Z]{1,5}$/.test(q) && !base.some((b) => b.ticker === q) && !extra.some((x) => x.ticker === q)) extra.push(stockEntry(q));
    }
    return [...base, ...extra].slice(0, 80);
  }

  async getHistoryKLineData(symbol: SymbolInfo, period: Period, _from: number, to: number): Promise<KLineData[]> {
    const e = entryFor(symbol);
    const { base, mult, binance } = periodToTf(period);
    const before = Math.min(to + 1, Date.now() + 60_000);
    if (before > Date.now() - 60_000) this.oldest = Infinity; // fresh load (new symbol / timeframe)
    const done = (bars: KLineData[], source: string, reachedStart = false): KLineData[] => {
      if (bars.length) this.oldest = Math.min(this.oldest, bars[0].timestamp);
      this.report({ state: !bars.length || reachedStart ? 'start' : 'ok', source, oldest: Number.isFinite(this.oldest) ? this.oldest : undefined });
      return bars;
    };
    this.report({ state: 'loading', source: '' });
    try {
      if (e.binance) {
        const url = `https://data-api.binance.vision/api/v3/klines?symbol=${encodeURIComponent(e.binance)}&interval=${binance}&endTime=${Math.floor(before - 1)}&limit=1000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Binance HTTP ${res.status}${res.status === 400 ? ' (unknown symbol)' : ''}`);
        const rows: any[] = await res.json();
        return done(rows.map((r) => ({ timestamp: r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], volume: +r[5] })), 'Binance', rows.length < 1000);
      }
      const useYahoo = !isIntraday(base) && !!e.yahoo;
      const src = useYahoo ? 'yahoo' : 'duka';
      const id = useYahoo ? e.yahoo : e.duka;
      if (!id) throw new Error('No data source for this symbol');
      const count = 500 * mult;
      const altParam = !useYahoo && e.alt ? `&alt=${encodeURIComponent(e.alt)}` : '';
      let j = await getJson(`/api/history/candles?src=${src}&id=${encodeURIComponent(id)}&tf=${base}&before=${Math.floor(before)}&count=${count}${altParam}`);
      if (!j?.ok && useYahoo && e.duka) {
        j = await getJson(`/api/history/candles?src=duka&id=${encodeURIComponent(e.duka)}&tf=${base}&before=${Math.floor(before)}&count=${count}`);
      }
      if (!j?.ok) throw new Error(j?.error || 'History source unavailable');
      const label = j.src === 'yahoo' ? (j.fallback ? 'Yahoo Finance (backup)' : 'Yahoo Finance') : 'Dukascopy Bank SA';
      return done(combine(j.candles as KLineData[], base, mult), label, !!j.reachedStart);
    } catch (err: any) {
      this.report({ state: 'error', source: '', message: err?.message || String(err) });
      return [];
    }
  }

  subscribe(symbol: SymbolInfo, period: Period, callback: DatafeedSubscribeCallback): void {
    const key = `${symbol.ticker}|${period.text}`;
    this.unsubscribe(symbol, period);
    const e = entryFor(symbol);
    const { base, mult, binance } = periodToTf(period);

    if (e.binance) {
      const open = () => {
        const ws = new WebSocket(`wss://data-stream.binance.vision/ws/${e.binance!.toLowerCase()}@kline_${binance}`);
        ws.onmessage = (m) => {
          try {
            const k = JSON.parse(m.data).k;
            callback({ timestamp: k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v });
          } catch { /* ignore */ }
        };
        ws.onclose = () => { if (this.sockets.get(key) === ws) setTimeout(() => { if (this.sockets.get(key) === ws) open(); }, 3000); };
        this.sockets.set(key, ws);
      };
      open();
      return;
    }

    // Dukascopy / Yahoo: poll the newest bars and push the current one.
    const useYahoo = !isIntraday(base) && !!e.yahoo;
    const poll = async () => {
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        const src = useYahoo ? 'yahoo' : 'duka';
        const id = useYahoo ? e.yahoo : e.duka;
        const altParam = !useYahoo && e.alt ? `&alt=${encodeURIComponent(e.alt)}` : '';
        const j = await getJson(`/api/history/candles?src=${src}&id=${encodeURIComponent(id!)}&tf=${base}&before=${Date.now() + 60_000}&count=${Math.max(3, mult * 2)}${altParam}`);
        if (!j?.ok || !j.candles?.length) return;
        const bars = combine(j.candles as KLineData[], base, mult);
        callback(bars[bars.length - 1]);
      } catch { /* transient */ }
    };
    const every = isIntraday(base) ? 15_000 : 60_000;
    this.timers.set(key, setInterval(poll, every));
  }

  unsubscribe(symbol: SymbolInfo, period: Period): void {
    const key = `${symbol.ticker}|${period.text}`;
    const ws = this.sockets.get(key);
    if (ws) { this.sockets.delete(key); try { ws.close(); } catch { /* ignore */ } }
    const t = this.timers.get(key);
    if (t) { clearInterval(t); this.timers.delete(key); }
  }

  destroy(): void {
    for (const ws of this.sockets.values()) try { ws.close(); } catch { /* ignore */ }
    for (const t of this.timers.values()) clearInterval(t);
    this.sockets.clear(); this.timers.clear();
  }
}

export const PRO_PERIODS: Period[] = [
  { multiplier: 1, timespan: 'minute', text: '1m' }, { multiplier: 3, timespan: 'minute', text: '3m' }, { multiplier: 5, timespan: 'minute', text: '5m' },
  { multiplier: 15, timespan: 'minute', text: '15m' }, { multiplier: 30, timespan: 'minute', text: '30m' }, { multiplier: 1, timespan: 'hour', text: '1H' },
  { multiplier: 2, timespan: 'hour', text: '2H' }, { multiplier: 4, timespan: 'hour', text: '4H' }, { multiplier: 1, timespan: 'day', text: 'D' },
  { multiplier: 1, timespan: 'week', text: 'W' }, { multiplier: 1, timespan: 'month', text: 'M' },
];
