/** Anonymous usage heartbeat for the owner's live analytics (no IPs, no personal data beyond the signed-in username). */
const send = (body: Record<string, unknown>) => {
  try {
    const data = JSON.stringify(body);
    if (navigator.sendBeacon && navigator.sendBeacon('/api/analytics/ping', new Blob([data], { type: 'application/json' }))) return;
    void fetch('/api/analytics/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true });
  } catch { /* never break the app */ }
};
const rid = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const store = (s: Storage, k: string) => { try { let v = s.getItem(k); if (!v) { v = rid(); s.setItem(k, v); } return v; } catch { return rid(); } };
const device = () => (window.innerWidth < 640 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop');

export type AnalyticsState = { tab: string; cls: 'guest' | 'demo' | 'subscriber' | 'admin'; user?: string };
let started = false;

export function trackPing(state: AnalyticsState, kind: 'start' | 'view' | 'beat') {
  send({ vid: store(localStorage, 'ppfx_vid'), sid: store(sessionStorage, 'ppfx_sid'), kind, device: device(), ...state });
}
/** Call whenever the screen/tab/access class changes; sends a heartbeat every 30 s while the page is visible. */
export function trackState(state: AnalyticsState, getLatest: () => AnalyticsState) {
  trackPing(state, started ? 'view' : 'start');
  if (!started) {
    started = true;
    window.setInterval(() => { if (document.visibilityState === 'visible') trackPing(getLatest(), 'beat'); }, 30_000);
  }
}
