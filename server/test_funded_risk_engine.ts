/**
 * Test Suite for Prime FX Funded Account Risk Engine (Master Prompt Section 38 Verification)
 */

import {
  evaluateFundedAccountRisk,
  calculateDailyDrawdown,
  calculateOverallDrawdown,
  calculateTrailingDrawdown,
  calculateLotSize,
  evaluateTrade,
  calculatePhaseProgress,
  getEffectiveFundedConfig,
} from '../src/utils/fundedRiskEngine.js';
import { AccountSettings, FundedAccountConfig, Trade } from '../src/types.js';

function runTests() {
  console.log('====================================================');
  console.log('PRIME FX COMMAND CENTER — FUNDED RISK ENGINE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} — ${details || 'Assertion failed'}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Baseline $5,000 Account, Daily DD $200, Overall DD $500, Risk 0.5%
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Baseline $5,000 Account ---');
  const baseConfig: FundedAccountConfig = {
    enabled: true,
    firmName: 'My Prop Firm',
    accountSize: 5000,
    startingBalance: 5000,
    phase: 'PHASE_1',
    profitTargets: {
      phase1TargetDollars: 500,
      phase1TargetPercent: 10,
      phase2TargetDollars: 250,
      phase2TargetPercent: 5,
    },
    dailyDrawdownDollars: 200,
    dailyDrawdownPercent: 4,
    overallDrawdownDollars: 500,
    overallDrawdownPercent: 10,
    drawdownType: 'STATIC',
    preferredRiskPercent: 0.5,
    maxRiskPerTradePercent: 1.0,
    riskMode: 'BALANCED',
    safetyBufferPercent: 20,
  };

  const acc1: AccountSettings = {
    id: 'test-acc-1',
    traderName: 'VIPER',
    accountName: '5K Prop Challenge',
    accountType: 'PROP_FIRM_EVALUATION',
    accountCategory: 'FUNDED',
    fundedConfig: baseConfig,
    initialBalance: 5000,
    currentBalance: 5000,
    currentEquity: 5000,
    broker: 'My Prop Firm',
    currency: 'USD',
    maxDailyLossPercent: 4,
    maxDrawdownPercent: 10,
    maxDailyTrades: 2,
    targetRiskPerTradePercent: 0.5,
    maxRiskPerTradePercent: 1.0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const eval1 = evaluateFundedAccountRisk(acc1, []);
  assert(
    'Test 1: Preferred Risk is exactly $25 (0.5% of $5,000)',
    eval1.preferredRiskDollars === 25,
    `Got ${eval1.preferredRiskDollars}`
  );
  assert(
    'Test 1: Remaining Daily DD is $200',
    eval1.remainingDailyDrawdown === 200,
    `Got ${eval1.remainingDailyDrawdown}`
  );
  assert(
    'Test 1: Recommended Risk does not exceed $25 baseline',
    eval1.recommendedRiskDollars <= 25 && eval1.recommendedRiskDollars > 0,
    `Got ${eval1.recommendedRiskDollars}`
  );
  assert(
    'Test 1: Verdict is TAKE_TRADE (Green)',
    eval1.verdict === 'TAKE_TRADE',
    `Got ${eval1.verdict}`
  );

  // --------------------------------------------------------------------------
  // TEST 2: Daily Loss of $175 out of $200 Daily DD (Only $25 remains)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Daily DD Nearly Exhausted ($25 left) ---');
  const tradesLossToday = [
    {
      id: 't-1',
      accountId: 'test-acc-1',
      date: new Date().toISOString().slice(0, 10),
      time: '10:00',
      broker: 'My Prop Firm',
      accountType: 'PROP_FIRM_EVALUATION',
      accountSize: 5000,
      instrument: 'XAUUSD',
      direction: 'BUY',
      timeframe: 'M15',
      session: 'LONDON',
      entryPrice: 2650,
      stopLoss: 2640,
      takeProfit: 2670,
      exitPrice: 2640,
      lotSize: 0.175,
      result: 'LOSS',
      riskAmount: 175,
      riskPercent: 3.5,
      profitLoss: -175,
      rMultiple: -1,
      pips: -10,
      strategy: 'FVG_RETEST',
      preEmotion: 'CALM',
    },
  ] as unknown as Trade[];

  const acc2: AccountSettings = {
    ...acc1,
    currentBalance: 4825,
    currentEquity: 4825,
  };

  const eval2 = evaluateFundedAccountRisk(acc2, tradesLossToday);
  assert(
    'Test 2: Remaining Daily DD is exactly $25',
    eval2.remainingDailyDrawdown === 25,
    `Got ${eval2.remainingDailyDrawdown}`
  );
  assert(
    'Test 2: System does NOT blindly recommend $25 risk (applies buffer & streak protection)',
    eval2.recommendedRiskDollars < 25,
    `Recommended: ${eval2.recommendedRiskDollars}`
  );
  assert(
    'Test 2: Usable Daily DD respects 20% safety buffer (80% of $25 = $20)',
    eval2.usableDailyDrawdown === 20,
    `Usable DD: ${eval2.usableDailyDrawdown}`
  );
  assert(
    'Test 2: Decision reflects REDUCE_RISK or STOP_TRADING when near breach',
    eval2.verdict === 'REDUCE_RISK' || eval2.verdict === 'STOP_TRADING',
    `Verdict: ${eval2.verdict}`
  );

  // --------------------------------------------------------------------------
  // TEST 3: Overall Drawdown Near Limit ($45 remaining of $500)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Overall Drawdown Near Max ($45 left) ---');
  const acc3: AccountSettings = {
    ...acc1,
    currentBalance: 4545, // $455 lost overall
    currentEquity: 4545,
  };

  const eval3 = evaluateFundedAccountRisk(acc3, []);
  assert(
    'Test 3: Remaining Overall DD is exactly $45',
    eval3.remainingOverallDrawdown === 45,
    `Got ${eval3.remainingOverallDrawdown}`
  );
  assert(
    'Test 3: Recommended risk is strictly <= usable overall allowance',
    eval3.recommendedRiskDollars <= 45 * 0.8,
    `Recommended: ${eval3.recommendedRiskDollars}`
  );
  assert(
    'Test 3: Health score reflects critical warning state (< 60)',
    eval3.healthScore.score < 60,
    `Score: ${eval3.healthScore.score}`
  );

  // --------------------------------------------------------------------------
  // TEST 4: Trailing Drawdown Logic with Substantial Profit ($5,300)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Trailing Drawdown Logic ($5,300 Balance) ---');
  const trailingConfig: FundedAccountConfig = {
    ...baseConfig,
    drawdownType: 'TRAILING',
    trailingConfig: {
      trailingBasis: 'BALANCE',
      unrealizedProfitAffectsTrailing: false,
      lockAtStartingBalance: false,
    },
  };

  const acc4: AccountSettings = {
    ...acc1,
    fundedConfig: trailingConfig,
    currentBalance: 5300,
    currentEquity: 5300,
  };

  const trailRes = calculateTrailingDrawdown(acc4, [], trailingConfig);
  assert(
    'Test 4: High Water Mark is $5,300',
    trailRes.highWaterMark === 5300,
    `HWM: ${trailRes.highWaterMark}`
  );
  assert(
    'Test 4: Trailing floor trailed up from $4,500 to $4,800 ($5,300 - $500)',
    trailRes.activeLiquidationThreshold === 4800,
    `Threshold: ${trailRes.activeLiquidationThreshold}`
  );

  // With floor lock at starting balance ($5,000):
  const lockedTrailingConfig: FundedAccountConfig = {
    ...trailingConfig,
    trailingConfig: {
      ...trailingConfig.trailingConfig,
      lockAtStartingBalance: true,
    },
  };
  const acc4Locked: AccountSettings = {
    ...acc4,
    currentBalance: 5600, // floor would be $5,100, but locked at starting balance $5,000
    currentEquity: 5600,
    fundedConfig: lockedTrailingConfig,
  };
  const trailResLocked = calculateTrailingDrawdown(acc4Locked, [], lockedTrailingConfig);
  assert(
    'Test 4: Trailing floor locks at Starting Balance ($5,000) when configured',
    trailResLocked.activeLiquidationThreshold === 5000 && trailResLocked.isTrailingLocked,
    `Threshold: ${trailResLocked.activeLiquidationThreshold}, locked: ${trailResLocked.isTrailingLocked}`
  );

  // --------------------------------------------------------------------------
  // TEST 5: Equity vs Balance Based Drawdown (Floating Loss of $150)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Equity vs Balance Based Drawdown ---');
  const equityConfig: FundedAccountConfig = {
    ...baseConfig,
    drawdownType: 'EQUITY_BASED',
  };
  const balanceConfig: FundedAccountConfig = {
    ...baseConfig,
    drawdownType: 'BALANCE_BASED',
  };

  const accFloating: AccountSettings = {
    ...acc1,
    currentBalance: 5000,
    currentEquity: 4850, // -$150 floating open drawdown
    fundedConfig: {
      ...equityConfig,
      openFloatingPnL: -150,
    },
  };

  const dailyEquity = calculateDailyDrawdown(accFloating, [], equityConfig);
  assert(
    'Test 5: Equity-based DD counts -$150 floating loss ($50 DD remaining of $200)',
    dailyEquity.remainingDailyDrawdown === 50,
    `Got ${dailyEquity.remainingDailyDrawdown}`
  );

  const dailyBalance = calculateDailyDrawdown(accFloating, [], balanceConfig);
  assert(
    'Test 5: Balance-based DD ignores unrealized floating loss ($200 DD remaining)',
    dailyBalance.remainingDailyDrawdown === 200,
    `Got ${dailyBalance.remainingDailyDrawdown}`
  );

  // --------------------------------------------------------------------------
  // TEST 6: Dynamic Scaling for $100,000 Institutional Account
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Scaling for $100,000 Account ---');
  const config100k: FundedAccountConfig = {
    ...baseConfig,
    firmName: 'FTMO',
    accountSize: 100000,
    startingBalance: 100000,
    profitTargets: {
      phase1TargetDollars: 10000, // 10%
      phase1TargetPercent: 10,
      phase2TargetDollars: 5000,  // 5%
      phase2TargetPercent: 5,
    },
    dailyDrawdownDollars: 5000,   // 5%
    dailyDrawdownPercent: 5,
    overallDrawdownDollars: 10000, // 10%
    overallDrawdownPercent: 10,
    preferredRiskPercent: 1.0,    // $1,000
    maxRiskPerTradePercent: 1.0,
  };

  const acc100k: AccountSettings = {
    ...acc1,
    initialBalance: 100000,
    currentBalance: 100000,
    currentEquity: 100000,
    fundedConfig: config100k,
  };

  const eval100k = evaluateFundedAccountRisk(acc100k, []);
  assert(
    'Test 6: $100K Preferred Risk is $1,000 (1%)',
    eval100k.preferredRiskDollars === 1000,
    `Got ${eval100k.preferredRiskDollars}`
  );
  assert(
    'Test 6: $100K Daily DD remaining is $5,000',
    eval100k.remainingDailyDrawdown === 5000,
    `Got ${eval100k.remainingDailyDrawdown}`
  );
  assert(
    'Test 6: $100K Overall DD remaining is $10,000',
    eval100k.remainingOverallDrawdown === 10000,
    `Got ${eval100k.remainingOverallDrawdown}`
  );

  // Gold Lot Sizing calculation for $1,000 risk with 25 pips SL ($2.50 price distance)
  const goldLot = calculateLotSize('XAUUSD', 2650.0, 2647.5, 1000, 'USD');
  assert(
    'Test 6: Gold lot size for $1,000 risk / 25 pips = 4.00 lots',
    goldLot.lotSize === 4.0,
    `Got ${goldLot.lotSize} lots (stop pips: ${goldLot.stopDistancePips})`
  );

  // --------------------------------------------------------------------------
  // TEST 7: Trade Evaluation / "Can I Take This Trade?"
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Trade Approval Simulation ---');
  const approvedTrade = evaluateTrade(
    {
      symbol: 'XAUUSD',
      direction: 'BUY',
      entryPrice: 2650.0,
      stopLossPrice: 2645.0, // 50 pips
      takeProfitPrice: 2665.0, // 1:3 R:R
      proposedRiskDollars: 25,
    },
    acc1,
    [],
    baseConfig
  );
  assert(
    'Test 7: Proposed $25 risk on $125+ DD is APPROVED',
    approvedTrade.status === 'APPROVED',
    `Status: ${approvedTrade.status}`
  );
  assert(
    'Test 7: Remaining Daily DD after simulated SL is $175 ($200 - $25)',
    approvedTrade.remainingDailyDdAfterStopLoss === 175,
    `Remaining: ${approvedTrade.remainingDailyDdAfterStopLoss}`
  );

  const rejectedTrade = evaluateTrade(
    {
      symbol: 'XAUUSD',
      direction: 'BUY',
      entryPrice: 2650.0,
      stopLossPrice: 2645.0,
      takeProfitPrice: 2665.0,
      proposedRiskDollars: 250, // exceeds $200 Daily DD!
    },
    acc1,
    [],
    baseConfig
  );
  assert(
    'Test 7: Proposed $250 risk exceeding $200 Daily DD is REJECTED',
    rejectedTrade.status === 'REJECTED',
    `Status: ${rejectedTrade.status}`
  );

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    console.log('🎉 ALL FUNDED RISK ENGINE TESTS SUCCEEDED PERFECTLY!');
  } else {
    process.exit(1);
  }
}

runTests();
