import { describe, it, expect } from 'vitest';
import { chooseParts, DANGEROUS, fitCrop, fullCrop } from '../../src/utils/sectionDirector';
import { toSrt } from '../../src/utils/liveCaptions';

const inside = (c: { x: number; y: number; w: number; h: number }, vw: number, vh: number) => c.x >= -0.001 && c.y >= -0.001 && c.x + c.w <= vw + 0.001 && c.y + c.h <= vh + 0.001;

describe('fitCrop', () => {
  it('frames a small card around its centre at the target aspect', () => {
    const c = fitCrop({ x: 900, y: 400, w: 300, h: 200 }, 0.96, 1920, 1080);
    expect(c.w / c.h).toBeCloseTo(0.96, 5);
    expect(c.x).toBeLessThanOrEqual(900); expect(c.x + c.w).toBeGreaterThanOrEqual(1200);
    expect(c.y).toBeLessThanOrEqual(400); expect(c.y + c.h).toBeGreaterThanOrEqual(600);
    expect(inside(c, 1920, 1080)).toBe(true);
  });
  it('never zooms in past the minimum width and never leaves the frame', () => {
    const c = fitCrop({ x: 1900, y: 1070, w: 10, h: 5 }, 0.96, 1920, 1080);
    expect(c.w).toBeGreaterThanOrEqual(1920 * 0.3 - 0.001);
    expect(inside(c, 1920, 1080)).toBe(true);
  });
  it('frames the top of a part taller than the shot', () => {
    const c = fitCrop({ x: 100, y: 50, w: 600, h: 3000 }, 0.96, 1920, 1080);
    expect(c.y).toBeLessThan(200);
    expect(inside(c, 1920, 1080)).toBe(true);
  });
  it('works for landscape output', () => {
    const c = fitCrop({ x: 200, y: 200, w: 400, h: 300 }, 16 / 9 * 0.8, 1280, 720);
    expect(inside(c, 1280, 720)).toBe(true);
  });
});

describe('fullCrop', () => {
  it('fits the whole height for portrait shots', () => {
    const c = fullCrop(0.96, 1920, 1080);
    expect(c.h).toBeCloseTo(1080, 5); expect(inside(c, 1920, 1080)).toBe(true);
  });
});

describe('chooseParts', () => {
  const parts = Array.from({ length: 20 }, (_, i) => ({ top: i * 300, height: 200, id: i }));
  it('keeps reading order and spreads picks over the whole section', () => {
    const p = chooseParts(parts, 5);
    expect(p).toHaveLength(5);
    expect(p[0].id).toBe(0); expect(p[p.length - 1].id).toBe(19);
    expect(p.map((x) => x.top)).toEqual([...p.map((x) => x.top)].sort((a, b) => a - b));
  });
  it('drops parts that sit on top of an earlier one', () => {
    const p = chooseParts([{ top: 0, height: 100 }, { top: 40, height: 100 }, { top: 400, height: 100 }], 9);
    expect(p.map((x) => x.top)).toEqual([0, 400]);
  });
  it('sorts unsorted input', () => {
    expect(chooseParts([{ top: 900, height: 1 }, { top: 0, height: 1 }]).map((x) => x.top)).toEqual([0, 900]);
  });
});

describe('DANGEROUS', () => {
  it('blocks trading, payment and delete controls', () => {
    ['Buy', 'SELL', 'Close position', 'Delete', 'Place order', 'Subscribe', 'Log out', 'Withdraw'].forEach((t) => expect(DANGEROUS.test(t)).toBe(true));
  });
  it('allows harmless tabs', () => {
    ['Overview', 'H1', '4H', 'Daily', 'Calendar', 'Gold', 'Heatmap', 'Closed?'.replace('?', 'ing price')].forEach((t) => expect(DANGEROUS.test(t)).toBe(false));
  });
});

describe('toSrt', () => {
  it('numbers lines and formats times', () => {
    const s = toSrt([{ start: 0.5, end: 2.25, text: 'السلام علیکم' }, { start: 61, end: 61.2, text: 'یہ ڈیش بورڈ ہے' }]);
    expect(s).toContain('1\n00:00:00,500 --> 00:00:02,250\nالسلام علیکم');
    expect(s).toContain('2\n00:01:01,000 --> 00:01:01,800\nیہ ڈیش بورڈ ہے');
  });
  it('skips empty lines', () => {
    expect(toSrt([{ start: 0, end: 1, text: '  ' }])).toBe('');
  });
});

describe('readable zoom and pan', () => {
  it('caps the shot width so wide cards are zoomed in, then pans across them', async () => {
    const { fitCrop, panCrop } = await import('../../src/utils/sectionDirector');
    const card = { x: 100, y: 200, w: 1240, h: 260 };
    const c = fitCrop(card, 0.96, 1440, 900);
    expect(c.w).toBeLessThanOrEqual(1440 * 0.6 + 0.001);
    const a = panCrop(card, c, 1440, 900, 0); const b = panCrop(card, c, 1440, 900, 1);
    expect(a.x).toBeLessThan(b.x);
    expect(b.x + b.w).toBeGreaterThanOrEqual(card.x + card.w * 0.95);
    [a, b].forEach((x) => { expect(x.x).toBeGreaterThanOrEqual(0); expect(x.x + x.w).toBeLessThanOrEqual(1440.001); });
  });
  it('leaves small parts where they are', async () => {
    const { fitCrop, panCrop } = await import('../../src/utils/sectionDirector');
    const r = { x: 600, y: 300, w: 200, h: 150 }; const c = fitCrop(r, 0.96, 1440, 900);
    expect(panCrop(r, c, 1440, 900, 1)).toEqual(c);
  });
});
