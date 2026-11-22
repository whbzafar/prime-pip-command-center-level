import { describe, it, expect } from 'vitest';
import { classifyQuery, TOPICS } from '../motivation';
describe('motivation safety', () => {
  it('allows uplifting searches', () => { for (const q of ['motivation', 'never give up', 'comeback story', 'trading discipline', '']) expect(classifyQuery(q)).toBe('ok'); });
  it('blocks inappropriate searches', () => { for (const q of ['porn', 'casino betting', 'violent fight', 'nude']) expect(classifyQuery(q)).toBe('blocked'); });
  it('routes self-harm to support, not videos', () => { expect(classifyQuery('i want to die')).toBe('support'); expect(classifyQuery('suicide')).toBe('support'); });
  it('curated topics are themselves safe', () => { for (const t of TOPICS) expect(classifyQuery(t)).toBe('ok'); });
});

import { passes, mixLists, type MVideo } from '../motivation';
const mv = (id: string, title: string, o: Partial<MVideo> = {}): MVideo => ({ id, title, channel: 'Ch', thumb: '', duration: '5:00', source: 'search', ...o });
describe('vibe quality gates', () => {
  it('nature allows long ambience, stories do not', () => { const v = mv('a', 'Relaxing forest rain 2 hours', { duration: '2:00:00' }); expect(passes(v, 'nature', false)).toBe(true); expect(passes(v, 'stories', false)).toBe(false); });
  it('lyric/music-video dumps are rejected', () => { expect(passes(mv('b', 'Sia - Never Give Up (Lyrics)'), 'stories', false)).toBe(false); expect(passes(mv('c', 'Sad song official video ft. X', { duration: '3:00' }), 'serene', false)).toBe(false); });
  it('sigma drops woman-bashing / dating content but keeps discipline', () => { expect(passes(mv('d', 'Silent discipline mindset'), 'sigma', false)).toBe(true); expect(passes(mv('e', 'Sigma rules for dating women'), 'sigma', false)).toBe(false); });
  it('explicit titles never pass any vibe', () => { for (const v of ['sigma', 'nature', 'serene', 'dreamy', 'stories'] as const) expect(passes(mv('f', 'Hot bikini luxury yacht party'), v, false)).toBe(false); });
  it('reels need short clips or flagged shorts', () => { expect(passes(mv('g', 'Calm ocean', { duration: '0:45' }), 'nature', true)).toBe(true); expect(passes(mv('h', 'Calm ocean', { duration: '12:00' }), 'nature', true)).toBe(false); expect(passes(mv('i', 'Sigma short', { short: true, duration: '0:30' }), 'sigma', true)).toBe(true); });
  it('for-you mix favours the viewer’s taste but still includes every vibe, with no duplicates', () => {
    const mk = (p: string, n: number) => Array.from({ length: n }, (_, i) => mv(`${p}${i}`, p));
    const out = mixLists({ nature: mk('n', 30), sigma: mk('s', 30), dreamy: mk('d', 30) }, { nature: 11, sigma: 1, dreamy: 1 });
    const first24 = out.slice(0, 24); const c = (p: string) => first24.filter((v) => v.id.startsWith(p)).length;
    expect(c('n')).toBeGreaterThan(c('s') * 3); expect(c('s')).toBeGreaterThanOrEqual(1); expect(c('d')).toBeGreaterThanOrEqual(1); expect(new Set(out.map((v) => v.id)).size).toBe(out.length);
  });
});
