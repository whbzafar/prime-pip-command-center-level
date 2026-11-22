import { describe, it, expect } from 'vitest';
import { emptyTaste, record, weights, weightParam, decay, topVibe } from './tasteProfile';
const v = (vibe: string, id = 'a') => ({ id, title: 't ' + id, vibe });
describe('taste profile', () => {
  it('starts balanced (no weights) until there is signal', () => { expect(weights(emptyTaste())).toEqual({}); expect(weights(record(emptyTaste(), 'reel_skip', v('nature')))).toEqual({}); });
  it('learns what the viewer plays and saves', () => {
    let t = emptyTaste(); t = record(t, 'play', v('nature', '1')); t = record(t, 'save', v('nature', '1')); t = record(t, 'play', v('sigma', '2'));
    const w = weights(t); expect(w.nature).toBe(10); expect(w.sigma).toBe(4); expect(topVibe(t)).toBe('nature'); expect(weightParam(w)).toContain('nature:10');
  });
  it('quick skips lower interest, unknown vibes are ignored', () => {
    let t = record(emptyTaste(), 'play', v('dreamy', '1')); t = record(t, 'reel_skip', v('dreamy', '2')); expect(t.scores.dreamy).toBe(2);
    expect(record(emptyTaste(), 'play', v('bogus')).scores).toEqual({});
  });
  it('remembers watched ids (most recent first, capped) for fresh feeds', () => {
    let t = emptyTaste(); for (let i = 0; i < 450; i++) t = record(t, 'play', v('nature', 'v' + i));
    expect(t.seen.length).toBe(400); expect(t.seen[0]).toBe('v449'); expect(t.recent.length).toBe(12);
  });
  it('old interest fades once per day', () => {
    const t = decay({ ...record(emptyTaste(), 'save', v('serene')), day: '2026-11-21' }, '2026-11-22'); expect(t.scores.serene).toBe(4.5);
    expect(decay(t, '2026-11-22')).toBe(t);
  });
});
