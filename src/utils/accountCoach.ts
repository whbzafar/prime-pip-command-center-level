/**
 * ACCOUNT COACH — live, plain-language risk guidance that changes with the account type:
 *   DEMO     → practise like it is real; shows whether the journal says you are ready for real money
 *   PERSONAL → protect real capital: the 1% rule, daily loss, losing streaks
 *   FUNDED   → challenge maths: room before the daily/overall limit, losses you can afford, target pace
 * Pure and deterministic; every number comes from the account, the journal and the funded engine. Educational — not financial advice.
 */
import type { Trade } from '../types';

export type Tone = 'good' | 'warn' | 'stop';
export interface Coach { tone: Tone; headline: string; lines: string[]; suggestedRiskPct: number | null; checklist?: Array<{ label: string; ok: boolean }> }

export interface FundedFacts {
  phaseLabel: string; remainingDaily: number; remainingOverall: number; dailyLimit: number; overallLimit: number;
  profitRemaining: number; targetDollars: number; recommendedRiskDollars: number; recommendedRiskPct: number;
  consecutiveLosses: number; tradesToday: number; maxDailyTrades: number; locked: boolean; targetPassed: boolean;
  tradingDaysDone?: number; tradingDaysRequired?: number; isFundedLive?: boolean;
}
export interface CoachInput { category: 'DEMO' | 'PERSONAL' | 'FUNDED'; balance: number; riskPct: number; riskAmount: number; trades: Trade[]; funded?: FundedFacts | null }

const r1 = (x: number) => Number(x.toFixed(1));
const $ = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;
const closed = (t: Trade[]) => t.filter((x) => x.status !== 'OPEN' && Number.isFinite(x.rMultiple) && Number.isFinite(x.profitLoss));

/** Demo-to-live readiness from the journal — real numbers only. */
export function demoReadiness(trades: Trade[], balance: number) {
  const c = closed(trades);
  const exp = c.length ? c.reduce((a, t) => a + t.rMultiple, 0) / c.length : 0;
  const clean = c.length ? c.filter((t) => !t.ruleViolation || t.ruleViolation === 'NONE').length / c.length : 0;
  const oversized = balance > 0 ? c.filter((t) => (t.riskAmount || 0) / balance * 100 > 1.001).length : 0;
  return [
    { label: `At least 30 closed trades (you have ${c.length})`, ok: c.length >= 30 },
    { label: `Positive average result per trade (${r1(exp * 10) / 10 >= 0 ? '+' : ''}${exp.toFixed(2)}R)`, ok: c.length >= 30 && exp > 0 },
    { label: `Followed your rules on 80%+ of trades (${Math.round(clean * 100)}%)`, ok: c.length >= 30 && clean >= 0.8 },
    { label: `No trade over 1% risk (${oversized} over)`, ok: c.length >= 10 && oversized === 0 },
  ];
}

export function coachFor(i: CoachInput): Coach {
  const { riskPct, riskAmount, balance } = i;
  const lines: string[] = [];
  if (!(riskPct > 0) || !(riskAmount > 0)) return { tone: 'good', headline: 'Enter your stop-loss and lot size to see live guidance.', lines: [], suggestedRiskPct: null };

  if (i.category === 'FUNDED' && i.funded) {
    const f = i.funded;
    if (f.targetPassed) return { tone: 'warn', headline: 'Target reached — protect the pass.', lines: [f.tradingDaysRequired && (f.tradingDaysDone || 0) < f.tradingDaysRequired ? `You still need ${f.tradingDaysRequired - (f.tradingDaysDone || 0)} more trading day(s). Take the smallest valid trade, nothing more.` : 'Stop trading this phase and follow your firm\'s steps to advance. Extra trades can only hurt.'], suggestedRiskPct: null };
    if (f.locked) return { tone: 'stop', headline: 'Trading is locked for today.', lines: ['A funded limit is used up or too close. Do not enter — come back after the reset.'], suggestedRiskPct: null };
    let tone: Tone = 'good';
    const usesDaily = f.remainingDaily > 0 ? (riskAmount / f.remainingDaily) * 100 : 999;
    const usesOverall = f.remainingOverall > 0 ? (riskAmount / f.remainingOverall) * 100 : 999;
    if (riskAmount >= f.remainingDaily || riskAmount >= f.remainingOverall) {
      tone = 'stop'; lines.push(`If this stops out you would breach ${riskAmount >= f.remainingOverall ? 'the overall' : 'the daily'} loss limit — the challenge fails instantly. Cut the size.`);
    } else {
      const lossesDaily = Math.floor(f.remainingDaily / riskAmount), lossesAll = Math.floor(f.remainingOverall / riskAmount);
      lines.push(`You can afford ${lossesDaily} losing trade${lossesDaily === 1 ? '' : 's'} like this today and ${lossesAll} in total before a limit is hit.`);
      if (usesDaily > 50) { tone = 'warn'; lines.push(`One loss would burn ${Math.round(usesDaily)}% of today's remaining room. Pros risk well under half of it on a single trade.`); }
      else if (usesDaily > 33) { tone = 'warn'; lines.push(`One loss uses ${Math.round(usesDaily)}% of today's room — aim for a third or less.`); }
    }
    if (riskAmount > f.recommendedRiskDollars * 1.001 && f.recommendedRiskDollars > 0) { if (tone === 'good') tone = 'warn'; lines.push(`Your engine's safe size right now is ${$(f.recommendedRiskDollars)} (${f.recommendedRiskPct.toFixed(2)}%); this trade risks ${$(riskAmount)} (${riskPct}%).`); }
    if (f.consecutiveLosses >= 2) { if (tone === 'good') tone = 'warn'; lines.push(`${f.consecutiveLosses} losses in a row — halve your size until you have one clean win. Losing streaks are where challenges are lost.`); }
    if (f.maxDailyTrades > 0 && f.tradesToday >= f.maxDailyTrades) { tone = 'stop'; lines.push(`You have taken ${f.tradesToday} trades today (limit ${f.maxDailyTrades}). Stop.`); }
    if (f.profitRemaining > 0 && f.targetDollars > 0) {
      const toPass = Math.ceil(f.profitRemaining / (riskAmount * 2));
      const frac = f.profitRemaining / f.targetDollars;
      lines.push(`${$(f.profitRemaining)} to the target. At 1:2 and this size that is about ${toPass} winning trade${toPass === 1 ? '' : 's'} — no need to rush.`);
      if (frac < 0.25 && riskPct > 0.5) { if (tone === 'good') tone = 'warn'; lines.push('You are close to the target: lower the risk (0.25–0.5%) so a single loss cannot undo the work.'); }
    }
    if (f.tradingDaysRequired && (f.tradingDaysDone || 0) < f.tradingDaysRequired) lines.push(`Minimum trading days: ${f.tradingDaysDone || 0}/${f.tradingDaysRequired} done.`);
    const sug = tone === 'good' ? null : Math.max(0.1, Math.min(riskPct, Number(f.recommendedRiskPct.toFixed(2)) || 0.25));
    return { tone, headline: tone === 'good' ? `${f.phaseLabel}: this trade fits your limits.` : tone === 'warn' ? `${f.phaseLabel}: proceed with a smaller size.` : `${f.phaseLabel}: do not take this trade as sized.`, lines, suggestedRiskPct: sug };
  }

  if (i.category === 'DEMO') {
    let tone: Tone = 'good';
    if (riskPct > 2) { tone = 'stop'; lines.push(`${riskPct}% is gambling size. Demo is practice for real money — use the size you would use live (1% or less).`); }
    else if (riskPct > 1) { tone = 'warn'; lines.push(`${riskPct}% is above the 1% standard. Habits formed on demo carry over — trade it like real money.`); }
    else lines.push('Good size. Treat every demo trade as if the money were real: same risk, same rules, no "it\'s only demo" trades.');
    const chk = demoReadiness(i.trades, balance);
    const done = chk.filter((c) => c.ok).length;
    lines.push(done === chk.length ? 'Your journal says you are ready to consider a small real account (start at 0.25% risk).' : `Ready for real money? ${done}/${chk.length} checks met — see the list.`);
    return { tone, headline: tone === 'good' ? 'Demo: practise the real habits.' : 'Demo: size it like real money.', lines, suggestedRiskPct: tone === 'good' ? null : 1, checklist: chk };
  }

  // PERSONAL
  let tone: Tone = 'good';
  if (riskPct > 3) { tone = 'stop'; lines.push(`${riskPct}% on one trade — ten losses in a row is not rare, and at this size that destroys the account. Professionals risk 0.5–1%.`); }
  else if (riskPct > 2) { tone = 'warn'; lines.push(`${riskPct}% is aggressive. Above 2% a normal losing run does serious damage.`); }
  else if (riskPct > 1) { tone = 'warn'; lines.push(`${riskPct}% is above the 1% standard. A 5-loss streak would cost about ${r1(riskPct * 5)}% of the account.`); }
  else lines.push(`${riskPct}% per trade is professional size. A 5-loss streak would cost about ${r1(riskPct * 5)}% — survivable.`);
  const today = new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10);
  const todayLoss = closed(i.trades).filter((t) => t.date === today).reduce((a, t) => a + t.profitLoss, 0);
  if (balance > 0 && todayLoss < 0) {
    const lp = (-todayLoss / balance) * 100;
    lines.push(`Already down ${r1(lp)}% today. ${lp + riskPct > 3 ? 'This trade could take you past a 3% day — stop for today.' : 'Keep the total day under 3%.'}`);
    if (lp + riskPct > 3) tone = 'stop';
  }
  const tail = closed(i.trades).slice(-3); const streak = tail.length === 3 && tail.every((t) => t.profitLoss < 0);
  if (streak) { if (tone === 'good') tone = 'warn'; lines.push('Your last 3 trades were losses — halve the size and take only A+ set-ups, or step away for today.'); }
  return { tone, headline: tone === 'good' ? 'Personal: size is within professional limits.' : tone === 'warn' ? 'Personal: consider a smaller size.' : 'Personal: protect the account — do not take this as sized.', lines, suggestedRiskPct: tone === 'good' ? null : Math.min(1, riskPct) };
}
