import { describe, it, expect } from 'vitest';
import { dailyPlan, dayKey, hash32, STYLE_PRESET } from '../../src/utils/dailyPlan';

const topics = ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id, tab: id, title: `Topic ${id}` }));

describe('dailyPlan', () => {
  it('is deterministic for the same date', () => {
    expect(dailyPlan(topics, '2026-11-26')).toEqual(dailyPlan(topics, '2026-11-26'));
  });
  it('changes order and copy seed across days', () => {
    const a = dailyPlan(topics, '2026-11-26').map((p) => p.seed);
    const b = dailyPlan(topics, '2026-11-27').map((p) => p.seed);
    expect(a).not.toEqual(b);
  });
  it('keeps every topic exactly once', () => {
    const ids = dailyPlan(topics, '2026-11-26').map((p) => p.topic.id).sort();
    expect(ids).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
  it('puts topics recorded most recently last', () => {
    const p = dailyPlan(topics, '2026-11-26', ['C', 'A']);
    const ids = p.map((x) => x.topic.id);
    expect(ids.indexOf('C')).toBeGreaterThanOrEqual(3);
    expect(ids.indexOf('A')).toBeGreaterThanOrEqual(3);
  });
  it('respects the limit and keeps themes in range', () => {
    const p = dailyPlan(topics, '2026-11-26', [], 3);
    expect(p).toHaveLength(3);
    p.forEach((x) => expect(x.theme).toBeLessThan(STYLE_PRESET.backgrounds.length));
  });
  it('returns an empty plan for no topics', () => {
    expect(dailyPlan([], '2026-11-26')).toEqual([]);
  });
  it('formats UTC day keys and hashes deterministically', () => {
    expect(dayKey(new Date('2026-11-26T23:30:00Z'))).toBe('2026-11-26');
    expect(hash32('x')).toBe(hash32('x'));
  });
});
