import { describe, it, expect, beforeEach } from 'vitest';
import { compliant, generatePosts, setConfig, readState, BEST_TIMES_PKT, updatePost } from '../../server/socialAgent';
import { safeWriteJsonFile } from '../../server/dataPath';

describe('social growth agent', () => {
  beforeEach(() => { safeWriteJsonFile('social_agent.json', { config: {}, posts: [] }); });

  it('blocks profit guarantees and income promises', () => {
    expect(compliant('Guaranteed profit every day')).toBe(false);
    expect(compliant('100% win rate indicator')).toBe(false);
    expect(compliant('Risk-free trading')).toBe(false);
    expect(compliant('Backtest your strategy on past prices')).toBe(true);
  });

  it('writes template posts for all platforms with risk line, hashtags and PKT slots', async () => {
    setConfig({ enabled: true, mode: 'review' });
    const posts = await generatePosts(null, { count: 2 });
    expect(posts.length).toBe(8);
    for (const p of posts) {
      expect(p.caption).toContain('not financial advice');
      expect(p.hashtags.length).toBeGreaterThan(2);
      expect(Date.parse(p.scheduledAt)).toBeGreaterThan(Date.now());
      expect(compliant(p.caption)).toBe(true);
    }
    expect(posts.filter((p) => p.platform === 'youtube' || p.platform === 'tiktok').every((p) => p.status === 'manual')).toBe(true);
    for (const p of posts) { expect(p.hooks.length).toBeGreaterThan(1); expect(p.slides.length).toBeGreaterThan(2); expect(p.score.total).toBeGreaterThan(40); }
    const tt = posts.find((p) => p.platform === 'tiktok')!; expect(tt.beats.length).toBeGreaterThan(3);
    expect(posts.filter((p) => p.platform === 'facebook').every((p) => p.status === 'draft')).toBe(true);
    // scheduled at one of the platform's PKT windows
    const fb = posts.find((p) => p.platform === 'facebook')!;
    const pkt = new Date(Date.parse(fb.scheduledAt) + 5 * 3600_000);
    const hhmm = `${String(pkt.getUTCHours()).padStart(2, '0')}:${String(pkt.getUTCMinutes()).padStart(2, '0')}`;
    expect(BEST_TIMES_PKT.facebook).toContain(hhmm);
  });

  it('auto mode approves posts and never reuses a slot', async () => {
    setConfig({ mode: 'auto' });
    const posts = await generatePosts(null, { platform: 'facebook', count: 4 });
    expect(posts.every((p) => p.status === 'approved')).toBe(true);
    expect(new Set(posts.map((p) => p.scheduledAt)).size).toBe(4);
  });

  it('learns from ratings: a liked topic is reused first once all topics were used', async () => {
    const first = await generatePosts(null, { platform: 'facebook', count: 8 });
    const liked = first[2].pillar; updatePost(first[2].id, { rating: 'good' });
    const next = await generatePosts(null, { platform: 'facebook', count: 1 });
    expect(next[0].pillar).toBe(liked);
  });

  it('refuses edits that add banned claims', async () => {
    const [p] = await generatePosts(null, { platform: 'instagram', count: 1 });
    expect(() => updatePost(p.id, { caption: 'Guaranteed profits!' })).toThrow();
    expect(readState().posts.length).toBe(1);
  });
});
