import { describe, it, expect } from 'vitest';
import { CANVAS_DEFAULT, brightness, canvasStyles, isLightCanvas } from './chartCanvas';

describe('chart canvas colour', () => {
  it('defaults to white', () => expect(CANVAS_DEFAULT).toBe('#ffffff'));
  it('tells light from dark backgrounds', () => {
    expect(isLightCanvas('#ffffff')).toBe(true); expect(isLightCanvas('#fdf6e3')).toBe(true);
    expect(isLightCanvas('#131722')).toBe(false); expect(isLightCanvas('#000000')).toBe(false);
    expect(brightness('#ffffff')).toBeCloseTo(1, 2);
  });
  it('uses dark text on light canvases and light text on dark ones', () => {
    expect(canvasStyles('#ffffff').yAxis.tickText.color).toBe('#334155');
    expect(canvasStyles('#000000').yAxis.tickText.color).toBe('#94a3b8');
  });
  it('keeps green up / red down candles whatever the background', () => {
    expect(canvasStyles('#ffffff').candle.bar.upColor).toBe('#089981'); expect(canvasStyles('#000000').candle.bar.downColor).toBe('#f23645');
  });
});
