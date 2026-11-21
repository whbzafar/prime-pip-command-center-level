/**
 * Risk-DNA & Execution Firewall — pure engine (no I/O). Every number comes from the trader's own journal:
 *  · Capital capsules: today's risk budget is split across the strategies that have proven live edge
 *    (expectancy over the last 30 closed trades each). Proven-negative strategies are quarantined (0 risk),
 *    strategies with < 5 trades are on probation (small fixed share).
 *  · Mitosis: every consecutive loss halves the risk allowed on the next trade; hitting the daily-loss limit
 *    freezes the remaining budget for the day.
 *  · Firewall locks: daily trade cap, daily-loss cap, consecutive-loss cooldown, rapid re-entry, optional biometric stress.
 */
import type { Trade } from '../types';

export interface Account { currentEquity?: number; initialBalance?: number; maxDailyLossPercent?: number; maxDailyTrades?: number; targetRiskPerTradePercent?: number; maxRiskPerTradePercent?: number; maxConsecutiveLosses?: number }
export interface Bio { hr: number | null; rmssd: number | null; at: number }
export interface BioBaseline { hr: number; rmssd: number | null }
export type CapsuleState = 'active' | 'probation' | 'quarantined' | 'frozen';
export interface Capsule { id: string; label: string; state: CapsuleState; trades: number; expectancyR: number | null; winRate: number | null; sharePct: number; riskPct: number }
export interface Lock { code: 'DAILY_TRADES' | 'DAILY_LOSS' | 'LOSS_STREAK' | 'REENTRY' | 'BIOMETRIC'; message: string; until: number | null; hard: boolean }
export interface RiskDna {
  today: string; tradesToday: number; lossStreak: number; dayR: number; dayPnl: number; dayLossPct: number;
  baseRiskPct: number; allowedRiskPct: number; mitosisLevel: number; capsules: Capsule[]; locks: Lock[]; locked: boolean; hardLocked: boolean; lockedUntil: number | null;
}

export const KARACHI_OFFSET_MS = 5 * 3600_000;
export const karachiDay = (ms: number) => new Date(ms + KARACHI_OFFSET_MS).toISOString().slice(0, 10);
export const tradeTs = (t: Pick<Trade, 'date' | 'time'>): number => { const v = Date.parse(`${t.date}T${(t.time || '00:00').slice(0, 5)}:00+05:00`); return Number.isFinite(v) ? v : 0; };
const isClosed = (t: Trade) => t.status !== 'OPEN' && (t.result !== undefined || typeof t.profitLoss === 'number');
const isLoss = (t: Trade) => t.result === 'LOSS' || (t.result === undefined && t.profitLoss < 0);
const isWin = (t: Trade) => t.result === 'WIN' || (t.result === undefined && t.profitLoss > 0);
const stratOf = (t: Trade) => String(t.sbtModel || t.strategyModel || t.strategy || 'Unlabelled');

export const COOLDOWN_AFTER_2_LOSSES_MS = 20 * 60_000;
export const REENTRY_MS = 3 * 60_000;
const MITOSIS_STEPS = [1, 0.5, 0.25, 0];

export function computeRiskDna(trades: Trade[], acct: Account, now: number, bio?: Bio | null, base?: BioBaseline | null): RiskDna {
  const today = karachiDay(now);
  const balance = acct.currentEquity || acct.initialBalance || 0;
  const baseRisk = acct.targetRiskPerTradePercent || Math.min(acct.maxRiskPerTradePercent || 1, 1);
  const sorted = [...trades].sort((a, b) => tradeTs(a) - tradeTs(b));
  const dayTrades = sorted.filter((t) => t.date === today);
  const dayClosed = dayTrades.filter(isClosed);
  let lossStreak = 0; for (let i = dayClosed.length - 1; i >= 0; i--) { if (isLoss(dayClosed[i])) lossStreak++; else break; }
  const dayR = dayClosed.reduce((s, t) => s + (Number.isFinite(t.rMultiple) ? t.rMultiple : 0), 0);
  const dayPnl = dayClosed.reduce((s, t) => s + (Number.isFinite(t.profitLoss) ? t.profitLoss : 0), 0);
  const dayLossPct = balance > 0 && dayPnl < 0 ? (-dayPnl / balance) * 100 : 0;

  const locks: Lock[] = [];
  const maxTrades = acct.maxDailyTrades ?? 0;
  if (maxTrades > 0 && dayTrades.length >= maxTrades) locks.push({ code: 'DAILY_TRADES', message: `Daily trade limit reached (${dayTrades.length}/${maxTrades}).`, until: null, hard: true });
  const maxLoss = acct.maxDailyLossPercent ?? 0;
  if (maxLoss > 0 && dayLossPct >= maxLoss) locks.push({ code: 'DAILY_LOSS', message: `Daily loss limit reached (${dayLossPct.toFixed(2)}% of ${maxLoss}%). Remaining risk budget is frozen until tomorrow.`, until: null, hard: true });
  const maxStreak = acct.maxConsecutiveLosses && acct.maxConsecutiveLosses > 0 ? acct.maxConsecutiveLosses : 3;
  const lastClosed = dayClosed[dayClosed.length - 1];
  if (lossStreak >= maxStreak) locks.push({ code: 'LOSS_STREAK', message: `${lossStreak} losses in a row today — capsule quarantined until tomorrow.`, until: null, hard: true });
  else if (lossStreak >= 2 && lastClosed) {
    const until = tradeTs(lastClosed) + COOLDOWN_AFTER_2_LOSSES_MS;
    if (until > now) locks.push({ code: 'LOSS_STREAK', message: `${lossStreak} consecutive losses — cooling down before the next trade.`, until, hard: false });
  }
  const lastTrade = dayTrades[dayTrades.length - 1];
  if (lastTrade) { const until = tradeTs(lastTrade) + REENTRY_MS; if (until > now && tradeTs(lastTrade) <= now + 60_000) locks.push({ code: 'REENTRY', message: 'Re-entry too soon after your last trade (impulse guard).', until, hard: false }); }
  let stressed = false;
  if (bio && base && now - bio.at < 45_000) {
    const hrHigh = bio.hr !== null && bio.hr > base.hr * 1.2;
    const hrvLow = bio.rmssd !== null && base.rmssd !== null && bio.rmssd < base.rmssd * 0.6;
    stressed = hrHigh || hrvLow;
    if (stressed) locks.push({ code: 'BIOMETRIC', message: `Nervous-system check: ${hrHigh ? `heart rate ${Math.round(bio.hr!)} bpm vs calm ${Math.round(base.hr)}` : `HRV ${Math.round(bio.rmssd!)} ms vs calm ${Math.round(base.rmssd!)}`}. Breathe until it settles.`, until: null, hard: false });
  }

  const mitosisLevel = Math.min(lossStreak, MITOSIS_STEPS.length - 1);
  let allowed = baseRisk * MITOSIS_STEPS[mitosisLevel];
  if (stressed) allowed *= 0.5;
  const hard = locks.some((l) => l.hard);
  if (hard) allowed = 0;

  // capsules by live statistical edge
  const closed = sorted.filter(isClosed);
  const by = new Map<string, Trade[]>();
  for (const t of closed) { const k = stratOf(t); by.set(k, [...(by.get(k) || []), t]); }
  const rows = [...by.entries()].map(([id, list]) => {
    const recent = list.slice(-30);
    const n = recent.length;
    const exp = n ? recent.reduce((s, t) => s + (Number.isFinite(t.rMultiple) ? t.rMultiple : isWin(t) ? 1 : isLoss(t) ? -1 : 0), 0) / n : null;
    const wr = n ? (recent.filter(isWin).length / n) * 100 : null;
    const state: CapsuleState = n < 5 ? 'probation' : (exp ?? 0) > 0 ? 'active' : 'quarantined';
    return { id, n, exp, wr, state };
  }).sort((a, b) => (b.exp ?? -9) - (a.exp ?? -9)).slice(0, 8);
  const proven = rows.filter((r) => r.state === 'active');
  const prob = rows.filter((r) => r.state === 'probation');
  const probShare = prob.length ? Math.min(25, 8 * prob.length) : 0;
  const provenTotal = proven.reduce((s, r) => s + (r.exp as number), 0);
  const capsules: Capsule[] = rows.map((r) => {
    let share = 0;
    if (r.state === 'active') share = provenTotal > 0 ? ((100 - (proven.length ? probShare : 0)) * (r.exp as number)) / provenTotal : 0;
    else if (r.state === 'probation') share = proven.length ? probShare / prob.length : 100 / prob.length;
    const state: CapsuleState = hard ? 'frozen' : r.state;
    return { id: r.id, label: r.id, state, trades: r.n, expectancyR: r.exp === null ? null : Math.round(r.exp * 100) / 100, winRate: r.wr === null ? null : Math.round(r.wr), sharePct: Math.round(share), riskPct: state === 'frozen' || state === 'quarantined' ? 0 : Math.round(allowed * (share / 100) * 100) / 100 };
  });
  const untils = locks.filter((l) => l.until).map((l) => l.until as number);
  return { today, tradesToday: dayTrades.length, lossStreak, dayR: Math.round(dayR * 100) / 100, dayPnl, dayLossPct: Math.round(dayLossPct * 100) / 100, baseRiskPct: baseRisk, allowedRiskPct: Math.round(allowed * 1000) / 1000, mitosisLevel, capsules, locks, locked: locks.length > 0, hardLocked: hard, lockedUntil: untils.length && !hard ? Math.max(...untils) : null };
}
