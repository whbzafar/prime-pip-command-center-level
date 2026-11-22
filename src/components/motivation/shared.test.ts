import { describe, it, expect } from 'vitest';
import { weave, shuffleSeeded, type V } from './shared';
import { PINS } from './pinsData';
const v = (id: string, kind?: 'pin'): V => ({ id, title: id, channel: '', thumb: '', kind });
describe('pinterest weave', () => {
  it('inserts a pin after every N videos without reordering videos', () => {
    const out = weave(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((x) => v(x)), [v('P1', 'pin'), v('P2', 'pin')], 4).map((x) => x.id);
    expect(out).toEqual(['a', 'b', 'c', 'd', 'P1', 'e', 'f', 'g', 'h', 'P2']);
  });
  it('is stable when more items are appended (infinite scroll never reshuffles what you see)', () => {
    const pins = [v('P1', 'pin'), v('P2', 'pin')]; const a = weave(['a', 'b', 'c', 'd'].map((x) => v(x)), pins, 4).map((x) => x.id);
    const b = weave(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((x) => v(x)), pins, 4).map((x) => x.id);
    expect(b.slice(0, a.length)).toEqual(a);
  });
  it('shuffle is deterministic per seed and keeps every item', () => {
    const l = PINS.map((p) => p.id); expect(shuffleSeeded(l, 5)).toEqual(shuffleSeeded(l, 5)); expect([...shuffleSeeded(l, 5)].sort()).toEqual([...l].sort());
  });
});
describe('curated pins', () => {
  it('all have unique ids, https posters and Pinterest video files', () => {
    expect(new Set(PINS.map((p) => p.id)).size).toBe(PINS.length); expect(PINS.length).toBe(14);
    for (const p of PINS) { expect(p.kind).toBe('pin'); expect(p.thumb).toMatch(/^https:\/\/i\.pinimg\.com\//); expect(p.srcs?.length).toBeGreaterThan(0); for (const s of p.srcs || []) expect(s).toMatch(/^https:\/\/v1\.pinimg\.com\/videos\/.+\.mp4$/); }
  });
});
