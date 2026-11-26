import { describe, it, expect } from 'vitest';
import { qualityCheck, classifyComments, reportFrom, planFrom, campaign, similarity, extractFigures, logPerf, type Brand } from '../../server/socialBrain';

const brand: Brand = { name: 'PRIMEPIPFX', site: 'https://primepipfx.site', founder: 'Wahab Zafar', logoUrl: '', colors: [], typography: '', voice: '', slogans: [], audience: '', products: [], allowedFigures: ['31'], guidelines: [] };
const good = 'See the Backtesting tab replay 31 pairs bar by bar. Learn at primepipfx.site. Educational content, not financial advice. Trading carries risk.';
const perf = (ct: any, n: number, saves: number, views = 100, at = Date.now()) => Array.from({ length: n }, (_, i) => ({ id: `${ct}${i}`, postId: '', platform: 'instagram' as const, contentType: ct, at: new Date(at).toISOString(), views, saves, shares: 0, comments: 0, completion: 0, followerGain: 1, profileVisits: 0 }));

describe('quality gate', () => {
  it('passes a clean, verified post', () => { expect(qualityCheck({ platform: 'instagram', caption: good }, [], brand).pass).toBe(true); });
  it('blocks profit promises, missing link, missing risk line, unverified figures', () => {
    const r = qualityCheck({ platform: 'instagram', caption: 'Guaranteed profit with 90% win rate at primepipfx.site' }, [], brand);
    expect(r.pass).toBe(false); expect(r.blockers.join(' ')).toMatch(/penalise/); expect(r.blockers.join(' ')).toMatch(/risk line/); expect(r.blockers.join(' ')).toMatch(/90%/);
    expect(qualityCheck({ platform: 'instagram', caption: 'Hello world' }, [], brand).blockers.join(' ')).toMatch(/official link/);
  });
  it('blocks near-duplicates and flags vertical-format mismatch', () => {
    expect(qualityCheck({ platform: 'instagram', caption: good }, [good], brand).pass).toBe(false);
    const r = qualityCheck({ platform: 'tiktok', caption: good, video: { width: 1920, height: 1080, durationSec: 20 } }, [], brand);
    expect(r.warnings.join(' ')).toMatch(/9:16/);
  });
  it('extracts figures and measures similarity sensibly', () => { expect(extractFigures('up 5% and $200 and 31 pairs')).toEqual(['5%', '$200', '31 pairs']); expect(similarity('alpha beta gamma', 'alpha beta gamma')).toBe(1); expect(similarity('', 'x')).toBe(0); });
});

describe('community triage', () => {
  it('classifies and routes sensitive items to a human', () => {
    const [spam, complaint, question, urdu] = classifyComments(['Earn money daily at bit.ly/x', 'This is a scam, I want my refund', 'How do I start?', 'Kya ye free hai? kaise start karein'], brand);
    expect(spam.category).toBe('spam'); expect(spam.reply).toBeNull();
    expect(complaint.needsHuman).toBe(true);
    expect(question.reply).toContain('primepipfx.site');
    expect(urdu.language).toBe('roman-urdu');
  });
  it('never drafts a price', () => {
    const [i] = classifyComments(['what is the price?'], brand); expect(i.reply).not.toMatch(/\$|PKR|Rs/);
  });
});

describe('results, report and calendar (only from logged records)', () => {
  it('refuses a report with fewer than 5 posts', () => { expect(reportFrom(perf('educational-video', 3, 5)).enough).toBe(false); });
  it('reports the best and weakest types from the numbers', () => {
    const data = [...perf('educational-video', 3, 20), ...perf('promotional-poster', 3, 1)];
    const r: any = reportFrom(data); expect(r.enough).toBe(true); expect(r.lines[0]).toMatch(/Repeat educational-video/); expect(r.lines.join(' ')).toMatch(/Reduce promotional-poster/);
  });
  it('keeps the default calendar until two types have 3+ posts, then adapts one day', () => {
    expect(planFrom([]).basis).toBe('default');
    const p: any = planFrom([...perf('short-form-video', 3, 30), ...perf('weekly-highlights', 3, 0)]);
    expect(p.basis).toBe('performance'); expect(p.days.some((d: any) => d.changed)).toBe(true);
  });
  it('rejects negative numbers', () => { expect(logPerf({ platform: 'tiktok', contentType: 'short-form-video', views: -1 }).ok).toBe(false); });
});

describe('campaign planner', () => {
  it('never invents an audience and every day passes the gate', () => {
    const c = campaign('Introduce PrimePipFX', [{ id: 'A', title: 'Backtesting', short: 'Replay bars.', features: ['Replay'] }], brand);
    expect(c.audience).toMatch(/Not set yet/); expect(c.calendar).toHaveLength(7); expect(c.calendar.every((d) => d.qc.pass)).toBe(true);
  });
});

import { buildAsset, transition } from '../../server/socialBrain';
describe('content library and approval queue', () => {
  const ok = { platform: 'instagram', title: 'Backtesting', text: good, hooks: ['Most traders skip replay'], cta: 'Open primepipfx.site', hashtags: ['forex'] };
  it('marks a clean asset as draft and a flawed one as blocked', () => {
    expect(buildAsset(ok, [], brand).status).toBe('draft');
    expect(buildAsset({ ...ok, text: 'Guaranteed profit' }, [], brand).status).toBe('blocked');
  });
  it('blocks duplicate text against existing assets', () => { expect(buildAsset(ok, [good], brand).qc.pass).toBe(false); });
  it('cannot approve a blocked asset and must approve before publishing', () => {
    const blocked = buildAsset({ ...ok, text: 'Guaranteed profit' }, [], brand);
    expect(transition(blocked, 'approved').ok).toBe(false);
    const d = buildAsset(ok, [], brand);
    expect(transition(d, 'published').ok).toBe(false);
    const a = transition(d, 'approved'); expect(a.ok).toBe(true);
    const p = transition(a.asset!, 'published'); expect(p.ok).toBe(true); expect(p.asset!.history.length).toBe(3);
    expect(transition(p.asset!, 'draft').ok).toBe(false);
  });
});

import { carouselSlides, textFor, DEFAULT_LOOK, RISK } from '../../src/utils/posterStudio';
describe('poster studio content rules', () => {
  const look = { ...DEFAULT_LOOK, slogans: [] as string[] };
  it('every graphic carries the site and the risk line', () => {
    const t = textFor({ kind: 'poster', headline: 'Backtesting', sub: 'Replay bars.' }, look);
    expect(t).toContain('primepipfx.site'); expect(t).toContain(RISK);
  });
  it('never shows a slogan that is not in Brand memory', () => {
    expect(textFor({ kind: 'poster', headline: 'X', showSlogan: true }, look)).not.toMatch(/slogan/i);
  });
  it('builds a carousel: cover, one slide per feature, then a call to action', () => {
    const s = carouselSlides({ title: 'Backtesting', short: 'Replay.', features: ['A', 'B', 'C'] }, look);
    expect(s).toHaveLength(5); expect(s[0].headline).toBe('Backtesting'); expect(s[4].headline).toMatch(/inside the app/);
  });
});

import { weekDrafts } from '../../server/socialBrain';
describe('weekly plan to review queue', () => {
  it('makes one draft per planned day, each passing the gate, with its slot recorded', () => {
    const topics = [{ id: 'A', title: 'Backtesting', short: 'Replay bars.', features: ['Replay', 'Stats'] }, { id: 'B', title: 'Risk Management', short: 'Size trades.', features: ['Lot size'] }];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, i) => ({ day, contentType: ['educational-video', 'promotional-poster', 'interesting-facts', 'short-form-video', 'community-engagement', 'brand-advertisement', 'weekly-highlights'][i] }));
    const drafts = weekDrafts(topics, brand, days);
    expect(drafts).toHaveLength(7);
    drafts.forEach((d) => { expect(d.slot.day).toBeTruthy(); expect(buildAsset(d, [], brand).qc.pass).toBe(true); });
    expect(weekDrafts([], brand, days)).toEqual([]);
  });
});

import { parseScript } from '../../server/scriptWriter';
import { buildSsml, escapeXml } from '../../server/voice';
describe('Urdu voice and Roman Urdu script', () => {
  const json = JSON.stringify({ hooks: ['Most traders skip replay', 'Replay bars before you risk money', 'Kya aap ye tool use karte hain?'], hooksUrdu: ['زیادہ تر تاجر ری پلے چھوڑ دیتے ہیں', 'پیسہ لگانے سے پہلے ری پلے کریں', 'کیا آپ یہ ٹول استعمال کرتے ہیں؟'], scenes: [{ say: 'Replay bars one by one.', caption: 'Bar replay', focus: 'center', zoom: 1.1, scroll: 0, urdu: 'بارز کو ایک ایک کر کے دیکھیں۔' }, { say: 'Check your stats.', caption: 'Check stats', focus: 'left', zoom: 1.2, scroll: 0.2, urdu: 'اپنے اعداد و شمار دیکھیں۔' }, { say: 'Learn first.', caption: 'Learn first', focus: 'right', zoom: 1.1, scroll: 0.4, urdu: 'پہلے سیکھیں۔' }], cta: 'Try it at primepipfx.site', ctaUrdu: 'primepipfx.site پر جائیں', caption: 'Learn the replay. Educational content, not financial advice.', title: 'Backtesting', hashtags: ['forex'], keywords: ['forex'] });
  it('keeps the Urdu script and the Roman Urdu captions side by side', () => {
    const s = parseScript(json, 'gemini')!;
    expect(s.hooksUrdu?.[0]).toMatch(/[؀-ۿ]/); expect(s.scenes[0].urdu).toMatch(/[؀-ۿ]/); expect(s.scenes[0].caption).toBe('Bar replay'); expect(s.ctaUrdu).toBeTruthy();
  });
  it('rejects a script with a profit promise', () => {
    expect(parseScript(json.replace('Learn the replay.', 'Guaranteed profit.'), 'gemini')).toBeNull();
  });
  it('builds a safe Pakistani Urdu SSML request with the female voice', () => {
    const x = buildSsml('A & B <tag>', 'ur');
    expect(x).toContain('ur-PK-UzmaNeural'); expect(x).toContain('xml:lang=\'ur-PK\''); expect(x).toContain('&amp;'); expect(x).not.toContain('<tag>');
    expect(escapeXml("'")).toBe('&apos;');
  });
});
