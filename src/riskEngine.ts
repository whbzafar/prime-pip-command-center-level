/**
 * Pure, framework-free riskEngine module.
 * Takes (rulesConfig, accountState, tradeHistory) and returns computed financial state.
 * No UI code and no AI calls inside this module. All financial mathematics live here.
 */

export type AccountPhase = 'Phase 1' | 'Phase 2' | 'Funded' | 'Personal';
export type DrawdownType = 'STATIC' | 'EOD_TRAILING' | 'INTRADAY_TRAILING';
export type DailyLossBasis = 'BALANCE_BASED' | 'EQUITY_BASED';
export type RuleStatus = 'Safe' | 'Caution' | 'Danger' | 'Breached';
export type PreTradeVerdict = 'ALLOWED' | 'REDUCE SIZE' | 'BLOCKED';

export interface RulesConfig {
  // 1. Basics
  accountName: string;
  currency: string;
  startingBalance: number;
  phase: AccountPhase;

  // 2. Targets
  profitTargetValue: number; // e.g. 8 for 8% or 8000 for $8000
  profitTargetType: 'PERCENT' | 'DOLLARS';
  minimumTradingDays: number;
  timeLimitDays?: number;

  // 3. Daily loss limit
  dailyLossValue: number; // e.g. 5 for 5% or 5000 for $5000
  dailyLossType: 'PERCENT' | 'DOLLARS';
  dailyLossBasis: DailyLossBasis;
  dailyResetTime: string; // e.g. '00:00' or '17:00'
  dailyResetTimezone: string; // e.g. 'UTC', 'America/New_York', 'Asia/Karachi'

  // 4. Max drawdown
  maxDrawdownValue: number; // e.g. 10 for 10%
  maxDrawdownType: DrawdownType;
  lockFloorAtStartBalanceOnceInProfit: boolean;

  // 5. Consistency rule
  consistencyRuleEnabled: boolean;
  maxProfitSharePercentFromSingleDay: number; // default 30%

  // 6. Other restrictions
  maxTradesPerDay: number;
  maxLots: number;
  newsTradingRestricted: boolean;
  weekendHoldingRestricted: boolean;

  // 7. Personal safety buffer
  personalDailyLossValue: number; // defaults to 50% of firm's daily limit
  personalDailyLossType: 'PERCENT' | 'DOLLARS';
  personalOverallDrawdownValue: number; // defaults to 50% of firm's max drawdown
  personalOverallDrawdownType: 'PERCENT' | 'DOLLARS';
  maxRiskPerTradePercent: number; // default 0.5%
  maxTotalOpenRiskPercent: number; // default 1.5%
}

export interface OpenPosition {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  lots: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  floatingPnL: number;
  openTimestamp: number | string;
  riskAmountDollars?: number;
}

export interface AccountState {
  startingBalance: number;
  currentBalance: number;
  currentEquity: number;
  highWaterMarkBalance?: number;
  highWaterMarkEquity?: number;
  lastEodBalance?: number;
  lastEodEquity?: number;
  openPositions?: OpenPosition[];
}

export interface TradeRecord {
  id: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  initialStopLoss?: number;
  takeProfit?: number;
  lots: number;
  profitLoss: number;
  openTimestamp: number | string;
  closeTimestamp?: number | string;
  status: 'OPEN' | 'CLOSED';
  setupTag?: string;
  preTradeChecklistState?: Record<string, boolean>;
  emotionBefore?: string;
  emotionAfter?: string;
  notes?: string;
}

export interface ComputedRiskState {
  // Daily loss metrics
  dailyRealizedPnL: number;
  dailyUnrealizedPnL: number;
  totalDailyPnL: number;
  firmDailyLimitDollars: number;
  personalDailyLimitDollars: number;
  firmDailyRemainingDollars: number;
  personalDailyRemainingDollars: number;
  firmDailyRoomPercentUsed: number;
  personalDailyRoomPercentUsed: number;
  dailyLossStatus: RuleStatus;
  isFirmDailyBreached: boolean;
  isPersonalDailyBreached: boolean;

  // Overall Drawdown metrics
  drawdownFloorDollars: number;
  firmOverallLimitDollars: number;
  personalOverallLimitDollars: number;
  firmOverallRemainingDollars: number;
  personalOverallRemainingDollars: number;
  firmOverallRoomPercentUsed: number;
  personalOverallRoomPercentUsed: number;
  maxDrawdownStatus: RuleStatus;
  isFirmOverallBreached: boolean;
  isPersonalOverallBreached: boolean;

  // Profit target metrics
  profitTargetDollars: number;
  currentTotalProfitDollars: number;
  profitTargetRemainingDollars: number;
  profitTargetProgressPercent: number;
  profitTargetStatus: RuleStatus;
  isProfitTargetAchieved: boolean;

  // Trading days metrics
  tradingDaysCompleted: number;
  minimumTradingDaysRequired: number;
  tradingDaysRemaining: number;
  tradingDaysStatus: RuleStatus;

  // Consistency rule metrics
  bestDayProfitDollars: number;
  bestDaySharePercent: number;
  maxProfitAllowedTodayWithoutBreach: number;
  consistencyStatus: RuleStatus;
  isConsistencyBreached: boolean;

  // Combined rule status & Lockout Banner
  overallRuleStatus: RuleStatus;
  isPersonalLockoutActive: boolean;
  lockoutReason?: string;

  // Today's live risk budget
  todayRiskBudgetDollars: number;
  recommendedRiskPerTradeDollars: number;
  totalOpenRiskDollars: number;
  totalOpenRiskPercent: number;
}

// ----------------------------------------------------------------------------
// TIMEZONE & DAILY RESET HELPERS (Pure Math / Standard Date)
// ----------------------------------------------------------------------------

/**
 * Calculates milliseconds offset between UTC and a specified IANA timezone.
 */
export function getTimezoneOffsetMs(timeZone: string, date: Date = new Date()): number {
  try {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
    return tzDate.getTime() - utcDate.getTime();
  } catch {
    return 0; // fallback UTC
  }
}

/**
 * Determines whether a given timestamp falls into "today's" session
 * based on the configured daily reset time (HH:MM) and timezone.
 */
export function isTimestampInCurrentSession(
  timestamp: number | string,
  resetTimeStr: string = '00:00',
  timezone: string = 'UTC',
  now: Date = new Date()
): boolean {
  const tsMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (isNaN(tsMs)) return false;

  const [resetHStr, resetMStr] = resetTimeStr.split(':');
  const resetH = parseInt(resetHStr || '0', 10);
  const resetM = parseInt(resetMStr || '0', 10);

  // Convert "now" into the target timezone
  const tzOffset = getTimezoneOffsetMs(timezone, now);
  const nowInTz = new Date(now.getTime() + tzOffset);

  // Build the most recent reset timestamp in that timezone
  const currentSessionReset = new Date(nowInTz);
  currentSessionReset.setUTCHours(resetH, resetM, 0, 0);

  // If nowInTz is earlier than the reset time today, the current session started yesterday at reset time
  if (nowInTz.getTime() < currentSessionReset.getTime()) {
    currentSessionReset.setUTCDate(currentSessionReset.getUTCDate() - 1);
  }

  // Convert the reset back to true UTC
  const resetUtcMs = currentSessionReset.getTime() - tzOffset;
  return tsMs >= resetUtcMs;
}

/**
 * Formats a timestamp into YYYY-MM-DD in the specified timezone
 */
export function getTradingDayKey(
  timestamp: number | string,
  resetTimeStr: string = '00:00',
  timezone: string = 'UTC'
): string {
  const tsMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (isNaN(tsMs)) return 'UNKNOWN';

  const tzOffset = getTimezoneOffsetMs(timezone, new Date(tsMs));
  const dateInTz = new Date(tsMs + tzOffset);

  const [resetHStr, resetMStr] = resetTimeStr.split(':');
  const resetH = parseInt(resetHStr || '0', 10);
  const resetM = parseInt(resetMStr || '0', 10);

  // If time is before reset hour, it belongs to previous calendar day
  const hour = dateInTz.getUTCHours();
  const minute = dateInTz.getUTCMinutes();
  if (hour < resetH || (hour === resetH && minute < resetM)) {
    dateInTz.setUTCDate(dateInTz.getUTCDate() - 1);
  }

  const y = dateInTz.getUTCFullYear();
  const m = String(dateInTz.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateInTz.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ----------------------------------------------------------------------------
// STATUS SEVERITY HELPER (<70% Safe, 70-90% Caution, >90% Danger, >=100% Breached)
// ----------------------------------------------------------------------------

export function getStatusFromRoomUsed(percentUsed: number): RuleStatus {
  if (percentUsed >= 100) return 'Breached';
  if (percentUsed >= 90) return 'Danger';
  if (percentUsed >= 70) return 'Caution';
  return 'Safe';
}

// ----------------------------------------------------------------------------
// CORE PURE COMPUTATION ENGINE
// ----------------------------------------------------------------------------

export function computeRiskState(
  rulesConfig: RulesConfig,
  accountState: AccountState,
  tradeHistory: TradeRecord[] = []
): ComputedRiskState {
  const startingBal = Math.max(1, rulesConfig.startingBalance || accountState.startingBalance || 10000);
  const currentBal = accountState.currentBalance ?? startingBal;
  const currentEq = accountState.currentEquity ?? currentBal;

  // 1. Calculate Daily P/L since configured reset time & timezone
  const resetTime = rulesConfig.dailyResetTime || '00:00';
  const tz = rulesConfig.dailyResetTimezone || 'UTC';
  const now = new Date();

  // Closed trades closed in current session
  const todayClosedTrades = tradeHistory.filter(
    (t) =>
      t.status === 'CLOSED' &&
      isTimestampInCurrentSession(t.closeTimestamp || t.openTimestamp, resetTime, tz, now)
  );
  const dailyRealizedPnL = todayClosedTrades.reduce((acc, t) => acc + (t.profitLoss || 0), 0);

  // Floating P/L of open positions
  const openPositions = accountState.openPositions || [];
  const dailyUnrealizedPnL = openPositions.reduce((acc, p) => acc + (p.floatingPnL || 0), 0);

  // Total daily P/L depending on daily loss basis
  const totalDailyPnL =
    rulesConfig.dailyLossBasis === 'EQUITY_BASED'
      ? dailyRealizedPnL + dailyUnrealizedPnL
      : dailyRealizedPnL;

  // Firm Daily Limit in Dollars
  const firmDailyLimitDollars =
    rulesConfig.dailyLossType === 'PERCENT'
      ? (startingBal * rulesConfig.dailyLossValue) / 100
      : rulesConfig.dailyLossValue;

  // Personal Daily Limit in Dollars
  const personalDailyLimitDollars =
    rulesConfig.personalDailyLossType === 'PERCENT'
      ? (startingBal * (rulesConfig.personalDailyLossValue || rulesConfig.dailyLossValue * 0.5)) / 100
      : rulesConfig.personalDailyLossValue || firmDailyLimitDollars * 0.5;

  // Remaining Daily Room (Loss is negative P/L, so loss = -totalDailyPnL if negative)
  const currentDailyLoss = totalDailyPnL < 0 ? Math.abs(totalDailyPnL) : 0;
  const firmDailyRemainingDollars = Math.max(0, firmDailyLimitDollars - currentDailyLoss);
  const personalDailyRemainingDollars = Math.max(0, personalDailyLimitDollars - currentDailyLoss);

  const firmDailyRoomPercentUsed =
    firmDailyLimitDollars > 0 ? Math.min(150, (currentDailyLoss / firmDailyLimitDollars) * 100) : 0;
  const personalDailyRoomPercentUsed =
    personalDailyLimitDollars > 0
      ? Math.min(150, (currentDailyLoss / personalDailyLimitDollars) * 100)
      : 0;

  const isFirmDailyBreached = currentDailyLoss >= firmDailyLimitDollars && firmDailyLimitDollars > 0;
  const isPersonalDailyBreached =
    currentDailyLoss >= personalDailyLimitDollars && personalDailyLimitDollars > 0;
  const dailyLossStatus = getStatusFromRoomUsed(firmDailyRoomPercentUsed);

  // 2. Overall Drawdown Floor Computation
  // Firm overall limit in dollars
  const firmOverallLimitDollars =
    rulesConfig.maxDrawdownValue <= 100
      ? (startingBal * rulesConfig.maxDrawdownValue) / 100
      : rulesConfig.maxDrawdownValue;

  const personalOverallLimitDollars =
    (rulesConfig.personalOverallDrawdownValue || rulesConfig.maxDrawdownValue * 0.5) <= 100
      ? (startingBal *
          (rulesConfig.personalOverallDrawdownValue || rulesConfig.maxDrawdownValue * 0.5)) /
        100
      : rulesConfig.personalOverallDrawdownValue || firmOverallLimitDollars * 0.5;

  let drawdownFloorDollars = startingBal - firmOverallLimitDollars;

  if (rulesConfig.maxDrawdownType === 'EOD_TRAILING') {
    const eodBase = accountState.lastEodBalance ?? accountState.highWaterMarkBalance ?? currentBal;
    const peakBalance = Math.max(startingBal, accountState.highWaterMarkBalance ?? startingBal, eodBase);
    let trailingFloor = peakBalance - firmOverallLimitDollars;
    if (rulesConfig.lockFloorAtStartBalanceOnceInProfit && peakBalance > startingBal) {
      trailingFloor = Math.max(trailingFloor, startingBal);
    }
    drawdownFloorDollars = Math.max(drawdownFloorDollars, trailingFloor);
  } else if (rulesConfig.maxDrawdownType === 'INTRADAY_TRAILING') {
    const peakEquity = Math.max(
      startingBal,
      accountState.highWaterMarkEquity ?? startingBal,
      currentEq,
      currentBal
    );
    let trailingFloor = peakEquity - firmOverallLimitDollars;
    if (rulesConfig.lockFloorAtStartBalanceOnceInProfit && peakEquity > startingBal) {
      trailingFloor = Math.max(trailingFloor, startingBal);
    }
    drawdownFloorDollars = Math.max(drawdownFloorDollars, trailingFloor);
  }

  // Room remaining until floor
  const effectiveCurrentMetric =
    rulesConfig.dailyLossBasis === 'EQUITY_BASED' ? currentEq : currentBal;
  const firmOverallRemainingDollars = Math.max(0, effectiveCurrentMetric - drawdownFloorDollars);

  // Personal overall floor
  let personalFloorDollars = startingBal - personalOverallLimitDollars;
  if (rulesConfig.maxDrawdownType !== 'STATIC') {
    const peak = Math.max(startingBal, accountState.highWaterMarkEquity ?? currentEq);
    let pTrailing = peak - personalOverallLimitDollars;
    if (rulesConfig.lockFloorAtStartBalanceOnceInProfit && peak > startingBal) {
      pTrailing = Math.max(pTrailing, startingBal);
    }
    personalFloorDollars = Math.max(personalFloorDollars, pTrailing);
  }
  const personalOverallRemainingDollars = Math.max(0, effectiveCurrentMetric - personalFloorDollars);

  const firmOverallUsedDollars = Math.max(0, firmOverallLimitDollars - firmOverallRemainingDollars);
  const firmOverallRoomPercentUsed =
    firmOverallLimitDollars > 0
      ? Math.min(150, (firmOverallUsedDollars / firmOverallLimitDollars) * 100)
      : 0;
  const personalOverallUsedDollars = Math.max(
    0,
    personalOverallLimitDollars - personalOverallRemainingDollars
  );
  const personalOverallRoomPercentUsed =
    personalOverallLimitDollars > 0
      ? Math.min(150, (personalOverallUsedDollars / personalOverallLimitDollars) * 100)
      : 0;

  const isFirmOverallBreached = effectiveCurrentMetric <= drawdownFloorDollars;
  const isPersonalOverallBreached = effectiveCurrentMetric <= personalFloorDollars;
  const maxDrawdownStatus = getStatusFromRoomUsed(firmOverallRoomPercentUsed);

  // 3. Profit Target Progress
  const profitTargetDollars =
    rulesConfig.profitTargetType === 'PERCENT'
      ? (startingBal * rulesConfig.profitTargetValue) / 100
      : rulesConfig.profitTargetValue;

  const allClosedTrades = tradeHistory.filter((t) => t.status !== 'CLOSED');
  const allRealizedProfit = tradeHistory
    .filter((t) => t.status === 'CLOSED')
    .reduce((acc, t) => acc + (t.profitLoss || 0), 0);
  const currentTotalProfitDollars = Math.max(0, allRealizedProfit);
  const profitTargetRemainingDollars = Math.max(0, profitTargetDollars - currentTotalProfitDollars);
  const profitTargetProgressPercent =
    profitTargetDollars > 0
      ? Math.min(100, Math.max(0, (currentTotalProfitDollars / profitTargetDollars) * 100))
      : 0;
  const isProfitTargetAchieved =
    profitTargetDollars > 0 && currentTotalProfitDollars >= profitTargetDollars;
  const profitTargetStatus: RuleStatus = isProfitTargetAchieved
    ? 'Safe'
    : profitTargetProgressPercent >= 70
    ? 'Safe'
    : profitTargetProgressPercent >= 40
    ? 'Caution'
    : 'Safe';

  // 4. Trading Days Completed vs Required
  const tradingDaySet = new Set<string>();
  tradeHistory.forEach((t) => {
    if (t.status === 'CLOSED' && (t.closeTimestamp || t.openTimestamp)) {
      tradingDaySet.add(getTradingDayKey(t.closeTimestamp || t.openTimestamp, resetTime, tz));
    }
  });
  const tradingDaysCompleted = tradingDaySet.size;
  const minimumTradingDaysRequired = rulesConfig.minimumTradingDays || 0;
  const tradingDaysRemaining = Math.max(0, minimumTradingDaysRequired - tradingDaysCompleted);
  const tradingDaysStatus: RuleStatus =
    tradingDaysRemaining === 0 ? 'Safe' : tradingDaysCompleted > 0 ? 'Caution' : 'Safe';

  // 5. Consistency Rule (Single Day Profit Share Cap)
  // Group realized profit by trading day
  const dailyProfitMap: Record<string, number> = {};
  tradeHistory.forEach((t) => {
    if (t.status === 'CLOSED' && (t.closeTimestamp || t.openTimestamp)) {
      const dayKey = getTradingDayKey(t.closeTimestamp || t.openTimestamp, resetTime, tz);
      dailyProfitMap[dayKey] = (dailyProfitMap[dayKey] || 0) + (t.profitLoss || 0);
    }
  });

  const dailyProfits = Object.values(dailyProfitMap).filter((p) => p > 0);
  const bestDayProfitDollars = dailyProfits.length > 0 ? Math.max(...dailyProfits) : 0;
  const totalPositiveDaysProfit = dailyProfits.reduce((acc, p) => acc + p, 0);

  let bestDaySharePercent = 0;
  if (totalPositiveDaysProfit > 0 && bestDayProfitDollars > 0) {
    bestDaySharePercent = (bestDayProfitDollars / totalPositiveDaysProfit) * 100;
  }

  const maxAllowedPct = rulesConfig.maxProfitSharePercentFromSingleDay || 30;
  const isConsistencyBreached =
    rulesConfig.consistencyRuleEnabled &&
    totalPositiveDaysProfit > 0 &&
    bestDaySharePercent > maxAllowedPct;

  // Compute maximum profit still allowed today without breaching consistency rule:
  // If today profit is P_today and other days sum is S_other:
  // P_today / (S_other + P_today) <= maxAllowedPct / 100
  // P_today <= (maxPct / (100 - maxPct)) * S_other
  let maxProfitAllowedTodayWithoutBreach = 0;
  if (rulesConfig.consistencyRuleEnabled && maxAllowedPct < 100) {
    const todayKey = getTradingDayKey(now.getTime(), resetTime, tz);
    const todayCurrentProfit = Math.max(0, dailyProfitMap[todayKey] || 0);
    const otherDaysProfit = totalPositiveDaysProfit - todayCurrentProfit;
    const theoreticalMaxToday = (maxAllowedPct / (100 - maxAllowedPct)) * Math.max(0, otherDaysProfit);
    maxProfitAllowedTodayWithoutBreach = Math.max(0, theoreticalMaxToday - todayCurrentProfit);
  }

  const consistencyStatus: RuleStatus = !rulesConfig.consistencyRuleEnabled
    ? 'Safe'
    : isConsistencyBreached
    ? 'Breached'
    : bestDaySharePercent >= maxAllowedPct * 0.9
    ? 'Danger'
    : bestDaySharePercent >= maxAllowedPct * 0.7
    ? 'Caution'
    : 'Safe';

  // 6. Lockout Banner & Combined Personal Status
  const isPersonalLockoutActive =
    isPersonalDailyBreached ||
    isPersonalOverallBreached ||
    isFirmDailyBreached ||
    isFirmOverallBreached;

  let lockoutReason: string | undefined;
  if (isFirmDailyBreached) lockoutReason = 'Firm Daily Loss Limit Breached';
  else if (isFirmOverallBreached) lockoutReason = 'Firm Overall Max Drawdown Breached';
  else if (isPersonalDailyBreached) lockoutReason = 'Personal Daily Safety Limit Hit';
  else if (isPersonalOverallBreached) lockoutReason = 'Personal Overall Safety Buffer Hit';

  const overallRuleStatus: RuleStatus =
    isFirmDailyBreached || isFirmOverallBreached || isConsistencyBreached
      ? 'Breached'
      : dailyLossStatus === 'Danger' || maxDrawdownStatus === 'Danger'
      ? 'Danger'
      : dailyLossStatus === 'Caution' || maxDrawdownStatus === 'Caution'
      ? 'Caution'
      : 'Safe';

  // 7. Today's live risk budget & Open Risk
  const totalOpenRiskDollars = openPositions.reduce((acc, p) => {
    if (typeof p.riskAmountDollars === 'number' && p.riskAmountDollars > 0) return acc + p.riskAmountDollars;
    if (p.stopLoss && p.entryPrice && p.lots > 0) {
      const pips = Math.abs(p.entryPrice - p.stopLoss) / 0.0001;
      return acc + pips * 10 * p.lots;
    }
    return acc;
  }, 0);
  const totalOpenRiskPercent = (totalOpenRiskDollars / startingBal) * 100;

  // Remaining daily budget available for new trades
  const todayRiskBudgetDollars = Math.max(
    0,
    Math.min(personalDailyRemainingDollars, firmDailyRemainingDollars) - totalOpenRiskDollars
  );

  const maxPerTradePct = rulesConfig.maxRiskPerTradePercent || 0.5;
  const recommendedRiskPerTradeDollars = Math.min(
    (startingBal * maxPerTradePct) / 100,
    todayRiskBudgetDollars > 0 ? todayRiskBudgetDollars : 0
  );

  return {
    dailyRealizedPnL: Number(dailyRealizedPnL.toFixed(2)),
    dailyUnrealizedPnL: Number(dailyUnrealizedPnL.toFixed(2)),
    totalDailyPnL: Number(totalDailyPnL.toFixed(2)),
    firmDailyLimitDollars: Number(firmDailyLimitDollars.toFixed(2)),
    personalDailyLimitDollars: Number(personalDailyLimitDollars.toFixed(2)),
    firmDailyRemainingDollars: Number(firmDailyRemainingDollars.toFixed(2)),
    personalDailyRemainingDollars: Number(personalDailyRemainingDollars.toFixed(2)),
    firmDailyRoomPercentUsed: Number(firmDailyRoomPercentUsed.toFixed(1)),
    personalDailyRoomPercentUsed: Number(personalDailyRoomPercentUsed.toFixed(1)),
    dailyLossStatus,
    isFirmDailyBreached,
    isPersonalDailyBreached,

    drawdownFloorDollars: Number(drawdownFloorDollars.toFixed(2)),
    firmOverallLimitDollars: Number(firmOverallLimitDollars.toFixed(2)),
    personalOverallLimitDollars: Number(personalOverallLimitDollars.toFixed(2)),
    firmOverallRemainingDollars: Number(firmOverallRemainingDollars.toFixed(2)),
    personalOverallRemainingDollars: Number(personalOverallRemainingDollars.toFixed(2)),
    firmOverallRoomPercentUsed: Number(firmOverallRoomPercentUsed.toFixed(1)),
    personalOverallRoomPercentUsed: Number(personalOverallRoomPercentUsed.toFixed(1)),
    maxDrawdownStatus,
    isFirmOverallBreached,
    isPersonalOverallBreached,

    profitTargetDollars: Number(profitTargetDollars.toFixed(2)),
    currentTotalProfitDollars: Number(currentTotalProfitDollars.toFixed(2)),
    profitTargetRemainingDollars: Number(profitTargetRemainingDollars.toFixed(2)),
    profitTargetProgressPercent: Number(profitTargetProgressPercent.toFixed(1)),
    profitTargetStatus,
    isProfitTargetAchieved,

    tradingDaysCompleted,
    minimumTradingDaysRequired,
    tradingDaysRemaining,
    tradingDaysStatus,

    bestDayProfitDollars: Number(bestDayProfitDollars.toFixed(2)),
    bestDaySharePercent: Number(bestDaySharePercent.toFixed(1)),
    maxProfitAllowedTodayWithoutBreach: Number(maxProfitAllowedTodayWithoutBreach.toFixed(2)),
    consistencyStatus,
    isConsistencyBreached,

    overallRuleStatus,
    isPersonalLockoutActive,
    lockoutReason,

    todayRiskBudgetDollars: Number(todayRiskBudgetDollars.toFixed(2)),
    recommendedRiskPerTradeDollars: Number(recommendedRiskPerTradeDollars.toFixed(2)),
    totalOpenRiskDollars: Number(totalOpenRiskDollars.toFixed(2)),
    totalOpenRiskPercent: Number(totalOpenRiskPercent.toFixed(2)),
  };
}

// ----------------------------------------------------------------------------
// PRE-TRADE POSITION SIZING & VERDICT EVALUATOR
// ----------------------------------------------------------------------------

export interface PositionSizeInputs {
  pair: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  riskDollars: number;
  accountCurrency?: string;
  manualPipValueOverride?: number;
}

export interface PositionSizeResult {
  lotSize: number;
  stopDistancePips: number;
  pipValuePerLot: number;
  maxLossDollars: number;
  maxLossPercentDaily: number;
  maxLossPercentOverall: number;
  rewardRiskRatio: number;
}

export function getPipSpec(pair: string): { pipSize: number; defaultPipValue: number } {
  const clean = pair.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.includes('JPY')) {
    return { pipSize: 0.01, defaultPipValue: 6.8 };
  }
  if (clean.includes('XAU') || clean.includes('GOLD')) {
    return { pipSize: 0.1, defaultPipValue: 10 };
  }
  if (clean.includes('US30') || clean.includes('NAS100') || clean.includes('SPX500')) {
    return { pipSize: 1.0, defaultPipValue: 1 };
  }
  if (clean.includes('BTC') || clean.includes('ETH')) {
    return { pipSize: 1.0, defaultPipValue: 1 };
  }
  return { pipSize: 0.0001, defaultPipValue: 10 };
}

export function calculatePositionSize(
  inputs: PositionSizeInputs,
  remainingDailyDollars: number = 1000,
  remainingOverallDollars: number = 2000
): PositionSizeResult {
  const spec = getPipSpec(inputs.pair);
  const stopDistancePrice = Math.abs(inputs.entryPrice - inputs.stopLoss);
  const stopDistancePips =
    stopDistancePrice > 0 ? Number((stopDistancePrice / spec.pipSize).toFixed(1)) : 0;

  const pipValue = inputs.manualPipValueOverride || spec.defaultPipValue;

  let lotSize = 0;
  if (stopDistancePips > 0 && pipValue > 0 && inputs.riskDollars > 0) {
    const rawLot = inputs.riskDollars / (stopDistancePips * pipValue);
    lotSize = Math.max(0.01, Math.floor(rawLot * 100) / 100);
  }

  const maxLossDollars = Number((lotSize * stopDistancePips * pipValue).toFixed(2));
  const maxLossPercentDaily =
    remainingDailyDollars > 0 ? Number(((maxLossDollars / remainingDailyDollars) * 100).toFixed(1)) : 100;
  const maxLossPercentOverall =
    remainingOverallDollars > 0
      ? Number(((maxLossDollars / remainingOverallDollars) * 100).toFixed(1))
      : 100;

  let rewardRiskRatio = 0;
  if (inputs.takeProfit && inputs.entryPrice) {
    const tpDist = Math.abs(inputs.takeProfit - inputs.entryPrice);
    rewardRiskRatio = stopDistancePrice > 0 ? Number((tpDist / stopDistancePrice).toFixed(2)) : 0;
  }

  return {
    lotSize,
    stopDistancePips,
    pipValuePerLot: pipValue,
    maxLossDollars,
    maxLossPercentDaily,
    maxLossPercentOverall,
    rewardRiskRatio,
  };
}

export interface PreTradeEvaluationInput {
  pair: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  riskPercent?: number;
  manualPipValueOverride?: number;
}

export interface ChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  message: string;
}

export interface PreTradeVerdictResult {
  verdict: PreTradeVerdict;
  recommendedLotSize: number;
  positionDetails: PositionSizeResult;
  checklist: ChecklistItem[];
  sharedCurrencyWarning?: string;
  explanation: string;
}

/**
 * Checks whether existing open positions share base or quote currency with the proposed pair.
 * E.g., EURUSD and GBPUSD both long USD-short.
 */
export function checkSharedCurrencyCorrelation(
  proposedPair: string,
  proposedDirection: 'BUY' | 'SELL',
  openPositions: OpenPosition[] = []
): string | undefined {
  if (openPositions.length === 0) return undefined;

  const cleanProposed = proposedPair.toUpperCase().replace(/[^A-Z]/g, '');
  if (cleanProposed.length < 6) return undefined;
  const pBase = cleanProposed.slice(0, 3);
  const pQuote = cleanProposed.slice(3, 6);

  const conflicting: string[] = [];
  openPositions.forEach((pos) => {
    const cleanPos = pos.pair.toUpperCase().replace(/[^A-Z]/g, '');
    if (cleanPos.length >= 6) {
      const oBase = cleanPos.slice(0, 3);
      const oQuote = cleanPos.slice(3, 6);

      // Same quote currency in same direction (e.g., EURUSD BUY and GBPUSD BUY both short USD)
      if (pQuote === oQuote && pos.direction === proposedDirection) {
        conflicting.push(`${pos.pair} (${pos.direction}) - both short ${pQuote}`);
      }
      // Same base currency in opposite direction
      if (pBase === oBase && pos.direction !== proposedDirection) {
        conflicting.push(`${pos.pair} (${pos.direction}) - counter exposure on ${pBase}`);
      }
    }
  });

  if (conflicting.length > 0) {
    return `Aggregated Currency Exposure: Proposed ${proposedPair} overlaps with open position(s): ${conflicting.join(', ')}. Combined USD risk is correlated.`;
  }
  return undefined;
}

export function evaluatePreTrade(
  input: PreTradeEvaluationInput,
  rulesConfig: RulesConfig,
  computedState: ComputedRiskState,
  openPositions: OpenPosition[] = [],
  isCooldownActive: boolean = false
): PreTradeVerdictResult {
  const startingBal = rulesConfig.startingBalance || 10000;
  const desiredRiskPct = input.riskPercent || rulesConfig.maxRiskPerTradePercent || 0.5;
  const proposedRiskDollars = (startingBal * desiredRiskPct) / 100;

  const pos = calculatePositionSize(
    {
      pair: input.pair,
      entryPrice: input.entryPrice,
      stopLoss: input.stopLoss,
      takeProfit: input.takeProfit,
      riskDollars: proposedRiskDollars,
      manualPipValueOverride: input.manualPipValueOverride,
    },
    computedState.personalDailyRemainingDollars,
    computedState.personalOverallRemainingDollars
  );

  const checklist: ChecklistItem[] = [];

  // Check 1: Cooldown Active
  checklist.push({
    key: 'cooldown',
    label: 'Discipline Cooldown',
    passed: !isCooldownActive,
    message: isCooldownActive ? 'Take a break cooldown is active. Trading paused.' : 'No active cooldown.',
  });

  // Check 2: Lockout / Personal Limits
  checklist.push({
    key: 'lockout',
    label: 'Daily Lockout Status',
    passed: !computedState.isPersonalLockoutActive,
    message: computedState.isPersonalLockoutActive
      ? `Lockout Active: ${computedState.lockoutReason || 'Daily limits hit'}.`
      : 'Within all personal and firm loss boundaries.',
  });

  // Check 3: Room for proposed risk in remaining daily room
  const fitsDaily = pos.maxLossDollars <= computedState.personalDailyRemainingDollars;
  checklist.push({
    key: 'daily_room',
    label: 'Daily Room Capacity',
    passed: fitsDaily,
    message: fitsDaily
      ? `Proposed risk ($${pos.maxLossDollars}) fits inside remaining daily budget ($${computedState.personalDailyRemainingDollars}).`
      : `Proposed risk ($${pos.maxLossDollars}) exceeds daily room ($${computedState.personalDailyRemainingDollars}).`,
  });

  // Check 4: Room for proposed risk in remaining overall room
  const fitsOverall = pos.maxLossDollars <= computedState.personalOverallRemainingDollars;
  checklist.push({
    key: 'overall_room',
    label: 'Overall Drawdown Buffer',
    passed: fitsOverall,
    message: fitsOverall
      ? `Proposed risk ($${pos.maxLossDollars}) protects overall drawdown floor.`
      : `Proposed risk exceeds remaining overall drawdown floor.`,
  });

  // Check 5: Max open risk limit
  const proposedTotalRiskPct =
    computedState.totalOpenRiskPercent + (pos.maxLossDollars / startingBal) * 100;
  const maxOpenRiskPct = rulesConfig.maxTotalOpenRiskPercent || 1.5;
  const fitsOpenRisk = proposedTotalRiskPct <= maxOpenRiskPct;
  checklist.push({
    key: 'open_risk',
    label: 'Aggregated Open Risk Cap',
    passed: fitsOpenRisk,
    message: fitsOpenRisk
      ? `Total combined open risk (${proposedTotalRiskPct.toFixed(1)}%) is within max cap (${maxOpenRiskPct}%).`
      : `Total open risk (${proposedTotalRiskPct.toFixed(1)}%) exceeds limit (${maxOpenRiskPct}%).`,
  });

  // Currency correlation check
  const sharedCurrencyWarning = checkSharedCurrencyCorrelation(
    input.pair,
    input.direction,
    openPositions
  );

  let verdict: PreTradeVerdict = 'ALLOWED';
  let recommendedLotSize = pos.lotSize;
  let explanation = 'Trade setup satisfies all firm and personal risk rules.';

  if (isCooldownActive || computedState.isPersonalLockoutActive) {
    verdict = 'BLOCKED';
    recommendedLotSize = 0;
    explanation = isCooldownActive
      ? 'BLOCKED: Cooldown active. Step away from terminal.'
      : `BLOCKED: ${computedState.lockoutReason || 'Stop trading for today.'}`;
  } else if (!fitsDaily || !fitsOverall || !fitsOpenRisk) {
    // Calculate the scaled-down lot size that fits exactly inside the remaining room
    const maxAllowedDollars = Math.min(
      computedState.personalDailyRemainingDollars,
      computedState.personalOverallRemainingDollars,
      Math.max(0, (startingBal * maxOpenRiskPct) / 100 - computedState.totalOpenRiskDollars)
    );

    if (maxAllowedDollars > 0) {
      const reducedPos = calculatePositionSize(
        {
          pair: input.pair,
          entryPrice: input.entryPrice,
          stopLoss: input.stopLoss,
          takeProfit: input.takeProfit,
          riskDollars: maxAllowedDollars,
          manualPipValueOverride: input.manualPipValueOverride,
        },
        computedState.personalDailyRemainingDollars,
        computedState.personalOverallRemainingDollars
      );
      if (reducedPos.lotSize > 0) {
        verdict = 'REDUCE SIZE';
        recommendedLotSize = reducedPos.lotSize;
        explanation = `REDUCE SIZE: Downsize to ${recommendedLotSize} lots ($${reducedPos.maxLossDollars} risk) to remain safely within boundaries.`;
      } else {
        verdict = 'BLOCKED';
        recommendedLotSize = 0;
        explanation = 'BLOCKED: Remaining room is too small for minimum position size.';
      }
    } else {
      verdict = 'BLOCKED';
      recommendedLotSize = 0;
      explanation = 'BLOCKED: Zero remaining daily or overall risk room.';
    }
  }

  return {
    verdict,
    recommendedLotSize,
    positionDetails: pos,
    checklist,
    sharedCurrencyWarning,
    explanation,
  };
}

// ----------------------------------------------------------------------------
// BEHAVIORAL DETECTION ENGINE (Pure deterministic rule-based checks)
// ----------------------------------------------------------------------------

export interface BehavioralFlag {
  tradeId: string;
  type: 'REVENGE_TRADING' | 'STOP_LOSS_WIDENED' | 'OVERTRADING' | 'TILT_STREAK';
  severity: 'WARNING' | 'CRITICAL';
  description: string;
}

export interface BehavioralAnalysisResult {
  flags: BehavioralFlag[];
  revengeCount: number;
  slWidenedCount: number;
  overtradingCount: number;
  tiltStreakCount: number;
  isCooldownTriggered: boolean;
  cooldownRemainingMinutes: number;
  cooldownReason?: string;
  emotionBreakdown: Record<string, { count: number; totalPnL: number }>;
}

export function detectBehavioralFlags(
  trades: TradeRecord[],
  personalDailyTradeLimit: number = 3,
  revengeWindowMinutes: number = 15,
  maxConsecutiveLossesBeforeCooldown: number = 3
): BehavioralAnalysisResult {
  const flags: BehavioralFlag[] = [];
  const emotionBreakdown: Record<string, { count: number; totalPnL: number }> = {};

  const sorted = [...trades].sort((a, b) => {
    const tA = typeof a.openTimestamp === 'number' ? a.openTimestamp : new Date(a.openTimestamp).getTime();
    const tB = typeof b.openTimestamp === 'number' ? b.openTimestamp : new Date(b.openTimestamp).getTime();
    return tA - tB;
  });

  let consecutiveLosses = 0;
  const tradesPerDayMap: Record<string, number> = {};

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;

    // Emotion tracking
    const emo = t.emotionBefore || 'NEUTRAL';
    if (!emotionBreakdown[emo]) emotionBreakdown[emo] = { count: 0, totalPnL: 0 };
    emotionBreakdown[emo].count += 1;
    emotionBreakdown[emo].totalPnL += t.profitLoss || 0;

    // 1. Overtrading check
    const day = getTradingDayKey(t.openTimestamp);
    tradesPerDayMap[day] = (tradesPerDayMap[day] || 0) + 1;
    if (tradesPerDayMap[day] > personalDailyTradeLimit) {
      flags.push({
        tradeId: t.id,
        type: 'OVERTRADING',
        severity: 'WARNING',
        description: `Trade #${tradesPerDayMap[day]} opened today (exceeds personal limit of ${personalDailyTradeLimit}).`,
      });
    }

    // 2. Stop-Loss Widened or Removed after entry
    if (typeof t.initialStopLoss === 'number' && typeof t.stopLoss === 'number' && t.entryPrice) {
      const initialDist = Math.abs(t.entryPrice - t.initialStopLoss);
      const currentDist = Math.abs(t.entryPrice - t.stopLoss);
      if (currentDist > initialDist + 0.00001) {
        flags.push({
          tradeId: t.id,
          type: 'STOP_LOSS_WIDENED',
          severity: 'CRITICAL',
          description: `Stop-loss was widened from ${t.initialStopLoss} to ${t.stopLoss} after entry.`,
        });
      }
    }

    // 3. Revenge Trading check
    if (prev && prev.profitLoss < 0) {
      const prevCloseMs = typeof prev.closeTimestamp === 'number' ? prev.closeTimestamp : new Date(prev.closeTimestamp || prev.openTimestamp).getTime();
      const currOpenMs = typeof t.openTimestamp === 'number' ? t.openTimestamp : new Date(t.openTimestamp).getTime();
      const diffMinutes = (currOpenMs - prevCloseMs) / (1000 * 60);

      const isQuickReopen = diffMinutes >= 0 && diffMinutes <= revengeWindowMinutes;
      const isSizeIncreased = t.lots > prev.lots;

      if (isQuickReopen || (isSizeIncreased && diffMinutes <= 60)) {
        flags.push({
          tradeId: t.id,
          type: 'REVENGE_TRADING',
          severity: 'CRITICAL',
          description: `Revenge trading pattern: New trade opened ${Math.round(diffMinutes)}m after a loss${isSizeIncreased ? ' with increased lot size' : ''}.`,
        });
      }
    }

    // 4. Tilt Streak Tracking
    if (t.status === 'CLOSED') {
      if (t.profitLoss < 0) {
        consecutiveLosses++;
        if (consecutiveLosses >= 3) {
          flags.push({
            tradeId: t.id,
            type: 'TILT_STREAK',
            severity: 'CRITICAL',
            description: `Tilt Streak: ${consecutiveLosses} consecutive losses recorded. Risk of emotional decision making.`,
          });
        }
      } else if (t.profitLoss > 0) {
        consecutiveLosses = 0;
      }
    }
  }

  const revengeCount = flags.filter((f) => f.type === 'REVENGE_TRADING').length;
  const slWidenedCount = flags.filter((f) => f.type === 'STOP_LOSS_WIDENED').length;
  const overtradingCount = flags.filter((f) => f.type === 'OVERTRADING').length;
  const tiltStreakCount = flags.filter((f) => f.type === 'TILT_STREAK').length;

  const isCooldownTriggered = consecutiveLosses >= maxConsecutiveLossesBeforeCooldown;
  const cooldownRemainingMinutes = isCooldownTriggered ? 30 : 0;
  const cooldownReason = isCooldownTriggered
    ? `Take a Break: ${consecutiveLosses} consecutive losses detected.`
    : undefined;

  return {
    flags,
    revengeCount,
    slWidenedCount,
    overtradingCount,
    tiltStreakCount,
    isCooldownTriggered,
    cooldownRemainingMinutes,
    cooldownReason,
    emotionBreakdown,
  };
}
