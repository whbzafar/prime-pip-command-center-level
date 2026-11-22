/** DAILY DISCIPLINE GUARD — today's (Pakistan-time) results from the trader's own journal vs. their own limits. */
import type { Trade } from '../types';

export interface Limits { maxDailyLossPct: number; maxTrades: number; maxLossStreak: number }
export const DEFAULT_LIMITS: Limits = { maxDailyLossPct: 3, maxTrades: 6, maxLossStreak: 3 };
export type Status = 'pass' | 'warn' | 'fail' | 'skip';

export const pktDate = (ms: number) => new Date(ms + 5 * 3_600_000).toISOString().slice(0, 10);

export function todayStats(trades: Trade[], balance: number, now = Date.now()) {
  const today = pktDate(now);
  const mine = trades.filter((t) => t.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const closed = mine.filter((t) => t.status !== 'OPEN');
  const pnl = closed.reduce((a, t) => a + (Number.isFinite(t.profitLoss) ? t.profitLoss : 0), 0);
  let streak = 0;
  for (let i = closed.length - 1; i >= 0 && closed[i].profitLoss < 0; i--) streak++;
  return { trades: mine.length, pnl: Number(pnl.toFixed(2)), lossPct: balance > 0 ? Number((Math.max(0, -pnl) / balance * 100).toFixed(2)) : null, lossStreak: streak };
}

export function disciplineChecks(trades: Trade[], balance: number, limits: Limits, now = Date.now()): Array<{ id: string; title: string; status: Status; detail: string }> {
  const s = todayStats(trades, balance, now);
  const out: Array<{ id: string; title: string; status: Status; detail: string }> = [];
  if (s.lossPct === null) out.push({ id: 'dloss', title: 'Daily loss limit', status: 'skip', detail: 'Account balance unknown — set it in your account settings.' });
  else out.push({ id: 'dloss', title: 'Daily loss limit', status: s.lossPct >= limits.maxDailyLossPct ? 'fail' : s.lossPct >= limits.maxDailyLossPct * 0.7 ? 'warn' : 'pass',
    detail: s.lossPct >= limits.maxDailyLossPct ? `You are already down ${s.lossPct}% today — your limit is ${limits.maxDailyLossPct}%. Stop for the day.` : `Down ${s.lossPct}% today of your ${limits.maxDailyLossPct}% limit.` });
  out.push({ id: 'dcount', title: 'Trades today', status: s.trades >= limits.maxTrades ? 'fail' : s.trades >= limits.maxTrades - 1 ? 'warn' : 'pass', detail: `${s.trades} trade${s.trades === 1 ? '' : 's'} logged today (limit ${limits.maxTrades}).` });
  out.push({ id: 'dstreak', title: 'Losing streak', status: s.lossStreak >= limits.maxLossStreak ? 'fail' : s.lossStreak === limits.maxLossStreak - 1 ? 'warn' : 'pass', detail: s.lossStreak ? `${s.lossStreak} losses in a row today (limit ${limits.maxLossStreak}).` : 'No losing streak today.' });
  return out;
}
