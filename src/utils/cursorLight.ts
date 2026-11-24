/** Brightness of the light that follows the mouse: 0 (off) … 100 (default) … 200 (very bright). Saved per device. */
const KEY = 'ppfx_cursor_light_v2'; // v2: new, much lighter default (the old glow looked like smoke)
export const getCursorLight = (): number => { try { const n = Number(localStorage.getItem(KEY)); return Number.isFinite(n) && localStorage.getItem(KEY) !== null ? Math.min(200, Math.max(0, n)) : 35; } catch { return 35; } };
export function applyCursorLight(level = getCursorLight()) {
  const r = document.documentElement.style;
  r.setProperty('--spot-op', String(Math.min(1, level / 100)));
  r.setProperty('--spot-br', String(Math.max(1, level / 100)));
}
export function setCursorLight(level: number) { try { localStorage.setItem(KEY, String(level)); } catch { /* ignore */ } applyCursorLight(level); }
