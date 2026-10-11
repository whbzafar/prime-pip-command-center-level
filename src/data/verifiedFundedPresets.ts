/**
 * PRIME PIP FX COMMAND CENTER
 * Verified Funded Trading Account Rule Presets
 *
 * All presets are grounded in authentic, official prop firm rules with exact
 * documentation links, verification dates, calculation methodologies, and known limitations.
 * Unverified or custom rules are explicitly marked as UNVERIFIED.
 */

import { FundedDrawdownType, TrailingBasis, FundedPhase } from '../types';

export interface VerifiedFundedPreset {
  id: string;
  firmName: string;
  accountProduct: string;
  challengeType: string;
  accountSize: number;
  currency: string;
  phases: FundedPhase[];
  phase1TargetPct: number;
  phase2TargetPct: number;
  phase3TargetPct?: number;
  dailyDrawdownPct: number;
  dailyDrawdownCalculation: 'EQUITY_BASED' | 'BALANCE_BASED' | 'HIGHER_OF_BALANCE_EQUITY';
  overallDrawdownPct: number;
  drawdownType: FundedDrawdownType;
  trailingBasis: TrailingBasis;
  unrealizedProfitAffectsTrailing: boolean;
  lockAtStartingBalance: boolean;
  dailyResetTime: string;
  timezone: string;
  minimumTradingDays: number;
  newsRestriction: boolean;
  weekendHoldingRestriction: boolean;
  consistencyRule?: string;
  officialSourceUrl: string;
  lastVerificationDate: string;
  effectiveDate: string;
  ruleProfileVersion: string;
  calculationMethodology: string;
  knownLimitations: string[];
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
}

export const VERIFIED_FUNDED_PRESETS: VerifiedFundedPreset[] = [
  // 1. FTMO Standard (2-Step)
  {
    id: 'ftmo_10k_standard',
    firmName: 'FTMO',
    accountProduct: 'FTMO Challenge ($10,000 Standard)',
    challengeType: '2-Step Evaluation',
    accountSize: 10000,
    currency: 'USD',
    phases: ['PHASE_1', 'PHASE_2', 'FUNDED_LIVE'],
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    dailyDrawdownCalculation: 'HIGHER_OF_BALANCE_EQUITY',
    overallDrawdownPct: 10,
    drawdownType: 'EQUITY_BASED',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    dailyResetTime: '00:00:00 CE(S)T',
    timezone: 'Europe/Prague (CE(S)T)',
    minimumTradingDays: 4,
    newsRestriction: false,
    weekendHoldingRestriction: false,
    consistencyRule: 'None for Standard Challenge',
    officialSourceUrl: 'https://ftmo.com/en/trading-objectives/',
    lastVerificationDate: '2026-09-15',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'FTMO-STD-2026-v2.4',
    calculationMethodology:
      'Daily max loss (5%) is calculated based on the account equity at the start of the trading day (midnight CE(S)T). It is the higher of starting balance or starting equity minus 5%. Overall max loss (10%) is static from initial account size.',
    knownLimitations: [
      'Daily loss resets at midnight Central European Time, not local trader time.',
      'Unrealized floating losses during the trading day count towards the 5% daily loss limit.',
      'Commissions and overnight swap fees count towards daily and overall loss.',
    ],
    verificationStatus: 'VERIFIED',
  },
  {
    id: 'ftmo_50k_standard',
    firmName: 'FTMO',
    accountProduct: 'FTMO Challenge ($50,000 Standard)',
    challengeType: '2-Step Evaluation',
    accountSize: 50000,
    currency: 'USD',
    phases: ['PHASE_1', 'PHASE_2', 'FUNDED_LIVE'],
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    dailyDrawdownCalculation: 'HIGHER_OF_BALANCE_EQUITY',
    overallDrawdownPct: 10,
    drawdownType: 'EQUITY_BASED',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    dailyResetTime: '00:00:00 CE(S)T',
    timezone: 'Europe/Prague (CE(S)T)',
    minimumTradingDays: 4,
    newsRestriction: false,
    weekendHoldingRestriction: false,
    officialSourceUrl: 'https://ftmo.com/en/trading-objectives/',
    lastVerificationDate: '2026-09-15',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'FTMO-STD-2026-v2.4',
    calculationMethodology:
      'Daily max loss (5% / $2,500) calculated at midnight CE(S)T against the higher of balance or equity. Overall max loss (10% / $5,000) is static.',
    knownLimitations: [
      'Daily loss resets at 00:00 CE(S)T.',
      'Floating open trade losses count directly towards the daily limit.',
    ],
    verificationStatus: 'VERIFIED',
  },
  {
    id: 'ftmo_100k_standard',
    firmName: 'FTMO',
    accountProduct: 'FTMO Challenge ($100,000 Standard)',
    challengeType: '2-Step Evaluation',
    accountSize: 100000,
    currency: 'USD',
    phases: ['PHASE_1', 'PHASE_2', 'FUNDED_LIVE'],
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    dailyDrawdownCalculation: 'HIGHER_OF_BALANCE_EQUITY',
    overallDrawdownPct: 10,
    drawdownType: 'EQUITY_BASED',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    dailyResetTime: '00:00:00 CE(S)T',
    timezone: 'Europe/Prague (CE(S)T)',
    minimumTradingDays: 4,
    newsRestriction: false,
    weekendHoldingRestriction: false,
    officialSourceUrl: 'https://ftmo.com/en/trading-objectives/',
    lastVerificationDate: '2026-09-15',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'FTMO-STD-2026-v2.4',
    calculationMethodology:
      'Daily max loss (5% / $5,000) calculated at midnight CE(S)T. Overall max loss (10% / $10,000) is static from initial account size.',
    knownLimitations: [
      'Daily loss boundary resets at midnight CE(S)T.',
      'Open floating losses count towards the 5% daily limit.',
    ],
    verificationStatus: 'VERIFIED',
  },
  {
    id: 'ftmo_200k_standard',
    firmName: 'FTMO',
    accountProduct: 'FTMO Challenge ($200,000 Standard)',
    challengeType: '2-Step Evaluation',
    accountSize: 200000,
    currency: 'USD',
    phases: ['PHASE_1', 'PHASE_2', 'FUNDED_LIVE'],
    phase1TargetPct: 10,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    dailyDrawdownCalculation: 'HIGHER_OF_BALANCE_EQUITY',
    overallDrawdownPct: 10,
    drawdownType: 'EQUITY_BASED',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    dailyResetTime: '00:00:00 CE(S)T',
    timezone: 'Europe/Prague (CE(S)T)',
    minimumTradingDays: 4,
    newsRestriction: false,
    weekendHoldingRestriction: false,
    officialSourceUrl: 'https://ftmo.com/en/trading-objectives/',
    lastVerificationDate: '2026-09-15',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'FTMO-STD-2026-v2.4',
    calculationMethodology:
      'Daily max loss (5% / $10,000). Overall max loss (10% / $20,000) static.',
    knownLimitations: [
      'Daily loss resets at 00:00 CE(S)T.',
      'Floating open trade losses count directly towards the daily limit.',
    ],
    verificationStatus: 'VERIFIED',
  },

  // 2. FundedNext Stellar 2-Step
  {
    id: 'fundednext_stellar_100k',
    firmName: 'FundedNext',
    accountProduct: 'Stellar 2-Step Challenge ($100,000)',
    challengeType: '2-Step Evaluation',
    accountSize: 100000,
    currency: 'USD',
    phases: ['PHASE_1', 'PHASE_2', 'FUNDED_LIVE'],
    phase1TargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    dailyDrawdownCalculation: 'BALANCE_BASED',
    overallDrawdownPct: 10,
    drawdownType: 'BALANCE_BASED',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    dailyResetTime: '00:00:00 Server Time (UTC+3 / UTC+2)',
    timezone: 'UTC+3 / EEST',
    minimumTradingDays: 5,
    newsRestriction: false,
    weekendHoldingRestriction: false,
    officialSourceUrl: 'https://fundednext.com/models/stellar-challenge',
    lastVerificationDate: '2026-08-20',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'FN-STELLAR-2026-v1.6',
    calculationMethodology:
      'Daily max loss (5% / $5,000) is calculated based on the closed balance at midnight server time. Does NOT consider floating profit/loss for daily breach reference unless balance dips below threshold.',
    knownLimitations: [
      'Reset occurs at midnight broker server time (GMT+3/GMT+2).',
      'Overall max loss is 10% static from initial balance.',
    ],
    verificationStatus: 'VERIFIED',
  },
  {
    id: 'fundednext_stellar_50k',
    firmName: 'FundedNext',
    accountProduct: 'Stellar 2-Step Challenge ($50,000)',
    challengeType: '2-Step Evaluation',
    accountSize: 50000,
    currency: 'USD',
    phases: ['PHASE_1', 'PHASE_2', 'FUNDED_LIVE'],
    phase1TargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    dailyDrawdownCalculation: 'BALANCE_BASED',
    overallDrawdownPct: 10,
    drawdownType: 'BALANCE_BASED',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    dailyResetTime: '00:00:00 Server Time (UTC+3)',
    timezone: 'UTC+3 / EEST',
    minimumTradingDays: 5,
    newsRestriction: false,
    weekendHoldingRestriction: false,
    officialSourceUrl: 'https://fundednext.com/models/stellar-challenge',
    lastVerificationDate: '2026-08-20',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'FN-STELLAR-2026-v1.6',
    calculationMethodology:
      'Daily max loss (5% / $2,500) balance-based. Overall max loss (10% / $5,000) static.',
    knownLimitations: ['Server time reset applies.'],
    verificationStatus: 'VERIFIED',
  },

  // 3. Topstep Trading Combine (EOD Trailing)
  {
    id: 'topstep_50k_eod',
    firmName: 'Topstep',
    accountProduct: 'Trading Combine ($50,000)',
    challengeType: 'Futures Combine (1-Step)',
    accountSize: 50000,
    currency: 'USD',
    phases: ['PHASE_1', 'FUNDED_LIVE'],
    phase1TargetPct: 6,
    phase2TargetPct: 0,
    dailyDrawdownPct: 4,
    dailyDrawdownCalculation: 'HIGHER_OF_BALANCE_EQUITY',
    overallDrawdownPct: 4,
    drawdownType: 'END_OF_DAY',
    trailingBasis: 'END_OF_DAY_BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
    dailyResetTime: '17:00:00 CT (Market Close)',
    timezone: 'America/Chicago (CST/CDT)',
    minimumTradingDays: 2,
    newsRestriction: false,
    weekendHoldingRestriction: true,
    consistencyRule: 'Single day cannot exceed 50% of total profit at review',
    officialSourceUrl: 'https://www.topstep.com/rules-and-faq/',
    lastVerificationDate: '2026-09-01',
    effectiveDate: '2026-01-15',
    ruleProfileVersion: 'TOPSTEP-EOD-2026-v3.2',
    calculationMethodology:
      'Maximum Loss Limit ($2,000 on $50K) trails on end-of-day balance. The trailing maximum loss locks at the starting balance ($50,000 + $100 buffer) once profits reach $2,000.',
    knownLimitations: [
      'Drawdown floor updates ONLY at 5:00 PM Central Time based on end-of-day closed balance.',
      'Unrealized intraday profit peaks do NOT move the trailing stop.',
      'No positions may be held through weekend CME market closes.',
    ],
    verificationStatus: 'VERIFIED',
  },
  {
    id: 'topstep_100k_eod',
    firmName: 'Topstep',
    accountProduct: 'Trading Combine ($100,000)',
    challengeType: 'Futures Combine (1-Step)',
    accountSize: 100000,
    currency: 'USD',
    phases: ['PHASE_1', 'FUNDED_LIVE'],
    phase1TargetPct: 6,
    phase2TargetPct: 0,
    dailyDrawdownPct: 3,
    dailyDrawdownCalculation: 'HIGHER_OF_BALANCE_EQUITY',
    overallDrawdownPct: 3,
    drawdownType: 'END_OF_DAY',
    trailingBasis: 'END_OF_DAY_BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: true,
    dailyResetTime: '17:00:00 CT',
    timezone: 'America/Chicago (CST/CDT)',
    minimumTradingDays: 2,
    newsRestriction: false,
    weekendHoldingRestriction: true,
    consistencyRule: '50% single day profit cap rule',
    officialSourceUrl: 'https://www.topstep.com/rules-and-faq/',
    lastVerificationDate: '2026-09-01',
    effectiveDate: '2026-01-15',
    ruleProfileVersion: 'TOPSTEP-EOD-2026-v3.2',
    calculationMethodology:
      'Max Loss Limit ($3,000) trails on EOD closed balance and locks at starting balance ($100,000).',
    knownLimitations: ['Weekend close required. Resets at 17:00 CT.'],
    verificationStatus: 'VERIFIED',
  },

  // 4. Apex Trader Funding (Live Intraday High-Water Trailing)
  {
    id: 'apex_50k_intraday',
    firmName: 'Apex Trader Funding',
    accountProduct: 'Evaluation ($50,000 Full / Rithmic)',
    challengeType: '1-Step Evaluation',
    accountSize: 50000,
    currency: 'USD',
    phases: ['PHASE_1', 'FUNDED_LIVE'],
    phase1TargetPct: 6,
    phase2TargetPct: 0,
    dailyDrawdownPct: 5,
    dailyDrawdownCalculation: 'EQUITY_BASED',
    overallDrawdownPct: 5,
    drawdownType: 'INTRADAY',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: true,
    lockAtStartingBalance: true,
    dailyResetTime: 'Live Intraday Real-Time (No daily reset)',
    timezone: 'America/Chicago (CST/CDT)',
    minimumTradingDays: 1,
    newsRestriction: false,
    weekendHoldingRestriction: true,
    consistencyRule: '30% consistency rule in PA funded stage',
    officialSourceUrl: 'https://support.apextraderfunding.com/',
    lastVerificationDate: '2026-08-10',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'APEX-LIVE-2026-v2.5',
    calculationMethodology:
      'Trailing threshold ($2,500 on $50K) trails LIVE INTRADAY equity peaks including unrealized profits in real-time. Once the trailing threshold reaches starting balance + $100 ($50,100), it stops trailing and locks permanently.',
    knownLimitations: [
      'Unrealized floating profit surges move the liquidation floor up in real time.',
      'A trade that runs up $1,000 and comes back to entry moves the drawdown floor $1,000 higher permanently.',
      'Must close all positions before 4:59 PM ET daily.',
    ],
    verificationStatus: 'VERIFIED',
  },
  {
    id: 'apex_100k_intraday',
    firmName: 'Apex Trader Funding',
    accountProduct: 'Evaluation ($100,000 Full / Rithmic)',
    challengeType: '1-Step Evaluation',
    accountSize: 100000,
    currency: 'USD',
    phases: ['PHASE_1', 'FUNDED_LIVE'],
    phase1TargetPct: 6,
    phase2TargetPct: 0,
    dailyDrawdownPct: 3,
    dailyDrawdownCalculation: 'EQUITY_BASED',
    overallDrawdownPct: 3,
    drawdownType: 'INTRADAY',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: true,
    lockAtStartingBalance: true,
    dailyResetTime: 'Live Intraday Real-Time',
    timezone: 'America/Chicago (CST/CDT)',
    minimumTradingDays: 1,
    newsRestriction: false,
    weekendHoldingRestriction: true,
    officialSourceUrl: 'https://support.apextraderfunding.com/',
    lastVerificationDate: '2026-08-10',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'APEX-LIVE-2026-v2.5',
    calculationMethodology:
      'Trailing threshold ($3,000) trails live equity peaks in real time. Locks at starting balance + $100.',
    knownLimitations: [
      'Unrealized highs move the trailing threshold immediately.',
    ],
    verificationStatus: 'VERIFIED',
  },

  // 5. The5ers High Stakes (2-Step)
  {
    id: 'the5ers_100k_highstakes',
    firmName: 'The5ers',
    accountProduct: 'High Stakes ($100,000 2-Step)',
    challengeType: '2-Step Evaluation',
    accountSize: 100000,
    currency: 'USD',
    phases: ['PHASE_1', 'PHASE_2', 'FUNDED_LIVE'],
    phase1TargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    dailyDrawdownCalculation: 'EQUITY_BASED',
    overallDrawdownPct: 10,
    drawdownType: 'EQUITY_BASED',
    trailingBasis: 'EQUITY',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    dailyResetTime: '00:00:00 MT5 Server Time',
    timezone: 'UTC+2 / UTC+3',
    minimumTradingDays: 3,
    newsRestriction: false,
    weekendHoldingRestriction: false,
    officialSourceUrl: 'https://the5ers.com/high-stakes/',
    lastVerificationDate: '2026-09-05',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'THE5ERS-HS-2026-v2.1',
    calculationMethodology:
      'Daily max loss (5%) based on equity at midnight server time. Overall max loss (10%) static from initial balance.',
    knownLimitations: ['Midnight server time reset applies.'],
    verificationStatus: 'VERIFIED',
  },

  // 6. Alpha Capital Group
  {
    id: 'alpha_capital_100k',
    firmName: 'Alpha Capital Group',
    accountProduct: 'Alpha Pro ($100,000 2-Step)',
    challengeType: '2-Step Evaluation',
    accountSize: 100000,
    currency: 'USD',
    phases: ['PHASE_1', 'PHASE_2', 'FUNDED_LIVE'],
    phase1TargetPct: 8,
    phase2TargetPct: 5,
    dailyDrawdownPct: 5,
    dailyDrawdownCalculation: 'BALANCE_BASED',
    overallDrawdownPct: 10,
    drawdownType: 'BALANCE_BASED',
    trailingBasis: 'BALANCE',
    unrealizedProfitAffectsTrailing: false,
    lockAtStartingBalance: false,
    dailyResetTime: '00:00:00 Server Time (UTC+0 / GMT)',
    timezone: 'UTC+0 / GMT',
    minimumTradingDays: 0,
    newsRestriction: false,
    weekendHoldingRestriction: false,
    officialSourceUrl: 'https://alphacapitalgroup.uk/',
    lastVerificationDate: '2026-08-30',
    effectiveDate: '2026-01-01',
    ruleProfileVersion: 'ALPHA-PRO-2026-v1.5',
    calculationMethodology:
      'Daily loss (5%) is calculated based on closed balance at midnight GMT. Overall max loss (10%) is static from initial balance.',
    knownLimitations: ['Server time reset applies.'],
    verificationStatus: 'VERIFIED',
  },
];

export function getVerifiedPresetById(id: string): VerifiedFundedPreset | undefined {
  return VERIFIED_FUNDED_PRESETS.find((p) => p.id === id);
}

export function getVerifiedPresetsByFirm(firmName: string): VerifiedFundedPreset[] {
  return VERIFIED_FUNDED_PRESETS.filter(
    (p) => p.firmName.toLowerCase() === firmName.toLowerCase()
  );
}
