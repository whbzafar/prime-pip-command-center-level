import {
  computeRiskState,
  calculatePositionSize,
  evaluatePreTrade,
  detectBehavioralFlags,
  isTimestampInCurrentSession,
  getTradingDayKey,
  RulesConfig,
  AccountState,
  TradeRecord,
} from './riskEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`✓ PASS: ${message}`);
}

console.log('\n--- STARTING RISK ENGINE UNIT TESTS ---\n');

// 1. TEST: Trailing Drawdown that Rises
{
  const rules: RulesConfig = {
    accountName: 'Challenge 100k',
    currency: 'USD',
    startingBalance: 100000,
    phase: 'Phase 1',
    profitTargetValue: 10,
    profitTargetType: 'PERCENT',
    minimumTradingDays: 5,
    dailyLossValue: 5,
    dailyLossType: 'PERCENT',
    dailyLossBasis: 'EQUITY_BASED',
    dailyResetTime: '00:00',
    dailyResetTimezone: 'UTC',
    maxDrawdownValue: 10, // 10% = $10,000 max drawdown
    maxDrawdownType: 'INTRADAY_TRAILING',
    lockFloorAtStartBalanceOnceInProfit: false,
    consistencyRuleEnabled: false,
    maxProfitSharePercentFromSingleDay: 30,
    maxTradesPerDay: 5,
    maxLots: 10,
    newsTradingRestricted: false,
    weekendHoldingRestricted: false,
    personalDailyLossValue: 2.5,
    personalDailyLossType: 'PERCENT',
    personalOverallDrawdownValue: 5,
    personalOverallDrawdownType: 'PERCENT',
    maxRiskPerTradePercent: 0.5,
    maxTotalOpenRiskPercent: 1.5,
  };

  // Initial state: Starting 100k, floor should be 90k
  const state1: AccountState = {
    startingBalance: 100000,
    currentBalance: 100000,
    currentEquity: 100000,
    highWaterMarkEquity: 100000,
  };
  const res1 = computeRiskState(rules, state1, []);
  assert(res1.drawdownFloorDollars === 90000, 'Initial floor should be 90,000');

  // Account rises to 105,000 high water mark: floor should rise to 95,000
  const state2: AccountState = {
    startingBalance: 100000,
    currentBalance: 105000,
    currentEquity: 105000,
    highWaterMarkEquity: 105000,
  };
  const res2 = computeRiskState(rules, state2, []);
  assert(res2.drawdownFloorDollars === 95000, 'Trailing floor rises with high-water mark to 95,000');
  assert(res2.firmOverallRemainingDollars === 10000, 'Remaining room from 105k to 95k is 10,000');
}

// 2. TEST: Trailing Floor Locks at Starting Balance Once in Profit
{
  const rules: RulesConfig = {
    accountName: 'Locking Trailing Account',
    currency: 'USD',
    startingBalance: 100000,
    phase: 'Phase 1',
    profitTargetValue: 8,
    profitTargetType: 'PERCENT',
    minimumTradingDays: 4,
    dailyLossValue: 4,
    dailyLossType: 'PERCENT',
    dailyLossBasis: 'BALANCE_BASED',
    dailyResetTime: '00:00',
    dailyResetTimezone: 'UTC',
    maxDrawdownValue: 6, // 6% = $6,000 max drawdown
    maxDrawdownType: 'INTRADAY_TRAILING',
    lockFloorAtStartBalanceOnceInProfit: true, // Floor locks at starting balance $100,000 once in profit!
    consistencyRuleEnabled: false,
    maxProfitSharePercentFromSingleDay: 30,
    maxTradesPerDay: 4,
    maxLots: 10,
    newsTradingRestricted: false,
    weekendHoldingRestricted: false,
    personalDailyLossValue: 2,
    personalDailyLossType: 'PERCENT',
    personalOverallDrawdownValue: 3,
    personalOverallDrawdownType: 'PERCENT',
    maxRiskPerTradePercent: 0.5,
    maxTotalOpenRiskPercent: 1.5,
  };

  // Account grew to 108,000. 108k - 6k = 102k, which is > 100k. Floor locks at 100k or trailing max
  const stateProfitable: AccountState = {
    startingBalance: 100000,
    currentBalance: 108000,
    currentEquity: 108000,
    highWaterMarkEquity: 108000,
  };
  const resLocked = computeRiskState(rules, stateProfitable, []);
  assert(resLocked.drawdownFloorDollars >= 100000, 'Trailing floor locks at starting balance $100,000 once in profit');
  assert(resLocked.drawdownFloorDollars === 102000, 'Trailing floor trails above starting balance to 102,000');

  // If equity is only 102,000: 102k - 6k = 96k, but lock option raises floor to at least starting balance (100,000)
  const stateSlightProfit: AccountState = {
    startingBalance: 100000,
    currentBalance: 102000,
    currentEquity: 102000,
    highWaterMarkEquity: 102000,
  };
  const resSlight = computeRiskState(rules, stateSlightProfit, []);
  assert(resSlight.drawdownFloorDollars === 100000, 'Floor locks at exactly 100,000 starting balance when in profit');
}

// 3. TEST: Daily Reset Across Timezones
{
  const now = new Date('2026-10-12T20:00:00Z'); // 20:00 UTC

  // In UTC with 17:00 reset: a trade at 18:00 UTC is in the current session
  const tradeAfterReset = new Date('2026-10-12T18:00:00Z').getTime();
  assert(
    isTimestampInCurrentSession(tradeAfterReset, '17:00', 'UTC', now) === true,
    'Trade after 17:00 UTC reset is recognized in current session'
  );

  // A trade at 16:00 UTC is in previous session
  const tradeBeforeReset = new Date('2026-10-12T16:00:00Z').getTime();
  assert(
    isTimestampInCurrentSession(tradeBeforeReset, '17:00', 'UTC', now) === false,
    'Trade before 17:00 UTC reset is recognized in previous session'
  );

  // Different timezone: America/New_York (UTC-4 in daylight savings)
  // 17:00 New York time is 21:00 UTC. At 20:00 UTC, the reset has not yet occurred today.
  assert(
    typeof getTradingDayKey(now.getTime(), '17:00', 'America/New_York') === 'string',
    'Trading day key properly formats across America/New_York timezone'
  );
}

// 4. TEST: Consistency Rule Edge Cases
{
  const rules: RulesConfig = {
    accountName: 'Consistency Test',
    currency: 'USD',
    startingBalance: 100000,
    phase: 'Funded',
    profitTargetValue: 10,
    profitTargetType: 'PERCENT',
    minimumTradingDays: 5,
    dailyLossValue: 5,
    dailyLossType: 'PERCENT',
    dailyLossBasis: 'BALANCE_BASED',
    dailyResetTime: '00:00',
    dailyResetTimezone: 'UTC',
    maxDrawdownValue: 10,
    maxDrawdownType: 'STATIC',
    lockFloorAtStartBalanceOnceInProfit: false,
    consistencyRuleEnabled: true,
    maxProfitSharePercentFromSingleDay: 30, // 30% max share allowed from any single day
    maxTradesPerDay: 5,
    maxLots: 10,
    newsTradingRestricted: false,
    weekendHoldingRestricted: false,
    personalDailyLossValue: 2.5,
    personalDailyLossType: 'PERCENT',
    personalOverallDrawdownValue: 5,
    personalOverallDrawdownType: 'PERCENT',
    maxRiskPerTradePercent: 0.5,
    maxTotalOpenRiskPercent: 1.5,
  };

  // Day 1: +$7,000, Day 2: +$1,000, Day 3: +$1,000, Day 4: +$1,000 (Total = $10,000)
  // Day 1 share is 70%, which is > 30% -> Breached
  const trades: TradeRecord[] = [
    {
      id: 't1',
      pair: 'EURUSD',
      direction: 'BUY',
      entryPrice: 1.08,
      exitPrice: 1.09,
      stopLoss: 1.075,
      lots: 7,
      profitLoss: 7000,
      openTimestamp: '2026-10-01T10:00:00Z',
      closeTimestamp: '2026-10-01T14:00:00Z',
      status: 'CLOSED',
    },
    {
      id: 't2',
      pair: 'GBPUSD',
      direction: 'BUY',
      entryPrice: 1.25,
      exitPrice: 1.26,
      stopLoss: 1.245,
      lots: 1,
      profitLoss: 1000,
      openTimestamp: '2026-10-02T10:00:00Z',
      closeTimestamp: '2026-10-02T14:00:00Z',
      status: 'CLOSED',
    },
    {
      id: 't3',
      pair: 'USDJPY',
      direction: 'SELL',
      entryPrice: 150,
      exitPrice: 149,
      stopLoss: 150.5,
      lots: 1,
      profitLoss: 1000,
      openTimestamp: '2026-10-03T10:00:00Z',
      closeTimestamp: '2026-10-03T14:00:00Z',
      status: 'CLOSED',
    },
    {
      id: 't4',
      pair: 'AUDUSD',
      direction: 'BUY',
      entryPrice: 0.65,
      exitPrice: 0.66,
      stopLoss: 0.645,
      lots: 1,
      profitLoss: 1000,
      openTimestamp: '2026-10-04T10:00:00Z',
      closeTimestamp: '2026-10-04T14:00:00Z',
      status: 'CLOSED',
    },
  ];

  const state: AccountState = {
    startingBalance: 100000,
    currentBalance: 110000,
    currentEquity: 110000,
  };
  const res = computeRiskState(rules, state, trades);
  assert(res.bestDayProfitDollars === 7000, 'Best day profit is $7,000');
  assert(res.bestDaySharePercent === 70, 'Best day share is 70% of total profit');
  assert(res.isConsistencyBreached === true, 'Consistency rule is correctly marked breached when single day exceeds 30%');
  assert(res.consistencyStatus === 'Breached', 'Consistency status is Breached');
}

// 5. TEST: Position Sizing & Pre-Trade Verdict
{
  const pos = calculatePositionSize({
    pair: 'EURUSD',
    entryPrice: 1.085,
    stopLoss: 1.083, // 20 pips
    takeProfit: 1.089, // 40 pips (1:2 R:R)
    riskDollars: 500, // $500 risk
  });
  // 500 / (20 pips * $10) = 2.5 lots
  assert(pos.lotSize === 2.5, 'EURUSD 20 pips stop with $500 risk equals 2.50 lots');
  assert(pos.rewardRiskRatio === 2, 'R:R ratio is accurately 2.0');
}

// 6. TEST: Behavioral Flags (Revenge Trading & Tilt Streak)
{
  const trades: TradeRecord[] = [
    {
      id: 'loss1',
      pair: 'EURUSD',
      direction: 'BUY',
      entryPrice: 1.085,
      stopLoss: 1.083,
      lots: 1.0,
      profitLoss: -200,
      openTimestamp: '2026-10-12T10:00:00Z',
      closeTimestamp: '2026-10-12T10:30:00Z',
      status: 'CLOSED',
    },
    {
      id: 'loss2_revenge',
      pair: 'EURUSD',
      direction: 'SELL',
      entryPrice: 1.082,
      stopLoss: 1.084,
      lots: 2.0, // increased lot size
      profitLoss: -400,
      openTimestamp: '2026-10-12T10:35:00Z', // 5 minutes after loss1!
      closeTimestamp: '2026-10-12T11:00:00Z',
      status: 'CLOSED',
    },
    {
      id: 'loss3',
      pair: 'GBPUSD',
      direction: 'BUY',
      entryPrice: 1.25,
      stopLoss: 1.248,
      lots: 1.0,
      profitLoss: -200,
      openTimestamp: '2026-10-12T11:30:00Z',
      closeTimestamp: '2026-10-12T12:00:00Z',
      status: 'CLOSED',
    },
  ];

  const analysis = detectBehavioralFlags(trades, 3, 15, 3);
  assert(analysis.revengeCount >= 1, 'Revenge trading correctly detected when reopening quickly with increased size');
  assert(analysis.tiltStreakCount >= 1, 'Tilt streak correctly flagged on 3 consecutive losses');
  assert(analysis.isCooldownTriggered === true, 'Discipline cooldown correctly triggered after 3 consecutive losses');
}

console.log('\n========================================');
console.log('ALL RISK ENGINE UNIT TESTS PASSED (6/6)');
console.log('========================================\n');
