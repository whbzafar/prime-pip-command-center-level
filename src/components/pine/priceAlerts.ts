/**
 * Price alerts for the Premium chart (TradingView-style).
 *
 * Kept per browser. The chart's own live feed checks the symbol on screen on every tick; alerts on
 * other symbols are checked every 20 seconds in the background while the app is open. A triggered
 * alert plays the chosen alert sound, shows a system notification (if allowed) and stays on the
 * chart greyed out until it is re-armed or removed.
 */
import { CATALOG, FullHistoryDatafeed, PRO_PERIODS } from '../chartAnalysis/fullHistoryDatafeed';
import { playSound, type SoundId } from '../../utils/alertSounds';

export type AlertCondition = 'cross' | 'above' | 'below';
export interface PriceAlert {
  id: string;
  ticker: string;
  price: number;
  condition: AlertCondition;
  message?: string;
  createdAt: number;
  triggeredAt?: number | null;
}

const KEY = 'ppfx_price_alerts_v1';
type Listener = () => void;
const listeners = new Set<Listener>();
let alerts: PriceAlert[] = (() => {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((a) => a && typeof a.price === 'number' && a.ticker) : []; } catch { return []; }
})();
const last = new Map<string, number>();

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(alerts)); } catch { /* storage blocked */ } listeners.forEach((l) => l()); };

export const priceAlerts = {
  all: () => alerts,
  forTicker: (t: string) => alerts.filter((a) => a.ticker === t),
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; },
  add(ticker: string, price: number, condition?: AlertCondition): PriceAlert {
    const cur = last.get(ticker);
    const a: PriceAlert = { id: `al_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ticker, price, condition: condition || 'cross', createdAt: Date.now(), triggeredAt: null };
    if (!condition && cur !== undefined) a.condition = 'cross';
    alerts = [...alerts, a];
    save();
    ensurePolling();
    return a;
  },
  update(id: string, patch: Partial<PriceAlert>) { alerts = alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)); save(); },
  remove(id: string) { alerts = alerts.filter((a) => a.id !== id); save(); },
  rearm(id: string) { priceAlerts.update(id, { triggeredAt: null }); },
  /** Feed a live price. Fires alerts whose level was crossed since the previous price. */
  tick(ticker: string, price: number) {
    if (!Number.isFinite(price)) return;
    const prev = last.get(ticker);
    last.set(ticker, price);
    if (prev === undefined) return;
    let fired = false;
    alerts = alerts.map((a) => {
      if (a.ticker !== ticker || a.triggeredAt) return a;
      const up = prev < a.price && price >= a.price;
      const down = prev > a.price && price <= a.price;
      const hit = a.condition === 'above' ? up : a.condition === 'below' ? down : up || down;
      if (!hit) return a;
      fired = true;
      announce(a, price, up ? 'up' : 'down');
      return { ...a, triggeredAt: Date.now() };
    });
    if (fired) save();
  },
  lastPrice: (t: string) => last.get(t),
};

function soundChoice(): { on: boolean; id: SoundId } {
  try {
    const s = JSON.parse(localStorage.getItem('ppfx_lt_alert_settings_v1') || '{}');
    return { on: !s.muted && s.sound !== false, id: (s.soundId as SoundId) || 'alarm' };
  } catch { return { on: true, id: 'alarm' }; }
}

function announce(a: PriceAlert, price: number, dir: 'up' | 'down') {
  const s = soundChoice();
  if (s.on) playSound(s.id);
  const title = `🔔 ${a.ticker} ${dir === 'up' ? 'crossed up' : 'crossed down'} ${a.price}`;
  const body = a.message || `Price ${price} — your alert at ${a.price} was reached.`;
  window.dispatchEvent(new CustomEvent('ppfx:price-alert', { detail: { alert: a, price, title, body } }));
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      navigator.serviceWorker?.getRegistration?.().then((reg) => {
        if (reg?.showNotification) reg.showNotification(title, { body, tag: `ppfx-alert-${a.id}`, icon: '/favicon.ico' } as any);
        else new Notification(title, { body, icon: '/favicon.ico' });
      }).catch(() => { try { new Notification(title, { body }); } catch { /* blocked */ } });
    }
  } catch { /* not supported */ }
}

// Background check for alerts on symbols that are not on screen.
let timer: number | null = null;
const onScreen = new Set<string>();
export const markOnScreen = (t: string, on: boolean) => { if (on) onScreen.add(t); else onScreen.delete(t); };
function ensurePolling() {
  if (timer !== null || typeof window === 'undefined') return;
  const m1 = PRO_PERIODS[0];
  const run = async () => {
    const tickers = [...new Set(alerts.filter((a) => !a.triggeredAt).map((a) => a.ticker))].filter((t) => !onScreen.has(t));
    for (const t of tickers) {
      const e = CATALOG.find((c) => c.ticker === t);
      if (!e) continue;
      try {
        const f = new FullHistoryDatafeed(() => {}); f.pageSize = 3; const rows = await f.getHistoryKLineData(e as any, m1, 0, Date.now() + 60_000);
        const b = rows?.[rows.length - 1];
        if (b) { if (!last.has(t) && rows.length > 1) last.set(t, rows[rows.length - 2].close); priceAlerts.tick(t, b.close); }
      } catch { /* transient */ }
    }
  };
  timer = window.setInterval(run, 10_000);
  window.setTimeout(run, 3000);
}
if (alerts.some((a) => !a.triggeredAt)) ensurePolling();
