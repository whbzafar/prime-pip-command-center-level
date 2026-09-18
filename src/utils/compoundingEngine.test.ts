import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_TRADING_DAYS_PER_MONTH,
  calculateCompoundingProjection,
} from './compoundingEngine';

test('one month uses exactly 21 trading days in the simulation', () => {
  const projection = calculateCompoundingProjection({
    startingBalance: 1000,
    compoundingMode: 'PERCENTAGE_COMPOUNDING',
    riskPercent: 1,
    fixedRiskAmount: 25,
    expectedWinRate: 50,
    riskRewardRatio: 2,
    tradesPerDay: 1,
    tradingDaysPerMonth: DEFAULT_TRADING_DAYS_PER_MONTH,
    calculationMonths: 1,
  });

  assert.equal(projection.totalDays, 21);
  assert.equal(projection.rows.length, 21);
  assert.equal(projection.rows[0].day, 1);
  assert.equal(projection.rows[projection.rows.length - 1].day, 21);
});

test('invalid trading day inputs fall back to the 21-day month default', () => {
  const projection = calculateCompoundingProjection({
    startingBalance: 1000,
    compoundingMode: 'PERCENTAGE_COMPOUNDING',
    riskPercent: 1,
    fixedRiskAmount: 25,
    expectedWinRate: 50,
    riskRewardRatio: 2,
    tradesPerDay: 1,
    tradingDaysPerMonth: 0,
    calculationMonths: 1,
  });

  assert.equal(projection.totalDays, 21);
  assert.equal(projection.rows.length, 21);
});
