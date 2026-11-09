/**
 * Market sessions (DST-correct via the America/New_York clock).
 *  · Crypto: 24/7.
 *  · Forex, metals, energy and index CFDs: Sunday 17:00 → Friday 17:00 New York time
 *    (the interbank week; Pakistan time = Monday 02:00/03:00 → Saturday 02:00/03:00).
 *  · US stocks: Monday–Friday 09:30–16:00 New York time.
 */
export type SessionKind = 'crypto' | 'fx' | 'stocks';

export function sessionKind(symbol: string, category = ''): SessionKind {
  const s = symbol.toUpperCase();
  const c = category.toLowerCase();
  if (c.includes('crypto') || /USDT$|^BTC|^ETH|^SOL|^XRP|^BNB|^DOGE|^ADA|^AVAX|^LINK|^LTC|^DOT|^TRX/.test(s.replace(/^[A-Z]+:/, ''))) return 'crypto';
  if (c.includes('stock') || c.includes('equit') && !c.includes('benchmark')) return 'stocks';
  return 'fx';
}

function nyParts(d: Date) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  const h = Number(p.hour) % 24, m = Number(p.minute), s = Number(p.second);
  return { dow, mins: h * 60 + m, secs: h * 3600 + m * 60 + s };
}

/** Is the market open at `d`? When closed, also seconds until it reopens. */
export function marketStatus(kind: SessionKind, d = new Date()): { open: boolean; reopensInSec: number | null; closesInSec?: number | null; label: string } {
  if (kind === 'crypto') return { open: true, reopensInSec: null, closesInSec: null, label: '24/7' };
  const { dow, secs } = nyParts(d);
  const weekSec = dow * 86400 + secs; // seconds since Sunday 00:00 New York
  if (kind === 'fx') {
    const open = 0 * 86400 + 17 * 3600; // Sun 17:00
    const close = 5 * 86400 + 17 * 3600; // Fri 17:00
    if (weekSec >= open && weekSec < close) return { open: true, reopensInSec: null, closesInSec: close - weekSec, label: 'Open' };
    const until = weekSec < open ? open - weekSec : 7 * 86400 - weekSec + open;
    return { open: false, reopensInSec: until, label: 'Weekend close' };
  }
  // stocks
  const day = 86400, o = 9.5 * 3600, c = 16 * 3600;
  if (dow >= 1 && dow <= 5 && secs >= o && secs < c) return { open: true, reopensInSec: null, closesInSec: c - secs, label: 'Open' };
  let k = 0;
  for (let i = 0; i <= 7; i++) {
    const dd = (dow + i) % 7;
    const startToday = i === 0 ? (secs < o ? o - secs : null) : (day - secs) + (i - 1) * day + o;
    if (dd >= 1 && dd <= 5 && startToday !== null) { k = startToday; break; }
  }
  return { open: false, reopensInSec: k, label: 'Closed' };
}

export function fmtDuration(sec: number): string {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m ${Math.floor(sec % 60)}s`;
}

/**
 * Seconds until the current candle closes, aligned the way TradingView aligns bars:
 *  · up to 1h: clock-aligned (every timezone offset is a whole hour);
 *  · 2h/3h/4h and Daily for forex/metals/indices: anchored to the 17:00 New York session
 *    roll (DST-correct); crypto uses UTC midnight; US stocks use the 09:30 open / 16:00 close;
 *  · Weekly: Friday 17:00 NY (forex), Monday 00:00 UTC (crypto), Friday 16:00 NY (stocks);
 *  · Monthly: the 1st of next month, 00:00 UTC.
 */
export function barCloseIn(norm: string, kind: SessionKind, d = new Date()): { remaining: number; total: number } {
  const epoch = Math.floor(d.getTime() / 1000);
  const { dow, secs } = nyParts(d);
  const minutes = Number(norm);
  if (Number.isFinite(minutes) && minutes > 0) {
    const P = minutes * 60;
    if (P <= 3600 && kind !== 'stocks') return { remaining: P - (epoch % P), total: P };
    if (kind === 'crypto') return { remaining: P - (epoch % P), total: P };
    const anchor = kind === 'stocks' ? 9.5 * 3600 : 17 * 3600;
    const since = (((secs - anchor) % 86400) + 86400) % 86400;
    return { remaining: P - (since % P), total: P };
  }
  if (norm === 'D') {
    if (kind === 'crypto') return { remaining: 86400 - (epoch % 86400), total: 86400 };
    const close = kind === 'stocks' ? 16 * 3600 : 17 * 3600;
    return { remaining: ((close - secs + 86400) % 86400) || 86400, total: 86400 };
  }
  if (norm === 'W') {
    if (kind === 'crypto') {
      const sinceMon = (epoch - 4 * 86400) % 604800; // 1970-01-05 was a Monday
      return { remaining: 604800 - sinceMon, total: 604800 };
    }
    const target = 5 * 86400 + (kind === 'stocks' ? 16 : 17) * 3600;
    const weekSec = dow * 86400 + secs;
    return { remaining: ((target - weekSec + 604800) % 604800) || 604800, total: 604800 };
  }
  // Monthly
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 1000;
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000;
  return { remaining: Math.max(1, Math.round(next - epoch)), total: Math.round(next - start) };
}

/** TradingView-style countdown text: 42:07 · 03:12:09 · 2d 04:10:00 */
export function fmtCountdown(sec: number): string {
  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0');
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
