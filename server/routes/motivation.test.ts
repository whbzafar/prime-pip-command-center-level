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
  it('explicit titles never pass any vibe', () => { for (const v of ['sigma', 'intense', 'trader', 'nature', 'serene', 'dreamy', 'stories'] as const) expect(passes(mv('f', 'Hot bikini luxury yacht party'), v, false)).toBe(false); });
  it('reels need short clips or flagged shorts', () => { expect(passes(mv('g', 'Calm ocean', { duration: '0:45' }), 'nature', true)).toBe(true); expect(passes(mv('h', 'Calm ocean', { duration: '12:00' }), 'nature', true)).toBe(false); expect(passes(mv('i', 'Sigma short', { short: true, duration: '0:30' }), 'sigma', true)).toBe(true); });
  it('for-you mix favours the viewer’s taste but still includes every vibe, with no duplicates', () => {
    const mk = (p: string, n: number) => Array.from({ length: n }, (_, i) => mv(`${p}${i}`, p));
    const out = mixLists({ nature: mk('n', 30), sigma: mk('s', 30), dreamy: mk('d', 30) }, { nature: 11, sigma: 1, dreamy: 1 });
    const first24 = out.slice(0, 24); const c = (p: string) => first24.filter((v) => v.id.startsWith(p)).length;
    expect(c('n')).toBeGreaterThan(c('s') * 3); expect(c('s')).toBeGreaterThanOrEqual(1); expect(c('d')).toBeGreaterThanOrEqual(1); expect(new Set(out.map((v) => v.id)).size).toBe(out.length);
  });
});

describe('premium gates', () => {
  it('drops low-traction uploads for intense/dreams but not when views are unknown', () => {
    expect(passes(mv('p1', 'Thomas Shelby mindset edit', { duration: '1:10', views: 900 }), 'intense', false)).toBe(false);
    expect(passes(mv('p2', 'Thomas Shelby mindset edit', { duration: '1:10', views: 2_400_000 }), 'intense', false)).toBe(true);
    expect(passes(mv('p3', 'Dream mansion cinematic', { duration: '3:00', views: 5_000_000 }), 'dreamy', false)).toBe(true);
  });
  it('intense must be an actual edit/Shelby-style clip, not a generic speech', () => { expect(passes(mv('q1', 'RICH VS POOR MINDSET interview', { duration: '10:00', views: 9e6 }), 'intense', false)).toBe(false); expect(passes(mv('q2', 'Thomas Shelby | Peaky Blinders edit', { duration: '1:00', views: 9e5 }), 'intense', false)).toBe(true); });
  it('dreams reject listings, vlogs and price tours', () => { expect(passes(mv('q3', 'Yacht For Sale tour $40 million', { duration: '3:00', views: 9e5 }), 'dreamy', false)).toBe(false); });
  it('dreams keep luxury cars/villas with music, reject party/model clips', () => {
    expect(passes(mv('p4', 'Luxury villa ocean view cinematic music', { duration: '4:00', views: 100000 }), 'dreamy', false)).toBe(true);
    expect(passes(mv('p5', 'Luxury yacht party girls', { duration: '4:00', views: 100000 }), 'dreamy', false)).toBe(false);
  });
  it('intense rejects gang/crime glorification', () => { expect(passes(mv('p6', 'Gangster revenge edit', { duration: '2:00', views: 900000 }), 'intense', false)).toBe(false); });
});

import { hostAllowed, rankSrcs, guessVibe } from '../pinResolve';
describe('pin resolver', () => {
  it('only fetches Pinterest hosts (no SSRF)', () => {
    for (const u of ['https://pin.it/abc', 'https://www.pinterest.com/pin/1/', 'https://in.pinterest.com/pin/2/']) expect(hostAllowed(u)).toBe(true);
    for (const u of ['http://pin.it/abc', 'https://evil.com/?pinterest.com', 'https://pinterest.com.evil.com/', 'https://localhost/pin/1', 'file:///etc/passwd', 'https://169.254.169.254/']) expect(hostAllowed(u)).toBe(false);
  });
  it('ranks H.264 before AV1 before HEVC and drops non-video hosts', () => {
    const r = rankSrcs(['https://v1.pinimg.com/videos/iht/hevcMp4V3/a_720w.mp4', 'https://v1.pinimg.com/videos/iht/av1Mp4-enabled-v4-t/a_720w.mp4', 'https://v1.pinimg.com/videos/iht/expMp4/a_720w.mp4', 'https://evil.com/x.mp4']);
    expect(r[0]).toContain('expMp4'); expect(r[1]).toContain('av1'); expect(r[2]).toContain('hevc'); expect(r.length).toBe(3);
  });
  it('guesses a sensible category', () => { expect(guessVibe('Thomas Shelby')).toBe('intense'); expect(guessVibe('Luxury villa')).toBe('dreamy'); expect(guessVibe('Rain forest')).toBe('nature'); expect(guessVibe('Soft clouds')).toBe('serene'); });
});

describe('trader mind', () => {
  it('keeps real trading-psychology teaching, rejects signal sellers and hype', () => {
    expect(passes(mv('t1', 'Trading Psychology: How to Control Your Emotions', { duration: '14:00', views: 400000 }), 'trader', false)).toBe(true);
    expect(passes(mv('t2', 'Forex Signals 100% win rate telegram', { duration: '8:00', views: 400000 }), 'trader', false)).toBe(false);
    expect(passes(mv('t3', 'Best pasta recipe', { duration: '8:00', views: 400000 }), 'trader', false)).toBe(false);
  });
});
