// Compounding Engine — projection + Monte Carlo realism check
// 100% offline, zero external APIs, pure financial mathematics

export type CompoundingMode = 'FIXED_RISK' | 'PERCENTAGE_COMPOUNDING';

export interface CompoundingInputs {
  startingBalance: number;
  compoundingMode: CompoundingMode;
  riskPercent: number; // e.g. 1.0%
  fixedRiskAmount: number; // e.g. $50
  expectedWinRate: number; // e.g. 60 (60%)
  riskRewardRatio: number; // e.g. 2.0 (2:1)
  tradesPerDay: number; // e.g. 1 or 2
  tradingDaysPerMonth: number; // 21 trading days per month
  calculationMonths: number; // 1, 3, 6, 12, or custom
  customDays?: number;
  startDate?: string | Date;
}

export interface CompoundingWeeklyRow {
  week: number;
  startDateStr: string;
  endDateStr: string;
  startBalance: number;
  pnl: number;
  endBalance: number;
  growthPercent: number;
  tradingDaysCount: number;
}

export interface CompoundingMonthlyRow {
  month: number;
  startDateStr: string;
  endDateStr: string;
  startBalance: number;
  pnl: number;
  endBalance: number;
  growthPercent: number;
  tradingDaysCount: number;
}

export interface CompoundingDayRow {
  day: number;
  dateStr: string; // ISO format YYYY-MM-DD
  dayOfWeek: string; // 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'
  startBalance: number;
  pnl: number;
  endBalance: number;
  nextRisk: number;
  projectedDrawdownBalance: number; // simulated conservative dip
  outcome: 'TP_HIT' | 'SL_HIT' | 'MIXED' | 'BREAK_EVEN';
  winCount: number;
  lossCount: number;
  tradesDetail?: { tradeNum: number; result: 'TP_HIT' | 'SL_HIT'; pnl: number }[];
}

export interface CompoundingResult {
  rows: CompoundingDayRow[];
  weeklyRows: CompoundingWeeklyRow[];
  monthlyRows: CompoundingMonthlyRow[];
  totalDays: number;
  totalCalendarDaysSpan: number; // includes skipped weekend days
  finalProjectedBalance: number;
  totalProjectedGainDollars: number;
  totalProjectedReturnPercent: number;
  averageDailyGainDollars: number;
  averageWeeklyGainDollars: number;
  averageMonthlyGainDollars: number;
  expectedValuePerTrade: number;
  maxSimulatedDrawdownDollars: number;
  totalSimulatedTrades: number;
  totalWins: number;
  totalLosses: number;
  simulatedWinRatePercent: number;
  /** Realistic range from random trade orders with the same win rate (Monte Carlo). */
  monteCarlo: MonteCarloSummary;
}

export interface MonteCarloSummary {
  runs: number;
  p10: number;          // 1 in 10 runs ends at or below this
  median: number;
  p90: number;          // 1 in 10 runs ends at or above this
  worst: number;
  best: number;
  probBelowStart: number;     // % of runs ending below the starting balance
  medianMaxDrawdownPct: number;
  p90MaxDrawdownPct: number;  // 1 in 10 runs suffers at least this deepest drawdown
  medianLongestLosingStreak: number;
}

/**
 * Calculates next sequential trading day excluding weekends (Saturday and Sunday)
 */
function getNextTradingDay(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  // 0 is Sunday, 6 is Saturday
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function aggregateWeeklyProjections(rows: CompoundingDayRow[]): CompoundingWeeklyRow[] {
  const weekly: CompoundingWeeklyRow[] = [];
  const chunkSize = 5; // 5 trading days per week
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const startBal = chunk[0].startBalance;
    const endBal = chunk[chunk.length - 1].endBalance;
    const pnl = Number((endBal - startBal).toFixed(2));
    const growthPercent = startBal > 0 ? Number(((pnl / startBal) * 100).toFixed(2)) : 0;
    weekly.push({
      week: Math.floor(i / chunkSize) + 1,
      startDateStr: chunk[0].dateStr,
      endDateStr: chunk[chunk.length - 1].dateStr,
      startBalance: startBal,
      pnl,
      endBalance: endBal,
      growthPercent,
      tradingDaysCount: chunk.length,
    });
  }
  return weekly;
}

export function aggregateMonthlyProjections(rows: CompoundingDayRow[], daysPerMonth = 21): CompoundingMonthlyRow[] {
  const monthly: CompoundingMonthlyRow[] = [];
  const chunkSize = daysPerMonth || 21; // 21 trading days per month
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const startBal = chunk[0].startBalance;
    const endBal = chunk[chunk.length - 1].endBalance;
    const pnl = Number((endBal - startBal).toFixed(2));
    const growthPercent = startBal > 0 ? Number(((pnl / startBal) * 100).toFixed(2)) : 0;
    monthly.push({
      month: Math.floor(i / chunkSize) + 1,
      startDateStr: chunk[0].dateStr,
      endDateStr: chunk[chunk.length - 1].dateStr,
      startBalance: startBal,
      pnl,
      endBalance: endBal,
      growthPercent,
      tradingDaysCount: chunk.length,
    });
  }
  return monthly;
}

export function calculateCompoundingProjection(inputs: CompoundingInputs): CompoundingResult {
  const totalDays = inputs.customDays && inputs.customDays > 0
    ? inputs.customDays
    : Math.round(inputs.calculationMonths * (inputs.tradingDaysPerMonth || 21));

  const safeDays = Math.min(1000, Math.max(1, totalDays));
  const winRateFrac = Math.max(0, Math.min(1, inputs.expectedWinRate / 100));
  const rr = Math.max(0.1, inputs.riskRewardRatio);
  const tradesPerDay = Math.max(1, Math.min(10, inputs.tradesPerDay));
  const totalTrades = safeDays * tradesPerDay;

  // Main projection: the exact expected path — wins spread evenly through the period with the
  // win rate hit precisely. With % risk compounding per trade the final balance is
  // B × (1 + r·RR)^wins × (1 − r)^losses, independent of the order of wins and losses.
  const targetWins = Math.round(totalTrades * winRateFrac);
  const tradeOutcomes: boolean[] = [];
  let winAccumulator = 0;
  for (let i = 0; i < totalTrades; i++) {
    winAccumulator += targetWins;
    if (winAccumulator >= totalTrades) { tradeOutcomes.push(true); winAccumulator -= totalTrades; }
    else tradeOutcomes.push(false);
  }

  let currentBalance = Math.max(10, inputs.startingBalance);
  let peakBalance = currentBalance;
  let maxDrawdownDollars = 0;
  let totalWins = 0;
  let totalLosses = 0;

  const rows: CompoundingDayRow[] = [];

  // Initialize starting date (adjusting if starting date falls on a weekend)
  let currentDate = inputs.startDate ? new Date(inputs.startDate) : new Date();
  if (isNaN(currentDate.getTime())) currentDate = new Date();
  if (currentDate.getDay() === 0) {
    // Sunday -> move to Monday
    currentDate.setDate(currentDate.getDate() + 1);
  } else if (currentDate.getDay() === 6) {
    // Saturday -> move to Monday
    currentDate.setDate(currentDate.getDate() + 2);
  }

  let tradeCursor = 0;

  for (let day = 1; day <= safeDays; day++) {
    if (day > 1) {
      currentDate = getNextTradingDay(currentDate);
    }

    const startBal = currentBalance;

    let running = startBal;
    let dayPnl = 0;
    let dayWins = 0;
    let dayLosses = 0;
    const tradesDetail: { tradeNum: number; result: 'TP_HIT' | 'SL_HIT'; pnl: number }[] = [];

    for (let t = 1; t <= tradesPerDay; t++) {
      // Risk is set before EVERY trade: % of the current balance, or a fixed amount.
      const riskPerTrade = inputs.compoundingMode === 'FIXED_RISK'
        ? Math.max(1, inputs.fixedRiskAmount)
        : (running * Math.max(0.01, inputs.riskPercent)) / 100;
      const isWin = tradeOutcomes[tradeCursor] ?? false;
      tradeCursor++;
      const tradePnl = isWin ? riskPerTrade * rr : -Math.min(riskPerTrade, running);
      running = Math.max(0, running + tradePnl);
      dayPnl += tradePnl;
      if (isWin) { dayWins++; totalWins++; } else { dayLosses++; totalLosses++; }
      tradesDetail.push({ tradeNum: t, result: isWin ? 'TP_HIT' : 'SL_HIT', pnl: Number(tradePnl.toFixed(2)) });
      // Drawdown is tracked trade by trade, not only at the end of the day.
      if (running > peakBalance) peakBalance = running;
      if (peakBalance - running > maxDrawdownDollars) maxDrawdownDollars = peakBalance - running;
    }

    const endBal = Math.max(0, startBal + dayPnl);
    if (endBal > peakBalance) {
      peakBalance = endBal;
    }
    const currentDip = peakBalance - endBal;
    if (currentDip > maxDrawdownDollars) {
      maxDrawdownDollars = currentDip;
    }

    const nextRisk = inputs.compoundingMode === 'FIXED_RISK'
      ? Math.max(1, inputs.fixedRiskAmount)
      : (endBal * Math.max(0.01, inputs.riskPercent)) / 100;

    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayOfWeek = DAY_NAMES[currentDate.getDay()];

    const outcome: 'TP_HIT' | 'SL_HIT' | 'MIXED' | 'BREAK_EVEN' =
      dayWins > 0 && dayLosses === 0
        ? 'TP_HIT'
        : dayLosses > 0 && dayWins === 0
        ? 'SL_HIT'
        : dayPnl === 0
        ? 'BREAK_EVEN'
        : 'MIXED';

    rows.push({
      day,
      dateStr,
      dayOfWeek,
      startBalance: Number(startBal.toFixed(2)),
      pnl: Number(dayPnl.toFixed(2)),
      endBalance: Number(endBal.toFixed(2)),
      nextRisk: Number(nextRisk.toFixed(2)),
      projectedDrawdownBalance: Number(Math.max(0, peakBalance - maxDrawdownDollars).toFixed(2)),
      outcome,
      winCount: dayWins,
      lossCount: dayLosses,
      tradesDetail,
    });

    currentBalance = endBal;
  }

  const finalProjectedBalance = currentBalance;
  const totalProjectedGainDollars = finalProjectedBalance - inputs.startingBalance;
  const totalProjectedReturnPercent = inputs.startingBalance > 0
    ? (totalProjectedGainDollars / inputs.startingBalance) * 100
    : 0;

  const averageDailyGainDollars = safeDays > 0 ? totalProjectedGainDollars / safeDays : 0;
  const baseRisk = inputs.compoundingMode === 'FIXED_RISK'
    ? inputs.fixedRiskAmount
    : (inputs.startingBalance * inputs.riskPercent) / 100;
  const expectedValuePerTrade = (winRateFrac * rr * baseRisk) - ((1 - winRateFrac) * baseRisk);

  return {
    rows,
    weeklyRows: aggregateWeeklyProjections(rows),
    monthlyRows: aggregateMonthlyProjections(rows),
    totalDays: safeDays,
    totalCalendarDaysSpan: rows.length > 0 ? Math.round((new Date(rows[rows.length - 1].dateStr).getTime() - new Date(rows[0].dateStr).getTime()) / (1000 * 60 * 60 * 24)) + 1 : safeDays,
    finalProjectedBalance: Number(finalProjectedBalance.toFixed(2)),
    totalProjectedGainDollars: Number(totalProjectedGainDollars.toFixed(2)),
    totalProjectedReturnPercent: Number(totalProjectedReturnPercent.toFixed(2)),
    averageDailyGainDollars: Number(averageDailyGainDollars.toFixed(2)),
    averageWeeklyGainDollars: Number((averageDailyGainDollars * 5).toFixed(2)),
    averageMonthlyGainDollars: Number((averageDailyGainDollars * 21).toFixed(2)),
    expectedValuePerTrade: Number(expectedValuePerTrade.toFixed(2)),
    maxSimulatedDrawdownDollars: Number(maxDrawdownDollars.toFixed(2)),
    totalSimulatedTrades: totalTrades,
    totalWins,
    totalLosses,
    simulatedWinRatePercent: totalTrades > 0 ? Math.round((totalWins / totalTrades) * 100) : 0,
    monteCarlo: runMonteCarlo(inputs, totalTrades, winRateFrac, rr),
  };
}

// ---------------------------------------------------------------------------
// MONTE CARLO — the same win rate, risk and R:R with trades in random order. Shows the realistic
// spread of outcomes (streaks happen), the true depth of drawdowns and the chance of ending down.
// Seeded, so the same inputs always give the same numbers.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pct = (sorted: number[], q: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))))] : 0;

export function runMonteCarlo(inputs: CompoundingInputs, totalTrades: number, winRateFrac: number, rr: number, runs = 2000): MonteCarloSummary {
  const start = Math.max(10, inputs.startingBalance);
  const seed = Math.round(start * 7 + inputs.riskPercent * 1000 + winRateFrac * 10000 + rr * 100 + totalTrades);
  const rand = mulberry32(seed);
  const finals: number[] = [];
  const dds: number[] = [];
  const streaks: number[] = [];
  const n = Math.min(totalTrades, 20000);
  for (let k = 0; k < runs; k++) {
    let bal = start, peak = start, maxDd = 0, streak = 0, longest = 0;
    for (let i = 0; i < n; i++) {
      const risk = inputs.compoundingMode === 'FIXED_RISK' ? Math.max(1, inputs.fixedRiskAmount) : (bal * Math.max(0.01, inputs.riskPercent)) / 100;
      if (rand() < winRateFrac) { bal += risk * rr; streak = 0; }
      else { bal = Math.max(0, bal - Math.min(risk, bal)); streak++; if (streak > longest) longest = streak; }
      if (bal > peak) peak = bal;
      const dd = peak > 0 ? (peak - bal) / peak : 0;
      if (dd > maxDd) maxDd = dd;
      if (bal <= 0) break;
    }
    finals.push(bal); dds.push(maxDd * 100); streaks.push(longest);
  }
  finals.sort((a, b) => a - b); dds.sort((a, b) => a - b); streaks.sort((a, b) => a - b);
  const r2 = (v: number) => Number(v.toFixed(2));
  return {
    runs,
    p10: r2(pct(finals, 0.1)), median: r2(pct(finals, 0.5)), p90: r2(pct(finals, 0.9)),
    worst: r2(finals[0] ?? start), best: r2(finals[finals.length - 1] ?? start),
    probBelowStart: r2((finals.filter((f) => f < start).length / Math.max(1, runs)) * 100),
    medianMaxDrawdownPct: r2(pct(dds, 0.5)), p90MaxDrawdownPct: r2(pct(dds, 0.9)),
    medianLongestLosingStreak: pct(streaks, 0.5),
  };
}
