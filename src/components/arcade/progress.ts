/** Saved campaign progress for the arcade games (per browser). */
export interface Prog { unlocked: number; stars: Record<string, number>; credits: number; up: Record<string, number>; best: Record<string, number> }
const blank = (): Prog => ({ unlocked: 1, stars: {}, credits: 0, up: {}, best: {} });
export const loadProg = (key: string): Prog => {
  try { const j = JSON.parse(localStorage.getItem(key) || 'null'); return j && typeof j === 'object' ? { ...blank(), ...j } : blank(); } catch { return blank(); }
};
export const saveProg = (key: string, p: Prog) => { try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* ignore */ } };
