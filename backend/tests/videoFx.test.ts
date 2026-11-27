import { describe, expect, it } from 'vitest';
import { GRADES, pickSkills } from '../../src/utils/videoFx';

describe('video skills', () => {
  it('always picks five different skills plus grade, grain and vignette', () => {
    for (let take = 0; take < 24; take++) { const p = pickSkills(take); expect(new Set(p.skills).size).toBe(5); expect(p.labels).toContain('Film grain'); expect(p.labels).toContain('Vignette'); expect(GRADES).toContain(p.grade); }
  });
  it('varies the mix between takes', () => {
    const mixes = new Set(Array.from({ length: 8 }, (_, t) => pickSkills(t).skills.slice().sort().join(',')));
    expect(mixes.size).toBeGreaterThan(2);
  });
});
