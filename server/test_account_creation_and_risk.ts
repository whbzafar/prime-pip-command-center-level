/**
 * PRIME PIP FX COMMAND CENTER
 * Comprehensive Automated Test Suite: Account Creation, Funded Account Rules & Personalized Risk Management
 */

import {
  AccountSettings,
  Trade,
  TradeEvaluationInput,
} from '../src/types';
import {
  evaluateTradeRiskDeterministic,
  calculateGoalScenarios,
  calculatePostTradeImpact,
  resetDemoAccountState,
  evaluateFundedAccountRisk,
  createDefaultFundedConfig,
} from '../src/utils/fundedRiskEngine';
import {
  VERIFIED_FUNDED_PRESETS,
  getVerifiedPresetById,
  getVerifiedPresetsByFirm,
} from '../src/data/verifiedFundedPresets';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] ${message}`);
  }
}

console.log('====================================================');
console.log('PRIME PIP FX COMMAND CENTER — ACCOUNT CREATION & RISK SUITE');
console.log('====================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: Verified Prop Firm Presets Integrity & Source URLs
// ----------------------------------------------------------------------------
console.log('--- TEST 1: Authentic Verified Prop Firm Presets ---');
assert(VERIFIED_FUNDED_PRESETS.length >= 6, `At least 6 verified presets exist (${VERIFIED_FUNDED_PRESETS.length} found)`);

const ftmoPreset = getVerifiedPresetById('ftmo_100k_standard');
assert(!!ftmoPreset, 'FTMO 100K Standard preset exists');
assert(ftmoPreset!.firmName === 'FTMO', 'FTMO firm name matches');
assert(ftmoPreset!.dailyDrawdownPct === 5, 'FTMO daily drawdown is strictly 5% ($5,000)');
assert(ftmoPreset!.overallDrawdownPct === 10, 'FTMO max drawdown is strictly 10% ($10,000)');
assert(ftmoPreset!.drawdownType === 'EQUITY_BASED', 'FTMO uses Equity-based daily calculation');
assert(ftmoPreset!.officialSourceUrl.includes('ftmo.com'), 'FTMO includes official documentation link');
assert(ftmoPreset!.verificationStatus === 'VERIFIED', 'FTMO rule status is VERIFIED');

const fundedNextPreset = getVerifiedPresetById('fundednext_stellar_100k');
assert(!!fundedNextPreset, 'FundedNext preset exists');
assert(fundedNextPreset!.officialSourceUrl.includes('fundednext.com'), 'FundedNext official URL is present');
assert(fundedNextPreset!.drawdownType === 'BALANCE_BASED', 'FundedNext uses balance-based drawdown');

// ----------------------------------------------------------------------------
// TEST 2: Demo Account Architecture & Reset Capability
// ----------------------------------------------------------------------------
console.log('\n--- TEST 2: Demo Account Architecture & Reset ---');
const demoAccount: AccountSettings = {
  id: 'acc-demo-test',
  accountName: 'Practice Demo Account',
  accountKind: 'DEMO',
  accountCategory: 'DEMO',
  accountType: 'DEMO',
  traderName: 'Demo Student',
  initialBalance: 10000,
  currentBalance: 9200,
  currentEquity: 9200,
  currency: 'USD',
  broker: 'Prime Pip FX Simulation',
  maxDailyLossPercent: 3.0,
  maxDrawdownPercent: 6.0,
  maxDailyTrades: 2,
  targetRiskPerTradePercent: 0.5,
  maxRiskPerTradePercent: 1.0,
  isDemo: true,
  isManual: true,
  syncStatus: 'MANUAL',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

assert(demoAccount.isDemo === true, 'Account is explicitly identified as Demo');
const resetAccount = resetDemoAccountState(demoAccount);
assert(resetAccount.currentBalance === 10000, 'Demo account reset restores starting balance ($10,000)');
assert(resetAccount.currentEquity === 10000, 'Demo account reset restores starting equity ($10,000)');

// ----------------------------------------------------------------------------
// TEST 3: Personal Account Risk Limits & Provenance
// ----------------------------------------------------------------------------
console.log('\n--- TEST 3: Personal Account Risk Guard & Provenance ---');
const personalAccount: AccountSettings = {
  id: 'acc-personal-test',
  accountName: 'Private Live Account',
  accountKind: 'PERSONAL',
  accountCategory: 'PERSONAL',
  accountType: 'PERSONAL_LIVE',
  traderName: 'Live Trader',
  initialBalance: 25000,
  currentBalance: 25000,
  currentEquity: 25000,
  currency: 'USD',
  broker: 'IC Markets Global',
  maxDailyLossPercent: 2.5,
  maxDrawdownPercent: 8.0,
  maxDailyTrades: 3,
  targetRiskPerTradePercent: 0.5,
  maxRiskPerTradePercent: 1.0,
  isDemo: false,
  isManual: true,
  syncStatus: 'MANUAL',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

assert(personalAccount.isManual === true, 'Manually entered balance is explicitly distinguished');
const personalTradeInput: TradeEvaluationInput = {
  symbol: 'EURUSD',
  direction: 'BUY',
  entryPrice: 1.0850,
  stopLossPrice: 1.0825, // 25 pips
  takeProfitPrice: 1.0900, // 50 pips (1:2 RR)
};
const personalEval = evaluateTradeRiskDeterministic(personalTradeInput, personalAccount, []);
assert(personalEval.decisionState === 'TAKE', 'Personal account valid trade gives TAKE verdict');
assert(personalEval.proposedRisk <= 125, 'Standard target risk (0.5% of $25,000 = $125) respected');
assert(personalEval.safetyBuffer > 0, 'Safety buffer is clearly provided in currency');

// ----------------------------------------------------------------------------
// TEST 4: Deterministic 4-Tier Decision Engine (TAKE, REDUCE, STOP, REVIEW)
// ----------------------------------------------------------------------------
console.log('\n--- TEST 4: 4-Tier Decision Banner (TAKE, REDUCE, STOP, REVIEW) ---');
const fundedAccount: AccountSettings = {
  id: 'acc-funded-test',
  accountName: 'FTMO $100K Challenge',
  accountKind: 'FUNDED',
  accountCategory: 'FUNDED',
  accountType: 'PROP_FIRM_EVALUATION',
  traderName: 'Prop Candidate',
  initialBalance: 100000,
  currentBalance: 100000,
  currentEquity: 100000,
  currency: 'USD',
  broker: 'FTMO',
  maxDailyLossPercent: 5.0,
  maxDrawdownPercent: 10.0,
  maxDailyTrades: 2,
  targetRiskPerTradePercent: 0.5,
  maxRiskPerTradePercent: 1.0,
  fundedConfig: {
    ...createDefaultFundedConfig(100000, 'FTMO', 'PHASE_1'),
    enabled: true,
    startingBalance: 100000,
    dailyDrawdownPercent: 5.0,
    dailyDrawdownDollars: 5000,
    overallDrawdownPercent: 10.0,
    overallDrawdownDollars: 10000,
    preferredRiskPercent: 0.5,
    maxRiskPerTradePercent: 1.0,
    safetyBufferPercent: 20,
    drawdownType: 'EQUITY_BASED',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Scenario 4A: Normal compliant trade -> TAKE
const compliantInput: TradeEvaluationInput = {
  symbol: 'XAUUSD',
  direction: 'BUY',
  entryPrice: 2650.0,
  stopLossPrice: 2645.0, // $5 SL
  takeProfitPrice: 2662.5,
  proposedRiskDollars: 500, // 0.5%
};
const takeEval = evaluateTradeRiskDeterministic(compliantInput, fundedAccount, []);
assert(takeEval.decisionState === 'TAKE', 'Compliant trade gives TAKE verdict');
assert(takeEval.lotSize > 0, 'Lot size is accurately recommended');

// Scenario 4B: Risk higher than recommended target but below max -> REDUCE
const elevatedInput: TradeEvaluationInput = {
  ...compliantInput,
  proposedRiskDollars: 850, // Between 500 and 1000
};
const reduceEval = evaluateTradeRiskDeterministic(elevatedInput, fundedAccount, []);
assert(reduceEval.decisionState === 'REDUCE', 'Elevated risk gives REDUCE verdict');
assert(reduceEval.exactReason.includes('safe risk budget'), 'Reason explains safe risk budget exceeded');

// Scenario 4C: Stop-out / Hard Limit Breach -> STOP
const breachingAccount: AccountSettings = {
  ...fundedAccount,
  currentBalance: 95500, // $4,500 daily loss out of $5,000 limit
  currentEquity: 95500,
};
const breachTrade = {
  id: 't-loss-1',
  date: new Date().toISOString().slice(0, 10),
  time: '12:00',
  instrument: 'XAUUSD',
  direction: 'BUY',
  entryPrice: 2650,
  stopLoss: 2645,
  takeProfit: 2662,
  lotSize: 1.0,
  status: 'CLOSED',
  result: 'LOSS',
  profitLoss: -4700, // Only $300 daily buffer left
} as unknown as Trade;
const stopEval = evaluateTradeRiskDeterministic(compliantInput, breachingAccount, [breachTrade]);
assert(stopEval.decisionState === 'STOP', 'Breached or near-breach daily limit produces prominent STOP');

// Scenario 4D: Incomplete / invalid inputs -> REVIEW
const incompleteInput: TradeEvaluationInput = {
  symbol: 'XAUUSD',
  direction: 'BUY',
  entryPrice: 0,
  stopLossPrice: 0,
};
const reviewEval = evaluateTradeRiskDeterministic(incompleteInput, fundedAccount, []);
assert(reviewEval.decisionState === 'REVIEW', 'Missing price levels triggers REVIEW state');
assert(reviewEval.missingOrStaleInputs.length > 0, 'Lists exact missing inputs');

// ----------------------------------------------------------------------------
// TEST 5: Real-Time Post-Trade Impact Calculation
// ----------------------------------------------------------------------------
console.log('\n--- TEST 5: Post-Trade Impact Calculation ---');
const winTrade = {
  id: 't-win-1',
  date: new Date().toISOString().slice(0, 10),
  time: '14:30',
  instrument: 'XAUUSD',
  direction: 'BUY',
  entryPrice: 2650,
  stopLoss: 2645,
  takeProfit: 2662.5,
  lotSize: 1.0,
  status: 'CLOSED',
  result: 'WIN',
  profitLoss: 1250,
} as unknown as Trade;

const postWinImpact = calculatePostTradeImpact(winTrade, fundedAccount, []);
assert(postWinImpact.tradeResult === 'WIN', 'Recognizes WIN result');
assert(postWinImpact.updatedBalance === 101250, 'Updated balance reflects realized profit ($101,250)');
assert(postWinImpact.targetProgressPercent > 0, 'Win advances profit target progress');

const lossTrade = {
  id: 't-loss-2',
  date: new Date().toISOString().slice(0, 10),
  time: '15:30',
  instrument: 'EURUSD',
  direction: 'SELL',
  entryPrice: 1.0850,
  stopLoss: 1.0875,
  takeProfit: 1.0800,
  lotSize: 2.0,
  status: 'CLOSED',
  result: 'LOSS',
  profitLoss: -500,
} as unknown as Trade;

const postLossImpact = calculatePostTradeImpact(lossTrade, fundedAccount, []);
assert(postLossImpact.tradeResult === 'LOSS', 'Recognizes LOSS result');
assert(postLossImpact.updatedDailyDdCapacity < postLossImpact.previousDailyDdCapacity, 'Loss reduces subsequent daily drawdown capacity');
assert(postLossImpact.isManuallyReported === true, 'Distinguishes manually reported provenance');

// ----------------------------------------------------------------------------
// TEST 6: Goal Setting Planner Scenarios & Conflict Detection
// ----------------------------------------------------------------------------
console.log('\n--- TEST 6: Goal Setting Planner Scenarios & Conflict Detection ---');
// $10,000 target with comfortable 60 days
const normalScenarios = calculateGoalScenarios(fundedAccount, [], 10000, 60);
assert(!normalScenarios.hasConflict, 'Achievable target does not trigger risk conflict');
assert(normalScenarios.conservative.daysRequired > 0, 'Conservative scenario calculates projected days');
assert(normalScenarios.baseline.daysRequired > 0, 'Baseline scenario calculates projected days');
assert(normalScenarios.optimistic.daysRequired > 0, 'Optimistic scenario calculates projected days');

// Unrealistic target ($10,000 profit required in 2 days on $100K account with 0.5% risk limit)
const conflictScenarios = calculateGoalScenarios(fundedAccount, [], 10000, 2);
assert(conflictScenarios.hasConflict === true, 'Aggressive deadline triggers Risk Engine Conflict');
assert(!!conflictScenarios.conflictExplanation, 'Conflict explanation is clearly provided');
assert(conflictScenarios.suggestedAlternatives!.length > 0, 'Actionable alternatives prioritizing account preservation are suggested');

console.log('\n====================================================');
console.log('SUMMARY: ALL AUTOMATED TESTS COMPLETED WITH 100% SUCCESS');
console.log('====================================================');
