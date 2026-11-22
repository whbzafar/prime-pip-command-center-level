/**
 * EFFECTS GOVERNOR — keeps the app fast. The decorative layers (3D scene, pointer light) only animate while the pointer is
 * moving, freeze when idle, and downgrade themselves if this device cannot hold ~30 fps:
 *   full → lite (scene drawn once, pointer light off) → off (no canvases at all).
 * A saved choice (Auto / Full / Off) is kept per device; "auto" is the default.
 */
export type Fx = 'full' | 'lite' | 'off';
const KEY_MODE = 'ppfx_fx_mode_v2';      // 'auto' | 'full' | 'off'
const KEY_AUTO = 'ppfx_fx_auto_v2';      // last level the governor settled on
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

const subs = new Set<() => void>();
let pref: 'auto' | 'full' | 'off' = (read(KEY_MODE) as any) || 'auto';
let auto: Fx = (read(KEY_AUTO) as Fx) || (() => {
  const nav: any = navigator; const weak = (nav.hardwareConcurrency || 8) <= 2 || (nav.deviceMemory || 8) <= 2 || nav.connection?.saveData;
  return weak ? 'lite' : 'full';
})();
const reduce = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const getFx = (): Fx => (reduce() ? 'off' : pref === 'off' ? 'off' : pref === 'full' ? 'full' : auto);
export const getFxPref = () => pref;
export const onFx = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const publish = () => { document.documentElement.dataset.fx = getFx(); subs.forEach((f) => f()); };
export function setFxPref(p: 'auto' | 'full' | 'off') { pref = p; write(KEY_MODE, p); if (p === 'auto') { auto = 'full'; write(KEY_AUTO, auto); } publish(); }

/* ── activity: effects animate only for a short window after the pointer moves ── */
let awakeUntil = 0;
export const wake = (ms = 2200) => { awakeUntil = performance.now() + ms; };
export const isAwake = (t = performance.now()) => t < awakeUntil;

/* ── frame probe: effects report raw rAF deltas while they animate; sustained slowness downgrades one step ── */
const deltas: number[] = []; let lastT = 0; let slowRuns = 0;
export function probe(now: number) {
  if (!isAwake(now)) { lastT = 0; return; }
  if (lastT) {
    const d = now - lastT; if (d < 1000) deltas.push(d);
    if (deltas.length >= 45) {
      const s = [...deltas].sort((a, b) => a - b); const med = s[s.length >> 1]; deltas.length = 0;
      slowRuns = med > 34 ? slowRuns + 1 : 0;           // median frame slower than ~30 fps
      if (slowRuns >= 2 && pref === 'auto') { slowRuns = 0; auto = auto === 'full' ? 'lite' : 'off'; write(KEY_AUTO, auto); publish(); }
    }
  }
  lastT = now;
}
export function startGovernor() {
  document.documentElement.dataset.fx = getFx();
  document.addEventListener('visibilitychange', () => { lastT = 0; deltas.length = 0; });
  window.addEventListener('pointermove', () => wake(), { passive: true });
  window.addEventListener('pointerdown', () => wake(3000), { passive: true });
  window.addEventListener('wheel', () => wake(1200), { passive: true });
}
