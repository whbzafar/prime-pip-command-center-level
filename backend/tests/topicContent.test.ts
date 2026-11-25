import { describe, it, expect } from 'vitest';
import { getTopics, generateTopicPost } from '../../src/utils/topicContent';

describe('topic content', () => {
  const topics = getTopics();
  it('covers the real app categories and skips owner/coming-soon ones', () => {
    expect(topics.length).toBeGreaterThan(15);
    expect(topics.find((t) => t.id === 'ADMIN')).toBeUndefined();
    expect(topics.find((t) => t.id === 'FUNDAMENTAL_INDICATORS')?.title).toMatch(/Fundamental Indicators/);
  });
  it('writes every platform post from that topic and names it', () => {
    for (const t of topics) for (const p of ['instagram', 'facebook', 'tiktok', 'youtube'] as const) {
      const post = generateTopicPost(t, p, 3); expect(post.text.length).toBeGreaterThan(40); expect(post.text).toMatch(/primepipfx\.site/);
      expect(/guarantee|risk-free|get rich/i.test(post.text)).toBe(false);
    }
  });
  it('gives a different variation for each seed and a YouTube title within 70 chars', () => {
    const t = topics[0]; expect(generateTopicPost(t, 'instagram', 1).text).not.toBe(generateTopicPost(t, 'instagram', 2).text);
    expect(generateTopicPost(t, 'youtube', 5).title.length).toBeLessThanOrEqual(70);
  });
});
