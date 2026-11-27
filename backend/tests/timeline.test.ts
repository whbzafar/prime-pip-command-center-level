import { describe, it, expect } from 'vitest';
import { chunkCaption, pickFeature, planTimeline, titleCase, type Item } from '../../src/utils/timeline';

const mk = (parts: number, voice: number | null): Item[] => [
  { kind: 'intro', voice, base: 3 }, { kind: 'overview', voice, base: 5 },
  ...Array.from({ length: parts }, () => ({ kind: 'part' as const, voice, base: 4 })), { kind: 'outro', voice, base: 3 },
];

describe('planTimeline', () => {
  it('keeps a normal video inside 30 to 60 seconds', () => {
    const p = planTimeline(mk(6, 5)); expect(p.total).toBeGreaterThanOrEqual(30); expect(p.total).toBeLessThanOrEqual(58.01);
  });
  it('speeds the voice a little, then drops the longest parts, when too long', () => {
    const p = planTimeline(mk(10, 9)); expect(p.total).toBeLessThanOrEqual(58.01); expect(p.rate).toBeGreaterThan(1); expect(p.rate).toBeLessThanOrEqual(1.12);
    expect(p.keep.filter(Boolean).length).toBeLessThan(13); expect(p.keep[0]).toBe(true); expect(p.keep[p.keep.length - 1]).toBe(true);
  });
  it('holds shots longer when too short', () => {
    const p = planTimeline(mk(2, null)); expect(p.total).toBeGreaterThanOrEqual(29.99);
  });
  it('never drops below two parts', () => {
    const p = planTimeline(mk(3, 40)); expect(p.keep.slice(2, 5).filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });
});

describe('pickFeature', () => {
  const f = ['Live equity curve and balance tracking', 'Real-time daily loss circuit breaker', 'Quick trade execution launcher'];
  it('matches only by shared words (never pairs an unrelated feature) and never reuses one', () => {
    const used = new Set<number>();
    expect(pickFeature('LIVE EQUITY CURVE', f, used)).toBe(f[0]);
    expect(pickFeature('Daily loss circuit', f, used)).toBe(f[1]);
    expect(pickFeature('Something else', f, used)).toBe('');
    expect(pickFeature('Quick launcher', f, used)).toBe(f[2]);
    expect(pickFeature('Anything', f, used)).toBe('');
  });
});

describe('text helpers', () => {
  it('chunks captions and title-cases labels', () => {
    expect(chunkCaption('a b c d e f g h i', 4)).toEqual(['a b c d', 'e f g h', 'i']);
    expect(titleCase('NEXT TRADE READINESS')).toBe('Next Trade Readiness');
  });
});
