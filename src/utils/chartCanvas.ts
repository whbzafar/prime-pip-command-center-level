/**
 * Canvas colour for the Unlimited Charts and the Backtesting replay chart.
 * Default: white. The user can pick any colour (or a preset); the choice is saved and shared by every chart.
 * Text, grid and crosshair colours follow the background brightness so everything stays readable.
 */
export const CANVAS_KEY = 'ppfx:chart-canvas';
export const CANVAS_DEFAULT = '#ffffff';
export const CANVAS_PRESETS = ['#ffffff', '#f3f4f6', '#fdf6e3', '#e8f1ff', '#131722', '#000000'];
const EVT = 'ppfx:chart-canvas';

export const getCanvasColor = (): string => {
  try { const v = localStorage.getItem(CANVAS_KEY); if (v && /^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase(); } catch { /* storage blocked */ }
  return CANVAS_DEFAULT;
};
export const setCanvasColor = (c: string) => {
  const v = /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : CANVAS_DEFAULT;
  try { localStorage.setItem(CANVAS_KEY, v); } catch { /* storage blocked */ }
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: v })); } catch { /* ignore */ }
};
export const onCanvasColor = (fn: (c: string) => void) => {
  const h = (e: Event) => fn(String((e as CustomEvent).detail || getCanvasColor()));
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
};

/** Perceived brightness 0..1. */
export const brightness = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
export const isLightCanvas = (hex: string) => brightness(hex) > 0.55;

/** klinecharts styles that read well on the chosen background (candles keep the usual green / red). */
export function canvasStyles(hex: string) {
  const light = isLightCanvas(hex);
  const text = light ? '#334155' : '#94a3b8';
  const line = light ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.07)';
  const axis = light ? '#cbd5e1' : '#1e293b';
  const cross = light ? '#64748b' : '#475569';
  return {
    grid: { horizontal: { color: line }, vertical: { color: line } },
    candle: {
      bar: { upColor: '#089981', downColor: '#f23645', noChangeColor: '#94a3b8', upBorderColor: '#089981', downBorderColor: '#f23645', upWickColor: '#089981', downWickColor: '#f23645' },
      priceMark: { last: { upColor: '#089981', downColor: '#f23645', line: { style: 'dashed' } } },
      tooltip: { text: { color: light ? '#1e293b' : '#cbd5e1' } },
    },
    xAxis: { axisLine: { color: axis }, tickLine: { color: axis }, tickText: { color: text } },
    yAxis: { axisLine: { color: axis }, tickLine: { color: axis }, tickText: { color: text } },
    separator: { color: axis },
    crosshair: { horizontal: { line: { color: cross }, text: { backgroundColor: light ? '#334155' : '#475569' } }, vertical: { line: { color: cross }, text: { backgroundColor: light ? '#334155' : '#475569' } } },
    indicator: { tooltip: { text: { color: text } } },
  };
}
