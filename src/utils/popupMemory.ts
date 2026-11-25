/** Remembers, per device and per user, which pop-ups were already handled so they do not come back on every open or reload. */
const K = 'ppfx_popup_';
const FOREVER = 0;
export function popupSeen(key: string, ttlMs = FOREVER): boolean {
  try { const v = localStorage.getItem(K + key); if (!v) return false; if (!ttlMs) return true; return Date.now() - Number(v) < ttlMs; } catch { return false; }
}
export function markPopup(key: string): void { try { localStorage.setItem(K + key, String(Date.now())); } catch { /* private mode */ } }
export const GATE_TTL = 7 * 24 * 3600_000;
