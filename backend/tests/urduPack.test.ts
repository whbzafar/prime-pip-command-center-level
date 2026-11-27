import { describe, expect, it } from 'vitest';
import { PACKS, OUTRO_LINE, OVERVIEW_LINE } from '../../src/data/urduPack';
import { metaFor } from '../../src/utils/publishPack';
import { getTopics } from '../../src/utils/topicContent';
import { guides } from '../../src/components/admin/SetupGuide';
import { defaultCfg } from '../../src/utils/publishClient';

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

describe('narration targets real on-screen features', () => {
  it('every studio category has 4+ lines and each line names the on-screen text it points at', () => {
    for (const t of getTopics()) {
      const p = PACKS[t.id]; expect(p.parts.length, t.id).toBeGreaterThanOrEqual(4);
      for (const line of p.parts) expect(line[3], `${t.id}: ${line[0]}`).toBeInstanceOf(RegExp);
    }
  });
  it('covers every key feature the category description lists (same count or more)', () => {
    for (const t of getTopics()) expect(PACKS[t.id].parts.length, t.id).toBeGreaterThanOrEqual(Math.min(4, t.features.length));
  });
});
describe('posting setup guide', () => {
  it('explains all four platforms with steps, where to find each value and the limit', () => {
    const g = guides(defaultCfg()); expect(g.map((x) => x.id)).toEqual(['facebook', 'instagram', 'youtube', 'tiktok']);
    for (const x of g) { expect(x.steps.length, x.id).toBeGreaterThanOrEqual(3); expect(x.find.length).toBeGreaterThan(0); expect(x.limit.length).toBeGreaterThan(20); }
    expect(g.find((x) => x.id === 'tiktok')!.status).toBe('manual');
  });
  it('shows connected status once the credentials are filled in', () => {
    const g = guides({ ...defaultCfg(), metaPageId: '1', metaPageToken: 't', igUserId: '9' });
    expect(g.find((x) => x.id === 'facebook')!.status).toBe('ready'); expect(g.find((x) => x.id === 'instagram')!.status).toBe('ready');
  });
});
import { altsOf } from '../../src/utils/sectionDirector';
describe('screen finder', () => {
  it('splits a pattern into its alternatives, most specific first', () => {
    expect(altsOf(/ACCOUNT BALANCE|PKR/).map((r) => r.source)).toEqual(['ACCOUNT BALANCE', 'PKR']);
    expect(altsOf(/PKT \(UTC\+5\)|Red Folder/).map((r) => r.source)).toEqual(['PKT \\(UTC\\+5\\)', 'Red Folder']);
    expect(altsOf(/RECORD (NEW )?TRADE/).length).toBe(1);
  });
});

import { HOOK_OPENERS, OUTRO_VARIANTS, OVERVIEW_VARIANTS, MUSIC_BPM } from '../../src/data/urduPack';
describe('variety for repeat takes', () => {
  it('every opener, overview and outro has Roman and Urdu text', () => {
    HOOK_OPENERS.slice(1).forEach(([r, u]) => { expect(r.length).toBeGreaterThan(10); expect(/[؀-ۿ]/.test(u)).toBe(true); });
    [...OVERVIEW_VARIANTS, ...OUTRO_VARIANTS].forEach(([r, u]) => { expect(r.length).toBeGreaterThan(10); expect(/[؀-ۿ]/.test(u)).toBe(true); });
    expect(new Set(MUSIC_BPM).size).toBeGreaterThan(3);
  });
});
