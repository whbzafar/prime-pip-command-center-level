import { describe, it, expect } from 'vitest';
import { classifyQuery, TOPICS } from '../motivation';
describe('motivation safety', () => {
  it('allows uplifting searches', () => { for (const q of ['motivation', 'never give up', 'comeback story', 'trading discipline', '']) expect(classifyQuery(q)).toBe('ok'); });
  it('blocks inappropriate searches', () => { for (const q of ['porn', 'casino betting', 'violent fight', 'nude']) expect(classifyQuery(q)).toBe('blocked'); });
  it('routes self-harm to support, not videos', () => { expect(classifyQuery('i want to die')).toBe('support'); expect(classifyQuery('suicide')).toBe('support'); });
  it('curated topics are themselves safe', () => { for (const t of TOPICS) expect(classifyQuery(t)).toBe('ok'); });
});
