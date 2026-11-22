/**
 * MIND ENGINE — trading-psychology analytics computed ONLY from the trader's own journal and check-ins.
 * Patterns are described as observations with their evidence (counts), never as diagnoses. Not medical advice.
 */
import type { Trade } from '../types';
import { pktDate } from './dailyGuard';

export const MIN_N = 6;
const closed = (t: Trade[]) => t.filter((x) => x.status !== 'OPEN' && Number.isFinite(x.profitLoss) && Number.isFinite(x.rMultiple));
const stamp = (t: Trade) => Date.parse(`${t.date}T${t.time || '00:00'}:00+05:00`);
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r2 = (x: number) => Number(x.toFixed(2));

export interface Pattern { id: string; label: string; severity: 'high' | 'medium' | 'info'; evidence: string; action: string }

export function detectPatterns(all: Trade[]): Pattern[] {
  const c = closed(all).sort((a, b) => stamp(a) - stamp(b));
  const out: Pattern[] = [];
  if (c.length < MIN_N) return out;

  // revenge: trades opened within 60 min of a loss
  const after: Trade[] = [], afterBigger: Trade[] = [];
  for (let i = 1; i < c.length; i++) {
    const gap = stamp(c[i]) - stamp(c[i - 1]);
    if (c[i - 1].profitLoss < 0 && gap >= 0 && gap <= 3_600_000) {
      after.push(c[i]);
      if ((c[i].riskAmount || 0) > (c[i - 1].riskAmount || 0) * 1.25 && (c[i - 1].riskAmount || 0) > 0) afterBigger.push(c[i]);
    }
  }
  if (after.length >= 4) {
    const losing = after.filter((t) => t.profitLoss < 0).length;
    out.push({ id: 'revenge', label: 'Quick re-entry after a loss', severity: avg(after.map((t) => t.rMultiple)) < 0 ? 'high' : 'info',
      evidence: `${after.length} trades were opened within an hour of a loss; ${losing} of them lost too (average ${r2(avg(after.map((t) => t.rMultiple)))}R).`,
      action: 'After a loss, stand up and take the 10-minute cooldown in the Calm tab before looking at the chart again.' });
  }
  if (afterBigger.length >= 3) out.push({ id: 'escalation', label: 'Bigger size after a loss', severity: 'high',
    evidence: `${afterBigger.length} times you risked 25%+ more than the trade before, right after a loss.`, action: 'Fix your risk % in advance. Size never goes up after a loss — only down.' });

  // overtrading: days well above own typical
  const perDay = new Map<string, number>(); c.forEach((t) => perDay.set(t.date, (perDay.get(t.date) || 0) + 1));
  const counts = [...perDay.values()].sort((a, b) => a - b);
  if (counts.length >= 5) {
    const med = counts[Math.floor(counts.length / 2)];
    const heavy = [...perDay.entries()].filter(([, n]) => n >= Math.max(med * 2, med + 2));
    if (heavy.length >= 2) {
      const heavyTrades = c.filter((t) => heavy.some(([d]) => d === t.date)), rest = c.filter((t) => !heavy.some(([d]) => d === t.date));
      out.push({ id: 'overtrading', label: 'Overtrading days', severity: avg(heavyTrades.map((t) => t.rMultiple)) < avg(rest.map((t) => t.rMultiple)) ? 'high' : 'info',
        evidence: `${heavy.length} days had far more trades than your usual ${med}. Those days average ${r2(avg(heavyTrades.map((t) => t.rMultiple)))}R per trade versus ${r2(avg(rest.map((t) => t.rMultiple)))}R on normal days.`,
        action: 'Set a maximum trades-per-day in the Pre-Trade Checklist and stop when you reach it.' });
    }
  }

  // cutting winners short
  const w = c.filter((t) => t.profitLoss > 0), l = c.filter((t) => t.profitLoss < 0);
  if (w.length >= MIN_N && l.length >= MIN_N) {
    const aw = avg(w.map((t) => t.rMultiple)), al = Math.abs(avg(l.map((t) => t.rMultiple)));
    if (aw < al * 0.8) out.push({ id: 'cutwinners', label: 'Winners smaller than losers', severity: 'medium',
      evidence: `Your average win is ${r2(aw)}R but your average loss is ${r2(al)}R. This is often a sign of taking profit early out of fear of giving it back — or of moving stops.`,
      action: 'Plan the target before entry and write down why you would exit early. Practise at the lowest rung of the Fear Ladder.' });
  }

  // rule breaking
  const broke = c.filter((t) => t.ruleViolation && t.ruleViolation !== 'NONE');
  if (broke.length >= 4) {
    const rate = Math.round((broke.length / c.length) * 100);
    out.push({ id: 'rules', label: 'Rule breaking', severity: rate >= 25 ? 'high' : 'medium', evidence: `You logged a rule violation on ${broke.length} of ${c.length} trades (${rate}%). They averaged ${r2(avg(broke.map((t) => t.rMultiple)))}R.`, action: 'Pick ONE rule to follow perfectly for the next 10 trades. Everything else can wait.' });
  }

  // feelings that cost you
  const byMood = new Map<string, Trade[]>(); c.forEach((t) => { if (t.preEmotion) byMood.set(String(t.preEmotion), [...(byMood.get(String(t.preEmotion)) || []), t]); });
  const moods = [...byMood.entries()].filter(([, ts]) => ts.length >= MIN_N).map(([m, ts]) => ({ m, n: ts.length, r: avg(ts.map((t) => t.rMultiple)) })).sort((a, b) => a.r - b.r);
  if (moods[0] && moods[0].r < -0.15) out.push({ id: 'mood', label: `Trading while feeling ${moods[0].m.replace(/_/g, ' ').toLowerCase()}`, severity: 'medium',
    evidence: `${moods[0].n} trades taken in this state average ${r2(moods[0].r)}R per trade.`, action: 'When you notice this feeling before a trade, do the breathing exercise first — and skip the trade if it is still there.' });
  return out;
}

/* ───────── Fear Ladder: risk size is earned by discipline, not by hope ───────── */
export const LADDER = [0.25, 0.5, 0.75, 1] as const;
export const NEED_TRADES = 10, NEED_CLEAN = 8;
export interface Rung { cap: number; trades: number; clean: number; unlocked: boolean; passed: boolean }
export function fearLadder(all: Trade[], balance: number) {
  const c = closed(all).sort((a, b) => stamp(a) - stamp(b));
  if (!(balance > 0)) return { available: false as const, rungs: [] as Rung[], current: 0, oversized: 0 };
  const pct = (t: Trade) => ((t.riskAmount || 0) / balance) * 100;
  const rungs: Rung[] = []; let prev = 0; let reached = true; let current = LADDER.length - 1; let found = false;
  for (let i = 0; i < LADDER.length; i++) {
    const cap = LADDER[i];
    const inBand = c.filter((t) => t.riskAmount && pct(t) > prev && pct(t) <= cap + 0.001 || (i === 0 && t.riskAmount && pct(t) <= cap + 0.001));
    const last = inBand.slice(-NEED_TRADES);
    const clean = last.filter((t) => !t.ruleViolation || t.ruleViolation === 'NONE').length;
    const passed = last.length >= NEED_TRADES && clean >= NEED_CLEAN;
    rungs.push({ cap, trades: inBand.length, clean, unlocked: reached, passed });
    if (reached && !passed && !found) { current = i; found = true; }
    reached = reached && passed; prev = cap;
  }
  const allowed = LADDER[current];
  const oversized = c.slice(-20).filter((t) => t.riskAmount && pct(t) > allowed + 0.001).length;
  return { available: true as const, rungs, current, oversized };
}

/* ───────── Daily readiness check-in ───────── */
export interface Checkin { sleep: number; stress: number; mood: number; focus: number }
export const readinessScore = (c: Checkin) => Math.round(((c.sleep + (6 - c.stress) + c.mood + c.focus) / 20) * 100);
export function readinessAdvice(score: number) {
  return score >= 70 ? { level: 'go' as const, text: 'You are in good shape. Trade your plan at normal size.' }
    : score >= 50 ? { level: 'careful' as const, text: 'Below your best. Halve your risk today and take only A+ set-ups.' }
    : { level: 'rest' as const, text: 'Low readiness. The best trade today may be no trade — review charts, journal, or use the demo.' };
}
export function readinessVsResults(checkins: Record<string, Checkin>, trades: Trade[]) {
  const c = closed(trades); const hi: number[] = [], lo: number[] = [];
  const days = new Map<string, Trade[]>(); c.forEach((t) => days.set(t.date, [...(days.get(t.date) || []), t]));
  let hiD = 0, loD = 0;
  for (const [d, ts] of days) { const ck = checkins[d]; if (!ck) continue; const r = avg(ts.map((t) => t.rMultiple)); if (readinessScore(ck) >= 70) { hi.push(r); hiD++; } else { lo.push(r); loD++; } }
  return hiD >= 4 && loD >= 4 ? { highDays: hiD, lowDays: loD, highAvgR: r2(avg(hi)), lowAvgR: r2(avg(lo)) } : null;
}
export const todayKey = (now = Date.now()) => pktDate(now);
