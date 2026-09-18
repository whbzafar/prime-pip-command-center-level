// Compounding Engine & Loss Recovery Mathematical Simulator
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

  const safeDays = Math.min(365, Math.max(1, totalDays));
  const winRateFrac = Math.max(0.1, Math.min(0.95, inputs.expectedWinRate / 100));
  const rr = Math.max(0.5, inputs.riskRewardRatio);
  const tradesPerDay = Math.max(1, Math.min(10, inputs.tradesPerDay));

  let currentBalance = Math.max(10, inputs.startingBalance);
  const rows: CompoundingDayRow[] = [];

  let maxSimulatedDip = 0;

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

  const firstDate = new Date(currentDate);

  for (let day = 1; day <= safeDays; day++) {
    if (day > 1) {
      currentDate = getNextTradingDay(currentDate);
    }

    const startBal = currentBalance;

    // Calculate risk per trade for this day
    const riskPerTrade = inputs.compoundingMode === 'FIXED_RISK'
      ? Math.max(1, inputs.fixedRiskAmount)
      : (startBal * Math.max(0.1, inputs.riskPercent)) / 100;

    // Mathematical Expected Value per trade:
    // EV = (P(Win) * RR * Risk) - (P(Loss) * Risk)
    // EV = Risk * (P(Win) * (RR + 1) - 1)
    const evPerTrade = (winRateFrac * rr * riskPerTrade) - ((1 - winRateFrac) * riskPerTrade);
    const dayPnl = evPerTrade * tradesPerDay;

    const endBal = Math.max(0, startBal + dayPnl);

    // Simulated 3-consecutive-loss conservative drawdown scenario
    const simulatedDip = endBal - (3 * riskPerTrade);
    if (endBal - simulatedDip > maxSimulatedDip) {
      maxSimulatedDip = endBal - simulatedDip;
    }

    const nextRisk = inputs.compoundingMode === 'FIXED_RISK'
      ? riskPerTrade
      : (endBal * Math.max(0.1, inputs.riskPercent)) / 100;

    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const dayOfWeek = DAY_NAMES[currentDate.getDay()];

    rows.push({
      day,
      dateStr,
      dayOfWeek,
      startBalance: Number(startBal.toFixed(2)),
      pnl: Number(dayPnl.toFixed(2)),
      endBalance: Number(endBal.toFixed(2)),
      nextRisk: Number(nextRisk.toFixed(2)),
      projectedDrawdownBalance: Number(Math.max(0, simulatedDip).toFixed(2)),
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

  const totalCalendarDaysSpan = rows.length > 0
    ? Math.round((currentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : safeDays;

  const weeklyRows = aggregateWeeklyProjections(rows);
  const monthlyRows = aggregateMonthlyProjections(rows, inputs.tradingDaysPerMonth || 21);
  const averageWeeklyGainDollars = weeklyRows.length > 0 ? totalProjectedGainDollars / weeklyRows.length : 0;
  const averageMonthlyGainDollars = monthlyRows.length > 0 ? totalProjectedGainDollars / monthlyRows.length : 0;

  return {
    rows,
    weeklyRows,
    monthlyRows,
    totalDays: safeDays,
    totalCalendarDaysSpan,
    finalProjectedBalance: Number(finalProjectedBalance.toFixed(2)),
    totalProjectedGainDollars: Number(totalProjectedGainDollars.toFixed(2)),
    totalProjectedReturnPercent: Number(totalProjectedReturnPercent.toFixed(2)),
    averageDailyGainDollars: Number(averageDailyGainDollars.toFixed(2)),
    averageWeeklyGainDollars: Number(averageWeeklyGainDollars.toFixed(2)),
    averageMonthlyGainDollars: Number(averageMonthlyGainDollars.toFixed(2)),
    expectedValuePerTrade: Number(expectedValuePerTrade.toFixed(2)),
    maxSimulatedDrawdownDollars: Number(maxSimulatedDip.toFixed(2)),
  };
}

// ---------------------------------------------------------------------------
// LOSS RECOVERY SIMULATOR (Item 25)
// Pure mathematical asymmetry calculation
// ---------------------------------------------------------------------------

export interface LossRecoveryScenario {
  drawdownPercent: number;
  requiredGainPercent: number;
  sampleStartingBalance: number;
  balanceAfterLoss: number;
  dollarGainRequired: number;
  estimatedTradesRequiredAt1Pct: number; // assuming 1.5R and 50% WR
}

export function calculateLossRecoveryMetrics(
  currentBalance: number,
  drawdownPercent: number,
  riskPerTradePercent: number = 1.0,
  winRate: number = 50,
  riskReward: number = 2.0
): {
  drawdownPercent: number;
  requiredGainPercent: number;
  lossDollars: number;
  requiredGainDollars: number;
  estimatedTradesToRecover: number;
  asymmetryTable: { dd: number; requiredGain: number; severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' }[];
} {
  const safeDD = Math.max(0.1, Math.min(99.9, drawdownPercent));
  // Required Gain % = (1 / (1 - DD/100) - 1) * 100
  const requiredGainPercent = ((1 / (1 - safeDD / 100)) - 1) * 100;

  const originalEquity = currentBalance / (1 - safeDD / 100);
  const lossDollars = originalEquity - currentBalance;
  const requiredGainDollars = lossDollars;

  // Expected Value per trade in %
  const wr = winRate / 100;
  const evPercent = (wr * riskReward * riskPerTradePercent) - ((1 - wr) * riskPerTradePercent);
  const estimatedTradesToRecover = evPercent > 0
    ? Math.ceil(requiredGainPercent / evPercent)
    : 999;

  const asymmetryTable = [
    { dd: 5, requiredGain: 5.26, severity: 'LOW' as const },
    { dd: 10, requiredGain: 11.11, severity: 'LOW' as const },
    { dd: 15, requiredGain: 17.65, severity: 'MEDIUM' as const },
    { dd: 20, requiredGain: 25.0, severity: 'MEDIUM' as const },
    { dd: 25, requiredGain: 33.33, severity: 'HIGH' as const },
    { dd: 30, requiredGain: 42.86, severity: 'HIGH' as const },
    { dd: 40, requiredGain: 66.67, severity: 'EXTREME' as const },
    { dd: 50, requiredGain: 100.0, severity: 'EXTREME' as const },
    { dd: 60, requiredGain: 150.0, severity: 'EXTREME' as const },
    { dd: 75, requiredGain: 300.0, severity: 'EXTREME' as const },
  ];

  return {
    drawdownPercent: Number(safeDD.toFixed(2)),
    requiredGainPercent: Number(requiredGainPercent.toFixed(2)),
    lossDollars: Number(lossDollars.toFixed(2)),
    requiredGainDollars: Number(requiredGainDollars.toFixed(2)),
    estimatedTradesToRecover,
    asymmetryTable,
  };
}
