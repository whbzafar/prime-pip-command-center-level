/**
 * Extra drawing tools + selection helpers for the Unlimited chart (klinecharts 9):
 *  - ppfxBrush / ppfxHighlighter: freehand strokes (any number of points, drag the stroke to move it)
 *  - ppfxText: type-your-own text label (double-click to edit)
 *  - selection helpers: which drawing is selected, delete it.
 */
import { registerOverlay, type Chart } from 'klinecharts';

let done = false;
const strokeFigure = (size: number, color: string) => ({ coordinates }: { coordinates: Array<{ x: number; y: number }> }) =>
  coordinates.length > 1 ? [{ type: 'line', attrs: { coordinates }, styles: { style: 'solid', size, color, smooth: true } }] : [{ type: 'circle', attrs: { x: coordinates[0]?.x ?? 0, y: coordinates[0]?.y ?? 0, r: size / 2 }, styles: { style: 'fill', color } }];
const moveAll = ({ points, performPoint, performPointIndex }: any) => {
  const base = points[performPointIndex] ?? points[0]; if (!base || performPoint.value == null) return;
  const dv = performPoint.value - base.value; const dt = (performPoint.timestamp ?? base.timestamp) - base.timestamp;
  points.forEach((p: any) => { p.value += dv; if (p.timestamp != null) p.timestamp += dt; });
};

export function registerChartTools() {
  if (done) return; done = true;
  const brush = (name: string, size: number, color: string) => registerOverlay({
    name, totalStep: 2, needDefaultPointFigure: false, needDefaultXAxisFigure: false, needDefaultYAxisFigure: false,
    createPointFigures: strokeFigure(size, color) as any, performEventPressedMove: moveAll as any,
  } as any);
  brush('ppfxBrush', 2, '#2962ff');
  brush('ppfxHighlighter', 14, 'rgba(255,213,0,0.32)');
  registerOverlay({
    name: 'ppfxText', totalStep: 2, needDefaultPointFigure: true,
    createPointFigures: ({ coordinates, overlay }: any) => {
      const text = String(overlay.extendData ?? '') || 'Text';
      return [{ type: 'text', attrs: { x: coordinates[0].x, y: coordinates[0].y, text, baseline: 'middle' }, styles: { color: '#131722', size: 15, weight: 'bold', backgroundColor: 'rgba(255,255,255,0.88)', borderColor: '#2962ff', borderSize: 1, paddingLeft: 6, paddingRight: 6, paddingTop: 4, paddingBottom: 4, borderRadius: 4, style: 'stroke_fill' }, ignoreEvent: false }];
    },
    onDoubleClick: ({ overlay }: any) => { window.dispatchEvent(new CustomEvent('ppfx-edit-text', { detail: { id: overlay.id, text: String(overlay.extendData ?? '') } })); return true; },
  } as any);
}

const store = (c: Chart): any => (c as any)._chartStore?.getOverlayStore?.();
export interface Selected { id: string; name: string }
/** The drawing the user last clicked on (and that still exists), or null. */
export function getSelected(c: Chart | null): Selected | null {
  try {
    const s = store(c as Chart); const inst = s?.getClickInstanceInfo?.()?.instance; if (!inst) return null;
    return s.getInstanceById?.(inst.id) ? { id: inst.id, name: String(inst.name) } : null;
  } catch { return null; }
}
export function deleteSelected(c: Chart | null): boolean {
  const sel = getSelected(c); if (!sel || !c) return false;
  try { c.removeOverlay({ id: sel.id } as any); return true; } catch { return false; }
}
export function clearSelection(c: Chart | null) {
  try { const s = store(c as Chart); s?.setClickInstanceInfo?.({ paneId: '', instance: null, figureType: 'none', figureKey: '', figureIndex: -1, attrsIndex: -1 }, {}); } catch { /* ignore */ }
}
export const TOOL_LABEL: Record<string, string> = { ppfxBrush: 'Brush stroke', ppfxHighlighter: 'Highlighter stroke', ppfxText: 'Text', segment: 'Trend Line', rect: 'Rectangle', simpleAnnotation: 'Annotation', simpleTag: 'Price Tag' };
