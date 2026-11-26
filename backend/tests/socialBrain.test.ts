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
