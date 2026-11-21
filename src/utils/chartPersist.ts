/**
 * AUTO-SAVE for klinecharts-based charts: drawings and indicators are saved the moment they change and
 * come back exactly as left (per instrument), after a symbol switch, a reload or a new visit.
 * Nothing is ever sent anywhere: it lives in this browser.
 */
import { init, type Chart } from 'klinecharts';

const P = 'ppfx:chart-save:v1:';
const IND = `${P}indicators`;

export interface SavedOverlay { name: string; points: Array<{ timestamp: number; value: number }>; lock?: boolean; visible?: boolean; styles?: unknown; extendData?: unknown }
export interface SavedIndicators { main: Array<{ name: string; calcParams?: number[] }>; sub: Array<{ name: string; calcParams?: number[] }> }

/** The Pro chart does not expose its inner chart; its widget element carries the id the library registered it under. */
export function resolveProChart(host: HTMLElement): Chart | null {
  try {
    const w = host.querySelector('.klinecharts-pro-widget') as HTMLElement | null;
    const id = w?.getAttribute('k-line-chart-id');
    if (!w || !id) return null;
    if (w.id !== id) w.id = id;
    return init(w) || null;
  } catch { return null; }
}

export function snapshotOverlays(chart: Chart): SavedOverlay[] {
  const out: SavedOverlay[] = [];
  try {
    const map: Map<string, any[]> | undefined = (chart as any)._chartStore?.getOverlayStore?.()._instances;
    if (!map) return out;
    const data = chart.getDataList();
    for (const [, list] of map) {
      for (const o of list) {
        if (o.currentStep !== -1 || !Array.isArray(o.points) || !o.points.length) continue;
        // a point may carry only its bar index: turn it into the bar's time so it survives reloads
        const pts = o.points.map((p: any) => ({ timestamp: Number.isFinite(Number(p.timestamp)) && p.timestamp != null ? Number(p.timestamp) : Number(data[p.dataIndex]?.timestamp), value: Number(p.value) }));
        if (pts.some((p: any) => !Number.isFinite(p.timestamp) || !Number.isFinite(p.value))) continue;
        out.push({ name: String(o.name), points: pts, lock: Boolean(o.lock), visible: o.visible !== false, styles: o.styles ?? undefined, extendData: o.extendData ?? undefined });
      }
    }
  } catch { /* store layout changed: save nothing rather than crash */ }
  return out;
}

export function snapshotIndicators(chart: Chart): SavedIndicators {
  const res: SavedIndicators = { main: [], sub: [] };
  try {
    const all = chart.getIndicatorByPaneId() as Map<string, Map<string, any>>;
    for (const [paneId, m] of all) for (const [name, ind] of m) (paneId === 'candle_pane' ? res.main : res.sub).push({ name, calcParams: Array.isArray(ind.calcParams) ? [...ind.calcParams] : undefined });
  } catch { /* ignore */ }
  return res;
}

const read = <T,>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const loadOverlays = (ticker: string) => read<SavedOverlay[]>(`${P}overlays:${ticker}`) || [];
export const saveOverlays = (ticker: string, list: SavedOverlay[]) => write(`${P}overlays:${ticker}`, list);
export const loadIndicators = () => read<SavedIndicators>(IND);
export const saveIndicators = (v: SavedIndicators) => write(IND, v);

/** Recreate saved drawings on a chart (replacing whatever is there). */
export function restoreOverlays(chart: Chart, list: SavedOverlay[]) {
  try { chart.removeOverlay(); } catch { /* ignore */ }
  for (const o of list) {
    try { chart.createOverlay({ name: o.name, points: o.points, lock: o.lock, visible: o.visible, styles: o.styles as any, extendData: o.extendData as any }, 'candle_pane'); } catch { /* unknown tool: skip it */ }
  }
}

/**
 * Keep saving what is on the chart. `getTicker` says which instrument is on screen; saving pauses while
 * `isReady()` is false (data still loading / drawings not yet restored) so an empty chart never overwrites a save.
 */
export function startAutoSave(chart: Chart, getTicker: () => string, isReady: () => boolean): () => void {
  let lastO = '', lastI = '';
  const tick = () => {
    if (!isReady()) return;
    const t = getTicker(); if (!t) return;
    const o = JSON.stringify(snapshotOverlays(chart));
    const key = `${t}|${o}`;
    if (key !== lastO) { lastO = key; saveOverlays(t, JSON.parse(o)); }
    const i = JSON.stringify(snapshotIndicators(chart));
    if (i !== lastI) { lastI = i; saveIndicators(JSON.parse(i)); }
  };
  const iv = window.setInterval(tick, 1200);
  const flush = () => tick();
  window.addEventListener('pagehide', flush); document.addEventListener('visibilitychange', flush);
  return () => { window.clearInterval(iv); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); tick(); };
}
