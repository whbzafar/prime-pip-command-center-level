import { describe, expect, it } from 'vitest';
import { PACKS, OUTRO_LINE, OVERVIEW_LINE } from '../../src/data/urduPack';
import { metaFor } from '../../src/utils/publishPack';
import { getTopics } from '../../src/utils/topicContent';

const arabic = /[؀-ۿ]/;
describe('Urdu narration pack', () => {
  it('has a pack for every category the studio offers', () => {
    for (const t of getTopics()) expect(PACKS[t.id], t.id).toBeTruthy();
  });
  it('every line has a title, Roman Urdu text and Urdu script, and is short enough to speak in a reel', () => {
    for (const [id, p] of Object.entries(PACKS)) {
      expect(p.parts.length, id).toBeGreaterThanOrEqual(3);
      for (const [t, r, u] of p.parts) { expect(t.length).toBeGreaterThan(2); expect(r).toMatch(/[a-z]/i); expect(r).not.toMatch(arabic); expect(u).toMatch(arabic); expect(r.split(' ').length, `${id}: ${r}`).toBeLessThanOrEqual(14); }
      expect(p.hook[0]).not.toMatch(arabic); expect(p.hook[1]).toMatch(arabic);
    }
    expect(OUTRO_LINE[1]).toMatch(arabic); expect(OVERVIEW_LINE[1]).toMatch(arabic);
  });
});
describe('publish pack', () => {
  it('writes platform-specific metadata within platform limits', () => {
    const m = metaFor('DASHBOARD', 'Trade Command Dashboard'); expect(m.map((x) => x.platform)).toEqual(['youtube', 'tiktok', 'instagram', 'facebook']);
    const yt = m[0]; expect(yt.title.length).toBeLessThanOrEqual(100); expect(yt.title).toContain('#Shorts'); expect(yt.description).toContain('primepipfx.site');
    expect(m[1].description.length).toBeLessThanOrEqual(2200); expect(m[2].description.length).toBeLessThanOrEqual(2200);
  });
});
